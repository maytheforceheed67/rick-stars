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
    const style = this.room.biome.style?.doors ?? 'plain';
    if (style !== 'plain') {
      this.drawStyled(g, style);
      return;
    }
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

  /**
   * Doors that belong to the place: classroom doors, rock archways, security gates, house doors.
   * A light over the door still says what's through it (treasure, shop, special room, finale).
   */
  private drawStyled(g: Phaser.GameObjects.Graphics, style: 'classroom' | 'arch' | 'gate' | 'house'): void {
    const p = this.room.biome.palette;
    const x = this.x;
    const y = this.y;
    const horizontal = this.spec.dir === 'N' || this.spec.dir === 'S';
    const w = horizontal ? TILE * 1.05 : TILE * 0.85;
    const h = horizontal ? TILE * 0.85 : TILE * 1.05;
    const left = x - w / 2;
    const top = y - h / 2;
    switch (style) {
      case 'classroom':
      case 'house': {
        const wood = style === 'classroom' ? 0x9c6a3e : 0xf4efe6;
        g.fillStyle(shade(wood, -0.25), 1);
        g.fillRoundedRect(left - 6, top - 6, w + 12, h + 12, 6);
        g.fillStyle(0x0c0a14, 1);
        g.fillRect(left, top, w, h);
        if (!this.open) {
          // The door, shut: panels, a knob, and (at school) a little window.
          g.fillStyle(wood, 1);
          g.fillRect(left + 2, top + 2, w - 4, h - 4);
          g.lineStyle(2, shade(wood, -0.35), 1);
          g.strokeRect(left + 8, top + 8, w - 16, h - 16);
          if (style === 'classroom') {
            g.fillStyle(0xbfe6f7, 1);
            g.fillRect(x - 9, top + 10, 18, 12);
          }
          g.fillStyle(0xffd54a, 1);
          g.fillCircle(horizontal ? left + w - 10 : x, horizontal ? y + 4 : top + h - 10, 3.5);
        } else {
          // Swung open against the frame.
          g.fillStyle(wood, 1);
          if (horizontal) g.fillRect(left - 4, top, 8, h);
          else g.fillRect(left, top - 4, w, 8);
        }
        g.lineStyle(3, INK, 1);
        g.strokeRoundedRect(left - 6, top - 6, w + 12, h + 12, 6);
        break;
      }
      case 'arch': {
        // A lumpy rock arch; shut, it's grown over with goo.
        g.fillStyle(p.wall, 1);
        for (let i = 0; i < 7; i++) {
          const a = (i / 6) * Math.PI;
          const rx = horizontal ? Math.cos(a) * (w / 2 + 6) : 0;
          const ry = horizontal ? 0 : Math.cos(a) * (h / 2 + 6);
          g.fillCircle(x + rx + (horizontal ? 0 : Math.sin(a) * 4), y + ry + (horizontal ? Math.sin(a) * 4 : 0), 13);
        }
        g.fillStyle(0x0c0a14, 1);
        g.fillEllipse(x, y, w * 0.9, h * 0.9);
        if (!this.open) {
          g.fillStyle(p.slow, 1);
          g.fillEllipse(x, y, w * 0.86, h * 0.86);
          g.fillStyle(shade(p.slow, 0.3), 1);
          g.fillCircle(x - 8, y - 6, 5);
          g.fillCircle(x + 7, y + 5, 3.5);
        }
        g.lineStyle(3, INK, 1);
        g.strokeEllipse(x, y, w * 0.9, h * 0.9);
        break;
      }
      case 'gate': {
        // A security gate: metal posts, a scanner light, laser bars when it's locked.
        g.fillStyle(0x56657a, 1);
        g.fillRoundedRect(left - 7, top - 7, w + 14, h + 14, 5);
        g.fillStyle(0x0c0a14, 1);
        g.fillRect(left, top, w, h);
        g.lineStyle(3, INK, 1);
        g.strokeRoundedRect(left - 7, top - 7, w + 14, h + 14, 5);
        if (!this.open) {
          g.lineStyle(3, 0xff4a5a, 0.95);
          for (let i = 1; i <= 3; i++) {
            if (horizontal) g.lineBetween(left + (w * i) / 4, top + 3, left + (w * i) / 4, top + h - 3);
            else g.lineBetween(left + 3, top + (h * i) / 4, left + w - 3, top + (h * i) / 4);
          }
        }
        g.fillStyle(this.open ? 0x97ce4c : 0xff4a5a, 1);
        g.fillCircle(horizontal ? x : left - 1, horizontal ? top - 1 : y, 4);
        break;
      }
    }
    const accent = DOOR_COLORS[this.spec.targetKind];
    if (accent !== undefined) {
      // A colored light by the door for special rooms, and the skull for the finale.
      const lx = horizontal ? x + w / 2 + 12 : x + (this.spec.dir === 'W' ? 18 : -18);
      const ly = horizontal ? y + (this.spec.dir === 'N' ? 18 : -18) : y - h / 2 - 12;
      g.fillStyle(accent, 1);
      g.fillCircle(lx, ly, 7);
      g.lineStyle(2, INK, 1);
      g.strokeCircle(lx, ly, 7);
    }
    if (this.spec.targetKind === 'finale') {
      g.fillStyle(0xf4efe6, 1);
      g.fillCircle(x, y - 2, 8);
      g.fillRect(x - 5, y + 3, 10, 6);
      g.fillStyle(INK, 1);
      g.fillCircle(x - 3, y - 3, 2.2);
      g.fillCircle(x + 3, y - 3, 2.2);
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
    const style = this.biome.style;
    const kind = tall ? style?.walls : style?.blocks;
    if (kind && kind !== 'bricks' && kind !== 'crate') {
      this.paintStyledBlock(g, c, r, tall, kind);
      return;
    }
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

  /** Furniture and pillars that look like the place: desks, lockers, rocks, counters. */
  private paintStyledBlock(g: Phaser.GameObjects.Graphics, c: number, r: number, tall: boolean, kind: string): void {
    const p = this.biome.palette;
    const x = (c + 1) * TILE;
    const y = (r + 1) * TILE;
    const k = c * 17 + r * 31;
    g.fillStyle(0x000000, 0.22);
    g.fillEllipse(x + TILE / 2, y + TILE - 3, TILE * 0.95, 12);
    switch (kind) {
      case 'lockers': {
        // A bank of two lockers.
        for (let i = 0; i < 2; i++) {
          const lx = x + 4 + i * (TILE / 2 - 4);
          g.fillStyle(i ? shade(p.wall, 0.08) : p.wall, 1);
          g.fillRect(lx, y - 14, TILE / 2 - 4, TILE + 8);
          g.lineStyle(2, INK, 1);
          g.strokeRect(lx, y - 14, TILE / 2 - 4, TILE + 8);
          g.lineStyle(2, shade(p.wall, -0.35), 1);
          for (let v = 0; v < 3; v++) g.lineBetween(lx + 6, y - 6 + v * 5, lx + TILE / 2 - 10, y - 6 + v * 5);
          g.fillStyle(0xdfe6ee, 1);
          g.fillRect(lx + TILE / 2 - 12, y + 16, 4, 10);
        }
        g.fillStyle(p.wallTop, 1);
        g.fillRect(x + 4, y - 20, TILE - 8, 7);
        break;
      }
      case 'hills': {
        // A lumpy pastel mound.
        g.fillStyle(p.wall, 1);
        g.fillEllipse(x + TILE / 2, y + TILE * 0.5, TILE * 1.02, TILE * 0.95);
        g.fillStyle(p.wallTop, 1);
        g.fillEllipse(x + TILE / 2 + jitter(k, 1) * 5, y + TILE * 0.32, TILE * 0.8, TILE * 0.55);
        g.fillStyle(0xffffff, 0.25);
        g.fillEllipse(x + TILE * 0.36, y + TILE * 0.24, 14, 7);
        g.lineStyle(3, INK, 1);
        g.strokeEllipse(x + TILE / 2, y + TILE * 0.5, TILE * 1.02, TILE * 0.95);
        break;
      }
      case 'panels':
      case 'counter': {
        // A grey kiosk or counter with a lit stripe.
        const lift = tall ? 16 : 8;
        g.fillStyle(p.wall, 1);
        g.fillRoundedRect(x + 4, y + 4 - lift, TILE - 8, TILE - 6 + lift, 4);
        g.fillStyle(p.wallTop, 1);
        g.fillRoundedRect(x + 4, y + 4 - lift, TILE - 8, TILE * 0.4, 4);
        g.fillStyle(p.accent, 0.9);
        g.fillRect(x + 8, y + TILE * 0.52, TILE - 16, 4);
        g.lineStyle(3, INK, 1);
        g.strokeRoundedRect(x + 4, y + 4 - lift, TILE - 8, TILE - 6 + lift, 4);
        break;
      }
      case 'desk': {
        // A school desk: a wooden top on metal legs, with a book on it now and then.
        g.lineStyle(3, 0x5a5a6e, 1);
        g.lineBetween(x + 12, y + 30, x + 12, y + TILE - 6);
        g.lineBetween(x + TILE - 12, y + 30, x + TILE - 12, y + TILE - 6);
        g.fillStyle(p.block, 1);
        g.fillRoundedRect(x + 5, y + 12, TILE - 10, 22, 5);
        g.fillStyle(p.blockTop, 1);
        g.fillRoundedRect(x + 5, y + 8, TILE - 10, 16, 5);
        g.lineStyle(3, INK, 1);
        g.strokeRoundedRect(x + 5, y + 8, TILE - 10, 26, 5);
        if (jitter(k, 2) > 0.3) {
          g.fillStyle([0xe0484d, 0x3f6fb5, 0x97ce4c][Math.abs(Math.round(jitter(k, 3) * 2))], 1);
          g.fillRect(x + 18, y + 11, 16, 9);
        }
        break;
      }
      case 'rock': {
        g.fillStyle(p.block, 1);
        g.fillEllipse(x + TILE / 2, y + TILE * 0.6, TILE * 0.9, TILE * 0.7);
        g.fillStyle(p.blockTop, 1);
        g.fillEllipse(x + TILE / 2 + jitter(k, 4) * 4, y + TILE * 0.46, TILE * 0.66, TILE * 0.42);
        g.lineStyle(3, INK, 1);
        g.strokeEllipse(x + TILE / 2, y + TILE * 0.6, TILE * 0.9, TILE * 0.7);
        break;
      }
      case 'cabin': {
        // A galley cart bay: grey lockers with a lit call button.
        const lift = tall ? 16 : 8;
        g.fillStyle(p.wall, 1);
        g.fillRoundedRect(x + 4, y + 4 - lift, TILE - 8, TILE - 6 + lift, 6);
        g.lineStyle(2, shade(p.wall, -0.3), 1);
        g.lineBetween(x + TILE / 2, y + 8 - lift, x + TILE / 2, y + TILE - 6);
        g.fillStyle(p.accent, 1);
        g.fillCircle(x + TILE / 2, y + 12 - lift, 3);
        g.lineStyle(3, INK, 1);
        g.strokeRoundedRect(x + 4, y + 4 - lift, TILE - 8, TILE - 6 + lift, 6);
        break;
      }
      case 'seat': {
        // A pair of plane seats with headrests and a stripe of seat-belt.
        for (let i = 0; i < 2; i++) {
          const sx = x + 4 + i * (TILE / 2 - 2);
          const sw = TILE / 2 - 6;
          g.fillStyle(p.block, 1);
          g.fillRoundedRect(sx, y + 2, sw, TILE - 6, 6);
          g.fillStyle(p.blockTop, 1);
          g.fillRoundedRect(sx + 2, y - 6, sw - 4, 16, 5);
          g.fillStyle(0xf4efe6, 0.9);
          g.fillRect(sx + 4, y - 3, sw - 8, 5);
          g.fillStyle(shade(p.block, -0.3), 1);
          g.fillRect(sx + 2, y + TILE * 0.55, sw - 4, 4);
          g.lineStyle(2.5, INK, 1);
          g.strokeRoundedRect(sx, y - 6, sw, TILE, 6);
        }
        break;
      }
      case 'toy': {
        // A big alphabet block.
        const colors = [0xe0484d, 0x3f6fb5, 0xf2c14e, 0x97ce4c];
        const col = colors[Math.abs(Math.round(jitter(k, 5) * 3))];
        const lift = 10;
        g.fillStyle(shade(col, -0.25), 1);
        g.fillRoundedRect(x + 6, y + 6, TILE - 12, TILE - 10, 4);
        g.fillStyle(col, 1);
        g.fillRoundedRect(x + 6, y + 6 - lift, TILE - 12, TILE - 14, 4);
        g.fillStyle(0xfdf6e3, 1);
        g.fillRoundedRect(x + 16, y + 12 - lift, TILE - 32, TILE - 28, 3);
        g.lineStyle(3, shade(col, -0.35), 1);
        const L = Math.abs(Math.round(jitter(k, 6) * 2));
        const cx = x + TILE / 2;
        const cy = y + TILE / 2 - lift - 2;
        if (L === 0) {
          g.lineBetween(cx - 6, cy + 7, cx, cy - 7);
          g.lineBetween(cx, cy - 7, cx + 6, cy + 7);
          g.lineBetween(cx - 3, cy + 2, cx + 3, cy + 2);
        } else if (L === 1) {
          g.lineBetween(cx - 5, cy - 7, cx - 5, cy + 7);
          g.strokeCircle(cx - 1, cy - 3, 4);
          g.strokeCircle(cx - 1, cy + 4, 4);
        } else {
          g.beginPath();
          g.arc(cx, cy, 7, 0.6, Math.PI * 2 - 0.6, false);
          g.strokePath();
        }
        g.lineStyle(3, INK, 1);
        g.strokeRoundedRect(x + 6, y + 6 - lift, TILE - 12, TILE - 4 + lift - 10, 4);
        break;
      }
      case 'hedge': {
        // A trimmed round hedge.
        g.fillStyle(p.block, 1);
        g.fillEllipse(x + TILE / 2, y + TILE * 0.55, TILE * 0.95, TILE * 0.8);
        g.fillStyle(p.blockTop, 1);
        for (let i = 0; i < 4; i++) g.fillCircle(x + 14 + i * 10 + jitter(k, i) * 3, y + TILE * 0.38 + jitter(k, i + 5) * 4, 9);
        g.lineStyle(3, INK, 1);
        g.strokeEllipse(x + TILE / 2, y + TILE * 0.55, TILE * 0.95, TILE * 0.8);
        break;
      }
      case 'house':
      case 'furniture': {
        // A cabinet or a stack of boxes.
        const lift = tall ? 14 : 6;
        g.fillStyle(p.block, 1);
        g.fillRoundedRect(x + 6, y + 6 - lift, TILE - 12, TILE - 8 + lift, 5);
        g.fillStyle(p.blockTop, 1);
        g.fillRoundedRect(x + 6, y + 6 - lift, TILE - 12, 12, 5);
        g.lineStyle(2, shade(p.block, -0.35), 1);
        g.lineBetween(x + TILE / 2, y + 12 - lift + 6, x + TILE / 2, y + TILE - 6);
        g.fillStyle(0xffd54a, 1);
        g.fillCircle(x + TILE / 2 - 5, y + TILE / 2, 2.5);
        g.fillCircle(x + TILE / 2 + 5, y + TILE / 2, 2.5);
        g.lineStyle(3, INK, 1);
        g.strokeRoundedRect(x + 6, y + 6 - lift, TILE - 12, TILE - 8 + lift, 5);
        break;
      }
    }
  }

  private paintWalls(g: Phaser.GameObjects.Graphics, gaps: Set<string>): void {
    const walls = this.biome.style?.walls ?? 'bricks';
    if (walls !== 'bricks') {
      this.paintStyledWalls(g, gaps, walls);
      return;
    }
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

  /** Walls that look like the place: lockers, lumpy hills, metal panels, wallpaper. */
  private paintStyledWalls(g: Phaser.GameObjects.Graphics, gaps: Set<string>, walls: 'lockers' | 'hills' | 'panels' | 'house' | 'cabin'): void {
    const p = this.biome.palette;
    const W = this.widthPx;
    const H = this.heightPx;
    g.fillStyle(p.wall, 1);
    g.fillRect(0, 0, W, TILE);
    g.fillRect(0, H - TILE, W, TILE);
    g.fillRect(0, 0, TILE, H);
    g.fillRect(W - TILE, 0, TILE, H);
    switch (walls) {
      case 'lockers': {
        // A row of lockers along the top wall; painted cinder block on the other sides.
        const lw = TILE / 2;
        for (let x = TILE; x < W - TILE; x += lw) {
          const i = Math.round(x / lw);
          g.fillStyle(i % 2 ? p.wall : shade(p.wall, 0.07), 1);
          g.fillRect(x + 1, 4, lw - 2, TILE - 6);
          g.lineStyle(2, shade(p.wall, -0.35), 1);
          for (let v = 0; v < 3; v++) g.lineBetween(x + 6, 12 + v * 5, x + lw - 6, 12 + v * 5);
          g.fillStyle(0xdfe6ee, 1);
          g.fillRect(x + lw - 9, TILE * 0.55, 3, 9);
          g.lineStyle(2, INK, 0.8);
          g.strokeRect(x + 1, 4, lw - 2, TILE - 6);
        }
        g.fillStyle(p.wallTop, 1);
        g.fillRect(0, 0, W, 5);
        g.lineStyle(2, shade(p.wall, -0.2), 1);
        for (let y = TILE; y < H; y += TILE / 3) {
          g.lineBetween(0, y, TILE, y);
          g.lineBetween(W - TILE, y, W, y);
        }
        for (let x = 0; x < W; x += TILE / 2) g.lineBetween(x, H - TILE, x, H);
        break;
      }
      case 'hills': {
        // Lumpy pastel hills all the way around.
        const hump = (cx: number, cy: number, rx: number, ry: number) => {
          g.fillStyle(p.wallTop, 1);
          g.fillEllipse(cx, cy, rx, ry);
          g.fillStyle(0xffffff, 0.18);
          g.fillEllipse(cx - rx * 0.18, cy - ry * 0.18, rx * 0.35, ry * 0.25);
        };
        for (let x = 0; x < W + TILE; x += TILE * 0.8) {
          const j = jitter(x, 1) * 8;
          hump(x, TILE * 0.45 + j, TILE * 1.1, TILE * 0.9);
          hump(x + TILE * 0.3, H - TILE * 0.4 + j, TILE * 1.1, TILE * 0.8);
        }
        for (let y = 0; y < H + TILE; y += TILE * 0.8) {
          const j = jitter(y, 2) * 8;
          hump(TILE * 0.4 + j, y, TILE * 0.9, TILE * 1.1);
          hump(W - TILE * 0.4 + j, y + TILE * 0.3, TILE * 0.9, TILE * 1.1);
        }
        break;
      }
      case 'panels': {
        // Grey bureaucracy: metal panels with rivets and a hazard stripe at the bottom of the wall.
        for (let x = 0; x < W; x += TILE) {
          g.fillStyle(x % (TILE * 2) ? p.wall : shade(p.wall, 0.06), 1);
          g.fillRect(x + 1, 1, TILE - 2, TILE - 12);
          g.fillStyle(shade(p.wall, 0.25), 1);
          for (const [dx, dy] of [[5, 5], [TILE - 7, 5]]) g.fillCircle(x + dx, dy, 2);
        }
        for (let x = TILE; x < W - TILE; x += 16) {
          g.fillStyle(Math.round(x / 16) % 2 ? 0xffd54a : 0x1a1424, 1);
          g.fillRect(x, TILE - 11, 16, 7);
        }
        g.lineStyle(2, shade(p.wall, -0.3), 1);
        for (let y = TILE; y < H; y += TILE) {
          g.lineBetween(0, y, TILE, y);
          g.lineBetween(W - TILE, y, W, y);
        }
        break;
      }
      case 'cabin': {
        // A plane cabin: overhead bins along the top, round windows full of sky on the sides.
        g.fillStyle(p.wallTop, 1);
        g.fillRect(0, 0, W, TILE * 0.45);
        g.lineStyle(2, shade(p.wallTop, -0.3), 1);
        for (let x = TILE; x < W - TILE; x += TILE * 1.5) g.lineBetween(x, 4, x, TILE * 0.45 - 2);
        const window = (wx: number, wy: number) => {
          g.fillStyle(0xbfe4ff, 1);
          g.fillEllipse(wx, wy, 18, 24);
          g.fillStyle(0xffffff, 0.9);
          g.fillEllipse(wx - 3, wy + 4, 10, 5);
          g.lineStyle(2.5, INK, 1);
          g.strokeEllipse(wx, wy, 18, 24);
        };
        for (let x = TILE * 1.5; x < W - TILE; x += TILE) window(x, TILE * 0.72);
        for (let y = TILE * 1.5; y < H - TILE; y += TILE) {
          window(TILE * 0.5, y);
          window(W - TILE * 0.5, y);
        }
        g.fillStyle(shade(p.wall, -0.15), 1);
        g.fillRect(0, H - TILE * 0.35, W, TILE * 0.35);
        break;
      }
      case 'house': {
        // Wallpaper stripes with a baseboard, and a picture frame here and there.
        for (let x = 0; x < W; x += 12) {
          g.fillStyle(Math.round(x / 12) % 2 ? p.wall : shade(p.wall, 0.06), 1);
          g.fillRect(x, 0, 12, TILE);
        }
        g.fillStyle(p.wallTop, 1);
        g.fillRect(TILE, TILE - 10, W - TILE * 2, 8);
        for (let x = TILE * 2; x < W - TILE * 2; x += TILE * 4) {
          g.fillStyle(0x8b5a2b, 1);
          g.fillRect(x, 10, 34, 26);
          g.fillStyle([0x9fc9f0, 0xf2c14e, 0x97ce4c][Math.round(x / TILE) % 3], 1);
          g.fillRect(x + 4, 14, 26, 18);
        }
        break;
      }
    }
    g.lineStyle(4, INK, 1);
    g.strokeRect(TILE, TILE, W - TILE * 2, H - TILE * 2);
    g.strokeRect(2, 2, W - 4, H - 4);
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
