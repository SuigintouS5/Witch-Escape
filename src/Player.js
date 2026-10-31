import { CONFIG } from './config.js';

export class Player {
  constructor(startX, startY, charConfig = null, metaBonuses = null, challengeModifiers = {}, masteryBonuses = null) {
    this.x = startX;
    this.y = startY;

    const char = charConfig || CONFIG.CHARACTERS[0] || CONFIG.PLAYER;
    this.charConfig = char;
    this.challenges = challengeModifiers || {};
    this.masteryBonuses = masteryBonuses || {};

    this.width = char.width || CONFIG.PLAYER.WIDTH;
    this.height = char.height || CONFIG.PLAYER.HEIGHT;

    // Chỉ số cơ bản có cộng bonus từ Meta Upgrades & Thông Thạo (Mastery)
    const bonusHp = (metaBonuses ? metaBonuses.bonusHealth : 0) + (this.masteryBonuses.bonusHealth || 0);
    const speedMult = (metaBonuses ? metaBonuses.bonusSpeedMult : 1.0) * (this.masteryBonuses.bonusSpeedMult || 1.0);
    const bonusCrit = (metaBonuses ? metaBonuses.bonusCritChance : 0) + (this.masteryBonuses.bonusCritChance || 0);
    const metaDmg = (metaBonuses && metaBonuses.bonusDamageMult) ? metaBonuses.bonusDamageMult : 1.0;
    const metaArmor = (metaBonuses && metaBonuses.bonusArmor) ? metaBonuses.bonusArmor : 0;

    let calcSpeed = (char.baseSpeed || CONFIG.PLAYER.BASE_SPEED) * speedMult;
    let calcHp = (char.maxHealth || CONFIG.PLAYER.MAX_HEALTH) + bonusHp;

    // Áp dụng Thử Thách (Challenge Modifiers)
    if (this.challenges.less_speed) {
      calcSpeed *= 0.60; // Giảm 40% tốc độ
    }
    if (this.challenges.less_health) {
      calcHp = Math.max(1, Math.round(calcHp * 0.50)); // Giảm 50% máu
    }
    if (this.challenges.one_hit_death) {
      calcHp = 1; // Chỉ có đúng 1 máu
    }

    this.speed = calcSpeed;
    this.maxHealth = calcHp;
    this.health = this.maxHealth;

    this.noHeal = !!this.challenges.no_heal;
    this.lessDamage = !!this.challenges.less_damage;
    this.moreIncomingDamage = !!this.challenges.more_incoming_damage;

    // --- HỆ THỐNG CHỈ SỐ CHIẾN ĐẤU MỞ RỘNG (COMBAT SYSTEM) ---
    // Giáp (Điểm Phòng Ngự trừ sát thương cứng = Giáp nhân vật + Giáp Shop Cổ Viện + Giáp Cây Kỹ Năng)
    this.armor = (char.baseArmor || 0) + metaArmor + (this.masteryBonuses.bonusArmor || 0);
    // Hệ số Giảm Sát Thương % (độc lập với Giáp)
    this.damageReduction = this.masteryBonuses.damageReduction || 0;
    // Chính Xác & Né Tránh
    this.accuracy = char.accuracy || CONFIG.PLAYER.BASE_ACCURACY || 1.0;
    this.dodge = char.dodgeRate || CONFIG.PLAYER.BASE_DODGE || 0.05;
    // Xuyên Giáp
    this.armorPenFlat = 0;
    this.armorPenPercent = 0;
    // Máu Ảo (Thanh Trắng đè lên thanh Máu đỏ)
    this.shield = 0;
    this.maxShield = this.maxHealth;

    // Thông số bổ trợ từ Thông Thạo (Mastery) & Nâng Cấp Vĩnh Viễn (Meta)
    this.lifesteal = this.masteryBonuses.lifesteal || 0;
    this.masteryRegen = this.masteryBonuses.bonusRegen || 0;
    this.metaDmgMult = metaDmg;
    this.masteryDmgMult = 1.0 + (this.masteryBonuses.bonusDamageMult || 0);
    this.totalDmgMult = this.metaDmgMult * this.masteryDmgMult;
    this.pickupRangeBonus = this.masteryBonuses.bonusPickupRange || 0;
    this.specialMasteryLevel = this.masteryBonuses.specialMasteryLevel || 0;

    // --- HỆ THỐNG CHỈ SỐ PHẢN SÁT THƯƠNG (REFLECT DAMAGE / THORNS SYSTEM) ---
    // 1. Phản sát thương cố định (Flat Thorns)
    this.baseReflectFlat = (char.baseReflectFlat || 0);
    this.masteryReflectFlat = (char.id === 'dark_knight' ? (this.specialMasteryLevel * 250) : 0);
    this.thornsItemLevel = 0;
    this.reflectFlat = this.baseReflectFlat + this.masteryReflectFlat;

    // 2. Phản sát thương theo % (Percent Reflect)
    this.baseReflectPercent = (char.baseReflectPercent || 0);
    this.masteryReflectPercent = (char.id === 'dark_knight' ? (this.specialMasteryLevel * 0.02) : 0);
    this.reflectPercent = this.baseReflectPercent + this.masteryReflectPercent;

    // Debuff slow
    this.slowTimer = 0;
    this.slowMult = 1.0;

    // Chỉ số Chí Mạng (Crit System)
    this.critChance = (char.critChance || CONFIG.PLAYER.BASE_CRIT_CHANCE) + bonusCrit;
    this.critDamage = (char.critDamage || CONFIG.PLAYER.BASE_CRIT_DAMAGE) + (this.masteryBonuses.bonusCritDamage || 0);

    this.invincibilityTimer = 0;
    this.isDead = false;

    this.facing = 'right'; // 'left' hoặc 'right'
    this.isMoving = false;

    // Tải ảnh nhân vật
    this.spriteLoaded = false;
    this.sprite = new Image();
    this.sprite.src = char.sprite || CONFIG.PLAYER.SPRITE_SRC;

    this.sprite.onload = () => {
      this.spriteLoaded = true;
    };

    this.sprite.onerror = () => {
      console.warn('Failed to load primary sprite, trying fallback...');
      this.sprite.src = CONFIG.PLAYER.FALLBACK_SRC;
    };

    this.walkCycle = 0;
    this.hitFlashTimer = 0;

    // Hệ thống Phù Thủy (Witch System)
    this.isWitch = false;
    this.hasWitchForm = !!char.witchSprite;
    this.witchSpriteSrc = char.witchSprite || null;
    this.witchKillRequirement = char.witchKillRequirement || 100;
    this.witchDmgMult = 1.0;
    this.witchAuraAngle = 0;

    // Tải trước ảnh Witch Form nếu có
    this.witchSprite = null;
    this.witchSpriteLoaded = false;
    if (this.witchSpriteSrc) {
      this.witchSprite = new Image();
      this.witchSprite.src = this.witchSpriteSrc;
      this.witchSprite.onload = () => {
        this.witchSpriteLoaded = true;
      };
    }
  }

