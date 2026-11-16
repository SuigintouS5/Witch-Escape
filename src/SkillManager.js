// Quản lý Kỹ năng riêng của Nhân vật (Không chiếm ô trang bị)
export class SkillManager {
  constructor() {
    this.classSkillBuff = 0; // Tinh Hoa Kỹ Năng Riêng từ Shop Cổ Viện (0% - 20%)
    this.skills = {
      extraLife: {
        id: 'extraLife',
        name: 'Hồi Sinh Phượng Hoàng',
        icon: 'assets/icons/skill_revive.png',
        desc: 'Thêm 1 mạng: Khi chết tự động hồi sinh với 60% máu & nổ đẩy lùi quái xung quanh.',
        unlocked: false,
        livesRemaining: 0
      },
      bloodPact: {
        id: 'bloodPact',
        name: 'Giao Kèo Máu',
        icon: 'assets/icons/skill_blood.png',
        desc: 'Trừ 20% Máu tối đa vĩnh viễn, nhưng tăng 50% toàn bộ sát thương gây ra.',
        unlocked: false
      },
      lifesteal: {
        id: 'lifesteal',
        name: 'Khát Máu Ma Cà Rồng',
        icon: 'assets/icons/skill_lifesteal.png',
        desc: 'Hồi phục 10% lượng sát thương gây ra lên quái vật thành Máu.',
        unlocked: false,
        healCooldown: 0.15,
        healTimer: 0
      }
    };
  }

  unlockSkill(skillId, player) {
    const s = this.skills[skillId];
    if (!s || s.unlocked) return;

    s.unlocked = true;

    if (skillId === 'extraLife') {
      s.livesRemaining = 1;
    } else if (skillId === 'bloodPact') {
      player.maxHealth = Math.round(player.maxHealth * 0.8);
      player.health = Math.min(player.health, player.maxHealth);
    }
  }

  getDamageMultiplier() {
    let mult = 1.0;
    if (this.skills.bloodPact.unlocked) {
      const bonusBuff = 0.50 * (1.0 + (this.classSkillBuff || 0));
      mult += bonusBuff;
    }
    return mult;
  }

  // Đếm số lượng kỹ năng riêng đã mở khóa
  getUnlockedCount() {
    let count = 0;
    if (this.skills.extraLife.unlocked) count++;
    if (this.skills.bloodPact.unlocked) count++;
    if (this.skills.lifesteal.unlocked) count++;
    return count;
  }

  onDamageDealt(damage, player) {
    if (!this.skills.lifesteal.unlocked || player.isDead) return;

    this.skills.lifesteal.healTimer -= 0.05;
    if (this.skills.lifesteal.healTimer <= 0) {
      const lifestealRate = 0.10 * (1.0 + (this.classSkillBuff || 0));
      const healAmount = Math.max(1, damage * lifestealRate);
      player.health = Math.min(player.maxHealth, player.health + healAmount);
      this.skills.lifesteal.healTimer = this.skills.lifesteal.healCooldown;
    }
  }

  checkRevive(player, particles) {
    if (this.skills.extraLife.unlocked && this.skills.extraLife.livesRemaining > 0) {
      this.skills.extraLife.livesRemaining--;
      player.isDead = false;

      let healPercent = 0.60 * (1.0 + (this.classSkillBuff || 0));
      let invincibility = 2.0;

      // Kỹ năng Tinh Hoa Thông Thạo: Thời Không Bất Diệt của Nikaido Hiro
      if (player.charConfig && player.charConfig.id === 'sorceress' && player.specialMasteryLevel > 0) {
        healPercent += player.specialMasteryLevel * 0.10; // Hồi thêm +10%/cấp
        invincibility += player.specialMasteryLevel * 0.4; // Thêm +0.4s bất tử/cấp
      }

      player.health = Math.min(player.maxHealth, Math.round(player.maxHealth * healPercent));
      player.invincibilityTimer = invincibility;

      if (particles) {
        particles.createDeathBurst(player.x, player.y, '#ffd166', 36);
        particles.createHitSparks(player.x, player.y, 24);
        particles.createArcaneBlast(player.x, player.y);
      }
      return true;
    }
    return false;
  }

  getSkillsData() {
    return {
      extraLife: { unlocked: this.skills.extraLife.unlocked, livesRemaining: this.skills.extraLife.livesRemaining },
      bloodPact: { unlocked: this.skills.bloodPact.unlocked },
      lifesteal: { unlocked: this.skills.lifesteal.unlocked }
    };
  }

  restoreSkillsData(data) {
    if (!data) return;
    if (data.extraLife) {
      this.skills.extraLife.unlocked = !!data.extraLife.unlocked;
      this.skills.extraLife.livesRemaining = data.extraLife.livesRemaining || 0;
    }
    if (data.bloodPact) {
      this.skills.bloodPact.unlocked = !!data.bloodPact.unlocked;
    }
    if (data.lifesteal) {
      this.skills.lifesteal.unlocked = !!data.lifesteal.unlocked;
    }
  }
}
