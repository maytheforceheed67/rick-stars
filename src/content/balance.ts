/**
 * The numbers that set difficulty and pacing: Morty's stats, enemy and boss HP and speed, the
 * Rick Meter, the economy and the Pilot's mechanics. Content files read these instead of
 * hard-coding them. Numbers that define a single item, status or attack pattern (a flask's
 * heal, a jock's throw speed) sit beside that content, so each file reads on its own.
 */
import type { StatBlock, StatLimits } from '../engine/effects/stats';

/** Morty's base stats before items and statuses. */
export const BASE_STATS: StatBlock = {
  maxHearts: 3,
  /** Damage per shot. */
  damage: 3.5,
  /** Shots per second. */
  fireRate: 3,
  shotSpeed: 620,
  /** Pixels a shot travels before fizzling. */
  range: 430,
  shotSize: 9,
  moveSpeed: 250,
  dashSpeed: 760,
  dashCooldown: 0.8,
  /** Invulnerability at the start of a dash, in seconds. */
  dashIframes: 0.25,
  dashDuration: 0.16,
  projectiles: 1,
  /** Total spread in radians when firing several projectiles. */
  spread: 0,
  bounces: 0,
  freezeChance: 0,
  poisonChance: 0,
  slowChance: 0,
  knockback: 110,
  rickMeterGain: 1,
  shopPriceMult: 1,
  /** Multiplies enemy wind-up time (never below the 0.4 s floor). */
  enemyWindupMult: 1,
  scrapBonus: 0,
  magnet: 0,
  /** Grappling shoe battery capacity multiplier (Pilot mechanic). */
  shoeBattery: 1,

  // Shot behaviors items switch on (0 = off). SHOTS below tunes how each one plays.
  /** Enemies a shot passes through before it stops. */
  pierce: 0,
  /** Radians per second a shot turns toward the nearest enemy. */
  homing: 0,
  /** Mini shots a shot bursts into when it hits something. */
  split: 0,
  /** Radius of the small explosion when a shot hits. */
  blast: 0,
  /** Enemies a hit's lightning jumps on to. */
  chain: 0,
  /** Pieces of junk circling Morty that bonk enemies and block bullets. */
  orbit: 0,
  /** Seconds without firing that charge the next shot into a big one. */
  chargeShot: 0,
  /** Share of volleys that are critical hits (0.2 = every 5th). */
  critRate: 0,
  /** Share of volleys that are freeze bolts (0.25 = every 4th). */
  freezeRate: 0,
  /** Times a shot bounces off an enemy toward the next one. */
  ricochet: 0,
  /** Radius around Morty in which a dash erases enemy bullets. */
  dashEraseShots: 0,
  /** Chance an enemy bullet or hit simply misses him. */
  dodgeChance: 0,
  /** Multiplies how often companions attack. */
  companionRate: 1,
};

export const STAT_LIMITS: StatLimits = {
  maxHearts: [1, 12],
  damage: [0.5, 99],
  fireRate: [0.75, 12],
  shotSpeed: [250, 1400],
  range: [120, 1200],
  shotSize: [3, 20],
  moveSpeed: [90, 480],
  dashCooldown: [0.25, 3],
  dashIframes: [0, 0.8],
  projectiles: [1, 8],
  spread: [0, 1.6],
  bounces: [0, 5],
  freezeChance: [0, 0.9],
  poisonChance: [0, 1],
  slowChance: [0, 1],
  rickMeterGain: [0.2, 5],
  shopPriceMult: [0.3, 3],
  enemyWindupMult: [1, 2.5],
  shoeBattery: [0.5, 4],
  pierce: [0, 6],
  homing: [0, 12],
  split: [0, 8],
  blast: [0, 180],
  chain: [0, 6],
  orbit: [0, 6],
  chargeShot: [0, 3],
  critRate: [0, 1],
  freezeRate: [0, 1],
  ricochet: [0, 4],
  dashEraseShots: [0, 200],
  dodgeChance: [0, 0.6],
  companionRate: [0.5, 4],
};

