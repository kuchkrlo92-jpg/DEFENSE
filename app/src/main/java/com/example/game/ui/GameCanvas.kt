package com.example.game.ui

import android.graphics.Paint
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.input.pointer.pointerInput
import com.example.game.engine.GameMap
import com.example.game.model.*
import com.example.game.viewmodel.GameUiState
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin

@Composable
fun GameCanvas(
    uiState: GameUiState,
    onPlatformClick: (Int) -> Unit,
    onBackgroundClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Canvas(
        modifier = modifier
            .fillMaxSize()
            .pointerInput(uiState.towers, uiState.selectedPlatformId, uiState.towerTypeToPlace) {
                detectTapGestures { tapOffset ->
                    val canvasWidth = size.width.toFloat()
                    val canvasHeight = size.height.toFloat()
                    val normTapX = tapOffset.x / canvasWidth
                    val normTapY = tapOffset.y / canvasHeight

                    var clickedPlatformId: Int? = null
                    for (plat in GameMap.platforms) {
                        val dx = (normTapX - plat.normalizedPos.x) * canvasWidth
                        val dy = (normTapY - plat.normalizedPos.y) * canvasHeight
                        val dist = kotlin.math.sqrt(dx * dx + dy * dy)
                        // Platform hit radius ~ 34dp equivalent in pixels
                        if (dist <= 75f) {
                            clickedPlatformId = plat.id
                            break
                        }
                    }

                    if (clickedPlatformId != null) {
                        onPlatformClick(clickedPlatformId)
                    } else {
                        onBackgroundClick()
                    }
                }
            }
    ) {
        val w = size.width
        val h = size.height

        // 1. Colorful Terrain Background
        drawRect(
            brush = Brush.verticalGradient(
                listOf(Color(0xFF2E7D32), Color(0xFF1B5E20))
            )
        )

        // Grid/Checker grass detail pattern for retro Scratch feel
        val gridSize = 40f
        var gx = 0f
        while (gx < w) {
            var gy = 0f
            while (gy < h) {
                if (((gx / gridSize).toInt() + (gy / gridSize).toInt()) % 2 == 0) {
                    drawRect(
                        color = Color(0x12FFFFFF),
                        topLeft = Offset(gx, gy),
                        size = Size(gridSize, gridSize)
                    )
                }
                gy += gridSize
            }
            gx += gridSize
        }

        // 2. Draw Cobblestone Path
        drawGamePath(w, h)

        // 3. Draw Spawn Portal
        drawSpawnPortal(w, h)

        // 4. Draw Base Castle
        drawBaseCastle(w, h, uiState.baseHealth, uiState.maxBaseHealth)

        // 5. Draw Platforms & Range Indicators
        drawPlatformsAndTowers(w, h, uiState)

        // 6. Draw Enemies with dynamic costumes evolving every 5 waves
        drawEnemies(w, h, uiState.enemies, uiState.waveNumber)

        // 7. Draw Projectiles
        drawProjectiles(w, h, uiState.projectiles)

        // 8. Draw Particles
        drawParticles(w, h, uiState.particles)

        // 9. Draw Floating Texts
        drawFloatingTexts(w, h, uiState.floatingTexts)
    }
}

private fun DrawScope.drawGamePath(w: Float, h: Float) {
    val waypoints = GameMap.waypoints
    if (waypoints.size < 2) return

    val path = Path().apply {
        moveTo(waypoints[0].x * w, waypoints[0].y * h)
        for (i in 1 until waypoints.size) {
            lineTo(waypoints[i].x * w, waypoints[i].y * h)
        }
    }

    // Outer border (Cobblestone curb)
    drawPath(
        path = path,
        color = Color(0xFF94A3B8),
        style = Stroke(width = 54f, cap = StrokeCap.Round)
    )

    // Inner main road (Warm stone)
    drawPath(
        path = path,
        color = Color(0xFFE2E8F0),
        style = Stroke(width = 44f, cap = StrokeCap.Round)
    )

    // Center dash line (Road texture)
    drawPath(
        path = path,
        color = Color(0xFFCBD5E1),
        style = Stroke(width = 16f, cap = StrokeCap.Round)
    )
}

private fun DrawScope.drawSpawnPortal(w: Float, h: Float) {
    val wp0 = GameMap.waypoints[0]
    val cx = wp0.x * w
    val cy = wp0.y * h

    // Portal outer glow
    drawCircle(
        brush = Brush.radialGradient(
            listOf(Color(0xFFA855F7), Color(0x00A855F7)),
            center = Offset(cx, cy),
            radius = 48f
        ),
        radius = 48f,
        center = Offset(cx, cy)
    )

    // Dark void
    drawCircle(color = Color(0xFF3B0764), radius = 26f, center = Offset(cx, cy))
    drawCircle(color = Color(0xFFC084FC), radius = 18f, center = Offset(cx, cy))
    drawCircle(color = Color(0xFFFFFFFF), radius = 8f, center = Offset(cx, cy))

    // Rotating ring simulation
    drawCircle(
        color = Color(0xFFF43F5E),
        radius = 28f,
        center = Offset(cx, cy),
        style = Stroke(width = 3f)
    )
}

