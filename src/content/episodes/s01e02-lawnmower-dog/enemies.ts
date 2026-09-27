/**
 * Regular enemies in "Lawnmower Dog". Goldenfold's dream soldiers and the dog army are from the
 * episode (canon: true, the roles here are invented); the passengers, toys and school nightmares
 * are invented (canon: false). Every act has a rusher, a shooter, area denial, a tank, a support
 * and a summoner. Scary Terry is here too: he can't be killed.
 */
import { chaser, charger, during, shooter, swarmer } from '../../../engine/brains';
import type { Brain, EnemyApi, EnemyDef } from '../../../engine/types';
import { LAWNMOWER_DOG } from '../../balance';
import { ENEMY_ART as ART, scaryTerrySprite, snufflesArmSprite } from './art';
import { LINES } from './dialogue';

const S01E02 = 'S01E02' as const;
const E = LAWNMOWER_DOG.enemies;
const SUP = LAWNMOWER_DOG.support;

/** Keeps its distance and throws something now and then (supports and summoners are never idle). */
function* toss(api: EnemyApi, kind: string, every: number, t: { left: number }): Brain {
  t.left -= api.dt();
  if (t.left <= 0 && api.canSeePlayer()) {
    api.stop();
    yield* api.windup(0.45);
    api.shoot({ angle: api.angleToPlayer(), speed: 290, kind, radius: 9 });
    api.sfx('throw');
    t.left = every;
  }
}

// ---- Goldenfold's dream: the plane ---------------------------------------------------------------

/** Rusher: a sleepwalking passenger who lurches around your side and lunges. */
export const dreamPassenger: EnemyDef = {
  id: 'dream-passenger',
  name: 'Sleepwalking Passenger',
  firstAppears: S01E02,
  canon: false,
  ...E['dream-passenger'],
  radius: 13,
  contactDamage: 1,
  art: ART.passenger,
  elite: { hpMult: 2.2, scale: 1.2, mods: ['hasty'] },
  brain: (api) => chaser(api, { speed: 1, lungeEvery: 3, lungeMult: 3, windup: 0.45, flank: true }),
};

/** Support: "please remain seated" hastes and patches up the passengers; tosses peanuts. */
export const flightAttendant: EnemyDef = {
  id: 'flight-attendant',
  name: 'Dream Flight Attendant',
  firstAppears: S01E02,
  canon: false,
  ...E['flight-attendant'],
  radius: 13,
  contactDamage: 1,
  art: ART.attendant,
  elite: { hpMult: 2, scale: 1.2 },
  brain: function* (api: EnemyApi): Brain {
    let serve = api.rng.float(1.5, 2.5);
    const t = { left: 1.4 };
    while (true) {
      api.keepDistance(220, 380, 0.9);
      serve -= api.dt();
      const team = api.allies(SUP.service.radius);
      if (serve <= 0 && team.length) {
        api.stop();
        yield* api.windup(0.6, { kind: 'ring', x: api.self.x, y: api.self.y, radius: SUP.service.radius, thickness: 10 });
        api.say(api.rng.pick(LINES.flightAttendant.serve), 1.4);
        api.sfx('correct');
        for (const e of api.allies(SUP.service.radius)) {
          e.haste(SUP.service.haste);
          e.heal(SUP.service.heal);
        }
        serve = api.rng.float(SUP.service.every[0], SUP.service.every[1]);
      } else yield* toss(api, 'kibble', 1.4, t);
      yield;
    }
  },
};

/** Shooter: Goldenfold's dream soldier, firing machine-gun bursts from a distance. */
export const dreamSoldier: EnemyDef = {
  id: 'dream-soldier',
  name: 'Dream Soldier',
  firstAppears: S01E02,
  canon: true,
  ...E['dream-soldier'],
  radius: 14,
  contactDamage: 1,
  art: ART.soldier,
  elite: { hpMult: 1.9, scale: 1.2, params: { burst: 6 }, mods: ['shielded'] },
  brain: function* (api: EnemyApi): Brain {
    let cooldown = api.rng.float(1, 2.2);
    while (true) {
      api.keepDistance(200, 360, 1);
      cooldown -= api.dt();
      if (cooldown <= 0 && api.canSeePlayer()) {
        api.stop();
        yield* api.windup(0.5, () => ({ kind: 'line', x: api.self.x, y: api.self.y, angle: api.angleToPlayer(), length: 220, width: 12 }));
        for (let i = 0; i < api.param('burst', 4); i++) {
          api.shoot({ angle: api.angleToPlayer() + api.rng.float(-0.1, 0.1), speed: 440, kind: 'bullet', radius: 7 });
          api.sfx('shoot-heavy');
          yield 0.1;
        }
        cooldown = 2.4;
      }
      yield;
    }
  },
};

