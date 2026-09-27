/** Finale encounters and the story rooms of the Pilot. */
import { TILE } from '../../../engine/constants';
import type { Rng } from '../../../engine/rng';
import type { EncounterDef, EnemySelf, PropHandle, RoomScriptDef, Vec } from '../../../engine/types';
import { ECONOMY, PILOT } from '../../balance';
import { DEFUSE_STEPS, EPILOGUE_QUESTIONS, LINES, type DefuseStep } from './dialogue';
import { CUSTOMS_AGENTS } from './enemies';

const S01E01 = 'S01E01' as const;

// ---- Prologue: defuse the neutrino bomb ----------------------------------------------------------

function shuffled(step: DefuseStep, rng: Rng): DefuseStep {
  const answer = step.options[step.correct];
  const options = rng.shuffle([...step.options]);
  return { ...step, options, correct: options.indexOf(answer) };
}

export const bombDefuse: EncounterDef = {
  id: 'pilot-bomb-defuse',
  name: 'Just a Test',
  firstAppears: S01E01,
  canon: true,
  template: 'pilot-cockpit',
  script: (api) => {
    const B = PILOT.bombDefuse;
    let armed = false;
    let defusing = false;
    let done = false;
    let step = 0;
    let steps: DefuseStep[] = [];
    let snore = 3;
    let bomb: PropHandle | null = null;
    const pick = () => api.rng.shuffle([...DEFUSE_STEPS]).slice(0, 3).map((s) => shuffled(s, api.rng));

    const reset = (why: string) => {
      defusing = false;
      step = 0;
      steps = pick();
      api.hideChoice();
      api.sfx('fizzle');
      api.toast(why, { color: 0xff8a3d, seconds: 2.4 });
      api.setTimer(B.seconds, 'BOMB');
      api.say('rick', LINES.rick.defuseReset, 2.2);
    };

    const success = () => {
      done = true;
      armed = false;
      defusing = false;
      api.setTimer(null);
      api.setObjective(null);
      api.hint(null);
      bomb?.setArt('neutrino-bomb-off');
      bomb?.setInteract(null);
      api.sfx('victory');
      api.toast('Neutrino bomb defused!', { color: 0x97ce4c, banner: true, sub: 'Humanity lives. For now.' });
      api.say('rick', LINES.rick.defused, 2.5);
      api.after(3, () => api.endAct());
    };

    const ask = () => {
      const s = steps[step];
      api.showChoice({
        title: `Defuse step ${step + 1} of ${steps.length}`,
        question: s.mumble,
        options: s.options,
        correct: s.correct,
        speaker: 'rick',
        onAnswer: (i) => {
          if (!defusing) return;
          if (i === s.correct) {
            api.sfx('correct');
            step++;
            if (step >= steps.length) success();
            else ask();
            return;
          }
          api.sfx('spark');
          api.shake(6, 150);
          const left = api.timerLeft() - B.wrongPenalty;
          if (left <= 0) {
            reset('Zzzt! The bomb fizzles and re-arms itself. Try again!');
            return;
          }
          api.setTimer(left, 'BOMB');
          api.toast('Zzzt! Wrong one!', { color: 0xff8a3d, seconds: 1.4 });
          ask();
        },
      });
    };

    return {
      onEnter(first) {
        const r = api.room.markers('R')[0];
        const b = api.room.markers('B')[0];
        if (r) api.addProp({ art: 'rick-sleeping', x: r.x, y: r.y + 18, actor: 'rick' });
        if (b) {
          bomb = api.addProp({
            art: done ? 'neutrino-bomb-off' : 'neutrino-bomb',
            x: b.x,
            y: b.y + 22,
            solid: true,
            radius: 24,
            interact: done
              ? undefined
              : {
                  label: 'Defuse the neutrino bomb',
                  fn: () => {
                    if (!armed || defusing) return;
                    defusing = true;
                    api.hint(null);
                    ask();
                  },
                },
          });
        }
        if (!first || done) return;
        api.lockDoors();
        api.playCutscene('pilot-flight', () => {
          armed = true;
          steps = pick();
          api.setTimer(B.seconds, 'BOMB');
          api.setObjective('Defuse the neutrino bomb before it goes off!');
          api.hint('Walk up to the bomb and press E. Rick is mumbling instructions in his sleep.');
        });
      },
      update(dt) {
        if (!armed || done) return;
        snore -= dt;
        if (snore <= 0) {
          snore = 5;
          if (!defusing) api.say('rick', api.rng.pick(LINES.rick.sleeping), 2);
        }
        if (api.timerLeft() <= 0) reset('The bomb fizzles and re-arms itself. Try again!');
      },
      onExit() {
        api.hideChoice();
      },
    };
  },
};

