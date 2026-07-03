import { Vector2D } from './Vector2D';
import { ChiBlast } from './Effects';

export const STATES = {
  IDLE: 'IDLE',
  WALK: 'WALK',
  JUMP: 'JUMP',
  CROUCH: 'CROUCH',
  BLOCK: 'BLOCK',
  PUNCH: 'PUNCH',
  ONE_INCH_PUNCH: 'ONE_INCH_PUNCH',
  HAMMER_FIST: 'HAMMER_FIST',
  IRON_PALM: 'IRON_PALM',
  KICK: 'KICK',
  FRONT_KICK: 'FRONT_KICK',
  ROUNDHOUSE_KICK: 'ROUNDHOUSE_KICK',
  SIDE_KICK: 'SIDE_KICK',
  SPINNING_HOOK_KICK: 'SPINNING_HOOK_KICK',
  AXE_KICK: 'AXE_KICK',
  SWEEP: 'SWEEP',
  SWEEP_KICK: 'SWEEP_KICK',
  COMBO: 'COMBO',
  SPECIAL: 'SPECIAL',
  KARATE_FLURRY: 'KARATE_FLURRY',
  STAGGER: 'STAGGER',
  PARRY: 'PARRY',
  HIT: 'HIT',
  DEAD: 'DEAD'
};

export class Stickman {
  constructor(x, y, id, color, name, isAI = false) {
    this.id = id;
    this.pos = new Vector2D(x, y);
    this.vel = new Vector2D(0, 0);
    this.color = color;
    this.name = name;
    this.isAI = isAI;
    
    // Physical stats
    this.width = 40;
    this.height = 90; // Approximate bounding height
    this.scale = 1.0;
    // 2.5D depth factor (1.0 = default scale)
    this.z = 1.0;
    this.targetZ = 1.0;
    
    // Attributes
    this.maxHealth = 150;
    this.health = 150;
    this.maxChi = 100;
    this.chi = 0;
    
    // Combat state
    this.state = STATES.IDLE;
    this.dir = id === 1 ? 1 : -1; // 1 = right, -1 = left
    this.isGrounded = false;
    this.stateTimer = 0;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.comboMove = null;
    this.lastComboMove = null;
    
    // Weapon state
    this.weapon = null; // null, 'sword', 'staff'
    this.weaponThrowTimer = 0; // Prevent instant pickup after throwing
    
    // Animation progress (0.0 to 1.0)
    this.animProgress = 0;
    
    // Animation joint lookup (for smooth transition)
    this.joints = this.getDefaultJoints();
    this.targetJoints = this.getDefaultJoints();

    // Speed trail history — stores past joint snapshots for ghost smear effect
    this.trailHistory = [];
    this._trailSampleCooldown = 0;
    
    // Parry system
    this.parryWindowTimer = 0;
    
    // AI cooldowns
    this.aiStateTimer = 0;
    this.aiDecisionCooldown = 0;
    this.aiDifficulty = 'medium'; // easy, medium, hard

    // Sound system (assigned externally by GameEngine)
    this.soundSystem = null;

    // Karate Flurry sub-state: which of the 3 strikes are we on (0,1,2)
    this.flurryStrike = 0;
    this.flurryHit = [false, false, false]; // whether each strike has connected
  }

  getDefaultJoints() {
    return {
      head: new Vector2D(0, -65),
      neck: new Vector2D(0, -50),
      pelvis: new Vector2D(0, -10),
      // Left arm (Back side relative to direction)
      lShoulder: new Vector2D(-8, -48),
      lElbow: new Vector2D(-18, -35),
      lHand: new Vector2D(-22, -20),
      // Right arm (Front side relative to direction)
      rShoulder: new Vector2D(8, -48),
      rElbow: new Vector2D(18, -35),
      rHand: new Vector2D(22, -20),
      // Left leg
      lHip: new Vector2D(-6, -10),
      lKnee: new Vector2D(-12, 15),
      lFoot: new Vector2D(-15, 40),
      // Right leg
      rHip: new Vector2D(6, -10),
      rKnee: new Vector2D(12, 15),
      rFoot: new Vector2D(15, 40)
    };
  }

  update(groundY, screenWidth, opponent, effectSystem) {
    // 1. Gravity and basic physics
    if (!this.isGrounded) {
      this.vel.y += 0.55; // gravity
    }
    
    // Friction
    if (this.state === STATES.CROUCH || this.state === STATES.BLOCK) {
      this.vel.x *= 0.85;
    } else {
      this.vel.x *= 0.88;
    }
    
    // Apply velocity
    this.pos.add(this.vel);
    
    // Ground collision
    if (this.pos.y >= groundY) {
      this.pos.y = groundY;
      this.vel.y = 0;
      this.isGrounded = true;
      if (this.state === STATES.JUMP) {
        this.setState(STATES.IDLE);
      }
    } else {
      this.isGrounded = false;
    }

    // Screen boundary collision
    if (this.pos.x < 30) {
      this.pos.x = 30;
      this.vel.x = 0;
    }
    if (this.pos.x > screenWidth - 30) {
      this.pos.x = screenWidth - 30;
      this.vel.x = 0;
    }

    // Facing direction (auto face opponent, except during certain actions)
    if (this.state !== STATES.DEAD && 
        this.state !== STATES.HIT && 
        this.state !== STATES.SPECIAL &&
        this.state !== STATES.KARATE_FLURRY &&
        this.state !== STATES.PARRY &&
        this.state !== STATES.STAGGER &&
        opponent.state !== STATES.DEAD) {
      this.dir = this.pos.x < opponent.pos.x ? 1 : -1;
    }

    // Speed trail sampling — capture joint snapshot during fast movement or attacks
    const fastStates = [
      STATES.PUNCH, STATES.KICK, STATES.COMBO, STATES.SWEEP,
      STATES.ROUNDHOUSE_KICK, STATES.SPINNING_HOOK_KICK, STATES.AXE_KICK,
      STATES.KARATE_FLURRY, STATES.FRONT_KICK, STATES.SIDE_KICK, STATES.JUMP
    ];
    const isMovingFast = Math.abs(this.vel.x) > 4.5 || Math.abs(this.vel.y) > 6;
    if ((fastStates.includes(this.state) || isMovingFast) && this.state !== STATES.DEAD) {
      this._trailSampleCooldown--;
      if (this._trailSampleCooldown <= 0) {
        this._trailSampleCooldown = 2; // sample every 2 frames
        const snap = {};
        Object.keys(this.joints).forEach(k => { snap[k] = this.joints[k].clone(); });
        snap._pos = this.pos.clone();
        snap._dir = this.dir;
        snap._z = this.z;
        this.trailHistory.push(snap);
        if (this.trailHistory.length > 4) this.trailHistory.shift();
      }
    } else {
      // Fade out trail history gradually when not moving fast
      if (this.trailHistory.length > 0) {
        this._trailSampleCooldown--;
        if (this._trailSampleCooldown <= -4) {
          this.trailHistory.shift();
          this._trailSampleCooldown = 0;
        }
      }
    }

    // Weapon timers
    if (this.weaponThrowTimer > 0) this.weaponThrowTimer--;

    // Update Parry Window
    if (this.parryWindowTimer > 0) this.parryWindowTimer--;

    // 2.5D depth target based on horizontal position relative to screen center
    const midX = screenWidth * 0.5;
    const dx = Math.min(Math.abs(this.pos.x - midX), midX);
    const t = 1 - dx / midX; // 1 at center, 0 at edges
    this.targetZ = 0.95 + t * 0.12; // range ~0.95 - 1.07

    // Add temporary 2.5D lunging scale during specific high-impact attacks!
    if (this.state === STATES.ONE_INCH_PUNCH) {
      const strikeProgress = Math.sin(this.animProgress * Math.PI);
      this.targetZ += strikeProgress * 0.18;
    } else if (this.state === STATES.KARATE_FLURRY && this.stateTimer >= 29) {
      const spinProgress = (this.stateTimer - 29) / 23;
      const strikeProgress = Math.sin(spinProgress * Math.PI);
      this.targetZ += strikeProgress * 0.24;
    } else if (this.state === STATES.SPECIAL && this.stateTimer >= 20) {
      const fireProgress = (this.stateTimer - 20) / 10;
      const strikeProgress = Math.sin(fireProgress * Math.PI);
      this.targetZ += strikeProgress * 0.16;
    }

    // Smooth depth lerp
    this.z += (this.targetZ - this.z) * 0.08;

    // 2. State Machine updates
    this.updateState(opponent, effectSystem);
    
    // 3. Compute target pose for current state, then lerp joints toward it
    this.computeTargetJoints();
    this.lerpJoints();
    this.constrainLimbs();

    // 5. Combos decay timer
    if (this.comboCount > 0) {
      this.comboTimer--;
      if (this.comboTimer <= 0) {
        this.comboCount = 0;
      }
    }
  }

