/**
 * ThemeManager: 管理ゲーム内のデザイン（色、影、演出用カラー）を一括管理するクラス
 */
export class ThemeManager {
    constructor(game) {
        this.game = game;
        this.currentThemeName = 'default';
        
        this.themes = {
            default: {
                // Ball
                ballFill: '#FFFDD0',
                ballStroke: '#FFB7B2',
                ballShadow: 'rgba(0,0,0,0.1)',
                ballTrail: 'rgba(255, 183, 178, 0.15)',
                ballPierceCenter: '#FFFFFF',
                ballPierceMid: '#FFD700',
                ballPierceOuter: '#FF4500',
                ballPierceTrail: 'rgba(255, 69, 0, 0.2)',

                // Paddle
                paddleFill: '#A0E8FF',
                paddleStroke: '#FFFFFF',
                paddleShadow: '#00F2FF',
                paddleHighlight: 'rgba(255, 255, 255, 0.4)',
                paddlePiercePulse: 'rgba(255, 100, 0, 0.4)',
                paddleSparkle: '#FF6A00',

                // Bricks
                brickHitFlash: '#FFFFFF',
                brickMirageGray: '#A0A0A0',
                brickShieldOuter: 'rgba(0, 255, 255, 0.4)',
                brickShieldHex: 'rgba(180, 255, 255, 0.2)',
                brickThruster: '#00FFFF',
                brickItemGlow: '#FFF5B7',
                brickBombGlow: '#FF4500',
                brickMetalTop: '#E0E0E0',
                brickMetalMid: '#A0A0A0',
                brickMetalBottom: '#606060',
                brickMetalLines: 'rgba(255, 255, 255, 0.1)',
                brickBlackHoleCenter: '#000000',
                brickBlackHoleMid: '#1A1A2E',
                brickBlackHoleOuter: '#4B0082',
                brickBlackHoleSwirl: 'rgba(255, 255, 255, 0.2)',
                brickBombFlashWhite: '#FFFFFF',
                brickBombFlashRed: '#FF0000',
                brickBombFlashDark: '#8B0000',
                brickBombGold: '#FFD700',
                brickGloss: 'rgba(255, 255, 255, 0.4)',
                brickStuds: 'rgba(255, 255, 255, 0.3)',
                brickBorderHeavy: 'rgba(255, 255, 255, 0.7)',
                brickBorderMedium: 'rgba(255, 255, 255, 0.5)',
                brickBorderLight: 'rgba(255, 255, 255, 0.25)',
                brickOutlineNormal: 'rgba(0,0,0,0.1)',
                brickOutlineMetal: '#404040',
                brickOutlineBlackHole: '#4B0082',
                brickOutlineHP4: 'rgba(255,255,255,0.9)',
                brickOutlineHP3: 'rgba(255,255,255,0.8)',
                brickOutlineHP2: 'rgba(255,255,255,0.5)',

                // Common / Utility
                white: '#FFFFFF',
                transparentCyan: 'rgba(0, 255, 255, 0)',
                sparkleGold: 'rgba(255, 245, 255, 0.5)', 
                itemSparkle: 'rgba(255, 245, 183, 1.0)',

                // Items
                itemExpand: '#7AE7B9',
                itemMultiball: '#A5B4FC',
                itemLife: '#FF8B94',
                itemPierce: '#FFD93D',
                itemSlow: '#60A5FA',
                itemLifeRed: '#ff3333',
                itemWhite: '#ffffff',
                itemStroke: 'rgba(0,0,0,0.5)',
                itemText: '#1A1A2E',

                // Renderer / UI
                bgBubble: 'rgba(255, 255, 255, 0.1)',
                uiNoticeText: 'rgba(255, 255, 255, 0.9)',
                uiNoticeShadow: '#00f2ff',
                uiReadyText: 'rgba(255, 255, 255, 0.9)',
                uiReadyShadow: '#FFB7B2',
                uiLastStageText: '#FFD700',
                uiLastStageShadow: '#FFD700',
                
                // Palette
                pastelColors: ['#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF', '#E8B4F8', '#FFC8DD', '#BDE0FE']
            },
            neon: {
                // Ball
                ballFill: '#FFFFFF',
                ballStroke: '#00FFFF',
                ballShadow: 'rgba(0, 255, 255, 0.5)',
                ballTrail: 'rgba(0, 255, 255, 0.2)',
                ballPierceCenter: '#FFFFFF',
                ballPierceMid: '#FF00FF',
                ballPierceOuter: '#9D00FF',
                ballPierceTrail: 'rgba(157, 0, 255, 0.3)',

                // Paddle
                paddleFill: '#FF00FF',
                paddleStroke: '#FFFFFF',
                paddleShadow: '#FF00FF',
                paddleHighlight: 'rgba(255, 255, 255, 0.6)',
                paddlePiercePulse: 'rgba(0, 255, 255, 0.5)',
                paddleSparkle: '#00FFFF',

                // Bricks
                brickHitFlash: '#FFFFFF',
                brickMirageGray: '#444444',
                brickShieldOuter: 'rgba(255, 0, 255, 0.6)',
                brickShieldHex: 'rgba(255, 100, 255, 0.2)',
                brickThruster: '#FF00FF',
                brickItemGlow: '#00FFFF',
                brickBombGlow: '#FF0000',
                brickMetalTop: '#444444',
                brickMetalMid: '#222222',
                brickMetalBottom: '#000000',
                brickMetalLines: 'rgba(0, 255, 255, 0.2)',
                brickBlackHoleCenter: '#000000',
                brickBlackHoleMid: '#0D001A',
                brickBlackHoleOuter: '#FF00FF',
                brickBlackHoleSwirl: 'rgba(0, 255, 255, 0.3)',
                brickBombFlashWhite: '#FFFFFF',
                brickBombFlashRed: '#FF00FF',
                brickBombFlashDark: '#2D002D',
                brickBombGold: '#00FFFF',
                brickGloss: 'rgba(255, 255, 255, 0.3)',
                brickStuds: 'rgba(0, 255, 255, 0.4)',
                brickBorderHeavy: 'rgba(255, 255, 255, 0.8)',
                brickBorderMedium: 'rgba(255, 255, 255, 0.6)',
                brickBorderLight: 'rgba(255, 255, 255, 0.3)',
                brickOutlineNormal: 'rgba(255, 255, 255, 0.1)',
                brickOutlineMetal: '#00FFFF',
                brickOutlineBlackHole: '#FF00FF',
                brickOutlineHP4: 'rgba(0, 255, 255, 1)',
                brickOutlineHP3: 'rgba(0, 255, 255, 0.8)',
                brickOutlineHP2: 'rgba(0, 255, 255, 0.5)',

                // Common / Utility
                white: '#FFFFFF',
                transparentCyan: 'rgba(0, 255, 255, 0)',
                sparkleGold: 'rgba(0, 255, 255, 0.5)',
                itemSparkle: 'rgba(0, 255, 255, 1.0)',

                // Items
                itemExpand: '#FF00FF',
                itemMultiball: '#00FFFF',
                itemLife: '#FF0055',
                itemPierce: '#FFFF00',
                itemSlow: '#00FF00',
                itemLifeRed: '#FF0000',
                itemWhite: '#FFFFFF',
                itemStroke: 'rgba(255, 255, 255, 0.8)',
                itemText: '#000000',

                // Renderer / UI
                bgBubble: 'rgba(0, 255, 255, 0.15)',
                uiNoticeText: '#FF00FF',
                uiNoticeShadow: '#00FFFF',
                uiReadyText: '#00FFFF',
                uiReadyShadow: '#FF00FF',
                uiLastStageText: '#FF00FF',
                uiLastStageShadow: '#FFFFFF',
                
                // Palette
                pastelColors: [
                    '#FF00FF', // Neon Magenta (Vibrant)
                    '#00FFFF', // Neon Cyan (Vibrant)
                    '#39FF14', // Neon Green
                    '#7F00FF', // Neon Purple (Deep)
                    '#007FFF', // Neon Azure (Bright Blue)
                    '#FF4444'  // Neon Red
                ]
            },
            sweets: {
                // Ball
                ballFill: '#FFD1DC', // Pastel Pink
                ballStroke: '#FFFFFF',
                ballShadow: 'rgba(255, 105, 180, 0.3)',
                ballTrail: 'rgba(255, 192, 203, 0.2)',
                ballPierceCenter: '#FFFFFF',
                ballPierceMid: '#FF69B4',
                ballPierceOuter: '#FF1493',
                ballPierceTrail: 'rgba(255, 20, 147, 0.2)',

                // Paddle
                paddleFill: '#F4A460', // Cookie color
                paddleStroke: '#6B4226', // Chocolate color
                paddleShadow: 'rgba(107, 66, 38, 0.3)',
                paddleHighlight: 'rgba(255, 255, 255, 0.5)',
                paddlePiercePulse: 'rgba(255, 0, 127, 0.4)',
                paddleSparkle: '#FF69B4',

                // Bricks
                brickHitFlash: '#FFFFFF',
                brickMirageGray: '#EEDC82',
                brickShieldOuter: 'rgba(255, 182, 193, 0.6)',
                brickShieldHex: 'rgba(255, 255, 255, 0.3)',
                brickThruster: '#FFB6C1',
                brickItemGlow: '#FFFACD',
                brickBombGlow: '#FF6347',
                brickMetalTop: '#D2691E',
                brickMetalMid: '#8B4513',
                brickMetalBottom: '#5D2E0A',
                brickMetalLines: 'rgba(255, 255, 255, 0.2)',
                brickBlackHoleCenter: '#3E2723',
                brickBlackHoleMid: '#5D4037',
                brickBlackHoleOuter: '#8D6E63',
                brickBlackHoleSwirl: 'rgba(255, 255, 255, 0.3)',
                brickBombFlashWhite: '#FFF5F5',
                brickBombFlashRed: '#FF4D4D',
                brickBombFlashDark: '#800000',
                brickBombGold: '#FFD700',
                brickGloss: 'rgba(255, 255, 255, 0.6)',
                brickStuds: 'rgba(255, 255, 255, 0.4)',
                brickBorderHeavy: 'rgba(255, 255, 255, 0.8)',
                brickBorderMedium: 'rgba(255, 255, 255, 0.6)',
                brickBorderLight: 'rgba(255, 255, 255, 0.4)',
                brickOutlineNormal: 'rgba(255, 255, 255, 0.3)',
                brickOutlineMetal: '#6B4226',
                brickOutlineBlackHole: '#3E2723',
                brickOutlineHP4: '#FF69B4',
                brickOutlineHP3: '#FFB6C1',
                brickOutlineHP2: '#FFD1DC',

                // Common / Utility
                white: '#FFFFFF',
                transparentCyan: 'rgba(255, 192, 203, 0)',
                sparkleGold: 'rgba(255, 255, 224, 0.5)',
                itemSparkle: 'rgba(255, 105, 180, 1.0)',

                // Items
                itemExpand: '#FFB6C1',
                itemMultiball: '#ADD8E6',
                itemLife: '#FF69B4',
                itemPierce: '#FFF700',
                itemSlow: '#98FB98',
                itemLifeRed: '#FF1493',
                itemWhite: '#FFFFFF',
                itemStroke: '#6B4226',
                itemText: '#6B4226',

                // Renderer / UI
                bgBubble: 'rgba(255, 255, 255, 0.4)',
                uiNoticeText: '#6B4226',
                uiNoticeShadow: '#FFB6C1',
                uiReadyText: '#FF69B4',
                uiReadyShadow: '#FFFFFF',
                uiLastStageText: '#D2691E',
                uiLastStageShadow: '#FFFFFF',
                
                // Palette
                pastelColors: [
                    '#FFB3BA', // Strawberry
                    '#BAFFC9', // Mint
                    '#BAE1FF', // Soda
                    '#FFFFBA', // Lemon
                    '#FFDFBA', // Orange
                    '#E8B4F8'  // Grape
                ]
            }
        };
    }

    get currentTheme() {
        return this.themes[this.currentThemeName];
    }

    getColor(key) {
        return this.currentTheme[key] || '#FF00FF'; // Fallback to magenta if missing
    }
}