  // Thức tỉnh hình thái Phù Thủy vĩnh viễn
  awakenWitchForm() {
    if (this.isWitch || !this.hasWitchForm) return false;
    this.isWitch = true;

    // Chỉ số tăng vĩnh viễn (Cân bằng cho dạng vĩnh viễn)
    this.maxHealth += 50;
    this.health = this.maxHealth; // Hồi đầy máu khi thức tỉnh

    this.speed *= 1.20; // +20% Tốc độ chạy
    this.critChance += 0.10; // +10% Tỉ lệ chí mạng
    this.critDamage += 0.30; // +30% Sát thương chí mạng (ví dụ 2.0 -> 2.3)
    this.witchDmgMult = 1.30; // +30% Sát thương toàn vũ khí

    // Chuyển sang sprite Witch Form (hiro1.png)
    if (this.witchSprite) {
      this.sprite = this.witchSprite;
      this.spriteLoaded = this.witchSpriteLoaded;
    }
    return true;
  }

  // Áp dụng Debuff
  applyDebuff(type, value, duration) {
    if (type === 'slow') {
      this.slowMult = Math.max(0.2, 1.0 - value);
      this.slowTimer = duration;
    }
  }

  // Hồi máu (có kiểm tra thử thách Không Hồi Máu)
  heal(amount) {
    if (this.isDead || this.noHeal) return 0;
    const oldHp = this.health;
    this.health = Math.min(this.maxHealth, this.health + amount);
    return this.health - oldHp;
  }

  // Bán kính va chạm với quái
  getHitboxRadius() {
    return this.width * 0.35;
  }

  // Thêm Máu Ảo (Shield)
  addShield(amount, maxCap = null) {
    const cap = maxCap || (this.maxHealth * 1.5);
    this.maxShield = Math.max(this.maxShield, cap);
    this.shield = Math.min(cap, this.shield + amount);
    return this.shield;
  }

