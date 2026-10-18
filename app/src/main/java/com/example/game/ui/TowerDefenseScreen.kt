package com.example.game.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.game.model.GameStatus
import com.example.game.viewmodel.TowerDefenseViewModel

@Composable
fun TowerDefenseScreen(
    viewModel: TowerDefenseViewModel,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFF0F172A))
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            // 1. TOP GAME HUD
            TopGameHud(
                baseHealth = uiState.baseHealth,
                maxBaseHealth = uiState.maxBaseHealth,
                coins = uiState.coins,
                score = uiState.score,
                highScore = uiState.highScore,
                waveNumber = uiState.waveNumber,
                maxWaves = uiState.maxCampaignWaves,
                isEndless = uiState.isEndlessMode,
                isPaused = uiState.isPaused,
                gameSpeed = uiState.gameSpeed,
                isSoundEnabled = uiState.isSoundEnabled,
                onOpenMenu = viewModel::openStartMenu,
                onTogglePause = viewModel::togglePause,
                onToggleSpeed = viewModel::toggleSpeed,
                onToggleSound = viewModel::toggleSound
            )

            // 2. BATTLEFIELD CANVAS
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
            ) {
                GameCanvas(
                    uiState = uiState,
                    onPlatformClick = viewModel::selectPlatform,
                    onBackgroundClick = viewModel::deselectAll,
                    modifier = Modifier.fillMaxSize()
                )

                // Placement Banner overlay
                if (uiState.towerTypeToPlace != null) {
                    val tower = uiState.towerTypeToPlace!!
                    Surface(
                        modifier = Modifier
                            .align(Alignment.TopCenter)
                            .padding(top = 10.dp)
                            .testTag("placement_banner"),
                        shape = RoundedCornerShape(20.dp),
                        color = Color(0xFF0F172A).copy(alpha = 0.92f),
                        border = androidx.compose.foundation.BorderStroke(1.5.dp, tower.primaryColor)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(text = tower.iconEmoji, fontSize = 16.sp)
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "Tap any green (+) platform to place ${tower.displayName} (${tower.baseCost}¢)",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = Color.White
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            IconButton(
                                onClick = { viewModel.selectTowerTypeToPlace(null) },
                                modifier = Modifier.size(24.dp)
                            ) {
                                Icon(Icons.Default.Close, contentDescription = "Cancel", tint = Color.LightGray)
                            }
                        }
                    }
                }

                // Wave Start Banner (Shows for 1 second, then hides)
                if (uiState.waveStartBannerTimer > 0f) {
                    Surface(
                        modifier = Modifier
                            .align(Alignment.Center)
                            .testTag("wave_start_banner"),
                        shape = RoundedCornerShape(18.dp),
                        color = Color(0xEE0F172A),
                        border = androidx.compose.foundation.BorderStroke(2.dp, Color(0xFF38BDF8)),
                        shadowElevation = 16.dp
                    ) {
                        Column(
                            modifier = Modifier.padding(horizontal = 28.dp, vertical = 14.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                text = "⚔️ WAVE ${uiState.waveStartBannerWave} STARTED!",
                                fontSize = 20.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = Color(0xFF38BDF8),
                                letterSpacing = 1.sp
                            )
                            Text(
                                text = "Defend the realm!",
                                fontSize = 12.sp,
                                color = Color.White
                            )
                        }
                    }
                }

                // Wave Complete Banner (Shows for 1 second, then hides)
                if (uiState.waveCompleteBannerTimer > 0f) {
                    Surface(
                        modifier = Modifier
                            .align(Alignment.Center)
                            .testTag("wave_complete_banner"),
                        shape = RoundedCornerShape(18.dp),
                        color = Color(0xEE0F172A),
                        border = androidx.compose.foundation.BorderStroke(2.dp, Color(0xFF10B981)),
                        shadowElevation = 16.dp
                    ) {
                        Column(
                            modifier = Modifier.padding(horizontal = 28.dp, vertical = 14.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                text = "🏆 WAVE ${uiState.waveCompleteBannerWave} COMPLETE!",
                                fontSize = 20.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = Color(0xFF4ADE80),
                                letterSpacing = 1.sp
                            )
                            Text(
                                text = "Bonus coins awarded!",
                                fontSize = 12.sp,
                                color = Color(0xFFFEF08A)
                            )
                        }
                    }
                }

                // Wave notification / pause banner
                if (uiState.isPaused) {
                    Surface(
                        modifier = Modifier.align(Alignment.Center),
                        shape = RoundedCornerShape(16.dp),
                        color = Color(0xEE0F172A),
                        border = androidx.compose.foundation.BorderStroke(1.5.dp, Color(0xFFFBBF24))
                    ) {
                        Text(
                            text = "⏸️ GAME PAUSED",
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFFFBBF24),
                            modifier = Modifier.padding(horizontal = 24.dp, vertical = 14.dp)
                        )
                    }
                }
            }

            // 3. TOWER INSPECTION PANEL (if tower selected)
            AnimatedVisibility(
                visible = uiState.selectedTower != null,
                enter = slideInVertically { it } + fadeIn(),
                exit = slideOutVertically { it } + fadeOut()
            ) {
                uiState.selectedTower?.let { tower ->
                    TowerDetailPanel(
                        tower = tower,
                        playerCoins = uiState.coins,
                        onUpgrade = { viewModel.upgradeTower(tower.id) },
                        onSell = { viewModel.sellTower(tower.id) },
                        onClose = viewModel::deselectAll
                    )
                }
            }

            // 4. BOTTOM ACTION CONTROLS
            BottomActionBar(
                gameStatus = uiState.gameStatus,
                waveNumber = uiState.waveNumber,
                enemiesRemaining = uiState.enemiesRemainingInWave,
                onStartWave = viewModel::startWave,
                onOpenShop = viewModel::openShop,
                onOpenInstructions = viewModel::openInstructions
            )
        }

        // Modals / Dialogs
        if (uiState.showShopDialog) {
            ShopDialog(
                playerCoins = uiState.coins,
                selectedPlatformId = uiState.selectedPlatformId,
                onSelectTowerType = { type ->
                    viewModel.selectTowerTypeToPlace(type)
                    viewModel.closeShop()
                },
                onDismiss = viewModel::closeShop
            )
        }

        if (uiState.showInstructionsDialog) {
            InstructionsDialog(onDismiss = viewModel::closeInstructions)
        }

        if (uiState.showGameOverDialog) {
            GameOverDialog(
                waveReached = uiState.waveNumber,
                score = uiState.score,
                highScore = uiState.highScore,
                enemiesKilled = uiState.enemiesDefeatedTotal,
                onRetry = {
                    viewModel.restartGame()
                }
            )
        }

        if (uiState.showStartMenu) {
            StartMenuDialog(
                highScore = uiState.highScore,
                currentDifficulty = uiState.difficulty,
                onStartDifficulty = { difficulty ->
                    viewModel.startGameWithDifficulty(difficulty)
                },
                onHowToPlay = {
                    viewModel.openInstructions()
                }
            )
        }

        if (uiState.showVictoryDialog) {
            VictoryDialog(
                score = uiState.score,
                baseHealthRemaining = uiState.baseHealth,
                maxBaseHealth = uiState.maxBaseHealth,
                enemiesKilled = uiState.enemiesDefeatedTotal,
                onPlayAgain = viewModel::restartGame,
                onContinueEndless = viewModel::continueEndlessMode
            )
        }
    }
}

