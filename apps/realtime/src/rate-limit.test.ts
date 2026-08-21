import { describe, expect, it } from 'vitest';
import { RateLimiter } from './rate-limit.js';

const T0 = 1_700_000_000_000;

describe('limite de mensagens', () => {
  it('deixa passar a rajada e corta depois dela', () => {
    const limiter = new RateLimiter({ burst: 3, refillPerSecond: 1 });

    expect([0, 1, 2].map(() => limiter.take('leo', T0))).toEqual([true, true, true]);
    expect(limiter.take('leo', T0)).toBe(false);
  });

  it('repõe com o tempo', () => {
    const limiter = new RateLimiter({ burst: 2, refillPerSecond: 1 });
    limiter.take('leo', T0);
    limiter.take('leo', T0);

    expect(limiter.take('leo', T0 + 500)).toBe(false);
    expect(limiter.take('leo', T0 + 1_000)).toBe(true);
  });

  it('não acumula mais fichas que a rajada', () => {
    const limiter = new RateLimiter({ burst: 2, refillPerSecond: 1 });
    limiter.take('leo', T0);

    // Uma hora parado não compra crédito infinito.
    const depois = T0 + 3_600_000;
    expect([limiter.take('leo', depois), limiter.take('leo', depois)]).toEqual([true, true]);
    expect(limiter.take('leo', depois)).toBe(false);
  });

  it('conta cada pessoa separadamente', () => {
    const limiter = new RateLimiter({ burst: 1, refillPerSecond: 1 });

    expect(limiter.take('leo', T0)).toBe(true);
    expect(limiter.take('bia', T0)).toBe(true);
    expect(limiter.take('leo', T0)).toBe(false);
  });

  it('esquece quem parou de escrever', () => {
    const limiter = new RateLimiter({ burst: 2, refillPerSecond: 1 });
    limiter.take('leo', T0);
    expect(limiter.size).toBe(1);

    limiter.prune(T0 + 10_000);
    expect(limiter.size).toBe(0);
  });
});