  setState(newState, force = false) {
    if (this.state === STATES.DEAD && !force) return;
    // HIT stun: only allow forced transitions (from taking damage) or natural recovery to IDLE
    if (this.state === STATES.HIT && newState !== STATES.DEAD && newState !== STATES.IDLE && !force) return;
    // STAGGER: only allow forced transitions or natural recovery to IDLE
    if (this.state === STATES.STAGGER && newState !== STATES.DEAD && newState !== STATES.IDLE && !force) return;
    
    if (this.state !== newState) {
      // Reset parry window on block entry
      if (newState === STATES.BLOCK) {
        this.parryWindowTimer = 7; // 7-frame window for parry
      }
      // Reset flurry state on new flurry
      if (newState === STATES.KARATE_FLURRY) {
        this.flurryStrike = 0;
        this.flurryHit = [false, false, false];
      }
      this.state = newState;
      this.stateTimer = 0;
      this.animProgress = 0;
    }
  }

  updateState(opponent, effectSystem) {
    this.stateTimer++;
    
    // Check if dead
    if (this.health <= 0) {
      this.setState(STATES.DEAD);
    }

    switch (this.state) {
      case STATES.DEAD:
        this.vel.x = 0;
        break;

      case STATES.HIT:
        if (this.stateTimer > 18) {
          this.setState(STATES.IDLE);
        }
        break;

      case STATES.STAGGER:
        this.animProgress = Math.min(this.stateTimer / 28, 1);
        this.vel.x *= 0.85;
        if (this.stateTimer > 28) this.setState(STATES.IDLE);
        break;

      case STATES.PARRY:
        this.animProgress = Math.min(this.stateTimer / 14, 1);
        if (this.stateTimer > 14) this.setState(STATES.IDLE);
        break;

      case STATES.KARATE_FLURRY: {
        const totalFlurry = 53;
        this.animProgress = Math.min(this.stateTimer / totalFlurry, 1);
        if (this.stateTimer === 1 && this.soundSystem) this.soundSystem.playPunch();
        if (this.stateTimer === 15 && this.soundSystem) this.soundSystem.playPunch();
        if (this.stateTimer === 29 && this.soundSystem) this.soundSystem.playSlash(); // Changed to a more impactful sound
        if (this.stateTimer === 7 && !this.flurryHit[0]) this.checkKarateStrikeCollision(opponent, effectSystem, 0, 6, 3);
        if (this.stateTimer === 22 && !this.flurryHit[1]) this.checkKarateStrikeCollision(opponent, effectSystem, 1, 6, 3);
        if (this.stateTimer === 43 && !this.flurryHit[2]) this.checkKarateStrikeCollision(opponent, effectSystem, 2, 16, 12);
        if (this.stateTimer >= totalFlurry) this.setState(STATES.IDLE);
        break;
      }
        
      case STATES.PUNCH:
      case STATES.ONE_INCH_PUNCH:
      case STATES.HAMMER_FIST:
      case STATES.IRON_PALM: {
        const punchDuration = this.weapon === 'sword' ? 16 : (this.weapon === 'staff' ? 18 : 12);
        this.animProgress = Math.min(this.stateTimer / punchDuration, 1);
        if (this.stateTimer === 1 && this.soundSystem) {
          if (this.weapon === 'sword' || this.weapon === 'staff') this.soundSystem.playSlash();
          else this.soundSystem.playPunch();
        }
        if (this.stateTimer === Math.floor(punchDuration * 0.35)) this.checkAttackCollision(opponent, effectSystem);
        if (this.stateTimer >= punchDuration) {
          this.setState(STATES.IDLE);
          this.comboMove = null; // Reset combo move
        }
        break;
      }
        
      case STATES.KICK:
      case STATES.FRONT_KICK:
      case STATES.ROUNDHOUSE_KICK:
      case STATES.SIDE_KICK:
      case STATES.SPINNING_HOOK_KICK:
      case STATES.AXE_KICK:
      case STATES.SWEEP_KICK: {
        const kickDuration = this.weapon === 'sword' ? 18 : (this.weapon === 'staff' ? 20 : 14);
        this.animProgress = Math.min(this.stateTimer / kickDuration, 1);
        if (this.stateTimer === 1 && this.soundSystem) {
          if (this.weapon === 'sword' || this.weapon === 'staff') this.soundSystem.playSlash();
          else this.soundSystem.playKick();
        }
        if (this.stateTimer === Math.floor(kickDuration * 0.35)) this.checkAttackCollision(opponent, effectSystem);
        if (this.stateTimer >= kickDuration) {
          this.setState(STATES.IDLE);
          this.comboMove = null; // Reset combo move
        }
        break;
      }

      case STATES.SWEEP: {
        const sweepDuration = 22;
        this.animProgress = Math.min(this.stateTimer / sweepDuration, 1);
        if (this.stateTimer === 1 && this.soundSystem) {
          this.soundSystem.playKick();
        }
        if (this.stateTimer === Math.floor(sweepDuration * 0.35)) this.checkAttackCollision(opponent, effectSystem);
        if (this.stateTimer >= sweepDuration) this.setState(STATES.IDLE);
        break;
      }

      case STATES.COMBO: {
        const comboDuration = this.comboMove === 'kick' ? 16 : 12;
        this.animProgress = Math.min(this.stateTimer / comboDuration, 1);
        if (this.stateTimer === 1 && this.soundSystem) {
          if (this.comboMove === 'kick') this.soundSystem.playKick();
          else this.soundSystem.playPunch();
        }
        if (this.stateTimer === Math.floor(comboDuration * 0.35)) this.checkAttackCollision(opponent, effectSystem);
        if (this.stateTimer >= comboDuration) {
          this.setState(STATES.IDLE);
          this.comboMove = null; // Reset combo move
        }
        break;
      }

      case STATES.SPECIAL: {
        const chargeTime = 20;
        const fireTime = 10;
        const totalSpecial = chargeTime + fireTime;
        this.animProgress = Math.min(this.stateTimer / totalSpecial, 1);
        if (this.stateTimer < chargeTime && this.stateTimer % 8 === 0 && this.soundSystem) this.soundSystem.playChiCharge();
        if (this.stateTimer < chargeTime && this.stateTimer % 5 === 0) {
          const handsPos = this.getHandsMidpoint();
          effectSystem.spawnBlockSparks(handsPos.x, handsPos.y, this.color);
        }
        if (this.stateTimer === chargeTime) {
          const handsPos = this.getHandsMidpoint();
          const forwardOffset = Math.max(24, this.width * 0.6);
          const spawnX = handsPos.x + this.dir * forwardOffset;
          effectSystem.blasts.push(new ChiBlast(spawnX, handsPos.y, this.dir, this.id, this.color));
          effectSystem.spawnChiExplosion(handsPos.x, handsPos.y, this.color);
          effectSystem.triggerShake(4, 10);
          this.chi = 0;
          if (this.soundSystem) this.soundSystem.playChiBlast();
        }
        if (this.stateTimer >= totalSpecial) this.setState(STATES.IDLE);
        break;
      }
      
      case STATES.WALK:
        this.animProgress = (this.stateTimer * 0.12) % 1;
        break;
      default:
        this.animProgress = (this.stateTimer * 0.04) % 1;
        break;
    }
  }

