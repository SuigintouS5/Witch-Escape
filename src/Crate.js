// Lớp Thùng Gỗ Phá Vỡ (Crate)
// Rải rác khắp bản đồ với số lượng giới hạn và KHÔNG respawn khi đã vỡ
// Đánh vỡ rơi: 70% Đá Kinh Nghiệm, 20% Cục Máu Nhỏ (+40 HP), 10% Cục Máu Lớn (+70% Max HP)

export class Crate {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 44;
    this.height = 44;
    this.health = 1; // 1 hit là vỡ
    this.isDead = false;
    this.hitFlashTimer = 0;
  }

  getHitboxRadius() {
    return 22;
  }

  takeDamage(amount) {
    if (this.isDead) return false;
    this.health -= amount;
    this.hitFlashTimer = 0.12;
    if (this.health <= 0) {
      this.health = 0;
      this.isDead = true;
      return true; // Đã vỡ
    }
    return false;
  }

  update(delta) {
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= delta;
    }
  }

  render(ctx, camera) {
    if (this.isDead) return;

    const p = camera.worldToScreen(this.x, this.y);
    if (
      p.x < -60 || p.x > camera.viewportWidth + 60 ||
      p.y < -60 || p.y > camera.viewportHeight + 60
    ) {
      return;
    }

    ctx.save();

    // Bóng thùng gỗ dưới chân
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + this.height * 0.42, 20, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Thân thùng gỗ
    const bx = p.x - this.width / 2;
    const by = p.y - this.height / 2;

    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(bx, by, this.width, this.height);

    // Nan gỗ ngang
    ctx.strokeStyle = '#5c3a1e';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, this.width, this.height);

    // Kẻ chỉ gỗ
    ctx.beginPath();
    ctx.moveTo(bx, by + this.height * 0.33);
    ctx.lineTo(bx + this.width, by + this.height * 0.33);
    ctx.moveTo(bx, by + this.height * 0.66);
    ctx.lineTo(bx + this.width, by + this.height * 0.66);
    ctx.stroke();

    // Thanh chéo gia cố
    ctx.beginPath();
    ctx.moveTo(bx + 4, by + 4);
    ctx.lineTo(bx + this.width - 4, by + this.height - 4);
    ctx.stroke();

    // Đinh tán kim loại góc
    ctx.fillStyle = '#475569';
    ctx.fillRect(bx + 2, by + 2, 4, 4);
    ctx.fillRect(bx + this.width - 6, by + 2, 4, 4);
    ctx.fillRect(bx + 2, by + this.height - 6, 4, 4);
    ctx.fillRect(bx + this.width - 6, by + this.height - 6, 4, 4);

    // Hiệu ứng chớp trắng khi bị trúng đòn
    if (this.hitFlashTimer > 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillRect(bx, by, this.width, this.height);
    }

    ctx.restore();
  }
}
