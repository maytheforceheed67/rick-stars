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

  private drawRunInfo(): void {
    const m = this.data0.model();
    const x = 560;
    const g = this.add.graphics();
    g.fillStyle(0x140f1f, 0.95);
    g.fillRoundedRect(x - 20, 100, 700, 560, 14);
    g.lineStyle(3, 0x4a3f63, 1);
    g.strokeRoundedRect(x - 20, 100, 700, 560, 14);
    const lines = [
      `Act ${m.actNumber}/${m.actCount}: ${m.actName}`,
      `Time ${formatTime(m.time)}    Seed ${formatSeed(m.seed)}    Scrap ${m.scrap}`,
      `Weapon: ${m.weapon.name}`,
      `Active: ${m.active ? `${m.active.name} (${m.active.charge}/${m.active.max})` : '-'}    Consumable: ${m.consumable?.name ?? '-'}`,
      `Statuses: ${m.statuses.length ? m.statuses.map((s) => s.name).join(', ') : 'none'}`,
    ];
    this.add.text(x, 120, lines.join('\n'), textStyle(17, '#ffffff', { lineSpacing: 8, wordWrap: { width: 660 } }));
    this.add.text(x, 280, 'Items', textStyle(18, '#ffe27a'));
    m.passives.forEach((p, i) => {
      const col = i % 8;
      const row = Math.floor(i / 8);
      const icon = this.add.image(x + 24 + col * 80, 330 + row * 70, `icon-${p.id}`).setScale(1.4);
      icon.setInteractive();
      const tip = this.add.text(icon.x, icon.y + 28, p.name, textStyle(11, '#d8d0e6', { align: 'center', wordWrap: { width: 76 } })).setOrigin(0.5, 0);
      tip.setAlpha(0.85);
    });
    if (!m.passives.length) this.add.text(x, 312, 'Nothing yet. Go find some stuff.', textStyle(15, '#8a8199'));
    if (m.mechanicHelp.length) this.add.text(x, 560, m.mechanicHelp.join('\n'), textStyle(14, '#b8b0c8', { wordWrap: { width: 660 } }));
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
