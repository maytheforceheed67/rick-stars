/** Shared text styling: chunky system fonts with dark outlines (no font files to load). */
import type Phaser from 'phaser';

export const FONT = '"Trebuchet MS", "Segoe UI", Verdana, sans-serif';
export const DISPLAY_FONT = 'Impact, "Arial Black", "Trebuchet MS", sans-serif';

export const COLORS = {
  ink: 0x1a1424,
  inkCss: '#1a1424',
  paper: 0xf4efe6,
  portal: 0x97ce4c,
  portalCss: '#97ce4c',
  danger: 0xff4a3d,
  gold: 0xffd54a,
  goldCss: '#ffd54a',
  panel: 0x241c33,
  panelLight: 0x362a4d,
  muted: '#b8b0c8',
};

export function textStyle(size: number, color = '#ffffff', opts: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {}): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: FONT,
    fontSize: `${size}px`,
    fontStyle: 'bold',
    color,
    stroke: COLORS.inkCss,
    strokeThickness: Math.max(2, Math.round(size / 5)),
    ...opts,
  };
}

export function displayStyle(size: number, color = '#ffffff', opts: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {}): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: DISPLAY_FONT,
    fontSize: `${size}px`,
    color,
    stroke: COLORS.inkCss,
    strokeThickness: Math.max(4, Math.round(size / 6)),
    ...opts,
  };
}

/** Formats seconds as m:ss. */
export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
