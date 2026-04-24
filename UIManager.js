import { CLASSIC_PLAYLIST } from './playlist.js';
const GAME_VERSION = '2.4.12';

/**
 * UIManager: DOM要素の管理、UI表示の更新、および設定のセーブ/ロードを担当するクラス
 */
export class UIManager {
    constructor(game) {
        this.game = game;

        // DOM Elements Acquisition
        this.scoreVal = document.getElementById('score-val');
        this.bestVal = document.getElementById('best-val');
        this.livesVal = document.getElementById('lives-val');
        this.stageVal = document.getElementById('stage-val');
        this.superEasyBadge = document.getElementById('super-easy-badge');
        this.msgOverlay = document.getElementById('msg-overlay');
        this.msgTitle = document.getElementById('msg-title');
        this.msgText = document.getElementById('msg-text');
        this.pauseBtn = document.getElementById('pause-btn');

        this.settingsOverlay = document.getElementById('settings-overlay');
        this.pauseButtons = document.getElementById('pause-buttons');
        this.showSettingsBtn = document.getElementById('show-settings-btn');
        this.nextStageBtn = null; 
        this.nextBgmBtn = document.getElementById('next-bgm-btn');
        this.closeSettingsBtn = document.getElementById('close-settings-btn');
        this.settingsTitle = document.getElementById('settings-title');
        this.difficultySelector = document.getElementById('difficulty-setting');
        this.controlModeSelector = document.getElementById('control-mode');
        this.paddleSpeedSlider = document.getElementById('paddle-speed-val');
        this.bgmVolumeSlider = document.getElementById('bgm-volume');
        this.seVolumeSlider = document.getElementById('se-volume');
        this.msgSettingsBtn = document.getElementById('msg-settings-btn');
        this.paddleSpeedContainer = document.getElementById('paddle-speed-container');
        this.bgmSelectionContainer = document.getElementById('bgm-selection-container');
        this.stageSelectionContainer = document.getElementById('stage-selection-container');
        this.stageSelector = document.getElementById('stage-select-val');
        this.nowPlaying = document.getElementById('now-playing');
        this.updateToast = document.getElementById('update-toast');
        this.updateBtn = document.getElementById('update-btn');
        this.uiOverlay = document.getElementById('ui-overlay');
        
        this.bgmSelector = document.getElementById('bgm-selector');
        this.themeSelector = document.getElementById('theme-selector');
        this.themeSelectionContainer = document.getElementById('theme-selection-container');
        
        this.initBgmSelector();
        this.initStageSelector();
        this.initVersionInfo();

        const events = this.game.events;
        if (events) {
            events.on('SCORE_UPDATE', ({ val }) => {
                this.updateScore(val);
            });
            events.on('LIVES_UPDATE', (val) => this.updateLives(val));
            events.on('STAGE_UPDATE', (val) => this.updateStage(val));
            events.on('UI_REFRESH', (data) => this.updateUI());
            
            events.on('LEVEL_START', ({ level, restartTaps, lives }) => {
                this.showStartScreen(level, restartTaps, lives);
            });
            events.on('STAGE_CLEAR', ({ score, track, info, isFinal }) => {
                this.showClearScreen(score, track, info, isFinal);
            });
            events.on('GAME_OVER', (data) => {
                if (this.bestVal) this.bestVal.textContent = data.bestScore.toString().padStart(9, '0');
                this.showGameOverScreen(data.score, data.bestScore, data.highestStage, data.isNewRecord, data.isNewStageRecord);
            });
            events.on('GAME_MISS', ({ lives }) => this.showMissScreen(lives));
            
            events.on('OVERLAY_CLEAR', () => this.clearOverlay());
            events.on('OVERLAY_CLEAR_ALL', () => this.hideAllOverlays());
            events.on('OVERLAY_SHOW_MESSAGE', () => this.showMessageOverlay());
            
            events.on('GAME_READY', () => this.showReadyState());
            events.on('GAME_PAUSE', () => this.showPauseMenu());
            events.on('GAME_RESUME', () => this.hidePauseMenu());
            
            events.on('BGM_NOW_PLAYING', ({ name }) => this.showNowPlaying(name));
            events.on('UNLOCK_NOTIFICATION', ({ text }) => this.showUnlockNotification(text));
            events.on('INPUT_LOCK_UPDATE', ({ isLocked }) => this.updateInputLockUI());
            
            events.on('SETTINGS_LOAD', () => this.loadSettings());
            events.on('SETTINGS_SHOW', () => this.showSettings());
            events.on('SETTINGS_HIDE', () => this.hideSettings());
            events.on('UPDATE_NOTIFICATION', ({ onUpdate }) => this.showUpdateNotification(onUpdate));
            
            events.on('SECRET_TAP_EFFECT', () => this.playSecretTapEffect());
            events.on('UNLOCK_EFFECT', ({ type }) => this.showUnlockEffect(type));
        }
    }

