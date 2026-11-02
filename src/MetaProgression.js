// Quản lý dữ liệu lưu trữ vĩnh viễn (Tiền Vàng, Nâng cấp ngoài trận, Thành tích)
const SAVE_KEY = 'vampire_survival_save_data_v1';

export class MetaProgression {
  constructor() {
    this.gold = 0;
    this.highScore = 0;
    this.totalKills = 0;

    // Kho nâng cấp vĩnh viễn bằng vàng được Rework hoàn toàn (20 nâng cấp chia 3 nhóm)
    this.upgrades = {
      // =========================================================================
      // I. MỤC NỘI TẠI & CƠ CHẾ (PASSIVE - 6 NÂNG CẤP)
      // =========================================================================
      unlockSpecialSkill: {
        id: 'unlockSpecialSkill',
        category: 'passive',
        name: 'Khai Mở Tuyệt Kỹ',
        icon: '⚡',
        level: 0,
        maxLevel: 1,
        costs: [500],
        valuePerLevel: 1,
        desc: 'Mở khóa Kỹ năng Đặc Biệt [Phím G] của nhân vật trong trận đấu.'
      },
      enhanceSpecialAndMain: {
        id: 'enhanceSpecialAndMain',
        category: 'passive',
        name: 'Cường Hóa Bản Mệnh',
        icon: '👑',
        level: 0,
        maxLevel: 3,
        costs: [500, 10000, 50000],
        valuePerLevel: 0.01,
        desc: '+1% Sát thương và hiệu ứng của Kỹ năng [G] & Vũ khí Chính mỗi cấp.'
      },
      bonusRerolls: {
        id: 'bonusRerolls',
        category: 'passive',
        name: 'Vận Mệnh Xoay Vần (Reroll)',
        icon: '🎲',
        level: 0,
        maxLevel: 10,
        costs: [2500, 5000, 7500, 10000, 12500, 15000, 17500, 20000, 22500, 25000],
        valuePerLevel: 1,
        desc: '+1 Lượt Đổi Lại (Reroll) danh sách nâng cấp khi lên cấp trong trận (dùng là mất).'
      },
      bonusBanishes: {
        id: 'bonusBanishes',
        category: 'passive',
        name: 'Trục Xuất Vĩnh Viễn (Banish)',
        icon: '🚫',
        level: 0,
        maxLevel: 5,
        costs: [5000, 10000, 15000, 20000, 25000],
        valuePerLevel: 1,
        desc: '+1 Lượt Loại Bỏ khi lên cấp (vật phẩm bị loại sẽ không bao giờ xuất hiện lại).'
      },
      bookSlots: {
        id: 'bookSlots',
        category: 'passive',
        name: 'Kệ Sách Cổ Viện',
        icon: '📚',
        level: 0,
        maxLevel: 2,
        costs: [500, 10000],
        valuePerLevel: 1,
        desc: '+1 Ô chứa Sách Tác Phẩm trong trận (Khởi đầu 3 ô, tối đa 5 ô).'
      },
      starterBooks: {
        id: 'starterBooks',
        category: 'passive',
        name: 'Khai Sáng Ban Đầu',
        icon: '📜',
        level: 0,
        maxLevel: 1,
        costs: [5000],
        valuePerLevel: 1,
        desc: 'Cho phép mang thêm 1 Sách Khởi Đầu trước trận đấu (Tổng cộng 2 cuốn).'
      },

      // =========================================================================
      // II. MỤC CHỈ SỐ NHÂN VẬT (STATS - 12 NÂNG CẤP)
      // =========================================================================
      health: {
        id: 'health',
        category: 'stats',
        name: 'Sinh Lực Cổ Đại',
        icon: '❤️',
        level: 0,
        maxLevel: 10,
        costs: [200, 500, 1200, 2750, 6000, 12000, 18000, 24000, 30000, 36000],
        valuePerLevel: 0.05,
        desc: '+5% Máu tối đa của nhân vật mỗi cấp (Tối đa +50% Máu).'
      },
      damage: {
        id: 'damage',
        category: 'stats',
        name: 'Sức Mạnh Linh Hồn',
        icon: '⚔️',
        level: 0,
        maxLevel: 10,
        costs: [300, 750, 1800, 4100, 9100, 18000, 25000, 31000, 37000, 43000],
        valuePerLevel: 0.06,
        desc: '+6% Sát thương toàn bộ vũ khí mỗi cấp (Tối đa +60% Dmg).'
      },
      speed: {
        id: 'speed',
        category: 'stats',
        name: 'Hài Thần Tốc',
        icon: '👟',
        level: 0,
        maxLevel: 10,
        costs: [200, 500, 1200, 2750, 6000, 12000, 18000, 24000, 30000, 36000],
        valuePerLevel: 0.06,
        desc: '+6% Tốc độ di chuyển nhân vật mỗi cấp (Tối đa +60% Tốc chạy).'
      },
      critChance: {
        id: 'critChance',
        category: 'stats',
        name: 'Nhãn Thần Bạo Kích',
        icon: '💥',
        level: 0,
        maxLevel: 10,
        costs: [200, 500, 1200, 2750, 6000, 12000, 18000, 24000, 30000, 36000],
        valuePerLevel: 0.02,
        desc: '+2% Tỉ lệ chí mạng cơ bản mỗi cấp (Tối đa +20% Crit).'
      },
      pickupRange: {
        id: 'pickupRange',
        category: 'stats',
        name: 'Từ Trường Thu Thập',
        icon: '🧲',
        level: 0,
        maxLevel: 10,
        costs: [200, 500, 1200, 2750, 6000, 12000, 18000, 24000, 30000, 36000],
        valuePerLevel: 0.10,
        desc: '+10% Bán kính hút đá kinh nghiệm & vật phẩm mỗi cấp (Tối đa +100%).'
      },
      hpRegen: {
        id: 'hpRegen',
        category: 'stats',
        name: 'Huyết Mạch Tái Tạo',
        icon: '🌿',
        level: 0,
        maxLevel: 5,
        costs: [300, 750, 1800, 4100, 9100],
        valuePerLevel: 2, // 2 HP/s = 10 HP / 5 giây
        desc: 'Hồi phục +10 Máu mỗi 5 giây (Tối đa 50 Máu / 5 giây, tương đương +10 HP/s).'
      },
      armorPercent: {
        id: 'armorPercent',
        category: 'stats',
        name: 'Giáp Ma Hộ Mệnh',
        icon: '🛡️',
        level: 0,
        maxLevel: 5,
        costs: [500, 2750, 6000, 12000, 18000],
        valuePerLevel: 0.03,
        desc: '+3% Điểm Giáp phòng ngự cơ bản mỗi cấp (Tối đa +15% Giáp).'
      },
      damageReduction: {
        id: 'damageReduction',
        category: 'stats',
        name: 'Hộ Thể Kiên Cường',
        icon: '🔰',
        level: 0,
        maxLevel: 5,
        costs: [500, 2750, 6000, 12000, 18000],
        valuePerLevel: 0.02,
        desc: '+2% Giảm sát thương nhận vào từ mọi nguồn (Tối đa +10% Giảm Dmg).'
      },
      specialSkillCDR: {
        id: 'specialSkillCDR',
        category: 'stats',
        name: 'Nhanh Nhẹn Tuyệt Kỹ',
        icon: '⏳',
        level: 0,
        maxLevel: 5,
        costs: [500, 2750, 6000, 12000, 18000],
        valuePerLevel: 0.03,
        desc: 'Giảm 3% Thời gian hồi chiêu của Kỹ năng [G] mỗi cấp (Tối đa -15% CDR).'
      },
      bonusXP: {
        id: 'bonusXP',
        category: 'stats',
        name: 'Tri Thức Thông Tuệ',
        icon: '📖',
        level: 0,
        maxLevel: 10,
        costs: [400, 1000, 2400, 5500, 12000, 20000, 30000, 40000, 50000, 60000],
        valuePerLevel: 0.03,
        desc: '+3% Điểm kinh nghiệm (EXP) nhận được mỗi cấp (Tối đa +30% EXP).'
      },
      greed: {
        id: 'greed',
        category: 'stats',
        name: 'Thuật Luyện Kim',
        icon: '🪙',
        level: 0,
        maxLevel: 10,
        costs: [400, 1000, 2400, 5500, 12000, 20000, 30000, 40000, 50000, 60000],
        valuePerLevel: 0.20,
        desc: '+20% Tiền Vàng thu được sau mỗi trận đấu (Tối đa +200% Vàng).'
      },
      classSkillBuff: {
        id: 'classSkillBuff',
        category: 'stats',
        name: 'Tinh Hoa Kỹ Năng Riêng',
        icon: '✨',
        level: 0,
        maxLevel: 5,
        costs: [2400, 5500, 12000, 15000, 20000],
        valuePerLevel: 0.04,
        desc: '+4% Uy lực/hiệu ứng cho 3 kỹ năng nội tại riêng của nhân vật (Tối đa +20%).'
      },

      // =========================================================================
      // III. MỤC KHÁC & THỬ THÁCH (OTHER - 2 NÂNG CẤP)
      // =========================================================================
      curseEnemyCount: {
        id: 'curseEnemyCount',
        category: 'other',
        name: 'Bầy Đàn Cuồng Nộ',
        icon: '👹',
        level: 0,
        maxLevel: 10,
        costs: [2000, 4000, 6000, 8000, 10000, 12000, 14000, 16000, 18000, 20000],
        valuePerLevel: 1,
        desc: 'Mỗi đợt xuất hiện thêm +1 quái vật mỗi cấp (Tối đa +10 quái để cày EXP/Vàng).'
      },
      curseEnemyDamage: {
        id: 'curseEnemyDamage',
        category: 'other',
        name: 'Ác Mộng Tàn Bạo (Curse)',
        icon: '☠️',
        level: 0,
        maxLevel: 10,
        costs: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        valuePerLevel: 2.0,
        desc: 'Tăng +200% Sát thương quái vật mỗi cấp (Tối đa +2000% Dmg quái - Miễn phí 0 Vàng).'
      }
    };

    this.load();
  }

