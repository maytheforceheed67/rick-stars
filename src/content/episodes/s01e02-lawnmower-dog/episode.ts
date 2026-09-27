/**
 * S01E02 "Lawnmower Dog". Everything the episode adds lives in this folder; registry.ts lists it.
 */
import type { EpisodeDef } from '../../../engine/types';
import { DREAMS, EPILOGUE, MEANWHILE_DOGS, MEANWHILE_SNUFFLES, PLANE, PROLOGUE, TERRY_DREAM } from './acts';
import { DOG_PROP_ART, DOG_SHOT_ART, ENEMY_ART, snufflesArmSprite, snufflesHelmetSprite } from './art';
import { DOG_BACKDROPS } from './backdrops';
import { DOG_BOSSES } from './bosses';
import { DOG_CHARACTERS } from './characters';
import { DOG_CUTSCENES } from './cutscenes';
import { DOG_ENCOUNTERS, DOG_SCRIPTS } from './encounters';
import { DOG_ENEMIES } from './enemies';
import { DOG_ITEM_ART, DOG_ITEMS, DOG_STATUSES, DOG_SYNERGIES, DOG_TRANSFORMATIONS } from './items';
import { creakyFloors } from './mechanics/creakyFloors';
import { dogPatrols } from './mechanics/dogPatrols';
import { dreamControl } from './mechanics/dreamControl';
import { scaryTerryHunt } from './mechanics/scaryTerry';
import { terryConfidence } from './mechanics/terryConfidence';
import { DOG_MUSIC, DOG_SFX } from './music';
import { DOG_TEMPLATES } from './rooms';
import { DOG_SPECIAL_ROOMS } from './specialRooms';
import { DOG_WEAPON_ART, DOG_WEAPONS } from './weapons';

export const lawnmowerDog: EpisodeDef = {
  id: 'S01E02',
  firstAppears: 'S01E02',
  canon: true,
  season: 1,
  number: 2,
  title: 'Lawnmower Dog',
  synopsis:
    "Rick dives into Mr. Goldenfold's dreams to get Morty an A, and meets Scary Terry three dreams down. Meanwhile, Snuffles is getting smarter.",
  prologue: PROLOGUE,
  acts: [PLANE, MEANWHILE_SNUFFLES, DREAMS, TERRY_DREAM, MEANWHILE_DOGS],
  epilogue: EPILOGUE,
  unlocksOnClear: ['dream-inceptor', 'nightmare-fuel'],
  content: {
    characters: DOG_CHARACTERS,
    items: [...DOG_WEAPONS, ...DOG_ITEMS],
    synergies: DOG_SYNERGIES,
    transformations: DOG_TRANSFORMATIONS,
    statuses: DOG_STATUSES,
    enemies: [...DOG_ENEMIES, ...DOG_BOSSES],
    encounters: DOG_ENCOUNTERS,
    specialRooms: DOG_SPECIAL_ROOMS,
    mechanics: [dreamControl, scaryTerryHunt, terryConfidence, creakyFloors, dogPatrols],
    gadgets: [],
    pickups: [],
    cutscenes: DOG_CUTSCENES,
    backdrops: DOG_BACKDROPS,
    templates: DOG_TEMPLATES,
    scripts: DOG_SCRIPTS,
    sprites: [...Object.values(ENEMY_ART), snufflesHelmetSprite, snufflesArmSprite, ...DOG_PROP_ART, ...DOG_SHOT_ART, ...DOG_WEAPON_ART, ...DOG_ITEM_ART],
    music: DOG_MUSIC,
    sfx: DOG_SFX,
  },
};
