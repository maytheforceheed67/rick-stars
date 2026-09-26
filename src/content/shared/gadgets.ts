/** Rick's gadgets: what he does when you call him with a full Rick Meter. */
import { RICK_METER } from '../balance';
import type { GadgetDef } from '../../engine/types';

export const freezeRay: GadgetDef = {
  id: 'freeze-ray',
  name: 'Freeze Ray',
  firstAppears: 'S01E01',
  canon: true,
  color: 0xbfeaff,
  activate: (ctx) => ctx.sfx('freeze-ray'),
  // The beam sweeps the room and freezes each enemy it crosses.
  hit: (ctx, e) => ctx.freeze(e, RICK_METER.freezeSeconds),
  lines: [
    'Chill out. —*urrp*— That\'s a science pun, Morty.',
    'Freeze! I always wanted to say that and mean it.',
    'Stay frosty, idiots.',
    'There. Popsicles. You\'re welcome.',
    'Hold still. It\'ll only hurt when they thaw.',
    'I built this in a weekend, Morty. Drunk.',
    'Ice to meet you. Ugh. I hate that I said that.',
    'Shoot the frozen ones, Morty. They shatter. It\'s the best part.',
  ],
};

export const SHARED_GADGETS: GadgetDef[] = [freezeRay];
