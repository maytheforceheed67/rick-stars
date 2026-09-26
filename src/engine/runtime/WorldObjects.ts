/**
 * Things lying around a room: pickups (Scrap, hearts, fruit), item pedestals (free, shop or
 * pick-one-of-three) and props (bombs, desks, signs, exits), plus the "press E" prompt.
 */
import Phaser from 'phaser';
import { TEXTURE_PAD } from '../art/textures';
import type { ContentId, ItemDef, PickupDef, PropHandle, PropSpec, Vec } from '../types';
import { textStyle } from '../ui/text';

export class PickupObj {
  collected = false;
  vx: number;
  vy: number;
  private t = 0;
  readonly img: Phaser.GameObjects.Image;

  constructor(
    scene: Phaser.Scene,
    readonly def: PickupDef,
    public x: number,
    public y: number,
    pop: Vec,
  ) {
    this.img = scene.add.image(x, y, def.art).setDepth(y);
    this.vx = pop.x;
    this.vy = pop.y;
  }

  update(dt: number): void {
    this.t += dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const d = Math.exp(-dt * 6);
    this.vx *= d;
    this.vy *= d;
    this.img.setPosition(this.x, this.y - 4 + Math.sin(this.t * 4) * 3).setDepth(this.y);
  }

  destroy(): void {
    this.img.destroy();
  }
}

/** Something on a pedestal: an item, or (in shops) a pickup like a heart. */
export interface Ware {
  item?: ItemDef;
  pickup?: PickupDef;
}

export class PedestalObj {
  taken = false;
  /**
   * A freshly dropped item can't be picked up until Morty has stepped away from it, so a swap
   * never bounces straight back.
   */
  armed = true;
  readonly base: Phaser.GameObjects.Image;
  readonly icon: Phaser.GameObjects.Image;
  readonly label: Phaser.GameObjects.Text;
  readonly priceTag?: Phaser.GameObjects.Text;
  private t = 0;

  constructor(
    scene: Phaser.Scene,
    readonly ware: Ware,
    readonly x: number,
    readonly y: number,
    readonly price: number | undefined,
    readonly group: string | undefined,
    readonly charge?: number,
  ) {
    this.base = scene.add.image(x, y + 8, 'pedestal').setDepth(y);
    const tex = ware.item ? `icon-${ware.item.id}` : (ware.pickup?.art ?? '__MISSING');
    this.icon = scene.add.image(x, y - 22, tex).setDepth(y + 1).setScale(ware.item ? 1.25 : 1);
    this.label = scene.add.text(x, y - 58, this.name, textStyle(15, '#ffffff')).setOrigin(0.5, 1).setDepth(5100).setAlpha(0);
    if (price !== undefined) {
      this.priceTag = scene.add.text(x, y + 30, `${price} Scrap`, textStyle(15, '#ffd54a')).setOrigin(0.5, 0).setDepth(5100);
    }
  }

  get name(): string {
    return this.ware.item?.name ?? this.ware.pickup?.name ?? '???';
  }

  update(dt: number, near: boolean): void {
    this.t += dt;
    this.icon.setY(this.y - 24 + Math.sin(this.t * 3) * 4);
    this.label.setAlpha(near ? 1 : 0);
  }

  destroy(): void {
    this.base.destroy();
    this.icon.destroy();
    this.label.destroy();
    this.priceTag?.destroy();
  }
}

export class PropObj implements PropHandle {
  readonly img: Phaser.GameObjects.Image;
  interact: PropSpec['interact'] | null;
  private blocker?: Phaser.GameObjects.Zone;
  private pulseTween?: Phaser.Tweens.Tween;
  destroyed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    spec: PropSpec,
    blockers: Phaser.Physics.Arcade.StaticGroup,
  ) {
    this.img = scene.add.image(spec.x, spec.y, spec.art);
    // Props stand on their feet like characters.
    const fh = this.img.frame.height;
    this.img.setOrigin(0.5, (fh - TEXTURE_PAD - 6) / fh);
    this.img.setDepth(spec.depth ?? spec.y);
    this.interact = spec.interact ?? null;
    if (spec.solid) {
      const r = spec.radius ?? Math.min(this.img.width, 60) * 0.4;
      this.blocker = scene.add.zone(spec.x, spec.y - r * 0.4, r * 2, r * 1.4);
      scene.physics.add.existing(this.blocker, true);
      blockers.add(this.blocker);
    }
  }

  get x(): number {
    return this.img.x;
  }
  get y(): number {
    return this.img.y;
  }

  setArt(art: string): void {
    this.img.setTexture(art);
  }

  setInteract(interact: PropSpec['interact'] | null): void {
    this.interact = interact ?? null;
  }

  setVisible(visible: boolean): void {
    this.img.setVisible(visible);
  }

  pulse(): void {
    this.pulseTween?.stop();
    this.img.setScale(1);
    this.pulseTween = this.scene.tweens.add({ targets: this.img, scale: 1.12, duration: 160, yoyo: true, repeat: 1 });
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.pulseTween?.stop();
    this.blocker?.destroy();
    this.img.destroy();
  }
}

