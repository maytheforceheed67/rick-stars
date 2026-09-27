/**
 * The acts of "Lawnmower Dog": the break-in, three dreams deep and back, two "Meanwhile" cutaways
 * with Jerry, and Snowball's world.
 */
import type { ActDef, BiomeDef, Weighted } from '../../../engine/types';
import { SMITH_DAY } from '../s01e01-pilot/acts';
import { SCHOOL_COMBAT } from '../s01e01-pilot/rooms';
import { LINES, RICK_ALONG_DREAMS, RICK_ALONG_PLANE, RICK_ALONG_SNOWBALL, RICK_ALONG_TERRY } from './dialogue';
import { DREAM_COMBAT, PLANE_COMBAT } from './rooms';
import { clubOpening, helmetScene, luxuryOpening, planeOpening, terrySchoolOpening } from './scenes';

const RICK = { gadget: 'freeze-ray', entrance: 'walk' } as const;
const w = (id: string, weight: number): Weighted => ({ id, weight });
/** Every dive between dreams and every wake-up uses the dream swirl. */
const DREAM = 'dream-swirl';

// ---- places ----------------------------------------------------------------------------------------

export const GOLDENFOLD_NIGHT: BiomeDef = {
  id: 'goldenfold-house-night',
  style: { walls: 'house', blocks: 'furniture', doors: 'house' },
  name: "Mr. Goldenfold's House",
  palette: {
    background: 0x0b0d1c,
    floor: 0x4a4f6e,
    floorAlt: 0x41455f,
    wall: 0x2e3350,
    wallTop: 0x3f4570,
    block: 0x5a4a3a,
    blockTop: 0x6f5b48,
    cliff: 0x333344,
    cliffShadow: 0x222233,
    slow: 0x5a7fbf,
    accent: 0xffd54a,
    door: 0x5a4a3a,
  },
  floorPattern: 'planks',
  music: 'dog-night',
};

export const PLANE_BIOME: BiomeDef = {
  id: 'goldenfold-dream-plane',
  style: { walls: 'cabin', blocks: 'seat', doors: 'plain' },
  name: "Goldenfold's Dream",
  palette: {
    background: 0x1c1440,
    floor: 0x6f7fb5,
    floorAlt: 0x6272a6,
    wall: 0xd9d2bf,
    wallTop: 0xefe8d6,
    block: 0x3f63b0,
    blockTop: 0x5b7fd0,
    cliff: 0x3b2f6b,
    cliffShadow: 0x221a44,
    slow: 0xbfe4ff,
    accent: 0xc58bff,
    door: 0x8c95a6,
  },
  floorPattern: 'speckle',
  music: 'dog-plane',
};

export const PANCAKES_CLUB: BiomeDef = {
  id: 'pancakes-dream-club',
  style: { walls: 'bricks', blocks: 'crate', doors: 'plain' },
  name: "Mrs. Pancakes' Dream",
  palette: {
    background: 0x12091f,
    floor: 0x3a2a4a,
    floorAlt: 0x33243f,
    wall: 0x5a2a4a,
    wallTop: 0x7a3a62,
    block: 0x2a1a3a,
    blockTop: 0x4a2a5c,
    cliff: 0x2a1a3a,
    cliffShadow: 0x12091f,
    slow: 0xff7ae3,
    accent: 0xff7ae3,
    door: 0x2a1a3a,
  },
  floorPattern: 'grid',
  music: 'dog-club',
};

export const CENTAUR_DREAM: BiomeDef = {
  id: 'centaur-dream',
  style: { walls: 'hills', blocks: 'hedge', doors: 'arch' },
  name: "The Centaur's Dream",
  palette: {
    background: 0x16261a,
    floor: 0xbfe4a0,
    floorAlt: 0xaed68f,
    wall: 0x6f9a5a,
    wallTop: 0x8fbf6f,
    block: 0x4f7a3a,
    blockTop: 0x6f9a4f,
    cliff: 0x4a6a3a,
    cliffShadow: 0x2a3a22,
    slow: 0xf2e28f,
    accent: 0xf2c14e,
    door: 0x5a4a2a,
  },
  floorPattern: 'blobs',
  music: 'dog-centaur',
};

