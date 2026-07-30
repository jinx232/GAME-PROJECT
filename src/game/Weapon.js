import { Vector2D } from './Vector2D';

export class Weapon {
  constructor(x, y, type) {
    this.pos = new Vector2D(x, y);
    this.vel = new Vector2D(0, 0);
    this.type = type; // 'sword', 'staff', 'nunchucks', 'spear', 'daggers', 'hammer'
    this.isEquipped = false;
    this.equippedBy = null;
    
    this.width = 36;
    this.height = 12;
    this.isGrounded = false;
    
    // 3D Rotation Angles (Pitch, Yaw, Roll for 2.5D/3D animation)
    this.rotX = 0;
    this.rotY = Math.random() * Math.PI * 2;
    this.rotZ = Math.PI / 2.3;
    this.rotSpeed = 0;
    this.glintTimer = Math.random() * 100;

    // Thrown projectile properties
    this.isThrownBy = null;
    this.damage = 18;
  }

  update(groundY, screenWidth) {
    this.glintTimer += 0.05;

    if (this.isEquipped) return;

    // Physics
    if (!this.isGrounded) {
      this.vel.y += 0.45; // gravity
      this.rotZ += this.rotSpeed; // 2D tumble spin
      this.rotY += 0.18; // 3D Y-axis spin
      this.rotX += 0.12; // 3D X-axis pitch tilt
    } else {
      // Smooth 3D floating tumble while idling on floor
      this.rotY += 0.032;
      this.rotX = Math.sin(this.glintTimer * 1.5) * 0.32;
      // Gently settle rotZ angle
      this.rotZ += (Math.PI / 2.3 - this.rotZ) * 0.1;
      this.vel.x *= 0.88;
      this.vel.y = 0;
      this.rotSpeed *= 0.8;
    }

    this.pos.add(this.vel);

    // Ground collision
    if (this.pos.y >= groundY) {
      if (!this.isGrounded && Math.abs(this.vel.y) > 2) {
        this.vel.y = -this.vel.y * 0.35; // bounce
        this.rotSpeed = (Math.random() - 0.5) * 0.25;
      } else {
        this.pos.y = groundY;
        this.isGrounded = true;
        this.vel.y = 0;
      }
    } else {
      this.isGrounded = false;
    }

    // Screen boundaries
    if (this.pos.x < 30) {
      this.pos.x = 30;
      this.vel.x = -this.vel.x * 0.5;
    }
    if (this.pos.x > screenWidth - 30) {
      this.pos.x = screenWidth - 30;
      this.vel.x = -this.vel.x * 0.5;
    }
  }

