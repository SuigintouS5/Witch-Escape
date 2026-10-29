// Vật phẩm Rương / Lõi Tiến Hóa rơi ra khi có 2 vũ khí đạt Cấp 7
export class EvolutionDrop {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 28;
    this.pulse = 0;
    this.isDead = false;

    // Sprite báu vật
    this.chestImg = new Image();
    this.chestImg.src = 'assets/weapons/sword_serrated_single.png';
  }

  update(delta, player, onTriggerEvolution) {
    if (this.isDead) return;

    this.pulse += delta * 4;

    const dist = Math.hypot(this.x - player.x, this.y - player.y);
    if (dist <= this.radius + player.getHitboxRadius() + 15) {
      this.isDead = true;
      if (onTriggerEvolution) {
        onTriggerEvolution();
      }
    }
  }

  render(ctx, camera) {
    if (this.isDead) return;

    const p = camera.worldToScreen(this.x, this.y);

    ctx.save();

    // 1. Quầng sáng ma thuật vàng kim rực rỡ xung quanh
    const glow = Math.sin(this.pulse) * 8;
    const grad = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, this.radius + glow + 14);
    grad.addColorStop(0, 'rgba(255, 230, 100, 0.85)');
    grad.addColorStop(0.5, 'rgba(255, 180, 0, 0.45)');
    grad.addColorStop(1, 'rgba(255, 120, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, this.radius + glow + 14, 0, Math.PI * 2);
    ctx.fill();

    // 2. Vòng xoay ma pháp trận dưới chân
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y + 12, 22 + glow * 0.4, 0, Math.PI * 2);
    ctx.stroke();

    // 3. Thanh bảo kiếm huyền thoại lơ lửng nhấp nhô
    const floatY = Math.sin(this.pulse * 1.2) * 6;
    ctx.save();
    ctx.translate(p.x, p.y + floatY - 2);
    ctx.rotate(Math.PI / 4);

    if (this.chestImg.complete && this.chestImg.naturalWidth > 0) {
      ctx.drawImage(this.chestImg, -14, -30, 28, 60);
    } else {
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(-10, -25, 20, 50);
    }
    ctx.restore();

    // 4. Nhãn báu vật màu hoàng gia nổi bật
    ctx.fillStyle = 'rgba(15, 10, 5, 0.85)';
    ctx.fillRect(p.x - 56, p.y - 36, 112, 22);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(p.x - 56, p.y - 36, 112, 22);

    ctx.fillStyle = '#fff3b0';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⭐ LÕI TIẾN HÓA ⭐', p.x, p.y - 21);

    ctx.restore();
  }
}
