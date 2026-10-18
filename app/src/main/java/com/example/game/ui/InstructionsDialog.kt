package com.example.game.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog

@Composable
fun InstructionsDialog(onDismiss: () -> Unit) {
    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(6.dp),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
            border = androidx.compose.foundation.BorderStroke(1.5.dp, Color(0xFF38BDF8))
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(18.dp)
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(text = "📖", fontSize = 24.sp)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "How to Play",
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    }

                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Close", tint = Color.LightGray)
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f, fill = false),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    item {
                        InstructionSection(
                            title = "🏰 MISSION GOAL",
                            content = "Enemies spawn from the mystical portal and march along the stone path toward your Castle Base. Protect your base health (❤️) by building towers along the route! Defeat all 10 enemy waves to win the battle."
                        )
                    }

                    item {
                        InstructionSection(
                            title = "🔫 PLACING & UPGRADING TOWERS",
                            content = "• Tap an empty stone platform (+) or open the SHOP to select a tower.\n• Towers automatically target and fire at nearby enemies.\n• Tap any placed tower to inspect stats, upgrade levels (up to Tier 3 ⭐⭐⭐), or sell for coin refunds."
                        )
                    }

                    item {
                        Text(
                            text = "⚡ DEFENSIVE TOWERS",
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            color = Color(0xFFFBBF24)
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            TowerGuideCard("🎯 Basic Turret (100¢)", "Balanced damage and firing range. Great starter defense.", Color(0xFF0EA5E9))
                            TowerGuideCard("⚡ Rapid Laser (150¢)", "Super-fast fire rate. Shreds fast runner swarms.", Color(0xFFF59E0B))
                            TowerGuideCard("💣 Heavy Cannon (200¢)", "Explosive mortar shells dealing Area-of-Effect splash damage.", Color(0xFFEF4444))
                            TowerGuideCard("❄️ Ice Blaster (175¢)", "Freezes targets, slowing movement by 50% so other towers can obliterate them.", Color(0xFF06B6D4))
                        }
                    }

                    item {
                        Text(
                            text = "👾 ENEMY FACTIONS",
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            color = Color(0xFFF43F5E)
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            EnemyGuideCard("👾 Goblin Scout", "Standard health and speed. Yields 15 coins.", Color(0xFF22C55E))
                            EnemyGuideCard("🏃 Swift Runner", "Very fast speed! Vulnerable to Rapid and Ice towers.", Color(0xFFF59E0B))
                            EnemyGuideCard("🛡️ Armored Golem", "Heavy health pool. Takes 3 base lives if breached!", Color(0xFF8B5CF6))
                            EnemyGuideCard("👑 Titan Overlord", "Colossal boss with massive HP. Appears on Wave 5 & 10!", Color(0xFFEF4444))
                        }
                    }

                    item {
                        InstructionSection(
                            title = "💡 BATTLE STRATEGY TIPS",
                            content = "1. Place Ice Blasters at the corners to slow down waves in Cannon splash zones.\n2. Upgrade towers rather than spamming weak ones for higher DPS.\n3. Defeating enemies rewards coins (💰) to reinforce defenses before the next wave starts."
                        )
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                Button(
                    onClick = onDismiss,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0284C7))
                ) {
                    Text(text = "GOT IT, COMMANDER!", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                }
            }
        }
    }
}

@Composable
private fun InstructionSection(title: String, content: String) {
    Surface(
        color = Color(0xFF1E293B),
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(text = title, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF38BDF8))
            Spacer(modifier = Modifier.height(4.dp))
            Text(text = content, fontSize = 12.sp, color = Color(0xFFCBD5E1), lineHeight = 18.sp)
        }
    }
}

@Composable
private fun TowerGuideCard(title: String, desc: String, color: Color) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(Color(0xFF1E293B))
            .border(1.dp, color.copy(alpha = 0.4f), RoundedCornerShape(8.dp))
            .padding(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(10.dp)
                .background(color, RoundedCornerShape(2.dp))
        )
        Spacer(modifier = Modifier.width(8.dp))
        Column {
            Text(text = title, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Color.White)
            Text(text = desc, fontSize = 11.sp, color = Color(0xFF94A3B8))
        }
    }
}

@Composable
private fun EnemyGuideCard(title: String, desc: String, color: Color) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(Color(0xFF1E293B))
            .border(1.dp, color.copy(alpha = 0.4f), RoundedCornerShape(8.dp))
            .padding(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(10.dp)
                .background(color, RoundedCornerShape(5.dp))
        )
        Spacer(modifier = Modifier.width(8.dp))
        Column {
            Text(text = title, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Color.White)
            Text(text = desc, fontSize = 11.sp, color = Color(0xFF94A3B8))
        }
    }
}
