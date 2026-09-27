/**
 * Sprites for the Pilot: enemies, bosses and props. All original art drawn in code.
 */
import { blob, dot, eye, INK, jitter, mouth, PORTAL_GREEN, portalSwirl, shade, stroke, wonkyPoly, wonkyRect } from '../../../engine/art/draw';
import type { Graphics, SpriteArt } from '../../../engine/types';
import { drawPerson } from '../../shared/art';

// ---- people -------------------------------------------------------------------------------------

export function drawFrank(g: Graphics, w: number, h: number, frozen = false): void {
  drawPerson(g, w, h, {
    seed: 606,
    skin: frozen ? 0xcfeeff : 0xe8b98e,
    hair: frozen ? 0x9fd3ef : 0x2b2118,
    hairStyle: 'buzz',
    shirt: frozen ? 0xbfe6f7 : 0x5f7f45,
    pants: frozen ? 0xa8d6ef : 0x3a3f58,
    shoes: frozen ? 0x9fd3ef : 0x222222,
    build: 'big',
    eyes: 'angry',
    mouth: 'grit',
    brow: frozen ? 0x7fb6d6 : 0x1a1410,
  });
  // Switchblade in his right hand.
  const hx = w * 0.84;
  const hy = h * 0.72;
  wonkyRect(g, hx - 3, hy - 4, 7, 12, { fill: frozen ? 0xa8d6ef : 0x5a3a22, seed: 61, radius: 2, lineWidth: 2 });
  wonkyPoly(g, [[hx - 2, hy - 4], [hx + 3, hy - 4], [hx + 1, hy - 20]], { fill: frozen ? 0xe8f7ff : 0xdfe6ee, seed: 62, lineWidth: 2 });
  if (frozen) {
    g.fillStyle(0xbfeaff, 0.45);
    g.fillRoundedRect(2, h * 0.06, w - 4, h * 0.94, 10);
    g.lineStyle(3, 0x6fbfe8, 1);
    g.strokeRoundedRect(2, h * 0.06, w - 4, h * 0.94, 10);
    g.fillStyle(0xffffff, 0.7);
    g.fillTriangle(8, h * 0.12, 20, h * 0.12, 8, h * 0.3);
  }
}

/**
 * Mr. Goldenfold as the show draws him: an African-American man with a black mustache and black,
 * balding hair, in a yellow v-neck sweater over an orange undershirt and a grey tie. No glasses.
 */
export const GOLDENFOLD = {
  skin: 0x8c5b3e,
  hair: 0x1c1612,
  hairStyle: 'sides',
  shirt: 0xf2c23a,
  neckline: 'v',
  undershirt: 0xf0892a,
  tie: 0x8b9099,
  mustache: 0x1c1612,
  brow: 0x1c1612,
} as const;

/** Principal Vagina: an older white man with a dark buzz cut, a blue shirt and a darker blue tie. */
export const PRINCIPAL = {
  skin: 0xf1d3b8,
  hair: 0x2e2e2e,
  hairStyle: 'stubble',
  shirt: 0x6f8fd0,
  neckline: 'collar',
  tie: 0x2d4a8a,
  brow: 0x5a5a5a,
} as const;

export function drawGoldenfold(g: Graphics, w: number, h: number): void {
  drawPerson(g, w, h, { seed: 707, ...GOLDENFOLD, pants: 0x6a5646, build: 'adult', eyes: 'normal', mouth: 'flat' });
}

/** Used by his character entry and as a room prop. */
export const GOLDENFOLD_SPRITE: SpriteArt = { key: 'goldenfold', width: 44, height: 62, draw: (g, w, h) => drawGoldenfold(g, w, h) };

/** Gromflomite head: big glossy eyes, antennae, mandibles. */
export function drawBugHead(g: Graphics, cx: number, cy: number, r: number, seed: number, skin = 0x8fb573, cap?: number): void {
  stroke(g, [[cx - r * 0.35, cy - r * 0.8], [cx - r * 0.6, cy - r * 1.45], [cx - r * 0.85, cy - r * 1.55]], INK, 2.5);
  stroke(g, [[cx + r * 0.35, cy - r * 0.8], [cx + r * 0.6, cy - r * 1.45], [cx + r * 0.85, cy - r * 1.55]], INK, 2.5);
  dot(g, cx - r * 0.85, cy - r * 1.55, r * 0.12, skin);
  dot(g, cx + r * 0.85, cy - r * 1.55, r * 0.12, skin);
  blob(g, cx, cy, r, r * 1.08, { fill: skin, seed, wobble: 0.04, lineWidth: 2.5 });
  // Glossy compound eyes
  for (const s of [-1, 1]) {
    blob(g, cx + s * r * 0.45, cy - r * 0.05, r * 0.38, r * 0.48, { fill: 0x1c1a26, seed: seed + (s > 0 ? 1 : 2), lineWidth: 2 });
    g.fillStyle(0xffffff, 0.75);
    g.fillEllipse(cx + s * r * 0.45 - r * 0.12, cy - r * 0.2, r * 0.14, r * 0.2);
  }
  // Mandibles
  wonkyPoly(g, [[cx - r * 0.3, cy + r * 0.6], [cx - r * 0.05, cy + r * 0.72], [cx - r * 0.18, cy + r * 0.98]], { fill: shade(skin, -0.3), seed: seed + 3, lineWidth: 2 });
  wonkyPoly(g, [[cx + r * 0.3, cy + r * 0.6], [cx + r * 0.05, cy + r * 0.72], [cx + r * 0.18, cy + r * 0.98]], { fill: shade(skin, -0.3), seed: seed + 4, lineWidth: 2 });
  if (cap !== undefined) {
    wonkyPoly(g, [[cx - r * 1.05, cy - r * 0.55], [cx - r * 0.8, cy - r * 1.15], [cx + r * 0.8, cy - r * 1.15], [cx + r * 1.05, cy - r * 0.55]], { fill: cap, seed: seed + 5, lineWidth: 2.5 });
    wonkyRect(g, cx - r * 1.2, cy - r * 0.62, r * 2.4, r * 0.2, { fill: shade(cap, -0.3), seed: seed + 6, radius: 2, lineWidth: 2 });
    dot(g, cx, cy - r * 0.88, r * 0.14, 0xffd54a);
  }
}

