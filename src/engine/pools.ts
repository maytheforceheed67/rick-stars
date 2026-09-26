import { availableIn } from './episodes';
import type { Registry } from './registry';
import type { ActDef, ContentId, EpisodeId, ItemDef, Weighted } from './types';

export interface ItemFilter {
  rarity?: ItemDef['rarity'];
  kind?: ItemDef['kind'];
  /** Any of these kinds. */
  kinds?: readonly ItemDef['kind'][];
  /** Ids to leave out, e.g. what a shop has already stocked. */
  exclude?: readonly ContentId[];
}

/**
 * Items that can drop in an act: the act's own pool plus anything unlocked into the global pool
 * (episode clears, garage unlocks). Canon gating applies to both, so an item from a later episode
 * never shows up early, even if it's unlocked.
 */
export function itemPoolFor(
  reg: Registry,
  episode: EpisodeId,
  act: ActDef,
  unlocked: ReadonlySet<ContentId>,
  owned: ReadonlySet<ContentId>,
  filter: ItemFilter = {},
): Weighted[] {
  const out = new Map<ContentId, number>();
  const consider = (id: ContentId, weight: number) => {
    const item = reg.items.get(id);
    if (!item || item.noPool || owned.has(id)) return;
    if (!availableIn(item, episode)) return;
    if (item.locked && !unlocked.has(id)) return;
    if (filter.rarity && item.rarity !== filter.rarity) return;
    if (filter.kind && item.kind !== filter.kind) return;
    if (filter.kinds && !filter.kinds.includes(item.kind)) return;
    if (filter.exclude?.includes(id)) return;
    out.set(id, (out.get(id) ?? 0) + weight);
  };
  for (const w of act.itemPool) consider(w.id, w.weight);
  for (const id of unlocked) if (!out.has(id)) consider(id, 1);
  return [...out].map(([id, weight]) => ({ id, weight }));
}

/** The act's enemy pool with canon gating applied. */
export function enemyPoolFor(reg: Registry, episode: EpisodeId, act: ActDef): Weighted[] {
  return act.enemyPool.filter((w) => {
    const e = reg.enemies.get(w.id);
    return !!e && availableIn(e, episode);
  });
}
