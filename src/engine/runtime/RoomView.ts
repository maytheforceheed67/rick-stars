/**
 * Builds one room on screen from its template: the floor art (baked into a single render
 * texture), wall and block collision, doors, and helpers for pathfinding and line of sight.
 *
 * World coordinates: (0,0) is the room's top-left wall corner. Interior cell (col,row) spans
 * [(col+1)*TILE, (col+2)*TILE).
 */
import Phaser from 'phaser';
import { INK, jitter, shade } from '../art/draw';
import { TILE } from '../constants';
import { DIRS, DIR_VEC, doorCell, type Dir, type ParsedTemplate } from '../dungeon/templates';
import type { BiomeDef, RoomKind, TileKind, Vec } from '../types';

export interface DoorSpec {
  dir: Dir;
  target: number;
  targetKind: RoomKind;
}

const DOOR_COLORS: Partial<Record<RoomKind, number>> = {
  treasure: 0xf2c14e,
  shop: 0x6fd08c,
  special: 0xb07cf0,
  finale: 0xe0484d,
};

export class DoorView {
  open = true;
  readonly x: number;
  readonly y: number;
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly blocker: Phaser.GameObjects.Zone;

  constructor(
    scene: Phaser.Scene,
    readonly spec: DoorSpec,
    private readonly room: RoomView,
    walls: Phaser.Physics.Arcade.StaticGroup,
  ) {
    const c = doorCell(room.cols, room.rows, spec.dir);
    const v = DIR_VEC[spec.dir];
    const tc = c.col + 1 + v.dx;
    const tr = c.row + 1 + v.dy;
    this.x = (tc + 0.5) * TILE;
    this.y = (tr + 0.5) * TILE;
    this.blocker = scene.add.zone(this.x, this.y, TILE, TILE);
    scene.physics.add.existing(this.blocker, true);
    walls.add(this.blocker);
    this.gfx = scene.add.graphics().setDepth(-9000);
    this.setOpen(true);
  }

  setOpen(open: boolean): void {
    this.open = open;
    (this.blocker.body as Phaser.Physics.Arcade.StaticBody).enable = !open;
    this.draw();
  }

  private draw(): void {
    const g = this.gfx;
    g.clear();
    const accent = DOOR_COLORS[this.spec.targetKind] ?? this.room.biome.palette.door;
    const horizontal = this.spec.dir === 'N' || this.spec.dir === 'S';
    const w = horizontal ? TILE * 1.1 : TILE * 0.9;
    const h = horizontal ? TILE * 0.9 : TILE * 1.1;
    // Frame
    g.fillStyle(shade(accent, -0.25), 1);
    g.fillRoundedRect(this.x - w / 2 - 6, this.y - h / 2 - 6, w + 12, h + 12, 10);
    g.lineStyle(3, INK, 1);
    g.strokeRoundedRect(this.x - w / 2 - 6, this.y - h / 2 - 6, w + 12, h + 12, 10);
    // Opening
    g.fillStyle(this.open ? 0x0c0a14 : shade(accent, -0.1), 1);
    g.fillRoundedRect(this.x - w / 2, this.y - h / 2, w, h, 6);
    if (!this.open) {
      g.lineStyle(4, shade(accent, -0.5), 1);
      for (let i = 1; i <= 3; i++) {
        if (horizontal) g.lineBetween(this.x - w / 2 + (w * i) / 4, this.y - h / 2 + 4, this.x - w / 2 + (w * i) / 4, this.y + h / 2 - 4);
        else g.lineBetween(this.x - w / 2 + 4, this.y - h / 2 + (h * i) / 4, this.x + w / 2 - 4, this.y - h / 2 + (h * i) / 4);
      }
    }
    if (this.spec.targetKind === 'finale') {
      // Skull-ish marker so the finale door reads at a glance.
      g.fillStyle(0xf4efe6, 1);
      g.fillCircle(this.x, this.y - 2, 8);
      g.fillRect(this.x - 5, this.y + 3, 10, 6);
      g.fillStyle(INK, 1);
      g.fillCircle(this.x - 3, this.y - 3, 2.2);
      g.fillCircle(this.x + 3, this.y - 3, 2.2);
    }
  }

  destroy(): void {
    this.gfx.destroy();
    this.blocker.destroy();
  }
}

