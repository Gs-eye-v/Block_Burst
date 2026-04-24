import { Item } from './entities.js';

/**
 * EntityManager: ゲーム内のエンティティ（パドル、ボール、ブロック、アイテム、パーティクル、通知）
 * の管理と更新ロジックを専門に扱うクラス。
 */
export class EntityManager {
    constructor(game) {
        this.game = game;

        // エンティティ配列の保持
        this.paddle = null;
        this.balls = [];
        this.bricks = [];
        this.items = [];
        this.particles = [];
        this.notices = [];

        // アイテム関連タイマーの保持
        this.itemSpawnTimer = 0;
        this.isItemRush = false;
        this.itemRushTimer = 0;
    }

    /**
     * すべてのエンティティ（ブロック以外）をクリアする
     */
    clear() {
        this.balls = [];
        this.items = [];
        this.particles = [];
        this.notices = [];
        this.isItemRush = false;
        this.itemRushTimer = 0;
        this.itemSpawnTimer = 0;
    }

    /**
     * 新しいボールを管理下に追加する
     */
    addBall(ball) {
        this.balls.push(ball);
        return ball;
    }

    /**
     * エンティティの更新ロジック（script.js から移譲）
     */
    update(timeScale, dt, canvasWidth, game) {
        const diff = game.difficultyMultipliers[game.gameState.level === 100 ? 'hard' : game.gameState.difficulty] || game.difficultyMultipliers['normal'];

        // 1. パドルの更新
        if (this.paddle) {
            this.paddle.update(canvasWidth, timeScale, dt);
        }

        // 2. 爆弾ブロックのカウントダウン処理
        for (let i = this.bricks.length - 1; i >= 0; i--) {
            const brick = this.bricks[i];
            if (brick.isIgnited) {
                brick.fuseTimer -= dt;
                if (brick.fuseTimer <= 0) {
                    const bx = brick.x + brick.w / 2;
                    const by = brick.y + brick.h / 2;
                    this.bricks.splice(i, 1);
                    game.physics.triggerExplosion(bx, by);
                }
            }
            // ブロック自体の更新（移動ブロック等）
            brick.update(timeScale, canvasWidth, game);
        }

        // 3. 通常アイテムのスポーン処理
        const ITEM_SPAWN_BASE_TIME = 10000; // 10秒
        this.itemSpawnTimer += dt;
        if (this.itemSpawnTimer >= ITEM_SPAWN_BASE_TIME / diff.drop) {
            this.itemSpawnTimer = 0;
            // 難易度Normal以上では画面上のアイテム数を3つに制限
            if (game.gameState.difficulty === 'superEasy' || this.items.length < 3) {
                const x = Math.random() * (canvasWidth - 40) + 20;
                this.items.push(new Item(x, 0, game));
            }
        }

        // 4. Item Rush（アイテムラッシュ）の判定と生成
        const ITEM_RUSH_BRICK_THRESHOLD = 5;
        const ITEM_RUSH_BALL_THRESHOLD = 2;
        const ITEM_RUSH_SPAWN_TIME = 300; // 5秒相当
        const NOTICE_DEFAULT_DURATION = 120;

        const remainingEssential = this.bricks.filter(b => b.type !== 9 && b.type !== 10).length;

        if (remainingEssential > 0 && (remainingEssential <= ITEM_RUSH_BRICK_THRESHOLD || this.balls.length <= ITEM_RUSH_BALL_THRESHOLD)) {
            if (!this.isItemRush) {
                this.isItemRush = true;
                this.itemRushTimer = 0;
                this.notices.push({
                    text: "RUSH",
                    x: canvasWidth / 2,
                    y: game.renderer.canvas.height / 2,
                    alpha: 1.5,
                    timer: NOTICE_DEFAULT_DURATION
                });
            }
            
            this.itemRushTimer += timeScale;
            if (this.itemRushTimer >= ITEM_RUSH_SPAWN_TIME) {
                this.itemRushTimer = 0;
                if (game.gameState.difficulty === 'superEasy' || this.items.length < 3) {
                    const x = Math.random() * (canvasWidth - 80) + 40;
                    this.items.push(new Item(x, 0, game));
                }
            }
        } else {
            this.isItemRush = false;
            this.itemRushTimer = 0;
        }

        // 5. パーティクルの更新
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.update(timeScale);
            if (p.alpha <= 0) this.particles.splice(i, 1);
        }

        // 6. 通知（Notices）の更新
        for (let i = this.notices.length - 1; i >= 0; i--) {
            const n = this.notices[i];
            n.y -= 1.0 * timeScale;
            n.alpha -= 0.01 * timeScale;
            n.timer -= timeScale;
            if (n.timer <= 0) this.notices.splice(i, 1);
        }
    }
}
