import { CLASSIC_PLAYLIST } from './playlist.js';

/**
 * SoundSystem: オーディオ再生を管理するクラス
 * Gameクラスから分離され、コールバックを通じて相互作用します。
 */
export class SoundSystem {
    constructor(game) {
        this.game = game;
        this.events = game.events;

        this.ctx = null;
        this.currentBgm = 'none';
        this.bgmAudio = new Audio();
        this.bgmAudio.volume = 1.0;
        this.bgmStarted = false;
        this.currentTrackFile = null;
        this.playedHistory = [];
        this.bgmHistoryLimit = 10;
        this.consecutiveErrors = 0;
        
        // Throttling and Gain Control
        this.masterGain = null;
        this.compressor = null;
        this.seLimit = 12; // Max concurrent SEs
        this.activeSeCount = 0;
        this.lastPlayTimes = {}; // For per-type throttling
        this.minInterval = 50; // 50ms between same sound types

        this.bgmAudio.addEventListener('ended', () => {
            this.game.playNextBgm();
        });
        this.bgmAudio.addEventListener('error', (e) => {
            this.handleBgmError('Audio tag error (404/NotSupported)');
        });

        this.events.on('BGM_START', () => this.startBgm());
        this.events.on('BGM_SET', (type) => this.setBgm(type));
        this.events.on('GAME_PAUSE', () => this.pauseBgm());
        this.events.on('GAME_RESUME', () => {
            if (this.game.ui.bgmVolumeSlider) this.bgmAudio.volume = parseFloat(this.game.ui.bgmVolumeSlider.value);
            this.playBgm();
        });
        this.events.on('ALL_BLOCKS_BROKEN', () => this.playLevelClear());
        this.events.on('GAME_OVER', () => this.gameOver());
        this.events.on('GAME_MISS', () => this.gameOver()); // Reuse miss/gameover sound
    }

    getBgmVolume() {
        return (this.game.ui && this.game.ui.bgmVolumeSlider) ? parseFloat(this.game.ui.bgmVolumeSlider.value) : 0.5;
    }

    getSeVolume() {
        return (this.game.ui && this.game.ui.seVolumeSlider) ? parseFloat(this.game.ui.seVolumeSlider.value) : 0.5;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            
            // DynamicsCompressor for overall output stabilization
            this.compressor = this.ctx.createDynamicsCompressor();
            this.compressor.threshold.setValueAtTime(-24, this.ctx.currentTime);
            this.compressor.knee.setValueAtTime(40, this.ctx.currentTime);
            this.compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
            this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
            this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);
            
