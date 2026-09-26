/**
 * Seeded pseudo-random numbers. Every random decision in the game goes through an `Rng`
 * (a test fails if anything else calls Math.random), so a seed fully determines a run.
 *
 * Generator: sfc32, seeded with the cyrb128 hash of a string key.
 */

/** cyrb128: hashes a string into four 32-bit integers. */
export function hashString(str: string): [number, number, number, number] {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

export interface WeightedEntry<T> {
  id: T;
  weight: number;
}

export class Rng {
  /** The string this generator was seeded from. Forks derive from it, not from the current state. */
  readonly key: string;
  private a: number;
  private b: number;
  private c: number;
  private d: number;

  constructor(key: string) {
    this.key = key;
    [this.a, this.b, this.c, this.d] = hashString(key);
    // Warm up so similar keys diverge quickly.
    for (let i = 0; i < 12; i++) this.next();
  }

  /** Uniform float in [0, 1). */
  next(): number {
    this.a >>>= 0;
    this.b >>>= 0;
    this.c >>>= 0;
    this.d >>>= 0;
    let t = (this.a + this.b) | 0;
    this.a = this.b ^ (this.b >>> 9);
    this.b = (this.c + (this.c << 3)) | 0;
    this.c = (this.c << 21) | (this.c >>> 11);
    this.d = (this.d + 1) | 0;
    t = (t + this.d) | 0;
    this.c = (this.c + t) | 0;
    return (t >>> 0) / 4294967296;
  }

  /** Uniform float in [min, max). */
  float(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  /** Uniform integer in [min, max] (inclusive). */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  /** -1 or 1. */
  sign(): number {
    return this.next() < 0.5 ? -1 : 1;
  }

  /** Random angle in radians. */
  angle(): number {
    return this.next() * Math.PI * 2;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Rng.pick called with an empty list');
    return items[Math.floor(this.next() * items.length)];
  }

  weighted<T>(entries: readonly WeightedEntry<T>[]): T {
    const total = entries.reduce((sum, e) => sum + Math.max(0, e.weight), 0);
    if (entries.length === 0 || total <= 0) throw new Error('Rng.weighted called with no positive weights');
    let roll = this.next() * total;
    for (const e of entries) {
      roll -= Math.max(0, e.weight);
      if (roll < 0) return e.id;
    }
    return entries[entries.length - 1].id;
  }

  /** Shuffles in place and returns the same array. */
  shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }

  /**
   * A new independent generator derived from this one's key and a label. Forks don't depend on
   * how many numbers were drawn, so e.g. floor layouts stay identical no matter how combat went.
   */
  fork(label: string): Rng {
    return new Rng(`${this.key}/${label}`);
  }
}

/** Letters and digits that can't be confused with each other (no 0/O, 1/I). */
export const SEED_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const SEED_LENGTH = 8;

/**
 * Picks a fresh seed. This is the one place entropy enters the game; it uses the crypto API rather
 * than Math.random, and everything after it is derived from the seed.
 */
export function createSeed(): string {
  const bytes = new Uint32Array(SEED_LENGTH);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    const fallback = new Rng(`fallback-${Date.now()}`);
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(fallback.next() * 4294967296);
  }
  let out = '';
  for (let i = 0; i < SEED_LENGTH; i++) out += SEED_ALPHABET[bytes[i] % SEED_ALPHABET.length];
  return out;
}

/**
 * Uppercases and drops separators ("abcd-efgh" works). Returns null unless the result is exactly
 * SEED_LENGTH characters from the seed alphabet.
 */
export function normalizeSeed(input: string): string | null {
  const cleaned = input.toUpperCase().replace(/[\s-]/g, '');
  if (cleaned.length !== SEED_LENGTH) return null;
  for (const ch of cleaned) if (!SEED_ALPHABET.includes(ch)) return null;
  return cleaned;
}

/** "ABCDEFGH" -> "ABCD-EFGH" for display. */
export function formatSeed(seed: string): string {
  return seed.length === SEED_LENGTH ? `${seed.slice(0, 4)}-${seed.slice(4)}` : seed;
}
