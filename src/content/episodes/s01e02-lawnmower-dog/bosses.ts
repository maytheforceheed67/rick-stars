/**
 * The bosses of "Lawnmower Dog": Mr. Goldenfold in his own dream, and Snowball in his robot suit.
 * Neither fight ends in a kill. Goldenfold turns his dream against Rick and Morty and drops them
 * toward lava (canon); Snowball, shown it's his dream, relents (canon).
 */
import { during } from '../../../engine/brains';
import type { Brain, EnemyApi, EnemyDef, TelegraphSpec } from '../../../engine/types';
import { LAWNMOWER_DOG } from '../../balance';
import { dreamGoldenfoldSprite, snowballBossSprite } from './art';
import { LINES } from './dialogue';
import { goldenfoldTurnsIt, snowballRelents } from './scenes';

const S01E02 = 'S01E02' as const;

// ---- Mr. Goldenfold, in his dream ----------------------------------------------------------------

/** A hail of dream bullets swept across Morty's side of the cabin. */
function* hail(api: EnemyApi, windupMult: number, waves: number): Brain {
  let angle = api.angleToPlayer();
  yield* api.windup(0.6 * windupMult, () => {
    angle = api.angleToPlayer();
    return { kind: 'arc', x: api.self.x, y: api.self.y, radius: 260, angle, spread: 1.4 };
  });
  for (let w = 0; w < waves; w++) {
    for (let i = 0; i < 7; i++) {
      api.shoot({ angle: angle - 0.7 + i * (1.4 / 6) + (w % 2) * 0.1, speed: 330, kind: 'bullet', radius: 7 });
    }
    api.sfx('shoot-heavy');
    yield 0.28;
  }
}

/** "I dream of guns!": machine guns pop into the air around the cabin. */
function* summonGuns(api: EnemyApi, count: number): Brain {
  const spots = Array.from({ length: count }, () => api.room().randomFloorPoint(api.rng, 200));
  api.say(LINES.goldenfold.guns, 1.6);
  yield* api.windup(0.7, spots.map((p): TelegraphSpec => ({ kind: 'circle', x: p.x, y: p.y, radius: 26 })));
  api.sfx('pop');
  for (const p of spots) api.spawn('dream-machine-gun', p.x, p.y);
}

/** Dream control: the cabin banks hard and the seats slide across. */
function* bankTheCabin(api: EnemyApi): Brain {
  api.say(api.rng.pick(LINES.goldenfold.control), 1.4);
  const dir = api.player.x < api.room().widthPx / 2 ? -1 : 1;
  api.ctx.tilt(dir * 0.08, 2.6);
  yield* api.windup(0.5);
  const room = api.room();
  const y = Math.max(120, Math.min(room.heightPx - 120, api.player.y));
  // The seats slide in from the high side of the cabin, toward Morty.
  api.spawn('sliding-seats', dir < 0 ? room.widthPx - 80 : 80, y);
  // A steady slide toward the low side (knockback decays at 10/s).
  yield* during(api, 2.2, () => api.player.knockback(dir > 0 ? 0 : Math.PI, 120 * 10 * api.dt()));
}

/** Red-pen Fs thrown out in a ring (phase 3). */
function* gradeRing(api: EnemyApi, windupMult: number): Brain {
  yield* api.windup(0.6 * windupMult, { kind: 'circle', x: api.self.x, y: api.self.y, radius: 120 });
  api.sfx('stamp');
  for (let r = 0; r < 2; r++) {
    api.shoot({ angle: api.rng.angle(), speed: 260, kind: 'fpaper', count: 12, spread: Math.PI * 2 * (11 / 12) });
    yield 0.4;
  }
}

const GF = LAWNMOWER_DOG.goldenfold;

