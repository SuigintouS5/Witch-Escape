// =========================================================================
// HỆ THỐNG ĐẠI TÁC PHẨM (BOOK SYSTEM / CLASSIC CODEX)
// Quản lý 35 cuốn sách triết học & văn học kinh điển, cơ chế tiến hóa rẽ nhánh,
// hợp thể thần thoại, điều kiện ẩn, và Thư Viện Sách (Codex).
// =========================================================================

export const BOOK_CODEX_SAVE_KEY = 'vampire_survival_book_codex_v1';

// Định nghĩa toàn bộ 35 cuốn sách với tên tác phẩm chuẩn ngôn ngữ gốc
export const BOOK_DEFINITIONS = {
  // =========================================================================
  // 1. TÁM CUỐN BẬC KHỞI ĐẦU (STARTER BOOKS)
  // =========================================================================
  freud: {
    id: 'freud',
    author: 'Sigmund Freud',
    work: 'Die Traumdeutung',
    tier: 'starter',
    year: '1900',
    desc: 'Tăng +10% Tỉ lệ chí mạng (cộng trực tiếp vào cơ chế Siêu Crit).',
    buffs: { critChance: 0.10 },
    evolutionTarget: 'jung',
    reqKillCount: 120
  },
  plato: {
    id: 'plato',
    author: 'Plato',
    work: 'Politeia',
    tier: 'starter',
    year: '375 BC',
    desc: 'Tăng +10% Điểm kinh nghiệm (EXP) nhận được sau tổng.',
    buffs: { expMult: 0.10 },
    evolutionTarget: 'aristoteles',
    reqKillCount: 25
  },
  homer: {
    id: 'homer',
    author: 'Homer',
    work: 'Odysseia',
    tier: 'starter',
    year: '8th c. BC',
    desc: 'Tăng +8% Sát thương tổng thể toàn bộ vũ khí.',
    buffs: { dmgMult: 0.08 },
    evolutionTarget: 'virgil',
    reqKillCount: 100
  },
  garci_montalvo: {
    id: 'garci_montalvo',
    author: 'Garci Montalvo',
    work: 'Amadís de Gaula',
    tier: 'starter',
    year: '1508',
    desc: 'Tăng +10% Máu tối đa của nhân vật sau tổng.',
    buffs: { healthMult: 0.10 },
    evolutionTarget: 'cervantes'
  },
  john_milton: {
    id: 'john_milton',
    author: 'John Milton',
    work: 'Paradise Lost',
    tier: 'starter',
    year: '1667',
    desc: 'Tăng +20% Kích thước vũ khí và diện tích quét đòn.',
    buffs: { areaMult: 0.20 },
    evolutionTarget: 'mary_shelley',
    reqTime: 120 // Tồn tại 120s
  },
  peuchet: {
    id: 'peuchet',
    author: 'Jacques Peuchet',
    work: 'Le Diamant et la Vengeance',
    tier: 'starter',
    year: '1838',
    desc: 'Tăng +8% Tốc độ di chuyển nhân vật sau tổng.',
    buffs: { speedMult: 0.08 },
    evolutionTarget: 'dumas'
  },
  ovidius: {
    id: 'ovidius',
    author: 'Ovidius',
    work: 'Metamorphoses',
    tier: 'starter',
    year: '8 AD',
    desc: 'Tăng +15% Tiền Vàng thu được sau mỗi đợt diệt quái.',
    buffs: { goldMult: 0.15 },
    evolutionTarget: 'shakespeare'
  },
  saussure: {
    id: 'saussure',
    author: 'Ferdinand de Saussure',
    work: 'Cours de linguistique générale',
    tier: 'starter',
    year: '1916',
    desc: 'Giảm 10% Thời gian hồi chiêu tất cả vũ khí.',
    buffs: { cooldownReduction: 0.10 },
    evolutionTarget: 'foucault'
  },

  // =========================================================================
  // 2. CÁC BẬC TIẾN HÓA THÔNG THƯỜNG (NORMAL EVOLUTIONS)
  // =========================================================================
  jung: {
    id: 'jung',
    author: 'Carl Gustav Jung',
    work: 'Psychologische Typen',
    tier: 'evolved',
    year: '1921',
    desc: 'Tăng +20% Tỉ lệ chí mạng và +10% Sát thương chí mạng.',
    buffs: { critChance: 0.20, critDamage: 0.10 }
  },
  aristoteles: {
    id: 'aristoteles',
    author: 'Aristoteles',
    work: 'Metaphysica',
    tier: 'evolved',
    year: '350 BC',
    desc: 'Tăng +20% Điểm kinh nghiệm (EXP) nhận được.',
    buffs: { expMult: 0.20 },
    evolutionTarget: 'descartes',
    reqKillCount: 50
  },
  descartes: {
    id: 'descartes',
    author: 'René Descartes',
    work: 'Discours de la méthode',
    tier: 'evolved',
    year: '1637',
    desc: 'Tăng +20% Điểm kinh nghiệm (EXP) và +10% Sát thương toàn vũ khí.',
    buffs: { expMult: 0.20, dmgMult: 0.10 },
    branchTargets: ['heidegger', 'kant', 'spinoza'],
    reqKillCount: 75,
    evolutionDesc: 'Tiêu diệt 75 quái vật để mở nhánh tiến cấp'
  },
  heidegger: {
    id: 'heidegger',
    author: 'Martin Heidegger',
    work: 'Sein und Zeit',
    tier: 'evolved',
    year: '1927',
    desc: 'Tăng +35% EXP, +20% Vàng, +10% Chính xác.',
    buffs: { expMult: 0.35, goldMult: 0.20, accuracy: 0.10 }
  },
  kant: {
    id: 'kant',
    author: 'Immanuel Kant',
    work: 'Kritik der reinen Vernunft',
    tier: 'evolved',
    year: '1781',
    desc: 'Tăng +40% Điểm kinh nghiệm (EXP) nhận được.',
    buffs: { expMult: 0.40 },
    branchTargets: ['hegel', 'feuerbach', 'nietzsche'],
    reqKillCount: 150,
    evolutionDesc: 'Tiêu diệt 150 quái vật để mở nhánh tiến cấp'
  },
  hegel: {
    id: 'hegel',
    author: 'G. W. F. Hegel',
    work: 'Phänomenologie des Geistes',
    tier: 'evolved',
    year: '1807',
    desc: 'Tăng +60% EXP, +15% Vàng, +10% Tỉ lệ chí mạng.',
    buffs: { expMult: 0.60, goldMult: 0.15, critChance: 0.10 }
  },
  feuerbach: {
    id: 'feuerbach',
    author: 'Ludwig Feuerbach',
    work: 'Das Wesen des Christentums',
    tier: 'evolved',
    year: '1841',
    desc: 'Tăng +50% Vàng, +20% EXP, +20% Tỉ lệ chí mạng.',
    buffs: { goldMult: 0.50, expMult: 0.20, critChance: 0.20 }
  },
  nietzsche: {
    id: 'nietzsche',
    author: 'Friedrich Nietzsche',
    work: 'Zur Genealogie der Moral',
    tier: 'evolved',
    year: '1887',
    desc: 'Tăng +40% EXP, +10% Sát thương, +10% Chính xác, +20% Crit Chance, +10% Crit Dmg.',
    buffs: { expMult: 0.40, dmgMult: 0.10, accuracy: 0.10, critChance: 0.20, critDamage: 0.10 }
  },
  virgil: {
    id: 'virgil',
    author: 'Virgil',
    work: 'Aeneis',
    tier: 'evolved',
    year: '19 BC',
    desc: 'Tăng +20% Sát thương toàn bộ vũ khí.',
    buffs: { dmgMult: 0.20 },
    evolutionTarget: 'james_joyce',
    reqKillCount: 100,
    timeLimitSeconds: 60 // Giết 100 quái trong 60s
  },
  james_joyce: {
    id: 'james_joyce',
    author: 'James Joyce',
    work: 'Ulysses',
    tier: 'evolved',
    year: '1922',
    desc: 'Tăng +45% Dmg, +20% Xuyên giáp, +10% Crit Chance, +10% Crit Dmg, +5% Sát thương chuẩn, +5% Giảm sát thương.',
    buffs: {
      dmgMult: 0.45,
      armorPenPercent: 0.20,
      critChance: 0.10,
      critDamage: 0.10,
      trueDmgRatio: 0.05,
      damageReduction: 0.05
    }
  },
  cervantes: {
    id: 'cervantes',
    author: 'Miguel de Cervantes',
    work: 'Don Quijote',
    tier: 'evolved',
    year: '1605',
    desc: 'Tăng +30% HP, +10% Giáp, +30% Dmg, +10% Giảm sát thương. Khi máu < 35% kích hoạt Cuồng Nộ: +40% Crit Chance, +40% Crit Dmg, +5% Hút máu (duy trì 20s, CD 120s).',
    buffs: {
      healthMult: 0.30,
      armorMult: 0.10,
      dmgMult: 0.30,
      damageReduction: 0.10,
      hasCervantesRage: true
    }
  },
  mary_shelley: {
    id: 'mary_shelley',
    author: 'Mary Shelley',
    work: 'Frankenstein',
    tier: 'evolved',
    year: '1818',
    desc: 'Tăng +80% Kích thước vũ khí, +10% Crit Chance, +10% Tiền Vàng.',
    buffs: { areaMult: 0.80, critChance: 0.10, goldMult: 0.10 }
  },
  dumas: {
    id: 'dumas',
    author: 'Alexandre Dumas',
    work: 'Le Comte de Monte-Cristo',
    tier: 'evolved',
    year: '1844',
    desc: 'Tăng +20% Tốc độ, +10% Giáp, +5% Né tránh, +10% Chính xác. Khi máu < 20% nhận +30% Máu Ảo và +20% Giảm sát thương trong 20s (CD 200s).',
    buffs: {
      speedMult: 0.20,
      armorMult: 0.10,
      dodge: 0.05,
      accuracy: 0.10,
      hasDumasShield: true
    }
  },
  shakespeare: {
    id: 'shakespeare',
    author: 'William Shakespeare',
    work: 'Hamlet',
    tier: 'evolved',
    year: '1601',
    desc: 'Tăng +35% Tiền Vàng nhận được, +5% Giảm sát thương.',
    buffs: { goldMult: 0.35, damageReduction: 0.05 }
  },
  foucault: {
    id: 'foucault',
    author: 'Michel Foucault',
    work: 'Surveiller et punir: Naissance de la prison',
    tier: 'evolved',
    year: '1975',
    desc: 'Giảm 20% Thời gian hồi chiêu và tăng +20% Độ chính xác tất cả vũ khí.',
    buffs: { cooldownReduction: 0.20, accuracy: 0.20 }
  },

  // =========================================================================
  // 3. MƯỜI HAI CUỐN ĐẶC BIỆT & HỢP THỂ THẦN THOẠI (SPECIAL & FUSION)
  // =========================================================================
  camus: {
    id: 'camus',
    author: 'Albert Camus',
    work: "L'Étranger",
    tier: 'special',
    year: '1942',
    desc: 'Tăng +10% Xuyên giáp, +5% Crit Chance, +10% Crit Dmg, +10% Giáp.',
    buffs: {
      armorPenPercent: 0.10,
      critChance: 0.05,
      critDamage: 0.10,
      armorMult: 0.10
    }
  },
  adam_smith: {
    id: 'adam_smith',
    author: 'Adam Smith',
    work: 'The Wealth of Nations',
    tier: 'special',
    year: '1776',
    desc: 'Khai thông kinh tế: Tăng +40% Tiền Vàng và x1.2 toàn bộ Vàng nhận được sau trận.',
    buffs: { goldMult: 0.40, goldMultiplierFinal: 1.20 },
    buffs: { goldMultiplierFinal: 1.20 }
  },
  dante: {
    id: 'dante',
    author: 'Dante Alighieri',
    work: 'La Divina Commedia',
    tier: 'special',
    year: '1320',
    desc: 'Hợp thể [Aristoteles + Virgil]: Tăng +30% Chính xác, +15% Xuyên giáp, +20% Dmg, +20% Crit Chance.',
    buffs: {
      accuracy: 0.30,
      armorPenPercent: 0.15,
      dmgMult: 0.20,
      critChance: 0.20
    },
    fusionIngredients: ['aristoteles', 'virgil']
  },
  herman_melville: {
    id: 'herman_melville',
    author: 'Herman Melville',
    work: 'Moby-Dick',
    tier: 'special',
    year: '1851',
    desc: 'Hợp thể [Plato + Shakespeare]: Tăng +40% Máu tối đa, +20% Phản đòn sát thương, +10% Giáp.',
    buffs: {
      healthMult: 0.40,
      reflectPercent: 0.20,
      armorMult: 0.10
    },
    fusionIngredients: ['plato', 'shakespeare']
  },
  dostoyevsky: {
    id: 'dostoyevsky',
    author: 'Fyodor Dostoyevsky',
    work: 'Преступление и наказание',
    tier: 'special',
    year: '1866',
    desc: 'Hợp thể [Shakespeare + Kant]: Tăng +15% Hút máu, +20% Crit Chance, +10% Giáp, +20% Kích thước vũ khí, -5% Cooldown.',
    buffs: {
      lifesteal: 0.15,
      critChance: 0.20,
      armorMult: 0.10,
      areaMult: 0.20,
      cooldownReduction: 0.05
    },
    fusionIngredients: ['shakespeare', 'kant']
  },
  sartre: {
    id: 'sartre',
    author: 'Jean-Paul Sartre',
    work: 'Huis clos',
    tier: 'special',
    year: '1944',
    desc: 'Tự do hiện sinh toàn năng: +10% Xuyên giáp, +10% EXP, +10% Vàng, +10% Chính xác, +5% Né, +5% Phản đòn, +5% Sát thương chuẩn, +5% Tốc chạy, +5% Hút máu, +10% Crit Chance, +10% Crit Dmg, +10% Kích thước, -5% Cooldown.',
    buffs: {
      armorPenPercent: 0.10,
      expMult: 0.10,
      goldMult: 0.10,
      accuracy: 0.10,
      dodge: 0.05,
      reflectPercent: 0.05,
      trueDmgRatio: 0.05,
      speedMult: 0.05,
      lifesteal: 0.05,
      critChance: 0.10,
      critDamage: 0.10,
      areaMult: 0.10,
      cooldownReduction: 0.05
    }
  },
  kafka: {
    id: 'kafka',
    author: 'Franz Kafka',
    work: 'Die Verwandlung',
    tier: 'special',
    year: '1915',
    desc: 'Hợp thể [Nietzsche + Dostoyevsky]: +30% Size, +10% Giáp, +10% Hút máu, +15% Dmg, +20% HP, +30% Crit. Không nhận sát thương tăng +1% Crit Chance mỗi giây vô tận (dính đòn trừ 20% stack); máu < 20% tàng hình miễn nhiễm 10s (CD 150s).',
    buffs: {
      areaMult: 0.30,
      armorMult: 0.10,
      lifesteal: 0.10,
      dmgMult: 0.15,
      healthMult: 0.20,
      critChance: 0.30,
      hasKafkaCritStack: true
    },
    fusionIngredients: ['nietzsche', 'dostoyevsky']
  },
  victor_hugo: {
    id: 'victor_hugo',
    author: 'Victor Hugo',
    work: 'Les Misérables',
    tier: 'special',
    year: '1862',
    desc: 'Hợp thể [Shakespeare + Dumas]: Chuyển 50% Sát thương gây ra thành Sát Thương Chuẩn; mỗi 30s phóng sóng xung kích làm chậm quái 30% trong 5s; +20% Chính xác, +20% Crit Chance.',
    buffs: {
      trueDmgRatio: 0.50,
      accuracy: 0.20,
      critChance: 0.20,
      hasHugoWave: true
    },
    fusionIngredients: ['shakespeare', 'dumas']
  },
  neil_postman: {
    id: 'neil_postman',
    author: 'Neil Postman',
    work: 'Amusing Ourselves to Death',
    tier: 'special',
    year: '1985',
    desc: 'Hợp thể [Camus + Mary Shelley + Jung]: +40% Chính xác, +30% Thời gian DOT, +30% Dmg DOT, DOT có thể nổ Chí Mạng, 20% đòn đánh đốt cháy quái, +30% Size, -20% Cooldown, +20% Tốc chạy, +10% Xuyên giáp.',
    buffs: {
      accuracy: 0.40,
      dotDurationMult: 0.30,
      dotDmgMult: 0.30,
      dotCanCrit: true,
      burnChance: 0.20,
      areaMult: 0.30,
      cooldownReduction: 0.20,
      speedMult: 0.20,
      armorPenPercent: 0.10
    },
    fusionIngredients: ['camus', 'mary_shelley', 'jung']
  },
  lacan: {
    id: 'lacan',
    author: 'Jacques Lacan',
    work: 'Écrits',
    tier: 'special',
    year: '1966',
    desc: 'Giai Đoạn Tấm Gương (Mirror Stage): +30% Dmg, +25% HP, +25% Crit, -15% Hồi chiêu, 30% Sát thương chuẩn, +1 Mạng hồi sinh, +5% Hút máu. Triệu hồi Bản Sao Bóng Ma Hộ Vệ (Echo Stand) bảo vệ sau lưng gây 50% Sát thương!',
    buffs: {
      dmgMult: 0.30,
      healthMult: 0.25,
      critChance: 0.25,
      cooldownReduction: 0.15,
      trueDmgRatio: 0.30,
      extraLife: 1,
      lifesteal: 0.05,
      hasLacanPhantomStand: true
    },
    fusionIngredients: ['hegel', 'saussure', 'freud']
  },
  derrida: {
    id: 'derrida',
    author: 'Jacques Derrida',
    work: 'De la grammatologie',
    tier: 'special',
    year: '1967',
    desc: 'Giải Cấu Trúc (Deconstruction): +35% Dmg, +30% Giáp, +30% Crit, -20% Hồi chiêu, 40% Sát thương chuẩn, +1 Mạng hồi sinh, +5% Hút máu. Mọi đòn đánh xóa bỏ vĩnh viễn 40% Giáp của quái; quái chết phát nổ ký tự gây sát thương diện rộng.',
    buffs: {
      dmgMult: 0.35,
      armorMult: 0.30,
      critChance: 0.30,
      cooldownReduction: 0.20,
      trueDmgRatio: 0.40,
      extraLife: 1,
      lifesteal: 0.05,
      derridaDeconstruction: true
    },
    fusionIngredients: ['heidegger', 'saussure', 'hegel']
  },
  marx: {
    id: 'marx',
    author: 'Karl Marx & Friedrich Engels',
    work: 'Manifest der Kommunistischen Partei',
    tier: 'special',
    year: '1848',
    desc: 'Giải Phóng Vô Sản (Proletariat Revolution): +40% Dmg, +35% HP, +35% Giáp, -25% Hồi chiêu, 50% Sát thương chuẩn, +1 Mạng hồi sinh, +5% Hút máu, +40% Vàng. Quái chết phát nổ Sóng Xung Kích Đỏ; mỗi 100 Vàng kiếm được tăng vĩnh viễn +1% Sát thương.',
    buffs: {
      dmgMult: 0.40,
      healthMult: 0.35,
      armorMult: 0.35,
      cooldownReduction: 0.25,
      trueDmgRatio: 0.50,
      extraLife: 1,
      lifesteal: 0.05,
      goldMult: 0.40,
      marxRevolution: true
    },
    fusionIngredients: ['hegel', 'feuerbach', 'adam_smith']
  },
  // --- CÁC SÁCH BẬC KHỞI ĐẦU MỚI (STARTERS 9-11) ---
  le_fanu: {
    id: 'le_fanu',
    author: 'Joseph Sheridan Le Fanu',
    work: 'Carmilla',
    tier: 'starter',
    year: '1872',
    desc: 'Tăng +3% Hút máu, +5% Tốc độ di chuyển và +5% Máu tối đa.',
    buffs: { lifesteal: 0.03, speedMult: 0.05, healthMult: 0.05 },
    evolutionTarget: 'bram_stoker'
  },
  augustine: {
    id: 'augustine',
    author: 'Augustine of Hippo',
    work: 'Confessiones',
    tier: 'starter',
    year: '397',
    desc: 'Tăng +10% Điểm Kinh Nghiệm (EXP) và +10% Tiền Vàng nhận được.',
    buffs: { expMult: 0.10, goldMult: 0.10 },
    evolutionTarget: 'thomas_aquinas'
  },
  horkheimer: {
    id: 'horkheimer',
    author: 'Max Horkheimer',
    work: 'Zur Kritik der instrumentellen Vernunft', // Eclipse of Reason
    tier: 'starter',
    year: '1947',
    desc: 'Đòn đánh gắn Suy Yếu 1 lên quái (Quái giảm 5% sát thương và chịu thêm +5% sát thương trong 3s).',
    buffs: { applyWeakness1: true },
    evolutionTarget: 'habermas'
  },

  // --- CÁC SÁCH TIẾN HÓA MỚI (EVOLVED) ---
  spinoza: {
    id: 'spinoza',
    author: 'Baruch Spinoza',
    work: 'Ethica, ordine geometrico demonstrata',
    tier: 'evolved',
    year: '1677',
    desc: 'Nhất Thể Bản Thể (Substantia): +30 Giáp, +35% Máu, -15% Hồi chiêu. Mỗi 10 Giáp tăng +8% Sát thương; mỗi 100 Máu tăng +2% Sát thương & +1% Tốc độ. Giáp chặn đòn phát nổ Sóng Hình Học phản 150% sát thương chặn!',
    buffs: { armorFlat: 30, healthMult: 0.35, cooldownReduction: 0.15, spinozaSubstantia: true }
  },
  bram_stoker: {
    id: 'bram_stoker',
    author: 'Bram Stoker',
    work: 'Dracula',
    tier: 'evolved',
    year: '1897',
    desc: 'Tăng +7% Hút máu, +20% Sát thương, +10% Sát thương chuẩn, +10% Giảm sát thương. Cơn Khát Máu: Không đánh trúng quái trong 4s sẽ mất 2% HP/s (dừng ở 25% máu).',
    buffs: { lifesteal: 0.07, dmgMult: 0.20, trueDmgRatio: 0.10, damageReduction: 0.10, bloodthirst: true }
  },
  thomas_aquinas: {
    id: 'thomas_aquinas',
    author: 'Thomas Aquinas',
    work: 'Summa Theologiae',
    tier: 'evolved',
    year: '1485',
    desc: 'Mỗi giây không nhận sát thương tăng +2% Tiền Vàng (Cộng dồn). Nhận sát thương sẽ bị chia nửa số stack tích lũy.',
    buffs: { passiveGreedPerSec: 0.02 }
  },
  habermas: {
    id: 'habermas',
    author: 'Jürgen Habermas',
    work: 'Theorie des kommunikativen Handelns',
    tier: 'evolved',
    year: '1981',
    desc: 'Tấn công gây Suy Yếu 1. Khi đủ 20 quái bị dính Suy Yếu 1, phát ra làn sóng xung kích đẩy lùi 20% quái vật.',
    buffs: { applyWeakness1: true, habermasPulse: true },
    evolutionTarget: 'honneth'
  },
  honneth: {
    id: 'honneth',
    author: 'Axel Honneth',
    work: 'Kampf um Anerkennung',
    tier: 'evolved',
    year: '1992',
    desc: 'Tăng +20% Sát thương. Tấn công gây Suy Yếu 2 (giảm 10% dmg quái, chịu thêm +10% dmg trong 5s). Đánh quái bị Suy Yếu sẽ gây Thiêu Đốt (Burn).',
    buffs: { dmgMult: 0.20, applyWeakness2: true, burnWeakened: true }
  },

  // --- CÁC SÁCH ĐẶC BIỆT & HỢP THỂ MỚI (SPECIAL & FUSION) ---
  tolstoy: {
    id: 'tolstoy',
    author: 'Lev Tolstoy',
    work: 'Война и мир', // War and Peace
    tier: 'special',
    year: '1869',
    desc: 'Mở khóa đặc biệt [Làm chậm 100 quái]: Mọi đòn đánh của vũ khí có 20% tỷ lệ làm chậm quái 20% trong 5 giây.',
    buffs: { slowChance: 0.20, slowAmount: 0.20, slowDuration: 5.0 }
  },
  kierkegaard: {
    id: 'kierkegaard',
    author: 'Søren Kierkegaard',
    work: 'Frygt og Bæven',
    tier: 'special',
    year: '1843',
    desc: 'Mở khóa đặc biệt [Bỏ sách Hegel]: Cú nhảy niềm tin tăng +35% Tỷ lệ chí mạng, +30% Sát thương chí mạng và 15% Sát thương chuẩn.',
    buffs: { critChance: 0.35, critDamage: 0.30, trueDmgRatio: 0.15 }
  },
  nguyen_du: {
    id: 'nguyen_du',
    author: 'Nguyễn Du',
    work: 'Đoạn trường tân thanh', // Truyện Kiều
    tier: 'special',
    year: '1820',
    desc: 'Mở khóa đặc biệt [60s HP > 50% & 60s HP < 50%]: Đòn đánh đầu tiên gán Suy Yếu 2 lên quái (quái giảm 15% dmg và nhận thêm +15% sát thương trong 5s). Nếu có nguồn Suy Yếu 2 khác, chuyển hóa thành Xuất Huyết (Bleed) liên tục!',
    buffs: { firstHitWeakness2: true }
  },
  butler: {
    id: 'butler',
    author: 'Judith Butler',
    work: 'Gender Trouble',
    tier: 'special',
    year: '1990',
    desc: 'Thức tỉnh tối thượng [Lacan + Foucault]: +25% Cooldown, +30% Tốc chạy, +25% Né, +35% Size. Cơ chế [Performativity Flux] luân chuyển mỗi 10s: 5s [Hóa Giải] (100% dmg nhận biến thành Giáp ảo + phản chấn 30%), 5s [Bộc Phát] (+60% Sát thương chuẩn + x2 tốc độ đánh vũ khí). Tăng thêm +20% toàn bộ hiệu lực của Lacan!',
    buffs: {
      cooldownReduction: 0.25,
      speedMult: 0.30,
      dodge: 0.25,
      areaMult: 0.35,
      trueDmgRatio: 0.30
    }
  },
  beauvoir: {
    id: 'beauvoir',
    author: 'Simone de Beauvoir',
    work: "Pour une morale de l'ambiguïté", // The Ethics of Ambiguity
    tier: 'special',
    year: '1947',
    desc: 'Hợp thể Hiện Sinh [Hegel + Sartre]: +40% EXP, +30% Vàng, +25% Cooldown, +30% Sát thương, +15% Giảm sát thương. Cơ chế [Ambiguous Liberation]: Hào quang Tự Do làm giảm 25% Sát thương & 25% Tốc độ của quái trong 300px; cứ 2 quái trên màn hình tăng +1% Sát thương (tối đa +80%). Tiêu diệt Mini Boss/Elite nhận 4s Bất Tử và hồi 20% Máu tối đa!',
    buffs: {
      expMult: 0.40,
      goldMult: 0.30,
      cooldownReduction: 0.25,
      dmgMult: 0.30,
      damageReduction: 0.15
    },
    fusionIngredients: ['hegel', 'sartre']
  },
  marquez: {
    id: 'marquez',
    author: 'Gabriel García Márquez',
    work: 'Cien años de soledad',
    tier: 'special',
    year: '1967',
    desc: 'Hiện Thực Huyền Ảo tối thượng [Kafka + 2 lần HP < 20%]: +40% Sát thương, +40% HP, +20% Hút máu, +50% Size. Cơ chế [Vòng Lặp Trăm Năm]: Khi nhận sát thương chí tử, không chết mà đóng băng quái 3s dưới Mưa Hoa Vàng Macondo, hồi sinh 100% HP & dọn quái thường (Hồi chiêu 240s). Nội tại [Lời Nguyền Macondo]: Mỗi 1% HP bị mất tăng +1.5% Crit Chance & +2% Crit Damage!',
    buffs: {
      dmgMult: 0.40,
      healthMult: 0.40,
      lifesteal: 0.20,
      areaMult: 0.50
    }
  }
};

