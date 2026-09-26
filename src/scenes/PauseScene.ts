/** Pause overlay: resume, settings, controls, quit, and a look at the current run. */
import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../engine/constants';
import { formatSeed } from '../engine/rng';
import type { HudModel } from '../engine/ui/hudModel';
import { CONTROLS_TEXT, Menu, settingsItems } from '../engine/ui/Menu';
import { displayStyle, formatTime, textStyle } from '../engine/ui/text';

interface PauseData {
  onResume: () => void;
  onQuit: () => void;
  model: () => HudModel;
}

export class PauseScene extends Phaser.Scene {
  private data0!: PauseData;
  private menu: Menu | null = null;
  private panel: Phaser.GameObjects.GameObject[] = [];
  private confirmQuit = false;

  constructor() {
    super('Pause');
  }

  init(data: PauseData): void {
    this.data0 = data;
    this.confirmQuit = false;
  }

  create(): void {
    this.menu = null;
    this.panel = [];
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b0814, 0.82).setOrigin(0);
    this.add.text(60, 60, 'PAUSED', displayStyle(56, '#97ce4c')).setOrigin(0, 0.5);
    this.drawRunInfo();
    this.showMain();
  }

  /** The run so far: everything Morty holds, each with exactly what it does. */
  private drawRunInfo(): void {
    const m = this.data0.model();
    const x = 540;
    const W = 720;
    const g = this.add.graphics();
    g.fillStyle(0x140f1f, 0.95);
    g.fillRoundedRect(x - 16, 88, W, 604, 14);
    g.lineStyle(3, 0x4a3f63, 1);
    g.strokeRoundedRect(x - 16, 88, W, 604, 14);
    const header = [
      `Act ${m.actNumber}/${m.actCount}: ${m.actName}`,
      `Time ${formatTime(m.time)}    Seed ${formatSeed(m.seed)}    Scrap ${m.scrap}`,
      `Statuses: ${m.statuses.length ? m.statuses.map((s) => s.name).join(', ') : 'none'}`,
    ];
    this.add.text(x, 102, header.join('\n'), textStyle(15, '#ffffff', { lineSpacing: 5, wordWrap: { width: W - 30 } }));
    let y = 178;
    /** One entry: icon, name, and its plain effect underneath. Returns its height. */
    const entry = (ex: number, ey: number, width: number, icon: string | null, name: string, effect: string, color = '#ffe27a'): number => {
      if (icon && this.textures.exists(icon)) this.add.image(ex + 14, ey + 14, icon).setScale(0.85);
      this.add.text(ex + 34, ey, name, textStyle(14, color));
      const e = this.add.text(ex + 34, ey + 18, effect, textStyle(12, '#d8d0e6', { wordWrap: { width: width - 40 } }));
      return Math.max(30, 20 + e.height) + 6;
    };
    const gear: [string, { id: string; name: string; effect: string } | null, string?][] = [
      ['Weapon', m.weapon],
      ['Active', m.active, m.active ? ` (${m.active.charge}/${m.active.max})` : ''],
      ['Consumable', m.consumable],
    ];
    const colW = (W - 30) / 2;
    let left = y;
    let right = y;
    gear.forEach(([slot, it, extra], i) => {
      const col = i === 0 ? 0 : 1;
      const ex = x + col * colW;
      const ey = col === 0 ? left : right;
      const h = it ? entry(ex, ey, colW, `icon-${it.id}`, `${slot}: ${it.name}${extra ?? ''}`, it.effect, '#9fdcff') : entry(ex, ey, colW, null, `${slot}: none`, '', '#6d6480');
      if (col === 0) left += h;
      else right += h;
    });
    y = Math.max(left, right) + 6;
    this.add.text(x, y, 'Items', textStyle(16, '#ffe27a'));
    y += 24;
    if (!m.passives.length) {
      this.add.text(x, y, 'Nothing yet. Go find some stuff.', textStyle(14, '#8a8199'));
      y += 26;
    } else {
      left = y;
      right = y;
      m.passives.forEach((p, i) => {
        const col = i % 2;
        const ex = x + col * colW;
        const h = entry(ex, col === 0 ? left : right, colW, `icon-${p.id}`, p.name, p.effect);
        if (col === 0) left += h;
        else right += h;
      });
      y = Math.max(left, right) + 4;
    }
    if (m.transformation) {
      y += entry(x, y, W - 30, null, `Transformed: ${m.transformation.name}`, m.transformation.effect, '#ff8fd8');
    }
    for (const s of m.synergies) y += entry(x, y, W - 30, null, `Synergy: ${s.name}`, s.effect, '#97ce4c');
    if (m.mechanicHelp.length && y < 640) this.add.text(x, Math.max(y + 4, 600), m.mechanicHelp.join('\n'), textStyle(13, '#b8b0c8', { wordWrap: { width: W - 30 } }));
  }

  private clearPanel(): void {
    this.menu?.destroy();
    this.menu = null;
    this.panel.forEach((o) => o.destroy());
    this.panel = [];
  }

  private resume(): void {
    this.scene.stop();
    this.data0.onResume();
  }

  private showMain(): void {
    this.clearPanel();
    this.menu = new Menu(
      this,
      60,
      130,
      [
        { label: 'Resume', onSelect: () => this.resume() },
        { label: 'Settings', onSelect: () => this.showSettings() },
        { label: 'Controls', onSelect: () => this.showControls() },
        {
          label: () => (this.confirmQuit ? 'Really quit? (half your Scrap is banked)' : 'Quit to the Garage'),
          onSelect: () => {
            if (!this.confirmQuit) {
              this.confirmQuit = true;
              return;
            }
            this.scene.stop();
            this.data0.onQuit();
          },
        },
      ],
      { width: 440, onBack: () => this.resume() },
    );
  }

  private showSettings(): void {
    this.clearPanel();
    this.menu = new Menu(this, 60, 130, settingsItems(() => this.showMain()), { width: 440, spacing: 56, onBack: () => this.showMain() });
  }

  private showControls(): void {
    this.clearPanel();
    const bg = this.add.graphics();
    bg.fillStyle(0x140f1f, 1);
    bg.fillRoundedRect(40, 120, 480, 420, 12);
    const t = this.add.text(56, 136, CONTROLS_TEXT, textStyle(14, '#ffffff', { fontFamily: 'monospace', lineSpacing: 6 }));
    this.panel.push(bg, t);
    this.menu = new Menu(this, 60, 560, [{ label: 'Back', onSelect: () => this.showMain() }], { width: 440, onBack: () => this.showMain() });
  }

  override update(): void {
    this.menu?.update();
  }
}