  getHandsMidpoint() {
    const rightHandOffset = this.joints.rHand;
    return new Vector2D(
      this.pos.x + rightHandOffset.x * this.dir,
      this.pos.y + rightHandOffset.y
    );
  }

  checkAttackCollision(opponent, effectSystem) {
    if (opponent.state === STATES.DEAD) return;

    let attackReach = 40, attackHeightOffset = -35, attackWidth = 42, attackHeight = 54;
    let baseDamage = 8, knockbackVal = 5;
    let hitType = 'punch';

    if (this.weapon === 'sword') {
      attackReach = 62; attackHeightOffset = -35; attackWidth = 55; attackHeight = 60; baseDamage = 17; knockbackVal = 7;
      hitType = 'sword';
    } else if (this.weapon === 'staff') {
      attackReach = 72; attackHeightOffset = -30; attackWidth = 65; attackHeight = 45; baseDamage = 14; knockbackVal = 9;
      hitType = 'staff';
    } else {
      // Unarmed attack variants
      switch (this.state) {
        case STATES.PUNCH:
          attackReach = 48; attackHeightOffset = -45; attackWidth = 48; attackHeight = 50; baseDamage = 10; knockbackVal = 6;
          break;
        case STATES.ONE_INCH_PUNCH:
          attackReach = 32; attackHeightOffset = -45; attackWidth = 40; attackHeight = 50; baseDamage = 16; knockbackVal = 10;
          break;
        case STATES.HAMMER_FIST:
          attackReach = 45; attackHeightOffset = -50; attackWidth = 46; attackHeight = 60; baseDamage = 11; knockbackVal = 6;
          break;
        case STATES.IRON_PALM:
          attackReach = 42; attackHeightOffset = -42; attackWidth = 44; attackHeight = 48; baseDamage = 12; knockbackVal = 5;
          break;
        case STATES.KICK:
        case STATES.FRONT_KICK:
          attackReach = 56; attackHeightOffset = -35; attackWidth = 54; attackHeight = 50; baseDamage = 13; knockbackVal = 8;
          hitType = 'kick';
          break;
        case STATES.ROUNDHOUSE_KICK:
          attackReach = 64; attackHeightOffset = -42; attackWidth = 58; attackHeight = 52; baseDamage = 15; knockbackVal = 9;
          hitType = 'kick';
          break;
        case STATES.SIDE_KICK:
          attackReach = 60; attackHeightOffset = -35; attackWidth = 56; attackHeight = 48; baseDamage = 12; knockbackVal = 8;
          hitType = 'kick';
          break;
        case STATES.SPINNING_HOOK_KICK:
          attackReach = 68; attackHeightOffset = -38; attackWidth = 62; attackHeight = 50; baseDamage = 15; knockbackVal = 11;
          hitType = 'kick';
          break;
        case STATES.AXE_KICK:
          attackReach = 50; attackHeightOffset = -55; attackWidth = 52; attackHeight = 65; baseDamage = 16; knockbackVal = 4;
          hitType = 'kick';
          break;
        case STATES.SWEEP:
        case STATES.SWEEP_KICK:
          attackReach = 56; attackHeightOffset = -15; attackWidth = 52; attackHeight = 30; baseDamage = 9; knockbackVal = 5;
          hitType = 'sweep';
          break;
        default:
          break;
      }
    }

    const hitboxX = this.pos.x + attackReach * this.dir;
    const hitboxY = this.pos.y + attackHeightOffset;
    const hitLeft = hitboxX - attackWidth * 0.5;
    const hitRight = hitboxX + attackWidth * 0.5;
    const hitTop = hitboxY - attackHeight * 0.5;
    const hitBottom = hitboxY + attackHeight * 0.5;

    const oppLeft = opponent.pos.x - opponent.width / 2;
    const oppRight = opponent.pos.x + opponent.width / 2;
    const oppTop = opponent.pos.y - opponent.height;
    const oppBottom = opponent.pos.y;

    const hit = !(hitRight < oppLeft || hitLeft > oppRight || hitBottom < oppTop || hitTop > oppBottom);

    if (hit) {
      const isFacingAttacker = (opponent.dir !== this.dir);
      const isBlocking = opponent.state === STATES.BLOCK && isFacingAttacker;
      const isParry = isBlocking && opponent.parryWindowTimer > 0;

      if (isParry) {
        // Attacker gets staggered, defender gets a brief power pose
        this.setState(STATES.STAGGER, true);
        this.vel.x = -this.dir * 5; // get pushed back
        opponent.setState(STATES.PARRY, true);
        opponent.vel.x = -this.dir * 1.5; // defender slight step-in

        // Big parry VFX
        effectSystem.spawnBlockSparks(hitboxX, hitboxY, '#ffffff');
        effectSystem.spawnShockwave(hitboxX, hitboxY, '#ffffff');
        effectSystem.spawnShockwave(hitboxX, hitboxY, opponent.color);
        effectSystem.triggerShake(3, 10);

        // Parry charges both players' chi a lot
        opponent.chi = Math.min(opponent.chi + baseDamage * 1.4, opponent.maxChi);
        this.chi = Math.min(this.chi + baseDamage * 0.2, this.maxChi);

        if (this.soundSystem) this.soundSystem.playParry();
      } else if (isBlocking) {
        // ─── Normal Block ───
        const damageTaken = baseDamage * 0.15;
        opponent.health = Math.max(opponent.health - damageTaken, 0);
        
        opponent.vel.x = this.dir * 2; // minor pushback
        this.chi = Math.min(this.chi + baseDamage * 0.4, this.maxChi);
        opponent.chi = Math.min(opponent.chi + baseDamage * 0.6, opponent.maxChi);

        effectSystem.spawnBlockSparks(hitboxX, hitboxY, '#00f0ff');
        effectSystem.triggerShake(1.5, 6);

        if (this.soundSystem) this.soundSystem.playBlock();
      } else {
        // ─── Full Hit ───
        opponent.health = Math.max(opponent.health - baseDamage, 0);
        opponent.setState(STATES.HIT, true);
        
        opponent.vel.x = this.dir * knockbackVal;
        if (hitType === 'sweep') {
          opponent.vel.y = -4;
        } else {
          opponent.vel.y = -2;
        }

        this.comboCount++;
        this.lastComboMove = this.comboMove || this.state;
        this.comboTimer = 180;
        
        this.chi = Math.min(this.chi + baseDamage * 0.8, this.maxChi);

        if (hitType === 'sword') {
          effectSystem.spawnSwordSlash(hitboxX, hitboxY, this.dir, 45, '#fff');
          effectSystem.spawnBloodSpurt(hitboxX, hitboxY, this.dir, '#ef4444');
          effectSystem.triggerShake(5, 12);
        } else {
          effectSystem.spawnHitSparks(hitboxX, hitboxY, this.color);
          effectSystem.spawnBloodSpurt(hitboxX, hitboxY, this.dir, 'rgba(239, 68, 68, 0.4)');
          effectSystem.triggerShake(3.5, 9);
        }

        if (this.soundSystem) this.soundSystem.playHit();
      }
    }
  }

