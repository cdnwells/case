import type { CreateLiveSessionRequest, CreateLiveSessionResponse, LiveHistoryMessage } from '../api/types';

export function assertLiveNotAborted(signal?: AbortSignal) {
  // React Native's AbortSignal does not provide throwIfAborted on every build.
  if (signal?.aborted) throw Object.assign(new Error('Voice start was cancelled.'), { name: 'AbortError', retryable: false });
}

export type LiveState = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'error';
export type LiveCaption = LiveHistoryMessage & { id: string; startMs: number; endMs: number };
export interface LiveTransport {
  pc: {
    iceGatheringState?: string;
    connectionState?: string;
    iceConnectionState?: string;
    localDescription?: { sdp?: string } | null;
    createOffer(): Promise<{ type: 'offer'; sdp?: string }>;
    setLocalDescription(description: unknown): Promise<void>;
    setRemoteDescription(description: { type: 'answer'; sdp: string }): Promise<void>;
    getStats?(): Promise<{ forEach(callback: (report: Record<string, unknown>) => void): void }>;
    onicegatheringstatechange: (() => void) | null;
    onconnectionstatechange: (() => void) | null;
    oniceconnectionstatechange: (() => void) | null;
    ontrack: ((event: { track?: { enabled: boolean; stop(): void; _setVolume?(volume: number): void } }) => void) | null;
  };
  channel: {
    readyState: string;
    send(data: string): void;
    onmessage: ((event: { data: unknown }) => void) | null;
    onerror: (() => void) | null;
    onclose: (() => void) | null;
  };
  muteOutput(muted: boolean): void;
  silenceInput(): void;
  dispose(): void;
  onAudioError?: (message: string) => void;
}
interface Dependencies {
  createTransport(signal?: AbortSignal): Promise<LiveTransport>;
  createSession(request: CreateLiveSessionRequest): Promise<CreateLiveSessionResponse>;
  closeSession(session: CreateLiveSessionResponse, finalized?: boolean): Promise<void>;
  delegate?(session: CreateLiveSessionResponse, id: string, history: LiveHistoryMessage[], signal: AbortSignal): Promise<{ content: string }>;
  onState(state: LiveState, error: string | null): void;
  onCaption(caption: LiveCaption): void;
  log?(code: string): void;
  startupTimeoutMs?: number;
  closeTimeoutMs?: number;
  retryDelayMs?: number;
}
const byteLength = (text: string) => {
  let bytes = 0;
  for (const character of text) {
    const point = character.codePointAt(0)!;
    bytes += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
  }
  return bytes;
};
export function boundedLiveHistory(history: readonly LiveHistoryMessage[]): LiveHistoryMessage[] {
  const result: LiveHistoryMessage[] = [];
  for (const item of [...history].reverse()) {
    if (!['user', 'assistant'].includes(item.role) || !item.content.trim()) continue;
    let content = item.content;
    if (byteLength(content) > 5200) {
      const characters = [...content];
      let bytes = 0, index = characters.length;
      while (index > 0 && bytes + byteLength(characters[index - 1]) <= 5200) bytes += byteLength(characters[--index]);
      content = characters.slice(index).join('');
    }
    const candidate = { role: item.role, content };
    if (result.length >= 128 || byteLength(JSON.stringify([candidate, ...result])) > 5800) break;
    result.unshift(candidate);
  }
  return result;
}
export function liveError(error: unknown): { message: string; retryable: boolean } {
  const e = error as { name?: string; message?: string; retryable?: boolean };
  if (['NotAllowedError', 'PermissionDeniedError', 'SecurityError'].includes(e?.name || '') || /permission|denied/i.test(e?.message || '')) {
    return { message: 'Microphone permission was denied. Allow microphone access in settings and try again.', retryable: false };
  }
  if (['NotFoundError', 'NotReadableError'].includes(e?.name || '')) return { message: 'The microphone is unavailable or in use by another app.', retryable: false };
  return { message: e?.retryable === false && e.message ? e.message : 'Voice connection was interrupted. Please try again.', retryable: e?.retryable !== false };
}