  // Nhận Sát Thương có tính Né Tránh, Giáp, Giảm Sát Thương % và Máu Ảo
  takeDamage(amount, options = {}, particles = null) {
    if (this.isDead || this.invincibilityTimer > 0) return false;

    const attackerAcc = options.attackerAccuracy !== undefined ? options.attackerAccuracy : 1.0;
    const isTrueDamage = !!options.isTrueDamage;
    const armorPenFlat = options.armorPenFlat || 0;
    const armorPenPercent = options.armorPenPercent || 0;

    // 1. Kiểm tra Né Tránh vs Chính Xác (Tầng 1)
    const hitChance = Math.min(1.0, Math.max(0.05, attackerAcc - this.dodge));
    if (Math.random() > hitChance) {
      if (particles) {
        particles.createDamageNumber(this.x, this.y - 25, 0, false, false, true); // Chữ "NÉ!"
      }
      return false; // Né đòn thành công
    }

    let finalAmount = amount;

    // 2. Tính Giáp & Hệ số Giảm Sát Thương % (nếu không phải Sát Thương Chuẩn)
    if (!isTrueDamage) {
      const effectiveArmor = Math.max(0, this.armor * (1.0 - armorPenPercent) - armorPenFlat);
      finalAmount = Math.max(1, finalAmount - effectiveArmor);

      if (this.damageReduction > 0) {
        finalAmount *= Math.max(0.10, 1.0 - this.damageReduction);
      }
    }

    // Chịu thêm 50% dmg nếu có thử thách
    if (this.moreIncomingDamage) {
      finalAmount *= 1.5;
    }

    finalAmount = Math.round(finalAmount);

    // 3. Trừ Máu Ảo (Thanh Trắng) trước
    let absorbedByShield = 0;
    if (this.shield > 0) {
      absorbedByShield = Math.min(this.shield, finalAmount);
      this.shield -= absorbedByShield;
      finalAmount -= absorbedByShield;
    }

    if (particles && absorbedByShield > 0) {
      particles.createDamageNumber(this.x, this.y - 35, absorbedByShield, false, false, false, true); // Màu giáp ảo
    }

    // 4. Phần sát thương dư thừa trừ vào Máu Thật
    if (finalAmount > 0) {
      this.health = Math.max(0, this.health - finalAmount);
      this.hitFlashTimer = 0.18; // Chớp đỏ

      if (particles && absorbedByShield === 0) {
        particles.createDamageNumber(this.x, this.y - 20, finalAmount, false, isTrueDamage);
      }

      if (this.health <= 0) {
        this.health = 0;
        this.isDead = true;
      }
    }

    this.invincibilityTimer = CONFIG.PLAYER.INVINCIBILITY_DURATION;
    return true;
  }

  // Cập nhật lại chỉ số Phản Sát Thương khi nhặt / nâng cấp Áo Gai Ma Thần
  updateReflectStats() {
    const itemFlat = this.thornsItemLevel > 0 ? (this.thornsItemLevel * 200) : 0;
    const itemPercent = this.thornsItemLevel > 0 ? (this.thornsItemLevel * 0.05) : 0;

    this.reflectFlat = this.baseReflectFlat + this.masteryReflectFlat + itemFlat;
    this.reflectPercent = this.baseReflectPercent + this.masteryReflectPercent + itemPercent;
  }

  // Tính toán sát thương phản đòn dựa trên sát thương của kẻ địch đánh vào
  getReflectDamage(incomingDamage = 0) {
    if (this.reflectFlat <= 0 && this.reflectPercent <= 0) return 0;
    const fromPercent = Math.round(incomingDamage * (this.reflectPercent || 0));
    return Math.max(1, Math.round((this.reflectFlat || 0) + fromPercent));
  }

  update(delta, input) {
    if (this.isDead) return;

    // Hồi máu liên tục từ Thông Thạo Huyết Mạch Tái Sinh
    if (this.masteryRegen > 0 && !this.noHeal && this.health < this.maxHealth) {
      this.heal(this.masteryRegen * delta);
    }

    // Giảm thời gian bất tử
    if (this.invincibilityTimer > 0) {
      this.invincibilityTimer -= delta;
    }
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= delta;
    }

    // Debuff slow timer
    if (this.slowTimer > 0) {
      this.slowTimer -= delta;
      if (this.slowTimer <= 0) {
        this.slowMult = 1.0;
      }
    }

    const move = input.getMovementVector();
    this.isMoving = (move.x !== 0 || move.y !== 0);

    const effSpeed = this.speed * this.slowMult;

    if (this.isMoving) {
      this.x += move.x * effSpeed * delta;
      this.y += move.y * effSpeed * delta;

      if (move.x > 0) this.facing = 'right';
      else if (move.x < 0) this.facing = 'left';

      this.walkCycle += delta * 10;
    } else {
      this.walkCycle = 0;
    }