  load() {
    try {
      const dataStr = localStorage.getItem(SAVE_KEY);
      if (dataStr) {
        const data = JSON.parse(dataStr);
        this.gold = data.gold || 0;
        this.highScore = data.highScore || 0;
        this.totalKills = data.totalKills || 0;
        if (data.upgrades) {
          for (const key in data.upgrades) {
            if (this.upgrades[key]) {
              const lvl = data.upgrades[key].level || 0;
              this.upgrades[key].level = Math.min(this.upgrades[key].maxLevel, Math.max(0, lvl));
            }
          }
        }
      }
    } catch (e) {
      console.warn('Could not load save data:', e);
    }
  }

  save() {
    try {
      const saveData = {
        gold: this.gold,
        highScore: this.highScore,
        totalKills: this.totalKills,
        upgrades: {}
      };
      for (const key in this.upgrades) {
        saveData.upgrades[key] = { level: this.upgrades[key].level };
      }
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    } catch (e) {
      console.warn('Could not save data:', e);
    }
  }

  getCost(upgradeId) {
    const up = this.upgrades[upgradeId];
    if (!up || up.level >= up.maxLevel) return Infinity;
    return up.costs[up.level];
  }

  buyUpgrade(upgradeId) {
    const up = this.upgrades[upgradeId];
    if (!up || up.level >= up.maxLevel) return false;
    const cost = this.getCost(upgradeId);
    if (this.gold >= cost) {
      this.gold -= cost;
      up.level++;
      this.save();
      return true;
    }
    return false;
  }

