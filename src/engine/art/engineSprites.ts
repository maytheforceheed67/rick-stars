/** Art the engine itself needs: projectiles, particles, pedestals, exits and HUD bits. */
import type { SpriteArt } from '../types';
import { blob, dot, gear, heart, INK, portalSwirl, shade, stroke, wonkyPoly, wonkyRect } from './draw';

const orb = (key: string, fill: number, core: number): SpriteArt => ({
  key,
  width: 16,
  height: 16,
  draw: (g) => {
    g.fillStyle(fill, 0.35);
    g.fillCircle(8, 8, 8);
    g.fillStyle(fill, 1);
    g.fillCircle(8, 8, 6);
    g.lineStyle(2, INK, 1);
    g.strokeCircle(8, 8, 6);
    g.fillStyle(core, 1);
    g.fillCircle(6.5, 6.5, 2.5);
  },
});

export const ENGINE_SPRITES: SpriteArt[] = [
  {
    // An elongated energy bolt (tinted by the weapon), so it never reads like an enemy orb.
    key: 'shot-player',
    width: 24,
    height: 14,
    draw: (g) => {
      g.fillStyle(0xffffff, 0.35);
      g.fillEllipse(12, 7, 24, 14);
      g.fillStyle(0xffffff, 1);
      g.fillEllipse(13, 7, 18, 8);
      g.lineStyle(2, 0x1a1424, 0.7);
      g.strokeEllipse(13, 7, 18, 8);
    },
  },
  orb('shot-orb', 0xff6a3d, 0xffe0a8),
  {
    // Morty's bolt, part 1: the body and tail, drawn white to take the weapon's color, with a dark
    // edge so it reads on any floor. The head is at (32, 7); the tail streams off to the left.
    key: 'shot-bolt-edge',
    width: 40,
    height: 14,
    draw: (g) => {
      const pts = [
        { x: 0, y: 7 },
        { x: 18, y: 3.4 },
        { x: 30, y: 1.4 },
        { x: 35, y: 2 },
        { x: 38.5, y: 7 },
        { x: 35, y: 12 },
        { x: 30, y: 12.6 },
        { x: 18, y: 10.6 },
      ];
      g.fillStyle(0xffffff, 1);
      g.fillPoints(pts, true);
      g.lineStyle(1.6, INK, 0.85);
      g.strokePoints(pts, true);
    },
  },
  {
    // Morty's bolt, part 2: the white-hot core over the head (untinted).
    key: 'shot-bolt-core',
    width: 18,
    height: 8,
    draw: (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillEllipse(10, 4, 16, 6.4);
    },
  },
  {
    // A thrown thing's trail: a soft streak, head at the right end (tinted by the weapon).
    key: 'shot-trail',
    width: 40,
    height: 12,
    draw: (g) => {
      for (let i = 0; i < 6; i++) {
        const t = i / 6;
        g.fillStyle(0xffffff, 0.22 + 0.2 * t);
        g.fillEllipse(8 + t * 26, 6, 16 + t * 12, 3 + t * 7);
      }
    },
  },
  {
    // What every enemy shot sits on: a round, warm, dark-rimmed disc. Never a streak.
    key: 'shot-hostile',
    width: 22,
    height: 22,
    draw: (g) => {
      g.fillStyle(0xff4a2e, 1);
      g.fillCircle(11, 11, 10);
      g.fillStyle(0xff9a4a, 1);
      g.fillCircle(11, 11, 6.5);
      g.lineStyle(2.5, INK, 1);
      g.strokeCircle(11, 11, 10);
    },
  },
  {
    key: 'shot-paper',
    width: 16,
    height: 16,
    draw: (g) => {
      wonkyRect(g, 2, 1, 12, 14, { fill: 0xffffff, seed: 3, radius: 1, lineWidth: 2 });
      g.lineStyle(1.5, 0x7fa8d8, 1);
      for (let i = 0; i < 3; i++) g.lineBetween(4, 5 + i * 3, 12, 5 + i * 3);
      g.fillStyle(0xe0484d, 1);
      g.fillRect(10, 2, 3, 3);
    },
  },
  {
    key: 'shot-ball',
    width: 16,
    height: 16,
    draw: (g) => {
      g.fillStyle(0xe0484d, 1);
      g.fillCircle(8, 8, 7);
      g.lineStyle(2, INK, 1);
      g.strokeCircle(8, 8, 7);
      g.lineStyle(1.5, 0x8a1f2a, 1);
      g.beginPath();
      g.arc(2, 8, 7, -0.9, 0.9, false);
      g.strokePath();
      g.fillStyle(0xffffff, 0.6);
      g.fillCircle(5.5, 5.5, 2);
    },
  },
  {
    key: 'shot-book',
    width: 18,
    height: 14,
    draw: (g) => {
      wonkyRect(g, 1, 1, 16, 12, { fill: 0x3f6fb5, seed: 4, radius: 2, lineWidth: 2 });
      g.fillStyle(0xf4efe6, 1);
      g.fillRect(3, 9, 12, 2);
      g.fillStyle(0xffd54a, 1);
      g.fillRect(6, 4, 6, 2);
    },
  },
  {
    key: 'shot-spore',
    width: 16,
    height: 16,
    draw: (g) => {
      blob(g, 8, 8, 6.5, 6.5, { fill: 0x7fd6a8, seed: 9, lineWidth: 2, wobble: 0.12 });
      dot(g, 6, 7, 1.5, 0x2f7a57);
      dot(g, 10, 9, 1.5, 0x2f7a57);
      dot(g, 8, 4.5, 1.2, 0x2f7a57);
    },
  },
  {
    // An enemy's energy shot: a round magenta plasma ball (enemy shots are never streaks).
    key: 'shot-bolt',
    width: 16,
    height: 16,
    draw: (g) => {
      g.fillStyle(0xff4fd8, 1);
      g.fillCircle(8, 8, 6.5);
      g.lineStyle(2, INK, 1);
      g.strokeCircle(8, 8, 6.5);
      g.fillStyle(0xffd0f4, 1);
      g.fillCircle(7, 7, 2.6);
    },
  },
  {
    key: 'shot-stamp',
    width: 16,
    height: 18,
    draw: (g) => {
      wonkyRect(g, 1, 1, 14, 16, { fill: 0xf4efe6, seed: 6, radius: 1, lineWidth: 2 });
      g.lineStyle(2, 0xd92f3a, 1);
      g.strokeCircle(8, 9, 4.5);
      g.lineBetween(5, 12, 11, 6);
    },
  },
  {
    key: 'shot-ice',
    width: 18,
    height: 8,
    draw: (g) => {
      wonkyPoly(g, [[0, 4], [6, 0], [18, 4], [6, 8]], { fill: 0xbfeaff, seed: 2, lineWidth: 1.5, wobble: 0.3 });
      g.fillStyle(0xffffff, 0.8);
      g.fillTriangle(5, 3, 12, 4, 5, 5);
    },
  },
  { key: 'fx-dot', width: 8, height: 8, draw: (g) => dot(g, 4, 4, 4, 0xffffff) },
  {
    // Ripples around the feet of someone wading through a slow floor (tinted with the floor's slow color).
    key: 'fx-ripple',
    width: 44,
    height: 16,
    draw: (g) => {
      g.lineStyle(2.5, 0xffffff, 0.9);
      g.strokeEllipse(22, 8, 30, 10);
      g.lineStyle(2, 0xffffff, 0.55);
      g.strokeEllipse(22, 8, 42, 14);
    },
  },
  {
    // A spark flying off a hit: a sliver pointing along its path, dark-edged so it shows on any floor.
    key: 'fx-spark',
    width: 12,
    height: 5,
    draw: (g) => {
      const pts = [{ x: 0, y: 2.5 }, { x: 5, y: 0.4 }, { x: 12, y: 2.5 }, { x: 5, y: 4.6 }];
      g.fillStyle(0xffffff, 1);
      g.fillPoints(pts, true);
      g.lineStyle(1.2, INK, 0.9);
      g.strokePoints(pts, true);
    },
  },
  // A hand holding a weapon (tinted with the character's skin; the outline stays dark).
  { key: 'held-hand', width: 8, height: 8, draw: (g) => dot(g, 4, 4, 3.4, 0xffffff) },
  {
    // A generic ray gun, for a gun that doesn't bring its own held sprite. Held at (6, 7).
    key: 'held-gun',
    width: 26,
    height: 14,
    draw: (g) => {
      wonkyRect(g, 3, 8, 6, 6, { fill: 0x6d6a7c, seed: 91, radius: 2 });
      wonkyRect(g, 1, 3, 19, 8, { fill: 0xb8bdd4, seed: 92, radius: 3 });
      wonkyPoly(g, [[19, 4], [25, 2], [25, 12], [19, 10]], { fill: 0x97ce4c, seed: 93 });
    },
  },
  {
    // A muzzle flash: a hot core with spikes along the barrel (pointing right; added on top).
    key: 'fx-muzzle',
    width: 30,
    height: 20,
    draw: (g) => {
      g.fillStyle(0xffffff, 0.45);
      g.fillPoints([{ x: 0, y: 10 }, { x: 8, y: 1 }, { x: 30, y: 10 }, { x: 8, y: 19 }], true);
      g.fillStyle(0xffffff, 1);
      g.fillPoints([{ x: 2, y: 10 }, { x: 9, y: 5 }, { x: 22, y: 10 }, { x: 9, y: 15 }], true);
      g.fillCircle(8, 10, 5);
    },
  },
  // A piece of junk circling Morty (the orbit stat).
  { key: 'orbit-junk', width: 22, height: 22, draw: (g) => gear(g, 11, 11, 10, 0xc9ced9) },
  {
    // A slash mark for blades and stomps.
    key: 'fx-slash',
    width: 48,
    height: 20,
    draw: (g) => {
      g.fillStyle(0xffffff, 1);
      g.beginPath();
      g.moveTo(0, 16);
      g.lineTo(24, 2);
      g.lineTo(48, 16);
      g.lineTo(24, 9);
      g.closePath();
      g.fillPath();
    },
  },
  {
    key: 'elite-shielded',
    width: 16,
    height: 18,
    draw: (g) => wonkyPoly(g, [[8, 1], [15, 4], [14, 11], [8, 17], [2, 11], [1, 4]], { fill: 0x7fdcff, seed: 81, lineWidth: 2, wobble: 0.3 }),
  },
  {
    key: 'elite-hasty',
    width: 14,
    height: 18,
    draw: (g) => wonkyPoly(g, [[9, 0], [2, 10], [7, 10], [4, 18], [13, 7], [8, 7]], { fill: 0xffb03a, seed: 82, lineWidth: 2, wobble: 0.3 }),
  },
  {
    key: 'elite-splitting',
    width: 18,
    height: 16,
    draw: (g) => {
      blob(g, 5.5, 8, 4.5, 6, { fill: 0xc58bff, seed: 83, lineWidth: 2 });
      blob(g, 12.5, 8, 4.5, 6, { fill: 0xc58bff, seed: 84, lineWidth: 2 });
    },
  },
  {
    key: 'elite-explosive',
    width: 18,
    height: 18,
    draw: (g) => {
      blob(g, 8, 11, 6.5, 6.5, { fill: 0x2b2438, seed: 85, lineWidth: 2 });
      stroke(g, [[11, 6], [14, 2]], INK, 2);
      dot(g, 15, 2, 2.2, 0xff6a3d);
    },
  },
  {
    key: 'fx-square',
    width: 7,
    height: 7,
    draw: (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillRect(0, 0, 7, 7);
    },
  },
  {
    key: 'fx-star',
    width: 12,
    height: 12,
    draw: (g) => {
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const r = i % 2 === 0 ? 6 : 2.5;
        pts.push({ x: 6 + Math.cos(a) * r, y: 6 + Math.sin(a) * r });
      }
      g.fillStyle(0xffffff, 1);
      g.fillPoints(pts, true);
    },
  },
  {
    key: 'fx-shard',
    width: 12,
    height: 6,
    draw: (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillPoints([{ x: 0, y: 3 }, { x: 4, y: 0 }, { x: 12, y: 3 }, { x: 4, y: 6 }], true);
    },
  },
  {
    key: 'fx-puff',
    width: 18,
    height: 18,
    draw: (g) => {
      g.fillStyle(0xffffff, 0.35);
      g.fillCircle(9, 9, 9);
      g.fillStyle(0xffffff, 0.8);
      g.fillCircle(9, 9, 6);
    },
  },
  {
    key: 'fx-iceblock',
    width: 48,
    height: 48,
    draw: (g) => {
      wonkyRect(g, 2, 2, 44, 44, { fill: 0xbfeaff, fillAlpha: 0.55, outline: 0x6fbfe8, lineWidth: 3, seed: 8, radius: 6 });
      g.fillStyle(0xffffff, 0.7);
      g.fillTriangle(8, 8, 20, 8, 8, 22);
      g.fillStyle(0xffffff, 0.45);
      g.fillRect(34, 28, 4, 12);
    },
  },
  {
    key: 'pedestal',
    width: 46,
    height: 30,
    draw: (g) => {
      g.fillStyle(0x000000, 0.25);
      g.fillEllipse(23, 26, 46, 10);
      wonkyRect(g, 6, 8, 34, 20, { fill: 0x8a8fa8, seed: 12, radius: 4 });
      wonkyRect(g, 2, 2, 42, 10, { fill: 0xb8bdd4, seed: 13, radius: 4 });
      g.fillStyle(0xffffff, 0.35);
      g.fillRect(8, 4, 18, 3);
    },
  },
  {
    key: 'shadow',
    width: 40,
    height: 14,
    draw: (g) => {
      g.fillStyle(0x000000, 0.3);
      g.fillEllipse(20, 7, 40, 14);
    },
  },
  {
    key: 'exit-portal',
    width: 90,
    height: 110,
    draw: (g) => portalSwirl(g, 45, 55, 42, 52, 21),
  },
  {
    // An official departure portal: a blue swirl in a metal frame with a sign on top.
    key: 'exit-departure',
    width: 104,
    height: 122,
    draw: (g, w, h) => {
      wonkyRect(g, 4, 18, w - 8, h - 20, { fill: 0x56657a, seed: 31, radius: 12 });
      blob(g, w / 2, h * 0.58, w * 0.36, h * 0.38, { fill: 0x2f6f8f, outline: 0x1d3f55, lineWidth: 3, seed: 32, wobble: 0.06 });
      blob(g, w / 2, h * 0.58, w * 0.27, h * 0.29, { fill: 0x6fd0ff, outline: null, seed: 33, wobble: 0.08 });
      blob(g, w / 2, h * 0.58, w * 0.13, h * 0.14, { fill: 0xd9f4ff, outline: null, seed: 34, wobble: 0.1 });
      wonkyRect(g, 14, 0, w - 28, 20, { fill: 0xffd54a, seed: 35, radius: 4 });
      g.lineStyle(3, INK, 1);
      g.lineBetween(w * 0.3, 10, w * 0.62, 10);
      g.lineBetween(w * 0.54, 4, w * 0.62, 10);
      g.lineBetween(w * 0.54, 16, w * 0.62, 10);
    },
  },
  {
    // A security gate between finale stages: a scanner frame with a green light.
    key: 'exit-gate',
    width: 96,
    height: 100,
    draw: (g, w, h) => {
      wonkyRect(g, 4, 6, 14, h - 8, { fill: 0x6b7a8f, seed: 41, radius: 3 });
      wonkyRect(g, w - 18, 6, 14, h - 8, { fill: 0x6b7a8f, seed: 42, radius: 3 });
      wonkyRect(g, 0, 0, w, 16, { fill: 0x56657a, seed: 43, radius: 4 });
      g.fillStyle(0x0c0a14, 0.85);
      g.fillRect(18, 16, w - 36, h - 18);
      dot(g, w / 2, 8, 5, 0x97ce4c);
      g.lineStyle(2, 0x97ce4c, 0.6);
      for (let y = 26; y < h - 6; y += 12) g.lineBetween(20, y, w - 20, y);
    },
  },
  {
    key: 'sign',
    width: 40,
    height: 46,
    draw: (g) => {
      wonkyRect(g, 17, 20, 6, 26, { fill: 0x8b5a2b, seed: 14, radius: 1, lineWidth: 2 });
      wonkyRect(g, 1, 2, 38, 24, { fill: 0xd9a066, seed: 15, radius: 3 });
      g.lineStyle(2, shade(0xd9a066, -0.4), 1);
      g.lineBetween(7, 10, 33, 10);
      g.lineBetween(7, 17, 27, 17);
    },
  },
  {
    key: 'ui-heart-full',
    width: 26,
    height: 24,
    draw: (g) => heart(g, 13, 12, 24, 0xe8364e),
  },
  {
    key: 'ui-heart-half',
    width: 26,
    height: 24,
    draw: (g) => heart(g, 13, 12, 24, 0xe8364e, true),
  },
  {
    key: 'ui-heart-empty',
    width: 26,
    height: 24,
    draw: (g) => heart(g, 13, 12, 24, -1),
  },
  {
    key: 'ui-scrap',
    width: 24,
    height: 24,
    draw: (g) => gear(g, 12, 12, 11, 0xc9ced9),
  },
  {
    key: 'bomb-marker',
    width: 30,
    height: 30,
    draw: (g) => {
      blob(g, 15, 17, 12, 12, { fill: 0x3a3f58, seed: 16 });
      g.fillStyle(0x97ce4c, 1);
      g.fillCircle(15, 17, 5);
      stroke(g, [[20, 7], [24, 3]], INK, 3);
    },
  },
];
