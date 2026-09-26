/**
 * Regular enemies in the Pilot. The episode itself shows almost nothing to fight at school or
 * in Dimension 35-C, so those are invented (canon: false). Gromflomite agents are canon; the
 * roles they play here are invented.
 */
import { chaser, charger, during, shooter, swarmer } from '../../../engine/brains';
import type { Brain, EnemyApi, EnemyDef, GameCtx, Vec } from '../../../engine/types';
import { PILOT } from '../../balance';
import { PILOT_ENEMY_ART as ART } from './art';
import { LINES } from './dialogue';

const S01E01 = 'S01E01' as const;

/** Rick insists the customs agents are robots. They aren't. */
export const agentNameplate = (ctx: GameCtx): string | null =>
  ctx.flags.coverBlown ? (ctx.flags.robotReveal ? 'NOT A ROBOT' : 'ROBOT') : null;

// ---- school --------------------------------------------------------------------------------------

export const popQuiz: EnemyDef = {
  id: 'pop-quiz',
  name: 'Pop Quiz',
  firstAppears: S01E01,
  canon: false,
  ...PILOT.enemies['pop-quiz'],
  radius: 12,
  contactDamage: 1,
  flying: true,
  art: ART.popQuiz,
  deathFx: 'paper',
  scrapChance: 0.2,
  elite: { hpMult: 2.2, scale: 1.3, params: { speed: 1.25 } },
  brain: (api) => swarmer(api, { wobble: 0.8, freq: 6, speed: api.param('speed', 1) }),
};

export const hallMonitor: EnemyDef = {
  id: 'hall-monitor',
  name: 'Hall Monitor',
  firstAppears: S01E01,
  canon: false,
  ...PILOT.enemies['hall-monitor'],
  radius: 14,
  contactDamage: 1,
  art: ART.hallMonitor,
  elite: { hpMult: 1.7, scale: 1.2, params: { every: 3.5, calls: 2 } },
  brain: function* (api: EnemyApi): Brain {
    let whistle = api.rng.float(2.5, 4.5);
    while (true) {
      api.chase(1);
      whistle -= api.dt();
      if (whistle <= 0) {
        api.stop();
        yield* api.windup(0.6, () => ({ kind: 'circle', x: api.self.x, y: api.self.y, radius: 90 }));
        api.sfx('whistle');
        api.say(LINES.hallMonitor.whistle, 1);
        const others = api.ctx.enemies().filter((e) => e.uid !== api.self.uid);
        for (const e of others) api.ctx.slow(e, 1.5, 3);
        if (others.length < 2) {
          for (let i = 0; i < api.param('calls', 1); i++) {
            const p = api.room().randomFloorPoint(api.rng, 220);
            api.spawn('pop-quiz', p.x, p.y);
          }
        }
        whistle = api.param('every', 5);
      }
      yield;
    }
  },
};

export const dodgeballJock: EnemyDef = {
  id: 'dodgeball-jock',
  name: 'Dodgeball Jock',
  firstAppears: S01E01,
  canon: false,
  ...PILOT.enemies['dodgeball-jock'],
  radius: 15,
  contactDamage: 1,
  art: ART.dodgeballJock,
  elite: { hpMult: 1.6, scale: 1.2, params: { count: 3, spread: 0.5 } },
  brain: (api) =>
    shooter(api, {
      min: 200,
      max: 340,
      cooldown: 2.2,
      windup: 0.5,
      shot: (a) => ({
        angle: a.angleToPlayer(),
        speed: 380,
        kind: 'ball',
        radius: 10,
        bounces: 2,
        count: a.param('count', 1),
        spread: a.param('spread', 0),
      }),
    }),
};

export const cafeteriaSlop: EnemyDef = {
  id: 'cafeteria-slop',
  name: 'Cafeteria Slop',
  firstAppears: S01E01,
  canon: false,
  ...PILOT.enemies['cafeteria-slop'],
  radius: 16,
  contactDamage: 1,
  art: ART.cafeteriaSlop,
  deathFx: 'slime',
  elite: { hpMult: 1.6, scale: 1.25, params: { splits: 3 } },
  brain: (api) => chaser(api, { speed: 1, lungeEvery: 4, lungeMult: 2.6, windup: 0.5 }),
  onDeath: (api) => {
    const n = api.param('splits', 2);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      api.spawn('slop-blob', api.self.x + Math.cos(a) * 16, api.self.y + Math.sin(a) * 16);
    }
  },
};