    initBgmSelector() {
        if (this.bgmSelector) {
            // Keep first 2 options: "None" and "Random"
            while (this.bgmSelector.options.length > 2) {
                this.bgmSelector.remove(2);
            }

            // Create a sorted copy of the playlist
            const sortedPlaylist = [...CLASSIC_PLAYLIST].sort((a, b) => {
                return a.name.localeCompare(b.name, 'ja');
            });

            sortedPlaylist.forEach(track => {
                let opt = document.createElement('option');
                opt.value = track.file;
                opt.textContent = track.name;
                this.bgmSelector.appendChild(opt);
            });
        }
    }

    initStageSelector() {
        if (this.stageSelector) {
            this.stageSelector.innerHTML = '';
            for (let i = 1; i <= 100; i++) {
                let opt = document.createElement('option');
                opt.value = i;
                opt.textContent = `Stage ${i}`;
                this.stageSelector.appendChild(opt);
            }
        }
    }

    initVersionInfo() {
        if (this.settingsOverlay) {
            const modal = this.settingsOverlay.querySelector('.settings-modal');
            if (modal) {
                const versionContainer = document.createElement('div');
                versionContainer.classList.add('version-container');

                const brandLabel = document.createElement('div');
                brandLabel.classList.add('brand-label');
                brandLabel.textContent = 'DeiScore';

                const versionLabel = document.createElement('div');
                versionLabel.classList.add('version-label');
                versionLabel.textContent = `VERSION ${GAME_VERSION}`;

                versionContainer.appendChild(brandLabel);
                versionContainer.appendChild(versionLabel);
                modal.appendChild(versionContainer);
            }
        }
    }

    loadSettings() {
        const PREFIX = 'deiscore_';
        if (this.bgmVolumeSlider) this.bgmVolumeSlider.value = localStorage.getItem(PREFIX + 'bgm_volume') || '0.5';
        if (this.seVolumeSlider) this.seVolumeSlider.value = localStorage.getItem(PREFIX + 'se_volume') || '0.5';
        if (this.paddleSpeedSlider) this.paddleSpeedSlider.value = localStorage.getItem(PREFIX + 'paddle_speed') || '13';
        if (this.difficultySelector) this.difficultySelector.value = localStorage.getItem(PREFIX + 'difficulty') || 'normal';
        if (this.controlModeSelector) this.controlModeSelector.value = localStorage.getItem(PREFIX + 'control_mode') || 'zone';
        if (this.themeSelector) {
            const savedTheme = localStorage.getItem(PREFIX + 'theme') || 'default';
            this.themeSelector.value = savedTheme;
            this.game.themeManager.currentThemeName = savedTheme;
            document.body.setAttribute('data-theme', savedTheme);
            
            // Initialize pastelColors for the current theme
            this.game.pastelColors = this.game.themeManager.getColor('pastelColors');
        }

        if (this.themeSelectionContainer) {
            this.themeSelectionContainer.style.display = (this.game.gameState && this.game.gameState.isAllCleared) ? 'block' : 'none';
        }

        if (this.game.sounds && this.game.sounds.bgmAudio && this.bgmVolumeSlider) {
            this.game.sounds.bgmAudio.volume = parseFloat(this.bgmVolumeSlider.value);
        }
        
        if (this.difficultySelector) this.game.difficulty = this.difficultySelector.value;
        if (this.controlModeSelector) this.game.controlMode = this.controlModeSelector.value;
        if (this.paddleSpeedSlider) {
            this.game.paddleSpeedSetting = parseInt(this.paddleSpeedSlider.value);
            if (this.game.entities.paddle) this.game.entities.paddle.speed = this.game.paddleSpeedSetting;
        }
        
        if (this.paddleSpeedContainer) {
            this.paddleSpeedContainer.style.display = (this.game.controlMode === 'zone' ? 'block' : 'none');
        }

        if (this.game.gameState && this.game.gameState.isSuperEasyUnlocked) this.refreshDifficultyOptions();
        
        if (this.bgmSelectionContainer) {
            this.bgmSelectionContainer.style.display = (this.game.gameState && (this.game.gameState.isBgmSelectionUnlocked || this.game.gameState.isAllCleared)) ? 'block' : 'none';
        }
        if (this.stageSelectionContainer) {
            const isUnlocked = (this.game.gameState.isStageSelectUnlocked || this.game.gameState.isAllCleared);
            this.stageSelectionContainer.style.display = isUnlocked ? 'block' : 'none';
        }
        if (this.stageSelector && this.game.gameState) {
            this.stageSelector.value = this.game.gameState.level;
        }
        if (this.themeSelectionContainer) {
            // 100ステージクリア、またはデバッグ解禁済みの場合のみ表示
            const isUnlocked = this.game.gameState && (this.game.gameState.isAllCleared || this.game.debugUnlock);
            this.themeSelectionContainer.style.display = isUnlocked ? 'block' : 'none';
        }

    }

