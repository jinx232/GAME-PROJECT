import { useEffect, useRef } from 'react';

export default function MenuBackgroundCanvas({ p1Color = '#00f0ff', p2Color = '#ec4899' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let time = 0;

    // Fixed 60 FPS frame rate locking
    let lastFrameTime = performance.now();
    const targetFPS = 60;
    const frameInterval = 1000 / targetFPS;

    // Mouse parallax tracking
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;

    const handleMouseMove = (e) => {
      targetMouseX = (e.clientX / window.innerWidth - 0.5) * 35;
      targetMouseY = (e.clientY / window.innerHeight - 0.5) * 20;
    };
    window.addEventListener('mousemove', handleMouseMove);

    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Realistic Sakura Cherry Blossom Petals (No Rectangles)
    const sakuraPetals = Array.from({ length: 55 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 4.5 + 2,
      vx: Math.random() * 0.6 + 0.2,
      vy: Math.random() * 0.8 + 0.4,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.05,
      alpha: Math.random() * 0.7 + 0.3,
      color: Math.random() > 0.4 ? '#f472b6' : (Math.random() > 0.5 ? '#00f0ff' : '#fbbf24')
    }));

    // Shockwaves (Circular Ovals)
    let shockwaves = [];
    const triggerShockwave = (x, y, color) => {
      shockwaves.push({ x, y, radius: 4, maxRadius: 90, alpha: 0.8, color });
    };

    // Main 60 FPS Locked Render Loop (Organic Zen Style - 0 Gradients, 0 Rectangles)
    const render = (now) => {
      animId = requestAnimationFrame(render);

      const elapsed = now - lastFrameTime;
      if (elapsed < frameInterval) return;
      lastFrameTime = now - (elapsed % frameInterval);

      time += 0.025;

      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const w = canvas.width;
      const h = canvas.height;
      const centerY = h * 0.70 + mouseY * 0.4;
      const originX = w * 0.5 + mouseX;

      // ─── 1. SOLID MATTE ZEN SKY (NO GRADIENTS, NO RECTANGLES) ───
      ctx.fillStyle = '#050c09';
      ctx.fillRect(0, 0, w, h);

      // Organic Full Moon
      ctx.save();
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(originX, h * 0.28, 65, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // ─── 2. ROLLING MOUNTAIN SILHOUETTES (ORGANIC CURVES) ───
      ctx.save();
      ctx.fillStyle = '#06130f';
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(0, centerY - 140);
      ctx.quadraticCurveTo(w * 0.25, centerY - 210, originX, centerY - 130);
      ctx.quadraticCurveTo(w * 0.75, centerY - 200, w, centerY - 120);
      ctx.lineTo(w, centerY);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // ─── 3. ARCHING WOODEN ZEN BRIDGE & BAMBOO SILHOUETTES ───
      ctx.save();
      // Zen Arch Bridge
      ctx.strokeStyle = '#2d0a0a';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(originX, centerY + 130, 210, -Math.PI * 0.82, -Math.PI * 0.18);
      ctx.stroke();

      // Vertical handrail posts (rounded curves)
      ctx.lineWidth = 3.5;
      for (let angle = -Math.PI * 0.78; angle <= -Math.PI * 0.22; angle += 0.12) {
        const px = originX + Math.cos(angle) * 210;
        const py = (centerY + 130) + Math.sin(angle) * 210;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px, py - 24);
        ctx.stroke();
      }

      // Swaying Bamboo Stalks
      const drawBamboo = (bx, bw, bh) => {
        const sway = Math.sin(time * 1.2 + bx * 0.02) * 8;
        ctx.fillStyle = '#09211a';
        ctx.beginPath();
        ctx.moveTo(bx - bw * 0.5, centerY);
        ctx.quadraticCurveTo(bx + sway * 0.5, centerY - bh * 0.5, bx + sway, centerY - bh);
        ctx.lineTo(bx + sway + bw, centerY - bh);
        ctx.quadraticCurveTo(bx + bw * 0.5 + sway * 0.5, centerY - bh * 0.5, bx + bw * 0.5, centerY);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#0f382a';
        for (let ly = centerY - 50; ly >= centerY - bh; ly -= 45) {
          const leafX = bx + (ly - (centerY - bh)) * (sway / bh);
          ctx.beginPath();
          ctx.ellipse(leafX - 12, ly, 16, 4, -0.4, 0, Math.PI * 2);
          ctx.ellipse(leafX + 16, ly - 5, 14, 3, 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
      };

      drawBamboo(w * 0.08, 8, 280);
      drawBamboo(w * 0.15, 6, 240);
      drawBamboo(w * 0.85, 8, 290);
      drawBamboo(w * 0.92, 6, 250);
      ctx.restore();

      // ─── 4. SOLID COMBED SANDBED & MOSSY STEPPING STONES (NO RECTANGLES) ───
      ctx.save();
      ctx.fillStyle = '#0a231b';
      ctx.fillRect(0, centerY, w, h - centerY);

      // Combed Sand Wave Lines (Organic Smooth Curves)
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.22)';
      ctx.lineWidth = 2.2;
      for (let y = centerY + 20; y < h; y += 16) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.quadraticCurveTo(originX, y + Math.sin(time + y) * 3, w, y);
        ctx.stroke();
      }

      // Mossy Stepping Stone Ovals
      ctx.fillStyle = '#292524';
      ctx.strokeStyle = '#1c1917';
      ctx.lineWidth = 2;
      for (let sx = 80; sx < w; sx += 160) {
        const sy = centerY + 35 + Math.sin(sx) * 6;
        ctx.beginPath();
        ctx.ellipse(sx, sy, 28, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#16a34a';
        ctx.beginPath();
        ctx.ellipse(sx, sy - 2, 20, 5, 0, Math.PI, 0, false);
        ctx.fill();
        ctx.fillStyle = '#292524';
      }
      ctx.restore();

      // ─── 5. ANIMATED SHADOW BOXING FIGHT DEMO ───
      const animCycle = (time * 0.55) % (Math.PI * 4);
      const cyclePhase = Math.floor(animCycle / Math.PI);

      const p1X = originX - w * 0.24;
      const p2X = originX + w * 0.24;
      const scale = Math.min(1.2, w / 750);

      if (Math.abs(Math.sin(animCycle * 2)) > 0.98 && shockwaves.length < 3) {
        triggerShockwave(p1X + (cyclePhase % 2 === 0 ? 40 : -40), centerY - 30, cyclePhase % 2 === 0 ? p1Color : p2Color);
      }

      const drawAnimatedFighter = (x, y, color, dir, isP1) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(dir * scale, scale);

        const localTime = time * 2;
        let headY = -70;
        let neckY = -55;
        let pelvisY = -30;
        let rHand = { x: 18, y: -45 };
        let lHand = { x: -12, y: -42 };
        let rFoot = { x: 14, y: 0 };
        let lFoot = { x: -14, y: 0 };

        if (isP1) {
          if (cyclePhase === 0) {
            pelvisY += 5;
            rHand = { x: 42 * Math.sin(localTime), y: -30 - Math.cos(localTime) * 20 };
            lHand = { x: 20, y: -35 };
            rFoot = { x: 26, y: 0 };
          } else if (cyclePhase === 1) {
            const spinAngle = localTime * 2;
            rHand = { x: Math.cos(spinAngle) * 35, y: -45 + Math.sin(spinAngle) * 15 };
            lHand = { x: -Math.cos(spinAngle) * 35, y: -45 - Math.sin(spinAngle) * 15 };
          } else {
            rFoot = { x: 48, y: -45 };
            rHand = { x: -15, y: -50 };
          }
        } else {
          if (cyclePhase === 2) {
            const charge = Math.sin(localTime);
            rHand = { x: 25 + charge * 10, y: -48 };
            lHand = { x: 15 + charge * 10, y: -48 };

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(35, -48, 9 + Math.sin(localTime * 4) * 3, 0, Math.PI * 2);
            ctx.fill();
          } else {
            headY -= Math.sin(localTime) * 3;
            rHand = { x: 10, y: -55 };
            lHand = { x: 5, y: -50 };
          }
        }

        // Contact Shadow Oval
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 26, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Limbs & Bones
        ctx.strokeStyle = color;
        ctx.lineWidth = 6.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(-8, pelvisY);
        ctx.lineTo(lFoot.x * 0.5 - 6, (lFoot.y + pelvisY) * 0.5);
        ctx.lineTo(lFoot.x, lFoot.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(8, pelvisY);
        ctx.lineTo(rFoot.x * 0.5 + 6, (rFoot.y + pelvisY) * 0.5);
        ctx.lineTo(rFoot.x, rFoot.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, pelvisY);
        ctx.lineTo(0, neckY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, neckY + 4);
        ctx.lineTo(lHand.x * 0.5, (lHand.y + neckY) * 0.5);
        ctx.lineTo(lHand.x, lHand.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, neckY + 4);
        ctx.lineTo(rHand.x * 0.5, (rHand.y + neckY) * 0.5);
        ctx.lineTo(rHand.x, rHand.y);
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, headY, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      };

      // Floor Mirror Reflection Pass
      ctx.save();
      ctx.globalAlpha = 0.2;
      ctx.translate(0, centerY * 2);
      ctx.scale(1, -0.45);
      drawAnimatedFighter(p1X, centerY, p1Color, 1, true);
      drawAnimatedFighter(p2X, centerY, p2Color, -1, false);
      ctx.restore();

      // Main Upright Fighters
      drawAnimatedFighter(p1X, centerY, p1Color, 1, true);
      drawAnimatedFighter(p2X, centerY, p2Color, -1, false);

      // ─── 6. SHOCKWAVES & FALLING PETALS ───
      shockwaves.forEach((sw, idx) => {
        sw.radius += 2.4;
        sw.alpha *= 0.93;
        ctx.save();
        ctx.strokeStyle = sw.color;
        ctx.globalAlpha = sw.alpha;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(sw.x, sw.y, sw.radius, sw.radius * 0.35, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        if (sw.alpha < 0.05) shockwaves.splice(idx, 1);
      });

      sakuraPetals.forEach(sp => {
        sp.x += sp.vx + mouseX * 0.015;
        sp.y += sp.vy;
        sp.rotation += sp.rotSpeed;

        if (sp.y > h) {
          sp.y = -10;
          sp.x = Math.random() * w;
        }
        if (sp.x > w) sp.x = 0;

        ctx.save();
        ctx.translate(sp.x, sp.y);
        ctx.rotate(sp.rotation);
        ctx.fillStyle = sp.color;
        ctx.globalAlpha = sp.alpha;
        ctx.beginPath();
        ctx.ellipse(0, 0, sp.size, sp.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    };

    animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
    };
  }, [p1Color, p2Color]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
    />
  );
}
