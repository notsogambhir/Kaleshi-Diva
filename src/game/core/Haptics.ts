export class HapticsManager {
  private static enabled = true;

  public static setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public static isEnabled(): boolean {
    return this.enabled;
  }

  public static light(): void {
    if (!this.enabled) return;
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(15);
      } catch (e) {}
    }
  }

  public static medium(): void {
    if (!this.enabled) return;
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(35);
      } catch (e) {}
    }
  }

  public static heavy(): void {
    if (!this.enabled) return;
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate([50, 40, 80]);
      } catch (e) {}
    }
  }
}
