/**
 * Rick's Garage, the hub between runs, as a room Morty walks around. The workbench sells
 * upgrades, the closet has shirts, the TV shows stats and settings, and climbing into Rick's ship
 * opens its navigation screen (the Season Map). The door back into the house goes to the title.
 */
import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../engine/constants';
import { INK } from '../engine/art/draw';
import { persist, svc } from '../engine/services';
import type { UpgradeDef } from '../engine/types';
import { CONTROLS_TEXT, Menu, settingsItems, type MenuItem } from '../engine/ui/Menu';
import { displayStyle, formatTime, textStyle } from '../engine/ui/text';

/** Something in the garage Morty can walk up to and use. */
interface Station {
  label: string;
  x: number;
  y: number;
  /** How close Morty has to be. */
  reach: number;
  use: () => void;
}

/** Solid furniture Morty walks around (world rectangles). */
interface Solid {
  x: number;
  y: number;
  w: number;
  h: number;
}

const FLOOR_TOP = 250;
const FLOOR = { left: 70, right: GAME_WIDTH - 70, top: FLOOR_TOP + 20, bottom: GAME_HEIGHT - 30 };
const SPEED = 260;
const FEET = 14;

const RICK_LINES = [
  "Morty! Ship's warmed up. Let's —*urrp*— go.",
  "Buy something, Morty. The workbench doesn't judge. I do, but it doesn't.",
  'Adventure, Morty! Out there! Not in here!',
  "Stop staring at the TV. It's not even plugged in.",
];

export class GarageScene extends Phaser.Scene {
  private menu: Menu | null = null;
  private panel: Phaser.GameObjects.GameObject[] = [];
  private scrapText!: Phaser.GameObjects.Text;
  private morty!: Phaser.GameObjects.Image;
  private mortyShadow!: Phaser.GameObjects.Ellipse;
  private prompt!: Phaser.GameObjects.Text;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private stations: Station[] = [];
  private solids: Solid[] = [];
  private rickSpot = { x: 0, y: 0 };
  private bubble: Phaser.GameObjects.Container | null = null;
  private t = 0;
  private talkAt = 0;
  private talkCount = 0;
  private leaving = false;

  constructor() {
    super('Garage');
  }

  create(): void {
    this.menu = null;
    this.panel = [];
    this.stations = [];
    this.solids = [];
    this.bubble = null;
    this.t = 0;
    this.talkAt = 0;
    this.talkCount = 0;
    this.leaving = false;
    this.drawRoom();
    this.furnish();
    this.add.text(24, 26, "RICK'S GARAGE", displayStyle(34, '#97ce4c')).setOrigin(0, 0.5).setDepth(5000);
    this.add.image(30, 62, 'ui-scrap').setScale(1.1).setDepth(5000);
    this.scrapText = this.add.text(46, 62, '', textStyle(18, '#ffd54a')).setOrigin(0, 0.5).setDepth(5000);
    this.add.text(GAME_WIDTH - 20, GAME_HEIGHT - 12, 'WASD: walk   E: use   Esc: title screen', textStyle(13, '#d8d0e6')).setOrigin(1, 1).setDepth(5000);
    this.prompt = this.add.text(0, 0, '', textStyle(16, '#ffffff')).setOrigin(0.5, 1).setDepth(5000).setVisible(false);
    this.refreshScrap();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E,ENTER,SPACE,ESC', false) as Record<string, Phaser.Input.Keyboard.Key>;
    this.cameras.main.fadeIn(250);
    this.time.delayedCall(900, () => this.rickSays(RICK_LINES[0]));
    svc().audio.music('garage');
  }

  // ---- the room --------------------------------------------------------------------------------

