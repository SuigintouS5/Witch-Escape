import { CONFIG } from './config.js';

// Cache ảnh cho Boss
const BOSS_SPRITES = {};
function getBossImage(src) {
  if (!BOSS_SPRITES[src]) {
    const img = new Image();
    img.src = src;
    BOSS_SPRITES[src] = img;
  }
  return BOSS_SPRITES[src];
}

// ==========================================
// 1. LỚP MINI BOSS
// Giữ nguyên 100% tỷ lệ khung hình (Aspect Ratio) của quái gốc và phóng to sắc nét pixel-perfect
// ==========================================
export class MiniBoss {
  constructor(baseTypeConfig, startX, startY, hpMult = 1.0) {
    this.config = baseTypeConfig;
    this.x = startX;
    this.y = startY;

    // Giữ nguyên đúng tỷ lệ kích thước của loại quái gốc, phóng to cân xứng
    // Gokucho gốc 54x70 thì nhân scale lớn hơn một chút để kích thước tương đương các quái khác
    let scale = 2.0;
    if (baseTypeConfig.id === 'gokucho') scale = 2.4;
    else if (baseTypeConfig.id === 'axe_fire') scale = 2.1;

    this.width = Math.round(baseTypeConfig.width * scale);
    this.height = Math.round(baseTypeConfig.height * scale);

    this.isMiniBoss = true;
    this.isBoss = true;
    this.isElite = true;
    this.isDead = false;

    // Chỉ số Mini Boss: Máu x7 (hoặc x9.1 nếu có +30% HP), Damage x1.5
    this.maxHealth = Math.round(baseTypeConfig.maxHealth * 7.5 * hpMult);
    this.health = this.maxHealth;
    this.damage = Math.round(baseTypeConfig.damage * 1.5);
    this.speed = Math.min(100, Math.round(baseTypeConfig.speed * 0.9));

    this.facing = 'right';
    this.walkCycle = 0;
    this.hitFlashTimer = 0;
    this.auraAngle = 0;

    // DOTs
    this.bleedTimer = 0;
    this.bleedStacks = 0;
    this.zoneDotTimer = 0;
    this.zoneDotDmg = 0;
    this.slowTimer = 0;
    this.speedMultiplier = 1.0;

    this.sprite = getBossImage(baseTypeConfig.sprite);
  }

  getHitboxRadius() {
    return Math.min(this.width, this.height) * 0.40;
  }

  takeDamage(amount) {
    if (this.isDead) return;
    this.health -= amount;
    this.hitFlashTimer = 0.15;
    if (this.health <= 0) {
      this.health = 0;
      this.isDead = true;
    }
  }

  update(delta, player, allEnemies, onShootCallback) {
    if (this.isDead) return;

    if (this.hitFlashTimer > 0) this.hitFlashTimer -= delta;
    this.auraAngle += delta * 2.5;

    // DOTs
    if (this.slowTimer > 0) {
      this.slowTimer -= delta;
      if (this.slowTimer <= 0) this.speedMultiplier = 1.0;
    }
    if (this.bleedTimer > 0) {
      this.bleedTimer -= delta;
      const bleedDmg = this.maxHealth * 0.0008 * this.bleedStacks;
      this.health -= bleedDmg * delta;
      if (this.health <= 0) { this.health = 0; this.isDead = true; return; }
      if (this.bleedTimer <= 0) this.bleedStacks = 0;
    }
    if (this.zoneDotTimer > 0) {
      this.zoneDotTimer -= delta;
      this.health -= this.zoneDotDmg * delta;
      if (this.health <= 0) { this.health = 0; this.isDead = true; return; }
    }

    this.walkCycle += delta * 4;
    const effSpeed = this.speed * this.speedMultiplier;

    // Di chuyển áp sát Người chơi
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 2) {
      this.x += (dx / dist) * effSpeed * delta;
      this.y += (dy / dist) * effSpeed * delta;
      this.facing = dx >= 0 ? 'right' : 'left';
    }

