import { Stickman, STATES } from './Stickman';
import { EffectSystem } from './Effects';
import { InputHandler } from './InputHandler';
import { Weapon } from './Weapon';
import { AIController } from './AI';
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
    this.fightText = 'STICKMAN DUELIST';
    this.fightTextOpacity = 1.0;
    
    // Ambient dust particles for atmospheric look
    this.ambientDust = [];
    this.initAmbientDust();

    // Weapon spawn counter
    this.weaponSpawnTimer = 300 + Math.random() * 300; // 5-10 seconds

    this.onUIEvent = config.onUIEvent || (() => {}); // Callback to communicate transitions to React

    // Screen impact flash duration
    this.impactFlashDuration = 0;

    // Available maps
    this.maps = ['cyberpunk_dojo', 'neon_rooftop', 'zen_garden', 'magma_cavern', 'stormy_temple'];
    this.currentMap = 'cyberpunk_dojo';
  }

  setMap(mapName) {
    if (this.maps.includes(mapName)) {
      this.currentMap = mapName;
    }
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

    // Set up impact flash callbacks
    this.p1._onImpactFlash = () => { this.impactFlashDuration = 8; };
    this.p2._onImpactFlash = () => { this.impactFlashDuration = 8; };

    this.weapons = [];
    this.gameState = 'countdown';
    this.fightText = this.round === 1 ? 'STICKMAN DUELIST' : `ROUND ${this.round}`;
    this.fightTextOpacity = 1.0;
    this.roundTimer = 99;
    
    this.startTimer();

    // Play round start gong
    this.sound.playGong();

    // Re-initialize ambient dust for the new map
    this.initAmbientDust();

    // Spawn initial weapons optionally
    if (this.weaponSpawnEnabled) {
      this.weapons.push(new Weapon(this.width * 0.35, 100, 'sword'));
      this.weapons.push(new Weapon(this.width * 0.65, 100, 'staff'));
    }

    this.notifyUI();
  }

  initAmbientDust() {
    this.ambientDust = [];
    const count = (this.currentMap === 'neon_rooftop' || this.currentMap === 'stormy_temple') ? 45 : 25;
    
    for (let i = 0; i < count; i++) {
      if (this.currentMap === 'cyberpunk_dojo') {
        this.ambientDust.push({
          x: Math.random() * this.width,
          y: Math.random() * this.groundY,
          vx: -0.15 - Math.random() * 0.45,
          vy: 0.15 + Math.random() * 0.35,
          size: 1.5 + Math.random() * 3.5,
          alpha: 0.15 + Math.random() * 0.35,
          isPetal: true,
          color: '#f472b6',
          angle: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.04
        });
      } else if (this.currentMap === 'neon_rooftop') {
        this.ambientDust.push({
          x: Math.random() * this.width,
          y: Math.random() * this.groundY,
          vx: -0.1 - Math.random() * 0.2,
          vy: 2.5 + Math.random() * 2.0,
          size: 1 + Math.random() * 1.5,
          alpha: 0.1 + Math.random() * 0.25,
          isRain: true,
          color: '#38bdf8'
        });
      } else if (this.currentMap === 'zen_garden') {
        this.ambientDust.push({
          x: Math.random() * this.width,
          y: Math.random() * this.groundY,
          vx: -0.2 - Math.random() * 0.5,
          vy: 0.1 + Math.random() * 0.25,
          size: 2.0 + Math.random() * 3.0,
          alpha: 0.2 + Math.random() * 0.35,
          isLeaf: true,
          color: '#4ade80',
          angle: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.03
        });
      } else if (this.currentMap === 'magma_cavern') {
        this.ambientDust.push({
          x: Math.random() * this.width,
          y: Math.random() * this.groundY,
          vx: (Math.random() - 0.5) * 0.8,
          vy: -0.8 - Math.random() * 1.2, // rising upwards
          size: 1.5 + Math.random() * 2.5,
          alpha: 0.25 + Math.random() * 0.45,
          isEmber: true,
          color: '#f97316'
        });
      } else {
        // Stormy Temple rain
        this.ambientDust.push({
          x: Math.random() * this.width,
          y: Math.random() * this.groundY,
          vx: -1.5 - Math.random() * 1.0, // wind-blown left
          vy: 3.5 + Math.random() * 2.5,
          size: 1.2 + Math.random() * 1.5,
          alpha: 0.12 + Math.random() * 0.22,
          isRain: true,
          color: '#94a3b8'
        });
      }
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
    // Decrement impact flash duration
    if (this.impactFlashDuration > 0) {
      this.impactFlashDuration--;
    }

    // Update ambient dust
    this.ambientDust.forEach(dust => {
      dust.x += dust.vx;
      dust.y += dust.vy;
      if (dust.isPetal || dust.isLeaf) {
        dust.angle += dust.rotSpeed;
      }
      // Wrap-around logic for falling / rising particles
      if (dust.isEmber) {
        if (dust.y < 0) {
          dust.y = this.groundY;
          dust.x = Math.random() * this.width;
        }
      } else {
        if (dust.y > this.groundY) {
          dust.y = 0;
          dust.x = Math.random() * this.width;
        }
      }
      if (dust.x < 0) {
        dust.x = this.width;
        dust.y = Math.random() * this.groundY;
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
    this.p1.update(this.groundY, this.width, this.p2, this.effects);
    this.p2.update(this.groundY, this.width, this.p1, this.effects);

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

    // Call notifyUI every frame to keep React HUD in sync
    this.notifyUI();
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
      
      // Special Chi Attack / Karate Flurry (close range variant)
      if (inputs.special && player.isGrounded) {
        const isComboFinisher = player.comboCount >= 2;
        const hasFullCharge = player.chi >= player.maxChi;
        
        if (hasFullCharge || isComboFinisher) {
          const opponent = player === this.p1 ? this.p2 : this.p1;
          const dist = player.pos.dist(opponent.pos);
          
          if (dist < 95) {
            // Trigger Karate Flurry at close range
            player.setState(STATES.KARATE_FLURRY);
            player.vel.x = player.dir * 4.5; // slight lunge forward
          } else {
            // Trigger Special Chi Blast at range
            player.setState(STATES.SPECIAL);
            player.vel.x = 0;
          }
          
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

    // Draw ambient dust and falling sakura petals
    this.ambientDust.forEach(dust => {
      this.ctx.save();
      this.ctx.globalAlpha = dust.alpha;
      if (dust.isPetal) {
        this.ctx.fillStyle = '#f472b6'; // pink-400
        this.ctx.translate(dust.x, dust.y);
        this.ctx.rotate(dust.angle);
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, dust.size * 1.4, dust.size * 0.7, 0, 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(dust.x, dust.y, dust.size, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.restore();
    });

    // Draw weapons on the ground
    this.weapons.forEach(w => w.draw(this.ctx));

    // Draw players
    if (this.p1) this.p1.draw(this.ctx);
    if (this.p2) this.p2.draw(this.ctx);

    // Draw visual particle effects
    this.effects.draw(this.ctx);

    // Draw screen flash overlay on impact
    if (this.impactFlashDuration > 0) {
      this.ctx.save();
      this.ctx.fillStyle = `rgba(255, 255, 255, ${(this.impactFlashDuration / 8) * 0.35})`;
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.ctx.restore();
    }

    // DRAW HUD INFO ON CANVAS BANNERS (FIGHT/ROUND TEXTS)
    this.drawBanners();

    this.ctx.restore();
  }

  drawArena() {
    const midX = this.width / 2;

    switch (this.currentMap) {
      case 'neon_rooftop':
        this.drawNeonRooftop(midX);
        break;
      case 'zen_garden':
        this.drawZenGarden(midX);
        break;
      case 'magma_cavern':
        this.drawMagmaCavern(midX);
        break;
      case 'stormy_temple':
        this.drawStormyTemple(midX);
        break;
      case 'cyberpunk_dojo':
      default:
        this.drawCyberpunkDojo(midX);
        break;
    }
  }

  drawCyberpunkDojo(midX) {
    const skyGrad = this.ctx.createLinearGradient(0, 0, 0, this.groundY);
    skyGrad.addColorStop(0, '#06060c');
    skyGrad.addColorStop(0.5, '#0c0f1d');
    skyGrad.addColorStop(1, '#11132a');
    this.ctx.fillStyle = skyGrad;
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.save();
    this.ctx.fillStyle = '#070914';
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.groundY);
    this.ctx.lineTo(0, this.groundY - 110);
    this.ctx.quadraticCurveTo(this.width * 0.22, this.groundY - 160, this.width * 0.38, this.groundY - 100);
    this.ctx.lineTo(this.width * 0.42, this.groundY - 100);
    this.ctx.lineTo(midX - 55, this.groundY - 100);
    this.ctx.lineTo(midX, this.groundY - 180);
    this.ctx.lineTo(midX + 55, this.groundY - 100);
    this.ctx.lineTo(this.width * 0.62, this.groundY - 100);
    this.ctx.quadraticCurveTo(this.width * 0.78, this.groundY - 145, this.width, this.groundY - 90);
    this.ctx.lineTo(this.width, this.groundY);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.fillStyle = 'rgba(244, 114, 182, 0.12)';
    this.ctx.beginPath();
    this.ctx.moveTo(midX - 18, this.groundY - 155);
    this.ctx.lineTo(midX, this.groundY - 180);
    this.ctx.lineTo(midX + 18, this.groundY - 155);
    this.ctx.lineTo(midX + 10, this.groundY - 148);
    this.ctx.lineTo(midX, this.groundY - 152);
    this.ctx.lineTo(midX - 10, this.groundY - 148);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.restore();

    this.ctx.save();
    this.ctx.fillStyle = '#0f172a';
    this.ctx.lineWidth = 9;
    this.ctx.lineCap = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(70, this.groundY);
    this.ctx.quadraticCurveTo(60, this.groundY - 55, 45, this.groundY - 95);
    this.ctx.quadraticCurveTo(48, this.groundY - 125, 25, this.groundY - 145);
    this.ctx.stroke();
    this.ctx.lineWidth = 5.5;
    this.ctx.beginPath();
    this.ctx.moveTo(52, this.groundY - 75);
    this.ctx.quadraticCurveTo(80, this.groundY - 105, 95, this.groundY - 115);
    this.ctx.stroke();
    this.ctx.shadowBlur = 18;
    this.ctx.shadowColor = '#f472b6';
    this.ctx.fillStyle = 'rgba(244, 114, 182, 0.88)';

    const drawFoliage = (x, y, r) => {
      this.ctx.beginPath();
      this.ctx.arc(x, y, r, 0, Math.PI * 2);
      this.ctx.arc(x - r * 0.5, y + r * 0.2, r * 0.85, 0, Math.PI * 2);
      this.ctx.arc(x + r * 0.5, y - r * 0.2, r * 0.85, 0, Math.PI * 2);
      this.ctx.arc(x + r * 0.2, y + r * 0.5, r * 0.75, 0, Math.PI * 2);
      this.ctx.fill();
    };

    drawFoliage(25, this.groundY - 150, 18);
    drawFoliage(95, this.groundY - 120, 15);
    drawFoliage(55, this.groundY - 155, 13);
    this.ctx.restore();

    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(236, 72, 153, 0.06)';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.moveTo(midX - 180, this.groundY);
    this.ctx.lineTo(midX - 180, this.groundY - 140);
    this.ctx.lineTo(midX - 220, this.groundY - 140);
    this.ctx.quadraticCurveTo(midX - 230, this.groundY - 145, midX - 240, this.groundY - 165);
    this.ctx.lineTo(midX + 240, this.groundY - 165);
    this.ctx.quadraticCurveTo(midX + 230, this.groundY - 145, midX + 220, this.groundY - 140);
    this.ctx.lineTo(midX + 180, this.groundY - 140);
    this.ctx.lineTo(midX + 180, this.groundY);
    this.ctx.stroke();
    this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.04)';
    this.ctx.lineWidth = 3.5;
    this.ctx.strokeRect(100, 0, 40, this.groundY);
    this.ctx.strokeRect(this.width - 140, 0, 40, this.groundY);
    this.ctx.strokeRect(0, 80, this.width, 25);
    this.ctx.restore();

    this.ctx.save();
    this.ctx.shadowBlur = 12;
    this.ctx.shadowColor = '#f59e0b';
    this.ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)';
    this.ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
    this.ctx.lineWidth = 2;
    const drawLantern = (x, y) => {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 105);
      this.ctx.lineTo(x, y);
      this.ctx.stroke();
      this.ctx.beginPath();
      this.ctx.roundRect(x - 7, y, 14, 22, 4);
      this.ctx.fill();
      this.ctx.stroke();
      this.ctx.fillStyle = '#0f172a';
      this.ctx.fillRect(x - 8, y - 2, 16, 4);
      this.ctx.fillRect(x - 8, y + 20, 16, 4);
      this.ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
    };
    drawLantern(this.width * 0.18, 125);
    drawLantern(this.width * 0.32, 125);
    drawLantern(this.width * 0.68, 125);
    drawLantern(this.width * 0.82, 125);
    this.ctx.restore();

    this.ctx.save();
    this.ctx.shadowBlur = 14;
    this.ctx.shadowColor = '#00f0ff';
    this.ctx.fillStyle = 'rgba(0, 240, 255, 0.12)';
    this.ctx.fillRect(108, 125, 24, 80);
    this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.7)';
    this.ctx.lineWidth = 1.5;
    this.ctx.strokeRect(108, 125, 24, 80);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '900 15px "Outfit", "Inter", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('龍', 120, 145);
    this.ctx.fillText('闘', 120, 185);
    this.ctx.shadowColor = '#ec4899';
    this.ctx.fillStyle = 'rgba(236, 72, 153, 0.12)';
    this.ctx.fillRect(this.width - 132, 125, 24, 80);
    this.ctx.strokeStyle = 'rgba(236, 72, 153, 0.7)';
    this.ctx.strokeRect(this.width - 132, 125, 24, 80);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText('虎', this.width - 120, 145);
    this.ctx.fillText('極', this.width - 120, 185);
    this.ctx.restore();

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

    const groundGrad = this.ctx.createLinearGradient(0, this.groundY, 0, this.height);
    groundGrad.addColorStop(0, '#090d16');
    groundGrad.addColorStop(0.1, '#111827');
    groundGrad.addColorStop(1, '#030712');
    this.ctx.fillStyle = groundGrad;
    this.ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);

    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(236, 72, 153, 0.15)';
    this.ctx.lineWidth = 1;
    for (let i = -10; i < 25; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(midX + i * 30, this.groundY);
      this.ctx.lineTo(midX + i * 90, this.height);
      this.ctx.stroke();
    }
    for (let y = this.groundY; y < this.height; y += 15) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  drawNeonRooftop(midX) {
    const skyGrad = this.ctx.createLinearGradient(0, 0, 0, this.groundY);
    skyGrad.addColorStop(0, '#090b1f');
    skyGrad.addColorStop(0.5, '#211e45');
    skyGrad.addColorStop(1, '#0f172a');
    this.ctx.fillStyle = skyGrad;
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.save();
    const handleBuilding = (x, w, h, color) => {
      this.ctx.fillStyle = color;
      this.ctx.fillRect(x, this.groundY - h, w, h);
    };
    handleBuilding(20, 90, 200, '#131b3a');
    handleBuilding(120, 80, 175, '#1a2441');
    handleBuilding(220, 100, 210, '#0e162d');
    handleBuilding(340, 120, 220, '#191f39');
    handleBuilding(520, 160, 230, '#0c1327');
    handleBuilding(700, 90, 185, '#13203e');
    handleBuilding(820, 100, 200, '#10182f');
    this.ctx.restore();

    this.ctx.save();
    this.ctx.fillStyle = '#0ea5e9';
    for (let x = 30; x < 920; x += 40) {
      const height = 14 + Math.sin(x * 0.1) * 6;
      this.ctx.fillRect(x, this.groundY - 40 - height, 4, height);
      this.ctx.fillRect(x + 18, this.groundY - 70 - height * 0.8, 4, height * 0.6);
    }
    this.ctx.restore();

    this.ctx.save();
    this.ctx.fillStyle = 'rgba(59, 130, 246, 0.18)';
    this.ctx.fillRect(0, 0, this.width, 65 + Math.sin(Date.now() * 0.002) * 8);
    this.ctx.restore();

    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.18)';
    this.ctx.lineWidth = 5;
    for (let x = 0; x < this.width; x += 140) {
      this.ctx.beginPath();
      this.ctx.moveTo(x + 30, this.groundY - 28);
      this.ctx.lineTo(x + 70, this.groundY - 80);
      this.ctx.lineTo(x + 110, this.groundY - 28);
      this.ctx.stroke();
    }
    this.ctx.restore();

    this.ctx.save();
    this.ctx.lineWidth = 10;
    this.ctx.strokeStyle = 'rgba(96, 165, 250, 0.35)';
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.groundY - 14);
    this.ctx.lineTo(this.width, this.groundY - 14);
    this.ctx.stroke();
    this.ctx.restore();

    const groundGrad = this.ctx.createLinearGradient(0, this.groundY, 0, this.height);
    groundGrad.addColorStop(0, '#121a35');
    groundGrad.addColorStop(1, '#070a15');
    this.ctx.fillStyle = groundGrad;
    this.ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);

    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(96, 165, 250, 0.2)';
    this.ctx.lineWidth = 1;
    for (let i = -10; i < 30; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(midX + i * 25, this.groundY);
      this.ctx.lineTo(midX + i * 90, this.height);
      this.ctx.stroke();
    }
    for (let y = this.groundY; y < this.height; y += 18) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }
    this.ctx.restore();

    this.ctx.save();
    this.ctx.fillStyle = '#2563eb';
    this.ctx.font = '700 32px "Outfit", "Inter", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('NEON ROOFTOP', midX, 90);
    this.ctx.restore();
  }

  drawZenGarden(midX) {
    const skyGrad = this.ctx.createLinearGradient(0, 0, 0, this.groundY);
    skyGrad.addColorStop(0, '#0f172a');
    skyGrad.addColorStop(0.5, '#064e3b');
    skyGrad.addColorStop(1, '#0f172a');
    this.ctx.fillStyle = skyGrad;
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.save();
    this.ctx.fillStyle = '#064e3b';
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.groundY);
    this.ctx.lineTo(0, this.groundY - 90);
    this.ctx.quadraticCurveTo(this.width * 0.25, this.groundY - 170, this.width * 0.45, this.groundY - 90);
    this.ctx.lineTo(this.width * 0.55, this.groundY - 90);
    this.ctx.quadraticCurveTo(this.width * 0.75, this.groundY - 160, this.width, this.groundY - 90);
    this.ctx.lineTo(this.width, this.groundY);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.restore();

    this.ctx.save();
    this.ctx.fillStyle = '#166534';
    this.ctx.fillRect(60, this.groundY - 160, 40, 170);
    this.ctx.fillRect(this.width - 100, this.groundY - 170, 40, 180);
    this.ctx.fillRect(120, this.groundY - 150, 30, 160);
    this.ctx.fillRect(this.width - 150, this.groundY - 150, 30, 160);
    this.ctx.restore();

    this.ctx.save();
    this.ctx.fillStyle = '#22c55e';
    this.ctx.beginPath();
    this.ctx.ellipse(80, this.groundY - 160, 48, 32, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.ellipse(120, this.groundY - 130, 42, 28, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.ellipse(this.width - 80, this.groundY - 160, 48, 32, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.ellipse(this.width - 120, this.groundY - 130, 42, 28, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();

    this.ctx.save();
    this.ctx.fillStyle = '#5eead4';
    this.ctx.shadowBlur = 12;
    this.ctx.shadowColor = '#5eead4';
    this.ctx.beginPath();
    this.ctx.ellipse(midX, this.groundY - 120, 60, 45, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();

    this.ctx.save();
    this.ctx.fillStyle = '#1f2937';
    this.ctx.fillRect(midX - 120, this.groundY - 50, 240, 18);
    this.ctx.strokeStyle = '#94a3b8';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(midX - 120, this.groundY - 41);
    this.ctx.lineTo(midX + 120, this.groundY - 41);
    this.ctx.stroke();
    this.ctx.restore();

    const groundGrad = this.ctx.createLinearGradient(0, this.groundY, 0, this.height);
    groundGrad.addColorStop(0, '#092e20');
    groundGrad.addColorStop(0.15, '#0b2f24');
    groundGrad.addColorStop(1, '#07161a');
    this.ctx.fillStyle = groundGrad;
    this.ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);

    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(22, 163, 74, 0.18)';
    this.ctx.lineWidth = 1;
    for (let i = -10; i < 30; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(midX + i * 28, this.groundY);
      this.ctx.lineTo(midX + i * 100, this.height);
      this.ctx.stroke();
    }
    for (let y = this.groundY; y < this.height; y += 18) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  drawMagmaCavern(midX) {
    const skyGrad = this.ctx.createLinearGradient(0, 0, 0, this.groundY);
    skyGrad.addColorStop(0, '#2b0505');
    skyGrad.addColorStop(0.45, '#5a0f0f');
    skyGrad.addColorStop(1, '#120505');
    this.ctx.fillStyle = skyGrad;
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.save();
    this.ctx.fillStyle = '#3f0a0a';
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.groundY);
    this.ctx.lineTo(0, this.groundY - 80);
    this.ctx.lineTo(80, this.groundY - 140);
    this.ctx.lineTo(180, this.groundY - 90);
    this.ctx.lineTo(260, this.groundY - 150);
    this.ctx.lineTo(380, this.groundY - 90);
    this.ctx.lineTo(460, this.groundY - 160);
    this.ctx.lineTo(560, this.groundY - 110);
    this.ctx.lineTo(670, this.groundY - 175);
    this.ctx.lineTo(760, this.groundY - 95);
    this.ctx.lineTo(860, this.groundY - 145);
    this.ctx.lineTo(this.width, this.groundY - 90);
    this.ctx.lineTo(this.width, this.groundY);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.restore();

    this.ctx.save();
    this.ctx.fillStyle = '#f97316';
    this.ctx.beginPath();
    this.ctx.ellipse(200, this.groundY - 45, 90, 50, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.ellipse(640, this.groundY - 30, 100, 60, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();

    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(248, 113, 64, 0.35)';
    this.ctx.lineWidth = 8;
    this.ctx.beginPath();
    this.ctx.moveTo(120, 80);
    this.ctx.lineTo(180, 130);
    this.ctx.lineTo(240, 60);
    this.ctx.lineTo(320, 120);
    this.ctx.lineTo(380, 70);
    this.ctx.stroke();
    this.ctx.restore();

    const groundGrad = this.ctx.createLinearGradient(0, this.groundY, 0, this.height);
    groundGrad.addColorStop(0, '#2f0505');
    groundGrad.addColorStop(0.15, '#3f0503');
    groundGrad.addColorStop(1, '#090303');
    this.ctx.fillStyle = groundGrad;
    this.ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);

    this.ctx.save();
    this.ctx.fillStyle = '#fbbf24';
    for (let i = 0; i < 18; i++) {
      const x = 60 + i * 50;
      const y = this.groundY - 12 - (i % 3) * 6;
      this.ctx.beginPath();
      this.ctx.arc(x, y, 6, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();

    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(248, 113, 64, 0.17)';
    this.ctx.lineWidth = 1;
    for (let i = -10; i < 25; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(midX + i * 28, this.groundY);
      this.ctx.lineTo(midX + i * 90, this.height);
      this.ctx.stroke();
    }
    for (let y = this.groundY; y < this.height; y += 20) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  drawStormyTemple(midX) {
    const skyGrad = this.ctx.createLinearGradient(0, 0, 0, this.groundY);
    skyGrad.addColorStop(0, '#13182b');
    skyGrad.addColorStop(0.4, '#0f172a');
    skyGrad.addColorStop(1, '#111827');
    this.ctx.fillStyle = skyGrad;
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.save();
    this.ctx.fillStyle = '#0f172a';
    this.ctx.fillRect(midX - 160, this.groundY - 140, 320, 140);
    this.ctx.fillStyle = '#111827';
    this.ctx.fillRect(midX - 160, this.groundY - 160, 320, 20);
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(midX - 140, this.groundY - 110, 280, 20);
    this.ctx.restore();

    this.ctx.save();
    this.ctx.fillStyle = '#274058';
    this.ctx.fillRect(140, this.groundY - 220, 50, 220);
    this.ctx.fillRect(this.width - 190, this.groundY - 220, 50, 220);
    this.ctx.restore();

    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
    this.ctx.lineWidth = 3;
    for (let i = 0; i < 16; i++) {
      const startX = 20 + i * 60;
      this.ctx.beginPath();
      this.ctx.moveTo(startX, 0);
      this.ctx.lineTo(startX - 8, this.groundY);
      this.ctx.stroke();
    }
    this.ctx.restore();

    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(195, 211, 253, 0.45)';
    this.ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      const x = 40 + i * 70;
      const y = 40 + (i % 3) * 20;
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
      this.ctx.lineTo(x + 15, y + 60);
      this.ctx.stroke();
    }
    this.ctx.restore();

    this.ctx.save();
    this.ctx.strokeStyle = '#f8fafc';
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.moveTo(midX + 20, 40);
    this.ctx.lineTo(midX + 12, 100);
    this.ctx.lineTo(midX + 30, 100);
    this.ctx.lineTo(midX + 18, 160);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.moveTo(midX - 20, 65);
    this.ctx.lineTo(midX - 10, 118);
    this.ctx.lineTo(midX - 28, 118);
    this.ctx.lineTo(midX - 15, 180);
    this.ctx.stroke();
    this.ctx.restore();

    this.ctx.save();
    const groundGrad = this.ctx.createLinearGradient(0, this.groundY, 0, this.height);
    groundGrad.addColorStop(0, '#111827');
    groundGrad.addColorStop(0.2, '#0a1121');
    groundGrad.addColorStop(1, '#05080f');
    this.ctx.fillStyle = groundGrad;
    this.ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);
    this.ctx.restore();

    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
    this.ctx.lineWidth = 1;
    for (let i = -10; i < 30; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(midX + i * 30, this.groundY);
      this.ctx.lineTo(midX + i * 90, this.height);
      this.ctx.stroke();
    }
    for (let y = this.groundY; y < this.height; y += 16) {
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
