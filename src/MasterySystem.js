// =========================================================================
// HỆ THỐNG THÔNG THẠO VÀ CÂY KỸ NĂNG NHÂN VẬT (CHARACTER MASTERY SYSTEM)
// Quản lý cấp Thông Thạo (1-100), tích lũy Score, và Cây Kỹ Năng riêng biệt
// =========================================================================

const MASTERY_SAVE_KEY = 'vampire_survival_character_mastery_v2';

// Định nghĩa Cây Kỹ Năng (Skill Tree Definitions)
export const SKILL_TREE_DEFINITIONS = {
  // --- NHÁNH 1: TẤN CÔNG (OFFENSE) ---
  attack_dmg: {
    id: 'attack_dmg',
    category: 'offense',
    name: 'Uy Lực Linh Hồn',
    icon: '⚔️',
    maxLevel: 10,
    desc: 'Tăng +3% sát thương toàn bộ vũ khí mỗi cấp.',
    valuePerLevel: 0.03,
    format: (lvl) => `+${(lvl * 3)}% Sát thương vũ khí`
  },
  crit_rate: {
    id: 'crit_rate',
    category: 'offense',
    name: 'Tâm Nhãn Bạo Kích',
    icon: '🎯',
    maxLevel: 10,
    desc: 'Tăng +1.5% tỉ lệ đánh chí mạng mỗi cấp.',
    valuePerLevel: 0.015,
    format: (lvl) => `+${(lvl * 1.5).toFixed(1)}% Tỉ lệ chí mạng`
  },
  crit_dmg: {
    id: 'crit_dmg',
    category: 'offense',
    name: 'Cuồng Nộ Hủy Diệt',
    icon: '💥',
    maxLevel: 10,
    desc: 'Tăng +10% sát thương đòn đánh chí mạng mỗi cấp.',
    valuePerLevel: 0.10,
    format: (lvl) => `+${(lvl * 10)}% Sát thương chí mạng`
  },
  cooldown: {
    id: 'cooldown',
    category: 'offense',
    name: 'Khí Tốc Xuất Chiêu',
    icon: '⚡',
    maxLevel: 10,
    desc: 'Giảm 2% thời gian hồi chiêu tất cả vũ khí mỗi cấp.',
    valuePerLevel: 0.02,
    format: (lvl) => `-${(lvl * 2)}% Thời gian hồi chiêu`
  },

  // --- NHÁNH 2: SINH TỒN (SURVIVAL - Scale x10) ---
  max_health: {
    id: 'max_health',
    category: 'survival',
    name: 'Sinh Mệnh Bất Diệt',
    icon: '❤️',
    maxLevel: 10,
    desc: 'Tăng +150 Máu tối đa mỗi cấp.',
    valuePerLevel: 150,
    format: (lvl) => `+${lvl * 150} Máu tối đa`
  },
  regen: {
    id: 'regen',
    category: 'survival',
    name: 'Huyết Mạch Tái Sinh',
    icon: '🌿',
    maxLevel: 10,
    desc: 'Tự động hồi phục +8 Máu mỗi giây mỗi cấp.',
    valuePerLevel: 8.0,
    format: (lvl) => `+${(lvl * 8.0).toFixed(0)} Máu/giây`
  },
  armor: {
    id: 'armor',
    category: 'survival',
    name: 'Giáp Ma Cổ Đại',
    icon: '🛡️',
    maxLevel: 10,
    desc: 'Tăng +10 Điểm Giáp phòng ngự mỗi cấp.',
    valuePerLevel: 10,
    format: (lvl) => `+${lvl * 10} Điểm Giáp`
  },
  lifesteal: {
    id: 'lifesteal',
    category: 'survival',
    name: 'Hấp Huyết Ma Pháp',
    icon: '🩸',
    maxLevel: 10,
    desc: 'Đòn đánh có tỉ lệ hút 0.6% sát thương thành Máu mỗi cấp.',
    valuePerLevel: 0.006,
    format: (lvl) => `+${(lvl * 0.6).toFixed(1)}% Hút máu khi đánh`
  },

  // --- NHÁNH 3: TIỆN ÍCH & TINH HOA (UTILITY & MASTERY) ---
  speed: {
    id: 'speed',
    category: 'utility',
    name: 'Hài Thần Du Ngoạn',
    icon: '👟',
    maxLevel: 10,
    desc: 'Tăng +2.5% tốc độ di chuyển mỗi cấp.',
    valuePerLevel: 0.025,
    format: (lvl) => `+${(lvl * 2.5).toFixed(1)}% Tốc độ di chuyển`
  },
  pickup_range: {
    id: 'pickup_range',
    category: 'utility',
    name: 'Từ Trường Linh Hồn',
    icon: '🧲',
    maxLevel: 10,
    desc: 'Tăng +18 bán kính tự động hút Đá Kinh Nghiệm mỗi cấp.',
    valuePerLevel: 18,
    format: (lvl) => `+${lvl * 18} Bán kính hút đá kinh nghiệm`
  },
  greed: {
    id: 'greed',
    category: 'utility',
    name: 'Bổng Lộc Hoàng Gia',
    icon: '🪙',
    maxLevel: 10,
    desc: 'Tăng +5% Vàng và Kinh nghiệm thu được mỗi cấp.',
    valuePerLevel: 0.05,
    format: (lvl) => `+${lvl * 5}% Vàng & Kinh nghiệm`
  },
  special: {
    id: 'special',
    category: 'utility',
    name: 'Kỹ Năng Tinh Hoa Tối Thượng',
    icon: '👑',
    maxLevel: 10,
    desc: 'Cường hóa kỹ năng độc quyền tối thượng riêng của nhân vật.',
    valuePerLevel: 1,
    format: (lvl) => `Cấp ${lvl}/10 Tinh hoa nhân vật`
  }
};