  // Lấy số tiền vàng hoàn lại cho 1 cấp vừa nâng gần nhất
  getRefundValue(upgradeId) {
    const up = this.upgrades[upgradeId];
    if (!up || up.level <= 0) return 0;
    return up.costs[up.level - 1];
  }

  // Hoàn trả 1 cấp của nâng cấp và nhận lại 100% số vàng của cấp đó
  refundUpgrade(upgradeId) {
    const up = this.upgrades[upgradeId];
    if (!up || up.level <= 0) return 0;
    const refundAmount = this.getRefundValue(upgradeId);
    up.level--;
    this.gold += refundAmount;
    this.save();
    return refundAmount;
  }

  // Tính tổng số vàng đã tiêu vào 1 nâng cấp cụ thể
  getTotalSpentOnUpgrade(upgradeId) {
    const up = this.upgrades[upgradeId];
    if (!up || up.level <= 0) return 0;
    let total = 0;
    for (let lvl = 0; lvl < up.level; lvl++) {
      total += up.costs[lvl];
    }
    return total;
  }

  // Tính tổng số vàng đã tiêu vào toàn bộ nâng cấp
  getTotalSpent() {
    let total = 0;
    for (const key in this.upgrades) {
      total += this.getTotalSpentOnUpgrade(key);
    }
    return total;
  }

