/**
 * The weapon Morty visibly holds. An arm reaches from his shoulder on the aim's side, the weapon
 * sits in his hand pointing at the cursor, and every shot kicks it back and tips it up. A thrown
 * weapon puts the next thing he'll throw in his hand, and each throw swings through.
 *
 * Where everything goes is pure math in aim.ts; this draws it.
 */
import Phaser from 'phaser';
import { FEEL } from '../../content/balance';
import { TEXTURE_PAD } from '../art/textures';
import type { CharacterDef, Vec, WeaponSpec } from '../types';
import { holdFor, rigPose, type Hold, type RigPose, type Side } from './aim';

const INK = 0x1a1424;
/** A held sprite's hand position: this far from its left edge, halfway up. */
export const HELD_GRIP_X = 6;
const DEFAULT_SHOULDER: Vec = { x: 10, y: -14 };

export class HeldWeapon {
  private readonly arm: Phaser.GameObjects.Graphics;
  private readonly item: Phaser.GameObjects.Image;
  private readonly hand: Phaser.GameObjects.Image;
  private weapon: WeaponSpec | null = null;
  private shoulder: Vec = DEFAULT_SHOULDER;
  private hold: Hold = holdFor(DEFAULT_SHOULDER, undefined);
  private sleeve = 0xf7d747;
  private skin = 0xf3c9a2;
  /** Seconds since the last shot (the recoil and the swing play out over the first moments). */
  private sinceShot = Infinity;
  private behind = false;
  side: Side = 1;
  /** Where everything was drawn this frame (null while hidden). */
  pose: RigPose | null = null;
  /** For a thrown weapon: the sprite of the next thing he'll throw. */
  nextThrown: () => string | null = () => null;

  constructor(private readonly scene: Phaser.Scene) {
    this.arm = scene.add.graphics().setVisible(false);
    this.item = scene.add.image(0, 0, 'held-gun').setVisible(false);
    this.hand = scene.add.image(0, 0, 'held-hand').setVisible(false);
  }

  get armed(): boolean {
    return !!this.weapon;
  }

  private get thrown(): boolean {
    return this.weapon?.style === 'thrown';
  }

  /** How big this weapon's flash and kick are (1 = Rick's spare ray gun). */
  get size(): number {
    return this.weapon?.flash ?? 1;
  }

  setCharacter(holds: CharacterDef['holds']): void {
    this.shoulder = holds?.shoulder ?? DEFAULT_SHOULDER;
    if (holds) {
      this.sleeve = holds.sleeve;
      this.skin = holds.skin;
    }
    this.hold = holdFor(this.shoulder, this.weapon ?? undefined);
  }

  /** The arm's color follows the shirt (a Garage shirt, an item's look). */
  setSleeve(color: number): void {
    this.sleeve = color;
  }

  setWeapon(weapon: WeaponSpec | null): void {
    this.weapon = weapon;
    this.hold = holdFor(this.shoulder, weapon ?? undefined);
    this.sinceShot = Infinity;
  }

  /** Where everything is for a body at `body` aiming at a point (or along an angle), keeping the current side. */
  poseAt(body: Vec, aim: Vec | number): RigPose {
    return rigPose(body, aim, this.hold, this.side);
  }

  /** A shot just left: the gun kicks, or the arm swings through. */
  fire(): void {
    this.sinceShot = 0;
  }

  /**
   * Draws it for this frame at a body (as drawn, bob included). `depth` is the body's; the weapon
   * goes behind him when he aims up.
   */
  update(dt: number, body: Vec, aim: Vec | number, show: boolean, alpha: number, depth: number): void {
    this.sinceShot += dt;
    if (!this.weapon || !show) {
      this.hide();
      return;
    }
    const pose = rigPose(body, aim, this.hold, this.side);
    this.side = pose.side;
    this.pose = pose;
    const up = Math.sin(pose.angle);
    if (up < -0.35) this.behind = true;
    else if (up > -0.2) this.behind = false;
    const d = depth + (this.behind ? -0.3 : 0.3);
    const W = FEEL.weapon;
    let angle = pose.angle;
    let hand = pose.hand;
    if (this.thrown) {
      // The follow-through: the arm swings on past the aim and comes back.
      const u = Math.min(1, this.sinceShot / W.swingSeconds);
      if (u < 1) {
        angle += this.side * Phaser.Math.DegToRad(W.swingDeg) * Math.sin(Math.PI * u);
        const g = this.hold.grip;
        hand = { x: pose.shoulder.x + Math.cos(angle) * g.x, y: pose.shoulder.y + Math.sin(angle) * g.x };
      }
    } else {
      // The kick: back along the barrel and tipped up, settling within recoilSeconds.
      const k = Math.max(0, 1 - this.sinceShot / W.recoilSeconds);
      const ease = k * k;
      const kick = W.recoilPx * Math.max(0.75, Math.min(1.5, this.size)) * ease;
      angle -= this.side * Phaser.Math.DegToRad(W.recoilTipDeg) * ease;
      hand = { x: hand.x - Math.cos(pose.angle) * kick, y: hand.y - Math.sin(pose.angle) * kick };
    }

    // The arm: from the shoulder to the hand, in the sleeve's color with the usual dark outline.
    const g = this.arm;
    g.clear();
    g.lineStyle(7, INK, alpha);
    g.lineBetween(pose.shoulder.x, pose.shoulder.y, hand.x, hand.y);
    g.lineStyle(4.5, this.sleeve, alpha);
    g.lineBetween(pose.shoulder.x, pose.shoulder.y, hand.x, hand.y);
    g.setVisible(true).setDepth(d);

    const item = this.item;
    if (this.thrown) {
      // The next thing to throw, back in hand once the swing is over.
      const key = this.weapon.held ?? this.nextThrown();
      const back = this.sinceShot >= W.swingSeconds;
      if (key && back && this.scene.textures.exists(key)) {
        const grow = Math.min(1, (this.sinceShot - W.swingSeconds) / 0.08);
        if (item.texture.key !== key) item.setTexture(key);
        item
          .setOrigin(0.5, 0.5)
          .setPosition(hand.x + Math.cos(angle) * 5, hand.y + Math.sin(angle) * 5)
          .setRotation(0)
          .setFlipY(false)
          .setScale(0.8 * grow)
          .setAlpha(alpha)
          .setDepth(d + 0.01)
          .setVisible(true);
      } else {
        item.setVisible(false);
      }
    } else {
      const key = this.weapon.held && this.scene.textures.exists(this.weapon.held) ? this.weapon.held : 'held-gun';
      if (item.texture.key !== key) item.setTexture(key);
      const fw = item.frame.width;
      item
        .setOrigin((TEXTURE_PAD + HELD_GRIP_X) / fw, 0.5)
        .setPosition(hand.x, hand.y)
        .setRotation(angle)
        .setFlipY(this.side < 0)
        .setScale(1)
        .setAlpha(alpha)
        .setDepth(d + 0.01)
        .setVisible(true);
    }
    this.hand.setPosition(hand.x, hand.y).setTint(this.skin).setAlpha(alpha).setDepth(d + 0.02).setVisible(true);
  }

  hide(): void {
    this.pose = null;
    this.arm.setVisible(false);
    this.item.setVisible(false);
    this.hand.setVisible(false);
  }

  destroy(): void {
    this.arm.destroy();
    this.item.destroy();
    this.hand.destroy();
  }
}
