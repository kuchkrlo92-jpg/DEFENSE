package com.example.game.data

import kotlinx.coroutines.flow.Flow

class GameStatsRepository(private val dao: GameStatsDao) {
    val statsFlow: Flow<GameStatsEntity?> = dao.getStats()

    suspend fun saveStats(highScore: Int, highestWave: Int, additionalKills: Int, won: Boolean) {
        val current = dao.getStats()
        // Simple upsert
        dao.insertOrUpdate(
            GameStatsEntity(
                id = 1,
                highScore = highScore,
                highestWave = highestWave,
                totalEnemiesKilled = additionalKills,
                gamesWon = if (won) 1 else 0
            )
        )
    }
}
