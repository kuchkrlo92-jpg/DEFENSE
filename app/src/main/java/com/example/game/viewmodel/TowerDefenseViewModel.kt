package com.example.game.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.game.data.AppDatabase
import com.example.game.data.GameStatsRepository
import com.example.game.engine.EnemySpawnConfig
import com.example.game.engine.GameMap
import com.example.game.engine.WaveData
import com.example.game.engine.WaveManager
import com.example.game.model.*
import com.example.game.sound.SoundManager
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin
import androidx.compose.ui.graphics.Color

data class GameUiState(
    val difficulty: GameDifficulty = GameDifficulty.NORMAL,
    val coins: Int = 350,
    val baseHealth: Int = 20,
    val maxBaseHealth: Int = 20,
    val score: Int = 0,
    val highScore: Int = 0,
    val waveNumber: Int = 1,
    val maxCampaignWaves: Int = WaveManager.MAX_CAMPAIGN_WAVES,
    val isEndlessMode: Boolean = false,
    val gameStatus: GameStatus = GameStatus.PREPARING,
    val currentWaveData: WaveData = WaveManager.getWave(1),
    val enemiesRemainingInWave: Int = 0,
    val towers: List<Tower> = emptyList(),
    val enemies: List<Enemy> = emptyList(),
    val projectiles: List<Projectile> = emptyList(),
    val particles: List<Particle> = emptyList(),
    val floatingTexts: List<FloatingText> = emptyList(),
    val selectedPlatformId: Int? = null,
    val selectedTower: Tower? = null,
    val towerTypeToPlace: TowerType? = null,
    val isPaused: Boolean = false,
    val gameSpeed: Float = 1.0f,
    val isSoundEnabled: Boolean = true,
    val showShopDialog: Boolean = false,
    val showInstructionsDialog: Boolean = false,
    val showGameOverDialog: Boolean = false,
    val showVictoryDialog: Boolean = false,
    val showStartMenu: Boolean = true,
    val waveStartBannerTimer: Float = 0f,
    val waveStartBannerWave: Int = 1,
    val waveCompleteBannerTimer: Float = 0f,
    val waveCompleteBannerWave: Int = 1,
    val enemiesDefeatedTotal: Int = 0
)

class TowerDefenseViewModel(application: Application) : AndroidViewModel(application) {
    private val repository: GameStatsRepository
    val soundManager = SoundManager()

    private val _uiState = MutableStateFlow(GameUiState())
    val uiState: StateFlow<GameUiState> = _uiState.asStateFlow()

    private var nextId = 1L
    private var gameLoopJob: Job? = null
    private var pendingSpawns = mutableListOf<EnemySpawnConfig>()
    private var spawnTimer = 0f

    init {
        val db = AppDatabase.getDatabase(application)
        repository = GameStatsRepository(db.gameStatsDao())

        viewModelScope.launch {
            repository.statsFlow.collect { stats ->
                if (stats != null) {
                    _uiState.update { it.copy(highScore = stats.highScore) }
                }
            }
        }

        startGameLoop()
    }

    private fun startGameLoop() {
        gameLoopJob?.cancel()
        gameLoopJob = viewModelScope.launch {
            var lastTime = System.nanoTime()
            while (isActive) {
                val now = System.nanoTime()
                val deltaSec = ((now - lastTime) / 1_000_000_000f).coerceIn(0.001f, 0.05f)
                lastTime = now

                val currentState = _uiState.value
                if (!currentState.isPaused && currentState.gameStatus != GameStatus.GAME_OVER) {
                    updateGame(deltaSec * currentState.gameSpeed)
                }

                delay(16) // Target ~60 FPS
            }
        }
    }

