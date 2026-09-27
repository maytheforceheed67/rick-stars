/** The soundtrack of "Lawnmower Dog": one loop per place. Format: see engine/audio/music.ts. */
import type { Track } from '../../../engine/audio/music';
import type { SfxRecipe } from '../../../engine/audio/sfx';

export const DOG_MUSIC: Record<string, Track> = {
  // Tiptoeing through Goldenfold's house.
  'dog-night': {
    bpm: 80,
    bass: 'E2 - . . E2 . . . G2 - . . F#2 . . . E2 - . . E2 . . . B1 - . . D2 . . .',
    lead: '. . B3 . . . . . D4 . . . C4 . . . . . B3 . . . A3 . G3 . . . F#3 . . .',
    drums: 'k . . . . . h . . . . . h . . . k . . . . . h . . . . . h . h .',
    pad: 'E2+G2+B2 C2+E2+G2',
    leadWave: 'triangle',
    leadVolume: 0.07,
  },
  // Goldenfold's dream: an airliner with a lounge-music problem.
  'dog-plane': {
    bpm: 118,
    bass: 'F2 . F2 . C3 . F2 . Bb1 . Bb1 . F2 . Bb1 . C2 . C2 . G2 . C2 . F2 . E2 . D2 . C2 .',
    lead: 'A4 . C5 . F5 . C5 . D5 . Bb4 . F4 . D4 . E4 . G4 . C5 . G4 . F4 . A4 . C5 . A4 .',
    drums: 'k . h . s . h . k . h k s . h . k . h . s . h . k k h . s . o .',
    pad: 'F3+A3+C4 C3+E3+G3',
    leadWave: 'square',
    leadVolume: 0.05,
  },
  'dog-goldenfold-boss': {
    bpm: 140,
    bass: 'D2 D2 D3 D2 D2 D3 C2 C3 Bb1 Bb1 Bb2 Bb1 C2 C2 C3 C2 D2 D2 D3 D2 F2 F2 F3 F2 A1 A1 A2 A1 A1 A2 C#2 C#3',
    lead: 'D5 . . A4 . . D5 . C5 . Bb4 . A4 . G4 . F4 . . G4 . . A4 . F5 . E5 . C#5 . A4 .',
    drums: 'k . h . s . h k k . h . s . h h k . h . s . h k k . h . s s s s',
    leadWave: 'sawtooth',
    leadVolume: 0.05,
  },
  // Outside the club: muffled bass through the wall.
  'dog-club': {
    bpm: 124,
    bass: 'A1 . A2 . A1 . A2 . F1 . F2 . F1 . F2 . C2 . C3 . C2 . C3 . G1 . G2 . G1 . G2 .',
    lead: '. . . . E4 . . . . . . . C4 . . . . . . . G4 . . . . . . . E4 . D4 .',
    drums: 'k . h . k . h . k . h . k . h h k . h . k . h . k . h . k . o .',
    leadWave: 'triangle',
    leadVolume: 0.05,
  },
  // The centaur's dream: pastoral, a little too pleased with itself.
  'dog-centaur': {
    bpm: 96,
    bass: 'G2 - - - D3 - - - C3 - - - D3 - - - G2 - - - B2 - - - A2 - - - D2 - - -',
    lead: 'B4 . D5 . G5 . D5 . C5 . E5 . G5 . E5 . B4 . D5 . A5 . G5 . F#5 . D5 . A4 . C5 .',
    drums: 'k . . h . . s . . h k . . h s . k . . h . . s . . h k . s . h .',
    pad: 'G2+B2+D3 C3+E3+G3',
    leadWave: 'triangle',
    leadVolume: 0.08,
  },
  // The little girl's dream: a music box that isn't quite right.
  'dog-girl': {
    bpm: 108,
    bass: 'C2 . . . G2 . . . A2 . . . E2 . . . F2 . . . C2 . . . F2 . . . G2 . . .',
    lead: 'E5 G5 C6 G5 E5 G5 C6 G5 A5 C6 E6 C6 A5 C6 E6 C6 F5 A5 C6 A5 F5 A5 C6 A5 G5 B5 D6 B5 G5 B5 D6 Eb6',
    drums: 'k . . . h . . . s . . . h . . . k . . . h . . . s . . . h . h .',
    pad: 'C3+E3+G3 F2+A2+C3',
    leadWave: 'sine',
    leadVolume: 0.06,
  },
  // Terry's house: running for your life, in a minor key.
  'dog-terry': {
    bpm: 150,
    bass: 'E2 E2 E3 E2 E2 E3 D2 D3 C2 C2 C3 C2 B1 B1 B2 B1 E2 E2 E3 E2 G2 G2 G3 G2 A1 A1 A2 A1 B1 B2 D#2 D#3',
    lead: 'E5 . . B4 . . E5 . D5 . C5 . B4 . A4 . G4 . . A4 . . B4 . G5 . F#5 . D#5 . B4 .',
    drums: 'k h h h s h h k k h h h s h k k k h h h s h h k k h h h s s s s',
    leadWave: 'sawtooth',
    leadVolume: 0.05,
  },
  // Terry's dream school: the Pilot's school tune, but the nightmare version.
  'dog-terry-school': {
    bpm: 112,
    bass: 'C2 . C3 . G1 . G2 . Ab1 . Ab2 . Eb2 . G2 . F1 . F2 . C2 . C3 . G1 . G2 . B1 . D2 .',
    lead: 'Eb4 . G4 . C5 . G4 . Ab4 - G4 . Eb4 . D4 . F4 . Ab4 . C5 . Ab4 . G4 . Eb4 . D4 . G3 .',
    drums: 'k . h . s . h . k . h k s . h . k . h . s . h . k k h . s . o .',
    leadWave: 'square',
    leadVolume: 0.05,
  },
  // Jerry, sneaking past the dog patrols.
  'dog-patrol': {
    bpm: 92,
    bass: 'D2 . D2 . . . D2 . F2 . . . E2 . . . D2 . D2 . . . D2 . A1 . . . C2 . . .',
    lead: '. . A3 . . . . . C4 . . . . . Bb3 . . . A3 . . . . . G3 . . . F3 . E3 .',
    drums: 'k . . h . . h . k . . h . . h . k . . h . . h . k . h h . . h .',
    leadWave: 'triangle',
    leadVolume: 0.06,
  },
  // Snowball's world: grand, triumphant, very dog.
  'dog-snowball': {
    bpm: 104,
    bass: 'Bb1 - - - F2 - - - Eb2 - - - F2 - - - Bb1 - - - D2 - - - C2 - - - F2 - - -',
    lead: 'D5 . F5 . Bb5 . F5 . Eb5 . G5 . Bb5 . G5 . D5 . F5 . C6 . Bb5 . A5 . F5 . C5 . Eb5 .',
    drums: 'k . . h s . h . k . . h s . h h k . . h s . h . k k . h s . o .',
    pad: 'Bb2+D3+F3 Eb2+G2+Bb2',
    leadWave: 'square',
    leadVolume: 0.05,
  },
  'dog-snowball-boss': {
    bpm: 146,
    bass: 'Bb1 Bb1 Bb2 Bb1 Bb1 Bb2 Ab1 Ab2 Gb1 Gb1 Gb2 Gb1 Ab1 Ab1 Ab2 Ab1 Bb1 Bb1 Bb2 Bb1 Db2 Db2 Db3 Db2 F1 F1 F2 F1 F1 F2 A1 A2',
    lead: 'Bb4 . . F4 . . Bb4 . Ab4 . Gb4 . F4 . Eb4 . Db4 . . Eb4 . . F4 . Db5 . C5 . A4 . F4 .',
    drums: 'k . h . s . h k k . h . s . h h k . h . s . h k k . h . s s s s',
    leadWave: 'sawtooth',
    leadVolume: 0.05,
  },
};

export const DOG_SFX: Record<string, SfxRecipe> = {
  // A rubber duck being squeezed.
  squeak: [
    { wave: 'square', freq: 1200, freqEnd: 1800, duration: 0.07, volume: 0.1, filter: { type: 'bandpass', freq: 1600, q: 3 } },
    { wave: 'square', freq: 1700, freqEnd: 1100, duration: 0.09, volume: 0.08, delay: 0.06, filter: { type: 'bandpass', freq: 1400, q: 3 } },
  ],
  bark: [
    { wave: 'sawtooth', freq: 420, freqEnd: 260, duration: 0.12, volume: 0.16, filter: { type: 'lowpass', freq: 1400 } },
    { wave: 'noise', freq: 1200, duration: 0.08, volume: 0.1, filter: { type: 'bandpass', freq: 900, q: 2 } },
  ],
};
