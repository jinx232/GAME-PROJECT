import { Stickman, STATES, triggerHaptics } from './Stickman';
import { EffectSystem, Particle } from './Effects';
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

    // Dimensions (Logical internal bounds for physics)
    this.width = 960;
    this.height = 540;
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
    this.initAmbientDust();
  }

  getPlatformsForMap(map) {
    return [];
  }

  init() {
    const isAI = this.mode === 'p1_vs_cpu' || this.mode === 'survival';

    // Save P1 health/chi if carrying over in survival mode
    let carriedP1Health = null;
    let carriedP1Chi = null;
    if (this.mode === 'survival' && this.survivalWave > 1 && this.p1) {
      carriedP1Health = this.p1.health;
      carriedP1Chi = this.p1.chi;
    }

    this.p1 = new Stickman(this.width * 0.25, this.groundY, 1, this.p1Color, this.p1Name, false);
    this.p2 = new Stickman(this.width * 0.75, this.groundY, 2, this.p2Color, this.p2Name, isAI);

    if (carriedP1Health !== null) {
      this.p1.health = carriedP1Health;
      this.p1.chi = carriedP1Chi;
    }

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
      if (this.survivalWave > 5) {
        this.ai.reactionDelay = Math.max(2, 5 - (this.survivalWave - 5));
      }
    }

    if (this.mode !== 'practice') this.startTimer();
    this.sound.playGong();
    this.initAmbientDust();
    this.platforms = this.getPlatformsForMap(this.currentMap);

    if (this.weaponSpawnEnabled) {
      const types = ['sword', 'staff', 'nunchucks', 'spear', 'daggers', 'hammer'];
      this.weapons.push(new Weapon(this.width * 0.35, 100, types[Math.floor(Math.random() * types.length)]));
      this.weapons.push(new Weapon(this.width * 0.65, 100, types[Math.floor(Math.random() * types.length)]));
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
    const nextState = {
      p1Health: this.p1 ? Math.round(this.p1.health) : 100,
      p2Health: this.p2 ? Math.round(this.p2.health) : 100,
      p1Chi: this.p1 ? Math.round(this.p1.chi) : 0,
      p2Chi: this.p2 ? Math.round(this.p2.chi) : 0,
      p1Combo: this.p1 ? this.p1.comboCount : 0,
      p2Combo: this.p2 ? this.p2.comboCount : 0,
      p1Weapon: this.p1 ? this.p1.weapon : null,
      p2Weapon: this.p2 ? this.p2.weapon : null,
      p1WeaponHint: this.getWeaponHintFor(this.p1),
      p2WeaponHint: this.getWeaponHintFor(this.p2),
      p1Name: this.p1Name,
      p2Name: this.p2Name,
      p1Color: this.p1 ? this.p1.color : this.p1Color,
      p2Color: this.p2 ? this.p2.color : this.p2Color,
      timer: this.roundTimer,
      round: this.round,
      p1Wins: this.p1Wins,
      p2Wins: this.p2Wins,
      gameState: this.gameState,
      winner: this.winner,
      fightText: this.fightText,
      survivalWave: this.survivalWave,
      survivalHighScore: this.survivalHighScore,
      mode: this.mode
    };

    if (!this._lastUIState) {
      this._lastUIState = nextState;
      this.onUIEvent({ ...nextState, inputLog: [...this.inputLog] });
      return;
    }

    let changed = false;
    for (const key of Object.keys(nextState)) {
      if (nextState[key] !== this._lastUIState[key]) {
        changed = true;
        break;
      }
    }

    if (this.mode === 'practice' && this.inputLog.length !== (this._lastUIState.inputLog?.length || 0)) {
      changed = true;
    }

    if (changed) {
      this._lastUIState = nextState;
      this.onUIEvent({ ...nextState, inputLog: [...this.inputLog] });
    }
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
    this.p1.update(this.groundY, this.width, this.p2, this.effects, this.platforms);
    this.p2.update(this.groundY, this.width, this.p1, this.effects, this.platforms);

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

    // 7. Check projectile & thrown weapon collisions
    this.checkProjectileCollisions();
    this.checkThrownWeaponCollisions();

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
    const types = ['sword', 'staff', 'nunchucks', 'spear', 'daggers', 'hammer'];
    const weaponType = types[Math.floor(Math.random() * types.length)];
    const rx = 100 + Math.random() * (this.width - 200);
    this.weapons.push(new Weapon(rx, -30, weaponType));
    
    // Spawn dust/leaves indicator where it will fall
    this.effects.spawnDustCloud(rx, this.groundY, 'rgba(251, 191, 36, 0.4)');
  }

  checkThrownWeaponCollisions() {
    for (let w of this.weapons) {
      if (w.isThrownBy && !w.isEquipped && !w.isGrounded && Math.abs(w.vel.x) > 2) {
        const target = w.isThrownBy === 1 ? this.p2 : this.p1;
        if (target && target.state !== STATES.DEAD) {
          const targetCenterY = target.pos.y - 45;
          const dist = Math.hypot(w.pos.x - target.pos.x, w.pos.y - targetCenterY);
          if (dist < 42) {
            // Hit by thrown weapon!
            const hitDir = w.vel.x > 0 ? 1 : -1;
            target.health = Math.max(target.health - (w.damage || 18), 0);
            target.setState(STATES.HIT, true);
            target.vel.x = hitDir * 7;
            target.vel.y = -3;
            
            this.effects.spawnHitSparks(w.pos.x, w.pos.y, '#fbbf24');
            this.effects.spawnBloodSpurt(w.pos.x, w.pos.y, hitDir, '#ef4444');
            this.effects.triggerShake(4.5, 12);
            this.sound.playHit();

            // Reset thrown status so it only hits once
            w.isThrownBy = null;
            w.vel.x = -w.vel.x * 0.3; // bounce back on hit
          }
        }
      }
    }
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

  // ─── PLATFORM COLLISIONS (Deprecated - logic now in Stickman.js) ───

  // ─── STAGE HAZARDS ───────────────────────────────────────────────────────
  updateHazards() {
    this.hazardTimer++;
    // Advance existing hazards
    for (let i = this.activeHazards.length - 1; i >= 0; i--) {
      const h = this.activeHazards[i];
      h.timer--;
      
      if (h.warningTimer > 0) {
        h.warningTimer--;
        
        // Bubbling ambient sound/effect when warning is about to finish
        if (h.warningTimer === 0) {
          if (h.type === 'lava') {
            // Eruption burst
            for (let p = 0; p < 20; p++) {
              const vx = (Math.random() - 0.5) * 5;
              const vy = -5 - Math.random() * 9;
              this.effects.particles.push(new Particle(
                h.x + (Math.random() - 0.5) * 15,
                this.groundY,
                vx, vy,
                '#f97316',
                3 + Math.random() * 4,
                20 + Math.random() * 25,
                0.07,
                'spark'
              ));
            }
            this.sound.playHit();
          } else if (h.type === 'lightning') {
            // Lightning strike spark explosion
            this.effects.spawnChiExplosion(h.x, this.groundY, '#fbbf24');
            this.effects.triggerShake(7, 15);
            this.sound.playHit();
          } else if (h.type === 'drone_laser') {
            // Laser blast impact
            this.effects.spawnChiExplosion(h.x, this.groundY, h.color);
            this.effects.triggerShake(6, 12);
            this.sound.playHit();
          }
        }
      }

      // Continuous particle emission during firing stage
      if (h.warningTimer <= 0 && h.timer > 0) {
        if (h.type === 'lava' && Math.random() < 0.45) {
          const vx = (Math.random() - 0.5) * 3;
          const vy = -3 - Math.random() * 7;
          this.effects.particles.push(new Particle(
            h.x + (Math.random() - 0.5) * 20,
            this.groundY,
            vx, vy,
            '#fb923c',
            2.5 + Math.random() * 3,
            12 + Math.random() * 15,
            0.05,
            'spark'
          ));
        } else if (h.type === 'drone_laser' && Math.random() < 0.5) {
          const vx = (Math.random() - 0.5) * 6;
          const vy = -1 - Math.random() * 4;
          this.effects.particles.push(new Particle(
            h.x,
            this.groundY,
            vx, vy,
            h.color,
            2 + Math.random() * 3,
            10 + Math.random() * 15,
            0.04,
            'spark'
          ));
        }
      }

      if (h.timer <= 0) {
        // Hazard fires!
        if (h.warningTimer <= 0) {
          [this.p1, this.p2].forEach(player => {
            if (player.state === STATES.DEAD) return;
            const dist = Math.abs(player.pos.x - h.x);
            const inRange = h.type === 'lava' ? dist < 55 : (h.type === 'drone_laser' ? dist < 45 : dist < 70);
            if (inRange) {
              const dmg = h.type === 'lightning' ? 18 : (h.type === 'drone_laser' ? 15 : 14);
              player.health = Math.max(player.health - dmg, 0);
              player.setState(STATES.STAGGER, true);
              player.vel.y = -6;
              this.effects.spawnChiExplosion(h.x, player.pos.y - 30, h.type === 'lightning' ? '#fbbf24' : (h.type === 'drone_laser' ? h.color : '#f97316'));
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
      } else if (this.currentMap === 'neon_rooftop') {
        const rx = 80 + Math.random() * (this.width - 160);
        this.activeHazards.push({
          type: 'drone_laser',
          x: rx,
          y: 40,
          timer: 110,
          warningTimer: 70,
          color: Math.random() > 0.5 ? '#00f0ff' : '#ec4899'
        });
      } else if (this.currentMap === 'zen_garden') {
        // Wind gust – push players and blasts horizontally
        const windDir = Math.random() < 0.5 ? 1 : -1;
        [this.p1, this.p2].forEach(p => { if (p.state !== STATES.DEAD) p.vel.x += windDir * 3.5; });
        this.effects.blasts.forEach(b => { b.vel.x += windDir * 2.8; });
        this.effects.spawnWindGust(windDir);

        // Spawn extra swirling cherry blossoms & leaves for visual flair
        for (let p = 0; p < 15; p++) {
          const wx = windDir > 0 ? -20 : this.width + 20;
          const wy = 40 + Math.random() * 320;
          this.effects.particles.push(new Particle(
            wx, wy,
            windDir * (5 + Math.random() * 6),
            (Math.random() - 0.5) * 2,
            Math.random() > 0.4 ? '#4ade80' : '#f472b6',
            3 + Math.random() * 3,
            80 + Math.random() * 40,
            -0.01,
            'dust'
          ));
        }
      }
    }
  }

  draw() {
    // Clear canvas based on backing store size
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();

    // Scale drawing context to match backing store resolution (High-DPI graphics)
    const scale = this.canvas.width / this.width;
    this.ctx.scale(scale, scale);

    // Apply Screen Shake
    if (this.effects.shakeDuration > 0) {
      const dx = (Math.random() - 0.5) * this.effects.shakeIntensity;
      const dy = (Math.random() - 0.5) * this.effects.shakeIntensity;
      this.ctx.translate(dx, dy);
    }

    // DRAW ARENA BACKGROUND
    this.drawArena();

    // Draw ambient dust and map-themed particles - HIGHLY OPTIMIZED BATCHED drawing!
    
    // Group 1: Rain
    const rainParticles = this.ambientDust.filter(d => d.isRain);
    if (rainParticles.length > 0) {
      this.ctx.save();
      this.ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      for (const d of rainParticles) {
        this.ctx.moveTo(d.x, d.y);
        this.ctx.lineTo(d.x + d.vx * 1.8, d.y + d.vy * 1.8);
      }
      this.ctx.stroke();

      // Rain splashes on the ground
      this.ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
      this.ctx.beginPath();
      for (const d of rainParticles) {
        if (d.y > this.groundY - 12) {
          const rippleRadius = (d.y - (this.groundY - 12)) * 0.5;
          this.ctx.moveTo(d.x + rippleRadius + 1, this.groundY);
          this.ctx.ellipse(d.x, this.groundY, rippleRadius + 1, (rippleRadius + 1) * 0.3, 0, 0, Math.PI * 2);
        }
      }
      this.ctx.stroke();
      this.ctx.restore();
    }

    // Group 2: Sakura Petals (Dojo)
    const petalParticles = this.ambientDust.filter(d => d.isPetal);
    if (petalParticles.length > 0) {
      this.ctx.save();
      this.ctx.fillStyle = '#f472b6';
      this.ctx.beginPath();
      for (const d of petalParticles) {
        this.ctx.moveTo(d.x + d.size * 1.4, d.y);
        this.ctx.ellipse(d.x, d.y, d.size * 1.4, d.size * 0.7, d.angle, 0, Math.PI * 2);
      }
      this.ctx.fill();
      this.ctx.restore();
    }

    // Group 3: Leaves (Garden)
    const leafParticles = this.ambientDust.filter(d => d.isLeaf);
    if (leafParticles.length > 0) {
      this.ctx.save();
      this.ctx.fillStyle = '#4ade80';
      this.ctx.beginPath();
      for (const d of leafParticles) {
        this.ctx.moveTo(d.x + d.size * 1.3, d.y);
        this.ctx.ellipse(d.x, d.y, d.size * 1.3, d.size * 0.6, d.angle, 0, Math.PI * 2);
      }
      this.ctx.fill();
      this.ctx.restore();
    }

    // Group 4: Embers (Cavern - optimized, no shadowBlur)
    const emberParticles = this.ambientDust.filter(d => d.isEmber);
    if (emberParticles.length > 0) {
      this.ctx.save();
      this.ctx.fillStyle = '#f97316';
      this.ctx.beginPath();
      for (const d of emberParticles) {
        this.ctx.moveTo(d.x + d.size, d.y);
        this.ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
      }
      this.ctx.fill();
      this.ctx.restore();
    }

    // Group 5: Standard sparks/dust
    const standardDust = this.ambientDust.filter(d => !d.isRain && !d.isPetal && !d.isLeaf && !d.isEmber);
    if (standardDust.length > 0) {
      this.ctx.save();
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      this.ctx.beginPath();
      for (const d of standardDust) {
        this.ctx.moveTo(d.x + d.size, d.y);
        this.ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
      }
      this.ctx.fill();
      this.ctx.restore();
    }

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

    // Draw screen flash overlay on impact (with 1-2 frame high-impact color inversion!)
    if (this.impactFlashDuration > 0) {
      this.ctx.save();
      if (this.impactFlashDuration >= 7) {
        // High impact frame: Invert all colors on screen
        this.ctx.fillStyle = '#ffffff';
        this.ctx.globalCompositeOperation = 'difference';
        this.ctx.fillRect(0, 0, this.width, this.height);
      } else {
        // Fade out impact flash
        this.ctx.fillStyle = `rgba(255, 255, 255, ${(this.impactFlashDuration / 6) * 0.38})`;
        this.ctx.fillRect(0, 0, this.width, this.height);
      }
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
      ctx.save();
      
      let strokeStyle = '#00f0ff';
      let shadowColor = '#00f0ff';
      let shadowBlur = 8;
      let drawExtra = null;

      switch (this.currentMap) {
        case 'cyberpunk_dojo': {
          // Solid mahogany wood background (no gradient)
          ctx.fillStyle = '#451a03';
          ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
          
          // Faint pink sakura top underglow (pulsing - optimized)
          const dojoPulse = 3 + Math.sin(Date.now() * 0.004) * 1;
          strokeStyle = '#f472b6';
          shadowColor = '#f472b6';
          shadowBlur = dojoPulse;
          
          // Draw wood planks, grain lines, and gold corner brackets
          drawExtra = () => {
            // Wood plank horizontal seams
            ctx.strokeStyle = '#1c0a00';
            ctx.lineWidth = 1.2;
            const plankH = plat.height / 3;
            for (let py = plat.y + plankH; py < plat.y + plat.height; py += plankH) {
              ctx.beginPath();
              ctx.moveTo(plat.x, py);
              ctx.lineTo(plat.x + plat.width, py);
              ctx.stroke();
            }
            // Vertical plank joint seams
            for (let px = plat.x + 30; px < plat.x + plat.width; px += 45) {
              ctx.beginPath();
              ctx.moveTo(px, plat.y);
              ctx.lineTo(px, plat.y + plat.height);
              ctx.stroke();
            }
            // Faint wood grain wave lines
            ctx.strokeStyle = 'rgba(251, 191, 36, 0.07)';
            ctx.lineWidth = 0.8;
            for (let gy = plat.y + 3; gy < plat.y + plat.height; gy += 4) {
              ctx.beginPath();
              ctx.moveTo(plat.x, gy);
              ctx.quadraticCurveTo(plat.x + plat.width * 0.5, gy + Math.sin(gy) * 2, plat.x + plat.width, gy);
              ctx.stroke();
            }
            
            // Gold corner caps
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(plat.x, plat.y, 6, plat.height);
            ctx.fillRect(plat.x + plat.width - 6, plat.y, 6, plat.height);
          };
          break;
        }

        case 'neon_rooftop': {
          // Dark steel girder background
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
          
          const energyPulse = 3 + Math.sin(Date.now() * 0.008) * 1;
          strokeStyle = '#00f0ff';
          shadowColor = '#00f0ff';
          shadowBlur = energyPulse;
          
          // Steel X-truss bracing lines and blinking red hazard lights
          drawExtra = () => {
            // Steel top/bottom beams
            ctx.fillStyle = '#334155';
            ctx.fillRect(plat.x, plat.y, plat.width, 3);
            ctx.fillRect(plat.x, plat.y + plat.height - 3, plat.width, 3);
            
            // Diagonal truss beams
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 1.5;
            const stepX = plat.width / 4;
            for (let tx = plat.x; tx < plat.x + plat.width; tx += stepX) {
              ctx.beginPath();
              ctx.moveTo(tx, plat.y + 3);
              ctx.lineTo(tx + stepX, plat.y + plat.height - 3);
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(tx + stepX, plat.y + 3);
              ctx.lineTo(tx, plat.y + plat.height - 3);
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(tx, plat.y);
              ctx.lineTo(tx, plat.y + plat.height);
              ctx.stroke();
            }
            
            // Steel rivets
            ctx.fillStyle = '#94a3b8';
            for (let rx = plat.x + 4; rx < plat.x + plat.width; rx += stepX) {
              ctx.beginPath();
              ctx.arc(rx, plat.y + 5, 1, 0, Math.PI * 2);
              ctx.arc(rx, plat.y + plat.height - 5, 1, 0, Math.PI * 2);
              ctx.fill();
            }
            
            // Blinking red warning lights at the platform edges
            const isLightOn = Math.sin(Date.now() * 0.006) > 0;
            ctx.fillStyle = isLightOn ? '#ef4444' : '#7f1d1d';
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = isLightOn ? 2 : 0;
            ctx.beginPath();
            ctx.arc(plat.x + 3, plat.y + plat.height * 0.5, 2.5, 0, Math.PI * 2);
            ctx.arc(plat.x + plat.width - 3, plat.y + plat.height * 0.5, 2.5, 0, Math.PI * 2);
            ctx.fill();
          };
          break;
        }

        case 'zen_garden':
          // Grey stone blocks background
          ctx.fillStyle = '#292524';
          ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
          
          strokeStyle = '#22c55e'; // green moss glow
          shadowColor = '#22c55e';
          shadowBlur = 3;
          
          // Brick seams, organic moss spots, and swaying vines
          drawExtra = () => {
            // Brick layout mortar lines
            ctx.strokeStyle = '#1c1917';
            ctx.lineWidth = 1.5;
            const stoneH = plat.height / 2;
            ctx.beginPath();
            ctx.moveTo(plat.x, plat.y + stoneH);
            ctx.lineTo(plat.x + plat.width, plat.y + stoneH);
            ctx.stroke();
            const stoneW = 20;
            for (let sx = plat.x + stoneW; sx < plat.x + plat.width; sx += stoneW * 2) {
              ctx.beginPath();
              ctx.moveTo(sx, plat.y);
              ctx.lineTo(sx, plat.y + stoneH);
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(sx + stoneW, plat.y + stoneH);
              ctx.lineTo(sx + stoneW, plat.y + plat.height);
              ctx.stroke();
            }
            
            // Moss growth patches on bricks
            ctx.fillStyle = '#15803d';
            for (let mx = plat.x + 8; mx < plat.x + plat.width; mx += 24) {
              if (Math.sin(mx) > 0) {
                ctx.beginPath();
                ctx.arc(mx, plat.y + 2, 3, 0, Math.PI * 2);
                ctx.arc(mx + 3, plat.y + 3, 2, 0, Math.PI * 2);
                ctx.fill();
              }
            }
            
            // Swaying vines in the wind
            ctx.strokeStyle = '#15803d';
            ctx.lineWidth = 1.5;
            const wind = Math.sin(Date.now() * 0.0025 + plat.x) * 4;
            
            ctx.beginPath();
            ctx.moveTo(plat.x + 15, plat.y + plat.height);
            ctx.quadraticCurveTo(plat.x + 15 + wind * 0.5, plat.y + plat.height + 6, plat.x + 15 + wind, plat.y + plat.height + 14);
            
            ctx.moveTo(plat.x + plat.width - 25, plat.y + plat.height);
            ctx.quadraticCurveTo(plat.x + plat.width - 25 + wind * 0.5, plat.y + plat.height + 8, plat.x + plat.width - 25 + wind, plat.y + plat.height + 17);
            ctx.stroke();
          };
          break;

        case 'magma_cavern':
          // Dark basalt rock background
          ctx.fillStyle = '#1c0a0a';
          ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
          
          strokeStyle = '#ea580c';
          shadowColor = '#ea580c';
          shadowBlur = 4;
          
          // Pulsing orange magma cracks, rock facets, and rising heat waves
          drawExtra = () => {
            const crackPulse = 0.5 + Math.sin(Date.now() * 0.005) * 0.4;
            ctx.strokeStyle = `rgba(249, 115, 22, ${crackPulse})`;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            
            // Draw polygon cracks separating basalt stones
            for (let cx = plat.x + 15; cx < plat.x + plat.width; cx += 20) {
              ctx.moveTo(cx, plat.y);
              ctx.lineTo(cx + Math.sin(cx) * 5, plat.y + plat.height);
              
              ctx.moveTo(cx - 10, plat.y + plat.height * 0.5);
              ctx.lineTo(cx + 10, plat.y + plat.height * 0.5 + Math.cos(cx) * 3);
            }
            ctx.stroke();

            // Rising heat wave lines
            const heatTime = Date.now() * 0.004;
            ctx.strokeStyle = 'rgba(234, 88, 12, 0.16)';
            ctx.lineWidth = 1;
            for (let hx = plat.x + 12; hx < plat.x + plat.width - 10; hx += 24) {
              const offset = Math.sin(heatTime + hx) * 2.5;
              const rise = (heatTime * 12 + hx) % 15;
              ctx.beginPath();
              ctx.moveTo(hx + offset, plat.y - rise);
              ctx.lineTo(hx + offset * 1.3, plat.y - rise - 10);
              ctx.stroke();
            }
          };
          break;

        case 'stormy_temple':
          // Dark blue slate background
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
          
          strokeStyle = '#e2e8f0'; // rain slick highlight
          shadowColor = '#94a3b8';
          shadowBlur = 2;

          // Clay shingle tiles, top rain splatters, and dripping water droplets
          drawExtra = () => {
            // Pagoda shingles (scallop pattern curves)
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1.2;
            const shingleW = 12;
            const shingleH = plat.height / 2;
            for (let row = 0; row < 2; row++) {
              const ry = plat.y + row * shingleH;
              const shiftX = row * (shingleW * 0.5);
              for (let sx = plat.x - shingleW + shiftX; sx < plat.x + plat.width; sx += shingleW) {
                ctx.beginPath();
                ctx.arc(sx + shingleW * 0.5, ry + 2, shingleW * 0.5, Math.PI, 0, false);
                ctx.stroke();
              }
            }

            // Rain splashes on top of the platform
            const splashTime = Date.now() * 0.012;
            ctx.strokeStyle = 'rgba(226, 232, 240, 0.25)';
            ctx.lineWidth = 0.8;
            for (let sx = plat.x + 15; sx < plat.x + plat.width; sx += 32) {
              const offset = (splashTime + sx) % 8;
              if (offset < 2.5) {
                ctx.beginPath();
                ctx.ellipse(sx, plat.y, offset * 1.6, offset * 0.4, 0, 0, Math.PI * 2);
                ctx.stroke();
              }
            }

            // Dripping droplets
            const dripProgress = (Date.now() * 0.0018 + plat.x) % 1;
            const dripY1 = plat.y + plat.height + dripProgress * 42;
            const dripY2 = plat.y + plat.height + ((dripProgress + 0.5) % 1) * 42;
            ctx.fillStyle = 'rgba(148, 163, 184, 0.65)';
            
            // Left corner drop
            if (dripY1 < plat.y + plat.height + 40) {
              ctx.beginPath();
              ctx.arc(plat.x + 4, dripY1, 1.8, 0, Math.PI * 2);
              ctx.fill();
            }
            // Right corner drop
            if (dripY2 < plat.y + plat.height + 40) {
              ctx.beginPath();
              ctx.arc(plat.x + plat.width - 4, dripY2, 1.8, 0, Math.PI * 2);
              ctx.fill();
            }
          };
          break;
      }

      // Draw top highlight edge
      ctx.shadowBlur = shadowBlur;
      ctx.shadowColor = shadowColor;
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(plat.x, plat.y);
      ctx.lineTo(plat.x + plat.width, plat.y);
      ctx.stroke();

      // Draw extras
      if (drawExtra) {
        ctx.shadowBlur = 0; // disable shadow for overlays
        drawExtra();
      }
      
      ctx.restore();
    }
    ctx.restore();
  }

  drawHazards() {
    if (!this.activeHazards || this.activeHazards.length === 0) return;
    const ctx = this.ctx;
    ctx.save();
    for (const h of this.activeHazards) {
      const warnAlpha = h.warningTimer > 0 ? (Math.sin(Date.now() * 0.015) * 0.5 + 0.5) * 0.7 : 0;
      if (h.type === 'lava') {
        if (warnAlpha > 0) {
          this.effects.drawWarningSignal(ctx, 'lava', h.x, this.groundY, 50, warnAlpha);
        }
        if (h.warningTimer <= 0) {
          const flameH = 80 + Math.random() * 40;
          this.effects.drawLavaSpout(ctx, h.x, this.groundY, flameH);
        }
      } else if (h.type === 'lightning') {
        if (warnAlpha > 0) {
          this.effects.drawWarningSignal(ctx, 'lightning', h.x, this.groundY, 0, warnAlpha);
        }
        if (h.warningTimer <= 0) {
          this.effects.drawLightning(ctx, h.x, 0, this.groundY);
        }
      } else if (h.type === 'drone_laser') {
        this.effects.drawDroneLaser(ctx, h.x, h.y, this.groundY, h.color, h.timer, h.warningTimer, warnAlpha);
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
    // Solid Cyberpunk Sky (No Gradients)
    this.ctx.fillStyle = '#0a0a1a';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Parallax background skyscrapers (Cyberpunk cityscape)
    this.ctx.save();
    this.ctx.fillStyle = '#060410';
    // Left tower
    this.ctx.fillRect(this.width * 0.05, this.groundY - 320, 65, 320);
    this.ctx.fillRect(this.width * 0.05 + 15, this.groundY - 340, 35, 20);
    // Right tower
    this.ctx.fillRect(this.width * 0.82, this.groundY - 290, 75, 290);
    // Add tiny glowing yellow window dots to skyscrapers
    this.ctx.fillStyle = 'rgba(253, 224, 71, 0.4)';
    for (let wy = this.groundY - 280; wy < this.groundY - 20; wy += 40) {
      this.ctx.fillRect(this.width * 0.05 + 15, wy, 4, 8);
      this.ctx.fillRect(this.width * 0.05 + 30, wy + 15, 4, 8);
      this.ctx.fillRect(this.width * 0.82 + 20, wy, 4, 8);
      this.ctx.fillRect(this.width * 0.82 + 45, wy + 20, 4, 8);
    }
    this.ctx.restore();

    // Dojo center circular glowing emblem behind the scroll (optimized glow)
    this.ctx.save();
    const emblemAlpha = 0.15 + Math.sin(Date.now() * 0.003) * 0.05;
    this.ctx.strokeStyle = '#f472b6';
    // Draw outer thick low-opacity glow line
    this.ctx.globalAlpha = emblemAlpha * 0.4;
    this.ctx.lineWidth = 8;
    this.ctx.beginPath();
    this.ctx.arc(midX, 160, 75, 0, Math.PI * 2);
    this.ctx.stroke();
    // Draw main outline
    this.ctx.globalAlpha = emblemAlpha;
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(midX, 160, 75, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.restore();

    // Shoji Silhouette Shadows (scrolling clouds behind screen grid)
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(this.width * 0.15, 60, this.width * 0.7, this.groundY - 60);
    this.ctx.clip();
    this.ctx.fillStyle = 'rgba(12, 10, 28, 0.3)';
    const shadowScroll = (Date.now() * 0.015) % (this.width * 0.7 + 240) - 120;
    this.ctx.beginPath();
    this.ctx.arc(this.width * 0.15 + shadowScroll, 180, 50, 0, Math.PI * 2);
    this.ctx.arc(this.width * 0.15 + shadowScroll + 60, 195, 40, 0, Math.PI * 2);
    this.ctx.arc(this.width * 0.15 + shadowScroll - 60, 195, 35, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();

    // Dojo Wall / Shoji Screens (Glowing background panel)
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(29, 26, 48, 0.8)';
    this.ctx.fillRect(this.width * 0.15, 60, this.width * 0.7, this.groundY - 60);
    
    // Shoji wooden grid lines
    this.ctx.strokeStyle = '#020005';
    this.ctx.lineWidth = 2.5;
    const startX = this.width * 0.15;
    const endX = this.width * 0.85;
    // Vertical posts
    for (let sx = startX; sx <= endX; sx += (endX - startX) / 6) {
      this.ctx.beginPath();
      this.ctx.moveTo(sx, 60);
      this.ctx.lineTo(sx, this.groundY);
      this.ctx.stroke();
    }
    // Horizontal slats
    for (let sy = 60; sy <= this.groundY; sy += 35) {
      this.ctx.beginPath();
      this.ctx.moveTo(startX, sy);
      this.ctx.lineTo(endX, sy);
      this.ctx.stroke();
    }
    this.ctx.restore();

    // Center Hanging Calligraphy Scroll
    this.ctx.save();
    this.ctx.fillStyle = '#f8fafc'; // rice paper scroll
    this.ctx.fillRect(midX - 25, 80, 50, 160);
    
    // Scroll wooden rollers
    this.ctx.fillStyle = '#451a03';
    this.ctx.fillRect(midX - 28, 76, 56, 6);
    this.ctx.fillRect(midX - 28, 238, 56, 8);

    // Kanji Character (simple stylized bold brush stroke representation of "武" - Budo)
    this.ctx.strokeStyle = '#0f172a';
    this.ctx.lineWidth = 4;
    this.ctx.lineCap = 'round';
    this.ctx.beginPath();
    // top horizontal stroke
    this.ctx.moveTo(midX - 12, 100);
    this.ctx.lineTo(midX + 12, 100);
    // main downward brush stroke
    this.ctx.moveTo(midX - 3, 94);
    this.ctx.lineTo(midX - 3, 210);
    // cross slashes
    this.ctx.moveTo(midX - 14, 135);
    this.ctx.lineTo(midX + 14, 135);
    this.ctx.moveTo(midX - 10, 175);
    this.ctx.lineTo(midX + 10, 165);
    // sweep brush
    this.ctx.moveTo(midX - 3, 210);
    this.ctx.quadraticCurveTo(midX + 14, 215, midX + 18, 185);
    this.ctx.stroke();
    this.ctx.restore();

    // Glowing Sakura / Cherry Blossom Branch (overlaying on the left, swaying in the wind)
    this.ctx.save();
    this.ctx.fillStyle = '#0f172a';
    this.ctx.lineWidth = 9;
    this.ctx.lineCap = 'round';
    
    const branchSway = Math.sin(Date.now() * 0.002) * 5;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.groundY - 140);
    this.ctx.quadraticCurveTo(80, this.groundY - 200 + branchSway * 0.4, 120 + branchSway, this.groundY - 240 + branchSway);
    this.ctx.quadraticCurveTo(150 + branchSway, this.groundY - 280 + branchSway * 1.4, 200 + branchSway * 1.5, this.groundY - 290 + branchSway * 1.2);
    this.ctx.stroke();
    
    // Smaller sub-branch
    this.ctx.lineWidth = 5;
    this.ctx.beginPath();
    this.ctx.moveTo(110 + branchSway * 0.8, this.groundY - 235 + branchSway * 0.8);
    this.ctx.quadraticCurveTo(160 + branchSway * 1.2, this.groundY - 220 + branchSway * 1.1, 185 + branchSway * 1.3, this.groundY - 230 + branchSway * 1.2);
    this.ctx.stroke();

    // Glowing pink foliage clouds (Flipaclip style petals)
    this.ctx.shadowBlur = 6;
    this.ctx.shadowColor = '#f472b6';
    const drawFoliage = (x, y, r) => {
      this.ctx.fillStyle = 'rgba(244, 114, 182, 0.9)';
      this.ctx.beginPath();
      this.ctx.arc(x, y, r, 0, Math.PI * 2);
      this.ctx.arc(x - r * 0.5, y + r * 0.2, r * 0.85, 0, Math.PI * 2);
      this.ctx.arc(x + r * 0.5, y - r * 0.2, r * 0.85, 0, Math.PI * 2);
      this.ctx.arc(x + r * 0.2, y + r * 0.5, r * 0.75, 0, Math.PI * 2);
      this.ctx.fill();
    };
    drawFoliage(120 + branchSway, this.groundY - 245 + branchSway, 14);
    drawFoliage(190 + branchSway * 1.3, this.groundY - 285 + branchSway * 1.2, 16);
    drawFoliage(180 + branchSway * 1.2, this.groundY - 230 + branchSway * 1.1, 10);
    this.ctx.restore();

    // Dojo Roof Eaves at the top of the screen
    this.ctx.save();
    this.ctx.fillStyle = '#1e1b4b'; // dark Indigo wood
    this.ctx.beginPath();
    this.ctx.moveTo(0, 0);
    this.ctx.lineTo(this.width, 0);
    this.ctx.lineTo(this.width, 24);
    // curved bottom dojo roof profile
    this.ctx.quadraticCurveTo(midX, 48, 0, 24);
    this.ctx.closePath();
    this.ctx.fill();
    
    // Gold roof trim
    this.ctx.strokeStyle = '#fbbf24';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(0, 24);
    this.ctx.quadraticCurveTo(midX, 48, this.width, 24);
    this.ctx.stroke();
    this.ctx.restore();

    // Ground Dojo Floor (Solid Color, No Gradients)
    this.ctx.fillStyle = '#14111f';
    this.ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);

    // Neon Tatami grid border underglow - flat 2D parallel borders!
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)'; // glowing cyan tatami lines
    this.ctx.shadowBlur = 2;
    this.ctx.shadowColor = 'rgba(0, 240, 255, 0.5)';
    this.ctx.lineWidth = 1.8;
    this.ctx.beginPath();
    // Straight vertical parallel seams
    const dojoSpacing = 80;
    for (let x = dojoSpacing; x < this.width; x += dojoSpacing) {
      this.ctx.moveTo(x, this.groundY);
      this.ctx.lineTo(x, this.height);
    }
    // Horizontal slats
    for (let y = this.groundY + 18; y < this.height; y += 18) {
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
    }
    this.ctx.stroke();
    this.ctx.restore();

    // Dojo floor top mahogany frame (Solid Color)
    this.ctx.save();
    this.ctx.fillStyle = '#451a03';
    this.ctx.fillRect(0, this.groundY, this.width, 16);
    
    // Glowing pink top edge
    this.ctx.strokeStyle = '#f472b6';
    this.ctx.shadowBlur = 2;
    this.ctx.shadowColor = '#f472b6';
    this.ctx.lineWidth = 2.5;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.groundY);
    this.ctx.lineTo(this.width, this.groundY);
    this.ctx.stroke();
    
    // Gold brackets spaced across the width
    this.ctx.shadowBlur = 0;
    this.ctx.fillStyle = '#fbbf24';
    for (let bx = 0; bx < this.width; bx += 180) {
      this.ctx.fillRect(bx, this.groundY, 8, 16);
    }
    this.ctx.restore();

    // Glowing Neon Lanterns (hanging from sky ceiling) - Animated swing!
    this.ctx.save();
    this.ctx.shadowBlur = 4;
    this.ctx.shadowColor = '#f59e0b';
    this.ctx.strokeStyle = 'rgba(245, 158, 11, 0.9)';
    this.ctx.fillStyle = 'rgba(245, 158, 11, 0.3)';
    this.ctx.lineWidth = 2.5;
    
    const lanternTime = Date.now() * 0.0025;
    const drawLantern = (x, y) => {
      const swingAngle = Math.sin(lanternTime + x * 0.02) * 0.08;
      this.ctx.save();
      this.ctx.translate(x, 0);
      this.ctx.rotate(swingAngle);
      
      // Cord line
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.lineTo(0, y);
      this.ctx.stroke();
      
      // Glowing body
      this.ctx.beginPath();
      this.ctx.roundRect(-8, y, 16, 26, 6);
      this.ctx.fill();
      this.ctx.stroke();
      
      // Black wood caps
      this.ctx.fillStyle = '#0f172a';
      this.ctx.fillRect(-10, y - 2, 20, 5);
      this.ctx.fillRect(-10, y + 23, 20, 5);
      this.ctx.restore();
    };
    drawLantern(this.width * 0.12, 105);
    drawLantern(this.width * 0.28, 90);
    drawLantern(this.width * 0.72, 90);
    drawLantern(this.width * 0.88, 105);
    this.ctx.restore();
  }

  drawNeonRooftop(midX) {
    // Solid Cyberpunk Sky (0 Gradients)
    this.ctx.fillStyle = '#0c0a1d';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Sweeping searchlights (Organic Cones)
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'screen';
    const lightTime = Date.now() * 0.001;
    
    const drawSearchlight = (x, y, angle, length, color) => {
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.moveTo(x - 5, y);
      this.ctx.lineTo(x + 5, y);
      this.ctx.lineTo(x + Math.sin(angle - 0.08) * length, y - Math.cos(angle - 0.08) * length);
      this.ctx.lineTo(x + Math.sin(angle + 0.08) * length, y - Math.cos(angle + 0.08) * length);
      this.ctx.closePath();
      this.ctx.fill();
    };
    
    drawSearchlight(this.width * 0.25, this.groundY, Math.sin(lightTime * 0.6) * 0.4 - 0.2, 380, 'rgba(0, 240, 255, 0.08)');
    drawSearchlight(this.width * 0.75, this.groundY, Math.cos(lightTime * 0.5) * 0.4 + 0.2, 400, 'rgba(236, 72, 153, 0.08)');
    this.ctx.restore();

    // Glowing Holographic Neon Dragon in sky (Organic wave path)
    this.ctx.save();
    const holoTime = Date.now() * 0.003;
    this.ctx.globalAlpha = 0.08 + Math.sin(holoTime) * 0.03;
    this.ctx.strokeStyle = '#00f0ff';
    this.ctx.lineWidth = 2.5;
    
    this.ctx.beginPath();
    this.ctx.moveTo(this.width * 0.2, 110 + Math.sin(holoTime) * 12);
    this.ctx.bezierCurveTo(
      this.width * 0.35, 60 + Math.cos(holoTime * 0.8) * 18, 
      this.width * 0.45, 160 + Math.sin(holoTime * 0.7) * 18, 
      this.width * 0.6, 110 + Math.cos(holoTime) * 12
    );
    this.ctx.bezierCurveTo(
      this.width * 0.7, 60 + Math.sin(holoTime * 1.1) * 15, 
      this.width * 0.78, 140 + Math.cos(holoTime * 0.9) * 15, 
      this.width * 0.85, 110 + Math.sin(holoTime * 1.2) * 10
    );
    this.ctx.stroke();
    
    this.ctx.beginPath();
    this.ctx.arc(this.width * 0.85, 110 + Math.sin(holoTime * 1.2) * 10, 8, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.restore();

    // Futuristic Organic Dome & Spire Silhouettes (No Blocky Rectangles)
    this.ctx.save();
    const drawDomeSpire = (x, w, h, baseColor, neonColor) => {
      this.ctx.fillStyle = baseColor;
      // Curved dome silhouette
      this.ctx.beginPath();
      this.ctx.moveTo(x - w * 0.5, this.groundY);
      this.ctx.lineTo(x - w * 0.5, this.groundY - h * 0.7);
      this.ctx.quadraticCurveTo(x, this.groundY - h * 1.15, x + w * 0.5, this.groundY - h * 0.7);
      this.ctx.lineTo(x + w * 0.5, this.groundY);
      this.ctx.closePath();
      this.ctx.fill();

      // Top antenna spire needle
      this.ctx.strokeStyle = neonColor;
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.moveTo(x, this.groundY - h * 0.95);
      this.ctx.lineTo(x, this.groundY - h - 35);
      this.ctx.stroke();

      // Glowing circular beacon node
      this.ctx.fillStyle = neonColor;
      this.ctx.beginPath();
      this.ctx.arc(x, this.groundY - h - 35, 3.5, 0, Math.PI * 2);
      this.ctx.fill();
    };

    drawDomeSpire(this.width * 0.12, 90, 240, '#0c071d', '#00f0ff');
    drawDomeSpire(this.width * 0.28, 110, 200, '#0a0518', '#ec4899');
    drawDomeSpire(midX, 140, 280, '#070311', '#00f0ff');
    drawDomeSpire(this.width * 0.72, 120, 230, '#0b0619', '#fde047');
    drawDomeSpire(this.width * 0.88, 100, 260, '#0c071c', '#00f0ff');
    this.ctx.restore();

    // Circular Neon Sign Emblem
    this.ctx.save();
    const billboardTime = Date.now();
    const isGlitched = (billboardTime % 4500) < 150 || (billboardTime % 7000) < 80;
    const glitchText = isGlitched ? 'S RIK ' : 'STRIKE';
    
    this.ctx.strokeStyle = isGlitched ? '#00f0ff' : '#ec4899';
    this.ctx.lineWidth = 3.5;
    this.ctx.beginPath();
    this.ctx.arc(midX, 95, 48, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.fillStyle = isGlitched ? 'rgba(0, 240, 255, 0.15)' : 'rgba(236, 72, 153, 0.18)';
    this.ctx.fill();
    
    this.ctx.fillStyle = isGlitched ? '#e0f2fe' : '#fdf2f8';
    this.ctx.font = 'bold 22px "Inter", "Outfit", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(glitchText, midX, 95);
    this.ctx.restore();

    // Vent steam animation (Organic Circles)
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(244, 244, 245, 0.08)';
    const ventTime = Date.now() * 0.003;
    const drawSteam = (vx, vy) => {
      for (let i = 0; i < 4; i++) {
        const progress = (ventTime + i * 0.25) % 1.0;
        const size = 5 + progress * 20;
        const sx = vx - progress * 15;
        const sy = vy - progress * 40;
        this.ctx.beginPath();
        this.ctx.arc(sx, sy, size, 0, Math.PI * 2);
        this.ctx.fill();
      }
    };
    drawSteam(this.width * 0.12, this.groundY - 30);
    drawSteam(this.width * 0.88, this.groundY - 45);
    this.ctx.restore();

    // High-Graphics Concrete Roof floor (Flat 2D cross-section)
    const groundGrad = this.ctx.createLinearGradient(0, this.groundY, 0, this.height);
    groundGrad.addColorStop(0, '#0f172a');
    groundGrad.addColorStop(1, '#05070e');
    this.ctx.fillStyle = groundGrad;
    this.ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);

    // Glowing Neon Grids on the floor (cyber-look flat cyan grid panel)
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)'; 
    this.ctx.shadowBlur = 2;
    this.ctx.shadowColor = '#00f0ff';
    this.ctx.lineWidth = 1.5;
    
    // Straight vertical parallel lines
    const rooftopSpacing = 90;
    this.ctx.beginPath();
    for (let x = rooftopSpacing; x < this.width; x += rooftopSpacing) {
      this.ctx.moveTo(x, this.groundY);
      this.ctx.lineTo(x, this.height);
    }
    // Horizontal slats
    for (let y = this.groundY + 16; y < this.height; y += 16) {
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
    }
    this.ctx.stroke();
    
    // Draw rivets at the intersections of panels
    this.ctx.shadowBlur = 0;
    this.ctx.fillStyle = '#38bdf8';
    this.ctx.globalAlpha = 0.3;
    for (let x = rooftopSpacing; x < this.width; x += rooftopSpacing) {
      for (let y = this.groundY + 8; y < this.height; y += 16) {
        this.ctx.beginPath();
        this.ctx.arc(x - 4, y, 1, 0, Math.PI * 2);
        this.ctx.arc(x + 4, y, 1, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
    this.ctx.restore();

    // Yellow/black warning hazard stripes along the top edge of concrete floor
    this.ctx.save();
    this.ctx.rect(0, this.groundY, this.width, 10);
    this.ctx.clip();
    this.ctx.fillStyle = '#f59e0b'; // amber/yellow
    this.ctx.fillRect(0, this.groundY, this.width, 10);
    this.ctx.fillStyle = '#0f172a'; // dark stripe
    this.ctx.beginPath();
    for (let sx = -10; sx < this.width + 30; sx += 20) {
      this.ctx.moveTo(sx, this.groundY);
      this.ctx.lineTo(sx + 10, this.groundY);
      this.ctx.lineTo(sx, this.groundY + 10);
      this.ctx.lineTo(sx - 10, this.groundY + 10);
      this.ctx.closePath();
      this.ctx.fill();
    }
    this.ctx.restore();
    
    // Glowing cyan top edge highlight
    this.ctx.save();
    this.ctx.strokeStyle = '#00f0ff';
    this.ctx.shadowBlur = 3;
    this.ctx.shadowColor = '#00f0ff';
    this.ctx.lineWidth = 2.5;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.groundY);
    this.ctx.lineTo(this.width, this.groundY);
    this.ctx.stroke();
    this.ctx.restore();
  }

  drawZenGarden(midX) {
    // Solid Matte Zen Sky (No Gradients)
    this.ctx.fillStyle = '#050c09';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Glowing Full Moon in the center-top (optimized concentric halos instead of expensive shadowBlur)
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(226, 232, 240, 0.05)';
    this.ctx.beginPath(); this.ctx.arc(midX, 90, 80, 0, Math.PI * 2); this.ctx.fill();
    this.ctx.fillStyle = 'rgba(226, 232, 240, 0.1)';
    this.ctx.beginPath(); this.ctx.arc(midX, 90, 68, 0, Math.PI * 2); this.ctx.fill();
    this.ctx.fillStyle = 'rgba(226, 232, 240, 0.2)';
    this.ctx.beginPath(); this.ctx.arc(midX, 90, 58, 0, Math.PI * 2); this.ctx.fill();
    this.ctx.fillStyle = '#f8fafc';
    this.ctx.beginPath();
    this.ctx.arc(midX, 90, 52, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();

    // Arching Wooden Zen Bridge in the background
    this.ctx.save();
    this.ctx.strokeStyle = '#2d0a0a'; // dark red wood bridge
    this.ctx.lineWidth = 7;
    this.ctx.beginPath();
    this.ctx.arc(midX, this.groundY + 120, 200, -Math.PI * 0.82, -Math.PI * 0.18);
    this.ctx.stroke();
    
    // Bridge vertical handrail posts - BATCHED!
    this.ctx.strokeStyle = '#2d0a0a';
    this.ctx.lineWidth = 3.5;
    this.ctx.beginPath();
    for (let angle = -Math.PI * 0.78; angle <= -Math.PI * 0.22; angle += 0.12) {
      const px = midX + Math.cos(angle) * 200;
      const py = (this.groundY + 120) + Math.sin(angle) * 200;
      this.ctx.moveTo(px, py);
      this.ctx.lineTo(px, py - 22);
    }
    this.ctx.stroke();
    this.ctx.restore();

    // Silhouettes of Distant Mountains
    this.ctx.save();
    this.ctx.fillStyle = '#06130f';
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.groundY);
    this.ctx.lineTo(0, this.groundY - 120);
    this.ctx.quadraticCurveTo(this.width * 0.22, this.groundY - 180, this.width * 0.45, this.groundY - 110);
    this.ctx.lineTo(this.width * 0.55, this.groundY - 110);
    this.ctx.quadraticCurveTo(this.width * 0.78, this.groundY - 190, this.width, this.groundY - 100);
    this.ctx.lineTo(this.width, this.groundY);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.restore();

    // Swaying Bamboo forest silhouettes on the sides
    this.ctx.save();
    const bambooTime = Date.now() * 0.0012;
    const drawBambooStalk = (x, w, h) => {
      const sway = Math.sin(bambooTime + x * 0.02) * 8;
      this.ctx.fillStyle = '#09211a';
      
      this.ctx.beginPath();
      this.ctx.moveTo(x - w*0.5, this.groundY);
      this.ctx.quadraticCurveTo(x + sway * 0.5, this.groundY - h * 0.5, x + sway, this.groundY - h);
      this.ctx.lineTo(x + sway + w, this.groundY - h);
      this.ctx.quadraticCurveTo(x + w * 0.5 + sway * 0.5, this.groundY - h * 0.5, x + w * 0.5, this.groundY);
      this.ctx.closePath();
      this.ctx.fill();
      
      // Draw bamboo leaves along the stalk
      this.ctx.fillStyle = '#0f382a';
      for (let ly = this.groundY - 50; ly >= this.groundY - h; ly -= 45) {
        const leafSwayX = x + (ly - (this.groundY - h)) * (sway / h);
        this.ctx.beginPath();
        this.ctx.ellipse(leafSwayX - 10, ly, 15, 4, -0.4, 0, Math.PI * 2);
        this.ctx.ellipse(leafSwayX + 15, ly - 5, 12, 3, 0.3, 0, Math.PI * 2);
        this.ctx.fill();
      }
    };
    drawBambooStalk(40, 7, 260);
    drawBambooStalk(90, 6, 240);
    drawBambooStalk(this.width - 50, 8, 270);
    drawBambooStalk(this.width - 100, 6, 230);
    this.ctx.restore();

    // Floating glowing fireflies (yellow-green micro particles)
    this.ctx.save();
    const ffTime = Date.now() * 0.001;
    this.ctx.fillStyle = '#a3e635'; // Lime green
    for (let i = 0; i < 8; i++) {
      const fx = (this.width * 0.3 + (i * 80) + Math.sin(ffTime + i * 2) * 35) % this.width;
      const fy = (this.groundY - 180 + Math.cos(ffTime * 0.7 + i * 3) * 45);
      const opacity = 0.3 + Math.sin(ffTime * 3 + i) * 0.5;
      if (opacity > 0) {
        this.ctx.globalAlpha = opacity;
        this.ctx.shadowBlur = 2;
        this.ctx.shadowColor = '#a3e635';
        this.ctx.beginPath();
        this.ctx.arc(fx, fy, 2, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
    this.ctx.restore();

    // Glowing Stone Pagoda Shrine in the center background (optimized nested glow)
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(94, 234, 212, 0.15)';
    this.ctx.beginPath();
    this.ctx.ellipse(midX, this.groundY - 115, 30, 36, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = 'rgba(94, 234, 212, 0.85)';
    this.ctx.beginPath();
    this.ctx.ellipse(midX, this.groundY - 115, 22, 28, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Stone pagoda frame
    this.ctx.fillStyle = '#1e293b';
    this.ctx.fillRect(midX - 25, this.groundY - 80, 50, 80); // base post
    // lantern roof
    this.ctx.beginPath();
    this.ctx.moveTo(midX - 35, this.groundY - 143);
    this.ctx.lineTo(midX, this.groundY - 165);
    this.ctx.lineTo(midX + 35, this.groundY - 143);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.restore();

    // Combed Zen Sand ground (Flat 2D cross-section)
    const groundGrad = this.ctx.createLinearGradient(0, this.groundY, 0, this.height);
    groundGrad.addColorStop(0, '#0a231b');
    groundGrad.addColorStop(1, '#040d0a');
    this.ctx.fillStyle = groundGrad;
    this.ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);

    // Combed zen waves (flat 2D parallel sand ridges)
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(34, 197, 94, 0.22)';
    this.ctx.lineWidth = 2.0;
    this.ctx.beginPath();
    for (let y = this.groundY + 22; y < this.height; y += 14) {
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
    }
    this.ctx.stroke();
    this.ctx.restore();

    // Mossy stepping stones embedded in the sandbed
    this.ctx.save();
    this.ctx.fillStyle = '#292524'; // stone grey
    this.ctx.strokeStyle = '#1c1917';
    this.ctx.lineWidth = 2;
    for (let sx = 60; sx < this.width; sx += 140) {
      this.ctx.beginPath();
      this.ctx.ellipse(sx, this.groundY + 30 + Math.sin(sx)*5, 25, 8, 0, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();
      // Moss highlight on top of stepping stone
      this.ctx.fillStyle = '#16a34a';
      this.ctx.beginPath();
      this.ctx.ellipse(sx, this.groundY + 28 + Math.sin(sx)*5, 18, 4, 0, Math.PI, 0, false);
      this.ctx.fill();
      this.ctx.fillStyle = '#292524';
    }
    this.ctx.restore();

    // Zen Garden stone border
    this.ctx.save();
    const floorStoneGrad = this.ctx.createLinearGradient(0, this.groundY, 0, this.groundY + 16);
    floorStoneGrad.addColorStop(0, '#292524'); // stone grey
    floorStoneGrad.addColorStop(1, '#1c1917');
    this.ctx.fillStyle = floorStoneGrad;
    this.ctx.fillRect(0, this.groundY, this.width, 16);
    
    // Glowing green top edge
    this.ctx.strokeStyle = '#22c55e';
    this.ctx.shadowBlur = 3;
    this.ctx.shadowColor = '#22c55e';
    this.ctx.lineWidth = 2.5;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.groundY);
    this.ctx.lineTo(this.width, this.groundY);
    this.ctx.stroke();
    
    // Hanging moss patches / grass clumps along the stone border
    this.ctx.shadowBlur = 0;
    this.ctx.fillStyle = '#15803d';
    for (let gx = 30; gx < this.width; gx += 120) {
      this.ctx.beginPath();
      this.ctx.arc(gx, this.groundY + 16, 5, 0, Math.PI, false);
      this.ctx.fill();
    }
    this.ctx.restore();

    // Cutaway Koi Pond at the very bottom (cross-section view)
    this.ctx.save();
    const pondY = this.height - 24;
    const pondH = 24;
    const pondGrad = this.ctx.createLinearGradient(0, pondY, 0, this.height);
    pondGrad.addColorStop(0, '#062024'); // deep teal
    pondGrad.addColorStop(1, '#021012');
    this.ctx.fillStyle = pondGrad;
    this.ctx.fillRect(0, pondY, this.width, pondH);
    
    // Draw swimming koi fish (glowing silhouettes moving back and forth)
    const koiTime = Date.now() * 0.0008;
    const drawKoi = (yOffset, size, color, speed, phase) => {
      const koiX = (koiTime * speed + phase) % (this.width + 100) - 50;
      const swimWiggle = Math.sin(koiTime * 10 + phase) * 3;
      
      this.ctx.fillStyle = color;
      this.ctx.shadowBlur = 0;
      this.ctx.shadowColor = color;
      
      this.ctx.beginPath();
      this.ctx.ellipse(koiX, pondY + yOffset, size * 2.2, size, swimWiggle * 0.05, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Tail fin
      this.ctx.beginPath();
      this.ctx.moveTo(koiX - size * 2, pondY + yOffset);
      this.ctx.lineTo(koiX - size * 3, pondY + yOffset - size * 0.8 + swimWiggle);
      this.ctx.lineTo(koiX - size * 3, pondY + yOffset + size * 0.8 + swimWiggle);
      this.ctx.closePath();
      this.ctx.fill();
    };
    
    this.ctx.globalAlpha = 0.6;
    drawKoi(8, 4, '#fb923c', 80, 0);       // Orange koi
    drawKoi(14, 3.5, '#f43f5e', 65, 300);  // Pink/red koi
    drawKoi(10, 4.5, '#facc15', 55, 600);  // Yellow/gold koi
    this.ctx.restore();
  }

  drawMagmaCavern(midX) {
    const time = Date.now() * 0.003;
    const wave = Math.sin(time) * 4;

    // Deep crimson cavern sky (Solid Color, No Gradients)
    this.ctx.fillStyle = '#1c0303';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Pulsing Cavern Wall Crystals
    this.ctx.save();
    const crystalPulse = 0.5 + Math.sin(Date.now() * 0.002) * 0.3;
    this.ctx.fillStyle = `rgba(239, 68, 68, ${crystalPulse})`; // hot glowing red
    this.ctx.shadowBlur = 4;
    this.ctx.shadowColor = '#ef4444';
    
    const drawCrystal = (cx, cy, size) => {
      this.ctx.beginPath();
      this.ctx.moveTo(cx, cy - size);
      this.ctx.lineTo(cx + size * 0.5, cy - size * 0.2);
      this.ctx.lineTo(cx + size * 0.3, cy + size * 0.6);
      this.ctx.lineTo(cx - size * 0.3, cy + size * 0.6);
      this.ctx.lineTo(cx - size * 0.5, cy - size * 0.2);
      this.ctx.closePath();
      this.ctx.fill();
    };
    drawCrystal(this.width * 0.04, this.groundY - 160, 16);
    drawCrystal(this.width * 0.95, this.groundY - 210, 20);
    drawCrystal(this.width * 0.08, this.groundY - 250, 12);
    this.ctx.restore();

    // Magma Falls pouring down background cavern cracks
    const magmaTime = Date.now() * 0.005;
    this.ctx.save();
    this.ctx.shadowBlur = 15;
    this.ctx.shadowColor = '#ea580c';
    this.ctx.strokeStyle = 'rgba(234, 88, 12, 0.65)';
    this.ctx.lineWidth = 10;
    
    // Left magma waterfall
    this.ctx.beginPath();
    this.ctx.moveTo(this.width * 0.28, 0);
    this.ctx.lineTo(this.width * 0.28, this.groundY - 50);
    this.ctx.stroke();
    
    // Right magma waterfall
    this.ctx.beginPath();
    this.ctx.moveTo(this.width * 0.72, 0);
    this.ctx.lineTo(this.width * 0.72, this.groundY - 40);
    this.ctx.stroke();
    
    // Flow animation dashes
    this.ctx.strokeStyle = '#fbbf24';
    this.ctx.lineWidth = 3;
    this.ctx.setLineDash([12, 28]);
    this.ctx.lineDashOffset = magmaTime * 20;
    
    this.ctx.beginPath();
    this.ctx.moveTo(this.width * 0.28, 0);
    this.ctx.lineTo(this.width * 0.28, this.groundY - 50);
    this.ctx.moveTo(this.width * 0.72, 0);
    this.ctx.lineTo(this.width * 0.72, this.groundY - 40);
    this.ctx.stroke();
    this.ctx.restore();

    // Parallax background cavern arches & stalactites
    this.ctx.save();
    this.ctx.fillStyle = '#080101';
    // Arches
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.groundY);
    this.ctx.lineTo(0, this.groundY - 140);
    this.ctx.quadraticCurveTo(this.width * 0.25, this.groundY - 190, this.width * 0.5, this.groundY - 130);
    this.ctx.quadraticCurveTo(this.width * 0.75, this.groundY - 180, this.width, this.groundY - 120);
    this.ctx.lineTo(this.width, this.groundY);
    this.ctx.closePath();
    this.ctx.fill();

    // Hanging Stalactites from ceiling
    this.ctx.beginPath();
    const stalactite = (x, w, h) => {
      this.ctx.moveTo(x - w*0.5, 0);
      this.ctx.lineTo(x + w*0.5, 0);
      this.ctx.lineTo(x, h);
      this.ctx.closePath();
    };
    stalactite(80, 40, 110);
    stalactite(240, 30, 80);
    stalactite(this.width - 150, 45, 120);
    stalactite(this.width - 290, 35, 75);
    this.ctx.fill();
    this.ctx.restore();

    // Dripping Stalactites (Magma drops)
    if (!this.stalactiteDrips) {
      this.stalactiteDrips = [
        { x: 80, y: 110, progress: 0.1, speed: 0.007 },
        { x: 240, y: 80, progress: 0.5, speed: 0.009 },
        { x: this.width - 150, y: 120, progress: 0.3, speed: 0.006 },
        { x: this.width - 290, y: 75, progress: 0.8, speed: 0.008 }
      ];
    }
    
    this.ctx.save();
    this.ctx.fillStyle = '#f97316';
    this.ctx.shadowBlur = 1;
    this.ctx.shadowColor = '#f97316';
    
    for (const drip of this.stalactiteDrips) {
      drip.progress += drip.speed;
      if (drip.progress > 1.0) {
        drip.progress = 0;
      }
      
      const startY = drip.y;
      const dropY = startY + drip.progress * (this.groundY - startY);
      
      if (dropY < this.groundY) {
        this.ctx.beginPath();
        if (drip.progress < 0.2) {
          this.ctx.arc(drip.x, startY + drip.progress * 15, 3 + drip.progress * 5, 0, Math.PI * 2);
        } else {
          this.ctx.ellipse(drip.x, dropY, 2, 4, 0, 0, Math.PI * 2);
        }
        this.ctx.fill();
      } else {
        this.ctx.beginPath();
        this.ctx.ellipse(drip.x, this.groundY, 6, 2, 0, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
    this.ctx.restore();

    // 2D Flat Side-on Lava Pool Layer (optimized concentric glows instead of shadowBlur)
    this.ctx.fillStyle = 'rgba(234, 88, 12, 0.18)';
    this.ctx.beginPath();
    this.ctx.ellipse(midX - 180, this.groundY - 15 + wave * 0.3, 132, 22 + wave * 0.5, 0, 0, Math.PI * 2);
    this.ctx.ellipse(midX + 220, this.groundY - 15 - wave * 0.3, 152, 26 - wave * 0.5, 0, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.fillStyle = 'rgba(234, 88, 12, 0.85)';
    this.ctx.beginPath();
    this.ctx.ellipse(midX - 180, this.groundY - 15 + wave * 0.3, 110, 15 + wave * 0.5, 0, 0, Math.PI * 2);
    this.ctx.ellipse(midX + 220, this.groundY - 15 - wave * 0.3, 130, 18 - wave * 0.5, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Boiling bubbles - BATCHED!
    this.ctx.fillStyle = '#fdbb2d';
    this.ctx.beginPath();
    const bubble = (bx, by, br) => {
      const phase = Math.sin(time + bx * 0.05);
      const radius = Math.max(1, br + phase * (br * 0.45));
      const bubbleY = by - (phase + 1) * 6; // rise slightly
      this.ctx.moveTo(bx + radius, bubbleY);
      this.ctx.arc(bx, bubbleY, radius, 0, Math.PI * 2);
    };
    bubble(midX - 220, this.groundY - 15, 5);
    bubble(midX - 140, this.groundY - 12, 7);
    bubble(midX + 160, this.groundY - 15, 8);
    bubble(midX + 270, this.groundY - 10, 6);
    this.ctx.fill();
    this.ctx.restore();

    // Ground basalt rock floor (flat 2D cross-section)
    const groundGrad = this.ctx.createLinearGradient(0, this.groundY, 0, this.height);
    groundGrad.addColorStop(0, '#1c0a0a');
    groundGrad.addColorStop(1, '#0c0202');
    this.ctx.fillStyle = groundGrad;
    this.ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);

    // Glowing orange magma fractures in the basalt ground - flat 2D joints!
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(249, 115, 22, 0.45)'; // glowing orange floor magma
    this.ctx.shadowBlur = 3;
    this.ctx.shadowColor = '#f97316';
    this.ctx.lineWidth = 1.8;
    
    // Straight vertical basalt joint fractures
    const basaltSpacing = 70;
    this.ctx.beginPath();
    for (let x = basaltSpacing; x < this.width; x += basaltSpacing) {
      this.ctx.moveTo(x, this.groundY);
      this.ctx.lineTo(x, this.height);
    }
    // Horizontal joints
    for (let y = this.groundY + 16; y < this.height; y += 16) {
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
    }
    this.ctx.stroke();
    this.ctx.restore();
    
    // Glowing hot lava top edge
    this.ctx.save();
    this.ctx.strokeStyle = '#ea580c';
    this.ctx.shadowBlur = 3;
    this.ctx.shadowColor = '#ea580c';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.groundY);
    this.ctx.lineTo(this.width, this.groundY);
    this.ctx.stroke();
    this.ctx.restore();
  }

  drawStormyTemple(midX) {
    const time = Date.now() * 0.002;
    // Stormy flash: trigger a sky flash randomly on average every 4 seconds
    const flashTrigger = Math.sin(time) > 0.95;
    
    // Solid Stormy Sky (No Gradients)
    this.ctx.fillStyle = flashTrigger ? '#475569' : '#0b0d1a';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Parallax background stormy pagoda tower
    this.ctx.save();
    if (flashTrigger) {
      // Lightning backlighting silhouette glow
      this.ctx.shadowBlur = 8;
      this.ctx.shadowColor = '#cbd5e1';
      this.ctx.fillStyle = '#1e293b'; // brighter slate silhouette
    } else {
      this.ctx.fillStyle = '#060812'; // dark silhouette
    }
    this.ctx.fillRect(midX - 60, this.groundY - 260, 120, 260); // base tier
    
    // Pagoda tier roofs
    const drawRoof = (ry, rw, rh) => {
      this.ctx.beginPath();
      this.ctx.moveTo(midX - rw*0.5, ry);
      this.ctx.quadraticCurveTo(midX, ry - rh, midX + rw*0.5, ry);
      this.ctx.lineTo(midX + rw*0.5 + 8, ry + 12);
      this.ctx.quadraticCurveTo(midX, ry, midX - rw*0.5 - 8, ry + 12);
      this.ctx.closePath();
      this.ctx.fill();
      
      if (flashTrigger) {
        // Draw bright gold roof trims lit up by lightning
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2.0;
        this.ctx.beginPath();
        this.ctx.moveTo(midX - rw*0.5, ry);
        this.ctx.quadraticCurveTo(midX, ry - rh, midX + rw*0.5, ry);
        this.ctx.stroke();
      }
    };
    drawRoof(this.groundY - 120, 160, 22);
    drawRoof(this.groundY - 200, 130, 18);
    drawRoof(this.groundY - 260, 90, 14);
    this.ctx.restore();

    // Drifting Volumetric Storm Clouds (layered circles)
    this.ctx.save();
    this.ctx.fillStyle = flashTrigger ? 'rgba(100, 116, 139, 0.4)' : 'rgba(15, 23, 42, 0.4)';
    const drawCloud = (cx, cy, cr) => {
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      this.ctx.arc(cx - cr*0.6, cy + cr*0.2, cr*0.8, 0, Math.PI * 2);
      this.ctx.arc(cx + cr*0.6, cy + cr*0.2, cr*0.8, 0, Math.PI * 2);
      this.ctx.closePath();
      this.ctx.fill();
    };
    const driftX = (time * 12) % (this.width + 300) - 150;
    drawCloud(driftX, 50, 32);
    drawCloud(driftX + 220, 70, 26);
    drawCloud(driftX - 340, 60, 35);
    this.ctx.restore();

    // Random Lightning Bolt (flashes on the screen)
    if (flashTrigger) {
      this.ctx.save();
      this.ctx.shadowBlur = 8;
      this.ctx.shadowColor = 'rgba(191, 219, 254, 0.95)';
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 4;
      this.ctx.beginPath();
      
      let lx = midX + Math.sin(time) * 350;
      this.ctx.moveTo(lx, 0);
      
      // Jagged branching bolt segments
      let cx = lx;
      const segments = 5;
      const segH = this.groundY / segments;
      for (let s = 1; s <= segments; s++) {
        const nextX = cx + (Math.random() - 0.5) * 80;
        const nextY = s * segH;
        this.ctx.lineTo(nextX, nextY);
        
        // Random side branch
        if (Math.random() > 0.6 && s < segments) {
          this.ctx.save();
          this.ctx.lineWidth = 2.2;
          this.ctx.beginPath();
          this.ctx.moveTo(nextX, nextY);
          this.ctx.lineTo(nextX + (Math.random() - 0.5) * 110, nextY + segH * 0.85);
          this.ctx.stroke();
          this.ctx.restore();
        }
        cx = nextX;
      }
      this.ctx.stroke();
      this.ctx.restore();
    }

    // Heavy storm rain lines - BATCHED path!
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(148, 163, 184, 0.18)';
    this.ctx.lineWidth = 1.2;
    this.ctx.beginPath();
    for (let i = 0; i < 30; i++) {
      const rx = (i * 48 + time * 120) % this.width;
      const ry = (i * 24 + time * 240) % this.groundY;
      this.ctx.moveTo(rx, ry);
      this.ctx.lineTo(rx - 15, ry + 65);
    }
    this.ctx.stroke();
    this.ctx.restore();

    // Flapping temple banners on the left and right borders
    this.ctx.save();
    const bannerTime = Date.now() * 0.025;
    const drawBanner = (bx, by, bh, isLeft) => {
      this.ctx.fillStyle = '#7f1d1d'; // Crimson
      this.ctx.strokeStyle = '#f59e0b'; // Gold border
      this.ctx.lineWidth = 1.5;
      
      this.ctx.beginPath();
      this.ctx.moveTo(bx, by);
      this.ctx.lineTo(bx, by + bh);
      
      const step = 8;
      const widthVal = 30;
      for (let y = by + bh; y >= by; y -= step) {
        const waveOffset = Math.sin(bannerTime + y * 0.08) * 8;
        const wx = isLeft ? bx + widthVal + waveOffset : bx - widthVal + waveOffset;
        this.ctx.lineTo(wx, y);
      }
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();
      
      // Wooden poles
      this.ctx.fillStyle = '#451a03';
      this.ctx.fillRect(isLeft ? bx - 3 : bx, by - 15, 3, bh + 40);
    };
    drawBanner(35, this.groundY - 180, 100, true);
    drawBanner(this.width - 35, this.groundY - 180, 100, false);
    
    // Swaying Wind chimes hanging from the bottom roof eaves of pagoda
    const chimeSway = Math.sin(Date.now() * 0.012) * 0.2;
    const drawChime = (cx, cy, ch) => {
      this.ctx.save();
      this.ctx.translate(cx, cy);
      this.ctx.rotate(chimeSway);
      this.ctx.strokeStyle = '#d97706'; // brass/gold
      this.ctx.lineWidth = 2.0;
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.lineTo(0, ch);
      this.ctx.stroke();
      // Small chime bell
      this.ctx.fillStyle = '#b45309';
      this.ctx.fillRect(-3, ch, 6, 8);
      this.ctx.restore();
    };
    drawChime(midX - 70, this.groundY - 110, 18);
    drawChime(midX + 70, this.groundY - 110, 18);
    this.ctx.restore();

    // Ground aged stone tiles (Flat 2D cross-section)
    this.ctx.save();
    const groundGrad = this.ctx.createLinearGradient(0, this.groundY, 0, this.height);
    groundGrad.addColorStop(0, '#1e293b'); // rain-slicked blue slate
    groundGrad.addColorStop(1, '#0f172a');
    this.ctx.fillStyle = groundGrad;
    this.ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);
    this.ctx.restore();

    // Stone tile seams with water reflections - flat 2D joints!
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(71, 85, 105, 0.28)'; // steel gray seams
    this.ctx.lineWidth = 1.5;
    
    // Straight vertical parallel seams
    const stoneSpacing = 72;
    this.ctx.beginPath();
    for (let x = stoneSpacing; x < this.width; x += stoneSpacing) {
      this.ctx.moveTo(x, this.groundY);
      this.ctx.lineTo(x, this.height);
    }
    // Horizontal slats
    for (let y = this.groundY + 15; y < this.height; y += 15) {
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
    }
    this.ctx.stroke();
    this.ctx.restore();
    
    // Bright wet slick highlight edge
    this.ctx.save();
    this.ctx.strokeStyle = '#e2e8f0';
    this.ctx.shadowBlur = 2;
    this.ctx.shadowColor = '#94a3b8';
    this.ctx.lineWidth = 2.5;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.groundY);
    this.ctx.lineTo(this.width, this.groundY);
    this.ctx.stroke();
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
    this.ctx.shadowBlur = 5;
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