    // Giữ người chơi không vượt ra ngoài biên bản đồ rừng
    const halfW = this.width / 2;
    const halfH = this.height / 2;
    this.x = Math.max(halfW, Math.min(this.x, CONFIG.WORLD_WIDTH - halfW));
    this.y = Math.max(halfH, Math.min(this.y, CONFIG.WORLD_HEIGHT - halfH));
  }

  // Hàm tính toán sát thương có kèm tỉ lệ chí mạng & bổ trợ Shop Vĩnh Viễn + Thông Thạo
  rollDamage(baseDmg, isTrueDamage = false, extraPenFlat = 0, extraPenPercent = 0) {
    let calcDmg = baseDmg * (this.totalDmgMult || 1.0);

    // Kỹ năng Tinh Hoa Thông Thạo của Hắc Kiếm Sĩ: Đứng yên tăng thêm 20% sát thương
    if (this.charConfig && this.charConfig.id === 'dark_knight' && this.specialMasteryLevel > 0 && !this.isMoving) {
      calcDmg *= 1.20;
    }

    if (this.lessDamage) {
      calcDmg *= 0.5; // Giảm 50% dmg nếu có thử thách
    }

    const isCrit = Math.random() < this.critChance;
    const finalDamage = isCrit ? Math.round(calcDmg * this.critDamage) : Math.round(calcDmg);

    // Hiệu ứng Hút Máu từ Cây Kỹ Năng Thông Thạo (Hấp Huyết Ma Pháp)
    if (this.lifesteal > 0 && !this.noHeal && !this.isDead && this.health < this.maxHealth) {
      const healed = finalDamage * this.lifesteal;
      if (healed >= 1) {
        this.heal(healed);
      }
    }

    return {
      damage: finalDamage,
      isCrit,
      isTrueDamage: !!isTrueDamage,
      armorPenFlat: (this.armorPenFlat || 0) + extraPenFlat,
      armorPenPercent: (this.armorPenPercent || 0) + extraPenPercent,
      accuracy: this.accuracy || 1.0
    };
  }

  render(ctx, camera) {
    const screenPos = camera.worldToScreen(this.x, this.y);

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. Bóng dưới chân nhân vật
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(screenPos.x, screenPos.y + this.height * 0.42, this.width * 0.45, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // 1.5. Hào quang ma thuật xoay dưới chân khi ở dạng Witch Form
    if (this.isWitch) {
      this.witchAuraAngle += 0.035;
      ctx.save();
      ctx.translate(screenPos.x, screenPos.y + this.height * 0.2);
      ctx.rotate(this.witchAuraAngle);

      const auraGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, this.width * 0.95);
      auraGrad.addColorStop(0, 'rgba(192, 38, 211, 0.45)');
      auraGrad.addColorStop(0.65, 'rgba(124, 58, 237, 0.25)');
      auraGrad.addColorStop(1, 'rgba(88, 28, 135, 0.0)');
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(0, 0, this.width * 0.95, 0, Math.PI * 2);
      ctx.fill();

      // Vòng tròn ma trận phép thuật
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.55)';
      ctx.lineWidth = 1.8;
      ctx.strokeRect(-this.width * 0.5, -this.width * 0.5, this.width, this.width);
      ctx.restore();
    }

    // 2. Hiệu ứng nhấp nhô khi bước đi
    const bobbing = this.isMoving ? Math.sin(this.walkCycle) * 3 : 0;
    const drawX = screenPos.x;
    const drawY = screenPos.y + bobbing;

    ctx.save();
    ctx.translate(drawX, drawY);

    if (this.facing === 'left') {
      ctx.scale(-1, 1);
    }

    // Hiệu ứng chớp sáng khi bị dính đòn (I-frames)
    if (this.invincibilityTimer > 0) {
      const flash = Math.floor(this.invincibilityTimer * 20) % 2 === 0;
      if (flash) {
        ctx.globalAlpha = 0.45;
      }
    }

    if (this.spriteLoaded) {
      // Đối với ảnh vẽ nhân vật chi tiết (như hiro.png và hiro1.png), bật smoothing để ảnh hiển thị mượt mà
      if (!this.charConfig || !this.charConfig.spriteSheet) {
        ctx.imageSmoothingEnabled = true;
      }

      if (this.charConfig && this.charConfig.spriteSheet) {
        const ss = this.charConfig.spriteSheet;
        const totalFrames = ss.cols * ss.rows;
        const frameIndex = this.isMoving ? Math.floor((this.walkCycle * 1.5) % totalFrames) : 0;
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
        // Tự động giữ đúng tỷ lệ hình ảnh gốc (Aspect Ratio) để không bị méo hình
        const naturalW = this.sprite.naturalWidth || 1;
        const naturalH = this.sprite.naturalHeight || 1;
        const aspect = naturalW / naturalH;
        const drawH = this.height;
        const drawW = drawH * aspect;

        ctx.drawImage(
          this.sprite,
          -drawW / 2,
          -drawH / 2,
          drawW,
          drawH
        );
      }

      // Hiệu ứng ánh đỏ phủ lên khi vừa mất máu
      if (this.hitFlashTimer > 0) {
        ctx.fillStyle = 'rgba(255, 30, 30, 0.45)';
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
      }
    } else {
      ctx.fillStyle = '#6b2d82';
      ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    }

    ctx.restore();
    ctx.restore();
  }
}