export const GIRL_DREAM: BiomeDef = {
  id: 'little-girl-dream',
  style: { walls: 'hills', blocks: 'toy', doors: 'arch' },
  name: "The Little Girl's Dream",
  palette: {
    background: 0x261a2a,
    floor: 0xf8d8e8,
    floorAlt: 0xf0c8dc,
    wall: 0xb89cf0,
    wallTop: 0xd4c0ff,
    block: 0xe0484d,
    blockTop: 0xf2c14e,
    cliff: 0x8b5fbf,
    cliffShadow: 0x5a3a8a,
    slow: 0xbfe4ff,
    accent: 0xff7ae3,
    door: 0x8b5fbf,
  },
  floorPattern: 'checker',
  music: 'dog-girl',
};

export const TERRY_HOUSE: BiomeDef = {
  id: 'terry-house',
  style: { walls: 'house', blocks: 'furniture', doors: 'house' },
  name: "Scary Terry's House",
  palette: {
    background: 0x100808,
    floor: 0x4a2e2a,
    floorAlt: 0x3f2622,
    wall: 0x5a1f1f,
    wallTop: 0x7a2f2a,
    block: 0x3a2418,
    blockTop: 0x5a3a28,
    cliff: 0x2a1a1a,
    cliffShadow: 0x100808,
    slow: 0x8b2323,
    accent: 0xff4a3d,
    door: 0x3a2418,
  },
  floorPattern: 'planks',
  music: 'dog-terry',
};

export const TERRY_SCHOOL: BiomeDef = {
  id: 'terry-dream-school',
  style: { walls: 'lockers', blocks: 'desk', doors: 'classroom' },
  name: "Scary Terry's Dream",
  palette: {
    background: 0x140a14,
    floor: 0x5a6a6a,
    floorAlt: 0x4f5e5e,
    wall: 0x8b2323,
    wallTop: 0xa83a32,
    block: 0x6b4a2e,
    blockTop: 0x8a6440,
    cliff: 0x2a1a1a,
    cliffShadow: 0x140a14,
    slow: 0x7a9a3a,
    accent: 0xf2c14e,
    door: 0x4f5a2a,
  },
  floorPattern: 'checker',
  music: 'dog-terry-school',
};

export const DOG_STREETS: BiomeDef = {
  id: 'dog-patrol-streets',
  style: { walls: 'bricks', blocks: 'hedge', doors: 'plain' },
  name: 'The Dog-Patrolled Streets',
  palette: {
    background: 0x0a1018,
    floor: 0x3f4a5a,
    floorAlt: 0x37414f,
    wall: 0x2a3344,
    wallTop: 0x3a4658,
    block: 0x2f5a3a,
    blockTop: 0x3f7a4a,
    cliff: 0x222233,
    cliffShadow: 0x111118,
    slow: 0x5a7fbf,
    accent: 0xfff2a8,
    door: 0x2a3344,
  },
  floorPattern: 'grid',
  music: 'dog-patrol',
};

export const SNOWBALL_WORLD: BiomeDef = {
  id: 'snowball-world',
  style: { walls: 'house', blocks: 'hedge', doors: 'house' },
  name: "Snowball's World",
  palette: {
    background: 0x1a1024,
    floor: 0xd9c6f0,
    floorAlt: 0xcbb6e6,
    wall: 0x8b5fbf,
    wallTop: 0xf2c14e,
    block: 0x4f7a3a,
    blockTop: 0x6f9a4f,
    cliff: 0x5a3a8a,
    cliffShadow: 0x2a1a44,
    slow: 0xbfe4ff,
    accent: 0xf2c14e,
    door: 0xa8744e,
  },
  floorPattern: 'planks',
  music: 'dog-snowball',
};

// ---- the acts --------------------------------------------------------------------------------------

