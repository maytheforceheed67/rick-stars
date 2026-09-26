/** Scrap and hearts: pickups every episode drops. */
import { gear, heart } from '../../engine/art/draw';
import type { PickupDef, SpriteArt } from '../../engine/types';

export const PICKUP_SPRITES: SpriteArt[] = [
  { key: 'pickup-scrap', width: 22, height: 22, draw: (g) => gear(g, 11, 11, 10, 0xd6dbe6) },
  { key: 'pickup-heart-half', width: 24, height: 22, draw: (g) => heart(g, 12, 11, 22, 0xe8364e, true) },
  { key: 'pickup-heart-full', width: 24, height: 22, draw: (g) => heart(g, 12, 11, 22, 0xe8364e) },
];

export const SHARED_PICKUPS: PickupDef[] = [
  {
    id: 'scrap',
    name: 'Scrap',
    firstAppears: 'S01E01',
    canon: false,
    art: 'pickup-scrap',
    magnetic: true,
    collect: (ctx) => {
      ctx.addScrap(1 + Math.round(ctx.stats().scrapBonus), ctx.player.x, ctx.player.y);
    },
  },
  {
    id: 'heart-half',
    name: 'Half a Heart',
    firstAppears: 'S01E01',
    canon: false,
    art: 'pickup-heart-half',
    collect: (ctx) => {
      if (ctx.player.hp >= ctx.player.maxHp) return false;
      ctx.player.heal(1);
    },
  },
  {
    id: 'heart-full',
    name: 'A Whole Heart',
    firstAppears: 'S01E01',
    canon: false,
    art: 'pickup-heart-full',
    collect: (ctx) => {
      if (ctx.player.hp >= ctx.player.maxHp) return false;
      ctx.player.heal(2);
    },
  },
];
