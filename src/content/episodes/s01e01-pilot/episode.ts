/**
 * S01E01 "Pilot". Everything the episode adds lives in this folder; registry.ts lists it.
 */
import type { EpisodeDef, PickupDef } from '../../../engine/types';
import { DIMENSION_35C, CUSTOMS, EPILOGUE, PROLOGUE, SCHOOL } from './acts';
import { PILOT_PROP_ART } from './art';
import { PILOT_BACKDROPS } from './backdrops';
import { PILOT_BOSSES } from './bosses';
import { PILOT_CHARACTERS } from './characters';
import { PILOT_CUTSCENES } from './cutscenes';
import { PILOT_ENCOUNTERS, PILOT_SCRIPTS } from './encounters';
import { PILOT_ENEMIES } from './enemies';
import { PILOT_ITEMS, PILOT_SYNERGIES } from './items';
import { grapplingShoes } from './mechanics/grapplingShoes';
import { suspicion } from './mechanics/suspicion';
import { PILOT_MUSIC } from './music';
import { PILOT_TEMPLATES } from './rooms';
import { PILOT_SPECIAL_ROOMS } from './specialRooms';
import { PILOT_STATUSES } from './statuses';

const megaFruit: PickupDef = {
  id: 'mega-fruit',
  name: 'Mega Fruit',
  firstAppears: 'S01E01',
  canon: true,
  art: 'pickup-mega-fruit',
  collect: (ctx) => {
    ctx.flags.megaFruit = ((ctx.flags.megaFruit as number | undefined) ?? 0) + 1;
    ctx.player.heal(1);
    ctx.toast('Mega Fruit recovered!', { color: 0x97ce4c, seconds: 1.4 });
  },
};

export const pilot: EpisodeDef = {
  id: 'S01E01',
  firstAppears: 'S01E01',
  canon: true,
  season: 1,
  number: 1,
  title: 'Pilot',
  synopsis:
    'Rick drags Morty out of school and into Dimension 35-C for Mega Seeds. Getting them home means smuggling them through Interdimensional Customs.',
  startWeapon: 'ricks-spare-ray-gun',
  prologue: PROLOGUE,
  acts: [SCHOOL, DIMENSION_35C, CUSTOMS],
  epilogue: EPILOGUE,
  unlocksOnClear: ['mega-seed'],
  content: {
    characters: PILOT_CHARACTERS,
    items: PILOT_ITEMS,
    synergies: PILOT_SYNERGIES,
    statuses: PILOT_STATUSES,
    enemies: [...PILOT_ENEMIES, ...PILOT_BOSSES],
    encounters: PILOT_ENCOUNTERS,
    specialRooms: PILOT_SPECIAL_ROOMS,
    mechanics: [grapplingShoes, suspicion],
    gadgets: [],
    pickups: [megaFruit],
    cutscenes: PILOT_CUTSCENES,
    backdrops: PILOT_BACKDROPS,
    templates: PILOT_TEMPLATES,
    scripts: PILOT_SCRIPTS,
    sprites: PILOT_PROP_ART,
    music: PILOT_MUSIC,
  },
};
