/** Finale encounters and the story rooms of "Lawnmower Dog". */
import type { ContentId, EncounterDef, EnemySelf, PropHandle, RoomScriptDef, Vec } from '../../../engine/types';
import { LAWNMOWER_DOG } from '../../balance';
import { LINES } from './dialogue';
import { inceptorScene, inceptScene, jerryCaught, snufflesWins, terryFallsAsleep } from './scenes';

const S01E02 = 'S01E02' as const;

// ---- Prologue: into Goldenfold's head --------------------------------------------------------------

export const dreamDive: EncounterDef = {
  id: 'dog-dream-dive',
  name: 'Sweet Dreams, Mr. Goldenfold',
  firstAppears: S01E02,
  canon: true,
  template: 'dog-goldenfold-bedroom',
  script: (api) => {
    let started = false;
    let snore = 3;
    let bed: Vec | null = null;
    return {
      onEnter() {
        bed = api.room.markers('Q')[0] ?? { x: api.room.widthPx / 2, y: 120 };
        api.addProp({ art: 'goldenfold-bed', x: bed.x, y: bed.y + 30, solid: true, radius: 40, actor: 'goldenfold' });
        api.setObjective('Sneak up to Mr. Goldenfold. Hold Shift on the creaky boards.');
      },
      update(dt) {
        if (started || !bed) return;
        snore -= dt;
        if (snore <= 0) {
          snore = 4.5;
          api.say('goldenfold', api.rng.pick(LINES.goldenfold.snore), 2);
        }
        if (Math.hypot(api.player.x - bed.x, api.player.y - (bed.y + 60)) > 110) return;
        started = true;
        api.setObjective(null);
        api.hint(null);
        const device = { x: bed.x + 110, y: bed.y + 70 };
        api.actScene(
          [{ kind: 'enter', who: 'rick', via: 'door', to: { x: device.x + 40, y: device.y } }, ...inceptorScene(device, () => api.addProp({ art: 'dream-inceptor', x: device.x, y: device.y + 16 }))],
          () => api.endAct(),
        );
      },
    };
  },
};

// ---- Act 2 finale: the chase into Terry's house ----------------------------------------------------

/** What pours through the doors while Terry chases Morty down his own hall. */
const CHASE_SPAWNS: ContentId[] = ['counting-sheep', 'twirl-dancer', 'windup-soldier', 'teddy-bruiser'];

export const terryChase: EncounterDef = {
  id: 'dog-terry-chase',
  name: "Scary Terry's House",
  firstAppears: S01E02,
  canon: true,
  template: 'dream-terry-house',
  music: 'dog-terry',
  script: (api) => {
    const C = LAWNMOWER_DOG.chase;
    let active = false;
    let done = false;
    let closing = false;
    let spawnTimer = 1.5;
    let terry: EnemySelf | null = null;
    const entries = api.room.markers('D');
    const exit = api.room.markers('X')[0];

    const bringTerry = () => {
      const p = { x: Math.max(80, api.player.x - 260), y: api.player.y };
      terry = api.spawnEnemy('scary-terry', p.x, p.y, { delay: 0.5 });
      if (terry) terry.memory.say = LINES.terry.back;
    };

    return {
      onEnter() {
        if (api.room.cleared) return;
        active = true;
        api.lockDoors();
        api.setTimer(C.seconds, 'TERRY IS CLOSING IN');
        api.setObjective("Run for Terry's bedroom!");
        api.say('rick', LINES.rick.terryHouse, 3);
        api.after(1.2, bringTerry);
      },
      update(dt) {
        if (!active) return;
        if (!closing && api.timerLeft() <= 0) {
          closing = true;
          api.setTimer(null);
          api.sfx('alarm');
          api.toast("The whole dream is closing in! Run!", { color: 0xff4a3d, seconds: 2.5 });
        }
        if (!terry?.alive && !done) bringTerry();
        spawnTimer -= dt;
        if (spawnTimer <= 0) {
          spawnTimer = closing ? C.spawnEvery * 0.5 : C.spawnEvery;
          const near = entries.filter((d) => Math.abs(d.x - api.player.x) > 110 && Math.abs(d.x - api.player.x) < 720);
          if (near.length && api.enemyCount() < C.maxEnemies) {
            const d = api.rng.pick(near);
            api.spawnEnemy(api.rng.pick(CHASE_SPAWNS), d.x, d.y, { delay: 0.5 });
          }
        }
        if (exit && !done && Math.hypot(api.player.x - exit.x, api.player.y - exit.y) < 70) {
          done = true;
          active = false;
          api.setTimer(null);
          api.setObjective(null);
          api.clearEnemies();
          api.actScene(
            terryFallsAsleep(exit, () => api.addProp({ art: 'terry-bed', x: exit.x, y: exit.y + 30, solid: true, radius: 40 })),
            () => api.completeStage(),
          );
        }
      },
    };
  },
};

// ---- Act 3 finale: back up through every dream, with Terry ---------------------------------------