@Composable
private fun TopGameHud(
    baseHealth: Int,
    maxBaseHealth: Int,
    coins: Int,
    score: Int,
    highScore: Int,
    waveNumber: Int,
    maxWaves: Int,
    isEndless: Boolean,
    isPaused: Boolean,
    gameSpeed: Float,
    isSoundEnabled: Boolean,
    onOpenMenu: () -> Unit,
    onTogglePause: () -> Unit,
    onToggleSpeed: () -> Unit,
    onToggleSound: () -> Unit
) {
    Surface(
        color = Color(0xFF0F172A),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF1E293B)),
        modifier = Modifier
            .fillMaxWidth()
            .statusBarsPadding()
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 6.dp)
        ) {
            // Row 1: Title and Utility Controls
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(
                        onClick = onOpenMenu,
                        modifier = Modifier
                            .size(32.dp)
                            .testTag("menu_button")
                    ) {
                        Text(text = "🏰", fontSize = 18.sp)
                    }
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "TOWER DEFENSE",
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 14.sp,
                        color = Color.White,
                        letterSpacing = 0.5.sp
                    )
                }

                Row(
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Menu Button
                    IconButton(
                        onClick = onOpenMenu,
                        modifier = Modifier
                            .size(34.dp)
                            .testTag("top_menu_button")
                    ) {
                        Icon(Icons.Default.Menu, contentDescription = "Menu", tint = Color.LightGray, modifier = Modifier.size(20.dp))
                    }

                    // Sound Button
                    IconButton(
                        onClick = onToggleSound,
                        modifier = Modifier
                            .size(34.dp)
                            .testTag("sound_button")
                    ) {
                        Text(text = if (isSoundEnabled) "🔊" else "🔇", fontSize = 16.sp)
                    }

                    // Speed Button (1x / 2x)
                    IconButton(
                        onClick = onToggleSpeed,
                        modifier = Modifier
                            .size(34.dp)
                            .background(
                                if (gameSpeed > 1f) Color(0xFF8B5CF6).copy(alpha = 0.3f) else Color.Transparent,
                                CircleShape
                            )
                            .testTag("speed_button")
                    ) {
                        Text(
                            text = if (gameSpeed > 1f) "2x⚡" else "1x",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (gameSpeed > 1f) Color(0xFFA78BFA) else Color(0xFF94A3B8)
                        )
                    }

                    // Pause Button
                    IconButton(
                        onClick = onTogglePause,
                        modifier = Modifier
                            .size(34.dp)
                            .testTag("pause_button")
                    ) {
                        Icon(
                            if (isPaused) Icons.Default.PlayArrow else Icons.Default.Pause,
                            contentDescription = if (isPaused) "Resume" else "Pause",
                            tint = Color.LightGray,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            // Row 2: Status Badges (Health, Coins, Wave, Score)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Base Health Badge
                HudChip(
                    emoji = "❤️",
                    value = "$baseHealth/$maxBaseHealth",
                    valueColor = if (baseHealth > 7) Color(0xFFEF4444) else Color(0xFFDC2626),
                    testTag = "hud_health"
                )

                // Coins Badge
                HudChip(
                    emoji = "💰",
                    value = "$coins",
                    valueColor = Color(0xFFFBBF24),
                    testTag = "hud_coins"
                )

                // Wave Badge
                HudChip(
                    emoji = "🌊",
                    value = if (isEndless) "Wave $waveNumber (∞)" else "W$waveNumber/$maxWaves",
                    valueColor = Color(0xFF38BDF8),
                    testTag = "hud_wave"
                )

                // Score Badge
                HudChip(
                    emoji = "🏆",
                    value = "$score",
                    valueColor = Color(0xFF4ADE80),
                    testTag = "hud_score"
                )
            }
        }
    }
}

