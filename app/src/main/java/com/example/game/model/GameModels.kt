package com.example.game.model

import androidx.compose.ui.graphics.Color

data class Point(val x: Float, val y: Float) {
    fun distanceTo(other: Point): Float {
        val dx = x - other.x
        val dy = y - other.y
        return kotlin.math.sqrt(dx * dx + dy * dy)
    }
}

enum class EnemyType(
    val displayName: String,
    val baseHp: Float,
    val baseSpeed: Float,
    val coinReward: Int,
    val scoreReward: Int,
    val baseDamage: Int,
    val radiusDp: Float,
    val primaryColor: Color,
    val secondaryColor: Color
) {
    NORMAL(
        displayName = "Goblin Scout",
        baseHp = 100f,
        baseSpeed = 0.11f,
        coinReward = 15,
        scoreReward = 100,
        baseDamage = 1,
        radiusDp = 15f,
        primaryColor = Color(0xFF22C55E),
        secondaryColor = Color(0xFF15803D)
    ),
    FAST(
        displayName = "Swift Runner",
        baseHp = 55f,
        baseSpeed = 0.22f,
        coinReward = 20,
        scoreReward = 150,
        baseDamage = 1,
        radiusDp = 12f,
        primaryColor = Color(0xFFF59E0B),
        secondaryColor = Color(0xFFB45309)
    ),
    TANK(
        displayName = "Armored Golem",
        baseHp = 420f,
        baseSpeed = 0.06f,
        coinReward = 45,
        scoreReward = 300,
        baseDamage = 3,
        radiusDp = 20f,
        primaryColor = Color(0xFF8B5CF6),
        secondaryColor = Color(0xFF5B21B6)
    ),
    BOSS(
        displayName = "Titan Overlord",
        baseHp = 1600f,
        baseSpeed = 0.045f,
        coinReward = 160,
        scoreReward = 1200,
        baseDamage = 5,
        radiusDp = 26f,
        primaryColor = Color(0xFFEF4444),
        secondaryColor = Color(0xFF991B1B)
    )
}

data class Enemy(
    val id: Long,
    val type: EnemyType,
    val maxHp: Float,
    var currentHp: Float,
    var currentWaypointIndex: Int = 0,
    var segmentProgress: Float = 0f,
    var position: Point,
    var slowTimer: Float = 0f,
    var slowMultiplier: Float = 1.0f,
    val coinReward: Int,
    val scoreReward: Int,
    var headingAngle: Float = 0f
) {
    val isDead: Boolean get() = currentHp <= 0f
    val isSlowed: Boolean get() = slowTimer > 0f
}