export const PROLOGUE: ActDef = {
  id: 'dog-prologue',
  name: 'Good Boy',
  subtitle: 'Prologue',
  playable: 'morty',
  biome: SMITH_DAY,
  layout: {
    kind: 'fixed',
    start: { x: 0, y: 0 },
    // The house and the garage; then, across town (a ship ride, not a door), Goldenfold's house.
    rooms: [
      { x: 0, y: 0, kind: 'start', template: 'dog-living-room', script: 'dog-living-room' },
      { x: 1, y: 0, kind: 'calm', template: 'dog-garage', script: 'dog-garage' },
      { x: 0, y: 2, kind: 'calm', template: 'dog-goldenfold-hall', script: 'dog-goldenfold-hall', biome: GOLDENFOLD_NIGHT },
      { x: 1, y: 2, kind: 'finale', template: 'dog-goldenfold-bedroom', biome: GOLDENFOLD_NIGHT },
    ],
    trips: [{ from: { x: 1, y: 0 }, to: { x: 0, y: 2 } }],
  },
  enemyPool: [],
  itemPool: [],
  eliteChance: 0,
  finale: [{ kind: 'encounter', encounter: 'dog-dream-dive' }],
  // A break-in, not a fight: Morty has nothing to fight with until he's in a dream.
  unarmed: true,
  rick: RICK,
  mechanics: ['creaky-floors'],
  // Snuffles gets the helmet, acted out in the living room.
  opening: helmetScene,
  travel: { by: 'portal', label: "Dive into Goldenfold's dream", art: DREAM },
};

export const PLANE: ActDef = {
  id: 'dog-plane',
  name: "Goldenfold's Dream",
  subtitle: 'Act 1',
  playable: 'morty',
  biome: PLANE_BIOME,
  layout: {
    kind: 'procedural',
    roomCount: [8, 11],
    templates: PLANE_COMBAT.map((t) => t.id),
    startTemplate: 'plane-start',
    treasureTemplate: 'plane-treasure',
    shopTemplate: 'plane-shop',
  },
  enemyPool: [w('dream-passenger', 3), w('flight-attendant', 2), w('dream-soldier', 3), w('snack-cart', 2), w('turbulence-cloud', 2), w('lost-luggage', 1)],
  itemPool: [
    w('in-flight-peanuts', 3),
    w('oxygen-mask', 3),
    w('first-class-pass', 3),
    w('grade-book', 1),
    w('bottled-turbulence', 2),
    w('snuffles-helmet', 1),
    w('helmet-batteries', 2),
    w('emergency-parachute', 1),
    w('dream-inceptor', 1),
    w('dream-cookies', 2),
    w('lucid-energy-drink', 2),
    w('freeze-ray-mod', 1),
    w('ricks-flask', 2),
    w('calculator', 1),
    w('travel-pillow', 1),
    w('mega-seed', 1),
    w('burp-canister', 1),
    w('junk-magnet', 1),
  ],
  eliteChance: 0.12,
  shop: { keeperArt: 'enemy-snack-cart', name: 'The Snack Cart', alwaysStocks: ['dream-cookies'] },
  specialRoom: 'dog-first-class',
  finale: [{ kind: 'boss', boss: 'dream-goldenfold', template: 'plane-boss' }],
  // Rick: in a dream you imagine your own gear. Morty pictures Rick's gun, more or less.
  weapon: { item: 'imagined-ray-gun', when: 'start', from: 'morty', line: LINES.morty.imagined },
  rick: { ...RICK, follows: RICK_ALONG_PLANE },
  mechanics: ['dream-control'],
  opening: planeOpening,
  arrive: { by: 'portal', art: DREAM },
  // Falling toward lava: they dive into the dream of Goldenfold's TV crush to slow time down.
  travel: { by: 'portal', label: "Dive into Mrs. Pancakes' dream", art: DREAM },
};

export const MEANWHILE_SNUFFLES: ActDef = {
  id: 'dog-meanwhile-snuffles',
  name: 'Meanwhile: Good Boy?',
  subtitle: 'Meanwhile',
  playable: 'jerry',
  biome: SMITH_DAY,
  layout: { kind: 'fixed', start: { x: 0, y: 0 }, rooms: [{ x: 0, y: 0, kind: 'finale', template: 'dog-jerry-living-room' }] },
  enemyPool: [],
  itemPool: [],
  eliteChance: 0,
  finale: [{ kind: 'encounter', encounter: 'dog-snuffles-smarter' }],
  unarmed: true,
  interlude: true,
  rick: RICK,
  mechanics: [],
  intro: ['dog-meanwhile-snuffles'],
};