  draw(ctx) {
    if (this.isEquipped) return;

    ctx.save();
    
    const time = Date.now() * 0.004;
    const bounce = this.isGrounded ? Math.sin(time * 2.2) * 5 : 0;
    const pulse = 0.6 + Math.sin(time * 2.5) * 0.4;
    
    // 3D perspective foreshortening factors
    const cosY = Math.cos(this.rotY);
    const sinY = Math.sin(this.rotY);
    const cosX = Math.cos(this.rotX);
    
    // Dynamic 3D ground shadow (scales and skews with 3D tilt and height)
    const shadowWidth = 24 * Math.abs(cosY) + 12;
    const shadowHeight = 5 * Math.abs(cosX) + 2;
    const shadowScale = 1 - (bounce / 22);
    ctx.fillStyle = `rgba(0, 0, 0, ${0.38 * shadowScale})`;
    ctx.beginPath();
    ctx.ellipse(this.pos.x, this.pos.y + 2, shadowWidth * shadowScale * 0.6, shadowHeight * shadowScale, sinY * 0.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Theme-colored pickup aura
    let auraColor = '#38bdf8';
    if (this.type === 'staff') auraColor = '#fbbf24';
    else if (this.type === 'nunchucks') auraColor = '#f59e0b';
    else if (this.type === 'spear') auraColor = '#f87171';
    else if (this.type === 'daggers') auraColor = '#ec4899';
    else if (this.type === 'hammer') auraColor = '#00f0ff';

    ctx.shadowBlur = 12 * pulse;
    ctx.shadowColor = auraColor;
    
    // Floating magic energy sparks
    if (this.isGrounded) {
      ctx.save();
      ctx.fillStyle = auraColor;
      for (let i = 0; i < 4; i++) {
        const sparkX = this.pos.x + Math.sin(time * 3 + i * 1.5) * 18 * cosY;
        const sparkY = this.pos.y - 14 - (time * 18 + i * 8) % 24;
        const sparkAlpha = (1 - ((time * 18 + i * 8) % 24) / 24) * 0.7;
        ctx.globalAlpha = sparkAlpha;
        ctx.beginPath();
        ctx.arc(sparkX, sparkY, 1.8 + (i % 2) * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // ── Apply 3D Transform Pipeline ──
    ctx.translate(this.pos.x, this.pos.y - 14 + bounce);
    ctx.rotate(this.rotZ);
    // 3D Perspective foreshortening: width scales with cosY (yaw), height with cosX (pitch)
    // We enforce a minimum scale of 0.15 so the 3D edge remains crisp when turned completely sideways
    const faceScaleX = Math.sign(cosY || 1) * Math.max(0.15, Math.abs(cosY));
    const faceScaleY = Math.sign(cosX || 1) * Math.max(0.35, Math.abs(cosX));
    ctx.scale(faceScaleX, faceScaleY);

    // 3D Lighting angle factor (-1 to +1 specular reflection)
    const specularLight = sinY;
    const isFrontFace = cosY >= 0;

    if (this.type === 'sword') {
      // ── 3D KATANA (Curved Steel Samurai Blade) ──
      ctx.shadowBlur = 8 * pulse;
      ctx.shadowColor = 'rgba(56, 189, 248, 0.75)';
      
      // Hilt / Tsuka (Black slate with 3D braided wrap)
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-2.5, 0, 5, 12);

      // 3D Red wrap tsuka diamonds
      ctx.fillStyle = isFrontFace ? '#ef4444' : '#b91c1c';
      for (let y = 2; y <= 10; y += 3.5) {
        ctx.beginPath();
        ctx.arc(0, y, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3D Gold Kashira Pommel
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.ellipse(0, 12, 3.2, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // 3D Gold Tsuba Handguard (Foreshortened oval guard)
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.ellipse(0, 0, 7.5, 3.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.ellipse(specularLight * 2, -0.5, 5, 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // 3D Polished curved katana steel blade (Dual bevel layers)
      // Back dull spine
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 4.2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(2.5, -16, 4.5, -34);
      ctx.stroke();

      // Sharp polished silver face
      ctx.strokeStyle = isFrontFace ? '#ffffff' : '#cbd5e1';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(0.5, 0);
      ctx.quadraticCurveTo(3, -16, 5, -34);
      ctx.stroke();

      // Wavy Katana Hamon Line (3D Temper wave pattern)
      ctx.strokeStyle = `rgba(56, 189, 248, ${0.45 + Math.abs(specularLight) * 0.4})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0.5, 0);
      ctx.quadraticCurveTo(3.2, -8, 1.5, -16);
      ctx.quadraticCurveTo(4.2, -24, 2.8, -29);
      ctx.quadraticCurveTo(5.2, -32, 5, -34);
      ctx.stroke();

      // 3D Kissaki Blade Tip (Chiseled samurai tip)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(2.5, -34);
      ctx.lineTo(5, -34);
      ctx.lineTo(6.5, -39);
      ctx.lineTo(1.0, -36);
      ctx.closePath();
      ctx.fill();

      // Dynamic 3D Glint sheen sweep
      if (Math.abs(specularLight) > 0.4) {
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 14;
        ctx.shadowColor = '#ffffff';
        ctx.beginPath();
        const glintY = -8 - Math.abs(specularLight) * 22;
        ctx.arc(3, glintY, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (this.type === 'staff') {
      // ── 3D BO STAFF (Mahogany Dragon Staff) ──
      ctx.shadowBlur = 8 * pulse;
      ctx.shadowColor = '#fbbf24';
      
      // Mahogany Wood Shaft (3D Cylindrical shading)
      ctx.strokeStyle = '#270e03'; // Dark back ambient shadow
      ctx.lineWidth = 5.8;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 32); ctx.lineTo(0, -32); ctx.stroke();

      // Main mahogany wood body
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 4.8;
      ctx.beginPath(); ctx.moveTo(0, 32); ctx.lineTo(0, -32); ctx.stroke();

      // Front 3D cylinder specular highlight
      if (isFrontFace) {
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(1.2, 30); ctx.lineTo(1.2, -30); ctx.stroke();
      }

      // Glowing Dragon Runes along cylinder
      ctx.strokeStyle = `rgba(251, 191, 36, ${0.5 + Math.abs(specularLight) * 0.4})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(0, 24);
      ctx.quadraticCurveTo(2.8 * specularLight, 14, 0, 4);
      ctx.quadraticCurveTo(-2.8 * specularLight, -6, 0, -16);
      ctx.quadraticCurveTo(2.8 * specularLight, -22, 0, -24);
      ctx.stroke();

      // Red Center Leather Grip Wrap
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 5.8;
      ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(0, 7); ctx.stroke();

      // Gold Brass Dragon-Head End Caps (3D layered rings)
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 6.4;
      ctx.beginPath();
      ctx.moveTo(0, 32); ctx.lineTo(0, 24);
      ctx.moveTo(0, -32); ctx.lineTo(0, -24);
      ctx.stroke();

      // Glowing orb tips at both ends
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(0, 32, 3.2, 0, Math.PI * 2);
      ctx.arc(0, -32, 3.2, 0, Math.PI * 2);
      ctx.fill();

    } else if (this.type === 'nunchucks') {
      // ── 3D NUNCHUCKS (Articulated Dual Sticks) ──
      ctx.shadowBlur = 8 * pulse;
      ctx.shadowColor = '#f59e0b';

      ctx.lineWidth = 4.6;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#1e293b'; // Slate dark wood handles
      
      // Handle 1 (Angled left with 3D depth)
      ctx.beginPath();
      ctx.moveTo(-6 * cosY, -8);
      ctx.lineTo(-14 * cosY, 7);
      ctx.stroke();

      // Handle 2 (Angled right with 3D depth)
      ctx.beginPath();
      ctx.moveTo(6 * cosY, -8);
      ctx.lineTo(14 * cosY, 7);
      ctx.stroke();

      // 3D Gold grip rings
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 4.8;
      ctx.beginPath();
      ctx.moveTo(-10 * cosY, 0); ctx.lineTo(-11 * cosY, 2);
      ctx.moveTo(10 * cosY, 0); ctx.lineTo(11 * cosY, 2);
      ctx.stroke();

      // Steel End Caps
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 5.0;
      ctx.beginPath();
      ctx.moveTo(-6 * cosY, -8); ctx.lineTo(-8 * cosY, -4.5);
      ctx.moveTo(6 * cosY, -8); ctx.lineTo(8 * cosY, -4.5);
      ctx.stroke();

      // Articulated 3D Steel Chain Links
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-6 * cosY, -8);
      ctx.quadraticCurveTo(0, -15 - Math.abs(sinY) * 4, 6 * cosY, -8);
      ctx.stroke();

    } else if (this.type === 'spear') {
      // ── 3D QIANG SPEAR (Chinese Red Silk Spear) ──
      ctx.shadowBlur = 8 * pulse;
      ctx.shadowColor = '#f87171';

      // Deep Red Crimson Wood Shaft
      ctx.strokeStyle = '#7f1d1d';
      ctx.lineWidth = 3.8;
      ctx.beginPath(); ctx.moveTo(0, 36); ctx.lineTo(0, -20); ctx.stroke();

      // Silver metal shaft bindings
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 4.2;
      ctx.beginPath();
      ctx.moveTo(0, 22); ctx.lineTo(0, 18);
      ctx.moveTo(0, -10); ctx.lineTo(0, -13);
      ctx.stroke();

      // Red Silk Tassel (3D Fluttering cloth wave)
      const tasselSway = Math.sin(time * 4) * 4 * cosY;
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(-5, -20);
      ctx.quadraticCurveTo(-9 + tasselSway, -14, -4 + tasselSway, -7);
      ctx.lineTo(4 + tasselSway, -7);
      ctx.quadraticCurveTo(9 + tasselSway, -14, 5, -20);
      ctx.closePath();
      ctx.fill();

      // 3D Multi-barbed Flame Spearhead (Dual-bevel metal edge)
      ctx.fillStyle = isFrontFace ? '#ffffff' : '#cbd5e1';
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(0, -20);
      ctx.quadraticCurveTo(-7, -26, -2.8, -32);
      ctx.lineTo(0, -44); // Sharp Tip
      ctx.lineTo(2.8, -32);
      ctx.quadraticCurveTo(7, -26, 0, -20);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 3D Central blood groove / ridge line
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.0;
      ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(0, -42); ctx.stroke();

      // Metallic glint on tip
      if (Math.abs(specularLight) > 0.4) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(0, -38, 2.0, 0, Math.PI * 2); ctx.fill();
      }

    } else if (this.type === 'daggers') {
      // ── 3D CYBER DAGGERS (Twin Plasma Blades) ──
      ctx.shadowBlur = 10 * pulse;
      ctx.shadowColor = '#ec4899';

      // Left Dagger (3D Angle Offset)
      ctx.save();
      ctx.translate(-7 * cosY, 0);
      ctx.rotate(-Math.PI / 10);
      ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 4.2;
      ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(0, 0); ctx.stroke();
      ctx.strokeStyle = '#ec4899'; ctx.lineWidth = 3.0;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(2, -19); ctx.stroke();
      ctx.fillStyle = '#f472b6';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(2, -19); ctx.lineTo(-2.5, -16); ctx.closePath(); ctx.fill();
      ctx.restore();

      // Right Dagger
      ctx.save();
      ctx.translate(7 * cosY, 0);
      ctx.rotate(Math.PI / 10);
      ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 4.2;
      ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(0, 0); ctx.stroke();
      ctx.strokeStyle = '#ec4899'; ctx.lineWidth = 3.0;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-2, -19); ctx.stroke();
      ctx.fillStyle = '#f472b6';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-2, -19); ctx.lineTo(2.5, -16); ctx.closePath(); ctx.fill();
      ctx.restore();

    } else if (this.type === 'hammer') {
      // ── 3D WAR HAMMER (Thunder Mjolnir) ──
      ctx.shadowBlur = 10 * pulse;
      ctx.shadowColor = '#00f0ff';

      // Oak Handle (3D cylinder)
      ctx.strokeStyle = '#1c1917'; ctx.lineWidth = 5.2;
      ctx.beginPath(); ctx.moveTo(0, 26); ctx.lineTo(0, -10); ctx.stroke();
      ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 5.6;
      ctx.beginPath(); ctx.moveTo(0, 26); ctx.lineTo(0, 21); ctx.stroke();

      // Massive Forged Iron 3D Block Hammerhead
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(-15, -28, 30, 18, 3);
      ctx.fill();
      ctx.stroke();

      // 3D Front bevel face highlight
      if (isFrontFace) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-12, -26, 24, 14);
      }

      // Electric Thunder Runes
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-9, -23);
      ctx.lineTo(-4, -19);
      ctx.lineTo(0, -23);
      ctx.lineTo(4, -19);
      ctx.lineTo(9, -23);
      ctx.stroke();
    }

    ctx.restore();
    
    // Floating pickup label badge with animated 3D glow & pulse
    ctx.save();
    ctx.globalAlpha = 0.7 + Math.sin(time * 2.5) * 0.3;
    
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
    } else if (this.type === 'daggers') {
      labelText = '🗡️ CYBER DAGGERS';
      labelColor = '#ec4899';
    } else if (this.type === 'hammer') {
      labelText = '🔨 WAR HAMMER';
      labelColor = '#00f0ff';
    }

    ctx.fillStyle = labelColor;
    ctx.shadowBlur = 5;
    ctx.shadowColor = labelColor;
    ctx.font = '900 10px "Outfit", Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(labelText, this.pos.x, this.pos.y - 26 + bounce);
    ctx.restore();
  }
}
