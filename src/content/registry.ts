/**
 * The one file that lists episodes. Adding an episode means adding its folder under
 * content/episodes/ and pointing its listing at the new EpisodeDef below.
 */
import { buildRegistry, type Registry } from '../engine/registry';
import type { EpisodeListing } from '../engine/types';
import { pilot } from './episodes/s01e01-pilot/episode';
import { lawnmowerDog } from './episodes/s01e02-lawnmower-dog/episode';
import { SHARED } from './shared';
import { UPGRADES } from './shared/upgrades';

export const LISTINGS: EpisodeListing[] = [
  { id: 'S01E01', season: 1, number: 1, title: 'Pilot', def: pilot },
  { id: 'S01E02', season: 1, number: 2, title: 'Lawnmower Dog', def: lawnmowerDog },
  { id: 'S01E03', season: 1, number: 3, title: 'Anatomy Park' },
  { id: 'S01E04', season: 1, number: 4, title: 'M. Night Shaym-Aliens!' },
  { id: 'S01E05', season: 1, number: 5, title: 'Meeseeks and Destroy' },
  { id: 'S01E06', season: 1, number: 6, title: 'Rick Potion #9' },
  { id: 'S01E07', season: 1, number: 7, title: 'Raising Gazorpazorp' },
  { id: 'S01E08', season: 1, number: 8, title: 'Rixty Minutes' },
  { id: 'S01E09', season: 1, number: 9, title: 'Something Ricked This Way Comes' },
  { id: 'S01E10', season: 1, number: 10, title: 'Close Rick-counters of the Rick Kind' },
  { id: 'S01E11', season: 1, number: 11, title: 'Ricksy Business' },
];

/** Label for the locked row under Season 1 on the Season Map. */
export const LATER_SEASONS_LABEL = 'Seasons 2+';

export function createRegistry(): Registry {
  return buildRegistry(LISTINGS, SHARED, UPGRADES);
}