export const STARTER_BOOK_IDS = [
  'freud',
  'plato',
  'homer',
  'garci_montalvo',
  'john_milton',
  'peuchet',
  'ovidius',
  'saussure',
  'le_fanu',
  'augustine',
  'horkheimer'
];

// Tự động gán bí danh buffDesc tương thích ngược với desc
for (const b of Object.values(BOOK_DEFINITIONS)) {
  if (!b.buffDesc && b.desc) b.buffDesc = b.desc;
}

// =========================================================================
// CLASS QUẢN LÝ HỆ THỐNG SÁCH (BOOK SYSTEM MANAGER)
// =========================================================================
export class BookSystem {
  constructor() {
    this.activeBooks = [];       // Danh sách sách đang sở hữu trong ván chơi (tối đa maxSlots)
    this.maxSlots = 3;           // Mặc định 3 slot, nâng cấp tại Cổ Viện tối đa lên 5
    this.discardedBooks = [];    // Sách đã bỏ trong ván
    this.appearedBookIds = new Set(); // Sách đã từng xuất hiện trong ván (để tránh drop trùng)

    // Bộ đếm tiến trình của các sách đang sở hữu
    // { bookId: { kills: 0, timer: 0, readyToEvolve: false, paused: false, targetId: null } }
    this.progress = {};

    // Danh sách các sách sẵn sàng tiến hóa đang chờ người chơi chọn
    this.pendingEvolutions = [];
    this.pendingAwakenings = [];
    this.pendingAwakenings = []; // Danh sách các tác phẩm ẩn/hợp thể đã thức tỉnh trong trận

    // Bộ đếm điều kiện ẩn toàn cục
    this.matchTimer = 0;
    this.hasTakenDamageThisRun = false;
    this.noDamageTimer = 0;        // Cho Shakespeare (30s không nhận dmg vào máu thật)
    this.lowHealthTimer = 0;       // Cho Cervantes (máu < 20% tích lũy 120s)
    this.dumasVengeanceCount = 0;  // Cho Dumas (10 lần báo thù trong 10s)
    this.recentAttackers = new Map(); // Map<enemy, expireTime> theo dõi quái cắn người chơi trong 10s

    // Kafka Crit Stacks
    this.kafkaCritStacks = 0;
    this.kafkaNoHitTimer = 0;
    this.kafkaInvisTimer = 0;
    this.kafkaInvisCooldown = 0;

    // Cervantes Rage Cooldown
    this.cervantesRageTimer = 0;
    this.cervantesRageCooldown = 0;

    // Dumas Shield Cooldown
    this.dumasShieldCooldown = 0;

    // Victor Hugo Slow Wave Timer (30s)
    this.hugoWaveTimer = 30;
    this.consumedExtraLives = 0;

    // Trạng thái cho Butler (Performativity Flux)
    this.butlerFluxTimer = 0;
    this.butlerFluxState = 'absorption'; // 'absorption' | 'burst'

    // Trạng thái cho Beauvoir (Bất tử khi diệt boss)
    this.beauvoirInvincibleTimer = 0;

    // Trạng thái cho Márquez (Vòng lặp Macondo & HP < 20%)
    this.marquezCheatDeathCooldown = 0;
    this.marquezCheatDeathActive = 0;
    this.kafkaLowHpTriggers = 0;
    this.isInLowHp = false;

    // Trạng thái cho Tolstoy, Nguyễn Du, Thomas Aquinas
    this.slowedEnemiesCount = 0;
    this.highHpTimer = 0;
    this.lowHpTimer = 0;
    this.thomasGoldStacks = 0;

    // Thư Viện Codex lưu trữ vĩnh viễn (các sách đã từng sở hữu)
    this.unlockedCodex = new Set();
    this.loadCodex();
  }

