import { CONFIG } from './config.js';

export class Player {
  constructor(startX, startY, charConfig = null, metaBonuses = null) {
    this.x = startX;
    this.y = startY;

    const char = charConfig || CONFIG.CHARACTERS[0] || CONFIG.PLAYER;
    this.charConfig = char;

    this.width = char.width || CONFIG.PLAYER.WIDTH;
    this.height = char.height || CONFIG.PLAYER.HEIGHT;

    // Chỉ số cơ bản có cộng bonus từ Meta Upgrades
    const bonusHp = metaBonuses ? metaBonuses.bonusHealth : 0;
    const speedMult = metaBonuses ? metaBonuses.bonusSpeedMult : 1.0;
    const bonusCrit = metaBonuses ? metaBonuses.bonusCritChance : 0;

    this.speed = (char.baseSpeed || CONFIG.PLAYER.BASE_SPEED) * speedMult;
    this.maxHealth = (char.maxHealth || CONFIG.PLAYER.MAX_HEALTH) + bonusHp;
    this.health = this.maxHealth;

    // Chỉ số Chí Mạng (Crit System)
    this.critChance = (char.critChance || CONFIG.PLAYER.BASE_CRIT_CHANCE) + bonusCrit;
    this.critDamage = char.critDamage || CONFIG.PLAYER.BASE_CRIT_DAMAGE; // 200% (gấp đôi)

    this.invincibilityTimer = 0;
    this.isDead = false;

    this.facing = 'right'; // 'left' hoặc 'right'
    this.isMoving = false;

    // Tải ảnh nhân vật
    this.spriteLoaded = false;
    this.sprite = new Image();
    this.sprite.src = char.sprite || CONFIG.PLAYER.SPRITE_SRC;

    this.sprite.onload = () => {
      this.spriteLoaded = true;
    };

    this.sprite.onerror = () => {
      console.warn('Failed to load primary sprite, trying fallback...');
      this.sprite.src = CONFIG.PLAYER.FALLBACK_SRC;
    };

    this.walkCycle = 0;
    this.hitFlashTimer = 0;
  }

  // Bán kính va chạm với quái
  getHitboxRadius() {
    return this.width * 0.35;
  }

  takeDamage(amount) {
    if (this.isDead || this.invincibilityTimer > 0) return false;

    this.health = Math.max(0, this.health - amount);
    this.invincibilityTimer = CONFIG.PLAYER.INVINCIBILITY_DURATION;
    this.hitFlashTimer = 0.18; // Chớp đỏ 0.18s

    if (this.health <= 0) {
      this.isDead = true;
    }

    return true;
  }

  update(delta, input) {
    if (this.isDead) return;

    // Giảm thời gian bất tử
    if (this.invincibilityTimer > 0) {
      this.invincibilityTimer -= delta;
    }
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= delta;
    }

    const move = input.getMovementVector();
    this.isMoving = (move.x !== 0 || move.y !== 0);

    if (this.isMoving) {
      this.x += move.x * this.speed * delta;
      this.y += move.y * this.speed * delta;

      if (move.x > 0) this.facing = 'right';
      else if (move.x < 0) this.facing = 'left';

      this.walkCycle += delta * 10;
    } else {
      this.walkCycle = 0;
    }

    // Giữ người chơi không vượt ra ngoài biên bản đồ rừng
    const halfW = this.width / 2;
    const halfH = this.height / 2;
    this.x = Math.max(halfW, Math.min(this.x, CONFIG.WORLD_WIDTH - halfW));
    this.y = Math.max(halfH, Math.min(this.y, CONFIG.WORLD_HEIGHT - halfH));
  }

  // Hàm tính toán sát thương có kèm tỉ lệ chí mạng
  rollDamage(baseDmg) {
    const isCrit = Math.random() < this.critChance;
    const finalDamage = isCrit ? Math.round(baseDmg * this.critDamage) : Math.round(baseDmg);
    return { damage: finalDamage, isCrit };
  }

  render(ctx, camera) {
    const screenPos = camera.worldToScreen(this.x, this.y);

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. Bóng dưới chân nhân vật
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(screenPos.x, screenPos.y + this.height * 0.42, this.width * 0.45, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Hiệu ứng nhấp nhô khi bước đi
    const bobbing = this.isMoving ? Math.sin(this.walkCycle) * 3 : 0;
    const drawX = screenPos.x;
    const drawY = screenPos.y + bobbing;

    ctx.save();
    ctx.translate(drawX, drawY);

    if (this.facing === 'left') {
      ctx.scale(-1, 1);
    }

    // Hiệu ứng chớp sáng khi bị dính đòn (I-frames)
    if (this.invincibilityTimer > 0) {
      const flash = Math.floor(this.invincibilityTimer * 20) % 2 === 0;
      if (flash) {
        ctx.globalAlpha = 0.45;
      }
    }

    if (this.spriteLoaded) {
      if (this.charConfig && this.charConfig.spriteSheet) {
        const ss = this.charConfig.spriteSheet;
        const totalFrames = ss.cols * ss.rows;
        const frameIndex = this.isMoving ? Math.floor((this.walkCycle * 1.5) % totalFrames) : 0;
        const frameW = Math.floor(this.sprite.naturalWidth / ss.cols);
        const frameH = Math.floor(this.sprite.naturalHeight / (ss.rows || 1));
        const col = frameIndex % ss.cols;
        const row = Math.floor(frameIndex / ss.cols);
        ctx.drawImage(
          this.sprite,
          col * frameW, row * frameH, frameW, frameH,
          -this.width / 2, -this.height / 2, this.width, this.height
        );
      } else {
        ctx.drawImage(
          this.sprite,
          -this.width / 2,
          -this.height / 2,
          this.width,
          this.height
        );
      }

      // Hiệu ứng ánh đỏ phủ lên khi vừa mất máu
      if (this.hitFlashTimer > 0) {
        ctx.fillStyle = 'rgba(255, 30, 30, 0.45)';
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
      }
    } else {
      ctx.fillStyle = '#6b2d82';
      ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    }

    ctx.restore();
    ctx.restore();
  }
}
