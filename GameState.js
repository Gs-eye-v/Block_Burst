/**
 * GameState: ゲームの進行状況、スコア、およびセーブデータの永続化を管理するクラス
 */
export class GameState {
    constructor() {
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.bestScore = 0;
        this.highestStage = 1;
        this.isAllCleared = false;
        this.difficulty = 'normal';
        this.isSuperEasyUnlocked = false;
        this.isBgmSelectionUnlocked = false;
        this.isStageSelectUnlocked = false;
        
        // Carry states
        this.carryBallCount = 1;
        this.carryPaddleWidth = 120;
        this.carryExpandStage = 0;
        this.carryExpandTimer = 0;
        this.carryPierceTimer = 0;
        this.carryPierceStacks = 0;
        this.carryExplosionCharge = false;
        this.carryExplosionTimer = 0;

        // localStorage 用のプレフィックス
        this.PREFIX = 'deiscore_';
        this.OLD_PREFIX = 'blockburst_';

        // 初期化時にロードと移行を実行
        this.load();
    }

    /**
     *データの移行および読み込み
     */
    load() {
        const keys = [
            'current_level', 'all_clear', 'best', 'highest_stage', 
            'super_easy_unlocked', 'bgm_selection_unlocked', 'stage_select_unlocked', 
            'bgm_volume', 'se_volume', 'paddle_speed', 'difficulty', 'control_mode',
            'carry_ball_count', 'carry_paddle_width', 'carry_pierce_timer', 'carry_pierce_stacks',
            'carry_explosion_charge', 'carry_explosion_timer',
            'carry_expand_stage', 'carry_expand_timer'
        ];

        // 移行処理: 旧プレフィックスのデータがあれば新プレフィックスへコピー
        keys.forEach(key => {
            const oldValue = localStorage.getItem(this.OLD_PREFIX + key);
            if (oldValue !== null) {
                if (localStorage.getItem(this.PREFIX + key) === null) {
                    localStorage.setItem(this.PREFIX + key, oldValue);
                }
            }
        });

        // Migration from current_stage to current_level
        const oldStage = localStorage.getItem(this.PREFIX + 'current_stage');
        if (oldStage !== null && localStorage.getItem(this.PREFIX + 'current_level') === null) {
            localStorage.setItem(this.PREFIX + 'current_level', oldStage);
        }

        // データの読み込み
        this.level = parseInt(localStorage.getItem(this.PREFIX + 'current_level') || '1');
        this.isAllCleared = localStorage.getItem(this.PREFIX + 'all_clear') === 'true';
        this.bestScore = parseInt(localStorage.getItem(this.PREFIX + 'best') || '0');
        this.highestStage = parseInt(localStorage.getItem(this.PREFIX + 'highest_stage') || '1');
        this.isSuperEasyUnlocked = localStorage.getItem(this.PREFIX + 'super_easy_unlocked') === 'true';
        this.isBgmSelectionUnlocked = localStorage.getItem(this.PREFIX + 'bgm_selection_unlocked') === 'true';
        this.isStageSelectUnlocked = localStorage.getItem(this.PREFIX + 'stage_select_unlocked') === 'true';
        this.difficulty = localStorage.getItem(this.PREFIX + 'difficulty') || 'normal';
        
        // Carry states
        this.carryBallCount = parseInt(localStorage.getItem(this.PREFIX + 'carry_ball_count') || '1');
        this.carryPaddleWidth = parseInt(localStorage.getItem(this.PREFIX + 'carry_paddle_width') || '120');
        this.carryExpandStage = parseInt(localStorage.getItem(this.PREFIX + 'carry_expand_stage') || '0');
        this.carryExpandTimer = parseFloat(localStorage.getItem(this.PREFIX + 'carry_expand_timer') || '0');
        this.carryPierceTimer = parseInt(localStorage.getItem(this.PREFIX + 'carry_pierce_timer') || '0');
        this.carryPierceStacks = parseInt(localStorage.getItem(this.PREFIX + 'carry_pierce_stacks') || '0');
        this.carryExplosionCharge = localStorage.getItem(this.PREFIX + 'carry_explosion_charge') === 'true';
        this.carryExplosionTimer = parseFloat(localStorage.getItem(this.PREFIX + 'carry_explosion_timer') || '0');
    }