  // Khởi tạo đầu trận (hỗ trợ 1 hoặc nhiều sách khởi đầu)
  initRun(starterBookIds = null, extraSlots = 0) {
    this.activeBooks = [];
    this.discardedBooks = [];
    this.appearedBookIds.clear();
    this.progress = {};
    this.pendingEvolutions = [];
    this.pendingAwakenings = [];

    this.maxSlots = Math.min(5, Math.max(3, 3 + extraSlots));
    this.matchTimer = 0;
    this.noDamageTimer = 0;
    this.lowHealthTimer = 0;
    this.dumasVengeanceCount = 0;
    this.recentAttackers.clear();

    this.kafkaCritStacks = 0;
    this.kafkaNoHitTimer = 0;
    this.kafkaInvisTimer = 0;
    this.kafkaInvisCooldown = 0;
    this.cervantesRageTimer = 0;
    this.cervantesRageCooldown = 0;
    this.dumasShieldCooldown = 0;
    this.hugoWaveTimer = 30;
    this.consumedExtraLives = 0;

    if (starterBookIds) {
      const ids = Array.isArray(starterBookIds) ? starterBookIds : [starterBookIds];
      for (const id of ids) {
        if (id && BOOK_DEFINITIONS[id]) {
          this.addBook(id);
        }
      }
    }
  }

