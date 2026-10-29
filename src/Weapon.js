import { PlayerProjectile } from './Projectile.js';
import { slashFrames, loadSlashFrames } from './ParticleSystem.js';

// Đảm bảo slash frames đã được load
loadSlashFrames();

// =========================================================================
// CACHE HÌNH ẢNH SPRITE VŨ KHÍ & HIỆU ỨNG TỪ ASSET 1 & 2
// =========================================================================
const WEAPON_SPRITES = {};
function getWeaponSprite(src) {
  if (!WEAPON_SPRITES[src]) {
    const img = new Image();
    img.src = src;
    WEAPON_SPRITES[src] = img;
  }
  return WEAPON_SPRITES[src];
}

// Tải vòng tròn hiệu ứng ma thuật 32x32 cho PoolZone từ asset1
const circleEffectFrames = [];
for (let i = 0; i <= 13; i++) {
  const img = new Image();
  img.src = `assets/effects/circle/32x32_Circle_${i}.png`;
  circleEffectFrames.push(img);
}

// Tải các frame hiệu ứng Aura 64x64 (dùng cho HolyAura)
const auraFrames = [];
for (let i = 0; i <= 9; i++) {
  const img = new Image();
  img.src = `assets/effects/aura/64x64_Aura_${i}.png`;
  auraFrames.push(img);
}

// Bảng chi tiết mô tả tăng cấp theo từng cấp độ cho từng loại vũ khí (Cấp 1 -> Cấp 7)
export const WEAPON_UPGRADE_DETAILS = {
  main_sword: {
    2: '+2 Kiếm phóng ra cùng lúc',
    3: 'Tăng lên 4 Kiếm phóng ra cùng lúc',
    4: '+30% Sát thương kiếm',
    5: '-25% Thời gian hồi chiêu',
    6: '+30% Tầm quét kẻ địch',
    7: 'Quét bão kiếm xung quanh, đẩy lùi 20% và gây Xuất Huyết (Bleed) rút máu liên tục'
  },
  orbiting_blades: {
    2: '-30% Hồi chiêu (Tốc độ xoay +30%)',
    3: '+30% Kích thước kiếm xoay',
    4: '+20% Sát thương',
    5: 'Tăng số lượng kiếm lên 2 lưỡi kiếm',
    6: 'Tăng số lượng kiếm lên 3 lưỡi kiếm',
    7: '-30% Hồi chiêu & +20% Sát thương'
  },
  holy_aura: {
    2: '+30% Kích thước hào quang',
    3: 'Làm chậm tốc độ quái vật 20%',
    4: '+20% Sát thương hào quang',
    5: 'Mở rộng thêm +20% vùng ngoài (không làm chậm)',
    6: '+20% Sát thương hào quang',
    7: 'Sát thương lập 2 lần trong 1 nhịp'
  },
  pool_zone: {
    2: 'Tăng số lượng lên 2 vùng dung nham',
    3: '+30% Kích thước vùng dung nham',
    4: '+20% Sát thương thiêu đốt',
    5: '-30% Thời gian hồi chiêu',
    6: 'Tăng số lượng lên 3 vùng dung nham',
    7: 'Gây hiệu ứng thiêu đốt kéo dài 5s (sát thương = 20% sát thương zone)'
  },
  piercing_needle: {
    2: 'Tăng số lượng lên 2 phi kiếm',
    3: 'Tăng số lượng lên 3 phi kiếm',
    4: '-30% Thời gian hồi chiêu',
    5: '+20% Sát thương xuyên thấu',
    6: 'Đẩy lùi quái vật 20% khi trúng đòn',
    7: '+40% Kích thước phi kiếm xuyên thấu'
  },
  boomerang: {
    2: 'Tăng số lượng lên 2 rìu bay',
    3: 'Tăng số lượng lên 3 rìu bay',
    4: '+20% Sát thương rìu lửa',
    5: '+30% Kích thước rìu lửa',
    6: '+50% Tầm bay xa của rìu',
    7: 'Rìu bay thêm 1 lượt nữa trước khi biến mất'
  },
  arc_slash: {
    2: '+30% Bán kính nhát chém',
    3: 'Làm chậm quái vật 20%',
    4: '-30% Thời gian hồi chiêu',
    5: 'Đẩy lùi quái vật 20%',
    6: '+20% Tốc độ vung đòn',
    7: 'Trảm kích kép liên hoàn 2 lần liên tiếp'
  }
};

// =========================================================================
// 1. VŨ KHÍ CHÍNH: KIẾM PHA LÊ HỒNG (MAIN WEAPON)
// =========================================================================
export class MainSwordWeapon {
  constructor() {
    this.id = 'main_sword';
    this.name = 'Kiếm Pha Lê Hồng';
    this.icon = 'assets/icons/sword_main.png';
    this.desc = 'Phóng kiếm pha lê tự động găm vào kẻ địch gần nhất.';
    this.level = 1;
    this.maxLevel = 7;
    this.type = 'attack';

    // Chỉ số cơ bản
    this.baseDamage = 32;
    this.damage = 32;
    this.cooldown = 0.85;
    this.timer = 0.2;
    this.range = 480;
    this.projectileCount = 1;
    this.pierce = 2;
    this.hasSlashAura = false; // Mở khóa ở cấp 7
  }