  private drawRoom(): void {
    const g = this.add.graphics();
    // Back wall with a pegboard, then the concrete floor.
    g.fillStyle(0x4a4f6e, 1);
    g.fillRect(0, 0, GAME_WIDTH, FLOOR_TOP);
    g.fillStyle(0x8b6a4a, 1);
    g.fillRect(430, 40, 420, 150);
    g.fillStyle(0x6b4f35, 1);
    for (let y = 52; y < 182; y += 18) for (let x = 444; x < 840; x += 18) g.fillCircle(x, y, 2);
    g.lineStyle(3, INK, 1);
    g.strokeRect(430, 40, 420, 150);
    g.fillStyle(0x3a3f58, 1);
    g.fillRect(0, FLOOR_TOP - 16, GAME_WIDTH, 16);
    g.fillStyle(0x8a8d99, 1);
    g.fillRect(0, FLOOR_TOP, GAME_WIDTH, GAME_HEIGHT - FLOOR_TOP);
    // Oil stains and cracks, placed by a fixed pattern.
    g.fillStyle(0x6b6e7a, 1);
    for (let i = 0; i < 9; i++) g.fillEllipse(120 + ((i * 331) % 1040), FLOOR_TOP + 60 + ((i * 157) % 380), 40 + (i % 3) * 20, 14 + (i % 2) * 8);
    g.lineStyle(2, 0x74778a, 1);
    for (let x = 0; x < GAME_WIDTH; x += 160) g.lineBetween(x, FLOOR_TOP, x + 40, GAME_HEIGHT);
    // The big roll-up door on the right wall and the door into the house on the left.
    g.fillStyle(0xc9ced9, 1);
    g.fillRect(GAME_WIDTH - 36, FLOOR_TOP + 10, 36, 360);
    g.lineStyle(2, 0x8a8d99, 1);
    for (let y = FLOOR_TOP + 24; y < FLOOR_TOP + 370; y += 22) g.lineBetween(GAME_WIDTH - 36, y, GAME_WIDTH, y);
    g.fillStyle(0x8b5a2b, 1);
    g.fillRect(0, FLOOR_TOP + 110, 40, 150);
    g.lineStyle(3, INK, 1);
    g.strokeRect(0, FLOOR_TOP + 110, 40, 150);
    g.fillStyle(0xffd54a, 1);
    g.fillCircle(32, FLOOR_TOP + 190, 4);
    // A hanging bulb.
    g.lineStyle(2, INK, 1);
    g.lineBetween(640, 0, 640, 30);
    g.fillStyle(0xfff2a8, 1);
    g.fillCircle(640, 38, 10);
    g.fillStyle(0xfff2a8, 0.08);
    g.fillCircle(640, 38, 120);
  }

  private furnish(): void {
    const add = (key: string, x: number, y: number, scale = 1) => {
      const img = this.add.image(x, y, key).setOrigin(0.5, 1).setScale(scale).setDepth(y);
      return img;
    };
    add('garage-shelf', 230, 190);
    add('garage-shelf', 1050, 190);
    const bench = add('garage-workbench', 250, FLOOR_TOP + 70, 1.3);
    const tv = add('garage-tv', 640, FLOOR_TOP + 56, 1.1);
    const closet = add('garage-closet', 1090, FLOOR_TOP + 90, 1.2);
    const ship = add('flying-car', 860, 540, 1.6);
    this.rickSpot = { x: 420, y: FLOOR_TOP + 100 };
    add('rick', this.rickSpot.x, this.rickSpot.y, 1.3).setFlipX(true);
    this.solids.push(
      { x: bench.x - 95, y: FLOOR_TOP, w: 190, h: 72 },
      { x: tv.x - 46, y: FLOOR_TOP, w: 92, h: 58 },
      { x: closet.x - 46, y: FLOOR_TOP, w: 92, h: 92 },
      { x: ship.x - 110, y: ship.y - 60, w: 220, h: 56 },
      { x: this.rickSpot.x - 18, y: this.rickSpot.y - 20, w: 36, h: 22 },
    );
    this.stations.push(
      { label: 'Workbench: upgrades', x: bench.x, y: FLOOR_TOP + 90, reach: 110, use: () => this.showUpgrades() },
      { label: 'TV: stats and settings', x: tv.x, y: FLOOR_TOP + 76, reach: 90, use: () => this.showTv() },
      { label: 'Closet: shirts', x: closet.x, y: FLOOR_TOP + 110, reach: 100, use: () => this.showCloset() },
      { label: "Rick's ship: where to, Morty?", x: ship.x, y: ship.y, reach: 150, use: () => this.boardShip(ship) },
      { label: 'Back inside (title screen)', x: 60, y: FLOOR_TOP + 190, reach: 80, use: () => this.leave() },
    );
    this.mortyShadow = this.add.ellipse(560, 560, 30, 10, 0x000000, 0.25);
    this.morty = this.add.image(560, 560, this.mortyKey()).setOrigin(0.5, 1).setScale(1.3);
  }

