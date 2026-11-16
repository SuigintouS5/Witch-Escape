import {
  MainSwordWeapon,
  OrbitingBladesWeapon,
  HolyAuraWeapon,
  PoolZoneWeapon,
  PiercingNeedleWeapon,
  BoomerangWeapon,
  ArcSlashWeapon,
  EvolvedStormSwordWeapon,
  InfernalMagmaMaelstromWeapon,
  JudgmentHolyRayWeapon,
  TempestPhantomNeedlesWeapon,
  OmniBladeSovereignWeapon,
  VolcanicNeedleVolleyWeapon,
  createWeaponById,
  WEAPON_UPGRADE_DETAILS
} from './Weapon.js';

// Danh sách công thức Hợp Thể Tối Thượng Của Vũ Khí (Weapon Fusion Recipes)
export const WEAPON_FUSION_RECIPES = [
  {
    ingredients: ['orbiting_blades', 'pool_zone'],
    resultClass: InfernalMagmaMaelstromWeapon,
    resultId: 'infernal_magma_maelstrom',
    name: '🔥 VÒNG XOÁY DUNG NHAM DIỆT THẾ',
    title: 'HỢP NHẤT: VÒNG XOÁY DUNG NHAM DIỆT THẾ',
    desc: '8 đại đao dung nham xoay quanh, để lại vệt lửa nóng chảy và phát nổ sóng chấn hút quái mỗi 3 giây.',
    icon: 'assets/icons/pool_zone.png'
  },
  {
    ingredients: ['holy_aura', 'arc_slash'],
    resultClass: JudgmentHolyRayWeapon,
    resultId: 'judgment_holy_ray',
    name: '✨ THÁNH QUANG TRẢM LONG',
    title: 'HỢP NHẤT: THÁNH QUANG TRẢM LONG',
    desc: 'Vùng thánh địa rộng gấp đôi, liên tục hồi Máu Ảo và phóng 4 luồng trảm kích ánh sáng làm chậm 35%.',
    icon: 'assets/icons/holy_aura.png'
  },
  {
    ingredients: ['piercing_needle', 'boomerang'],
    resultClass: TempestPhantomNeedlesWeapon,
    resultId: 'tempest_phantom_needles',
    name: '🌪️ VŨ ĐIỆU BÃO KIM BÁC SƯƠNG',
    title: 'HỢP NHẤT: VŨ ĐIỆU BÃO KIM BÁC SƯƠNG',
    desc: 'Bắn chùm phi kim xoáy ốc xuyên thấu vô hạn gây chảy máu, nổ thành 6 phi đao khi gặp Boss.',
    icon: 'assets/icons/needle.png'
  },
  {
    ingredients: ['arc_slash', 'orbiting_blades'],
    resultClass: OmniBladeSovereignWeapon,
    resultId: 'omni_blade_sovereign',
    name: '⚔️ VẠN KIẾM QUY TÔNG',
    title: 'HỢP NHẤT: VẠN KIẾM QUY TÔNG',
    desc: '12 kiếm khí thần thoại: 6 kiếm phản đòn hộ thân, 6 kiếm phóng trảm kích càn quét và kích hoạt kiếm trận cận chiến.',
    icon: 'assets/icons/cleave.png'
  },
  {
    ingredients: ['piercing_needle', 'pool_zone'],
    resultClass: VolcanicNeedleVolleyWeapon,
    resultId: 'volcanic_needle_volley',
    name: '🌋 MƯA TIỄN HỎA SƠN',
    title: 'HỢP NHẤT: MƯA TIỄN HỎA SƠN',
    desc: 'Xả mưa hỏa tiễn nung đỏ liên hoàn, kích hoạt cột lửa hỏa sơn phun trào hất tung quái và thiêu đốt diện rộng.',
    icon: 'assets/icons/pool_zone.png'
  }
];

