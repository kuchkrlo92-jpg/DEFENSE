package com.example.game.sound

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.util.Log
import com.example.game.model.TowerType
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlin.math.PI
import kotlin.math.sin

class SoundManager {
    private val scope = CoroutineScope(Dispatchers.Default + SupervisorJob())
    var isEnabled: Boolean = true

    private val sampleRate = 22050

    private fun playPcmAsync(durationSec: Float, generator: (Float) -> Short) {
        if (!isEnabled) return
        scope.launch {
            try {
                val numSamples = (durationSec * sampleRate).toInt()
                val buffer = ShortArray(numSamples)
                for (i in 0 until numSamples) {
                    val t = i.toFloat() / sampleRate
                    buffer[i] = generator(t)
                }

                val minBufSize = AudioTrack.getMinBufferSize(
                    sampleRate,
                    AudioFormat.CHANNEL_OUT_MONO,
                    AudioFormat.ENCODING_PCM_16BIT
                )
                val trackSize = maxOf(minBufSize, buffer.size * 2)

                val audioTrack = AudioTrack.Builder()
                    .setAudioAttributes(
                        AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_GAME)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build()
                    )
                    .setAudioFormat(
                        AudioFormat.Builder()
                            .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                            .setSampleRate(sampleRate)
                            .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                            .build()
                    )
                    .setBufferSizeInBytes(trackSize)
                    .setTransferMode(AudioTrack.MODE_STATIC)
                    .build()

                audioTrack.write(buffer, 0, buffer.size)
                audioTrack.play()
                // release track after playback completes
                kotlinx.coroutines.delay((durationSec * 1000).toLong() + 50)
                audioTrack.stop()
                audioTrack.release()
            } catch (e: Exception) {
                Log.d("SoundManager", "Audio playback skipped: ${e.message}")
            }
        }
    }

    fun playShoot(type: TowerType) {
        when (type) {
            TowerType.BASIC -> {
                // Laser chirp: 650Hz down to 250Hz in 0.08s
                playPcmAsync(0.08f) { t ->
                    val freq = 650f - (400f * (t / 0.08f))
                    val amp = 14000f * (1f - (t / 0.08f))
                    (amp * sin(2.0 * PI * freq * t)).toInt().toShort()
                }
            }
            TowerType.RAPID -> {
                // Quick blip: 880Hz down to 600Hz in 0.04s
                playPcmAsync(0.04f) { t ->
                    val freq = 880f - (280f * (t / 0.04f))
                    val amp = 10000f * (1f - (t / 0.04f))
                    (amp * sin(2.0 * PI * freq * t)).toInt().toShort()
                }
            }
            TowerType.CANNON -> {
                // Low punch boom: 180Hz down to 50Hz with noise in 0.16s
                playPcmAsync(0.16f) { t ->
                    val freq = 180f - (130f * (t / 0.16f))
                    val amp = 20000f * (1f - (t / 0.16f))
                    val wave = sin(2.0 * PI * freq * t)
                    val noise = (Math.random() * 2.0 - 1.0) * 0.3
                    (amp * (wave + noise).coerceIn(-1.0, 1.0)).toInt().toShort()
                }
            }
            TowerType.ICE -> {
                // Crystalline chime: 1200Hz to 1600Hz shimmer in 0.10s
                playPcmAsync(0.10f) { t ->
                    val freq = 1200f + (400f * (t / 0.10f))
                    val amp = 12000f * (1f - (t / 0.10f))
                    (amp * sin(2.0 * PI * freq * t)).toInt().toShort()
                }
            }
        }
    }

    fun playHit() {
        // Crisp pop/tap sound
        playPcmAsync(0.05f) { t ->
            val freq = 400f - (250f * (t / 0.05f))
            val amp = 12000f * (1f - (t / 0.05f))
            (amp * sin(2.0 * PI * freq * t)).toInt().toShort()
        }
    }

    fun playCoin() {
        // Two-tone coin sound: 987Hz (B5) for 0.05s then 1318Hz (E6) for 0.12s
        playPcmAsync(0.18f) { t ->
            val freq = if (t < 0.06f) 987f else 1318f
            val progressInTone = if (t < 0.06f) t / 0.06f else (t - 0.06f) / 0.12f
            val amp = 15000f * (1f - progressInTone * 0.7f)
            (amp * sin(2.0 * PI * freq * t)).toInt().toShort()
        }
    }

    fun playUpgrade() {
        // Power-up rising arpeggio: 440 -> 554 -> 659 -> 880Hz
        playPcmAsync(0.24f) { t ->
            val step = (t / 0.06f).toInt().coerceIn(0, 3)
            val freq = when (step) {
                0 -> 440f
                1 -> 554f
                2 -> 659f
                else -> 880f
            }
            val amp = 14000f
            (amp * sin(2.0 * PI * freq * t)).toInt().toShort()
        }
    }

    fun playWaveStart() {
        // Horn battle call: 330Hz then 440Hz
        playPcmAsync(0.28f) { t ->
            val freq = if (t < 0.14f) 330f else 440f
            val amp = 16000f * (1f - (t / 0.28f) * 0.5f)
            (amp * sin(2.0 * PI * freq * t)).toInt().toShort()
        }
    }

    fun playVictory() {
        // Grand victory chord arpeggio: C5 (523), E5 (659), G5 (784), C6 (1046)
        playPcmAsync(0.6f) { t ->
            val step = (t / 0.12f).toInt().coerceIn(0, 4)
            val freq = when (step) {
                0 -> 523f
                1 -> 659f
                2 -> 784f
                3 -> 1046f
                else -> 1046f
            }
            val amp = 16000f * (1f - (t / 0.6f) * 0.4f)
            (amp * sin(2.0 * PI * freq * t)).toInt().toShort()
        }
    }

    fun playGameOver() {
        // Defeat descending tones: 392 -> 349 -> 311 -> 261Hz
        playPcmAsync(0.5f) { t ->
            val step = (t / 0.12f).toInt().coerceIn(0, 3)
            val freq = when (step) {
                0 -> 392f
                1 -> 349f
                2 -> 311f
                else -> 261f
            }
            val amp = 16000f * (1f - (t / 0.5f) * 0.6f)
            (amp * sin(2.0 * PI * freq * t)).toInt().toShort()
        }
    }
}