const LAYERS: { name: string; enemies: ContentId[]; color: number }[] = [
  { name: "The little girl's dream", enemies: ['twirl-dancer', 'windup-soldier', 'jack-in-the-box', 'teddy-bruiser'], color: 0xf8c4dc },
  { name: "The centaur's dream", enemies: ['counting-sheep', 'counting-sheep', 'tea-party-doll', 'music-box'], color: 0xbfe4a0 },
  { name: "Mrs. Pancakes' dream", enemies: ['mocking-kid', 'laughing-mouth', 'counting-sheep', 'windup-soldier'], color: 0xff7ae3 },
  { name: "Goldenfold's dream", enemies: ['dream-passenger', 'dream-soldier', 'flight-attendant', 'snack-cart'], color: 0xc58bff },
];

export const dreamClimb: EncounterDef = {
  id: 'dog-dream-climb',
  name: 'The Climb Back Up',
  firstAppears: S01E02,
  canon: true,
  template: 'dream-climb',
  script: (api) => {
    const C = LAWNMOWER_DOG.climb;
    let layer = -1;
    let active = false;
    let finished = false;
    let rally = 6;
    const entries = api.room.markers('D');

    const nextLayer = () => {
      layer++;
      if (layer >= LAYERS.length) {
        finish();
        return;
      }
      const L = LAYERS[layer];
      api.flash(L.color, 220);
      api.sfx('portal');
      api.toast(L.name, { color: L.color, banner: true, sub: `Climbing up: ${layer + 1} of ${LAYERS.length}` });
      api.setObjective(`Climb back up through the dreams (${layer + 1}/${LAYERS.length})`);
      const n = api.rng.int(C.waveSize[0], C.waveSize[1]);
      const spots = api.rng.shuffle([...entries]);
      for (let i = 0; i < n; i++) {
        const d = spots[i % spots.length];
        if (d && api.enemyCount() < C.maxEnemies) api.spawnEnemy(api.rng.pick(L.enemies), d.x, d.y, { delay: 0.7 + i * 0.15 });
      }
    };

    const finish = () => {
      finished = true;
      active = false;
      api.setObjective(null);
      api.actScene(inceptScene(api), () => {
        // Terry heads home to his own dream.
        api.removeItem('scary-terry-ally');
        api.endAct();
      });
    };

    return {
      onEnter() {
        if (api.room.cleared) return;
        active = true;
        api.lockDoors();
        api.giveItem('scary-terry-ally');
        api.say('rick', LINES.rick.climb, 3);
        api.after(2.2, nextLayer);
      },
      update(dt) {
        if (!active || finished || layer < 0) return;
        rally -= dt;
        if (rally <= 0) {
          rally = 9;
          api.say('scary-terry', api.rng.pick(LINES.terry.ally), 2);
        }
        if (api.enemyCount() === 0) {
          active = false;
          api.after(1.2, () => {
            active = true;
            nextLayer();
          });
        }
      },
    };
  },
};

// ---- Interlude 1: Jerry vs. an ever-smarter Snuffles ----------------------------------------------

export const snufflesSmarter: EncounterDef = {
  id: 'dog-snuffles-smarter',
  name: 'Meanwhile: Good Boy?',
  firstAppears: S01E02,
  canon: true,
  template: 'dog-jerry-living-room',
  script: (api) => {
    const need = LAWNMOWER_DOG.jerryCatches;
    let dog: EnemySelf | null = null;
    let caught = 0;
    let cooldown = 0;
    let over = false;
    const tv = api.room.markers('V')[0] ?? { x: api.room.widthPx / 2, y: 90 };

    const objective = () => api.setObjective(`Catch Snuffles and get that helmet off him (${caught}/${need})`);

    const onCatch = () => {
      if (!dog) return;
      caught++;
      cooldown = 1.2;
      api.sfx('pickup');
      api.shake(4, 150);
      if (caught >= need) {
        over = true;
        const at = { x: dog.x, y: dog.y };
        dog.despawn();
        dog = null;
        api.setObjective(null);
        api.actScene(snufflesWins(at, tv), () => api.endAct());
        return;
      }
      // Smarter every time: a slip, a speaker, a robot arm.
      dog.memory.say = LINES.snuffles.smarter[caught];
      dog.memory.speed = 0.7 + caught * 0.25;
      const far = api.room.randomFloorPoint(api.rng, 320);
      api.vfx({ kind: 'burst', style: 'smoke', x: dog.x, y: dog.y - 10, count: 10 });
      dog.teleport(far.x, far.y);
      api.say('jerry', LINES.jerry.tricks[(caught - 1) % LINES.jerry.tricks.length], 2);
      objective();
    };

    return {
      onEnter() {
        const place = (ch: string, art: string, solid = true) => {
          for (const p of api.room.markers(ch)) api.addProp({ art, x: p.x, y: p.y + 20, solid, radius: 22 });
        };
        place('c', 'smith-couch');
        place('V', 'dog-tv');
        place('b', 'battery-box', false);
        if (api.room.cleared || over) return;
        const n = api.room.markers('N')[0] ?? { x: api.room.widthPx / 2, y: api.room.heightPx / 2 };
        dog = api.spawnEnemy('snuffles-dodger', n.x, n.y);
        if (dog) dog.memory.say = LINES.snuffles.arm;
        api.after(0.8, () => api.say('jerry', LINES.jerry.newspaper, 2.6));
        api.after(3.6, () => api.say('jerry', LINES.jerry.catchHim, 2.4));
        api.hint('Walk into Snuffles to grab him. He\'s faster every time.');
        api.after(6, () => api.hint(null));
        objective();
      },
      update(dt) {
        if (!dog?.alive || over) return;
        cooldown = Math.max(0, cooldown - dt);
        if (cooldown <= 0 && Math.hypot(api.player.x - dog.x, api.player.y - dog.y) < 40) onCatch();
      },
    };
  },
};

