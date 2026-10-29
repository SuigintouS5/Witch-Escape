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

    this.isPaused = false;
    this.isLevelUpOpen = false;
    this.isEvolutionOpen = false;
    this.currentChoices = [];
    this.choiceCardsRects = [];

    // Vị trí nút Tạm dừng
    this.pauseBtnRect = {
      x: this.canvas.width - 150,
      y: 20,
      w: 130,
      h: 36
    };

    this.initGame();

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
    this.gameTime = 0;
    this.killCount = 0;

    this.level = 1;
    this.currentXP = 0;
    this.maxXP = 8;

    this.player = new Player(CONFIG.WORLD_WIDTH / 2, CONFIG.WORLD_HEIGHT / 2);
    this.skillManager = new SkillManager();
    this.weaponManager = new WeaponManager();
    this.upgradeManager = new UpgradeManager(this.weaponManager, this.skillManager);

    this.enemies = [];
    this.enemyProjectiles = [];
    this.playerProjectiles = [];
    this.experienceGems = [];
    this.evolutionDrops = [];

    this.isPaused = false;
    this.isLevelUpOpen = false;
    this.isEvolutionOpen = false;

    // Sinh ngay 1 Tử thần ban đầu
    const initialReaper = new Enemy(
      CONFIG.ENEMIES.TYPES.REAPER,
      this.player.x + 280,
      this.player.y - 100
    );
    this.enemies.push(initialReaper);
  }

  restart() {
    this.initGame();
  }

  togglePause() {
    if (this.player.isDead || this.isLevelUpOpen || this.isEvolutionOpen) return;
    this.isPaused = !this.isPaused;
  }

  addXP(amount) {
    this.currentXP += amount;
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

  onKeyDown(e) {
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      this.togglePause();
      return;
    }

    if ((e.code === 'Space' || e.key === 'r' || e.key === 'R') && this.player.isDead) {
      this.restart();
      return;
    }

    // Phím tắt Debug Test nhanh
    if (e.key === '1' && !this.player.isDead) {
      this.enemies.push(new Enemy(CONFIG.ENEMIES.TYPES.REAPER, this.player.x + 200, this.player.y));
    }
    if (e.key === '2' && !this.player.isDead) {
      this.enemies.push(new Enemy(CONFIG.ENEMIES.TYPES.GOKUCHO, this.player.x - 220, this.player.y));
    }
    if (e.key === '4' && !this.player.isDead) {
      this.addXP(20);
    }
    if (e.key === '5' && !this.player.isDead) {
      for (const w of this.weaponManager.equippedWeapons) {
        w.level = 7;
        if (w.hasSlashAura !== undefined) w.hasSlashAura = true;
      }
      this.upgradeManager.checkEvolutionReadiness();
      this.evolutionDrops.push(new EvolutionDrop(this.player.x + 100, this.player.y));
    }
  }

  onCanvasClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    if (this.player.isDead) {
      this.restart();
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
          return;
        }
      }
      return;
    }

    if (this.isEvolutionOpen) {
      const btnX = this.canvas.width / 2 - 140;
      const btnY = this.canvas.height / 2 + 100;
      if (mouseX >= btnX && mouseX <= btnX + 280 && mouseY >= btnY && mouseY <= btnY + 50) {
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
      const resumeBtnX = this.canvas.width / 2 - 110;
      const resumeBtnY = this.canvas.height / 2 + 50;
      if (
        mouseX >= resumeBtnX && mouseX <= resumeBtnX + 220 &&
        mouseY >= resumeBtnY && mouseY <= resumeBtnY + 46
      ) {
        this.togglePause();
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

    if (!this.isPaused && !this.isLevelUpOpen && !this.isEvolutionOpen) {
      this.update(delta);
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
      }

      // 10. Hạt hiệu ứng
      this.particles.update(delta);
    }
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

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

    // 11. Màn hình Game Over
    if (this.player.isDead) {
      this.renderGameOver();
    }
  }

  renderHUD() {
    this.ctx.save();

    // --- THANH KINH NGHIỆM (XP BAR) ---
    const xpBarH = 14;
    this.ctx.fillStyle = 'rgba(10, 15, 25, 0.85)';
    this.ctx.fillRect(0, 0, this.canvas.width, xpBarH);

    const xpPercent = Math.min(1.0, this.currentXP / this.maxXP);
    const xpGrad = this.ctx.createLinearGradient(0, 0, this.canvas.width, 0);
    xpGrad.addColorStop(0, '#00b4d8');
    xpGrad.addColorStop(1, '#90e0ef');

    this.ctx.fillStyle = xpGrad;
    this.ctx.fillRect(0, 0, this.canvas.width * xpPercent, xpBarH);

    this.ctx.strokeStyle = '#0077b6';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(0, 0, this.canvas.width, xpBarH);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 11px monospace';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`CẤP ${this.level} (${Math.round(xpPercent * 100)}%)`, 10, 11);

    // --- THANH MÁU ---
    const hpBarX = 25;
    const hpBarY = 28;
    const hpBarW = 260;
    const hpBarH = 20;

    this.ctx.fillStyle = 'rgba(10, 15, 25, 0.85)';
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
    this.ctx.font = 'bold 12px "Segoe UI", Arial, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`MÁU: ${Math.round(this.player.health)} / ${this.player.maxHealth}`, hpBarX + hpBarW / 2, hpBarY + 15);

    // --- HIỂN THỊ CÁC Ô TRANG BỊ CÓ ICON PIXEL ART (SLOTS) ---
    const slotStartY = hpBarY + hpBarH + 8;
    const slotSize = 26;
    let curX = hpBarX;

    // 4 Ô TẤN CÔNG (Màu Đỏ/Hồng)
    for (let i = 0; i < 4; i++) {
      const w = this.upgradeManager.attackSlots[i];
      this.ctx.fillStyle = w ? '#3a121d' : 'rgba(25, 20, 25, 0.7)';
      this.ctx.fillRect(curX, slotStartY, slotSize, slotSize);
      this.ctx.strokeStyle = w ? '#ff4d6d' : '#443344';
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeRect(curX, slotStartY, slotSize, slotSize);

      if (w && w.icon) {
        const iconImg = getIconImage(w.icon);
        if (iconImg && iconImg.complete) {
          this.ctx.drawImage(iconImg, curX + 1, slotStartY + 1, slotSize - 2, slotSize - 2);
        }
        // Huy hiệu cấp độ nhỏ ở góc dưới
        this.ctx.fillStyle = '#ff4d6d';
        this.ctx.fillRect(curX + slotSize - 10, slotStartY + slotSize - 10, 10, 10);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 9px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(w.level, curX + slotSize - 5, slotStartY + slotSize - 2);
      }
      curX += slotSize + 4;
    }

    curX += 8;
    // 4 Ô PHÒNG THỦ (Màu Xanh Ngọc)
    for (let i = 0; i < 4; i++) {
      const d = this.upgradeManager.defenseSlots[i];
      this.ctx.fillStyle = d ? '#11293a' : 'rgba(15, 25, 35, 0.7)';
      this.ctx.fillRect(curX, slotStartY, slotSize, slotSize);
      this.ctx.strokeStyle = d ? '#2ec4b6' : '#223344';
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeRect(curX, slotStartY, slotSize, slotSize);

      if (d && d.icon) {
        const iconImg = getIconImage(d.icon);
        if (iconImg && iconImg.complete) {
          this.ctx.drawImage(iconImg, curX + 1, slotStartY + 1, slotSize - 2, slotSize - 2);
        }
        this.ctx.fillStyle = '#2ec4b6';
        this.ctx.fillRect(curX + slotSize - 10, slotStartY + slotSize - 10, 10, 10);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 9px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(d.level, curX + slotSize - 5, slotStartY + slotSize - 2);
      }
      curX += slotSize + 4;
    }

    curX += 8;
    // 2 Ô ĐA DỤNG (Màu Vàng Kim)
    for (let i = 0; i < 2; i++) {
      const u = this.upgradeManager.utilitySlots[i];
      this.ctx.fillStyle = u ? '#3d2c00' : 'rgba(30, 25, 15, 0.7)';
      this.ctx.fillRect(curX, slotStartY, slotSize, slotSize);
      this.ctx.strokeStyle = u ? '#ffd166' : '#443a22';
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeRect(curX, slotStartY, slotSize, slotSize);

      if (u && u.icon) {
        const iconImg = getIconImage(u.icon);
        if (iconImg && iconImg.complete) {
          this.ctx.drawImage(iconImg, curX + 1, slotStartY + 1, slotSize - 2, slotSize - 2);
        }
        this.ctx.fillStyle = '#ffd166';
        this.ctx.fillRect(curX + slotSize - 10, slotStartY + slotSize - 10, 10, 10);
        this.ctx.fillStyle = '#000000';
        this.ctx.font = 'bold 9px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(u.level, curX + slotSize - 5, slotStartY + slotSize - 2);
      }
      curX += slotSize + 4;
    }

    // --- ĐỒNG HỒ SINH TỒN ---
    const minutes = Math.floor(this.gameTime / 60);
    const seconds = Math.floor(this.gameTime % 60);
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    this.ctx.fillStyle = 'rgba(12, 18, 30, 0.85)';
    this.ctx.fillRect(this.canvas.width / 2 - 80, 24, 160, 40);
    this.ctx.strokeStyle = '#d4af37';
    this.ctx.lineWidth = 1.5;
    this.ctx.strokeRect(this.canvas.width / 2 - 80, 24, 160, 40);

    this.ctx.fillStyle = '#ffecb3';
    this.ctx.font = 'bold 22px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(timeStr, this.canvas.width / 2, 52);

    // --- SỐ QUÁI ĐÃ TIÊU DIỆT ---
    const statsX = this.canvas.width - 340;
    this.ctx.fillStyle = 'rgba(10, 15, 25, 0.75)';
    this.ctx.fillRect(statsX, 24, 175, 56);
    this.ctx.strokeStyle = '#2d4059';
    this.ctx.lineWidth = 1.5;
    this.ctx.strokeRect(statsX, 24, 175, 56);

    this.ctx.fillStyle = '#ff9ebb';
    this.ctx.font = 'bold 14px "Segoe UI", Arial, sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`💀 Đã diệt: ${this.killCount}`, statsX + 12, 45);

    this.ctx.fillStyle = '#9fd2ff';
    this.ctx.font = '12px monospace';
    this.ctx.fillText(`Quái: ${this.enemies.length} | FPS: ${this.fps}`, statsX + 12, 66);

    // --- NÚT TẠM DỪNG ---
    const btn = this.pauseBtnRect;
    this.ctx.fillStyle = this.isPaused ? '#7a2233' : 'rgba(25, 35, 52, 0.9)';
    this.ctx.fillRect(btn.x, btn.y + 4, btn.w, btn.h);
    this.ctx.strokeStyle = this.isPaused ? '#ff4d6d' : '#4d79a8';
    this.ctx.strokeRect(btn.x, btn.y + 4, btn.w, btn.h);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 13px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(this.isPaused ? '▶ Tiếp Tục' : '⏸ Tạm Dừng (P)', btn.x + btn.w / 2, btn.y + 27);

    this.ctx.restore();
  }

  renderLevelUpModal() {
    this.ctx.save();

    this.ctx.fillStyle = 'rgba(5, 8, 15, 0.85)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = '#ffd166';
    this.ctx.font = 'bold 44px "Segoe UI", serif';
    this.ctx.textAlign = 'center';
    this.ctx.shadowColor = '#d4af37';
    this.ctx.shadowBlur = 18;
    this.ctx.fillText('LÊN CẤP! (LEVEL UP)', this.canvas.width / 2, 95);
    this.ctx.shadowBlur = 0;

    this.ctx.fillStyle = '#e0e0e0';
    this.ctx.font = '16px sans-serif';
    this.ctx.fillText('Chọn 1 trong 3 nâng cấp bên dưới để cường hóa sức mạnh:', this.canvas.width / 2, 130);

    this.choiceCardsRects = [];
    const cardW = 340;
    const cardH = 370;
    const gap = 30;
    const startX = (this.canvas.width - (cardW * 3 + gap * 2)) / 2;
    const cardY = 160;

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

      // KHUNG VẼ ICON PIXEL ART 48x48
      const iconSize = 48;
      const iconX = cx + cardW / 2 - iconSize / 2;
      const iconY = cardY + 22;

      this.ctx.fillStyle = 'rgba(10, 15, 25, 0.9)';
      this.ctx.fillRect(iconX, iconY, iconSize, iconSize);
      this.ctx.strokeStyle = '#ffd166';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(iconX, iconY, iconSize, iconSize);

      if (c.icon) {
        const iconImg = getIconImage(c.icon);
        if (iconImg && iconImg.complete) {
          this.ctx.drawImage(iconImg, iconX + 4, iconY + 4, iconSize - 8, iconSize - 8);
        }
      }

      // Tên nâng cấp
      this.ctx.fillStyle = '#ffea79';
      this.ctx.font = 'bold 18px "Segoe UI", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(c.name, cx + cardW / 2, cardY + 98);

      // Đường kẻ trang trí
      this.ctx.strokeStyle = '#3a4d6b';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(cx + 25, cardY + 115);
      this.ctx.lineTo(cx + cardW - 25, cardY + 115);
      this.ctx.stroke();

      // Mô tả chi tiết
      this.ctx.fillStyle = '#cbd5e1';
      this.ctx.font = '14px "Segoe UI", sans-serif';
      this.ctx.textAlign = 'left';

      const words = c.desc.split(' ');
      let line = '';
      let textY = cardY + 145;
      for (const w of words) {
        const testLine = line + w + ' ';
        if (this.ctx.measureText(testLine).width > cardW - 50) {
          this.ctx.fillText(line, cx + 25, textY);
          line = w + ' ';
          textY += 24;
        } else {
          line = testLine;
        }
      }
      this.ctx.fillText(line, cx + 25, textY);

      // Nút [LỰA CHỌN]
      const selectBtnW = 180;
      const selectBtnH = 42;
      const selectBtnX = cx + cardW / 2 - selectBtnW / 2;
      const selectBtnY = cardY + cardH - 60;

      this.ctx.fillStyle = '#2d6a4f';
      this.ctx.fillRect(selectBtnX, selectBtnY, selectBtnW, selectBtnH);
      this.ctx.strokeStyle = '#52b788';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(selectBtnX, selectBtnY, selectBtnW, selectBtnH);

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 16px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('LỰA CHỌN', cx + cardW / 2, selectBtnY + 27);
    }

    this.ctx.restore();
  }

  renderEvolutionModal() {
    this.ctx.save();

    this.ctx.fillStyle = 'rgba(15, 8, 2, 0.90)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const panelW = 560;
    const panelH = 340;
    const panelX = this.canvas.width / 2 - panelW / 2;
    const panelY = this.canvas.height / 2 - panelH / 2;

    this.ctx.fillStyle = 'rgba(30, 20, 10, 0.95)';
    this.ctx.fillRect(panelX, panelY, panelW, panelH);
    this.ctx.strokeStyle = '#ffd700';
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(panelX, panelY, panelW, panelH);

    this.ctx.fillStyle = '#ffd700';
    this.ctx.font = 'bold 36px "Segoe UI", serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('TIẾN HÓA VŨ KHÍ TỐI THƯỢNG!', this.canvas.width / 2, panelY + 60);

    this.ctx.fillStyle = '#ffecb3';
    this.ctx.font = '17px sans-serif';
    this.ctx.fillText('Bạn đã thu thập Lõi Tiến Hóa khi có 2 Vũ Khí Max Cấp 7!', this.canvas.width / 2, panelY + 105);

    this.ctx.fillStyle = '#ff88aa';
    this.ctx.font = 'bold 20px "Segoe UI", sans-serif';
    this.ctx.fillText('⭐ HỢP NHẤT: BÃO KIẾM HUYỀN BƯỚM ⭐', this.canvas.width / 2, panelY + 155);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '15px sans-serif';
    this.ctx.fillText('Tăng +120% Sát thương toàn bộ vũ khí, giảm -35% hồi chiêu,', this.canvas.width / 2, panelY + 190);
    this.ctx.fillText('và phát nổ kiếm ánh sáng ma thuật liên tục quét sạch bản đồ!', this.canvas.width / 2, panelY + 215);

    const btnW = 280;
    const btnH = 50;
    const btnX = this.canvas.width / 2 - btnW / 2;
    const btnY = panelY + 255;

    this.ctx.fillStyle = '#d4af37';
    this.ctx.fillRect(btnX, btnY, btnW, btnH);
    this.ctx.strokeStyle = '#fff0a6';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(btnX, btnY, btnW, btnH);

    this.ctx.fillStyle = '#1a1005';
    this.ctx.font = 'bold 18px sans-serif';
    this.ctx.fillText('KÍCH HOẠT TIẾN HÓA', this.canvas.width / 2, btnY + 32);

    this.ctx.restore();
  }

  renderPauseMenu() {
    this.ctx.save();

    this.ctx.fillStyle = 'rgba(5, 8, 15, 0.75)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const panelW = 480;
    const panelH = 280;
    const panelX = this.canvas.width / 2 - panelW / 2;
    const panelY = this.canvas.height / 2 - panelH / 2;

    this.ctx.fillStyle = 'rgba(16, 24, 38, 0.95)';
    this.ctx.fillRect(panelX, panelY, panelW, panelH);
    this.ctx.strokeStyle = '#d4af37';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(panelX, panelY, panelW, panelH);

    this.ctx.fillStyle = '#ffd166';
    this.ctx.font = 'bold 36px "Segoe UI", serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('ĐÃ TẠM DỪNG', this.canvas.width / 2, panelY + 55);

    this.ctx.fillStyle = '#b0c4de';
    this.ctx.font = '14px sans-serif';
    this.ctx.fillText('Nhấn phím [P] hoặc [ESC] để tiếp tục chơi', this.canvas.width / 2, panelY + 95);

    this.ctx.fillStyle = '#ff88aa';
    this.ctx.font = '12px monospace';
    this.ctx.fillText('Phím [1]: Sinh Tử Thần  |  Phím [2]: Sinh Gokucho', this.canvas.width / 2, panelY + 125);
    this.ctx.fillText('Phím [4]: Nhận ngay 20 XP  |  Phím [5]: Max cấp vũ khí & Thả Rương', this.canvas.width / 2, panelY + 148);

    const resumeBtnX = this.canvas.width / 2 - 100;
    const resumeBtnY = panelY + 185;
    const resumeBtnW = 200;
    const resumeBtnH = 46;

    this.ctx.fillStyle = '#2d6a4f';
    this.ctx.fillRect(resumeBtnX, resumeBtnY, resumeBtnW, resumeBtnH);
    this.ctx.strokeStyle = '#52b788';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(resumeBtnX, resumeBtnY, resumeBtnW, resumeBtnH);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 16px sans-serif';
    this.ctx.fillText('TIẾP TỤC CHƠI', this.canvas.width / 2, resumeBtnY + 29);

    this.ctx.restore();
  }

  renderGameOver() {
    this.ctx.save();

    this.ctx.fillStyle = 'rgba(15, 5, 8, 0.85)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = '#ff3344';
    this.ctx.font = 'bold 54px "Segoe UI", serif';
    this.ctx.textAlign = 'center';
    this.ctx.shadowColor = '#ff0000';
    this.ctx.shadowBlur = 20;
    this.ctx.fillText('BẠN ĐÃ GỤC NGÃ', this.canvas.width / 2, this.canvas.height / 2 - 80);

    this.ctx.shadowBlur = 0;
    const minutes = Math.floor(this.gameTime / 60);
    const seconds = Math.floor(this.gameTime % 60);
    this.ctx.fillStyle = '#e0e0e0';
    this.ctx.font = '22px "Segoe UI", sans-serif';
    this.ctx.fillText(
      `Thời gian sinh tồn: ${minutes} phút ${seconds} giây  |  Cấp độ: ${this.level}`,
      this.canvas.width / 2,
      this.canvas.height / 2 - 20
    );

    this.ctx.fillStyle = '#ff9ebb';
    this.ctx.font = 'bold 20px "Segoe UI", sans-serif';
    this.ctx.fillText(
      `💀 Số quái vật đã tiêu diệt: ${this.killCount}`,
      this.canvas.width / 2,
      this.canvas.height / 2 + 18
    );

    const btnW = 320;
    const btnH = 50;
    const btnX = this.canvas.width / 2 - btnW / 2;
    const btnY = this.canvas.height / 2 + 65;

    this.ctx.fillRect(btnX, btnY, btnW, btnH);
    this.ctx.strokeStyle = '#ff4d6d';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(btnX, btnY, btnW, btnH);

    this.ctx.fillStyle = '#fff0f3';
    this.ctx.font = 'bold 18px sans-serif';
    this.ctx.fillText('CHƠI LẠI (Nhấn SPACE hoặc CLICK)', this.canvas.width / 2, btnY + 32);

    this.ctx.restore();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.gameInstance = new Game();
});
