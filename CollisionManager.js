import { Ball, Item } from './entities.js';

/**
 * CollisionManager: 衝突判定（ボール、パドル、ブロック、アイテム）および
 * アイテム適用ロジックを専門に扱うクラス
 */
export class CollisionManager {
    constructor(game) {
        this.game = game;
    }

    handleCollisions(timeScale, dt) {
        if (!this.game.gameState) return;
        const diff = this.game.difficultyMultipliers[this.game.gameState.difficulty];

        // Ball collision logic
        for (let i = this.game.entities.balls.length - 1; i >= 0; i--) {
            const ball = this.game.entities.balls[i];
            
            // Time-based piercing removed in favor of charge system
            // Black Hole Gravity (Type 10) - Non-solid Gravity Wells
            this.game.entities.bricks.forEach(brick => {
                if (brick.type === 10 && !brick.isGhost) {
                    const dx = (brick.x + brick.w / 2) - ball.x;
                    const dy = (brick.y + brick.h / 2) - ball.y;
                    const distSq = dx * dx + dy * dy;
                    const range = 150; // Optimized range
                    if (distSq < range * range) {
                        const dist = Math.sqrt(distSq);
                        // Inverse-linear force for smoother swing-by
                        const force = (1 - dist / range) * 0.35;
                        ball.vx += (dx / dist) * force;
                        ball.vy += (dy / dist) * force;
                        
                        // Enforce constant speed (Swing-by trajectory)
                        ball.enforceVeloLimits(ball.speed);
                    }
                }
            });

            ball.update(this.game.renderer.canvas.width, this.game.renderer.canvas.height, timeScale, dt);

            // Paddle collision (Only if moving downwards)
            if (ball.vy > 0 && this.game.entities.paddle &&
                ball.y + ball.radius > this.game.entities.paddle.y &&
                ball.y - ball.radius < this.game.entities.paddle.y + this.game.entities.paddle.height &&
                ball.x > this.game.entities.paddle.x && ball.x < this.game.entities.paddle.x + this.game.entities.paddle.width) {

                const hitPos = (ball.x - (this.game.entities.paddle.x + this.game.entities.paddle.width / 2)) / (this.game.entities.paddle.width / 2);
                ball.bounceFromPaddle(hitPos);
                ball.y = this.game.entities.paddle.y - ball.radius;

                // Pierce Charge Consumption on Paddle Hit
                if (this.game.pierceCharges > 0) {
                    this.game.entities.notices.push({
                        text: "PIERCE",
                        x: ball.x,
                        y: ball.y - 40,
                        alpha: 1.0,
                        timer: 60
                    });
                    ball.pierceTimer = 10;
                    this.game.pierceCharges--;
                }

                this.game.sounds.hitPaddle();
                this.game.renderer.createParticles(ball.x, ball.y, '#FFB7B2', 10);
                
                // Note: Explosion Ball Activation is now handled by charge timer in Ball.js
            }

            // Brick collision
            for (let j = this.game.entities.bricks.length - 1; j >= 0; j--) {
                const brick = this.game.entities.bricks[j];
                if (!brick) continue;

                if (ball.x + ball.radius > brick.x && ball.x - ball.radius < brick.x + brick.w &&
                    ball.y + ball.radius > brick.y && ball.y - ball.radius < brick.y + brick.h) {

                    const isMetal = (brick.type === 9);
                    const isBlackHole = (brick.type === 10);
                    
                    // Ghost Reveal Logic (PROMOTED)
                    if (brick.isGhost) {
                        brick.isGhost = false;
                        if (this.game.sounds) this.game.sounds.hitBrick();
                        this.game.renderer.createParticles(brick.x + brick.w / 2, brick.y + brick.h / 2, '#FFFFFF', 40);
                    }

                    // 0. Explosion Logic (HIGHEST PRIORITY)
                    if (ball.isExploding) {
                        ball.isExploding = false;
                        this.triggerExplosion(ball.x, ball.y);
                        this.game.entities.balls.splice(i, 1);
                        return;
                    }

                    if (isBlackHole) continue;

                    // 1. Reflex Logic: Always reflect if normal ball OR if it's Metal OR if it has a Shield
                    if (!ball.isPiercing || isMetal || brick.hasShield) {
                        const overlapX = (ball.radius + brick.w / 2) - Math.abs(ball.x - (brick.x + brick.w / 2));
                        const overlapY = (ball.radius + brick.h / 2) - Math.abs(ball.y - (brick.y + brick.h / 2));

                        if (overlapX < overlapY) {
                            ball.vx = Math.abs(ball.vx) * (ball.x < (brick.x + brick.w / 2) ? -1 : 1);
                            ball.x += (ball.x < brick.x + brick.w / 2) ? -overlapX - 1 : overlapX + 1;
                        } else {
                            ball.vy = Math.abs(ball.vy) * (ball.y < (brick.y + brick.h / 2) ? -1 : 1);
                            ball.y += (ball.y < brick.y + brick.h / 2) ? -overlapY - 1 : overlapY + 1;
                        }
                        ball.enforceVeloLimits(ball.speed);
                        
                        // Stack Prevention: Anti-Loop Jitter
                        const now = Date.now();
                        ball.collisionHistory.push({ t: now, x: ball.x, y: ball.y });
                        if (ball.collisionHistory.length > 5) ball.collisionHistory.shift();
                        
                        if (ball.collisionHistory.length >= 5) {
                            const first = ball.collisionHistory[0];
                            const last = ball.collisionHistory[ball.collisionHistory.length - 1];
                            const timeDiff = last.t - first.t;
                            const distDiff = Math.hypot(last.x - first.x, last.y - first.y);
                            
                            // If 5 collisions happen in < 500ms within a 50px radius, it's likely a stack
                            if (timeDiff < 500 && distDiff < 50) {
                                const angleJitter = (Math.random() - 0.5) * 0.2;
                                const currentAngle = Math.atan2(ball.vy, ball.vx);
                                const newAngle = currentAngle + angleJitter;
                                ball.vx = ball.speed * Math.cos(newAngle);
                                ball.vy = ball.speed * Math.sin(newAngle);
                                ball.collisionHistory = []; // Reset history
                            }
                        }

                        if (isMetal) {
                            if (this.game.sounds) this.game.sounds.playMetalHit();
                            brick.hitTimer = 5;
                            // Metal never breaks
                            if (ball.isPiercing) break; 
                            continue;
                        }

                        // Shield Logic: 10 hits durability for normal balls, shatter on piercing
                        if (brick.hasShield) {
                            if (ball.isPiercing) {
                                brick.hasShield = false;
                                if (this.game.sounds) this.game.sounds.playShatter();
                                this.game.renderer.createParticles(brick.x + brick.w / 2, brick.y + brick.h / 2, '#00FFFF', 40);
                            } else {
                                if (brick.shieldHp === undefined) brick.shieldHp = 10;
                                brick.shieldHp--;
                                
                                if (brick.shieldHp <= 0) {
                                    brick.hasShield = false;
                                    if (this.game.sounds) this.game.sounds.playShatter();
                                    this.game.renderer.createParticles(brick.x + brick.w / 2, brick.y + brick.h / 2, '#00FFFF', 40);
                                } else {
                                    if (this.game.sounds) this.game.sounds.hitWall(); // Reflection sound for non-destructive hits
                                }
                            }
                            brick.hitTimer = 5;
                            continue; // Stop further processing for this collision
                        }
                    }


                    // Chameleon Transformation (Type 7)
                    if (brick.type === 7) {
                        const newType = brick.transform(this.game.gameState.level, this.game);
                        console.log(`[CollisionManager] Chameleon transformed into type ${newType}`);
                        
                        this.game.sounds.hitBrick();
                        this.game.renderer.createParticles(brick.x + brick.w / 2, brick.y + brick.h / 2, '#FFFFFF', 10);
                        if (!ball.isPiercing) break;
                        continue;
                    }

                    // Item Drop Logic (Only from specific allowed types)
                    const isAllowedType = (brick.type >= 1 && brick.type <= 5) || brick.type === 7 || brick.type === 8;
                    const canDrop = isAllowedType && !brick.hasShield && !brick.isGhost && !brick.hasDroppedItem;

                    if (canDrop) {
                        brick.hasDroppedItem = true; // Mark as checked so no further items drop from this brick
                        
                        let dropProb = 0.10 * diff.drop;
                        if (this.game.entities.balls.length === 1) dropProb *= 3.0;
                        
                        const shouldDrop = brick.isGuaranteedItem || Math.random() < dropProb;
                        
                        if (shouldDrop && (this.game.gameState.difficulty === 'superEasy' || this.game.entities.items.length < 3)) {
                            this.game.entities.items.push(new Item(brick.x + brick.w / 2, brick.y + brick.h / 2, this.game));
                        }
                    }

                    const remainingEssential = this.game.entities.bricks.filter(b => b.type !== 9 && b.type !== 10);

                    if (!brick.isIndestructible) {
                        if (brick.type === 6) {
                            brick.isIgnited = true;
                        } else {
                            brick.health--;
                        }
                        this.game.gameState.addScore(Math.floor(50 * diff.score));
                        
                        // Check if this hit cleared the level
                        const isFinalClear = (remainingEssential.length === 0 || (remainingEssential.length === 1 && brick.health <= 0));

                        if (isFinalClear && !this.game.clearSoundPlayed) {
                            this.game.clearSoundPlayed = true;
                        } else if (!isFinalClear) {
                            this.game.sounds.hitBrick();
                        }
                        
                        this.game.renderer.createParticles(brick.x + brick.w / 2, brick.y + brick.h / 2, brick.color, 15);

                            if (brick.health <= 0) {
                                const destroyedType = brick.type;
                                const bx = brick.x + brick.w / 2;
                                const by = brick.y + brick.h / 2;
                                
                                this.game.entities.bricks.splice(j, 1);
                                this.game.gameState.addScore(Math.floor(150 * diff.score));
                            }
                        }
                        brick.hitTimer = 5;
                        this.game.events.emit('SCORE_UPDATE', { 
                            val: this.game.gameState.score, 
                            best: this.game.gameState.bestScore 
                        });

                        // Performance check: Only count remaining blocks if one was actually destroyed
                        const finalSyncCount = this.game.entities.bricks.filter(b => b.type !== 9 && b.type !== 10).length;
                        if (finalSyncCount === 0) {
                            this.game.events.emit('ALL_BLOCKS_BROKEN');
                            this.game.carryBallCount = this.game.entities.balls.length;
                            if (this.game.clearWaitTimer <= 0) {
                                this.game.clearWaitTimer = 60;
                            }
                            return; 
                        }

                        if (!ball.isPiercing) break;
                }
            }

            // Life lost
            if (ball.y - ball.radius > this.game.renderer.canvas.height) {
                this.game.entities.balls.splice(i, 1);
            }
        }

        if (this.game.entities.balls.length === 0) {
            this.game.gameState.lives--;
            this.game.events.emit('LIVES_UPDATE', this.game.gameState.lives);

            if (this.game.gameState.lives <= 0) {
                this.game.gameOver();
            } else {
                this.game.miss();
            }
        }

        // Item acquisition logic
        for (let i = this.game.entities.items.length - 1; i >= 0; i--) {
            const item = this.game.entities.items[i];
            item.update(timeScale, this.game);

            if (this.game.entities.paddle && 
                item.y + item.radius > this.game.entities.paddle.y &&
                item.y - item.radius < this.game.entities.paddle.y + this.game.entities.paddle.height &&
                item.x > this.game.entities.paddle.x && item.x < this.game.entities.paddle.x + this.game.entities.paddle.width) {

                this.applyItem(item.type); // Local method call
                this.game.sounds.collectItem();
                this.game.gameState.addScore(Math.floor(2000 * diff.score));
                this.game.syncCarryState();
                this.game.gameState.save();
                this.game.events.emit('SCORE_UPDATE', { 
                    val: this.game.gameState.score, 
                    best: this.game.gameState.bestScore 
                });
                this.game.renderer.createParticles(item.x, item.y, item.color, 20);
                this.game.entities.items.splice(i, 1);
            } else if (item.y - item.radius > this.game.renderer.canvas.height) {
                this.game.entities.items.splice(i, 1);
            }
        }
    }

