/**
 * The rules every flash follows, so none of them ever hides a bullet Morty has to dodge. Getting
 * hurt only lights up the edge of the screen; a full-screen flash stays faint while there's
 * anything to dodge on screen; after a hit Morty flickers to a tint, never see-through. Pure
 * numbers (the tests hold them to FEEL.hurt and FEEL.flash); Fx draws them.
 */
import { FEEL } from '../../content/balance';

type Hurt = typeof FEEL.hurt;
type Flash = typeof FEEL.flash;

/** How strong a full-screen flash starts out, before anything on screen tones it down. */
export function flashPeak(reduced: boolean, F: Flash = FEEL.flash): number {
  return reduced ? F.reducedAlpha : F.maxAlpha;
}

/** How long a full-screen flash lasts: a Reduced flashes tint fades out over twice as long. */
export function flashLength(ms: number, reduced: boolean): number {
  return reduced ? ms * 2 : ms;
}

/**
 * How opaque a full-screen flash is `t` ms in: fading out from its peak, and never stronger
 * than FEEL.flash.busyAlpha while there are shots or hazards on screen (`busy`).
 */
export function flashAlpha(peak: number, ms: number, t: number, busy: boolean, F: Flash = FEEL.flash): number {
  if (t >= ms || ms <= 0) return 0;
  const a = peak * (1 - Math.max(0, t) / ms);
  return busy ? Math.min(a, F.busyAlpha) : a;
}

/**
 * How strong the hurt glow is `edge` px in from the nearest edge of a screen `height` px tall:
 * strongest at the very edge, gone by the edge of its band, so the middle stays clear.
 */
export function hurtEdgeProfile(edge: number, height: number, H: Hurt = FEEL.hurt): number {
  const band = H.edgeBand * height;
  if (edge >= band) return 0;
  const k = 1 - Math.max(0, edge) / band;
  return H.edgeAlpha * k * k;
}

/** How much of the hurt glow (or, with Reduced flashes, the red border) is left `t` ms after a hit. */
export function hurtFade(t: number, reduced: boolean, H: Hurt = FEEL.hurt): number {
  const ms = reduced ? H.borderMs : H.edgeMs;
  return t >= ms ? 0 : 1 - Math.max(0, t) / ms;
}

/** Blends two 0xRRGGBB colors: `k` 0 is `a`, 1 is `b`. */
export function mixColor(a: number, b: number, k: number): number {
  const ch = (shift: number) => Math.round(((a >> shift) & 0xff) + (((b >> shift) & 0xff) - ((a >> shift) & 0xff)) * k);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/**
 * Morty's tint `t` s into the blink after a hit: his own colors (white, no tint) and a bright red
 * tint in turn. Only ever a tint: he never fades, so you always see where you are. With Reduced
 * flashes it's a slow pulse instead of a flicker.
 */
export function blinkTint(t: number, reduced: boolean, H: Hurt = FEEL.hurt): number {
  if (reduced) return mixColor(0xffffff, H.blinkTint, 0.35 - 0.35 * Math.cos(t * Math.PI * 2 * H.pulseHz));
  return Math.sin(t * Math.PI * 2 * H.blinkHz) >= 0 ? H.blinkTint : 0xffffff;
}
