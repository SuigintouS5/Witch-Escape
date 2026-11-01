// =========================================================================
// HỆ THỐNG ÂM THANH & NHẠC NỀN (AUDIO MANAGER)
// - Màn hình chính (Main Menu): Phát ngẫu nhiên 3 bài BGM trong folder Piano/bgm
// - Vào trận: Phát BADDY BADDY
// - Main Boss xuất hiện: Đổi sang 神の名を (God's Blood)
// - Boss bị hạ: Chuyển lại về BADDY BADDY
// - Hỗ trợ Modal Cài Đặt Âm Lượng (Settings), Mute, lưu LocalStorage
// =========================================================================

export const MENU_BGM_TRACKS = [
  {
    path: 'Piano/bgm/魔法少女ノ魔女裁判 BGM04「DArime」 - 魔法少女ノ魔女裁判.mp3',
    title: 'DArime (BGM04)'
  },
  {
    path: 'Piano/bgm/魔法少女ノ魔女裁判 BGM10「ボクとワタシの」 - 魔法少女ノ魔女裁判.mp3',
    title: 'ボクとワタシの (BGM10)'
  },
  {
    path: 'Piano/bgm/魔法少女ノ魔女裁判 BGM25「AccUhEarts-発-」 - 魔法少女ノ魔女裁判.mp3',
    title: 'AccUhEarts-発- (BGM25)'
  }
];

export class AudioManager {
  constructor() {
    this.normalTrackPath = 'Piano/BADDY BADDY - Ave Mujica - Piano Arrangement - J.O.R.J. - J Music.mp3';
    this.bossTrackPath = "Piano/神の名を (God's Blood) - Ave Mujica - Piano Arrangement - J.O.R.J. - J Music.mp3";

    this.normalAudio = null;
    this.bossAudio = null;
    this.menuAudio = null;
    this.currentMenuTrackIndex = -1;

    this.currentTrack = null; // 'menu' | 'normal' | 'boss' | null
    this.volume = 0.5; // 0.0 -> 1.0 (Mặc định 50%)
    this.isMuted = false;
    this.hasUserInteracted = false;

    this.loadSettings();
    this.initAudioElements();
  }

  initAudioElements() {
    try {
      this.normalAudio = new Audio(this.normalTrackPath);
      this.normalAudio.loop = true;
      this.normalAudio.preload = 'auto';

      this.bossAudio = new Audio(this.bossTrackPath);
      this.bossAudio.loop = true;
      this.bossAudio.preload = 'auto';

      this.menuAudio = new Audio();
      this.menuAudio.preload = 'auto';
      this.menuAudio.onended = () => {
        this.playNextMenuTrack();
      };

      this.applyVolume();
    } catch (e) {
      console.warn('Không thể khởi tạo Audio Elements:', e);
    }
  }

  // Mở khóa âm thanh khi người chơi thao tác lần đầu (Tuân thủ Autoplay Policy của trình duyệt)
  unlockAudio() {
    if (this.hasUserInteracted) return;
    this.hasUserInteracted = true;

    if (this.currentTrack === 'menu' && this.menuAudio && this.menuAudio.paused) {
      this.menuAudio.play().catch(() => {});
    } else if (this.currentTrack === 'normal' && this.normalAudio && this.normalAudio.paused) {
      this.normalAudio.play().catch(() => {});
    } else if (this.currentTrack === 'boss' && this.bossAudio && this.bossAudio.paused) {
      this.bossAudio.play().catch(() => {});
    }
  }

  applyVolume() {
    const finalVol = this.isMuted ? 0 : this.volume;
    if (this.normalAudio) {
      this.normalAudio.volume = finalVol;
    }
    if (this.bossAudio) {
      this.bossAudio.volume = finalVol;
    }
    if (this.menuAudio) {
      this.menuAudio.volume = finalVol;
    }
  }

  // Phát ngẫu nhiên nhạc nền Main Menu từ thư mục Piano/bgm
  playMenuMusic() {
    // Nếu đang phát nhạc menu rồi thì không ngắt
    if (this.currentTrack === 'menu' && this.menuAudio && !this.menuAudio.paused) {
      return;
    }

    this.currentTrack = 'menu';

    // Dừng nhạc in-game nếu có
    if (this.normalAudio && !this.normalAudio.paused) {
      this.normalAudio.pause();
      this.normalAudio.currentTime = 0;
    }
    if (this.bossAudio && !this.bossAudio.paused) {
      this.bossAudio.pause();
      this.bossAudio.currentTime = 0;
    }

    if (this.menuAudio) {
      // Nếu chưa chọn bài nào thì chọn ngẫu nhiên
      if (this.currentMenuTrackIndex < 0 || !this.menuAudio.src) {
        this.currentMenuTrackIndex = Math.floor(Math.random() * MENU_BGM_TRACKS.length);
        this.menuAudio.src = MENU_BGM_TRACKS[this.currentMenuTrackIndex].path;
      }
      this.applyVolume();
      this.menuAudio.play().catch(e => {
        // Chờ user click đầu tiên nếu trình duyệt chặn autoplay
      });
    }
  }

