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
      name: 'Nữ Pháp Sư Pha Lê',
      title: 'Pháp Sư Huyền Bí',
      desc: 'Sở hữu Kiếm Pha Lê Hồng bắn tỉa chính xác. Tốc độ cân bằng và chí mạng tốt.',
      sprite: 'assets/characters/pxArt (1).png',
      width: 48,
      height: 96,
      maxHealth: 100,
      baseSpeed: 230,
      critChance: 0.05,
      critDamage: 2.0,
      startingWeaponId: 'main_sword'
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