/** How the shot behaviors in BASE_STATS play out. */
export const SHOTS = {
  /** Damage multiplier of a critical hit. */
  critMult: 3,
  /** Seconds a freeze bolt freezes what it hits. */
  freezeSeconds: 2.5,
  /** Damage share and life of split mini shots, and the fan they spread over (radians). */
  splitDamage: 0.4,
  splitLife: 0.4,
  splitFan: 1.1,
  /** Damage share of a shot's blast on everything else nearby. */
  blastDamage: 0.5,
  /** Damage share, reach (px) and look of chain lightning. */
  chainDamage: 0.5,
  chainRange: 170,
  chainColor: 0x9fe8ff,
  /** How far a ricochet looks for its next target. */
  ricochetRange: 320,
  /** How far homing shots look for a target, and the cone (radians either side) they look in. */
  homingRange: 420,
  homingCone: 1.9,
  /** Orbiting junk: circle radius, turn speed, damage share and per-enemy hit cooldown. */
  orbitRadius: 72,
  orbitSpeed: 3.2,
  orbitDamage: 0.6,
  orbitCooldown: 0.5,
  /** A charged shot's damage and size multipliers and the enemies it passes through. */
  chargeMult: 3,
  chargeSize: 1.9,
  chargePierce: 2,
};

/**
 * The rules every item follows (tests/items.test.ts). Plain stat changes have to be felt: none
 * under 20%, and an item that is only stats needs one change of 25% or more, or a whole heart.
 */
export const ITEM_RULES = {
  minStatChange: 0.2,
  bigStatChange: 0.25,
  bigHearts: 1,
  /**
   * Stats that switch on a behavior rather than bumping a number; they count as 'shots' (or
   * 'on-dash' and so on), not as plain stats.
   */
  behaviorStats: [
    'pierce', 'homing', 'split', 'blast', 'chain', 'orbit', 'chargeShot', 'critRate', 'freezeRate', 'ricochet',
    'bounces', 'projectiles', 'spread', 'freezeChance', 'poisonChance', 'slowChance', 'dashEraseShots', 'dodgeChance', 'companionRate',
    // Scrap flying to Morty, and extra Scrap per pickup: they start at zero, so they switch a thing on.
    'magnet', 'scrapBonus',
  ],
};

export const PLAYER = {
  /** Seconds of invulnerability after taking a hit. */
  hurtIframes: 1.0,
  bodyRadius: 13,
  sneakSpeedMult: 0.45,
  slowTileMult: 0.6,
  /** Seconds a fall takes before Morty reappears. */
  fallTime: 0.65,
  /** Half hearts lost to a fall. */
  fallDamage: 1,
  /** Dashing through an attack this soon after the dash starts is a perfect dodge. */
  perfectDodgeWindow: 0.15,
  /** A perfect dodge slows time to this speed for this many real seconds. */
  perfectDodgeSlowMo: { factor: 0.3, seconds: 0.4 },
};

export const ENEMIES = {
  /** Seconds before a spawned enemy starts acting. */
  spawnDelay: 0.6,
  /** Minimum wind-up for any telegraphed attack. */
  minWindup: 0.4,
  /** Frozen enemies shatter on the next hit; bosses instead take this multiplier and thaw. */
  bossShatterMult: 2.5,
  bossFreezeMult: 0.5,
  /**
   * Hits from the act's story weapon (at base stats) it takes to bring an enemy down. Tests hold
   * every enemy an act can field to these bands, elites included (see actEnemies()).
   */
  hitsToKill: { regular: [2, 4] as [number, number], elite: [5, 8] as [number, number] },
  /**
   * How long a boss fight should last with the act's weapon, assuming Morty lands `hitRate` of his
   * shots at his base fire rate (the rest of the time he's dodging). Tests check every boss.
   */
  bossFight: { seconds: [60, 90] as [number, number], hitRate: 0.5 },
  /** Chance a regular enemy drops Scrap. */
  scrapChance: 0.35,
  /** Speed multiplier from a support enemy's haste buff. */
  hasteBuff: 1.3,
  /** Staggered enemies (after a big attack) take this much more damage. */
  staggerMult: 1.5,
  /** A shattering frozen enemy shatters frozen enemies this close to it. */
  shatterChainRadius: 110,
  /** Elite modifiers. */
  elite: {
    shieldHits: 3,
    hasteMult: 1.35,
    /** Each of the two halves of a splitting elite gets this share of its max HP. */
    splitHpShare: 0.4,
    explosionRadius: 95,
    explosionDelay: 0.7,
  },
  eliteScrap: [2, 3] as [number, number],
};

/** How combat rooms play out. */
export const ROOMS = {
  /** Seconds a spawn warning shows before the enemy appears. */
  spawnWarning: 0.75,
  /** Enemies never appear closer than this many tiles to Morty. */
  safeSpawnTiles: 3,
  /** Fade-in after a warned spawn (the warning already gave notice). */
  warnedSpawnDelay: 0.3,
  /** The next wave comes when this many enemies (or fewer) are left. */
  nextWaveAt: 1,
  /** Default chance a combat room is an ambush (acts can override). */
  ambushChance: 0.16,
  /** Tiles Morty walks into an ambush room before it springs. */
  ambushTrigger: 2.4,
};

