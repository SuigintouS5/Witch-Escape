import { CONFIG } from './config.js';
import { Enemy } from './Enemy.js';
import { MiniBoss, MeruruBoss, YukiBoss } from './Boss.js';

export class Spawner {
  constructor(difficultyConfig = null, gameMode = 'normal', challenges = {}) {
    this.diff = difficultyConfig || CONFIG.DIFFICULTIES[0];
    this.gameMode = gameMode; // 'normal' | 'endless'
    this.challenges = challenges || {};

    this.spawnTimer = 0;
    this.curseEnemyCount = 0; // Thêm quái vật theo Nâng Cấp Nguyền Rủa từ Shop Cổ Viện
    this.recalculateRates();

    // Quản lý các mốc kịch bản Timeline đã kích hoạt
    this.triggeredTimeline = new Set();
  }

  setDifficulty(diffConfig, gameMode = 'normal', challenges = {}) {
    this.diff = diffConfig || CONFIG.DIFFICULTIES[0];
    this.gameMode = gameMode;
    this.challenges = challenges || {};
    this.recalculateRates();
    this.triggeredTimeline.clear();
  }

  recalculateRates() {
    let rateMult = (this.diff && this.diff.spawnRateMult) || 1.0;
    if (this.challenges.enemy_count_x4) {
      rateMult *= 3.5; // Quái đông gấp 4 lần
    }
    this.baseInterval = 1.25 / rateMult;
    this.minInterval = 0.28 / rateMult;
  }

  // Lấy ngẫu nhiên 1 cấu hình quái thường để làm phôi Mini Boss (Bao gồm cả Tử Thần Reaper)
  getRandomBaseEnemyType() {
    const types = [
      CONFIG.ENEMIES.TYPES.ZOMBIE,
      CONFIG.ENEMIES.TYPES.SKELETON,
      CONFIG.ENEMIES.TYPES.GOKUCHO,
      CONFIG.ENEMIES.TYPES.AXE_FIRE,
      CONFIG.ENEMIES.TYPES.REAPER
    ];
    return types[Math.floor(Math.random() * types.length)];
  }

