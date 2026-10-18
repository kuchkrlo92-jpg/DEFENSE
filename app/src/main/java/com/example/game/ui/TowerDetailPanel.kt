package com.example.game.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.game.model.Tower

@Composable
fun TowerDetailPanel(
    tower: Tower,
    playerCoins: Int,
    onUpgrade: () -> Unit,
    onSell: () -> Unit,
    onClose: () -> Unit,
    modifier: Modifier = Modifier
) {
    val canUpgrade = !tower.isMaxLevel && playerCoins >= tower.upgradeCost

    Card(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 6.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A).copy(alpha = 0.95f)),
        border = androidx.compose.foundation.BorderStroke(1.5.dp, tower.type.primaryColor)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp)
        ) {
            // Header Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(38.dp)
                            .background(tower.type.primaryColor.copy(alpha = 0.25f), RoundedCornerShape(8.dp))
                            .border(1.dp, tower.type.primaryColor, RoundedCornerShape(8.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(text = tower.type.iconEmoji, fontSize = 20.sp)
                    }

                    Spacer(modifier = Modifier.width(10.dp))

                    Column {
                        Text(
                            text = tower.type.displayName,
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp,
                            color = Color.White
                        )
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = "Tier ${tower.level}/3  ",
                                fontSize = 12.sp,
                                color = Color(0xFF94A3B8)
                            )
                            repeat(tower.level) {
                                Text(text = "⭐", fontSize = 11.sp)
                            }
                        }
                    }
                }

                IconButton(onClick = onClose, modifier = Modifier.size(32.dp)) {
                    Icon(Icons.Default.Close, contentDescription = "Close", tint = Color.LightGray)
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Current Stats Grid
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                StatCard(
                    title = "DAMAGE",
                    current = tower.damage.toInt().toString(),
                    next = if (!tower.isMaxLevel) tower.type.damageForLevel(tower.level + 1).toInt().toString() else null
                )
                StatCard(
                    title = "FIRE RATE",
                    current = "${String.format("%.2f", 1f / tower.fireInterval)}/s",
                    next = if (!tower.isMaxLevel) "${String.format("%.2f", 1f / tower.type.fireIntervalForLevel(tower.level + 1))}/s" else null
                )
                StatCard(
                    title = "SPECIAL",
                    current = when {
                        tower.type.splashRadius > 0f -> "AOE Blast"
                        tower.type.slowsEnemy -> "50% Slow"
                        else -> "Direct Hit"
                    },
                    next = null
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Actions: Upgrade & Sell
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Sell Button
                OutlinedButton(
                    onClick = onSell,
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFEF4444)),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFEF4444).copy(alpha = 0.6f)),
                    contentPadding = PaddingValues(vertical = 8.dp)
                ) {
                    Icon(Icons.Default.Delete, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "Sell (+${tower.sellRefund}¢)",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }

                // Upgrade Button
                Button(
                    onClick = onUpgrade,
                    enabled = canUpgrade,
                    modifier = Modifier.weight(1.3f),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFF10B981),
                        disabledContainerColor = Color(0xFF334155)
                    ),
                    contentPadding = PaddingValues(vertical = 8.dp)
                ) {
                    Icon(Icons.Default.KeyboardArrowUp, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = if (tower.isMaxLevel) "MAX LEVEL" else "Upgrade (${tower.upgradeCost}¢)",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (canUpgrade) Color.White else Color(0xFF94A3B8)
                    )
                }
            }
        }
    }
}

@Composable
private fun RowScope.StatCard(title: String, current: String, next: String?) {
    Surface(
        modifier = Modifier.weight(1f).padding(horizontal = 2.dp),
        color = Color(0xFF1E293B),
        shape = RoundedCornerShape(8.dp)
    ) {
        Column(
            modifier = Modifier.padding(6.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(text = title, fontSize = 9.sp, color = Color(0xFF94A3B8), fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(2.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(text = current, fontSize = 12.sp, color = Color.White, fontWeight = FontWeight.Bold)
                if (next != null) {
                    Text(text = " → $next", fontSize = 10.sp, color = Color(0xFF34D399), fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