  // Targeted collision check for each hit in the Karate Flurry 3-hit combo
  checkKarateStrikeCollision(opponent, effectSystem, strikeType, baseDamage, knockbackVal) {
    if (opponent.state === STATES.DEAD) return;

    const isSpinKick = strikeType === 2 || strikeType === 'spin_kick';
    const reach = isSpinKick ? 72 : 54;
    const heightOff = isSpinKick ? -38 : -45;
    const hitboxX = this.pos.x + reach * this.dir;
    const hitboxY = this.pos.y + heightOff;
    const halfW = 50;
    const halfH = 52;

    if (baseDamage === undefined) {
      baseDamage = isSpinKick ? 16 : 6;
    }
    if (knockbackVal === undefined) {
      knockbackVal = isSpinKick ? 12 : 3;
    }

    const oppLeft  = opponent.pos.x - opponent.width / 2;
    const oppRight = opponent.pos.x + opponent.width / 2;
    const oppTop   = opponent.pos.y - opponent.height;
    const oppBottom = opponent.pos.y;

    const hit = !(
      hitboxX + halfW < oppLeft ||
      hitboxX - halfW > oppRight ||
      hitboxY + halfH < oppTop ||
      hitboxY - halfH > oppBottom
    );

    if (hit) {
      this.flurryHit[strikeType] = true;
      const isFacingAttacker = (opponent.dir !== this.dir);
      const isBlocking = opponent.state === STATES.BLOCK && isFacingAttacker;
      const isParry = isBlocking && opponent.parryWindowTimer > 0;

      if (isParry) {
        this.setState(STATES.STAGGER, true);
        this.vel.x = -this.dir * 4;
        opponent.setState(STATES.PARRY, true);
        effectSystem.spawnShockwave(hitboxX, hitboxY, '#ffffff');
        effectSystem.spawnShockwave(hitboxX, hitboxY, opponent.color);
        effectSystem.triggerShake(2, 8);
        if (this.soundSystem) this.soundSystem.playParry();
      } else if (isBlocking) {
        opponent.health = Math.max(opponent.health - baseDamage * 0.1, 0);
        opponent.vel.x = this.dir * 1.5;
        effectSystem.spawnBlockSparks(hitboxX, hitboxY, '#00f0ff');
        effectSystem.triggerShake(1, 4);
        if (this.soundSystem) this.soundSystem.playBlock();
      } else {
        opponent.health = Math.max(opponent.health - baseDamage, 0);

        // Spin kick is a hard knockdown; punches just stun
        if (isSpinKick) {
          opponent.setState(STATES.HIT, true);
          opponent.vel.x = this.dir * knockbackVal;
          opponent.vel.y = -5;
          effectSystem.spawnChiExplosion(hitboxX, hitboxY, this.color);
          effectSystem.spawnBloodSpurt(hitboxX, hitboxY, this.dir, 'rgba(239, 68, 68, 0.55)');
          effectSystem.triggerShake(6, 14);
          // Signal engine to flash the screen
          if (this._onImpactFlash) this._onImpactFlash();
        } else {
          opponent.setState(STATES.HIT, true);
          opponent.vel.x = this.dir * knockbackVal;
          opponent.vel.y = -1.5;
          effectSystem.spawnHitSparks(hitboxX, hitboxY, this.color);
          effectSystem.triggerShake(2.5, 7);
        }

        this.comboCount++;
        this.comboTimer = 180;
        this.chi = Math.min(this.chi + baseDamage * 0.9, this.maxChi);
        if (this.soundSystem) this.soundSystem.playHit();
      }
    }
  }

  pickUpWeapon(weaponsList) {
    if (this.state === STATES.DEAD || this.state === STATES.HIT) return;
    
    // If already has a weapon, throw it first
    if (this.weapon) {
      this.throwWeapon(weaponsList);
      return;
    }

    if (this.weaponThrowTimer > 0) return;

    // Check for nearby weapons on the floor
    const pickupRange = 80;
    for (let i = 0; i < weaponsList.length; i++) {
      const w = weaponsList[i];
      if (!w.isEquipped && this.pos.dist(w.pos) < pickupRange) {
        this.weapon = w.type;
        w.isEquipped = true;
        w.equippedBy = this.id;
        // Set cooldown to prevent immediate throw on next frame while button is held
        this.weaponThrowTimer = 40;
        break;
      }
    }
  }

  throwWeapon(weaponsList) {
    if (!this.weapon) return;
    
    // Find the equipped weapon in game list and drop it
    const w = weaponsList.find(item => item.isEquipped && item.equippedBy === this.id);
    if (w) {
      w.isEquipped = false;
      w.equippedBy = null;
      w.pos.set(this.pos.x, this.pos.y - 40);
      w.vel.set(this.dir * 8, -5); // throw arc
    }
    
    this.weapon = null;
    this.weaponThrowTimer = 40; // Cooldown before picking up again
  }

