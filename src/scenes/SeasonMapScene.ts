/**
 * Season Map, shown as the navigation screen of Rick's ship ("Where to, Morty?"): Season 1's
 * episodes as nodes on a path. Playable episodes can be started with a random seed or a typed
 * one; the rest are locked as "coming soon". The episode after the furthest clear is "next up".
 */
import Phaser from 'phaser';
import { LATER_SEASONS_LABEL } from '../content/registry';
import { GAME_HEIGHT, GAME_WIDTH } from '../engine/constants';
import { nextUp } from '../engine/episodes';
import { createSeed, formatSeed, normalizeSeed, SEED_ALPHABET, SEED_LENGTH } from '../engine/rng';
import { svc } from '../engine/services';
import type { EpisodeListing } from '../engine/types';
import { Menu } from '../engine/ui/Menu';
import { COLORS, displayStyle, formatTime, textStyle } from '../engine/ui/text';
import { drawStarfield } from './TitleScene';

export class SeasonMapScene extends Phaser.Scene {
  private listings: EpisodeListing[] = [];
  private next = -1;
  private selected = 0;
  private nodes: { x: number; y: number }[] = [];
  private nodeG!: Phaser.GameObjects.Graphics;
  private info!: Phaser.GameObjects.Text;
  private title!: Phaser.GameObjects.Text;
  private menu: Menu | null = null;
  private playPrologue = false;
  private seedEntry: { text: Phaser.GameObjects.Text; box: Phaser.GameObjects.Graphics; hint: Phaser.GameObjects.Text; value: string } | null = null;
  private arrowKeys!: Record<string, Phaser.Input.Keyboard.Key>;
  private labels: Phaser.GameObjects.Text[] = [];

  constructor() {
    super('SeasonMap');
  }

