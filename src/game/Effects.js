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
      // Main center puff
      ctx.arc(this.pos.x, this.pos.y, this.size, 0, Math.PI * 2);
      // Left puff
      ctx.arc(this.pos.x - this.size * 0.45, this.pos.y + this.size * 0.15, this.size * 0.72, 0, Math.PI * 2);
      // Right puff
      ctx.arc(this.pos.x + this.size * 0.45, this.pos.y + this.size * 0.15, this.size * 0.72, 0, Math.PI * 2);
      // Top puff
      ctx.arc(this.pos.x, this.pos.y - this.size * 0.35, this.size * 0.8, 0, Math.PI * 2);
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
    this.windTrails = [];
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
  }

  triggerShake(intensity, duration) {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
  }

  update(width) {
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

    // Update wind trails
    for (let i = this.windTrails.length - 1; i >= 0; i--) {
      const wt = this.windTrails[i];
      wt.x += wt.vx;
      wt.life--;
      if (wt.life <= 0 || wt.x < -200 || wt.x > width + 200) {
        this.windTrails.splice(i, 1);
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

    // Draw wind trails
    this.windTrails.forEach(wt => {
      ctx.save();
      ctx.globalAlpha = (wt.life / wt.maxLife) * 0.45;
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = wt.thickness;
      ctx.beginPath();
      for (let dx = 0; dx < wt.length; dx += 5) {
        const px = wt.x + dx;
        const py = wt.y + Math.sin(px * wt.frequency + wt.phase) * wt.amplitude;
        if (dx === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();
      ctx.restore();
    });
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
      const pSize = (2 + Math.random() * 2) * (size / 40);
      const life = 10 + Math.random() * 10;
      this.particles.push(new Particle(x + i * direction * 4, y, vx, vy, color, pSize, life, 0.0, 'spark'));
    }
  }

  spawnShockwave(x, y, color = '#ffffff') {
    // Spawn an expanding ring outline particle (life: 20 frames, starts at size 8, gravity 0)
    this.particles.push(new Particle(x, y, 0, 0, color, 8, 20, 0, 'shockwave'));
  }

  spawnWindGust(windDir) {
    const count = 18 + Math.random() * 8;
    for (let i = 0; i < count; i++) {
      const x = windDir > 0 ? -20 : 980;
      const y = Math.random() * 400;
      const vx = windDir * (6 + Math.random() * 5);
      const vy = (Math.random() - 0.5) * 1.5;
      const size = 3 + Math.random() * 4;
      const life = 120 + Math.random() * 40;
      const color = Math.random() > 0.5 ? '#4ade80' : '#22c55e';
      this.particles.push(new Particle(x, y, vx, vy, color, size, life, 0.0, 'dust'));
    }
  }

  drawLightning(ctx, lx, ly, targetY) {
    ctx.save();
    // Flicker effect: skip drawing on some frames for intense flashing
    if (Math.random() < 0.12) {
      ctx.restore();
      return;
    }
    ctx.shadowBlur = 24;
    ctx.shadowColor = '#fbbf24';
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 4 + Math.random() * 2;
    ctx.beginPath();
    let cx = lx, cy = ly;
    ctx.moveTo(cx, cy);
    while (cy < targetY) {
      const ncx = cx + (Math.random() - 0.5) * 40;
      const ncy = cy + 25 + Math.random() * 20;
      ctx.lineTo(ncx, Math.min(ncy, targetY));
      cx = ncx; cy = ncy;
    }
    ctx.stroke();

    // Draw branching bolts
    if (Math.random() < 0.45) {
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = '#fde68a';
      ctx.beginPath();
      // Start branch about halfway down
      const startY = targetY * 0.45;
      let bx = lx + (Math.random() - 0.5) * 20;
      let by = startY;
      ctx.moveTo(bx, by);
      while (by < targetY - 45) {
        const ncx = bx + (Math.random() > 0.5 ? 18 : -18) + (Math.random() - 0.5) * 12;
        const ncy = by + 20 + Math.random() * 15;
        ctx.lineTo(ncx, ncy);
        bx = ncx; by = ncy;
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  drawLavaSpout(ctx, x, groundY, flameH) {
    ctx.save();
    const t = Date.now() * 0.022;
    const dynamicH = flameH + Math.sin(t) * 16 + (Math.random() - 0.5) * 8;
    const widthOffset = Math.sin(t * 1.6) * 5;

    // Outer flame/lava spout
    ctx.shadowBlur = 22;
    ctx.shadowColor = '#f97316';
    ctx.fillStyle = 'rgba(249, 115, 22, 0.85)';
    ctx.beginPath();
    ctx.moveTo(x - 22 + widthOffset, groundY);
    ctx.quadraticCurveTo(x + (Math.random() - 0.5) * 6, groundY - dynamicH, x + 22 - widthOffset, groundY);
    ctx.fill();

    // Inner hot core
    ctx.fillStyle = 'rgba(253, 224, 71, 0.95)';
    ctx.beginPath();
    ctx.moveTo(x - 11 + widthOffset * 0.5, groundY);
    ctx.quadraticCurveTo(x, groundY - dynamicH * 0.68, x + 11 - widthOffset * 0.5, groundY);
    ctx.fill();

    // White hot center core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(x - 5, groundY);
    ctx.quadraticCurveTo(x, groundY - dynamicH * 0.38, x + 5, groundY);
    ctx.fill();
    ctx.restore();
  }

  drawWarningSignal(ctx, type, x, y, size, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    if (type === 'lava') {
      ctx.fillStyle = `rgba(249, 115, 22, ${alpha})`;
      ctx.beginPath();
      ctx.ellipse(x, y, size, size * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Bubbling warning dots inside the warning zone
      const t = Date.now() * 0.006;
      ctx.fillStyle = `rgba(253, 224, 71, ${alpha * 0.85})`;
      for (let i = 0; i < 3; i++) {
        const bx = x + Math.sin(t + i * 2) * (size * 0.75);
        const by = y + Math.cos(t * 1.4 + i) * (size * 0.16);
        const r = 2.5 + Math.abs(Math.sin(t * 2.2 + i)) * 4.5;
        ctx.beginPath();
        ctx.arc(bx, by, r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 12px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚠️ DANGER', x, y - 20);
    } else if (type === 'lightning') {
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 12px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ WARNING', x, y - 40);
    }
    ctx.restore();
  }

  drawDroneLaser(ctx, dx, dy, groundY, color, timer, warningTimer, warnAlpha) {
    ctx.save();

    // 1. Draw hovering drone
    const hoverY = dy + Math.sin(Date.now() * 0.008) * 5;
    
    // Draw wing thruster glows (anti-grav engines)
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.shadowBlur = 8;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    // Left thruster
    ctx.beginPath();
    ctx.arc(dx - 24, hoverY, 6, 0, Math.PI * 2);
    ctx.fill();
    // Right thruster
    ctx.beginPath();
    ctx.arc(dx + 24, hoverY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Draw metal wings
    ctx.fillStyle = '#1e293b'; // slate-800
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(dx - 32, hoverY - 4, 64, 8, 4);
    ctx.fill();
    ctx.stroke();

    // Draw central drone capsule/body
    ctx.fillStyle = '#0f172a'; // slate-900
    ctx.beginPath();
    ctx.arc(dx, hoverY, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Draw central lens/sensor eye
    ctx.save();
    const lensPulse = Math.sin(Date.now() * 0.02) * 0.5 + 0.5;
    ctx.fillStyle = warningTimer > 0 
      ? `rgba(239, 68, 68, ${0.4 + lensPulse * 0.6})` // blinking red when target locking
      : color; // glowing neon laser color when firing
    ctx.shadowBlur = 6;
    ctx.shadowColor = warningTimer > 0 ? '#ef4444' : color;
    ctx.beginPath();
    ctx.arc(dx, hoverY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Draw warning target line (blinks) or full laser firing beam
    if (warningTimer > 0) {
      if (warnAlpha > 0) {
        // Red targeting laser line
        ctx.strokeStyle = `rgba(239, 68, 68, ${warnAlpha * 0.85})`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(dx, hoverY + 12);
        ctx.lineTo(dx, groundY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Ground warning circle
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(dx, groundY, 45, 9, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
        ctx.beginPath();
        ctx.ellipse(dx, groundY, 45, 9, 0, 0, Math.PI * 2);
        ctx.fill();

        // Lock-on brackets
        const bracketSize = 8;
        const widthHalf = 45;
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.5;
        // Left bracket
        ctx.beginPath();
        ctx.moveTo(dx - widthHalf + bracketSize, groundY - 4);
        ctx.lineTo(dx - widthHalf, groundY - 4);
        ctx.lineTo(dx - widthHalf, groundY + 4);
        ctx.lineTo(dx - widthHalf + bracketSize, groundY + 4);
        ctx.stroke();
        // Right bracket
        ctx.beginPath();
        ctx.moveTo(dx + widthHalf - bracketSize, groundY - 4);
        ctx.lineTo(dx + widthHalf, groundY - 4);
        ctx.lineTo(dx + widthHalf, groundY + 4);
        ctx.lineTo(dx + widthHalf - bracketSize, groundY + 4);
        ctx.stroke();

        // "LOCKING" Text
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 10px "Outfit", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🛸 DRONE LOCK', dx, groundY - 24);
      }
    } else {
      // 3. Firing laser beam!
      ctx.save();
      // Outer glow layer
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = 26 + Math.sin(Date.now() * 0.15) * 6;
      ctx.beginPath();
      ctx.moveTo(dx, hoverY + 12);
      ctx.lineTo(dx, groundY);
      ctx.stroke();

      // Middle glowing beam
      ctx.globalAlpha = 0.65;
      ctx.lineWidth = 14 + Math.sin(Date.now() * 0.15) * 3;
      ctx.stroke();

      // Inner white hot core
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = 1.0;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(dx, hoverY + 12);
      ctx.lineTo(dx, groundY);
      ctx.stroke();
      ctx.restore();

      // Rising charge energy rings along the beam
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      const ringYOffset = (Date.now() * 0.4) % (groundY - hoverY);
      ctx.beginPath();
      ctx.ellipse(dx, groundY - ringYOffset, 20, 4, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }
}