// Định nghĩa Kỹ Năng Tinh Hoa Tối Thượng theo từng nhân vật
export const CHARACTER_SPECIAL_MASTERY = {
  sorceress: {
    name: 'Thời Không Bất Diệt',
    desc: 'Hồi sinh nhận thêm khiên bất tử +0.4s và hồi thêm +8% Máu tối đa mỗi cấp; khi Máu dưới 30% tăng +30% tốc độ chạy.',
    format: (lvl) => `Bất tử +${(lvl * 0.4).toFixed(1)}s, hồi thêm +${lvl * 8}% Máu khi hồi sinh.`
  },
  dark_knight: {
    name: 'Khí Phách Hắc Ám',
    desc: 'Phản đòn thêm +250 cố định và +2% phản sát thương, tăng +15 Giáp cứng mỗi cấp; khi đứng yên tăng thêm +20% sát thương đòn đánh.',
    format: (lvl) => `Phản đòn +${lvl * 250} (+${lvl * 2}%), Giáp cứng +${lvl * 15}, +20% dmg khi đứng yên.`
  },
  high_mage: {
    name: 'Bão Tố Nguyên Thủy',
    desc: 'Mở rộng bán kính Hào quang/Ma pháp thêm +5% và thiêu đốt thêm +12 Sát thương đốt mỗi cấp.',
    format: (lvl) => `+${lvl * 5}% Bán kính Hào quang/Ma pháp, +${lvl * 12} Sát thương đốt/giây.`
  }
};

export class MasterySystem {
  constructor() {
    this.data = {};
    this.load();
  }

  // Khởi tạo dữ liệu mặc định cho 1 nhân vật nếu chưa có
  getDefaultCharData() {
    return {
      level: 1,               // Cấp thông thạo 1 -> 100
      score: 0,               // Điểm score tích lũy hiện có của nhân vật
      totalScoreEarned: 0,    // Tổng điểm score tích lũy từ trước tới nay
      skillPoints: 0,         // Điểm kỹ năng chưa dùng
      skills: {
        attack_dmg: 0,
        crit_rate: 0,
        crit_dmg: 0,
        cooldown: 0,
        max_health: 0,
        regen: 0,
        armor: 0,
        lifesteal: 0,
        speed: 0,
        pickup_range: 0,
        greed: 0,
        special: 0
      }
    };
  }

  // Lấy dữ liệu của 1 nhân vật (tự động khởi tạo nếu thiếu)
  getCharData(charId) {
    if (!this.data[charId]) {
      this.data[charId] = this.getDefaultCharData();
    }
    // Đảm bảo có đầy đủ các trường
    if (typeof this.data[charId].level !== 'number') this.data[charId].level = 1;
    if (typeof this.data[charId].score !== 'number') this.data[charId].score = 0;
    if (typeof this.data[charId].skillPoints !== 'number') this.data[charId].skillPoints = 0;
    if (!this.data[charId].skills) this.data[charId].skills = {};

    for (const key of Object.keys(SKILL_TREE_DEFINITIONS)) {
      if (typeof this.data[charId].skills[key] !== 'number') {
        this.data[charId].skills[key] = 0;
      }
    }
    return this.data[charId];
  }

  // Công thức tính điểm Score cần để lên cấp tiếp theo
  // Càng lên cấp cao thì càng cần nhiều điểm score theo lũy tiến mượt mà
  getRequiredScore(currentLevel) {
    if (currentLevel >= 100) return Infinity;
    // Cấp 1 -> 2: ~500 score
    // Cấp 10: ~5,200 score
    // Cấp 50: ~85,000 score
    // Cấp 99 -> 100: ~360,000 score
    return Math.round(400 * Math.pow(currentLevel, 1.48) + currentLevel * 100);
  }

  // Cộng điểm Score sau khi kết thúc một trận đấu
  addScore(charId, scoreEarned) {
    if (!scoreEarned || scoreEarned <= 0) return;
    const char = this.getCharData(charId);
    char.score += scoreEarned;
    char.totalScoreEarned = (char.totalScoreEarned || 0) + scoreEarned;
    this.save();
  }

  // Tăng 1 cấp Thông Thạo (tiêu tốn Score)
  levelUpMastery(charId) {
    const char = this.getCharData(charId);
    if (char.level >= 100) return false;

    const needed = this.getRequiredScore(char.level);
    if (char.score >= needed) {
      char.score -= needed;
      char.level++;
      char.skillPoints++; // Mỗi cấp nhận 1 Điểm Kỹ Năng
      this.save();
      return true;
    }
    return false;
  }

