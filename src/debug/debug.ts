/**
 * Debug tools, only with ?debug=1: a small DOM panel (FPS, hitboxes, god mode, jump to an act or
 * room, spawn items and enemies, reveal the map, restart with a seed) and window.rickStars for
 * scripted testing.
 */
import type Phaser from 'phaser';
import { createSeed, normalizeSeed } from '../engine/rng';
import { svc } from '../engine/services';
import type { RunScene } from '../scenes/RunScene';
import { openCharacterSheet } from './CharacterSheetScene';

export interface DebugApi {
  game?: Phaser.Game;
  run(): RunScene | null;
  startRun(opts?: { seed?: string; act?: number; episode?: string; playPrologue?: boolean }): void;
  /** Every character's portrait and world sprite side by side. */
  characterSheet(): void;
  [key: string]: unknown;
}

declare global {
  interface Window {
    rickStars?: DebugApi;
  }
}

let current: RunScene | null = null;
let panel: HTMLDivElement | null = null;

export function ensureDebugApi(game?: Phaser.Game): DebugApi {
  const api: DebugApi = window.rickStars ?? {
    run: () => current,
    startRun: () => undefined,
    characterSheet: () => undefined,
  };
  if (game) api.game = game;
  api.run = () => current;
  api.startRun = (opts = {}) => {
    const g = api.game;
    if (!g) return;
    for (const key of ['Run', 'Hud', 'Cutscene', 'Pause', 'GameOver', 'Title', 'Garage', 'SeasonMap']) if (g.scene.isActive(key)) g.scene.stop(key);
    g.scene.start('Run', { episodeId: opts.episode ?? 'S01E01', seed: opts.seed ?? createSeed(), startAct: opts.act, playPrologue: opts.playPrologue });
  };
  api.characterSheet = () => {
    if (api.game) openCharacterSheet(api.game);
  };
  window.rickStars = api;
  return api;
}

export function installDebug(scene: RunScene): void {
  current = scene;
  const api = ensureDebugApi();
  Object.assign(api, {
    killAll: () => current?.debugKillAll(),
    gotoRoom: (id: number) => current?.debugGotoRoom(id),
    gotoAct: (i: number) => current?.debugGotoAct(i),
    finishStage: () => current?.debugFinishStage(),
    useExit: () => current?.debugUseExit(),
    reveal: () => current?.debugRevealMap(),
    god: (on = true) => {
      if (current) current.godModeOn = on;
    },
    give: (id: string) => current?.giveItem(id),
    spawn: (id: string, elite = false) => current?.debugSpawnEnemy(id, elite),
    meter: () => current?.debugAddMeter(),
    state: () => current?.debugState(),
    stress: (enemies = 40, shots = 200) => {
      const s = current;
      if (!s) return;
      const ids = [...svc().registry.enemies.values()].filter((e) => !e.boss && e.speed > 0).map((e) => e.id);
      for (let i = 0; i < enemies; i++) s.debugSpawnEnemy(ids[i % ids.length]);
      s.debugSpawnShots(shots);
    },
    fps: () => current?.game.loop.actualFps ?? 0,
    slowMo: (factor = 0.1, seconds = 3) => current?.slowMo(factor, seconds),
  });
  buildPanel();
  refreshSelects();
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text) e.textContent = text;
  return e;
}

let fpsLabel: HTMLSpanElement;
let actSelect: HTMLSelectElement;
let roomSelect: HTMLSelectElement;
let itemSelect: HTMLSelectElement;
let enemySelect: HTMLSelectElement;