    const halfW = this.width / 2;
    const halfH = this.height / 2;
    this.x = Math.max(halfW, Math.min(this.x, CONFIG.WORLD_WIDTH - halfW));
    this.y = Math.max(halfH, Math.min(this.y, CONFIG.WORLD_HEIGHT - halfH));
  }

  render(ctx, camera) {
    if (this.isDead) return;

    const p = camera.worldToScreen(this.x, this.y);
    if (
      p.x < -180 || p.x > camera.viewportWidth + 180 ||
      p.y < -180 || p.y > camera.viewportHeight + 180
    ) {
      return;
    }

    ctx.save();
    // TẮT LÀM MỊN ĐỂ PIXEL ART SẮC NÉT HOÀN HẢO, KHÔNG BỊ MỜ
    ctx.imageSmoothingEnabled = false;

    // 1. Hào quang Mini Boss hùng dũng dưới chân
    const shadowRy = Math.max(12, this.height * 0.12);
    ctx.strokeStyle = '#c026d3';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + this.height * 0.45, this.width * 0.48, shadowRy, this.auraAngle, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(192, 38, 211, 0.2)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + this.height * 0.45, this.width * 0.48, shadowRy, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Vẽ Sprite quái được phóng to đúng tỷ lệ pixel
    ctx.save();
    ctx.translate(p.x, p.y);
    if (this.facing === 'left') ctx.scale(-1, 1);

    if (this.sprite && this.sprite.complete && this.sprite.naturalWidth > 0) {
      const ss = this.config.spriteSheet;
      if (ss) {
        const animFrames = ss.animFrames || ss.cols;
        const frameIndex = Math.floor((this.walkCycle * 1.5) % animFrames);
        const frameW = Math.floor(this.sprite.naturalWidth / ss.cols);
        const frameH = Math.floor(this.sprite.naturalHeight / (ss.rows || 1));
        const col = frameIndex % ss.cols;
        const row = Math.floor(frameIndex / ss.cols);

        ctx.drawImage(
          this.sprite,
          col * frameW, row * frameH, frameW, frameH,
          -this.width / 2, -this.height / 2, this.width, this.height
        );
      } else {
        ctx.drawImage(
          this.sprite,
          -this.width / 2, -this.height / 2, this.width, this.height
        );
      }

      // Hit flash bám chuẩn theo pixel ảnh, không tạo khung xám
      if (this.hitFlashTimer > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        ctx.restore();
      }
    } else {
      ctx.fillStyle = '#9333ea';
      ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
      if (this.hitFlashTimer > 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
      }
    }

    ctx.restore();

    // 3. Thanh Máu Mini Boss To Vừa Vặn & Nhãn Tên
    const barW = Math.min(220, Math.max(120, this.width * 0.95));
    const barH = 10;
    const barX = p.x - barW / 2;
    const barY = p.y - this.height * 0.58;

    ctx.fillStyle = 'rgba(10, 10, 15, 0.85)';
    ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
    ctx.strokeStyle = '#d946ef';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(barX - 2, barY - 2, barW + 4, barH + 4);

    const hpPercent = Math.max(0, this.health / this.maxHealth);
    ctx.fillStyle = '#ec4899';
    ctx.fillRect(barX, barY, barW * hpPercent, barH);

    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`👑 [MINI BOSS] ${this.config.name}`, p.x, barY - 6);

    ctx.restore();
  }
}

