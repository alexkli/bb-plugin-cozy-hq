// Chiptune sound effects synthesized with WebAudio: no audio files.

export type SoundName =
  | "arrive"
  | "leave"
  | "done"
  | "needs-you"
  | "error"
  | "start"
  | "pingpong"
  | "meow"
  | "purr"
  | "bubble"
  | "coffee"
  | "roomba"
  | "channel"
  | "click"
  | "chime"
  | "door"
  | "marker"
  | "brew"
  | "kettle"
  | "vending"
  | "fridge"
  | "microwave"
  | "piano"
  | "dart"
  | "print"
  | "glug"
  | "switch"
  | "water"
  | "crumple"
  | "cuckoo"
  | "arcade"
  | "bark"
  | "walkie"
  | "whistle"
  | "party"
  | "birthday"
  | "giggle"
  | "cheer"
  | "spin"
  | "toss"
  | "jingle"
  | "spooky"
  | "lantern"
  | "harp"
  | "jig"
  | "dhol"
  | "sitar"
  | "steeldrum"
  | "tusch"
  | "firecracker"
  | "oompah"
  | "server"
  | "birds"
  | "crickets"
  | "rainfall"
  | "wind"
  | "thunder"
  | "foghorn"
  | "squeak"
  | "squish"
  | "zap"
  | "wrench"
  | "drill"
  | "fixed"
  | "beep"
  | "twinkle"
  | "dingdong"
  | "putt"
  | "cup"
  | "clack"
  | "typing"
  | "clank"
  | "swish"
  // The arcade's games
  | "blip"
  | "bonk"
  | "chomp"
  | "pew"
  | "pop"
  | "boom"
  | "miss"
  | "point"
  | "select"
  | "fanfare"
  | "womp";

/** The arcade's game sounds come quick, one after another. */
const QUICK = new Set<SoundName>(["blip", "bonk", "chomp", "pew", "pop", "boom", "miss", "point", "select"]);

/** Quiet background sounds play softer than event sounds. */
const AMBIENT = new Set<SoundName>(["pingpong", "bubble", "coffee", "roomba", "purr", "door", "marker", "toss", "giggle", "whistle", "walkie", "wrench", "drill", "fixed", "typing"]);

/** Building blocks a theme's sound recipes use. */
export interface Synth {
  tone(freq: number, start: number, dur: number, type: OscillatorType, vol: number, slideTo?: number): void;
  noise(start: number, dur: number, vol: number, filterHz: number): void;
  swell(start: number, dur: number, vol: number, fromHz: number, toHz: number, q?: number, type?: BiquadFilterType): void;
}

export class Sound {
  private ctx: AudioContext | null = null;
  /** Extra sounds from the scenery, by name. */
  private recipes = new Map<string, (k: Synth) => void>();
  private master: GainNode | null = null;
  private volume = 0.5;
  private enabled = true;
  private ambient = true;
  private lastPlayed = new Map<SoundName, number>();
  lastAt = -Infinity;
  /** Whether this office may be heard right now (on screen, the one you look at). */
  gate: () => boolean = () => true;