    saveSettings() {
        const PREFIX = 'deiscore_';
        if (this.bgmVolumeSlider) localStorage.setItem(PREFIX + 'bgm_volume', this.bgmVolumeSlider.value);
        if (this.seVolumeSlider) localStorage.setItem(PREFIX + 'se_volume', this.seVolumeSlider.value);
        if (this.paddleSpeedSlider) localStorage.setItem(PREFIX + 'paddle_speed', this.paddleSpeedSlider.value);
        if (this.difficultySelector) localStorage.setItem(PREFIX + 'difficulty', this.difficultySelector.value);
        if (this.controlModeSelector) localStorage.setItem(PREFIX + 'control_mode', this.controlModeSelector.value);
        if (this.themeSelector) localStorage.setItem(PREFIX + 'theme', this.themeSelector.value);
    }

    refreshDifficultyOptions() {
        if (!this.difficultySelector) return;
        
        let exists = false;
        for (let i = 0; i < this.difficultySelector.options.length; i++) {
            if (this.difficultySelector.options[i].value === 'superEasy') {
                exists = true;
                break;
            }
        }

        if (this.game.gameState && this.game.gameState.isSuperEasyUnlocked && !exists) {
            const opt = document.createElement('option');
            opt.value = 'superEasy';
            opt.textContent = 'Super Easy (超かんたん)';
            this.difficultySelector.prepend(opt);
        }
    }

    updateUI() {
        // Update best score display from state
        if (this.bestVal) {
             this.bestVal.textContent = this.game.gameState.bestScore.toString().padStart(9, '0');
        }
        
        // Apply theme lock body class
        const isUnlocked = this.game.gameState.isAllCleared || this.game.debugUnlock;
        if (isUnlocked) {
            document.body.classList.add('all-cleared');
        } else {
            document.body.classList.remove('all-cleared');
        }

        // Update stage number display
        if (this.stageVal) this.stageVal.textContent = this.game.gameState.level;
    }

    updateScore(val) {
        if (this.scoreVal) this.scoreVal.textContent = val.toString().padStart(9, '0');
    }

    updateLives(val) {
        if (this.livesVal) this.livesVal.textContent = val;
    }

    updateStage(val) {
        if (this.stageVal) this.stageVal.textContent = val;
    }