// ---- Act 2 finale: the Big Mega Tree -------------------------------------------------------------

interface Fruit {
  pos: Vec;
  prop: PropHandle;
  taken: boolean;
  respawnAt: number;
}

export const bigMegaTree: EncounterDef = {
  id: 'pilot-big-mega-tree',
  name: 'The Big Mega Tree',
  firstAppears: S01E01,
  canon: true,
  template: '35c-big-tree',
  script: (api) => {
    const W = PILOT.bigMegaTree;
    const fruits: Fruit[] = [];
    const thieves: { e: EnemySelf; fruit: Fruit }[] = [];
    let active = false;
    let waveTimer = 2;
    let waves = 0;
    const count = () => (api.flags.megaFruit as number | undefined) ?? 0;
    const setObjective = () => api.setObjective(`Harvest the Mega Fruit: ${Math.min(count(), W.fruit)}/${W.fruit}`);

    const harvest = (f: Fruit) => {
      if (f.taken) return;
      f.taken = true;
      f.prop.setVisible(false);
      f.prop.setInteract(null);
      api.flags.megaFruit = count() + 1;
      api.player.heal(1);
      api.sfx('pickup');
      setObjective();
    };
    const restore = (f: Fruit) => {
      f.taken = false;
      f.respawnAt = 0;
      f.prop.setVisible(true);
      f.prop.setInteract({ label: 'Harvest Mega Fruit', fn: () => harvest(f) });
    };

    const edgePoint = (): Vec => {
      const rows = Math.round(api.room.heightPx / TILE) - 2;
      const cols = Math.round(api.room.widthPx / TILE) - 2;
      for (let i = 0; i < 12; i++) {
        const p = api.room.tileCenter(api.rng.pick([0, 1, cols - 2, cols - 1]), api.rng.int(0, rows - 1));
        if (Math.hypot(p.x - api.player.x, p.y - api.player.y) > 220) return p;
      }
      return api.room.tileCenter(0, 0);
    };

    return {
      onEnter(first) {
        for (const b of api.room.markers('B')) api.addProp({ art: 'battery-pad', x: b.x, y: b.y + 12, depth: -300 });
        if (api.room.cleared) return;
        api.flags.megaFruit = 0;
        for (const p of api.room.markers('F')) {
          const f: Fruit = { pos: p, taken: false, respawnAt: 0, prop: null as unknown as PropHandle };
          f.prop = api.addProp({ art: 'mega-fruit-hanging', x: p.x, y: p.y + 22, interact: { label: 'Harvest Mega Fruit', fn: () => harvest(f) } });
          fruits.push(f);
        }
        active = true;
        api.lockDoors();
        setObjective();
        api.hint('Shoes ON (F) to climb. Stand on green pads to recharge. Grab all three Mega Fruit!');
        api.after(8, () => api.hint(null));
        if (first) api.say('rick', LINES.rick.bigTree, 3.5);
      },
      update(dt) {
        if (!active) return;
        waveTimer -= dt;
        if (waveTimer <= 0) {
          waveTimer = W.waveEvery;
          waves++;
          const n = api.rng.int(2, 3);
          for (let i = 0; i < n; i++) {
            if (api.enemyCount() >= W.maxEnemies) break;
            const snatch = i === 0 && waves % 2 === 0;
            const p = edgePoint();
            const e = api.spawnEnemy(snatch ? 'fruit-snatcher' : api.randomEnemy(), p.x, p.y);
            if (e && e.def.id === 'fruit-snatcher') {
              const target = fruits.find((f) => !f.taken && !thieves.some((t) => t.fruit === f));
              if (target) {
                e.memory.target = target.pos;
                thieves.push({ e, fruit: target });
              }
            }
          }
        }
        for (const t of [...thieves]) {
          const mem = t.e.memory;
          if (mem.grabbed && !t.fruit.taken) {
            t.fruit.taken = true;
            t.fruit.prop.setVisible(false);
            t.fruit.prop.setInteract(null);
            api.toast('A Fruit Snatcher grabbed a Mega Fruit! Take it back!', { color: 0xff8a3d, seconds: 2.2 });
          }
          if (!t.e.alive) {
            if (mem.escaped) t.fruit.respawnAt = api.now() + 8;
            else if (mem.grabbed) api.spawnPickup('mega-fruit', t.e.x, t.e.y);
            thieves.splice(thieves.indexOf(t), 1);
          }
        }
        for (const f of fruits) if (f.taken && f.respawnAt && api.now() >= f.respawnAt) restore(f);
        setObjective();
        if (count() >= W.fruit) {
          active = false;
          api.clearEnemies();
          api.setObjective(null);
          api.hint(null);
          api.sfx('victory');
          api.toast('Mega Fruit harvested!', { color: 0x97ce4c, banner: true, sub: 'Rick pockets the seeds. That was the easy part.' });
          api.completeStage();
        }
      },
    };
  },
};