    private fun updateGame(dt: Float) {
        // 1. Spawning enemies
        handleSpawning(dt)

        val state = _uiState.value

        // 2. Update enemies
        val (activeEnemies, baseDamageDealt) = updateEnemies(state.enemies, dt)
        var newBaseHealth = state.baseHealth - baseDamageDealt
        var newStatus = state.gameStatus

        if (baseDamageDealt > 0) {
            soundManager.playHit()
            addFloatingText("-${baseDamageDealt} HP", Point(0.48f, 0.88f), Color.Red)
            // Castle hit particles
            repeat(8) {
                addParticle(
                    Point(0.48f, 0.88f),
                    Point((Math.random() * 0.1 - 0.05).toFloat(), (Math.random() * 0.1 - 0.05).toFloat()),
                    Color.Red,
                    6f
                )
            }
        }

        if (newBaseHealth <= 0) {
            newBaseHealth = 0
            newStatus = GameStatus.GAME_OVER
            soundManager.playGameOver()
            saveHighScores()
            _uiState.update {
                it.copy(
                    baseHealth = 0,
                    gameStatus = GameStatus.GAME_OVER,
                    showGameOverDialog = true
                )
            }
            return
        }

        // 3. Update towers & fire
        val (updatedTowers, newProjectiles) = updateTowersAndFire(state.towers, activeEnemies, dt)

        // 4. Update projectiles & collisions
        val (remainingProjectiles, projectileHits) = updateProjectiles(
            state.projectiles + newProjectiles,
            activeEnemies,
            dt
        )

        // 5. Apply projectile hits to enemies
        var coinsEarned = 0
        var scoreEarned = 0
        var enemiesKilledThisFrame = 0

        val damagedEnemies = activeEnemies.map { enemy ->
            var hp = enemy.currentHp
            var slowTime = enemy.slowTimer
            var slowMult = enemy.slowMultiplier

            for (hit in projectileHits) {
                val dist = enemy.position.distanceTo(hit.hitPos)
                if (dist <= 0.04f || (hit.splashRadius > 0f && dist <= hit.splashRadius)) {
                    val dmg = if (dist <= 0.04f) hit.damage else hit.damage * 0.7f
                    hp -= dmg
                    if (hit.slowsEnemy) {
                        slowTime = 2.5f
                        slowMult = 0.5f
                    }
                    // Hit spark particles
                    repeat(3) {
                        addParticle(
                            enemy.position,
                            Point((Math.random() * 0.08 - 0.04).toFloat(), (Math.random() * 0.08 - 0.04).toFloat()),
                            if (hit.slowsEnemy) Color.Cyan else Color.Yellow,
                            4f
                        )
                    }
                }
            }

            enemy.copy(currentHp = hp, slowTimer = slowTime, slowMultiplier = slowMult)
        }

        val survivingEnemies = damagedEnemies.filter { enemy ->
            if (enemy.isDead) {
                coinsEarned += enemy.coinReward
                scoreEarned += enemy.scoreReward
                enemiesKilledThisFrame++
                soundManager.playCoin()
                addFloatingText("+${enemy.coinReward}¢", enemy.position, Color(0xFFFBBF24))
                // Death explosion particles
                repeat(12) {
                    addParticle(
                        enemy.position,
                        Point((Math.random() * 0.12 - 0.06).toFloat(), (Math.random() * 0.12 - 0.06).toFloat()),
                        enemy.type.primaryColor,
                        7f
                    )
                }
                false
            } else {
                true
            }
        }

        // 6. Update particles & floating texts
        val updatedParticles = updateParticles(state.particles, dt)
        val updatedTexts = updateFloatingTexts(state.floatingTexts, dt)

        // 7. Check wave status
        var finalStatus = newStatus
        var showVictory = state.showVictoryDialog
        var nextWaveNum = state.waveNumber
        var waveClearTimer = (state.waveCompleteBannerTimer - dt).coerceAtLeast(0f)
        var waveClearWave = state.waveCompleteBannerWave
        val waveStartTimer = (state.waveStartBannerTimer - dt).coerceAtLeast(0f)

        if (state.gameStatus == GameStatus.WAVE_ACTIVE && pendingSpawns.isEmpty() && survivingEnemies.isEmpty()) {
            // Wave cleared!
            val bonusCoins = state.currentWaveData.completionBonusCoins
            coinsEarned += bonusCoins
            scoreEarned += state.waveNumber * 250
            addFloatingText("WAVE CLEARED! +${bonusCoins}¢", Point(0.48f, 0.45f), Color(0xFF4ADE80))
            soundManager.playVictory()

            // Trigger 1 second Wave Complete banner
            waveClearTimer = 1.0f
            waveClearWave = state.waveNumber

            if (state.waveNumber >= WaveManager.MAX_CAMPAIGN_WAVES && !state.isEndlessMode) {
                finalStatus = GameStatus.VICTORY
                showVictory = true
                saveHighScores()
            } else {
                finalStatus = GameStatus.PREPARING
                nextWaveNum = state.waveNumber + 1
            }
        }

        _uiState.update { current ->
            current.copy(
                baseHealth = newBaseHealth,
                coins = current.coins + coinsEarned,
                score = current.score + scoreEarned,
                gameStatus = finalStatus,
                waveNumber = nextWaveNum,
                currentWaveData = if (nextWaveNum != current.waveNumber) WaveManager.getWave(nextWaveNum) else current.currentWaveData,
                enemiesRemainingInWave = pendingSpawns.size + survivingEnemies.size,
                enemies = survivingEnemies,
                towers = updatedTowers,
                projectiles = remainingProjectiles,
                particles = updatedParticles,
                floatingTexts = updatedTexts,
                showVictoryDialog = showVictory,
                waveStartBannerTimer = waveStartTimer,
                waveCompleteBannerTimer = waveClearTimer,
                waveCompleteBannerWave = waveClearWave,
                enemiesDefeatedTotal = current.enemiesDefeatedTotal + enemiesKilledThisFrame
            )
        }
    }

