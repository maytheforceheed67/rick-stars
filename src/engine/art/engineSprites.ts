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
    key: 'shot-player',
    width: 16,
    height: 16,
    draw: (g) => {
      g.fillStyle(0xffffff, 0.35);
      g.fillCircle(8, 8, 8);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(8, 8, 5.5);
      g.lineStyle(2, 0x1a1424, 0.8);
      g.strokeCircle(8, 8, 5.5);
    },
  },
  orb('shot-orb', 0xff6a3d, 0xffe0a8),
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
    key: 'shot-bolt',
    width: 22,
    height: 10,
    draw: (g) => {
      g.fillStyle(0xff4fd8, 0.35);
      g.fillEllipse(11, 5, 22, 10);
      g.fillStyle(0xff7ae3, 1);
      g.fillEllipse(12, 5, 16, 6);
      g.fillStyle(0xffffff, 1);
      g.fillEllipse(14, 5, 8, 3);
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
