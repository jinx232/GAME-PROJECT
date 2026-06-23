import { STATES } from './Stickman';

export class AIController {
  constructor(difficulty = 'medium') {
    this.difficulty = difficulty;
    this.decisionTimer = 0;
    this.reactionDelay = this.getReactionDelay();
    
    // Virtual key state
    this.controls = {
      left: false,
      right: false,
      jump: false,
      crouch: false,
      block: false,
      punch: false,
      kick: false,
      sweep: false,
      special: false,
      pickup: false
    };
  }

  getReactionDelay() {
    switch (this.difficulty) {
      case 'easy': return 25 + Math.random() * 15; // 400-600ms
      case 'hard': return 5 + Math.random() * 5;    // 80-160ms
      case 'medium':
      default:
        return 12 + Math.random() * 10; // 200-350ms
    }
  }

  resetControls() {
    this.controls.left = false;
    this.controls.right = false;
    this.controls.jump = false;
    this.controls.crouch = false;
    this.controls.block = false;
    this.controls.punch = false;
    this.controls.kick = false;
    this.controls.sweep = false;
    this.controls.special = false;
    this.controls.pickup = false;
  }

  update(ai, opponent, weaponsList) {
    this.decisionTimer++;
    
    if (ai.state === STATES.DEAD || opponent.state === STATES.DEAD) {
      this.resetControls();
      return this.controls;
    }

    // React to projectiles (Chi Blasts)
    const activeProjectiles = ai.engineProjectiles || [];
    let projectileThreat = null;
    for (let p of activeProjectiles) {
      if (p.ownerId !== ai.id) {
        // Projectile heading towards AI
        const isHeadingLeft = p.vel.x < 0;
        const isHeadingRight = p.vel.x > 0;
        const isThreat = (isHeadingLeft && p.pos.x > ai.pos.x && p.pos.x - ai.pos.x < 220) ||
                         (isHeadingRight && p.pos.x < ai.pos.x && ai.pos.x - p.pos.x < 220);
        if (isThreat) {
          projectileThreat = p;
          break;
        }
      }
    }

    // Update decisions at intervals to simulate human latency
    if (this.decisionTimer >= this.reactionDelay) {
      this.decisionTimer = 0;
      this.reactionDelay = this.getReactionDelay();
      this.resetControls();

      const dist = ai.pos.dist(opponent.pos);
      const isFacingOpponent = (ai.pos.x < opponent.pos.x && ai.dir === 1) ||
                               (ai.pos.x > opponent.pos.x && ai.dir === -1);

      // 1. Evade or Block Projectiles
      if (projectileThreat) {
        const rand = Math.random();
        if (this.difficulty === 'hard') {
          if (rand > 0.4) this.controls.jump = true; // Jump over it
          else this.controls.block = true; // Block it
        } else if (this.difficulty === 'medium') {
          if (rand > 0.6) this.controls.jump = true;
          else if (rand > 0.3) this.controls.block = true;
        } else {
          if (rand > 0.8) this.controls.block = true;
        }
        return this.controls;
      }

      // 2. Weapon Seeking (AI tries to grab nearby weapon when unarmed)
      if (!ai.weapon && weaponsList.length > 0) {
        let closestWeapon = null;
        let minDist = Infinity;
        weaponsList.forEach(w => {
          if (!w.isEquipped) {
            const wDist = ai.pos.dist(w.pos);
            if (wDist < minDist) {
              minDist = wDist;
              closestWeapon = w;
            }
          }
        });

        if (closestWeapon) {
          if (minDist < 65) {
            this.controls.pickup = true;
            return this.controls;
          }

          // Chase weapon toward the nearest ground spawn
          if (ai.pos.x < closestWeapon.pos.x) this.controls.right = true;
          else this.controls.left = true;
          
          // Occasionally jump if blocked or stuck
          if (Math.random() < 0.05 && ai.isGrounded) this.controls.jump = true;
          return this.controls;
        }
      }

      // 3. Combat decisions based on distance
      if (dist > 220) {
        // Far: Move towards opponent
        if (ai.pos.x < opponent.pos.x) this.controls.right = true;
        else this.controls.left = true;

        // Random jump while chasing
        if (Math.random() < 0.02 && ai.isGrounded) {
          this.controls.jump = true;
        }

        // Fire Chi Blast if charged and facing
        if (ai.chi >= ai.maxChi && isFacingOpponent && Math.random() < 0.7) {
          this.controls.special = true;
        }
      } 
      else if (dist > 90) {
        // Mid Range: Close the gap
        if (ai.pos.x < opponent.pos.x) this.controls.right = true;
        else this.controls.left = true;

        // Block or backup if opponent is attacking
        if (opponent.state === STATES.PUNCH || opponent.state === STATES.KICK) {
          const blockChance = this.difficulty === 'hard' ? 0.7 : (this.difficulty === 'medium' ? 0.4 : 0.1);
          if (Math.random() < blockChance) {
            this.controls.block = true;
            // Stop moving
            this.controls.right = false;
            this.controls.left = false;
          }
        }

        // Chi blast at mid range
        if (ai.chi >= ai.maxChi && isFacingOpponent && Math.random() < 0.9) {
          this.controls.special = true;
        }
      } 
      else {
        // Close range: ATTACK!
        const rand = Math.random();
        
        // Check if opponent is executing an attack - decide to block
        const isOpponentAttacking = (opponent.state === STATES.PUNCH || 
                                     opponent.state === STATES.KICK || 
                                     opponent.state === STATES.SWEEP);
                                     
        if (isOpponentAttacking) {
          const blockChance = this.difficulty === 'hard' ? 0.75 : (this.difficulty === 'medium' ? 0.45 : 0.15);
          if (rand < blockChance) {
            if (opponent.state === STATES.SWEEP) {
              this.controls.crouch = true; // crouch-block sweep
            }
            this.controls.block = true;
            return this.controls;
          }
        }

        // Offense selection
        if (this.difficulty === 'hard') {
          if (rand < 0.35) this.controls.punch = true;
          else if (rand < 0.65) this.controls.kick = true;
          else if (rand < 0.85) this.controls.sweep = true;
          else this.controls.block = true; // block for strategy
        } 
        else if (this.difficulty === 'medium') {
          if (rand < 0.4) this.controls.punch = true;
          else if (rand < 0.7) this.controls.kick = true;
          else if (rand < 0.85) this.controls.sweep = true;
        } 
        else {
          // Easy: slow basic punch/kick
          if (rand < 0.3) this.controls.punch = true;
          else if (rand < 0.5) this.controls.kick = true;
        }
      }
    }

    return this.controls;
  }
}
