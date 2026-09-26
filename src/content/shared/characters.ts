/** The Smith household and Rick: recurring characters shared by every episode. */
import { dot, INK, stroke } from '../../engine/art/draw';
import type { CharacterDef, SpriteArt } from '../../engine/types';
import { drawPerson, drawPortrait, SKIN, SKIN_PALE } from './art';

export const MORTY_SHIRT = 0xf7d747;
const RICK_HAIR = 0xa8dcec;
const RICK_COAT = 0xeef3f6;
const RICK_SHIRT = 0x8ec5de;

// Looks follow the show's season 1 designs.
/** Dark brown hair; dark green shirt with a brown and beige band; light blue pants. */
const JERRY = { skin: SKIN, hair: 0x4a2c17, hairStyle: 'swoop', shirt: 0x3e7a4c, stripe: [0x8b5a33, 0xe7d6ae], brow: 0x3a2210 } as const;
/** Wavy shoulder-length blonde bob; red v-neck polo; berry lipstick. */
const BETH = { skin: SKIN, hair: 0xf1d38e, hairStyle: 'bob', shirt: 0xd8323f, neckline: 'v-collar', sleeves: 'short', lips: 0xc2457a, lashes: true, brow: 0xc79a4f } as const;
/** Red hair pulled back in a ponytail; magenta tank top; white capris. */
const SUMMER = { skin: SKIN, hair: 0xd9582a, hairStyle: 'ponytail', shirt: 0xd8327f, sleeves: 'none', brow: 0x9c3f18 } as const;

export function mortySprite(shirt = MORTY_SHIRT, key = 'morty'): SpriteArt {
  return {
    key,
    width: 42,
    height: 56,
    draw: (g, w, h) =>
      drawPerson(g, w, h, {
        seed: 101,
        skin: SKIN,
        hair: 0x6e3f1c,
        hairStyle: 'morty',
        shirt,
        pants: 0x3f6fb5,
        shoes: 0xf2f2f2,
        eyes: 'normal',
        mouth: 'wavy',
        brow: 0x4a2a12,
      }),
  };
}

export const rickSprite: SpriteArt = {
  key: 'rick',
  width: 46,
  height: 64,
  draw: (g, w, h) =>
    drawPerson(g, w, h, {
      seed: 202,
      skin: SKIN_PALE,
      hair: RICK_HAIR,
      hairStyle: 'rick',
      shirt: RICK_SHIRT,
      coat: RICK_COAT,
      pants: 0x7a5a3a,
      shoes: 0x3a2a20,
      build: 'adult',
      eyes: 'drunk',
      mouth: 'wavy',
      unibrow: true,
      brow: 0x7fa8b8,
    }),
};

export const morty: CharacterDef = {
  id: 'morty',
  name: 'Morty',
  firstAppears: 'S01E01',
  canon: true,
  color: MORTY_SHIRT,
  sprite: mortySprite(),
  recolor: (shirt, key) => mortySprite(shirt, key),
  portrait: (g, S, expr) =>
    drawPortrait(g, S, expr, {
      seed: 11,
      skin: SKIN,
      hair: 0x6e3f1c,
      hairStyle: 'morty',
      shirt: MORTY_SHIRT,
      headR: 0.27,
      brow: 0x4a2a12,
      extra: (gg, s, e) => {
        if (e === 'scared' || e === 'sick') {
          dot(gg, s * 0.7, s * 0.34, s * 0.025, 0x9fd4ff);
          dot(gg, s * 0.72, s * 0.39, s * 0.018, 0x9fd4ff);
        }
        if (e === 'sick') {
          stroke(gg, [[s * 0.3, s * 0.3], [s * 0.36, s * 0.26], [s * 0.42, s * 0.3]], 0x6bbf59, 3);
        }
      },
    }),
};

export const rick: CharacterDef = {
  id: 'rick',
  name: 'Rick',
  firstAppears: 'S01E01',
  canon: true,
  color: RICK_HAIR,
  sprite: rickSprite,
  portrait: (g, S, expr) =>
    drawPortrait(g, S, expr === 'normal' ? 'drunk' : expr, {
      seed: 22,
      skin: SKIN_PALE,
      hair: RICK_HAIR,
      hairStyle: 'rick',
      shirt: RICK_SHIRT,
      coat: RICK_COAT,
      headR: 0.2,
      headStretch: 1.28,
      unibrow: true,
      brow: 0x7fa8b8,
      extra: (gg, s, e) => {
        // Bags under the eyes, and drool when he's had a few.
        stroke(gg, [[s * 0.37, s * 0.5], [s * 0.45, s * 0.52]], 0xb89a86, 2.5);
        stroke(gg, [[s * 0.55, s * 0.52], [s * 0.63, s * 0.5]], 0xb89a86, 2.5);
        if (e === 'drunk' || e === 'normal') {
          gg.fillStyle(0xb8d77a, 1);
          gg.fillEllipse(s * 0.56, s * 0.66, s * 0.03, s * 0.07);
          gg.lineStyle(2, INK, 1);
          gg.strokeEllipse(s * 0.56, s * 0.66, s * 0.03, s * 0.07);
        }
      },
    }),
};

export const jerry: CharacterDef = {
  id: 'jerry',
  name: 'Jerry',
  firstAppears: 'S01E01',
  canon: true,
  color: 0x5f9a6c,
  sprite: {
    key: 'jerry',
    width: 44,
    height: 62,
    draw: (g, w, h) => drawPerson(g, w, h, { seed: 303, ...JERRY, pants: 0x9dbde6, shoes: 0x222222, build: 'adult', mouth: 'frown' }),
  },
  portrait: (g, S, expr) => drawPortrait(g, S, expr, { seed: 33, ...JERRY, headR: 0.22, headStretch: 1.1 }),
};

export const beth: CharacterDef = {
  id: 'beth',
  name: 'Beth',
  firstAppears: 'S01E01',
  canon: true,
  color: 0xd8323f,
  sprite: {
    key: 'beth',
    width: 44,
    height: 60,
    draw: (g, w, h) => drawPerson(g, w, h, { seed: 404, ...BETH, pants: 0x3f63b0, shoes: 0xf4f4f4, build: 'adult', mouth: 'flat' }),
  },
  portrait: (g, S, expr) => drawPortrait(g, S, expr, { seed: 44, ...BETH, headR: 0.22 }),
};

export const summer: CharacterDef = {
  id: 'summer',
  name: 'Summer',
  firstAppears: 'S01E01',
  canon: true,
  color: 0xd8327f,
  sprite: {
    key: 'summer',
    width: 42,
    height: 58,
    draw: (g, w, h) => drawPerson(g, w, h, { seed: 505, ...SUMMER, pants: 0xf2f0ea, shoes: 0x262626, mouth: 'flat' }),
  },
  portrait: (g, S, expr) => drawPortrait(g, S, expr, { seed: 55, ...SUMMER, headR: 0.23 }),
};

export const SHARED_CHARACTERS: CharacterDef[] = [morty, rick, jerry, beth, summer];
