/**
 * Sound effects are synthesized with WebAudio from these little recipes (jsfxr-style), so the
 * game ships with no audio files. A recipe is a list of layered tones.
 */
export interface Tone {
  wave: OscillatorType | 'noise';
  /** Start frequency in Hz (for noise: the filter frequency if no filter is given). */
  freq: number;
  /** End frequency (exponential slide). */
  freqEnd?: number;
  /** Seconds. */
  duration: number;
  attack?: number;
  volume?: number;
  /** Start offset in seconds. */
  delay?: number;
  vibrato?: { rate: number; depth: number };
  filter?: { type: BiquadFilterType; freq: number; q?: number; freqEnd?: number };
}

export type SfxRecipe = Tone[];

/** Built-in sound effects. Episodes can add more through EpisodeContent.sfx. */
export const SFX: Record<string, SfxRecipe> = {
  shoot: [{ wave: 'square', freq: 880, freqEnd: 420, duration: 0.09, volume: 0.18, filter: { type: 'lowpass', freq: 3200 } }],
  'shoot-heavy': [
    { wave: 'sawtooth', freq: 520, freqEnd: 160, duration: 0.14, volume: 0.2, filter: { type: 'lowpass', freq: 2400 } },
    { wave: 'noise', freq: 2000, duration: 0.06, volume: 0.12 },
  ],
  // A thud, clearly different from the zap of firing.
  hit: [
    { wave: 'noise', freq: 900, duration: 0.06, volume: 0.22, filter: { type: 'lowpass', freq: 1500, freqEnd: 350 } },
    { wave: 'sine', freq: 190, freqEnd: 85, duration: 0.08, volume: 0.24 },
  ],
  'hit-heavy': [
    { wave: 'noise', freq: 700, duration: 0.12, volume: 0.28, filter: { type: 'lowpass', freq: 1100, freqEnd: 200 } },
    { wave: 'sine', freq: 150, freqEnd: 55, duration: 0.16, volume: 0.3 },
  ],
  stagger: [
    { wave: 'triangle', freq: 900, freqEnd: 500, duration: 0.25, volume: 0.12, vibrato: { rate: 14, depth: 80 } },
    { wave: 'triangle', freq: 700, freqEnd: 380, duration: 0.3, volume: 0.1, delay: 0.12 },
  ],
  'shield-pop': [
    { wave: 'noise', freq: 4000, duration: 0.18, volume: 0.18, filter: { type: 'highpass', freq: 2500 } },
    { wave: 'triangle', freq: 1400, freqEnd: 500, duration: 0.2, volume: 0.12 },
  ],
  'rick-call': [
    { wave: 'sine', freq: 220, freqEnd: 1760, duration: 0.35, volume: 0.14 },
    { wave: 'noise', freq: 3000, duration: 0.3, volume: 0.1, filter: { type: 'bandpass', freq: 1500, freqEnd: 5000, q: 2 } },
  ],
  crumble: [
    { wave: 'noise', freq: 500, duration: 0.45, volume: 0.24, filter: { type: 'lowpass', freq: 900, freqEnd: 150 } },
    { wave: 'sine', freq: 110, freqEnd: 45, duration: 0.4, volume: 0.2 },
  ],
  bubble: [{ wave: 'sine', freq: 300, freqEnd: 700, duration: 0.12, volume: 0.12 }],
  perfect: [
    { wave: 'triangle', freq: 1200, freqEnd: 2400, duration: 0.18, volume: 0.14 },
    { wave: 'sine', freq: 1800, freqEnd: 3600, duration: 0.3, volume: 0.1, delay: 0.06, vibrato: { rate: 24, depth: 60 } },
  ],
  'enemy-die': [
    { wave: 'noise', freq: 1400, duration: 0.18, volume: 0.25, filter: { type: 'bandpass', freq: 1400, freqEnd: 300, q: 1.2 } },
    { wave: 'square', freq: 420, freqEnd: 90, duration: 0.18, volume: 0.14 },
  ],
  shatter: [
    { wave: 'noise', freq: 6000, duration: 0.25, volume: 0.28, filter: { type: 'highpass', freq: 3500 } },
    { wave: 'triangle', freq: 2400, freqEnd: 3800, duration: 0.12, volume: 0.12 },
    { wave: 'triangle', freq: 3100, freqEnd: 1900, duration: 0.16, volume: 0.1, delay: 0.05 },
  ],
  hurt: [
    { wave: 'sawtooth', freq: 420, freqEnd: 110, duration: 0.25, volume: 0.28, filter: { type: 'lowpass', freq: 1800 } },
    { wave: 'noise', freq: 900, duration: 0.12, volume: 0.12 },
  ],
  dash: [{ wave: 'noise', freq: 1200, duration: 0.14, volume: 0.16, filter: { type: 'bandpass', freq: 900, freqEnd: 2600, q: 0.8 } }],
  pickup: [
    { wave: 'square', freq: 660, duration: 0.07, volume: 0.14 },
    { wave: 'square', freq: 990, duration: 0.09, volume: 0.14, delay: 0.06 },
  ],
  scrap: [{ wave: 'triangle', freq: 1300, freqEnd: 1900, duration: 0.07, volume: 0.16 }],
  heal: [
    { wave: 'sine', freq: 520, freqEnd: 780, duration: 0.18, volume: 0.2 },
    { wave: 'sine', freq: 780, freqEnd: 1040, duration: 0.18, volume: 0.16, delay: 0.1 },
  ],
  item: [
    { wave: 'square', freq: 523, duration: 0.1, volume: 0.14 },
    { wave: 'square', freq: 659, duration: 0.1, volume: 0.14, delay: 0.09 },
    { wave: 'square', freq: 784, duration: 0.1, volume: 0.14, delay: 0.18 },
    { wave: 'square', freq: 1046, duration: 0.22, volume: 0.14, delay: 0.27 },
  ],
  'door-close': [{ wave: 'noise', freq: 300, duration: 0.22, volume: 0.3, filter: { type: 'lowpass', freq: 380 } }],
  'door-open': [
    { wave: 'triangle', freq: 330, freqEnd: 660, duration: 0.18, volume: 0.16 },
    { wave: 'noise', freq: 500, duration: 0.1, volume: 0.1, filter: { type: 'lowpass', freq: 600 } },
  ],
  'room-clear': [
    { wave: 'triangle', freq: 392, duration: 0.1, volume: 0.16 },
    { wave: 'triangle', freq: 523, duration: 0.18, volume: 0.16, delay: 0.09 },
  ],
  'freeze-ray': [
    { wave: 'sine', freq: 2400, freqEnd: 600, duration: 0.5, volume: 0.2, vibrato: { rate: 40, depth: 120 } },
    { wave: 'noise', freq: 5000, duration: 0.4, volume: 0.12, filter: { type: 'highpass', freq: 4000 } },
  ],
  portal: [
    { wave: 'sine', freq: 180, freqEnd: 900, duration: 0.45, volume: 0.22, vibrato: { rate: 18, depth: 40 } },
    { wave: 'noise', freq: 800, duration: 0.45, volume: 0.1, filter: { type: 'bandpass', freq: 400, freqEnd: 2400, q: 2 } },
  ],
  burp: [
    { wave: 'sawtooth', freq: 105, freqEnd: 72, duration: 0.55, volume: 0.36, attack: 0.03, vibrato: { rate: 23, depth: 16 }, filter: { type: 'bandpass', freq: 520, freqEnd: 380, q: 2.2 } },
    { wave: 'sawtooth', freq: 98, freqEnd: 70, duration: 0.5, volume: 0.22, attack: 0.03, vibrato: { rate: 31, depth: 11 }, filter: { type: 'lowpass', freq: 900 } },
    { wave: 'noise', freq: 400, duration: 0.3, volume: 0.1, filter: { type: 'lowpass', freq: 450 } },
  ],
  explosion: [
    { wave: 'noise', freq: 900, duration: 0.8, volume: 0.45, filter: { type: 'lowpass', freq: 1400, freqEnd: 120 } },
    { wave: 'sine', freq: 120, freqEnd: 32, duration: 0.6, volume: 0.4 },
  ],
  whistle: [{ wave: 'sine', freq: 2600, duration: 0.45, volume: 0.16, vibrato: { rate: 30, depth: 140 } }],
  stamp: [
    { wave: 'noise', freq: 400, duration: 0.2, volume: 0.35, filter: { type: 'lowpass', freq: 700 } },
    { wave: 'square', freq: 140, freqEnd: 60, duration: 0.2, volume: 0.25 },
  ],
  alarm: [
    { wave: 'square', freq: 880, duration: 0.22, volume: 0.14 },
    { wave: 'square', freq: 660, duration: 0.22, volume: 0.14, delay: 0.24 },
    { wave: 'square', freq: 880, duration: 0.22, volume: 0.14, delay: 0.48 },
    { wave: 'square', freq: 660, duration: 0.22, volume: 0.14, delay: 0.72 },
  ],
  scanner: [
    { wave: 'sine', freq: 1500, duration: 0.08, volume: 0.12 },
    { wave: 'sine', freq: 1500, duration: 0.08, volume: 0.12, delay: 0.12 },
  ],
  fall: [{ wave: 'sine', freq: 900, freqEnd: 90, duration: 0.6, volume: 0.25 }],
  laser: [{ wave: 'sawtooth', freq: 220, freqEnd: 180, duration: 0.5, volume: 0.14, filter: { type: 'lowpass', freq: 1400 } }],
  'laser-warn': [{ wave: 'square', freq: 1200, duration: 0.05, volume: 0.08 }],
  'telegraph-big': [{ wave: 'triangle', freq: 300, freqEnd: 600, duration: 0.3, volume: 0.12 }],
  'boss-roar': [
    { wave: 'sawtooth', freq: 160, freqEnd: 90, duration: 0.7, volume: 0.3, vibrato: { rate: 12, depth: 20 }, filter: { type: 'lowpass', freq: 900 } },
    { wave: 'noise', freq: 600, duration: 0.5, volume: 0.15, filter: { type: 'bandpass', freq: 600, q: 1 } },
  ],
  slash: [{ wave: 'noise', freq: 3000, duration: 0.12, volume: 0.22, filter: { type: 'bandpass', freq: 3500, freqEnd: 1200, q: 1.5 } }],
  throw: [{ wave: 'noise', freq: 1000, duration: 0.1, volume: 0.14, filter: { type: 'bandpass', freq: 800, freqEnd: 1600, q: 1 } }],
  // Morty throwing something: a quick whoosh with a little grunt of effort under it.
  'throw-light': [
    { wave: 'noise', freq: 1400, duration: 0.11, volume: 0.16, filter: { type: 'bandpass', freq: 1300, freqEnd: 3200, q: 1.2 } },
    { wave: 'triangle', freq: 260, freqEnd: 180, duration: 0.07, volume: 0.08 },
  ],
  'ui-move': [{ wave: 'square', freq: 700, duration: 0.04, volume: 0.08 }],
  'ui-select': [
    { wave: 'square', freq: 700, duration: 0.05, volume: 0.1 },
    { wave: 'square', freq: 1050, duration: 0.08, volume: 0.1, delay: 0.05 },
  ],
  'ui-back': [{ wave: 'square', freq: 500, freqEnd: 300, duration: 0.08, volume: 0.1 }],
  'ui-deny': [{ wave: 'square', freq: 180, duration: 0.15, volume: 0.14 }],
  correct: [
    { wave: 'triangle', freq: 660, duration: 0.1, volume: 0.18 },
    { wave: 'triangle', freq: 990, duration: 0.2, volume: 0.18, delay: 0.1 },
  ],
  wrong: [{ wave: 'sawtooth', freq: 200, freqEnd: 150, duration: 0.35, volume: 0.18, filter: { type: 'lowpass', freq: 900 } }],
  spark: [{ wave: 'noise', freq: 5000, duration: 0.1, volume: 0.2, filter: { type: 'highpass', freq: 3000 } }],
  snore: [{ wave: 'sawtooth', freq: 70, freqEnd: 90, duration: 0.8, volume: 0.12, attack: 0.3, filter: { type: 'lowpass', freq: 300 } }],
  'text-blip': [{ wave: 'square', freq: 520, duration: 0.025, volume: 0.04 }],
  splat: [{ wave: 'noise', freq: 600, duration: 0.15, volume: 0.2, filter: { type: 'lowpass', freq: 800, freqEnd: 200 } }],
  bounce: [{ wave: 'triangle', freq: 400, freqEnd: 700, duration: 0.06, volume: 0.12 }],
  victory: [
    { wave: 'square', freq: 523, duration: 0.15, volume: 0.14 },
    { wave: 'square', freq: 659, duration: 0.15, volume: 0.14, delay: 0.15 },
    { wave: 'square', freq: 784, duration: 0.15, volume: 0.14, delay: 0.3 },
    { wave: 'square', freq: 1046, duration: 0.5, volume: 0.14, delay: 0.45 },
    { wave: 'triangle', freq: 262, duration: 0.95, volume: 0.14 },
  ],
  death: [
    { wave: 'square', freq: 440, freqEnd: 110, duration: 0.9, volume: 0.2, vibrato: { rate: 8, depth: 15 } },
    { wave: 'noise', freq: 400, duration: 0.5, volume: 0.1, filter: { type: 'lowpass', freq: 500 } },
  ],
  fizzle: [{ wave: 'noise', freq: 2000, duration: 0.5, volume: 0.15, filter: { type: 'bandpass', freq: 2000, freqEnd: 400, q: 3 } }],
};