export const RICK_METER = {
  /** Damage needed to fill the meter. */
  max: 140,
  freezeSeconds: 4,
  /** Meter gained from a perfect dodge. */
  perfectDodge: 18,
};

export const ECONOMY = {
  /** Chance that clearing a combat room leaves a reward. */
  roomRewardChance: 0.55,
  /** Share of unspent Scrap banked on death (all of it on a clear). */
  bankOnDeath: 0.5,
  prices: {
    heartHalf: 3,
    heartFull: 5,
    consumable: 6,
    common: 14,
    rare: 22,
  },
  /** Undetected customs rooms pay this much Scrap each. */
  undetectedRoomBonus: 3,
  /** Scrap for each right answer in the epilogue quiz. */
  quizBonus: 5,
};

export const PILOT = {
  sleepDeprivedFireRateMult: 0.85,
  failingGradeDamageMult: 0.9,
  quiz: { questions: 3, secondsEach: 8 },
  shoes: {
    /** Battery drain and recharge per second, out of 100. */
    drain: 11,
    recharge: 22,
    padRecharge: 45,
  },
  brokenLegs: { speedMult: 0.5, rooms: 2 },
  suspicion: {
    scanner: 18,
    runNearAgent: 9,
    sneakNearAgent: 2,
    dash: 22,
    fire: 14,
    decay: 4,
    agentRadius: 175,
  },
  bigMegaTree: { fruit: 3, waveEvery: 7.5, maxEnemies: 9 },
  /** Room hazards. */
  hazards: {
    locker: { range: 340, windup: 0.8, cooldown: [3.2, 4.8] as [number, number] },
    slop: { slow: 0.6, windup: 0.8, every: [4, 6.5] as [number, number] },
    ledge: { windup: 0.55, regrow: 4 },
    scanner: { windup: 0.9, arc: 0.75, length: 440, sweep: 1.1, cooldown: [2.4, 3.6] as [number, number] },
  },
  escape: { seconds: 40, spawnEvery: 1.3, lockdownSpawnEvery: 0.6 },
  bombDefuse: { seconds: 35, wrongPenalty: 6 },
  /** Base HP and move speed (px/s) of the Pilot's regular enemies. */
  enemies: {
    // School (tuned against dodgeballs)
    'pop-quiz': { hp: 7, speed: 150 },
    'hall-monitor': { hp: 12, speed: 95 },
    'dodgeball-jock': { hp: 10, speed: 110 },
    'cafeteria-slop': { hp: 13, speed: 70 },
    'slop-blob': { hp: 6, speed: 115 },
    'junk-drone': { hp: 7, speed: 45 },
    'pep-squad': { hp: 9, speed: 105 },
    'lab-partner': { hp: 10, speed: 90 },
    // Dimension 35-C (Rick's spare ray gun)
    'gloop-hopper': { hp: 11, speed: 90 },
    'fruit-snatcher': { hp: 9, speed: 165 },
    'bonk-bloat': { hp: 14, speed: 70 },
    'puff-polyp': { hp: 11, speed: 0 },
    'bloom-tender': { hp: 10, speed: 70 },
    'brood-mound': { hp: 14, speed: 0 },
    miteling: { hp: 5, speed: 150 },
    'goo-slug': { hp: 12, speed: 55 },
    // Customs (Rick's own ray gun)
    'gromflomite-clerk': { hp: 13, speed: 100 },
    'gromflomite-guard': { hp: 14, speed: 120 },
    'gromflomite-riot': { hp: 17, speed: 80 },
    'gromflomite-sniper': { hp: 10, speed: 90 },
    'gromflomite-courier': { hp: 10, speed: 175 },
    'gromflomite-notary': { hp: 12, speed: 90 },
    'gromflomite-dispatcher': { hp: 14, speed: 85 },
  },
  /** Support and summoner behavior. */
  support: {
    cheer: { every: [3.5, 4.5] as [number, number], radius: 210, haste: 4, heal: 3 },
    pollen: { every: 4, radius: 170, healShare: 0.3 },
    notary: { every: 3.6, radius: 280, shieldHits: 2 },
    brood: { every: 2.4, max: 3 },
    dispatch: { every: 5, max: 2 },
  },
  /** Bosses: HP for a 60-90 second fight without items, and where each phase starts. */
  frank: { hp: 420, speed: 115, phases: [0.66, 0.33], wallStagger: 1.4, flurryStagger: 0.8 },
  supervisor: { hp: 560, speed: 90, phases: [0.66, 0.33], slamStagger: 1.2 },
};