// ==========================================
// 2. LỚP MAIN BOSS 1: MERURU (Phút 10:00)
// To gấp 3.5 lần player, 2 Phase, 4 Kỹ năng
// ==========================================
export class MeruruBoss {
  constructor(startX, startY) {
    this.x = startX;
    this.y = startY;
    this.name = 'Ma Nữ Meruru';
    this.isMainBoss = true;
    this.isBoss = true;
    this.isDead = false;

    // To gấp 3.5 lần Player (Player cao 96 -> Boss cao 336, rộng 160)
    this.width = Math.round(48 * 3.5);
    this.height = Math.round(96 * 3.5);

    this.maxHealth = 16000;
    this.health = this.maxHealth;
    this.damage = 22;
    this.speed = 85;
    this.config = { color: '#ec4899', name: this.name };

    this.phase = 1; // Phase 1: meruru.png | Phase 2: meruru1.png (khi máu <= 50%)
    this.spritePhase1 = getBossImage('character/meruru.png');
    this.spritePhase2 = getBossImage('character/meruru1.png');

    this.facing = 'left';
    this.hitFlashTimer = 0;
    this.walkCycle = 0;

    // --- BỘ 5 KỸ NĂNG CỦA MERURU ---
    // Skill 1: Vòng tròn ma thuật lớn quanh người gây damage
    this.skill1Timer = 4.0;
    this.skill1ActiveTimer = 0;
    this.skill1Radius = 220;

    // Skill 2: Oanh tạc đạn diện rộng 60% (1s cảnh báo, 1s sau nổ)
    this.skill2Timer = 7.0;
    this.skill2Telegraph = null; // { x, y, radius, timer, duration: 1.0, exploded: false }

    // Skill 3: Hồi 25% máu - chỉ dùng ĐÚNG 1 LẦN DUY NHẤT trong cả trận
    this.hasUsedHeal = false;

    // Skill 4: Làm chậm người chơi 10%
    this.skill4Timer = 8.5;

    // Skill 5: Màn Đêm Hắc Ám (Làm đen mù màn hình người chơi trong 2.8 giây)
    this.skillDarknessTimer = 14.0;
    this.blindnessTimer = 0;

    // DOTs
    this.bleedTimer = 0;
    this.bleedStacks = 0;
    this.zoneDotTimer = 0;
    this.zoneDotDmg = 0;
    this.slowTimer = 0;
    this.speedMultiplier = 1.0;
  }

  getHitboxRadius() {
    return this.width * 0.38;
  }

  takeDamage(amount) {
    if (this.isDead) return;
    this.health -= amount;
    this.hitFlashTimer = 0.14;

    // Chuyển sang Phase 2 nếu máu <= 50%
    if (this.phase === 1 && this.health <= this.maxHealth * 0.5) {
      this.phase = 2;
      this.speed = 95; // Tăng tốc độ khi cuồng nộ
    }

    if (this.health <= 0) {
      this.health = 0;
      this.isDead = true;
    }
  }