/** Tank: a runaway snack cart. Heavy, hard to shove, and it rams. */
export const snackCart: EnemyDef = {
  id: 'snack-cart',
  name: 'Runaway Snack Cart',
  firstAppears: S01E02,
  canon: false,
  ...E['snack-cart'],
  radius: 18,
  contactDamage: 1,
  art: ART.snackCart,
  knockbackResist: 0.8,
  deathFx: 'spark',
  elite: { hpMult: 1.7, scale: 1.2, mods: ['explosive'] },
  brain: (api) => charger(api, { windup: 0.6, chargeMult: 3.2, chargeTime: 0.5, rest: 0.8, approach: 0.7 }),
};

/** Area denial: a storm cloud that calls lightning down where Morty stands. */
export const turbulenceCloud: EnemyDef = {
  id: 'turbulence-cloud',
  name: 'Turbulence Cloud',
  firstAppears: S01E02,
  canon: false,
  ...E['turbulence-cloud'],
  radius: 16,
  contactDamage: 1,
  flying: true,
  art: ART.cloud,
  deathFx: 'smoke',
  elite: { hpMult: 2, scale: 1.25, params: { bolts: 3 } },
  brain: function* (api: EnemyApi): Brain {
    let cooldown = api.rng.float(1, 2);
    while (true) {
      api.keepDistance(160, 300, 0.8);
      cooldown -= api.dt();
      if (cooldown <= 0) {
        api.stop();
        const n = api.param('bolts', 2);
        const spots = Array.from({ length: n }, (_, i) => ({ x: api.player.x + (i ? api.rng.float(-80, 80) : 0), y: api.player.y + (i ? api.rng.float(-80, 80) : 0) }));
        yield* api.windup(0.8, spots.map((p) => ({ kind: 'circle' as const, x: p.x, y: p.y, radius: 48 })));
        api.sfx('zap');
        api.shake(4, 120);
        for (const p of spots) api.hazard({ kind: 'pool', x: p.x, y: p.y, radius: 48, seconds: 1.4, damage: 1, color: 0xffe27a });
        cooldown = 2.8;
      }
      yield;
    }
  },
};

/** Tiny suitcases that spill out of Lost Luggage. */
export const carryOn: EnemyDef = {
  id: 'carry-on',
  name: 'Carry-On',
  firstAppears: S01E02,
  canon: false,
  ...E['carry-on'],
  radius: 9,
  contactDamage: 1,
  art: ART.carryOn,
  scrapChance: 0.08,
  brain: (api) => swarmer(api, { wobble: 0.7, freq: 6 }),
};

/** Summoner: a suitcase that keeps unzipping little carry-ons. */
export const lostLuggage: EnemyDef = {
  id: 'lost-luggage',
  spawns: ['carry-on'],
  name: 'Lost Luggage',
  firstAppears: S01E02,
  canon: false,
  ...E['lost-luggage'],
  radius: 18,
  contactDamage: 1,
  knockbackResist: 0.9,
  art: ART.luggage,
  elite: { hpMult: 1.8, scale: 1.2 },
  brain: function* (api: EnemyApi): Brain {
    const mem = api.self.memory;
    mem.brood = [] as { alive: boolean }[];
    let next = api.rng.float(0.8, 1.6);
    while (true) {
      api.keepDistance(220, 360, 0.6);
      next -= api.dt();
      const brood = (mem.brood as { alive: boolean }[]).filter((b) => b.alive);
      mem.brood = brood;
      if (next <= 0) {
        api.stop();
        if (brood.length < SUP.luggage.max) {
          const a = api.rng.angle();
          const x = api.self.x + Math.cos(a) * 36;
          const y = api.self.y + Math.sin(a) * 30;
          yield* api.windup(0.5, { kind: 'circle', x, y, radius: 22 });
          api.sfx('pop');
          const m = api.spawn('carry-on', x, y);
          if (m) brood.push(m);
          next = SUP.luggage.every;
        } else if (api.canSeePlayer()) {
          yield* api.windup(0.5);
          api.shoot({ angle: api.angleToPlayer(), speed: 260, kind: 'kibble', count: 3, spread: 0.5 });
          next = 1.4;
        } else next = 0.5;
      }
      yield;
    }
  },
};