    showStartScreen(level, restartTaps, lives) {
        if (this.msgOverlay) {
            this.msgOverlay.style.display = 'flex';
            this.msgOverlay.classList.add('visible');
            this.msgOverlay.classList.remove('miss', 'paused');
        }

        if (this.msgTitle) {
            this.msgTitle.className = ''; // Reset classes
            if (lives < 3 && lives > 0) {
                this.msgTitle.textContent = 'MISS!';
            } else {
                this.msgTitle.textContent = 'DeiScore';
            }
        }

        if (this.msgText) {
            if (restartTaps > 0) {
                this.msgText.innerHTML = `TAP <span class="restart-count">${restartTaps}</span> MORE TIMES TO RESTART...`;
            } else {
                const actionText = (level > 1 && lives === 3) ? 'CONTINUE' : 'START';
                this.msgText.innerHTML = level === 1 ? 'TAP TO START' : `STAGE ${level}<br><br>TAP TO ${actionText}`;
            }
        }

        if (this.msgSettingsBtn) this.msgSettingsBtn.style.display = 'flex';
        if (this.pauseButtons) this.pauseButtons.style.display = 'none';
    }

    showClearScreen(score, trackInfo, composerInfo, isFinalClear = false) {
        if (this.msgOverlay) {
            this.msgOverlay.style.display = 'flex';
            this.msgOverlay.classList.add('visible');
            this.msgOverlay.classList.remove('paused', 'miss');
        }

        if (this.msgTitle) {
            this.msgTitle.className = '';
            if (isFinalClear) {
            this.msgTitle.innerHTML = "ALL STAGES CLEAR!";
            this.msgTitle.classList.add('msg-title-clear');
            this.msgText.innerHTML = `CONGRATULATIONS!<br><br><div class="score-row"><div class="compact-score">FINAL SCORE: ${score}</div></div>`;
            
            // Sequential Unlock Notifications
            const rewards = [
                "超簡単をアンロックしました",
                "曲選択をアンロックしました",
                "ステージ選択をアンロックしました",
                "テーマ設定をアンロックしました"
            ];
            let delay = 1000;
            rewards.forEach(msg => {
                setTimeout(() => {
                    if (this.game.state === 'CLEAR') {
                        // キャンバスではなく、最前面のUI通知メソッドを呼ぶ
                        this.showUnlockNotification(msg);
                    }
                }, delay);
                delay += 2000;
            });
        } else {
                this.msgTitle.textContent = 'STAGE CLEAR';
                this.msgText.innerHTML = `
                    <div class="score-row">
                        <div class="compact-score">SCORE: ${score}</div>
                    </div>
                `;
            }

            // Re-parent and iconize settings button (always shown)
            const scoreRow = this.msgText.querySelector('.score-row');
            if (scoreRow && this.showSettingsBtn) {
                this.showSettingsBtn.textContent = '⚙';
                this.showSettingsBtn.classList.add('icon-only');
                this.showSettingsBtn.style.display = 'flex';
                scoreRow.appendChild(this.showSettingsBtn);
            }
        }

        // BGM Info Card
        if (trackInfo && composerInfo) {
            const msgContent = this.msgOverlay ? this.msgOverlay.querySelector('.msg-content') : null;
            if (msgContent) {
                // Strictly remove existing cards by ID to prevent duplicates
                const existing = document.getElementById('active-bgm-card');
                if (existing) existing.remove();

                const card = document.createElement('div');
                card.id = 'active-bgm-card';
                card.className = 'bgm-info-card';
                // Clean up track name by removing [Composer] prefix
                const cleanTitle = trackInfo.name.replace(/\[.*?\]\s*/, '');
                card.innerHTML = `
                    <h3>${cleanTitle}</h3>
                    <p>${composerInfo.songDescription}</p>
                    <h4>${composerInfo.composerName}</h4>
                    <p>${composerInfo.composerDescription}</p>
                `;
                msgContent.appendChild(card);
            }
        }

        // Buttons (Always shown, text branches based on isFinalClear)
        if (this.pauseButtons) {
            this.pauseButtons.style.display = 'flex';
            this.pauseButtons.style.marginBottom = '10px';
            this.pauseButtons.innerHTML = '';

            if (!this.nextStageBtn) {
                this.nextStageBtn = document.createElement('button');
                this.nextStageBtn.id = 'next-stage-btn';
                this.nextStageBtn.className = 'ui-button-stage';
            }
            this.nextStageBtn.textContent = isFinalClear ? 'Play Again' : 'Next Stage';
            this.nextStageBtn.style.display = 'block';
            this.pauseButtons.appendChild(this.nextStageBtn);

            if (!isFinalClear && this.nextBgmBtn) {
                this.nextBgmBtn.style.display = 'block';
                this.pauseButtons.appendChild(this.nextBgmBtn);
            }
        }

        if (this.msgSettingsBtn) this.msgSettingsBtn.style.display = 'none';
    }