    private fun handleSpawning(dt: Float) {
        if (pendingSpawns.isEmpty()) return
        spawnTimer -= dt
        if (spawnTimer <= 0f) {
            val spawn = pendingSpawns.removeAt(0)
            val waveNum = _uiState.value.waveNumber
            // every 5 waves enemy health +1 (every 5 waves adds an extra boost, e.g. wave 5: +1x/tier, wave 10: +2x)
            // Plus difficulty scaling
            val waveBonusMultiplier = 1.0f + ((waveNum - 1) / 5) * 0.25f
            val diffMultiplier = _uiState.value.difficulty.hpScalingMultiplier
            val totalMultiplier = spawn.hpMultiplier * waveBonusMultiplier * diffMultiplier

            val baseMaxHp = (spawn.type.baseHp * totalMultiplier) + ((waveNum - 1) / 5) * 15f
            val enemy = Enemy(
                id = nextId++,
                type = spawn.type,
                maxHp = baseMaxHp,
                currentHp = baseMaxHp,
                currentWaypointIndex = 0,
                segmentProgress = 0f,
                position = GameMap.waypoints[0],
                coinReward = (spawn.type.coinReward * spawn.hpMultiplier.coerceAtLeast(1f)).toInt(),
                scoreReward = (spawn.type.scoreReward * spawn.hpMultiplier.coerceAtLeast(1f)).toInt()
            )
            _uiState.update { it.copy(enemies = it.enemies + enemy) }
            spawnTimer = spawn.spawnDelaySec
        }
    }

    private fun updateEnemies(enemies: List<Enemy>, dt: Float): Pair<List<Enemy>, Int> {
        val active = mutableListOf<Enemy>()
        var baseDamage = 0

        for (enemy in enemies) {
            var slowTimer = (enemy.slowTimer - dt).coerceAtLeast(0f)
            val slowMultiplier = if (slowTimer > 0f) 0.5f else 1.0f

            val effectiveSpeed = enemy.type.baseSpeed * slowMultiplier
            val waypoints = GameMap.waypoints
            var wpIndex = enemy.currentWaypointIndex
            var progress = enemy.segmentProgress

            if (wpIndex >= waypoints.size - 1) {
                // Reached base!
                baseDamage += enemy.type.baseDamage
                continue
            }

            val p1 = waypoints[wpIndex]
            val p2 = waypoints[wpIndex + 1]
            val segmentLen = p1.distanceTo(p2)
            val progressDelta = if (segmentLen > 0f) (effectiveSpeed * dt) / segmentLen else 1f

            progress += progressDelta
            if (progress >= 1f) {
                wpIndex++
                progress = 0f
                if (wpIndex >= waypoints.size - 1) {
                    baseDamage += enemy.type.baseDamage
                    continue
                }
            }

            val curP1 = waypoints[wpIndex]
            val curP2 = waypoints[wpIndex + 1]
            val curX = curP1.x + (curP2.x - curP1.x) * progress
            val curY = curP1.y + (curP2.y - curP1.y) * progress

            val segDx = curP2.x - curP1.x
            val segDy = curP2.y - curP1.y
            val headingDeg = Math.toDegrees(atan2(segDy.toDouble(), segDx.toDouble())).toFloat()

            active.add(
                enemy.copy(
                    currentWaypointIndex = wpIndex,
                    segmentProgress = progress,
                    position = Point(curX, curY),
                    slowTimer = slowTimer,
                    slowMultiplier = slowMultiplier,
                    headingAngle = headingDeg
                )
            )
        }

        return Pair(active, baseDamage)
    }

