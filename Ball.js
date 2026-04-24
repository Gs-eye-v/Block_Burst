/**
 * Ball Class
 */
export class Ball {
    constructor(game, x, y, speed, vx = 0, vy = 0) {
        this.game = game;
        this.x = x; this.y = y; 
        this.radius = Math.max(6, game.canvas.width * 0.015); 
        this.speed = speed;
        this.vx = vx; this.vy = vy; this.isPiercing = false;
        this.pierceTimer = 0;
        this.pierceStacks = 0;
        this.isStuck = false; this.stuckX = 0; this.trail = [];
        
        // New State for Explosion Ball
        this.hasExplosionCharge = false;
        this.isExploding = false;
        this.isCharging = false;
        this.chargeTimer = 0;
        
        this.visualTimer = 0;
        this.collisionHistory = []; // For stack prevention
    }
    launch() {
        const a = (Math.random() * Math.PI / 4) - Math.PI / 8;
        this.vx = this.speed * Math.sin(a);
        this.vy = -this.speed * Math.cos(a);
        this.enforceVeloLimits(this.speed);
    }
    enforceVeloLimits(targetSpeed) {
        // Prevent near-perfect vertical/horizontal movement (stuck avoidance)
        const minV = targetSpeed * 0.15;
        if (Math.abs(this.vx) < minV) this.vx = minV * (this.vx < 0 ? -1 : 1);
        if (Math.abs(this.vy) < minV) this.vy = minV * (this.vy < 0 ? -1 : 1);

        // Normalize speed to targetSpeed exactly
        let currentSpeed = Math.sqrt(this.vx ** 2 + this.vy ** 2);
        
        // Anti-NaN Safety: If velocity is corrupted, reset to default upward launch
        if (isNaN(this.vx) || isNaN(this.vy) || currentSpeed === 0) {
            this.vx = 0;
            this.vy = -targetSpeed;
            currentSpeed = targetSpeed;
        }

        if (currentSpeed > 0) {
            this.vx = (this.vx / currentSpeed) * targetSpeed;
            this.vy = (this.vy / currentSpeed) * targetSpeed;
        }
    }
    update(canvasW, canvasH, timeScale, dt) {
        const sm = this.game.speedMultiplier || 1.0;
        if (this.pierceTimer > 0) {
            this.pierceTimer -= (dt / 1000) * sm;
            if (this.pierceTimer <= 0) {
                // Stack consumption logic
                if (this.pierceStacks > 0) {
                    this.pierceStacks--;
                    this.pierceTimer = 10;
                    this.isPiercing = true;
                } else {
                    this.pierceTimer = 0;
                    this.isPiercing = false;
                }
            } else {
                this.isPiercing = true;
            }
        }
        
        this.visualTimer += dt * sm;

        if (this.isPiercing) {
            this.trail.push({ x: this.x, y: this.y, p: true });
            if (this.trail.length > 12) this.trail.shift();
        } else {
            if (this.trail.length > 0) this.trail.shift();
        }

        let speedMultiplier = (this.game && this.game.slowTimer > 0) ? 0.5 : 1.0;

        this.x += this.vx * timeScale * speedMultiplier; 
        this.y += this.vy * timeScale * speedMultiplier;
        if (this.x - this.radius < 0 || this.x + this.radius > canvasW) {
            this.vx *= -1; this.x = (this.x - this.radius < 0) ? this.radius : canvasW - this.radius;
            if (this.game) {
                this.game.sounds.hitWall();
                this.enforceVeloLimits(this.speed);
            }
        }
        const ceiling = this.game.headerHeight || 0;
        if (this.y - this.radius < ceiling) {
            this.vy *= -1; this.y = ceiling + this.radius;
            if (this.game) {
                this.game.sounds.hitWall();
                this.enforceVeloLimits(this.speed);
            }
        }

        // Charge Explosion Logic: Locked to Paddle
        if (this.isCharging) {
            const paddle = this.game.entities.paddle;
            if (paddle) {
                this.x = paddle.x + paddle.width / 2;
                this.y = paddle.y - this.radius - 2;
                this.vx = 0;
                this.vy = 0;
            }
            this.chargeTimer -= (dt / 1000) * sm;
            if (this.chargeTimer <= 0) {
                this.isCharging = false;
                this.isExploding = true;
                this.vx = 0;
                this.vy = -this.speed;
                if (this.vy === 0) this.vy = -5; // Safety fallback
                if (this.game.sounds) this.game.sounds.playLaunch();
            }
        }
    }
    bounceFromPaddle(hitPos) {
        const a = hitPos * Math.PI * 0.42;
        this.vx = this.speed * Math.sin(a);
        this.vy = -this.speed * Math.cos(a);
        this.enforceVeloLimits(this.speed);
    }
    syncSpeed(multiplier) {
        const s = Math.sqrt(this.vx ** 2 + this.vy ** 2);
        if (s > 0) { const r = (this.speed * multiplier) / s; this.vx *= r; this.vy *= r; }
    }
    reposition(oldW, oldH, newW, newH) {
        const relX = this.x / oldW;
        const relY = this.y / oldH;
        this.x = relX * newW;
        this.y = relY * newH;
        this.radius = Math.max(6, newW * 0.015);
        const ratio = newW / oldW;
        this.speed *= ratio;
        this.vx *= ratio;
        this.vy *= ratio;
    }
    draw(ctx, game) {
        ctx.save();
        
        // Flashing effect for Slow Ball (last 3s)
        // Standard Blinking effect for Slow or Pierce (last 3s)
        const slowTimer = this.game ? this.game.slowTimer : 0;
        if ((this.pierceTimer > 0 && this.pierceTimer <= 2.0) || (slowTimer > 0 && slowTimer <= 2.0) || this.hasExplosionCharge || this.isCharging) {
            ctx.globalAlpha = 0.5 + Math.sin(this.visualTimer * 0.02) * 0.5;
        }

        const theme = this.game.themeManager;

        // Trailing Effekt
        this.trail.forEach((p, i) => {
            ctx.beginPath(); ctx.arc(p.x, p.y, this.radius * (i / 12), 0, Math.PI * 2);
            if (p.p) {
                // Fire Trail for Pierce
                ctx.fillStyle = theme.getColor('ballPierceTrail').replace('0.2', (0.2 * (i / 12)).toString());
            } else {
                ctx.fillStyle = theme.getColor('ballTrail');
            }
            ctx.fill();
        });

        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        if (this.isPiercing) {
            // "Fireball" Aesthetic
            const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
            grad.addColorStop(0, theme.getColor('ballPierceCenter'));
            grad.addColorStop(0.3, theme.getColor('ballPierceMid'));
            grad.addColorStop(1, theme.getColor('ballPierceOuter'));
            ctx.fillStyle = grad;
            ctx.shadowBlur = 20;
            ctx.shadowColor = theme.getColor('ballPierceOuter');
        } else if (this.isExploding || this.isCharging) {
            // Explosion Charge Visual: Pulsing size if charging
            let pulseSize = 0;
            if (this.isCharging) {
                pulseSize = Math.sin(this.visualTimer * 0.05) * 3;
            }
            
            const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius + pulseSize);
            grad.addColorStop(0, '#FFFFFF');
            grad.addColorStop(0.5, '#FFD700');
            grad.addColorStop(1, '#FF4500');
            ctx.fillStyle = grad;
            ctx.shadowBlur = 25 + pulseSize;
            ctx.shadowColor = '#FF4500';
            
            if (this.isCharging) {
                // Sparks during charge
                for (let i = 0; i < 2; i++) {
                    const sx = this.x + (Math.random() - 0.5) * 30;
                    const sy = this.y + (Math.random() - 0.5) * 30;
                    ctx.fillStyle = '#FFD700';
                    ctx.fillRect(sx, sy, 2, 2);
                }
            }
        } else if (theme.currentThemeName === 'sweets') {
            // Sweets Design: ストライプ模様のキャンディ / ガムボール
            ctx.save();
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.clip();

            // ベース色（ポップな水色やピンク）
            ctx.fillStyle = '#ADD8E6'; // Soda color
            ctx.fill();

            // ストライプ模様
            ctx.strokeStyle = '#FFB6C1'; // Strawberry pink
            ctx.lineWidth = 4;
            ctx.beginPath();
            for (let i = -this.radius; i < this.radius * 2; i += 8) {
                ctx.moveTo(this.x - this.radius + i, this.y - this.radius);
                ctx.lineTo(this.x - this.radius + i - 10, this.y + this.radius);
            }
            ctx.stroke();
            ctx.restore();

            // ツヤ（金平糖のような光沢）
            ctx.beginPath();
            ctx.arc(this.x - this.radius * 0.4, this.y - this.radius * 0.4, this.radius * 0.3, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fill();
            
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#FFFFFF';
            ctx.stroke();
        } else {
            ctx.fillStyle = theme.getColor('ballFill');
            ctx.shadowBlur = 8;
            ctx.shadowColor = theme.getColor('ballShadow');
            ctx.fill();
        }
        ctx.lineWidth = 2;
        ctx.strokeStyle = this.isPiercing ? theme.getColor('ballPierceOuter') : theme.getColor('ballStroke');
        ctx.stroke();
        ctx.restore();
    }
}