export const slopBlob: EnemyDef = {
  id: 'slop-blob',
  name: 'Slop Blob',
  firstAppears: S01E01,
  canon: false,
  ...PILOT.enemies['slop-blob'],
  radius: 10,
  contactDamage: 1,
  art: ART.slopBlob,
  deathFx: 'slime',
  scrapChance: 0.1,
  brain: (api) => swarmer(api, { wobble: 0.5, freq: 4 }),
};

export const junkDrone: EnemyDef = {
  id: 'junk-drone',
  name: 'Junk Drone',
  firstAppears: S01E01,
  canon: false,
  ...PILOT.enemies['junk-drone'],
  radius: 14,
  contactDamage: 0,
  flying: true,
  art: ART.junkDrone,
  deathFx: 'spark',
  scrapChance: 1,
  brain: function* (api: EnemyApi): Brain {
    while (true) {
      const p = api.room().randomFloorPoint(api.rng);
      yield* during(api, 1.6, () => api.moveToward(p.x, p.y, 1));
      yield* idle_for(api, 0.5);
    }
  },
};

function* idle_for(api: EnemyApi, seconds: number): Brain {
  api.stop();
  yield seconds;
}

// ---- Dimension 35-C ------------------------------------------------------------------------------

export const gloopHopper: EnemyDef = {
  id: 'gloop-hopper',
  name: 'Gloop Hopper',
  firstAppears: S01E01,
  canon: false,
  ...PILOT.enemies['gloop-hopper'],
  radius: 13,
  contactDamage: 1,
  art: ART.gloopHopper,
  deathFx: 'slime',
  elite: { hpMult: 1.8, scale: 1.25, params: { rest: 0.15 } },
  brain: (api) => charger(api, { windup: 0.45, chargeMult: 3.4, chargeTime: 0.34, rest: api.param('rest', 0.5), approach: 0.5 }),
};

/**
 * Steals Mega Fruit when a script gives it a target (memory.target); otherwise pinches Scrap.
 * Scripts watch memory.grabbed / memory.escaped.
 */
export const fruitSnatcher: EnemyDef = {
  id: 'fruit-snatcher',
  name: 'Fruit Snatcher',
  firstAppears: S01E01,
  canon: false,
  ...PILOT.enemies['fruit-snatcher'],
  radius: 12,
  contactDamage: 0,
  art: ART.fruitSnatcher,
  scrapChance: 0.6,
  elite: { hpMult: 2, scale: 1.2 },
  brain: function* (api: EnemyApi): Brain {
    const mem = api.self.memory;
    while (true) {
      const target = mem.target as Vec | undefined;
      if (target && !mem.grabbed) {
        api.moveToward(target.x, target.y, 1);
        if (Math.hypot(api.self.x - target.x, api.self.y - target.y) < 28) {
          mem.grabbed = true;
          api.say(LINES.fruitSnatcher.grabFruit, 1.2);
          api.sfx('pickup');
        }
        yield;
        continue;
      }
      if (mem.grabbed) {
        yield* during(api, 6, () => api.moveAngle(api.angleToPlayer() + Math.PI + Math.sin(api.ctx.now() * 3) * 0.6, 1.05));
        mem.escaped = true;
        api.self.despawn();
        return;
      }
      api.chase(1);
      if (api.distToPlayer() < api.self.radius + 18) {
        if (api.ctx.spendScrap(2)) {
          api.say(LINES.fruitSnatcher.stealScrap, 1.2);
          api.sfx('scrap');
        }
        yield* during(api, 2.2, () => api.moveAngle(api.angleToPlayer() + Math.PI, 1.1));
      }
      yield;
    }
  },
};