export const DREAMS: ActDef = {
  id: 'dog-dreams',
  name: 'Dreams Within Dreams',
  subtitle: 'Act 2',
  playable: 'morty',
  biome: PANCAKES_CLUB,
  layout: {
    kind: 'procedural',
    roomCount: [8, 11],
    templates: DREAM_COMBAT.map((t) => t.id),
    startTemplate: 'dream-start',
    treasureTemplate: 'dream-treasure',
    shopTemplate: 'dream-shop',
    // Mrs. Pancakes' dream (seen from outside), then the centaur's, then the little girl's.
    regions: [CENTAUR_DREAM, GIRL_DREAM],
  },
  enemyPool: [w('counting-sheep', 3), w('windup-soldier', 3), w('teddy-bruiser', 2), w('jack-in-the-box', 2), w('tea-party-doll', 2), w('music-box', 1)],
  itemPool: [
    w('velvet-rope', 3),
    w('lucky-horseshoe', 3),
    w('nightmare-teddy', 1),
    w('tea-party-set', 3),
    w('sheep-plush', 3),
    w('jack-spring', 3),
    w('herd-of-sheep', 2),
    w('pancakes-autograph', 2),
    w('nightmare-fuel', 1),
    w('dream-inceptor', 1),
    w('snuffles-helmet', 1),
    w('dream-cookies', 2),
    w('lucid-energy-drink', 2),
    w('freeze-ray-mod', 1),
    w('neutrino-bomb', 1),
    w('ricks-flask', 2),
    w('broken-leg-serum', 1),
    w('mega-seed', 1),
    w('burp-canister', 1),
    w('junk-magnet', 1),
  ],
  eliteChance: 0.14,
  shop: { keeperArt: 'enemy-tea-party-doll', name: 'Tea Party Stand', alwaysStocks: ['lucid-energy-drink'] },
  specialRoom: 'dog-toy-chest',
  finale: [{ kind: 'encounter', encounter: 'dog-terry-chase', biome: TERRY_HOUSE }],
  // Deeper dream, weirder gear.
  weapon: { item: 'rubber-duck-launcher', when: 'start', from: 'morty', line: LINES.morty.rubberDuck },
  rick: { ...RICK, follows: RICK_ALONG_DREAMS },
  mechanics: ['scary-terry-hunt'],
  opening: clubOpening,
  arrive: { by: 'portal', art: DREAM },
  travel: { by: 'portal', label: "Dive into Terry's dream", art: DREAM },
};