// ---- Act 3 finale, part 2: the escape ------------------------------------------------------------

export const customsEscape: EncounterDef = {
  id: 'pilot-customs-escape',
  name: 'The Departure Hall',
  firstAppears: S01E01,
  canon: true,
  template: 'customs-escape',
  script: (api) => {
    const E = PILOT.escape;
    let active = false;
    let lockdown = false;
    let finished = false;
    let spawnTimer = 1.2;
    const entries = api.room.markers('D');
    const exit = api.room.markers('X')[0];
    return {
      onEnter() {
        if (exit) api.addProp({ art: 'exit-departure', x: exit.x, y: exit.y + 40 });
        active = true;
        api.setTimer(E.seconds, 'PORTAL CLOSING');
        api.setObjective('Run for the portal home!');
        api.say('rick', LINES.rick.escape, 3);
      },
      update(dt) {
        if (!active) return;
        if (!lockdown && api.timerLeft() <= 0) {
          lockdown = true;
          api.setTimer(null);
          api.sfx('alarm');
          api.toast('LOCKDOWN! Reinforcements everywhere!', { color: 0xff4a3d, seconds: 2.5 });
        }
        spawnTimer -= dt;
        if (spawnTimer <= 0) {
          spawnTimer = lockdown ? E.lockdownSpawnEvery : E.spawnEvery;
          const near = entries.filter((d) => Math.abs(d.x - api.player.x) > 110 && Math.abs(d.x - api.player.x) < 720);
          if (near.length && api.enemyCount() < 14) {
            const d = api.rng.pick(near);
            api.spawnEnemy(api.rng.pick(CUSTOMS_AGENTS), d.x, d.y, { delay: 0.5 });
          }
        }
        if (exit && !finished && Math.hypot(api.player.x - exit.x, api.player.y - exit.y) < 64) {
          finished = true;
          active = false;
          api.flags.robotReveal = true;
          for (const e of api.enemies()) api.freeze(e, 8);
          api.setTimer(null);
          api.setObjective(null);
          api.player.setControlLocked(true);
          api.say('rick', LINES.rick.notRobots, 2.6);
          api.after(2.4, () => {
            api.player.setControlLocked(false);
            api.endAct();
          });
        }
      },
    };
  },
};

// ---- Epilogue: temporarily a genius --------------------------------------------------------------

