/**
 * Comic-panel cutscenes: each cutscene is one page of 2-6 panels, revealed one at a time with
 * typewriter text. Space/Enter/click advances, Esc skips everything.
 */
import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../engine/constants';
import { svc } from '../engine/services';
import type { CutsceneDef, CutscenePanel } from '../engine/types';
import { COLORS, displayStyle, textStyle } from '../engine/ui/text';

interface CutsceneData {
  ids: string[];
  onDone: () => void;
}

interface PanelView {
  text: Phaser.GameObjects.Text;
  full: string;
  shown: number;
}

const CPS = { slow: 28, normal: 55, fast: 130 };

export class CutsceneScene extends Phaser.Scene {
  private list: string[] = [];
  private onDone: () => void = () => undefined;
  private index = 0;
  private panelIndex = 0;
  private def: CutsceneDef | null = null;
  private views: PanelView[] = [];
  private typing: PanelView | null = null;
  private acc = 0;
  private page: Phaser.GameObjects.GameObject[] = [];
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private prompt!: Phaser.GameObjects.Text;
  private done = false;

  constructor() {
    super('Cutscene');
  }

  init(data: CutsceneData): void {
    this.list = data.ids;
    this.onDone = data.onDone;
    this.index = 0;
    this.done = false;
  }

  create(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b0814, 1).setOrigin(0);
    this.prompt = this.add.text(GAME_WIDTH - 24, GAME_HEIGHT - 18, 'Space / click ▶', textStyle(15, '#b8b0c8')).setOrigin(1, 1).setDepth(10);
    this.add.text(24, GAME_HEIGHT - 18, 'Esc: skip', textStyle(13, '#6d6480')).setOrigin(0, 1).setDepth(10);
    this.keys = this.input.keyboard!.addKeys('SPACE,ENTER,E,ESC', true) as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.on('pointerdown', () => this.advance());
    this.showCutscene(0);
  }

  private showCutscene(i: number): void {
    this.page.forEach((o) => o.destroy());
    this.page = [];
    this.views = [];
    this.typing = null;
    this.index = i;
    this.panelIndex = 0;
    this.def = svc().registry.cutscenes.get(this.list[i]) ?? null;
    if (!this.def) {
      this.finish();
      return;
    }
    if (this.def.title) {
      const t = this.add.text(GAME_WIDTH / 2, 30, this.def.title, displayStyle(28, '#97ce4c')).setOrigin(0.5);
      this.page.push(t);
    }
    this.revealNext();
  }

  private layout(n: number, i: number): { x: number; y: number; w: number; h: number } {
    const top = this.def?.title ? 60 : 36;
    const areaW = GAME_WIDTH - 80;
    const areaH = GAME_HEIGHT - top - 56;
    const cols = n <= 3 ? n : n === 4 ? 2 : 3;
    const rows = Math.ceil(n / cols);
    const gap = 18;
    const w = (areaW - (cols - 1) * gap) / cols;
    const h = (areaH - (rows - 1) * gap) / rows;
    const row = Math.floor(i / cols);
    const inRow = Math.min(cols, n - row * cols);
    const col = i % cols;
    const offset = ((cols - inRow) * (w + gap)) / 2;
    return { x: 40 + offset + col * (w + gap), y: top + row * (h + gap), w, h };
  }

  private revealNext(): void {
    const def = this.def!;
    const panel = def.panels[this.panelIndex];
    const box = this.layout(def.panels.length, this.panelIndex);
    const view = this.drawPanel(panel, box);
    this.views.push(view);
    this.typing = view;
    this.acc = 0;
    if (panel.sfx) svc().audio.play(panel.sfx);
    this.panelIndex++;
  }

  private drawPanel(p: CutscenePanel, b: { x: number; y: number; w: number; h: number }): PanelView {
    const reg = svc().registry;
    const objs: (Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.AlphaSingle)[] = [];
    const maskShape = this.make.graphics({ x: 0, y: 0 }, false);
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(b.x, b.y, b.w, b.h);
    const mask = maskShape.createGeometryMask();

    const bg = this.add.graphics().setPosition(b.x, b.y);
    const backdrop = reg.backdrops.get(p.backdrop);
    if (backdrop) backdrop.draw(bg, b.w, b.h);
    else {
      bg.fillStyle(0x241c33, 1);
      bg.fillRect(0, 0, b.w, b.h);
    }
    bg.setMask(mask);
    objs.push(bg);

    const speaker = p.speaker ? reg.characters.get(p.speaker) : undefined;
    const size = Math.min(b.h * 0.78, b.w * 0.55);
    if (speaker) {
      const g = this.add.graphics();
      g.setPosition(b.x + (p.caption ? (b.w - size) / 2 : 8), b.y + b.h - size * 0.92);
      speaker.portrait(g, size, p.expression ?? 'normal');
      g.setMask(mask);
      objs.push(g);
    }
    (p.cast ?? []).forEach((id, i) => {
      const c = reg.characters.get(id);
      if (!c) return;
      const s = size * 0.6;
      const g = this.add.graphics();
      g.setPosition(b.x + b.w - s * (i + 1) - 8, b.y + b.h - s * 0.9);
      c.portrait(g, s, 'normal');
      g.setMask(mask);
      objs.push(g);
    });

    const frame = this.add.graphics().setPosition(b.x, b.y);
    frame.lineStyle(8, 0xf4efe6, 1);
    frame.strokeRect(0, 0, b.w, b.h);
    frame.lineStyle(4, COLORS.ink, 1);
    frame.strokeRect(0, 0, b.w, b.h);
    objs.push(frame);

    const pad = 12;
    const wrap = b.w - 48;
    const style = textStyle(p.caption ? 18 : 19, '#1a1424', { strokeThickness: 0, wordWrap: { width: wrap } });
    const measure = this.add.text(0, 0, p.text, style).setVisible(false);
    const tw = Math.min(wrap, measure.width);
    const th = measure.height;
    measure.destroy();
    const text = this.add.text(0, 0, '', style);
    const bubble = this.add.graphics().setPosition(b.x, b.y);
    objs.push(bubble);
    if (p.caption) {
      bubble.fillStyle(0xffe27a, 1);
      bubble.fillRect(12, 12, tw + pad * 2, th + pad * 2);
      bubble.lineStyle(3, COLORS.ink, 1);
      bubble.strokeRect(12, 12, tw + pad * 2, th + pad * 2);
      text.setPosition(b.x + 12 + pad, b.y + 12 + pad);
    } else {
      const bx = speaker ? Math.max(12, Math.min(b.w - tw - pad * 2 - 12, size * 0.55)) : 12;
      const bh = th + pad * 2;
      bubble.fillStyle(0xffffff, 1);
      bubble.fillRoundedRect(bx, 14, tw + pad * 2, bh, 14);
      bubble.lineStyle(3, COLORS.ink, 1);
      bubble.strokeRoundedRect(bx, 14, tw + pad * 2, bh, 14);
      if (speaker) {
        bubble.fillStyle(0xffffff, 1);
        bubble.fillTriangle(bx + 24, 14 + bh - 3, bx + 50, 14 + bh - 3, bx + 18, 14 + bh + 22);
        bubble.lineStyle(3, COLORS.ink, 1);
        bubble.lineBetween(bx + 24, 14 + bh, bx + 18, 14 + bh + 22);
        bubble.lineBetween(bx + 18, 14 + bh + 22, bx + 50, 14 + bh);
        const tag = this.add.text(b.x + bx + 14, b.y + 14, speaker.name, textStyle(13, '#ffffff')).setOrigin(0, 0.5);
        const tagBg = this.add.graphics().setPosition(b.x, b.y);
        tagBg.fillStyle(speaker.color, 1);
        tagBg.fillRoundedRect(bx + 8, 5, tag.width + 12, 18, 6);
        tagBg.lineStyle(2, COLORS.ink, 1);
        tagBg.strokeRoundedRect(bx + 8, 5, tag.width + 12, 18, 6);
        tag.setDepth(1);
        objs.push(tagBg, tag);
      }
      text.setPosition(b.x + bx + pad, b.y + 14 + pad);
    }
    text.setDepth(1);
    objs.push(text);
    for (const o of objs) {
      o.setAlpha(0);
      this.page.push(o);
    }
    this.page.push(maskShape);
    this.tweens.add({ targets: objs, alpha: 1, duration: 220, ease: 'Quad.easeOut' });
    return { text, full: p.text, shown: 0 };
  }

  private advance(): void {
    if (this.done) return;
    if (this.typing && this.typing.shown < this.typing.full.length) {
      this.typing.shown = this.typing.full.length;
      this.typing.text.setText(this.typing.full);
      this.typing = null;
      return;
    }
    svc().audio.play('ui-move');
    if (this.def && this.panelIndex < this.def.panels.length) {
      this.revealNext();
      return;
    }
    if (this.index + 1 < this.list.length) this.showCutscene(this.index + 1);
    else this.finish();
  }

  private finish(): void {
    if (this.done) return;
    this.done = true;
    const cb = this.onDone;
    this.scene.stop();
    cb();
  }

  override update(_t: number, delta: number): void {
    const JD = Phaser.Input.Keyboard.JustDown;
    if (JD(this.keys.ESC)) {
      svc().audio.play('ui-back');
      this.finish();
      return;
    }
    if (JD(this.keys.SPACE) || JD(this.keys.ENTER) || JD(this.keys.E)) this.advance();
    const v = this.typing;
    if (v && v.shown < v.full.length) {
      this.acc += (delta / 1000) * CPS[svc().save.settings.textSpeed];
      const before = v.shown;
      while (this.acc >= 1 && v.shown < v.full.length) {
        v.shown++;
        this.acc -= 1;
      }
      if (v.shown !== before) {
        v.text.setText(v.full.slice(0, v.shown));
        if (Math.floor(v.shown / 3) !== Math.floor(before / 3)) svc().audio.play('text-blip');
      }
      if (v.shown >= v.full.length) this.typing = null;
    }
    this.prompt.setAlpha(this.typing ? 0.4 : 0.7 + 0.3 * Math.sin(this.time.now / 200));
  }
}