/** Goldenfold dreams up machine guns: floating turrets that spray bullets. */
export const dreamMachineGun: EnemyDef = {
  id: 'dream-machine-gun',
  name: 'Dreamed-Up Machine Gun',
  firstAppears: S01E02,
  canon: true,
  ...E['dream-machine-gun'],
  radius: 14,
  contactDamage: 0,
  flying: true,
  knockbackResist: 1,
  art: ART.machineGun,
  deathFx: 'spark',
  scrapChance: 0.2,
  brain: function* (api: EnemyApi): Brain {
    yield api.rng.float(0.6, 1.4);
    while (true) {
      api.stop();
      if (!api.canSeePlayer()) {
        yield 0.3;
        continue;
      }
      let angle = api.angleToPlayer();
      yield* api.windup(0.6, () => {
        angle = api.angleToPlayer();
        return { kind: 'arc', x: api.self.x, y: api.self.y, radius: 200, angle, spread: 0.8 };
      });
      for (let i = 0; i < 5; i++) {
        api.shoot({ angle: angle - 0.3 + i * 0.15, speed: 380, kind: 'bullet', radius: 7 });
        api.sfx('shoot');
        yield 0.08;
      }
      yield 1.6;
    }
  },
};

/** Goldenfold's dream control: a row of seats sliding across the cabin. Hazard; can't be hurt. */
export const slidingSeats: EnemyDef = {
  id: 'sliding-seats',
  name: 'Sliding Seats',
  firstAppears: S01E02,
  canon: false,
  hp: 1,
  speed: LAWNMOWER_DOG.dreamControl.wallSpeed,
  radius: 26,
  contactDamage: 0,
  flying: true,
  art: ART.slidingWall,
  hazard: { placement: 'floor' },
  brain: function* (api: EnemyApi): Brain {
    // It slides toward the far side of the room from where it appears.
    const room = api.room();
    const dir = api.self.x < room.widthPx / 2 ? 1 : -1;
    yield* api.windup(0.8, { kind: 'line', x: api.self.x, y: api.self.y, angle: dir > 0 ? 0 : Math.PI, length: room.widthPx, width: 110 });
    api.sfx('dash');
    while (true) {
      api.moveAngle(dir > 0 ? 0 : Math.PI, 1);
      if (Math.abs(api.player.y - api.self.y) < 58 && Math.abs(api.player.x - api.self.x) < 36) {
        api.melee({ shape: 'circle', x: api.self.x, y: api.self.y, radius: 40, damage: 1, knockback: 520 });
      }
      if ((dir > 0 && api.self.x > room.widthPx - 70) || (dir < 0 && api.self.x < 70)) {
        api.self.despawn();
        return;
      }
      yield;
    }
  },
};

// ---- dreams within dreams ------------------------------------------------------------------------

/** Rusher: a counted sheep that got angry about it. Charges. */
export const countingSheep: EnemyDef = {
  id: 'counting-sheep',
  name: 'Counting Sheep',
  firstAppears: S01E02,
  canon: false,
  ...E['counting-sheep'],
  radius: 14,
  contactDamage: 1,
  art: ART.sheep,
  deathFx: 'paper',
  elite: { hpMult: 2, scale: 1.25, params: { rest: 0.15 }, mods: ['splitting'] },
  brain: (api) => charger(api, { windup: 0.45, chargeMult: 3.3, chargeTime: 0.34, rest: api.param('rest', 0.5), approach: 0.6, flank: true }),
};

