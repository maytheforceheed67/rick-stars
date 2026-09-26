import type { ContentId, ItemDef, ItemHooks, SynergyDef, WeaponSpec } from '../types';
import type { Inventory } from './inventory';
import type { StatModifiers } from './stats';

/** Synergies whose required items are all owned. */
export function activeSynergies(owned: Iterable<ContentId>, synergies: readonly SynergyDef[]): SynergyDef[] {
  const set = new Set(owned);
  return synergies.filter((s) => s.requires.every((id) => set.has(id)));
}

export interface HookSource {
  id: ContentId;
  hooks?: ItemHooks;
}

/** Owned items in pickup order, then active synergies. */
export function hookSources(
  inventory: Inventory,
  items: ReadonlyMap<ContentId, ItemDef>,
  synergies: readonly SynergyDef[],
): HookSource[] {
  const owned = inventory.owned();
  const out: HookSource[] = [];
  for (const id of owned) {
    const def = items.get(id);
    if (def?.hooks) out.push({ id, hooks: def.hooks });
  }
  for (const s of activeSynergies(owned, synergies)) if (s.hooks) out.push({ id: s.id, hooks: s.hooks });
  return out;
}

type HookArgs<K extends keyof ItemHooks> = Parameters<NonNullable<ItemHooks[K]>>;

/** Calls `hook` on every source that defines it, in order. */
export function runHook<K extends keyof ItemHooks>(sources: readonly HookSource[], hook: K, ...args: HookArgs<K>): void {
  for (const s of sources) {
    const fn = s.hooks?.[hook] as ((...a: HookArgs<K>) => void) | undefined;
    fn?.(...args);
  }
}

export function weaponModifiers(w: WeaponSpec | undefined): StatModifiers | undefined {
  if (!w) return undefined;
  return {
    add: { projectiles: w.extraProjectiles, spread: w.spread },
    mult: { damage: w.damageMult, fireRate: w.fireRateMult },
  };
}

/** Stat modifiers from owned items (including the weapon) and active synergies. */
export function itemModifiers(
  inventory: Inventory,
  items: ReadonlyMap<ContentId, ItemDef>,
  synergies: readonly SynergyDef[],
): StatModifiers[] {
  const owned = inventory.owned();
  const out: StatModifiers[] = [];
  for (const id of owned) {
    const def = items.get(id);
    if (!def) continue;
    if (def.stats) out.push(def.stats);
    const w = weaponModifiers(def.weapon);
    if (w) out.push(w);
  }
  for (const s of activeSynergies(owned, synergies)) if (s.stats) out.push(s.stats);
  return out;
}
