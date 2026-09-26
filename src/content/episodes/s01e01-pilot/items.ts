/**
 * Items, synergies and transformations introduced in the Pilot. Canon items come from the
 * episode; the rest are invented for this game (canon: false).
 *
 * Every item follows the rules in ITEM_RULES (balance.ts, checked by tests/items.test.ts): a
 * passive changes what Morty does or sees (how shots behave, a companion, a visible effect on
 * hit, kill, dash or getting hurt, a new look) or is a big stat change, and every item says in
 * one plain line exactly what it does.
 */
import { blob, dot, gear, heart, INK, PORTAL_GREEN, shade, stroke, wonkyPoly, wonkyRect } from '../../../engine/art/draw';
import type { EnemyRef, GameCtx, Graphics, ItemDef, SpriteArt, SynergyDef, TransformationDef } from '../../../engine/types';
import { ECONOMY } from '../../balance';
import { displayGlyph } from './icons';

const P = ECONOMY.prices;
const S01E01 = 'S01E01' as const;

function gunIcon(g: Graphics, body: number, tip: number): void {
  wonkyRect(g, 4, 12, 20, 9, { fill: body, seed: 1, radius: 3 });
  wonkyRect(g, 7, 19, 6, 9, { fill: shade(body, -0.3), seed: 2, radius: 2 });
  wonkyPoly(g, [[24, 12], [30, 10], [30, 23], [24, 21]], { fill: tip, seed: 3 });
}

function bottleIcon(g: Graphics, fill: number, label: number): void {
  wonkyRect(g, 9, 9, 14, 20, { fill, seed: 11, radius: 5 });
  wonkyRect(g, 12, 3, 8, 7, { fill: 0xc9ced9, seed: 12, radius: 2, lineWidth: 2 });
  wonkyRect(g, 11, 15, 10, 7, { fill: label, seed: 13, radius: 1, lineWidth: 1.5 });
}

/** Ring of ice shards bursting out of an enemy (Ice-Cold Blade). */
function iceShards(ctx: GameCtx, e: EnemyRef): void {
  for (let i = 0; i < 8; i++) {
    ctx.playerShot({ x: e.x, y: e.y, angle: (i / 8) * Math.PI * 2, damage: 6, speed: 460, life: 0.5, source: 'shard' });
  }
  ctx.sfx('shatter');
}

/** A little acid pop where a poisoned enemy died (Chemistry Set). */
function acidSplash(ctx: GameCtx, x: number, y: number, radius: number, damage: number): void {
  ctx.explode({ x, y, radius, damage, color: 0x9bd35a, tag: 'acid', small: true });
}

/** Knocks everything near Morty away, with a ring to show it (Letterman Jacket, the flask). */
function shove(ctx: GameCtx, radius: number, force: number, color: number): void {
  const { x, y } = ctx.player;
  ctx.pushEnemies(x, y, radius, force);
  ctx.vfx({ kind: 'ring', x, y: y - 10, color, radius });
}

const BAD_STATUSES = ['broken-legs', 'stamped', 'drunk', 'failing-grade', 'sleep-deprived', 'side-effects'];

// ---- sprites for companions and looks -------------------------------------------------------------

export const PILOT_ITEM_ART: SpriteArt[] = [
  {
    // A junk drone Morty reprogrammed: friendlier, with a portal-green eye and a little flag.
    key: 'companion-junk-drone',
    width: 30,
    height: 24,
    draw: (g, w) => {
      stroke(g, [[w / 2, 9], [w / 2, 3]], INK, 2);
      wonkyRect(g, w / 2 - 10, 0, 20, 4, { fill: 0xc9ced9, seed: 401, radius: 2, lineWidth: 2 });
      wonkyRect(g, 3, 8, w - 6, 12, { fill: 0x8ec5de, seed: 402, radius: 4 });
      dot(g, w / 2, 14, 4, PORTAL_GREEN);
      dot(g, w / 2 + 1, 13, 1.5, 0xffffff);
      wonkyPoly(g, [[w - 5, 9], [w - 5, 1], [w + 2, 4]], { fill: 0xffe27a, seed: 403, lineWidth: 1.5 });
    },
  },
  {
    // A baby gloop hopper: small, pink and delighted to be here.
    key: 'companion-baby-hopper',
    width: 26,
    height: 22,
    draw: (g, w, h) => {
      wonkyPoly(g, [[4, h - 2], [8, h - 9], [11, h - 2]], { fill: 0xd96aa6, seed: 411, lineWidth: 2 });
      wonkyPoly(g, [[w - 4, h - 2], [w - 8, h - 9], [w - 11, h - 2]], { fill: 0xd96aa6, seed: 412, lineWidth: 2 });
      blob(g, w / 2, h * 0.5, w * 0.38, h * 0.36, { fill: 0xf8b0d4, seed: 413, wobble: 0.1, lineWidth: 2.5 });
      dot(g, w * 0.38, h * 0.42, 3.2, 0xffffff);
      dot(g, w * 0.62, h * 0.42, 3.2, 0xffffff);
      dot(g, w * 0.4, h * 0.43, 1.6, INK);
      dot(g, w * 0.64, h * 0.43, 1.6, INK);
      stroke(g, [[w * 0.42, h * 0.62], [w / 2, h * 0.68], [w * 0.58, h * 0.62]], INK, 1.5);
    },
  },
  {
    // Welding goggles pushed up on the forehead (Garage Tinkerer).
    key: 'look-goggles',
    width: 34,
    height: 14,
    draw: (g, w) => {
      g.fillStyle(0x3a2a20, 1);
      g.fillRect(0, 5, w, 4);
      dot(g, 10, 7, 6.5, INK);
      dot(g, w - 10, 7, 6.5, INK);
      dot(g, 10, 7, 4.5, 0x97ce4c);
      dot(g, w - 10, 7, 4.5, 0x97ce4c);
      dot(g, 8.5, 5.5, 1.5, 0xffffff);
      dot(g, w - 11.5, 5.5, 1.5, 0xffffff);
    },
  },
  {
    // A smuggler's fedora (Seed Smuggler).
    key: 'look-fedora',
    width: 44,
    height: 20,
    draw: (g, w, h) => {
      wonkyRect(g, 2, h - 7, w - 4, 6, { fill: 0x6b4a2e, seed: 421, radius: 3, lineWidth: 2 });
      wonkyPoly(g, [[10, h - 6], [13, 3], [w / 2, 6], [w - 13, 3], [w - 10, h - 6]], { fill: 0x7d5836, seed: 422, lineWidth: 2 });
      g.fillStyle(0x2a1d14, 1);
      g.fillRect(11, h - 10, w - 22, 3);
    },
  },
];

