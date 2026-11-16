// =========================================================================
// HỆ THỐNG THÀNH TỰU & DANH HIỆU (ACHIEVEMENT SYSTEM)
// Quản lý tiến độ, lưu trữ vĩnh viễn, thông báo mở khóa & cấp buff % EXP
// =========================================================================

const ACHIEVEMENTS_SAVE_KEY = 'vampire_survival_achievements_v1';

export const ACHIEVEMENT_CATEGORIES = [
  { id: 'all', label: 'TẤT CẢ (20)' },
  { id: 'combat', label: '⚔️ CHIẾN ĐẤU (5)' },
  { id: 'survival', label: '⏳ SINH TỒN (5)' },
  { id: 'boss', label: '👹 TRÙM CUỐI (5)' },
  { id: 'collection', label: '📖 SƯU TẦM (5)' }
];

export const INITIAL_ACHIEVEMENTS = [
  // =========================================================================
  // 1. CHIẾN ĐẤU (COMBAT) - 5 Thành Tựu
  // =========================================================================
  {
    id: 'first_blood',
    name: 'Chiến Tích Đầu Tiên',
    icon: '⚔️',
    category: 'combat',
    desc: 'Hạ gục 10 quái vật đầu tiên trên hòn đảo.',
    metric: 'kills',
    goal: 10,
    difficulty: 'easy',
    reward: { type: 'exp_bonus', value: 0.01, percent: 1, desc: '✨ +1% EXP Vĩnh Viễn' }
  },
  {
    id: 'monster_hunter',
    name: 'Kẻ Săn Quái Vật',
    icon: '🏹',
    category: 'combat',
    desc: 'Tiêu diệt 500 quái vật trong suốt hành trình.',
    metric: 'kills',
    goal: 500,
    difficulty: 'easy',
    reward: { type: 'exp_bonus', value: 0.01, percent: 1, desc: '✨ +1% EXP Vĩnh Viễn' }
  },
  {
    id: 'island_slayer',
    name: 'Đồ Tể Hòn Đảo',
    icon: '💀',
    category: 'combat',
    desc: 'Tiêu diệt 2,500 quái vật trên khắp chiến trường.',
    metric: 'kills',
    goal: 2500,
    difficulty: 'medium',
    reward: { type: 'exp_bonus', value: 0.02, percent: 2, desc: '✨ +2% EXP Vĩnh Viễn' }
  },
  {
    id: 'annihilator',
    name: 'Hủy Diệt Vô Tận',
    icon: '⚡',
    category: 'combat',
    desc: 'Chạm mốc 10,000 quái vật bị tiêu diệt.',
    metric: 'kills',
    goal: 10000,
    difficulty: 'hard',
    reward: { type: 'exp_bonus', value: 0.03, percent: 3, desc: '✨ +3% EXP Vĩnh Viễn' }
  },
  {
    id: 'super_crit',
    name: 'Đòn Đánh Hủy Diệt',
    icon: '💥',
    category: 'combat',
    desc: 'Kích hoạt Siêu Chí Mạng (Crit Tier >= 2 tầng).',
    metric: 'super_crit',
    goal: 1,
    difficulty: 'easy',
    reward: { type: 'exp_bonus', value: 0.01, percent: 1, desc: '✨ +1% EXP Vĩnh Viễn' }
  },

  // =========================================================================
  // 2. SINH TỒN (SURVIVAL) - 5 Thành Tựu
  // =========================================================================
  {
    id: 'survivor_5',
    name: 'Sinh Tồn Sơ Cấp',
    icon: '⏱️',
    category: 'survival',
    desc: 'Sống sót thành công qua 5 phút (300 giây).',
    metric: 'max_time',
    goal: 300,
    difficulty: 'easy',
    reward: { type: 'exp_bonus', value: 0.01, percent: 1, desc: '✨ +1% EXP Vĩnh Viễn' }
  },
  {
    id: 'survivor_10',
    name: 'Ý Chí Thép',
    icon: '⏳',
    category: 'survival',
    desc: 'Trụ vững qua 10 phút nghẹt thở trong trận đấu.',
    metric: 'max_time',
    goal: 600,
    difficulty: 'medium',
    reward: { type: 'exp_bonus', value: 0.02, percent: 2, desc: '✨ +2% EXP Vĩnh Viễn' }
  },
  {
    id: 'survivor_20',
    name: 'Bất Tử Chiến Thần',
    icon: '🛡️',
    category: 'survival',
    desc: 'Hoàn thành trọn vẹn 20 phút Chiến Dịch Sinh Tồn.',
    metric: 'max_time',
    goal: 1200,
    difficulty: 'hard',
    reward: { type: 'exp_bonus', value: 0.03, percent: 3, desc: '✨ +3% EXP Vĩnh Viễn', title: 'Kẻ Bất Tử' }
  },
  {
    id: 'level_20',
    name: 'Trưởng Thành Thần Tốc',
    icon: '🌟',
    category: 'survival',
    desc: 'Đạt Cấp Độ 20 trong một trận đấu.',
    metric: 'max_level',
    goal: 20,
    difficulty: 'easy',
    reward: { type: 'exp_bonus', value: 0.01, percent: 1, desc: '✨ +1% EXP Vĩnh Viễn' }
  },
  {
    id: 'level_50',
    name: 'Đỉnh Cao Ma Lực',
    icon: '🔮',
    category: 'survival',
    desc: 'Đạt Cấp Độ 50 trong một trận đấu.',
    metric: 'max_level',
    goal: 50,
    difficulty: 'medium',
    reward: { type: 'exp_bonus', value: 0.02, percent: 2, desc: '✨ +2% EXP Vĩnh Viễn' }
  },

  // =========================================================================
  // 3. TRÙM CUỐI (BOSS) - 5 Thành Tựu
  // =========================================================================
  {
    id: 'kill_mini_boss',
    name: 'Tiểu Bá Vương Ngã Ngựa',
    icon: '👹',
    category: 'boss',
    desc: 'Tiêu diệt Mini Boss đầu tiên xuất hiện ở phút 02:30.',
    metric: 'mini_boss_kills',
    goal: 1,
    difficulty: 'easy',
    reward: { type: 'exp_bonus', value: 0.01, percent: 1, desc: '✨ +1% EXP Vĩnh Viễn' }
  },
  {
    id: 'kill_5_mini_boss',
    name: 'Kẻ Săn Tinh Anh',
    icon: '👺',
    category: 'boss',
    desc: 'Tiêu diệt tích lũy 5 Mini Boss qua các đợt càn quét.',
    metric: 'mini_boss_kills',
    goal: 5,
    difficulty: 'medium',
    reward: { type: 'exp_bonus', value: 0.02, percent: 2, desc: '✨ +2% EXP Vĩnh Viễn' }
  },
  {
    id: 'kill_meruru',
    name: 'Đại Ma Nữ Thất Thủ',
    icon: '🧙‍♀️',
    category: 'boss',
    desc: 'Đánh bại Đại Ma Nữ Meruru ở phút 10:00.',
    metric: 'meruru_kills',
    goal: 1,
    difficulty: 'medium',
    reward: { type: 'exp_bonus', value: 0.02, percent: 2, desc: '✨ +2% EXP Vĩnh Viễn', title: 'Khắc Tinh Ma Nữ' }
  },
  {
    id: 'kill_yuki',
    name: 'Chúa Tể Băng Hà',
    icon: '👑',
    category: 'boss',
    desc: 'Tiêu diệt Chúa Tể Yuki tối thượng ở phút 20:00.',
    metric: 'yuki_kills',
    goal: 1,
    difficulty: 'hard',
    reward: { type: 'exp_bonus', value: 0.03, percent: 3, desc: '✨ +3% EXP Vĩnh Viễn', title: 'Cứu Thế Chủ' }
  },
  {
    id: 'campaign_victory',
    name: 'Khúc Ca Khải Hoàn',
    icon: '🏆',
    category: 'boss',
    desc: 'Giành Chiến Thắng Chiến Dịch Sinh Tồn và sống sót trở về.',
    metric: 'win_campaign',
    goal: 1,
    difficulty: 'hard',
    reward: { type: 'exp_bonus', value: 0.03, percent: 3, desc: '✨ +3% EXP Vĩnh Viễn' }
  },

  // =========================================================================
  // 4. SƯU TẦM TRI THỨC (COLLECTION) - 5 Thành Tựu
  // =========================================================================
  {
    id: 'first_evolution',
    name: 'Bão Kiếm Khởi Sinh',
    icon: '⭐',
    category: 'collection',
    desc: 'Hợp nhất thành công Vũ khí Tối Thượng (Bão Kiếm Cổ Đại).',
    metric: 'evolved_weapons',
    goal: 1,
    difficulty: 'easy',
    reward: { type: 'exp_bonus', value: 0.01, percent: 1, desc: '✨ +1% EXP Vĩnh Viễn' }
  },
  {
    id: 'read_5_books',
    name: 'Học Giả Sơ Nhập',
    icon: '📘',
    category: 'collection',
    desc: 'Mở khóa và thu thập 5 Tác Phẩm trong Thư Viện.',
    metric: 'unlocked_books',
    goal: 5,
    difficulty: 'easy',
    reward: { type: 'exp_bonus', value: 0.01, percent: 1, desc: '✨ +1% EXP Vĩnh Viễn' }
  },
  {
    id: 'read_15_books',
    name: 'Đại Học Sĩ',
    icon: '📕',
    category: 'collection',
    desc: 'Mở khóa và thu thập 15 Tác Phẩm trong Thư Viện.',
    metric: 'unlocked_books',
    goal: 15,
    difficulty: 'medium',
    reward: { type: 'exp_bonus', value: 0.02, percent: 2, desc: '✨ +2% EXP Vĩnh Viễn' }
  },
  {
    id: 'read_49_books',
    name: 'Kho Tàng Nhân Loại',
    icon: '📜',
    category: 'collection',
    desc: 'Mở khóa toàn bộ 49 Tác Phẩm Tri Thức Cổ Đại.',
    metric: 'unlocked_books',
    goal: 49,
    difficulty: 'hard',
    reward: { type: 'exp_bonus', value: 0.03, percent: 3, desc: '✨ +3% EXP Vĩnh Viễn', title: 'Toàn Tri Toàn Năng' }
  },
  {
    id: 'mythic_fusion',
    name: 'Chạm Tới Thần Quyền',
    icon: '✨',
    category: 'collection',
    desc: 'Hợp thể thành công một Tác Phẩm Thần Thoại (Mythic Fusion).',
    metric: 'mythic_fusions',
    goal: 1,
    difficulty: 'medium',
    reward: { type: 'exp_bonus', value: 0.02, percent: 2, desc: '✨ +2% EXP Vĩnh Viễn' }
  }
];

