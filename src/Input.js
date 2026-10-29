// Quản lý input bàn phím (WASD + Arrows)
export class InputManager {
  constructor() {
    this.keys = {
      up: false,
      down: false,
      left: false,
      right: false
    };

    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
    // Tự động giải phóng phím khi cửa sổ mất focus (Alt+Tab, click ra ngoài)
    window.addEventListener('blur', () => this.resetKeys());
  }

  resetKeys() {
    this.keys.up = false;
    this.keys.down = false;
    this.keys.left = false;
    this.keys.right = false;
  }

  onKeyDown(e) {
    const key = e.key.toLowerCase();
    if (key === 'w' || key === 'arrowup') this.keys.up = true;
    if (key === 's' || key === 'arrowdown') this.keys.down = true;
    if (key === 'a' || key === 'arrowleft') this.keys.left = true;
    if (key === 'd' || key === 'arrowright') this.keys.right = true;
  }

  onKeyUp(e) {
    const key = e.key.toLowerCase();
    if (key === 'w' || key === 'arrowup') this.keys.up = false;
    if (key === 's' || key === 'arrowdown') this.keys.down = false;
    if (key === 'a' || key === 'arrowleft') this.keys.left = false;
    if (key === 'd' || key === 'arrowright') this.keys.right = false;
  }

  // Trả về vector hướng đã chuẩn hóa (độ dài 1 để đi chéo không bị nhanh hơn)
  getMovementVector() {
    let dx = 0;
    let dy = 0;

    if (this.keys.left) dx -= 1;
    if (this.keys.right) dx += 1;
    if (this.keys.up) dy -= 1;
    if (this.keys.down) dy += 1;

    if (dx !== 0 && dy !== 0) {
      // Chuẩn hóa vector chéo
      const invSqrt2 = 0.70710678;
      dx *= invSqrt2;
      dy *= invSqrt2;
    }

    return { x: dx, y: dy };
  }
}
