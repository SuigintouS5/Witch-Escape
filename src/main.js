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

    // Lắng nghe sự kiện
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    this.canvas.addEventListener('click', (e) => this.onCanvasClick(e));

    // Vòng lặp chính
    this.lastTime = performance.now();
    this.fps = 60;
    this.frameCount = 0;
    this.lastFpsUpdate = performance.now();

    requestAnimationFrame((t) => this.loop(t));
  }

  initGame() {
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

  onCanvasClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    // XỬ LÝ CLICK TRÊN CÁC MÀN HÌNH MENU (MAIN_MENU, CHAR_SELECT, DIFF_SELECT, SHOP, GAME_OVER)
    if (this.gameState !== 'PLAYING') {
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
      this.masterySystem.levelUpMastery(this.skillTreeSelectedCharId);
    } else if (actionId === 'level_up_max_mastery') {
      this.masterySystem.levelUpMax(this.skillTreeSelectedCharId);
    } else if (actionId.startsWith('allocate_skill_')) {
      const skillKey = actionId.replace('allocate_skill_', '');
      this.masterySystem.allocateSkill(this.skillTreeSelectedCharId, skillKey);
    } else if (actionId === 'reset_mastery_skills') {
      this.masterySystem.resetSkills(this.skillTreeSelectedCharId);
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
    } else if (actionId === 'back_to_menu') {
      this.gameState = 'MAIN_MENU';
    } else if (actionId === 'back_to_char_select') {
      this.gameState = 'CHAR_SELECT';
    } else if (actionId === 'back_to_mode_select') {
      this.gameState = 'MODE_SELECT';
    } else if (actionId === 'back_to_challenge_select') {
      this.gameState = 'CHALLENGE_SELECT';
    } else if (actionId.startsWith('buy_upgrade_')) {
      const upId = actionId.replace('buy_upgrade_', '');
      this.meta.buyUpgrade(upId);
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
      if (!this.isPaused && !this.isLevelUpOpen && !this.isEvolutionOpen) {
        this.update(delta);
      }
    } else {
      // Menu background ambient update
      this.particles.update(delta);
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

      // Cập nhật UpgradeManager (đếm ngược thời gian khóa ô kỹ năng 7 của Yuki)
      this.upgradeManager.update(delta);

      // Tự hồi máu nếu có trang bị (kiểm tra thử thách Không Hồi Máu)
      const regenItem = this.upgradeManager.passivePool.regen;
      if (regenItem && regenItem.level > 0 && !regenItem.isLocked) {
        this.player.heal(regenItem.level * 1.0 * delta);
      }

      // 1. Vũ khí tự động
      const dmgMult = this.skillManager.getDamageMultiplier() * (this.player.isWitch ? 1.30 : 1.0);
      const onEnemyKill = (killedEnemy) => {
        this.killCount++;
        this.skillManager.onDamageDealt(30, this.player);

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
          const finalDmg = enemy.damage * (1.0 - dmgReduction);
          if (this.player.takeDamage(finalDmg)) {
            const thornItem = this.upgradeManager.passivePool.thorns;
            if (thornItem && thornItem.level > 0 && !thornItem.isLocked) {
              enemy.takeDamage(20 * thornItem.level);
              this.particles.createDamageNumber(enemy.x, enemy.y, 20 * thornItem.level);
            }
          }
        }
      }

      // 6. Đạn của quái đánh xa
      for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
        const proj = this.enemyProjectiles[i];
        proj.update(delta, this.player);
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

      // 10. Màn hình Tạm Dừng
      if (this.isPaused) {
        this.renderPauseMenu();
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
    const hpBarW = 518;
    const hpBarH = 26;

    this.ctx.fillStyle = 'rgba(10, 15, 25, 0.90)';
    this.ctx.fillRect(hpBarX - 3, hpBarY - 3, hpBarW + 6, hpBarH + 6);
    this.ctx.strokeStyle = '#3a4d6b';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(hpBarX - 3, hpBarY - 3, hpBarW + 6, hpBarH + 6);

    const hpPercent = Math.max(0, this.player.health / this.player.maxHealth);
    const grad = this.ctx.createLinearGradient(hpBarX, 0, hpBarX + hpBarW, 0);
    grad.addColorStop(0, '#e63946');
    grad.addColorStop(1, '#ff6b81');

    this.ctx.fillStyle = grad;
    this.ctx.fillRect(hpBarX, hpBarY, hpBarW * hpPercent, hpBarH);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 15px "Segoe UI", Arial, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`MÁU: ${Math.round(this.player.health)} / ${this.player.maxHealth}`, hpBarX + hpBarW / 2, hpBarY + 19);

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

    this.ctx.fillStyle = 'rgba(5, 8, 15, 0.85)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const panelW = 820;
    const panelH = 540;
    const panelX = this.canvas.width / 2 - panelW / 2;
    const panelY = this.canvas.height / 2 - panelH / 2;

    this.ctx.fillStyle = 'rgba(16, 24, 38, 0.96)';
    this.ctx.fillRect(panelX, panelY, panelW, panelH);
    this.ctx.strokeStyle = '#d4af37';
    this.ctx.lineWidth = 2.5;
    this.ctx.strokeRect(panelX, panelY, panelW, panelH);

    this.ctx.fillStyle = '#ffd166';
    this.ctx.font = 'bold 44px "Segoe UI", serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('ĐÃ TẠM DỪNG', this.canvas.width / 2, panelY + 62);

    this.ctx.fillStyle = '#b0c4de';
    this.ctx.font = '19px sans-serif';
    this.ctx.fillText('Nhấn phím [P] hoặc [ESC] để tiếp tục chơi', this.canvas.width / 2, panelY + 102);

    this.ctx.fillStyle = '#ff88aa';
    this.ctx.font = '15px monospace';
    this.ctx.fillText('Phím [1]: Sinh Tử Thần  |  Phím [2]: Sinh Gokucho  |  Phím [6]: Thức Tỉnh Witch', this.canvas.width / 2, panelY + 142);
    this.ctx.fillText('Phím [4]: Nhận ngay 20 XP  |  Phím [5]: Max cấp vũ khí & Thả Rương Tiến Hóa', this.canvas.width / 2, panelY + 168);
    this.ctx.fillStyle = '#4ade80';
    this.ctx.fillText('⏩ Phím [7]: Tua +60s  |  ⏩ Phím [8]: Nhảy tới mốc Boss tiếp theo  |  ⏩ Phím [9]: Tua +3 phút', this.canvas.width / 2, panelY + 196);

    // Cập nhật vị trí các nút trong pauseActions
    const p = this.pauseActions;
    p.resume.x = this.canvas.width / 2 - 180;
    p.resume.y = panelY + 235;
    p.resume.w = 360;
    p.resume.h = 58;

    p.saveExit.x = this.canvas.width / 2 - 290;
    p.saveExit.y = panelY + 315;
    p.saveExit.w = 270;
    p.saveExit.h = 56;

    p.exitFinish.x = this.canvas.width / 2 + 20;
    p.exitFinish.y = panelY + 315;
    p.exitFinish.w = 270;
    p.exitFinish.h = 56;

    // 1. Nút Tiếp Tục Chơi
    this.ctx.fillStyle = '#2d6a4f';
    this.ctx.fillRect(p.resume.x, p.resume.y, p.resume.w, p.resume.h);
    this.ctx.strokeStyle = '#52b788';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(p.resume.x, p.resume.y, p.resume.w, p.resume.h);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 22px sans-serif';
    this.ctx.fillText('▶ TIẾP TỤC CHƠI', p.resume.x + p.resume.w / 2, p.resume.y + 37);

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
    this.ctx.font = 'italic 16px sans-serif';
    this.ctx.fillText('💡 "Lưu & Thoát" sẽ giữ nguyên cấp độ và trang bị để tiếp tục sau.', this.canvas.width / 2, panelY + 420);

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
        y: 415,
        color: '#1d4ed8',
        border: '#60a5fa'
      });
      buttons.push({ id: 'start_game', label: '⚔️ BẮT ĐẦU CHƠI MỚI', y: 485, color: '#2d6a4f', border: '#52b788' });
      buttons.push({ id: 'open_skill_tree', label: '✨ CÂY KỸ NĂNG & THÔNG THẠO', y: 555, color: '#581c87', border: '#c084fc' });
      buttons.push({ id: 'open_shop', label: '🏪 NÂNG CẤP VĨNH VIỄN', y: 625, color: '#854d0e', border: '#eab308' });
      buttons.push({ id: 'how_to_play', label: '📜 HƯỚNG DẪN & ĐIỀU KHIỂN', y: 695, color: '#1e293b', border: '#475569' });
    } else {
      buttons.push({ id: 'start_game', label: '⚔️ BẮT ĐẦU CHƠI', y: 435, color: '#2d6a4f', border: '#52b788' });
      buttons.push({ id: 'open_skill_tree', label: '✨ CÂY KỸ NĂNG & THÔNG THẠO', y: 510, color: '#581c87', border: '#c084fc' });
      buttons.push({ id: 'open_shop', label: '🏪 NÂNG CẤP VĨNH VIỄN', y: 585, color: '#854d0e', border: '#eab308' });
      buttons.push({ id: 'how_to_play', label: '📜 HƯỚNG DẪN & ĐIỀU KHIỂN', y: 660, color: '#1e293b', border: '#475569' });
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
      this.ctx.font = '16px monospace';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(`❤️ Máu tối đa: ${char.maxHealth}`, cx + 35, statY);
      this.ctx.fillText(`👟 Tốc độ: ${char.baseSpeed}`, cx + 35, statY + 30);
      this.ctx.fillText(`💥 Chí mạng: ${(char.critChance * 100).toFixed(0)}% (x${char.critDamage})`, cx + 35, statY + 60);

      // Cấp Thông Thạo & Score của nhân vật
      const mastery = this.masterySystem.getCharData(char.id);
      this.ctx.fillStyle = '#fbbf24';
      this.ctx.fillText(`⭐ Thông Thạo: Cấp ${mastery.level}/100`, cx + 35, statY + 90);
      this.ctx.fillStyle = '#c084fc';
      this.ctx.fillText(`🔮 Điểm Score: ${mastery.score.toLocaleString()}`, cx + 35, statY + 115);

      // Mô tả
      this.ctx.fillStyle = '#94a3b8';
      this.ctx.font = '15px sans-serif';
      const words = char.desc.split(' ');
      let line = '';
      let descY = statY + 145;
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

    // Start
    this.ctx.fillStyle = '#b91c1c';
    this.ctx.fillRect(nextBtnX, actionBtnY, startBattleW, startBattleH);
    this.ctx.strokeStyle = '#ef4444';
    this.ctx.lineWidth = 2.5;
    this.ctx.strokeRect(nextBtnX, actionBtnY, startBattleW, startBattleH);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 22px sans-serif';
    this.ctx.fillText('🔥 XUẤT TRẬN NGAY 🔥', nextBtnX + startBattleW / 2, actionBtnY + 41);
    this.menuButtons.push({ x: nextBtnX, y: actionBtnY, w: startBattleW, h: startBattleH, id: 'start_battle_now' });

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
    this.ctx.fillText('CỔ VIỆN MA PHÁP (NÂNG CẤP VĨNH VIỄN)', this.canvas.width / 2, 100);

    this.ctx.fillStyle = '#ffd700';
    this.ctx.font = 'bold 28px monospace';
    this.ctx.fillText(`🪙 Tiền Vàng Hiện Có: ${this.meta.gold}`, this.canvas.width / 2, 150);

    // Danh sách 5 nâng cấp
    const upgrades = Object.values(this.meta.upgrades);
    const itemW = 900;
    const itemH = 95;
    const startX = this.canvas.width / 2 - itemW / 2;
    let startY = 200;

    for (const up of upgrades) {
      const isMax = up.level >= up.maxLevel;
      const cost = this.meta.getCost(up.id);
      const canAfford = this.meta.gold >= cost && !isMax;

      this.ctx.fillStyle = 'rgba(20, 30, 48, 0.9)';
      this.ctx.fillRect(startX, startY, itemW, itemH);
      this.ctx.strokeStyle = '#3a4d6b';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(startX, startY, itemW, itemH);

      // Icon & Tên
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '36px sans-serif';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(up.icon, startX + 22, startY + 60);

      this.ctx.font = 'bold 22px "Segoe UI", sans-serif';
      this.ctx.fillStyle = '#ffd166';
      this.ctx.fillText(up.name, startX + 80, startY + 38);

      // Mô tả & Cấp độ
      this.ctx.font = '16px sans-serif';
      this.ctx.fillStyle = '#cbd5e1';
      this.ctx.fillText(up.desc, startX + 80, startY + 68);

      // Vạch hiển thị cấp độ
      const pipX = startX + 540;
      for (let p = 1; p <= up.maxLevel; p++) {
        this.ctx.fillStyle = p <= up.level ? '#ffd700' : '#334155';
        this.ctx.fillRect(pipX + p * 16, startY + 38, 12, 20);
      }

      // Nút Mua Nâng Cấp
      const buyBtnW = 150;
      const buyBtnH = 50;
      const buyBtnX = startX + itemW - buyBtnW - 20;
      const buyBtnY = startY + (itemH - buyBtnH) / 2;

      this.ctx.fillStyle = isMax ? '#334155' : (canAfford ? '#2d6a4f' : '#7f1d1d');
      this.ctx.fillRect(buyBtnX, buyBtnY, buyBtnW, buyBtnH);
      this.ctx.strokeStyle = isMax ? '#64748b' : (canAfford ? '#52b788' : '#ef4444');
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeRect(buyBtnX, buyBtnY, buyBtnW, buyBtnH);

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 18px sans-serif';
      this.ctx.textAlign = 'center';
      if (isMax) {
        this.ctx.fillText('ĐÃ MAX', buyBtnX + buyBtnW / 2, buyBtnY + 31);
      } else {
        this.ctx.fillText(`🪙 ${cost}`, buyBtnX + buyBtnW / 2, buyBtnY + 31);
        this.menuButtons.push({ x: buyBtnX, y: buyBtnY, w: buyBtnW, h: buyBtnH, id: 'buy_upgrade_' + up.id });
      }

      startY += itemH + 20;
    }

    // Nút Quay lại Menu Chính
    const backBtnW = 320;
    const backBtnH = 58;
    const backBtnX = this.canvas.width / 2 - backBtnW / 2;
    const backBtnY = this.canvas.height - 120;

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
    const bannerH = 100;

    this.ctx.fillStyle = 'rgba(22, 14, 40, 0.94)';
    this.ctx.fillRect(bannerX, bannerY, bannerW, bannerH);
    this.ctx.strokeStyle = '#7c3aed';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(bannerX, bannerY, bannerW, bannerH);

    // Cột 1 Banner: Avatar & Thông tin cơ bản
    const avBoxX = bannerX + 18;
    const avBoxY = bannerY + 12;
    const avBoxSize = 76;
    this.ctx.fillStyle = 'rgba(10, 5, 20, 0.7)';
    this.ctx.fillRect(avBoxX, avBoxY, avBoxSize, avBoxSize);
    this.ctx.strokeStyle = '#fbbf24';
    this.ctx.lineWidth = 1.5;
    this.ctx.strokeRect(avBoxX, avBoxY, avBoxSize, avBoxSize);

    const cImg = getIconImage(selectedCharConfig.sprite);
    if (cImg && cImg.complete) {
      if (selectedCharConfig.spriteSheet) {
        const fw = Math.floor(cImg.naturalWidth / selectedCharConfig.spriteSheet.cols);
        const fh = Math.floor(cImg.naturalHeight / selectedCharConfig.spriteSheet.rows);
        this.ctx.drawImage(cImg, 0, 0, fw, fh, avBoxX + 10, avBoxY + 10, avBoxSize - 20, avBoxSize - 20);
      } else {
        this.ctx.drawImage(cImg, avBoxX + 12, avBoxY + 5, avBoxSize - 24, avBoxSize - 10);
      }
    }

    const infoTextX = avBoxX + avBoxSize + 22;
    this.ctx.textAlign = 'left';
    this.ctx.fillStyle = '#ffea79';
    this.ctx.font = 'bold 22px "Segoe UI", sans-serif';
    this.ctx.fillText(selectedCharConfig.name, infoTextX, bannerY + 36);

    this.ctx.fillStyle = '#c084fc';
    this.ctx.font = 'italic 15px sans-serif';
    this.ctx.fillText(selectedCharConfig.title, infoTextX, bannerY + 58);

    this.ctx.fillStyle = '#f59e0b';
    this.ctx.font = 'bold 18px "Segoe UI", sans-serif';
    this.ctx.fillText(`⭐ THÔNG THẠO: CẤP ${charMastery.level} / 100`, infoTextX, bannerY + 84);

    // Cột 2 Banner: Thanh tiến trình Score & Nút Nâng Cấp Thông Thạo
    const progX = bannerX + 540;
    const progY = bannerY + 22;
    const progW = 440;
    const progH = 24;

    this.ctx.fillStyle = '#e2e8f0';
    this.ctx.font = 'bold 15px sans-serif';
    this.ctx.fillText(`Điểm Score Tích Lũy: ${charMastery.score.toLocaleString()} Score`, progX, progY - 8);

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
    this.ctx.font = 'bold 13px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
      isMaxMastery ? 'MAX CẤP THÔNG THẠO (100/100)' : `${charMastery.score.toLocaleString()} / ${neededScore.toLocaleString()} Score (${Math.floor(scoreRatio * 100)}%)`,
      progX + progW / 2,
      progY + 17
    );

    // Nút Nâng 1 Cấp
    const upBtnW = 190;
    const upBtnH = 44;
    const upBtnX = progX + progW + 28;
    const upBtnY = bannerY + 28;
    this.ctx.fillStyle = canLevelUp ? '#15803d' : '#1e293b';
    this.ctx.fillRect(upBtnX, upBtnY, upBtnW, upBtnH);
    this.ctx.strokeStyle = canLevelUp ? '#4ade80' : '#475569';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(upBtnX, upBtnY, upBtnW, upBtnH);
    this.ctx.fillStyle = canLevelUp ? '#ffffff' : '#94a3b8';
    this.ctx.font = 'bold 15px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(isMaxMastery ? 'ĐÃ ĐẠT MAX' : '⬆️ NÂNG 1 CẤP', upBtnX + upBtnW / 2, upBtnY + 28);
    if (canLevelUp) {
      this.menuButtons.push({ x: upBtnX, y: upBtnY, w: upBtnW, h: upBtnH, id: 'level_up_mastery' });
    }

    // Nút Nâng Tối Đa
    const maxBtnW = 160;
    const maxBtnH = 44;
    const maxBtnX = upBtnX + upBtnW + 15;
    const maxBtnY = upBtnY;
    this.ctx.fillStyle = canLevelUp ? '#b45309' : '#1e293b';
    this.ctx.fillRect(maxBtnX, maxBtnY, maxBtnW, maxBtnH);
    this.ctx.strokeStyle = canLevelUp ? '#fde047' : '#475569';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(maxBtnX, maxBtnY, maxBtnW, maxBtnH);
    this.ctx.fillStyle = canLevelUp ? '#ffffff' : '#94a3b8';
    this.ctx.font = 'bold 15px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('🚀 NÂNG TỐI ĐA', maxBtnX + maxBtnW / 2, maxBtnY + 28);
    if (canLevelUp) {
      this.menuButtons.push({ x: maxBtnX, y: maxBtnY, w: maxBtnW, h: maxBtnH, id: 'level_up_max_mastery' });
    }

    // Cột 3 Banner: Điểm Kỹ Năng & Nút Reset
    const skillBoxX = maxBtnX + maxBtnW + 35;
    this.ctx.textAlign = 'left';
    this.ctx.fillStyle = '#fde047';
    this.ctx.font = 'bold 20px "Segoe UI", sans-serif';
    this.ctx.fillText(`🌟 ĐIỂM KỸ NĂNG: ${charMastery.skillPoints}`, skillBoxX, bannerY + 44);

    this.ctx.fillStyle = '#94a3b8';
    this.ctx.font = '13px sans-serif';
    this.ctx.fillText('1 Cấp Thông Thạo = 1 Điểm', skillBoxX, bannerY + 68);

    const resetBtnW = 165;
    const resetBtnH = 38;
    const resetBtnX = bannerX + bannerW - resetBtnW - 18;
    const resetBtnY = bannerY + 31;
    this.ctx.fillStyle = '#831843';
    this.ctx.fillRect(resetBtnX, resetBtnY, resetBtnW, resetBtnH);
    this.ctx.strokeStyle = '#f472b6';
    this.ctx.lineWidth = 1.5;
    this.ctx.strokeRect(resetBtnX, resetBtnY, resetBtnW, resetBtnH);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 14px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('🔄 TẨY ĐIỂM (RESET)', resetBtnX + resetBtnW / 2, resetBtnY + 24);
    this.menuButtons.push({ x: resetBtnX, y: resetBtnY, w: resetBtnW, h: resetBtnH, id: 'reset_mastery_skills' });

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

        // Nút Nâng Điểm [+]
        const addBtnW = 105;
        const addBtnH = 46;
        const addBtnX = colX + colW - addBtnW - 14;
        const addBtnY = cardY + 52;
        const canAddPoint = (charMastery.skillPoints > 0 && curLvl < maxLvl);

        if (curLvl >= maxLvl) {
          this.ctx.fillStyle = '#1e293b';
          this.ctx.fillRect(addBtnX, addBtnY, addBtnW, addBtnH);
          this.ctx.strokeStyle = '#475569';
          this.ctx.lineWidth = 1.5;
          this.ctx.strokeRect(addBtnX, addBtnY, addBtnW, addBtnH);
          this.ctx.fillStyle = '#f59e0b';
          this.ctx.font = 'bold 15px sans-serif';
          this.ctx.textAlign = 'center';
          this.ctx.fillText('ĐÃ MAX', addBtnX + addBtnW / 2, addBtnY + 29);
        } else {
          this.ctx.fillStyle = canAddPoint ? '#6d28d9' : '#1e293b';
          this.ctx.fillRect(addBtnX, addBtnY, addBtnW, addBtnH);
          this.ctx.strokeStyle = canAddPoint ? '#fbbf24' : '#334155';
          this.ctx.lineWidth = canAddPoint ? 2 : 1;
          this.ctx.strokeRect(addBtnX, addBtnY, addBtnW, addBtnH);
          this.ctx.fillStyle = canAddPoint ? '#ffffff' : '#64748b';
          this.ctx.font = 'bold 15px sans-serif';
          this.ctx.textAlign = 'center';
          this.ctx.fillText('[+] NÂNG', addBtnX + addBtnW / 2, addBtnY + 29);

          if (canAddPoint) {
            this.menuButtons.push({ x: addBtnX, y: addBtnY, w: addBtnW, h: addBtnH, id: 'allocate_skill_' + skillKey });
          }
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
    const statBoxW = 820;
    const statBoxH = 540;
    const statBoxX = this.canvas.width / 2 - statBoxW / 2;
    const statBoxY = 160;

    this.ctx.fillStyle = 'rgba(20, 24, 36, 0.96)';
    this.ctx.fillRect(statBoxX, statBoxY, statBoxW, statBoxH);
    this.ctx.strokeStyle = s.isVictory ? '#ffd700' : '#d4af37';
    this.ctx.lineWidth = 2.5;
    this.ctx.strokeRect(statBoxX, statBoxY, statBoxW, statBoxH);

    const minutes = Math.floor(s.survivalTime / 60);
    const seconds = Math.floor(s.survivalTime % 60);

    const leftX = statBoxX + 50;
    let textY = statBoxY + 55;

    this.ctx.font = '21px "Segoe UI", sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillStyle = '#cbd5e1';
    this.ctx.fillText(`⏱️ Thời gian sống sót:`, leftX, textY);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText(`${minutes} phút ${seconds} giây`, leftX + 340, textY);

    textY += 44;
    this.ctx.fillStyle = '#cbd5e1';
    this.ctx.fillText(`💀 Số quái vật tiêu diệt:`, leftX, textY);
    this.ctx.fillStyle = '#ff88aa';
    this.ctx.fillText(`${s.kills} quái`, leftX + 340, textY);

    textY += 44;
    this.ctx.fillStyle = '#cbd5e1';
    this.ctx.fillText(`⭐ Cấp độ đạt được:`, leftX, textY);
    this.ctx.fillStyle = '#00b4d8';
    this.ctx.fillText(`Cấp ${s.level}`, leftX + 340, textY);

    textY += 44;
    this.ctx.fillStyle = '#cbd5e1';
    this.ctx.fillText(`⚔️ Chế độ & Độ khó:`, leftX, textY);
    this.ctx.fillStyle = this.selectedDiff.color;
    this.ctx.fillText(`${this.selectedMode.name} - ${this.selectedDiff.name}`, leftX + 340, textY);

    textY += 44;
    this.ctx.fillStyle = '#cbd5e1';
    this.ctx.fillText(`🔥 Thưởng Thử Thách:`, leftX, textY);
    if (s.qualifiedForChallengeBonus && s.challengeScoreBonus > 0) {
      this.ctx.fillStyle = '#4ade80';
      this.ctx.fillText(`+${Math.round(s.challengeScoreBonus * 100)}% Điểm  |  +${Math.round(s.challengeGoldBonus * 100)}% Vàng`, leftX + 340, textY);
    } else if (!s.qualifiedForChallengeBonus && (s.activeChallenges && s.activeChallenges.length > 0)) {
      this.ctx.fillStyle = '#f87171';
      this.ctx.fillText(`Chưa đạt 2 phút (không kích hoạt bonus)`, leftX + 340, textY);
    } else {
      this.ctx.fillStyle = '#94a3b8';
      this.ctx.fillText(`Không có thử thách`, leftX + 340, textY);
    }

    // Đường kẻ phân cách
    textY += 30;
    this.ctx.strokeStyle = '#3a4d6b';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.moveTo(leftX, textY);
    this.ctx.lineTo(leftX + 720, textY);
    this.ctx.stroke();

    // Điểm số & Tiền thưởng
    textY += 46;
    this.ctx.font = 'bold 26px "Segoe UI", sans-serif';
    this.ctx.fillStyle = '#ffd166';
    this.ctx.fillText(`🏆 TỔNG ĐIỂM SỐ:`, leftX, textY);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText(`${s.score.toLocaleString()} ĐIỂM`, leftX + 340, textY);

    textY += 44;
    this.ctx.fillStyle = '#ffd700';
    this.ctx.fillText(`🪙 VÀNG THU THẬP:`, leftX, textY);
    this.ctx.fillStyle = '#ffe600';
    this.ctx.fillText(`+${s.goldEarned} Vàng`, leftX + 340, textY);

    textY += 44;
    this.ctx.fillStyle = '#c084fc';
    this.ctx.fillText(`🔮 THÔNG THẠO (${s.charName || 'Nhân Vật'}):`, leftX, textY);
    this.ctx.fillStyle = '#fde047';
    if (s.charMastery) {
      this.ctx.fillText(`+${s.score.toLocaleString()} Score (Cấp ${s.charMastery.level}/100)`, leftX + 340, textY);
    } else {
      this.ctx.fillText(`+${s.score.toLocaleString()} Score`, leftX + 340, textY);
    }

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
}

window.addEventListener('DOMContentLoaded', () => {
  window.gameInstance = new Game();
});