    applyItem(type) {
        let label = "";
        switch (type) {
            case 'EXPAND':
                if (this.game.entities.paddle) this.game.entities.paddle.expand();
                label = "EXPAND";
                break;
            case 'MULTIBALL':
                if (this.game.gameState.difficulty !== 'superEasy' && this.game.entities.balls.length >= 20) {
                    label = "LIMIT";
                } else if (this.game.entities.balls.length > 0) {
                    const b = this.game.entities.balls[Math.floor(Math.random() * this.game.entities.balls.length)];
                    const numBalls = this.game.gameState.difficulty === 'superEasy' ? 4 : 2; 
                    for (let n = 0; n < numBalls; n++) {
                        const angle = Math.atan2(b.vy, b.vx) + (Math.random() * 0.6 - 0.3);
                        this.game.entities.balls.push(new Ball(this.game, b.x, b.y, b.speed, b.speed * Math.cos(angle), b.speed * Math.sin(angle)));
                    }
                    label = "MULTI";
                }
                break;
            case 'LIFE':
                this.game.gameState.lives++;
                this.game.events.emit('LIVES_UPDATE', this.game.gameState.lives);
                label = "LIFE";
                break;
            case 'PIERCE':
                this.game.entities.balls.forEach(b => {
                    if (!b.isCharging && !b.isExploding && !b.hasExplosionCharge) {
                        b.pierceStacks = (b.pierceStacks || 0) + 1;
                        if (b.pierceTimer <= 0) {
                            b.pierceStacks--;
                            b.pierceTimer = 10;
                            b.isPiercing = true;
                        }
                    }
                });
                label = "PIERCE";
                break;
            case 'SLOW':
                this.game.slowTimer = 3.0; // 3 seconds real-time
                label = "SLOW";
                break;
            case 'EXPLOSION':
                // Create a NEW independent ball for explosion instead of modifying existing ones
                const paddle = this.game.entities.paddle;
                if (paddle) {
                    const speed = this.game.stageManager ? this.game.stageManager.getStageSpeed() : 4.9;
                    const newBall = this.game.entities.addBall(new Ball(
                        this.game,
                        paddle.x + paddle.width / 2, 
                        paddle.y - 10, 
                        speed, 0, 0
                    ));
                    if (newBall) {
                        newBall.isCharging = true;
                        newBall.chargeTimer = 1.5; // Starts charging immediately
                        newBall.isExploding = false;
                        
                        this.game.entities.notices.push({
                            text: "CHARGING",
                            x: newBall.x,
                            y: newBall.y - 60,
                            alpha: 1.0,
                            timer: 90
                        });
                    }
                }
                label = "CHARGE";
                break;
        }
        if (label && this.game.entities.paddle) {
            this.game.entities.notices.push({
                text: label,
                x: this.game.entities.paddle.x + this.game.entities.paddle.width / 2,
                y: this.game.entities.paddle.y - 40,
                alpha: 1.0,
                timer: 120 
            });
        }
    }

