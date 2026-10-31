// Hệ thống hạt hiệu ứng va chạm, Chữ số sát thương & Hoạt ảnh phép thuật Arcane FX

// --- Tải trước tất cả bộ khung hình FX ---
const arcaneFrames = [];
const deathFXFrames = [];  // 64x64_FX_0..16
const impactFrames = [];   // 32x32_Impact_0..13
const slashFrames = [];    // 32x16_FX_0..7 (cho ArcSlash)

let arcaneFramesLoaded = false;
let deathFXLoaded = false;
let impactLoaded = false;
let slashLoaded = false;

function loadArcaneFrames() {
  if (arcaneFramesLoaded) return;
  arcaneFramesLoaded = true;
  for (let i = 0; i < 17; i++) {
    const img = new Image();
    img.src = `assets/effects/arcane/32x32_Arcane_${i}.png`;
    arcaneFrames.push(img);
  }
}

function loadDeathFXFrames() {
  if (deathFXLoaded) return;
  deathFXLoaded = true;
  for (let i = 0; i <= 16; i++) {
    const img = new Image();
    img.src = `assets/effects/death/64x64_FX_${i}.png`;
    deathFXFrames.push(img);
  }
}

function loadImpactFrames() {
  if (impactLoaded) return;
  impactLoaded = true;
  for (let i = 0; i <= 13; i++) {
    const img = new Image();
    img.src = `assets/effects/impact/32x32_Impact_${i}.png`;
    impactFrames.push(img);
  }
}

