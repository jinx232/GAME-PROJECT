import { Vector2D } from './Vector2D';

export class Particle {
  constructor(x, y, vx, vy, color, size, maxLife, gravity = 0.2, type = 'spark') {
    this.pos = new Vector2D(x, y);
    this.vel = new Vector2D(vx, vy);
    this.color = color;
    this.size = size;
    this.startSize = size;
    this.life = maxLife;
    this.maxLife = maxLife;
    this.gravity = gravity;
    this.type = type; // 'spark', 'blood', 'dust', 'chi_burst', 'sword_trail', 'shockwave'
  }

  update() {
    this.vel.y += this.gravity;
    this.vel.x *= 0.98; // Friction
    this.pos.add(this.vel);
    this.life--;
    
    // Scale down or expand over time
    if (this.type === 'dust') {
      this.size = this.startSize * (1 + (1 - this.life / this.maxLife) * 0.8);
    } else if (this.type === 'shockwave') {
      this.size = this.startSize * (1 + (1 - this.life / this.maxLife) * 4.5);
    } else {
      this.size = this.startSize * (this.life / this.maxLife);
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.life / this.maxLife;
    
    if (this.type === 'spark') {
      // Removed expensive shadowBlur and shadowColor for high-performance spark rendering
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.pos.x, this.pos.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'blood') {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.pos.x, this.pos.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'dust') {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.pos.x, this.pos.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'chi_burst') {
      // Replaced expensive shadowBlur and radialGradient with nested circle layers
      // Layer 1: Outer glowing ring
      ctx.save();
      ctx.globalAlpha = (this.life / this.maxLife) * 0.25;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.pos.x, this.pos.y, this.size * 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Layer 2: Middle glowing ring
      ctx.save();
      ctx.globalAlpha = (this.life / this.maxLife) * 0.55;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.pos.x, this.pos.y, this.size * 1.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Layer 3: Inner white core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(this.pos.x, this.pos.y, this.size * 0.65, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'shockwave') {
      // Draw expanding ring outline for high impact deflects
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 3.5 * (this.life / this.maxLife);
      ctx.beginPath();
      ctx.arc(this.pos.x, this.pos.y, this.size, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    ctx.restore();
  }
}

export class ChiBlast {
  constructor(x, y, direction, ownerId, color = '#00f0ff') {
    this.pos = new Vector2D(x, y);
    this.vel = new Vector2D(direction * 14, 0);
    this.ownerId = ownerId;
    this.color = color;
    this.radius = 20;
    this.damage = 18;
    this.knockback = 12;
    this.life = 120; // 2 seconds at 60fps
    this.trail = [];
    this.age = 0; // frames since spawned
  }

  update() {
    this.trail.push(this.pos.clone());
    if (this.trail.length > 8) {
      this.trail.shift();
    }
    this.pos.add(this.vel);
    this.age++;
    this.life--;
  }

  draw(ctx) {
    ctx.save();

    // Draw trail
    for (let i = 0; i < this.trail.length; i++) {
      const p = this.trail[i];
      const alpha = (i / this.trail.length) * 0.35;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, this.radius * (i / this.trail.length) * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Replaced expensive shadowBlur and radialGradient with high-performance nested circles
    // Layer 1: Outer glow ring
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.radius * 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Layer 2: Middle glow ring
    ctx.save();
    ctx.globalAlpha = 0.65;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.radius * 0.95, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Layer 3: Inner white core
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.radius * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Small rotating electrical rings
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const time = Date.now() * 0.01;
    ctx.ellipse(this.pos.x, this.pos.y, this.radius * 1.2, this.radius * 0.4, time, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
}

export class EffectSystem {
  constructor() {
    this.particles = [];
    this.blasts = [];
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
  }

  triggerShake(intensity, duration) {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
  }

  update(width, height) {
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update();
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update Chi Blasts
    for (let i = this.blasts.length - 1; i >= 0; i--) {
      const b = this.blasts[i];
      b.update();
      
      // Remove if dead or out of bounds
      if (b.life <= 0 || b.pos.x < 0 || b.pos.x > width) {
        this.blasts.splice(i, 1);
      }
    }

    // Update screen shake
    if (this.shakeDuration > 0) {
      this.shakeDuration--;
      if (this.shakeDuration === 0) {
        this.shakeIntensity = 0;
      }
    }
  }

  draw(ctx) {
    this.particles.forEach(p => p.draw(ctx));
    this.blasts.forEach(b => b.draw(ctx));
  }

  spawnHitSparks(x, y, color = '#ffeb3b') {
    const count = 12 + Math.random() * 6;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - 1.5;
      const size = 2 + Math.random() * 3;
      const life = 15 + Math.random() * 15;
      this.particles.push(new Particle(x, y, vx, vy, color, size, life, 0.15, 'spark'));
    }
  }

  spawnBloodSpurt(x, y, direction, color = '#ef4444') {
    const count = 15 + Math.random() * 8;
    for (let i = 0; i < count; i++) {
      const vx = direction * (2 + Math.random() * 6) + (Math.random() - 0.5) * 3;
      const vy = -3 - Math.random() * 5;
      const size = 2 + Math.random() * 4;
      const life = 20 + Math.random() * 20;
      this.particles.push(new Particle(x, y, vx, vy, color, size, life, 0.25, 'blood'));
    }
  }

  spawnDustCloud(x, y, color = 'rgba(255, 255, 255, 0.2)') {
    const count = 3 + Math.random() * 3;
    for (let i = 0; i < count; i++) {
      const vx = (Math.random() - 0.5) * 1.5;
      const vy = -0.2 - Math.random() * 0.8;
      const size = 8 + Math.random() * 8;
      const life = 25 + Math.random() * 15;
      this.particles.push(new Particle(x, y, vx, vy, color, size, life, -0.01, 'dust'));
    }
  }

  spawnBlockSparks(x, y, color = '#00f0ff') {
    const count = 8 + Math.random() * 4;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - 0.5;
      const size = 1.5 + Math.random() * 2;
      const life = 10 + Math.random() * 10;
      this.particles.push(new Particle(x, y, vx, vy, color, size, life, 0.1, 'spark'));
    }
  }

  spawnChiExplosion(x, y, color = '#00f0ff') {
    // Large explosion of sparks and chi bursts
    const count = 30;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 10;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const size = 3 + Math.random() * 6;
      const life = 20 + Math.random() * 25;
      const type = Math.random() > 0.4 ? 'chi_burst' : 'spark';
      this.particles.push(new Particle(x, y, vx, vy, color, size, life, 0.05, type));
    }
  }

  spawnSwordSlash(x, y, direction, size = 40, color = 'rgba(255, 255, 255, 0.8)') {
    const count = 8;
    for (let i = 0; i < count; i++) {
      const vx = direction * (4 + i) * 0.8;
      const vy = (Math.random() - 0.5) * 2;
      const pSize = 2 + Math.random() * 2;
      const life = 10 + Math.random() * 10;
      this.particles.push(new Particle(x + i * direction * 4, y, vx, vy, color, pSize, life, 0.0, 'spark'));
    }
  }

  spawnShockwave(x, y, color = '#ffffff') {
    // Spawn an expanding ring outline particle (life: 20 frames, starts at size 8, gravity 0)
    this.particles.push(new Particle(x, y, 0, 0, color, 8, 20, 0, 'shockwave'));
  }
}
