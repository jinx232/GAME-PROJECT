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
      // Curved Katana Blade
      ctx.shadowBlur = 15 * pulse;
      ctx.shadowColor = 'rgba(56, 189, 248, 0.6)';
      
      // Hilt / Tsuka (Red wrap over black)
      ctx.strokeStyle = '#0f172a'; // black tsuka base
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 10);
      ctx.stroke();

      // Red wrap diamonds
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, 3, 1.2, 0, Math.PI * 2);
      ctx.arc(0, 7, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Pommel / Kashira
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(0, 10, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Handguard / Tsuba (Gold circular guard)
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();

      // Curved steel blade
      ctx.strokeStyle = '#f8fafc'; // polished silver edge
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(2, -15, 4, -30);
      ctx.stroke();

      // Katana Hamon Line (Wavy pattern)
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0.5, 0);
      ctx.quadraticCurveTo(2.5, -6, 1, -12);
      ctx.quadraticCurveTo(3.5, -18, 2, -24);
      ctx.quadraticCurveTo(4.5, -29, 4, -30);
      ctx.stroke();

      // Katana tip / Kissaki (Chiseled angle)
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(2.4, -30);
      ctx.lineTo(4, -30);
      ctx.lineTo(5.5, -35);
      ctx.lineTo(1, -32);
      ctx.closePath();
      ctx.fill();

    } else if (this.type === 'staff') {
      ctx.shadowBlur = 15 * pulse;
      ctx.shadowColor = '#fbbf24';
      
      // Mahogany Wood Shaft
      ctx.strokeStyle = '#451a03'; // dark mahogany
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(0, 28);
      ctx.lineTo(0, -28);
      ctx.stroke();

      // Red Center Grip Wrap
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 5.2;
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(0, 6);
      ctx.stroke();

      // Gold Dragon Engravings/End Caps
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 5.6;
      ctx.beginPath();
      ctx.moveTo(0, 28);
      ctx.lineTo(0, 20);
      ctx.moveTo(0, -28);
      ctx.lineTo(0, -20);
      ctx.stroke();

    } else if (this.type === 'nunchucks') {
      ctx.shadowBlur = 15 * pulse;
      ctx.shadowColor = '#eab308';

      // Octagonal Polished Black Wood Handles
      ctx.lineWidth = 4.2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#1e293b'; // slate black wood
      
      // Handle 1
      ctx.beginPath();
      ctx.moveTo(-6, -8);
      ctx.lineTo(-12, 4);
      ctx.stroke();

      // Handle 2
      ctx.beginPath();
      ctx.moveTo(6, -8);
      ctx.lineTo(12, 4);
      ctx.stroke();

      // Steel End Caps
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 4.6;
      ctx.beginPath();
      ctx.moveTo(-6, -8);
      ctx.lineTo(-7.5, -5);
      ctx.moveTo(6, -8);
      ctx.lineTo(7.5, -5);
      ctx.stroke();

      // Chain connecting them (Steel Links)
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-6, -8);
      ctx.quadraticCurveTo(0, -2, 6, -8);
      ctx.stroke();

    } else if (this.type === 'spear') {
      ctx.shadowBlur = 15 * pulse;
      ctx.shadowColor = '#f87171'; // Qiang spear red/steel shine

      // Red Wood Shaft
      ctx.strokeStyle = '#7f1d1d'; // rich reddish dark wood
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(0, 32);
      ctx.lineTo(0, -18);
      ctx.stroke();

      // Red Silk Tassel (flowing shape)
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(-5, -18);
      ctx.quadraticCurveTo(-8, -12, -4, -6);
      ctx.lineTo(4, -6);
      ctx.quadraticCurveTo(8, -12, 5, -18);
      ctx.closePath();
      ctx.fill();

      // Flame-shaped Steel Tip / Spearhead
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.quadraticCurveTo(-6, -24, -2, -28);
      ctx.lineTo(0, -38); // Tip
      ctx.lineTo(2, -28);
      ctx.quadraticCurveTo(6, -24, 0, -18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
    
    // Pickup hint label (drawn in world space, above weapon)
    ctx.save();
    ctx.globalAlpha = 0.5 + Math.sin(time * 2) * 0.3;
    
    let labelText = '⚔ KATANA';
    let labelColor = '#38bdf8';
    if (this.type === 'staff') {
      labelText = '🪄 BO STAFF';
      labelColor = '#fbbf24';
    } else if (this.type === 'nunchucks') {
      labelText = '⛓ NUNCHUCKS';
      labelColor = '#f59e0b';
    } else if (this.type === 'spear') {
      labelText = '🔱 QIANG SPEAR';
      labelColor = '#f87171';
    }

    ctx.fillStyle = labelColor;
    ctx.shadowBlur = 8;
    ctx.shadowColor = labelColor;
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(labelText, this.pos.x, this.pos.y - 22 + bounce);
    ctx.restore();
  }
}
