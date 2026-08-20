/**
 * Limite de mensagens por pessoa.
 *
 * Balde de fichas: enche devagar, e quem manda rajada gasta o que tinha
 * guardado. Deixa a torcida gritar em pico de duelo sem deixar uma conta só
 * inundar a sala.
 *
 * A contagem é por processo. Com mais de uma máquina de tempo real cada uma
 * conta a sua parte — o limite compartilhado chega com o Redis (C-16). Para
 * uma máquina, que é o tamanho da Fase 1, isto basta.
 */

export interface RateLimitOptions {
  /** Fichas acumuláveis: o tamanho da rajada permitida. */
  readonly burst: number;
  /** Fichas repostas por segundo: o ritmo sustentável. */
  readonly refillPerSecond: number;
}

export const CHAT_RATE_LIMIT: RateLimitOptions = { burst: 5, refillPerSecond: 1 };

interface Bucket {
  tokens: number;
  updatedAt: number;
}

export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(private readonly options: RateLimitOptions = CHAT_RATE_LIMIT) {}

  /** Gasta uma ficha. `false` quando não havia nenhuma. */
  take(key: string, now = Date.now()): boolean {
    const bucket = this.buckets.get(key) ?? { tokens: this.options.burst, updatedAt: now };
    const elapsedSeconds = Math.max(0, now - bucket.updatedAt) / 1000;

    const tokens = Math.min(
      this.options.burst,
      bucket.tokens + elapsedSeconds * this.options.refillPerSecond,
    );

    if (tokens < 1) {
      this.buckets.set(key, { tokens, updatedAt: now });
      return false;
    }

    this.buckets.set(key, { tokens: tokens - 1, updatedAt: now });
    return true;
  }

  /** Esquece quem parou de escrever, para o mapa não crescer para sempre. */
  prune(now = Date.now()): void {
    const cheioEm = (this.options.burst / this.options.refillPerSecond) * 1000;
    for (const [key, bucket] of this.buckets) {
      if (now - bucket.updatedAt > cheioEm) this.buckets.delete(key);
    }
  }

  forget(key: string): void {
    this.buckets.delete(key);
  }

  get size(): number {
    return this.buckets.size;
  }
}
