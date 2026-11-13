/**
 * Limits how many async tasks run at the same time. Waiting tasks start in FIFO order.
 */
export class Semaphore {
  private active = 0;
  private readonly waiting: Array<() => void> = [];

  constructor(private readonly limit: number) {
    if (limit < 1) throw new RangeError('Semaphore limit must be at least 1');
  }

  get pending(): number {
    return this.waiting.length;
  }

  async use<T>(task: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await task();
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (this.active < this.limit) {
      this.active++;
      return Promise.resolve();
    }
    return new Promise((resolve) => this.waiting.push(resolve));
  }

  private release(): void {
    const next = this.waiting.shift();
    // hand the slot over directly instead of decrementing and re-incrementing
    if (next) next();
    else this.active--;
  }
}
