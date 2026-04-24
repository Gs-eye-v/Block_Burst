/**
 * Item Class
 */
export class Item {
    constructor(x, y, game) {
        this.x = x; this.y = y; this.radius = 12; this.speed = 2.5;

        // Dynamic weights based on shield presence
        let pierceWeight = 5;
        let explosionWeight = 4;
        if (game && game.entities.bricks && game.entities.bricks.some(b => b.hasShield)) {
            pierceWeight = 15; // 3x base
            explosionWeight = 12; // 3x base
        }

        // Weighted selection for Item drops (Difficulty Hardening)
        const weights = [
            { type: 'EXPAND', weight: 8 },
            { type: 'MULTIBALL', weight: 10 },
            { type: 'PIERCE', weight: pierceWeight },
            { type: 'SLOW', weight: 2.5 }, // Reduced from 5
            { type: 'EXPLOSION', weight: explosionWeight },
            { type: 'LIFE', weight: 1 }
        ];

        const totalWeight = weights.reduce((acc, w) => acc + w.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const w of weights) {
            if (random < w.weight) {
                this.type = w.type;
                break;
            }
            random -= w.weight;
        }

        if (!this.type) this.type = 'MULTIBALL'; // Fallback
        const theme = game.themeManager;
        switch (this.type) {
            case 'EXPAND': this.color = theme.getColor('itemExpand'); this.label = 'EX'; break;
            case 'MULTIBALL': this.color = theme.getColor('itemMultiball'); this.label = 'MU'; break;
            case 'LIFE': this.color = theme.getColor('itemLife'); this.label = '1'; break;
            case 'PIERCE': this.color = theme.getColor('itemPierce'); this.label = 'PI'; break;
            case 'SLOW': this.color = theme.getColor('itemSlow'); this.label = 'SL'; break;
            case 'EXPLOSION': this.color = '#FF8C00'; this.label = '💥'; break;
        }
    }
    update(timeScale, game) { 
        let speedMultiplier = (game && game.slowTimer > 0) ? 0.5 : 1.0;
        this.y += this.speed * timeScale * speedMultiplier; 
    }
    draw(ctx, game) {
        ctx.save();
        
        const slowTimer = game ? game.slowTimer : 0;
        if (slowTimer > 0 && slowTimer <= 2.0) {
            ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.02) * 0.5;
        }

        const theme = game.themeManager;
        const isDefault = (theme.currentThemeName === 'default');