  create(): void {
    this.listings = svc().registry.listings.filter((l) => l.season === 1);
    const save = svc().save;
    const upNext = nextUp(this.listings, (id) => (save.episodes[id]?.clears ?? 0) > 0);
    this.next = upNext ? this.listings.indexOf(upNext) : -1;
    this.selected = upNext?.def ? this.next : Math.max(0, this.listings.findIndex((l) => l.def));
    this.seedEntry = null;
    this.menu = null;
    this.labels = [];
    drawStarfield(this, 'season-map');
    this.drawConsole();
    this.add.text(GAME_WIDTH / 2, 46, 'WHERE TO, MORTY?', displayStyle(46, '#97ce4c')).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 84, "RICK'S SHIP  ·  NAVIGATION  ·  SEASON 1", textStyle(14, '#8fd3a8')).setOrigin(0.5);
    this.nodes = this.listings.map((_, i) => {
      const col = i % 6;
      const row = Math.floor(i / 6);
      const x = row === 0 ? 150 + col * 196 : GAME_WIDTH - 150 - col * 196;
      return { x, y: 150 + row * 150 + (col % 2) * 30 };
    });
    this.nodeG = this.add.graphics();
    this.listings.forEach((l, i) => {
      const n = this.nodes[i];
      const label = this.add.text(n.x, n.y + 44, l.title, textStyle(14, l.def ? '#ffffff' : '#8a8199', { align: 'center', wordWrap: { width: 170 } })).setOrigin(0.5, 0);
      this.labels.push(label);
      const zone = this.add.zone(n.x, n.y, 80, 80).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this.select(i));
    });
    if (this.next >= 0) {
      const n = this.nodes[this.next];
      const ring = this.add.circle(n.x, n.y, 44).setStrokeStyle(4, COLORS.portal, 1);
      this.tweens.add({ targets: ring, scale: 1.18, alpha: 0.2, duration: 900, repeat: -1, ease: 'Sine.easeOut' });
      this.add.text(n.x, n.y - 62, 'NEXT UP', textStyle(13, '#97ce4c')).setOrigin(0.5);
    }
    // Later seasons, locked.
    const g = this.add.graphics();
    g.fillStyle(0x140f1f, 0.8);
    g.fillRoundedRect(GAME_WIDTH / 2 - 210, 430, 420, 44, 10);
    g.lineStyle(2, 0x4a3f63, 1);
    g.strokeRoundedRect(GAME_WIDTH / 2 - 210, 430, 420, 44, 10);
    this.add.text(GAME_WIDTH / 2, 452, `${LATER_SEASONS_LABEL}  ·  locked, coming soon`, textStyle(17, '#8a8199')).setOrigin(0.5);

    const panel = this.add.graphics();
    panel.fillStyle(0x140f1f, 0.92);
    panel.fillRoundedRect(40, 500, 700, 196, 14);
    panel.lineStyle(3, COLORS.portal, 1);
    panel.strokeRoundedRect(40, 500, 700, 196, 14);
    this.title = this.add.text(64, 520, '', displayStyle(30, '#ffffff')).setOrigin(0, 0);
    this.info = this.add.text(64, 566, '', textStyle(16, '#d8d0e6', { wordWrap: { width: 650 }, lineSpacing: 4 }));

    this.arrowKeys = this.input.keyboard!.addKeys('LEFT,RIGHT', false) as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => this.onKey(e));
    this.buildMenu();
    this.refresh();
    svc().audio.music('garage');
  }

  /** The ship's dashboard around the screen: a metal bezel, rivets and a faint scanline glow. */
  private drawConsole(): void {
    const g = this.add.graphics().setDepth(40);
    const edge = 14;
    g.lineStyle(edge * 2, 0x3a3f58, 1);
    g.strokeRoundedRect(0, 0, GAME_WIDTH, GAME_HEIGHT, 28);
    g.lineStyle(3, 0x1a1424, 1);
    g.strokeRoundedRect(edge, edge, GAME_WIDTH - edge * 2, GAME_HEIGHT - edge * 2, 18);
    g.fillStyle(0x8a8d99, 1);
    for (const [x, y] of [[8, 8], [GAME_WIDTH - 8, 8], [8, GAME_HEIGHT - 8], [GAME_WIDTH - 8, GAME_HEIGHT - 8], [GAME_WIDTH / 2, 7], [GAME_WIDTH / 2, GAME_HEIGHT - 7]]) g.fillCircle(x, y, 4);
    const scan = this.add.graphics().setDepth(39);
    scan.fillStyle(0x97ce4c, 0.035);
    for (let y = edge; y < GAME_HEIGHT - edge; y += 4) scan.fillRect(edge, y, GAME_WIDTH - edge * 2, 1);
  }

  private listing(): EpisodeListing {
    return this.listings[this.selected];
  }

  private select(i: number): void {
    if (this.seedEntry) return;
    this.selected = i;
    svc().audio.play('ui-move');
    this.buildMenu();
    this.refresh();
  }

  private buildMenu(): void {
    this.menu?.destroy();
    const l = this.listing();
    const cleared = (svc().save.episodes[l.id]?.clears ?? 0) > 0;
    const playable = !!l.def;
    this.menu = new Menu(
      this,
      780,
      500,
      [
        { label: 'Start run (random seed)', enabled: () => playable, onSelect: () => this.start(createSeed()) },
        { label: 'Start with a seed...', enabled: () => playable, onSelect: () => this.openSeedEntry() },
        {
          label: () => `Prologue: ${this.playPrologue || !cleared ? 'play it' : 'skip it'}`,
          enabled: () => playable && cleared,
          onSelect: () => {
            this.playPrologue = !this.playPrologue;
          },
        },
        { label: 'Climb out of the ship', onSelect: () => this.scene.start('Garage') },
      ],
      { width: 460, spacing: 50, fontSize: 19, onBack: () => this.scene.start('Garage') },
    );
  }

  private start(seed: string): void {
    const l = this.listing();
    if (!l.def) return;
    this.scene.start('Run', { episodeId: l.id, seed, playPrologue: this.playPrologue });
  }

  private refresh(): void {
    const g = this.nodeG;
    g.clear();
    const save = svc().save;
    for (let i = 0; i < this.nodes.length - 1; i++) {
      const a = this.nodes[i];
      const b = this.nodes[i + 1];
      g.lineStyle(6, this.listings[i + 1].def ? COLORS.portal : i + 1 === this.next ? 0x4f6b2c : 0x3a3150, 1);
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
    this.listings.forEach((l, i) => {
      const n = this.nodes[i];
      const rec = save.episodes[l.id];
      const sel = i === this.selected;
      const color = !l.def ? 0x3a3150 : rec?.clears ? 0xffd54a : COLORS.portal;
      g.fillStyle(0x0b0814, 1);
      g.fillCircle(n.x, n.y, sel ? 38 : 32);
      g.fillStyle(color, 1);
      g.fillCircle(n.x, n.y, sel ? 32 : 26);
      g.lineStyle(sel ? 5 : 3, sel ? 0xffffff : 0x1a1424, 1);
      g.strokeCircle(n.x, n.y, sel ? 38 : 32);
      if (!l.def) {
        g.fillStyle(0x8a8199, 1);
        g.fillRoundedRect(n.x - 9, n.y - 2, 18, 14, 3);
        g.lineStyle(3, 0x8a8199, 1);
        g.beginPath();
        g.arc(n.x, n.y - 3, 6, Math.PI, 0, false);
        g.strokePath();
      } else if (rec?.clears) {
        g.lineStyle(5, 0x1a1424, 1);
        g.lineBetween(n.x - 10, n.y, n.x - 2, n.y + 9);
        g.lineBetween(n.x - 2, n.y + 9, n.x + 12, n.y - 8);
      }
      this.labels[i].setColor(sel ? '#ffe27a' : l.def ? '#ffffff' : i === this.next ? '#97ce4c' : '#8a8199');
    });
    const l = this.listing();
    const rec = save.episodes[l.id];
    this.title.setText(`S${String(l.season).padStart(2, '0')}E${String(l.number).padStart(2, '0')}  ${l.title}`);
    if (l.def) {
      const best = rec?.bestTimeMs ? formatTime(rec.bestTimeMs / 1000) : '—';
      this.info.setText(`${l.def.synopsis}\n\nClears: ${rec?.clears ?? 0}   Runs: ${rec?.attempts ?? 0}   Best time: ${best}`);
    } else {
      this.info.setText(
        this.selected === this.next
          ? "Next up! You cleared everything before it, but this episode isn't built yet. It arrives in a future update."
          : 'Coming soon. This episode will unlock in a future update.',
      );
    }
  }

  // ---- seed entry ------------------------------------------------------------------------------

  private openSeedEntry(): void {
    this.menu?.setActive(false);
    const box = this.add.graphics().setDepth(50);
    box.fillStyle(0x0b0814, 0.85);
    box.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    box.fillStyle(0x140f1f, 1);
    box.fillRoundedRect(GAME_WIDTH / 2 - 300, GAME_HEIGHT / 2 - 110, 600, 220, 16);
    box.lineStyle(3, COLORS.portal, 1);
    box.strokeRoundedRect(GAME_WIDTH / 2 - 300, GAME_HEIGHT / 2 - 110, 600, 220, 16);
    const text = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 10, '', displayStyle(48, '#ffe27a')).setOrigin(0.5).setDepth(51);
    const hint = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 60, `Type an ${SEED_LENGTH}-character seed. Enter to start, Esc to cancel.`, textStyle(16, '#b8b0c8'))
      .setOrigin(0.5)
      .setDepth(51);
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, 'ENTER A SEED', textStyle(20, '#97ce4c')).setOrigin(0.5).setDepth(51).setName('seed-title');
    this.seedEntry = { text, box, hint, value: '' };
    this.renderSeed();
  }

  private closeSeedEntry(): void {
    if (!this.seedEntry) return;
    this.seedEntry.text.destroy();
    this.seedEntry.box.destroy();
    this.seedEntry.hint.destroy();
    this.children.getByName('seed-title')?.destroy();
    this.seedEntry = null;
    this.menu?.setActive(true);
  }

  private renderSeed(): void {
    const s = this.seedEntry;
    if (!s) return;
    const padded = s.value.padEnd(SEED_LENGTH, '_');
    s.text.setText(formatSeed(padded));
  }

  private onKey(e: KeyboardEvent): void {
    const s = this.seedEntry;
    if (!s) return;
    if (e.key === 'Escape') {
      this.closeSeedEntry();
      return;
    }
    if (e.key === 'Backspace') {
      s.value = s.value.slice(0, -1);
      this.renderSeed();
      return;
    }
    if (e.key === 'Enter') {
      const seed = normalizeSeed(s.value);
      if (!seed) {
        svc().audio.play('ui-deny');
        s.hint.setText(`Seeds are ${SEED_LENGTH} characters: letters and 2-9 (no O, I, 0 or 1).`).setColor('#ff6a5a');
        return;
      }
      this.closeSeedEntry();
      this.start(seed);
      return;
    }
    const ch = e.key.toUpperCase();
    if (ch.length === 1 && SEED_ALPHABET.includes(ch) && s.value.length < SEED_LENGTH) {
      s.value += ch;
      svc().audio.play('text-blip');
      this.renderSeed();
    }
  }

  override update(): void {
    if (this.seedEntry) return;
    const JD = Phaser.Input.Keyboard.JustDown;
    if (JD(this.arrowKeys.LEFT)) this.select((this.selected + this.listings.length - 1) % this.listings.length);
    if (JD(this.arrowKeys.RIGHT)) this.select((this.selected + 1) % this.listings.length);
    this.menu?.update();
  }
}
