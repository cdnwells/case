package expo.modules.caseaudio

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioDeviceInfo
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class CaseRealtimeAudioSessionModule : Module() {
    private var previousMode: Int? = null
    private var previousSpeakerphoneOn: Boolean? = null
    private var previousCommunicationDevice: AudioDeviceInfo? = null
    private var audioFocusRequest: AudioFocusRequest? = null
    private val audioFocusChangeListener = AudioManager.OnAudioFocusChangeListener { }

    override fun definition() = ModuleDefinition {
        Name("CaseRealtimeAudioSession")

        Function("start") { speakerphone: Boolean ->
            startSession(speakerphone)
        }

        Function("stop") {
            stopSession()
        }

        OnDestroy {
            stopSession()
        }
    }

    private fun startSession(speakerphone: Boolean): Boolean {
        val audioManager = audioManager() ?: return false

        if (previousMode == null) {
            previousMode = audioManager.mode
        }
        if (previousSpeakerphoneOn == null) {
            previousSpeakerphoneOn = isSpeakerphoneOn(audioManager)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && previousCommunicationDevice == null) {
            previousCommunicationDevice = audioManager.communicationDevice
        }

        requestAudioFocus(audioManager)
        audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
        if (speakerphone) {
            routeToSpeakerphone(audioManager)
        }

        return true
    }

    private fun stopSession(): Boolean {
        val audioManager = audioManager() ?: return false

        restoreCommunicationDevice(audioManager)
        previousSpeakerphoneOn?.let { setSpeakerphoneOn(audioManager, it) }
        previousMode?.let { audioManager.mode = it }
        abandonAudioFocus(audioManager)

        previousCommunicationDevice = null
        previousSpeakerphoneOn = null
        previousMode = null

        return true
    }

    private fun audioManager(): AudioManager? {
        val context = appContext.reactContext ?: return null
        return context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    }

    private fun requestAudioFocus(audioManager: AudioManager) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val audioAttributes = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                .build()
            val request = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
                .setAudioAttributes(audioAttributes)
                .setOnAudioFocusChangeListener(audioFocusChangeListener)
                .build()
            audioManager.requestAudioFocus(request)
            audioFocusRequest = request
            return
        }

        @Suppress("DEPRECATION")
        audioManager.requestAudioFocus(
            audioFocusChangeListener,
            AudioManager.STREAM_VOICE_CALL,
            AudioManager.AUDIOFOCUS_GAIN_TRANSIENT,
        )
    }

    private fun abandonAudioFocus(audioManager: AudioManager) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            audioFocusRequest?.let { audioManager.abandonAudioFocusRequest(it) }
            audioFocusRequest = null
            return
        }

        @Suppress("DEPRECATION")
        audioManager.abandonAudioFocus(audioFocusChangeListener)
    }

    private fun routeToSpeakerphone(audioManager: AudioManager) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val speaker = audioManager.availableCommunicationDevices.firstOrNull {
                it.type == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER
            }
            if (speaker != null) {
                audioManager.setCommunicationDevice(speaker)
                return
            }
        }

        setSpeakerphoneOn(audioManager, true)
    }

    private fun restoreCommunicationDevice(audioManager: AudioManager) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            return
        }

        val previousDevice = previousCommunicationDevice
        if (previousDevice != null) {
            audioManager.setCommunicationDevice(previousDevice)
        } else {
            audioManager.clearCommunicationDevice()
        }
    }

    private fun isSpeakerphoneOn(audioManager: AudioManager): Boolean {
        @Suppress("DEPRECATION")
        return audioManager.isSpeakerphoneOn
    }

    private fun setSpeakerphoneOn(audioManager: AudioManager, enabled: Boolean) {
        @Suppress("DEPRECATION")
        audioManager.isSpeakerphoneOn = enabled
    }
}