export const PILOT_ITEMS: ItemDef[] = [
  // ---- canon ------------------------------------------------------------------------------------
  {
    id: 'freeze-ray-mod',
    name: 'Freeze Ray Mod',
    blurb: "Rick's freeze ray, duct-taped to whatever you're holding. Yes, it works on dodgeballs.",
    effect: 'Every 4th shot is an ice bolt that freezes what it hits. Frozen enemies shatter.',
    tags: ['shots', 'look'],
    firstAppears: S01E01,
    canon: true,
    kind: 'passive',
    rarity: 'rare',
    price: P.rare,
    stats: { add: { freezeRate: 0.25 } },
    look: { glow: 0xbfeaff },
    icon: (g) => {
      gunIcon(g, 0x8ec5de, 0xbfeaff);
      g.lineStyle(2, 0xffffff, 1);
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI;
        g.lineBetween(14 + Math.cos(a) * 5, 16 + Math.sin(a) * 5, 14 - Math.cos(a) * 5, 16 - Math.sin(a) * 5);
      }
    },
  },
  {
    id: 'ricks-flask',
    name: "Rick's Flask",
    blurb: 'Contents: classified. One swig and you burp like Rick.',
    effect: 'Heals a heart. The burp wipes out every enemy bullet and shoves enemies away. Might get you drunk.',
    tags: ['room', 'heal'],
    firstAppears: S01E01,
    canon: true,
    kind: 'active',
    rarity: 'common',
    price: P.common,
    active: {
      recharge: 3,
      use: (ctx) => {
        ctx.player.heal(2);
        ctx.sfx('burp');
        ctx.clearEnemyShots();
        shove(ctx, 300, 700, 0x9fd96a);
        ctx.vfx({ kind: 'burst', style: 'slime', x: ctx.player.x, y: ctx.player.y - 20, count: 16 });
        ctx.shake(6, 220);
        if (ctx.rng.chance(0.25)) ctx.applyStatus('drunk');
      },
    },
    icon: (g) => {
      wonkyRect(g, 7, 7, 18, 22, { fill: 0xb8bdd4, seed: 21, radius: 6 });
      wonkyRect(g, 12, 2, 8, 6, { fill: 0x8a8699, seed: 22, radius: 1, lineWidth: 2 });
      g.fillStyle(0xffffff, 0.5);
      g.fillRect(10, 10, 3, 14);
    },
  },
  {
    id: 'neutrino-bomb',
    name: 'Neutrino Bomb',
    blurb: "Rick's apocalypse starter kit, travel size.",
    effect: 'Drops a bomb. Three seconds later it blasts almost the whole room for 45 damage. Get clear!',
    tags: ['room'],
    firstAppears: S01E01,
    canon: true,
    kind: 'active',
    rarity: 'rare',
    price: P.rare,
    active: {
      recharge: 6,
      use: (ctx) => {
        const { x, y } = ctx.player;
        ctx.marker('neutrino-bomb', x, y, 3);
        ctx.sfx('telegraph-big');
        ctx.toast('Neutrino bomb armed! Get clear!', { color: 0xff8a3d, seconds: 2 });
        ctx.after(3, () => ctx.explode({ x, y, radius: 420, damage: 45, playerDamage: 2, tag: 'neutrino', color: PORTAL_GREEN }));
      },
    },
    icon: (g) => {
      blob(g, 16, 18, 12, 11, { fill: 0x4a4f6e, seed: 31 });
      blob(g, 16, 18, 5.5, 5, { fill: PORTAL_GREEN, seed: 32, lineWidth: 2 });
      wonkyRect(g, 11, 3, 10, 5, { fill: 0x8a8699, seed: 33, radius: 2, lineWidth: 2 });
    },
  },
  {
    id: 'franks-switchblade',
    name: "Frank's Switchblade",
    blurb: "Frank won't be needing it. He's a popsicle.",
    effect: 'Dashing through an enemy slashes it for 12 damage.',
    tags: ['on-dash'],
    firstAppears: S01E01,
    canon: true,
    kind: 'passive',
    rarity: 'rare',
    price: P.rare,
    hooks: {
      onDashContact: (ctx, e) => {
        ctx.damageEnemy(e, 12, 'slash');
        ctx.vfx({ kind: 'slash', x: e.x, y: e.y - 16, angle: Math.atan2(e.y - ctx.player.y, e.x - ctx.player.x) });
        ctx.sfx('slash');
      },
    },
    icon: (g) => {
      wonkyRect(g, 5, 18, 14, 8, { fill: 0x5a3a22, seed: 41, radius: 3 });
      wonkyPoly(g, [[18, 18], [30, 8], [22, 22]], { fill: 0xdfe6ee, seed: 42, lineWidth: 2 });
      dot(g, 9, 22, 1.8, 0xc9ced9);
    },
  },
  {
    id: 'broken-leg-serum',
    name: 'Broken Leg Serum',
    blurb: 'From a future where every drugstore sells it.',
    effect: 'Fixes broken legs and heals a heart.',
    tags: ['heal'],
    firstAppears: S01E01,
    canon: true,
    kind: 'consumable',
    rarity: 'common',
    price: P.consumable,
    consumable: {
      use: (ctx) => {
        ctx.removeStatus('broken-legs');
        ctx.player.heal(2);
      },
    },
    icon: (g) => {
      wonkyRect(g, 6, 12, 18, 9, { fill: 0xbfeaff, seed: 51, radius: 3 });
      wonkyRect(g, 8, 14, 10, 5, { fill: 0x6fd08c, outline: null, seed: 52, radius: 1 });
      stroke(g, [[24, 16], [30, 16]], INK, 3);
      stroke(g, [[3, 12], [3, 21]], INK, 3);
    },
  },
  {
    id: 'mega-seed',
    name: 'Mega Seed',
    blurb: 'Pure genius. The side effects are... a side effect.',
    effect: 'Genius for 20 s: +40% damage and a faster Rick Meter. Then the side effects hit.',
    tags: ['status'],
    firstAppears: S01E01,
    canon: true,
    kind: 'consumable',
    rarity: 'rare',
    price: 10,
    locked: true,
    consumable: { use: (ctx) => ctx.applyStatus('genius') },
    icon: (g) => {
      blob(g, 16, 17, 9, 12, { fill: 0xc97a3a, seed: 61, wobble: 0.08 });
      for (let i = 0; i < 5; i++) stroke(g, [[16 + (i - 2) * 3, 6 + Math.abs(i - 2)], [16 + (i - 2) * 4, 2 + Math.abs(i - 2)]], INK, 2);
      g.fillStyle(0xffd9a8, 1);
      g.fillEllipse(13, 14, 4, 7);
    },
  },
  {
    id: 'grappling-shoes',
    name: 'Grappling Shoes',
    blurb: 'Rick said to turn them on. Seriously. Turn them on.',
    effect: 'Walk on cliffs while the battery lasts. Press F to turn them on.',
    tags: ['mechanic'],
    firstAppears: S01E01,
    canon: true,
    kind: 'passive',
    rarity: 'story',
    price: 0,
    noPool: true,
    icon: (g) => {
      wonkyPoly(g, [[4, 20], [4, 10], [14, 10], [16, 18], [28, 20], [28, 26], [4, 26]], { fill: 0x3f6fb5, seed: 71 });
      dot(g, 10, 23, 2.5, PORTAL_GREEN);
      dot(g, 18, 23, 2.5, PORTAL_GREEN);
      dot(g, 25, 23, 2.5, PORTAL_GREEN);
    },
  },

  // ---- invented: Harry Herpson High -------------------------------------------------------------
  {
    id: 'dodgeball',
    name: 'Lucky Dodgeball',
    blurb: 'The one that hit Frank in the face in fourth grade. It remembers.',
    effect: 'Shots that hit an enemy bounce off toward the next one.',
    tags: ['shots'],
    firstAppears: S01E01,
    canon: false,
    kind: 'passive',
    rarity: 'common',
    price: P.common,
    stats: { add: { ricochet: 1 } },
    icon: (g) => {
      blob(g, 15, 17, 11, 11, { fill: 0xe0484d, seed: 81, wobble: 0.02 });
      g.lineStyle(2, 0x8a1f2a, 1);
      g.beginPath();
      g.arc(5, 17, 11, -0.9, 0.9, false);
      g.strokePath();
      wonkyPoly(g, [[25, 2], [27, 7], [31, 7], [28, 10], [29, 15], [25, 12], [21, 15], [22, 10], [19, 7], [23, 7]], { fill: 0xffd54a, seed: 82, lineWidth: 1.5, wobble: 0.3 });
    },
  },
  {
    id: 'hall-pass',
    name: 'Hall Pass',
    blurb: 'Unlimited hall privileges. Nobody can stop you. Not even bullets.',
    effect: '+25% move speed, and dashing erases enemy bullets you pass through.',
    tags: ['stat', 'on-dash'],
    firstAppears: S01E01,
    canon: false,
    kind: 'passive',
    rarity: 'common',
    price: P.common,
    stats: { mult: { moveSpeed: 1.25 }, add: { dashEraseShots: 70 } },
    icon: (g) => {
      wonkyRect(g, 4, 8, 24, 17, { fill: 0xffe27a, seed: 91, radius: 3 });
      stroke(g, [[8, 14], [24, 14]], INK, 2);
      stroke(g, [[8, 19], [18, 19]], INK, 2);
      dot(g, 26, 8, 3.5, 0xe0484d);
    },
  },
  {
    id: 'chemistry-set',
    name: 'Chemistry Set',
    blurb: 'Mr. Goldenfold said not to take it home. Too late.',
    effect: 'Every shot poisons. Poisoned enemies burst into an acid splash when they die.',
    tags: ['on-hit', 'on-kill', 'look'],
    firstAppears: S01E01,
    canon: false,
    kind: 'passive',
    rarity: 'common',
    price: 16,
    stats: { add: { poisonChance: 1 } },
    look: { glow: 0x9bd35a },
    hooks: {
      onKill: (ctx, e, hit) => {
        if (e.poisoned && hit.tag !== 'acid') acidSplash(ctx, e.x, e.y, 90, 5);
      },
    },
    icon: (g) => {
      wonkyPoly(g, [[12, 4], [20, 4], [20, 12], [27, 27], [5, 27], [12, 12]], { fill: 0xe8f7ff, seed: 101 });
      wonkyPoly(g, [[9, 19], [23, 19], [26, 26], [6, 26]], { fill: 0x9bd35a, outline: null, seed: 102 });
      dot(g, 14, 16, 2, 0x9bd35a);
    },
  },
  {
    id: 'calculator',
    name: 'Calculator',
    blurb: 'Finally, Morty can do math. Well, the calculator can.',
    effect: 'Every 5th shot is a critical hit for triple damage.',
    tags: ['shots'],
    firstAppears: S01E01,
    canon: false,
    kind: 'passive',
    rarity: 'common',
    price: P.common,
    stats: { add: { critRate: 0.2 } },
    icon: (g) => {
      wonkyRect(g, 7, 3, 18, 26, { fill: 0x5a5a6e, seed: 111, radius: 3 });
      wonkyRect(g, 10, 6, 12, 6, { fill: 0xb6f07a, seed: 112, radius: 1, lineWidth: 1.5 });
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) dot(g, 11.5 + c * 4.5, 16 + r * 4.5, 1.6, 0xf4efe6);
    },
  },
  {
    id: 'letterman-jacket',
    name: 'Letterman Jacket',
    blurb: 'It belonged to a jock. Now it belongs to a nerd with shoulder pads.',
    effect: '+1 heart and you wear the jacket. Getting hit makes the shoulder pads shove nearby enemies away.',
    tags: ['stat', 'look', 'on-hurt'],
    firstAppears: S01E01,
    canon: false,
    kind: 'passive',
    rarity: 'common',
    price: 16,
    stats: { add: { maxHearts: 1 } },
    look: { shirt: 0xc2303e },
    hooks: {
      onDamageTaken: (ctx) => shove(ctx, 170, 760, 0xc2303e),
    },
    icon: (g) => {
      wonkyPoly(g, [[6, 8], [12, 4], [20, 4], [26, 8], [28, 28], [4, 28]], { fill: 0xc2303e, seed: 121 });
      wonkyRect(g, 12, 4, 8, 24, { fill: 0xf2f2e6, seed: 122, radius: 1, lineWidth: 2 });
      displayGlyph(g, 'A', 22, 18, 9, 0xffd54a);
    },
  },
  {
    id: 'answer-key',
    name: "Goldenfold's Answer Key",
    blurb: "Every answer, ever. It's not cheating, it's research.",
    effect: 'Shots home in on enemies.',
    tags: ['shots'],
    firstAppears: S01E01,
    canon: false,
    kind: 'passive',
    rarity: 'rare',
    price: P.rare,
    stats: { add: { homing: 4.5 } },
    icon: (g) => {
      wonkyRect(g, 5, 3, 22, 26, { fill: 0xffffff, seed: 151, radius: 2 });
      displayGlyph(g, 'A', 12, 13, 12, 0x97ce4c);
      displayGlyph(g, '+', 22, 13, 10, 0x97ce4c);
      stroke(g, [[9, 23], [23, 23]], 0x8fb3dc, 2);
    },
  },
  {
    id: 'detention-slip',
    name: 'Detention Slip',
    blurb: 'Detention works on anything. Even the bullets have to sit still.',
    effect: 'Every enemy is stuck in detention for 3 s, and every enemy bullet in the room vanishes.',
    tags: ['room'],
    firstAppears: S01E01,
    canon: false,
    kind: 'active',
    rarity: 'common',
    price: P.common,
    active: {
      recharge: 4,
      use: (ctx) => {
        const enemies = ctx.enemies();
        if (!enemies.length) return false;
        for (const e of enemies) {
          ctx.stun(e, 3);
          ctx.vfx({ kind: 'burst', style: 'paper', x: e.x, y: e.y - 20, count: 4 });
        }
        ctx.clearEnemyShots();
        ctx.sfx('whistle');
        ctx.toast('DETENTION!', { color: 0xf28c38, seconds: 1.4 });
      },
    },
    icon: (g) => {
      wonkyRect(g, 5, 5, 22, 22, { fill: 0xf4efe6, seed: 131, radius: 2 });
      displayGlyph(g, '!', 16, 16, 14, 0xf28c38);
    },
  },
  {
    id: 'mystery-meat',
    name: 'Cafeteria Mystery Meat',
    blurb: "Don't ask what it's made of. Nobody knows.",
    effect: 'Heals a heart and a half.',
    tags: ['heal'],
    firstAppears: S01E01,
    canon: false,
    kind: 'consumable',
    rarity: 'common',
    price: 5,
    consumable: {
      use: (ctx) => {
        if (ctx.player.hp >= ctx.player.maxHp) return false;
        ctx.player.heal(3);
      },
    },
    icon: (g) => {
      wonkyRect(g, 3, 18, 26, 8, { fill: 0xc9ced9, seed: 141, radius: 3 });
      blob(g, 16, 16, 10, 7, { fill: 0x9c5f58, seed: 142, wobble: 0.15 });
      dot(g, 12, 14, 2, 0x9aa84a);
    },
  },
  {
    id: 'pencil-sharpener',
    name: 'Pencil Sharpener',
    blurb: 'Sharpens anything. Pencils. Dodgeballs. Ray gun bolts. Your resolve.',
    effect: 'Shots pierce through an enemy and keep going.',
    tags: ['shots'],
    firstAppears: S01E01,
    canon: false,
    kind: 'passive',
    rarity: 'common',
    price: P.common,
    stats: { add: { pierce: 1 } },
    icon: (g) => {
      wonkyRect(g, 5, 10, 16, 14, { fill: 0x8ec5de, seed: 431, radius: 3 });
      dot(g, 13, 17, 3.5, INK);
      wonkyPoly(g, [[19, 14], [30, 17], [19, 20]], { fill: 0xffd54a, seed: 432, lineWidth: 2 });
      wonkyPoly(g, [[27, 16], [30, 17], [27, 18]], { fill: 0x3a3150, seed: 433, lineWidth: 1 });
    },
  },
  {
    id: 'science-fair-volcano',
    name: 'Science Fair Volcano',
    blurb: "Baking soda, vinegar and something from Rick's garage. First prize.",
    effect: 'Shots explode on impact, splashing everything nearby.',
    tags: ['shots'],
    firstAppears: S01E01,
    canon: false,
    kind: 'passive',
    rarity: 'rare',
    price: P.rare,
    stats: { add: { blast: 72 } },
    icon: (g) => {
      wonkyPoly(g, [[3, 28], [12, 10], [20, 10], [29, 28]], { fill: 0x8b5a33, seed: 441 });
      blob(g, 16, 9, 6, 4, { fill: 0xff8a3d, seed: 442, wobble: 0.2, lineWidth: 2 });
      dot(g, 12, 4, 2.5, 0xffd166);
      dot(g, 20, 3, 2, 0xff4a3d);
    },
  },
  {
    id: 'junk-drone-buddy',
    name: 'Reprogrammed Junk Drone',
    blurb: "One of Rick's target drones. You taught it who the real targets are.",
    effect: 'A junk drone follows you and shoots the nearest enemy.',
    tags: ['companion'],
    firstAppears: S01E01,
    canon: false,
    kind: 'passive',
    rarity: 'rare',
    price: P.rare,
    companion: { art: 'companion-junk-drone', kind: 'shooter', every: 0.7, damage: 0.6, flying: true },
    icon: (g) => {
      stroke(g, [[16, 11], [16, 5]], INK, 2);
      wonkyRect(g, 8, 2, 16, 4, { fill: 0xc9ced9, seed: 451, radius: 2, lineWidth: 2 });
      wonkyRect(g, 4, 11, 24, 14, { fill: 0x8ec5de, seed: 452, radius: 4 });
      dot(g, 16, 18, 4.5, PORTAL_GREEN);
    },
  },

  // ---- invented: Dimension 35-C -----------------------------------------------------------------
  {
    id: 'mega-fruit-smoothie',
    name: 'Mega Fruit Smoothie',
    blurb: 'Blended Mega Fruit, hold the seeds.',
    effect: 'Heals two hearts.',
    tags: ['heal'],
    firstAppears: S01E01,
    canon: false,
    kind: 'consumable',
    rarity: 'common',
    price: P.consumable,
    consumable: {
      use: (ctx) => {
        if (ctx.player.hp >= ctx.player.maxHp) return false;
        ctx.player.heal(4);
      },
    },
    icon: (g) => {
      wonkyPoly(g, [[7, 6], [25, 6], [22, 29], [10, 29]], { fill: 0xff8a3d, seed: 161 });
      stroke(g, [[19, 2], [17, 12]], 0xf28fc0, 3);
    },
  },
  {
    id: 'spore-sack',
    name: 'Spore Sack',
    blurb: 'Gross. Effective. Mostly gross.',
    effect: 'Enemies burst into five spores when they die.',
    tags: ['on-kill'],
    firstAppears: S01E01,
    canon: false,
    kind: 'passive',
    rarity: 'rare',
    price: P.rare,
    locked: true,
    hooks: {
      onKill: (ctx, e, hit) => {
        if (hit.tag === 'spore') return;
        for (let i = 0; i < 5; i++) {
          ctx.playerShot({ x: e.x, y: e.y, angle: (i / 5) * Math.PI * 2 + 0.3, damage: 3.5, speed: 380, life: 0.6, color: 0x7fd6a8, tag: 'spore' });
        }
      },
    },
    icon: (g) => {
      blob(g, 16, 18, 11, 10, { fill: 0x7fd6a8, seed: 171, wobble: 0.14 });
      for (let i = 0; i < 4; i++) dot(g, 11 + i * 3.5, 16 + (i % 2) * 5, 2, 0x2f7a57);
      stroke(g, [[16, 8], [16, 3]], INK, 2);
    },
  },
  {
    id: 'hopper-legs',
    name: 'Hopper Legs',
    blurb: "Springy critter legs. Don't ask where they came from.",
    effect: 'Dash 40% more often, and every dash lands with a stomp that hits nearby enemies.',
    tags: ['stat', 'on-dash'],
    firstAppears: S01E01,
    canon: false,
    kind: 'passive',
    rarity: 'common',
    price: 16,
    stats: { mult: { dashCooldown: 0.6 } },
    hooks: {
      onDash: (ctx) =>
        ctx.after(0.17, () => ctx.explode({ x: ctx.player.x, y: ctx.player.y + 6, radius: 100, damage: 4, color: 0xf28fc0, tag: 'stomp', small: true })),
    },
    icon: (g) => {
      wonkyPoly(g, [[4, 28], [10, 12], [16, 20], [22, 8], [28, 28]], { fill: 0xf28fc0, seed: 181 });
    },
  },
  {
    id: 'shoe-battery-pack',
    name: 'Shoe Battery Pack',
    blurb: "Rick labeled it 'DON'T LICK'.",
    effect: '+60% grappling shoe battery.',
    tags: ['stat'],
    firstAppears: S01E01,
    canon: false,
    kind: 'passive',
    rarity: 'common',
    price: P.common,
    stats: { add: { shoeBattery: 0.6 } },
    icon: (g) => {
      wonkyRect(g, 5, 9, 20, 15, { fill: 0x3a3f58, seed: 191, radius: 3 });
      wonkyRect(g, 25, 13, 4, 7, { fill: 0x8a8699, seed: 192, radius: 1, lineWidth: 1.5 });
      stroke(g, [[16, 11], [12, 17], [18, 17], [14, 23]], PORTAL_GREEN, 2.5);
    },
  },
  {
    id: 'mega-seedpod',
    name: 'Mega Tree Seedpod',
    blurb: 'Not the valuable kind of seed. The kind that pops. Hard.',
    effect: 'Shots burst into three seeds when they hit something.',
    tags: ['shots'],
    firstAppears: S01E01,
    canon: false,
    kind: 'passive',
    rarity: 'common',
    price: P.common,
    stats: { add: { split: 3 } },
    icon: (g) => {
      blob(g, 16, 17, 11, 9, { fill: 0x7fcf9e, seed: 461, wobble: 0.1 });
      for (let i = 0; i < 3; i++) blob(g, 10 + i * 6, 17, 2.8, 3.5, { fill: 0xc97a3a, seed: 462 + i, lineWidth: 1.5 });
      stroke(g, [[16, 8], [18, 3]], INK, 2);
    },
  },
  {
    id: 'baby-hopper',
    name: 'Baby Gloop Hopper',
    blurb: 'It followed you home. Well, around. It follows you around.',
    effect: 'A baby gloop hopper follows you and pounces on enemies.',
    tags: ['companion'],
    firstAppears: S01E01,
    canon: false,
    kind: 'passive',
    rarity: 'rare',
    price: P.rare,
    companion: { art: 'companion-baby-hopper', kind: 'pouncer', every: 1.4, damage: 1.4 },
    icon: (g) => {
      blob(g, 16, 18, 11, 9, { fill: 0xf8b0d4, seed: 471, wobble: 0.1 });
      dot(g, 12, 16, 2.6, 0xffffff);
      dot(g, 20, 16, 2.6, 0xffffff);
      dot(g, 12.5, 16.5, 1.3, INK);
      dot(g, 20.5, 16.5, 1.3, INK);
      heart(g, 26, 6, 9, 0xe8364e);
    },
  },
  {
    id: 'critter-whistle',
    name: 'Critter Whistle',
    blurb: 'Every critter in 35-C comes running. They are not gentle.',
    effect: 'Eight critters stampede out in every direction, trampling through enemies for 10 damage each.',
    tags: ['room'],
    firstAppears: S01E01,
    canon: false,
    kind: 'active',
    rarity: 'common',
    price: P.common,
    active: {
      recharge: 4,
      use: (ctx) => {
        const { x, y } = ctx.player;
        for (let i = 0; i < 8; i++) {
          ctx.playerShot({ x, y, angle: (i / 8) * Math.PI * 2, damage: 10, speed: 430, radius: 12, life: 1.3, texture: 'companion-baby-hopper', color: 0xf8b0d4, upright: true, pierce: 4, tag: 'stampede' });
        }
        ctx.vfx({ kind: 'burst', style: 'portal', x, y: y - 10, count: 18 });
        ctx.sfx('whistle');
        ctx.shake(5, 300);
      },
    },
    icon: (g) => {
      wonkyRect(g, 4, 12, 18, 10, { fill: 0xffd54a, seed: 481, radius: 4 });
      dot(g, 10, 17, 2.5, INK);
      wonkyRect(g, 20, 14, 9, 6, { fill: 0xf28fc0, seed: 482, radius: 2, lineWidth: 2 });
      stroke(g, [[6, 6], [9, 10]], INK, 2);
      stroke(g, [[13, 4], [13, 9]], INK, 2);
    },
  },

  // ---- invented: Interdimensional Customs -------------------------------------------------------
  {
    id: 'customs-stamp',
    name: 'Customs Stamp',
    blurb: 'Pure bureaucracy, in a handle.',
    effect: 'Hits stamp enemies DENIED: they move 40% slower for 3 s.',
    tags: ['on-hit'],
    firstAppears: S01E01,
    canon: false,
    kind: 'passive',
    rarity: 'common',
    price: P.common,
    hooks: {
      onHit: (ctx, e, hit) => {
        if (hit.killed || !e.alive) return;
        const fresh = !e.slowed;
        ctx.slow(e, 0.6, 3);
        if (fresh) {
          ctx.vfx({ kind: 'text', x: e.x, y: e.y - 44, text: 'DENIED', color: '#ff4a5a' });
          ctx.sfx('stamp');
        }
      },
    },
    icon: (g) => {
      wonkyRect(g, 12, 3, 8, 12, { fill: 0x8b5a2b, seed: 201, radius: 2 });
      wonkyRect(g, 5, 15, 22, 9, { fill: 0xd92f3a, seed: 202, radius: 3 });
      stroke(g, [[5, 27], [27, 27]], 0xd92f3a, 2);
    },
  },
  {
    id: 'red-tape',
    name: 'Red Tape',
    blurb: 'Everything needs a form now. Even attacking you.',
    effect: 'Enemy attacks take 50% longer to wind up.',
    tags: ['stat'],
    firstAppears: S01E01,
    canon: false,
    kind: 'passive',
    rarity: 'rare',
    price: 20,
    stats: { mult: { enemyWindupMult: 1.5 } },
    icon: (g) => {
      blob(g, 16, 16, 11, 11, { fill: 0xd92f3a, seed: 211, wobble: 0.02 });
      blob(g, 16, 16, 5, 5, { fill: 0x1a1424, outline: null, seed: 212 });
      wonkyPoly(g, [[24, 20], [30, 28], [27, 29], [21, 23]], { fill: 0xd92f3a, seed: 213 });
    },
  },
  {
    id: 'duty-free-cologne',
    name: 'Duty-Free Cologne',
    blurb: 'Smells like expensive confidence. Leaves a trail of it, too.',
    effect: '+1 heart and 30% off in shops. You leave a sparkly trail.',
    tags: ['stat', 'look'],
    firstAppears: S01E01,
    canon: false,
    kind: 'passive',
    rarity: 'common',
    price: 16,
    stats: { add: { maxHearts: 1 }, mult: { shopPriceMult: 0.7 } },
    look: { trail: 0x9fc9f0 },
    icon: (g) => bottleIcon(g, 0x9fc9f0, 0xffd54a),
  },
  {
    id: 'contraband-blaster',
    name: 'Contraband Blaster',
    blurb: 'Three barrels, zero permits.',
    effect: 'Fires a three-way spread; each shot does 70% damage.',
    tags: ['shots'],
    firstAppears: S01E01,
    canon: false,
    kind: 'passive',
    rarity: 'rare',
    price: P.rare,
    locked: true,
    stats: { add: { projectiles: 2 }, mult: { damage: 0.7 } },
    icon: (g) => {
      gunIcon(g, 0x6b7a8f, 0xff4fd8);
      wonkyRect(g, 22, 4, 8, 6, { fill: 0xff4fd8, seed: 221, radius: 2, lineWidth: 2 });
    },
  },
  {
    id: 'travel-pillow',
    name: 'Travel Pillow',
    blurb: 'Nap time, Morty.',
    effect: 'Heals a heart and clears bad statuses.',
    tags: ['heal', 'status'],
    firstAppears: S01E01,
    canon: false,
    kind: 'consumable',
    rarity: 'common',
    price: P.consumable,
    consumable: {
      use: (ctx) => {
        for (const id of BAD_STATUSES) ctx.removeStatus(id);
        ctx.player.heal(2);
      },
    },
    icon: (g) => {
      g.lineStyle(9, 0x8ec5de, 1);
      g.beginPath();
      g.arc(16, 18, 9, Math.PI * 0.9, Math.PI * 2.1, false);
      g.strokePath();
      g.lineStyle(2, INK, 1);
      g.beginPath();
      g.arc(16, 18, 13.5, Math.PI * 0.9, Math.PI * 2.1, false);
      g.strokePath();
    },
  },
  {
    id: 'burp-canister',
    name: 'Burp Canister',
    blurb: "One of Rick's burps, bottled under pressure.",
    effect: 'A huge burp: 14 damage to everything around you, and every enemy bullet in the room is gone.',
    tags: ['room'],
    firstAppears: S01E01,
    canon: false,
    kind: 'active',
    rarity: 'common',
    price: P.common,
    locked: true,
    active: {
      recharge: 4,
      use: (ctx) => {
        ctx.clearEnemyShots();
        ctx.explode({ x: ctx.player.x, y: ctx.player.y, radius: 240, damage: 14, color: 0x9fd96a, tag: 'burp' });
        ctx.sfx('burp');
      },
    },
    icon: (g) => bottleIcon(g, 0x9fd96a, 0xf4efe6),
  },
  {
    id: 'junk-magnet',
    name: 'Garage Junk Magnet',
    blurb: 'It picks up everything. Including things that hurt people.',
    effect: 'Two pieces of junk orbit you, bonking enemies and blocking bullets. Scrap flies to you.',
    tags: ['shots'],
    firstAppears: S01E01,
    canon: false,
    kind: 'passive',
    rarity: 'common',
    price: P.common,
    locked: true,
    stats: { add: { orbit: 2, magnet: 260 } },
    icon: (g) => {
      g.lineStyle(8, 0xe0484d, 1);
      g.beginPath();
      g.arc(16, 14, 8, Math.PI, 0, false);
      g.strokePath();
      g.fillStyle(0xc9ced9, 1);
      g.fillRect(4, 14, 8, 8);
      g.fillRect(20, 14, 8, 8);
      gear(g, 16, 26, 4, 0xd6dbe6);
    },
  },
  {
    id: 'confiscated-taser',
    name: 'Confiscated Taser',
    blurb: 'Seized at the checkpoint. Seized back by you.',
    effect: 'Hits zap lightning to up to 2 more enemies nearby.',
    tags: ['shots', 'on-hit'],
    firstAppears: S01E01,
    canon: false,
    kind: 'passive',
    rarity: 'rare',
    price: P.rare,
    stats: { add: { chain: 2 } },
    icon: (g) => {
      wonkyRect(g, 4, 12, 18, 12, { fill: 0x3a3f58, seed: 491, radius: 3 });
      wonkyRect(g, 21, 15, 5, 6, { fill: 0x8a8699, seed: 492, radius: 1, lineWidth: 1.5 });
      stroke(g, [[26, 12], [29, 16], [25, 18], [30, 24]], 0x9fe8ff, 2.5);
      dot(g, 10, 18, 2.5, 0xffd54a);
    },
  },
  {
    id: 'confiscation-order',
    name: 'Confiscation Order',
    blurb: 'By order of Interdimensional Customs, those bullets are now yours.',
    effect: 'Confiscates every enemy bullet in the room, turns them into Scrap (up to 12) and stuns everyone for a second.',
    tags: ['room'],
    firstAppears: S01E01,
    canon: false,
    kind: 'active',
    rarity: 'rare',
    price: P.rare,
    active: {
      recharge: 3,
      use: (ctx) => {
        const enemies = ctx.enemies();
        const n = ctx.clearEnemyShots();
        if (!n && !enemies.length) return false;
        for (const e of enemies) {
          ctx.stun(e, 1.2);
          ctx.vfx({ kind: 'text', x: e.x, y: e.y - 44, text: 'SEIZED', color: '#ffd54a' });
        }
        if (n) ctx.addScrap(Math.min(12, n), ctx.player.x, ctx.player.y);
        ctx.sfx('stamp');
        ctx.flash(0xffd54a, 100);
      },
    },
    icon: (g) => {
      wonkyRect(g, 5, 3, 22, 26, { fill: 0xf4efe6, seed: 501, radius: 2 });
      stroke(g, [[9, 9], [23, 9]], 0x8fb3dc, 2);
      stroke(g, [[9, 14], [20, 14]], 0x8fb3dc, 2);
      g.lineStyle(2.5, 0xd92f3a, 1);
      g.strokeCircle(18, 22, 5);
    },
  },
  {
    id: 'rick-capacitor',
    name: "Rick's Capacitor",
    blurb: "Hums. Glows. Rick said 'don't hold it wrong'. There's no right way to hold it.",
    effect: 'Stop firing for a second and your next shot is charged: triple damage, huge, and it pierces.',
    tags: ['shots'],
    firstAppears: S01E01,
    canon: false,
    kind: 'passive',
    rarity: 'rare',
    price: P.rare,
    stats: { add: { chargeShot: 1 } },
    icon: (g) => {
      wonkyRect(g, 8, 6, 16, 22, { fill: 0x4a4f6e, seed: 511, radius: 4 });
      stroke(g, [[12, 2], [12, 7]], INK, 2);
      stroke(g, [[20, 2], [20, 7]], INK, 2);
      stroke(g, [[17, 10], [13, 17], [19, 17], [15, 24]], 0xfff2a8, 2.5);
    },
  },
];

