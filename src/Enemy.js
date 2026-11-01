import { CONFIG } from './config.js';

// Bộ nhớ cache chia sẻ sprite của quái để tránh tải lại nhiều lần
const SPRITE_CACHE = {};

function getEnemySprite(src) {
  if (!SPRITE_CACHE[src]) {
    const img = new Image();
    img.src = src;
    SPRITE_CACHE[src] = img;
  }
  return SPRITE_CACHE[src];
}

export class Enemy {
  constructor(typeConfig, startX, startY) {
    this.config = typeConfig;
    this.x = startX;
    this.y = startY;

    this.width = typeConfig.width;
    this.height = typeConfig.height;
    this.speed = typeConfig.speed;
    this.maxHealth = typeConfig.maxHealth;
    this.health = this.maxHealth;
    this.damage = typeConfig.damage;

    // --- CHỈ SỐ PHÒNG THỦ & ĐỐI KHÁNG ---
    this.armor = typeConfig.armor || 0;
    this.damageReduction = 0;
    this.accuracy = typeConfig.accuracy || 1.0;
    this.dodge = typeConfig.dodgeRate || 0.0;
    this.shield = 0;
    this.maxShield = 0;

    this.isRanged = !!typeConfig.isRanged;
    this.isElite = !!typeConfig.isElite;

    // Quái đánh xa
    this.shootTimer = this.isRanged ? (Math.random() * 1.5 + 1.0) : 0;
    this.preferredDistance = typeConfig.preferredDistance || 320;

    this.facing = 'right';
    this.walkCycle = Math.random() * 10;
    this.hitFlashTimer = 0;
    this.isDead = false;

    // === DOT EFFECTS ===
    // Bleed (Xuất huyết - từ Kiếm Chính Cấp 7)
    this.bleedTimer = 0;
    this.bleedStacks = 0; // Tối đa 10 lần cộng dồn

    // Zone DOT (Thiêu đốt - từ Dung Nham Cấp 7)
    this.zoneDotTimer = 0;
    this.zoneDotDmg = 0;

    // Slow (Làm chậm - từ Hào Quang Cấp 3 & Trảm Kích Cấp 3)
    this.slowTimer = 0;
    this.speedMultiplier = 1.0;

    this.sprite = getEnemySprite(typeConfig.sprite);
  }

  getHitboxRadius() {
    return Math.min(this.width, this.height) * 0.42;
  }

  // Kiểm tra tỉ lệ kích hoạt hiệu ứng bất lợi (có tính Chính Xác của người đánh vs Né Tránh)
  canApplyEffect(baseProcRate, attackerAccuracy = 1.0) {
    const rate = Math.max(0, baseProcRate * (1.0 + attackerAccuracy - this.dodge));
    return Math.random() < rate;
  }

  takeDamage(amount, options = {}, particles = null) {
    if (this.isDead) return false;

    // 1. Kiểm tra Né Tránh vs Chính Xác (Tầng 1)
    const attackerAcc = options.attackerAccuracy !== undefined ? options.attackerAccuracy : 1.0;
    const hitChance = Math.min(1.0, Math.max(0.05, attackerAcc - this.dodge));
    if (Math.random() > hitChance) {
      if (particles) {
        particles.createDamageNumber(this.x, this.y - 20, 0, false, false, true); // Chữ "NÉ!"
      }
      return 0; // Né thành công -> 0 dmg
    }

    let finalAmount = amount;

    // 2. Tính Giáp & Hệ số Giảm Sát Thương (Bỏ qua nếu là Sát Thương Chuẩn)
    if (!options.isTrueDamage) {
      const armorPenPercent = options.armorPenPercent || 0;
      const armorPenFlat = options.armorPenFlat || 0;
      const effectiveArmor = Math.max(0, this.armor * (1.0 - armorPenPercent) - armorPenFlat);
      finalAmount = Math.max(1, finalAmount - effectiveArmor);

      if (this.damageReduction > 0) {
        finalAmount *= Math.max(0.10, 1.0 - this.damageReduction);
      }
    }

    finalAmount = Math.round(finalAmount);

    // 3. Trừ Máu Ảo (Shield) trước nếu có
    let absorbedByShield = 0;
    if (this.shield > 0) {
      absorbedByShield = Math.min(this.shield, finalAmount);
      this.shield -= absorbedByShield;
      finalAmount -= absorbedByShield;
      if (particles && absorbedByShield > 0) {
        particles.createDamageNumber(this.x, this.y - 35, absorbedByShield, false, false, false, true); // Giáp ảo
      }
    }

    // 4. Trừ Máu Thật
    if (finalAmount > 0) {
      this.health -= finalAmount;
      this.hitFlashTimer = 0.15;

      if (this.health <= 0) {
        this.health = 0;
        this.isDead = true;
      }
    }

    return finalAmount;
  }

