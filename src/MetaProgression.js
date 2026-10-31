// Quản lý dữ liệu lưu trữ vĩnh viễn (Tiền Vàng, Nâng cấp ngoài trận, Thành tích)
const SAVE_KEY = 'vampire_survival_save_data_v1';

export class MetaProgression {
  constructor() {
    this.gold = 0;
    this.highScore = 0;
    this.totalKills = 0;

    // Các nâng cấp vĩnh viễn bằng vàng ngoài Menu
    this.upgrades = {
      health: {
        id: 'health',
        name: 'Thể Lực Cổ Đại',
        icon: '❤️',
        level: 0,
        maxLevel: 5,
        baseCost: 100,
        costMult: 1.6,
        valuePerLevel: 200, // +200 Máu tối đa mỗi cấp (Scale x10)
        desc: '+200 Máu tối đa cho tất cả nhân vật.'
      },
      damage: {
        id: 'damage',
        name: 'Sức Mạnh Linh Hồn',
        icon: '⚔️',
        level: 0,
        maxLevel: 5,
        baseCost: 150,
        costMult: 1.8,
        valuePerLevel: 0.10, // +10% Sát thương toàn bộ vũ khí
        desc: '+10% Sát thương vũ khí cơ bản.'
      },
      armor: {
        id: 'armor',
        name: 'Giáp Ma Cổ Viện',
        icon: '🛡️',
        level: 0,
        maxLevel: 5,
        baseCost: 120,
        costMult: 1.7,
        valuePerLevel: 6, // +6 Điểm Giáp phòng ngự mỗi cấp
        desc: '+6 Điểm Giáp phòng ngự giảm sát thương nhận vào.'
      },
      critChance: {
        id: 'critChance',
        name: 'Nhãn Thần Bạo Kích',
        icon: '💥',
        level: 0,
        maxLevel: 5,
        baseCost: 200,
        costMult: 2.0,
        valuePerLevel: 0.03, // +3% Tỉ lệ chí mạng
        desc: '+3% Tỉ lệ chí mạng cơ bản.'
      },
      speed: {
        id: 'speed',
        name: 'Hài Thần Tốc',
        icon: '👟',
        level: 0,
        maxLevel: 5,
        baseCost: 100,
        costMult: 1.5,
        valuePerLevel: 0.06, // +6% Tốc độ di chuyển
        desc: '+6% Tốc độ di chuyển nhân vật.'
      },
      greed: {
        id: 'greed',
        name: 'Thuật Luyện Kim',
        icon: '🪙',
        level: 0,
        maxLevel: 5,
        baseCost: 120,
        costMult: 1.7,
        valuePerLevel: 0.20, // +20% Vàng nhận được
        desc: '+20% Tiền Vàng thu được sau mỗi trận.'
      },
      bookSlots: {
        id: 'bookSlots',
        name: 'Kệ Sách Cổ Điển',
        icon: '📚',
        level: 0,
        maxLevel: 2,
        baseCost: 350,
        costMult: 2.5,
        valuePerLevel: 1, // +1 Ô chứa sách
        desc: '+1 Ô chứa Sách trong trận (Khởi đầu 3 ô, tối đa 5 ô).'
      },
      starterBooks: {
        id: 'starterBooks',
        name: 'Khai Sáng Ban Đầu',
        icon: '📜',
        level: 0,
        maxLevel: 1,
        baseCost: 500,
        costMult: 2.0,
        valuePerLevel: 1, // Chọn thêm 1 sách khởi đầu
        desc: 'Cho phép mang thêm 1 Sách Khởi Đầu trước trận đấu (Tổng cộng 2 cuốn).'
      },
      bookDropRate: {
        id: 'bookDropRate',
        name: 'Cơ Duyên Học Vấn',
        icon: '✨',
        level: 0,
        maxLevel: 3,
        baseCost: 200,
        costMult: 1.8,
        valuePerLevel: 0.25, // +25% Tỉ lệ rơi sách
        desc: '+25% Tỉ lệ quái rơi Sách Khởi Đầu trong trận.'
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
              this.upgrades[key].level = data.upgrades[key].level || 0;
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
    return Math.round(up.baseCost * Math.pow(up.costMult, up.level));
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

  // Lấy các chỉ số cộng thêm cho nhân vật khi bắt đầu trận
  getBonusStats() {
    return {
      bonusHealth: this.upgrades.health.level * this.upgrades.health.valuePerLevel,
      bonusDamageMult: 1.0 + this.upgrades.damage.level * this.upgrades.damage.valuePerLevel,
      bonusCritChance: this.upgrades.critChance.level * this.upgrades.critChance.valuePerLevel,
      bonusSpeedMult: 1.0 + this.upgrades.speed.level * this.upgrades.speed.valuePerLevel,
      goldMultiplier: 1.0 + this.upgrades.greed.level * this.upgrades.greed.valuePerLevel,
      bonusArmor: (this.upgrades.armor ? this.upgrades.armor.level * this.upgrades.armor.valuePerLevel : 0),
      maxBookSlots: 3 + (this.upgrades.bookSlots ? this.upgrades.bookSlots.level : 0),
      maxStarterBooks: 1 + (this.upgrades.starterBooks ? this.upgrades.starterBooks.level : 0),
      bookDropRateMult: 1.0 + (this.upgrades.bookDropRate ? this.upgrades.bookDropRate.level * this.upgrades.bookDropRate.valuePerLevel : 0)
    };
  }
}
