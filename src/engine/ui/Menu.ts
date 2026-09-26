/**
 * Keyboard + mouse menu list. W/S or arrows move, A/D or left/right adjust sliders and toggles,
 * Enter/Space/E selects, Esc goes back. Hovering selects and clicking activates.
 */
import Phaser from 'phaser';
import { persist, svc } from '../services';
import { textStyle } from './text';

export interface MenuItem {
  label: string | (() => string);
  onSelect?: () => void;
  onLeft?: () => void;
  onRight?: () => void;
  enabled?: () => boolean;
  /** Small grey line under the label. */
  detail?: string | (() => string);
}

export interface MenuOptions {
  width?: number;
  spacing?: number;
  fontSize?: number;
  onBack?: () => void;
  depth?: number;
}

export class Menu {
  private index = 0;
  private readonly rows: { bg: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text; detail?: Phaser.GameObjects.Text; zone: Phaser.GameObjects.Zone }[] = [];
  private readonly keys: Record<string, Phaser.Input.Keyboard.Key>;
  private active = true;
  private readonly width: number;
  private readonly spacing: number;

  constructor(
    scene: Phaser.Scene,
    private readonly x: number,
    private readonly y: number,
    private readonly items: MenuItem[],
    private readonly opts: MenuOptions = {},
  ) {
    this.width = opts.width ?? 360;
    this.spacing = opts.spacing ?? 52;
    const size = opts.fontSize ?? 22;
    const depth = opts.depth ?? 10;
    items.forEach((item, i) => {
      const ry = y + i * this.spacing;
      const bg = scene.add.graphics().setDepth(depth);
      const label = scene.add.text(x + 18, ry + (item.detail ? 14 : 22), '', textStyle(size, '#ffffff')).setOrigin(0, 0.5).setDepth(depth + 1);
      const detail = item.detail ? scene.add.text(x + 18, ry + 36, '', textStyle(12, '#b8b0c8')).setOrigin(0, 0.5).setDepth(depth + 1) : undefined;
      const zone = scene.add.zone(x, ry, this.width, this.spacing - 8).setOrigin(0, 0).setInteractive({ useHandCursor: true }).setDepth(depth + 2);
      zone.on('pointerover', () => {
        if (!this.active || this.index === i) return;
        this.index = i;
        this.refresh();
      });
      zone.on('pointerdown', (p: Phaser.Input.Pointer) => {
        if (!this.active) return;
        this.index = i;
        const it = this.items[i];
        const localX = p.x - x;
        if (it.onLeft && localX < this.width * 0.3) this.adjust(-1);
        else if (it.onRight && localX > this.width * 0.7) this.adjust(1);
        else this.select();
      });
      this.rows.push({ bg, label, detail, zone });
    });
    const kb = scene.input.keyboard!;
    this.keys = kb.addKeys('W,S,A,D,UP,DOWN,LEFT,RIGHT,ENTER,SPACE,E,ESC', false) as Record<string, Phaser.Input.Keyboard.Key>;
    this.refresh();
  }

  setActive(on: boolean): void {
    this.active = on;
    this.rows.forEach((r) => r.zone.input && (r.zone.input.enabled = on));
    this.refresh();
  }

  /** Call from the scene's update(). */
  update(): void {
    if (!this.active) return;
    const JD = Phaser.Input.Keyboard.JustDown;
    const k = this.keys;
    if (JD(k.W) || JD(k.UP)) this.move(-1);
    if (JD(k.S) || JD(k.DOWN)) this.move(1);
    if (JD(k.A) || JD(k.LEFT)) this.adjust(-1);
    if (JD(k.D) || JD(k.RIGHT)) this.adjust(1);
    if (JD(k.ENTER) || JD(k.SPACE) || JD(k.E)) this.select();
    if (JD(k.ESC) && this.opts.onBack) {
      svc().audio.play('ui-back');
      this.opts.onBack();
    }
  }

  private enabled(i: number): boolean {
    return this.items[i].enabled?.() ?? true;
  }

  private move(dir: number): void {
    const n = this.items.length;
    for (let step = 1; step <= n; step++) {
      const next = (this.index + dir * step + n * 4) % n;
      if (this.enabled(next)) {
        this.index = next;
        break;
      }
    }
    svc().audio.play('ui-move');
    this.refresh();
  }