export class UpgradeManager {
  constructor(weaponManager, skillManager) {
    this.weaponManager = weaponManager;
    this.skillManager = skillManager;

    // Quản lý các ô trang bị
    // 5 ô Tấn công (Attack) - Đã tăng thêm 1 ô (cũ: 4, mới: 5)
    this.attackSlots = weaponManager.equippedWeapons; // Đã có vũ khí khởi đầu
    this.maxAttackSlots = 5;

    // 4 ô Phòng thủ (Defense)
    this.defenseSlots = [];
    this.maxDefenseSlots = 4;

    // 3 ô Đa dụng (Utility) - Đã tăng thêm 1 ô (cũ: 2, mới: 3)
    this.utilitySlots = [];
    this.maxUtilitySlots = 3;

    // Kho định nghĩa tất cả vật phẩm phòng thủ & đa dụng (Scale x10)
    this.passivePool = {
      // Phòng thủ
      armor: { id: 'armor', name: 'Giáp Ma Thuật', icon: 'assets/icons/armor.png', type: 'defense', level: 0, maxLevel: 7, desc: '+20 Điểm Giáp phòng ngự mỗi cấp.' },
      shield: { id: 'shield', name: 'Khiên Hộ Thể', icon: 'assets/icons/shield.png', type: 'defense', level: 0, maxLevel: 7, desc: 'Tạo Máu Ảo (+250 Ảo, +100/cấp) bảo vệ thanh Máu và tự hồi sau 8s.' },
      regen: { id: 'regen', name: 'Trái Tim Bất Diệt', icon: 'assets/icons/heart.png', type: 'defense', level: 0, maxLevel: 7, desc: 'Tự động hồi phục +10 Máu/giây mỗi cấp.' },
      thorns: { id: 'thorns', name: 'Áo Gai Ma Thần', icon: 'assets/icons/thorns.png', type: 'defense', level: 0, maxLevel: 7, desc: 'Phản đòn gai nhọn (+200 cố định & +5% sát thương nhận vào mỗi cấp).' },

      // Đa dụng (3 slot)
      magnet: { id: 'magnet', name: 'Nam Châm Hút Hồn', icon: 'assets/icons/magnet.png', type: 'utility', level: 0, maxLevel: 7, desc: 'Tăng 25% bán kính tự động hút Đá Kinh Nghiệm.' },
      boots: { id: 'boots', name: 'Hài Gió Bóng Đêm', icon: 'assets/icons/boots.png', type: 'utility', level: 0, maxLevel: 7, desc: 'Tăng 8% tốc độ di chuyển của nhân vật mỗi cấp.' },
      clover: { id: 'clover', name: 'Cỏ Bốn Lá May Mắn', icon: 'assets/icons/clover.png', type: 'utility', level: 0, maxLevel: 7, desc: 'Tăng +15% tỉ lệ chí mạng & mở Siêu Crit x2, x3 khi trên 100% (+10% vàng/cấp).' },
      tome: { id: 'tome', name: 'Sách Cổ Huyền Bí', icon: 'assets/icons/tome.png', type: 'utility', level: 0, maxLevel: 7, desc: 'Tăng thêm +12% điểm kinh nghiệm (XP) nhận được mỗi cấp.' }
    };

    // Kho vũ khí tấn công có thể nhận thêm
    this.availableWeaponConstructors = [
      OrbitingBladesWeapon,
      HolyAuraWeapon,
      PoolZoneWeapon,
      PiercingNeedleWeapon,
      BoomerangWeapon,
      ArcSlashWeapon
    ];

    // Trạng thái Tiến Hóa Vũ Khí (Evolutions)
    this.canEvolve = false;
    this.availableEvolutions = [];
    this.pendingEvolutionPlan = null;
    this.lastEvolutionInfo = null;

    // Trạng thái Khóa Ô ngẫu nhiên trong 10s (Skill 7 của Chúa Tể Yuki)
    this.tempLockedSlot = null; // { category, id, name, timer, maxDuration }
  }

  // Áp dụng Thử Thách khóa ô vĩnh viễn trong trận
  applyChallenges(challenges = {}) {
    if (challenges.lock_weapon) {
      this.maxAttackSlots = 4; // Khóa 1 ô vũ khí (còn 4)
    }
    if (challenges.lock_defense) {
      this.maxDefenseSlots = 3; // Khóa 1 ô phòng thủ (còn 3)
    }
    if (challenges.lock_utility) {
      this.maxUtilitySlots = 2; // Khóa 1 ô đa dụng (còn 2)
    }
  }