  upgrade() {
    if (this.level >= this.maxLevel) return;
    this.level++;

    switch (this.level) {
      case 2:
        this.projectileCount = 2; // Tăng phóng thêm kiếm
        break;
      case 3:
        this.projectileCount = 4; // Tăng lên 4 kiếm
        break;
      case 4:
        this.damage = Math.round(this.baseDamage * 1.30); // Tăng 30% dmg
        break;
      case 5:
        this.cooldown *= 0.75; // Giảm 25% cooldown
        break;
      case 6:
        this.range *= 1.30; // Tăng cự ly quét quái 30%
        break;
      case 7:
        // Cấp 7: Quẹt 1 đường kiếm vòng tròn xung quanh người trước khi phóng
        this.hasSlashAura = true;
        break;
    }
  }

  update(delta, player, enemies, spawnProjCb, particles, dmgMult, onEnemyKill) {
    this.timer -= delta;

    if (this.timer <= 0) {
      const validEnemies = [];
      for (const enemy of enemies) {
        if (enemy.isDead) continue;
        const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
        if (dist <= this.range) {
          validEnemies.push({ enemy, dist });
        }
      }

      if (validEnemies.length > 0) {
        validEnemies.sort((a, b) => a.dist - b.dist);

        // Hiệu ứng Cấp 7: Quẹt kiếm vòng tròn xung quanh người chơi
        if (this.hasSlashAura) {
          const slashRadius = 140;
          const baseSlashDmg = this.damage * dmgMult * 3.5;

          // Tạo vòng chém hào quang
          particles.createHitSparks(player.x, player.y, 16);

          for (const e of enemies) {
            if (e.isDead) continue;
            const d = Math.hypot(e.x - player.x, e.y - player.y);
            if (d <= slashRadius + e.getHitboxRadius()) {
              const { damage: slashDmg, isCrit } = player.rollDamage ? player.rollDamage(baseSlashDmg) : { damage: baseSlashDmg, isCrit: false };
              e.takeDamage(slashDmg);
              particles.createDamageNumber(e.x, e.y, slashDmg, isCrit);
              // Đẩy lùi 20%
              const push = 35;
              e.x += ((e.x - player.x) / (d || 1)) * push;
              e.y += ((e.y - player.y) / (d || 1)) * push;
              // DOT Xuất huyết (Bleed)
              e.bleedTimer = 5.0;
              e.bleedStacks = Math.min(10, (e.bleedStacks || 0) + 1);

              if (e.isDead && onEnemyKill) {
                particles.createDeathBurst(e.x, e.y, e.config.color || '#a040b0');
                onEnemyKill(e);
              }
            }
          }
        }

        // Phóng các thanh kiếm
        for (let i = 0; i < this.projectileCount; i++) {
          const target = validEnemies[i % validEnemies.length].enemy;
          const spread = (i - (this.projectileCount - 1) / 2) * 16;
          const proj = new PlayerProjectile(
            player.x,
            player.y,
            target.x + spread,
            target.y + spread,
            this.damage * dmgMult,
            this.pierce,
            player
          );
          spawnProjCb(proj);
        }

        this.timer = this.cooldown;
      } else {
        this.timer = 0.05;
      }
    }
  }