  update(delta, player, allEnemies, onShootCallback) {
    if (this.isDead) return;

    // === Cập nhật timers ===
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= delta;
    }

    // Slow timer
    if (this.slowTimer > 0) {
      this.slowTimer -= delta;
      if (this.slowTimer <= 0) {
        this.speedMultiplier = 1.0; // Hết chậm → khôi phục tốc độ
      }
    }

    // Bleed DOT (Xuất huyết cộng dồn - mỗi giây mất máu)
    if (this.bleedTimer > 0) {
      this.bleedTimer -= delta;
      const bleedDmgPerSecond = this.maxHealth * 0.001 * this.bleedStacks; // 0.1% × số stack
      this.health -= bleedDmgPerSecond * delta;
      if (this.health <= 0 && !this.isDead) {
        this.health = 0;
        this.isDead = true;
      }
      if (this.bleedTimer <= 0) {
        this.bleedStacks = 0;
      }
    }

    // Zone DOT (Thiêu đốt kéo dài từ Dung Nham)
    if (this.zoneDotTimer > 0) {
      this.zoneDotTimer -= delta;
      this.health -= this.zoneDotDmg * delta;
      if (this.health <= 0 && !this.isDead) {
        this.health = 0;
        this.isDead = true;
      }
    }

    if (this.isDead) return;

    this.walkCycle += delta * 6;

    // Tốc độ thực tế có tính hệ số slow
    const effectiveSpeed = this.speed * this.speedMultiplier;

    // 1. Tính toán hướng và khoảng cách tới Người chơi
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distToPlayer = Math.hypot(dx, dy);

    let moveX = 0;
    let moveY = 0;

    if (this.isRanged) {
      if (distToPlayer > this.preferredDistance + 40) {
        moveX = dx / distToPlayer;
        moveY = dy / distToPlayer;
      } else if (distToPlayer < 220) {
        moveX = -dx / distToPlayer;
        moveY = -dy / distToPlayer;
      } else {
        moveX = -dy / distToPlayer * 0.4;
        moveY = dx / distToPlayer * 0.4;
      }

      this.shootTimer -= delta;
      if (this.shootTimer <= 0) {
        this.shootTimer = this.config.shootCooldown;
        if (onShootCallback && distToPlayer < 650) {
          const shootDamage = Math.round((this.damage || 120) * 0.75); // 75% sát thương cơ bản của quái
          onShootCallback(this.x, this.y, player.x, player.y, shootDamage, { accuracy: this.accuracy || 1.0 });
        }
      }
    } else {
      if (distToPlayer > 1) {
        moveX = dx / distToPlayer;
        moveY = dy / distToPlayer;
      }
    }

    // 2. Lực đẩy tránh dính chùm (Soft Separation)
    let pushX = 0;
    let pushY = 0;
    const myRadius = this.getHitboxRadius();

    for (let i = 0; i < allEnemies.length; i++) {
      const other = allEnemies[i];
      if (other === this || other.isDead) continue;

      const diffX = this.x - other.x;
      const diffY = this.y - other.y;
      const dist = Math.hypot(diffX, diffY);
      const minDist = myRadius + other.getHitboxRadius();

      if (dist < minDist && dist > 0.001) {
        const force = (minDist - dist) / minDist;
        pushX += (diffX / dist) * force * 50;
        pushY += (diffY / dist) * force * 50;
      }
    }

    // 3. Áp dụng vận tốc di chuyển
    this.x += (moveX * effectiveSpeed + pushX) * delta;
    this.y += (moveY * effectiveSpeed + pushY) * delta;

    if (moveX > 0.1) this.facing = 'right';
    else if (moveX < -0.1) this.facing = 'left';

