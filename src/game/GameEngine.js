import { Stickman, STATES, triggerHaptics } from './Stickman';
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
    this.mode = config.mode || 'p1_vs_cpu'; // 'p1_vs_cpu', 'p1_vs_p2', 'practice', 'survival'
    this.difficulty = config.difficulty || 'medium';
    this.p1Color = config.p1Color || '#00f0ff';
    this.p2Color = config.p2Color || '#ec4899';
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
    this.gameState = 'countdown';
    this.roundTimer = 99;
    this.timerInterval = null;
    this.round = 1;
    this.p1Wins = 0;
    this.p2Wins = 0;
    this.winner = null;
    this.koTimer = 0;
    this.fightText = 'STICKMAN DUELIST';
    this.fightTextOpacity = 1.0;

    // Ambient dust
    this.ambientDust = [];
    this.initAmbientDust();

    // Weapon spawn counter
    this.weaponSpawnTimer = 300 + Math.random() * 300;

    this.onUIEvent = config.onUIEvent || (() => {});
    this.impactFlashDuration = 0;

    // Available maps
    this.maps = ['cyberpunk_dojo', 'neon_rooftop', 'zen_garden', 'magma_cavern', 'stormy_temple'];
    this.currentMap = 'cyberpunk_dojo';

    // ─── SURVIVAL MODE ───────────────────────────────────────────────────
    this.survivalWave = 1;
    this.survivalHighScore = parseInt(localStorage.getItem('survivalHighScore') || '0', 10);

    // ─── PRACTICE MODE ───────────────────────────────────────────────────
    this.practiceInfiniteHealth = true;
    this.practiceInfiniteChi = false;
    this.practiceDummyMode = 'stand'; // 'stand', 'block', 'crouch', 'jump'
    this.inputLog = []; // Rolling log of last 8 p1 input events
    this._lastP1Inputs = {};

    // ─── PLATFORMS ───────────────────────────────────────────────────────
    this.platforms = []; // { x, y, width, height }

    // ─── HAZARDS ─────────────────────────────────────────────────────────
    this.hazardTimer = 0;
    this.activeHazards = []; // { type, x, y, timer, warningTimer }
  }

  setMap(mapName) {
    if (this.maps.includes(mapName)) {
      this.currentMap = mapName;
    }
    // Update platform positions for this map
    this.platforms = this.getPlatformsForMap(this.currentMap);
  }

  getPlatformsForMap(map) {
    const gY = this.groundY;
    switch (map) {
      case 'cyberpunk_dojo':
        return [
          { x: this.width * 0.2 - 55, y: gY - 130, width: 110, height: 14 },
          { x: this.width * 0.8 - 55, y: gY - 130, width: 110, height: 14 },
          { x: this.width * 0.5 - 65, y: gY - 200, width: 130, height: 14 },
        ];
      case 'neon_rooftop':
        return [
          { x: this.width * 0.15, y: gY - 110, width: 100, height: 12 },
          { x: this.width * 0.75, y: gY - 110, width: 100, height: 12 },
        ];
      case 'zen_garden':
        return [
          { x: this.width * 0.25 - 50, y: gY - 150, width: 100, height: 14 },
          { x: this.width * 0.75 - 50, y: gY - 150, width: 100, height: 14 },
          { x: this.width * 0.5 - 45, y: gY - 220, width: 90, height: 12 },
        ];
      case 'magma_cavern':
        return [
          { x: this.width * 0.2, y: gY - 120, width: 90, height: 14 },
          { x: this.width * 0.7, y: gY - 120, width: 90, height: 14 },
        ];
      case 'stormy_temple':
        return [
          { x: this.width * 0.3, y: gY - 160, width: 120, height: 14 },
          { x: this.width * 0.55, y: gY - 110, width: 90, height: 12 },
        ];
      default:
        return [];
    }
  }

  init() {
    const isAI = this.mode === 'p1_vs_cpu' || this.mode === 'survival';
    this.p1 = new Stickman(this.width * 0.25, this.groundY, 1, this.p1Color, this.p1Name, false);
    this.p2 = new Stickman(this.width * 0.75, this.groundY, 2, this.p2Color, this.p2Name, isAI);

    this.p1.engineProjectiles = this.effects.blasts;
    this.p2.engineProjectiles = this.effects.blasts;
    this.p1.soundSystem = this.sound;
    this.p2.soundSystem = this.sound;
    this.p1._onImpactFlash = () => { this.impactFlashDuration = 8; };
    this.p2._onImpactFlash = () => { this.impactFlashDuration = 8; };

    this.weapons = [];
    this.activeHazards = [];
    this.hazardTimer = 0;
    this.gameState = 'countdown';

    if (this.mode === 'survival') {
      this.fightText = this.survivalWave === 1 ? 'SURVIVAL MODE' : `WAVE ${this.survivalWave}`;
    } else if (this.mode === 'practice') {
      this.fightText = 'PRACTICE DOJO';
    } else {
      this.fightText = this.round === 1 ? 'STICKMAN DUELIST' : `ROUND ${this.round}`;
    }
    this.fightTextOpacity = 1.0;
    this.roundTimer = this.mode === 'practice' ? 999 : 99;

    // In survival, scale difficulty with wave
    if (this.mode === 'survival') {
      const difficulties = ['easy', 'medium', 'medium', 'hard', 'hard'];
      const waveDiff = difficulties[Math.min(this.survivalWave - 1, difficulties.length - 1)];
      this.ai = new AIController(waveDiff);
    }

    if (this.mode !== 'practice') this.startTimer();
    this.sound.playGong();
    this.initAmbientDust();
    this.platforms = this.getPlatformsForMap(this.currentMap);

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
      fightText: this.fightText,
      survivalWave: this.survivalWave,
      survivalHighScore: this.survivalHighScore,
      mode: this.mode,
    });
  }

  logInput(label) {
    this.inputLog.push({ label, t: Date.now() });
    if (this.inputLog.length > 8) this.inputLog.shift();
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

    // ── Practice mode dummy AI override ──────────────────────────────────
    if (this.mode === 'practice') {
      switch (this.practiceDummyMode) {
        case 'block':  p2Inputs = { left:false,right:false,jump:false,crouch:false,block:true,punch:false,kick:false,sweep:false,special:false,pickup:false }; break;
        case 'crouch': p2Inputs = { left:false,right:false,jump:false,crouch:true,block:false,punch:false,kick:false,sweep:false,special:false,pickup:false }; break;
        case 'jump':   p2Inputs = { left:false,right:false,jump:this.p2.isGrounded,crouch:false,block:false,punch:false,kick:false,sweep:false,special:false,pickup:false }; break;
        default:       p2Inputs = { left:false,right:false,jump:false,crouch:false,block:false,punch:false,kick:false,sweep:false,special:false,pickup:false }; break;
      }
    } else if (this.p2.isAI) {
      p2Inputs = this.ai.update(this.p2, this.p1, this.weapons);
    } else {
      p2Inputs = this.input.getP2Inputs();
    }

    // ── Track p1 input changes for practice log ──────────────────────────
    if (this.mode === 'practice') {
      const labels = { punch:'PUNCH', kick:'KICK', sweep:'SWEEP', special:'CHI', jump:'JUMP', left:'←', right:'→', crouch:'↓', block:'BLOCK', pickup:'ITEM' };
      for (const [key, label] of Object.entries(labels)) {
        if (p1Inputs[key] && !this._lastP1Inputs[key]) this.logInput(label);
      }
      this._lastP1Inputs = { ...p1Inputs };
    }

    // 2. Apply player inputs based on game state
    if (this.gameState === 'fight') {
      this.applyInputs(this.p1, p1Inputs);
      this.applyInputs(this.p2, p2Inputs);

      // Practice: keep health/chi at max
      if (this.mode === 'practice') {
        if (this.practiceInfiniteHealth) {
          this.p1.health = Math.max(this.p1.health, this.p1.maxHealth);
          this.p2.health = Math.max(this.p2.health, this.p2.maxHealth);
        }
        if (this.practiceInfiniteChi) {
          this.p1.chi = this.p1.maxChi;
          this.p2.chi = this.p2.maxChi;
        }
      }
    } else if (this.gameState === 'countdown') {
      this.p1.setState(p1Inputs.crouch ? STATES.CROUCH : STATES.IDLE);
      this.p2.setState(p2Inputs.crouch ? STATES.CROUCH : STATES.IDLE);
      this.p1.vel.x = 0;
      this.p2.vel.x = 0;

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

      if (this.koTimer > 180) {
        this.handleRoundEnd();
      }
    }

    // 3. Update physics on players (with platform support)
    this.p1.update(this.groundY, this.width, this.p2, this.effects);
    this.p2.update(this.groundY, this.width, this.p1, this.effects);
    this.applyPlatformCollisions(this.p1);
    this.applyPlatformCollisions(this.p2);

    // 4. Player-to-player collision pushing
    const distBetween = Math.abs(this.p1.pos.x - this.p2.pos.x);
    if (distBetween < 30 && this.p1.isGrounded && this.p2.isGrounded &&
        this.p1.state !== STATES.DEAD && this.p2.state !== STATES.DEAD) {
      const overlap = 30 - distBetween;
      const pushDir = this.p1.pos.x < this.p2.pos.x ? -1 : 1;
      this.p1.pos.x += pushDir * overlap * 0.5;
      this.p2.pos.x -= pushDir * overlap * 0.5;
    }

    // 5. Update weapons
    this.weapons.forEach(w => w.update(this.groundY, this.width));

    // 6. Update effects
    this.effects.update(this.width, this.height);

    // 7. Check projectile collisions
    this.checkProjectileCollisions();

    // 8. Auto weapon spawning
    if (this.weaponSpawnEnabled && this.gameState === 'fight') {
      this.weaponSpawnTimer--;
      if (this.weaponSpawnTimer <= 0) {
        this.spawnRandomWeapon();
        this.weaponSpawnTimer = 400 + Math.random() * 400;
      }
    }

    // 9. Stage Hazards
    if (this.gameState === 'fight') {
      this.updateHazards();
    }

    // 10. Check win conditions
    if (this.gameState === 'fight') {
      if (this.p1.health <= 0 || this.p2.health <= 0) {
        this.gameState = 'ko';
        this.koTimer = 0;
        this.stopTimer();
        this.sound.playKO();
        triggerHaptics([200, 80, 200]);

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

    // ── SURVIVAL MODE ────────────────────────────────────────────────────
    if (this.mode === 'survival') {
      if (this.p1.health <= 0) {
        // Player died – game over, save high score
        if (this.survivalWave > this.survivalHighScore) {
          this.survivalHighScore = this.survivalWave;
          localStorage.setItem('survivalHighScore', String(this.survivalHighScore));
        }
        this.gameState = 'gameover';
        this.winner = 2;
        this.fightText = `FELL ON WAVE ${this.survivalWave}`;
        this.fightTextOpacity = 1.0;
        this.sound.playLose();
        this.notifyUI();
      } else {
        // CPU died – next wave!
        this.survivalWave++;
        // Heal player a bit
        const healAmount = 30;
        this.p1.health = Math.min(this.p1.health + healAmount, this.p1.maxHealth);
        // Pick a random new map
        const nextMap = this.maps[Math.floor(Math.random() * this.maps.length)];
        this.currentMap = nextMap;
        this.fightText = `WAVE ${this.survivalWave}!`;
        this.fightTextOpacity = 1.0;
        triggerHaptics([60, 40, 120]);
        // Re-init for new wave (preserves survivalWave counter)
        this.init();
      }
      return;
    }

    // ── STANDARD MATCH ───────────────────────────────────────────────────
    const targetWins = 2;
    if (this.p1Wins >= targetWins || this.p2Wins >= targetWins) {
      this.gameState = 'gameover';
      this.winner = this.p1Wins >= targetWins ? 1 : 2;
      this.fightText = this.winner === 1 ? 'P1 VICTORIOUS!' : (this.mode === 'p1_vs_cpu' ? 'CPU VICTORIOUS!' : 'P2 VICTORIOUS!');
      this.fightTextOpacity = 1.0;
      if (this.winner === 1) this.sound.playWin();
      else this.sound.playLose();
      this.notifyUI();
    } else {
      this.round++;
      this.init();
    }
  }

  restartMatch() {
    this.round = 1;
    this.p1Wins = 0;
    this.p2Wins = 0;
    this.winner = null;
    this.survivalWave = 1;
    this.inputLog = [];
    this.init();
  }

  // ─── PLATFORM COLLISIONS ─────────────────────────────────────────────────
  applyPlatformCollisions(player) {
    if (!this.platforms || player.state === STATES.DEAD) return;
    for (const plat of this.platforms) {
      const pLeft  = plat.x;
      const pRight = plat.x + plat.width;
      const pTop   = plat.y;
      // Only land when falling onto top of platform
      if (
        player.vel.y >= 0 &&
        player.pos.x >= pLeft - 8 &&
        player.pos.x <= pRight + 8 &&
        player.pos.y <= pTop + 4 &&
        player.pos.y >= pTop - 18
      ) {
        player.pos.y = pTop;
        player.vel.y = 0;
        player.isGrounded = true;
        if (player.state === STATES.JUMP) player.setState(STATES.IDLE);
      }
    }
  }

  // ─── STAGE HAZARDS ───────────────────────────────────────────────────────
  updateHazards() {
    this.hazardTimer++;
    // Advance existing hazards
    for (let i = this.activeHazards.length - 1; i >= 0; i--) {
      const h = this.activeHazards[i];
      h.timer--;
      if (h.warningTimer > 0) h.warningTimer--;

      if (h.timer <= 0) {
        // Hazard fires!
        if (h.warningTimer <= 0) {
          [this.p1, this.p2].forEach(player => {
            if (player.state === STATES.DEAD) return;
            const dist = Math.abs(player.pos.x - h.x);
            const inRange = h.type === 'lava' ? dist < 55 : dist < 70;
            if (inRange) {
              const dmg = h.type === 'lightning' ? 18 : 14;
              player.health = Math.max(player.health - dmg, 0);
              player.setState(STATES.STAGGER, true);
              player.vel.y = -6;
              this.effects.spawnChiExplosion(h.x, player.pos.y - 30, h.type === 'lightning' ? '#fbbf24' : '#f97316');
              this.effects.triggerShake(5, 12);
              triggerHaptics([50, 30, 50]);
            }
          });
        }
        this.activeHazards.splice(i, 1);
      }
    }

    // Spawn new hazards per map on a cycle
    const spawnInterval = 300; // every 5 seconds
    if (this.hazardTimer % spawnInterval === 0) {
      if (this.currentMap === 'magma_cavern') {
        const rx = 80 + Math.random() * (this.width - 160);
        this.activeHazards.push({ type: 'lava', x: rx, y: this.groundY, timer: 90, warningTimer: 60 });
      } else if (this.currentMap === 'stormy_temple') {
        const rx = 80 + Math.random() * (this.width - 160);
        this.activeHazards.push({ type: 'lightning', x: rx, y: 0, timer: 80, warningTimer: 50 });
      } else if (this.currentMap === 'zen_garden') {
        // Wind gust – push players and blasts horizontally
        const windDir = Math.random() < 0.5 ? 1 : -1;
        [this.p1, this.p2].forEach(p => { if (p.state !== STATES.DEAD) p.vel.x += windDir * 3; });
        this.effects.blasts.forEach(b => { b.vel.x += windDir * 2.5; });
      }
    }
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

    // Draw floating platforms
    this.drawPlatforms();

    // Draw players
    if (this.p1) this.p1.draw(this.ctx);
    if (this.p2) this.p2.draw(this.ctx);

    // Draw hazard warnings and effects
    this.drawHazards();

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

    // Draw survival wave HUD
    if (this.mode === 'survival') this.drawSurvivalHUD();

    // Draw practice input log
    if (this.mode === 'practice') this.drawPracticeOverlay();

    this.ctx.restore();
  }

  drawPlatforms() {
    if (!this.platforms || this.platforms.length === 0) return;
    const ctx = this.ctx;
    ctx.save();
    for (const plat of this.platforms) {
      // Main platform body
      const grad = ctx.createLinearGradient(plat.x, plat.y, plat.x, plat.y + plat.height);
      grad.addColorStop(0, 'rgba(0,240,255,0.35)');
      grad.addColorStop(1, 'rgba(0,160,200,0.12)');
      ctx.fillStyle = grad;
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      // Glowing top edge
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#00f0ff';
      ctx.strokeStyle = 'rgba(0,240,255,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(plat.x, plat.y);
      ctx.lineTo(plat.x + plat.width, plat.y);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  drawHazards() {
    if (!this.activeHazards || this.activeHazards.length === 0) return;
    const ctx = this.ctx;
    ctx.save();
    for (const h of this.activeHazards) {
      const t = h.timer;
      const warnAlpha = h.warningTimer > 0 ? (Math.sin(Date.now() * 0.015) * 0.5 + 0.5) * 0.7 : 0;
      if (h.type === 'lava') {
        // Warning circle on ground
        if (warnAlpha > 0) {
          ctx.save();
          ctx.globalAlpha = warnAlpha;
          ctx.fillStyle = '#f97316';
          ctx.beginPath();
          ctx.ellipse(h.x, this.groundY, 50, 10, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        if (h.warningTimer <= 0) {
          // Active lava spout
          const flameH = 80 + Math.random() * 40;
          ctx.save();
          ctx.shadowBlur = 20;
          ctx.shadowColor = '#f97316';
          ctx.fillStyle = 'rgba(251,146,60,0.8)';
          ctx.beginPath();
          ctx.moveTo(h.x - 18, this.groundY);
          ctx.quadraticCurveTo(h.x, this.groundY - flameH, h.x + 18, this.groundY);
          ctx.fill();
          ctx.fillStyle = 'rgba(253,224,71,0.5)';
          ctx.beginPath();
          ctx.moveTo(h.x - 9, this.groundY);
          ctx.quadraticCurveTo(h.x, this.groundY - flameH * 0.6, h.x + 9, this.groundY);
          ctx.fill();
          ctx.restore();
        }
      } else if (h.type === 'lightning') {
        // Warning zone marker from sky
        if (warnAlpha > 0) {
          ctx.save();
          ctx.globalAlpha = warnAlpha;
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.moveTo(h.x, 0);
          ctx.lineTo(h.x, this.groundY);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }
        if (h.warningTimer <= 0) {
          // Actual lightning bolt
          ctx.save();
          ctx.shadowBlur = 24;
          ctx.shadowColor = '#fbbf24';
          ctx.strokeStyle = '#fde68a';
          ctx.lineWidth = 4;
          ctx.beginPath();
          let lx = h.x, ly = 0;
          while (ly < this.groundY) {
            const nlx = lx + (Math.random() - 0.5) * 30;
            const nly = ly + 30 + Math.random() * 20;
            ctx.lineTo(nlx, Math.min(nly, this.groundY));
            lx = nlx; ly = nly;
          }
          ctx.stroke();
          ctx.restore();
        }
      }
    }
    ctx.restore();
  }

  drawSurvivalHUD() {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = '700 16px "Outfit", "Inter", sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#f59e0b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`⚔ WAVE ${this.survivalWave}`, this.width / 2, 10);
    ctx.font = '500 12px "Outfit", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(`BEST: ${this.survivalHighScore}`, this.width / 2, 30);
    ctx.restore();
  }

  drawPracticeOverlay() {
    if (!this.inputLog || this.inputLog.length === 0) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.font = '600 13px "Outfit", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const now = Date.now();
    const x = 10;
    let y = this.height - 100;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(x - 4, y - 8, 110, this.inputLog.length * 20 + 16);
    this.inputLog.forEach((entry, idx) => {
      const age = now - entry.t;
      const alpha = Math.max(0, 1 - age / 2500);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#00f0ff';
      ctx.fillText(entry.label, x, y + idx * 20);
    });
    ctx.globalAlpha = 1;
    ctx.restore();
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