  // Kiểm tra còn mạng hồi sinh từ sách không (Lacan / Derrida / Marx)
  hasExtraLife() {
    const totalGranted = (this.getBonusStats().extraLife || 0);
    return totalGranted > (this.consumedExtraLives || 0);
  }

  // Tiêu hao 1 lần hồi sinh từ sách
  consumeExtraLife() {
    this.consumedExtraLives = (this.consumedExtraLives || 0) + 1;
    return 0.50; // Hồi 50% lượng máu tối đa
  }

  // Tạm dừng tiến hóa để tiếp tục sau
  pauseEvolution(sourceId) {
    const p = this.progress[sourceId];
    if (p) {
      p.paused = true;
    }
    this.pendingEvolutions = this.pendingEvolutions.filter(e => e.sourceId !== sourceId);
  }

  // Kiểm tra sách có đang tạm dừng tiến hóa không
  isPausedEvolution(sourceId) {
    const p = this.progress[sourceId];
    return !!(p && p.readyToEvolve && p.paused);
  }

  // Thêm một cuốn sách vào kho đồ
  addBook(bookId, isStarterChoice = false) {
    if (this.activeBooks.length >= this.maxSlots) return false;
    const def = BOOK_DEFINITIONS[bookId];
    if (!def) return false;

    // Kiểm tra đã có sách này chưa
    if (this.activeBooks.some(b => b.id === bookId)) return false;

    const bookInstance = {
      id: bookId,
      def: def,
      acquiredAt: this.matchTimer
    };

    this.activeBooks.push(bookInstance);
    this.appearedBookIds.add(bookId);
    this.unlockInCodex(bookId);

    // Khởi tạo tiến trình đếm cho sách mới
    this.progress[bookId] = {
      kills: 0,
      timer: 0,
      readyToEvolve: false,
      paused: false,
      targetId: null,
      failed: false
    };

    // Kiểm tra hợp thể ngay khi nhận sách mới
    this.checkSpecialEvolutions();

    return true;
  }