export const dreamGoldenfold: EnemyDef = {
  id: 'dream-goldenfold',
  spawns: ['dream-machine-gun'],
  name: 'Dream Goldenfold',
  firstAppears: S01E02,
  canon: true,
  hp: GF.hp,
  speed: GF.speed,
  radius: 26,
  contactDamage: 1,
  knockbackResist: 0.8,
  art: dreamGoldenfoldSprite,
  boss: {
    title: 'Mr. Goldenfold (dreaming)',
    character: 'goldenfold',
    objective: "Scare Goldenfold into an A: it's his dream, so he fights back",
    phases: [...GF.phases],
    reward: 'emergency-parachute',
    music: 'dog-goldenfold-boss',
    // Canon: Goldenfold turns the dream on them, and they fall toward lava.
    dazed: (api, boss, done) => api.actScene(goldenfoldTurnsIt(api, boss), done),
  },
  brain: function* (api: EnemyApi): Brain {
    const self = api.self;
    let phase = 1;
    api.say(LINES.goldenfold.intro, 2.4);
    yield 0.8;
    while (true) {
      const next = self.hp / self.maxHp < GF.phases[1] ? 3 : self.hp / self.maxHp < GF.phases[0] ? 2 : 1;
      if (next > phase) {
        phase = next;
        api.stop();
        api.say(phase === 2 ? LINES.goldenfold.phase2 : LINES.goldenfold.phase3, 2.2);
        api.sfx('boss-roar');
        api.shake(9, 320);
        // Phase change: the dream lurches.
        yield* bankTheCabin(api);
        yield 0.4;
      }
      const speed = phase === 3 ? 1.3 : phase === 2 ? 1.12 : 1;
      const windupMult = phase === 3 ? 0.85 : phase === 2 ? 0.92 : 1;
      yield* during(api, api.rng.float(0.8, 1.3) / speed, () => api.keepDistance(180, 320, speed));
      api.stop();
      const roll = api.rng.next();
      const guns = api.allies(2000).filter((e) => e.def.id === 'dream-machine-gun').length;
      if (roll < 0.45) {
        yield* hail(api, windupMult, phase === 3 ? 3 : 2);
        // Winded after emptying the drum.
        yield* api.stagger(GF.hailStagger);
      } else if (roll < 0.65 && guns < GF.guns + phase - 1) {
        yield* summonGuns(api, GF.guns);
      } else if (phase >= 2 && roll < 0.82) {
        yield* bankTheCabin(api);
      } else if (phase === 3) {
        yield* gradeRing(api, windupMult);
      } else {
        yield* hail(api, windupMult, 1);
      }
      yield 0.4;
    }
  },
};

// ---- Snowball ------------------------------------------------------------------------------------

function* clawSwipe(api: EnemyApi, windupMult: number): Brain {
  let angle = api.angleToPlayer();
  yield* api.windup(0.5 * windupMult, () => {
    angle = api.angleToPlayer();
    return { kind: 'arc', x: api.self.x, y: api.self.y, radius: 140, angle, spread: 1.8 };
  });
  api.sfx('slash');
  api.melee({ shape: 'arc', x: api.self.x, y: api.self.y, radius: 140, angle, spread: 1.8, damage: 1, knockback: 420 });
}

/** The suit's eye laser, swept across the room. */
function* laserSweep(api: EnemyApi, windupMult: number): Brain {
  const a = api.angleToPlayer();
  const from = a - 1;
  const to = a + 1;
  yield* api.windup(0.7 * windupMult, { kind: 'arc', x: api.self.x, y: api.self.y, radius: 520, angle: a, spread: 2 });
  api.sfx('laser');
  api.hazard({ kind: 'sweep', x: api.self.x, y: api.self.y - 30, from, to, length: 560, width: 22, seconds: 1.3, damage: 1 });
  yield 1.4;
}

/** Missiles from the shoulder pods, landing where Morty stands. */
function* missiles(api: EnemyApi, windupMult: number, count: number): Brain {
  const spots = Array.from({ length: count }, (_, i) => ({ x: api.player.x + (i ? api.rng.float(-120, 120) : 0), y: api.player.y + (i ? api.rng.float(-90, 90) : 0) }));
  yield* api.windup(0.8 * windupMult, spots.map((p): TelegraphSpec => ({ kind: 'circle', x: p.x, y: p.y, radius: 58 })));
  for (const p of spots) {
    api.ctx.explode({ x: p.x, y: p.y, radius: 58, damage: 0, playerDamage: 1, color: 0xff8a3d });
    yield 0.08;
  }
}