        // Sweets Theme Specific: Various Treats
        if (theme.currentThemeName === 'sweets') {
            ctx.save();
            ctx.translate(this.x, this.y);
            
            switch (this.type) {
                case 'EXPAND': // ドーナツ (Donut)
                    ctx.fillStyle = '#D2691E'; // Dough
                    ctx.beginPath();
                    ctx.arc(0, 0, this.radius * 1.2, 0, Math.PI * 2);
                    ctx.fill();
                    // アイシング
                    ctx.fillStyle = '#FF69B4'; 
                    ctx.beginPath();
                    ctx.arc(0, 0, this.radius * 1.1, 0, Math.PI * 2);
                    ctx.fill();
                    // 穴
                    ctx.globalCompositeOperation = 'destination-out';
                    ctx.beginPath();
                    ctx.arc(0, 0, this.radius * 0.4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.globalCompositeOperation = 'source-over';
                    // カラースプレー
                    for(let i=0; i<5; i++) {
                        ctx.fillStyle = ['#FFF', '#FF0', '#0FF'][i%3];
                        ctx.fillRect(Math.cos(i)*8, Math.sin(i)*8, 4, 2);
                    }
                    break;

                case 'MULTIBALL': // マカロン (Macaron)
                    ctx.fillStyle = '#ADD8E6'; // Soda Blue
                    ctx.beginPath();
                    ctx.ellipse(0, -4, this.radius * 1.3, this.radius * 0.7, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.ellipse(0, 4, this.radius * 1.3, this.radius * 0.7, 0, 0, Math.PI * 2);
                    ctx.fill();
                    // クリーム
                    ctx.fillStyle = '#FFF';
                    ctx.fillRect(-this.radius * 1.1, -2, this.radius * 2.2, 4);
                    break;

                case 'LIFE': // ショートケーキ (Shortcake)
                    ctx.fillStyle = '#FFF'; // Sponge/Cream
                    ctx.beginPath();
                    ctx.moveTo(-15, 10);
                    ctx.lineTo(15, 10);
                    ctx.lineTo(0, -15);
                    ctx.closePath();
                    ctx.fill();
                    // いちご
                    ctx.fillStyle = '#FF0000';
                    ctx.beginPath();
                    ctx.arc(0, -10, 5, 0, Math.PI * 2);
                    ctx.fill();
                    break;

                case 'PIERCE': // たい焼き (Taiyaki)
                    ctx.fillStyle = '#D2691E';
                    ctx.beginPath();
                    ctx.ellipse(0, 0, this.radius * 1.4, this.radius * 0.9, 0, 0, Math.PI * 2);
                    ctx.fill();
                    // 尾ひれ
                    ctx.beginPath();
                    ctx.moveTo(-this.radius * 1.2, 0);
                    ctx.lineTo(-this.radius * 1.8, -8);
                    ctx.lineTo(-this.radius * 1.8, 8);
                    ctx.closePath();
                    ctx.fill();
                    // 目
                    ctx.fillStyle = '#3E2723';
                    ctx.beginPath();
                    ctx.arc(this.radius * 0.8, -2, 2, 0, Math.PI * 2);
                    ctx.fill();
                    break;

                case 'SLOW': // キャンディ (Candy)
                    ctx.fillStyle = '#98FB98'; // Mint
                    ctx.beginPath();
                    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
                    ctx.fill();
                    // 包み紙
                    ctx.beginPath();
                    ctx.moveTo(-this.radius, 0);
                    ctx.lineTo(-this.radius * 1.6, -10);
                    ctx.lineTo(-this.radius * 1.6, 10);
                    ctx.closePath();
                    ctx.fill();
                    ctx.beginPath();
                    ctx.moveTo(this.radius, 0);
                    ctx.lineTo(this.radius * 1.6, -10);
                    ctx.lineTo(this.radius * 1.6, 10);
                    ctx.closePath();
                    ctx.fill();
                    break;

                case 'EXPLOSION': // 爆弾ドーナツ (Chocolate Donut)
                    ctx.fillStyle = '#3E2723'; // Dark Chocolate
                    ctx.beginPath();
                    ctx.arc(0, 0, this.radius * 1.2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#FF4500'; // Orange drizzle
                    ctx.beginPath();
                    ctx.arc(0, 0, this.radius * 0.5, 0, Math.PI * 2);
                    ctx.fill();
                    break;
            }
            ctx.restore();

        } else {
            const w = this.radius * 2.2, h = this.radius * 1.5, x = -w / 2, y = -h / 2, r = h / 2;
            ctx.save();
            ctx.translate(this.x, this.y);
            // Kawaii Jewel Capsule Background
            ctx.beginPath();
            ctx.roundRect(x, y, w, h, r);
            ctx.globalAlpha = 0.85;
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.globalAlpha = 1.0;
            
            // Default Theme Specific: Candy Gloss Highlight
            if (isDefault) {
                ctx.beginPath();
                // Crescent-shaped gloss on top
                ctx.ellipse(0, y + h * 0.35, w * 0.35, h * 0.25, 0, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.fill();
            }
            
            // Style parameters
            ctx.shadowBlur = isDefault ? 8 : 15;
            ctx.shadowColor = isDefault ? 'rgba(0, 0, 0, 0.2)' : this.color;
            
            // Shiny White Stroke
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = isDefault ? 2 : 2.5;
            ctx.stroke();
            ctx.restore();
        }

        // Label (White text with thin outline for visibility)
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 13px Outfit';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Thin outline for text to handle overlapping colors
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 2;
        ctx.strokeText(this.label, this.x, this.y);
        ctx.fillText(this.label, this.x, this.y);
        
        ctx.restore();
    }
}
