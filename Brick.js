import { shadeColor } from './utils.js';

/**
 * Brick Class
 */
export class Brick {
    constructor(x, y, w, h, color, type = 1, isGhost = false, isMoving = false, hasShield = false) {
        this.x = x; this.y = y; this.w = w; this.h = h; this.color = color;
        this.type = type;
        this.isGhost = isGhost;
        this.isMoving = isMoving;
        this.hasShield = hasShield;
        
        // Horizontal movement only by default (High speed challenge)
        this.vx = isMoving ? (Math.random() > 0.5 ? 360 : -360) : 0;
        this.vy = 0;
        this.moveTimer = 0; // For visual pulsing/thrusters
        
        // Block Type Logic
        this.isIndestructible = (type === 9 || type === 10);
        this.isGuaranteedItem = (type === 8);
        
        if (this.isIndestructible) {
            this.health = 1;
        } else if (type === 11) {
            this.health = 1;
            this.color = '#A0A0A0'; // Gray for Mirage (Keep as fallback, but draw uses theme)
        } else if (type >= 1 && type <= 5) {
            this.health = type;
        } else if (type === 6 || type === 8) {
            this.health = 1;
        } else if (type === 7) {
            this.health = 999; // Infinite until transformed
            this.chameleonIndex = 0;
            this.chameleonCycle = [1, 6, 8];
        } else {
            this.health = 1;
        }

        this.hitTimer = 0;
        this.hasDroppedItem = false;
        this.isIgnited = false;
        this.fuseTimer = 500;
    }

    update(dt, canvasWidth, game) {
        if (!game || game.state !== 'PLAYING') return;

        if (this.isMoving) {
            this.x += this.vx * (dt / 1000);
            this.moveTimer += dt / 1000;

            // Bounce off edges
            if (this.x < 0) {
                this.x = 0;
                this.vx = Math.abs(this.vx);
            } else if (this.x + this.w > canvasWidth) {
                this.x = canvasWidth - this.w;
                this.vx = -Math.abs(this.vx);
            }
        }
    }

    draw(ctx, game) {
        ctx.save();

        if (this.isIgnited) {
            // Shake effect
            const shakeX = (Math.random() - 0.5) * 4;
            const shakeY = (Math.random() - 0.5) * 4;
            ctx.translate(shakeX, shakeY);
        }
        
        let currentAlpha = 1.0;

        // Mirage Visibility (Type 11)
        if (this.type === 11) {
            const gameRef = game || this.game;
            let minDist = Infinity;
            if (gameRef && gameRef.balls) {
                gameRef.balls.forEach(b => {
                    const d = Math.hypot(b.x - (this.x + this.w / 2), b.y - (this.y + this.h / 2));
                    if (d < minDist) minDist = d;
                });
            }
            const visibilityRange = 180;
            if (minDist > visibilityRange) {
                currentAlpha = 0;
            } else {
                currentAlpha = 1 - (minDist / visibilityRange);
            }
        }
        
        ctx.globalAlpha = currentAlpha;

        const theme = game.themeManager;
        let c = this.color;
        if (this.hitTimer > 0) {
            c = theme.getColor('brickHitFlash');
            this.hitTimer--;
        }

        if (this.isGhost) {
            ctx.restore();
            return;
        }

        // 1. Shield Aura (S) - Drawn outside the clip
        if (this.hasShield) {
            const pulse = (Math.sin(Date.now() / 200) * 0.2 + 0.8);
            ctx.save();
            ctx.beginPath();
            ctx.arc(this.x + this.w / 2, this.y + this.h / 2, Math.max(this.w, this.h) * 0.7, 0, Math.PI * 2);
            const shieldGrad = ctx.createRadialGradient(this.x + this.w / 2, this.y + this.h / 2, this.w * 0.4, this.x + this.w / 2, this.y + this.h / 2, this.w * 0.8);
            shieldGrad.addColorStop(0, theme.getColor('transparentCyan'));
            shieldGrad.addColorStop(0.7, theme.getColor('brickShieldOuter').replace('0.4', (0.4 * pulse).toString()));
            shieldGrad.addColorStop(1, theme.getColor('transparentCyan'));
            ctx.fillStyle = shieldGrad;
            ctx.fill();
            
            // Hexagon bits
            const bitAlpha = 0.2 * pulse;
            ctx.strokeStyle = theme.getColor('brickShieldHex').replace('0.2', bitAlpha.toString());
            ctx.lineWidth = 1;
            for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI * 2) / 6 + Date.now() / 1000;
                const rx = this.x + this.w / 2 + Math.cos(angle) * this.w * 0.6;
                const ry = this.y + this.h / 2 + Math.sin(angle) * this.h * 0.6;
                ctx.beginPath();
                ctx.arc(rx, ry, 3, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.restore();
        }

        // 2. Thrusters (M)
        if (this.isMoving) {
            ctx.save();
            ctx.shadowBlur = 10;
            ctx.shadowColor = theme.getColor('brickThruster');
            ctx.fillStyle = (Math.random() > 0.3) ? theme.getColor('white') : theme.getColor('brickThruster');
            const flicker = Math.random() * 5;
            if (this.vx > 0) {
                // Moving Right: Engine on left
                ctx.fillRect(this.x - 3, this.y + 4, 3, this.h - 8);
                ctx.fillRect(this.x - 6 - flicker, this.y + this.h / 2 - 2, 6, 4);
            } else {
                // Moving Left: Engine on right
                ctx.fillRect(this.x + this.w, this.y + 4, 3, this.h - 8);
                ctx.fillRect(this.x + this.w + flicker, this.y + this.h / 2 - 2, 6, 4);
            }
            ctx.restore();
        }

        // All blocks have rounded corners
        const cornerRadius = 10;

        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.w, this.h, cornerRadius);
        
