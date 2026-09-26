/** Status effects from the Pilot. */
import { blob, dot, heart, INK, stroke, wonkyPoly, wonkyRect } from '../../../engine/art/draw';
import type { StatusDef } from '../../../engine/types';
import { PILOT } from '../../balance';
import { displayGlyph } from './icons';

export const PILOT_STATUSES: StatusDef[] = [
  {
    id: 'sleep-deprived',
    name: 'Sleep-Deprived',
    description: `Rick kept Morty up all night. ${Math.round((1 - PILOT.sleepDeprivedFireRateMult) * 100)}% slower fire rate for 3 rooms.`,
    firstAppears: 'S01E01',
    canon: true,
    positive: false,
    duration: { kind: 'rooms', value: 3 },
    endsWithAct: true,
    stats: { mult: { fireRate: PILOT.sleepDeprivedFireRateMult } },
    icon: (g) => {
      displayGlyph(g, 'z', 10, 20, 12, 0x8ec5de);
      displayGlyph(g, 'Z', 20, 12, 16, 0x8ec5de);
    },
  },
  {
    id: 'failing-grade',
    name: 'Failing Grade',
    description: '-10% damage for the rest of the act. See Mr. Goldenfold after class.',
    firstAppears: 'S01E01',
    canon: false,
    positive: false,
    duration: { kind: 'act' },
    stats: { mult: { damage: PILOT.failingGradeDamageMult } },
    icon: (g) => {
      wonkyRect(g, 5, 3, 22, 26, { fill: 0xffffff, seed: 1, radius: 2, lineWidth: 2 });
      displayGlyph(g, 'F', 16, 16, 18, 0xe0484d);
    },
  },
  {
    id: 'broken-legs',
    name: 'Broken Legs',
    description: 'Half speed, no dashing. Broken Leg Serum fixes it, or it heals after 2 rooms.',
    firstAppears: 'S01E01',
    canon: true,
    positive: false,
    duration: { kind: 'rooms', value: PILOT.brokenLegs.rooms },
    stats: { mult: { moveSpeed: PILOT.brokenLegs.speedMult } },
    flags: { noDash: true },
    icon: (g) => {
      wonkyRect(g, 10, 3, 12, 26, { fill: 0xf4efe6, seed: 2, radius: 4, lineWidth: 2 });
      stroke(g, [[10, 12], [22, 16]], 0xe0484d, 2);
      stroke(g, [[10, 20], [22, 24]], 0xe0484d, 2);
    },
  },
  {
    id: 'genius',
    name: 'Genius',
    description: 'Mega Seed brain: +40% damage, Rick Meter fills 50% faster. Side effects incoming.',
    firstAppears: 'S01E01',
    canon: true,
    positive: true,
    duration: { kind: 'seconds', value: 20 },
    stats: { mult: { damage: 1.4, rickMeterGain: 1.5 } },
    thenApply: 'side-effects',
    icon: (g) => {
      blob(g, 16, 16, 12, 10, { fill: 0xf2a6c0, seed: 3, wobble: 0.12, lineWidth: 2 });
      stroke(g, [[10, 14], [14, 12], [18, 16], [22, 13]], 0xc2607f, 2);
      dot(g, 26, 5, 3, 0xffe27a);
    },
  },
  {
    id: 'side-effects',
    name: 'Side Effects',
    description: "The Mega Seed wears off. Wobbly legs, no dashing. It'll pass. Probably.",
    firstAppears: 'S01E01',
    canon: true,
    positive: false,
    duration: { kind: 'seconds', value: 6 },
    flags: { wobblyMove: true, noDash: true },
    icon: (g) => {
      g.lineStyle(2.5, 0xb07cf0, 1);
      g.beginPath();
      for (let i = 0; i < 40; i++) {
        const a = i * 0.45;
        const r = 1 + i * 0.3;
        const x = 16 + Math.cos(a) * r;
        const y = 16 + Math.sin(a) * r;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.strokePath();
    },
  },
  {
    id: 'drunk',
    name: 'Drunk',
    description: 'Wobbly aim, +20% damage. Just like Rick.',
    firstAppears: 'S01E01',
    canon: true,
    positive: true,
    duration: { kind: 'seconds', value: 5 },
    stats: { mult: { damage: 1.2 } },
    flags: { wobblyAim: true },
    icon: (g) => {
      wonkyRect(g, 9, 6, 14, 22, { fill: 0xb8bdd4, seed: 4, radius: 4, lineWidth: 2 });
      wonkyRect(g, 12, 2, 8, 6, { fill: 0x8a8699, seed: 5, radius: 1, lineWidth: 2 });
      dot(g, 25, 8, 2.5, 0x97ce4c);
    },
  },
  {
    id: 'stamped',
    name: 'Stamped',
    description: 'Buried in paperwork. 30% slower for 2 seconds.',
    firstAppears: 'S01E01',
    canon: false,
    positive: false,
    duration: { kind: 'seconds', value: 2 },
    stats: { mult: { moveSpeed: 0.7 } },
    icon: (g) => {
      wonkyRect(g, 5, 5, 22, 22, { fill: 0xf4efe6, seed: 6, radius: 2, lineWidth: 2 });
      g.lineStyle(3, 0xd92f3a, 1);
      g.strokeCircle(16, 16, 7);
      g.lineBetween(11, 21, 21, 11);
    },
  },
  {
    id: 'motor-failure',
    name: 'Motor Failure',
    description: 'The last of the Mega Seed side effects. Controls wobble and fail.',
    firstAppears: 'S01E01',
    canon: true,
    positive: false,
    duration: { kind: 'seconds', value: 8 },
    flags: { wobblyMove: true, scrambled: true, noDash: true },
    icon: (g) => {
      heart(g, 16, 16, 22, 0xb07cf0);
      wonkyPoly(g, [[16, 6], [12, 16], [18, 16], [14, 26]], { fill: 0xffe27a, outline: INK, seed: 7, lineWidth: 1.5 });
    },
  },
];