/** Shooter: a wind-up toy soldier popping corks from a distance. */
export const windupSoldier: EnemyDef = {
  id: 'windup-soldier',
  name: 'Wind-Up Soldier',
  firstAppears: S01E02,
  canon: false,
  ...E['windup-soldier'],
  radius: 13,
  contactDamage: 1,
  art: ART.windupSoldier,
  deathFx: 'spark',
  elite: { hpMult: 1.9, scale: 1.2, params: { count: 3, spread: 0.5 } },
  brain: (api) =>
    shooter(api, {
      min: 200,
      max: 340,
      cooldown: 2,
      windup: 0.5,
      shot: (a) => ({ angle: a.angleToPlayer(), speed: 360, kind: 'cork', radius: 8, count: a.param('count', 1), spread: a.param('spread', 0) }),
    }),
};

/** Tank: a huge teddy bear that stomps out shockwaves. */
export const teddyBruiser: EnemyDef = {
  id: 'teddy-bruiser',
  name: 'Teddy Bruiser',
  firstAppears: S01E02,
  canon: false,
  ...E['teddy-bruiser'],
  radius: 20,
  contactDamage: 1,
  knockbackResist: 0.7,
  art: ART.teddy,
  deathFx: 'paper',
  elite: { hpMult: 1.7, scale: 1.2, mods: ['shielded'] },
  brain: function* (api: EnemyApi): Brain {
    while (true) {
      yield* during(api, api.rng.float(1, 1.8), () => api.chase(0.8));
      if (api.distToPlayer() < 190) {
        api.stop();
        yield* api.windup(0.7, { kind: 'circle', x: api.self.x, y: api.self.y, radius: 110 });
        api.sfx('stamp');
        api.shake(5, 150);
        api.hazard({ kind: 'shockwave', x: api.self.x, y: api.self.y, speed: 260, maxRadius: 200, thickness: 18, damage: 1 });
        yield* api.stagger(0.6);
      }
      yield;
    }
  },
};

/** Area denial: a jack-in-the-box that springs out in rings. Rooted. */
export const jackInTheBox: EnemyDef = {
  id: 'jack-in-the-box',
  name: 'Jack-in-the-Box',
  firstAppears: S01E02,
  canon: false,
  ...E['jack-in-the-box'],
  radius: 16,
  contactDamage: 1,
  knockbackResist: 1,
  art: ART.jackInTheBox,
  deathFx: 'confetti',
  elite: { hpMult: 1.8, scale: 1.2, params: { rings: 2 } },
  brain: function* (api: EnemyApi): Brain {
    yield api.rng.float(0.5, 1.4);
    while (true) {
      api.stop();
      if (api.distToPlayer() > 420) {
        yield 0.4;
        continue;
      }
      yield* api.windup(0.7, { kind: 'circle', x: api.self.x, y: api.self.y, radius: 90 });
      api.sfx('pop');
      for (let i = 0; i < api.param('rings', 1); i++) {
        api.hazard({ kind: 'shockwave', x: api.self.x, y: api.self.y, speed: 220, maxRadius: 240, thickness: 16, damage: 1 });
        api.shoot({ angle: api.rng.angle(), speed: 220, kind: 'ball', color: 0xe0484d, count: 6, spread: Math.PI * 2 * (5 / 6) });
        yield 0.6;
      }
      yield 1.6;
    }
  },
};

/** Support: pours healing tea for the toys around her; flings teacups otherwise. */
export const teaPartyDoll: EnemyDef = {
  id: 'tea-party-doll',
  name: 'Tea Party Doll',
  firstAppears: S01E02,
  canon: false,
  ...E['tea-party-doll'],
  radius: 13,
  contactDamage: 1,
  art: ART.teaDoll,
  deathFx: 'heal',
  elite: { hpMult: 2, scale: 1.2 },
  brain: function* (api: EnemyApi): Brain {
    let pour = api.rng.float(1.5, 2.5);
    const t = { left: 1.5 };
    while (true) {
      const hurt = api.allies(SUP.tea.radius).some((e) => e.hp < e.maxHp);
      if (hurt) api.keepDistance(160, 300, 0.8);
      else api.keepDistance(220, 360, 0.9);
      pour -= api.dt();
      if (pour <= 0 && api.allies(SUP.tea.radius).length) {
        api.stop();
        yield* api.windup(0.6, { kind: 'ring', x: api.self.x, y: api.self.y, radius: SUP.tea.radius, thickness: 12 });
        api.say(api.rng.pick(LINES.teaDoll.pour), 1.2);
        api.sfx('heal');
        for (const e of api.allies(SUP.tea.radius)) e.heal(e.maxHp * SUP.tea.healShare);
        pour = SUP.tea.every;
      } else yield* toss(api, 'teacup', 1.5, t);
      yield;
    }
  },
};