export const bonkBloat: EnemyDef = {
  id: 'bonk-bloat',
  name: 'Bonk Bloat',
  firstAppears: S01E01,
  canon: false,
  ...PILOT.enemies['bonk-bloat'],
  radius: 17,
  contactDamage: 1,
  art: ART.bonkBloat,
  knockbackResist: 0.5,
  elite: { hpMult: 1.6, scale: 1.25, params: { knock: 980, mult: 4 } },
  brain: function* (api: EnemyApi): Brain {
    while (true) {
      yield* during(api, api.rng.float(0.8, 1.5), () => api.chase(0.7));
      api.stop();
      let angle = api.angleToPlayer();
      const mult = api.param('mult', 3.4);
      yield* api.windup(0.6, () => {
        angle = api.angleToPlayer();
        return { kind: 'line', x: api.self.x, y: api.self.y, angle, length: api.self.def.speed * mult * 0.5, width: api.self.radius * 2 };
      });
      let bonked = false;
      yield* during(api, 0.5, () => {
        api.moveAngle(angle, mult);
        if (!bonked && api.distToPlayer() < api.self.radius + 18) {
          bonked = api.melee({ shape: 'circle', x: api.self.x, y: api.self.y, radius: api.self.radius + 10, damage: 1, knockback: api.param('knock', 760) });
          if (bonked) api.sfx('bounce');
        }
      });
      api.stop();
      yield 0.6;
    }
  },
};

export const puffPolyp: EnemyDef = {
  id: 'puff-polyp',
  name: 'Puff Polyp',
  firstAppears: S01E01,
  canon: false,
  ...PILOT.enemies['puff-polyp'],
  radius: 15,
  contactDamage: 1,
  art: ART.puffPolyp,
  knockbackResist: 1,
  elite: { hpMult: 1.7, scale: 1.25, params: { ring: 1 } },
  brain: function* (api: EnemyApi): Brain {
    yield api.rng.float(0.5, 1.8);
    while (true) {
      api.stop();
      const ring = api.param('ring', 0) > 0;
      yield* api.windup(0.55, () =>
        ring
          ? { kind: 'circle', x: api.self.x, y: api.self.y, radius: 110 }
          : { kind: 'arc', x: api.self.x, y: api.self.y, radius: 150, angle: api.angleToPlayer(), spread: 1.2 },
      );
      api.sfx('throw');
      if (ring) api.shoot({ angle: api.angleToPlayer(), speed: 230, kind: 'spore', count: 8, spread: Math.PI * 2 * (7 / 8) });
      else api.shoot({ angle: api.angleToPlayer(), speed: 240, kind: 'spore', count: 5, spread: 1.1 });
      yield 2.4;
    }
  },
};

// ---- Interdimensional Customs --------------------------------------------------------------------

export const clerk: EnemyDef = {
  id: 'gromflomite-clerk',
  name: 'Gromflomite Clerk',
  firstAppears: S01E01,
  canon: true,
  ...PILOT.enemies['gromflomite-clerk'],
  radius: 14,
  contactDamage: 1,
  art: ART.clerk,
  nameplate: agentNameplate,
  elite: { hpMult: 1.7, scale: 1.2, params: { count: 3 } },
  brain: function* (api: EnemyApi): Brain {
    let cooldown = api.rng.float(0.8, 2);
    while (true) {
      api.keepDistance(150, 300, 1);
      cooldown -= api.dt();
      if (api.distToPlayer() < 90) {
        api.stop();
        yield* api.windup(0.5, () => ({ kind: 'circle', x: api.self.x, y: api.self.y, radius: 72 }));
        api.sfx('stamp');
        if (api.melee({ shape: 'circle', x: api.self.x, y: api.self.y, radius: 72, damage: 1, knockback: 250 })) api.ctx.applyStatus('stamped');
        yield 0.5;
      } else if (cooldown <= 0 && api.canSeePlayer()) {
        api.stop();
        yield* api.windup(0.5);
        const n = api.param('count', 1);
        api.shoot({ angle: api.angleToPlayer(), speed: 300, kind: 'stamp', count: n, spread: n > 1 ? 0.45 : 0, applies: 'stamped' });
        api.sfx('throw');
        cooldown = 2.2;
      }
      yield;
    }
  },
};