  // Bỏ sách (Discard) để giải phóng ô
  discardBook(bookId) {
    const idx = this.activeBooks.findIndex(b => b.id === bookId);
    if (idx !== -1) {
      this.discardedBooks.push(bookId);
      this.activeBooks.splice(idx, 1);
      delete this.progress[bookId];

      // Xóa khỏi danh sách chờ tiến hóa nếu có
      this.pendingEvolutions = this.pendingEvolutions.filter(e => e.sourceId !== bookId);

      // Kiểm tra điều kiện mở khóa Sartre: Bỏ Freud + có Heidegger + có Camus
      this.checkSpecialEvolutions();
      return true;
    }
    return false;
  }

  // Kiểm tra kho sách có thể nhặt thêm không
  canPickUpMore() {
    return this.activeBooks.length < this.maxSlots;
  }

  // Ghi nhận quái bị tiêu diệt: Quái thường = 1, Mini Boss = 5, Main Boss = 10
  onEnemyKilled(enemy, isMiniBoss = false, isMainBoss = false) {
    const killScore = isMainBoss ? 10 : (isMiniBoss ? 5 : 1);

    // Simone de Beauvoir: Diệt Tinh Anh (Elite) hoặc Boss/Mini-boss kích hoạt 4s Bất Tử và hồi 20% Max HP
    if (this.hasBook('beauvoir') && (isMiniBoss || isMainBoss || (enemy && enemy.isElite))) {
      this.beauvoirInvincibleTimer = 4.0;
      if (typeof window !== 'undefined' && window.__gameInstance && window.__gameInstance.player) {
        window.__gameInstance.player.heal(Math.round(window.__gameInstance.player.maxHealth * 0.20));
      }
    }

    // Kiểm tra Dumas: trả thù quái cắn trong 10s
    if (this.hasBook('peuchet') && this.recentAttackers.has(enemy)) {
      this.dumasVengeanceCount++;
      this.recentAttackers.delete(enemy);
      if (this.dumasVengeanceCount >= 10) {
        this.markReadyToEvolve('peuchet', 'dumas');
      }
    }

    // Cộng điểm cho từng sách đang chờ đếm quái
    for (const b of this.activeBooks) {
      const p = this.progress[b.id];
      if (!p || p.readyToEvolve || p.failed) continue;

      p.kills += killScore;

      // 1. Freud -> Jung (120 quái)
      if (b.id === 'freud' && p.kills >= 120) {
        this.markReadyToEvolve('freud', 'jung');
      }
      // 2. Plato -> Aristoteles (25 quái)
      else if (b.id === 'plato' && p.kills >= 25) {
        this.markReadyToEvolve('plato', 'aristoteles');
      }
      // 3. Aristoteles -> Descartes (50 quái)
      else if (b.id === 'aristoteles' && p.kills >= 50) {
        this.markReadyToEvolve('aristoteles', 'descartes');
      }
      // 4. Descartes -> Heidegger hoặc Kant (75 quái - tăng gấp rưỡi từ 50)
      else if (b.id === 'descartes') {
        if (p.kills >= 75 && !p.readyToEvolve) {
          this.markReadyToEvolve('descartes', 'choice_descartes');
        }
      }
      // 5. Kant -> Hegel, Feuerbach, Nietzsche (150 quái - tăng gấp rưỡi từ 100)
      else if (b.id === 'kant') {
        if (p.kills >= 150 && !p.readyToEvolve) {
          this.markReadyToEvolve('kant', 'choice_kant');
        }
      }
      // 6. Homer -> Virgil (50 quái)
      else if (b.id === 'homer' && p.kills >= 50) {
        this.markReadyToEvolve('homer', 'virgil');
      }
      // 7. Virgil -> James Joyce (100 quái trong 60s)
      else if (b.id === 'virgil') {
        if (p.timer <= 60 && p.kills >= 100) {
          this.markReadyToEvolve('virgil', 'james_joyce');
        }
      }
    }

    // Kiểm tra các nhánh hợp thể có thể hình thành
    this.checkSpecialEvolutions();
  }

  // Ghi nhận khi người chơi bị nhận sát thương
  onPlayerTakeDamage(attackerEnemy, damage, hitRealHealth = true) {
    if (damage <= 0) return;

    if (hitRealHealth) {
      this.noDamageTimer = 0; // Reset điều kiện của Shakespeare
    }

    // Đánh dấu quái tấn công trong 10s cho điều kiện Dumas
    if (attackerEnemy && this.hasBook('peuchet')) {
      this.recentAttackers.set(attackerEnemy, this.matchTimer + 10.0);
    }

    // Kafka: Bị dính đòn trừ 20% số cộng dồn crit
    if (this.hasBook('kafka') && this.kafkaCritStacks > 0) {
      this.kafkaCritStacks = Math.max(0, Math.floor(this.kafkaCritStacks * 0.8));
    }
  }

  // Đánh dấu sách đã sẵn sàng tiến hóa
  markReadyToEvolve(sourceId, targetId) {
    const p = this.progress[sourceId];
    if (!p) return;
    p.readyToEvolve = true;
    p.targetId = targetId;

    // Đẩy vào hàng đợi thông báo
    if (!this.pendingEvolutions.some(e => e.sourceId === sourceId && e.targetId === targetId)) {
      this.pendingEvolutions.push({ sourceId, targetId });
    }
  }

  // Thực hiện tiến hóa sách
  evolveBook(sourceId, targetId) {
    const idx = this.activeBooks.findIndex(b => b.id === sourceId);
    if (idx === -1) return false;

    const newDef = BOOK_DEFINITIONS[targetId];
    if (!newDef) return false;

    // Thay thế cuốn cũ bằng cuốn mới
    this.activeBooks[idx] = {
      id: targetId,
      def: newDef,
      acquiredAt: this.matchTimer
    };

    delete this.progress[sourceId];
    this.progress[targetId] = {
      kills: 0,
      timer: 0,
      readyToEvolve: false,
      paused: false,
      targetId: null,
      failed: false
    };

    this.appearedBookIds.add(targetId);
    this.unlockInCodex(targetId);
    this.pendingEvolutions = this.pendingEvolutions.filter(e => e.sourceId !== sourceId);

    // Kiểm tra hợp thể tiếp theo
    this.checkSpecialEvolutions();
    return true;
  }

  // Thực hiện hợp thể 2 hoặc 3 cuốn sách
  executeFusion(ingredientIds, targetId) {
    // Kiểm tra xem có đủ các thành phần không
    for (const id of ingredientIds) {
      if (!this.hasBook(id)) return false;
    }

    const targetDef = BOOK_DEFINITIONS[targetId];
    if (!targetDef) return false;

    // Xóa các sách thành phần
    for (const id of ingredientIds) {
      const idx = this.activeBooks.findIndex(b => b.id === id);
      if (idx !== -1) {
        this.activeBooks.splice(idx, 1);
        delete this.progress[id];
      }
    }

    // Thêm sách hợp thể tối thượng
    this.addBook(targetId);
    if (typeof window !== 'undefined' && window.__gameInstance && window.__gameInstance.achievementSystem) {
      window.__gameInstance.achievementSystem.track('mythic_fusions', 1);
    }
    this.pendingAwakenings.push({
      targetId: targetId,
      ingredientIds: ingredientIds,
      isFusion: true
    });
    return true;
  }