    showGameOverScreen(score, bestScore, highestStage, isNewRecord, isNewStageRecord) {
        if (this.msgOverlay) {
            this.msgOverlay.style.display = 'flex';
            this.msgOverlay.classList.add('visible', 'miss');
            this.msgOverlay.classList.remove('paused');
        }

        if (this.msgTitle) {
            this.msgTitle.textContent = 'GAME OVER';
            this.msgTitle.classList.add('msg-title-gameover');
        }

        if (this.msgText) {
            let recordHtml = '';
            if (isNewRecord) {
                recordHtml = `
                    <div class="new-record-badges">
                        <div class="record-badge pulse">Record !</div>
                        <div class="best-score-badge pulse">Best score!</div>
                    </div>
                `;
            }

            this.msgText.innerHTML = `
                ${recordHtml}
                <div class="score-row">
                    <div class="compact-score score-val-large">SCORE: ${score.toString().padStart(9, '0')}</div>
                </div>
                <div class="game-over-stats">
                    BEST: ${bestScore.toString().padStart(9, '0')}<br>HIGHEST STAGE: ${highestStage}
                </div>
                <div class="retry-hint">TAP TO RETRY</div>
            `;

            // Re-parent and iconize settings button
            const scoreRow = this.msgText.querySelector('.score-row');
            if (scoreRow && this.showSettingsBtn) {
                this.showSettingsBtn.textContent = '⚙';
                this.showSettingsBtn.classList.add('icon-only');
                this.showSettingsBtn.style.display = 'flex';
                scoreRow.appendChild(this.showSettingsBtn);
            }
        }

        if (this.pauseButtons) {
            this.pauseButtons.style.display = 'flex';
            if (this.showSettingsBtn && this.showSettingsBtn.parentElement === this.pauseButtons) {
                this.showSettingsBtn.style.display = 'none';
            }
            if (this.nextBgmBtn) this.nextBgmBtn.style.display = 'none';
            if (this.nextStageBtn) this.nextStageBtn.style.display = 'none';
        }

        if (this.msgSettingsBtn) this.msgSettingsBtn.style.display = 'inline-flex';
    }

    showMissScreen(lives) {
        if (this.msgOverlay) {
            this.msgOverlay.style.display = 'flex';
            this.msgOverlay.classList.add('visible', 'miss');
            this.msgOverlay.classList.remove('paused');
        }

        if (this.msgTitle) {
            this.msgTitle.textContent = 'MISS!';
            this.msgTitle.className = 'msg-title-miss';
        }

        if (this.msgText) {
            this.msgText.innerHTML = `LIVES REMAINING: ${lives}<br><br><span class="lives-waiting">WAITING...</span>`;
        }
    }

