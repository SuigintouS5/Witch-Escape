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

    // Quản lý Trạng thái Màn hình Game (State Machine)
    // 'MAIN_MENU' | 'CHAR_SELECT' | 'DIFF_SELECT' | 'SHOP' | 'PLAYING' | 'GAME_OVER'
    this.gameState = 'MAIN_MENU';

    // Lựa chọn nhân vật & độ khó đã chọn
    this.selectedChar = CONFIG.CHARACTERS[0];
    this.selectedDiff = CONFIG.DIFFICULTIES[0];

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

    // Lấy chỉ số nâng cấp ngoài trận từ MetaProgression
    const metaBonuses = this.meta.getBonusStats();

    // Khởi tạo Nhân vật được chọn kèm bonus
    this.player = new Player(
      CONFIG.WORLD_WIDTH / 2,
      CONFIG.WORLD_HEIGHT / 2,
      this.selectedChar,
      metaBonuses
    );

    this.skillManager = new SkillManager();

    // Khởi tạo Vũ khí khởi đầu theo nhân vật
    const startWeaponId = this.selectedChar.startingWeaponId || 'main_sword';
    this.weaponManager = new WeaponManager(startWeaponId);
    this.upgradeManager = new UpgradeManager(this.weaponManager, this.skillManager);

    // Cập nhật độ khó cho Spawner
    this.spawner.setDifficulty(this.selectedDiff);

    this.enemies = [];
    this.enemyProjectiles = [];
    this.playerProjectiles = [];
    this.experienceGems = [];
    this.evolutionDrops = [];

    this.isPaused = false;
    this.isLevelUpOpen = false;
    this.isEvolutionOpen = false;
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
        selectedDiffId: this.selectedDiff.id,
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

    // Tìm lại char và diff
    const char = CONFIG.CHARACTERS.find(c => c.id === data.selectedCharId) || CONFIG.CHARACTERS[0];
    const diff = CONFIG.DIFFICULTIES.find(d => d.id === data.selectedDiffId) || CONFIG.DIFFICULTIES[0];
    this.selectedChar = char;
    this.selectedDiff = diff;

    // Lấy chỉ số nâng cấp ngoài trận từ MetaProgression
    const metaBonuses = this.meta.getBonusStats();

    // Khởi tạo Player
    this.player = new Player(
      data.player.x,
      data.player.y,
      this.selectedChar,
      metaBonuses
    );
    this.player.health = data.player.health;
    this.player.maxHealth = data.player.maxHealth;

    this.skillManager = new SkillManager();
    this.skillManager.restoreSkillsData(data.skills);

    const startWeaponId = this.selectedChar.startingWeaponId || 'main_sword';
    this.weaponManager = new WeaponManager(startWeaponId);
    this.upgradeManager = new UpgradeManager(this.weaponManager, this.skillManager);
    this.upgradeManager.restoreEquippedData(data.equipped, this.player);

    this.spawner.setDifficulty(this.selectedDiff);

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
    const rawScore = timeScore + killScore + levelScore;
    const finalScore = Math.round(rawScore * (this.selectedDiff.scoreMult || 1.0));

    // Tính toán Tiền Vàng nhận được: dựa vào quái giết được + thời gian sống + nhân độ khó + bonus shop + clover
    const metaBonuses = this.meta.getBonusStats();
    const cloverMult = this.upgradeManager ? this.upgradeManager.getCloverGoldBonus() : 1.0;
    const baseGold = Math.floor(this.killCount * 1.5 + this.gameTime * 0.4 + this.level * 5);
    const finalGold = Math.round(baseGold * (this.selectedDiff.goldMult || 1.0) * metaBonuses.goldMultiplier * cloverMult);

    // Lưu trữ vào MetaProgression
    this.meta.gold += finalGold;
    this.meta.totalKills += this.killCount;
    if (finalScore > this.meta.highScore) {
      this.meta.highScore = finalScore;
    }
    this.meta.save();

    this.endGameStats = {
      score: finalScore,
      goldEarned: finalGold,
      survivalTime: this.gameTime,
      kills: this.killCount,
      level: this.level
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
    } else if (actionId === 'how_to_play') {
      alert('🎮 HƯỚNG DẪN CHƠI:\n- Di chuyển: Phím W, A, S, D hoặc Mũi tên\n- Tấn công: Tự động 100%\n- Nhặt Đá Kinh Nghiệm để thăng cấp và chọn vũ khí\n- Khi có 2 vũ khí Max Cấp 7, Lõi Tiến Hóa sẽ rơi xuống để Hợp Nhất Vũ Khí Tối Thượng!\n- Tiêu diệt quái kiếm Vàng để Nâng Cấp Vĩnh Viễn tại Cổ Viện Ma Pháp.');
    } else if (actionId.startsWith('select_char_')) {
      if (btnData.charData) this.selectedChar = btnData.charData;
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

  update(delta) {
    if (!this.player.isDead) {
      this.gameTime += delta;
      this.player.update(delta, this.input);
      this.camera.follow(this.player);

      // Tự hồi máu nếu có trang bị
      const regenItem = this.upgradeManager.passivePool.regen;
      if (regenItem && regenItem.level > 0) {
        this.player.health = Math.min(this.player.maxHealth, this.player.health + regenItem.level * 1.0 * delta);
      }

      // 1. Vũ khí tự động
      const dmgMult = this.skillManager.getDamageMultiplier();
      const onEnemyKill = (killedEnemy) => {
        this.killCount++;
        this.skillManager.onDamageDealt(30, this.player);

        // Hiệu ứng nổ phép thuật Arcane FX cho quái tinh anh
        if (killedEnemy.isElite) {
          this.particles.createArcaneBlast(killedEnemy.x, killedEnemy.y, 2.6);
        }

        // Rơi Đá Kinh Nghiệm
        let xpVal = 1;
        if (killedEnemy.isElite) xpVal = 30;
        else if (killedEnemy.isRanged) xpVal = 8;
        else if (killedEnemy.config.id === 'skeleton') xpVal = 3;

        this.experienceGems.push(new ExperienceGem(killedEnemy.x, killedEnemy.y, xpVal));

        // Rơi Rương Tiến Hóa nếu đủ điều kiện
        if (this.upgradeManager.canEvolve && this.evolutionDrops.length === 0) {
          if (killedEnemy.isElite || Math.random() < 0.25) {
            this.evolutionDrops.push(new EvolutionDrop(killedEnemy.x, killedEnemy.y));
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

      // 2. Đạn kiếm của người chơi
      for (let i = this.playerProjectiles.length - 1; i >= 0; i--) {
        const proj = this.playerProjectiles[i];
        proj.update(delta, this.enemies, this.particles, onEnemyKill);
        if (proj.isDead) {
          this.playerProjectiles.splice(i, 1);
        }
      }

      // 3. Dọn quái chết
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        if (this.enemies[i].isDead) {
          this.enemies.splice(i, 1);
        }
      }

      // 4. Sinh quái mới
      const newEnemy = this.spawner.update(delta, this.gameTime, this.camera, this.enemies);
      if (newEnemy) {
        this.enemies.push(newEnemy);
      }

      // 5. Quái bám đuổi & gây sát thương
      const onEnemyShoot = (sx, sy, tx, ty) => {
        this.enemyProjectiles.push(new EnemyProjectile(sx, sy, tx, ty));
      };

      const dmgReduction = this.upgradeManager.getDamageReduction();

      for (let i = 0; i < this.enemies.length; i++) {
        const enemy = this.enemies[i];
        enemy.update(delta, this.player, this.enemies, onEnemyShoot);

        const dist = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
        if (dist < enemy.getHitboxRadius() + this.player.getHitboxRadius()) {
          const finalDmg = enemy.damage * (1.0 - dmgReduction);
          if (this.player.takeDamage(finalDmg)) {
            const thornItem = this.upgradeManager.passivePool.thorns;
            if (thornItem && thornItem.level > 0) {
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

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Nếu đang trong trận đấu
    if (this.gameState === 'PLAYING') {
      // 1. Mặt đất
      this.map.renderGround(this.ctx, this.camera);

      // 2. Đá Kinh Nghiệm & Rương Tiến Hóa
      for (const gem of this.experienceGems) {
        gem.render(this.ctx, this.camera);
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
      case 'DIFF_SELECT':
        this.renderDiffSelect();
        break;
      case 'SHOP':
        this.renderShop();
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

    // --- ĐỒNG HỒ SINH TỒN ---
    const minutes = Math.floor(this.gameTime / 60);
    const seconds = Math.floor(this.gameTime % 60);
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    this.ctx.fillStyle = 'rgba(12, 18, 30, 0.88)';
    this.ctx.fillRect(this.canvas.width / 2 - 100, 32, 200, 48);
    this.ctx.strokeStyle = '#d4af37';
    this.ctx.lineWidth = 1.8;
    this.ctx.strokeRect(this.canvas.width / 2 - 100, 32, 200, 48);

    this.ctx.fillStyle = '#ffecb3';
    this.ctx.font = 'bold 26px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(timeStr, this.canvas.width / 2, 66);

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

    const panelW = 760;
    const panelH = 500;
    const panelX = this.canvas.width / 2 - panelW / 2;
    const panelY = this.canvas.height / 2 - panelH / 2;

    this.ctx.fillStyle = 'rgba(16, 24, 38, 0.96)';
    this.ctx.fillRect(panelX, panelY, panelW, panelH);
    this.ctx.strokeStyle = '#d4af37';
    this.ctx.lineWidth = 2.5;
    this.ctx.strokeRect(panelX, panelY, panelW, panelH);

    this.ctx.fillStyle = '#ffd166';
    this.ctx.font = 'bold 48px "Segoe UI", serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('ĐÃ TẠM DỪNG', this.canvas.width / 2, panelY + 70);

    this.ctx.fillStyle = '#b0c4de';
    this.ctx.font = '20px sans-serif';
    this.ctx.fillText('Nhấn phím [P] hoặc [ESC] để tiếp tục chơi', this.canvas.width / 2, panelY + 115);

    this.ctx.fillStyle = '#ff88aa';
    this.ctx.font = '16px monospace';
    this.ctx.fillText('Phím [1]: Sinh Tử Thần  |  Phím [2]: Sinh Gokucho', this.canvas.width / 2, panelY + 160);
    this.ctx.fillText('Phím [4]: Nhận ngay 20 XP  |  Phím [5]: Max cấp vũ khí & Thả Rương', this.canvas.width / 2, panelY + 190);

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
    this.ctx.fillText('VAMPIRE SURVIVAL 2D', this.canvas.width / 2, 230);

    this.ctx.shadowBlur = 0;
    this.ctx.fillStyle = '#ff70a6';
    this.ctx.font = 'italic 26px "Segoe UI", sans-serif';
    this.ctx.fillText('— Rừng Đêm Hắc Ám & Bão Kiếm Huyền Thoại —', this.canvas.width / 2, 290);

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
    const btnW = 460;
    const btnH = 64;
    const btnX = this.canvas.width / 2 - btnW / 2;

    const buttons = [];
    if (savedInfo) {
      const minutes = Math.floor(savedInfo.gameTime / 60);
      const seconds = Math.floor(savedInfo.gameTime % 60);
      const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      buttons.push({
        id: 'resume_saved_game',
        label: `▶️ TIẾP TỤC (Cấp ${savedInfo.level} - ⏱️ ${timeStr})`,
        y: 425,
        color: '#1d4ed8',
        border: '#60a5fa'
      });
      buttons.push({ id: 'start_game', label: '⚔️ BẮT ĐẦU CHƠI MỚI', y: 510, color: '#2d6a4f', border: '#52b788' });
      buttons.push({ id: 'open_shop', label: '🏪 NÂNG CẤP VĨNH VIỄN', y: 595, color: '#854d0e', border: '#eab308' });
      buttons.push({ id: 'how_to_play', label: '📜 HƯỚNG DẪN & ĐIỀU KHIỂN', y: 680, color: '#1e293b', border: '#475569' });
    } else {
      buttons.push({ id: 'start_game', label: '⚔️ BẮT ĐẦU CHƠI', y: 460, color: '#2d6a4f', border: '#52b788' });
      buttons.push({ id: 'open_shop', label: '🏪 NÂNG CẤP VĨNH VIỄN', y: 560, color: '#854d0e', border: '#eab308' });
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

      // Khung vẽ ảnh nhân vật
      const avatarBoxX = cx + cardW / 2 - 70;
      const avatarBoxY = cardY + 105;
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      this.ctx.fillRect(avatarBoxX, avatarBoxY, 140, 140);
      this.ctx.strokeStyle = '#475569';
      this.ctx.strokeRect(avatarBoxX, avatarBoxY, 140, 140);

      const charImg = getIconImage(char.sprite);
      if (charImg && charImg.complete) {
        if (char.spriteSheet) {
          const fw = Math.floor(charImg.naturalWidth / char.spriteSheet.cols);
          const fh = Math.floor(charImg.naturalHeight / char.spriteSheet.rows);
          this.ctx.drawImage(charImg, 0, 0, fw, fh, avatarBoxX + 20, avatarBoxY + 20, 100, 100);
        } else {
          this.ctx.drawImage(charImg, avatarBoxX + 25, avatarBoxY + 15, 90, 110);
        }
      }

      // Thông số thuộc tính
      const statY = cardY + 285;
      this.ctx.fillStyle = '#cbd5e1';
      this.ctx.font = '16px monospace';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(`❤️ Máu tối đa: ${char.maxHealth}`, cx + 35, statY);
      this.ctx.fillText(`👟 Tốc độ: ${char.baseSpeed}`, cx + 35, statY + 34);
      this.ctx.fillText(`💥 Chí mạng: ${(char.critChance * 100).toFixed(0)}% (x${char.critDamage})`, cx + 35, statY + 68);

      // Mô tả
      this.ctx.fillStyle = '#94a3b8';
      this.ctx.font = '15px sans-serif';
      const words = char.desc.split(' ');
      let line = '';
      let descY = statY + 115;
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

    // Next
    this.ctx.fillStyle = '#2d6a4f';
    this.ctx.fillRect(nextBtnX, actionBtnY, nextBtnW, nextBtnH);
    this.ctx.strokeStyle = '#52b788';
    this.ctx.strokeRect(nextBtnX, actionBtnY, nextBtnW, nextBtnH);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText('TIẾP TỤC ➔', nextBtnX + nextBtnW / 2, actionBtnY + 30);
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
    this.menuButtons.push({ x: backBtnX, y: actionBtnY, w: startBattleW, h: startBattleH, id: 'back_to_char_select' });

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

  // MÀN HÌNH TỔNG KẾT CUỐI TRẬN (1080p Full HD)
  renderGameOver() {
    this.ctx.save();

    this.ctx.fillStyle = 'rgba(10, 5, 8, 0.94)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = '#ff3344';
    this.ctx.font = 'bold 64px "Segoe UI", serif';
    this.ctx.textAlign = 'center';
    this.ctx.shadowColor = '#ff0000';
    this.ctx.shadowBlur = 24;
    this.ctx.fillText('KẾT THÚC TRẬN ĐẤU', this.canvas.width / 2, 120);
    this.ctx.shadowBlur = 0;

    // Bảng thống kê chi tiết điểm số & vàng
    const statBoxW = 760;
    const statBoxH = 460;
    const statBoxX = this.canvas.width / 2 - statBoxW / 2;
    const statBoxY = 180;

    this.ctx.fillStyle = 'rgba(20, 24, 36, 0.96)';
    this.ctx.fillRect(statBoxX, statBoxY, statBoxW, statBoxH);
    this.ctx.strokeStyle = '#d4af37';
    this.ctx.lineWidth = 2.5;
    this.ctx.strokeRect(statBoxX, statBoxY, statBoxW, statBoxH);

    const s = this.endGameStats;
    const minutes = Math.floor(s.survivalTime / 60);
    const seconds = Math.floor(s.survivalTime % 60);

    const leftX = statBoxX + 60;
    let textY = statBoxY + 65;

    this.ctx.font = '22px "Segoe UI", sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillStyle = '#cbd5e1';
    this.ctx.fillText(`⏱️ Thời gian sống sót:`, leftX, textY);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText(`${minutes} phút ${seconds} giây`, leftX + 340, textY);

    textY += 50;
    this.ctx.fillStyle = '#cbd5e1';
    this.ctx.fillText(`💀 Số quái vật tiêu diệt:`, leftX, textY);
    this.ctx.fillStyle = '#ff88aa';
    this.ctx.fillText(`${s.kills} quái`, leftX + 340, textY);

    textY += 50;
    this.ctx.fillStyle = '#cbd5e1';
    this.ctx.fillText(`⭐ Cấp độ đạt được:`, leftX, textY);
    this.ctx.fillStyle = '#00b4d8';
    this.ctx.fillText(`Cấp ${s.level}`, leftX + 340, textY);

    textY += 50;
    this.ctx.fillStyle = '#cbd5e1';
    this.ctx.fillText(`⚔️ Cấp độ thử thách:`, leftX, textY);
    this.ctx.fillStyle = this.selectedDiff.color;
    this.ctx.fillText(`${this.selectedDiff.name}`, leftX + 340, textY);

    // Đường kẻ phân cách
    textY += 35;
    this.ctx.strokeStyle = '#3a4d6b';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.moveTo(leftX, textY);
    this.ctx.lineTo(leftX + 640, textY);
    this.ctx.stroke();

    // Điểm số & Tiền thưởng
    textY += 50;
    this.ctx.font = 'bold 26px "Segoe UI", sans-serif';
    this.ctx.fillStyle = '#ffd166';
    this.ctx.fillText(`🏆 TỔNG ĐIỂM SỐ:`, leftX, textY);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText(`${s.score.toLocaleString()} ĐIỂM`, leftX + 340, textY);

    textY += 48;
    this.ctx.fillStyle = '#ffd700';
    this.ctx.fillText(`🪙 VÀNG THU THẬP:`, leftX, textY);
    this.ctx.fillStyle = '#ffe600';
    this.ctx.fillText(`+${s.goldEarned} Vàng`, leftX + 340, textY);

    // 2 Nút: Chơi Lại hoặc Về Menu Chính
    const btnW = 320;
    const btnH = 62;
    const retryBtnX = this.canvas.width / 2 + 20;
    const menuBtnX = this.canvas.width / 2 - btnW - 20;
    const btnY = statBoxY + statBoxH + 45;

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
