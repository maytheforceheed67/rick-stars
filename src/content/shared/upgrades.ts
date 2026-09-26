/**
 * Rick's Garage upgrades, bought with banked Scrap. Kept modest on purpose: skill should matter
 * more than grinding.
 */
import type { UpgradeDef } from '../../engine/types';

export const UPGRADES: UpgradeDef[] = [
  {
    id: 'spare-heart',
    name: 'Spare Heart',
    description: '+1 max heart. Rick swears it came from a "consenting" donor.',
    category: 'stat',
    costs: [35, 80],
    stats: { add: { maxHearts: 1 } },
  },
  {
    id: 'emergency-serum',
    name: 'Emergency Serum',
    description: 'Start every run holding a Broken Leg Serum.',
    category: 'start',
    costs: [30],
    startItem: 'broken-leg-serum',
  },
  {
    id: 'unlock-burp-canister',
    name: 'Unlock: Burp Canister',
    description: 'Adds the Burp Canister to the item pool.',
    category: 'unlock',
    costs: [25],
    unlocks: 'burp-canister',
  },
  {
    id: 'unlock-junk-magnet',
    name: 'Unlock: Garage Junk Magnet',
    description: 'Adds the Junk Magnet to the item pool.',
    category: 'unlock',
    costs: [25],
    unlocks: 'junk-magnet',
  },
  {
    id: 'unlock-spore-sack',
    name: 'Unlock: Spore Sack',
    description: 'Adds the Spore Sack to the item pool.',
    category: 'unlock',
    costs: [30],
    unlocks: 'spore-sack',
  },
  {
    id: 'unlock-contraband-blaster',
    name: 'Unlock: Contraband Blaster',
    description: 'Adds the Contraband Blaster to the item pool.',
    category: 'unlock',
    costs: [35],
    unlocks: 'contraband-blaster',
  },
  {
    id: 'shirt-pajamas',
    name: 'Shirt: Pajama Blue',
    description: "Dress like it's still the middle of the night.",
    category: 'cosmetic',
    costs: [15],
    shirt: 0x9fc9f0,
  },
  {
    id: 'shirt-detention',
    name: 'Shirt: Detention Orange',
    description: 'Very visible. Great for getting caught.',
    category: 'cosmetic',
    costs: [15],
    shirt: 0xf28c38,
  },
  {
    id: 'shirt-portal',
    name: 'Shirt: Portal Green',
    description: 'Matches the portals. Rick hates it.',
    category: 'cosmetic',
    costs: [20],
    shirt: 0x97ce4c,
  },
];