    clearOverlay() {
        if (this.msgOverlay) {
            const card = this.msgOverlay.querySelector('.bgm-info-card');
            if (card) card.remove();
            this.msgOverlay.classList.remove('miss', 'paused', 'visible');
        }

        if (this.msgTitle) {
            this.msgTitle.className = '';
            this.msgTitle.innerHTML = ''; // Clear innerHTML to avoid leftovers from GAME OVER spans
        }

        if (this.msgSettingsBtn) {
            this.msgSettingsBtn.className = '';
            if (this.msgOverlay) {
                const msgContent = this.msgOverlay.querySelector('.msg-content');
                if (msgContent) msgContent.appendChild(this.msgSettingsBtn);
            }
            this.msgSettingsBtn.style.display = 'none';
        }

        // Reset Settings button to original state
        if (this.showSettingsBtn) {
            this.showSettingsBtn.textContent = 'Settings';
            this.showSettingsBtn.classList.remove('icon-only');
            if (this.pauseButtons) this.pauseButtons.appendChild(this.showSettingsBtn);
        }
    }
    showNowPlaying(name) {
        // Canvas notification (for in-game subtle cues)
        this.game.bgmText = `${name}`;
        this.game.bgmTextTimer = 300; 

        // DOM notification (for visibility over overlays)
        if (this.nowPlaying) {
            let composer = "";
            let title = name;

            // 1. [Composer] Title format
            const bracketMatch = name.match(/^\[(.*?)\]\n?([\s\S]*)$/);
            // 2. Composer: Title or Composer:Title format
            const colonMatch = name.match(/^(.*?):\n?([\s\S]*)$/);

            if (bracketMatch) {
                composer = bracketMatch[1];
                title = bracketMatch[2];
            } else if (colonMatch) {
                composer = colonMatch[1];
                title = colonMatch[2];
            }

            if (composer) {
                const titleDisplay = title.replace(/\n/g, '<br>');
                const composerDisplay = composer.replace(/\n/g, '<br>');
                this.nowPlaying.innerHTML = `
                    <div class="bgm-composer">${composerDisplay}</div>
                    <div class="bgm-title">${titleDisplay}</div>
                `;
            } else {
                const nameDisplay = name.replace(/\n/g, '<br>');
                this.nowPlaying.innerHTML = `<div class="bgm-title">${nameDisplay}</div>`;
            }
            
            this.nowPlaying.classList.remove('visible');
            void this.nowPlaying.offsetWidth; // Force reflow
            this.nowPlaying.classList.add('visible');
            
            if (this.game.nowPlayingTimeout) clearTimeout(this.game.nowPlayingTimeout);
            this.game.nowPlayingTimeout = setTimeout(() => {
                this.nowPlaying.classList.remove('visible');
            }, 5000);
        }
    }

    showUnlockNotification(text) {
        if (this.nowPlaying) {
            // 文字数が多い場合はフォントサイズを小さくする
            const fontSize = text.length > 10 ? '1.2rem' : '1.5rem';
            this.nowPlaying.innerHTML = `<div class="text-highlight-glow" style="font-size: ${fontSize}">✨ ${text} ✨</div>`;
            
            this.nowPlaying.classList.remove('visible');
            void this.nowPlaying.offsetWidth; // アニメーションのリセット
            this.nowPlaying.classList.add('visible');
            
            if (this.game.nowPlayingTimeout) clearTimeout(this.game.nowPlayingTimeout);
            this.game.nowPlayingTimeout = setTimeout(() => {
                this.nowPlaying.classList.remove('visible');
            }, 5000);
        }

        // 確実な解禁音（Web Audio APIを使用してキラキラ音を生成）
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc1.type = 'sine';
            osc2.type = 'triangle';
            
            // アルペジオ（ピロリロリン♪）
            osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5
            osc1.frequency.setValueAtTime(1108.73, ctx.currentTime + 0.1); // C#6
            osc1.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.2); // E6
            
            osc2.frequency.setValueAtTime(1760, ctx.currentTime); // A6
            