  computeTargetJoints() {
    const base = this.getDefaultJoints();

    // Let's compute offsets relative to the state
    let head = base.head.clone();
    let neck = base.neck.clone();
    let pelvis = base.pelvis.clone();

    let lShoulder = base.lShoulder.clone();
    let lElbow = base.lElbow.clone();
    let lHand = base.lHand.clone();

    let rShoulder = base.rShoulder.clone();
    let rElbow = base.rElbow.clone();
    let rHand = base.rHand.clone();

    let lHip = base.lHip.clone();
    let lKnee = base.lKnee.clone();
    let lFoot = base.lFoot.clone();

    let rHip = base.rHip.clone();
    let rKnee = base.rKnee.clone();
    let rFoot = base.rFoot.clone();

    // 1. Apply movements based on state
    if (this.state === STATES.IDLE) {
      // Karate guard stance — bent knees, guard hands raised
      const breath = Math.sin(this.animProgress * Math.PI * 2) * 1.2;
      head.y += breath;
      neck.y += breath;
      lShoulder.y += breath * 0.7;
      rShoulder.y += breath * 0.7;

      // Bent-knee stance
      pelvis.y += 6;
      neck.y += 4;
      head.y += 3;
      lHip.y += 6;
      rHip.y += 6;
      lKnee.set(-16, 22);
      lFoot.set(-10, 40);
      rKnee.set(16, 22);
      rFoot.set(10, 40);

      // Karate guard: lead hand forward, rear hand near chin
      lHand.set(-14, -46 + breath * 0.5);  // rear hand near chin
      lElbow.set(-10, -34);
      rHand.set(22, -38 + breath * 0.5);   // lead hand extended
      rElbow.set(16, -28);
    } 
    else if (this.state === STATES.WALK) {
      const walkCycle = this.animProgress * Math.PI * 2;
      const stepDist = 34;
      const torsoSway = Math.sin(walkCycle * 1.2) * 6;
      const bodyLift = Math.max(0, Math.sin(walkCycle * 2)) * 5;

      pelvis.y += bodyLift * 1.8;
      neck.y += bodyLift * 1.2;
      head.y += bodyLift * 0.9;
      pelvis.x += torsoSway;
      neck.x += torsoSway * 0.5;
      head.x += torsoSway * 0.4;

      const leftFootX = Math.sin(walkCycle) * stepDist;
      const leftFootY = 40 + Math.max(0, -Math.cos(walkCycle)) * 16;
      const rightFootX = -Math.sin(walkCycle) * stepDist;
      const rightFootY = 40 + Math.max(0, Math.cos(walkCycle)) * 16;

      lFoot.set(base.lHip.x + leftFootX, leftFootY);
      rFoot.set(base.rHip.x + rightFootX, rightFootY);
      lKnee.set(base.lHip.x + leftFootX * 0.45 - 4, leftFootY * 0.52 + 5);
      rKnee.set(base.rHip.x + rightFootX * 0.45 + 4, rightFootY * 0.52 + 5);

      const swingDist = 28;
      const armLift = Math.cos(walkCycle) * 9;
      lHand.set(base.lShoulder.x + Math.cos(walkCycle + Math.PI) * swingDist, base.lHand.y + armLift);
      rHand.set(base.rShoulder.x + Math.cos(walkCycle) * swingDist, base.rHand.y - armLift);
      lElbow.set(base.lShoulder.x + Math.cos(walkCycle + Math.PI) * swingDist * 0.5 - 4, base.lElbow.y + armLift * 0.4);
      rElbow.set(base.rShoulder.x + Math.cos(walkCycle) * swingDist * 0.5 + 4, base.rElbow.y - armLift * 0.4);
    }
    else if (this.state === STATES.JUMP) {
      head.y -= 4;
      neck.y -= 3;
      pelvis.y -= 6;

      lKnee.set(-10, 8);
      lFoot.set(-8, 24);
      rKnee.set(10, 8);
      rFoot.set(8, 24);

      lHand.set(-20, -58);
      lElbow.set(-18, -50);
      rHand.set(22, -58);
      rElbow.set(18, -50);
    }
    else if (this.state === STATES.CROUCH) {
      const crouchDrop = 22;
      head.y += crouchDrop;
      neck.y += crouchDrop;
      pelvis.y += crouchDrop;
      lShoulder.y += crouchDrop;
      rShoulder.y += crouchDrop;
      lHip.y += crouchDrop;
      rHip.y += crouchDrop;

      lKnee.set(-18, 20);
      lFoot.set(-14, 40);
      rKnee.set(18, 20);
      rFoot.set(14, 40);

      lHand.set(-18, -16);
      rHand.set(18, -16);
    }
    else if (this.state === STATES.BLOCK) {
      pelvis.y += 12;
      neck.y += 14;
      head.y += 14;
      lShoulder.y += 12;
      rShoulder.y += 12;
      lHip.y += 10;
      rHip.y += 10;

      lKnee.set(-14, 25);
      lFoot.set(-12, 40);
      rKnee.set(14, 25);
      rFoot.set(12, 40);

      lHand.set(12, -48);
      lElbow.set(8, -34);
      rHand.set(10, -46);
      rElbow.set(6, -32);

      // Decrement parry window
      if (this.parryWindowTimer > 0) this.parryWindowTimer--;
    }
    else if (this.state === STATES.PARRY) {
      // Heroic deflect pose — lead arm thrust outward, lean back
      const p = this.animProgress;
      const lean = Math.sin(p * Math.PI) * 8;
      head.x -= lean;
      neck.x -= lean * 0.7;
      pelvis.x -= lean * 0.4;

      lKnee.set(-14, 24);
      lFoot.set(-10, 40);
      rKnee.set(14, 22);
      rFoot.set(12, 40);

      // Lead arm extended forward, deflecting
      rHand.set(32, -44);
      rElbow.set(20, -36);
      // Rear arm pulled back tight
      lHand.set(-8, -50);
      lElbow.set(-6, -38);
    }
    else if (this.state === STATES.STAGGER) {
      // Stumble pose — off-balance, arms splayed
      const p = this.animProgress;
      const wobble = Math.sin(p * Math.PI * 3) * 10;
      head.x += wobble;
      neck.x += wobble * 0.7;
      pelvis.x += wobble * 0.4;
      head.y -= 2;

      // Slightly buckled stance
      lKnee.set(-16, 20);
      lFoot.set(-18, 40);
      rKnee.set(12, 22);
      rFoot.set(14, 40);

      // Arms flailing
      lHand.set(-28, -58 + wobble * 0.3);
      lElbow.set(-18, -44);
      rHand.set(26, -54 - wobble * 0.3);
      rElbow.set(16, -42);
    }
    else if (this.state === STATES.PUNCH || this.state === STATES.ONE_INCH_PUNCH || this.state === STATES.HAMMER_FIST || this.state === STATES.IRON_PALM) {
      const p = this.animProgress;
      let extend = Math.sin(p * Math.PI) * 54;
      let snap = Math.sin(p * Math.PI * 2) * 6;
      let leanDown = Math.sin(p * Math.PI) * 4;
      
      if (this.state === STATES.ONE_INCH_PUNCH) {
        extend = Math.sin(p * Math.PI) * 32;
        leanDown = Math.sin(p * Math.PI) * 8;
      } else if (this.state === STATES.HAMMER_FIST) {
        extend = Math.sin(p * Math.PI) * 46;
      } else if (this.state === STATES.IRON_PALM) {
        extend = Math.sin(p * Math.PI) * 48;
      }

      pelvis.x += extend * 0.18 + snap * 0.45;
      neck.x += extend * 0.28 + snap * 0.3;
      head.x += extend * 0.32 + snap * 0.22;
      pelvis.y += leanDown;

      rShoulder.x += extend * 0.26;
      rShoulder.y -= snap * 0.15;
      lShoulder.x -= extend * 0.12;
      lShoulder.y += snap * 0.1;

      if (this.state === STATES.HAMMER_FIST) {
        const swingY = -65 + Math.sin(p * Math.PI) * 35;
        rHand.set(base.rShoulder.x + extend + 5, swingY);
        rElbow.set(base.rShoulder.x + extend * 0.4, swingY + 10);
      } else if (this.state === STATES.IRON_PALM) {
        rHand.set(base.rShoulder.x + extend + 10, -32 - leanDown * 0.6);
        rElbow.set(base.rShoulder.x + extend * 0.45, -30);
      } else {
        rHand.set(base.rShoulder.x + extend + 10, -42 - leanDown * 0.6);
        rElbow.set(base.rShoulder.x + extend * 0.45, -38);
      }

      lHand.set(base.lShoulder.x - 14, -34 + snap * 0.2);
      lElbow.set(base.lShoulder.x - 8, -32 + snap * 0.12);

      lFoot.set(base.lFoot.x - 10, base.lFoot.y + 6);
      rFoot.set(base.rFoot.x + extend * 0.16, base.rFoot.y - 4);
      lKnee.set(base.lHip.x - 12, base.lKnee.y + 6);
      rKnee.set(base.rHip.x + extend * 0.18, base.rKnee.y - 6);
    }
    else if (this.state === STATES.KICK || this.state === STATES.FRONT_KICK || this.state === STATES.ROUNDHOUSE_KICK || this.state === STATES.SIDE_KICK || this.state === STATES.SPINNING_HOOK_KICK || this.state === STATES.AXE_KICK) {
      const p = this.animProgress;
      
      if (this.state === STATES.SPINNING_HOOK_KICK) {
        const spinAngle = p * Math.PI * 2;
        const rise = Math.sin(p * Math.PI) * 12;
        
        pelvis.y -= rise;
        neck.y -= rise * 0.9;
        head.y -= rise * 0.8;

        const spinX = Math.sin(spinAngle) * 10;
        pelvis.x += spinX;
        neck.x += spinX * 0.7;

        const kickAngle = spinAngle - Math.PI * 0.5;
        const kickReach = 64 * Math.max(0, Math.sin(p * Math.PI));
        rFoot.set(Math.cos(kickAngle) * kickReach, -28 + Math.sin(kickAngle) * kickReach * 0.35 - rise * 0.4);
        rKnee.set(Math.cos(kickAngle) * kickReach * 0.45, -14 - rise * 0.3);

        lKnee.set(-10, 6 - rise * 0.4);
        lFoot.set(-8, 18 - rise * 0.4);

        lHand.set(-28 + spinX * 0.6, -52 + rise * 0.2);
        lElbow.set(-18 + spinX * 0.3, -42);
        rHand.set(28 - spinX * 0.5, -38 + rise * 0.1);
        rElbow.set(18 - spinX * 0.25, -32);
      } else {
        const chamber = p < 0.25 ? (0.25 - p) / 0.25 * 20 : 4;
        let extend = Math.sin(p * Math.PI) * 68;
        let lean = Math.sin(p * Math.PI * 0.95) * 12;
        
        if (this.state === STATES.ROUNDHOUSE_KICK) {
          extend = Math.sin(p * Math.PI) * 78;
          lean = Math.sin(p * Math.PI * 0.95) * 18;
        } else if (this.state === STATES.SIDE_KICK) {
          extend = Math.sin(p * Math.PI) * 72;
          lean = Math.sin(p * Math.PI * 0.95) * 15;
        } else if (this.state === STATES.AXE_KICK) {
          extend = Math.sin(p * Math.PI) * 58;
        }

        pelvis.x -= extend * 0.18;
        neck.x -= extend * 0.2;
        head.x -= extend * 0.22;
        pelvis.y += lean * 0.2;

        lKnee.set(base.lHip.x - 14, base.lKnee.y + 10);
        lFoot.set(base.lFoot.x - 10, base.lFoot.y);

        if (p < 0.25) {
          rKnee.set(base.rHip.x + 8, base.rKnee.y - chamber * 0.65);
          rFoot.set(base.rHip.x + 8, base.rKnee.y - chamber * 0.32);
        } else {
          let extendedY = -28 - extend * 0.18;
          if (this.state === STATES.AXE_KICK) {
            extendedY = -70 + (1 - Math.sin(p * Math.PI)) * 80;
          } else if (this.state === STATES.ROUNDHOUSE_KICK) {
            extendedY = -42 - extend * 0.12;
          }
          rFoot.set(base.rHip.x + extend, extendedY);
          rKnee.set(base.rHip.x + extend * 0.4, extendedY * 0.58);
        }

        lHand.set(-20, -36 + lean * 0.25);
        lElbow.set(-14, -34 + lean * 0.18);
        rHand.set(18, -36 - lean * 0.4);
        rElbow.set(12, -30 - lean * 0.3);
      }
    }
    else if (this.state === STATES.COMBO) {
      const p = this.animProgress;
      const comboPunch = this.comboMove === 'punch';

      if (comboPunch) {
        const comboReach = Math.sin(p * Math.PI) * 58;
        const lean = Math.sin(p * Math.PI * 2) * 10;

        pelvis.x += comboReach * 0.2;
        neck.x += comboReach * 0.24;
        head.x += comboReach * 0.26;
        pelvis.y += lean * 0.16;

        rHand.set(base.rShoulder.x + comboReach + 12, -42 - lean * 0.6);
        rElbow.set(base.rShoulder.x + comboReach * 0.38, -38);
        lHand.set(-14, -34);
        lElbow.set(-8, -32);

        lKnee.set(base.lHip.x - 10, base.lKnee.y + 6);
        rKnee.set(base.rHip.x + comboReach * 0.3, base.rKnee.y - 6);
        rFoot.set(base.rFoot.x + comboReach * 0.4, 30);
      } else {
        const comboKickReach = Math.sin(p * Math.PI) * 62;
        const counterBalance = Math.sin(p * Math.PI * 1.3) * 12;

        pelvis.x -= comboKickReach * 0.16;
        neck.x -= comboKickReach * 0.2;
        head.x -= comboKickReach * 0.22;
        pelvis.y += counterBalance * 0.16;

        lHand.set(-18, -38 + counterBalance * 0.14);
        lElbow.set(-12, -34 + counterBalance * 0.12);
        rHand.set(16, -30 - counterBalance * 0.22);
        rElbow.set(10, -28 - counterBalance * 0.14);

        lKnee.set(base.lHip.x - 10, base.lKnee.y + 6);
        lFoot.set(base.lFoot.x - 8, 40);
        rKnee.set(base.rHip.x + comboKickReach * 0.38, base.rKnee.y - 10);
        rFoot.set(base.rHip.x + comboKickReach, -20);
      }
    }
    else if (this.state === STATES.SWEEP || this.state === STATES.SWEEP_KICK) {
      const p = this.animProgress;
      const sweepAngle = p * Math.PI * 1.1;
      const sweepRadius = 62;
      const sweepDrop = 28;

      pelvis.y += sweepDrop;
      neck.y += sweepDrop;
      head.y += sweepDrop * 0.95;
      lShoulder.y += sweepDrop * 0.9;
      rShoulder.y += sweepDrop * 0.9;
      lHip.y += sweepDrop;
      rHip.y += sweepDrop;

      pelvis.x += Math.sin(sweepAngle) * 12;
      neck.x += Math.sin(sweepAngle) * 6;

      lKnee.set(-18, 14 + sweepDrop * 0.4);
      lFoot.set(-12, 40);

      const sweepX = Math.sin(sweepAngle) * sweepRadius;
      const sweepY = 34 + Math.abs(Math.cos(sweepAngle)) * 2;
      rFoot.set(sweepX, sweepY);
      rKnee.set(sweepX * 0.62, sweepY * 0.5 + 8);

      lHand.set(-18, 26);
      lElbow.set(-10, 18);
      rHand.set(sweepX * 0.45 + 10, 0);
      rElbow.set(sweepX * 0.18 + 8, 10);
    }
    else if (this.state === STATES.SPECIAL) {
      const p = this.animProgress;
      const chargePhase = 0.68;
      const chargeProg = Math.min(p / chargePhase, 1);
      const fireProg = p > chargePhase ? (p - chargePhase) / (1 - chargePhase) : 0;

      pelvis.y += chargeProg * 18;
      neck.y += chargeProg * 16;
      head.y += chargeProg * 14;
      pelvis.x += Math.sin(p * Math.PI * 2.2) * 4;

      lHand.set(12 + chargeProg * 12, -38 + chargeProg * 8);
      rHand.set(20 + chargeProg * 12, -38 + chargeProg * 8);
      lElbow.set(6 + chargeProg * 10, -34 + chargeProg * 4);
      rElbow.set(16 + chargeProg * 10, -34 + chargeProg * 4);

      if (fireProg > 0) {
        const thrust = Math.sin(fireProg * Math.PI) * 48;
        const flare = fireProg * 10;

        pelvis.x += thrust * 0.25;
        neck.x += thrust * 0.26;
        head.x += thrust * 0.24;
        pelvis.y -= flare;

        lHand.set(26 + thrust * 0.22, -46 - flare);
        rHand.set(30 + thrust * 0.22, -46 - flare);
        lElbow.set(14, -42 - flare * 0.5);
        rElbow.set(18, -42 - flare * 0.5);
      }
    }
    else if (this.state === STATES.KARATE_FLURRY) {
      // 3-phase flurry animation:
      // Phase 1 (0..14): Jab punch — right hand forward
      // Phase 2 (15..28): Cross punch — left hand forward  
      // Phase 3 (29..52): 360° spinning aerial kick
      const t = this.stateTimer;
      if (t <= 14) {
        // Phase 1: Jab
        const pp = t / 14;
        const reach = Math.sin(pp * Math.PI) * 50;
        pelvis.x += reach * 0.15;
        neck.x += reach * 0.2;
        head.x += reach * 0.22;
        rHand.set(base.rShoulder.x + reach + 8, -44);
        rElbow.set(base.rShoulder.x + reach * 0.4, -38);
        lHand.set(-14, -48);
        lElbow.set(-8, -36);
        lKnee.set(-14, 22); lFoot.set(-10, 40);
        rKnee.set(14, 22); rFoot.set(10, 40);
      } else if (t <= 28) {
        // Phase 2: Cross
        const pp = (t - 15) / 13;
        const reach = Math.sin(pp * Math.PI) * 56;
        pelvis.x += reach * 0.18;
        neck.x += reach * 0.22;
        head.x += reach * 0.24;
        // Lead left hand crosses over
        lHand.set(base.lShoulder.x + reach + 10, -42);
        lElbow.set(base.lShoulder.x + reach * 0.45, -36);
        rHand.set(20, -46);
        rElbow.set(14, -38);
        lKnee.set(-14, 22); lFoot.set(-10, 40);
        rKnee.set(14, 22); rFoot.set(10, 40);
      } else {
        // Phase 3: 360° spinning aerial kick
        const pp = (t - 29) / 23;
        const spinAngle = pp * Math.PI * 2; // full rotation
        const rise = Math.sin(pp * Math.PI) * 24;

        pelvis.y -= rise;
        neck.y -= rise * 0.9;
        head.y -= rise * 0.8;

        // Spin torso
        const spinX = Math.sin(spinAngle) * 12;
        pelvis.x += spinX;
        neck.x += spinX * 0.7;

        // Kicking leg extends with rotation
        const kickAngle = spinAngle - Math.PI * 0.5;
        const kickReach = 64 * Math.max(0, Math.sin(pp * Math.PI));
        rFoot.set(Math.cos(kickAngle) * kickReach, -28 + Math.sin(kickAngle) * kickReach * 0.35 - rise * 0.4);
        rKnee.set(Math.cos(kickAngle) * kickReach * 0.45, -14 - rise * 0.3);

        // Support leg tucked
        lKnee.set(-10, 6 - rise * 0.4);
        lFoot.set(-8, 18 - rise * 0.4);

        // Arms outstretched for balance during spin
        lHand.set(-28 + spinX * 0.6, -52 + rise * 0.2);
        lElbow.set(-18 + spinX * 0.3, -42);
        rHand.set(28 - spinX * 0.5, -38 + rise * 0.1);
        rElbow.set(18 - spinX * 0.25, -32);
      }
    }
    else if (this.state === STATES.HIT) {
      // Stunned flailing
      const shakeVal = Math.sin(this.stateTimer * 0.8) * 6;
      head.x -= 10 + shakeVal;
      neck.x -= 8;
      pelvis.x -= 4;
      head.y -= 2;
      
      // Arms flying back/up
      lHand.set(-25, -65);
      rHand.set(-20, -55);
      
      // Leg buckled
      rKnee.set(8, 10);
      rFoot.set(12, 35);
    }
    else if (this.state === STATES.DEAD) {
      // Fade/collapse to the floor
      const decay = Math.min(this.stateTimer / 30, 1.0);
      
      // Interpolate center points to the floor
      pelvis.y = 35 * decay;
      neck.y = 38 * decay;
      head.y = 38 * decay;
      
      // Collapse limbs
      lHand.set(-25 * (1 - decay), 38 * decay);
      rHand.set(25 * (1 - decay), 38 * decay);
      lFoot.set(-25 * decay, 40);
      rFoot.set(25 * decay, 40);
      
      lKnee.set(-20 * decay, 38 * decay);
      rKnee.set(20 * decay, 38 * decay);
    }

    // Apply sword/staff specific modifications to arms if holding weapons
    if (this.weapon && this.state !== STATES.DEAD && this.state !== STATES.HIT) {
      if (this.weapon === 'sword') {
        if (this.state === STATES.PUNCH || this.state === STATES.KICK) {
          // Swing: slash forward
          const p = this.animProgress;
          const swingAngle = -Math.PI / 3 + p * Math.PI;
          
          rHand.set(
            Math.cos(swingAngle) * 35 + 10,
            Math.sin(swingAngle) * 35 - 35
          );
          rElbow.set(rHand.x * 0.5, rHand.y * 0.5 - 20);
        } else {
          // Combat idle sword pose
          rHand.set(18, -35);
          rElbow.set(12, -28);
          // Two hand grip optional, let's keep P1's hand holding sword
        }
      } else if (this.weapon === 'staff') {
        if (this.state === STATES.PUNCH || this.state === STATES.KICK) {
          // Large sweep swing
          const p = this.animProgress;
          const sweepAngle = Math.PI - p * Math.PI * 1.5;
          rHand.set(Math.cos(sweepAngle) * 45 + 5, Math.sin(sweepAngle) * 20 - 30);
          rElbow.set(rHand.x * 0.5, rHand.y * 0.5 - 15);
          lHand.set(rHand.x - 10, rHand.y + 10);
        } else {
          // Defend/stand holding staff vertically
          rHand.set(14, -30);
          lHand.set(-8, -25);
        }
      }
    }

    // Store computed coordinates
    // Enforce simple bone-length constraints so limbs stay connected
    const upperArmLen = base.rElbow.dist(base.rShoulder);
    const foreArmLen = base.rHand.dist(base.rElbow);
    const thighLen = base.lKnee.dist(base.lHip);
    const shinLen = base.lFoot.dist(base.lKnee);

    const enforceLimb = (a, b, c, aLen, bLen) => {
      const A = a.clone();
      const C = c.clone();
      const AC = C.clone().sub(A);
      const dist = AC.mag();
      if (dist <= 0.0001) return;
      const dir = AC.clone().div(dist);
      const total = aLen + bLen;
      if (dist >= total) {
        // fully extended along the line
        b.set(A.x + dir.x * aLen, A.y + dir.y * aLen);
        c.set(A.x + dir.x * total, A.y + dir.y * total);
      } else {
        const ratio = aLen / total;
        b.set(A.x + dir.x * dist * ratio, A.y + dir.y * dist * ratio);
      }
    };

    // Apply constraints for both arms and legs to keep bones connected
    enforceLimb(rShoulder, rElbow, rHand, upperArmLen, foreArmLen);
    enforceLimb(lShoulder, lElbow, lHand, upperArmLen, foreArmLen);
    enforceLimb(rHip, rKnee, rFoot, thighLen, shinLen);
    enforceLimb(lHip, lKnee, lFoot, thighLen, shinLen);

    this.targetJoints = {
      head, neck, pelvis,
      lShoulder, lElbow, lHand,
      rShoulder, rElbow, rHand,
      lHip, lKnee, lFoot,
      rHip, rKnee, rFoot
    };
  }

