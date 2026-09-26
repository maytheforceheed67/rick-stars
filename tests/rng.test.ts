import { describe, expect, it } from 'vitest';
import { createSeed, formatSeed, normalizeSeed, Rng, SEED_ALPHABET, SEED_LENGTH } from '../src/engine/rng';

describe('Rng', () => {
  it('produces the same sequence for the same seed', () => {
    const a = new Rng('ABCDEFGH');
    const b = new Rng('ABCDEFGH');
    const seqA = Array.from({ length: 200 }, () => a.next());
    const seqB = Array.from({ length: 200 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = Array.from({ length: 20 }, (() => { const r = new Rng('SEED-ONE'); return () => r.next(); })());
    const b = Array.from({ length: 20 }, (() => { const r = new Rng('SEED-TWO'); return () => r.next(); })());
    expect(a).not.toEqual(b);
  });

  it('stays in range', () => {
    const r = new Rng('range');
    for (let i = 0; i < 2000; i++) {
      const f = r.next();
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
      const n = r.int(3, 7);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(7);
    }
  });

  it('forks independently of how much the parent has been used', () => {
    const fresh = new Rng('parent').fork('floor:1');
    const used = new Rng('parent');
    for (let i = 0; i < 500; i++) used.next();
    const forked = used.fork('floor:1');
    expect(Array.from({ length: 10 }, () => forked.next())).toEqual(Array.from({ length: 10 }, () => fresh.next()));
    expect(new Rng('parent').fork('a').next()).not.toEqual(new Rng('parent').fork('b').next());
  });

  it('picks by weight', () => {
    const r = new Rng('weights');
    const counts = { a: 0, b: 0 };
    for (let i = 0; i < 4000; i++) counts[r.weighted([{ id: 'a' as const, weight: 3 }, { id: 'b' as const, weight: 1 }])]++;
    expect(counts.a / counts.b).toBeGreaterThan(2.4);
    expect(counts.a / counts.b).toBeLessThan(3.8);
  });

  it('shuffles deterministically', () => {
    const s1 = new Rng('shuffle').shuffle([1, 2, 3, 4, 5, 6, 7, 8]);
    const s2 = new Rng('shuffle').shuffle([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(s1).toEqual(s2);
    expect([...s1].sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe('seeds', () => {
  it('creates valid seeds', () => {
    for (let i = 0; i < 50; i++) {
      const s = createSeed();
      expect(s).toHaveLength(SEED_LENGTH);
      for (const ch of s) expect(SEED_ALPHABET).toContain(ch);
      expect(normalizeSeed(s)).toBe(s);
    }
  });

  it('normalizes typed seeds', () => {
    expect(normalizeSeed('abcd-efgh')).toBe('ABCDEFGH');
    expect(normalizeSeed(' ab cd ef gh ')).toBe('ABCDEFGH');
    expect(normalizeSeed('ABC')).toBeNull();
    expect(normalizeSeed('ABCDEFG0')).toBeNull();
    expect(formatSeed('ABCDEFGH')).toBe('ABCD-EFGH');
  });
});
