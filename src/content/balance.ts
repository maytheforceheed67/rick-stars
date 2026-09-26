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
  shotSize: 7,
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
};

export const ENEMIES = {
  /** Seconds before a spawned enemy starts acting. */
  spawnDelay: 0.6,
  /** Minimum wind-up for any telegraphed attack. */
  minWindup: 0.4,
  /** Frozen enemies shatter on the next hit; bosses instead take this multiplier and thaw. */
  bossShatterMult: 2.5,
  bossFreezeMult: 0.5,
  /** HP bands from the design brief. Tests hold every enemy to these; elites multiply regular HP. */
  regularHp: [8, 15] as [number, number],
  bossHp: [180, 300] as [number, number],
  /** Chance a regular enemy drops Scrap. */
  scrapChance: 0.35,
  eliteScrap: [2, 3] as [number, number],
};

export const RICK_METER = {
  /** Damage needed to fill the meter. */
  max: 140,
  freezeSeconds: 4,
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
  escape: { seconds: 40, spawnEvery: 1.3, lockdownSpawnEvery: 0.6 },
  bombDefuse: { seconds: 35, wrongPenalty: 6 },
  /** Base HP and move speed (px/s) of the Pilot's regular enemies. */
  enemies: {
    'pop-quiz': { hp: 8, speed: 150 },
    'hall-monitor': { hp: 13, speed: 95 },
    'dodgeball-jock': { hp: 12, speed: 110 },
    'cafeteria-slop': { hp: 14, speed: 70 },
    'slop-blob': { hp: 8, speed: 115 },
    'junk-drone': { hp: 8, speed: 45 },
    'gloop-hopper': { hp: 12, speed: 90 },
    'fruit-snatcher': { hp: 10, speed: 165 },
    'bonk-bloat': { hp: 15, speed: 70 },
    'puff-polyp': { hp: 12, speed: 0 },
    'gromflomite-clerk': { hp: 11, speed: 100 },
    'gromflomite-guard': { hp: 13, speed: 120 },
    'gromflomite-riot': { hp: 15, speed: 80 },
    'gromflomite-sniper': { hp: 9, speed: 90 },
  },
  frank: { hp: 230, speed: 115 },
  supervisor: { hp: 300, speed: 90 },
};
