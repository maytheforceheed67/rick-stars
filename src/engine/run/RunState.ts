/**
 * Everything about one run that isn't on-screen objects: which act we're in, the floor and each
 * room's state, what Morty carries, his health, Scrap and the run's statistics.
 */
import type { Floor } from '../dungeon/generate';
import { Inventory } from '../effects/inventory';
import { StatusManager } from '../effects/status';
import type { Registry } from '../registry';
import { Rng } from '../rng';
import type { ActDef, ContentId, EpisodeDef, RoomKind } from '../types';

export interface PickupState {
  id: ContentId;
  x: number;
  y: number;
}

export interface PedestalState {
  /** An item, or a pickup sold in a shop. */
  itemId?: ContentId;
  pickupId?: ContentId;
  x: number;
  y: number;
  price?: number;
  group?: string;
  /** Remaining charge of a dropped active item. */
  charge?: number;
}

export interface RoomState {
  kind: RoomKind;
  visited: boolean;
  /** Shown on the minimap (visited or next to a visited room). */
  seen: boolean;
  cleared: boolean;
  /** Treasure/shop wares have been rolled. */
  stocked: boolean;
  pickups: PickupState[];
  pedestals: PedestalState[];
  data: Record<string, unknown>;
}

export interface RunStats {
  kills: number;
  roomsCleared: number;
  damageTaken: number;
  itemsFound: ContentId[];
  scrapEarned: number;
  perfectDodges: number;
}

export class RunState {
  readonly rng: Rng;
  /** Gameplay randomness (drops, procs). Floors use their own forks so they never drift. */
  readonly play: Rng;
  readonly sequence: ActDef[];
  actIndex = 0;
  floor: Floor | null = null;
  rooms: RoomState[] = [];
  currentRoom = -1;
  /** Finale stage the player is in (-1 = not in the finale). */
  stage = -1;
  readonly inventory: Inventory;
  readonly statuses: StatusManager;
  hp: number;
  scrap = 0;
  rickMeter = 0;
  time = 0;
  readonly flags: Record<string, unknown> = {};
  /** Items that have been offered this run (so they don't show up twice). */
  readonly offered = new Set<ContentId>();
  lastDamageSource = '';
  readonly stats: RunStats = { kills: 0, roomsCleared: 0, damageTaken: 0, itemsFound: [], scrapEarned: 0, perfectDodges: 0 };

  constructor(
    reg: Registry,
    readonly episode: EpisodeDef,
    readonly seed: string,
    opts: { skipPrologue: boolean; startHp: number },
  ) {
    this.rng = new Rng(`${episode.id}:${seed}`);
    this.play = this.rng.fork('play');
    this.sequence = [
      ...(episode.prologue && !opts.skipPrologue ? [episode.prologue] : []),
      ...episode.acts,
      ...(episode.epilogue ? [episode.epilogue] : []),
    ];
    this.inventory = new Inventory();
    this.statuses = new StatusManager((id) => reg.statuses.get(id));
    this.hp = opts.startHp;
  }

  get act(): ActDef {
    return this.sequence[this.actIndex];
  }

  get isLastAct(): boolean {
    return this.actIndex >= this.sequence.length - 1;
  }

  room(id = this.currentRoom): RoomState {
    return this.rooms[id];
  }
}

export function freshRoomState(kind: RoomKind): RoomState {
  // Only rooms with something to beat start uncleared.
  const cleared = !(kind === 'combat' || kind === 'finale' || kind === 'special');
  return { kind, visited: false, seen: false, cleared, stocked: false, pickups: [], pedestals: [], data: {} };
}