export interface Interactable {
  x: number;
  y: number;
  label: string;
  act(): void;
}

export class WorldObjects {
  pickups: PickupObj[] = [];
  pedestals: PedestalObj[] = [];
  props: PropObj[] = [];
  readonly blockers: Phaser.Physics.Arcade.StaticGroup;
  private readonly prompt: Phaser.GameObjects.Text;

  constructor(private readonly scene: Phaser.Scene) {
    this.blockers = scene.physics.add.staticGroup();
    this.prompt = scene.add.text(0, 0, '', textStyle(16, '#ffffff')).setOrigin(0.5, 1).setDepth(5300).setVisible(false);
  }

  spawnPickup(def: PickupDef, x: number, y: number, pop: Vec = { x: 0, y: 0 }): PickupObj {
    const p = new PickupObj(this.scene, def, x, y, pop);
    this.pickups.push(p);
    return p;
  }

  spawnPedestal(ware: Ware, x: number, y: number, price?: number, group?: string, opts: { charge?: number; armed?: boolean } = {}): PedestalObj {
    const p = new PedestalObj(this.scene, ware, x, y, price, group, opts.charge);
    p.armed = opts.armed ?? true;
    this.pedestals.push(p);
    return p;
  }

  addProp(spec: PropSpec): PropObj {
    const p = new PropObj(this.scene, spec, this.blockers);
    this.props.push(p);
    return p;
  }

  update(dt: number, player: Vec, magnet: number, collect: (p: PickupObj) => boolean): void {
    for (const p of this.pickups) {
      if (p.collected) continue;
      const dx = player.x - p.x;
      const dy = player.y - p.y;
      const d = Math.hypot(dx, dy);
      if (p.def.magnetic && magnet > 0 && d < magnet && d > 1) {
        p.vx += (dx / d) * 900 * dt;
        p.vy += (dy / d) * 900 * dt;
      }
      p.update(dt);
      if (d < 30 && collect(p)) {
        p.collected = true;
        p.destroy();
      }
    }
    this.pickups = this.pickups.filter((p) => !p.collected);
    this.props = this.props.filter((p) => !p.destroyed);
  }

  /** Nearest thing the player can press E on, and shows the prompt over it. */
  nearestInteractable(player: Vec, pedestalLabel: (p: PedestalObj) => string, onPedestal: (p: PedestalObj) => void): Interactable | null {
    let best: Interactable | null = null;
    let bestD = 78;
    for (const p of this.pedestals) {
      if (p.taken) continue;
      const d = Math.hypot(player.x - p.x, player.y - p.y);
      if (!p.armed) {
        if (d > 110) p.armed = true;
        continue;
      }
      p.update(0, d < 110);
      if (d < bestD) {
        bestD = d;
        best = { x: p.x, y: p.y - 60, label: pedestalLabel(p), act: () => onPedestal(p) };
      }
    }
    for (const prop of this.props) {
      if (!prop.interact || prop.destroyed) continue;
      const d = Math.hypot(player.x - prop.x, player.y - prop.y);
      if (d < bestD + 10) {
        bestD = d;
        const i = prop.interact;
        best = { x: prop.x, y: prop.y - prop.img.displayHeight * prop.img.originY - 4, label: i.label, act: () => i.fn() };
      }
    }
    if (best) this.prompt.setText(`[E] ${best.label}`).setPosition(best.x, best.y).setVisible(true);
    else this.prompt.setVisible(false);
    return best;
  }

  tickPedestals(dt: number): void {
    for (const p of this.pedestals) if (!p.taken) p.update(dt, p.label.alpha > 0);
  }

  removePedestal(p: PedestalObj): void {
    p.taken = true;
    p.destroy();
    this.pedestals = this.pedestals.filter((x) => x !== p);
  }

  pedestalsInGroup(group: ContentId): PedestalObj[] {
    return this.pedestals.filter((p) => p.group === group);
  }

  clear(): void {
    this.pickups.forEach((p) => p.destroy());
    this.pedestals.forEach((p) => p.destroy());
    this.props.forEach((p) => p.destroy());
    this.pickups = [];
    this.pedestals = [];
    this.props = [];
    // On scene shutdown Phaser may have destroyed the group already.
    if (this.blockers.children) this.blockers.clear(true, true);
    if (this.prompt.scene) this.prompt.setVisible(false);
  }
}