export const epilogue: EncounterDef = {
  id: 'pilot-epilogue',
  name: 'Temporarily a Genius',
  firstAppears: S01E01,
  canon: true,
  template: 'pilot-living-room',
  script: (api) => {
    const sideEffects = () => {
      api.setObjective(null);
      api.applyStatus('motor-failure');
      api.hint('Uh oh. The side effects. Try to walk it off!');
      const ramble = LINES.rick.ramble;
      ramble.forEach((line, i) => api.after(i * 1.9, () => api.say('rick', line, 2.3)));
      api.after(ramble.length * 1.9 + 1.2, () => {
        api.hint(null);
        api.endAct();
      });
    };
    const ask = (i: number) => {
      const Q = EPILOGUE_QUESTIONS[i];
      const answer = Q.options[0];
      const options = api.rng.shuffle([...Q.options]);
      const correct = options.indexOf(answer);
      api.showChoice({
        title: 'Seed-powered genius (the right answer glows)',
        question: Q.q,
        options,
        correct,
        glowCorrect: true,
        speaker: 'rick',
        onAnswer: (a) => {
          if (a === correct) {
            api.sfx('correct');
            api.addScrap(ECONOMY.quizBonus, api.player.x, api.player.y);
            if (i === 0) api.say('beth', LINES.beth.quizRight, 2.4);
            else api.say('jerry', LINES.jerry.quizRight, 2.4);
          } else {
            api.sfx('wrong');
            api.say('rick', LINES.rick.quizMiss, 2.4);
          }
          if (i + 1 < EPILOGUE_QUESTIONS.length) api.after(2, () => ask(i + 1));
          else api.after(2.2, sideEffects);
        },
      });
    };
    return {
      onEnter(first) {
        const place = (ch: string, art: string, actor?: string) => {
          for (const p of api.room.markers(ch)) api.addProp({ art, x: p.x, y: p.y + 20, solid: true, radius: 16, actor });
        };
        place('J', 'jerry', 'jerry');
        place('H', 'beth', 'beth');
        place('U', 'summer', 'summer');
        place('R', 'rick', 'rick');
        place('b', 'moving-box');
        if (!first) return;
        api.playCutscene('pilot-epilogue-packing', () => {
          api.setObjective("Rick's quiz. You're seed-smart right now.");
          api.after(0.6, () => ask(0));
        });
      },
      onExit() {
        api.hideChoice();
      },
    };
  },
};

export const PILOT_ENCOUNTERS: EncounterDef[] = [bombDefuse, bigMegaTree, customsEscape, epilogue];

// ---- Prologue rooms before the finale ------------------------------------------------------------

export const PILOT_SCRIPTS: RoomScriptDef[] = [
  {
    id: 'pilot-bedroom',
    script: (api) => ({
      onEnter(first) {
        const r = api.room.markers('R')[0];
        if (r) api.addProp({ art: 'rick', x: r.x, y: r.y + 22, actor: 'rick' });
        if (!first) return;
        api.after(0.8, () => api.say('rick', LINES.rick.wakeUp, 3.4));
        api.hint('WASD to move. Head east (right) to the garage.');
      },
      onExit() {
        api.hint(null);
      },
    }),
  },
  {
    id: 'pilot-garage',
    script: (api) => ({
      onEnter(first) {
        const c = api.room.markers('C')[0];
        if (c) api.addProp({ art: 'flying-car', x: c.x, y: c.y + 34, solid: true, radius: 46 });
        const r = api.room.markers('R')[0];
        if (r) api.addProp({ art: 'rick', x: r.x, y: r.y + 22, actor: 'rick' });
        if (api.room.cleared) return;
        // Rick yells at Morty to throw stuff; the junk sails over, then the drones power up.
        api.giveActWeapon();
        for (const p of api.room.markers('T')) api.spawnEnemy('junk-drone', p.x, p.y, { delay: first ? 2.2 : 0.8 });
        if (first) api.hint('Aim with the mouse and left click to throw (or use the arrow keys). Space to dash.');
      },
      onEnemiesCleared() {
        api.hint('Nice. Now get in the car: head east.');
        api.say('rick', LINES.rick.getInTheCar, 3);
        return false;
      },
      onExit() {
        api.hint(null);
      },
    }),
  },
];