/** Tiny ballerinas that spin out of the Music Box. */
export const twirlDancer: EnemyDef = {
  id: 'twirl-dancer',
  name: 'Twirl Dancer',
  firstAppears: S01E02,
  canon: false,
  ...E['twirl-dancer'],
  radius: 9,
  contactDamage: 1,
  art: ART.dancer,
  deathFx: 'confetti',
  scrapChance: 0.08,
  brain: (api) => swarmer(api, { wobble: 1, freq: 8 }),
};

/** Summoner: a music box whose ballerinas keep spinning out. */
export const musicBox: EnemyDef = {
  id: 'music-box',
  spawns: ['twirl-dancer'],
  name: 'Music Box',
  firstAppears: S01E02,
  canon: false,
  ...E['music-box'],
  radius: 17,
  contactDamage: 1,
  knockbackResist: 1,
  art: ART.musicBox,
  deathFx: 'confetti',
  elite: { hpMult: 1.7, scale: 1.2 },
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
        if (brood.length < SUP.musicBox.max) {
          const a = api.rng.angle();
          const x = api.self.x + Math.cos(a) * 34;
          const y = api.self.y + Math.sin(a) * 30;
          yield* api.windup(0.5, { kind: 'circle', x, y, radius: 20 });
          api.sfx('bubble');
          const m = api.spawn('twirl-dancer', x, y);
          if (m) brood.push(m);
          next = SUP.musicBox.every;
        } else if (api.canSeePlayer()) {
          yield* api.windup(0.5);
          api.shoot({ angle: api.angleToPlayer(), speed: 240, kind: 'orb', color: 0xf8c4dc, count: 3, spread: 0.6 });
          next = 1.4;
        } else next = 0.5;
      }
      yield;
    }
  },
};

/**
 * Scary Terry: blades for fingers, a filthy catchphrase, and no way to kill him. He hunts Morty
 * from room to room (mechanics/scaryTerry.ts); hits only knock him back and daze him.
 */
export const scaryTerryStalker: EnemyDef = {
  id: 'scary-terry',
  name: 'Scary Terry',
  firstAppears: S01E02,
  canon: true,
  hp: 999,
  speed: LAWNMOWER_DOG.terry.speed,
  radius: 16,
  contactDamage: 1,
  art: scaryTerrySprite,
  knockbackResist: 0.3,
  stalker: { staggerHits: LAWNMOWER_DOG.terry.staggerHits, staggerSeconds: LAWNMOWER_DOG.terry.staggerSeconds },
  brain: function* (api: EnemyApi): Brain {
    let taunt = api.rng.float(2, 4);
    yield 0.2;
    while (true) {
      api.flank(1);
      const line = api.self.memory.say as string | undefined;
      if (line) {
        api.say(line, 1.8);
        api.self.memory.say = undefined;
        taunt = api.rng.float(5, 8);
      }
      taunt -= api.dt();
      if (taunt <= 0) {
        api.say(api.rng.pick(LINES.terry.hunt), 1.6);
        taunt = api.rng.float(5, 8);
      }
      const d = api.distToPlayer();
      if (d < 120) {
        api.stop();
        let angle = api.angleToPlayer();
        yield* api.windup(0.5, () => {
          angle = api.angleToPlayer();
          return { kind: 'arc', x: api.self.x, y: api.self.y, radius: 110, angle, spread: 1.6 };
        });
        api.sfx('slash');
        api.melee({ shape: 'arc', x: api.self.x, y: api.self.y, radius: 110, angle, spread: 1.6, damage: 1, knockback: 340 });
        yield 0.5;
      } else if (d < 330 && api.rng.chance(0.012)) {
        api.stop();
        let angle = api.angleToPlayer();
        yield* api.windup(0.55, () => {
          angle = api.angleToPlayer();
          return { kind: 'line', x: api.self.x, y: api.self.y, angle, length: 320, width: 40 };
        });
        api.sfx('slash');
        let hit = false;
        yield* during(api, 0.3, () => {
          api.moveAngle(angle, 3.6);
          if (!hit) hit = api.melee({ shape: 'circle', x: api.self.x, y: api.self.y, radius: api.self.radius + 14, damage: 1, knockback: 360 });
        });
        api.stop();
        yield 0.6;
      }
      yield;
    }
  },
};

