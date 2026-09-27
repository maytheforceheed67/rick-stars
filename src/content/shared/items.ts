/** Items shared by every episode. */
import { blob, dot, INK, PORTAL_GREEN, wonkyPoly, wonkyRect } from '../../engine/art/draw';
import type { ItemDef, SpriteArt } from '../../engine/types';

/** Rick's spare ray gun as Morty holds it: pointing right, gripped at (6, 7). */
export const SHARED_HELD_ART: SpriteArt[] = [
  {
    key: 'held-spare-ray-gun',
    width: 28,
    height: 14,
    draw: (g) => {
      wonkyRect(g, 3, 8, 6, 6, { fill: 0x6d6a7c, seed: 11, radius: 2 });
      wonkyRect(g, 1, 3, 20, 8, { fill: 0xb8bdd4, seed: 12, radius: 3 });
      wonkyPoly(g, [[20, 3.5], [27, 1.5], [27, 12.5], [20, 10.5]], { fill: PORTAL_GREEN, seed: 13 });
      dot(g, 9, 6, 1.6, INK);
      blob(g, 14, 6, 2, 2, { fill: 0xe0484d, outline: null, seed: 14 });
    },
  },
];

export const spareRayGun: ItemDef = {
  id: 'ricks-spare-ray-gun',
  name: "Rick's Spare Ray Gun",
  blurb: "Rick's backup gun, tossed over the moment you landed. The critters here bite.",
  effect: 'Fires green energy bolts.',
  tags: ['shots'],
  firstAppears: 'S01E01',
  canon: false,
  kind: 'weapon',
  rarity: 'story',
  price: 0,
  noPool: true,
  weapon: { damageMult: 1, fireRateMult: 1, extraProjectiles: 0, spread: 0, color: PORTAL_GREEN, held: 'held-spare-ray-gun', muzzle: { x: 21, y: 0 }, flash: 1 },
  icon: (g) => {
    wonkyRect(g, 5, 12, 20, 9, { fill: 0xb8bdd4, seed: 1, radius: 3 });
    wonkyRect(g, 8, 19, 6, 9, { fill: 0x6d6a7c, seed: 2, radius: 2 });
    wonkyPoly(g, [[25, 13], [30, 11], [30, 22], [25, 20]], { fill: PORTAL_GREEN, seed: 3 });
    dot(g, 12, 16, 2, INK);
    blob(g, 18, 16, 2.5, 2.5, { fill: 0xe0484d, outline: null, seed: 4 });
  },
};

export const SHARED_ITEMS: ItemDef[] = [spareRayGun];