  // Tẩy toàn bộ nâng cấp về Cấp 0 và hoàn lại 100% số vàng đã tiêu
  resetAllUpgrades() {
    const totalSpent = this.getTotalSpent();
    for (const key in this.upgrades) {
      this.upgrades[key].level = 0;
    }
    if (totalSpent > 0) {
      this.gold += totalSpent;
    }
    this.save();
    return totalSpent;
  }

  // Lấy các chỉ số cộng thêm cho nhân vật khi bắt đầu trận
  getBonusStats() {
    const p = this.upgrades;
    return {
      // Passive
      isSpecialSkillUnlocked: p.unlockSpecialSkill ? p.unlockSpecialSkill.level > 0 : false,
      enhanceSpecialAndMain: p.enhanceSpecialAndMain ? p.enhanceSpecialAndMain.level * p.enhanceSpecialAndMain.valuePerLevel : 0,
      bonusRerolls: p.bonusRerolls ? p.bonusRerolls.level * p.bonusRerolls.valuePerLevel : 0,
      bonusBanishes: p.bonusBanishes ? p.bonusBanishes.level * p.bonusBanishes.valuePerLevel : 0,
      maxBookSlots: 3 + (p.bookSlots ? p.bookSlots.level * p.bookSlots.valuePerLevel : 0),
      maxStarterBooks: 1 + (p.starterBooks ? p.starterBooks.level * p.starterBooks.valuePerLevel : 0),

      // Stats
      healthBonusPercent: p.health ? p.health.level * p.health.valuePerLevel : 0,
      bonusDamageMult: 1.0 + (p.damage ? p.damage.level * p.damage.valuePerLevel : 0),
      bonusSpeedMult: 1.0 + (p.speed ? p.speed.level * p.speed.valuePerLevel : 0),
      bonusCritChance: p.critChance ? p.critChance.level * p.critChance.valuePerLevel : 0,
      bonusPickupRangeMult: 1.0 + (p.pickupRange ? p.pickupRange.level * p.pickupRange.valuePerLevel : 0),
      hpRegenPerSec: p.hpRegen ? p.hpRegen.level * p.hpRegen.valuePerLevel : 0,
      armorPercentBonus: p.armorPercent ? p.armorPercent.level * p.armorPercent.valuePerLevel : 0,
      damageReduction: p.damageReduction ? p.damageReduction.level * p.damageReduction.valuePerLevel : 0,
      specialSkillCDR: p.specialSkillCDR ? p.specialSkillCDR.level * p.specialSkillCDR.valuePerLevel : 0,
      xpMultiplier: 1.0 + (p.bonusXP ? p.bonusXP.level * p.bonusXP.valuePerLevel : 0),
      goldMultiplier: 1.0 + (p.greed ? p.greed.level * p.greed.valuePerLevel : 0),
      classSkillBuff: p.classSkillBuff ? p.classSkillBuff.level * p.classSkillBuff.valuePerLevel : 0,

      // Other / Curse
      curseEnemyCount: p.curseEnemyCount ? p.curseEnemyCount.level * p.curseEnemyCount.valuePerLevel : 0,
      curseEnemyDamageMult: 1.0 + (p.curseEnemyDamage ? p.curseEnemyDamage.level * p.curseEnemyDamage.valuePerLevel : 0)
    };
  }
}
