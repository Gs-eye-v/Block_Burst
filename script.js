import { CLASSIC_PLAYLIST } from './playlist.js';
import { BGM_INFO } from './episodes.js';
import { shadeColor, getSeededRandom } from './utils.js';
import { SoundSystem } from './audio.js';
import { Paddle, Ball, Brick, Item, Particle } from './entities.js';
import { StageManager } from './StageManager.js';
import { InputManager } from './InputManager.js';
import { UIManager } from './UIManager.js';
import { CollisionManager } from './CollisionManager.js';
import { Renderer } from './Renderer.js';
import { GameState } from './GameState.js';
import { ThemeManager } from './ThemeManager.js';
import { EventManager } from './EventManager.js';
import { EntityManager } from './EntityManager.js';

/**
 * DeiScore: Premium Breakout Game (Ultimate Final Version)
 * Developed with Vanilla JS & Canvas API
 */

// CanvasRenderingContext2D.roundRect Polyfill (Legacy Browser Support)
if (typeof CanvasRenderingContext2D.prototype.roundRect !== 'function') {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        this.beginPath();
        this.moveTo(x + r, y);
        this.arcTo(x + w, y, x + w, y + h, r);
        this.arcTo(x + w, y + h, x, y + h, r);
        this.arcTo(x, y + h, x, y, r);
        this.arcTo(x, y, x + w, y, r);
        this.closePath();
        return this;
    };
}