/** A Gromflomite customs agent body; `extra` draws the role's gear. */
function drawAgent(g: Graphics, w: number, h: number, seed: number, uniform: number, extra?: (g: Graphics) => void, cap?: number): void {
  const cx = w / 2;
  blob(g, cx - w * 0.14, h - 5, w * 0.13, 4.5, { fill: 0x1c1a26, seed: seed + 1, lineWidth: 2 });
  blob(g, cx + w * 0.14, h - 5, w * 0.13, 4.5, { fill: 0x1c1a26, seed: seed + 2, lineWidth: 2 });
  wonkyRect(g, cx - w * 0.2, h * 0.7, w * 0.4, h * 0.26, { fill: shade(uniform, -0.2), seed: seed + 3, radius: 3, lineWidth: 2.5 });
  blob(g, cx - w * 0.34, h * 0.56, w * 0.09, h * 0.14, { fill: uniform, seed: seed + 4, lineWidth: 2.5 });
  blob(g, cx + w * 0.34, h * 0.56, w * 0.09, h * 0.14, { fill: uniform, seed: seed + 5, lineWidth: 2.5 });
  wonkyRect(g, cx - w * 0.28, h * 0.42, w * 0.56, h * 0.34, { fill: uniform, seed: seed + 6, radius: 6, lineWidth: 2.5 });
  dot(g, cx - w * 0.12, h * 0.5, 2.5, 0xffd54a);
  drawBugHead(g, cx, h * 0.26, w * 0.26, seed + 7, 0x8fb573, cap);
  extra?.(g);
}

// ---- enemies -------------------------------------------------------------------------------------