  // Kiểm tra Timeline Scripted Events
  checkTimelineEvents(gameTime, camera, player, enemies) {
    const spawnedList = [];

    // Tính chu kỳ thời gian nếu ở Endless (chu kỳ 1: 0-1200s, chu kỳ 2: 1200-2400s)
    let cycle = 1;
    let evalTime = gameTime;
    if (this.gameMode === 'endless') {
      if (gameTime >= 1200 && gameTime < 2400) {
        cycle = 2;
        evalTime = gameTime - 1200;
      } else if (gameTime >= 2400) {
        cycle = 3;
      }
    }

    if (cycle <= 2) {
      const keyPrefix = `c${cycle}_`;

      // 1. Phút 02:30 (150s): 1 Mini Boss
      if (evalTime >= 150 && !this.triggeredTimeline.has(keyPrefix + '150')) {
        this.triggeredTimeline.add(keyPrefix + '150');
        const pos = this.getSpawnPosition(camera);
        const mb = new MiniBoss(this.getRandomBaseEnemyType(), pos.x, pos.y, cycle === 2 ? 1.5 : 1.0);
        this.applyEnemyChallengeBonuses(mb);
        spawnedList.push(mb);
      }

      // 2. Phút 05:00 (300s): 2 Mini Boss cùng lúc
      if (evalTime >= 300 && !this.triggeredTimeline.has(keyPrefix + '300')) {
        this.triggeredTimeline.add(keyPrefix + '300');
        for (let i = 0; i < 2; i++) {
          const pos = this.getSpawnPosition(camera);
          const mb = new MiniBoss(this.getRandomBaseEnemyType(), pos.x, pos.y, cycle === 2 ? 1.6 : 1.0);
          this.applyEnemyChallengeBonuses(mb);
          spawnedList.push(mb);
        }
      }

      // 3. Phút 07:30 (450s): 3 Mini Boss (+30% HP)
      if (evalTime >= 450 && !this.triggeredTimeline.has(keyPrefix + '450')) {
        this.triggeredTimeline.add(keyPrefix + '450');
        for (let i = 0; i < 3; i++) {
          const pos = this.getSpawnPosition(camera);
          // +30% máu (hpMult = 1.3)
          const mb = new MiniBoss(this.getRandomBaseEnemyType(), pos.x, pos.y, (cycle === 2 ? 1.6 : 1.0) * 1.3);
          this.applyEnemyChallengeBonuses(mb);
          spawnedList.push(mb);
        }
      }

      // 4. Phút 10:00 (600s): MAIN BOSS 1 Meruru + 2 Mini Boss
      if (evalTime >= 600 && !this.triggeredTimeline.has(keyPrefix + '600')) {
        this.triggeredTimeline.add(keyPrefix + '600');
        const bPos = this.getSpawnPosition(camera);
        const meruru = new MeruruBoss(bPos.x, bPos.y);
        this.applyEnemyChallengeBonuses(meruru);
        spawnedList.push(meruru);

        for (let i = 0; i < 2; i++) {
          const mPos = this.getSpawnPosition(camera);
          const mb = new MiniBoss(this.getRandomBaseEnemyType(), mPos.x, mPos.y, cycle === 2 ? 1.7 : 1.0);
          this.applyEnemyChallengeBonuses(mb);
          spawnedList.push(mb);
        }
      }

      // 5. Phút 12:30 (750s): 1 Mini Boss + Swarm vây ráp
      if (evalTime >= 750 && !this.triggeredTimeline.has(keyPrefix + '750')) {
        this.triggeredTimeline.add(keyPrefix + '750');
        const pos = this.getSpawnPosition(camera);
        const mb = new MiniBoss(this.getRandomBaseEnemyType(), pos.x, pos.y, cycle === 2 ? 1.8 : 1.0);
        this.applyEnemyChallengeBonuses(mb);
        spawnedList.push(mb);
        // Swarm 15 quái (+20%) bao vây quanh player
        this.spawnSwarmRing(player, 15, spawnedList);
      }

      // 6. Phút 15:00 (900s): 2 Mini Boss + Swarm vây ráp
      if (evalTime >= 900 && !this.triggeredTimeline.has(keyPrefix + '900')) {
        this.triggeredTimeline.add(keyPrefix + '900');
        for (let i = 0; i < 2; i++) {
          const pos = this.getSpawnPosition(camera);
          const mb = new MiniBoss(this.getRandomBaseEnemyType(), pos.x, pos.y, cycle === 2 ? 1.9 : 1.0);
          this.applyEnemyChallengeBonuses(mb);
          spawnedList.push(mb);
        }
        // Swarm 20 quái (+20%) bao vây quanh player
        this.spawnSwarmRing(player, 20, spawnedList);
      }

      // 7. Phút 17:30 (1050s): 3 Mini Boss
      if (evalTime >= 1050 && !this.triggeredTimeline.has(keyPrefix + '1050')) {
        this.triggeredTimeline.add(keyPrefix + '1050');
        for (let i = 0; i < 3; i++) {
          const pos = this.getSpawnPosition(camera);
          const mb = new MiniBoss(this.getRandomBaseEnemyType(), pos.x, pos.y, cycle === 2 ? 2.0 : 1.1);
          this.applyEnemyChallengeBonuses(mb);
          spawnedList.push(mb);
        }
      }

      // 8. Phút 20:00 (1200s): MAIN BOSS CUỐI CÙNG YUKI
      if (evalTime >= 1200 && !this.triggeredTimeline.has(keyPrefix + '1200')) {
        this.triggeredTimeline.add(keyPrefix + '1200');
        const bPos = this.getSpawnPosition(camera);
        const yuki = new YukiBoss(bPos.x, bPos.y);
        this.applyEnemyChallengeBonuses(yuki);
        spawnedList.push(yuki);
      }
    }

    return spawnedList;
  }

