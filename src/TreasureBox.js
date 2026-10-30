// Lớp Hộp Báu Vật (TreasureBox)
// Rơi ra khi tiêu diệt Mini Boss (1 hộp) hoặc Main Boss (2 hộp)
// Người chơi chạm vào sẽ nhận được 1 lần chọn nâng cấp vũ khí / trang bị

export class TreasureBox {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 24;
    this.isDead = false;
    this.pulse = Math.random() * Math.PI * 2;
  }

  update(delta, player, onOpenCallback) {
    if (this.isDead) return;

    this.pulse += delta * 4;

    const dist = Math.hypot(this.x - player.x, this.y - player.y);
    if (dist <= this.radius + player.getHitboxRadius() + 10) {
      this.isDead = true;
      if (onOpenCallback) {
        onOpenCallback();
      }
    }
  }

  render(ctx, camera) {
    if (this.isDead) return;

    const p = camera.worldToScreen(this.x, this.y);
    if (
      p.x < -80 || p.x > camera.viewportWidth + 80 ||
      p.y < -80 || p.y > camera.viewportHeight + 80
    ) {
      return;
    }

    ctx.save();

    // 1. Quầng sáng vàng kim ma thuật nhấp nháy
    const glow = Math.sin(this.pulse) * 6;
    const grad = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, 30 + glow);
    grad.addColorStop(0, 'rgba(255, 230, 100, 0.9)');
    grad.addColorStop(0.5, 'rgba(245, 158, 11, 0.45)');
    grad.addColorStop(1, 'rgba(217, 119, 6, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 30 + glow, 0, Math.PI * 2);
    ctx.fill();

    // 2. Chuyển động lơ lửng
    const floatY = Math.sin(this.pulse * 1.3) * 5;
    const boxY = p.y + floatY;

    // Bóng rương dưới đất
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 16, 18 - floatY * 0.5, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. Vẽ chiếc Rương Báu Hoàng Kim
    const bw = 34;
    const bh = 24;
    const bx = p.x - bw / 2;
    const by = boxY - bh / 2;

    // Thân rương vàng óng
    ctx.fillStyle = '#b45309';
    ctx.fillRect(bx, by + 8, bw, bh - 8);

    // Nắp rương hình vòm
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.ellipse(p.x, by + 8, bw / 2, 7, 0, Math.PI, 0);
    ctx.fill();

    // Nẹp viền vàng kim
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(bx, by + 8, bw, bh - 8);
    ctx.stroke();

    // Ổ khóa ngọc đỏ ruby lấp lánh
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(p.x, by + 12, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Nhãn nổi bật
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(p.x - 48, by - 22, 96, 18);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1;
    ctx.strokeRect(p.x - 48, by - 22, 96, 18);

    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎁 HỘP BÁU VẬT', p.x, by - 9);

    ctx.restore();
  }
}