  // Khóa ngẫu nhiên 1 ô nâng cấp trong 10 giây (Skill 7 của Yuki)
  lockRandomSlot(duration = 10.0) {
    const candidates = [];

    for (const w of this.attackSlots) {
      candidates.push({ category: 'attack', ref: w, id: w.id, name: w.name });
    }
    for (const d of this.defenseSlots) {
      candidates.push({ category: 'defense', ref: d, id: d.id, name: d.name });
    }
    for (const u of this.utilitySlots) {
      candidates.push({ category: 'utility', ref: u, id: u.id, name: u.name });
    }

    if (candidates.length === 0) return;

    // Reset slot cũ nếu có
    if (this.tempLockedSlot) {
      this.clearLockedSlot();
    }

    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    this.tempLockedSlot = {
      category: chosen.category,
      id: chosen.id,
      name: chosen.name,
      ref: chosen.ref,
      timer: duration,
      maxDuration: duration
    };

    if (chosen.ref) {
      chosen.ref.isLocked = true;
    }
  }

  clearLockedSlot() {
    if (this.tempLockedSlot && this.tempLockedSlot.ref) {
      this.tempLockedSlot.ref.isLocked = false;
    }
    this.tempLockedSlot = null;
  }

  update(delta, player = null) {
    if (this.tempLockedSlot) {
      this.tempLockedSlot.timer -= delta;
      if (this.tempLockedSlot.timer <= 0) {
        this.clearLockedSlot();
      }
    }

    // Tự hồi phục Máu Ảo (Khiên Hộ Thể) sau mỗi 8 giây
    const shieldItem = this.passivePool.shield;
    if (shieldItem && shieldItem.level > 0 && player && !player.isDead) {
      this.shieldRegenTimer = (this.shieldRegenTimer || 0) + delta;
      if (this.shieldRegenTimer >= 8.0) {
        this.shieldRegenTimer = 0;
        const maxCap = 250 + (shieldItem.level - 1) * 100;
        if (player.shield < maxCap) {
          player.addShield(Math.round(maxCap * 0.5), maxCap);
        }
      }
    }
  }