  // Smooth out transitions using linear interpolation between active joint locations
  lerpJoints() {
    const keys = Object.keys(this.joints);
    let lerpSpeed;
    if (this.state === STATES.DEAD) lerpSpeed = 0.18;
    else if (this.state === STATES.HIT) lerpSpeed = 0.65;
    else if (this.state === STATES.STAGGER) lerpSpeed = 0.55;
    else if (this.state === STATES.PARRY) lerpSpeed = 0.72;
    else if (this.state === STATES.KARATE_FLURRY) lerpSpeed = 0.62;
    else if (this.state === STATES.PUNCH || this.state === STATES.KICK || this.state === STATES.SWEEP || this.state === STATES.COMBO ||
             this.state === STATES.ONE_INCH_PUNCH || this.state === STATES.HAMMER_FIST || this.state === STATES.IRON_PALM ||
             this.state === STATES.FRONT_KICK || this.state === STATES.ROUNDHOUSE_KICK || this.state === STATES.SIDE_KICK ||
             this.state === STATES.SPINNING_HOOK_KICK || this.state === STATES.AXE_KICK || this.state === STATES.SWEEP_KICK) lerpSpeed = 0.58;
    else if (this.state === STATES.SPECIAL) lerpSpeed = 0.55;
    else if (this.state === STATES.WALK) lerpSpeed = 0.45;
    else if (this.state === STATES.JUMP) lerpSpeed = 0.30;
    else lerpSpeed = 0.24; // idle/crouch/block smooth transitions

    keys.forEach(k => {
      this.joints[k].x += (this.targetJoints[k].x - this.joints[k].x) * lerpSpeed;
      this.joints[k].y += (this.targetJoints[k].y - this.joints[k].y) * lerpSpeed;
    });
  }

