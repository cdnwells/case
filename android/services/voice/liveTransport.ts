import { Platform } from 'react-native';
import { startRealtimeAudioSession, stopRealtimeAudioSession, subscribeRealtimeAudioErrors } from './realtimeAudioSession';
import { assertLiveNotAborted, type LiveTransport } from './liveConversation';

export async function createLiveTransport(signal?: AbortSignal): Promise<LiveTransport> {
  assertLiveNotAborted(signal);
  const rtc = await import('react-native-webrtc');
  let stream: Awaited<ReturnType<typeof rtc.mediaDevices.getUserMedia>> | undefined;
  let audioStarted = false;
  let pc: InstanceType<typeof rtc.RTCPeerConnection> | undefined;
  try {
    stream = await rtc.mediaDevices.getUserMedia({ audio: true, video: false });
    assertLiveNotAborted(signal);
    audioStarted = Platform.OS === 'android' && startRealtimeAudioSession({ speakerphone: true });
    if (Platform.OS === 'android' && !audioStarted) {
      throw Object.assign(new Error('Unable to start speaker audio. Rebuild the native app and retry.'), { retryable: false });
    }
    pc = new rtc.RTCPeerConnection();
    const channel = pc.createDataChannel('oai-events');
    for (const track of stream.getTracks()) pc.addTrack(track, stream);
    const remoteTracks = new Set<{ enabled: boolean; stop(): void; _setVolume?(volume: number): void }>();
    let outputMuted = false;
    // react-native-webrtc's event properties are supplied by its EventTarget shim.
    const connection = pc as unknown as LiveTransport['pc'];
    connection.ontrack = event => {
      if (event.track) {
        remoteTracks.add(event.track);
        event.track.enabled = !outputMuted;
        event.track._setVolume?.(1);
      }
    };
    const audioErrors = subscribeRealtimeAudioErrors(message => transport.onAudioError?.(message));
    const transport: LiveTransport = {
      pc: connection, channel: channel as unknown as LiveTransport['channel'],
      muteOutput(muted) { outputMuted = muted; for (const track of remoteTracks) track.enabled = !muted; },
      silenceInput() { for (const track of stream!.getTracks()) track.enabled = false; },
      dispose() {
        audioErrors?.remove();
        channel.close(); pc!.close();
        for (const track of stream!.getTracks()) track.stop();
        for (const track of remoteTracks) track.stop();
        stream!.release();
        if (audioStarted) stopRealtimeAudioSession();
      },
    };
    for (const track of stream.getTracks()) {
      (track as unknown as { addEventListener(type: string, listener: () => void): void }).addEventListener("ended", () => transport.onAudioError?.("Microphone input ended. Check microphone access and retry."));
    }
    return transport;
  } catch (error) {
    pc?.close();
    for (const track of stream?.getTracks() || []) track.stop();
    stream?.release();
    if (audioStarted) stopRealtimeAudioSession();
    throw error;
  }
}