/** Whistles up helmet pups. */
function* callPups(api: EnemyApi, count: number): Brain {
  api.say(api.rng.pick(LINES.snowball.pups), 1.5);
  const spots = Array.from({ length: count }, () => api.room().randomFloorPoint(api.rng, 220));
  yield* api.windup(0.6, spots.map((p): TelegraphSpec => ({ kind: 'circle', x: p.x, y: p.y, radius: 24 })));
  api.sfx('whistle');
  for (const p of spots) api.spawn('helmet-pup', p.x, p.y);
}

/** A full-speed charge across the room (phase 3), with a stagger when he hits a wall. */
function* kennelCrush(api: EnemyApi, windupMult: number): Brain {
  let angle = api.angleToPlayer();
  yield* api.windup(0.65 * windupMult, () => {
    angle = api.angleToPlayer();
    return { kind: 'line', x: api.self.x, y: api.self.y, angle, length: 520, width: 70 };
  });
  api.sfx('dash');
  let hit = false;
  let wall = false;
  let t = 0;
  while (t < 0.55) {
    api.moveAngle(angle, 4);
    if (!hit) hit = api.melee({ shape: 'circle', x: api.self.x, y: api.self.y, radius: api.self.radius + 16, damage: 1, knockback: 480 });
    t += api.dt();
    if (t > 0.08 && api.self.blocked) {
      wall = true;
      break;
    }
    yield;
  }
  api.stop();
  if (wall) {
    api.shake(10, 260);
    yield* api.stagger(SB.chargeStagger);
  }
}

const SB = LAWNMOWER_DOG.snowball;

export const snowballBoss: EnemyDef = {
  id: 'snowball',
  spawns: ['helmet-pup'],
  name: 'Snowball',
  firstAppears: S01E02,
  canon: true,
  hp: SB.hp,
  speed: SB.speed,
  radius: 30,
  contactDamage: 1,
  knockbackResist: 0.9,
  art: snowballBossSprite,
  boss: {
    title: 'Snowball, in his war suit',
    character: 'snowball',
    objective: "Fight through to Snowball. It's his dream; make him see it",
    phases: [...SB.phases],
    reward: 'snowballs-tag',
    music: 'dog-snowball-boss',
    // Canon: not a kill. Rick shows him it's his dream and what cruelty looks like; he relents.
    dazed: (api, boss, done) => api.actScene(snowballRelents(api, boss), done),
  },
  brain: function* (api: EnemyApi): Brain {
    const self = api.self;
    let phase = 1;
    api.say(LINES.snowball.intro, 2.4);
    yield 0.8;
    while (true) {
      const next = self.hp / self.maxHp < SB.phases[1] ? 3 : self.hp / self.maxHp < SB.phases[0] ? 2 : 1;
      if (next > phase) {
        phase = next;
        api.stop();
        api.say(phase === 2 ? LINES.snowball.phase2 : LINES.snowball.phase3, 2.2);
        api.sfx('boss-roar');
        api.shake(9, 320);
        yield* callPups(api, SB.pups + phase - 1);
        yield 0.4;
      }
      const speed = phase === 3 ? 1.3 : phase === 2 ? 1.12 : 1;
      const windupMult = phase === 3 ? 0.85 : phase === 2 ? 0.92 : 1;
      yield* during(api, api.rng.float(0.7, 1.2) / speed, () => api.chase(speed));
      api.stop();
      const roll = api.rng.next();
      if (api.distToPlayer() < 170 && roll < 0.6) {
        yield* clawSwipe(api, windupMult);
      } else if (phase === 3 && roll < 0.35) {
        yield* kennelCrush(api, windupMult);
      } else if (roll < 0.55) {
        yield* laserSweep(api, windupMult);
        yield* api.stagger(0.8);
      } else if (phase >= 2 && roll < 0.8) {
        yield* missiles(api, windupMult, phase === 3 ? 4 : 3);
      } else {
        yield* missiles(api, windupMult, 2);
      }
      yield 0.35;
    }
  },
};

export const DOG_BOSSES: EnemyDef[] = [dreamGoldenfold, snowballBoss];