    private fun updateTowersAndFire(
        towers: List<Tower>,
        enemies: List<Enemy>,
        dt: Float
    ): Pair<List<Tower>, List<Projectile>> {
        val updatedTowers = mutableListOf<Tower>()
        val spawnedProjectiles = mutableListOf<Projectile>()

        for (tower in towers) {
            var cooldown = (tower.cooldown - dt).coerceAtLeast(0f)
            var aimAngle = tower.aimAngle

            // Find best target: enemy in range with greatest path distance travelled
            val inRangeEnemies = enemies.filter { enemy ->
                tower.position.distanceTo(enemy.position) <= tower.range
            }

            val target = inRangeEnemies.maxByOrNull { enemy ->
                GameMap.getDistanceTravelled(enemy.currentWaypointIndex, enemy.segmentProgress)
            }

            if (target != null) {
                val dx = target.position.x - tower.position.x
                val dy = target.position.y - tower.position.y
                aimAngle = Math.toDegrees(atan2(dy.toDouble(), dx.toDouble())).toFloat()

                if (cooldown <= 0f) {
                    // Fire!
                    spawnedProjectiles.add(
                        Projectile(
                            id = nextId++,
                            type = tower.type,
                            currentPos = tower.position,
                            targetPos = target.position,
                            targetEnemyId = target.id,
                            speed = 0.85f,
                            damage = tower.damage,
                            splashRadius = if (tower.type == TowerType.CANNON) 0.09f else 0f,
                            slowsEnemy = tower.type.slowsEnemy
                        )
                    )
                    soundManager.playShoot(tower.type)
                    cooldown = tower.fireInterval
                }
            }

            updatedTowers.add(tower.copy(cooldown = cooldown, aimAngle = aimAngle))
        }

        return Pair(updatedTowers, spawnedProjectiles)
    }

    data class HitResult(val hitPos: Point, val damage: Float, val splashRadius: Float, val slowsEnemy: Boolean)

    private fun updateProjectiles(
        projectiles: List<Projectile>,
        enemies: List<Enemy>,
        dt: Float
    ): Pair<List<Projectile>, List<HitResult>> {
        val remaining = mutableListOf<Projectile>()
        val hits = mutableListOf<HitResult>()

        for (proj in projectiles) {
            // Find current target position (if enemy still alive, home in; otherwise go to last target pos)
            val enemy = enemies.firstOrNull { it.id == proj.targetEnemyId }
            val destination = enemy?.position ?: proj.targetPos

            val dist = proj.currentPos.distanceTo(destination)
            val step = proj.speed * dt

            if (dist <= step || dist < 0.02f) {
                // Impact!
                hits.add(HitResult(destination, proj.damage, proj.splashRadius, proj.slowsEnemy))
                soundManager.playHit()
            } else {
                val dirX = (destination.x - proj.currentPos.x) / dist
                val dirY = (destination.y - proj.currentPos.y) / dist
                val nextPos = Point(
                    proj.currentPos.x + dirX * step,
                    proj.currentPos.y + dirY * step
                )
                remaining.add(proj.copy(currentPos = nextPos, targetPos = destination))
            }
        }

        return Pair(remaining, hits)
    }

    private fun updateParticles(particles: List<Particle>, dt: Float): List<Particle> {
        val list = mutableListOf<Particle>()
        for (p in particles) {
            val newLife = p.life - dt
            if (newLife > 0f) {
                val newPos = Point(p.pos.x + p.velocity.x * dt, p.pos.y + p.velocity.y * dt)
                list.add(
                    p.copy(
                        pos = newPos,
                        life = newLife,
                        alpha = (newLife / p.maxLife).coerceIn(0f, 1f)
                    )
                )
            }
        }
        return list
    }

