/**
 * Debug view: every character's portrait and world sprite side by side, so looks can be checked
 * against the show in one glance. Opened from the debug panel or rickStars.characterSheet().
 */
import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../engine/constants';
import { svc } from '../engine/services';
import type { CharacterDef } from '../engine/types';
import { textStyle } from '../engine/ui/text';

const COLS = 6;
const ROWS = 2;
const PORTRAIT = 150;

export class CharacterSheetScene extends Phaser.Scene {
  private page = 0;
  private resume: string[] = [];
  /** Kept out of a container: geometry masks misbehave on container children. */
  private shown: Phaser.GameObjects.GameObject[] = [];
  private pageLabel!: Phaser.GameObjects.Text;

  constructor() {
    super('CharacterSheet');
  }

  init(data: { resume?: string[] }): void {
    this.resume = data.resume ?? [];
    this.page = 0;
  }

  create(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x1d2536, 1).setInteractive();
    this.add.text(24, 14, 'CHARACTER SHEET', textStyle(22, '#97ce4c'));
    this.pageLabel = this.add.text(GAME_WIDTH - 24, 18, '', textStyle(14, '#b8b0c8')).setOrigin(1, 0);
    this.draw();
    const kb = this.input.keyboard!;
    kb.on('keydown-ESC', () => this.close());
    kb.on('keydown-LEFT', () => this.flip(-1));
    kb.on('keydown-RIGHT', () => this.flip(1));
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.flip(p.x < GAME_WIDTH / 2 ? -1 : 1));
  }

  private characters(): CharacterDef[] {
    return [...svc().registry.characters.values()];
  }

  private pages(): number {
    return Math.max(1, Math.ceil(this.characters().length / (COLS * ROWS)));
  }

  private flip(dir: number): void {
    const n = this.pages();
    this.page = (this.page + dir + n) % n;
    this.draw();
  }

  private draw(): void {
    this.shown.forEach((o) => o.destroy());
    this.shown = [];
    const list = this.characters().slice(this.page * COLS * ROWS, (this.page + 1) * COLS * ROWS);
    const cellW = GAME_WIDTH / COLS;
    const cellH = (GAME_HEIGHT - 60) / ROWS;
    list.forEach((c, i) => {
      const x = (i % COLS) * cellW + cellW / 2;
      const y = 60 + Math.floor(i / COLS) * cellH;
      const frame = this.add.rectangle(x, y + PORTRAIT / 2 + 4, PORTRAIT + 8, PORTRAIT + 8, 0x2b3550).setStrokeStyle(2, 0x3f4c6e);
      const g = this.add.graphics();
      c.portrait(g, PORTRAIT, 'normal');
      g.setPosition(x - PORTRAIT / 2, y + 4);
      const mask = this.add.graphics().fillRect(x - PORTRAIT / 2, y + 4, PORTRAIT, PORTRAIT).setVisible(false);
      g.setMask(mask.createGeometryMask());
      const spriteY = y + PORTRAIT + 70;
      const sprite = c.sprite && this.textures.exists(c.sprite.key) ? this.add.image(x, spriteY, c.sprite.key).setScale(Math.min(1.8, 128 / c.sprite.height)) : this.add.text(x, spriteY, '(portrait only)', textStyle(12, '#8a8199')).setOrigin(0.5);
      const label = this.add.text(x, y + cellH - 36, `${c.name}\n${c.id} · ${c.firstAppears}${c.canon ? '' : ' · invented'}`, textStyle(12, '#f4efe6', { align: 'center' })).setOrigin(0.5, 0);
      this.shown.push(frame, g, mask, sprite, label);
    });
    this.pageLabel.setText(`Page ${this.page + 1}/${this.pages()}  ·  ${this.characters().length} characters  ·  ←/→ or click to page, Esc to close`);
  }

  private close(): void {
    for (const key of this.resume) if (this.scene.isPaused(key)) this.scene.resume(key);
    this.scene.stop();
  }
}

/** Opens the sheet over whatever is running, pausing a run underneath. */
export function openCharacterSheet(game: Phaser.Game): void {
  if (game.scene.isActive('CharacterSheet')) return;
  const resume = ['Run'].filter((k) => game.scene.isActive(k));
  resume.forEach((k) => game.scene.pause(k));
  game.scene.run('CharacterSheet', { resume });
  game.scene.bringToTop('CharacterSheet');
}