  update(delta, player, allEnemies, onShootCallback, particles) {
    if (this.isDead) return;

    if (this.hitFlashTimer > 0) this.hitFlashTimer -= delta;

    // DOTs
    if (this.slowTimer > 0) {
      this.slowTimer -= delta;
      if (this.slowTimer <= 0) this.speedMultiplier = 1.0;
    }
    if (this.bleedTimer > 0) {
      this.bleedTimer -= delta;
      const bleedDmg = this.maxHealth * 0.0005 * this.bleedStacks;
      this.health -= bleedDmg * delta;
      if (this.health <= 0) { this.health = 0; this.isDead = true; return; }
      if (this.bleedTimer <= 0) this.bleedStacks = 0;
    }
    if (this.zoneDotTimer > 0) {
      this.zoneDotTimer -= delta;
      this.health -= this.zoneDotDmg * delta;
      if (this.health <= 0) { this.health = 0; this.isDead = true; return; }
    }

    this.walkCycle += delta * 3;
    const effSpeed = this.speed * this.speedMultiplier;

    // Di chuyển về phía người chơi
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distToPlayer = Math.hypot(dx, dy);

    if (distToPlayer > 10) {
      this.x += (dx / distToPlayer) * effSpeed * delta;
      this.y += (dy / distToPlayer) * effSpeed * delta;
      this.facing = dx >= 0 ? 'right' : 'left';
    }

    // --- THỰC HIỆN KỸ NĂNG ---

    // SKILL 3: Hồi 25% máu - chỉ dùng 1 lần DUY NHẤT khi máu <= 35%
    if (!this.hasUsedHeal && this.health <= this.maxHealth * 0.35) {
      this.hasUsedHeal = true;
      const healAmt = this.maxHealth * 0.25;
      this.health = Math.min(this.maxHealth, this.health + healAmt);
      if (particles) {
        particles.createDeathBurst(this.x, this.y, '#22c55e', 80);
      }
    }

    // SKILL 1: Vòng tròn lớn quanh người gây damage
    this.skill1Timer -= delta;
    if (this.skill1Timer <= 0) {
      this.skill1Timer = 6.0;
      this.skill1ActiveTimer = 2.5; // Kéo dài 2.5 giây
    }
    if (this.skill1ActiveTimer > 0) {
      this.skill1ActiveTimer -= delta;
      if (distToPlayer <= this.skill1Radius) {
        player.takeDamage(16 * delta); // Sát thương theo thời gian
      }
    }

    // SKILL 2: Oanh tạc diện rộng 60% (1s cảnh báo hitbox tròn, 1s sau nổ đạn)
    this.skill2Timer -= delta;
    if (this.skill2Timer <= 0) {
      this.skill2Timer = 8.0;
      this.skill2Telegraph = {
        x: player.x,
        y: player.y,
        radius: 170,
        telegraphTime: 1.0, // 1s cảnh báo
        strikeTimer: 0.5,   // giây sau dội đạn
        done: false
      };
    }
    if (this.skill2Telegraph && !this.skill2Telegraph.done) {
      const t = this.skill2Telegraph;
      if (t.telegraphTime > 0) {
        t.telegraphTime -= delta;
      } else if (t.strikeTimer > 0) {
        t.strikeTimer -= delta;
        if (t.strikeTimer <= 0) {
          t.done = true;
          // Phát nổ oanh tạc
          if (particles) {
            particles.createArcaneBlast(t.x, t.y, 2.5);
            particles.createDeathBurst(t.x, t.y, '#ec4899', 60);
          }
          const d = Math.hypot(player.x - t.x, player.y - t.y);
          if (d <= t.radius) {
            player.takeDamage(38);
          }
        }
      }
    }

    // SKILL 4: Áp chế tốc độ (Slow người chơi 10% trong 3 giây)
    this.skill4Timer -= delta;
    if (this.skill4Timer <= 0) {
      this.skill4Timer = 9.0;
      player.applyDebuff('slow', 0.10, 3.0);
      if (particles) {
        particles.createDeathBurst(player.x, player.y, '#60a5fa', 30);
      }
    }

    // SKILL 5: Màn Đêm Hắc Ám (Làm đen mù màn hình người chơi trong 2.8 giây)
    this.skillDarknessTimer -= delta;
    if (this.skillDarknessTimer <= 0) {
      this.skillDarknessTimer = 15.0;
      this.blindnessTimer = 2.8;
      if (particles) {
        particles.createDeathBurst(player.x, player.y, '#1e1b4b', 60);
      }
    }
    if (this.blindnessTimer > 0) {
      this.blindnessTimer -= delta;
    }

    const halfW = this.width / 2;
    const halfH = this.height / 2;
    this.x = Math.max(halfW, Math.min(this.x, CONFIG.WORLD_WIDTH - halfW));
    this.y = Math.max(halfH, Math.min(this.y, CONFIG.WORLD_HEIGHT - halfH));
  }

