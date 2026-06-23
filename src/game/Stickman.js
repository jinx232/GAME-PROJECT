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
    
    // AI cooldowns
    this.aiStateTimer = 0;
    this.aiDecisionCooldown = 0;
    this.aiDifficulty = 'medium'; // easy, medium, hard

    // Sound system (assigned externally by GameEngine)
    this.soundSystem = null;
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

  update(groundY, screenWidth, opponent, effectSystem, weaponsList) {
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
        opponent.state !== STATES.DEAD) {
      this.dir = this.pos.x < opponent.pos.x ? 1 : -1;
    }

    // Weapon timers
    if (this.weaponThrowTimer > 0) this.weaponThrowTimer--;

    // 2.5D depth target based on horizontal position relative to screen center
    const midX = screenWidth * 0.5;
    const dx = Math.min(Math.abs(this.pos.x - midX), midX);
    const t = 1 - dx / midX; // 1 at center, 0 at edges
    this.targetZ = 0.95 + t * 0.12; // range ~0.95 - 1.07
    // Smooth depth lerp
    this.z += (this.targetZ - this.z) * 0.08;

    // 2. State Machine updates
    this.updateState(opponent, effectSystem, weaponsList);
    
    // 3. Compute target pose for current state, then lerp joints toward it
    this.computeTargetJoints();
    this.lerpJoints();

    // 4. Combos decay timer
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
    
    if (this.state !== newState) {
      this.state = newState;
      this.stateTimer = 0;
      this.animProgress = 0;
    }
  }

  updateState(opponent, effectSystem, weaponsList) {
    this.stateTimer++;
    
    // Check if dead
    if (this.health <= 0) {
      this.setState(STATES.DEAD);
    }

    switch (this.state) {
      case STATES.DEAD:
        // Decay to the ground
        this.vel.x = 0;
        break;
        
      case STATES.HIT:
        // Hit stun duration - 18 frames then fully recover to IDLE
        if (this.stateTimer > 18) {
          this.state = STATES.IDLE; // force direct state assignment so recovery always works
          this.stateTimer = 0;
          this.animProgress = 0;
        }
        break;
        
      case STATES.PUNCH:
        const punchDuration = this.weapon === 'sword' ? 16 : (this.weapon === 'staff' ? 18 : 12);
        this.animProgress = Math.min(this.stateTimer / punchDuration, 1);

        // Swing sound on first frame
        if (this.stateTimer === 1 && this.soundSystem) {
          if (this.weapon === 'sword' || this.weapon === 'staff') this.soundSystem.playSlash();
          else this.soundSystem.playPunch();
        }
        
        // Attack frame collision check
        if (this.stateTimer === Math.floor(punchDuration * 0.35)) {
          this.checkAttackCollision(opponent, effectSystem);
        }
        
        if (this.stateTimer >= punchDuration) {
          this.setState(STATES.IDLE);
        }
        break;
        
      case STATES.KICK:
        const kickDuration = this.weapon === 'sword' ? 18 : (this.weapon === 'staff' ? 20 : 14);
        this.animProgress = Math.min(this.stateTimer / kickDuration, 1);

        // Swing sound on first frame
        if (this.stateTimer === 1 && this.soundSystem) {
          if (this.weapon === 'sword' || this.weapon === 'staff') this.soundSystem.playSlash();
          else this.soundSystem.playKick();
        }
        
        // Attack frame collision check
        if (this.stateTimer === Math.floor(kickDuration * 0.35)) {
          this.checkAttackCollision(opponent, effectSystem);
        }
        
        if (this.stateTimer >= kickDuration) {
          this.setState(STATES.IDLE);
        }
        break;

      case STATES.ONE_INCH_PUNCH:
        const oneInchDuration = 10;
        this.animProgress = Math.min(this.stateTimer / oneInchDuration, 1);
        if (this.stateTimer === 1 && this.soundSystem) this.soundSystem.playPunch();
        if (this.stateTimer === Math.floor(oneInchDuration * 0.35)) {
          this.checkAttackCollision(opponent, effectSystem);
        }
        if (this.stateTimer >= oneInchDuration) this.setState(STATES.IDLE);
        break;

      case STATES.HAMMER_FIST:
        const hammerDuration = 16;
        this.animProgress = Math.min(this.stateTimer / hammerDuration, 1);
        if (this.stateTimer === 1 && this.soundSystem) this.soundSystem.playPunch();
        if (this.stateTimer === Math.floor(hammerDuration * 0.4)) {
          this.checkAttackCollision(opponent, effectSystem);
        }
        if (this.stateTimer >= hammerDuration) this.setState(STATES.IDLE);
        break;

      case STATES.IRON_PALM:
        const palmDuration = 14;
        this.animProgress = Math.min(this.stateTimer / palmDuration, 1);
        if (this.stateTimer === 1 && this.soundSystem) this.soundSystem.playPunch();
        if (this.stateTimer === Math.floor(palmDuration * 0.35)) {
          this.checkAttackCollision(opponent, effectSystem);
        }
        if (this.stateTimer >= palmDuration) this.setState(STATES.IDLE);
        break;

      case STATES.FRONT_KICK:
        const frontKickDuration = 14;
        this.animProgress = Math.min(this.stateTimer / frontKickDuration, 1);
        if (this.stateTimer === 1 && this.soundSystem) this.soundSystem.playKick();
        if (this.stateTimer === Math.floor(frontKickDuration * 0.35)) {
          this.checkAttackCollision(opponent, effectSystem);
        }
        if (this.stateTimer >= frontKickDuration) this.setState(STATES.IDLE);
        break;

      case STATES.ROUNDHOUSE_KICK:
        const roundhouseDuration = 18;
        this.animProgress = Math.min(this.stateTimer / roundhouseDuration, 1);
        if (this.stateTimer === 1 && this.soundSystem) this.soundSystem.playKick();
        if (this.stateTimer === Math.floor(roundhouseDuration * 0.4)) {
          this.checkAttackCollision(opponent, effectSystem);
        }
        if (this.stateTimer >= roundhouseDuration) this.setState(STATES.IDLE);
        break;

      case STATES.SIDE_KICK:
        const sideKickDuration = 16;
        this.animProgress = Math.min(this.stateTimer / sideKickDuration, 1);
        if (this.stateTimer === 1 && this.soundSystem) this.soundSystem.playKick();
        if (this.stateTimer === Math.floor(sideKickDuration * 0.38)) {
          this.checkAttackCollision(opponent, effectSystem);
        }
        if (this.stateTimer >= sideKickDuration) this.setState(STATES.IDLE);
        break;

      case STATES.SPINNING_HOOK_KICK:
        const spinDuration = 24;
        this.animProgress = Math.min(this.stateTimer / spinDuration, 1);
        if (this.stateTimer === 1 && this.soundSystem) this.soundSystem.playKick();
        if (this.stateTimer === Math.floor(spinDuration * 0.5)) {
          this.checkAttackCollision(opponent, effectSystem);
        }
        if (this.stateTimer >= spinDuration) this.setState(STATES.IDLE);
        break;

      case STATES.AXE_KICK:
        const axeKickDuration = 20;
        this.animProgress = Math.min(this.stateTimer / axeKickDuration, 1);
        if (this.stateTimer === 1 && this.soundSystem) this.soundSystem.playKick();
        if (this.stateTimer === Math.floor(axeKickDuration * 0.45)) {
          this.checkAttackCollision(opponent, effectSystem);
        }
        if (this.stateTimer >= axeKickDuration) this.setState(STATES.IDLE);
        break;

      case STATES.SWEEP_KICK:
        const sweepKickDuration = 16;
        this.animProgress = Math.min(this.stateTimer / sweepKickDuration, 1);
        if (this.stateTimer === 1 && this.soundSystem) this.soundSystem.playKick();
        if (this.stateTimer === Math.floor(sweepKickDuration * 0.35)) {
          this.checkAttackCollision(opponent, effectSystem);
        }
        if (this.stateTimer >= sweepKickDuration) this.setState(STATES.IDLE);
        break;

      case STATES.COMBO:
        const comboDuration = 16;
        this.animProgress = Math.min(this.stateTimer / comboDuration, 1);

        if (this.stateTimer === 1 && this.soundSystem) {
          if (this.comboMove === 'kick') this.soundSystem.playKick();
          else this.soundSystem.playPunch();
        }

        if (this.stateTimer === Math.floor(comboDuration * 0.35)) {
          this.checkAttackCollision(opponent, effectSystem);
        }

        if (this.stateTimer >= comboDuration) {
          this.setState(STATES.IDLE);
        }
        break;
        
      case STATES.SWEEP:
        const sweepDuration = 18;
        this.animProgress = Math.min(this.stateTimer / sweepDuration, 1);

        // Low sweep whoosh on first frame
        if (this.stateTimer === 1 && this.soundSystem) {
          this.soundSystem.playKick();
        }
        
        if (this.stateTimer === Math.floor(sweepDuration * 0.35)) {
          this.checkAttackCollision(opponent, effectSystem);
        }
        
        if (this.stateTimer >= sweepDuration) {
          this.setState(STATES.IDLE);
        }
        break;

      case STATES.SPECIAL:
        const chargeTime = 20;
        const fireTime = 10;
        const totalSpecial = chargeTime + fireTime;
        this.animProgress = Math.min(this.stateTimer / totalSpecial, 1);

        // Chi charge sound every 5 frames during charge phase
        if (this.stateTimer < chargeTime && this.stateTimer % 8 === 0 && this.soundSystem) {
          this.soundSystem.playChiCharge();
        }

        // Particle charging effect
        if (this.stateTimer < chargeTime && this.stateTimer % 5 === 0) {
          const handsPos = this.getHandsMidpoint();
          effectSystem.spawnBlockSparks(handsPos.x, handsPos.y, this.color);
        }
        
        // Fire special attack
        if (this.stateTimer === chargeTime) {
          const handsPos = this.getHandsMidpoint();
          // Spawn the blast slightly in front of the hands to avoid instant overlap
          const forwardOffset = Math.max(24, this.width * 0.6);
          const spawnX = handsPos.x + this.dir * forwardOffset;
          // Create Blast
          effectSystem.blasts.push(
            new ChiBlast(spawnX, handsPos.y, this.dir, this.id, this.color)
          );
          effectSystem.spawnChiExplosion(handsPos.x, handsPos.y, this.color);
          effectSystem.triggerShake(4, 10);
          this.chi = 0; // Reset Chi energy
          // Chi blast fire sound
          if (this.soundSystem) this.soundSystem.playChiBlast();
        }
        
        if (this.stateTimer >= totalSpecial) {
          this.setState(STATES.IDLE);
        }
        break;
        
      case STATES.WALK:
        // Faster walk cycle for snappier feel
        this.animProgress = (this.stateTimer * 0.12) % 1;
        break;

      case STATES.JUMP:
        this.animProgress = this.vel.y < 0 ? 0.3 : 0.7; // Ascending / descending animation pose
        break;

      default:
        this.animProgress = (this.stateTimer * 0.04) % 1; // Idle breath progress
        break;
    }
  }

  getHandsMidpoint() {
    // Get the global screen coordinates of both hands to spawn the Chi Blast
    const rightHandOffset = this.joints.rHand;
    return new Vector2D(
      this.pos.x + rightHandOffset.x * this.dir,
      this.pos.y + rightHandOffset.y
    );
  }

  checkAttackCollision(opponent, effectSystem) {
    if (opponent.state === STATES.DEAD) return;

    // Determine attack hitbox and properties
    let attackReach = 40;
    let attackHeightOffset = -35;
    let attackWidth = 42;
    let attackHeight = 54;
    let baseDamage = 8;
    let knockbackVal = 5;
    let hitType = 'punch'; // punch, kick, sweep, sword, staff

    if (this.state === STATES.PUNCH) {
      if (this.weapon === 'sword') {
        attackReach = 70;
        attackHeightOffset = -42;
        attackWidth = 62;
        attackHeight = 60;
        baseDamage = 18;
        knockbackVal = 9;
        hitType = 'sword';
      } else if (this.weapon === 'staff') {
        attackReach = 82;
        attackHeightOffset = -35;
        attackWidth = 68;
        attackHeight = 58;
        baseDamage = 16;
        knockbackVal = 11;
        hitType = 'staff';
      } else {
        attackReach = 48;
        attackHeightOffset = -45;
        attackWidth = 48;
        attackHeight = 50;
        baseDamage = 10;
        knockbackVal = 6;
        hitType = 'punch';
      }
    } else if (this.state === STATES.KICK) {
      if (this.weapon === 'sword') {
        attackReach = 80;
        attackHeightOffset = -48;
        attackWidth = 68;
        attackHeight = 58;
        baseDamage = 20;
        knockbackVal = 12;
        hitType = 'sword';
      } else if (this.weapon === 'staff') {
        attackReach = 100;
        attackHeightOffset = -22;
        attackWidth = 72;
        attackHeight = 72;
        baseDamage = 17;
        knockbackVal = 12;
        hitType = 'staff';
      } else {
        attackReach = 56;
        attackHeightOffset = -35;
        attackWidth = 54;
        attackHeight = 50;
        baseDamage = 13;
        knockbackVal = 8;
        hitType = 'kick';
      }
    } else if (this.state === STATES.COMBO) {
      if (this.comboMove === 'kick') {
        attackReach = 66;
        attackHeightOffset = -38;
        attackWidth = 60;
        attackHeight = 50;
        baseDamage = 18;
        knockbackVal = 11;
        hitType = 'kick';
      } else {
        attackReach = 56;
        attackHeightOffset = -42;
        attackWidth = 54;
        attackHeight = 50;
        baseDamage = 16;
        knockbackVal = 10;
        hitType = 'punch';
      }
    } else if (this.state === STATES.SWEEP) {
      if (this.weapon === 'sword') {
        attackReach = 98;
        attackHeightOffset = -48;
        attackWidth = 78;
        attackHeight = 58;
        baseDamage = 20;
        knockbackVal = 12;
        hitType = 'sword';
      } else if (this.weapon === 'staff') {
        attackReach = 118;
        attackHeightOffset = -22;
        attackWidth = 84;
        attackHeight = 72;
        baseDamage = 17;
        knockbackVal = 12;
        hitType = 'staff';
      } else {
        attackReach = 66;
        attackHeightOffset = -35;
        attackWidth = 64;
        attackHeight = 50;
        baseDamage = 13;
        knockbackVal = 8;
        hitType = 'kick';
      }
    } else if (this.state === STATES.SWEEP) {
      attackReach = 76;
      attackHeightOffset = -12;
      attackWidth = 96;
      attackHeight = 42;
      baseDamage = 11;
      knockbackVal = 7;
      hitType = 'sweep';
    } else if (this.state === STATES.ONE_INCH_PUNCH) {
      attackReach = 32;
      attackHeightOffset = -42;
      attackWidth = 40;
      attackHeight = 48;
      baseDamage = 14;
      knockbackVal = 8;
      hitType = 'punch';
    } else if (this.state === STATES.HAMMER_FIST) {
      attackReach = 52;
      attackHeightOffset = -38;
      attackWidth = 52;
      attackHeight = 55;
      baseDamage = 16;
      knockbackVal = 7;
      hitType = 'punch';
    } else if (this.state === STATES.IRON_PALM) {
      attackReach = 50;
      attackHeightOffset = -40;
      attackWidth = 54;
      attackHeight = 50;
      baseDamage = 15;
      knockbackVal = 6;
      hitType = 'punch';
    } else if (this.state === STATES.FRONT_KICK) {
      attackReach = 64;
      attackHeightOffset = -35;
      attackWidth = 58;
      attackHeight = 50;
      baseDamage = 14;
      knockbackVal = 9;
      hitType = 'kick';
    } else if (this.state === STATES.ROUNDHOUSE_KICK) {
      attackReach = 70;
      attackHeightOffset = -32;
      attackWidth = 68;
      attackHeight = 54;
      baseDamage = 18;
      knockbackVal = 11;
      hitType = 'kick';
    } else if (this.state === STATES.SIDE_KICK) {
      attackReach = 68;
      attackHeightOffset = -38;
      attackWidth = 62;
      attackHeight = 52;
      baseDamage = 17;
      knockbackVal = 12;
      hitType = 'kick';
    } else if (this.state === STATES.SPINNING_HOOK_KICK) {
      attackReach = 72;
      attackHeightOffset = -36;
      attackWidth = 70;
      attackHeight = 56;
      baseDamage = 19;
      knockbackVal = 13;
      hitType = 'kick';
    } else if (this.state === STATES.AXE_KICK) {
      attackReach = 66;
      attackHeightOffset = -28;
      attackWidth = 60;
      attackHeight = 54;
      baseDamage = 20;
      knockbackVal = 10;
      hitType = 'kick';
    } else if (this.state === STATES.SWEEP_KICK) {
      attackReach = 72;
      attackHeightOffset = -18;
      attackWidth = 80;
      attackHeight = 40;
      baseDamage = 12;
      knockbackVal = 8;
      hitType = 'kick';
    }

    // Calculate global hitbox area around the attack point
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
      // Check if blocked
      const isFacingAttacker = (opponent.dir !== this.dir);
      const isBlocking = (opponent.state === STATES.BLOCK || (opponent.state === STATES.CROUCH && hitType === 'sweep')) && isFacingAttacker;

      if (isBlocking) {
        // Reduced damage and block sparks
        const damageTaken = baseDamage * 0.15;
        opponent.health = Math.max(opponent.health - damageTaken, 0);
        
        // Block feedback
        opponent.vel.x = this.dir * 2; // minor pushback
        this.chi = Math.min(this.chi + baseDamage * 0.4, this.maxChi); // charging Chi
        opponent.chi = Math.min(opponent.chi + baseDamage * 0.6, opponent.maxChi); // blocking charges Chi more

        effectSystem.spawnBlockSparks(hitboxX, hitboxY, '#00f0ff');
        effectSystem.triggerShake(1.5, 6);

        // Block impact sound
        if (this.soundSystem) this.soundSystem.playBlock();
      } else {
        // Full hit logic
        opponent.health = Math.max(opponent.health - baseDamage, 0);
        opponent.setState(STATES.HIT, true);
        
        // Knockback physics
        opponent.vel.x = this.dir * knockbackVal;
        if (hitType === 'sweep') {
          opponent.vel.y = -4; // trip/lift off ground slightly
        } else {
          opponent.vel.y = -2; // slight stun popup
        }

        // Damage combos - track the move type
        this.comboCount++;
        this.lastComboMove = this.comboMove || this.state;
        this.comboTimer = 180; // 3 seconds to chain next hit
        
        // Chi charge
        this.chi = Math.min(this.chi + baseDamage * 0.8, this.maxChi);

        // VFX
        if (hitType === 'sword') {
          effectSystem.spawnSwordSlash(hitboxX, hitboxY, this.dir, 45, '#fff');
          effectSystem.spawnBloodSpurt(hitboxX, hitboxY, this.dir, '#ef4444');
          effectSystem.triggerShake(5, 12);
        } else {
          effectSystem.spawnHitSparks(hitboxX, hitboxY, this.color);
          effectSystem.spawnBloodSpurt(hitboxX, hitboxY, this.dir, 'rgba(239, 68, 68, 0.4)');
          effectSystem.triggerShake(3.5, 9);
        }

        // Hit impact sound
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
      // Breathing animation
      const breath = Math.sin(this.animProgress * Math.PI * 2) * 1.5;
      head.y += breath;
      neck.y += breath;
      lShoulder.y += breath * 0.8;
      rShoulder.y += breath * 0.8;
      
      // Hands idle breathing swaying
      lHand.x += Math.sin(this.animProgress * Math.PI * 2) * 1;
      rHand.x += Math.sin(this.animProgress * Math.PI * 2 + Math.PI) * 1;
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
    }
    else if (this.state === STATES.PUNCH) {
      const p = this.animProgress;
      const extend = Math.sin(p * Math.PI) * 54;
      const snap = Math.sin(p * Math.PI * 2) * 6;
      const leanDown = Math.sin(p * Math.PI) * 4;

      pelvis.x += extend * 0.18 + snap * 0.45;
      neck.x += extend * 0.28 + snap * 0.3;
      head.x += extend * 0.32 + snap * 0.22;
      pelvis.y += leanDown;

      rShoulder.x += extend * 0.26;
      rShoulder.y -= snap * 0.15;
      lShoulder.x -= extend * 0.12;
      lShoulder.y += snap * 0.1;

      rHand.set(base.rShoulder.x + extend + 10, -42 - leanDown * 0.6);
      rElbow.set(base.rShoulder.x + extend * 0.45, -38);
      lHand.set(base.lShoulder.x - 14, -34 + snap * 0.2);
      lElbow.set(base.lShoulder.x - 8, -32 + snap * 0.12);

      lFoot.set(base.lFoot.x - 10, base.lFoot.y + 6);
      rFoot.set(base.rFoot.x + extend * 0.16, base.rFoot.y - 4);
      lKnee.set(base.lHip.x - 12, base.lKnee.y + 6);
      rKnee.set(base.rHip.x + extend * 0.18, base.rKnee.y - 6);
    }
    else if (this.state === STATES.KICK) {
      const p = this.animProgress;
      const chamber = p < 0.25 ? (0.25 - p) / 0.25 * 20 : 4;
      const extend = Math.sin(p * Math.PI) * 68;
      const lean = Math.sin(p * Math.PI * 0.95) * 12;

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
        const extendedY = -28 - extend * 0.18;
        rFoot.set(base.rHip.x + extend, extendedY);
        rKnee.set(base.rHip.x + extend * 0.4, extendedY * 0.58);
      }

      lHand.set(-20, -36 + lean * 0.25);
      lElbow.set(-14, -34 + lean * 0.18);
      rHand.set(18, -36 - lean * 0.4);
      rElbow.set(12, -30 - lean * 0.3);
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
    else if (this.state === STATES.SWEEP) {
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

    const auraColor = charged ? '#ffffff' : baseColor;
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