// ---- Terry's dream school ------------------------------------------------------------------------

/** Shooter: one of the kids mocking Terry, lobbing paper and insults. */
export const mockingKid: EnemyDef = {
  id: 'mocking-kid',
  name: 'Mocking Kid',
  firstAppears: S01E02,
  canon: true,
  ...E['mocking-kid'],
  radius: 13,
  contactDamage: 1,
  art: ART.mockingKid,
  deathFx: 'paper',
  elite: { hpMult: 1.9, scale: 1.2, params: { count: 3 }, mods: ['hasty'] },
  brain: (api) =>
    shooter(api, {
      min: 180,
      max: 320,
      cooldown: 1.9,
      windup: 0.45,
      shot: (a) => ({ angle: a.angleToPlayer(), speed: 330, kind: 'paper', count: a.param('count', 1), spread: 0.4 }),
    }),
};

/** Tank: a giant red F, stomping. */
export const failingGrade: EnemyDef = {
  id: 'failing-grade',
  name: 'Failing Grade',
  firstAppears: S01E02,
  canon: false,
  ...E['failing-grade'],
  radius: 19,
  contactDamage: 1,
  knockbackResist: 0.8,
  art: ART.failingGrade,
  deathFx: 'paper',
  elite: { hpMult: 1.8, scale: 1.2, mods: ['explosive'] },
  brain: function* (api: EnemyApi): Brain {
    while (true) {
      yield* during(api, api.rng.float(0.9, 1.5), () => api.chase(0.8));
      api.stop();
      if (api.distToPlayer() < 220) {
        yield* api.windup(0.7, { kind: 'circle', x: api.self.x, y: api.self.y, radius: 120 });
        api.sfx('stamp');
        api.shake(5, 150);
        api.melee({ shape: 'circle', x: api.self.x, y: api.self.y, radius: 90, damage: 1, knockback: 420 });
        api.shoot({ angle: api.rng.angle(), speed: 260, kind: 'fpaper', count: 8, spread: Math.PI * 2 * (7 / 8) });
        yield* api.stagger(0.7);
      } else if (api.canSeePlayer()) {
        yield* api.windup(0.5);
        api.shoot({ angle: api.angleToPlayer(), speed: 300, kind: 'fpaper', count: 2, spread: 0.3 });
        yield 0.6;
      }
      yield;
    }
  },
};

/** Area denial: a floating mouth whose laughter rolls out in rings. */
export const laughingMouth: EnemyDef = {
  id: 'laughing-mouth',
  name: 'Laughing Mouth',
  firstAppears: S01E02,
  canon: false,
  ...E['laughing-mouth'],
  radius: 16,
  contactDamage: 1,
  flying: true,
  art: ART.laughingMouth,
  elite: { hpMult: 1.8, scale: 1.25, params: { rings: 2 } },
  brain: function* (api: EnemyApi): Brain {
    let cooldown = api.rng.float(1, 2);
    while (true) {
      api.keepDistance(150, 280, 0.9);
      cooldown -= api.dt();
      if (cooldown <= 0) {
        api.stop();
        yield* api.windup(0.6, { kind: 'circle', x: api.self.x, y: api.self.y, radius: 100 });
        api.sfx('whiff');
        for (let i = 0; i < api.param('rings', 1); i++) {
          api.hazard({ kind: 'shockwave', x: api.self.x, y: api.self.y, speed: 240, maxRadius: 230, thickness: 16, damage: 1, label: 'HA' });
          api.shoot({ angle: api.angleToPlayer(), speed: 250, kind: 'laugh', count: 3, spread: 0.5 });
          yield 0.5;
        }
        cooldown = 2.6;
      }
      yield;
    }
  },
};

// ---- Snowball's world ----------------------------------------------------------------------------

/** Rusher: a small dog in a helmet, all teeth and enthusiasm. */
export const helmetPup: EnemyDef = {
  id: 'helmet-pup',
  name: 'Helmet Pup',
  firstAppears: S01E02,
  canon: true,
  ...E['helmet-pup'],
  radius: 11,
  contactDamage: 1,
  art: ART.helmetPup,
  elite: { hpMult: 2.4, scale: 1.3, mods: ['hasty'] },
  brain: (api) => chaser(api, { speed: 1, lungeEvery: 2.6, lungeMult: 3.2, windup: 0.4, flank: true }),
};