  render(ctx, camera) {
    if (this.isDead) return;

    const p = camera.worldToScreen(this.x, this.y);

    ctx.save();

    // 1. Hiển thị Telegraph Hitbox Skill 2 nếu đang cast
    if (this.skill2Telegraph && !this.skill2Telegraph.done) {
      const t = this.skill2Telegraph;
      const tp = camera.worldToScreen(t.x, t.y);
      const isStriking = t.telegraphTime <= 0;

      ctx.save();
      ctx.fillStyle = isStriking ? 'rgba(239, 68, 68, 0.45)' : 'rgba(239, 68, 68, 0.22)';
      ctx.beginPath();
      ctx.arc(tp.x, tp.y, t.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = isStriking ? 4 : 2;
      ctx.setLineDash([8, 8]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#ff88aa';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚠️ NGUY HIỂM! OANH TẠC TRONG 1S ⚠️', tp.x, tp.y - t.radius - 8);
      ctx.restore();
    }

    // 2. Vòng tròn Skill 1 quanh Meruru nếu đang kích hoạt
    if (this.skill1ActiveTimer > 0) {
      ctx.save();
      const grad = ctx.createRadialGradient(p.x, p.y, 20, p.x, p.y, this.skill1Radius);
      grad.addColorStop(0, 'rgba(236, 72, 153, 0.35)');
      grad.addColorStop(1, 'rgba(168, 85, 247, 0.05)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, this.skill1Radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, this.skill1Radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 3. Bóng dưới chân Boss
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + this.height * 0.45, this.width * 0.5, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    // 4. Vẽ Sprite Meruru (Phase 1 hoặc Phase 2)
    ctx.save();
    ctx.translate(p.x, p.y);
    if (this.facing === 'left') ctx.scale(-1, 1);

    const curSprite = this.phase === 2 ? this.spritePhase2 : this.spritePhase1;
    ctx.imageSmoothingEnabled = true;

    if (curSprite && curSprite.complete && curSprite.naturalWidth > 0) {
      const natW = curSprite.naturalWidth || 1;
      const natH = curSprite.naturalHeight || 1;
      let drawH = this.height;
      let drawW = drawH * (natW / natH);
      if (drawW > this.width * 1.4) {
        drawW = this.width * 1.4;
        drawH = drawW * (natH / natW);
      }
      ctx.drawImage(curSprite, -drawW / 2, -drawH / 2, drawW, drawH);

      // Chớp trắng bám chuẩn viền cơ thể (không biến vùng trong suốt thành hình chữ nhật xám)
      if (this.hitFlashTimer > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillRect(-drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();
      }
    } else {
      ctx.fillStyle = this.phase === 2 ? '#be185d' : '#831843';
      ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
      if (this.hitFlashTimer > 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
      }
    }
    ctx.restore();

    // 5. Thanh Máu Main Boss Đồ Sộ & Huy Hiệu Phase
    const barW = Math.min(800, camera.viewportWidth * 0.65);
    const barH = 22;
    const barX = (camera.viewportWidth - barW) / 2;
    const barY = 55;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.fillRect(barX - 4, barY - 4, barW + 8, barH + 8);
    ctx.strokeStyle = this.phase === 2 ? '#f43f5e' : '#a855f7';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(barX - 4, barY - 4, barW + 8, barH + 8);

    const hpPercent = Math.max(0, this.health / this.maxHealth);
    const hpGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    hpGrad.addColorStop(0, '#f43f5e');
    hpGrad.addColorStop(1, '#ec4899');
    ctx.fillStyle = hpGrad;
    ctx.fillRect(barX, barY, barW * hpPercent, barH);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `💀 MAIN BOSS: ${this.name} (${this.phase === 2 ? 'PHASE 2 - CUỒNG NỘ' : 'PHASE 1'}) - ${Math.round(this.health)}/${this.maxHealth}`,
      camera.viewportWidth / 2,
      barY + 16
    );

    ctx.restore();
  }
}

// ==========================================
// 3. LỚP MAIN BOSS CUỐI CÙNG: YUKI (Phút 20:00)
// To khổng lồ, 3 Phase, 7 Kỹ năng hủy diệt
// ==========================================
export class YukiBoss {
  constructor(startX, startY) {
    this.x = startX;
    this.y = startY;
    this.name = 'Chúa Tể Yuki';
    this.isFinalBoss = true;
    this.isMainBoss = true;
    this.isBoss = true;
    this.isDead = false;

    // To gấp 3.8 lần Player
    this.width = Math.round(48 * 3.8);
    this.height = Math.round(96 * 3.8);

    this.maxHealth = 45000;
    this.health = this.maxHealth;
    this.damage = 35;
    this.speed = 90;
    this.config = { color: '#ef4444', name: this.name };

    this.sprite = getBossImage('character/yuki.png');
    this.facing = 'left';
    this.hitFlashTimer = 0;
    this.walkCycle = 0;

    this.phase = 1; // Phase 1 (>66%), Phase 2 (33%-66%), Phase 3 (<=33%)

    // --- BỘ 7 KỸ NĂNG ---
    // Skill 1: Vòng tròn lửa bao quanh người chơi trong 2s
    this.skill1Timer = 6.0;
    this.fireRing = null; // { x, y, radius: 150, duration: 2.0 }

    // Skill 2: Hồi 20% máu - tối đa 2 lần trong cả trận (chuyển phase không hồi lại)
    this.healChargesLeft = 2;

    // Skill 3: Hút người chơi lại gần kèm dmg nhỏ
    this.skill3Timer = 11.0;
    this.vortexTimer = 0;

    // Skill 4: Slow 20% trong 2s và spam quái gần người chơi
    this.skill4Timer = 14.0;

    // Skill 5: Tạo những tia lửa xoay vòng quanh bản thân 2s rồi bắn ra
    this.skill5Timer = 9.0;
    this.orbitFireTimer = 0; // 2s xoay quanh
    this.orbitFireProjectiles = []; // mảng đạn xoay

    // Skill 6: Đấm cực mạnh vùng đất dưới chân (ONE HIT KILL)
    this.skill6Timer = 16.0;
    this.smashTelegraph = null; // { x, y, radius: 190, duration: 1.5 }

    // Skill 7: Khóa 1 ô nâng cấp trong 10s
    this.skill7Timer = 20.0;

    // DOTs
    this.bleedTimer = 0;
    this.bleedStacks = 0;
    this.zoneDotTimer = 0;
    this.zoneDotDmg = 0;
    this.slowTimer = 0;
    this.speedMultiplier = 1.0;
  }

  getHitboxRadius() {
    return this.width * 0.38;
  }

  takeDamage(amount) {
    if (this.isDead) return;
    this.health -= amount;
    this.hitFlashTimer = 0.14;

    const hpPercent = this.health / this.maxHealth;
    if (hpPercent <= 0.33) {
      this.phase = 3;
      this.speed = 115;
    } else if (hpPercent <= 0.66) {
      this.phase = 2;
      this.speed = 100;
    }

    if (this.health <= 0) {
      this.health = 0;
      this.isDead = true;
    }
  }

  update(delta, player, allEnemies, onShootCallback, particles, onSpawnMinionCallback, upgradeManager) {
    if (this.isDead) return;

    if (this.hitFlashTimer > 0) this.hitFlashTimer -= delta;

    // DOTs
    if (this.slowTimer > 0) {
      this.slowTimer -= delta;
      if (this.slowTimer <= 0) this.speedMultiplier = 1.0;
    }
    if (this.bleedTimer > 0) {
      this.bleedTimer -= delta;
      const bleedDmg = this.maxHealth * 0.0003 * this.bleedStacks;
      this.health -= bleedDmg * delta;
      if (this.health <= 0) { this.health = 0; this.isDead = true; return; }
      if (this.bleedTimer <= 0) this.bleedStacks = 0;
    }
    if (this.zoneDotTimer > 0) {
      this.zoneDotTimer -= delta;
      this.health -= this.zoneDotDmg * delta;
      if (this.health <= 0) { this.health = 0; this.isDead = true; return; }
    }

    this.walkCycle += delta * 3.5;
    const effSpeed = this.speed * this.speedMultiplier;

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distToPlayer = Math.hypot(dx, dy);

    if (distToPlayer > 10) {
      this.x += (dx / distToPlayer) * effSpeed * delta;
      this.y += (dy / distToPlayer) * effSpeed * delta;
      this.facing = dx >= 0 ? 'right' : 'left';
    }

    // --- XỬ LÝ 7 KỸ NĂNG ---

    // SKILL 2: Hồi 20% máu (dùng tối đa 2 lần, không reset khi đổi phase)
    if (this.healChargesLeft === 2 && this.health <= this.maxHealth * 0.60) {
      this.healChargesLeft--;
      this.health = Math.min(this.maxHealth, this.health + this.maxHealth * 0.20);
      if (particles) particles.createDeathBurst(this.x, this.y, '#22c55e', 80);
    } else if (this.healChargesLeft === 1 && this.health <= this.maxHealth * 0.28) {
      this.healChargesLeft--;
      this.health = Math.min(this.maxHealth, this.health + this.maxHealth * 0.20);
      if (particles) particles.createDeathBurst(this.x, this.y, '#22c55e', 80);
    }

    // SKILL 1: Vòng tròn lửa quanh khu vực người chơi trong 2s
    this.skill1Timer -= delta;
    if (this.skill1Timer <= 0) {
      this.skill1Timer = 8.0;
      this.fireRing = { x: player.x, y: player.y, radius: 160, duration: 2.0 };
    }
    if (this.fireRing) {
      this.fireRing.duration -= delta;
      const d = Math.hypot(player.x - this.fireRing.x, player.y - this.fireRing.y);
      // Gây sát thương nếu người chơi chạm vòng lửa
      if (d <= this.fireRing.radius + 20 && d >= this.fireRing.radius - 35) {
        player.takeDamage(24 * delta);
      }
      if (this.fireRing.duration <= 0) {
        this.fireRing = null;
      }
    }

    // SKILL 3: Hút người chơi lại gần kèm dmg nhỏ (Vortex Pull)
    this.skill3Timer -= delta;
    if (this.skill3Timer <= 0) {
      this.skill3Timer = 12.0;
      this.vortexTimer = 2.0; // Hút trong 2s
    }
    if (this.vortexTimer > 0) {
      this.vortexTimer -= delta;
      const pullSpeed = 190;
      player.x -= (dx / Math.max(1, distToPlayer)) * pullSpeed * delta;
      player.y -= (dy / Math.max(1, distToPlayer)) * pullSpeed * delta;
      player.takeDamage(8 * delta); // Sát thương nhỏ
    }

    // SKILL 4: Slow 20% trong 2s và spam quái gần người chơi (từ Phase 2 trở đi)
    if (this.phase >= 2) {
      this.skill4Timer -= delta;
      if (this.skill4Timer <= 0) {
        this.skill4Timer = 15.0;
        player.applyDebuff('slow', 0.20, 2.0);
        if (onSpawnMinionCallback) {
          onSpawnMinionCallback(player.x, player.y, 5); // Triệu hồi 5 quái vây quanh
        }
      }
    }

    // SKILL 5: Tạo các tia lửa xoay vòng quanh bản thân 2s rồi bắn ra
    this.skill5Timer -= delta;
    if (this.skill5Timer <= 0 && this.orbitFireTimer <= 0) {
      this.skill5Timer = 11.0;
      this.orbitFireTimer = 2.0;
      this.orbitAngle = 0;
    }
    if (this.orbitFireTimer > 0) {
      this.orbitFireTimer -= delta;
      this.orbitAngle = (this.orbitAngle || 0) + delta * 6;
      if (this.orbitFireTimer <= 0) {
        // Bắn tỏa ra 8 hướng
        if (onShootCallback) {
          for (let i = 0; i < 8; i++) {
            const ang = (Math.PI * 2 * i) / 8;
            onShootCallback(this.x, this.y, this.x + Math.cos(ang) * 500, this.y + Math.sin(ang) * 500);
          }
        }
      }
    }

    // SKILL 6: Cú đấm cực mạnh vùng đất dưới chân (ONE HIT KILL) (Từ Phase 2/3)
    this.skill6Timer -= delta;
    if (this.skill6Timer <= 0) {
      this.skill6Timer = 17.0;
      this.smashTelegraph = {
        x: player.x,
        y: player.y,
        radius: 185,
        timer: 1.5 // 1.5s cảnh báo
      };
    }
    if (this.smashTelegraph) {
      this.smashTelegraph.timer -= delta;
      if (this.smashTelegraph.timer <= 0) {
        // Nổ cú đấm One-Hit Kill!
        if (particles) {
          particles.createArcaneBlast(this.smashTelegraph.x, this.smashTelegraph.y, 4.0);
          particles.createDeathBurst(this.smashTelegraph.x, this.smashTelegraph.y, '#ef4444', 100);
        }
        const d = Math.hypot(player.x - this.smashTelegraph.x, player.y - this.smashTelegraph.y);
        if (d <= this.smashTelegraph.radius) {
          player.takeDamage(99999); // ONE-HIT KILL
        }
        this.smashTelegraph = null;
      }
    }

    // SKILL 7: Khóa 1 ô nâng cấp trong 10 giây
    this.skill7Timer -= delta;
    if (this.skill7Timer <= 0) {
      this.skill7Timer = 22.0;
      if (upgradeManager && upgradeManager.lockRandomSlot) {
        upgradeManager.lockRandomSlot(10.0);
      }
    }

    const halfW = this.width / 2;
    const halfH = this.height / 2;
    this.x = Math.max(halfW, Math.min(this.x, CONFIG.WORLD_WIDTH - halfW));
    this.y = Math.max(halfH, Math.min(this.y, CONFIG.WORLD_HEIGHT - halfH));
  }

  render(ctx, camera) {
    if (this.isDead) return;

    const p = camera.worldToScreen(this.x, this.y);

    ctx.save();

    // 1. Vẽ Skill 6 Smash Telegraph (ONE HIT KILL)
    if (this.smashTelegraph) {
      const sp = camera.worldToScreen(this.smashTelegraph.x, this.smashTelegraph.y);
      ctx.save();
      ctx.fillStyle = 'rgba(239, 68, 68, 0.45)';
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, this.smashTelegraph.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = '#fee2e2';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('💀 CÚ ĐẤM HỦY DIỆT! ONE-HIT KILL! NÉ NGAY! 💀', sp.x, sp.y - this.smashTelegraph.radius - 10);
      ctx.restore();
    }

    // 2. Vẽ Skill 1 Fire Ring quanh người chơi
    if (this.fireRing) {
      const rp = camera.worldToScreen(this.fireRing.x, this.fireRing.y);
      ctx.save();
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, this.fireRing.radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(234, 88, 12, 0.15)';
      ctx.fill();
      ctx.restore();
    }

    // 3. Vẽ Skill 5 Tia Lửa Xoay Quanh Boss
    if (this.orbitFireTimer > 0) {
      ctx.save();
      for (let i = 0; i < 6; i++) {
        const ang = (this.orbitAngle || 0) + (Math.PI * 2 * i) / 6;
        const ox = p.x + Math.cos(ang) * 140;
        const oy = p.y + Math.sin(ang) * 140;

        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(ox, oy, 12, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 4. Bóng chân Boss
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + this.height * 0.46, this.width * 0.52, 25, 0, 0, Math.PI * 2);
    ctx.fill();

    // 5. Sprite Yuki
    ctx.save();
    ctx.translate(p.x, p.y);
    if (this.facing === 'left') ctx.scale(-1, 1);

    ctx.imageSmoothingEnabled = true;
    if (this.sprite && this.sprite.complete && this.sprite.naturalWidth > 0) {
      const natW = this.sprite.naturalWidth || 1;
      const natH = this.sprite.naturalHeight || 1;
      let drawH = this.height;
      let drawW = drawH * (natW / natH);
      if (drawW > this.width * 1.5) {
        drawW = this.width * 1.5;
        drawH = drawW * (natH / natW);
      }
      ctx.drawImage(this.sprite, -drawW / 2, -drawH / 2, drawW, drawH);

      // Chớp trắng bám viền
      if (this.hitFlashTimer > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillRect(-drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();
      }
    } else {
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
      if (this.hitFlashTimer > 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
      }
    }
    ctx.restore();

    // 6. Thanh Máu Chúa Tể Tối Thượng Yuki
    const barW = Math.min(880, camera.viewportWidth * 0.75);
    const barH = 26;
    const barX = (camera.viewportWidth - barW) / 2;
    const barY = 50;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.fillRect(barX - 4, barY - 4, barW + 8, barH + 8);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.strokeRect(barX - 4, barY - 4, barW + 8, barH + 8);

    const hpPercent = Math.max(0, this.health / this.maxHealth);
    const hpGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    hpGrad.addColorStop(0, '#b91c1c');
    hpGrad.addColorStop(0.5, '#ef4444');
    hpGrad.addColorStop(1, '#f97316');
    ctx.fillStyle = hpGrad;
    ctx.fillRect(barX, barY, barW * hpPercent, barH);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `🔥 BOSS CUỐI CÙNG: ${this.name} (PHASE ${this.phase}/3) - ${Math.round(this.health)}/${this.maxHealth} 🔥`,
      camera.viewportWidth / 2,
      barY + 18
    );

    ctx.restore();
  }
}
