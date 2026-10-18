package com.example.game.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "game_stats")
data class GameStatsEntity(
    @PrimaryKey val id: Int = 1,
    val highScore: Int = 0,
    val highestWave: Int = 1,
    val totalEnemiesKilled: Int = 0,
    val gamesWon: Int = 0
)
