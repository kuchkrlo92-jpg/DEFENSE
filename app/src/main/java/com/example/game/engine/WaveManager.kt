package com.example.game.engine

import com.example.game.model.EnemyType

data class EnemySpawnConfig(
    val type: EnemyType,
    val spawnDelaySec: Float,
    val hpMultiplier: Float = 1.0f
)

data class WaveData(
    val waveNumber: Int,
    val title: String,
    val description: String,
    val spawns: List<EnemySpawnConfig>,
    val completionBonusCoins: Int
)

object WaveManager {
    const val MAX_CAMPAIGN_WAVES = 10

    fun getWave(waveNumber: Int): WaveData {
        return when (waveNumber) {
            1 -> WaveData(
                waveNumber = 1,
                title = "Scout Incursion",
                description = "Defeat the goblin scouts entering through the portal.",
                spawns = List(7) { EnemySpawnConfig(EnemyType.NORMAL, 1.2f) },
                completionBonusCoins = 60
            )
            2 -> WaveData(
                waveNumber = 2,
                title = "Speed Trial",
                description = "Fast runners accompany the goblin vanguard.",
                spawns = buildList {
                    repeat(5) { add(EnemySpawnConfig(EnemyType.NORMAL, 1.0f)) }
                    repeat(4) { add(EnemySpawnConfig(EnemyType.FAST, 0.8f)) }
                    repeat(4) { add(EnemySpawnConfig(EnemyType.NORMAL, 0.9f)) }
                },
                completionBonusCoins = 80
            )
            3 -> WaveData(
                waveNumber = 3,
                title = "Swift Swarm",
                description = "High-speed runners! Rapid and Ice towers are recommended.",
                spawns = buildList {
                    repeat(12) { add(EnemySpawnConfig(EnemyType.FAST, 0.65f)) }
                    repeat(4) { add(EnemySpawnConfig(EnemyType.NORMAL, 0.8f)) }
                },
                completionBonusCoins = 100
            )
            4 -> WaveData(
                waveNumber = 4,
                title = "Armored Vanguard",
                description = "Heavy armored golems arrive. Cannon splash is effective!",
                spawns = buildList {
                    add(EnemySpawnConfig(EnemyType.TANK, 1.5f))
                    repeat(4) { add(EnemySpawnConfig(EnemyType.NORMAL, 0.9f)) }
                    add(EnemySpawnConfig(EnemyType.TANK, 1.2f))
                    repeat(4) { add(EnemySpawnConfig(EnemyType.FAST, 0.7f)) }
                    add(EnemySpawnConfig(EnemyType.TANK, 1.2f))
                    add(EnemySpawnConfig(EnemyType.TANK, 1.0f))
                },
                completionBonusCoins = 120
            )
            5 -> WaveData(
                waveNumber = 5,
                title = "Mini-Boss Assault",
                description = "A powerful vanguard boss enters the fray!",
                spawns = buildList {
                    repeat(4) { add(EnemySpawnConfig(EnemyType.FAST, 0.6f)) }
                    add(EnemySpawnConfig(EnemyType.BOSS, 2.0f, hpMultiplier = 0.6f))
                    repeat(3) { add(EnemySpawnConfig(EnemyType.TANK, 1.2f)) }
                    repeat(6) { add(EnemySpawnConfig(EnemyType.NORMAL, 0.8f)) }
                },
                completionBonusCoins = 160
            )
            6 -> WaveData(
                waveNumber = 6,
                title = "Combined Strike",
                description = "A dense battalion of runners, scouts, and tanks.",
                spawns = buildList {
                    repeat(8) { add(EnemySpawnConfig(EnemyType.FAST, 0.6f)) }
                    repeat(4) { add(EnemySpawnConfig(EnemyType.TANK, 1.1f)) }
                    repeat(8) { add(EnemySpawnConfig(EnemyType.NORMAL, 0.7f)) }
                    repeat(2) { add(EnemySpawnConfig(EnemyType.TANK, 1.0f)) }
                },
                completionBonusCoins = 180
            )
            7 -> WaveData(
                waveNumber = 7,
                title = "Iron Legion",
                description = "Reinforced golems marching in high numbers.",
                spawns = buildList {
                    repeat(8) { add(EnemySpawnConfig(EnemyType.TANK, 1.0f, hpMultiplier = 1.15f)) }
                    repeat(10) { add(EnemySpawnConfig(EnemyType.FAST, 0.55f)) }
                },
                completionBonusCoins = 200
            )
            8 -> WaveData(
                waveNumber = 8,
                title = "Crimson Storm",
                description = "Continuous multi-tiered rush from all enemy classes.",
                spawns = buildList {
                    repeat(12) { add(EnemySpawnConfig(EnemyType.FAST, 0.5f)) }
                    repeat(6) { add(EnemySpawnConfig(EnemyType.TANK, 0.9f)) }
                    repeat(10) { add(EnemySpawnConfig(EnemyType.NORMAL, 0.6f)) }
                },
                completionBonusCoins = 230
            )
            9 -> WaveData(
                waveNumber = 9,
                title = "Twin Titans",
                description = "Two colossal mini-bosses leading heavy armored tanks!",
                spawns = buildList {
                    add(EnemySpawnConfig(EnemyType.BOSS, 1.5f, hpMultiplier = 0.75f))
                    repeat(5) { add(EnemySpawnConfig(EnemyType.TANK, 0.9f)) }
                    repeat(8) { add(EnemySpawnConfig(EnemyType.FAST, 0.5f)) }
                    add(EnemySpawnConfig(EnemyType.BOSS, 1.5f, hpMultiplier = 0.75f))
                    repeat(4) { add(EnemySpawnConfig(EnemyType.TANK, 0.9f)) }
                },
                completionBonusCoins = 260
            )
            10 -> WaveData(
                waveNumber = 10,
                title = "The Titan Overlord",
                description = "Final battle! Defeat the Supreme Overlord and conquer the battle.",
                spawns = buildList {
                    repeat(6) { add(EnemySpawnConfig(EnemyType.FAST, 0.5f)) }
                    repeat(4) { add(EnemySpawnConfig(EnemyType.TANK, 0.8f)) }
                    add(EnemySpawnConfig(EnemyType.BOSS, 2.5f, hpMultiplier = 1.25f))
                    repeat(6) { add(EnemySpawnConfig(EnemyType.TANK, 0.8f)) }
                    repeat(8) { add(EnemySpawnConfig(EnemyType.FAST, 0.45f)) }
                },
                completionBonusCoins = 500
            )
            else -> {
                // Endless Waves (Wave 11+)
                val loopIndex = waveNumber - 10
                val multiplier = 1.0f + (loopIndex * 0.20f)
                WaveData(
                    waveNumber = waveNumber,
                    title = "Endless Siege $waveNumber",
                    description = "Endless survival mode! Scaled enemy HP and counts.",
                    spawns = buildList {
                        repeat(8 + loopIndex * 2) { add(EnemySpawnConfig(EnemyType.NORMAL, 0.6f, multiplier)) }
                        repeat(10 + loopIndex * 2) { add(EnemySpawnConfig(EnemyType.FAST, 0.45f, multiplier)) }
                        repeat(6 + loopIndex) { add(EnemySpawnConfig(EnemyType.TANK, 0.8f, multiplier)) }
                        if (waveNumber % 2 == 0) {
                            add(EnemySpawnConfig(EnemyType.BOSS, 1.8f, multiplier * 1.1f))
                        }
                    },
                    completionBonusCoins = 250 + loopIndex * 40
                )
            }
        }
    }
}
