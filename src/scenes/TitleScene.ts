/** Title screen: play, settings, controls, and the fan-game disclaimer. */
import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../engine/constants';
import { Rng } from '../engine/rng';
import { svc } from '../engine/services';
import { CONTROLS_TEXT, Menu, settingsItems } from '../engine/ui/Menu';
import { displayStyle, textStyle } from '../engine/ui/text';

export class TitleScene extends Phaser.Scene {
  private menu: Menu | null = null;
  private panel: Phaser.GameObjects.GameObject[] = [];
  private portal!: Phaser.GameObjects.Image;

  constructor() {
    super('Title');
  }

  create(): void {
    this.menu = null;
    this.panel = [];
    drawStarfield(this, 'title');
    this.portal = this.add.image(GAME_WIDTH * 0.74, GAME_HEIGHT * 0.52, 'exit-portal').setScale(3.4);
    this.add.image(GAME_WIDTH * 0.66, GAME_HEIGHT * 0.86, 'rick').setScale(2.4).setOrigin(0.5, 1);
    this.add.image(GAME_WIDTH * 0.8, GAME_HEIGHT * 0.86, 'morty').setScale(2.4).setOrigin(0.5, 1).setFlipX(true);

    this.add.text(80, 120, 'RICK-STARS', displayStyle(108, '#97ce4c', { strokeThickness: 14 })).setOrigin(0, 0.5);
    this.add.text(86, 190, 'An unofficial Rick and Morty roguelite', textStyle(22, '#f4efe6')).setOrigin(0, 0.5);
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 16, 'Unofficial fan game. Not affiliated with Adult Swim.  ·  All art and sound are made in code.', textStyle(14, '#b8b0c8')).setOrigin(0.5, 1);

    const problems = svc().problems;
    if (problems.length) {
      this.add
        .text(80, GAME_HEIGHT - 60, `Content check found ${problems.length} problem(s). See the browser console.`, textStyle(16, '#ff6a5a'))
        .setOrigin(0, 1);
    }
    this.showMain();
    svc().audio.music('title');
  }

  private clearPanel(): void {
    this.menu?.destroy();
    this.menu = null;
    this.panel.forEach((o) => o.destroy());
    this.panel = [];
  }

  private showMain(): void {
    this.clearPanel();
    this.menu = new Menu(this, 80, 250, [
      { label: 'Play', onSelect: () => this.scene.start('Garage') },
      { label: 'Settings', onSelect: () => this.showSettings() },
      { label: 'Controls', onSelect: () => this.showControls() },
    ]);
  }

  private showSettings(): void {
    this.clearPanel();
    this.menu = new Menu(this, 80, 240, settingsItems(() => this.showMain()), { width: 420, spacing: 56, onBack: () => this.showMain() });
  }

  private showControls(): void {
    this.clearPanel();
    const bg = this.add.graphics();
    bg.fillStyle(0x140f1f, 0.92);
    bg.fillRoundedRect(70, 230, 560, 400, 14);
    bg.lineStyle(3, 0x97ce4c, 1);
    bg.strokeRoundedRect(70, 230, 560, 400, 14);
    const text = this.add.text(94, 250, CONTROLS_TEXT, textStyle(16, '#ffffff', { fontFamily: 'monospace', lineSpacing: 6 }));
    this.panel.push(bg, text);
    this.menu = new Menu(this, 80, 640, [{ label: 'Back', onSelect: () => this.showMain() }], { onBack: () => this.showMain() });
  }

  override update(time: number): void {
    this.menu?.update();
    this.portal.setRotation(time / 4000);
  }
}

/** Shared starry background for menu scenes. */
export function drawStarfield(scene: Phaser.Scene, seed: string): void {
  const g = scene.add.graphics();
  const top = 0x0b0d17;
  const bottom = 0x1c1233;
  for (let i = 0; i < 12; i++) {
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.IntegerToColor(top), Phaser.Display.Color.IntegerToColor(bottom), 11, i);
    g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
    g.fillRect(0, (GAME_HEIGHT / 12) * i, GAME_WIDTH, GAME_HEIGHT / 12 + 1);
  }
  const rng = new Rng(`stars:${seed}`);
  for (let i = 0; i < 140; i++) {
    g.fillStyle(0xffffff, rng.float(0.3, 0.9));
    g.fillCircle(rng.float(0, GAME_WIDTH), rng.float(0, GAME_HEIGHT), rng.float(0.6, 2));
  }
}