  private mortyKey(): string {
    const shirt = svc().save.shirt;
    return shirt && this.textures.exists(`morty-${shirt}`) ? `morty-${shirt}` : 'morty';
  }

  private refreshScrap(): void {
    this.scrapText.setText(`${svc().save.bankedScrap} Scrap banked`);
  }

  private refreshMorty(): void {
    this.morty.setTexture(this.mortyKey());
  }

  /** A speech bubble over Rick. */
  private rickSays(text: string): void {
    this.bubble?.destroy();
    const label = this.add.text(0, 0, text, textStyle(15, '#1a1424', { stroke: '#ffffff', strokeThickness: 0, wordWrap: { width: 260 }, align: 'center' })).setOrigin(0.5, 1);
    const w = label.width + 22;
    const h = label.height + 16;
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 1);
    bg.fillRoundedRect(-w / 2, -h - 6, w, h, 10);
    bg.fillTriangle(-7, -7, 7, -7, 0, 4);
    bg.lineStyle(3, INK, 1);
    bg.strokeRoundedRect(-w / 2, -h - 6, w, h, 10);
    label.setPosition(0, -14);
    this.bubble = this.add.container(this.rickSpot.x, this.rickSpot.y - 100, [bg, label]).setDepth(4000);
    this.talkAt = this.t;
    this.time.delayedCall(3600, () => {
      if (this.bubble?.list.includes(label)) {
        this.bubble.destroy();
        this.bubble = null;
      }
    });
  }

  // ---- walking ---------------------------------------------------------------------------------

  override update(_time: number, delta: number): void {
    const dt = Math.min(delta / 1000, 0.05);
    this.t += dt;
    if (this.menu) {
      this.menu.update();
      return;
    }
    if (this.leaving) return;
    const k = this.keys;
    const JD = Phaser.Input.Keyboard.JustDown;
    if (JD(k.ESC)) {
      this.leave();
      return;
    }
    let mx = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
    let my = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
    const len = Math.hypot(mx, my);
    if (len > 0) {
      mx /= len;
      my /= len;
      this.move(mx * SPEED * dt, my * SPEED * dt);
      if (mx) this.morty.setFlipX(mx < 0);
      this.morty.setAngle(Math.sin(this.t * 18) * 5);
    } else {
      this.morty.setAngle(0);
    }
    this.morty.setDepth(this.morty.y);
    this.mortyShadow.setPosition(this.morty.x, this.morty.y - 2).setDepth(this.morty.y - 1);

    // The nearest thing to use, if any.
    let best: Station | null = null;
    let bestD = Infinity;
    for (const s of this.stations) {
      const d = Math.hypot(s.x - this.morty.x, s.y - this.morty.y);
      if (d < s.reach && d < bestD) {
        best = s;
        bestD = d;
      }
    }
    if (best) this.prompt.setText(`E  ${best.label}`).setPosition(this.morty.x, this.morty.y - 96).setVisible(true);
    else this.prompt.setVisible(false);
    if (best && (JD(k.E) || JD(k.ENTER) || JD(k.SPACE))) {
      svc().audio.play('ui-select');
      best.use();
    }
    if (this.t - this.talkAt > 16) this.rickSays(RICK_LINES[1 + (this.talkCount++ % (RICK_LINES.length - 1))]);
  }

  /** Moves Morty, sliding along walls and furniture. */
  private move(dx: number, dy: number): void {
    const blocked = (x: number, y: number) =>
      x < FLOOR.left || x > FLOOR.right || y < FLOOR.top || y > FLOOR.bottom || this.solids.some((s) => x > s.x - FEET && x < s.x + s.w + FEET && y > s.y - 4 && y < s.y + s.h + 6);
    const m = this.morty;
    if (!blocked(m.x + dx, m.y)) m.x += dx;
    if (!blocked(m.x, m.y + dy)) m.y += dy;
  }

  // ---- stations --------------------------------------------------------------------------------

  private leave(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(200);
    this.time.delayedCall(220, () => this.scene.start('Title'));
  }

  /** Morty climbs into the ship; its screen asks where to. */
  private boardShip(ship: Phaser.GameObjects.Image): void {
    if (this.leaving) return;
    this.leaving = true;
    this.prompt.setVisible(false);
    this.rickSays('Where to, Morty?');
    this.tweens.add({ targets: this.morty, x: ship.x - 20, y: ship.y - 30, scale: 0.9, alpha: 0, duration: 380 });
    this.tweens.add({ targets: ship, y: ship.y - 14, duration: 180, yoyo: true, delay: 380 });
    svc().audio.play('portal');
    this.time.delayedCall(700, () => {
      this.cameras.main.fadeOut(220, 20, 40, 10);
      this.time.delayedCall(240, () => this.scene.start('SeasonMap'));
    });
  }

  private clearPanel(): void {
    this.menu?.destroy();
    this.menu = null;
    this.panel.forEach((o) => o.destroy());
    this.panel = [];
  }

  /** A dark card on the right for a station's menu. */
  private card(title: string, h = 520): void {
    const bg = this.add.graphics().setDepth(9000);
    bg.fillStyle(0x0b0814, 0.55);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    bg.fillStyle(0x140f1f, 0.96);
    bg.fillRoundedRect(640, 70, 610, h, 14);
    bg.lineStyle(3, 0x97ce4c, 1);
    bg.strokeRoundedRect(640, 70, 610, h, 14);
    const t = this.add.text(664, 96, title, displayStyle(30, '#97ce4c')).setOrigin(0, 0.5).setDepth(9001);
    this.panel.push(bg, t);
  }

  private closePanel(): void {
    this.clearPanel();
    this.refreshScrap();
  }

  private upgradeItem(u: UpgradeDef): MenuItem {
    const save = svc().save;
    const level = () => save.upgrades[u.id] ?? 0;
    return {
      label: () => {
        const lv = level();
        const max = u.costs.length;
        return lv >= max ? `${u.name}  ✓` : `${u.name}  (${u.costs[lv]} Scrap)${max > 1 ? `  ${lv}/${max}` : ''}`;
      },
      detail: u.description,
      enabled: () => level() < u.costs.length && save.bankedScrap >= u.costs[level()],
      onSelect: () => {
        const lv = level();
        const cost = u.costs[lv];
        if (lv >= u.costs.length || save.bankedScrap < cost) return;
        save.bankedScrap -= cost;
        save.upgrades[u.id] = lv + 1;
        if (u.unlocks && !save.unlocked.includes(u.unlocks)) save.unlocked.push(u.unlocks);
        if (u.shirt !== undefined) save.shirt = u.id;
        persist();
        svc().audio.play('item');
        this.refreshScrap();
        this.refreshMorty();
      },
    };
  }

  private showUpgrades(): void {
    this.clearPanel();
    this.card('WORKBENCH');
    const ups = [...svc().registry.upgrades.values()].filter((u) => u.category !== 'cosmetic');
    this.menu = new Menu(this, 660, 130, [...ups.map((u) => this.upgradeItem(u)), { label: 'Done', onSelect: () => this.closePanel() }], {
      width: 570,
      spacing: 60,
      fontSize: 18,
      depth: 9002,
      onBack: () => this.closePanel(),
    });
  }

  private showCloset(): void {
    this.clearPanel();
    this.card('CLOSET');
    const save = svc().save;
    const shirts = [...svc().registry.upgrades.values()].filter((u) => u.category === 'cosmetic');
    const items: MenuItem[] = [
      {
        label: () => `Classic Yellow${save.shirt === null ? '  (wearing)' : ''}`,
        detail: 'The original.',
        onSelect: () => {
          save.shirt = null;
          persist();
          this.refreshMorty();
        },
      },
      ...shirts.map((u): MenuItem => {
        const owned = () => (save.upgrades[u.id] ?? 0) > 0;
        return {
          label: () => (owned() ? `${u.name.replace('Shirt: ', '')}${save.shirt === u.id ? '  (wearing)' : ''}` : `${u.name.replace('Shirt: ', '')}  (${u.costs[0]} Scrap)`),
          detail: u.description,
          enabled: () => owned() || save.bankedScrap >= u.costs[0],
          onSelect: () => {
            if (!owned()) {
              if (save.bankedScrap < u.costs[0]) return;
              save.bankedScrap -= u.costs[0];
              save.upgrades[u.id] = 1;
              svc().audio.play('item');
            }
            save.shirt = u.id;
            persist();
            this.refreshScrap();
            this.refreshMorty();
          },
        };
      }),
      { label: 'Done', onSelect: () => this.closePanel() },
    ];
    this.menu = new Menu(this, 660, 130, items, { width: 570, spacing: 62, depth: 9002, onBack: () => this.closePanel() });
  }

  /** The TV: stats, settings and controls. */
  private showTv(): void {
    this.clearPanel();
    this.card('CHANNEL: YOU', 330);
    this.menu = new Menu(
      this,
      660,
      130,
      [
        { label: 'Stats', detail: 'Runs, deaths, clears, best times', onSelect: () => this.showStats() },
        { label: 'Settings', detail: 'Volume, screen shake, flashes, text speed', onSelect: () => this.showSettings() },
        { label: 'Controls', onSelect: () => this.showControls() },
        { label: 'Turn it off', onSelect: () => this.closePanel() },
      ],
      { width: 570, spacing: 62, depth: 9002, onBack: () => this.closePanel() },
    );
  }

  private showStats(): void {
    this.clearPanel();
    this.card('STATS', 560);
    const save = svc().save;
    const lines = [
      `Runs: ${save.lifetime.runs}`,
      `Deaths: ${save.lifetime.deaths}`,
      `Enemies beaten: ${save.lifetime.kills}`,
      `Scrap earned: ${save.lifetime.scrapEarned}`,
      '',
      ...svc()
        .registry.listings.filter((l) => l.def)
        .map((l) => {
          const r = save.episodes[l.id];
          const best = r?.bestTimeMs ? formatTime(r.bestTimeMs / 1000) : '—';
          return `${l.id} ${l.title}: ${r?.clears ?? 0} clears / ${r?.attempts ?? 0} runs, best ${best}`;
        }),
    ];
    const t = this.add.text(664, 130, lines.join('\n'), textStyle(18, '#ffffff', { lineSpacing: 8, wordWrap: { width: 560 } })).setDepth(9001);
    this.panel.push(t);
    this.menu = new Menu(this, 660, 540, [{ label: 'Back', onSelect: () => this.showTv() }], { width: 570, depth: 9002, onBack: () => this.showTv() });
  }

  private showSettings(): void {
    this.clearPanel();
    this.card('SETTINGS', 600);
    this.menu = new Menu(this, 660, 120, settingsItems(() => this.showTv()), { width: 570, spacing: 58, depth: 9002, onBack: () => this.showTv() });
  }

  private showControls(): void {
    this.clearPanel();
    this.card('CONTROLS', 560);
    const t = this.add.text(664, 130, CONTROLS_TEXT, textStyle(14, '#ffffff', { fontFamily: 'monospace', lineSpacing: 6 })).setDepth(9001);
    this.panel.push(t);
    this.menu = new Menu(this, 660, 540, [{ label: 'Back', onSelect: () => this.showTv() }], { width: 570, depth: 9002, onBack: () => this.showTv() });
  }
}