  // Lấy 3 lựa chọn nâng cấp ngẫu nhiên khi Lên Cấp (Level Up)
  // Có loại trừ các vật phẩm đã bị Loại Bỏ (Banish) khỏi trận
  generateChoices(player = null, banishedIds = new Set()) {
    const choices = [];

    // 1. Kiểm tra kỹ năng riêng nhân vật (nếu chưa mở khóa)
    const skills = this.skillManager.skills;
    if (!skills.extraLife.unlocked) {
      choices.push({
        category: 'skill',
        id: 'extraLife',
        name: `⭐ ${skills.extraLife.name}`,
        desc: skills.extraLife.desc,
        icon: skills.extraLife.icon,
        weight: 1.0
      });
    }
    if (!skills.bloodPact.unlocked) {
      choices.push({
        category: 'skill',
        id: 'bloodPact',
        name: `⭐ ${skills.bloodPact.name}`,
        desc: skills.bloodPact.desc,
        icon: skills.bloodPact.icon,
        weight: 1.0
      });
    }
    if (!skills.lifesteal.unlocked) {
      choices.push({
        category: 'skill',
        id: 'lifesteal',
        name: `⭐ ${skills.lifesteal.name}`,
        desc: skills.lifesteal.desc,
        icon: skills.lifesteal.icon,
        weight: 1.0
      });
    }

    // 2. Nâng cấp các Vũ khí Tấn công hiện có (< cấp 7)
    // Vũ khí chính (Kiếm Nghi Lễ / Slot đầu tiên) có tỉ lệ xuất hiện cao hơn 30% (weight: 1.3)
    for (const w of this.attackSlots) {
      if (w.level < w.maxLevel) {
        const nextLvl = w.level + 1;
        const details = WEAPON_UPGRADE_DETAILS[w.id] && WEAPON_UPGRADE_DETAILS[w.id][nextLvl]
          ? WEAPON_UPGRADE_DETAILS[w.id][nextLvl]
          : `Tăng cường sức mạnh vũ khí lên Cấp ${nextLvl}/${w.maxLevel}.`;

        const isMainWeapon = (w.id === 'main_sword' || (this.attackSlots.length > 0 && w.id === this.attackSlots[0].id));

        choices.push({
          category: 'weapon_upgrade',
          id: w.id,
          name: `⚔️ ${w.name} (Cấp ${nextLvl})`,
          desc: details,
          icon: w.icon,
          weaponRef: w,
          weight: isMainWeapon ? 1.30 : 1.00
        });
      }
    }

    // 3. Mua thêm Vũ khí Tấn công mới (nếu slot tấn công < 5)
    if (this.attackSlots.length < this.maxAttackSlots) {
      for (const Cls of this.availableWeaponConstructors) {
        const dummy = new Cls();
        const alreadyHave = this.attackSlots.some(w => w.id === dummy.id);
        if (!alreadyHave) {
          const isMainWeapon = (dummy.id === 'main_sword');
          choices.push({
            category: 'new_weapon',
            id: dummy.id,
            name: `⚔️ [Mới] ${dummy.name}`,
            desc: dummy.desc,
            icon: dummy.icon,
            constructor: Cls,
            weight: isMainWeapon ? 1.30 : 1.00
          });
        }
      }
    }

    // 4. Nâng cấp hoặc mua thêm Trang bị Phòng thủ (< 4 slot)
    for (const key of ['armor', 'shield', 'regen', 'thorns']) {
      const item = this.passivePool[key];
      const equipped = this.defenseSlots.some(d => d.id === item.id);

      if (equipped && item.level < item.maxLevel) {
        choices.push({
          category: 'passive_upgrade',
          id: item.id,
          name: `🛡️ ${item.name} (Cấp ${item.level + 1})`,
          desc: item.desc,
          icon: item.icon,
          itemRef: item,
          weight: 1.00
        });
      } else if (!equipped && this.defenseSlots.length < this.maxDefenseSlots) {
        choices.push({
          category: 'new_passive',
          id: item.id,
          name: `🛡️ [Mới] ${item.name}`,
          desc: item.desc,
          icon: item.icon,
          itemRef: item,
          weight: 1.00
        });
      }
    }

    // 5. Nâng cấp hoặc mua thêm Trang bị Đa dụng (< 3 slot)
    for (const key of ['magnet', 'boots', 'clover', 'tome']) {
      const item = this.passivePool[key];
      const equipped = this.utilitySlots.some(u => u.id === item.id);

      if (equipped && item.level < item.maxLevel) {
        choices.push({
          category: 'passive_upgrade',
          id: item.id,
          name: `🧲 ${item.name} (Cấp ${item.level + 1})`,
          desc: item.desc,
          icon: item.icon,
          itemRef: item,
          weight: 1.00
        });
      } else if (!equipped && this.utilitySlots.length < this.maxUtilitySlots) {
        choices.push({
          category: 'new_passive',
          id: item.id,
          name: `🧲 [Mới] ${item.name}`,
          desc: item.desc,
          icon: item.icon,
          itemRef: item,
          weight: 1.00
        });
      }
    }

    // Lọc bỏ các lựa chọn nằm trong danh sách đã Banish (Loại Bỏ)
    const validChoices = choices.filter(c => !banishedIds || !banishedIds.has(c.id));

    // Rút 3 lựa chọn ngẫu nhiên có trọng số (Weighted Random Sampling without replacement)
    // Vũ khí chính có trọng số 1.30 (+30% tỉ lệ so với 1.00 của các lựa chọn khác)
    const selected = [];
    const pool = [...validChoices];
    const targetCount = Math.min(3, pool.length);

    while (selected.length < targetCount && pool.length > 0) {
      const totalWeight = pool.reduce((sum, item) => sum + (item.weight || 1.00), 0);
      let rand = Math.random() * totalWeight;
      let pickedIndex = 0;
      for (let i = 0; i < pool.length; i++) {
        rand -= (pool[i].weight || 1.00);
        if (rand <= 0) {
          pickedIndex = i;
          break;
        }
      }
      selected.push(pool[pickedIndex]);
      pool.splice(pickedIndex, 1);
    }

    return selected;
  }