@Composable
private fun HudChip(emoji: String, value: String, valueColor: Color, testTag: String) {
    Surface(
        color = Color(0xFF1E293B),
        shape = RoundedCornerShape(8.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF334155)),
        modifier = Modifier.testTag(testTag)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(text = emoji, fontSize = 13.sp)
            Spacer(modifier = Modifier.width(4.dp))
            Text(
                text = value,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = valueColor
            )
        }
    }
}

@Composable
private fun BottomActionBar(
    gameStatus: GameStatus,
    waveNumber: Int,
    enemiesRemaining: Int,
    onStartWave: () -> Unit,
    onOpenShop: () -> Unit,
    onOpenInstructions: () -> Unit
) {
    Surface(
        color = Color(0xFF0F172A),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF1E293B)),
        modifier = Modifier
            .fillMaxWidth()
            .navigationBarsPadding()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // INSTRUCTIONS Button
            OutlinedButton(
                onClick = onOpenInstructions,
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFF38BDF8)),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF38BDF8).copy(alpha = 0.6f)),
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 12.dp),
                modifier = Modifier.testTag("instructions_button")
            ) {
                Text(text = "📖", fontSize = 16.sp)
                Spacer(modifier = Modifier.width(4.dp))
                Text(text = "GUIDE", fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }

            // SHOP Button
            Button(
                onClick = onOpenShop,
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF59E0B)),
                contentPadding = PaddingValues(horizontal = 14.dp, vertical = 12.dp),
                modifier = Modifier.testTag("shop_button")
            ) {
                Text(text = "🛒", fontSize = 16.sp)
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = "SHOP",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF0F172A)
                )
            }

            // START WAVE Button
            val isWaveActive = gameStatus == GameStatus.WAVE_ACTIVE
            Button(
                onClick = onStartWave,
                enabled = !isWaveActive,
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFF10B981),
                    disabledContainerColor = Color(0xFF1E293B)
                ),
                contentPadding = PaddingValues(horizontal = 14.dp, vertical = 12.dp),
                modifier = Modifier
                    .weight(1f)
                    .testTag("start_wave_button")
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Text(
                        text = if (isWaveActive) "👾" else "⚔️",
                        fontSize = 16.sp
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = if (isWaveActive) {
                            "DEFENDING ($enemiesRemaining)"
                        } else {
                            "START WAVE $waveNumber"
                        },
                        fontSize = 13.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = if (isWaveActive) Color(0xFF94A3B8) else Color.White
                    )
                }
            }
        }
    }
}
