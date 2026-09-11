import { assertLiveNotAborted, type LiveTransport } from './liveConversation';

export async function createLiveTransport(signal?: AbortSignal): Promise<LiveTransport> {
  assertLiveNotAborted(signal);
  if (!navigator.mediaDevices?.getUserMedia) {
    throw Object.assign(new Error('Microphone access requires HTTPS or localhost and a supported browser.'), { retryable: false });
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
  let pc: RTCPeerConnection | undefined;
  let audio: HTMLAudioElement | undefined;
  try {
    assertLiveNotAborted(signal);
    pc = new RTCPeerConnection();
    const channel = pc.createDataChannel('oai-events');
    audio = new Audio();
    audio.autoplay = true;
    for (const track of stream.getTracks()) pc.addTrack(track, stream);
    const transport: LiveTransport = {
      pc: pc as unknown as LiveTransport['pc'],
      channel: channel as unknown as LiveTransport['channel'],
      muteOutput(muted) { audio!.muted = muted; },
      silenceInput() { for (const track of stream.getTracks()) track.enabled = false; },
      dispose() {
        audio!.pause(); audio!.srcObject = null; channel.close(); pc!.close();
        for (const track of stream.getTracks()) track.stop();
      },
    };
    pc.ontrack = event => {
      audio!.srcObject = event.streams[0] || new MediaStream([event.track]);
      event.track.onended = () => transport.onAudioError?.('Speaker audio ended. Please start voice again.');
      void audio!.play().catch(() => transport.onAudioError?.('Audio playback was blocked. Tap Start Voice to try again.'));
    };
    for (const track of stream.getTracks()) {
      track.onended = () => transport.onAudioError?.('Microphone input ended. Please check microphone access and retry.');
    }
    return transport;
  } catch (error) {
    pc?.close();
    if (audio) { audio.pause(); audio.srcObject = null; }
    for (const track of stream.getTracks()) track.stop();
    throw error;
  }
}
