/**
 * Items, synergies and the transformation introduced in "Lawnmower Dog". Canon items come from
 * the episode (Snuffles' helmet and batteries, Rick's dream inceptor, Terry's finger blades and
 * hat, the velvet rope, Mrs. Pancakes, the plane's emergency gear); the rest are invented,
 * themed on the plane, the dreams, Terry's school and Snowball's world.
 *
 * Every item follows ITEM_RULES (balance.ts, checked by tests/items.test.ts): a passive changes
 * what Morty does or sees, and every item says in one plain line exactly what it does.
 */
import { blob, dot, heart, INK, shade, stroke, wonkyPoly, wonkyRect } from '../../../engine/art/draw';
import type { EnemyRef, GameCtx, Graphics, ItemDef, SpriteArt, StatusDef, SynergyDef, TransformationDef } from '../../../engine/types';
import { ECONOMY } from '../../balance';
import { drawDog, SNUFFLES_EAR, SNUFFLES_FUR } from './art';

const P = ECONOMY.prices;
const S01E02 = 'S01E02' as const;

/** Counts calls under a run flag and says whether this one is the nth. */
function every(ctx: GameCtx, key: string, n: number): boolean {
  const c = ((ctx.flags[key] as number | undefined) ?? 0) + 1;
  ctx.flags[key] = c;
  return c % n === 0;
}

/** Everything close to a spot (except `skip`). */
function near(ctx: GameCtx, x: number, y: number, radius: number, skip?: EnemyRef): EnemyRef[] {
  return ctx.enemies().filter((e) => e !== skip && e.alive && Math.hypot(e.x - x, e.y - y) < radius);
}

function helmetIcon(g: Graphics): void {
  stroke(g, [[18, 10], [22, 3]], INK, 2);
  dot(g, 22, 3, 3, 0x97ce4c);
  wonkyPoly(g, [[5, 22], [7, 12], [13, 8], [19, 8], [25, 12], [27, 22]], { fill: 0xc9ced9, seed: 1, lineWidth: 2.5 });
  wonkyRect(g, 4, 20, 24, 5, { fill: 0x8c95a6, seed: 2, radius: 2, lineWidth: 2 });
  dot(g, 10, 22.5, 1.6, 0x6fd0ff);
  dot(g, 16, 22.5, 1.6, 0xff4a3d);
  dot(g, 22, 22.5, 1.6, 0x6fd0ff);
}

// ---- sprites for companions and looks -------------------------------------------------------------

export const DOG_ITEM_ART: SpriteArt[] = [
  {
    // A teddy bear from the little girl's dream, on your side now.
    key: 'companion-teddy',
    width: 28,
    height: 30,
    draw: (g, w, h) => {
      const fur = 0xc9935f;
      blob(g, w * 0.26, h * 0.14, 4.5, 4.5, { fill: fur, seed: 3201, lineWidth: 2 });
      blob(g, w * 0.74, h * 0.14, 4.5, 4.5, { fill: fur, seed: 3202, lineWidth: 2 });
      blob(g, w / 2, h * 0.66, w * 0.34, h * 0.28, { fill: fur, seed: 3203, lineWidth: 2 });
      blob(g, w / 2, h * 0.3, w * 0.3, h * 0.22, { fill: fur, seed: 3204, lineWidth: 2 });
      blob(g, w / 2, h * 0.37, w * 0.12, h * 0.07, { fill: shade(fur, 0.35), seed: 3205, lineWidth: 1.5 });
      dot(g, w * 0.4, h * 0.27, 2, INK);
      dot(g, w * 0.6, h * 0.27, 2, INK);
      heart(g, w / 2, h * 0.66, 9, 0xe0484d);
    },
  },
  {
    // A robot pup from Snowball's army, wagging for you now.
    key: 'companion-robo-pup',
    width: 32,
    height: 30,
    draw: (g, w, h) => drawDog(g, w, h, { seed: 3211, fur: SNUFFLES_FUR, ear: SNUFFLES_EAR, helmet: true, suit: 0x9aa3b5, tongue: true }),
  },
  {
    // Snuffles' helmet, sized for a boy.
    key: 'look-dog-helmet',
    width: 40,
    height: 24,
    draw: (g, w) => {
      stroke(g, [[w * 0.6, 10], [w * 0.7, 2]], INK, 2);
      dot(g, w * 0.7, 2, 3, 0x97ce4c);
      wonkyPoly(g, [[2, 22], [5, 12], [14, 7], [w - 14, 7], [w - 5, 12], [w - 2, 22]], { fill: 0xc9ced9, seed: 3221, lineWidth: 2.5 });
      wonkyRect(g, 1, 18, w - 2, 5, { fill: 0x8c95a6, seed: 3222, radius: 2, lineWidth: 2 });
      dot(g, w / 2, 20.5, 1.8, 0xff4a3d);
    },
  },
  {
    // Terry's brown hat.
    key: 'look-terry-hat',
    width: 44,
    height: 22,
    draw: (g, w, h) => {
      wonkyRect(g, 2, h - 8, w - 4, 6, { fill: 0x5a3a22, seed: 3231, radius: 3, lineWidth: 2 });
      wonkyPoly(g, [[11, h - 7], [13, 3], [w / 2, 6], [w - 13, 3], [w - 11, h - 7]], { fill: 0x6b4a2e, seed: 3232, lineWidth: 2 });
      g.fillStyle(0x2a1d14, 1);
      g.fillRect(12, h - 11, w - 24, 3);
    },
  },
  {
    // A sleep mask pushed up on the forehead (Lucid Dreamer).
    key: 'look-sleep-mask',
    width: 38,
    height: 14,
    draw: (g, w) => {
      g.fillStyle(0x3a2a20, 1);
      g.fillRect(0, 5, w, 3);
      wonkyRect(g, 5, 1, w - 10, 11, { fill: 0x7f5fd6, seed: 3241, radius: 5, lineWidth: 2 });
      stroke(g, [[10, 6], [15, 8]], 0xf4e9ff, 1.5);
      stroke(g, [[w - 15, 8], [w - 10, 6]], 0xf4e9ff, 1.5);
    },
  },
  {
    // Sheep in a stampede (the Herd of Dream Sheep).
    key: 'shot-sheep',
    width: 34,
    height: 28,
    draw: (g, w, h) => {
      for (const lx of [0.3, 0.45, 0.6, 0.72]) wonkyRect(g, w * lx - 2, h * 0.64, 4, h * 0.3, { fill: INK, seed: 3251 + Math.round(lx * 10), radius: 1, lineWidth: 1 });
      for (let i = 0; i < 5; i++) blob(g, w * (0.34 + (i % 3) * 0.16), h * (0.42 + Math.floor(i / 3) * 0.16), w * 0.15, h * 0.17, { fill: 0xfaf7f0, seed: 3256 + i, lineWidth: 1.8 });
      blob(g, w * 0.82, h * 0.4, w * 0.12, h * 0.16, { fill: 0x2a2432, seed: 3261, lineWidth: 1.8 });
      dot(g, w * 0.85, h * 0.37, 1.6, 0xffffff);
    },
  },
  {
    key: 'shot-gold-star',
    width: 22,
    height: 22,
    draw: (g, w, h) => {
      const pts: [number, number][] = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 4 : 10;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        pts.push([w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r]);
      }
      wonkyPoly(g, pts, { fill: 0xffd54a, seed: 3271, lineWidth: 2 });
    },
  },
  {
    key: 'shot-peanut',
    width: 14,
    height: 10,
    draw: (g) => {
      blob(g, 4.5, 5, 3.8, 3.5, { fill: 0xd9a441, seed: 3281, lineWidth: 1.5 });
      blob(g, 9.5, 5, 3.8, 3.5, { fill: 0xd9a441, seed: 3282, lineWidth: 1.5 });
    },
  },
];

