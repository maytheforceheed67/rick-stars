import { describe, expect, it } from 'vitest';
import { defaultSave, loadSave, MemoryStorage, migrate, SAVE_KEY, SAVE_VERSION, writeSave, type SaveDataV1 } from '../src/engine/save/save';

const ctx = { unlocksFor: (id: string) => (id === 'S01E01' ? ['mega-seed'] : []) };

describe('save data', () => {
  it('starts fresh when there is no save', () => {
    const { data, status } = loadSave(new MemoryStorage(), ctx);
    expect(status).toBe('new');
    expect(data).toEqual(defaultSave());
  });

  it('round-trips through storage', () => {
    const store = new MemoryStorage();
    const data = defaultSave();
    data.bankedScrap = 42;
    data.upgrades['spare-heart'] = 2;
    data.unlocked.push('mega-seed');
    data.episodes.S01E01 = { attempts: 3, clears: 1, bestTimeMs: 1234567 };
    data.settings.reducedFlash = true;
    data.shirt = 'shirt-portal';
    expect(writeSave(store, data)).toBe(true);
    const { data: back, status } = loadSave(store, ctx);
    expect(status).toBe('loaded');
    expect(back).toEqual(data);
  });

  it('migrates a v1 save', () => {
    const v1: SaveDataV1 = {
      version: 1,
      scrap: 57,
      upgrades: ['spare-heart', 'shirt-pajamas'],
      clearedEpisodes: ['S01E01'],
      settings: { volume: 0.3, shake: false },
    };
    const store = new MemoryStorage();
    store.setItem(SAVE_KEY, JSON.stringify(v1));
    const { data, status } = loadSave(store, ctx);
    expect(status).toBe('migrated');
    expect(data.version).toBe(SAVE_VERSION);
    expect(data.bankedScrap).toBe(57);
    expect(data.upgrades).toEqual({ 'spare-heart': 1, 'shirt-pajamas': 1 });
    expect(data.episodes.S01E01).toEqual({ attempts: 1, clears: 1, bestTimeMs: null });
    expect(data.unlocked).toEqual(['mega-seed']);
    expect(data.settings).toMatchObject({ musicVolume: 0.3, sfxVolume: 0.3, screenShake: false, reducedFlash: false, textSpeed: 'normal' });
  });

  it('backs up and resets unreadable or future saves', () => {
    for (const raw of ['{not json', JSON.stringify({ version: 99 }), JSON.stringify({ version: 0 })]) {
      const store = new MemoryStorage();
      store.setItem(SAVE_KEY, raw);
      const { data, status } = loadSave(store, ctx);
      expect(status).toBe('reset');
      expect(data).toEqual(defaultSave());
      expect(store.getItem(`${SAVE_KEY}.backup`)).toBe(raw);
    }
  });

  it('cleans up out-of-range values', () => {
    const data = migrate(
      { version: 2, bankedScrap: -5, upgrades: { a: 0, b: 2.7 }, settings: { musicVolume: 7, sfxVolume: -1, textSpeed: 'warp' }, unlocked: ['x', 'x', 3] },
      ctx,
    );
    expect(data.bankedScrap).toBe(0);
    expect(data.upgrades).toEqual({ b: 2 });
    expect(data.settings.musicVolume).toBe(1);
    expect(data.settings.sfxVolume).toBe(0);
    expect(data.settings.textSpeed).toBe('normal');
    expect(data.unlocked).toEqual(['x']);
  });
});
