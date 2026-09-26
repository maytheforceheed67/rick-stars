import type { ContentMeta, EpisodeId } from './types';

const EPISODE_RE = /^S(\d{2})E(\d{2})$/;

export function parseEpisodeId(id: string): { season: number; episode: number } | null {
  const m = EPISODE_RE.exec(id);
  return m ? { season: Number(m[1]), episode: Number(m[2]) } : null;
}

export function isEpisodeId(id: string): id is EpisodeId {
  return EPISODE_RE.test(id);
}

export function episodeId(season: number, episode: number): EpisodeId {
  return `S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`;
}

/** Sortable number: S02E03 -> 2003. */
export function episodeOrder(id: EpisodeId): number {
  const p = parseEpisodeId(id);
  if (!p) throw new Error(`Bad episode id "${id}"`);
  return p.season * 1000 + p.episode;
}

export function compareEpisodes(a: EpisodeId, b: EpisodeId): number {
  return episodeOrder(a) - episodeOrder(b);
}

/** Canon gating: may content first seen in `meta.firstAppears` be used in `episode`? */
export function availableIn(meta: Pick<ContentMeta, 'firstAppears'>, episode: EpisodeId): boolean {
  return compareEpisodes(meta.firstAppears, episode) <= 0;
}

/**
 * "Next up": the episode after the furthest one cleared, or null if nothing is cleared yet (or
 * the last one is). The Season Map and the victory screen both use this, so they always agree.
 */
export function nextUp<T extends { id: EpisodeId }>(listings: readonly T[], isCleared: (id: EpisodeId) => boolean): T | null {
  const sorted = [...listings].sort((a, b) => compareEpisodes(a.id, b.id));
  let furthest = -1;
  sorted.forEach((l, i) => {
    if (isCleared(l.id)) furthest = i;
  });
  return furthest >= 0 ? (sorted[furthest + 1] ?? null) : null;
}
