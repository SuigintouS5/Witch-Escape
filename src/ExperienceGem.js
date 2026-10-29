// Quản lý các viên Đá Kinh Nghiệm (XP Gems) rơi ra từ quái vật
export class ExperienceGem {
  constructor(x, y, value = 1) {
    this.x = x;
    this.y = y;
    this.value = value;

    // Phân loại màu sắc theo giá trị kinh nghiệm
    if (value >= 25) {
      this.color = '#c77dff'; // Tím (từ Tử Thần Reaper hoặc Boss)
      this.size = 7;
    } else if (value >= 5) {
      this.color = '#48cae4'; // Xanh ngọc biển (từ Gokucho hoặc Skeleton)
      this.size = 5.5;
    } else {
      this.color = '#52b788'; // Xanh lá ngọc (từ Zombie)
      this.size = 4.5;
    }

    this.isAttracted = false;
    this.attractSpeed = 160;
    this.maxSpeed = 750;
    this.isDead = false;

    // Hiệu ứng nhấp nhô phát sáng
    this.pulse = Math.random() * Math.PI * 2;
  }

  update(delta, player, magnetRadius) {
    if (this.isDead) return;

    this.pulse += delta * 5;

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);

    // Kích hoạt lực hút khi người chơi đi vào phạm vi nam châm
    if (!this.isAttracted && dist <= magnetRadius) {
      this.isAttracted = true;
    }

    if (this.isAttracted) {
      // Tăng tốc dần khi bay về phía người chơi
      this.attractSpeed = Math.min(this.maxSpeed, this.attractSpeed + delta * 900);
      const moveDist = this.attractSpeed * delta;

      if (dist <= Math.max(18, moveDist)) {
        // Người chơi đã nhặt được đá
        this.isDead = true;
        return this.value;
      } else {
        this.x += (dx / dist) * moveDist;
        this.y += (dy / dist) * moveDist;
      }
    }

    return 0;
  }

  render(ctx, camera) {
    if (this.isDead) return;

    const screenPos = camera.worldToScreen(this.x, this.y);

    if (
      screenPos.x < -30 || screenPos.x > camera.viewportWidth + 30 ||
      screenPos.y < -30 || screenPos.y > camera.viewportHeight + 30
    ) {
      return;
    }

    ctx.save();

    const bobbing = Math.sin(this.pulse) * 2;
    const drawY = screenPos.y + bobbing;

    // Vầng sáng lấp lánh xung quanh
    ctx.fillStyle = this.color;
    ctx.globalAlpha = 0.35 + Math.sin(this.pulse) * 0.15;
    ctx.beginPath();
    ctx.arc(screenPos.x, drawY, this.size * 2, 0, Math.PI * 2);
    ctx.fill();

    // Viên đá hình thoi pha lê sáng chói
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(screenPos.x, drawY - this.size);
    ctx.lineTo(screenPos.x + this.size * 0.75, drawY);
    ctx.lineTo(screenPos.x, drawY + this.size);
    ctx.lineTo(screenPos.x - this.size * 0.75, drawY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(screenPos.x, drawY - this.size * 0.7);
    ctx.lineTo(screenPos.x + this.size * 0.5, drawY);
    ctx.lineTo(screenPos.x, drawY + this.size * 0.7);
    ctx.lineTo(screenPos.x - this.size * 0.5, drawY);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}
