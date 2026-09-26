/**
 * Heads-up display drawn over the run: hearts, Rick Meter, items, Scrap, statuses, minimap,
 * mechanic widgets, boss bar, toasts, banners and quiz/choice prompts.
 */
import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, HUD_HEIGHT } from '../engine/constants';
import { formatSeed } from '../engine/rng';
import { svc } from '../engine/services';
import type { ChoicePrompt, RoomKind, ToastOptions } from '../engine/types';
import type { HudApi, HudModel } from '../engine/ui/hudModel';
import { COLORS, displayStyle, FONT, formatTime, textStyle } from '../engine/ui/text';

interface HudData {
  run: { hudModel(): HudModel };
}

interface Toast {
  box: Phaser.GameObjects.Container;
  life: number;
}

const KIND_COLORS: Partial<Record<RoomKind, number>> = {
  treasure: 0xf2c14e,
  shop: 0x6fd08c,
  special: 0xb07cf0,
  finale: 0xe0484d,
  start: 0x8ec5de,
  calm: 0x7fa8b8,
};

export class HudScene extends Phaser.Scene implements HudApi {
  private source!: HudData['run'];
  private ready = false;
  private queue: (() => void)[] = [];
  private g!: Phaser.GameObjects.Graphics;
  private mapG!: Phaser.GameObjects.Graphics;
  private hearts: Phaser.GameObjects.Image[] = [];
  private texts: Record<string, Phaser.GameObjects.Text> = {};
  private icons: Record<string, Phaser.GameObjects.Image> = {};
  private statusIcons: Phaser.GameObjects.Image[] = [];
  private statusTexts: Phaser.GameObjects.Text[] = [];
  private widgetTexts: Phaser.GameObjects.Text[] = [];
  private toasts: Toast[] = [];
  private bigMap = false;
  private choice: {
    prompt: ChoicePrompt;
    box: Phaser.GameObjects.Container;
    bar: Phaser.GameObjects.Graphics;
    left: number;
    buttons: Phaser.GameObjects.Container[];
    answered: boolean;
  } | null = null;
  private choiceKeys: Phaser.Input.Keyboard.Key[] = [];
  private t = 0;

  constructor() {
    super('Hud');
  }

  init(data: HudData): void {
    this.source = data.run;
    this.ready = false;
    this.hearts = [];
    this.texts = {};
    this.icons = {};
    this.statusIcons = [];
    this.statusTexts = [];
    this.widgetTexts = [];
    this.toasts = [];
    this.bigMap = false;
    this.choice = null;
  }

