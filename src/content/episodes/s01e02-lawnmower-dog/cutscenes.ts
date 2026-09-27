/**
 * Comic-panel recaps for "Lawnmower Dog": the "Meanwhile" cutaways, the A on the report card and
 * the goodbye. The big beats are acted out in the room instead (scenes.ts). All lines original.
 */
import type { CutsceneDef, CutscenePanel } from '../../../engine/types';

const cs = (id: string, panels: CutscenePanel[], title?: string): CutsceneDef => ({ id, title, firstAppears: 'S01E02', canon: true, panels });

export const DOG_CUTSCENES: CutsceneDef[] = [
  cs('dog-meanwhile-snuffles', [
    { backdrop: 'living-room', text: 'Meanwhile, back at the Smith house...', caption: true },
    { backdrop: 'living-room', speaker: 'snuffles', expression: 'smart', text: '*click* ...*whirr* ...*click click*' },
    { backdrop: 'living-room', text: 'Snuffles has found the spare batteries. All of them.', caption: true },
  ], 'Meanwhile'),
  cs('dog-a-plus', [
    { backdrop: 'classroom', text: 'The next morning. Math class.', caption: true },
    { backdrop: 'classroom', speaker: 'goldenfold', expression: 'normal', text: 'Morty Smith... an A. I have no idea why, but I feel VERY strongly about it.' },
    { backdrop: 'classroom', speaker: 'morty', expression: 'happy', text: 'Thanks, Mr. Goldenfold!' },
  ]),
  cs('dog-meanwhile-dogs', [
    { backdrop: 'dog-world', text: 'Meanwhile, the dogs have made their move.', caption: true, sfx: 'alarm' },
    { backdrop: 'dog-world', speaker: 'snowball', expression: 'angry', text: 'Dogs of Earth! No more leashes. No more "sit." No more "good boy."' },
    { backdrop: 'dog-world', speaker: 'jerry', expression: 'scared', text: 'Beth! The dogs have LASERS!' },
    { backdrop: 'dog-world', text: 'Jerry has a plan. It is not a good plan.', caption: true },
  ], 'Meanwhile'),
  cs('dog-snowball-world', [
    { backdrop: 'dog-world', text: 'Some time later. A long time. It feels like a year.', caption: true },
    { backdrop: 'dog-world', text: 'Dogs rule the Earth. Humans fetch.', caption: true },
    { backdrop: 'dog-world', speaker: 'snowball', expression: 'happy', text: 'Morty is my favorite. Morty gets the good bed.' },
  ], 'Epilogue'),
  cs('dog-goodbye', [
    { backdrop: 'dog-portal-yard', text: 'The real world. The backyard. A portal.', caption: true, sfx: 'portal' },
    { backdrop: 'dog-portal-yard', speaker: 'snowball', expression: 'normal', text: 'We go now. A world of our own. No leashes.' },
    { backdrop: 'dog-portal-yard', speaker: 'morty', expression: 'sad', text: 'Bye, Snuffles. I mean... bye, Snowball.' },
    { backdrop: 'dog-portal-yard', speaker: 'jerry', expression: 'normal', text: "So... who's walking the dog now?" },
    { backdrop: 'dog-portal-yard', speaker: 'rick', expression: 'normal', text: "Nobody, Jerry. That's the —*urrp*— whole point." },
  ]),
];