// ---- items ----------------------------------------------------------------------------------------

export const DOG_ITEMS: ItemDef[] = [
  // ---- canon ----------------------------------------------------------------------------------------
  {
    id: 'snuffles-helmet',
    name: "Snuffles' Helmet",
    blurb: 'An intelligence-boosting helmet Rick built for the dog. On you, it mostly boosts your aim.',
    effect: 'Shots home in on enemies.',
    tags: ['shots', 'look'],
    firstAppears: S01E02,
    canon: true,
    kind: 'passive',
    rarity: 'rare',
    price: P.rare,
    stats: { add: { homing: 2.8 } },
    look: { accessory: 'look-dog-helmet', dy: -4 },
    icon: helmetIcon,
  },
  {
    id: 'helmet-batteries',
    name: 'Helmet Batteries',
    blurb: "Snuffles jammed extra batteries into his helmet. You're doing it too. Peer pressure.",
    effect: 'Hits zap lightning to one more enemy nearby.',
    tags: ['shots', 'on-hit'],
    firstAppears: S01E02,
    canon: true,
    kind: 'passive',
    rarity: 'common',
    price: P.common,
    stats: { add: { chain: 1 } },
    icon: (g) => {
      for (let i = 0; i < 3; i++) {
        wonkyRect(g, 5 + i * 8, 9, 7, 17, { fill: [0xd98f3a, 0x3a3a44, 0xd98f3a][i], seed: 10 + i, radius: 2, lineWidth: 2 });
        wonkyRect(g, 7 + i * 8, 6, 3, 4, { fill: 0xc9ced9, seed: 13 + i, radius: 1, lineWidth: 1.5 });
      }
      wonkyPoly(g, [[18, 12], [14, 19], [18, 19], [15, 27], [22, 17], [18, 17]], { fill: 0xffe27a, seed: 16, lineWidth: 1.5 });
    },
  },
  {
    id: 'dream-inceptor',
    name: "Rick's Dream Inceptor",
    blurb: "The gadget Rick used to get into Goldenfold's head. Point it at a room and everyone's dreaming.",
    effect: 'Every enemy in the room freezes solid for 3 s (frozen enemies shatter), and you heal half a heart.',
    tags: ['room'],
    firstAppears: S01E02,
    canon: true,
    kind: 'active',
    rarity: 'rare',
    // Joins the pool once Lawnmower Dog is cleared.
    locked: true,
    price: P.rare,
    active: {
      recharge: 4,
      use: (ctx) => {
        for (const e of ctx.enemies()) {
          ctx.freeze(e, 3);
          ctx.vfx({ kind: 'text', x: e.x, y: e.y - 30, text: 'Zzz', color: '#c9b3ff' });
        }
        ctx.player.heal(1);
        ctx.flash(0x7f5fd6, 180);
        ctx.vfx({ kind: 'ring', x: ctx.player.x, y: ctx.player.y - 10, color: 0xc9b3ff, radius: 260 });
        ctx.sfx('portal');
      },
    },
    icon: (g) => {
      wonkyRect(g, 5, 14, 22, 13, { fill: 0x5d6b7b, seed: 21, radius: 4 });
      dot(g, 11, 20, 2.5, 0x97ce4c);
      dot(g, 17, 20, 2.5, 0xffd54a);
      stroke(g, [[16, 14], [16, 8]], INK, 2);
      wonkyPoly(g, [[8, 9], [16, 3], [24, 9], [16, 11]], { fill: 0xc9ced9, seed: 22, lineWidth: 2 });
    },
  },
  {
    id: 'emergency-parachute',
    name: 'Emergency Parachute',
    blurb: "From under Goldenfold's dream seat. In the event of a nightmare, pull the cord.",
    effect: 'Getting hurt pops a parachute that shoves nearby enemies away and dazes them; dash recovers 25% faster.',
    tags: ['on-hurt', 'stat'],
    firstAppears: S01E02,
    canon: true,
    kind: 'passive',
    rarity: 'rare',
    price: P.rare,
    stats: { mult: { dashCooldown: 0.75 } },
    hooks: {
      onDamageTaken: (ctx) => {
        const { x, y } = ctx.player;
        ctx.pushEnemies(x, y, 190, 720);
        for (const e of near(ctx, x, y, 190)) ctx.stun(e, 1.2);
        ctx.vfx({ kind: 'ring', x, y: y - 10, color: 0xff8a3d, radius: 190 });
        ctx.sfx('pop');
      },
    },
    icon: (g) => {
      wonkyPoly(g, [[4, 16], [8, 7], [16, 4], [24, 7], [28, 16]], { fill: 0xff8a3d, seed: 31, lineWidth: 2.5 });
      g.fillStyle(0xffffff, 1);
      g.fillTriangle(12, 15, 16, 5, 20, 15);
      stroke(g, [[5, 16], [16, 27]], INK, 1.5);
      stroke(g, [[27, 16], [16, 27]], INK, 1.5);
      dot(g, 16, 27, 3, 0x3a3a44);
    },
  },
  {
    id: 'terrys-finger-blades',
    name: "Terry's Finger Blades",
    blurb: 'Five blades, one per finger. Terry has spares. Terry has a LOT of spares.',
    effect: 'Every hit also slashes enemies around the target for half damage.',
    tags: ['on-hit'],
    firstAppears: S01E02,
    canon: true,
    kind: 'passive',
    rarity: 'rare',
    price: P.rare,
    hooks: {
      onHit: (ctx, e, hit) => {
        if (hit.source !== 'shot') return;
        const others = near(ctx, e.x, e.y, 80, e);
        ctx.vfx({ kind: 'slash', x: e.x, y: e.y - 12, angle: ctx.rng.angle(), color: 0xdfe6ee });
        for (const o of others) ctx.damageEnemy(o, hit.damage * 0.5, 'slash');
      },
    },
    icon: (g) => {
      wonkyRect(g, 6, 18, 14, 10, { fill: 0xd98f7f, seed: 41, radius: 4 });
      for (let i = 0; i < 4; i++) {
        stroke(g, [[8 + i * 3.5, 18], [11 + i * 5, 3]], INK, 3.5);
        stroke(g, [[8 + i * 3.5, 18], [11 + i * 5, 3]], 0xdfe6ee, 1.8);
      }
    },
  },
  {
    id: 'terrys-hat',
    name: "Terry's Hat",
    blurb: 'Brown, battered, and absolutely terrifying to anyone under ten.',
    effect: 'You wear the hat. Dashing scares nearby enemies back and dazes them for a moment.',
    tags: ['look', 'on-dash'],
    firstAppears: S01E02,
    canon: true,
    kind: 'passive',
    rarity: 'common',
    price: P.common,
    look: { accessory: 'look-terry-hat', dy: -6 },
    hooks: {
      onDash: (ctx) => {
        const { x, y } = ctx.player;
        ctx.pushEnemies(x, y, 150, 520);
        for (const e of near(ctx, x, y, 150)) ctx.stun(e, 0.6);
        ctx.vfx({ kind: 'text', x, y: y - 50, text: 'BOO!', color: '#ff8a8a' });
      },
    },
    icon: (g) => {
      wonkyRect(g, 2, 19, 28, 6, { fill: 0x5a3a22, seed: 51, radius: 3, lineWidth: 2 });
      wonkyPoly(g, [[8, 20], [10, 7], [16, 10], [22, 7], [24, 20]], { fill: 0x6b4a2e, seed: 52, lineWidth: 2 });
    },
  },
  {
    id: 'velvet-rope',
    name: 'Velvet Rope',
    blurb: "From outside Mrs. Pancakes' dream club. VIPs only. Bullets are not VIPs.",
    effect: 'Dashing erases enemy bullets around you.',
    tags: ['on-dash'],
    firstAppears: S01E02,
    canon: true,
    kind: 'passive',
    rarity: 'common',
    price: P.common,
    stats: { add: { dashEraseShots: 115 } },
    icon: (g) => {
      for (const x of [6, 26]) {
        wonkyRect(g, x - 2.5, 10, 5, 18, { fill: 0xd9a441, seed: 60 + x, radius: 1, lineWidth: 1.5 });
        dot(g, x, 9, 3.5, 0xf2c14e);
      }
      g.lineStyle(4, 0xb01e3a, 1);
      g.beginPath();
      g.arc(16, -2, 17, Math.PI * 0.2, Math.PI * 0.8, false);
      g.strokePath();
    },
  },
  {
    id: 'pancakes-autograph',
    name: "Mrs. Pancakes' Autograph",
    blurb: 'Signed with a heart. Goldenfold would trade his tenure for it. Shopkeepers go weak at the knees.',
    effect: 'Everything in shops costs 30% less.',
    tags: ['stat'],
    firstAppears: S01E02,
    canon: true,
    kind: 'passive',
    rarity: 'common',
    price: P.common,
    stats: { mult: { shopPriceMult: 0.7 } },
    icon: (g) => {
      wonkyRect(g, 5, 6, 22, 22, { fill: 0xfdf6e3, seed: 71, radius: 2 });
      stroke(g, [[8, 20], [12, 14], [15, 19], [19, 13], [24, 18]], 0xd8327f, 2);
      heart(g, 22, 11, 8, 0xd8327f);
    },
  },

  // ---- invented: Goldenfold's dream ------------------------------------------------------------
  {
    id: 'in-flight-peanuts',
    name: 'Honey-Roasted Peanuts',
    blurb: 'The complimentary kind. Complimentary to enemies, in the face.',
    effect: 'Kills scatter three peanuts that pelt nearby enemies.',
    tags: ['on-kill'],
    firstAppears: S01E02,
    canon: false,
    kind: 'passive',
    rarity: 'common',
    price: P.common,
    hooks: {
      onKill: (ctx, e, hit) => {
        if (hit.tag === 'peanut') return;
        for (let i = 0; i < 3; i++) {
          ctx.playerShot({ x: e.x, y: e.y, angle: ctx.rng.angle(), damage: ctx.stats().damage * 0.6, speed: 420, life: 0.5, radius: 7, texture: 'shot-peanut', spin: 720, source: 'shard', tag: 'peanut' });
        }
      },
    },
    icon: (g) => {
      wonkyRect(g, 6, 5, 20, 23, { fill: 0x3f6fb5, seed: 81, radius: 3 });
      wonkyRect(g, 9, 11, 14, 8, { fill: 0xf2c14e, seed: 82, radius: 2, lineWidth: 1.5 });
      blob(g, 13, 15, 2.5, 2.2, { fill: 0xd9a441, seed: 83, lineWidth: 1 });
      blob(g, 17, 15, 2.5, 2.2, { fill: 0xd9a441, seed: 84, lineWidth: 1 });
    },
  },
  {
    id: 'oxygen-mask',
    name: 'Oxygen Mask',
    blurb: 'Put yours on before helping others. Then help yourself to some violence.',
    effect: 'Getting hurt releases a blast of air that clears every enemy bullet in the room.',
    tags: ['on-hurt'],
    firstAppears: S01E02,
    canon: false,
    kind: 'passive',
    rarity: 'common',
    price: P.common,
    hooks: {
      onDamageTaken: (ctx) => {
        const n = ctx.clearEnemyShots();
        const { x, y } = ctx.player;
        ctx.vfx({ kind: 'ring', x, y: y - 10, color: 0xdff4ff, radius: 220 });
        if (n) ctx.vfx({ kind: 'text', x, y: y - 50, text: 'WHOOSH', color: '#dff4ff' });
        ctx.sfx('whiff');
      },
    },
    icon: (g) => {
      stroke(g, [[16, 2], [16, 10]], 0xf2c14e, 2);
      blob(g, 16, 17, 9, 8, { fill: 0xf2c14e, seed: 91, lineWidth: 2 });
      stroke(g, [[8, 17], [3, 12]], INK, 1.5);
      stroke(g, [[24, 17], [29, 12]], INK, 1.5);
      wonkyRect(g, 12, 24, 8, 6, { fill: 0xdff4ff, seed: 92, radius: 2, lineWidth: 1.5 });
    },
  },
  {
    id: 'first-class-pass',
    name: 'First-Class Boarding Pass',
    blurb: "Upgraded. You've got legroom now. You're going to use it to run.",
    effect: '+30% move speed, and dash recovers 25% faster.',
    tags: ['stat'],
    firstAppears: S01E02,
    canon: false,
    kind: 'passive',
    rarity: 'common',
    price: P.common,
    stats: { mult: { moveSpeed: 1.3, dashCooldown: 0.75 } },
    icon: (g) => {
      wonkyRect(g, 3, 8, 26, 16, { fill: 0xf4efe6, seed: 101, radius: 2 });
      g.fillStyle(0xf2c14e, 1);
      g.fillRect(4, 9, 7, 14);
      stroke(g, [[14, 13], [25, 13]], INK, 1.5);
      stroke(g, [[14, 18], [22, 18]], INK, 1.5);
    },
  },
  {
    id: 'grade-book',
    name: "Goldenfold's Grade Book",
    blurb: 'Every grade in it is an F. Every F in it wants out.',
    effect: 'Every 4th volley is a red-pen critical hit for triple damage.',
    tags: ['shots', 'look'],
    firstAppears: S01E02,
    canon: false,
    kind: 'passive',
    rarity: 'rare',
    price: P.rare,
    stats: { add: { critRate: 0.25 } },
    look: { glow: 0xe0303a },
    icon: (g) => {
      wonkyRect(g, 6, 4, 20, 25, { fill: 0x3f6fb5, seed: 111, radius: 2 });
      wonkyRect(g, 9, 8, 14, 17, { fill: 0xfdf6e3, seed: 112, radius: 1, lineWidth: 1.5 });
      stroke(g, [[13, 21], [13, 11], [19, 11]], 0xe0303a, 2.5);
      stroke(g, [[13, 16], [17, 16]], 0xe0303a, 2.5);
    },
  },
  {
    id: 'bottled-turbulence',
    name: 'Bottled Turbulence',
    blurb: 'A jar of the worst five minutes of any flight. Shake well.',
    effect: 'The whole room lurches: enemies slam into the walls for 8 damage and every bullet drops.',
    tags: ['room'],
    firstAppears: S01E02,
    canon: false,
    kind: 'active',
    rarity: 'common',
    price: P.common,
    active: {
      recharge: 3,
      use: (ctx) => {
        const { x, y } = ctx.player;
        ctx.tilt(0.1, 1.2);
        ctx.shake(8, 400);
        ctx.clearEnemyShots();
        ctx.pushEnemies(x, y, 2000, 900);
        for (const e of ctx.enemies()) ctx.damageEnemy(e, 8, 'explosion', 'turbulence');
        ctx.sfx('crumble');
      },
    },
    icon: (g) => {
      wonkyRect(g, 8, 8, 16, 21, { fill: 0xbfe4ff, seed: 121, radius: 5 });
      wonkyRect(g, 10, 4, 12, 5, { fill: 0x8a6d4b, seed: 122, radius: 2, lineWidth: 2 });
      blob(g, 16, 18, 5, 4, { fill: 0x8a8fa8, seed: 123, lineWidth: 1.5 });
      wonkyPoly(g, [[16, 20], [14, 25], [16, 24], [15, 28], [19, 23], [17, 23]], { fill: 0xffe27a, seed: 124, lineWidth: 1 });
    },
  },

  // ---- invented: the dreams within dreams ------------------------------------------------------
  {
    id: 'lucky-horseshoe',
    name: 'Lucky Horseshoe',
    blurb: 'Thrown at you by a very angry centaur. Lucky for you, it missed.',
    effect: 'Shots ricochet off an enemy toward the next one.',
    tags: ['shots'],
    firstAppears: S01E02,
    canon: false,
    kind: 'passive',
    rarity: 'common',
    price: P.common,
    stats: { add: { ricochet: 1 } },
    icon: (g) => {
      g.lineStyle(9, INK, 1);
      g.beginPath();
      g.arc(16, 14, 9, Math.PI * 0.85, Math.PI * 2.15, false);
      g.strokePath();
      g.lineStyle(5, 0xc9ced9, 1);
      g.beginPath();
      g.arc(16, 14, 9, Math.PI * 0.85, Math.PI * 2.15, false);
      g.strokePath();
      for (const a of [1.3, 1.8, 2.2]) dot(g, 16 + Math.cos(a * Math.PI) * 9, 14 + Math.sin(a * Math.PI) * 9, 1.4, INK);
    },
  },
  {
    id: 'nightmare-teddy',
    name: 'Nightmare Teddy',
    blurb: 'From the little girl\'s dream. It hugs enemies. Hard.',
    effect: 'A teddy bear follows you and pounces on enemies.',
    tags: ['companion'],
    firstAppears: S01E02,
    canon: false,
    kind: 'passive',
    rarity: 'rare',
    price: P.rare,
    companion: { art: 'companion-teddy', kind: 'pouncer', every: 2.2, damage: 1.8 },
    icon: (g) => {
      blob(g, 9, 7, 4, 4, { fill: 0xc9935f, seed: 131, lineWidth: 2 });
      blob(g, 23, 7, 4, 4, { fill: 0xc9935f, seed: 132, lineWidth: 2 });
      blob(g, 16, 22, 10, 8, { fill: 0xc9935f, seed: 133, lineWidth: 2 });
      blob(g, 16, 12, 9, 7, { fill: 0xc9935f, seed: 134, lineWidth: 2 });
      dot(g, 13, 11, 1.8, INK);
      dot(g, 19, 11, 1.8, INK);
      heart(g, 16, 22, 7, 0xe0484d);
    },
  },
  {
    id: 'tea-party-set',
    name: 'Tea Party Set',
    blurb: 'One lump or two? Two. Always two.',
    effect: '1 in 8 kills pours a cup of tea that heals half a heart.',
    tags: ['on-kill'],
    firstAppears: S01E02,
    canon: false,
    kind: 'passive',
    rarity: 'common',
    price: P.common,
    hooks: {
      onKill: (ctx, e) => {
        // Tea for Two: with the teddy along, every 4th kill on average.
        const odds = ctx.hasItem('nightmare-teddy') ? 4 : 8;
        if (!ctx.rng.chance(1 / odds)) return;
        ctx.player.heal(1);
        ctx.vfx({ kind: 'burst', style: 'heal', x: ctx.player.x, y: ctx.player.y - 20, count: 10 });
        ctx.vfx({ kind: 'text', x: e.x, y: e.y - 30, text: 'Tea time!', color: '#f8c4dc' });
        ctx.sfx('heal');
      },
    },
    icon: (g) => {
      blob(g, 14, 18, 9, 8, { fill: 0xffffff, seed: 141, lineWidth: 2 });
      stroke(g, [[23, 16], [28, 12]], INK, 2);
      wonkyRect(g, 11, 7, 6, 4, { fill: 0xf2b0cf, seed: 142, radius: 2, lineWidth: 1.5 });
      dot(g, 14, 18, 2.5, 0xf28fb8);
    },
  },
  {
    id: 'sheep-plush',
    name: 'Sheep Plush',
    blurb: 'Soft, round, and surprisingly effective at making things fall asleep mid-fight.',
    effect: 'Every 4th hit puts its target to sleep for 1.5 s.',
    tags: ['on-hit'],
    firstAppears: S01E02,
    canon: false,
    kind: 'passive',
    rarity: 'common',
    price: P.common,
    hooks: {
      onHit: (ctx, e, hit) => {
        if (hit.killed || hit.source !== 'shot' || hit.tag === 'sheep') return;
        // Counting to Zzz: with the herd, every 3rd hit.
        const n = ctx.hasItem('herd-of-sheep') ? 3 : 4;
        if (!every(ctx, 'sheepPlushHits', n)) return;
        ctx.stun(e, 1.5);
        ctx.vfx({ kind: 'text', x: e.x, y: e.y - 30, text: 'Zzz', color: '#c9b3ff' });
      },
    },
    icon: (g) => {
      for (let i = 0; i < 6; i++) blob(g, 10 + (i % 3) * 6, 14 + Math.floor(i / 3) * 7, 5, 5, { fill: 0xfaf7f0, seed: 150 + i, lineWidth: 1.5 });
      blob(g, 25, 14, 4, 5, { fill: 0x2a2432, seed: 157, lineWidth: 1.5 });
    },
  },
  {
    id: 'jack-spring',
    name: 'Jack-in-the-Box Spring',
    blurb: 'Boing.',
    effect: 'Shots bounce off walls two more times.',
    tags: ['shots'],
    firstAppears: S01E02,
    canon: false,
    kind: 'passive',
    rarity: 'common',
    price: P.common,
    stats: { add: { bounces: 2 } },
    icon: (g) => {
      for (let i = 0; i < 5; i++) stroke(g, [[9, 26 - i * 4], [23, 24 - i * 4]], 0x8c95a6, 3);
      blob(g, 16, 7, 6, 5, { fill: 0xf8f0e8, seed: 161, lineWidth: 2 });
      dot(g, 16, 8, 1.8, 0xe0484d);
    },
  },
  {
    id: 'herd-of-sheep',
    name: 'Herd of Dream Sheep',
    blurb: "Count them. Then aim them.",
    effect: 'Six dream sheep stampede out of you, trampling through enemies for 10 damage each.',
    tags: ['room'],
    firstAppears: S01E02,
    canon: false,
    kind: 'active',
    rarity: 'common',
    price: P.common,
    active: {
      recharge: 3,
      use: (ctx) => {
        const { x, y } = ctx.player;
        for (let i = 0; i < 6; i++) {
          ctx.playerShot({ x, y, angle: (i / 6) * Math.PI * 2, damage: 10, speed: 400, radius: 14, life: 1.4, texture: 'shot-sheep', upright: true, pierce: 5, tag: 'sheep', color: 0xfaf7f0 });
        }
        ctx.vfx({ kind: 'burst', style: 'paper', x, y: y - 10, count: 16 });
        ctx.sfx('hop');
        ctx.shake(5, 260);
      },
    },
    icon: (g) => {
      for (let i = 0; i < 5; i++) blob(g, 8 + (i % 3) * 5, 13 + Math.floor(i / 3) * 6, 4.5, 4.5, { fill: 0xfaf7f0, seed: 170 + i, lineWidth: 1.5 });
      blob(g, 21, 11, 3.5, 4, { fill: 0x2a2432, seed: 176, lineWidth: 1.5 });
      stroke(g, [[22, 20], [29, 20]], INK, 2);
      stroke(g, [[22, 24], [28, 24]], INK, 2);
    },
  },
  {
    id: 'nightmare-fuel',
    name: 'Nightmare Fuel',
    blurb: "It's what dreams run on when they go bad. You probably shouldn't drink it. You did.",
    effect: '+30% damage, and kills leave a burst of nightmare that hurts enemies nearby.',
    tags: ['stat', 'on-kill'],
    firstAppears: S01E02,
    canon: false,
    kind: 'passive',
    rarity: 'rare',
    // Joins the pool once Lawnmower Dog is cleared.
    locked: true,
    price: P.rare,
    stats: { mult: { damage: 1.3 } },
    hooks: {
      onKill: (ctx, e, hit) => {
        if (hit.tag === 'nightmare') return;
        ctx.explode({ x: e.x, y: e.y, radius: 70, damage: ctx.stats().damage * 0.5, color: 0x5a2a7a, tag: 'nightmare', small: true });
      },
    },
    icon: (g) => {
      wonkyRect(g, 9, 8, 14, 21, { fill: 0x3a1a4a, seed: 181, radius: 5 });
      wonkyRect(g, 12, 3, 8, 6, { fill: 0x8c95a6, seed: 182, radius: 2, lineWidth: 1.5 });
      dot(g, 14, 17, 2, 0xff4a3d);
      dot(g, 19, 17, 2, 0xff4a3d);
      stroke(g, [[13, 23], [16, 21], [19, 23]], 0xff4a3d, 1.5);
    },
  },

  // ---- invented: Terry's dream school ------------------------------------------------------------
  {
    id: 'striped-sweater',
    name: 'Striped Nightmare Sweater',
    blurb: "Itchy, warm, and it smells a little like fear. Terry's mom knitted it.",
    effect: 'You wear the sweater: +1 heart.',
    tags: ['look', 'stat'],
    firstAppears: S01E02,
    canon: false,
    kind: 'passive',
    rarity: 'common',
    price: P.common,
    stats: { add: { maxHearts: 1 } },
    look: { shirt: 0x8b2323 },
    icon: (g) => {
      wonkyPoly(g, [[4, 12], [10, 5], [22, 5], [28, 12], [24, 16], [24, 28], [8, 28], [8, 16]], { fill: 0x8b2323, seed: 191, lineWidth: 2 });
      g.fillStyle(0x4f5a2a, 1);
      for (const y of [11, 18, 24]) g.fillRect(9, y, 14, 3);
    },
  },
  {
    id: 'spitball-straw',
    name: 'Spitball Straw',
    blurb: 'Confiscated from the back row. Disgusting. Effective.',
    effect: 'Shots burst into two mini shots when they hit.',
    tags: ['shots'],
    firstAppears: S01E02,
    canon: false,
    kind: 'passive',
    rarity: 'common',
    price: P.common,
    stats: { add: { split: 2 } },
    icon: (g) => {
      stroke(g, [[5, 27], [24, 6]], INK, 5);
      stroke(g, [[5, 27], [24, 6]], 0xf4efe6, 3);
      stroke(g, [[8, 24], [11, 21]], 0xe0484d, 3);
      dot(g, 27, 4, 3, 0xfdf6e3);
    },
  },
  {
    id: 'gold-star',
    name: 'Gold Star',
    blurb: 'For effort. Terry never got one. You earned one for him.',
    effect: 'Kills launch a gold star that homes in on the nearest enemy.',
    tags: ['on-kill'],
    firstAppears: S01E02,
    canon: false,
    kind: 'passive',
    rarity: 'common',
    price: P.common,
    hooks: {
      onKill: (ctx, e, hit) => {
        if (hit.tag === 'gold-star') return;
        const target = near(ctx, e.x, e.y, 500, e)[0];
        const angle = target ? Math.atan2(target.y - e.y, target.x - e.x) : ctx.rng.angle();
        ctx.playerShot({ x: e.x, y: e.y, angle, damage: ctx.stats().damage * 1.2, speed: 460, radius: 10, life: 1.2, texture: 'shot-gold-star', spin: 540, homing: 6, tag: 'gold-star', source: 'shard' });
      },
    },
    icon: (g) => {
      const pts: [number, number][] = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 5.5 : 13;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        pts.push([16 + Math.cos(a) * r, 17 + Math.sin(a) * r]);
      }
      wonkyPoly(g, pts, { fill: 0xffd54a, seed: 201, lineWidth: 2 });
    },
  },

  // ---- invented: Snowball's world ---------------------------------------------------------------
  {
    id: 'dog-whistle',
    name: 'Dog Whistle',
    blurb: "Only dogs can hear it. Also dream creatures. Also, somehow, Jerry.",
    effect: 'Every enemy in the room is stunned for 3 s and takes 10 damage.',
    tags: ['room'],
    firstAppears: S01E02,
    canon: false,
    kind: 'active',
    rarity: 'common',
    price: P.common,
    active: {
      recharge: 3,
      use: (ctx) => {
        for (const e of ctx.enemies()) {
          ctx.damageEnemy(e, 10, 'explosion', 'whistle');
          if (e.alive) ctx.stun(e, 3);
        }
        ctx.vfx({ kind: 'ring', x: ctx.player.x, y: ctx.player.y - 10, color: 0xf2c14e, radius: 300 });
        ctx.sfx('whistle');
        ctx.shake(4, 200);
      },
    },
    icon: (g) => {
      wonkyRect(g, 4, 13, 20, 8, { fill: 0xc9ced9, seed: 211, radius: 4 });
      dot(g, 10, 17, 2, INK);
      stroke(g, [[24, 17], [29, 17]], INK, 2);
      stroke(g, [[23, 11], [28, 7]], 0xf2c14e, 2);
      stroke(g, [[23, 23], [28, 27]], 0xf2c14e, 2);
    },
  },
  {
    id: 'snowballs-tag',
    name: "Snowball's Name Tag",
    blurb: 'SNOWBALL. If found, please return to his army. Or keep the robot pup that came with it.',
    effect: 'A robot pup follows you and fires lasers at enemies.',
    tags: ['companion'],
    firstAppears: S01E02,
    canon: true,
    kind: 'passive',
    rarity: 'rare',
    price: P.rare,
    companion: { art: 'companion-robo-pup', kind: 'shooter', every: 1, damage: 0.8 },
    icon: (g) => {
      stroke(g, [[16, 3], [16, 8]], INK, 2);
      dot(g, 16, 4, 3, 0xc9ced9);
      blob(g, 16, 18, 10, 10, { fill: 0xf2c14e, seed: 221, lineWidth: 2 });
      stroke(g, [[11, 18], [21, 18]], INK, 2);
    },
  },
  {
    id: 'dream-cookies',
    name: 'Milk and Dream Cookies',
    blurb: "Left out for someone. Probably not you. Too late.",
    effect: 'Use: heal 1 heart.',
    tags: ['heal'],
    firstAppears: S01E02,
    canon: false,
    kind: 'consumable',
    rarity: 'common',
    price: P.consumable,
    consumable: {
      use: (ctx) => {
        if (ctx.player.hp >= ctx.player.maxHp) return false;
        ctx.player.heal(2);
        ctx.sfx('heal');
      },
    },
    icon: (g) => {
      wonkyRect(g, 18, 8, 10, 18, { fill: 0xf4f7ff, seed: 231, radius: 2 });
      blob(g, 11, 20, 8, 7, { fill: 0xc9935f, seed: 232, lineWidth: 2 });
      dot(g, 9, 18, 1.5, 0x3a2418);
      dot(g, 13, 22, 1.5, 0x3a2418);
    },
  },
  {
    id: 'lucid-energy-drink',
    name: 'Lucid Energy Drink',
    blurb: 'Stay lucid. Stay caffeinated. Stay slightly vibrating.',
    effect: 'Use: shoot 60% faster for 12 seconds.',
    tags: ['status'],
    firstAppears: S01E02,
    canon: false,
    kind: 'consumable',
    rarity: 'common',
    price: P.consumable,
    consumable: {
      use: (ctx) => {
        ctx.applyStatus('lucid');
        ctx.sfx('charge-ready');
      },
    },
    icon: (g) => {
      wonkyRect(g, 10, 5, 12, 23, { fill: 0x7f5fd6, seed: 241, radius: 3 });
      wonkyPoly(g, [[16, 9], [13, 16], [16, 16], [14, 24], [19, 14], [16, 14]], { fill: 0xffe27a, seed: 242, lineWidth: 1.2 });
    },
  },

  // ---- story: Terry on your side (the climb back up) ----------------------------------------------
  {
    id: 'scary-terry-ally',
    name: 'Scary Terry (on your side)',
    blurb: 'You stood up for him. Now the scariest guy in any dream is your friend. Friend b*tch, as he puts it.',
    effect: 'Scary Terry fights beside you, pouncing on enemies with his finger blades.',
    tags: ['companion'],
    firstAppears: S01E02,
    canon: true,
    kind: 'passive',
    rarity: 'story',
    price: 0,
    noPool: true,
    companion: { art: 'scary-terry', kind: 'pouncer', every: 0.9, damage: 1.6 },
    icon: (g) => {
      wonkyRect(g, 2, 13, 28, 5, { fill: 0x5a3a22, seed: 251, radius: 3, lineWidth: 2 });
      wonkyPoly(g, [[8, 14], [10, 4], [16, 7], [22, 4], [24, 14]], { fill: 0x6b4a2e, seed: 252, lineWidth: 2 });
      for (let i = 0; i < 4; i++) stroke(g, [[9 + i * 4, 22], [7 + i * 5, 30]], 0xdfe6ee, 2);
    },
  },
];