enum class TowerType(
    val displayName: String,
    val roleDescription: String,
    val baseCost: Int,
    val baseRange: Float,
    val baseDamage: Float,
    val baseFireInterval: Float,
    val splashRadius: Float,
    val slowsEnemy: Boolean,
    val primaryColor: Color,
    val accentColor: Color,
    val iconEmoji: String
) {
    BASIC(
        displayName = "Basic Turret",
        roleDescription = "Balanced damage and firing range",
        baseCost = 100,
        baseRange = 0.22f,
        baseDamage = 25f,
        baseFireInterval = 0.8f,
        splashRadius = 0f,
        slowsEnemy = false,
        primaryColor = Color(0xFF0EA5E9),
        accentColor = Color(0xFF38BDF8),
        iconEmoji = "🎯"
    ),
    RAPID(
        displayName = "Rapid Laser",
        roleDescription = "High rate of fire, ideal against fast runners",
        baseCost = 150,
        baseRange = 0.19f,
        baseDamage = 12f,
        baseFireInterval = 0.22f,
        splashRadius = 0f,
        slowsEnemy = false,
        primaryColor = Color(0xFFFBBF24),
        accentColor = Color(0xFFF59E0B),
        iconEmoji = "⚡"
    ),
    CANNON(
        displayName = "Heavy Cannon",
        roleDescription = "Fires explosive mortar shells with splash damage",
        baseCost = 200,
        baseRange = 0.24f,
        baseDamage = 75f,
        baseFireInterval = 1.8f,
        splashRadius = 0.12f,
        slowsEnemy = false,
        primaryColor = Color(0xFFEF4444),
        accentColor = Color(0xFFF87171),
        iconEmoji = "💣"
    ),
    ICE(
        displayName = "Ice Blaster",
        roleDescription = "Freezes targets, slowing movement by 50%",
        baseCost = 175,
        baseRange = 0.21f,
        baseDamage = 16f,
        baseFireInterval = 1.0f,
        splashRadius = 0f,
        slowsEnemy = true,
        primaryColor = Color(0xFF06B6D4),
        accentColor = Color(0xFF67E8F9),
        iconEmoji = "❄️"
    );

    fun upgradeCost(currentLevel: Int): Int {
        return when (currentLevel) {
            1 -> (baseCost * 0.85f).toInt()
            2 -> (baseCost * 1.5f).toInt()
            else -> 0
        }
    }

    fun damageForLevel(level: Int): Float {
        return when (level) {
            1 -> baseDamage
            2 -> baseDamage * 1.7f
            3 -> baseDamage * 2.8f
            else -> baseDamage
        }
    }

    fun rangeForLevel(level: Int): Float {
        return when (level) {
            1 -> baseRange
            2 -> baseRange * 1.15f
            3 -> baseRange * 1.30f
            else -> baseRange
        }
    }

    fun fireIntervalForLevel(level: Int): Float {
        return when (level) {
            1 -> baseFireInterval
            2 -> baseFireInterval * 0.82f
            3 -> baseFireInterval * 0.65f
            else -> baseFireInterval
        }
    }
}

data class TowerPlatform(
    val id: Int,
    val normalizedPos: Point
)

data class Tower(
    val id: Long,
    val platformId: Int,
    val type: TowerType,
    val position: Point,
    var level: Int = 1,
    var cooldown: Float = 0f,
    var aimAngle: Float = 0f,
    var totalInvestedCoins: Int = type.baseCost
) {
    val damage: Float get() = type.damageForLevel(level)
    val range: Float get() = type.rangeForLevel(level)
    val fireInterval: Float get() = type.fireIntervalForLevel(level)
    val upgradeCost: Int get() = type.upgradeCost(level)
    val sellRefund: Int get() = (totalInvestedCoins * 0.75f).toInt()
    val isMaxLevel: Boolean get() = level >= 3
}

data class Projectile(
    val id: Long,
    val type: TowerType,
    var currentPos: Point,
    val targetPos: Point,
    val targetEnemyId: Long,
    val speed: Float,
    val damage: Float,
    val splashRadius: Float,
    val slowsEnemy: Boolean
)

data class Particle(
    var pos: Point,
    val velocity: Point,
    val color: Color,
    val size: Float,
    var alpha: Float = 1.0f,
    var life: Float = 0.5f,
    val maxLife: Float = 0.5f
)

data class FloatingText(
    val id: Long,
    val text: String,
    var pos: Point,
    val color: Color,
    var alpha: Float = 1.0f,
    var life: Float = 0.8f
)

enum class GameDifficulty(
    val displayName: String,
    val initialCoins: Int,
    val initialBaseHealth: Int,
    val hpScalingMultiplier: Float,
    val color: Color
) {
    EASY("Easy", initialCoins = 500, initialBaseHealth = 25, hpScalingMultiplier = 0.85f, color = Color(0xFF10B981)),
    NORMAL("Normal", initialCoins = 350, initialBaseHealth = 20, hpScalingMultiplier = 1.0f, color = Color(0xFF38BDF8)),
    HARD("Hard", initialCoins = 250, initialBaseHealth = 15, hpScalingMultiplier = 1.35f, color = Color(0xFFEF4444))
}

enum class GameStatus {
    PREPARING,
    WAVE_ACTIVE,
    GAME_OVER,
    VICTORY
}

