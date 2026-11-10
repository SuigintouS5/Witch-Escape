// =========================================================================
// HỆ THỐNG THÔNG THẠO VÀ CÂY KỸ NĂNG NHÂN VẬT (CHARACTER MASTERY SYSTEM)
// Cấu trúc phân nhánh 5 tầng hình vuông • 3 Tab chuyển đổi • Giới hạn 100 Điểm
// =========================================================================

const MASTERY_SAVE_KEY = 'vampire_survival_character_mastery_v3';

// Định nghĩa 27 Nút Kỹ Năng phân nhánh theo 3 Tab (Sinh Tồn, Tấn Công, Tiện Ích)
export const SKILL_TREE_DEFINITIONS = {
  // -----------------------------------------------------------------------
  // TAB 1: SINH TỒN & PHÒNG THỦ (GREEN)
  // -----------------------------------------------------------------------
  s1: {
    id: 's1', branch: 'green', tier: 1, slot: 'slot-tier1',
    name: 'Thể Chất Bền Bỉ', icon: '❤️',
    costPerLevel: 1, maxLevel: 5, req: null,
    desc: 'Gia tăng sinh mệnh cơ bản giúp chịu đựng các đợt bão quái đầu trận.',
    format: (lvl) => `+${lvl * 80} Máu Tối Đa (Max +400 HP)`
  },
  s2: {
    id: 's2', branch: 'green', tier: 2, slot: 'slot-tier2-left',
    name: 'Giáp Cứng Cổ Đại', icon: '🛡️',
    costPerLevel: 2, maxLevel: 3, req: 's1',
    desc: 'Lớp giáp phòng thủ cứng cáp hấp thụ trực tiếp sát thương đòn đánh từ quái.',
    format: (lvl) => `+${lvl * 5} Điểm Giáp Cứng (Max +15 Giáp)`
  },
  s3: {
    id: 's3', branch: 'green', tier: 2, slot: 'slot-tier2-right',
    name: 'Bộ Pháp Mau Lẹ', icon: '👟',
    costPerLevel: 2, maxLevel: 3, req: 's1',
    desc: 'Luyện tập bước chân linh hoạt giúp giữ khoảng cách an toàn và né đòn.',
    format: (lvl) => `+${(lvl * 2.0).toFixed(1)}% Tốc Chạy & +${(lvl * 1.5).toFixed(1)}% Né Tránh`
  },
  s4: {
    id: 's4', branch: 'green', tier: 3, slot: 'slot-tier3-left',
    name: 'Huyết Mạch Tái Sinh', icon: '🌿',
    costPerLevel: 3, maxLevel: 3, req: 's2',
    desc: 'Tự động hồi phục sinh lực thần kỳ mỗi giây không phụ thuộc vào bình máu.',
    format: (lvl) => `+${(lvl * 4.0).toFixed(0)} Máu Hồi/Giây (Max +12 HP/s)`
  },
  s5: {
    id: 's5', branch: 'green', tier: 3, slot: 'slot-tier3-mid',
    name: 'Cường Hóa Hộ Giáp', icon: '🔰',
    costPerLevel: 3, maxLevel: 3, req: ['s2', 's3'],
    desc: 'Hệ số giảm sát thương theo phần trăm độc lập với Giáp cứng (tối đa +7.5%).',
    format: (lvl) => `+${(lvl * 2.5).toFixed(1)}% Giảm Sát Thương % (Max +7.5%)`
  },
  s6: {
    id: 's6', branch: 'green', tier: 3, slot: 'slot-tier3-right',
    name: 'Hấp Huyết Ma Pháp', icon: '🩸',
    costPerLevel: 3, maxLevel: 3, req: 's3',
    desc: 'Đòn đánh có tỉ lệ hút trực tiếp sát thương chuyển thành Máu hồi phục.',
    format: (lvl) => `+${(lvl * 0.3).toFixed(1)}% Hút Máu Đòn Đánh (Max +0.9%)`
  },
  s7: {
    id: 's7', branch: 'green', tier: 4, slot: 'slot-tier4-left',
    name: 'Gai Nhọn Phản Kích', icon: '🦔',
    costPerLevel: 4, maxLevel: 2, req: ['s4', 's5'],
    desc: 'Phản đòn sát thương cố định và theo phần trăm lên kẻ địch dám tấn công.',
    format: (lvl) => `Phản đòn +${lvl * 80} cố định & +${(lvl * 2.5).toFixed(1)}% Sát thương nhận`
  },
  s8: {
    id: 's8', branch: 'green', tier: 4, slot: 'slot-tier4-right',
    name: 'Thần Tốc Né Đòn', icon: '💨',
    costPerLevel: 4, maxLevel: 2, req: ['s5', 's6'],
    desc: 'Tăng mạnh tỉ lệ né tránh; né thành công giúp hồi phục ngay một phần Máu.',
    format: (lvl) => `+${lvl * 2.5}% Né Tránh & Khi né thành công hồi ${lvl * 3}% Máu`
  },
  s9: {
    id: 's9', branch: 'green', tier: 5, slot: 'slot-tier5',
    name: 'Bất Tử Niết Bàn', icon: '👑',
    costPerLevel: 12, maxLevel: 1, req: ['s7', 's8'],
    isKeystone: true,
    desc: '[KEYSTONE TỐI THƯỢNG] Khi chịu đòn chí tử: Kích hoạt 1 LẦN DUY NHẤT trong trận -> nhận Khiên Bất Tử 3.0s, hồi ngay 50% Máu tối đa và đẩy lùi toàn bộ quái vật xung quanh.',
    format: (lvl) => lvl > 0 ? 'ĐÃ KÍCH HOẠT (1 LẦN DUY NHẤT / TRẬN)' : 'Chưa kích hoạt'
  },

  // -----------------------------------------------------------------------
  // TAB 2: TẤN CÔNG & HỦY DIỆT (RED)
  // -----------------------------------------------------------------------
  o1: {
    id: 'o1', branch: 'red', tier: 1, slot: 'slot-tier1',
    name: 'Uy Lực Linh Hồn', icon: '⚔️',
    costPerLevel: 1, maxLevel: 5, req: null,
    desc: 'Khuếch đại sát thương cơ bản cho toàn bộ vũ khí chính và vũ khí phụ.',
    format: (lvl) => `+${lvl * 3}% Sát Thương Toàn Bộ Vũ Khí (Max +15%)`
  },
  o2: {
    id: 'o2', branch: 'red', tier: 2, slot: 'slot-tier2-left',
    name: 'Tâm Nhãn Bạo Kích', icon: '🎯',
    costPerLevel: 2, maxLevel: 5, req: 'o1', // 5 cấp x 2% = max đúng 10% theo yêu cầu
    desc: 'Tập trung tâm nhãn gia tăng tỉ lệ tung đòn đánh chí mạng bùng nổ (Tối đa +10%).',
    format: (lvl) => `+${(lvl * 2.0).toFixed(1)}% Tỉ Lệ Đánh Chí Mạng (Max +10.0%)`
  },
  o3: {
    id: 'o3', branch: 'red', tier: 2, slot: 'slot-tier2-right',
    name: 'Cuồng Nộ Bạo Kích', icon: '💥',
    costPerLevel: 2, maxLevel: 3, req: 'o1',
    desc: 'Tăng mạnh hệ số sát thương bạo kích nhân lên khi đánh trúng chỗ hiểm.',
    format: (lvl) => `+${lvl * 10}% Sát Thương Chí Mạng (Max +30%)`
  },
  o4: {
    id: 'o4', branch: 'red', tier: 3, slot: 'slot-tier3-left',
    name: 'Xuyên Giáp Cố Định', icon: '🗡️',
    costPerLevel: 3, maxLevel: 3, req: 'o2',
    desc: 'Bỏ qua một lượng giáp cố định của quái vật giúp gây trọn sát thương.',
    format: (lvl) => `+${lvl * 6} Điểm Xuyên Giáp Cố Định (Max +18)`
  },
  o5: {
    id: 'o5', branch: 'red', tier: 3, slot: 'slot-tier3-mid',
    name: 'Mũi Nhọn Chuẩn Xác', icon: '🏹',
    costPerLevel: 3, maxLevel: 3, req: ['o2', 'o3'],
    desc: 'Tăng độ chính xác khắc chế né tránh của quái và phá giáp theo %.',
    format: (lvl) => `+${lvl * 3}% Chính Xác & Bỏ Qua ${lvl * 5}% Giáp Quái`
  },
  o6: {
    id: 'o6', branch: 'red', tier: 3, slot: 'slot-tier3-right',
    name: 'Phá Giới Diện Rộng', icon: '💣',
    costPerLevel: 3, maxLevel: 3, req: 'o3',
    desc: 'Mở rộng kích thước kiếm, tầm quét và bán kính tác động của vũ khí.',
    format: (lvl) => `+${lvl * 6}% Bán Kính Tác Động Vũ Khí (Max +18%)`
  },
  o7: {
    id: 'o7', branch: 'red', tier: 4, slot: 'slot-tier4-left',
    name: 'Trảm Sát Khát Máu', icon: '🩸',
    costPerLevel: 4, maxLevel: 2, req: ['o4', 'o5'],
    desc: 'Gia tăng sát thương dứt điểm lên kẻ địch khi máu tụt dưới 30%.',
    format: (lvl) => `+${lvl * 15}% Sát Thương Lên Quái Máu Dưới 30%`
  },
  o8: {
    id: 'o8', branch: 'red', tier: 4, slot: 'slot-tier4-right',
    name: 'Cuồng Phong Đoạt Mệnh', icon: '⚡',
    costPerLevel: 4, maxLevel: 2, req: ['o5', 'o6'],
    desc: 'Khi tung đòn chí mạng tăng tốc độ di chuyển và tốc đánh trong 2 giây.',
    format: (lvl) => `Chí Mạng: +${lvl * 5}% Tốc Chạy & +${lvl * 5}% Tốc Đánh (2s)`
  },
  o9: {
    id: 'o9', branch: 'red', tier: 5, slot: 'slot-tier5',
    name: 'Diệt Thế Bạo Kích', icon: '💀',
    costPerLevel: 12, maxLevel: 1, req: ['o7', 'o8'],
    isKeystone: true,
    desc: '[KEYSTONE TỐI THƯỢNG] Mở khóa Đòn Bạo Kích Cực Hạn (Crit Bậc 2): Đòn đánh chí mạng có 10% cơ hội nhân x2.5 sát thương và phóng sóng xung kích chém quét 180px.',
    format: (lvl) => lvl > 0 ? 'ĐÃ KÍCH HOẠT CHÍ MẠNG CỰC HẠN x2.5' : 'Chưa kích hoạt'
  },

  // -----------------------------------------------------------------------
  // TAB 3: TIỆN ÍCH & NĂNG LƯỢNG (YELLOW)
  // -----------------------------------------------------------------------
  u1: {
    id: 'u1', branch: 'yellow', tier: 1, slot: 'slot-tier1',
    name: 'Khí Tốc Xuất Chiêu', icon: '⚡',
    costPerLevel: 1, maxLevel: 5, req: null,
    desc: 'Tăng tốc luân chuyển năng lượng giúp giảm thời gian hồi chiêu tất cả vũ khí.',
    format: (lvl) => `-${lvl * 2}% Thời Gian Hồi Chiêu Tất Cả Vũ Khí (Max -10%)`
  },
  u2: {
    id: 'u2', branch: 'yellow', tier: 2, slot: 'slot-tier2-left',
    name: 'Từ Trường Hút Ngọc', icon: '🧲',
    costPerLevel: 2, maxLevel: 3, req: 'u1',
    desc: 'Mở rộng bán kính tự động hút Đá Kinh Nghiệm và Vàng rớt ra từ quái.',
    format: (lvl) => `+${lvl * 16} Bán Kính Hút Ngọc & Vàng (Max +48)`
  },
  u3: {
    id: 'u3', branch: 'yellow', tier: 2, slot: 'slot-tier2-right',
    name: 'Bổng Lộc Hoàng Gia', icon: '💰',
    costPerLevel: 2, maxLevel: 3, req: 'u1',
    desc: 'Gia tăng tài nguyên nhận được giúp nhanh chóng thăng tiến sức mạnh.',
    format: (lvl) => `+${lvl * 4}% Vàng & +${(lvl * 3.5).toFixed(1)}% Kinh Nghiệm`
  },
  u4: {
    id: 'u4', branch: 'yellow', tier: 3, slot: 'slot-tier3-left',
    name: 'Quá Tải Hồi Kỹ Năng [G]', icon: '🌀',
    costPerLevel: 3, maxLevel: 3, req: 'u2',
    desc: 'Cường hóa kỹ năng đặc biệt [Phím G] hồi phục nhanh chóng vượt trội.',
    format: (lvl) => `Giảm -${lvl * 8}% Hồi Chiêu Kỹ Năng [G] (Max -24%)`
  },
  u5: {
    id: 'u5', branch: 'yellow', tier: 3, slot: 'slot-tier3-mid',
    name: 'May Mắn Thiên Mệnh', icon: '🎲',
    costPerLevel: 3, maxLevel: 3, req: ['u2', 'u3'],
    desc: 'Nhận thêm lượt Đổi Lại và Loại Bỏ thẻ bài mỗi khi lên cấp độ.',
    format: (lvl) => lvl === 1 ? '+1 Lượt Đổi Lại (Reroll)' : (lvl === 2 ? '+1 Reroll & +1 Banish' : '+2 Reroll & +1 Banish')
  },
  u6: {
    id: 'u6', branch: 'yellow', tier: 3, slot: 'slot-tier3-right',
    name: 'Kho Tàng Thần Bí', icon: '✨',
    costPerLevel: 3, maxLevel: 3, req: 'u3',
    desc: 'Tăng cơ hội xuất hiện Rương Báu 3-5 món và tăng tỉ lệ rơi Bình Máu.',
    format: (lvl) => `+${lvl * 6}% Rương Báu 3-5 Món & +${lvl * 10}% Rơi Bình Máu`
  },
  u7: {
    id: 'u7', branch: 'yellow', tier: 4, slot: 'slot-tier4-left',
    name: 'Tinh Hoa Nhân Vật', icon: '👑',
    costPerLevel: 4, maxLevel: 2, req: ['u4', 'u5'],
    desc: 'Cường hóa kỹ năng nội tại tối thượng độc quyền riêng biệt của nhân vật.',
    format: (lvl) => `Cấp ${lvl}/2 Tinh Hoa Độc Quyền Riêng Từng Nhân Vật`
  },
  u8: {
    id: 'u8', branch: 'yellow', tier: 4, slot: 'slot-tier4-right',
    name: 'Siêu Nạp Năng Lượng', icon: '🔮',
    costPerLevel: 4, maxLevel: 2, req: ['u5', 'u6'],
    desc: 'Khi ăn Ngọc Kinh Nghiệm Đỏ hoặc Rương: Nhận hiệu ứng Siêu Nạp tăng tốc.',
    format: (lvl) => `Ăn Ngọc Đỏ: +${lvl * 10}% Dmg & +${lvl * 8}% Tốc trong 4s`
  },
  u9: {
    id: 'u9', branch: 'yellow', tier: 5, slot: 'slot-tier5',
    name: 'Thời Không Ngưng Đọng', icon: '⏳',
    costPerLevel: 12, maxLevel: 1, req: ['u7', 'u8'],
    isKeystone: true,
    desc: '[KEYSTONE TỐI THƯỢNG] Khi bấm phím [G] hoặc máu dưới 25%: Ngưng đọng thời gian toàn bộ quái vật trong 2.0 giây, tăng +50% tốc độ di chuyển cho bản thân (Hồi chiêu: 90s).',
    format: (lvl) => lvl > 0 ? 'ĐÃ KÍCH HOẠT THỜI KHÔNG NGƯNG ĐỌNG' : 'Chưa kích hoạt'
  }
};