  // Áp dụng lựa chọn người chơi bấm vào
  applyChoice(choice, player) {
    if (choice.category === 'skill') {
      this.skillManager.unlockSkill(choice.id, player);
    } else if (choice.category === 'weapon_upgrade') {
      choice.weaponRef.upgrade();
    } else if (choice.category === 'new_weapon') {
      const newW = new choice.constructor();
      this.weaponManager.addWeapon(newW);
    } else if (choice.category === 'new_passive') {
      choice.itemRef.level = 1;
      if (choice.itemRef.type === 'defense') {
        this.defenseSlots.push(choice.itemRef);
      } else {
        this.utilitySlots.push(choice.itemRef);
      }
      this.applyPassiveEffect(choice.itemRef, player);
    } else if (choice.category === 'passive_upgrade') {
      choice.itemRef.level++;
      this.applyPassiveEffect(choice.itemRef, player);
    }

    // Kiểm tra xem có 2 vũ khí đạt Max Cấp 7 để mở khóa Tiến Hóa không
    this.checkEvolutionReadiness();
  }

  applyPassiveEffect(item, player) {
    if (item.id === 'armor') {
      const baseArm = (player.charConfig && player.charConfig.baseArmor) || 0;
      const masteryArm = (player.masteryBonuses && player.masteryBonuses.bonusArmor) || 0;
      player.armor = baseArm + masteryArm + item.level * 20;
    } else if (item.id === 'shield') {
      const shieldAmount = 250 + (item.level - 1) * 100;
      player.addShield(shieldAmount);
    } else if (item.id === 'boots') {
      const baseSpd = (player.charConfig && player.charConfig.baseSpeed) || 230;
      player.speed = baseSpd * (1.0 + item.level * 0.08);
    } else if (item.id === 'clover') {
      const baseCrit = (player.baseCritChance !== undefined) ? player.baseCritChance : (((player.charConfig && player.charConfig.critChance) || 0.05));
      player.critChance = baseCrit + item.level * 0.15;
    } else if (item.id === 'thorns') {
      player.thornsItemLevel = item.level;
      if (player.updateReflectStats) player.updateReflectStats();
    }
  }

  getXPMultiplier() {
    const tome = this.passivePool.tome;
    if (tome && tome.level > 0) {
      return 1.0 + tome.level * 0.12;
    }
    return 1.0;
  }

  getCloverGoldBonus() {
    const clover = this.passivePool.clover;
    if (clover && clover.level > 0) {
      return 1.0 + clover.level * 0.10;
    }
    return 1.0;
  }

  // Kiểm tra điều kiện Tiến Hóa: Khi có 2 vũ khí phụ (không tính Vũ Khí Chính độc nhất) đạt Cấp 7
  checkEvolutionReadiness() {
    const candidates = [];
    for (let i = 0; i < this.attackSlots.length; i++) {
      const w = this.attackSlots[i];
      if (w.level >= 7 && !w.isMainWeapon && !w.isUnique && !w.isEvolved) {
        candidates.push({ weapon: w, index: i });
      }
    }

    if (candidates.length < 2) {
      this.canEvolve = false;
      this.pendingEvolutionPlan = null;
      return false;
    }

    // 1. Ưu tiên tìm cặp khớp với công thức cụ thể trong WEAPON_FUSION_RECIPES
    for (const recipe of WEAPON_FUSION_RECIPES) {
      const [reqA, reqB] = recipe.ingredients;
      let candA = null;
      let candB = null;

      for (const c of candidates) {
        if (!candA && c.weapon.id === reqA) candA = c;
        else if (!candB && c.weapon.id === reqB) candB = c;
      }

      if (candA && candB && candA.index !== candB.index) {
        this.canEvolve = true;
        this.pendingEvolutionPlan = {
          recipe,
          idx1: Math.min(candA.index, candB.index),
          idx2: Math.max(candA.index, candB.index),
          w1: candA.weapon,
          w2: candB.weapon
        };
        return true;
      }
    }

    // 2. Nếu không khớp công thức đặc thù, fallback sang Bão Kiếm Huyền Bướm với 2 ứng viên đầu tiên
    const c1 = candidates[0];
    const c2 = candidates[1];
    this.canEvolve = true;
    this.pendingEvolutionPlan = {
      recipe: {
        resultClass: EvolvedStormSwordWeapon,
        resultId: 'evolved_storm_sword',
        name: '⭐ BÃO KIẾM HUYỀN BƯỚM ⭐',
        title: 'HỢP NHẤT: BÃO KIẾM HUYỀN BƯỚM',
        desc: 'Hợp thể 2 vũ khí phụ max cấp. Tăng +120% Sát thương toàn bộ vũ khí, giảm -35% hồi chiêu, và phát nổ kiếm ánh sáng ma thuật quét sạch bản đồ!',
        icon: 'assets/icons/evolved_storm_sword.png'
      },
      idx1: Math.min(c1.index, c2.index),
      idx2: Math.max(c1.index, c2.index),
      w1: c1.weapon,
      w2: c2.weapon
    };
    return true;
  }

