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
    const speedMult = (metaBonuses ? metaBonuses.bonusSpeedMult : 1.0) * (this.masteryBonuses.bonusSpeedMult || 1.0);
    const bonusCrit = (metaBonuses ? metaBonuses.bonusCritChance : 0) + (this.masteryBonuses.bonusCritChance || 0);
    const metaDmg = (metaBonuses && metaBonuses.bonusDamageMult) ? metaBonuses.bonusDamageMult : 1.0;

    let calcSpeed = (char.baseSpeed || CONFIG.PLAYER.BASE_SPEED) * speedMult;
    const hpPercentBonus = (metaBonuses && metaBonuses.healthBonusPercent) ? metaBonuses.healthBonusPercent : 0;
    let calcHp = Math.round(((char.maxHealth || CONFIG.PLAYER.MAX_HEALTH) + (this.masteryBonuses.bonusHealth || 0)) * (1.0 + hpPercentBonus));

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
    this.curseEnemyDamageMult = (metaBonuses && metaBonuses.curseEnemyDamageMult) ? metaBonuses.curseEnemyDamageMult : 1.0;

    // --- HỆ THỐNG CHỈ SỐ CHIẾN ĐẤU MỞ RỘNG (COMBAT SYSTEM) ---
    // Giáp (Điểm Phòng Ngự trừ sát thương cứng có tính % cộng từ Shop Cổ Viện)
    const baseArm = (char.baseArmor || 0) + (this.masteryBonuses.bonusArmor || 0);
    const armorPct = (metaBonuses && metaBonuses.armorPercentBonus) ? metaBonuses.armorPercentBonus : 0;
    this.armor = Math.round(baseArm * (1.0 + armorPct));

    // Hệ số Giảm Sát Thương % (độc lập với Giáp, tối đa 50%)
    const metaDR = (metaBonuses && metaBonuses.damageReduction) ? metaBonuses.damageReduction : 0;
    this.damageReduction = Math.min(0.50, (this.masteryBonuses.damageReduction || 0) + metaDR);

    // Chính Xác & Né Tránh (bổ trợ từ Thông Thạo Mastery)
    this.accuracy = (char.accuracy || CONFIG.PLAYER.BASE_ACCURACY || 1.0) + (this.masteryBonuses.accuracyBonus || 0);
    this.dodge = (char.dodgeRate || CONFIG.PLAYER.BASE_DODGE || 0.05) + (this.masteryBonuses.bonusDodge || 0);
    this.dodgeHealPercent = this.masteryBonuses.dodgeHealPercent || 0;

    // Xuyên Giáp (bổ trợ từ Thông Thạo Mastery)
    this.armorPenFlat = this.masteryBonuses.armorPenFlat || 0;
    this.armorPenPercent = this.masteryBonuses.armorPenPercent || 0;
    this.masteryAreaMult = 1.0 + (this.masteryBonuses.bonusAreaMult || 0);

    // Keystone Bất Tử Niết Bàn (1 LẦN DUY NHẤT TRONG TRẬN)
    this.hasPhoenixRevive = !!(this.masteryBonuses && this.masteryBonuses.hasPhoenixRevive);
    this.phoenixReviveUsed = false;

    // Keystone Diệt Thế Bạo Kích & Kỹ Năng Cuồng Phong
    this.hasDiệtThếCrit = !!(this.masteryBonuses && this.masteryBonuses.hasDiệtThếCrit);
    this.critSurgeLevel = this.masteryBonuses.critSurgeLevel || 0;
    this.critSurgeTimer = 0;
    this.executeDamageLowHp = this.masteryBonuses.executeDamageLowHp || 0;

    // Máu Ảo (Thanh Trắng đè lên thanh Máu đỏ)
    this.shield = 0;
    this.maxShield = this.maxHealth;

    // Thông số bổ trợ từ Thông Thạo (Mastery) & Nâng Cấp Vĩnh Viễn (Meta)
    this.lifesteal = this.masteryBonuses.lifesteal || 0;
    const metaHpRegen = (metaBonuses && metaBonuses.hpRegenPerSec) ? metaBonuses.hpRegenPerSec : 0;
    this.masteryRegen = (this.masteryBonuses.bonusRegen || 0) + metaHpRegen;
    this.metaDmgMult = metaDmg;
    this.masteryDmgMult = 1.0 + (this.masteryBonuses.bonusDamageMult || 0);
    this.totalDmgMult = this.metaDmgMult * this.masteryDmgMult;
    this.pickupRangeBonus = this.masteryBonuses.bonusPickupRange || 0;
    this.metaPickupRangeMult = (metaBonuses && metaBonuses.bonusPickupRangeMult) ? metaBonuses.bonusPickupRangeMult : 1.0;
    this.specialMasteryLevel = this.masteryBonuses.specialMasteryLevel || 0;

    // --- HỆ THỐNG CHỈ SỐ PHẢN SÁT THƯƠNG (REFLECT DAMAGE / THORNS SYSTEM) ---
    // 1. Phản sát thương cố định (Flat Thorns)
    this.baseReflectFlat = (char.baseReflectFlat || 0);
    this.masteryReflectFlat = (this.masteryBonuses.bonusReflectFlat || 0) + (char.id === 'dark_knight' ? (this.specialMasteryLevel * 150) : 0);
    this.thornsItemLevel = 0;
    this.reflectFlat = this.baseReflectFlat + this.masteryReflectFlat;

    // 2. Phản sát thương theo % (Percent Reflect)
    this.baseReflectPercent = (char.baseReflectPercent || 0);
    this.masteryReflectPercent = (this.masteryBonuses.bonusReflectPercent || 0);
    this.reflectPercent = this.baseReflectPercent + this.masteryReflectPercent;

    // Debuff slow
    this.slowTimer = 0;
    this.slowMult = 1.0;

    // Chỉ số Chí Mạng (Crit System)
    this.baseCritChance = (char.critChance || CONFIG.PLAYER.BASE_CRIT_CHANCE) + bonusCrit;
    this.critChance = this.baseCritChance;
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

    // Hệ Thống Sách Tri Thức (Book System)
    this.bookStats = null;
    this.bookSystemRef = null;
    this.bonusGreedMult = 1.0;
    this.metaGoldMult = (metaBonuses && metaBonuses.goldMultiplier) ? metaBonuses.goldMultiplier : 1.0;
    this.cooldownReduction = 0;

    // Kỹ năng đặc biệt riêng của nhân vật (Kích hoạt bằng phím G)
    const baseCd = 8.0;
    const finalCd = Math.max(2.0, baseCd * (1.0 - (metaBonuses && metaBonuses.specialSkillCDR ? metaBonuses.specialSkillCDR : 0)));
    this.specialSkill = {
      id: 'special_g',
      name: 'Kỹ Năng Đặc Biệt',
      hotkey: 'G',
      cooldown: 0,
      maxCooldown: finalCd,
      isUnlocked: !!(metaBonuses && metaBonuses.isSpecialSkillUnlocked),
      isReady: true,
      desc: 'Kỹ năng đặc biệt [Phím G] - Đang để trống chờ thiết lập hiệu ứng'
    };
    this.enhanceSpecialAndMain = (metaBonuses && metaBonuses.enhanceSpecialAndMain) ? metaBonuses.enhanceSpecialAndMain : 0;
  }

  // Kết nối Hệ Thống Sách Tri Thức
  setBookSystem(bookSystem) {
    this.bookSystemRef = bookSystem;
    this.updateBookStats();
  }

  updateBookStats() {
    if (this.bookSystemRef) {
      this.bookStats = this.bookSystemRef.getBonusStats(this);
      if (this.bookStats) {
        this.cooldownReduction = this.bookStats.cooldownReduction || 0;
      }
    }
  }

  // Lấy hệ số tăng kích thước vũ khí & diện tích quét đòn từ Sách Tri Thức và Cây Kỹ Năng
  getAreaMultiplier() {
    const bookArea = (this.bookStats && this.bookStats.areaMult) ? this.bookStats.areaMult : 1.0;
    const masteryArea = this.masteryAreaMult || 1.0;
    return bookArea * masteryArea;
  }

  // Xử lý hiệu ứng phụ khi đòn đánh vũ khí / đạn trúng quái (VD: Neil Postman 20% thiêu đốt)
  onHitEnemy(enemy, rawDmg = 50, particles = null) {
    if (!enemy || enemy.isDead) return;
    const bookStats = this.bookStats;
    if (!bookStats) return;

    // Neil Postman: burnChance (20% đòn đánh đốt cháy quái)
    if (bookStats.burnChance > 0 && Math.random() < bookStats.burnChance) {
      const durationMult = 1.0 + (bookStats.dotDurationMult || 0);
      const dotDmgMult = 1.0 + (bookStats.dotDmgMult || 0);
      const burnDuration = 4.0 * durationMult;
      const burnDps = Math.max(30, rawDmg * 0.25) * dotDmgMult;

      enemy.zoneDotTimer = Math.max(enemy.zoneDotTimer || 0, burnDuration);
      enemy.zoneDotDmg = Math.max(enemy.zoneDotDmg || 0, burnDps);
      if (particles && particles.createHitSparks) {
        particles.createHitSparks(enemy.x, enemy.y, 10);
      }
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
    if (this.bookSystemRef && this.bookSystemRef.hasBook('beauvoir')) return; // Miễn dịch hiệu ứng xấu (Simone de Beauvoir)
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
    // Bất tử khi kích hoạt Beauvoir hoặc Hồi sinh Macondo
    if (this.bookSystemRef && (this.bookSystemRef.beauvoirInvincibleTimer > 0 || this.bookSystemRef.marquezCheatDeathActive > 0)) return false;

    const attackerAcc = options.attackerAccuracy !== undefined ? options.attackerAccuracy : 1.0;
    const isTrueDamage = !!options.isTrueDamage;
    const armorPenFlat = options.armorPenFlat || 0;
    const armorPenPercent = options.armorPenPercent || 0;
    const attackerEnemy = options.attacker || null;

    // 1. Kiểm tra Né Tránh vs Chính Xác (Tầng 1 - có cộng Né từ Sách & Thông Thạo)
    const bookDodge = this.bookStats ? (this.bookStats.dodge || 0) : 0;
    const effectiveDodge = Math.min(0.80, this.dodge + bookDodge);
    const hitChance = Math.min(1.0, Math.max(0.05, attackerAcc - effectiveDodge));
    if (Math.random() > hitChance) {
      // Kỹ năng Thần Tốc Né Đòn: Né thành công hồi phục % Máu
      if (this.dodgeHealPercent > 0 && !this.noHeal && this.health < this.maxHealth) {
        this.heal(Math.round(this.maxHealth * this.dodgeHealPercent), particles);
      }
      if (particles) {
        particles.createDamageNumber(this.x, this.y - 25, 0, false, false, true); // Chữ "NÉ!"
      }
      return false; // Né đòn thành công
    }

    let finalAmount = amount;

    // 2. Tính Giáp & Hệ số Giảm Sát Thương % (nếu không phải Sát Thương Chuẩn)
    if (!isTrueDamage) {
      const armorMult = this.bookStats ? (this.bookStats.armorMult || 1.0) : 1.0;
      const armorFlatBonus = this.bookStats ? (this.bookStats.armorFlat || 0) : 0;
      const effectiveArmor = Math.max(0, ((this.armor + armorFlatBonus) * armorMult) * (1.0 - armorPenPercent) - armorPenFlat);
      const preArmorDamage = finalAmount;
      finalAmount = Math.max(1, finalAmount - effectiveArmor);
      const blockedByArmor = preArmorDamage - finalAmount;

      // Spinoza: Xung Kích Hình Học (Geometric Shockwave) phản lại 150% lượng sát thương giáp chặn
      if (this.bookStats && this.bookStats.spinozaSubstantia && blockedByArmor > 0) {
        const reflectDmg = Math.round(blockedByArmor * 1.50);
        if (typeof window !== 'undefined' && window.__gameInstance && typeof window.__gameInstance.triggerSpinozaGeometricPulse === 'function') {
          window.__gameInstance.triggerSpinozaGeometricPulse(this.x, this.y, reflectDmg);
        }
      }

      const totalDmgReduction = Math.min(0.75, this.damageReduction + (this.bookStats ? (this.bookStats.damageReduction || 0) : 0));
      if (totalDmgReduction > 0) {
        finalAmount *= Math.max(0.10, 1.0 - totalDmgReduction);
      }
    }

    // Chịu thêm 50% dmg nếu có thử thách
    if (this.moreIncomingDamage) {
      finalAmount *= 1.5;
    }

    // Tăng sát thương nhận vào từ Nâng Cấp Nguyền Rủa (Curse Enemy Damage: +200%/cấp)
    if (this.curseEnemyDamageMult && this.curseEnemyDamageMult > 1.0) {
      finalAmount *= this.curseEnemyDamageMult;
    }

    finalAmount = Math.round(finalAmount);

    // Kiểm tra Cơ chế Butler (Pha Hóa Giải: chuyển 100% sát thương thành Khiên và phản đòn 30% sát thương chuẩn)
    if (this.bookStats && this.bookStats.hasButlerAbsorption) {
      this.addShield(finalAmount);
      if (particles) {
        particles.createDamageNumber(this.x, this.y - 30, finalAmount, false, false, false, true, '#ec4899');
      }
      if (attackerEnemy && typeof attackerEnemy.takeDamage === 'function') {
        attackerEnemy.takeDamage(Math.round(finalAmount * 0.30), { isTrueDamage: true }, particles);
      }
      this.invincibilityTimer = CONFIG.PLAYER.INVINCIBILITY_DURATION;
      return false;
    }

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

      // Ghi nhận sát thương vào Sách Tri Thức (Kafka trừ stack, Shakespeare reset timer, Dumas theo dõi quái)
      if (this.bookSystemRef) {
        this.bookSystemRef.onPlayerTakeDamage(attackerEnemy, finalAmount, true);
      }

      if (this.health <= 0) {
        // 1. Kiểm tra Bất Tử Niết Bàn từ Cây Kỹ Năng Thông Thạo (KÍCH HOẠT 1 LẦN DUY NHẤT / TRẬN)
        if (this.hasPhoenixRevive && !this.phoenixReviveUsed) {
          this.phoenixReviveUsed = true;
          this.health = Math.round(this.maxHealth * 0.50);
          this.invincibilityTimer = 3.0; // Bất tử 3.0 giây
          if (particles) {
            particles.createDamageNumber(this.x, this.y - 45, 0, false, false, false, false, '#10b981');
            particles.createHitSparks(this.x, this.y, 45);
            particles.createArcaneBlast(this.x, this.y, 3.0);
          }
          if (typeof window !== 'undefined' && window.__gameInstance && typeof window.__gameInstance.showGameToast === 'function') {
            window.__gameInstance.showGameToast('👑 BẤT TỬ NIẾT BÀN: Hồi 50% Máu & Bất Tử 3s! (Đã dùng 1 lần duy nhất)', '#10b981');
          }
        }
        // 2. Kiểm tra Hồi Sinh Macondo từ Gabriel García Márquez (Hồi 100% HP, đóng băng 3s, mưa hoa vàng)
        else if (this.bookSystemRef && this.bookSystemRef.hasBook('marquez') && this.bookSystemRef.marquezCheatDeathCooldown <= 0) {
          this.bookSystemRef.marquezCheatDeathCooldown = 240.0;
          this.bookSystemRef.marquezCheatDeathActive = 3.0;
          this.health = this.maxHealth;
          this.invincibilityTimer = 3.0;
          if (particles) {
            particles.createDamageNumber(this.x, this.y - 45, 0, false, false, false, false, '#ffd700');
            particles.createHitSparks(this.x, this.y, 45);
          }
          if (typeof window !== 'undefined' && window.__gameInstance && typeof window.__gameInstance.triggerMarquezMacondo === 'function') {
            window.__gameInstance.triggerMarquezMacondo(this.x, this.y);
          }
        }
        // 3. Kiểm tra Hồi Sinh từ Đại Tác Phẩm Hợp Thể (Lacan / Derrida / Marx)
        else if (this.bookSystemRef && this.bookSystemRef.hasExtraLife()) {
          const revivePercent = this.bookSystemRef.consumeExtraLife();
          this.health = Math.max(1, Math.round(this.maxHealth * revivePercent));
          this.invincibilityTimer = 2.5; // Bất tử 2.5s khi hồi sinh
          if (particles) {
            particles.createDamageNumber(this.x, this.y - 45, 0, false, false, false, false, '#ffd700');
            particles.createHitSparks(this.x, this.y, 25);
          }
        } else {
          this.health = 0;
          this.isDead = true;
        }
      }
    } else if (absorbedByShield > 0) {
      // Khi chỉ bị đánh vào Máu Ảo, không tính là mất máu thật (Shakespeare không bị reset)
      if (this.bookSystemRef) {
        this.bookSystemRef.onPlayerTakeDamage(attackerEnemy, absorbedByShield, false);
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
    const bookReflect = this.bookStats ? (this.bookStats.reflectPercent || 0) : 0;
    const totalReflectPercent = (this.reflectPercent || 0) + bookReflect;
    if (this.reflectFlat <= 0 && totalReflectPercent <= 0) return 0;
    const fromPercent = Math.round(incomingDamage * totalReflectPercent);
    return Math.max(1, Math.round((this.reflectFlat || 0) + fromPercent));
  }

  update(delta, input) {
    if (this.isDead) return;

    // Cập nhật chỉ số từ Hệ Thống Sách Tri Thức liên tục
    this.updateBookStats();

    // Đặt lại hạn mức hút máu mỗi giây
    this.lifestealSecTimer = (this.lifestealSecTimer || 0) + delta;
    if (this.lifestealSecTimer >= 1.0) {
      this.lifestealSecTimer = 0;
      this.lifestealHealedThisSecond = 0;
    }

    // Cập nhật Bản Sao Bóng Ma Hộ Vệ (Lacan Echo Stand)
    if (this.bookStats && this.bookStats.hasLacanPhantomStand) {
      if (this.phantomX === undefined) {
        this.phantomX = this.x - 70;
        this.phantomY = this.y - 25;
      }
      const targetOffX = (this.facingRight ? -75 : 75);
      const targetOffY = -25 + Math.sin(Date.now() * 0.005) * 8;
      this.phantomX += (this.x + targetOffX - this.phantomX) * 0.12;
      this.phantomY += (this.y + targetOffY - this.phantomY) * 0.12;

      // Bản sao hộ vệ tấn công sau lưng mỗi 0.8s (gây 50% sát thương)
      this.phantomAttackTimer = (this.phantomAttackTimer || 0) + delta;
      if (this.phantomAttackTimer >= 0.80) {
        this.phantomAttackTimer = 0;
        if (typeof window !== 'undefined' && window.__gameInstance && typeof window.__gameInstance.triggerLacanPhantomAttack === 'function') {
          window.__gameInstance.triggerLacanPhantomAttack(this.phantomX, this.phantomY, !this.facingRight);
        }
      }
    }

    // Hồi chiêu kỹ năng đặc biệt [G]
    if (this.specialSkill) {
      if (this.specialSkill.cooldown > 0) {
        this.specialSkill.cooldown = Math.max(0, this.specialSkill.cooldown - delta);
      }
      this.specialSkill.isReady = this.specialSkill.cooldown <= 0;
    }

    // Thời gian tăng tốc Cuồng Phong Đoạt Mệnh khi nổ chí mạng
    if (this.critSurgeTimer > 0) {
      this.critSurgeTimer -= delta;
    }

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

    const bookSpeedMult = this.bookStats ? (this.bookStats.speedMult || 1.0) : 1.0;
    const surgeMult = (this.critSurgeTimer > 0 && this.critSurgeLevel > 0) ? (1.0 + this.critSurgeLevel * 0.05) : 1.0;
    const effSpeed = this.speed * this.slowMult * bookSpeedMult * surgeMult;

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

  // Hàm tính toán sát thương có kèm tỉ lệ chí mạng đa tầng & bổ trợ Shop Vĩnh Viễn + Thông Thạo + Sách Tri Thức
  rollDamage(baseDmg, isTrueDamage = false, extraPenFlat = 0, extraPenPercent = 0) {
    const bookDmgMult = this.bookStats ? (this.bookStats.dmgMult || 1.0) : 1.0;
    let calcDmg = baseDmg * (this.totalDmgMult || 1.0) * bookDmgMult;

    // Kỹ năng Tinh Hoa Thông Thạo của Hắc Kiếm Sĩ: Đứng yên tăng thêm 20% sát thương
    if (this.charConfig && this.charConfig.id === 'dark_knight' && this.specialMasteryLevel > 0 && !this.isMoving) {
      calcDmg *= 1.20;
    }

    if (this.lessDamage) {
      calcDmg *= 0.5; // Giảm 50% dmg nếu có thử thách
    }

    // --- CƠ CHẾ CHÍ MẠNG ĐA TẦNG VƯỢT 100% (MULTI-TIER CRIT / SIÊU CHÍ MẠNG) ---
    let extraMarquezCritChance = 0;
    let extraMarquezCritDamage = 0;
    if (this.bookSystemRef && this.bookSystemRef.hasBook('marquez') && this.maxHealth > 0) {
      const missingHpPercent = Math.max(0, 1.0 - (this.health / this.maxHealth));
      extraMarquezCritChance = missingHpPercent * 1.50; // +1.5% Crit Chance mỗi 1% máu mất
      extraMarquezCritDamage = missingHpPercent * 2.00; // +2.0% Crit Damage mỗi 1% máu mất
    }

    const totalCritChance = this.critChance + (this.bookStats ? (this.bookStats.critChance || 0) : 0) + extraMarquezCritChance;
    const totalCritDamage = this.critDamage + (this.bookStats ? (this.bookStats.critDamage || 0) : 0) + extraMarquezCritDamage;

    let critTier = 0;
    if (totalCritChance > 0) {
      const guaranteedTiers = Math.floor(totalCritChance);
      const extraChance = totalCritChance - guaranteedTiers;
      critTier = guaranteedTiers + (Math.random() < extraChance ? 1 : 0);
    }

    let finalDamage = calcDmg;
    if (critTier > 0) {
      // Mỗi tầng Crit nhân dồn theo hệ số sát thương chí mạng
      finalDamage = Math.round(calcDmg * Math.pow(totalCritDamage, critTier));

      // Keystone Diệt Thế Bạo Kích: 10% cơ hội nhân x1.25 thêm vào đòn chí mạng
      if (this.hasDiệtThếCrit && Math.random() < 0.10) {
        critTier = Math.max(critTier, 2);
        finalDamage = Math.round(finalDamage * 1.25);
      }

      // Kỹ năng Cuồng Phong Đoạt Mệnh: Nổ chí mạng kích hoạt tăng tốc trong 2s
      if (this.critSurgeLevel > 0) {
        this.critSurgeTimer = 2.0;
      }
    } else {
      finalDamage = Math.round(calcDmg);
    }

    // Tỉ lệ Sát Thương Chuẩn từ Sách (Derrida, Camus, v.v.)
    let finalIsTrueDamage = !!isTrueDamage;
    if (this.bookStats && this.bookStats.trueDmgRatio > 0 && Math.random() < this.bookStats.trueDmgRatio) {
      finalIsTrueDamage = true;
    }

    // Hiệu ứng Hút Máu từ Cây Kỹ Năng Thông Thạo + Sách (Có trần an toàn 15% Max HP/giây)
    const totalLifesteal = this.lifesteal + (this.bookStats ? (this.bookStats.lifesteal || 0) : 0);
    if (totalLifesteal > 0 && !this.noHeal && !this.isDead && this.health < this.maxHealth) {
      const maxLifestealPerSec = this.maxHealth * 0.15;
      const remainingQuota = Math.max(0, maxLifestealPerSec - (this.lifestealHealedThisSecond || 0));
      if (remainingQuota > 0) {
        const potentialHeal = finalDamage * totalLifesteal;
        const actualHeal = Math.min(remainingQuota, potentialHeal);
        if (actualHeal >= 1) {
          this.heal(actualHeal);
          this.lifestealHealedThisSecond = (this.lifestealHealedThisSecond || 0) + actualHeal;
        }
      }
    }

    return {
      damage: finalDamage,
      isCrit: critTier > 0,
      critTier: critTier,
      isTrueDamage: finalIsTrueDamage,
      armorPenFlat: (this.armorPenFlat || 0) + extraPenFlat,
      armorPenPercent: (this.armorPenPercent || 0) + extraPenPercent + (this.bookStats ? (this.bookStats.armorPenPercent || 0) : 0),
      accuracy: (this.accuracy || 1.0) + (this.bookStats ? (this.bookStats.accuracy || 0) : 0)
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