  render(ctx, camera, player) {
    // Nếu có aura cấp 7, vẽ vòng xoáy kiếm nhẹ quanh người
    if (this.hasSlashAura && !player.isDead) {
      const p = camera.worldToScreen(player.x, player.y);
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 120, 180, 0.25)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 140, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

// =========================================================================
// 2. VŨ KHÍ TẤN CÔNG VÒNG TRÒN XOAY QUANH NGƯỜI (ORBITING BLADES)
// =========================================================================
export class OrbitingBladesWeapon {
  constructor() {
    this.id = 'orbiting_blades';
    this.name = 'Vành Đai Kiếm Khí';
    this.icon = 'assets/icons/sword_orbit.png';
    this.desc = 'Các lưỡi kiếm ma thuật liên tục xoay tròn bảo vệ xung quanh.';
    this.level = 1;
    this.maxLevel = 7;
    this.type = 'attack';

    this.damage = 18;
    this.count = 1;
    this.radius = 95;
    this.speed = 3.2; // Tốc độ góc
    this.angle = 0;
    this.cooldownFactor = 1.0;
    this.bladeSize = 24;
    this.hitCooldowns = new Map();
  }

  upgrade() {
    if (this.level >= this.maxLevel) return;
    this.level++;

    switch (this.level) {
      case 2:
        this.speed *= 1.30; // Giảm cooldown/tăng tốc độ xoay 30%
        break;
      case 3:
        this.bladeSize *= 1.30; // Tăng kích thước 30%
        break;
      case 4:
        this.damage = Math.round(this.damage * 1.20); // Tăng 20% dmg
        break;
      case 5:
        this.count = 2; // Tăng số lượng lên 2
        break;
      case 6:
        this.count = 3; // Tăng số lượng lên 3
        break;
      case 7:
        this.speed *= 1.30;
        this.damage = Math.round(this.damage * 1.20);
        break;
    }
  }

  update(delta, player, enemies, spawnProjCb, particles, dmgMult, onEnemyKill) {
    this.angle += this.speed * delta;

    // Giảm thời gian chờ va chạm với quái
    for (const [enemy, timer] of this.hitCooldowns.entries()) {
      if (timer - delta <= 0) {
        this.hitCooldowns.delete(enemy);
      } else {
        this.hitCooldowns.set(enemy, timer - delta);
      }
    }

    // Kiểm tra va chạm giữa từng lưỡi kiếm xoay và quái vật
    for (let i = 0; i < this.count; i++) {
      const bladeAngle = this.angle + (i * Math.PI * 2) / this.count;
      const bladeX = player.x + Math.cos(bladeAngle) * this.radius;
      const bladeY = player.y + Math.sin(bladeAngle) * this.radius;

      for (const enemy of enemies) {
        if (enemy.isDead || this.hitCooldowns.has(enemy)) continue;

        const dist = Math.hypot(bladeX - enemy.x, bladeY - enemy.y);
        if (dist <= this.bladeSize + enemy.getHitboxRadius()) {
          const rawDmg = this.damage * dmgMult;
          const { damage: actualDmg, isCrit } = player.rollDamage ? player.rollDamage(rawDmg) : { damage: rawDmg, isCrit: false };
          enemy.takeDamage(actualDmg);
          particles.createHitSparks(bladeX, bladeY, isCrit ? 10 : 6);
          particles.createDamageNumber(enemy.x, enemy.y, actualDmg, isCrit);

          this.hitCooldowns.set(enemy, 0.35); // 0.35s sau mới trúng tiếp

          if (enemy.isDead && onEnemyKill) {
            particles.createDeathBurst(enemy.x, enemy.y, enemy.config.color || '#a040b0');
            onEnemyKill(enemy);
          }
        }
      }
    }
  }

  render(ctx, camera, player) {
    if (player.isDead) return;

    const bladeImg = getWeaponSprite('assets/weapons/sword_serrated_single.png');

    ctx.save();
    for (let i = 0; i < this.count; i++) {
      const bladeAngle = this.angle + (i * Math.PI * 2) / this.count;
      const worldX = player.x + Math.cos(bladeAngle) * this.radius;
      const worldY = player.y + Math.sin(bladeAngle) * this.radius;
      const screenPos = camera.worldToScreen(worldX, worldY);

      ctx.save();
      ctx.translate(screenPos.x, screenPos.y);
      ctx.rotate(bladeAngle + Math.PI / 2);

      const drawW = this.bladeSize * 0.9;
      const drawH = this.bladeSize * 2.2;

      if (bladeImg && bladeImg.complete && bladeImg.naturalWidth > 0) {
        ctx.drawImage(bladeImg, -drawW / 2, -drawH / 2, drawW, drawH);
      } else {
        // Fallback
        ctx.fillStyle = '#ff70a6';
        ctx.fillRect(-drawW / 2, -drawH / 2, drawW, drawH);
      }

      ctx.restore();
    }
    ctx.restore();
  }
}

// =========================================================================
// 3. VŨ KHÍ DẠNG VÙNG XUNG QUANH (ALWAYS-ACTIVE AURA)
// =========================================================================
export class HolyAuraWeapon {
  constructor() {
    this.id = 'holy_aura';
    this.name = 'Hào Quang Thánh Địa';
    this.icon = 'assets/icons/holy_aura.png';
    this.desc = 'Tạo vùng năng lượng thường trực quanh người thiêu đốt quái vật.';
    this.level = 1;
    this.maxLevel = 7;
    this.type = 'attack';

    this.radius = 120;
    this.damage = 12;
    this.tickInterval = 0.5;
    this.tickTimer = 0.5;
    this.slowEffect = 0; // Làm chậm
    this.outerRadius = 0;
    this.doubleStrike = false;

    // Hoạt ảnh hiệu ứng aura vòng quanh
    this.auraAnimFrame = 0;
    this.auraAnimTimer = 0;
    this.AURA_FRAME_TIME = 0.08; // 80ms mỗi frame = 12fps
    this.AURA_TOTAL_FRAMES = 10;
  }

  upgrade() {
    if (this.level >= this.maxLevel) return;
    this.level++;

    switch (this.level) {
      case 2:
        this.radius *= 1.30;
        break;
      case 3:
        this.slowEffect = 0.20; // Làm chậm 20%
        break;
      case 4:
        this.damage = Math.round(this.damage * 1.20);
        break;
      case 5:
        this.outerRadius = this.radius * 1.20; // Vùng ngoài mở rộng thêm 20%
        break;
      case 6:
        this.damage = Math.round(this.damage * 1.20);
        break;
      case 7:
        this.doubleStrike = true; // Sát thương lặp 2 lần trong 1 lần tick
        break;
    }
  }

  update(delta, player, enemies, spawnProjCb, particles, dmgMult, onEnemyKill) {
    this.tickTimer -= delta;

    // Cập nhật frame hoạt ảnh aura
    this.auraAnimTimer += delta;
    if (this.auraAnimTimer >= this.AURA_FRAME_TIME) {
      this.auraAnimTimer -= this.AURA_FRAME_TIME;
      this.auraAnimFrame = (this.auraAnimFrame + 1) % this.AURA_TOTAL_FRAMES;
    }

    // Áp dụng làm chậm quái
    if (this.slowEffect > 0) {
      for (const e of enemies) {
        if (e.isDead) continue;
        const dist = Math.hypot(e.x - player.x, e.y - player.y);
        if (dist <= this.radius + e.getHitboxRadius()) {
          e.slowTimer = 0.2;
          e.speedMultiplier = 1.0 - this.slowEffect;
        }
      }
    }

    if (this.tickTimer <= 0) {
      this.tickTimer = this.tickInterval;
      const totalR = this.outerRadius > 0 ? this.outerRadius : this.radius;

      for (const e of enemies) {
        if (e.isDead) continue;
        const dist = Math.hypot(e.x - player.x, e.y - player.y);
        if (dist <= totalR + e.getHitboxRadius()) {
          const rawDmg = this.damage * dmgMult;
          const { damage: dmg, isCrit } = player.rollDamage ? player.rollDamage(rawDmg) : { damage: rawDmg, isCrit: false };
          e.takeDamage(dmg);
          particles.createHitSparks(e.x, e.y, isCrit ? 8 : 4);
          particles.createDamageNumber(e.x, e.y, dmg, isCrit);

          if (this.doubleStrike && !e.isDead) {
            const rolled2 = player.rollDamage ? player.rollDamage(rawDmg) : { damage: rawDmg, isCrit: false };
            e.takeDamage(rolled2.damage);
            particles.createDamageNumber(e.x, e.y - 12, rolled2.damage, rolled2.isCrit);
          }

          if (e.isDead && onEnemyKill) {
            particles.createDeathBurst(e.x, e.y, e.config.color || '#a040b0');
            onEnemyKill(e);
          }
        }
      }
    }
  }

  render(ctx, camera, player) {
    if (player.isDead) return;

    const p = camera.worldToScreen(player.x, player.y);
    ctx.save();

    // Vẽ animated aura frame (64x64) scale lên theo bán kính
    const auraImg = auraFrames[this.auraAnimFrame];
    const auraDrawSize = this.radius * 2.1; // vẽ hơi to hơn bán kính 1 chút
    if (auraImg && auraImg.complete && auraImg.naturalWidth > 0) {
      ctx.globalAlpha = 0.65;
      ctx.drawImage(auraImg, p.x - auraDrawSize / 2, p.y - auraDrawSize / 2, auraDrawSize, auraDrawSize);
      ctx.globalAlpha = 1;
    } else {
      // Fallback gradient khi chưa tải xong
      const grad = ctx.createRadialGradient(p.x, p.y, 10, p.x, p.y, this.radius);
      grad.addColorStop(0, 'rgba(255, 230, 100, 0.05)');
      grad.addColorStop(0.7, 'rgba(255, 200, 50, 0.12)');
      grad.addColorStop(1, 'rgba(255, 180, 0, 0.35)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Viền hào quang mờ
    ctx.strokeStyle = 'rgba(255, 220, 80, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();

    // Vùng mở rộng cấp 5 (nếu có)
    if (this.outerRadius > 0) {
      ctx.strokeStyle = 'rgba(255, 240, 160, 0.25)';
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(p.x, p.y, this.outerRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }
}

// =========================================================================
// 4. VŨ KHÍ NÉM ZONE GÂY SÁT THƯƠNG LIÊN TỤC (DAMAGE POOL ZONE)
// =========================================================================
export class PoolZoneWeapon {
  constructor() {
    this.id = 'pool_zone';
    this.name = 'Dung Nham Ma Thuật';
    this.icon = 'assets/icons/pool_zone.png';
    this.desc = 'Ném ra các vũng dung nham thiêu đốt quái vật đứng bên trong.';
    this.level = 1;
    this.maxLevel = 7;
    this.type = 'attack';

    this.cooldown = 2.8;
    this.timer = 1.0;
    this.poolCount = 1;
    this.radius = 70;
    this.damage = 16;
    this.duration = 4.0;
    this.hasDot = false; // Cấp 7
    this.activePools = [];
  }

  upgrade() {
    if (this.level >= this.maxLevel) return;
    this.level++;

    switch (this.level) {
      case 2:
        this.poolCount = 2; // Tăng lên 2 zone
        break;
      case 3:
        this.radius *= 1.30; // Tăng kích thước 30%
        break;
      case 4:
        this.damage = Math.round(this.damage * 1.20);
        break;
      case 5:
        this.cooldown *= 0.70; // Giảm cooldown 30%
        break;
      case 6:
        this.poolCount = 3; // Tăng lên 3 zone
        break;
      case 7:
        this.hasDot = true; // Gây thêm DOT 5s sau khi rời zone
        break;
    }
  }

  update(delta, player, enemies, spawnProjCb, particles, dmgMult, onEnemyKill) {
    this.timer -= delta;

    if (this.timer <= 0) {
      this.timer = this.cooldown;

      // Ném ra các zone gần quái
      for (let i = 0; i < this.poolCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 220 + 80;
        this.activePools.push({
          x: player.x + Math.cos(angle) * dist,
          y: player.y + Math.sin(angle) * dist,
          radius: this.radius,
          damage: this.damage * dmgMult,
          duration: this.duration,
          tickTimer: 0.35,
          life: this.duration
        });
      }
    }

    // Cập nhật các zone đang hoạt động
    for (let i = this.activePools.length - 1; i >= 0; i--) {
      const pool = this.activePools[i];
      pool.life -= delta;
      pool.tickTimer -= delta;

      if (pool.tickTimer <= 0) {
        pool.tickTimer = 0.35;
        for (const e of enemies) {
          if (e.isDead) continue;
          const d = Math.hypot(e.x - pool.x, e.y - pool.y);
          if (d <= pool.radius + e.getHitboxRadius()) {
            const { damage: poolDmg, isCrit } = player.rollDamage ? player.rollDamage(pool.damage) : { damage: pool.damage, isCrit: false };
            e.takeDamage(poolDmg);
            particles.createHitSparks(e.x, e.y, isCrit ? 8 : 4);
            particles.createDamageNumber(e.x, e.y, poolDmg, isCrit);

            if (this.hasDot) {
              e.zoneDotTimer = 5.0;
              e.zoneDotDmg = pool.damage * 0.20;
            }

            if (e.isDead && onEnemyKill) {
              particles.createDeathBurst(e.x, e.y, e.config.color || '#a040b0');
              onEnemyKill(e);
            }
          }
        }
      }

      if (pool.life <= 0) {
        this.activePools.splice(i, 1);
      }
    }
  }

  render(ctx, camera) {
    ctx.save();
    for (const pool of this.activePools) {
      const p = camera.worldToScreen(pool.x, pool.y);
      const alpha = Math.min(1.0, pool.life / 0.5);

      // Frame hoạt ảnh Circle ma thuật theo thời gian sống
      const animIndex = Math.floor((pool.duration - pool.life) * 8) % circleEffectFrames.length;
      const circleImg = circleEffectFrames[animIndex];

      if (circleImg && circleImg.complete && circleImg.naturalWidth > 0) {
        ctx.save();
        ctx.globalAlpha = alpha * 0.85;
        const drawDiam = pool.radius * 2.3;
        ctx.drawImage(circleImg, p.x - drawDiam / 2, p.y - drawDiam / 2, drawDiam, drawDiam);
        ctx.restore();
      }

      // Vòng sáng ma thuật nền
      ctx.fillStyle = `rgba(255, 75, 45, ${alpha * 0.22})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, pool.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(255, 140, 60, ${alpha * 0.6})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  }
}

// =========================================================================
// 5. VŨ KHÍ PHÓNG: TIÊU XUYÊN THẤU (PIERCING NEEDLE)
// =========================================================================
export class PiercingNeedleWeapon {
  constructor() {
    this.id = 'piercing_needle';
    this.name = 'Ám Khí Xuyên Thấu';
    this.icon = 'assets/icons/needle.png';
    this.desc = 'Phóng phi kim ma thuật xuyên qua hàng loạt quái vật.';
    this.level = 1;
    this.maxLevel = 7;
    this.type = 'attack';

    this.damage = 18;
    this.cooldown = 1.1;
    this.timer = 0.4;
    this.count = 1;
    this.sizeScale = 1.0;
    this.knockback = 0;
  }

  upgrade() {
    if (this.level >= this.maxLevel) return;
    this.level++;

    switch (this.level) {
      case 2: this.count = 2; break;
      case 3: this.count = 3; break;
      case 4: this.cooldown *= 0.70; break;
      case 5: this.damage = Math.round(this.damage * 1.20); break;
      case 6: this.knockback = 20; break; // Đẩy lùi 10-20%
      case 7: this.sizeScale = 1.40; break; // Tăng kích thước 40%
    }
  }

  update(delta, player, enemies, spawnProjCb, particles, dmgMult) {
    this.timer -= delta;
    if (this.timer <= 0) {
      this.timer = this.cooldown;
      if (enemies.length === 0) return;

      for (let i = 0; i < this.count; i++) {
        const target = enemies[Math.floor(Math.random() * enemies.length)];
        if (!target) continue;

        const proj = new PlayerProjectile(
          player.x, player.y,
          target.x, target.y,
          this.damage * dmgMult,
          999, // Xuyên cực nhiều
          player
        );
        proj.speed = 640;
        proj.customSprite = getWeaponSprite('assets/weapons/sword_plain_single.png');
        proj.width = 46 * this.sizeScale;
        proj.height = 18 * this.sizeScale;
        spawnProjCb(proj);
      }
    }
  }

  render() {}
}

// =========================================================================
// 6. VŨ KHÍ BOOMERANG (PHI TIÊU BOOMERANG)
// =========================================================================
export class BoomerangWeapon {
  constructor() {
    this.id = 'boomerang';
    this.name = 'Nguyệt Luân Boomerang';
    this.icon = 'assets/icons/boomerang.png';
    this.desc = 'Lưỡi liềm bay ra xa rồi xoay vòng quay trở lại tay.';
    this.level = 1;
    this.maxLevel = 7;
    this.type = 'attack';

    this.damage = 26;
    this.cooldown = 1.6;
    this.timer = 0.6;
    this.count = 1;
    this.size = 28;
    this.flightRange = 360;
    this.doubleCycle = false; // Cấp 7
    this.activeBoomerangs = [];
  }

  upgrade() {
    if (this.level >= this.maxLevel) return;
    this.level++;

    switch (this.level) {
      case 2: this.count = 2; break;
      case 3: this.count = 3; break;
      case 4: this.damage = Math.round(this.damage * 1.20); break;
      case 5: this.size *= 1.30; break;
      case 6: this.flightRange *= 1.50; break; // Tầm xa gấp rưỡi
      case 7: this.doubleCycle = true; break; // Bay thêm 1 lần nữa
    }
  }

  update(delta, player, enemies, spawnProjCb, particles, dmgMult, onEnemyKill) {
    this.timer -= delta;

    if (this.timer <= 0) {
      this.timer = this.cooldown;
      for (let i = 0; i < this.count; i++) {
        const angle = (Math.PI * 2 / this.count) * i + Math.random() * 0.4;
        this.activeBoomerangs.push({
          x: player.x,
          y: player.y,
          startX: player.x,
          startY: player.y,
          vx: Math.cos(angle) * 420,
          vy: Math.sin(angle) * 420,
          state: 'outgoing', // 'outgoing' hoặc 'returning'
          maxDist: this.flightRange,
          cycleCount: this.doubleCycle ? 2 : 1,
          rot: 0
        });
      }
    }

    // Cập nhật boomerang
    for (let i = this.activeBoomerangs.length - 1; i >= 0; i--) {
      const b = this.activeBoomerangs[i];
      b.rot += delta * 15;

      if (b.state === 'outgoing') {
        b.x += b.vx * delta;
        b.y += b.vy * delta;
        const d = Math.hypot(b.x - b.startX, b.y - b.startY);
        if (d >= b.maxDist) {
          b.state = 'returning';
        }
      } else {
        // Bay quay lại vị trí người chơi
        const dx = player.x - b.x;
        const dy = player.y - b.y;
        const d = Math.hypot(dx, dy);
        b.x += (dx / (d || 1)) * 480 * delta;
        b.y += (dy / (d || 1)) * 480 * delta;

        if (d < 25) {
          b.cycleCount--;
          if (b.cycleCount > 0) {
            b.state = 'outgoing';
            b.startX = player.x;
            b.startY = player.y;
            b.vx = -b.vx;
            b.vy = -b.vy;
          } else {
            this.activeBoomerangs.splice(i, 1);
            continue;
          }
        }
      }

      // Va chạm quái
      for (const e of enemies) {
        if (e.isDead) continue;
        const dist = Math.hypot(b.x - e.x, b.y - e.y);
        if (dist <= this.size + e.getHitboxRadius()) {
          const rawDmg = this.damage * dmgMult;
          const { damage: dmg, isCrit } = player.rollDamage ? player.rollDamage(rawDmg) : { damage: rawDmg, isCrit: false };
          e.takeDamage(dmg);
          particles.createHitSparks(b.x, b.y, isCrit ? 8 : 4);
          particles.createDamageNumber(e.x, e.y, dmg, isCrit);

          if (e.isDead && onEnemyKill) {
            particles.createDeathBurst(e.x, e.y, e.config.color || '#a040b0');
            onEnemyKill(e);
          }
        }
      }
    }
  }

  render(ctx, camera) {
    const axeImg = getWeaponSprite('assets/weapons/axe_fire_single.png');
    ctx.save();
    for (const b of this.activeBoomerangs) {
      const p = camera.worldToScreen(b.x, b.y);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(b.rot);

      const drawW = this.size * 1.4;
      const drawH = this.size * 2.8;

      if (axeImg && axeImg.complete && axeImg.naturalWidth > 0) {
        ctx.drawImage(axeImg, -drawW / 2, -drawH / 2, drawW, drawH);
      } else {
        ctx.fillStyle = '#ff5722';
        ctx.fillRect(-drawW / 2, -drawH / 2, drawW, drawH);
      }

      ctx.restore();
    }
    ctx.restore();
  }
}

// =========================================================================
// 7. VŨ KHÍ CHÉM BÁN KÍNH TRƯỚC MẶT (CLEAVE / ARC SLASH)
// =========================================================================
export class ArcSlashWeapon {
  constructor() {
    this.id = 'arc_slash';
    this.name = 'Trảm Kích Bán Nguyệt';
    this.icon = 'assets/icons/cleave.png';
    this.desc = 'Vung đường kiếm hình quạt quét sạch kẻ địch trước mặt.';
    this.level = 1;
    this.maxLevel = 7;
    this.type = 'attack';

    this.damage = 40;
    this.cooldown = 1.2;
    this.timer = 0.5;
    this.radius = 110;
    this.slowEnemy = 0;
    this.knockback = 0;
    this.isDoubleSlash = false; // Cấp 7
    this.slashAnimTimer = 0;
    this.slashAnimFrame = 0;
    this.slashAnimSpeed = 0.028; // ~28ms mỗi frame
    this.SLASH_TOTAL_FRAMES = 8;
    this.slashFacing = 'right';
  }

  upgrade() {
    if (this.level >= this.maxLevel) return;
    this.level++;

    switch (this.level) {
      case 2: this.radius *= 1.30; break;
      case 3: this.slowEnemy = 0.20; break;
      case 4: this.cooldown *= 0.70; break;
      case 5: this.knockback = 45; break; // Đẩy lùi 20%
      case 6: this.cooldown *= 0.80; break;
      case 7: this.isDoubleSlash = true; break; // Chém kép 2 nhát
    }
  }

  update(delta, player, enemies, spawnProjCb, particles, dmgMult, onEnemyKill) {
    this.timer -= delta;
    if (this.slashAnimTimer > 0) {
      this.slashAnimTimer -= delta;
      // Tính frame hiện tại của hoạt ảnh chém
      this.slashAnimFrame = Math.floor(
        (1.0 - this.slashAnimTimer / 0.22) * this.SLASH_TOTAL_FRAMES
      );
    }

    if (this.timer <= 0) {
      this.timer = this.cooldown;
      this.slashAnimTimer = 0.22;
      this.slashFacing = player.facing;

      const performSlash = (offsetAngle = 0) => {
        const facingAngle = this.slashFacing === 'right' ? 0 : Math.PI;
        for (const e of enemies) {
          if (e.isDead) continue;
          const dist = Math.hypot(e.x - player.x, e.y - player.y);
          if (dist <= this.radius + e.getHitboxRadius()) {
            const angleToEnemy = Math.atan2(e.y - player.y, e.x - player.x);
            let diff = Math.abs(angleToEnemy - (facingAngle + offsetAngle));
            while (diff > Math.PI) diff = Math.PI * 2 - diff;

            if (diff < Math.PI * 0.45) { // Góc quạt 90 độ
              const rawDmg = this.damage * dmgMult;
              const { damage: dmg, isCrit } = player.rollDamage ? player.rollDamage(rawDmg) : { damage: rawDmg, isCrit: false };
              e.takeDamage(dmg);
              particles.createHitSparks(e.x, e.y, isCrit ? 10 : 6);
              particles.createDamageNumber(e.x, e.y, dmg, isCrit);

              if (this.knockback > 0) {
                e.x += (this.slashFacing === 'right' ? 1 : -1) * this.knockback;
              }

              if (e.isDead && onEnemyKill) {
                particles.createDeathBurst(e.x, e.y, e.config.color || '#a040b0');
                onEnemyKill(e);
              }
            }
          }
        }
      };

      performSlash();
      if (this.isDoubleSlash) {
        setTimeout(() => performSlash(0.1), 100);
      }
    }
  }

  render(ctx, camera, player) {
    if (this.slashAnimTimer > 0 && !player.isDead) {
      const p = camera.worldToScreen(player.x, player.y);
      const angle = this.slashFacing === 'right' ? 0 : Math.PI;
      const frameIdx = Math.min(Math.max(0, this.slashAnimFrame), this.SLASH_TOTAL_FRAMES - 1);
      const slashImg = slashFrames[frameIdx];

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(angle);

      // Vẽ sprite 32x16 cho hiệu ứng chém, scale theo bán kính vũ khí
      const drawScale = (this.radius / 110) * 4.5; // Tỷ lệ cơ bản 4.5x
      const drawW = 32 * drawScale;
      const drawH = 16 * drawScale;

      if (slashImg && slashImg.complete && slashImg.naturalWidth > 0) {
        // Vẽ animated slash từ asset
        ctx.drawImage(slashImg, -drawW * 0.2, -drawH / 2, drawW, drawH);
      } else {
        // Fallback: vẽ arc line khi asset chưa tải
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, -Math.PI * 0.4, Math.PI * 0.4);
        ctx.stroke();
      }

      // Thêm glow nhẹ quanh vũ khí
      const progress = 1.0 - (this.slashAnimTimer / 0.22);
      ctx.globalAlpha = Math.max(0, 0.5 - progress * 0.5);
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, -Math.PI * 0.4, Math.PI * 0.4);
      ctx.stroke();

      ctx.restore();
    }
  }
}

// =========================================================================
// 8. VŨ KHÍ TIẾN HÓA TỐI THƯỢNG (HỢP NHẤT 2 VŨ KHÍ CẤP 7)
// =========================================================================
export class EvolvedStormSwordWeapon {
  constructor() {
    this.id = 'evolved_storm_sword';
    this.name = '⭐ Bão Kiếm Cổ Đại ⭐';
    this.icon = 'assets/icons/evolved_storm_sword.png';
    this.desc = 'Hợp nhất tối thượng từ 2 vũ khí Cấp 7. Giải phóng bão kiếm ánh sáng quét sạch bản đồ.';
    this.level = 7;
    this.maxLevel = 7;
    this.type = 'attack';

    this.damage = 120;
    this.cooldown = 0.45;
    this.timer = 0.1;
    this.bladeCount = 4;
    this.angle = 0;
    this.radius = 135;
    this.hitCooldowns = new Map();
  }

  upgrade() {}

  update(delta, player, enemies, spawnProjCb, particles, dmgMult, onEnemyKill) {
    this.timer -= delta;
    this.angle += delta * 6.5;

    // Quét kiếm xoay xung quanh
    for (const [enemy, timer] of this.hitCooldowns.entries()) {
      if (timer - delta <= 0) this.hitCooldowns.delete(enemy);
      else this.hitCooldowns.set(enemy, timer - delta);
    }

    for (let i = 0; i < this.bladeCount; i++) {
      const a = this.angle + (i * Math.PI * 2) / this.bladeCount;
      const bx = player.x + Math.cos(a) * this.radius;
      const by = player.y + Math.sin(a) * this.radius;

      for (const e of enemies) {
        if (e.isDead || this.hitCooldowns.has(e)) continue;
        const d = Math.hypot(bx - e.x, by - e.y);
        if (d <= 35 + e.getHitboxRadius()) {
          const rawDmg = this.damage * dmgMult;
          const { damage: dmg, isCrit } = player.rollDamage ? player.rollDamage(rawDmg) : { damage: rawDmg, isCrit: false };
          e.takeDamage(dmg);
          particles.createHitSparks(bx, by, isCrit ? 14 : 8);
          particles.createDamageNumber(e.x, e.y, dmg, isCrit);
          this.hitCooldowns.set(e, 0.25);
          if (e.isDead && onEnemyKill) onEnemyKill(e);
        }
      }
    }

    // Tự động bắn kiếm ánh sáng uy lực về phía kẻ địch ngẫu nhiên
    if (this.timer <= 0) {
      this.timer = this.cooldown;
      if (enemies.length > 0) {
        for (let i = 0; i < 3; i++) {
          const target = enemies[Math.floor(Math.random() * enemies.length)];
          if (target && !target.isDead) {
            const proj = new PlayerProjectile(
              player.x, player.y,
              target.x, target.y,
              this.damage * dmgMult * 1.5,
              999,
              player
            );
            proj.customSprite = getWeaponSprite('assets/weapons/sword_serrated_single.png');
            proj.width = 60;
            proj.height = 24;
            proj.speed = 680;
            spawnProjCb(proj);
          }
        }
      }
    }
  }

  render(ctx, camera, player) {
    if (player.isDead) return;
    const bladeImg = getWeaponSprite('assets/weapons/sword_serrated_single.png');
    ctx.save();
    for (let i = 0; i < this.bladeCount; i++) {
      const a = this.angle + (i * Math.PI * 2) / this.bladeCount;
      const wx = player.x + Math.cos(a) * this.radius;
      const wy = player.y + Math.sin(a) * this.radius;
      const sp = camera.worldToScreen(wx, wy);

      ctx.save();
      ctx.translate(sp.x, sp.y);
      ctx.rotate(a + Math.PI / 2);

      if (bladeImg && bladeImg.complete && bladeImg.naturalWidth > 0) {
        ctx.drawImage(bladeImg, -14, -35, 28, 70);
      } else {
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(-12, -30, 24, 60);
      }
      ctx.restore();
    }
    ctx.restore();
  }
}

// =========================================================================
// BỘ QUẢN LÝ TỔNG HỢP TOÀN BỘ VŨ KHÍ (WEAPON MANAGER)
// =========================================================================
export class WeaponManager {
  constructor(initialWeaponId = 'main_sword') {
    // 4 slot tấn công tối đa
    this.equippedWeapons = [];
    this.initStartingWeapon(initialWeaponId);
  }

  initStartingWeapon(weaponId) {
    this.equippedWeapons = [];
    let startW;
    switch (weaponId) {
      case 'orbiting_blades':
        startW = new OrbitingBladesWeapon();
        break;
      case 'holy_aura':
        startW = new HolyAuraWeapon();
        break;
      case 'main_sword':
      default:
        startW = new MainSwordWeapon();
        break;
    }
    this.equippedWeapons.push(startW);
  }

  addWeapon(weaponInstance) {
    // 5 slot tấn công tối đa (đã tăng thêm 1 ô)
    if (this.equippedWeapons.length < 5) {
      this.equippedWeapons.push(weaponInstance);
      return true;
    }
    return false;
  }

  getWeapon(weaponId) {
    return this.equippedWeapons.find(w => w.id === weaponId);
  }

  update(delta, player, enemies, spawnProjCb, particles, dmgMult, onEnemyKill) {
    for (const weapon of this.equippedWeapons) {
      weapon.update(delta, player, enemies, spawnProjCb, particles, dmgMult, onEnemyKill);
    }
  }

  render(ctx, camera, player) {
    for (const weapon of this.equippedWeapons) {
      weapon.render(ctx, camera, player);
    }
  }
}

export function createWeaponById(id) {
  switch (id) {
    case 'main_sword': return new MainSwordWeapon();
    case 'orbiting_blades': return new OrbitingBladesWeapon();
    case 'holy_aura': return new HolyAuraWeapon();
    case 'pool_zone': return new PoolZoneWeapon();
    case 'piercing_needle': return new PiercingNeedleWeapon();
    case 'boomerang': return new BoomerangWeapon();
    case 'arc_slash': return new ArcSlashWeapon();
    case 'evolved_storm_sword': return new EvolvedStormSwordWeapon();
    default: return new MainSwordWeapon();
  }
}