const ITEM_SPAWN_BASE_TIME = 900;
const ITEM_RUSH_SPAWN_TIME = 300;
const ITEM_RUSH_BRICK_THRESHOLD = 5;
const ITEM_RUSH_BALL_THRESHOLD = 3;
const CLEAR_WAIT_DURATION = 60;
const LAUNCH_WAIT_DURATION = 60;
const INPUT_LOCK_AUTO_DURATION = 2.0;
const NOTICE_DEFAULT_DURATION = 120;
const STAGE_CLEAR_DELAY = 120;
const MISS_RESTART_DELAY = 2000;

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.events = new EventManager();
        this.entities = new EntityManager(this);
        this.renderer = new Renderer(this);
        this.themeManager = new ThemeManager(this);

        this.ui = new UIManager(this);

        this.sounds = new SoundSystem(this);
        
        this.pastelColors = this.themeManager.getColor('pastelColors');

        this.gameState = new GameState();
        
        this.pierceCharges = 0;
        this.stickyTimer = 0;
        this.slowTimer = 0;

        this.carryBallCount = 1;
        this.carryPaddleWidth = 120;
        this.speedMultiplier = 1.0;
        this.clearTimer = 0;
        this.renderer.initBubbles();

        this.bgmText = "";
        this.bgmTextTimer = 0;

        this.difficulty = this.gameState.difficulty;
        this.controlMode = 'zone';
        this.paddleSpeedSetting = 13;
        this.hasUsedNextBgmInStage = false;
        this.inputLockTimer = 0;
        this.launchTimer = 0;
        this.clearWaitTimer = 0;
        this.secretTapCount = 0;
        this.lastSecretTapTime = 0;
        this.pendingStageStart = false; // Flag to handle natural start flow after stage selection

        this.difficultyMultipliers = {
            superEasy: { speed: 0.5, score: 0.2, drop: 2.0 },
            easy: { speed: 0.5, score: 0.7, drop: 1.5 },
            normal: { speed: 0.8, score: 1.0, drop: 1.0 },
            hard: { speed: 1.2, score: 2.0, drop: 0.7 }
        };

        this.ui.refreshDifficultyOptions();
        this.ui.loadSettings();

        this.stageManager = new StageManager(this);
        this.init();
        this.inputManager = new InputManager(this);
        this.physics = new CollisionManager(this);
        this.inputManager.setupListeners();
        this.renderer.resize();

        // Initial set bgm state to random
        if (this.ui.bgmSelector) {
            // 100面の場合は init() 内でセットされた専用BGMを維持するため上書きしない
            if (this.gameState.level !== 100) {
                this.sounds.setBgm(this.ui.bgmSelector.value);
            }
            this.ui.bgmSelector.addEventListener('change', (e) => {
                this.sounds.setBgm(e.target.value);
            });
        }

        const themeSelector = document.getElementById('theme-selector');
        if (themeSelector) {
            themeSelector.addEventListener('change', (e) => {
                const newTheme = e.target.value;
                this.themeManager.setTheme(newTheme);
                if (this.pastelColors) {
                    this.pastelColors = this.themeManager.getColor('pastelColors');
                    this.entities.bricks.forEach(brick => brick.updateAppearance(this));
                }
            });
        }

        window.addEventListener('resize', () => this.renderer.resize());

        // Lifecycle management: Handled via BGM pause/play and auto-pause
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (this.sounds) this.sounds.pauseBgm();
                if (this.state === 'PLAYING') {
                    this.togglePause();
                }
            }
        });

        window.addEventListener('blur', () => {
            if (this.state === 'PLAYING') {
                this.togglePause();
            }
        });

        this.lastTime = performance.now();
        this.loop();
    }



    init() {
        // Trigger background caching for BGM presets (first 10 tracks)
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            const presetBgm = [
                './music/174-Mozart-Symphony-No40-1st.mp3',
                './music/Beethoven-Symphony-No5-1st.mp3',
                './music/Brahms-HungarianDances-No5.mp3',
                './music/Chopin-Fantaisie-Impromptu-2019-AR.mp3',
                './music/Chopin-Nocturn-No2-2013.mp3',
                './music/Chopin-Poronase-No6-Heroic-2019-AR.mp3',
                './music/Chopin-Revolutional.mp3',
                './music/Debussy-Arabesque-No1-2014.mp3',
                './music/Debussy-clairdelune.mp3',
                './music/dovorak-Symphony-No9-4th.mp3',
                './music/The_Last_eye_Departure.mp3'
            ];
            
            navigator.serviceWorker.controller.postMessage({
                type: 'CACHE_BGM_PRESET',
                urls: presetBgm
            });
        }

        // Only reset session-specific state, not the persistent level
        this.gameState.score = 0;
        this.gameState.lives = 3;
        
        // Restore carry states
        const gs = this.gameState;
        if (gs.carryBallCount > 1) {
            for (let i = 1; i < gs.carryBallCount; i++) {
                // Use canvas center since paddle might not be initialized yet
                this.entities.addBall(new Ball(this, this.canvas.width / 2, this.canvas.height - 100, 0, 0));
            }
        }
        if (gs.carryPierceTimer > 0) {
            this.entities.balls.forEach(b => {
                b.isPiercing = true;
                b.pierceTimer = gs.carryPierceTimer;
            });
        }
        // Paddle state is already partially restored by its constructor using gs.carryExpandStage/Timer
        
        this.state = 'START';
        
        // Restore carry state from persistent storage
        this.carryBallCount = this.gameState.carryBallCount;
        this.carryPaddleWidth = this.gameState.carryPaddleWidth;
        this.carryPierceTimer = this.gameState.carryPierceTimer;
        
        if (this.events) {
            this.events.emit('SCORE_UPDATE', { val: this.gameState.score, best: this.gameState.bestScore });
            this.events.emit('LIVES_UPDATE', this.gameState.lives);
            this.events.emit('STAGE_UPDATE', this.gameState.level);
            this.events.emit('OVERLAY_CLEAR_ALL');
            this.events.emit('OVERLAY_SHOW_MESSAGE');
        }

        this.pierceCharges = 0;
        this.slowTimer = 0;
        this.gameState.carryPierceTimer = 0;
        if (this.entities.paddle) {
            this.entities.paddle.expandStage = 0;
            this.entities.paddle.expandTimer = 0;
            this.entities.paddle.isExpanded = false;
        }
        this.entities.bricks = [];
        this.gameState.lives = 3;
        this.startLevel();
    }

    startLevel(keepBgm = false) {
        if (!keepBgm) this.ui.showMessageOverlay();
        this.itemSpawnTimer = 0;
        
        // Auto-save on each stage start
        this.gameState.save();

        // Reset item timers (Do not carry over active powerups except size/count and superEasy pierce)
            this.slowTimer = 0;
            this.speedMultiplier = 1.0;
            this.gameState.carryPierceTimer = this.gameState.carryPierceTimer || 0; // Carry over if set

        // Setup initial or cross-level objects
        if (!this.entities.paddle) {
            this.entities.paddle = new Paddle(this, this.renderer.canvas.width, this.renderer.canvas.height);
        }

        this.entities.clear();
        this.renderer.initBubbles();

        this.hasUsedNextBgmInStage = false;
        this.clearSoundPlayed = false;

        // Ensure Stage 100 ALWAYS plays the finale music
        const isLevel100 = this.gameState.level === 100;
        if (isLevel100) {
            keepBgm = false; // Force re-initialization of BGM for the finale
            this.sounds.setBgm('The_Last_eye_Departure.mp3');
            this.sounds.startBgm();
        }

        if (this.ui.nextBgmBtn) {
            this.ui.nextBgmBtn.disabled = isLevel100;
            this.ui.nextBgmBtn.style.opacity = isLevel100 ? '0.5' : '1';
            this.ui.nextBgmBtn.style.display = 'none'; // Hidden by default, shown in levelClear
        }

        if (this.entities.bricks.length === 0) {
            this.stageManager.createLevel();
        }
        
        // Detect if this is a stage transition (coming from CLEAR state)
        const isStageTransition = (this.state === 'CLEAR');
        this.resetBall(isStageTransition, keepBgm);
        this.events.emit('UI_REFRESH', {
            score: this.gameState.score,
            lives: this.gameState.lives,
            level: this.gameState.level,
            bestScore: this.gameState.bestScore
        });
    }

    resetBall(isStageTransition = false, keepBgm = false) {
        if (!keepBgm) this.events.emit('OVERLAY_CLEAR');

        // Reset items ONLY IF NOT a stage transition (i.e., a Miss)
        if (!isStageTransition) {
            this.entities.clear();
            this.pierceCharges = 0;
            this.slowTimer = 0;
            if (this.entities.paddle) {
                this.entities.paddle.resetSize();
            }
        }

        this.entities.balls = [];
        
        const speed = this.stageManager.getStageSpeed() * this.speedMultiplier;

        for (let i = 0; i < this.carryBallCount; i++) {
            const b = new Ball(this, this.entities.paddle.x + this.entities.paddle.width / 2, this.entities.paddle.y - 12, speed);
            // Apply carried states
            b.pierceTimer = this.gameState.carryPierceTimer;
            b.pierceStacks = this.gameState.carryPierceStacks;
            if (b.pierceTimer > 0) b.isPiercing = true;
            
            this.entities.balls.push(b);
        }
        
        // Restore explosion charging ball if needed
        if (this.gameState.carryExplosionCharge) {
            const b = new Ball(this, this.entities.paddle.x + this.entities.paddle.width / 2, this.entities.paddle.y - 12, speed);
            b.isCharging = true;
            b.chargeTimer = this.gameState.carryExplosionTimer;
            this.entities.balls.push(b);
        }
        
        // Reset carry values only if it's NOT a stage transition (meaning it was a miss/reset)
        if (!isStageTransition) {
            this.gameState.carryPierceTimer = 0;
            this.gameState.carryPierceStacks = 0;
            this.gameState.carryExplosionCharge = false;
        }

        
        // Reset carry timer after applying to all balls
        if (this.gameState.difficulty === 'superEasy') {
            this.gameState.carryPierceTimer = 0;
        }

        if (!keepBgm) {
            this.events.emit('LEVEL_START', {
                level: this.gameState.level,
                restartTaps: this.restartTaps,
                lives: this.gameState.lives
            });
        }
        this.events.emit('UI_REFRESH', {
            score: this.gameState.score,
            lives: this.gameState.lives,
            level: this.gameState.level,
            bestScore: this.gameState.bestScore
        });

        // Auto-Save Current Stage
        this.gameState.save();

        this.state = keepBgm ? 'PLAYING' : 'START';
    }

    lockInput(duration) {
        this.inputLockTimer = duration / 1000;
    }
    
    /**
     * 強制的に指定したステージへ切り替える（既存バグの修正用）
     */
    jumpToLevel(newLevel, keepBgm = false) {
        this.entities.bricks = []; // 既存ブロックを完全にクリア
        this.gameState.level = newLevel;
        this.gameState.save();
        this.startLevel(keepBgm);
        this.events.emit('UI_REFRESH', {
            score: this.gameState.score,
            lives: this.gameState.lives,
            level: this.gameState.level,
            bestScore: this.gameState.bestScore
        });

        if (keepBgm) {
            // Close settings and msg overlays for immediate play
            this.ui.hideAllOverlays();
            
            // Ensure BGM is resuming if it was paused or not yet started
            if (this.sounds.bgmAudio) {
                if (!this.sounds.bgmStarted) {
                    this.sounds.startBgm();
                } else if (this.sounds.bgmAudio.paused) {
                    this.sounds.bgmAudio.play().catch(e => {});
                }
            }
            
            // Immediately launch balls
            this.entities.balls.forEach(b => b.launch());
            this.state = 'PLAYING';
        }
    }





    formatBgmName(name) {
        if (!name) return "";
        // Remove brackets and Japanese brackets
        let clean = name.replace(/[「」\[\]]/g, '');
        // Standardize format: Composer: Title (case where it used to be [Composer] Title)
        // If it was "[Artist] Song", after removing brackets it's "Artist Song"
        // Let's be smarter: replace the space after the first word group if it looks like a composer
        // Actually, the requirement says "${Composer}: ${Title}". 
        // In CLASSIC_PLAYLIST, it's "[Composer] Title".
        // Let's use regex to catch the part inside brackets first.
        const match = name.match(/^\[(.*?)\]\s*(.*)$/);
        if (match) {
            return `${match[1]}: ${match[2]}`.replace(/[「」]/g, '');
        }
        return clean.replace(/[:：]/, ': ');
    }

    togglePause() {
        if (this.state === 'PLAYING') {
            // ポーズ処理
            this.state = 'PAUSED';
            this.events.emit('GAME_PAUSE');
            
        } else if (this.state === 'PAUSED') {
            // 再開処理
            this.state = 'PLAYING';
            this.events.emit('GAME_RESUME');
        }
    }

    syncCarryState() {

        const normalBalls = this.entities.balls.filter(b => !b.isCharging && !b.isExploding);
        if (normalBalls.length > 0) {
            this.gameState.carryBallCount = normalBalls.length;
            this.gameState.carryPierceTimer = Math.max(0, ...normalBalls.map(b => b.pierceTimer || 0));
            this.gameState.carryPierceStacks = Math.max(0, ...normalBalls.map(b => b.pierceStacks || 0));
        }
        const chargingBall = this.entities.balls.find(b => b.isCharging);
        if (chargingBall) {
            this.gameState.carryExplosionCharge = true;
            this.gameState.carryExplosionTimer = chargingBall.chargeTimer;
        } else {
            this.gameState.carryExplosionCharge = false;
            this.gameState.carryExplosionTimer = 0;
        }
        if (this.entities.paddle) {
            this.gameState.carryPaddleWidth = this.entities.paddle.width;
            this.gameState.carryExpandStage = this.entities.paddle.expandStage;
            this.gameState.carryExpandTimer = this.entities.paddle.expandTimer;
        }
    }

    start() {
        this.sounds.init();
        
        // Ensure BGM starts even when bypassing overlays (e.g., direct start from stage selector)
        if (!this.sounds.bgmStarted) {
            // ブロックされていた再生を再試行する
            this.events.emit('BGM_START');
            
            // 100面以外なら設定画面のBGMをセット（100面なら専用BGMを維持）
            if (this.gameState.level !== 100) {
                this.events.emit('BGM_SET', this.ui.bgmSelector ? this.ui.bgmSelector.value : 'random');
            }
        } else {
            // 既存のBGMが一時停止状態のままになっているのを防ぐため、明示的に再生を再開する
            if (this.sounds && typeof this.sounds.playBgm === 'function') {
                this.sounds.playBgm();
            }
        }

        // 1秒間のウェイト（READY演出）を開始
        // Stage 100: Extend to 3 seconds for drama
        this.launchTimer = (this.gameState.level === 100) ? 180 : LAUNCH_WAIT_DURATION; 
        
        // Sync carry state before saving and launching
        this.syncCarryState();
        this.gameState.save();
        
        this.events.emit('GAME_READY');
        this.entities.balls.forEach(b => b.launch());

        // Requirement 3: BGM notification on game start
        if (this.sounds && this.sounds.bgmAudio && this.sounds.bgmStarted) {
            const track = CLASSIC_PLAYLIST.find(p => this.sounds.bgmAudio.src.includes(encodeURIComponent(p.file).replace(/%20/g, '+')) || this.sounds.bgmAudio.src.includes(p.file));
            if (track) this.events.emit('BGM_NOW_PLAYING', { name: this.formatBgmName(track.name) });
        }
    }

    update(dt) {
        const timeScale = dt / (1000 / 60); // Normalize to 60fps

        // 背景・演出の更新処理を委譲
        this.renderer.update(timeScale);

        // 入力ロックタイマーの更新
        if (this.inputLockTimer > 0) {
            this.inputLockTimer -= dt / 1000;
            if (this.inputLockTimer < 0) this.inputLockTimer = 0;
            
            // CLEAR状態ならUIの更新を呼ぶ
            if (this.state === 'CLEAR') {
                this.events.emit('INPUT_LOCK_UPDATE', { isLocked: this.inputLockTimer > 0 });
            }
        } else if (this.state === 'CLEAR') {
            // タイマーが0になった瞬間も一度呼ぶ（ボタン復帰のため）
            this.events.emit('INPUT_LOCK_UPDATE', { isLocked: false });
        }

        // プレイ中以外（ポーズ中、開始前、ゲームオーバー、ミス、クリア）は物理更新を停止
        // ただし CLEAR_WAIT_TIMER がある場合は物理演算を継続
        if ((this.state !== 'PLAYING' && this.clearWaitTimer <= 0)) {
            // START状態でのLaunch Wait処理
            if (this.state === 'START' && this.launchTimer > 0) {
                this.launchTimer -= timeScale;
                // ボールをパドルに固定
                if (this.entities.paddle) {
                    this.entities.balls.forEach(b => {
                        b.x = this.entities.paddle.x + this.entities.paddle.width / 2;
                        b.y = this.entities.paddle.y - b.radius;
                    });
                }
                if (this.launchTimer <= 0) {
                    this.state = 'PLAYING';
                    this.entities.balls.forEach(b => b.launch());
                    
                    // Requirement 3: BGM notification on game start
                    if (this.sounds && this.sounds.bgmAudio && this.sounds.bgmStarted) {
                        const track = CLASSIC_PLAYLIST.find(p => this.sounds.bgmAudio.src.includes(encodeURIComponent(p.file).replace(/%20/g, '+')) || this.sounds.bgmAudio.src.includes(p.file));
                        if (track) this.events.emit('BGM_NOW_PLAYING', { name: this.formatBgmName(track.name) });
                    }
                }
            }
            return;
        }

        if (this.clearWaitTimer > 0) {
            this.clearWaitTimer -= timeScale;
            if (this.clearWaitTimer <= 0) {
                this.levelClear();
            }
        }
        
        if (this.clearTimer > 0) this.clearTimer -= timeScale;

        if (this.state === 'PLAYING') {
            // エンティティ（パドル、爆弾、アイテム、パーティクル、通知）の更新を委譲
            this.entities.update(timeScale, dt, this.renderer.canvas.width, this);
            
            if (this.slowTimer > 0) {
                this.slowTimer -= dt / 1000; // Real-time calculation
                if (this.slowTimer < 0) this.slowTimer = 0;
                
                // Advanced Slow Sync: Gradual return based on Real-Time thresholds
                if (this.slowTimer > 1.0) {
                    this.speedMultiplier = 0.5;
                } else if (this.slowTimer > 0) {
                    this.speedMultiplier = 0.75;
                } else {
                    this.speedMultiplier = 1.0;
                }
            } else {
                this.speedMultiplier = 1.0;
            }
        }


        this.physics.handleCollisions(timeScale, dt);
    }



    levelClear() {
        // すでにクリア状態なら何もしない（二重発火防止）
        if (this.state === 'CLEAR') return;

        this.state = 'CLEAR';
        this.inputLockTimer = 0; 
        this.clearTimer = STAGE_CLEAR_DELAY; // 2 seconds at 60fps
        if (this.gameState.level < 100) {
            this.gameState.nextLevel();
            this.events.emit('STAGE_UPDATE', this.gameState.level);
            
            // NOTE: Forced switch to level 100 BGM moved to startLevel() for cinematic timing

            // Create next level non-blockingly to prevent freeze
            setTimeout(() => {
                this.stageManager.createLevel();
            }, 100);
            
            this.isWaitingForRestart = false;
            
            // Get track info with safe fallbacks
            const currentFile = this.sounds.currentTrackFile;
            const track = CLASSIC_PLAYLIST.find(t => t.file === currentFile) || { name: 'Unknown Track', file: 'none' };
            const info = (typeof BGM_INFO !== 'undefined' && currentFile && BGM_INFO[currentFile]) 
                         ? BGM_INFO[currentFile] 
                         : { songDescription: 'BGM情報がありません。', composerName: 'Unknown', composerDescription: '' };

            this.events.emit('STAGE_CLEAR', {
                score: this.gameState.score,
                track: track,
                info: info,
                isFinal: false
            });

            this.events.emit('INPUT_LOCK_UPDATE', { isLocked: false });
            if (this.hasUsedNextBgmInStage || this.gameState.level === 100) {
                this.events.emit('INPUT_LOCK_UPDATE', { isLocked: true }); // Special case for nextBgm
            }
            
            // Carry over state to next stage
            this.syncCarryState();
            this.gameState.save();
            
            // PIERCE Persistence check (handled in resetBall via gameState.carryPierceTimer)
            if (this.gameState.difficulty === 'superEasy') {
                const piercingBall = this.entities.balls.find(b => b.pierceTimer > 0);
                this.gameState.carryPierceTimer = piercingBall ? piercingBall.pierceTimer : 0;
            } else {
                this.gameState.carryPierceTimer = 0;
            }

            // Auto-Save after level clear
            this.gameState.save();

            // BGM Notification for automated stage transition
            if (this.sounds && this.sounds._pendingTrackName) {
                this.events.emit('BGM_NOW_PLAYING', { name: this.formatBgmName(this.sounds._pendingTrackName) });
            }
        } else {
            // Stage 100 ALL CLEAR!
            this.gameState.nextLevel();
            this.events.emit('STAGE_UPDATE', this.gameState.level);
            this.events.emit('SETTINGS_LOAD');

            // Fetch info for the finale track
            const currentFile = 'The_Garden_s_Final_Ascent.mp3';
            const track = CLASSIC_PLAYLIST.find(t => t.file === currentFile) || { name: "The Garden's Final Ascent", file: currentFile };
            const info = (typeof BGM_INFO !== 'undefined' && BGM_INFO[currentFile]) 
                         ? BGM_INFO[currentFile] 
                         : { songDescription: 'すべてのステージをクリアしました。音楽と共におくつろぎください。', composerName: 'Unknown', composerDescription: '' };

            this.events.emit('STAGE_CLEAR', {
                score: this.gameState.score,
                track: track,
                info: info,
                isFinal: true
            });

            // Lock navigation buttons for the true ending
            this.events.emit('INPUT_LOCK_UPDATE', { isLocked: true });
            
            // Huge Confetti Blast
            for (let i = 0; i < 150; i++) {
                this.renderer.createParticles(this.renderer.canvas.width / 2, this.renderer.canvas.height / 2, 
                    this.pastelColors[Math.floor(Math.random() * this.pastelColors.length)], 1);
            }
            
            this.gameState.resetForNewGame();
        }
        this.events.emit('UI_REFRESH', {
            score: this.gameState.score,
            lives: this.gameState.lives,
            level: this.gameState.level,
            bestScore: this.gameState.bestScore
        });
    }

    addScore(points) {
        if (this.gameState.addScore(points)) {
            this.ui.updateScore(this.gameState.score);
            // Best Score Notice
            this.entities.notices.push({
                text: "Best Score!",
                x: this.renderer.canvas.width / 2,
                y: this.renderer.canvas.height * 0.7,
                alpha: 1.0,
                timer: 90
            });
        } else {
            this.ui.updateScore(this.gameState.score);
        }
    }

    gameOver() {
        this.state = 'GAMEOVER';
        this.isItemRush = false;
        this.itemRushTimer = 0;
        this.sounds.gameOver();
        
        // Save progress instead of clearing it on Game Over to allow continuation
        this.gameState.save();
        
        // ゲームオーバー時は全状態を初期化
        this.carryBallCount = 1;
        this.carryPaddleWidth = 120;
        this.gameState.carryBallCount = 1;
        this.gameState.carryPaddleWidth = 120;
        this.gameState.carryExpandStage = 0;
        this.gameState.carryExpandTimer = 0;
        this.gameState.carryPierceTimer = 0;
        this.gameState.carryPierceStacks = 0;
        this.gameState.carryExplosionCharge = false;

        let stageUpdated = (this.gameState.level > this.gameState.highestStage);
        if (stageUpdated) {
            this.gameState.highestStage = this.gameState.level;
        }

        const isNewRecord = this.gameState.score > this.gameState.bestScore;
        const previousBest = this.gameState.bestScore;
        
        if (isNewRecord) {
            this.gameState.checkAndSaveBestScore();
        }

        this.events.emit('GAME_OVER', {
            score: this.gameState.score,
            bestScore: previousBest, // 表示用には更新前のベストを渡す
            highestStage: this.gameState.highestStage,
            isNewRecord: isNewRecord,
            isNewStageRecord: stageUpdated
        });
        
        // Removed immediate this.init() to allow user to see the Game Over screen
        this.inputLockTimer = INPUT_LOCK_AUTO_DURATION; 
    }

    miss() {
        this.state = 'MISS';
        this.inputLockTimer = INPUT_LOCK_AUTO_DURATION; 
        this.sounds.gameOver(); // Reuse miss/gameover sound

        // ミス時はボールとパドル状態を初期化（スコアは維持）
        this.carryBallCount = 1;
        this.carryPaddleWidth = 120;
        this.gameState.carryBallCount = 1;
        this.gameState.carryPaddleWidth = 120;
        this.gameState.carryExpandStage = 0;
        this.gameState.carryExpandTimer = 0;
        this.gameState.carryPierceTimer = 0;
        this.gameState.carryPierceStacks = 0;
        this.gameState.carryExplosionCharge = false;
        this.gameState.save(); // リセットされた状態を保存

        this.events.emit('GAME_MISS', { lives: this.gameState.lives });

        setTimeout(() => {
            if (this.state === 'MISS') {
                this.requestRestart();
            }
        }, MISS_RESTART_DELAY);
    }

    requestRestart() {
        this.resetBall();
    }

    playNextBgm() {
        if (this.gameState.level === 100) {
            this.sounds.setBgm('The_Garden_s_Final_Ascent.mp3');
        } else {
            this.sounds.setBgm('random');
        }
        this.sounds.startBgm();
    }



    draw() {
        this.renderer.draw();
    }

    loop() {
        const currentTime = performance.now();
        let dt = currentTime - this.lastTime;
        if (dt > 100) dt = 16.6; // Cap dt to avoid teleporting if tab was inactive
        this.lastTime = currentTime;

        this.update(dt);
        this.draw();
        requestAnimationFrame(() => this.loop());
    }
}

window.addEventListener('load', () => {
    // Android Back Button Protection
    window.history.pushState(null, null, window.location.href);
    window.addEventListener('popstate', () => {
        if (window.gameInstance.state === 'PLAYING') {
            window.gameInstance.togglePause();
            window.history.pushState(null, null, window.location.href);
        } else if (document.getElementById('settings-overlay') && document.getElementById('settings-overlay').style.display === 'flex') {
            window.gameInstance.ui.hideSettings();
            window.history.pushState(null, null, window.location.href);
        } else {
            window.history.pushState(null, null, window.location.href);
        }
    });

    window.gameInstance = new Game();
});