private fun DrawScope.drawBaseCastle(w: Float, h: Float, health: Int, maxHealth: Int) {
    val endWp = GameMap.waypoints.last()
    val cx = endWp.x * w
    val cy = endWp.y * h

    // 1. Fortress Ground Shadow
    drawOval(
        color = Color(0x66000000),
        topLeft = Offset(cx - 52f, cy + 22f),
        size = Size(104f, 22f)
    )

    // 2. Outer Fortress Wall / Bastion Foundation (Hewn stone with bevel)
    drawRoundRect(
        brush = Brush.verticalGradient(
            colors = listOf(Color(0xFF64748B), Color(0xFF334155), Color(0xFF1E293B)),
            startY = cy - 38f,
            endY = cy + 34f
        ),
        topLeft = Offset(cx - 48f, cy - 38f),
        size = Size(96f, 72f),
        cornerRadius = androidx.compose.ui.geometry.CornerRadius(6f, 6f)
    )

    // Realistic Stone Masonry Lines
    val mortarColor = Color(0x33000000)
    for (row in 0..4) {
        val yOffset = cy - 26f + (row * 12f)
        drawLine(
            color = mortarColor,
            start = Offset(cx - 46f, yOffset),
            end = Offset(cx + 46f, yOffset),
            strokeWidth = 1.5f
        )
    }

    // 3. Left and Right Guard Watchtowers (Parapets)
    // Left Tower
    drawRoundRect(
        brush = Brush.horizontalGradient(
            colors = listOf(Color(0xFF475569), Color(0xFF1E293B)),
            startX = cx - 52f,
            endX = cx - 28f
        ),
        topLeft = Offset(cx - 52f, cy - 48f),
        size = Size(24f, 76f),
        cornerRadius = androidx.compose.ui.geometry.CornerRadius(4f, 4f)
    )
    // Left Tower Crenellations (Battlements)
    drawRect(color = Color(0xFF334155), topLeft = Offset(cx - 52f, cy - 54f), size = Size(7f, 7f))
    drawRect(color = Color(0xFF334155), topLeft = Offset(cx - 41f, cy - 54f), size = Size(7f, 7f))
    drawRect(color = Color(0xFF334155), topLeft = Offset(cx - 32f, cy - 54f), size = Size(4f, 7f))
    // Arrow Slit Left
    drawRect(color = Color(0xFF0F172A), topLeft = Offset(cx - 41f, cy - 30f), size = Size(3f, 10f))

    // Right Tower
    drawRoundRect(
        brush = Brush.horizontalGradient(
            colors = listOf(Color(0xFF334155), Color(0xFF1E293B)),
            startX = cx + 28f,
            endX = cx + 52f
        ),
        topLeft = Offset(cx + 28f, cy - 48f),
        size = Size(24f, 76f),
        cornerRadius = androidx.compose.ui.geometry.CornerRadius(4f, 4f)
    )
    // Right Tower Crenellations
    drawRect(color = Color(0xFF334155), topLeft = Offset(cx + 28f, cy - 54f), size = Size(4f, 7f))
    drawRect(color = Color(0xFF334155), topLeft = Offset(cx + 35f, cy - 54f), size = Size(7f, 7f))
    drawRect(color = Color(0xFF334155), topLeft = Offset(cx + 45f, cy - 54f), size = Size(7f, 7f))
    // Arrow Slit Right
    drawRect(color = Color(0xFF0F172A), topLeft = Offset(cx + 38f, cy - 30f), size = Size(3f, 10f))

    // Center Keep Crenellations
    drawRect(color = Color(0xFF475569), topLeft = Offset(cx - 24f, cy - 44f), size = Size(8f, 7f))
    drawRect(color = Color(0xFF475569), topLeft = Offset(cx - 8f, cy - 44f), size = Size(8f, 7f))
    drawRect(color = Color(0xFF475569), topLeft = Offset(cx + 8f, cy - 44f), size = Size(8f, 7f))
    drawRect(color = Color(0xFF475569), topLeft = Offset(cx + 20f, cy - 44f), size = Size(6f, 7f))

    // 4. Heavy Reinforced Wooden Gate & Iron Portcullis
    drawRoundRect(
        brush = Brush.verticalGradient(
            colors = listOf(Color(0xFF78350F), Color(0xFF451A03)),
            startY = cy - 4f,
            endY = cy + 34f
        ),
        topLeft = Offset(cx - 16f, cy - 4f),
        size = Size(32f, 38f),
        cornerRadius = androidx.compose.ui.geometry.CornerRadius(16f, 16f)
    )
    // Iron Portcullis Grate
    val ironGateColor = Color(0xFF0F172A)
    for (gx in -10..10 step 5) {
        drawLine(
            color = ironGateColor,
            start = Offset(cx + gx, cy + 4f),
            end = Offset(cx + gx, cy + 34f),
            strokeWidth = 2f
        )
    }
    drawLine(color = ironGateColor, start = Offset(cx - 14f, cy + 12f), end = Offset(cx + 14f, cy + 12f), strokeWidth = 2f)
    drawLine(color = ironGateColor, start = Offset(cx - 14f, cy + 22f), end = Offset(cx + 14f, cy + 22f), strokeWidth = 2f)

    // Glowing Defensive Magic Core in Gate archway
    drawCircle(
        brush = Brush.radialGradient(
            colors = listOf(Color(0xFF38BDF8), Color(0x660284C7), Color.Transparent),
            center = Offset(cx, cy + 12f),
            radius = 12f
        ),
        radius = 12f,
        center = Offset(cx, cy + 12f)
    )
    drawCircle(color = Color(0xFFE0F2FE), radius = 3.5f, center = Offset(cx, cy + 12f))

    // 5. Heraldic Shield Crest on Castle Facade
    val shieldPath = Path().apply {
        moveTo(cx - 7f, cy - 24f)
        lineTo(cx + 7f, cy - 24f)
        lineTo(cx + 7f, cy - 14f)
        lineTo(cx, cy - 8f)
        lineTo(cx - 7f, cy - 14f)
        close()
    }
    drawPath(path = shieldPath, color = Color(0xFFDC2626))
    drawLine(color = Color(0xFFFBBF24), start = Offset(cx, cy - 24f), end = Offset(cx, cy - 8f), strokeWidth = 1.5f)
    drawLine(color = Color(0xFFFBBF24), start = Offset(cx - 7f, cy - 18f), end = Offset(cx + 7f, cy - 18f), strokeWidth = 1.5f)

    // 6. Realistic Twin Royal Pennant Flags
    // Left Flag
    drawLine(color = Color(0xFF94A3B8), start = Offset(cx - 40f, cy - 54f), end = Offset(cx - 40f, cy - 74f), strokeWidth = 2.5f)
    val leftFlag = Path().apply {
        moveTo(cx - 40f, cy - 74f)
        lineTo(cx - 20f, cy - 66f)
        lineTo(cx - 40f, cy - 58f)
        close()
    }
    drawPath(path = leftFlag, color = Color(0xFF2563EB))
    // Right Flag
    drawLine(color = Color(0xFF94A3B8), start = Offset(cx + 40f, cy - 54f), end = Offset(cx + 40f, cy - 74f), strokeWidth = 2.5f)
    val rightFlag = Path().apply {
        moveTo(cx + 40f, cy - 74f)
        lineTo(cx + 60f, cy - 66f)
        lineTo(cx + 40f, cy - 58f)
        close()
    }
    drawPath(path = rightFlag, color = Color(0xFFDC2626))

    // 7. Base Health Bar with Beveled Frame
    val barWidth = 84f
    val barHeight = 8f
    val barX = cx - barWidth / 2
    val barY = cy - 64f
    drawRoundRect(
        color = Color(0xD0000000),
        topLeft = Offset(barX - 1f, barY - 1f),
        size = Size(barWidth + 2f, barHeight + 2f),
        cornerRadius = androidx.compose.ui.geometry.CornerRadius(4f, 4f)
    )
    val healthRatio = (health.toFloat() / maxHealth.toFloat()).coerceIn(0f, 1f)
    val hpColor = when {
        healthRatio > 0.5f -> Color(0xFF22C55E)
        healthRatio > 0.25f -> Color(0xFFF59E0B)
        else -> Color(0xFFEF4444)
    }
    if (healthRatio > 0f) {
        drawRoundRect(
            brush = Brush.horizontalGradient(
                colors = listOf(hpColor.copy(alpha = 0.9f), hpColor),
                startX = barX,
                endX = barX + barWidth
            ),
            topLeft = Offset(barX, barY),
            size = Size(barWidth * healthRatio, barHeight),
            cornerRadius = androidx.compose.ui.geometry.CornerRadius(3.5f, 3.5f)
        )
    }
}