/** Shooter: a dog trooper in a robot suit with a laser blaster. */
export const dogTrooper: EnemyDef = {
  id: 'dog-trooper',
  name: 'Dog Trooper',
  firstAppears: S01E02,
  canon: true,
  ...E['dog-trooper'],
  radius: 14,
  contactDamage: 1,
  art: ART.trooper,
  deathFx: 'spark',
  elite: { hpMult: 2, scale: 1.2, params: { burst: 3 }, mods: ['shielded'] },
  brain: function* (api: EnemyApi): Brain {
    let cooldown = api.rng.float(1, 2.2);
    while (true) {
      api.keepDistance(210, 370, 1);
      cooldown -= api.dt();
      if (cooldown <= 0 && api.canSeePlayer()) {
        api.stop();
        yield* api.windup(0.5, () => ({ kind: 'line', x: api.self.x, y: api.self.y, angle: api.angleToPlayer(), length: 240, width: 10 }));
        for (let i = 0; i < api.param('burst', 2); i++) {
          api.shoot({ angle: api.angleToPlayer(), speed: 470, kind: 'bolt', radius: 7, color: 0xff4a3d });
          api.sfx('laser');
          yield 0.14;
        }
        cooldown = 2.2;
      }
      yield;
    }
  },
};

/** Tank: a robot-suited bulldog. Barely budges, charges like a truck. */
export const roboBulldog: EnemyDef = {
  id: 'robo-bulldog',
  name: 'Robo-Bulldog',
  firstAppears: S01E02,
  canon: true,
  ...E['robo-bulldog'],
  radius: 19,
  contactDamage: 1,
  knockbackResist: 0.85,
  art: ART.bulldog,
  deathFx: 'spark',
  elite: { hpMult: 1.7, scale: 1.2, mods: ['explosive'] },
  brain: (api) => charger(api, { windup: 0.6, chargeMult: 3.4, chargeTime: 0.45, rest: 0.9, approach: 0.7 }),
};

/** Area denial: a mastiff that leaves puddles of drool you'll slip in. */
export const droolMastiff: EnemyDef = {
  id: 'drool-mastiff',
  name: 'Drool Mastiff',
  firstAppears: S01E02,
  canon: true,
  ...E['drool-mastiff'],
  radius: 18,
  contactDamage: 1,
  knockbackResist: 0.5,
  art: ART.mastiff,
  deathFx: 'slime',
  elite: { hpMult: 1.8, scale: 1.2 },
  brain: function* (api: EnemyApi): Brain {
    let drip = 0;
    let fling = api.rng.float(1.2, 2.2);
    while (true) {
      api.flank(0.9);
      drip -= api.dt();
      fling -= api.dt();
      if (drip <= 0) {
        api.hazard({ kind: 'pool', x: api.self.x, y: api.self.y, radius: 28, seconds: 3.2, status: 'slimed', color: 0xcfeeff });
        drip = 0.55;
      }
      if (fling <= 0 && api.canSeePlayer() && api.distToPlayer() < 320) {
        api.stop();
        const at = { x: api.player.x, y: api.player.y };
        yield* api.windup(0.6, { kind: 'circle', x: at.x, y: at.y, radius: 54 });
        api.sfx('splat');
        api.hazard({ kind: 'pool', x: at.x, y: at.y, radius: 54, seconds: 3, damage: 1, status: 'slimed', color: 0xcfeeff });
        fling = 2.6;
      }
      yield;
    }
  },
};