export const TERRY_DREAM: ActDef = {
  id: 'dog-terry-dream',
  name: "Scary Terry's Dream",
  subtitle: 'Act 3',
  playable: 'morty',
  biome: TERRY_SCHOOL,
  layout: {
    kind: 'procedural',
    roomCount: [8, 11],
    // Terry dreams of a school, so the Pilot's school rooms come along.
    templates: SCHOOL_COMBAT.map((t) => t.id),
    startTemplate: 'school-start',
    treasureTemplate: 'school-treasure',
    shopTemplate: 'school-shop',
  },
  enemyPool: [
    w('mocking-kid', 4),
    w('failing-grade', 2),
    w('laughing-mouth', 2),
    w('pop-quiz', 3),
    w('pep-squad', 2),
    w('hall-monitor', 1),
    w('dodgeball-jock', 2),
    w('cafeteria-slop', 1),
  ],
  itemPool: [
    w('terrys-finger-blades', 1),
    w('terrys-hat', 3),
    w('striped-sweater', 3),
    w('spitball-straw', 3),
    w('gold-star', 3),
    w('snuffles-helmet', 1),
    w('dream-inceptor', 1),
    w('nightmare-fuel', 1),
    w('dream-cookies', 2),
    w('lucid-energy-drink', 2),
    w('dodgeball', 2),
    w('hall-pass', 2),
    w('calculator', 2),
    w('detention-slip', 1),
    w('answer-key', 1),
    w('pencil-sharpener', 2),
    w('mystery-meat', 2),
    w('mega-seed', 1),
    w('burp-canister', 1),
  ],
  eliteChance: 0.14,
  hazards: [w('burst-locker', 2), w('slop-spill', 1)],
  hazardChance: 0.45,
  shop: { keeperArt: 'vending-machine', name: 'Nightmare Vending Machine', alwaysStocks: ['dream-cookies'] },
  specialRoom: 'dog-terry-quiz',
  finale: [{ kind: 'encounter', encounter: 'dog-dream-climb' }],
  // Weirder still: a cat that shoots lasers out of its eyes.
  weapon: { item: 'laser-cat', when: 'start', from: 'morty', line: LINES.morty.laserCat },
  rick: { ...RICK, follows: RICK_ALONG_TERRY },
  mechanics: ['terry-confidence'],
  opening: terrySchoolOpening,
  arrive: { by: 'portal', art: DREAM },
  outro: ['dog-a-plus'],
  travel: { by: 'portal', label: 'Wake up', art: DREAM },
};

export const MEANWHILE_DOGS: ActDef = {
  id: 'dog-meanwhile-dogs',
  name: 'Meanwhile: Off the Leash',
  subtitle: 'Meanwhile',
  playable: 'jerry',
  biome: DOG_STREETS,
  layout: {
    kind: 'fixed',
    start: { x: 0, y: 0 },
    rooms: [
      { x: 0, y: 0, kind: 'calm', template: 'dog-street' },
      { x: 1, y: 0, kind: 'calm', template: 'dog-yard' },
      { x: 2, y: 0, kind: 'finale', template: 'dog-kennel-gate' },
    ],
  },
  enemyPool: [],
  itemPool: [],
  eliteChance: 0,
  finale: [{ kind: 'encounter', encounter: 'dog-jerry-captured' }],
  unarmed: true,
  interlude: true,
  rick: RICK,
  // The Pilot's Suspicion, with dogs.
  mechanics: ['dog-patrols'],
  intro: ['dog-meanwhile-dogs'],
};

export const EPILOGUE: ActDef = {
  id: 'dog-epilogue',
  name: 'Snowball',
  subtitle: 'Epilogue',
  playable: 'morty',
  biome: SNOWBALL_WORLD,
  layout: {
    kind: 'fixed',
    start: { x: 0, y: 0 },
    rooms: [
      { x: 0, y: 0, kind: 'start', template: 'dog-luxury-suite', script: 'dog-luxury-suite' },
      { x: 1, y: 0, kind: 'combat', template: 'dog-ruled-street' },
      { x: 2, y: 0, kind: 'combat', template: 'dog-ruled-park' },
      { x: 3, y: 0, kind: 'combat', template: 'dog-palace-hall' },
      { x: 4, y: 0, kind: 'finale', template: 'dog-throne-room' },
    ],
  },
  enemyPool: [w('helmet-pup', 3), w('dog-trooper', 3), w('robo-bulldog', 2), w('drool-mastiff', 2), w('medic-poodle', 2), w('kennel-master', 1)],
  itemPool: [w('dog-whistle', 2), w('dream-cookies', 2), w('lucid-energy-drink', 2)],
  eliteChance: 0.15,
  finale: [{ kind: 'boss', boss: 'snowball', template: 'dog-throne-room' }],
  // Rick smuggles Morty a tennis ball launcher. Dogs can't resist.
  weapon: { item: 'tennis-ball-launcher', when: 'start', from: 'rick', line: LINES.rick.tennisBalls },
  rick: { ...RICK, follows: RICK_ALONG_SNOWBALL },
  mechanics: [],
  intro: ['dog-snowball-world'],
  opening: luxuryOpening,
  outro: ['dog-goodbye'],
  // Snowball relents; Morty wakes up.
  travel: { by: 'portal', label: 'Wake up', art: DREAM },
};