  constrainLimbs() {
    const base = this.getDefaultJoints();
    const upperArmLen = base.rElbow.dist(base.rShoulder);
    const foreArmLen = base.rHand.dist(base.rElbow);
    const thighLen = base.lKnee.dist(base.lHip);
    const shinLen = base.lFoot.dist(base.lKnee);

    const enforceLimb = (a, b, c, aLen, bLen) => {
      // 1. Constrain elbow/knee (b) relative to shoulder/hip (a)
      const ab = b.clone().sub(a);
      const abDist = ab.mag();
      if (abDist > 0.0001) {
        b.set(a.x + (ab.x / abDist) * aLen, a.y + (ab.y / abDist) * aLen);
      } else {
        b.set(a.x, a.y + aLen);
      }

      // 2. Constrain hand/foot (c) relative to elbow/knee (b)
      const bc = c.clone().sub(b);
      const bcDist = bc.mag();
      if (bcDist > 0.0001) {
        c.set(b.x + (bc.x / bcDist) * bLen, b.y + (bc.y / bcDist) * bLen);
      } else {
        c.set(b.x, b.y + bLen);
      }
    };

    // Apply constraints to active joints to prevent stick separation
    enforceLimb(this.joints.rShoulder, this.joints.rElbow, this.joints.rHand, upperArmLen, foreArmLen);
    enforceLimb(this.joints.lShoulder, this.joints.lElbow, this.joints.lHand, upperArmLen, foreArmLen);
    enforceLimb(this.joints.rHip, this.joints.rKnee, this.joints.rFoot, thighLen, shinLen);
    enforceLimb(this.joints.lHip, this.joints.lKnee, this.joints.lFoot, thighLen, shinLen);
  }

