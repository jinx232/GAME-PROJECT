import { Stickman, STATES } from './Stickman';
import { EffectSystem } from './Effects';
import { InputHandler } from './InputHandler';
import { Weapon } from './Weapon';
import { AIController } from './AI';
import { Vector2D } from './Vector2D';
import { SoundSynth } from './Audio';

export class GameEngine {
  constructor(canvas, config = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // Configurations
    this.mode = config.mode || 'p1_vs_cpu'; // 'p1_vs_cpu', 'p1_vs_p2'
    this.difficulty = config.difficulty || 'medium';
    this.p1Color = config.p1Color || '#00f0ff'; // Cyan
    this.p2Color = config.p2Color || '#ec4899'; // Pink/Magenta
    this.p1Name = config.p1Name || 'Dragon P1';
    this.p2Name = config.p2Name || (this.mode === 'p1_vs_cpu' ? 'Tiger CPU' : 'Snake P2');
    this.weaponSpawnEnabled = config.weaponSpawnEnabled !== false;

    // Dimensions
    this.width = canvas.width;
    this.height = canvas.height;
    this.groundY = this.height - 80;

    // Game Objects
    this.input = new InputHandler();
    this.effects = new EffectSystem();
    this.sound = new SoundSynth();
    this.weapons = [];
    this.ai = new AIController(this.difficulty);

    // Players
    this.p1 = null;
    this.p2 = null;

    // Game State
    this.gameState = 'countdown'; // 'countdown', 'fight', 'ko', 'gameover'
    this.roundTimer = 99;
    this.timerInterval = null;
    this.round = 1;
    this.p1Wins = 0;
    this.p2Wins = 0;
    this.winner = null; // 1, 2, or null
    this.koTimer = 0;
    this.fightText = 'ROUND 1';
    this.fightTextOpacity = 1.0;
    
    // Ambient dust particles for atmospheric look
    this.ambientDust = [];
    this.initAmbientDust();

    // Weapon spawn counter
    this.weaponSpawnTimer = 300 + Math.random() * 300; // 5-10 seconds

    this.onUIEvent = config.onUIEvent || (() => {}); // Callback to communicate transitions to React
  }

  init() {
    this.p1 = new Stickman(this.width * 0.25, this.groundY, 1, this.p1Color, this.p1Name, false);
    this.p2 = new Stickman(this.width * 0.75, this.groundY, 2, this.p2Color, this.p2Name, this.mode === 'p1_vs_cpu');

    // Give players cross-references to engine lists for AI checking
    this.p1.engineProjectiles = this.effects.blasts;
    this.p2.engineProjectiles = this.effects.blasts;

    // Share sound system with players so they can trigger attack SFX
    this.p1.soundSystem = this.sound;
    this.p2.soundSystem = this.sound;

    this.weapons = [];
    this.gameState = 'countdown';
    this.fightText = `ROUND ${this.round}`;
    this.fightTextOpacity = 1.0;
    this.roundTimer = 99;
    
    this.startTimer();

    // Play round start gong
    this.sound.playGong();

    // Spawn initial weapons optionally
    if (this.weaponSpawnEnabled) {
      this.weapons.push(new Weapon(this.width * 0.35, 100, 'sword'));
      this.weapons.push(new Weapon(this.width * 0.65, 100, 'staff'));
    }

    this.notifyUI();
  }

  initAmbientDust() {
    for (let i = 0; i < 20; i++) {
      this.ambientDust.push({
        x: Math.random() * this.width,
        y: Math.random() * this.groundY,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -0.1 - Math.random() * 0.3,
        size: 1 + Math.random() * 2,
        alpha: 0.1 + Math.random() * 0.3
      });
    }
  }

  startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (this.gameState === 'fight' && this.roundTimer > 0) {
        this.roundTimer--;
        this.notifyUI();
        if (this.roundTimer === 0) {
          this.handleTimeout();
        }
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  getWeaponHintFor(player) {
    if (!player || player.state === STATES.DEAD) return null;
    if (player.weapon) {
      return 'Press U to throw';
    }

    if (player.weaponThrowTimer > 0) {
      return null;
    }

    const nearbyWeapon = this.weapons.find(w => !w.isEquipped && player.pos.dist(w.pos) < 80);
    if (nearbyWeapon && player.isGrounded) {
      return 'Press U to pick up';
    }

    return null;
  }

  notifyUI() {
    this.onUIEvent({
      p1Health: this.p1 ? this.p1.health : 100,
      p2Health: this.p2 ? this.p2.health : 100,
      p1Chi: this.p1 ? this.p1.chi : 0,
      p2Chi: this.p2 ? this.p2.chi : 0,
      p1Combo: this.p1 ? this.p1.comboCount : 0,
      p2Combo: this.p2 ? this.p2.comboCount : 0,
      p1Weapon: this.p1 ? this.p1.weapon : null,
      p2Weapon: this.p2 ? this.p2.weapon : null,
      p1WeaponHint: this.getWeaponHintFor(this.p1),
      p2WeaponHint: this.getWeaponHintFor(this.p2),
      p1Name: this.p1Name,
      p2Name: this.p2Name,
      timer: this.roundTimer,
      round: this.round,
      p1Wins: this.p1Wins,
      p2Wins: this.p2Wins,
      gameState: this.gameState,
      winner: this.winner,
      fightText: this.fightText
    });
  }

  update() {
    // Update ambient dust
    this.ambientDust.forEach(dust => {
      dust.x += dust.vx;
      dust.y += dust.vy;
      if (dust.y < 0) {
        dust.y = this.groundY;
        dust.x = Math.random() * this.width;
      }
      if (dust.x < 0 || dust.x > this.width) {
        dust.x = Math.random() * this.width;
      }
    });

    // 1. Get input
    const p1Inputs = this.input.getP1Inputs();
    let p2Inputs;

    if (this.p2.isAI) {
      p2Inputs = this.ai.update(this.p2, this.p1, this.weapons);
    } else {
      p2Inputs = this.input.getP2Inputs();
    }

    // 2. Apply player inputs based on game state
    if (this.gameState === 'fight') {
      this.applyInputs(this.p1, p1Inputs);
      this.applyInputs(this.p2, p2Inputs);
    } else if (this.gameState === 'countdown') {
      // Allow blocking or crouching during countdown, but no attacks or movement
      this.p1.setState(p1Inputs.crouch ? STATES.CROUCH : STATES.IDLE);
      this.p2.setState(p2Inputs.crouch ? STATES.CROUCH : STATES.IDLE);
      this.p1.vel.x = 0;
      this.p2.vel.x = 0;

      // Handle fight banner fade out
      this.fightTextOpacity -= 0.015;
      if (this.fightTextOpacity <= 0) {
        this.gameState = 'fight';
        this.fightText = 'FIGHT!';
        this.fightTextOpacity = 1.0;
        this.notifyUI();
      }
    } else if (this.gameState === 'ko') {
      this.koTimer++;
      this.p1.vel.x *= 0.9;
      this.p2.vel.x *= 0.9;

      if (this.koTimer > 180) { // 3 seconds after KO
        this.handleRoundEnd();
      }
    }

    // 3. Update physics on players
    this.p1.update(this.groundY, this.width, this.p2, this.effects, this.weapons);
    this.p2.update(this.groundY, this.width, this.p1, this.effects, this.weapons);

    // 4. Player-to-player collision pushing
    const distBetween = Math.abs(this.p1.pos.x - this.p2.pos.x);
    if (distBetween < 30 && this.p1.isGrounded && this.p2.isGrounded && 
        this.p1.state !== STATES.DEAD && this.p2.state !== STATES.DEAD) {
      const overlap = 30 - distBetween;
      const pushDir = this.p1.pos.x < this.p2.pos.x ? -1 : 1;
      this.p1.pos.x += pushDir * overlap * 0.5;
      this.p2.pos.x -= pushDir * overlap * 0.5;
    }

    // 5. Update weapons on the ground
    this.weapons.forEach(w => w.update(this.groundY, this.width));

    // 6. Update effects and projectiles
    this.effects.update(this.width, this.height);

    // 7. Check projectile collisions
    this.checkProjectileCollisions();

    // 8. Auto weapon spawning in combat
    if (this.weaponSpawnEnabled && this.gameState === 'fight') {
      this.weaponSpawnTimer--;
      if (this.weaponSpawnTimer <= 0) {
        this.spawnRandomWeapon();
        this.weaponSpawnTimer = 400 + Math.random() * 400; // 6-12 seconds
      }
    }

    // 9. Check win conditions
    if (this.gameState === 'fight') {
      if (this.p1.health <= 0 || this.p2.health <= 0) {
        this.gameState = 'ko';
        this.koTimer = 0;
        this.stopTimer();
        
        // KO sound + screen shake
        this.sound.playKO();

        if (this.p1.health <= 0 && this.p2.health <= 0) {
          this.fightText = 'DOUBLE KO!';
        } else if (this.p1.health <= 0) {
          this.fightText = 'KO!';
          this.p2Wins++;
        } else {
          this.fightText = 'KO!';
          this.p1Wins++;
        }
        
        this.fightTextOpacity = 1.0;
        this.effects.triggerShake(8, 20);
        this.notifyUI();
      }
    }

    // Slow down banner fade if "FIGHT!" is active
    if (this.gameState === 'fight' && this.fightText === 'FIGHT!') {
      this.fightTextOpacity -= 0.03;
      if (this.fightTextOpacity <= 0) {
        this.fightText = '';
      }
    }
  }

  spawnRandomWeapon() {
    const weaponType = Math.random() > 0.5 ? 'sword' : 'staff';
    const rx = 100 + Math.random() * (this.width - 200);
    this.weapons.push(new Weapon(rx, -30, weaponType));
    
    // Spawn dust/leaves indicator where it will fall
    this.effects.spawnDustCloud(rx, this.groundY, 'rgba(251, 191, 36, 0.4)');
  }

  checkProjectileCollisions() {
    for (let i = this.effects.blasts.length - 1; i >= 0; i--) {
      const b = this.effects.blasts[i];
      // Skip collision checks for very-new blasts to avoid instant self-hits
      if (typeof b.age === 'number' && b.age < 2) continue;
      const target = b.ownerId === 1 ? this.p2 : this.p1;

      if (target.state === STATES.DEAD) continue;

      const hitLeft = target.pos.x - target.width/2 - b.radius;
      const hitRight = target.pos.x + target.width/2 + b.radius;
      const hitTop = target.pos.y - target.height - b.radius;
      const hitBottom = target.pos.y + b.radius;

      if (b.pos.x >= hitLeft && b.pos.x <= hitRight &&
          b.pos.y >= hitTop && b.pos.y <= hitBottom) {
        
        // Blast Hit!
        const isFacingAttacker = (target.dir === (b.vel.x > 0 ? -1 : 1));
        const isBlocking = target.state === STATES.BLOCK && isFacingAttacker;

        if (isBlocking) {
          target.health = Math.max(target.health - b.damage * 0.15, 0);
          target.vel.x = (b.vel.x > 0 ? 1 : -1) * 3; // mild block pushback
          target.chi = Math.min(target.chi + b.damage * 0.5, target.maxChi);
          this.effects.spawnBlockSparks(b.pos.x, b.pos.y, '#ffffff');
          this.effects.triggerShake(2, 8);
          this.sound.playBlock();
        } else {
          target.health = Math.max(target.health - b.damage, 0);
          target.setState(STATES.HIT, true);
          target.vel.x = (b.vel.x > 0 ? 1 : -1) * b.knockback;
          target.vel.y = -4; // knock up
          
          this.effects.spawnChiExplosion(b.pos.x, b.pos.y, b.color);
          this.effects.spawnBloodSpurt(b.pos.x, b.pos.y, b.vel.x > 0 ? 1 : -1, '#ef4444');
          this.effects.triggerShake(6, 15);
          this.sound.playHit();
        }

        // Remove projectile
        this.effects.blasts.splice(i, 1);
        this.notifyUI();
      }
    }
  }

  applyInputs(player, inputs) {
    if (player.state === STATES.DEAD) return;
    // During HIT stun, allow input queuing but don't actually apply (state will recover soon)
    if (player.state === STATES.HIT) return;

    // Jump
    if (inputs.jump && player.isGrounded && player.state !== STATES.PUNCH && player.state !== STATES.KICK && player.state !== STATES.SPECIAL) {
      player.setState(STATES.JUMP);
      player.vel.y = -13.5;
      this.effects.spawnDustCloud(player.pos.x, player.pos.y, 'rgba(255, 255, 255, 0.25)');
      this.sound.playJump();
    }

    // Attacks have priority and lock movement
    if (player.state !== STATES.PUNCH && player.state !== STATES.KICK && player.state !== STATES.SWEEP && player.state !== STATES.SPECIAL && player.state !== STATES.COMBO &&
        player.state !== STATES.ONE_INCH_PUNCH && player.state !== STATES.HAMMER_FIST && player.state !== STATES.IRON_PALM &&
        player.state !== STATES.FRONT_KICK && player.state !== STATES.ROUNDHOUSE_KICK && player.state !== STATES.SIDE_KICK &&
        player.state !== STATES.SPINNING_HOOK_KICK && player.state !== STATES.AXE_KICK && player.state !== STATES.SWEEP_KICK) {
      
      // Pickup/Throw Weapon - button press only
      if (inputs.pickup) {
        const hadWeapon = !!player.weapon;
        player.pickUpWeapon(this.weapons);
        if (!hadWeapon && player.weapon) {
          this.sound.playWeaponPickup();
        }
        this.notifyUI();
        // Don't return - allow movement after pickup attempt
      }
      
      // Special Chi Attack - can be executed as full charge OR as a combo finisher with 2+ hits
      if (inputs.special && player.isGrounded) {
        const isComboFinisher = player.comboCount >= 2;
        const hasFullCharge = player.chi >= player.maxChi;
        
        if (hasFullCharge || isComboFinisher) {
          player.setState(STATES.SPECIAL);
          player.vel.x = 0;
          if (isComboFinisher && !hasFullCharge) {
            // Use partial chi if doing as combo finisher
            player.chi = Math.max(0, player.chi - 30);
          }
          return;
        }
      }

      // Combo follow-up if already chaining hits
      if (player.comboCount > 0 && player.isGrounded) {
        // Combo punch follow-up (punch -> punch or kick -> punch)
        if (inputs.punch) {
          player.lastComboMove = player.comboMove || 'punch';
          player.comboMove = 'punch';
          player.setState(STATES.COMBO);
          player.vel.x = player.dir * 1.5;
          return;
        }
        // Combo kick follow-up (only after punch)
        if (inputs.kick && (player.lastComboMove === 'punch' || !player.lastComboMove)) {
          player.lastComboMove = 'punch';
          player.comboMove = 'kick';
          player.setState(STATES.COMBO);
          player.vel.x = player.dir * 2.5;
          return;
        }
      }

      // Sweep Attack
      if (inputs.sweep && player.isGrounded) {
        player.setState(STATES.SWEEP);
        player.vel.x = player.dir * 4.5; // lunging slide sweep
        return;
      }

      // Kick Attack - directional variants
      if (inputs.kick) {
        if (player.isGrounded) {
          if (inputs.crouch) {
            // Crouch + kick = sweep kick
            player.setState(STATES.SWEEP_KICK);
            player.vel.x = player.dir * 2.5;
          } else if (inputs.left || inputs.right) {
            // Forward/back + kick variants
            const moveDir = inputs.right ? 1 : -1;
            if (moveDir === player.dir) {
              // Forward + kick = roundhouse kick
              player.setState(STATES.ROUNDHOUSE_KICK);
              player.vel.x = player.dir * 3;
            } else {
              // Back + kick = side kick
              player.setState(STATES.SIDE_KICK);
              player.vel.x = player.dir * 2;
            }
          } else {
            // Neutral kick = front kick (default)
            player.setState(STATES.FRONT_KICK);
            player.vel.x = player.dir * 2;
          }
        } else {
          // Aerial kick = spinning hook kick or axe kick (random for variety)
          player.setState(Math.random() > 0.5 ? STATES.SPINNING_HOOK_KICK : STATES.AXE_KICK);
          player.vel.x = player.dir * 3;
        }
        return;
      }

      // Punch Attack - directional variants
      if (inputs.punch) {
        if (inputs.crouch) {
          // Crouch + punch = iron palm
          player.setState(STATES.IRON_PALM);
          player.vel.x = player.dir * 1.2;
        } else if (inputs.left || inputs.right) {
          const moveDir = inputs.right ? 1 : -1;
          if (moveDir === player.dir) {
            // Forward + punch = one-inch punch
            player.setState(STATES.ONE_INCH_PUNCH);
            player.vel.x = player.dir * 0.8;
          } else {
            // Back + punch = hammer fist
            player.setState(STATES.HAMMER_FIST);
            player.vel.x = player.dir * 2;
          }
        } else {
          // Neutral punch = basic punch (default)
          player.setState(STATES.PUNCH);
          player.vel.x = player.dir * 1.5;
        }
        player.lastComboMove = null; // Reset combo tracking on basic punch
        return;
      }

      // Block/Crouch
      if (inputs.block && player.isGrounded) {
        player.setState(STATES.BLOCK);
        return;
      } else if (inputs.crouch && player.isGrounded) {
        player.setState(STATES.CROUCH);
        return;
      }

      // Walk Left/Right
      const speed = 4.2;
      if (inputs.left) {
        player.vel.x = -speed;
        if (player.isGrounded) player.setState(STATES.WALK);
      } else if (inputs.right) {
        player.vel.x = speed;
        if (player.isGrounded) player.setState(STATES.WALK);
      } else {
        if (player.isGrounded) player.setState(STATES.IDLE);
      }
    }
  }

  handleTimeout() {
    this.gameState = 'ko';
    this.koTimer = 0;
    this.stopTimer();

    this.sound.playGong();

    if (this.p1.health === this.p2.health) {
      this.fightText = 'TIE!';
    } else if (this.p1.health > this.p2.health) {
      this.fightText = 'TIME UP!';
      this.p1Wins++;
    } else {
      this.fightText = 'TIME UP!';
      this.p2Wins++;
    }

    this.fightTextOpacity = 1.0;
    this.notifyUI();
  }

  handleRoundEnd() {
    this.stopTimer();

    // Check if match over (First to 2 wins)
    const targetWins = 2;
    if (this.p1Wins >= targetWins || this.p2Wins >= targetWins) {
      this.gameState = 'gameover';
      this.winner = this.p1Wins >= targetWins ? 1 : 2;
      this.fightText = this.winner === 1 ? 'P1 VICTORIOUS!' : (this.mode === 'p1_vs_cpu' ? 'CPU VICTORIOUS!' : 'P2 VICTORIOUS!');
      this.fightTextOpacity = 1.0;

      // Victory / defeat audio
      if (this.winner === 1) {
        this.sound.playWin();
      } else {
        this.sound.playLose();
      }

      this.notifyUI();
    } else {
      // Advance round
      this.round++;
      this.init(); // Reset positions for next round
    }
  }

  restartMatch() {
    this.round = 1;
    this.p1Wins = 0;
    this.p2Wins = 0;
    this.winner = null;
    this.init();
  }

  draw() {
    this.ctx.save();

    // Clear canvas
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Apply Screen Shake
    if (this.effects.shakeDuration > 0) {
      const dx = (Math.random() - 0.5) * this.effects.shakeIntensity;
      const dy = (Math.random() - 0.5) * this.effects.shakeIntensity;
      this.ctx.translate(dx, dy);
    }

    // DRAW ARENA BACKGROUND
    this.drawArena();

    // Draw ambient dust particles (floating)
    this.ctx.fillStyle = '#ffffff';
    this.ambientDust.forEach(dust => {
      this.ctx.save();
      this.ctx.globalAlpha = dust.alpha;
      this.ctx.beginPath();
      this.ctx.arc(dust.x, dust.y, dust.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });

    // Draw weapons on the ground
    this.weapons.forEach(w => w.draw(this.ctx));

    // Draw players
    if (this.p1) this.p1.draw(this.ctx);
    if (this.p2) this.p2.draw(this.ctx);

    // Draw visual particle effects
    this.effects.draw(this.ctx);

    // DRAW HUD INFO ON CANVAS BANNERS (FIGHT/ROUND TEXTS)
    this.drawBanners();

    this.ctx.restore();
  }

  drawArena() {
    // 1. Dark sky background gradient
    const skyGrad = this.ctx.createLinearGradient(0, 0, 0, this.groundY);
    skyGrad.addColorStop(0, '#09090b'); // zinc 950
    skyGrad.addColorStop(0.5, '#18181b'); // zinc 900
    skyGrad.addColorStop(1, '#0f172a'); // slate 900
    this.ctx.fillStyle = skyGrad;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // 2. Draw traditional Chinese/Japanese Dojo background (neon wireframe design)
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(236, 72, 153, 0.08)'; // neon pink faint lines
    this.ctx.lineWidth = 2;

    // Draw Pagoda outline in distance
    this.ctx.beginPath();
    const midX = this.width / 2;
    // Pagoda roof layers
    this.ctx.moveTo(midX - 180, this.groundY);
    this.ctx.lineTo(midX - 180, this.groundY - 140);
    this.ctx.lineTo(midX - 220, this.groundY - 140);
    this.ctx.quadraticCurveTo(midX - 230, this.groundY - 145, midX - 240, this.groundY - 165); // curved roof corner
    this.ctx.lineTo(midX + 240, this.groundY - 165);
    this.ctx.quadraticCurveTo(midX + 230, this.groundY - 145, midX + 220, this.groundY - 140);
    this.ctx.lineTo(midX + 180, this.groundY - 140);
    this.ctx.lineTo(midX + 180, this.groundY);
    this.ctx.stroke();

    // Dojo column pillars
    this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)'; // neon cyan faint lines
    this.ctx.lineWidth = 4;
    this.ctx.strokeRect(100, 0, 40, this.groundY);
    this.ctx.strokeRect(this.width - 140, 0, 40, this.groundY);

    // Cross beam support
    this.ctx.strokeRect(0, 80, this.width, 25);

    // Sun / Moon disk
    const sunGrad = this.ctx.createRadialGradient(midX, 220, 0, midX, 220, 120);
    sunGrad.addColorStop(0, 'rgba(236, 72, 153, 0.04)');
    sunGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    this.ctx.fillStyle = sunGrad;
    this.ctx.beginPath();
    this.ctx.arc(midX, 220, 120, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();

    // 3. Ground / Floor
    // Floor top edge (glowing border line)
    this.ctx.save();
    this.ctx.shadowBlur = 15;
    this.ctx.shadowColor = '#00f0ff';
    this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.7)';
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.groundY);
    this.ctx.lineTo(this.width, this.groundY);
    this.ctx.stroke();
    this.ctx.restore();

    // Ground fill gradient
    const groundGrad = this.ctx.createLinearGradient(0, this.groundY, 0, this.height);
    groundGrad.addColorStop(0, '#090d16');
    groundGrad.addColorStop(0.1, '#111827');
    groundGrad.addColorStop(1, '#030712');
    this.ctx.fillStyle = groundGrad;
    this.ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);