private fun DrawScope.drawPlatformsAndTowers(w: Float, h: Float, uiState: GameUiState) {
    for (platform in GameMap.platforms) {
        val px = platform.normalizedPos.x * w
        val py = platform.normalizedPos.y * h
        val tower = uiState.towers.firstOrNull { it.platformId == platform.id }
        val isSelected = uiState.selectedPlatformId == platform.id || (tower != null && uiState.selectedTower?.id == tower.id)
        val canBuild = tower == null && (isSelected || uiState.towerTypeToPlace != null)

        // 1. Platform Base Stone
        drawCircle(
            color = if (canBuild) Color(0xFF22C55E) else Color(0xFF475569),
            radius = 28f,
            center = Offset(px, py)
        )
        drawCircle(
            color = if (canBuild) Color(0xFF15803D) else Color(0xFF64748B),
            radius = 24f,
            center = Offset(px, py)
        )

        if (tower == null) {
            // Empty platform icon '+'
            drawLine(
                color = if (canBuild) Color.White else Color(0xFF94A3B8),
                start = Offset(px - 10f, py),
                end = Offset(px + 10f, py),
                strokeWidth = 3f,
                cap = StrokeCap.Round
            )
            drawLine(
                color = if (canBuild) Color.White else Color(0xFF94A3B8),
                start = Offset(px, py - 10f),
                end = Offset(px, py + 10f),
                strokeWidth = 3f,
                cap = StrokeCap.Round
            )

            // Pulsing build ring
            if (canBuild) {
                drawCircle(
                    color = Color(0x8822C55E),
                    radius = 34f,
                    center = Offset(px, py),
                    style = Stroke(width = 3f)
                )
            }
        } else {
            // Tower is placed!
            // Range circle if selected or building
            if (isSelected) {
                val rangePx = tower.range * w
                drawCircle(
                    color = tower.type.accentColor.copy(alpha = 0.22f),
                    radius = rangePx,
                    center = Offset(px, py)
                )
                drawCircle(
                    color = tower.type.primaryColor,
                    radius = rangePx,
                    center = Offset(px, py),
                    style = Stroke(width = 2.5f)
                )
            }

            // Tower Turret Body
            drawCircle(
                color = tower.type.primaryColor,
                radius = 20f,
                center = Offset(px, py)
            )

            // Inner core
            drawCircle(
                color = tower.type.accentColor,
                radius = 14f,
                center = Offset(px, py)
            )

            // Rotating Barrel
            rotate(degrees = tower.aimAngle, pivot = Offset(px, py)) {
                when (tower.type) {
                    TowerType.BASIC -> {
                        // Forward rectangular barrel
                        drawRect(
                            color = Color(0xFF0284C7),
                            topLeft = Offset(px + 2f, py - 4f),
                            size = Size(20f, 8f)
                        )
                        drawCircle(color = Color(0xFF38BDF8), radius = 5f, center = Offset(px, py))
                    }
                    TowerType.RAPID -> {
                        // Double gatling barrels
                        drawRect(
                            color = Color(0xFFD97706),
                            topLeft = Offset(px + 4f, py - 7f),
                            size = Size(18f, 5f)
                        )
                        drawRect(
                            color = Color(0xFFD97706),
                            topLeft = Offset(px + 4f, py + 2f),
                            size = Size(18f, 5f)
                        )
                    }
                    TowerType.CANNON -> {
                        // Chunky mortar barrel with dark muzzle
                        drawRect(
                            color = Color(0xFF991B1B),
                            topLeft = Offset(px + 2f, py - 7f),
                            size = Size(22f, 14f)
                        )
                        drawCircle(color = Color(0xFF1E293B), radius = 5f, center = Offset(px + 22f, py))
                    }
                    TowerType.ICE -> {
                        // Crystal ice spikes
                        drawCircle(color = Color(0xFF67E8F9), radius = 7f, center = Offset(px, py))
                        drawLine(
                            color = Color(0xFFA5F3FC),
                            start = Offset(px, py),
                            end = Offset(px + 20f, py),
                            strokeWidth = 5f,
                            cap = StrokeCap.Round
                        )
                    }
                }
            }

            // Tower Type Badge / Icon above tower
            val badgeY = py - 26f
            drawCircle(
                color = Color(0xEE0F172A),
                radius = 12f,
                center = Offset(px, badgeY)
            )
            drawCircle(
                color = tower.type.accentColor,
                radius = 12f,
                center = Offset(px, badgeY),
                style = Stroke(width = 1.8f)
            )

            // Render Tower Icon Emoji on top badge
            drawContext.canvas.nativeCanvas.apply {
                val iconPaint = Paint().apply {
                    isAntiAlias = true
                    textSize = 28f
                    textAlign = Paint.Align.CENTER
                }
                drawText(tower.type.iconEmoji, px, badgeY + 10f, iconPaint)
            }

            // Level Stars/Pips (Bottom of tower)
            val starCount = tower.level
            val pipSpacing = 10f
            val startPipX = px - ((starCount - 1) * pipSpacing) / 2
            for (s in 0 until starCount) {
                drawCircle(
                    color = Color(0xFFFDE047),
                    radius = 3.5f,
                    center = Offset(startPipX + s * pipSpacing, py + 14f)
                )
            }
        }
    }
}

