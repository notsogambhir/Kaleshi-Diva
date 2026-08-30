export type UpdateCallback = (dt: number, simTime: number) => void;
export type RenderCallback = (interpolationAlpha: number) => void;

export class GameLoop {
  private isRunning = false;
  private isPaused = false;
  private animationFrameId = 0;
  private lastTimestamp = 0;
  private accumulator = 0;
  private simTime = 0;

  // 60 Hz logical simulation tick
  public readonly targetFps = 60;
  public readonly fixedDelta = 1 / 60;
  private readonly maxFrameTime = 0.1; // 100ms clamp to prevent spiral of death

  private onUpdate: UpdateCallback;
  private onRender: RenderCallback;

  constructor(onUpdate: UpdateCallback, onRender: RenderCallback) {
    this.onUpdate = onUpdate;
    this.onRender = onRender;
    this.tick = this.tick.bind(this);
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isPaused = false;
    this.lastTimestamp = performance.now();
    this.accumulator = 0;
    this.animationFrameId = requestAnimationFrame(this.tick);
  }

  public pause(): void {
    this.isPaused = true;
  }

  public resume(): void {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.lastTimestamp = performance.now();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = 0;
    }
  }

  public getSimulationTime(): number {
    return this.simTime;
  }

  private tick(currentTimestamp: number): void {
    if (!this.isRunning) return;

    this.animationFrameId = requestAnimationFrame(this.tick);

    if (this.isPaused) {
      this.lastTimestamp = currentTimestamp;
      this.onRender(1.0);
      return;
    }

    const elapsedSeconds = Math.min((currentTimestamp - this.lastTimestamp) / 1000, this.maxFrameTime);
    this.lastTimestamp = currentTimestamp;
    this.accumulator += elapsedSeconds;

    // Fixed timestep execution
    while (this.accumulator >= this.fixedDelta) {
      this.simTime += this.fixedDelta;
      this.onUpdate(this.fixedDelta, this.simTime);
      this.accumulator -= this.fixedDelta;
    }

    // Render with interpolation factor
    const alpha = this.accumulator / this.fixedDelta;
    this.onRender(alpha);
  }
}
