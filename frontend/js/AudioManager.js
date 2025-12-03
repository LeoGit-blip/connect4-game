/**
 * AudioManager - Handles all game audio including sound effects and volume control
 * Uses Web Audio API to generate sounds programmatically
 */
class AudioManager {
  constructor() {
    this.audioContext = null;
    this.masterGain = null;
    this.muted = false;
    this.volume = 0.7;

    // Initialize on first user interaction (browser autoplay policy)
    this.initialized = false;

    // Load settings from localStorage
    this.loadSettings();
  }

  /**
   * Initialize the audio context (must be called after user interaction)
   */
  init() {
    if (this.initialized) return;

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = this.muted ? 0 : this.volume;
      this.initialized = true;
      console.log('AudioManager initialized');
    } catch (error) {
      console.error('Failed to initialize AudioContext:', error);
    }
  }

  /**
   * Play piece drop sound - organic "wood block" / plastic click
   */
  playPieceDrop() {
    if (!this.initialized) this.init();
    if (!this.audioContext || this.muted) return;

    const now = this.audioContext.currentTime;

    const osc = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    osc.connect(gainNode);
    gainNode.connect(this.masterGain);

    // "Wood block" effect: Triangle wave with quick pitch drop
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);

    // Percussive envelope
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.4, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    osc.type = 'triangle'; // Softer than sine for percussive sounds
    osc.start(now);
    osc.stop(now + 0.1);
  }

  /**
   * Play win celebration sound - soft bell-like major chord
   */
  playWin() {
    if (!this.initialized) this.init();
    if (!this.audioContext || this.muted) return;

    const now = this.audioContext.currentTime;
    // C Major 7 chord (C4, E4, G4, B4) for a dreamy/happy sound
    const notes = [261.63, 329.63, 392.00, 493.88];

    notes.forEach((freq, i) => {
      const osc = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      osc.connect(gainNode);
      gainNode.connect(this.masterGain);

      osc.frequency.value = freq;
      osc.type = 'sine'; // Sine is best for bell/chime sounds

      // Staggered entry for "strum" effect
      const startTime = now + (i * 0.05);

      // Bell envelope: Fast attack, long decay
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.25, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 1.5);

      osc.start(startTime);
      osc.stop(startTime + 1.5);
    });
  }

  /**
   * Play draw sound - soft descending chord
   */
  playDraw() {
    if (!this.initialized) this.init();
    if (!this.audioContext || this.muted) return;

    const now = this.audioContext.currentTime;
    const notes = [392.00, 329.63, 261.63]; // G4, E4, C4 (descending C major)

    notes.forEach((freq, i) => {
      const osc = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      osc.connect(gainNode);
      gainNode.connect(this.masterGain);

      osc.frequency.value = freq;
      osc.type = 'sine';

      const startTime = now + (i * 0.15);

      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);

      osc.start(startTime);
      osc.stop(startTime + 0.5);
    });
  }

  /**
   * Play button click sound - subtle "tap"
   */
  playButtonClick() {
    if (!this.initialized) this.init();
    if (!this.audioContext || this.muted) return;

    const now = this.audioContext.currentTime;

    const osc = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    osc.connect(gainNode);
    gainNode.connect(this.masterGain);

    // High frequency sine burst for a clean "tick"
    osc.frequency.value = 2000;
    osc.type = 'sine';

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.15, now + 0.005);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  /**
   * Play button hover sound - subtle beep
   */
  playButtonHover() {
    if (!this.initialized) this.init();
    if (!this.audioContext || this.muted) return;

    const now = this.audioContext.currentTime;

    const osc = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    osc.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc.frequency.value = 600;
    osc.type = 'sine';

    gainNode.gain.setValueAtTime(0.05, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  /**
   * Play AI thinking sound - ambient hum
   */
  playAIThinking() {
    if (!this.initialized) this.init();
    if (!this.audioContext || this.muted) return;

    const now = this.audioContext.currentTime;

    const osc = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    osc.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc.frequency.value = 120;
    osc.type = 'sine';

    gainNode.gain.setValueAtTime(0.03, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    osc.start(now);
    osc.stop(now + 0.5);
  }

  /**
   * Set master volume (0.0 to 1.0)
   */
  setVolume(level) {
    this.volume = Math.max(0, Math.min(1, level));
    if (this.masterGain && !this.muted) {
      this.masterGain.gain.value = this.volume;
    }
    this.saveSettings();
  }

  /**
   * Toggle mute on/off
   */
  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : this.volume;
    }
    this.saveSettings();
    return this.muted;
  }

  /**
   * Check if audio is muted
   */
  isMuted() {
    return this.muted;
  }

  /**
   * Get current volume level
   */
  getVolume() {
    return this.volume;
  }

  /**
   * Save settings to localStorage
   */
  saveSettings() {
    try {
      localStorage.setItem('connect4_audio_muted', this.muted);
      localStorage.setItem('connect4_audio_volume', this.volume);
    } catch (error) {
      console.warn('Failed to save audio settings:', error);
    }
  }

  /**
   * Load settings from localStorage
   */
  loadSettings() {
    try {
      const savedMuted = localStorage.getItem('connect4_audio_muted');
      const savedVolume = localStorage.getItem('connect4_audio_volume');

      if (savedMuted !== null) {
        this.muted = savedMuted === 'true';
      }

      if (savedVolume !== null) {
        this.volume = parseFloat(savedVolume);
      }
    } catch (error) {
      console.warn('Failed to load audio settings:', error);
    }
  }
}

// Create global audio manager instance
window.audioManager = new AudioManager();
