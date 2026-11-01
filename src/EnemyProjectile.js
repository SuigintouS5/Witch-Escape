import { CONFIG } from './config.js';

let darkOrbImage = null;
function getDarkOrbImage() {
  if (!darkOrbImage) {
    darkOrbImage = new Image();
    darkOrbImage.src = CONFIG.PROJECTILES.DARK_ORB.sprite;
  }
  return darkOrbImage;
}

export class EnemyProjectile {
  constructor(startX, startY, targetX, targetY, damage = null, options = {}) {
    this.x = startX;
    this.y = startY;

    this.speed = options.speed || CONFIG.PROJECTILES.DARK_ORB.speed;
    this.radius = options.radius || CONFIG.PROJECTILES.DARK_ORB.radius;
    this.damage = (damage !== null && damage !== undefined) ? damage : CONFIG.PROJECTILES.DARK_ORB.damage;
    this.lifespan = options.lifespan || CONFIG.PROJECTILES.DARK_ORB.lifespan;
    this.accuracy = options.accuracy !== undefined ? options.accuracy : 1.0;

    // Vector hướng bay
    const dx = targetX - startX;
    const dy = targetY - startY;
    const dist = Math.hypot(dx, dy) || 1;

    this.vx = (dx / dist) * this.speed;
    this.vy = (dy / dist) * this.speed;

    this.isDead = false;
    this.sprite = getDarkOrbImage();
    this.rotation = Math.atan2(dy, dx);
  }

  update(delta, player, particles = null) {
    if (this.isDead) return false;

    this.x += this.vx * delta;
    this.y += this.vy * delta;

    this.lifespan -= delta;
    if (this.lifespan <= 0) {
      this.isDead = true;
      return false;
    }

    // Kiểm tra va chạm với Người chơi
    const dist = Math.hypot(this.x - player.x, this.y - player.y);
    if (dist < this.radius + player.getHitboxRadius()) {
      if (player.takeDamage(this.damage, { attackerAccuracy: this.accuracy }, particles)) {
        this.isDead = true;
        return { hit: true, damage: this.damage };
      }
    }
    return false;
  }

  render(ctx, camera) {
    if (this.isDead) return;

    const screenPos = camera.worldToScreen(this.x, this.y);

    // Culling ngoài màn hình
    if (
      screenPos.x < -40 || screenPos.x > camera.viewportWidth + 40 ||
      screenPos.y < -40 || screenPos.y > camera.viewportHeight + 40
    ) {
      return;
    }

    ctx.save();
    // Vầng hào quang ma thuật đỏ tím
    ctx.fillStyle = 'rgba(230, 40, 90, 0.35)';
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, this.radius * 1.5, 0, Math.PI * 2);
    ctx.fill();

    if (this.sprite && this.sprite.complete && this.sprite.naturalWidth > 0) {
      ctx.drawImage(
        this.sprite,
        screenPos.x - this.radius,
        screenPos.y - this.radius,
        this.radius * 2,
        this.radius * 2
      );
    } else {
      ctx.fillStyle = '#ff2a6d';
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