    triggerExplosion(x, y) {
        this.game.sounds.playExplosion();
        this.game.renderer.createParticles(x, y, '#FF4500', 30);
        
        const sampleW = this.game.entities.bricks.length > 0 ? this.game.entities.bricks[0].w : 80;
        const explosionRadius = sampleW * 1.5;
        const diff = this.game.difficultyMultipliers[this.game.gameState.difficulty];

        for (let i = this.game.entities.bricks.length - 1; i >= 0; i--) {
            const brick = this.game.entities.bricks[i];
            if (!brick) continue;
            
            const dx = brick.x + brick.w / 2 - x;
            const dy = brick.y + brick.h / 2 - y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < explosionRadius) {
                // Shield Destruction: Immediate shatter regardless of HP
                if (brick.hasShield) {
                    brick.hasShield = false;
                    if (this.game.sounds) this.game.sounds.playShatter();
                    this.game.renderer.createParticles(brick.x + brick.w / 2, brick.y + brick.h / 2, '#00FFFF', 40);
                }

                if (!brick.isIndestructible) {
                    if (brick.type === 6) {
                        brick.isIgnited = true;
                        brick.hitTimer = 5;
                    } else {
                        brick.health -= 10; // Massive damage (Instant Kill)
                        brick.hitTimer = 5;
                        this.game.renderer.createParticles(brick.x + brick.w / 2, brick.y + brick.h / 2, brick.color, 5);
                    }
                    if (brick.health <= 0) {
                        const type = brick.type;
                        const bx = brick.x + brick.w / 2;
                        const by = brick.y + brick.h / 2;
                        this.game.entities.bricks.splice(i, 1);
                        this.game.gameState.addScore(Math.floor(100 * diff.score));
                        
                        // Check if this explosion cleared the level
                        const remainingEssential = this.game.entities.bricks.filter(b => b.type !== 9 && b.type !== 10);
                        if (remainingEssential.length === 0 && !this.game.clearSoundPlayed) {
                            this.game.clearSoundPlayed = true;
                            this.game.events.emit('ALL_BLOCKS_BROKEN');
                            
                            // Trigger the transition timer so the game actually clears
                            if (this.game.clearWaitTimer <= 0) {
                                this.game.clearWaitTimer = 60;
                            }
                        }
                    }
                }
            }
        }
    }
}