// Liên kết đường nối logic theo từng nhánh [parent, child]
export const BRANCH_LINKS = {
  green: [
    ['s1', 's2'], ['s1', 's3'],
    ['s2', 's4'], ['s2', 's5'], ['s3', 's5'], ['s3', 's6'],
    ['s4', 's7'], ['s5', 's7'], ['s5', 's8'], ['s6', 's8'],
    ['s7', 's9'], ['s8', 's9']
  ],
  red: [
    ['o1', 'o2'], ['o1', 'o3'],
    ['o2', 'o4'], ['o2', 'o5'], ['o3', 'o5'], ['o3', 'o6'],
    ['o4', 'o7'], ['o5', 'o7'], ['o5', 'o8'], ['o6', 'o8'],
    ['o7', 'o9'], ['o8', 'o9']
  ],
  yellow: [
    ['u1', 'u2'], ['u1', 'u3'],
    ['u2', 'u4'], ['u2', 'u5'], ['u3', 'u5'], ['u3', 'u6'],
    ['u4', 'u7'], ['u5', 'u7'], ['u5', 'u8'], ['u6', 'u8'],
    ['u7', 'u9'], ['u8', 'u9']
  ]
};

// Định nghĩa Kỹ Năng Tinh Hoa Tối Thượng theo từng nhân vật (khi nâng nút u7)
export const CHARACTER_SPECIAL_MASTERY = {
  sorceress: {
    name: 'Thời Không Bất Diệt',
    desc: 'Hồi sinh nhận thêm khiên bất tử +0.4s và hồi thêm +10% Máu tối đa mỗi cấp; khi Máu dưới 30% tăng +30% tốc độ chạy.',
    format: (lvl) => `Bất tử +${(lvl * 0.4).toFixed(1)}s, hồi thêm +${lvl * 10}% Máu khi hồi sinh.`
  },
  dark_knight: {
    name: 'Khí Phách Hắc Ám',
    desc: 'Phản đòn thêm +150 cố định và +10 Giáp cứng mỗi cấp; khi đứng yên tăng thêm +15% sát thương đòn đánh.',
    format: (lvl) => `Phản đòn +${lvl * 150}, Giáp cứng +${lvl * 10}, +15% dmg khi đứng yên.`
  },
  high_mage: {
    name: 'Bão Tố Nguyên Thủy',
    desc: 'Mở rộng bán kính Hào quang/Ma pháp thêm +5% và thiêu đốt thêm +15 Sát thương đốt mỗi cấp.',
    format: (lvl) => `+${lvl * 5}% Bán kính Hào quang/Ma pháp, +${lvl * 15} Sát thương đốt/giây.`
  }
};

