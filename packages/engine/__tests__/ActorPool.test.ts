import { describe, it, expect } from 'vitest';
import { ActorPool } from '../src/actor/ActorPool.js';

describe('ActorPool', () => {
  it('creates a pool with the specified capacity', () => {
    const pool = new ActorPool(10);
    expect(pool.capacity).toBe(10);
    expect(pool.active).toBe(0);
  });

  it('acquires actors from the pool', () => {
    const pool = new ActorPool(5);
    const actor = pool.acquire();
    expect(actor).not.toBeNull();
    expect(actor!.active).toBe(true);
    expect(pool.active).toBe(1);
  });

  it('returns null when pool is exhausted', () => {
    const pool = new ActorPool(2);
    pool.acquire();
    pool.acquire();
    expect(pool.acquire()).toBeNull();
  });

  it('releases actors back to the pool', () => {
    const pool = new ActorPool(3);
    const a1 = pool.acquire()!;
    pool.acquire();
    expect(pool.active).toBe(2);

    pool.release(a1);
    expect(pool.active).toBe(1);
    expect(a1.active).toBe(false);
  });

  it('can reacquire after release', () => {
    const pool = new ActorPool(1);
    const a1 = pool.acquire()!;
    pool.release(a1);
    const a2 = pool.acquire();
    expect(a2).not.toBeNull();
    expect(pool.active).toBe(1);
  });

  it('forEach iterates only active actors', () => {
    const pool = new ActorPool(5);
    pool.acquire();
    pool.acquire();
    pool.acquire();

    let count = 0;
    pool.forEach(() => count++);
    expect(count).toBe(3);
  });

  it('releaseAll returns all actors', () => {
    const pool = new ActorPool(5);
    pool.acquire();
    pool.acquire();
    pool.acquire();
    pool.releaseAll();
    expect(pool.active).toBe(0);
  });
});
