/**
 * Game-wide services shared by every scene: the content registry, the save file and audio.
 */
import type { AudioManager } from './audio/audio';
import type { Registry } from './registry';
import { writeSave, type SaveData, type SaveStorage } from './save/save';

export interface Services {
  registry: Registry;
  save: SaveData;
  storage: SaveStorage;
  audio: AudioManager;
  /** ?debug=1 in the URL. */
  debug: boolean;
  /** Content validation problems found at boot (empty = all good). */
  problems: string[];
}

let current: Services | null = null;

export function initServices(s: Services): void {
  current = s;
  s.audio.setVolumes(s.save.settings.musicVolume, s.save.settings.sfxVolume);
}

export function svc(): Services {
  if (!current) throw new Error('Services used before boot');
  return current;
}

/** Writes the save to storage and re-applies audio settings. */
export function persist(): void {
  const s = svc();
  writeSave(s.storage, s.save);
  s.audio.setVolumes(s.save.settings.musicVolume, s.save.settings.sfxVolume);
}
