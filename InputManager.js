/**
 * InputManager: ユーザー入力（キーボード、マウス、タッチ）および
 * DOMイベントリスナーの管理を専門に行うクラス
 */
export class InputManager {
    constructor(game) {
        this.game = game;
    }

    isUIElement(target) {
        if (!target) return false;
        return target.closest('#settings-overlay') || 
               target.closest('#msg-settings-btn') || 
               target.closest('#show-settings-btn') ||
               target.closest('#next-bgm-btn') ||
               target.closest('#pause-btn') ||
               target.closest('#settings-title') ||
               target.closest('.settings-modal') ||
               target.closest('#pause-buttons');
    }

    setupListeners() {
        const relaunchBalls = () => {
            if (this.game.state === 'PLAYING') {
                this.game.entities.balls.forEach(b => {
                    if (b.isStuck) {
                        b.isStuck = false;
                        // Give it a slightly varied upward velocity if it was stuck
                        const angle = -Math.PI / 2 + (Math.random() * 0.4 - 0.2);
                        b.vx = b.speed * Math.cos(angle);
                        b.vy = b.speed * Math.sin(angle);
                    }
                });
            }
        };

        window.addEventListener('keydown', (e) => {
            // 1. Modifier key check: Ignore game logic if any modifier is pressed
            // This allows browser shortcuts (Ctrl+R, F12, etc.) to pass through without interference
            if (e.ctrlKey || e.shiftKey || e.altKey || e.metaKey) {
                return;
            }

            // 2. Debug Shortcuts (N: Skip Level, Q: Full Unlock)
            if (e.code === 'KeyN') {
                if (this.game.state === 'START' || this.game.state === 'PLAYING') {
                    console.log("[DeiScore] Debug Skip Level (N)");
                    this.game.jumpToLevel(this.game.gameState.level + 1);
                    return;
                }
            }

            if (e.code === 'KeyQ') {
                this.game.debugUnlock = true; // Add this line
                this.game.gameState.isSuperEasyUnlocked = true;
                this.game.gameState.isBgmSelectionUnlocked = true;
                this.game.gameState.isStageSelectUnlocked = true;
                this.game.gameState.save();
                this.game.ui.refreshDifficultyOptions();
                this.game.ui.loadSettings(); 
                this.game.ui.showUnlockNotification('✨ 全特典を強制解放しました！ ✨');
                this.game.ui.playSecretTapEffect();
                return;
            }

            // 3. Clear State Shortcuts (Requirement 2)
            if (this.game.state === 'CLEAR' && this.game.inputLockTimer <= 0) {
                if (e.code === 'ArrowRight') {
                    // Next Stage with BGM Change
                    console.log("[DeiScore] Shortcut: Next Stage with BGM change");
                    this.game.playNextBgm();
                    this.game.isWaitingForRestart = false;
                    this.game.restartTaps = 0;
                    this.game.startLevel();
                    this.game.start();
                    return;
                } else if (e.code === 'ArrowLeft') {
                    // Next Stage without BGM Change
                    console.log("[DeiScore] Shortcut: Next Stage (Keep BGM)");
                    this.game.isWaitingForRestart = false;
                    this.game.restartTaps = 0;
                    this.game.startLevel();
                    this.game.start();
                    return;
                }
            }

            // 4. Playing State Controls
            if (this.game.state === 'PLAYING') {
                if (e.code === 'Escape' || e.code === 'Space') {
                    // Extra security for Space in settings
                    if (e.code === 'Space' && (this.game.ui.settingsOverlay && this.game.ui.settingsOverlay.style.display !== 'none')) return;
                    e.preventDefault();
                    this.game.togglePause();
                } else if (e.code === 'ArrowLeft') {
                    if (this.game.entities.paddle) this.game.entities.paddle.moveLeft = true;
                } else if (e.code === 'ArrowRight') {
                    if (this.game.entities.paddle) this.game.entities.paddle.moveRight = true;
                }
                return;
            }

            // 5. Start / Paused / GameOver - Interaction
            if (this.game.state === 'START' || this.game.state === 'PAUSED' || this.game.state === 'GAMEOVER') {
                // For START and PAUSED, Enter/Space/Escape can act as interaction
                if (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape') {
                    // Extra security for Space in settings
                    if (e.code === 'Space' && (this.game.ui.settingsOverlay && this.game.ui.settingsOverlay.style.display !== 'none')) return;
                    
                    e.preventDefault();
                    
                    if (this.game.state === 'PAUSED') {
                        this.game.togglePause();
                    } else if (this.game.state === 'START') {
                        if (!this.game.sounds.bgmStarted) {
                            this.game.sounds.startBgm();
                            this.game.sounds.setBgm(this.game.ui.bgmSelector ? this.game.ui.bgmSelector.value : 'random');
                        }
                        if (this.game.ui.msgSettingsBtn) this.game.ui.msgSettingsBtn.style.display = 'none';
                        this.game.start();
                    } else if (this.game.state === 'GAMEOVER') {
                        if (this.game.clearTimer > 0) return;
                        this.game.init();
                    }
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            if (this.game.entities.paddle) {
                if (e.code === 'ArrowLeft') this.game.entities.paddle.moveLeft = false;
                if (e.code === 'ArrowRight') this.game.entities.paddle.moveRight = false;
            }
        });

        if (this.game.ui.pauseBtn) {
            this.game.ui.pauseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.game.sounds.init();
                this.game.sounds.startBgm();
                this.game.togglePause();
            });
        }

        if (this.game.ui.showSettingsBtn) {
            const handleSettingsOnly = (e) => {
                const isNextStageButton = this.game.ui.showSettingsBtn.textContent.includes('Next Stage');
                if (!isNextStageButton) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.game.ui.settingsOverlay.style.display = 'flex';
                }
            };
            this.game.ui.showSettingsBtn.addEventListener('click', handleSettingsOnly);
            this.game.ui.showSettingsBtn.addEventListener('touchstart', handleSettingsOnly, { passive: false });
        }