            // Master SE Gain Node
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);

            // Connect chain: SE Nodes -> MasterGain -> Compressor -> Destination
            this.masterGain.connect(this.compressor);
            this.compressor.connect(this.ctx.destination);
        }

        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    handleBgmError(reason) {
        this.consecutiveErrors = (this.consecutiveErrors || 0) + 1;
        console.warn(`[DeiScore Audio] BGM Load/Play Failed. Reason: ${reason} | Consecutive Errors: ${this.consecutiveErrors}`);

        if (this.bgmAudio && this.bgmAudio.src) {
            console.log(`[DeiScore Audio] Attempted Path: ${this.bgmAudio.src}`);
        }

        if (this.consecutiveErrors > CLASSIC_PLAYLIST.length) {
            console.error('[DeiScore Audio] All tracks failed. Stopping BGM auto-skip to prevent infinite loop.');
            this.setBgm('none');

            if (this.game.onBgmError) this.game.onBgmError();
            this.events.emit('BGM_NOW_PLAYING', { name: 'BGM Error (Offline?)' });
            return;
        }

        if (this.currentBgm !== 'none') {
            // 追加: 自動再生ブロック（Promiseエラー等）の場合はスキップ連鎖を防ぐため停止
            if (reason.includes('Promise rejected') || reason.includes('NotAllowedError')) {
                console.warn('[DeiScore Audio] Autoplay blocked or Promise rejected. Stopping auto-skip.');
                this.bgmStarted = false;
                return;
            }

            // 1-second cooldown before attempting the next skip
            if (this.bgmTimer) clearTimeout(this.bgmTimer);
            this.bgmTimer = setTimeout(() => {
                this.game.playNextBgm();
            }, 1000);
        }
    }

    setBgm(type) {
        if (!this.bgmAudio) return;

        // ステージ100の場合は、専用BGM以外への変更リクエストをすべてブロックする
        const isFinale = this.game.gameState && this.game.gameState.level === 100;
        const finaleTracks = ['The_Last_eye_Departure.mp3', 'The_Garden_s_Final_Ascent.mp3'];
        if (isFinale && !finaleTracks.includes(type)) {
            console.log("[DeiScore Audio] Blocked BGM change request during Stage 100 to protect finale music.");
            return;
        }

        this.bgmAudio.pause();
        this.currentBgm = type;
        if (type === 'none') {
            this.bgmAudio.removeAttribute('src');
            this._pendingTrackName = null;
            return;
        }

        let trackInfo = null;
        if (type === 'random') {
            // Logic for unique random selection based on history
            const effectiveLimit = Math.min(this.bgmHistoryLimit, CLASSIC_PLAYLIST.length - 1);
            const historySet = new Set(this.playedHistory);
            
            const excludedTracks = ['The_Garden_s_Final_Ascent.mp3', 'The_Last_eye_Departure.mp3'];
            let candidates = CLASSIC_PLAYLIST.filter(p => !historySet.has(p.file) && !excludedTracks.includes(p.file));
            
            // If no unique candidates left, clear oldest history until we have at least one
            if (candidates.length === 0) {
                while (this.playedHistory.length >= effectiveLimit && candidates.length === 0) {
                    this.playedHistory.shift();
                    const currentHistorySet = new Set(this.playedHistory);
                    candidates = CLASSIC_PLAYLIST.filter(p => !currentHistorySet.has(p.file) && !excludedTracks.includes(p.file));
                }
            }
            
            // Final fallback
            if (candidates.length === 0) candidates = CLASSIC_PLAYLIST.filter(p => !excludedTracks.includes(p.file));
            
            trackInfo = candidates[Math.floor(Math.random() * candidates.length)];
        } else {
            trackInfo = CLASSIC_PLAYLIST.find(p => p.file === type);
        }

        if (trackInfo) {
            console.log("Now Playing:", trackInfo.name);
            this.playedHistory.push(trackInfo.file);
            this.currentTrackFile = trackInfo.file;
            console.log("BGM History (last 10):", this.playedHistory);

            if (this.playedHistory.length > this.bgmHistoryLimit) {
                this.playedHistory.shift();
            }

            // Using explicit relative path format. Browser will resolve against origin.
            this.bgmAudio.pause(); // Ensure pause immediately before source change
            this.bgmAudio.src = `./music/${trackInfo.file}`;
            this.bgmAudio.load(); // Explicitly clear any existing buffer to prevent blips
            this.bgmAudio.volume = 0; // Set to 0 before play to prevent pop
            
            // Loop the finale music
            this.bgmAudio.loop = (trackInfo.file === 'The_Garden_s_Final_Ascent.mp3');
            this._pendingTrackName = trackInfo.name;

            if (this.bgmStarted) {
                this.bgmAudio.play().then(() => {
                    this.consecutiveErrors = 0; // successfully played
                    // Restore volume after play starts to avoid pop
                    this.bgmAudio.volume = this.getBgmVolume();
                    if (this._pendingTrackName) {
                        this.events.emit('BGM_NOW_PLAYING', { name: this.game.formatBgmName(this._pendingTrackName) });
                        this._pendingTrackName = null;
                    }
                }).catch(e => {
                    this.handleBgmError(`play() Promise rejected`);
                });
            }
        }
    }

    startBgm() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        
        if (this.bgmAudio && this.currentBgm !== 'none' && this.bgmAudio.src) {
            this.bgmStarted = true;
            this.bgmAudio.volume = 0; // Set to 0 before play to prevent pop
            this.bgmAudio.play().then(() => {
                this.consecutiveErrors = 0; // successfully played
                // Restore volume after play starts to avoid pop
                this.bgmAudio.volume = this.getBgmVolume();
                if (this._pendingTrackName) {
                    this.events.emit('BGM_NOW_PLAYING', { name: this.game.formatBgmName(this._pendingTrackName) });
                    this._pendingTrackName = null;
                }
            }).catch(e => {
                this.handleBgmError(`startBgm() Promise rejected: ${e}`);
                this.bgmStarted = false; // Allow retrying
            });
        }
    }

    pauseBgm() {
        if (this.bgmAudio) this.bgmAudio.pause();
    }

    playBgm() {
        if (this.bgmAudio && this.bgmStarted && this.currentBgm !== 'none') {
            this.bgmAudio.play().catch(e => {
                console.warn("[DeiScore Audio] playBgm resume failed:", e);
            });
        }
    }

    play(freq, type = 'sine', duration = 0.1, volume = 0.1, pitchSweep = 0, soundId = 'generic') {
        if (!this.ctx) return;

        // Throttling: Max concurrent sounds
        if (this.activeSeCount >= this.seLimit) return;

        // Throttling: Per-type cooldown (e.g., prevent many brick hits in 1 frame from spiking)
        const now = Date.now();
        if (this.lastPlayTimes[soundId] && now - this.lastPlayTimes[soundId] < this.minInterval) return;
        this.lastPlayTimes[soundId] = now;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        if (pitchSweep !== 0) {
            osc.frequency.exponentialRampToValueAtTime(Math.max(10, freq + pitchSweep), this.ctx.currentTime + duration);
        }

        const seVol = this.getSeVolume ? this.getSeVolume() : 1.0;
        // Adjusted multiplier from 3.0 to 1.5 because we now use a Compressor and MasterGain
        const finalVolume = Math.max(0.0001, volume * seVol * 1.5);

        // Skip playback if volume is truly zero (muted)
        if (finalVolume <= 0.0001 && seVol <= 0) return;

        // Attack phase to prevent pop noise
        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(finalVolume, this.ctx.currentTime + 0.01);
        // Release phase
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.masterGain || this.ctx.destination);

        this.activeSeCount++;
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
        
        osc.onended = () => {
            this.activeSeCount = Math.max(0, this.activeSeCount - 1);
            // Explicitly disconnect to prevent memory leaks on mobile browsers
            osc.disconnect();
            gain.disconnect();
        };
    }

    playNoise(duration = 0.1, volume = 0.1, filterFreq = 1000) {
        if (!this.ctx) return;
        
        // Throttling: Max concurrent sounds
        if (this.activeSeCount >= this.seLimit) return;
        
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(filterFreq, this.ctx.currentTime);

        const gain = this.ctx.createGain();
        const seVol = this.getSeVolume ? this.getSeVolume() : 1.0;
        // Adjusted multiplier from 3.0 to 1.5 to match play() and account for Compressor
        const finalVolume = Math.max(0.0001, volume * seVol * 1.5);

        // Skip playback if volume is truly zero (muted)
        if (finalVolume <= 0.0001 && seVol <= 0) return;

        // Attack phase to prevent pop noise
        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(finalVolume, this.ctx.currentTime + 0.01);
        // Release phase
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain || this.ctx.destination);

        this.activeSeCount++;
        noise.start();
        noise.onended = () => {
            this.activeSeCount = Math.max(0, this.activeSeCount - 1);
            // Explicitly disconnect all nodes to prevent memory leaks
            noise.disconnect();
            filter.disconnect();
            gain.disconnect();
        };
    }

    hitBrick() { this.play(800, 'square', 0.05, 0.05, 0, 'hit'); }
    hitPaddle() { this.play(400, 'sine', 0.1, 0.1, 0, 'hit'); }
    hitWall() { this.play(300, 'sine', 0.05, 0.05, 0, 'hit'); }
    playMetalHit() {
        // Hard metallic "ping" sound (high frequency, rapid decay)
        this.play(2200, 'sine', 0.06, 0.1, -500, 'metal');
        setTimeout(() => this.play(3200, 'triangle', 0.04, 0.05, 0, 'metal'), 5);
    }
    playShatter() {
        // Sharp shattering glass sound
        this.playNoise(0.2, 0.15, 3500); 
        this.play(1800, 'triangle', 0.2, 0.1, -1000, 'shatter');
        setTimeout(() => this.play(2800, 'square', 0.05, 0.05, 0, 'shatter'), 30);
    }
    playLaunch() {
        // 爽快感のある上昇音（サイン波）
        this.play(600, 'sine', 0.2, 0.1, 400);
    }
    collectItem() {
        this.play(600, 'sine', 0.1, 0.1);
        setTimeout(() => this.play(800, 'sine', 0.1, 0.1), 50);
        setTimeout(() => this.play(1000, 'sine', 0.1, 0.1), 100);
    }
    playExplosion() {
        // 「可愛らしく・耳に優しく」刷新された爆発音: 「ポコンッ！」という水風船のような丸い音
        // Sine波の急降下（1200Hz -> 400Hz）により、打撃感がありつつも耳に優しい響きになります
        this.play(1200, 'sine', 0.15, 0.15, -800);
        // わずかに遅らせて高域の余韻を追加（ピロリン感）
        setTimeout(() => this.play(1800, 'sine', 0.08, 0.05), 15);
    }
    playLevelClear() {
        // クリア音: テンポよく上昇するファンファーレ風の音（音量を少し高めに設定）
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((n, i) => {
            setTimeout(() => {
                this.play(n, 'triangle', 0.4, 0.2);
            }, i * 150);
        });
    }
    gameOver() {
        const notes = [440, 349, 293, 220];
        notes.forEach((n, i) => setTimeout(() => this.play(n, 'sawtooth', 0.5, 0.1), i * 200));
    }
}
