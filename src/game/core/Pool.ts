export class ObjectPool<T extends { visible?: boolean }> {
  private available: T[] = [];
  private inUse: Set<T> = new Set();
  private factory: () => T;
  private onReset?: (item: T) => void;
  private onDispose?: (item: T) => void;

  constructor(
    factory: () => T,
    onReset?: (item: T) => void,
    initialSize = 0,
    onDispose?: (item: T) => void
  ) {
    this.factory = factory;
    this.onReset = onReset;
    this.onDispose = onDispose;
    if (initialSize > 0) {
      this.prewarm(initialSize);
    }
  }

  public prewarm(count: number): void {
    for (let i = 0; i < count; i++) {
      const item = this.factory();
      if (item.visible !== undefined) {
        item.visible = false;
      }
      this.available.push(item);
    }
  }

  public acquire(): T {
    let item = this.available.pop();
    if (!item) {
      item = this.factory();
    }
    if (item.visible !== undefined) {
      item.visible = true;
    }
    this.inUse.add(item);
    return item;
  }

  public release(item: T): void {
    if (!this.inUse.has(item)) return;
    this.inUse.delete(item);
    if (this.onReset) {
      this.onReset(item);
    }
    if (item.visible !== undefined) {
      item.visible = false;
    }
    this.available.push(item);
  }

  public releaseAll(): void {
    for (const item of this.inUse) {
      if (this.onReset) {
        this.onReset(item);
      }
      if (item.visible !== undefined) {
        item.visible = false;
      }
      this.available.push(item);
    }
    this.inUse.clear();
  }

  public getActiveCount(): number {
    return this.inUse.size;
  }

  public getAvailableCount(): number {
    return this.available.length;
  }

  public clear(): void {
    if (this.onDispose) {
      for (const item of this.available) {
        this.onDispose(item);
      }
      for (const item of this.inUse) {
        this.onDispose(item);
      }
    }
    this.available = [];
    this.inUse.clear();
  }
}