export class RoomView {
  readonly cols: number;
  readonly rows: number;
  readonly widthPx: number;
  readonly heightPx: number;
  readonly walls: Phaser.Physics.Arcade.StaticGroup;
  readonly blocks: Phaser.Physics.Arcade.StaticGroup;
  readonly doors: DoorView[] = [];
  private readonly bg: Phaser.GameObjects.RenderTexture;
  private readonly flowCache = new Map<string, Int16Array>();

  constructor(
    private readonly scene: Phaser.Scene,
    readonly template: ParsedTemplate,
    readonly biome: BiomeDef,
    doorSpecs: DoorSpec[],
    private readonly seed: number,
  ) {
    this.cols = template.cols;
    this.rows = template.rows;
    this.widthPx = (this.cols + 2) * TILE;
    this.heightPx = (this.rows + 2) * TILE;
    this.walls = scene.physics.add.staticGroup();
    this.blocks = scene.physics.add.staticGroup();

    const gaps = new Set<string>();
    for (const d of doorSpecs) {
      const c = doorCell(this.cols, this.rows, d.dir);
      gaps.add(`${c.col + 1 + DIR_VEC[d.dir].dx},${c.row + 1 + DIR_VEC[d.dir].dy}`);
    }
    // Outer walls (door gaps get their own blockers).
    for (let tr = 0; tr < this.rows + 2; tr++) {
      for (let tc = 0; tc < this.cols + 2; tc++) {
        const edge = tr === 0 || tc === 0 || tr === this.rows + 1 || tc === this.cols + 1;
        if (!edge || gaps.has(`${tc},${tr}`)) continue;
        this.addBody(this.walls, tc, tr);
      }
    }
    // Interior blocks.
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const t = template.tiles[r][c];
        if (t === 'wall') this.addBody(this.walls, c + 1, r + 1);
        else if (t === 'block') this.addBody(this.blocks, c + 1, r + 1);
      }
    }

    this.bg = scene.add.renderTexture(0, 0, this.widthPx, this.heightPx).setOrigin(0, 0).setDepth(-10000);
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    this.paint(g, gaps);
    this.bg.draw(g);
    g.destroy();

    for (const d of doorSpecs) this.doors.push(new DoorView(scene, d, this, this.walls));
  }

  private addBody(group: Phaser.Physics.Arcade.StaticGroup, tc: number, tr: number): void {
    const z = this.scene.add.zone((tc + 0.5) * TILE, (tr + 0.5) * TILE, TILE, TILE);
    this.scene.physics.add.existing(z, true);
    group.add(z);
  }

  // ---- drawing -------------------------------------------------------------------------------

  private paint(g: Phaser.GameObjects.Graphics, gaps: Set<string>): void {
    const p = this.biome.palette;
    g.fillStyle(p.background, 1);
    g.fillRect(0, 0, this.widthPx, this.heightPx);

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) this.paintFloor(g, c, r);
    }
    // Soft shadow along the walls.
    g.fillStyle(0x000000, 0.14);
    g.fillRect(TILE, TILE, this.cols * TILE, 10);
    g.fillRect(TILE, TILE, 10, this.rows * TILE);
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const t = this.template.tiles[r][c];
        if (t === 'cliff') this.paintCliff(g, c, r);
        else if (t === 'slow') this.paintSlow(g, c, r);
      }
    }
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const t = this.template.tiles[r][c];
        if (t === 'wall') this.paintBlock(g, c, r, true);
        else if (t === 'block') this.paintBlock(g, c, r, false);
      }
    }
    this.paintWalls(g, gaps);
  }

  private paintFloor(g: Phaser.GameObjects.Graphics, c: number, r: number): void {
    const p = this.biome.palette;
    const x = (c + 1) * TILE;
    const y = (r + 1) * TILE;
    const i = r * this.cols + c;
    const k = this.seed * 0.001 + i;
    switch (this.biome.floorPattern) {
      case 'checker':
        g.fillStyle((c + r) % 2 === 0 ? p.floor : p.floorAlt, 1);
        g.fillRect(x, y, TILE, TILE);
        break;
      case 'grid':
        g.fillStyle(p.floor, 1);
        g.fillRect(x, y, TILE, TILE);
        g.lineStyle(2, p.floorAlt, 1);
        g.strokeRect(x + 1, y + 1, TILE - 2, TILE - 2);
        break;
      case 'planks':
        g.fillStyle(r % 2 === 0 ? p.floor : shade(p.floor, -0.04), 1);
        g.fillRect(x, y, TILE, TILE);
        g.lineStyle(2, p.floorAlt, 1);
        g.lineBetween(x, y + TILE - 1, x + TILE, y + TILE - 1);
        if ((c + r) % 3 === 0) g.lineBetween(x + TILE / 2, y, x + TILE / 2, y + TILE);
        break;
      case 'speckle':
        g.fillStyle(p.floor, 1);
        g.fillRect(x, y, TILE, TILE);
        for (let s = 0; s < 3; s++) {
          g.fillStyle(p.floorAlt, 0.8);
          g.fillCircle(x + TILE / 2 + jitter(k, s) * 22, y + TILE / 2 + jitter(k, s + 7) * 22, 2 + Math.abs(jitter(k, s + 3)) * 2);
        }
        break;
      case 'blobs':
        g.fillStyle(p.floor, 1);
        g.fillRect(x, y, TILE, TILE);
        if (jitter(k, 1) > 0.2) {
          g.fillStyle(p.floorAlt, 0.9);
          g.fillEllipse(x + TILE / 2 + jitter(k, 2) * 14, y + TILE / 2 + jitter(k, 3) * 14, 16 + jitter(k, 4) * 8, 11 + jitter(k, 5) * 5);
        }
        if (jitter(k, 6) > 0.5) {
          g.fillStyle(shade(p.accent, 0.2), 0.7);
          g.fillCircle(x + TILE / 2 + jitter(k, 7) * 20, y + TILE / 2 + jitter(k, 8) * 20, 3);
        }
        break;
    }
  }

  private isTile(c: number, r: number, kind: TileKind): boolean {
    if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return false;
    return this.template.tiles[r][c] === kind;
  }

  private paintCliff(g: Phaser.GameObjects.Graphics, c: number, r: number): void {
    const p = this.biome.palette;
    const x = (c + 1) * TILE;
    const y = (r + 1) * TILE;
    g.fillStyle(p.cliffShadow, 1);
    g.fillRect(x, y, TILE, TILE);
    // Rock strata, so cliffs read as a drop and not just a darker floor.
    g.lineStyle(3, p.cliff, 1);
    for (let i = 0; i < 3; i++) {
      const yy = y + 12 + i * 16 + jitter(c * 31 + r, i) * 3;
      g.lineBetween(x + 4, yy, x + TILE - 4, yy + jitter(c + r * 17, i) * 4);
    }
    g.lineStyle(2, shade(p.cliffShadow, -0.35), 1);
    for (let i = 0; i < 2; i++) {
      const xx = x + 14 + i * 26 + jitter(c + 5, r + i) * 4;
      g.lineBetween(xx, y + 6, xx - 4, y + TILE - 6);
    }
    // Lips where the cliff meets solid ground.
    g.fillStyle(shade(p.floor, 0.18), 1);
    if (!this.isTile(c, r - 1, 'cliff')) g.fillRect(x, y, TILE, 6);
    g.fillStyle(0x000000, 0.25);
    if (!this.isTile(c, r + 1, 'cliff')) g.fillRect(x, y + TILE - 5, TILE, 5);
    g.lineStyle(3, INK, 0.9);
    if (!this.isTile(c, r - 1, 'cliff')) g.lineBetween(x, y + 6, x + TILE, y + 6);
    if (!this.isTile(c - 1, r, 'cliff')) g.lineBetween(x + 1, y, x + 1, y + TILE);
    if (!this.isTile(c + 1, r, 'cliff')) g.lineBetween(x + TILE - 1, y, x + TILE - 1, y + TILE);
    if (!this.isTile(c, r + 1, 'cliff')) g.lineBetween(x, y + TILE - 1, x + TILE, y + TILE - 1);
  }

  private paintSlow(g: Phaser.GameObjects.Graphics, c: number, r: number): void {
    const p = this.biome.palette;
    const x = (c + 1) * TILE + TILE / 2;
    const y = (r + 1) * TILE + TILE / 2;
    const k = c * 13 + r * 7;
    g.fillStyle(p.slow, 0.85);
    g.fillEllipse(x + jitter(k, 1) * 4, y + jitter(k, 2) * 4, TILE * 1.05, TILE * 0.85);
    g.fillStyle(shade(p.slow, 0.3), 0.8);
    g.fillEllipse(x - 8 + jitter(k, 3) * 4, y - 6, 12, 6);
  }

  private paintBlock(g: Phaser.GameObjects.Graphics, c: number, r: number, tall: boolean): void {
    const p = this.biome.palette;
    const x = (c + 1) * TILE;
    const y = (r + 1) * TILE;
    const lift = tall ? 14 : 8;
    const inset = tall ? 3 : 7;
    const front = tall ? p.wall : p.block;
    const top = tall ? p.wallTop : p.blockTop;
    g.fillStyle(0x000000, 0.22);
    g.fillEllipse(x + TILE / 2, y + TILE - 3, TILE * 0.95, 12);
    g.fillStyle(front, 1);
    g.fillRoundedRect(x + inset, y + inset, TILE - inset * 2, TILE - inset * 1.5, 6);
    g.fillStyle(top, 1);
    g.fillRoundedRect(x + inset, y + inset - lift, TILE - inset * 2, TILE - inset * 2 - 4, 6);
    g.lineStyle(3, INK, 1);
    g.strokeRoundedRect(x + inset, y + inset - lift, TILE - inset * 2, TILE - inset * 0.5 + lift - 4, 6);
    g.lineBetween(x + inset, y + TILE - inset * 2 - 4 + inset - lift, x + TILE - inset, y + TILE - inset * 2 - 4 + inset - lift);
    g.fillStyle(0xffffff, 0.18);
    g.fillRoundedRect(x + inset + 5, y + inset - lift + 4, TILE * 0.35, 5, 2);
  }

  private paintWalls(g: Phaser.GameObjects.Graphics, gaps: Set<string>): void {
    const p = this.biome.palette;
    const W = this.widthPx;
    const H = this.heightPx;
    g.fillStyle(p.wall, 1);
    g.fillRect(0, 0, W, TILE);
    g.fillRect(0, H - TILE, W, TILE);
    g.fillRect(0, 0, TILE, H);
    g.fillRect(W - TILE, 0, TILE, H);
    g.fillStyle(p.wallTop, 1);
    g.fillRect(0, 0, W, TILE * 0.55);
    g.fillRect(0, H - TILE * 0.3, W, TILE * 0.3);
    g.fillRect(0, 0, TILE * 0.3, H);
    g.fillRect(W - TILE * 0.3, 0, TILE * 0.3, H);
    // Brick-ish detail
    g.lineStyle(2, shade(p.wall, -0.25), 1);
    for (let x = 0; x < W; x += TILE / 2) {
      g.lineBetween(x, TILE * 0.55, x, TILE);
      g.lineBetween(x + TILE / 4, H - TILE, x + TILE / 4, H - TILE * 0.3);
    }
    for (let y = 0; y < H; y += TILE / 2) {
      g.lineBetween(TILE * 0.3, y, TILE, y);
      g.lineBetween(W - TILE, y, W - TILE * 0.3, y);
    }
    g.lineStyle(4, INK, 1);
    g.strokeRect(TILE, TILE, W - TILE * 2, H - TILE * 2);
    g.strokeRect(2, 2, W - 4, H - 4);
    // Carve door gaps back out of the wall art.
    for (const key of gaps) {
      const [tc, tr] = key.split(',').map(Number);
      g.fillStyle(0x0c0a14, 1);
      g.fillRect(tc * TILE, tr * TILE, TILE, TILE);
    }
  }

  // ---- queries -------------------------------------------------------------------------------

  cellOf(x: number, y: number): { col: number; row: number } | null {
    const col = Math.floor(x / TILE) - 1;
    const row = Math.floor(y / TILE) - 1;
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) return null;
    return { col, row };
  }

  cellCenter(col: number, row: number): Vec {
    return { x: (col + 1.5) * TILE, y: (row + 1.5) * TILE };
  }

  tileAt(x: number, y: number): TileKind {
    if (x < 0 || y < 0 || x >= this.widthPx || y >= this.heightPx) return 'void';
    const cell = this.cellOf(x, y);
    if (cell) return this.template.tiles[cell.row][cell.col];
    for (const d of this.doors) {
      if (d.open && Math.abs(d.x - x) <= TILE / 2 && Math.abs(d.y - y) <= TILE / 2) return 'floor';
    }
    return 'wall';
  }

  passable(col: number, row: number, flying: boolean): boolean {
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) return false;
    const t = this.template.tiles[row][col];
    if (t === 'wall') return false;
    if (t === 'block') return flying;
    return true;
  }

  /** Breadth-first distances to a target cell (-1 = unreachable). */
  flowField(col: number, row: number, flying: boolean): Int16Array {
    const key = `${col},${row},${flying ? 1 : 0}`;
    const cached = this.flowCache.get(key);
    if (cached) return cached;
    const dist = new Int16Array(this.cols * this.rows).fill(-1);
    if (this.passable(col, row, flying)) {
      const queue = [row * this.cols + col];
      dist[queue[0]] = 0;
      for (let head = 0; head < queue.length; head++) {
        const cur = queue[head];
        const cc = cur % this.cols;
        const cr = Math.floor(cur / this.cols);
        for (const d of DIRS) {
          const nc = cc + DIR_VEC[d].dx;
          const nr = cr + DIR_VEC[d].dy;
          if (!this.passable(nc, nr, flying)) continue;
          const ni = nr * this.cols + nc;
          if (dist[ni] !== -1) continue;
          dist[ni] = dist[cur] + 1;
          queue.push(ni);
        }
      }
    }
    if (this.flowCache.size > 400) this.flowCache.clear();
    this.flowCache.set(key, dist);
    return dist;
  }

  /** Where to walk next to get from `from` to `to` around obstacles (null = go straight). */
  nextStep(fx: number, fy: number, tx: number, ty: number, flying: boolean): Vec | null {
    const from = this.cellOf(fx, fy);
    const to = this.cellOf(tx, ty);
    if (!from || !to) return null;
    if (from.col === to.col && from.row === to.row) return null;
    const field = this.flowField(to.col, to.row, flying);
    let best: { col: number; row: number } | null = null;
    let bestD = field[from.row * this.cols + from.col];
    if (bestD === -1) bestD = 9999;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nc = from.col + dx;
        const nr = from.row + dy;
        if (!this.passable(nc, nr, flying)) continue;
        if (dx && dy && (!this.passable(from.col + dx, from.row, flying) || !this.passable(from.col, from.row + dy, flying))) continue;
        const d = field[nr * this.cols + nc];
        if (d === -1) continue;
        const score = d + (dx && dy ? 0.4 : 0);
        if (score < bestD) {
          bestD = score;
          best = { col: nc, row: nr };
        }
      }
    }
    return best ? this.cellCenter(best.col, best.row) : null;
  }

  /** True if a mover of the given radius could walk straight from one point to the other. */
  walkableLine(x1: number, y1: number, x2: number, y2: number, flying: boolean, radius = 0): boolean {
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.max(1, Math.ceil(dist / (TILE / 3)));
    const nx = dist ? (-(y2 - y1) / dist) * radius * 0.8 : 0;
    const ny = dist ? ((x2 - x1) / dist) * radius * 0.8 : 0;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const px = x1 + (x2 - x1) * t;
      const py = y1 + (y2 - y1) * t;
      for (const [ox, oy] of [[0, 0], [nx, ny], [-nx, -ny]]) {
        const cell = this.cellOf(px + ox, py + oy);
        if (!cell) continue;
        if (!this.passable(cell.col, cell.row, flying)) return false;
      }
    }
    return true;
  }

  /** True if no wall stands between the two points (low blocks don't block sight). */
  lineOfSight(x1: number, y1: number, x2: number, y2: number): boolean {
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.ceil(dist / (TILE / 4));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (this.tileAt(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t) === 'wall') return false;
    }
    return true;
  }

  setDoorsOpen(open: boolean): void {
    for (const d of this.doors) d.setOpen(open);
  }

  destroy(): void {
    this.doors.forEach((d) => d.destroy());
    // On scene shutdown Phaser may have destroyed the groups already.
    if (this.walls.children) this.walls.destroy(true);
    if (this.blocks.children) this.blocks.destroy(true);
    this.bg.destroy();
  }
}
