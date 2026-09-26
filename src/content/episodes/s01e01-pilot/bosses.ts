/** The Pilot's bosses: Frank Palicky (canon) and the Customs Supervisor (invented). */
import { during } from '../../../engine/brains';
import { TILE } from '../../../engine/constants';
import type { Brain, BrainYield, EnemyApi, EnemyDef, TelegraphSpec } from '../../../engine/types';
import { PILOT } from '../../balance';
import { PILOT_ENEMY_ART as ART } from './art';
import { LINES } from './dialogue';
import { agentNameplate } from './enemies';

const S01E01 = 'S01E01' as const;

// ---- Frank Palicky -------------------------------------------------------------------------------

function* frankSlash(api: EnemyApi, windupMult: number): Brain {
  let angle = api.angleToPlayer();
  yield* api.windup(0.5 * windupMult, () => {
    angle = api.angleToPlayer();
    return { kind: 'arc', x: api.self.x, y: api.self.y, radius: 125, angle, spread: 1.8 };
  });
  api.sfx('slash');
  api.melee({ shape: 'arc', x: api.self.x, y: api.self.y, radius: 125, angle, spread: 1.8, damage: 1, knockback: 320 });
}

/** Returns true if the lunge ended against a wall. */
function* frankLunge(api: EnemyApi, windupMult: number, speed: number): Generator<BrainYield, boolean, undefined> {
  let angle = api.angleToPlayer();
  yield* api.windup(0.6 * windupMult, () => {
    angle = api.angleToPlayer();
    return { kind: 'line', x: api.self.x, y: api.self.y, angle, length: 420, width: 56 };
  });
  api.sfx('slash');
  let hit = false;
  let wall = false;
  let t = 0;
  while (t < 0.32) {
    api.moveAngle(angle, 4.2 * speed);
    if (!hit) hit = api.melee({ shape: 'circle', x: api.self.x, y: api.self.y, radius: api.self.radius + 14, damage: 1, knockback: 380 });
    t += api.dt();
    if (t > 0.08 && api.self.blocked) {
      wall = true;
      break;
    }
    yield;
  }
  api.stop();
  return wall;
}

function* frankLockers(api: EnemyApi, windupMult: number, enraged: boolean): Brain {
  const lockers = api.rng.shuffle([...api.room().markers('L')]).slice(0, enraged ? 4 : 3);
  if (!lockers.length) return;
  const specs: TelegraphSpec[] = lockers.map((p) => ({ kind: 'circle', x: p.x, y: p.y, radius: 46 }));
  api.say(api.rng.pick(LINES.frank.lockers), 1.4);
  yield* api.windup(0.65 * windupMult, specs);
  api.sfx('throw');
  api.shake(6, 160);
  for (const p of lockers) {
    const angle = Math.atan2(api.player.y - p.y, api.player.x - p.x);
    api.shoot({ x: p.x, y: p.y, angle, speed: 330, kind: 'book', radius: 10, count: 3, spread: 0.4 });
  }
}

/** A quick three-hit slash combo (phase 2 and up). */
function* frankFlurry(api: EnemyApi, windupMult: number): Brain {
  for (let i = 0; i < 3; i++) {
    let angle = api.angleToPlayer();
    yield* api.windup(0.4 * windupMult, () => {
      angle = api.angleToPlayer();
      return { kind: 'arc', x: api.self.x, y: api.self.y, radius: 115, angle, spread: 1.5 };
    });
    api.sfx('slash');
    api.melee({ shape: 'arc', x: api.self.x, y: api.self.y, radius: 115, angle, spread: 1.5, damage: 1, knockback: 260 });
    api.moveAngle(angle, 1.6);
    yield 0.12;
    api.stop();
  }
}

/** Throws the switchblade; it spins out and comes back to his hand (phase 3). */
function* frankKnifeThrow(api: EnemyApi, windupMult: number): Brain {
  let angle = api.angleToPlayer();
  yield* api.windup(0.55 * windupMult, () => {
    angle = api.angleToPlayer();
    return { kind: 'line', x: api.self.x, y: api.self.y, angle, length: 460, width: 18 };
  });
  api.sfx('throw');
  api.shoot({ angle, speed: 520, kind: 'bolt', radius: 9, color: 0xdfe6ee, life: 0.85 });
  const back = { x: api.self.x + Math.cos(angle) * 440, y: api.self.y + Math.sin(angle) * 440 };
  yield 0.85;
  api.sfx('throw');
  api.shoot({ x: back.x, y: back.y, angle: Math.atan2(api.self.y - back.y, api.self.x - back.x), speed: 520, kind: 'bolt', radius: 9, color: 0xdfe6ee, life: 0.9 });
}

