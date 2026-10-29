import { CONFIG } from './config.js';

export class GameMap {
  constructor() {
    this.width = CONFIG.WORLD_WIDTH;
    this.height = CONFIG.WORLD_HEIGHT;

    // 1. Tải texture nền cỏ rừng đêm
    this.grassLoaded = false;
    this.grassImage = new Image();
    this.grassImage.src = 'assets/environment/grass.png';
    this.grassImage.onload = () => {
      this.grassLoaded = true;
      this.createGrassPattern();
    };

    // 2. Tải bộ cây cối rừng đêm đã có đổ bóng tự nhiên từ họa sĩ
    this.plantLoaded = false;
    this.plantImage = new Image();
    this.plantImage.src = 'assets/environment/plant_shadow.png';
    this.plantImage.onload = () => {
      this.plantLoaded = true;
    };

    this.grassPattern = null;

    // Danh sách các sprite cây và bụi cỏ tự nhiên được cắt chính xác từng pixel
    this.treeTemplates = [
      // Cây sồi đại thụ (Oak Tree)
      { type: 'tree', sx: 24, sy: 14, sw: 113, sh: 139, weight: 3 },
      // Cây thông ma thuật (Pine Tree)
      { type: 'tree', sx: 161, sy: 17, sw: 95, sh: 136, weight: 3 },
      // Cây liễu huyền bí (Magic Willow)
      { type: 'tree', sx: 295, sy: 31, sw: 83, sh: 120, weight: 2 }
    ];

    this.bushTemplates = [
      // Dương xỉ rừng đêm
      { type: 'bush', sx: 216, sy: 185, sw: 50, sh: 44, weight: 4 },
      // Bụi quả dại
      { type: 'bush', sx: 346, sy: 190, sw: 43, sh: 37, weight: 3 },
      // Bụi gai u tối
      { type: 'bush', sx: 282, sy: 186, sw: 41, sh: 47, weight: 3 },
      // Khóm cỏ dại
      { type: 'bush', sx: 156, sy: 190, sw: 41, sh: 33, weight: 4 },
      // Hoa ma thuật nhỏ
      { type: 'bush', sx: 98, sy: 195, sw: 29, sh: 27, weight: 2 }
    ];

    this.decorations = [];
    this.generateDecorations();
  }

  createGrassPattern() {
    const offscreen = document.createElement('canvas');
    // grass.png là texture 256x256, giữ nguyên độ phân giải gốc 256x256 thay vì nén xuống 128
    const patternSize = this.grassImage.naturalWidth || 256;
    offscreen.width = patternSize;
    offscreen.height = patternSize;
    const ctx = offscreen.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.grassImage, 0, 0, patternSize, patternSize);