    // Floor Grid lines (3D perspective)
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(236, 72, 153, 0.15)'; // glowing grid lines
    this.ctx.lineWidth = 1;
    for (let i = -10; i < 25; i++) {
      this.ctx.beginPath();
      // perspective lines radiating outwards
      this.ctx.moveTo(midX + i * 30, this.groundY);
      this.ctx.lineTo(midX + i * 90, this.height);
      this.ctx.stroke();
    }
    
    // Horizontal floor grid lines
    for (let y = this.groundY; y < this.height; y += 15) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  drawBanners() {
    if (!this.fightText || this.fightTextOpacity <= 0) return;

    this.ctx.save();
    this.ctx.globalAlpha = this.fightTextOpacity;

    // Shadow backer strip
    this.ctx.fillStyle = 'rgba(9, 9, 11, 0.65)';
    this.ctx.fillRect(0, this.height * 0.35, this.width, 100);
    this.ctx.strokeStyle = 'rgba(236, 72, 153, 0.3)';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(-10, this.height * 0.35, this.width + 20, 100);

    // Fight Text Shadow Blur Glow
    this.ctx.shadowBlur = 20;
    this.ctx.shadowColor = '#ec4899';
    this.ctx.fillStyle = '#ffffff';

    // Set font style
    this.ctx.font = '900 48px "Inter", "Impact", "Outfit", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    // Draw text
    this.ctx.fillText(this.fightText, this.width / 2, this.height * 0.35 + 50);

    this.ctx.restore();
  }

  cleanUp() {
    this.stopTimer();
    if (this.input) {
      this.input.reset();
    }
  }
}
