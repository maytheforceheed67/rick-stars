/**
 * The walk for people who aren't the player's physics body: characters walking in scenes, and
 * Morty in the garage. Whatever moves the image reports how far it went, and the walker turns
 * that into the same walk Morty has in a run: stride frames timed to the ground covered, two
 * bobs per stride, a lean into the way they're going, a little settle when they stop, and
 * breathing while they stand.
 */
import type Phaser from 'phaser';
import { FEEL } from '../../content/balance';
import { poseKey } from '../art/textures';
import { WalkCycle } from './motion';

export class Walker {
  private readonly cycle = new WalkCycle();
  /** Their standing texture; the walk frames are baked from it (SpriteArt.poses). */
  private base: string;
  /** Where the image is pinned to its position, before the bob lifts it. */
  private originY: number;
  private readonly scaleX: number;
  private readonly scaleY: number;
  /** Ground covered since the last update. */
  private moved = 0;
  private movedX = 0;
  private walking = false;
  private lean = 0;
  private settle = 0;
  private t: number;

  /** `top` is how fast they usually walk (px/s): the bob and the lean are measured against it. */
  constructor(
    private readonly img: Phaser.GameObjects.Image,
    private readonly top: number,
  ) {
    this.base = img.texture.key;
    this.originY = img.originY;
    this.scaleX = img.scaleX;
    this.scaleY = img.scaleY;
    // Out of step with whoever else is standing around.
    this.t = (img.x * 0.013 + img.y * 0.007) % 3;
  }

  /** New art (a pose, a new shirt), already set on the image: the walk frames come from it now. */
  setBase(key: string): void {
    this.base = key;
    this.originY = this.img.originY;
  }

  /** They moved this far since the last update. */
  moveBy(dx: number, dy: number): void {
    this.moved += Math.hypot(dx, dy);
    this.movedX += dx;
  }

  get isWalking(): boolean {
    return this.walking;
  }

  /**
   * Once a frame, after they've moved. `busy` leaves the image's scale to a tween that has it
   * (popping out of a portal, a jump).
   */
  update(dt: number, busy = false): void {
    if (dt <= 0) return;
    const M = FEEL.move;
    const img = this.img;
    this.t += dt;
    const speed = this.moved / dt;
    const walking = speed > this.top * 0.15;
    if (walking) this.cycle.advance(this.moved);
    else if (this.walking) {
      // Pulling up: a little squash, and the next walk starts on a fresh step.
      this.settle = M.squash;
      this.cycle.reset();
    }
    this.walking = walking;
    const pose = walking ? poseKey(this.base, this.cycle.stride, 0) : this.base;
    const key = img.scene.textures.exists(pose) ? pose : this.base;
    if (img.texture.key !== key) img.setTexture(key);
    // The bob lifts the drawing off its spot without moving where they stand.
    const bob = walking ? this.cycle.bob(M.bobPx * Math.min(1, speed / this.top)) : 0;
    img.setOrigin(img.originX, this.originY - bob / img.frame.height);
    const lean = walking ? M.leanDeg * Math.max(-1, Math.min(1, this.movedX / dt / this.top)) : 0;
    this.lean += (lean - this.lean) * (1 - Math.exp(-dt * 25));
    img.setAngle(this.lean);
    this.settle *= Math.exp(-dt / (M.squashSeconds / 3));
    const breath = walking ? 0 : Math.sin(this.t * Math.PI * 2 * M.breathRate) * M.breathe;
    if (!busy) img.setScale(this.scaleX * (1 + this.settle - breath * 0.5), this.scaleY * (1 - this.settle + breath));
    this.moved = 0;
    this.movedX = 0;
  }
}