  // Hợp nhất 2 vũ khí phụ Cấp 7 thành 1 vũ khí tối thượng, rút bớt 1 ô vũ khí (Bảo toàn 100% vũ khí chính độc nhất)
  executeEvolution() {
    if (!this.checkEvolutionReadiness() || !this.pendingEvolutionPlan) {
      return null;
    }

    const plan = this.pendingEvolutionPlan;
    const evolvedWeapon = new plan.recipe.resultClass();

    // Thay thế ô vũ khí 1 bằng vũ khí tối thượng
    this.attackSlots[plan.idx1] = evolvedWeapon;

    // Xóa bỏ ô vũ khí 2 (rút bớt 1 ô vũ khí, giải phóng chỗ trống cho slot tấn công tiếp theo)
    this.attackSlots.splice(plan.idx2, 1);

    this.canEvolve = false;
    this.lastEvolutionInfo = {
      name: plan.recipe.name,
      title: plan.recipe.title,
      desc: plan.recipe.desc,
      icon: plan.recipe.icon,
      ingredient1: plan.w1.name,
      ingredient2: plan.w2.name
    };
    this.pendingEvolutionPlan = null;

    if (typeof window !== 'undefined' && window.__gameInstance && window.__gameInstance.achievementSystem) {
      window.__gameInstance.achievementSystem.track('evolved_weapons', 1);
    }
    return this.lastEvolutionInfo;
  }

  // Tính toán chỉ số phòng thủ
  getDamageReduction() {
    const armor = this.passivePool.armor;
    if (armor.level > 0 && !armor.isLocked) {
      return Math.min(0.50, armor.level * 0.05); // Tối đa -35% đến -50%
    }
    return 0;
  }

  getMagnetRadius(player = null) {
    const base = 140;
    const metaMult = player && player.metaPickupRangeMult ? player.metaPickupRangeMult : 1.0;
    const magnet = this.passivePool.magnet;
    if (magnet && magnet.isLocked) return base * metaMult;
    return base * (1.0 + (magnet ? magnet.level * 0.25 : 0)) * metaMult;
  }

  // Xuất dữ liệu trang bị để lưu trận đấu
  getEquippedData() {
    return {
      weapons: this.attackSlots.map(w => ({ id: w.id, level: w.level })),
      defense: this.defenseSlots.map(d => ({ id: d.id, level: d.level })),
      utility: this.utilitySlots.map(u => ({ id: u.id, level: u.level })),
      canEvolve: this.canEvolve
    };
  }

  // Khôi phục dữ liệu trang bị từ file lưu
  restoreEquippedData(data, player) {
    if (!data) return;

    // 1. Khôi phục vũ khí tấn công
    this.weaponManager.equippedWeapons = [];
    this.attackSlots = this.weaponManager.equippedWeapons;

    const weaponsList = data.weapons || [];
    for (let i = 0; i < weaponsList.length; i++) {
      const wData = weaponsList[i];
      const w = createWeaponById(wData.id);
      while (w.level < wData.level) {
        w.upgrade();
      }
      if (i === 0 && !w.isEvolved && w.id !== 'evolved_storm_sword') {
        w.isMainWeapon = true;
        w.isUnique = true;
      }
      this.weaponManager.equippedWeapons.push(w);
    }

    // 2. Khôi phục trang bị phòng thủ & đa dụng
    this.defenseSlots = [];
    this.utilitySlots = [];

    for (const k in this.passivePool) {
      this.passivePool[k].level = 0;
    }

    for (const dData of data.defense || []) {
      const item = this.passivePool[dData.id];
      if (item) {
        item.level = dData.level;
        this.defenseSlots.push(item);
        this.applyPassiveEffect(item, player);
      }
    }

    for (const uData of data.utility || []) {
      const item = this.passivePool[uData.id];
      if (item) {
        item.level = uData.level;
        this.utilitySlots.push(item);
        this.applyPassiveEffect(item, player);
      }
    }

    this.canEvolve = !!data.canEvolve;
    this.checkEvolutionReadiness();
  }
}