export function loadSlashFrames() {
  if (slashLoaded) return;
  slashLoaded = true;
  for (let i = 0; i <= 7; i++) {
    const img = new Image();
    img.src = `assets/effects/slash/32x16_FX_${i}.png`;
    slashFrames.push(img);
  }
}
export { slashFrames };

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.floatingTexts = [];
    // animatedFX: bao gồm cả arcane blast, death burst, impact
    this.animatedFX = [];

    loadArcaneFrames();
    loadDeathFXFrames();
    loadImpactFrames();
    loadSlashFrames();
  }

  // 1. Tạo hiệu ứng va chạm khi đánh trúng (dùng Impact animation)
  createHitSparks(x, y, count = 7) {
    // Thêm 1 animated impact frame (nhỏ)
    this.animatedFX.push({
      type: 'impact',
      x: x,
      y: y,
      scale: 1.4,
      currentFrame: 0,
      frameTime: 0.04,
      timer: 0,
      totalFrames: impactFrames.length || 14
    });

    // Thêm vài hạt nhỏ bổ sung để đẹp hơn
    const sparkCount = Math.max(2, Math.floor(count * 0.4));
    for (let i = 0; i < sparkCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 120 + 40;
      this.particles.push({
        x: x, y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3 + 1.5,
        color: Math.random() > 0.4 ? '#ff70a6' : '#ffffff',
        alpha: 1.0,
        lifespan: Math.random() * 0.22 + 0.12,
        age: 0
      });
    }
  }

  // 2. Tạo hiệu ứng nổ khi quái chết (dùng 64x64 FX animated)
  createDeathBurst(x, y, color = '#a040b0', count = 16) {
    // Hoạt ảnh nổ chính (64x64 FX)
    const scale = count >= 30 ? 4.5 : 2.8; // Scale lớn hơn cho boss/elite
    this.animatedFX.push({
      type: 'death',
      x: x,
      y: y,
      scale: scale,
      currentFrame: 0,
      frameTime: 0.038,
      timer: 0,
      totalFrames: deathFXFrames.length || 17,
      tint: color
    });

    // Hạt bụi màu theo loại quái
    const particleCount = Math.min(count, 20);
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 160 + 40;
      this.particles.push({
        x: x, y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 5 + 2,
        color: color,
        alpha: 1.0,
        lifespan: Math.random() * 0.4 + 0.25,
        age: 0
      });
    }
  }

  // 3. Hoạt ảnh nổ ma thuật Arcane FX (dùng cho elite kill & evolution)
  createArcaneBlast(x, y, scale = 1.8) {
    this.animatedFX.push({
      type: 'arcane',
      x: x,
      y: y,
      scale: scale,
      currentFrame: 0,
      frameTime: 0.035,
      timer: 0,
      totalFrames: arcaneFrames.length || 17
    });
  }

  // 4. Hiển thị chữ số sát thương / né tránh / giáp ảo nảy lên trên đầu đối tượng
  createDamageNumber(x, y, damage, isCrit = false, isTrueDamage = false, isDodge = false, isShieldHit = false, customColor = null, critTier = null) {
    const tier = (critTier !== null) ? critTier : (typeof isCrit === 'number' ? isCrit : (isCrit ? 1 : 0));
    const isCritActive = tier > 0;

    let text = `-${Math.round(damage)}`;
    let color = customColor || '#ffb3c6';
    let strokeColor = '#000000';
    let size = 15;
    let vy = -75;
    let lifespan = 0.65;

    if (isDodge) {
      text = '⚡ NÉ!';
      color = customColor || '#f1f5f9';
      strokeColor = '#475569';
      size = 18;
      vy = -60;
    } else if (isShieldHit) {
      text = `🛡️ -${Math.round(damage)}`;
      color = customColor || '#38bdf8';
      strokeColor = '#0369a1';
      size = 16;
      vy = -80;
    } else if (isTrueDamage) {
      if (tier >= 3) {
        text = `⚡✨CRIT x${tier} ${Math.round(damage)}`;
        color = customColor || '#fde047';
        strokeColor = '#701a75';
        size = 28;
        vy = -120;
        lifespan = 1.2;
      } else if (tier === 2) {
        text = `✨🔥CRIT x2 ${Math.round(damage)}`;
        color = customColor || '#fb7185';
        strokeColor = '#881337';
        size = 25;
        vy = -105;
        lifespan = 1.0;
      } else if (tier === 1) {
        text = `✨CRIT ${Math.round(damage)}`;
        color = customColor || '#c084fc';
        strokeColor = '#581c87';
        size = 22;
        vy = -95;
        lifespan = 0.85;
      } else {
        text = `✨ -${Math.round(damage)}`;
        color = customColor || '#ffffff';
        strokeColor = '#7c3aed';
        size = 20;
        vy = -90;
      }
    } else if (isCritActive) {
      if (tier >= 3) {
        // Chí mạng Cấp 3+ (Mega / Hyper Crit - Tím dạ quang thần thoại)
        text = `⚡CRIT x${tier} ${Math.round(damage)}`;
        color = customColor || '#f0abfc';
        strokeColor = '#4a044e';
        size = 30;
        vy = -125;
        lifespan = 1.25;
      } else if (tier === 2) {
        // Chí mạng Cấp 2 (Super Crit / Double Crit - Đỏ cam lửa rực rỡ)
        text = `🔥CRIT x2 ${Math.round(damage)}`;
        color = customColor || '#ff453a';
        strokeColor = '#450a0a';
        size = 26;
        vy = -110;
        lifespan = 1.05;
      } else {
        // Chí mạng Cấp 1 (Normal Crit - Vàng kim rực rỡ)
        text = `💥CRIT ${Math.round(damage)}`;
        color = customColor || '#ffdd00';
        strokeColor = '#990022';
        size = 21;
        vy = -95;
        lifespan = 0.85;
      }
    }

    this.floatingTexts.push({
      x: x + (Math.random() - 0.5) * 20,
      y: y - 10,
      text: text,
      vy: vy,
      alpha: 1.0,
      lifespan: lifespan,
      age: 0,
      color: color,
      strokeColor: strokeColor,
      size: size,
      isCrit: isCritActive,
      critTier: tier
    });
  }

  update(delta) {
    // Cập nhật hạt
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += delta;
      if (p.age >= p.lifespan) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.alpha = 1.0 - (p.age / p.lifespan);
    }

    // Cập nhật chữ số sát thương
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.age += delta;
      if (ft.age >= ft.lifespan) {
        this.floatingTexts.splice(i, 1);
        continue;
      }
      ft.y += ft.vy * delta;
      ft.alpha = 1.0 - (ft.age / ft.lifespan);
    }

    // Cập nhật tất cả hoạt ảnh FX
    for (let i = this.animatedFX.length - 1; i >= 0; i--) {
      const fx = this.animatedFX[i];
      fx.timer += delta;
      if (fx.timer >= fx.frameTime) {
        fx.timer -= fx.frameTime;
        fx.currentFrame++;
        if (fx.currentFrame >= fx.totalFrames) {
          this.animatedFX.splice(i, 1);
        }
      }
    }
  }

  render(ctx, camera) {
    ctx.save();

    // 1. Vẽ tất cả hoạt ảnh FX (death, arcane, impact)
    for (const fx of this.animatedFX) {
      const screen = camera.worldToScreen(fx.x, fx.y);
      let frames, frameW, frameH;

      if (fx.type === 'arcane') {
        frames = arcaneFrames;
        frameW = 32; frameH = 32;
      } else if (fx.type === 'death') {
        frames = deathFXFrames;
        frameW = 64; frameH = 64;
      } else if (fx.type === 'impact') {
        frames = impactFrames;
        frameW = 32; frameH = 32;
      } else {
        continue;
      }

      const img = frames[Math.min(fx.currentFrame, frames.length - 1)];
      if (img && img.complete && img.naturalWidth > 0) {
        const drawW = frameW * fx.scale;
        const drawH = frameH * fx.scale;
        ctx.drawImage(img, screen.x - drawW / 2, screen.y - drawH / 2, drawW, drawH);
      }
    }

    // 2. Vẽ hạt bụi sáng
    for (const p of this.particles) {
      const screen = camera.worldToScreen(p.x, p.y);
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;

    // 3. Vẽ chữ số sát thương
    ctx.textAlign = 'center';
    for (const ft of this.floatingTexts) {
      const screen = camera.worldToScreen(ft.x, ft.y);
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.font = `bold ${ft.size}px monospace`;
      ctx.strokeStyle = ft.strokeColor || '#000000';
      ctx.lineWidth = ft.critTier >= 2 ? 5 : (ft.isCrit ? 4 : 3);

      if (ft.critTier >= 2) {
        ctx.shadowColor = ft.color;
        ctx.shadowBlur = 12;
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.strokeText(ft.text, screen.x, screen.y);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, screen.x, screen.y);
    }
    ctx.shadowBlur = 0;

    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
