/**
 * Room templates are small ASCII grids describing a room's interior. Walls and doors are added
 * around the edge by the engine: doors sit in the middle of each side, so the interior cells next
 * to those spots must stay open.
 *
 * Legend
 *   .  floor
 *   #  wall block (stops movement and shots)
 *   =  low block (stops movement, not shots)
 *   ^  cliff (the player falls unless a mechanic says otherwise)
 *   ~  slow floor
 *   e  enemy spawn (random pick from the act's pool)
 *   E  elite enemy spawn
 *   $  maybe a pickup
 *   P  player spawn (start and fixed rooms)
 *   I  item pedestal spot
 *   K  shopkeeper spot
 * Any other character is a marker: floor underneath, with a meaning defined by the room's script
 * or a mechanic (e.g. S = scanner gate at customs).
 */
import type { ContentId, RoomTemplate, TileKind } from '../types';

export type Dir = 'N' | 'S' | 'E' | 'W';
export const DIRS: readonly Dir[] = ['N', 'E', 'S', 'W'];
export const DIR_VEC: Record<Dir, { dx: number; dy: number }> = {
  N: { dx: 0, dy: -1 },
  S: { dx: 0, dy: 1 },
  E: { dx: 1, dy: 0 },
  W: { dx: -1, dy: 0 },
};
export const OPPOSITE: Record<Dir, Dir> = { N: 'S', S: 'N', E: 'W', W: 'E' };

export interface TemplateMarker {
  ch: string;
  col: number;
  row: number;
}

export interface ParsedTemplate {
  id: ContentId;
  cols: number;
  rows: number;
  /** tiles[row][col] */
  tiles: TileKind[][];
  markers: TemplateMarker[];
}

const TILE_CHARS: Record<string, TileKind> = {
  '.': 'floor',
  '#': 'wall',
  '=': 'block',
  '^': 'cliff',
  '~': 'slow',
};

export const SPAWN_MARKERS = new Set(['e', 'E']);

export function parseTemplate(t: RoomTemplate): ParsedTemplate {
  const rows = t.rows.length;
  const cols = rows > 0 ? t.rows[0].length : 0;
  const tiles: TileKind[][] = [];
  const markers: TemplateMarker[] = [];
  t.rows.forEach((line, row) => {
    const tileRow: TileKind[] = [];
    for (let col = 0; col < line.length; col++) {
      const ch = line[col];
      const kind = TILE_CHARS[ch];
      if (kind) {
        tileRow.push(kind);
      } else {
        tileRow.push('floor');
        markers.push({ ch, col, row });
      }
    }
    tiles.push(tileRow);
  });
  return { id: t.id, cols, rows, tiles, markers };
}

/** Interior cell next to the door on a given side. */
export function doorCell(cols: number, rows: number, dir: Dir): { col: number; row: number } {
  switch (dir) {
    case 'N':
      return { col: Math.floor(cols / 2), row: 0 };
    case 'S':
      return { col: Math.floor(cols / 2), row: rows - 1 };
    case 'W':
      return { col: 0, row: Math.floor(rows / 2) };
    case 'E':
      return { col: cols - 1, row: Math.floor(rows / 2) };
  }
}

export function isPassable(kind: TileKind): boolean {
  return kind === 'floor' || kind === 'slow' || kind === 'cliff';
}

export interface TemplateCheck {
  /** Every door spot must be open and connected (procedural rooms can get doors on any side). */
  doors: Dir[];
  /** Needs at least one enemy spawn marker. */
  requireSpawns?: boolean;
  /** Required size, if any. */
  size?: { cols: number; rows: number };
}

/** Returns human-readable problems (empty = fine). */
export function checkTemplate(p: ParsedTemplate, rowsSrc: readonly string[], check: TemplateCheck): string[] {
  const errors: string[] = [];
  const where = `template "${p.id}"`;
  if (p.rows === 0 || p.cols === 0) return [`${where} is empty`];
  rowsSrc.forEach((line, i) => {
    if (line.length !== p.cols) errors.push(`${where} row ${i} is ${line.length} wide, expected ${p.cols}`);
  });
  if (check.size && (p.cols !== check.size.cols || p.rows !== check.size.rows)) {
    errors.push(`${where} is ${p.cols}x${p.rows}, expected ${check.size.cols}x${check.size.rows}`);
  }
  if (errors.length) return errors;

  const doorCells = check.doors.map((d) => ({ d, ...doorCell(p.cols, p.rows, d) }));
  for (const c of doorCells) {
    const kind = p.tiles[c.row][c.col];
    if (kind !== 'floor' && kind !== 'slow') errors.push(`${where}: the cell inside the ${c.d} door must be floor`);
    if (p.markers.some((m) => m.col === c.col && m.row === c.row && SPAWN_MARKERS.has(m.ch))) {
      errors.push(`${where}: enemy spawn on the ${c.d} door cell`);
    }
  }

  const spawns = p.markers.filter((m) => SPAWN_MARKERS.has(m.ch));
  if (check.requireSpawns && spawns.length === 0) errors.push(`${where} has no enemy spawn markers`);
  for (const s of spawns) {
    for (const c of doorCells) {
      if (Math.abs(s.col - c.col) + Math.abs(s.row - c.row) < 3) {
        errors.push(`${where}: enemy spawn at ${s.col},${s.row} is too close to the ${c.d} door`);
      }
    }
  }

  // Everything that matters must be reachable from the first door (or the first marker).
  const start = doorCells[0] ?? p.markers[0];
  if (start) {
    const seen = new Set<string>();
    const queue = [{ col: start.col, row: start.row }];
    seen.add(`${start.col},${start.row}`);
    while (queue.length) {
      const cur = queue.shift()!;
      for (const d of DIRS) {
        const nc = cur.col + DIR_VEC[d].dx;
        const nr = cur.row + DIR_VEC[d].dy;
        if (nc < 0 || nr < 0 || nc >= p.cols || nr >= p.rows) continue;
        const key = `${nc},${nr}`;
        if (seen.has(key) || !isPassable(p.tiles[nr][nc])) continue;
        seen.add(key);
        queue.push({ col: nc, row: nr });
      }
    }
    for (const c of doorCells) {
      if (!seen.has(`${c.col},${c.row}`)) errors.push(`${where}: the ${c.d} door can't be reached`);
    }
    for (const m of p.markers) {
      if (!seen.has(`${m.col},${m.row}`)) errors.push(`${where}: marker "${m.ch}" at ${m.col},${m.row} can't be reached`);
    }
  }
  return errors;
}
