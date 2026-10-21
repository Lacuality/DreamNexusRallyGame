import { asset } from "./env";
/**
 * Sound for Dream Nexus Rally.
 *
 * - Music: the background.mp3 track, looping through menu AND races.
 * - Engine + every sound effect is synthesized with the Web Audio API,
 *   so there are no missing files and everything reacts to gameplay.
 * - Browsers block sound until the player touches/clicks/presses a key,
 *   so App calls `audioManager.unlock()` on the first interaction.
 */

type Settings = { muted: boolean; music: number; sfx: number };

const STORAGE_KEY = "dreamNexusRallyAudio";

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { muted: false, music: 0.55, sfx: 0.8, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { muted: false, music: 0.55, sfx: 0.8 };
}

export type MusicTheme = "default" | "synthwave" | "cumbia";

export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private music: HTMLAudioElement | null = null;
  private mp3Gain: GainNode | null = null;
  private theme: MusicTheme = "default";
  private synth: { out: GainNode; timer: number; step: number; next: number } | null = null;
  private musicRouted = false;
  private wantMusic = false;
  private musicDuck = 1;

  private engine: {
    osc1: OscillatorNode;
    osc2: OscillatorNode;
    filter: BiquadFilterNode;
    gain: GainNode;
  } | null = null;
  private rumble: { src: AudioBufferSourceNode; gain: GainNode } | null = null;

  settings: Settings = loadSettings();
  private listeners = new Set<() => void>();

  constructor() {
    if (typeof window === "undefined") return;
    this.music = new Audio(asset("/sounds/background.mp3"));
    this.music.loop = true;
    this.music.preload = "auto";
    this.music.crossOrigin = "anonymous";
    this.applyVolumes();

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.music?.pause();
        this.ctx?.suspend().catch(() => {});
      } else {
        this.ctx?.resume().catch(() => {});
        if (this.wantMusic) this.tryPlayMusic();
      }
    });
  }

  /* ---------------- setup ---------------- */

  /** Call from a user gesture. Safe to call many times. */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.connect(this.master);

      // shared white noise buffer for whooshes, crashes, splashes, rumble
      const len = this.ctx.sampleRate * 2;
      this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

      // Route music through Web Audio so volume works on iOS too
      if (this.music) {
        try {
          const src = this.ctx.createMediaElementSource(this.music);
          this.mp3Gain = this.ctx.createGain();
          src.connect(this.mp3Gain).connect(this.musicGain);
          this.musicRouted = true;
        } catch {
          this.musicRouted = false;
        }
      }
      this.applyVolumes();
      if (this.theme === "synthwave") this.applyTheme();
    }
    if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    if (this.wantMusic) this.tryPlayMusic();
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      /* ignore */
    }
    this.listeners.forEach((l) => l());
  }

  private applyVolumes() {
    const { muted, music, sfx } = this.settings;
    const m = muted ? 0 : music * this.musicDuck;
    if (this.music) {
      if (this.musicRouted) this.music.volume = 1;
      else this.music.volume = Math.min(1, m * 0.7);
    }
    const now = this.ctx?.currentTime ?? 0;
    this.musicGain?.gain.setTargetAtTime(m * 0.7, now, 0.08);
    this.sfxGain?.gain.setTargetAtTime(muted ? 0 : sfx, now, 0.05);
    if (this.master) this.master.gain.value = 1;
  }

  get isMuted() {
    return this.settings.muted;
  }

  toggleMute() {
    this.unlock();
    this.settings.muted = !this.settings.muted;
    this.applyVolumes();
    this.saveSettings();
    if (!this.settings.muted && this.wantMusic) this.tryPlayMusic();
    return this.settings.muted;
  }

  setMusicVolume(v: number) {
    this.settings.music = v;
    this.applyVolumes();
    this.saveSettings();
  }

  setSfxVolume(v: number) {
    this.settings.sfx = v;
    this.applyVolumes();
    this.saveSettings();
  }

  /* ---------------- music ---------------- */

  private tryPlayMusic() {
    if (!this.music || document.hidden) return;
    if (!this.music.paused) return;
    this.music.play().catch(() => {
      /* waits for the next unlock() */
    });
  }

  playBackgroundMusic() {
    this.wantMusic = true;
    this.tryPlayMusic();
  }

  stopBackgroundMusic() {
    this.wantMusic = false;
    this.music?.pause();
  }

  /** Lower the music (pause menu, game over) without stopping it. */
  duckMusic(amount: number) {
    this.musicDuck = amount;
    this.applyVolumes();
  }

  /* ---------------- synthwave (Comuna 13 at night) ----------------
   * An original, generated Miami-night style loop: four-on-the-floor kick,
   * gated snare, 8th-note saw bass, warm pads and a delayed arpeggio over
   * Am – F – C – G. Crossfades with the normal music track. */

  setMusicTheme(theme: MusicTheme) {
    if (theme === this.theme) return;
    this.theme = theme;
    this.applyTheme();
  }

  private applyTheme() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const synthOn = this.theme !== "default";
    if (this.mp3Gain) this.mp3Gain.gain.setTargetAtTime(synthOn ? 0 : 1, t, 0.9);
    else if (this.music) this.music.muted = synthOn;
    if (synthOn) this.startSynth();
    else this.stopSynth();
  }

  private startSynth() {
    if (!this.ctx || !this.musicGain) return;
    if (this.synth) {
      this.synth.out.gain.setTargetAtTime(1, this.ctx.currentTime, 0.9);
      return;
    }
    const ctx = this.ctx;
    const out = ctx.createGain();
    out.gain.value = 0;
    out.gain.setTargetAtTime(1, ctx.currentTime, 0.9);
    out.connect(this.musicGain);
    const synth = { out, timer: 0, step: 0, next: ctx.currentTime + 0.1 };
    synth.timer = window.setInterval(() => {
      if (!this.ctx) return;
      while (synth.next < this.ctx.currentTime + 0.15) {
        const cumbia = this.theme === "cumbia";
        if (cumbia) this.cumbiaStep(synth.step, synth.next, out);
        else this.synthStep(synth.step, synth.next, out);
        synth.next += 60 / (cumbia ? 96 : 108) / 4;
        synth.step++;
      }
    }, 25);
    this.synth = synth;
  }

  private stopSynth() {
    if (!this.synth || !this.ctx) return;
    const s = this.synth;
    this.synth = null;
    s.out.gain.setTargetAtTime(0, this.ctx.currentTime, 0.6);
    window.setTimeout(() => {
      clearInterval(s.timer);
      s.out.disconnect();
    }, 3500);
  }

  private synthStep(step: number, t: number, out: GainNode) {
    const ctx = this.ctx!;
    const s16 = step % 16;
    const bar = Math.floor(step / 16) % 4;
    // Am, F, C, G (root in Hz, then chord tones)
    const chords = [
      [110, [220, 261.63, 329.63]],
      [87.31, [174.61, 220, 261.63]],
      [130.81, [261.63, 329.63, 392]],
      [98, [196, 246.94, 293.66]],
    ] as const;
    const [root, tones] = chords[bar];

    const env = (node: AudioNode, peak: number, attack: number, dur: number) => {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak, t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      node.connect(g).connect(out);
      return g;
    };

    // kick on every beat
    if (s16 % 4 === 0) {
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.22);
      env(o, 0.85, 0.005, 0.32);
      o.start(t);
      o.stop(t + 0.35);
    }
    // gated snare on 2 and 4
    if (s16 === 4 || s16 === 12) {
      if (this.noiseBuffer) {
        const n = ctx.createBufferSource();
        n.buffer = this.noiseBuffer;
        const f = ctx.createBiquadFilter();
        f.type = "bandpass";
        f.frequency.value = 1800;
        f.Q.value = 0.7;
        n.connect(f);
        env(f, 0.4, 0.003, 0.22);
        n.start(t, Math.random());
        n.stop(t + 0.25);
      }
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.setValueAtTime(220, t);
      o.frequency.exponentialRampToValueAtTime(120, t + 0.1);
      env(o, 0.25, 0.002, 0.12);
      o.start(t);
      o.stop(t + 0.15);
    }
    // hi-hats
    if (this.noiseBuffer && s16 % 2 === 0) {
      const n = ctx.createBufferSource();
      n.buffer = this.noiseBuffer;
      const f = ctx.createBiquadFilter();
      f.type = "highpass";
      f.frequency.value = 7500;
      n.connect(f);
      env(f, s16 % 4 === 2 ? 0.14 : 0.06, 0.002, s16 % 4 === 2 ? 0.12 : 0.04);
      n.start(t, Math.random());
      n.stop(t + 0.15);
    }
    // 8th-note saw bass, octave bounce
    if (s16 % 2 === 0) {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = s16 % 4 === 2 ? root * 2 : root;
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.setValueAtTime(900, t);
      f.frequency.exponentialRampToValueAtTime(220, t + 0.2);
      o.connect(f);
      env(f, 0.22, 0.005, 0.24);
      o.start(t);
      o.stop(t + 0.26);
    }
    // warm detuned pad at the start of each bar
    if (s16 === 0) {
      const barLen = (60 / 108) * 4;
      tones.forEach((fq) => {
        [-6, 6].forEach((det) => {
          const o = ctx.createOscillator();
          o.type = "sawtooth";
          o.frequency.value = fq;
          o.detune.value = det;
          const f = ctx.createBiquadFilter();
          f.type = "lowpass";
          f.frequency.value = 1100;
          o.connect(f);
          env(f, 0.035, 0.5, barLen);
          o.start(t);
          o.stop(t + barLen + 0.05);
        });
      });
    }
    // arpeggio (with a simple echo) on 16ths
    {
      const pattern = [0, 1, 2, 1];
      const fq = tones[pattern[s16 % 4]] * 2;
      [0, 0.42].forEach((delay, k) => {
        const o = ctx.createOscillator();
        o.type = "square";
        o.frequency.value = fq;
        const f = ctx.createBiquadFilter();
        f.type = "lowpass";
        f.frequency.value = 2600;
        o.connect(f);
        const g = ctx.createGain();
        const tt = t + delay;
        g.gain.setValueAtTime(0.0001, tt);
        g.gain.linearRampToValueAtTime(k ? 0.012 : 0.03, tt + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.11);
        f.connect(g).connect(out);
        o.start(tt);
        o.stop(tt + 0.13);
      });
    }
  }

  /* ---------------- cumbia (Pueblo + Cartagena) ----------------
   * Original loop in a Colombian cumbia feel: guacharaca scraper, tambora,
   * llamador, root–fifth bass and a little accordion-style melody. C–F–G–C. */
  private cumbiaStep(step: number, t: number, out: GainNode) {
    const ctx = this.ctx!;
    const s16 = step % 16;
    const bar = Math.floor(step / 16) % 4;
    const roots = [130.81, 174.61, 196, 130.81];
    const root = roots[bar];
    const hit = (node: AudioNode, peak: number, dur: number, at = t) => {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.linearRampToValueAtTime(peak, at + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      node.connect(g).connect(out);
    };
    // guacharaca: "chi-ki-cha" scrape on every 8th, longer on the off-beats
    if (this.noiseBuffer && s16 % 2 === 0) {
      const n = ctx.createBufferSource();
      n.buffer = this.noiseBuffer;
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = 3200;
      f.Q.value = 1.2;
      n.connect(f);
      const long = s16 % 4 === 2;
      hit(f, long ? 0.22 : 0.1, long ? 0.16 : 0.05);
      n.start(t, Math.random());
      n.stop(t + 0.2);
    }
    // tambora (low drum)
    if (s16 === 0 || s16 === 6 || s16 === 8 || s16 === 14) {
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(110, t);
      o.frequency.exponentialRampToValueAtTime(55, t + 0.18);
      hit(o, s16 === 0 ? 0.7 : 0.45, 0.25);
      o.start(t);
      o.stop(t + 0.28);
    }
    // llamador (high drum) on the "and"
    if (s16 === 4 || s16 === 12) {
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.setValueAtTime(320, t);
      o.frequency.exponentialRampToValueAtTime(200, t + 0.06);
      hit(o, 0.25, 0.09);
      o.start(t);
      o.stop(t + 0.1);
    }
    // bass: root on 1, fifth on 3, pickup notes
    if (s16 === 0 || s16 === 8 || s16 === 14) {
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.value = (s16 === 8 ? root * 1.5 : root) / 2;
      hit(o, 0.32, 0.3);
      o.start(t);
      o.stop(t + 0.32);
    }
    // accordion-ish melody on 8ths (two detuned reeds + vibrato)
    if (s16 % 2 === 0) {
      const scale = [261.63, 293.66, 329.63, 349.23, 392, 440, 493.88, 523.25];
      const phrases = [
        [4, 4, 2, 4, 5, 4, 2, 0],
        [3, 3, 5, 3, 2, 3, 5, 7],
        [4, 6, 4, 1, 4, 6, 7, 6],
        [4, 2, 0, 2, 4, 2, 0, -1],
      ];
      const deg = phrases[bar][s16 / 2];
      if (deg >= 0) {
        [-7, 7].forEach((det) => {
          const o = ctx.createOscillator();
          o.type = "square";
          o.frequency.value = scale[deg];
          o.detune.value = det;
          const vib = ctx.createOscillator();
          vib.frequency.value = 6;
          const vg = ctx.createGain();
          vg.gain.value = 6;
          vib.connect(vg).connect(o.detune);
          const f = ctx.createBiquadFilter();
          f.type = "lowpass";
          f.frequency.value = 1800;
          o.connect(f);
          hit(f, 0.025, 0.24);
          o.start(t);
          vib.start(t);
          o.stop(t + 0.26);
          vib.stop(t + 0.26);
        });
      }
    }
  }

  /* ---------------- engine ---------------- */

  startEngineSound() {
    if (!this.ctx || !this.sfxGain || this.engine) return;
    const ctx = this.ctx;
    const osc1 = ctx.createOscillator();
    osc1.type = "sawtooth";
    const osc2 = ctx.createOscillator();
    osc2.type = "square";
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 400;
    filter.Q.value = 3;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const g2 = ctx.createGain();
    g2.gain.value = 0.5;
    osc1.connect(filter);
    osc2.connect(g2).connect(filter);
    filter.connect(gain).connect(this.sfxGain);
    osc1.frequency.value = 50;
    osc2.frequency.value = 25;
    osc1.start();
    osc2.start();
    gain.gain.setTargetAtTime(0.05, ctx.currentTime, 0.3);
    this.engine = { osc1, osc2, filter, gain };

    // tyre/road rumble
    if (this.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      src.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = "lowpass";
      bp.frequency.value = 300;
      const rg = ctx.createGain();
      rg.gain.value = 0;
      src.connect(bp).connect(rg).connect(this.sfxGain);
      src.start();
      this.rumble = { src, gain: rg };
    }
  }

  stopEngineSound() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (this.engine) {
      const e = this.engine;
      e.gain.gain.setTargetAtTime(0, t, 0.1);
      e.osc1.stop(t + 0.5);
      e.osc2.stop(t + 0.5);
      this.engine = null;
    }
    if (this.rumble) {
      const r = this.rumble;
      r.gain.gain.setTargetAtTime(0, t, 0.1);
      r.src.stop(t + 0.5);
      this.rumble = null;
    }
  }

  /** speed in km/h; offroad adds gravel rumble; boost makes it scream. */
  updateEngineSound(speed: number, offroad = false, boost = false) {
    if (!this.ctx || !this.engine) return;
    const t = this.ctx.currentTime;
    const r = Math.min(speed / 220, 1.2);
    // fake gear changes: pitch climbs then drops a bit every gear
    const gears = 5;
    const g = Math.min(gears - 1, Math.floor(r * gears));
    const inGear = r * gears - g;
    const base = 42 + g * 14 + inGear * 55 + (boost ? 30 : 0);
    this.engine.osc1.frequency.setTargetAtTime(base, t, 0.05);
    this.engine.osc2.frequency.setTargetAtTime(base / 2, t, 0.05);
    this.engine.filter.frequency.setTargetAtTime(350 + r * 1400 + (boost ? 900 : 0), t, 0.08);
    this.engine.gain.gain.setTargetAtTime(0.035 + r * 0.04, t, 0.1);
    if (this.rumble) {
      this.rumble.gain.gain.setTargetAtTime((offroad ? 0.25 : 0.03) * Math.min(1, r * 2), t, 0.08);
    }
  }

  /* ---------------- sfx helpers ---------------- */

  private tone(
    freq: number,
    dur: number,
    opts: { type?: OscillatorType; vol?: number; delay?: number; slideTo?: number } = {},
  ) {
    if (!this.ctx || !this.sfxGain) return;
    const { type = "sine", vol = 0.3, delay = 0, slideTo } = opts;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  private noise(
    dur: number,
    opts: { vol?: number; type?: BiquadFilterType; from?: number; to?: number; q?: number; delay?: number } = {},
  ) {
    if (!this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const { vol = 0.3, type = "lowpass", from = 1000, to, q = 1, delay = 0 } = opts;
    const t = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(from, t);
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.sfxGain);
    src.start(t, Math.random());
    src.stop(t + dur + 0.05);
  }

  /* ---------------- game sounds ---------------- */

  /** Jar pickup: pitch climbs with the combo for that "ding ding DING" feel. */
  playPickup(combo = 0) {
    const step = Math.min(combo, 12);
    const base = 660 * Math.pow(2, step / 12);
    this.tone(base, 0.12, { type: "triangle", vol: 0.25 });
    this.tone(base * 1.5, 0.18, { type: "sine", vol: 0.2, delay: 0.05 });
  }

  playSuccess() {
    this.playPickup(0);
  }

  playNitro() {
    this.noise(0.9, { vol: 0.35, type: "bandpass", from: 300, to: 4000, q: 2 });
    this.tone(110, 0.6, { type: "sawtooth", vol: 0.15, slideTo: 440 });
  }

  playNitroReady() {
    this.tone(880, 0.1, { type: "square", vol: 0.1 });
    this.tone(1320, 0.15, { type: "square", vol: 0.1, delay: 0.09 });
  }

  playShield() {
    [523, 659, 784, 1047].forEach((f, i) =>
      this.tone(f, 0.4, { type: "triangle", vol: 0.15, delay: i * 0.05 }),
    );
  }

  playHeart() {
    [392, 523, 659].forEach((f, i) => this.tone(f, 0.3, { type: "sine", vol: 0.25, delay: i * 0.08 }));
  }

  playShieldBreak() {
    this.noise(0.3, { vol: 0.3, type: "highpass", from: 2000 });
    this.tone(1200, 0.3, { type: "triangle", vol: 0.15, slideTo: 300 });
  }

  playCrash() {
    this.noise(0.6, { vol: 0.6, type: "lowpass", from: 3000, to: 200 });
    this.tone(120, 0.45, { type: "sine", vol: 0.5, slideTo: 40 });
    this.tone(70, 0.3, { type: "square", vol: 0.12, slideTo: 35 });
  }

  playSmash() {
    this.noise(0.35, { vol: 0.45, type: "bandpass", from: 1500, to: 300, q: 0.8 });
    this.tone(200, 0.2, { type: "square", vol: 0.12, slideTo: 80 });
  }

  playSplash() {
    this.noise(0.5, { vol: 0.35, type: "highpass", from: 800, to: 3000 });
    this.noise(0.3, { vol: 0.2, type: "lowpass", from: 500, delay: 0.05 });
  }

  playNearMiss() {
    this.noise(0.35, { vol: 0.3, type: "bandpass", from: 600, to: 2500, q: 3 });
  }

  playJump() {
    this.tone(300, 0.25, { type: "square", vol: 0.1, slideTo: 900 });
    this.noise(0.3, { vol: 0.15, type: "bandpass", from: 800, to: 2000 });
  }

  playLand() {
    this.tone(90, 0.2, { type: "sine", vol: 0.4, slideTo: 45 });
    this.noise(0.15, { vol: 0.25, type: "lowpass", from: 800 });
  }

  playCountdown(final = false) {
    this.tone(final ? 880 : 440, final ? 0.5 : 0.18, { type: "square", vol: 0.15 });
    if (final) this.tone(1320, 0.5, { type: "triangle", vol: 0.1 });
  }

  playMilestone() {
    [523, 659, 784, 1047].forEach((f, i) =>
      this.tone(f, i === 3 ? 0.5 : 0.14, { type: "square", vol: 0.09, delay: i * 0.1 }),
    );
  }

  playCombo(level: number) {
    const f = 440 * Math.pow(2, Math.min(level, 6) / 6);
    this.tone(f, 0.12, { type: "square", vol: 0.1 });
    this.tone(f * 2, 0.2, { type: "triangle", vol: 0.12, delay: 0.08 });
  }

  playGameOver() {
    [392, 330, 262, 196].forEach((f, i) =>
      this.tone(f, 0.35, { type: "triangle", vol: 0.2, delay: i * 0.18 }),
    );
  }

  playClick() {
    this.tone(1000, 0.05, { type: "square", vol: 0.06 });
  }

  cleanup() {
    this.stopEngineSound();
  }
}

export const audioManager = new AudioManager();
