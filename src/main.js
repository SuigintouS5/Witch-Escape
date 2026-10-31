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
  CHARACTER_SPECIAL_MASTERY
} from './MasterySystem.js';
import { BookSystem, BOOK_DEFINITIONS, STARTER_BOOK_IDS } from './BookSystem.js';
import { BookDrop } from './BookDrop.js';

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
      saveExit: { x: this.canvas.width / 2 - 290, y: 0, w: 270, h: 56 },
      exitFinish: { x: this.canvas.width / 2 + 20, y: 0, w: 270, h: 56 }
    };

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

    // Thông báo trạng thái trên màn hình Cây Kỹ Năng & Cổ Viện Shop (Toast notification)
    this.skillTreeToast = null;
    this.shopToast = null;

    // Lắng nghe sự kiện
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    this.canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });

    // Vòng lặp chính
    this.lastTime = performance.now();
    this.fps = 60;
    this.frameCount = 0;
    this.lastFpsUpdate = performance.now();

    requestAnimationFrame((t) => this.loop(t));
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

    // Khởi tạo Vũ khí khởi đầu theo nhân vật
    const startWeaponId = this.selectedChar.startingWeaponId || 'main_sword';
    this.weaponManager = new WeaponManager(startWeaponId);
    this.upgradeManager = new UpgradeManager(this.weaponManager, this.skillManager);
    this.upgradeManager.applyChallenges(this.selectedChallenges);

    // Cập nhật độ khó & chế độ & thử thách cho Spawner
    this.spawner.setDifficulty(this.selectedDiff, this.selectedMode.id, this.selectedChallenges);

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
        skills: this.skillManager.getSkillsData()
      };
      localStorage.setItem('vampire_saved_run', JSON.stringify(saveData));
    } catch (e) {
      console.error('Lỗi khi lưu game:', e);
    }

    this.isPaused = false;
    this.gameState = 'MAIN_MENU';
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
    this.skillManager.restoreSkillsData(data.skills);

    const startWeaponId = this.selectedChar.startingWeaponId || 'main_sword';
    this.weaponManager = new WeaponManager(startWeaponId);
    this.upgradeManager = new UpgradeManager(this.weaponManager, this.skillManager);
    this.upgradeManager.applyChallenges(this.selectedChallenges);
    this.upgradeManager.restoreEquippedData(data.equipped, this.player);

    if (data.isWitch) {
      this.player.awakenWitchForm();
    }

    this.spawner.setDifficulty(this.selectedDiff, this.selectedMode.id, this.selectedChallenges);

    this.gameTime = data.gameTime;
    this.killCount = data.killCount;
    this.level = data.level;
    this.currentXP = data.currentXP;
    this.maxXP = data.maxXP;

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
    this.gameState = 'PLAYING';
  }

  // Kết thúc trận đấu & Tính điểm thưởng + Tiền vàng
  finishGame() {
    try {
      localStorage.removeItem('vampire_saved_run');
    } catch (e) {}

    this.gameState = 'GAME_OVER';

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
  }

  addXP(amount) {
    const xpBonus = this.upgradeManager ? this.upgradeManager.getXPMultiplier() : 1.0;
    this.currentXP += amount * xpBonus;
    while (this.currentXP >= this.maxXP) {
      this.currentXP -= this.maxXP;
      this.level++;
      this.maxXP = Math.round(this.maxXP * 1.35 + 5);
      this.triggerLevelUp();
    }
  }

  triggerLevelUp() {
    this.input.resetKeys();
    this.isLevelUpOpen = true;
    this.currentChoices = this.upgradeManager.generateChoices();
  }

  triggerEvolution() {
    this.input.resetKeys();
    this.isEvolutionOpen = true;
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
    if (e.key === 'f' || e.key === 'F') {
      this.toggleFullscreen();
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

  // Tính toán tọa độ chuột trên canvas chuẩn xác 100%, khử hoàn toàn lệch do letterbox/aspect-ratio
  getCanvasMousePos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const canvasAspect = this.canvas.width / this.canvas.height; // 1920 / 1080 = 16:9
    const elemAspect = rect.width / rect.height;

    let drawW = rect.width;
    let drawH = rect.height;
    let offsetX = 0;
    let offsetY = 0;

    if (elemAspect > canvasAspect) {
      // Màn hình rộng hơn 16:9 (vệt đen 2 bên trái/phải)
      drawW = rect.height * canvasAspect;
      offsetX = (rect.width - drawW) / 2;
    } else {
      // Màn hình cao hơn 16:9 (vệt đen trên/dưới)
      drawH = rect.width / canvasAspect;
      offsetY = (rect.height - drawH) / 2;
    }

    const mouseX = ((e.clientX - rect.left - offsetX) / drawW) * this.canvas.width;
    const mouseY = ((e.clientY - rect.top - offsetY) / drawH) * this.canvas.height;

    return { mouseX, mouseY };
  }

  onMouseMove(e) {
    if (this.gameState === 'PLAYING') {
      this.canvas.style.cursor = 'default';
      return;
    }
    const { mouseX, mouseY } = this.getCanvasMousePos(e);

    let hovering = false;
    for (const btn of this.menuButtons) {
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
      this.codexScrollY = Math.max(0, Math.min(2200, this.codexScrollY + (e.deltaY > 0 ? 140 : -140)));
    }
  }

  onPointerDown(e) {
    if (e.button !== 0) return; // Chỉ nhận chuột trái
    const { mouseX, mouseY } = this.getCanvasMousePos(e);

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

      for (const btn of this.menuButtons) {
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
            return;
          }
        }
      }
      return;
    }

    if (this.isLevelUpOpen) {
      for (let i = 0; i < this.choiceCardsRects.length; i++) {
        const r = this.choiceCardsRects[i];
        if (
          mouseX >= r.x && mouseX <= r.x + r.w &&
          mouseY >= r.y && mouseY <= r.y + r.h
        ) {
          const selected = this.currentChoices[i];
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

          // Kiểm tra hàng đợi nhận nâng cấp từ rương/hộp báu
          if (this.pendingLevelUps > 0) {
            this.pendingLevelUps--;
            setTimeout(() => this.triggerLevelUp(), 100);
          }
          return;
        }
      }
      return;
    }

    if (this.isEvolutionOpen) {
      const b = this.evolutionBtnRect;
      if (mouseX >= b.x && mouseX <= b.x + b.w && mouseY >= b.y && mouseY <= b.y + b.h) {
        // Thực hiện hợp nhất 2 vũ khí Cấp 7
        this.upgradeManager.executeEvolution();

        this.particles.createArcaneBlast(this.player.x, this.player.y, 3.5);
        this.particles.createDeathBurst(this.player.x, this.player.y, '#ffd700', 80);
        this.isEvolutionOpen = false;
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

    if (this.isPaused) {
      const p = this.pauseActions;
      if (
        mouseX >= p.resume.x && mouseX <= p.resume.x + p.resume.w &&
        mouseY >= p.resume.y && mouseY <= p.resume.y + p.resume.h
      ) {
        this.togglePause();
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
    if (actionId === 'resume_saved_game') {
      this.loadSavedGame();
    } else if (actionId === 'toggle_fullscreen') {
      this.toggleFullscreen();
    } else if (actionId === 'start_game') {
      this.gameState = 'CHAR_SELECT';
    } else if (actionId === 'open_shop') {
      this.gameState = 'SHOP';
    } else if (actionId === 'open_skill_tree') {
      this.skillTreeSelectedCharId = this.selectedChar ? this.selectedChar.id : 'sorceress';
      this.gameState = 'SKILL_TREE';
    } else if (actionId.startsWith('open_char_skill_tree_')) {
      this.skillTreeSelectedCharId = actionId.replace('open_char_skill_tree_', '');
      this.gameState = 'SKILL_TREE';
    } else if (actionId.startsWith('select_skill_char_')) {
      this.skillTreeSelectedCharId = actionId.replace('select_skill_char_', '');
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
      const char = this.masterySystem.getCharData(this.skillTreeSelectedCharId);
      const def = SKILL_TREE_DEFINITIONS[skillKey];
      const cur = (char.skills && char.skills[skillKey]) || 0;
      if (cur >= (def ? def.maxLevel : 10)) {
        this.showSkillTreeToast(`⭐ ${def ? def.name : skillKey} đã đạt cấp tối đa (10/10)!`, '#f59e0b');
      } else if (char.skillPoints <= 0) {
        this.showSkillTreeToast('⚠️ Chưa có Điểm Kỹ Năng! Hãy Nâng Cấp Thông Thạo trước (hoặc bấm +10K Score).', '#f43f5e');
      } else {
        const ok = this.masterySystem.allocateSkill(this.skillTreeSelectedCharId, skillKey);
        if (ok) {
          this.showSkillTreeToast(`✨ Đã nâng cấp: ${def ? def.name : skillKey}!`, '#c084fc');
        }
      }
    } else if (actionId.startsWith('refund_skill_')) {
      const skillKey = actionId.replace('refund_skill_', '');
      const char = this.masterySystem.getCharData(this.skillTreeSelectedCharId);
      const def = SKILL_TREE_DEFINITIONS[skillKey];
      const cur = (char.skills && char.skills[skillKey]) || 0;
      if (cur <= 0) {
        this.showSkillTreeToast(`ℹ️ ${def ? def.name : skillKey} chưa được cộng điểm nào để hoàn!`, '#f59e0b');
      } else {
        const ok = this.masterySystem.refundSkill(this.skillTreeSelectedCharId, skillKey);
        if (ok) {
          this.showSkillTreeToast(`↩️ Đã hoàn lại 1 điểm từ: ${def ? def.name : skillKey}!`, '#fb923c');
        }
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
    } else if (actionId === 'how_to_play') {
      alert('🎮 HƯỚNG DẪN CHƠI:\n- Di chuyển: Phím W, A, S, D hoặc Mũi tên\n- Tấn công: Tự động 100%\n- Nhặt Đá Kinh Nghiệm để thăng cấp và chọn vũ khí\n- Khi có 2 vũ khí Max Cấp 7, Lõi Tiến Hóa sẽ rơi xuống để Hợp Nhất Vũ Khí Tối Thượng!\n- Tiêu diệt quái kiếm Vàng để Nâng Cấp Vĩnh Viễn tại Cổ Viện Ma Pháp.');
    } else if (actionId.startsWith('select_char_')) {
      if (btnData.charData) this.selectedChar = btnData.charData;
    } else if (actionId === 'goto_mode_select') {
      this.gameState = 'MODE_SELECT';
    } else if (actionId.startsWith('select_mode_')) {
      if (btnData.modeData) this.selectedMode = btnData.modeData;
    } else if (actionId === 'goto_challenge_select') {
      this.gameState = 'CHALLENGE_SELECT';
    } else if (actionId.startsWith('toggle_challenge_')) {
      const chId = actionId.replace('toggle_challenge_', '');
      this.selectedChallenges[chId] = !this.selectedChallenges[chId];
    } else if (actionId === 'goto_diff_select') {
      this.gameState = 'DIFF_SELECT';
    } else if (actionId.startsWith('select_diff_')) {
      if (btnData.diffData) this.selectedDiff = btnData.diffData;
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
      this.codexScrollY = Math.max(0, this.codexScrollY - 220);
    } else if (actionId === 'codex_scroll_down') {
      this.codexScrollY = Math.min(2200, this.codexScrollY + 220);
    } else if (actionId === 'back_to_menu') {
      this.gameState = 'MAIN_MENU';
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
        this.killCount++;
        this.skillManager.onDamageDealt(300, this.player);

        // Kiểm tra điều kiện Thức Tỉnh Phù Thủy (Witch Awakening)
        if (this.player && this.player.hasWitchForm && !this.player.isWitch) {
          const killsNeeded = this.player.witchKillRequirement || 100;
          const skillsUnlocked = this.skillManager ? this.skillManager.getUnlockedCount() : 0;
          if (this.killCount >= killsNeeded && skillsUnlocked >= 3) {
            this.triggerWitchAwakening();
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
          this.bookSystem.onEnemyKilled(killedEnemy, killedEnemy.isMiniBoss, killedEnemy.isMainBoss);

          // Rơi Sách Khởi Đầu nếu kho sách còn ô trống và không bật Thử Thách Cấm Sách
          if (!this.selectedChallenges.no_books && this.bookSystem.canPickUpMore()) {
            const unownedStarters = STARTER_BOOK_IDS.filter(id => !this.bookSystem.hasBook(id));
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

      // 3. Dọn quái chết (Riêng Boss & Mini Boss KHÔNG BAO GIỜ biến mất trừ khi chết)
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        if (this.enemies[i].isDead) {
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
      const onEnemyShoot = (sx, sy, tx, ty) => {
        this.enemyProjectiles.push(new EnemyProjectile(sx, sy, tx, ty));
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
          enemy.update(delta, this.player, this.enemies, onEnemyShoot);
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
        drop.render(this.ctx, this.camera);
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
      case 'GAME_OVER':
        this.renderGameOver();
        break;
    }
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

    // 5 Ô TẤN CÔNG (Màu Đỏ/Hồng - Tăng thêm 1 ô)
    for (let i = 0; i < 5; i++) {
      const w = this.upgradeManager.attackSlots[i];
      this.ctx.fillStyle = w ? '#3a121d' : 'rgba(25, 20, 25, 0.75)';
      this.ctx.fillRect(curX, slotStartY, slotSize, slotSize);
      this.ctx.strokeStyle = w ? '#ff4d6d' : '#443344';
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeRect(curX, slotStartY, slotSize, slotSize);

      if (w && w.icon) {
        const iconImg = getIconImage(w.icon);
        if (iconImg && iconImg.complete) {
          this.ctx.drawImage(iconImg, curX + 2, slotStartY + 2, slotSize - 4, slotSize - 4);
        }
        // Huy hiệu cấp độ nhỏ ở góc dưới
        this.ctx.fillStyle = '#ff4d6d';
        this.ctx.fillRect(curX + slotSize - 13, slotStartY + slotSize - 13, 13, 13);
        this.ctx.fillStyle = '#ffffff';
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
    this.ctx.fillText('LÊN CẤP! (LEVEL UP)', this.canvas.width / 2, 130);
    this.ctx.shadowBlur = 0;

    this.ctx.fillStyle = '#e0e0e0';
    this.ctx.font = '20px sans-serif';
    this.ctx.fillText('Chọn 1 trong 3 nâng cấp bên dưới để cường hóa sức mạnh:', this.canvas.width / 2, 175);

    this.choiceCardsRects = [];
    const cardW = 440;
    const cardH = 560;
    const gap = 45;
    const startX = (this.canvas.width - (cardW * 3 + gap * 2)) / 2;
    const cardY = 220;

    for (let i = 0; i < this.currentChoices.length; i++) {
      const c = this.currentChoices[i];
      const cx = startX + i * (cardW + gap);

      this.choiceCardsRects.push({ x: cx, y: cardY, w: cardW, h: cardH });

      // Nền thẻ bài
      this.ctx.fillStyle = 'rgba(20, 28, 44, 0.95)';
      this.ctx.fillRect(cx, cardY, cardW, cardH);
      this.ctx.strokeStyle = '#d4af37';
      this.ctx.lineWidth = 2.5;
      this.ctx.strokeRect(cx, cardY, cardW, cardH);

      // KHUNG VẼ ICON PIXEL ART 64x64
      const iconSize = 64;
      const iconX = cx + cardW / 2 - iconSize / 2;
      const iconY = cardY + 28;

      this.ctx.fillStyle = 'rgba(10, 15, 25, 0.9)';
      this.ctx.fillRect(iconX, iconY, iconSize, iconSize);
      this.ctx.strokeStyle = '#ffd166';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(iconX, iconY, iconSize, iconSize);

      if (c.icon) {
        const iconImg = getIconImage(c.icon);
        if (iconImg && iconImg.complete) {
          this.ctx.drawImage(iconImg, iconX + 6, iconY + 6, iconSize - 12, iconSize - 12);
        }
      }

      // Tên nâng cấp
      this.ctx.fillStyle = '#ffea79';
      this.ctx.font = 'bold 24px "Segoe UI", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(c.name, cx + cardW / 2, cardY + 130);

      // Đường kẻ trang trí
      this.ctx.strokeStyle = '#3a4d6b';
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.moveTo(cx + 35, cardY + 152);
      this.ctx.lineTo(cx + cardW - 35, cardY + 152);
      this.ctx.stroke();

      // Mô tả chi tiết
      this.ctx.fillStyle = '#cbd5e1';
      this.ctx.font = '18px "Segoe UI", sans-serif';
      this.ctx.textAlign = 'left';

      const words = c.desc.split(' ');
      let line = '';
      let textY = cardY + 195;
      for (const w of words) {
        const testLine = line + w + ' ';
        if (this.ctx.measureText(testLine).width > cardW - 70) {
          this.ctx.fillText(line, cx + 35, textY);
          line = w + ' ';
          textY += 30;
        } else {
          line = testLine;
        }
      }
      this.ctx.fillText(line, cx + 35, textY);

      // Nút [LỰA CHỌN]
      const selectBtnW = 260;
      const selectBtnH = 54;
      const selectBtnX = cx + cardW / 2 - selectBtnW / 2;
      const selectBtnY = cardY + cardH - 80;

      this.ctx.fillStyle = '#2d6a4f';
      this.ctx.fillRect(selectBtnX, selectBtnY, selectBtnW, selectBtnH);
      this.ctx.strokeStyle = '#52b788';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(selectBtnX, selectBtnY, selectBtnW, selectBtnH);

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 20px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('LỰA CHỌN', cx + cardW / 2, selectBtnY + 35);
    }

    this.ctx.restore();
  }

  renderEvolutionModal() {
    this.ctx.save();

    this.ctx.fillStyle = 'rgba(15, 8, 2, 0.92)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const panelW = 820;
    const panelH = 500;
    const panelX = this.canvas.width / 2 - panelW / 2;
    const panelY = this.canvas.height / 2 - panelH / 2;

    this.ctx.fillStyle = 'rgba(30, 20, 10, 0.96)';
    this.ctx.fillRect(panelX, panelY, panelW, panelH);
    this.ctx.strokeStyle = '#ffd700';
    this.ctx.lineWidth = 3.5;
    this.ctx.strokeRect(panelX, panelY, panelW, panelH);

    this.ctx.fillStyle = '#ffd700';
    this.ctx.font = 'bold 44px "Segoe UI", serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('TIẾN HÓA VŨ KHÍ TỐI THƯỢNG!', this.canvas.width / 2, panelY + 80);

    this.ctx.fillStyle = '#ffecb3';
    this.ctx.font = '22px sans-serif';
    this.ctx.fillText('Bạn đã thu thập Lõi Tiến Hóa khi có 2 Vũ Khí Max Cấp 7!', this.canvas.width / 2, panelY + 135);

    this.ctx.fillStyle = '#ff88aa';
    this.ctx.font = 'bold 26px "Segoe UI", sans-serif';
    this.ctx.fillText('⭐ HỢP NHẤT: BÃO KIẾM HUYỀN BƯỚM ⭐', this.canvas.width / 2, panelY + 205);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '20px sans-serif';
    this.ctx.fillText('Tăng +120% Sát thương toàn bộ vũ khí, giảm -35% hồi chiêu,', this.canvas.width / 2, panelY + 255);
    this.ctx.fillText('và phát nổ kiếm ánh sáng ma thuật liên tục quét sạch bản đồ!', this.canvas.width / 2, panelY + 290);

    const b = this.evolutionBtnRect;
    b.x = this.canvas.width / 2 - 180;
    b.y = panelY + 360;
    b.w = 360;
    b.h = 64;

    this.ctx.fillStyle = '#d4af37';
    this.ctx.fillRect(b.x, b.y, b.w, b.h);
    this.ctx.strokeStyle = '#fff0a6';
    this.ctx.lineWidth = 2.5;
    this.ctx.strokeRect(b.x, b.y, b.w, b.h);

    this.ctx.fillStyle = '#1a1005';
    this.ctx.font = 'bold 22px sans-serif';
    this.ctx.fillText('KÍCH HOẠT TIẾN HÓA', this.canvas.width / 2, b.y + 40);

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

    // Cập nhật vị trí các nút trong pauseActions
    const p = this.pauseActions;
    const btnW = 260;
    const btnH = 56;
    const btnY = panelY + 810;

    p.resume.x = this.canvas.width / 2 - 420;
    p.resume.y = btnY;
    p.resume.w = btnW;
    p.resume.h = btnH;

    p.saveExit.x = this.canvas.width / 2 - btnW / 2;
    p.saveExit.y = btnY;
    p.saveExit.w = btnW;
    p.saveExit.h = btnH;

    p.exitFinish.x = this.canvas.width / 2 + 160;
    p.exitFinish.y = btnY;
    p.exitFinish.w = btnW;
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

    // 2. Nút Lưu & Thoát
    this.ctx.fillStyle = '#1e3a8a';
    this.ctx.fillRect(p.saveExit.x, p.saveExit.y, p.saveExit.w, p.saveExit.h);
    this.ctx.strokeStyle = '#60a5fa';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(p.saveExit.x, p.saveExit.y, p.saveExit.w, p.saveExit.h);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 18px sans-serif';
    this.ctx.fillText('💾 LƯU & THOÁT', p.saveExit.x + p.saveExit.w / 2, p.saveExit.y + 35);

    // 3. Nút Thoát & Tổng Kết
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

    this.ctx.restore();
  }

  renderMainMenu() {
    this.ctx.save();

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
    const fsBtnX = this.canvas.width - 250;
    const fsBtnY = 30;
    const fsBtnW = 210;
    const fsBtnH = 48;
    this.ctx.fillStyle = 'rgba(25, 35, 55, 0.85)';
    this.ctx.fillRect(fsBtnX, fsBtnY, fsBtnW, fsBtnH);
    this.ctx.strokeStyle = '#60a5fa';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(fsBtnX, fsBtnY, fsBtnW, fsBtnH);
    this.ctx.fillStyle = '#93c5fd';
    this.ctx.font = 'bold 16px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('⛶ Toàn Màn Hình (F)', fsBtnX + fsBtnW / 2, fsBtnY + 30);
    this.menuButtons.push({ x: fsBtnX, y: fsBtnY, w: fsBtnW, h: fsBtnH, id: 'toggle_fullscreen' });

    // Tiêu đề Game hoành tráng
    this.ctx.fillStyle = '#ffd166';
    this.ctx.font = 'bold 72px "Segoe UI", serif';
    this.ctx.textAlign = 'center';
    this.ctx.shadowColor = '#d4af37';
    this.ctx.shadowBlur = 30;
    this.ctx.fillText('WITCH ESCAPE', this.canvas.width / 2, 230);

    this.ctx.shadowBlur = 0;
    this.ctx.fillStyle = '#ff70a6';
    this.ctx.font = 'italic 26px "Segoe UI", sans-serif';
    this.ctx.fillText('— Chạy Thoát Khỏi Hòn Đảo Phù Thủy —', this.canvas.width / 2, 290);

    // Thống kê Vàng và Kỷ lục
    const goldPanelX = this.canvas.width / 2 - 320;
    const goldPanelY = 330;
    this.ctx.fillStyle = 'rgba(20, 30, 48, 0.88)';
    this.ctx.fillRect(goldPanelX, goldPanelY, 640, 65);
    this.ctx.strokeStyle = '#d4af37';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(goldPanelX, goldPanelY, 640, 65);

    this.ctx.fillStyle = '#ffd700';
    this.ctx.font = 'bold 26px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`🪙 Tiền Vàng: ${this.meta.gold}    |    🏆 Kỷ Lục: ${this.meta.highScore.toLocaleString()}`, this.canvas.width / 2, goldPanelY + 42);

    // Các Nút Menu Chính
    const savedInfo = this.getSavedGameInfo();
    const btnW = 480;
    const btnH = 58;
    const btnX = this.canvas.width / 2 - btnW / 2;

    const buttons = [];
    if (savedInfo) {
      const minutes = Math.floor(savedInfo.gameTime / 60);
      const seconds = Math.floor(savedInfo.gameTime % 60);
      const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      buttons.push({
        id: 'resume_saved_game',
        label: `▶️ TIẾP TỤC (Cấp ${savedInfo.level} - ⏱️ ${timeStr})`,
        y: 405,
        color: '#1d4ed8',
        border: '#60a5fa'
      });
      buttons.push({ id: 'start_game', label: '⚔️ BẮT ĐẦU CHƠI MỚI', y: 470, color: '#2d6a4f', border: '#52b788' });
      buttons.push({ id: 'open_skill_tree', label: '✨ CÂY KỸ NĂNG & THÔNG THẠO', y: 535, color: '#581c87', border: '#c084fc' });
      buttons.push({ id: 'open_shop', label: '🏪 NÂNG CẤP VĨNH VIỄN', y: 600, color: '#854d0e', border: '#eab308' });
      buttons.push({ id: 'open_codex', label: '📖 THƯ VIỆN TÁC PHẨM', y: 665, color: '#451a03', border: '#d4af37' });
      buttons.push({ id: 'how_to_play', label: '📜 HƯỚNG DẪN & ĐIỀU KHIỂN', y: 730, color: '#1e293b', border: '#475569' });
    } else {
      buttons.push({ id: 'start_game', label: '⚔️ BẮT ĐẦU CHƠI', y: 420, color: '#2d6a4f', border: '#52b788' });
      buttons.push({ id: 'open_skill_tree', label: '✨ CÂY KỸ NĂNG & THÔNG THẠO', y: 485, color: '#581c87', border: '#c084fc' });
      buttons.push({ id: 'open_shop', label: '🏪 NÂNG CẤP VĨNH VIỄN', y: 550, color: '#854d0e', border: '#eab308' });
      buttons.push({ id: 'open_codex', label: '📖 THƯ VIỆN TÁC PHẨM', y: 615, color: '#451a03', border: '#d4af37' });
      buttons.push({ id: 'how_to_play', label: '📜 HƯỚNG DẪN & ĐIỀU KHIỂN', y: 680, color: '#1e293b', border: '#475569' });
    }

    for (const b of buttons) {
      this.ctx.fillStyle = b.color;
      this.ctx.fillRect(btnX, b.y, btnW, btnH);
      this.ctx.strokeStyle = b.border;
      this.ctx.lineWidth = 2.5;
      this.ctx.strokeRect(btnX, b.y, btnW, btnH);

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 22px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(b.label, this.canvas.width / 2, b.y + 41);

      this.menuButtons.push({ x: btnX, y: b.y, w: btnW, h: btnH, id: b.id });
    }

    this.ctx.fillStyle = '#64748b';
    this.ctx.font = '16px monospace';
    this.ctx.fillText('Phiên bản v2.0 - Giai đoạn 5 Hoàn Thiện (1080p Full HD)', this.canvas.width / 2, this.canvas.height - 45);

    this.ctx.restore();
  }

  // MÀN HÌNH CHỌN NHÂN VẬT
  renderCharSelect() {
    this.ctx.save();

    this.ctx.fillStyle = '#0a0d18';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = '#ffd166';
    this.ctx.font = 'bold 44px "Segoe UI", serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('CHỌN ANH HÙNG XUẤT TRẬN', this.canvas.width / 2, 85);

    this.ctx.fillStyle = '#94a3b8';
    this.ctx.font = '16px sans-serif';
    this.ctx.fillText('Mỗi nhân vật sở hữu thuộc tính và vũ khí khởi đầu độc nhất:', this.canvas.width / 2, 120);

    const cardW = 420;
    const cardH = 580;
    const gap = 45;
    const startX = (this.canvas.width - (cardW * CONFIG.CHARACTERS.length + gap * (CONFIG.CHARACTERS.length - 1))) / 2;
    const cardY = 200;

    for (let i = 0; i < CONFIG.CHARACTERS.length; i++) {
      const char = CONFIG.CHARACTERS[i];
      const cx = startX + i * (cardW + gap);
      const isSelected = this.selectedChar.id === char.id;

      // Nền thẻ nhân vật
      this.ctx.fillStyle = isSelected ? 'rgba(30, 41, 65, 0.95)' : 'rgba(15, 23, 42, 0.85)';
      this.ctx.fillRect(cx, cardY, cardW, cardH);
      this.ctx.strokeStyle = isSelected ? '#ffd166' : '#334155';
      this.ctx.lineWidth = isSelected ? 3.5 : 1.5;
      this.ctx.strokeRect(cx, cardY, cardW, cardH);

      // Tên nhân vật & danh hiệu
      this.ctx.fillStyle = isSelected ? '#ffea79' : '#f8fafc';
      this.ctx.font = 'bold 26px "Segoe UI", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(char.name, cx + cardW / 2, cardY + 50);

      this.ctx.fillStyle = '#94a3b8';
      this.ctx.font = 'italic 16px sans-serif';
      this.ctx.fillText(char.title, cx + cardW / 2, cardY + 82);

      // Nút mở nhanh Cây Kỹ Năng của nhân vật
      const treeBtnW = 145;
      const treeBtnH = 32;
      const treeBtnX = cx + cardW - treeBtnW - 16;
      const treeBtnY = cardY + 16;
      this.ctx.fillStyle = '#3b0764';
      this.ctx.fillRect(treeBtnX, treeBtnY, treeBtnW, treeBtnH);
      this.ctx.strokeStyle = '#c084fc';
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeRect(treeBtnX, treeBtnY, treeBtnW, treeBtnH);
      this.ctx.fillStyle = '#f3e8ff';
      this.ctx.font = 'bold 13px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('🌲 Cây Kỹ Năng', treeBtnX + treeBtnW / 2, treeBtnY + 21);
      this.menuButtons.push({ x: treeBtnX, y: treeBtnY, w: treeBtnW, h: treeBtnH, id: `open_char_skill_tree_${char.id}` });

      // Khung vẽ ảnh nhân vật
      const avatarBoxX = cx + cardW / 2 - 70;
      const avatarBoxY = cardY + 105;
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      this.ctx.fillRect(avatarBoxX, avatarBoxY, 140, 140);
      this.ctx.strokeStyle = '#475569';
      this.ctx.strokeRect(avatarBoxX, avatarBoxY, 140, 140);

      const charImg = getIconImage(char.sprite);
      if (charImg && charImg.complete) {
        this.ctx.imageSmoothingEnabled = true;
        if (char.spriteSheet) {
          const fw = Math.floor(charImg.naturalWidth / char.spriteSheet.cols);
          const fh = Math.floor(charImg.naturalHeight / char.spriteSheet.rows);
          this.ctx.drawImage(charImg, 0, 0, fw, fh, avatarBoxX + 20, avatarBoxY + 20, 100, 100);
        } else {
          const natW = charImg.naturalWidth || 1;
          const natH = charImg.naturalHeight || 1;
          const maxAvW = 120;
          const maxAvH = 125;
          let drawW = maxAvW;
          let drawH = drawW * (natH / natW);
          if (drawH > maxAvH) {
            drawH = maxAvH;
            drawW = drawH * (natW / natH);
          }
          const drawX = avatarBoxX + (140 - drawW) / 2;
          const drawY = avatarBoxY + (140 - drawH) / 2;
          this.ctx.drawImage(charImg, drawX, drawY, drawW, drawH);
        }
      }

      // Thông số thuộc tính
      const statY = cardY + 285;
      this.ctx.fillStyle = '#cbd5e1';
      this.ctx.font = '15px monospace';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(`❤️ Máu tối đa: ${char.maxHealth}`, cx + 35, statY);
      this.ctx.fillText(`👟 Tốc độ: ${char.baseSpeed}  |  🛡️ Giáp: ${char.baseArmor || 0}`, cx + 35, statY + 26);
      this.ctx.fillText(`💥 Chí mạng: ${(char.critChance * 100).toFixed(0)}%  |  ⚡ Né: ${(char.dodgeRate * 100).toFixed(0)}%`, cx + 35, statY + 52);

      // Cấp Thông Thạo & Score của nhân vật
      const mastery = this.masterySystem.getCharData(char.id);
      this.ctx.fillStyle = '#fbbf24';
      this.ctx.fillText(`⭐ Thông Thạo: Cấp ${mastery.level}/100`, cx + 35, statY + 80);
      this.ctx.fillStyle = '#c084fc';
      this.ctx.fillText(`🔮 Điểm Score: ${mastery.score.toLocaleString()}`, cx + 35, statY + 104);

      // Mô tả
      this.ctx.fillStyle = '#94a3b8';
      this.ctx.font = '14px sans-serif';
      const words = char.desc.split(' ');
      let line = '';
      let descY = statY + 132;
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

      // Nút CHỌN
      const selectBtnW = 220;
      const selectBtnH = 48;
      const selectBtnX = cx + cardW / 2 - selectBtnW / 2;
      const selectBtnY = cardY + cardH - 65;

      this.ctx.fillStyle = isSelected ? '#d4af37' : '#1e293b';
      this.ctx.fillRect(selectBtnX, selectBtnY, selectBtnW, selectBtnH);
      this.ctx.strokeStyle = isSelected ? '#fff0a6' : '#64748b';
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeRect(selectBtnX, selectBtnY, selectBtnW, selectBtnH);

      this.ctx.fillStyle = isSelected ? '#000000' : '#ffffff';
      this.ctx.font = 'bold 17px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(isSelected ? '✓ ĐÃ CHỌN' : 'CHỌN ANH HÙNG', cx + cardW / 2, selectBtnY + 30);

      this.menuButtons.push({ x: cx, y: cardY, w: cardW, h: cardH, id: 'select_char_' + char.id, charData: char });
    }

    // Nút Tiếp tục (Sang Chọn độ khó) và Nút Quay lại
    const nextBtnW = 260;
    const nextBtnH = 56;
    const nextBtnX = this.canvas.width / 2 + 25;
    const backBtnX = this.canvas.width / 2 - nextBtnW - 25;
    const actionBtnY = this.canvas.height - 110;

    // Back
    this.ctx.fillStyle = '#334155';
    this.ctx.fillRect(backBtnX, actionBtnY, nextBtnW, nextBtnH);
    this.ctx.strokeStyle = '#64748b';
    this.ctx.strokeRect(backBtnX, actionBtnY, nextBtnW, nextBtnH);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 16px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('⬅ QUAY LẠI', backBtnX + nextBtnW / 2, actionBtnY + 30);
    this.menuButtons.push({ x: backBtnX, y: actionBtnY, w: nextBtnW, h: nextBtnH, id: 'back_to_menu' });

    // Next (Sang Chọn Chế Độ Chơi)
    this.ctx.fillStyle = '#2d6a4f';
    this.ctx.fillRect(nextBtnX, actionBtnY, nextBtnW, nextBtnH);
    this.ctx.strokeStyle = '#52b788';
    this.ctx.strokeRect(nextBtnX, actionBtnY, nextBtnW, nextBtnH);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText('TIẾP TỤC ➔', nextBtnX + nextBtnW / 2, actionBtnY + 30);
    this.menuButtons.push({ x: nextBtnX, y: actionBtnY, w: nextBtnW, h: nextBtnH, id: 'goto_mode_select' });

    this.ctx.restore();
  }

  // =========================================================================
  // MÀN HÌNH CHỌN CHẾ ĐỘ CHƠI (BÌNH THƯỜNG / VÔ TẬN)
  // =========================================================================
  renderModeSelect() {
    this.ctx.save();

    this.ctx.fillStyle = '#0a0d18';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = '#ffd166';
    this.ctx.font = 'bold 52px "Segoe UI", serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('CHỌN CHẾ ĐỘ THỬ THÁCH', this.canvas.width / 2, 95);

    this.ctx.fillStyle = '#94a3b8';
    this.ctx.font = '20px sans-serif';
    this.ctx.fillText('Lựa chọn chiến dịch sinh tồn 20 phút hoặc thử thách vô tận không giới hạn thời gian:', this.canvas.width / 2, 145);

    const cardW = 560;
    const cardH = 540;
    const gap = 60;
    const startX = (this.canvas.width - (cardW * CONFIG.MODES.length + gap * (CONFIG.MODES.length - 1))) / 2;
    const cardY = 210;

    for (let i = 0; i < CONFIG.MODES.length; i++) {
      const mode = CONFIG.MODES[i];
      const cx = startX + i * (cardW + gap);
      const isSelected = this.selectedMode.id === mode.id;

      this.ctx.fillStyle = isSelected ? 'rgba(25, 35, 55, 0.96)' : 'rgba(15, 23, 42, 0.85)';
      this.ctx.fillRect(cx, cardY, cardW, cardH);
      this.ctx.strokeStyle = isSelected ? mode.color : '#334155';
      this.ctx.lineWidth = isSelected ? 3.5 : 1.5;
      this.ctx.strokeRect(cx, cardY, cardW, cardH);

      // Icon & Tag
      this.ctx.font = '54px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(mode.icon, cx + cardW / 2, cardY + 75);

      this.ctx.fillStyle = mode.color;
      this.ctx.font = 'bold 16px monospace';
      this.ctx.fillText(mode.tag, cx + cardW / 2, cardY + 115);

      // Tên Chế Độ
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 28px "Segoe UI", sans-serif';
      this.ctx.fillText(mode.name, cx + cardW / 2, cardY + 160);

      // Đường kẻ phân cách
      this.ctx.strokeStyle = '#334155';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(cx + 40, cardY + 195);
      this.ctx.lineTo(cx + cardW - 40, cardY + 195);
      this.ctx.stroke();

      // Mô tả & Lộ trình
      this.ctx.fillStyle = '#cbd5e1';
      this.ctx.font = '17px sans-serif';
      this.ctx.textAlign = 'left';

      if (mode.id === 'normal') {
        let textY = cardY + 235;
        this.ctx.fillText('⏳ Thời lượng trận đấu: 20 Phút', cx + 45, textY);
        this.ctx.fillText('💀 Phút 02:30: Mini Boss đầu tiên xuất hiện (to x2.5)', cx + 45, textY + 36);
        this.ctx.fillText('👹 Phút 10:00: Đại Ma Nữ Meruru (Phase 1 & 2)', cx + 45, textY + 72);
        this.ctx.fillText('🔥 Phút 20:00: Chúa Tể Yuki (3 Phase, 7 Kỹ Năng)', cx + 45, textY + 108);
        this.ctx.fillStyle = '#4ade80';
        this.ctx.fillText('🏆 Tiêu diệt Yuki để CHIẾN THẮNG TRẬN ĐẤU!', cx + 45, textY + 155);
      } else {
        let textY = cardY + 235;
        this.ctx.fillText('♾️ Thời lượng trận đấu: KHÔNG GIỚI HẠN', cx + 45, textY);
        this.ctx.fillText('🔄 Lặp lại toàn bộ chu kỳ Boss lần 2 tới phút 40', cx + 45, textY + 36);
        this.ctx.fillText('🌊 Sau phút 40: Biển quái dồn dập tràn ngập bản đồ', cx + 45, textY + 72);
        this.ctx.fillText('🪙 Cày Tiền Vàng & Phá Kỷ Lục Điểm Số Tối Thượng', cx + 45, textY + 108);
        this.ctx.fillStyle = '#f43f5e';
        this.ctx.fillText('⚠️ Thử thách sinh tồn khắc nghiệt cho cựu binh!', cx + 45, textY + 155);
      }

      // Nút Lựa Chọn
      const selectBtnW = 280;
      const selectBtnH = 54;
      const selectBtnX = cx + cardW / 2 - selectBtnW / 2;
      const selectBtnY = cardY + cardH - 80;

      this.ctx.fillStyle = isSelected ? mode.color : '#1e293b';
      this.ctx.fillRect(selectBtnX, selectBtnY, selectBtnW, selectBtnH);
      this.ctx.strokeStyle = isSelected ? '#ffffff' : '#64748b';
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeRect(selectBtnX, selectBtnY, selectBtnW, selectBtnH);

      this.ctx.fillStyle = isSelected ? '#000000' : '#ffffff';
      this.ctx.font = 'bold 18px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(isSelected ? '✓ ĐÃ CHỌN' : 'CHỌN CHẾ ĐỘ NÀY', cx + cardW / 2, selectBtnY + 34);

      this.menuButtons.push({ x: cx, y: cardY, w: cardW, h: cardH, id: 'select_mode_' + mode.id, modeData: mode });
    }

    // Nút Quay lại & Tiếp tục (Sang Chọn Thử Thách)
    const nextBtnW = 260;
    const nextBtnH = 56;
    const nextBtnX = this.canvas.width / 2 + 25;
    const backBtnX = this.canvas.width / 2 - nextBtnW - 25;
    const actionBtnY = this.canvas.height - 110;

    // Back
    this.ctx.fillStyle = '#334155';
    this.ctx.fillRect(backBtnX, actionBtnY, nextBtnW, nextBtnH);
    this.ctx.strokeStyle = '#64748b';
    this.ctx.strokeRect(backBtnX, actionBtnY, nextBtnW, nextBtnH);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 16px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('⬅ QUAY LẠI', backBtnX + nextBtnW / 2, actionBtnY + 34);
    this.menuButtons.push({ x: backBtnX, y: actionBtnY, w: nextBtnW, h: nextBtnH, id: 'back_to_char_select' });

    // Next
    this.ctx.fillStyle = '#2d6a4f';
    this.ctx.fillRect(nextBtnX, actionBtnY, nextBtnW, nextBtnH);
    this.ctx.strokeStyle = '#52b788';
    this.ctx.strokeRect(nextBtnX, actionBtnY, nextBtnW, nextBtnH);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText('TIẾP TỤC (THỬ THÁCH) ➔', nextBtnX + nextBtnW / 2, actionBtnY + 34);
    this.menuButtons.push({ x: nextBtnX, y: actionBtnY, w: nextBtnW, h: nextBtnH, id: 'goto_challenge_select' });

    this.ctx.restore();
  }

  // =========================================================================
  // MÀN HÌNH TÙY CHỌN THỬ THÁCH (CHALLENGE MODIFIERS)
  // Bảng Checkbox tích chọn - Tăng Điểm & Vàng khi sống >= 2 phút
  // =========================================================================
  renderChallengeSelect() {
    this.ctx.save();

    this.ctx.fillStyle = '#0a0d18';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = '#ffd166';
    this.ctx.font = 'bold 48px "Segoe UI", serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('THỬ THÁCH BỔ SUNG (TÙY CHỌN)', this.canvas.width / 2, 75);

    this.ctx.fillStyle = '#94a3b8';
    this.ctx.font = '17px sans-serif';
    this.ctx.fillText('Tích chọn các điều kiện khắc nghiệt để gia tăng độ khó và nhận thêm Điểm & Vàng thưởng:', this.canvas.width / 2, 115);

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
    const summaryBarW = 900;
    const summaryBarH = 46;
    const summaryX = this.canvas.width / 2 - summaryBarW / 2;
    const summaryY = 135;

    this.ctx.fillStyle = 'rgba(25, 35, 55, 0.9)';
    this.ctx.fillRect(summaryX, summaryY, summaryBarW, summaryBarH);
    this.ctx.strokeStyle = checkedCount > 0 ? '#ffd700' : '#475569';
    this.ctx.lineWidth = 1.8;
    this.ctx.strokeRect(summaryX, summaryY, summaryBarW, summaryBarH);

    this.ctx.fillStyle = '#ffd700';
    this.ctx.font = 'bold 18px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
      `ĐÃ CHỌN: ${checkedCount}/${CONFIG.CHALLENGES.length} Thử Thách    |    ⭐ Thưởng Điểm: +${Math.round(totalScoreBonus * 100)}%    |    🪙 Thưởng Vàng: +${Math.round(totalGoldBonus * 100)}%`,
      this.canvas.width / 2,
      summaryY + 29
    );

    // Chú thích chống farm bẩn
    this.ctx.fillStyle = '#f87171';
    this.ctx.font = 'italic 15px sans-serif';
    this.ctx.fillText('⚠️ Điều kiện nhận thưởng: Bạn phải sống sót ít nhất 2 phút (120 giây) trong trận mới được kích hoạt bonus thử thách!', this.canvas.width / 2, summaryY + 68);

    // Danh sách 11 Thử thách chia thành 2 cột cân xứng
    const colW = 680;
    const itemH = 68;
    const gapX = 40;
    const gapY = 12;
    const totalW = colW * 2 + gapX;
    const leftX = (this.canvas.width - totalW) / 2;
    const startY = 225;

    for (let i = 0; i < CONFIG.CHALLENGES.length; i++) {
      const ch = CONFIG.CHALLENGES[i];
      const col = i % 2;
      const row = Math.floor(i / 2);

      const ix = leftX + col * (colW + gapX);
      const iy = startY + row * (itemH + gapY);
      const isChecked = !!this.selectedChallenges[ch.id];

      // Nền ô thử thách
      this.ctx.fillStyle = isChecked ? 'rgba(30, 41, 65, 0.95)' : 'rgba(15, 23, 42, 0.75)';
      this.ctx.fillRect(ix, iy, colW, itemH);
      this.ctx.strokeStyle = isChecked ? '#ffd166' : '#334155';
      this.ctx.lineWidth = isChecked ? 2 : 1;
      this.ctx.strokeRect(ix, iy, colW, itemH);

      // Checkbox [✓] hoặc [ ]
      const boxSize = 28;
      const boxX = ix + 16;
      const boxY = iy + (itemH - boxSize) / 2;

      this.ctx.fillStyle = isChecked ? '#ffd700' : 'rgba(30, 40, 60, 0.9)';
      this.ctx.fillRect(boxX, boxY, boxSize, boxSize);
      this.ctx.strokeStyle = isChecked ? '#fff' : '#64748b';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(boxX, boxY, boxSize, boxSize);

      if (isChecked) {
        this.ctx.fillStyle = '#000000';
        this.ctx.font = 'bold 20px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('✓', boxX + boxSize / 2, boxY + 22);
      }

      // Tên Thử thách
      this.ctx.fillStyle = isChecked ? '#ffea79' : '#f8fafc';
      this.ctx.font = 'bold 18px "Segoe UI", sans-serif';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(ch.name, boxX + boxSize + 14, iy + 27);

      // Mô tả ngắn
      this.ctx.fillStyle = '#94a3b8';
      this.ctx.font = '14px sans-serif';
      this.ctx.fillText(ch.desc, boxX + boxSize + 14, iy + 51);

      // Bonus hiển thị bên phải
      this.ctx.fillStyle = '#4ade80';
      this.ctx.font = 'bold 15px monospace';
      this.ctx.textAlign = 'right';
      this.ctx.fillText(`+${Math.round(ch.scoreBonus * 100)}% Điểm | +${Math.round(ch.goldBonus * 100)}% Vàng`, ix + colW - 16, iy + 39);

      this.menuButtons.push({ x: ix, y: iy, w: colW, h: itemH, id: 'toggle_challenge_' + ch.id });
    }

    // 2 Nút: Quay lại & Tiếp tục (Sang Chọn Độ Khó)
    const nextBtnW = 280;
    const nextBtnH = 56;
    const nextBtnX = this.canvas.width / 2 + 25;
    const backBtnX = this.canvas.width / 2 - nextBtnW - 25;
    const actionBtnY = this.canvas.height - 95;

    // Back
    this.ctx.fillStyle = '#334155';
    this.ctx.fillRect(backBtnX, actionBtnY, nextBtnW, nextBtnH);
    this.ctx.strokeStyle = '#64748b';
    this.ctx.strokeRect(backBtnX, actionBtnY, nextBtnW, nextBtnH);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 16px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('⬅ QUAY LẠI (CHẾ ĐỘ)', backBtnX + nextBtnW / 2, actionBtnY + 34);
    this.menuButtons.push({ x: backBtnX, y: actionBtnY, w: nextBtnW, h: nextBtnH, id: 'back_to_mode_select' });

    // Next
    this.ctx.fillStyle = '#2d6a4f';
    this.ctx.fillRect(nextBtnX, actionBtnY, nextBtnW, nextBtnH);
    this.ctx.strokeStyle = '#52b788';
    this.ctx.strokeRect(nextBtnX, actionBtnY, nextBtnW, nextBtnH);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText('TIẾP TỤC (ĐỘ KHÓ) ➔', nextBtnX + nextBtnW / 2, actionBtnY + 34);
    this.menuButtons.push({ x: nextBtnX, y: actionBtnY, w: nextBtnW, h: nextBtnH, id: 'goto_diff_select' });

    this.ctx.restore();
  }

  // MÀN HÌNH CHỌN ĐỘ KHÓ (1080p Full HD)
  renderDiffSelect() {
    this.ctx.save();

    this.ctx.fillStyle = '#0a0d18';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = '#ffd166';
    this.ctx.font = 'bold 56px "Segoe UI", serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('CHỌN CẤP ĐỘ THỬ THÁCH', this.canvas.width / 2, 100);

    this.ctx.fillStyle = '#94a3b8';
    this.ctx.font = '20px sans-serif';
    this.ctx.fillText('Độ khó càng cao, quái vật càng đông hung hãn nhưng phần thưởng vàng và điểm số càng lớn:', this.canvas.width / 2, 150);

    const cardW = 440;
    const cardH = 560;
    const gap = 45;
    const startX = (this.canvas.width - (cardW * CONFIG.DIFFICULTIES.length + gap * (CONFIG.DIFFICULTIES.length - 1))) / 2;
    const cardY = 220;

    for (let i = 0; i < CONFIG.DIFFICULTIES.length; i++) {
      const diff = CONFIG.DIFFICULTIES[i];
      const cx = startX + i * (cardW + gap);
      const isSelected = this.selectedDiff.id === diff.id;

      this.ctx.fillStyle = isSelected ? 'rgba(30, 41, 65, 0.95)' : 'rgba(15, 23, 42, 0.85)';
      this.ctx.fillRect(cx, cardY, cardW, cardH);
      this.ctx.strokeStyle = isSelected ? diff.color : '#334155';
      this.ctx.lineWidth = isSelected ? 3.5 : 1.5;
      this.ctx.strokeRect(cx, cardY, cardW, cardH);

      // Tên độ khó
      this.ctx.fillStyle = diff.color;
      this.ctx.font = 'bold 30px "Segoe UI", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(diff.name, cx + cardW / 2, cardY + 65);

      // Chi tiết thông số
      const textX = cx + 45;
      let lineY = cardY + 130;
      this.ctx.fillStyle = '#e2e8f0';
      this.ctx.font = '19px monospace';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(`Máu quái vật: x${diff.enemyHealthMult}`, textX, lineY);
      this.ctx.fillText(`Tốc độ quái: x${diff.enemySpeedMult}`, textX, lineY + 38);
      this.ctx.fillText(`Mật độ quái: x${diff.spawnRateMult}`, textX, lineY + 76);

      this.ctx.fillStyle = '#ffd700';
      this.ctx.fillText(`⭐ Thưởng Điểm: x${diff.scoreMult}`, textX, lineY + 125);
      this.ctx.fillText(`🪙 Thưởng Vàng: x${diff.goldMult}`, textX, lineY + 163);

      // Mô tả tóm tắt
      this.ctx.fillStyle = '#94a3b8';
      this.ctx.font = '16px sans-serif';
      this.ctx.fillText(diff.desc, textX, lineY + 215, cardW - 90);

      // Nút Lựa chọn
      const selectBtnW = 240;
      const selectBtnH = 52;
      const selectBtnX = cx + cardW / 2 - selectBtnW / 2;
      const selectBtnY = cardY + cardH - 80;

      this.ctx.fillStyle = isSelected ? diff.color : '#1e293b';
      this.ctx.fillRect(selectBtnX, selectBtnY, selectBtnW, selectBtnH);
      this.ctx.strokeStyle = isSelected ? '#ffffff' : '#64748b';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(selectBtnX, selectBtnY, selectBtnW, selectBtnH);

      this.ctx.fillStyle = isSelected ? '#000000' : '#ffffff';
      this.ctx.font = 'bold 18px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(isSelected ? '✓ ĐÃ CHỌN' : 'CHỌN ĐỘ KHÓ', cx + cardW / 2, selectBtnY + 33);

      this.menuButtons.push({ x: cx, y: cardY, w: cardW, h: cardH, id: 'select_diff_' + diff.id, diffData: diff });
    }

    // Nút BẮT ĐẦU VÀO MÀN & Quay lại
    const startBattleW = 320;
    const startBattleH = 64;
    const nextBtnX = this.canvas.width / 2 + 25;
    const backBtnX = this.canvas.width / 2 - startBattleW - 25;
    const actionBtnY = this.canvas.height - 130;

    // Back
    this.ctx.fillStyle = '#334155';
    this.ctx.fillRect(backBtnX, actionBtnY, startBattleW, startBattleH);
    this.ctx.strokeStyle = '#64748b';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(backBtnX, actionBtnY, startBattleW, startBattleH);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 20px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('⬅ QUAY LẠI', backBtnX + startBattleW / 2, actionBtnY + 39);
    this.menuButtons.push({ x: backBtnX, y: actionBtnY, w: startBattleW, h: startBattleH, id: 'back_to_challenge_select' });

    // Chọn sách trước khi xuất trận
    this.ctx.fillStyle = '#b91c1c';
    this.ctx.fillRect(nextBtnX, actionBtnY, startBattleW, startBattleH);
    this.ctx.strokeStyle = '#ef4444';
    this.ctx.lineWidth = 2.5;
    this.ctx.strokeRect(nextBtnX, actionBtnY, startBattleW, startBattleH);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 20px sans-serif';
    this.ctx.fillText('📖 CHỌN SÁCH KHỞI ĐẦU ➔', nextBtnX + startBattleW / 2, actionBtnY + 41);
    this.menuButtons.push({ x: nextBtnX, y: actionBtnY, w: startBattleW, h: startBattleH, id: 'goto_book_select' });

    this.ctx.restore();
  }

  // MÀN HÌNH CỬA HÀNG NÂNG CẤP NGOÀI TRẬN BẰNG VÀNG (1080p Full HD)
  renderShop() {
    this.ctx.save();

    this.ctx.fillStyle = '#0a0d18';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Tiêu đề & Vàng
    this.ctx.fillStyle = '#ffd166';
    this.ctx.font = 'bold 56px "Segoe UI", serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('CỔ VIỆN MA PHÁP (NÂNG CẤP VĨNH VIỄN)', this.canvas.width / 2, 85);

    this.ctx.fillStyle = '#ffd700';
    this.ctx.font = 'bold 26px monospace';
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`🪙 Tiền Vàng Hiện Có: ${this.meta.gold.toLocaleString()} Vàng`, this.canvas.width / 2 + 60, 136);

    // Nút Nhận Vàng Test
    const testGoldBtnW = 200;
    const testGoldBtnH = 38;
    const testGoldBtnX = this.canvas.width / 2 + 80;
    const testGoldBtnY = 110;
    this.ctx.fillStyle = '#4c1d95';
    this.ctx.fillRect(testGoldBtnX, testGoldBtnY, testGoldBtnW, testGoldBtnH);
    this.ctx.strokeStyle = '#a855f7';
    this.ctx.lineWidth = 1.8;
    this.ctx.strokeRect(testGoldBtnX, testGoldBtnY, testGoldBtnW, testGoldBtnH);
    this.ctx.fillStyle = '#fde047';
    this.ctx.font = 'bold 14px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('🎁 +1,000 VÀNG TEST', testGoldBtnX + testGoldBtnW / 2, testGoldBtnY + 24);
    this.menuButtons.push({ x: testGoldBtnX, y: testGoldBtnY, w: testGoldBtnW, h: testGoldBtnH, id: 'add_test_gold' });

    // Danh sách 9 nâng cấp (Bố trí 2 cột đẹp mắt chuẩn Full HD 1080p)
    const upgrades = Object.values(this.meta.upgrades);
    const itemW = 840;
    const itemH = 92;
    const col0X = this.canvas.width / 2 - itemW - 20;
    const col1X = this.canvas.width / 2 + 20;
    const baseStartY = 170;

    for (let i = 0; i < upgrades.length; i++) {
      const up = upgrades[i];
      const isMax = up.level >= up.maxLevel;
      const cost = this.meta.getCost(up.id);
      const canAfford = this.meta.gold >= cost && !isMax;

      const col = i < 5 ? 0 : 1;
      const row = i < 5 ? i : (i - 5);
      const itemX = col === 0 ? col0X : col1X;
      const itemY = baseStartY + row * (itemH + 14);

      this.ctx.fillStyle = 'rgba(20, 30, 48, 0.9)';
      this.ctx.fillRect(itemX, itemY, itemW, itemH);
      this.ctx.strokeStyle = '#3a4d6b';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(itemX, itemY, itemW, itemH);

      // Icon & Tên
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '34px sans-serif';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(up.icon, itemX + 18, itemY + 58);

      this.ctx.font = 'bold 20px "Segoe UI", sans-serif';
      this.ctx.fillStyle = '#ffd166';
      this.ctx.fillText(up.name, itemX + 75, itemY + 34);

      // Mô tả & Cấp độ
      this.ctx.font = '15px sans-serif';
      this.ctx.fillStyle = '#cbd5e1';
      this.ctx.fillText(up.desc, itemX + 75, itemY + 65, itemW - 250);

      // Vạch hiển thị cấp độ
      const pipX = itemX + itemW - 240;
      for (let p = 1; p <= up.maxLevel; p++) {
        this.ctx.fillStyle = p <= up.level ? '#ffd700' : '#334155';
        this.ctx.fillRect(pipX + p * 15, itemY + 36, 11, 20);
      }

      // Nút Mua Nâng Cấp
      const buyBtnW = 135;
      const buyBtnH = 48;
      const buyBtnX = itemX + itemW - buyBtnW - 16;
      const buyBtnY = itemY + (itemH - buyBtnH) / 2;

      this.ctx.fillStyle = isMax ? '#334155' : (canAfford ? '#2d6a4f' : '#7f1d1d');
      this.ctx.fillRect(buyBtnX, buyBtnY, buyBtnW, buyBtnH);
      this.ctx.strokeStyle = isMax ? '#64748b' : (canAfford ? '#52b788' : '#ef4444');
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeRect(buyBtnX, buyBtnY, buyBtnW, buyBtnH);

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 17px sans-serif';
      this.ctx.textAlign = 'center';
      if (isMax) {
        this.ctx.fillText('ĐÃ MAX', buyBtnX + buyBtnW / 2, buyBtnY + 30);
      } else {
        this.ctx.fillText(`🪙 ${cost.toLocaleString()}`, buyBtnX + buyBtnW / 2, buyBtnY + 30);
      }
      this.menuButtons.push({ x: buyBtnX, y: buyBtnY, w: buyBtnW, h: buyBtnH, id: 'buy_upgrade_' + up.id });
    }

    // Nút Quay lại Menu Chính
    const backBtnW = 320;
    const backBtnH = 58;
    const backBtnX = this.canvas.width / 2 - backBtnW / 2;
    const backBtnY = this.canvas.height - 110;

    this.ctx.fillStyle = '#1e293b';
    this.ctx.fillRect(backBtnX, backBtnY, backBtnW, backBtnH);
    this.ctx.strokeStyle = '#475569';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(backBtnX, backBtnY, backBtnW, backBtnH);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 20px sans-serif';
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
  // =========================================================================
  renderSkillTree() {
    this.ctx.save();

    // Nền tối ma thuật huyền bí
    this.ctx.fillStyle = '#080511';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Vầng hào quang ánh sáng ma thuật nền
    const bgGrad = this.ctx.createRadialGradient(
      this.canvas.width / 2, 280, 50,
      this.canvas.width / 2, 400, 900
    );
    bgGrad.addColorStop(0, 'rgba(88, 28, 135, 0.28)');
    bgGrad.addColorStop(1, 'rgba(8, 5, 17, 0)');
    this.ctx.fillStyle = bgGrad;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 1. Tiêu Đề Chính
    this.ctx.fillStyle = '#ffd166';
    this.ctx.font = 'bold 40px "Segoe UI", serif';
    this.ctx.textAlign = 'center';
    this.ctx.shadowColor = '#d946ef';
    this.ctx.shadowBlur = 22;
    this.ctx.fillText('✨ CÂY KỸ NĂNG & THÔNG THẠO NHÂN VẬT', this.canvas.width / 2, 48);

    this.ctx.shadowBlur = 0;
    this.ctx.fillStyle = '#cbd5e1';
    this.ctx.font = '15px sans-serif';
    this.ctx.fillText('Dùng điểm Score tích lũy của nhân vật để tăng cấp Thông Thạo (Cấp 1 - 100) và nhận Điểm Kỹ Năng cường hóa vĩnh viễn', this.canvas.width / 2, 76);

    // 2. Thanh Tabs Chuyển Đổi Nhân Vật
    const tabW = 320;
    const tabH = 46;
    const tabGap = 25;
    const totalTabW = tabW * CONFIG.CHARACTERS.length + tabGap * (CONFIG.CHARACTERS.length - 1);
    const tabStartX = (this.canvas.width - totalTabW) / 2;
    const tabY = 96;

    for (let i = 0; i < CONFIG.CHARACTERS.length; i++) {
      const c = CONFIG.CHARACTERS[i];
      const tx = tabStartX + i * (tabW + tabGap);
      const isTabSelected = (c.id === this.skillTreeSelectedCharId);
      const cMastery = this.masterySystem.getCharData(c.id);

      this.ctx.fillStyle = isTabSelected ? '#581c87' : 'rgba(20, 15, 35, 0.85)';
      this.ctx.fillRect(tx, tabY, tabW, tabH);
      this.ctx.strokeStyle = isTabSelected ? '#fbbf24' : '#475569';
      this.ctx.lineWidth = isTabSelected ? 2.5 : 1.2;
      this.ctx.strokeRect(tx, tabY, tabW, tabH);

      this.ctx.fillStyle = isTabSelected ? '#fde047' : '#94a3b8';
      this.ctx.font = isTabSelected ? 'bold 16px "Segoe UI", sans-serif' : '15px "Segoe UI", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`${c.name} (Lv.${cMastery.level}/100)`, tx + tabW / 2, tabY + 29);

      this.menuButtons.push({ x: tx, y: tabY, w: tabW, h: tabH, id: 'select_skill_char_' + c.id });
    }

    // 3. Khung Thông Tin Thông Thạo Nhân Vật Hiện Tại
    const selectedCharConfig = CONFIG.CHARACTERS.find(c => c.id === this.skillTreeSelectedCharId) || CONFIG.CHARACTERS[0];
    const charMastery = this.masterySystem.getCharData(selectedCharConfig.id);
    const neededScore = this.masterySystem.getRequiredScore(charMastery.level);
    const isMaxMastery = charMastery.level >= 100;
    const canLevelUp = !isMaxMastery && charMastery.score >= neededScore;

    const bannerX = 50;
    const bannerY = 155;
    const bannerW = this.canvas.width - 100;
    const bannerH = 106;

    this.ctx.fillStyle = 'rgba(22, 14, 40, 0.94)';
    this.ctx.fillRect(bannerX, bannerY, bannerW, bannerH);
    this.ctx.strokeStyle = '#7c3aed';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(bannerX, bannerY, bannerW, bannerH);

    // Cột 1 Banner: Avatar Căn Giữa Chuẩn Tỉ Lệ & Thông tin nhân vật
    const avBoxX = bannerX + 18;
    const avBoxSize = 78;
    const avBoxY = bannerY + Math.round((bannerH - avBoxSize) / 2);
    this.ctx.fillStyle = 'rgba(10, 5, 20, 0.7)';
    this.ctx.fillRect(avBoxX, avBoxY, avBoxSize, avBoxSize);
    this.ctx.strokeStyle = '#fbbf24';
    this.ctx.lineWidth = 1.5;
    this.ctx.strokeRect(avBoxX, avBoxY, avBoxSize, avBoxSize);

    const cImg = getIconImage(selectedCharConfig.sprite);
    if (cImg && cImg.complete) {
      const maxDrawW = avBoxSize - 14;
      const maxDrawH = avBoxSize - 14;
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

    const infoTextX = avBoxX + avBoxSize + 20;
    this.ctx.textAlign = 'left';
    this.ctx.fillStyle = '#ffea79';
    this.ctx.font = 'bold 21px "Segoe UI", sans-serif';
    this.ctx.fillText(selectedCharConfig.name, infoTextX, bannerY + 34);

    this.ctx.fillStyle = '#c084fc';
    this.ctx.font = 'italic 14px "Segoe UI", sans-serif';
    this.ctx.fillText(selectedCharConfig.title, infoTextX, bannerY + 56);

    this.ctx.fillStyle = '#f59e0b';
    this.ctx.font = 'bold 16px "Segoe UI", sans-serif';
    this.ctx.fillText(`⭐ THÔNG THẠO: CẤP ${charMastery.level} / 100`, infoTextX, bannerY + 82);

    // Cột 2 Banner: Thanh tiến trình Score & Nút Nâng Cấp (Căn chuẩn hàng ngang Y: bannerY + 36, H: 42)
    const progX = bannerX + 415;
    const progY = bannerY + 36;
    const progW = 280;
    const progH = 42;

    this.ctx.fillStyle = '#e2e8f0';
    this.ctx.font = 'bold 13px "Segoe UI", sans-serif';
    this.ctx.fillText(`Điểm Score Tích Lũy: ${charMastery.score.toLocaleString()} Score`, progX, bannerY + 26);

    // Thanh đo
    this.ctx.fillStyle = 'rgba(10, 8, 20, 0.9)';
    this.ctx.fillRect(progX, progY, progW, progH);
    const scoreRatio = isMaxMastery ? 1.0 : Math.min(1.0, charMastery.score / neededScore);
    const barGrad = this.ctx.createLinearGradient(progX, 0, progX + progW, 0);
    barGrad.addColorStop(0, '#7c3aed');
    barGrad.addColorStop(1, '#eab308');
    this.ctx.fillStyle = barGrad;
    this.ctx.fillRect(progX, progY, progW * scoreRatio, progH);
    this.ctx.strokeStyle = '#fbbf24';
    this.ctx.lineWidth = 1.2;
    this.ctx.strokeRect(progX, progY, progW, progH);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 12px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
      isMaxMastery ? 'MAX CẤP (100/100)' : `${charMastery.score.toLocaleString()} / ${neededScore.toLocaleString()} (${Math.floor(scoreRatio * 100)}%)`,
      progX + progW / 2,
      progY + 26
    );

    // Nút Nâng 1 Cấp
    const upBtnW = 135;
    const upBtnH = 42;
    const upBtnX = progX + progW + 12;
    const upBtnY = bannerY + 36;
    this.ctx.fillStyle = canLevelUp ? '#15803d' : '#1e293b';
    this.ctx.fillRect(upBtnX, upBtnY, upBtnW, upBtnH);
    this.ctx.strokeStyle = canLevelUp ? '#4ade80' : '#475569';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(upBtnX, upBtnY, upBtnW, upBtnH);
    this.ctx.fillStyle = canLevelUp ? '#ffffff' : '#94a3b8';
    this.ctx.font = 'bold 14px "Segoe UI", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(isMaxMastery ? 'ĐÃ ĐẠT MAX' : '⬆️ NÂNG 1 CẤP', upBtnX + upBtnW / 2, upBtnY + 26);
    this.menuButtons.push({ x: upBtnX, y: upBtnY, w: upBtnW, h: upBtnH, id: 'level_up_mastery' });

    // Nút Nâng Tối Đa
    const maxBtnW = 125;
    const maxBtnH = 42;
    const maxBtnX = upBtnX + upBtnW + 8;
    const maxBtnY = bannerY + 36;
    this.ctx.fillStyle = canLevelUp ? '#b45309' : '#1e293b';
    this.ctx.fillRect(maxBtnX, maxBtnY, maxBtnW, maxBtnH);
    this.ctx.strokeStyle = canLevelUp ? '#fde047' : '#475569';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(maxBtnX, maxBtnY, maxBtnW, maxBtnH);
    this.ctx.fillStyle = canLevelUp ? '#ffffff' : '#94a3b8';
    this.ctx.font = 'bold 14px "Segoe UI", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('🚀 NÂNG MAX', maxBtnX + maxBtnW / 2, maxBtnY + 26);
    this.menuButtons.push({ x: maxBtnX, y: maxBtnY, w: maxBtnW, h: maxBtnH, id: 'level_up_max_mastery' });

    // Nút Nhận Score Test
    const testBtnW = 115;
    const testBtnH = 42;
    const testBtnX = maxBtnX + maxBtnW + 8;
    const testBtnY = bannerY + 36;
    this.ctx.fillStyle = '#4c1d95';
    this.ctx.fillRect(testBtnX, testBtnY, testBtnW, testBtnH);
    this.ctx.strokeStyle = '#a855f7';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(testBtnX, testBtnY, testBtnW, testBtnH);
    this.ctx.fillStyle = '#fde047';
    this.ctx.font = 'bold 13px "Segoe UI", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('🎁 +10K SCORE', testBtnX + testBtnW / 2, testBtnY + 26);
    this.menuButtons.push({ x: testBtnX, y: testBtnY, w: testBtnW, h: testBtnH, id: 'add_test_score' });

    // Cột 3 Banner: Điểm Kỹ Năng & 2 Nút Reset (Cùng hàng Y: bannerY + 36)
    let allocatedSkillPoints = 0;
    for (const key of Object.keys(SKILL_TREE_DEFINITIONS)) {
      allocatedSkillPoints += (charMastery.skills[key] || 0);
    }

    const skillBoxX = testBtnX + testBtnW + 20;
    this.ctx.textAlign = 'left';
    this.ctx.fillStyle = '#fde047';
    this.ctx.font = 'bold 17px "Segoe UI", sans-serif';
    this.ctx.fillText(`🌟 ĐIỂM KỸ NĂNG: ${charMastery.skillPoints}`, skillBoxX, bannerY + 48);

    this.ctx.fillStyle = '#94a3b8';
    this.ctx.font = '13px "Segoe UI", sans-serif';
    this.ctx.fillText(`Đã cộng: ${allocatedSkillPoints} điểm`, skillBoxX, bannerY + 70);

    // Nút 2: Tẩy Cấp Thông Thạo (Reset về Cấp 1 & Hoàn 100% Score)
    const hasLevel = charMastery.level > 1;
    const resetLvlBtnW = 160;
    const resetLvlBtnH = 42;
    const resetLvlBtnX = bannerX + bannerW - resetLvlBtnW - 14;
    const resetLvlBtnY = bannerY + 36;
    this.ctx.fillStyle = hasLevel ? '#7c2d12' : '#1e293b';
    this.ctx.fillRect(resetLvlBtnX, resetLvlBtnY, resetLvlBtnW, resetLvlBtnH);
    this.ctx.strokeStyle = hasLevel ? '#fb923c' : '#475569';
    this.ctx.lineWidth = hasLevel ? 2 : 1;
    this.ctx.strokeRect(resetLvlBtnX, resetLvlBtnY, resetLvlBtnW, resetLvlBtnH);
    this.ctx.fillStyle = hasLevel ? '#ffffff' : '#64748b';
    this.ctx.font = 'bold 13px "Segoe UI", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('♻️ TẨY CẤP & SCORE', resetLvlBtnX + resetLvlBtnW / 2, resetLvlBtnY + 26);
    this.menuButtons.push({ x: resetLvlBtnX, y: resetLvlBtnY, w: resetLvlBtnW, h: resetLvlBtnH, id: 'reset_mastery_level' });

    // Nút 1: Tẩy Toàn Bộ Điểm Kỹ Năng (Hoàn Điểm Kỹ Năng)
    const hasAllocated = allocatedSkillPoints > 0;
    const resetBtnW = 150;
    const resetBtnH = 42;
    const resetBtnX = resetLvlBtnX - resetBtnW - 10;
    const resetBtnY = bannerY + 36;
    this.ctx.fillStyle = hasAllocated ? '#831843' : '#1e293b';
    this.ctx.fillRect(resetBtnX, resetBtnY, resetBtnW, resetBtnH);
    this.ctx.strokeStyle = hasAllocated ? '#f472b6' : '#475569';
    this.ctx.lineWidth = hasAllocated ? 2 : 1;
    this.ctx.strokeRect(resetBtnX, resetBtnY, resetBtnW, resetBtnH);
    this.ctx.fillStyle = hasAllocated ? '#ffffff' : '#64748b';
    this.ctx.font = 'bold 13px "Segoe UI", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('🔄 TẨY KỸ NĂNG', resetBtnX + resetBtnW / 2, resetBtnY + 26);
    this.menuButtons.push({ x: resetBtnX, y: resetBtnY, w: resetBtnW, h: resetBtnH, id: 'reset_mastery_skills' });
    this.ctx.fillText('♻️ TẨY CẤP & SCORE', resetLvlBtnX + resetLvlBtnW / 2, resetLvlBtnY + 27);
    this.menuButtons.push({ x: resetLvlBtnX, y: resetLvlBtnY, w: resetLvlBtnW, h: resetLvlBtnH, id: 'reset_mastery_level' });

    // 4. Khu Vực Cây Kỹ Năng 3 Cột (Tấn Công - Sinh Tồn - Tiện Ích & Tinh Hoa)
    const colW = 585;
    const colGap = 32;
    const colStartY = 272;
    const colStartX = 50;

    const columns = [
      {
        title: '⚔️ NHÁNH TẤN CÔNG (OFFENSE)',
        color: '#dc2626',
        borderColor: '#f87171',
        skills: ['attack_dmg', 'crit_rate', 'crit_dmg', 'cooldown']
      },
      {
        title: '🛡️ NHÁNH SINH TỒN (SURVIVAL)',
        color: '#16a34a',
        borderColor: '#4ade80',
        skills: ['max_health', 'regen', 'armor', 'lifesteal']
      },
      {
        title: '🌟 TIỆN ÍCH & TINH HOA (MASTERY)',
        color: '#9333ea',
        borderColor: '#c084fc',
        skills: ['speed', 'pickup_range', 'greed', 'special']
      }
    ];

    const cardH = 152;
    const cardGap = 16;

    for (let cIdx = 0; cIdx < columns.length; cIdx++) {
      const col = columns[cIdx];
      const colX = colStartX + cIdx * (colW + colGap);

      // Header Nhánh
      this.ctx.fillStyle = 'rgba(20, 15, 35, 0.9)';
      this.ctx.fillRect(colX, colStartY, colW, 40);
      this.ctx.strokeStyle = col.borderColor;
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(colX, colStartY, colW, 40);

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 17px "Segoe UI", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(col.title, colX + colW / 2, colStartY + 26);

      // Vẽ từng Card kỹ năng trong nhánh
      for (let sIdx = 0; sIdx < col.skills.length; sIdx++) {
        const skillKey = col.skills[sIdx];
        const def = SKILL_TREE_DEFINITIONS[skillKey];
        const curLvl = charMastery.skills[skillKey] || 0;
        const maxLvl = def.maxLevel;
        const cardY = colStartY + 50 + sIdx * (cardH + cardGap);

        // Khung Card
        this.ctx.fillStyle = 'rgba(16, 12, 28, 0.95)';
        this.ctx.fillRect(colX, cardY, colW, cardH);
        this.ctx.strokeStyle = (curLvl > 0) ? col.borderColor : '#334155';
        this.ctx.lineWidth = (curLvl > 0) ? 2 : 1.2;
        this.ctx.strokeRect(colX, cardY, colW, cardH);

        // Xử lý tên và mô tả đặc biệt nếu là kỹ năng Tinh Hoa Tối Thượng
        let skillName = def.name;
        let skillDesc = def.desc;
        let skillEffectText = def.format(curLvl);

        if (skillKey === 'special') {
          const spDef = CHARACTER_SPECIAL_MASTERY[selectedCharConfig.id];
          if (spDef) {
            skillName = `👑 ${spDef.name}`;
            skillDesc = spDef.desc;
            skillEffectText = spDef.format(curLvl);
          }
        } else {
          skillName = `${def.icon} ${def.name}`;
        }

        // Tên kỹ năng & Cấp độ
        this.ctx.textAlign = 'left';
        this.ctx.fillStyle = (curLvl > 0) ? '#fde047' : '#f8fafc';
        this.ctx.font = 'bold 18px "Segoe UI", sans-serif';
        this.ctx.fillText(skillName, colX + 18, cardY + 28);

        this.ctx.textAlign = 'right';
        this.ctx.fillStyle = (curLvl >= maxLvl) ? '#f59e0b' : '#94a3b8';
        this.ctx.font = 'bold 16px monospace';
        this.ctx.fillText(`Cấp ${curLvl} / ${maxLvl}`, colX + colW - 130, cardY + 28);

        // 10 Vạch đo cấp độ (Pips)
        const pipStartX = colX + 18;
        const pipY = cardY + 38;
        const pipW = 28;
        const pipH = 8;
        const pipGap = 5;

        for (let p = 0; p < maxLvl; p++) {
          const px = pipStartX + p * (pipW + pipGap);
          const isFilled = p < curLvl;
          this.ctx.fillStyle = isFilled ? col.borderColor : 'rgba(50, 40, 70, 0.6)';
          this.ctx.fillRect(px, pipY, pipW, pipH);
        }

        // Mô tả chi tiết kỹ năng
        this.ctx.textAlign = 'left';
        this.ctx.fillStyle = '#94a3b8';
        this.ctx.font = '13px sans-serif';
        // Tự wrap dòng cho mô tả
        const words = skillDesc.split(' ');
        let line = '';
        let descY = cardY + 68;
        for (const w of words) {
          const test = line + w + ' ';
          if (this.ctx.measureText(test).width > colW - 150) {
            this.ctx.fillText(line, colX + 18, descY);
            line = w + ' ';
            descY += 18;
          } else {
            line = test;
          }
        }
        this.ctx.fillText(line, colX + 18, descY);

        // Hiệu quả hiện tại
        this.ctx.fillStyle = (curLvl > 0) ? '#4ade80' : '#64748b';
        this.ctx.font = 'bold 13px sans-serif';
        this.ctx.fillText(`⚡ Hiệu quả: ${skillEffectText}`, colX + 18, cardY + cardH - 12);

        // Nút [-] Hoàn Điểm và [+] Nâng Điểm
        const canAddPoint = (charMastery.skillPoints > 0 && curLvl < maxLvl);
        const canRefundPoint = (curLvl > 0);

        if (curLvl >= maxLvl) {
          // Nút [-] hoàn 1 điểm
          const refBtnW = 44;
          const refBtnH = 46;
          const refBtnX = colX + colW - refBtnW - 84 - 14;
          const refBtnY = cardY + 52;
          this.ctx.fillStyle = '#7f1d1d';
          this.ctx.fillRect(refBtnX, refBtnY, refBtnW, refBtnH);
          this.ctx.strokeStyle = '#f87171';
          this.ctx.lineWidth = 1.5;
          this.ctx.strokeRect(refBtnX, refBtnY, refBtnW, refBtnH);
          this.ctx.fillStyle = '#ffffff';
          this.ctx.font = 'bold 16px sans-serif';
          this.ctx.textAlign = 'center';
          this.ctx.fillText('[-]', refBtnX + refBtnW / 2, refBtnY + 29);
          this.menuButtons.push({ x: refBtnX, y: refBtnY, w: refBtnW, h: refBtnH, id: 'refund_skill_' + skillKey });

          // Khung ĐÃ MAX
          const maxBoxW = 78;
          const maxBoxX = refBtnX + refBtnW + 6;
          this.ctx.fillStyle = '#1e293b';
          this.ctx.fillRect(maxBoxX, refBtnY, maxBoxW, refBtnH);
          this.ctx.strokeStyle = '#475569';
          this.ctx.lineWidth = 1.5;
          this.ctx.strokeRect(maxBoxX, refBtnY, maxBoxW, refBtnH);
          this.ctx.fillStyle = '#f59e0b';
          this.ctx.font = 'bold 13px sans-serif';
          this.ctx.textAlign = 'center';
          this.ctx.fillText('ĐÃ MAX', maxBoxX + maxBoxW / 2, refBtnY + 29);
          this.menuButtons.push({ x: maxBoxX, y: refBtnY, w: maxBoxW, h: refBtnH, id: 'allocate_skill_' + skillKey });
        } else if (canRefundPoint) {
          // Có điểm (> 0): Hiện cả 2 nút [-] và [+]
          const refBtnW = 44;
          const refBtnH = 46;
          const refBtnX = colX + colW - refBtnW - 84 - 14;
          const refBtnY = cardY + 52;
          this.ctx.fillStyle = '#7f1d1d';
          this.ctx.fillRect(refBtnX, refBtnY, refBtnW, refBtnH);
          this.ctx.strokeStyle = '#f87171';
          this.ctx.lineWidth = 1.5;
          this.ctx.strokeRect(refBtnX, refBtnY, refBtnW, refBtnH);
          this.ctx.fillStyle = '#ffffff';
          this.ctx.font = 'bold 16px sans-serif';
          this.ctx.textAlign = 'center';
          this.ctx.fillText('[-]', refBtnX + refBtnW / 2, refBtnY + 29);
          this.menuButtons.push({ x: refBtnX, y: refBtnY, w: refBtnW, h: refBtnH, id: 'refund_skill_' + skillKey });

          const addBtnW = 78;
          const addBtnX = refBtnX + refBtnW + 6;
          this.ctx.fillStyle = canAddPoint ? '#6d28d9' : '#1e293b';
          this.ctx.fillRect(addBtnX, refBtnY, addBtnW, refBtnH);
          this.ctx.strokeStyle = canAddPoint ? '#fbbf24' : '#334155';
          this.ctx.lineWidth = canAddPoint ? 2 : 1;
          this.ctx.strokeRect(addBtnX, refBtnY, addBtnW, refBtnH);
          this.ctx.fillStyle = canAddPoint ? '#ffffff' : '#64748b';
          this.ctx.font = 'bold 13px sans-serif';
          this.ctx.textAlign = 'center';
          this.ctx.fillText('[+] NÂNG', addBtnX + addBtnW / 2, refBtnY + 29);
          this.menuButtons.push({ x: addBtnX, y: refBtnY, w: addBtnW, h: refBtnH, id: 'allocate_skill_' + skillKey });
        } else {
          // Chưa có điểm (cấp 0): Chỉ hiện nút [+] NÂNG
          const addBtnW = 110;
          const addBtnH = 46;
          const addBtnX = colX + colW - addBtnW - 14;
          const addBtnY = cardY + 52;
          this.ctx.fillStyle = canAddPoint ? '#6d28d9' : '#1e293b';
          this.ctx.fillRect(addBtnX, addBtnY, addBtnW, addBtnH);
          this.ctx.strokeStyle = canAddPoint ? '#fbbf24' : '#334155';
          this.ctx.lineWidth = canAddPoint ? 2 : 1;
          this.ctx.strokeRect(addBtnX, addBtnY, addBtnW, addBtnH);
          this.ctx.fillStyle = canAddPoint ? '#ffffff' : '#64748b';
          this.ctx.font = 'bold 14px sans-serif';
          this.ctx.textAlign = 'center';
          this.ctx.fillText('[+] NÂNG', addBtnX + addBtnW / 2, addBtnY + 29);
          this.menuButtons.push({ x: addBtnX, y: addBtnY, w: addBtnW, h: addBtnH, id: 'allocate_skill_' + skillKey });
        }
      }
    }

    // 5. Nút Quay Lại Menu Chính
    const bBtnW = 340;
    const bBtnH = 52;
    const bBtnX = this.canvas.width / 2 - bBtnW / 2;
    const bBtnY = this.canvas.height - 70;

    this.ctx.fillStyle = '#1e1b2e';
    this.ctx.fillRect(bBtnX, bBtnY, bBtnW, bBtnH);
    this.ctx.strokeStyle = '#94a3b8';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(bBtnX, bBtnY, bBtnW, bBtnH);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 18px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('⬅ QUAY VỀ MENU CHÍNH', bBtnX + bBtnW / 2, bBtnY + 33);
    this.menuButtons.push({ x: bBtnX, y: bBtnY, w: bBtnW, h: bBtnH, id: 'back_from_skill_tree' });

    // 6. Toast Notification nổi bật trên màn hình khi thao tác
    if (this.skillTreeToast && this.skillTreeToast.timer > 0) {
      this.ctx.save();
      const toastAlpha = Math.min(1.0, this.skillTreeToast.timer * 2.5);
      this.ctx.globalAlpha = toastAlpha;
      const tw = 720;
      const th = 46;
      const tx = (this.canvas.width - tw) / 2;
      const ty = 28;

      this.ctx.fillStyle = 'rgba(12, 9, 26, 0.96)';
      this.ctx.fillRect(tx, ty, tw, th);
      this.ctx.strokeStyle = this.skillTreeToast.color;
      this.ctx.lineWidth = 2.5;
      this.ctx.strokeRect(tx, ty, tw, th);

      this.ctx.shadowColor = this.skillTreeToast.color;
      this.ctx.shadowBlur = 14;
      this.ctx.fillStyle = this.skillTreeToast.color;
      this.ctx.font = 'bold 17px "Segoe UI", sans-serif';
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

    // Bảng thống kê chi tiết điểm số & vàng
    const statBoxW = 940;
    const statBoxH = 550;
    const statBoxX = this.canvas.width / 2 - statBoxW / 2;
    const statBoxY = 160;

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
    this.ctx.fillText(`🪙 VÀNG THU THẬP:`, leftX, textY);
    this.ctx.textAlign = 'right';
    this.ctx.fillStyle = '#ffe600';
    this.ctx.fillText(`+${s.goldEarned} Vàng`, rightX, textY);

    textY += 44;
    this.ctx.font = 'bold 22px "Segoe UI", sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillStyle = '#c084fc';
    this.ctx.fillText(`🔮 THÔNG THẠO (${s.charName || 'Nhân Vật'}):`, leftX, textY);
    this.ctx.textAlign = 'right';
    this.ctx.fillStyle = '#fde047';
    if (s.charMastery) {
      this.ctx.fillText(`+${s.score.toLocaleString()} Score (Cấp ${s.charMastery.level}/100)`, rightX, textY);
    } else {
      this.ctx.fillText(`+${s.score.toLocaleString()} Score`, rightX, textY);
    }
    this.ctx.textAlign = 'left';

    // 2 Nút: Chơi Lại hoặc Về Menu Chính
    const btnW = 320;
    const btnH = 62;
    const retryBtnX = this.canvas.width / 2 + 20;
    const menuBtnX = this.canvas.width / 2 - btnW - 20;
    const btnY = statBoxY + statBoxH + 35;

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
    this.ctx.font = 'bold 46px "Segoe UI", serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('CHỌN TÁC PHẨM KHỞI ĐẦU', this.canvas.width / 2, 68);

    if (isNoBooksChallenge) {
      this.ctx.fillStyle = '#ef4444';
      this.ctx.font = 'bold 18px "Segoe UI", sans-serif';
      this.ctx.fillText('🚫 THỬ THÁCH "CẤM DÙNG SÁCH" ĐANG ĐƯỢC BẬT - Bạn không thể mang theo hoặc nhặt sách trong trận đấu!', this.canvas.width / 2, 108);
    } else {
      this.ctx.fillStyle = '#cbd5e1';
      this.ctx.font = '17px "Segoe UI", sans-serif';
      const chosenCount = this.selectedStarterBookIds.length;
      this.ctx.fillText(
        `Bạn có thể mang tối đa ${maxStarters} cuốn sách trước trận (${chosenCount}/${maxStarters} đã chọn):`,
        this.canvas.width / 2,
        108
      );
    }

    // Grid 8 sách khởi đầu: 2 hàng 4 cột với THẺ SÁCH DỌC (PORTRAIT)
    const cardBoxW = 390;
    const cardBoxH = 370;
    const gapX = 28;
    const gapY = 16;
    const totalGridW = 4 * cardBoxW + 3 * gapX;
    const startX = (this.canvas.width - totalGridW) / 2;
    const baseGridY = 145;

    for (let i = 0; i < STARTER_BOOK_IDS.length; i++) {
      const bId = STARTER_BOOK_IDS[i];
      const def = BOOK_DEFINITIONS[bId];
      const col = i % 4;
      const row = Math.floor(i / 4);

      const bx = startX + col * (cardBoxW + gapX);
      const by = baseGridY + row * (cardBoxH + gapY);
      const isSelected = !isNoBooksChallenge && this.selectedStarterBookIds.includes(bId);

      this.ctx.fillStyle = isSelected ? 'rgba(35, 45, 65, 0.96)' : (isNoBooksChallenge ? 'rgba(12, 14, 20, 0.6)' : 'rgba(16, 22, 34, 0.9)');
      this.ctx.fillRect(bx, by, cardBoxW, cardBoxH);
      this.ctx.strokeStyle = isSelected ? '#ffd700' : (isNoBooksChallenge ? '#1e293b' : '#334155');
      this.ctx.lineWidth = isSelected ? 3 : 1.5;
      this.ctx.strokeRect(bx, by, cardBoxW, cardBoxH);

      // Thẻ sách dọc Canvas tỷ lệ 1 : 1.4 chuẩn bìa sách thật ngoài đời
      const cardW = 144;
      const cardH = 202;
      const cardX = bx + (cardBoxW - cardW) / 2;
      const cardY = by + 14;

      this.ctx.save();
      if (isNoBooksChallenge) this.ctx.globalAlpha = 0.45;
      this.bookSystem.renderBookCard(this.ctx, bId, cardX, cardY, cardW, cardH, isSelected);
      this.ctx.restore();

      // Tác giả & buffs
      this.ctx.fillStyle = isNoBooksChallenge ? '#64748b' : '#ffffff';
      this.ctx.font = 'bold 15px "Segoe UI", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`✍️ ${def ? def.author : ''}`, bx + cardBoxW / 2, by + 236);

      this.ctx.fillStyle = isNoBooksChallenge ? '#475569' : '#fde047';
      this.ctx.font = '13px "Segoe UI", sans-serif';
      const buffText = def ? (def.desc || def.buffDesc || '') : '';
      this.ctx.fillText(buffText, bx + cardBoxW / 2, by + 260, cardBoxW - 24);

      // Điều kiện tiến hóa bí ẩn
      this.ctx.fillStyle = isNoBooksChallenge ? '#334155' : '#94a3b8';
      this.ctx.font = 'italic 12px "Segoe UI", sans-serif';
      this.ctx.fillText('🔒 Tiến Cấp: ??? (Điều kiện bí ẩn)', bx + cardBoxW / 2, by + 285);

      // Nút Lựa Chọn
      const selectBtnW = 200;
      const selectBtnH = 40;
      const selectBtnX = bx + (cardBoxW - selectBtnW) / 2;
      const selectBtnY = by + 312;

      this.ctx.fillStyle = isNoBooksChallenge ? '#1e293b' : (isSelected ? '#15803d' : '#1e293b');
      this.ctx.fillRect(selectBtnX, selectBtnY, selectBtnW, selectBtnH);
      this.ctx.strokeStyle = isNoBooksChallenge ? '#334155' : (isSelected ? '#4ade80' : '#475569');
      this.ctx.lineWidth = 1.8;
      this.ctx.strokeRect(selectBtnX, selectBtnY, selectBtnW, selectBtnH);

      this.ctx.fillStyle = isNoBooksChallenge ? '#64748b' : (isSelected ? '#ffffff' : '#cbd5e1');
      this.ctx.font = 'bold 15px "Segoe UI", sans-serif';
      this.ctx.fillText(isNoBooksChallenge ? '🚫 CẤM DÙNG' : (isSelected ? '✓ ĐÃ CHỌN' : 'CHỌN SÁCH'), selectBtnX + selectBtnW / 2, selectBtnY + 25);

      if (!isNoBooksChallenge) {
        this.menuButtons.push({ x: bx, y: by, w: cardBoxW, h: cardBoxH, id: 'toggle_starter_book_' + bId });
      }
    }

    // Các Nút Hành Động Ở Dưới Cùng (Quay Lại / Vào Trận)
    const btnH = 56;
    const btnY = this.canvas.height - 95;

    // Nút Quay Lại
    const backW = 260;
    const backX = this.canvas.width / 2 - 320;
    this.ctx.fillStyle = '#334155';
    this.ctx.fillRect(backX, btnY, backW, btnH);
    this.ctx.strokeStyle = '#64748b';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(backX, btnY, backW, btnH);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 19px "Segoe UI", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('⬅ QUAY LẠI', backX + backW / 2, btnY + 35);
    this.menuButtons.push({ x: backX, y: btnY, w: backW, h: btnH, id: 'back_to_diff_select' });

    // Nút Vào Trận
    const startW = 340;
    const startXBtn = this.canvas.width / 2 + 20;
    this.ctx.fillStyle = '#b91c1c';
    this.ctx.fillRect(startXBtn, btnY, startW, btnH);
    this.ctx.strokeStyle = '#ef4444';
    this.ctx.lineWidth = 2.5;
    this.ctx.strokeRect(startXBtn, btnY, startW, btnH);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 21px "Segoe UI", sans-serif';
    this.ctx.fillText('🔥 VÀO TRẬN ĐẤU 🔥', startXBtn + startW / 2, btnY + 36);
    this.menuButtons.push({ x: startXBtn, y: btnY, w: startW, h: btnH, id: 'start_battle_from_books' });

    this.ctx.restore();
  }

  // =========================================================================
  // MÀN HÌNH THƯ VIỆN ĐẠI TÁC PHẨM (BOOK CODEX)
  // =========================================================================
  renderCodex() {
    this.ctx.save();
    this.menuButtons = [];

    // Nền thư viện cổ điển hoàng gia
    this.ctx.fillStyle = '#06080e';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const allBookIds = Object.keys(BOOK_DEFINITIONS);
    const unlockedCount = allBookIds.filter(id => this.bookSystem.unlockedCodex.has(id)).length;

    // Tiêu đề
    this.ctx.fillStyle = '#ffd166';
    this.ctx.font = 'bold 44px "Segoe UI", serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('📖 THƯ VIỆN TÁC PHẨM', this.canvas.width / 2, 68);

    this.ctx.fillStyle = '#cbd5e1';
    this.ctx.font = '16px "Segoe UI", sans-serif';
    this.ctx.fillText(`Tổng hợp 35 Tác Phẩm. Đã khám phá: ${unlockedCount}/35 Sách`, this.canvas.width / 2, 102);

    // Các Tab Lọc Thư Viện: Tất Cả (35) | Khởi Đầu (8) | Tiến Hóa (15) | Hợp Thể Ẩn (12)
    const tabs = [
      { id: 'all', label: 'TẤT CẢ (35)' },
      { id: 'starter', label: 'KHỞI ĐẦU (8)' },
      { id: 'evolved', label: 'TIẾN HÓA (15)' },
      { id: 'fusion', label: 'HỢP THỂ ẨN (12)' }
    ];

    const tabW = 200;
    const tabH = 40;
    const tabGap = 16;
    const totalTabW = tabs.length * tabW + (tabs.length - 1) * tabGap;
    const tabStartX = this.canvas.width / 2 - totalTabW / 2;
    const tabY = 130;

    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i];
      const tx = tabStartX + i * (tabW + tabGap);
      const isAct = this.codexFilter === tab.id;

      this.ctx.fillStyle = isAct ? '#854d0e' : '#1e293b';
      this.ctx.fillRect(tx, tabY, tabW, tabH);
      this.ctx.strokeStyle = isAct ? '#ffd700' : '#475569';
      this.ctx.lineWidth = isAct ? 2 : 1;
      this.ctx.strokeRect(tx, tabY, tabW, tabH);

      this.ctx.fillStyle = isAct ? '#fef08a' : '#cbd5e1';
      this.ctx.font = 'bold 15px "Segoe UI", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(tab.label, tx + tabW / 2, tabY + 25);

      this.menuButtons.push({ x: tx, y: tabY, w: tabW, h: tabH, id: 'filter_codex_' + tab.id });
    }

    // Lọc danh sách sách theo tab
    let displayIds = allBookIds;
    if (this.codexFilter === 'starter') {
      displayIds = STARTER_BOOK_IDS;
    } else if (this.codexFilter === 'evolved') {
      displayIds = allBookIds.filter(id => !STARTER_BOOK_IDS.includes(id) && !BOOK_DEFINITIONS[id].fusionIngredients && id !== 'camus' && id !== 'adam_smith' && id !== 'sartre');
    } else if (this.codexFilter === 'fusion') {
      displayIds = allBookIds.filter(id => BOOK_DEFINITIONS[id].fusionIngredients || id === 'camus' || id === 'adam_smith' || id === 'sartre');
    }

    // Vùng cuộn sách (Grid 4 cột)
    const clipX = 60;
    const clipY = 190;
    const clipW = this.canvas.width - 120;
    const clipH = 715;

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(clipX, clipY, clipW, clipH);
    this.ctx.clip();

    const cardW = 410;
    const cardH = 220;
    const gapX = 20;
    const gapY = 20;
    const cols = 4;
    const startX = clipX + (clipW - (cols * cardW + (cols - 1) * gapX)) / 2;

    for (let i = 0; i < displayIds.length; i++) {
      const bId = displayIds[i];
      const def = BOOK_DEFINITIONS[bId];
      const col = i % cols;
      const row = Math.floor(i / cols);

      const cx = startX + col * (cardW + gapX);
      const cy = clipY + 10 + row * (cardH + gapY) - this.codexScrollY;

      if (cy + cardH < clipY || cy > clipY + clipH) continue; // Culling ngoài màn hình

      const isUnlocked = this.bookSystem.unlockedCodex.has(bId);

      if (isUnlocked) {
        this.ctx.fillStyle = 'rgba(22, 28, 42, 0.94)';
        this.ctx.fillRect(cx, cy, cardW, cardH);
        this.ctx.strokeStyle = '#d4af37';
        this.ctx.lineWidth = 1.5;
        this.ctx.strokeRect(cx, cy, cardW, cardH);

        // Bìa sách bên trái (Khổ dọc portrait)
        this.bookSystem.renderBookCard(this.ctx, bId, cx + 14, cy + 15, 138, 190, false);

        // Thông tin bên phải
        const textX = cx + 168;
        const maxTextW = cardW - 180;

        // Tên tác phẩm
        this.ctx.fillStyle = '#ffd166';
        this.ctx.font = 'bold 16px "Playfair Display", Georgia, "Times New Roman", serif';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(def.work, textX, cy + 32, maxTextW);

        // Tác giả
        this.ctx.fillStyle = '#cbd5e1';
        this.ctx.font = 'italic 13px "Segoe UI", sans-serif';
        this.ctx.fillText(`✍️ Tác giả: ${def.author}`, textX, cy + 56, maxTextW);

        // Kẻ viền ngăn cách tinh tế
        this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.2)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(textX, cy + 68);
        this.ctx.lineTo(cx + cardW - 16, cy + 68);
        this.ctx.stroke();

        // Chỉ số buff (Wrap từng dòng rõ ràng, không truyền maxWidth vào fillText gây nén dẹt chữ)
        this.ctx.fillStyle = '#4ade80';
        this.ctx.font = 'bold 12px "Segoe UI", sans-serif';
        const buffWords = (def.desc || def.buffDesc || '').split(' ');
        let bLine = '✨ ';
        let bY = cy + 90;
        let lineCount = 0;
        for (const w of buffWords) {
          const test = bLine + w + ' ';
          if (this.ctx.measureText(test).width > maxTextW) {
            this.ctx.fillText(bLine, textX, bY);
            bLine = w + ' ';
            bY += 16;
            lineCount++;
            if (lineCount >= 3) break;
          } else {
            bLine = test;
          }
        }
        if (lineCount < 3 && bLine.trim()) {
          this.ctx.fillText(bLine, textX, bY);
          bY += 16;
        }

        // Điều kiện tiến hóa / Gợi ý bấm xem chi tiết
        this.ctx.fillStyle = '#38bdf8';
        this.ctx.font = '11.5px "Segoe UI", sans-serif';
        const condText = def.evolutionDesc ? `🔑 ${def.evolutionDesc}` : (def.fusionIngredients ? '🔮 Hợp thể thần thoại' : '🔑 Sách khởi đầu');
        if (this.ctx.measureText(condText).width > maxTextW) {
          this.ctx.fillText(condText.substring(0, 32) + '...', textX, cy + 158);
        } else {
          this.ctx.fillText(condText, textX, cy + 158);
        }

        this.ctx.fillStyle = '#fde047';
        this.ctx.font = 'italic 11.5px "Segoe UI", sans-serif';
        this.ctx.fillText('🔍 Nhấp thẻ để xem chi tiết', textX, cy + 182);

        // Đẩy hitbox click xem chi tiết
        this.menuButtons.push({ x: cx, y: cy, w: cardW, h: cardH, id: 'codex_inspect_' + bId });
      } else {
        // Thẻ đang khóa
        this.ctx.fillStyle = 'rgba(12, 16, 26, 0.9)';
        this.ctx.fillRect(cx, cy, cardW, cardH);
        this.ctx.strokeStyle = '#1e293b';
        this.ctx.lineWidth = 1.2;
        this.ctx.strokeRect(cx, cy, cardW, cardH);

        // Khung sách da bóng silhouette cổ điển
        const bookX = cx + 14;
        const bookY = cy + 15;
        const bookW = 138;
        const bookH = 190;
        const bookGrad = this.ctx.createLinearGradient(bookX, bookY, bookX + bookW, bookY + bookH);
        bookGrad.addColorStop(0, '#1e293b');
        bookGrad.addColorStop(1, '#0f172a');
        this.ctx.fillStyle = bookGrad;
        this.ctx.fillRect(bookX, bookY, bookW, bookH);

        // Gáy sách cổ điển
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.fillRect(bookX, bookY, 6, bookH);

        // Khung viền chỉ vàng mờ bên trong bìa
        this.ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(bookX + 8, bookY + 8, bookW - 16, bookH - 16);

        // Ổ khóa vàng nổi bật
        this.ctx.fillStyle = '#fbbf24';
        this.ctx.font = '32px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('🔒', bookX + bookW / 2, bookY + bookH / 2 - 4);

        this.ctx.fillStyle = '#94a3b8';
        this.ctx.font = 'bold 11px "Segoe UI", sans-serif';
        this.ctx.fillText('CHƯA KHÁM PHÁ', bookX + bookW / 2, bookY + bookH / 2 + 30);

        // Chữ bên phải với typography thanh lịch
        const textX = cx + 168;
        const maxTextW = cardW - 180;

        this.ctx.fillStyle = '#94a3b8';
        this.ctx.font = 'bold 16px "Playfair Display", Georgia, "Times New Roman", serif';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('???', textX, cy + 34);

        this.ctx.fillStyle = '#64748b';
        this.ctx.font = '13px "Segoe UI", sans-serif';
        this.ctx.fillText('Tác giả: Ẩn Danh', textX, cy + 58);

        // Kẻ viền ngăn cách tinh tế
        this.ctx.strokeStyle = 'rgba(71, 85, 105, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(textX, cy + 70);
        this.ctx.lineTo(cx + cardW - 16, cy + 70);
        this.ctx.stroke();

        this.ctx.fillStyle = '#94a3b8';
        this.ctx.font = '12px "Segoe UI", sans-serif';
        this.ctx.fillText('• Thu thập sách trong trận để mở khóa', textX, cy + 96, maxTextW);

        this.ctx.fillStyle = '#64748b';
        this.ctx.font = 'italic 12px "Segoe UI", sans-serif';
        this.ctx.fillText('• Điều kiện tiến cấp: Bí ẩn', textX, cy + 128, maxTextW);
      }
    }

    this.ctx.restore();

    // Thanh điều khiển Cuộn Lên / Xuống & Nút Quay Về
    const scrollBtnW = 160;
    const scrollBtnH = 46;
    const scrollBtnY = this.canvas.height - 90;

    // Nút Cuộn Lên
    const upBtnX = this.canvas.width / 2 - 280;
    this.ctx.fillStyle = '#1e293b';
    this.ctx.fillRect(upBtnX, scrollBtnY, scrollBtnW, scrollBtnH);
    this.ctx.strokeStyle = '#64748b';
    this.ctx.lineWidth = 1.5;
    this.ctx.strokeRect(upBtnX, scrollBtnY, scrollBtnW, scrollBtnH);
    this.ctx.fillStyle = '#cbd5e1';
    this.ctx.font = 'bold 15px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('▲ CUỘN LÊN', upBtnX + scrollBtnW / 2, scrollBtnY + 28);
    this.menuButtons.push({ x: upBtnX, y: scrollBtnY, w: scrollBtnW, h: scrollBtnH, id: 'codex_scroll_up' });

    // Nút Cuộn Xuống
    const downBtnX = this.canvas.width / 2 + 120;
    this.ctx.fillStyle = '#1e293b';
    this.ctx.fillRect(downBtnX, scrollBtnY, scrollBtnW, scrollBtnH);
    this.ctx.strokeStyle = '#64748b';
    this.ctx.lineWidth = 1.5;
    this.ctx.strokeRect(downBtnX, scrollBtnY, scrollBtnW, scrollBtnH);
    this.ctx.fillStyle = '#cbd5e1';
    this.ctx.font = 'bold 15px sans-serif';
    this.ctx.fillText('▼ CUỘN XUỐNG', downBtnX + scrollBtnW / 2, scrollBtnY + 28);
    this.menuButtons.push({ x: downBtnX, y: scrollBtnY, w: scrollBtnW, h: scrollBtnH, id: 'codex_scroll_down' });

    // Nút Quay Về Menu Chính
    const backBtnW = 300;
    const backBtnH = 52;
    const backBtnX = 60;
    const backBtnY = this.canvas.height - 90;

    this.ctx.fillStyle = '#334155';
    this.ctx.fillRect(backBtnX, backBtnY, backBtnW, backBtnH);
    this.ctx.strokeStyle = '#64748b';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(backBtnX, backBtnY, backBtnW, backBtnH);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 18px sans-serif';
    this.ctx.fillText('⬅ QUAY VỀ MENU CHÍNH', backBtnX + backBtnW / 2, backBtnY + 33);
    this.menuButtons.push({ x: backBtnX, y: backBtnY, w: backBtnW, h: backBtnH, id: 'back_to_menu' });

    // Modal Xem Chi Tiết Tác Phẩm nếu người chơi đã nhấp vào một cuốn sách đã mở khóa
    if (this.selectedCodexBook) {
      this.renderCodexDetailModal(this.selectedCodexBook);
    }

    this.ctx.restore();
  }

  // =========================================================================
  // MODAL CHI TIẾT TÁC PHẨM TRONG THƯ VIỆN CODEX
  // =========================================================================
  renderCodexDetailModal(bId) {
    const def = BOOK_DEFINITIONS[bId];
    if (!def) return;

    this.ctx.save();

    // Nền mờ bao phủ
    this.ctx.fillStyle = 'rgba(5, 7, 14, 0.90)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const modalW = 1040;
    const modalH = 650;
    const modalX = Math.round((this.canvas.width - modalW) / 2);
    const modalY = Math.round((this.canvas.height - modalH) / 2);
    this.codexDetailBox = { x: modalX, y: modalY, w: modalW, h: modalH };

    // Khung bảng hoàng gia viền vàng lấp lánh
    this.ctx.fillStyle = 'rgba(16, 22, 34, 0.98)';
    this.ctx.fillRect(modalX, modalY, modalW, modalH);
    this.ctx.strokeStyle = '#ffd700';
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(modalX, modalY, modalW, modalH);

    // Bìa sách lớn bên trái (Khổ dọc portrait 1 : 1.4)
    const coverW = 200;
    const coverH = 280;
    const coverX = modalX + 50;
    const coverY = modalY + 65;
    this.bookSystem.renderBookCard(this.ctx, bId, coverX, coverY, coverW, coverH, true);

    // Nhãn Trạng Thái dưới bìa sách
    this.ctx.fillStyle = '#4ade80';
    this.ctx.font = 'bold 14px "Segoe UI", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('✨ ĐÃ KHÁM PHÁ ✨', coverX + coverW / 2, coverY + coverH + 34);

    // Khu vực thông tin bên phải
    const infoX = coverX + coverW + 45;
    const maxInfoW = modalW - (coverW + 145);

    // 1. Tên tác phẩm ngôn ngữ gốc
    this.ctx.fillStyle = '#ffd166';
    this.ctx.font = 'bold 30px "Playfair Display", Georgia, "Times New Roman", serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(def.work, infoX, modalY + 75, maxInfoW);

    // 2. Tác giả & Bậc tác phẩm
    this.ctx.fillStyle = '#cbd5e1';
    this.ctx.font = 'italic 18px "Segoe UI", sans-serif';
    this.ctx.fillText(`✍️ Tác giả: ${def.author}`, infoX, modalY + 110);

    let tierLabel = '📘 Bậc: Tác Phẩm Khởi Đầu';
    let tierColor = '#38bdf8';
    if (def.fusionIngredients || bId === 'camus' || bId === 'adam_smith' || bId === 'sartre') {
      tierLabel = '🔮 Bậc: Tác Phẩm Hợp Thể / Thần Thoại Ẩn';
      tierColor = '#f59e0b';
    } else if (!STARTER_BOOK_IDS.includes(bId)) {
      tierLabel = '📙 Bậc: Tác Phẩm Tiến Hóa Cổ Điển';
      tierColor = '#c084fc';
    }

    this.ctx.fillStyle = tierColor;
    this.ctx.font = 'bold 14px "Segoe UI", sans-serif';
    this.ctx.fillText(tierLabel, infoX, modalY + 138);

    // Đường kẻ phân cách vàng kim
    this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.35)';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.moveTo(infoX, modalY + 154);
    this.ctx.lineTo(modalX + modalW - 50, modalY + 154);
    this.ctx.stroke();

    // 3. Hiệu lực & Chỉ số Buff
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 16px "Segoe UI", sans-serif';
    this.ctx.fillText('📖 HIỆU LỰC & CHỈ SỐ BUFF:', infoX, modalY + 185);

    this.ctx.fillStyle = '#4ade80';
    this.ctx.font = '15px "Segoe UI", sans-serif';
    const descWords = (def.desc || def.buffDesc || '').split(' ');
    let line = '✨ ';
    let curY = modalY + 215;
    for (const w of descWords) {
      const test = line + w + ' ';
      if (this.ctx.measureText(test).width > maxInfoW) {
        this.ctx.fillText(line, infoX, curY);
        line = w + ' ';
        curY += 25;
      } else {
        line = test;
      }
    }
    if (line.trim()) {
      this.ctx.fillText(line, infoX, curY);
      curY += 25;
    }

    // 4. Cơ chế tiến cấp hoặc nguồn gốc hợp thể
    curY += 15;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 16px "Segoe UI", sans-serif';
    this.ctx.fillText('🔮 NGUỒN GỐC & CƠ CHẾ TIẾN CẤP:', infoX, curY);
    curY += 30;

    let originText = '';
    if (def.fusionIngredients && def.fusionIngredients.length > 0) {
      const ingNames = def.fusionIngredients.map(id => {
        const b = BOOK_DEFINITIONS[id];
        return b ? `${b.work} (${b.author})` : id;
      }).join('  +  ');
      originText = `Hợp thể bí truyền từ: ${ingNames}.`;
    } else if (def.evolutionDesc) {
      originText = `Điều kiện tiến cấp: ${def.evolutionDesc}.`;
    } else if (STARTER_BOOK_IDS.includes(bId)) {
      originText = 'Tác phẩm bậc khởi đầu (Có thể chọn mang theo trước trận hoặc nhặt được khi tiêu diệt quái).';
    } else {
      originText = 'Thức tỉnh theo điều kiện bí ẩn trong trận chiến.';
    }

    this.ctx.fillStyle = '#38bdf8';
    this.ctx.font = '14px "Segoe UI", sans-serif';
    const origWords = originText.split(' ');
    let oLine = '🔑 ';
    for (const w of origWords) {
      const test = oLine + w + ' ';
      if (this.ctx.measureText(test).width > maxInfoW) {
        this.ctx.fillText(oLine, infoX, curY);
        oLine = w + ' ';
        curY += 22;
      } else {
        oLine = test;
      }
    }
    if (oLine.trim()) {
      this.ctx.fillText(oLine, infoX, curY);
    }

    // Nút Đóng Modal
    const closeBtnW = 200;
    const closeBtnH = 50;
    const closeBtnX = modalX + modalW / 2 - closeBtnW / 2;
    const closeBtnY = modalY + modalH - 75;

    this.ctx.fillStyle = '#7f1d1d';
    this.ctx.fillRect(closeBtnX, closeBtnY, closeBtnW, closeBtnH);
    this.ctx.strokeStyle = '#f87171';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(closeBtnX, closeBtnY, closeBtnW, closeBtnH);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 16px "Segoe UI", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('✖ ĐÓNG (ESC)', closeBtnX + closeBtnW / 2, closeBtnY + 31);

    this.codexDetailCloseBtn = { x: closeBtnX, y: closeBtnY, w: closeBtnW, h: closeBtnH };
    this.ctx.restore();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.gameInstance = new Game();
});
