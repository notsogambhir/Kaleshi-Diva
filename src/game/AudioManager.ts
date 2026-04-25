export class AudioManager {
  private ctx: AudioContext | null = null;
  private musicPlaying = false;
  private sequencerId: number | null = null;

  init() {
    if (!this.ctx) {
      this.ctx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  private playTone(
    startFreq: number,
    endFreq: number,
    duration: number,
    type: OscillatorType,
    vol = 0.1,
  ) {
    if (!this.ctx) return;
    if (this.ctx.state === "suspended") this.ctx.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      endFreq,
      this.ctx.currentTime + duration,
    );

    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.01,
      this.ctx.currentTime + duration,
    );

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  jump() {
    this.playTone(300, 600, 0.1, "sine");
  }
  duck() {
    this.playTone(200, 100, 0.1, "triangle");
  }
  collect() {
    this.playTone(800, 1200, 0.1, "square", 0.1);
  }
  hit() {
    this.playTone(100, 50, 0.3, "sawtooth");
  }
  powerup() {
    this.playTone(400, 1000, 0.3, "sine", 0.2);
  }

  startMusic() {
    if (this.sequencerId) return;
    this.musicPlaying = true;
    let noteOrder = 0;
    const notes = [
      261.63, 293.66, 329.63, 349.23, 392.0, 329.63, 293.66, 261.63, 392.0,
      440.0, 392.0, 349.23,
    ];
    const rhythm = 250; // ms

    const playNote = () => {
      if (!this.musicPlaying || !this.ctx) return;
      const freq = notes[noteOrder % notes.length];

      // Lead
      this.playTone(freq, freq, 0.2, "square", 0.03);
      // Bass
      if (noteOrder % 4 === 0)
        this.playTone(130.81, 130.81, 0.4, "triangle", 0.1);
      // Percussion
      if (noteOrder % 2 === 0) this.playTone(100, 50, 0.05, "sawtooth", 0.05); // changed to sawtooth for percussion vibe

      noteOrder++;
      this.sequencerId = window.setTimeout(playNote, rhythm);
    };
    playNote();
  }

  stopMusic() {
    this.musicPlaying = false;
    if (this.sequencerId !== null) {
      clearTimeout(this.sequencerId);
      this.sequencerId = null;
    }
  }

  toggleMusic(): boolean {
    if (this.musicPlaying) {
      this.stopMusic();
      return false;
    } else {
      this.init();
      this.startMusic();
      return true;
    }
  }
}
