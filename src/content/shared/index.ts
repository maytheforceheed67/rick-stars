/** Content shared by every episode (the family, Rick's gadgets, basic pickups). */
import type { EpisodeContent } from '../../engine/types';
import { SHARED_BARKS } from './barks';
import { SHARED_CHARACTERS } from './characters';
import { SHARED_GADGETS } from './gadgets';
import { SHARED_HELD_ART, SHARED_ITEMS } from './items';
import { PICKUP_SPRITES, SHARED_PICKUPS } from './pickups';
import { SHARED_PROPS } from './props';

export const SHARED: EpisodeContent = {
  characters: SHARED_CHARACTERS,
  items: SHARED_ITEMS,
  synergies: [],
  statuses: [],
  enemies: [],
  encounters: [],
  specialRooms: [],
  mechanics: [],
  gadgets: SHARED_GADGETS,
  pickups: SHARED_PICKUPS,
  cutscenes: [],
  backdrops: [],
  templates: [],
  scripts: [],
  sprites: [...PICKUP_SPRITES, ...SHARED_PROPS, ...SHARED_HELD_ART],
  barks: SHARED_BARKS,
};