  // Kiểm tra các điều kiện sách đặc biệt & hợp thể
  checkSpecialEvolutions(player = null) {
    // 1. Camus: Vào trận không chọn sách + sau 1 phút (60s)
    if (this.activeBooks.length === 0 && this.matchTimer >= 60 && !this.appearedBookIds.has('camus')) {
      if (this.canPickUpMore()) {
        this.addBook('camus');
        this.pendingAwakenings.push({
          targetId: 'camus',
          ingredientIds: [],
          isFusion: false
        });
      }
    }

    // 2. Adam Smith: Khi % vàng cộng thêm >= 300%
    if (!this.appearedBookIds.has('adam_smith') && player) {
      const totalGoldMult = (player.bonusGreedMult || 1.0) * (player.metaGoldMult || 1.0);
      if (totalGoldMult >= 2.0 && this.canPickUpMore()) { // +300% tức là 4.0x
        this.addBook('adam_smith');
        this.pendingAwakenings.push({
          targetId: 'adam_smith',
          ingredientIds: [],
          isFusion: false
        });
      }
    }

    // 3. Dante: Aristoteles + Virgil
    if (this.hasBook('aristoteles') && this.hasBook('virgil') && !this.hasBook('dante')) {
      this.executeFusion(['aristoteles', 'virgil'], 'dante');
    }

    // 4. Herman Melville: Plato + Shakespeare
    if (this.hasBook('plato') && this.hasBook('shakespeare') && !this.hasBook('herman_melville')) {
      this.executeFusion(['plato', 'shakespeare'], 'herman_melville');
    }

    // 5. Dostoyevsky: Shakespeare + Kant
    if (this.hasBook('shakespeare') && this.hasBook('kant') && !this.hasBook('dostoyevsky')) {
      this.executeFusion(['shakespeare', 'kant'], 'dostoyevsky');
    }

    // 6. Sartre: Đã bỏ Freud + có Heidegger + có Camus
    if (this.discardedBooks.includes('freud') && this.hasBook('heidegger') && this.hasBook('camus') && !this.hasBook('sartre')) {
      this.executeFusion(['heidegger', 'camus'], 'sartre');
    }

    // 7. Kafka: Nietzsche + Dostoyevsky
    if (this.hasBook('nietzsche') && this.hasBook('dostoyevsky') && !this.hasBook('kafka')) {
      this.executeFusion(['nietzsche', 'dostoyevsky'], 'kafka');
    }

    // 8. Victor Hugo: Shakespeare + Dumas
    if (this.hasBook('shakespeare') && this.hasBook('dumas') && !this.hasBook('victor_hugo')) {
      this.executeFusion(['shakespeare', 'dumas'], 'victor_hugo');
    }

    // 9. Neil Postman: Camus + Mary Shelley + Jung
    if (this.hasBook('camus') && this.hasBook('mary_shelley') && this.hasBook('jung') && !this.hasBook('neil_postman')) {
      this.executeFusion(['camus', 'mary_shelley', 'jung'], 'neil_postman');
    }

    // 10. Lacan: Hegel + Saussure + Freud
    if (this.hasBook('hegel') && this.hasBook('saussure') && this.hasBook('freud') && !this.hasBook('lacan')) {
      this.executeFusion(['hegel', 'saussure', 'freud'], 'lacan');
    }

    // 11. Derrida: Heidegger + Saussure + Hegel
    if (this.hasBook('heidegger') && this.hasBook('saussure') && this.hasBook('hegel') && !this.hasBook('derrida')) {
      this.executeFusion(['heidegger', 'saussure', 'hegel'], 'derrida');
    }

    // 12. Marx: Hegel + Feuerbach + Adam Smith
    if (this.hasBook('hegel') && this.hasBook('feuerbach') && this.hasBook('adam_smith') && !this.hasBook('marx')) {
      this.executeFusion(['hegel', 'feuerbach', 'adam_smith'], 'marx');
    }

    // 13. Judith Butler: Lacan + Foucault (Chỉ mất Foucault, GIỮ LẠI Lacan!)
    if (this.hasBook('lacan') && this.hasBook('foucault') && !this.hasBook('butler')) {
      const fIdx = this.activeBooks.findIndex(b => b.id === 'foucault');
      if (fIdx !== -1) {
        this.activeBooks.splice(fIdx, 1);
        delete this.progress['foucault'];
      }
      this.addBook('butler');
      this.pendingAwakenings.push({
        targetId: 'butler',
        ingredientIds: ['foucault'],
        isFusion: true
      });
    }

    // 14. Simone de Beauvoir: Hegel + Sartre
    if (this.hasBook('hegel') && this.hasBook('sartre') && !this.hasBook('beauvoir')) {
      this.executeFusion(['hegel', 'sartre'], 'beauvoir');
    }

    // 15. Gabriel García Márquez: Kafka + Kích hoạt máu dưới 20% đủ 2 lần
    if (this.hasBook('kafka') && !this.hasBook('marquez') && this.kafkaLowHpTriggers >= 2) {
      const kIdx = this.activeBooks.findIndex(b => b.id === 'kafka');
      if (kIdx !== -1) {
        this.activeBooks.splice(kIdx, 1);
        delete this.progress['kafka'];
      }
      this.addBook('marquez');
      this.pendingAwakenings.push({
        targetId: 'marquez',
        ingredientIds: ['kafka'],
        isFusion: true
      });
    }

    // 16. Kierkegaard: Bỏ sách Hegel
    if (this.discardedBooks.includes('hegel') && !this.hasBook('kierkegaard') && !this.appearedBookIds.has('kierkegaard') && this.canPickUpMore()) {
      this.addBook('kierkegaard');
      this.pendingAwakenings.push({
        targetId: 'kierkegaard',
        ingredientIds: [],
        isFusion: false
      });
    }

    // 17. Tolstoy: Làm chậm 100 quái
    if (this.slowedEnemiesCount >= 100 && !this.hasBook('tolstoy') && !this.appearedBookIds.has('tolstoy') && this.canPickUpMore()) {
      this.addBook('tolstoy');
      this.pendingAwakenings.push({
        targetId: 'tolstoy',
        ingredientIds: [],
        isFusion: false
      });
    }

    // 18. Nguyễn Du: 60s HP > 50% & 60s HP < 50%
    if (this.highHpTimer >= 60 && this.lowHpTimer >= 60 && !this.hasBook('nguyen_du') && !this.appearedBookIds.has('nguyen_du') && this.canPickUpMore()) {
      this.addBook('nguyen_du');
      this.pendingAwakenings.push({
        targetId: 'nguyen_du',
        ingredientIds: [],
        isFusion: false
      });
    }
  }