  configure(enabled: boolean, volume: number, ambient = true): void {
    this.enabled = enabled;
    this.ambient = ambient;
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.effectiveGain(), this.ctx.currentTime, 0.05);
  }

  /**
   * The recipes are written quiet (single tones at 0.05–0.3), so the master
   * boosts them a lot: at 100% about 16 dB more than the old 0.6, enough to
   * hear over music. A limiter after it keeps stacked sounds from clipping.
   */
  private effectiveGain(): number {
    return this.enabled ? this.volume * this.volume * 4 : 0;
  }

  /** Must run from a user gesture the first time (autoplay policy). */
  unlock(): void {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.effectiveGain();
      const limiter = this.ctx.createDynamicsCompressor();
      limiter.threshold.value = -8;
      limiter.knee.value = 6;
      limiter.ratio.value = 12;
      limiter.attack.value = 0.002;
      limiter.release.value = 0.2;
      this.master.connect(limiter).connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  dispose(): void {
    void this.ctx?.close();
    this.ctx = null;
    this.master = null;
  }

  /**
   * Play a sound. `ambient` marks background life (softer, muted by the
   * ambient toggle); it defaults to the sound's usual role. Clicks pass false.
   */
  /** Sounds the current scenery brings along (replaces the previous set). */
  setRecipes(recipes: Record<string, (k: Synth) => void> | undefined): void {
    this.recipes = new Map(Object.entries(recipes ?? {}));
  }

  play(name: SoundName | (string & {}), ambient?: boolean): void {
    if (!this.enabled || this.volume <= 0) return;
    const background = ambient ?? AMBIENT.has(name as SoundName);
    if (!this.ambient && background) return;
    if (!this.gate()) return;
    const ctx = this.ctx;
    const out = this.master;
    if (!ctx || !out || ctx.state !== "running") return;
    const now = ctx.currentTime;
    // Rate limit each sound so bursts don't pile up.
    const prev = this.lastPlayed.get(name as SoundName) ?? -1;
    const minGap = name === "pingpong" ? 0.3 : name === "click" || QUICK.has(name as SoundName) ? 0.03 : 0.25;
    if (now - prev < minGap) return;
    this.lastPlayed.set(name as SoundName, now);
    this.lastAt = performance.now();
    const amb = background ? 0.35 : 1;

    const tone = (
      freq: number,
      start: number,
      dur: number,
      type: OscillatorType,
      vol: number,
      slideTo?: number,
    ) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, now + start);
      if (slideTo !== undefined) o.frequency.exponentialRampToValueAtTime(slideTo, now + start + dur);
      g.gain.setValueAtTime(0.0001, now + start);
      g.gain.exponentialRampToValueAtTime(vol * amb, now + start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      o.connect(g).connect(out);
      o.start(now + start);
      o.stop(now + start + dur + 0.02);
    };
    const noise = (start: number, dur: number, vol: number, filterHz: number) => {
      const len = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = filterHz;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol * amb, now + start);
      g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      src.connect(f).connect(g).connect(out);
      src.start(now + start);
    };

    /** Filtered noise that swells in and fades out (rain, wind, rumble). */
    const swell = (start: number, dur: number, vol: number, fromHz: number, toHz: number, q = 0.8, type: BiquadFilterType = "bandpass") => {
      const len = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.Q.value = q;
      f.frequency.setValueAtTime(fromHz, now + start);
      f.frequency.linearRampToValueAtTime(toHz, now + start + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now + start);
      g.gain.linearRampToValueAtTime(vol * amb, now + start + dur * 0.3);
      g.gain.linearRampToValueAtTime(0.0001, now + start + dur);
      src.connect(f).connect(g).connect(out);
      src.start(now + start);
    };

    const custom = this.recipes.get(name);
    if (custom) {
      custom({ tone, noise, swell });
      return;
    }
    switch (name as SoundName) {
      case "birds":
        // A breezy day: a couple of birds and the city far off.
        swell(0, 2.4, 0.03, 300, 380, 0.5, "lowpass");
        for (let i = 0; i < 7; i++) {
          const f = 2600 + Math.random() * 1400;
          const t0 = i * 0.24 + (i > 3 ? 0.4 : 0) + Math.random() * 0.06;
          tone(f, t0, 0.06, "sine", 0.07, f * 1.35);
          if (i % 2 === 0) tone(f * 1.1, t0 + 0.08, 0.05, "sine", 0.05, f * 0.9);
        }
        break;
      case "crickets":
        for (const [base, off] of [
          [4300, 0],
          [3900, 0.3],
        ] as const) {
          for (let burst = 0; burst < 3; burst++) {
            for (let k = 0; k < 5; k++) tone(base, off + burst * 0.62 + k * 0.035, 0.022, "sine", 0.045);
          }
        }
        break;
      case "rainfall":
        swell(0, 2.6, 0.13, 2600, 2200, 0.5);
        swell(0, 2.6, 0.05, 700, 600, 0.6);
        for (let i = 0; i < 8; i++) tone(1500 + Math.random() * 1500, Math.random() * 2.2, 0.03, "sine", 0.05, 900);
        break;
      case "wind":
        swell(0, 2.8, 0.16, 280, 900, 5);
        swell(0.7, 2.2, 0.1, 500, 260, 6);
        break;
      case "thunder":
        noise(0, 0.18, 0.18, 1100);
        swell(0.05, 3, 0.45, 110, 55, 0.7, "lowpass");
        swell(0.4, 2, 0.25, 80, 50, 0.7, "lowpass");
        break;
      case "foghorn":
        // A foghorn out in the bay, and a gull.
        tone(98, 0, 1.7, "sawtooth", 0.035);
        tone(196, 0, 1.7, "sine", 0.06);
        tone(1300, 1.9, 0.22, "triangle", 0.05, 900);
        tone(1250, 2.2, 0.25, "triangle", 0.045, 850);
        break;
      case "squeak":
        // Sofa springs.
        tone(200, 0, 0.32, "sine", 0.22, 420);
        tone(900, 0.04, 0.12, "triangle", 0.05, 1400);
        tone(1200, 0.2, 0.1, "triangle", 0.04, 800);
        break;
      case "squish":
        noise(0, 0.28, 0.1, 380);
        tone(170, 0, 0.22, "sine", 0.16, 85);
        break;
      case "zap":
        // BZZZT: a snap, a buzzing arc that crackles and sputters out, then the thud of hitting the floor.
        noise(0, 0.06, 0.35, 3500);
        tone(1900, 0, 0.08, "square", 0.08, 500);
        for (let i = 0; i < 9; i++) tone(i % 2 ? 180 : 120, i * 0.07, 0.075, "sawtooth", 0.09 * (1 - i * 0.07));
        tone(240, 0, 0.65, "square", 0.04, 150);
        tone(2600, 0.05, 0.6, "square", 0.025, 900);
        for (let i = 0; i < 16; i++) noise(0.04 + i * 0.04 + Math.random() * 0.02, 0.03, 0.3 * (1 - i * 0.04), 1800 + Math.random() * 4500);
        tone(150, 1.68, 0.18, "sine", 0.25, 55);
        noise(1.68, 0.1, 0.12, 400);
        break;
      case "wrench":
        for (let i = 0; i < 4; i++) tone(2800 + (i % 2) * 300, i * 0.06, 0.025, "square", 0.025);
        tone(1700, 0.3, 0.12, "triangle", 0.06);
        noise(0.3, 0.05, 0.05, 5000);
        break;
      case "drill":
        tone(380, 0, 0.7, "sawtooth", 0.018, 620);
        noise(0, 0.7, 0.03, 2200);
        break;
      case "fixed":
        tone(1046.5, 0, 0.14, "triangle", 0.1);
        tone(1568, 0.12, 0.3, "triangle", 0.1);
        break;
      case "beep":
        tone(1760, 0, 0.07, "square", 0.045);
        tone(2093, 0.09, 0.09, "square", 0.045);
        break;
      case "dingdong":
        // The delivery's here.
        tone(784, 0, 0.5, "triangle", 0.16);
        tone(622.3, 0.32, 0.7, "triangle", 0.15);
        break;
      case "putt":
        // A putter tapping a golf ball.
        tone(1250, 0, 0.035, "triangle", 0.16, 900);
        noise(0, 0.03, 0.08, 3200);
        break;
      case "cup":
        // The ball drops and rattles round the bottom of the cup.
        tone(240, 0, 0.09, "sine", 0.22, 150);
        [0.08, 0.15, 0.2, 0.24, 0.27].forEach((t0, i) => tone(1700 - i * 120, t0, 0.025, "square", 0.04 - i * 0.006));
        break;
      case "typing": {
        // A run of keystrokes at an uneven pace: a sharp tick on top of a
        // short thock, now and then the space bar.
        let at = 0;
        const n = 4 + Math.floor(Math.random() * 6);
        for (let i = 0; i < n; i++) {
          const space = Math.random() < 0.15;
          noise(at, 0.018, space ? 0.09 : 0.07, space ? 1400 : 3200 + Math.random() * 1800);
          tone(space ? 180 : 260 + Math.random() * 120, at, 0.025, "triangle", 0.05);
          at += 0.07 + Math.random() * 0.11 + (Math.random() < 0.12 ? 0.25 : 0);
        }
        break;
      }
      case "clack":
        // Newton's cradle: clack… clack… dying away.
        for (let i = 0; i < 6; i++) {
          tone(2900 - (i % 2) * 180, i * 0.26, 0.018, "square", 0.07 * (1 - i * 0.13));
          noise(i * 0.26, 0.02, 0.07 * (1 - i * 0.13), 4500);
        }
        break;
      case "clank":
        // The paper ball hits the rim.
        tone(560, 0, 0.3, "triangle", 0.1, 500);
        tone(1130, 0, 0.18, "sine", 0.05, 1060);
        noise(0, 0.04, 0.06, 2500);
        break;
      case "swish":
        // Nothing but net.
        swell(0, 0.22, 0.09, 5200, 2600, 0.7);
        break;
      case "twinkle":
        [1318.5, 1568, 1975.5, 2637, 1975.5, 2637].forEach((f, i) => tone(f, i * 0.08, 0.25, "sine", 0.07));
        break;
      case "needs-you":
        // Gentle doorbell: E6 → C6
        tone(1318.5, 0, 0.35, "triangle", 0.32);
        tone(1046.5, 0.18, 0.55, "triangle", 0.3);
        tone(659.3, 0.18, 0.5, "sine", 0.12);
        break;
      case "done":
        [523.3, 659.3, 784, 1046.5].forEach((f, i) => tone(f, i * 0.07, 0.18, "square", 0.08));
        tone(1568, 0.3, 0.35, "triangle", 0.12);
        break;
      case "error":
        tone(330, 0, 0.18, "sawtooth", 0.08, 260);
        tone(247, 0.16, 0.32, "sawtooth", 0.08, 180);
        break;
      case "start":
        tone(660, 0, 0.08, "square", 0.05);
        tone(990, 0.06, 0.1, "square", 0.05);
        break;
      case "arrive":
        tone(880, 0, 0.12, "sine", 0.14, 1760);
        tone(1760, 0.1, 0.15, "triangle", 0.08);
        noise(0, 0.08, 0.05, 6000);
        break;
      case "leave":
        tone(784, 0, 0.12, "triangle", 0.1);
        tone(523.3, 0.1, 0.2, "triangle", 0.1);
        break;
      case "pingpong":
        tone(1400 + Math.random() * 200, 0, 0.04, "sine", 0.35);
        break;
      case "meow": {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        const f = ctx.createBiquadFilter();
        o.type = "sawtooth";
        f.type = "lowpass";
        f.frequency.value = 1800;
        f.Q.value = 6;
        o.frequency.setValueAtTime(520, now);
        o.frequency.linearRampToValueAtTime(820, now + 0.12);
        o.frequency.linearRampToValueAtTime(600, now + 0.42);
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.12, now + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
        o.connect(f).connect(g).connect(out);
        o.start(now);
        o.stop(now + 0.5);
        break;
      }
      case "purr":
        for (let i = 0; i < 6; i++) tone(60 + (i % 2) * 6, i * 0.11, 0.1, "sawtooth", 0.18);
        break;
      case "bubble":
        for (let i = 0; i < 4; i++) tone(500 + Math.random() * 500, i * 0.06, 0.06, "sine", 0.2, 1200 + Math.random() * 400);
        break;
      case "coffee":
        noise(0, 0.6, 0.08, 900);
        for (let i = 0; i < 5; i++) tone(200 + Math.random() * 120, 0.1 + i * 0.09, 0.06, "sine", 0.15, 400);
        break;
      case "roomba":
        tone(988, 0, 0.08, "square", 0.05);
        tone(1318, 0.09, 0.08, "square", 0.05);
        tone(1568, 0.18, 0.12, "square", 0.05);
        break;
      case "channel":
        noise(0, 0.12, 0.12, 3000);
        tone(2000, 0.1, 0.03, "square", 0.04);
        break;
      case "click":
        tone(1800, 0, 0.025, "square", 0.05);
        break;
      case "door":
        tone(180, 0, 0.06, "triangle", 0.25);
        tone(150, 0.09, 0.07, "triangle", 0.2);
        break;
      case "marker":
        tone(2600 + Math.random() * 600, 0, 0.05, "sine", 0.05, 3400);
        tone(2400 + Math.random() * 600, 0.07, 0.04, "sine", 0.04, 3000);
        break;
      case "brew": {
        // An espresso: the grinder whirs, the portafilter clicks in, the
        // pump hums while it trickles into the cup, then a puff of steam.
        for (let i = 0; i < 9; i++) noise(i * 0.055, 0.07, 0.07 + (i % 2) * 0.03, 1800 + (i % 3) * 500);
        tone(220, 0, 0.5, "sawtooth", 0.012, 260);
        tone(900, 0.62, 0.03, "square", 0.05);
        tone(140, 0.66, 0.08, "sine", 0.12, 90);
        tone(50, 0.85, 1.25, "square", 0.022);
        tone(100, 0.85, 1.25, "sawtooth", 0.015);
        for (let i = 0; i < 9; i++) tone(700 + ((i * 263) % 500), 1.0 + i * 0.12, 0.05, "sine", 0.05, 420);
        noise(2.15, 0.7, 0.05, 6500);
        tone(1320, 2.2, 0.35, "sine", 0.012, 1250);
        break;
      }
      case "kettle":
        noise(0, 0.4, 0.05, 1200);
        tone(1900, 0.35, 0.9, "sine", 0.06, 2300);
        tone(2400, 0.45, 0.8, "sine", 0.04, 2700);
        break;
      case "vending":
        tone(1200, 0, 0.05, "square", 0.05);
        tone(1500, 0.07, 0.05, "square", 0.05);
        noise(0.2, 0.25, 0.06, 300);
        tone(120, 0.5, 0.12, "triangle", 0.3, 70);
        tone(90, 0.62, 0.1, "triangle", 0.2, 60);
        break;
      case "fridge":
        noise(0, 0.08, 0.08, 2000);
        tone(55, 0.05, 0.9, "sawtooth", 0.04);
        break;
      case "microwave":
        tone(220, 0, 1.2, "sawtooth", 0.025);
        tone(2093, 1.25, 0.5, "sine", 0.2);
        break;
      case "piano": {
        const scales = [
          [523.3, 659.3, 784, 1046.5, 784, 659.3],
          [392, 493.9, 587.3, 784, 587.3, 493.9, 392],
          [440, 523.3, 659.3, 880, 659.3],
          [349.2, 440, 523.3, 698.5, 523.3],
        ];
        const notes = scales[Math.floor(Math.random() * scales.length)]!;
        notes.forEach((f, i) => {
          tone(f, i * 0.16, 0.7, "triangle", 0.14);
          tone(f * 2, i * 0.16, 0.3, "sine", 0.03);
        });
        break;
      }
      case "dart":
        noise(0, 0.05, 0.1, 3000);
        tone(160, 0.1, 0.08, "triangle", 0.3, 90);
        break;
      case "print":
        for (let i = 0; i < 6; i++) tone(320 + (i % 2) * 40, i * 0.12, 0.1, "square", 0.025);
        noise(0.75, 0.2, 0.05, 2500);
        break;
      case "glug":
        for (let i = 0; i < 4; i++) tone(140 + i * 30, i * 0.14, 0.12, "sine", 0.25, 260 + i * 30);
        break;
      case "switch":
        tone(2400, 0, 0.015, "square", 0.08);
        tone(1200, 0.02, 0.02, "square", 0.05);
        break;
      case "water":
        noise(0, 0.6, 0.07, 3500);
        for (let i = 0; i < 5; i++) tone(900 + Math.random() * 600, 0.1 + i * 0.1, 0.05, "sine", 0.08);
        break;
      case "crumple":
        noise(0, 0.18, 0.12, 1800);
        noise(0.2, 0.12, 0.08, 2600);
        tone(220, 0.7, 0.06, "triangle", 0.15, 150);
        break;
      case "cuckoo":
        tone(784, 0, 0.22, "sine", 0.25);
        tone(622.3, 0.28, 0.35, "sine", 0.25);
        tone(784, 0.8, 0.22, "sine", 0.2);
        tone(622.3, 1.08, 0.35, "sine", 0.2);
        break;
      case "arcade":
        [659.3, 784, 1046.5, 784, 1318.5].forEach((f, i) => tone(f, i * 0.08, 0.08, "square", 0.06));
        break;
      case "bark":
        noise(0, 0.09, 0.2, 700);
        tone(380, 0, 0.09, "sawtooth", 0.08, 220);
        noise(0.18, 0.09, 0.2, 750);
        tone(400, 0.18, 0.09, "sawtooth", 0.08, 230);
        break;
      case "walkie":
        noise(0, 0.25, 0.08, 2200);
        tone(1000, 0.26, 0.05, "square", 0.04);
        break;
      case "whistle":
        [880, 988, 1175, 988, 880].forEach((f, i) => tone(f, i * 0.14, 0.13, "sine", 0.08));
        break;
      case "jingle": {
        // Sleigh bells over the first phrase of a winter tune.
        for (let i = 0; i < 10; i++) noise(i * 0.09, 0.07, 0.05, 7000 + (i % 3) * 900);
        [
          [659.3, 0.18], [659.3, 0.18], [659.3, 0.36],
          [659.3, 0.18], [659.3, 0.18], [659.3, 0.36],
          [659.3, 0.18], [784, 0.18], [523.3, 0.27], [587.3, 0.09], [659.3, 0.5],
        ].reduce((t0, [f, d]) => {
          tone(f!, t0, d! * 0.9, "triangle", 0.11);
          tone(f! * 2, t0, d! * 0.5, "sine", 0.025);
          return t0 + d!;
        }, 0.05);
        break;
      }
      case "lantern": {
        // A gentle children's lantern song on a music box.
        const tune: [number, number][] = [
          [392, 0.3], [523.3, 0.3], [392, 0.3], [523.3, 0.3],
          [587.3, 0.3], [659.3, 0.3], [587.3, 0.6],
          [523.3, 0.3], [493.9, 0.3], [440, 0.3], [392, 0.6],
        ];
        tune.reduce((t0, [f, d]) => {
          tone(f, t0, d * 1.4, "sine", 0.09);
          tone(f * 2, t0, d * 0.6, "triangle", 0.02);
          return t0 + d;
        }, 0);
        break;
      }
      case "harp":
        [261.6, 329.6, 392, 523.3, 659.3, 784, 1046.5].forEach((f, i) => {
          tone(f, i * 0.07, 1.1, "sine", 0.08);
          tone(f * 2, i * 0.07, 0.4, "sine", 0.015);
        });
        break;
      case "jig":
        // A quick 6/8 tune in D, fiddle-ish.
        [587.3, 740, 880, 740, 587.3, 740, 659.3, 784, 987.8, 784, 659.3, 784, 880, 740, 587.3].forEach((f, i) => {
          tone(f, i * 0.11, 0.1, "square", 0.035);
          tone(f / 2, i * 0.11, 0.09, "triangle", 0.03);
        });
        break;
      case "dhol":
        // Dha . ta dha ta . dha ta: low booms and sharp slaps.
        ["B", "", "S", "B", "S", "", "B", "S", "B", "", "S", "B", "S", "S", "B", ""].forEach((h, i) => {
          if (h === "B") tone(110, i * 0.12, 0.25, "sine", 0.18, 50);
          if (h === "S") noise(i * 0.12, 0.06, 0.12, 2400);
        });
        break;
      case "sitar":
        // A drone and a plucked phrase that bends into its notes.
        tone(146.8, 0, 2.2, "sine", 0.04);
        tone(220, 0, 2.2, "sine", 0.025);
        [[293.7, 329.6], [370, 370], [440, 440], [493.9, 440], [370, 392], [329.6, 293.7]].forEach(([f, to], i) => {
          tone(f!, i * 0.28, 0.5, "sawtooth", 0.035, to);
          tone(f! * 2, i * 0.28, 0.2, "sine", 0.02);
        });
        break;
      case "steeldrum":
        [[523.3, 0.2], [659.3, 0.2], [784, 0.4], [659.3, 0.2], [698.5, 0.2], [880, 0.4], [784, 0.2], [659.3, 0.6]].reduce((t0, [f, d]) => {
          tone(f!, t0, 0.45, "sine", 0.1);
          tone(f! * 2.01, t0, 0.18, "sine", 0.04);
          tone(f! * 3.98, t0, 0.08, "sine", 0.015);
          return t0 + d!;
        }, 0);
        break;
      case "tusch":
        // The carnival "Tusch": a drum roll into three brass chords.
        for (let i = 0; i < 8; i++) noise(i * 0.045, 0.05, 0.08, 1800);
        [
          [0.36, [261.6, 329.6, 392]],
          [0.62, [349.2, 440, 523.3]],
          [0.88, [392, 493.9, 587.3]],
        ].forEach(([t0, chord]) => {
          for (const f of chord as number[]) {
            tone(f, t0 as number, 0.24, "sawtooth", 0.035);
            tone(f / 2, t0 as number, 0.24, "square", 0.015);
          }
        });
        for (const f of [261.6, 329.6, 392, 523.3]) tone(f, 1.14, 0.7, "sawtooth", 0.035);
        noise(1.14, 0.6, 0.08, 6000);
        break;
      case "server":
        // Fans spin up, then a burst of data chirps.
        noise(0, 1.1, 0.07, 500);
        tone(110, 0, 1.1, "sawtooth", 0.015, 220);
        for (let i = 0; i < 10; i++) tone(1200 + ((i * 337) % 900), 0.3 + i * 0.07, 0.04, "square", 0.025);
        break;
      case "firecracker":
        // A string of firecrackers and a gong.
        for (let i = 0; i < 14; i++) noise(i * 0.06 + (i % 3) * 0.015, 0.05, 0.14, 1200 + (i % 4) * 700);
        tone(98, 0.95, 1.4, "sine", 0.1, 92);
        tone(196.5, 0.95, 1, "sine", 0.04);
        break;
      case "oompah": {
        // A little brass-band polka: oom-pah under a bright tune.
        const bass = [130.8, 196, 130.8, 196, 174.6, 261.6, 196, 130.8];
        bass.forEach((f, i) => {
          tone(f, i * 0.2, 0.12, "sawtooth", 0.035);
          if (i % 2) tone(f * 1.5, i * 0.2 + 0.1, 0.07, "square", 0.02);
        });
        [523.3, 659.3, 784, 659.3, 698.5, 880, 784, 523.3].forEach((f, i) => tone(f, i * 0.2, 0.17, "square", 0.03));
        break;
      }
      case "spooky":
        // A wobbly theremin glide and a low organ chord.
        tone(392, 0, 0.7, "sine", 0.09, 330);
        tone(330, 0.65, 0.8, "sine", 0.09, 466.2);
        tone(98, 0, 1.4, "sawtooth", 0.025);
        tone(116.5, 0, 1.4, "sawtooth", 0.02);
        tone(146.8, 0, 1.4, "sawtooth", 0.018);
        break;
      case "party":
        [523.3, 659.3, 784, 659.3, 698.5, 880, 784, 1046.5].forEach((f, i) => {
          tone(f, i * 0.12, 0.11, "square", 0.05);
          tone(f / 2, i * 0.12, 0.1, "triangle", 0.06);
        });
        break;
      case "birthday":
        [
          [392, 0.3],
          [392, 0.15],
          [440, 0.45],
          [392, 0.45],
          [523.3, 0.45],
          [493.9, 0.9],
        ].reduce((t0, [f, d]) => {
          tone(f!, t0, d! * 0.9, "triangle", 0.12);
          return t0 + d!;
        }, 0);
        break;
      case "giggle":
        for (let i = 0; i < 4; i++) tone(900 + i * 120 + Math.random() * 60, i * 0.09, 0.07, "sine", 0.12, 1300 + i * 100);
        break;
      case "cheer":
        noise(0, 0.9, 0.06, 1400);
        for (let i = 0; i < 6; i++) tone(500 + Math.random() * 400, Math.random() * 0.6, 0.18, "sawtooth", 0.015, 700 + Math.random() * 300);
        break;
      case "spin":
        for (let i = 0; i < 8; i++) tone(300 + i * 60, i * 0.05, 0.05, "triangle", 0.06);
        break;
      case "toss":
        noise(0, 0.12, 0.05, 1500);
        tone(110, 0.35, 0.08, "triangle", 0.25, 70);
        break;
      case "chime":
        [784, 659.3, 523.3].forEach((f, i) => tone(f, i * 0.25, 0.6, "sine", 0.15));
        break;
      // The arcade: little square-wave bleeps.
      case "blip":
        tone(880, 0, 0.05, "square", 0.045);
        break;
      case "bonk":
        tone(330, 0, 0.05, "square", 0.035);
        break;
      case "chomp":
        tone(520, 0, 0.05, "square", 0.045, 880);
        tone(700, 0.05, 0.05, "square", 0.04, 1040);
        break;
      case "pew":
        tone(1500, 0, 0.12, "square", 0.03, 300);
        break;
      case "pop":
        tone(620 + Math.random() * 160, 0, 0.06, "square", 0.045, 990);
        break;
      case "boom":
        noise(0, 0.22, 0.12, 700);
        tone(170, 0, 0.2, "triangle", 0.12, 50);
        break;
      case "miss":
        tone(392, 0, 0.12, "square", 0.045, 262);
        tone(262, 0.13, 0.22, "square", 0.045, 130);
        break;
      case "point":
        [784, 1046.5].forEach((f, i) => tone(f, i * 0.07, 0.08, "square", 0.045));
        break;
      case "select":
        tone(1200, 0, 0.03, "square", 0.03);
        break;
      case "fanfare":
        [
          [523.3, 0, 0.1],
          [659.3, 0.1, 0.1],
          [784, 0.2, 0.1],
          [1046.5, 0.3, 0.18],
          [784, 0.5, 0.1],
          [1046.5, 0.6, 0.45],
        ].forEach(([f, t0, d]) => {
          tone(f!, t0!, d!, "square", 0.045);
          tone(f! / 2, t0!, d!, "triangle", 0.08);
        });
        break;
      case "womp":
        [392, 370, 349.2].forEach((f, i) => tone(f, i * 0.3, 0.26, "square", 0.045, f * 0.97));
        tone(329.6, 0.9, 0.7, "square", 0.045, 300);
        tone(82.4, 0.9, 0.7, "triangle", 0.1, 75);
        break;
    }
  }
}
