/**
 * Isaac-style floor generation. Rooms grow outward from the start room on a grid; a new room is
 * only placed where it would touch exactly one existing room, so the floor is a tree and doors
 * are simply "adjacent rooms". Dead ends become the special rooms, and the deepest dead end is
 * the finale.
 */
import { FLOOR_GRID } from '../constants';
import type { Rng } from '../rng';
import type { BiomeDef, ContentId, FixedLayout, RoomKind } from '../types';
import { DIRS, DIR_VEC, type Dir } from './templates';

export interface FloorRoom {
  id: number;
  x: number;
  y: number;
  kind: RoomKind;
  template: ContentId;
  specialId?: ContentId;
  /** Script for fixed-layout rooms. */
  script?: ContentId;
  /** Fixed-layout rooms that look like somewhere else than the rest of the act. */
  biome?: BiomeDef;
  /** Rooms between this one and the start room. */
  depth: number;
  /** Position in the calm prefix chain, if part of it. */
  prefixIndex?: number;
  lastPrefix?: boolean;
  neighbors: Partial<Record<Dir, number>>;
}

export interface Floor {
  rooms: FloorRoom[];
  startId: number;
  finaleId: number | null;
  gridW: number;
  gridH: number;
}

export interface FloorConfig {
  /** Rooms grown by branching, not counting the start room or the calm prefix. */
  roomCount: [number, number];
  templates: ContentId[];
  startTemplate: ContentId;
  treasureTemplate: ContentId;
  shopTemplate: ContentId;
  special?: { id: ContentId; templates: ContentId[] };
  finaleTemplate: ContentId;
  calmPrefix?: { count: [number, number]; templates: ContentId[]; lastTemplate: ContentId };
}

interface Cell {
  x: number;
  y: number;
  depth: number;
  prefixIndex?: number;
}

const MAX_ATTEMPTS = 500;

export function generateFloor(cfg: FloorConfig, rng: Rng): Floor {
  if (cfg.templates.length === 0) throw new Error('generateFloor needs at least one combat template');
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const floor = tryGenerate(cfg, rng);
    if (floor) return floor;
  }
  throw new Error(`Floor generation failed after ${MAX_ATTEMPTS} attempts`);
}

function tryGenerate(cfg: FloorConfig, rng: Rng): Floor | null {
  const size = FLOOR_GRID;
  const cells = new Map<string, Cell>();
  const key = (x: number, y: number) => `${x},${y}`;
  const occupied = (x: number, y: number) => cells.has(key(x, y));
  const inBounds = (x: number, y: number) => x >= 1 && y >= 1 && x < size - 1 && y < size - 1;
  const occupiedNeighbors = (x: number, y: number) =>
    DIRS.filter((d) => occupied(x + DIR_VEC[d].dx, y + DIR_VEC[d].dy)).length;
  const add = (c: Cell) => cells.set(key(c.x, c.y), c);

  const start: Cell = { x: Math.floor(size / 2), y: Math.floor(size / 2), depth: 0 };
  add(start);
  let root = start;

  // A winding chain of calm rooms; the branching part only grows from its last room.
  let prefixCount = 0;
  if (cfg.calmPrefix) {
    prefixCount = rng.int(cfg.calmPrefix.count[0], cfg.calmPrefix.count[1]);
    let cur = start;
    for (let i = 0; i < prefixCount; i++) {
      const options = rng.shuffle([...DIRS]).filter((d) => {
        const nx = cur.x + DIR_VEC[d].dx;
        const ny = cur.y + DIR_VEC[d].dy;
        return inBounds(nx, ny) && !occupied(nx, ny) && occupiedNeighbors(nx, ny) === 1;
      });
      if (options.length === 0) return null;
      const d = options[0];
      const next: Cell = { x: cur.x + DIR_VEC[d].dx, y: cur.y + DIR_VEC[d].dy, depth: cur.depth + 1, prefixIndex: i };
      add(next);
      cur = next;
    }
    root = cur;
  }

  const target = rng.int(cfg.roomCount[0], cfg.roomCount[1]);
  let added = 0;
  const queue: Cell[] = [root];
  while (queue.length > 0 && added < target) {
    const cur = queue.shift()!;
    for (const d of rng.shuffle([...DIRS])) {
      if (added >= target) break;
      const nx = cur.x + DIR_VEC[d].dx;
      const ny = cur.y + DIR_VEC[d].dy;
      if (!inBounds(nx, ny) || occupied(nx, ny)) continue;
      if (occupiedNeighbors(nx, ny) > 1) continue;
      if (cur !== root && rng.chance(0.5)) continue;
      const cell: Cell = { x: nx, y: ny, depth: cur.depth + 1 };
      add(cell);
      queue.push(cell);
      added++;
    }
  }
  if (added < target) return null;

  const all = [...cells.values()];
  const deadEnds = all.filter(
    (c) => c !== start && c.prefixIndex === undefined && occupiedNeighbors(c.x, c.y) === 1,
  );
  const needed = 3 + (cfg.special ? 1 : 0);
  if (deadEnds.length < needed) return null;

  deadEnds.sort((a, b) => b.depth - a.depth || a.y - b.y || a.x - b.x);
  const finale = deadEnds[0];
  if (finale.depth - prefixCount < 3) return null;
  const others = rng.shuffle(deadEnds.slice(1));
  const treasure = others[0];
  const shop = others[1];
  const special = cfg.special ? others[2] : undefined;

  // Stable ids: start first, then by depth and position.
  all.sort((a, b) => a.depth - b.depth || a.y - b.y || a.x - b.x);
  const idOf = new Map<Cell, number>(all.map((c, i) => [c, i]));

  const combatBag = new TemplateBag(cfg.templates, rng);
  const calmBag = cfg.calmPrefix ? new TemplateBag(cfg.calmPrefix.templates, rng) : null;

  const rooms: FloorRoom[] = all.map((c) => {
    const room: FloorRoom = {
      id: idOf.get(c)!,
      x: c.x,
      y: c.y,
      depth: c.depth,
      kind: 'combat',
      template: '',
      neighbors: {},
    };
    if (c === start) {
      room.kind = 'start';
      room.template = cfg.startTemplate;
    } else if (c.prefixIndex !== undefined && cfg.calmPrefix) {
      room.kind = 'calm';
      room.prefixIndex = c.prefixIndex;
      room.lastPrefix = c.prefixIndex === prefixCount - 1;
      room.template = room.lastPrefix ? cfg.calmPrefix.lastTemplate : calmBag!.next();
    } else if (c === finale) {
      room.kind = 'finale';
      room.template = cfg.finaleTemplate;
    } else if (c === treasure) {
      room.kind = 'treasure';
      room.template = cfg.treasureTemplate;
    } else if (c === shop) {
      room.kind = 'shop';
      room.template = cfg.shopTemplate;
    } else if (special && c === special && cfg.special) {
      room.kind = 'special';
      room.specialId = cfg.special.id;
      room.template = rng.pick(cfg.special.templates);
    } else {
      room.template = combatBag.next();
    }
    for (const d of DIRS) {
      const n = cells.get(key(c.x + DIR_VEC[d].dx, c.y + DIR_VEC[d].dy));
      if (n) room.neighbors[d] = idOf.get(n)!;
    }
    return room;
  });

  return { rooms, startId: idOf.get(start)!, finaleId: idOf.get(finale)!, gridW: size, gridH: size };
}