/** Support: a medic poodle tossing biscuits that heal and shield the pack. */
export const medicPoodle: EnemyDef = {
  id: 'medic-poodle',
  name: 'Medic Poodle',
  firstAppears: S01E02,
  canon: false,
  ...E['medic-poodle'],
  radius: 14,
  contactDamage: 1,
  art: ART.poodle,
  deathFx: 'heal',
  elite: { hpMult: 2, scale: 1.2 },
  brain: function* (api: EnemyApi): Brain {
    let treat = api.rng.float(1.2, 2.2);
    const t = { left: 1.5 };
    while (true) {
      api.keepDistance(220, 360, 0.9);
      treat -= api.dt();
      const target = api.allies(SUP.biscuit.radius).find((e) => e.hp > 0);
      if (treat <= 0 && target) {
        api.stop();
        yield* api.windup(0.6, () => ({ kind: 'circle', x: target.x, y: target.y, radius: 34 }));
        if (target.hp > 0) {
          target.grantShield(SUP.biscuit.shieldHits);
          target.heal(SUP.biscuit.heal);
          api.say(api.rng.pick(LINES.medicPoodle.biscuit), 1);
          api.sfx('heal');
        }
        treat = SUP.biscuit.every;
      } else yield* toss(api, 'kibble', 1.5, t);
      yield;
    }
  },
};

/** Summoner: a kennel master who whistles up helmet pups. */
export const kennelMaster: EnemyDef = {
  id: 'kennel-master',
  spawns: ['helmet-pup'],
  name: 'Kennel Master',
  firstAppears: S01E02,
  canon: false,
  ...E['kennel-master'],
  radius: 15,
  contactDamage: 1,
  art: ART.kennelMaster,
  elite: { hpMult: 1.8, scale: 1.2 },
  brain: function* (api: EnemyApi): Brain {
    const mem = api.self.memory;
    mem.calls = [] as { alive: boolean }[];
    let call = api.rng.float(1.5, 2.5);
    const t = { left: 1.4 };
    while (true) {
      api.keepDistance(260, 420, 0.9);
      call -= api.dt();
      const calls = (mem.calls as { alive: boolean }[]).filter((c) => c.alive);
      mem.calls = calls;
      if (call <= 0 && calls.length < SUP.kennel.max) {
        api.stop();
        const spot = api.room().randomFloorPoint(api.rng, 200);
        yield* api.windup(0.7, { kind: 'circle', x: spot.x, y: spot.y, radius: 26 });
        api.say(api.rng.pick(LINES.kennelMaster.call), 1.4);
        api.sfx('whistle');
        const pup = api.spawn('helmet-pup', spot.x, spot.y);
        if (pup) calls.push(pup);
        call = SUP.kennel.every;
      } else yield* toss(api, 'kibble', 1.4, t);
      yield;
    }
  },
};

// ---- the first interlude: Snuffles, dodging Jerry ------------------------------------------------

/**
 * Snuffles, keeping just out of Jerry's reach (he can't be hurt; the interlude's script says when
 * Jerry catches him). He runs away from Jerry and sidesteps when cornered.
 */
export const snufflesDodger: EnemyDef = {
  id: 'snuffles-dodger',
  name: 'Snuffles',
  firstAppears: S01E02,
  canon: true,
  ...E['snuffles-dodger'],
  radius: 13,
  contactDamage: 0,
  art: snufflesArmSprite,
  knockbackResist: 1,
  brain: function* (api: EnemyApi): Brain {
    const phase = api.rng.float(0, Math.PI * 2);
    let t = 0;
    while (true) {
      t += api.dt();
      // The interlude's script hands him lines as he gets smarter.
      const line = api.self.memory.say as string | undefined;
      if (line) {
        api.say(line, 2.2);
        api.self.memory.say = undefined;
      }
      const speed = (api.self.memory.speed as number | undefined) ?? 0.7;
      const away = api.angleToPlayer() + Math.PI + Math.sin(t * 2 + phase) * 0.8;
      if (api.distToPlayer() < 280) api.moveAngle(api.self.blocked ? away + Math.PI / 2 : away, speed);
      else api.stop();
      yield;
    }
  },
};

export const DOG_ENEMIES: EnemyDef[] = [
  dreamPassenger,
  flightAttendant,
  dreamSoldier,
  snackCart,
  turbulenceCloud,
  lostLuggage,
  carryOn,
  dreamMachineGun,
  slidingSeats,
  countingSheep,
  windupSoldier,
  teddyBruiser,
  jackInTheBox,
  teaPartyDoll,
  musicBox,
  twirlDancer,
  scaryTerryStalker,
  mockingKid,
  failingGrade,
  laughingMouth,
  helmetPup,
  dogTrooper,
  roboBulldog,
  droolMastiff,
  medicPoodle,
  kennelMaster,
  snufflesDodger,
];
