import { describe, expect, it } from 'vitest';
import { Semaphore } from './semaphore.js';

const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

describe('Semaphore', () => {
  it('never runs more tasks than the limit', async () => {
    const semaphore = new Semaphore(2);
    let running = 0;
    let peak = 0;

    const task = async () => {
      running++;
      peak = Math.max(peak, running);
      await tick();
      running--;
    };

    await Promise.all(Array.from({ length: 6 }, () => semaphore.use(task)));
    expect(peak).toBe(2);
  });

  it('releases the slot when a task throws', async () => {
    const semaphore = new Semaphore(1);
    await expect(semaphore.use(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    await expect(semaphore.use(async () => 'next')).resolves.toBe('next');
  });

  it('starts waiting tasks in order', async () => {
    const semaphore = new Semaphore(1);
    const order: number[] = [];
    await Promise.all(
      [1, 2, 3].map((n) =>
        semaphore.use(async () => {
          order.push(n);
          await tick();
        }),
      ),
    );
    expect(order).toEqual([1, 2, 3]);
  });
});