    // Lớp màu xanh tối ma thuật phủ tinh tế
    ctx.fillStyle = 'rgba(10, 22, 14, 0.40)';
    ctx.fillRect(0, 0, patternSize, patternSize);

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    this.grassPattern = tempCtx.createPattern(offscreen, 'repeat');
  }

  generateDecorations() {
    // Thuật toán chia lưới (Grid Spacing) giúp phân bố tự nhiên, không bị đè cụm kỳ quặc
    const cellSize = 190;
    const cols = Math.floor(this.width / cellSize);
    const rows = Math.floor(this.height / cellSize);

    // Vị trí tâm (khu vực spawn người chơi)
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const safeClearingRadius = 380; // Giữ một khoảng trống sạch đẹp xung quanh nhân vật ban đầu

    let seed = 1337;
    const pseudoRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    for (let c = 1; c < cols - 1; c++) {
      for (let r = 1; r < rows - 1; r++) {
        const posX = c * cellSize + (pseudoRandom() * 0.6 + 0.2) * cellSize;
        const posY = r * cellSize + (pseudoRandom() * 0.6 + 0.2) * cellSize;

        // Tránh đặt cây đè lên vùng xuất phát của người chơi
        const distFromCenter = Math.hypot(posX - centerX, posY - centerY);
        if (distFromCenter < safeClearingRadius) {
          continue;
        }

        const roll = pseudoRandom();
        let tmpl = null;

        if (roll < 0.28) {
          // Sinh cây lớn
          const idx = Math.floor(pseudoRandom() * this.treeTemplates.length);
          tmpl = this.treeTemplates[idx];
        } else if (roll < 0.60) {
          // Sinh bụi cỏ / dương xỉ
          const idx = Math.floor(pseudoRandom() * this.bushTemplates.length);
          tmpl = this.bushTemplates[idx];
        } else {
          // 40% ô để trống làm lối đi cho người chơi né quái vật
          continue;
        }

        this.decorations.push({
          x: posX,
          y: posY, // Điểm tiếp xúc mặt đất của gốc cây
          tmpl: tmpl
        });
      }
    }

    // Sắp xếp theo chiều sâu trục Y (Y-sorting)
    this.decorations.sort((a, b) => a.y - b.y);
  }

  renderGround(ctx, camera) {
    // 1. Vẽ thảm cỏ rừng đêm tối ưu hóa Culling theo viewport camera
    if (this.grassPattern) {
      ctx.save();
      ctx.fillStyle = this.grassPattern;
      ctx.translate(-camera.x, -camera.y);
      // Giới hạn fill trong vùng nhìn thấy của camera (+margin) để tiết kiệm và sắc nét tuyệt đối
      const drawX = Math.max(0, camera.x - 50);
      const drawY = Math.max(0, camera.y - 50);
      const drawW = Math.min(this.width - drawX, camera.viewportWidth + 100);
      const drawH = Math.min(this.height - drawY, camera.viewportHeight + 100);
      ctx.fillRect(drawX, drawY, drawW, drawH);
      ctx.restore();
    } else {
      ctx.fillStyle = '#0f1f14';
      ctx.fillRect(-camera.x, -camera.y, this.width, this.height);
    }

    // 2. Vẽ viền ranh giới ma thuật khu rừng
    ctx.save();
    ctx.strokeStyle = 'rgba(160, 45, 65, 0.7)';
    ctx.lineWidth = 6;
    ctx.strokeRect(-camera.x, -camera.y, this.width, this.height);
    ctx.restore();
  }

  // Vẽ từng vật thể với anchor chuẩn xác ở đáy (gốc cây tiếp xúc đất)
  renderObject(ctx, camera, dec) {
    if (!this.plantLoaded) return;

    const screenX = dec.x - camera.x;
    const screenY = dec.y - camera.y;
    const tmpl = dec.tmpl;

    // Culling: Bỏ qua nếu ngoài màn hình
    if (
      screenX < -tmpl.sw || screenX > camera.viewportWidth + tmpl.sw ||
      screenY < -tmpl.sh || screenY > camera.viewportHeight + tmpl.sh
    ) {
      return;
    }

    // Căn chuẩn đáy của sprite nằm đúng điểm (x, y) trên mặt đất
    const drawX = Math.round(screenX - tmpl.sw / 2);
    const drawY = Math.round(screenY - tmpl.sh);

    ctx.drawImage(
      this.plantImage,
      tmpl.sx, tmpl.sy, tmpl.sw, tmpl.sh,
      drawX, drawY, tmpl.sw, tmpl.sh
    );
  }

  // Vẽ các vật thể môi trường trước hoặc sau người chơi theo độ sâu
  renderDecorations(ctx, camera, minY = -Infinity, maxY = Infinity) {
    for (const dec of this.decorations) {
      if (dec.y >= minY && dec.y < maxY) {
        this.renderObject(ctx, camera, dec);
      }
    }
  }

  // Lớp bóng đêm và quầng sáng ma thuật
  renderLighting(ctx, camera, player) {
    const pScreen = camera.worldToScreen(player.x, player.y);
    const radius = CONFIG.THEME.TORCH_LIGHT_RADIUS;

    ctx.save();
    const gradient = ctx.createRadialGradient(
      pScreen.x, pScreen.y, 60,
      pScreen.x, pScreen.y, radius
    );

    gradient.addColorStop(0, 'rgba(255, 235, 190, 0.0)');
    gradient.addColorStop(0.35, 'rgba(20, 32, 45, 0.15)');
    gradient.addColorStop(0.7, 'rgba(12, 18, 28, 0.55)');
    gradient.addColorStop(1, 'rgba(8, 12, 20, 0.92)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, camera.viewportWidth, camera.viewportHeight);

    // Vignette
    const vignette = ctx.createRadialGradient(
      camera.viewportWidth / 2, camera.viewportHeight / 2, camera.viewportWidth * 0.35,
      camera.viewportWidth / 2, camera.viewportHeight / 2, camera.viewportWidth * 0.75
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, camera.viewportWidth, camera.viewportHeight);

    ctx.restore();
  }
}