  // Cập nhật từng frame trong trận
  update(delta, player) {
    this.matchTimer += delta;

    // Dọn dẹp danh sách quái báo thù quá 10s
    for (const [enemy, expireTime] of this.recentAttackers.entries()) {
      if (this.matchTimer > expireTime || enemy.isDead) {
        this.recentAttackers.delete(enemy);
      }
    }

    // 1. Theo dõi Shakespeare: Không nhận dmg vào máu thật trong 30s
    if (this.hasBook('ovidius')) {
      this.noDamageTimer += delta;
      if (this.noDamageTimer >= 30.0) {
        this.markReadyToEvolve('ovidius', 'shakespeare');
      }
    }

    // 2. Theo dõi Cervantes: Máu < 20% tích lũy 120s
    if (this.hasBook('garci_montalvo') && player) {
      if (player.health < player.maxHealth * 0.20 && !player.isDead) {
        this.lowHealthTimer += delta;
        if (this.lowHealthTimer >= 35.0) {
          this.markReadyToEvolve('garci_montalvo', 'cervantes');
        }
      }
    }

    // 3. Theo dõi John Milton: 120s sau khi sở hữu
    if (this.hasBook('john_milton')) {
      const p = this.progress['john_milton'];
      if (p) {
        p.timer += delta;
        if (p.timer >= 120.0) {
          this.markReadyToEvolve('john_milton', 'mary_shelley');
        }
      }
    }

    // 4. Theo dõi Virgil: Giới hạn 60s để giết 100 quái
    if (this.hasBook('virgil')) {
      const p = this.progress['virgil'];
      if (p && !p.readyToEvolve && !p.failed) {
        p.timer += delta;
        if (p.timer > 60.0 && p.kills < 100) {
          p.failed = true; // Quá 60s không thể lên Joyce
        }
      }
    }

    // 5. Theo dõi Foucault (ĐÃ BALANCE): Đạt 40% Cooldown HOẶC 25% Cooldown HOẶC có vũ khí Cấp 5+
    if (this.hasBook('saussure') && player) {
      const curCDR = (player.cooldownReduction || 0) + (this.getBonusStats().cooldownReduction || 0);
      const hasHighTierWeapon = (player.weaponManager && player.weaponManager.equippedWeapons && player.weaponManager.equippedWeapons.some(w => w.level >= 5));
      if (curCDR >= 0.40 || curCDR >= 0.25 || hasHighTierWeapon) {
        this.markReadyToEvolve('saussure', 'foucault');
      }
    }

    // 5.1. Theo dõi Butler (Performativity Flux: luân chuyển 5s Hóa Giải / 5s Bộc Phát)
    if (this.hasBook('butler')) {
      this.butlerFluxTimer += delta;
      if (this.butlerFluxTimer >= 10.0) {
        this.butlerFluxTimer -= 10.0;
      }
      this.butlerFluxState = (this.butlerFluxTimer < 5.0) ? 'absorption' : 'burst';
    }

    // 5.2. Theo dõi Beauvoir (Invincible Timer)
    if (this.beauvoirInvincibleTimer > 0) {
      this.beauvoirInvincibleTimer -= delta;
    }

    // 5.3. Theo dõi Márquez (Cooldown Hồi sinh Macondo & đếm máu < 20%)
    if (this.marquezCheatDeathCooldown > 0) {
      this.marquezCheatDeathCooldown -= delta;
    }
    if (this.marquezCheatDeathActive > 0) {
      this.marquezCheatDeathActive -= delta;
    }
    if (player && !player.isDead) {
      const isUnder20 = (player.health < player.maxHealth * 0.20);
      if (isUnder20 && !this.isInLowHp) {
        this.isInLowHp = true;
        if (this.hasBook('kafka')) {
          this.kafkaLowHpTriggers = (this.kafkaLowHpTriggers || 0) + 1;
        }
      } else if (!isUnder20 && this.isInLowHp) {
        this.isInLowHp = false;
      }

      // Theo dõi Nguyễn Du (60s HP > 50% & 60s HP < 50%)
      if (player.health >= player.maxHealth * 0.50) {
        this.highHpTimer += delta;
      } else {
        this.lowHpTimer += delta;
      }
    }

    // 5.35. Cơn Khát Máu Bram Stoker (Dracula): Không đánh trúng quái trong 4s mất 2% HP/s (dừng ở 25% máu)
    if (this.hasBook('bram_stoker') && player && !player.isDead) {
      this.bramNoHitTimer = (this.bramNoHitTimer || 0) + delta;
      if (this.bramNoHitTimer >= 4.0 && player.health > player.maxHealth * 0.25) {
        const drain = player.maxHealth * 0.02 * delta;
        player.health = Math.max(player.maxHealth * 0.25, player.health - drain);
      }
    }

    // 5.4. Theo dõi Thomas Aquinas (Mỗi giây không nhận dmg tăng +2% Vàng)
    if (this.hasBook('thomas_aquinas') && this.noDamageTimer >= 1.0) {
      this.thomasGoldStacks = (this.thomasGoldStacks || 0) + 0.02;
    }

    // 6. Nội tại Kafka: Tích lũy +1% Crit Chance mỗi giây khi không bị đánh
    if (this.hasBook('kafka')) {
      this.kafkaNoHitTimer += delta;
      if (this.kafkaNoHitTimer >= 1.0) {
        this.kafkaNoHitTimer -= 1.0;
        this.kafkaCritStacks += 0.01; // +1% crit mỗi giây vô tận
      }
      if (this.kafkaInvisCooldown > 0) this.kafkaInvisCooldown -= delta;
      if (this.kafkaInvisTimer > 0) {
        this.kafkaInvisTimer -= delta;
        if (player) player.invincibilityTimer = Math.max(player.invincibilityTimer || 0, 0.2);
      } else if (player && player.health < player.maxHealth * 0.20 && this.kafkaInvisCooldown <= 0) {
        // Kích hoạt tàng hình miễn nhiễm 10s
        this.kafkaInvisTimer = 10.0;
        this.kafkaInvisCooldown = 150.0;
      }
    }

    // 7. Nội tại Cervantes Cuồng Nộ: Khi máu < 35%
    if (this.hasBook('cervantes') && player) {
      if (this.cervantesRageCooldown > 0) this.cervantesRageCooldown -= delta;
      if (this.cervantesRageTimer > 0) {
        this.cervantesRageTimer -= delta;
      } else if (player.health < player.maxHealth * 0.35 && this.cervantesRageCooldown <= 0) {
        this.cervantesRageTimer = 20.0;
        this.cervantesRageCooldown = 120.0;
      }
    }

    // 8. Nội tại Dumas Máu Ảo: Khi máu < 20%
    if (this.hasBook('dumas') && player) {
      if (this.dumasShieldCooldown > 0) this.dumasShieldCooldown -= delta;
      if (player.health < player.maxHealth * 0.20 && this.dumasShieldCooldown <= 0) {
        player.addShield(Math.round(player.maxHealth * 0.30));
        this.dumasShieldCooldown = 200.0;
      }
    }

    // 9. Nội tại Victor Hugo: Sóng chấn động slow 30% mỗi 30s
    if (this.hasBook('victor_hugo')) {
      this.hugoWaveTimer -= delta;
      if (this.hugoWaveTimer <= 0) {
        this.hugoWaveTimer = 30.0;
        return { triggerHugoWave: true };
      }
    }

    // Kiểm tra các hợp thể và điều kiện Camus/Adam Smith
    this.checkSpecialEvolutions(player);
    return null;
  }

  // Kiểm tra người chơi có đang cầm sách nào đó không
  hasBook(bookId) {
    return this.activeBooks.some(b => b.id === bookId);
  }