// ---- Interlude 2: Jerry gets caught ----------------------------------------------------------------

export const jerryCaptured: EncounterDef = {
  id: 'dog-jerry-captured',
  name: 'Meanwhile: The Checkpoint',
  firstAppears: S01E02,
  canon: true,
  template: 'dog-kennel-gate',
  script: (api) => {
    let caught = false;
    let clock = 5;
    const gate = api.room.markers('X')[0];
    const nab = () => {
      if (caught) return;
      caught = true;
      api.setObjective(null);
      api.sfx('alarm');
      api.flash(0xff3040, 200);
      api.actScene(jerryCaught(), () => api.endAct());
    };
    return {
      onEnter() {
        if (gate) api.addProp({ art: 'dog-checkpoint', x: gate.x, y: gate.y + 30 });
        for (const p of api.room.markers('A')) api.spawnEnemy('dog-trooper', p.x, p.y, { passive: true });
        api.setObjective('The last checkpoint. Easy, Jerry...');
      },
      update(dt) {
        if (caught) return;
        clock -= dt;
        const atGate = gate && Math.hypot(api.player.x - gate.x, api.player.y - gate.y) < 120;
        // It's canon: he doesn't get past this one.
        if (atGate || clock <= 0) nab();
      },
    };
  },
};

export const DOG_ENCOUNTERS: EncounterDef[] = [dreamDive, terryChase, dreamClimb, snufflesSmarter, jerryCaptured];

// ---- Fixed-layout rooms ----------------------------------------------------------------------------

export const DOG_SCRIPTS: RoomScriptDef[] = [
  {
    // After the helmet scene (the prologue's opening), the family stays put.
    id: 'dog-living-room',
    script: (api) => ({
      onEnter(first) {
        for (const p of api.room.markers('c')) api.addProp({ art: 'smith-couch', x: p.x + 28, y: p.y + 20, solid: true, radius: 30 });
        if (first) {
          api.after(0.5, () => api.hint('Head east (right) to the garage.'));
          return;
        }
        const place = (ch: string, art: string, actor: string) => {
          for (const p of api.room.markers(ch)) api.addProp({ art, x: p.x, y: p.y + 20, actor });
        };
        place('J', 'jerry', 'jerry');
        place('N', 'snuffles-helmet', 'snuffles');
      },
      onExit() {
        api.hint(null);
      },
    }),
  },
  {
    // Rick's ship: the way to Goldenfold's house across town.
    id: 'dog-garage',
    script: (api) => {
      let ship: PropHandle | null = null;
      return {
        onEnter(first) {
          const r = api.room.markers('R')[0];
          if (r) api.addProp({ art: 'rick', x: r.x, y: r.y + 22, actor: 'rick' });
          const c = api.room.markers('C')[0];
          if (c) {
            ship = api.addProp({
              art: 'flying-car',
              x: c.x,
              y: c.y + 34,
              solid: true,
              radius: 46,
              interact: { label: "Fly to Goldenfold's house", fn: () => ship && api.travelTo({ x: 0, y: 2 }, 'ship', ship) },
            });
            ship.pulse();
          }
          if (first) api.after(0.6, () => api.say('rick', LINES.rick.shipPrompt, 3));
        },
      };
    },
  },
  {
    id: 'dog-goldenfold-hall',
    script: (api) => ({
      onEnter(first) {
        if (!first) return;
        api.toast("Goldenfold's house. Later that night.", { color: 0x9fc9f0, seconds: 2.6 });
        api.after(1, () => api.say('rick', LINES.rick.sneak, 3));
        api.setObjective("Sneak through Goldenfold's house to his bedroom.");
      },
      onExit() {
        api.setObjective(null);
      },
    }),
  },
  {
    // Snowball's world: Morty's luxury suite.
    id: 'dog-luxury-suite',
    script: (api) => ({
      onEnter() {
        const b = api.room.markers('B')[0];
        if (b) api.addProp({ art: 'luxury-bed', x: b.x, y: b.y + 24, solid: true, radius: 36, persist: false });
        for (const p of api.room.markers('k')) api.addProp({ art: 'golden-bowl', x: p.x, y: p.y + 10 });
      },
    }),
  },
];