  // Tăng tối đa cấp có thể với số Score hiện tại
  levelUpMax(charId) {
    let count = 0;
    while (this.levelUpMastery(charId)) {
      count++;
    }
    return count;
  }

  // Phân phối 1 Điểm Kỹ Năng vào một nhánh kỹ năng
  allocateSkill(charId, skillKey) {
    const char = this.getCharData(charId);
    if (char.skillPoints <= 0) return false;

    const def = SKILL_TREE_DEFINITIONS[skillKey];
    if (!def) return false;

    const cur = char.skills[skillKey] || 0;
    if (cur >= def.maxLevel) return false;

    char.skills[skillKey] = cur + 1;
    char.skillPoints--;
    this.save();
    return true;
  }

  // Hoàn lại 1 Điểm Kỹ Năng từ một nhánh cụ thể (giảm 1 cấp)
  refundSkill(charId, skillKey) {
    const char = this.getCharData(charId);
    const cur = char.skills[skillKey] || 0;
    if (cur <= 0) return false;

    char.skills[skillKey] = cur - 1;
    char.skillPoints++;
    this.save();
    return true;
  }

  // Tẩy Điểm Kỹ Năng (Reset toàn bộ điểm kỹ năng của 12 nhánh để hoàn lại điểm)
  resetSkills(charId) {
    const char = this.getCharData(charId);
    let refunded = 0;
    for (const key of Object.keys(SKILL_TREE_DEFINITIONS)) {
      refunded += (char.skills[key] || 0);
      char.skills[key] = 0;
    }
    char.skillPoints += refunded;
    this.save();
    return refunded;
  }

  // Tính tổng số Score đã tiêu tốn từ Cấp 1 đến cấp hiện tại
  getTotalScoreInvested(currentLevel) {
    let total = 0;
    for (let lvl = 1; lvl < currentLevel; lvl++) {
      total += this.getRequiredScore(lvl);
    }
    return total;
  }

  // Tẩy Cấp Thông Thạo (Reset Mastery Level về Cấp 1 & Hoàn lại 100% Score)
  resetMasteryLevel(charId) {
    const char = this.getCharData(charId);
    if (char.level <= 1) return 0;

    const refundedScore = this.getTotalScoreInvested(char.level);
    char.score += refundedScore;
    char.level = 1;
    char.skillPoints = 0;
    for (const key of Object.keys(SKILL_TREE_DEFINITIONS)) {
      char.skills[key] = 0;
    }
    this.save();
    return refundedScore;
  }

  // Cộng thêm Score thử nghiệm để test tính năng
  addTestScore(charId, amount = 10000) {
    const char = this.getCharData(charId);
    char.score += amount;
    char.totalScoreEarned = (char.totalScoreEarned || 0) + amount;
    this.save();
    return amount;
  }

  // Lấy toàn bộ chỉ số bổ trợ từ Cây Kỹ Năng của nhân vật để áp dụng vào trận
  getBonusStats(charId) {
    const char = this.getCharData(charId);
    const s = char.skills;

    return {
      masteryLevel: char.level,
      bonusDamageMult: (s.attack_dmg || 0) * 0.03,            // +3% / cấp
      bonusCritChance: (s.crit_rate || 0) * 0.015,           // +1.5% / cấp
      bonusCritDamage: (s.crit_dmg || 0) * 0.10,             // +10% / cấp
      cooldownReduction: (s.cooldown || 0) * 0.02,           // -2% hồi chiêu / cấp

      bonusHealth: (s.max_health || 0) * 150,                // +150 HP / cấp
      bonusRegen: (s.regen || 0) * 8.0,                      // +8 HP/s / cấp
      bonusArmor: ((s.armor || 0) * 10) + (charId === 'dark_knight' ? (s.special || 0) * 15 : 0), // Giáp cứng
      damageReduction: 0,                                     // Độc lập với Giáp
      lifesteal: (s.lifesteal || 0) * 0.006,                 // +0.6% Lifesteal / cấp

      bonusSpeedMult: 1.0 + (s.speed || 0) * 0.025,          // +2.5% Tốc độ / cấp
      bonusPickupRange: (s.pickup_range || 0) * 18,          // +18 Tầm hút ngọc / cấp
      bonusGreedMult: 1.0 + (s.greed || 0) * 0.05,           // +5% Vàng & XP / cấp

      specialMasteryLevel: s.special || 0                     // Kỹ năng tối thượng riêng
    };
  }

  // Lưu trữ vào LocalStorage
  save() {
    try {
      localStorage.setItem(MASTERY_SAVE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('Không thể lưu dữ liệu Thông Thạo vào localStorage:', e);
    }
  }

  // Tải dữ liệu từ LocalStorage
  load() {
    try {
      const raw = localStorage.getItem(MASTERY_SAVE_KEY);
      if (raw) {
        this.data = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Không thể đọc dữ liệu Thông Thạo từ localStorage:', e);
      this.data = {};
    }
  }
}
