/** The Pilot's soundtrack: one loop per act. Format: see engine/audio/music.ts. */
import type { Track } from '../../../engine/audio/music';

export const PILOT_MUSIC: Record<string, Track> = {
  school: {
    bpm: 124,
    bass: 'C2 . C3 . G1 . G2 . A1 . A2 . E2 . G2 . F1 . F2 . C2 . C3 . G1 . G2 . B1 . D2 .',
    lead: 'E4 . G4 . C5 . G4 . A4 - G4 . E4 . D4 . F4 . A4 . C5 . A4 . G4 . E4 . D4 . G3 .',
    drums: 'k . h . s . h . k . h k s . h . k . h . s . h . k k h . s . o .',
    leadWave: 'square',
    leadVolume: 0.06,
  },
  '35c': {
    bpm: 100,
    bass: 'D2 - - - A2 - - - G2 - - - A2 - - - D2 - - - F#2 - - - E2 - - - A1 - - -',
    lead: 'F#4 . A4 . C#5 . A4 . G4 . B4 . D5 . B4 . F#4 . A4 . E5 . D5 . C#5 . A4 . E4 . G#4 .',
    drums: 'k . . h . . s . . h k . . h s . k . . h . . s . . h k . s . h .',
    pad: 'D3+F#3+A3 G2+B2+D3',
    leadWave: 'triangle',
    leadVolume: 0.08,
  },
  customs: {
    bpm: 112,
    bass: 'E2 . E2 . E2 . G2 . E2 . E2 . A2 . G2 . E2 . E2 . E2 . G2 . B1 . B1 . D2 . C2 .',
    lead: 'B3 . . . E4 . . . D4 . . . B3 . . . C4 . . . B3 . . . A3 . . . G3 . F#3 .',
    drums: 'k . h h s . h . k . h h s . h h k . h h s . h . k k h h s . o .',
    leadWave: 'square',
    leadVolume: 0.05,
  },
};