/**
 * S01E02 "Lawnmower Dog". Enemy HP is tuned against each act's dreamed-up weapon: the Imagined
 * Ray Gun (Goldenfold's dream), the Rubber Duck Launcher (dreams within dreams), Laser Cat
 * (Terry's school, where the Pilot's school enemies come along) and the Tennis Ball Launcher
 * (Snowball's world).
 */
export const LAWNMOWER_DOG = {
  enemies: {
    // Goldenfold's dream: the plane
    'dream-passenger': { hp: 9, speed: 125 },
    'flight-attendant': { hp: 10, speed: 95 },
    'dream-soldier': { hp: 12, speed: 105 },
    'snack-cart': { hp: 15, speed: 80 },
    'turbulence-cloud': { hp: 10, speed: 60 },
    'lost-luggage': { hp: 13, speed: 40 },
    'carry-on': { hp: 5, speed: 150 },
    'dream-machine-gun': { hp: 8, speed: 0 },
    // Dreams within dreams
    'counting-sheep': { hp: 10, speed: 95 },
    'windup-soldier': { hp: 11, speed: 90 },
    'teddy-bruiser': { hp: 17, speed: 70 },
    'jack-in-the-box': { hp: 12, speed: 0 },
    'tea-party-doll': { hp: 10, speed: 85 },
    'music-box': { hp: 14, speed: 0 },
    'twirl-dancer': { hp: 5, speed: 160 },
    // Terry's dream school
    'mocking-kid': { hp: 9, speed: 100 },
    'failing-grade': { hp: 15, speed: 65 },
    'laughing-mouth': { hp: 11, speed: 70 },
    // Snowball's world
    'helmet-pup': { hp: 8, speed: 150 },
    'dog-trooper': { hp: 13, speed: 100 },
    'robo-bulldog': { hp: 17, speed: 75 },
    'drool-mastiff': { hp: 14, speed: 70 },
    'medic-poodle': { hp: 11, speed: 90 },
    'kennel-master': { hp: 14, speed: 80 },
    // Interludes: Snuffles dodging Jerry
    'snuffles-dodger': { hp: 50, speed: 150 },
  },
  support: {
    /** Flight attendants: "please remain seated" hastes and patches up the passengers. */
    service: { every: [3.5, 4.5] as [number, number], radius: 220, haste: 3.5, heal: 3 },
    /** Tea party dolls pour a healing cup for the toys around them. */
    tea: { every: 4, radius: 180, healShare: 0.3 },
    /** Medic poodles toss biscuits that heal and shield. */
    biscuit: { every: 4, radius: 240, shieldHits: 1, heal: 3 },
    luggage: { every: 2.6, max: 3 },
    musicBox: { every: 2.4, max: 3 },
    kennel: { every: 4.5, max: 3 },
  },
  /** Goldenfold's dream control (Act 1): every few seconds of a fight, the dream shifts. */
  dreamControl: { every: [9, 13] as [number, number], tiltSeconds: 3.2, tiltPush: 150, tiltAngle: 0.07, wallSpeed: 170, guns: 2 },
  /**
   * Scary Terry (Act 2) steps into Morty's room `delay` seconds after he does, or `followDelay`
   * after Morty runs from a room Terry was in. Diving into another dreamer's dream (a sleeper
   * prop, or crossing into the next dream) buys `afterDive` seconds.
   */
  terry: { delay: 8, followDelay: 3.5, afterDive: 26, firstArrival: 4, speed: 150, staggerHits: 6, staggerSeconds: 1.8, dreamerChance: 0.5 },
  /** Little Terry's confidence (Act 3), out of 100. */
  confidence: { start: 30, perRoom: 12, perAnswer: 10, mockHit: 5, mockEvery: 3.2, mockRadius: 260, pepTalkAt: 70 },
  /** Goldenfold's floorboards (the prologue): noise from each creak and how fast it fades. */
  creak: { board: 38, walking: 7, decay: 14, radius: 30 },
  /** The chase into Terry's house (Act 2 finale). */
  chase: { seconds: 45, spawnEvery: 2.2, maxEnemies: 8 },
  /** The climb back up through the dreams (Act 3 finale). */
  climb: { waves: 4, waveSize: [3, 4] as [number, number], maxEnemies: 9 },
  /** Snuffles getting smarter: how many times Jerry has to catch him. */
  jerryCatches: 3,
  /** Bosses: HP for a 60-90 second fight with the act's weapon, and where each phase starts. */
  goldenfold: { hp: 480, speed: 100, phases: [0.66, 0.33], hailStagger: 1.3, guns: 2 },
  snowball: { hp: 460, speed: 95, phases: [0.66, 0.33], chargeStagger: 1.2, pups: 2 },
};