export const PILOT_ENEMY_ART: Record<string, SpriteArt> = {
  popQuiz: {
    key: 'enemy-pop-quiz',
    width: 30,
    height: 34,
    draw: (g, w, h) => {
      wonkyPoly(g, [[3, 4], [w - 5, 2], [w - 2, h - 4], [4, h - 2]], { fill: 0xffffff, seed: 1, lineWidth: 2.5 });
      g.lineStyle(1.5, 0x8fb3dc, 1);
      for (let i = 0; i < 4; i++) g.lineBetween(7, 17 + i * 4, w - 7, 17 + i * 4);
      eye(g, 11, 10, 4, 'angry');
      eye(g, 20, 10, 4, 'angry', { x: 0, y: 0 }, true);
      g.lineStyle(3, 0xe0484d, 1);
      g.lineBetween(w - 10, h - 11, w - 6, h - 5);
      g.lineBetween(w - 10, h - 11, w - 4, h - 12);
    },
  },
  hallMonitor: {
    key: 'enemy-hall-monitor',
    width: 38,
    height: 50,
    draw: (g, w, h) => {
      drawPerson(g, w, h, { seed: 801, skin: 0xe9c19b, hair: 0x8a5a2b, hairStyle: 'swoop', shirt: 0xf2f2e6, pants: 0x3a3f58, eyes: 'angry', mouth: 'frown', brow: 0x5a3416 });
      wonkyPoly(g, [[w * 0.2, h * 0.47], [w * 0.36, h * 0.47], [w * 0.82, h * 0.76], [w * 0.66, h * 0.78]], { fill: 0xf28c38, seed: 802, lineWidth: 2 });
      dot(g, w * 0.72, h * 0.62, 3.5, 0xc9ced9);
    },
  },
  dodgeballJock: {
    key: 'enemy-dodgeball-jock',
    width: 42,
    height: 52,
    draw: (g, w, h) => {
      drawPerson(g, w, h, { seed: 811, skin: 0xd9a57c, hair: 0x2b1d12, hairStyle: 'buzz', shirt: 0xf2f2e6, coat: 0xc2303e, pants: 0x3a3f58, eyes: 'angry', mouth: 'grit', build: 'adult', brow: 0x1a120c });
      dot(g, w * 0.88, h * 0.66, 7, 0xe0484d);
      g.lineStyle(2, INK, 1);
      g.strokeCircle(w * 0.88, h * 0.66, 7);
    },
  },
  cafeteriaSlop: {
    key: 'enemy-cafeteria-slop',
    width: 44,
    height: 38,
    draw: (g, w, h) => {
      blob(g, w / 2, h * 0.6, w * 0.46, h * 0.38, { fill: 0x9aa84a, seed: 21, wobble: 0.12, lineWidth: 3 });
      blob(g, w * 0.32, h * 0.5, 6, 4, { fill: 0xb8c46a, outline: null, seed: 22 });
      blob(g, w * 0.7, h * 0.72, 5, 3, { fill: 0x7b8a36, outline: null, seed: 23 });
      eye(g, w * 0.4, h * 0.45, 5, 'angry');
      eye(g, w * 0.6, h * 0.45, 5, 'angry', { x: 0, y: 0 }, true);
      mouth(g, w / 2, h * 0.68, 12, 'wavy');
      wonkyRect(g, w * 0.78, h * 0.08, 5, 18, { fill: 0xc9ced9, seed: 24, radius: 2, lineWidth: 2 });
    },
  },
  slopBlob: {
    key: 'enemy-slop-blob',
    width: 26,
    height: 22,
    draw: (g, w, h) => {
      blob(g, w / 2, h * 0.6, w * 0.45, h * 0.38, { fill: 0x9aa84a, seed: 31, wobble: 0.14, lineWidth: 2.5 });
      eye(g, w * 0.38, h * 0.5, 3.5, 'angry');
      eye(g, w * 0.62, h * 0.5, 3.5, 'angry', { x: 0, y: 0 }, true);
    },
  },
  junkDrone: {
    key: 'enemy-junk-drone',
    width: 36,
    height: 28,
    draw: (g, w) => {
      stroke(g, [[w / 2, 10], [w / 2, 4]], INK, 2.5);
      wonkyRect(g, w / 2 - 12, 1, 24, 4, { fill: 0xc9ced9, seed: 41, radius: 2, lineWidth: 2 });
      wonkyRect(g, 4, 10, w - 8, 14, { fill: 0x8a8699, seed: 42, radius: 4 });
      dot(g, 12, 17, 3.5, 0xffd54a);
      dot(g, w - 12, 17, 3.5, 0xffd54a);
      g.lineStyle(2, 0xe0484d, 1);
      g.lineBetween(15, 22, w - 15, 22);
      wonkyRect(g, w / 2 - 3, 12, 6, 6, { fill: 0x5a5a6e, seed: 43, radius: 1, lineWidth: 1.5 });
    },
  },
  gloopHopper: {
    key: 'enemy-gloop-hopper',
    width: 38,
    height: 34,
    draw: (g, w, h) => {
      wonkyPoly(g, [[6, h - 3], [12, h - 14], [16, h - 3]], { fill: 0xd96aa6, seed: 51, lineWidth: 2.5 });
      wonkyPoly(g, [[w - 6, h - 3], [w - 12, h - 14], [w - 16, h - 3]], { fill: 0xd96aa6, seed: 52, lineWidth: 2.5 });
      blob(g, w / 2, h * 0.5, w * 0.4, h * 0.38, { fill: 0xf28fc0, seed: 53, wobble: 0.1, lineWidth: 3 });
      eye(g, w * 0.36, h * 0.38, 5.5, 'normal', { x: 0.3, y: 0 });
      eye(g, w * 0.64, h * 0.38, 5.5, 'normal', { x: 0.3, y: 0 }, true);
      mouth(g, w / 2, h * 0.62, 10, 'open');
    },
  },
  fruitSnatcher: {
    key: 'enemy-fruit-snatcher',
    width: 36,
    height: 40,
    draw: (g, w, h) => {
      blob(g, w * 0.72, h * 0.62, 9, 10, { fill: 0xc9a86b, seed: 61, lineWidth: 2.5 });
      blob(g, w * 0.45, h * 0.58, w * 0.3, h * 0.34, { fill: 0x8b5fbf, seed: 62, wobble: 0.08, lineWidth: 3 });
      wonkyPoly(g, [[w * 0.2, h * 0.5], [2, h * 0.58], [w * 0.2, h * 0.64]], { fill: 0xb48be0, seed: 63, lineWidth: 2.5 });
      eye(g, w * 0.38, h * 0.44, 5, 'angry');
      eye(g, w * 0.56, h * 0.44, 5, 'angry', { x: 0, y: 0 }, true);
      stroke(g, [[w * 0.36, h * 0.26], [w * 0.3, h * 0.08]], INK, 2);
      stroke(g, [[w * 0.54, h * 0.26], [w * 0.62, h * 0.08]], INK, 2);
      stroke(g, [[w * 0.3, h - 4], [w * 0.34, h * 0.86]], INK, 3);
      stroke(g, [[w * 0.56, h - 4], [w * 0.52, h * 0.86]], INK, 3);
    },
  },
  bonkBloat: {
    key: 'enemy-bonk-bloat',
    width: 46,
    height: 44,
    draw: (g, w, h) => {
      blob(g, w / 2, h * 0.52, w * 0.46, h * 0.45, { fill: 0xffc84a, seed: 71, wobble: 0.05, lineWidth: 3 });
      for (let i = 0; i < 5; i++) dot(g, w * 0.25 + i * 7, h * 0.22 + jitter(71, i) * 3, 2.5, 0xe89a2a);
      eye(g, w * 0.38, h * 0.48, 6, 'angry');
      eye(g, w * 0.62, h * 0.48, 6, 'angry', { x: 0, y: 0 }, true);
      mouth(g, w / 2, h * 0.72, 14, 'grit');
    },
  },
  puffPolyp: {
    key: 'enemy-puff-polyp',
    width: 44,
    height: 44,
    draw: (g, w, h) => {
      for (let i = 0; i < 7; i++) {
        const a = Math.PI + (i / 6) * Math.PI;
        const x = w / 2 + Math.cos(a) * w * 0.34;
        const y = h * 0.4 + Math.sin(a) * h * 0.34;
        blob(g, x, y, 5, 7, { fill: 0x5fc7a8, seed: 81 + i, lineWidth: 2 });
      }
      blob(g, w / 2, h * 0.62, w * 0.4, h * 0.34, { fill: 0x3fa889, seed: 88, wobble: 0.08, lineWidth: 3 });
      for (let i = 0; i < 4; i++) dot(g, w * 0.3 + i * 6, h * 0.64 + (i % 2) * 5, 3, 0x1f5f4c);
      eye(g, w * 0.42, h * 0.5, 4.5, 'sleepy');
      eye(g, w * 0.58, h * 0.5, 4.5, 'sleepy', { x: 0, y: 0 }, true);
    },
  },
  clerk: {
    key: 'enemy-gromflomite-clerk',
    width: 42,
    height: 56,
    draw: (g, w, h) =>
      drawAgent(g, w, h, 901, 0x3d4f7a, (gg) => {
        wonkyPoly(gg, [[w / 2 - 3, h * 0.43], [w / 2 + 3, h * 0.43], [w / 2 + 4, h * 0.62], [w / 2, h * 0.66], [w / 2 - 4, h * 0.62]], { fill: 0xd92f3a, seed: 905, lineWidth: 2 });
        wonkyRect(gg, w * 0.74, h * 0.5, 12, 15, { fill: 0xf4efe6, seed: 906, radius: 1, lineWidth: 2 });
      }),
  },
  guard: {
    key: 'enemy-gromflomite-guard',
    width: 44,
    height: 56,
    draw: (g, w, h) =>
      drawAgent(g, w, h, 911, 0x2d3a5c, (gg) => {
        wonkyRect(gg, w * 0.7, h * 0.52, 16, 8, { fill: 0x6b7a8f, seed: 915, radius: 2, lineWidth: 2 });
        dot(gg, w * 0.7 + 15, h * 0.52 + 4, 3, 0xff4fd8);
      }, 0x2d3a5c),
  },
  riot: {
    key: 'enemy-gromflomite-riot',
    width: 50,
    height: 58,
    draw: (g, w, h) =>
      drawAgent(g, w, h, 921, 0x243052, (gg) => {
        wonkyRect(gg, w * 0.6, h * 0.36, 18, 34, { fill: 0x9fb6d6, fillAlpha: 0.85, seed: 925, radius: 5, lineWidth: 3 });
        gg.lineStyle(2, 0xffffff, 0.8);
        gg.lineBetween(w * 0.6 + 5, h * 0.4, w * 0.6 + 5, h * 0.4 + 26);
      }, 0x243052),
  },
  sniper: {
    key: 'enemy-gromflomite-sniper',
    width: 46,
    height: 56,
    draw: (g, w, h) =>
      drawAgent(g, w, h, 931, 0x3a3150, (gg) => {
        wonkyRect(gg, w * 0.46, h * 0.54, 24, 6, { fill: 0x5a5a6e, seed: 935, radius: 2, lineWidth: 2 });
        dot(gg, w * 0.46 + 24, h * 0.54 + 3, 3, 0xff3355);
        wonkyRect(gg, w * 0.3, h * 0.2, w * 0.4, 6, { fill: 0xff3355, fillAlpha: 0.8, seed: 936, radius: 2, lineWidth: 2 });
      }),
  },
  // School support and area denial.
  pepSquad: {
    key: 'enemy-pep-squad',
    width: 44,
    height: 52,
    draw: (g, w, h) => {
      drawPerson(g, w, h, { seed: 841, skin: 0xe7b891, hair: 0x7a3f1d, hairStyle: 'ponytail', shirt: 0xf2c14e, stripe: [0x2f4a86], pants: 0x2f4a86, shoes: 0xf4f4f4, eyes: 'happy', mouth: 'smile', brow: 0x5a2c12, lashes: true });
      for (const side of [-1, 1]) blob(g, w / 2 + side * w * 0.4, h * 0.66, 7, 6, { fill: 0xf2c14e, seed: 845 + side, wobble: 0.3, lineWidth: 2 });
    },
  },
  labPartner: {
    key: 'enemy-lab-partner',
    width: 42,
    height: 52,
    draw: (g, w, h) => {
      drawPerson(g, w, h, { seed: 851, skin: 0xc98f63, hair: 0x2b1d12, hairStyle: 'buzz', shirt: 0x6fa8c9, coat: 0xeef3f6, pants: 0x3a3f58, eyes: 'angry', mouth: 'grit', brow: 0x1a120c });
      // Goggles and a bubbling beaker.
      wonkyRect(g, w * 0.22, h * 0.24, w * 0.56, 6, { fill: 0x9fdcff, fillAlpha: 0.7, seed: 853, radius: 3, lineWidth: 2 });
      wonkyPoly(g, [[w * 0.78, h * 0.56], [w * 0.9, h * 0.56], [w * 0.95, h * 0.74], [w * 0.73, h * 0.74]], { fill: 0x9bd35a, seed: 854, lineWidth: 2 });
      dot(g, w * 0.84, h * 0.52, 2.5, 0xd8f0a0);
    },
  },
  // 35-C support, summoner and area denial.
  bloomTender: {
    key: 'enemy-bloom-tender',
    width: 40,
    height: 42,
    draw: (g, w, h) => {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        blob(g, w / 2 + Math.cos(a) * 11, h * 0.3 + Math.sin(a) * 9, 7, 6, { fill: 0xfff1a8, seed: 861 + i, lineWidth: 2 });
      }
      dot(g, w / 2, h * 0.3, 7, 0xf2a93b);
      blob(g, w / 2, h * 0.68, w * 0.3, h * 0.28, { fill: 0x9de0a8, seed: 868, lineWidth: 2.5 });
      eye(g, w * 0.4, h * 0.64, 4.5, 'happy');
      eye(g, w * 0.6, h * 0.64, 4.5, 'happy', { x: 0, y: 0 }, true);
    },
  },
  broodMound: {
    key: 'enemy-brood-mound',
    width: 60,
    height: 44,
    draw: (g, w, h) => {
      blob(g, w / 2, h * 0.6, w * 0.46, h * 0.38, { fill: 0xb57ad9, seed: 871, wobble: 0.14, lineWidth: 3 });
      for (const [x, y] of [[0.3, 0.52], [0.55, 0.42], [0.72, 0.62], [0.42, 0.72]] as const) {
        blob(g, w * x, h * y, 5.5, 4.5, { fill: 0x3a1f4d, seed: 872 + x * 10, lineWidth: 2 });
      }
      eye(g, w * 0.55, h * 0.42, 2.5, 'angry');
    },
  },
  miteling: {
    key: 'enemy-miteling',
    width: 20,
    height: 18,
    draw: (g, w, h) => {
      stroke(g, [[w * 0.38, 5], [w * 0.28, 1]], INK, 1.5);
      stroke(g, [[w * 0.62, 5], [w * 0.72, 1]], INK, 1.5);
      blob(g, w / 2, h * 0.58, w * 0.4, h * 0.36, { fill: 0xe07ac0, seed: 881, lineWidth: 2 });
      dot(g, w * 0.4, h * 0.52, 2, INK);
      dot(g, w * 0.6, h * 0.52, 2, INK);
    },
  },
  gooSlug: {
    key: 'enemy-goo-slug',
    width: 50,
    height: 34,
    draw: (g, w, h) => {
      blob(g, w / 2, h * 0.66, w * 0.46, h * 0.3, { fill: 0xd8e05a, seed: 891, wobble: 0.1, lineWidth: 2.5 });
      stroke(g, [[w * 0.66, h * 0.5], [w * 0.62, h * 0.14]], INK, 2.5);
      stroke(g, [[w * 0.78, h * 0.52], [w * 0.84, h * 0.16]], INK, 2.5);
      eye(g, w * 0.62, h * 0.14, 4, 'normal');
      eye(g, w * 0.84, h * 0.16, 4, 'normal', { x: 0, y: 0 }, true);
      g.fillStyle(0xffffff, 0.5);
      g.fillEllipse(w * 0.36, h * 0.58, 12, 4);
    },
  },
  // Customs rusher, support and summoner.
  courier: {
    key: 'enemy-gromflomite-courier',
    width: 44,
    height: 56,
    draw: (g, w, h) =>
      drawAgent(g, w, h, 941, 0x8a6a3a, (gg) => {
        wonkyRect(gg, w * 0.62, h * 0.5, 16, 13, { fill: 0xc9a86b, seed: 945, radius: 1, lineWidth: 2 });
        stroke(gg, [[w * 0.62, h * 0.5 + 6], [w * 0.62 + 16, h * 0.5 + 6]], 0x6a4a22, 2);
      }, 0x6a4a22),
  },
  notary: {
    key: 'enemy-gromflomite-notary',
    width: 44,
    height: 56,
    draw: (g, w, h) =>
      drawAgent(g, w, h, 951, 0x2f6b5a, (gg) => {
        wonkyRect(gg, w * 0.66, h * 0.46, 10, 14, { fill: 0x7a4a2a, seed: 955, radius: 2, lineWidth: 2 });
        wonkyRect(gg, w * 0.6, h * 0.6, 18, 7, { fill: 0x5bbf6a, seed: 956, radius: 2, lineWidth: 2 });
        wonkyRect(gg, w * 0.3, h * 0.2, w * 0.4, 5, { fill: 0x5bbf6a, fillAlpha: 0.85, seed: 957, radius: 2, lineWidth: 2 });
      }),
  },
  dispatcher: {
    key: 'enemy-gromflomite-dispatcher',
    width: 44,
    height: 58,
    draw: (g, w, h) =>
      drawAgent(g, w, h, 961, 0xd9772a, (gg) => {
        stroke(gg, [[w * 0.76, h * 0.52], [w * 0.8, h * 0.22]], INK, 2);
        dot(gg, w * 0.8, h * 0.2, 3, 0xff3355);
        wonkyRect(gg, w * 0.68, h * 0.5, 12, 16, { fill: 0x3a3a48, seed: 965, radius: 2, lineWidth: 2 });
      }, 0x9a4a1a),
  },
  frank: { key: 'boss-frank', width: 66, height: 84, draw: (g, w, h) => drawFrank(g, w, h) },
  supervisor: {
    key: 'boss-customs-supervisor',
    width: 74,
    height: 88,
    draw: (g, w, h) =>
      drawAgent(g, w, h, 941, 0x1f2a44, (gg) => {
        dot(gg, w * 0.34, h * 0.5, 3, 0xffd54a);
        dot(gg, w * 0.4, h * 0.5, 3, 0xffd54a);
        wonkyRect(gg, w * 0.74, h * 0.34, 10, 28, { fill: 0x8b5a2b, seed: 945, radius: 2, lineWidth: 2 });
        wonkyRect(gg, w * 0.66, h * 0.3, 26, 12, { fill: 0xd92f3a, seed: 946, radius: 3, lineWidth: 2.5 });
      }, 0x1f2a44),
  },
};

