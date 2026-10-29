let swordSprite = null;
function getSwordSprite() {
  if (!swordSprite) {
    swordSprite = new Image();
    swordSprite.src = 'assets/effects/pink_crystal_sword.png';
  }
  return swordSprite;
}

export class PlayerProjectile {
  constructor(startX, startY, targetX, targetY, damage = 30, pierce = 2, player = null) {
    this.x = startX;
    this.y = startY;
    this.player = player;
    this.damage = damage;
    this.pierce = pierce; // Số lượng quái có thể xuyên qua
    this.hitCount = 0;
    this.hitEnemies = new Set(); // Tránh gây sát thương 2 lần lên cùng 1 quái

    this.speed = 520; // Tốc độ bay nhanh và uy lực
    this.width = 54;
    this.height = 22;
    this.radius = 16;

    const dx = targetX - startX;
    const dy = targetY - startY;
    const dist = Math.hypot(dx, dy) || 1;

    this.vx = (dx / dist) * this.speed;
    this.vy = (dy / dist) * this.speed;
    this.rotation = Math.atan2(dy, dx);

    this.lifespan = 2.2; // Tự hủy sau 2.2 giây nếu không trúng mục tiêu
    this.isDead = false;

    this.customSprite = null;
    this.sprite = getSwordSprite();

    // Vệt sáng ma thuật phía sau đuôi kiếm
    this.trail = [];
  }

  update(delta, enemies, particles, onEnemyKill) {
    if (this.isDead) return;

    this.x += this.vx * delta;
    this.y += this.vy * delta;

    this.lifespan -= delta;
    if (this.lifespan <= 0) {
      this.isDead = true;
      return;
    }

    // Lưu lại vị trí để vẽ vệt sáng hồng
    this.trail.push({ x: this.x, y: this.y, alpha: 0.7 });
    if (this.trail.length > 5) {
      this.trail.shift();
    }
    for (const t of this.trail) {
      t.alpha -= delta * 2.5;
    }

    // Kiểm tra va chạm với đàn quái vật
    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
      if (enemy.isDead || this.hitEnemies.has(enemy)) continue;

      const dist = Math.hypot(this.x - enemy.x, this.y - enemy.y);
      if (dist < this.radius + enemy.getHitboxRadius()) {
        // Ghi nhận trúng đòn
        this.hitEnemies.add(enemy);
        this.hitCount++;

        // 1. Tính toán sát thương & chí mạng
        let hitDmg = this.damage;
        let isCrit = false;
        if (this.player && this.player.rollDamage) {
          const rolled = this.player.rollDamage(this.damage);
          hitDmg = rolled.damage;
          isCrit = rolled.isCrit;
        }

        // 2. Trừ máu quái
        enemy.takeDamage(hitDmg);

        // 3. Hiệu ứng tia lửa pha lê & Chữ số sát thương
        particles.createHitSparks(this.x, this.y, isCrit ? 14 : 8);
        particles.createDamageNumber(enemy.x, enemy.y, hitDmg, isCrit);

        // 4. Đẩy lùi nhẹ quái vật về sau (Knockback)
        const knockbackDist = 28;
        const normDist = dist || 1;
        enemy.x += (this.vx / this.speed) * knockbackDist;
        enemy.y += (this.vy / this.speed) * knockbackDist;

        // 4. Nếu quái chết
        if (enemy.isDead) {
          particles.createDeathBurst(enemy.x, enemy.y, enemy.config.color || '#a040b0', 18);
          if (onEnemyKill) {
            onEnemyKill(enemy);
          }
        }

        // 5. Kiểm tra giới hạn xuyên mục tiêu
        if (this.hitCount >= this.pierce) {
          this.isDead = true;
          break;
        }
      }
    }
  }

  render(ctx, camera) {
    if (this.isDead) return;

    const screenPos = camera.worldToScreen(this.x, this.y);

    // Culling ngoài màn hình
    if (
      screenPos.x < -60 || screenPos.x > camera.viewportWidth + 60 ||
      screenPos.y < -60 || screenPos.y > camera.viewportHeight + 60
    ) {
      return;
    }

    ctx.save();

    // 1. Vẽ vệt sáng hồng kéo dài (Pink Motion Trail)
    for (const t of this.trail) {
      if (t.alpha <= 0) continue;
      const tPos = camera.worldToScreen(t.x, t.y);
      ctx.fillStyle = `rgba(255, 110, 160, ${t.alpha * 0.4})`;
      ctx.beginPath();
      ctx.arc(tPos.x, tPos.y, this.radius * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Vẽ Kiếm Pha Lê Hồng xoay theo góc bắn
    ctx.translate(screenPos.x, screenPos.y);
    ctx.rotate(this.rotation);

    // Vầng hào quang sáng của kiếm
    ctx.fillStyle = 'rgba(255, 180, 210, 0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 0, this.width * 0.6, this.height * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();

    const activeSprite = this.customSprite || this.sprite;
    if (activeSprite && activeSprite.complete && activeSprite.naturalWidth > 0) {
      ctx.drawImage(
        activeSprite,
        -this.width / 2,
        -this.height / 2,
        this.width,
        this.height
      );
    } else {
      // Fallback hình thoi pha lê hồng
      ctx.fillStyle = '#ff70a6';
      ctx.beginPath();
      ctx.moveTo(this.width / 2, 0);
      ctx.lineTo(0, -this.height / 2);
      ctx.lineTo(-this.width / 2, 0);
      ctx.lineTo(0, this.height / 2);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
}