export class AchievementSystem {
  constructor(game = null) {
    this.game = game;
    this.definitions = [...INITIAL_ACHIEVEMENTS];
    this.state = {}; // { [id]: { unlocked: boolean, progress: number, unlockedAt: number, claimed: boolean } }
    this.unlockedFeatures = new Set();
    this.recentUnlocks = []; // Queue banner thông báo

    this.load();
  }

  // Tải dữ liệu lưu trữ từ localStorage
  load() {
    try {
      const raw = localStorage.getItem(ACHIEVEMENTS_SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.state = parsed.state || {};
        if (Array.isArray(parsed.unlockedFeatures)) {
          this.unlockedFeatures = new Set(parsed.unlockedFeatures);
        }
      }
    } catch (e) {
      console.warn('Lỗi đọc dữ liệu Thành Tựu:', e);
      this.state = {};
      this.unlockedFeatures = new Set();
    }

    // Khởi tạo các thành tựu mới nếu chưa có trong state
    for (const def of this.definitions) {
      if (!this.state[def.id]) {
        this.state[def.id] = {
          unlocked: false,
          progress: 0,
          unlockedAt: null,
          claimed: false
        };
      }
    }
  }

  // Lưu dữ liệu vào localStorage
  save() {
    try {
      const data = {
        state: this.state,
        unlockedFeatures: Array.from(this.unlockedFeatures),
        version: 2
      };
      localStorage.setItem(ACHIEVEMENTS_SAVE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Lỗi lưu dữ liệu Thành Tựu:', e);
    }
  }

  // =========================================================================
  // ĐĂNG KÝ THÊM THÀNH TỰU MỚI (Dành cho việc mở rộng sau này)
  // =========================================================================
  registerAchievement(achConfig) {
    if (!achConfig || !achConfig.id) return;
    const exists = this.definitions.find(d => d.id === achConfig.id);
    if (!exists) {
      this.definitions.push(achConfig);
      if (!this.state[achConfig.id]) {
        this.state[achConfig.id] = {
          unlocked: false,
          progress: 0,
          unlockedAt: null,
          claimed: false
        };
      }
      this.save();
    }
  }

  // Kiểm tra thành tựu đã được mở khóa chưa
  isUnlocked(id) {
    return Boolean(this.state[id] && this.state[id].unlocked);
  }

  // Kiểm tra tính năng hoặc vật phẩm có được mở khóa qua thành tựu chưa
  hasFeature(featureKey) {
    return this.unlockedFeatures.has(featureKey);
  }

  // Lấy tiến độ hiện tại của thành tựu
  getProgress(id) {
    return (this.state[id] && this.state[id].progress) || 0;
  }

  // Cập nhật tiến độ của một metric (kills, max_time, mini_boss_kills, v.v.)
  track(metric, value = 1, isAbsolute = false) {
    let anyNewlyUnlocked = false;

    for (const def of this.definitions) {
      if (def.metric !== metric) continue;
      const curState = this.state[def.id];
      if (!curState || curState.unlocked) continue;

      if (isAbsolute) {
        curState.progress = Math.max(curState.progress || 0, value);
      } else {
        curState.progress = (curState.progress || 0) + value;
      }

      if (curState.progress >= def.goal) {
        curState.progress = def.goal;
        curState.unlocked = true;
        curState.unlockedAt = Date.now();
        anyNewlyUnlocked = true;

        // Tự động cấp phần thưởng
        this.grantReward(def);

        // Đẩy vào thông báo nổi bật trên màn hình
        this.recentUnlocks.push({
          achievement: def,
          timer: 4.5
        });
      }
    }

    if (anyNewlyUnlocked) {
      this.save();
    }
  }

  // Cấp phần thưởng khi đạt thành tựu
  grantReward(def) {
    if (!def.reward) return;
    const r = def.reward;

    if (r.type === 'exp_bonus') {
      // EXP bonus được tính tự động theo thời gian thực qua getTotalExpBonus()
      if (r.title) {
        this.unlockedFeatures.add('title_' + def.id);
      }
    } else if (r.type === 'gold' && this.game && this.game.meta) {
      this.game.meta.gold += r.value;
      this.game.meta.save();
    } else if (r.type === 'score' && this.game && this.game.masterySystem && this.game.selectedChar) {
      this.game.masterySystem.addTestScore(this.game.selectedChar.id, r.value);
    } else if (r.type === 'unlock_feature') {
      this.unlockedFeatures.add(r.value);
      if (r.extraGold && this.game && this.game.meta) {
        this.game.meta.gold += r.extraGold;
        this.game.meta.save();
      }
    }
  }

  // Tính tổng % EXP buff vĩnh viễn từ toàn bộ thành tựu đã mở khóa
  getTotalExpBonus() {
    let total = 0;
    for (const def of this.definitions) {
      if (this.isUnlocked(def.id) && def.reward && def.reward.type === 'exp_bonus') {
        total += (def.reward.value || 0);
      }
    }
    return total;
  }

  getTotalExpPercent() {
    return Math.round(this.getTotalExpBonus() * 100);
  }

  // Đếm tổng số thành tựu đã hoàn thành
  getStats() {
    const total = this.definitions.length;
    let unlockedCount = 0;
    let totalExpPercent = 0;
    for (const def of this.definitions) {
      if (this.state[def.id] && this.state[def.id].unlocked) {
        unlockedCount++;
        if (def.reward && def.reward.type === 'exp_bonus') {
          totalExpPercent += (def.reward.percent || 0);
        }
      }
    }
    const percent = total > 0 ? Math.round((unlockedCount / total) * 100) : 0;
    return { unlockedCount, total, percent, totalExpPercent };
  }

  // Lấy danh sách thành tựu đã lọc theo danh mục
  getByCategory(catId = 'all') {
    if (catId === 'all') return this.definitions;
    return this.definitions.filter(d => d.category === catId);
  }

  // Cập nhật timer thông báo gần đây (gọi trong game loop)
  update(delta) {
    if (this.recentUnlocks.length > 0) {
      const cur = this.recentUnlocks[0];
      cur.timer -= delta;
      if (cur.timer <= 0) {
        this.recentUnlocks.shift();
      }
    }
  }
}
