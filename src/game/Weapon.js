import { Vector2D } from './Vector2D';

export class Weapon {
  constructor(x, y, type) {
    this.pos = new Vector2D(x, y);
    this.vel = new Vector2D(0, 0);
    this.type = type; // 'sword', 'staff'
    this.isEquipped = false;
    this.equippedBy = null;
    
    this.width = 30;
    this.height = 10;
    this.isGrounded = false;
    this.angle = Math.PI / 2; // flat on floor
  }

  update(groundY, screenWidth) {
    if (this.isEquipped) return;

    // Physics
    if (!this.isGrounded) {
      this.vel.y += 0.45; // gravity
    }
    
    // Friction on ground
    if (this.isGrounded) {
      this.vel.x *= 0.88;
      this.vel.y = 0;
    } else {
      this.vel.x *= 0.98;
    }

    this.pos.add(this.vel);

    // Ground collision
    if (this.pos.y >= groundY) {
      this.pos.y = groundY;
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }

    // Screen boundaries
    if (this.pos.x < 30) {
      this.pos.x = 30;
      this.vel.x = -this.vel.x * 0.5; // bounce slightly
    }
    if (this.pos.x > screenWidth - 30) {
      this.pos.x = screenWidth - 30;
      this.vel.x = -this.vel.x * 0.5;
    }
  }

  draw(ctx) {
    if (this.isEquipped) return;

    ctx.save();
    
    const time = Date.now() * 0.005;
    const bounce = Math.sin(time) * 3;
    const pulse = 0.6 + Math.sin(time * 1.5) * 0.4;
    
    // Ground shadow ellipse
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(this.pos.x, this.pos.y + 2, 18, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Outer pickup glow ring
    ctx.shadowBlur = 20 * pulse;
    ctx.shadowColor = this.type === 'sword' ? '#ffffff' : '#fbbf24';
    
    ctx.translate(this.pos.x, this.pos.y - 8 + bounce);
    ctx.rotate(Math.PI / 2.3);

    if (this.type === 'sword') {
      // Blade glow
      ctx.shadowBlur = 15 * pulse;
      ctx.shadowColor = '#ffffff';
      
      // Blade
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -30);
      ctx.stroke();

      // Blade tip
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(-2, -30);
      ctx.lineTo(2, -30);
      ctx.lineTo(0, -36);
      ctx.closePath();
      ctx.fill();

      // Guard
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-5, 0);
      ctx.lineTo(5, 0);
      ctx.stroke();

      // Hilt
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 8);
      ctx.stroke();

    } else if (this.type === 'staff') {
      ctx.shadowBlur = 15 * pulse;
      ctx.shadowColor = '#fbbf24';
      
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(0, 28);
      ctx.lineTo(0, -28);
      ctx.stroke();

      // Gold bindings
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 5.5;
      ctx.beginPath();
      ctx.moveTo(0, 28);
      ctx.lineTo(0, 20);
      ctx.moveTo(0, -28);
      ctx.lineTo(0, -20);
      ctx.stroke();
    }

    ctx.restore();
    
    // Pickup hint label (drawn in world space, above weapon)
    ctx.save();
    ctx.globalAlpha = 0.5 + Math.sin(time * 2) * 0.3;
    ctx.fillStyle = this.type === 'sword' ? '#f1f5f9' : '#fbbf24';
    ctx.shadowBlur = 8;
    ctx.shadowColor = this.type === 'sword' ? '#ffffff' : '#fbbf24';
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.type === 'sword' ? '⚔ SWORD' : '🪄 STAFF', this.pos.x, this.pos.y - 22 + bounce);
    ctx.restore();
  }
}