    private fun updateFloatingTexts(texts: List<FloatingText>, dt: Float): List<FloatingText> {
        val list = mutableListOf<FloatingText>()
        for (t in texts) {
            val newLife = t.life - dt
            if (newLife > 0f) {
                val newPos = Point(t.pos.x, t.pos.y - 0.03f * dt)
                list.add(t.copy(pos = newPos, life = newLife, alpha = (newLife / 0.8f).coerceIn(0f, 1f)))
            }
        }
        return list
    }

    private fun addParticle(pos: Point, vel: Point, color: Color, size: Float) {
        val particle = Particle(
            pos = pos,
            velocity = vel,
            color = color,
            size = size,
            life = 0.4f,
            maxLife = 0.4f
        )
        _uiState.update { it.copy(particles = it.particles + particle) }
    }

    private fun addFloatingText(text: String, pos: Point, color: Color) {
        val ft = FloatingText(id = nextId++, text = text, pos = pos, color = color)
        _uiState.update { it.copy(floatingTexts = it.floatingTexts + ft) }
    }

    // Public Actions
    fun startWave() {
        val state = _uiState.value
        if (state.gameStatus == GameStatus.PREPARING || state.gameStatus == GameStatus.VICTORY) {
            val waveData = WaveManager.getWave(state.waveNumber)
            pendingSpawns = waveData.spawns.toMutableList()
            spawnTimer = 0.5f

            soundManager.playWaveStart()
            _uiState.update {
                it.copy(
                    gameStatus = GameStatus.WAVE_ACTIVE,
                    currentWaveData = waveData,
                    enemiesRemainingInWave = pendingSpawns.size,
                    showVictoryDialog = false,
                    waveStartBannerTimer = 1.0f,
                    waveStartBannerWave = state.waveNumber
                )
            }
        }
    }

    fun selectPlatform(platformId: Int) {
        val state = _uiState.value
        val existingTower = state.towers.firstOrNull { it.platformId == platformId }

        if (existingTower != null) {
            _uiState.update {
                it.copy(
                    selectedPlatformId = platformId,
                    selectedTower = existingTower,
                    towerTypeToPlace = null
                )
            }
            return
        }

        // Platform is empty
        val typeToPlace = state.towerTypeToPlace
        if (typeToPlace != null) {
            buyAndPlaceTower(platformId, typeToPlace)
        } else {
            // Open shop to choose tower
            _uiState.update {
                it.copy(
                    selectedPlatformId = platformId,
                    selectedTower = null,
                    showShopDialog = true
                )
            }
        }
    }

    fun selectTowerTypeToPlace(type: TowerType?) {
        _uiState.update { it.copy(towerTypeToPlace = type) }
        val platformId = _uiState.value.selectedPlatformId
        if (platformId != null && type != null) {
            val existing = _uiState.value.towers.firstOrNull { it.platformId == platformId }
            if (existing == null) {
                buyAndPlaceTower(platformId, type)
            }
        }
    }

    fun buyAndPlaceTower(platformId: Int, type: TowerType) {
        val state = _uiState.value
        if (state.coins < type.baseCost) {
            addFloatingText("NEED ${type.baseCost}¢!", Point(0.48f, 0.5f), Color.Red)
            return
        }

        val platform = GameMap.platforms.firstOrNull { it.id == platformId } ?: return
        val newTower = Tower(
            id = nextId++,
            platformId = platformId,
            type = type,
            position = platform.normalizedPos,
            level = 1,
            totalInvestedCoins = type.baseCost
        )

        soundManager.playUpgrade()
        repeat(8) {
            addParticle(
                platform.normalizedPos,
                Point((Math.random() * 0.08 - 0.04).toFloat(), (Math.random() * 0.08 - 0.04).toFloat()),
                type.accentColor,
                6f
            )
        }
        addFloatingText("-${type.baseCost}¢", platform.normalizedPos, Color(0xFFFBBF24))

        _uiState.update {
            it.copy(
                coins = it.coins - type.baseCost,
                towers = it.towers + newTower,
                selectedTower = newTower,
                selectedPlatformId = platformId,
                towerTypeToPlace = null,
                showShopDialog = false
            )
        }
    }