// ---- statuses ---------------------------------------------------------------------------------------

export const DOG_STATUSES: StatusDef[] = [
  {
    id: 'lucid',
    name: 'Lucid',
    description: 'Wide awake inside a dream: shooting 60% faster.',
    firstAppears: S01E02,
    canon: false,
    positive: true,
    duration: { kind: 'seconds', value: 12 },
    stats: { mult: { fireRate: 1.6 } },
    icon: (g) => {
      blob(g, 16, 16, 11, 11, { fill: 0x7f5fd6, seed: 261, lineWidth: 2 });
      wonkyPoly(g, [[16, 8], [12, 17], [16, 17], [14, 25], [21, 14], [17, 14]], { fill: 0xffe27a, seed: 262, lineWidth: 1.2 });
    },
  },
  {
    id: 'dream-courage',
    name: 'Terry Believes in You',
    description: 'Little Terry got his confidence back, and he passed some on: +25% damage for the rest of the act.',
    firstAppears: S01E02,
    canon: false,
    positive: true,
    duration: { kind: 'act' },
    endsWithAct: true,
    stats: { mult: { damage: 1.25 } },
    icon: (g) => {
      heart(g, 16, 16, 20, 0xd96a5a);
      stroke(g, [[11, 9], [21, 9]], 0x5a3a22, 3);
    },
  },
];

