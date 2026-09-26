/**
 * Rick-Stars: an unofficial, non-commercial Rick and Morty fan roguelite.
 * Boots services (content registry, save file, audio), then starts Phaser.
 */
import Phaser from 'phaser';
import { createRegistry } from './content/registry';
import { AudioManager } from './engine/audio/audio';
import { GAME_HEIGHT, GAME_WIDTH } from './engine/constants';
import { validateRegistry } from './engine/registry';
import { loadSave, MemoryStorage, type SaveStorage } from './engine/save/save';
import { initServices } from './engine/services';
import { ensureDebugApi } from './debug/debug';
import { BootScene } from './scenes/BootScene';
import { CutsceneScene } from './scenes/CutsceneScene';
import { GameOverScene } from './scenes/GameOverScene';
import { GarageScene } from './scenes/GarageScene';
import { HudScene } from './scenes/HudScene';
import { PauseScene } from './scenes/PauseScene';
import { RunScene } from './scenes/RunScene';
import { SeasonMapScene } from './scenes/SeasonMapScene';
import { TitleScene } from './scenes/TitleScene';

function storage(): SaveStorage {
  try {
    const s = window.localStorage;
    const probe = 'rick-stars.probe';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return new MemoryStorage();
  }
}

// ?debug=1 on a dev server; #debug where the query string doesn't reach the page (hosted builds).
const debug = new URLSearchParams(window.location.search).get('debug') === '1' || window.location.hash === '#debug';
const registry = createRegistry();
const problems = validateRegistry(registry);
if (problems.length) console.error(`[rick-stars] ${problems.length} content problem(s):\n${problems.join('\n')}`);
const store = storage();
const { data, status } = loadSave(store, { unlocksFor: (id) => registry.episodes.get(id as `S${string}E${string}`)?.unlocksOnClear ?? [] });
if (status === 'reset') console.warn('[rick-stars] The save file could not be read; started fresh (old copy kept as rick-stars.save.backup).');
initServices({ registry, save: data, storage: store, audio: new AudioManager({ music: registry.music, sfx: registry.sfx }), debug, problems });

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#0b0d17',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { debug: false } },
  audio: { noAudio: true },
  render: { antialias: true },
  scene: [BootScene, TitleScene, GarageScene, SeasonMapScene, RunScene, HudScene, CutsceneScene, PauseScene, GameOverScene],
});

if (debug) ensureDebugApi(game);
