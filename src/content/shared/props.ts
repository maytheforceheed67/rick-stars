/**
 * Things from the Smith house that every episode can use: Rick's ship (the flying car he built in
 * the garage) and the garage's furniture, which is also the hub between runs.
 */
import { blob, dot, gear, INK, PORTAL_GREEN, shade, stroke, wonkyPoly, wonkyRect } from '../../engine/art/draw';
import type { Graphics, SpriteArt } from '../../engine/types';

/** Rick's ship. On the ground it has a shadow; in the air, a jet flame. */
function drawShip(g: Graphics, w: number, h: number, flying: boolean): void {
  if (flying) {
    wonkyPoly(g, [[2, h * 0.62], [w * 0.08, h * 0.54], [w * 0.08, h * 0.72]], { fill: 0xffa94d, seed: 125, lineWidth: 2, wobble: 2 });
    wonkyPoly(g, [[10, h * 0.63], [w * 0.1, h * 0.58], [w * 0.1, h * 0.68]], { fill: 0xfff2a8, outline: null, seed: 126, wobble: 1 });
  } else {
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(w / 2, h - 6, w * 0.9, 14);
  }
  wonkyPoly(g, [[10, h * 0.55], [w * 0.18, h * 0.3], [w * 0.62, h * 0.24], [w * 0.9, h * 0.38], [w - 6, h * 0.62], [w * 0.86, h * 0.84], [w * 0.14, h * 0.84]], { fill: 0x7a8a9a, seed: 121, wobble: 3, lineWidth: 3 });
  wonkyPoly(g, [[w * 0.28, h * 0.33], [w * 0.36, h * 0.08], [w * 0.6, h * 0.08], [w * 0.66, h * 0.3]], { fill: 0xbfe6f7, fillAlpha: 0.8, seed: 122, lineWidth: 3 });
  wonkyRect(g, w * 0.06, h * 0.56, w * 0.18, 12, { fill: 0xe0484d, seed: 123, radius: 4, lineWidth: 2 });
  wonkyRect(g, w * 0.78, h * 0.5, w * 0.16, 12, { fill: 0xffd54a, seed: 124, radius: 4, lineWidth: 2 });
  for (const x of [w * 0.26, w * 0.72]) blob(g, x, h * 0.84, 12, 7, { fill: 0x3a3f58, seed: Math.round(x), lineWidth: 2.5 });
  g.lineStyle(2, INK, 1);
  g.lineBetween(w * 0.4, h * 0.45, w * 0.55, h * 0.45);
  dot(g, w * 0.5, h * 0.62, 4, PORTAL_GREEN);
}

export const SHARED_PROPS: SpriteArt[] = [
  { key: 'flying-car', width: 150, height: 86, draw: (g, w, h) => drawShip(g, w, h, false) },
  { key: 'flying-car-sky', width: 150, height: 86, draw: (g, w, h) => drawShip(g, w, h, true) },
  {
    // Rick's workbench: tools, a vise and something that glows.
    key: 'garage-workbench',
    width: 150,
    height: 80,
    draw: (g, w, h) => {
      g.fillStyle(0x000000, 0.22);
      g.fillEllipse(w / 2, h - 5, w * 0.95, 12);
      wonkyRect(g, 8, h * 0.42, 12, h * 0.55, { fill: 0x6b4a2e, seed: 601, radius: 2 });
      wonkyRect(g, w - 20, h * 0.42, 12, h * 0.55, { fill: 0x6b4a2e, seed: 602, radius: 2 });
      wonkyRect(g, 0, h * 0.32, w, h * 0.16, { fill: 0x9c6a3e, seed: 603, radius: 4 });
      wonkyRect(g, 12, h * 0.1, 30, h * 0.24, { fill: 0x5a5a6e, seed: 604, radius: 3, lineWidth: 2 });
      gear(g, 70, h * 0.2, 10, 0xc9ced9);
      blob(g, 108, h * 0.2, 12, 9, { fill: PORTAL_GREEN, seed: 605, lineWidth: 2, wobble: 0.1 });
      dot(g, 104, h * 0.16, 3, 0xe6ffd0);
      stroke(g, [[128, h * 0.3], [140, h * 0.06]], 0x8a8699, 3);
    },
  },
  {
    // A closet with Morty's shirts.
    key: 'garage-closet',
    width: 76,
    height: 118,
    draw: (g, w, h) => {
      g.fillStyle(0x000000, 0.22);
      g.fillEllipse(w / 2, h - 5, w * 0.95, 12);
      wonkyRect(g, 2, 2, w - 4, h - 8, { fill: 0xb08a5a, seed: 611, radius: 5 });
      wonkyRect(g, 8, 10, w / 2 - 10, h - 24, { fill: shade(0xb08a5a, 0.12), seed: 612, radius: 3, lineWidth: 2 });
      wonkyRect(g, w / 2 + 2, 10, w / 2 - 10, h - 24, { fill: shade(0xb08a5a, 0.12), seed: 613, radius: 3, lineWidth: 2 });
      dot(g, w / 2 - 5, h / 2, 2.5, 0xffd54a);
      dot(g, w / 2 + 5, h / 2, 2.5, 0xffd54a);
      // A yellow sleeve sticking out.
      wonkyPoly(g, [[w / 2 - 2, h * 0.3], [w / 2 + 12, h * 0.34], [w / 2 + 10, h * 0.44], [w / 2 - 2, h * 0.4]], { fill: 0xf7d747, seed: 614, lineWidth: 2 });
    },
  },
  {
    // The old TV on a crate.
    key: 'garage-tv',
    width: 84,
    height: 84,
    draw: (g, w, h) => {
      g.fillStyle(0x000000, 0.22);
      g.fillEllipse(w / 2, h - 5, w * 0.9, 12);
      wonkyRect(g, 10, h * 0.62, w - 20, h * 0.32, { fill: 0x8b5a2b, seed: 621, radius: 3 });
      wonkyRect(g, 4, 6, w - 8, h * 0.58, { fill: 0x3a3f58, seed: 622, radius: 8 });
      wonkyRect(g, 12, 13, w - 30, h * 0.44, { fill: 0x7fd6c8, seed: 623, radius: 6, lineWidth: 2 });
      g.lineStyle(2, 0xffffff, 0.5);
      g.lineBetween(18, 20, 34, 20);
      dot(g, w - 12, 20, 3, 0xe0484d);
      dot(g, w - 12, 32, 3, 0xffd54a);
      stroke(g, [[w * 0.35, 6], [w * 0.25, -4]], INK, 2);
      stroke(g, [[w * 0.45, 6], [w * 0.55, -4]], INK, 2);
    },
  },
  {
    // Shelves of junk along the garage wall.
    key: 'garage-shelf',
    width: 150,
    height: 70,
    draw: (g, w, h) => {
      wonkyRect(g, 0, h * 0.42, w, 8, { fill: 0x8b5a2b, seed: 631, radius: 2 });
      wonkyRect(g, 0, h - 10, w, 8, { fill: 0x8b5a2b, seed: 632, radius: 2 });
      const junk = [0xe0484d, 0x97ce4c, 0x8ec5de, 0xffd54a, 0xb07cf0];
      for (let i = 0; i < 5; i++) {
        wonkyRect(g, 6 + i * 29, h * 0.42 - 22 + (i % 2) * 4, 20, 22 - (i % 2) * 4, { fill: junk[i], seed: 633 + i, radius: 3, lineWidth: 2 });
        wonkyRect(g, 10 + i * 28, h - 30, 18, 20, { fill: junk[(i + 2) % 5], seed: 640 + i, radius: 3, lineWidth: 2 });
      }
    },
  },
];