  draw(ctx) {
    ctx.save();
    ctx.shadowBlur = 0;
    const scaleX = this.dir;

    // Compute joint world positions with 2.5D scaling and slight vertical offset
    const overallScale = this.scale * this.z;
    const vertOffset = (1 - this.z) * 8; // bring 'closer' characters slightly lower
    const j = {};
    Object.keys(this.joints).forEach(k => {
      j[k] = new Vector2D(
        this.pos.x + this.joints[k].x * scaleX * overallScale,
        this.pos.y + this.joints[k].y * overallScale + vertOffset
      );
    });

    // ── Speed Trails (Smear Effect) ──────────────────────────────────────────
    if (this.trailHistory.length > 0) {
      const trailBones = [
        ['lHip','lKnee','lFoot'], ['rHip','rKnee','rFoot'],
        ['pelvis','neck'], ['lShoulder','lElbow','lHand'], ['rShoulder','rElbow','rHand']
      ];
      this.trailHistory.forEach((snap, idx) => {
        const alpha = ((idx + 1) / (this.trailHistory.length + 1)) * 0.22;
        const trailScale = snap._z * this.scale;
        const trailDir = snap._dir;
        const tp = snap._pos;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = this.color;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        trailBones.forEach(bones => {
          if (bones.length === 2) {
            ctx.lineWidth = 10;
            ctx.beginPath();
            ctx.moveTo(tp.x + snap[bones[0]].x * trailDir * trailScale, tp.y + snap[bones[0]].y * trailScale);
            ctx.lineTo(tp.x + snap[bones[1]].x * trailDir * trailScale, tp.y + snap[bones[1]].y * trailScale);
            ctx.stroke();
          } else {
            ctx.lineWidth = 7;
            ctx.beginPath();
            ctx.moveTo(tp.x + snap[bones[0]].x * trailDir * trailScale, tp.y + snap[bones[0]].y * trailScale);
            ctx.lineTo(tp.x + snap[bones[1]].x * trailDir * trailScale, tp.y + snap[bones[1]].y * trailScale);
            ctx.lineTo(tp.x + snap[bones[2]].x * trailDir * trailScale, tp.y + snap[bones[2]].y * trailScale);
            ctx.stroke();
          }
        });
        // Trail head circle
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(tp.x + snap['head'].x * trailDir * trailScale, tp.y + snap['head'].y * trailScale, 10 * trailScale, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    const baseColor = this.color;
    const charged = this.chi >= this.maxChi && this.state !== STATES.DEAD;

    const drawBone = (from, to, width, color, alpha = 1) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.restore();
    };

    const drawJoint = (point, radius, color, alpha = 1) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const drawLimb = (from, middle, to, width, color, alpha = 1) => {
      drawBone(from, middle, width, color, alpha);
      drawBone(middle, to, width, color, alpha);
      drawJoint(middle, width * 0.45, color, alpha);
      drawJoint(to, width * 0.45, color, alpha);
    };

    const teamColor = baseColor;
    const shadowColor = 'rgba(0,0,0,0.12)';

    const drawSegment = (points, width, color, alpha = 1) => {
      if (!points || points.length === 0) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
      ctx.restore();
    };

    // Legs
    drawLimb(j.lHip, j.lKnee, j.lFoot, 7, teamColor, 1);
    drawLimb(j.rHip, j.rKnee, j.rFoot, 7, teamColor, 1);

    // Torso and spine
    drawBone(j.pelvis, j.neck, 10, teamColor, 1);
    drawJoint(j.pelvis, 4, teamColor, 1);
    drawJoint(j.neck, 4, teamColor, 1);

    // Arms
    drawLimb(j.lShoulder, j.lElbow, j.lHand, 7, teamColor, 1);
    drawLimb(j.rShoulder, j.rElbow, j.rHand, 7, teamColor, 1);

    // Add a faint secondary stroke for depth without full 3D layering
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.lineWidth = 10;
    ctx.strokeStyle = shadowColor;
    ctx.beginPath();
    ctx.moveTo(j.pelvis.x, j.pelvis.y);
    ctx.lineTo(j.neck.x, j.neck.y);
    ctx.stroke();
    ctx.restore();

    // Head with soft 3D highlight
    ctx.save();
    const headGradient = ctx.createRadialGradient(j.head.x - 2 * scaleX, j.head.y - 4, 3, j.head.x, j.head.y, 10);
    headGradient.addColorStop(0, charged ? '#ffffff' : '#ffffff');
    headGradient.addColorStop(0.3, charged ? '#c8f9ff' : baseColor);
    headGradient.addColorStop(1, 'rgba(0,0,0,0.06)');
    ctx.fillStyle = headGradient;
    ctx.beginPath();
    ctx.arc(j.head.x, j.head.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = charged ? '#ffffff' : baseColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();

    // Subtle neck/trapezius shading for volume
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(j.neck.x, j.neck.y);
    ctx.lineTo(j.pelvis.x, j.pelvis.y);
    ctx.stroke();
    ctx.restore();

    // Glowing outline when charged
    if (charged) {
      ctx.save();
      ctx.shadowBlur = 18;
      ctx.shadowColor = '#ffffff';
      drawSegment([j.pelvis, j.neck], 22, '#ffffff', 0.2);
      drawSegment([j.rShoulder, j.rElbow, j.rHand], 18, '#ffffff', 0.2);
      drawSegment([j.rHip, j.rKnee, j.rFoot], 18, '#ffffff', 0.2);
      ctx.restore();
    }

    // Weapon draw remains same but now integrates with the new limb style
    if (this.weapon && this.state !== STATES.DEAD) {
      ctx.save();
      ctx.shadowBlur = 12;
      ctx.shadowColor = this.weapon === 'sword' ? '#ffffff' : '#fbbf24';
      const hand = j.rHand;

      if (this.weapon === 'sword') {
        let angle = -Math.PI / 4;
        if (this.state === STATES.PUNCH || this.state === STATES.KICK) {
          angle = -Math.PI / 4 + this.animProgress * Math.PI;
        }
        ctx.translate(hand.x, hand.y);
        ctx.rotate(angle * scaleX);

        // Scale weapon drawing by overallScale so it matches character depth
        const lw = 6 * overallScale;
        const guard = 7 * overallScale;
        const blade = 46 * overallScale;
        const pommelY = 10 * overallScale;
        const tipY = -blade;

        ctx.beginPath();
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = lw;
        ctx.moveTo(0, pommelY);
        ctx.lineTo(0, 0);
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = lw;
        ctx.moveTo(-guard, 0);
        ctx.lineTo(guard, 0);
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = Math.max(2, 4 * overallScale);
        ctx.moveTo(0, 0);
        ctx.lineTo(0, tipY);
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.moveTo(-2 * overallScale, tipY);
        ctx.lineTo(2 * overallScale, tipY);
        ctx.lineTo(0, tipY - 6 * overallScale);
        ctx.closePath();
        ctx.fill();
      } else if (this.weapon === 'staff') {
        ctx.strokeStyle = '#c8640b';
        ctx.lineWidth = 7 * overallScale;

        let angle = Math.PI / 6;
        if (this.state === STATES.PUNCH || this.state === STATES.KICK) {
          angle = Math.PI / 6 + this.animProgress * Math.PI * 1.5;
        }
        ctx.translate(hand.x, hand.y);
        ctx.rotate(angle * scaleX);

        const len = 44 * overallScale;
        ctx.beginPath();
        ctx.moveTo(0, len);
        ctx.lineTo(0, -len);
        ctx.stroke();

        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 6 * overallScale;
        ctx.beginPath();
        ctx.moveTo(0, len);
        ctx.lineTo(0, len - 10 * overallScale);
        ctx.moveTo(0, -len);
        ctx.lineTo(0, -len + 10 * overallScale);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.restore();
  }
}