/** Deals templates in shuffled order so a floor doesn't repeat one until it has used them all. */
class TemplateBag {
  private bag: ContentId[] = [];

  constructor(
    private readonly all: readonly ContentId[],
    private readonly rng: Rng,
  ) {}

  next(): ContentId {
    if (this.bag.length === 0) this.bag = this.rng.shuffle([...this.all]);
    return this.bag.pop()!;
  }
}

/** Builds a hand-made floor (prologue, epilogue). Doors connect adjacent rooms. */
export function buildFixedFloor(layout: FixedLayout): Floor {
  const byPos = new Map(layout.rooms.map((r, i) => [`${r.x},${r.y}`, i]));
  const startIndex = byPos.get(`${layout.start.x},${layout.start.y}`);
  if (startIndex === undefined) throw new Error('Fixed layout start room is missing');
  const rooms: FloorRoom[] = layout.rooms.map((r, i) => {
    const neighbors: Partial<Record<Dir, number>> = {};
    for (const d of DIRS) {
      const n = byPos.get(`${r.x + DIR_VEC[d].dx},${r.y + DIR_VEC[d].dy}`);
      if (n !== undefined) neighbors[d] = n;
    }
    return { id: i, x: r.x, y: r.y, kind: r.kind, template: r.template, script: r.script, biome: r.biome, depth: 0, neighbors };
  });
  // Depth by breadth-first search from the start room.
  const seen = new Set([startIndex]);
  const queue = [startIndex];
  while (queue.length) {
    const cur = rooms[queue.shift()!];
    for (const n of Object.values(cur.neighbors)) {
      if (n === undefined || seen.has(n)) continue;
      seen.add(n);
      rooms[n].depth = cur.depth + 1;
      queue.push(n);
    }
  }
  const xs = rooms.map((r) => r.x);
  const ys = rooms.map((r) => r.y);
  const finale = rooms.find((r) => r.kind === 'finale');
  return {
    rooms,
    startId: startIndex,
    finaleId: finale ? finale.id : null,
    gridW: Math.max(...xs) + 1,
    gridH: Math.max(...ys) + 1,
  };
}

/**
 * Which region of a floor a room belongs to (ProceduralLayout.regions), so walking deeper crosses
 * from one place into the next (the club into the centaur's dream into the little girl's). Region
 * 0 holds the start room and the last region holds the finale. A room is in the later of:
 * - its stretch of the way from the start to the finale (cut into equal stretches, one per
 *   region; a room off the way counts from where it branches off), so every region has rooms of
 *   its own on the way through and not just the finale, which may look like somewhere else again;
 * - its band of depth, so side rooms far from the start move on too, and the club isn't half
 *   the floor.
 * Either way, going deeper never steps back into an earlier region.
 */
export function regionOf(floor: Floor, room: FloorRoom, regionCount: number): number {
  if (regionCount <= 1 || floor.finaleId === null) return 0;
  if (room.id === floor.finaleId) return regionCount - 1;
  // Breadth-first parents from the start room.
  const parent = new Map<number, number>([[floor.startId, -1]]);
  const queue = [floor.startId];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const n of Object.values(floor.rooms[cur].neighbors)) {
      if (n === undefined || parent.has(n)) continue;
      parent.set(n, cur);
      queue.push(n);
    }
  }
  // The way to the finale: the start room up to the room before it.
  const way: number[] = [];
  for (let at = parent.get(floor.finaleId) ?? -1; at !== -1; at = parent.get(at) ?? -1) way.unshift(at);
  // Walk back from this room to where it branches off the way.
  let at = room.id;
  while (at !== -1 && !way.includes(at)) at = parent.get(at) ?? -1;
  const step = Math.max(0, way.indexOf(at));
  const byWay = Math.floor((step * regionCount) / Math.max(1, way.length));
  const deepest = Math.max(...floor.rooms.map((r) => r.depth));
  const byDepth = Math.floor((room.depth * regionCount) / (deepest + 1));
  return Math.min(regionCount - 1, Math.max(byWay, byDepth));
}
