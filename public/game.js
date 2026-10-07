// ==========================================
// VERTICAL TOWER DEFENSE GAME ENGINE (9:16)
// ==========================================

(function() {
  'use strict';

  // --- COMPREHENSIVE AUDIO SYNTHESIS ENGINE (Web Audio API) ---
  class SoundManager {
    constructor() {
      this.ctx = null;
      this.masterGain = null;
      this.sfxGain = null;
      this.musicGain = null;

      const savedMaster = localStorage.getItem('vtd_master_volume');
      const savedMusic = localStorage.getItem('vtd_music_volume');
      const savedSfx = localStorage.getItem('vtd_sfx_volume');
      const savedMute = localStorage.getItem('vtd_muted');

      this.masterVolume = savedMaster !== null ? Math.max(0, Math.min(1, parseFloat(savedMaster))) : 0.70;
      this.musicVolume = savedMusic !== null ? Math.max(0, Math.min(1, parseFloat(savedMusic))) : 0.80;
      this.sfxVolume = savedSfx !== null ? Math.max(0, Math.min(1, parseFloat(savedSfx))) : 0.85;
      this.isMuted = savedMute === 'true';

      this.musicTimer = null;
      this.currentTrackType = null;
      this.lastPlayTimes = {};
    }

    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
          
          this.masterGain = this.ctx.createGain();
          this.sfxGain = this.ctx.createGain();
          this.musicGain = this.ctx.createGain();

          this.sfxGain.connect(this.masterGain);
          this.musicGain.connect(this.masterGain);
          this.masterGain.connect(this.ctx.destination);

          this.updateGains();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      if (this.ctx) {
        this.updateGains();
      }
    }

    updateGains() {
      if (!this.ctx || !this.masterGain) return;
      const effectiveMaster = this.isMuted ? 0 : this.masterVolume;
      const now = this.ctx.currentTime;
      this.masterGain.gain.setValueAtTime(effectiveMaster, now);
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, now);
      this.musicGain.gain.setValueAtTime(this.musicVolume, now);
    }

    setMasterVolume(val) {
      this.masterVolume = Math.max(0, Math.min(1, val));
      localStorage.setItem('vtd_master_volume', this.masterVolume.toString());
      this.updateGains();
    }

    setMusicVolume(val) {
      this.musicVolume = Math.max(0, Math.min(1, val));
      localStorage.setItem('vtd_music_volume', this.musicVolume.toString());
      this.updateGains();
    }

    setSfxVolume(val) {
      this.sfxVolume = Math.max(0, Math.min(1, val));
      localStorage.setItem('vtd_sfx_volume', this.sfxVolume.toString());
      this.updateGains();
    }

    setMuteAll(muted) {
      this.isMuted = !!muted;
      localStorage.setItem('vtd_muted', this.isMuted.toString());
      this.updateGains();
    }

    // Sound Throttling to prevent audio buffer saturation
    isThrottled(soundKey, minIntervalMs = 70) {
      const now = Date.now();
      const last = this.lastPlayTimes[soundKey] || 0;
      if (now - last < minIntervalMs) return true;
      this.lastPlayTimes[soundKey] = now;
      return false;
    }

    playTone(freq, type, duration, vol = 0.2, freqEnd = null, targetGainNode = null) {
      if (this.isMuted || this.masterVolume <= 0.001) return;
      this.init();
      if (!this.ctx || !this.sfxGain) return;
      try {
        const dest = targetGainNode || this.sfxGain;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        if (freqEnd !== null) {
          osc.frequency.exponentialRampToValueAtTime(Math.max(10, freqEnd), this.ctx.currentTime + duration);
        }
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(dest);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      } catch (e) {}
    }

    playNoise(duration, vol = 0.2, targetGainNode = null) {
      if (this.isMuted || this.masterVolume <= 0.001) return;
      this.init();
      if (!this.ctx || !this.sfxGain) return;
      try {
        const dest = targetGainNode || this.sfxGain;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        noise.connect(gain);
        gain.connect(dest);
        noise.start();
      } catch (e) {}
    }

    // --- 1. MAIN MENU SOUNDS ---
    startMenuMusic() {
      if (this.currentTrackType === 'menu') return;
      this.stopMusic();
      this.currentTrackType = 'menu';
      const chords = [
        [220, 261, 329], // A minor
        [174, 220, 261], // F major
        [196, 246, 293], // G major
        [164, 207, 246]  // E minor
      ];
      let step = 0;
      this.musicTimer = setInterval(() => {
        if (this.isMuted || !this.ctx || this.masterVolume <= 0.001) return;
        const chord = chords[step % chords.length];
        chord.forEach((freq, idx) => {
          setTimeout(() => {
            this.playTone(freq, 'sine', 0.8, 0.035, null, this.musicGain);
          }, idx * 120);
        });
        step++;
      }, 1600);
    }

    buttonClick() {
      if (this.isThrottled('btn_click', 50)) return;
      this.playTone(480, 'sine', 0.06, 0.12, 680);
    }
    buttonDisabled() {
      if (this.isThrottled('btn_disabled', 80)) return;
      this.playTone(180, 'sawtooth', 0.12, 0.1, 90);
    }
    buttonHover() {
      if (this.isThrottled('btn_hover', 60)) return;
      this.playTone(880, 'sine', 0.03, 0.03);
    }
    profileClick() { this.playTone(520, 'triangle', 0.08, 0.12, 780); }
    mapButtonClick() { this.playTone(440, 'triangle', 0.1, 0.15, 660); }
    settingsButtonClick() { this.playTone(600, 'sine', 0.08, 0.12, 800); }
    taskButtonClick() { this.playTone(580, 'sine', 0.08, 0.12, 720); }
    challengeButtonClick() { this.playTone(640, 'sine', 0.08, 0.12, 840); }
    exitButtonClick() { this.playTone(320, 'sawtooth', 0.15, 0.12, 160); }

    // --- 2. MAP SELECTION SOUNDS ---
    openMapModal() {
      this.playTone(400, 'triangle', 0.2, 0.15, 800);
      setTimeout(() => this.playTone(800, 'sine', 0.25, 0.12, 1200), 80);
    }
    selectUnlockedMap() { this.playTone(600, 'sine', 0.08, 0.15, 900); }
    clickLockedMap() {
      this.playTone(140, 'sawtooth', 0.2, 0.18, 70);
      this.playNoise(0.1, 0.12);
    }
    mapUnlocked() {
      const fanfare = [523, 659, 784, 1046];
      fanfare.forEach((f, i) => setTimeout(() => this.playTone(f, 'sine', 0.2, 0.18), i * 90));
    }
    confirmPlayMap() {
      this.playTone(330, 'sawtooth', 0.3, 0.2, 554);
      setTimeout(() => this.playTone(554, 'sawtooth', 0.4, 0.22, 659), 120);
    }
    enterMapTransition() {
      this.playTone(200, 'sine', 0.4, 0.15, 600);
      this.playNoise(0.25, 0.1);
    }

    // --- 3. GAMEPLAY MUSIC ---
    startMusic(mapIndex = 1, isBossWave = false) {
      this.startGameplayMusic(mapIndex, isBossWave);
    }
    Startmusic(mapIndex = 1, isBossWave = false) {
      this.startGameplayMusic(mapIndex, isBossWave);
    }
    startGameplayMusic(mapIndex = 1, isBossWave = false) {
      const trackKey = isBossWave ? 'boss' : (mapIndex === 25 ? 'final' : 'gameplay');
      if (this.currentTrackType === trackKey) return;
      this.stopMusic();
      this.currentTrackType = trackKey;

      if (trackKey === 'final') {
        // Epic Final Map 25 Celestial Anthem
        const bassNotes = [110, 130, 146, 164];
        const leadNotes = [440, 554, 659, 880, 659, 554];
        let step = 0;
        this.musicTimer = setInterval(() => {
          if (this.isMuted || !this.ctx || this.masterVolume <= 0.001) return;
          this.playTone(bassNotes[step % bassNotes.length], 'sawtooth', 0.4, 0.06, null, this.musicGain);
          this.playTone(leadNotes[step % leadNotes.length], 'triangle', 0.25, 0.05, null, this.musicGain);
          step++;
        }, 320);
      } else if (trackKey === 'boss') {
        // Intense Fast Boss Battle Theme
        const bossNotes = [98, 110, 98, 123, 98, 110, 130, 98];
        let step = 0;
        this.musicTimer = setInterval(() => {
          if (this.isMuted || !this.ctx || this.masterVolume <= 0.001) return;
          this.playTone(bossNotes[step % bossNotes.length], 'sawtooth', 0.22, 0.07, null, this.musicGain);
          this.playNoise(0.08, 0.04, this.musicGain);
          step++;
        }, 220);
      } else {
        // Dynamic Fantasy Action TD Theme
        const notes = [146, 185, 220, 293, 220, 185, 146, 164];
        let step = 0;
        this.musicTimer = setInterval(() => {
          if (this.isMuted || !this.ctx || this.masterVolume <= 0.001) return;
          this.playTone(notes[step % notes.length], 'triangle', 0.35, 0.045, null, this.musicGain);
          step++;
        }, 420);
      }
    }

    stopMusic() {
      if (this.musicTimer) {
        clearInterval(this.musicTimer);
        this.musicTimer = null;
      }
      this.currentTrackType = null;
    }

    // --- 4. TOWER ATTACK SOUNDS ---
    arrowShoot() {
      this.archerShoot();
    }
    archerShoot() {
      if (this.isThrottled('tower_archer', 60)) return;
      this.playTone(680, 'triangle', 0.09, 0.15, 280);
    }
    cannonShoot() {
      if (this.isThrottled('tower_cannon', 100)) return;
      this.playTone(110, 'sawtooth', 0.32, 0.28, 28);
      this.playNoise(0.24, 0.22);
    }
    magicShoot() {
      if (this.isThrottled('tower_magic', 80)) return;
      this.playTone(460, 'sine', 0.18, 0.16, 880);
      setTimeout(() => this.playTone(690, 'triangle', 0.12, 0.1), 30);
    }
    iceShoot() {
      if (this.isThrottled('tower_ice', 80)) return;
      this.playTone(820, 'sine', 0.16, 0.15, 1240);
    }
    fireShoot() {
      if (this.isThrottled('tower_fire', 80)) return;
      this.playTone(220, 'sawtooth', 0.22, 0.18, 90);
      this.playNoise(0.18, 0.18);
    }
    lightningShoot() {
      if (this.isThrottled('tower_lightning', 90)) return;
      this.playTone(980, 'square', 0.14, 0.2, 90);
      this.playNoise(0.1, 0.2);
    }
    sniperShoot() {
      if (this.isThrottled('tower_sniper', 120)) return;
      this.playTone(1200, 'sawtooth', 0.12, 0.25, 180);
      this.playNoise(0.15, 0.25);
    }
    missileShoot() {
      if (this.isThrottled('tower_missile', 120)) return;
      this.playTone(280, 'sawtooth', 0.35, 0.22, 600);
      this.playNoise(0.2, 0.2);
    }
    laserShoot() {
      if (this.isThrottled('tower_laser', 50)) return;
      this.playTone(1400, 'sine', 0.08, 0.12, 900);
    }
    ultimateShoot() {
      if (this.isThrottled('tower_ultimate', 120)) return;
      this.playTone(300, 'sawtooth', 0.45, 0.35, 1200);
      this.playNoise(0.3, 0.3);
    }

    // --- 5. TOWER PLACEMENT & UPGRADE SOUNDS ---
    towerBuild() {
      this.playTone(180, 'triangle', 0.15, 0.18, 360);
      this.playNoise(0.1, 0.15);
    }
    towerConfirm() {
      this.playTone(520, 'sine', 0.1, 0.16);
      setTimeout(() => this.playTone(780, 'sine', 0.12, 0.16), 60);
    }
    insufficientMoney() {
      this.playTone(160, 'sawtooth', 0.18, 0.2, 80);
      setTimeout(() => this.playTone(120, 'sawtooth', 0.18, 0.2, 60), 80);
    }
    upgradeSound(level = 1) {
      this.towerUpgrade(level);
    }
    towerUpgrade(level = 1) {
      const pitchOffset = Math.min(400, level * 35);
      this.playTone(440 + pitchOffset, 'sine', 0.1, 0.18);
      setTimeout(() => this.playTone(554 + pitchOffset, 'sine', 0.1, 0.18), 60);
      setTimeout(() => this.playTone(659 + pitchOffset, 'sine', 0.14, 0.2), 120);
    }
    towerSell() {
      this.playTone(987, 'sine', 0.08, 0.18);
      setTimeout(() => this.playTone(1318, 'sine', 0.1, 0.18), 50);
      setTimeout(() => this.playTone(1568, 'sine', 0.12, 0.18), 100);
    }
    towerSelect() { this.playTone(620, 'sine', 0.05, 0.1); }

    // --- 6. ENEMY & COMBAT SOUNDS ---
    enemyMove(typeKey) {
      if (this.isThrottled('enemy_move_' + typeKey, 1200)) return;
      if (typeKey === 'flying' || typeKey === 'swarm') {
        this.playTone(380, 'sine', 0.1, 0.03, 420);
      } else if (typeKey === 'heavy' || typeKey === 'tank') {
        this.playTone(90, 'triangle', 0.12, 0.04, 50);
      }
    }
    enemyHit() {
      if (this.isThrottled('enemy_hit', 60)) return;
      this.playTone(280, 'sine', 0.07, 0.1, 150);
    }
    critHit() {
      this.playTone(1200, 'triangle', 0.12, 0.25, 400);
      this.playNoise(0.08, 0.18);
    }
    enemyDeath() {
      if (this.isThrottled('enemy_death', 70)) return;
      this.playTone(180, 'triangle', 0.18, 0.15, 60);
    }
    bossHit() {
      if (this.isThrottled('boss_hit', 100)) return;
      this.playTone(120, 'sawtooth', 0.2, 0.22, 50);
      this.playNoise(0.12, 0.15);
    }

    // --- 7. CASTLE SOUNDS ---
    castleProximityWarning() {
      if (this.isThrottled('castle_warn', 1500)) return;
      this.playTone(220, 'square', 0.2, 0.1, 180);
    }
    castleDamage() {
      this.playTone(90, 'sawtooth', 0.45, 0.35, 30);
      this.playNoise(0.4, 0.3);
    }
    castleLowHealthWarning() {
      if (this.isThrottled('castle_low_hp', 1800)) return;
      this.playTone(300, 'sawtooth', 0.3, 0.25, 150);
      setTimeout(() => this.playTone(300, 'sawtooth', 0.3, 0.25, 150), 200);
    }
    castleDestruction() {
      this.playTone(60, 'sawtooth', 0.8, 0.4, 20);
      this.playNoise(0.7, 0.4);
    }

    // --- 8. WAVE & BOSS SOUNDS ---
    waveCountdownTick() { this.playTone(800, 'sine', 0.05, 0.12); }
    waveHorn() {
      this.playTone(330, 'sawtooth', 0.5, 0.22, 440);
      setTimeout(() => this.playTone(440, 'sawtooth', 0.7, 0.22, 554), 200);
    }
    waveComplete() {
      const fanfare = [523, 659, 784];
      fanfare.forEach((f, idx) => setTimeout(() => this.playTone(f, 'sine', 0.15, 0.18), idx * 100));
    }
    bossSpawn() {
      this.playTone(70, 'sawtooth', 0.7, 0.38, 45);
      this.playNoise(0.5, 0.3);
      setTimeout(() => this.playTone(105, 'sawtooth', 0.6, 0.32, 50), 220);
    }
    bossRoar() {
      this.playTone(115, 'sawtooth', 0.45, 0.32, 50);
      this.playNoise(0.35, 0.25);
    }
    bossDefeated() {
      this.playTone(150, 'sawtooth', 0.5, 0.35, 400);
      this.playNoise(0.4, 0.3);
      const fanfare = [523, 659, 784, 1046, 1318];
      fanfare.forEach((f, idx) => setTimeout(() => this.playTone(f, 'triangle', 0.2, 0.25), idx * 110));
    }

    // --- 9. ECONOMY SOUNDS ---
    coinCollect() {
      if (this.isThrottled('coin_collect', 50)) return;
      this.playTone(987, 'sine', 0.08, 0.15);
      setTimeout(() => this.playTone(1318, 'sine', 0.12, 0.15), 50);
    }
    waveReward() {
      const notes = [659, 784, 987, 1318];
      notes.forEach((f, i) => setTimeout(() => this.playTone(f, 'sine', 0.12, 0.16), i * 70));
    }
    taskClaimReward() {
      const notes = [523, 659, 784, 1046, 1318];
      notes.forEach((f, i) => setTimeout(() => this.playTone(f, 'sine', 0.14, 0.2), i * 80));
    }

    // --- 10. PAUSE, GAME OVER & FINAL VICTORY ---
    pauseGame() { this.playTone(350, 'sine', 0.15, 0.15, 180); }
    resumeGame() { this.playTone(180, 'sine', 0.15, 0.15, 350); }
    
    gameOverSound() {
      this.stopMusic();
      const somber = [
        [261.63, 0.28], // C4
        [207.65, 0.32], // G#3
        [196.00, 0.38], // G3
        [174.61, 0.65]  // F3
      ];
      somber.forEach(([f, dur], idx) => {
        setTimeout(() => this.playTone(f, 'sawtooth', dur, 0.28, f * 0.85), idx * 230);
      });
    }

    victorySound() {
      this.stopMusic();
      const fanfare = [
        [523.25, 0.14],
        [659.25, 0.14],
        [783.99, 0.18],
        [1046.50, 0.65]
      ];
      fanfare.forEach(([f, dur], idx) => {
        setTimeout(() => this.playTone(f, 'triangle', dur, 0.35), idx * 130);
      });
    }

    finalVictoryMap25() {
      this.stopMusic();
      const grandChords = [
        [523.25, 659.25, 783.99, 1046.50],
        [587.33, 698.46, 880.00, 1174.66],
        [659.25, 783.99, 987.77, 1318.51],
        [783.99, 987.77, 1175.00, 1567.98]
      ];
      grandChords.forEach((chord, i) => {
        setTimeout(() => {
          chord.forEach(f => this.playTone(f, 'triangle', 0.5, 0.12));
        }, i * 300);
      });
    }

    playAgainClick() {
      this.playTone(200, 'sine', 0.4, 0.25, 800);
    }

    exitGame() {
      this.stopMusic();
      this.playTone(400, 'sine', 0.3, 0.18, 200);
    }
  }

  // --- 100 PROGRESSIVE HARDER TASKS GENERATOR ---
  function generate100Tasks() {
    const list = [
      // Required 15 baseline harder tasks
      { id: 't_1', name: 'Task 1: Slayer I', desc: 'Kill 100 enemies', target: 100, current: 0, reward: 200, claimed: false, type: 'kills' },
      { id: 't_2', name: 'Task 2: Slayer II', desc: 'Kill 250 enemies', target: 250, current: 0, reward: 350, claimed: false, type: 'kills' },
      { id: 't_3', name: 'Task 3: Slayer III', desc: 'Kill 500 enemies', target: 500, current: 0, reward: 500, claimed: false, type: 'kills' },
      { id: 't_4', name: 'Task 4: Defender I', desc: 'Complete 10 waves', target: 10, current: 0, reward: 300, claimed: false, type: 'waves' },
      { id: 't_5', name: 'Task 5: Defender II', desc: 'Complete 25 waves', target: 25, current: 0, reward: 600, claimed: false, type: 'waves' },
      { id: 't_6', name: 'Task 6: Defender III', desc: 'Complete 50 waves', target: 50, current: 0, reward: 1200, claimed: false, type: 'waves' },
      { id: 't_7', name: 'Task 7: Architect I', desc: 'Build 25 towers', target: 25, current: 0, reward: 400, claimed: false, type: 'builds' },
      { id: 't_8', name: 'Task 8: Architect II', desc: 'Build 50 towers', target: 50, current: 0, reward: 800, claimed: false, type: 'builds' },
      { id: 't_9', name: 'Task 9: Engineer I', desc: 'Upgrade towers 25 times', target: 25, current: 0, reward: 500, claimed: false, type: 'upgrades' },
      { id: 't_10', name: 'Task 10: Engineer II', desc: 'Upgrade towers 100 times', target: 100, current: 0, reward: 1500, claimed: false, type: 'upgrades' },
      { id: 't_11', name: 'Task 11: Titan Hunter I', desc: 'Defeat 10 bosses', target: 10, current: 0, reward: 800, claimed: false, type: 'bosses' },
      { id: 't_12', name: 'Task 12: Titan Hunter II', desc: 'Defeat 25 bosses', target: 25, current: 0, reward: 1500, claimed: false, type: 'bosses' },
      { id: 't_13', name: 'Task 13: Treasury I', desc: 'Earn Rs 5,000 in combat', target: 5000, current: 0, reward: 750, claimed: false, type: 'earnings' },
      { id: 't_14', name: 'Task 14: Treasury II', desc: 'Earn Rs 10,000 in combat', target: 10000, current: 0, reward: 1200, claimed: false, type: 'earnings' },
      { id: 't_15', name: 'Task 15: Flawless Guard', desc: 'Complete a wave without losing castle health', target: 1, current: 0, reward: 400, claimed: false, type: 'perfect' },

      // Progressively difficult tasks 16 to 100
      { id: 't_16', name: 'Task 16: Slayer IV', desc: 'Kill 750 enemies', target: 750, current: 0, reward: 700, claimed: false, type: 'kills' },
      { id: 't_17', name: 'Task 17: Defender IV', desc: 'Complete 67 waves', target: 67, current: 0, reward: 1500, claimed: false, type: 'waves' },
      { id: 't_18', name: 'Task 18: Architect III', desc: 'Build 75 towers', target: 75, current: 0, reward: 1000, claimed: false, type: 'builds' },
      { id: 't_19', name: 'Task 19: Titan Hunter III', desc: 'Defeat 35 bosses', target: 35, current: 0, reward: 2000, claimed: false, type: 'bosses' },
      { id: 't_20', name: 'Task 20: Treasury III', desc: 'Earn Rs 20,000 in combat', target: 20000, current: 0, reward: 1800, claimed: false, type: 'earnings' },
      { id: 't_21', name: 'Task 21: Flawless Guard II', desc: 'Complete 5 waves without losing castle health', target: 5, current: 0, reward: 800, claimed: false, type: 'perfect' },
      { id: 't_22', name: 'Task 22: Slayer V', desc: 'Kill 1,000 enemies', target: 1000, current: 0, reward: 1000, claimed: false, type: 'kills' },
      { id: 't_23', name: 'Task 23: Defender V', desc: 'Complete 75 waves', target: 75, current: 0, reward: 1800, claimed: false, type: 'waves' },
      { id: 't_24', name: 'Task 24: Engineer III', desc: 'Upgrade towers 150 times', target: 150, current: 0, reward: 2000, claimed: false, type: 'upgrades' },
      { id: 't_25', name: 'Task 25: Architect IV', desc: 'Build 100 towers', target: 100, current: 0, reward: 1300, claimed: false, type: 'builds' },
      { id: 't_26', name: 'Task 26: Titan Hunter IV', desc: 'Defeat 50 bosses', target: 50, current: 0, reward: 2500, claimed: false, type: 'bosses' },
      { id: 't_27', name: 'Task 27: Treasury IV', desc: 'Earn Rs 35,000 in combat', target: 35000, current: 0, reward: 2400, claimed: false, type: 'earnings' },
      { id: 't_28', name: 'Task 28: Flawless Guard III', desc: 'Complete 10 waves without losing castle health', target: 10, current: 0, reward: 1200, claimed: false, type: 'perfect' },
      { id: 't_29', name: 'Task 29: Slayer VI', desc: 'Kill 1,500 enemies', target: 1500, current: 0, reward: 1400, claimed: false, type: 'kills' },
      { id: 't_30', name: 'Task 30: Defender VI', desc: 'Complete 100 waves', target: 100, current: 0, reward: 3000, claimed: false, type: 'waves' },
      { id: 't_31', name: 'Task 31: Architect V', desc: 'Build 125 towers', target: 125, current: 0, reward: 1600, claimed: false, type: 'builds' },
      { id: 't_32', name: 'Task 32: Engineer IV', desc: 'Upgrade towers 200 times', target: 200, current: 0, reward: 2500, claimed: false, type: 'upgrades' },
      { id: 't_33', name: 'Task 33: Titan Hunter V', desc: 'Defeat 65 bosses', target: 65, current: 0, reward: 3000, claimed: false, type: 'bosses' },
      { id: 't_34', name: 'Task 34: Treasury V', desc: 'Earn Rs 50,000 in combat', target: 50000, current: 0, reward: 3200, claimed: false, type: 'earnings' },
      { id: 't_35', name: 'Task 35: Flawless Guard IV', desc: 'Complete 15 waves without losing castle health', target: 15, current: 0, reward: 1600, claimed: false, type: 'perfect' },
      { id: 't_36', name: 'Task 36: Slayer VII', desc: 'Kill 2,000 enemies', target: 2000, current: 0, reward: 1800, claimed: false, type: 'kills' },
      { id: 't_37', name: 'Task 37: Defender VII', desc: 'Complete 120 waves', target: 120, current: 0, reward: 3500, claimed: false, type: 'waves' },
      { id: 't_38', name: 'Task 38: Architect VI', desc: 'Build 150 towers', target: 150, current: 0, reward: 1900, claimed: false, type: 'builds' },
      { id: 't_39', name: 'Task 39: Engineer V', desc: 'Upgrade towers 250 times', target: 250, current: 0, reward: 3000, claimed: false, type: 'upgrades' },
      { id: 't_40', name: 'Task 40: Titan Hunter VI', desc: 'Defeat 80 bosses', target: 80, current: 0, reward: 3500, claimed: false, type: 'bosses' },
      { id: 't_41', name: 'Task 41: Treasury VI', desc: 'Earn Rs 75,000 in combat', target: 75000, current: 0, reward: 4000, claimed: false, type: 'earnings' },
      { id: 't_42', name: 'Task 42: Flawless Guard V', desc: 'Complete 20 waves without losing castle health', target: 20, current: 0, reward: 2000, claimed: false, type: 'perfect' },
      { id: 't_43', name: 'Task 43: Slayer VIII', desc: 'Kill 2,500 enemies', target: 2500, current: 0, reward: 2200, claimed: false, type: 'kills' },
      { id: 't_44', name: 'Task 44: Defender VIII', desc: 'Complete 140 waves', target: 140, current: 0, reward: 4000, claimed: false, type: 'waves' },
      { id: 't_45', name: 'Task 45: Architect VII', desc: 'Build 175 towers', target: 175, current: 0, reward: 2200, claimed: false, type: 'builds' },
      { id: 't_46', name: 'Task 46: Engineer VI', desc: 'Upgrade towers 300 times', target: 300, current: 0, reward: 3600, claimed: false, type: 'upgrades' },
      { id: 't_47', name: 'Task 47: Titan Hunter VII', desc: 'Defeat 100 bosses', target: 100, current: 0, reward: 4200, claimed: false, type: 'bosses' },
      { id: 't_48', name: 'Task 48: Treasury VII', desc: 'Earn Rs 100,000 in combat', target: 100000, current: 0, reward: 5000, claimed: false, type: 'earnings' },
      { id: 't_49', name: 'Task 49: Flawless Guard VI', desc: 'Complete 25 waves without losing castle health', target: 25, current: 0, reward: 2500, claimed: false, type: 'perfect' },
      { id: 't_50', name: 'Task 50: Slayer IX', desc: 'Kill 3,000 enemies', target: 3000, current: 0, reward: 2600, claimed: false, type: 'kills' },
      { id: 't_51', name: 'Task 51: Defender IX', desc: 'Complete 160 waves', target: 160, current: 0, reward: 4500, claimed: false, type: 'waves' },
      { id: 't_52', name: 'Task 52: Architect VIII', desc: 'Build 200 towers', target: 200, current: 0, reward: 2500, claimed: false, type: 'builds' },
      { id: 't_53', name: 'Task 53: Engineer VII', desc: 'Upgrade towers 350 times', target: 350, current: 0, reward: 4200, claimed: false, type: 'upgrades' },
      { id: 't_54', name: 'Task 54: Titan Hunter VIII', desc: 'Defeat 125 bosses', target: 125, current: 0, reward: 4800, claimed: false, type: 'bosses' },
      { id: 't_55', name: 'Task 55: Treasury VIII', desc: 'Earn Rs 150,000 in combat', target: 150000, current: 0, reward: 6000, claimed: false, type: 'earnings' },
      { id: 't_56', name: 'Task 56: Slayer X', desc: 'Kill 4,000 enemies', target: 4000, current: 0, reward: 3200, claimed: false, type: 'kills' },
      { id: 't_57', name: 'Task 57: Defender X', desc: 'Complete 180 waves', target: 180, current: 0, reward: 5000, claimed: false, type: 'waves' },
      { id: 't_58', name: 'Task 58: Architect IX', desc: 'Build 250 towers', target: 250, current: 0, reward: 3000, claimed: false, type: 'builds' },
      { id: 't_59', name: 'Task 59: Engineer VIII', desc: 'Upgrade towers 400 times', target: 400, current: 0, reward: 4800, claimed: false, type: 'upgrades' },
      { id: 't_60', name: 'Task 60: Titan Hunter IX', desc: 'Defeat 150 bosses', target: 150, current: 0, reward: 5500, claimed: false, type: 'bosses' },
      { id: 't_61', name: 'Task 61: Treasury IX', desc: 'Earn Rs 200,000 in combat', target: 20000, current: 0, reward: 7000, claimed: false, type: 'earnings' },
      { id: 't_62', name: 'Task 62: Flawless Guard VII', desc: 'Complete 35 waves without losing castle health', target: 35, current: 0, reward: 3000, claimed: false, type: 'perfect' },
      { id: 't_63', name: 'Task 63: Slayer XI', desc: 'Kill 5,000 enemies', target: 5000, current: 0, reward: 4000, claimed: false, type: 'kills' },
      { id: 't_64', name: 'Task 64: Defender XI', desc: 'Complete 200 waves', target: 200, current: 0, reward: 6000, claimed: false, type: 'waves' },
      { id: 't_65', name: 'Task 65: Architect X', desc: 'Build 300 towers', target: 300, current: 0, reward: 3500, claimed: false, type: 'builds' },
      { id: 't_66', name: 'Task 66: Engineer IX', desc: 'Upgrade towers 500 times', target: 500, current: 0, reward: 5500, claimed: false, type: 'upgrades' },
      { id: 't_67', name: 'Task 67: Titan Hunter X', desc: 'Defeat 175 bosses', target: 175, current: 0, reward: 6200, claimed: false, type: 'bosses' },
      { id: 't_68', name: 'Task 68: Treasury X', desc: 'Earn Rs 250,000 in combat', target: 250000, current: 0, reward: 8000, claimed: false, type: 'earnings' },
      { id: 't_69', name: 'Task 69: Slayer XII', desc: 'Kill 6,500 enemies', target: 6500, current: 0, reward: 4800, claimed: false, type: 'kills' },
      { id: 't_70', name: 'Task 70: Defender XII', desc: 'Complete 225 waves', target: 225, current: 0, reward: 6500, claimed: false, type: 'waves' },
      { id: 't_71', name: 'Task 71: Architect XI', desc: 'Build 350 towers', target: 350, current: 0, reward: 4000, claimed: false, type: 'builds' },
      { id: 't_72', name: 'Task 72: Engineer X', desc: 'Upgrade towers 600 times', target: 600, current: 0, reward: 6200, claimed: false, type: 'upgrades' },
      { id: 't_73', name: 'Task 73: Titan Hunter XI', desc: 'Defeat 200 bosses', target: 200, current: 0, reward: 7000, claimed: false, type: 'bosses' },
      { id: 't_74', name: 'Task 74: Treasury XI', desc: 'Earn Rs 350,000 in combat', target: 350000, current: 0, reward: 9500, claimed: false, type: 'earnings' },
      { id: 't_75', name: 'Task 75: Flawless Guard VIII', desc: 'Complete 50 waves without losing castle health', target: 50, current: 0, reward: 4000, claimed: false, type: 'perfect' },
      { id: 't_76', name: 'Task 76: Slayer XIII', desc: 'Kill 8,000 enemies', target: 8000, current: 0, reward: 5500, claimed: false, type: 'kills' },
      { id: 't_77', name: 'Task 77: Defender XIII', desc: 'Complete 250 waves', target: 250, current: 0, reward: 7000, claimed: false, type: 'waves' },
      { id: 't_78', name: 'Task 78: Architect XII', desc: 'Build 400 towers', target: 400, current: 0, reward: 4500, claimed: false, type: 'builds' },
      { id: 't_79', name: 'Task 79: Engineer XI', desc: 'Upgrade towers 750 times', target: 750, current: 0, reward: 7200, claimed: false, type: 'upgrades' },
      { id: 't_80', name: 'Task 80: Titan Hunter XII', desc: 'Defeat 250 bosses', target: 250, current: 0, reward: 8000, claimed: false, type: 'bosses' },
      { id: 't_81', name: 'Task 81: Treasury XII', desc: 'Earn Rs 500,000 in combat', target: 500000, current: 0, reward: 11000, claimed: false, type: 'earnings' },
      { id: 't_82', name: 'Task 82: Slayer XIV', desc: 'Kill 10,000 enemies', target: 10000, current: 0, reward: 6500, claimed: false, type: 'kills' },
      { id: 't_83', name: 'Task 83: Defender XIV', desc: 'Complete 275 waves', target: 275, current: 0, reward: 8000, claimed: false, type: 'waves' },
      { id: 't_84', name: 'Task 84: Architect XIII', desc: 'Build 450 towers', target: 450, current: 0, reward: 5000, claimed: false, type: 'builds' },
      { id: 't_85', name: 'Task 85: Engineer XII', desc: 'Upgrade towers 900 times', target: 900, current: 0, reward: 8000, claimed: false, type: 'upgrades' },
      { id: 't_86', name: 'Task 86: Titan Hunter XIII', desc: 'Defeat 300 bosses', target: 300, current: 0, reward: 9000, claimed: false, type: 'bosses' },
      { id: 't_87', name: 'Task 87: Treasury XIII', desc: 'Earn Rs 750,000 in combat', target: 750000, current: 0, reward: 13000, claimed: false, type: 'earnings' },
      { id: 't_88', name: 'Task 88: Flawless Guard IX', desc: 'Complete 75 waves without losing castle health', target: 75, current: 0, reward: 5000, claimed: false, type: 'perfect' },
      { id: 't_89', name: 'Task 89: Slayer XV', desc: 'Kill 12,500 enemies', target: 12500, current: 0, reward: 7500, claimed: false, type: 'kills' },
      { id: 't_90', name: 'Task 90: Defender XV', desc: 'Complete 300 waves', target: 300, current: 0, reward: 9000, claimed: false, type: 'waves' },
      { id: 't_91', name: 'Task 91: Architect XIV', desc: 'Build 500 towers', target: 500, current: 0, reward: 6000, claimed: false, type: 'builds' },
      { id: 't_92', name: 'Task 92: Engineer XIII', desc: 'Upgrade towers 1,000 times', target: 1000, current: 0, reward: 9000, claimed: false, type: 'upgrades' },
      { id: 't_93', name: 'Task 93: Titan Hunter XIV', desc: 'Defeat 350 bosses', target: 350, current: 0, reward: 10000, claimed: false, type: 'bosses' },
      { id: 't_94', name: 'Task 94: Treasury XIV', desc: 'Earn Rs 1,000,000 in combat', target: 1000000, current: 0, reward: 16000, claimed: false, type: 'earnings' },
      { id: 't_95', name: 'Task 95: Flawless Guard X', desc: 'Complete 100 waves without losing castle health', target: 100, current: 0, reward: 7000, claimed: false, type: 'perfect' },
      { id: 't_96', name: 'Task 96: Slayer XVI', desc: 'Kill 15,000 enemies', target: 15000, current: 0, reward: 9000, claimed: false, type: 'kills' },
      { id: 't_97', name: 'Task 97: Defender XVI', desc: 'Complete 350 waves', target: 350, current: 0, reward: 11000, claimed: false, type: 'waves' },
      { id: 't_98', name: 'Task 98: Engineer XIV', desc: 'Upgrade towers 1,500 times', target: 1500, current: 0, reward: 12000, claimed: false, type: 'upgrades' },
      { id: 't_99', name: 'Task 99: Titan Hunter XV', desc: 'Defeat 500 bosses', target: 500, current: 0, reward: 15000, claimed: false, type: 'bosses' },
      { id: 't_100', name: 'Task 100: Grand Marshal', desc: 'Kill 50,000 enemies and secure the realm forever', target: 50000, current: 0, reward: 50000, claimed: false, type: 'kills' }
    ];
    return list;
  }

  // --- 100 PLAYABLE CHALLENGES GENERATOR ---
  function generate100Challenges() {
    const list = [];
    const specs = [
      // 1 - 10: Introductory Trials
      { id: 1, title: 'SURVIVE 5 WAVES', desc: 'Survive 5 complete waves.', reward: 100, type: 'waves', target: 5, req: 0 },
      { id: 2, title: 'SURVIVE 10 WAVES', desc: 'Survive 10 complete waves.', reward: 200, type: 'waves', target: 10, req: 0 },
      { id: 3, title: 'KILL 50 ENEMIES', desc: 'Eliminate 50 enemy invaders.', reward: 150, type: 'kills', target: 50, req: 0 },
      { id: 4, title: 'KILL 100 ENEMIES', desc: 'Eliminate 100 enemy invaders.', reward: 250, type: 'kills', target: 100, req: 0 },
      { id: 5, title: 'DEFEAT 1 BOSS', desc: 'Slay the wave boss.', reward: 300, type: 'boss', target: 1, req: 0 },
      { id: 6, title: 'DEFEAT 5 BOSSES', desc: 'Slay 5 bosses across waves.', reward: 500, type: 'boss', target: 5, req: 2 },
      { id: 7, title: 'PERFECT DEFENSE', desc: 'Complete 5 waves without castle health falling below 100.', reward: 400, type: 'perfect', target: 5, req: 3 },
      { id: 8, title: 'SPEED RUNNER', desc: 'Complete 5 waves within 90 seconds.', reward: 500, type: 'timed', target: 5, timeLimit: 90, req: 4 },
      { id: 9, title: 'ARCHER MASTER', desc: 'Use Archer Towers to defeat 50 enemies.', reward: 350, type: 'archer_kills', target: 50, req: 5 },
      { id: 10, title: 'TITAN CRUSHER', desc: 'Defeat a Void Behemoth.', reward: 600, type: 'boss', target: 1, req: 6 },

      // 11 - 20: Weapon Specialists & Restraints
      { id: 11, title: 'CANNON BARRAGE', desc: 'Use Cannon Towers to defeat 50 enemies.', reward: 350, type: 'cannon_kills', target: 50, req: 7 },
      { id: 12, title: 'FROST DOMAIN', desc: 'Use Magic Towers to defeat 50 enemies.', reward: 350, type: 'magic_kills', target: 50, req: 8 },
      { id: 13, title: 'STORM CALLER', desc: 'Use Lightning Towers to defeat 50 enemies.', reward: 350, type: 'lightning_kills', target: 50, req: 9 },
      { id: 14, title: 'ARCHER ONLY 5', desc: 'Survive 5 waves using only Archer Towers.', reward: 400, type: 'archer_only', target: 5, allowedTowers: ['archer'], req: 10 },
      { id: 15, title: 'CANNON ONLY 5', desc: 'Survive 5 waves using only Cannon Towers.', reward: 450, type: 'cannon_only', target: 5, allowedTowers: ['cannon'], req: 11 },
      { id: 16, title: 'MAGIC ONLY 5', desc: 'Survive 5 waves using only Magic Towers.', reward: 500, type: 'magic_only', target: 5, allowedTowers: ['magic'], req: 12 },
      { id: 17, title: 'LIGHTNING ONLY 5', desc: 'Survive 5 waves using only Lightning Towers.', reward: 550, type: 'lightning_only', target: 5, allowedTowers: ['lightning'], req: 13 },
      { id: 18, title: 'SWARM DEFENSE', desc: 'Eliminate 75 fast scout invaders.', reward: 380, type: 'kills', target: 75, req: 14 },
      { id: 19, title: 'AIR PATROL', desc: 'Eliminate 60 enemies with fast targeting.', reward: 400, type: 'kills', target: 60, req: 15 },
      { id: 20, title: 'BUDGET GUARDIAN', desc: 'Survive 5 waves starting with only Rs 250.', reward: 500, type: 'budget', target: 5, startMoney: 250, req: 16 },

      // 21 - 30: Advanced Endurance
      { id: 21, title: 'SURVIVE 12 WAVES', desc: 'Survive 12 complete waves.', reward: 450, type: 'waves', target: 12, req: 17 },
      { id: 22, title: 'KILL 150 ENEMIES', desc: 'Eliminate 150 enemy invaders.', reward: 400, type: 'kills', target: 150, req: 18 },
      { id: 23, title: 'SPEED RUNNER II', desc: 'Complete 7 waves within 110 seconds.', reward: 550, type: 'timed', target: 7, timeLimit: 110, req: 19 },
      { id: 24, title: 'PERFECT DEFENSE II', desc: 'Complete 8 waves without castle taking damage.', reward: 600, type: 'perfect', target: 8, req: 20 },
      { id: 25, title: 'DEFEAT 3 BOSSES', desc: 'Defeat 3 bosses on the battlefield.', reward: 550, type: 'boss', target: 3, req: 21 },
      { id: 26, title: 'ARCHER SNIPER', desc: 'Kill 80 enemies with Archer Towers.', reward: 450, type: 'archer_kills', target: 80, req: 22 },
      { id: 27, title: 'ARTILLERY EXPERT', desc: 'Kill 80 enemies with Cannon Towers.', reward: 450, type: 'cannon_kills', target: 80, req: 23 },
      { id: 28, title: 'GLACIAL CURSE', desc: 'Kill 80 enemies with Magic Towers.', reward: 450, type: 'magic_kills', target: 80, req: 24 },
      { id: 29, title: 'THUNDERSTORM', desc: 'Kill 80 enemies with Lightning Towers.', reward: 450, type: 'lightning_kills', target: 80, req: 25 },
      { id: 30, title: 'BUDGET GUARDIAN II', desc: 'Survive 8 waves starting with only Rs 300.', reward: 600, type: 'budget', target: 8, startMoney: 300, req: 26 },

      // 31 - 40: Veteran Gauntlet
      { id: 31, title: 'SURVIVE 15 WAVES', desc: 'Survive 15 complete waves.', reward: 600, type: 'waves', target: 15, req: 27 },
      { id: 32, title: 'KILL 200 ENEMIES', desc: 'Eliminate 200 enemy invaders.', reward: 500, type: 'kills', target: 200, req: 28 },
      { id: 33, title: 'ARCHER ONLY 8', desc: 'Survive 8 waves using only Archer Towers.', reward: 650, type: 'archer_only', target: 8, allowedTowers: ['archer'], req: 29 },
      { id: 34, title: 'CANNON ONLY 8', desc: 'Survive 8 waves using only Cannon Towers.', reward: 700, type: 'cannon_only', target: 8, allowedTowers: ['cannon'], req: 30 },
      { id: 35, title: 'MAGIC ONLY 8', desc: 'Survive 8 waves using only Magic Towers.', reward: 750, type: 'magic_only', target: 8, allowedTowers: ['magic'], req: 31 },
      { id: 36, title: 'LIGHTNING ONLY 8', desc: 'Survive 8 waves using only Lightning Towers.', reward: 800, type: 'lightning_only', target: 8, allowedTowers: ['lightning'], req: 32 },
      { id: 37, title: 'SPEED RUNNER III', desc: 'Complete 10 waves within 150 seconds.', reward: 700, type: 'timed', target: 10, timeLimit: 150, req: 33 },
      { id: 38, title: 'PERFECT DEFENSE III', desc: 'Complete 10 waves without castle taking damage.', reward: 800, type: 'perfect', target: 10, req: 34 },
      { id: 39, title: 'DEFEAT 6 BOSSES', desc: 'Slay 6 bosses across the battlefield.', reward: 750, type: 'boss', target: 6, req: 35 },
      { id: 40, title: 'CARNAGE SPREE', desc: 'Eliminate 250 enemy invaders.', reward: 650, type: 'kills', target: 250, req: 36 },

      // 41 - 50: Elite Assaults
      { id: 41, title: 'SURVIVE 18 WAVES', desc: 'Survive 18 complete waves.', reward: 750, type: 'waves', target: 18, req: 37 },
      { id: 42, title: 'ARCHER ELITE', desc: 'Kill 120 enemies with Archer Towers.', reward: 600, type: 'archer_kills', target: 120, req: 38 },
      { id: 43, title: 'CANNON BLASTER', desc: 'Kill 120 enemies with Cannon Towers.', reward: 600, type: 'cannon_kills', target: 120, req: 39 },
      { id: 44, title: 'BLIZZARD MASTER', desc: 'Kill 120 enemies with Magic Towers.', reward: 600, type: 'magic_kills', target: 120, req: 40 },
      { id: 45, title: 'VOLT COMMANDER', desc: 'Kill 120 enemies with Lightning Towers.', reward: 600, type: 'lightning_kills', target: 120, req: 41 },
      { id: 46, title: 'BUDGET GUARDIAN III', desc: 'Survive 10 waves starting with only Rs 350.', reward: 800, type: 'budget', target: 10, startMoney: 350, req: 42 },
      { id: 47, title: 'SPEED RUNNER IV', desc: 'Complete 12 waves within 170 seconds.', reward: 850, type: 'timed', target: 12, timeLimit: 170, req: 43 },
      { id: 48, title: 'DEFEAT 8 BOSSES', desc: 'Slay 8 wave bosses.', reward: 900, type: 'boss', target: 8, req: 44 },
      { id: 49, title: 'KILL 300 ENEMIES', desc: 'Eliminate 300 enemy monsters.', reward: 800, type: 'kills', target: 300, req: 45 },
      { id: 50, title: 'MIDWAY CHAMPION', desc: 'Survive 20 complete waves.', reward: 1000, type: 'waves', target: 20, req: 46 },

      // 51 - 60: Frost & Thunder Trials
      { id: 51, title: 'PERFECT DEFENSE IV', desc: 'Complete 12 waves without castle taking damage.', reward: 950, type: 'perfect', target: 12, req: 47 },
      { id: 52, title: 'ARCHER ONLY 10', desc: 'Survive 10 waves using only Archer Towers.', reward: 900, type: 'archer_only', target: 10, allowedTowers: ['archer'], req: 48 },
      { id: 53, title: 'CANNON ONLY 10', desc: 'Survive 10 waves using only Cannon Towers.', reward: 950, type: 'cannon_only', target: 10, allowedTowers: ['cannon'], req: 49 },
      { id: 54, title: 'MAGIC ONLY 10', desc: 'Survive 10 waves using only Magic Towers.', reward: 1000, type: 'magic_only', target: 10, allowedTowers: ['magic'], req: 50 },
      { id: 55, title: 'LIGHTNING ONLY 10', desc: 'Survive 10 waves using only Lightning Towers.', reward: 1050, type: 'lightning_only', target: 10, allowedTowers: ['lightning'], req: 51 },
      { id: 56, title: 'KILL 350 ENEMIES', desc: 'Eliminate 350 enemy monsters.', reward: 900, type: 'kills', target: 350, req: 52 },
      { id: 57, title: 'SPEED RUNNER V', desc: 'Complete 15 waves within 200 seconds.', reward: 1000, type: 'timed', target: 15, timeLimit: 200, req: 53 },
      { id: 58, title: 'DEFEAT 10 BOSSES', desc: 'Slay 10 bosses across waves.', reward: 1100, type: 'boss', target: 10, req: 54 },
      { id: 59, title: 'ARCHER CHAMPION', desc: 'Kill 150 enemies with Archer Towers.', reward: 850, type: 'archer_kills', target: 150, req: 55 },
      { id: 60, title: 'SURVIVE 22 WAVES', desc: 'Endure 22 waves of assault.', reward: 1150, type: 'waves', target: 22, req: 56 },

      // 61 - 70: Fortress Siege
      { id: 61, title: 'CANNON COLOSSUS', desc: 'Kill 150 enemies with Cannon Towers.', reward: 850, type: 'cannon_kills', target: 150, req: 57 },
      { id: 62, title: 'CRYOMANCER', desc: 'Kill 150 enemies with Magic Towers.', reward: 850, type: 'magic_kills', target: 150, req: 58 },
      { id: 63, title: 'TEMPEST FURY', desc: 'Kill 150 enemies with Lightning Towers.', reward: 850, type: 'lightning_kills', target: 150, req: 59 },
      { id: 64, title: 'BUDGET GUARDIAN IV', desc: 'Survive 12 waves starting with only Rs 380.', reward: 1100, type: 'budget', target: 12, startMoney: 380, req: 60 },
      { id: 65, title: 'PERFECT DEFENSE V', desc: 'Complete 15 waves without castle taking damage.', reward: 1300, type: 'perfect', target: 15, req: 61 },
      { id: 66, title: 'KILL 400 ENEMIES', desc: 'Eliminate 400 enemy monsters.', reward: 1100, type: 'kills', target: 400, req: 62 },
      { id: 67, title: 'ARCHER ONLY 12', desc: 'Survive 12 waves using only Archer Towers.', reward: 1200, type: 'archer_only', target: 12, allowedTowers: ['archer'], req: 63 },
      { id: 68, title: 'CANNON ONLY 12', desc: 'Survive 12 waves using only Cannon Towers.', reward: 1250, type: 'cannon_only', target: 12, allowedTowers: ['cannon'], req: 64 },
      { id: 69, title: 'MAGIC ONLY 12', desc: 'Survive 12 waves using only Magic Towers.', reward: 1300, type: 'magic_only', target: 12, allowedTowers: ['magic'], req: 65 },
      { id: 70, title: 'LIGHTNING ONLY 12', desc: 'Survive 12 waves using only Lightning Towers.', reward: 1350, type: 'lightning_only', target: 12, allowedTowers: ['lightning'], req: 66 },

      // 71 - 80: Grand Citadel Defense
      { id: 71, title: 'SURVIVE 25 WAVES', desc: 'Endure 25 full waves.', reward: 1400, type: 'waves', target: 25, req: 67 },
      { id: 72, title: 'DEFEAT 12 BOSSES', desc: 'Slay 12 bosses.', reward: 1400, type: 'boss', target: 12, req: 68 },
      { id: 73, title: 'SPEED RUNNER VI', desc: 'Complete 18 waves within 240 seconds.', reward: 1350, type: 'timed', target: 18, timeLimit: 240, req: 69 },
      { id: 74, title: 'KILL 450 ENEMIES', desc: 'Eliminate 450 monsters.', reward: 1250, type: 'kills', target: 450, req: 70 },
      { id: 75, title: 'SHARPSHOOTER LEGEND', desc: 'Kill 200 enemies with Archer Towers.', reward: 1200, type: 'archer_kills', target: 200, req: 71 },
      { id: 76, title: 'BOMBARDMENT LEGEND', desc: 'Kill 200 enemies with Cannon Towers.', reward: 1200, type: 'cannon_kills', target: 200, req: 72 },
      { id: 77, title: 'FROSTBITE LEGEND', desc: 'Kill 200 enemies with Magic Towers.', reward: 1200, type: 'magic_kills', target: 200, req: 73 },
      { id: 78, title: 'THUNDER GOD', desc: 'Kill 200 enemies with Lightning Towers.', reward: 1200, type: 'lightning_kills', target: 200, req: 74 },
      { id: 79, title: 'BUDGET GUARDIAN V', desc: 'Survive 15 waves starting with only Rs 400.', reward: 1400, type: 'budget', target: 15, startMoney: 400, req: 75 },
      { id: 80, title: 'SURVIVE 28 WAVES', desc: 'Endure 28 full waves.', reward: 1600, type: 'waves', target: 28, req: 76 },

      // 81 - 90: Champion Crucible
      { id: 81, title: 'PERFECT DEFENSE VI', desc: 'Complete 18 waves without taking damage.', reward: 1700, type: 'perfect', target: 18, req: 77 },
      { id: 82, title: 'KILL 500 ENEMIES', desc: 'Eliminate 500 monsters.', reward: 1500, type: 'kills', target: 500, req: 78 },
      { id: 83, title: 'ARCHER ONLY 15', desc: 'Survive 15 waves using only Archer Towers.', reward: 1600, type: 'archer_only', target: 15, allowedTowers: ['archer'], req: 79 },
      { id: 84, title: 'CANNON ONLY 15', desc: 'Survive 15 waves using only Cannon Towers.', reward: 1650, type: 'cannon_only', target: 15, allowedTowers: ['cannon'], req: 80 },
      { id: 85, title: 'MAGIC ONLY 15', desc: 'Survive 15 waves using only Magic Towers.', reward: 1700, type: 'magic_only', target: 15, allowedTowers: ['magic'], req: 81 },
      { id: 86, title: 'LIGHTNING ONLY 15', desc: 'Survive 15 waves using only Lightning Towers.', reward: 1750, type: 'lightning_only', target: 15, allowedTowers: ['lightning'], req: 82 },
      { id: 87, title: 'DEFEAT 15 BOSSES', desc: 'Slay 15 wave bosses.', reward: 1800, type: 'boss', target: 15, req: 83 },
      { id: 88, title: 'SPEED RUNNER VII', desc: 'Complete 20 waves within 260 seconds.', reward: 1700, type: 'timed', target: 20, timeLimit: 260, req: 84 },
      { id: 89, title: 'SURVIVE 32 WAVES', desc: 'Endure 32 waves.', reward: 1900, type: 'waves', target: 32, req: 85 },
      { id: 90, title: 'TITAN SLAYER SUPREME', desc: 'Slay 18 wave bosses.', reward: 2000, type: 'boss', target: 18, req: 86 },

      // 91 - 100: Legend Trials
      { id: 91, title: 'KILL 600 ENEMIES', desc: 'Eliminate 600 enemy invaders.', reward: 2000, type: 'kills', target: 600, req: 87 },
      { id: 92, title: 'PERFECT DEFENSE VII', desc: 'Complete 20 waves without taking damage.', reward: 2300, type: 'perfect', target: 20, req: 88 },
      { id: 93, title: 'SURVIVE 35 WAVES', desc: 'Endure 35 waves.', reward: 2200, type: 'waves', target: 35, req: 89 },
      { id: 94, title: 'ARCHER DEMIGOD', desc: 'Kill 250 enemies with Archer Towers.', reward: 1800, type: 'archer_kills', target: 250, req: 90 },
      { id: 95, title: 'CANNON DEMIGOD', desc: 'Kill 250 enemies with Cannon Towers.', reward: 1800, type: 'cannon_kills', target: 250, req: 91 },
      { id: 96, title: 'MAGIC DEMIGOD', desc: 'Kill 250 enemies with Magic Towers.', reward: 1800, type: 'magic_kills', target: 250, req: 92 },
      { id: 97, title: 'LIGHTNING DEMIGOD', desc: 'Kill 250 enemies with Lightning Towers.', reward: 1800, type: 'lightning_kills', target: 250, req: 93 },
      { id: 98, title: 'SPEED RUNNER VIII', desc: 'Complete 25 waves within 320 seconds.', reward: 2500, type: 'timed', target: 25, timeLimit: 320, req: 94 },
      { id: 99, title: 'SURVIVE 40 WAVES', desc: 'Endure 40 waves of relentless siege.', reward: 3000, type: 'waves', target: 40, req: 95 },
      { id: 100, title: 'REALM GUARDIAN SUPREME', desc: 'Defeat 20 Bosses and survive 50 waves!', reward: 5000, type: 'waves', target: 50, req: 96 }
    ];

    specs.forEach(s => {
      list.push({
        id: s.id,
        numStr: `Challenge ${s.id < 10 ? '0' + s.id : s.id}`,
        title: s.title,
        desc: s.desc,
        reward: s.reward,
        type: s.type,
        target: s.target,
        timeLimit: s.timeLimit || 0,
        allowedTowers: s.allowedTowers || null,
        startMoney: s.startMoney !== undefined ? s.startMoney : 450,
        reqCompleted: s.req || 0,
        unlocked: s.id <= 5,
        completed: false,
        claimed: false,
        progress: 0
      });
    });

    return list;
  }

  // --- ACHIEVEMENTS DEFINITIONS ---
  function getAchievementsDefinitions() {
    return [
      { id: 'kills_1', name: 'First Blood', desc: 'Defeat 1 Monster in battle', icon: '🏆', type: 'kills', target: 1, reward: 50 },
      { id: 'kills_100', name: 'Monster Hunter', desc: 'Reach 100 Total Kills', icon: '⚔️', type: 'kills', target: 100, reward: 150 },
      { id: 'kills_1000', name: 'Slayer Legend', desc: 'Reach 1,000 Total Kills', icon: '💀', type: 'kills', target: 1000, reward: 500 },
      { id: 'kills_5000', name: 'Warlord Annihilator', desc: 'Reach 5,000 Total Kills', icon: '👹', type: 'kills', target: 5000, reward: 1500 },
      { id: 'map_1', name: 'Realm Explorer', desc: 'Complete Map 1 – Grassland', icon: '🗺️', type: 'maps', target: 1, reward: 100 },
      { id: 'map_5', name: 'Citadel Defender', desc: 'Complete 5 Campaign Maps', icon: '🏰', type: 'maps', target: 5, reward: 300 },
      { id: 'map_10', name: 'Master Strategist', desc: 'Complete 10 Campaign Maps', icon: '🛡️', type: 'maps', target: 10, reward: 700 },
      { id: 'map_25', name: 'Realm Emperor', desc: 'Complete All 25 Campaign Maps', icon: '👑', type: 'maps', target: 25, reward: 2500 },
      { id: 'upg_lightning_5', name: 'Lightning Master', desc: 'Upgrade a Lightning Tower to Level 5', icon: '⚡', type: 'lightning_lv5', target: 1, reward: 200 },
      { id: 'upg_cannon_5', name: 'Cannon Master', desc: 'Upgrade a Cannon Tower to Level 5', icon: '💥', type: 'cannon_lv5', target: 1, reward: 250 },
      { id: 'upg_ice_5', name: 'Frost Master', desc: 'Upgrade an Ice Tower to Level 5', icon: '❄️', type: 'ice_lv5', target: 1, reward: 200 },
      { id: 'upg_fire_5', name: 'Inferno Master', desc: 'Upgrade a Fire Tower to Level 5', icon: '🔥', type: 'fire_lv5', target: 1, reward: 225 },
      { id: 'boss_10', name: 'Boss Slayer', desc: 'Defeat 10 Boss Behemoths', icon: '👹', type: 'bosses', target: 10, reward: 400 },
      { id: 'gold_10000', name: 'Treasure Hoarder', desc: 'Earn 10,000 Total Gold', icon: '💎', type: 'gold', target: 10000, reward: 1000 },
      { id: 'perfect_10', name: 'Flawless Guard', desc: 'Complete 10 Perfect Waves', icon: '🛡️', type: 'perfect', target: 10, reward: 350 }
    ].map(a => Object.assign({ current: 0, completed: false, claimed: false }, a));
  }

  const create100Challenges = generate100Challenges;

  // --- DIFFICULTY CONFIGURATION ---
  const DIFFICULTY_CONFIG = {
    easy: {
      id: 'easy',
      name: 'EASY',
      maxWaves: 50,
      startingCastleHealth: 100,
      basicEnemyHp: 3,
      enemyHpMultiplier: 1.0,
      enemyCastleDamageMultiplier: 1.0,
      spawnInterval: 1.4,
      enemySpeedMultiplier: 0.75,
      towerDamageMultiplier: 1.0,
      desc: '<strong>EASY:</strong> 50 Waves | Castle: 100 HP | Basic Enemy: 3 HP. Slow and strategic. Suitable for beginners.'
    },
    normal: {
      id: 'normal',
      name: 'NORMAL',
      maxWaves: 67,
      startingCastleHealth: 67,
      basicEnemyHp: 4,
      enemyHpMultiplier: 1.25,
      enemyCastleDamageMultiplier: 1.0,
      spawnInterval: 1.1,
      enemySpeedMultiplier: 0.85,
      towerDamageMultiplier: 1.0,
      desc: '<strong>NORMAL:</strong> 67 Waves | Castle: 67 HP | Basic Enemy: 4 HP. Balanced defense challenge.'
    },
    hard: {
      id: 'hard',
      name: 'HARD',
      maxWaves: 100,
      startingCastleHealth: 40,
      basicEnemyHp: 5,
      enemyHpMultiplier: 1.6,
      enemyCastleDamageMultiplier: 1.5,
      spawnInterval: 0.85,
      enemySpeedMultiplier: 0.95,
      towerDamageMultiplier: 0.9,
      desc: '<strong>HARD:</strong> 100 Waves | Castle: 40 HP | Basic Enemy: 5 HP. Relentless waves & challenging bosses!'
    }
  };

  // --- GRAPHICS CONFIGURATION ---
  const GRAPHICS_CONFIG = {
    low: {
      id: 'low',
      name: 'LOW',
      particleMultiplier: 0.35,
      particleLifeMultiplier: 0.65,
      enhancedTowerEffects: false,
      enhancedEnemyEffects: false,
      enhancedBossEffects: false,
      detailedAnimations: false,
      desc: '<strong>LOW:</strong> Reduced particles • Reduced visual effects • Lower animation complexity • Best performance'
    },
    medium: {
      id: 'medium',
      name: 'MEDIUM',
      particleMultiplier: 1.0,
      particleLifeMultiplier: 1.0,
      enhancedTowerEffects: false,
      enhancedEnemyEffects: false,
      enhancedBossEffects: true,
      detailedAnimations: true,
      desc: '<strong>MEDIUM:</strong> Normal particles • Normal animations • Normal effects'
    },
    high: {
      id: 'high',
      name: 'HIGH',
      particleMultiplier: 1.9,
      particleLifeMultiplier: 1.4,
      enhancedTowerEffects: true,
      enhancedEnemyEffects: true,
      enhancedBossEffects: true,
      detailedAnimations: true,
      desc: '<strong>HIGH:</strong> Maximum particles • Detailed animations • Enhanced tower effects • Enhanced enemy effects • Enhanced boss effects • Higher-quality visual effects'
    }
  };

  // --- PERSISTENCE & STORAGE ---
  const Storage = {
    _cache: null,

    // Safe localStorage wrapper
    _getItem(key) {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        return null;
      }
    },
    _setItem(key, val) {
      try {
        localStorage.setItem(key, val);
      } catch (e) {}
    },
    _removeItem(key) {
      try {
        localStorage.removeItem(key);
      } catch (e) {}
    },

    init() {
      try {
        return this.load();
      } catch (e) {
        return this.createDefaultData();
      }
    },

    createDefaultData() {
      // First-time player defaults:
      // Player Name: Your Player, Money: Rs 0, Difficulty: Easy, Master Volume: 70%, Graphics: Medium, Castle Health: 100, Wave: 1
      const initialData = {
        playerName: "Your Player",
        playerPicture: "",
        money: 0,
        tasks: generate100Tasks(),
        challenges: generate100Challenges(),
        settings: {
          music: true,
          sfx: true,
          quality: "medium",
          difficulty: "easy",
          masterVolume: 0.70
        },
        difficulty: "easy",
        masterVolume: 0.70,
        graphicsQuality: "medium",
        castleHealth: 100,
        wave: 1,
        totalKills: 0,
        highestWave: 0,
        totalPlayingTime: 0,
        towersBuilt: 0,
        towersUpgraded: 0,
        bossesDefeated: 0,
        totalMoneyEarned: 0,
        perfectWavesCount: 0,
        speedWavesCount: 0
      };
      this.save(initialData);
      return initialData;
    },

    load() {
      try {
        const raw = this._getItem('vtd_save_data');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            // Player Name: preserve existing save data, migrate if dedicated key exists
            const savedName = this._getItem('vtd_player_name');
            if (savedName && savedName.trim()) {
              parsed.playerName = savedName.trim();
            } else if (!parsed.playerName || !parsed.playerName.trim()) {
              parsed.playerName = "Your Player";
            }

            // Player Picture
            const savedPic = this._getItem('vtd_player_avatar');
            if (savedPic) {
              parsed.playerPicture = savedPic;
            } else if (!parsed.playerPicture) {
              parsed.playerPicture = "";
            }

            // Money (Default: Rs 0)
            const savedMoney = this._getItem('vtd_money');
            if (savedMoney !== null && !isNaN(parseInt(savedMoney, 10))) {
              parsed.money = parseInt(savedMoney, 10);
            } else if (typeof parsed.money !== 'number' || isNaN(parsed.money)) {
              parsed.money = 0;
            }

            // Settings & Difficulty & Graphics & Master Volume
            if (!parsed.settings) parsed.settings = {};
            const savedDiff = this._getItem('vtd_difficulty');
            parsed.settings.difficulty = savedDiff || parsed.settings.difficulty || parsed.difficulty || 'easy';
            parsed.difficulty = parsed.settings.difficulty;

            const savedQual = this._getItem('vtd_graphics_quality');
            parsed.settings.quality = savedQual || parsed.settings.quality || parsed.graphicsQuality || 'medium';
            parsed.graphicsQuality = parsed.settings.quality;

            const savedVol = this._getItem('vtd_master_volume');
            if (savedVol !== null && !isNaN(parseFloat(savedVol))) {
              parsed.settings.masterVolume = parseFloat(savedVol);
            } else if (typeof parsed.settings.masterVolume !== 'number') {
              parsed.settings.masterVolume = 0.70;
            }
            parsed.masterVolume = parsed.settings.masterVolume;

            if (typeof parsed.castleHealth !== 'number') parsed.castleHealth = 100;
            if (typeof parsed.wave !== 'number') parsed.wave = 1;

            // Guarantee exactly 100 tasks
            if (!parsed.tasks || !Array.isArray(parsed.tasks) || parsed.tasks.length < 100) {
              const fresh = generate100Tasks();
              const oldMap = new Map((parsed.tasks || []).map(t => [t.id, t]));
              parsed.tasks = fresh.map(f => {
                const old = oldMap.get(f.id);
                return old ? { ...f, current: old.current || 0, claimed: !!old.claimed } : f;
              });
            }

            // Guarantee exactly 100 challenges
            const freshChs = generate100Challenges();
            let savedChList = [];
            try {
              const chRaw = this._getItem('vtd_challenges_data');
              if (chRaw) savedChList = JSON.parse(chRaw);
            } catch (e) {}
            if (!savedChList || savedChList.length === 0) {
              if (parsed.challenges && Array.isArray(parsed.challenges)) {
                savedChList = parsed.challenges;
              }
            }
            if (savedChList && savedChList.length > 0) {
              const chMap = new Map(savedChList.map(c => [c.id, c]));
              const completedCount = savedChList.filter(c => c.completed).length;
              freshChs.forEach(c => {
                const s = chMap.get(c.id);
                if (s) {
                  c.completed = !!s.completed;
                  c.claimed = !!s.claimed;
                  c.progress = typeof s.progress === 'number' ? s.progress : (typeof s.current === 'number' ? s.current : 0);
                }
                c.unlocked = (c.id <= 5) || c.completed || (completedCount >= (c.reqCompleted || 0));
              });
            }
            parsed.challenges = freshChs;

            this._cache = parsed;
            return parsed;
          }
        }
      } catch (e) {
        console.warn('Storage load failed, creating clean defaults', e);
      }

      return this.createDefaultData();
    },

    save(data) {
      if (!data || typeof data !== 'object') return;
      this._cache = data;
      try {
        this._setItem('vtd_save_data', JSON.stringify(data));
      } catch (e) {}
    },

    // --- PLAYER NAME ---
    setPlayerName(name) {
      const validName = (typeof name === 'string' && name.trim()) ? name.trim().slice(0, 20) : "Your Player";
      this._setItem('vtd_player_name', validName);
      try {
        const data = this._cache || this.load();
        data.playerName = validName;
        this.save(data);
      } catch (e) {}
      // Update DOM immediately
      const menuEl = document.getElementById('menu-player-name');
      if (menuEl) menuEl.textContent = validName;
      if (window.activeGame) window.activeGame.playerName = validName;
      return validName;
    },
    getPlayerName() {
      const direct = this._getItem('vtd_player_name');
      if (direct && direct.trim()) return direct.trim();
      const data = this._cache || this.load();
      return (data && data.playerName && data.playerName.trim()) ? data.playerName.trim() : "Your Player";
    },

    // --- PLAYER AVATAR / PICTURE ---
    setPlayerAvatar(picture) {
      const picStr = typeof picture === 'string' ? picture : "";
      this._setItem('vtd_player_avatar', picStr);
      try {
        const data = this._cache || this.load();
        data.playerPicture = picStr;
        this.save(data);
      } catch (e) {}
      if (window.activeGame) {
        window.activeGame.playerAvatar = picStr;
        window.activeGame.renderProfileUI?.();
      }
      return picStr;
    },
    setPlayerPicture(picture) {
      return this.setPlayerAvatar(picture);
    },
    getPlayerAvatar() {
      const direct = this._getItem('vtd_player_avatar');
      if (direct) return direct;
      const data = this._cache || this.load();
      return (data && data.playerPicture) ? data.playerPicture : "";
    },
    getPlayerPicture() {
      return this.getPlayerAvatar();
    },

    // --- MAP PROGRESSION (10 MAPS) ---
    getUnlockedMap() {
      const direct = parseInt(this._getItem('vtd_unlocked_map'), 10);
      if (!isNaN(direct) && direct >= 1) return Math.min(25, Math.max(1, direct));
      const data = this._cache || this.load();
      return Math.min(25, Math.max(1, (data && data.unlockedMap) ? data.unlockedMap : 1));
    },
    setUnlockedMap(mapNum) {
      const num = Math.min(25, Math.max(1, parseInt(mapNum, 10) || 1));
      this._setItem('vtd_unlocked_map', num.toString());
      try {
        const data = this._cache || this.load();
        data.unlockedMap = num;
        this.save(data);
      } catch (e) {}
      return num;
    },
    getCurrentMap() {
      const direct = parseInt(this._getItem('vtd_current_map'), 10);
      if (!isNaN(direct) && direct >= 1) return Math.min(25, Math.max(1, direct));
      const data = this._cache || this.load();
      return Math.min(25, Math.max(1, (data && data.currentMap) ? data.currentMap : 1));
    },
    setCurrentMap(mapNum) {
      const num = Math.min(25, Math.max(1, parseInt(mapNum, 10) || 1));
      this._setItem('vtd_current_map', num.toString());
      try {
        const data = this._cache || this.load();
        data.currentMap = num;
        this.save(data);
      } catch (e) {}
      return num;
    },

    // --- MONEY ---
    setMoney(amount) {
      const num = typeof amount === 'number' && !isNaN(amount) ? Math.max(0, Math.floor(amount)) : 0;
      this._setItem('vtd_money', num.toString());
      try {
        const data = this._cache || this.load();
        data.money = num;
        this.save(data);
      } catch (e) {}
      if (window.activeGame) {
        window.activeGame.money = num;
        window.activeGame.updateMoneyDisplay?.();
      }
      return num;
    },
    getMoney() {
      const direct = this._getItem('vtd_money');
      if (direct !== null && !isNaN(parseInt(direct, 10))) return parseInt(direct, 10);
      const data = this._cache || this.load();
      return (data && typeof data.money === 'number') ? data.money : 0;
    },

    // --- DIFFICULTY ---
    setDifficulty(diff) {
      const valid = diff === 'hard' || diff === 'normal' || diff === 'easy' ? diff : 'easy';
      this._setItem('vtd_difficulty', valid);
      try {
        const data = this._cache || this.load();
        data.difficulty = valid;
        if (!data.settings) data.settings = {};
        data.settings.difficulty = valid;
        this.save(data);
      } catch (e) {}
      if (window.activeGame) {
        window.activeGame.difficulty = valid;
        if (window.activeGame.settings) window.activeGame.settings.difficulty = valid;
      }
      return valid;
    },
    getDifficulty() {
      const direct = this._getItem('vtd_difficulty');
      if (direct) return direct;
      const data = this._cache || this.load();
      return (data && data.settings && data.settings.difficulty) ? data.settings.difficulty : 'easy';
    },

    // --- MASTER VOLUME ---
    setMasterVolume(vol) {
      const v = typeof vol === 'number' && !isNaN(vol) ? Math.max(0, Math.min(1, vol)) : 0.70;
      this._setItem('vtd_master_volume', v.toString());
      try {
        const data = this._cache || this.load();
        data.masterVolume = v;
        if (!data.settings) data.settings = {};
        data.settings.masterVolume = v;
        this.save(data);
      } catch (e) {}
      if (window.activeGame && window.activeGame.sound) {
        window.activeGame.sound.setMasterVolume(v);
      }
      return v;
    },
    getMasterVolume() {
      const direct = this._getItem('vtd_master_volume');
      if (direct !== null && !isNaN(parseFloat(direct))) return parseFloat(direct);
      const data = this._cache || this.load();
      return (data && data.settings && typeof data.settings.masterVolume === 'number') ? data.settings.masterVolume : 0.70;
    },

    // --- GRAPHICS QUALITY ---
    setGraphicsQuality(quality) {
      const q = quality === 'high' || quality === 'low' || quality === 'medium' ? quality : 'medium';
      this._setItem('vtd_graphics_quality', q);
      try {
        const data = this._cache || this.load();
        data.graphicsQuality = q;
        if (!data.settings) data.settings = {};
        data.settings.quality = q;
        this.save(data);
      } catch (e) {}
      if (window.activeGame) {
        if (window.activeGame.settings) window.activeGame.settings.quality = q;
      }
      return q;
    },
    getGraphicsQuality() {
      const direct = this._getItem('vtd_graphics_quality');
      if (direct) return direct;
      const data = this._cache || this.load();
      return (data && data.settings && data.settings.quality) ? data.settings.quality : 'medium';
    },

    // --- WAVE PROGRESS ---
    setWave(w) {
      const wave = typeof w === 'number' && !isNaN(w) ? Math.max(1, Math.floor(w)) : 1;
      this._setItem('vtd_wave', wave.toString());
      try {
        const data = this._cache || this.load();
        data.wave = wave;
        this.save(data);
      } catch (e) {}
      return wave;
    },
    setWaveProgress(w) {
      return this.setWave(w);
    },
    getWave() {
      const direct = this._getItem('vtd_wave');
      if (direct !== null && !isNaN(parseInt(direct, 10))) return parseInt(direct, 10);
      const data = this._cache || this.load();
      return (data && typeof data.wave === 'number') ? data.wave : 1;
    },
    getWaveProgress() {
      return this.getWave();
    },

    // --- CASTLE HEALTH ---
    setCastleHealth(hp) {
      const health = typeof hp === 'number' && !isNaN(hp) ? Math.max(0, Math.min(100, Math.floor(hp))) : 100;
      this._setItem('vtd_castle_health', health.toString());
      try {
        const data = this._cache || this.load();
        data.castleHealth = health;
        this.save(data);
      } catch (e) {}
      return health;
    },
    getCastleHealth() {
      const direct = this._getItem('vtd_castle_health');
      if (direct !== null && !isNaN(parseInt(direct, 10))) return parseInt(direct, 10);
      const data = this._cache || this.load();
      return (data && typeof data.castleHealth === 'number') ? data.castleHealth : 100;
    },

    // --- TASKS ---
    saveTasks(tasks) {
      if (!Array.isArray(tasks)) return;
      try {
        const minimal = tasks.map(t => ({
          id: t.id,
          current: t.current || 0,
          claimed: !!t.claimed
        }));
        this._setItem('vtd_tasks_data', JSON.stringify(minimal));
        const data = this._cache || this.load();
        data.tasks = tasks;
        this.save(data);
      } catch (e) {}
    },
    getTasks() {
      const data = this._cache || this.load();
      return (data && data.tasks) ? data.tasks : generate100Tasks();
    },

    // --- CHALLENGES ---
    saveChallenges(challenges) {
      if (!Array.isArray(challenges)) return;
      try {
        const minimal = challenges.map(c => ({
          id: c.id,
          completed: !!c.completed,
          claimed: !!c.claimed,
          unlocked: !!c.unlocked,
          progress: c.progress || 0
        }));
        this._setItem('vtd_challenges_data', JSON.stringify(minimal));
        const data = this._cache || this.load();
        data.challenges = challenges;
        this.save(data);
      } catch (e) {}
    },
    getChallenges() {
      const data = this._cache || this.load();
      return (data && data.challenges) ? data.challenges : generate100Challenges();
    },

    // --- STATISTICS ---
    saveStatistics(stats) {
      if (!stats || typeof stats !== 'object') return;
      try {
        const data = this._cache || this.load();
        Object.assign(data, stats);
        this.save(data);
      } catch (e) {}
    },
    getStatistics() {
      const data = this._cache || this.load();
      return {
        totalKills: data?.totalKills || 0,
        highestWave: data?.highestWave || 0,
        totalPlayingTime: data?.totalPlayingTime || 0,
        towersBuilt: data?.towersBuilt || 0,
        towersUpgraded: data?.towersUpgraded || 0,
        bossesDefeated: data?.bossesDefeated || 0,
        totalMoneyEarned: data?.totalMoneyEarned || 0,
        perfectWavesCount: data?.perfectWavesCount || 0,
        speedWavesCount: data?.speedWavesCount || 0
      };
    },

    // --- DAILY LOGIN REWARDS ---
    getDailyRewardInfo() {
      const data = this._cache || this.load();
      const lastLoginDate = data?.lastLoginDate || '';
      let loginStreak = typeof data?.loginStreak === 'number' ? data.loginStreak : 0;
      
      const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
      
      let claimedToday = false;
      if (lastLoginDate === today) {
        claimedToday = !!data?.dailyClaimedToday;
      } else {
        if (lastLoginDate) {
          const lastTime = new Date(lastLoginDate).getTime();
          const currTime = new Date(today).getTime();
          const diffDays = Math.round((currTime - lastTime) / (1000 * 3600 * 24));
          
          if (diffDays === 1) {
            // Consecutive day login -> streak continues
          } else if (diffDays > 1) {
            // Missed a day -> reset streak to 0
            loginStreak = 0;
          }
        } else {
          loginStreak = 0;
        }
      }

      const nextStreak = claimedToday ? loginStreak : (loginStreak % 7) + 1;

      return {
        lastLoginDate,
        loginStreak,
        nextStreak,
        claimedToday,
        today
      };
    },

    claimDailyReward() {
      const info = this.getDailyRewardInfo();
      if (info.claimedToday) return null;

      const rewards = [150, 250, 400, 600, 850, 1200, 2000];
      const targetStreak = (info.loginStreak % 7) + 1;
      const amount = rewards[targetStreak - 1];

      const data = this._cache || this.load();
      data.lastLoginDate = info.today;
      data.loginStreak = targetStreak;
      data.dailyClaimedToday = true;
      data.money = (typeof data.money === 'number' ? data.money : 0) + amount;
      data.totalMoneyEarned = (typeof data.totalMoneyEarned === 'number' ? data.totalMoneyEarned : 0) + amount;

      this.save(data);

      return {
        streak: targetStreak,
        amount,
        today: info.today,
        totalMoney: data.money
      };
    },

    // --- ACHIEVEMENTS ---
    saveAchievements(achievements) {
      if (!Array.isArray(achievements)) return;
      try {
        const minimal = achievements.map(a => ({
          id: a.id,
          completed: !!a.completed,
          claimed: !!a.claimed,
          current: a.current || 0
        }));
        this._setItem('vtd_achievements_data', JSON.stringify(minimal));
        const data = this._cache || this.load();
        data.achievements = achievements;
        this.save(data);
      } catch (e) {}
    },

    getAchievements() {
      const data = this._cache || this.load();
      const defs = getAchievementsDefinitions();
      let saved = null;
      try {
        const str = this._getItem('vtd_achievements_data');
        if (str) saved = JSON.parse(str);
      } catch (e) {}

      if (Array.isArray(saved)) {
        const map = new Map(saved.map(s => [s.id, s]));
        return defs.map(d => {
          const s = map.get(d.id);
          if (s) {
            d.completed = !!s.completed;
            d.claimed = !!s.claimed;
            d.current = typeof s.current === 'number' ? s.current : d.current;
          }
          return d;
        });
      }
      return defs;
    },

    // --- RESET ALL ---
    resetAll() {
      const keys = [
        'vtd_save_data', 'vtd_challenges_data', 'vtd_tasks_data',
        'vtd_money', 'vtd_player_name', 'vtd_player_avatar',
        'vtd_tasks', 'vtd_challenges', 'vtd_settings',
        'vtd_difficulty', 'vtd_graphics_quality', 'vtd_master_volume',
        'vtd_wave', 'vtd_castle_health'
      ];
      keys.forEach(k => this._removeItem(k));
      this._cache = null;
      return this.load();
    }
  };

  // Safe storage initialization before any screens or UI
  Storage.init();
  window.Storage = Storage;
  window.setPlayerName = (name) => Storage.setPlayerName(name);
  window.getPlayerName = () => Storage.getPlayerName();

  // --- GAME CONSTANTS & DEFINITIONS ---
  const LOGICAL_WIDTH = 360;
  const LOGICAL_HEIGHT = 520;

  // Grid Configuration for Compact Vertical 9:16 Battlefield
  const TILE_SIZE = 40;
  const GRID_COLS = 9;   // 9 * 40 = 360px (fills width)
  const GRID_ROWS = 13;  // 13 * 40 = 520px (compact vertical battlefield, fits comfortably in 9:16)
  const MAP_WIDTH = GRID_COLS * TILE_SIZE;
  const MAP_HEIGHT = GRID_ROWS * TILE_SIZE;

  // ================= MAP PROGRESSION & DEFINITIONS =================
  const MAP_DEFINITIONS = [
  {
    "id": 1,
    "name": "Grassland",
    "displayName": "MAP 1 – Grassland",
    "icon": "🌲",
    "themeDesc": "Verdant Fields",
    "waypoints": [
      {
        "x": 180,
        "y": 0
      },
      {
        "x": 180,
        "y": 60
      },
      {
        "x": 300,
        "y": 60
      },
      {
        "x": 300,
        "y": 140
      },
      {
        "x": 60,
        "y": 140
      },
      {
        "x": 60,
        "y": 220
      },
      {
        "x": 300,
        "y": 220
      },
      {
        "x": 300,
        "y": 300
      },
      {
        "x": 60,
        "y": 300
      },
      {
        "x": 60,
        "y": 380
      },
      {
        "x": 180,
        "y": 380
      },
      {
        "x": 180,
        "y": 460
      }
    ],
    "theme": {
      "ground1": "#4da428",
      "ground2": "#459922",
      "groundBorder": "rgba(0,0,0,0.06)",
      "pathColor": "#dfb064",
      "pathPebble": "#caa054",
      "pathBorder": "#c29143",
      "courtyard1": "#1e293b",
      "courtyard2": "#172033",
      "castleWall": "#1e293b",
      "castleAccent": "#f59e0b",
      "castleCrenel": "#334155",
      "portalOuter": "#0f172a",
      "portalInner": "#e11d48",
      "portalAura": "#f43f5e"
    },
    "decorations": [
      {
        "col": 0,
        "row": 0,
        "type": "trees",
        "count": 3
      },
      {
        "col": 6,
        "row": 0,
        "type": "bushes",
        "count": 3
      },
      {
        "col": 0,
        "row": 2,
        "type": "trees",
        "count": 3
      },
      {
        "col": 6,
        "row": 2,
        "type": "bushes",
        "count": 3
      },
      {
        "col": 0,
        "row": 4,
        "type": "trees",
        "count": 3
      },
      {
        "col": 6,
        "row": 4,
        "type": "bushes",
        "count": 3
      },
      {
        "col": 0,
        "row": 6,
        "type": "trees",
        "count": 3
      },
      {
        "col": 6,
        "row": 6,
        "type": "bushes",
        "count": 3
      },
      {
        "col": 0,
        "row": 8,
        "type": "trees",
        "count": 3
      },
      {
        "col": 6,
        "row": 8,
        "type": "bushes",
        "count": 3
      },
      {
        "col": 0,
        "row": 10,
        "type": "trees",
        "count": 3
      },
      {
        "col": 6,
        "row": 10,
        "type": "bushes",
        "count": 3
      }
    ],
    "hpMultiplier": 1,
    "goldMultiplier": 1,
    "speedMultiplier": 1
  },
  {
    "id": 2,
    "name": "Desert",
    "displayName": "MAP 2 – Desert",
    "icon": "🏜️",
    "themeDesc": "Arid Dunes",
    "waypoints": [
      {
        "x": 100,
        "y": 0
      },
      {
        "x": 100,
        "y": 80
      },
      {
        "x": 280,
        "y": 80
      },
      {
        "x": 280,
        "y": 180
      },
      {
        "x": 180,
        "y": 180
      },
      {
        "x": 180,
        "y": 240
      },
      {
        "x": 60,
        "y": 240
      },
      {
        "x": 60,
        "y": 360
      },
      {
        "x": 240,
        "y": 360
      },
      {
        "x": 240,
        "y": 420
      },
      {
        "x": 180,
        "y": 420
      },
      {
        "x": 180,
        "y": 460
      }
    ],
    "theme": {
      "ground1": "#b45309",
      "ground2": "#9a4306",
      "groundBorder": "rgba(253,230,138,0.08)",
      "pathColor": "#fde68a",
      "pathPebble": "#f59e0b",
      "pathBorder": "#d97706",
      "courtyard1": "#451a03",
      "courtyard2": "#2d1002",
      "castleWall": "#78350f",
      "castleAccent": "#fbbf24",
      "castleCrenel": "#92400e",
      "portalOuter": "#451a03",
      "portalInner": "#d97706",
      "portalAura": "#f59e0b"
    },
    "decorations": [
      {
        "col": 0,
        "row": 0,
        "type": "cacti",
        "count": 3
      },
      {
        "col": 6,
        "row": 0,
        "type": "monoliths",
        "count": 3
      },
      {
        "col": 0,
        "row": 2,
        "type": "cacti",
        "count": 3
      },
      {
        "col": 8,
        "row": 2,
        "type": "monoliths",
        "count": 3
      },
      {
        "col": 0,
        "row": 4,
        "type": "cacti",
        "count": 3
      },
      {
        "col": 8,
        "row": 4,
        "type": "monoliths",
        "count": 3
      },
      {
        "col": 0,
        "row": 6,
        "type": "cacti",
        "count": 3
      },
      {
        "col": 6,
        "row": 6,
        "type": "monoliths",
        "count": 3
      },
      {
        "col": 0,
        "row": 8,
        "type": "cacti",
        "count": 3
      },
      {
        "col": 6,
        "row": 8,
        "type": "monoliths",
        "count": 3
      },
      {
        "col": 0,
        "row": 10,
        "type": "cacti",
        "count": 3
      },
      {
        "col": 7,
        "row": 10,
        "type": "monoliths",
        "count": 3
      }
    ],
    "hpMultiplier": 1.1,
    "goldMultiplier": 1.06,
    "speedMultiplier": 1.01
  },
  {
    "id": 3,
    "name": "Snow Mountain",
    "displayName": "MAP 3 – Snow Mountain",
    "icon": "❄️",
    "themeDesc": "Frost Ridge",
    "waypoints": [
      {
        "x": 300,
        "y": 0
      },
      {
        "x": 300,
        "y": 80
      },
      {
        "x": 100,
        "y": 80
      },
      {
        "x": 100,
        "y": 180
      },
      {
        "x": 260,
        "y": 180
      },
      {
        "x": 260,
        "y": 280
      },
      {
        "x": 60,
        "y": 280
      },
      {
        "x": 60,
        "y": 380
      },
      {
        "x": 180,
        "y": 380
      },
      {
        "x": 180,
        "y": 460
      }
    ],
    "theme": {
      "ground1": "#334155",
      "ground2": "#293548",
      "groundBorder": "rgba(147,197,253,0.08)",
      "pathColor": "#93c5fd",
      "pathPebble": "#60a5fa",
      "pathBorder": "#3b82f6",
      "courtyard1": "#0f172a",
      "courtyard2": "#080d1a",
      "castleWall": "#1e293b",
      "castleAccent": "#38bdf8",
      "castleCrenel": "#475569",
      "portalOuter": "#0f172a",
      "portalInner": "#0284c7",
      "portalAura": "#38bdf8"
    },
    "decorations": [
      {
        "col": 0,
        "row": 0,
        "type": "snowpines",
        "count": 3
      },
      {
        "col": 6,
        "row": 0,
        "type": "icecrystals",
        "count": 3
      },
      {
        "col": 0,
        "row": 2,
        "type": "snowpines",
        "count": 3
      },
      {
        "col": 8,
        "row": 2,
        "type": "icecrystals",
        "count": 3
      },
      {
        "col": 0,
        "row": 4,
        "type": "snowpines",
        "count": 3
      },
      {
        "col": 7,
        "row": 4,
        "type": "icecrystals",
        "count": 3
      },
      {
        "col": 0,
        "row": 6,
        "type": "snowpines",
        "count": 3
      },
      {
        "col": 7,
        "row": 6,
        "type": "icecrystals",
        "count": 3
      },
      {
        "col": 0,
        "row": 8,
        "type": "snowpines",
        "count": 3
      },
      {
        "col": 6,
        "row": 8,
        "type": "icecrystals",
        "count": 3
      },
      {
        "col": 0,
        "row": 10,
        "type": "snowpines",
        "count": 3
      },
      {
        "col": 6,
        "row": 10,
        "type": "icecrystals",
        "count": 3
      }
    ],
    "hpMultiplier": 1.2,
    "goldMultiplier": 1.12,
    "speedMultiplier": 1.02
  },
  {
    "id": 4,
    "name": "Dark Forest",
    "displayName": "MAP 4 – Dark Forest",
    "icon": "🍄",
    "themeDesc": "Twilight Grove",
    "waypoints": [
      {
        "x": 60,
        "y": 0
      },
      {
        "x": 60,
        "y": 100
      },
      {
        "x": 220,
        "y": 100
      },
      {
        "x": 220,
        "y": 180
      },
      {
        "x": 100,
        "y": 180
      },
      {
        "x": 100,
        "y": 260
      },
      {
        "x": 300,
        "y": 260
      },
      {
        "x": 300,
        "y": 360
      },
      {
        "x": 180,
        "y": 360
      },
      {
        "x": 180,
        "y": 460
      }
    ],
    "theme": {
      "ground1": "#181324",
      "ground2": "#130f1c",
      "groundBorder": "rgba(168,85,247,0.08)",
      "pathColor": "#4c1d95",
      "pathPebble": "#6b21a8",
      "pathBorder": "#7c3aed",
      "courtyard1": "#0f0b17",
      "courtyard2": "#07050a",
      "castleWall": "#2e1065",
      "castleAccent": "#a855f7",
      "castleCrenel": "#3b0764",
      "portalOuter": "#090510",
      "portalInner": "#7e22ce",
      "portalAura": "#a855f7"
    },
    "decorations": [
      {
        "col": 0,
        "row": 0,
        "type": "deadtrees",
        "count": 3
      },
      {
        "col": 6,
        "row": 0,
        "type": "mushrooms",
        "count": 3
      },
      {
        "col": 0,
        "row": 2,
        "type": "deadtrees",
        "count": 3
      },
      {
        "col": 6,
        "row": 2,
        "type": "mushrooms",
        "count": 3
      },
      {
        "col": 0,
        "row": 4,
        "type": "deadtrees",
        "count": 3
      },
      {
        "col": 6,
        "row": 4,
        "type": "mushrooms",
        "count": 3
      },
      {
        "col": 0,
        "row": 6,
        "type": "deadtrees",
        "count": 3
      },
      {
        "col": 8,
        "row": 6,
        "type": "mushrooms",
        "count": 3
      },
      {
        "col": 0,
        "row": 8,
        "type": "deadtrees",
        "count": 3
      },
      {
        "col": 8,
        "row": 8,
        "type": "mushrooms",
        "count": 3
      },
      {
        "col": 0,
        "row": 10,
        "type": "deadtrees",
        "count": 3
      },
      {
        "col": 6,
        "row": 10,
        "type": "mushrooms",
        "count": 3
      }
    ],
    "hpMultiplier": 1.3,
    "goldMultiplier": 1.18,
    "speedMultiplier": 1.04
  },
  {
    "id": 5,
    "name": "Volcanic Land",
    "displayName": "MAP 5 – Volcanic Land",
    "icon": "🌋",
    "themeDesc": "Magma Caldera",
    "waypoints": [
      {
        "x": 180,
        "y": 0
      },
      {
        "x": 180,
        "y": 80
      },
      {
        "x": 300,
        "y": 80
      },
      {
        "x": 300,
        "y": 200
      },
      {
        "x": 80,
        "y": 200
      },
      {
        "x": 80,
        "y": 300
      },
      {
        "x": 280,
        "y": 300
      },
      {
        "x": 280,
        "y": 400
      },
      {
        "x": 180,
        "y": 400
      },
      {
        "x": 180,
        "y": 460
      }
    ],
    "theme": {
      "ground1": "#18181b",
      "ground2": "#111113",
      "groundBorder": "rgba(234,88,12,0.1)",
      "pathColor": "#ea580c",
      "pathPebble": "#fbbf24",
      "pathBorder": "#b91c1c",
      "courtyard1": "#09090b",
      "courtyard2": "#000000",
      "castleWall": "#27272a",
      "castleAccent": "#f97316",
      "castleCrenel": "#3f3f46",
      "portalOuter": "#09090b",
      "portalInner": "#c2410c",
      "portalAura": "#ea580c"
    },
    "decorations": [
      {
        "col": 0,
        "row": 0,
        "type": "magmavents",
        "count": 3
      },
      {
        "col": 6,
        "row": 0,
        "type": "basaltspires",
        "count": 3
      },
      {
        "col": 0,
        "row": 2,
        "type": "magmavents",
        "count": 3
      },
      {
        "col": 8,
        "row": 2,
        "type": "basaltspires",
        "count": 3
      },
      {
        "col": 0,
        "row": 4,
        "type": "magmavents",
        "count": 3
      },
      {
        "col": 8,
        "row": 4,
        "type": "basaltspires",
        "count": 3
      },
      {
        "col": 0,
        "row": 6,
        "type": "magmavents",
        "count": 3
      },
      {
        "col": 6,
        "row": 6,
        "type": "basaltspires",
        "count": 3
      },
      {
        "col": 0,
        "row": 8,
        "type": "magmavents",
        "count": 3
      },
      {
        "col": 8,
        "row": 8,
        "type": "basaltspires",
        "count": 3
      },
      {
        "col": 0,
        "row": 10,
        "type": "magmavents",
        "count": 3
      },
      {
        "col": 7,
        "row": 10,
        "type": "basaltspires",
        "count": 3
      }
    ],
    "hpMultiplier": 1.4,
    "goldMultiplier": 1.24,
    "speedMultiplier": 1.05
  },
  {
    "id": 6,
    "name": "Rocky Canyon",
    "displayName": "MAP 6 – Rocky Canyon",
    "icon": "🪨",
    "themeDesc": "Terracotta Gorge",
    "waypoints": [
      {
        "x": 260,
        "y": 0
      },
      {
        "x": 260,
        "y": 100
      },
      {
        "x": 80,
        "y": 100
      },
      {
        "x": 80,
        "y": 200
      },
      {
        "x": 280,
        "y": 200
      },
      {
        "x": 280,
        "y": 320
      },
      {
        "x": 120,
        "y": 320
      },
      {
        "x": 120,
        "y": 400
      },
      {
        "x": 180,
        "y": 400
      },
      {
        "x": 180,
        "y": 460
      }
    ],
    "theme": {
      "ground1": "#7c2d12",
      "ground2": "#6c2710",
      "groundBorder": "rgba(253,186,116,0.08)",
      "pathColor": "#fdba74",
      "pathPebble": "#c2410c",
      "pathBorder": "#9a3412",
      "courtyard1": "#2a0a03",
      "courtyard2": "#180501",
      "castleWall": "#431407",
      "castleAccent": "#ea580c",
      "castleCrenel": "#7c2d12",
      "portalOuter": "#2a0a03",
      "portalInner": "#9a3412",
      "portalAura": "#fb923c"
    },
    "decorations": [
      {
        "col": 0,
        "row": 0,
        "type": "canyonpillars",
        "count": 3
      },
      {
        "col": 7,
        "row": 0,
        "type": "redboulders",
        "count": 3
      },
      {
        "col": 0,
        "row": 2,
        "type": "canyonpillars",
        "count": 3
      },
      {
        "col": 7,
        "row": 2,
        "type": "redboulders",
        "count": 3
      },
      {
        "col": 0,
        "row": 4,
        "type": "canyonpillars",
        "count": 3
      },
      {
        "col": 7,
        "row": 4,
        "type": "redboulders",
        "count": 3
      },
      {
        "col": 0,
        "row": 6,
        "type": "canyonpillars",
        "count": 3
      },
      {
        "col": 8,
        "row": 6,
        "type": "redboulders",
        "count": 3
      },
      {
        "col": 0,
        "row": 8,
        "type": "canyonpillars",
        "count": 3
      },
      {
        "col": 7,
        "row": 8,
        "type": "redboulders",
        "count": 3
      },
      {
        "col": 0,
        "row": 10,
        "type": "canyonpillars",
        "count": 3
      },
      {
        "col": 6,
        "row": 10,
        "type": "redboulders",
        "count": 3
      }
    ],
    "hpMultiplier": 1.5,
    "goldMultiplier": 1.3,
    "speedMultiplier": 1.06
  },
  {
    "id": 7,
    "name": "Sunken Ruins",
    "displayName": "MAP 7 – Sunken Ruins",
    "icon": "🌿",
    "themeDesc": "Submerged Mire",
    "waypoints": [
      {
        "x": 140,
        "y": 0
      },
      {
        "x": 140,
        "y": 100
      },
      {
        "x": 300,
        "y": 100
      },
      {
        "x": 300,
        "y": 220
      },
      {
        "x": 60,
        "y": 220
      },
      {
        "x": 60,
        "y": 340
      },
      {
        "x": 260,
        "y": 340
      },
      {
        "x": 260,
        "y": 400
      },
      {
        "x": 180,
        "y": 400
      },
      {
        "x": 180,
        "y": 460
      }
    ],
    "theme": {
      "ground1": "#0f3b38",
      "ground2": "#0a2a28",
      "groundBorder": "rgba(45,212,191,0.08)",
      "pathColor": "#2dd4bf",
      "pathPebble": "#0d9488",
      "pathBorder": "#115e59",
      "courtyard1": "#042f2e",
      "courtyard2": "#021e1d",
      "castleWall": "#134e4a",
      "castleAccent": "#2dd4bf",
      "castleCrenel": "#0f766e",
      "portalOuter": "#042f2e",
      "portalInner": "#0d9488",
      "portalAura": "#2dd4bf"
    },
    "decorations": [
      {
        "col": 0,
        "row": 0,
        "type": "ruincolumns",
        "count": 3
      },
      {
        "col": 6,
        "row": 0,
        "type": "waterlotus",
        "count": 3
      },
      {
        "col": 0,
        "row": 2,
        "type": "ruincolumns",
        "count": 3
      },
      {
        "col": 8,
        "row": 2,
        "type": "waterlotus",
        "count": 3
      },
      {
        "col": 0,
        "row": 4,
        "type": "ruincolumns",
        "count": 3
      },
      {
        "col": 6,
        "row": 4,
        "type": "waterlotus",
        "count": 3
      },
      {
        "col": 0,
        "row": 6,
        "type": "ruincolumns",
        "count": 3
      },
      {
        "col": 6,
        "row": 6,
        "type": "waterlotus",
        "count": 3
      },
      {
        "col": 0,
        "row": 8,
        "type": "ruincolumns",
        "count": 3
      },
      {
        "col": 7,
        "row": 8,
        "type": "waterlotus",
        "count": 3
      },
      {
        "col": 0,
        "row": 10,
        "type": "ruincolumns",
        "count": 3
      },
      {
        "col": 7,
        "row": 10,
        "type": "waterlotus",
        "count": 3
      }
    ],
    "hpMultiplier": 1.6,
    "goldMultiplier": 1.36,
    "speedMultiplier": 1.07
  },
  {
    "id": 8,
    "name": "Crystal Caverns",
    "displayName": "MAP 8 – Crystal Caverns",
    "icon": "💎",
    "themeDesc": "Luminous Grotto",
    "waypoints": [
      {
        "x": 220,
        "y": 0
      },
      {
        "x": 220,
        "y": 80
      },
      {
        "x": 60,
        "y": 80
      },
      {
        "x": 60,
        "y": 200
      },
      {
        "x": 280,
        "y": 200
      },
      {
        "x": 280,
        "y": 320
      },
      {
        "x": 100,
        "y": 320
      },
      {
        "x": 100,
        "y": 400
      },
      {
        "x": 180,
        "y": 400
      },
      {
        "x": 180,
        "y": 460
      }
    ],
    "theme": {
      "ground1": "#1e1338",
      "ground2": "#160d2b",
      "groundBorder": "rgba(192,132,252,0.08)",
      "pathColor": "#06b6d4",
      "pathPebble": "#0891b2",
      "pathBorder": "#0e7490",
      "courtyard1": "#0f051d",
      "courtyard2": "#080210",
      "castleWall": "#3b0764",
      "castleAccent": "#22d3ee",
      "castleCrenel": "#581c87",
      "portalOuter": "#1e1338",
      "portalInner": "#0e7490",
      "portalAura": "#06b6d4"
    },
    "decorations": [
      {
        "col": 0,
        "row": 0,
        "type": "amethystgeodes",
        "count": 3
      },
      {
        "col": 6,
        "row": 0,
        "type": "luminstalagmites",
        "count": 3
      },
      {
        "col": 0,
        "row": 2,
        "type": "amethystgeodes",
        "count": 3
      },
      {
        "col": 6,
        "row": 2,
        "type": "luminstalagmites",
        "count": 3
      },
      {
        "col": 0,
        "row": 4,
        "type": "amethystgeodes",
        "count": 3
      },
      {
        "col": 7,
        "row": 4,
        "type": "luminstalagmites",
        "count": 3
      },
      {
        "col": 0,
        "row": 6,
        "type": "amethystgeodes",
        "count": 3
      },
      {
        "col": 8,
        "row": 6,
        "type": "luminstalagmites",
        "count": 3
      },
      {
        "col": 0,
        "row": 8,
        "type": "amethystgeodes",
        "count": 3
      },
      {
        "col": 7,
        "row": 8,
        "type": "luminstalagmites",
        "count": 3
      },
      {
        "col": 0,
        "row": 10,
        "type": "amethystgeodes",
        "count": 3
      },
      {
        "col": 6,
        "row": 10,
        "type": "luminstalagmites",
        "count": 3
      }
    ],
    "hpMultiplier": 1.7,
    "goldMultiplier": 1.42,
    "speedMultiplier": 1.08
  },
  {
    "id": 9,
    "name": "Sky Temple",
    "displayName": "MAP 9 – Sky Temple",
    "icon": "🏛️",
    "themeDesc": "Celestial Spire",
    "waypoints": [
      {
        "x": 100,
        "y": 0
      },
      {
        "x": 100,
        "y": 120
      },
      {
        "x": 260,
        "y": 120
      },
      {
        "x": 260,
        "y": 220
      },
      {
        "x": 180,
        "y": 220
      },
      {
        "x": 180,
        "y": 300
      },
      {
        "x": 60,
        "y": 300
      },
      {
        "x": 60,
        "y": 380
      },
      {
        "x": 180,
        "y": 380
      },
      {
        "x": 180,
        "y": 460
      }
    ],
    "theme": {
      "ground1": "#242b45",
      "ground2": "#1b2034",
      "groundBorder": "rgba(251,191,36,0.1)",
      "pathColor": "#fde047",
      "pathPebble": "#eab308",
      "pathBorder": "#ca8a04",
      "courtyard1": "#1e1b4b",
      "courtyard2": "#131131",
      "castleWall": "#312e81",
      "castleAccent": "#fbbf24",
      "castleCrenel": "#4338ca",
      "portalOuter": "#1e1b4b",
      "portalInner": "#ca8a04",
      "portalAura": "#fde047"
    },
    "decorations": [
      {
        "col": 0,
        "row": 0,
        "type": "celestialbraziers",
        "count": 3
      },
      {
        "col": 6,
        "row": 0,
        "type": "cloudpillars",
        "count": 3
      },
      {
        "col": 0,
        "row": 2,
        "type": "celestialbraziers",
        "count": 3
      },
      {
        "col": 7,
        "row": 2,
        "type": "cloudpillars",
        "count": 3
      },
      {
        "col": 0,
        "row": 4,
        "type": "celestialbraziers",
        "count": 3
      },
      {
        "col": 7,
        "row": 4,
        "type": "cloudpillars",
        "count": 3
      },
      {
        "col": 0,
        "row": 6,
        "type": "celestialbraziers",
        "count": 3
      },
      {
        "col": 6,
        "row": 6,
        "type": "cloudpillars",
        "count": 3
      },
      {
        "col": 0,
        "row": 8,
        "type": "celestialbraziers",
        "count": 3
      },
      {
        "col": 6,
        "row": 8,
        "type": "cloudpillars",
        "count": 3
      },
      {
        "col": 0,
        "row": 10,
        "type": "celestialbraziers",
        "count": 3
      },
      {
        "col": 6,
        "row": 10,
        "type": "cloudpillars",
        "count": 3
      }
    ],
    "hpMultiplier": 1.8,
    "goldMultiplier": 1.48,
    "speedMultiplier": 1.1
  },
  {
    "id": 10,
    "name": "Void Cataclysm",
    "displayName": "MAP 10 – Void Cataclysm",
    "icon": "🌌",
    "themeDesc": "Abyssal Singularity",
    "waypoints": [
      {
        "x": 180,
        "y": 0
      },
      {
        "x": 180,
        "y": 60
      },
      {
        "x": 60,
        "y": 60
      },
      {
        "x": 60,
        "y": 160
      },
      {
        "x": 300,
        "y": 160
      },
      {
        "x": 300,
        "y": 260
      },
      {
        "x": 100,
        "y": 260
      },
      {
        "x": 100,
        "y": 360
      },
      {
        "x": 260,
        "y": 360
      },
      {
        "x": 260,
        "y": 420
      },
      {
        "x": 180,
        "y": 420
      },
      {
        "x": 180,
        "y": 460
      }
    ],
    "theme": {
      "ground1": "#09030a",
      "ground2": "#150512",
      "groundBorder": "rgba(244,63,94,0.12)",
      "pathColor": "#ec4899",
      "pathPebble": "#db2777",
      "pathBorder": "#9d174d",
      "courtyard1": "#020617",
      "courtyard2": "#000000",
      "castleWall": "#1f132b",
      "castleAccent": "#f43f5e",
      "castleCrenel": "#4c0519",
      "portalOuter": "#000000",
      "portalInner": "#881337",
      "portalAura": "#ec4899"
    },
    "decorations": [
      {
        "col": 0,
        "row": 0,
        "type": "voidrifts",
        "count": 3
      },
      {
        "col": 6,
        "row": 0,
        "type": "abyssalmonoliths",
        "count": 3
      },
      {
        "col": 0,
        "row": 2,
        "type": "voidrifts",
        "count": 3
      },
      {
        "col": 6,
        "row": 2,
        "type": "abyssalmonoliths",
        "count": 3
      },
      {
        "col": 0,
        "row": 4,
        "type": "voidrifts",
        "count": 3
      },
      {
        "col": 8,
        "row": 4,
        "type": "abyssalmonoliths",
        "count": 3
      },
      {
        "col": 0,
        "row": 6,
        "type": "voidrifts",
        "count": 3
      },
      {
        "col": 8,
        "row": 6,
        "type": "abyssalmonoliths",
        "count": 3
      },
      {
        "col": 0,
        "row": 8,
        "type": "voidrifts",
        "count": 3
      },
      {
        "col": 7,
        "row": 8,
        "type": "abyssalmonoliths",
        "count": 3
      },
      {
        "col": 0,
        "row": 10,
        "type": "voidrifts",
        "count": 3
      },
      {
        "col": 7,
        "row": 10,
        "type": "abyssalmonoliths",
        "count": 3
      }
    ],
    "hpMultiplier": 1.9,
    "goldMultiplier": 1.54,
    "speedMultiplier": 1.11
  },
  {
    "id": 11,
    "name": "Enchanted Grove",
    "displayName": "MAP 11 – Enchanted Grove",
    "icon": "🌸",
    "themeDesc": "Blossom Canopy",
    "waypoints": [
      {
        "x": 240,
        "y": 0
      },
      {
        "x": 240,
        "y": 90
      },
      {
        "x": 80,
        "y": 90
      },
      {
        "x": 80,
        "y": 190
      },
      {
        "x": 280,
        "y": 190
      },
      {
        "x": 280,
        "y": 290
      },
      {
        "x": 120,
        "y": 290
      },
      {
        "x": 120,
        "y": 380
      },
      {
        "x": 180,
        "y": 380
      },
      {
        "x": 180,
        "y": 460
      }
    ],
    "theme": {
      "ground1": "#365314",
      "ground2": "#29400e",
      "groundBorder": "rgba(244,114,182,0.1)",
      "pathColor": "#f472b6",
      "pathPebble": "#ec4899",
      "pathBorder": "#db2777",
      "courtyard1": "#142507",
      "courtyard2": "#0c1704",
      "castleWall": "#3f6212",
      "castleAccent": "#f472b6",
      "castleCrenel": "#4d7c0f",
      "portalOuter": "#142507",
      "portalInner": "#db2777",
      "portalAura": "#f472b6"
    },
    "decorations": [
      {
        "col": 0,
        "row": 0,
        "type": "trees",
        "count": 3
      },
      {
        "col": 7,
        "row": 0,
        "type": "flowers",
        "count": 3
      },
      {
        "col": 0,
        "row": 2,
        "type": "trees",
        "count": 3
      },
      {
        "col": 6,
        "row": 2,
        "type": "flowers",
        "count": 3
      },
      {
        "col": 0,
        "row": 4,
        "type": "trees",
        "count": 3
      },
      {
        "col": 7,
        "row": 4,
        "type": "flowers",
        "count": 3
      },
      {
        "col": 0,
        "row": 6,
        "type": "trees",
        "count": 3
      },
      {
        "col": 8,
        "row": 6,
        "type": "flowers",
        "count": 3
      },
      {
        "col": 0,
        "row": 8,
        "type": "trees",
        "count": 3
      },
      {
        "col": 6,
        "row": 8,
        "type": "flowers",
        "count": 3
      },
      {
        "col": 0,
        "row": 10,
        "type": "trees",
        "count": 3
      },
      {
        "col": 6,
        "row": 10,
        "type": "flowers",
        "count": 3
      }
    ],
    "hpMultiplier": 2,
    "goldMultiplier": 1.6,
    "speedMultiplier": 1.12
  },
  {
    "id": 12,
    "name": "Scorched Badlands",
    "displayName": "MAP 12 – Scorched Badlands",
    "icon": "☀️",
    "themeDesc": "Sun-Bleached Flats",
    "waypoints": [
      {
        "x": 80,
        "y": 0
      },
      {
        "x": 80,
        "y": 80
      },
      {
        "x": 260,
        "y": 80
      },
      {
        "x": 260,
        "y": 170
      },
      {
        "x": 140,
        "y": 170
      },
      {
        "x": 140,
        "y": 250
      },
      {
        "x": 300,
        "y": 250
      },
      {
        "x": 300,
        "y": 350
      },
      {
        "x": 180,
        "y": 350
      },
      {
        "x": 180,
        "y": 460
      }
    ],
    "theme": {
      "ground1": "#78350f",
      "ground2": "#5c2809",
      "groundBorder": "rgba(251,191,36,0.08)",
      "pathColor": "#fef08a",
      "pathPebble": "#facc15",
      "pathBorder": "#eab308",
      "courtyard1": "#301303",
      "courtyard2": "#1e0b01",
      "castleWall": "#713f12",
      "castleAccent": "#facc15",
      "castleCrenel": "#854d0e",
      "portalOuter": "#301303",
      "portalInner": "#ca8a04",
      "portalAura": "#facc15"
    },
    "decorations": [
      {
        "col": 0,
        "row": 0,
        "type": "monoliths",
        "count": 3
      },
      {
        "col": 6,
        "row": 0,
        "type": "sandstone",
        "count": 3
      },
      {
        "col": 0,
        "row": 2,
        "type": "monoliths",
        "count": 3
      },
      {
        "col": 7,
        "row": 2,
        "type": "sandstone",
        "count": 3
      },
      {
        "col": 0,
        "row": 4,
        "type": "monoliths",
        "count": 3
      },
      {
        "col": 7,
        "row": 4,
        "type": "sandstone",
        "count": 3
      },
      {
        "col": 0,
        "row": 6,
        "type": "monoliths",
        "count": 3
      },
      {
        "col": 8,
        "row": 6,
        "type": "sandstone",
        "count": 3
      },
      {
        "col": 0,
        "row": 8,
        "type": "monoliths",
        "count": 3
      },
      {
        "col": 8,
        "row": 8,
        "type": "sandstone",
        "count": 3
      },
      {
        "col": 0,
        "row": 10,
        "type": "monoliths",
        "count": 3
      },
      {
        "col": 6,
        "row": 10,
        "type": "sandstone",
        "count": 3
      }
    ],
    "hpMultiplier": 2.1,
    "goldMultiplier": 1.66,
    "speedMultiplier": 1.13
  },
  {
    "id": 13,
    "name": "Glacial Tundra",
    "displayName": "MAP 13 – Glacial Tundra",
    "icon": "🧊",
    "themeDesc": "Permafrost Waste",
    "waypoints": [
      {
        "x": 280,
        "y": 0
      },
      {
        "x": 280,
        "y": 100
      },
      {
        "x": 120,
        "y": 100
      },
      {
        "x": 120,
        "y": 180
      },
      {
        "x": 240,
        "y": 180
      },
      {
        "x": 240,
        "y": 270
      },
      {
        "x": 60,
        "y": 270
      },
      {
        "x": 60,
        "y": 370
      },
      {
        "x": 180,
        "y": 370
      },
      {
        "x": 180,
        "y": 460
      }
    ],
    "theme": {
      "ground1": "#1e293b",
      "ground2": "#161f2e",
      "groundBorder": "rgba(186,230,253,0.09)",
      "pathColor": "#bae6fd",
      "pathPebble": "#7dd3fc",
      "pathBorder": "#38bdf8",
      "courtyard1": "#0b121e",
      "courtyard2": "#05090f",
      "castleWall": "#334155",
      "castleAccent": "#7dd3fc",
      "castleCrenel": "#475569",
      "portalOuter": "#0b121e",
      "portalInner": "#0284c7",
      "portalAura": "#7dd3fc"
    },
    "decorations": [
      {
        "col": 0,
        "row": 0,
        "type": "snowpines",
        "count": 3
      },
      {
        "col": 8,
        "row": 0,
        "type": "icecrystals",
        "count": 3
      },
      {
        "col": 0,
        "row": 2,
        "type": "snowpines",
        "count": 3
      },
      {
        "col": 8,
        "row": 2,
        "type": "icecrystals",
        "count": 3
      },
      {
        "col": 0,
        "row": 4,
        "type": "snowpines",
        "count": 3
      },
      {
        "col": 7,
        "row": 4,
        "type": "icecrystals",
        "count": 3
      },
      {
        "col": 0,
        "row": 6,
        "type": "snowpines",
        "count": 3
      },
      {
        "col": 7,
        "row": 6,
        "type": "icecrystals",
        "count": 3
      },
      {
        "col": 0,
        "row": 8,
        "type": "snowpines",
        "count": 3
      },
      {
        "col": 6,
        "row": 8,
        "type": "icecrystals",
        "count": 3
      },
      {
        "col": 0,
        "row": 10,
        "type": "snowpines",
        "count": 3
      },
      {
        "col": 6,
        "row": 10,
        "type": "icecrystals",
        "count": 3
      }
    ],
    "hpMultiplier": 2.2,
    "goldMultiplier": 1.72,
    "speedMultiplier": 1.14
  },
  {
    "id": 14,
    "name": "Shadow Marsh",
    "displayName": "MAP 14 – Shadow Marsh",
    "icon": "🌑",
    "themeDesc": "Nocturnal Mire",
    "waypoints": [
      {
        "x": 160,
        "y": 0
      },
      {
        "x": 160,
        "y": 70
      },
      {
        "x": 300,
        "y": 70
      },
      {
        "x": 300,
        "y": 170
      },
      {
        "x": 80,
        "y": 170
      },
      {
        "x": 80,
        "y": 270
      },
      {
        "x": 240,
        "y": 270
      },
      {
        "x": 240,
        "y": 370
      },
      {
        "x": 180,
        "y": 370
      },
      {
        "x": 180,
        "y": 460
      }
    ],
    "theme": {
      "ground1": "#064e3b",
      "ground2": "#04382a",
      "groundBorder": "rgba(167,243,208,0.08)",
      "pathColor": "#6ee7b7",
      "pathPebble": "#34d399",
      "pathBorder": "#10b981",
      "courtyard1": "#022018",
      "courtyard2": "#01120d",
      "castleWall": "#065f46",
      "castleAccent": "#34d399",
      "castleCrenel": "#047857",
      "portalOuter": "#022018",
      "portalInner": "#059669",
      "portalAura": "#34d399"
    },
    "decorations": [
      {
        "col": 0,
        "row": 0,
        "type": "deadtrees",
        "count": 3
      },
      {
        "col": 6,
        "row": 0,
        "type": "mushrooms",
        "count": 3
      },
      {
        "col": 0,
        "row": 2,
        "type": "deadtrees",
        "count": 3
      },
      {
        "col": 6,
        "row": 2,
        "type": "mushrooms",
        "count": 3
      },
      {
        "col": 0,
        "row": 4,
        "type": "deadtrees",
        "count": 3
      },
      {
        "col": 8,
        "row": 4,
        "type": "mushrooms",
        "count": 3
      },
      {
        "col": 0,
        "row": 6,
        "type": "deadtrees",
        "count": 3
      },
      {
        "col": 6,
        "row": 6,
        "type": "mushrooms",
        "count": 3
      },
      {
        "col": 0,
        "row": 8,
        "type": "deadtrees",
        "count": 3
      },
      {
        "col": 7,
        "row": 8,
        "type": "mushrooms",
        "count": 3
      },
      {
        "col": 0,
        "row": 10,
        "type": "deadtrees",
        "count": 3
      },
      {
        "col": 6,
        "row": 10,
        "type": "mushrooms",
        "count": 3
      }
    ],
    "hpMultiplier": 2.3,
    "goldMultiplier": 1.78,
    "speedMultiplier": 1.16
  },
  {
    "id": 15,
    "name": "Magma Caldera",
    "displayName": "MAP 15 – Magma Caldera",
    "icon": "💥",
    "themeDesc": "Infernal Chamber",
    "waypoints": [
      {
        "x": 120,
        "y": 0
      },
      {
        "x": 120,
        "y": 90
      },
      {
        "x": 280,
        "y": 90
      },
      {
        "x": 280,
        "y": 210
      },
      {
        "x": 100,
        "y": 210
      },
      {
        "x": 100,
        "y": 310
      },
      {
        "x": 260,
        "y": 310
      },
      {
        "x": 260,
        "y": 400
      },
      {
        "x": 180,
        "y": 400
      },
      {
        "x": 180,
        "y": 460
      }
    ],
    "theme": {
      "ground1": "#262626",
      "ground2": "#1c1c1c",
      "groundBorder": "rgba(239,68,68,0.12)",
      "pathColor": "#f87171",
      "pathPebble": "#ef4444",
      "pathBorder": "#dc2626",
      "courtyard1": "#121212",
      "courtyard2": "#080808",
      "castleWall": "#404040",
      "castleAccent": "#f87171",
      "castleCrenel": "#525252",
      "portalOuter": "#121212",
      "portalInner": "#b91c1c",
      "portalAura": "#f87171"
    },
    "decorations": [
      {
        "col": 0,
        "row": 0,
        "type": "magmavents",
        "count": 3
      },
      {
        "col": 6,
        "row": 0,
        "type": "basaltspires",
        "count": 3
      },
      {
        "col": 0,
        "row": 2,
        "type": "magmavents",
        "count": 3
      },
      {
        "col": 8,
        "row": 2,
        "type": "basaltspires",
        "count": 3
      },
      {
        "col": 0,
        "row": 4,
        "type": "magmavents",
        "count": 3
      },
      {
        "col": 8,
        "row": 4,
        "type": "basaltspires",
        "count": 3
      },
      {
        "col": 0,
        "row": 6,
        "type": "magmavents",
        "count": 3
      },
      {
        "col": 6,
        "row": 6,
        "type": "basaltspires",
        "count": 3
      },
      {
        "col": 0,
        "row": 8,
        "type": "magmavents",
        "count": 3
      },
      {
        "col": 7,
        "row": 8,
        "type": "basaltspires",
        "count": 3
      },
      {
        "col": 0,
        "row": 10,
        "type": "magmavents",
        "count": 3
      },
      {
        "col": 7,
        "row": 10,
        "type": "basaltspires",
        "count": 3
      }
    ],
    "hpMultiplier": 2.4,
    "goldMultiplier": 1.84,
    "speedMultiplier": 1.17
  },
  {
    "id": 16,
    "name": "Crimson Plateau",
    "displayName": "MAP 16 – Crimson Plateau",
    "icon": "🏮",
    "themeDesc": "Bloodstone Bluff",
    "waypoints": [
      {
        "x": 200,
        "y": 0
      },
      {
        "x": 200,
        "y": 80
      },
      {
        "x": 60,
        "y": 80
      },
      {
        "x": 60,
        "y": 190
      },
      {
        "x": 300,
        "y": 190
      },
      {
        "x": 300,
        "y": 300
      },
      {
        "x": 80,
        "y": 300
      },
      {
        "x": 80,
        "y": 390
      },
      {
        "x": 180,
        "y": 390
      },
      {
        "x": 180,
        "y": 460
      }
    ],
    "theme": {
      "ground1": "#581c87",
      "ground2": "#431467",
      "groundBorder": "rgba(244,114,182,0.08)",
      "pathColor": "#fb7185",
      "pathPebble": "#f43f5e",
      "pathBorder": "#e11d48",
      "courtyard1": "#250a3d",
      "courtyard2": "#150424",
      "castleWall": "#6b21a8",
      "castleAccent": "#fb7185",
      "castleCrenel": "#7e22ce",
      "portalOuter": "#250a3d",
      "portalInner": "#be123c",
      "portalAura": "#fb7185"
    },
    "decorations": [
      {
        "col": 0,
        "row": 0,
        "type": "redboulders",
        "count": 3
      },
      {
        "col": 6,
        "row": 0,
        "type": "canyonpillars",
        "count": 3
      },
      {
        "col": 0,
        "row": 2,
        "type": "redboulders",
        "count": 3
      },
      {
        "col": 6,
        "row": 2,
        "type": "canyonpillars",
        "count": 3
      },
      {
        "col": 0,
        "row": 4,
        "type": "redboulders",
        "count": 3
      },
      {
        "col": 8,
        "row": 4,
        "type": "canyonpillars",
        "count": 3
      },
      {
        "col": 0,
        "row": 6,
        "type": "redboulders",
        "count": 3
      },
      {
        "col": 6,
        "row": 6,
        "type": "canyonpillars",
        "count": 3
      },
      {
        "col": 0,
        "row": 8,
        "type": "redboulders",
        "count": 3
      },
      {
        "col": 6,
        "row": 8,
        "type": "canyonpillars",
        "count": 3
      },
      {
        "col": 0,
        "row": 10,
        "type": "redboulders",
        "count": 3
      },
      {
        "col": 6,
        "row": 10,
        "type": "canyonpillars",
        "count": 3
      }
    ],
    "hpMultiplier": 2.5,
    "goldMultiplier": 1.9,
    "speedMultiplier": 1.18
  },
  {
    "id": 17,
    "name": "Coral Coast",
    "displayName": "MAP 17 – Coral Coast",
    "icon": "🌊",
    "themeDesc": "Sunken Lagoon",
    "waypoints": [
      {
        "x": 60,
        "y": 0
      },
      {
        "x": 60,
        "y": 110
      },
      {
        "x": 240,
        "y": 110
      },
      {
        "x": 240,
        "y": 200
      },
      {
        "x": 80,
        "y": 200
      },
      {
        "x": 80,
        "y": 310
      },
      {
        "x": 280,
        "y": 310
      },
      {
        "x": 280,
        "y": 390
      },
      {
        "x": 180,
        "y": 390
      },
      {
        "x": 180,
        "y": 460
      }
    ],
    "theme": {
      "ground1": "#0c4a6e",
      "ground2": "#08334c",
      "groundBorder": "rgba(56,189,248,0.09)",
      "pathColor": "#38bdf8",
      "pathPebble": "#0284c7",
      "pathBorder": "#0369a1",
      "courtyard1": "#041c2c",
      "courtyard2": "#020f18",
      "castleWall": "#075985",
      "castleAccent": "#38bdf8",
      "castleCrenel": "#0369a1",
      "portalOuter": "#041c2c",
      "portalInner": "#0284c7",
      "portalAura": "#38bdf8"
    },
    "decorations": [
      {
        "col": 0,
        "row": 0,
        "type": "waterlotus",
        "count": 3
      },
      {
        "col": 6,
        "row": 0,
        "type": "ruincolumns",
        "count": 3
      },
      {
        "col": 0,
        "row": 2,
        "type": "waterlotus",
        "count": 3
      },
      {
        "col": 6,
        "row": 2,
        "type": "ruincolumns",
        "count": 3
      },
      {
        "col": 0,
        "row": 4,
        "type": "waterlotus",
        "count": 3
      },
      {
        "col": 7,
        "row": 4,
        "type": "ruincolumns",
        "count": 3
      },
      {
        "col": 0,
        "row": 6,
        "type": "waterlotus",
        "count": 3
      },
      {
        "col": 6,
        "row": 6,
        "type": "ruincolumns",
        "count": 3
      },
      {
        "col": 0,
        "row": 8,
        "type": "waterlotus",
        "count": 3
      },
      {
        "col": 8,
        "row": 8,
        "type": "ruincolumns",
        "count": 3
      },
      {
        "col": 0,
        "row": 10,
        "type": "waterlotus",
        "count": 3
      },
      {
        "col": 6,
        "row": 10,
        "type": "ruincolumns",
        "count": 3
      }
    ],
    "hpMultiplier": 2.6,
    "goldMultiplier": 1.96,
    "speedMultiplier": 1.19
  },
  {
    "id": 18,
    "name": "Amethyst Mines",
    "displayName": "MAP 18 – Amethyst Mines",
    "icon": "🔮",
    "themeDesc": "Geode Caverns",
    "waypoints": [
      {
        "x": 300,
        "y": 0
      },
      {
        "x": 300,
        "y": 70
      },
      {
        "x": 140,
        "y": 70
      },
      {
        "x": 140,
        "y": 160
      },
      {
        "x": 280,
        "y": 160
      },
      {
        "x": 280,
        "y": 260
      },
      {
        "x": 80,
        "y": 260
      },
      {
        "x": 80,
        "y": 360
      },
      {
        "x": 180,
        "y": 360
      },
      {
        "x": 180,
        "y": 460
      }
    ],
    "theme": {
      "ground1": "#2e1065",
      "ground2": "#200a49",
      "groundBorder": "rgba(216,180,254,0.08)",
      "pathColor": "#d8b4fe",
      "pathPebble": "#c084fc",
      "pathBorder": "#a855f7",
      "courtyard1": "#12052c",
      "courtyard2": "#090218",
      "castleWall": "#3b0764",
      "castleAccent": "#d8b4fe",
      "castleCrenel": "#4c1d95",
      "portalOuter": "#12052c",
      "portalInner": "#9333ea",
      "portalAura": "#d8b4fe"
    },
    "decorations": [
      {
        "col": 0,
        "row": 0,
        "type": "amethystgeodes",
        "count": 3
      },
      {
        "col": 6,
        "row": 0,
        "type": "luminstalagmites",
        "count": 3
      },
      {
        "col": 0,
        "row": 2,
        "type": "amethystgeodes",
        "count": 3
      },
      {
        "col": 6,
        "row": 2,
        "type": "luminstalagmites",
        "count": 3
      },
      {
        "col": 0,
        "row": 4,
        "type": "amethystgeodes",
        "count": 3
      },
      {
        "col": 8,
        "row": 4,
        "type": "luminstalagmites",
        "count": 3
      },
      {
        "col": 0,
        "row": 6,
        "type": "amethystgeodes",
        "count": 3
      },
      {
        "col": 8,
        "row": 6,
        "type": "luminstalagmites",
        "count": 3
      },
      {
        "col": 0,
        "row": 8,
        "type": "amethystgeodes",
        "count": 3
      },
      {
        "col": 6,
        "row": 8,
        "type": "luminstalagmites",
        "count": 3
      },
      {
        "col": 0,
        "row": 10,
        "type": "amethystgeodes",
        "count": 3
      },
      {
        "col": 6,
        "row": 10,
        "type": "luminstalagmites",
        "count": 3
      }
    ],
    "hpMultiplier": 2.7,
    "goldMultiplier": 2.02,
    "speedMultiplier": 1.2
  },
  {
    "id": 19,
    "name": "Celestial Sanctuary",
    "displayName": "MAP 19 – Celestial Sanctuary",
    "icon": "🕊️",
    "themeDesc": "High Elysium",
    "waypoints": [
      {
        "x": 180,
        "y": 0
      },
      {
        "x": 180,
        "y": 70
      },
      {
        "x": 80,
        "y": 70
      },
      {
        "x": 80,
        "y": 170
      },
      {
        "x": 280,
        "y": 170
      },
      {
        "x": 280,
        "y": 270
      },
      {
        "x": 120,
        "y": 270
      },
      {
        "x": 120,
        "y": 370
      },
      {
        "x": 240,
        "y": 370
      },
      {
        "x": 240,
        "y": 420
      },
      {
        "x": 180,
        "y": 420
      },
      {
        "x": 180,
        "y": 460
      }
    ],
    "theme": {
      "ground1": "#1e1b4b",
      "ground2": "#141236",
      "groundBorder": "rgba(253,224,71,0.1)",
      "pathColor": "#fef08a",
      "pathPebble": "#fde047",
      "pathBorder": "#eab308",
      "courtyard1": "#0b0a21",
      "courtyard2": "#050412",
      "castleWall": "#312e81",
      "castleAccent": "#fde047",
      "castleCrenel": "#3730a3",
      "portalOuter": "#0b0a21",
      "portalInner": "#ca8a04",
      "portalAura": "#fde047"
    },
    "decorations": [
      {
        "col": 0,
        "row": 0,
        "type": "cloudpillars",
        "count": 3
      },
      {
        "col": 6,
        "row": 0,
        "type": "celestialbraziers",
        "count": 3
      },
      {
        "col": 0,
        "row": 2,
        "type": "cloudpillars",
        "count": 3
      },
      {
        "col": 6,
        "row": 2,
        "type": "celestialbraziers",
        "count": 3
      },
      {
        "col": 0,
        "row": 4,
        "type": "cloudpillars",
        "count": 3
      },
      {
        "col": 8,
        "row": 4,
        "type": "celestialbraziers",
        "count": 3
      },
      {
        "col": 0,
        "row": 6,
        "type": "cloudpillars",
        "count": 3
      },
      {
        "col": 8,
        "row": 6,
        "type": "celestialbraziers",
        "count": 3
      },
      {
        "col": 0,
        "row": 8,
        "type": "cloudpillars",
        "count": 3
      },
      {
        "col": 6,
        "row": 8,
        "type": "celestialbraziers",
        "count": 3
      },
      {
        "col": 0,
        "row": 10,
        "type": "cloudpillars",
        "count": 3
      },
      {
        "col": 7,
        "row": 10,
        "type": "celestialbraziers",
        "count": 3
      }
    ],
    "hpMultiplier": 2.8,
    "goldMultiplier": 2.08,
    "speedMultiplier": 1.22
  },
  {
    "id": 20,
    "name": "Nether Abyss",
    "displayName": "MAP 20 – Nether Abyss",
    "icon": "🕳️",
    "themeDesc": "Dark Oblivion",
    "waypoints": [
      {
        "x": 100,
        "y": 0
      },
      {
        "x": 100,
        "y": 70
      },
      {
        "x": 260,
        "y": 70
      },
      {
        "x": 260,
        "y": 160
      },
      {
        "x": 60,
        "y": 160
      },
      {
        "x": 60,
        "y": 260
      },
      {
        "x": 300,
        "y": 260
      },
      {
        "x": 300,
        "y": 360
      },
      {
        "x": 140,
        "y": 360
      },
      {
        "x": 140,
        "y": 410
      },
      {
        "x": 180,
        "y": 410
      },
      {
        "x": 180,
        "y": 460
      }
    ],
    "theme": {
      "ground1": "#171717",
      "ground2": "#0f0f0f",
      "groundBorder": "rgba(168,85,247,0.09)",
      "pathColor": "#a855f7",
      "pathPebble": "#9333ea",
      "pathBorder": "#7e22ce",
      "courtyard1": "#080808",
      "courtyard2": "#000000",
      "castleWall": "#262626",
      "castleAccent": "#c084fc",
      "castleCrenel": "#404040",
      "portalOuter": "#080808",
      "portalInner": "#6b21a8",
      "portalAura": "#c084fc"
    },
    "decorations": [
      {
        "col": 0,
        "row": 0,
        "type": "voidrifts",
        "count": 3
      },
      {
        "col": 6,
        "row": 0,
        "type": "abyssalmonoliths",
        "count": 3
      },
      {
        "col": 0,
        "row": 2,
        "type": "voidrifts",
        "count": 3
      },
      {
        "col": 7,
        "row": 2,
        "type": "abyssalmonoliths",
        "count": 3
      },
      {
        "col": 0,
        "row": 4,
        "type": "voidrifts",
        "count": 3
      },
      {
        "col": 7,
        "row": 4,
        "type": "abyssalmonoliths",
        "count": 3
      },
      {
        "col": 0,
        "row": 6,
        "type": "voidrifts",
        "count": 3
      },
      {
        "col": 8,
        "row": 6,
        "type": "abyssalmonoliths",
        "count": 3
      },
      {
        "col": 0,
        "row": 8,
        "type": "voidrifts",
        "count": 3
      },
      {
        "col": 8,
        "row": 8,
        "type": "abyssalmonoliths",
        "count": 3
      },
      {
        "col": 0,
        "row": 10,
        "type": "voidrifts",
        "count": 3
      },
      {
        "col": 6,
        "row": 10,
        "type": "abyssalmonoliths",
        "count": 3
      }
    ],
    "hpMultiplier": 2.9,
    "goldMultiplier": 2.14,
    "speedMultiplier": 1.23
  },
  {
    "id": 21,
    "name": "Golden Steppe",
    "displayName": "MAP 21 – Golden Steppe",
    "icon": "🌾",
    "themeDesc": "Whispering Grass",
    "waypoints": [
      {
        "x": 260,
        "y": 0
      },
      {
        "x": 260,
        "y": 80
      },
      {
        "x": 100,
        "y": 80
      },
      {
        "x": 100,
        "y": 170
      },
      {
        "x": 260,
        "y": 170
      },
      {
        "x": 260,
        "y": 270
      },
      {
        "x": 80,
        "y": 270
      },
      {
        "x": 80,
        "y": 370
      },
      {
        "x": 220,
        "y": 370
      },
      {
        "x": 220,
        "y": 420
      },
      {
        "x": 180,
        "y": 420
      },
      {
        "x": 180,
        "y": 460
      }
    ],
    "theme": {
      "ground1": "#713f12",
      "ground2": "#542e0b",
      "groundBorder": "rgba(254,240,138,0.08)",
      "pathColor": "#fef08a",
      "pathPebble": "#fde047",
      "pathBorder": "#ca8a04",
      "courtyard1": "#2d1704",
      "courtyard2": "#190c01",
      "castleWall": "#854d0e",
      "castleAccent": "#fef08a",
      "castleCrenel": "#a16207",
      "portalOuter": "#2d1704",
      "portalInner": "#ca8a04",
      "portalAura": "#fef08a"
    },
    "decorations": [
      {
        "col": 0,
        "row": 0,
        "type": "trees",
        "count": 3
      },
      {
        "col": 7,
        "row": 0,
        "type": "bushes",
        "count": 3
      },
      {
        "col": 0,
        "row": 2,
        "type": "trees",
        "count": 3
      },
      {
        "col": 7,
        "row": 2,
        "type": "bushes",
        "count": 3
      },
      {
        "col": 0,
        "row": 4,
        "type": "trees",
        "count": 3
      },
      {
        "col": 7,
        "row": 4,
        "type": "bushes",
        "count": 3
      },
      {
        "col": 0,
        "row": 6,
        "type": "trees",
        "count": 3
      },
      {
        "col": 7,
        "row": 6,
        "type": "bushes",
        "count": 3
      },
      {
        "col": 0,
        "row": 8,
        "type": "trees",
        "count": 3
      },
      {
        "col": 6,
        "row": 8,
        "type": "bushes",
        "count": 3
      },
      {
        "col": 0,
        "row": 10,
        "type": "trees",
        "count": 3
      },
      {
        "col": 6,
        "row": 10,
        "type": "bushes",
        "count": 3
      }
    ],
    "hpMultiplier": 3,
    "goldMultiplier": 2.2,
    "speedMultiplier": 1.24
  },
  {
    "id": 22,
    "name": "Obsidian Peaks",
    "displayName": "MAP 22 – Obsidian Peaks",
    "icon": "🗿",
    "themeDesc": "Basalt Monoliths",
    "waypoints": [
      {
        "x": 80,
        "y": 0
      },
      {
        "x": 80,
        "y": 90
      },
      {
        "x": 280,
        "y": 90
      },
      {
        "x": 280,
        "y": 180
      },
      {
        "x": 120,
        "y": 180
      },
      {
        "x": 120,
        "y": 280
      },
      {
        "x": 280,
        "y": 280
      },
      {
        "x": 280,
        "y": 380
      },
      {
        "x": 180,
        "y": 380
      },
      {
        "x": 180,
        "y": 460
      }
    ],
    "theme": {
      "ground1": "#1e1e24",
      "ground2": "#141419",
      "groundBorder": "rgba(56,189,248,0.09)",
      "pathColor": "#38bdf8",
      "pathPebble": "#0284c7",
      "pathBorder": "#0369a1",
      "courtyard1": "#0a0a0d",
      "courtyard2": "#000000",
      "castleWall": "#2b2b36",
      "castleAccent": "#38bdf8",
      "castleCrenel": "#3a3a49",
      "portalOuter": "#0a0a0d",
      "portalInner": "#0369a1",
      "portalAura": "#38bdf8"
    },
    "decorations": [
      {
        "col": 0,
        "row": 0,
        "type": "basaltspires",
        "count": 3
      },
      {
        "col": 6,
        "row": 0,
        "type": "magmavents",
        "count": 3
      },
      {
        "col": 0,
        "row": 2,
        "type": "basaltspires",
        "count": 3
      },
      {
        "col": 8,
        "row": 2,
        "type": "magmavents",
        "count": 3
      },
      {
        "col": 0,
        "row": 4,
        "type": "basaltspires",
        "count": 3
      },
      {
        "col": 8,
        "row": 4,
        "type": "magmavents",
        "count": 3
      },
      {
        "col": 0,
        "row": 6,
        "type": "basaltspires",
        "count": 3
      },
      {
        "col": 7,
        "row": 6,
        "type": "magmavents",
        "count": 3
      },
      {
        "col": 0,
        "row": 8,
        "type": "basaltspires",
        "count": 3
      },
      {
        "col": 8,
        "row": 8,
        "type": "magmavents",
        "count": 3
      },
      {
        "col": 0,
        "row": 10,
        "type": "basaltspires",
        "count": 3
      },
      {
        "col": 6,
        "row": 10,
        "type": "magmavents",
        "count": 3
      }
    ],
    "hpMultiplier": 3.1,
    "goldMultiplier": 2.26,
    "speedMultiplier": 1.25
  },
  {
    "id": 23,
    "name": "Aurora Expanse",
    "displayName": "MAP 23 – Aurora Expanse",
    "icon": "🌠",
    "themeDesc": "Cosmic Polar Veil",
    "waypoints": [
      {
        "x": 220,
        "y": 0
      },
      {
        "x": 220,
        "y": 70
      },
      {
        "x": 60,
        "y": 70
      },
      {
        "x": 60,
        "y": 170
      },
      {
        "x": 240,
        "y": 170
      },
      {
        "x": 240,
        "y": 260
      },
      {
        "x": 80,
        "y": 260
      },
      {
        "x": 80,
        "y": 360
      },
      {
        "x": 280,
        "y": 360
      },
      {
        "x": 280,
        "y": 420
      },
      {
        "x": 180,
        "y": 420
      },
      {
        "x": 180,
        "y": 460
      }
    ],
    "theme": {
      "ground1": "#0f172a",
      "ground2": "#090e1b",
      "groundBorder": "rgba(52,211,153,0.1)",
      "pathColor": "#34d399",
      "pathPebble": "#10b981",
      "pathBorder": "#059669",
      "courtyard1": "#050912",
      "courtyard2": "#010307",
      "castleWall": "#1e293b",
      "castleAccent": "#34d399",
      "castleCrenel": "#334155",
      "portalOuter": "#050912",
      "portalInner": "#047857",
      "portalAura": "#34d399"
    },
    "decorations": [
      {
        "col": 0,
        "row": 0,
        "type": "icecrystals",
        "count": 3
      },
      {
        "col": 6,
        "row": 0,
        "type": "snowpines",
        "count": 3
      },
      {
        "col": 0,
        "row": 2,
        "type": "icecrystals",
        "count": 3
      },
      {
        "col": 6,
        "row": 2,
        "type": "snowpines",
        "count": 3
      },
      {
        "col": 0,
        "row": 4,
        "type": "icecrystals",
        "count": 3
      },
      {
        "col": 7,
        "row": 4,
        "type": "snowpines",
        "count": 3
      },
      {
        "col": 0,
        "row": 6,
        "type": "icecrystals",
        "count": 3
      },
      {
        "col": 7,
        "row": 6,
        "type": "snowpines",
        "count": 3
      },
      {
        "col": 0,
        "row": 8,
        "type": "icecrystals",
        "count": 3
      },
      {
        "col": 7,
        "row": 8,
        "type": "snowpines",
        "count": 3
      },
      {
        "col": 0,
        "row": 10,
        "type": "icecrystals",
        "count": 3
      },
      {
        "col": 8,
        "row": 10,
        "type": "snowpines",
        "count": 3
      }
    ],
    "hpMultiplier": 3.2,
    "goldMultiplier": 2.32,
    "speedMultiplier": 1.26
  },
  {
    "id": 24,
    "name": "Cursed Necropolis",
    "displayName": "MAP 24 – Cursed Necropolis",
    "icon": "💀",
    "themeDesc": "Bone Crypts",
    "waypoints": [
      {
        "x": 140,
        "y": 0
      },
      {
        "x": 140,
        "y": 80
      },
      {
        "x": 300,
        "y": 80
      },
      {
        "x": 300,
        "y": 180
      },
      {
        "x": 60,
        "y": 180
      },
      {
        "x": 60,
        "y": 280
      },
      {
        "x": 260,
        "y": 280
      },
      {
        "x": 260,
        "y": 370
      },
      {
        "x": 100,
        "y": 370
      },
      {
        "x": 100,
        "y": 420
      },
      {
        "x": 180,
        "y": 420
      },
      {
        "x": 180,
        "y": 460
      }
    ],
    "theme": {
      "ground1": "#1c1917",
      "ground2": "#12100e",
      "groundBorder": "rgba(168,162,158,0.08)",
      "pathColor": "#a8a29e",
      "pathPebble": "#78716c",
      "pathBorder": "#57534e",
      "courtyard1": "#0a0908",
      "courtyard2": "#000000",
      "castleWall": "#292524",
      "castleAccent": "#e7e5e4",
      "castleCrenel": "#44403c",
      "portalOuter": "#0a0908",
      "portalInner": "#44403c",
      "portalAura": "#d6d3d1"
    },
    "decorations": [
      {
        "col": 0,
        "row": 0,
        "type": "abyssalmonoliths",
        "count": 3
      },
      {
        "col": 6,
        "row": 0,
        "type": "deadtrees",
        "count": 3
      },
      {
        "col": 0,
        "row": 2,
        "type": "abyssalmonoliths",
        "count": 3
      },
      {
        "col": 8,
        "row": 2,
        "type": "deadtrees",
        "count": 3
      },
      {
        "col": 0,
        "row": 4,
        "type": "abyssalmonoliths",
        "count": 3
      },
      {
        "col": 8,
        "row": 4,
        "type": "deadtrees",
        "count": 3
      },
      {
        "col": 0,
        "row": 6,
        "type": "abyssalmonoliths",
        "count": 3
      },
      {
        "col": 7,
        "row": 6,
        "type": "deadtrees",
        "count": 3
      },
      {
        "col": 0,
        "row": 8,
        "type": "abyssalmonoliths",
        "count": 3
      },
      {
        "col": 7,
        "row": 8,
        "type": "deadtrees",
        "count": 3
      },
      {
        "col": 0,
        "row": 10,
        "type": "abyssalmonoliths",
        "count": 3
      },
      {
        "col": 6,
        "row": 10,
        "type": "deadtrees",
        "count": 3
      }
    ],
    "hpMultiplier": 3.3,
    "goldMultiplier": 2.38,
    "speedMultiplier": 1.28
  },
  {
    "id": 25,
    "name": "The Final Citadel",
    "displayName": "MAP 25 – The Final Citadel",
    "icon": "👑",
    "themeDesc": "Infinity Nexus Apex",
    "waypoints": [
      {
        "x": 180,
        "y": 0
      },
      {
        "x": 180,
        "y": 50
      },
      {
        "x": 60,
        "y": 50
      },
      {
        "x": 60,
        "y": 140
      },
      {
        "x": 300,
        "y": 140
      },
      {
        "x": 300,
        "y": 230
      },
      {
        "x": 80,
        "y": 230
      },
      {
        "x": 80,
        "y": 320
      },
      {
        "x": 280,
        "y": 320
      },
      {
        "x": 280,
        "y": 390
      },
      {
        "x": 120,
        "y": 390
      },
      {
        "x": 120,
        "y": 430
      },
      {
        "x": 180,
        "y": 430
      },
      {
        "x": 180,
        "y": 460
      }
    ],
    "theme": {
      "ground1": "#090514",
      "ground2": "#120822",
      "groundBorder": "rgba(251,191,36,0.15)",
      "pathColor": "#fbbf24",
      "pathPebble": "#f59e0b",
      "pathBorder": "#d97706",
      "courtyard1": "#04010a",
      "courtyard2": "#000000",
      "castleWall": "#3b0764",
      "castleAccent": "#fbbf24",
      "castleCrenel": "#581c87",
      "portalOuter": "#04010a",
      "portalInner": "#d97706",
      "portalAura": "#fde047"
    },
    "decorations": [
      {
        "col": 0,
        "row": 0,
        "type": "voidrifts",
        "count": 3
      },
      {
        "col": 6,
        "row": 0,
        "type": "celestialbraziers",
        "count": 3
      },
      {
        "col": 0,
        "row": 2,
        "type": "voidrifts",
        "count": 3
      },
      {
        "col": 6,
        "row": 2,
        "type": "celestialbraziers",
        "count": 3
      },
      {
        "col": 0,
        "row": 4,
        "type": "voidrifts",
        "count": 3
      },
      {
        "col": 6,
        "row": 4,
        "type": "celestialbraziers",
        "count": 3
      },
      {
        "col": 0,
        "row": 6,
        "type": "voidrifts",
        "count": 3
      },
      {
        "col": 6,
        "row": 6,
        "type": "celestialbraziers",
        "count": 3
      },
      {
        "col": 0,
        "row": 8,
        "type": "voidrifts",
        "count": 3
      },
      {
        "col": 8,
        "row": 8,
        "type": "celestialbraziers",
        "count": 3
      },
      {
        "col": 0,
        "row": 10,
        "type": "voidrifts",
        "count": 3
      },
      {
        "col": 6,
        "row": 10,
        "type": "celestialbraziers",
        "count": 3
      }
    ],
    "hpMultiplier": 3.4,
    "goldMultiplier": 2.44,
    "speedMultiplier": 1.29
  }
];

  function getMapDefinition(mapIndex) {
    const idx = Math.max(1, Math.min(25, parseInt(mapIndex, 10) || 1));
    return MAP_DEFINITIONS[idx - 1];
  }

  let CURRENT_MAP_INDEX = 1;
  let CURRENT_MAP_DEF = MAP_DEFINITIONS[0];
  let PATH_WAYPOINTS = CURRENT_MAP_DEF.waypoints;
  let TOTAL_PATH_LENGTH = 0;
  const PATH_SEGMENTS = [];
  let NATURE_DECORATIONS = CURRENT_MAP_DEF.decorations;

  function applyMapLayout(mapIndex) {
    CURRENT_MAP_INDEX = Math.max(1, mapIndex);
    CURRENT_MAP_DEF = getMapDefinition(CURRENT_MAP_INDEX);
    PATH_WAYPOINTS = CURRENT_MAP_DEF.waypoints;

    PATH_SEGMENTS.length = 0;
    TOTAL_PATH_LENGTH = 0;
    for (let i = 0; i < PATH_WAYPOINTS.length - 1; i++) {
      const p1 = PATH_WAYPOINTS[i];
      const p2 = PATH_WAYPOINTS[i + 1];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy);
      PATH_SEGMENTS.push({ p1, p2, len, startDist: TOTAL_PATH_LENGTH });
      TOTAL_PATH_LENGTH += len;
    }

    NATURE_DECORATIONS = CURRENT_MAP_DEF.decorations || [];
  }

  // Pre-initialize Map 1
  applyMapLayout(1);

  function getPositionAlongPath(dist) {
    if (dist <= 0) return { x: PATH_WAYPOINTS[0].x, y: PATH_WAYPOINTS[0].y, angle: Math.PI / 2 };
    if (dist >= TOTAL_PATH_LENGTH) {
      const last = PATH_WAYPOINTS[PATH_WAYPOINTS.length - 1];
      return { x: last.x, y: last.y, angle: Math.PI / 2 };
    }
    for (let seg of PATH_SEGMENTS) {
      if (dist >= seg.startDist && dist <= seg.startDist + seg.len) {
        const segDist = dist - seg.startDist;
        const t = segDist / seg.len;
        const x = seg.p1.x + (seg.p2.x - seg.p1.x) * t;
        const y = seg.p1.y + (seg.p2.y - seg.p1.y) * t;
        const angle = Math.atan2(seg.p2.y - seg.p1.y, seg.p2.x - seg.p1.x);
        return { x, y, angle };
      }
    }
    const last = PATH_WAYPOINTS[PATH_WAYPOINTS.length - 1];
    return { x: last.x, y: last.y, angle: Math.PI / 2 };
  }

  // Path detection for grid tiles
  function isTileOnPath(col, row) {
    const tileCenterX = col * TILE_SIZE + TILE_SIZE / 2;
    const tileCenterY = row * TILE_SIZE + TILE_SIZE / 2;
    for (let seg of PATH_SEGMENTS) {
      const x1 = seg.p1.x, y1 = seg.p1.y, x2 = seg.p2.x, y2 = seg.p2.y;
      const dx = x2 - x1, dy = y2 - y1;
      const lenSq = dx * dx + dy * dy;
      let t = 0;
      if (lenSq > 0) {
        t = Math.max(0, Math.min(1, ((tileCenterX - x1) * dx + (tileCenterY - y1) * dy) / lenSq));
      }
      const projX = x1 + t * dx;
      const projY = y1 + t * dy;
      const dist = Math.hypot(tileCenterX - projX, tileCenterY - projY);
      if (dist < TILE_SIZE * 0.55) {
        return true;
      }
    }
    return false;
  }

  // ================= THEMATIC MAP DECORATIONS RENDERING =================
  function drawMapDecoration(ctx, dec, dx, dy, now, gfx) {
    if (dec.type === 'trees') {
      const offsets = [[-8, -8], [8, -8], [-8, 6], [8, 6]];
      for (let i = 0; i < Math.min(dec.count || 4, offsets.length); i++) {
        const tx = dx + offsets[i][0];
        const ty = dy + offsets[i][1];
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath(); ctx.ellipse(tx, ty + 5, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#5c3a1e';
        ctx.fillRect(tx - 1, ty + 2, 2, 4);
        ctx.fillStyle = '#2d6a1b';
        ctx.beginPath(); ctx.arc(tx, ty + 1, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#3a8723';
        ctx.beginPath(); ctx.arc(tx, ty - 3, 4.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#52b728';
        ctx.beginPath(); ctx.arc(tx, ty - 6, 2.8, 0, Math.PI * 2); ctx.fill();
      }
    } else if (dec.type === 'rocks') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.beginPath(); ctx.ellipse(dx, dy + 4, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#64748b';
      ctx.beginPath(); ctx.arc(dx - 3, dy, 5, 0, Math.PI * 2); ctx.arc(dx + 4, dy + 1, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath(); ctx.arc(dx - 4, dy - 2, 2, 0, Math.PI * 2); ctx.fill();
    } else if (dec.type === 'bushes') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
      ctx.beginPath(); ctx.ellipse(dx, dy + 5, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#226017';
      ctx.beginPath(); ctx.arc(dx - 5, dy + 1, 6, 0, Math.PI * 2); ctx.arc(dx + 5, dy + 1, 6, 0, Math.PI * 2); ctx.arc(dx, dy - 2, 7.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3eb321';
      ctx.beginPath(); ctx.arc(dx - 2, dy - 3, 3.5, 0, Math.PI * 2); ctx.fill();
    } else if (dec.type === 'flowers') {
      const fColors = ['#f43f5e', '#fbbf24', '#ffffff', '#38bdf8'];
      for (let f = 0; f < 4; f++) {
        ctx.fillStyle = fColors[f];
        ctx.beginPath(); ctx.arc(dx + (f % 2 === 0 ? -6 : 6), dy + (f < 2 ? -6 : 6), 2, 0, Math.PI * 2); ctx.fill();
      }
    } else if (dec.type === 'cacti') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.beginPath(); ctx.ellipse(dx, dy + 6, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#15803d';
      ctx.fillRect(dx - 3, dy - 12, 6, 18);
      ctx.fillRect(dx - 9, dy - 4, 6, 3);
      ctx.fillRect(dx - 9, dy - 8, 3, 6);
      ctx.fillRect(dx + 3, dy - 6, 6, 3);
      ctx.fillRect(dx + 6, dy - 10, 3, 6);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(dx - 1, dy - 10, 2, 14);
    } else if (dec.type === 'monoliths') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.beginPath(); ctx.ellipse(dx + 2, dy + 6, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#d97706';
      ctx.beginPath(); ctx.moveTo(dx, dy - 14); ctx.lineTo(dx + 5, dy + 4); ctx.lineTo(dx - 5, dy + 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fde68a';
      ctx.beginPath(); ctx.moveTo(dx, dy - 14); ctx.lineTo(dx, dy + 4); ctx.lineTo(dx - 5, dy + 4); ctx.closePath(); ctx.fill();
    } else if (dec.type === 'sandstone') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.beginPath(); ctx.ellipse(dx, dy + 4, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#b45309';
      ctx.beginPath(); ctx.arc(dx - 4, dy, 6, 0, Math.PI * 2); ctx.arc(dx + 4, dy + 1, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath(); ctx.arc(dx - 5, dy - 2, 2.5, 0, Math.PI * 2); ctx.fill();
    } else if (dec.type === 'snowpines') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.beginPath(); ctx.ellipse(dx, dy + 6, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3f2c20';
      ctx.fillRect(dx - 2, dy + 2, 4, 5);
      ctx.fillStyle = '#1e3a2b';
      ctx.beginPath(); ctx.arc(dx, dy + 1, 7, 0, Math.PI * 2); ctx.arc(dx, dy - 4, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath(); ctx.arc(dx, dy - 6, 3.5, 0, Math.PI * 2); ctx.arc(dx - 2, dy - 2, 2.5, 0, Math.PI * 2); ctx.arc(dx + 2, dy - 2, 2.5, 0, Math.PI * 2); ctx.fill();
    } else if (dec.type === 'icecrystals') {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.3)';
      ctx.beginPath(); ctx.arc(dx, dy, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0284c7';
      ctx.beginPath(); ctx.moveTo(dx, dy - 12); ctx.lineTo(dx + 4, dy + 4); ctx.lineTo(dx - 4, dy + 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#bae6fd';
      ctx.beginPath(); ctx.moveTo(dx, dy - 12); ctx.lineTo(dx, dy + 4); ctx.lineTo(dx - 4, dy + 4); ctx.closePath(); ctx.fill();
    } else if (dec.type === 'deadtrees') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath(); ctx.ellipse(dx, dy + 6, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#3b0764';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(dx, dy + 6); ctx.lineTo(dx - 1, dy - 8); ctx.lineTo(dx - 7, dy - 13); ctx.moveTo(dx - 1, dy - 4); ctx.lineTo(dx + 6, dy - 12); ctx.stroke();
    } else if (dec.type === 'mushrooms') {
      ctx.fillStyle = 'rgba(168, 85, 247, 0.25)';
      ctx.beginPath(); ctx.arc(dx, dy, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c084fc';
      ctx.beginPath(); ctx.arc(dx - 3, dy - 1, 4.5, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#e9d5ff';
      ctx.fillRect(dx - 4, dy - 1, 2, 4);
      ctx.fillStyle = '#a855f7';
      ctx.beginPath(); ctx.arc(dx + 3, dy + 1, 3.5, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#f3e8ff';
      ctx.fillRect(dx + 2, dy + 1, 2, 3);
    } else if (dec.type === 'magmavents') {
      const ventPulse = Math.sin(now * 0.008) * 2;
      ctx.fillStyle = 'rgba(234, 88, 12, 0.35)';
      ctx.beginPath(); ctx.arc(dx, dy, 7 + ventPulse, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#27272a';
      ctx.beginPath(); ctx.arc(dx, dy, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ea580c';
      ctx.beginPath(); ctx.arc(dx, dy, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath(); ctx.arc(dx, dy, 1.5, 0, Math.PI * 2); ctx.fill();
    } else if (dec.type === 'basaltspires') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath(); ctx.ellipse(dx, dy + 6, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#18181b';
      ctx.beginPath(); ctx.moveTo(dx, dy - 13); ctx.lineTo(dx + 4, dy + 4); ctx.lineTo(dx - 4, dy + 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#3f3f46';
      ctx.beginPath(); ctx.moveTo(dx, dy - 13); ctx.lineTo(dx, dy + 4); ctx.lineTo(dx - 4, dy + 4); ctx.closePath(); ctx.fill();
    } else if (dec.type === 'canyonpillars') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath(); ctx.ellipse(dx, dy + 6, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#9a3412';
      ctx.fillRect(dx - 4, dy - 12, 8, 16);
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(dx - 4, dy - 12, 4, 16);
      ctx.fillStyle = '#fdba74';
      ctx.fillRect(dx - 5, dy - 13, 10, 2);
    } else if (dec.type === 'redboulders') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.beginPath(); ctx.ellipse(dx, dy + 4, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7c2d12';
      ctx.beginPath(); ctx.arc(dx - 3, dy, 5, 0, Math.PI * 2); ctx.arc(dx + 4, dy + 1, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c2410c';
      ctx.beginPath(); ctx.arc(dx - 4, dy - 2, 2, 0, Math.PI * 2); ctx.fill();
    } else if (dec.type === 'ruincolumns') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.beginPath(); ctx.ellipse(dx, dy + 6, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0f766e';
      ctx.fillRect(dx - 5, dy - 12, 10, 16);
      ctx.fillStyle = '#14b8a6';
      ctx.fillRect(dx - 6, dy - 14, 12, 3);
      ctx.fillRect(dx - 6, dy + 2, 12, 3);
      ctx.fillStyle = '#2dd4bf';
      ctx.fillRect(dx - 3, dy - 10, 6, 12);
    } else if (dec.type === 'waterlotus') {
      ctx.fillStyle = '#064e3b';
      ctx.beginPath(); ctx.ellipse(dx, dy + 2, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2dd4bf';
      ctx.beginPath(); ctx.arc(dx, dy - 2, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f472b6';
      ctx.beginPath(); ctx.arc(dx, dy - 2, 2.5, 0, Math.PI * 2); ctx.fill();
    } else if (dec.type === 'amethystgeodes') {
      ctx.fillStyle = 'rgba(168, 85, 247, 0.3)';
      ctx.beginPath(); ctx.arc(dx, dy, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#581c87';
      ctx.beginPath(); ctx.moveTo(dx, dy - 12); ctx.lineTo(dx + 5, dy + 4); ctx.lineTo(dx - 5, dy + 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#c084fc';
      ctx.beginPath(); ctx.moveTo(dx, dy - 12); ctx.lineTo(dx, dy + 4); ctx.lineTo(dx - 4, dy + 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e9d5ff';
      ctx.beginPath(); ctx.arc(dx, dy - 6, 1.5, 0, Math.PI * 2); ctx.fill();
    } else if (dec.type === 'luminstalagmites') {
      ctx.fillStyle = 'rgba(6, 182, 212, 0.35)';
      ctx.beginPath(); ctx.ellipse(dx, dy + 5, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0e7490';
      ctx.beginPath(); ctx.moveTo(dx - 2, dy - 14); ctx.lineTo(dx + 4, dy + 4); ctx.lineTo(dx - 6, dy + 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#22d3ee';
      ctx.beginPath(); ctx.moveTo(dx - 2, dy - 14); ctx.lineTo(dx, dy + 4); ctx.lineTo(dx - 4, dy + 4); ctx.closePath(); ctx.fill();
    } else if (dec.type === 'celestialbraziers') {
      ctx.fillStyle = '#78350f';
      ctx.fillRect(dx - 2, dy, 4, 6);
      ctx.fillStyle = '#ca8a04';
      ctx.beginPath(); ctx.arc(dx, dy, 6, 0, Math.PI); ctx.fill();
      const bFl = Math.sin(now * 0.015) * 1.5;
      ctx.fillStyle = '#facc15';
      ctx.beginPath(); ctx.arc(dx, dy - 3 + bFl * 0.5, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(dx, dy - 3 + bFl * 0.5, 1.5, 0, Math.PI * 2); ctx.fill();
    } else if (dec.type === 'cloudpillars') {
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(dx - 4, dy - 12, 8, 16);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(dx - 3, dy - 10, 6, 12);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(dx - 5, dy - 13, 10, 2);
      ctx.fillRect(dx - 5, dy + 3, 10, 2);
    } else if (dec.type === 'voidrifts') {
      const vPulse = Math.sin(now * 0.01) * 2;
      ctx.fillStyle = 'rgba(236, 72, 153, 0.35)';
      ctx.beginPath(); ctx.arc(dx, dy, 8 + vPulse, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#09030a';
      ctx.beginPath(); ctx.arc(dx, dy, 5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (dec.type === 'abyssalmonoliths') {
      ctx.fillStyle = '#020617';
      ctx.beginPath(); ctx.moveTo(dx, dy - 15); ctx.lineTo(dx + 5, dy + 5); ctx.lineTo(dx - 5, dy + 5); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#e11d48';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(dx, dy - 10); ctx.lineTo(dx, dy + 2); ctx.stroke();
    }
  }

  // Atmospheric Map Environmental Particles & Weather Ambiance
  function drawMapAtmosphere(ctx, mapDef, now, gfx) {
    if (!gfx.detailedAnimations) return;
    const baseId = Math.max(1, Math.min(25, mapDef.id || 1));

    ctx.save();
    if (baseId === 1) {
      // Grassland: drifting leaves & pollen
      for (let i = 0; i < 6; i++) {
        const t = (now * 0.0006 + i * 0.18) % 1;
        const lx = (i * 63 + Math.sin(now * 0.002 + i) * 20 + 360) % 360;
        const ly = t * 440;
        ctx.fillStyle = i % 2 === 0 ? 'rgba(74, 222, 128, 0.45)' : 'rgba(250, 204, 21, 0.4)';
        ctx.beginPath();
        ctx.ellipse(lx, ly, 3, 1.8, Math.sin(now * 0.003 + i), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (baseId === 2) {
      // Desert: blowing sand dust grains
      for (let i = 0; i < 8; i++) {
        const t = (now * 0.0012 + i * 0.13) % 1;
        const sx = t * 360;
        const sy = (i * 55 + Math.sin(now * 0.003 + i) * 12) % 440;
        ctx.fillStyle = 'rgba(253, 230, 138, 0.4)';
        ctx.beginPath();
        ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (baseId === 3) {
      // Snow Mountain: fluttering falling snowflakes
      for (let i = 0; i < 9; i++) {
        const t = (now * 0.0007 + i * 0.12) % 1;
        const fx = (i * 41 + Math.sin(now * 0.0025 + i * 1.5) * 16 + 360) % 360;
        const fy = t * 440;
        ctx.fillStyle = 'rgba(248, 250, 252, 0.6)';
        ctx.beginPath();
        ctx.arc(fx, fy, (i % 3 === 0 ? 2.5 : 1.8), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (baseId === 4) {
      // Dark Forest: drifting bioluminescent spores & mist
      for (let i = 0; i < 7; i++) {
        const pulse = 0.3 + Math.sin(now * 0.004 + i) * 0.25;
        const mx = (i * 53 + Math.cos(now * 0.001 + i) * 22 + 360) % 360;
        const my = (i * 61 + Math.sin(now * 0.0015 + i) * 18 + 440) % 440;
        ctx.fillStyle = `rgba(192, 132, 252, ${pulse})`;
        ctx.beginPath();
        ctx.arc(mx, my, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (baseId === 5) {
      // Volcanic Land: rising flame embers & sparks
      for (let i = 0; i < 8; i++) {
        const t = 1 - ((now * 0.001 + i * 0.14) % 1);
        const ex = (i * 47 + Math.sin(now * 0.004 + i) * 14 + 360) % 360;
        const ey = t * 440;
        const sparkAlpha = Math.sin(t * Math.PI) * 0.65;
        ctx.fillStyle = i % 2 === 0 ? `rgba(249, 115, 22, ${sparkAlpha})` : `rgba(251, 191, 36, ${sparkAlpha})`;
        ctx.beginPath();
        ctx.arc(ex, ey, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (baseId === 6) {
      // Rocky Canyon: canyon dust breeze
      for (let i = 0; i < 7; i++) {
        const t = (now * 0.0009 + i * 0.15) % 1;
        const cx = t * 360;
        const cy = (i * 62 + Math.sin(now * 0.003 + i) * 15) % 440;
        ctx.fillStyle = 'rgba(253, 186, 116, 0.4)';
        ctx.beginPath();
        ctx.arc(cx, cy, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (baseId === 7) {
      // Sunken Ruins: teal swamp mist & bioluminescent ripples
      for (let i = 0; i < 7; i++) {
        const t = (now * 0.0007 + i * 0.16) % 1;
        const wx = (i * 57 + Math.sin(now * 0.002 + i) * 18 + 360) % 360;
        const wy = (i * 64 + Math.cos(now * 0.0015 + i) * 15 + 440) % 440;
        ctx.fillStyle = i % 2 === 0 ? 'rgba(45, 212, 191, 0.4)' : 'rgba(20, 184, 166, 0.35)';
        ctx.beginPath();
        ctx.arc(wx, wy, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (baseId === 8) {
      // Crystal Caverns: sparkling crystalline dust & prism sparkles
      for (let i = 0; i < 8; i++) {
        const sparkle = 0.3 + Math.sin(now * 0.005 + i * 2) * 0.3;
        const cx = (i * 49 + Math.sin(now * 0.001 + i) * 15 + 360) % 360;
        const cy = (i * 58 + Math.cos(now * 0.002 + i) * 20 + 440) % 440;
        ctx.fillStyle = i % 2 === 0 ? `rgba(34, 211, 238, ${sparkle})` : `rgba(192, 132, 252, ${sparkle})`;
        ctx.beginPath();
        ctx.arc(cx, cy, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (baseId === 9) {
      // Sky Temple: radiant golden celestial starlight rays
      for (let i = 0; i < 7; i++) {
        const t = (now * 0.0008 + i * 0.14) % 1;
        const sx = (i * 52 + Math.sin(now * 0.003 + i) * 16 + 360) % 360;
        const sy = t * 440;
        const alpha = Math.sin(t * Math.PI) * 0.55;
        ctx.fillStyle = `rgba(250, 204, 21, ${alpha})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (baseId === 10) {
      // Void Cataclysm: cosmic rift motes & dark matter sparks
      for (let i = 0; i < 9; i++) {
        const t = 1 - ((now * 0.0012 + i * 0.12) % 1);
        const vx = (i * 43 + Math.sin(now * 0.005 + i) * 20 + 360) % 360;
        const vy = t * 440;
        const alpha = Math.sin(t * Math.PI) * 0.65;
        ctx.fillStyle = i % 2 === 0 ? `rgba(244, 63, 94, ${alpha})` : `rgba(236, 72, 153, ${alpha})`;
        ctx.beginPath();
        ctx.arc(vx, vy, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // --- BULLET PROJECTILE RENDERING (Visual match to tower/castle bullet icon at 100 FPS) ---
  function drawBulletProjectile(ctx, p) {
    ctx.save();
    ctx.translate(p.x, p.y);

    const visualAngle = p.angle !== undefined ? p.angle : Math.atan2((p.targetY || p.y) - p.y, (p.targetX || p.x) - p.x);
    const glowColor = p.glowColor || p.color || '#fbbf24';

    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 10;

    if (p.type === 'archer' || p.type === 'arrow') {
      // Smaller flying version of Archer's bullet icon 🏹
      ctx.rotate(visualAngle + Math.PI / 4);
      ctx.font = '14px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🏹', 0, 0);

      // Golden arrow tracer trail
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-Math.cos(visualAngle) * 8, -Math.sin(visualAngle) * 8);
      ctx.lineTo(0, 0);
      ctx.stroke();

    } else if (p.type === 'cannon' || p.type === 'cannonball') {
      // Smaller flying version of Cannon's bullet icon 💣
      ctx.rotate(visualAngle + Math.PI / 4);
      ctx.font = '14px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('💣', 0, 0);

      // Fiery smoke/spark trail
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(239, 68, 68, 0.5)';
      ctx.beginPath();
      ctx.arc(-Math.cos(visualAngle) * 6, -Math.sin(visualAngle) * 6, 2.5, 0, Math.PI * 2);
      ctx.fill();

    } else if (p.type === 'magic' || p.type === 'frostbolt') {
      // Smaller flying version of Magic's bullet icon 🔮
      ctx.font = '14px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🔮', 0, 0);

      // Mystical frosty aura ring
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.stroke();

    } else if (p.type === 'lightning') {
      // Smaller flying version of Lightning's bullet icon ⚡
      ctx.rotate(visualAngle - Math.PI / 2);
      ctx.font = '14px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚡', 0, 0);

      // Electric flare streak
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-Math.cos(visualAngle) * 8, -Math.sin(visualAngle) * 8);
      ctx.lineTo(0, 0);
      ctx.stroke();

    } else if (p.type === 'castle') {
      // Smaller flying version of Castle's bullet icon 🏰
      ctx.rotate(visualAngle);
      ctx.font = '14px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🏰', 0, 0);

      // Golden citadel defense trail
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-Math.cos(visualAngle) * 10, -Math.sin(visualAngle) * 10);
      ctx.lineTo(0, 0);
      ctx.stroke();

    } else {
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.icon || '🏹', 0, 0);
    }

    ctx.restore();
  }

      // Tower Configurations (4 Balanced & Powerful Tower Types)
  const TOWER_CONFIGS = {
    lightning: {
      name: "Lightning Tower",
      icon: "⚡",
      cost: 120,
      upgradeCosts: [80, 140, 220, 340],
      levels: [
        { dmg: 18, rng: 130, spd: 0.80, chain: 2, title: "Lv.1 Basic Arc" },
        { dmg: 30, rng: 140, spd: 0.65, chain: 2, title: "Lv.2 Voltage Spark" },
        { dmg: 45, rng: 152, spd: 0.52, chain: 3, title: "Lv.3 High Voltage ⚡" },
        { dmg: 60, rng: 165, spd: 0.42, chain: 3, title: "Lv.4 Thunder Surge" },
        { dmg: 75, rng: 180, spd: 0.35, chain: 4, title: "Lv.5 Supercharged Arc 👑" }
      ],
      baseDamage: 18,
      baseRange: 130,
      fireInterval: 0.80,
      chainCount: 2,
      color: "#facc15",
      desc: "Very fast chain electric attacks"
    },
    cannon: {
      name: "Cannon Tower",
      icon: "💣",
      cost: 150,
      upgradeCosts: [100, 170, 270, 400],
      levels: [
        { dmg: 45, rng: 120, spd: 2.20, splash: 45, title: "Lv.1 Iron Cannon" },
        { dmg: 80, rng: 130, spd: 1.95, splash: 50, title: "Lv.2 Bombardment" },
        { dmg: 125, rng: 142, spd: 1.70, splash: 55, title: "Lv.3 Heavy Demolition 💥" },
        { dmg: 170, rng: 154, spd: 1.50, splash: 60, title: "Lv.4 Devastator Shells" },
        { dmg: 220, rng: 165, spd: 1.30, splash: 65, title: "Lv.5 Siege Mortar Blast 👑" }
      ],
      baseDamage: 45,
      baseRange: 120,
      fireInterval: 2.20,
      splashRadius: 45,
      color: "#ef4444",
      desc: "Heavy explosive splash damage"
    },
    ice: {
      name: "Ice Tower",
      icon: "❄️",
      cost: 100,
      upgradeCosts: [70, 120, 190, 300],
      levels: [
        { dmg: 10, rng: 125, spd: 0.90, slow: 0.75, dur: 2.5, title: "Lv.1 Frost Chiller" },
        { dmg: 20, rng: 135, spd: 0.82, slow: 0.65, dur: 2.8, title: "Lv.2 Glacial Wave" },
        { dmg: 32, rng: 148, spd: 0.75, slow: 0.55, dur: 3.0, title: "Lv.3 Deep Frost ❄️" },
        { dmg: 44, rng: 160, spd: 0.68, slow: 0.45, dur: 3.2, title: "Lv.4 Permafrost Aura" },
        { dmg: 55, rng: 175, spd: 0.60, slow: 0.35, dur: 3.5, freezeStun: true, title: "Lv.5 Absolute Zero Blizzard 👑" }
      ],
      baseDamage: 10,
      baseRange: 125,
      fireInterval: 0.90,
      slowFactor: 0.75,
      slowDuration: 2.5,
      color: "#38bdf8",
      desc: "Freezing aura slows enemies"
    },
    fire: {
      name: "Fire Tower",
      icon: "🔥",
      cost: 130,
      upgradeCosts: [90, 150, 240, 360],
      levels: [
        { dmg: 15, rng: 125, spd: 1.00, burnDmg: 5, burnDur: 3.0, title: "Lv.1 Ember Igniter" },
        { dmg: 28, rng: 135, spd: 0.88, burnDmg: 12, burnDur: 3.2, title: "Lv.2 Blazing Fireball" },
        { dmg: 42, rng: 148, spd: 0.75, burnDmg: 20, burnDur: 3.5, title: "Lv.3 Inferno Blaze 🔥" },
        { dmg: 56, rng: 160, spd: 0.64, burnDmg: 28, burnDur: 3.8, title: "Lv.4 Pyroclastic Storm" },
        { dmg: 70, rng: 170, spd: 0.55, burnDmg: 35, burnDur: 4.2, title: "Lv.5 Dragon Supernova 👑" }
      ],
      baseDamage: 15,
      baseRange: 125,
      fireInterval: 1.00,
      burnDamage: 5,
      burnDuration: 3.0,
      color: "#f97316",
      desc: "Searing flame burn damage over time"
    }
  };

  // Enemy Types (10 Enemy Categories)
  const ENEMY_TYPES = {
    basic: {
      name: 'Goblin Scout',
      color: '#10b981',
      icon: '👺',
      radius: 10,
      baseHp: 2,
      speed: 1.05,
      baseCastleDamage: 1,
      reward: 15,
      flying: false
    },
    fast: {
      name: 'Shadow Imp',
      color: '#f97316',
      icon: '🐺',
      radius: 9,
      baseHp: 2,
      speed: 1.85,
      baseCastleDamage: 1,
      reward: 20,
      flying: false
    },
    armored: {
      name: 'Iron Guardian',
      color: '#64748b',
      icon: '🛡️',
      radius: 13,
      baseHp: 3,
      speed: 0.75,
      baseCastleDamage: 2,
      reward: 30,
      flying: false
    },
    flying: {
      name: 'Winged Harpy',
      color: '#a855f7',
      icon: '🦇',
      radius: 11,
      baseHp: 4,
      speed: 1.3,
      baseCastleDamage: 1,
      reward: 30,
      flying: true
    },
    tank: {
      name: 'Stone Golem',
      color: '#475569',
      icon: '🪨',
      radius: 15,
      baseHp: 5,
      speed: 0.5,
      baseCastleDamage: 3,
      reward: 45,
      flying: false
    },
    healer: {
      name: 'Holy Acolyte',
      color: '#22c55e',
      icon: '🌾',
      radius: 10,
      baseHp: 3,
      speed: 0.9,
      baseCastleDamage: 1,
      reward: 25,
      flying: false,
      isHealer: true
    },
    stealth: {
      name: 'Phantom Stalker',
      color: '#6366f1',
      icon: '🥷',
      radius: 9,
      baseHp: 2,
      speed: 1.4,
      baseCastleDamage: 1,
      reward: 25,
      flying: false,
      isStealth: true
    },
    swarm: {
      name: 'Locust Swarm',
      color: '#eab308',
      icon: '🐝',
      radius: 7,
      baseHp: 1,
      speed: 1.6,
      baseCastleDamage: 1,
      reward: 10,
      flying: true
    },
    miniboss: {
      name: 'Warlord Champion',
      color: '#d97706',
      icon: '⚔️',
      radius: 16,
      baseHp: 8,
      speed: 0.6,
      baseCastleDamage: 4,
      reward: 100,
      flying: false,
      isMiniBoss: true
    },
    boss: {
      name: 'Void Behemoth',
      color: '#dc2626',
      icon: '👹',
      radius: 20,
      baseHp: 15,
      speed: 0.45,
      baseCastleDamage: 10,
      reward: 300,
      flying: false,
      isBoss: true
    },
    finalBoss: {
      name: 'Void Behemoth Supreme',
      color: '#7f1d1d',
      icon: '👑',
      radius: 24,
      baseHp: 15,
      speed: 0.42,
      baseCastleDamage: 20,
      reward: 1000,
      flying: false,
      isBoss: true,
      isFinalBoss: true
    }
  };

  // Static Main Menu Background (No live wallpaper, no moving towers/enemies)
  class MenuBattleBackground {
    constructor() {
      this.running = false;
      this.rafId = null;
    }
    resize() {}
    pause() {}
    resume() {}
    destroy() {}
  }

  // --- STATE OF CURRENT GAMEPLAY ---
  class GameState {
    constructor() {
      this.sound = new SoundManager();
      this.menuBattle = new MenuBattleBackground();
      this.saveData = Storage.load();
      this.money = typeof this.saveData.money === 'number' ? this.saveData.money : Storage.getMoney();
      this.playerName = this.saveData.playerName || Storage.getPlayerName();
      this.playerAvatar = this.saveData.playerPicture || Storage.getPlayerPicture();
      this.tasks = this.saveData.tasks || Storage.getTasks();
      this.challenges = this.saveData.challenges || Storage.getChallenges();
      this.achievements = Storage.getAchievements();
      this.hasLightningLv5 = false;
      this.hasCannonLv5 = false;
      this.hasIceLv5 = false;
      this.hasFireLv5 = false;
      this.settings = this.saveData.settings || { music: true, sfx: true, quality: "medium", difficulty: "easy", masterVolume: 0.70 };
      this.difficulty = this.settings.difficulty || Storage.getDifficulty();

      this.totalKills = this.saveData.totalKills || 0;
      this.highestWave = this.saveData.highestWave || 0;
      this.totalPlayingTime = this.saveData.totalPlayingTime || 0;
      this.towersBuilt = this.saveData.towersBuilt || 0;
      this.towersUpgraded = this.saveData.towersUpgraded || 0;
      this.bossesDefeated = this.saveData.bossesDefeated || 0;
      this.totalMoneyEarned = this.saveData.totalMoneyEarned || 0;
      this.perfectWavesCount = this.saveData.perfectWavesCount || 0;
      this.speedWavesCount = this.saveData.speedWavesCount || 0;

      const diffCfg = this.getDifficultyConfig();
      this.castleHealth = diffCfg.startingCastleHealth;
      this.maxCastleHealth = diffCfg.startingCastleHealth;
      this.castleHitTimer = 0;
      this.wave = 1;
      this.waveDuration = 0;
      this.gameSpeed = 1;
      this.isPaused = false;
      this.isPlaying = false;
      this.prepTimer = 10;
      this.isWaveActive = false;

      // Statistics
      this.sessionStartTime = 0;
      this.sessionDurationSec = 0;
      this.matchKills = 0;
      this.matchMoneyCollected = 0;
      this.towersBuiltCount = 0;
      this.upgradesCount = 0;
      this.perfectWaveCount = 0;

      // Objects in battle
      this.towers = []; // placed on slots
      this.enemies = [];
      this.projectiles = [];
      this.particles = [];
      this.floatingTexts = [];
      this.lightningArcs = [];

      // Wave Spawner State
      this.spawnQueue = [];
      this.spawnInterval = 0.8;
      this.spawnTimer = 0;

      // Selection & Grid
      this.selectedTile = null;
      this.selectedTower = null;
      this.selectedBuildType = null;
      this.hoverTile = null;

      // Playable Challenge Tracking (100 Challenges)
      this.activeChallenge = null;
      this.isChallengeMode = false;
      this.challengeKills = 0;
      this.challengeWavesCompleted = 0;
      this.challengeBossKills = 0;
      this.challengeTowerKills = { archer: 0, cannon: 0, magic: 0, lightning: 0 };
      this.challengeCastleDamaged = false;
      this.challengeStartTime = 0;
      this.challengeTimeElapsed = 0;
      this.challengeTimeLimit = 0;

      // Camera Scrolling for Long Vertical Battlefield
      this.cameraY = 0;
      this.targetCameraY = 0;
      this.maxCameraY = Math.max(0, MAP_HEIGHT - (LOGICAL_HEIGHT - 120));

      // Canvas & Rendering
      this.canvas = document.getElementById('game-canvas');
      this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
      this.scale = 1;
      this.offsetX = 0;
      this.offsetY = 0;
      this.lastTimestamp = 0;

      this.syncStats();
      this.currentMapIndex = Storage.getCurrentMap();
      const unlocked = Storage.getUnlockedMap();
      if (this.currentMapIndex > unlocked) {
        this.currentMapIndex = unlocked;
        Storage.setCurrentMap(this.currentMapIndex);
      }
      applyMapLayout(this.currentMapIndex);

      this.setupDOM();
      this.applySettings();
      this.renderProfileUI();
      this.updateMapUI();
      this.updateMoneyDisplay();
      this.renderMenuBadges();
      this.resizeCanvas();
      window.addEventListener('resize', () => this.resizeCanvas());

      // Start game loop
      requestAnimationFrame(ts => this.gameLoop(ts));
    }

    getCurrentMapDef() {
      return getMapDefinition(this.currentMapIndex);
    }

    setMap(mapIndex) {
      const unlocked = Storage.getUnlockedMap();
      const target = Math.max(1, Math.min(mapIndex, unlocked));
      this.currentMapIndex = target;
      Storage.setCurrentMap(target);
      applyMapLayout(target);
      this.updateMapUI();
      this.resizeCanvas();
    }

    updateMapUI() {
      const mapDef = this.getCurrentMapDef();
      const hudMapEl = document.getElementById('hud-map-text');
      if (hudMapEl) hudMapEl.textContent = mapDef.displayName;
    }

    openMapSelectModal() {
      this.sound.buttonClick();
      const modal = document.getElementById('map-select-modal');
      this.renderMapSelectModal();
      if (modal) modal.classList.remove('hidden');
    }

    closeMapSelectModal() {
      this.sound.buttonClick();
      const modal = document.getElementById('map-select-modal');
      if (modal) modal.classList.add('hidden');
    }

    openDailyRewardModal() {
      this.sound.buttonClick();
      this.renderDailyRewardUI();
      const modal = document.getElementById('daily-reward-modal');
      if (modal) modal.classList.remove('hidden');
    }

    closeDailyRewardModal() {
      this.sound.buttonClick();
      const modal = document.getElementById('daily-reward-modal');
      if (modal) modal.classList.add('hidden');
    }

    renderDailyRewardUI() {
      const grid = document.getElementById('daily-rewards-grid');
      const claimBtn = document.getElementById('btn-claim-daily');
      const badge = document.getElementById('daily-badge');
      if (!grid) return;

      const info = Storage.getDailyRewardInfo();
      const rewards = [150, 250, 400, 600, 850, 1200, 2000];

      grid.innerHTML = '';
      rewards.forEach((amt, idx) => {
        const dayNum = idx + 1;
        const card = document.createElement('div');
        card.className = 'daily-card';
        if (dayNum === 7) card.classList.add('jackpot');

        let statusText = `Day ${dayNum}`;
        let icon = dayNum === 7 ? '👑' : (dayNum >= 4 ? '🎁' : '🪙');

        if (info.claimedToday) {
          if (dayNum <= info.loginStreak) {
            card.classList.add('claimed');
            statusText = '✔ CLAIMED';
          }
        } else {
          if (dayNum < info.nextStreak) {
            card.classList.add('claimed');
            statusText = '✔ CLAIMED';
          } else if (dayNum === info.nextStreak) {
            card.classList.add('active');
            statusText = '⚡ READY!';
          }
        }

        card.innerHTML = `
          <div class="daily-card-day">DAY ${dayNum}</div>
          <div class="daily-card-icon">${icon}</div>
          <div class="daily-card-reward">+Rs ${amt}</div>
          <div class="daily-card-badge">${statusText}</div>
        `;
        grid.appendChild(card);
      });

      if (badge) {
        if (!info.claimedToday) badge.classList.remove('hidden');
        else badge.classList.add('hidden');
      }

      if (claimBtn) {
        if (info.claimedToday) {
          claimBtn.disabled = true;
          claimBtn.classList.add('disabled');
          claimBtn.textContent = '✔ CLAIMED TODAY';
        } else {
          const nextAmt = rewards[info.nextStreak - 1];
          claimBtn.disabled = false;
          claimBtn.classList.remove('disabled');
          claimBtn.textContent = `🎁 CLAIM DAY ${info.nextStreak} (+Rs ${nextAmt})`;
        }
      }
    }

    claimDailyRewardAction() {
      const res = Storage.claimDailyReward();
      if (!res) return;

      this.sound.coinCollect();
      this.money = res.totalMoney;
      this.saveData.money = this.money;
      this.saveGameData();
      this.updateMoneyDisplay();

      // Show floating reward text
      this.addFloatingText(180, 200, `+Rs ${res.amount} DAILY REWARD! 🎁`, '#fbbf24');

      this.renderDailyRewardUI();
      this.renderMenuBadges();
    }

    renderMapSelectModal() {
      const container = document.getElementById('map-grid-container');
      if (!container) return;
      container.innerHTML = '';

      const unlocked = Storage.getUnlockedMap();

      MAP_DEFINITIONS.forEach(m => {
        const isUnlocked = (m.id <= unlocked);
        const isActive = (m.id === this.currentMapIndex);

        const card = document.createElement('div');
        card.className = `map-card ${isUnlocked ? 'unlocked' : 'locked'} ${isActive ? 'selected' : ''}`;
        card.setAttribute('data-map-id', m.id);

        let badgeHtml = '';
        if (isUnlocked) {
          badgeHtml = isActive
            ? '<span class="map-card-badge badge-active">⭐ ACTIVE • UNLOCKED</span>'
            : '<span class="map-card-badge badge-unlocked">✅ UNLOCKED</span>';
        } else {
          badgeHtml = '<span class="map-card-badge badge-locked">🔒 LOCKED</span>';
        }

        let actionHtml = '';
        if (isUnlocked) {
          actionHtml = `<button class="btn-card-play" data-play-map="${m.id}" title="Play ${m.displayName}">PLAY</button>`;
        } else {
          actionHtml = `<span class="lock-req-text" style="font-size:10px; color:#94a3b8;">🔒 Complete Map ${m.id - 1} first</span>`;
        }

        card.innerHTML = `
          <div class="map-card-left">
            <span class="map-card-icon">${m.icon}</span>
            <div class="map-card-title-group">
              <span class="map-card-name">${m.displayName}</span>
              <span class="map-card-theme">${m.themeDesc} • Speed x${m.speedMultiplier} • HP x${m.hpMultiplier}</span>
            </div>
          </div>
          <div class="map-card-right">
            ${badgeHtml}
            ${actionHtml}
          </div>
        `;

        if (isUnlocked) {
          card.addEventListener('click', (e) => {
            if (e.target.closest('.btn-card-play')) return;
            this.sound.buttonClick();
            this.setMap(m.id);
            this.renderMapSelectModal();
          });

          const playBtn = card.querySelector('.btn-card-play');
          playBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.sound.buttonClick();
            this.setMap(m.id);
            this.closeMapSelectModal();
            this.startMatch();
          });
        }

        container.appendChild(card);
      });
    }

    playAgainFreshGame() {
      this.sound.buttonClick();
      Storage.setUnlockedMap(1);
      Storage.setCurrentMap(1);
      this.currentMapIndex = 1;
      this.wave = 1;
      this.matchKills = 0;
      this.matchMoneyCollected = 0;
      this.saveGameData();
      this.updateMapUI();
      this.startMatch();
    }

    saveGameData() {
      this.syncStats();
      this.saveData.money = this.money;
      this.saveData.playerName = this.playerName;
      this.saveData.playerPicture = this.playerAvatar;
      this.saveData.tasks = this.tasks;
      this.saveData.challenges = this.challenges;
      this.saveData.difficulty = this.difficulty;
      const vol = this.sound ? this.sound.masterVolume : 0.70;
      const qual = this.settings?.quality || 'medium';
      this.saveData.masterVolume = vol;
      this.saveData.quality = qual;
      this.saveData.castleHealth = this.castleHealth || 100;
      this.saveData.wave = this.wave || 1;
      this.saveData.settings = {
        ...this.settings,
        difficulty: this.difficulty,
        masterVolume: vol,
        quality: qual,
        sfx: this.sound ? this.sound.sfxEnabled : true,
        music: this.sound ? this.sound.musicEnabled : true
      };
      this.saveData.totalKills = this.totalKills;
      this.saveData.highestWave = this.highestWave;
      this.saveData.totalPlayingTime = this.totalPlayingTime;
      this.saveData.towersBuilt = this.towersBuilt;
      this.saveData.towersUpgraded = this.towersUpgraded;
      this.saveData.bossesDefeated = this.bossesDefeated;
      this.saveData.totalMoneyEarned = this.totalMoneyEarned;
      this.saveData.perfectWavesCount = this.perfectWavesCount;
      this.saveData.speedWavesCount = this.speedWavesCount;

      Storage.save(this.saveData);
      Storage.setPlayerName(this.playerName);
      if (this.playerAvatar) Storage.setPlayerAvatar(this.playerAvatar);
      Storage.setMoney(this.money);
      Storage.setDifficulty(this.difficulty);
      Storage.setMasterVolume(vol);
      Storage.setGraphicsQuality(qual);
      Storage.setCastleHealth(this.castleHealth || 100);
      Storage.setWave(this.wave || 1);
      Storage.saveChallenges(this.challenges);
      Storage.saveTasks(this.tasks);
      Storage.saveStatistics({
        totalKills: this.totalKills,
        highestWave: this.highestWave,
        totalPlayingTime: this.totalPlayingTime,
        towersBuilt: this.towersBuilt,
        towersUpgraded: this.towersUpgraded,
        bossesDefeated: this.bossesDefeated,
        totalMoneyEarned: this.totalMoneyEarned,
        perfectWavesCount: this.perfectWavesCount,
        speedWavesCount: this.speedWavesCount
      });
    }

    saveAll() {
      this.saveGameData();
    }

    syncStats() {
      this.tasks.forEach(t => {
        if (t.type === 'kills') t.current = Math.min(t.target, this.totalKills);
        else if (t.type === 'waves') t.current = Math.min(t.target, this.highestWave);
        else if (t.type === 'builds') t.current = Math.min(t.target, this.towersBuilt);
        else if (t.type === 'upgrades') t.current = Math.min(t.target, this.towersUpgraded);
        else if (t.type === 'bosses') t.current = Math.min(t.target, this.bossesDefeated);
        else if (t.type === 'earnings') t.current = Math.min(t.target, this.totalMoneyEarned);
        else if (t.type === 'init') t.current = 1;
      });

      const maxLevelTowers = this.towers.filter(t => t.level >= 3).length;
      this.challenges.forEach(c => {
        if (c.type === 'waves') c.current = Math.min(c.target, this.highestWave);
        else if (c.type === 'perfect') c.current = Math.min(c.target, this.perfectWavesCount);
        else if (c.type === 'kills') c.current = Math.min(c.target, this.totalKills);
        else if (c.type === 'bosses') c.current = Math.min(c.target, this.bossesDefeated);
        else if (c.type === 'max_towers') c.current = Math.min(c.target, Math.max(c.current, maxLevelTowers));
        else if (c.type === 'speed') c.current = Math.min(c.target, this.speedWavesCount);
      });
    }

    getDifficultyConfig() {
      return DIFFICULTY_CONFIG[this.difficulty] || DIFFICULTY_CONFIG.easy;
    }

    getGraphicsConfig() {
      return GRAPHICS_CONFIG[this.settings.quality] || GRAPHICS_CONFIG.medium;
    }

    setPlayerName(name) {
      this.playerName = Storage.setPlayerName(name);
      this.renderProfileUI();
      return this.playerName;
    }

    getPlayerName() {
      return this.playerName || Storage.getPlayerName();
    }

    setDifficulty(diff) {
      if (!DIFFICULTY_CONFIG[diff]) return;
      this.difficulty = diff;
      this.settings.difficulty = diff;
      Storage.setDifficulty(diff);
      const diffCfg = this.getDifficultyConfig();
      if (!this.isPlaying) {
        this.castleHealth = diffCfg.startingCastleHealth;
        this.maxCastleHealth = diffCfg.startingCastleHealth;
      }
      this.saveAll();
      this.updateDifficultyUI();
      this.updateHud();
    }

    setGraphicsQuality(quality) {
      if (!GRAPHICS_CONFIG[quality]) return;
      this.settings.quality = quality;
      localStorage.setItem('vtd_graphics_quality', quality);
      this.saveAll();
      this.applySettings();
    }

    updateDifficultyUI() {
      const diffCfg = this.getDifficultyConfig();
      document.querySelectorAll('.btn-difficulty').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-diff') === this.difficulty);
      });
      const descEl = document.getElementById('difficulty-desc');
      if (descEl) {
        descEl.innerHTML = diffCfg.desc;
      }
    }

    updateGraphicsUI() {
      const gfxCfg = this.getGraphicsConfig();
      document.querySelectorAll('#graphics-selector .btn-chip').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-quality') === this.settings.quality);
      });
      const descEl = document.getElementById('graphics-desc');
      if (descEl) {
        descEl.innerHTML = gfxCfg.desc;
      }
    }

    updateVolumeUI() {
      const masterSlider = document.getElementById('slider-master-volume');
      const musicSlider = document.getElementById('slider-music-volume');
      const sfxSlider = document.getElementById('slider-sfx-volume');
      const toggleMute = document.getElementById('toggle-mute-all');

      const masterPct = Math.round(this.sound.masterVolume * 100);
      const musicPct = Math.round(this.sound.musicVolume * 100);
      const sfxPct = Math.round(this.sound.sfxVolume * 100);

      if (masterSlider) masterSlider.value = masterPct;
      if (musicSlider) musicSlider.value = musicPct;
      if (sfxSlider) sfxSlider.value = sfxPct;
      if (toggleMute) toggleMute.checked = this.sound.isMuted;

      const txtMaster = document.getElementById('volume-percent-text');
      if (txtMaster) txtMaster.textContent = `${masterPct}%`;

      const txtMusic = document.getElementById('music-percent-text');
      if (txtMusic) txtMusic.textContent = `${musicPct}%`;

      const txtSfx = document.getElementById('sfx-percent-text');
      if (txtSfx) txtSfx.textContent = `${sfxPct}%`;
    }

    applySettings() {
      this.sound.sfxEnabled = this.settings.sfx;
      this.sound.musicEnabled = this.settings.music;
      const toggleMusic = document.getElementById('toggle-music');
      const toggleSfx = document.getElementById('toggle-sfx');
      if (toggleMusic) toggleMusic.checked = this.settings.music;
      if (toggleSfx) toggleSfx.checked = this.settings.sfx;

      this.updateVolumeUI();
      this.updateGraphicsUI();
      this.updateDifficultyUI();
    }

    addMoney(amount) {
      this.money += amount;
      this.matchMoneyCollected += Math.max(0, amount);
      if (amount > 0) this.totalMoneyEarned += amount;
      this.syncStats();
      this.saveAll();
      this.updateMoneyDisplay();
    }

    spendMoney(amount) {
      if (this.money < amount) return false;
      this.money -= amount;
      this.saveAll();
      this.updateMoneyDisplay();
      return true;
    }

    updateMoneyDisplay() {
      const formatted = 'Rs ' + this.money;
      const m1 = document.getElementById('menu-money-display');
      const m2 = document.getElementById('hud-money');
      if (m1) m1.textContent = formatted;
      if (m2) m2.textContent = formatted;
    }

    renderProfileUI() {
      const nameEl = document.getElementById('menu-player-name');
      const avatarImg = document.getElementById('menu-avatar-img');
      const avatarFallback = document.getElementById('menu-avatar-fallback');
      if (nameEl) nameEl.textContent = this.playerName;

      if (this.playerAvatar) {
        if (avatarImg) {
          avatarImg.src = this.playerAvatar;
          avatarImg.classList.remove('hidden');
        }
        if (avatarFallback) avatarFallback.classList.add('hidden');
      } else {
        if (avatarImg) avatarImg.classList.add('hidden');
        if (avatarFallback) avatarFallback.classList.remove('hidden');
      }
    }

    progressTask(id, increment = 1) {
      let changed = false;
      this.tasks.forEach(t => {
        if (t.id === id && !t.claimed) {
          t.current = Math.min(t.target, t.current + increment);
          changed = true;
        }
      });
      if (changed) {
        this.saveAll();
        this.renderMenuBadges();
      }
    }

    progressChallenge(id, increment = 1) {
      let changed = false;
      this.challenges.forEach(c => {
        if (c.id === id && !c.claimed) {
          c.current = Math.min(c.target, c.current + increment);
          changed = true;
        }
      });
      if (changed) {
        this.saveAll();
        this.renderMenuBadges();
      }
    }

    renderMenuBadges() {
      const claimableTasks = this.tasks.filter(t => !t.claimed && t.current >= t.target).length;
      const claimableChs = this.challenges.filter(c => !c.claimed && c.current >= c.target).length;
      
      const tb = document.getElementById('task-badge');
      if (tb) {
        tb.classList.toggle('hidden', claimableTasks === 0);
        tb.textContent = claimableTasks.toString();
      }

      const cb = document.getElementById('challenge-badge');
      if (cb) {
        cb.classList.toggle('hidden', claimableChs === 0);
        cb.textContent = claimableChs.toString();
      }

      const dailyInfo = Storage.getDailyRewardInfo();
      const db = document.getElementById('daily-badge');
      if (db) {
        db.classList.toggle('hidden', dailyInfo.claimedToday);
        db.textContent = '!';
      }
    }

    // --- SCREEN NAVIGATION ---
    showScreen(screenOrId) {
      const screens = {
        mainMenu: document.getElementById('main-menu'),
        gameScreen: document.getElementById('gameplay-screen'),
        gameplayScreen: document.getElementById('gameplay-screen'),
        challengeScreen: document.getElementById('challenges-screen'),
        taskScreen: document.getElementById('tasks-modal'),
        settingsScreen: document.getElementById('settings-modal'),
        customizationScreen: document.getElementById('profile-modal'),
        exitScreen: document.getElementById('exit-screen'),
        gameOverScreen: document.getElementById('game-over-screen'),
        victoryScreen: document.getElementById('victory-screen')
      };

      let targetEl = null;
      let targetId = '';

      if (typeof screenOrId === 'string') {
        if (screens[screenOrId]) {
          targetEl = screens[screenOrId];
          targetId = targetEl.id || screenOrId;
        } else {
          targetEl = document.getElementById(screenOrId);
          targetId = screenOrId;
        }
      } else if (screenOrId && (screenOrId.nodeType || screenOrId.style || screenOrId.id)) {
        targetEl = screenOrId;
        targetId = screenOrId.id || '';
      }

      // Hide all registered screens
      const uniqueScreens = new Set(Object.values(screens).filter(Boolean));
      uniqueScreens.forEach(sc => {
        sc.style.display = 'none';
        sc.classList.remove('active');
        if (sc.classList.contains('modal-overlay')) {
          sc.classList.add('hidden');
        }
      });

      // Close open modals so screens never get blocked
      const overlayModals = [
        'tasks-modal',
        'settings-modal',
        'profile-modal',
        'pause-modal',
        'challenge-complete-modal',
        'challenge-failed-modal'
      ];
      overlayModals.forEach(mId => {
        const modal = document.getElementById(mId);
        if (modal && modal !== targetEl) {
          modal.classList.add('hidden');
        }
      });

      if (targetEl) {
        targetEl.style.display = 'flex';
        targetEl.classList.add('active');
        if (targetEl.classList.contains('modal-overlay')) {
          targetEl.classList.remove('hidden');
        }

        if (targetId === 'main-menu' || targetId === 'mainMenu') {
          this.sound.startMenuMusic();
        } else if (targetId === 'gameplay-screen' || targetId === 'gameScreen' || targetId === 'gameplayScreen') {
          this.sound.startGameplayMusic(this.currentMapIndex, false);
        } else if (targetId === 'exit-screen' || targetId === 'exitScreen') {
          this.sound.exitGame();
        }
      }

      if (this.menuBattle) {
        if (targetId === 'main-menu') {
          this.menuBattle.resume();
        } else {
          this.menuBattle.pause();
        }
      }
    }

    openExitScreen() {
      this.sound?.buttonClick();
      this.saveGameData();
      const exitScreen = document.getElementById('exit-screen');
      this.showScreen(exitScreen || 'exitScreen');
    }

    returnToMainMenu() {
      this.sound?.buttonClick();
      const mainMenu = document.getElementById('main-menu');
      this.showScreen(mainMenu || 'mainMenu');
    }

    closeGame() {
      this.sound?.buttonClick();
      this.saveGameData();

      // 1. Android Native Bridge: terminates activity & process immediately (does not minimize)
      try {
        if (window.AndroidBridge && typeof window.AndroidBridge.closeApp === 'function') {
          window.AndroidBridge.closeApp();
          return;
        }
      } catch (e) {
        console.warn('AndroidBridge.closeApp error:', e);
      }

      // 2. Standard Web/Desktop window closure
      try {
        window.close();
      } catch (e) {}

      // 3. Fallback script-closed method
      try {
        window.open('', '_self');
        window.close();
      } catch (e) {}

      // 4. In case the browser sandbox blocks automated script closing:
      const exitDesc = document.querySelector('.exit-desc');
      if (exitDesc) {
        exitDesc.textContent = 'Game saved successfully. You may safely close this browser window or tab.';
      }
      const btnClose = document.getElementById('btn-close-game');
      if (btnClose) {
        btnClose.textContent = 'CLOSED';
        btnClose.disabled = true;
      }
    }

    startMatch() {
      this.sound.init();
      this.isChallengeMode = false;
      this.activeChallenge = null;
      applyMapLayout(this.currentMapIndex);
      this.updateMapUI();
      this.updateTowerCardsAvailability();
      document.getElementById('active-challenge-hud')?.classList.add('hidden');
      document.getElementById('challenge-complete-modal')?.classList.add('hidden');
      document.getElementById('challenge-failed-modal')?.classList.add('hidden');

      const diffCfg = this.getDifficultyConfig();
      this.isPlaying = true;
      this.castleHealth = diffCfg.startingCastleHealth;
      this.maxCastleHealth = diffCfg.startingCastleHealth;
      this.castleHitTimer = 0;
      this.wave = 1;
      this.isPaused = false;
      this.gameSpeed = 1;
      this.prepTimer = 8;
      this.isWaveActive = false;
      this.sessionStartTime = Date.now();
      this.sessionDurationSec = 0;
      this.matchKills = 0;
      this.matchMoneyCollected = 0;

      this.towers = [];
      this.enemies = [];
      this.projectiles = [];
      this.particles = [];
      this.floatingTexts = [];
      this.lightningArcs = [];

      this.selectedTile = null;
      this.selectedTower = null;
      this.selectedBuildType = null;
      this.hoverTile = null;
      this.cameraY = 0;
      this.targetCameraY = 0;
      document.getElementById('tile-selection-hint')?.classList.add('hidden');
      document.querySelectorAll('.tower-card').forEach(c => c.classList.remove('selected'));
      this.closeInspector();

      this.updateHud();
      this.showScreen('gameplay-screen');
      this.resizeCanvas();
      this.showWaveBanner(`WAVE 1 / ${diffCfg.maxWaves}`, 'PREPARE DEFENSES!');
      this.sound.startGameplayMusic(this.currentMapIndex, false);
    }

    endMatchGameOver() {
      if (this.isChallengeMode) {
        this.failChallenge();
        return;
      }
      this.isPlaying = false;
      this.sound.stopMusic();
      this.sound.gameOverSound();

      // Update GameOver Dialog Values
      const goMoney = document.getElementById('go-money');
      const goKills = document.getElementById('go-kills');
      const goDur = document.getElementById('go-duration');

      if (goMoney) goMoney.textContent = `Rs ${this.matchMoneyCollected}`;
      if (goKills) goKills.textContent = this.matchKills.toString();
      if (goDur) goDur.textContent = this.formatDuration(this.sessionDurationSec);

      this.showScreen('game-over-screen');
    }

    showVictoryScreen() {
      if (this.isChallengeMode) {
        this.completeChallenge();
        return;
      }
      this.isPlaying = false;
      this.sound.stopMusic();
      this.sound.victorySound();

      const diffCfg = this.getDifficultyConfig();
      const maxW = diffCfg.maxWaves || 50;

      const currentMap = this.currentMapIndex;
      const isFinalMap25 = (currentMap >= 25);

      // Unlock next map progression if not already at 25
      if (!isFinalMap25) {
        const nextMap = currentMap + 1;
        const currentUnlocked = Storage.getUnlockedMap();
        if (nextMap > currentUnlocked) {
          Storage.setUnlockedMap(nextMap);
        }
      }

      const mapDef = this.getCurrentMapDef();
      const nextMapDef = isFinalMap25 ? null : getMapDefinition(currentMap + 1);

      const vTitle = document.getElementById('vic-title') || document.querySelector('.victory-title');
      const vSub = document.getElementById('vic-subtitle') || document.querySelector('.victory-subtitle');
      const vMap = document.getElementById('vic-map');
      const vWaves = document.getElementById('vic-waves') || document.querySelector('.victory-stats .stat-line-val.highlight');
      const vDiff = document.getElementById('vic-difficulty');
      const vCastle = document.getElementById('vic-castle');
      const vMoney = document.getElementById('vic-money');
      const vKills = document.getElementById('vic-kills');
      const vDur = document.getElementById('vic-duration');
      const nextMapBtn = document.getElementById('btn-next-map');
      const playAgainBtn = document.getElementById('btn-play-again');

      if (isFinalMap25) {
        if (vTitle) vTitle.textContent = "🎉 YOU WIN! 🎉";
        if (vSub) vSub.textContent = "Congratulations! You completed all 25 maps!";
        if (nextMapBtn) nextMapBtn.classList.add('hidden');
        if (playAgainBtn) playAgainBtn.classList.remove('hidden');
      } else {
        if (vTitle) vTitle.textContent = "MAP COMPLETE!";
        if (vSub) vSub.textContent = `🏆 ${mapDef.displayName.toUpperCase()} CLEARED!`;
        if (nextMapBtn) {
          nextMapBtn.classList.remove('hidden');
          nextMapBtn.textContent = `⚔️ NEXT MAP (${nextMapDef.displayName})`;
        }
        if (playAgainBtn) playAgainBtn.classList.add('hidden');
      }

      if (vMap) vMap.textContent = mapDef.displayName;
      if (vWaves) vWaves.textContent = `${maxW} / ${maxW}`;
      if (vDiff) vDiff.textContent = diffCfg.name;
      if (vCastle) vCastle.textContent = `🏰 ${this.castleHealth} / ${this.maxCastleHealth}`;
      if (vMoney) vMoney.textContent = `Rs ${this.matchMoneyCollected}`;
      if (vKills) vKills.textContent = this.matchKills.toString();
      if (vDur) vDur.textContent = this.formatDuration(this.sessionDurationSec);

      this.updateMapUI();
      this.saveGameData();
      this.showScreen('victory-screen');
    }

    formatDuration(seconds) {
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }

    updateHud() {
      const hc = document.getElementById('hud-castle');
      const hw = document.getElementById('hud-wave');
      const pt = document.getElementById('prep-timer-val');
      const wb = document.getElementById('wave-control-bar');
      const hk = document.getElementById('hud-kills');
      const diffCfg = this.getDifficultyConfig();
      const maxW = diffCfg.maxWaves || 50;

      if (hc) hc.textContent = `${this.castleHealth} / ${this.maxCastleHealth}`;
      if (hk) hk.textContent = `${this.matchKills || 0}`;
      if (hw) {
        if (this.isChallengeMode && this.activeChallenge) {
          const ch = this.activeChallenge;
          if (['waves', 'perfect', 'timed', 'archer_only', 'cannon_only', 'magic_only', 'lightning_only', 'budget'].includes(ch.type)) {
            hw.textContent = `WAVE ${this.wave} / ${ch.target}`;
          } else {
            hw.textContent = `WAVE ${this.wave}`;
          }
        } else {
          hw.textContent = `WAVE ${this.wave} / ${maxW}`;
        }
      }
      this.updateMoneyDisplay();

      if (wb) {
        wb.style.display = this.isWaveActive ? 'none' : 'flex';
      }
      if (pt) {
        pt.textContent = `${Math.max(0, Math.ceil(this.prepTimer))}s`;
      }
      if (this.isChallengeMode) {
        this.updateChallengeProgressUI();
      }
    }

    showWaveBanner(title, subtitle) {
      const banner = document.getElementById('wave-banner');
      const t = document.getElementById('wave-banner-text');
      const s = document.getElementById('wave-banner-sub');
      if (t) t.textContent = title;
      if (s) s.textContent = subtitle;
      if (banner) {
        banner.classList.remove('hidden');
        setTimeout(() => banner.classList.add('hidden'), 2400);
      }
    }

    triggerWave() {
      if (this.isWaveActive) return;
      this.isWaveActive = true;
      this.prepTimer = 0;
      this.updateHud();

      const diffCfg = this.getDifficultyConfig();
      const maxW = diffCfg.maxWaves || 50;
      this.spawnInterval = diffCfg.spawnInterval;

      const isBossWave = (this.wave % 5 === 0);
      const isFinalWave = (this.wave === maxW);

      this.sound.waveHorn();
      if (isFinalWave) {
        this.showWaveBanner(`WAVE ${maxW} / ${maxW}`, '🔥 FINAL BOSS: VOID BEHEMOTH SUPREME!');
      } else if (isBossWave) {
        this.showWaveBanner(`WAVE ${this.wave} / ${maxW}`, '⚠️ VOID BEHEMOTH BOSS!');
      } else {
        this.showWaveBanner(`WAVE ${this.wave} / ${maxW}`, 'MONSTERS MARCH!');
      }

      // Generate Enemy Queue for this wave
      this.spawnQueue = [];
      const currentWave = this.wave;

      // Basic enemy baseline health based on difficulty:
      // EASY: 3 HP, NORMAL: 4 HP, HARD: 5 HP
      const baseHp = diffCfg.basicEnemyHp || 3;
      const waveHpScale = Math.floor((currentWave - 1) / (diffCfg.id === 'easy' ? 18 : (diffCfg.id === 'normal' ? 14 : 10)));
      const basicEnemyHealth = baseHp + waveHpScale;

      const count = diffCfg.id === 'easy' 
        ? Math.min(24, 4 + Math.floor(currentWave * 0.35))
        : (diffCfg.id === 'normal'
            ? Math.min(32, 5 + Math.floor(currentWave * 0.45))
            : Math.min(45, 7 + Math.floor(currentWave * 0.55)));
      const spdMultiplier = Math.min(1.22, 1 + (currentWave - 1) * 0.008) * diffCfg.enemySpeedMultiplier;

      const mapDef = this.getCurrentMapDef();
      const mapHpMult = mapDef.hpMultiplier || 1.0;
      const mapSpdMult = mapDef.speedMultiplier || 1.0;
      const mapGoldMult = mapDef.goldMultiplier || 1.0;

      for (let i = 0; i < count; i++) {
        let typeKey = 'basic';
        if (currentWave >= 2 && i % 8 === 1) typeKey = 'fast';
        if (currentWave >= 3 && i % 8 === 2) typeKey = 'flying';
        if (currentWave >= 4 && i % 8 === 3) typeKey = 'armored';
        if (currentWave >= 5 && i % 8 === 4) typeKey = 'tank';
        if (currentWave >= 6 && i % 8 === 5) typeKey = 'healer';
        if (currentWave >= 7 && i % 8 === 6) typeKey = 'stealth';
        if (currentWave >= 8 && i % 8 === 7) typeKey = 'swarm';
        if (currentWave >= 10 && i === Math.floor(count / 2)) typeKey = 'miniboss';

        // Every 5th wave contains a Void Behemoth boss (or Void Behemoth Supreme on Final Wave)
        if (isBossWave && i === count - 1) {
          typeKey = isFinalWave ? 'finalBoss' : 'boss';
        }

        const cfg = ENEMY_TYPES[typeKey] || ENEMY_TYPES.basic;
        let calcHp = cfg.baseHp || 2;
        if (typeKey === 'boss' || typeKey === 'finalBoss') {
          calcHp = 15;
        } else if (diffCfg.id === 'hard') {
          calcHp = Math.round(calcHp * 1.25);
        }

        // Gradual map progression difficulty scaling
        if (mapDef.id > 1) {
          calcHp = Math.max(calcHp, Math.round(calcHp * mapHpMult));
        }

        const castleDmg = cfg.baseCastleDamage || 1;

        this.spawnQueue.push({
          type: typeKey,
          name: cfg.name,
          hp: calcHp,
          maxHp: calcHp,
          speed: Number((cfg.speed * spdMultiplier * mapSpdMult).toFixed(2)),
          castleDamage: castleDmg,
          reward: Math.round(cfg.reward * (1 + currentWave * 0.05) * mapGoldMult),
          color: cfg.color,
          icon: cfg.icon,
          radius: cfg.radius,
          flying: cfg.flying,
          isBoss: !!cfg.isBoss,
          isFinalBoss: !!cfg.isFinalBoss
        });
      }
      this.spawnTimer = 0.5;
    }

    onWaveComplete() {
      this.isWaveActive = false;
      const waveReward = 80 + this.wave * 25;
      this.addMoney(waveReward);

      this.highestWave = Math.max(this.highestWave, this.wave);
      if (this.castleHealth >= this.maxCastleHealth) {
        this.perfectWaveCount++;
        this.perfectWavesCount++;
      }
      if (this.waveDuration > 0 && this.waveDuration < 80) {
        this.speedWavesCount++;
      }
      this.syncStats();
      this.saveAll();

      if (this.isChallengeMode && this.activeChallenge) {
        this.challengeWavesCompleted++;
        this.checkChallengeConditions();
        if (!this.isPlaying) return;
      }

      const diffCfg = this.getDifficultyConfig();
      const maxW = diffCfg.maxWaves || 50;

      if (this.wave >= maxW) {
        // Successfully completed final wave for this difficulty!
        this.sound.victorySound();
        this.showWaveBanner(`🏆 ${maxW} / ${maxW} WAVES COMPLETED!`, 'CITADEL DEFENDED & VICTORY!');
        setTimeout(() => {
          this.showVictoryScreen();
        }, 1600);
        return;
      }

      this.showWaveBanner(`WAVE ${this.wave} / ${maxW} CLEARED!`, `+Rs ${waveReward} BONUS`);
      this.wave++;
      this.waveDuration = 0;
      this.prepTimer = 8;
      this.updateHud();
    }

    // --- CANVAS SIZING & COORDINATES ---
    resizeCanvas() {
      const container = document.getElementById('canvas-container') || document.querySelector('.game-wrapper');
      if (this.canvas && container) {
        const rect = container.getBoundingClientRect();
        const width = rect.width || container.clientWidth || 360;
        const height = rect.height || container.clientHeight || 520;
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;

        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';

        // Fit entire 360x520 playable map inside canvas area without cropping
        const scaleX = width / MAP_WIDTH;
        const scaleY = height / MAP_HEIGHT;
        this.scale = Math.min(scaleX, scaleY);
        this.offsetX = (width - MAP_WIDTH * this.scale) / 2;
        this.offsetY = (height - MAP_HEIGHT * this.scale) / 2;

        this.cameraY = 0;
        this.targetCameraY = 0;
        this.maxCameraY = 0;
      }

      if (this.menuBattle) {
        this.menuBattle.resize();
      }
    }

    async enterFullscreen() {
      const game = document.querySelector('.game-wrapper');
      try {
        if (!document.fullscreenElement) {
          if (game && game.requestFullscreen) {
            await game.requestFullscreen();
          } else if (game && game.webkitRequestFullscreen) {
            await game.webkitRequestFullscreen();
          }
        } else {
          if (document.exitFullscreen) {
            await document.exitFullscreen();
          }
        }
      } catch (e) {}
    }

    screenToLogical(clientX, clientY) {
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      return {
        x: (x - this.offsetX) / this.scale,
        y: (y - this.offsetY) / this.scale
      };
    }

    // --- MAIN GAME LOOP (100 FPS Target) ---
    gameLoop(timestamp) {
      if (this.destroyed) return;

      // Prevent CPU/battery drain when browser tab or activity is in background
      if (typeof document !== 'undefined' && document.hidden) {
        this.lastTimestamp = timestamp;
        setTimeout(() => {
          if (!this.destroyed) requestAnimationFrame(ts => this.gameLoop(ts));
        }, 200);
        return;
      }

      if (!this.lastTimestamp) {
        this.lastTimestamp = timestamp;
        this.lastRenderTimestamp = timestamp;
      }

      const TARGET_FPS = 100;
      const TARGET_FRAME_MS = 1000 / TARGET_FPS; // 10.0 ms target
      const elapsedFromRender = timestamp - this.lastRenderTimestamp;

      // Pacing for 100 FPS: throttle if called faster than 100 FPS target
      if (elapsedFromRender < TARGET_FRAME_MS - 0.5) {
        requestAnimationFrame(ts => this.gameLoop(ts));
        return;
      }

      let dt = (timestamp - this.lastTimestamp) / 1000;
      this.lastTimestamp = timestamp;
      this.lastRenderTimestamp = timestamp;

      // Clamp dt to prevent physics anomalies
      if (dt > 0.05) dt = 0.05;
      if (dt < 0.005) dt = 0.005;

      if (this.isPlaying && !this.isPaused) {
        const gameDt = dt * this.gameSpeed;
        this.updateGame(gameDt);
      }

      this.render();
      requestAnimationFrame(ts => this.gameLoop(ts));
    }

    updateGame(dt) {
      this.sessionDurationSec += dt;
      if (this.castleHitTimer > 0) {
        this.castleHitTimer -= dt;
      }

      if (this.isChallengeMode && this.activeChallenge) {
        this.challengeTimeElapsed += dt;
        if (this.activeChallenge.timeLimit > 0) {
          const timeLeft = Math.max(0, this.activeChallenge.timeLimit - this.challengeTimeElapsed);
          const timerEl = document.getElementById('challenge-hud-timer');
          if (timerEl) {
            timerEl.classList.remove('hidden');
            const m = Math.floor(timeLeft / 60);
            const s = Math.floor(timeLeft % 60);
            timerEl.textContent = `⏱️ ${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
          }
          if (timeLeft <= 0) {
            this.failChallenge(`Time limit of ${this.activeChallenge.timeLimit}s exceeded!`);
            return;
          }
        }
      }

      // Smooth camera interpolation
      this.cameraY += (this.targetCameraY - this.cameraY) * 0.16;

      // Wave prep countdown
      if (!this.isWaveActive) {
        this.prepTimer -= dt;
        const pt = document.getElementById('prep-timer-val');
        if (pt) pt.textContent = `${Math.max(0, Math.ceil(this.prepTimer))}s`;
        if (this.prepTimer <= 0) {
          this.triggerWave();
        }
      } else {
        // Spawn queued enemies
        if (this.spawnQueue.length > 0) {
          this.spawnTimer -= dt;
          if (this.spawnTimer <= 0) {
            const enemyData = this.spawnQueue.shift();
            if (enemyData.isBoss) {
              this.sound.bossSpawn();
              const gfx = this.getGraphicsConfig();
              if (gfx.enhancedBossEffects) {
                this.addFloatingText(PATH_WAYPOINTS[0].x, PATH_WAYPOINTS[0].y + 25, '⚠️ BOSS DETECTED!', '#ef4444');
                this.spawnExplosionParticles(PATH_WAYPOINTS[0].x, PATH_WAYPOINTS[0].y + 20, '#a855f7', 16);
              }
            }
            this.enemies.push({
              ...enemyData,
              distance: 0,
              x: PATH_WAYPOINTS[0].x,
              y: PATH_WAYPOINTS[0].y,
              angle: 0,
              slowTimer: 0,
              slowFactor: 1,
              hitFlash: 0
            });
            this.spawnTimer = this.spawnInterval;
          }
        } else if (this.enemies.length === 0) {
          // All enemies slain or reached castle
          this.onWaveComplete();
        }
      }

      // Update Enemies
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        if (e.slowTimer > 0) {
          e.slowTimer -= dt;
          if (e.slowTimer <= 0) e.slowFactor = 1;
        } else {
          e.slowFactor = 1;
        }

        if (e.burnTimer > 0) {
          e.burnTimer -= dt;
          e.burnTickTimer = (e.burnTickTimer || 0) + dt;
          if (e.burnTickTimer >= 0.5) {
            e.burnTickTimer = 0;
            this.damageEnemy(e, e.burnDamage || 1, null);
          }
        }

        if (e.isHealer && e.hp > 0) {
          e.healTimer = (e.healTimer || 0) + dt;
          if (e.healTimer >= 2.0) {
            e.healTimer = 0;
            for (let other of this.enemies) {
              if (other !== e && other.hp < other.maxHp && Math.hypot(other.x - e.x, other.y - e.y) <= 70) {
                other.hp = Math.min(other.maxHp, other.hp + 1);
                this.addFloatingText(other.x, other.y - 10, '+1 HP', '#22c55e');
              }
            }
          }
        }

        if (e.hitFlash > 0) e.hitFlash -= dt * 6;

        e.distance += e.speed * e.slowFactor * 60 * dt;
        const pos = getPositionAlongPath(e.distance);
        e.x = pos.x;
        e.y = pos.y;
        e.angle = pos.angle;

        // Reached Castle Base: Castle loses exactly 1 health per enemy
        if (e.distance >= TOTAL_PATH_LENGTH) {
          this.enemies.splice(i, 1);
          const dmg = 1;
          this.castleHealth = Math.max(0, this.castleHealth - 1);
          this.castleHitTimer = 0.5;
          this.sound.castleDamage();

          if (this.isChallengeMode && this.activeChallenge) {
            this.challengeCastleDamaged = true;
            if (this.activeChallenge.type === 'perfect') {
              this.failChallenge('Castle took damage! (Requirement: No damage taken)');
              return;
            }
          }

          // Castle damage visual effects & floating text (-1)
          this.addFloatingText(pos.x, pos.y - 12, `-1 🏰`, '#ef4444');
          for (let k = 0; k < 12; k++) {
            const ang = Math.random() * Math.PI * 2;
            const spd = 30 + Math.random() * 70;
            this.particles.push({
              x: pos.x,
              y: pos.y,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd,
              color: Math.random() > 0.5 ? '#ef4444' : '#fbbf24',
              size: 3 + Math.random() * 3,
              maxLife: 0.5,
              life: 0.5,
              alpha: 1
            });
          }

          // Trigger screen shake & HUD highlight
          const wrapper = document.querySelector('.game-wrapper');
          if (wrapper) {
            wrapper.classList.remove('shake-effect');
            void wrapper.offsetWidth;
            wrapper.classList.add('shake-effect');
          }

          const statCastle = document.getElementById('stat-castle');
          if (statCastle) {
            statCastle.classList.remove('hud-castle-hit');
            void statCastle.offsetWidth;
            statCastle.classList.add('hud-castle-hit');
          }

          this.updateHud();
          if (this.castleHealth <= 0) {
            this.castleHealth = 0;
            this.updateHud();
            this.endMatchGameOver();
            return;
          }
        }
      }

      // Update Towers
      for (let t of this.towers) {
        t.cooldown -= dt;
        if (t.cooldown <= 0) {
          this.towerAttack(t);
        }
      }

      // --- CASTLE AUTO-FIRE SYSTEM ---
      // Automatically detects approaching enemies within castle range (145px)
      // Fires bullets immediately when enemy enters range, targets closest enemy to castle
      // Stays idle when no enemies in range, and continues throughout all waves
      const castleX = 180;
      const castleY = 445;
      const castleRange = 145;

      let closestEnemyToCastle = null;
      let minDistanceToCastle = Infinity;

      for (let e of this.enemies) {
        if (e.hp > 0) {
          const dist = Math.hypot(e.x - castleX, e.y - castleY);
          if (dist <= castleRange && dist < minDistanceToCastle) {
            minDistanceToCastle = dist;
            closestEnemyToCastle = e;
          }
        }
      }

      this.castleTarget = closestEnemyToCastle;

      if (closestEnemyToCastle) {
        // Enemy in range: start firing immediately if castle was idle
        if (this.castleShootTimer === null || this.castleShootTimer === undefined || this.castleShootTimer <= 0) {
          this.fireCastleBullet(closestEnemyToCastle, castleX, castleY);
          this.castleShootTimer = 0.55; // Fixed fire rate while enemies remain in range
        } else {
          this.castleShootTimer -= dt;
          if (this.castleShootTimer <= 0) {
            this.fireCastleBullet(closestEnemyToCastle, castleX, castleY);
            this.castleShootTimer = 0.55;
          }
        }
      } else {
        // No enemies in range: Castle remains idle!
        // Reset timer to 0 so when an enemy enters range, it fires immediately
        this.castleShootTimer = 0;
      }

      // Update Projectiles (Smooth homing at 100 FPS)
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const p = this.projectiles[i];
        p.life -= dt;
        if (p.life <= 0) {
          this.projectiles.splice(i, 1);
          continue;
        }

        // Homing projectile towards target enemy if alive
        let targetX = p.targetX;
        let targetY = p.targetY;
        if (p.targetEnemy && this.enemies.includes(p.targetEnemy) && p.targetEnemy.hp > 0) {
          targetX = p.targetEnemy.x;
          targetY = p.targetEnemy.y;
          p.targetX = targetX;
          p.targetY = targetY;
        }

        const dx = targetX - p.x;
        const dy = targetY - p.y;
        const dist = Math.hypot(dx, dy);
        const step = p.speed * dt;

        p.angle = Math.atan2(dy, dx);

        if (dist <= step || dist < 10) {
          // Impact!
          this.onProjectileHit(p, targetX, targetY);
          this.projectiles.splice(i, 1);
        } else {
          p.x += (dx / dist) * step;
          p.y += (dy / dist) * step;

          // Subtle flying bullet trail particles
          if (p.type === 'cannon' && Math.random() > 0.6) {
            this.particles.push({
              x: p.x, y: p.y,
              vx: (Math.random() - 0.5) * 6,
              vy: (Math.random() - 0.5) * 6,
              color: '#ef4444',
              size: 2,
              maxLife: 0.18,
              life: 0.18,
              alpha: 0.6
            });
          } else if (p.type === 'magic' && Math.random() > 0.6) {
            this.particles.push({
              x: p.x, y: p.y,
              vx: (Math.random() - 0.5) * 8,
              vy: (Math.random() - 0.5) * 8,
              color: '#38bdf8',
              size: 2,
              maxLife: 0.2,
              life: 0.2,
              alpha: 0.7
            });
          } else if (p.type === 'castle' && Math.random() > 0.5) {
            this.particles.push({
              x: p.x, y: p.y,
              vx: (Math.random() - 0.5) * 8,
              vy: (Math.random() - 0.5) * 8,
              color: '#fbbf24',
              size: 2,
              maxLife: 0.18,
              life: 0.18,
              alpha: 0.8
            });
          }
        }
      }

      // Update Lightning Arcs
      for (let i = this.lightningArcs.length - 1; i >= 0; i--) {
        const arc = this.lightningArcs[i];
        arc.life -= dt;
        if (arc.life <= 0) this.lightningArcs.splice(i, 1);
      }

      // Update Particles
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const pt = this.particles[i];
        pt.life -= dt;
        if (pt.gravity) pt.vy += pt.gravity * dt;
        if (pt.isRing && pt.maxRadius) {
          pt.radius = (1 - (pt.life / pt.maxLife)) * pt.maxRadius;
        }
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.alpha = Math.max(0, pt.life / pt.maxLife);
        if (pt.life <= 0) this.particles.splice(i, 1);
      }

      // Update Floating Texts
      for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
        const ft = this.floatingTexts[i];
        ft.life -= dt;
        ft.y += ft.vy * dt;
        ft.alpha = ft.life / ft.maxLife;
        if (ft.life <= 0) this.floatingTexts.splice(i, 1);
      }
    }

    fireCastleBullet(target, originX, originY) {
      this.sound.playTone(560, 'triangle', 0.1, 0.22, 280);
      const dx = target.x - originX;
      const dy = target.y - originY;
      const angle = Math.atan2(dy, dx);

      this.projectiles.push({
        x: originX,
        y: originY,
        targetEnemy: target,
        targetX: target.x,
        targetY: target.y,
        angle: angle,
        speed: 460,
        damage: 1, // Damage enemy and reduce health (respecting difficulty HP)
        type: 'castle',
        icon: '🏰', // Matches castle bullet icon
        glowColor: '#fbbf24',
        life: 1.6,
        color: '#f59e0b',
        isCastle: true
      });

      // Muzzle spark effect at castle ramparts
      this.particles.push({
        x: originX,
        y: originY - 4,
        vx: Math.cos(angle) * 32 + (Math.random() - 0.5) * 16,
        vy: Math.sin(angle) * 32 + (Math.random() - 0.5) * 16,
        color: '#fbbf24',
        size: 3.5,
        maxLife: 0.18,
        life: 0.18,
        alpha: 1
      });
    }

    towerAttack(tower) {
      // Find enemies in range
      const inRange = [];
      for (let e of this.enemies) {
        const d = Math.hypot(e.x - tower.x, e.y - tower.y);
        if (d <= tower.range) {
          inRange.push({ enemy: e, distAlongPath: e.distance });
        }
      }
      if (inRange.length === 0) return;

      // Target enemy furthest along path
      inRange.sort((a, b) => b.distAlongPath - a.distAlongPath);
      const target = inRange[0].enemy;

      tower.cooldown = tower.fireInterval;
      tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x);

      const diffCfg = this.getDifficultyConfig();
      const effectiveDmg = Math.max(1, Math.round(tower.damage * diffCfg.towerDamageMultiplier));

      if (tower.type === 'archer') {
        this.sound.arrowShoot();
        this.projectiles.push({
          x: tower.x, y: tower.y, targetEnemy: target, targetX: target.x, targetY: target.y,
          speed: 460, damage: effectiveDmg, type: 'archer', icon: '🏹', glowColor: '#22c55e', life: 1.5, color: '#fbbf24', tower
        });
      } else if (tower.type === 'cannon') {
        this.sound.cannonShoot();
        this.projectiles.push({
          x: tower.x, y: tower.y, targetEnemy: target, targetX: target.x, targetY: target.y,
          speed: 300, damage: effectiveDmg, splashRadius: tower.splashRadius || 42, type: 'cannon', icon: '💣', glowColor: '#ef4444', life: 1.8, color: '#ef4444', tower
        });
      } else if (tower.type === 'magic') {
        this.sound.magicShoot();
        this.projectiles.push({
          x: tower.x, y: tower.y, targetEnemy: target, targetX: target.x, targetY: target.y,
          speed: 350, damage: effectiveDmg, type: 'magic', icon: '🔮', glowColor: '#a855f7', life: 1.5, color: '#a855f7', tower
        });
      } else if (tower.type === 'ice') {
        this.sound.magicShoot();
        this.projectiles.push({
          x: tower.x, y: tower.y, targetEnemy: target, targetX: target.x, targetY: target.y,
          speed: 360, damage: effectiveDmg, slowFactor: tower.slowFactor || 0.5, slowDuration: tower.slowDuration || 2.5, type: 'ice', icon: '❄️', glowColor: '#38bdf8', life: 1.5, color: '#38bdf8', tower
        });
      } else if (tower.type === 'fire') {
        this.sound.cannonShoot();
        this.projectiles.push({
          x: tower.x, y: tower.y, targetEnemy: target, targetX: target.x, targetY: target.y,
          speed: 380, damage: effectiveDmg, burnDamage: tower.burnDamage || 1, burnDuration: tower.burnDuration || 3.0, type: 'fire', icon: '🔥', glowColor: '#f97316', life: 1.5, color: '#f97316', tower
        });
      } else if (tower.type === 'lightning') {
        this.sound.lightningShoot();
        const chained = [target];
        let curr = target;
        for (let step = 1; step < (tower.chainCount || 3); step++) {
          let nearest = null;
          let minD = 90;
          for (let e of this.enemies) {
            if (!chained.includes(e)) {
              const d = Math.hypot(e.x - curr.x, e.y - curr.y);
              if (d < minD) { minD = d; nearest = e; }
            }
          }
          if (nearest) { chained.push(nearest); curr = nearest; } else break;
        }
        this.projectiles.push({
          x: tower.x, y: tower.y, targetEnemy: target, targetX: target.x, targetY: target.y,
          speed: 520, damage: effectiveDmg, chained: chained, type: 'lightning', icon: '⚡', glowColor: '#fef08a', life: 1.4, color: '#f59e0b', tower
        });
      } else if (tower.type === 'sniper') {
        this.sound.arrowShoot();
        let finalDmg = effectiveDmg;
        const isCrit = Math.random() < (tower.critChance || 0.35);
        if (isCrit) finalDmg = Math.round(finalDmg * (tower.critMultiplier || 2.5));
        this.projectiles.push({
          x: tower.x, y: tower.y, targetEnemy: target, targetX: target.x, targetY: target.y,
          speed: 600, damage: finalDmg, isCrit: isCrit, type: 'sniper', icon: '🎯', glowColor: '#e11d48', life: 1.2, color: '#e11d48', tower
        });
      } else if (tower.type === 'missile') {
        this.sound.cannonShoot();
        this.projectiles.push({
          x: tower.x, y: tower.y, targetEnemy: target, targetX: target.x, targetY: target.y,
          speed: 320, damage: effectiveDmg, splashRadius: tower.splashRadius || 55, type: 'missile', icon: '🚀', glowColor: '#f43f5e', life: 1.8, color: '#f43f5e', tower
        });
      } else if (tower.type === 'laser') {
        this.sound.magicShoot();
        this.projectiles.push({
          x: tower.x, y: tower.y, targetEnemy: target, targetX: target.x, targetY: target.y,
          speed: 700, damage: effectiveDmg, type: 'laser', icon: '⚡', glowColor: '#06b6d4', life: 1.0, color: '#06b6d4', tower
        });
      } else if (tower.type === 'ultimate') {
        this.sound.lightningShoot();
        this.projectiles.push({
          x: tower.x, y: tower.y, targetEnemy: target, targetX: target.x, targetY: target.y,
          speed: 450, damage: effectiveDmg * 2, splashRadius: tower.splashRadius || 60, type: 'ultimate', icon: '👑', glowColor: '#fbbf24', life: 1.5, color: '#fbbf24', tower
        });
      }
    }

    onProjectileHit(proj, hitX, hitY) {
      if (proj.type === 'cannon') {
        // Splash explosion
        this.spawnExplosionParticles(hitX, hitY, '#ef4444', 16);
        for (let e of this.enemies) {
          if (!e.flying) {
            const d = Math.hypot(e.x - hitX, e.y - hitY);
            if (d <= proj.splashRadius) {
              const falloff = 1 - (d / proj.splashRadius) * 0.45;
              this.damageEnemy(e, Math.max(1, Math.round(proj.damage * falloff)), proj.tower);
            }
          }
        }
      } else if (proj.type === 'lightning') {
        // Impact on primary target + trigger chain arcs
        if (proj.targetEnemy && this.enemies.includes(proj.targetEnemy)) {
          this.damageEnemy(proj.targetEnemy, proj.damage, proj.tower);
          this.sound.lightningShoot();
          this.spawnExplosionParticles(hitX, hitY, '#fef08a', 10);

          // Secondary chain targets
          if (proj.chained && proj.chained.length > 1) {
            let prev = { x: hitX, y: hitY };
            for (let idx = 1; idx < proj.chained.length; idx++) {
              const e = proj.chained[idx];
              if (this.enemies.includes(e) && e.hp > 0) {
                this.lightningArcs.push({
                  x1: prev.x, y1: prev.y,
                  x2: e.x, y2: e.y,
                  life: 0.15
                });
                prev = { x: e.x, y: e.y };
                const chainDmg = Math.round(proj.damage * (1 - idx * 0.2));
                this.damageEnemy(e, chainDmg, proj.tower);
              }
            }
          }
        }
      } else {
        // Single target hit (archer, magic, castle)
        if (proj.targetEnemy && this.enemies.includes(proj.targetEnemy)) {
          if (proj.type === 'magic') {
            proj.targetEnemy.slowTimer = proj.slowDuration;
            proj.targetEnemy.slowFactor = proj.slowFactor;
            this.spawnExplosionParticles(hitX, hitY, '#38bdf8', 8);
          } else if (proj.type === 'archer') {
            this.spawnExplosionParticles(hitX, hitY, '#fbbf24', 6);
          } else if (proj.type === 'castle') {
            this.spawnExplosionParticles(hitX, hitY, '#f59e0b', 8);
          }
          this.damageEnemy(proj.targetEnemy, proj.damage, proj.tower || null);
        }
      }
    }

    damageEnemy(enemy, damage, tower) {
      enemy.hp -= damage;
      enemy.hitFlash = 1;
      this.sound.enemyHit();
      this.addFloatingText(enemy.x, enemy.y - 12, `-${damage}`, '#f8fafc');

      if (enemy.hp <= 0) {
        this.killEnemy(enemy, tower);
      }
    }

    killEnemy(enemy, tower) {
      const idx = this.enemies.indexOf(enemy);
      if (idx !== -1) this.enemies.splice(idx, 1);

      if (tower) tower.kills++;

      if (enemy.isBoss) {
        this.sound.bossRoar();
      } else {
        this.sound.enemyDeath();
      }
      this.sound.coinCollect();
      this.spawnExplosionParticles(enemy.x, enemy.y, enemy.color, enemy.isBoss ? 30 : 14);

      // Reward
      this.addMoney(enemy.reward);
      this.addFloatingText(enemy.x, enemy.y - 16, `+Rs ${enemy.reward}`, '#fbbf24');

      this.matchKills++;
      this.totalKills++;
      if (enemy.isBoss) {
        this.bossesDefeated++;
      }

      if (this.isChallengeMode && this.activeChallenge) {
        this.challengeKills++;
        if (enemy.isBoss) {
          this.challengeBossKills++;
        }
        if (tower && tower.type) {
          this.challengeTowerKills[tower.type] = (this.challengeTowerKills[tower.type] || 0) + 1;
        }
        this.checkChallengeConditions();
      }

      this.syncStats();
      this.saveAll();

      if (this.selectedTower === tower) {
        this.updateInspectorUI();
      }
    }

    spawnExplosionParticles(x, y, color, baseCount) {
      const gfx = this.getGraphicsConfig();
      const count = Math.max(1, Math.round(baseCount * gfx.particleMultiplier));
      const lifeMult = gfx.particleLifeMultiplier;
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = (18 + Math.random() * 82) * (gfx.detailedAnimations ? 1.0 : 0.8);
        const maxLife = (0.3 + Math.random() * 0.25) * lifeMult;
        this.particles.push({
          x, y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          color,
          size: 2 + Math.random() * (gfx.detailedAnimations ? 3.5 : 2),
          maxLife,
          life: maxLife,
          alpha: 1,
          sparkle: gfx.detailedAnimations && Math.random() > 0.4
        });
      }
    }

    addFloatingText(x, y, text, color) {
      this.floatingTexts.push({
        x, y,
        text, color,
        vy: -35,
        maxLife: 0.7,
        life: 0.7,
        alpha: 1
      });
    }

    // --- FREE TOWER PLACEMENT & GRID INTERACTION ---
    isTileValidForPlacement(col, row) {
      if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return false;
      if (row >= 11) return false; // Castle ramparts & fortress
      const spawnCol = Math.floor(PATH_WAYPOINTS[0].x / TILE_SIZE);
      if (row === 0 && col === spawnCol) return false; // Enemy spawn portal
      if (isTileOnPath(col, row)) return false; // Enemy path
      if (this.towers.some(t => t.col === col && t.row === row)) return false; // Already occupied
      return true;
    }

    clearTileSelection() {
      this.selectedTile = null;
      document.getElementById('tile-selection-hint')?.classList.add('hidden');
      document.getElementById('tile-tower-modal')?.classList.add('hidden');
    }

    openTowerSelectModal(col, row) {
      this.selectedTile = { col, row };
      const modal = document.getElementById('tile-tower-modal');
      const coord = document.getElementById('tile-select-coord');
      if (coord) coord.textContent = `Selected Block (Row ${row + 1}, Col ${col + 1})`;

      // Update affordability on the tower options
      document.querySelectorAll('.tower-select-option').forEach(btn => {
        const type = btn.getAttribute('data-build');
        const cfg = TOWER_CONFIGS[type];
        if (cfg) {
          if (this.money < cfg.cost) {
            btn.classList.add('cant-afford');
          } else {
            btn.classList.remove('cant-afford');
          }
        }
      });

      if (modal) modal.classList.remove('hidden');

      const hint = document.getElementById('tile-selection-hint');
      const text = document.getElementById('tile-selection-text');
      if (hint && text) {
        text.textContent = `Block [R${row + 1}, C${col + 1}] selected`;
        hint.classList.remove('hidden');
      }
    }

    closeTowerSelectModal() {
      document.getElementById('tile-tower-modal')?.classList.add('hidden');
      this.clearTileSelection();
    }

    handleTileClick(col, row) {
      if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) {
        this.closeInspector();
        this.clearTileSelection();
        return;
      }

      // 1. Check if clicked an existing tower on this tile
      const existing = this.towers.find(t => t.col === col && t.row === row);
      if (existing) {
        this.clearTileSelection();
        this.sound.buttonClick();
        this.openInspector(existing);
        return;
      }

      // 2. Castle and Spawn are physical map objects (not buttons)
      const spawnCol = Math.floor(PATH_WAYPOINTS[0].x / TILE_SIZE);
      if (row >= 11 || (row === 0 && col === spawnCol)) {
        this.closeInspector();
        this.clearTileSelection();
        return;
      }

      // 3. Check if clicked enemy path
      if (isTileOnPath(col, row)) {
        this.closeInspector();
        this.clearTileSelection();
        this.sound.buttonClick();
        this.addFloatingText(col * TILE_SIZE + 20, row * TILE_SIZE + 20, 'CANNOT BUILD ON PATH!', '#ef4444');
        return;
      }

      // 4. Clicked an available green grass tile!
      this.closeInspector();
      this.sound.buttonClick();

      // If a tower card was already selected in the bottom bar, build it immediately!
      if (this.selectedBuildType) {
        this.buildTowerOnTile(col, row, this.selectedBuildType);
        return;
      }

      // Otherwise highlight selected tile and open the tower selection UI!
      this.openTowerSelectModal(col, row);
    }

    buildTowerOnTile(col, row, typeKey) {
      if (!this.isTileValidForPlacement(col, row)) {
        this.addFloatingText(col * TILE_SIZE + 20, row * TILE_SIZE + 20, 'INVALID LOCATION!', '#ef4444');
        return;
      }

      if (this.isChallengeMode && this.activeChallenge && this.activeChallenge.allowedTowers) {
        if (!this.activeChallenge.allowedTowers.includes(typeKey)) {
          this.sound.buttonClick();
          this.addFloatingText(col * TILE_SIZE + 20, row * TILE_SIZE + 20, 'RESTRICTED TOWER!', '#ef4444');
          return;
        }
      }

      const cfg = TOWER_CONFIGS[typeKey];
      if (!cfg) return;

      if (!this.spendMoney(cfg.cost)) {
        this.sound.buttonClick();
        this.addFloatingText(col * TILE_SIZE + 20, row * TILE_SIZE + 20, `NEED Rs ${cfg.cost}!`, '#ef4444');
        return;
      }

      this.sound.upgradeSound();
      const x = col * TILE_SIZE + TILE_SIZE / 2;
      const y = row * TILE_SIZE + TILE_SIZE / 2;

      const tower = {
        id: Date.now() + Math.random(),
        col,
        row,
        x,
        y,
        type: typeKey,
        name: cfg.name,
        icon: cfg.icon,
        level: 1,
        damage: cfg.baseDamage,
        range: cfg.baseRange,
        fireInterval: cfg.fireInterval,
        splashRadius: cfg.splashRadius || 0,
        slowFactor: cfg.slowFactor || 1,
        slowDuration: cfg.slowDuration || 0,
        chainCount: cfg.chainCount || 1,
        color: cfg.color,
        cooldown: 0,
        angle: 0,
        kills: 0,
        investedMoney: cfg.cost
      };

      this.towers.push(tower);
      this.towersBuiltCount++;
      this.towersBuilt++;
      this.syncStats();
      this.saveAll();

      // Build particles & dust
      for (let i = 0; i < 14; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 15 + Math.random() * 45;
        this.particles.push({
          x, y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          color: cfg.color,
          size: 2.5 + Math.random() * 2.5,
          maxLife: 0.45,
          life: 0.45,
          alpha: 1
        });
      }
      this.addFloatingText(x, y - 20, `BUILT! -Rs ${cfg.cost}`, '#fbbf24');

      this.clearTileSelection();
      this.openInspector(tower);
    }

    upgradeTower(tower) {
      if (tower.level >= 5) {
        this.addFloatingText(tower.x, tower.y - 15, 'MAX LEVEL REACHED!', '#fbbf24');
        return;
      }

      const cfg = TOWER_CONFIGS[tower.type];
      if (!cfg || !cfg.upgradeCosts) return;

      const upgradeCost = cfg.upgradeCosts[tower.level - 1] || 100;
      if (!this.spendMoney(upgradeCost)) {
        this.addFloatingText(tower.x, tower.y - 15, `NEED Rs ${upgradeCost}!`, '#ef4444');
        return;
      }

      this.sound.upgradeSound(tower.level + 1);
      tower.level++;
      tower.investedMoney += upgradeCost;

      const lvlCfg = cfg.levels[tower.level - 1];
      if (lvlCfg) {
        tower.damage = lvlCfg.dmg;
        tower.range = lvlCfg.rng;
        tower.fireInterval = lvlCfg.spd;
        if (lvlCfg.chain !== undefined) tower.chainCount = lvlCfg.chain;
        if (lvlCfg.splash !== undefined) tower.splashRadius = lvlCfg.splash;
        if (lvlCfg.slow !== undefined) tower.slowFactor = lvlCfg.slow;
        if (lvlCfg.dur !== undefined) tower.slowDuration = lvlCfg.dur;
        if (lvlCfg.burnDmg !== undefined) tower.burnDamage = lvlCfg.burnDmg;
        if (lvlCfg.burnDur !== undefined) tower.burnDuration = lvlCfg.burnDur;
        if (lvlCfg.freezeStun) tower.freezeStun = true;
      }

      this.upgradesCount++;
      this.towersUpgraded++;

      if (tower.level === 5) {
        if (tower.type === 'lightning') this.hasLightningLv5 = true;
        if (tower.type === 'cannon') this.hasCannonLv5 = true;
        if (tower.type === 'ice') this.hasIceLv5 = true;
        if (tower.type === 'fire') this.hasFireLv5 = true;
        this.evaluateAchievements();
      }

      this.syncStats();
      this.saveAll();

      const floatMsg = tower.level === 5 ? 'MAX LEVEL! 👑' : `LEVEL ${tower.level}!`;
      this.addFloatingText(tower.x, tower.y - 20, floatMsg, '#10b981');
      this.updateInspectorUI();
    }

    sellTower(tower) {
      const refund = Math.floor(tower.investedMoney * 0.5);
      this.addMoney(refund);
      this.sound.coinCollect();
      this.addFloatingText(tower.x, tower.y - 20, `+Rs ${refund} SOLD! 💰`, '#fbbf24');

      // 1. Coin particle burst (22 golden coin sparkles with upward lift & gravity)
      for (let i = 0; i < 22; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 30 + Math.random() * 70;
        this.particles.push({
          x: tower.x,
          y: tower.y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 35, // initial burst upward
          gravity: 120, // realistic falling coins
          color: i % 2 === 0 ? '#fbbf24' : '#f59e0b',
          size: 3 + Math.random() * 3,
          isCoin: true,
          maxLife: 0.65,
          life: 0.65,
          alpha: 1
        });
      }

      // 2. Expanding golden shockwave ring
      this.particles.push({
        x: tower.x,
        y: tower.y,
        vx: 0,
        vy: 0,
        radius: 4,
        maxRadius: 38,
        color: '#facc15',
        isRing: true,
        maxLife: 0.45,
        life: 0.45,
        alpha: 1
      });

      const idx = this.towers.indexOf(tower);
      if (idx !== -1) this.towers.splice(idx, 1);
      this.closeInspector();
    }

    openInspector(tower) {
      this.selectedTower = tower;
      this.updateInspectorUI();
      const panel = document.getElementById('tower-inspector');
      if (panel) panel.classList.remove('hidden');
    }

    closeInspector() {
      this.selectedTower = null;
      const panel = document.getElementById('tower-inspector');
      if (panel) panel.classList.add('hidden');
    }

    updateInspectorUI() {
      const t = this.selectedTower;
      if (!t) return;

      const cfg = TOWER_CONFIGS[t.type];
      const icon = document.getElementById('insp-icon');
      const name = document.getElementById('insp-name');
      const lvl = document.getElementById('insp-level');
      const dmg = document.getElementById('insp-dmg');
      const rng = document.getElementById('insp-rng');
      const spd = document.getElementById('insp-spd');
      const kills = document.getElementById('insp-kills');
      const upgBtn = document.getElementById('btn-upgrade-tower');
      const upgCost = document.getElementById('insp-upgrade-cost');
      const sellRef = document.getElementById('insp-sell-refund');

      if (icon) icon.textContent = t.icon;
      if (name) name.textContent = t.name;

      const lvlCfg = cfg && cfg.levels ? cfg.levels[t.level - 1] : null;
      if (lvl) lvl.textContent = lvlCfg ? lvlCfg.title : `Level ${t.level}`;
      if (dmg) dmg.textContent = t.damage.toString();
      if (rng) rng.textContent = t.range.toString();
      if (spd) spd.textContent = `${t.fireInterval.toFixed(2)}s`;
      if (kills) kills.textContent = t.kills.toString();

      const refund = Math.floor(t.investedMoney * 0.5);
      if (sellRef) sellRef.textContent = `+Rs ${refund}`;

      if (t.level >= 5) {
        if (upgCost) upgCost.textContent = 'MAX';
        if (upgBtn) {
          upgBtn.disabled = true;
          upgBtn.classList.add('disabled');
        }
      } else {
        const nextCost = cfg.upgradeCosts[t.level - 1];
        if (upgCost) upgCost.textContent = `Rs ${nextCost}`;
        if (upgBtn) {
          const hasMoney = this.money >= nextCost;
          upgBtn.disabled = !hasMoney;
          if (hasMoney) {
            upgBtn.classList.remove('disabled');
          } else {
            upgBtn.classList.add('disabled');
          }
        }
      }
    }

    // --- RENDER BATTLEFIELD ---
    render() {
      if (!this.ctx) return;
      const ctx = this.ctx;
      const dpr = window.devicePixelRatio || 1;

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // Center & scale responsive logical viewport (360x640)
      ctx.scale(dpr, dpr);
      ctx.translate(this.offsetX, this.offsetY);
      ctx.scale(this.scale, this.scale);

      const gfx = this.getGraphicsConfig();
      const now = performance.now();

      // Viewport clip so battle content stays within logical canvas bounds
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
      ctx.clip();

      // Camera Scrolling Translation
      ctx.save();
      ctx.translate(0, -Math.round(this.cameraY));

      const mapDef = this.getCurrentMapDef();
      const th = mapDef.theme;

      // 1. Tiled Grid-Based Terrain & Path Battlefield
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          const tileX = c * TILE_SIZE;
          const tileY = r * TILE_SIZE;

          if (r >= 11) {
            // Castle Stone Courtyard
            ctx.fillStyle = (c + r) % 2 === 0 ? th.courtyard1 : th.courtyard2;
            ctx.fillRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.strokeRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
          } else if (isTileOnPath(c, r)) {
            // Path Tile
            ctx.fillStyle = th.pathColor;
            ctx.fillRect(tileX, tileY, TILE_SIZE, TILE_SIZE);

            // Path cobblestones / pebbles
            if (gfx.detailedAnimations) {
              ctx.fillStyle = th.pathPebble;
              const pSeed = (c * 17 + r * 31) % 10;
              ctx.beginPath();
              ctx.arc(tileX + 12 + (pSeed % 16), tileY + 14 + (pSeed * 2 % 14), 2.5, 0, Math.PI * 2);
              ctx.arc(tileX + 26 - (pSeed % 10), tileY + 28 - (pSeed * 3 % 12), 2, 0, Math.PI * 2);
              ctx.fill();
            }

            // Path borders
            ctx.strokeStyle = th.pathBorder;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
          } else {
            // Thematic Environment Ground Tile
            ctx.fillStyle = (c + r) % 2 === 0 ? th.ground1 : th.ground2;
            ctx.fillRect(tileX, tileY, TILE_SIZE, TILE_SIZE);

            // Ground tile border
            ctx.strokeStyle = th.groundBorder;
            ctx.lineWidth = 1;
            ctx.strokeRect(tileX, tileY, TILE_SIZE, TILE_SIZE);

            // Top-left light edge for crisp tile depth
            if (gfx.detailedAnimations) {
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
              ctx.beginPath();
              ctx.moveTo(tileX, tileY + TILE_SIZE);
              ctx.lineTo(tileX, tileY);
              ctx.lineTo(tileX + TILE_SIZE, tileY);
              ctx.stroke();
            }
          }
        }
      }

      // 2. Thematic Environment Nature & Terrain Elements
      for (let dec of NATURE_DECORATIONS) {
        // Skip drawing nature if a tower is built on this tile
        if (this.towers.some(t => t.col === dec.col && t.row === dec.row)) continue;
        const dx = dec.col * TILE_SIZE + 20;
        const dy = dec.row * TILE_SIZE + 20;
        drawMapDecoration(ctx, dec, dx, dy, now, gfx);
      }

      // Thematic Atmospheric Environmental Particles
      drawMapAtmosphere(ctx, mapDef, now, gfx);

      // 3. Enemy Spawn Portal at Top (natural map entrance aligned to active path)
      const spawnX = PATH_WAYPOINTS[0].x;
      const spawnY = PATH_WAYPOINTS[0].y + 20;
      ctx.save();
      ctx.translate(spawnX, spawnY);
      ctx.fillStyle = th.portalOuter;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = th.portalAura;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      const portalAura = (now * 0.005) % (Math.PI * 2);
      ctx.strokeStyle = th.portalAura;
      ctx.beginPath();
      ctx.arc(0, 0, 12, portalAura, portalAura + Math.PI);
      ctx.stroke();

      ctx.fillStyle = th.portalInner;
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 4. Fantasy Castle at Bottom (rows 11 to 12) - Thematic base
      const castleGateX = PATH_WAYPOINTS[PATH_WAYPOINTS.length - 1].x;
      const castleGateY = 11 * TILE_SIZE + 20; // 460px
      ctx.save();
      ctx.translate(castleGateX, castleGateY);

      // Castle Hit pulse shockwave
      if (this.castleHitTimer > 0) {
        const pulseR = 30 + (1 - this.castleHitTimer / 0.5) * 35;
        ctx.strokeStyle = `rgba(239, 68, 68, ${this.castleHitTimer / 0.5})`;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(0, 0, pulseR, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Stone Wall with Crenellations across row 11
      ctx.fillStyle = this.castleHitTimer > 0 ? '#450a0a' : th.castleWall;
      ctx.fillRect(-180, 20, 360, 50);
      ctx.strokeStyle = this.castleHitTimer > 0 ? '#ef4444' : th.castleAccent;
      ctx.lineWidth = 2;
      ctx.strokeRect(-180, 20, 360, 50);

      // Battlements / Crenellations
      ctx.fillStyle = th.castleCrenel;
      for (let bx = -180; bx < 180; bx += 20) {
        ctx.fillRect(bx, 10, 12, 10);
      }

      // Central Arched Fortress Gateway
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.arc(0, 30, 20, Math.PI, 0);
      ctx.rect(-20, 30, 40, 25);
      ctx.fill();

      // Portcullis iron bars
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      for (let ix = -14; ix <= 14; ix += 7) {
        ctx.beginPath(); ctx.moveTo(ix, 15); ctx.lineTo(ix, 55); ctx.stroke();
      }

      // Torches on Left & Right
      const flameP = Math.sin(now * 0.015) * 2;
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(-35, 18, 4 + flameP * 0.5, 0, Math.PI * 2);
      ctx.arc(35, 18, 4 - flameP * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(-35, 18, 2, 0, Math.PI * 2);
      ctx.arc(35, 18, 2, 0, Math.PI * 2);
      ctx.fill();

      // Animated Flags on Towers
      const fWave = Math.sin(now * 0.006) * 4;
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-140, 10); ctx.lineTo(-140, -10); ctx.stroke();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(-140, -10);
      ctx.quadraticCurveTo(-128 + fWave, -6, -120, -5 + fWave);
      ctx.lineTo(-140, 0);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath(); ctx.moveTo(140, 10); ctx.lineTo(140, -10); ctx.stroke();
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.moveTo(140, -10);
      ctx.quadraticCurveTo(152 + fWave, -6, 160, -5 + fWave);
      ctx.lineTo(140, 0);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      // 5. Grid Hover & Selection Highlights
      // A) Hover preview
      if (this.hoverTile) {
        const hc = this.hoverTile.col;
        const hr = this.hoverTile.row;
        const hx = hc * TILE_SIZE;
        const hy = hr * TILE_SIZE;
        const occupied = this.towers.find(t => t.col === hc && t.row === hr);

        if (occupied) {
          // Occupied tile: subtle blue/gold inspect highlight
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.strokeRect(hx + 1, hy + 1, TILE_SIZE - 2, TILE_SIZE - 2);
          ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
          ctx.fillRect(hx, hy, TILE_SIZE, TILE_SIZE);
        } else if (this.isTileValidForPlacement(hc, hr)) {
          // Available placement tile: green highlight + placement preview
          ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
          ctx.fillRect(hx, hy, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 2;
          ctx.strokeRect(hx + 1, hy + 1, TILE_SIZE - 2, TILE_SIZE - 2);

          // Tower placement preview & range
          const previewType = this.selectedBuildType || 'archer';
          const cfg = TOWER_CONFIGS[previewType];
          if (cfg) {
            ctx.save();
            ctx.strokeStyle = this.selectedBuildType ? 'rgba(34, 197, 94, 0.65)' : 'rgba(255, 255, 255, 0.35)';
            ctx.fillStyle = this.selectedBuildType ? 'rgba(34, 197, 94, 0.08)' : 'rgba(255, 255, 255, 0.04)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(hx + 20, hy + 20, cfg.baseRange, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.font = '18px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.globalAlpha = this.selectedBuildType ? 0.9 : 0.55;
            ctx.fillText(this.selectedBuildType ? cfg.icon : '➕', hx + 20, hy + 20);
            ctx.restore();
          }
        } else if (isTileOnPath(hc, hr) || hr >= 11 || (hr === 0 && hc === Math.floor(PATH_WAYPOINTS[0].x / TILE_SIZE))) {
          // Path or Castle tile: red preview indicating no placement allowed
          ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
          ctx.fillRect(hx, hy, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.strokeRect(hx + 1, hy + 1, TILE_SIZE - 2, TILE_SIZE - 2);
          ctx.font = '14px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🚫', hx + 20, hy + 20);
        }
      }

      // B) Currently selected tile (awaiting tower build)
      if (this.selectedTile) {
        const sc = this.selectedTile.col;
        const sr = this.selectedTile.row;
        const sx = sc * TILE_SIZE;
        const sy = sr * TILE_SIZE;
        const cx = sx + 20;
        const cy = sy + 20;

        const pulse = Math.sin(now * 0.008) * 3;
        ctx.fillStyle = 'rgba(251, 191, 36, 0.3)';
        ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(sx + 1, sy + 1, TILE_SIZE - 2, TILE_SIZE - 2);

        // Glowing corners
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 3;
        ctx.strokeRect(sx - pulse * 0.3, sy - pulse * 0.3, TILE_SIZE + pulse * 0.6, TILE_SIZE + pulse * 0.6);

        // Preview Range Circle for selected tile
        const previewType = this.selectedBuildType || 'lightning';
        const cfg = TOWER_CONFIGS[previewType];
        if (cfg) {
          ctx.save();
          ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
          ctx.beginPath();
          ctx.arc(cx, cy, cfg.baseRange, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.8;
          ctx.setLineDash([5, 4]);
          ctx.lineDashOffset = -now * 0.015;
          ctx.beginPath();
          ctx.arc(cx, cy, cfg.baseRange, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.font = 'bold 9px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillStyle = '#38bdf8';
          ctx.strokeStyle = '#020617';
          ctx.lineWidth = 2;
          ctx.strokeText(`BUILD RANGE: ${cfg.baseRange}`, cx, cy - cfg.baseRange - 3);
          ctx.fillText(`BUILD RANGE: ${cfg.baseRange}`, cx, cy - cfg.baseRange - 3);
          ctx.restore();
        }
      }

      // 6. Placed Towers
      for (let t of this.towers) {
        ctx.save();
        ctx.translate(t.x, t.y);

        // Visual Range Indicator (faint circle with glowing dashed border & range badge)
        if (this.selectedTower === t) {
          ctx.save();
          // Faint translucent radial fill
          const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, t.range);
          grad.addColorStop(0, 'rgba(245, 158, 11, 0.18)');
          grad.addColorStop(0.8, 'rgba(245, 158, 11, 0.08)');
          grad.addColorStop(1, 'rgba(245, 158, 11, 0.22)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(0, 0, t.range, 0, Math.PI * 2);
          ctx.fill();

          // Animated dashed glowing outer boundary
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.lineDashOffset = -now * 0.015;
          ctx.beginPath();
          ctx.arc(0, 0, t.range, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);

          // Tactical Range Badge above top edge of range circle
          ctx.font = 'bold 9px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillStyle = '#fef08a';
          ctx.strokeStyle = '#020617';
          ctx.lineWidth = 2;
          ctx.strokeText(`🎯 RANGE: ${Math.round(t.range)}`, 0, -t.range - 3);
          ctx.fillText(`🎯 RANGE: ${Math.round(t.range)}`, 0, -t.range - 3);

          // Selection bracket around tower base
          const pulse = Math.sin(now * 0.008) * 2;
          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(-19 - pulse * 0.5, -19 - pulse * 0.5, 38 + pulse, 38 + pulse);
          ctx.restore();
        }

        // Stone Base Pedestal
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = t.color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Tower Body
        ctx.fillStyle = t.color;
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();

        // Rotating Weaponry / Turret
        ctx.save();
        ctx.rotate(t.angle);
        if (t.type === 'archer') {
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, 9, -Math.PI / 3, Math.PI / 3);
          ctx.stroke();
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(-4, 0); ctx.lineTo(10, 0); ctx.stroke();
        } else if (t.type === 'cannon') {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, -3.5, 14, 7);
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(10, -4, 3, 8);
        } else if (t.type === 'magic') {
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.moveTo(12, 0); ctx.lineTo(0, -5); ctx.lineTo(-4, 0); ctx.lineTo(0, 5); ctx.closePath();
          ctx.fill();
        } else if (t.type === 'lightning') {
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(0, -2, 12, 4);
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(12, 0, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        // Tower Icon
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(t.icon, 0, -1);

        // Level Stars Badge
        if (t.level > 1) {
          ctx.font = 'bold 9px sans-serif';
          ctx.fillStyle = '#fef08a';
          ctx.fillText('★'.repeat(t.level), 0, 15);
        }

        ctx.restore();
      }

      // 7. Lightning Arcs
      for (let arc of this.lightningArcs) {
        ctx.save();
        ctx.strokeStyle = 'rgba(254, 240, 138, 0.4)';
        ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(arc.x1, arc.y1); ctx.lineTo(arc.x2, arc.y2); ctx.stroke();
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(arc.x1, arc.y1);
        const midX = (arc.x1 + arc.x2) / 2 + (Math.random() - 0.5) * 16;
        const midY = (arc.y1 + arc.y2) / 2 + (Math.random() - 0.5) * 16;
        ctx.lineTo(midX, midY); ctx.lineTo(arc.x2, arc.y2);
        ctx.stroke();
        ctx.restore();
      }

      // 8. Enemies
      for (let e of this.enemies) {
        ctx.save();
        ctx.translate(e.x, e.y);

        // Flying shadow
        if (e.flying) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
          ctx.beginPath();
          ctx.ellipse(0, 12, e.radius, e.radius * 0.5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.translate(0, -8);
        }

        // Enemy Body
        ctx.fillStyle = e.hitFlashTimer > 0 ? '#ffffff' : e.color;
        ctx.beginPath();
        ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = e.isBoss ? '#f59e0b' : '#020617';
        ctx.lineWidth = e.isBoss ? 2.5 : 1.5;
        ctx.stroke();

        // Monster Icon
        ctx.font = `${Math.round(e.radius * 1.2)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(e.icon, 0, 0);

        // Frost Slow Aura
        if (e.slowTimer > 0) {
          ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
          ctx.beginPath();
          ctx.arc(0, 0, e.radius + 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#bae6fd';
          for (let s = 0; s < 4; s++) {
            const sAng = (now * 0.005) + s * (Math.PI / 2);
            ctx.fillRect(Math.cos(sAng) * (e.radius + 4) - 1, Math.sin(sAng) * (e.radius + 4) - 1, 2, 2);
          }
        }

        // Floating Health Bar & HP Text Display
        const barW = Math.max(22, e.radius * 2.2 + (e.isBoss ? 18 : 6));
        const barH = e.isBoss ? 6 : 4;
        const barY = -e.radius - (e.isBoss ? 16 : 9);
        const hpPct = Math.max(0, Math.min(1, e.hp / e.maxHp));

        // Background Track
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(-barW / 2, barY, barW, barH);

        // Fill Color Gradient based on remaining HP %
        let hpColor = '#10b981'; // Green
        if (hpPct <= 0.3) hpColor = '#ef4444'; // Critical Red
        else if (hpPct <= 0.6) hpColor = '#fbbf24'; // Warning Yellow

        ctx.fillStyle = e.hitFlashTimer > 0 ? '#ffffff' : hpColor;
        ctx.fillRect(-barW / 2, barY, barW * hpPct, barH);

        // Border
        ctx.strokeStyle = e.isBoss ? '#f59e0b' : 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-barW / 2, barY, barW, barH);

        // Floating Numerical HP Text Display
        ctx.font = e.isBoss ? 'bold 9.5px sans-serif' : 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = e.isBoss ? '#fbbf24' : '#f8fafc';
        
        // Dark outline for maximum contrast against battlefield terrain
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 2;
        const hpLabel = e.isBoss 
          ? `👑 BOSS HP: ${Math.max(0, Math.ceil(e.hp))} / ${e.maxHp}` 
          : `${Math.max(0, Math.ceil(e.hp))} / ${e.maxHp} HP`;
          
        ctx.strokeText(hpLabel, 0, barY - 2);
        ctx.fillText(hpLabel, 0, barY - 2);
        ctx.restore();
      }

      // 9. Projectiles (Visual smaller flying version matching each tower/castle bullet icon)
      for (let p of this.projectiles) {
        drawBulletProjectile(ctx, p);
      }

      // 10. Particles
      for (let pt of this.particles) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, pt.alpha));
        if (pt.isRing) {
          ctx.strokeStyle = pt.color;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, Math.max(1, pt.radius || 10), 0, Math.PI * 2);
          ctx.stroke();
        } else if (pt.isCoin) {
          ctx.fillStyle = pt.color;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          ctx.fillStyle = pt.color;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // 11. Floating Texts
      for (let ft of this.floatingTexts) {
        ctx.save();
        ctx.globalAlpha = ft.alpha;
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      }

      ctx.restore(); // Restore Camera Translation

      // 12. Minimap / Scroll Bar Indicator on Right Screen Edge
      const trackH = 140;
      const trackW = 4;
      const trackX = LOGICAL_WIDTH - 8;
      const trackY = (LOGICAL_HEIGHT - trackH) / 2;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(trackX, trackY, trackW, trackH);

      const thumbH = Math.max(16, trackH * (LOGICAL_HEIGHT / MAP_HEIGHT));
      const scrollPct = this.maxCameraY > 0 ? (this.cameraY / this.maxCameraY) : 0;
      const thumbY = trackY + scrollPct * (trackH - thumbH);

      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(trackX - 1, thumbY, trackW + 2, thumbH);

      ctx.restore(); // Restore Viewport Clip
      ctx.restore(); // Restore Logical Scale
    }

    // --- USER INTERACTION ---
    setupDOM() {
      // Menu Navigation
      document.getElementById('btn-start')?.addEventListener('click', () => {
        this.sound.buttonClick();
        this.startMatch();
      });

      // Map selection button & modal
      document.getElementById('btn-maps')?.addEventListener('click', () => {
        this.openMapSelectModal();
      });

      document.getElementById('btn-close-map-select')?.addEventListener('click', () => {
        this.closeMapSelectModal();
      });

      document.getElementById('btn-map-select-close')?.addEventListener('click', () => {
        this.closeMapSelectModal();
      });

      document.getElementById('btn-task')?.addEventListener('click', () => {
        this.sound.buttonClick();
        this.openTasksModal();
      });

      document.getElementById('btn-challenge')?.addEventListener('click', () => {
        this.sound.buttonClick();
        this.openChallengesScreen();
      });

      document.getElementById('btn-achievements')?.addEventListener('click', () => {
        this.openAchievementsModal();
      });

      document.getElementById('btn-daily-reward')?.addEventListener('click', () => {
        this.openDailyRewardModal();
      });

      document.getElementById('btn-close-daily-reward')?.addEventListener('click', () => {
        this.closeDailyRewardModal();
      });

      document.getElementById('btn-claim-daily')?.addEventListener('click', () => {
        this.claimDailyRewardAction();
      });

      // Challenges Screen Navigation & Modals
      document.getElementById('btn-challenges-back')?.addEventListener('click', () => {
        this.sound.buttonClick();
        this.showScreen('main-menu');
      });

      document.getElementById('btn-claim-challenge-reward')?.addEventListener('click', () => {
        this.sound.coinCollect();
        if (this.activeChallenge && !this.activeChallenge.claimed) {
          this.activeChallenge.claimed = true;
          this.addMoney(this.activeChallenge.reward);
          Storage.saveChallenges(this.challenges);
          this.saveAll();
          this.renderMenuBadges();
        }
        document.getElementById('challenge-complete-modal')?.classList.add('hidden');
        this.openChallengesScreen();
      });

      document.getElementById('btn-back-challenges-from-win')?.addEventListener('click', () => {
        this.sound.buttonClick();
        document.getElementById('challenge-complete-modal')?.classList.add('hidden');
        this.openChallengesScreen();
      });

      document.getElementById('btn-retry-challenge')?.addEventListener('click', () => {
        this.sound.buttonClick();
        document.getElementById('challenge-failed-modal')?.classList.add('hidden');
        if (this.activeChallenge) {
          this.startChallenge(this.activeChallenge.id);
        } else {
          this.openChallengesScreen();
        }
      });

      document.getElementById('btn-back-challenges-from-fail')?.addEventListener('click', () => {
        this.sound.buttonClick();
        document.getElementById('challenge-failed-modal')?.classList.add('hidden');
        this.openChallengesScreen();
      });

      document.getElementById('btn-settings')?.addEventListener('click', () => {
        this.sound.buttonClick();
        this.openSettingsModal();
      });

      document.getElementById('btn-exit')?.addEventListener('click', () => {
        this.openExitScreen();
      });

      document.getElementById('btn-fullscreen')?.addEventListener('click', async () => {
        this.sound.buttonClick();
        await this.enterFullscreen();
      });

      document.getElementById('btn-return-game')?.addEventListener('click', () => {
        this.returnToMainMenu();
      });

      document.getElementById('btn-close-game')?.addEventListener('click', () => {
        this.closeGame();
      });

      // Player Profile Customization
      const openProfile = () => {
        this.sound.buttonClick();
        this.openProfileModal();
      };

      document.getElementById('btn-open-profile')?.addEventListener('click', openProfile);
      document.getElementById('menu-avatar-img')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openProfile();
      });
      document.getElementById('menu-avatar-fallback')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openProfile();
      });

      document.getElementById('btn-upload-avatar')?.addEventListener('click', () => {
        const fileInput = document.getElementById('avatar-file-input');
        if (fileInput) {
          fileInput.value = '';
          fileInput.click();
        }
      });

      document.getElementById('avatar-file-input')?.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            const rawDataUrl = evt.target.result;
            const tempImg = new Image();
            tempImg.onload = () => {
              const maxDim = 256;
              let w = tempImg.width;
              let h = tempImg.height;
              if (w > maxDim || h > maxDim) {
                if (w > h) {
                  h = Math.round((h * maxDim) / w);
                  w = maxDim;
                } else {
                  w = Math.round((w * maxDim) / h);
                  h = maxDim;
                }
              }
              const canvas = document.createElement('canvas');
              canvas.width = Math.max(1, w);
              canvas.height = Math.max(1, h);
              const ctx = canvas.getContext('2d');
              ctx.drawImage(tempImg, 0, 0, canvas.width, canvas.height);
              const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.88);

              this.pendingAvatar = optimizedDataUrl;
              const previewImg = document.getElementById('profile-modal-img');
              const previewFallback = document.getElementById('profile-modal-fallback');
              const removeBtn = document.getElementById('btn-remove-avatar');

              if (previewImg) {
                previewImg.src = optimizedDataUrl;
                previewImg.classList.remove('hidden');
              }
              if (previewFallback) previewFallback.classList.add('hidden');
              if (removeBtn) removeBtn.classList.remove('hidden');
            };
            tempImg.onerror = () => {
              this.pendingAvatar = rawDataUrl;
              const previewImg = document.getElementById('profile-modal-img');
              const previewFallback = document.getElementById('profile-modal-fallback');
              const removeBtn = document.getElementById('btn-remove-avatar');
              if (previewImg) {
                previewImg.src = rawDataUrl;
                previewImg.classList.remove('hidden');
              }
              if (previewFallback) previewFallback.classList.add('hidden');
              if (removeBtn) removeBtn.classList.remove('hidden');
            };
            tempImg.src = rawDataUrl;
          };
          reader.readAsDataURL(file);
        }
      });

      document.getElementById('btn-remove-avatar')?.addEventListener('click', () => {
        this.sound.buttonClick();
        this.pendingAvatar = null;
        const previewImg = document.getElementById('profile-modal-img');
        const previewFallback = document.getElementById('profile-modal-fallback');
        const removeBtn = document.getElementById('btn-remove-avatar');
        if (previewImg) {
          previewImg.src = '';
          previewImg.classList.add('hidden');
        }
        if (previewFallback) previewFallback.classList.remove('hidden');
        if (removeBtn) removeBtn.classList.add('hidden');
      });

      document.getElementById('btn-close-profile')?.addEventListener('click', () => {
        this.sound.buttonClick();
        this.pendingAvatar = this.playerAvatar;
        document.getElementById('profile-modal')?.classList.add('hidden');
      });

      document.getElementById('btn-close-profile-header')?.addEventListener('click', () => {
        this.sound.buttonClick();
        this.pendingAvatar = this.playerAvatar;
        document.getElementById('profile-modal')?.classList.add('hidden');
      });

      document.getElementById('btn-save-profile')?.addEventListener('click', () => {
        this.sound.buttonClick();
        const input = document.getElementById('input-player-name');
        if (input) {
          const val = input.value.trim();
          this.playerName = val.length > 0 ? val : "Your Player";
          Storage.setPlayerName(this.playerName);
        }
        this.playerAvatar = (this.pendingAvatar && this.pendingAvatar.length > 0) ? this.pendingAvatar : null;
        Storage.setPlayerAvatar(this.playerAvatar || "");

        this.renderProfileUI();
        document.getElementById('profile-modal')?.classList.add('hidden');
      });

      // Close modal generic handlers
      document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          this.sound.buttonClick();
          const targetId = btn.getAttribute('data-close');
          document.getElementById(targetId)?.classList.add('hidden');
          if (document.getElementById('main-menu')?.classList.contains('active')) {
            this.menuBattle?.resume();
          }
        });
      });

      // Pause/resume background battle on tab visibility change
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.menuBattle?.pause();
        } else if (document.getElementById('main-menu')?.classList.contains('active')) {
          this.menuBattle?.resume();
        }
      });

      // In-game HUD actions
      document.getElementById('btn-send-wave')?.addEventListener('click', () => {
        this.sound.buttonClick();
        this.triggerWave();
      });

      document.getElementById('btn-speed')?.addEventListener('click', () => {
        this.sound.buttonClick();
        if (this.gameSpeed === 1) this.gameSpeed = 2;
        else if (this.gameSpeed === 2) this.gameSpeed = 3;
        else this.gameSpeed = 1;
        document.getElementById('btn-speed').textContent = `${this.gameSpeed}x`;
      });

      document.getElementById('btn-pause')?.addEventListener('click', () => {
        this.sound.buttonClick();
        this.isPaused = true;
        const pModal = document.getElementById('pause-modal');
        if (pModal) {
          pModal.classList.remove('hidden');
          const pw = document.getElementById('pause-wave-num');
          const pd = document.getElementById('pause-duration');
          if (pw) pw.textContent = this.wave.toString();
          if (pd) pd.textContent = this.formatDuration(this.sessionDurationSec);
        }
      });

      document.getElementById('btn-resume')?.addEventListener('click', () => {
        this.sound.buttonClick();
        this.isPaused = false;
        document.getElementById('pause-modal')?.classList.add('hidden');
      });

      document.getElementById('btn-pause-restart')?.addEventListener('click', () => {
        this.sound.buttonClick();
        this.isPaused = false;
        document.getElementById('pause-modal')?.classList.add('hidden');
        if (this.isChallengeMode && this.activeChallenge) {
          this.startChallenge(this.activeChallenge.id);
        } else {
          this.startMatch();
        }
      });

      document.getElementById('btn-pause-menu')?.addEventListener('click', () => {
        this.sound.buttonClick();
        this.saveGameData();
        this.isPaused = false;
        document.getElementById('pause-modal')?.classList.add('hidden');
        if (this.isChallengeMode) {
          this.exitCurrentChallenge();
        } else {
          this.isPlaying = false;
          this.sound.stopMusic();
          this.showScreen('main-menu');
        }
      });

      document.getElementById('btn-hud-map')?.addEventListener('click', () => {
        this.sound.buttonClick();
        this.openMapSelectModal();
      });

      document.getElementById('btn-ingame-menu')?.addEventListener('click', () => {
        this.sound.buttonClick();
        this.saveGameData();
        if (this.isChallengeMode) {
          this.exitCurrentChallenge();
        } else {
          this.isPlaying = false;
          this.sound.stopMusic();
          this.showScreen('main-menu');
        }
      });

      // Tower Cards Selector in bottom bar
      document.querySelectorAll('.tower-card').forEach(card => {
        card.addEventListener('click', () => {
          this.sound.buttonClick();
          const type = card.getAttribute('data-type');
          if (this.selectedBuildType === type) {
            this.selectedBuildType = null;
            card.classList.remove('selected');
            if (!this.selectedTile) {
              document.getElementById('tile-selection-hint')?.classList.add('hidden');
            }
          } else {
            this.selectedBuildType = type;
            document.querySelectorAll('.tower-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            // If a tile was already selected, build it directly onto that tile!
            if (this.selectedTile) {
              this.buildTowerOnTile(this.selectedTile.col, this.selectedTile.row, type);
            } else {
              const hint = document.getElementById('tile-selection-hint');
              const text = document.getElementById('tile-selection-text');
              if (hint && text) {
                text.textContent = `Tap any green grass block to build ${type}`;
                hint.classList.remove('hidden');
              }
            }
          }
        });
      });

      // Tower Inspector Actions
      document.getElementById('btn-close-inspector')?.addEventListener('click', () => {
        this.sound.buttonClick();
        this.closeInspector();
      });

      document.getElementById('btn-upgrade-tower')?.addEventListener('click', () => {
        if (this.selectedTower) this.upgradeTower(this.selectedTower);
      });

      document.getElementById('btn-sell-tower')?.addEventListener('click', () => {
        if (this.selectedTower) this.sellTower(this.selectedTower);
      });

      // Game Over Screen Actions
      document.getElementById('btn-go-restart')?.addEventListener('click', () => {
        this.sound.buttonClick();
        this.startMatch();
      });

      document.getElementById('btn-go-menu')?.addEventListener('click', () => {
        this.sound.buttonClick();
        this.saveGameData();
        this.showScreen('main-menu');
      });

      // Victory Screen Actions
      document.getElementById('btn-next-map')?.addEventListener('click', () => {
        this.sound.buttonClick();
        const nextMap = this.currentMapIndex + 1;
        this.setMap(nextMap);
        this.startMatch();
      });

      document.getElementById('btn-play-again')?.addEventListener('click', () => {
        this.playAgainFreshGame();
      });

      document.getElementById('btn-vic-restart')?.addEventListener('click', () => {
        this.sound.buttonClick();
        this.startMatch();
      });

      document.getElementById('btn-vic-menu')?.addEventListener('click', () => {
        this.sound.buttonClick();
        this.saveGameData();
        this.updateMapUI();
        this.showScreen('main-menu');
      });

      // Autoplay Audio Unlock for Mobile Browsers
      const unlockAudio = () => {
        this.sound.init();
        window.removeEventListener('pointerdown', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
      };
      window.addEventListener('pointerdown', unlockAudio);
      window.addEventListener('touchstart', unlockAudio);
      window.addEventListener('keydown', unlockAudio);

      // Settings controls: Volume Sliders & Mute Toggle
      const volSlider = document.getElementById('slider-master-volume');
      if (volSlider) {
        volSlider.value = Math.round(this.sound.masterVolume * 100);
        volSlider.addEventListener('input', (e) => {
          const val = parseInt(e.target.value, 10);
          this.sound.setMasterVolume(val / 100);
          const txt = document.getElementById('volume-percent-text');
          if (txt) txt.textContent = `${val}%`;
        });
      }

      const musicSlider = document.getElementById('slider-music-volume');
      if (musicSlider) {
        musicSlider.value = Math.round(this.sound.musicVolume * 100);
        musicSlider.addEventListener('input', (e) => {
          const val = parseInt(e.target.value, 10);
          this.sound.setMusicVolume(val / 100);
          const txt = document.getElementById('music-percent-text');
          if (txt) txt.textContent = `${val}%`;
        });
      }

      const sfxSlider = document.getElementById('slider-sfx-volume');
      if (sfxSlider) {
        sfxSlider.value = Math.round(this.sound.sfxVolume * 100);
        sfxSlider.addEventListener('input', (e) => {
          const val = parseInt(e.target.value, 10);
          this.sound.setSfxVolume(val / 100);
          const txt = document.getElementById('sfx-percent-text');
          if (txt) txt.textContent = `${val}%`;
        });
      }

      document.getElementById('toggle-mute-all')?.addEventListener('change', (e) => {
        this.sound.setMuteAll(e.target.checked);
      });

      document.querySelectorAll('#graphics-selector .btn-chip').forEach(btn => {
        btn.addEventListener('click', () => {
          this.sound.buttonClick();
          const q = btn.getAttribute('data-quality');
          this.setGraphicsQuality(q);
        });
      });

      document.querySelectorAll('.btn-difficulty').forEach(btn => {
        btn.addEventListener('click', () => {
          this.sound.buttonClick();
          const diff = btn.getAttribute('data-diff');
          this.setDifficulty(diff);
        });
      });

      // 100% Offline Service Worker registration
      if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
      }

      document.getElementById('btn-reset-data')?.addEventListener('click', () => {
        this.sound.buttonClick();
        document.getElementById('reset-confirm-modal')?.classList.remove('hidden');
      });

      document.getElementById('btn-reset-cancel')?.addEventListener('click', () => {
        this.sound.buttonClick();
        document.getElementById('reset-confirm-modal')?.classList.add('hidden');
      });

      document.getElementById('btn-reset-confirm')?.addEventListener('click', () => {
        this.sound.buttonClick();
        Storage.resetAll();
        location.reload();
      });

      // Quick Camera Navigation Buttons
      document.getElementById('btn-scroll-top')?.addEventListener('click', () => {
        this.sound.buttonClick();
        this.targetCameraY = 0;
      });

      document.getElementById('btn-scroll-castle')?.addEventListener('click', () => {
        this.sound.buttonClick();
        this.targetCameraY = this.maxCameraY;
      });

      document.getElementById('btn-cancel-placement')?.addEventListener('click', () => {
        this.sound.buttonClick();
        this.clearTileSelection();
      });

      // Free Grid Tower Selection Modal listeners
      document.querySelectorAll('.tower-select-option').forEach(btn => {
        btn.addEventListener('click', () => {
          const type = btn.getAttribute('data-build');
          if (this.selectedTile && type) {
            this.buildTowerOnTile(this.selectedTile.col, this.selectedTile.row, type);
          }
        });
      });

      document.getElementById('btn-close-tower-modal')?.addEventListener('click', () => {
        this.sound.buttonClick();
        this.closeTowerSelectModal();
      });

      document.getElementById('btn-cancel-tower-modal')?.addEventListener('click', () => {
        this.sound.buttonClick();
        this.closeTowerSelectModal();
      });

      // Canvas Pointer, Drag-Scroll, Hover & Tap Handling
      if (this.canvas) {
        let isPointerDown = false;
        let startX = 0;
        let startY = 0;
        let lastY = 0;
        let hasMoved = false;

        const getCoords = (e) => {
          if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
          }
          return { x: e.clientX, y: e.clientY };
        };

        const onDown = (e) => {
          isPointerDown = true;
          const pos = getCoords(e);
          startX = pos.x;
          startY = pos.y;
          lastY = pos.y;
          hasMoved = false;
        };

        const onMove = (e) => {
          const pos = getCoords(e);
          // Update hover tile on battlefield
          const pt = this.screenToLogical(pos.x, pos.y);
          const worldX = pt.x;
          const worldY = pt.y + this.cameraY;
          const col = Math.floor(worldX / TILE_SIZE);
          const row = Math.floor(worldY / TILE_SIZE);
          if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
            this.hoverTile = { col, row };
          } else {
            this.hoverTile = null;
          }

          if (!isPointerDown) return;

          const dy = pos.y - lastY;
          lastY = pos.y;

          if (Math.abs(pos.y - startY) > 6 || Math.abs(pos.x - startX) > 6) {
            hasMoved = true;
          }

          if (hasMoved) {
            // Drag-scroll battlefield camera vertically
            const deltaWorldY = dy / (this.scale || 1);
            this.targetCameraY = Math.max(0, Math.min(this.maxCameraY, this.targetCameraY - deltaWorldY));
            this.cameraY = this.targetCameraY;
          }
        };

        const onUp = (e) => {
          if (!isPointerDown) return;
          isPointerDown = false;

          // If was not dragged, treat as tap / click
          if (!hasMoved) {
            const pt = this.screenToLogical(startX, startY);
            const worldX = pt.x;
            const worldY = pt.y + this.cameraY;
            const col = Math.floor(worldX / TILE_SIZE);
            const row = Math.floor(worldY / TILE_SIZE);
            this.handleTileClick(col, row);
          }
        };

        this.canvas.addEventListener('mousedown', onDown);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);

        this.canvas.addEventListener('touchstart', onDown, { passive: true });
        this.canvas.addEventListener('touchmove', onMove, { passive: true });
        this.canvas.addEventListener('touchend', onUp, { passive: true });
        this.canvas.addEventListener('touchcancel', () => { isPointerDown = false; });

        this.canvas.addEventListener('wheel', (e) => {
          e.preventDefault();
          this.targetCameraY = Math.max(0, Math.min(this.maxCameraY, this.targetCameraY + e.deltaY * 0.7));
        }, { passive: false });

        this.canvas.addEventListener('mouseleave', () => {
          this.hoverTile = null;
        });
      }
    }

    openProfileModal() {
      const modal = document.getElementById('profile-modal');
      const input = document.getElementById('input-player-name');
      const img = document.getElementById('profile-modal-img');
      const fallback = document.getElementById('profile-modal-fallback');
      const removeBtn = document.getElementById('btn-remove-avatar');

      if (input) input.value = this.playerName || "Your Player";
      this.pendingAvatar = this.playerAvatar;

      if (this.playerAvatar && this.playerAvatar.length > 0) {
        if (img) {
          img.src = this.playerAvatar;
          img.classList.remove('hidden');
        }
        if (fallback) fallback.classList.add('hidden');
        if (removeBtn) removeBtn.classList.remove('hidden');
      } else {
        if (img) {
          img.src = '';
          img.classList.add('hidden');
        }
        if (fallback) fallback.classList.remove('hidden');
        if (removeBtn) removeBtn.classList.add('hidden');
      }
      modal?.classList.remove('hidden');
    }

    evaluateAchievements() {
      if (!Array.isArray(this.achievements)) {
        this.achievements = Storage.getAchievements();
      }

      const totalKills = this.totalKills || 0;
      const mapsCompleted = Math.max(0, (Storage.getUnlockedMap() || 1) - 1);
      const bossesDefeated = this.bossesDefeated || 0;
      const totalGold = this.totalMoneyEarned || 0;
      const perfectWaves = this.perfectWavesCount || 0;

      let newlyUnlocked = false;

      this.achievements.forEach(a => {
        const wasCompleted = a.completed;
        if (a.type === 'kills') a.current = totalKills;
        else if (a.type === 'maps') a.current = mapsCompleted;
        else if (a.type === 'bosses') a.current = bossesDefeated;
        else if (a.type === 'gold') a.current = totalGold;
        else if (a.type === 'perfect') a.current = perfectWaves;
        else if (a.type === 'lightning_lv5') a.current = this.hasLightningLv5 ? 1 : 0;
        else if (a.type === 'cannon_lv5') a.current = this.hasCannonLv5 ? 1 : 0;
        else if (a.type === 'ice_lv5') a.current = this.hasIceLv5 ? 1 : 0;
        else if (a.type === 'fire_lv5') a.current = this.hasFireLv5 ? 1 : 0;

        if (a.current >= a.target) {
          a.completed = true;
          if (!wasCompleted) {
            newlyUnlocked = true;
            this.showAchievementToast(a.name);
          }
        }
      });

      if (newlyUnlocked) {
        Storage.saveAchievements(this.achievements);
        this.renderMenuBadges();
      }
    }

    showAchievementToast(title) {
      const banner = document.getElementById('achievement-toast-banner');
      const t = document.getElementById('toast-title');
      if (t) t.textContent = title;
      if (banner) {
        banner.classList.remove('hidden');
        setTimeout(() => banner.classList.add('hidden'), 3200);
      }
    }

    openAchievementsModal() {
      this.sound.buttonClick();
      this.evaluateAchievements();
      this.renderAchievementsUI();
      const modal = document.getElementById('achievements-modal');
      if (modal) modal.classList.remove('hidden');
    }

    renderAchievementsUI() {
      const listEl = document.getElementById('achievements-list');
      const titleEl = document.getElementById('achievements-title');
      const pctEl = document.getElementById('achievements-pct-text');
      const barEl = document.getElementById('achievements-progress-bar');
      if (!listEl) return;

      if (!Array.isArray(this.achievements)) {
        this.achievements = Storage.getAchievements();
      }

      const total = this.achievements.length;
      const completedCount = this.achievements.filter(a => a.completed).length;
      const pct = Math.round((completedCount / total) * 100);

      if (titleEl) titleEl.textContent = `ACHIEVEMENTS (${completedCount} / ${total})`;
      if (pctEl) pctEl.textContent = `${pct}%`;
      if (barEl) barEl.style.width = `${pct}%`;

      listEl.innerHTML = '';
      this.achievements.forEach(a => {
        const card = document.createElement('div');
        card.className = 'achievement-card';
        if (a.completed) card.classList.add('completed');
        if (a.claimed) card.classList.add('claimed');

        const curr = Math.min(a.target, a.current || 0);
        const itemPct = Math.round((curr / a.target) * 100);

        let actionHtml = '';
        if (a.claimed) {
          actionHtml = `<span class="daily-card-badge" style="background:#065f46;color:#34d399;font-size:10px;padding:4px 8px;">✔ CLAIMED</span>`;
        } else if (a.completed) {
          actionHtml = `<button class="btn-achievement-claim" data-ach-id="${a.id}">CLAIM +Rs ${a.reward}</button>`;
        } else {
          actionHtml = `<span class="achievement-bar-text">${curr} / ${a.target}</span>`;
        }

        card.innerHTML = `
          <div class="achievement-icon">${a.icon}</div>
          <div class="achievement-info">
            <div class="achievement-name">${a.name}</div>
            <div class="achievement-sub">${a.desc}</div>
            <div class="achievement-bar-row">
              <div class="achievement-mini-bar">
                <div class="achievement-mini-fill" style="width: ${itemPct}%"></div>
              </div>
            </div>
          </div>
          <div class="achievement-action">${actionHtml}</div>
        `;

        listEl.appendChild(card);
      });

      listEl.querySelectorAll('.btn-achievement-claim').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const achId = e.target.getAttribute('data-ach-id');
          this.claimAchievementReward(achId);
        });
      });
    }

    claimAchievementReward(achId) {
      const ach = this.achievements.find(a => a.id === achId);
      if (!ach || !ach.completed || ach.claimed) return;

      this.sound.coinCollect();
      ach.claimed = true;
      this.addMoney(ach.reward);
      Storage.saveAchievements(this.achievements);
      this.saveAll();
      this.updateMoneyDisplay();
      this.renderAchievementsUI();
      this.renderMenuBadges();

      this.addFloatingText(180, 200, `+Rs ${ach.reward} REWARD! 🏅`, '#fbbf24');
    }

    openTasksModal() {
      this.menuBattle?.pause();
      this.syncStats();
      const list = document.getElementById('tasks-list');
      if (!list) return;
      list.innerHTML = '';

      const claimedCount = this.tasks.filter(t => t.claimed).length;
      const titleEl = document.getElementById('tasks-title');
      if (titleEl) titleEl.textContent = `TASKS ${claimedCount} / 100`;

      this.tasks.forEach(task => {
        const card = document.createElement('div');
        card.className = 'item-card';
        const pct = Math.min(100, Math.round((task.current / task.target) * 100));
        const canClaim = !task.claimed && task.current >= task.target;

        card.innerHTML = `
          <div class="item-header">
            <span class="item-title">${task.name}</span>
            <span class="item-reward">+Rs ${task.reward}</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width: ${pct}%"></div>
          </div>
          <div class="item-footer">
            <span class="progress-text">${task.desc} (${task.current} / ${task.target})</span>
            <button class="btn-claim" ${task.claimed ? 'disabled' : (canClaim ? '' : 'disabled')}>
              ${task.claimed ? 'CLAIMED' : 'CLAIM'}
            </button>
          </div>
        `;

        const claimBtn = card.querySelector('.btn-claim');
        if (canClaim) {
          claimBtn.addEventListener('click', () => {
            this.sound.coinCollect();
            task.claimed = true;
            this.addMoney(task.reward);
            this.saveAll();
            this.renderMenuBadges();
            this.openTasksModal();
          });
        }
        list.appendChild(card);
      });

      document.getElementById('tasks-modal')?.classList.remove('hidden');
    }

    initializeChallenges() {
      if (!this.challenges || !Array.isArray(this.challenges) || this.challenges.length !== 100) {
        this.challenges = create100Challenges();
        Storage.saveChallenges(this.challenges);
        this.saveAll();
      } else {
        const completedCount = this.challenges.filter(c => c.completed).length;
        this.challenges.forEach(c => {
          if (!c.numStr) {
            c.numStr = `Challenge ${c.id < 10 ? '0' + c.id : c.id}`;
          }
          if (typeof c.progress !== 'number') c.progress = 0;
          c.unlocked = (c.id <= 5) || !!c.completed || (completedCount >= (c.reqCompleted || c.req || 0));
        });
      }
    }

    openChallenges() {
      this.openChallengesScreen();
    }

    closeChallenges() {
      this.showScreen('main-menu');
    }

    exitCurrentChallenge() {
      this.isPlaying = false;
      this.isPaused = false;
      this.sound.stopMusic();
      document.getElementById('pause-modal')?.classList.add('hidden');
      document.getElementById('challenge-complete-modal')?.classList.add('hidden');
      document.getElementById('challenge-failed-modal')?.classList.add('hidden');
      this.openChallengesScreen();
    }

    openChallengesScreen() {
      this.initializeChallenges();
      this.menuBattle?.pause();
      this.syncStats();
      this.renderChallenges();
      this.showScreen('challenges-screen');
    }

    renderChallenges() {
      this.initializeChallenges();

      const moneyEl = document.getElementById('challenges-money-val');
      if (moneyEl) moneyEl.textContent = `Rs ${this.money}`;

      const completedCount = this.challenges.filter(c => c.completed).length;
      const countEl = document.getElementById('challenges-count-badge');
      if (countEl) countEl.textContent = `Completed: ${completedCount} / 100`;

      // Update unlock status for all challenges
      this.challenges.forEach(c => {
        c.unlocked = (c.id <= 5) || !!c.completed || (completedCount >= (c.reqCompleted || c.req || 0));
      });

      const list = document.getElementById('challenges-grid-list');
      if (!list) return;
      list.innerHTML = '';

      this.challenges.forEach(ch => {
        const card = document.createElement('div');
        const isCompleted = !!ch.completed;
        const isClaimed = !!ch.claimed;
        const isUnlocked = !!ch.unlocked;

        let cardClass = 'challenge-card';
        if (isCompleted) cardClass += ' completed';
        else if (!isUnlocked) cardClass += ' locked';

        let statusBadgeClass = 'ch-card-status-badge';
        let statusText = 'LOCKED';
        if (isCompleted) {
          if (isClaimed) {
            statusBadgeClass += ' status-completed';
            statusText = 'COMPLETED';
          } else {
            statusBadgeClass += ' status-claimable';
            statusText = 'CLAIM REWARD';
          }
        } else if (isUnlocked) {
          statusBadgeClass += ' status-available';
          statusText = 'AVAILABLE';
        } else {
          statusBadgeClass += ' status-locked';
          const reqNum = ch.reqCompleted || ch.req || 0;
          statusText = `REQ: ${reqNum} CLEARED`;
        }

        let actionBtnHtml = '';
        if (isCompleted && !isClaimed) {
          actionBtnHtml = `
            <div class="ch-actions-row">
              <button class="btn-challenge-claim-card" data-claim-id="${ch.id}">CLAIM +Rs ${ch.reward}</button>
              <button class="btn-challenge-play" data-play-id="${ch.id}">PLAY</button>
            </div>
          `;
        } else if (isCompleted && isClaimed) {
          actionBtnHtml = `<button class="btn-challenge-play" data-play-id="${ch.id}">PLAY</button>`;
        } else {
          actionBtnHtml = `<button class="btn-challenge-play" data-play-id="${ch.id}" ${isUnlocked ? '' : 'disabled'}>${isUnlocked ? 'PLAY' : 'LOCKED'}</button>`;
        }

        const currentProg = isCompleted ? ch.target : (typeof ch.progress === 'number' ? ch.progress : 0);
        const numLabel = ch.numStr || (`Challenge ${ch.id < 10 ? '0' + ch.id : ch.id}`);

        card.className = cardClass;
        card.innerHTML = `
          <div class="ch-card-header">
            <span class="ch-card-num">${numLabel}</span>
            <span class="${statusBadgeClass}">${statusText}</span>
          </div>
          <div class="ch-card-title">${ch.title}</div>
          <div class="ch-card-desc">${ch.desc}</div>
          <div class="ch-card-progress-row">
            <span class="ch-progress-text">Progress: ${currentProg} / ${ch.target}</span>
            <span class="ch-card-reward">Reward: Rs ${ch.reward}</span>
          </div>
          <div class="ch-card-bottom">
            ${actionBtnHtml}
          </div>
        `;

        const claimBtn = card.querySelector(`[data-claim-id="${ch.id}"]`);
        if (claimBtn) {
          claimBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.sound.coinCollect();
            ch.claimed = true;
            this.addMoney(ch.reward);
            Storage.saveChallenges(this.challenges);
            this.saveAll();
            this.renderMenuBadges();
            this.renderChallenges();
          });
        }

        const playBtn = card.querySelector(`[data-play-id="${ch.id}"]`);
        if (playBtn && (isUnlocked || isCompleted)) {
          playBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.sound.buttonClick();
            this.startChallenge(ch.id);
          });
        }

        list.appendChild(card);
      });
    }

    startChallenge(challengeId) {
      const ch = this.challenges.find(c => c.id === challengeId);
      if (!ch || !ch.unlocked) return;

      this.sound.init();
      this.isChallengeMode = true;
      this.activeChallenge = ch;

      this.challengeKills = 0;
      this.challengeWavesCompleted = 0;
      this.challengeBossKills = 0;
      this.challengeTowerKills = { archer: 0, cannon: 0, magic: 0, lightning: 0 };
      this.challengeCastleDamaged = false;
      this.challengeStartTime = Date.now();
      this.challengeTimeElapsed = 0;
      this.challengeTimeLimit = ch.timeLimit || 0;

      // Close all modals
      document.getElementById('challenge-complete-modal')?.classList.add('hidden');
      document.getElementById('challenge-failed-modal')?.classList.add('hidden');
      document.getElementById('challenges-modal')?.classList.add('hidden');
      document.getElementById('pause-modal')?.classList.add('hidden');

      // Money setup for challenge
      const sMoney = ch.startMoney !== undefined ? ch.startMoney : 450;
      if (ch.type === 'budget') {
        this.money = sMoney;
      } else {
        this.money = Math.max(this.money, sMoney);
      }

      this.isPlaying = true;
      this.castleHealth = 100;
      this.maxCastleHealth = 100;
      this.castleHitTimer = 0;
      this.wave = 1;
      this.isPaused = false;
      this.gameSpeed = 1;
      this.prepTimer = 6;
      this.isWaveActive = false;
      this.sessionStartTime = Date.now();
      this.sessionDurationSec = 0;
      this.matchKills = 0;
      this.matchMoneyCollected = 0;

      this.towers = [];
      this.enemies = [];
      this.projectiles = [];
      this.particles = [];
      this.floatingTexts = [];
      this.lightningArcs = [];

      this.selectedTile = null;
      this.selectedTower = null;
      this.selectedBuildType = null;
      this.hoverTile = null;
      this.cameraY = 0;
      this.targetCameraY = 0;
      document.getElementById('tile-selection-hint')?.classList.add('hidden');
      document.querySelectorAll('.tower-card').forEach(c => c.classList.remove('selected'));
      this.closeInspector();

      this.updateTowerCardsAvailability();
      this.updateHud();
      this.updateChallengeProgressUI();
      this.showScreen('gameplay-screen');
      this.resizeCanvas();
      this.showWaveBanner(ch.numStr || 'CHALLENGE', ch.title);
      this.sound.startGameplayMusic(this.currentMapIndex, false);
    }

    getChallengeCurrentValue() {
      if (!this.activeChallenge) return 0;
      const ch = this.activeChallenge;
      switch (ch.type) {
        case 'waves':
        case 'perfect':
        case 'timed':
        case 'archer_only':
        case 'cannon_only':
        case 'magic_only':
        case 'lightning_only':
        case 'budget':
          return this.challengeWavesCompleted;
        case 'kills':
          return this.challengeKills;
        case 'boss':
          return this.challengeBossKills;
        case 'archer_kills':
          return this.challengeTowerKills['archer'] || 0;
        case 'cannon_kills':
          return this.challengeTowerKills['cannon'] || 0;
        case 'magic_kills':
          return this.challengeTowerKills['magic'] || 0;
        case 'lightning_kills':
          return this.challengeTowerKills['lightning'] || 0;
        default:
          return this.challengeWavesCompleted;
      }
    }

    getChallengeProgressString() {
      if (!this.activeChallenge) return '';
      const current = this.getChallengeCurrentValue();
      const target = this.activeChallenge.target;
      const ch = this.activeChallenge;
      if (['waves', 'perfect', 'timed', 'archer_only', 'cannon_only', 'magic_only', 'lightning_only', 'budget'].includes(ch.type)) {
        return `Waves: ${current} / ${target}`;
      } else if (ch.type === 'boss') {
        return `Bosses: ${current} / ${target}`;
      } else {
        return `Kills: ${current} / ${target}`;
      }
    }

    updateChallengeProgressUI() {
      if (!this.isChallengeMode || !this.activeChallenge) {
        document.getElementById('active-challenge-hud')?.classList.add('hidden');
        return;
      }
      const hud = document.getElementById('active-challenge-hud');
      if (hud) hud.classList.remove('hidden');

      const titleEl = document.getElementById('challenge-hud-name');
      const descEl = document.getElementById('challenge-hud-desc');
      if (titleEl) {
        titleEl.textContent = `${this.activeChallenge.numStr}: ${this.activeChallenge.title}`;
      }
      if (descEl) {
        descEl.textContent = this.getChallengeProgressString();
      }
    }

    checkChallengeConditions() {
      if (!this.isChallengeMode || !this.activeChallenge) return;
      const ch = this.activeChallenge;

      if (ch.type === 'perfect' && this.challengeCastleDamaged) {
        this.failChallenge('Castle took damage! (Requirement: No damage taken)');
        return;
      }

      const current = this.getChallengeCurrentValue();
      ch.progress = Math.max(ch.progress || 0, current);

      this.updateChallengeProgressUI();

      if (current >= ch.target) {
        if (ch.type === 'timed' && ch.timeLimit > 0 && this.challengeTimeElapsed > ch.timeLimit) {
          this.failChallenge(`Time limit of ${ch.timeLimit}s exceeded!`);
          return;
        }
        if (ch.type === 'perfect' && this.challengeCastleDamaged) {
          this.failChallenge('Castle took damage! (Requirement: No damage taken)');
          return;
        }
        this.completeChallenge();
      }
    }

    completeChallenge() {
      this.isPlaying = false;
      this.sound.stopMusic();
      this.sound.victorySound();

      const ch = this.activeChallenge;
      if (!ch) return;

      ch.completed = true;
      ch.progress = ch.target;

      const completedCount = this.challenges.filter(c => c.completed).length;
      this.challenges.forEach(c => {
        if (c.id <= 5 || c.completed || completedCount >= (c.reqCompleted || 0)) {
          c.unlocked = true;
        }
      });

      Storage.saveChallenges(this.challenges);
      this.saveAll();
      this.renderMenuBadges();

      const modal = document.getElementById('challenge-complete-modal');
      const nameEl = document.getElementById('comp-ch-name');
      const rewardEl = document.getElementById('comp-ch-reward');
      const claimBtn = document.getElementById('btn-claim-challenge-reward');
      const backBtn = document.getElementById('btn-back-challenges-from-win');

      if (nameEl) {
        nameEl.textContent = `${ch.numStr}: ${ch.title}`;
      }
      if (rewardEl) {
        rewardEl.textContent = `+Rs ${ch.reward}`;
      }
      if (claimBtn && backBtn) {
        if (ch.claimed) {
          claimBtn.classList.add('hidden');
          backBtn.classList.remove('hidden');
        } else {
          claimBtn.classList.remove('hidden');
          backBtn.classList.add('hidden');
        }
      }

      if (modal) modal.classList.remove('hidden');
    }

    failChallenge(reason = '') {
      this.isPlaying = false;
      this.sound.stopMusic();
      this.sound.gameOverSound();

      const modal = document.getElementById('challenge-failed-modal');
      const nameEl = document.getElementById('fail-ch-name');
      const killsEl = document.getElementById('fail-ch-kills');
      const durEl = document.getElementById('fail-ch-duration');

      if (nameEl && this.activeChallenge) {
        nameEl.textContent = `${this.activeChallenge.numStr}: ${this.activeChallenge.title}`;
      }
      if (killsEl) {
        killsEl.textContent = this.challengeKills.toString();
      }
      if (durEl) {
        durEl.textContent = this.formatDuration(this.challengeTimeElapsed);
      }

      if (modal) modal.classList.remove('hidden');
    }

    updateTowerCardsAvailability() {
      document.querySelectorAll('.tower-card').forEach(card => {
        const type = card.getAttribute('data-type');
        if (this.isChallengeMode && this.activeChallenge && this.activeChallenge.allowedTowers) {
          if (!this.activeChallenge.allowedTowers.includes(type)) {
            card.classList.add('card-disabled');
            card.style.opacity = '0.35';
            card.style.pointerEvents = 'none';
          } else {
            card.classList.remove('card-disabled');
            card.style.opacity = '1';
            card.style.pointerEvents = 'auto';
          }
        } else {
          card.classList.remove('card-disabled');
          card.style.opacity = '1';
          card.style.pointerEvents = 'auto';
        }
      });
    }

    openChallengesModal() {
      this.openChallengesScreen();
    }

    openSettingsModal() {
      this.menuBattle?.pause();
      document.getElementById('settings-modal')?.classList.remove('hidden');
    }
  }

  let activeGame = null;

  function resizeGame() {
    if (activeGame) {
      activeGame.resizeCanvas();
      activeGame.menuBattle?.resize();
    }
  }

  function initializeGame() {
    try {
      Storage.init();
      activeGame = new GameState();
      window.gameInstance = activeGame;
    } catch (err) {
      console.error('Game initialization failed:', err);
      const overlay = document.getElementById('fatal-error-overlay');
      const msg = document.getElementById('fatal-error-msg');
      if (overlay && msg && overlay.classList) {
        overlay.classList.remove('hidden');
        msg.textContent = 'Error: ' + (err.message || 'Game init error');
      }
    }
  }

  window.addEventListener('error', (event) => {
    const overlay = document.getElementById('fatal-error-overlay');
    const msg = document.getElementById('fatal-error-msg');
    if (overlay && msg && overlay.classList) {
      overlay.classList.remove('hidden');
      msg.textContent = 'Runtime Notice: ' + (event.message || 'Unexpected issue');
    }
  });

  const screens = {
    get mainMenu() { return document.getElementById('main-menu'); },
    get gameScreen() { return document.getElementById('gameplay-screen'); },
    get challengeScreen() { return document.getElementById('challenges-screen'); },
    get taskScreen() { return document.getElementById('tasks-modal'); },
    get settingsScreen() { return document.getElementById('settings-modal'); },
    get customizationScreen() { return document.getElementById('profile-modal'); },
    get exitScreen() { return document.getElementById('exit-screen'); },
    get gameOverScreen() { return document.getElementById('game-over-screen'); },
    get victoryScreen() { return document.getElementById('victory-screen'); }
  };

  function showScreen(screen) {
    if (activeGame) {
      activeGame.showScreen(screen);
      return;
    }
    const all = [
      document.getElementById('main-menu'),
      document.getElementById('gameplay-screen'),
      document.getElementById('challenges-screen'),
      document.getElementById('tasks-modal'),
      document.getElementById('settings-modal'),
      document.getElementById('profile-modal'),
      document.getElementById('exit-screen'),
      document.getElementById('game-over-screen'),
      document.getElementById('victory-screen')
    ];
    all.forEach(s => {
      if (s) {
        s.style.display = 'none';
        s.classList?.remove('active');
        if (s.classList?.contains('modal-overlay')) {
          s.classList.add('hidden');
        }
      }
    });

    let target = null;
    if (typeof screen === 'string') {
      target = document.getElementById(screen) || screens[screen];
    } else if (screen && (screen.nodeType || screen.style || screen.id)) {
      target = screen;
    }
    if (target) {
      target.style.display = 'flex';
      target.classList?.add('active');
      if (target.classList?.contains('modal-overlay')) {
        target.classList.remove('hidden');
      }
    }
  }

  function openExitScreen() {
    saveGameData();
    const exitScreen = document.getElementById('exit-screen');
    const mainMenu = document.getElementById('main-menu');
    if (activeGame) {
      activeGame.openExitScreen();
    } else {
      if (mainMenu) mainMenu.style.display = 'none';
      if (exitScreen) exitScreen.style.display = 'flex';
      showScreen(exitScreen);
    }
  }

  function returnToMainMenu() {
    const exitScreen = document.getElementById('exit-screen');
    const mainMenu = document.getElementById('main-menu');
    if (activeGame) {
      activeGame.returnToMainMenu();
    } else {
      if (exitScreen) exitScreen.style.display = 'none';
      if (mainMenu) mainMenu.style.display = 'flex';
      showScreen(mainMenu);
    }
  }

  function saveGameData() {
    if (activeGame) {
      activeGame.saveGameData();
    } else {
      Storage.save(Storage.load());
    }
  }

  function closeGame() {
    if (activeGame) {
      activeGame.closeGame();
    } else {
      saveGameData();
      try {
        if (window.AndroidBridge && typeof window.AndroidBridge.closeApp === 'function') {
          window.AndroidBridge.closeApp();
          return;
        }
      } catch (e) {}
      try {
        window.close();
      } catch (e) {}
      try {
        window.open('', '_self');
        window.close();
      } catch (e) {}
      const exitDesc = document.querySelector('.exit-desc');
      if (exitDesc) {
        exitDesc.textContent = 'Game saved successfully. You may safely close this browser window or tab.';
      }
      const btnClose = document.getElementById('btn-close-game');
      if (btnClose) {
        btnClose.textContent = 'CLOSED';
        btnClose.disabled = true;
      }
    }
  }

  // Global API hooks
  window.screens = screens;
  window.showScreen = showScreen;
  window.openExitScreen = openExitScreen;
  window.returnToMainMenu = returnToMainMenu;
  window.saveGameData = saveGameData;
  window.closeGame = closeGame;
  window.create100Challenges = create100Challenges;
  window.generate100Challenges = generate100Challenges;
  window.openChallenges = () => activeGame?.openChallengesScreen();
  window.closeChallenges = () => activeGame?.closeChallenges();
  window.initializeChallenges = () => activeGame?.initializeChallenges();
  window.renderChallenges = () => activeGame?.renderChallenges();

  window.addEventListener('resize', resizeGame);
  window.addEventListener('orientationchange', resizeGame);

  function exposeGlobalElements() {
    window.mainMenu = document.getElementById('main-menu');
    window.exitScreen = document.getElementById('exit-screen');
    window.gameScreen = document.getElementById('gameplay-screen');
    window.challengeScreen = document.getElementById('challenges-screen');
    window.taskScreen = document.getElementById('tasks-modal');
    window.settingsScreen = document.getElementById('settings-modal');
    window.customizationScreen = document.getElementById('profile-modal');
    window.exitButton = document.getElementById('btn-exit');
    window.returnToGameButton = document.getElementById('btn-return-game');
  }

  function attachDirectListeners() {
    exposeGlobalElements();

    const btnCh = document.getElementById('btn-challenge');
    if (btnCh) {
      btnCh.addEventListener('click', () => {
        activeGame?.openChallengesScreen();
      });
    }
    const btnBack = document.getElementById('btn-challenges-back');
    if (btnBack) {
      btnBack.addEventListener('click', () => {
        activeGame?.closeChallenges();
      });
    }

    const btnExit = document.getElementById('btn-exit');
    if (btnExit) {
      btnExit.onclick = (e) => {
        e?.preventDefault?.();
        openExitScreen();
      };
      btnExit.addEventListener('click', openExitScreen);
    }
    const btnReturn = document.getElementById('btn-return-game');
    if (btnReturn) {
      btnReturn.onclick = (e) => {
        e?.preventDefault?.();
        returnToMainMenu();
      };
      btnReturn.addEventListener('click', returnToMainMenu);
    }
    const btnClose = document.getElementById('btn-close-game');
    if (btnClose) {
      btnClose.onclick = (e) => {
        e?.preventDefault?.();
        closeGame();
      };
      btnClose.addEventListener('click', closeGame);
    }
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => {
      initializeGame();
      resizeGame();
      attachDirectListeners();
    });
  } else {
    initializeGame();
    resizeGame();
    attachDirectListeners();
  }
})();