export const guard: EnemyDef = {
  id: 'gromflomite-guard',
  name: 'Gromflomite Guard',
  firstAppears: S01E01,
  canon: true,
  ...PILOT.enemies['gromflomite-guard'],
  radius: 14,
  contactDamage: 1,
  art: ART.guard,
  nameplate: agentNameplate,
  elite: { hpMult: 1.6, scale: 1.2, params: { burst: 5 } },
  brain: function* (api: EnemyApi): Brain {
    let cooldown = api.rng.float(1, 2.4);
    while (true) {
      api.keepDistance(200, 360, 1);
      cooldown -= api.dt();
      if (cooldown <= 0 && api.canSeePlayer()) {
        api.stop();
        yield* api.windup(0.5, () => ({ kind: 'line', x: api.self.x, y: api.self.y, angle: api.angleToPlayer(), length: 200, width: 10 }));
        for (let i = 0; i < api.param('burst', 3); i++) {
          api.shoot({ angle: api.angleToPlayer() + api.rng.float(-0.06, 0.06), speed: 460, kind: 'bolt', radius: 8 });
          api.sfx('shoot-heavy');
          yield 0.12;
        }
        cooldown = 2.4;
      }
      yield;
    }
  },
};

export const riot: EnemyDef = {
  id: 'gromflomite-riot',
  name: 'Gromflomite Riot Agent',
  firstAppears: S01E01,
  canon: true,
  ...PILOT.enemies['gromflomite-riot'],
  radius: 16,
  contactDamage: 1,
  art: ART.riot,
  shieldArc: 120,
  knockbackResist: 0.6,
  nameplate: agentNameplate,
  elite: { hpMult: 1.6, scale: 1.2, params: { turn: 2.4 } },
  brain: function* (api: EnemyApi): Brain {
    const mem = api.self.memory;
    mem.facing = api.angleToPlayer();
    const turn = () => {
      const target = api.angleToPlayer();
      const cur = mem.facing as number;
      const diff = Math.atan2(Math.sin(target - cur), Math.cos(target - cur));
      const max = api.param('turn', 1.6) * api.dt();
      mem.facing = cur + Math.max(-max, Math.min(max, diff));
      api.self.setFacing(mem.facing as number);
    };
    while (true) {
      turn();
      api.chase(0.8);
      if (api.distToPlayer() < 110) {
        api.stop();
        yield* api.windup(0.5, () => {
          turn();
          return { kind: 'arc', x: api.self.x, y: api.self.y, radius: 105, angle: mem.facing as number, spread: 1.6 };
        });
        api.melee({ shape: 'arc', x: api.self.x, y: api.self.y, radius: 105, angle: mem.facing as number, spread: 1.6, damage: 1, knockback: 420 });
        api.sfx('stamp');
        yield 0.7;
      }
      yield;
    }
  },
};

export const sniper: EnemyDef = {
  id: 'gromflomite-sniper',
  name: 'Gromflomite Sniper',
  firstAppears: S01E01,
  canon: true,
  ...PILOT.enemies['gromflomite-sniper'],
  radius: 13,
  contactDamage: 1,
  art: ART.sniper,
  nameplate: agentNameplate,
  elite: { hpMult: 1.8, scale: 1.2, params: { shots: 2 } },
  brain: function* (api: EnemyApi): Brain {
    let cooldown = api.rng.float(1.5, 3);
    while (true) {
      api.keepDistance(340, 540, 0.9);
      cooldown -= api.dt();
      if (cooldown <= 0 && api.canSeePlayer()) {
        for (let s = 0; s < api.param('shots', 1); s++) {
          api.stop();
          let angle = api.angleToPlayer();
          yield* api.windup(0.7, () => {
            angle = api.angleToPlayer();
            return { kind: 'line', x: api.self.x, y: api.self.y, angle, length: 1100, width: 6 };
          });
          // Aim locks for the last moment so the shot is dodgeable.
          yield* api.windup(0.35, { kind: 'line', x: api.self.x, y: api.self.y, angle, length: 1100, width: 10 });
          api.shoot({ angle, speed: 900, kind: 'bolt', radius: 7, damage: 2 });
          api.sfx('laser');
          yield 0.3;
        }
        cooldown = 3.2;
      }
      yield;
    }
  },
};

export const PILOT_ENEMIES: EnemyDef[] = [
  popQuiz,
  hallMonitor,
  dodgeballJock,
  cafeteriaSlop,
  slopBlob,
  junkDrone,
  gloopHopper,
  fruitSnatcher,
  bonkBloat,
  puffPolyp,
  clerk,
  guard,
  riot,
  sniper,
];

export const CUSTOMS_AGENTS = [clerk.id, guard.id, riot.id, sniper.id];
