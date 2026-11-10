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
// 1. VŨ KHÍ CHÍNH: KIẾM NGHI LỄ (MAIN WEAPON)
// =========================================================================
export class MainSwordWeapon {
  constructor() {
    this.id = 'main_sword';
    this.name = 'Kiếm Nghi Lễ';
    this.icon = 'assets/icons/sword_main.png';
    this.desc = 'Phóng Kiếm Nghi Lễ sắc bén tự động găm vào kẻ địch gần nhất.';
    this.level = 1;
    this.maxLevel = 7;
    this.type = 'attack';

    // Chỉ số cơ bản (Scale x10)
    this.baseDamage = 320;
    this.damage = 320;
    this.cooldown = 0.85;
    this.timer = 0.2;
    this.range = 480;
    this.projectileCount = 1;
    this.pierce = 2;
    this.hasSlashAura = false; // Mở khóa ở cấp 7

    // Thuộc tính bảo vệ vũ khí chính khởi đầu
    this.isMainWeapon = true;
    this.isUnique = true;
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
    const enhanceMult = (player && player.enhanceSpecialAndMain) ? (1.0 + player.enhanceSpecialAndMain) : 1.0;
    const effectiveDmgMult = dmgMult * enhanceMult;

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
          const areaMult = (player && player.getAreaMultiplier) ? player.getAreaMultiplier() : 1.0;
          const slashRadius = 140 * areaMult;
          const baseSlashDmg = this.damage * effectiveDmgMult * 3.5;

          // Tạo vòng chém hào quang
          particles.createHitSparks(player.x, player.y, 16);

          for (const e of enemies) {
            if (e.isDead) continue;
            const d = Math.hypot(e.x - player.x, e.y - player.y);
            if (d <= slashRadius + e.getHitboxRadius()) {
              const rolled = player.rollDamage ? player.rollDamage(baseSlashDmg) : { damage: baseSlashDmg, isCrit: false, isTrueDamage: false };
              const hit = e.takeDamage(rolled.damage, {
                isTrueDamage: rolled.isTrueDamage,
                armorPenFlat: rolled.armorPenFlat,
                armorPenPercent: rolled.armorPenPercent,
                attackerAccuracy: rolled.accuracy,
                isCrit: rolled.isCrit
              }, particles);

              if (hit > 0) {
                particles.createHitSparks(e.x, e.y, rolled.critTier >= 2 ? 20 : (rolled.isCrit ? 12 : 6));
                particles.createDamageNumber(e.x, e.y, hit, rolled.isCrit, rolled.isTrueDamage, false, false, null, rolled.critTier);
                if (player.onHitEnemy) player.onHitEnemy(e, hit, particles);
              }

              // Đẩy lùi 20%
              const push = 35;
              e.x += ((e.x - player.x) / (d || 1)) * push;
              e.y += ((e.y - player.y) / (d || 1)) * push;
              // DOT Xuất huyết (Bleed) - Kiểm tra tỉ lệ với Né tránh
              const canBleed = e.canApplyEffect ? e.canApplyEffect(1.0, player.accuracy) : true;
              if (canBleed) {
                const dotDurMult = 1.0 + (player.bookStats ? (player.bookStats.dotDurationMult || 0) : 0);
                e.bleedTimer = 5.0 * dotDurMult;
                e.bleedStacks = Math.min(10, (e.bleedStacks || 0) + 1);
              }

              if (e.isDead && onEnemyKill) {
                const burstColor = (e.config && e.config.color) || '#a040b0';
                particles.createDeathBurst(e.x, e.y, burstColor);
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
            this.damage * effectiveDmgMult,
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
      const areaMult = (player && player.getAreaMultiplier) ? player.getAreaMultiplier() : 1.0;
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 120, 180, 0.25)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 140 * areaMult, 0, Math.PI * 2);
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

    this.damage = 180;
    this.count = 1;
    this.radius = 108;
    this.speed = 3.2; // Tốc độ góc
    this.angle = 0;
    this.cooldownFactor = 1.0;
    this.bladeSize = 35; // Tăng kích thước gốc (+45%) giúp kiếm to rõ và uy lực
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
    const areaMult = (player && player.getAreaMultiplier) ? player.getAreaMultiplier() : 1.0;
    const curBladeSize = this.bladeSize * areaMult;
    const curOrbitRadius = this.radius * (1 + (areaMult - 1) * 0.35);

    for (let i = 0; i < this.count; i++) {
      const bladeAngle = this.angle + (i * Math.PI * 2) / this.count;
      const bladeX = player.x + Math.cos(bladeAngle) * curOrbitRadius;
      const bladeY = player.y + Math.sin(bladeAngle) * curOrbitRadius;

      for (const enemy of enemies) {
        if (enemy.isDead || this.hitCooldowns.has(enemy)) continue;

        const dist = Math.hypot(bladeX - enemy.x, bladeY - enemy.y);
        if (dist <= curBladeSize + enemy.getHitboxRadius()) {
          const rawDmg = this.damage * dmgMult;
          const rolled = player.rollDamage ? player.rollDamage(rawDmg) : { damage: rawDmg, isCrit: false, isTrueDamage: false };
          const hit = enemy.takeDamage(rolled.damage, {
            isTrueDamage: rolled.isTrueDamage,
            armorPenFlat: rolled.armorPenFlat,
            armorPenPercent: rolled.armorPenPercent,
            attackerAccuracy: rolled.accuracy,
            isCrit: rolled.isCrit
          }, particles);

          if (hit > 0) {
            particles.createHitSparks(bladeX, bladeY, rolled.critTier >= 2 ? 18 : (rolled.isCrit ? 10 : 6));
            particles.createDamageNumber(enemy.x, enemy.y, hit, rolled.isCrit, rolled.isTrueDamage, false, false, null, rolled.critTier);
            if (player.onHitEnemy) player.onHitEnemy(enemy, hit, particles);
          }

          this.hitCooldowns.set(enemy, 0.35); // 0.35s sau mới trúng tiếp

          if (enemy.isDead && onEnemyKill) {
            const burstColor = (enemy.config && enemy.config.color) || '#a040b0';
            particles.createDeathBurst(enemy.x, enemy.y, burstColor);
            onEnemyKill(enemy);
          }
        }
      }
    }
  }

  render(ctx, camera, player) {
    if (player.isDead) return;

    const bladeImg = getWeaponSprite('assets/weapons/sword_serrated_single.png');
    const areaMult = (player && player.getAreaMultiplier) ? player.getAreaMultiplier() : 1.0;
    const curBladeSize = this.bladeSize * areaMult;
    const curOrbitRadius = this.radius * (1 + (areaMult - 1) * 0.35);

    ctx.save();
    for (let i = 0; i < this.count; i++) {
      const bladeAngle = this.angle + (i * Math.PI * 2) / this.count;
      const worldX = player.x + Math.cos(bladeAngle) * curOrbitRadius;
      const worldY = player.y + Math.sin(bladeAngle) * curOrbitRadius;
      const screenPos = camera.worldToScreen(worldX, worldY);

      ctx.save();
      ctx.translate(screenPos.x, screenPos.y);
      ctx.rotate(bladeAngle + Math.PI / 2);

      const drawW = curBladeSize * 0.9;
      const drawH = curBladeSize * 2.2;

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
    this.damage = 80;
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

    const areaMult = (player && player.getAreaMultiplier) ? player.getAreaMultiplier() : 1.0;
    const effectiveRadius = this.radius * areaMult;
    const effectiveOuterRadius = this.outerRadius > 0 ? this.outerRadius * areaMult : effectiveRadius;

    // Áp dụng làm chậm quái
    if (this.slowEffect > 0) {
      for (const e of enemies) {
        if (e.isDead) continue;
        const dist = Math.hypot(e.x - player.x, e.y - player.y);
        if (dist <= effectiveRadius + e.getHitboxRadius()) {
          e.slowTimer = 0.2;
          e.speedMultiplier = 1.0 - this.slowEffect;
        }
      }
    }

    if (this.tickTimer <= 0) {
      this.tickTimer = this.tickInterval;

      for (const e of enemies) {
        if (e.isDead) continue;
        const dist = Math.hypot(e.x - player.x, e.y - player.y);
        if (dist <= effectiveOuterRadius + e.getHitboxRadius()) {
          const rawDmg = this.damage * dmgMult;
          const rolled = player.rollDamage ? player.rollDamage(rawDmg) : { damage: rawDmg, isCrit: false, isTrueDamage: false };
          const hit = e.takeDamage(rolled.damage, {
            isTrueDamage: rolled.isTrueDamage,
            armorPenFlat: rolled.armorPenFlat,
            armorPenPercent: rolled.armorPenPercent,
            attackerAccuracy: rolled.accuracy,
            isCrit: rolled.isCrit
          }, particles);

          if (hit > 0) {
            particles.createHitSparks(e.x, e.y, rolled.critTier >= 2 ? 16 : (rolled.isCrit ? 8 : 4));
            particles.createDamageNumber(e.x, e.y, hit, rolled.isCrit, rolled.isTrueDamage, false, false, null, rolled.critTier);
            if (player.onHitEnemy) player.onHitEnemy(e, hit, particles);
          }

          if (this.doubleStrike && !e.isDead) {
            const rolled2 = player.rollDamage ? player.rollDamage(rawDmg) : { damage: rawDmg, isCrit: false, isTrueDamage: false };
            const hit2 = e.takeDamage(rolled2.damage, {
              isTrueDamage: rolled2.isTrueDamage,
              armorPenFlat: rolled2.armorPenFlat,
              armorPenPercent: rolled2.armorPenPercent,
              attackerAccuracy: rolled2.accuracy,
              isCrit: rolled2.isCrit
            }, particles);
            if (hit2 > 0) {
              particles.createHitSparks(e.x, e.y - 12, rolled2.critTier >= 2 ? 16 : (rolled2.isCrit ? 8 : 4));
              particles.createDamageNumber(e.x, e.y - 12, hit2, rolled2.isCrit, rolled2.isTrueDamage, false, false, null, rolled2.critTier);
              if (player.onHitEnemy) player.onHitEnemy(e, hit2, particles);
            }
          }

          if (e.isDead && onEnemyKill) {
            const burstColor = (e.config && e.config.color) || '#a040b0';
            particles.createDeathBurst(e.x, e.y, burstColor);
            onEnemyKill(e);
          }
        }
      }
    }
  }

  render(ctx, camera, player) {
    if (player.isDead) return;

    const p = camera.worldToScreen(player.x, player.y);
    const areaMult = (player && player.getAreaMultiplier) ? player.getAreaMultiplier() : 1.0;
    const effectiveRadius = this.radius * areaMult;
    const effectiveOuterRadius = this.outerRadius > 0 ? this.outerRadius * areaMult : effectiveRadius;
    ctx.save();

    // Vẽ animated aura frame (64x64) scale lên theo bán kính
    const auraImg = auraFrames[this.auraAnimFrame];
    const auraDrawSize = effectiveRadius * 2.1; // vẽ hơi to hơn bán kính 1 chút
    if (auraImg && auraImg.complete && auraImg.naturalWidth > 0) {
      ctx.globalAlpha = 0.65;
      ctx.drawImage(auraImg, p.x - auraDrawSize / 2, p.y - auraDrawSize / 2, auraDrawSize, auraDrawSize);
      ctx.globalAlpha = 1;
    } else {
      // Fallback gradient khi chưa tải xong
      const grad = ctx.createRadialGradient(p.x, p.y, 10, p.x, p.y, effectiveRadius);
      grad.addColorStop(0, 'rgba(255, 230, 100, 0.05)');
      grad.addColorStop(0.7, 'rgba(255, 200, 50, 0.12)');
      grad.addColorStop(1, 'rgba(255, 180, 0, 0.35)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, effectiveRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Viền hào quang mờ
    ctx.strokeStyle = 'rgba(255, 220, 80, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, effectiveRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Vùng mở rộng cấp 5 (nếu có)
    if (this.outerRadius > 0) {
      ctx.strokeStyle = 'rgba(255, 240, 160, 0.25)';
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(p.x, p.y, effectiveOuterRadius, 0, Math.PI * 2);
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
    this.damage = 120;
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

      // Thu thập các quái vật còn sống trong tầm nhìn chiến đấu (tối đa 650px quanh người chơi)
      const nearbyEnemies = [];
      for (const e of enemies) {
        if (e.isDead) continue;
        const d = Math.hypot(e.x - player.x, e.y - player.y);
        if (d <= 650) {
          nearbyEnemies.push({ enemy: e, dist: d });
        }
      }

      // Ưu tiên quái vật ở gần người chơi nhất
      nearbyEnemies.sort((a, b) => a.dist - b.dist);

      const areaMult = (player && player.getAreaMultiplier) ? player.getAreaMultiplier() : 1.0;
      const effectiveRadius = this.radius * areaMult;

      for (let i = 0; i < this.poolCount; i++) {
        let spawnX, spawnY;

        if (nearbyEnemies.length > 0) {
          // Nhắm thông minh vào kẻ địch (nhiều vũng sẽ chia đều cho các quái khác nhau)
          const targetIndex = i < nearbyEnemies.length ? i : Math.floor(Math.random() * nearbyEnemies.length);
          const target = nearbyEnemies[targetIndex].enemy;

          // Hơi đón đầu nhẹ (15-20px) theo hướng quái đang lao về phía người chơi để quái bước trọn vào vũng
          const toPlayerAngle = Math.atan2(player.y - target.y, player.x - target.x);
          const leadDist = Math.min(20, nearbyEnemies[targetIndex].dist * 0.15);

          spawnX = target.x + Math.cos(toPlayerAngle) * leadDist;
          spawnY = target.y + Math.sin(toPlayerAngle) * leadDist;
        } else {
          // Nếu không có quái xung quanh: ném quanh người chơi
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.random() * 180 + 70;
          spawnX = player.x + Math.cos(angle) * dist;
          spawnY = player.y + Math.sin(angle) * dist;
        }

        this.activePools.push({
          x: spawnX,
          y: spawnY,
          radius: effectiveRadius,
          damage: this.damage * dmgMult,
          duration: this.duration,
          tickTimer: 0.05, // Kích hoạt nhịp sát thương đầu tiên gần như ngay lập tức khi vũng vừa xuất hiện
          life: this.duration
        });

        if (particles && particles.createHitSparks) {
          particles.createHitSparks(spawnX, spawnY, 4);
        }
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
            const rawPoolDmg = pool.damage;
            const rolled = player.rollDamage ? player.rollDamage(rawPoolDmg) : { damage: rawPoolDmg, isCrit: false, isTrueDamage: false };
            const hit = e.takeDamage(rolled.damage, {
              isTrueDamage: rolled.isTrueDamage,
              armorPenFlat: rolled.armorPenFlat,
              armorPenPercent: rolled.armorPenPercent,
              attackerAccuracy: rolled.accuracy,
              isCrit: rolled.isCrit
            }, particles);

            if (hit > 0) {
              particles.createHitSparks(e.x, e.y, rolled.critTier >= 2 ? 16 : (rolled.isCrit ? 8 : 4));
              particles.createDamageNumber(e.x, e.y, hit, rolled.isCrit, rolled.isTrueDamage, false, false, null, rolled.critTier);
              if (player.onHitEnemy) player.onHitEnemy(e, hit, particles);
            }

            if (this.hasDot) {
              const canBurn = e.canApplyEffect ? e.canApplyEffect(1.0, player.accuracy) : true;
              if (canBurn) {
                const dotDurMult = 1.0 + (player.bookStats ? (player.bookStats.dotDurationMult || 0) : 0);
                const dotDmgMult = 1.0 + (player.bookStats ? (player.bookStats.dotDmgMult || 0) : 0);
                e.zoneDotTimer = 5.0 * dotDurMult;
                e.zoneDotDmg = rawPoolDmg * 0.20 * dotDmgMult;
              }
            }

            if (e.isDead && onEnemyKill) {
              const burstColor = (e.config && e.config.color) || '#a040b0';
              particles.createDeathBurst(e.x, e.y, burstColor);
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

    this.damage = 240;
    this.cooldown = 1.1;
    this.timer = 0.4;
    this.count = 1;
    this.sizeScale = 1.0;
    this.knockback = 0;
    this.armorPenFlat = 50; // Xuyên Giáp cố định 50 điểm!
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
        const areaMult = (player && player.getAreaMultiplier) ? player.getAreaMultiplier() : 1.0;
        proj.speed = 640;
        proj.customSprite = getWeaponSprite('assets/weapons/sword_plain_single.png');
        proj.width = Math.round(46 * this.sizeScale * areaMult);
        proj.height = Math.round(18 * this.sizeScale * areaMult);
        proj.radius = Math.round(14 * this.sizeScale * areaMult);
        proj.armorPenFlat = this.armorPenFlat || 50; // Xuyên giáp phẳng
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

    this.damage = 260;
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
      const areaMult = (player && player.getAreaMultiplier) ? player.getAreaMultiplier() : 1.0;
      const curSize = this.size * areaMult;

      for (const e of enemies) {
        if (e.isDead) continue;
        const dist = Math.hypot(b.x - e.x, b.y - e.y);
        if (dist <= curSize + e.getHitboxRadius()) {
          const rawDmg = this.damage * dmgMult;
          const rolled = player.rollDamage ? player.rollDamage(rawDmg) : { damage: rawDmg, isCrit: false, isTrueDamage: false };
          const hit = e.takeDamage(rolled.damage, {
            isTrueDamage: rolled.isTrueDamage,
            armorPenFlat: rolled.armorPenFlat,
            armorPenPercent: rolled.armorPenPercent,
            attackerAccuracy: rolled.accuracy,
            isCrit: rolled.isCrit
          }, particles);

          if (hit > 0) {
            particles.createHitSparks(b.x, b.y, rolled.critTier >= 2 ? 16 : (rolled.isCrit ? 8 : 4));
            particles.createDamageNumber(e.x, e.y, hit, rolled.isCrit, rolled.isTrueDamage, false, false, null, rolled.critTier);
            if (player.onHitEnemy) player.onHitEnemy(e, hit, particles);
          }

          if (e.isDead && onEnemyKill) {
            const burstColor = (e.config && e.config.color) || '#a040b0';
            particles.createDeathBurst(e.x, e.y, burstColor);
            onEnemyKill(e);
          }
        }
      }
    }
  }

  render(ctx, camera, player = null) {
    const axeImg = getWeaponSprite('assets/weapons/axe_fire_single.png');
    const areaMult = (player && player.getAreaMultiplier) ? player.getAreaMultiplier() : 1.0;
    const curSize = this.size * areaMult;

    ctx.save();
    for (const b of this.activeBoomerangs) {
      const p = camera.worldToScreen(b.x, b.y);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(b.rot);

      const drawW = curSize * 1.4;
      const drawH = curSize * 2.8;

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
// 7. VŨ KHÍ CHÉM BÁN KÍNH TRƯỚC MẶT (CLEAVE / ARC SLASH - TRẢM KÍCH BÁN NGUYỆT)
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

    this.damage = 450;
    this.cooldown = 1.2;
    this.timer = 0.5;
    this.radius = 110;
    this.slowEnemy = 0;
    this.knockback = 0;
    this.isDoubleSlash = false; // Cấp 7

    // Quản lý các nhát chém đang hiển thị (hỗ trợ ngắm 360 độ & chém kép chữ X)
    this.activeSlashes = [];
  }

  upgrade() {
    if (this.level >= this.maxLevel) return;
    this.level++;

    switch (this.level) {
      case 2: this.radius *= 1.30; break;
      case 3: this.slowEnemy = 0.25; break;
      case 4: this.cooldown *= 0.70; break;
      case 5: this.knockback = 50; break; // Đẩy lùi
      case 6: this.cooldown *= 0.80; break;
      case 7: this.isDoubleSlash = true; break; // Chém kép 2 nhát chữ X
    }
  }

  update(delta, player, enemies, spawnProjCb, particles, dmgMult, onEnemyKill) {
    this.timer -= delta;

    // Cập nhật các nhát chém đang diễn ra
    for (let i = this.activeSlashes.length - 1; i >= 0; i--) {
      const s = this.activeSlashes[i];
      s.elapsed += delta;

      // Xử lý gây sát thương tại thời điểm nhát chém bung ra (elapsed >= 0)
      if (s.elapsed >= 0 && !s.hasHit) {
        s.hasHit = true;
        const areaMult = (player && player.getAreaMultiplier) ? player.getAreaMultiplier() : 1.0;
        const hitRadius = s.radius * areaMult;
        const halfArc = Math.PI * 0.42; // Quạt ~150 độ

        for (const e of enemies) {
          if (e.isDead || s.hitEnemies.has(e)) continue;
          const dist = Math.hypot(e.x - player.x, e.y - player.y);
          if (dist <= hitRadius + (e.getHitboxRadius ? e.getHitboxRadius() : 18)) {
            const angleToEnemy = Math.atan2(e.y - player.y, e.x - player.x);
            let diff = Math.abs(angleToEnemy - s.angle);
            while (diff > Math.PI) diff = Math.PI * 2 - diff;

            if (diff <= halfArc) {
              s.hitEnemies.add(e);
              const rawDmg = this.damage * dmgMult * (s.isSecond ? 0.85 : 1.0);
              const rolled = player.rollDamage ? player.rollDamage(rawDmg) : { damage: rawDmg, isCrit: false, isTrueDamage: false };
              const hit = e.takeDamage(rolled.damage, {
                isTrueDamage: rolled.isTrueDamage,
                armorPenFlat: rolled.armorPenFlat,
                armorPenPercent: rolled.armorPenPercent,
                attackerAccuracy: rolled.accuracy,
                isCrit: rolled.isCrit
              }, particles);

              if (hit > 0) {
                if (particles) {
                  particles.createHitSparks(e.x, e.y, rolled.critTier >= 2 ? 18 : (rolled.isCrit ? 10 : 6));
                  particles.createDamageNumber(e.x, e.y, hit, rolled.isCrit, rolled.isTrueDamage, false, false, null, rolled.critTier);
                }
                if (player.onHitEnemy) player.onHitEnemy(e, hit, particles);
              }

              // Làm chậm nếu có
              if (this.slowEnemy > 0 && e.applySlow) {
                e.applySlow(this.slowEnemy, 1.2);
              }

              // Đẩy lùi theo hướng vung kiếm
              if (this.knockback > 0) {
                e.x += Math.cos(s.angle) * this.knockback;
                e.y += Math.sin(s.angle) * this.knockback;
              }

              if (e.isDead && onEnemyKill) {
                const burstColor = (e.config && e.config.color) || '#f59e0b';
                if (particles) particles.createDeathBurst(e.x, e.y, burstColor);
                onEnemyKill(e);
              }
            }
          }
        }
      }

      if (s.elapsed >= s.duration) {
        this.activeSlashes.splice(i, 1);
      }
    }

    // Kích hoạt vung kiếm mới
    if (this.timer <= 0) {
      this.timer = this.cooldown;

      // Tính góc chém thông minh (360 độ): ưu tiên quái gần nhất trong tầm quét
      const areaMult = (player && player.getAreaMultiplier) ? player.getAreaMultiplier() : 1.0;
      const curRadius = this.radius * areaMult;
      let targetAngle = player.facing === 'left' ? Math.PI : 0;

      // Nếu đang di chuyển, mặc định theo hướng di chuyển
      if (player.vx !== 0 || player.vy !== 0) {
        targetAngle = Math.atan2(player.vy, player.vx);
      }

      // Quét kẻ địch gần nhất trong bán kính 260px
      let nearestDist = 260;
      let nearestEnemy = null;
      for (const e of enemies) {
        if (e.isDead) continue;
        const d = Math.hypot(e.x - player.x, e.y - player.y);
        if (d < nearestDist) {
          nearestDist = d;
          nearestEnemy = e;
        }
      }
      if (nearestEnemy) {
        targetAngle = Math.atan2(nearestEnemy.y - player.y, nearestEnemy.x - player.x);
      }

      // Nhát chém 1
      this.activeSlashes.push({
        angle: targetAngle,
        isSecond: false,
        duration: 0.22,
        elapsed: 0,
        radius: curRadius,
        hitEnemies: new Set(),
        hasHit: false
      });

      // Nhát chém 2 (Cấp 7 - chém chéo tạo chữ X)
      if (this.isDoubleSlash) {
        this.activeSlashes.push({
          angle: targetAngle + 0.35, // Lệch góc một chút tạo đường cắt chéo kép
          isSecond: true,
          duration: 0.22,
          elapsed: -0.08, // Kích hoạt sau 80ms
          radius: curRadius * 1.08,
          hitEnemies: new Set(),
          hasHit: false
        });
      }
    }
  }

  render(ctx, camera, player) {
    if (this.activeSlashes.length === 0 || player.isDead) return;

    for (const s of this.activeSlashes) {
      if (s.elapsed < 0) continue; // Đang chờ delay

      const progress = Math.min(1.0, s.elapsed / s.duration);
      // Hiệu ứng mờ dần theo đường cong sin: nở rộ ở giữa và tan biến ở cuối
      const alpha = Math.sin(progress * Math.PI);
      if (alpha <= 0.01) continue;

      // Điểm gốc của nhát chém: đẩy ra trước mặt player 28px theo góc chém để không đè vào người
      const forwardOffset = 28;
      const originX = player.x + Math.cos(s.angle) * forwardOffset;
      const originY = player.y + Math.sin(s.angle) * forwardOffset;
      const screenP = camera.worldToScreen(originX, originY);

      const areaMult = (player && player.getAreaMultiplier) ? player.getAreaMultiplier() : 1.0;
      const curRadius = s.radius * areaMult;
      const arcSpan = Math.PI * 0.72; // Góc hình quạt ~130 độ
      const startAngle = -arcSpan / 2;
      const endAngle = arcSpan / 2;

      // Độ dày lưỡi liềm: mỏng dần theo thời gian khi phóng ra xa
      const rOuter = curRadius * (0.85 + 0.15 * progress);
      const rInner = curRadius * (0.50 + 0.35 * progress);

      ctx.save();
      ctx.translate(screenP.x, screenP.y);
      ctx.rotate(s.angle);
      ctx.globalAlpha = Math.min(1.0, alpha * 1.15);

      // 1. Vẽ thân kiếm khí hình bán nguyệt (Crescent Moon Energy Body)
      ctx.beginPath();
      ctx.arc(0, 0, rOuter, startAngle, endAngle, false);
      ctx.arc(0, 0, rInner, endAngle, startAngle, true);
      ctx.closePath();

      // Gradient màu sắc rực rỡ
      const grad = ctx.createRadialGradient(0, 0, rInner, 0, 0, rOuter);
      if (s.isSecond) {
        // Nhát thứ 2: Sắc đỏ hồng - tím huyền bí (Crimson / Violet Cross Slash)
        grad.addColorStop(0, 'rgba(168, 85, 247, 0)');
        grad.addColorStop(0.5, 'rgba(244, 63, 94, 0.45)');
        grad.addColorStop(0.85, 'rgba(255, 255, 255, 0.85)');
        grad.addColorStop(1, 'rgba(251, 113, 133, 0.95)');
      } else {
        // Nhát thứ 1: Sắc vàng kim - thiên thanh (Golden Celestial Blade)
        grad.addColorStop(0, 'rgba(253, 224, 71, 0)');
        grad.addColorStop(0.5, 'rgba(251, 191, 36, 0.45)');
        grad.addColorStop(0.85, 'rgba(255, 255, 255, 0.9)');
        grad.addColorStop(1, 'rgba(254, 240, 138, 0.95)');
      }
      ctx.fillStyle = grad;
      ctx.fill();

      // 2. Viền lưỡi chém sắc nhọn phát sáng (Razor Sharp Outer Edge)
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, rOuter, startAngle, endAngle, false);
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#ffffff';
      ctx.shadowColor = s.isSecond ? '#f43f5e' : '#f59e0b';
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.restore();

      // 3. Vệt sáng bổ trợ ở cung trong tạo chiều sâu cho luồng khí
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, (rOuter + rInner) * 0.5, startAngle * 0.8, endAngle * 0.8, false);
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = s.isSecond ? 'rgba(254, 205, 211, 0.7)' : 'rgba(254, 249, 195, 0.75)';
      ctx.stroke();
      ctx.restore();

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

    this.damage = 1200;
    this.cooldown = 0.45;
    this.timer = 0.1;
    this.bladeCount = 4;
    this.angle = 0;
    this.radius = 150;
    this.hitCooldowns = new Map();
  }

  upgrade() {}

  update(delta, player, enemies, spawnProjCb, particles, dmgMult, onEnemyKill) {
    this.timer -= delta;
    this.angle += delta * 6.5;

    const areaMult = (player && player.getAreaMultiplier) ? player.getAreaMultiplier() : 1.0;
    const curOrbitRadius = this.radius * (1 + (areaMult - 1) * 0.35);
    const bladeHitbox = 48 * areaMult;

    // Quét kiếm xoay xung quanh
    for (const [enemy, timer] of this.hitCooldowns.entries()) {
      if (timer - delta <= 0) this.hitCooldowns.delete(enemy);
      else this.hitCooldowns.set(enemy, timer - delta);
    }

    for (let i = 0; i < this.bladeCount; i++) {
      const a = this.angle + (i * Math.PI * 2) / this.bladeCount;
      const bx = player.x + Math.cos(a) * curOrbitRadius;
      const by = player.y + Math.sin(a) * curOrbitRadius;

      for (const e of enemies) {
        if (e.isDead || this.hitCooldowns.has(e)) continue;
        const d = Math.hypot(bx - e.x, by - e.y);
        if (d <= bladeHitbox + e.getHitboxRadius()) {
          const rawDmg = this.damage * dmgMult;
          const rolled = player.rollDamage ? player.rollDamage(rawDmg, true) : { damage: rawDmg, isCrit: false, isTrueDamage: true };
          const hit = e.takeDamage(rolled.damage, {
            isTrueDamage: true, // Sát Thương Chuẩn tối thượng bỏ qua 100% giáp!
            attackerAccuracy: rolled.accuracy,
            isCrit: rolled.isCrit
          }, particles);

          if (hit > 0) {
            particles.createHitSparks(bx, by, rolled.critTier >= 2 ? 24 : (rolled.isCrit ? 14 : 8));
            particles.createDamageNumber(e.x, e.y, hit, rolled.isCrit, true, false, false, null, rolled.critTier); // True Damage
            if (player.onHitEnemy) player.onHitEnemy(e, hit, particles);
          }
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
            proj.width = Math.round(60 * areaMult);
            proj.height = Math.round(24 * areaMult);
            proj.radius = Math.round(18 * areaMult);
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
    const areaMult = (player && player.getAreaMultiplier) ? player.getAreaMultiplier() : 1.0;
    const curOrbitRadius = this.radius * (1 + (areaMult - 1) * 0.35);
    const drawW = 38 * areaMult;
    const drawH = 95 * areaMult;

    ctx.save();
    for (let i = 0; i < this.bladeCount; i++) {
      const a = this.angle + (i * Math.PI * 2) / this.bladeCount;
      const wx = player.x + Math.cos(a) * curOrbitRadius;
      const wy = player.y + Math.sin(a) * curOrbitRadius;
      const sp = camera.worldToScreen(wx, wy);

      ctx.save();
      ctx.translate(sp.x, sp.y);
      ctx.rotate(a + Math.PI / 2);

      if (bladeImg && bladeImg.complete && bladeImg.naturalWidth > 0) {
        ctx.drawImage(bladeImg, -drawW / 2, -drawH / 2, drawW, drawH);
      } else {
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(-drawW / 2, -drawH / 2, drawW, drawH);
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
    // Đánh dấu đây là Vũ khí Chính độc nhất (không thể bị dung hợp / tiêu hao)
    startW.isMainWeapon = true;
    startW.isUnique = true;
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
    const witchRate = player && player.isWitch ? 1.20 : 1.0;
    const cdReduction = Math.min(0.75, (player && player.cooldownReduction) ? player.cooldownReduction : 0);
    const cdRate = witchRate / (1.0 - cdReduction);
    for (const weapon of this.equippedWeapons) {
      if (weapon.isLocked) continue; // Đang bị khóa bởi kỹ năng 7 của Boss
      weapon.update(delta * cdRate, player, enemies, spawnProjCb, particles, dmgMult, onEnemyKill);
    }
  }

  render(ctx, camera, player) {
    for (const weapon of this.equippedWeapons) {
      if (weapon.isLocked) continue;
      weapon.render(ctx, camera, player);
    }
  }
}

export function createWeaponById(id) {
  switch (id) {
    case 'main_sword': {
      const w = new MainSwordWeapon();
      w.isMainWeapon = true;
      w.isUnique = true;
      return w;
    }
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
