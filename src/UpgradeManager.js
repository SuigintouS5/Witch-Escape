import {
  MainSwordWeapon,
  OrbitingBladesWeapon,
  HolyAuraWeapon,
  PoolZoneWeapon,
  PiercingNeedleWeapon,
  BoomerangWeapon,
  ArcSlashWeapon,
  EvolvedStormSwordWeapon,
  createWeaponById,
  WEAPON_UPGRADE_DETAILS
} from './Weapon.js';

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

    // Kho định nghĩa tất cả vật phẩm phòng thủ & đa dụng
    this.passivePool = {
      // Phòng thủ
      armor: { id: 'armor', name: 'Giáp Ma Thuật', icon: 'assets/icons/armor.png', type: 'defense', level: 0, maxLevel: 7, desc: 'Giảm 5% sát thương nhận vào mỗi cấp.' },
      shield: { id: 'shield', name: 'Khiên Hộ Thể', icon: 'assets/icons/shield.png', type: 'defense', level: 0, maxLevel: 7, desc: 'Hấp thụ đòn đánh và tự hồi phục sau mỗi 10 giây.' },
      regen: { id: 'regen', name: 'Trái Tim Bất Diệt', icon: 'assets/icons/heart.png', type: 'defense', level: 0, maxLevel: 7, desc: 'Tự động hồi phục +1 Máu/giây mỗi cấp.' },
      thorns: { id: 'thorns', name: 'Áo Gai Ma Thần', icon: 'assets/icons/thorns.png', type: 'defense', level: 0, maxLevel: 7, desc: 'Phản lại 20 sát thương khi quái vật chạm vào người.' },

      // Đa dụng (3 slot)
      magnet: { id: 'magnet', name: 'Nam Châm Hút Hồn', icon: 'assets/icons/magnet.png', type: 'utility', level: 0, maxLevel: 7, desc: 'Tăng 25% bán kính tự động hút Đá Kinh Nghiệm.' },
      boots: { id: 'boots', name: 'Hài Gió Bóng Đêm', icon: 'assets/icons/boots.png', type: 'utility', level: 0, maxLevel: 7, desc: 'Tăng 8% tốc độ di chuyển của nhân vật mỗi cấp.' },
      clover: { id: 'clover', name: 'Cỏ Bốn Lá May Mắn', icon: 'assets/icons/clover.png', type: 'utility', level: 0, maxLevel: 7, desc: 'Tăng +2% tỉ lệ chí mạng & +10% tiền vàng mỗi cấp.' },
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
  }

  // Lấy 3 lựa chọn nâng cấp ngẫu nhiên khi Lên Cấp (Level Up)
  generateChoices() {
    const choices = [];

    // 1. Kiểm tra kỹ năng riêng nhân vật (nếu chưa mở khóa)
    const skills = this.skillManager.skills;
    if (!skills.extraLife.unlocked) {
      choices.push({
        category: 'skill',
        id: 'extraLife',
        name: `⭐ ${skills.extraLife.name}`,
        desc: skills.extraLife.desc,
        icon: skills.extraLife.icon
      });
    }
    if (!skills.bloodPact.unlocked) {
      choices.push({
        category: 'skill',
        id: 'bloodPact',
        name: `⭐ ${skills.bloodPact.name}`,
        desc: skills.bloodPact.desc,
        icon: skills.bloodPact.icon
      });
    }
    if (!skills.lifesteal.unlocked) {
      choices.push({
        category: 'skill',
        id: 'lifesteal',
        name: `⭐ ${skills.lifesteal.name}`,
        desc: skills.lifesteal.desc,
        icon: skills.lifesteal.icon
      });
    }

    // 2. Nâng cấp các Vũ khí Tấn công hiện có (< cấp 7)
    for (const w of this.attackSlots) {
      if (w.level < w.maxLevel) {
        const nextLvl = w.level + 1;
        const details = WEAPON_UPGRADE_DETAILS[w.id] && WEAPON_UPGRADE_DETAILS[w.id][nextLvl]
          ? WEAPON_UPGRADE_DETAILS[w.id][nextLvl]
          : `Tăng cường sức mạnh vũ khí lên Cấp ${nextLvl}/${w.maxLevel}.`;

        choices.push({
          category: 'weapon_upgrade',
          id: w.id,
          name: `⚔️ ${w.name} (Cấp ${nextLvl})`,
          desc: details,
          icon: w.icon,
          weaponRef: w
        });
      }
    }

    // 3. Mua thêm Vũ khí Tấn công mới (nếu slot tấn công < 4)
    if (this.attackSlots.length < this.maxAttackSlots) {
      for (const Cls of this.availableWeaponConstructors) {
        const dummy = new Cls();
        const alreadyHave = this.attackSlots.some(w => w.id === dummy.id);
        if (!alreadyHave) {
          choices.push({
            category: 'new_weapon',
            id: dummy.id,
            name: `⚔️ [Mới] ${dummy.name}`,
            desc: dummy.desc,
            icon: dummy.icon,
            constructor: Cls
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
          itemRef: item
        });
      } else if (!equipped && this.defenseSlots.length < this.maxDefenseSlots) {
        choices.push({
          category: 'new_passive',
          id: item.id,
          name: `🛡️ [Mới] ${item.name}`,
          desc: item.desc,
          icon: item.icon,
          itemRef: item
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
          itemRef: item
        });
      } else if (!equipped && this.utilitySlots.length < this.maxUtilitySlots) {
        choices.push({
          category: 'new_passive',
          id: item.id,
          name: `🧲 [Mới] ${item.name}`,
          desc: item.desc,
          icon: item.icon,
          itemRef: item
        });
      }
    }

    // Xáo trộn ngẫu nhiên và lấy ra 3 lựa chọn
    choices.sort(() => Math.random() - 0.5);
    return choices.slice(0, 3);
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
    if (item.id === 'boots') {
      const baseSpd = (player.charConfig && player.charConfig.baseSpeed) || 230;
      player.speed = baseSpd * (1.0 + item.level * 0.08);
    } else if (item.id === 'clover') {
      const baseCrit = (player.charConfig && player.charConfig.critChance) || 0.05;
      player.critChance = baseCrit + item.level * 0.02;
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

  // Kiểm tra điều kiện Tiến Hóa: Khi có 2 vũ khí đạt Cấp 7
  checkEvolutionReadiness() {
    const maxedWeapons = this.attackSlots.filter(w => w.level >= 7);
    if (maxedWeapons.length >= 2) {
      this.canEvolve = true;
      return true;
    }
    return false;
  }

  // Hợp nhất 2 vũ khí Cấp 7 thành 1 vũ khí tối thượng, rút bớt 1 ô vũ khí
  executeEvolution() {
    const maxedIndices = [];
    for (let i = 0; i < this.attackSlots.length; i++) {
      if (this.attackSlots[i].level >= 7 && this.attackSlots[i].id !== 'evolved_storm_sword') {
        maxedIndices.push(i);
        if (maxedIndices.length === 2) break;
      }
    }

    if (maxedIndices.length >= 2) {
      const idx1 = maxedIndices[0];
      const idx2 = maxedIndices[1];

      // Tạo vũ khí tối thượng
      const evolvedWeapon = new EvolvedStormSwordWeapon();

      // Thay thế ô vũ khí 1 bằng vũ khí tối thượng
      this.attackSlots[idx1] = evolvedWeapon;

      // Xóa bỏ ô vũ khí 2 (rút bớt 1 ô vũ khí, giải phóng chỗ trống cho slot tấn công)
      this.attackSlots.splice(idx2, 1);

      this.canEvolve = false;
      return true;
    }
    return false;
  }

  // Tính toán chỉ số phòng thủ
  getDamageReduction() {
    const armor = this.passivePool.armor;
    if (armor.level > 0) {
      return Math.min(0.50, armor.level * 0.05); // Tối đa -35% đến -50%
    }
    return 0;
  }

  getMagnetRadius() {
    const base = 140;
    const magnet = this.passivePool.magnet;
    return base * (1.0 + magnet.level * 0.25);
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

    for (const wData of data.weapons || []) {
      const w = createWeaponById(wData.id);
      while (w.level < wData.level) {
        w.upgrade();
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