// ---- synergies --------------------------------------------------------------------------------------

export const DOG_SYNERGIES: SynergyDef[] = [
  {
    id: 'good-boy-genius',
    name: 'Good Boy Genius',
    blurb: "The full Snuffles upgrade. Don't let it go to your head. It's going to your head.",
    effect: 'Homing gets much sharper and lightning jumps to one more enemy.',
    firstAppears: S01E02,
    canon: false,
    requires: ['snuffles-helmet', 'helmet-batteries'],
    stats: { add: { homing: 2, chain: 1 } },
  },
  {
    id: 'scary-morty',
    name: 'Scary Morty',
    blurb: 'Blades and the hat. Morty is the nightmare now. A small, polite nightmare.',
    effect: 'Blade slashes stun what they cut, and dashing sends out a ring of slashes.',
    firstAppears: S01E02,
    canon: false,
    requires: ['terrys-finger-blades', 'terrys-hat'],
    hooks: {
      onHit: (ctx, e, hit) => {
        if (hit.source === 'slash' && !hit.killed) ctx.stun(e, 0.8);
      },
      onDash: (ctx) => {
        const { x, y } = ctx.player;
        for (const e of near(ctx, x, y, 130)) ctx.damageEnemy(e, ctx.stats().damage, 'slash');
        for (let i = 0; i < 4; i++) ctx.vfx({ kind: 'slash', x: x + Math.cos(i * 1.57) * 60, y: y - 10 + Math.sin(i * 1.57) * 40, angle: i * 1.57, color: 0xdfe6ee });
      },
    },
  },
  {
    id: 'frequent-flyer',
    name: 'Frequent Flyer',
    blurb: 'First class and a parachute. You fly like you mean it.',
    effect: 'Dashing leaves a gust that knocks enemies back, and dash recovers even faster.',
    firstAppears: S01E02,
    canon: false,
    requires: ['first-class-pass', 'emergency-parachute'],
    stats: { mult: { dashCooldown: 0.8 } },
    hooks: {
      onDash: (ctx) => {
        const { x, y } = ctx.player;
        ctx.pushEnemies(x, y, 140, 600);
        ctx.vfx({ kind: 'ring', x, y: y - 10, color: 0xdff4ff, radius: 140 });
      },
    },
  },
  {
    id: 'tea-for-two',
    name: 'Tea for Two',
    blurb: 'The teddy gets a cup, you get a cup. Everybody gets a cup.',
    effect: 'The teddy pounces twice as often, and tea heals on 1 in 4 kills instead of 1 in 8.',
    firstAppears: S01E02,
    canon: false,
    requires: ['tea-party-set', 'nightmare-teddy'],
    // The tea half lives in the Tea Party Set's hook (it checks for the teddy).
    stats: { mult: { companionRate: 2 } },
  },
  {
    id: 'counting-to-zzz',
    name: 'Counting to Zzz',
    blurb: 'One sheep, two sheep, everybody down.',
    effect: 'Every 3rd hit puts its target to sleep, and the stampeding sheep put everything they touch to sleep.',
    firstAppears: S01E02,
    canon: false,
    requires: ['sheep-plush', 'herd-of-sheep'],
    // Every 3rd hit lives in the Sheep Plush's hook (it checks for the herd).
    hooks: {
      onHit: (ctx, e, hit) => {
        if (hit.tag !== 'sheep' || hit.killed) return;
        ctx.stun(e, 1.5);
        ctx.vfx({ kind: 'text', x: e.x, y: e.y - 30, text: 'Zzz', color: '#c9b3ff' });
      },
    },
  },
  {
    id: 'straight-as',
    name: "Straight A's",
    blurb: "Goldenfold's grade book and a gold star. Morty's report card has never looked so violent.",
    effect: 'Critical hits launch a homing gold star.',
    firstAppears: S01E02,
    canon: false,
    requires: ['grade-book', 'gold-star'],
    hooks: {
      onHit: (ctx, e, hit) => {
        if (!hit.crit) return;
        ctx.playerShot({ x: e.x, y: e.y, angle: ctx.rng.angle(), damage: ctx.stats().damage, speed: 440, radius: 10, life: 1.2, texture: 'shot-gold-star', spin: 540, homing: 6, tag: 'gold-star', source: 'shard' });
      },
    },
  },
  {
    id: 'rope-a-dope',
    name: 'Rope-a-Dope',
    blurb: 'VIP rope, lucky horseshoe. The bouncer would be proud. Then angry.',
    effect: 'Dashing throws a ring of six horseshoes that ricochet between enemies.',
    firstAppears: S01E02,
    canon: false,
    requires: ['velvet-rope', 'lucky-horseshoe'],
    hooks: {
      onDash: (ctx) => {
        const { x, y } = ctx.player;
        for (let i = 0; i < 6; i++) ctx.playerShot({ x, y, angle: (i / 6) * Math.PI * 2, damage: ctx.stats().damage * 0.8, speed: 420, radius: 8, life: 0.6, color: 0xc9ced9, tag: 'horseshoe' });
      },
    },
  },
  {
    id: 'jet-lag',
    name: 'Jet Lag',
    blurb: "Peanuts and an oxygen mask. You've clearly flown before.",
    effect: 'Getting hurt also scatters eight peanuts in every direction.',
    firstAppears: S01E02,
    canon: false,
    requires: ['in-flight-peanuts', 'oxygen-mask'],
    hooks: {
      onDamageTaken: (ctx) => {
        const { x, y } = ctx.player;
        for (let i = 0; i < 8; i++) {
          ctx.playerShot({ x, y, angle: (i / 8) * Math.PI * 2, damage: ctx.stats().damage * 0.8, speed: 420, life: 0.6, radius: 7, texture: 'shot-peanut', spin: 720, source: 'shard', tag: 'peanut' });
        }
      },
    },
  },
];

// ---- the transformation -----------------------------------------------------------------------------

export const DOG_TRANSFORMATIONS: TransformationDef[] = [
  {
    id: 'lucid-dreamer',
    name: 'Lucid Dreamer',
    blurb: "You know you're dreaming, so you make the rules now. Goldenfold would be furious.",
    effect: '+25% damage, shots home in a little, and 1 in 6 kills leaves a dream bubble that heals half a heart.',
    firstAppears: S01E02,
    canon: false,
    set: ['snuffles-helmet', 'dream-inceptor', 'sheep-plush', 'nightmare-fuel', 'nightmare-teddy', 'pancakes-autograph'],
    look: { shirt: 0xb89cf0, accessory: 'look-sleep-mask', dy: -2, trail: 0xc9b3ff },
    stats: { mult: { damage: 1.25 }, add: { homing: 1.5 } },
    hooks: {
      onKill: (ctx, e) => {
        if (!ctx.rng.chance(1 / 6)) return;
        ctx.player.heal(1);
        ctx.vfx({ kind: 'burst', style: 'portal', x: e.x, y: e.y, count: 12 });
        ctx.vfx({ kind: 'text', x: e.x, y: e.y - 30, text: '+½ ♥', color: '#c9b3ff' });
      },
    },
  },
];
