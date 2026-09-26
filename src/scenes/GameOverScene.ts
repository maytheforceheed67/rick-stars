/** End of a run: the death screen or the Episode Complete screen. */
import Phaser from 'phaser';
import { GAME_WIDTH } from '../engine/constants';
import { createSeed, formatSeed, Rng } from '../engine/rng';
import { svc } from '../engine/services';
import { Menu } from '../engine/ui/Menu';
import { displayStyle, formatTime, textStyle } from '../engine/ui/text';
import type { RunSummary } from './RunScene';
import { drawStarfield } from './TitleScene';

export class GameOverScene extends Phaser.Scene {
  private summary!: RunSummary;
  private menu: Menu | null = null;

  constructor() {
    super('GameOver');
  }

  init(data: RunSummary): void {
    this.summary = data;
  }

  create(): void {
    const s = this.summary;
    drawStarfield(this, s.seed);
    const win = s.victory;
    this.add.text(GAME_WIDTH / 2, 70, win ? 'EPISODE COMPLETE' : s.quit ? 'RUN ABANDONED' : 'MORTY DOWN', displayStyle(64, win ? '#97ce4c' : '#ff6a5a')).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 124, `${s.episodeId}  ·  ${s.episodeTitle}`, textStyle(22, '#f4efe6')).setOrigin(0.5);

    const lines = [
      `Time: ${formatTime(s.seconds)}`,
      `Seed: ${formatSeed(s.seed)}`,
      `Rooms cleared: ${s.rooms}`,
      `Enemies beaten: ${s.kills}`,
      `Scrap banked: ${s.scrapBanked}${win ? '' : s.quit ? '' : ' (half of what you carried)'}`,
    ];
    if (!win && !s.quit) lines.unshift(`Taken out by: ${s.cause}`);
    this.add.text(120, 170, lines.join('\n'), textStyle(20, '#ffffff', { lineSpacing: 10 }));

    this.add.text(640, 170, 'Items found', textStyle(20, '#ffe27a'));
    this.add.text(640, 204, s.items.length ? s.items.join('\n') : 'None this time.', textStyle(16, '#d8d0e6', { lineSpacing: 4, wordWrap: { width: 560 } }));

    if (win) {
      const extra = [
        ...(s.newUnlocks.length ? [`Unlocked into the item pool: ${s.newUnlocks.join(', ')}`] : []),
        s.nextEpisode
          ? `Next up: ${s.nextEpisode.title}${s.nextEpisode.playable ? '' : ' (coming soon)'}`
          : 'That was the last episode. For now.',
      ];
      this.add.text(GAME_WIDTH / 2, 470, extra.join('\n'), textStyle(19, '#97ce4c', { align: 'center', lineSpacing: 8 })).setOrigin(0.5, 0);
      svc().audio.play('victory');
      this.confetti();
    } else {
      const lines = svc().registry.barks.get('death') ?? ['Get up, Morty.'];
      const line = new Rng(`${s.seed}:${Math.round(s.seconds)}`).pick(lines);
      this.add.text(GAME_WIDTH / 2, 470, `Rick: "${line}"`, textStyle(20, '#a8dcec', { align: 'center', wordWrap: { width: 1000 } })).setOrigin(0.5, 0);
    }

    this.menu = new Menu(
      this,
      GAME_WIDTH / 2 - 230,
      560,
      win
        ? [
            { label: 'Back to the Garage', onSelect: () => this.scene.start('Garage') },
            { label: 'Play again (new seed)', onSelect: () => this.scene.start('Run', { episodeId: s.episodeId, seed: createSeed() }) },
          ]
        : [
            { label: 'Try again (new seed)', onSelect: () => this.scene.start('Run', { episodeId: s.episodeId, seed: createSeed() }) },
            { label: 'Back to the Garage', onSelect: () => this.scene.start('Garage') },
          ],
      { width: 460, spacing: 58 },
    );
    svc().audio.music(win ? 'garage' : 'calm');
  }

  private confetti(): void {
    const e = this.add.particles(GAME_WIDTH / 2, -10, 'fx-square', {
      x: { min: -GAME_WIDTH / 2, max: GAME_WIDTH / 2 },
      speedY: { min: 80, max: 220 },
      speedX: { min: -60, max: 60 },
      lifespan: 4000,
      rotate: { min: 0, max: 360 },
      tint: [0x97ce4c, 0xf7d747, 0xf08fb0, 0x8ec5de, 0xff8a3d],
      quantity: 2,
      frequency: 60,
    });
    this.time.delayedCall(3000, () => e.stop());
  }

  override update(): void {
    this.menu?.update();
  }
}
