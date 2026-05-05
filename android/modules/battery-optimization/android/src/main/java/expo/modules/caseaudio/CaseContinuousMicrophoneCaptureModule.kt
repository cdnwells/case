package expo.modules.caseaudio

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import java.util.UUID
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.concurrent.thread
import kotlin.math.max

private const val DEFAULT_SAMPLE_RATE_HZ = 16000
private const val DEFAULT_CHANNEL_COUNT = 1
private const val DEFAULT_BYTES_PER_SAMPLE = 2
private const val DEFAULT_PROCESSING_WINDOW_DURATION_SECONDS = 0.1
private const val DEFAULT_PROCESSING_WINDOW_DURATION_MS = 100
private const val ROLLING_BUFFER_DEFAULT_DURATION_SECONDS = 15
private const val DEFAULT_ROLLING_BUFFER_WINDOW_DURATION_SECONDS =
    ROLLING_BUFFER_DEFAULT_DURATION_SECONDS
private const val DEFAULT_FRAME_DURATION_MS = DEFAULT_PROCESSING_WINDOW_DURATION_MS
private const val DEFAULT_SAVE_INTENT_PRESENT = false
private const val DEFAULT_RAW_AUDIO_PERSISTENCE_ENABLED = false
private const val DEFAULT_CAPTURE_BUFFER_STORAGE_KIND = "ephemeral-in-memory"

class ContinuousMicrophoneCaptureOptions : Record {
    @Field
    val sampleRateHz: Int? = DEFAULT_SAMPLE_RATE_HZ

    @Field
    val channelCount: Int? = DEFAULT_CHANNEL_COUNT

    @Field
    val bytesPerSample: Int? = DEFAULT_BYTES_PER_SAMPLE

    @Field
    val frameDurationMs: Int? = DEFAULT_FRAME_DURATION_MS

    @Field
    val saveIntentPresent: Boolean? = DEFAULT_SAVE_INTENT_PRESENT

    @Field
    val processingWindowDurationSeconds: Double? = DEFAULT_PROCESSING_WINDOW_DURATION_SECONDS

    @Field
    val rollingBufferWindowDurationSeconds: Double? = DEFAULT_ROLLING_BUFFER_WINDOW_DURATION_SECONDS.toDouble()

    @Field
    val rawAudioPersistenceEnabled: Boolean? = DEFAULT_RAW_AUDIO_PERSISTENCE_ENABLED
}

class CaseContinuousMicrophoneCaptureModule : Module() {
    private val running = AtomicBoolean(false)
    private var audioRecord: AudioRecord? = null
    private var captureThread: Thread? = null

    override fun definition() = ModuleDefinition {
        Name("CaseContinuousMicrophoneCapture")

        Events("audioFrame", "error")

        Function("start") { options: ContinuousMicrophoneCaptureOptions ->
            startCapture(options)
        }

        Function("stop") {
            stopCapture()
        }

        OnDestroy {
            stopCapture()
        }
    }

    @SuppressLint("MissingPermission")
    private fun startCapture(options: ContinuousMicrophoneCaptureOptions) {
        if (running.get()) return

        val context = appContext.reactContext
        if (context == null) {
            emitError("missing_react_context", "React context is not available")
            return
        }

        if (!hasRecordAudioPermission(context)) {
            emitError("missing_record_audio_permission", "RECORD_AUDIO permission is required")
            return
        }

        val sampleRateHz = options.sampleRateHz ?: DEFAULT_SAMPLE_RATE_HZ
        val channelCount = options.channelCount ?: DEFAULT_CHANNEL_COUNT
        val bytesPerSample = options.bytesPerSample ?: DEFAULT_BYTES_PER_SAMPLE
        val frameDurationMs = options.frameDurationMs ?: DEFAULT_FRAME_DURATION_MS
        val saveIntentPresent = options.saveIntentPresent ?: DEFAULT_SAVE_INTENT_PRESENT
        val rollingBufferWindowDurationSeconds =
            options.rollingBufferWindowDurationSeconds ?: DEFAULT_ROLLING_BUFFER_WINDOW_DURATION_SECONDS.toDouble()
        val rawAudioPersistenceEnabled =
            options.rawAudioPersistenceEnabled ?: DEFAULT_RAW_AUDIO_PERSISTENCE_ENABLED

        if (saveIntentPresent || rawAudioPersistenceEnabled) {
            emitError(
                "unsupported_save_intent",
                "Continuous microphone capture only emits transient in-memory audio with raw audio persistence disabled; explicit saves happen after approved voice recognition",
            )
            return
        }

        if (
            rollingBufferWindowDurationSeconds.isNaN() ||
            rollingBufferWindowDurationSeconds.isInfinite() ||
            rollingBufferWindowDurationSeconds <= 0.0
        ) {
            emitError(
                "invalid_rolling_buffer_window_duration",
                "Rolling buffer window duration must be a positive finite number of seconds",
            )
            return
        }

        if (channelCount != DEFAULT_CHANNEL_COUNT || bytesPerSample != DEFAULT_BYTES_PER_SAMPLE) {
            emitError("unsupported_audio_format", "Only mono PCM16 microphone capture is supported")
            return
        }

        val channelConfig = AudioFormat.CHANNEL_IN_MONO
        val audioEncoding = AudioFormat.ENCODING_PCM_16BIT
        val minBufferSize = AudioRecord.getMinBufferSize(
            sampleRateHz,
            channelConfig,
            audioEncoding,
        )

        if (minBufferSize <= 0) {
            emitError("invalid_buffer_size", "Unable to create a microphone capture buffer")
            return
        }

        val frameSizeBytes = max(
            bytesPerSample,
            sampleRateHz * channelCount * bytesPerSample * frameDurationMs / 1000,
        )
        val recordBufferSize = max(minBufferSize, frameSizeBytes * 2)
        val recorder = AudioRecord.Builder()
            .setAudioSource(MediaRecorder.AudioSource.VOICE_RECOGNITION)
            .setAudioFormat(
                AudioFormat.Builder()
                    .setEncoding(audioEncoding)
                    .setSampleRate(sampleRateHz)
                    .setChannelMask(channelConfig)
                    .build(),
            )
            .setBufferSizeInBytes(recordBufferSize)
            .build()

        if (recorder.state != AudioRecord.STATE_INITIALIZED) {
            recorder.release()
            emitError("audio_record_not_initialized", "Microphone capture could not be initialized")
            return
        }

        audioRecord = recorder
        running.set(true)

        try {
            recorder.startRecording()
        } catch (error: IllegalStateException) {
            running.set(false)
            audioRecord = null
            recorder.release()
            emitError("audio_record_start_failed", error.message ?: "Microphone capture could not start")
            return
        }

        val utteranceId = UUID.randomUUID().toString()
        captureThread = thread(
            name = "CaseContinuousMicrophoneCapture",
            isDaemon = true,
        ) {
            readAudioFrames(
                recorder,
                ByteArray(frameSizeBytes),
                utteranceId,
                sampleRateHz,
                channelCount,
                bytesPerSample,
                rollingBufferWindowDurationSeconds,
            )
        }
    }

