/**
 * Items and synergies introduced in the Pilot. Canon items come from the episode; the rest are
 * invented for this game (canon: false).
 */
import { blob, dot, gear, heart, INK, PORTAL_GREEN, shade, stroke, wonkyPoly, wonkyRect } from '../../../engine/art/draw';
import type { EnemyRef, GameCtx, Graphics, ItemDef, SynergyDef } from '../../../engine/types';
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

const BAD_STATUSES = ['broken-legs', 'stamped', 'drunk', 'failing-grade', 'sleep-deprived', 'side-effects'];

export const PILOT_ITEMS: ItemDef[] = [
  // ---- canon ------------------------------------------------------------------------------------
  {
    id: 'freeze-ray-mod',
    name: 'Freeze Ray Mod',
    blurb: "Rick's freeze ray, duct-taped to your barrel. 12% of shots freeze. Frozen things shatter.",
    firstAppears: S01E01,
    canon: true,
    kind: 'passive',
    rarity: 'rare',
    price: P.rare,
    stats: { add: { freezeChance: 0.12 } },
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
    blurb: 'Contents: classified. Heals a heart. Might get you a little drunk.',
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
    blurb: "Rick's apocalypse starter kit, travel size. Three-second fuse. Run.",
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
        ctx.after(3, () => ctx.explode({ x, y, radius: 300, damage: 45, playerDamage: 2, tag: 'neutrino', color: PORTAL_GREEN }));
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
    blurb: "Dash through enemies to slash them. Frank won't be needing it.",
    firstAppears: S01E01,
    canon: true,
    kind: 'passive',
    rarity: 'rare',
    price: P.rare,
    hooks: {
      onDashContact: (ctx, e) => {
        ctx.damageEnemy(e, 10, 'slash');
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
    blurb: 'From a future where every drugstore sells it. Fixes legs, heals a heart.',
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
    blurb: '20 seconds of pure genius. The side effects are... a side effect.',
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
    blurb: 'Walk on cliffs. Press F to turn them ON. Seriously. Turn them on.',
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
  {
    id: 'ricks-ray-gun',
    name: "Rick's Ray Gun",
    blurb: "Rick's actual gun. For shooting robots. They're definitely robots.",
    firstAppears: S01E01,
    canon: true,
    kind: 'weapon',
    rarity: 'story',
    price: 0,
    noPool: true,
    weapon: { damageMult: 1.5, fireRateMult: 1.1, extraProjectiles: 0, spread: 0.06, color: 0xff7ae3 },
    icon: (g) => gunIcon(g, 0xdfe6ee, 0xff7ae3),
  },

  // ---- invented for this game -------------------------------------------------------------------
  {
    id: 'dodgeball',
    name: 'Dodgeball',
    blurb: 'Shots bounce off walls once. Gym class finally paid off.',
    firstAppears: S01E01,
    canon: false,
    kind: 'passive',
    rarity: 'common',
    price: P.common,
    stats: { add: { bounces: 1, shotSize: 2 } },
    icon: (g) => {
      blob(g, 16, 16, 12, 12, { fill: 0xe0484d, seed: 81, wobble: 0.02 });
      g.lineStyle(2, 0x8a1f2a, 1);
      g.beginPath();
      g.arc(6, 16, 12, -0.9, 0.9, false);
      g.strokePath();
    },
  },
  {
    id: 'hall-pass',
    name: 'Hall Pass',
    blurb: 'Unlimited hall privileges. +12% speed and longer dash invulnerability.',
    firstAppears: S01E01,
    canon: false,
    kind: 'passive',
    rarity: 'common',
    price: P.common,
    stats: { mult: { moveSpeed: 1.12 }, add: { dashIframes: 0.08 } },
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
    blurb: '20% of shots poison. Mr. Goldenfold said not to take it home.',
    firstAppears: S01E01,
    canon: false,
    kind: 'passive',
    rarity: 'common',
    price: 16,
    stats: { add: { poisonChance: 0.2 } },
    icon: (g) => {
      wonkyPoly(g, [[12, 4], [20, 4], [20, 12], [27, 27], [5, 27], [12, 12]], { fill: 0xe8f7ff, seed: 101 });
      wonkyPoly(g, [[9, 19], [23, 19], [26, 26], [6, 26]], { fill: 0x9bd35a, outline: null, seed: 102 });
      dot(g, 14, 16, 2, 0x9bd35a);
    },
  },
  {
    id: 'calculator',
    name: 'Calculator',
    blurb: '+1 damage. Finally, Morty can do math. Well, the calculator can.',
    firstAppears: S01E01,
    canon: false,
    kind: 'passive',
    rarity: 'common',
    price: P.common,
    stats: { add: { damage: 1 } },
    icon: (g) => {
      wonkyRect(g, 7, 3, 18, 26, { fill: 0x5a5a6e, seed: 111, radius: 3 });
      wonkyRect(g, 10, 6, 12, 6, { fill: 0xb6f07a, seed: 112, radius: 1, lineWidth: 1.5 });
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) dot(g, 11.5 + c * 4.5, 16 + r * 4.5, 1.6, 0xf4efe6);
    },
  },
  {
    id: 'letterman-jacket',
    name: 'Letterman Jacket',
    blurb: '+1 heart. It belonged to a jock. Now it belongs to a nerd.',
    firstAppears: S01E01,
    canon: false,
    kind: 'passive',
    rarity: 'common',
    price: 16,
    stats: { add: { maxHearts: 1 } },
    icon: (g) => {
      wonkyPoly(g, [[6, 8], [12, 4], [20, 4], [26, 8], [28, 28], [4, 28]], { fill: 0xc2303e, seed: 121 });
      wonkyRect(g, 12, 4, 8, 24, { fill: 0xf2f2e6, seed: 122, radius: 1, lineWidth: 2 });
      displayGlyph(g, 'A', 22, 18, 9, 0xffd54a);
    },
  },
  {
    id: 'detention-slip',
    name: 'Detention Slip',
    blurb: 'Everything in the room freezes up for 2.5 seconds. Detention works on anything.',
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
        for (const e of enemies) ctx.stun(e, 2.5);
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
    blurb: "Heals a heart and a half. Don't ask what it's made of. Nobody knows.",
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
    id: 'answer-key',
    name: "Goldenfold's Answer Key",
    blurb: "Every answer, ever. +20% damage, +10% fire rate. It's not cheating, it's research.",
    firstAppears: S01E01,
    canon: false,
    kind: 'passive',
    rarity: 'rare',
    price: P.rare,
    stats: { mult: { damage: 1.2, fireRate: 1.1 } },
    icon: (g) => {
      wonkyRect(g, 5, 3, 22, 26, { fill: 0xffffff, seed: 151, radius: 2 });
      displayGlyph(g, 'A', 12, 13, 12, 0x97ce4c);
      displayGlyph(g, '+', 22, 13, 10, 0x97ce4c);
      stroke(g, [[9, 23], [23, 23]], 0x8fb3dc, 2);
    },
  },
  {
    id: 'mega-fruit-smoothie',
    name: 'Mega Fruit Smoothie',
    blurb: 'Blended Mega Fruit, hold the seeds. Heals two hearts.',
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
    blurb: 'Enemies burst into spores when they die. Gross. Effective.',
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
    blurb: "Springy critter legs. Dash more often and farther. Don't ask where they came from.",
    firstAppears: S01E01,
    canon: false,
    kind: 'passive',
    rarity: 'common',
    price: 16,
    stats: { mult: { dashCooldown: 0.75, dashSpeed: 1.15 } },
    icon: (g) => {
      wonkyPoly(g, [[4, 28], [10, 12], [16, 20], [22, 8], [28, 28]], { fill: 0xf28fc0, seed: 181 });
    },
  },
  {
    id: 'shoe-battery-pack',
    name: 'Shoe Battery Pack',
    blurb: "+60% grappling shoe battery. Rick labeled it 'DON'T LICK'.",
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
    id: 'customs-stamp',
    name: 'Customs Stamp',
    blurb: '20% of shots slow enemies down with pure bureaucracy.',
    firstAppears: S01E01,
    canon: false,
    kind: 'passive',
    rarity: 'common',
    price: P.common,
    stats: { add: { slowChance: 0.2 } },
    icon: (g) => {
      wonkyRect(g, 12, 3, 8, 12, { fill: 0x8b5a2b, seed: 201, radius: 2 });
      wonkyRect(g, 5, 15, 22, 9, { fill: 0xd92f3a, seed: 202, radius: 3 });
      stroke(g, [[5, 27], [27, 27]], 0xd92f3a, 2);
    },
  },
  {
    id: 'red-tape',
    name: 'Red Tape',
    blurb: 'Enemies take 30% longer to wind up attacks. Everything needs a form now.',
    firstAppears: S01E01,
    canon: false,
    kind: 'passive',
    rarity: 'rare',
    price: 20,
    stats: { mult: { enemyWindupMult: 1.3 } },
    icon: (g) => {
      blob(g, 16, 16, 11, 11, { fill: 0xd92f3a, seed: 211, wobble: 0.02 });
      blob(g, 16, 16, 5, 5, { fill: 0x1a1424, outline: null, seed: 212 });
      wonkyPoly(g, [[24, 20], [30, 28], [27, 29], [21, 23]], { fill: 0xd92f3a, seed: 213 });
    },
  },
  {
    id: 'duty-free-cologne',
    name: 'Duty-Free Cologne',
    blurb: '+1 heart, and shops give you 20% off. Smells like expensive confidence.',
    firstAppears: S01E01,
    canon: false,
    kind: 'passive',
    rarity: 'common',
    price: 16,
    stats: { add: { maxHearts: 1 }, mult: { shopPriceMult: 0.8 } },
    icon: (g) => bottleIcon(g, 0x9fc9f0, 0xffd54a),
  },
  {
    id: 'contraband-blaster',
    name: 'Contraband Blaster',
    blurb: 'Two barrels, zero permits. +1 shot, but each does 20% less.',
    firstAppears: S01E01,
    canon: false,
    kind: 'passive',
    rarity: 'rare',
    price: P.rare,
    locked: true,
    stats: { add: { projectiles: 1 }, mult: { damage: 0.8 } },
    icon: (g) => {
      gunIcon(g, 0x6b7a8f, 0xff4fd8);
      wonkyRect(g, 22, 4, 8, 6, { fill: 0xff4fd8, seed: 221, radius: 2, lineWidth: 2 });
    },
  },
  {
    id: 'travel-pillow',
    name: 'Travel Pillow',
    blurb: 'Heals a heart and clears bad status effects. Nap time, Morty.',
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
    blurb: "One of Rick's burps, bottled under pressure. Blasts everything around you.",
    firstAppears: S01E01,
    canon: false,
    kind: 'active',
    rarity: 'common',
    price: P.common,
    locked: true,
    active: {
      recharge: 4,
      use: (ctx) => {
        ctx.explode({ x: ctx.player.x, y: ctx.player.y, radius: 220, damage: 12, color: 0x9fd96a, tag: 'burp' });
        ctx.sfx('burp');
      },
    },
    icon: (g) => bottleIcon(g, 0x9fd96a, 0xf4efe6),
  },
  {
    id: 'junk-magnet',
    name: 'Garage Junk Magnet',
    blurb: 'Scrap flies to you, and every piece is worth double.',
    firstAppears: S01E01,
    canon: false,
    kind: 'passive',
    rarity: 'common',
    price: P.common,
    locked: true,
    stats: { add: { magnet: 260, scrapBonus: 1 } },
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
];

export const PILOT_SYNERGIES: SynergyDef[] = [
  {
    id: 'ice-cold-blade',
    name: 'Ice-Cold Blade',
    blurb: 'Dash slashes can freeze what they cut, and frozen enemies burst into ice shrapnel.',
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
    blurb: 'Anything that survives the Neutrino Bomb is frozen solid.',
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
    blurb: 'Shots that bounce off a wall always poison.',
    firstAppears: S01E01,
    canon: false,
    requires: ['chemistry-set', 'dodgeball'],
    hooks: {
      onHit: (ctx, e, hit) => {
        if (hit.source === 'shot' && hit.bounced && !hit.killed) ctx.poison(e, 4, 3);
      },
    },
  },
];

export const heartIcon = (g: Graphics) => heart(g, 16, 16, 24, 0xe8364e);