export class MasterySystem {
  constructor() {
    this.data = {};
    this.load();
  }

  // Khởi tạo dữ liệu mặc định cho 1 nhân vật nếu chưa có
  getDefaultCharData() {
    const skills = {};
    for (const key of Object.keys(SKILL_TREE_DEFINITIONS)) {
      skills[key] = 0;
    }
    return {
      level: 1,               // Cấp thông thạo 1 -> 100
      score: 0,               // Điểm score tích lũy hiện có của nhân vật
      totalScoreEarned: 0,    // Tổng điểm score tích lũy từ trước tới nay
      skillPoints: 0,         // Điểm kỹ năng chưa dùng (tối đa 100)
      skills: skills
    };
  }

  // Lấy dữ liệu của 1 nhân vật (tự động khởi tạo nếu thiếu)
  getCharData(charId) {
    if (!this.data[charId]) {
      this.data[charId] = this.getDefaultCharData();
    }
    const c = this.data[charId];
    if (typeof c.level !== 'number') c.level = 1;
    if (typeof c.score !== 'number') c.score = 0;
    if (typeof c.skillPoints !== 'number') c.skillPoints = 0;
    if (!c.skills) c.skills = {};

    for (const key of Object.keys(SKILL_TREE_DEFINITIONS)) {
      if (typeof c.skills[key] !== 'number') {
        c.skills[key] = 0;
      }
    }
    return c;
  }

