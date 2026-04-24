/**
 * Particle Class
 */
export class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y; this.color = color;
        this.vx = (Math.random() - 0.5) * 8; this.vy = (Math.random() - 0.5) * 8;
        this.radius = Math.random() * 3 + 1; this.alpha = 1.0;
    }
    update(timeScale) { this.x += this.vx * timeScale; this.y += this.vy * timeScale; this.alpha -= 0.02 * timeScale; }
    draw(ctx, game) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        const isSweets = game && game.themeManager && game.themeManager.currentThemeName === 'sweets';
        
        if (isSweets) {
            // Sweets Design: カラフルなスプレーチョコ（円形）
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}