    fun upgradeTower(towerId: Long) {
        val state = _uiState.value
        val tower = state.towers.firstOrNull { it.id == towerId } ?: return
        if (tower.isMaxLevel) return

        val cost = tower.upgradeCost
        if (state.coins < cost) {
            addFloatingText("NEED $cost¢!", tower.position, Color.Red)
            return
        }

        val upgraded = tower.copy(
            level = tower.level + 1,
            totalInvestedCoins = tower.totalInvestedCoins + cost
        )

        soundManager.playUpgrade()
        repeat(12) {
            addParticle(
                tower.position,
                Point((Math.random() * 0.1 - 0.05).toFloat(), (Math.random() * 0.1 - 0.05).toFloat()),
                Color(0xFFFDE047),
                7f
            )
        }
        addFloatingText("LEVEL ${upgraded.level}!", tower.position, Color(0xFFFDE047))

        _uiState.update { current ->
            val updatedList = current.towers.map { if (it.id == towerId) upgraded else it }
            current.copy(
                coins = current.coins - cost,
                towers = updatedList,
                selectedTower = upgraded
            )
        }
    }

    fun sellTower(towerId: Long) {
        val state = _uiState.value
        val tower = state.towers.firstOrNull { it.id == towerId } ?: return
        val refund = tower.sellRefund

        soundManager.playCoin()
        addFloatingText("+$refund¢", tower.position, Color(0xFF4ADE80))

        _uiState.update { current ->
            current.copy(
                coins = current.coins + refund,
                towers = current.towers.filter { it.id != towerId },
                selectedTower = null,
                selectedPlatformId = null
            )
        }
    }

    fun deselectAll() {
        _uiState.update {
            it.copy(
                selectedPlatformId = null,
                selectedTower = null,
                towerTypeToPlace = null
            )
        }
    }

    fun togglePause() {
        _uiState.update { it.copy(isPaused = !it.isPaused) }
    }

    fun toggleSpeed() {
        _uiState.update {
            val newSpeed = if (it.gameSpeed == 1.0f) 2.0f else 1.0f
            it.copy(gameSpeed = newSpeed)
        }
    }

    fun toggleSound() {
        val newState = !_uiState.value.isSoundEnabled
        soundManager.isEnabled = newState
        _uiState.update { it.copy(isSoundEnabled = newState) }
    }

    fun openShop() {
        _uiState.update { it.copy(showShopDialog = true) }
    }

    fun closeShop() {
        _uiState.update { it.copy(showShopDialog = false) }
    }

    fun openInstructions() {
        _uiState.update { it.copy(showInstructionsDialog = true) }
    }

    fun closeInstructions() {
        _uiState.update { it.copy(showInstructionsDialog = false) }
    }

    fun openStartMenu() {
        _uiState.update { it.copy(showStartMenu = true) }
    }

    fun dismissStartMenu() {
        _uiState.update { it.copy(showStartMenu = false) }
    }

    fun startGameWithDifficulty(diff: GameDifficulty) {
        pendingSpawns.clear()
        _uiState.update {
            GameUiState(
                difficulty = diff,
                coins = diff.initialCoins,
                baseHealth = diff.initialBaseHealth,
                maxBaseHealth = diff.initialBaseHealth,
                highScore = it.highScore,
                isSoundEnabled = it.isSoundEnabled,
                showStartMenu = false
            )
        }
    }

    fun restartGame() {
        pendingSpawns.clear()
        _uiState.update {
            val diff = it.difficulty
            GameUiState(
                difficulty = diff,
                coins = diff.initialCoins,
                baseHealth = diff.initialBaseHealth,
                maxBaseHealth = diff.initialBaseHealth,
                highScore = it.highScore,
                isSoundEnabled = it.isSoundEnabled,
                showStartMenu = false
            )
        }
    }

    fun continueEndlessMode() {
        _uiState.update {
            it.copy(
                isEndlessMode = true,
                showVictoryDialog = false,
                gameStatus = GameStatus.PREPARING,
                waveNumber = 11,
                currentWaveData = WaveManager.getWave(11),
                coins = it.coins + 300 // Bonus coins for endless start
            )
        }
    }

    private fun saveHighScores() {
        val currentScore = _uiState.value.score
        val highestWave = _uiState.value.waveNumber
        val totalKills = _uiState.value.enemiesDefeatedTotal
        val won = _uiState.value.gameStatus == GameStatus.VICTORY

        viewModelScope.launch {
            val newHigh = maxOf(_uiState.value.highScore, currentScore)
            repository.saveStats(newHigh, highestWave, totalKills, won)
            _uiState.update { it.copy(highScore = newHigh) }
        }
    }
}