export const PILOT_SYNERGIES: SynergyDef[] = [
  {
    id: 'ice-cold-blade',
    name: 'Ice-Cold Blade',
    blurb: "Frank's knife and Rick's freeze ray. Frank would be furious.",
    effect: 'Dash slashes can freeze what they cut, and frozen enemies you slash burst into ice shards.',
    firstAppears: S01E01,
    canon: false,
    requires: ['freeze-ray-mod', 'franks-switchblade'],
    hooks: {
      onHit: (ctx, e, hit) => {
        if (hit.source !== 'slash' || hit.killed) return;
        if (hit.wasFrozen) iceShards(ctx, e);
        else if (ctx.rng.chance(0.5)) ctx.freeze(e, 2.5);
      },
      onKill: (ctx, e, hit) => {
        if (hit.source === 'slash' && hit.wasFrozen) iceShards(ctx, e);
      },
    },
  },
  {
    id: 'absolute-zero',
    name: 'Absolute Zero',
    blurb: 'The end of the world, but chilly.',
    effect: 'Everything that survives the Neutrino Bomb is frozen solid.',
    firstAppears: S01E01,
    canon: false,
    requires: ['neutrino-bomb', 'freeze-ray-mod'],
    hooks: {
      onHit: (ctx, e, hit) => {
        if (hit.tag === 'neutrino' && !hit.killed) ctx.freeze(e, 4);
      },
    },
  },
  {
    id: 'chem-dodge',
    name: 'Dodge, Dip, Dissolve',
    blurb: 'Gym class and chemistry class, finally working together.',
    effect: 'Shots that bounced off a wall or an enemy splash acid where they hit.',
    firstAppears: S01E01,
    canon: false,
    requires: ['chemistry-set', 'dodgeball'],
    hooks: {
      onHit: (ctx, e, hit) => {
        if (hit.source !== 'shot' || !hit.bounced) return;
        if (!hit.killed) ctx.poison(e, 4, 3);
        acidSplash(ctx, e.x, e.y, 70, 3);
      },
    },
  },
  {
    id: 'pop-quiz-ace',
    name: 'Pop Quiz Ace',
    blurb: 'Every answer, and the math to back it up.',
    effect: 'Every 3rd shot crits, and crits burst into three homing pencils.',
    firstAppears: S01E01,
    canon: false,
    requires: ['calculator', 'answer-key'],
    stats: { add: { critRate: 0.14 } },
    hooks: {
      onHit: (ctx, e, hit) => {
        if (!hit.crit) return;
        const a = Math.atan2(e.y - ctx.player.y, e.x - ctx.player.x);
        for (let i = -1; i <= 1; i++) {
          ctx.playerShot({ x: e.x, y: e.y, angle: a + i * 0.7, damage: 4, speed: 480, life: 0.7, texture: 'shot-paper', homing: 6, tag: 'pencil' });
        }
      },
    },
  },
  {
    id: 'varsity-letter',
    name: 'Varsity Letter',
    blurb: 'You earned it. Mostly by getting hit.',
    effect: 'Getting hit throws eight dodgeballs in every direction.',
    firstAppears: S01E01,
    canon: false,
    requires: ['letterman-jacket', 'dodgeball'],
    hooks: {
      onDamageTaken: (ctx) => {
        for (let i = 0; i < 8; i++) {
          ctx.playerShot({ x: ctx.player.x, y: ctx.player.y, angle: (i / 8) * Math.PI * 2, damage: 5, speed: 480, radius: 11, life: 0.8, texture: 'shot-dodgeball', color: 0x8fc4ff });
        }
        ctx.sfx('throw-light');
      },
    },
  },
  {
    id: 'hall-monitors-nightmare',
    name: "Hall Monitor's Nightmare",
    blurb: 'Running in the halls. During detention. With a pass.',
    effect: 'Dashing through a stunned enemy slashes it for 15 damage.',
    firstAppears: S01E01,
    canon: false,
    requires: ['hall-pass', 'detention-slip'],
    hooks: {
      onDashContact: (ctx, e) => {
        if (!e.stunned) return;
        ctx.damageEnemy(e, 15, 'slash');
        ctx.vfx({ kind: 'slash', x: e.x, y: e.y - 16, angle: Math.atan2(e.y - ctx.player.y, e.x - ctx.player.x), color: 0xf28c38 });
        ctx.sfx('slash');
      },
    },
  },
  {
    id: 'spore-cloud',
    name: 'Spore Cloud',
    blurb: 'Chemistry class and biology class. The school should be shut down.',
    effect: 'Spores poison whatever they hit.',
    firstAppears: S01E01,
    canon: false,
    requires: ['spore-sack', 'chemistry-set'],
    hooks: {
      onHit: (ctx, e, hit) => {
        if (hit.tag === 'spore' && !hit.killed) ctx.poison(e, 4, 3);
      },
    },
  },
  {
    id: 'leg-day',
    name: 'Leg Day',
    blurb: "Critter legs. Frank's knife. Nobody skips leg day now.",
    effect: 'Dash stomps also slash everything they hit for 10 damage.',
    firstAppears: S01E01,
    canon: false,
    requires: ['hopper-legs', 'franks-switchblade'],
    hooks: {
      onDash: (ctx) =>
        ctx.after(0.17, () => {
          const { x, y } = ctx.player;
          for (const e of ctx.enemies()) {
            if (Math.hypot(e.x - x, e.y - y) > 110) continue;
            ctx.damageEnemy(e, 10, 'slash');
            ctx.vfx({ kind: 'slash', x: e.x, y: e.y - 16, angle: Math.atan2(e.y - y, e.x - x), color: 0xf28fc0 });
          }
        }),
    },
  },
  {
    id: 'paper-pushers',
    name: 'Paper Pushers',
    blurb: 'Forms in triplicate. Pain in triplicate.',
    effect: 'Stamped (slowed) enemies take 50% more damage from everything.',
    firstAppears: S01E01,
    canon: false,
    requires: ['customs-stamp', 'red-tape'],
    hooks: {
      onHit: (ctx, e, hit) => {
        if (hit.tag === 'paperwork' || hit.killed || !e.slowed || !e.alive) return;
        ctx.damageEnemy(e, hit.damage * 0.5, 'shard', 'paperwork');
      },
    },
  },
  {
    id: 'party-foul',
    name: 'Party Foul',
    blurb: "Rick's flask and a chemistry set. What's the worst that could happen?",
    effect: "Rick's Flask's burp poisons every enemy it shoves.",
    firstAppears: S01E01,
    canon: false,
    requires: ['ricks-flask', 'chemistry-set'],
    hooks: {
      onUseActive: (ctx, id) => {
        if (id !== 'ricks-flask') return;
        for (const e of ctx.enemies()) {
          if (Math.hypot(e.x - ctx.player.x, e.y - ctx.player.y) > 300) continue;
          ctx.poison(e, 4, 4);
          ctx.vfx({ kind: 'burst', style: 'slime', x: e.x, y: e.y - 16, count: 5 });
        }
      },
    },
  },
  {
    id: 'contraband-current',
    name: 'Contraband Current',
    blurb: 'Two seized weapons, one very illegal circuit.',
    effect: 'Lightning jumps to two more enemies.',
    firstAppears: S01E01,
    canon: false,
    requires: ['contraband-blaster', 'confiscated-taser'],
    stats: { add: { chain: 2 } },
  },
  {
    id: 'volcano-pencils',
    name: 'Volcano Pencils',
    blurb: 'Sharpened. Pressurized. Banned from the science fair.',
    effect: 'Shots pierce one more enemy, and their blasts are 50% bigger.',
    firstAppears: S01E01,
    canon: false,
    requires: ['pencil-sharpener', 'science-fair-volcano'],
    stats: { add: { pierce: 1 }, mult: { blast: 1.5 } },
  },
  {
    id: 'frozen-circuit',
    name: 'Frozen Circuit',
    blurb: 'Rick says this breaks at least two laws of physics. He seems happy about it.',
    effect: 'Lightning freezes every enemy it jumps to for a second.',
    firstAppears: S01E01,
    canon: false,
    requires: ['freeze-ray-mod', 'confiscated-taser'],
    hooks: {
      onHit: (ctx, e, hit) => {
        if (hit.source === 'zap' && !hit.killed) ctx.freeze(e, 1.2);
      },
    },
  },
  {
    id: 'garage-buddies',
    name: 'Garage Buddies',
    blurb: 'The drone and the magnet. Best friends. Deadly friends.',
    effect: 'Your junk drone fires twice as fast.',
    firstAppears: S01E01,
    canon: false,
    requires: ['junk-drone-buddy', 'junk-magnet'],
    stats: { mult: { companionRate: 2 } },
  },
  {
    id: 'critter-crew',
    name: 'Critter Crew',
    blurb: 'Hop together, stomp together.',
    effect: 'Your baby hopper pounces twice as often.',
    firstAppears: S01E01,
    canon: false,
    requires: ['baby-hopper', 'hopper-legs'],
    stats: { mult: { companionRate: 2 } },
  },
  {
    id: 'seed-storm',
    name: 'Seed Storm',
    blurb: 'The seeds know the answers now. That is terrifying.',
    effect: 'Shots burst into five seeds instead of three, and the seeds home in.',
    firstAppears: S01E01,
    canon: false,
    requires: ['mega-seedpod', 'answer-key'],
    stats: { add: { split: 2 } },
  },
];

