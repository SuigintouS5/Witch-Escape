import { CONFIG } from './config.js';
import { Enemy } from './Enemy.js';

export class Spawner {
  constructor(difficultyConfig = null) {
    this.diff = difficultyConfig || CONFIG.DIFFICULTIES[0];
    this.spawnTimer = 0;
    this.baseInterval = 1.3 / (this.diff.spawnRateMult || 1.0);
    this.minInterval = 0.40 / (this.diff.spawnRateMult || 1.0);
  }

  setDifficulty(diffConfig) {
    this.diff = diffConfig || CONFIG.DIFFICULTIES[0];
    this.baseInterval = 1.3 / (this.diff.spawnRateMult || 1.0);
    this.minInterval = 0.40 / (this.diff.spawnRateMult || 1.0);
  }

  update(delta, gameTime, camera, enemies) {
    // Không sinh thêm nếu đã chạm ngưỡng giới hạn hiệu năng
    const maxEnemies = Math.round(CONFIG.ENEMIES.MAX_COUNT * (this.diff.spawnRateMult || 1.0));
    if (enemies.length >= maxEnemies) {
      return null;
    }

    this.spawnTimer -= delta;

    // Giảm dần thời gian chờ theo thời gian sống sót (càng lâu quái càng đông)
    const currentInterval = Math.max(
      this.minInterval,
      this.baseInterval - (gameTime / 120) * 0.85
    );

    if (this.spawnTimer <= 0) {
      this.spawnTimer = currentInterval;
      return this.spawnSingleEnemy(gameTime, camera);
    }

    return null;
  }

  // Chọn vị trí xuất hiện ngoài rìa camera (off-screen)
  getSpawnPosition(camera) {
    const margin = 120; // Ngoài mép nhìn thấy 120px
    const side = Math.floor(Math.random() * 4); // 0: Top, 1: Bottom, 2: Left, 3: Right

    let x = 0;
    let y = 0;

    switch (side) {
      case 0: // Phía trên
        x = camera.x + Math.random() * camera.viewportWidth;
        y = camera.y - margin;
        break;
      case 1: // Phía dưới
        x = camera.x + Math.random() * camera.viewportWidth;
        y = camera.y + camera.viewportHeight + margin;
        break;
      case 2: // Bên trái
        x = camera.x - margin;
        y = camera.y + Math.random() * camera.viewportHeight;
        break;
      case 3: // Bên phải
        x = camera.x + camera.viewportWidth + margin;
        y = camera.y + Math.random() * camera.viewportHeight;
        break;
    }

    // Giữ vị trí trong ranh giới bản đồ
    x = Math.max(100, Math.min(x, CONFIG.WORLD_WIDTH - 100));
    y = Math.max(100, Math.min(y, CONFIG.WORLD_HEIGHT - 100));

    return { x, y };
  }

  // Chọn loại quái dựa theo độ khó và thời gian sống sót
  selectEnemyType(gameTime) {
    const roll = Math.random();

    // Để tiện test và tăng kịch tính: Tử thần Reaper và Axe Fire có cơ hội xuất hiện sớm hơn
    if (gameTime < 15) {
      // 0 - 15s: Zombie 45%, Skeleton 20%, Gokucho 15%, Reaper 10%, Axe Fire 10%
      if (roll < 0.45) return CONFIG.ENEMIES.TYPES.ZOMBIE;
      if (roll < 0.65) return CONFIG.ENEMIES.TYPES.SKELETON;
      if (roll < 0.80) return CONFIG.ENEMIES.TYPES.GOKUCHO;
      if (roll < 0.90) return CONFIG.ENEMIES.TYPES.REAPER;
      return CONFIG.ENEMIES.TYPES.AXE_FIRE;
    } else if (gameTime < 40) {
      // 15s - 40s: bao gồm Axe Fire 5% chance
      if (roll < 0.30) return CONFIG.ENEMIES.TYPES.ZOMBIE;
      if (roll < 0.55) return CONFIG.ENEMIES.TYPES.SKELETON;
      if (roll < 0.75) return CONFIG.ENEMIES.TYPES.GOKUCHO;
      if (roll < 0.90) return CONFIG.ENEMIES.TYPES.REAPER;
      return CONFIG.ENEMIES.TYPES.AXE_FIRE;
    } else {
      // >40s: tăng cường độ Reaper và Axe Fire
      if (roll < 0.20) return CONFIG.ENEMIES.TYPES.REAPER;
      if (roll < 0.45) return CONFIG.ENEMIES.TYPES.AXE_FIRE;
      if (roll < 0.70) return CONFIG.ENEMIES.TYPES.GOKUCHO;
      if (roll < 0.90) return CONFIG.ENEMIES.TYPES.SKELETON;
      return CONFIG.ENEMIES.TYPES.ZOMBIE;
    }
  }

  spawnSingleEnemy(gameTime, camera) {
    const pos = this.getSpawnPosition(camera);
    const typeConfig = this.selectEnemyType(gameTime);
    const enemy = new Enemy(typeConfig, pos.x, pos.y);
    if (this.diff && this.diff.enemyHealthMult) {
      enemy.maxHealth = Math.round(enemy.maxHealth * this.diff.enemyHealthMult);
      enemy.health = enemy.maxHealth;
    }
    if (this.diff && this.diff.enemySpeedMult) {
      enemy.speed = Math.round(enemy.speed * this.diff.enemySpeedMult);
    }
    return enemy;
  }
}
