/** Characters introduced in "Lawnmower Dog". Mr. Goldenfold comes from the Pilot. */
import { dot, INK, stroke, wonkyPoly, wonkyRect } from '../../../engine/art/draw';
import type { CharacterDef, Graphics } from '../../../engine/types';
import { drawPortrait } from '../../shared/art';
import {
  centaurSprite,
  dogTrooperSprite,
  drawDogPortrait,
  littleGirlSprite,
  littleTerrySprite,
  mrsPancakesSprite,
  scaryTerrySprite,
  snowballSprite,
  snufflesSprite,
  SNUFFLES_EAR,
  SNUFFLES_FUR,
} from './art';

const S01E02 = 'S01E02' as const;
const TERRY_STRIPES = [0x8b2323, 0x4f5a2a, 0x8b2323, 0x4f5a2a] as const;

/** Terry's brown hat, on a portrait head. */
function portraitHat(g: Graphics, S: number, r: number): void {
  const cx = S / 2;
  const cy = S * 0.46;
  wonkyRect(g, cx - r * 1.3, cy - r * 0.78, r * 2.6, r * 0.28, { fill: 0x5a3a22, seed: 3001, radius: 4, lineWidth: 4 });
  wonkyPoly(g, [[cx - r * 0.8, cy - r * 0.7], [cx - r * 0.62, cy - r * 1.45], [cx, cy - r * 1.28], [cx + r * 0.62, cy - r * 1.45], [cx + r * 0.8, cy - r * 0.7]], { fill: 0x6b4a2e, seed: 3002, lineWidth: 4 });
}

export const snuffles: CharacterDef = {
  id: 'snuffles',
  name: 'Snuffles',
  firstAppears: S01E02,
  canon: true,
  color: 0xe8e0d0,
  sprite: snufflesSprite,
  // Before the helmet he's just a good boy; with it ("smart", "angry") the helmet's on.
  portrait: (g, S, expr) => drawDogPortrait(g, S, expr, { fur: SNUFFLES_FUR, ear: SNUFFLES_EAR, helmet: expr === 'smart' || expr === 'angry', seed: 3011 }),
};

export const snowball: CharacterDef = {
  id: 'snowball',
  name: 'Snowball',
  firstAppears: S01E02,
  canon: true,
  color: 0xbfe4ff,
  sprite: snowballSprite,
  portrait: (g, S, expr) => drawDogPortrait(g, S, expr, { fur: SNUFFLES_FUR, ear: SNUFFLES_EAR, helmet: true, suit: 0x9aa3b5, seed: 3021 }),
};

export const scaryTerry: CharacterDef = {
  id: 'scary-terry',
  name: 'Scary Terry',
  firstAppears: S01E02,
  canon: true,
  color: 0xb03a2e,
  sprite: scaryTerrySprite,
  portrait: (g, S, expr) =>
    drawPortrait(g, S, expr === 'normal' ? 'angry' : expr, {
      seed: 3031,
      skin: 0xd98f7f,
      hair: 0x3a2a20,
      hairStyle: 'none',
      shirt: 0x8b2323,
      stripe: TERRY_STRIPES,
      headR: 0.22,
      headStretch: 1.1,
      brow: 0x5a2a20,
      extra: (gg, s) => {
        gg.fillStyle(0xb35a52, 0.8);
        gg.fillEllipse(s * 0.4, s * 0.4, s * 0.08, s * 0.05);
        gg.fillEllipse(s * 0.6, s * 0.58, s * 0.06, s * 0.04);
        portraitHat(gg, s, s * 0.22);
        // Blades raised by his face.
        for (let i = 0; i < 4; i++) {
          stroke(gg, [[s * (0.78 + i * 0.035), s * 0.82], [s * (0.8 + i * 0.045), s * 0.56]], INK, 5);
          stroke(gg, [[s * (0.78 + i * 0.035), s * 0.82], [s * (0.8 + i * 0.045), s * 0.56]], 0xdfe6ee, 2.5);
        }
      },
    }),
};

export const littleTerry: CharacterDef = {
  id: 'little-terry',
  name: 'Little Terry',
  firstAppears: S01E02,
  canon: true,
  color: 0xd96a5a,
  sprite: littleTerrySprite,
  portrait: (g, S, expr) =>
    drawPortrait(g, S, expr, {
      seed: 3041,
      skin: 0xf0c6a8,
      hair: 0x3a2a20,
      hairStyle: 'buzz',
      shirt: 0x8b2323,
      stripe: TERRY_STRIPES,
      headR: 0.25,
      extra: (gg, s) => portraitHat(gg, s, s * 0.21),
    }),
};

export const mrsPancakes: CharacterDef = {
  id: 'mrs-pancakes',
  name: 'Mrs. Pancakes',
  firstAppears: S01E02,
  canon: true,
  color: 0xd8327f,
  sprite: mrsPancakesSprite,
  portrait: (g, S, expr) =>
    drawPortrait(g, S, expr, {
      seed: 3051,
      skin: 0xf3d0b5,
      hair: 0xf5d98b,
      hairStyle: 'bob',
      shirt: 0xd8327f,
      lips: 0xd8323f,
      lashes: true,
      headR: 0.23,
      extra: (gg, s) => {
        for (let i = 0; i < 7; i++) dot(gg, s * (0.36 + i * 0.047), s * (0.82 + Math.sin((i / 6) * Math.PI) * 0.03), s * 0.018, 0xf8f4ec);
      },
    }),
};

export const centaur: CharacterDef = {
  id: 'centaur',
  name: 'Centaur Bouncer',
  firstAppears: S01E02,
  canon: true,
  color: 0x8a5a3a,
  sprite: centaurSprite,
  portrait: (g, S, expr) =>
    drawPortrait(g, S, expr, {
      seed: 3061,
      skin: 0xa8744e,
      hair: 0x1c1612,
      hairStyle: 'buzz',
      shirt: 0x1c1a26,
      headR: 0.24,
      extra: (gg, s) => {
        wonkyRect(gg, s * 0.32, s * 0.4, s * 0.36, s * 0.09, { fill: INK, seed: 3062, radius: 3, lineWidth: 2 });
        gg.fillStyle(0xffffff, 1);
        gg.fillRect(s * 0.4, s * 0.9, s * 0.2, s * 0.03);
      },
    }),
};

export const littleGirl: CharacterDef = {
  id: 'little-girl',
  name: 'Little Girl',
  firstAppears: S01E02,
  canon: true,
  color: 0xf2a7c9,
  sprite: littleGirlSprite,
  portrait: (g, S, expr) => drawPortrait(g, S, expr, { seed: 3071, skin: 0xf6d7bd, hair: 0xf2d16b, hairStyle: 'ponytail', shirt: 0xf2a7c9, lashes: true, headR: 0.25 }),
};

export const dogTrooper: CharacterDef = {
  id: 'dog-trooper',
  name: 'Dog Trooper',
  firstAppears: S01E02,
  canon: true,
  color: 0xb07a4a,
  sprite: dogTrooperSprite,
  portrait: (g, S, expr) => drawDogPortrait(g, S, expr === 'normal' ? 'angry' : expr, { fur: 0xb07a4a, ear: 0x7a4f2c, helmet: true, suit: 0x5d6b7b, seed: 3081 }),
};

export const DOG_CHARACTERS: CharacterDef[] = [snuffles, snowball, scaryTerry, littleTerry, mrsPancakes, centaur, littleGirl, dogTrooper];