// ---- props, pickups and shopkeepers --------------------------------------------------------------

export const PILOT_PROP_ART: SpriteArt[] = [
  {
    key: 'rick-sleeping',
    width: 70,
    height: 44,
    draw: (g, w, h) => {
      wonkyRect(g, 8, h * 0.4, w - 16, h * 0.5, { fill: 0xeef3f6, seed: 101, radius: 10 });
      blob(g, w * 0.26, h * 0.42, 15, 14, { fill: 0xefd9c4, seed: 102, lineWidth: 2.5 });
      for (let i = 0; i < 6; i++) {
        const a = Math.PI * 0.9 + i * 0.28;
        wonkyPoly(g, [[w * 0.26 + Math.cos(a) * 10, h * 0.42 + Math.sin(a) * 10], [w * 0.26 + Math.cos(a + 0.12) * 26, h * 0.42 + Math.sin(a + 0.12) * 24], [w * 0.26 + Math.cos(a + 0.25) * 10, h * 0.42 + Math.sin(a + 0.25) * 10]], { fill: 0xa8dcec, seed: 103 + i, lineWidth: 2 });
      }
      stroke(g, [[w * 0.19, h * 0.4], [w * 0.24, h * 0.42]], INK, 2);
      stroke(g, [[w * 0.28, h * 0.42], [w * 0.33, h * 0.4]], INK, 2);
      mouth(g, w * 0.27, h * 0.56, 8, 'open');
      g.fillStyle(0xffffff, 1);
    },
  },
  {
    key: 'neutrino-bomb',
    width: 56,
    height: 58,
    draw: (g, w, h) => {
      g.fillStyle(0x000000, 0.25);
      g.fillEllipse(w / 2, h - 5, w * 0.8, 10);
      blob(g, w / 2, h * 0.52, w * 0.42, h * 0.4, { fill: 0x4a4f6e, seed: 111, wobble: 0.03, lineWidth: 3 });
      blob(g, w / 2, h * 0.52, w * 0.2, h * 0.19, { fill: PORTAL_GREEN, seed: 112, lineWidth: 2.5 });
      dot(g, w / 2 - 3, h * 0.48, 4, 0xe9ffd6);
      wonkyRect(g, w * 0.3, h * 0.02, w * 0.4, 9, { fill: 0x8a8699, seed: 113, radius: 3, lineWidth: 2 });
      g.lineStyle(3, 0xe0484d, 1);
      g.lineBetween(w * 0.15, h * 0.6, w * 0.05, h * 0.8);
      g.lineStyle(3, 0x3f6fb5, 1);
      g.lineBetween(w * 0.85, h * 0.6, w * 0.95, h * 0.8);
      g.lineStyle(3, 0xffd54a, 1);
      g.lineBetween(w * 0.5, h * 0.92, w * 0.5, h);
    },
  },
  {
    key: 'neutrino-bomb-off',
    width: 56,
    height: 58,
    draw: (g, w, h) => {
      g.fillStyle(0x000000, 0.25);
      g.fillEllipse(w / 2, h - 5, w * 0.8, 10);
      blob(g, w / 2, h * 0.52, w * 0.42, h * 0.4, { fill: 0x4a4f6e, seed: 111, wobble: 0.03, lineWidth: 3 });
      blob(g, w / 2, h * 0.52, w * 0.2, h * 0.19, { fill: 0x2a2f44, seed: 112, lineWidth: 2.5 });
      wonkyRect(g, w * 0.3, h * 0.02, w * 0.4, 9, { fill: 0x8a8699, seed: 113, radius: 3, lineWidth: 2 });
    },
  },
  GOLDENFOLD_SPRITE,
  {
    key: 'goldenfold-desk',
    width: 110,
    height: 56,
    draw: (g, w, h) => {
      wonkyRect(g, 4, h * 0.34, w - 8, h * 0.62, { fill: 0x8b5a2b, seed: 131, radius: 4 });
      wonkyRect(g, 0, h * 0.22, w, h * 0.2, { fill: 0xb07a45, seed: 132, radius: 4 });
      blob(g, w * 0.78, h * 0.14, 8, 8, { fill: 0xd9303a, seed: 133, lineWidth: 2 });
      stroke(g, [[w * 0.78, h * 0.02], [w * 0.8, h * 0.08]], 0x5a3416, 2);
      wonkyRect(g, w * 0.2, h * 0.08, 30, 10, { fill: 0xf4efe6, seed: 134, radius: 1, lineWidth: 2 });
    },
  },
  { key: 'frank-frozen', width: 66, height: 84, draw: (g, w, h) => drawFrank(g, w, h, true) },
  {
    key: 'mega-tree',
    width: 150,
    height: 190,
    draw: (g, w, h) => {
      g.fillStyle(0x000000, 0.25);
      g.fillEllipse(w / 2, h - 8, w * 0.7, 16);
      wonkyPoly(g, [[w * 0.4, h - 6], [w * 0.44, h * 0.45], [w * 0.56, h * 0.45], [w * 0.62, h - 6]], { fill: 0x9c5fbf, seed: 141, wobble: 3, lineWidth: 3 });
      blob(g, w / 2, h * 0.32, w * 0.47, h * 0.28, { fill: 0x5fd4a0, seed: 142, wobble: 0.12, lineWidth: 3 });
      blob(g, w * 0.3, h * 0.26, w * 0.2, h * 0.14, { fill: 0x7fe6b8, outline: null, seed: 143, wobble: 0.15 });
      for (let i = 0; i < 4; i++) {
        const x = w * (0.25 + i * 0.17);
        const y = h * (0.3 + (i % 2) * 0.12);
        blob(g, x, y, 10, 12, { fill: 0xff8a3d, seed: 150 + i, lineWidth: 2.5 });
        dot(g, x - 3, y - 4, 3, 0xffd9a8);
      }
    },
  },
  {
    key: 'mega-fruit-hanging',
    width: 40,
    height: 46,
    draw: (g, w, h) => {
      stroke(g, [[w / 2, 0], [w / 2, 8]], 0x5a3416, 3);
      wonkyPoly(g, [[w / 2, 8], [w / 2 + 12, 4], [w / 2 + 6, 12]], { fill: 0x5fd4a0, seed: 161, lineWidth: 2 });
      blob(g, w / 2, h * 0.6, w * 0.4, h * 0.38, { fill: 0xff8a3d, seed: 162, lineWidth: 3 });
      blob(g, w / 2 - 5, h * 0.5, 5, 7, { fill: 0xffd9a8, outline: null, seed: 163 });
      for (let i = 0; i < 3; i++) dot(g, w * 0.4 + i * 5, h * 0.72, 1.8, 0x8a3a1a);
    },
  },
  {
    key: 'pickup-mega-fruit',
    width: 28,
    height: 30,
    draw: (g, w, h) => {
      blob(g, w / 2, h * 0.58, w * 0.42, h * 0.38, { fill: 0xff8a3d, seed: 171, lineWidth: 2.5 });
      blob(g, w / 2 - 4, h * 0.5, 4, 5, { fill: 0xffd9a8, outline: null, seed: 172 });
      wonkyPoly(g, [[w / 2, h * 0.2], [w / 2 + 9, h * 0.08], [w / 2 + 4, h * 0.26]], { fill: 0x5fd4a0, seed: 173, lineWidth: 2 });
    },
  },
  {
    key: 'battery-pad',
    width: 48,
    height: 24,
    draw: (g, w, h) => {
      g.fillStyle(PORTAL_GREEN, 0.35);
      g.fillEllipse(w / 2, h / 2, w, h);
      g.lineStyle(3, PORTAL_GREEN, 1);
      g.strokeEllipse(w / 2, h / 2, w - 6, h - 6);
      stroke(g, [[w / 2 + 3, 4], [w / 2 - 4, h / 2], [w / 2 + 4, h / 2], [w / 2 - 3, h - 4]], 0xe9ffd6, 3);
    },
  },
  {
    key: 'scanner-gate',
    width: 60,
    height: 70,
    draw: (g, w, h) => {
      wonkyRect(g, 2, 6, 10, h - 8, { fill: 0x8c9bb0, seed: 181, radius: 3 });
      wonkyRect(g, w - 12, 6, 10, h - 8, { fill: 0x8c9bb0, seed: 182, radius: 3 });
      wonkyRect(g, 0, 0, w, 12, { fill: 0x6b7a8f, seed: 183, radius: 4 });
      dot(g, w / 2, 6, 4, 0xff3355);
      g.fillStyle(0x6fd0ff, 0.25);
      g.fillRect(12, 12, w - 24, h - 16);
    },
  },
  {
    key: 'big-scanner',
    width: 96,
    height: 110,
    draw: (g, w, h) => {
      wonkyRect(g, 2, 10, 16, h - 12, { fill: 0x6b7a8f, seed: 191, radius: 4 });
      wonkyRect(g, w - 18, 10, 16, h - 12, { fill: 0x6b7a8f, seed: 192, radius: 4 });
      wonkyRect(g, 0, 0, w, 18, { fill: 0x3d4a5c, seed: 193, radius: 5 });
      for (let i = 0; i < 3; i++) dot(g, w * 0.3 + i * w * 0.2, 9, 4, 0xff3355);
      g.fillStyle(0xff3355, 0.18);
      g.fillRect(18, 18, w - 36, h - 22);
      g.lineStyle(2, 0xff6680, 0.8);
      for (let y = 30; y < h - 10; y += 14) g.lineBetween(20, y, w - 20, y);
    },
  },
  {
    key: 'exit-transit',
    width: 96,
    height: 104,
    draw: (g, w, h) => {
      wonkyRect(g, 4, 14, w - 8, h - 16, { fill: 0x3d4a5c, seed: 201, radius: 10 });
      wonkyRect(g, 16, 30, w - 32, h - 34, { fill: 0x6fd0ff, fillAlpha: 0.75, seed: 202, radius: 8 });
      wonkyRect(g, 10, 0, w - 20, 22, { fill: 0xffd54a, seed: 203, radius: 4 });
      g.lineStyle(3, INK, 1);
      g.lineBetween(w * 0.3, 11, w * 0.62, 11);
      g.lineBetween(w * 0.54, 5, w * 0.62, 11);
      g.lineBetween(w * 0.54, 17, w * 0.62, 11);
    },
  },
  {
    key: 'vending-machine',
    width: 56,
    height: 84,
    draw: (g, w, h) => {
      wonkyRect(g, 4, 4, w - 8, h - 6, { fill: 0xd9303a, seed: 211, radius: 6 });
      wonkyRect(g, 10, 12, w * 0.55, h * 0.6, { fill: 0xbfe6f7, fillAlpha: 0.9, seed: 212, radius: 3, lineWidth: 2 });
      for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) dot(g, 17 + c * 12, 20 + r * 11, 3.5, [0xffd54a, 0x97ce4c, 0x8ec5de, 0xf08fb0][(r + c) % 4]);
      wonkyRect(g, w - 18, 20, 8, 20, { fill: 0x3a3f58, seed: 213, radius: 2, lineWidth: 2 });
      eye(g, w - 14, 50, 4, 'happy');
      mouth(g, w - 14, 60, 8, 'smile');
    },
  },
  {
    key: 'trader-critter',
    width: 58,
    height: 58,
    draw: (g, w, h) => {
      blob(g, w / 2, h * 0.62, w * 0.44, h * 0.36, { fill: 0xb48be0, seed: 221, wobble: 0.1, lineWidth: 3 });
      blob(g, w / 2, h * 0.3, w * 0.28, h * 0.24, { fill: 0xc9a2ec, seed: 222, lineWidth: 3 });
      eye(g, w * 0.4, h * 0.28, 5, 'happy');
      eye(g, w * 0.6, h * 0.28, 5, 'happy', { x: 0, y: 0 }, true);
      mouth(g, w / 2, h * 0.4, 10, 'smile');
      wonkyRect(g, w * 0.2, h * 0.62, w * 0.6, 8, { fill: 0xffd54a, seed: 223, radius: 3, lineWidth: 2 });
    },
  },
  {
    key: 'duty-free-kiosk',
    width: 80,
    height: 80,
    draw: (g, w, h) => {
      wonkyRect(g, 4, h * 0.4, w - 8, h * 0.58, { fill: 0x2f6f8f, seed: 231, radius: 6 });
      wonkyRect(g, 0, h * 0.3, w, 12, { fill: 0x6fd0ff, seed: 232, radius: 4 });
      drawBugHead(g, w / 2, h * 0.2, 13, 233, 0x8fb573);
      wonkyRect(g, w * 0.15, h * 0.55, w * 0.7, 14, { fill: 0xffd54a, seed: 234, radius: 3, lineWidth: 2 });
    },
  },
  {
    key: 'moving-box',
    width: 44,
    height: 38,
    draw: (g, w, h) => {
      wonkyRect(g, 2, 6, w - 4, h - 8, { fill: 0xc9935f, seed: 241, radius: 3 });
      g.lineStyle(3, 0xe9d7a8, 1);
      g.lineBetween(w / 2, 6, w / 2, h - 3);
      g.lineStyle(2, INK, 1);
      g.lineBetween(8, h * 0.6, w * 0.4, h * 0.6);
    },
  },
  {
    key: 'confiscated-sign',
    width: 90,
    height: 40,
    draw: (g, w, h) => {
      wonkyRect(g, 2, 2, w - 4, h - 4, { fill: 0xffd54a, seed: 251, radius: 4 });
      g.lineStyle(4, 0xd92f3a, 1);
      g.lineBetween(10, h - 10, w - 10, 10);
    },
  },
  {
    key: 'blackboard',
    width: 150,
    height: 60,
    draw: (g, w, h) => {
      wonkyRect(g, 2, 2, w - 4, h - 8, { fill: 0x2f4a3a, seed: 261, radius: 4 });
      g.lineStyle(2, 0xf4efe6, 0.9);
      g.lineBetween(14, 18, 50, 18);
      g.lineBetween(60, 18, 70, 28);
      g.lineBetween(60, 28, 70, 18);
      g.lineBetween(80, 22, 96, 22);
      g.lineBetween(14, 34, 110, 34);
    },
  },
  {
    key: 'portal-small',
    width: 70,
    height: 86,
    draw: (g, w, h) => portalSwirl(g, w / 2, h / 2, w * 0.45, h * 0.46, 33),
  },
];