    /**
     * 進行状況の保存
     */
    save() {
        localStorage.setItem(this.PREFIX + 'current_level', this.level);
        localStorage.setItem(this.PREFIX + 'all_clear', this.isAllCleared);
        localStorage.setItem(this.PREFIX + 'best', this.bestScore);
        localStorage.setItem(this.PREFIX + 'highest_stage', this.highestStage);
        localStorage.setItem(this.PREFIX + 'difficulty', this.difficulty);
        localStorage.setItem(this.PREFIX + 'super_easy_unlocked', this.isSuperEasyUnlocked);
        localStorage.setItem(this.PREFIX + 'bgm_selection_unlocked', this.isBgmSelectionUnlocked);
        localStorage.setItem(this.PREFIX + 'stage_select_unlocked', this.isStageSelectUnlocked);
        
        // Carry states
        localStorage.setItem(this.PREFIX + 'carry_ball_count', this.carryBallCount);
        localStorage.setItem(this.PREFIX + 'carry_paddle_width', this.carryPaddleWidth);
        localStorage.setItem(this.PREFIX + 'carry_expand_stage', this.carryExpandStage);
        localStorage.setItem(this.PREFIX + 'carry_expand_timer', this.carryExpandTimer);
        localStorage.setItem(this.PREFIX + 'carry_pierce_timer', this.carryPierceTimer);
        localStorage.setItem(this.PREFIX + 'carry_pierce_stacks', this.carryPierceStacks);
        localStorage.setItem(this.PREFIX + 'carry_explosion_charge', this.carryExplosionCharge);
        localStorage.setItem(this.PREFIX + 'carry_explosion_timer', this.carryExplosionTimer);
    }

    /**
     * 保存データの削除（ゲームオーバー時やデータリセット用）
     */
    clearSave() {
        localStorage.removeItem(this.PREFIX + 'current_level');
    }

    /**
     * スコアの加算
     */
    addScore(points) {
        this.score += points;
    }

    /**
     * ゲームオーバー時にベストスコアをチェック・更新する
     */
    checkAndSaveBestScore() {
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            this.save();
            return true; // 新記録
        }
        return false;
    }

    /**
     * ミス時の処理
     */
    loseLife() {
        this.lives--;
        return this.lives > 0;
    }

    /**
     * 次のレベルへ進む
     */
    nextLevel() {
        if (this.level >= 100) {
            this.isAllCleared = true;
            this.isStageSelectUnlocked = true;
            this.isBgmSelectionUnlocked = true;
            this.isSuperEasyUnlocked = true;
            
            // Carry states for Reward: Keep current powerups
            const game = window.gameInstance;
            if (game) {
                this.carryBallCount = game.entities.balls.length;
                const paddle = game.entities.paddle;
                if (paddle) {
                    this.carryPaddleWidth = paddle.width;
                    this.carryExpandStage = paddle.expandStage;
                    this.carryExpandTimer = paddle.expandTimer;
                }
                // Also carry pierce if active
                const balls = game.entities.balls;
                if (balls.length > 0) {
                    this.carryPierceTimer = balls[0].pierceTimer;
                }
            }

            this.level = 1;
            this.save();
            return true; // 全面クリア
        }
        this.level++;
        if (this.level > this.highestStage) {
            this.highestStage = this.level;
        }
        this.save();
        return false;
    }

    /**
     * 新規ゲーム用の初期化
     */
    resetForNewGame() {
        this.level = 1;
        this.lives = 3;
        this.carryBallCount = 1;
        this.carryPaddleWidth = 120;
        this.carryExpandStage = 0;
        this.carryExpandTimer = 0;
        this.carryPierceTimer = 0;
        this.carryPierceStacks = 0;
        this.carryExplosionCharge = false;
        this.carryExplosionTimer = 0;
        // 注意: ベストスコアや最高ステージ、開放状況はリセットしない
    }
}