    const halfW = this.width / 2;
    const halfH = this.height / 2;
    this.x = Math.max(halfW, Math.min(this.x, CONFIG.WORLD_WIDTH - halfW));
    this.y = Math.max(halfH, Math.min(this.y, CONFIG.WORLD_HEIGHT - halfH));
  }

  render(ctx, camera) {
    if (this.isDead) return;

    const screenPos = camera.worldToScreen(this.x, this.y);

    if (
      screenPos.x < -100 || screenPos.x > camera.viewportWidth + 100 ||
      screenPos.y < -100 || screenPos.y > camera.viewportHeight + 100
    ) {
      return;
    }

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. Bóng dưới chân quái
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    const shadowRy = Math.max(8, this.height * 0.1);
    ctx.ellipse(screenPos.x, screenPos.y + this.height * 0.42, this.width * 0.42, shadowRy, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Chuyển động nhấp nhô
    const bobbing = Math.sin(this.walkCycle) * 3;
    const drawX = screenPos.x;
    const drawY = screenPos.y + bobbing;

    ctx.save();
    ctx.translate(drawX, drawY);

    if (this.facing === 'left') {
      ctx.scale(-1, 1);
    }

    // Vẽ sprite quái
    if (this.sprite && this.sprite.complete && this.sprite.naturalWidth > 0) {
      const ss = this.config.spriteSheet;
      if (ss) {
        // Hoạt ảnh bước đi mượt mà: lặp qua các frames theo walkCycle
        const animFrames = ss.animFrames || ss.cols;
        const frameIndex = Math.floor((this.walkCycle * 1.5) % animFrames);
        const frameW = Math.floor(this.sprite.naturalWidth / ss.cols);
        const frameH = Math.floor(this.sprite.naturalHeight / (ss.rows || 1));
        const col = frameIndex % ss.cols;
        const row = Math.floor(frameIndex / ss.cols);

        ctx.drawImage(
          this.sprite,
          col * frameW, row * frameH, frameW, frameH,
          -this.width / 2, -this.height / 2, this.width, this.height
        );
      } else {
        ctx.drawImage(
          this.sprite,
          -this.width / 2,
          -this.height / 2,
          this.width,
          this.height
        );
      }
    } else {
      ctx.fillStyle = this.config.color || '#ff4444';
      ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    }

    // Hiệu ứng màu DOT phủ trên sprite (bleed đỏ)
    if (this.bleedTimer > 0) {
      ctx.fillStyle = `rgba(200, 0, 30, ${Math.min(0.35, this.bleedStacks * 0.04)})`;
      ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    }

    // Hiệu ứng chớp trắng khi bị trúng đòn
    if (this.hitFlashTimer > 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    }

    // Overlay DOT effects
    if (this.slowTimer > 0) {
      // Viền xanh khi bị slow
      ctx.strokeStyle = 'rgba(80, 160, 255, 0.7)';
      ctx.lineWidth = 2;
      ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);
    }
    if (this.zoneDotTimer > 0) {
      // Viền cam khi bị thiêu
      ctx.strokeStyle = 'rgba(255, 120, 20, 0.7)';
      ctx.lineWidth = 2;
      ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);
    }

    ctx.restore();

    // 3. THANH MÁU TỐI ƯU (chỉ hiện khi máu bị mất)
    if (this.health < this.maxHealth) {
      const barW = Math.max(36, this.width * 0.85);
      const barH = 5;
      const barX = screenPos.x - barW / 2;
      const barY = screenPos.y - this.height * 0.62;

      ctx.fillStyle = 'rgba(10, 10, 15, 0.8)';
      ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

      const healthPercent = Math.max(0, this.health / this.maxHealth);
      ctx.fillStyle = '#e63946'; // Đồng bộ thanh máu màu đỏ chuẩn cho tất cả quái
      ctx.fillRect(barX, barY, barW * healthPercent, barH);

      // Hiện số stack Bleed nếu đang chảy máu
      if (this.bleedStacks > 0 && this.bleedTimer > 0) {
        ctx.fillStyle = '#ff2255';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`🩸×${this.bleedStacks}`, screenPos.x, barY - 3);
      }
    }

    ctx.restore();
  }
}
