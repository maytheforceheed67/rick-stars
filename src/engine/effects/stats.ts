/**
 * Stats are plain name -> number maps. The engine reads the core keys (damage, fireRate, ...);
 * content may add its own keys (e.g. 'shoeBattery') by listing a base value in balance.ts.
 *
 * final = (base + sum of adds) * product of mults, then clamped to the stat's limits.
 */
export type StatBlock = Record<string, number>;

export interface StatModifiers {
  add?: Record<string, number>;
  mult?: Record<string, number>;
}

export type StatLimits = Record<string, readonly [min: number, max: number]>;

export function computeStats(
  base: StatBlock,
  mods: readonly (StatModifiers | undefined)[],
  limits: StatLimits = {},
): StatBlock {
  const add: Record<string, number> = {};
  const mult: Record<string, number> = {};
  for (const m of mods) {
    if (!m) continue;
    for (const [k, v] of Object.entries(m.add ?? {})) add[k] = (add[k] ?? 0) + v;
    for (const [k, v] of Object.entries(m.mult ?? {})) mult[k] = (mult[k] ?? 1) * v;
  }
  const out: StatBlock = {};
  const keys = new Set([...Object.keys(base), ...Object.keys(add), ...Object.keys(mult)]);
  for (const k of keys) {
    let v = ((base[k] ?? 0) + (add[k] ?? 0)) * (mult[k] ?? 1);
    const lim = limits[k];
    if (lim) v = Math.min(lim[1], Math.max(lim[0], v));
    out[k] = v;
  }
  return out;
}
