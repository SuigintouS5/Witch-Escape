// Cấu hình thông số toàn cục cho Game
export const CONFIG = {
  // Độ phân giải chuẩn (Full HD 1920x1080 siêu sắc nét)
  CANVAS_WIDTH: 1920,
  CANVAS_HEIGHT: 1080,

  // Kích thước thế giới (khu rừng rộng lớn 4800x4800)
  WORLD_WIDTH: 4800,
  WORLD_HEIGHT: 4800,

  // Thông số nhân vật người chơi
  PLAYER: {
    WIDTH: 48,
    HEIGHT: 96,
    BASE_SPEED: 230,
    MAX_HEALTH: 100,
    BASE_CRIT_CHANCE: 0.05, // Tỉ lệ chí mạng cơ bản 5%
    BASE_CRIT_DAMAGE: 2.0,   // Sát thương chí mạng 200% (x2 dmg)
    INVINCIBILITY_DURATION: 0.35, // Thời gian bất tử sau khi nhận đòn (giây)
    SPRITE_SRC: 'assets/characters/pxArt (1).png',
    FALLBACK_SRC: 'assets/characters/pxArt (4).png'
  },

  // Danh sách các nhân vật có thể lựa chọn
  CHARACTERS: [
    {
      id: 'sorceress',
      name: 'Nikaido Hiro',
      title: 'Phù Thủy',
      desc: '1 người có khả năng quay ngược thời gian khi chết',
      sprite: 'character/hiro.png',
      witchSprite: 'character/hiro1.png',
      width: 48,
      height: 100,
      maxHealth: 100,
      baseSpeed: 230,
      critChance: 0.05,
      critDamage: 2.0,
      startingWeaponId: 'main_sword',
      witchKillRequirement: 100
    },
    {
      id: 'dark_knight',
      name: 'Hắc Kiếm Sĩ',
      title: 'Hiệp Sĩ Tử Thần',
      desc: 'Máu trâu, phòng thủ cứng cáp. Khởi đầu với Vành Đai Kiếm Khí xoay quanh người.',
      sprite: 'assets/enemies/dark_knight_walk.png',
      spriteSheet: { cols: 8, rows: 1 },
      width: 68,
      height: 68,
      maxHealth: 150,
      baseSpeed: 210,
      critChance: 0.03,
      critDamage: 2.0,
      startingWeaponId: 'orbiting_blades'
    },
    {
      id: 'high_mage',
      name: 'Đại Pháp Sư Rừng Xanh',
      title: 'Bậc Thầy Nguyên Tố',
      desc: 'Bậc thầy ma pháp thiêu đốt diện rộng. Khởi đầu với Hào Quang Thánh Địa.',
      sprite: 'assets/characters/mage_walk.png',
      spriteSheet: { cols: 8, rows: 1 },
      width: 64,
      height: 64,
      maxHealth: 85,
      baseSpeed: 245,
      critChance: 0.08,
      critDamage: 2.2,
      startingWeaponId: 'holy_aura'
    }
  ],

  // Các chế độ độ khó
  DIFFICULTIES: [
    {
      id: 'normal',
      name: 'Bình Thường (Normal)',
      desc: 'Độ khó chuẩn. Thích hợp để làm quen và tích lũy tiền vàng.',
      color: '#4ade80',
      enemyHealthMult: 1.0,
      enemySpeedMult: 1.0,
      spawnRateMult: 1.0,
      scoreMult: 1.0,
      goldMult: 1.0
    },
    {
      id: 'hard',
      name: 'Ác Mộng (Nightmare)',
      desc: 'Quái đông hơn +35%, máu trâu hơn +40%. Điểm số và vàng thưởng +50%.',
      color: '#f59e0b',
      enemyHealthMult: 1.4,
      enemySpeedMult: 1.15,
      spawnRateMult: 1.35,
      scoreMult: 1.5,
      goldMult: 1.5
    },
    {
      id: 'hell',
      name: 'Địa Ngục (Hell)',
      desc: 'Quái cực trâu x2 Máu, tốc độ nhanh. Thách thức đỉnh cao: Điểm & Vàng x2.2!',
      color: '#ef4444',
      enemyHealthMult: 2.0,
      enemySpeedMult: 1.30,
      spawnRateMult: 1.70,
      scoreMult: 2.2,
      goldMult: 2.2
    }
  ],

  // Cấu hình Chế Độ Chơi (Game Modes)
  MODES: [
    {
      id: 'normal',
      name: 'Chiến Dịch Sinh Tồn (20 Phút)',
      tag: '⏱️ CHIẾN DỊCH CHUẨN',
      desc: 'Sống sót 20 phút qua các đợt bão quái và Mini Boss. Tiêu diệt 2 Đại Ma Nữ Meruru (10p) và Yuki (20p) để giành chiến thắng vẻ vang!',
      icon: '🛡️',
      color: '#38bdf8',
      timeLimit: 1200 // 20 phút
    },
    {
      id: 'endless',
      name: 'Địa Ngục Vô Tận (Endless)',
      tag: '♾️ KHÔNG GIỚI HẠN',
      desc: 'Không giới hạn thời gian! Boss và quái lặp lại chu kỳ 2 lần tới phút 40, sau đó toàn bộ bản đồ sẽ bị bao phủ bởi biển quái vô tận cực hung bạo.',
      icon: '🔥',
      color: '#f43f5e',
      timeLimit: 0
    }
  ],

  // Hệ thống Thử Thách Bổ Sung (Challenge Modifiers)
  // Tích chọn để tăng hệ số thưởng Điểm & Vàng (Chỉ nhận thưởng nếu sống sót >= 2 phút)
  CHALLENGES: [
    {
      id: 'lock_weapon',
      name: '🔒 Khóa 1 Ô Tấn Công',
      desc: 'Chỉ được trang bị tối đa 4 vũ khí tấn công.',
      scoreBonus: 0.15,
      goldBonus: 0.15
    },
    {
      id: 'lock_defense',
      name: '🔒 Khóa 1 Ô Phòng Thủ',
      desc: 'Chỉ được trang bị tối đa 3 trang bị phòng thủ.',
      scoreBonus: 0.12,
      goldBonus: 0.12
    },
    {
      id: 'lock_utility',
      name: '🔒 Khóa 1 Ô Đa Dụng',
      desc: 'Chỉ được trang bị tối đa 2 trang bị đa dụng.',
      scoreBonus: 0.10,
      goldBonus: 0.10
    },
    {
      id: 'no_heal',
      name: '🚫 Không Thể Hồi Máu',
      desc: 'Vô hiệu hóa toàn bộ kỹ năng, trang bị và bình máu hồi phục.',
      scoreBonus: 0.40,
      goldBonus: 0.40
    },
    {
      id: 'less_damage',
      name: '🗡️ Giảm 50% Sát Thương',
      desc: 'Mọi đòn đánh chỉ gây ra một nửa lượng sát thương thông thường.',
      scoreBonus: 0.35,
      goldBonus: 0.35
    },
    {
      id: 'less_health',
      name: '💔 Giảm 50% Máu Tối Đa',
      desc: 'Lượng máu tối đa bị giảm 50% so với ban đầu.',
      scoreBonus: 0.25,
      goldBonus: 0.25
    },
    {
      id: 'less_speed',
      name: '🐢 Giảm 40% Tốc Độ',
      desc: 'Tốc độ di chuyển của nhân vật bị giảm 40%.',
      scoreBonus: 0.30,
      goldBonus: 0.30
    },
    {
      id: 'more_incoming_damage',
      name: '🛡️ Nhận Thêm 50% Sát Thương',
      desc: 'Chịu thêm 50% sát thương từ mọi nguồn đòn đánh của kẻ địch.',
      scoreBonus: 0.30,
      goldBonus: 0.30
    },
    {
      id: 'enemy_hp_x10',
      name: '🧟 Quái Vật Gấp 10 Máu',
      desc: 'Toàn bộ quái vật và Boss sở hữu lượng máu gấp 10 lần.',
      scoreBonus: 0.60,
      goldBonus: 0.60
    },
    {
      id: 'enemy_count_x4',
      name: '👥 Quái Vật Đông Gấp 4 Lần',
      desc: 'Mật độ và tần suất xuất hiện của quái vật dồn dập gấp 4 lần.',
      scoreBonus: 0.50,
      goldBonus: 0.50
    },
    {
      id: 'one_hit_death',
      name: '⚡ Tử Địa: Đúng 1 Máu (1 HP)',
      desc: 'Nhân vật chỉ có đúng 1 Máu duy nhất - Trúng đòn là ngã xuống ngay!',
      scoreBonus: 0.80,
      goldBonus: 0.80
    }
  ],

  // Cấu hình các chủng loại Quái vật
  ENEMIES: {
    MAX_COUNT: 75, // Giới hạn số quái tối đa trên bản đồ để giữ 60 FPS mượt mà
    TYPES: {
      ZOMBIE: {
        id: 'zombie',
        name: 'Zombie Rừng Đêm',
        sprite: 'assets/enemies/blood_monster_tight.png',
        // Dải hoạt ảnh 8 frames, mỗi frame cắt chuẩn pixel 24x24
        spriteSheet: { cols: 8, rows: 1, animFrames: 8 },
        // Kích thước gấp đôi: 104x104 (gốc 52x52)
        width: 104,
        height: 104,
        speed: 70,
        maxHealth: 35,
        damage: 10,
        color: '#c03030'
      },
      SKELETON: {
        id: 'skeleton',
        name: 'Bộ Xương Tà Ác',
        sprite: 'assets/enemies/demon_tight.png',
        // Dải hoạt ảnh 8 frames, mỗi frame cắt chuẩn pixel 26x26
        spriteSheet: { cols: 8, rows: 1, animFrames: 8 },
        // Kích thước gấp đôi: 112x112 (gốc 56x56)
        width: 112,
        height: 112,
        speed: 110,
        maxHealth: 22,
        damage: 8,
        color: '#9040a0'
      },
      REAPER: {
        id: 'reaper',
        name: 'Tử Thần Bóng Tối',
        sprite: 'assets/enemies/reaper.png',
        // Kích thước lớn hơn nhân vật > 25% (Nhân vật cao 96 -> Tử thần cao 125, rộng 110)
        width: 110,
        height: 125,
        speed: 85,
        maxHealth: 160,
        damage: 22,
        isElite: true,
        color: '#9040a0'
      },
      GOKUCHO: {
        id: 'gokucho',
        name: 'Gokucho Pháp Sư Đánh Xa',
        sprite: 'assets/enemies/gokucho1.png',
        width: 54,
        height: 70,
        speed: 80,
        maxHealth: 45,
        damage: 12,
        isRanged: true,
        shootCooldown: 2.2, // Bắn cầu hắc ám mỗi 2.2 giây
        preferredDistance: 320, // Giữ cự ly 320px với người chơi
        color: '#e05080'
      },
      // Quái mới: Hắc Hiệp Sĩ (Dark Knight Marauder) từ bộ asset2 - Bắn cầu lửa
      AXE_FIRE: {
        id: 'axe_fire',
        name: 'Hắc Hiệp Sĩ Bắn Xa',
        sprite: 'assets/enemies/dark_knight_walk.png',
        spriteSheet: { cols: 8, rows: 1, animFrames: 8 },
        width: 80,
        height: 80,
        speed: 75,
        maxHealth: 50,
        damage: 14,
        isRanged: true,
        shootCooldown: 2.0,
        preferredDistance: 280,
        color: '#ff5722'
      }
    }
  },

  // Đạn của quái đánh xa
  PROJECTILES: {
    DARK_ORB: {
      sprite: 'assets/effects/dark_orb.png',
      speed: 210,
      radius: 12,
      damage: 14,
      lifespan: 4.5
    }
  },

  // Màu sắc và chủ đề Dark Fantasy
  THEME: {
    NIGHT_OVERLAY: 'rgba(10, 15, 28, 0.40)',
    TORCH_LIGHT_RADIUS: 650,
    TORCH_COLOR_INNER: 'rgba(255, 240, 200, 0.20)',
    TORCH_COLOR_OUTER: 'rgba(10, 15, 28, 0.88)'
  }
};