        if (this.game.ui.closeSettingsBtn) {
            this.game.ui.closeSettingsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.game.ui.hideSettings();
                
                // If a stage was selected in the background, trigger the typical start flow
                if (this.game.pendingStageStart) {
                    this.game.pendingStageStart = false;
                    this.game.ui.hideAllOverlays();
                    this.game.start();
                }
            });
        }

        if (this.game.ui.settingsTitle) {
            const handleSecretTap = (e) => {
                const now = Date.now();
                if (now - this.game.lastSecretTapTime < 100) return;
                this.game.lastSecretTapTime = now;

                e.preventDefault();
                e.stopPropagation();
                this.game.secretTapCount++;
                
                console.log(`Secret Tap Count: ${this.game.secretTapCount}`);

                this.game.ui.playSecretTapEffect();
                
                // 10回タップ：超簡単アンロック
                if (this.game.secretTapCount >= 10 && !this.game.gameState.isSuperEasyUnlocked) {
                    this.game.gameState.isSuperEasyUnlocked = true;
                    this.game.gameState.save();
                    this.game.ui.refreshDifficultyOptions();
                    
                    // ★修正：新しい専用メソッドを呼び出す
                    this.game.ui.showUnlockNotification('✨超簡単をアンロックしました！✨');
                    
                    this.game.ui.settingsTitle.style.color = '#FFB7B2';
                    setTimeout(() => this.game.ui.settingsTitle.style.color = '#1A1A2E', 1500);
                }
                
                // 30回タップ：BGM＆ステージセレクト＆テーマアンロック（一時解禁含む）
                if (this.game.secretTapCount === 30) {
                    // すでにアンロック済みでも、このセッションでは強制的にフラグを立ててUIを更新する
                    this.game.debugUnlock = true;
                    this.game.ui.loadSettings();
                    
                    let newlyUnlocked = false;
                    if (!this.game.gameState.isBgmSelectionUnlocked) {
                        this.game.gameState.isBgmSelectionUnlocked = true;
                        newlyUnlocked = true;
                    }
                    if (!this.game.gameState.isStageSelectUnlocked) {
                        this.game.gameState.isStageSelectUnlocked = true;
                        newlyUnlocked = true;
                        this.game.ui.showUnlockNotification('🛠️ ステージセレクトをアンロックしました！ 🛠️');
                    }
                    
                    if (newlyUnlocked) {
                        this.game.gameState.save();
                    }
                    
                    // 成功のエフェクトは毎回必ず出す
                    this.game.ui.settingsTitle.style.color = '#BDE0FE';
                    setTimeout(() => this.game.ui.settingsTitle.style.color = '#1A1A2E', 2000);
                }
            };

            this.game.ui.settingsTitle.addEventListener('click', handleSecretTap);
            this.game.ui.settingsTitle.addEventListener('touchstart', handleSecretTap, { passive: false });
        }

        if (this.game.ui.msgSettingsBtn) {
            const openSettings = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.game.ui.showSettings();
            };
            this.game.ui.msgSettingsBtn.addEventListener('click', openSettings);
            this.game.ui.msgSettingsBtn.addEventListener('touchstart', openSettings, { passive: false });
        }

        if (this.game.ui.bgmVolumeSlider) {
            this.game.ui.bgmVolumeSlider.addEventListener('input', (e) => {
                if (this.game.sounds.bgmAudio) this.game.sounds.bgmAudio.volume = parseFloat(e.target.value);
            });
        }

        if (this.game.ui.seVolumeSlider) {
            this.game.ui.seVolumeSlider.addEventListener('input', (e) => {
                // SE Volume implementation if needed
            });
        }

        this.game.renderer.canvas.addEventListener('mousemove', (e) => {
            if (this.game.controlMode === 'direct' && this.game.entities.paddle) {
                const rect = this.game.renderer.canvas.getBoundingClientRect();
                const scaleX = rect.width / this.game.renderer.canvas.width;
                const mouseX = (e.clientX - rect.left) / scaleX;
                this.game.entities.paddle.updatePosition(mouseX);
                if (this.game.state === 'START' && this.game.entities.balls.length > 0) {
                    this.game.entities.balls[0].x = this.game.entities.paddle.x + this.game.entities.paddle.width / 2;
                }
            }
        });

        const updateZoneInput = (e, isPressed) => {
            if (this.game.controlMode === 'zone' && this.game.entities.paddle) {
                const rect = this.game.renderer.canvas.getBoundingClientRect();
                const scaleX = rect.width / this.game.renderer.canvas.width;
                const touchX = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
                const logicalX = touchX / scaleX;
                
                if (logicalX < this.game.renderer.canvas.width / 2) {
                    this.game.entities.paddle.moveLeft = isPressed;
                    this.game.entities.paddle.moveRight = false;
                } else {
                    this.game.entities.paddle.moveRight = isPressed;
                    this.game.entities.paddle.moveLeft = false;
                }
            }
        };

        window.addEventListener('mousedown', (e) => this.handleOverlayInteraction(e));
        window.addEventListener('touchstart', (e) => this.handleOverlayInteraction(e), { passive: false });
        if (this.game.ui.msgOverlay) {
            this.game.ui.msgOverlay.addEventListener('mousedown', (e) => this.handleOverlayInteraction(e));
        }

        const handleTouch = (e) => {
            if (this.isUIElement(e.target)) return;
            
            // BGMが未開始の場合のみ、オーディオのロックを解除する
            if (!this.game.sounds.bgmStarted) {
                this.game.sounds.init();
                this.game.sounds.startBgm();
            }

            if (this.game.state === 'START') {
                 this.handleOverlayInteraction(e);
            }

            if (this.game.controlMode === 'direct' && this.game.entities.paddle) {
                const rect = this.game.renderer.canvas.getBoundingClientRect();
                const scaleX = rect.width / this.game.renderer.canvas.width;
                const touch = e.touches[0];
                const mouseX = (touch.clientX - rect.left) / scaleX;
                this.game.entities.paddle.updatePosition(mouseX);
            } else {
                updateZoneInput(e, true);
            }
            
            if (this.game.state === 'PLAYING') {
                relaunchBalls();
            }
            e.preventDefault();
        };

        this.game.renderer.canvas.addEventListener('touchstart', handleTouch, { passive: false });
        this.game.renderer.canvas.addEventListener('touchmove', handleTouch, { passive: false });
        this.game.renderer.canvas.addEventListener('touchend', (e) => {
            if (this.game.entities.paddle) {
                this.game.entities.paddle.moveLeft = false;
                this.game.entities.paddle.moveRight = false;
            }
        });

        this.game.renderer.canvas.addEventListener('mousedown', (e) => {
            if (this.game.controlMode === 'zone') updateZoneInput(e, true);
        });
        window.addEventListener('mouseup', () => {
            if (this.game.entities.paddle) {
                this.game.entities.paddle.moveLeft = false;
                this.game.entities.paddle.moveRight = false;
            }
        });

        if (this.game.ui.bgmSelector) {
            this.game.ui.bgmSelector.addEventListener('change', (e) => {
                this.game.sounds.init();
                this.game.sounds.consecutiveErrors = 0; 
                this.game.sounds.bgmStarted = true;
                this.game.sounds.setBgm(e.target.value);
                this.game.sounds.startBgm();
                this.game.ui.saveSettings();
            });
        }

        if (this.game.ui.bgmVolumeSlider) {
            this.game.ui.bgmVolumeSlider.addEventListener('input', () => {
                if (this.game.sounds.bgmAudio) this.game.sounds.bgmAudio.volume = parseFloat(this.game.ui.bgmVolumeSlider.value);
                this.game.ui.saveSettings();
            });
        }
        if (this.game.ui.seVolumeSlider) {
            this.game.ui.seVolumeSlider.addEventListener('input', () => {
                this.game.ui.saveSettings();
            });
        }
        if (this.game.ui.paddleSpeedSlider) {
            this.game.ui.paddleSpeedSlider.addEventListener('input', () => {
                this.game.paddleSpeedSetting = parseInt(this.game.ui.paddleSpeedSlider.value);
                if (this.game.entities.paddle) this.game.entities.paddle.speed = this.game.paddleSpeedSetting;
                this.game.ui.saveSettings();
            });
        }
        if (this.game.ui.difficultySelector) {
            this.game.ui.difficultySelector.addEventListener('change', () => {
                const oldDiff = this.game.gameState.difficulty;
                const newDiff = this.game.ui.difficultySelector.value;
                this.game.gameState.difficulty = newDiff;
                this.game.gameState.save();
                this.game.ui.saveSettings();
                this.game.ui.updateUI();

                // 難易度変更を即座にボールの速度に反映する
                if (this.game.state === 'PLAYING' || this.game.state === 'PAUSED') {
                    const multipliers = this.game.difficultyMultipliers;
                    const newSpeedMult = multipliers[newDiff].speed;
                    
                    this.game.entities.balls.forEach(ball => {
                        // 現在の向きを維持しつつ、新しい速度を適用
                        const angle = Math.atan2(ball.vy, ball.vx);
                        const newTotalSpeed = this.game.stageManager.getStageSpeed() * (this.game.speedMultiplier || 1.0);
                        ball.speed = newTotalSpeed;
                        ball.vx = ball.speed * Math.cos(angle);
                        ball.vy = ball.speed * Math.sin(angle);
                    });
                    console.log(`[InputManager] Difficulty changed to ${newDiff}. Speed updated for ${this.game.entities.balls.length} balls.`);
                }
            });
        }
        if (this.game.ui.stageSelector) {
            this.game.ui.stageSelector.addEventListener('change', () => {
                const newLevel = parseInt(this.game.ui.stageSelector.value);
                if (newLevel >= 1 && newLevel <= 100) {
                    console.log(`[DeiScore] Stage Selected: ${newLevel} (Background Prep)`);
                    
                    // Background preparation instead of immediate jump
                    this.game.entities.bricks = [];
                    this.game.gameState.level = newLevel;
                    this.game.gameState.save();
                    this.game.startLevel(true); // Prep blocks and ball positioning
                    this.game.state = 'START';
                    this.game.pendingStageStart = true; // Trigger start on settings close
                    
                    this.game.ui.updateUI();
                }
            });
        }
        if (this.game.ui.controlModeSelector) {
            this.game.ui.controlModeSelector.addEventListener('change', () => {
                this.game.controlMode = this.game.ui.controlModeSelector.value;
                this.game.ui.saveSettings();
            });
        }
        if (this.game.ui.themeSelector) {
            this.game.ui.themeSelector.addEventListener('change', (e) => {
                const newTheme = e.target.value;
                this.game.themeManager.currentThemeName = newTheme;
                document.body.setAttribute('data-theme', newTheme);
                
                // Immediate color refresh for existing blocks
                this.game.pastelColors = this.game.themeManager.getColor('pastelColors');
                if (this.game.entities && this.game.entities.bricks) {
                    this.game.entities.bricks.forEach(b => {
                        if (b.type >= 1 && b.type <= 5) {
                            // Assign a new random color from the new theme's palette
                            b.color = this.game.pastelColors[Math.floor(Math.random() * this.game.pastelColors.length)];
                        }
                    });
                }
                
                this.game.ui.saveSettings();
            });
        }

        // Note: Next BGM and Next Stage are handled in handleOverlayInteraction via closest targets
    }

    setupNextStageListener() {
        // Obsolete: Handled in handleOverlayInteraction
    }

    handleOverlayInteraction(e) {
        if (this.game.inputLockTimer > 0) return;
        
        // Priority 1: Specific Buttons
        const nextStageBtn = e.target.closest('#next-stage-btn');
        if (nextStageBtn) {
            e.preventDefault();
            e.stopPropagation();

            if (nextStageBtn.textContent === 'Play Again') {
                console.log("[DeiScore] Play Again Clicked - Restarting Game");
                this.game.init();
                return;
            }

            console.log("[DeiScore] Next Stage Clicked");
            this.game.isWaitingForRestart = false;
            this.game.restartTaps = 0;
            this.game.startLevel(); // Keeps current BGM
            this.game.start();
            return;
        }

        const nextBgmBtn = e.target.closest('#next-bgm-btn');
        if (nextBgmBtn && !this.game.hasUsedNextBgmInStage) {
            e.preventDefault();
            e.stopPropagation();
            console.log("[DeiScore] Next BGM Clicked");
            this.game.hasUsedNextBgmInStage = true;
            if (this.game.ui.nextBgmBtn) {
                this.game.ui.nextBgmBtn.disabled = true;
                this.game.ui.nextBgmBtn.style.opacity = '0.5';
            }
            this.game.sounds.init();
            this.game.playNextBgm(); // CHANGES BGM
            if (this.game.state === 'CLEAR') {
                this.game.isWaitingForRestart = false;
                this.game.restartTaps = 0;
                this.game.startLevel();
                this.game.start();
            }
            return;
        }

        if (this.game.ui.showSettingsBtn && e.target.closest('#show-settings-btn')) {
            // True Ending Unlock Bonus: Unlock all features if at Stage 100 Clear
            if (this.game.gameState.level >= 100 && this.game.state === 'CLEAR') {
                if (!this.game.gameState.isSuperEasyUnlocked || !this.game.gameState.isBgmSelectionUnlocked) {
                    this.game.gameState.isSuperEasyUnlocked = true;
                    this.game.gameState.isBgmSelectionUnlocked = true;
                    this.game.gameState.isStageSelectUnlocked = true;
                    this.game.gameState.save();
                    
                    this.game.ui.refreshDifficultyOptions();
                    this.game.sounds.playLevelClear(); // Celebration sound
                    this.game.ui.showUnlockNotification('✨ 超簡単・ステージ選択・BGM選択 を解放しました！ ✨');
                }
            }
            
            this.game.ui.showSettings();
            e.stopPropagation();
            return;
        }

        if (this.isUIElement(e.target)) return;
        
        const isSettingsOpen = this.game.ui.settingsOverlay && this.game.ui.settingsOverlay.style.display !== 'none';
        if (isSettingsOpen) {
             if (e.target.id !== 'close-settings-btn' && !e.target.id.includes('settings')) return;
        }

        this.game.sounds.init();

        if (this.game.ui.msgSettingsBtn && e.target.closest('#msg-settings-btn')) {
            // True Ending Unlock Bonus: Unlock all features if at Stage 100 Clear
            if (this.game.gameState.level >= 100 && this.game.state === 'CLEAR') {
                if (!this.game.gameState.isSuperEasyUnlocked || !this.game.gameState.isBgmSelectionUnlocked) {
                    this.game.gameState.isSuperEasyUnlocked = true;
                    this.game.gameState.isBgmSelectionUnlocked = true;
                    this.game.gameState.isStageSelectUnlocked = true;
                    this.game.gameState.save();
                    
                    this.game.ui.refreshDifficultyOptions();
                    this.game.sounds.playLevelClear(); // Celebration sound
                    this.game.ui.showUnlockNotification('✨ 超簡単・ステージ選択・BGM選択 を解放しました！ ✨');
                }
            }
            
            e.preventDefault();
            e.stopPropagation();
            this.game.ui.showSettings();
            return;
        }

        if (this.game.state === 'PAUSED') {
            this.game.togglePause();
        } else if (this.game.state === 'START') {
            if (!this.game.sounds.bgmStarted) {
                this.game.sounds.startBgm();
                this.game.sounds.setBgm(this.game.ui.bgmSelector ? this.game.ui.bgmSelector.value : 'random');
            }
            this.game.ui.setMsgSettingsBtnVisibility(false);
            this.game.start();
        } else if (this.game.state === 'GAMEOVER') {
            if (this.game.clearTimer > 0) return; 
            this.game.init(); // 1タップで最初からリスタート
        } else if (this.game.state === 'CLEAR') {
            // 背景タップは無視し、Next Stage / Next BGM ボタンのクリックを強制する
        }
    }
}