  private adjust(dir: number): void {
    const it = this.items[this.index];
    const fn = dir < 0 ? it.onLeft : it.onRight;
    if (!fn || !this.enabled(this.index)) return;
    fn();
    svc().audio.play('ui-move');
    this.refresh();
  }

  private select(): void {
    const it = this.items[this.index];
    if (!this.enabled(this.index)) {
      svc().audio.play('ui-deny');
      return;
    }
    if (it.onSelect) {
      svc().audio.play('ui-select');
      it.onSelect();
    } else if (it.onRight) {
      this.adjust(1);
    }
    this.refresh();
  }

  refresh(): void {
    this.rows.forEach((r, i) => {
      const it = this.items[i];
      const on = i === this.index && this.active;
      const enabled = this.enabled(i);
      const ry = this.y + i * this.spacing;
      r.bg.clear();
      r.bg.fillStyle(on ? 0x2f5a1e : 0x1c1629, on ? 0.95 : 0.8);
      r.bg.fillRoundedRect(this.x, ry, this.width, this.spacing - 8, 10);
      r.bg.lineStyle(2, on ? 0x97ce4c : 0x4a3f63, 1);
      r.bg.strokeRoundedRect(this.x, ry, this.width, this.spacing - 8, 10);
      const text = typeof it.label === 'function' ? it.label() : it.label;
      r.label.setText(it.onLeft || it.onRight ? `${text}` : text).setColor(enabled ? '#ffffff' : '#6d6480');
      if (r.detail && it.detail) r.detail.setText(typeof it.detail === 'function' ? it.detail() : it.detail);
    });
  }

  destroy(): void {
    this.rows.forEach((r) => {
      r.bg.destroy();
      r.label.destroy();
      r.detail?.destroy();
      r.zone.destroy();
    });
  }
}

/** The settings list used by the title screen, the garage and the pause menu. */
export function settingsItems(onBack: () => void): MenuItem[] {
  const s = () => svc().save.settings;
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const step = (v: number, d: number) => Math.round(Math.min(1, Math.max(0, v + d)) * 10) / 10;
  const save = () => persist();
  const speeds = ['slow', 'normal', 'fast'] as const;
  return [
    {
      label: () => `Music volume   ◀ ${pct(s().musicVolume)} ▶`,
      onLeft: () => {
        s().musicVolume = step(s().musicVolume, -0.1);
        save();
      },
      onRight: () => {
        s().musicVolume = step(s().musicVolume, 0.1);
        save();
      },
    },
    {
      label: () => `Sound effects   ◀ ${pct(s().sfxVolume)} ▶`,
      onLeft: () => {
        s().sfxVolume = step(s().sfxVolume, -0.1);
        save();
      },
      onRight: () => {
        s().sfxVolume = step(s().sfxVolume, 0.1);
        save();
        svc().audio.play('hit');
      },
    },
    {
      label: () => `Screen shake: ${s().screenShake ? 'On' : 'Off'}`,
      onSelect: () => {
        s().screenShake = !s().screenShake;
        save();
      },
    },
    {
      label: () => `Reduced flashing: ${s().reducedFlash ? 'On' : 'Off'}`,
      detail: 'Softer flashes, gentler blinking',
      onSelect: () => {
        s().reducedFlash = !s().reducedFlash;
        save();
      },
    },
    {
      label: () => `Text speed   ◀ ${s().textSpeed} ▶`,
      onLeft: () => {
        const i = speeds.indexOf(s().textSpeed);
        s().textSpeed = speeds[Math.max(0, i - 1)];
        save();
      },
      onRight: () => {
        const i = speeds.indexOf(s().textSpeed);
        s().textSpeed = speeds[Math.min(2, i + 1)];
        save();
      },
    },
    { label: 'Back', onSelect: onBack },
  ];
}

export const CONTROLS_TEXT = [
  'WASD ................ Move',
  'Arrow keys .......... Shoot in that direction',
  'Mouse ............... Aim',
  'Left click .......... Fire',
  'Space ............... Dash (brief invulnerability)',
  'Shift ............... Sneak (walk slowly)',
  'E ................... Interact / buy / take',
  'Q ................... Call Rick (when the meter is full)',
  'F ................... Episode gadget (e.g. grappling shoes)',
  'R ................... Use consumable',
  'Right click / C ..... Use active item',
  'Tab / M ............. Map',
  'Esc ................. Pause',
  '1-4 ................. Answer quiz questions',
].join('\n');
