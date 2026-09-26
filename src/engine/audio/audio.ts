/**
 * WebAudio for sound effects and music. The AudioContext is created on the first user gesture
 * (browsers block audio before that), and volumes follow the save's settings.
 */
import { SFX, type SfxRecipe, type Tone } from './sfx';
import { midiToFreq, noteToMidi, parsePattern, TRACKS, type NoteEvent, type Track } from './music';

interface CompiledTrack {
  track: Track;
  steps: number;
  bass: NoteEvent[];
  lead: NoteEvent[];
  drums: string[];
  pad: number[][];
}

export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private lastPlayed = new Map<string, number>();
  private voices = 0;
  private musicVolume = 0.5;
  private sfxVolume = 0.8;

  private track: CompiledTrack | null = null;
  private trackId: string | null = null;
  private wantedTrack: string | null = null;
  private step = 0;
  private nextStepTime = 0;
  private scheduler: ReturnType<typeof setInterval> | null = null;
  private readonly compiled = new Map<string, CompiledTrack>();
  private readonly tracks: ReadonlyMap<string, Track>;
  private readonly sounds: ReadonlyMap<string, SfxRecipe>;

  /** Pass the registry's music and sfx so episodes can bring their own; defaults to the built-ins. */
  constructor(library: { music?: ReadonlyMap<string, Track>; sfx?: ReadonlyMap<string, SfxRecipe> } = {}) {
    this.tracks = library.music ?? new Map(Object.entries(TRACKS));
    this.sounds = library.sfx ?? new Map(Object.entries(SFX));
    if (typeof window === 'undefined') return;
    const unlock = () => this.unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }

  /** Creates or resumes the AudioContext. Must run inside a user gesture the first time. */
  unlock(): void {
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.9;
        const comp = this.ctx.createDynamicsCompressor();
        this.master.connect(comp).connect(this.ctx.destination);
        this.sfxBus = this.ctx.createGain();
        this.musicBus = this.ctx.createGain();
        this.sfxBus.connect(this.master);
        this.musicBus.connect(this.master);
        this.applyVolumes();
        this.noise = this.makeNoise();
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      if (this.wantedTrack && this.trackId !== this.wantedTrack) this.startTrack(this.wantedTrack);
    } catch {
      this.ctx = null;
    }
  }

  setVolumes(music: number, sfx: number): void {
    this.musicVolume = music;
    this.sfxVolume = sfx;
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx || !this.sfxBus || !this.musicBus) return;
    const t = this.ctx.currentTime;
    this.sfxBus.gain.setTargetAtTime(this.sfxVolume, t, 0.02);
    this.musicBus.gain.setTargetAtTime(this.musicVolume * 0.55, t, 0.05);
  }

  private makeNoise(): AudioBuffer {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buf.getChannelData(0);
    // Deterministic white noise (xorshift), so the game never touches Math.random.
    let x = 2463534242;
    for (let i = 0; i < data.length; i++) {
      x ^= x << 13;
      x ^= x >>> 17;
      x ^= x << 5;
      data[i] = ((x >>> 0) / 4294967295) * 2 - 1;
    }
    return buf;
  }

  play(id: string, opts: { pitch?: number; volume?: number } = {}): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running' || !this.sfxBus || this.sfxVolume <= 0) return;
    const recipe = this.sounds.get(id);
    if (!recipe) return;
    const now = ctx.currentTime;
    const last = this.lastPlayed.get(id) ?? -1;
    if (now - last < 0.03) return;
    if (this.voices > 28) return;
    this.lastPlayed.set(id, now);
    for (const tone of recipe) this.playTone(tone, now, opts.pitch ?? 1, opts.volume ?? 1, this.sfxBus);
  }

  private playTone(tone: Tone, now: number, pitch: number, volume: number, bus: AudioNode): void {
    const ctx = this.ctx!;
    const start = now + (tone.delay ?? 0);
    const end = start + tone.duration;
    const gain = ctx.createGain();
    const peak = (tone.volume ?? 0.2) * volume;
    const attack = Math.min(tone.attack ?? 0.005, tone.duration / 2);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    let source: AudioScheduledSourceNode;
    if (tone.wave === 'noise') {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      source = src;
    } else {
      const osc = ctx.createOscillator();
      osc.type = tone.wave;
      osc.frequency.setValueAtTime(tone.freq * pitch, start);
      if (tone.freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(1, tone.freqEnd * pitch), end);
      if (tone.vibrato) {
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = tone.vibrato.rate;
        lfoGain.gain.value = tone.vibrato.depth * pitch;
        lfo.connect(lfoGain).connect(osc.frequency);
        lfo.start(start);
        lfo.stop(end);
      }
      source = osc;
    }

    let node: AudioNode = source;
    const f = tone.filter ?? (tone.wave === 'noise' ? { type: 'bandpass' as BiquadFilterType, freq: tone.freq, q: 0.7 } : undefined);
    if (f) {
      const filter = ctx.createBiquadFilter();
      filter.type = f.type;
      filter.frequency.setValueAtTime(f.freq, start);
      if (f.freqEnd) filter.frequency.exponentialRampToValueAtTime(Math.max(20, f.freqEnd), end);
      filter.Q.value = f.q ?? 0.8;
      node.connect(filter);
      node = filter;
    }
    node.connect(gain).connect(bus);
    this.voices++;
    source.onended = () => {
      this.voices--;
      gain.disconnect();
    };
    source.start(start);
    source.stop(end + 0.02);
  }

  /** Switches the looping soundtrack (null = silence). Safe to call every room. */
  music(id: string | null): void {
    this.wantedTrack = id;
    if (id === this.trackId) return;
    if (!this.ctx) return;
    this.startTrack(id);
  }

  private startTrack(id: string | null): void {
    if (this.scheduler) clearInterval(this.scheduler);
    this.scheduler = null;
    this.trackId = id;
    this.track = id ? this.compile(id) : null;
    if (!this.track || !this.ctx) return;
    this.step = 0;
    this.nextStepTime = this.ctx.currentTime + 0.08;
    this.scheduler = setInterval(() => this.schedule(), 40);
  }

  private compile(id: string): CompiledTrack | null {
    const cached = this.compiled.get(id);
    if (cached) return cached;
    const track = this.tracks.get(id);
    if (!track) return null;
    const bass = parsePattern(track.bass);
    const lead = parsePattern(track.lead);
    const drums = track.drums.trim().split(/\s+/);
    const pad = (track.pad ?? '').trim().split(/\s+/).filter(Boolean).map((chord) =>
      chord.split('+').map((n) => noteToMidi(n)).filter((n): n is number => n !== null),
    );
    const steps = Math.max(bass.steps, lead.steps, drums.length);
    const out: CompiledTrack = { track, steps, bass: bass.events, lead: lead.events, drums, pad };
    this.compiled.set(id, out);
    return out;
  }

  private schedule(): void {
    const ctx = this.ctx;
    const t = this.track;
    if (!ctx || !t || !this.musicBus) return;
    const stepLen = 60 / t.track.bpm / 4;
    while (this.nextStepTime < ctx.currentTime + 0.15) {
      const s = this.step % t.steps;
      const at = this.nextStepTime;
      for (const e of t.bass) if (e.step === s) this.note(t.track.bassWave ?? 'triangle', e.midi, at, e.length * stepLen * 0.95, 0.16, 900);
      for (const e of t.lead) if (e.step === s) this.note(t.track.leadWave ?? 'square', e.midi, at, e.length * stepLen * 0.9, t.track.leadVolume ?? 0.07, 3200);
      const d = t.drums[s % t.drums.length];
      if (d === 'k') this.playTone({ wave: 'sine', freq: 150, freqEnd: 45, duration: 0.16, volume: 0.35 }, at, 1, 1, this.musicBus);
      if (d === 's') this.playTone({ wave: 'noise', freq: 1800, duration: 0.12, volume: 0.14, filter: { type: 'bandpass', freq: 1800, q: 0.9 } }, at, 1, 1, this.musicBus);
      if (d === 'h') this.playTone({ wave: 'noise', freq: 8000, duration: 0.03, volume: 0.05, filter: { type: 'highpass', freq: 7000 } }, at, 1, 1, this.musicBus);
      if (d === 'o') this.playTone({ wave: 'noise', freq: 8000, duration: 0.12, volume: 0.05, filter: { type: 'highpass', freq: 6000 } }, at, 1, 1, this.musicBus);
      const barSteps = 16;
      if (t.pad.length && s % barSteps === 0) {
        const chord = t.pad[Math.floor(s / barSteps) % t.pad.length];
        for (const n of chord) this.note('sine', n, at, barSteps * stepLen, 0.035, 1200);
      }
      this.step++;
      this.nextStepTime += stepLen;
    }
  }

  private note(wave: OscillatorType, midi: number, at: number, length: number, volume: number, cutoff: number): void {
    const f = midiToFreq(midi);
    this.playTone({ wave, freq: f, duration: Math.max(0.05, length), volume, attack: 0.01, filter: { type: 'lowpass', freq: cutoff } }, at, 1, 1, this.musicBus!);
  }
}