  // Kiểm tra nút kỹ năng đã được mở khóa theo đường nối logic chưa
  isNodeUnlocked(charId, nodeId) {
    const def = SKILL_TREE_DEFINITIONS[nodeId];
    if (!def || !def.req) return true; // Nút Tier 1 luôn mở
    const char = this.getCharData(charId);

    if (Array.isArray(def.req)) {
      // Cần ít nhất 1 nút cha có cấp > 0
      return def.req.some(parentId => (char.skills[parentId] || 0) > 0);
    }
    return (char.skills[def.req] || 0) > 0;
  }

  // Kiểm tra có thể hoàn điểm nút mà không làm gãy dependency của các nút con
  canSafelyRefund(charId, nodeId) {
    const char = this.getCharData(charId);
    const cur = char.skills[nodeId] || 0;
    if (cur <= 0) return false;
    // Nếu cấp > 1, giảm 1 cấp không làm mất yêu cầu mở khóa của con
    if (cur > 1) return true;

    // Nếu giảm về 0, kiểm tra xem có nút con nào đang active phụ thuộc duy nhất vào nút này không
    const def = SKILL_TREE_DEFINITIONS[nodeId];
    for (const k of Object.keys(SKILL_TREE_DEFINITIONS)) {
      const child = SKILL_TREE_DEFINITIONS[k];
      if (child.branch === def.branch && (char.skills[k] || 0) > 0) {
        if (child.req === nodeId) return false;
        if (Array.isArray(child.req) && child.req.includes(nodeId)) {
          const otherActiveParent = child.req.some(p => p !== nodeId && (char.skills[p] || 0) > 0);
          if (!otherActiveParent) return false;
        }
      }
    }
    return true;
  }

