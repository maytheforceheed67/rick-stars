/**
 * Versioned save data in localStorage. Each schema change bumps SAVE_VERSION and adds a
 * migration from the previous version; loading always runs the chain up to the current version.
 */

export const SAVE_KEY = 'rick-stars.save';
export const SAVE_VERSION = 3;

export type TextSpeed = 'slow' | 'normal' | 'fast';

export interface Settings {
  musicVolume: number;
  sfxVolume: number;
  screenShake: boolean;
  reducedFlash: boolean;
  textSpeed: TextSpeed;
  /** Floating damage numbers on hits (off by default). */
  damageNumbers: boolean;
}

export interface EpisodeRecord {
  attempts: number;
  clears: number;
  bestTimeMs: number | null;
}

export interface SaveData {
  version: typeof SAVE_VERSION;
  /** Scrap banked in the Garage. */
  bankedScrap: number;
  /** Garage upgrade levels by id. */
  upgrades: Record<string, number>;
  /** Content unlocked into the global pool (episode clears and garage unlocks). */
  unlocked: string[];
  episodes: Record<string, EpisodeRecord>;
  seenCutscenes: string[];
  settings: Settings;
  /** Cosmetic shirt upgrade id, or null for the classic yellow. */
  shirt: string | null;
  lifetime: { runs: number; deaths: number; kills: number; scrapEarned: number };
}

/** The first save format (kept so old saves keep working). */
export interface SaveDataV1 {
  version: 1;
  scrap: number;
  /** Owned upgrade ids; every upgrade had a single level. */
  upgrades: string[];
  clearedEpisodes: string[];
  settings: { volume: number; shake: boolean };
}

export interface MigrationContext {
  /** Content an episode unlocks when cleared. */
  unlocksFor(episodeId: string): string[];
}

export interface SaveStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type LoadStatus = 'new' | 'loaded' | 'migrated' | 'reset';

export function defaultSettings(): Settings {
  return { musicVolume: 0.5, sfxVolume: 0.8, screenShake: true, reducedFlash: false, textSpeed: 'normal', damageNumbers: false };
}

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    bankedScrap: 0,
    upgrades: {},
    unlocked: [],
    episodes: {},
    seenCutscenes: [],
    settings: defaultSettings(),
    shirt: null,
    lifetime: { runs: 0, deaths: 0, kills: 0, scrapEarned: 0 },
  };
}

type Migration = (data: Record<string, unknown>, ctx: MigrationContext) => Record<string, unknown>;

/** migrations[n] upgrades a version-n save to version n+1. */
const migrations: Record<number, Migration> = {
  1: (raw, ctx) => {
    const v1 = raw as unknown as SaveDataV1;
    const cleared = Array.isArray(v1.clearedEpisodes) ? v1.clearedEpisodes.map(String) : [];
    const volume = clamp01(num(v1.settings?.volume, 0.7));
    const episodes: Record<string, EpisodeRecord> = {};
    for (const id of cleared) episodes[id] = { attempts: 1, clears: 1, bestTimeMs: null };
    const upgrades: Record<string, number> = {};
    for (const id of Array.isArray(v1.upgrades) ? v1.upgrades : []) upgrades[String(id)] = 1;
    return {
      version: 2,
      bankedScrap: Math.max(0, Math.floor(num(v1.scrap, 0))),
      upgrades,
      unlocked: [...new Set(cleared.flatMap((id) => ctx.unlocksFor(id)))],
      episodes,
      seenCutscenes: [],
      settings: { ...defaultSettings(), musicVolume: volume, sfxVolume: volume, screenShake: v1.settings?.shake !== false },
      shirt: null,
      lifetime: { runs: 0, deaths: 0, kills: 0, scrapEarned: 0 },
    };
  },
  // Version 3 adds the damage-numbers setting (off).
  2: (raw) => ({ ...raw, version: 3, settings: { ...((raw.settings as object | undefined) ?? {}), damageNumbers: false } }),
};