const FRANK = PILOT.frank;

export const frankBoss: EnemyDef = {
  id: 'frank-palicky',
  name: 'Frank Palicky',
  firstAppears: S01E01,
  canon: true,
  hp: FRANK.hp,
  speed: FRANK.speed,
  radius: 24,
  contactDamage: 1,
  art: ART.frank,
  boss: {
    title: 'Frank Palicky',
    phases: [...FRANK.phases],
    defeatCutscene: 'pilot-frank-frozen',
    reward: 'franks-switchblade',
    onDefeat: (api, at) => api.addProp({ art: 'frank-frozen', x: at.x, y: at.y + 20, solid: true, radius: 22, persist: true }),
  },
  brain: function* (api: EnemyApi): Brain {
    const self = api.self;
    let phase = 1;
    api.say(LINES.frank.intro, 2.4);
    yield 0.8;
    while (true) {
      const next = self.hp / self.maxHp < FRANK.phases[1] ? 3 : self.hp / self.maxHp < FRANK.phases[0] ? 2 : 1;
      if (next > phase) {
        phase = next;
        // Phase change: a roar, and the lockers around the gym burst open.
        api.stop();
        api.say(phase === 2 ? LINES.frank.phase2 : LINES.frank.enraged, 2.2);
        api.sfx('boss-roar');
        api.shake(9, 320);
        yield* frankLockers(api, 0.9, phase === 3);
        yield 0.5;
      }
      const speed = phase === 3 ? 1.35 : phase === 2 ? 1.15 : 1;
      const windupMult = phase === 3 ? 0.8 : phase === 2 ? 0.9 : 1;
      yield* during(api, api.rng.float(0.7, 1.2) / speed, () => api.chase(speed));
      api.stop();
      const roll = api.rng.next();
      if (api.distToPlayer() < 170) {
        if (phase >= 2 && roll < 0.5) {
          yield* frankFlurry(api, windupMult);
          // Out of breath after the flurry.
          yield* api.stagger(FRANK.flurryStagger);
        } else {
          yield* frankSlash(api, windupMult);
        }
      } else if (phase === 3 && roll < 0.3) {
        yield* frankKnifeThrow(api, windupMult);
      } else if (phase >= 2 && roll < 0.55) {
        yield* frankLockers(api, windupMult, phase === 3);
      } else {
        const wall = yield* frankLunge(api, windupMult, speed);
        if (wall) {
          // Slammed into the lockers: dazed for a moment.
          api.sfx('bounce');
          api.shake(7, 180);
          yield* api.stagger(FRANK.wallStagger);
        }
      }
      yield phase === 3 ? 0.3 : 0.5;
    }
  },
};

// ---- Customs Supervisor --------------------------------------------------------------------------

function redTapeLasers(api: EnemyApi): void {
  const room = api.room();
  const horizontal = api.rng.chance(0.5);
  const count = 2;
  for (let i = 0; i < count; i++) {
    if (horizontal) {
      const y = TILE * 1.5 + api.rng.int(0, Math.floor(room.heightPx / TILE) - 3) * TILE;
      api.hazard({ kind: 'laser', x1: TILE, y1: y, x2: room.widthPx - TILE, y2: y, width: 16, warn: 0.9, active: 1.2, damage: 1 });
    } else {
      const x = TILE * 1.5 + api.rng.int(0, Math.floor(room.widthPx / TILE) - 3) * TILE;
      api.hazard({ kind: 'laser', x1: x, y1: TILE, x2: x, y2: room.heightPx - TILE, width: 16, warn: 0.9, active: 1.2, damage: 1 });
    }
  }
}

const SUP = PILOT.supervisor;

/** A DENIED stamp slam; the stamp sticks in the floor afterwards (a stagger window). */
function* supervisorSlam(api: EnemyApi, windupMult: number, echoes: number): Brain {
  const self = api.self;
  yield* api.windup(0.75 * windupMult, () => ({ kind: 'circle', x: self.x, y: self.y, radius: 70 }));
  api.sfx('stamp');
  api.shake(10, 220);
  api.hazard({ kind: 'shockwave', x: self.x, y: self.y, speed: 330, maxRadius: 560, thickness: 26, damage: 1, label: 'DENIED' });
  for (let i = 0; i < echoes; i++) {
    yield 0.4;
    api.sfx('stamp');
    api.hazard({ kind: 'shockwave', x: self.x, y: self.y, speed: 380, maxRadius: 560, thickness: 26, damage: 1 });
  }
  api.say(LINES.supervisor.stuck, 1.2);
  yield* api.stagger(SUP.slamStagger);
}