function buildPanel(): void {
  if (panel) return;
  panel = el('div', {
    style:
      'position:fixed;bottom:8px;left:8px;z-index:9999;background:rgba(20,15,31,.9);color:#fff;font:12px monospace;padding:8px;border:2px solid #97ce4c;border-radius:8px;max-width:300px;display:flex;flex-direction:column;gap:4px',
  });
  const header = el('div', { style: 'display:flex;justify-content:space-between;cursor:pointer' });
  header.append(el('b', {}, 'DEBUG'));
  fpsLabel = el('span', {}, 'FPS -');
  header.append(fpsLabel);
  // Collapsed by default so it doesn't cover the HUD; click the header to open it.
  const body = el('div', { style: 'display:none;flex-direction:column;gap:4px' });
  header.onclick = () => (body.style.display = body.style.display === 'none' ? 'flex' : 'none');
  panel.append(header, body);

  const row = (...children: HTMLElement[]) => {
    const r = el('div', { style: 'display:flex;gap:4px;align-items:center' });
    r.append(...children);
    body.append(r);
  };
  const button = (label: string, fn: () => void) => {
    const b = el('button', { style: 'font:11px monospace;cursor:pointer' }, label);
    b.onclick = (e) => {
      e.stopPropagation();
      fn();
      (b as HTMLButtonElement).blur();
    };
    return b;
  };
  const check = (label: string, fn: (on: boolean) => void) => {
    const wrap = el('label', { style: 'display:flex;gap:2px;align-items:center' });
    const c = el('input', { type: 'checkbox' });
    c.onchange = () => fn((c as HTMLInputElement).checked);
    wrap.append(c, document.createTextNode(label));
    return wrap;
  };
  const api = () => window.rickStars as DebugApi & Record<string, (...a: unknown[]) => unknown>;

  row(
    check('God mode', (on) => api().god(on)),
    check('Hitboxes', (on) => {
      const s = current;
      if (!s) return;
      const world = s.physics.world;
      if (!world.debugGraphic) world.createDebugGraphic();
      world.drawDebug = on;
      world.debugGraphic.clear();
      world.debugGraphic.setVisible(on);
    }),
  );
  actSelect = el('select');
  row(actSelect, button('Go to act', () => api().gotoAct(Number(actSelect.value))));
  roomSelect = el('select');
  row(roomSelect, button('Go to room', () => api().gotoRoom(Number(roomSelect.value))), button('Reveal map', () => api().reveal()));
  itemSelect = el('select', { style: 'max-width:170px' });
  row(itemSelect, button('Give', () => api().give(itemSelect.value)));
  enemySelect = el('select', { style: 'max-width:170px' });
  row(enemySelect, button('Spawn', () => api().spawn(enemySelect.value, false)), button('Elite', () => api().spawn(enemySelect.value, true)));
  row(button('Kill all', () => api().killAll()), button('Finish stage', () => api().finishStage()), button('Rick meter', () => api().meter()));
  row(button('Use exit', () => api().useExit()), button('Stress test', () => api().stress(40, 200)), button('Refresh lists', () => refreshSelects()));
  row(button('Character sheet', () => api().characterSheet()));
  const seed = el('input', { placeholder: 'SEED (8 chars)', style: 'width:110px;font:11px monospace' });
  row(
    seed,
    button('Restart run', () => {
      const s = normalizeSeed((seed as HTMLInputElement).value) ?? createSeed();
      api().startRun({ seed: s });
    }),
  );
  // Keep typing in the panel from steering Morty.
  panel.addEventListener('keydown', (e) => e.stopPropagation());
  document.body.append(panel);
  setInterval(() => {
    fpsLabel.textContent = `FPS ${Math.round(current?.game.loop.actualFps ?? 0)}`;
  }, 300);
}

function refreshSelects(): void {
  const s = current;
  if (!s || !actSelect) return;
  const reg = svc().registry;
  actSelect.innerHTML = '';
  s.run.sequence.forEach((a, i) => actSelect.append(el('option', { value: String(i) }, `${i}: ${a.name}`)));
  roomSelect.innerHTML = '';
  (s.run.floor?.rooms ?? []).forEach((r) => roomSelect.append(el('option', { value: String(r.id) }, `${r.id}: ${r.kind} (${r.x},${r.y})`)));
  itemSelect.innerHTML = '';
  [...reg.items.values()].forEach((i) => itemSelect.append(el('option', { value: i.id }, i.name)));
  enemySelect.innerHTML = '';
  [...reg.enemies.values()].forEach((e) => enemySelect.append(el('option', { value: e.id }, e.name)));
}