/** Runs migrations up to the current version and fills in anything missing. */
export function migrate(raw: unknown, ctx: MigrationContext): SaveData {
  if (!raw || typeof raw !== 'object') throw new Error('Save data is not an object');
  let data = raw as Record<string, unknown>;
  let version = num(data.version, NaN);
  if (!Number.isInteger(version) || version < 1) throw new Error(`Unknown save version ${String(data.version)}`);
  if (version > SAVE_VERSION) throw new Error(`Save is from a newer version (${version})`);
  while (version < SAVE_VERSION) {
    const step = migrations[version];
    if (!step) throw new Error(`No migration from save version ${version}`);
    data = step(data, ctx);
    version = num(data.version, NaN);
  }
  return sanitize(data);
}

function sanitize(data: Record<string, unknown>): SaveData {
  const d = defaultSave();
  const s = (data.settings ?? {}) as Partial<Settings>;
  const lifetime = (data.lifetime ?? {}) as Partial<SaveData['lifetime']>;
  const episodes: Record<string, EpisodeRecord> = {};
  for (const [id, rec] of Object.entries((data.episodes ?? {}) as Record<string, Partial<EpisodeRecord>>)) {
    episodes[id] = {
      attempts: Math.max(0, Math.floor(num(rec?.attempts, 0))),
      clears: Math.max(0, Math.floor(num(rec?.clears, 0))),
      bestTimeMs: typeof rec?.bestTimeMs === 'number' && rec.bestTimeMs > 0 ? rec.bestTimeMs : null,
    };
  }
  const upgrades: Record<string, number> = {};
  for (const [id, lvl] of Object.entries((data.upgrades ?? {}) as Record<string, unknown>)) {
    const n = Math.floor(num(lvl, 0));
    if (n > 0) upgrades[id] = n;
  }
  return {
    version: SAVE_VERSION,
    bankedScrap: Math.max(0, Math.floor(num(data.bankedScrap, 0))),
    upgrades,
    unlocked: strings(data.unlocked),
    episodes,
    seenCutscenes: strings(data.seenCutscenes),
    settings: {
      musicVolume: clamp01(num(s.musicVolume, d.settings.musicVolume)),
      sfxVolume: clamp01(num(s.sfxVolume, d.settings.sfxVolume)),
      screenShake: typeof s.screenShake === 'boolean' ? s.screenShake : d.settings.screenShake,
      reducedFlash: typeof s.reducedFlash === 'boolean' ? s.reducedFlash : d.settings.reducedFlash,
      textSpeed: s.textSpeed === 'slow' || s.textSpeed === 'fast' ? s.textSpeed : 'normal',
      damageNumbers: typeof s.damageNumbers === 'boolean' ? s.damageNumbers : d.settings.damageNumbers,
    },
    shirt: typeof data.shirt === 'string' ? data.shirt : null,
    lifetime: {
      runs: Math.max(0, Math.floor(num(lifetime.runs, 0))),
      deaths: Math.max(0, Math.floor(num(lifetime.deaths, 0))),
      kills: Math.max(0, Math.floor(num(lifetime.kills, 0))),
      scrapEarned: Math.max(0, Math.floor(num(lifetime.scrapEarned, 0))),
    },
  };
}

/**
 * Reads the save. Unreadable or incompatible saves are copied to `${SAVE_KEY}.backup` and replaced
 * with a fresh one, so a bad save never blocks the game.
 */
export function loadSave(storage: SaveStorage, ctx: MigrationContext): { data: SaveData; status: LoadStatus } {
  let raw: string | null = null;
  try {
    raw = storage.getItem(SAVE_KEY);
  } catch {
    return { data: defaultSave(), status: 'new' };
  }
  if (raw === null) return { data: defaultSave(), status: 'new' };
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const wasCurrent = parsed?.version === SAVE_VERSION;
    const data = migrate(parsed, ctx);
    return { data, status: wasCurrent ? 'loaded' : 'migrated' };
  } catch {
    try {
      storage.setItem(`${SAVE_KEY}.backup`, raw);
    } catch {
      // Storage may be full or blocked; the fresh save below still works in memory.
    }
    return { data: defaultSave(), status: 'reset' };
  }
}

/** Writes the save; returns false if storage refused (private mode, quota). */
export function writeSave(storage: SaveStorage, data: SaveData): boolean {
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

/** In-memory storage for tests and for browsers that block localStorage. */
export class MemoryStorage implements SaveStorage {
  private readonly map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function strings(v: unknown): string[] {
  return Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string'))] : [];
}