        // Item Cache Glow (Type 8)
        if (this.isGuaranteedItem) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = theme.getColor('brickItemGlow'); // Sparkle Gold
        } else if (this.type === 6) {
            ctx.shadowBlur = 10 + Math.sin(Date.now() / 100) * 5;
            ctx.shadowColor = theme.getColor('brickBombGlow');
        }

        ctx.clip(); 

        if (this.type === 9) {
            // Type 9: Metal / Steel Style (Brushed Metal)
            const metalGrad = ctx.createLinearGradient(this.x, this.y, this.x + this.w, this.y + this.h);
            metalGrad.addColorStop(0, theme.getColor('brickMetalTop'));
            metalGrad.addColorStop(0.4, theme.getColor('brickMetalMid'));
            metalGrad.addColorStop(0.6, theme.getColor('brickMetalMid'));
            metalGrad.addColorStop(1, theme.getColor('brickMetalBottom'));
            ctx.fillStyle = metalGrad;
            ctx.fill();

            // Brushed Metal Texture Lines
            ctx.strokeStyle = theme.getColor('brickMetalLines');
            ctx.lineWidth = 1;
            for (let i = 4; i < this.h; i += 4) {
                ctx.beginPath();
                ctx.moveTo(this.x + 2, this.y + i);
                ctx.lineTo(this.x + this.w - 2, this.y + i);
                ctx.stroke();
            }
        } else if (this.type === 10) {
            // Type 10: Black Hole Vortex
            const grad = ctx.createRadialGradient(this.x + this.w / 2, this.y + this.h / 2, 0, this.x + this.w / 2, this.y + this.h / 2, this.w);
            grad.addColorStop(0, theme.getColor('brickBlackHoleCenter'));
            grad.addColorStop(0.4, theme.getColor('brickBlackHoleMid'));
            grad.addColorStop(0.8, theme.getColor('brickBlackHoleOuter'));
            grad.addColorStop(1, theme.getColor('brickBlackHoleCenter'));
            ctx.fillStyle = grad;
            ctx.fill();
            
            // Spinning swirl effect
            ctx.save();
            ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
            ctx.rotate(Date.now() / 200);
            ctx.strokeStyle = theme.getColor('brickBlackHoleSwirl');
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, this.h * 0.4, 0, Math.PI);
            ctx.stroke();
            ctx.restore();
            
        } else if (this.type === 6) {
            // Type 6: Bomb Block
            const grad = ctx.createRadialGradient(this.x + this.w / 2, this.y + this.h / 2, 0, this.x + this.w / 2, this.y + this.h / 2, this.w);
            
            if (this.isIgnited) {
                // Flash Red/White
                const flash = (Math.floor(Date.now() / 50) % 2 === 0);
                grad.addColorStop(0, flash ? theme.getColor('brickBombFlashWhite') : theme.getColor('brickBombFlashRed'));
                grad.addColorStop(1, flash ? theme.getColor('brickBombFlashRed') : theme.getColor('brickBombFlashDark'));
            } else {
                grad.addColorStop(0, theme.getColor('brickBombGold'));
                grad.addColorStop(0.5, theme.getColor('brickBombGlow'));
                grad.addColorStop(1, theme.getColor('brickBombFlashDark'));
            }
            ctx.fillStyle = grad;
            ctx.fill();
            
            ctx.fillStyle = theme.getColor('white');
            ctx.font = 'bold 16px Outfit';
            ctx.textAlign = 'center';
            ctx.fillText('💣', this.x + this.w / 2, this.y + this.h / 2 + 6);
            
        } else if (this.type === 7) {
            // Type 7: Chameleon (Rainbow Shift)
            const hue = (Date.now() / 10) % 360;
            ctx.fillStyle = `hsl(${hue}, 70%, 60%)`;
            ctx.fill();
            ctx.fillStyle = theme.getColor('brickGloss');
            ctx.font = 'bold 18px Outfit';
            ctx.textAlign = 'center';
            ctx.fillText('?', this.x + this.w / 2, this.y + this.h / 2 + 7);

        } else {
            // Standard Blocks (HP 1-5)
            const themeName = theme.currentThemeName;
            
            if (themeName === 'sweets') {
                // Sweets Design: マカロン (Macaron Block - Solid & Static)
                ctx.save();
                
                const bx = this.x;
                const by = this.y;
                const bw = this.w;
                const bh = this.h;

                // 1. 下のクッキー生地（厚みと影）
                ctx.fillStyle = shadeColor(c, -30);
                ctx.beginPath();
                ctx.roundRect(bx, by + bh * 0.55, bw, bh * 0.45, 10);
                ctx.fill();

                // 2. クリームの層 (中央にしっかりとした厚み)
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(bx + 1, by + bh * 0.4, bw - 2, bh * 0.25);
                
                // クリームのディテール（わずかな影）
                ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
                ctx.fillRect(bx + 1, by + bh * 0.6, bw - 2, 2);

                // 3. 上のクッキー生地
                ctx.fillStyle = c;
                ctx.beginPath();
                ctx.roundRect(bx, by, bw, bh * 0.55, 10);
                ctx.fill();

                // 4. マカロンのピエ（ふちのボコボコ感）
                ctx.fillStyle = shadeColor(c, -10);
                ctx.fillRect(bx, by + bh * 0.45, bw, bh * 0.1);

                // 5. 上面の光沢（美味しそうな質感）
                const shineGrad = ctx.createLinearGradient(bx, by, bx, by + bh * 0.3);
                shineGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
                shineGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
                ctx.fillStyle = shineGrad;
                ctx.beginPath();
                ctx.roundRect(bx + 5, by + 4, bw - 10, bh * 0.2, 5);
                ctx.fill();

                ctx.restore();
            } else if (themeName === 'neon') {
                // Neon Design: サイバー・蛍光灯ネオン風レンダリング (Multi-pass)
                // 1. 状態の保護
                ctx.save();

                // 2. 加算合成の有効化 (Cyberpunk Vibe)
                ctx.globalCompositeOperation = 'lighter';

                // 3. 強烈なブルーム（光の拡散）
                ctx.shadowColor = c;
                ctx.shadowBlur = 20; // 周囲の暗闇を照らす強烈なハロー効果

                // 4. 外周ガラス管（ベースカラー）の描画
                ctx.beginPath();
                ctx.roundRect(this.x, this.y, this.w, this.h, cornerRadius);
                ctx.fillStyle = c;
                ctx.fill();

                // 5. ✨蛍光灯のコア（白飛びする中心部）の描画（最重要）✨
                // 内部から発光しているリアルさを出すため、2-3px内側に縮小
                const padding = 2.5;
                ctx.shadowBlur = 15; // コア自体の光は抑えて中心の白を強調
                ctx.shadowColor = '#FFFFFF';
                ctx.globalAlpha = 0.9;
                ctx.beginPath();
                ctx.roundRect(this.x + padding, this.y + padding, this.w - padding * 2, this.h - padding * 2, cornerRadius - 1.5);
                ctx.fillStyle = '#FFFFFF'; // 純白の発光コア
                ctx.fill();

                // 6. 状態の復元
                ctx.restore();
            } else {
                // Default Design
                if (this.health >= 4) {
                    // HP 4, 5: Heavy Durability
                    const grad = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.h);
                    const baseDark = shadeColor(c, -40);
                    grad.addColorStop(0, shadeColor(c, 10));
                    grad.addColorStop(0.5, baseDark);
                    grad.addColorStop(1, shadeColor(c, -60));
                    ctx.fillStyle = grad;
                    ctx.fill();
                    
                    // Industrial Studs
                    ctx.fillStyle = theme.getColor('brickStuds');
                    ctx.beginPath();
                    ctx.arc(this.x + 8, this.y + 8, 2, 0, Math.PI * 2);
                    ctx.arc(this.x + this.w - 8, this.y + 8, 2, 0, Math.PI * 2);
                    ctx.arc(this.x + 8, this.y + this.h - 8, 2, 0, Math.PI * 2);
                    ctx.arc(this.x + this.w - 8, this.y + this.h - 8, 2, 0, Math.PI * 2);
                    ctx.fill();
                    
                    ctx.strokeStyle = theme.getColor('brickBorderHeavy');
                    ctx.lineWidth = 3;
                    ctx.strokeRect(this.x + 4, this.y + 4, this.w - 8, this.h - 8);

                } else if (this.health === 3) {
                    // HP 3: Luxury / Jewel Style
                    const grad = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.h);
                    grad.addColorStop(0, shadeColor(c, 20)); // Lighter top
                    grad.addColorStop(0.5, c);
                    grad.addColorStop(1, shadeColor(c, -30)); // Darker bottom
                    ctx.fillStyle = grad;
                    ctx.fill();

                    // High Gloss Highlight (Double)
                    ctx.beginPath();
                    ctx.ellipse(this.x + this.w * 0.25, this.y + this.h * 0.25, this.w * 0.2, this.h * 0.15, Math.PI / 4, 0, Math.PI * 2);
                    ctx.fillStyle = theme.getColor('brickGloss');
                    ctx.fill();
                    
                    ctx.beginPath();
                    ctx.ellipse(this.x + this.w * 0.7, this.y + this.h * 0.7, this.w * 0.1, this.h * 0.08, -Math.PI / 4, 0, Math.PI * 2);
                    ctx.fillStyle = theme.getColor('brickBorderLight').replace('0.25', '0.2');
                    ctx.fill();

                } else if (this.health === 2) {
                    // HP 2: Patterned / Candy Style
                    const darkerC = shadeColor(c, -10);
                    ctx.fillStyle = darkerC;
                    ctx.fill();

                    // Diagonal Stripe Pattern
                    ctx.strokeStyle = theme.getColor('brickBorderLight');
                    ctx.lineWidth = 4;
                    for (let i = -this.w; i < this.w + this.h; i += 12) {
                        ctx.beginPath();
                        ctx.moveTo(this.x + i, this.y);
                        ctx.lineTo(this.x + i + this.h, this.y + this.h);
                        ctx.stroke();
                    }

                    // Thick White Inner Border
                    ctx.strokeStyle = theme.getColor('brickBorderHeavy').replace('0.7', '0.6');
                    ctx.lineWidth = 2;
                    ctx.strokeRect(this.x + 2, this.y + 2, this.w - 4, this.h - 4);

                } else {
                    // HP 1: Simple / Jelly Style
                    const grad = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.h);
                    grad.addColorStop(0, c);
                    grad.addColorStop(1, shadeColor(c, -15));
                    ctx.fillStyle = grad;
                    ctx.fill();

                    // Simple Highlight
                    ctx.beginPath();
                    ctx.ellipse(this.x + this.w * 0.3, this.y + this.h * 0.3, this.w * 0.15, this.h * 0.1, Math.PI / 4, 0, Math.PI * 2);
                    ctx.fillStyle = theme.getColor('brickStuds');
                    ctx.fill();
                }
            }

            // Item Sparkle Effect (Type 8)
            if (this.isGuaranteedItem) {
                const pulse = Math.sin(Date.now() / 150) * 0.5 + 0.5;
                ctx.fillStyle = theme.getColor('itemSparkle').replace('1.0', pulse.toString());
                ctx.font = '14px Outfit';
                ctx.textAlign = 'center';
                ctx.fillText('★', this.x + this.w / 2, this.y + this.h / 2 + 5);
            }
        }

        // Global Outline
        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.w, this.h, cornerRadius);
        
        let outlineColor = theme.getColor('brickOutlineNormal');
        let lineWidth = 1;

        if (this.type === 9) {
            outlineColor = theme.getColor('brickOutlineMetal');
            lineWidth = 2;
        } else if (this.type === 10) {
            outlineColor = theme.getColor('brickOutlineBlackHole');
            lineWidth = 3;
        } else if (this.health >= 4) {
            outlineColor = theme.getColor('brickOutlineHP4');
            lineWidth = 4;
        } else if (this.health === 3) {
            outlineColor = theme.getColor('brickOutlineHP3');
            lineWidth = 3; // Thicker for hard blocks
        } else if (this.health === 2) {
            outlineColor = theme.getColor('brickOutlineHP2');
            lineWidth = 2;
        }

        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = lineWidth;
        ctx.stroke();

        ctx.globalAlpha = 1.0;
        ctx.restore();
    }

    /**
     * Chameleon transformation logic
     * Transforms into a random destructible block type based on the current level.
     */
    transform(currentLevel, game) {
        // Base allowed types: Normal blocks (1-5)
        let allowedTypes = [1, 2, 3, 4, 5];
        
        // Items (8) unlocked at level 25+
        if (currentLevel >= 25) {
            allowedTypes.push(8);
        }
        
        // Bombs (6) unlocked at level 50+
        if (currentLevel >= 50) {
            allowedTypes.push(6);
        }
        
        // Random selection with equal probability
        const newType = allowedTypes[Math.floor(Math.random() * allowedTypes.length)];
        this.type = newType;
        
        // Ensure properties and health are correctly set for the new type
        if (newType >= 1 && newType <= 5) {
            this.health = newType;
        } else {
            this.health = 1; // For Type 6 (Bomb), Type 8 (Item)
        }
        
        this.isGuaranteedItem = (newType === 8);
        this.isIndestructible = (newType === 9 || newType === 10);
        
        // Visual feedback
        this.updateAppearance(game);
        
        return newType;
    }

    /**
     * Update blocks visual state immediately after transformation
     */
    updateAppearance(game) {
        if (game && game.pastelColors) {
            // Re-assign a random pastel color so it stops being rainbow and gets a concrete identity
            this.color = game.pastelColors[Math.floor(Math.random() * game.pastelColors.length)];
        }
        this.hitTimer = 5; // Brief white flash
    }
}
