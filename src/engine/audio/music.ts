/**
 * Tiny procedural soundtrack. Each track is a loop of 16th-note steps written as text:
 * note names ("C3", "D#4"), "." for rest, "-" to hold the previous note. Drums: k kick,
 * s snare, h hat, o open hat, "." rest.
 *
 * The engine ships the menu, boss and calm tracks. Episodes add their own through
 * EpisodeContent.music.
 */
export interface Track {
  bpm: number;
  bass: string;
  lead: string;
  drums: string;
  /** Soft chord pad notes, one chord per bar (space-separated notes joined by "+"). */
  pad?: string;
  bassWave?: OscillatorType;
  leadWave?: OscillatorType;
  leadVolume?: number;
}

/** Built-in tracks. */
export const TRACKS: Record<string, Track> = {
  title: {
    bpm: 96,
    bass: 'A1 - - - . . A1 . C2 - - - . . G1 . F1 - - - . . F1 . E1 - - - G1 - . .',
    lead: 'A3 . C4 . E4 . A4 . G4 . E4 . C4 . D4 . F3 . A3 . C4 . F4 . E4 . C4 . B3 . G#3 .',
    drums: 'k . . . h . . . s . . . h . k . k . . . h . . . s . . . h . h .',
    pad: 'A2+C3+E3 F2+A2+C3',
    leadWave: 'triangle',
  },
  garage: {
    bpm: 84,
    bass: 'C2 - - . . . C2 . E2 - - . . . G1 . A1 - - . . . A1 . F1 - - . G1 - - .',
    lead: '. . E4 . G4 . . . E4 . D4 . C4 . . . . . C4 . E4 . . . D4 . C4 . A3 . . .',
    drums: 'k . . . h . . . s . . h . . h . k . . . h . k . s . . . h . . .',
    pad: 'C3+E3+G3 A2+C3+E3',
    leadWave: 'sine',
    leadVolume: 0.1,
  },
  boss: {
    bpm: 144,
    bass: 'A1 A1 A2 A1 A1 A2 G1 G2 F1 F1 F2 F1 G1 G1 G2 G1 A1 A1 A2 A1 C2 C2 C3 C2 E1 E1 E2 E1 E1 E2 G#1 G#2',
    lead: 'A4 . . E4 . . A4 . G4 . F4 . E4 . D4 . C4 . . D4 . . E4 . C5 . B4 . G#4 . E4 .',
    drums: 'k . h . s . h k k . h . s . h h k . h . s . h k k . h . s s s s',
    leadWave: 'sawtooth',
    leadVolume: 0.05,
  },
  calm: {
    bpm: 76,
    bass: 'F2 - - - - - - - C2 - - - - - - - D2 - - - - - - - A1 - - - - - - -',
    lead: '. . A4 . . . C5 . . . G4 . . . . . . . F4 . . . A4 . . . E4 . . . . .',
    drums: 'k . . . . . . . h . . . . . . . k . . . . . . . h . . . . . h .',
    pad: 'F2+A2+C3 D2+F2+A2',
    leadWave: 'sine',
    leadVolume: 0.08,
  },
};

const NOTE_OFFSETS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "C#3" -> MIDI note number, or null for rests/holds. */
export function noteToMidi(token: string): number | null {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(token);
  if (!m) return null;
  const base = NOTE_OFFSETS[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return (Number(m[3]) + 1) * 12 + base;
}

export function midiToFreq(n: number): number {
  return 440 * Math.pow(2, (n - 69) / 12);
}

export interface NoteEvent {
  step: number;
  midi: number;
  /** Length in steps (holds included). */
  length: number;
}

/** Turns a pattern string into note events. */
export function parsePattern(pattern: string): { events: NoteEvent[]; steps: number } {
  const tokens = pattern.trim().split(/\s+/);
  const events: NoteEvent[] = [];
  tokens.forEach((t, i) => {
    if (t === '-') {
      const last = events[events.length - 1];
      if (last && last.step + last.length === i) last.length++;
      return;
    }
    const midi = noteToMidi(t);
    if (midi !== null) events.push({ step: i, midi, length: 1 });
  });
  return { events, steps: tokens.length };
}