            gain.gain.setValueAtTime(0.0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05); // 音量
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
            
            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);
            
            osc1.start(ctx.currentTime);
            osc2.start(ctx.currentTime);
            osc1.stop(ctx.currentTime + 1.0);
            osc2.stop(ctx.currentTime + 1.0);
        } catch(e) {
            console.warn("Audio Context not supported for unlock sound", e);
        }
    }

    /**
     * 入力ロック中のUIフィードバック（グレーアウトなど）を更新する
     */
    updateInputLockUI() {
        if (this.game.state === 'CLEAR') {
            const isLocked = this.game.inputLockTimer > 0;
            
            if (this.nextStageBtn) {
                this.nextStageBtn.classList.toggle('btn-locked', isLocked);
                this.nextStageBtn.disabled = isLocked;
            }
            
            if (this.nextBgmBtn) {
                const usedInStage = this.game.hasUsedNextBgmInStage;
                this.nextBgmBtn.classList.toggle('btn-locked', isLocked || usedInStage);
                this.nextBgmBtn.disabled = isLocked || usedInStage;
            }
        }
    }

    showPauseMenu() {
        if (this.msgOverlay) {
            this.msgOverlay.style.display = 'flex';
            this.msgOverlay.classList.add('visible', 'paused');
        }
        if (this.pauseButtons) {
            this.pauseButtons.style.display = 'flex';
            this.pauseButtons.style.marginBottom = '20px';
            if (this.showSettingsBtn) {
                this.showSettingsBtn.textContent = 'Settings';
                this.showSettingsBtn.classList.remove('icon-only');
                this.showSettingsBtn.style.display = 'block';
                this.showSettingsBtn.style.visibility = 'visible';
                this.showSettingsBtn.style.opacity = '1';
                this.pauseButtons.appendChild(this.showSettingsBtn);
            }
            if (this.nextBgmBtn) this.nextBgmBtn.style.display = 'none';
            if (this.nextStageBtn) this.nextStageBtn.style.display = 'none';
        }
        if (this.msgTitle) this.msgTitle.textContent = 'PAUSED';
        if (this.msgText) this.msgText.textContent = 'TAP TO RESUME';
        if (this.msgSettingsBtn) this.msgSettingsBtn.style.display = 'none';
    }

    hidePauseMenu() {
        if (this.msgOverlay) {
            this.msgOverlay.classList.remove('visible', 'paused');
        }
        if (this.pauseButtons) {
            this.pauseButtons.style.display = 'none';
        }
        if (this.settingsOverlay) {
            this.settingsOverlay.style.display = 'none';
        }
        setTimeout(() => { 
            if (this.game.state === 'PLAYING' && this.msgOverlay) 
                this.msgOverlay.style.display = 'none'; 
        }, 400);
    }

    showReadyState() {
        if (this.msgOverlay) this.msgOverlay.classList.remove('visible');
        if (this.pauseButtons) this.pauseButtons.style.display = 'none';
        if (this.settingsOverlay) this.settingsOverlay.style.display = 'none';
        if (this.msgSettingsBtn) this.msgSettingsBtn.style.display = 'none';
        setTimeout(() => { 
            if (this.game.state === 'START' && this.game.launchTimer > 0 && this.msgOverlay) 
                this.msgOverlay.style.display = 'none'; 
        }, 400);
    }

    hideAllOverlays() {
        if (this.msgOverlay) this.msgOverlay.style.display = 'none';
        if (this.settingsOverlay) this.settingsOverlay.style.display = 'none';
        if (this.pauseButtons) this.pauseButtons.style.display = 'none';
    }

    showMessageOverlay() {
        if (this.msgOverlay) this.msgOverlay.style.display = 'flex';
    }

    playSecretTapEffect() {
        if (this.settingsTitle) {
            this.settingsTitle.style.transform = 'scale(1.1)';
            setTimeout(() => this.settingsTitle.style.transform = 'scale(1)', 50);
        }
    }

    showUnlockEffect(type) {
        if (!this.settingsTitle) return;
        const className = type === 1 ? 'secret-tap-unlocked-1' : 'secret-tap-unlocked-2';
        const duration = type === 1 ? 1500 : 2000;
        
        this.settingsTitle.classList.add(className);
        
        // Debug unlock support
        this.game.debugUnlock = true;
        this.loadSettings();

        setTimeout(() => this.settingsTitle.classList.remove(className), duration);
    }

    showSettings() {
        if (this.settingsOverlay) this.settingsOverlay.style.display = 'flex';
        
        // Lock BGM selection during the finale (Stage 100)
        if (this.bgmSelector) {
            const isStage100 = this.game.gameState && this.game.gameState.level === 100;
            this.bgmSelector.disabled = isStage100;
            this.bgmSelector.style.opacity = isStage100 ? '0.5' : '1';
        }
    }

    hideSettings() {
        if (this.settingsOverlay) this.settingsOverlay.style.display = 'none';
        this.game.secretTapCount = 0;
    }

    setMsgSettingsBtnVisibility(visible) {
        if (this.msgSettingsBtn) this.msgSettingsBtn.style.display = visible ? 'flex' : 'none';
    }

    showUpdateNotification(onUpdate) {
        if (this.updateToast && this.updateBtn) {
            this.updateToast.classList.add('visible');
            this.updateBtn.onclick = () => {
                this.updateToast.classList.remove('visible');
                onUpdate();
            };
        }
    }
}