export const PILOT_TRANSFORMATIONS: TransformationDef[] = [
  {
    id: 'garage-tinkerer',
    name: 'Garage Tinkerer',
    blurb: "Goggles on, grease everywhere. Rick would be proud. He won't say it.",
    effect: '+30% damage, one more piece of orbiting junk, and every shot pops a small blast.',
    firstAppears: S01E01,
    canon: false,
    set: ['junk-drone-buddy', 'junk-magnet', 'rick-capacitor', 'science-fair-volcano', 'calculator', 'shoe-battery-pack', 'pencil-sharpener'],
    look: { shirt: 0x5b6b8c, accessory: 'look-goggles', dy: 14 },
    stats: { mult: { damage: 1.3 }, add: { orbit: 1, blast: 40 } },
  },
  {
    id: 'seed-smuggler',
    name: 'Seed Smuggler',
    blurb: 'Trench coat. Fedora. Walking a little funny. Nobody suspects a thing.',
    effect: '+1 heart, a 25% chance to slip past any hit, and Scrap is worth double.',
    firstAppears: S01E01,
    canon: false,
    set: ['duty-free-cologne', 'customs-stamp', 'red-tape', 'contraband-blaster', 'confiscated-taser', 'confiscation-order', 'spore-sack', 'mega-seedpod'],
    look: { shirt: 0xb08a5a, accessory: 'look-fedora', dy: 4 },
    stats: { add: { maxHearts: 1, dodgeChance: 0.25, scrapBonus: 1 } },
  },
];

export const heartIcon = (g: Graphics) => heart(g, 16, 16, 24, 0xe8364e);
