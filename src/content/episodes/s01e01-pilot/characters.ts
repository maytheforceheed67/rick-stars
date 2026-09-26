/** Characters introduced in the Pilot. */
import { wonkyRect } from '../../../engine/art/draw';
import type { CharacterDef, Graphics } from '../../../engine/types';
import { drawPortrait } from '../../shared/art';
import { drawBugHead, GOLDENFOLD, GOLDENFOLD_SPRITE, PILOT_ENEMY_ART, PRINCIPAL } from './art';

function bugPortrait(g: Graphics, S: number, cap?: number): void {
  wonkyRect(g, S * 0.12, S * 0.78, S * 0.76, S * 0.35, { fill: cap ?? 0x3d4f7a, seed: 3, radius: S * 0.12, lineWidth: 4 });
  wonkyRect(g, S * 0.44, S * 0.66, S * 0.12, S * 0.16, { fill: 0x8fb573, seed: 4, lineWidth: 3.5 });
  drawBugHead(g, S / 2, S * 0.48, S * 0.24, 91, 0x8fb573, cap);
}

export const frank: CharacterDef = {
  id: 'frank',
  name: 'Frank Palicky',
  firstAppears: 'S01E01',
  canon: true,
  color: 0xb04a3a,
  sprite: PILOT_ENEMY_ART.frank,
  portrait: (g, S, expr) =>
    drawPortrait(g, S, expr === 'normal' ? 'angry' : expr, { seed: 66, skin: 0xe8b98e, hair: 0x2b2118, hairStyle: 'buzz', shirt: 0x5f7f45, headR: 0.25, brow: 0x1a1410 }),
};

export const goldenfold: CharacterDef = {
  id: 'goldenfold',
  name: 'Mr. Goldenfold',
  firstAppears: 'S01E01',
  canon: true,
  color: 0xf2c23a,
  sprite: GOLDENFOLD_SPRITE,
  portrait: (g, S, expr) =>
    drawPortrait(g, S, expr, { seed: 77, ...GOLDENFOLD, headR: 0.24 }),
};

export const principal: CharacterDef = {
  id: 'principal-vagina',
  name: 'Principal Vagina',
  firstAppears: 'S01E01',
  canon: true,
  color: 0x6f8fd0,
  portrait: (g, S, expr) =>
    drawPortrait(g, S, expr, { seed: 88, ...PRINCIPAL, headR: 0.24 }),
};

export const gromflomite: CharacterDef = {
  id: 'gromflomite',
  name: 'Gromflomite Agent',
  firstAppears: 'S01E01',
  canon: true,
  color: 0x8fb573,
  portrait: (g, S) => bugPortrait(g, S),
};

export const supervisor: CharacterDef = {
  id: 'customs-supervisor',
  name: 'Customs Supervisor',
  firstAppears: 'S01E01',
  canon: false,
  color: 0xd9a441,
  portrait: (g, S) => bugPortrait(g, S, 0x1f2a44),
};

export const PILOT_CHARACTERS: CharacterDef[] = [frank, goldenfold, principal, gromflomite, supervisor];
