/**
 * Rick's Garage, the hub between runs: spend banked Scrap on upgrades, pick a shirt, check
 * stats, and head to the Season Map.
 */
import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../engine/constants';
import { persist, svc } from '../engine/services';
import type { UpgradeDef } from '../engine/types';
import { Menu, settingsItems, type MenuItem } from '../engine/ui/Menu';
import { displayStyle, formatTime, textStyle } from '../engine/ui/text';

export class GarageScene extends Phaser.Scene {
  private menu: Menu | null = null;
  private panel: Phaser.GameObjects.GameObject[] = [];
  private scrapText!: Phaser.GameObjects.Text;
  private morty!: Phaser.GameObjects.Image;

  constructor() {
    super('Garage');
  }

  create(): void {
    this.menu = null;
    this.panel = [];
    this.drawGarage();
    this.add.text(40, 36, "RICK'S GARAGE", displayStyle(54, '#97ce4c')).setOrigin(0, 0.5);
    this.add.image(46, 92, 'ui-scrap').setScale(1.3);
    this.scrapText = this.add.text(66, 92, '', textStyle(24, '#ffd54a')).setOrigin(0, 0.5);
    this.refreshScrap();
    this.showMain();
    svc().audio.music('garage');
  }

  private drawGarage(): void {
    const g = this.add.graphics();
    g.fillStyle(0x3a3f58, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    g.fillStyle(0x4a4f6e, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT * 0.62);
    g.fillStyle(0x6b6a78, 1);
    g.fillRect(0, GAME_HEIGHT * 0.62, GAME_WIDTH, GAME_HEIGHT * 0.38);
    g.lineStyle(4, 0x1a1424, 0.7);
    g.lineBetween(0, GAME_HEIGHT * 0.62, GAME_WIDTH, GAME_HEIGHT * 0.62);
    // Shelves and junk
    g.fillStyle(0x8b5a2b, 1);
    g.fillRect(40, 150, 420, 14);
    g.fillRect(40, 260, 420, 14);
    const junk = [0xe0484d, 0x97ce4c, 0x8ec5de, 0xffd54a, 0xb07cf0];
    for (let i = 0; i < 9; i++) {
      g.fillStyle(junk[i % junk.length], 1);
      g.fillRoundedRect(52 + i * 45, 116 + (i % 3) * 4, 30, 34 - (i % 3) * 4, 5);
      g.fillStyle(junk[(i + 2) % junk.length], 1);
      g.fillRoundedRect(56 + i * 45, 226, 26, 34, 5);
    }
    // Workbench
    g.fillStyle(0x9c6a3e, 1);
    g.fillRoundedRect(40, 400, 300, 26, 6);
    g.fillRect(56, 426, 16, 70);
    g.fillRect(308, 426, 16, 70);
    g.fillStyle(0xffe27a, 0.9);
    g.fillCircle(360, 90, 14);
    this.add.image(250, 560, 'flying-car').setScale(1.6);
    this.add.image(470, 560, 'rick').setScale(2).setOrigin(0.5, 1);
    const shirt = svc().save.shirt;
    const key = shirt && this.textures.exists(`morty-${shirt}`) ? `morty-${shirt}` : 'morty';
    this.morty = this.add.image(560, 560, key).setScale(2).setOrigin(0.5, 1).setFlipX(true);
  }

  private refreshScrap(): void {
    this.scrapText.setText(`${svc().save.bankedScrap} Scrap banked`);
  }

  private clearPanel(): void {
    this.menu?.destroy();
    this.menu = null;
    this.panel.forEach((o) => o.destroy());
    this.panel = [];
  }

  private showMain(): void {
    this.clearPanel();
    this.menu = new Menu(
      this,
      760,
      150,
      [
        { label: 'Season Map  ▶', detail: 'Pick an episode and start a run', onSelect: () => this.scene.start('SeasonMap') },
        { label: 'Workbench', detail: 'Upgrades bought with banked Scrap', onSelect: () => this.showUpgrades() },
        { label: 'Closet', detail: "Change Morty's shirt", onSelect: () => this.showCloset() },
        { label: 'Stats', detail: 'Runs, deaths, clears', onSelect: () => this.showStats() },
        { label: 'Settings', onSelect: () => this.showSettings() },
        { label: 'Back to title', onSelect: () => this.scene.start('Title') },
      ],
      { width: 460, spacing: 64, onBack: () => this.scene.start('Title') },
    );
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
    const ups = [...svc().registry.upgrades.values()].filter((u) => u.category !== 'cosmetic');
    this.menu = new Menu(this, 700, 120, [...ups.map((u) => this.upgradeItem(u)), { label: 'Back', onSelect: () => this.showMain() }], {
      width: 560,
      spacing: 62,
      fontSize: 19,
      onBack: () => this.showMain(),
    });
  }

  private showCloset(): void {
    this.clearPanel();
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
      { label: 'Back', onSelect: () => this.showMain() },
    ];
    this.menu = new Menu(this, 760, 150, items, { width: 460, spacing: 64, onBack: () => this.showMain() });
  }

  private refreshMorty(): void {
    const shirt = svc().save.shirt;
    this.morty.setTexture(shirt && this.textures.exists(`morty-${shirt}`) ? `morty-${shirt}` : 'morty');
  }

  private showStats(): void {
    this.clearPanel();
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
    const bg = this.add.graphics();
    bg.fillStyle(0x140f1f, 0.92);
    bg.fillRoundedRect(740, 130, 500, 360, 14);
    bg.lineStyle(3, 0x97ce4c, 1);
    bg.strokeRoundedRect(740, 130, 500, 360, 14);
    const t = this.add.text(764, 150, lines.join('\n'), textStyle(18, '#ffffff', { lineSpacing: 8, wordWrap: { width: 450 } }));
    this.panel.push(bg, t);
    this.menu = new Menu(this, 760, 510, [{ label: 'Back', onSelect: () => this.showMain() }], { width: 460, onBack: () => this.showMain() });
  }

  private showSettings(): void {
    this.clearPanel();
    this.menu = new Menu(this, 760, 120, settingsItems(() => this.showMain()), { width: 460, spacing: 60, onBack: () => this.showMain() });
  }

  override update(): void {
    this.menu?.update();
  }
}