private fun DrawScope.drawEnemies(w: Float, h: Float, enemies: List<Enemy>, waveNumber: Int = 1) {
    val costumeTier = (waveNumber - 1) / 5 // 0 = Normal, 1 = Tier 2 (Wave 5+), 2 = Tier 3 (Wave 10+)
    val hpTextPaint = Paint().apply {
        isAntiAlias = true
        textSize = 20f
        isFakeBoldText = true
        textAlign = Paint.Align.CENTER
        color = android.graphics.Color.WHITE
    }
    val hpShadowPaint = Paint().apply {
        isAntiAlias = true
        textSize = 20f
        isFakeBoldText = true
        textAlign = Paint.Align.CENTER
        color = android.graphics.Color.BLACK
    }

    for (enemy in enemies) {
        val ex = enemy.position.x * w
        val ey = enemy.position.y * h
        val radius = enemy.type.radiusDp * 1.5f
        val heading = enemy.headingAngle

        // 1. Realistic Drop Shadow
        drawOval(
            color = Color(0x66000000),
            topLeft = Offset(ex - radius * 1.1f, ey + radius * 0.4f),
            size = Size(radius * 2.2f, radius * 0.8f)
        )

        // 2. Slow Frost Aura
        if (enemy.isSlowed) {
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(Color(0x6638BDF8), Color(0x110284C7), Color.Transparent),
                    center = Offset(ex, ey),
                    radius = radius + 12f
                ),
                radius = radius + 12f,
                center = Offset(ex, ey)
            )
            drawCircle(
                color = Color(0xFFA5F3FC),
                radius = radius + 8f,
                center = Offset(ex, ey),
                style = Stroke(width = 2f)
            )
        }

        // 3. Realistic Creature Rendering oriented along heading direction
        rotate(degrees = heading, pivot = Offset(ex, ey)) {
            when (enemy.type) {
                EnemyType.NORMAL -> {
                    // Goblin Scout: Realistic goblin ears, leather armor, dagger, claws
                    // Ears
                    val earLeft = Path().apply {
                        moveTo(ex - radius * 0.2f, ey - radius * 0.9f)
                        lineTo(ex - radius * 1.3f, ey - radius * 1.1f)
                        lineTo(ex - radius * 0.6f, ey - radius * 0.3f)
                        close()
                    }
                    val earRight = Path().apply {
                        moveTo(ex - radius * 0.2f, ey + radius * 0.9f)
                        lineTo(ex - radius * 1.3f, ey + radius * 1.1f)
                        lineTo(ex - radius * 0.6f, ey + radius * 0.3f)
                        close()
                    }
                    drawPath(earLeft, Color(0xFF15803D))
                    drawPath(earRight, Color(0xFF15803D))

                    // Body
                    val goblinColors = if (costumeTier >= 1) {
                        listOf(Color(0xFF86EFAC), Color(0xFF15803D), Color(0xFF052E16)) // Elite Poison Goblin
                    } else {
                        listOf(Color(0xFF4ADE80), Color(0xFF16A34A), Color(0xFF14532D))
                    }
                    drawCircle(
                        brush = Brush.radialGradient(
                            colors = goblinColors,
                            center = Offset(ex - 2f, ey - 2f),
                            radius = radius
                        ),
                        radius = radius,
                        center = Offset(ex, ey)
                    )

                    // Armor vest (Evolves with costumeTier: Leather -> Iron Plate)
                    val vestColor = if (costumeTier >= 1) Color(0xFF475569) else Color(0xFF78350F)
                    drawRoundRect(
                        color = vestColor,
                        topLeft = Offset(ex - radius * 0.7f, ey - radius * 0.5f),
                        size = Size(radius * 1.1f, radius),
                        cornerRadius = androidx.compose.ui.geometry.CornerRadius(4f, 4f)
                    )

                    // Costume tier >= 1: Spiked Iron Helmet / Skullcap
                    if (costumeTier >= 1) {
                        drawArc(
                            color = Color(0xFF94A3B8),
                            startAngle = 180f,
                            sweepAngle = 180f,
                            useCenter = true,
                            topLeft = Offset(ex - radius * 0.6f, ey - radius * 0.7f),
                            size = Size(radius * 1.2f, radius * 0.9f)
                        )
                        // Horn spike
                        drawLine(
                            color = Color(0xFFE2E8F0),
                            start = Offset(ex, ey - radius * 0.7f),
                            end = Offset(ex, ey - radius * 1.2f),
                            strokeWidth = 3f,
                            cap = StrokeCap.Round
                        )
                    }

                    // Sharp menacing goblin eyes looking forward (towards +X in rotated frame)
                    drawCircle(color = Color(0xFFFEF08A), radius = 3.5f, center = Offset(ex + radius * 0.35f, ey - 5f))
                    drawCircle(color = Color(0xFFDC2626), radius = 1.8f, center = Offset(ex + radius * 0.45f, ey - 5f))
                    drawCircle(color = Color(0xFFFEF08A), radius = 3.5f, center = Offset(ex + radius * 0.35f, ey + 5f))
                    drawCircle(color = Color(0xFFDC2626), radius = 1.8f, center = Offset(ex + radius * 0.45f, ey + 5f))

                    // Snout / teeth
                    drawLine(
                        color = Color(0xFF14532D),
                        start = Offset(ex + radius * 0.6f, ey - 3f),
                        end = Offset(ex + radius * 0.6f, ey + 3f),
                        strokeWidth = 2f
                    )
                }
                EnemyType.FAST -> {
                    // Swift Runner: Sleek predatory beast / raptor hound with spines, aerodynamic carapace, visor glow
                    // Hind sprint legs
                    drawLine(
                        color = Color(0xFFB45309),
                        start = Offset(ex - radius * 0.5f, ey - radius * 0.9f),
                        end = Offset(ex - radius * 1.1f, ey - radius * 1.2f),
                        strokeWidth = 3f,
                        cap = StrokeCap.Round
                    )
                    drawLine(
                        color = Color(0xFFB45309),
                        start = Offset(ex - radius * 0.5f, ey + radius * 0.9f),
                        end = Offset(ex - radius * 1.1f, ey + radius * 1.2f),
                        strokeWidth = 3f,
                        cap = StrokeCap.Round
                    )

                    // Streamlined aerodynamic body with Costume Tier color swap (Golden -> Neon Cyber Shadow)
                    val runnerColors = if (costumeTier >= 1) {
                        listOf(Color(0xFFEC4899), Color(0xFFBE185D), Color(0xFF500724))
                    } else {
                        listOf(Color(0xFFFBBF24), Color(0xFFD97706), Color(0xFF92400E))
                    }
                    val houndBody = Path().apply {
                        moveTo(ex + radius * 1.2f, ey)
                        lineTo(ex - radius * 0.4f, ey - radius * 0.8f)
                        lineTo(ex - radius * 1.1f, ey)
                        lineTo(ex - radius * 0.4f, ey + radius * 0.8f)
                        close()
                    }
                    drawPath(
                        houndBody,
                        Brush.linearGradient(
                            colors = runnerColors,
                            start = Offset(ex + radius, ey),
                            end = Offset(ex - radius, ey)
                        )
                    )

                    // Costume Tier >= 1: Dorsal Blade Fins
                    if (costumeTier >= 1) {
                        val bladeFin = Path().apply {
                            moveTo(ex - radius * 0.5f, ey)
                            lineTo(ex - radius * 0.8f, ey - radius * 0.9f)
                            lineTo(ex - radius * 0.1f, ey)
                            close()
                        }
                        drawPath(bladeFin, Color(0xFF38BDF8))
                    }

                    // Cybernetic / Glowing predator optics
                    drawLine(
                        color = if (costumeTier >= 1) Color(0xFF38BDF8) else Color(0xFFEF4444),
                        start = Offset(ex + radius * 0.6f, ey - 4f),
                        end = Offset(ex + radius * 0.6f, ey + 4f),
                        strokeWidth = 3.5f,
                        cap = StrokeCap.Round
                    )
                    drawCircle(color = Color(0xFFFEE2E2), radius = 2f, center = Offset(ex + radius * 0.7f, ey))
                }
                EnemyType.TANK -> {
                    // Armored Golem: Heavy segmented obsidian & runic stone plates with glowing cracks
                    // Huge stone fists on sides
                    val fistColor = if (costumeTier >= 1) Color(0xFF1E293B) else Color(0xFF4C1D95)
                    drawCircle(
                        color = fistColor,
                        radius = radius * 0.45f,
                        center = Offset(ex + radius * 0.2f, ey - radius * 0.95f)
                    )
                    drawCircle(
                        color = fistColor,
                        radius = radius * 0.45f,
                        center = Offset(ex + radius * 0.2f, ey + radius * 0.95f)
                    )

                    // Massive reinforced boulder torso with Costume Tier (Obsidian -> Magma Core)
                    val tankColors = if (costumeTier >= 1) {
                        listOf(Color(0xFFFB923C), Color(0xFFC2410C), Color(0xFF431407))
                    } else {
                        listOf(Color(0xFFA78BFA), Color(0xFF6D28D9), Color(0xFF2E1065))
                    }
                    drawCircle(
                        brush = Brush.radialGradient(
                            colors = tankColors,
                            center = Offset(ex - 4f, ey - 4f),
                            radius = radius
                        ),
                        radius = radius,
                        center = Offset(ex, ey)
                    )

                    // Heavy iron spikes on back
                    drawRect(
                        color = Color(0xFF1E1B4B),
                        topLeft = Offset(ex - radius * 0.8f, ey - radius * 0.5f),
                        size = Size(radius * 0.5f, radius)
                    )

                    // Runic glowing eye slit
                    drawLine(
                        color = if (costumeTier >= 1) Color(0xFFFEF08A) else Color(0xFFFDE047),
                        start = Offset(ex + radius * 0.4f, ey - 6f),
                        end = Offset(ex + radius * 0.4f, ey + 6f),
                        strokeWidth = 4f,
                        cap = StrokeCap.Round
                    )
                    drawCircle(color = Color.White, radius = 2.5f, center = Offset(ex + radius * 0.4f, ey))
                }
                EnemyType.BOSS -> {
                    // Titan Overlord: Dark demon lord with demonic horns, fiery glowing wing ridges, molten core
                    // Giant Horns
                    val hornL = Path().apply {
                        moveTo(ex + radius * 0.3f, ey - radius * 0.6f)
                        lineTo(ex + radius * 0.9f, ey - radius * 1.4f)
                        lineTo(ex - radius * 0.2f, ey - radius * 0.9f)
                        close()
                    }
                    val hornR = Path().apply {
                        moveTo(ex + radius * 0.3f, ey + radius * 0.6f)
                        lineTo(ex + radius * 0.9f, ey + radius * 1.4f)
                        lineTo(ex - radius * 0.2f, ey + radius * 0.9f)
                        close()
                    }
                    drawPath(hornL, if (costumeTier >= 1) Color(0xFF7F1D1D) else Color(0xFF450A0A))
                    drawPath(hornR, if (costumeTier >= 1) Color(0xFF7F1D1D) else Color(0xFF450A0A))

                    // Costume Tier >= 1: Flaming Demon Crown
                    if (costumeTier >= 1) {
                        drawCircle(
                            color = Color(0xFFFDE047),
                            radius = radius * 0.35f,
                            center = Offset(ex - radius * 0.4f, ey),
                            style = Stroke(width = 3f)
                        )
                    }

                    // Fiery Aura
                    drawCircle(
                        brush = Brush.radialGradient(
                            colors = listOf(Color(0x99EF4444), Color(0x33DC2626), Color.Transparent),
                            center = Offset(ex, ey),
                            radius = radius * 1.4f
                        ),
                        radius = radius * 1.4f,
                        center = Offset(ex, ey)
                    )

                    // Demon Titan Core Body
                    drawCircle(
                        brush = Brush.radialGradient(
                            colors = listOf(Color(0xFFF87171), Color(0xFFB91C1C), Color(0xFF450A0A)),
                            center = Offset(ex - 6f, ey - 6f),
                            radius = radius
                        ),
                        radius = radius,
                        center = Offset(ex, ey)
                    )

                    // Molten Chest Core
                    drawCircle(color = Color(0xFFFEF08A), radius = radius * 0.35f, center = Offset(ex, ey))
                    drawCircle(color = Color(0xFFF97316), radius = radius * 0.22f, center = Offset(ex, ey))

                    // Dual burning eyes
                    drawCircle(color = Color(0xFFFEF08A), radius = 4f, center = Offset(ex + radius * 0.55f, ey - 7f))
                    drawCircle(color = Color(0xFFFEF08A), radius = 4f, center = Offset(ex + radius * 0.55f, ey + 7f))
                }
            }
        }

        // 4. Realistic Health Bar with Border, Gradient, and Numerical HP
        val barW = (radius * 2.4f).coerceAtLeast(42f)
        val barH = 7f
        val bx = ex - barW / 2
        val by = ey - radius - 14f

        // Bar container background
        drawRoundRect(
            color = Color(0xD00B0F19),
            topLeft = Offset(bx - 1f, by - 1f),
            size = Size(barW + 2f, barH + 2f),
            cornerRadius = androidx.compose.ui.geometry.CornerRadius(3f, 3f)
        )
        // Background track
        drawRoundRect(
            color = Color(0xFF1E293B),
            topLeft = Offset(bx, by),
            size = Size(barW, barH),
            cornerRadius = androidx.compose.ui.geometry.CornerRadius(2.5f, 2.5f)
        )

        val hpPct = (enemy.currentHp / enemy.maxHp).coerceIn(0f, 1f)
        val hpGradient = when {
            hpPct > 0.55f -> listOf(Color(0xFF4ADE80), Color(0xFF16A34A))
            hpPct > 0.25f -> listOf(Color(0xFFFDE047), Color(0xFFCA8A04))
            else -> listOf(Color(0xFFF87171), Color(0xFFDC2626))
        }

        if (hpPct > 0f) {
            drawRoundRect(
                brush = Brush.horizontalGradient(
                    colors = hpGradient,
                    startX = bx,
                    endX = bx + barW
                ),
                topLeft = Offset(bx, by),
                size = Size(barW * hpPct, barH),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(2.5f, 2.5f)
            )
        }

        // Numerical HP Badge above health bar for clarity and realistic feedback
        val hpText = "${enemy.currentHp.toInt()} / ${enemy.maxHp.toInt()}"
        drawContext.canvas.nativeCanvas.apply {
            drawText(hpText, ex + 1f, by - 4f + 1f, hpShadowPaint)
            drawText(hpText, ex, by - 4f, hpTextPaint)
        }
    }
}