    private fun readAudioFrames(
        recorder: AudioRecord,
        buffer: ByteArray,
        utteranceId: String,
        sampleRateHz: Int,
        channelCount: Int,
        bytesPerSample: Int,
        rollingBufferWindowDurationSeconds: Double,
    ) {
        var sequence = 0

        while (running.get()) {
            val bytesRead = recorder.read(buffer, 0, buffer.size)

            if (bytesRead > 0) {
                emitAudioFrame(
                    buffer,
                    bytesRead,
                    utteranceId,
                    sequence,
                    sampleRateHz,
                    channelCount,
                    bytesPerSample,
                    rollingBufferWindowDurationSeconds,
                )
                sequence += 1
                buffer.fill(0.toByte(), 0, bytesRead)
            } else if (bytesRead < 0 && running.get()) {
                emitError("audio_read_failed", "Microphone capture returned read error $bytesRead")
                stopCapture()
                return
            }
        }
    }

    private fun stopCapture() {
        running.set(false)

        val recorder = audioRecord
        audioRecord = null

        try {
            recorder?.stop()
        } catch (_: IllegalStateException) {
            // Capture may already be stopped by the platform.
        }

        recorder?.release()
        captureThread = null
    }

    private fun emitAudioFrame(
        buffer: ByteArray,
        bytesRead: Int,
        utteranceId: String,
        sequence: Int,
        sampleRateHz: Int,
        channelCount: Int,
        bytesPerSample: Int,
        rollingBufferWindowDurationSeconds: Double,
    ) {
        val audioBytes = ArrayList<Int>(bytesRead)
        for (index in 0 until bytesRead) {
            audioBytes.add(buffer[index].toInt() and 0xff)
        }

        sendEvent(
            "audioFrame",
            mapOf(
                "audioBytes" to audioBytes,
                "timestampMs" to System.currentTimeMillis().toDouble(),
                "utteranceId" to utteranceId,
                "sequence" to sequence,
                "sampleRateHz" to sampleRateHz,
                "channelCount" to channelCount,
                "bytesPerSample" to bytesPerSample,
                "saveIntentPresent" to DEFAULT_SAVE_INTENT_PRESENT,
                "processingWindowDurationSeconds" to DEFAULT_PROCESSING_WINDOW_DURATION_SECONDS,
                "rollingBufferWindowDurationSeconds" to rollingBufferWindowDurationSeconds,
                "rawAudioPersistenceEnabled" to DEFAULT_RAW_AUDIO_PERSISTENCE_ENABLED,
                "bufferStorageKind" to DEFAULT_CAPTURE_BUFFER_STORAGE_KIND,
            ),
        )
    }

    private fun emitError(code: String, message: String) {
        sendEvent(
            "error",
            mapOf(
                "code" to code,
                "message" to message,
            ),
        )
    }

    private fun hasRecordAudioPermission(context: Context): Boolean =
        context.checkSelfPermission(Manifest.permission.RECORD_AUDIO) ==
            PackageManager.PERMISSION_GRANTED
}
