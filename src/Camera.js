import { CONFIG } from './config.js';

// Camera 2D theo sát người chơi và giới hạn trong phạm vi bản đồ
export class Camera {
  constructor(viewportWidth, viewportHeight) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.x = 0;
    this.y = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.smoothness = 0.12; // Hệ số bám theo mượt mà
  }

  follow(target) {
    // Tâm camera tại vị trí mục tiêu
    this.targetX = target.x - this.viewportWidth / 2;
    this.targetY = target.y - this.viewportHeight / 2;

    // Giới hạn camera không ra ngoài rìa bản đồ
    const maxX = CONFIG.WORLD_WIDTH - this.viewportWidth;
    const maxY = CONFIG.WORLD_HEIGHT - this.viewportHeight;

    this.targetX = Math.max(0, Math.min(this.targetX, maxX));
    this.targetY = Math.max(0, Math.min(this.targetY, maxY));

    // Lerp chuyển động mượt
    this.x += (this.targetX - this.x) * this.smoothness;
    this.y += (this.targetY - this.y) * this.smoothness;
  }

  // Chuyển tọa độ thế giới sang tọa độ hiển thị trên màn hình
  worldToScreen(worldX, worldY) {
    return {
      x: worldX - this.x,
      y: worldY - this.y
    };
  }
}
