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
  elite: { hpMult: 2.3, scale: 1.3, params: { speed: 1.25 } },
  brain: (api) => swarmer(api, { wobble: 0.8, freq: 6, speed: api.param('speed', 1) }),
};

export const hallMonitor: EnemyDef = {
  id: 'hall-monitor',
  spawns: ['pop-quiz'],
  name: 'Hall Monitor',
  firstAppears: S01E01,
  canon: false,
  ...PILOT.enemies['hall-monitor'],
  radius: 14,
  contactDamage: 1,
  art: ART.hallMonitor,
  elite: { hpMult: 1.9, scale: 1.2, params: { every: 3.5, calls: 2 } },
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
  elite: { hpMult: 1.8, scale: 1.2, params: { count: 3, spread: 0.5 } },
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
  spawns: ['slop-blob'],
  name: 'Cafeteria Slop',
  firstAppears: S01E01,
  canon: false,
  ...PILOT.enemies['cafeteria-slop'],
  radius: 16,
  contactDamage: 1,
  art: ART.cafeteriaSlop,
  deathFx: 'slime',
  elite: { hpMult: 1.7, scale: 1.25, params: { splits: 3 } },
  brain: (api) => chaser(api, { speed: 1, lungeEvery: 4, lungeMult: 2.6, windup: 0.5, flank: true }),
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
  brain: (api) => charger(api, { windup: 0.45, chargeMult: 3.4, chargeTime: 0.34, rest: api.param('rest', 0.5), approach: 0.5, flank: true }),
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
    yield api.rng.float(0.5, 1.4);
    while (true) {
      api.stop();
      // Rooted in place: it only fires when it can see Morty.
      if (!api.canSeePlayer()) {
        yield 0.3;
        continue;
      }
      const ring = api.param('ring', 0) > 0;
      yield* api.windup(0.55, () =>
        ring
          ? { kind: 'circle', x: api.self.x, y: api.self.y, radius: 110 }
          : { kind: 'arc', x: api.self.x, y: api.self.y, radius: 150, angle: api.angleToPlayer(), spread: 1.2 },
      );
      api.sfx('throw');
      if (ring) api.shoot({ angle: api.angleToPlayer(), speed: 230, kind: 'spore', count: 8, spread: Math.PI * 2 * (7 / 8) });
      else api.shoot({ angle: api.angleToPlayer(), speed: 240, kind: 'spore', count: 5, spread: 1.1 });
      yield 1.3;
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
  elite: { hpMult: 2.2, scale: 1.2, params: { count: 3 } },
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
  // The tip of its gun, as drawn.
  muzzle: { x: 25, y: -10 },
  nameplate: agentNameplate,
  elite: { hpMult: 2, scale: 1.2, params: { burst: 5 } },
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
  elite: { hpMult: 1.8, scale: 1.2, params: { turn: 2.4 } },
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
  // The tip of its gun, as drawn.
  muzzle: { x: 22, y: -11 },
  nameplate: agentNameplate,
  elite: { hpMult: 2.6, scale: 1.2, params: { shots: 2 } },
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

// ---- roles added so every act has a rusher, shooter, area denial, tank, support and summoner ----

const SUP = PILOT.support;

/** Support: cheers nearby enemies on (faster, a little healed). Keeps well back. */
export const pepSquad: EnemyDef = {
  id: 'pep-squad',
  name: 'Pep Squad Captain',
  firstAppears: S01E01,
  canon: false,
  ...PILOT.enemies['pep-squad'],
  radius: 13,
  contactDamage: 1,
  art: ART.pepSquad,
  elite: { hpMult: 1.9, scale: 1.2 },
  brain: function* (api: EnemyApi): Brain {
    let cheer = api.rng.float(1.5, 2.5);
    let toss = 1.4;
    while (true) {
      api.keepDistance(220, 380, 0.9);
      cheer -= api.dt();
      toss -= api.dt();
      const team = api.allies(SUP.cheer.radius);
      if (cheer <= 0 && team.length) {
        api.stop();
        yield* api.windup(0.6, { kind: 'ring', x: api.self.x, y: api.self.y, radius: SUP.cheer.radius, thickness: 10 });
        api.say(api.rng.pick(LINES.pepSquad.cheer), 1.4);
        api.sfx('correct');
        for (const e of api.allies(SUP.cheer.radius)) {
          e.haste(SUP.cheer.haste);
          e.heal(SUP.cheer.heal);
        }
        cheer = api.rng.float(SUP.cheer.every[0], SUP.cheer.every[1]);
      } else if (toss <= 0 && api.canSeePlayer()) {
        // Alone, she lobs pom-poms so she's never just standing around.
        api.stop();
        yield* api.windup(0.45);
        api.shoot({ angle: api.angleToPlayer(), speed: 280, kind: 'ball', radius: 9, color: 0xf2c14e });
        api.sfx('throw');
        toss = 1.4;
      }
      yield;
    }
  },
};

/** Area denial: lobs beakers that leave acid puddles where Morty was standing. */
export const labPartner: EnemyDef = {
  id: 'lab-partner',
  name: 'Lab Partner',
  firstAppears: S01E01,
  canon: false,
  ...PILOT.enemies['lab-partner'],
  radius: 13,
  contactDamage: 1,
  art: ART.labPartner,
  elite: { hpMult: 1.8, scale: 1.2, params: { puddles: 2 } },
  brain: function* (api: EnemyApi): Brain {
    let cooldown = api.rng.float(1, 2);
    while (true) {
      api.keepDistance(200, 340, 1);
      cooldown -= api.dt();
      if (cooldown <= 0 && api.canSeePlayer()) {
        api.stop();
        const n = api.param('puddles', 1);
        const spots = Array.from({ length: n }, (_, i) => ({ x: api.player.x + (i ? api.rng.float(-70, 70) : 0), y: api.player.y + (i ? api.rng.float(-70, 70) : 0) }));
        yield* api.windup(0.75, spots.map((p) => ({ kind: 'circle' as const, x: p.x, y: p.y, radius: 56 })));
        api.sfx('splat');
        for (const p of spots) api.hazard({ kind: 'pool', x: p.x, y: p.y, radius: 56, seconds: 3.2, damage: 1, color: 0x9bd35a });
        cooldown = 2.6;
      }
      yield;
    }
  },
};

/** Support: pulses pollen that heals the critters around it. */
export const bloomTender: EnemyDef = {
  id: 'bloom-tender',
  name: 'Bloom Tender',
  firstAppears: S01E01,
  canon: false,
  ...PILOT.enemies['bloom-tender'],
  radius: 14,
  contactDamage: 1,
  art: ART.bloomTender,
  deathFx: 'heal',
  elite: { hpMult: 1.8, scale: 1.2 },
  brain: function* (api: EnemyApi): Brain {
    let pulse = api.rng.float(1.5, 2.5);
    while (true) {
      const hurt = api.allies(SUP.pollen.radius).some((e) => e.hp < e.maxHp);
      if (hurt) api.keepDistance(160, 300, 0.8);
      else api.flank(0.8);
      pulse -= api.dt();
      if (pulse <= 0) {
        api.stop();
        yield* api.windup(0.6, { kind: 'ring', x: api.self.x, y: api.self.y, radius: SUP.pollen.radius, thickness: 12 });
        api.sfx('heal');
        for (const e of api.allies(SUP.pollen.radius)) e.heal(e.maxHp * SUP.pollen.healShare);
        // The pollen stings, too.
        if (api.distToPlayer() < SUP.pollen.radius) api.melee({ shape: 'circle', x: api.self.x, y: api.self.y, radius: SUP.pollen.radius * 0.5, damage: 1 });
        pulse = SUP.pollen.every;
      }
      yield;
    }
  },
};

/** Tiny critters the Brood Mound spits out. */
export const miteling: EnemyDef = {
  id: 'miteling',
  name: 'Miteling',
  firstAppears: S01E01,
  canon: false,
  ...PILOT.enemies.miteling,
  radius: 8,
  contactDamage: 1,
  art: ART.miteling,
  deathFx: 'slime',
  scrapChance: 0.08,
  brain: (api) => swarmer(api, { wobble: 0.9, freq: 7 }),
};

/** Summoner: a lumpy nest that keeps birthing mitelings. */
export const broodMound: EnemyDef = {
  id: 'brood-mound',
  spawns: ['miteling'],
  name: 'Brood Mound',
  firstAppears: S01E01,
  canon: false,
  ...PILOT.enemies['brood-mound'],
  radius: 20,
  contactDamage: 1,
  knockbackResist: 1,
  art: ART.broodMound,
  deathFx: 'slime',
  elite: { hpMult: 1.6, scale: 1.2 },
  brain: function* (api: EnemyApi): Brain {
    const mem = api.self.memory;
    mem.brood = [] as { alive: boolean }[];
    let next = api.rng.float(0.8, 1.6);
    while (true) {
      api.stop();
      next -= api.dt();
      const brood = (mem.brood as { alive: boolean }[]).filter((b) => b.alive);
      mem.brood = brood;
      if (next <= 0) {
        if (brood.length < SUP.brood.max) {
          const a = api.rng.angle();
          const x = api.self.x + Math.cos(a) * 36;
          const y = api.self.y + Math.sin(a) * 30;
          yield* api.windup(0.5, { kind: 'circle', x, y, radius: 22 });
          api.sfx('bubble');
          const m = api.spawn('miteling', x, y);
          if (m) brood.push(m);
          next = SUP.brood.every;
        } else if (api.canSeePlayer()) {
          // Nest full: it spits instead.
          yield* api.windup(0.5);
          api.shoot({ angle: api.angleToPlayer(), speed: 230, kind: 'spore', count: 3, spread: 0.5 });
          next = 1.4;
        } else {
          next = 0.5;
        }
      }
      yield;
    }
  },
};

/** Area denial: a slug that leaves sticky trails and flicks goo. */
export const gooSlug: EnemyDef = {
  id: 'goo-slug',
  name: 'Goo Slug',
  firstAppears: S01E01,
  canon: false,
  ...PILOT.enemies['goo-slug'],
  radius: 15,
  contactDamage: 1,
  art: ART.gooSlug,
  deathFx: 'slime',
  elite: { hpMult: 1.7, scale: 1.2 },
  brain: function* (api: EnemyApi): Brain {
    let trail = 0;
    let flick = api.rng.float(1.2, 2.2);
    while (true) {
      api.flank(1);
      trail -= api.dt();
      flick -= api.dt();
      if (trail <= 0) {
        api.hazard({ kind: 'pool', x: api.self.x, y: api.self.y, radius: 26, seconds: 3, status: 'slimed', color: 0xd8e05a });
        trail = 0.5;
      }
      if (flick <= 0 && api.canSeePlayer() && api.distToPlayer() < 320) {
        api.stop();
        yield* api.windup(0.5, () => ({ kind: 'line', x: api.self.x, y: api.self.y, angle: api.angleToPlayer(), length: 180, width: 16 }));
        api.shoot({ angle: api.angleToPlayer(), speed: 300, kind: 'spore', radius: 11, color: 0xd8e05a, applies: 'slimed' });
        api.sfx('splat');
        flick = 2.2;
      }
      yield;
    }
  },
};

/** Rusher: a courier who swings wide and body-slams with a parcel. */
export const courier: EnemyDef = {
  id: 'gromflomite-courier',
  name: 'Gromflomite Courier',
  firstAppears: S01E01,
  canon: true,
  ...PILOT.enemies['gromflomite-courier'],
  radius: 13,
  contactDamage: 1,
  art: ART.courier,
  nameplate: agentNameplate,
  elite: { hpMult: 2.4, scale: 1.2 },
  brain: (api) => charger(api, { windup: 0.45, chargeMult: 2.6, chargeTime: 0.32, rest: 0.4, approach: 1, flank: true }),
};

/** Support: stamps APPROVED shields onto nearby agents. */
export const notary: EnemyDef = {
  id: 'gromflomite-notary',
  name: 'Gromflomite Notary',
  firstAppears: S01E01,
  canon: true,
  ...PILOT.enemies['gromflomite-notary'],
  radius: 14,
  contactDamage: 1,
  art: ART.notary,
  nameplate: agentNameplate,
  elite: { hpMult: 2.2, scale: 1.2 },
  brain: function* (api: EnemyApi): Brain {
    let stamp = api.rng.float(1.2, 2.2);
    let fling = 1.5;
    while (true) {
      api.keepDistance(200, 340, 0.9);
      stamp -= api.dt();
      fling -= api.dt();
      const target = api.allies(SUP.notary.radius).find((e) => e.hp > 0);
      if (stamp <= 0 && target) {
        api.stop();
        yield* api.windup(0.6, () => ({ kind: 'circle', x: target.x, y: target.y, radius: 34 }));
        if (target.hp > 0) {
          target.grantShield(SUP.notary.shieldHits);
          api.say(LINES.notary.approved, 1);
          api.sfx('stamp');
        }
        stamp = SUP.notary.every;
      } else if (fling <= 0 && api.canSeePlayer()) {
        api.stop();
        yield* api.windup(0.45);
        api.shoot({ angle: api.angleToPlayer(), speed: 300, kind: 'stamp', applies: 'stamped' });
        api.sfx('throw');
        fling = 1.5;
      }
      yield;
    }
  },
};

/** Summoner: radios for backup, and flings paperwork while waiting. */
export const dispatcher: EnemyDef = {
  id: 'gromflomite-dispatcher',
  spawns: ['gromflomite-clerk', 'gromflomite-guard'],
  name: 'Gromflomite Dispatcher',
  firstAppears: S01E01,
  canon: true,
  ...PILOT.enemies['gromflomite-dispatcher'],
  radius: 14,
  contactDamage: 1,
  art: ART.dispatcher,
  nameplate: agentNameplate,
  elite: { hpMult: 2, scale: 1.2 },
  brain: function* (api: EnemyApi): Brain {
    const mem = api.self.memory;
    mem.calls = [] as { alive: boolean }[];
    let call = api.rng.float(1.5, 2.5);
    let fling = 1.4;
    while (true) {
      api.keepDistance(260, 420, 0.9);
      call -= api.dt();
      fling -= api.dt();
      const calls = (mem.calls as { alive: boolean }[]).filter((c) => c.alive);
      mem.calls = calls;
      if (call <= 0 && calls.length < SUP.dispatch.max) {
        api.stop();
        const spot = api.room().randomFloorPoint(api.rng, 200);
        yield* api.windup(0.8, { kind: 'circle', x: spot.x, y: spot.y, radius: 30 });
        api.say(api.rng.pick(LINES.dispatcher.backup), 1.6);
        api.sfx('alarm');
        const agent = api.spawn(api.rng.pick(['gromflomite-clerk', 'gromflomite-guard']), spot.x, spot.y);
        if (agent) calls.push(agent);
        call = SUP.dispatch.every;
      } else if (fling <= 0 && api.canSeePlayer()) {
        api.stop();
        yield* api.windup(0.45);
        api.shoot({ angle: api.angleToPlayer(), speed: 320, kind: 'paper', count: 2, spread: 0.3 });
        api.sfx('throw');
        fling = 1.4;
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
  pepSquad,
  labPartner,
  bloomTender,
  broodMound,
  miteling,
  gooSlug,
  courier,
  notary,
  dispatcher,
];

export const CUSTOMS_AGENTS = [clerk.id, guard.id, riot.id, sniper.id, courier.id, notary.id, dispatcher.id];
