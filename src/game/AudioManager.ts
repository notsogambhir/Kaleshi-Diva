export class AudioManager {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private masterGain: GainNode | null = null;

  public isMusicPlaying = false;
  private schedulerTimer: number | null = null;
  private nextNoteTime = 0;
  private noteIndex = 0;
  private currentBiome = "park";

  // Pentatonic melodies per biome
  private readonly biomeMelodies: Record<string, number[]> = {
    park: [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 440.0, 392.0, 329.63, 293.66],
    lake: [329.63, 392.0, 440.0, 493.88, 587.33, 659.25, 587.33, 493.88, 440.0, 392.0],
    sunset: [220.0, 261.63, 293.66, 349.23, 392.0, 440.0, 392.0, 349.23, 293.66, 261.63],
    dino: [164.81, 196.0, 220.0, 261.63, 293.66, 329.63, 293.66, 261.63, 220.0, 196.0],
  };

  public init(): void {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
        this.musicGain.connect(this.masterGain);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
        this.sfxGain.connect(this.masterGain);
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  public setBiome(biome: string): void {
    this.currentBiome = biome;
  }

  public setMasterVolume(vol: number): void {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, vol)), this.ctx.currentTime);
    }
  }

  public setMusicVolume(vol: number): void {
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(Math.max(0, Math.min(1, vol)), this.ctx.currentTime);
    }
  }

  public setSfxVolume(vol: number): void {
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(Math.max(0, Math.min(1, vol)), this.ctx.currentTime);
    }
  }

  private playTone(
    startFreq: number,
    endFreq: number,
    duration: number,
    type: OscillatorType,
    volume = 0.15,
    scheduledTime?: number,
    isMusic = false
  ): void {
    if (!this.ctx) return;
    if (this.ctx.state === "suspended") this.ctx.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    const now = scheduledTime !== undefined ? scheduledTime : this.ctx.currentTime;
    osc.frequency.setValueAtTime(startFreq, now);
    if (startFreq !== endFreq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(10, endFreq), now + duration);
    }

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    const targetBus = isMusic ? this.musicGain : this.sfxGain;
    osc.connect(gain);
    gain.connect(targetBus || this.ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  }

  public jump(): void {
    this.playTone(280, 560, 0.12, "sine", 0.2);
  }

  public duck(): void {
    this.playTone(220, 110, 0.12, "triangle", 0.22);
  }

  public laneWhoosh(): void {
    this.playTone(300, 150, 0.08, "sine", 0.08);
  }

  public collect(pitchStep = 0): void {
    // Pentatonic scale arpeggio for magnet / rapid chain pickups
    const scaleMultipliers = [1.0, 1.122, 1.26, 1.498, 1.682, 2.0, 2.245, 2.52];
    const mult = scaleMultipliers[Math.min(Math.max(0, pitchStep), scaleMultipliers.length - 1)];
    this.playTone(880 * mult, 1320 * mult, 0.08, "square", 0.08);
  }

  public hit(): void {
    this.playTone(120, 40, 0.28, "sawtooth", 0.3);
  }

  public powerup(): void {
    this.playTone(350, 900, 0.25, "sine", 0.25);
    setTimeout(() => {
      this.playTone(500, 1200, 0.25, "sine", 0.25);
    }, 80);
  }

  public magnetActivate(): void {
    this.playTone(320, 750, 0.22, "sine", 0.22);
    setTimeout(() => {
      this.playTone(600, 1400, 0.28, "sine", 0.25);
    }, 70);
  }

  public dinoRoar(): void {
    this.playTone(90, 40, 0.5, "sawtooth", 0.35);
    this.playTone(140, 60, 0.45, "square", 0.25);
  }

  public nearMiss(): void {
    this.playTone(600, 900, 0.15, "sine", 0.18);
  }

  public milestone(): void {
    this.playTone(523.25, 659.25, 0.2, "sine", 0.2);
    setTimeout(() => this.playTone(659.25, 783.99, 0.25, "sine", 0.22), 100);
    setTimeout(() => this.playTone(783.99, 1046.5, 0.35, "square", 0.18), 220);
  }

  // Lookahead Web Audio Sequencer (drift-free)
  public startMusic(): void {
    this.init();
    if (!this.ctx) return;

    this.isMusicPlaying = true;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.noteIndex = 0;

    const stepInterval = 0.22; // 220ms per note
    const lookahead = 0.1; // 100ms lookahead window
    const schedulerIntervalMs = 25; // check every 25ms

    const scheduleNotes = () => {
      if (!this.isMusicPlaying || !this.ctx) return;

      while (this.nextNoteTime < this.ctx.currentTime + lookahead) {
        const activeMelody = this.biomeMelodies[this.currentBiome] || this.biomeMelodies.park;
        const freq = activeMelody[this.noteIndex % activeMelody.length];

        // Lead melody note
        this.playTone(freq, freq, 0.18, "square", 0.025, this.nextNoteTime, true);

        // Bassline on 4-beat measure
        if (this.noteIndex % 4 === 0) {
          this.playTone(freq * 0.5, freq * 0.5, 0.35, "triangle", 0.07, this.nextNoteTime, true);
        }

        // Percussive rhythm
        if (this.noteIndex % 2 === 0) {
          this.playTone(110, 45, 0.04, "sawtooth", 0.03, this.nextNoteTime, true);
        }

        this.nextNoteTime += stepInterval;
        this.noteIndex++;
      }

      this.schedulerTimer = window.setTimeout(scheduleNotes, schedulerIntervalMs);
    };

    scheduleNotes();
  }

  public pauseMusic(): void {
    if (this.ctx && this.ctx.state === "running") {
      this.ctx.suspend();
    }
    if (this.schedulerTimer !== null) {
      clearTimeout(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }

  public resumeMusic(): void {
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    if (this.isMusicPlaying && this.schedulerTimer === null) {
      this.startMusic();
    }
  }

  public stopMusic(): void {
    this.isMusicPlaying = false;
    if (this.schedulerTimer !== null) {
      clearTimeout(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }

  public toggleMusic(): boolean {
    if (this.isMusicPlaying) {
      this.stopMusic();
      return false;
    } else {
      this.startMusic();
      return true;
    }
  }
}