  // Tính toán toàn bộ chỉ số buff từ các sách đang sở hữu
  getBonusStats() {
    const stats = {
      dmgMult: 1.0,
      healthMult: 1.0,
      speedMult: 1.0,
      areaMult: 1.0,
      expMult: 1.0,
      goldMult: 1.0,
      goldMultiplierFinal: 1.0,
      armorMult: 1.0,
      armorPenPercent: 0,
      critChance: 0,
      critDamage: 0,
      cooldownReduction: 0,
      damageReduction: 0,
      accuracy: 0,
      dodge: 0,
      reflectPercent: 0,
      lifesteal: 0,
      trueDmgRatio: 0,
      extraLife: 0,
      scorePerKillMult: 0,
      dotDurationMult: 0,
      dotDmgMult: 0,
      dotCanCrit: false,
      burnChance: 0
    };

    for (const b of this.activeBooks) {
      const buffs = b.def.buffs;
      if (!buffs) continue;

      if (buffs.dmgMult) stats.dmgMult += buffs.dmgMult;
      if (buffs.healthMult) stats.healthMult += buffs.healthMult;
      if (buffs.speedMult) stats.speedMult += buffs.speedMult;
      if (buffs.areaMult) stats.areaMult += buffs.areaMult;
      if (buffs.expMult) stats.expMult += buffs.expMult;
      if (buffs.goldMult) stats.goldMult += buffs.goldMult;
      if (buffs.goldMultiplierFinal) stats.goldMultiplierFinal *= buffs.goldMultiplierFinal;
      if (buffs.armorMult) stats.armorMult += buffs.armorMult;
      if (buffs.armorPenPercent) stats.armorPenPercent += buffs.armorPenPercent;

      // Crit là cộng dồn trực tiếp
      if (buffs.critChance) stats.critChance += buffs.critChance;
      if (buffs.critDamage) stats.critDamage += buffs.critDamage;

      if (buffs.cooldownReduction) stats.cooldownReduction += buffs.cooldownReduction;
      if (buffs.damageReduction) stats.damageReduction += buffs.damageReduction;
      if (buffs.accuracy) stats.accuracy += buffs.accuracy;
      if (buffs.dodge) stats.dodge += buffs.dodge;
      if (buffs.reflectPercent) stats.reflectPercent += buffs.reflectPercent;
      if (buffs.lifesteal) stats.lifesteal += buffs.lifesteal;
      if (buffs.trueDmgRatio) stats.trueDmgRatio = Math.max(stats.trueDmgRatio, buffs.trueDmgRatio);
      if (buffs.extraLife) stats.extraLife += buffs.extraLife;
      if (buffs.scorePerKillMult) stats.scorePerKillMult += buffs.scorePerKillMult;

      if (buffs.dotDurationMult) stats.dotDurationMult += buffs.dotDurationMult;
      if (buffs.dotDmgMult) stats.dotDmgMult += buffs.dotDmgMult;
      if (buffs.dotCanCrit) stats.dotCanCrit = true;
      if (buffs.burnChance) stats.burnChance += buffs.burnChance;
    }

    // Cộng thêm stack vô tận từ Kafka nếu có
    if (this.hasBook('kafka') && this.kafkaCritStacks > 0) {
      stats.critChance += this.kafkaCritStacks;
    }

    // Cộng thêm Cuồng nộ Cervantes nếu đang kích hoạt
    if (this.cervantesRageTimer > 0) {
      stats.critChance += 0.40;
      stats.critDamage += 0.40;
      stats.lifesteal += 0.05;
    }

    // Cộng hưởng Butler & Lacan (+20% toàn bộ chỉ số của Lacan)
    if (this.hasBook('butler') && this.hasBook('lacan')) {
      stats.dmgMult += 0.10;
      stats.healthMult += 0.10;
      stats.critChance += 0.10;
      stats.critDamage += 0.20;
      stats.cooldownReduction += 0.04;
    }

    // Spinoza: Nhất Thể Bản Thể (Mỗi 10 Giáp +8% Sát thương, Mỗi 100 HP +2% Sát thương & +1% Tốc độ)
    if (this.hasBook('spinoza')) {
      stats.spinozaSubstantia = true;
      stats.armorFlat = (stats.armorFlat || 0) + 30;
      const curArmor = (player ? (player.armor || 0) : 0) + (stats.armorFlat || 0);
      const armorDmgBonus = Math.floor(curArmor / 10) * 0.08;
      stats.dmgMult += armorDmgBonus;

      const curHp = player ? (player.maxHealth || 1000) : 1000;
      const hpDmgBonus = Math.floor(curHp / 100) * 0.02;
      const hpSpeedBonus = Math.floor(curHp / 100) * 0.01;
      stats.dmgMult += hpDmgBonus;
      stats.speedMult += hpSpeedBonus;
    }

    // Karl Marx: Tuyên Ngôn Cách Mạng (Mỗi 100 Vàng kiếm được tăng vĩnh viễn +1% Sát thương)
    if (this.hasBook('marx')) {
      stats.marxRevolution = true;
      const goldEarned = (typeof window !== 'undefined' && window.__gameInstance && window.__gameInstance.goldEarned) ? window.__gameInstance.goldEarned : 0;
      stats.dmgMult += Math.floor(goldEarned / 100) * 0.01;
    }

    // Jacques Lacan: Kích hoạt Bóng Ma Hộ Vệ (Lacan Echo Stand)
    if (this.hasBook('lacan')) {
      stats.hasLacanPhantomStand = true;
    }

    // Jacques Derrida: Kích hoạt Giải Cấu Trúc (Deconstruction)
    if (this.hasBook('derrida')) {
      stats.derridaDeconstruction = true;
    }

    // Butler Phase Bộc Phát (+60% True Damage)
    if (this.hasBook('butler')) {
      stats.hasButlerAbsorption = (this.butlerFluxState === 'absorption');
      if (this.butlerFluxState === 'burst') {
        stats.trueDmgRatio = Math.max(stats.trueDmgRatio, 0.60);
      }
    }

    // Thomas Aquinas passive greed stack
    if (this.hasBook('thomas_aquinas') && this.thomasGoldStacks > 0) {
      stats.goldMult += this.thomasGoldStacks;
    }

    // Giới hạn cân bằng trần Cooldown Reduction (Tối đa 75%)
    stats.cooldownReduction = Math.min(0.70, stats.cooldownReduction);

    // Giới hạn cân bằng trần Giảm Sát Thương % (Tối đa 75%)
    stats.damageReduction = Math.min(0.75, stats.damageReduction);

    return stats;
  }

  // =========================================================================
  // VẼ BÌA SÁCH TRÊN CANVAS (CHUẨN TỐI GIẢN: GIẤY TRẮNG NGÀ, KHUNG VUÔNG, TÊN GỐC)
  // =========================================================================
  renderBookCard(ctx, bookId, x, y, w, h, isReadyToEvolve = false) {
    const def = BOOK_DEFINITIONS[bookId];
    if (!def) return;

    ctx.save();

    // 1. Đổ bóng thẻ sách
    ctx.shadowColor = isReadyToEvolve ? '#f59e0b' : 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = isReadyToEvolve ? 18 : 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 6;

    // 2. Nền bìa giấy ngà phẳng mịn, sạch sẽ, không đốm (#fcfbf7)
    ctx.fillStyle = '#fcfbf7';
    ctx.fillRect(x, y, w, h);

    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // 3. Viền mép ngoài thẻ sách
    ctx.strokeStyle = isReadyToEvolve ? '#fbbf24' : '#d4cbb3';
    ctx.lineWidth = isReadyToEvolve ? 2.5 : 1.2;
    ctx.strokeRect(x, y, w, h);

    // Gáy sách cổ điển thanh mảnh bên trái khi ở khổ dọc (Book Spine 3D subtle accent)
    if (h > w) {
      ctx.fillStyle = isReadyToEvolve ? 'rgba(245, 158, 11, 0.2)' : 'rgba(0, 0, 0, 0.06)';
      ctx.fillRect(x, y, 4, h);
    }

    // 4. Khung vuông thanh mảnh bao quanh bên trong bìa sách
    const innerMargin = Math.max(8, Math.round(w * 0.065));
    const innerX = x + innerMargin;
    const innerY = y + innerMargin;
    const innerW = w - innerMargin * 2;
    const innerH = h - innerMargin * 2;

    ctx.strokeStyle = '#262320'; // Viền đen thanh mảnh
    ctx.lineWidth = 1.0;
    ctx.strokeRect(innerX, innerY, innerW, innerH);

    // 5. In Tên Tác Phẩm nguyên bản và Năm xuất bản bên trong khung
    ctx.fillStyle = '#1c1917';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Tự động scale font theo kích thước thẻ
    const scaleFactor = w / 144;
    const titleLength = def.work.length;
    let baseFontSize = 16;
    if (titleLength > 30) baseFontSize = 12;
    else if (titleLength > 20) baseFontSize = 13.5;
    else if (titleLength > 12) baseFontSize = 15;
    else baseFontSize = 17;

    const fontSize = Math.max(12, Math.round(baseFontSize * scaleFactor));
    ctx.font = `bold ${fontSize}px "Playfair Display", Georgia, "Times New Roman", serif`;

    // Wrap dòng cho tên tác phẩm nếu dài
    const words = def.work.split(' ');
    const lines = [];
    let currentLine = '';

    for (const wWord of words) {
      const testLine = currentLine ? `${currentLine} ${wWord}` : wWord;
      if (ctx.measureText(testLine).width > innerW - 14) {
        if (currentLine) lines.push(currentLine);
        currentLine = wWord;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    const lineHeight = fontSize * 1.35;
    const totalTextH = lines.length * lineHeight;
    const bottomSpace = def.year ? Math.round(28 * scaleFactor) : 0;
    let startTextY = innerY + (innerH - bottomSpace) / 2 - totalTextH / 2 + lineHeight / 2;

    for (const line of lines) {
      ctx.fillText(line, innerX + innerW / 2, startTextY);
      startTextY += lineHeight;
    }

    // 6. In Năm ra mắt tác phẩm ở đáy bìa (nếu có)
    if (def.year) {
      ctx.fillStyle = '#78716c';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      const yearFontSize = Math.max(11, Math.round(12.5 * scaleFactor));
      ctx.font = `bold ${yearFontSize}px "Nunito", "Playfair Display", monospace`;
      ctx.fillText(def.year, innerX + innerW / 2, innerY + innerH - Math.max(6, Math.round(8 * scaleFactor)));
    }

    ctx.restore();
  }

  // =========================================================================
  // QUẢN LÝ THƯ VIỆN CODEX (LƯU TRỮ VĨNH VIỄN)
  // =========================================================================
  unlockInCodex(bookId) {
    if (!this.unlockedCodex.has(bookId)) {
      this.unlockedCodex.add(bookId);
      this.saveCodex();
      if (typeof window !== 'undefined' && window.__gameInstance && window.__gameInstance.achievementSystem) {
        window.__gameInstance.achievementSystem.track('unlocked_books', this.unlockedCodex.size, true);
      }
    }
  }

  isUnlockedInCodex(bookId) {
    return this.unlockedCodex.has(bookId);
  }

  saveCodex() {
    try {
      localStorage.setItem(BOOK_CODEX_SAVE_KEY, JSON.stringify(Array.from(this.unlockedCodex)));
    } catch (e) {
      console.warn('Không thể lưu Thư viện Codex:', e);
    }
  }

  loadCodex() {
    try {
      const raw = localStorage.getItem(BOOK_CODEX_SAVE_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        this.unlockedCodex = new Set(arr);
      }
    } catch (e) {
      console.warn('Không thể tải Thư viện Codex:', e);
      this.unlockedCodex = new Set();
    }
  }
}
