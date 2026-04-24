import { Brick } from './entities.js';
import { getSeededRandom } from './utils.js';
import { STAGE_LAYOUTS, MILESTONE_PATTERNS } from './stageData.js';

/**
 * StageManager: ステージの生成と難易度に応じた速度計算を管理するクラス
 */
export class StageManager {
    constructor(game) {
        this.game = game;
    }

    getStageSpeed() {
        if (!this.game.gameState) return 4.9;
        const diff = this.game.difficultyMultipliers[this.game.gameState.difficulty];
        // Fixed base speed across all stages (4.9 * difficultyMultiplier)
        return 4.9 * diff.speed;
    }

    createLevel() {
        if (!this.game.gameState) return;
        this.game.entities.bricks = [];
        const maxLevel = 100;
        
        // Loop stages after 100 for safety (101 -> 1, 102 -> 2...)
        let currentLevel = this.game.gameState.level;
        if (currentLevel > maxLevel) {
            currentLevel = ((currentLevel - 1) % maxLevel) + 1;
        }

        const cols = 10;
        const gap = Math.max(2, this.game.renderer.canvas.width * 0.01);
        const calculatedWidth = (this.game.renderer.canvas.width - gap * (cols + 1)) / cols;
        const brickWidth = Math.min(80, calculatedWidth); // Max 80px
        const brickHeight = brickWidth * 0.4; 
        const totalGridW = cols * brickWidth + (cols - 1) * gap;
        const startX = (this.game.renderer.canvas.width - totalGridW) / 2;

        // Dynamic Header Height Check
        const header = this.game.ui.uiOverlay;
        this.game.headerHeight = header ? header.offsetHeight : 135;
        const startY = this.game.headerHeight + 40;
        this.game.lastStartY = startY;

        // 1. 固定レイアウト（STAGE_LAYOUTS）の確認
        if (STAGE_LAYOUTS[currentLevel]) {
            const layout = STAGE_LAYOUTS[currentLevel];
            layout.forEach((row, r) => {
                row.forEach((type, c) => {
                    let actualType = type;
                    let isGhost = false;
                    let isMoving = false;
                    let hasShield = false;

                    if (typeof type === 'string') {
                        const matches = type.match(/^([A-Z]+)(\d+)$/);
                        if (matches) {
                            const flags = matches[1];
                            actualType = parseInt(matches[2]);
                            isGhost = flags.includes('G');
                            isMoving = flags.includes('M');
                            hasShield = flags.includes('S');
                        } else if (type.startsWith('G')) {
                            // Support legacy G-only format if needed
                            isGhost = true;
                            actualType = parseInt(type.substring(1));
                        }
                    }

                    if (actualType > 0) {
                        const color = this.game.pastelColors[(r + c + currentLevel) % this.game.pastelColors.length];
                        this.game.entities.bricks.push(new Brick(
                            startX + c * (brickWidth + gap),
                            startY + r * (brickHeight + gap),
                            brickWidth,
                            brickHeight,
                            color,
                            actualType,
                            isGhost,
                            isMoving,
                            hasShield
                        ));
                    }
                });
            });
            return;
        }

        // 2. 節目ステージ（Heart Map）の確認
        if (currentLevel % 15 === 0) {
            const heartMap = MILESTONE_PATTERNS.HEART;
            const mapCols = 9;
            const mapRows = 8;
            const xOffset = (cols - mapCols) / 2;
            const yOffset = 0;

            for (let r = 0; r < mapRows; r++) {
                for (let c = 0; c < mapCols; c++) {
                    const type = heartMap[r][c];
                    let actualType = type;
                    let isGhost = false;
                    let isMoving = false;
                    let hasShield = false;

                    if (typeof type === 'string') {
                        const matches = type.match(/^([A-Z]+)(\d+)$/);
                        if (matches) {
                            const flags = matches[1];
                            actualType = parseInt(matches[2]);
                            isGhost = flags.includes('G');
                            isMoving = flags.includes('M');
                            hasShield = flags.includes('S');
                        } else if (type.startsWith('G')) {
                            isGhost = true;
                            actualType = parseInt(type.substring(1));
                        }
                    }

                    if (actualType > 0) {
                        const color = this.game.pastelColors[(r + c + currentLevel) % this.game.pastelColors.length];
                        this.game.entities.bricks.push(new Brick(
                            startX + (c + xOffset) * (brickWidth + gap),
                            startY + (r + yOffset) * (brickHeight + gap),
                            brickWidth,
                            brickHeight,
                            color,
                            actualType,
                            isGhost,
                            isMoving,
                            hasShield
                        ));
                    }
                }
            }
            return;
        }

        // 3. 一般的なユニークステージ（ランダム/アルゴリズム生成） - Fallback
        const seedBase = currentLevel * 123.456;
        const maxRows = 16;
        const rows = Math.min(8 + Math.floor(currentLevel / 10), maxRows);
        const midC = (cols - 1) / 2;
        const midR = (rows - 1) / 2;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                let shouldPlace = false;
                const patternType = currentLevel % 5;
                
                switch (patternType) {
                    case 1: // Checkerboard
                        shouldPlace = (r + c) % 2 === 0;
                        break;
                    case 2: // Diagonal Stripes
                        shouldPlace = (r + c) % 3 === (currentLevel % 3);
                        break;
                    case 3: // X-Shape
                        shouldPlace = Math.abs(c - midC) === Math.abs(r - midR) || c === midC || r === midR;
                        break;
                    case 4: // Pyramid / Diamond
                        const dist = Math.abs(c - midC) + Math.abs(r - midR);
                        shouldPlace = dist <= (3 + Math.floor(currentLevel / 20));
                        break;
                    case 0: // Random Deterministic Noise
                        shouldPlace = getSeededRandom(seedBase + r * 10 + c) > 0.4;
                        break;
                }

                if (shouldPlace) {
                    const hpSeed = seedBase + r * 7 + c * 3;
                    const rnd = getSeededRandom(hpSeed);
                    const hp3Chance = currentLevel * 0.015;
                    const hp2Chance = currentLevel * 0.04 + 0.1;
                    const specialChance = Math.min(0.2, currentLevel * 0.005); // Up to 20% special blocks

                    let type = 1;
                    let isGhost = false;
                    let isMoving = false;
                    let hasShield = false;

                    if (rnd < specialChance) {
                        // Special block types 6-11 (excluding 9/10 mostly)
                        const specRnd = getSeededRandom(hpSeed + 99);
                        if (specRnd < 0.2) type = 6; // Bomb
                        else if (specRnd < 0.4) type = 7; // Chameleon
                        else if (specRnd < 0.5) type = 11; // Ghost
                        else if (specRnd < 0.6) type = 8; // Item
                        else if (specRnd < 0.65) type = 10; // Black Hole (Rare)
                        else if (specRnd < 0.7) type = 9; // Metal (Rare)
                        else type = 1;
                    } else {
                        if (rnd < hp3Chance + specialChance) {
                             const highRnd = getSeededRandom(hpSeed + 55);
                             if (highRnd < 0.3) type = 5;
                             else if (highRnd < 0.6) type = 4;
                             else type = 3;
                        }
                        else if (rnd < hp3Chance + hp2Chance + specialChance) type = 2;
                        else type = 1;
                    }

                    // Procedural chance for G/M/S flags at higher levels
                    if (currentLevel > 10) {
                        const flagRnd = getSeededRandom(hpSeed + 222);
                        if (flagRnd < 0.05) isGhost = true;
                        if (flagRnd > 0.95 && type !== 9 && type !== 10) isMoving = true;
                        if (flagRnd > 0.45 && flagRnd < 0.50) hasShield = true;
                    }

                    const color = this.game.pastelColors[(r + c + currentLevel) % this.game.pastelColors.length];
                    this.game.entities.bricks.push(new Brick(
                        startX + c * (brickWidth + gap),
                        startY + r * (brickHeight + gap),
                        brickWidth,
                        brickHeight,
                        color,
                        type,
                        isGhost,
                        isMoving,
                        hasShield
                    ));
                }
            }
        }

        // Safety Guarantee: Minimum 5 bricks
        if (this.game.entities.bricks.length < 5) {
            for (let c = 0; c < cols; c++) {
                this.game.entities.bricks.push(new Brick(
                    startX + c * (brickWidth + gap),
                    startY + 3 * (brickHeight + gap),
                    brickWidth,
                    brickHeight,
                    this.game.pastelColors[c % this.game.pastelColors.length],
                    1
                ));
            }
        }
    }
}

