// Lớp vật phẩm Cục Máu Rơi (HealthDrop)
// Loại 'small': Hồi 40 máu cố định, bình thuốc đỏ nhỏ
// Loại 'large': Hồi 70% Max HP, trái tim tinh thể ma thuật hoàng gia tỏa sáng

export class HealthDrop {
  constructor(x, y, type = 'small') {
    this.x = x;
    this.y = y;
    this.type = type; // 'small' | 'large'
    this.radius = type === 'large' ? 22 : 14;
    this.isDead = false;
    this.pulse = Math.random() * Math.PI * 2;
    this.flySpeed = 0;
  }

  update(delta, player, magnetRadius) {
    if (this.isDead) return 0;

    this.pulse += delta * (this.type === 'large' ? 5 : 3.5);

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);

    // Bán kính nhặt
    const pickupDist = player.getHitboxRadius() + this.radius + 10;
    if (dist <= pickupDist) {
      this.isDead = true;
      let healAmount = 0;
      if (this.type === 'large') {
        healAmount = player.maxHealth * 0.70;
      } else {
        healAmount = 400;
      }
      return healAmount;
    }

    // Hiệu ứng hút khi người chơi lại gần trong phạm vi nam châm
    const effectiveMagnet = Math.max(magnetRadius || 120, this.type === 'large' ? 180 : 130);
    if (dist < effectiveMagnet) {
      this.flySpeed = Math.min(this.flySpeed + delta * 900, 550);
      this.x += (dx / dist) * this.flySpeed * delta;
      this.y += (dy / dist) * this.flySpeed * delta;
    }

    return 0;
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

    const bob = Math.sin(this.pulse) * (this.type === 'large' ? 6 : 3);
    const drawY = p.y + bob;

    if (this.type === 'large') {
      // === CỤC MÁU LỚN: TRÁI TIM TINH THỂ HOÀNG GIA (HỒI 70% MÁU) ===
      const glow = Math.sin(this.pulse) * 8;

      // Hào quang vàng đỏ rực rỡ
      const grad = ctx.createRadialGradient(p.x, drawY, 4, p.x, drawY, 32 + glow);
      grad.addColorStop(0, 'rgba(255, 220, 100, 0.95)');
      grad.addColorStop(0.4, 'rgba(239, 68, 68, 0.65)');
      grad.addColorStop(1, 'rgba(185, 28, 28, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, drawY, 32 + glow, 0, Math.PI * 2);
      ctx.fill();

      // Vòng tròn kim quang
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(p.x, drawY, 20 + glow * 0.3, 0, Math.PI * 2);
      ctx.stroke();

      // Vẽ hình Trái tim pha lê lớn
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      const topCurveHeight = 14;
      ctx.moveTo(p.x, drawY + 12);
      // Cánh trái
      ctx.bezierCurveTo(p.x - 20, drawY - 4, p.x - 20, drawY - 18, p.x, drawY - 8);
      // Cánh phải
      ctx.bezierCurveTo(p.x + 20, drawY - 18, p.x + 20, drawY - 4, p.x, drawY + 12);
      ctx.closePath();
      ctx.fill();

      // Viền vàng lấp lánh cho trái tim
      ctx.strokeStyle = '#fff0a6';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Điểm sáng pha lê
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p.x - 5, drawY - 6, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Chữ nhãn hiển thị +70%
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('+70% HP', p.x, drawY - 24);

    } else {
      // === CỤC MÁU NHỎ: BÌNH MÁU ĐỎ GỌN (HỒI 40 MÁU CƠ BẢN) ===
      // Hào quang đỏ dịu
      const grad = ctx.createRadialGradient(p.x, drawY, 2, p.x, drawY, 18);
      grad.addColorStop(0, 'rgba(239, 68, 68, 0.7)');
      grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, drawY, 18, 0, Math.PI * 2);
      ctx.fill();

      // Thân bình máu tròn
      ctx.fillStyle = '#b91c1c';
      ctx.beginPath();
      ctx.arc(p.x, drawY + 3, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fca5a5';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Cổ bình & Nắp bình
      ctx.fillStyle = '#d97706'; // Nắp gỗ nút bần
      ctx.fillRect(p.x - 4, drawY - 9, 8, 4);

      // Điểm phản chiếu ánh sáng
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(p.x - 3, drawY + 1, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Chữ nhãn hiển thị +40
      ctx.fillStyle = '#ff88aa';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('+40', p.x, drawY - 14);
    }

    ctx.restore();
  }
}