/** Phase 3: hops to three spots and stamps at each. */
function* supervisorBarrage(api: EnemyApi, windupMult: number): Brain {
  const self = api.self;
  api.say(LINES.supervisor.finalNotice, 1.6);
  for (let i = 0; i < 3; i++) {
    const spot = api.room().randomFloorPoint(api.rng, 160);
    yield* api.windup(0.45 * windupMult, { kind: 'circle', x: spot.x, y: spot.y, radius: 60 });
    self.teleport(spot.x, spot.y);
    api.sfx('stamp');
    api.shake(8, 160);
    api.hazard({ kind: 'shockwave', x: spot.x, y: spot.y, speed: 360, maxRadius: 380, thickness: 22, damage: 1 });
    yield 0.35;
  }
}

export const supervisorBoss: EnemyDef = {
  id: 'customs-supervisor',
  name: 'Customs Supervisor',
  firstAppears: S01E01,
  canon: false,
  hp: SUP.hp,
  speed: SUP.speed,
  radius: 26,
  contactDamage: 1,
  art: ART.supervisor,
  nameplate: agentNameplate,
  boss: {
    title: 'Customs Supervisor',
    phases: [...SUP.phases],
    reward: 'red-tape',
    onDefeat: (api) => api.toast('The departure gate is open. RUN!', { color: 0xff8a3d, seconds: 3 }),
  },
  brain: function* (api: EnemyApi): Brain {
    const self = api.self;
    let phase = 1;
    let laserTimer = 3;
    api.say(LINES.supervisor.intro, 2.4);
    yield 0.8;
    while (true) {
      const next = self.hp / self.maxHp < SUP.phases[1] ? 3 : self.hp / self.maxHp < SUP.phases[0] ? 2 : 1;
      if (next > phase) {
        phase = next;
        api.stop();
        api.say(phase === 2 ? LINES.supervisor.phase2 : LINES.supervisor.phase3, 2.4);
        api.sfx('alarm');
        api.shake(8, 300);
        // The room answers: lasers light up at once, and security arrives in phase 2.
        redTapeLasers(api);
        if (phase === 2) summonAgents(api);
        yield 0.6;
      }
      const windupMult = phase === 3 ? 0.8 : 1;
      yield* during(api, api.rng.float(0.8, 1.3), () => {
        api.keepDistance(160, 320, phase === 3 ? 1.2 : 0.9);
        if (phase >= 2) {
          laserTimer -= api.dt();
          if (laserTimer <= 0) {
            redTapeLasers(api);
            laserTimer = phase === 3 ? 3.2 : 4.5;
          }
        }
      });
      api.stop();
      const agents = api.ctx.enemies().filter((e) => e.uid !== self.uid).length;
      const roll = api.rng.next();
      if (phase === 3 && roll < 0.3) {
        yield* supervisorBarrage(api, windupMult);
      } else if (roll < 0.4) {
        yield* supervisorSlam(api, windupMult, phase - 1);
      } else if (roll < 0.75 || phase === 1 || agents >= 3) {
        yield* api.windup(0.5 * windupMult, () => ({ kind: 'arc', x: self.x, y: self.y, radius: 160, angle: api.angleToPlayer(), spread: 1.3 }));
        api.sfx('throw');
        api.shoot({ angle: api.angleToPlayer(), speed: 300, kind: 'stamp', count: phase === 1 ? 7 : 9, spread: 1.25, applies: 'stamped' });
      } else {
        yield* api.windup(0.6, () => ({ kind: 'circle', x: self.x, y: self.y, radius: 90 }));
        summonAgents(api);
      }
      yield phase === 3 ? 0.3 : 0.5;
    }
  },
};

function summonAgents(api: EnemyApi): void {
  api.say(LINES.supervisor.summon, 1.2);
  const room = api.room();
  for (let i = 0; i < 2; i++) {
    const x = i === 0 ? TILE * 1.6 : room.widthPx - TILE * 1.6;
    api.spawn(api.rng.pick(['gromflomite-clerk', 'gromflomite-guard']), x, room.heightPx / 2);
  }
}

export const PILOT_BOSSES: EnemyDef[] = [frankBoss, supervisorBoss];
