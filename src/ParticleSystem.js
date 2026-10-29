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

  // 4. Hiển thị chữ số sát thương nảy lên trên đầu quái
  createDamageNumber(x, y, damage, isCrit = false) {
    this.floatingTexts.push({
      x: x + (Math.random() - 0.5) * 20,
      y: y - 10,
      text: isCrit ? `💥CRIT ${Math.round(damage)}` : `-${Math.round(damage)}`,
      vy: isCrit ? -95 : -75,
      alpha: 1.0,
      lifespan: isCrit ? 0.85 : 0.65,
      age: 0,
      color: isCrit ? '#ffdd00' : '#ffb3c6',
      strokeColor: isCrit ? '#990022' : '#000000',
      size: isCrit ? 19 : 14,
      isCrit: isCrit
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
      ctx.lineWidth = ft.isCrit ? 4 : 3;
      ctx.strokeText(ft.text, screen.x, screen.y);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, screen.x, screen.y);
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
