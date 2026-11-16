import { CONFIG } from './config.js';
import { InputManager } from './Input.js';
import { Camera } from './Camera.js';
import { GameMap } from './Map.js';
import { Player } from './Player.js';
import { Spawner } from './Spawner.js';
import { Enemy } from './Enemy.js';
import { EnemyProjectile } from './EnemyProjectile.js';
import { WeaponManager } from './Weapon.js';
import { ParticleSystem } from './ParticleSystem.js';
import { ExperienceGem } from './ExperienceGem.js';
import { SkillManager } from './SkillManager.js';
import { UpgradeManager } from './UpgradeManager.js';
import { EvolutionDrop } from './EvolutionDrop.js';
import { MetaProgression } from './MetaProgression.js';
import { HealthDrop } from './HealthDrop.js';
import { Crate } from './Crate.js';
import { TreasureBox } from './TreasureBox.js';
import {
  MasterySystem,
  SKILL_TREE_DEFINITIONS,
  BRANCH_LINKS,
  CHARACTER_SPECIAL_MASTERY
} from './MasterySystem.js';
import { BookSystem, BOOK_DEFINITIONS, STARTER_BOOK_IDS } from './BookSystem.js';
import { BookDrop } from './BookDrop.js';
import { AudioManager } from './AudioManager.js';
import { AchievementSystem, ACHIEVEMENT_CATEGORIES } from './AchievementSystem.js';

// Cache các icon pixel art từ bộ asset mới để vẽ tức thì
const ICON_CACHE = {};
function getIconImage(src) {
  if (!src) return null;
  if (!ICON_CACHE[src]) {
    const img = new Image();
    img.src = src;
    ICON_CACHE[src] = img;
  }
  return ICON_CACHE[src];
}

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');

    this.canvas.width = CONFIG.CANVAS_WIDTH;
    this.canvas.height = CONFIG.CANVAS_HEIGHT;

    this.input = new InputManager();
    this.camera = new Camera(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    this.map = new GameMap();
    this.spawner = new Spawner();
    this.particles = new ParticleSystem();

    // Hệ thống Tiến trình Vĩnh viễn (Meta-Progression & Shop)
    this.meta = new MetaProgression();

    // Hệ thống Thông Thạo & Cây Kỹ Năng Nhân Vật (Mastery System)
    this.masterySystem = new MasterySystem();
    this.skillTreeSelectedCharId = 'sorceress'; // Tab nhân vật đang xem
    this.skillTreeSelectedTab = 'green';        // 'green' (Sinh Tồn) | 'red' (Tấn Công) | 'yellow' (Tiện Ích)
    this.selectedSkillNodeId = 's1';            // Nút kỹ năng đang chọn xem chi tiết
    this.hoveredSkillNode = null;
    this.mouseX = 0;
    this.mouseY = 0;
    this.skillTreeScrollY = 0;
    this.skillTreeMaxScrollY = 440;
    this.isDraggingSkillTree = false;
    this.skillTreeDragStartY = 0;
    this.skillTreeDragStartScrollY = 0;

    // Quản lý Trạng thái Màn hình Game (State Machine)
    // 'MAIN_MENU' | 'CHAR_SELECT' | 'MODE_SELECT' | 'CHALLENGE_SELECT' | 'DIFF_SELECT' | 'SHOP' | 'SKILL_TREE' | 'PLAYING' | 'GAME_OVER'
    this.gameState = 'MAIN_MENU';

    // Lựa chọn nhân vật, chế độ chơi, thử thách & độ khó
    this.selectedChar = CONFIG.CHARACTERS[0];
    this.selectedMode = CONFIG.MODES[0];
    this.selectedChallenges = {}; // Object lưu trạng thái bật/tắt thử thách { [id]: boolean }
    this.selectedDiff = CONFIG.DIFFICULTIES[0];

    // Vật phẩm trên bản đồ
    this.healthDrops = [];
    this.crates = [];
    this.treasureBoxes = [];
    this.pendingLevelUps = 0; // Hàng đợi nhận nâng cấp từ rương/hộp báu
    this.isVictory = false;

    // Kết quả tổng kết cuối trận
    this.endGameStats = {
      score: 0,
      goldEarned: 0,
      survivalTime: 0,
      kills: 0,
      level: 1
    };

    // Danh sách các nút tương tác trên Menu (được render & click)
    this.menuButtons = [];

    this.isPaused = false;
    this.isLevelUpOpen = false;
    this.isEvolutionOpen = false;
    this.currentChoices = [];
    this.choiceCardsRects = [];

    // Vị trí nút Tạm dừng (Full HD)
    this.pauseBtnRect = {
      x: this.canvas.width - 200,
      y: 35,
      w: 165,
      h: 48
    };

    // Vị trí nút Hợp nhất vũ khí & Các nút trong Menu Tạm Dừng
    this.evolutionBtnRect = {
      x: this.canvas.width / 2 - 180,
      y: this.canvas.height / 2 + 130,
      w: 360,
      h: 60
    };
    this.pauseActions = {
      resume: { x: this.canvas.width / 2 - 180, y: 0, w: 360, h: 58 },
      settings: { x: 0, y: 0, w: 220, h: 56 },
      saveExit: { x: this.canvas.width / 2 - 290, y: 0, w: 270, h: 56 },
      exitFinish: { x: this.canvas.width / 2 + 20, y: 0, w: 270, h: 56 }
    };

    // Hệ Thống Âm Thanh & Nhạc Nền (Piano BGM)
    this.audioManager = new AudioManager();
    this.isSettingOpen = false;
    if (this.audioManager) {
      this.audioManager.playMenuMusic();
    }

    // Bắt đầu từ Menu Chính
    // this.initGame();

    // Hệ Thống Sách Tri Thức (Book System)
    this.bookSystem = new BookSystem();
    this.bookDrops = [];
    this.selectedStarterBookIds = [];
    this.codexFilter = 'all';
    this.codexScrollY = 0;
    this.activeEvolutionModal = null;
    this.selectedCodexBook = null;
    this.gameToast = null;

    // Hệ Thống Thành Tựu & Danh Hiệu (Achievement System)
    this.achievementSystem = new AchievementSystem(this);
    this.achievementCategory = 'all';
    this.achievementScrollY = 0;
    this.achievementMaxScrollY = 0;

    // Lưu instance toàn cục để ParticleSystem và BookSystem có thể kích hoạt thành tựu
    window.__gameInstance = this;
    if (this.achievementSystem && this.bookSystem && this.bookSystem.unlockedCodex) {
      this.achievementSystem.track('unlocked_books', this.bookSystem.unlockedCodex.size, true);
    }
    if (this.achievementSystem && this.meta && this.meta.totalKills > 0) {
      this.achievementSystem.track('kills', this.meta.totalKills, true);
    }

    // Thông báo trạng thái trên màn hình Cây Kỹ Năng & Cổ Viện Shop (Toast notification)
    this.skillTreeToast = null;
    this.shopToast = null;

    // Lắng nghe sự kiện
    this.canvas.setAttribute('tabindex', '0');
    this.canvas.focus();
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    this.canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    this.canvas.addEventListener('contextmenu', (e) => {
      if (this.gameState === 'SKILL_TREE') {
        e.preventDefault();
        this.onSkillTreeRightClick(e);
      }
    });
    window.addEventListener('pointerup', () => {
      this.isDraggingSkillTree = false;
    });

    // Tự động căn chỉnh & dãn giao diện theo đúng độ phân giải màn hình
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Vòng lặp chính
    this.lastTime = performance.now();
    this.fps = 60;
    this.frameCount = 0;
    this.lastFpsUpdate = performance.now();

    requestAnimationFrame((t) => this.loop(t));
  }

  // Tự động căn chỉnh kích thước canvas không biến dạng và mở rộng tầm nhìn theo đúng tỷ lệ màn hình
  resizeCanvas() {
    const baseW = 1920;
    const baseH = 1080;
    const w = (typeof window !== 'undefined' && window.innerWidth) ? window.innerWidth : baseW;
    const h = (typeof window !== 'undefined' && window.innerHeight) ? window.innerHeight : baseH;
    const aspect = w / h;

    if (aspect >= baseW / baseH) {
      this.canvas.height = baseH;
      this.canvas.width = Math.round(baseH * aspect);
    } else {
      this.canvas.width = baseW;
      this.canvas.height = Math.round(baseW / aspect);
    }

    if (this.camera) {
      this.camera.viewportWidth = this.canvas.width;
      this.camera.viewportHeight = this.canvas.height;
    }

    if (this.pauseBtnRect) {
      this.pauseBtnRect.x = this.canvas.width - 200;
    }
  }

  initGame(starterBookIds = null) {
    // Xóa file lưu trận cũ khi bắt đầu trận mới
    try {
      localStorage.removeItem('vampire_saved_run');
    } catch (e) {}

    this.gameTime = 0;
    this.killCount = 0;

    this.level = 1;
    this.currentXP = 0;
    this.maxXP = 8;

    // Lấy chỉ số nâng cấp ngoài trận từ MetaProgression & Thông Thạo (Mastery)
    const metaBonuses = this.meta.getBonusStats();
    const masteryBonuses = this.masterySystem.getBonusStats(this.selectedChar.id);

    // Khởi tạo Nhân vật được chọn kèm bonus và thử thách
    this.player = new Player(
      CONFIG.WORLD_WIDTH / 2,
      CONFIG.WORLD_HEIGHT / 2,
      this.selectedChar,
      metaBonuses,
      this.selectedChallenges,
      masteryBonuses
    );

    this.skillManager = new SkillManager();
    this.skillManager.classSkillBuff = metaBonuses.classSkillBuff || 0;

    // Reroll & Banish riêng cho từng trận (kết hợp Meta Shop và Cây Kỹ Năng Thông Thạo)
    this.rerollCount = (metaBonuses.bonusRerolls || 0) + (masteryBonuses.bonusReroll || 0);
    this.banishCount = (metaBonuses.bonusBanishes || 0) + (masteryBonuses.bonusBanish || 0);
    this.banishedItemIds = new Set();
    this.isBanishModeActive = false;

    // Khởi tạo Vũ khí khởi đầu theo nhân vật
    const startWeaponId = this.selectedChar.startingWeaponId || 'main_sword';
    this.weaponManager = new WeaponManager(startWeaponId);
    this.upgradeManager = new UpgradeManager(this.weaponManager, this.skillManager);
    this.upgradeManager.applyChallenges(this.selectedChallenges);

    // Cập nhật độ khó & chế độ & thử thách & nguyền rủa cho Spawner
    this.spawner.setDifficulty(this.selectedDiff, this.selectedMode.id, this.selectedChallenges);
    this.spawner.curseEnemyCount = metaBonuses.curseEnemyCount || 0;

    this.enemies = [];
    this.enemyProjectiles = [];
    this.playerProjectiles = [];
    this.experienceGems = [];
    this.evolutionDrops = [];
    this.healthDrops = [];
    this.treasureBoxes = [];
    this.pendingLevelUps = 0;
    this.isVictory = false;

    // Rải sẵn 25 Thùng Gỗ phá vỡ được khắp bản đồ (không respawn)
    this.crates = [];
    const crateCount = 25;
    for (let i = 0; i < crateCount; i++) {
      const cx = 350 + Math.random() * (CONFIG.WORLD_WIDTH - 700);
      const cy = 350 + Math.random() * (CONFIG.WORLD_HEIGHT - 700);
      this.crates.push(new Crate(cx, cy));
    }

    // Khởi tạo Hệ Thống Sách Tri Thức (Book System)
    const extraSlots = (this.meta.upgrades.bookSlots ? this.meta.upgrades.bookSlots.level : 0);
    const isNoBooksChallenge = !!(this.selectedChallenges && this.selectedChallenges.no_books);
    const chosenBooks = isNoBooksChallenge ? [] : ((starterBookIds !== null && starterBookIds !== undefined) ? starterBookIds : (this.selectedStarterBookIds || []));
    this.bookSystem.initRun(chosenBooks, extraSlots);
    if (isNoBooksChallenge) {
      this.bookSystem.maxSlots = 0;
      this.bookSystem.activeBooks = [];
    }
    this.player.setBookSystem(this.bookSystem);
    this.bookDrops = [];
    this.activeEvolutionModal = null;

    this.isPaused = false;
    this.isLevelUpOpen = false;
    this.isEvolutionOpen = false;
    this.witchBannerTimer = 0;
    this.gameState = 'PLAYING';

    // Sinh ngay 1 Tử thần ban đầu
    const initialReaper = new Enemy(
      CONFIG.ENEMIES.TYPES.REAPER,
      this.player.x + 280,
      this.player.y - 100
    );
    this.enemies.push(initialReaper);

    // Bắt đầu phát nhạc nền chiến đấu BADDY BADDY
    if (this.audioManager) {
      this.audioManager.playNormal();
    }

    if (this.pendingLevelUps > 0) {
      setTimeout(() => this.checkPendingModals(), 200);
    }
  }

  // Kiểm tra có trận đấu lưu dở hay không
  hasSavedGame() {
    try {
      return !!localStorage.getItem('vampire_saved_run');
    } catch (e) {
      return false;
    }
  }

  // Lấy dữ liệu tóm tắt trận đấu đã lưu
  getSavedGameInfo() {
    try {
      const raw = localStorage.getItem('vampire_saved_run');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }

  // Kích hoạt Thức Tỉnh Phù Thủy (Witch Awakening)
  triggerWitchAwakening() {
    if (!this.player || this.player.isWitch || !this.player.hasWitchForm) return;
    this.player.awakenWitchForm();

    // Hiệu ứng bộc phát ma thuật cực hoành tráng
    this.particles.createArcaneBlast(this.player.x, this.player.y, 4.5);
    this.particles.createDeathBurst(this.player.x, this.player.y, '#c026d3', 100);
    this.particles.createDeathBurst(this.player.x, this.player.y, '#ffd700', 60);

    this.witchBannerTimer = 4.0; // Hiển thị banner trong 4 giây
  }

  // Kích hoạt Xung Kích Hình Học (Baruch Spinoza)
  triggerSpinozaGeometricPulse(x, y, damage) {
    if (!this.enemies) return;
    const radius = 250;
    for (const enemy of this.enemies) {
      if (enemy && !enemy.isDead) {
        const d = Math.hypot(enemy.x - x, enemy.y - y);
        if (d <= radius) {
          enemy.takeDamage(damage, { isTrueDamage: true }, this.particles);
        }
      }
    }
    if (this.particles) {
      this.particles.createArcaneBlast(x, y, 2.4);
      this.particles.createHitSparks(x, y, 15);
    }
  }

  // Kích hoạt Bản Sao Bóng Ma Hộ Vệ Tấn Công (Jacques Lacan)
  triggerLacanPhantomAttack(px, py, facingRight) {
    if (!this.enemies || !this.player) return;
    const baseAtk = this.player.attackDamage || 50;
    const phantomDmg = Math.round(baseAtk * 0.50);
    let target = null;
    let minDist = 380;
    for (const enemy of this.enemies) {
      if (!enemy || enemy.isDead) continue;
      const dx = enemy.x - px;
      const dy = enemy.y - py;
      const dist = Math.hypot(dx, dy);
      if (dist < minDist) {
        if ((facingRight && dx > -30) || (!facingRight && dx < 30)) {
          minDist = dist;
          target = enemy;
        }
      }
    }
    if (target) {
      target.takeDamage(phantomDmg, { isTrueDamage: (Math.random() < 0.30) }, this.particles);
      if (this.particles) {
        this.particles.createHitSparks(target.x, target.y, 10);
        this.particles.createDamageNumber(target.x, target.y - 20, phantomDmg, false, false, false, false, '#c084fc');
      }
    }
  }

  // Kích hoạt Hồi Sinh Ảo Mộng Macondo (Gabriel García Márquez)
  triggerMarquezMacondo(x, y) {
    if (!this.enemies) return;
    // Đóng băng toàn bộ kẻ địch hiện diện trong 3 giây
    for (const enemy of this.enemies) {
      if (enemy && !enemy.isDead) {
        enemy.freezeTimer = 3.0;
      }
    }
    // Mưa hoa vàng tuôn xuống gây 500% sát thương vũ khí cho quái vật xung quanh
    const baseAtk = this.player ? (this.player.attackDamage || 50) : 50;
    const blastDmg = Math.round(baseAtk * 5.0);
    for (const enemy of this.enemies) {
      if (enemy && !enemy.isDead) {
        const d = Math.hypot(enemy.x - x, enemy.y - y);
        if (d <= 450) {
          enemy.takeDamage(blastDmg, { isTrueDamage: true }, this.particles);
        }
      }
    }
    if (this.particles) {
      this.particles.createArcaneBlast(x, y, 4.5);
      this.particles.createDeathBurst(x, y, '#ffd700', 100);
      this.particles.createDeathBurst(x, y, '#f59e0b', 60);
    }
  }

  // 1. Lưu trận đấu hiện tại và thoát ra Menu Chính
  saveAndExit() {
    try {
      const saveData = {
        savedAt: Date.now(),
        gameTime: this.gameTime,
        killCount: this.killCount,
        level: this.level,
        currentXP: this.currentXP,
        maxXP: this.maxXP,
        selectedCharId: this.selectedChar.id,
        selectedModeId: this.selectedMode.id,
        selectedChallenges: this.selectedChallenges,
        selectedDiffId: this.selectedDiff.id,
        isWitch: this.player ? this.player.isWitch : false,
        player: {
          x: this.player.x,
          y: this.player.y,
          health: this.player.health,
          maxHealth: this.player.maxHealth
        },
        equipped: this.upgradeManager.getEquippedData(),
        skills: this.skillManager.getSkillsData(),
        rerollCount: this.rerollCount || 0,
        banishCount: this.banishCount || 0,
        pendingLevelUps: this.pendingLevelUps || 0,
        banishedItemIds: Array.from(this.banishedItemIds || [])
      };
      localStorage.setItem('vampire_saved_run', JSON.stringify(saveData));
    } catch (e) {
      console.error('Lỗi khi lưu game:', e);
    }

    this.isPaused = false;
    this.gameState = 'MAIN_MENU';
    if (this.audioManager) {
      this.audioManager.playMenuMusic();
    }
  }

  // 2. Thoát trận đấu và xem bảng tổng kết
  exitAndFinish() {
    try {
      localStorage.removeItem('vampire_saved_run');
    } catch (e) {}

    this.isPaused = false;
    this.finishGame();
  }

  // Tiếp tục ván đấu đã lưu
  loadSavedGame() {
    const data = this.getSavedGameInfo();
    if (!data) return;

    // Tìm lại char, mode, challenge và diff
    const char = CONFIG.CHARACTERS.find(c => c.id === data.selectedCharId) || CONFIG.CHARACTERS[0];
    const mode = CONFIG.MODES.find(m => m.id === data.selectedModeId) || CONFIG.MODES[0];
    const diff = CONFIG.DIFFICULTIES.find(d => d.id === data.selectedDiffId) || CONFIG.DIFFICULTIES[0];
    this.selectedChar = char;
    this.selectedMode = mode;
    this.selectedChallenges = data.selectedChallenges || {};
    this.selectedDiff = diff;

    // Lấy chỉ số nâng cấp ngoài trận từ MetaProgression
    const metaBonuses = this.meta.getBonusStats();

    // Khởi tạo Player
    this.player = new Player(
      data.player.x,
      data.player.y,
      this.selectedChar,
      metaBonuses,
      this.selectedChallenges
    );
    this.player.health = data.player.health;
    this.player.maxHealth = data.player.maxHealth;

    this.skillManager = new SkillManager();
    this.skillManager.classSkillBuff = metaBonuses.classSkillBuff || 0;
    this.skillManager.restoreSkillsData(data.skills);

    // Khôi phục Reroll & Banish của trận
    this.rerollCount = data.rerollCount !== undefined ? data.rerollCount : (metaBonuses.bonusRerolls || 0);
    this.banishCount = data.banishCount !== undefined ? data.banishCount : (metaBonuses.bonusBanishes || 0);
    this.banishedItemIds = new Set(data.banishedItemIds || []);
    this.isBanishModeActive = false;

    const startWeaponId = this.selectedChar.startingWeaponId || 'main_sword';
    this.weaponManager = new WeaponManager(startWeaponId);
    this.upgradeManager = new UpgradeManager(this.weaponManager, this.skillManager);
    this.upgradeManager.applyChallenges(this.selectedChallenges);
    this.upgradeManager.restoreEquippedData(data.equipped, this.player);

    if (data.isWitch) {
      this.player.awakenWitchForm();
    }

    this.spawner.setDifficulty(this.selectedDiff, this.selectedMode.id, this.selectedChallenges);
    this.spawner.curseEnemyCount = metaBonuses.curseEnemyCount || 0;

    this.gameTime = data.gameTime;
    this.killCount = data.killCount;
    this.level = data.level;
    this.currentXP = data.currentXP;
    this.maxXP = data.maxXP;
    this.pendingLevelUps = data.pendingLevelUps || 0;

    this.enemies = [];
    this.enemyProjectiles = [];
    this.playerProjectiles = [];
    this.experienceGems = [];
    this.evolutionDrops = [];
    this.healthDrops = [];
    this.treasureBoxes = [];
    this.crates = [];
    this.isVictory = false;

    // Cập nhật vị trí camera ngay lập tức
    this.camera.follow(this.player);
    this.camera.x = Math.max(0, Math.min(this.player.x - this.camera.viewportWidth / 2, CONFIG.WORLD_WIDTH - this.camera.viewportWidth));
    this.camera.y = Math.max(0, Math.min(this.player.y - this.camera.viewportHeight / 2, CONFIG.WORLD_HEIGHT - this.camera.viewportHeight));

    this.isPaused = false;
    this.isLevelUpOpen = false;
    this.isEvolutionOpen = false;
    this.isSettingOpen = false;
    this.gameState = 'PLAYING';

    if (this.audioManager) {
      this.audioManager.playNormal();
    }

    if (this.pendingLevelUps > 0) {
      setTimeout(() => this.checkPendingModals(), 200);
    }
  }

  // Kết thúc trận đấu & Tính điểm thưởng + Tiền vàng
  finishGame() {
    try {
      localStorage.removeItem('vampire_saved_run');
    } catch (e) {}

    this.gameState = 'GAME_OVER';

    if (this.audioManager && this.audioManager.currentTrack === 'boss') {
      this.audioManager.playNormal();
    }

    const timeScore = Math.floor(this.gameTime) * 15;
    const killScore = this.killCount * 25;
    const levelScore = this.level * 100;
    const victoryScore = this.isVictory ? 50000 : 0;
    const victoryGold = this.isVictory ? 500 : 0;
    const rawScore = timeScore + killScore + levelScore + victoryScore;

    // Tính toán hệ số Thử Thách (Chỉ nhận thưởng nếu sống sót ít nhất 2 phút = 120s)
    let challengeScoreBonus = 0;
    let challengeGoldBonus = 0;
    const activeChallengeList = [];

    if (this.gameTime >= 120) {
      for (const ch of CONFIG.CHALLENGES) {
        if (this.selectedChallenges[ch.id]) {
          challengeScoreBonus += ch.scoreBonus;
          challengeGoldBonus += ch.goldBonus;
          activeChallengeList.push(ch);
        }
      }
    }

    const challengeScoreMult = 1.0 + challengeScoreBonus;
    const challengeGoldMult = 1.0 + challengeGoldBonus;

    const finalScore = Math.round(rawScore * (this.selectedDiff.scoreMult || 1.0) * challengeScoreMult);

    // Tính toán Tiền Vàng nhận được: dựa vào quái giết được + thời gian sống + nhân độ khó + bonus shop + clover + challenge
    const metaBonuses = this.meta.getBonusStats();
    const cloverMult = this.upgradeManager ? this.upgradeManager.getCloverGoldBonus() : 1.0;
    const baseGold = Math.floor(this.killCount * 1.5 + this.gameTime * 0.4 + this.level * 5) + victoryGold;
    const finalGold = Math.round(baseGold * (this.selectedDiff.goldMult || 1.0) * metaBonuses.goldMultiplier * cloverMult * challengeGoldMult);

    if (this.isVictory && this.achievementSystem) {
      this.achievementSystem.track('win_campaign', 1);
    }

    // Lưu trữ vào MetaProgression
    this.meta.gold += finalGold;
    this.meta.totalKills += this.killCount;
    if (finalScore > this.meta.highScore) {
      this.meta.highScore = finalScore;
    }
    this.meta.save();

    // Tích lũy điểm Score vào Thông Thạo riêng của nhân vật đã chọn
    this.masterySystem.addScore(this.selectedChar.id, finalScore);
    const charMastery = this.masterySystem.getCharData(this.selectedChar.id);

    this.endGameStats = {
      score: finalScore,
      goldEarned: finalGold,
      survivalTime: this.gameTime,
      kills: this.killCount,
      level: this.level,
      isVictory: this.isVictory,
      activeChallenges: activeChallengeList,
      challengeScoreBonus,
      challengeGoldBonus,
      qualifiedForChallengeBonus: this.gameTime >= 120,
      charMastery: charMastery,
      charName: this.selectedChar.name
    };
  }

  restart() {
    this.initGame();
  }

  togglePause() {
    if (this.player.isDead || this.isLevelUpOpen || this.isEvolutionOpen) return;
    this.isPaused = !this.isPaused;
    if (!this.isPaused) {
      this.isSettingOpen = false;
    }
  }

  addXP(amount) {
    const xpBonus = this.upgradeManager ? this.upgradeManager.getXPMultiplier() : 1.0;
    const achExpMult = this.achievementSystem ? (1.0 + this.achievementSystem.getTotalExpBonus()) : 1.0;
    this.currentXP += amount * xpBonus * achExpMult;
    while (this.currentXP >= this.maxXP) {
      this.currentXP -= this.maxXP;
      this.level++;
      if (this.achievementSystem) {
        this.achievementSystem.track('max_level', this.level, true);
      }
      this.maxXP = Math.round(this.maxXP * 1.35 + 5);
      this.triggerLevelUp();
    }
  }

  triggerLevelUp() {
    // Nếu bảng Level-Up hoặc Tiến Hóa đang mở, tăng hàng đợi chờ chứ tuyệt đối KHÔNG ghi đè lựa chọn hiện tại!
    if (this.isLevelUpOpen || this.isEvolutionOpen || this.activeEvolutionModal) {
      this.pendingLevelUps = (this.pendingLevelUps || 0) + 1;
      return;
    }
    this.input.resetKeys();
    this.isLevelUpOpen = true;
    this.isBanishModeActive = false;
    this.currentChoices = this.upgradeManager.generateChoices(this.player, this.banishedItemIds);
  }

  // Kiểm tra và tự động mở modal nâng cấp tiếp theo nếu còn lượt chờ trong hàng đợi
  checkPendingModals() {
    if (this.isLevelUpOpen || this.isEvolutionOpen || this.activeEvolutionModal) return;
    if (this.pendingLevelUps > 0) {
      this.pendingLevelUps--;
      setTimeout(() => this.triggerLevelUp(), 80);
    }
  }

  triggerEvolution() {
    this.input.resetKeys();
    this.isEvolutionOpen = true;
  }

  // Kích hoạt kỹ năng đặc biệt của nhân vật (Phím G hoặc click)
  activateSpecialSkill() {
    if (!this.player || this.player.isDead) return;
    if (this.isPaused || this.isLevelUpOpen || this.isEvolutionOpen) return;

    const skill = this.player.specialSkill;
    if (!skill) return;

    if (!skill.isUnlocked) {
      this.showGameToast('🔒 Kỹ năng [G] chưa mở khóa! Hãy mua tại Cổ Viện Ma Pháp.', '#ef4444');
      return;
    }

    if (skill.cooldown > 0) {
      this.showGameToast(`⏳ Kỹ năng [G] đang hồi chiêu (${skill.cooldown.toFixed(1)}s)!`, '#f59e0b');
      return;
    }

    // Tạm thời để trống hiệu ứng theo yêu cầu người chơi
    skill.cooldown = skill.maxCooldown || 8.0;

    // Hiệu ứng phản hồi ma thuật xung quanh nhân vật
    if (this.particles) {
      this.particles.createArcaneBlast(this.player.x, this.player.y, 1.8);
      this.particles.createDeathBurst(this.player.x, this.player.y, '#38bdf8', 40);
    }

    this.showGameToast('⚡ KỸ NĂNG ĐẶC BIỆT [G]: Đang để trống (Chờ thiết lập hiệu ứng)!', '#38bdf8');
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }

  onKeyDown(e) {
    if (this.audioManager) this.audioManager.unlockAudio();

    if (e.key === 'f' || e.key === 'F') {
      this.toggleFullscreen();
      return;
    }

    // Phím [G]: Kích hoạt Kỹ năng đặc biệt của nhân vật
    if (e.key === 'g' || e.key === 'G') {
      if (this.gameState === 'PLAYING' && !this.isPaused && !this.isLevelUpOpen && !this.isEvolutionOpen) {
        this.activateSpecialSkill();
        return;
      }
    }

    if (e.key === 'Escape' && this.isSettingOpen) {
      this.isSettingOpen = false;
      return;
    }

    if (e.key === 'Escape' && this.gameState === 'CODEX' && this.selectedCodexBook) {
      this.selectedCodexBook = null;
      return;
    }

    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      if (this.gameState === 'PLAYING') {
        this.togglePause();
      }
      return;
    }

    if ((e.code === 'Space' || e.key === 'r' || e.key === 'R') && this.gameState === 'GAME_OVER') {
      this.initGame();
      return;
    }

    // Phím tắt Debug Test nhanh trong trận
    if (this.gameState === 'PLAYING' && this.player && !this.player.isDead) {
      if (e.key === '1') {
        this.enemies.push(new Enemy(CONFIG.ENEMIES.TYPES.REAPER, this.player.x + 200, this.player.y));
      }
      if (e.key === '2') {
        this.enemies.push(new Enemy(CONFIG.ENEMIES.TYPES.GOKUCHO, this.player.x - 220, this.player.y));
      }
      if (e.key === '4') {
        this.addXP(20);
      }
      if (e.key === '5') {
        for (const w of this.weaponManager.equippedWeapons) {
          w.level = 7;
          if (w.hasSlashAura !== undefined) w.hasSlashAura = true;
        }
        this.upgradeManager.checkEvolutionReadiness();
        this.evolutionDrops.push(new EvolutionDrop(this.player.x + 100, this.player.y));
      }
      if (e.key === '6') {
        // Phím tắt test nhanh Thức Tỉnh Phù Thủy (Witch Form)
        this.triggerWitchAwakening();
      }
      if (e.key === '7') {
        // Tua nhanh +60 giây
        this.gameTime += 60;
        this.particles.createArcaneBlast(this.player.x, this.player.y, 2.0);
      }
      if (e.key === '8') {
        // Nhảy thời gian tới trước mốc Boss tiếp theo (để test boss lập tức)
        // Các mốc: 150s (Mini Boss 1), 300s (2 Mini Boss), 450s (3 Mini Boss), 600s (Meruru),
        // 750s (Mini Boss+Swarm), 900s (2 Mini Boss+Swarm), 1050s (3 Mini Boss), 1200s (Yuki)
        const bossCheckpoints = [145, 295, 445, 595, 745, 895, 1045, 1195];
        const nextTarget = bossCheckpoints.find(t => t > this.gameTime + 2);
        if (nextTarget !== undefined) {
          this.gameTime = nextTarget;
        } else {
          this.gameTime += 120;
        }
        this.particles.createArcaneBlast(this.player.x, this.player.y, 2.8);
        this.particles.createDeathBurst(this.player.x, this.player.y, '#ffd700', 50);
      }
      if (e.key === '9') {
        // Tua nhanh +180s (3 phút)
        this.gameTime += 180;
        this.particles.createArcaneBlast(this.player.x, this.player.y, 2.0);
      }
    }
  }

  // Tính toán tọa độ chuột trên canvas chuẩn xác 100%, dãn hết trình duyệt không chừa khoảng trống
  getCanvasMousePos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / (rect.width || 1)) * this.canvas.width;
    const mouseY = ((e.clientY - rect.top) / (rect.height || 1)) * this.canvas.height;
    return { mouseX, mouseY };
  }

  onMouseMove(e) {
    const { mouseX, mouseY } = this.getCanvasMousePos(e);
    this.mouseX = mouseX;
    this.mouseY = mouseY;

    if (this.isDraggingSkillTree && this.gameState === 'SKILL_TREE') {
      const dy = mouseY - this.skillTreeDragStartY;
      const maxScroll = this.skillTreeMaxScrollY || 440;
      this.skillTreeScrollY = Math.max(0, Math.min(maxScroll, this.skillTreeDragStartScrollY - dy));
    }

    if (this.gameState === 'PLAYING') {
      this.canvas.style.cursor = 'default';
      return;
    }

    let hovering = false;
    for (let i = this.menuButtons.length - 1; i >= 0; i--) {
      const btn = this.menuButtons[i];
      if (
        mouseX >= btn.x && mouseX <= btn.x + btn.w &&
        mouseY >= btn.y && mouseY <= btn.y + btn.h
      ) {
        hovering = true;
        break;
      }
    }
    this.canvas.style.cursor = hovering ? 'pointer' : 'default';
  }

  onSkillTreeRightClick(e) {
    const { mouseX, mouseY } = this.getCanvasMousePos(e);
    for (let i = this.menuButtons.length - 1; i >= 0; i--) {
      const btn = this.menuButtons[i];
      if (
        mouseX >= btn.x && mouseX <= btn.x + btn.w &&
        mouseY >= btn.y && mouseY <= btn.y + btn.h
      ) {
        if (btn.id.startsWith('select_skill_node_') || btn.id.startsWith('allocate_skill_')) {
          const nodeId = btn.id.replace('select_skill_node_', '').replace('allocate_skill_', '');
          this.selectedSkillNodeId = nodeId;
          const def = SKILL_TREE_DEFINITIONS[nodeId];
          if (!def) return;
          const char = this.masterySystem.getCharData(this.skillTreeSelectedCharId);
          const cur = (char.skills && char.skills[nodeId]) || 0;
          if (cur <= 0) {
            this.showSkillTreeToast(`ℹ️ ${def.name} chưa cộng điểm nào để hoàn!`, '#f59e0b');
          } else if (!this.masterySystem.canSafelyRefund(this.skillTreeSelectedCharId, nodeId)) {
            this.showSkillTreeToast(`⚠️ Đang có kỹ năng tầng sau phụ thuộc vào nút này, không thể hoàn!`, '#f43f5e');
          } else {
            const ok = this.masterySystem.refundSkill(this.skillTreeSelectedCharId, nodeId);
            if (ok) {
              this.showSkillTreeToast(`↩️ Đã hoàn lại ${def.costPerLevel} điểm từ: ${def.name}!`, '#fb923c');
            }
          }
          return;
        }
      }
    }
  }

  showSkillTreeToast(text, color = '#22c55e') {
    this.skillTreeToast = { text, color, timer: 3.0 };
  }

  showShopToast(text, color = '#22c55e') {
    this.shopToast = { text, color, timer: 3.0 };
  }

  showGameToast(text, color = '#22c55e') {
    this.gameToast = { text, color, timer: 3.5 };
  }

  onWheel(e) {
    if (this.gameState === 'CODEX') {
      e.preventDefault();
      const maxScroll = this.codexMaxScrollY || 2800;
      this.codexScrollY = Math.max(0, Math.min(maxScroll, this.codexScrollY + (e.deltaY > 0 ? 140 : -140)));
    } else if (this.gameState === 'SHOP') {
      e.preventDefault();
      const maxScroll = this.maxShopScrollY || 600;
      this.shopScrollY = Math.max(0, Math.min(maxScroll, (this.shopScrollY || 0) + (e.deltaY > 0 ? 90 : -90)));
    } else if (this.gameState === 'BOOK_SELECT') {
      e.preventDefault();
      const maxScroll = this.starterBookMaxScrollX || 0;
      this.starterBookTargetScrollX = Math.max(0, Math.min(maxScroll, (this.starterBookTargetScrollX || 0) + (e.deltaY > 0 ? 240 : -240)));
    } else if (this.gameState === 'ACHIEVEMENTS') {
      e.preventDefault();
      const maxScroll = this.achievementMaxScrollY || 1000;
      this.achievementScrollY = Math.max(0, Math.min(maxScroll, (this.achievementScrollY || 0) + (e.deltaY > 0 ? 120 : -120)));
    } else if (this.gameState === 'SKILL_TREE') {
      e.preventDefault();
      const maxScroll = this.skillTreeMaxScrollY || 440;
      this.skillTreeScrollY = Math.max(0, Math.min(maxScroll, (this.skillTreeScrollY || 0) + (e.deltaY > 0 ? 90 : -90)));
    }
  }

  // Xử lý các tương tác trên bảng Cài Đặt (Setting Modal)
  handleSettingModalClick(mouseX, mouseY) {
    if (!this.isSettingOpen) return false;

    // Nút Đóng
    if (
      this.settingCloseBtn &&
      mouseX >= this.settingCloseBtn.x && mouseX <= this.settingCloseBtn.x + this.settingCloseBtn.w &&
      mouseY >= this.settingCloseBtn.y && mouseY <= this.settingCloseBtn.y + this.settingCloseBtn.h
    ) {
      this.isSettingOpen = false;
      return true;
    }

    // Nút Giảm Âm Lượng [-10%]
    if (
      this.volMinusBtn &&
      mouseX >= this.volMinusBtn.x && mouseX <= this.volMinusBtn.x + this.volMinusBtn.w &&
      mouseY >= this.volMinusBtn.y && mouseY <= this.volMinusBtn.y + this.volMinusBtn.h
    ) {
      if (this.audioManager) this.audioManager.changeVolume(-0.1);
      return true;
    }

    // Nút Tăng Âm Lượng [+10%]
    if (
      this.volPlusBtn &&
      mouseX >= this.volPlusBtn.x && mouseX <= this.volPlusBtn.x + this.volPlusBtn.w &&
      mouseY >= this.volPlusBtn.y && mouseY <= this.volPlusBtn.y + this.volPlusBtn.h
    ) {
      if (this.audioManager) this.audioManager.changeVolume(0.1);
      return true;
    }

    // Nút Bật / Tắt Tiếng
    if (
      this.volMuteBtn &&
      mouseX >= this.volMuteBtn.x && mouseX <= this.volMuteBtn.x + this.volMuteBtn.w &&
      mouseY >= this.volMuteBtn.y && mouseY <= this.volMuteBtn.y + this.volMuteBtn.h
    ) {
      if (this.audioManager) this.audioManager.toggleMute();
      return true;
    }

    // Nhấp trực tiếp trên thanh Volume Bar
    if (
      this.volBarRect &&
      mouseX >= this.volBarRect.x && mouseX <= this.volBarRect.x + this.volBarRect.w &&
      mouseY >= this.volBarRect.y && mouseY <= this.volBarRect.y + this.volBarRect.h
    ) {
      const ratio = (mouseX - this.volBarRect.x) / this.volBarRect.w;
      if (this.audioManager) this.audioManager.setVolume(ratio);
      return true;
    }

    // Nhấp ra ngoài bảng Setting để đóng
    if (
      this.settingModalRect &&
      (mouseX < this.settingModalRect.x || mouseX > this.settingModalRect.x + this.settingModalRect.w ||
       mouseY < this.settingModalRect.y || mouseY > this.settingModalRect.y + this.settingModalRect.h)
    ) {
      this.isSettingOpen = false;
      return true;
    }

    return true; // Chặn click xuyên qua phía sau khi click vào thân bảng modal
  }

  onPointerDown(e) {
    if (e.button !== 0) return; // Chỉ nhận chuột trái
    if (this.canvas) this.canvas.focus();
    if (this.audioManager) this.audioManager.unlockAudio();
    const { mouseX, mouseY } = this.getCanvasMousePos(e);

    // 0. Nếu đang mở bảng Cài Đặt (Setting Modal) ở bất kỳ màn hình nào
    if (this.isSettingOpen) {
      if (this.handleSettingModalClick(mouseX, mouseY)) return;
    }

    // XỬ LÝ CLICK TRÊN CÁC MÀN HÌNH MENU (MAIN_MENU, CHAR_SELECT, DIFF_SELECT, SHOP, SKILL_TREE, GAME_OVER, CODEX)
    if (this.gameState !== 'PLAYING') {
      if (this.gameState === 'CODEX' && this.selectedCodexBook) {
        // Nút đóng modal chi tiết hoặc nhấp ra ngoài modal
        if (
          this.codexDetailCloseBtn &&
          mouseX >= this.codexDetailCloseBtn.x && mouseX <= this.codexDetailCloseBtn.x + this.codexDetailCloseBtn.w &&
          mouseY >= this.codexDetailCloseBtn.y && mouseY <= this.codexDetailCloseBtn.y + this.codexDetailCloseBtn.h
        ) {
          this.selectedCodexBook = null;
          return;
        }
        if (
          this.codexDetailBox &&
          (mouseX < this.codexDetailBox.x || mouseX > this.codexDetailBox.x + this.codexDetailBox.w ||
           mouseY < this.codexDetailBox.y || mouseY > this.codexDetailBox.y + this.codexDetailBox.h)
        ) {
          this.selectedCodexBook = null;
          return;
        }
        return; // Đang mở modal thì không kích hoạt các nút phía sau
      }

      if (this.gameState === 'SKILL_TREE') {
        const treePanelX = 50, treePanelY = 260, treePanelW = 1215, treePanelH = 730;
        if (
          mouseX >= treePanelX && mouseX <= treePanelX + treePanelW &&
          mouseY >= treePanelY && mouseY <= treePanelY + treePanelH
        ) {
          this.isDraggingSkillTree = true;
          this.skillTreeDragStartY = mouseY;
          this.skillTreeDragStartScrollY = this.skillTreeScrollY || 0;
        }
      }

      for (let i = this.menuButtons.length - 1; i >= 0; i--) {
        const btn = this.menuButtons[i];
        if (
          mouseX >= btn.x && mouseX <= btn.x + btn.w &&
          mouseY >= btn.y && mouseY <= btn.y + btn.h
        ) {
          this.handleMenuClick(btn.id, btn);
          return;
        }
      }
      return;
    }

    // TRONG TRẬN ĐẤU (PLAYING)
    // 1. Nếu đang mở Bảng Tiến Hóa Sách Tri Thức (Book Evolution Modal)
    if (this.activeEvolutionModal) {
      const modal = this.activeEvolutionModal;

      // Xử lý riêng cho Modal Thức Tỉnh Ẩn / Hợp Thể Thần Thoại
      if (modal.isAwakening) {
        if (
          this.evolutionModalContinueBtn &&
          mouseX >= this.evolutionModalContinueBtn.x && mouseX <= this.evolutionModalContinueBtn.x + this.evolutionModalContinueBtn.w &&
          mouseY >= this.evolutionModalContinueBtn.y && mouseY <= this.evolutionModalContinueBtn.y + this.evolutionModalContinueBtn.h
        ) {
          this.particles.createArcaneBlast(this.player.x, this.player.y, 4.0);
          this.particles.createDeathBurst(this.player.x, this.player.y, '#ffd700', 80);
          this.player.updateBookStats();
          this.activeEvolutionModal = null;
          this.checkPendingModals();
          return;
        }
        return;
      }

      // Nút Tạm Dừng Tiến Hóa
      if (
        this.evolutionModalPauseBtn &&
        mouseX >= this.evolutionModalPauseBtn.x && mouseX <= this.evolutionModalPauseBtn.x + this.evolutionModalPauseBtn.w &&
        mouseY >= this.evolutionModalPauseBtn.y && mouseY <= this.evolutionModalPauseBtn.y + this.evolutionModalPauseBtn.h
      ) {
        this.bookSystem.pauseEvolution(modal.sourceId);
        this.showGameToast('⏸️ Đã tạm dừng tiến hóa. Bạn có thể tiến hóa bất kỳ lúc nào trong Menu Tạm Dừng!', '#60a5fa');
        this.activeEvolutionModal = null;
        this.checkPendingModals();
        return;
      }

      // Các nút lựa chọn Tiến Hóa
      if (this.evolutionChoiceBtns) {
        for (const choiceBtn of this.evolutionChoiceBtns) {
          if (
            mouseX >= choiceBtn.x && mouseX <= choiceBtn.x + choiceBtn.w &&
            mouseY >= choiceBtn.y && mouseY <= choiceBtn.y + choiceBtn.h
          ) {
            const ok = this.bookSystem.evolveBook(modal.sourceId, choiceBtn.targetId);
            if (ok) {
              const def = BOOK_DEFINITIONS[choiceBtn.targetId];
              this.particles.createArcaneBlast(this.player.x, this.player.y, 4.0);
              this.particles.createDeathBurst(this.player.x, this.player.y, '#ffd700', 80);
              this.showGameToast(`🎉 Tác Phẩm đã Thức Tỉnh: ${def ? def.work : choiceBtn.targetId}!`, '#4ade80');
              this.player.updateBookStats();
            }
            this.activeEvolutionModal = null;
            this.checkPendingModals();
            return;
          }
        }
      }
      return;
    }

    if (this.isLevelUpOpen) {
      // 1. Nút Đổi Lại (Reroll)
      if (
        this.rerollBtnRect &&
        mouseX >= this.rerollBtnRect.x && mouseX <= this.rerollBtnRect.x + this.rerollBtnRect.w &&
        mouseY >= this.rerollBtnRect.y && mouseY <= this.rerollBtnRect.y + this.rerollBtnRect.h
      ) {
        if ((this.rerollCount || 0) > 0) {
          this.rerollCount--;
          this.isBanishModeActive = false;
          this.currentChoices = this.upgradeManager.generateChoices(this.player, this.banishedItemIds);
          this.showGameToast(`🎲 Đã đổi lại danh sách nâng cấp! (Còn ${this.rerollCount} lần)`, '#38bdf8');
        } else {
          this.showGameToast('⚠️ Bạn đã dùng hết lượt Đổi Lại (Reroll) trong trận này!', '#f59e0b');
        }
        return;
      }

      // 2. Nút Loại Bỏ (Banish Toggle)
      if (
        this.banishBtnRect &&
        mouseX >= this.banishBtnRect.x && mouseX <= this.banishBtnRect.x + this.banishBtnRect.w &&
        mouseY >= this.banishBtnRect.y && mouseY <= this.banishBtnRect.y + this.banishBtnRect.h
      ) {
        if ((this.banishCount || 0) > 0) {
          this.isBanishModeActive = !this.isBanishModeActive;
          if (this.isBanishModeActive) {
            this.showGameToast('🚫 Hãy bấm vào thẻ nâng cấp bạn muốn LOẠI BỎ KHỎI TRẬN!', '#ef4444');
          }
        } else {
          this.showGameToast('⚠️ Bạn đã dùng hết lượt Loại Bỏ (Banish) trong trận này!', '#f59e0b');
        }
        return;
      }

      // 3. Chọn thẻ bài (hoặc Loại Bỏ thẻ bài)
      for (let i = 0; i < this.choiceCardsRects.length; i++) {
        const r = this.choiceCardsRects[i];
        if (
          mouseX >= r.x && mouseX <= r.x + r.w &&
          mouseY >= r.y && mouseY <= r.y + r.h
        ) {
          const selected = this.currentChoices[i];

          // Nếu đang ở Chế độ Loại Bỏ (Banish)
          if (this.isBanishModeActive) {
            this.banishedItemIds.add(selected.id);
            this.banishCount--;
            this.isBanishModeActive = false;
            this.showGameToast(`🚫 Đã loại bỏ "${selected.name}" khỏi toàn bộ trận đấu! (Còn ${this.banishCount} lần)`, '#ef4444');
            // Sinh lại danh sách mới thay thế
            this.currentChoices = this.upgradeManager.generateChoices(this.player, this.banishedItemIds);
            return;
          }

          // Chế độ nhận nâng cấp thông thường
          this.upgradeManager.applyChoice(selected, this.player);
          this.isLevelUpOpen = false;

          // Kiểm tra Thức Tỉnh Phù Thủy nếu vừa chọn kỹ năng thứ 3
          if (this.player && this.player.hasWitchForm && !this.player.isWitch) {
            const killsNeeded = this.player.witchKillRequirement || 100;
            const skillsUnlocked = this.skillManager ? this.skillManager.getUnlockedCount() : 0;
            if (this.killCount >= killsNeeded && skillsUnlocked >= 3) {
              this.triggerWitchAwakening();
            }
          }

          // Kiểm tra hàng đợi nhận nâng cấp dồn (level up liên tiếp hoặc rương báu)
          this.checkPendingModals();
          return;
        }
      }
      return;
    }

    if (this.isEvolutionOpen) {
      const b = this.evolutionBtnRect;
      if (mouseX >= b.x && mouseX <= b.x + b.w && mouseY >= b.y && mouseY <= b.y + b.h) {
        // Thực hiện hợp nhất 2 vũ khí Cấp 7 thành vũ khí tối thượng
        const evoResult = this.upgradeManager.executeEvolution();
        if (this.achievementSystem) {
          this.achievementSystem.track('evolved_weapons', 1);
        }

        if (evoResult && typeof this.showGameToast === 'function') {
          this.showGameToast(`⚡ HỢP THỂ THÀNH CÔNG: ${evoResult.name}! (Giải phóng 1 ô vũ khí)`, '#fbbf24');
        }

        this.particles.createArcaneBlast(this.player.x, this.player.y, 4.5);
        this.particles.createDeathBurst(this.player.x, this.player.y, '#ffd700', 90);
        this.particles.createDeathBurst(this.player.x, this.player.y, '#ff4500', 60);
        this.isEvolutionOpen = false;
        this.checkPendingModals();
      }
      return;
    }

    const btn = this.pauseBtnRect;
    if (
      mouseX >= btn.x && mouseX <= btn.x + btn.w &&
      mouseY >= btn.y && mouseY <= btn.y + btn.h
    ) {
      this.togglePause();
      return;
    }

    // Nhấp vào nút Kỹ năng đặc biệt [G] trên HUD
    if (
      this.specialSkillBtnRect &&
      mouseX >= this.specialSkillBtnRect.x && mouseX <= this.specialSkillBtnRect.x + this.specialSkillBtnRect.w &&
      mouseY >= this.specialSkillBtnRect.y && mouseY <= this.specialSkillBtnRect.y + this.specialSkillBtnRect.h
    ) {
      this.activateSpecialSkill();
      return;
    }

    if (this.isPaused) {
      if (this.isSettingOpen) return;

      const p = this.pauseActions;
      if (
        mouseX >= p.resume.x && mouseX <= p.resume.x + p.resume.w &&
        mouseY >= p.resume.y && mouseY <= p.resume.y + p.resume.h
      ) {
        this.togglePause();
        return;
      }
      if (
        p.settings &&
        mouseX >= p.settings.x && mouseX <= p.settings.x + p.settings.w &&
        mouseY >= p.settings.y && mouseY <= p.settings.y + p.settings.h
      ) {
        this.isSettingOpen = true;
        return;
      }
      if (
        mouseX >= p.saveExit.x && mouseX <= p.saveExit.x + p.saveExit.w &&
        mouseY >= p.saveExit.y && mouseY <= p.saveExit.y + p.saveExit.h
      ) {
        this.saveAndExit();
        return;
      }
      if (
        mouseX >= p.exitFinish.x && mouseX <= p.exitFinish.x + p.exitFinish.w &&
        mouseY >= p.exitFinish.y && mouseY <= p.exitFinish.y + p.exitFinish.h
      ) {
        this.exitAndFinish();
        return;
      }

      // Xử lý nút Vứt Bỏ & Tiến Hóa trong Kệ Sách Tạm Dừng
      if (this.pauseBookButtons) {
        for (const pbb of this.pauseBookButtons) {
          if (
            mouseX >= pbb.x && mouseX <= pbb.x + pbb.w &&
            mouseY >= pbb.y && mouseY <= pbb.y + pbb.h
          ) {
            if (pbb.action === 'discard') {
              const def = BOOK_DEFINITIONS[pbb.bookId];
              this.bookSystem.discardBook(pbb.bookId);
              this.player.updateBookStats();
              this.showGameToast(`🗑️ Đã vứt bỏ: ${def ? def.work : pbb.bookId}. Đã giải phóng 1 ô sách!`, '#fb923c');
              return;
            } else if (pbb.action === 'evolve') {
              const p = this.bookSystem.progress[pbb.bookId];
              if (p && p.readyToEvolve) {
                let choices = [];
                if (p.targetId === 'choice_descartes') {
                  choices = ['heidegger', 'kant'];
                if (this.player && this.player.armor >= 35) {
                  choices.push('spinoza');
                }
                } else if (p.targetId === 'choice_kant') {
                  choices = ['hegel', 'feuerbach', 'nietzsche'];
                } else {
                  choices = [p.targetId];
                }
                this.activeEvolutionModal = {
                  sourceId: pbb.bookId,
                  targetId: p.targetId,
                  choices: choices
                };
                this.isPaused = false;
                return;
              }
            }
          }
        }
      }
      return;
    }

    // Click vào ô sách trên HUD khi có biểu tượng ⚡ để tiến hóa nhanh
    if (this.hudBookSlotRects) {
      for (const slot of this.hudBookSlotRects) {
        if (
          slot.bookId && slot.readyToEvolve &&
          mouseX >= slot.x && mouseX <= slot.x + slot.w &&
          mouseY >= slot.y && mouseY <= slot.y + slot.h
        ) {
          const p = this.bookSystem.progress[slot.bookId];
          if (p && p.readyToEvolve) {
            let choices = [];
            if (p.targetId === 'choice_descartes') {
              choices = ['heidegger', 'kant'];
                if (this.player && this.player.armor >= 35) {
                  choices.push('spinoza');
                }
            } else if (p.targetId === 'choice_kant') {
              choices = ['hegel', 'feuerbach', 'nietzsche'];
            } else {
              choices = [p.targetId];
            }
            this.activeEvolutionModal = {
              sourceId: slot.bookId,
              targetId: p.targetId,
              choices: choices
            };
            return;
          }
        }
      }
    }
  }

  handleMenuClick(actionId, btnData) {
    if (actionId === 'open_settings') {
      this.isSettingOpen = true;
      return;
    } else if (actionId === 'resume_saved_game') {
      this.loadSavedGame();
    } else if (actionId === 'toggle_fullscreen') {
      this.toggleFullscreen();
    } else if (actionId === 'start_game') {
      this.gameState = 'CHAR_SELECT';
    } else if (actionId === 'open_shop') {
      this.gameState = 'SHOP';
      this.shopCategoryFilter = 'passive';
      this.shopScrollY = 0;
    } else if (actionId === 'open_skill_tree') {
      this.skillTreeSelectedCharId = this.selectedChar ? this.selectedChar.id : 'sorceress';
      this.gameState = 'SKILL_TREE';
    } else if (actionId.startsWith('open_char_skill_tree_')) {
      this.skillTreeSelectedCharId = actionId.replace('open_char_skill_tree_', '');
      this.gameState = 'SKILL_TREE';
    } else if (actionId.startsWith('select_skill_char_')) {
      this.skillTreeSelectedCharId = actionId.replace('select_skill_char_', '');
      const defaultNodes = { green: 's1', red: 'o1', yellow: 'u1' };
      this.selectedSkillNodeId = defaultNodes[this.skillTreeSelectedTab] || 's1';
      this.skillTreeScrollY = 0;
    } else if (actionId.startsWith('switch_skill_tree_tab_')) {
      const tab = actionId.replace('switch_skill_tree_tab_', '');
      this.skillTreeSelectedTab = tab;
      const defaultNodes = { green: 's1', red: 'o1', yellow: 'u1' };
      this.selectedSkillNodeId = defaultNodes[tab] || 's1';
      this.skillTreeScrollY = 0;
    } else if (actionId.startsWith('select_skill_node_')) {
      this.selectedSkillNodeId = actionId.replace('select_skill_node_', '');
    } else if (actionId === 'level_up_mastery') {
      const ok = this.masterySystem.levelUpMastery(this.skillTreeSelectedCharId);
      if (ok) {
        this.showSkillTreeToast('🎉 Lên Cấp Thông Thạo thành công! Nhận +1 Điểm Kỹ Năng.', '#4ade80');
      } else {
        this.showSkillTreeToast('⚠️ Không đủ điểm Score để lên cấp!', '#f59e0b');
      }
    } else if (actionId === 'level_up_max_mastery') {
      const count = this.masterySystem.levelUpMax(this.skillTreeSelectedCharId);
      if (count > 0) {
        this.showSkillTreeToast(`🎉 Đã tăng +${count} Cấp Thông Thạo! Nhận +${count} Điểm Kỹ Năng.`, '#4ade80');
      } else {
        this.showSkillTreeToast('⚠️ Không đủ điểm Score để lên cấp!', '#f59e0b');
      }
    } else if (actionId === 'add_test_score') {
      this.masterySystem.addTestScore(this.skillTreeSelectedCharId, 10000);
      this.showSkillTreeToast('🎁 Đã nhận +10,000 Score thử nghiệm thành công!', '#eab308');
    } else if (actionId.startsWith('allocate_skill_')) {
      const skillKey = actionId.replace('allocate_skill_', '');
      this.selectedSkillNodeId = skillKey;
      const char = this.masterySystem.getCharData(this.skillTreeSelectedCharId);
      const def = SKILL_TREE_DEFINITIONS[skillKey];
      if (def) {
        const cur = (char.skills && char.skills[skillKey]) || 0;
        if (!this.masterySystem.isNodeUnlocked(this.skillTreeSelectedCharId, skillKey)) {
          this.showSkillTreeToast('🔒 Cần mở khóa ít nhất 1 kỹ năng ở tầng trước!', '#f43f5e');
        } else if (cur >= def.maxLevel) {
          this.showSkillTreeToast(`⭐ ${def.name} đã đạt cấp tối đa (${def.maxLevel}/${def.maxLevel})!`, '#f59e0b');
        } else if (char.skillPoints < def.costPerLevel) {
          this.showSkillTreeToast(`⚠️ Cần ${def.costPerLevel} Điểm Kỹ Năng (Bạn đang có ${char.skillPoints}đ)!`, '#f43f5e');
        } else {
          const ok = this.masterySystem.allocateSkill(this.skillTreeSelectedCharId, skillKey);
          if (ok) {
            this.showSkillTreeToast(`✨ Đã nâng cấp: ${def.name} (${cur + 1}/${def.maxLevel})!`, '#4ade80');
          }
        }
      }
    } else if (actionId.startsWith('refund_skill_')) {
      const skillKey = actionId.replace('refund_skill_', '');
      this.selectedSkillNodeId = skillKey;
      const char = this.masterySystem.getCharData(this.skillTreeSelectedCharId);
      const def = SKILL_TREE_DEFINITIONS[skillKey];
      if (def) {
        const cur = (char.skills && char.skills[skillKey]) || 0;
        if (cur <= 0) {
          this.showSkillTreeToast(`ℹ️ ${def.name} chưa cộng điểm nào để hoàn!`, '#f59e0b');
        } else if (!this.masterySystem.canSafelyRefund(this.skillTreeSelectedCharId, skillKey)) {
          this.showSkillTreeToast('⚠️ Đang có kỹ năng tầng sau phụ thuộc vào nút này, không thể hoàn!', '#f43f5e');
        } else {
          const ok = this.masterySystem.refundSkill(this.skillTreeSelectedCharId, skillKey);
          if (ok) {
            this.showSkillTreeToast(`↩️ Đã hoàn lại ${def.costPerLevel} điểm từ: ${def.name}!`, '#fb923c');
          }
        }
      }
    } else if (actionId.startsWith('reset_skill_branch_')) {
      const branch = actionId.replace('reset_skill_branch_', '');
      const refunded = this.masterySystem.resetBranch(this.skillTreeSelectedCharId, branch);
      const branchNames = { green: 'Sinh Tồn & Phòng Thủ', red: 'Tấn Công & Hủy Diệt', yellow: 'Tiện Ích & Năng Lượng' };
      if (refunded > 0) {
        this.showSkillTreeToast(`🔄 Đã tẩy nhánh ${branchNames[branch] || branch}! Hoàn lại +${refunded} Điểm Kỹ Năng.`, '#38bdf8');
      } else {
        this.showSkillTreeToast(`ℹ️ Nhánh ${branchNames[branch] || branch} chưa có điểm nào để tẩy!`, '#f59e0b');
      }
    } else if (actionId === 'reset_mastery_skills') {
      const refunded = this.masterySystem.resetSkills(this.skillTreeSelectedCharId);
      if (refunded > 0) {
        this.showSkillTreeToast(`🔄 Đã tẩy toàn bộ kỹ năng! Hoàn lại +${refunded} Điểm Kỹ Năng.`, '#38bdf8');
      } else {
        this.showSkillTreeToast('ℹ️ Chưa có kỹ năng nào được cộng điểm để tẩy!', '#f59e0b');
      }
    } else if (actionId === 'reset_mastery_level') {
      const refundedScore = this.masterySystem.resetMasteryLevel(this.skillTreeSelectedCharId);
      if (refundedScore > 0) {
        this.showSkillTreeToast(`♻️ Đã reset Cấp Thông Thạo về Cấp 1! Hoàn lại ${refundedScore.toLocaleString()} Score.`, '#f43f5e');
      } else {
        this.showSkillTreeToast('ℹ️ Cấp Thông Thạo hiện đang ở Cấp 1, không cần tẩy!', '#f59e0b');
      }
    } else if (actionId === 'back_from_skill_tree') {
      this.gameState = 'MAIN_MENU';
      if (this.audioManager) this.audioManager.playMenuMusic();
    } else if (actionId === 'how_to_play') {
      alert('🎮 HƯỚNG DẪN CHƠI:\n- Di chuyển: Phím W, A, S, D hoặc Mũi tên\n- Tấn công: Tự động 100%\n- Nhặt Đá Kinh Nghiệm để thăng cấp và chọn vũ khí\n- Khi có 2 vũ khí Max Cấp 7, Lõi Tiến Hóa sẽ rơi xuống để Hợp Nhất Vũ Khí Tối Thượng!\n- Tiêu diệt quái kiếm Vàng để Nâng Cấp Vĩnh Viễn tại Cổ Viện Ma Pháp.');
    } else if (actionId.startsWith('select_char_')) {
      if (btnData.charData) {
        if (this.selectedChar && this.selectedChar.id === btnData.charData.id) {
          // Nhấp lại vào anh hùng đã chọn -> Tiến ngay sang chọn Chế độ
          this.gameState = 'MODE_SELECT';
        } else {
          this.selectedChar = btnData.charData;
        }
      }
    } else if (actionId === 'goto_mode_select') {
      this.gameState = 'MODE_SELECT';
    } else if (actionId.startsWith('select_mode_')) {
      if (btnData.modeData) {
        if (this.selectedMode && this.selectedMode.id === btnData.modeData.id) {
          // Nhấp lại vào chế độ đã chọn -> Tiến ngay sang chọn Thử thách
          this.gameState = 'CHALLENGE_SELECT';
        } else {
          this.selectedMode = btnData.modeData;
        }
      }
    } else if (actionId === 'goto_challenge_select') {
      this.gameState = 'CHALLENGE_SELECT';
    } else if (actionId.startsWith('toggle_challenge_')) {
      const chId = actionId.replace('toggle_challenge_', '');
      this.selectedChallenges[chId] = !this.selectedChallenges[chId];
    } else if (actionId === 'goto_diff_select') {
      this.gameState = 'DIFF_SELECT';
    } else if (actionId.startsWith('select_diff_')) {
      if (btnData.diffData) {
        if (this.selectedDiff && this.selectedDiff.id === btnData.diffData.id) {
          // Nhấp lại vào độ khó đã chọn -> Tiến ngay sang chọn Sách khởi đầu
          this.gameState = 'BOOK_SELECT';
        } else {
          this.selectedDiff = btnData.diffData;
        }
      }
    } else if (actionId === 'start_battle_now') {
      this.initGame();
    } else if (actionId === 'goto_book_select') {
      this.gameState = 'BOOK_SELECT';
    } else if (actionId.startsWith('toggle_starter_book_')) {
      if (this.selectedChallenges && this.selectedChallenges.no_books) return;
      const bookId = actionId.replace('toggle_starter_book_', '');
      const maxStarters = (this.meta.upgrades.starterBooks ? (1 + this.meta.upgrades.starterBooks.level) : 1);
      const idx = this.selectedStarterBookIds.indexOf(bookId);
      if (idx !== -1) {
        this.selectedStarterBookIds.splice(idx, 1);
      } else {
        if (this.selectedStarterBookIds.length < maxStarters) {
          this.selectedStarterBookIds.push(bookId);
        } else if (maxStarters === 1) {
          this.selectedStarterBookIds = [bookId];
        } else {
          this.selectedStarterBookIds.shift();
          this.selectedStarterBookIds.push(bookId);
        }
      }
    } else if (actionId === 'prev_starter_book') {
      const step = this.starterBookCardStep || 468;
      this.starterBookTargetScrollX = Math.max(0, (this.starterBookTargetScrollX || 0) - step);
    } else if (actionId === 'next_starter_book') {
      const step = this.starterBookCardStep || 468;
      const maxScroll = this.starterBookMaxScrollX || 0;
      this.starterBookTargetScrollX = Math.min(maxScroll, (this.starterBookTargetScrollX || 0) + step);
    } else if (actionId === 'start_battle_from_books') {
      this.initGame(this.selectedStarterBookIds);
    } else if (actionId === 'clear_starter_books') {
      this.selectedStarterBookIds = [];
      this.initGame([]);
    } else if (actionId === 'back_to_diff_select') {
      this.gameState = 'DIFF_SELECT';
    } else if (actionId === 'open_codex') {
      this.gameState = 'CODEX';
      this.codexScrollY = 0;
      this.selectedCodexBook = null;
    } else if (actionId.startsWith('codex_inspect_')) {
      this.selectedCodexBook = actionId.replace('codex_inspect_', '');
    } else if (actionId === 'close_codex_detail') {
      this.selectedCodexBook = null;
    } else if (actionId.startsWith('filter_codex_')) {
      this.codexFilter = actionId.replace('filter_codex_', '');
    } else if (actionId === 'codex_scroll_up') {
      this.codexScrollY = Math.max(0, (this.codexScrollY || 0) - 260);
    } else if (actionId === 'codex_scroll_down') {
      const maxScroll = this.codexMaxScrollY || 1500;
      this.codexScrollY = Math.min(maxScroll, (this.codexScrollY || 0) + 260);
    } else if (actionId === 'open_achievements') {
      this.gameState = 'ACHIEVEMENTS';
      this.achievementCategory = 'all';
      this.achievementScrollY = 0;
    } else if (actionId === 'back_from_achievements') {
      this.gameState = 'MAIN_MENU';
      if (this.audioManager) this.audioManager.playMenuMusic();
    } else if (actionId.startsWith('filter_achievement_')) {
      this.achievementCategory = actionId.replace('filter_achievement_', '');
      this.achievementScrollY = 0;
    } else if (actionId === 'achievement_scroll_up') {
      this.achievementScrollY = Math.max(0, (this.achievementScrollY || 0) - 260);
    } else if (actionId === 'achievement_scroll_down') {
      const maxScroll = this.achievementMaxScrollY || 1500;
      this.achievementScrollY = Math.min(maxScroll, (this.achievementScrollY || 0) + 260);
    } else if (actionId === 'back_to_menu') {
      this.gameState = 'MAIN_MENU';
      if (this.audioManager) this.audioManager.playMenuMusic();
    } else if (actionId === 'back_to_char_select') {
      this.gameState = 'CHAR_SELECT';
    } else if (actionId === 'back_to_mode_select') {
      this.gameState = 'MODE_SELECT';
    } else if (actionId === 'back_to_challenge_select') {
      this.gameState = 'CHALLENGE_SELECT';
    } else if (actionId === 'add_test_gold') {
      this.meta.gold = (this.meta.gold || 0) + 1000;
      this.meta.save();
      this.showShopToast('🎁 Đã nhận +1,000 Tiền Vàng thử nghiệm!', '#ffd700');
    } else if (actionId.startsWith('shop_tab_')) {
      this.shopCategoryFilter = actionId.replace('shop_tab_', '');
      this.shopScrollY = 0;
    } else if (actionId === 'reset_all_upgrades') {
      const refunded = this.meta.resetAllUpgrades();
      if (refunded > 0) {
        this.showShopToast(`♻️ Đã tẩy toàn bộ nâng cấp! Hoàn lại +${refunded.toLocaleString()} Tiền Vàng (100%).`, '#38bdf8');
      } else {
        this.showShopToast('ℹ️ Chưa có nâng cấp nào được mua để hoàn vàng!', '#f59e0b');
      }
    } else if (actionId.startsWith('refund_upgrade_')) {
      const upId = actionId.replace('refund_upgrade_', '');
      const up = this.meta.upgrades[upId];
      if (!up || up.level <= 0) {
        this.showShopToast('ℹ️ Nâng cấp này đang ở Cấp 0, không thể hoàn!', '#f59e0b');
        return;
      }
      const refVal = this.meta.getRefundValue(upId);
      const refunded = this.meta.refundUpgrade(upId);
      if (refunded > 0) {
        this.showShopToast(`↩️ Đã hoàn 1 cấp ${up.name}! Nhận lại +${refunded.toLocaleString()} Vàng (100%).`, '#fbbf24');
      }
    } else if (actionId.startsWith('buy_upgrade_')) {
      const upId = actionId.replace('buy_upgrade_', '');
      const up = this.meta.upgrades[upId];
      if (!up) return;
      if (up.level >= up.maxLevel) {
        this.showShopToast(`⭐ ${up.name} đã đạt cấp tối đa!`, '#f59e0b');
        return;
      }
      const cost = this.meta.getCost(upId);
      if (this.meta.gold < cost) {
        this.showShopToast(`⚠️ Chưa đủ Tiền Vàng! Cần ${cost.toLocaleString()} Vàng (Hiện có: ${this.meta.gold.toLocaleString()} Vàng).`, '#f43f5e');
        return;
      }
      const ok = this.meta.buyUpgrade(upId);
      if (ok) {
        this.showShopToast(`🎉 Đã nâng cấp thành công: ${up.name} (Cấp ${up.level}/${up.maxLevel})!`, '#4ade80');
      }
    }
  }

  loop(currentTime) {
    const rawDelta = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    const delta = Math.min(rawDelta, 0.1);

    this.frameCount++;
    if (currentTime - this.lastFpsUpdate >= 500) {
      this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = currentTime;
    }

    if (this.gameState === 'PLAYING') {
      if (!this.isPaused && !this.isLevelUpOpen && !this.isEvolutionOpen && !this.activeEvolutionModal) {
        this.update(delta);
      }
    } else {
      // Menu background ambient update
      this.particles.update(delta);

      if (this.skillTreeToast && this.skillTreeToast.timer > 0) {
        this.skillTreeToast.timer -= delta;
        if (this.skillTreeToast.timer <= 0) {
          this.skillTreeToast = null;
        }
      }

      if (this.shopToast && this.shopToast.timer > 0) {
        this.shopToast.timer -= delta;
        if (this.shopToast.timer <= 0) {
          this.shopToast = null;
        }
      }

      if (this.achievementSystem) {
        this.achievementSystem.update(delta);
      }
    }

    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }

  triggerTreasureBox() {
    this.particles.createArcaneBlast(this.player.x, this.player.y, 3.0);
    this.particles.createDeathBurst(this.player.x, this.player.y, '#ffd700', 80);
    if (this.isLevelUpOpen) {
      this.pendingLevelUps++;
    } else {
      this.triggerLevelUp();
    }
  }

  update(delta) {
    if (!this.player.isDead) {
      this.gameTime += delta;
      if (this.achievementSystem) {
        this.achievementSystem.track('max_time', Math.floor(this.gameTime), true);
        this.achievementSystem.update(delta);
      }
      this.player.update(delta, this.input);
      this.camera.follow(this.player);

      if (this.witchBannerTimer > 0) {
        this.witchBannerTimer -= delta;
      }

      // Cập nhật UpgradeManager (đếm ngược khóa ô kỹ năng & tự hồi Máu Ảo sau 8s)
      this.upgradeManager.update(delta, this.player);

      // Tự hồi máu nếu có trang bị (kiểm tra thử thách Không Hồi Máu, Scale x10)
      const regenItem = this.upgradeManager.passivePool.regen;
      if (regenItem && regenItem.level > 0 && !regenItem.isLocked) {
        this.player.heal(regenItem.level * 10.0 * delta);
      }

      // 1. Vũ khí tự động
      const dmgMult = this.skillManager.getDamageMultiplier() * (this.player.isWitch ? 1.30 : 1.0);
      const onEnemyKill = (killedEnemy) => {
        if (!killedEnemy || killedEnemy._killedHandled) return;
        killedEnemy._killedHandled = true;
        this.killCount++;
        if (this.achievementSystem) {
          this.achievementSystem.track('kills', 1);
          if (killedEnemy.isMiniBoss) {
            this.achievementSystem.track('mini_boss_kills', 1);
          }
          if (killedEnemy.name === 'Ma Nữ Meruru' || (killedEnemy.bossName && killedEnemy.bossName.includes('Meruru'))) {
            this.achievementSystem.track('meruru_kills', 1);
          }
          if (killedEnemy.isFinalBoss || (killedEnemy.name && killedEnemy.name.includes('Yuki'))) {
            this.achievementSystem.track('yuki_kills', 1);
          }
        }
        this.skillManager.onDamageDealt(300, this.player);

        // Kiểm tra điều kiện Thức Tỉnh Phù Thủy (Witch Awakening)
        if (this.player && this.player.hasWitchForm && !this.player.isWitch) {
          const killsNeeded = this.player.witchKillRequirement || 100;
          const skillsUnlocked = this.skillManager ? this.skillManager.getUnlockedCount() : 0;
          if (this.killCount >= killsNeeded && skillsUnlocked >= 3) {
            this.triggerWitchAwakening();
          }
        }

        // Karl Marx: Giải Phóng Vô Sản (Quái chết phát nổ Sóng Xung Kích Đỏ)
        if (this.bookSystem && this.bookSystem.hasBook('marx')) {
          const shockRadius = 220;
          const shockDmg = Math.round((this.player ? (this.player.attackDamage || 50) : 50) * 1.20);
          for (const other of this.enemies) {
            if (other && !other.isDead && other !== killedEnemy) {
              const d = Math.hypot(other.x - killedEnemy.x, other.y - killedEnemy.y);
              if (d <= shockRadius) {
                other.takeDamage(shockDmg, { isTrueDamage: true }, this.particles);
                const pushAngle = Math.atan2(other.y - killedEnemy.y, other.x - killedEnemy.x);
                other.x += Math.cos(pushAngle) * 30;
                other.y += Math.sin(pushAngle) * 30;
              }
            }
          }
          if (this.particles) {
            this.particles.createDeathBurst(killedEnemy.x, killedEnemy.y, '#ef4444', 35);
          }
        }

        // Derrida: Giải Cấu Trúc (Quái chết phát nổ ký tự gây sát thương diện rộng)
        if (this.bookSystem && this.bookSystem.hasBook('derrida')) {
          const blastRadius = 180;
          const blastDmg = Math.round((this.player ? (this.player.attackDamage || 50) : 50) * 0.90);
          for (const other of this.enemies) {
            if (other && !other.isDead && other !== killedEnemy) {
              const d = Math.hypot(other.x - killedEnemy.x, other.y - killedEnemy.y);
              if (d <= blastRadius) {
                other.takeDamage(blastDmg, { isTrueDamage: true }, this.particles);
                if (other.armor > 0) {
                  other.armor = Math.max(0, Math.round(other.armor * 0.60)); // Phá 40% giáp
                }
              }
            }
          }
          if (this.particles) {
            this.particles.createArcaneBlast(killedEnemy.x, killedEnemy.y, 2.0);
          }
        }

        // Hiệu ứng nổ phép thuật Arcane FX cho quái tinh anh & Boss
        if (killedEnemy.isElite || killedEnemy.isBoss) {
          this.particles.createArcaneBlast(killedEnemy.x, killedEnemy.y, 3.2);
          this.particles.createDeathBurst(killedEnemy.x, killedEnemy.y, '#ffd700', 70);
        }

        // --- CƠ CHẾ RƠI VẬT PHẨM KHI QUÁI CHẾT ---
        // A. Mini Boss chết rơi 1 Hộp Báu Vật
        if (killedEnemy.isMiniBoss) {
          this.treasureBoxes.push(new TreasureBox(killedEnemy.x, killedEnemy.y));
          this.experienceGems.push(new ExperienceGem(killedEnemy.x, killedEnemy.y, 45));
        }
        // B. Main Boss chết rơi 2 Hộp Báu Vật
        else if (killedEnemy.isMainBoss) {
          this.treasureBoxes.push(new TreasureBox(killedEnemy.x - 40, killedEnemy.y));
          this.treasureBoxes.push(new TreasureBox(killedEnemy.x + 40, killedEnemy.y));
          this.experienceGems.push(new ExperienceGem(killedEnemy.x, killedEnemy.y, 100));

          // Nếu là Boss Cuối Cùng Yuki bị tiêu diệt trong Chế Độ Bình Thường
          if (killedEnemy.isFinalBoss && this.selectedMode.id === 'normal') {
            this.isVictory = true;
            this.finishGame();
            return;
          }
        }
        // C. Quái thường
        else {
          let xpVal = 1;
          if (killedEnemy.isElite) xpVal = 30;
          else if (killedEnemy.isRanged) xpVal = 8;
          else if (killedEnemy.config && killedEnemy.config.id === 'skeleton') xpVal = 3;

          this.experienceGems.push(new ExperienceGem(killedEnemy.x, killedEnemy.y, xpVal));

          // Tỷ lệ rơi Cục Máu từ quái thường:
          // 0.5% (0.005) rơi Cục Máu Nhỏ (+40 HP)
          // 0.1% (0.001) rơi Cục Máu Lớn (+70% Max HP)
          const roll = Math.random();
          if (roll < 0.001) {
            this.healthDrops.push(new HealthDrop(killedEnemy.x, killedEnemy.y, 'large'));
          } else if (roll < 0.006) {
            this.healthDrops.push(new HealthDrop(killedEnemy.x, killedEnemy.y, 'small'));
          }

          // Rơi Rương Tiến Hóa nếu đủ điều kiện
          if (this.upgradeManager.canEvolve && this.evolutionDrops.length === 0) {
            if (killedEnemy.isElite || Math.random() < 0.25) {
              this.evolutionDrops.push(new EvolutionDrop(killedEnemy.x, killedEnemy.y));
            }
          }
        }

        // --- GHI NHẬN TIẾN ĐỘ & RƠI SÁCH TRI THỨC (BOOK SYSTEM) ---
        if (this.bookSystem) {
          this.bookSystem.bramNoHitTimer = 0; // Đánh trúng/tiêu diệt quái -> reset Cơn Khát Máu Dracula
          this.bookSystem.onEnemyKilled(killedEnemy, killedEnemy.isMiniBoss, killedEnemy.isMainBoss);

          // Rơi Sách Khởi Đầu nếu kho sách còn ô trống (chưa đầy và chưa có drop đang chờ trên đất) và không bật Thử Thách Cấm Sách
          const availableBookSlots = this.bookSystem.maxSlots - this.bookSystem.activeBooks.length - this.bookDrops.length;
          if (!this.selectedChallenges.no_books && availableBookSlots > 0) {
            const unownedStarters = STARTER_BOOK_IDS.filter(id => !this.bookSystem.hasBook(id) && !this.bookDrops.some(d => d.bookId === id));
            if (unownedStarters.length > 0) {
              const metaDropMult = (this.meta.upgrades.bookDropRate ? (1.0 + this.meta.upgrades.bookDropRate.level * 0.25) : 1.0);
              let dropChance = 0;
              if (killedEnemy.isMiniBoss) dropChance = 0.50;
              else if (killedEnemy.isMainBoss) dropChance = 1.0;
              else if (killedEnemy.isElite) dropChance = 0.12 * metaDropMult;
              else dropChance = 0.007 * metaDropMult;

              if (Math.random() < dropChance) {
                const randomBookId = unownedStarters[Math.floor(Math.random() * unownedStarters.length)];
                this.bookDrops.push(new BookDrop(killedEnemy.x, killedEnemy.y, randomBookId));
              }
            }
          }
        }
      };

      this.weaponManager.update(
        delta,
        this.player,
        this.enemies,
        (proj) => this.playerProjectiles.push(proj),
        this.particles,
        dmgMult,
        onEnemyKill
      );

      // 2. Đạn kiếm của người chơi (đồng thời kiểm tra va chạm với Thùng Gỗ)
      for (let i = this.playerProjectiles.length - 1; i >= 0; i--) {
        const proj = this.playerProjectiles[i];
        proj.update(delta, this.enemies, this.particles, onEnemyKill);

        // Kiểm tra va chạm với Thùng Gỗ
        for (const crate of this.crates) {
          if (!crate.isDead && Math.hypot(proj.x - crate.x, proj.y - crate.y) < proj.radius + crate.getHitboxRadius()) {
            this.breakCrate(crate);
            proj.isDead = true;
            break;
          }
        }

        if (proj.isDead) {
          this.playerProjectiles.splice(i, 1);
        }
      }

      // Kiểm tra người chơi đánh cận chiến/quét trúng Thùng Gỗ
      const pRadius = this.player.getHitboxRadius() + 35;
      for (const crate of this.crates) {
        if (!crate.isDead && Math.hypot(this.player.x - crate.x, this.player.y - crate.y) < pRadius + crate.getHitboxRadius()) {
          this.breakCrate(crate);
        }
      }

      // Dọn Thùng Gỗ vỡ
      this.crates = this.crates.filter(c => !c.isDead);

      // 3. Dọn quái chết (Đảm bảo quái chết do DoT Thiêu Đốt hoặc Phản Đòn đều được tính kill & rớt đá)
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const deadEnemy = this.enemies[i];
        if (deadEnemy.isDead) {
          if (!deadEnemy._killedHandled) {
            onEnemyKill(deadEnemy);
          }
          this.enemies.splice(i, 1);
        }
      }

      // 4. Sinh quái mới & Xử lý Timeline Boss
      const newSpawns = this.spawner.update(delta, this.gameTime, this.camera, this.player, this.enemies);
      if (newSpawns) {
        if (Array.isArray(newSpawns)) {
          for (const s of newSpawns) this.enemies.push(s);
        } else {
          this.enemies.push(newSpawns);
        }
      }

      // 5. Quái bám đuổi & gây sát thương
      const onEnemyShoot = (sx, sy, tx, ty, damage = null, options = {}) => {
        this.enemyProjectiles.push(new EnemyProjectile(sx, sy, tx, ty, damage, options));
      };

      const dmgReduction = this.upgradeManager.getDamageReduction();

      for (let i = 0; i < this.enemies.length; i++) {
        const enemy = this.enemies[i];

        // Nếu là YukiBoss hoặc MeruruBoss
        if (enemy.isFinalBoss) {
          enemy.update(
            delta,
            this.player,
            this.enemies,
            onEnemyShoot,
            this.particles,
            (sx, sy, cnt) => this.spawner.spawnSwarmRing(this.player, cnt, this.enemies),
            this.upgradeManager
          );
        } else if (enemy.isMainBoss) {
          enemy.update(delta, this.player, this.enemies, onEnemyShoot, this.particles);
        } else {
          enemy.update(delta, this.player, this.enemies, onEnemyShoot, this.particles);
        }

        const dist = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
        if (dist < enemy.getHitboxRadius() + this.player.getHitboxRadius()) {
          const hitSuccess = this.player.takeDamage(enemy.damage, {
            attackerAccuracy: enemy.accuracy || 1.0,
            attacker: enemy
          }, this.particles);

          if (hitSuccess) {
            // Hệ Thống Phản Sát Thương (Reflect Damage System: Flat + %)
            const reflectDmg = this.player.getReflectDamage ? this.player.getReflectDamage(enemy.damage) : 0;
            if (reflectDmg > 0 && !this.player.isDead) {
              const actualThorn = enemy.takeDamage(reflectDmg, { isTrueDamage: false }, this.particles);
              if (actualThorn > 0) {
                // Hiển thị chữ số phản đòn màu hồng tím rực rỡ
                this.particles.createDamageNumber(enemy.x, enemy.y, actualThorn, false, false, false, false, '#f43f5e');
                this.particles.createHitSparks(enemy.x, enemy.y, 8);
              }
            }
          }
        }
      }

      // 6. Đạn của quái đánh xa
      for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
        const proj = this.enemyProjectiles[i];
        const hitResult = proj.update(delta, this.player, this.particles);
        if (hitResult && hitResult.hit) {
          // Khi trúng đạn: Giáp gai phản chấn phát nổ bắn tia phản đòn vào quái gần nhất
          const reflectDmg = this.player.getReflectDamage ? this.player.getReflectDamage(proj.damage) : 0;
          if (reflectDmg > 0 && this.enemies.length > 0 && !this.player.isDead) {
            let nearestEnemy = null;
            let nearestDist = 550;
            for (const enemy of this.enemies) {
              if (enemy.isDead) continue;
              const d = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
              if (d < nearestDist) {
                nearestDist = d;
                nearestEnemy = enemy;
              }
            }
            if (nearestEnemy) {
              const actualThorn = nearestEnemy.takeDamage(reflectDmg, { isTrueDamage: false }, this.particles);
              if (actualThorn > 0) {
                this.particles.createDamageNumber(nearestEnemy.x, nearestEnemy.y, actualThorn, false, false, false, false, '#f43f5e');
                this.particles.createHitSparks(nearestEnemy.x, nearestEnemy.y, 8);
              }
            }
          }
        }
        if (proj.isDead) {
          this.enemyProjectiles.splice(i, 1);
        }
      }

      // 7. Hút Đá Kinh Nghiệm
      const magnetRadius = this.upgradeManager.getMagnetRadius();
      for (let i = this.experienceGems.length - 1; i >= 0; i--) {
        const gem = this.experienceGems[i];
        const xpGained = gem.update(delta, this.player, magnetRadius);
        if (xpGained > 0) {
          this.addXP(xpGained);
        }
        if (gem.isDead) {
          this.experienceGems.splice(i, 1);
        }
      }

      // 7.5. Hút & Nhặt Cục Máu (Health Drops)
      for (let i = this.healthDrops.length - 1; i >= 0; i--) {
        const drop = this.healthDrops[i];
        const healAmt = drop.update(delta, this.player, magnetRadius);
        if (healAmt > 0) {
          const actualHealed = this.player.heal(healAmt);
          if (actualHealed > 0) {
            this.particles.createDamageNumber(this.player.x, this.player.y - 25, Math.round(actualHealed), false, '#22c55e');
            this.particles.createDeathBurst(this.player.x, this.player.y, '#22c55e', 35);
          }
        }
        if (drop.isDead) {
          this.healthDrops.splice(i, 1);
        }
      }

      // 7.8. Nhặt Hộp Báu Vật (Treasure Boxes)
      for (let i = this.treasureBoxes.length - 1; i >= 0; i--) {
        const box = this.treasureBoxes[i];
        box.update(delta, this.player, () => this.triggerTreasureBox());
        if (box.isDead) {
          this.treasureBoxes.splice(i, 1);
        }
      }

      // 8. Rương Tiến Hóa
      for (let i = this.evolutionDrops.length - 1; i >= 0; i--) {
        const drop = this.evolutionDrops[i];
        drop.update(delta, this.player, () => this.triggerEvolution());
        if (drop.isDead) {
          this.evolutionDrops.splice(i, 1);
        }
      }

      // 8.5. Nhặt Sách Khởi Đầu rơi ra từ quái (Book Drops)
      for (let i = this.bookDrops.length - 1; i >= 0; i--) {
        const drop = this.bookDrops[i];
        drop.update(delta, this.player, this.bookSystem, (bookId, bookDef) => {
          this.particles.createArcaneBlast(this.player.x, this.player.y, 2.0);
          this.showGameToast(`📖 Đã nhặt sách: ${bookDef ? bookDef.work : bookId}`, '#fde047');
        });
        if (drop.isDead) {
          this.bookDrops.splice(i, 1);
        }
      }

      // 8.6. Cập nhật Hệ Thống Sách Tri Thức (Book System)
      if (this.bookSystem) {
        const bookEvent = this.bookSystem.update(delta, this.player);
        if (bookEvent && bookEvent.triggerHugoWave) {
          for (const enemy of this.enemies) {
            if (enemy.isDead) continue;
            enemy.applyDebuff('slow', 0.30, 6.0);
          }
          this.particles.createArcaneBlast(this.player.x, this.player.y, 4.0);
          this.showGameToast('🌊 Sóng Chấn Động Les Misérables: Làm chậm 30% toàn bộ quái vật!', '#38bdf8');
        }

        // Kiểm tra mở bảng tiến hóa sách nếu có sách sẵn sàng (không đè lên lúc đang chọn nâng cấp Level-Up)
        if (!this.isPaused && !this.isLevelUpOpen && !this.isEvolutionOpen && !this.activeEvolutionModal && (!this.pendingLevelUps || this.pendingLevelUps === 0)) {
          if (this.bookSystem.pendingAwakenings && this.bookSystem.pendingAwakenings.length > 0) {
            const awakening = this.bookSystem.pendingAwakenings.shift();
            this.activeEvolutionModal = {
              isAwakening: true,
              targetId: awakening.targetId,
              ingredientIds: awakening.ingredientIds || [],
              isFusion: awakening.isFusion
            };
          } else if (this.bookSystem.pendingEvolutions.length > 0) {
            const nextEv = this.bookSystem.pendingEvolutions[0];
            let choices = [];
            if (nextEv.targetId === 'choice_descartes') {
              choices = ['heidegger', 'kant'];
                if (this.player && this.player.armor >= 35) {
                  choices.push('spinoza');
                }
            } else if (nextEv.targetId === 'choice_kant') {
              choices = ['hegel', 'feuerbach', 'nietzsche'];
            } else {
              choices = [nextEv.targetId];
            }
            this.activeEvolutionModal = {
              sourceId: nextEv.sourceId,
              targetId: nextEv.targetId,
              choices: choices
            };
          }
        }
      }

      // 8.7. Cập nhật Âm nhạc chiến đấu (Tự động chuyển bài khi Main Boss xuất hiện / bị tiêu diệt)
      if (this.audioManager && this.gameState === 'PLAYING') {
        const hasActiveMainBoss = this.enemies.some(e => e.isMainBoss && !e.isDead);
        if (hasActiveMainBoss && this.audioManager.currentTrack !== 'boss') {
          this.audioManager.playBoss();
        } else if (!hasActiveMainBoss && this.audioManager.currentTrack === 'boss') {
          this.audioManager.playNormal();
        }
      }

      if (this.gameToast && this.gameToast.timer > 0) {
        this.gameToast.timer -= delta;
        if (this.gameToast.timer <= 0) this.gameToast = null;
      }

      // 9. Kiểm tra Hồi Sinh nếu vừa chết
      if (this.player.isDead) {
        this.skillManager.checkRevive(this.player, this.particles);
        if (this.player.isDead && this.gameState === 'PLAYING') {
          this.finishGame();
        }
      }

      // 10. Hạt hiệu ứng
      this.particles.update(delta);
    }
  }

  // Phá vỡ thùng gỗ và rơi vật phẩm
  breakCrate(crate) {
    if (crate.takeDamage(1)) {
      this.particles.createDeathBurst(crate.x, crate.y, '#8b5a2b', 40);

      // Tỷ lệ rơi từ thùng gỗ:
      // 70% Đá Kinh Nghiệm
      // 20% Cục Máu Nhỏ (+40 HP)
      // 10% Cục Máu Lớn (+70% Max HP)
      const roll = Math.random();
      if (roll < 0.70) {
        this.experienceGems.push(new ExperienceGem(crate.x, crate.y, 2));
      } else if (roll < 0.90) {
        this.healthDrops.push(new HealthDrop(crate.x, crate.y, 'small'));
      } else {
        this.healthDrops.push(new HealthDrop(crate.x, crate.y, 'large'));
      }
    }
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Nếu đang trong trận đấu
    if (this.gameState === 'PLAYING') {
      // 1. Mặt đất
      this.map.renderGround(this.ctx, this.camera);

      // 2. Thùng Gỗ, Đá Kinh Nghiệm, Cục Máu, Hộp Báu & Rương Tiến Hóa
      for (const crate of this.crates) {
        crate.render(this.ctx, this.camera);
      }
      for (const gem of this.experienceGems) {
        gem.render(this.ctx, this.camera);
      }
      for (const drop of this.healthDrops) {
        drop.render(this.ctx, this.camera);
      }
      for (const box of this.treasureBoxes) {
        box.render(this.ctx, this.camera);
      }
      for (const drop of this.evolutionDrops) {
        drop.render(this.ctx, this.camera);
      }
      for (const drop of this.bookDrops) {
        drop.render(this.ctx, this.camera, this.bookSystem);
      }

      // 3. Depth Sorting 2.5D
      const renderList = [];

      for (const dec of this.map.decorations) {
        renderList.push({ y: dec.y, type: 'decoration', data: dec });
      }
      renderList.push({ y: this.player.y, type: 'player', data: this.player });
      for (const enemy of this.enemies) {
        if (!enemy.isDead) {
          renderList.push({ y: enemy.y, type: 'enemy', data: enemy });
        }
      }

      renderList.sort((a, b) => a.y - b.y);

      for (const item of renderList) {
        if (item.type === 'decoration') {
          this.map.renderObject(this.ctx, this.camera, item.data);
        } else if (item.type === 'player') {
          this.player.render(this.ctx, this.camera);
        } else if (item.type === 'enemy') {
          item.data.render(this.ctx, this.camera);
        }
      }

      // 4. Vũ khí & Đạn
      this.weaponManager.render(this.ctx, this.camera, this.player);

      for (const proj of this.playerProjectiles) {
        proj.render(this.ctx, this.camera);
      }
      for (const proj of this.enemyProjectiles) {
        proj.render(this.ctx, this.camera);
      }

      // 5. Hiệu ứng hạt, Hoạt ảnh Arcane FX & Chữ số sát thương
      this.particles.render(this.ctx, this.camera);

      // 6. Bóng đêm & Quầng sáng
      this.map.renderLighting(this.ctx, this.camera, this.player);

      // 6.5. Hiệu ứng Màn Đêm Hắc Ám của Meruru (Làm đen mù màn hình người chơi)
      const meruruBoss = this.enemies.find(e => e.isMainBoss && !e.isFinalBoss && !e.isDead && e.blindnessTimer > 0);
      if (meruruBoss) {
        this.ctx.save();
        const pScreen = this.camera.worldToScreen(this.player.x, this.player.y);

        // Phủ bóng tối đen kịt toàn màn hình
        this.ctx.fillStyle = 'rgba(3, 4, 8, 0.95)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Khoét một quầng sáng mờ rất nhỏ sát người chơi (bán kính 140px)
        this.ctx.globalCompositeOperation = 'destination-out';
        const holeGrad = this.ctx.createRadialGradient(pScreen.x, pScreen.y, 25, pScreen.x, pScreen.y, 140);
        holeGrad.addColorStop(0, 'rgba(0, 0, 0, 1)');
        holeGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0.7)');
        holeGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        this.ctx.fillStyle = holeGrad;
        this.ctx.beginPath();
        this.ctx.arc(pScreen.x, pScreen.y, 140, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.fillStyle = '#ec4899';
        this.ctx.font = 'bold 22px "Segoe UI", serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('🌑 MÀN ĐÊM HẮC ÁM CỦA MERURU! TẦM NHÌN BỊ CHE KHUẤT! 🌑', this.canvas.width / 2, 140);
        this.ctx.restore();
      }

      // 7. Giao diện HUD (kèm Icon thật trong ô trang bị)
      this.renderHUD();

      // 8. Bảng Lên Cấp
      if (this.isLevelUpOpen) {
        this.renderLevelUpModal();
      }

      // 9. Bảng Tiến Hóa
      if (this.isEvolutionOpen) {
        this.renderEvolutionModal();
      }

      // 9.5. Bảng Tiến Hóa Sách Tri Thức (Book Evolution Modal)
      if (this.activeEvolutionModal) {
        this.renderBookEvolutionModal();
      }

      // 10. Màn hình Tạm Dừng
      if (this.isPaused) {
        this.renderPauseMenu();
      }

      // 11. Toast thông báo trong trận
      if (this.gameToast && this.gameToast.timer > 0) {
        this.renderGameToast();
      }

      // 12. Banner Thành Tựu Mở Khóa
      this.renderAchievementBanner();
      return;
    }

    // Nếu ở các màn hình ngoài menu
    this.menuButtons = [];

    switch (this.gameState) {
      case 'MAIN_MENU':
        this.renderMainMenu();
        break;
      case 'CHAR_SELECT':
        this.renderCharSelect();
        break;
      case 'MODE_SELECT':
        this.renderModeSelect();
        break;
      case 'CHALLENGE_SELECT':
        this.renderChallengeSelect();
        break;
      case 'DIFF_SELECT':
        this.renderDiffSelect();
        break;
      case 'BOOK_SELECT':
        this.renderBookSelect();
        break;
      case 'CODEX':
        this.renderCodex();
        break;
      case 'SHOP':
        this.renderShop();
        break;
      case 'SKILL_TREE':
        this.renderSkillTree();
        break;
      case 'ACHIEVEMENTS':
        this.renderAchievements();
        break;
      case 'GAME_OVER':
        this.renderGameOver();
        break;
    }

    // Banner Thành Tựu Mở Khóa trên các màn hình Menu
    this.renderAchievementBanner();
  }

  renderHUD() {
    this.ctx.save();

    // --- THANH KINH NGHIỆM (XP BAR 1080p) ---
    const xpBarH = 20;
    this.ctx.fillStyle = 'rgba(10, 15, 25, 0.90)';
    this.ctx.fillRect(0, 0, this.canvas.width, xpBarH);

    const xpPercent = Math.min(1.0, this.currentXP / this.maxXP);
    const xpGrad = this.ctx.createLinearGradient(0, 0, this.canvas.width, 0);
    xpGrad.addColorStop(0, '#00b4d8');
    xpGrad.addColorStop(1, '#90e0ef');

    this.ctx.fillStyle = xpGrad;
    this.ctx.fillRect(0, 0, this.canvas.width * xpPercent, xpBarH);

    this.ctx.strokeStyle = '#0077b6';
    this.ctx.lineWidth = 1.5;
    this.ctx.strokeRect(0, 0, this.canvas.width, xpBarH);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 13px monospace';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`CẤP ${this.level} (${Math.round(xpPercent * 100)}%)`, 16, 15);

    // --- THANH MÁU (HP BAR 1080p) ---
    const hpBarX = 35;
    const hpBarY = 36;
    const hpBarW = 560;
    const hpBarH = 26;

    this.ctx.fillStyle = 'rgba(10, 15, 25, 0.90)';
    this.ctx.fillRect(hpBarX - 3, hpBarY - 3, hpBarW + 6, hpBarH + 6);
    this.ctx.strokeStyle = '#3a4d6b';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(hpBarX - 3, hpBarY - 3, hpBarW + 6, hpBarH + 6);

    // 1. Thanh Máu Thật (Màu Đỏ)
    const hpPercent = Math.max(0, this.player.health / this.player.maxHealth);
    const grad = this.ctx.createLinearGradient(hpBarX, 0, hpBarX + hpBarW, 0);
    grad.addColorStop(0, '#e63946');
    grad.addColorStop(1, '#ff6b81');

    this.ctx.fillStyle = grad;
    this.ctx.fillRect(hpBarX, hpBarY, hpBarW * hpPercent, hpBarH);

    // 2. Thanh Máu Ảo (Màu Trắng Bạc đè lên trên thanh Máu đỏ)
    if (this.player.shield > 0) {
      const shieldRatio = Math.min(1.0, this.player.shield / this.player.maxHealth);
      const shieldGrad = this.ctx.createLinearGradient(hpBarX, 0, hpBarX + hpBarW, 0);
      shieldGrad.addColorStop(0, '#ffffff');
      shieldGrad.addColorStop(1, '#e2e8f0');

      this.ctx.fillStyle = shieldGrad;
      this.ctx.fillRect(hpBarX, hpBarY, hpBarW * shieldRatio, hpBarH);

      // Viền phát sáng thanh Máu Ảo
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeRect(hpBarX, hpBarY, hpBarW * shieldRatio, hpBarH);
    }

    // 3. Chữ hiển thị thông số chi tiết (Máu thật, Máu ảo, Giáp, Phản Sát Thương)
    const shieldStr = this.player.shield > 0 ? ` (+${Math.round(this.player.shield)} Ảo)` : '';
    const armorStr = `   |   🛡️ Giáp: ${Math.round(this.player.armor)}`;
    const refFlat = this.player.reflectFlat || 0;
    const refPct = Math.round((this.player.reflectPercent || 0) * 100);
    const reflectStr = (refFlat > 0 || refPct > 0) ? `   |   ⚔️ Phản: ${refFlat}${refPct > 0 ? `(+${refPct}%)` : ''}` : '';
    const fullText = `MÁU: ${Math.round(this.player.health)}/${this.player.maxHealth}${shieldStr}${armorStr}${reflectStr}`;

    this.ctx.font = 'bold 13px "Segoe UI", Arial, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 3.5;
    this.ctx.strokeText(fullText, hpBarX + hpBarW / 2, hpBarY + 18);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText(fullText, hpBarX + hpBarW / 2, hpBarY + 18);

    // --- HIỂN THỊ CÁC Ô TRANG BỊ CÓ ICON PIXEL ART (SLOTS 1080p: 5 Tấn Công / 4 Phòng Thủ / 3 Đa Dụng) ---
    const slotStartY = hpBarY + hpBarH + 12;
    const slotSize = 36;
    let curX = hpBarX;

    // 5 Ô TẤN CÔNG (Màu Đỏ/Hồng - Slot 1 là Vũ Khí Chính Độc Nhất viền vàng)
    for (let i = 0; i < 5; i++) {
      const w = this.upgradeManager.attackSlots[i];
      const isMain = w && (w.isMainWeapon || i === 0);
      this.ctx.fillStyle = w ? (isMain ? '#4a1525' : '#3a121d') : 'rgba(25, 20, 25, 0.75)';
      this.ctx.fillRect(curX, slotStartY, slotSize, slotSize);
      this.ctx.strokeStyle = w ? (isMain ? '#ffd700' : '#ff4d6d') : '#443344';
      this.ctx.lineWidth = isMain ? 2.5 : 1.5;
      this.ctx.strokeRect(curX, slotStartY, slotSize, slotSize);

      if (w && w.icon) {
        const iconImg = getIconImage(w.icon);
        if (iconImg && iconImg.complete) {
          this.ctx.drawImage(iconImg, curX + 2, slotStartY + 2, slotSize - 4, slotSize - 4);
        }
        // Biểu tượng vương miện nhỏ nếu là Vũ khí Chính Độc Nhất
        if (isMain) {
          this.ctx.fillStyle = '#ffd700';
          this.ctx.font = '10px sans-serif';
          this.ctx.textAlign = 'left';
          this.ctx.fillText('👑', curX + 1, slotStartY + 10);
        }
        // Huy hiệu cấp độ nhỏ ở góc dưới
        this.ctx.fillStyle = isMain ? '#ffd700' : '#ff4d6d';
        this.ctx.fillRect(curX + slotSize - 13, slotStartY + slotSize - 13, 13, 13);
        this.ctx.fillStyle = isMain ? '#000000' : '#ffffff';
        this.ctx.font = 'bold 11px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(w.level, curX + slotSize - 6, slotStartY + slotSize - 3);
      }
      curX += slotSize + 6;
    }

    curX += 10;
    // 4 Ô PHÒNG THỦ (Màu Xanh Ngọc)
    for (let i = 0; i < 4; i++) {
      const d = this.upgradeManager.defenseSlots[i];
      this.ctx.fillStyle = d ? '#11293a' : 'rgba(15, 25, 35, 0.75)';
      this.ctx.fillRect(curX, slotStartY, slotSize, slotSize);
      this.ctx.strokeStyle = d ? '#2ec4b6' : '#223344';
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeRect(curX, slotStartY, slotSize, slotSize);

      if (d && d.icon) {
        const iconImg = getIconImage(d.icon);
        if (iconImg && iconImg.complete) {
          this.ctx.drawImage(iconImg, curX + 2, slotStartY + 2, slotSize - 4, slotSize - 4);
        }
        this.ctx.fillStyle = '#2ec4b6';
        this.ctx.fillRect(curX + slotSize - 13, slotStartY + slotSize - 13, 13, 13);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 11px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(d.level, curX + slotSize - 6, slotStartY + slotSize - 3);
      }
      curX += slotSize + 6;
    }

    curX += 10;
    // 3 Ô ĐA DỤNG (Màu Vàng Kim - Tăng thêm 1 ô)
    for (let i = 0; i < 3; i++) {
      const u = this.upgradeManager.utilitySlots[i];
      this.ctx.fillStyle = u ? '#3d2c00' : 'rgba(30, 25, 15, 0.75)';
      this.ctx.fillRect(curX, slotStartY, slotSize, slotSize);
      this.ctx.strokeStyle = u ? '#ffd166' : '#443a22';
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeRect(curX, slotStartY, slotSize, slotSize);

      if (u && u.icon) {
        const iconImg = getIconImage(u.icon);
        if (iconImg && iconImg.complete) {
          this.ctx.drawImage(iconImg, curX + 2, slotStartY + 2, slotSize - 4, slotSize - 4);
        }
        this.ctx.fillStyle = '#ffd166';
        this.ctx.fillRect(curX + slotSize - 13, slotStartY + slotSize - 13, 13, 13);
        this.ctx.fillStyle = '#000000';
        this.ctx.font = 'bold 11px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(u.level, curX + slotSize - 6, slotStartY + slotSize - 3);
      }
      curX += slotSize + 6;
    }

    // --- THANH TIẾN ĐỘ THỨC TỈNH PHÙ THỦY (WITCH PROGRESS BAR) ---
    if (this.player && this.player.hasWitchForm) {
      const wBarX = hpBarX;
      const wBarY = slotStartY + slotSize + 10;
      const wBarW = hpBarW;
      const wBarH = 22;

      const killsNeeded = this.player.witchKillRequirement || 100;
      const currentKills = Math.min(this.killCount, killsNeeded);
      const skillsUnlocked = this.skillManager ? this.skillManager.getUnlockedCount() : 0;

      // Khung nền
      this.ctx.fillStyle = 'rgba(14, 10, 24, 0.90)';
      this.ctx.fillRect(wBarX - 2, wBarY - 2, wBarW + 4, wBarH + 4);

      if (!this.player.isWitch) {
        // Tiến độ: 50% từ quái diệt + 50% từ 3 kỹ năng riêng
        const killRatio = currentKills / killsNeeded;
        const skillRatio = skillsUnlocked / 3;
        const totalProgress = Math.min(1.0, killRatio * 0.5 + skillRatio * 0.5);

        const progGrad = this.ctx.createLinearGradient(wBarX, 0, wBarX + wBarW, 0);
        progGrad.addColorStop(0, '#7c3aed');
        progGrad.addColorStop(1, '#c026d3');

        this.ctx.fillStyle = progGrad;
        this.ctx.fillRect(wBarX, wBarY, wBarW * totalProgress, wBarH);

        this.ctx.strokeStyle = '#a855f7';
        this.ctx.lineWidth = 1.5;
        this.ctx.strokeRect(wBarX - 2, wBarY - 2, wBarW + 4, wBarH + 4);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 12px "Segoe UI", Arial, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
          `🧙‍♀️ TIẾN ĐỘ WITCH: 💀 ${currentKills}/${killsNeeded} Quái  |  ⭐ Kỹ Năng: ${skillsUnlocked}/3 (${Math.round(totalProgress * 100)}%)`,
          wBarX + wBarW / 2,
          wBarY + 16
        );
      } else {
        // Đã thức tỉnh vĩnh viễn
        const awakenedGrad = this.ctx.createLinearGradient(wBarX, 0, wBarX + wBarW, 0);
        awakenedGrad.addColorStop(0, '#9333ea');
        awakenedGrad.addColorStop(0.4, '#ec4899');
        awakenedGrad.addColorStop(1, '#ffd700');

        this.ctx.fillStyle = awakenedGrad;
        this.ctx.fillRect(wBarX, wBarY, wBarW, wBarH);

        this.ctx.strokeStyle = '#ffd700';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(wBarX - 2, wBarY - 2, wBarW + 4, wBarH + 4);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 13px "Segoe UI", Arial, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`👑 ĐÃ THỨC TỈNH PHÙ THỦY VĨNH VIỄN (WITCH FORM)`, wBarX + wBarW / 2, wBarY + 16);
      }
    }

    // --- HIỂN THỊ CÁC Ô SÁCH TRI THỨC (BOOK SLOTS) ---
    this.hudBookSlotRects = [];
    if (this.bookSystem) {
      const maxSlots = this.bookSystem.maxSlots;
      const bSlotW = 104;
      const bSlotH = 42;
      const bSlotGap = 8;
      const bStartY = (this.player && this.player.hasWitchForm) ? (slotStartY + slotSize + 40) : (slotStartY + slotSize + 12);
      let bX = hpBarX;

      for (let i = 0; i < maxSlots; i++) {
        const book = this.bookSystem.activeBooks[i];
        const isReady = book && this.bookSystem.progress[book.id] && this.bookSystem.progress[book.id].readyToEvolve;

        if (book) {
          this.ctx.fillStyle = '#fcfbf7';
          this.ctx.fillRect(bX, bStartY, bSlotW, bSlotH);

          this.ctx.strokeStyle = isReady ? '#eab308' : '#2b241c';
          this.ctx.lineWidth = isReady ? 2.5 : 1.2;
          this.ctx.strokeRect(bX, bStartY, bSlotW, bSlotH);

          this.ctx.strokeStyle = '#8a7968';
          this.ctx.lineWidth = 0.8;
          this.ctx.strokeRect(bX + 3, bStartY + 3, bSlotW - 6, bSlotH - 6);

          this.ctx.fillStyle = '#1c1917';
          this.ctx.font = 'bold 10px serif';
          this.ctx.textAlign = 'center';
          const title = book.def ? book.def.work : book.id;
          const displayTitle = title.length > 14 ? title.substring(0, 13) + '…' : title;
          this.ctx.fillText(displayTitle, bX + bSlotW / 2, bStartY + 18);

          this.ctx.fillStyle = '#78716c';
          this.ctx.font = '9px sans-serif';
          const author = book.def ? book.def.author : '';
          const displayAuthor = author.length > 15 ? author.substring(0, 14) + '…' : author;
          this.ctx.fillText(displayAuthor, bX + bSlotW / 2, bStartY + 32);

          if (isReady) {
            this.ctx.fillStyle = '#eab308';
            this.ctx.fillRect(bX + bSlotW - 14, bStartY + 2, 12, 12);
            this.ctx.fillStyle = '#000000';
            this.ctx.font = 'bold 9px sans-serif';
            this.ctx.fillText('⚡', bX + bSlotW - 8, bStartY + 11);
          }

          this.hudBookSlotRects.push({ x: bX, y: bStartY, w: bSlotW, h: bSlotH, bookId: book.id, readyToEvolve: isReady });
        } else {
          this.ctx.fillStyle = 'rgba(15, 20, 30, 0.65)';
          this.ctx.fillRect(bX, bStartY, bSlotW, bSlotH);
          this.ctx.strokeStyle = '#334155';
          this.ctx.lineWidth = 1;
          this.ctx.strokeRect(bX, bStartY, bSlotW, bSlotH);

          this.ctx.fillStyle = '#64748b';
          this.ctx.font = 'italic 11px sans-serif';
          this.ctx.textAlign = 'center';
          this.ctx.fillText('📖 Ô Trống', bX + bSlotW / 2, bStartY + 25);

          this.hudBookSlotRects.push({ x: bX, y: bStartY, w: bSlotW, h: bSlotH, bookId: null, readyToEvolve: false });
        }

        bX += bSlotW + bSlotGap;
      }
    }

    // --- ĐỒNG HỒ SINH TỒN & CHẾ ĐỘ CHƠI ---
    const minutes = Math.floor(this.gameTime / 60);
    const seconds = Math.floor(this.gameTime % 60);
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    const isNormal = this.selectedMode.id === 'normal';
    const leftSec = Math.max(0, 1200 - this.gameTime);
    const leftMin = Math.floor(leftSec / 60);
    const leftRemain = Math.floor(leftSec % 60);
    const modeSubText = isNormal
      ? `⏱️ 20:00 (Còn ${leftMin}:${leftRemain.toString().padStart(2, '0')})`
      : `♾️ VÔ TẬN`;

    const clockW = 240;
    const clockH = 58;
    this.ctx.fillStyle = 'rgba(12, 18, 30, 0.90)';
    this.ctx.fillRect(this.canvas.width / 2 - clockW / 2, 32, clockW, clockH);
    this.ctx.strokeStyle = '#d4af37';
    this.ctx.lineWidth = 1.8;
    this.ctx.strokeRect(this.canvas.width / 2 - clockW / 2, 32, clockW, clockH);

    this.ctx.fillStyle = '#ffecb3';
    this.ctx.font = 'bold 24px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(timeStr, this.canvas.width / 2, 59);

    this.ctx.fillStyle = isNormal ? '#38bdf8' : '#f43f5e';
    this.ctx.font = 'bold 12px sans-serif';
    this.ctx.fillText(modeSubText, this.canvas.width / 2, 79);

    // Cảnh báo nếu đang bị Chúa Tể Yuki khóa 1 ô trang bị (Skill 7)
    if (this.upgradeManager.tempLockedSlot) {
      const lockInfo = this.upgradeManager.tempLockedSlot;
      const secLeft = Math.ceil(lockInfo.timer);
      this.ctx.fillStyle = 'rgba(220, 38, 38, 0.92)';
      this.ctx.fillRect(this.canvas.width / 2 - 230, 98, 460, 32);
      this.ctx.strokeStyle = '#fecaca';
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeRect(this.canvas.width / 2 - 230, 98, 460, 32);
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 13px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`🔒 KỸ NĂNG [${lockInfo.name}] ĐANG BỊ PHONG ẤN (${secLeft}s)`, this.canvas.width / 2, 119);
    }

    // --- SỐ QUÁI ĐÃ TIÊU DIỆT ---
    const statsX = this.canvas.width - 440;
    this.ctx.fillStyle = 'rgba(10, 15, 25, 0.85)';
    this.ctx.fillRect(statsX, 32, 220, 64);
    this.ctx.strokeStyle = '#2d4059';
    this.ctx.lineWidth = 1.5;
    this.ctx.strokeRect(statsX, 32, 220, 64);

    this.ctx.fillStyle = '#ff9ebb';
    this.ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`💀 Đã diệt: ${this.killCount}`, statsX + 16, 56);

    this.ctx.fillStyle = '#9fd2ff';
    this.ctx.font = '13px monospace';
    this.ctx.fillText(`Quái: ${this.enemies.length} | FPS: ${this.fps}`, statsX + 16, 82);

    // --- NÚT TẠM DỪNG ---
    const btn = this.pauseBtnRect;
    this.ctx.fillStyle = this.isPaused ? '#7a2233' : 'rgba(25, 35, 52, 0.9)';
    this.ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
    this.ctx.strokeStyle = this.isPaused ? '#ff4d6d' : '#4d79a8';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 15px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(this.isPaused ? '▶ Tiếp Tục' : '⏸ Tạm Dừng (P)', btn.x + btn.w / 2, btn.y + 30);

    // --- BANNER THÔNG BÁO VỪA THỨC TỈNH PHÙ THỦY ---
    if (this.witchBannerTimer > 0) {
      this.ctx.save();
      const bannerY = this.canvas.height * 0.28;
      this.ctx.fillStyle = 'rgba(20, 8, 32, 0.92)';
      this.ctx.fillRect(this.canvas.width / 2 - 400, bannerY - 38, 800, 78);
      this.ctx.strokeStyle = '#e879f9';
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(this.canvas.width / 2 - 400, bannerY - 38, 800, 78);

      this.ctx.fillStyle = '#ffd700';
      this.ctx.font = 'bold 36px "Segoe UI", serif';
      this.ctx.textAlign = 'center';
      this.ctx.shadowColor = '#d946ef';
      this.ctx.shadowBlur = 24;
      this.ctx.fillText('⭐ THỨC TỈNH PHÙ THỦY VĨNH VIỄN! ⭐', this.canvas.width / 2, bannerY + 6);
      this.ctx.shadowBlur = 0;

      this.ctx.fillStyle = '#fdf4ff';
      this.ctx.font = 'bold 16px sans-serif';
      this.ctx.fillText('Hồi đầy Máu, +50 HP, +30% Sát thương, +20% Tốc độ & Chí mạng tối thượng!', this.canvas.width / 2, bannerY + 31);
      this.ctx.restore();
    }

    // --- NÚT KỸ NĂNG ĐẶC BIỆT RIÊNG CỦA NHÂN VẬT [PHÍM G] ---
    if (this.player && this.player.specialSkill) {
      const skill = this.player.specialSkill;
      const btnSize = 78;
      const btnX = Math.round(this.canvas.width / 2 - btnSize / 2);
      const btnY = this.canvas.height - btnSize - 24;
      this.specialSkillBtnRect = { x: btnX, y: btnY, w: btnSize, h: btnSize };

      const isUnlocked = !!skill.isUnlocked;
      const isOnCooldown = isUnlocked && skill.cooldown > 0;
      const cdRatio = isOnCooldown ? (skill.cooldown / (skill.maxCooldown || 8.0)) : 0;

      // Hào quang nền phía sau khi sẵn sàng
      if (isUnlocked && !isOnCooldown) {
        this.ctx.save();
        this.ctx.shadowColor = '#38bdf8';
        this.ctx.shadowBlur = 16;
        this.ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
        this.ctx.beginPath();
        this.ctx.arc(btnX + btnSize / 2, btnY + btnSize / 2, btnSize / 2 + 4, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
      }

      // Khung nút
      this.ctx.fillStyle = !isUnlocked ? 'rgba(10, 12, 18, 0.92)' : (isOnCooldown ? 'rgba(15, 20, 32, 0.90)' : 'rgba(20, 30, 50, 0.94)');
      this.ctx.fillRect(btnX, btnY, btnSize, btnSize);

      // Viền ma thuật
      this.ctx.strokeStyle = !isUnlocked ? '#334155' : (isOnCooldown ? '#475569' : '#38bdf8');
      this.ctx.lineWidth = (!isUnlocked || isOnCooldown) ? 1.8 : 2.5;
      this.ctx.strokeRect(btnX, btnY, btnSize, btnSize);

      // Khung viền chỉ ma pháp bên trong
      this.ctx.strokeStyle = !isUnlocked ? 'rgba(255, 255, 255, 0.04)' : (isOnCooldown ? 'rgba(255, 255, 255, 0.08)' : 'rgba(56, 189, 248, 0.35)');
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(btnX + 3, btnY + 3, btnSize - 6, btnSize - 6);

      if (!isUnlocked) {
        // Biểu tượng Khóa nếu chưa nâng cấp tại Cổ Viện
        this.ctx.fillStyle = '#64748b';
        this.ctx.font = 'bold 26px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('🔒', btnX + btnSize / 2, btnY + 34);

        this.ctx.fillStyle = '#ef4444';
        this.ctx.font = 'bold 10px "Segoe UI", sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('KHÓA', btnX + btnSize / 2, btnY + 50);
      } else {
        // Biểu tượng icon kỹ năng (Tia sét ma pháp)
        this.ctx.fillStyle = isOnCooldown ? '#64748b' : '#38bdf8';
        this.ctx.font = 'bold 26px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('⚡', btnX + btnSize / 2, btnY + 34);

        // Nhãn "(Trống)"
        this.ctx.fillStyle = isOnCooldown ? '#64748b' : '#94a3b8';
        this.ctx.font = 'italic 11px "Segoe UI", sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('(Trống)', btnX + btnSize / 2, btnY + 50);

        // Phủ bóng Cooldown (nếu đang hồi chiêu)
        if (isOnCooldown) {
          const cdH = Math.round((btnSize - 6) * cdRatio);
          this.ctx.fillStyle = 'rgba(0, 0, 0, 0.70)';
          this.ctx.fillRect(btnX + 3, btnY + btnSize - 3 - cdH, btnSize - 6, cdH);

          // Số giây hồi chiêu còn lại
          this.ctx.fillStyle = '#fbbf24';
          this.ctx.font = 'bold 15px monospace';
          this.ctx.textAlign = 'center';
          this.ctx.fillText(`${skill.cooldown.toFixed(1)}s`, btnX + btnSize / 2, btnY + 44);
        }
      }

      // Huy hiệu phím tắt [G] ở góc trên phải
      const badgeW = 24;
      const badgeH = 18;
      const badgeX = btnX + btnSize - badgeW + 3;
      const badgeY = btnY - 5;
      this.ctx.fillStyle = !isUnlocked ? '#1e293b' : (isOnCooldown ? '#334155' : '#0284c7');
      this.ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
      this.ctx.strokeStyle = !isUnlocked ? '#334155' : (isOnCooldown ? '#64748b' : '#bae6fd');
      this.ctx.lineWidth = 1.2;
      this.ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);
      this.ctx.fillStyle = !isUnlocked ? '#64748b' : '#ffffff';
      this.ctx.font = 'bold 11px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('G', badgeX + badgeW / 2, badgeY + 13);

      // Nhãn chữ nhỏ phía dưới nút
      this.ctx.fillStyle = !isUnlocked ? '#64748b' : (isOnCooldown ? '#94a3b8' : '#cbd5e1');
      this.ctx.font = 'bold 11px "Segoe UI", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(isUnlocked ? 'KỸ NĂNG [G]' : '🔒 CỔ VIỆN', btnX + btnSize / 2, btnY + btnSize + 16);
    }

    this.ctx.restore();
  }

  renderLevelUpModal() {
    this.ctx.save();

    this.ctx.fillStyle = 'rgba(5, 8, 15, 0.88)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = '#ffd166';
    this.ctx.font = 'bold 56px "Segoe UI", serif';
    this.ctx.textAlign = 'center';
    this.ctx.shadowColor = '#d4af37';
    this.ctx.shadowBlur = 24;
    const titleText = (this.pendingLevelUps > 0)
      ? `LÊN CẤP! (LEVEL UP) - CÒN +${this.pendingLevelUps} LẦN`
      : 'LÊN CẤP! (LEVEL UP)';
    this.ctx.fillText(titleText, this.canvas.width / 2, 115);
    this.ctx.shadowBlur = 0;

    this.ctx.fillStyle = this.isBanishModeActive ? '#f87171' : '#f8fafc';
    this.ctx.font = 'bold 22px "Nunito", "Be Vietnam Pro", "Segoe UI", Arial, sans-serif';
    let subtitleText = 'Chọn 1 trong 3 nâng cấp bên dưới để cường hóa sức mạnh:';
    if (this.isBanishModeActive) {
      subtitleText = '⚠️ CHẾ ĐỘ LOẠI BỎ ĐANG BẬT: BẤM VÀO 1 THẺ ĐỂ LOẠI BỎ VĨNH VIỄN KHỎI TRẬN ĐẤU!';
    } else if (this.pendingLevelUps > 0) {
      subtitleText = `⭐ Bạn lên nhiều cấp cùng lúc! Sau lượt này còn +${this.pendingLevelUps} lần chọn nâng cấp tiếp theo:`;
    }
    this.ctx.fillText(subtitleText, this.canvas.width / 2, 155);

    this.choiceCardsRects = [];
    const totalAvailableW = this.canvas.width - 120;
    const cardW = Math.min(540, Math.floor((totalAvailableW - 60) / 3));
    const cardH = 550;
    const gap = 30;
    const startX = (this.canvas.width - (cardW * 3 + gap * 2)) / 2;
    const cardY = 185;

    for (let i = 0; i < this.currentChoices.length; i++) {
      const c = this.currentChoices[i];
      const cx = startX + i * (cardW + gap);

      this.choiceCardsRects.push({ x: cx, y: cardY, w: cardW, h: cardH });

      // Nền thẻ bài
      this.ctx.fillStyle = this.isBanishModeActive ? 'rgba(38, 18, 24, 0.96)' : 'rgba(20, 28, 44, 0.95)';
      this.ctx.fillRect(cx, cardY, cardW, cardH);
      this.ctx.strokeStyle = this.isBanishModeActive ? '#ef4444' : '#d4af37';
      this.ctx.lineWidth = 2.5;
      this.ctx.strokeRect(cx, cardY, cardW, cardH);

      // KHUNG VẼ ICON PIXEL ART 64x64
      const iconSize = 64;
      const iconX = cx + cardW / 2 - iconSize / 2;
      const iconY = cardY + 28;

      this.ctx.fillStyle = 'rgba(10, 15, 25, 0.9)';
      this.ctx.fillRect(iconX, iconY, iconSize, iconSize);
      this.ctx.strokeStyle = this.isBanishModeActive ? '#f87171' : '#ffd166';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(iconX, iconY, iconSize, iconSize);

      if (c.icon) {
        const iconImg = getIconImage(c.icon);
        if (iconImg && iconImg.complete) {
          this.ctx.drawImage(iconImg, iconX + 6, iconY + 6, iconSize - 12, iconSize - 12);
        }
      }

      // Tên nâng cấp
      this.ctx.fillStyle = this.isBanishModeActive ? '#fca5a5' : '#ffea79';
      this.ctx.font = 'bold 26px "Nunito", "Be Vietnam Pro", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(c.name, cx + cardW / 2, cardY + 130);

      // Đường kẻ trang trí
      this.ctx.strokeStyle = this.isBanishModeActive ? '#7f1d1d' : '#3a4d6b';
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.moveTo(cx + 35, cardY + 152);
      this.ctx.lineTo(cx + cardW - 35, cardY + 152);
      this.ctx.stroke();

      // Mô tả chi tiết (Trắng sáng, đậm nét, dễ đọc trên nền tối)
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 20px "Nunito", "Be Vietnam Pro", sans-serif';
      this.ctx.textAlign = 'left';

      const words = c.desc.split(' ');
      let line = '';
      let textY = cardY + 195;
      for (const w of words) {
        const testLine = line + w + ' ';
        if (this.ctx.measureText(testLine).width > cardW - 70) {
          this.ctx.fillText(line, cx + 35, textY);
          line = w + ' ';
          textY += 32;
        } else {
          line = testLine;
        }
      }
      this.ctx.fillText(line, cx + 35, textY);

      // Nút [LỰA CHỌN] hoặc [LOẠI BỎ]
      const selectBtnW = Math.min(340, cardW - 60);
      const selectBtnH = 56;
      const selectBtnX = cx + cardW / 2 - selectBtnW / 2;
      const selectBtnY = cardY + cardH - 82;

      this.ctx.fillStyle = this.isBanishModeActive ? '#7f1d1d' : '#2d6a4f';
      this.ctx.fillRect(selectBtnX, selectBtnY, selectBtnW, selectBtnH);
      this.ctx.strokeStyle = this.isBanishModeActive ? '#f87171' : '#52b788';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(selectBtnX, selectBtnY, selectBtnW, selectBtnH);

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 22px "Nunito", "Be Vietnam Pro", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(this.isBanishModeActive ? '🚫 LOẠI BỎ KHỎI TRẬN' : 'LỰA CHỌN', cx + cardW / 2, selectBtnY + 36);
    }

    // --- CÁC NÚT ĐỔI LẠI (REROLL) VÀ LOẠI BỎ (BANISH) ---
    const bottomBtnY = cardY + cardH + 24;
    const btnW = Math.min(420, Math.floor((this.canvas.width - 160) / 2));
    const btnH = 58;
    const totalW = btnW * 2 + 30;
    const rerollX = this.canvas.width / 2 - totalW / 2;
    const banishX = rerollX + btnW + 30;

    // Nút Reroll
    this.rerollBtnRect = { x: rerollX, y: bottomBtnY, w: btnW, h: btnH };
    const canReroll = (this.rerollCount || 0) > 0;
    this.ctx.fillStyle = canReroll ? '#0369a1' : '#1e293b';
    this.ctx.fillRect(rerollX, bottomBtnY, btnW, btnH);
    this.ctx.strokeStyle = canReroll ? '#38bdf8' : '#475569';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(rerollX, bottomBtnY, btnW, btnH);
    this.ctx.fillStyle = canReroll ? '#ffffff' : '#64748b';
    this.ctx.font = 'bold 21px "Nunito", "Be Vietnam Pro", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`🎲 ĐỔI LẠI (${this.rerollCount || 0} LẦN)`, rerollX + btnW / 2, bottomBtnY + 36);

    // Nút Banish
    this.banishBtnRect = { x: banishX, y: bottomBtnY, w: btnW, h: btnH };
    const canBanish = (this.banishCount || 0) > 0;
    this.ctx.fillStyle = this.isBanishModeActive ? '#991b1b' : (canBanish ? '#831843' : '#1e293b');
    this.ctx.fillRect(banishX, bottomBtnY, btnW, btnH);
    this.ctx.strokeStyle = this.isBanishModeActive ? '#fca5a5' : (canBanish ? '#f43f5e' : '#475569');
    this.ctx.lineWidth = this.isBanishModeActive ? 3 : 2;
    this.ctx.strokeRect(banishX, bottomBtnY, btnW, btnH);
    this.ctx.fillStyle = this.isBanishModeActive ? '#fef08a' : (canBanish ? '#ffffff' : '#64748b');
    this.ctx.font = 'bold 21px "Nunito", "Be Vietnam Pro", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
      this.isBanishModeActive
        ? `🚫 HỦY CHỌN LOẠI BỎ`
        : `🚫 LOẠI BỎ (${this.banishCount || 0} LẦN)`,
      banishX + btnW / 2,
      bottomBtnY + 34
    );

    this.ctx.restore();
  }

  renderEvolutionModal() {
    this.ctx.save();

    // Lấy thông tin về công thức hợp thể sắp diễn ra hoặc vừa diễn ra
    if (!this.upgradeManager.pendingEvolutionPlan) {
      this.upgradeManager.checkEvolutionReadiness();
    }
    const plan = this.upgradeManager.pendingEvolutionPlan;
    const evoInfo = this.upgradeManager.lastEvolutionInfo || (plan ? {
      name: plan.recipe.name,
      title: plan.recipe.title,
      desc: plan.recipe.desc,
      ingredient1: plan.w1.name,
      ingredient2: plan.w2.name
    } : {
      name: '⭐ BÃO KIẾM HUYỀN BƯỚM ⭐',
      title: 'HỢP NHẤT: BÃO KIẾM HUYỀN BƯỚM',
      desc: 'Tăng +120% Sát thương toàn bộ vũ khí, giảm -35% hồi chiêu, và phát nổ kiếm ánh sáng ma thuật quét sạch bản đồ!',
      ingredient1: 'Vũ Khí Phụ 1',
      ingredient2: 'Vũ Khí Phụ 2'
    });

    this.ctx.fillStyle = 'rgba(10, 6, 18, 0.94)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const panelW = 900;
    const panelH = 540;
    const panelX = this.canvas.width / 2 - panelW / 2;
    const panelY = this.canvas.height / 2 - panelH / 2;

    // Nền bảng ma thuật huyền bí
    this.ctx.fillStyle = 'rgba(25, 16, 38, 0.98)';
    this.ctx.fillRect(panelX, panelY, panelW, panelH);
    this.ctx.strokeStyle = '#ffd700';
    this.ctx.lineWidth = 3.5;
    this.ctx.strokeRect(panelX, panelY, panelW, panelH);

    // Tiêu đề
    this.ctx.fillStyle = '#ffd700';
    this.ctx.font = 'bold 38px "Nunito", "Be Vietnam Pro", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.shadowColor = '#eab308';
    this.ctx.shadowBlur = 16;
    this.ctx.fillText('⚡ TIẾN HÓA VŨ KHÍ TỐI THƯỢNG ⚡', this.canvas.width / 2, panelY + 68);
    this.ctx.shadowBlur = 0;

    // Phụ đề
    this.ctx.fillStyle = '#e2e8f0';
    this.ctx.font = 'bold 16px "Nunito", "Be Vietnam Pro", sans-serif';
    this.ctx.fillText('Đã thu thập Lõi Tiến Hóa từ 2 Vũ Khí Phụ đạt Max Cấp 7!', this.canvas.width / 2, panelY + 104);

    // Box hiển thị công thức hợp thể
    const boxW = panelW - 80;
    const boxH = 90;
    const boxX = panelX + 40;
    const boxY = panelY + 124;

    this.ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    this.ctx.fillRect(boxX, boxY, boxW, boxH);
    this.ctx.strokeStyle = '#6366f1';
    this.ctx.lineWidth = 2.0;
    this.ctx.strokeRect(boxX, boxY, boxW, boxH);

    this.ctx.fillStyle = '#94a3b8';
    this.ctx.font = 'bold 14px "Nunito", "Be Vietnam Pro", sans-serif';
    this.ctx.fillText('NGUYÊN LIỆU HỢP NHẤT (DUNG HỢP):', this.canvas.width / 2, boxY + 28);

    this.ctx.fillStyle = '#38bdf8';
    this.ctx.font = 'bold 18px "Nunito", "Be Vietnam Pro", sans-serif';
    this.ctx.fillText(`⚔️ ${evoInfo.ingredient1 || 'Vũ Khí 1'} (Max Lv.7)   ➕   ⚔️ ${evoInfo.ingredient2 || 'Vũ Khí 2'} (Max Lv.7)`, this.canvas.width / 2, boxY + 62);

    // Tên Vũ Khí Tối Thượng
    this.ctx.fillStyle = '#fde047';
    this.ctx.font = 'bold 28px "Nunito", "Be Vietnam Pro", sans-serif';
    this.ctx.shadowColor = '#f59e0b';
    this.ctx.shadowBlur = 14;
    this.ctx.fillText(evoInfo.name, this.canvas.width / 2, panelY + 258);
    this.ctx.shadowBlur = 0;

    // Chú thích giải phóng slot
    this.ctx.fillStyle = '#4ade80';
    this.ctx.font = 'bold 15px "Nunito", "Be Vietnam Pro", sans-serif';
    this.ctx.fillText('✨ Dung hợp 2 vũ khí thành 1 siêu vũ khí & GIẢI PHÓNG 1 Ô TẤN CÔNG MỚI!', this.canvas.width / 2, panelY + 292);

    this.ctx.fillStyle = '#94a3b8';
    this.ctx.font = 'italic 14px "Nunito", "Be Vietnam Pro", sans-serif';
    this.ctx.fillText('🛡️ Vũ khí chính độc nhất của nhân vật được bảo toàn vĩnh viễn (không bị tiêu hao).', this.canvas.width / 2, panelY + 316);

    // Mô tả chi tiết sức mạnh
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '16px "Nunito", "Be Vietnam Pro", sans-serif';

    // Tự ngắt dòng mô tả
    const words = (evoInfo.desc || '').split(' ');
    let line1 = '';
    let line2 = '';
    for (let i = 0; i < words.length; i++) {
      if (line1.length < 52) {
        line1 += (line1 ? ' ' : '') + words[i];
      } else {
        line2 += (line2 ? ' ' : '') + words[i];
      }
    }
    this.ctx.fillText(line1, this.canvas.width / 2, panelY + 360);
    if (line2) {
      this.ctx.fillText(line2, this.canvas.width / 2, panelY + 386);
    }

    // Nút Bấm Kích Hoạt
    const b = this.evolutionBtnRect;
    b.w = 380;
    b.h = 60;
    b.x = this.canvas.width / 2 - b.w / 2;
    b.y = panelY + panelH - 85;

    this.ctx.fillStyle = '#d97706';
    this.ctx.fillRect(b.x, b.y, b.w, b.h);
    this.ctx.strokeStyle = '#fde047';
    this.ctx.lineWidth = 2.5;
    this.ctx.strokeRect(b.x, b.y, b.w, b.h);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 22px "Nunito", "Be Vietnam Pro", sans-serif';
    this.ctx.fillText('🔥 KÍCH HOẠT TIẾN HÓA 🔥', this.canvas.width / 2, b.y + 38);

    this.ctx.restore();
  }

  renderPauseMenu() {
    this.ctx.save();

    this.ctx.fillStyle = 'rgba(5, 8, 15, 0.90)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const panelW = 1820;
    const panelH = 1010;
    const panelX = 50;
    const panelY = 35;

    this.ctx.fillStyle = 'rgba(16, 24, 38, 0.98)';
    this.ctx.fillRect(panelX, panelY, panelW, panelH);
    this.ctx.strokeStyle = '#d4af37';
    this.ctx.lineWidth = 2.5;
    this.ctx.strokeRect(panelX, panelY, panelW, panelH);

    this.ctx.fillStyle = '#ffd166';
    this.ctx.font = 'bold 36px "Segoe UI", serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('ĐÃ TẠM DỪNG', this.canvas.width / 2, panelY + 44);

    this.ctx.fillStyle = '#b0c4de';
    this.ctx.font = '15px sans-serif';
    this.ctx.fillText('Nhấn phím [P] hoặc [ESC] để tiếp tục chơi', this.canvas.width / 2, panelY + 70);

    // Bảng Thông Số Chiến Đấu Nhân Vật (Combat Stats Box) - 4 Cột Rộng Rãi
    const statsBoxX = panelX + 30;
    const statsBoxY = panelY + 84;
    const statsBoxW = panelW - 60;
    const statsBoxH = 80;

    this.ctx.fillStyle = 'rgba(10, 16, 30, 0.85)';
    this.ctx.fillRect(statsBoxX, statsBoxY, statsBoxW, statsBoxH);
    this.ctx.strokeStyle = '#38bdf8';
    this.ctx.lineWidth = 1.5;
    this.ctx.strokeRect(statsBoxX, statsBoxY, statsBoxW, statsBoxH);

    this.ctx.font = 'bold 15px sans-serif';
    this.ctx.textAlign = 'left';

    // Cột 1: Máu & Giáp
    const col1X = statsBoxX + 40;
    this.ctx.fillStyle = '#f87171';
    this.ctx.fillText(`❤️ MÁU: ${Math.round(this.player.health)} / ${this.player.maxHealth}`, col1X, statsBoxY + 32);
    this.ctx.fillStyle = '#38bdf8';
    this.ctx.fillText(`🛡️ GIÁP: ${Math.round(this.player.armor)}`, col1X, statsBoxY + 62);

    // Cột 2: Phản Đòn & Tốc Độ
    const col2X = statsBoxX + 460;
    const refFlat = this.player.reflectFlat || 0;
    const refPct = Math.round((this.player.reflectPercent || 0) * 100);
    this.ctx.fillStyle = '#f43f5e';
    this.ctx.fillText(`⚔️ PHẢN ĐÒN: ${refFlat}${refPct > 0 ? ` (+${refPct}%)` : ''}`, col2X, statsBoxY + 32);
    this.ctx.fillStyle = '#4ade80';
    this.ctx.fillText(`👟 TỐC ĐỘ: ${Math.round(this.player.speed)}`, col2X, statsBoxY + 62);

    // Cột 3: Chí Mạng & Hồi Máu
    const col3X = statsBoxX + 890;
    this.ctx.fillStyle = '#facc15';
    const totalCritChance = this.player.critChance + (this.player.bookStats ? (this.player.bookStats.critChance || 0) : 0);
    const critPct = Math.round(totalCritChance * 100);
    let critTierNote = '';
    if (totalCritChance >= 2.0) {
      critTierNote = ` [🔥Crit x${Math.floor(totalCritChance)}]`;
    } else if (totalCritChance > 1.0) {
      critTierNote = ` [🔥Crit x2: ${Math.round((totalCritChance - 1) * 100)}%]`;
    }
    this.ctx.fillText(`💥 CHÍ MẠNG: ${critPct}% (x${this.player.critDamage.toFixed(1)})${critTierNote}`, col3X, statsBoxY + 32);
    this.ctx.fillStyle = '#c084fc';
    this.ctx.fillText(`🌿 HỒI MÁU: +${Math.round(this.player.masteryRegen || 0)}/s`, col3X, statsBoxY + 62);

    // Cột 4: Sát Thương Vũ Khí & Giảm Hồi Chiêu
    const col4X = statsBoxX + 1330;
    const bonusDmg = Math.round(((this.player.bookStats ? (this.player.bookStats.dmgMult || 0) : 0) + (this.player.bonusDmgMult || 0)) * 100);
    this.ctx.fillStyle = '#fb923c';
    this.ctx.fillText(`🔥 SÁT THƯƠNG: +${bonusDmg}%`, col4X, statsBoxY + 32);
    const cdReduction = Math.round((this.player.bookStats ? (this.player.bookStats.cooldownReduction || 0) : 0) * 100);
    this.ctx.fillStyle = '#a78bfa';
    this.ctx.fillText(`⏳ HỒI CHIÊU: -${cdReduction}%`, col4X, statsBoxY + 62);

    // --- KỆ SÁCH TRI THỨC ĐANG TRANG BỊ ---
    this.pauseBookButtons = [];
    const bookSecY = statsBoxY + statsBoxH + 16;
    const maxBookSlots = this.bookSystem ? this.bookSystem.maxSlots : 3;
    const activeBooks = this.bookSystem ? this.bookSystem.activeBooks : [];

    this.ctx.fillStyle = '#fde047';
    this.ctx.font = 'bold 18px "Segoe UI", sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`📚 KỆ SÁCH ĐANG TRANG BỊ (${activeBooks.length}/${maxBookSlots} Sách)`, statsBoxX, bookSecY + 16);

    const achExp = this.achievementSystem ? this.achievementSystem.getTotalExpPercent() : 0;
    if (achExp > 0) {
      this.ctx.fillStyle = '#38bdf8';
      this.ctx.font = 'bold 16px "Segoe UI", sans-serif';
      this.ctx.textAlign = 'right';
      this.ctx.fillText(`🏆 BUFF THÀNH TỰU: +${achExp}% EXP VĨNH VIỄN`, statsBoxX + statsBoxW, bookSecY + 16);
      this.ctx.textAlign = 'left';
    }

    const cardW = 340;
    const cardH = 500;
    const gap = 24;
    const totalW = maxBookSlots * cardW + (maxBookSlots - 1) * gap;
    const startBX = panelX + (panelW - totalW) / 2;
    const booksStartY = bookSecY + 28;

    for (let i = 0; i < maxBookSlots; i++) {
      const bX = startBX + i * (cardW + gap);
      const book = activeBooks[i];

      if (book) {
        const p = this.bookSystem.progress[book.id];
        const isReady = p && p.readyToEvolve;
        const isPaused = p && p.paused;

        this.ctx.fillStyle = 'rgba(25, 30, 42, 0.9)';
        this.ctx.fillRect(bX, booksStartY, cardW, cardH);
        this.ctx.strokeStyle = isReady ? '#eab308' : '#3a4a62';
        this.ctx.lineWidth = isReady ? 2.5 : 1.5;
        this.ctx.strokeRect(bX, booksStartY, cardW, cardH);

        // Vẽ thẻ sách dọc (Portrait) tỷ lệ chuẩn 1 : 1.4 to rõ ràng
        const bookCardW = 160;
        const bookCardH = 224;
        const bookCardX = bX + Math.round((cardW - bookCardW) / 2);
        const bookCardY = booksStartY + 14;
        this.bookSystem.renderBookCard(this.ctx, book.id, bookCardX, bookCardY, bookCardW, bookCardH, isReady);

        // Tác giả
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 15px "Segoe UI", sans-serif';
        this.ctx.textAlign = 'center';
        const author = book.def ? book.def.author : '';
        this.ctx.fillText(`✍️ ${author}`, bX + cardW / 2, booksStartY + 266);

        // Mô tả buff (Tự ngắt dòng word-wrap đầy đủ không bị co chữ)
        this.ctx.fillStyle = '#fde047';
        this.ctx.font = '13.5px "Segoe UI", sans-serif';
        const buffDesc = book.def ? (book.def.desc || book.def.buffDesc || '') : '';
        const words = buffDesc.split(' ');
        let bLine = '✨ ';
        let bDescY = booksStartY + 295;
        for (const w of words) {
          const test = bLine + w + ' ';
          if (this.ctx.measureText(test).width > cardW - 36) {
            this.ctx.fillText(bLine, bX + cardW / 2, bDescY);
            bLine = w + ' ';
            bDescY += 20;
          } else {
            bLine = test;
          }
        }
        if (bLine.trim()) {
          this.ctx.fillText(bLine, bX + cardW / 2, bDescY);
        }

        // Nút bấm: Vứt Bỏ & Tiến Hóa
        const btnH = 38;
        const btnY = booksStartY + cardH - 52;
        const discardW = (isReady || isPaused) ? 120 : 180;
        const discardX = (isReady || isPaused) ? (bX + 24) : (bX + (cardW - discardW) / 2);

        // Nút Vứt bỏ
        this.ctx.fillStyle = '#991b1b';
        this.ctx.fillRect(discardX, btnY, discardW, btnH);
        this.ctx.strokeStyle = '#ef4444';
        this.ctx.lineWidth = 1.5;
        this.ctx.strokeRect(discardX, btnY, discardW, btnH);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 13px "Segoe UI", sans-serif';
        this.ctx.fillText('🗑️ VỨT BỎ', discardX + discardW / 2, btnY + 24);
        this.pauseBookButtons.push({ x: discardX, y: btnY, w: discardW, h: btnH, action: 'discard', bookId: book.id });

        // Nút Tiến Hóa nếu sẵn sàng
        if (isReady || isPaused) {
          const evW = 140;
          const evX = bX + cardW - evW - 24;
          this.ctx.fillStyle = '#854d0e';
          this.ctx.fillRect(evX, btnY, evW, btnH);
          this.ctx.strokeStyle = '#eab308';
          this.ctx.lineWidth = 1.5;
          this.ctx.strokeRect(evX, btnY, evW, btnH);
          this.ctx.fillStyle = '#fef08a';
          this.ctx.font = 'bold 13px "Segoe UI", sans-serif';
          this.ctx.fillText('⚡ TIẾN HÓA', evX + evW / 2, btnY + 24);
          this.pauseBookButtons.push({ x: evX, y: btnY, w: evW, h: btnH, action: 'evolve', bookId: book.id });
        }
      } else {
        // Ô sách trống
        this.ctx.fillStyle = 'rgba(15, 20, 28, 0.65)';
        this.ctx.fillRect(bX, booksStartY, cardW, cardH);
        this.ctx.strokeStyle = '#2b3648';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(bX, booksStartY, cardW, cardH);

        this.ctx.fillStyle = '#94a3b8';
        this.ctx.font = '36px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('📖', bX + cardW / 2, booksStartY + cardH / 2 - 24);

        this.ctx.fillStyle = '#94a3b8';
        this.ctx.font = 'italic 16px "Segoe UI", sans-serif';
        this.ctx.fillText('Ô Sách Còn Trống', bX + cardW / 2, booksStartY + cardH / 2 + 16);

        this.ctx.fillStyle = '#64748b';
        this.ctx.font = '13px "Segoe UI", sans-serif';
        this.ctx.fillText('Tiêu diệt quái để nhặt sách mới', bX + cardW / 2, booksStartY + cardH / 2 + 42);
      }
    }

    // Phím tắt Debug Test
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = '#ff88aa';
    this.ctx.font = '13px monospace';
    this.ctx.fillText('Phím [1]: Sinh Tử Thần  |  Phím [2]: Sinh Gokucho  |  Phím [6]: Thức Tỉnh Witch  |  Phím [4]: Nhận 20 XP', this.canvas.width / 2, panelY + 750);
    this.ctx.fillStyle = '#4ade80';
    this.ctx.fillText('⏩ Phím [7]: Tua +60s  |  ⏩ Phím [8]: Nhảy tới Boss tiếp theo  |  ⏩ Phím [9]: Tua +3 phút', this.canvas.width / 2, panelY + 774);

    // Cập nhật vị trí các nút trong pauseActions (4 Nút: Tiếp tục | Cài đặt | Lưu & Thoát | Thoát & Tổng kết)
    const p = this.pauseActions;
    const btnH = 56;
    const btnY = panelY + 810;
    const btnGap = 20;

    const w1 = 260; // Tiếp tục
    const w2 = 230; // Cài đặt
    const w3 = 240; // Lưu & Thoát
    const w4 = 260; // Thoát & Tổng Kết
    const totalBtnW = w1 + w2 + w3 + w4 + btnGap * 3;
    const startX = Math.round(this.canvas.width / 2 - totalBtnW / 2);

    p.resume.x = startX;
    p.resume.y = btnY;
    p.resume.w = w1;
    p.resume.h = btnH;

    p.settings = p.settings || {};
    p.settings.x = startX + w1 + btnGap;
    p.settings.y = btnY;
    p.settings.w = w2;
    p.settings.h = btnH;

    p.saveExit.x = startX + w1 + btnGap + w2 + btnGap;
    p.saveExit.y = btnY;
    p.saveExit.w = w3;
    p.saveExit.h = btnH;

    p.exitFinish.x = startX + w1 + btnGap + w2 + btnGap + w3 + btnGap;
    p.exitFinish.y = btnY;
    p.exitFinish.w = w4;
    p.exitFinish.h = btnH;

    // 1. Nút Tiếp Tục Chơi
    this.ctx.fillStyle = '#2d6a4f';
    this.ctx.fillRect(p.resume.x, p.resume.y, p.resume.w, p.resume.h);
    this.ctx.strokeStyle = '#52b788';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(p.resume.x, p.resume.y, p.resume.w, p.resume.h);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 20px sans-serif';
    this.ctx.fillText('▶ TIẾP TỤC CHƠI', p.resume.x + p.resume.w / 2, p.resume.y + 36);

    // 2. Nút Cài Đặt (Setting)
    this.ctx.fillStyle = '#581c87';
    this.ctx.fillRect(p.settings.x, p.settings.y, p.settings.w, p.settings.h);
    this.ctx.strokeStyle = '#c084fc';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(p.settings.x, p.settings.y, p.settings.w, p.settings.h);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 19px sans-serif';
    this.ctx.fillText('⚙️ CÀI ĐẶT', p.settings.x + p.settings.w / 2, p.settings.y + 36);

    // 3. Nút Lưu & Thoát
    this.ctx.fillStyle = '#1e3a8a';
    this.ctx.fillRect(p.saveExit.x, p.saveExit.y, p.saveExit.w, p.saveExit.h);
    this.ctx.strokeStyle = '#60a5fa';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(p.saveExit.x, p.saveExit.y, p.saveExit.w, p.saveExit.h);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 18px sans-serif';
    this.ctx.fillText('💾 LƯU & THOÁT', p.saveExit.x + p.saveExit.w / 2, p.saveExit.y + 35);

    // 4. Nút Thoát & Tổng Kết
    this.ctx.fillStyle = '#991b1b';
    this.ctx.fillRect(p.exitFinish.x, p.exitFinish.y, p.exitFinish.w, p.exitFinish.h);
    this.ctx.strokeStyle = '#f87171';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(p.exitFinish.x, p.exitFinish.y, p.exitFinish.w, p.exitFinish.h);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 18px sans-serif';
    this.ctx.fillText('🚪 THOÁT & TỔNG KẾT', p.exitFinish.x + p.exitFinish.w / 2, p.exitFinish.y + 35);

    // Chú thích gợi ý
    this.ctx.fillStyle = '#94a3b8';
    this.ctx.font = 'italic 15px sans-serif';
    this.ctx.fillText('💡 Có thể bấm "Vứt Bỏ" để giải phóng ô sách, hoặc "Tiến Hóa" để nâng cấp sách ngay trong trận.', this.canvas.width / 2, panelY + 910);

    // Nếu đang mở Bảng Cài Đặt (Setting Modal)
    if (this.isSettingOpen) {
      this.renderSettingModal();
    }

    this.ctx.restore();
  }

  // =========================================================================
  // BẢNG CÀI ĐẶT HỆ THỐNG & ĐIỀU CHỈNH ÂM LƯỢNG (SETTING MODAL)
  // =========================================================================
  renderSettingModal() {
    this.ctx.save();

    // Lớp phủ đen ma thuật mờ nền
    this.ctx.fillStyle = 'rgba(4, 6, 12, 0.88)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const modalW = 820;
    const modalH = 490;
    const modalX = Math.round((this.canvas.width - modalW) / 2);
    const modalY = Math.round((this.canvas.height - modalH) / 2);
    this.settingModalRect = { x: modalX, y: modalY, w: modalW, h: modalH };

    // Khung bảng hoàng gia viền vàng
    this.ctx.fillStyle = 'rgba(15, 20, 32, 0.98)';
    this.ctx.fillRect(modalX, modalY, modalW, modalH);
    this.ctx.strokeStyle = '#ffd700';
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(modalX, modalY, modalW, modalH);

    // Tiêu đề
    this.ctx.fillStyle = '#ffd166';
    this.ctx.font = 'bold 34px "Segoe UI", serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('⚙️ CÀI ĐẶT HỆ THỐNG', this.canvas.width / 2, modalY + 54);

    this.ctx.fillStyle = '#94a3b8';
    this.ctx.font = '15px "Segoe UI", sans-serif';
    this.ctx.fillText('Điều chỉnh âm lượng nhạc nền và các thiết lập trong trò chơi', this.canvas.width / 2, modalY + 84);

    // Kẻ viền ngăn cách
    this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.25)';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.moveTo(modalX + 50, modalY + 104);
    this.ctx.lineTo(modalX + modalW - 50, modalY + 104);
    this.ctx.stroke();

    // 1. KHU VỰC ĐIỀU CHỈNH ÂM LƯỢNG
    const volSecY = modalY + 130;
    const currentVol = this.audioManager ? this.audioManager.volume : 0.5;
    const isMuted = this.audioManager ? this.audioManager.isMuted : false;
    const volPercent = isMuted ? 0 : Math.round(currentVol * 100);

    this.ctx.textAlign = 'left';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 18px "Segoe UI", sans-serif';
    this.ctx.fillText('🎵 ÂM LƯỢNG NHẠC NỀN (BGM):', modalX + 60, volSecY + 22);

    this.ctx.textAlign = 'right';
    this.ctx.fillStyle = isMuted ? '#f87171' : '#38bdf8';
    this.ctx.font = 'bold 20px monospace';
    this.ctx.fillText(isMuted ? '🔇 ĐÃ TẮT TIẾNG' : `🔊 ${volPercent}%`, modalX + modalW - 60, volSecY + 22);

    // Thanh Slider Volume Bar (Nhấp vào vị trí bất kỳ để set volume)
    const barX = modalX + 60;
    const barY = volSecY + 45;
    const barW = modalW - 120;
    const barH = 30;
    this.volBarRect = { x: barX, y: barY, w: barW, h: barH };

    // Nền thanh trượt
    this.ctx.fillStyle = '#0f172a';
    this.ctx.fillRect(barX, barY, barW, barH);
    this.ctx.strokeStyle = '#334155';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(barX, barY, barW, barH);

    // Phần trăm đã đổ màu
    const fillRatio = isMuted ? 0 : currentVol;
    const fillW = Math.round(barW * fillRatio);
    if (fillW > 0) {
      const grad = this.ctx.createLinearGradient(barX, barY, barX + fillW, barY);
      grad.addColorStop(0, '#0284c7');
      grad.addColorStop(1, '#38bdf8');
      this.ctx.fillStyle = grad;
      this.ctx.fillRect(barX + 2, barY + 2, fillW - 4, barH - 4);
    }

    // Nút trượt tròn
    const knobX = barX + Math.round(barW * fillRatio);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(knobX, barY + barH / 2, 10, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.strokeStyle = '#38bdf8';
    this.ctx.lineWidth = 2.5;
    this.ctx.stroke();

    // 3 Nút Bấm: [-10%] | [+10%] | [BẬT/TẮT TIẾNG]
    const btnSecY = barY + barH + 24;
    const actBtnH = 46;

    // Nút Giảm [-10%]
    const minusW = 160;
    const minusX = barX;
    this.ctx.fillStyle = '#1e293b';
    this.ctx.fillRect(minusX, btnSecY, minusW, actBtnH);
    this.ctx.strokeStyle = '#475569';
    this.ctx.lineWidth = 1.5;
    this.ctx.strokeRect(minusX, btnSecY, minusW, actBtnH);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 16px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('🔉 GIẢM (-10%)', minusX + minusW / 2, btnSecY + 28);
    this.volMinusBtn = { x: minusX, y: btnSecY, w: minusW, h: actBtnH };

    // Nút Tăng [+10%]
    const plusW = 160;
    const plusX = minusX + minusW + 20;
    this.ctx.fillStyle = '#1e293b';
    this.ctx.fillRect(plusX, btnSecY, plusW, actBtnH);
    this.ctx.strokeStyle = '#475569';
    this.ctx.lineWidth = 1.5;
    this.ctx.strokeRect(plusX, btnSecY, plusW, actBtnH);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 16px sans-serif';
    this.ctx.fillText('🔊 TĂNG (+10%)', plusX + plusW / 2, btnSecY + 28);
    this.volPlusBtn = { x: plusX, y: btnSecY, w: plusW, h: actBtnH };

    // Nút Bật/Tắt Tiếng
    const muteW = 180;
    const muteX = modalX + modalW - 60 - muteW;
    this.ctx.fillStyle = isMuted ? '#7f1d1d' : '#854d0e';
    this.ctx.fillRect(muteX, btnSecY, muteW, actBtnH);
    this.ctx.strokeStyle = isMuted ? '#f87171' : '#f59e0b';
    this.ctx.lineWidth = 1.5;
    this.ctx.strokeRect(muteX, btnSecY, muteW, actBtnH);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 15px sans-serif';
    this.ctx.fillText(isMuted ? '🔊 BẬT TIẾNG' : '🔇 TẮT TIẾNG', muteX + muteW / 2, btnSecY + 28);
    this.volMuteBtn = { x: muteX, y: btnSecY, w: muteW, h: actBtnH };

    // 2. KHU VỰC THÔNG TIN BÀI HÁT ĐANG PHÁT
    const infoSecY = btnSecY + actBtnH + 30;
    this.ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
    this.ctx.fillRect(barX, infoSecY, barW, 64);
    this.ctx.strokeStyle = '#334155';
    this.ctx.lineWidth = 1.2;
    this.ctx.strokeRect(barX, infoSecY, barW, 64);

    this.ctx.textAlign = 'left';
    this.ctx.fillStyle = '#cbd5e1';
    this.ctx.font = '13px "Segoe UI", sans-serif';
    this.ctx.fillText('🎶 Bài Hát Đang Phát:', barX + 18, infoSecY + 24);

    const trackTitle = this.audioManager ? this.audioManager.getCurrentTrackTitle() : 'BADDY BADDY';
    this.ctx.fillStyle = '#ffd166';
    this.ctx.font = 'bold 15px "Segoe UI", sans-serif';
    this.ctx.fillText(trackTitle, barX + 18, infoSecY + 48);

    // 3. NÚT ĐÓNG BẢNG CÀI ĐẶT
    const closeBtnW = 200;
    const closeBtnH = 48;
    const closeBtnX = modalX + modalW / 2 - closeBtnW / 2;
    const closeBtnY = modalY + modalH - 66;

    this.ctx.fillStyle = '#334155';
    this.ctx.fillRect(closeBtnX, closeBtnY, closeBtnW, closeBtnH);
    this.ctx.strokeStyle = '#64748b';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(closeBtnX, closeBtnY, closeBtnW, closeBtnH);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 16px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('✖ ĐÓNG (ESC)', closeBtnX + closeBtnW / 2, closeBtnY + 30);
    this.settingCloseBtn = { x: closeBtnX, y: closeBtnY, w: closeBtnW, h: closeBtnH };

    this.ctx.restore();
  }

  renderMainMenu() {
    this.ctx.save();

    // Tự động duy trì nhạc nền Main Menu (ngẫu nhiên 3 bài trong folder Piano/bgm)
    if (this.audioManager && this.audioManager.currentTrack !== 'menu') {
      this.audioManager.playMenuMusic();
    }

    // Nền tối ma thuật huyền bí
    const bgGrad = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    bgGrad.addColorStop(0, '#0a0d18');
    bgGrad.addColorStop(0.5, '#121a2c');
    bgGrad.addColorStop(1, '#060810');
    this.ctx.fillStyle = bgGrad;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Hiệu ứng ánh trăng & sương mù
    this.ctx.fillStyle = 'rgba(255, 230, 160, 0.04)';
    this.ctx.beginPath();
    this.ctx.arc(this.canvas.width / 2, -100, 500, 0, Math.PI * 2);
    this.ctx.fill();

    // Nút Bật/Tắt Toàn Màn Hình ở góc trên phải
    const fsBtnW = 220;
    const fsBtnH = 48;
    const fsBtnX = this.canvas.width - fsBtnW - 35;
    const fsBtnY = 30;
    this.ctx.fillStyle = 'rgba(25, 35, 55, 0.85)';
    this.ctx.fillRect(fsBtnX, fsBtnY, fsBtnW, fsBtnH);
    this.ctx.strokeStyle = '#60a5fa';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(fsBtnX, fsBtnY, fsBtnW, fsBtnH);
    this.ctx.fillStyle = '#93c5fd';
    this.ctx.font = 'bold 16px "Nunito", "Segoe UI", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('⛶ Toàn Màn Hình (F)', fsBtnX + fsBtnW / 2, fsBtnY + 30);
    this.menuButtons.push({ x: fsBtnX, y: fsBtnY, w: fsBtnW, h: fsBtnH, id: 'toggle_fullscreen' });

    // Tiêu đề Game hoành tráng (Cỡ lớn, phông Nunito cao cấp)
    this.ctx.fillStyle = '#ffd166';
    this.ctx.font = 'bold 96px "Nunito", "Be Vietnam Pro", serif';
    this.ctx.textAlign = 'center';
    this.ctx.shadowColor = '#d4af37';
    this.ctx.shadowBlur = 40;
    this.ctx.fillText('WITCH ESCAPE', this.canvas.width / 2, 210);

    this.ctx.shadowBlur = 0;
    this.ctx.fillStyle = '#ff70a6';
    this.ctx.font = 'bold 30px "Nunito", "Be Vietnam Pro", sans-serif';
    this.ctx.fillText('— Chạy Thoát Khỏi Hòn Đảo Phù Thủy —', this.canvas.width / 2, 272);

    // Thống kê Vàng và Kỷ lục (Dãn rộng vừa vặn màn hình kéo ra)
    const goldPanelW = Math.min(1050, Math.round(this.canvas.width * 0.52));
    const goldPanelH = 72;
    const goldPanelX = this.canvas.width / 2 - goldPanelW / 2;
    const goldPanelY = 312;
    this.ctx.fillStyle = 'rgba(20, 30, 48, 0.90)';
    this.ctx.fillRect(goldPanelX, goldPanelY, goldPanelW, goldPanelH);
    this.ctx.strokeStyle = '#d4af37';
    this.ctx.lineWidth = 2.5;
    this.ctx.strokeRect(goldPanelX, goldPanelY, goldPanelW, goldPanelH);

    this.ctx.fillStyle = '#ffd700';
    this.ctx.font = 'bold 30px "Nunito", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`💰 Tiền Vàng: ${this.meta.gold}    |    🏆 Kỷ Lục: ${this.meta.highScore.toLocaleString()}`, this.canvas.width / 2, goldPanelY + 46);

    // Các Nút Menu Chính (Dãn rộng thanh thoát, phông chữ lớn rõ nét)
    const savedInfo = this.getSavedGameInfo();
    const btnW = Math.min(740, Math.round(this.canvas.width * 0.42));
    const btnH = 56;
    const btnX = this.canvas.width / 2 - btnW / 2;

    const buttons = [];
    if (savedInfo) {
      const minutes = Math.floor(savedInfo.gameTime / 60);
      const seconds = Math.floor(savedInfo.gameTime % 60);
      const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      buttons.push({
        id: 'resume_saved_game',
        label: `▶️ TIẾP TỤC (Cấp ${savedInfo.level} - ⏱️ ${timeStr})`,
        y: 400,
        color: '#1d4ed8',
        border: '#60a5fa'
      });
      buttons.push({ id: 'start_game', label: '⚔️ BẮT ĐẦU CHƠI MỚI', y: 466, color: '#2d6a4f', border: '#52b788' });
      buttons.push({ id: 'open_skill_tree', label: '✨ CÂY KỸ NĂNG & THÔNG THẠO', y: 532, color: '#581c87', border: '#c084fc' });
      buttons.push({ id: 'open_shop', label: '🏪 NÂNG CẤP VĨNH VIỄN', y: 598, color: '#854d0e', border: '#eab308' });
      buttons.push({ id: 'open_codex', label: '📖 THƯ VIỆN TÁC PHẨM', y: 664, color: '#451a03', border: '#d4af37' });
      buttons.push({ id: 'open_achievements', label: '🏆 THÀNH TỰU & DANH HIỆU', y: 730, color: '#0f766e', border: '#2dd4bf' });
      buttons.push({ id: 'open_settings', label: '⚙️ CÀI ĐẶT HỆ THỐNG', y: 796, color: '#334155', border: '#64748b' });
      buttons.push({ id: 'how_to_play', label: '📜 HƯỚNG DẪN & ĐIỀU KHIỂN', y: 862, color: '#1e293b', border: '#475569' });
    } else {
      buttons.push({ id: 'start_game', label: '⚔️ BẮT ĐẦU CHƠI', y: 405, color: '#2d6a4f', border: '#52b788' });
      buttons.push({ id: 'open_skill_tree', label: '✨ CÂY KỸ NĂNG & THÔNG THẠO', y: 471, color: '#581c87', border: '#c084fc' });
      buttons.push({ id: 'open_shop', label: '🏪 NÂNG CẤP VĨNH VIỄN', y: 537, color: '#854d0e', border: '#eab308' });
      buttons.push({ id: 'open_codex', label: '📖 THƯ VIỆN TÁC PHẨM', y: 603, color: '#451a03', border: '#d4af37' });
      buttons.push({ id: 'open_achievements', label: '🏆 THÀNH TỰU & DANH HIỆU', y: 669, color: '#0f766e', border: '#2dd4bf' });
      buttons.push({ id: 'open_settings', label: '⚙️ CÀI ĐẶT HỆ THỐNG', y: 735, color: '#334155', border: '#64748b' });
      buttons.push({ id: 'how_to_play', label: '📜 HƯỚNG DẪN & ĐIỀU KHIỂN', y: 801, color: '#1e293b', border: '#475569' });
    }

    for (const b of buttons) {
      this.ctx.fillStyle = b.color;
      this.ctx.fillRect(btnX, b.y, btnW, btnH);
      this.ctx.strokeStyle = b.border;
      this.ctx.lineWidth = 2.5;
      this.ctx.strokeRect(btnX, b.y, btnW, btnH);

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 23px "Nunito", "Be Vietnam Pro", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(b.label, this.canvas.width / 2, b.y + 36);

      this.menuButtons.push({ x: btnX, y: b.y, w: btnW, h: btnH, id: b.id });
    }

    this.ctx.fillStyle = '#64748b';
    this.ctx.font = '16px monospace';
    this.ctx.fillText('Phiên bản v2.0 - Giai đoạn 5 Hoàn Thiện (1080p Full HD)', this.canvas.width / 2, this.canvas.height - 45);

    // Nếu đang mở bảng Cài Đặt (Setting Modal) trên Main Menu
    if (this.isSettingOpen) {
      this.renderSettingModal();
    }

    this.ctx.restore();
  }

  // MÀN HÌNH CHỌN NHÂN VẬT (1080p Full HD Responsive)
  renderCharSelect() {
    this.ctx.save();
    this.menuButtons = [];

    this.ctx.fillStyle = '#080b12';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Tiêu đề
    this.ctx.fillStyle = '#ffd166';
    this.ctx.font = 'bold 50px "Nunito", "Be Vietnam Pro", serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('CHỌN ANH HÙNG XUẤT TRẬN', this.canvas.width / 2, 75);

    this.ctx.fillStyle = '#cbd5e1';
    this.ctx.font = 'bold 18px "Nunito", "Be Vietnam Pro", sans-serif';
    this.ctx.fillText('Mỗi nhân vật sở hữu thuộc tính khởi đầu, phong cách chiến đấu và cây kỹ năng thiên phú độc nhất:', this.canvas.width / 2, 115);

    // Bố cục 3 thẻ nhân vật trải rộng toàn màn hình
    const availableW = this.canvas.width - 120;
    const gap = 36;
    const cardW = Math.min(540, Math.floor((availableW - 2 * gap) / 3));
    const cardH = 690;
    const startX = Math.round((this.canvas.width - (cardW * CONFIG.CHARACTERS.length + gap * (CONFIG.CHARACTERS.length - 1))) / 2);
    const cardY = 148;

    for (let i = 0; i < CONFIG.CHARACTERS.length; i++) {
      const char = CONFIG.CHARACTERS[i];
      const cx = startX + i * (cardW + gap);
      const isSelected = this.selectedChar.id === char.id;

      // Nền thẻ nhân vật
      this.ctx.fillStyle = isSelected ? 'rgba(25, 38, 64, 0.96)' : 'rgba(15, 23, 42, 0.90)';
      this.ctx.fillRect(cx, cardY, cardW, cardH);
      this.ctx.strokeStyle = isSelected ? '#ffd166' : '#334155';
      this.ctx.lineWidth = isSelected ? 3.5 : 1.8;
      this.ctx.strokeRect(cx, cardY, cardW, cardH);

      // 1. Tên nhân vật & Danh hiệu (ĐẶT TRÊN CÙNG, HOÀN TOÀN KHÔNG BỊ NÚT NÀO ĐÈ LÊN)
      this.ctx.fillStyle = isSelected ? '#ffd166' : '#f8fafc';
      this.ctx.font = 'bold 28px "Nunito", "Be Vietnam Pro", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(char.name, cx + cardW / 2, cardY + 46);

      this.ctx.fillStyle = '#94a3b8';
      this.ctx.font = 'italic 17px "Nunito", "Be Vietnam Pro", sans-serif';
      this.ctx.fillText(char.title, cx + cardW / 2, cardY + 76);

      // Đường kẻ ngăn cách mảnh tinh tế
      this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.2)';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(cx + 35, cardY + 92);
      this.ctx.lineTo(cx + cardW - 35, cardY + 92);
      this.ctx.stroke();

      // 2. KHU VỰC AVATAR LỚN (150x150) & NÚT CÂY KỸ NĂNG TÁCH BIỆT BÊN PHẢI
      const avatarSize = 150;
      const avatarX = cx + 45;
      const avatarY = cardY + 105;

      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      this.ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
      this.ctx.strokeStyle = isSelected ? '#ffd166' : '#475569';
      this.ctx.lineWidth = isSelected ? 2 : 1.2;
      this.ctx.strokeRect(avatarX, avatarY, avatarSize, avatarSize);

      const charImg = getIconImage(char.sprite);
      if (charImg && charImg.complete) {
        this.ctx.imageSmoothingEnabled = true;
        if (char.spriteSheet) {
          const fw = Math.floor(charImg.naturalWidth / char.spriteSheet.cols);
          const fh = Math.floor(charImg.naturalHeight / char.spriteSheet.rows);
          this.ctx.drawImage(charImg, 0, 0, fw, fh, avatarX + 15, avatarY + 15, 120, 120);
        } else {
          const natW = charImg.naturalWidth || 1;
          const natH = charImg.naturalHeight || 1;
          const maxAvW = 130;
          const maxAvH = 135;
          let drawW = maxAvW;
          let drawH = drawW * (natH / natW);
          if (drawH > maxAvH) {
            drawH = maxAvH;
            drawW = drawH * (natW / natH);
          }
          const drawX = avatarX + (avatarSize - drawW) / 2;
          const drawY = avatarY + (avatarSize - drawH) / 2;
          this.ctx.drawImage(charImg, drawX, drawY, drawW, drawH);
        }
      }

      // Nút mở nhanh Cây Kỹ Năng đặt bên cạnh Avatar to rõ, độc lập
      const treeBtnW = 185;
      const treeBtnH = 46;
      const treeBtnX = cx + cardW - treeBtnW - 45;
      const treeBtnY = avatarY + 38;

      this.ctx.fillStyle = '#4c1d95';
      this.ctx.fillRect(treeBtnX, treeBtnY, treeBtnW, treeBtnH);
      this.ctx.strokeStyle = '#c084fc';
      this.ctx.lineWidth = 1.8;
      this.ctx.strokeRect(treeBtnX, treeBtnY, treeBtnW, treeBtnH);

      this.ctx.fillStyle = '#f3e8ff';
      this.ctx.font = 'bold 16px "Nunito", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('🌲 CÂY KỸ NĂNG', treeBtnX + treeBtnW / 2, treeBtnY + 29);

      this.ctx.fillStyle = '#c084fc';
      this.ctx.font = 'bold 13px "Nunito", sans-serif';
      this.ctx.fillText('Thiên phú nhánh', treeBtnX + treeBtnW / 2, treeBtnY + 64);

      this.menuButtons.push({ x: treeBtnX, y: treeBtnY, w: treeBtnW, h: treeBtnH, id: `open_char_skill_tree_${char.id}` });

      // 3. BẢNG CHỈ SỐ CƠ BẢN TO RÕ
      const panelX = cx + 30;
      const panelY = cardY + 276;
      const panelW = cardW - 60;
      const panelH = 90;

      this.ctx.fillStyle = 'rgba(10, 15, 28, 0.75)';
      this.ctx.fillRect(panelX, panelY, panelW, panelH);
      this.ctx.strokeStyle = '#1e293b';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(panelX, panelY, panelW, panelH);

      this.ctx.font = 'bold 16px "Nunito", "Be Vietnam Pro", sans-serif';
      this.ctx.textAlign = 'left';

      // Hàng 1
      this.ctx.fillStyle = '#f43f5e';
      this.ctx.fillText(`❤️ Máu: ${char.maxHealth}`, panelX + 20, panelY + 32);

      this.ctx.fillStyle = '#38bdf8';
      this.ctx.fillText(`👟 Tốc độ: ${char.baseSpeed}`, panelX + panelW / 2 + 10, panelY + 32);

      // Hàng 2
      this.ctx.fillStyle = '#fbbf24';
      this.ctx.fillText(`💥 Crit: ${(char.critChance * 100).toFixed(0)}%`, panelX + 20, panelY + 68);

      this.ctx.fillStyle = '#60a5fa';
      this.ctx.fillText(`🛡️ Giáp: ${char.baseArmor || 0}  |  ⚡ Né: ${(char.dodgeRate * 100).toFixed(0)}%`, panelX + panelW / 2 + 10, panelY + 68);

      // 4. CẤP THÔNG THẠO & ĐIỂM SCORE
      const mPanelX = cx + 30;
      const mPanelY = cardY + 380;
      const mPanelW = cardW - 60;
      const mPanelH = 46;

      this.ctx.fillStyle = 'rgba(10, 15, 28, 0.85)';
      this.ctx.fillRect(mPanelX, mPanelY, mPanelW, mPanelH);
      this.ctx.strokeStyle = '#334155';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(mPanelX, mPanelY, mPanelW, mPanelH);

      const mastery = this.masterySystem.getCharData(char.id);
      this.ctx.fillStyle = '#fbbf24';
      this.ctx.font = 'bold 16px "Nunito", sans-serif';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(`⭐ Thông Thạo: Cấp ${mastery.level}/100`, mPanelX + 16, mPanelY + 29);

      this.ctx.fillStyle = '#c084fc';
      this.ctx.textAlign = 'right';
      this.ctx.fillText(`🔮 Điểm Score: ${mastery.score.toLocaleString()}`, mPanelX + mPanelW - 16, mPanelY + 29);

      // 5. MÔ TẢ ĐẶC TÍNH CHIẾN ĐẤU
      this.ctx.fillStyle = '#cbd5e1';
      this.ctx.font = 'bold 15px "Nunito", "Be Vietnam Pro", sans-serif';
      this.ctx.textAlign = 'left';

      const words = char.desc.split(' ');
      let line = '';
      let descY = cardY + 452;
      for (const w of words) {
        const test = line + w + ' ';
        if (this.ctx.measureText(test).width > cardW - 70) {
          this.ctx.fillText(line, cx + 35, descY);
          line = w + ' ';
          descY += 24;
        } else {
          line = test;
        }
      }
      this.ctx.fillText(line, cx + 35, descY);

      // 6. NÚT CHỌN ANH HÙNG TO BẢN (FULL THẺ)
      const selectBtnW = cardW - 60;
      const selectBtnH = 56;
      const selectBtnX = cx + 30;
      const selectBtnY = cardY + cardH - 80;

      this.ctx.fillStyle = isSelected ? '#d4af37' : '#1e293b';
      this.ctx.fillRect(selectBtnX, selectBtnY, selectBtnW, selectBtnH);
      this.ctx.strokeStyle = isSelected ? '#fff0a6' : '#64748b';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(selectBtnX, selectBtnY, selectBtnW, selectBtnH);

      this.ctx.fillStyle = isSelected ? '#000000' : '#ffffff';
      this.ctx.font = 'bold 20px "Nunito", "Be Vietnam Pro", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(isSelected ? '✓ ĐÃ CHỌN' : 'CHỌN ANH HÙNG', selectBtnX + selectBtnW / 2, selectBtnY + 36);

      this.menuButtons.push({ x: cx, y: cardY, w: cardW, h: cardH, id: 'select_char_' + char.id, charData: char });
    }

    // Nút Tiếp tục (Sang Chọn Chế Độ Chơi) và Nút Quay lại
    const btnH = 58;
    const btnY = this.canvas.height - 86;

    // Back
    const backBtnW = 280;
    const backBtnX = this.canvas.width / 2 - 340;
    this.ctx.fillStyle = '#1e293b';
    this.ctx.fillRect(backBtnX, btnY, backBtnW, btnH);
    this.ctx.strokeStyle = '#64748b';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(backBtnX, btnY, backBtnW, btnH);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 20px "Nunito", "Be Vietnam Pro", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('⬅ QUAY LẠI', backBtnX + backBtnW / 2, btnY + 36);
    this.menuButtons.push({ x: backBtnX, y: btnY, w: backBtnW, h: btnH, id: 'back_to_menu' });

    // Next
    const nextBtnW = 360;
    const nextBtnX = this.canvas.width / 2 + 40;
    this.ctx.fillStyle = '#2d6a4f';
    this.ctx.fillRect(nextBtnX, btnY, nextBtnW, btnH);
    this.ctx.strokeStyle = '#52b788';
    this.ctx.lineWidth = 2.5;
    this.ctx.strokeRect(nextBtnX, btnY, nextBtnW, btnH);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 22px "Nunito", "Be Vietnam Pro", sans-serif';
    this.ctx.fillText('TIẾP TỤC ➔', nextBtnX + nextBtnW / 2, btnY + 37);
    this.menuButtons.push({ x: nextBtnX, y: btnY, w: nextBtnW, h: btnH, id: 'goto_mode_select' });

    this.ctx.restore();
  }

  // =========================================================================
  // MÀN HÌNH CHỌN CHẾ ĐỘ CHƠI (BÌNH THƯỜNG / VÔ TẬN)
  // =========================================================================
  renderModeSelect() {
    this.ctx.save();
    this.menuButtons = [];

    this.ctx.fillStyle = '#080b12';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Tiêu đề & Hướng dẫn
    this.ctx.fillStyle = '#ffd166';
    this.ctx.font = 'bold 50px "Nunito", "Be Vietnam Pro", serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('CHỌN CHẾ ĐỘ THỬ THÁCH', this.canvas.width / 2, 75);

    this.ctx.fillStyle = '#cbd5e1';
    this.ctx.font = 'bold 18px "Nunito", "Be Vietnam Pro", sans-serif';
    this.ctx.fillText('Lựa chọn chiến dịch sinh tồn 20 phút cốt truyện hoặc thử thách sinh tồn vô tận không giới hạn thời gian:', this.canvas.width / 2, 115);

    // Bố cục 2 thẻ chế độ trải rộng Full HD
    const availableW = this.canvas.width - 160;
    const gap = 50;
    const cardW = Math.min(800, Math.floor((availableW - gap) / 2));
    const cardH = 690;
    const startX = Math.round((this.canvas.width - (cardW * 2 + gap)) / 2);
    const cardY = 148;

    for (let i = 0; i < CONFIG.MODES.length; i++) {
      const mode = CONFIG.MODES[i];
      const cx = startX + i * (cardW + gap);
      const isSelected = this.selectedMode.id === mode.id;
      const isNormal = mode.id === 'normal';

      const themeColor = isNormal ? '#38bdf8' : '#f97316';
      const badgeText = isNormal ? '🛡️ CHIẾN DỊCH CHUẨN' : '🔥 VÔ TẬN KHÔNG GIỚI HẠN';
      const subTitle = isNormal
        ? 'Chế độ kinh điển với lộ trình xuất hiện Boss và bão quái theo thời gian thực cố định'
        : 'Thử thách sinh tồn khắc nghiệt cho cựu binh. Sức mạnh quái vật và Boss tăng tiến vô hạn';

      // Nền thẻ chế độ
      this.ctx.fillStyle = isSelected ? 'rgba(25, 38, 64, 0.96)' : 'rgba(15, 23, 42, 0.90)';
      this.ctx.fillRect(cx, cardY, cardW, cardH);
      this.ctx.strokeStyle = isSelected ? themeColor : '#334155';
      this.ctx.lineWidth = isSelected ? 3.5 : 1.8;
      this.ctx.strokeRect(cx, cardY, cardW, cardH);

      // Thanh viền sáng trang trí ở đỉnh thẻ
      this.ctx.fillStyle = themeColor;
      this.ctx.fillRect(cx, cardY, cardW, 4);

      // 1. Huy hiệu chế độ
      const badgeW = 280;
      const badgeH = 34;
      const badgeX = cx + cardW / 2 - badgeW / 2;
      const badgeY = cardY + 22;

      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      this.ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
      this.ctx.strokeStyle = themeColor;
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

      this.ctx.fillStyle = themeColor;
      this.ctx.font = 'bold 15px "Nunito", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(badgeText, badgeX + badgeW / 2, badgeY + 22);

      // 2. Tên chế độ lớn
      this.ctx.fillStyle = themeColor;
      this.ctx.font = 'bold 34px "Nunito", "Be Vietnam Pro", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(mode.name, cx + cardW / 2, cardY + 92);

      // 3. Mô tả ngắn
      this.ctx.fillStyle = '#94a3b8';
      this.ctx.font = '15px "Nunito", "Be Vietnam Pro", sans-serif';
      this.ctx.fillText(subTitle, cx + cardW / 2, cardY + 125);

      // Đường kẻ phân cách
      this.ctx.strokeStyle = '#1e293b';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(cx + 36, cardY + 145);
      this.ctx.lineTo(cx + cardW - 36, cardY + 145);
      this.ctx.stroke();

      // 4. Khối danh sách lộ trình / đặc tính
      const boxX = cx + 32;
      const boxY = cardY + 160;
      const boxW = cardW - 64;
      const boxH = 415;

      this.ctx.fillStyle = 'rgba(10, 15, 28, 0.82)';
      this.ctx.fillRect(boxX, boxY, boxW, boxH);
      this.ctx.strokeStyle = '#1e293b';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(boxX, boxY, boxW, boxH);

      // Tiêu đề khối
      this.ctx.fillStyle = '#64748b';
      this.ctx.font = 'bold 13px "Nunito", sans-serif';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(
        isNormal ? 'LỘ TRÌNH VÀ CÁC CỘT MỐC QUAN TRỌNG:' : 'QUY TẮC VÀ ĐẶC ĐIỂM CHẾ ĐỘ VÔ TẬN:',
        boxX + 20,
        boxY + 28
      );

      // Các hàng thông số / sự kiện
      const normalRows = [
        { icon: '⏳', label: 'Thời Lượng Trận Đấu:', desc: 'Tối đa 20 Phút sinh tồn khốc liệt', tag: '20 PHÚT', tagColor: '#38bdf8' },
        { icon: '💀', label: 'Phút 02:30:', desc: 'Mini Boss đầu tiên trỗi dậy (To x2.5, rơi Ngọc Hiếm)', tag: 'MINI BOSS', tagColor: '#fb923c' },
        { icon: '👹', label: 'Phút 10:00:', desc: 'Đại Ma Nữ Meruru giáng thế (2 Giai đoạn biến hình cực mạnh)', tag: 'MERURU', tagColor: '#c084fc' },
        { icon: '🔥', label: 'Phút 20:00:', desc: 'Chúa Tể Yuki xuất hiện (3 Giai đoạn, 7 Tuyệt kỹ hủy diệt)', tag: 'CHÚA TỂ YUKI', tagColor: '#f87171' },
        { icon: '🏆', label: 'Mục Tiêu Tối Thượng:', desc: 'Hạ gục Chúa Tể Yuki để GIÀNH CHIẾN THẮNG VẺ VANG!', tag: 'CHIẾN THẮNG', tagColor: '#4ade80' }
      ];

      const endlessRows = [
        { icon: '♾️', label: 'Thời Lượng Trận Đấu:', desc: 'KHÔNG GIỚI HẠN thời gian - Sinh tồn tới khi cạn kiệt HP', tag: 'VÔ TẬN', tagColor: '#f97316' },
        { icon: '🔄', label: 'Tới Phút 40:00:', desc: 'Lặp lại toàn bộ chu kỳ Boss Meruru & Yuki đợt 2 với chỉ số x2', tag: 'CHU KỲ 2', tagColor: '#facc15' },
        { icon: '🌊', label: 'Sau Phút 40:00:', desc: 'Biển quái dồn dập tràn ngập toàn bản đồ, mật độ cực hạn', tag: 'BIỂN QUÁI', tagColor: '#60a5fa' },
        { icon: '💰', label: 'Cơ Chế Cày Cuốc:', desc: 'Cày bội thu Tiền Vàng & Phá kỷ lục điểm số tối thượng', tag: 'FARM VÀNG', tagColor: '#fbbf24' },
        { icon: '⚠️', label: 'Cảnh Báo Sinh Tử:', desc: 'Quái vật tăng tiến vô hạn - Thách thức cực đại cho cựu binh!', tag: 'TỬ THẦN', tagColor: '#fb7185' }
      ];

      const rows = isNormal ? normalRows : endlessRows;
      const rowH = 64;
      const rowGap = 10;
      const rowStartY = boxY + 44;

      for (let r = 0; r < rows.length; r++) {
        const item = rows[r];
        const ry = rowStartY + r * (rowH + rowGap);
        const rx = boxX + 16;
        const rw = boxW - 32;

        // Nền dòng
        this.ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
        this.ctx.fillRect(rx, ry, rw, rowH);
        this.ctx.strokeStyle = isSelected ? 'rgba(51, 65, 85, 0.7)' : 'rgba(30, 41, 59, 0.6)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(rx, ry, rw, rowH);

        // Icon bên trái
        this.ctx.font = '26px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(item.icon, rx + 30, ry + 42);

        // Label & Desc
        this.ctx.textAlign = 'left';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 16px "Nunito", "Be Vietnam Pro", sans-serif';
        this.ctx.fillText(item.label, rx + 62, ry + 27);

        this.ctx.fillStyle = r === 4 ? item.tagColor : '#cbd5e1';
        this.ctx.font = (r === 4 ? 'bold ' : '') + '14px "Nunito", "Be Vietnam Pro", sans-serif';
        this.ctx.fillText(item.desc, rx + 62, ry + 50);

        // Badge góc phải
        const tagText = item.tag;
        this.ctx.font = 'bold 12px "Nunito", sans-serif';
        const tagW = Math.max(86, this.ctx.measureText(tagText).width + 18);
        const tagH = 26;
        const tagX = rx + rw - tagW - 14;
        const tagY = ry + (rowH - tagH) / 2;

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        this.ctx.fillRect(tagX, tagY, tagW, tagH);
        this.ctx.strokeStyle = item.tagColor;
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(tagX, tagY, tagW, tagH);

        this.ctx.fillStyle = item.tagColor;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(tagText, tagX + tagW / 2, tagY + 17);
      }

      // 5. Nút Lựa Chọn Chế Độ
      const selectBtnW = cardW - 64;
      const selectBtnH = 58;
      const selectBtnX = cx + 32;
      const selectBtnY = cardY + cardH - 85;

      this.ctx.fillStyle = isSelected ? themeColor : '#1e293b';
      this.ctx.fillRect(selectBtnX, selectBtnY, selectBtnW, selectBtnH);
      this.ctx.strokeStyle = isSelected ? '#ffffff' : '#475569';
      this.ctx.lineWidth = isSelected ? 2 : 1;
      this.ctx.strokeRect(selectBtnX, selectBtnY, selectBtnW, selectBtnH);

      this.ctx.fillStyle = isSelected ? '#000000' : '#ffffff';
      this.ctx.font = 'bold 20px "Nunito", "Be Vietnam Pro", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(isSelected ? '✓ ĐÃ CHỌN CHẾ ĐỘ NÀY' : 'CHỌN CHẾ ĐỘ NÀY', cx + cardW / 2, selectBtnY + 36);

      // Thẻ có thể click được
      this.menuButtons.push({ x: cx, y: cardY, w: cardW, h: cardH, id: 'select_mode_' + mode.id, modeData: mode });
    }

    // Nút Quay lại & Tiếp tục (Sang Chọn Thử Thách)
    const backBtnW = 280;
    const nextBtnW = 360;
    const actionBtnH = 58;
    const actionBtnY = this.canvas.height - 98;
    const backBtnX = this.canvas.width / 2 - backBtnW - 20;
    const nextBtnX = this.canvas.width / 2 + 20;

    // Back Button
    this.ctx.fillStyle = '#334155';
    this.ctx.fillRect(backBtnX, actionBtnY, backBtnW, actionBtnH);
    this.ctx.strokeStyle = '#64748b';
    this.ctx.lineWidth = 1.5;
    this.ctx.strokeRect(backBtnX, actionBtnY, backBtnW, actionBtnH);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 18px "Nunito", "Be Vietnam Pro", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('⬅ QUAY LẠI', backBtnX + backBtnW / 2, actionBtnY + 36);
    this.menuButtons.push({ x: backBtnX, y: actionBtnY, w: backBtnW, h: actionBtnH, id: 'back_to_char_select' });

    // Next Button
    this.ctx.fillStyle = '#16a34a';
    this.ctx.fillRect(nextBtnX, actionBtnY, nextBtnW, actionBtnH);
    this.ctx.strokeStyle = '#4ade80';
    this.ctx.lineWidth = 1.5;
    this.ctx.strokeRect(nextBtnX, actionBtnY, nextBtnW, actionBtnH);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText('TIẾP TỤC (THỬ THÁCH) ➔', nextBtnX + nextBtnW / 2, actionBtnY + 36);
    this.menuButtons.push({ x: nextBtnX, y: actionBtnY, w: nextBtnW, h: actionBtnH, id: 'goto_challenge_select' });

    this.ctx.restore();
  }

  // =========================================================================
  // MÀN HÌNH TÙY CHỌN THỬ THÁCH (1080p Full HD Responsive)
  // Bảng Checkbox tích chọn - Tăng Điểm & Vàng khi sống >= 2 phút
  // =========================================================================
  renderChallengeSelect() {
    this.ctx.save();

    this.ctx.fillStyle = '#0a0d18';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = '#ffd166';
    this.ctx.font = 'bold 52px "Nunito", "Be Vietnam Pro", serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('THỬ THÁCH BỔ SUNG (TÙY CHỌN)', this.canvas.width / 2, 72);

    this.ctx.fillStyle = '#cbd5e1';
    this.ctx.font = 'bold 18px "Nunito", "Be Vietnam Pro", sans-serif';
    this.ctx.fillText('Tích chọn các điều kiện khắc nghiệt để gia tăng độ khó và nhận thêm Điểm & Vàng thưởng:', this.canvas.width / 2, 112);

    // Tính tổng bonus hiện tại
    let totalScoreBonus = 0;
    let totalGoldBonus = 0;
    let checkedCount = 0;

    for (const ch of CONFIG.CHALLENGES) {
      if (this.selectedChallenges[ch.id]) {
        totalScoreBonus += ch.scoreBonus;
        totalGoldBonus += ch.goldBonus;
        checkedCount++;
      }
    }

    // Thanh hiển thị tổng Bonus
    const summaryBarW = Math.min(1150, Math.round(this.canvas.width * 0.55));
    const summaryBarH = 52;
    const summaryX = this.canvas.width / 2 - summaryBarW / 2;
    const summaryY = 132;

    this.ctx.fillStyle = 'rgba(25, 35, 55, 0.9)';
    this.ctx.fillRect(summaryX, summaryY, summaryBarW, summaryBarH);
    this.ctx.strokeStyle = checkedCount > 0 ? '#ffd700' : '#475569';
    this.ctx.lineWidth = 1.8;
    this.ctx.strokeRect(summaryX, summaryY, summaryBarW, summaryBarH);

    this.ctx.fillStyle = '#ffd700';
    this.ctx.font = 'bold 21px "Nunito", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
      `ĐÃ CHỌN: ${checkedCount}/${CONFIG.CHALLENGES.length} Thử Thách    |    ⭐ Thưởng Điểm: +${Math.round(totalScoreBonus * 100)}%    |    💰 Thưởng Vàng: +${Math.round(totalGoldBonus * 100)}%`,
      this.canvas.width / 2,
      summaryY + 33
    );

    // Chú thích chống farm bẩn
    this.ctx.fillStyle = '#f87171';
    this.ctx.font = 'italic 16px "Nunito", sans-serif';
    this.ctx.fillText('⚠️ Điều kiện nhận thưởng: Bạn phải sống sót ít nhất 2 phút (120 giây) trong trận mới được kích hoạt bonus thử thách!', this.canvas.width / 2, summaryY + 74);

    // Danh sách 11 Thử thách chia thành 2 cột cân xứng lấp đầy màn hình
    const availableW = this.canvas.width - 120;
    const colW = Math.min(1050, Math.floor((availableW - 30) / 2));
    const itemH = 88;
    const gapY = 10;
    const totalW = colW * 2 + 30;
    const leftX = Math.round((this.canvas.width - totalW) / 2);
    const startY = 224;

    for (let i = 0; i < CONFIG.CHALLENGES.length; i++) {
      const ch = CONFIG.CHALLENGES[i];
      const col = i % 2;
      const row = Math.floor(i / 2);

      const ix = leftX + col * (colW + 30);
      const iy = startY + row * (itemH + gapY);
      const isChecked = !!this.selectedChallenges[ch.id];

      // Nền ô thử thách
      this.ctx.fillStyle = isChecked ? 'rgba(30, 41, 65, 0.95)' : 'rgba(15, 23, 42, 0.85)';
      this.ctx.fillRect(ix, iy, colW, itemH);
      this.ctx.strokeStyle = isChecked ? '#ffd166' : '#334155';
      this.ctx.lineWidth = isChecked ? 2 : 1.2;
      this.ctx.strokeRect(ix, iy, colW, itemH);

      // Checkbox [✓] hoặc [ ]
      const boxSize = 34;
      const boxX = ix + 18;
      const boxY = iy + (itemH - boxSize) / 2;

      this.ctx.fillStyle = isChecked ? '#ffd700' : 'rgba(30, 40, 60, 0.9)';
      this.ctx.fillRect(boxX, boxY, boxSize, boxSize);
      this.ctx.strokeStyle = isChecked ? '#fff' : '#64748b';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(boxX, boxY, boxSize, boxSize);

      if (isChecked) {
        this.ctx.fillStyle = '#000000';
        this.ctx.font = 'bold 24px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('✓', boxX + boxSize / 2, boxY + 26);
      }

      // Tên Thử thách
      this.ctx.fillStyle = isChecked ? '#ffea79' : '#ffffff';
      this.ctx.font = 'bold 22px "Nunito", "Be Vietnam Pro", sans-serif';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(ch.name, boxX + boxSize + 16, iy + 34);

      // Mô tả ngắn (trắng sáng rõ nét)
      this.ctx.fillStyle = '#e2e8f0';
      this.ctx.font = 'bold 15px "Nunito", "Be Vietnam Pro", sans-serif';
      this.ctx.fillText(ch.desc, boxX + boxSize + 16, iy + 64);

      // Bonus hiển thị bên phải
      this.ctx.fillStyle = '#4ade80';
      this.ctx.font = 'bold 17px "Nunito", monospace';
      this.ctx.textAlign = 'right';
      this.ctx.fillText(`+${Math.round(ch.scoreBonus * 100)}% Điểm | +${Math.round(ch.goldBonus * 100)}% Vàng`, ix + colW - 20, iy + 49);

      this.menuButtons.push({ x: ix, y: iy, w: colW, h: itemH, id: 'toggle_challenge_' + ch.id });
    }

    // 2 Nút: Quay lại & Tiếp tục (Sang Chọn Độ Khó)
    const nextBtnW = Math.min(320, Math.round(this.canvas.width * 0.22));
    const nextBtnH = 58;
    const nextBtnX = this.canvas.width / 2 + 20;
    const backBtnX = this.canvas.width / 2 - nextBtnW - 20;
    const actionBtnY = this.canvas.height - 86;

    // Back
    this.ctx.fillStyle = '#334155';
    this.ctx.fillRect(backBtnX, actionBtnY, nextBtnW, nextBtnH);
    this.ctx.strokeStyle = '#64748b';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(backBtnX, actionBtnY, nextBtnW, nextBtnH);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 22px "Nunito", "Be Vietnam Pro", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('⬅ QUAY LẠI (CHẾ ĐỘ)', backBtnX + nextBtnW / 2, actionBtnY + 38);
    this.menuButtons.push({ x: backBtnX, y: actionBtnY, w: nextBtnW, h: nextBtnH, id: 'back_to_mode_select' });

    // Next
    this.ctx.fillStyle = '#15803d';
    this.ctx.fillRect(nextBtnX, actionBtnY, nextBtnW, nextBtnH);
    this.ctx.strokeStyle = '#4ade80';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(nextBtnX, actionBtnY, nextBtnW, nextBtnH);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 22px "Nunito", "Be Vietnam Pro", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('TIẾP TỤC (ĐỘ KHÓ) ➔', nextBtnX + nextBtnW / 2, actionBtnY + 38);
    this.menuButtons.push({ x: nextBtnX, y: actionBtnY, w: nextBtnW, h: nextBtnH, id: 'goto_diff_select' });

    this.ctx.restore();
  }

  // MÀN HÌNH CHỌN ĐỘ KHÓ (1080p Full HD Responsive)
  renderDiffSelect() {
    this.ctx.save();
    this.menuButtons = [];

    this.ctx.fillStyle = '#080b12';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Tiêu đề
    this.ctx.fillStyle = '#ffd166';
    this.ctx.font = 'bold 50px "Nunito", "Be Vietnam Pro", serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('CHỌN CẤP ĐỘ THỬ THÁCH', this.canvas.width / 2, 75);

    this.ctx.fillStyle = '#cbd5e1';
    this.ctx.font = 'bold 18px "Nunito", "Be Vietnam Pro", sans-serif';
    this.ctx.fillText('Độ khó càng cao, quái vật càng đông và hung hãn nhưng phần thưởng Vàng & Điểm số bội thu!', this.canvas.width / 2, 115);

    // Bố cục 3 thẻ độ khó trải rộng toàn màn hình
    const availableW = this.canvas.width - 120;
    const gap = 36;
    const cardW = Math.min(540, Math.floor((availableW - 2 * gap) / 3));
    const cardH = 690;
    const startX = Math.round((this.canvas.width - (cardW * CONFIG.DIFFICULTIES.length + gap * (CONFIG.DIFFICULTIES.length - 1))) / 2);
    const cardY = 148;

    for (let i = 0; i < CONFIG.DIFFICULTIES.length; i++) {
      const diff = CONFIG.DIFFICULTIES[i];
      const cx = startX + i * (cardW + gap);
      const isSelected = this.selectedDiff.id === diff.id;

      // Theme màu sắc & Huy hiệu theo độ khó
      let themeColor = diff.color;
      let badgeText = '🌱 CƠ BẢN (KHỞI ĐẦU)';
      let shortDesc = 'Dành cho người mới làm quen nhịp độ và tích lũy tiền vàng ban đầu.';
      if (diff.id === 'nightmare') {
        themeColor = '#f59e0b';
        badgeText = '🔥 THỬ THÁCH CAO';
        shortDesc = 'Quái đông hơn +62%, máu trâu hơn +40%. Đòi hỏi trang bị và di chuyển chuẩn xác.';
      } else if (diff.id === 'hell') {
        themeColor = '#ef4444';
        badgeText = '☠️ CỰC KỲ KHỐC LIỆT';
        shortDesc = 'Quái cực trâu x2 Máu, tốc độ nhanh khủng khiếp. Thách thức sinh tồn tột đỉnh!';
      }

      // Nền thẻ độ khó
      this.ctx.fillStyle = isSelected ? 'rgba(25, 38, 64, 0.96)' : 'rgba(15, 23, 42, 0.90)';
      this.ctx.fillRect(cx, cardY, cardW, cardH);
      this.ctx.strokeStyle = isSelected ? themeColor : '#334155';
      this.ctx.lineWidth = isSelected ? 3.5 : 1.8;
      this.ctx.strokeRect(cx, cardY, cardW, cardH);

      // 1. Huy hiệu độ khó
      const badgeW = 220;
      const badgeH = 34;
      const badgeX = cx + cardW / 2 - badgeW / 2;
      const badgeY = cardY + 22;

      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      this.ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
      this.ctx.strokeStyle = themeColor;
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

      this.ctx.fillStyle = themeColor;
      this.ctx.font = 'bold 14px "Nunito", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(badgeText, badgeX + badgeW / 2, badgeY + 22);

      // 2. Tên độ khó lớn
      this.ctx.fillStyle = themeColor;
      this.ctx.font = 'bold 34px "Nunito", "Be Vietnam Pro", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(diff.name, cx + cardW / 2, cardY + 92);

      // 3. Khối thông số quái vật
      const statBoxX = cx + 30;
      const statBoxY = cardY + 120;
      const statBoxW = cardW - 60;
      const statBoxH = 135;

      this.ctx.fillStyle = 'rgba(10, 15, 28, 0.8)';
      this.ctx.fillRect(statBoxX, statBoxY, statBoxW, statBoxH);
      this.ctx.strokeStyle = '#1e293b';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(statBoxX, statBoxY, statBoxW, statBoxH);

      this.ctx.font = 'bold 17px "Nunito", "Be Vietnam Pro", sans-serif';

      // Máu quái
      this.ctx.fillStyle = '#cbd5e1';
      this.ctx.textAlign = 'left';
      this.ctx.fillText('🩸 Máu Quái Vật:', statBoxX + 20, statBoxY + 36);
      this.ctx.fillStyle = isSelected ? '#ffffff' : '#f87171';
      this.ctx.textAlign = 'right';
      this.ctx.fillText(`x${diff.enemyHealthMult}`, statBoxX + statBoxW - 20, statBoxY + 36);

      // Tốc độ quái
      this.ctx.fillStyle = '#cbd5e1';
      this.ctx.textAlign = 'left';
      this.ctx.fillText('⚡ Tốc Độ Quái:', statBoxX + 20, statBoxY + 76);
      this.ctx.fillStyle = isSelected ? '#ffffff' : '#38bdf8';
      this.ctx.textAlign = 'right';
      this.ctx.fillText(`x${diff.enemySpeedMult}`, statBoxX + statBoxW - 20, statBoxY + 76);

      // Mật độ quái
      this.ctx.fillStyle = '#cbd5e1';
      this.ctx.textAlign = 'left';
      this.ctx.fillText('👥 Mật Độ Quái:', statBoxX + 20, statBoxY + 116);
      this.ctx.fillStyle = isSelected ? '#ffffff' : '#fbbf24';
      this.ctx.textAlign = 'right';
      this.ctx.fillText(`x${diff.spawnRateMult}`, statBoxX + statBoxW - 20, statBoxY + 116);

      // 4. Khối thưởng Vàng & Điểm nổi bật
      const rBoxX = cx + 30;
      const rBoxY = cardY + 272;
      const rBoxW = cardW - 60;
      const rBoxH = 100;

      this.ctx.fillStyle = isSelected ? 'rgba(245, 158, 11, 0.15)' : 'rgba(10, 15, 28, 0.85)';
      this.ctx.fillRect(rBoxX, rBoxY, rBoxW, rBoxH);
      this.ctx.strokeStyle = isSelected ? '#ffd700' : 'rgba(255, 215, 0, 0.25)';
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeRect(rBoxX, rBoxY, rBoxW, rBoxH);

      const scoreBonusPct = Math.round((diff.scoreMult - 1) * 100);
      const goldBonusPct = Math.round((diff.goldMult - 1) * 100);

      this.ctx.font = 'bold 18px "Nunito", "Be Vietnam Pro", sans-serif';
      this.ctx.fillStyle = '#ffd166';
      this.ctx.textAlign = 'left';
      this.ctx.fillText('⭐ Thưởng Điểm Số:', rBoxX + 20, rBoxY + 38);
      this.ctx.textAlign = 'right';
      this.ctx.fillText(scoreBonusPct > 0 ? `+${scoreBonusPct}% (x${diff.scoreMult})` : `+0% (x1.0)`, rBoxX + rBoxW - 20, rBoxY + 38);

      this.ctx.fillStyle = '#fde047';
      this.ctx.textAlign = 'left';
      this.ctx.fillText('💰 Thưởng Tiền Vàng:', rBoxX + 20, rBoxY + 76);
      this.ctx.textAlign = 'right';
      this.ctx.fillText(goldBonusPct > 0 ? `+${goldBonusPct}% (x${diff.goldMult})` : `+0% (x1.0)`, rBoxX + rBoxW - 20, rBoxY + 76);

      // 5. Mô tả tóm tắt rõ nét
      this.ctx.fillStyle = '#cbd5e1';
      this.ctx.font = 'bold 15px "Nunito", "Be Vietnam Pro", sans-serif';
      this.ctx.textAlign = 'left';

      const descWords = (shortDesc || diff.desc).split(' ');
      let dLine = '';
      let dCurY = cardY + 400;
      for (const w of descWords) {
        const test = dLine + w + ' ';
        if (this.ctx.measureText(test).width > cardW - 70) {
          this.ctx.fillText(dLine, cx + 35, dCurY);
          dLine = w + ' ';
          dCurY += 24;
        } else {
          dLine = test;
        }
      }
      this.ctx.fillText(dLine, cx + 35, dCurY);

      // 6. Nút Lựa chọn to bản
      const selectBtnW = cardW - 60;
      const selectBtnH = 56;
      const selectBtnX = cx + 30;
      const selectBtnY = cardY + cardH - 80;

      this.ctx.fillStyle = isSelected ? themeColor : '#1e293b';
      this.ctx.fillRect(selectBtnX, selectBtnY, selectBtnW, selectBtnH);
      this.ctx.strokeStyle = isSelected ? '#ffffff' : '#64748b';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(selectBtnX, selectBtnY, selectBtnW, selectBtnH);

      this.ctx.fillStyle = isSelected ? '#000000' : '#ffffff';
      this.ctx.font = 'bold 20px "Nunito", "Be Vietnam Pro", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(isSelected ? '✓ ĐÃ CHỌN' : 'CHỌN ĐỘ KHÓ', selectBtnX + selectBtnW / 2, selectBtnY + 36);

      this.menuButtons.push({ x: cx, y: cardY, w: cardW, h: cardH, id: 'select_diff_' + diff.id, diffData: diff });
    }

    // Các Nút Điều Hướng Dưới Cùng (Quay Lại / Tiếp Tục Chọn Sách)
    const btnH = 58;
    const btnY = this.canvas.height - 86;

    // Back
    const backBtnW = 280;
    const backBtnX = this.canvas.width / 2 - 350;
    this.ctx.fillStyle = '#1e293b';
    this.ctx.fillRect(backBtnX, btnY, backBtnW, btnH);
    this.ctx.strokeStyle = '#64748b';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(backBtnX, btnY, backBtnW, btnH);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 20px "Nunito", "Be Vietnam Pro", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('⬅ QUAY LẠI', backBtnX + backBtnW / 2, btnY + 36);
    this.menuButtons.push({ x: backBtnX, y: btnY, w: backBtnW, h: btnH, id: 'back_to_challenge_select' });

    // Chọn sách trước khi xuất trận
    const nextBtnW = 380;
    const nextBtnX = this.canvas.width / 2 + 30;
    this.ctx.fillStyle = '#b91c1c';
    this.ctx.fillRect(nextBtnX, btnY, nextBtnW, btnH);
    this.ctx.strokeStyle = '#ef4444';
    this.ctx.lineWidth = 2.5;
    this.ctx.strokeRect(nextBtnX, btnY, nextBtnW, btnH);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 22px "Nunito", "Be Vietnam Pro", sans-serif';
    this.ctx.fillText('📖 CHỌN SÁCH KHỞI ĐẦU ➔', nextBtnX + nextBtnW / 2, btnY + 37);
    this.menuButtons.push({ x: nextBtnX, y: btnY, w: nextBtnW, h: btnH, id: 'goto_book_select' });

    this.ctx.restore();
  }

  // MÀN HÌNH CỬA HÀNG NÂNG CẤP NGOÀI TRẬN BẰNG VÀNG (1080p Full HD Responsive)
  renderShop() {
    this.ctx.save();

    this.ctx.fillStyle = '#0a0d18';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Tiêu đề
    this.ctx.fillStyle = '#ffd166';
    this.ctx.font = 'bold 50px "Nunito", "Be Vietnam Pro", serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('CỔ VIỆN MA PHÁP (NÂNG CẤP VĨNH VIỄN)', this.canvas.width / 2, 68);

    const totalSpent = this.meta.getTotalSpent();
    const availableWidth = this.canvas.width - 120;
    const itemW = Math.min(1050, Math.floor((availableWidth - 30) / 2));
    const totalCardsW = itemW * 2 + 30;
    const col0X = Math.round((this.canvas.width - totalCardsW) / 2);
    const col1X = col0X + itemW + 30;
    const headerLeftX = col0X;
    const headerRightX = col1X + itemW;

    // Hiển thị số Tiền Vàng & Tổng đầu tư
    this.ctx.textAlign = 'left';
    this.ctx.fillStyle = '#ffd700';
    this.ctx.font = 'bold 28px "Nunito", monospace';
    this.ctx.fillText(`💰 Tiền Vàng: ${this.meta.gold.toLocaleString()} Vàng`, headerLeftX, 122);

    this.ctx.fillStyle = '#cbd5e1';
    this.ctx.font = 'bold 17px "Nunito", "Be Vietnam Pro", sans-serif';
    this.ctx.fillText(`(Đã đầu tư: ${totalSpent.toLocaleString()} Vàng vào các nâng cấp)`, headerLeftX + 380, 122);

    // Nút Nhận Vàng Test bên phải ngoài cùng
    const testGoldBtnW = 210;
    const testGoldBtnH = 44;
    const testGoldBtnX = headerRightX - testGoldBtnW;
    const testGoldBtnY = 92;
    this.ctx.fillStyle = '#4c1d95';
    this.ctx.fillRect(testGoldBtnX, testGoldBtnY, testGoldBtnW, testGoldBtnH);
    this.ctx.strokeStyle = '#a855f7';
    this.ctx.lineWidth = 1.8;
    this.ctx.strokeRect(testGoldBtnX, testGoldBtnY, testGoldBtnW, testGoldBtnH);
    this.ctx.fillStyle = '#fde047';
    this.ctx.font = 'bold 16px "Nunito", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('🎁 +1,000 VÀNG TEST', testGoldBtnX + testGoldBtnW / 2, testGoldBtnY + 28);
    this.menuButtons.push({ x: testGoldBtnX, y: testGoldBtnY, w: testGoldBtnW, h: testGoldBtnH, id: 'add_test_gold' });

    // Nút Tẩy Toàn Bộ & Hoàn Vàng 100%
    const resetAllBtnW = 340;
    const resetAllBtnH = 44;
    const resetAllBtnX = testGoldBtnX - resetAllBtnW - 14;
    const resetAllBtnY = 92;
    const hasSpent = totalSpent > 0;
    this.ctx.fillStyle = hasSpent ? '#831843' : '#1e293b';
    this.ctx.fillRect(resetAllBtnX, resetAllBtnY, resetAllBtnW, resetAllBtnH);
    this.ctx.strokeStyle = hasSpent ? '#f43f5e' : '#475569';
    this.ctx.lineWidth = 1.8;
    this.ctx.strokeRect(resetAllBtnX, resetAllBtnY, resetAllBtnW, resetAllBtnH);
    this.ctx.fillStyle = hasSpent ? '#ffffff' : '#64748b';
    this.ctx.font = 'bold 16px "Nunito", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(hasSpent ? `♻️ HOÀN VÀNG TẤT CẢ (+${totalSpent.toLocaleString()})` : '♻️ HOÀN VÀNG TẤT CẢ (0)', resetAllBtnX + resetAllBtnW / 2, resetAllBtnY + 28);
    if (hasSpent) {
      this.menuButtons.push({ x: resetAllBtnX, y: resetAllBtnY, w: resetAllBtnW, h: resetAllBtnH, id: 'reset_all_upgrades' });
    }

    // --- CÁC TAB PHÂN LOẠI (CHỈ GIỮ 3 DANH MỤC: NỘI TẠI / CHỈ SỐ / THỬ THÁCH, MẶC ĐỊNH LÀ NỘI TẠI) ---
    const activeFilter = (this.shopCategoryFilter === 'all' || !this.shopCategoryFilter) ? 'passive' : this.shopCategoryFilter;
    const tabs = [
      { id: 'passive', label: '🔮 NỘI TẠI & TÍNH NĂNG (6)' },
      { id: 'stats', label: '⚔️ CHỈ SỐ CƠ BẢN (12)' },
      { id: 'other', label: '☠️ THỬ THÁCH NGUYỀN RỦA (2)' }
    ];
    const tabW = Math.min(440, Math.floor((this.canvas.width - 160) / 3));
    const tabH = 48;
    const tabGap = 20;
    const totalTabsW = tabs.length * tabW + (tabs.length - 1) * tabGap;
    const tabStartX = this.canvas.width / 2 - totalTabsW / 2;
    const tabY = 146;

    for (let t = 0; t < tabs.length; t++) {
      const tab = tabs[t];
      const tx = tabStartX + t * (tabW + tabGap);
      const isTabActive = (activeFilter === tab.id);

      this.ctx.fillStyle = isTabActive ? 'rgba(30, 58, 138, 0.95)' : 'rgba(15, 23, 42, 0.85)';
      this.ctx.fillRect(tx, tabY, tabW, tabH);
      this.ctx.strokeStyle = isTabActive ? '#60a5fa' : '#334155';
      this.ctx.lineWidth = isTabActive ? 2.5 : 1.5;
      this.ctx.strokeRect(tx, tabY, tabW, tabH);

      this.ctx.fillStyle = isTabActive ? '#ffd166' : '#94a3b8';
      this.ctx.font = isTabActive ? 'bold 19px "Nunito", "Be Vietnam Pro", sans-serif' : 'bold 18px "Nunito", "Be Vietnam Pro", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(tab.label, tx + tabW / 2, tabY + 31);

      this.menuButtons.push({ x: tx, y: tabY, w: tabW, h: tabH, id: 'shop_tab_' + tab.id });
    }

    // Lọc danh sách nâng cấp theo Tab
    const allUpgrades = Object.values(this.meta.upgrades);
    const filteredUpgrades = allUpgrades.filter(u => u.category === activeFilter);

    // Bố trí 2 cột có tính cuộn màn hình (Scrollable)
    const itemH = 100;
    const itemGap = 12;
    const baseStartY = 208;
    const visibleTop = 195;
    const visibleBottom = this.canvas.height - 86;
    const viewHeight = visibleBottom - visibleTop;

    const totalRows = Math.ceil(filteredUpgrades.length / 2);
    const totalContentH = totalRows * (itemH + itemGap);
    const maxScroll = Math.max(0, totalContentH - viewHeight + 30);
    this.maxShopScrollY = maxScroll;
    const scrollY = Math.min(this.shopScrollY || 0, maxScroll);

    for (let i = 0; i < filteredUpgrades.length; i++) {
      const up = filteredUpgrades[i];
      const isMax = up.level >= up.maxLevel;
      const cost = this.meta.getCost(up.id);
      const canAfford = !isMax && (cost === 0 || this.meta.gold >= cost);

      const col = i % 2;
      const row = Math.floor(i / 2);
      const itemX = col === 0 ? col0X : col1X;
      const itemY = baseStartY + row * (itemH + itemGap) - scrollY;

      // Chỉ render và đăng ký tương tác nếu nằm trong vùng hiển thị
      if (itemY + itemH < visibleTop || itemY > visibleBottom) {
        continue;
      }

      this.ctx.fillStyle = 'rgba(20, 30, 48, 0.94)';
      this.ctx.fillRect(itemX, itemY, itemW, itemH);
      this.ctx.strokeStyle = '#3a4d6b';
      this.ctx.lineWidth = 1.8;
      this.ctx.strokeRect(itemX, itemY, itemW, itemH);

      // Icon nâng cấp
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '36px sans-serif';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(up.icon, itemX + 16, itemY + 60);

      // Tên nâng cấp (Rõ nét, cỡ lớn, phông Nunito cao cấp)
      this.ctx.font = 'bold 23px "Nunito", "Be Vietnam Pro", sans-serif';
      this.ctx.fillStyle = '#ffd166';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(up.name, itemX + 72, itemY + 36);

      // Nút Mua Nâng Cấp [+]
      const buyBtnW = 150;
      const buyBtnH = 48;
      const buyBtnX = itemX + itemW - buyBtnW - 14;
      const buyBtnY = itemY + (itemH - buyBtnH) / 2;

      const isZeroCost = (cost === 0);
      this.ctx.fillStyle = isMax ? '#334155' : (canAfford ? (isZeroCost ? '#15803d' : '#2d6a4f') : '#7f1d1d');
      this.ctx.fillRect(buyBtnX, buyBtnY, buyBtnW, buyBtnH);
      this.ctx.strokeStyle = isMax ? '#64748b' : (canAfford ? (isZeroCost ? '#4ade80' : '#52b788') : '#ef4444');
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeRect(buyBtnX, buyBtnY, buyBtnW, buyBtnH);

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 17px "Nunito", "Be Vietnam Pro", sans-serif';
      this.ctx.textAlign = 'center';
      if (isMax) {
        this.ctx.fillText('ĐÃ MAX', buyBtnX + buyBtnW / 2, buyBtnY + 30);
      } else if (isZeroCost) {
        this.ctx.fillText('MIỄN PHÍ (0)', buyBtnX + buyBtnW / 2, buyBtnY + 30);
      } else {
        this.ctx.fillText(`💰 ${cost.toLocaleString()}`, buyBtnX + buyBtnW / 2, buyBtnY + 30);
      }
      this.menuButtons.push({ x: buyBtnX, y: buyBtnY, w: buyBtnW, h: buyBtnH, id: 'buy_upgrade_' + up.id });

      // Nút Hoàn Trả 1 Cấp [-]
      const refBtnW = 48;
      const refBtnH = 48;
      const refBtnX = buyBtnX - refBtnW - 10;
      const refBtnY = buyBtnY;
      const canRefund = up.level > 0;

      this.ctx.fillStyle = canRefund ? '#7f1d1d' : 'rgba(30, 41, 59, 0.4)';
      this.ctx.fillRect(refBtnX, refBtnY, refBtnW, refBtnH);
      this.ctx.strokeStyle = canRefund ? '#f87171' : '#334155';
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeRect(refBtnX, refBtnY, refBtnW, refBtnH);

      this.ctx.fillStyle = canRefund ? '#fef08a' : '#475569';
      this.ctx.font = 'bold 22px "Nunito", monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('[-]', refBtnX + refBtnW / 2, refBtnY + 32);

      if (canRefund) {
        this.menuButtons.push({
          x: refBtnX,
          y: refBtnY,
          w: refBtnW,
          h: refBtnH,
          id: 'refund_upgrade_' + up.id
        });
      }

      // Vạch hiển thị cấp độ (Pips)
      const pipStartX = refBtnX - 16 - (up.maxLevel * 16);
      for (let p = 1; p <= up.maxLevel; p++) {
        this.ctx.fillStyle = p <= up.level ? '#ffd700' : '#334155';
        this.ctx.fillRect(pipStartX + p * 16, itemY + 39, 11, 22);
      }

      // Mô tả & Cấp độ (Chữ trắng sáng đậm nét rõ ràng không bị mờ)
      this.ctx.font = 'bold 16px "Nunito", "Be Vietnam Pro", sans-serif';
      this.ctx.fillStyle = '#ffffff';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(up.desc, itemX + 72, itemY + 70, pipStartX - itemX - 82);
    }

    // Nút Quay lại Menu Chính ở thanh dưới cùng
    const backBtnW = Math.min(460, Math.round(this.canvas.width * 0.35));
    const backBtnH = 56;
    const backBtnX = this.canvas.width / 2 - backBtnW / 2;
    const backBtnY = this.canvas.height - 74;

    this.ctx.fillStyle = '#1e293b';
    this.ctx.fillRect(backBtnX, backBtnY, backBtnW, backBtnH);
    this.ctx.strokeStyle = '#475569';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(backBtnX, backBtnY, backBtnW, backBtnH);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 22px "Nunito", "Be Vietnam Pro", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('⬅ QUAY VỀ MENU CHÍNH', backBtnX + backBtnW / 2, backBtnY + 36);
    this.menuButtons.push({ x: backBtnX, y: backBtnY, w: backBtnW, h: backBtnH, id: 'back_to_menu' });

    // Toast Notification trong Cổ Viện Shop
    if (this.shopToast && this.shopToast.timer > 0) {
      this.ctx.save();
      const toastAlpha = Math.min(1.0, this.shopToast.timer * 2.5);
      this.ctx.globalAlpha = toastAlpha;
      const tw = 720;
      const th = 46;
      const tx = (this.canvas.width - tw) / 2;
      const ty = 22;

      this.ctx.fillStyle = 'rgba(12, 9, 26, 0.96)';
      this.ctx.fillRect(tx, ty, tw, th);
      this.ctx.strokeStyle = this.shopToast.color;
      this.ctx.lineWidth = 2.5;
      this.ctx.strokeRect(tx, ty, tw, th);

      this.ctx.fillStyle = this.shopToast.color;
      this.ctx.font = 'bold 17px "Segoe UI", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(this.shopToast.text, tx + tw / 2, ty + 29);
      this.ctx.restore();
    }

    this.ctx.restore();
  }

  // =========================================================================
  // GIAO DIỆN CÂY KỸ NĂNG VÀ THÔNG THẠO NHÂN VẬT (CHARACTER MASTERY & SKILL TREE)
  // Cây kỹ năng 3 Tab chuyển đổi • Nút hình vuông 5 tầng • Cân bằng chỉ số 100 điểm
  // =========================================================================
  // =========================================================================
  // GIAO DIỆN CÂY KỸ NĂNG VÀ THÔNG THẠO NHÂN VẬT (CHARACTER MASTERY & SKILL TREE)
  // Nút hình vuông phóng to sắc nét • Cuộn kéo lên xuống 5 tầng • Font chuẩn Nunito/Be Vietnam Pro
  // =========================================================================
  renderSkillTree() {
    this.ctx.save();

    const FONT_FAMILY = '"Nunito", "Be Vietnam Pro", sans-serif';

    // 1. Nền Tối Huyền Bí & Vầng Hào Quang Công Nghệ
    this.ctx.fillStyle = '#070913';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const bgGrad = this.ctx.createRadialGradient(
      this.canvas.width / 2, 320, 60,
      this.canvas.width / 2, 450, 950
    );
    bgGrad.addColorStop(0, 'rgba(30, 20, 60, 0.45)');
    bgGrad.addColorStop(1, 'rgba(7, 9, 19, 0)');
    this.ctx.fillStyle = bgGrad;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 2. Tiêu Đề Chính
    this.ctx.fillStyle = '#fde047';
    this.ctx.font = `bold 32px ${FONT_FAMILY}`;
    this.ctx.textAlign = 'center';
    this.ctx.shadowColor = '#eab308';
    this.ctx.shadowBlur = 18;
    this.ctx.fillText('✨ CÂY KỸ NĂNG & THÔNG THẠO ANH HÙNG (HERO MASTERY)', this.canvas.width / 2, 38);

    this.ctx.shadowBlur = 0;
    this.ctx.fillStyle = '#cbd5e1';
    this.ctx.font = `bold 14px ${FONT_FAMILY}`;
    this.ctx.fillText('Nâng cấp Thông Thạo (Cấp 1 - 100) • Cây kỹ năng 3 nhánh phân tầng độc lập • Tối đa 100 Điểm Mastery', this.canvas.width / 2, 60);

    // 3. Tabs Chuyển Đổi Nhân Vật
    const charTabW = 280;
    const charTabH = 38;
    const charTabGap = 20;
    const totalCharTabW = charTabW * CONFIG.CHARACTERS.length + charTabGap * (CONFIG.CHARACTERS.length - 1);
    const charTabStartX = (this.canvas.width - totalCharTabW) / 2;
    const charTabY = 72;

    for (let i = 0; i < CONFIG.CHARACTERS.length; i++) {
      const c = CONFIG.CHARACTERS[i];
      const tx = charTabStartX + i * (charTabW + charTabGap);
      const isTabSelected = (c.id === this.skillTreeSelectedCharId);
      const cMastery = this.masterySystem.getCharData(c.id);

      this.ctx.fillStyle = isTabSelected ? 'rgba(76, 29, 149, 0.95)' : 'rgba(17, 24, 39, 0.85)';
      this.ctx.fillRect(tx, charTabY, charTabW, charTabH);
      this.ctx.strokeStyle = isTabSelected ? '#fbbf24' : '#334155';
      this.ctx.lineWidth = isTabSelected ? 2.5 : 1.2;
      this.ctx.strokeRect(tx, charTabY, charTabW, charTabH);

      this.ctx.fillStyle = isTabSelected ? '#fde047' : '#94a3b8';
      this.ctx.font = isTabSelected ? `bold 16px ${FONT_FAMILY}` : `bold 14px ${FONT_FAMILY}`;
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`${c.name} (Lv.${cMastery.level}/100)`, tx + charTabW / 2, charTabY + 24);

      this.menuButtons.push({ x: tx, y: charTabY, w: charTabW, h: charTabH, id: 'select_skill_char_' + c.id });
    }

    // 4. Banner Thông Tin Thông Thạo Nhân Vật Hiện Tại
    const selectedCharConfig = CONFIG.CHARACTERS.find(c => c.id === this.skillTreeSelectedCharId) || CONFIG.CHARACTERS[0];
    const charMastery = this.masterySystem.getCharData(selectedCharConfig.id);
    const neededScore = this.masterySystem.getRequiredScore(charMastery.level);
    const isMaxMastery = charMastery.level >= 100;
    const canLevelUp = !isMaxMastery && charMastery.score >= neededScore;
    const totalSpentPoints = this.masterySystem.getTotalPointsSpent(selectedCharConfig.id);

    const bannerX = 50;
    const bannerY = 118;
    const bannerW = this.canvas.width - 100;
    const bannerH = 78;

    this.ctx.fillStyle = 'rgba(15, 12, 28, 0.94)';
    this.ctx.fillRect(bannerX, bannerY, bannerW, bannerH);
    this.ctx.strokeStyle = '#4338ca';
    this.ctx.lineWidth = 1.8;
    this.ctx.strokeRect(bannerX, bannerY, bannerW, bannerH);

    // Avatar Nhân Vật
    const avBoxX = bannerX + 14;
    const avBoxSize = 58;
    const avBoxY = bannerY + Math.round((bannerH - avBoxSize) / 2);
    this.ctx.fillStyle = 'rgba(10, 5, 20, 0.8)';
    this.ctx.fillRect(avBoxX, avBoxY, avBoxSize, avBoxSize);
    this.ctx.strokeStyle = '#fbbf24';
    this.ctx.lineWidth = 1.2;
    this.ctx.strokeRect(avBoxX, avBoxY, avBoxSize, avBoxSize);

    const cImg = getIconImage(selectedCharConfig.sprite);
    if (cImg && cImg.complete) {
      const maxDrawW = avBoxSize - 10;
      const maxDrawH = avBoxSize - 10;
      let sW = cImg.naturalWidth || 48;
      let sH = cImg.naturalHeight || 96;
      if (selectedCharConfig.spriteSheet) {
        sW = Math.floor(cImg.naturalWidth / selectedCharConfig.spriteSheet.cols);
        sH = Math.floor(cImg.naturalHeight / selectedCharConfig.spriteSheet.rows);
      }
      const scale = Math.min(maxDrawW / sW, maxDrawH / sH);
      const drawW = Math.round(sW * scale);
      const drawH = Math.round(sH * scale);
      const drawX = Math.round(avBoxX + (avBoxSize - drawW) / 2);
      const drawY = Math.round(avBoxY + (avBoxSize - drawH) / 2);

      if (selectedCharConfig.spriteSheet) {
        this.ctx.drawImage(cImg, 0, 0, sW, sH, drawX, drawY, drawW, drawH);
      } else {
        this.ctx.drawImage(cImg, drawX, drawY, drawW, drawH);
      }
    }

    const infoTextX = avBoxX + avBoxSize + 16;
    this.ctx.textAlign = 'left';
    this.ctx.fillStyle = '#ffea79';
    this.ctx.font = `bold 20px ${FONT_FAMILY}`;
    this.ctx.fillText(selectedCharConfig.name, infoTextX, bannerY + 28);

    this.ctx.fillStyle = '#f59e0b';
    this.ctx.font = `bold 15px ${FONT_FAMILY}`;
    this.ctx.fillText(`THÔNG THẠO: CẤP ${charMastery.level} / 100`, infoTextX, bannerY + 54);

    // Thanh Tiến Trình Score & Các Nút Nâng Cấp
    const progX = bannerX + 370;
    const progY = bannerY + 22;
    const progW = 270;
    const progH = 36;

    this.ctx.fillStyle = '#cbd5e1';
    this.ctx.font = `bold 13px ${FONT_FAMILY}`;
    this.ctx.fillText(`Score Tích Lũy: ${charMastery.score.toLocaleString()} Score`, progX, bannerY + 16);

    this.ctx.fillStyle = 'rgba(10, 8, 20, 0.9)';
    this.ctx.fillRect(progX, progY, progW, progH);
    const scoreRatio = isMaxMastery ? 1.0 : Math.min(1.0, charMastery.score / neededScore);
    const barGrad = this.ctx.createLinearGradient(progX, 0, progX + progW, 0);
    barGrad.addColorStop(0, '#7c3aed');
    barGrad.addColorStop(1, '#eab308');
    this.ctx.fillStyle = barGrad;
    this.ctx.fillRect(progX, progY, progW * scoreRatio, progH);
    this.ctx.strokeStyle = '#fbbf24';
    this.ctx.lineWidth = 1.0;
    this.ctx.strokeRect(progX, progY, progW, progH);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = `bold 12px ${FONT_FAMILY}`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
      isMaxMastery ? 'MAX CẤP (100/100)' : `${charMastery.score.toLocaleString()} / ${neededScore.toLocaleString()} (${Math.floor(scoreRatio * 100)}%)`,
      progX + progW / 2,
      progY + 23
    );

    // Nút Nâng 1 Cấp
    const upBtnW = 125;
    const upBtnH = 36;
    const upBtnX = progX + progW + 12;
    const upBtnY = progY;
    this.ctx.fillStyle = canLevelUp ? '#15803d' : '#1e293b';
    this.ctx.fillRect(upBtnX, upBtnY, upBtnW, upBtnH);
    this.ctx.strokeStyle = canLevelUp ? '#4ade80' : '#475569';
    this.ctx.lineWidth = 1.5;
    this.ctx.strokeRect(upBtnX, upBtnY, upBtnW, upBtnH);
    this.ctx.fillStyle = canLevelUp ? '#ffffff' : '#64748b';
    this.ctx.font = `bold 13px ${FONT_FAMILY}`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText(isMaxMastery ? 'ĐÃ MAX' : '⬆️ NÂNG 1 CẤP', upBtnX + upBtnW / 2, upBtnY + 23);
    this.menuButtons.push({ x: upBtnX, y: upBtnY, w: upBtnW, h: upBtnH, id: 'level_up_mastery' });

    // Nút Nâng Max
    const maxBtnW = 115;
    const maxBtnH = 36;
    const maxBtnX = upBtnX + upBtnW + 8;
    const maxBtnY = progY;
    this.ctx.fillStyle = canLevelUp ? '#b45309' : '#1e293b';
    this.ctx.fillRect(maxBtnX, maxBtnY, maxBtnW, maxBtnH);
    this.ctx.strokeStyle = canLevelUp ? '#fde047' : '#475569';
    this.ctx.lineWidth = 1.5;
    this.ctx.strokeRect(maxBtnX, maxBtnY, maxBtnW, maxBtnH);
    this.ctx.fillStyle = canLevelUp ? '#ffffff' : '#64748b';
    this.ctx.font = `bold 13px ${FONT_FAMILY}`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText('🚀 NÂNG MAX', maxBtnX + maxBtnW / 2, maxBtnY + 23);
    this.menuButtons.push({ x: maxBtnX, y: maxBtnY, w: maxBtnW, h: maxBtnH, id: 'level_up_max_mastery' });

    // Nút +10K Score Test
    const testBtnW = 115;
    const testBtnH = 36;
    const testBtnX = maxBtnX + maxBtnW + 8;
    const testBtnY = progY;
    this.ctx.fillStyle = '#4c1d95';
    this.ctx.fillRect(testBtnX, testBtnY, testBtnW, testBtnH);
    this.ctx.strokeStyle = '#a855f7';
    this.ctx.lineWidth = 1.5;
    this.ctx.strokeRect(testBtnX, testBtnY, testBtnW, testBtnH);
    this.ctx.fillStyle = '#fde047';
    this.ctx.font = `bold 13px ${FONT_FAMILY}`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText('🎁 +10K SCORE', testBtnX + testBtnW / 2, testBtnY + 23);
    this.menuButtons.push({ x: testBtnX, y: testBtnY, w: testBtnW, h: testBtnH, id: 'add_test_score' });

    // Điểm Kỹ Năng & Nút Reset Score
    const pointInfoX = testBtnX + testBtnW + 18;
    this.ctx.textAlign = 'left';
    this.ctx.fillStyle = '#fde047';
    this.ctx.font = `bold 16px ${FONT_FAMILY}`;
    this.ctx.fillText(`🌟 ĐIỂM KỸ NĂNG: ${charMastery.skillPoints}`, pointInfoX, bannerY + 32);

    this.ctx.fillStyle = '#cbd5e1';
    this.ctx.font = `bold 13px ${FONT_FAMILY}`;
    this.ctx.fillText(`Đã dùng: ${totalSpentPoints} / 100 Điểm`, pointInfoX, bannerY + 56);

    const hasLevel = charMastery.level > 1;
    const resetLvlBtnW = 160;
    const resetLvlBtnH = 36;
    const resetLvlBtnX = bannerX + bannerW - resetLvlBtnW - 14;
    const resetLvlBtnY = progY;
    this.ctx.fillStyle = hasLevel ? '#7c2d12' : '#1e293b';
    this.ctx.fillRect(resetLvlBtnX, resetLvlBtnY, resetLvlBtnW, resetLvlBtnH);
    this.ctx.strokeStyle = hasLevel ? '#fb923c' : '#475569';
    this.ctx.lineWidth = 1.8;
    this.ctx.strokeRect(resetLvlBtnX, resetLvlBtnY, resetLvlBtnW, resetLvlBtnH);
    this.ctx.fillStyle = hasLevel ? '#ffffff' : '#64748b';
    this.ctx.font = `bold 13px ${FONT_FAMILY}`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText('♻️ TẨY CẤP & SCORE', resetLvlBtnX + resetLvlBtnW / 2, resetLvlBtnY + 23);
    this.menuButtons.push({ x: resetLvlBtnX, y: resetLvlBtnY, w: resetLvlBtnW, h: resetLvlBtnH, id: 'reset_mastery_level' });

    // 5. Thanh Tabs Chuyển Đổi 3 Nhánh (Sinh Tồn - Tấn Công - Tiện Ích)
    const activeTab = this.skillTreeSelectedTab || 'green';
    const spentGreen = this.masterySystem.getPointsSpentInBranch(selectedCharConfig.id, 'green');
    const spentRed = this.masterySystem.getPointsSpentInBranch(selectedCharConfig.id, 'red');
    const spentYellow = this.masterySystem.getPointsSpentInBranch(selectedCharConfig.id, 'yellow');

    const branchTabY = 206;
    const branchTabH = 44;

    const branchTabs = [
      {
        id: 'green',
        name: '1. SINH TỒN & PHÒNG THỦ',
        icon: '🛡️',
        spent: spentGreen,
        x: 50,
        w: 395,
        activeColor: '#10b981',
        activeBg: 'rgba(6, 78, 59, 0.95)',
        textColor: '#6ee7b7'
      },
      {
        id: 'red',
        name: '2. TẤN CÔNG & HỦY DIỆT',
        icon: '⚔️',
        spent: spentRed,
        x: 460,
        w: 395,
        activeColor: '#ef4444',
        activeBg: 'rgba(127, 29, 29, 0.95)',
        textColor: '#fca5a5'
      },
      {
        id: 'yellow',
        name: '3. TIỆN ÍCH & NĂNG LƯỢNG',
        icon: '⚡',
        spent: spentYellow,
        x: 870,
        w: 395,
        activeColor: '#f59e0b',
        activeBg: 'rgba(120, 53, 15, 0.95)',
        textColor: '#fde68a'
      }
    ];

    for (const bTab of branchTabs) {
      const isActive = (bTab.id === activeTab);
      this.ctx.fillStyle = isActive ? bTab.activeBg : 'rgba(15, 23, 42, 0.85)';
      this.ctx.fillRect(bTab.x, branchTabY, bTab.w, branchTabH);
      this.ctx.strokeStyle = isActive ? bTab.activeColor : '#334155';
      this.ctx.lineWidth = isActive ? 2.5 : 1.0;
      this.ctx.strokeRect(bTab.x, branchTabY, bTab.w, branchTabH);

      this.ctx.fillStyle = isActive ? '#ffffff' : '#94a3b8';
      this.ctx.font = isActive ? `bold 16px ${FONT_FAMILY}` : `bold 15px ${FONT_FAMILY}`;
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`${bTab.icon} ${bTab.name}  [${bTab.spent}đ]`, bTab.x + bTab.w / 2, branchTabY + 28);

      this.menuButtons.push({ x: bTab.x, y: branchTabY, w: bTab.w, h: branchTabH, id: 'switch_skill_tree_tab_' + bTab.id });
    }

    // 2 Nút Tẩy Điểm bên phải thanh tab
    const curBranchSpent = (activeTab === 'green' ? spentGreen : (activeTab === 'red' ? spentRed : spentYellow));
    const resetBranchBtnW = 270;
    const resetBranchBtnH = 44;
    const resetBranchBtnX = 1285;
    const resetBranchBtnY = branchTabY;

    this.ctx.fillStyle = curBranchSpent > 0 ? 'rgba(146, 64, 14, 0.9)' : '#1e293b';
    this.ctx.fillRect(resetBranchBtnX, resetBranchBtnY, resetBranchBtnW, resetBranchBtnH);
    this.ctx.strokeStyle = curBranchSpent > 0 ? '#fde047' : '#475569';
    this.ctx.lineWidth = curBranchSpent > 0 ? 1.8 : 1.0;
    this.ctx.strokeRect(resetBranchBtnX, resetBranchBtnY, resetBranchBtnW, resetBranchBtnH);
    this.ctx.fillStyle = curBranchSpent > 0 ? '#ffffff' : '#64748b';
    this.ctx.font = `bold 14px ${FONT_FAMILY}`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText('↩️ TẨY NHÁNH NÀY', resetBranchBtnX + resetBranchBtnW / 2, resetBranchBtnY + 28);
    this.menuButtons.push({ x: resetBranchBtnX, y: resetBranchBtnY, w: resetBranchBtnW, h: resetBranchBtnH, id: 'reset_skill_branch_' + activeTab });

    const resetAllBtnW = 295;
    const resetAllBtnH = 44;
    const resetAllBtnX = resetBranchBtnX + resetBranchBtnW + 16;
    const resetAllBtnY = branchTabY;

    this.ctx.fillStyle = totalSpentPoints > 0 ? 'rgba(159, 18, 57, 0.9)' : '#1e293b';
    this.ctx.fillRect(resetAllBtnX, resetAllBtnY, resetAllBtnW, resetAllBtnH);
    this.ctx.strokeStyle = totalSpentPoints > 0 ? '#fb7185' : '#475569';
    this.ctx.lineWidth = totalSpentPoints > 0 ? 1.8 : 1.0;
    this.ctx.strokeRect(resetAllBtnX, resetAllBtnY, resetAllBtnW, resetAllBtnH);
    this.ctx.fillStyle = totalSpentPoints > 0 ? '#ffffff' : '#64748b';
    this.ctx.font = `bold 14px ${FONT_FAMILY}`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText('🔄 TẨY TẤT CẢ 100 ĐIỂM', resetAllBtnX + resetAllBtnW / 2, resetAllBtnY + 28);
    this.menuButtons.push({ x: resetAllBtnX, y: resetAllBtnY, w: resetAllBtnW, h: resetAllBtnH, id: 'reset_mastery_skills' });

    // 6. KHU VỰC CÂY KỸ NĂNG BÊN TRÁI (LEFT PANEL: PHÓNG TO & CUỘN KÉO LÊN XUỐNG)
    const treePanelX = 50;
    const treePanelY = 260;
    const treePanelW = 1215;
    const treePanelH = 730;

    const tabThemeColors = {
      green:  { border: '#059669', glow: '#10b981', lineActive: '#10b981', title: 'SINH TỒN & PHÒNG THỦ' },
      red:    { border: '#dc2626', glow: '#ef4444', lineActive: '#ef4444', title: 'TẤN CÔNG & HỦY DIỆT' },
      yellow: { border: '#d97706', glow: '#f59e0b', lineActive: '#f59e0b', title: 'TIỆN ÍCH & NĂNG LƯỢNG' }
    };
    const currentTheme = tabThemeColors[activeTab] || tabThemeColors.green;

    // Nền panel cây kỹ năng
    this.ctx.fillStyle = 'rgba(10, 13, 26, 0.95)';
    this.ctx.fillRect(treePanelX, treePanelY, treePanelW, treePanelH);
    this.ctx.strokeStyle = currentTheme.border;
    this.ctx.lineWidth = 2.0;
    this.ctx.strokeRect(treePanelX, treePanelY, treePanelW, treePanelH);

    // Bắt đầu Clipping để nội dung cuộn bên trong panel mượt mà không bị tràn ra ngoài
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(treePanelX, treePanelY, treePanelW, treePanelH);
    this.ctx.clip();

    const scrollY = this.skillTreeScrollY || 0;
    const treeCenterNodeX = treePanelX + treePanelW / 2; // ~657.5

    // Tọa độ chuẩn 5 tầng nút hình vuông PHÓNG TO (140x140 tiêu chuẩn, 165x165 Keystone)
    const NODE_SIZE = 140;
    const KEYSTONE_SIZE = 165;
    const SLOT_COORDS = {
      'slot-tier1':       { cx: treeCenterNodeX, cy: treePanelY + 115 - scrollY, w: NODE_SIZE, h: NODE_SIZE, tier: 1 },
      'slot-tier2-left':  { cx: 420,             cy: treePanelY + 345 - scrollY, w: NODE_SIZE, h: NODE_SIZE, tier: 2 },
      'slot-tier2-right': { cx: 895,             cy: treePanelY + 345 - scrollY, w: NODE_SIZE, h: NODE_SIZE, tier: 2 },
      'slot-tier3-left':  { cx: 205,             cy: treePanelY + 580 - scrollY, w: NODE_SIZE, h: NODE_SIZE, tier: 3 },
      'slot-tier3-mid':   { cx: treeCenterNodeX, cy: treePanelY + 580 - scrollY, w: NODE_SIZE, h: NODE_SIZE, tier: 3 },
      'slot-tier3-right': { cx: 1110,            cy: treePanelY + 580 - scrollY, w: NODE_SIZE, h: NODE_SIZE, tier: 3 },
      'slot-tier4-left':  { cx: 420,             cy: treePanelY + 815 - scrollY, w: NODE_SIZE, h: NODE_SIZE, tier: 4 },
      'slot-tier4-right': { cx: 895,             cy: treePanelY + 815 - scrollY, w: NODE_SIZE, h: NODE_SIZE, tier: 4 },
      'slot-tier5':       { cx: treeCenterNodeX, cy: treePanelY + 1060 - scrollY, w: KEYSTONE_SIZE, h: KEYSTONE_SIZE, tier: 5 }
    };
    this.skillTreeMaxScrollY = 460;

    // 6.1. Vẽ đường nối Bezier giữa các nút (Connectors)
    const links = BRANCH_LINKS[activeTab] || [];
    for (const [pId, cId] of links) {
      const pDef = SKILL_TREE_DEFINITIONS[pId];
      const cDef = SKILL_TREE_DEFINITIONS[cId];
      if (!pDef || !cDef) continue;

      const pSlot = SLOT_COORDS[pDef.slot];
      const cSlot = SLOT_COORDS[cDef.slot];
      if (!pSlot || !cSlot) continue;

      const isParentActive = (charMastery.skills[pId] || 0) > 0;
      const isChildActive = (charMastery.skills[cId] || 0) > 0;
      const isChildUnlocked = this.masterySystem.isNodeUnlocked(selectedCharConfig.id, cId);

      this.ctx.beginPath();
      this.ctx.moveTo(pSlot.cx, pSlot.cy);
      const midY = (pSlot.cy + cSlot.cy) / 2;
      this.ctx.bezierCurveTo(pSlot.cx, midY, cSlot.cx, midY, cSlot.cx, cSlot.cy);

      if (isParentActive && (isChildActive || isChildUnlocked)) {
        this.ctx.strokeStyle = currentTheme.lineActive;
        this.ctx.lineWidth = 4.5;
        this.ctx.shadowColor = currentTheme.glow;
        this.ctx.shadowBlur = 10;
      } else {
        this.ctx.strokeStyle = 'rgba(51, 65, 85, 0.7)';
        this.ctx.lineWidth = 2.5;
        this.ctx.shadowBlur = 0;
      }
      this.ctx.stroke();
      this.ctx.shadowBlur = 0;
    }

    // 6.2. Vẽ các nút kỹ năng hình vuông PHÓNG TO (Square Tech Nodes)
    const currentBranchNodeKeys = Object.keys(SKILL_TREE_DEFINITIONS).filter(k => SKILL_TREE_DEFINITIONS[k].branch === activeTab);
    let hoveredNodeCandidate = null;

    for (const nodeId of currentBranchNodeKeys) {
      const def = SKILL_TREE_DEFINITIONS[nodeId];
      const slot = SLOT_COORDS[def.slot];
      if (!slot) continue;

      const nx = slot.cx - slot.w / 2;
      const ny = slot.cy - slot.h / 2;
      const nw = slot.w;
      const nh = slot.h;

      // Kiểm tra nút có nằm trong vùng nhìn thấy của panel không
      const isVisibleInPanel = (ny + nh >= treePanelY && ny <= treePanelY + treePanelH);

      const curLvl = charMastery.skills[nodeId] || 0;
      const maxLvl = def.maxLevel;
      const isUnlocked = this.masterySystem.isNodeUnlocked(selectedCharConfig.id, nodeId);
      const isMax = curLvl >= maxLvl;
      const isSelected = (nodeId === this.selectedSkillNodeId);

      const isMouseOver = isVisibleInPanel && (
        this.mouseX >= nx && this.mouseX <= nx + nw &&
        this.mouseY >= ny && this.mouseY <= ny + nh
      );
      if (isMouseOver) {
        hoveredNodeCandidate = def;
      }

      // Nền & Viền nút hình vuông lớn
      if (!isUnlocked) {
        this.ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        this.ctx.fillRect(nx, ny, nw, nh);
        this.ctx.strokeStyle = '#334155';
        this.ctx.lineWidth = 1.8;
        this.ctx.strokeRect(nx, ny, nw, nh);
      } else if (curLvl > 0) {
        this.ctx.fillStyle = isSelected ? 'rgba(30, 27, 75, 0.98)' : 'rgba(17, 24, 39, 0.96)';
        this.ctx.fillRect(nx, ny, nw, nh);
        this.ctx.strokeStyle = isSelected ? '#fbbf24' : currentTheme.glow;
        this.ctx.lineWidth = isSelected ? 3.5 : 2.5;
        if (isSelected) {
          this.ctx.shadowColor = currentTheme.glow;
          this.ctx.shadowBlur = 16;
        }
        this.ctx.strokeRect(nx, ny, nw, nh);
        this.ctx.shadowBlur = 0;
      } else {
        this.ctx.fillStyle = isSelected ? 'rgba(30, 27, 75, 0.98)' : 'rgba(15, 23, 42, 0.92)';
        this.ctx.fillRect(nx, ny, nw, nh);
        this.ctx.strokeStyle = isSelected ? '#38bdf8' : '#475569';
        this.ctx.lineWidth = isSelected ? 3.0 : 1.8;
        this.ctx.strokeRect(nx, ny, nw, nh);
      }

      // Góc nhấn công nghệ (Tech corner accents)
      this.ctx.strokeStyle = isSelected ? '#fbbf24' : (curLvl > 0 ? currentTheme.glow : '#64748b');
      this.ctx.lineWidth = 2.0;
      const cLen = 10;
      // Top-left
      this.ctx.beginPath();
      this.ctx.moveTo(nx, ny + cLen); this.ctx.lineTo(nx, ny); this.ctx.lineTo(nx + cLen, ny);
      this.ctx.stroke();
      // Top-right
      this.ctx.beginPath();
      this.ctx.moveTo(nx + nw - cLen, ny); this.ctx.lineTo(nx + nw, ny); this.ctx.lineTo(nx + nw, ny + cLen);
      this.ctx.stroke();
      // Bottom-left
      this.ctx.beginPath();
      this.ctx.moveTo(nx, ny + nh - cLen); this.ctx.lineTo(nx, ny + nh); this.ctx.lineTo(nx + cLen, ny + nh);
      this.ctx.stroke();
      // Bottom-right
      this.ctx.beginPath();
      this.ctx.moveTo(nx + nw - cLen, ny + nh); this.ctx.lineTo(nx + nw, ny + nh); this.ctx.lineTo(nx + nw, ny + nh - cLen);
      this.ctx.stroke();

      // Thẻ Bậc & Giá Điểm ở hàng trên cùng
      this.ctx.font = `bold 12px ${FONT_FAMILY}`;
      this.ctx.fillStyle = isUnlocked ? currentTheme.textColor : '#64748b';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(def.isKeystone ? '👑 KEYSTONE' : `Tier ${def.tier}`, nx + 8, ny + 16);

      this.ctx.font = `bold 13px ${FONT_FAMILY}`;
      this.ctx.fillStyle = isUnlocked ? '#fbbf24' : '#64748b';
      this.ctx.textAlign = 'right';
      this.ctx.fillText(`${def.costPerLevel} Điểm`, nx + nw - 8, ny + 16);

      // Icon kỹ năng LỚN ở trung tâm
      this.ctx.font = def.isKeystone ? '54px sans-serif' : '44px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(def.icon, slot.cx, slot.cy + (def.isKeystone ? 12 : 8));

      // Tên kỹ năng to rõ ràng phía trên icon
      this.ctx.font = `bold 13px ${FONT_FAMILY}`;
      this.ctx.fillStyle = (curLvl > 0 ? '#fde047' : (isUnlocked ? '#ffffff' : '#64748b'));
      this.ctx.textAlign = 'center';
      // Tự xuống 2 dòng nếu tên dài
      if (def.name.length > 15) {
        const parts = def.name.split(' ');
        const mid = Math.ceil(parts.length / 2);
        const l1 = parts.slice(0, mid).join(' ');
        const l2 = parts.slice(mid).join(' ');
        this.ctx.fillText(l1, slot.cx, ny + 32);
        this.ctx.fillText(l2, slot.cx, ny + 46);
      } else {
        this.ctx.fillText(def.name, slot.cx, ny + 34);
      }

      // Thanh Dưới Cùng: Nút [-] bên trái, Cấp độ ở giữa, Nút [+] bên phải
      const btnSize = 28;
      const btnY = ny + nh - btnSize - 6;

      // Cấp độ ở giữa
      this.ctx.textAlign = 'center';
      if (isMax) {
        this.ctx.fillStyle = '#f59e0b';
        this.ctx.font = `bold 13px ${FONT_FAMILY}`;
        this.ctx.fillText('⭐ ĐÃ MAX', slot.cx, ny + nh - 14);
      } else {
        this.ctx.fillStyle = curLvl > 0 ? '#4ade80' : (isUnlocked ? '#cbd5e1' : '#64748b');
        this.ctx.font = `bold 13px ${FONT_FAMILY}`;
        this.ctx.fillText(`Cấp ${curLvl}/${maxLvl}`, slot.cx, ny + nh - 14);
      }

      // Nút [-] và [+] chỉ đăng ký tương tác khi nút nằm trong vùng nhìn thấy của panel
      if (isUnlocked && isVisibleInPanel) {
        if (curLvl > 0) {
          const mBtnX = nx + 7;
          this.ctx.fillStyle = '#7f1d1d';
          this.ctx.fillRect(mBtnX, btnY, btnSize, btnSize);
          this.ctx.strokeStyle = '#f87171';
          this.ctx.lineWidth = 1.2;
          this.ctx.strokeRect(mBtnX, btnY, btnSize, btnSize);
          this.ctx.fillStyle = '#ffffff';
          this.ctx.font = `bold 18px ${FONT_FAMILY}`;
          this.ctx.textAlign = 'center';
          this.ctx.fillText('-', mBtnX + btnSize / 2, btnY + 19);
          this.menuButtons.push({ x: mBtnX, y: btnY, w: btnSize, h: btnSize, id: 'refund_skill_' + nodeId });
        }

        if (!isMax) {
          const pBtnX = nx + nw - btnSize - 7;
          const canAdd = charMastery.skillPoints >= def.costPerLevel;
          this.ctx.fillStyle = canAdd ? '#15803d' : '#1e293b';
          this.ctx.fillRect(pBtnX, btnY, btnSize, btnSize);
          this.ctx.strokeStyle = canAdd ? '#4ade80' : '#475569';
          this.ctx.lineWidth = 1.2;
          this.ctx.strokeRect(pBtnX, btnY, btnSize, btnSize);
          this.ctx.fillStyle = canAdd ? '#ffffff' : '#64748b';
          this.ctx.font = `bold 18px ${FONT_FAMILY}`;
          this.ctx.textAlign = 'center';
          this.ctx.fillText('+', pBtnX + btnSize / 2, btnY + 19);
          this.menuButtons.push({ x: pBtnX, y: btnY, w: btnSize, h: btnSize, id: 'allocate_skill_' + nodeId });
        }
      }

      // Biểu tượng Khóa nếu chưa đủ điều kiện
      if (!isUnlocked) {
        this.ctx.fillStyle = 'rgba(5, 7, 15, 0.65)';
        this.ctx.fillRect(nx, ny, nw, nh);
        this.ctx.font = '36px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('🔒', slot.cx, slot.cy + 12);
      }

      // Click vào thân nút hình vuông -> Chọn nút để soi chi tiết (chỉ khi hiển thị trong viewport)
      if (isVisibleInPanel) {
        this.menuButtons.push({ x: nx, y: ny, w: nw, h: nh, id: 'select_skill_node_' + nodeId });
      }
    }

    // Kết thúc Clipping của panel cây kỹ năng
    this.ctx.restore();

    // 6.3. Thanh Cuộn (Scrollbar) bên cạnh phải của Panel Cây Kỹ Năng
    const sbTrackX = treePanelX + treePanelW - 10;
    const sbTrackY = treePanelY + 10;
    const sbTrackW = 6;
    const sbTrackH = treePanelH - 20;

    this.ctx.fillStyle = 'rgba(30, 41, 59, 0.6)';
    this.ctx.fillRect(sbTrackX, sbTrackY, sbTrackW, sbTrackH);

    const totalContentH = 1190;
    const thumbH = Math.max(50, Math.round((treePanelH / totalContentH) * sbTrackH));
    const maxScroll = this.skillTreeMaxScrollY || 460;
    const thumbY = sbTrackY + (scrollY / maxScroll) * (sbTrackH - thumbH);

    this.ctx.fillStyle = currentTheme.glow;
    this.ctx.shadowColor = currentTheme.glow;
    this.ctx.shadowBlur = 8;
    this.ctx.fillRect(sbTrackX - 1, thumbY, sbTrackW + 2, thumbH);
    this.ctx.shadowBlur = 0;

    // Gợi ý cuộn chuột lên / xuống nổi bật
    if (scrollY < 400) {
      this.ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      const hintW = 340;
      const hintH = 28;
      const hintX = treePanelX + (treePanelW - hintW) / 2;
      const hintY = treePanelY + treePanelH - 36;
      this.ctx.fillRect(hintX, hintY, hintW, hintH);
      this.ctx.strokeStyle = '#334155';
      this.ctx.lineWidth = 1.0;
      this.ctx.strokeRect(hintX, hintY, hintW, hintH);
      this.ctx.fillStyle = '#38bdf8';
      this.ctx.font = `bold 13px ${FONT_FAMILY}`;
      this.ctx.textAlign = 'center';
      this.ctx.fillText('▼ Cuộn chuột xuống để xem Bậc 4 & Keystone', hintX + hintW / 2, hintY + 19);
    }
    if (scrollY > 30) {
      this.ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      const hintW = 280;
      const hintH = 28;
      const hintX = treePanelX + (treePanelW - hintW) / 2;
      const hintY = treePanelY + 8;
      this.ctx.fillRect(hintX, hintY, hintW, hintH);
      this.ctx.strokeStyle = '#334155';
      this.ctx.lineWidth = 1.0;
      this.ctx.strokeRect(hintX, hintY, hintW, hintH);
      this.ctx.fillStyle = '#38bdf8';
      this.ctx.font = `bold 13px ${FONT_FAMILY}`;
      this.ctx.textAlign = 'center';
      this.ctx.fillText('▲ Cuộn chuột lên đầu cây', hintX + hintW / 2, hintY + 19);
    }

    // 7. KHU VỰC BÊN PHẢI (RIGHT PANEL: INSPECTOR & REAL LIVE ENGINE STATS)
    const rightPanelX = 1285;
    const rightPanelY = 260;
    const rightPanelW = 585;
    const rightPanelH = 730;

    // 7.1. Bảng Soi Chi Tiết Nút Kỹ Năng Đang Chọn (Inspector Box)
    const inspectDef = hoveredNodeCandidate || SKILL_TREE_DEFINITIONS[this.selectedSkillNodeId] || SKILL_TREE_DEFINITIONS['s1'];
    const curInspectLvl = charMastery.skills[inspectDef.id] || 0;
    const isInspectUnlocked = this.masterySystem.isNodeUnlocked(selectedCharConfig.id, inspectDef.id);
    const canSafelyRefundInspect = this.masterySystem.canSafelyRefund(selectedCharConfig.id, inspectDef.id);
    const canAddInspect = isInspectUnlocked && curInspectLvl < inspectDef.maxLevel && charMastery.skillPoints >= inspectDef.costPerLevel;

    const insBoxY = rightPanelY;
    const insBoxH = 340;

    this.ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    this.ctx.fillRect(rightPanelX, insBoxY, rightPanelW, insBoxH);
    this.ctx.strokeStyle = currentTheme.border;
    this.ctx.lineWidth = 2.0;
    this.ctx.strokeRect(rightPanelX, insBoxY, rightPanelW, insBoxH);

    // Icon to trong khung
    const iIconSize = 62;
    const iIconX = rightPanelX + 16;
    const iIconY = insBoxY + 16;
    this.ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
    this.ctx.fillRect(iIconX, iIconY, iIconSize, iIconSize);
    this.ctx.strokeStyle = currentTheme.glow;
    this.ctx.lineWidth = 1.8;
    this.ctx.strokeRect(iIconX, iIconY, iIconSize, iIconSize);

    this.ctx.font = '38px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(inspectDef.icon, iIconX + iIconSize / 2, iIconY + 44);

    // Tên kỹ năng & Phân loại
    const iTextX = iIconX + iIconSize + 16;
    this.ctx.textAlign = 'left';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = `bold 22px ${FONT_FAMILY}`;
    this.ctx.fillText(inspectDef.name, iTextX, insBoxY + 36);

    this.ctx.font = `bold 13px ${FONT_FAMILY}`;
    this.ctx.fillStyle = inspectDef.isKeystone ? '#f59e0b' : currentTheme.textColor;
    const tierText = inspectDef.isKeystone ? '👑 KEYSTONE TỐI THƯỢNG (TIER 5)' : `BẬC ${inspectDef.tier} (${inspectDef.costPerLevel} Điểm / Cấp)`;
    this.ctx.fillText(tierText, iTextX, insBoxY + 58);

    // Cấp độ hiện tại & Yêu cầu mở khóa
    this.ctx.textAlign = 'right';
    this.ctx.fillStyle = curInspectLvl >= inspectDef.maxLevel ? '#f59e0b' : '#38bdf8';
    this.ctx.font = `bold 16px ${FONT_FAMILY}`;
    this.ctx.fillText(`CẤP ${curInspectLvl} / ${inspectDef.maxLevel}`, rightPanelX + rightPanelW - 16, insBoxY + 36);

    this.ctx.textAlign = 'left';
    this.ctx.font = `bold 13px ${FONT_FAMILY}`;
    if (!inspectDef.req) {
      this.ctx.fillStyle = '#4ade80';
      this.ctx.fillText('🟢 Kỹ Năng Khởi Đầu (Luôn mở khóa)', iTextX, insBoxY + 78);
    } else if (isInspectUnlocked) {
      this.ctx.fillStyle = '#4ade80';
      this.ctx.fillText('✅ Đã thỏa mãn điều kiện mở khóa', iTextX, insBoxY + 78);
    } else {
      this.ctx.fillStyle = '#f43f5e';
      const reqNames = Array.isArray(inspectDef.req)
        ? inspectDef.req.map(rId => SKILL_TREE_DEFINITIONS[rId] ? SKILL_TREE_DEFINITIONS[rId].name : rId).join(' hoặc ')
        : (SKILL_TREE_DEFINITIONS[inspectDef.req] ? SKILL_TREE_DEFINITIONS[inspectDef.req].name : inspectDef.req);
      this.ctx.fillText(`🔒 Yêu cầu nâng tầng trước: ${reqNames}`, iTextX, insBoxY + 78);
    }

    // Mô tả chi tiết kỹ năng
    this.ctx.fillStyle = '#e2e8f0';
    this.ctx.font = `bold 14px ${FONT_FAMILY}`;
    const descWords = inspectDef.desc.split(' ');
    let dLine = '';
    let dY = insBoxY + 112;
    for (const w of descWords) {
      const test = dLine + w + ' ';
      if (this.ctx.measureText(test).width > rightPanelW - 36) {
        this.ctx.fillText(dLine, rightPanelX + 18, dY);
        dLine = w + ' ';
        dY += 22;
      } else {
        dLine = test;
      }
    }
    this.ctx.fillText(dLine, rightPanelX + 18, dY);

    // Hiệu quả cấp hiện tại & Cấp kế tiếp
    const effY = insBoxY + 202;
    this.ctx.fillStyle = curInspectLvl > 0 ? '#4ade80' : '#94a3b8';
    this.ctx.font = `bold 14px ${FONT_FAMILY}`;
    this.ctx.fillText(`⚡ Cấp Hiện Tại: ${inspectDef.format(curInspectLvl)}`, rightPanelX + 18, effY);

    if (curInspectLvl < inspectDef.maxLevel) {
      this.ctx.fillStyle = '#38bdf8';
      this.ctx.fillText(`⏩ Cấp Kế Tiếp: ${inspectDef.format(curInspectLvl + 1)}`, rightPanelX + 18, effY + 26);
    } else {
      this.ctx.fillStyle = '#f59e0b';
      this.ctx.fillText('⭐ Đã đạt cấp độ tối đa!', rightPanelX + 18, effY + 26);
    }

    // 2 Nút Hành Động Lớn trong Inspector: [-] Hoàn Điểm và [+] Nâng Cấp
    const actBtnW = 265;
    const actBtnH = 46;
    const actBtnY = insBoxY + 276;

    // Nút [-] HOÀN ĐIỂM
    const refBtnX = rightPanelX + 18;
    this.ctx.fillStyle = (curInspectLvl > 0 && canSafelyRefundInspect) ? '#831843' : '#1e293b';
    this.ctx.fillRect(refBtnX, actBtnY, actBtnW, actBtnH);
    this.ctx.strokeStyle = (curInspectLvl > 0 && canSafelyRefundInspect) ? '#f472b6' : '#475569';
    this.ctx.lineWidth = 1.8;
    this.ctx.strokeRect(refBtnX, actBtnY, actBtnW, actBtnH);
    this.ctx.fillStyle = (curInspectLvl > 0 && canSafelyRefundInspect) ? '#ffffff' : '#64748b';
    this.ctx.font = `bold 15px ${FONT_FAMILY}`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`[-] HOÀN ĐIỂM (-${inspectDef.costPerLevel}đ)`, refBtnX + actBtnW / 2, actBtnY + 28);
    this.menuButtons.push({ x: refBtnX, y: actBtnY, w: actBtnW, h: actBtnH, id: 'refund_skill_' + inspectDef.id });

    // Nút [+] NÂNG CẤP
    const addBtnX = refBtnX + actBtnW + 18;
    this.ctx.fillStyle = canAddInspect ? '#15803d' : '#1e293b';
    this.ctx.fillRect(addBtnX, actBtnY, actBtnW, actBtnH);
    this.ctx.strokeStyle = canAddInspect ? '#4ade80' : '#475569';
    this.ctx.lineWidth = 2.0;
    this.ctx.strokeRect(addBtnX, actBtnY, actBtnW, actBtnH);
    this.ctx.fillStyle = canAddInspect ? '#ffffff' : '#64748b';
    this.ctx.font = `bold 15px ${FONT_FAMILY}`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
      curInspectLvl >= inspectDef.maxLevel ? 'ĐÃ MAX CẤP' : `[+] NÂNG CẤP (+${inspectDef.costPerLevel}đ)`,
      addBtnX + actBtnW / 2,
      actBtnY + 28
    );
    this.menuButtons.push({ x: addBtnX, y: actBtnY, w: actBtnW, h: actBtnH, id: 'allocate_skill_' + inspectDef.id });

    // 7.2. Bảng Chỉ Số Thực Nhận Trong Trận (Real-time Live Engine Stats)
    const statsBoxY = insBoxY + insBoxH + 15;
    const statsBoxH = rightPanelH - insBoxH - 15;

    this.ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    this.ctx.fillRect(rightPanelX, statsBoxY, rightPanelW, statsBoxH);
    this.ctx.strokeStyle = '#334155';
    this.ctx.lineWidth = 1.8;
    this.ctx.strokeRect(rightPanelX, statsBoxY, rightPanelW, statsBoxH);

    this.ctx.textAlign = 'left';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = `bold 16px ${FONT_FAMILY}`;
    this.ctx.fillText('📊 CHỈ SỐ THỰC TẾ TRONG TRẬN (REAL-TIME STATS)', rightPanelX + 18, statsBoxY + 26);

    this.ctx.fillStyle = '#94a3b8';
    this.ctx.font = `bold 12px ${FONT_FAMILY}`;
    this.ctx.fillText(`*Tương ứng 100% thuộc tính engine game cho ${selectedCharConfig.name}:`, rightPanelX + 18, statsBoxY + 45);

    const bonuses = this.masterySystem.getBonusStats(selectedCharConfig.id);

    // Lưới 2 cột chỉ số
    const statColW = (rightPanelW - 46) / 2;
    const col1X = rightPanelX + 16;
    const col2X = col1X + statColW + 14;
    const statStartY = statsBoxY + 70;
    const statLineH = 26;

    const statsCol1 = [
      { icon: '❤️', label: 'Máu Tối Đa', val: `+${bonuses.bonusHealth} HP`, active: bonuses.bonusHealth > 0 },
      { icon: '🛡️', label: 'Giáp Cứng', val: `+${bonuses.bonusArmor}`, active: bonuses.bonusArmor > 0 },
      { icon: '👟', label: 'Tốc Độ Chạy', val: `+${((bonuses.bonusSpeedMult - 1.0) * 100).toFixed(1)}%`, active: bonuses.bonusSpeedMult > 1.0 },
      { icon: '💨', label: 'Né Tránh', val: `+${(bonuses.bonusDodge * 100).toFixed(1)}%`, active: bonuses.bonusDodge > 0 },
      { icon: '🌿', label: 'Hồi Máu', val: `+${bonuses.bonusRegen.toFixed(0)} HP/s`, active: bonuses.bonusRegen > 0 },
      { icon: '🔰', label: 'Giảm Sát Thương', val: `+${(bonuses.damageReduction * 100).toFixed(1)}%`, active: bonuses.damageReduction > 0 },
      { icon: '🩸', label: 'Hút Máu', val: `+${(bonuses.lifesteal * 100).toFixed(1)}%`, active: bonuses.lifesteal > 0 },
      { icon: '🦔', label: 'Phản Đòn', val: `+${bonuses.bonusReflectFlat}`, active: bonuses.bonusReflectFlat > 0 }
    ];

    const statsCol2 = [
      { icon: '⚔️', label: 'Sát Thương Toàn Bộ', val: `+${(bonuses.bonusDamageMult * 100).toFixed(0)}%`, active: bonuses.bonusDamageMult > 0 },
      { icon: '🎯', label: 'Tỉ Lệ Chí Mạng', val: `+${(bonuses.bonusCritChance * 100).toFixed(1)}%`, active: bonuses.bonusCritChance > 0 },
      { icon: '💥', label: 'ST Chí Mạng', val: `+${(bonuses.bonusCritDamage * 100).toFixed(0)}%`, active: bonuses.bonusCritDamage > 0 },
      { icon: '🗡️', label: 'Xuyên Giáp', val: `+${bonuses.armorPenFlat}`, active: bonuses.armorPenFlat > 0 },
      { icon: '🏹', label: 'Phá Giáp Quái', val: `+${(bonuses.armorPenPercent * 100).toFixed(0)}%`, active: bonuses.armorPenPercent > 0 },
      { icon: '⚡', label: 'Giảm Hồi Chiêu', val: `-${(bonuses.cooldownReduction * 100).toFixed(0)}%`, active: bonuses.cooldownReduction > 0 },
      { icon: '🧲', label: 'Bán Kính Hút', val: `+${bonuses.bonusPickupRange}px`, active: bonuses.bonusPickupRange > 0 },
      { icon: '💰', label: 'Thưởng Vàng / EXP', val: `+${((bonuses.bonusGoldMult - 1) * 100).toFixed(0)}% / +${((bonuses.bonusExpMult - 1) * 100).toFixed(1)}%`, active: bonuses.bonusGoldMult > 1.0 }
    ];

    for (let sIdx = 0; sIdx < statsCol1.length; sIdx++) {
      const s1 = statsCol1[sIdx];
      const sy = statStartY + sIdx * statLineH;

      this.ctx.fillStyle = s1.active ? '#ffffff' : '#64748b';
      this.ctx.font = `bold 13px ${FONT_FAMILY}`;
      this.ctx.textAlign = 'left';
      this.ctx.fillText(`${s1.icon} ${s1.label}`, col1X, sy);

      this.ctx.textAlign = 'right';
      this.ctx.fillStyle = s1.active ? '#4ade80' : '#475569';
      this.ctx.font = `bold 13px ${FONT_FAMILY}`;
      this.ctx.fillText(s1.val, col1X + statColW, sy);

      const s2 = statsCol2[sIdx];
      this.ctx.fillStyle = s2.active ? '#ffffff' : '#64748b';
      this.ctx.font = `bold 13px ${FONT_FAMILY}`;
      this.ctx.textAlign = 'left';
      this.ctx.fillText(`${s2.icon} ${s2.label}`, col2X, sy);

      this.ctx.textAlign = 'right';
      this.ctx.fillStyle = s2.active ? '#fde047' : '#475569';
      this.ctx.font = `bold 13px ${FONT_FAMILY}`;
      this.ctx.fillText(s2.val, col2X + statColW, sy);
    }

    // Keystone Trạng Thái ở đáy bảng chỉ số
    const ksY = statsBoxY + statsBoxH - 65;
    this.ctx.fillStyle = 'rgba(2, 6, 23, 0.9)';
    this.ctx.fillRect(rightPanelX + 12, ksY, rightPanelW - 24, 52);
    this.ctx.strokeStyle = '#4338ca';
    this.ctx.lineWidth = 1.2;
    this.ctx.strokeRect(rightPanelX + 12, ksY, rightPanelW - 24, 52);

    this.ctx.textAlign = 'left';
    this.ctx.font = `bold 13px ${FONT_FAMILY}`;
    if (bonuses.hasPhoenixRevive) {
      this.ctx.fillStyle = '#4ade80';
      this.ctx.fillText('👑 BẤT TỬ NIẾT BÀN: SẴN SÀNG (1 LẦN DUY NHẤT / TRẬN)', rightPanelX + 22, ksY + 22);
      this.ctx.fillStyle = '#cbd5e1';
      this.ctx.font = `bold 12px ${FONT_FAMILY}`;
      this.ctx.fillText('Khi tử trận: Hồi 50% HP + Bất tử 3.0s + Sóng đẩy lùi quái.', rightPanelX + 22, ksY + 40);
    } else if (bonuses.hasDiệtThếCrit) {
      this.ctx.fillStyle = '#f87171';
      this.ctx.fillText('💀 DIỆT THẾ BẠO KÍCH: KÍCH HOẠT (CHÍ MẠNG BẬC 2)', rightPanelX + 22, ksY + 22);
      this.ctx.fillStyle = '#cbd5e1';
      this.ctx.font = `bold 12px ${FONT_FAMILY}`;
      this.ctx.fillText('10% Crit nhân x2.5 sát thương và phóng sóng xung kích chém quét.', rightPanelX + 22, ksY + 40);
    } else if (bonuses.hasTimeFreezeKeystone) {
      this.ctx.fillStyle = '#fde047';
      this.ctx.fillText('⏳ THỜI KHÔNG NGƯNG ĐỌNG: KÍCH HOẠT', rightPanelX + 22, ksY + 22);
      this.ctx.fillStyle = '#cbd5e1';
      this.ctx.font = `bold 12px ${FONT_FAMILY}`;
      this.ctx.fillText('Bấm [G] hoặc máu < 25%: Ngưng đọng quái vật trong 2.0s.', rightPanelX + 22, ksY + 40);
    } else {
      this.ctx.fillStyle = '#64748b';
      this.ctx.fillText('👑 KEYSTONE TỐI THƯỢNG: CHƯA KÍCH HOẠT', rightPanelX + 22, ksY + 22);
      this.ctx.font = `bold 12px ${FONT_FAMILY}`;
      this.ctx.fillText('Nâng đến Tầng 5 ở đáy nhánh để mở khóa hiệu ứng đặc biệt đỉnh cao.', rightPanelX + 22, ksY + 40);
    }

    // 8. THANH DƯỚI CÙNG: NÚT QUAY LẠI MENU CHÍNH & HƯỚNG DẪN
    const bBtnW = 320;
    const bBtnH = 50;
    const bBtnX = 50;
    const bBtnY = 1008;

    this.ctx.fillStyle = '#1e1b2e';
    this.ctx.fillRect(bBtnX, bBtnY, bBtnW, bBtnH);
    this.ctx.strokeStyle = '#94a3b8';
    this.ctx.lineWidth = 1.8;
    this.ctx.strokeRect(bBtnX, bBtnY, bBtnW, bBtnH);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = `bold 16px ${FONT_FAMILY}`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText('⬅ QUAY VỀ MENU CHÍNH', bBtnX + bBtnW / 2, bBtnY + 31);
    this.menuButtons.push({ x: bBtnX, y: bBtnY, w: bBtnW, h: bBtnH, id: 'back_from_skill_tree' });

    const tipBoxX = bBtnX + bBtnW + 20;
    const tipBoxW = this.canvas.width - tipBoxX - 50;
    const tipBoxH = bBtnH;

    this.ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    this.ctx.fillRect(tipBoxX, bBtnY, tipBoxW, tipBoxH);
    this.ctx.strokeStyle = '#334155';
    this.ctx.lineWidth = 1.2;
    this.ctx.strokeRect(tipBoxX, bBtnY, tipBoxW, tipBoxH);

    this.ctx.textAlign = 'left';
    this.ctx.fillStyle = '#cbd5e1';
    this.ctx.font = `bold 14px ${FONT_FAMILY}`;
    this.ctx.fillText('💡 MẸO: Cuộn chuột hoặc kéo lên/xuống để xem toàn bộ 5 tầng • Click ô vuông để Soi & Nâng Cấp • Chuột phải hoặc bấm [-] để Hoàn Trả điểm.', tipBoxX + 18, bBtnY + 31);

    // 9. Toast Thông Báo Thao Tác
    if (this.skillTreeToast && this.skillTreeToast.timer > 0) {
      this.ctx.save();
      const toastAlpha = Math.min(1.0, this.skillTreeToast.timer * 2.5);
      this.ctx.globalAlpha = toastAlpha;
      const tw = 760;
      const th = 46;
      const tx = (this.canvas.width - tw) / 2;
      const ty = 24;

      this.ctx.fillStyle = 'rgba(12, 9, 26, 0.96)';
      this.ctx.fillRect(tx, ty, tw, th);
      this.ctx.strokeStyle = this.skillTreeToast.color;
      this.ctx.lineWidth = 2.5;
      this.ctx.strokeRect(tx, ty, tw, th);

      this.ctx.shadowColor = this.skillTreeToast.color;
      this.ctx.shadowBlur = 14;
      this.ctx.fillStyle = this.skillTreeToast.color;
      this.ctx.font = `bold 16px ${FONT_FAMILY}`;
      this.ctx.textAlign = 'center';
      this.ctx.fillText(this.skillTreeToast.text, tx + tw / 2, ty + 29);
      this.ctx.restore();
    }

    this.ctx.restore();
  }

  // MÀN HÌNH TỔNG KẾT CUỐI TRẬN (1080p Full HD)
  renderGameOver() {
    this.ctx.save();

    this.ctx.fillStyle = 'rgba(10, 5, 8, 0.94)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const s = this.endGameStats;

    if (s.isVictory) {
      this.ctx.fillStyle = '#ffd700';
      this.ctx.font = 'bold 64px "Segoe UI", serif';
      this.ctx.textAlign = 'center';
      this.ctx.shadowColor = '#d4af37';
      this.ctx.shadowBlur = 30;
      this.ctx.fillText('🏆 CHIẾN THẮNG QUANG VINH! 🏆', this.canvas.width / 2, 110);
      this.ctx.shadowBlur = 0;

      this.ctx.fillStyle = '#4ade80';
      this.ctx.font = 'italic 22px "Segoe UI", sans-serif';
      this.ctx.fillText('— Bạn đã kiên cường sống sót 20 phút và tiêu diệt Chúa Tể Yuki! —', this.canvas.width / 2, 155);
    } else {
      this.ctx.fillStyle = '#ff3344';
      this.ctx.font = 'bold 64px "Segoe UI", serif';
      this.ctx.textAlign = 'center';
      this.ctx.shadowColor = '#ff0000';
      this.ctx.shadowBlur = 24;
      this.ctx.fillText('KẾT THÚC TRẬN ĐẤU', this.canvas.width / 2, 115);
      this.ctx.shadowBlur = 0;
    }

    // Bảng thống kê chi tiết điểm số & vàng (mở rộng tránh đè chữ thông thạo)
    const statBoxW = 1060;
    const statBoxH = 550;
    const statBoxX = this.canvas.width / 2 - statBoxW / 2;
    const statBoxY = 175;

    this.ctx.fillStyle = 'rgba(20, 24, 36, 0.96)';
    this.ctx.fillRect(statBoxX, statBoxY, statBoxW, statBoxH);
    this.ctx.strokeStyle = s.isVictory ? '#ffd700' : '#d4af37';
    this.ctx.lineWidth = 2.5;
    this.ctx.strokeRect(statBoxX, statBoxY, statBoxW, statBoxH);

    const minutes = Math.floor(s.survivalTime / 60);
    const seconds = Math.floor(s.survivalTime % 60);

    const leftX = statBoxX + 45;
    const rightX = statBoxX + statBoxW - 45;
    let textY = statBoxY + 55;

    this.ctx.font = '21px "Segoe UI", sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillStyle = '#cbd5e1';
    this.ctx.fillText(`⏱️ Thời gian sống sót:`, leftX, textY);
    this.ctx.textAlign = 'right';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText(`${minutes} phút ${seconds} giây`, rightX, textY);

    textY += 44;
    this.ctx.textAlign = 'left';
    this.ctx.fillStyle = '#cbd5e1';
    this.ctx.fillText(`💀 Số quái vật tiêu diệt:`, leftX, textY);
    this.ctx.textAlign = 'right';
    this.ctx.fillStyle = '#ff88aa';
    this.ctx.fillText(`${s.kills} quái`, rightX, textY);

    textY += 44;
    this.ctx.textAlign = 'left';
    this.ctx.fillStyle = '#cbd5e1';
    this.ctx.fillText(`⭐ Cấp độ đạt được:`, leftX, textY);
    this.ctx.textAlign = 'right';
    this.ctx.fillStyle = '#00b4d8';
    this.ctx.fillText(`Cấp ${s.level}`, rightX, textY);

    textY += 44;
    this.ctx.textAlign = 'left';
    this.ctx.fillStyle = '#cbd5e1';
    this.ctx.fillText(`⚔️ Chế độ & Độ khó:`, leftX, textY);
    this.ctx.textAlign = 'right';
    this.ctx.fillStyle = this.selectedDiff.color;
    this.ctx.fillText(`${this.selectedMode.name} - ${this.selectedDiff.name}`, rightX, textY);

    textY += 44;
    this.ctx.textAlign = 'left';
    this.ctx.fillStyle = '#cbd5e1';
    this.ctx.fillText(`🔥 Thưởng Thử Thách:`, leftX, textY);
    this.ctx.textAlign = 'right';
    if (s.qualifiedForChallengeBonus && s.challengeScoreBonus > 0) {
      this.ctx.fillStyle = '#4ade80';
      this.ctx.fillText(`+${Math.round(s.challengeScoreBonus * 100)}% Điểm  |  +${Math.round(s.challengeGoldBonus * 100)}% Vàng`, rightX, textY);
    } else if (!s.qualifiedForChallengeBonus && (s.activeChallenges && s.activeChallenges.length > 0)) {
      this.ctx.fillStyle = '#f87171';
      this.ctx.fillText(`Chưa đạt 2 phút (không kích hoạt bonus)`, rightX, textY);
    } else {
      this.ctx.fillStyle = '#94a3b8';
      this.ctx.fillText(`Không có thử thách`, rightX, textY);
    }

    // Đường kẻ phân cách
    textY += 30;
    this.ctx.strokeStyle = '#3a4d6b';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.moveTo(leftX, textY);
    this.ctx.lineTo(rightX, textY);
    this.ctx.stroke();

    // Điểm số & Tiền thưởng
    textY += 46;
    this.ctx.font = 'bold 26px "Segoe UI", sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillStyle = '#ffd166';
    this.ctx.fillText(`🏆 TỔNG ĐIỂM SỐ:`, leftX, textY);
    this.ctx.textAlign = 'right';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText(`${s.score.toLocaleString()} ĐIỂM`, rightX, textY);

    textY += 44;
    this.ctx.textAlign = 'left';
    this.ctx.fillStyle = '#ffd700';
    this.ctx.fillText(`💰 VÀNG THU THẬP:`, leftX, textY);
    this.ctx.textAlign = 'right';
    this.ctx.fillStyle = '#ffe600';
    this.ctx.fillText(`+${s.goldEarned} Vàng`, rightX, textY);

    textY += 44;
    this.ctx.font = 'bold 20px "Segoe UI", sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillStyle = '#c084fc';
    const charName = s.charName || 'Nhân Vật';
    this.ctx.fillText(`🔮 THÔNG THẠO [${charName}]:`, leftX, textY);
    this.ctx.textAlign = 'right';
    this.ctx.fillStyle = '#fde047';
    if (s.charMastery) {
      this.ctx.fillText(`+${s.score.toLocaleString()} Score  (Cấp ${s.charMastery.level}/100)`, rightX, textY);
    } else {
      this.ctx.fillText(`+${s.score.toLocaleString()} Score`, rightX, textY);
    }
    this.ctx.textAlign = 'left';

    // 2 Nút: Chơi Lại hoặc Về Menu Chính
    const btnW = 320;
    const btnH = 60;
    const retryBtnX = this.canvas.width / 2 + 20;
    const menuBtnX = this.canvas.width / 2 - btnW - 20;
    const btnY = statBoxY + statBoxH + 28;

    // Về Menu
    this.ctx.fillStyle = '#334155';
    this.ctx.fillRect(menuBtnX, btnY, btnW, btnH);
    this.ctx.strokeStyle = '#64748b';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(menuBtnX, btnY, btnW, btnH);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 20px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('🏠 VỀ MENU CHÍNH', menuBtnX + btnW / 2, btnY + 38);
    this.menuButtons.push({ x: menuBtnX, y: btnY, w: btnW, h: btnH, id: 'back_to_menu' });

    // Chơi lại trận này
    this.ctx.fillStyle = '#2d6a4f';
    this.ctx.fillRect(retryBtnX, btnY, btnW, btnH);
    this.ctx.strokeStyle = '#52b788';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(retryBtnX, btnY, btnW, btnH);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText('🔄 CHƠI LẠI TRẬN NÀY', retryBtnX + btnW / 2, btnY + 38);
    this.menuButtons.push({ x: retryBtnX, y: btnY, w: btnW, h: btnH, id: 'start_battle_now' });

    this.ctx.restore();
  }

  // =========================================================================
  // MÀN HÌNH BẢNG TIẾN HÓA SÁCH (BOOK EVOLUTION MODAL) - MỞ RỘNG & DỪNG THỜI GIAN
  // =========================================================================
  renderBookEvolutionModal() {
    if (!this.activeEvolutionModal) return;
    const modal = this.activeEvolutionModal;

    // XỬ LÝ RIÊNG: MODAL THỨC TỈNH ẨN / HỢP THỂ THẦN THOẠI TRONG TRẬN
    if (modal.isAwakening) {
      this.ctx.save();
      this.ctx.fillStyle = 'rgba(6, 4, 10, 0.95)';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      const targetId = modal.targetId;
      const targetDef = BOOK_DEFINITIONS[targetId];
      const isFusion = modal.isFusion;

      const modalW = 1200;
      const modalH = 720;
      const modalX = Math.round((this.canvas.width - modalW) / 2);
      const modalY = Math.round((this.canvas.height - modalH) / 2);

      // Khung bảng hoàng kim lộng lẫy
      this.ctx.fillStyle = 'rgba(16, 12, 25, 0.98)';
      this.ctx.fillRect(modalX, modalY, modalW, modalH);
      this.ctx.strokeStyle = '#ffd700';
      this.ctx.lineWidth = 3.5;
      this.ctx.strokeRect(modalX, modalY, modalW, modalH);

      // Tiêu đề
      this.ctx.fillStyle = isFusion ? '#f59e0b' : '#38bdf8';
      this.ctx.font = 'bold 36px "Segoe UI", serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(
        isFusion ? '🔮 TÁC PHẨM ẨN: HỢP THỂ THẦN THOẠI 🔮' : '🌟 TÁC PHẨM ẨN ĐÃ THỨC TỈNH 🌟',
        this.canvas.width / 2,
        modalY + 58
      );

      this.ctx.fillStyle = '#cbd5e1';
      this.ctx.font = '16px "Segoe UI", sans-serif';
      this.ctx.fillText(
        isFusion
          ? 'Các tác phẩm kinh điển đã dung hợp để khai sinh một Tuyệt Phẩm mới!'
          : 'Bạn đã đạt điều kiện bí ẩn và đánh thức một tác phẩm kinh điển thất truyền!',
        this.canvas.width / 2,
        modalY + 92
      );

      this.ctx.fillStyle = '#38bdf8';
      this.ctx.font = 'bold 13px "Segoe UI", sans-serif';
      this.ctx.fillText('⏱️ TRẬN ĐẤU ĐÃ TẠM DỪNG THỜI GIAN', this.canvas.width / 2, modalY + 118);

      if (isFusion && modal.ingredientIds && modal.ingredientIds.length > 0) {
        // Hợp thể nhiều sách thành phần
        const ingCount = modal.ingredientIds.length;
        const ingCardW = 110;
        const ingCardH = 154;
        const totalIngW = ingCount * ingCardW + (ingCount - 1) * 36;
        const startIngX = modalX + 60 + (440 - totalIngW) / 2;
        const ingY = modalY + 200;

        for (let i = 0; i < ingCount; i++) {
          const ingId = modal.ingredientIds[i];
          const ix = startIngX + i * (ingCardW + 36);
          this.bookSystem.renderBookCard(this.ctx, ingId, ix, ingY, ingCardW, ingCardH, false);
          if (i < ingCount - 1) {
            this.ctx.fillStyle = '#fde047';
            this.ctx.font = 'bold 28px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('+', ix + ingCardW + 18, ingY + ingCardH / 2 + 10);
          }
        }

        // Mũi tên
        this.ctx.fillStyle = '#ffd700';
        this.ctx.font = 'bold 50px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('➔', modalX + 540, ingY + ingCardH / 2 + 12);

        // Thẻ kết quả hợp thể bên phải
        const outW = 180;
        const outH = 252;
        const outX = modalX + 600;
        const outY = modalY + 160;
        this.bookSystem.renderBookCard(this.ctx, targetId, outX, outY, outW, outH, true);

        // Chi tiết tác giả & buffs
        const descX = modalX + 820;
        const maxDescW = modalW - 860;
        this.ctx.textAlign = 'left';
        this.ctx.fillStyle = '#ffd166';
        this.ctx.font = 'bold 24px "Playfair Display", Georgia, serif';
        this.ctx.fillText(targetDef ? targetDef.work : targetId, descX, outY + 36, maxDescW);

        this.ctx.fillStyle = '#cbd5e1';
        this.ctx.font = 'italic 16px "Segoe UI", sans-serif';
        this.ctx.fillText(`✍️ Tác giả: ${targetDef ? targetDef.author : 'Ẩn danh'}`, descX, outY + 70, maxDescW);

        this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.moveTo(descX, outY + 85);
        this.ctx.lineTo(descX + maxDescW, outY + 85);
        this.ctx.stroke();

        this.ctx.fillStyle = '#4ade80';
        this.ctx.font = '14.5px "Segoe UI", sans-serif';
        const buffWords = (targetDef ? (targetDef.desc || targetDef.buffDesc || '') : '').split(' ');
        let bLine = '✨ ';
        let bY = outY + 115;
        for (const w of buffWords) {
          const test = bLine + w + ' ';
          if (this.ctx.measureText(test).width > maxDescW) {
            this.ctx.fillText(bLine, descX, bY);
            bLine = w + ' ';
            bY += 24;
          } else {
            bLine = test;
          }
        }
        if (bLine.trim()) {
          this.ctx.fillText(bLine, descX, bY);
        }
      } else {
        // Độc lập (Camus / Adam Smith)
        const outW = 200;
        const outH = 280;
        const outX = this.canvas.width / 2 - outW / 2;
        const outY = modalY + 150;
        this.bookSystem.renderBookCard(this.ctx, targetId, outX, outY, outW, outH, true);

        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = '#ffd166';
        this.ctx.font = 'bold 26px "Playfair Display", Georgia, serif';
        this.ctx.fillText(targetDef ? targetDef.work : targetId, this.canvas.width / 2, outY + outH + 36);

        this.ctx.fillStyle = '#cbd5e1';
        this.ctx.font = 'italic 16px "Segoe UI", sans-serif';
        this.ctx.fillText(`✍️ Tác giả: ${targetDef ? targetDef.author : 'Ẩn danh'}`, this.canvas.width / 2, outY + outH + 66);

        this.ctx.fillStyle = '#4ade80';
        this.ctx.font = '15px "Segoe UI", sans-serif';
        const buffWords = (targetDef ? (targetDef.desc || targetDef.buffDesc || '') : '').split(' ');
        let bLine = '✨ ';
        let bY = outY + outH + 96;
        for (const w of buffWords) {
          const test = bLine + w + ' ';
          if (this.ctx.measureText(test).width > modalW - 160) {
            this.ctx.fillText(bLine, this.canvas.width / 2, bY);
            bLine = w + ' ';
            bY += 22;
          } else {
            bLine = test;
          }
        }
        if (bLine.trim()) {
          this.ctx.fillText(bLine, this.canvas.width / 2, bY);
        }
      }

      // Nút Tiếp tục trận đấu
      const cBtnW = 340;
      const cBtnH = 56;
      const cBtnX = this.canvas.width / 2 - cBtnW / 2;
      const cBtnY = modalY + modalH - 85;

      this.ctx.fillStyle = '#15803d';
      this.ctx.fillRect(cBtnX, cBtnY, cBtnW, cBtnH);
      this.ctx.strokeStyle = '#4ade80';
      this.ctx.lineWidth = 2.5;
      this.ctx.strokeRect(cBtnX, cBtnY, cBtnW, cBtnH);
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 20px "Segoe UI", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('⚡ TIẾP TỤC TRẬN ĐẤU', cBtnX + cBtnW / 2, cBtnY + 36);

      this.evolutionModalContinueBtn = { x: cBtnX, y: cBtnY, w: cBtnW, h: cBtnH };
      this.ctx.restore();
      return;
    }

    const srcDef = BOOK_DEFINITIONS[modal.sourceId];

    this.ctx.save();

    // Lớp phủ đen ma thuật mờ nền
    this.ctx.fillStyle = 'rgba(6, 4, 10, 0.94)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const isMultiChoice = modal.choices.length > 1;
    const modalW = isMultiChoice ? 1260 : 1160;
    const modalH = 680;
    const modalX = Math.round((this.canvas.width - modalW) / 2);
    const modalY = Math.round((this.canvas.height - modalH) / 2);

    // Khung bảng tiến hóa mở rộng to đẹp, viền vàng kim
    this.ctx.fillStyle = 'rgba(18, 14, 26, 0.98)';
    this.ctx.fillRect(modalX, modalY, modalW, modalH);
    this.ctx.strokeStyle = '#ffd700';
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(modalX, modalY, modalW, modalH);

    // Tiêu đề
    this.ctx.fillStyle = '#ffd700';
    this.ctx.font = 'bold 38px "Segoe UI", serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('⚡ TÁC PHẨM SẴN SÀNG TIẾN CẤP ⚡', this.canvas.width / 2, modalY + 62);

    this.ctx.fillStyle = '#cbd5e1';
    this.ctx.font = '16px "Segoe UI", sans-serif';
    this.ctx.fillText(
      isMultiChoice
        ? 'Hãy chọn 1 trong các hướng phát triển tiếp theo của tác phẩm:'
        : 'Tác phẩm đã sẵn sàng tiến cấp! Bạn muốn tiến cấp ngay hay tạm dừng?',
      this.canvas.width / 2,
      modalY + 95
    );

    // Dòng thông báo dừng thời gian rõ ràng
    this.ctx.fillStyle = '#38bdf8';
    this.ctx.font = 'bold 13px "Segoe UI", sans-serif';
    this.ctx.fillText('⏱️ TRẬN ĐẤU ĐÃ TẠM DỪNG THỜI GIAN', this.canvas.width / 2, modalY + 120);

    this.evolutionChoiceBtns = [];

    if (!isMultiChoice) {
      const targetId = modal.choices[0];
      const targetDef = BOOK_DEFINITIONS[targetId];
      const srcDef = BOOK_DEFINITIONS[modal.sourceId];

      // Thẻ sách hiện tại (Bên trái) - Khổ Dọc Chuẩn To Rõ
      const cardW = 180;
      const cardH = 252;
      const srcX = modalX + 160;
      const cardY = modalY + 160;

      this.ctx.fillStyle = '#fde047';
      this.ctx.font = 'bold 15px "Segoe UI", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('📖 HIỆN TẠI', srcX + cardW / 2, cardY - 14);
      this.bookSystem.renderBookCard(this.ctx, modal.sourceId, srcX, cardY, cardW, cardH, false);

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 16px "Segoe UI", sans-serif';
      this.ctx.fillText(`✍️ ${srcDef ? srcDef.author : ''}`, srcX + cardW / 2, cardY + cardH + 28);
      this.ctx.fillStyle = '#94a3b8';
      this.ctx.font = '13.5px "Segoe UI", sans-serif';
      this.ctx.fillText(srcDef ? (srcDef.desc || srcDef.buffDesc || '') : '', srcX + cardW / 2, cardY + cardH + 54, 320);

      // Mũi tên tiến cấp ở giữa
      this.ctx.fillStyle = '#ffd700';
      this.ctx.font = 'bold 56px sans-serif';
      this.ctx.fillText('➔', this.canvas.width / 2, cardY + cardH / 2 + 10);

      // Thẻ sách tiến cấp mới (Bên phải)
      const targetX = modalX + modalW - cardW - 160;
      this.ctx.fillStyle = '#4ade80';
      this.ctx.font = 'bold 15px "Segoe UI", sans-serif';
      this.ctx.fillText('✨ TIẾN CẤP MỚI', targetX + cardW / 2, cardY - 14);
      this.bookSystem.renderBookCard(this.ctx, targetId, targetX, cardY, cardW, cardH, true);

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 16px "Segoe UI", sans-serif';
      this.ctx.fillText(`✍️ ${targetDef ? targetDef.author : ''}`, targetX + cardW / 2, cardY + cardH + 28);
      this.ctx.fillStyle = '#4ade80';
      this.ctx.font = 'bold 14px "Segoe UI", sans-serif';
      this.ctx.fillText(`✨ ${targetDef ? (targetDef.desc || targetDef.buffDesc || '') : ''}`, targetX + cardW / 2, cardY + cardH + 54, 320);

      // 2 Nút: [⚡ TIẾN HÓA NGAY] và [⏸️ TẠM DỪNG]
      const btnW = 320;
      const btnH = 58;
      const btnY = modalY + modalH - 85;
      const evBtnX = this.canvas.width / 2 - btnW - 20;
      const pauseBtnX = this.canvas.width / 2 + 20;

      // Nút Tiến Hóa Ngay
      this.ctx.fillStyle = '#15803d';
      this.ctx.fillRect(evBtnX, btnY, btnW, btnH);
      this.ctx.strokeStyle = '#4ade80';
      this.ctx.lineWidth = 2.5;
      this.ctx.strokeRect(evBtnX, btnY, btnW, btnH);
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 20px "Segoe UI", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('⚡ TIẾN HÓA NGAY', evBtnX + btnW / 2, btnY + 36);

      this.evolutionChoiceBtns.push({ x: evBtnX, y: btnY, w: btnW, h: btnH, targetId: targetId });

      // Nút Tạm Dừng
      this.ctx.fillStyle = '#1e293b';
      this.ctx.fillRect(pauseBtnX, btnY, btnW, btnH);
      this.ctx.strokeStyle = '#60a5fa';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(pauseBtnX, btnY, btnW, btnH);
      this.ctx.fillStyle = '#93c5fd';
      this.ctx.fillText('⏸️ TẠM DỪNG', pauseBtnX + btnW / 2, btnY + 36);

      this.evolutionModalPauseBtn = { x: pauseBtnX, y: btnY, w: btnW, h: btnH };
    } else {
      // Nhiều lựa chọn (Descartes: Heidegger / Kant hoặc Kant: Hegel / Feuerbach / Nietzsche)
      const count = modal.choices.length;
      const choiceCardW = 280;
      const choiceCardH = 410;
      const gap = 24;
      const startX = modalX + (modalW - (count * choiceCardW + (count - 1) * gap)) / 2;
      const choiceY = modalY + 145;

      for (let i = 0; i < count; i++) {
        const cId = modal.choices[i];
        const cDef = BOOK_DEFINITIONS[cId];
        const cx = startX + i * (choiceCardW + gap);

        this.ctx.fillStyle = 'rgba(25, 30, 42, 0.94)';
        this.ctx.fillRect(cx, choiceY, choiceCardW, choiceCardH);
        this.ctx.strokeStyle = '#eab308';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(cx, choiceY, choiceCardW, choiceCardH);

        // Bìa sách dọc
        const bW = 138;
        const bH = 192;
        const bX = cx + Math.round((choiceCardW - bW) / 2);
        this.bookSystem.renderBookCard(this.ctx, cId, bX, choiceY + 14, bW, bH, true);

        // Tác giả & buffs
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 15px "Segoe UI", sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`✍️ ${cDef ? cDef.author : ''}`, cx + choiceCardW / 2, choiceY + 232);

        this.ctx.fillStyle = '#fde047';
        this.ctx.font = '13px "Segoe UI", sans-serif';
        this.ctx.fillText(cDef ? (cDef.desc || cDef.buffDesc || '') : '', cx + choiceCardW / 2, choiceY + 258, choiceCardW - 24);

        // Nút chọn
        const selectBtnW = 210;
        const selectBtnH = 44;
        const selectBtnX = cx + choiceCardW / 2 - selectBtnW / 2;
        const selectBtnY = choiceY + choiceCardH - 58;

        this.ctx.fillStyle = '#15803d';
        this.ctx.fillRect(selectBtnX, selectBtnY, selectBtnW, selectBtnH);
        this.ctx.strokeStyle = '#4ade80';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(selectBtnX, selectBtnY, selectBtnW, selectBtnH);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 16px "Segoe UI", sans-serif';
        this.ctx.fillText('⚡ CHỌN NHÁNH NÀY', selectBtnX + selectBtnW / 2, selectBtnY + 28);

        this.evolutionChoiceBtns.push({ x: cx, y: choiceY, w: choiceCardW, h: choiceCardH, targetId: cId });
      }

      // Nút Tạm Dừng ở dưới cùng
      const pauseW = 320;
      const pauseH = 50;
      const pauseX = this.canvas.width / 2 - pauseW / 2;
      const pauseY = modalY + modalH - 72;

      this.ctx.fillStyle = '#1e293b';
      this.ctx.fillRect(pauseX, pauseY, pauseW, pauseH);
      this.ctx.strokeStyle = '#60a5fa';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(pauseX, pauseY, pauseW, pauseH);

      this.ctx.fillStyle = '#93c5fd';
      this.ctx.font = 'bold 17px "Segoe UI", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('⏸️ TẠM DỪNG (TIẾN HÓA SAU)', pauseX + pauseW / 2, pauseY + 31);

      this.evolutionModalPauseBtn = { x: pauseX, y: pauseY, w: pauseW, h: pauseH };
    }

    this.ctx.restore();
  }

  // =========================================================================
  // TOAST THÔNG BÁO NỔI BẬT TRONG TRẬN
  // =========================================================================
  renderGameToast() {
    if (!this.gameToast) return;
    this.ctx.save();
    const alpha = Math.min(1.0, this.gameToast.timer * 2.5);
    this.ctx.globalAlpha = alpha;

    const tw = 760;
    const th = 48;
    const tx = (this.canvas.width - tw) / 2;
    const ty = 25;

    this.ctx.fillStyle = 'rgba(12, 10, 20, 0.95)';
    this.ctx.fillRect(tx, ty, tw, th);
    this.ctx.strokeStyle = this.gameToast.color;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(tx, ty, tw, th);

    this.ctx.fillStyle = this.gameToast.color;
    this.ctx.font = 'bold 17px "Segoe UI", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(this.gameToast.text, tx + tw / 2, ty + 30);

    this.ctx.restore();
  }

  // =========================================================================
  // MÀN HÌNH CHỌN SÁCH KHỞI ĐẦU (BOOK SELECTION SCREEN)
  // =========================================================================
  renderBookSelect() {
    this.ctx.save();
    this.menuButtons = [];

    // Nền tối huyền bí thư viện cổ
    this.ctx.fillStyle = '#080b12';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const maxStarters = (this.meta.upgrades.starterBooks ? (1 + this.meta.upgrades.starterBooks.level) : 1);
    const isNoBooksChallenge = !!(this.selectedChallenges && this.selectedChallenges.no_books);

    // Tiêu đề
    this.ctx.fillStyle = '#ffd166';
    this.ctx.font = 'bold 50px "Nunito", "Be Vietnam Pro", serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('CHỌN TÁC PHẨM KHỞI ĐẦU', this.canvas.width / 2, 68);

    if (isNoBooksChallenge) {
      this.ctx.fillStyle = '#ef4444';
      this.ctx.font = 'bold 19px "Nunito", "Be Vietnam Pro", sans-serif';
      this.ctx.fillText('🚫 THỬ THÁCH "CẤM DÙNG SÁCH" ĐANG ĐƯỢC BẬT - Bạn không thể mang theo hoặc nhặt sách trong trận đấu!', this.canvas.width / 2, 108);
    } else {
      this.ctx.fillStyle = '#cbd5e1';
      this.ctx.font = 'bold 18px "Nunito", "Be Vietnam Pro", sans-serif';
      const chosenCount = this.selectedStarterBookIds.length;
      this.ctx.fillText(
        `Bạn có thể mang tối đa ${maxStarters} cuốn sách trước trận (${chosenCount}/${maxStarters} đã chọn) — Cuộn chuột hoặc dùng phím mũi tên để xem:`,
        this.canvas.width / 2,
        108
      );
    }

    // Helper hàm vẽ chữ xuống dòng tự động (multi-line text wrap)
    const drawWrappedText = (text, x, y, maxWidth, lineHeight) => {
      const words = text.split(' ');
      let line = '';
      let curY = y;
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = this.ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
          this.ctx.fillText(line.trim(), x, curY);
          line = words[n] + ' ';
          curY += lineHeight;
        } else {
          line = testLine;
        }
      }
      this.ctx.fillText(line.trim(), x, curY);
    };

    // CAROUSEL BĂNG CHUYỀN NGANG: Phóng to thẻ sách & hiển thị lướt trái/phải mượt mà
    const cardBoxW = 440;
    const cardBoxH = 680;
    const gapX = 28;
    const cardY = 142;
    const step = cardBoxW + gapX;
    this.starterBookCardStep = step;

    const totalContentW = STARTER_BOOK_IDS.length * step - gapX;
    const carouselW = Math.min(this.canvas.width - 200, totalContentW);
    const clipX = Math.round((this.canvas.width - carouselW) / 2);
    const clipW = carouselW;
    const maxScroll = Math.max(0, totalContentW - clipW);
    this.starterBookMaxScrollX = maxScroll;

    // Khởi tạo và làm mượt cuộn trang (Smooth Lerp Scroll)
    if (this.starterBookTargetScrollX === undefined) this.starterBookTargetScrollX = 0;
    if (this.starterBookScrollX === undefined) this.starterBookScrollX = 0;
    this.starterBookTargetScrollX = Math.max(0, Math.min(maxScroll, this.starterBookTargetScrollX));
    this.starterBookScrollX += (this.starterBookTargetScrollX - this.starterBookScrollX) * 0.25;
    if (Math.abs(this.starterBookTargetScrollX - this.starterBookScrollX) < 0.5) {
      this.starterBookScrollX = this.starterBookTargetScrollX;
    }

    // VÙNG CLIP CAROUSEL
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(clipX, cardY - 6, clipW, cardBoxH + 12);
    this.ctx.clip();

    for (let i = 0; i < STARTER_BOOK_IDS.length; i++) {
      const bId = STARTER_BOOK_IDS[i];
      const def = BOOK_DEFINITIONS[bId];
      const bx = clipX + i * step - this.starterBookScrollX;

      // Bỏ qua nếu card nằm hoàn toàn ngoài màn hình hiển thị
      if (bx + cardBoxW < clipX - 50 || bx > clipX + clipW + 50) continue;

      const isSelected = !isNoBooksChallenge && this.selectedStarterBookIds.includes(bId);

      // Thẻ nền
      this.ctx.fillStyle = isSelected ? 'rgba(30, 45, 68, 0.96)' : (isNoBooksChallenge ? 'rgba(12, 14, 20, 0.65)' : 'rgba(15, 23, 42, 0.92)');
      this.ctx.fillRect(bx, cardY, cardBoxW, cardBoxH);
      this.ctx.strokeStyle = isSelected ? '#38bdf8' : (isNoBooksChallenge ? '#1e293b' : '#334155');
      this.ctx.lineWidth = isSelected ? 3.5 : 1.8;
      this.ctx.strokeRect(bx, cardY, cardBoxW, cardBoxH);

      // Nhãn Đang Chọn góc trên
      if (isSelected) {
        this.ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
        this.ctx.fillRect(bx, cardY, cardBoxW, 46);
        this.ctx.fillStyle = '#38bdf8';
        this.ctx.font = 'bold 15px "Nunito", sans-serif';
        this.ctx.textAlign = 'right';
        this.ctx.fillText('✓ ĐANG CHỌN', bx + cardBoxW - 18, cardY + 30);
      }

      // Thẻ bìa sách lớn tỷ lệ 1 : 1.4 (210 x 294px)
      const coverW = 210;
      const coverH = 294;
      const coverX = bx + (cardBoxW - coverW) / 2;
      const coverY = cardY + 28;

      this.ctx.save();
      if (isNoBooksChallenge) this.ctx.globalAlpha = 0.45;
      this.bookSystem.renderBookCard(this.ctx, bId, coverX, coverY, coverW, coverH, isSelected);
      this.ctx.restore();

      // Tên tác giả (Không có icon ✍️, không có chữ cổ viện)
      this.ctx.fillStyle = isNoBooksChallenge ? '#64748b' : '#ffd166';
      this.ctx.font = 'bold 24px "Nunito", "Be Vietnam Pro", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(def ? def.author : '', bx + cardBoxW / 2, cardY + 368);

      // Thuộc tính & Buff hiệu ứng (cỡ chữ 17px, tự động xuống dòng rõ nét)
      this.ctx.fillStyle = isNoBooksChallenge ? '#475569' : '#fde047';
      this.ctx.font = 'bold 17px "Nunito", "Be Vietnam Pro", sans-serif';
      const buffText = def ? (def.desc || def.buffDesc || '') : '';
      drawWrappedText(buffText, bx + cardBoxW / 2, cardY + 412, cardBoxW - 44, 25);

      // Điều kiện tiến cấp bí ẩn
      this.ctx.fillStyle = isNoBooksChallenge ? '#334155' : '#38bdf8';
      this.ctx.font = 'italic 15px "Nunito", "Be Vietnam Pro", sans-serif';
      this.ctx.fillText('🔒 Tiến Cấp: ??? (Điều kiện bí ẩn)', bx + cardBoxW / 2, cardY + 520);

      // Nút Lựa Chọn cỡ lớn (340 x 56px)
      const selectBtnW = 340;
      const selectBtnH = 56;
      const selectBtnX = bx + (cardBoxW - selectBtnW) / 2;
      const selectBtnY = cardY + cardBoxH - 82;

      this.ctx.fillStyle = isNoBooksChallenge ? '#1e293b' : (isSelected ? '#15803d' : '#1e293b');
      this.ctx.fillRect(selectBtnX, selectBtnY, selectBtnW, selectBtnH);
      this.ctx.strokeStyle = isNoBooksChallenge ? '#334155' : (isSelected ? '#4ade80' : '#475569');
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(selectBtnX, selectBtnY, selectBtnW, selectBtnH);

      this.ctx.fillStyle = isNoBooksChallenge ? '#64748b' : (isSelected ? '#ffffff' : '#cbd5e1');
      this.ctx.font = 'bold 20px "Nunito", "Be Vietnam Pro", sans-serif';
      this.ctx.fillText(isNoBooksChallenge ? '🚫 CẤM DÙNG' : (isSelected ? '✓ ĐÃ CHỌN' : 'CHỌN SÁCH'), selectBtnX + selectBtnW / 2, selectBtnY + 36);

      // Chỉ bắt click nếu card nằm trong vùng nhìn thấy của Carousel
      if (!isNoBooksChallenge && (bx + cardBoxW >= clipX && bx <= clipX + clipW)) {
        this.menuButtons.push({ x: bx, y: cardY, w: cardBoxW, h: cardBoxH, id: 'toggle_starter_book_' + bId });
      }
    }

    this.ctx.restore(); // Kết thúc Clip Carousel

    // CÁC NÚT ĐIỀU HƯỚNG MŨI TÊN (◀ và ▶)
    const arrowSize = 64;
    const arrowY = cardY + (cardBoxH - arrowSize) / 2;

    // Mũi tên Trái [◀]
    const leftX = Math.max(16, clipX - arrowSize - 20);
    const canScrollLeft = this.starterBookScrollX > 5;
    this.ctx.fillStyle = canScrollLeft ? 'rgba(30, 41, 59, 0.95)' : 'rgba(15, 23, 42, 0.5)';
    this.ctx.fillRect(leftX, arrowY, arrowSize, arrowSize);
    this.ctx.strokeStyle = canScrollLeft ? '#60a5fa' : '#334155';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(leftX, arrowY, arrowSize, arrowSize);
    this.ctx.fillStyle = canScrollLeft ? '#ffffff' : '#475569';
    this.ctx.font = 'bold 30px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('◀', leftX + arrowSize / 2, arrowY + 44);
    if (canScrollLeft) {
      this.menuButtons.push({ x: leftX, y: arrowY, w: arrowSize, h: arrowSize, id: 'prev_starter_book' });
    }

    // Mũi tên Phải [▶]
    const rightX = Math.min(this.canvas.width - arrowSize - 16, clipX + clipW + 20);
    const canScrollRight = this.starterBookScrollX < maxScroll - 5;
    this.ctx.fillStyle = canScrollRight ? 'rgba(30, 41, 59, 0.95)' : 'rgba(15, 23, 42, 0.5)';
    this.ctx.fillRect(rightX, arrowY, arrowSize, arrowSize);
    this.ctx.strokeStyle = canScrollRight ? '#60a5fa' : '#334155';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(rightX, arrowY, arrowSize, arrowSize);
    this.ctx.fillStyle = canScrollRight ? '#ffffff' : '#475569';
    this.ctx.font = 'bold 30px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('▶', rightX + arrowSize / 2, arrowY + 44);
    if (canScrollRight) {
      this.menuButtons.push({ x: rightX, y: arrowY, w: arrowSize, h: arrowSize, id: 'next_starter_book' });
    }

    // CHẤM BI CHỈ BÁO CUỘN (Scroll Indicator Dots)
    const dotY = cardY + cardBoxH + 20;
    const dotCount = STARTER_BOOK_IDS.length;
    const dotGap = 22;
    const dotsTotalW = (dotCount - 1) * dotGap;
    const dotStartX = this.canvas.width / 2 - dotsTotalW / 2;
    const activeDotIndex = Math.min(dotCount - 1, Math.max(0, Math.round(this.starterBookScrollX / step)));

    for (let d = 0; d < dotCount; d++) {
      const dx = dotStartX + d * dotGap;
      const isDotActive = (d === activeDotIndex);
      this.ctx.beginPath();
      this.ctx.arc(dx, dotY, isDotActive ? 7 : 4, 0, Math.PI * 2);
      this.ctx.fillStyle = isDotActive ? '#38bdf8' : '#475569';
      this.ctx.fill();
      if (isDotActive) {
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();
      }
    }

    // CÁC NÚT HÀNH ĐỘNG DƯỚI CÙNG (Quay Lại / Vào Trận)
    const btnH = 58;
    const btnY = Math.max(dotY + 28, this.canvas.height - 86);

    // Nút Quay Lại (280 x 58px)
    const backW = 280;
    const backX = this.canvas.width / 2 - 340;
    this.ctx.fillStyle = '#1e293b';
    this.ctx.fillRect(backX, btnY, backW, btnH);
    this.ctx.strokeStyle = '#64748b';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(backX, btnY, backW, btnH);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 20px "Nunito", "Be Vietnam Pro", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('⬅ QUAY LẠI', backX + backW / 2, btnY + 36);
    this.menuButtons.push({ x: backX, y: btnY, w: backW, h: btnH, id: 'back_to_diff_select' });

    // Nút Vào Trận (360 x 58px)
    const startW = 360;
    const startXBtn = this.canvas.width / 2 + 40;
    this.ctx.fillStyle = '#b91c1c';
    this.ctx.fillRect(startXBtn, btnY, startW, btnH);
    this.ctx.strokeStyle = '#ef4444';
    this.ctx.lineWidth = 2.5;
    this.ctx.strokeRect(startXBtn, btnY, startW, btnH);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 22px "Nunito", "Be Vietnam Pro", sans-serif';
    this.ctx.fillText('🔥 VÀO TRẬN ĐẤU 🔥', startXBtn + startW / 2, btnY + 37);
    this.menuButtons.push({ x: startXBtn, y: btnY, w: startW, h: btnH, id: 'start_battle_from_books' });

    this.ctx.restore();
  }

  // =========================================================================
  // MÀN HÌNH THƯ VIỆN ĐẠI TÁC PHẨM (BOOK CODEX)
  // =========================================================================
  renderCodex() {
    this.ctx.save();
    this.menuButtons = [];

    // Nền tối huyền bí thư viện cổ điển
    this.ctx.fillStyle = '#06080e';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const allBookIds = Object.keys(BOOK_DEFINITIONS);
    const unlockedCount = allBookIds.filter(id => this.bookSystem.unlockedCodex.has(id)).length;

    // Phân loại danh mục sách chính xác & tự động theo thuộc tính
    const starterBooks = allBookIds.filter(id => STARTER_BOOK_IDS.includes(id));
    const specialOrFusionBooks = allBookIds.filter(id => {
      const def = BOOK_DEFINITIONS[id];
      return def && (def.tier === 'special' || def.tier === 'fusion' || !!def.fusionIngredients || id === 'camus' || id === 'adam_smith' || id === 'sartre');
    });
    const evolvedBooks = allBookIds.filter(id => !starterBooks.includes(id) && !specialOrFusionBooks.includes(id));

    // Tiêu đề
    this.ctx.fillStyle = '#ffd166';
    this.ctx.font = 'bold 48px "Nunito", "Be Vietnam Pro", serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('📖 THƯ VIỆN TÁC PHẨM', this.canvas.width / 2, 68);

    this.ctx.fillStyle = '#cbd5e1';
    this.ctx.font = 'bold 18px "Nunito", "Be Vietnam Pro", sans-serif';
    this.ctx.fillText(`Tổng hợp ${allBookIds.length} Tác Phẩm Kinh Điển. Đã khám phá: ${unlockedCount}/${allBookIds.length} Sách`, this.canvas.width / 2, 102);

    // Các Tab Lọc Thư Viện: Tất Cả (49) | Khởi Đầu (11) | Tiến Hóa (20) | Hợp Thể & Đặc Biệt (18)
    const tabs = [
      { id: 'all', label: `TẤT CẢ (${allBookIds.length})` },
      { id: 'starter', label: `KHỞI ĐẦU (${starterBooks.length})` },
      { id: 'evolved', label: `TIẾN HÓA (${evolvedBooks.length})` },
      { id: 'fusion', label: `HỢP THỂ & ĐẶC BIỆT (${specialOrFusionBooks.length})` }
    ];

    const tabW = 230;
    const tabH = 44;
    const tabGap = 16;
    const totalTabW = tabs.length * tabW + (tabs.length - 1) * tabGap;
    const tabStartX = this.canvas.width / 2 - totalTabW / 2;
    const tabY = 126;

    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i];
      const tx = tabStartX + i * (tabW + tabGap);
      const isAct = this.codexFilter === tab.id;

      this.ctx.fillStyle = isAct ? '#854d0e' : '#1e293b';
      this.ctx.fillRect(tx, tabY, tabW, tabH);
      this.ctx.strokeStyle = isAct ? '#ffd700' : '#475569';
      this.ctx.lineWidth = isAct ? 2.5 : 1.2;
      this.ctx.strokeRect(tx, tabY, tabW, tabH);

      this.ctx.fillStyle = isAct ? '#fef08a' : '#cbd5e1';
      this.ctx.font = 'bold 16px "Nunito", "Be Vietnam Pro", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(tab.label, tx + tabW / 2, tabY + 28);

      this.menuButtons.push({ x: tx, y: tabY, w: tabW, h: tabH, id: 'filter_codex_' + tab.id });
    }

    // Lọc danh sách sách theo tab
    let displayIds = allBookIds;
    if (this.codexFilter === 'starter') {
      displayIds = starterBooks;
    } else if (this.codexFilter === 'evolved') {
      displayIds = evolvedBooks;
    } else if (this.codexFilter === 'fusion') {
      displayIds = specialOrFusionBooks;
    }

    // VÙNG TRƯNG BÀY BĂNG CHUYỀN LƯỚI NGANG TRÊN DƯỚI (GALLERY 6 CỘT)
    const clipX = 70;
    const clipY = 188;
    const clipW = this.canvas.width - 140;
    const clipH = this.canvas.height - 300;

    const cols = 6;
    const gapX = 24;
    const gapY = 24;
    const cardW = Math.floor((clipW - (cols - 1) * gapX) / cols);
    const coverW = 168;
    const coverH = 235; // Tỉ lệ 1 : 1.4 chuẩn bìa sách
    const cardH = coverH + 52;
    const startX = clipX;

    const totalRows = Math.ceil(displayIds.length / cols);
    const totalContentH = totalRows * (cardH + gapY) + 20;
    const maxScroll = Math.max(0, totalContentH - clipH);
    this.codexMaxScrollY = maxScroll;
    this.codexScrollY = Math.max(0, Math.min(maxScroll, this.codexScrollY || 0));

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(clipX, clipY, clipW, clipH);
    this.ctx.clip();

    for (let i = 0; i < displayIds.length; i++) {
      const bId = displayIds[i];
      const def = BOOK_DEFINITIONS[bId];
      const col = i % cols;
      const row = Math.floor(i / cols);

      const cx = startX + col * (cardW + gapX);
      const cy = clipY + 10 + row * (cardH + gapY) - this.codexScrollY;

      if (cy + cardH < clipY || cy > clipY + clipH) continue; // Culling

      const isUnlocked = this.bookSystem.unlockedCodex.has(bId);
      const coverX = cx + Math.round((cardW - coverW) / 2);
      const coverY = cy + 4;

      if (isUnlocked) {
        // Nền thẻ kính mờ sang trọng
        this.ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
        this.ctx.fillRect(cx, cy, cardW, cardH);
        this.ctx.strokeStyle = '#334155';
        this.ctx.lineWidth = 1.2;
        this.ctx.strokeRect(cx, cy, cardW, cardH);

        // 1. Bìa sách trung tâm (Không chữ thừa ở trên, tên ở giữa, năm ở dưới)
        this.bookSystem.renderBookCard(this.ctx, bId, coverX, coverY, coverW, coverH, false);

        // 2. Tên tác giả màu vàng bên dưới bìa sách (Theo đúng Ảnh 1)
        this.ctx.fillStyle = '#ffd166';
        this.ctx.font = 'bold 18px "Nunito", "Be Vietnam Pro", sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(def.author, cx + cardW / 2, coverY + coverH + 32, cardW - 14);

        // Đăng ký tương tác bấm vào để xem full chi tiết (giới hạn tuyệt đối trong vùng hiển thị clip)
        const btnY = Math.max(clipY, cy);
        const btnBottom = Math.min(clipY + clipH, cy + cardH);
        const btnH = btnBottom - btnY;
        if (btnH >= 35) {
          this.menuButtons.push({ x: cx, y: btnY, w: cardW, h: btnH, id: 'codex_inspect_' + bId });
        }
      } else {
        // Thẻ đang khóa
        this.ctx.fillStyle = 'rgba(10, 15, 26, 0.45)';
        this.ctx.fillRect(cx, cy, cardW, cardH);
        this.ctx.strokeStyle = '#1e293b';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(cx, cy, cardW, cardH);

        // Khung bìa sách da bóng silhouette cổ điển
        const bookGrad = this.ctx.createLinearGradient(coverX, coverY, coverX + coverW, coverY + coverH);
        bookGrad.addColorStop(0, '#1e293b');
        bookGrad.addColorStop(1, '#0f172a');
        this.ctx.fillStyle = bookGrad;
        this.ctx.fillRect(coverX, coverY, coverW, coverH);

        // Gáy sách & viền
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.fillRect(coverX, coverY, 6, coverH);
        this.ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(coverX + 8, coverY + 8, coverW - 16, coverH - 16);

        // Ổ khóa vàng nổi bật
        this.ctx.fillStyle = '#fbbf24';
        this.ctx.font = '36px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('🔒', coverX + coverW / 2, coverY + coverH / 2 - 4);

        this.ctx.fillStyle = '#94a3b8';
        this.ctx.font = 'bold 12px "Nunito", sans-serif';
        this.ctx.fillText('CHƯA KHÁM PHÁ', coverX + coverW / 2, coverY + coverH / 2 + 32);

        // Tác giả bên dưới
        this.ctx.fillStyle = '#94a3b8';
        this.ctx.font = 'bold 17px "Nunito", "Be Vietnam Pro", sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('???', cx + cardW / 2, coverY + coverH + 26);

        this.ctx.fillStyle = '#64748b';
        this.ctx.font = '13px "Nunito", "Be Vietnam Pro", sans-serif';
        this.ctx.fillText('Tác giả: Ẩn Danh', cx + cardW / 2, coverY + coverH + 46);

        // Giới hạn tuyệt đối trong vùng hiển thị clip
        const btnY = Math.max(clipY, cy);
        const btnBottom = Math.min(clipY + clipH, cy + cardH);
        const btnH = btnBottom - btnY;
        if (btnH >= 35) {
          this.menuButtons.push({ x: cx, y: btnY, w: cardW, h: btnH, id: 'codex_inspect_' + bId });
        }
      }
    }

    this.ctx.restore();

    // THANH ĐIỀU KHIỂN & ĐIỀU HƯỚNG DƯỚI CÙNG (Dải nền cố định nổi khối, không bị chìm)
    const footerH = 92;
    const footerY = this.canvas.height - footerH;

    this.ctx.fillStyle = 'rgba(8, 11, 20, 0.95)';
    this.ctx.fillRect(0, footerY, this.canvas.width, footerH);
    this.ctx.strokeStyle = 'rgba(51, 65, 85, 0.65)';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.moveTo(0, footerY);
    this.ctx.lineTo(this.canvas.width, footerY);
    this.ctx.stroke();

    // Nút Quay Về Menu Chính (Nổi bật, sáng rõ, kích thước lớn)
    const backBtnW = 320;
    const backBtnH = 54;
    const backBtnX = 70;
    const backBtnY = footerY + Math.round((footerH - backBtnH) / 2);

    this.ctx.fillStyle = '#334155';
    this.ctx.fillRect(backBtnX, backBtnY, backBtnW, backBtnH);
    this.ctx.strokeStyle = '#94a3b8';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(backBtnX, backBtnY, backBtnW, backBtnH);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 19px "Nunito", "Be Vietnam Pro", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('⬅ QUAY VỀ MENU CHÍNH', backBtnX + backBtnW / 2, backBtnY + 35);
    this.menuButtons.push({ x: backBtnX, y: backBtnY, w: backBtnW, h: backBtnH, id: 'back_to_menu' });

    // Nút Cuộn Lên / Cuộn Xuống (Căn giữa cân đối trong thanh điều khiển)
    const scrollBtnW = 200;
    const scrollBtnH = 50;
    const scrollBtnY = footerY + Math.round((footerH - scrollBtnH) / 2);
    const scrollGap = 28;

    // Nút Cuộn Lên
    const upBtnX = this.canvas.width / 2 - scrollBtnW - scrollGap / 2;
    const canScrollUp = this.codexScrollY > 5;
    this.ctx.fillStyle = canScrollUp ? '#1e293b' : 'rgba(15, 23, 42, 0.5)';
    this.ctx.fillRect(upBtnX, scrollBtnY, scrollBtnW, scrollBtnH);
    this.ctx.strokeStyle = canScrollUp ? '#64748b' : '#334155';
    this.ctx.lineWidth = 1.5;
    this.ctx.strokeRect(upBtnX, scrollBtnY, scrollBtnW, scrollBtnH);
    this.ctx.fillStyle = canScrollUp ? '#ffd166' : '#475569';
    this.ctx.font = 'bold 16px "Nunito", "Be Vietnam Pro", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('▲ CUỘN LÊN', upBtnX + scrollBtnW / 2, scrollBtnY + 31);
    if (canScrollUp) {
      this.menuButtons.push({ x: upBtnX, y: scrollBtnY, w: scrollBtnW, h: scrollBtnH, id: 'codex_scroll_up' });
    }

    // Nút Cuộn Xuống
    const downBtnX = this.canvas.width / 2 + scrollGap / 2;
    const canScrollDown = this.codexScrollY < maxScroll - 5;
    this.ctx.fillStyle = canScrollDown ? '#1e293b' : 'rgba(15, 23, 42, 0.5)';
    this.ctx.fillRect(downBtnX, scrollBtnY, scrollBtnW, scrollBtnH);
    this.ctx.strokeStyle = canScrollDown ? '#64748b' : '#334155';
    this.ctx.lineWidth = 1.5;
    this.ctx.strokeRect(downBtnX, scrollBtnY, scrollBtnW, scrollBtnH);
    this.ctx.fillStyle = canScrollDown ? '#ffd166' : '#475569';
    this.ctx.font = 'bold 16px "Nunito", "Be Vietnam Pro", sans-serif';
    this.ctx.fillText('▼ CUỘN XUỐNG', downBtnX + scrollBtnW / 2, scrollBtnY + 31);
    if (canScrollDown) {
      this.menuButtons.push({ x: downBtnX, y: scrollBtnY, w: scrollBtnW, h: scrollBtnH, id: 'codex_scroll_down' });
    }

    // Modal Xem Chi Tiết Tác Phẩm nếu người chơi đã nhấp vào một cuốn sách
    if (this.selectedCodexBook) {
      this.renderCodexDetailModal(this.selectedCodexBook);
    }

    this.ctx.restore();
  }

  // =========================================================================
  // MODAL CHI TIẾT TÁC PHẨM TRONG THƯ VIỆN CODEX (ĐÃ BỎ NÚT "ĐÃ HIỂU", BỎ CHỮ TRÊN BÌA)
  // =========================================================================
  renderCodexDetailModal(bId) {
    const def = BOOK_DEFINITIONS[bId];
    if (!def) return;

    this.ctx.save();

    // Nền mờ bao phủ
    this.ctx.fillStyle = 'rgba(5, 7, 14, 0.90)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const isUnlocked = this.bookSystem.unlockedCodex.has(bId);
    const modalW = 1040;
    const modalH = 580;
    const modalX = Math.round((this.canvas.width - modalW) / 2);
    const modalY = Math.round((this.canvas.height - modalH) / 2);
    this.codexDetailBox = { x: modalX, y: modalY, w: modalW, h: modalH };

    // Khung bảng hoàng gia viền vàng lấp lánh
    this.ctx.fillStyle = 'rgba(16, 22, 34, 0.98)';
    this.ctx.fillRect(modalX, modalY, modalW, modalH);
    this.ctx.strokeStyle = '#ffd700';
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(modalX, modalY, modalW, modalH);

    // Nút đóng ✕ ở góc trên bên phải (Thay thế cho nút "ĐÃ HIỂU" thừa thãi)
    const closeBtnSize = 44;
    const closeBtnX = modalX + modalW - closeBtnSize - 20;
    const closeBtnY = modalY + 20;
    this.ctx.fillStyle = '#1e293b';
    this.ctx.fillRect(closeBtnX, closeBtnY, closeBtnSize, closeBtnSize);
    this.ctx.strokeStyle = '#475569';
    this.ctx.lineWidth = 1.5;
    this.ctx.strokeRect(closeBtnX, closeBtnY, closeBtnSize, closeBtnSize);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 24px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('✕', closeBtnX + closeBtnSize / 2, closeBtnY + 31);
    this.codexDetailCloseBtn = { x: closeBtnX, y: closeBtnY, w: closeBtnSize, h: closeBtnSize };
    this.menuButtons.push({ x: closeBtnX, y: closeBtnY, w: closeBtnSize, h: closeBtnSize, id: 'close_codex_detail' });

    // Bìa sách lớn bên trái (Khổ dọc portrait 1 : 1.4)
    const coverW = 200;
    const coverH = 280;
    const coverX = modalX + 50;
    const coverY = modalY + 60;

    if (isUnlocked) {
      this.bookSystem.renderBookCard(this.ctx, bId, coverX, coverY, coverW, coverH, true);
    } else {
      // Silhouette bìa sách khóa
      const bookGrad = this.ctx.createLinearGradient(coverX, coverY, coverX + coverW, coverY + coverH);
      bookGrad.addColorStop(0, '#1e293b');
      bookGrad.addColorStop(1, '#0f172a');
      this.ctx.fillStyle = bookGrad;
      this.ctx.fillRect(coverX, coverY, coverW, coverH);
      this.ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeRect(coverX + 10, coverY + 10, coverW - 20, coverH - 20);
      this.ctx.fillStyle = '#fbbf24';
      this.ctx.font = '48px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('🔒', coverX + coverW / 2, coverY + coverH / 2);
    }

    // Khu vực thông tin bên phải
    const infoX = coverX + coverW + 45;
    const maxInfoW = modalW - (coverW + 155);

    // Helper vẽ văn bản tự động xuống dòng
    const drawWrappedText = (text, x, y, maxWidth, lineHeight) => {
      const words = text.split(' ');
      let curLine = '';
      let curY = y;
      for (let n = 0; n < words.length; n++) {
        const testLine = curLine + words[n] + ' ';
        if (this.ctx.measureText(testLine).width > maxWidth && n > 0) {
          this.ctx.fillText(curLine.trim(), x, curY);
          curLine = words[n] + ' ';
          curY += lineHeight;
        } else {
          curLine = testLine;
        }
      }
      this.ctx.fillText(curLine.trim(), x, curY);
      return curY + lineHeight;
    };

    if (!isUnlocked) {
      // Thông tin sách chưa mở khóa
      this.ctx.fillStyle = '#94a3b8';
      this.ctx.font = 'bold 34px "Playfair Display", Georgia, serif';
      this.ctx.textAlign = 'left';
      this.ctx.fillText('Tác Phẩm Chưa Khám Phá', infoX, modalY + 80, maxInfoW);

      this.ctx.fillStyle = '#64748b';
      this.ctx.font = 'bold 18px "Nunito", sans-serif';
      this.ctx.fillText('Tác giả: Ẩn Danh', infoX, modalY + 120);

      this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.moveTo(infoX, modalY + 140);
      this.ctx.lineTo(modalX + modalW - 50, modalY + 140);
      this.ctx.stroke();

      this.ctx.fillStyle = '#fbbf24';
      this.ctx.font = 'bold 18px "Nunito", sans-serif';
      this.ctx.fillText('🔒 HƯỚNG DẪN MỞ KHÓA:', infoX, modalY + 185);

      this.ctx.fillStyle = '#cbd5e1';
      this.ctx.font = '16px "Nunito", sans-serif';
      drawWrappedText('Hãy thu thập tác phẩm này trong trận đấu hoặc hoàn thành điều kiện tiến cấp để giải phóng toàn bộ sức mạnh và ghi danh vào Thư Viện!', infoX, modalY + 220, maxInfoW, 28);
    } else {
      // 1. Tên tác phẩm ngôn ngữ gốc (Không có chữ thừa ở trên)
      this.ctx.fillStyle = '#ffd166';
      this.ctx.font = 'bold 34px "Playfair Display", "Nunito", Georgia, serif';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(def.work, infoX, modalY + 80, maxInfoW);

      // 2. Tác giả
      this.ctx.fillStyle = '#cbd5e1';
      this.ctx.font = 'bold 20px "Nunito", "Be Vietnam Pro", sans-serif';
      this.ctx.fillText(`Tác giả: ${def.author}`, infoX, modalY + 120);

      // Đường kẻ phân cách vàng kim
      this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.35)';
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.moveTo(infoX, modalY + 140);
      this.ctx.lineTo(modalX + modalW - 50, modalY + 140);
      this.ctx.stroke();

      // 3. Hiệu lực & Chỉ số Buff vĩnh viễn (Chữ to, rõ nét, màu ngọc lục bảo)
      this.ctx.fillStyle = '#f59e0b';
      this.ctx.font = 'bold 16px "Nunito", "Be Vietnam Pro", sans-serif';
      this.ctx.fillText('✨ HIỆU LỰC & CHỈ SỐ BUFF (VĨNH VIỄN):', infoX, modalY + 175);

      this.ctx.fillStyle = '#4ade80';
      this.ctx.font = 'bold 17px "Nunito", "Be Vietnam Pro", sans-serif';
      const buffText = def.desc || def.buffDesc || '';
      const nextY = drawWrappedText(buffText, infoX, modalY + 208, maxInfoW, 26);

      // 4. LOGIC TIẾN HÓA THEO ĐÚNG YÊU CẦU:
      // - Nếu là sách A (Khởi đầu): HOÀN TOÀN KHÔNG HIỆN CÁCH LÊN B!
      // - Nếu là sách B (Tiến hóa): HIỆN RÕ CÁCH TỪ A BIẾN THÀNH B!
      const isStarterBook = STARTER_BOOK_IDS.includes(bId);

      if (isStarterBook) {
        // Tác phẩm A: Chỉ hiện thông báo tác phẩm khởi đầu thanh nhã
        this.ctx.fillStyle = '#94a3b8';
        this.ctx.font = 'italic 15px "Nunito", "Be Vietnam Pro", sans-serif';
        this.ctx.fillText('📖 Tác phẩm bậc khởi đầu. Hãy mang theo trong trận đấu để tự mình khám phá bí ẩn tiến cấp!', infoX, Math.max(nextY + 25, modalY + 310));
      } else {
        // Tác phẩm B hoặc Hợp thể: Truy tìm tác phẩm nguồn gốc A
        let sourceBook = null;
        let condText = '';

        for (const [srcId, srcDef] of Object.entries(BOOK_DEFINITIONS)) {
          if (srcDef.evolutionTarget === bId) {
            sourceBook = srcDef;
            if (srcDef.reqKillCount) condText = `Tiêu diệt đủ ${srcDef.reqKillCount} quái vật`;
            if (srcDef.reqTime) condText = `Sinh tồn ít nhất ${srcDef.reqTime} giây`;
            if (srcDef.timeLimitSeconds) condText = `Tiêu diệt ${srcDef.reqKillCount} quái vật trong ${srcDef.timeLimitSeconds} giây`;
            if (srcDef.evolutionDesc) condText = srcDef.evolutionDesc;
            break;
          } else if (srcDef.branchTargets && srcDef.branchTargets.includes(bId)) {
            sourceBook = srcDef;
            if (srcDef.reqKillCount) condText = `Tiêu diệt đủ ${srcDef.reqKillCount} quái vật`;
            if (srcDef.evolutionDesc) condText = srcDef.evolutionDesc;
            break;
          }
        }

        let originText = '';
        if (def.fusionIngredients && def.fusionIngredients.length > 0) {
          const ingNames = def.fusionIngredients.map(id => {
            const b = BOOK_DEFINITIONS[id];
            return b ? `[${b.work}] (${b.author}, Cấp 5)` : id;
          }).join('  +  ');
          originText = `Hợp thể Thần Thoại từ 2 tác phẩm: ${ingNames}.`;
        } else if (sourceBook) {
          originText = `Tiến hóa từ tác phẩm [${sourceBook.work}] (${sourceBook.author}) khi nâng cấp tối đa${condText ? ' + ' + condText : ''}.`;
        } else if (def.evolutionDesc) {
          originText = `Điều kiện tiến cấp: ${def.evolutionDesc}.`;
        } else {
          originText = 'Thức tỉnh theo điều kiện bí ẩn trong trận chiến.';
        }

        const evoY = Math.max(nextY + 25, modalY + 300);
        this.ctx.fillStyle = '#c084fc';
        this.ctx.font = 'bold 16px "Nunito", "Be Vietnam Pro", sans-serif';
        this.ctx.fillText('⚡ CÔNG THỨC & NGUỒN GỐC TIẾN HÓA:', infoX, evoY);

        this.ctx.fillStyle = '#e9d5ff';
        this.ctx.font = 'bold 16px "Nunito", "Be Vietnam Pro", sans-serif';
        drawWrappedText(originText, infoX, evoY + 30, maxInfoW, 25);
      }
    }

    this.ctx.restore();
  }

  // =========================================================================
  // GIAO DIỆN BẢNG VÀNG THÀNH TỰU & DANH HIỆU (ACHIEVEMENTS UI 1080p FULL HD)
  // =========================================================================
  renderAchievements() {
    this.ctx.save();

    // 1. Nền vũ trụ huyền bí ma thuật
    const bgGrad = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    bgGrad.addColorStop(0, '#060814');
    bgGrad.addColorStop(0.5, '#0c1527');
    bgGrad.addColorStop(1, '#05070e');
    this.ctx.fillStyle = bgGrad;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Vầng hào quang sáng nhẹ
    this.ctx.fillStyle = 'rgba(45, 212, 191, 0.035)';
    this.ctx.beginPath();
    this.ctx.arc(this.canvas.width / 2, 80, 520, 0, Math.PI * 2);
    this.ctx.fill();

    const stats = this.achievementSystem.getStats();

    // 2. Tiêu đề chính
    this.ctx.fillStyle = '#ffd166';
    this.ctx.font = 'bold 46px "Nunito", "Be Vietnam Pro", serif';
    this.ctx.textAlign = 'center';
    this.ctx.shadowColor = '#d4af37';
    this.ctx.shadowBlur = 20;
    this.ctx.fillText('🏆 THÀNH TỰU & DANH HIỆU', this.canvas.width / 2, 64);
    this.ctx.shadowBlur = 0;

    this.ctx.fillStyle = '#94a3b8';
    this.ctx.font = 'bold 16px "Nunito", "Be Vietnam Pro", sans-serif';
    this.ctx.fillText('Chinh phục thử thách để nhận vĩnh viễn % Kinh Nghiệm (EXP) cho mọi trận đấu! (Tối đa +37% EXP)', this.canvas.width / 2, 94);

    // 3. Khung Tổng Quan Tiến Độ (Progress Bar)
    const ovW = 600;
    const ovH = 26;
    const ovX = this.canvas.width / 2 - ovW / 2;
    const ovY = 112;

    this.ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    this.ctx.fillRect(ovX, ovY, ovW, ovH);
    this.ctx.strokeStyle = '#334155';
    this.ctx.lineWidth = 1.5;
    this.ctx.strokeRect(ovX, ovY, ovW, ovH);

    // Fill
    const fillW = Math.round((stats.percent / 100) * ovW);
    if (fillW > 0) {
      const fillGrad = this.ctx.createLinearGradient(ovX, 0, ovX + ovW, 0);
      fillGrad.addColorStop(0, '#0d9488');
      fillGrad.addColorStop(1, '#2dd4bf');
      this.ctx.fillStyle = fillGrad;
      this.ctx.fillRect(ovX + 1, ovY + 1, Math.min(ovW - 2, fillW), ovH - 2);
    }

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 14px "Nunito", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`Tiến độ: ${stats.unlockedCount}/${stats.total} (${stats.percent}%)   |   ✨ Buff Kích Hoạt: +${stats.totalExpPercent}% EXP Vĩnh Viễn`, this.canvas.width / 2, ovY + 18);

    // 4. Các Tab Lọc Danh Mục: TẤT CẢ | CHIẾN ĐẤU | SINH TỒN | TRÙM CUỐI | SƯU TẦM
    const tabs = ACHIEVEMENT_CATEGORIES;
    const tabW = 210;
    const tabH = 42;
    const tabGap = 16;
    const totalTabW = tabs.length * tabW + (tabs.length - 1) * tabGap;
    const tabStartX = this.canvas.width / 2 - totalTabW / 2;
    const tabY = 152;

    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i];
      const tx = tabStartX + i * (tabW + tabGap);
      const isAct = this.achievementCategory === tab.id;

      this.ctx.fillStyle = isAct ? '#0f766e' : '#1e293b';
      this.ctx.fillRect(tx, tabY, tabW, tabH);
      this.ctx.strokeStyle = isAct ? '#2dd4bf' : '#475569';
      this.ctx.lineWidth = isAct ? 2.5 : 1.2;
      this.ctx.strokeRect(tx, tabY, tabW, tabH);

      this.ctx.fillStyle = isAct ? '#f0fdfa' : '#cbd5e1';
      this.ctx.font = 'bold 16px "Nunito", "Be Vietnam Pro", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(tab.label, tx + tabW / 2, tabY + 27);

      this.menuButtons.push({ x: tx, y: tabY, w: tabW, h: tabH, id: 'filter_achievement_' + tab.id });
    }

    // 5. Lưới Danh Sách Thành Tựu (2 CỘT)
    const displayList = this.achievementSystem.getByCategory(this.achievementCategory);

    const clipX = 100;
    const clipY = 210;
    const clipW = this.canvas.width - 200;
    const clipH = this.canvas.height - 315;

    const cols = 2;
    const cardGapX = 24;
    const cardGapY = 16;
    const cardW = Math.floor((clipW - cardGapX) / cols);
    const cardH = 136;

    const totalRows = Math.ceil(displayList.length / cols);
    const totalContentH = totalRows * (cardH + cardGapY) + 20;
    const maxScroll = Math.max(0, totalContentH - clipH);
    this.achievementMaxScrollY = maxScroll;
    this.achievementScrollY = Math.max(0, Math.min(maxScroll, this.achievementScrollY || 0));

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(clipX, clipY, clipW, clipH);
    this.ctx.clip();

    for (let i = 0; i < displayList.length; i++) {
      const ach = displayList[i];
      const col = i % cols;
      const row = Math.floor(i / cols);

      const cx = clipX + col * (cardW + cardGapX);
      const cy = clipY + 8 + row * (cardH + cardGapY) - this.achievementScrollY;

      // Culling
      if (cy + cardH < clipY || cy > clipY + clipH) continue;

      const isUnlocked = this.achievementSystem.isUnlocked(ach.id);
      const progress = this.achievementSystem.getProgress(ach.id);
      const goal = ach.goal;
      const pct = Math.min(100, Math.round((progress / goal) * 100));

      // Thẻ thành tựu
      this.ctx.fillStyle = isUnlocked ? 'rgba(20, 36, 58, 0.90)' : 'rgba(15, 23, 42, 0.72)';
      this.ctx.fillRect(cx, cy, cardW, cardH);
      this.ctx.strokeStyle = isUnlocked ? '#38bdf8' : '#334155';
      this.ctx.lineWidth = isUnlocked ? 2.0 : 1.2;
      this.ctx.strokeRect(cx, cy, cardW, cardH);

      // Icon Box bên trái
      const iconBoxSize = 90;
      const iconBoxX = cx + 18;
      const iconBoxY = cy + Math.round((cardH - iconBoxSize) / 2);

      this.ctx.fillStyle = isUnlocked ? 'rgba(12, 74, 110, 0.65)' : 'rgba(30, 41, 59, 0.65)';
      this.ctx.fillRect(iconBoxX, iconBoxY, iconBoxSize, iconBoxSize);
      this.ctx.strokeStyle = isUnlocked ? '#0284c7' : '#475569';
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeRect(iconBoxX, iconBoxY, iconBoxSize, iconBoxSize);

      // Icon biểu tượng
      this.ctx.font = '44px "Segoe UI Emoji", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(ach.icon || '🏆', iconBoxX + iconBoxSize / 2, iconBoxY + 60);

      // Nội dung bên phải
      const textX = iconBoxX + iconBoxSize + 20;
      const maxTextW = cardW - iconBoxSize - 230;

      // Tên thành tựu
      this.ctx.textAlign = 'left';
      this.ctx.fillStyle = isUnlocked ? '#ffd166' : '#e2e8f0';
      this.ctx.font = 'bold 22px "Nunito", "Be Vietnam Pro", sans-serif';
      this.ctx.fillText(ach.name, textX, cy + 34);

      // Mô tả điều kiện
      this.ctx.fillStyle = isUnlocked ? '#cbd5e1' : '#94a3b8';
      this.ctx.font = '15px "Nunito", "Be Vietnam Pro", sans-serif';
      this.ctx.fillText(ach.desc, textX, cy + 62);

      // Độ khó & Phần thưởng (% EXP)
      if (ach.reward && ach.reward.desc) {
        const badgeY = cy + 78;
        const diffText = ach.difficulty === 'hard' ? 'KHÓ' : (ach.difficulty === 'medium' ? 'TRUNG BÌNH' : 'DỄ');
        const diffColor = ach.difficulty === 'hard' ? '#f43f5e' : (ach.difficulty === 'medium' ? '#f59e0b' : '#38bdf8');
        const diffBg = ach.difficulty === 'hard' ? 'rgba(244, 63, 94, 0.18)' : (ach.difficulty === 'medium' ? 'rgba(245, 158, 11, 0.18)' : 'rgba(56, 189, 248, 0.18)');

        // Tag độ khó
        const tagW = 95;
        this.ctx.fillStyle = diffBg;
        this.ctx.fillRect(textX, badgeY, tagW, 26);
        this.ctx.strokeStyle = diffColor;
        this.ctx.lineWidth = 1.2;
        this.ctx.strokeRect(textX, badgeY, tagW, 26);

        this.ctx.fillStyle = diffColor;
        this.ctx.font = 'bold 12px "Nunito", sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`[${diffText}]`, textX + tagW / 2, badgeY + 17);

        // Badge phần thưởng
        const rewX = textX + tagW + 8;
        const rewW = maxTextW - tagW - 8;
        this.ctx.fillStyle = isUnlocked ? 'rgba(34, 197, 94, 0.18)' : 'rgba(14, 165, 233, 0.14)';
        this.ctx.fillRect(rewX, badgeY, rewW, 26);
        this.ctx.strokeStyle = isUnlocked ? '#22c55e' : '#0284c7';
        this.ctx.lineWidth = 1.2;
        this.ctx.strokeRect(rewX, badgeY, rewW, 26);

        this.ctx.fillStyle = isUnlocked ? '#4ade80' : '#38bdf8';
        this.ctx.font = 'bold 13px "Nunito", "Be Vietnam Pro", sans-serif';
        this.ctx.textAlign = 'left';
        const titleNote = ach.reward.title ? `  [${ach.reward.title}]` : '';
        this.ctx.fillText(`${ach.reward.desc}${titleNote}`, rewX + 10, badgeY + 18);
      }

      // Trạng thái bên phải (Status Badge & Progress Bar)
      const rightColW = 175;
      const rightColX = cx + cardW - rightColW - 18;

      if (isUnlocked) {
        // Huy hiệu đã hoàn thành
        this.ctx.fillStyle = 'rgba(34, 197, 94, 0.20)';
        this.ctx.fillRect(rightColX, cy + 24, rightColW, 34);
        this.ctx.strokeStyle = '#22c55e';
        this.ctx.lineWidth = 1.5;
        this.ctx.strokeRect(rightColX, cy + 24, rightColW, 34);

        this.ctx.fillStyle = '#4ade80';
        this.ctx.font = 'bold 15px "Nunito", sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('✓ HOÀN THÀNH', rightColX + rightColW / 2, cy + 47);

        this.ctx.fillStyle = '#64748b';
        this.ctx.font = '13px monospace';
        this.ctx.fillText('Đã nhận thưởng', rightColX + rightColW / 2, cy + 82);
      } else {
        // Đang thực hiện & Thanh tiến trình
        this.ctx.fillStyle = '#94a3b8';
        this.ctx.font = 'bold 14px "Nunito", sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${progress.toLocaleString()} / ${goal.toLocaleString()}`, rightColX + rightColW / 2, cy + 34);

        const barW = rightColW;
        const barH = 14;
        const barY = cy + 48;
        this.ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        this.ctx.fillRect(rightColX, barY, barW, barH);
        this.ctx.strokeStyle = '#475569';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(rightColX, barY, barW, barH);

        const pFillW = Math.round((pct / 100) * barW);
        if (pFillW > 0) {
          this.ctx.fillStyle = '#38bdf8';
          this.ctx.fillRect(rightColX + 1, barY + 1, Math.min(barW - 2, pFillW), barH - 2);
        }

        this.ctx.fillStyle = '#cbd5e1';
        this.ctx.font = 'bold 13px "Nunito", sans-serif';
        this.ctx.fillText(`${pct}%`, rightColX + rightColW / 2, barY + 34);
      }
    }

    this.ctx.restore();

    // 6. Thanh Điều Khiển Cố Định Dưới Cùng (Fixed Footer)
    const footerH = 75;
    const footerY = this.canvas.height - footerH;

    this.ctx.fillStyle = 'rgba(10, 15, 26, 0.96)';
    this.ctx.fillRect(0, footerY, this.canvas.width, footerH);
    this.ctx.strokeStyle = '#1e293b';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, footerY);
    this.ctx.lineTo(this.canvas.width, footerY);
    this.ctx.stroke();

    // Nút Quay Về Menu Chính
    const backBtnW = 320;
    const backBtnH = 54;
    const backBtnX = clipX;
    const backBtnY = footerY + Math.round((footerH - backBtnH) / 2);

    this.ctx.fillStyle = '#334155';
    this.ctx.fillRect(backBtnX, backBtnY, backBtnW, backBtnH);
    this.ctx.strokeStyle = '#94a3b8';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(backBtnX, backBtnY, backBtnW, backBtnH);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 19px "Nunito", "Be Vietnam Pro", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('⬅ QUAY VỀ MENU CHÍNH', backBtnX + backBtnW / 2, backBtnY + 35);
    this.menuButtons.push({ x: backBtnX, y: backBtnY, w: backBtnW, h: backBtnH, id: 'back_from_achievements' });

    // Nút Cuộn Lên / Cuộn Xuống
    const scrollBtnW = 200;
    const scrollBtnH = 50;
    const scrollBtnY = footerY + Math.round((footerH - scrollBtnH) / 2);
    const scrollGap = 28;

    const upBtnX = this.canvas.width / 2 - scrollBtnW - scrollGap / 2;
    const canScrollUp = this.achievementScrollY > 5;
    this.ctx.fillStyle = canScrollUp ? '#1e293b' : 'rgba(15, 23, 42, 0.5)';
    this.ctx.fillRect(upBtnX, scrollBtnY, scrollBtnW, scrollBtnH);
    this.ctx.strokeStyle = canScrollUp ? '#64748b' : '#334155';
    this.ctx.lineWidth = 1.5;
    this.ctx.strokeRect(upBtnX, scrollBtnY, scrollBtnW, scrollBtnH);
    this.ctx.fillStyle = canScrollUp ? '#ffd166' : '#475569';
    this.ctx.font = 'bold 16px "Nunito", "Be Vietnam Pro", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('▲ CUỘN LÊN', upBtnX + scrollBtnW / 2, scrollBtnY + 31);
    if (canScrollUp) {
      this.menuButtons.push({ x: upBtnX, y: scrollBtnY, w: scrollBtnW, h: scrollBtnH, id: 'achievement_scroll_up' });
    }

    const downBtnX = this.canvas.width / 2 + scrollGap / 2;
    const canScrollDown = this.achievementScrollY < maxScroll - 5;
    this.ctx.fillStyle = canScrollDown ? '#1e293b' : 'rgba(15, 23, 42, 0.5)';
    this.ctx.fillRect(downBtnX, scrollBtnY, scrollBtnW, scrollBtnH);
    this.ctx.strokeStyle = canScrollDown ? '#64748b' : '#334155';
    this.ctx.lineWidth = 1.5;
    this.ctx.strokeRect(downBtnX, scrollBtnY, scrollBtnW, scrollBtnH);
    this.ctx.fillStyle = canScrollDown ? '#ffd166' : '#475569';
    this.ctx.font = 'bold 16px "Nunito", "Be Vietnam Pro", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('▼ CUỘN XUỐNG', downBtnX + scrollBtnW / 2, scrollBtnY + 31);
    if (canScrollDown) {
      this.menuButtons.push({ x: downBtnX, y: scrollBtnY, w: scrollBtnW, h: scrollBtnH, id: 'achievement_scroll_down' });
    }

    // Tóm tắt góc phải
    const rightStatX = this.canvas.width - clipX;
    this.ctx.fillStyle = '#cbd5e1';
    this.ctx.font = 'bold 16px "Nunito", sans-serif';
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`🎖️ Tiến độ: ${stats.unlockedCount}/${stats.total}  |  ✨ +${stats.totalExpPercent}% EXP`, rightStatX, footerY + 44);

    this.ctx.restore();
  }

  // Banner thông báo mở khóa thành tựu hiển thị trên đầu màn hình
  renderAchievementBanner() {
    if (!this.achievementSystem || this.achievementSystem.recentUnlocks.length === 0) return;
    const item = this.achievementSystem.recentUnlocks[0];
    const ach = item.achievement;
    if (!ach) return;

    this.ctx.save();
    const alpha = Math.min(1.0, item.timer * 2.0);
    this.ctx.globalAlpha = Math.max(0, alpha);

    const bannerW = 620;
    const bannerH = 82;
    const bannerX = this.canvas.width / 2 - bannerW / 2;
    const bannerY = 32;

    // Nền tối ma thuật
    this.ctx.fillStyle = 'rgba(10, 15, 28, 0.96)';
    if (this.ctx.roundRect) {
      this.ctx.beginPath();
      this.ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 12);
      this.ctx.fill();
      this.ctx.strokeStyle = '#ffd700';
      this.ctx.lineWidth = 2.5;
      this.ctx.shadowColor = '#ffd700';
      this.ctx.shadowBlur = 18;
      this.ctx.stroke();
    } else {
      this.ctx.fillRect(bannerX, bannerY, bannerW, bannerH);
      this.ctx.strokeStyle = '#ffd700';
      this.ctx.lineWidth = 2.5;
      this.ctx.strokeRect(bannerX, bannerY, bannerW, bannerH);
    }

    this.ctx.shadowBlur = 0;

    // Icon
    this.ctx.font = '40px "Segoe UI Emoji", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(ach.icon || '🏆', bannerX + 50, bannerY + 56);

    // Tiêu đề & Tên
    this.ctx.textAlign = 'left';
    this.ctx.fillStyle = '#ffd166';
    this.ctx.font = 'bold 15px "Nunito", "Be Vietnam Pro", sans-serif';
    this.ctx.fillText('✨ THÀNH TỰU MỞ KHÓA!', bannerX + 96, bannerY + 28);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 21px "Nunito", "Be Vietnam Pro", sans-serif';
    this.ctx.fillText(ach.name, bannerX + 96, bannerY + 52);

    if (ach.reward && ach.reward.desc) {
      this.ctx.fillStyle = '#4ade80';
      this.ctx.font = 'bold 14px "Nunito", "Be Vietnam Pro", sans-serif';
      this.ctx.fillText(ach.reward.desc, bannerX + 96, bannerY + 71);
    }

    this.ctx.restore();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.gameInstance = new Game();
});