// Owns one conversation across replacement transports. No audio is retained here.
export class LiveConversation {
  private transport?: LiveTransport;
  private session?: CreateLiveSessionResponse;
  private controller?: AbortController;
  private epoch = 0;
  private startRevision = 0;
  private stopPromise?: Promise<void>;
  private finalized = false;
  private stopped = true;
  private closing = false;
  private ready = false;
  private retries = 0;
  private state: LiveState = 'idle';
  private options: Omit<CreateLiveSessionRequest, 'sdp' | 'signal'> = {};
  private history: LiveHistoryMessage[] = [];
  private captions: LiveCaption[] = [];
  private seen = new Set<string>();
  private delegated = new Set<string>();
  private pendingDelegations = 0;
  private userRevision = 0;
  private inputWasActive = false;
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private startupResolve?: (started: boolean) => void;
  private closeResolve?: () => void;
  private startupTimer?: ReturnType<typeof setTimeout>;
  private disconnectTimer?: ReturnType<typeof setTimeout>;
  private lastInputAt = 0;
  private lastOutputAt = 0;
  private previousEnergy = new Map<string, { energy: number; duration: number }>();
  private deps: Dependencies;
  constructor(deps: Dependencies) { this.deps = deps; }
  private publish(state: LiveState, error: string | null = null) {
    this.state = state;
    this.deps.onState(state, error);
  }
  private later(fn: () => void, ms: number) {
    const timer = setTimeout(() => { this.timers.delete(timer); fn(); }, ms);
    this.timers.add(timer);
    return timer;
  }
  private cancelTimer(timer?: ReturnType<typeof setTimeout>) {
    if (timer) { clearTimeout(timer); this.timers.delete(timer); }
  }
  private log(code: string) { this.deps.log?.(code); }
  private send(event: Record<string, unknown>) {
    if (this.transport?.channel.readyState === 'open') this.transport.channel.send(JSON.stringify(event));
  }
  getHistory() { return boundedLiveHistory([...this.history, ...this.captions]); }
  async start(options: Omit<CreateLiveSessionRequest, 'sdp' | 'signal'> = {}) {
    const revision = ++this.startRevision;
    await this.closeConnection();
    if (revision !== this.startRevision) return false;
    this.stopped = false;
    this.closing = false;
    this.retries = 0;
    this.options = options;
    this.history = boundedLiveHistory(options.history || []);
    this.captions = [];
    return this.connect();
  }
  private async release(finalized = false) {
    this.epoch++;
    this.controller?.abort();
    this.controller = undefined;
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
    this.disconnectTimer = undefined;
    this.startupResolve?.(false); this.startupResolve = undefined;
    this.closeResolve?.(); this.closeResolve = undefined;
    this.ready = false;
    const transport = this.transport;
    this.transport = undefined;
    if (transport) {
      transport.channel.onmessage = null;
      transport.channel.onclose = null;
      transport.channel.onerror = null;
      transport.pc.onconnectionstatechange = null;
      transport.pc.oniceconnectionstatechange = null;
      transport.pc.onicegatheringstatechange = null;
      transport.pc.ontrack = null;
      transport.onAudioError = undefined;
      try { transport.dispose(); } catch { this.log('audio_cleanup_failed'); }
    }
    const session = this.session;
    this.session = undefined;
    if (session) {
      try { await this.deps.closeSession(session, finalized); }
      catch { this.log('session_finalization_unconfirmed'); }
    }
  }
  async stop() {
    this.startRevision++;
    return this.closeConnection();
  }
  private closeConnection(): Promise<void> {
    this.stopped = true;
    if (this.stopPromise) return this.stopPromise;
    this.closing = true;
    this.controller?.abort();
    this.stopPromise = (async () => {
      if (this.ready && this.transport?.channel.readyState === 'open') {
        this.transport.silenceInput();
        this.transport.muteOutput(true);
        await new Promise<void>(resolve => {
          this.closeResolve = resolve;
          this.later(() => { this.log('close_timeout'); resolve(); }, this.deps.closeTimeoutMs ?? 3000);
          try { this.send({ type: 'session.close' }); } catch { resolve(); }
        });
      }
      await this.release(this.finalized);
      this.closing = false;
      this.publish('idle');
    })().finally(() => { this.stopPromise = undefined; });
    return this.stopPromise;
  }
  private async fail(error: unknown, epoch: number) {
    if (epoch !== this.epoch || this.stopped || this.closing) return;
    const failure = liveError(error);
    this.log(failure.retryable ? 'connection_failure' : 'voice_unavailable');
    this.publish('connecting');
    const cleanup = this.release();
    const cleanupEpoch = this.epoch;
    await cleanup;
    if (this.stopped || cleanupEpoch !== this.epoch) return;
    if (failure.retryable && this.retries < 3) {
      const delay = (this.deps.retryDelayMs ?? 1000) * 2 ** this.retries++;
      this.later(() => { void this.connect(); }, delay);
    } else {
      this.stopped = true;
      this.publish('error', failure.message);
    }
  }
  private async connect(): Promise<boolean> {
    if (this.stopped) return false;
    const epoch = ++this.epoch;
    this.ready = false;
    this.finalized = false;
    this.publish('connecting');
    this.controller = new AbortController();
    this.seen.clear(); this.delegated.clear(); this.pendingDelegations = 0;
    this.previousEnergy.clear(); this.lastInputAt = 0; this.lastOutputAt = 0;
    const started = new Promise<boolean>(resolve => { this.startupResolve = resolve; });
    this.startupTimer = this.later(() => { void this.fail(new Error('startup_timeout'), epoch); }, this.deps.startupTimeoutMs ?? 30000);
    void (async () => { try {
      const transport = await this.deps.createTransport(this.controller!.signal);
      if (epoch !== this.epoch || this.stopped) { transport.dispose(); return false; }
      this.transport = transport;
      transport.onAudioError = message => { void this.fail(Object.assign(new Error(message), { retryable: false }), epoch); };
      transport.channel.onmessage = event => { this.handleEvent(event.data, epoch); };
      transport.channel.onerror = () => { void this.fail(new Error('channel_error'), epoch); };
      transport.channel.onclose = () => { void this.fail(new Error('channel_closed'), epoch); };
      const connectionChanged = () => {
        const states = [transport.pc.connectionState, transport.pc.iceConnectionState];
        if (states.includes('failed') || states.includes('closed')) void this.fail(new Error('transport_failed'), epoch);
        else if (states.includes('disconnected') && !this.disconnectTimer) {
          this.disconnectTimer = this.later(() => { void this.fail(new Error('disconnected'), epoch); }, 4000);
        } else if (states.includes('connected') || states.includes('completed')) {
          this.cancelTimer(this.disconnectTimer); this.disconnectTimer = undefined;
        }
      };
      transport.pc.onconnectionstatechange = connectionChanged;
      transport.pc.oniceconnectionstatechange = connectionChanged;
      const offer = await transport.pc.createOffer();
      if (epoch !== this.epoch) return false;
      await transport.pc.setLocalDescription(offer);
      if (epoch !== this.epoch) return false;
      if (transport.pc.iceGatheringState !== 'complete') {
        await new Promise<void>((resolve, reject) => {
          const timer = this.later(() => reject(new Error('ice_timeout')), 10000);
          const finish = () => { this.cancelTimer(timer); transport.pc.onicegatheringstatechange = null; resolve(); };
          transport.pc.onicegatheringstatechange = () => { if (transport.pc.iceGatheringState === 'complete') finish(); };
          this.controller!.signal.addEventListener('abort', finish, { once: true });
          if (transport.pc.iceGatheringState === 'complete') finish();
        });
      }
      if (epoch !== this.epoch || this.stopped) return false;
      const session = await this.deps.createSession({ ...this.options,
        history: this.getHistory(), sdp: transport.pc.localDescription?.sdp || offer.sdp || '', signal: this.controller!.signal });
      if (epoch !== this.epoch || this.stopped) {
        await this.deps.closeSession(session).catch(() => this.log('orphan_cleanup_failed')); return false;
      }
      this.session = session;
      await transport.pc.setRemoteDescription({ type: 'answer', sdp: session.sdp });
      if (epoch === this.epoch) this.monitorAudio(epoch);
    } catch (error) { await this.fail(error, epoch); } })();
    return started;
  }
  private handleEvent(raw: unknown, epoch: number) {
    if (epoch !== this.epoch || typeof raw !== 'string') return;
    let event: Record<string, any>;
    try { event = JSON.parse(raw); } catch { this.log('invalid_event_json'); return; }
    if (!event || typeof event.type !== 'string') { this.log('invalid_event'); return; }
    if (typeof event.event_id === 'string') {
      if (this.seen.has(event.event_id)) return;
      if (this.seen.size >= 2048) this.seen.delete(this.seen.values().next().value!);
      this.seen.add(event.event_id);
    }
    switch (event.type) {
      case 'session.started':
        this.ready = true;
        this.cancelTimer(this.startupTimer);
        this.startupResolve?.(true); this.startupResolve = undefined;
        this.publish('listening');
        return;
      case 'session.closed': {
        const closing = this.closing;
        this.log('session_finalized');
        if (closing) { this.finalized = true; this.closeResolve?.(); return; }
        const retryable = ['expired', 'connection_lost'].includes(event.reason);
        if (retryable) {
          const session = this.session; this.session = undefined;
          if (session) void this.deps.closeSession(session, true).catch(() => this.log('session_release_failed'));
          void this.fail(new Error('session_ended'), epoch);
        } else {
          this.stopped = true;
          void this.release(true).then(() => this.publish(event.reason === 'content' ? 'error' : 'idle',
            event.reason === 'content' ? 'This voice session ended. Please start a new conversation.' : null));
        }
        return;
      }
      case 'session.input_transcript.delta':
      case 'session.output_transcript.delta':
        this.caption(event); return;
      case 'session.delegation.created':
        if (!this.closing) void this.handleDelegation(event, epoch); return;
      case 'error':
        this.log('live_server_error');
        if (event.error?.client_event_id) {
          // A rejected append is not a transport failure; do not restart the session.
          this.pendingDelegations = 0;
          this.publish('listening');
        } else void this.fail(Object.assign(new Error('Voice service reported an error. Please start again.'), { retryable: false }), epoch);
        return;
      case 'session.usage.updated':
      case 'session.commentary.appended': return;
      default: this.log('unknown_live_event');
    }
  }
  private caption(event: Record<string, any>) {
    if (typeof event.delta !== 'string' || !Number.isFinite(event.start_ms) || !Number.isFinite(event.end_ms)) {
      this.log('invalid_transcript'); return;
    }
    const role = event.type === 'session.input_transcript.delta' ? 'user' : 'assistant';
    if (role === 'user') this.userRevision++;
    // Display grouping only: overlapping speakers remain independent. Not a turn boundary.
    let row = [...this.captions].reverse().find(row => row.role === role && row.id.startsWith(`live_${this.epoch}_`)
      && event.start_ms <= row.endMs + 1500 && event.end_ms >= row.startMs - 1500);
    if (!row) {
      row = { id: `live_${this.epoch}_${Date.now()}_${this.captions.length}`, role, content: '', startMs: event.start_ms, endMs: event.end_ms };
      this.captions.push(row);
    }
    row.content += event.delta;
    row.startMs = Math.min(row.startMs, event.start_ms); row.endMs = Math.max(row.endMs, event.end_ms);
    this.deps.onCaption({ ...row });
    if (this.captions.length > 128) this.captions.shift();
  }
  private async handleDelegation(event: Record<string, any>, epoch: number) {
    const id = event.delegation?.id;
    if (typeof id !== 'string' || event.delegation?.target !== 'client' || this.delegated.has(id) || !this.session) return;
    this.delegated.add(id);
    const revision = this.userRevision;
    this.pendingDelegations++;
    if (this.state !== 'speaking') this.publish('thinking');
    try {
      const result = await this.deps.delegate?.(this.session, id, this.getHistory(), this.controller!.signal);
      if (epoch !== this.epoch || this.stopped) return;
      // Do not report an old result after a correction or new user speech.
      const content = revision !== this.userRevision
        ? 'The user added more information while the lookup ran. Clarify the latest request before proceeding.'
        : result?.content || 'This task needs text chat. Please continue there.';
      this.send({ type: 'session.commentary.append', event_id: `delegation_${this.delegated.size}`, delegation_id: id, content });
    } catch {
      if (epoch === this.epoch && !this.stopped) {
        this.log('delegation_failed');
        this.send({ type: 'session.commentary.append', event_id: `delegation_error_${this.delegated.size}`, delegation_id: id,
          content: 'The backend could not complete this request. Please retry in text chat.' });
      }
    } finally { if (epoch === this.epoch) this.pendingDelegations = Math.max(0, this.pendingDelegations - 1); }
  }
  private monitorAudio(epoch: number) {
    const tick = async () => {
      if (epoch !== this.epoch || this.stopped) return;
      try {
        const stats = await this.transport?.pc.getStats?.();
        if (epoch !== this.epoch || this.stopped) return;
        let input = 0, output = 0;
        stats?.forEach(report => {
          if (report.kind !== 'audio' && report.mediaType !== 'audio' && report.audioLevel === undefined) return;
          let level = Number(report.audioLevel) || 0;
          if (typeof report.totalAudioEnergy === 'number' && typeof report.totalSamplesDuration === 'number') {
            const key = String(report.id);
            const previous = this.previousEnergy.get(key);
            if (previous && report.totalSamplesDuration > previous.duration) level = Math.max(level,
              Math.sqrt(Math.max(0, report.totalAudioEnergy - previous.energy) / (report.totalSamplesDuration - previous.duration)));
            this.previousEnergy.set(key, { energy: report.totalAudioEnergy, duration: report.totalSamplesDuration });
          }
          if (report.type === 'media-source' || report.type === 'outbound-rtp') input = Math.max(input, level);
          if (report.type === 'inbound-rtp') output = Math.max(output, level);
        });
        const now = Date.now();
        if (input > 0.035) this.lastInputAt = now;
        if (output > 0.01) this.lastOutputAt = now;
        const userSpeaking = now - this.lastInputAt < 350;
        if (userSpeaking && !this.inputWasActive) this.userRevision++;
        this.inputWasActive = userSpeaking;
        // Disabling output consumes live media silently, avoiding a file playback queue.
        this.transport?.muteOutput(userSpeaking);
        if (this.ready) this.publish(userSpeaking ? 'listening' : now - this.lastOutputAt < 350 ? 'speaking' : this.pendingDelegations ? 'thinking' : 'listening');
      } catch { this.log('audio_stats_unavailable'); }
      if (epoch === this.epoch && !this.stopped) this.later(() => { void tick(); }, 100);
    };
    void tick();
  }
}