private fun DrawScope.drawProjectiles(w: Float, h: Float, projectiles: List<Projectile>) {
    for (proj in projectiles) {
        val px = proj.currentPos.x * w
        val py = proj.currentPos.y * h
        val dirX = proj.targetPos.x - proj.currentPos.x
        val dirY = proj.targetPos.y - proj.currentPos.y
        val angle = Math.toDegrees(atan2(dirY.toDouble(), dirX.toDouble())).toFloat()

        when (proj.type) {
            TowerType.BASIC -> {
                // High-velocity armor piercing tracer dart with glowing plasma trail
                rotate(degrees = angle, pivot = Offset(px, py)) {
                    // Tracer tail
                    drawLine(
                        brush = Brush.horizontalGradient(
                            colors = listOf(Color.Transparent, Color(0x880284C7), Color(0xFF38BDF8)),
                            startX = px - 18f,
                            endX = px + 4f
                        ),
                        start = Offset(px - 18f, py),
                        end = Offset(px + 4f, py),
                        strokeWidth = 3f,
                        cap = StrokeCap.Round
                    )
                    // Bullet core (Aerodynamic dart)
                    val dartPath = Path().apply {
                        moveTo(px + 6f, py)
                        lineTo(px - 4f, py - 2.5f)
                        lineTo(px - 4f, py + 2.5f)
                        close()
                    }
                    drawPath(dartPath, color = Color(0xFFE0F2FE))
                    drawCircle(color = Color.White, radius = 2f, center = Offset(px + 2f, py))
                }
            }
            TowerType.RAPID -> {
                // Laser beam energy pulse (needle beam with heat core)
                rotate(degrees = angle, pivot = Offset(px, py)) {
                    // Outer glow
                    drawLine(
                        color = Color(0x66F59E0B),
                        start = Offset(px - 14f, py),
                        end = Offset(px + 8f, py),
                        strokeWidth = 5f,
                        cap = StrokeCap.Round
                    )
                    // Superheated core
                    drawLine(
                        color = Color(0xFFFEF08A),
                        start = Offset(px - 10f, py),
                        end = Offset(px + 6f, py),
                        strokeWidth = 2.5f,
                        cap = StrokeCap.Round
                    )
                    drawCircle(color = Color.White, radius = 2f, center = Offset(px + 5f, py))
                }
            }
            TowerType.CANNON -> {
                // Heavy ballistic mortar shell with iron body, copper driving band, and burning fuse spark
                rotate(degrees = angle, pivot = Offset(px, py)) {
                    // Smoke & fire propulsion trail
                    drawCircle(color = Color(0x55F97316), radius = 6f, center = Offset(px - 10f, py))
                    drawCircle(color = Color(0x4464748B), radius = 4f, center = Offset(px - 16f, py))

                    // Shell casing (Artillery projectile)
                    val shell = Path().apply {
                        moveTo(px + 8f, py)
                        lineTo(px + 2f, py - 4.5f)
                        lineTo(px - 7f, py - 4.5f)
                        lineTo(px - 7f, py + 4.5f)
                        lineTo(px + 2f, py + 4.5f)
                        close()
                    }
                    drawPath(
                        path = shell,
                        brush = Brush.verticalGradient(
                            colors = listOf(Color(0xFF64748B), Color(0xFF1E293B)),
                            startY = py - 4.5f,
                            endY = py + 4.5f
                        )
                    )
                    // Copper driving band
                    drawRect(color = Color(0xFFD97706), topLeft = Offset(px - 4f, py - 4.5f), size = Size(2.5f, 9f))
                    // Red-hot incendiary nosecone
                    drawCircle(color = Color(0xFFEF4444), radius = 2.5f, center = Offset(px + 5f, py))
                }
            }
            TowerType.ICE -> {
                // Crystalline Cryo-Icicle with sparkling ice facets and frosty mist
                rotate(degrees = angle, pivot = Offset(px, py)) {
                    // Frost trail
                    drawCircle(color = Color(0x4467E8F9), radius = 5f, center = Offset(px - 8f, py))

                    // Diamond icicle shard
                    val icicle = Path().apply {
                        moveTo(px + 9f, py)
                        lineTo(px, py - 3.5f)
                        lineTo(px - 8f, py)
                        lineTo(px, py + 3.5f)
                        close()
                    }
                    drawPath(
                        path = icicle,
                        brush = Brush.horizontalGradient(
                            colors = listOf(Color(0xFF06B6D4), Color(0xFFA5F3FC), Color.White),
                            startX = px - 8f,
                            endX = px + 9f
                        )
                    )
                    // Central glint
                    drawLine(
                        color = Color.White,
                        start = Offset(px - 4f, py),
                        end = Offset(px + 6f, py),
                        strokeWidth = 1.2f
                    )
                }
            }
        }
    }
}

