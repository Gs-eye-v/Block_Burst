/**
 * Paddle Class
 */
export class Paddle {
    constructor(game, canvasW, canvasH) {
        this.game = game;
        // Strictly 0.8x of 20% width (Ensuring minimum width of 40 for stability)
        this.baseWidth = Math.max(40, (canvasW * 0.20) * 0.8); 
        if (this.baseWidth > 96) this.baseWidth = 96;
        
        this.expandStage = game.gameState.carryExpandStage || 0;
        this.expandTimer = game.gameState.carryExpandTimer || 0;
        this.isExpanded = this.expandStage > 0;
        
        // expandStageに基づいて初期幅を正しく設定する
        if (this.expandStage === 1) {
            this.width = Math.min(this.baseWidth * 1.5, canvasW * 0.35);
        } else if (this.expandStage === 2) {
            this.width = Math.min(this.baseWidth * 2.0, canvasW * 0.45);
        } else {
            this.width = this.baseWidth;
        }

        this.height = Math.max(15, this.width * 0.18);
        this.x = (canvasW - this.width) / 2;
        this.y = canvasH - 70; 
        this.speed = canvasW * 0.018; 
        this.visualTimer = 0;
    }

    resetSize() {
        this.expandStage = 0;
        this.expandTimer = 0;
        this.isExpanded = false;
        this.width = this.baseWidth;
    }
    update(canvasW, timeScale, dt) {
        const sm = this.game.speedMultiplier || 1.0;
        // Paddle expand duration
        if (this.expandTimer > 0) {
            this.expandTimer -= (dt / 1000) * sm;
            if (this.expandTimer <= 0) {
                if (this.expandStage === 2) {
                    // Gradual shrinking: Stage 2 -> Stage 1 (15s)
                    this.expandStage = 1;
                    this.expandTimer = 15;
                } else {
                    // Stage 1 -> Stage 0
                    this.expandTimer = 0;
                    this.expandStage = 0;
                    this.isExpanded = false;
                }
            }
        }
        
        this.visualTimer += dt * sm;

        const oldWidth = this.width;

        // ステージに基づいて幅を決定 (Strict logic: width is calculated from baseWidth)
        let targetWidth = this.baseWidth;
        if (this.expandStage === 1) {
            targetWidth = Math.min(this.baseWidth * 1.5, canvasW * 0.35);
        } else if (this.expandStage === 2) {
            targetWidth = Math.min(this.baseWidth * 2.0, canvasW * 0.45);
        }

        // 中心を軸にサイズを変更するためx座標を調整
        this.x -= (targetWidth - oldWidth) / 2;
        this.width = targetWidth;

        // Allow arrow keys in any control mode if they are being used
        if (this.moveLeft) this.x -= this.speed * timeScale;
        if (this.moveRight) this.x += this.speed * timeScale;
        
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > canvasW) this.x = canvasW - this.width;
    }
    reposition(oldW, oldH, newW, newH) {
        const relX = this.x / Math.max(1, oldW - this.width);
        
        // Use strictly defined 0.8x base
        this.baseWidth = Math.max(40, (newW * 0.20) * 0.8);
        if (this.baseWidth > 96) this.baseWidth = 96;

        if (this.expandStage === 1) {
            this.width = Math.min(this.baseWidth * 1.5, newW * 0.35);
        } else if (this.expandStage === 2) {
            this.width = Math.min(this.baseWidth * 2.0, newW * 0.45);
        } else {
            this.width = this.baseWidth;
        }

        this.height = Math.max(15, this.width * 0.18);
        this.x = relX * (newW - this.width);
        this.y = newH - (oldH - this.y);
        this.speed = newW * 0.018;
    }
    updatePosition(mouseX) { this.x = mouseX - this.width / 2; }
    expand() { 
        if (this.expandStage === 0) {
            this.expandStage = 1;
            this.expandTimer = 15;
        } else if (this.expandStage === 1) {
            this.expandStage = 2;
            this.expandTimer = 10;
        } else if (this.expandStage === 2) {
            this.expandTimer = 10;
        }
        this.isExpanded = true;
    }
    draw(ctx, game) {
        ctx.save();
        
        // Flashing effect for end of Expand (last 3s)
        // Standard Blinking effect (last 3s)
        // Standard Blinking effect (last 2s)
        if (this.expandTimer > 0 && this.expandTimer <= 2.0) {
            ctx.globalAlpha = 0.5 + Math.sin(this.visualTimer * 0.02) * 0.5;
        }

        const theme = this.game.themeManager;
        const radius = Math.min(this.height / 2, this.width / 2);
        const isNeon = theme.currentThemeName === 'neon';

        if (isNeon) {
            // Realistic Cyber-style Fluorescent Paddle
            
            // 1. 周囲への柔らかな光（Misty Atmosphere Glow）
            ctx.shadowColor = theme.getColor('paddleShadow');
            ctx.shadowBlur = 35;
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            ctx.roundRect(this.x - 2, this.y - 2, this.width + 4, this.height + 4, radius + 2);
            ctx.fillStyle = theme.getColor('paddleShadow');
            ctx.fill();

            // 2. 外装：高彩度なネオン管（Vibrant Saturated Outer Block）
            ctx.globalAlpha = 1.0;
            ctx.shadowBlur = 0; // 一旦リセット
            const outerGrad = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
            outerGrad.addColorStop(0, theme.getColor('paddleFill'));
            outerGrad.addColorStop(1, theme.getColor('paddleShadow'));
            
            ctx.beginPath();
            ctx.roundRect(this.x, this.y, this.width, this.height, radius);
            ctx.fillStyle = outerGrad;
            ctx.fill();

            // 3. 質感の追加（Frosted Acrylic Texture / Surface Imperfections）
            ctx.globalCompositeOperation = 'overlay';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            for (let i = 0; i < 5; i++) {
                const rx = this.x + Math.random() * this.width;
                const ry = this.y + Math.random() * this.height;
                ctx.fillRect(rx, ry, 2, 1);
            }
            ctx.globalCompositeOperation = 'source-over';

            // 4. ✨発光コア：限定された白飛びコア（Inner Core）✨
            // 眩しすぎない、定義された「芯」の表現
            const corePaddingH = this.height * 0.35;
            const corePaddingW = radius;
            const coreH = this.height - corePaddingH * 2;
            const coreW = this.width - corePaddingW * 2;
            
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#FFFFFF';
            ctx.beginPath();
            ctx.roundRect(this.x + corePaddingW, this.y + corePaddingH, coreW, coreH, coreH / 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fill();

            // 5. 外周のハイライト（Outer Rim Highlight）
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = 1;
            ctx.stroke();

        } else if (theme.currentThemeName === 'sweets') {
            // Sweets Design: チョコがけエクレア
            // 1. クッキーベース
            ctx.beginPath();
            ctx.roundRect(this.x, this.y, this.width, this.height, radius);
            ctx.fillStyle = theme.getColor('paddleFill');
            ctx.fill();

            // 2. チョコがけアイシング
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(this.x, this.y, this.width, this.height * 0.6, radius);
            ctx.clip();
            
            ctx.fillStyle = theme.getColor('paddleStroke');
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x, this.y + this.height * 0.5);
            for (let i = 0; i <= this.width; i += 10) {
                const waveY = Math.sin(i * 0.2) * 4;
                ctx.lineTo(this.x + i, this.y + this.height * 0.5 + waveY);
            }
            ctx.lineTo(this.x + this.width, this.y);
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            // 3. アイシングのツヤ
            ctx.beginPath();
            ctx.roundRect(this.x + radius, this.y + 4, this.width - radius * 2, 3, 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fill();

        } else {
            // Clean Neon Cyan Aesthetic
            ctx.fillStyle = theme.getColor('paddleFill');
            ctx.shadowBlur = 20;
            ctx.shadowColor = theme.getColor('paddleShadow');

            ctx.beginPath();
            ctx.roundRect(this.x, this.y, this.width, this.height, radius);
            ctx.fill();

            // Subtle Glossy highlight
            ctx.beginPath();
            ctx.roundRect(this.x + radius, this.y + 4, this.width - radius * 2, this.height * 0.25, 2);
            ctx.fillStyle = theme.getColor('paddleHighlight');
            ctx.fill();

            // Bright Stroke
            ctx.strokeStyle = theme.getColor('paddleStroke');
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        // Enchantment Glow (Orange Pulse)
        if (this.game && this.game.pierceCharges > 0) {
            ctx.beginPath();
            ctx.roundRect(this.x - 4, this.y - 4, this.width + 8, this.height + 8, 12);
            const pulseAlpha = 0.4 + Math.sin(this.visualTimer / 150) * 0.2;
            ctx.strokeStyle = theme.getColor('paddlePiercePulse').replace('0.4', pulseAlpha.toString());
            ctx.lineWidth = 4;
            ctx.stroke();
            
            // Sparkles
            for(let i=0; i<3; i++) {
                const sx = this.x + Math.random() * this.width;
                const sy = this.y + Math.random() * this.height;
                ctx.fillStyle = theme.getColor('paddleSparkle');
                ctx.fillRect(sx, sy, 2, 2);
            }
        }

        ctx.restore();
    }
}
