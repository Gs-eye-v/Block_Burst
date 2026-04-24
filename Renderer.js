import { Particle } from './entities.js';

/**
 * Renderer: Canvas描画、画面揺れ、パーティクル生成、
 * および背景演出（Bubbles）を担当するクラス
 */
export class Renderer {
    constructor(game) {
        this.game = game;
        this.canvas = game.canvas;
        this.ctx = game.ctx;
        
        this.bubbles = [];
        this.shakeTime = 0;
        
        // Initial bubble setup
        this.initBubbles();
    }

    initBubbles() {
        this.bubbles = [];
        for (let i = 0; i < 20; i++) {
            this.bubbles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 4 + 2,
                speed: Math.random() * 0.5 + 0.2
            });
        }
    }

    resize() {
        const oldW = this.canvas.width;
        const oldH = this.canvas.height;
        const newW = window.innerWidth;
        const newH = window.innerHeight;

        this.canvas.width = newW;
        this.canvas.height = newH;

        if (this.game.entities.paddle) {
            this.game.entities.paddle.baseWidth = Math.min(newW * 0.176, 96);
            this.game.entities.paddle.reposition(oldW, oldH, newW, newH);
        }

        if (this.game.entities.balls) {
            this.game.entities.balls.forEach(b => b.reposition(oldW, oldH, newW, newH));
        }

        if (this.game.entities.bricks && this.game.entities.bricks.length > 0) {
            const cols = 10;
            const gap = Math.max(2, newW * 0.01);
            const calculatedWidth = (newW - gap * (cols + 1)) / cols;
            const brickWidth = Math.min(80, calculatedWidth);
            const brickHeight = brickWidth * 0.4;
            const totalGridW = cols * brickWidth + (cols - 1) * gap;
            const startX = (newW - totalGridW) / 2;

            const header = this.game.ui.uiOverlay;
            this.game.headerHeight = header ? header.offsetHeight : 135;
            const startY = this.game.headerHeight + 40;

            this.game.entities.bricks.forEach(brick => {
                const col = Math.round((brick.x - startX) / (brickWidth + gap));
                const row = Math.round((brick.y - (this.game.lastStartY || 40)) / (brickHeight + gap));

                brick.x = startX + col * (brickWidth + gap);
                brick.y = startY + row * (brickHeight + gap);
                brick.w = brickWidth;
                brick.h = brickHeight;
            });
            this.game.lastStartY = startY;
        }
    }

    shake() {
        this.shakeTime = 10;
    }

    createParticles(x, y, color, count) {
        this.shake();
        const theme = this.game.themeManager;
        const finalCount = (theme && theme.currentThemeName === 'neon') ? Math.floor(count * 0.5) : count;
        for (let i = 0; i < finalCount; i++) {
            this.game.entities.particles.push(new Particle(x, y, color));
        }
    }

    update(timeScale) {
        // Update background bubbles
        for (let i = this.bubbles.length - 1; i >= 0; i--) {
            const b = this.bubbles[i];
            b.y -= b.speed * timeScale;
            if (b.y < -10) {
                b.y = this.canvas.height + 10;
                b.x = Math.random() * this.canvas.width;
            }
        }
        
        // Particle/Notice updates are now handled by EntityManager.update()
    }

    draw() {
        this.ctx.save();
        if (this.shakeTime > 0) {
            this.ctx.translate((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5);
            this.shakeTime--;
        }
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw background decoration
        const theme = this.game.themeManager;
        const isSweets = theme.currentThemeName === 'sweets';

        if (isSweets) {
            // Sweets Background: チョコレートの川とマシュマロの雲
            this.ctx.save();
            
            // 1. チョコレートの川 (River of Chocolate at bottom)
            const time = Date.now() / 1000;
            this.ctx.fillStyle = '#4E342E';
            this.ctx.beginPath();
            this.ctx.moveTo(0, this.canvas.height);
            this.ctx.lineTo(0, this.canvas.height - 40);
            for (let x = 0; x <= this.canvas.width; x += 20) {
                const y = this.canvas.height - 40 + Math.sin(x * 0.02 + time) * 10;
                this.ctx.lineTo(x, y);
            }
            this.ctx.lineTo(this.canvas.width, this.canvas.height);
            this.ctx.fill();

            // 2. マシュマロの雲 (Marshmallow Clouds)
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            const drawCloud = (cx, cy, size) => {
                this.ctx.beginPath();
                this.ctx.arc(cx, cy, size, 0, Math.PI * 2);
                this.ctx.arc(cx + size * 0.6, cy - size * 0.3, size * 0.8, 0, Math.PI * 2);
                this.ctx.arc(cx + size * 1.2, cy, size, 0, Math.PI * 2);
                this.ctx.fill();
            };
            drawCloud(this.canvas.width * 0.2, 200, 30);
            drawCloud(this.canvas.width * 0.8, 300, 40);
            drawCloud(this.canvas.width * 0.5, 500, 25);

            this.ctx.restore();
        } else {
            // Default Bubbles
            this.ctx.save();
            this.ctx.fillStyle = theme.getColor('bgBubble');
            this.bubbles.forEach(b => {
                this.ctx.beginPath();
                this.ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
                this.ctx.fill();
            });
            this.ctx.restore();
        }

        // Immediate Rendering for Stage Clear / Start Preview
        if (this.game.state === 'CLEAR' || (this.game.state === 'START' && this.game.isWaitingForRestart)) {
            this.ctx.save();
            this.ctx.globalAlpha = 0.3;
            this.ctx.filter = 'blur(2px)';
            this.game.entities.bricks.forEach(b => b.draw(this.ctx, this.game));
            this.ctx.restore();
        } else if (this.game.state !== 'CLEAR') {
            this.game.entities.bricks.forEach(b => b.draw(this.ctx, this.game));
        }
        
        this.game.entities.items.forEach(it => it.draw(this.ctx, this.game));
        if (this.game.entities.paddle) this.game.entities.paddle.draw(this.ctx, this.game);
        this.game.entities.balls.forEach(ball => ball.draw(this.ctx, this.game));
        this.game.entities.particles.forEach(p => p.draw(this.ctx, this.game));

        // Draw notices (luxury English one-word labels)
        this.game.entities.notices.forEach(n => {
            this.ctx.save();
            const headerHeight = this.game.headerHeight || 135;
            // Center between top of play area (header) and paddle
            const centerY = this.game.entities.paddle ? (headerHeight + this.game.entities.paddle.y) / 2 : this.canvas.height / 2;
            
            this.ctx.globalAlpha = Math.max(0, n.alpha);
            this.ctx.fillStyle = theme.getColor('uiNoticeText');
            this.ctx.shadowBlur = 20;
            this.ctx.shadowColor = theme.getColor('uiNoticeShadow');
            this.ctx.font = '900 32px Outfit';
            if (this.ctx.letterSpacing !== undefined) {
                this.ctx.letterSpacing = '6px';
            }
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            // Allow override if specifically set, else use centralized Y
            const drawY = n.useFixedY ? n.y : centerY;
            this.ctx.fillText(n.text.toUpperCase(), this.canvas.width / 2, drawY);
            this.ctx.restore();
        });

        // Draw READY? during launch delay
        if (this.game.launchTimer > 0) {
            this.ctx.save();
            const isLastStage = (this.game.gameState.level === 100);
            
            this.ctx.fillStyle = isLastStage ? theme.getColor('uiLastStageText') : theme.getColor('uiReadyText');
            this.ctx.font = '900 64px Outfit';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.shadowBlur = isLastStage ? 40 : 30;
            this.ctx.shadowColor = isLastStage ? theme.getColor('uiLastStageShadow') : theme.getColor('uiReadyShadow');
            
            if (this.ctx.letterSpacing !== undefined) {
                this.ctx.letterSpacing = '10px';
            }
            
            if (isLastStage) {
                this.ctx.fillText("LAST", this.canvas.width / 2, this.canvas.height / 2 - 40);
                this.ctx.fillText("STAGE", this.canvas.width / 2, this.canvas.height / 2 + 40);
            } else {
                this.ctx.fillText("READY?", this.canvas.width / 2, this.canvas.height / 2);
            }
            this.ctx.restore();
        }

        this.ctx.restore();
    }
}
