/** The Pilot's bosses: Frank Palicky (canon) and the Customs Supervisor (invented). */
import { during } from '../../../engine/brains';
import { TILE } from '../../../engine/constants';
import type { Brain, EnemyApi, EnemyDef, TelegraphSpec } from '../../../engine/types';
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

function* frankLunge(api: EnemyApi, windupMult: number, speed: number): Brain {
  let angle = api.angleToPlayer();
  yield* api.windup(0.6 * windupMult, () => {
    angle = api.angleToPlayer();
    return { kind: 'line', x: api.self.x, y: api.self.y, angle, length: 420, width: 56 };
  });
  api.sfx('slash');
  let hit = false;
  yield* during(api, 0.32, () => {
    api.moveAngle(angle, 4.2 * speed);
    if (!hit) hit = api.melee({ shape: 'circle', x: api.self.x, y: api.self.y, radius: api.self.radius + 14, damage: 1, knockback: 380 });
  });
  api.stop();
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

export const frankBoss: EnemyDef = {
  id: 'frank-palicky',
  name: 'Frank Palicky',
  firstAppears: S01E01,
  canon: true,
  hp: PILOT.frank.hp,
  speed: PILOT.frank.speed,
  radius: 24,
  contactDamage: 1,
  art: ART.frank,
  boss: {
    title: 'Frank Palicky',
    defeatCutscene: 'pilot-frank-frozen',
    reward: 'franks-switchblade',
    onDefeat: (api, at) => api.addProp({ art: 'frank-frozen', x: at.x, y: at.y + 20, solid: true, radius: 22, persist: true }),
  },
  brain: function* (api: EnemyApi): Brain {
    const self = api.self;
    let enraged = false;
    api.say(LINES.frank.intro, 2.4);
    yield 0.8;
    while (true) {
      if (!enraged && self.hp < self.maxHp / 2) {
        enraged = true;
        api.say(LINES.frank.enraged, 2.2);
        api.sfx('boss-roar');
        api.shake(8, 300);
        yield 0.6;
      }
      const speed = enraged ? 1.35 : 1;
      const windupMult = enraged ? 0.8 : 1;
      yield* during(api, api.rng.float(0.9, 1.6) / speed, () => api.chase(speed));
      api.stop();
      const roll = api.rng.next();
      if (api.distToPlayer() < 170) {
        yield* frankSlash(api, windupMult);
        if (enraged) {
          yield 0.15;
          yield* frankSlash(api, windupMult);
        }
      } else if (roll < 0.55) {
        yield* frankLunge(api, windupMult, speed);
      } else {
        yield* frankLockers(api, windupMult, enraged);
      }
      yield enraged ? 0.35 : 0.6;
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

export const supervisorBoss: EnemyDef = {
  id: 'customs-supervisor',
  name: 'Customs Supervisor',
  firstAppears: S01E01,
  canon: false,
  hp: PILOT.supervisor.hp,
  speed: PILOT.supervisor.speed,
  radius: 26,
  contactDamage: 1,
  art: ART.supervisor,
  nameplate: agentNameplate,
  boss: {
    title: 'Customs Supervisor',
    onDefeat: (api) => api.toast('The departure gate is open. RUN!', { color: 0xff8a3d, seconds: 3 }),
  },
  brain: function* (api: EnemyApi): Brain {
    const self = api.self;
    let phase2 = false;
    let laserTimer = 3;
    api.say(LINES.supervisor.intro, 2.4);
    yield 0.8;
    while (true) {
      if (!phase2 && self.hp < self.maxHp / 2) {
        phase2 = true;
        api.say(LINES.supervisor.phase2, 2.4);
        api.sfx('alarm');
        yield 0.5;
      }
      yield* during(api, api.rng.float(1, 1.6), () => {
        api.keepDistance(160, 320, 0.9);
        if (phase2) {
          laserTimer -= api.dt();
          if (laserTimer <= 0) {
            redTapeLasers(api);
            laserTimer = 4.5;
          }
        }
      });
      api.stop();
      const agents = api.ctx.enemies().filter((e) => e.uid !== self.uid).length;
      const roll = api.rng.next();
      if (roll < 0.4 || (roll >= 0.75 && agents >= 3)) {
        yield* api.windup(0.75, () => ({ kind: 'circle', x: self.x, y: self.y, radius: 70 }));
        api.sfx('stamp');
        api.shake(10, 220);
        api.hazard({ kind: 'shockwave', x: self.x, y: self.y, speed: 330, maxRadius: 560, thickness: 26, damage: 1, label: 'DENIED' });
        if (phase2) {
          yield 0.45;
          api.sfx('stamp');
          api.hazard({ kind: 'shockwave', x: self.x, y: self.y, speed: 380, maxRadius: 560, thickness: 26, damage: 1 });
        }
      } else if (roll < 0.75) {
        yield* api.windup(0.5, () => ({ kind: 'arc', x: self.x, y: self.y, radius: 160, angle: api.angleToPlayer(), spread: 1.3 }));
        api.sfx('throw');
        api.shoot({ angle: api.angleToPlayer(), speed: 300, kind: 'stamp', count: phase2 ? 9 : 7, spread: 1.25, applies: 'stamped' });
      } else {
        yield* api.windup(0.6, () => ({ kind: 'circle', x: self.x, y: self.y, radius: 90 }));
        api.say(LINES.supervisor.summon, 1.2);
        const room = api.room();
        for (let i = 0; i < 2; i++) {
          const x = i === 0 ? TILE * 1.6 : room.widthPx - TILE * 1.6;
          api.spawn(api.rng.pick(['gromflomite-clerk', 'gromflomite-guard']), x, room.heightPx / 2);
        }
      }
      yield phase2 ? 0.4 : 0.6;
    }
  },
};

export const PILOT_BOSSES: EnemyDef[] = [frankBoss, supervisorBoss];