  // Công thức tính điểm Score cần để lên cấp tiếp theo
  getRequiredScore(currentLevel) {
    if (currentLevel >= 100) return Infinity;
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

  // Tăng 1 cấp Thông Thạo (tiêu tốn Score, tối đa Cấp 100)
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

  // Nâng 1 cấp vào một nút kỹ năng
  allocateSkill(charId, nodeId) {
    const char = this.getCharData(charId);
    const def = SKILL_TREE_DEFINITIONS[nodeId];
    if (!def) return false;

    if (!this.isNodeUnlocked(charId, nodeId)) return false;

    const cur = char.skills[nodeId] || 0;
    if (cur >= def.maxLevel) return false;

    const cost = def.costPerLevel;
    if (char.skillPoints < cost) return false;

    char.skills[nodeId] = cur + 1;
    char.skillPoints -= cost;
    this.save();
    return true;
  }

  // Hoàn lại 1 cấp từ một nút kỹ năng cụ thể
  refundSkill(charId, nodeId) {
    const char = this.getCharData(charId);
    const def = SKILL_TREE_DEFINITIONS[nodeId];
    if (!def) return false;

    if (!this.canSafelyRefund(charId, nodeId)) return false;

    const cur = char.skills[nodeId] || 0;
    if (cur <= 0) return false;

    char.skills[nodeId] = cur - 1;
    char.skillPoints += def.costPerLevel;
    this.save();
    return true;
  }

  // Tẩy điểm riêng của một nhánh (green / red / yellow)
  resetBranch(charId, branch) {
    const char = this.getCharData(charId);
    let refunded = 0;
    for (const key of Object.keys(SKILL_TREE_DEFINITIONS)) {
      const def = SKILL_TREE_DEFINITIONS[key];
      if (def.branch === branch && (char.skills[key] || 0) > 0) {
        refunded += char.skills[key] * def.costPerLevel;
        char.skills[key] = 0;
      }
    }
    char.skillPoints += refunded;
    this.save();
    return refunded;
  }

  // Tẩy Toàn Bộ Điểm Kỹ Năng (cả 3 nhánh)
  resetSkills(charId) {
    const char = this.getCharData(charId);
    let refunded = 0;
    for (const key of Object.keys(SKILL_TREE_DEFINITIONS)) {
      const def = SKILL_TREE_DEFINITIONS[key];
      const cur = char.skills[key] || 0;
      if (cur > 0) {
        refunded += cur * def.costPerLevel;
        char.skills[key] = 0;
      }
    }
    char.skillPoints += refunded;
    this.save();
    return refunded;
  }

  // Tính tổng số điểm đã tiêu trong 1 nhánh
  getPointsSpentInBranch(charId, branch) {
    const char = this.getCharData(charId);
    let total = 0;
    for (const key of Object.keys(SKILL_TREE_DEFINITIONS)) {
      const def = SKILL_TREE_DEFINITIONS[key];
      if (def.branch === branch) {
        total += (char.skills[key] || 0) * def.costPerLevel;
      }
    }
    return total;
  }

  // Tính tổng số điểm đã tiêu trên toàn bộ 3 nhánh
  getTotalPointsSpent(charId) {
    const char = this.getCharData(charId);
    let total = 0;
    for (const key of Object.keys(SKILL_TREE_DEFINITIONS)) {
      const def = SKILL_TREE_DEFINITIONS[key];
      total += (char.skills[key] || 0) * def.costPerLevel;
    }
    return total;
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
    const s = char.skills || {};

    const s1 = s.s1 || 0;
    const s2 = s.s2 || 0;
    const s3 = s.s3 || 0;
    const s4 = s.s4 || 0;
    const s5 = s.s5 || 0;
    const s6 = s.s6 || 0;
    const s7 = s.s7 || 0;
    const s8 = s.s8 || 0;
    const s9 = s.s9 || 0;

    const o1 = s.o1 || 0;
    const o2 = s.o2 || 0; // Max 5 cấp x 2% = đúng 10% theo yêu cầu user
    const o3 = s.o3 || 0;
    const o4 = s.o4 || 0;
    const o5 = s.o5 || 0;
    const o6 = s.o6 || 0;
    const o7 = s.o7 || 0;
    const o8 = s.o8 || 0;
    const o9 = s.o9 || 0;

    const u1 = s.u1 || 0;
    const u2 = s.u2 || 0;
    const u3 = s.u3 || 0;
    const u4 = s.u4 || 0;
    const u5 = s.u5 || 0;
    const u6 = s.u6 || 0;
    const u7 = s.u7 || 0;
    const u8 = s.u8 || 0;
    const u9 = s.u9 || 0;

    return {
      masteryLevel: char.level,

      // 🟢 Sinh tồn
      bonusHealth: s1 * 80,
      bonusArmor: (s2 * 5) + (charId === 'dark_knight' ? u7 * 10 : 0),
      bonusSpeedMult: 1.0 + (s3 * 0.02),
      bonusDodge: (s3 * 0.015) + (s8 * 0.025),
      bonusRegen: s4 * 4.0,
      damageReduction: s5 * 0.025,
      lifesteal: s6 * 0.003,
      bonusReflectFlat: (s7 * 80) + (charId === 'dark_knight' ? u7 * 150 : 0),
      bonusReflectPercent: s7 * 0.025,
      dodgeHealPercent: s8 * 0.03,
      hasPhoenixRevive: s9 > 0, // Bất tử niết bàn (1 LẦN DUY NHẤT / TRẬN)

      // 🔴 Tấn công
      bonusDamageMult: o1 * 0.03,
      bonusCritChance: o2 * 0.02, // Max đúng 10.0% Crit Rate!
      bonusCritDamage: o3 * 0.10,
      armorPenFlat: o4 * 6,
      accuracyBonus: o5 * 0.03,
      armorPenPercent: o5 * 0.05,
      bonusAreaMult: o6 * 0.06,
      executeDamageLowHp: o7 * 0.15,
      critSurgeLevel: o8,
      hasDiệtThếCrit: o9 > 0, // Bạo kích bậc 2

      // 🟡 Tiện ích
      cooldownReduction: u1 * 0.02,
      bonusPickupRange: u2 * 16,
      bonusGoldMult: 1.0 + (u3 * 0.04),
      bonusExpMult: 1.0 + (u3 * 0.035),
      specialSkillCDR: u4 * 0.08,
      bonusReroll: u5 >= 1 ? (u5 === 1 ? 1 : 2) : 0,
      bonusBanish: u5 >= 2 ? 1 : 0,
      chestLuckBonus: u6 * 0.06,
      potionDropBonus: u6 * 0.10,
      specialMasteryLevel: u7,
      superChargeLevel: u8,
      hasTimeFreezeKeystone: u9 > 0
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