  // Chuyển ngẫu nhiên sang bài tiếp theo trong playlist Menu
  playNextMenuTrack() {
    if (MENU_BGM_TRACKS.length === 0 || !this.menuAudio) return;

    let nextIdx = Math.floor(Math.random() * MENU_BGM_TRACKS.length);
    if (MENU_BGM_TRACKS.length > 1 && nextIdx === this.currentMenuTrackIndex) {
      nextIdx = (nextIdx + 1) % MENU_BGM_TRACKS.length;
    }
    this.currentMenuTrackIndex = nextIdx;
    this.menuAudio.src = MENU_BGM_TRACKS[nextIdx].path;
    this.applyVolume();
    this.menuAudio.play().catch(() => {});
  }

  // Phát bài chạy nền thường khi chiến đấu (BADDY BADDY)
  playNormal() {
    this.currentTrack = 'normal';

    // Dừng nhạc menu
    if (this.menuAudio && !this.menuAudio.paused) {
      this.menuAudio.pause();
    }

    // Dừng nhạc boss nếu đang phát
    if (this.bossAudio && !this.bossAudio.paused) {
      this.bossAudio.pause();
      this.bossAudio.currentTime = 0;
    }

    if (this.normalAudio) {
      this.applyVolume();
      if (this.normalAudio.paused) {
        this.normalAudio.play().catch(e => {
          // Trình duyệt có thể chặn autoplay cho đến khi người dùng click
        });
      }
    }
  }

  // Chuyển sang nhạc Boss (神の名を - God's Blood)
  playBoss() {
    this.currentTrack = 'boss';

    // Dừng nhạc menu
    if (this.menuAudio && !this.menuAudio.paused) {
      this.menuAudio.pause();
    }

    // Dừng nhạc thường
    if (this.normalAudio && !this.normalAudio.paused) {
      this.normalAudio.pause();
    }

    if (this.bossAudio) {
      this.applyVolume();
      this.bossAudio.currentTime = 0;
      this.bossAudio.play().catch(e => {});
    }
  }

  pauseAll() {
    if (this.menuAudio) this.menuAudio.pause();
    if (this.normalAudio) this.normalAudio.pause();
    if (this.bossAudio) this.bossAudio.pause();
  }

  resumeCurrent() {
    if (this.currentTrack === 'menu') {
      if (this.menuAudio && this.menuAudio.paused) {
        this.applyVolume();
        this.menuAudio.play().catch(() => {});
      }
    } else if (this.currentTrack === 'boss') {
      if (this.bossAudio && this.bossAudio.paused) {
        this.applyVolume();
        this.bossAudio.play().catch(() => {});
      }
    } else if (this.currentTrack === 'normal') {
      if (this.normalAudio && this.normalAudio.paused) {
        this.applyVolume();
        this.normalAudio.play().catch(() => {});
      }
    }
  }

  stopAll() {
    if (this.menuAudio) {
      this.menuAudio.pause();
      this.menuAudio.currentTime = 0;
    }
    if (this.normalAudio) {
      this.normalAudio.pause();
      this.normalAudio.currentTime = 0;
    }
    if (this.bossAudio) {
      this.bossAudio.pause();
      this.bossAudio.currentTime = 0;
    }
    this.currentTrack = null;
  }

  setVolume(newVol) {
    this.volume = Math.max(0, Math.min(1.0, Math.round(newVol * 100) / 100));
    if (this.isMuted && this.volume > 0) {
      this.isMuted = false;
    }
    this.applyVolume();
    this.saveSettings();
  }

  changeVolume(delta) {
    this.setVolume(this.volume + delta);
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    this.applyVolume();
    this.saveSettings();
  }

  saveSettings() {
    try {
      localStorage.setItem('vampire_survival_audio_v1', JSON.stringify({
        volume: this.volume,
        isMuted: this.isMuted
      }));
    } catch (e) {
      console.warn('Không thể lưu cài đặt âm thanh:', e);
    }
  }

  loadSettings() {
    try {
      const raw = localStorage.getItem('vampire_survival_audio_v1');
      if (raw) {
        const data = JSON.parse(raw);
        if (typeof data.volume === 'number') {
          this.volume = Math.max(0, Math.min(1.0, data.volume));
        }
        if (typeof data.isMuted === 'boolean') {
          this.isMuted = data.isMuted;
        }
      }
    } catch (e) {
      console.warn('Không thể tải cài đặt âm thanh:', e);
    }
  }

  getCurrentTrackTitle() {
    if (this.currentTrack === 'menu') {
      if (this.currentMenuTrackIndex >= 0 && this.currentMenuTrackIndex < MENU_BGM_TRACKS.length) {
        return `${MENU_BGM_TRACKS[this.currentMenuTrackIndex].title} [Menu BGM]`;
      }
      return 'Menu BGM (Ngẫu nhiên)';
    }
    if (this.currentTrack === 'boss') {
      return "神の名を (God's Blood) - Ave Mujica [Boss Theme]";
    }
    if (this.currentTrack === 'normal') {
      return "BADDY BADDY - Ave Mujica [Nhạc Nền]";
    }
    return "Chưa phát";
  }
}