  create(): void {
    const bar = this.add.graphics();
    bar.fillStyle(0x140f1f, 0.96);
    bar.fillRect(0, 0, GAME_WIDTH, HUD_HEIGHT);
    bar.fillStyle(COLORS.portal, 1);
    bar.fillRect(0, HUD_HEIGHT - 3, GAME_WIDTH, 3);
    this.g = this.add.graphics();
    this.mapG = this.add.graphics();

    this.texts.rick = this.add.text(196, 8, 'RICK METER', textStyle(12, '#cfe9b0')).setOrigin(0, 0);
    this.texts.rickKey = this.add.text(386, 30, 'Q', textStyle(18, '#97ce4c')).setOrigin(0, 0.5);
    this.texts.activeKey = this.add.text(434, 58, 'C', textStyle(11, '#b8b0c8')).setOrigin(0.5, 1);
    this.texts.consKey = this.add.text(492, 58, 'R', textStyle(11, '#b8b0c8')).setOrigin(0.5, 1);
    this.icons.active = this.add.image(434, 28, '__WHITE').setVisible(false);
    this.icons.cons = this.add.image(492, 28, '__WHITE').setVisible(false);
    this.icons.scrap = this.add.image(538, 30, 'ui-scrap');
    this.texts.scrap = this.add.text(556, 30, '0', textStyle(20, '#ffd54a')).setOrigin(0, 0.5);
    this.texts.act = this.add.text(GAME_WIDTH - 14, 14, '', textStyle(15, '#ffffff')).setOrigin(1, 0);
    this.texts.clock = this.add.text(GAME_WIDTH - 14, 36, '', textStyle(12, '#b8b0c8')).setOrigin(1, 0);
    this.texts.objective = this.add.text(16, HUD_HEIGHT + 10, '', textStyle(15, '#ffe27a')).setOrigin(0, 0);
    this.texts.timer = this.add.text(GAME_WIDTH / 2, HUD_HEIGHT + 8, '', displayStyle(34, '#ffffff')).setOrigin(0.5, 0);
    this.texts.hint = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 70, '', textStyle(18, '#ffffff', { align: 'center' })).setOrigin(0.5, 1);
    this.texts.bossTitle = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 42, '', textStyle(16, '#ffffff')).setOrigin(0.5, 1);
    this.texts.mapTitle = this.add.text(GAME_WIDTH / 2, 110, '', displayStyle(30, '#ffffff')).setOrigin(0.5).setVisible(false);
    this.texts.mapHelp = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 60, '', textStyle(15, '#b8b0c8', { align: 'center' })).setOrigin(0.5).setVisible(false);

    const kb = this.input.keyboard!;
    this.choiceKeys = ['ONE', 'TWO', 'THREE', 'FOUR'].map((k) => kb.addKey(k, false));
    this.ready = true;
    const q = this.queue;
    this.queue = [];
    q.forEach((fn) => fn());
  }

  private whenReady(fn: () => void): void {
    if (this.ready) fn();
    else this.queue.push(fn);
  }

  override update(_time: number, delta: number): void {
    const dt = delta / 1000;
    this.t += dt;
    const m = this.source.hudModel();
    const g = this.g;
    g.clear();
    this.drawHearts(m);
    this.drawMeter(g, m);
    this.drawItems(g, m);
    this.texts.scrap.setText(String(m.scrap));
    this.texts.act.setText(`Act ${m.actNumber}/${m.actCount}  ·  ${m.actName}`);
    this.texts.clock.setText(`${formatTime(m.time)}  ·  Seed ${formatSeed(m.seed)}`);
    this.drawStatuses(m);
    this.drawWidgets(g, m);
    this.drawBoss(g, m);
    this.texts.objective.setText(m.objective ?? '');
    this.texts.timer.setText(m.timer ? `${m.timer.label} ${Math.ceil(m.timer.left)}` : '');
    this.texts.timer.setColor(m.timer && m.timer.left <= 5 ? '#ff6a5a' : '#ffffff');
    this.texts.hint.setText(m.hint ?? '');
    this.drawMap(m);
    this.updateToasts(dt);
    this.updateChoice(dt);
  }

  // ---- pieces ----------------------------------------------------------------------------------

  private drawHearts(m: HudModel): void {
    const total = Math.ceil(m.maxHp / 2);
    while (this.hearts.length < total) this.hearts.push(this.add.image(0, 0, 'ui-heart-full'));
    this.hearts.forEach((h, i) => {
      if (i >= total) {
        h.setVisible(false);
        return;
      }
      const row = Math.floor(i / 6);
      const col = i % 6;
      h.setVisible(true).setPosition(26 + col * 27, 20 + row * 25);
      const fill = m.hp - i * 2;
      h.setTexture(fill >= 2 ? 'ui-heart-full' : fill === 1 ? 'ui-heart-half' : 'ui-heart-empty');
      const low = m.hp <= 2 && fill > 0;
      h.setScale(low ? 1 + 0.12 * Math.sin(this.t * 10) : 1);
    });
  }

  private drawMeter(g: Phaser.GameObjects.Graphics, m: HudModel): void {
    const x = 196;
    const y = 24;
    const w = 180;
    const h = 16;
    g.fillStyle(0x0b0814, 1);
    g.fillRoundedRect(x - 2, y - 2, w + 4, h + 4, 6);
    const fill = Math.max(0, Math.min(1, m.rick.value));
    const pulse = m.rick.ready ? 0.75 + 0.25 * Math.sin(this.t * 8) : 1;
    g.fillStyle(m.rick.ready ? 0xb6f07a : COLORS.portal, pulse);
    if (fill > 0) g.fillRoundedRect(x, y, Math.max(8, w * fill), h, 5);
    g.lineStyle(2, 0xf4efe6, 0.6);
    g.strokeRoundedRect(x - 2, y - 2, w + 4, h + 4, 6);
    this.texts.rick.setText(m.rick.ready ? `RICK METER · ${m.rick.gadget} ready` : 'RICK METER');
    this.texts.rickKey.setAlpha(m.rick.ready ? 1 : 0.35);
    this.texts.rickKey.setY(y + h / 2);
  }

  private drawItems(g: Phaser.GameObjects.Graphics, m: HudModel): void {
    const box = (x: number, on: boolean) => {
      g.fillStyle(0x0b0814, 1);
      g.fillRoundedRect(x - 22, 6, 44, 44, 8);
      g.lineStyle(2, on ? 0xf4efe6 : 0x5a5070, 1);
      g.strokeRoundedRect(x - 22, 6, 44, 44, 8);
    };
    box(434, !!m.active);
    box(492, !!m.consumable);
    if (m.active) {
      this.icons.active.setTexture(`icon-${m.active.id}`).setVisible(true);
      const ready = m.active.charge >= m.active.max;
      this.icons.active.setAlpha(ready ? 1 : 0.5);
      const pips = m.active.max;
      for (let i = 0; i < pips; i++) {
        g.fillStyle(i < m.active.charge ? COLORS.portal : 0x3a3150, 1);
        g.fillRect(414 + (i * 40) / pips, 44, Math.max(2, 40 / pips - 2), 4);
      }
      if (ready) {
        g.lineStyle(3, COLORS.portal, 0.6 + 0.4 * Math.sin(this.t * 6));
        g.strokeRoundedRect(412, 6, 44, 44, 8);
      }
    } else this.icons.active.setVisible(false);
    if (m.consumable) this.icons.cons.setTexture(`icon-${m.consumable.id}`).setVisible(true);
    else this.icons.cons.setVisible(false);
  }

  private drawStatuses(m: HudModel): void {
    const list = m.statuses;
    while (this.statusIcons.length < list.length) {
      this.statusIcons.push(this.add.image(0, 0, '__WHITE').setScale(0.8));
      this.statusTexts.push(this.add.text(0, 0, '', textStyle(11, '#ffffff')).setOrigin(0.5, 0));
    }
    this.statusIcons.forEach((icon, i) => {
      const s = list[i];
      const txt = this.statusTexts[i];
      if (!s) {
        icon.setVisible(false);
        txt.setVisible(false);
        return;
      }
      const x = 640 + i * 44;
      icon.setVisible(true).setTexture(`status-${s.id}`).setPosition(x, 24);
      const label = s.kind === 'seconds' ? `${Math.ceil(s.remaining)}s` : s.kind === 'rooms' ? `${Math.ceil(s.remaining)} rm` : '';
      txt.setVisible(true).setText(label).setPosition(x, 40).setColor(s.positive ? '#b6f07a' : '#ffb38a');
    });
  }

  private drawWidgets(g: Phaser.GameObjects.Graphics, m: HudModel): void {
    let y = HUD_HEIGHT + (m.objective ? 40 : 14);
    while (this.widgetTexts.length < m.widgets.length) this.widgetTexts.push(this.add.text(0, 0, '', textStyle(12, '#ffffff')));
    this.widgetTexts.forEach((t, i) => t.setVisible(i < m.widgets.length));
    m.widgets.forEach((w, i) => {
      const x = 16;
      const width = 220;
      g.fillStyle(0x0b0814, 0.85);
      g.fillRoundedRect(x - 4, y - 4, width + 8, 32, 6);
      g.fillStyle(0x3a3150, 1);
      g.fillRect(x, y + 16, width, 8);
      const alpha = w.alert ? 0.6 + 0.4 * Math.sin(this.t * 12) : 1;
      g.fillStyle(w.color, alpha);
      g.fillRect(x, y + 16, width * Math.max(0, Math.min(1, w.value)), 8);
      this.widgetTexts[i].setText(`${w.label}${w.text ? `  ${w.text}` : ''}`).setPosition(x, y - 1);
      y += 40;
    });
  }

  private drawBoss(g: Phaser.GameObjects.Graphics, m: HudModel): void {
    if (!m.boss) {
      this.texts.bossTitle.setText('');
      return;
    }
    const w = 560;
    const x = (GAME_WIDTH - w) / 2;
    const y = GAME_HEIGHT - 36;
    g.fillStyle(0x0b0814, 0.9);
    g.fillRoundedRect(x - 4, y - 4, w + 8, 22, 6);
    g.fillStyle(0xe0484d, 1);
    g.fillRoundedRect(x, y, w * (m.boss.hp / m.boss.maxHp), 14, 4);
    // Ticks where the fight changes phase.
    for (const f of m.boss.phases ?? []) {
      g.fillStyle(0xf4efe6, 0.9);
      g.fillRect(x + w * f - 1.5, y - 3, 3, 20);
    }
    g.lineStyle(2, 0xf4efe6, 0.7);
    g.strokeRoundedRect(x - 4, y - 4, w + 8, 22, 6);
    this.texts.bossTitle.setText(m.boss.title);
  }

  private drawMap(m: HudModel): void {
    const g = this.mapG;
    g.clear();
    this.texts.mapTitle.setVisible(this.bigMap);
    this.texts.mapHelp.setVisible(this.bigMap);
    if (!m.map) return;
    const rooms = m.map.rooms.filter((r) => r.seen || r.visited);
    if (!rooms.length) return;
    const big = this.bigMap;
    const cw = big ? 56 : 20;
    const ch = big ? 38 : 14;
    const gap = big ? 8 : 3;
    const xs = rooms.map((r) => r.x);
    const ys = rooms.map((r) => r.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const spanX = Math.max(...xs) - minX + 1;
    const spanY = Math.max(...ys) - minY + 1;
    const totalW = spanX * (cw + gap);
    const totalH = spanY * (ch + gap);
    let ox: number;
    let oy: number;
    if (big) {
      g.fillStyle(0x0b0814, 0.85);
      g.fillRect(0, HUD_HEIGHT, GAME_WIDTH, GAME_HEIGHT - HUD_HEIGHT);
      ox = (GAME_WIDTH - totalW) / 2;
      oy = (GAME_HEIGHT - totalH) / 2 + 20;
      this.texts.mapTitle.setText(m.actName);
      this.texts.mapHelp.setText(
        ['Tab / M: close map', ...m.mechanicHelp, m.map.inAnnex ? 'You are past the finale.' : ''].filter(Boolean).join('\n'),
      );
    } else {
      const maxW = 176;
      const maxH = 118;
      ox = GAME_WIDTH - 12 - Math.min(maxW, totalW);
      oy = HUD_HEIGHT + 10;
      g.fillStyle(0x0b0814, 0.55);
      g.fillRoundedRect(ox - 6, oy - 6, Math.min(maxW, totalW) + 12, Math.min(maxH, totalH) + 12, 8);
      // Keep the current room visible if the floor is wider than the minimap.
      const cur = rooms.find((r) => r.current);
      if (cur && totalW > maxW) ox -= Phaser.Math.Clamp((cur.x - minX + 0.5) * (cw + gap) - maxW / 2, 0, totalW - maxW);
      if (cur && totalH > maxH) oy -= Phaser.Math.Clamp((cur.y - minY + 0.5) * (ch + gap) - maxH / 2, 0, totalH - maxH);
    }
    for (const r of rooms) {
      const x = ox + (r.x - minX) * (cw + gap);
      const y = oy + (r.y - minY) * (ch + gap);
      if (!big && (x < GAME_WIDTH - 12 - 176 - 1 || y > HUD_HEIGHT + 10 + 118)) continue;
      const kindColor = KIND_COLORS[r.kind];
      const fill = r.current ? 0xffffff : r.visited ? 0x8a8199 : 0x3a3150;
      g.fillStyle(fill, r.current ? 1 : 0.95);
      g.fillRect(x, y, cw, ch);
      if (kindColor && (r.kind !== 'start' || big)) {
        g.fillStyle(kindColor, 1);
        const s = big ? 12 : 6;
        g.fillCircle(x + cw / 2, y + ch / 2, s / 2 + 1);
      }
      if (r.visited && !r.cleared && r.kind === 'combat') {
        g.lineStyle(2, 0xff6a5a, 1);
        g.strokeRect(x, y, cw, ch);
      }
    }
  }

  // ---- HudApi ----------------------------------------------------------------------------------

  toast(text: string, opts: ToastOptions = {}): void {
    this.whenReady(() => {
      if (opts.banner) {
        this.banner(text, opts.sub, opts.color);
        return;
      }
      const label = this.add.text(0, 0, text, textStyle(17, '#ffffff', { align: 'center', wordWrap: { width: 520 } })).setOrigin(0.5, 0);
      const parts: Phaser.GameObjects.GameObject[] = [label];
      let h = label.height;
      if (opts.sub) {
        const sub = this.add.text(0, h + 2, opts.sub, textStyle(13, '#d8d0e6', { align: 'center', wordWrap: { width: 520 } })).setOrigin(0.5, 0);
        parts.push(sub);
        h += sub.height + 2;
      }
      const w = Math.max(...parts.map((p) => (p as Phaser.GameObjects.Text).width)) + 28;
      const bg = this.add.graphics();
      bg.fillStyle(0x140f1f, 0.92);
      bg.fillRoundedRect(-w / 2, -8, w, h + 16, 10);
      bg.lineStyle(2, opts.color ?? 0xf4efe6, 1);
      bg.strokeRoundedRect(-w / 2, -8, w, h + 16, 10);
      const box = this.add.container(GAME_WIDTH / 2, 0, [bg, ...parts]).setDepth(50);
      this.toasts.push({ box, life: opts.seconds ?? 2.6 });
      this.layoutToasts();
    });
  }

  private layoutToasts(): void {
    let y = HUD_HEIGHT + 64;
    for (const t of this.toasts) {
      t.box.setY(y);
      y += t.box.getBounds().height + 8;
    }
  }

  private updateToasts(dt: number): void {
    let changed = false;
    for (const t of this.toasts) {
      t.life -= dt;
      if (t.life < 0.3) t.box.setAlpha(Math.max(0, t.life / 0.3));
    }
    this.toasts = this.toasts.filter((t) => {
      if (t.life > 0) return true;
      t.box.destroy();
      changed = true;
      return false;
    });
    while (this.toasts.length > 4) {
      this.toasts.shift()!.box.destroy();
      changed = true;
    }
    if (changed) this.layoutToasts();
  }

  banner(title: string, sub?: string, color = 0x97ce4c): void {
    this.whenReady(() => {
      const t = this.add.text(0, 0, title, displayStyle(56, '#ffffff')).setOrigin(0.5);
      const parts: Phaser.GameObjects.GameObject[] = [];
      const strip = this.add.graphics();
      strip.fillStyle(0x0b0814, 0.8);
      strip.fillRect(-GAME_WIDTH / 2, -54, GAME_WIDTH, sub ? 118 : 96);
      strip.fillStyle(color, 1);
      strip.fillRect(-GAME_WIDTH / 2, -54, GAME_WIDTH, 4);
      strip.fillRect(-GAME_WIDTH / 2, (sub ? 118 : 96) - 58, GAME_WIDTH, 4);
      parts.push(strip, t);
      if (sub) parts.push(this.add.text(0, 42, sub, textStyle(20, '#d8d0e6')).setOrigin(0.5));
      const box = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT * 0.36, parts).setDepth(60).setAlpha(0);
      this.tweens.add({ targets: box, alpha: 1, duration: 200 });
      this.tweens.add({ targets: box, alpha: 0, delay: 1900, duration: 400, onComplete: () => box.destroy() });
    });
  }

  itemBanner(name: string, blurb: string, kind: string): void {
    this.whenReady(() => {
      const title = this.add.text(0, 0, name, displayStyle(34, '#ffe27a')).setOrigin(0.5, 1);
      const line = this.add.text(0, 8, blurb, textStyle(18, '#ffffff', { align: 'center', wordWrap: { width: 700 } })).setOrigin(0.5, 0);
      const tag = this.add.text(0, 14 + line.height, kind, textStyle(13, '#97ce4c')).setOrigin(0.5, 0);
      const w = Math.max(title.width, line.width, 300) + 48;
      const h = title.height + line.height + tag.height + 40;
      const bg = this.add.graphics();
      bg.fillStyle(0x140f1f, 0.92);
      bg.fillRoundedRect(-w / 2, -title.height - 16, w, h, 14);
      bg.lineStyle(3, 0xffe27a, 1);
      bg.strokeRoundedRect(-w / 2, -title.height - 16, w, h, 14);
      const box = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT - 190, [bg, title, line, tag]).setDepth(55).setScale(0.7).setAlpha(0);
      this.tweens.add({ targets: box, alpha: 1, scale: 1, duration: 220, ease: 'Back.easeOut' });
      this.tweens.add({ targets: box, alpha: 0, delay: 2600, duration: 400, onComplete: () => box.destroy() });
    });
  }

  toggleMap(): void {
    this.bigMap = !this.bigMap;
  }

  // ---- choice prompts --------------------------------------------------------------------------

  showChoice(prompt: ChoicePrompt): void {
    this.whenReady(() => {
      this.hideChoice();
      const w = 820;
      const parts: Phaser.GameObjects.GameObject[] = [];
      const bg = this.add.graphics();
      parts.push(bg);
      let y = 16;
      if (prompt.title) {
        parts.push(this.add.text(0, y, prompt.title, textStyle(14, '#97ce4c')).setOrigin(0.5, 0));
        y += 22;
      }
      const speaker = prompt.speaker ? svc().registry.characters.get(prompt.speaker)?.name : undefined;
      const q = this.add
        .text(0, y, speaker ? `${speaker}: ${prompt.question}` : prompt.question, textStyle(20, '#ffffff', { align: 'center', wordWrap: { width: w - 60 } }))
        .setOrigin(0.5, 0);
      parts.push(q);
      y += q.height + 14;
      const buttons: Phaser.GameObjects.Container[] = [];
      const bw = (w - 60) / 2 - 8;
      prompt.options.forEach((opt, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const bx = -w / 2 + 30 + col * (bw + 16);
        const by = y + row * 52;
        const bgb = this.add.graphics();
        const glow = prompt.glowCorrect && prompt.correct === i;
        bgb.fillStyle(glow ? 0x2c4a1c : 0x2a2140, 1);
        bgb.fillRoundedRect(0, 0, bw, 44, 8);
        bgb.lineStyle(2, glow ? 0x97ce4c : 0x7a6f96, 1);
        bgb.strokeRoundedRect(0, 0, bw, 44, 8);
        const label = this.add.text(14, 22, `${i + 1}  ${opt}`, textStyle(17, '#ffffff', { wordWrap: { width: bw - 24 } })).setOrigin(0, 0.5);
        const btn = this.add.container(bx, by, [bgb, label]).setSize(bw, 44);
        btn.setInteractive(new Phaser.Geom.Rectangle(0, 0, bw, 44), Phaser.Geom.Rectangle.Contains);
        btn.on('pointerdown', () => this.answer(i));
        if (glow) this.tweens.add({ targets: label, alpha: 0.65, yoyo: true, repeat: -1, duration: 600 });
        buttons.push(btn);
        parts.push(btn);
      });
      y += Math.ceil(prompt.options.length / 2) * 52 + 6;
      const bar = this.add.graphics();
      parts.push(bar);
      const h = y + (prompt.timeLimit ? 20 : 6);
      bg.fillStyle(0x140f1f, 0.95);
      bg.fillRoundedRect(-w / 2, 0, w, h, 14);
      bg.lineStyle(3, 0x97ce4c, 1);
      bg.strokeRoundedRect(-w / 2, 0, w, h, 14);
      const box = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT - h - 16, parts).setDepth(70);
      bar.setPosition(0, h - 14);
      this.choice = { prompt, box, bar, left: prompt.timeLimit ?? 0, buttons, answered: false };
    });
  }

  private answer(i: number | null): void {
    const c = this.choice;
    if (!c || c.answered) return;
    c.answered = true;
    const prompt = c.prompt;
    this.hideChoice();
    prompt.onAnswer(i);
  }

  private updateChoice(dt: number): void {
    const c = this.choice;
    if (!c) return;
    this.choiceKeys.forEach((k, i) => {
      if (Phaser.Input.Keyboard.JustDown(k) && i < c.prompt.options.length) this.answer(i);
    });
    if (!this.choice || !c.prompt.timeLimit) return;
    c.left -= dt;
    const w = 780;
    c.bar.clear();
    c.bar.fillStyle(0x3a3150, 1);
    c.bar.fillRect(-w / 2, 0, w, 6);
    c.bar.fillStyle(c.left < 3 ? 0xff6a5a : 0x97ce4c, 1);
    c.bar.fillRect(-w / 2, 0, w * Math.max(0, c.left / c.prompt.timeLimit), 6);
    if (c.left <= 0) this.answer(null);
  }

  hideChoice(): void {
    if (!this.ready) {
      this.queue.push(() => this.hideChoice());
      return;
    }
    if (!this.choice) return;
    this.choice.box.destroy();
    this.choice = null;
  }
}

export const HUD_FONT = FONT;