private fun DrawScope.drawParticles(w: Float, h: Float, particles: List<Particle>) {
    for (p in particles) {
        drawCircle(
            color = p.color.copy(alpha = p.alpha),
            radius = p.size * p.alpha,
            center = Offset(p.pos.x * w, p.pos.y * h)
        )
    }
}

private fun DrawScope.drawFloatingTexts(w: Float, h: Float, texts: List<FloatingText>) {
    val paint = Paint().apply {
        isAntiAlias = true
        textSize = 34f
        isFakeBoldText = true
        textAlign = Paint.Align.CENTER
    }

    val shadowPaint = Paint().apply {
        isAntiAlias = true
        textSize = 34f
        isFakeBoldText = true
        textAlign = Paint.Align.CENTER
        color = android.graphics.Color.argb((180).toInt(), 0, 0, 0)
    }

    drawContext.canvas.nativeCanvas.apply {
        for (t in texts) {
            val tx = t.pos.x * w
            val ty = t.pos.y * h
            val alphaInt = (t.alpha * 255).toInt().coerceIn(0, 255)

            // Outline / Shadow
            shadowPaint.alpha = (t.alpha * 200).toInt().coerceIn(0, 255)
            drawText(t.text, tx + 2f, ty + 2f, shadowPaint)

            // Main Text
            paint.color = android.graphics.Color.argb(
                alphaInt,
                (t.color.red * 255).toInt(),
                (t.color.green * 255).toInt(),
                (t.color.blue * 255).toInt()
            )
            drawText(t.text, tx, ty, paint)
        }
    }
}
