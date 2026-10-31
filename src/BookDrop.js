import { BOOK_DEFINITIONS } from './BookSystem.js';

export class BookDrop {
  constructor(x, y, bookId) {
    this.x = x;
    this.y = y;
    this.bookId = bookId;
    this.bookDef = BOOK_DEFINITIONS[bookId] || null;

    this.radius = 22;
    this.pulse = Math.random() * Math.PI * 2;
    this.isDead = false;
    this.isAttracted = false;
    this.attractSpeed = 140;
    this.maxSpeed = 650;
  }

  update(delta, player, bookSystem, onCollect = null) {
    if (this.isDead) return;

    this.pulse += delta * 4;

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);

    // Kích hoạt hút khi người chơi đến gần
    const magnetRadius = (player.pickupRangeBonus || 0) + 120;
    if (!this.isAttracted && dist <= magnetRadius) {
      this.isAttracted = true;
    }

    if (this.isAttracted) {
      this.attractSpeed = Math.min(this.maxSpeed, this.attractSpeed + delta * 800);
      const moveDist = this.attractSpeed * delta;

      if (dist <= Math.max(20, moveDist)) {
        // Chỉ nhặt được nếu kho sách còn chỗ trống
        if (bookSystem && bookSystem.canPickUpMore()) {
          this.isDead = true;
          bookSystem.addBook(this.bookId);
          if (onCollect) {
            onCollect(this.bookId, this.bookDef);
          }
        }
      } else {
        this.x += (dx / dist) * moveDist;
        this.y += (dy / dist) * moveDist;
      }
    }
  }

  render(ctx, camera) {
    if (this.isDead) return;

    const screenPos = camera.worldToScreen(this.x, this.y);

    if (
      screenPos.x < -60 || screenPos.x > camera.viewportWidth + 60 ||
      screenPos.y < -60 || screenPos.y > camera.viewportHeight + 60
    ) {
      return;
    }

    ctx.save();

    const bobbing = Math.sin(this.pulse) * 4;
    const drawY = screenPos.y + bobbing;

    // 1. Quầng sáng tri thức cổ điển (Vintage Golden Glow)
    const glow = Math.sin(this.pulse * 1.5) * 6;
    const grad = ctx.createRadialGradient(screenPos.x, drawY, 4, screenPos.x, drawY, this.radius + glow + 10);
    grad.addColorStop(0, 'rgba(255, 235, 175, 0.85)');
    grad.addColorStop(0.5, 'rgba(212, 175, 55, 0.4)');
    grad.addColorStop(1, 'rgba(180, 140, 40, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(screenPos.x, drawY, this.radius + glow + 10, 0, Math.PI * 2);
    ctx.fill();

    // 2. Hình quyển sách cổ bìa ngà tinh khiết (#fcfbf7)
    const bookW = 26;
    const bookH = 34;
    ctx.save();
    ctx.translate(screenPos.x, drawY);
    ctx.rotate(Math.sin(this.pulse * 0.8) * 0.12);

    // Đổ bóng sách
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(-bookW / 2 + 3, -bookH / 2 + 4, bookW, bookH);

    // Thân bìa sách màu ngà cổ điển
    ctx.fillStyle = '#fcfbf7';
    ctx.fillRect(-bookW / 2, -bookH / 2, bookW, bookH);

    // Viền sách mảnh đen mực cổ điển
    ctx.strokeStyle = '#2b241c';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(-bookW / 2, -bookH / 2, bookW, bookH);

    // Gáy sách bên trái
    ctx.fillStyle = '#8b6f47';
    ctx.fillRect(-bookW / 2, -bookH / 2, 4, bookH);

    // Khung chỉ chữ nhật tinh tế bên trong
    ctx.strokeStyle = '#8a7968';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(-bookW / 2 + 6, -bookH / 2 + 3, bookW - 9, bookH - 6);

    // Dấu ấn biểu tượng trang sách
    ctx.fillStyle = '#2b241c';
    ctx.font = 'bold 9px serif';
    ctx.textAlign = 'center';
    ctx.fillText('📖', 1, 3);

    ctx.restore();

    // 3. Nhãn tên tác phẩm lơ lửng phía trên
    const title = this.bookDef ? this.bookDef.work : 'Tác Phẩm';
    ctx.font = 'bold 11px serif';
    const textWidth = ctx.measureText(title).width;
    const tagW = Math.max(80, textWidth + 16);
    const tagH = 18;

    ctx.fillStyle = 'rgba(25, 20, 15, 0.85)';
    ctx.fillRect(screenPos.x - tagW / 2, drawY - 30, tagW, tagH);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1;
    ctx.strokeRect(screenPos.x - tagW / 2, drawY - 30, tagW, tagH);

    ctx.fillStyle = '#fdfbf7';
    ctx.textAlign = 'center';
    ctx.fillText(title, screenPos.x, drawY - 17);

    ctx.restore();
  }
}