  // Triệu hồi 1 vòng tròn quái vây ráp quanh người chơi
  spawnSwarmRing(player, count, outList) {
    const radius = 550;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const sx = player.x + Math.cos(angle) * radius;
      const sy = player.y + Math.sin(angle) * radius;
      const enemy = new Enemy(CONFIG.ENEMIES.TYPES.ZOMBIE, sx, sy);
      this.applyEnemyChallengeBonuses(enemy);
      outList.push(enemy);
    }
  }

  applyEnemyChallengeBonuses(enemy) {
    if (this.diff && this.diff.enemyHealthMult) {
      enemy.maxHealth = Math.round(enemy.maxHealth * this.diff.enemyHealthMult);
      enemy.health = enemy.maxHealth;
    }
    if (this.diff && this.diff.enemySpeedMult) {
      enemy.speed = Math.round(enemy.speed * this.diff.enemySpeedMult);
    }
    // Challenge Modifiers
    if (this.challenges.enemy_hp_x10) {
      enemy.maxHealth = Math.round(enemy.maxHealth * 10);
      enemy.health = enemy.maxHealth;
    }
  }

  update(delta, gameTime, camera, player, enemies) {
    // 1. Kiểm tra scripted boss timeline trước
    const timelineSpawns = this.checkTimelineEvents(gameTime, camera, player, enemies);
    if (timelineSpawns.length > 0) {
      return timelineSpawns; // trả về danh sách boss vừa xuất hiện
    }

    // 2. Quái thường theo chu kỳ (Đã tăng +20% số lượng quái và giới hạn tối đa)
    let maxEnemies = Math.round(CONFIG.ENEMIES.MAX_COUNT * (this.diff.spawnRateMult || 1.2));
    if (this.challenges.enemy_count_x4) {
      maxEnemies = Math.min(240, maxEnemies * 2.8);
    }
    if (this.gameMode === 'endless' && gameTime > 2400) {
      // Sau phút 40 ở Endless: Bão quái cực đông
      maxEnemies = Math.min(270, maxEnemies * 1.5);
    }

    if (enemies.length >= maxEnemies) {
      return null;
    }

    this.spawnTimer -= delta;

    let timeDeduction = (gameTime / 120) * 0.85;
    if (this.gameMode === 'endless' && gameTime > 2400) {
      timeDeduction = 1.0;
    }

    const currentInterval = Math.max(
      this.minInterval,
      this.baseInterval - timeDeduction
    );

    if (this.spawnTimer <= 0) {
      this.spawnTimer = currentInterval;
      const countToSpawn = 1 + (this.curseEnemyCount || 0);
      const spawned = [];
      for (let i = 0; i < countToSpawn; i++) {
        if (enemies.length + spawned.length >= maxEnemies) break;
        const single = this.spawnSingleEnemy(gameTime, camera);
        if (single) spawned.push(single);
      }
      return spawned.length > 0 ? spawned : null;
    }

    return null;
  }

  getSpawnPosition(camera) {
    const margin = 120;
    const side = Math.floor(Math.random() * 4);

    let x = 0;
    let y = 0;

    switch (side) {
      case 0:
        x = camera.x + Math.random() * camera.viewportWidth;
        y = camera.y - margin;
        break;
      case 1:
        x = camera.x + Math.random() * camera.viewportWidth;
        y = camera.y + camera.viewportHeight + margin;
        break;
      case 2:
        x = camera.x - margin;
        y = camera.y + Math.random() * camera.viewportHeight;
        break;
      case 3:
        x = camera.x + camera.viewportWidth + margin;
        y = camera.y + Math.random() * camera.viewportHeight;
        break;
    }

    x = Math.max(100, Math.min(x, CONFIG.WORLD_WIDTH - 100));
    y = Math.max(100, Math.min(y, CONFIG.WORLD_HEIGHT - 100));

    return { x, y };
  }

  selectEnemyType(gameTime) {
    const roll = Math.random();
    if (gameTime < 15) {
      if (roll < 0.45) return CONFIG.ENEMIES.TYPES.ZOMBIE;
      if (roll < 0.65) return CONFIG.ENEMIES.TYPES.SKELETON;
      if (roll < 0.80) return CONFIG.ENEMIES.TYPES.GOKUCHO;
      if (roll < 0.90) return CONFIG.ENEMIES.TYPES.REAPER;
      return CONFIG.ENEMIES.TYPES.AXE_FIRE;
    } else if (gameTime < 40) {
      if (roll < 0.30) return CONFIG.ENEMIES.TYPES.ZOMBIE;
      if (roll < 0.55) return CONFIG.ENEMIES.TYPES.SKELETON;
      if (roll < 0.75) return CONFIG.ENEMIES.TYPES.GOKUCHO;
      if (roll < 0.90) return CONFIG.ENEMIES.TYPES.REAPER;
      return CONFIG.ENEMIES.TYPES.AXE_FIRE;
    } else {
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
    this.applyEnemyChallengeBonuses(enemy);
    return enemy;
  }
}
