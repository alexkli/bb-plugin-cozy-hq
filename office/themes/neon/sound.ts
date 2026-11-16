// Neon City sounds: rain on glass, the synth hum of the building, hover
// traffic and distant sirens; a digital chime for the clock and a synth for
// the piano.
import type { SoundRecipe } from "../../theme.ts";

const hum = (k: Parameters<SoundRecipe>[0], dur: number, vol = 0.05) => {
  k.tone(55, 0, dur, "sine", vol);
  k.tone(110, 0, dur, "triangle", vol * 0.4);
  k.tone(165.5, 0.1, dur - 0.1, "sine", vol * 0.25);
};

const traffic = (k: Parameters<SoundRecipe>[0], at: number, vol = 0.07) => {
  // A hover car swooshing past.
  k.swell(at, 1.4, vol, 300, 1400, 2.5);
  k.tone(220, at + 0.2, 1, "sawtooth", vol * 0.12, 170);
};

const siren = (k: Parameters<SoundRecipe>[0], at: number, vol = 0.025) => {
  for (let i = 0; i < 2; i++) {
    k.tone(660, at + i * 0.9, 0.45, "sine", vol, 880);
    k.tone(880, at + i * 0.9 + 0.45, 0.45, "sine", vol, 660);
  }
};

export const NEON_SOUNDS: Record<string, SoundRecipe> = {
  "neon-rain": (k) => {
    k.swell(0, 2.8, 0.12, 2600, 2100, 0.5);
    k.swell(0, 2.8, 0.05, 650, 520, 0.6);
    for (let i = 0; i < 10; i++) k.tone(1400 + Math.random() * 1800, Math.random() * 2.4, 0.03, "sine", 0.04, 900);
    hum(k, 2.6, 0.035);
    traffic(k, 0.8, 0.05);
  },
  "neon-storm": (k) => {
    k.swell(0, 2.8, 0.14, 2500, 2000, 0.5);
    k.noise(0.2, 0.18, 0.16, 1000);
    k.swell(0.25, 3, 0.4, 110, 50, 0.7, "lowpass");
    hum(k, 2.8, 0.03);
  },
  "neon-night": (k) => {
    hum(k, 2.8, 0.05);
    traffic(k, 0.1, 0.06);
    siren(k, 0.9);
  },
  "neon-day": (k) => {
    hum(k, 2.6, 0.04);
    traffic(k, 0, 0.07);
    traffic(k, 1.1, 0.05);
    k.tone(1320, 1.9, 0.12, "square", 0.012);
    k.tone(990, 2.05, 0.16, "square", 0.012);
  },
  "neon-fog": (k) => {
    hum(k, 2.8, 0.05);
    // A deep horn from the harbor towers.
    k.tone(73, 0.3, 1.8, "sawtooth", 0.03);
    k.tone(146, 0.3, 1.8, "sine", 0.04);
    k.swell(0, 2.8, 0.05, 400, 300, 1);
  },
  "neon-wind": (k) => {
    k.swell(0, 2.8, 0.14, 280, 900, 5);
    k.swell(0.7, 2.1, 0.08, 500, 260, 6);
    hum(k, 2.6, 0.03);
  },
  // Built-in names, reflavored.
  cuckoo: (k) => {
    [1046.5, 1318.5, 1568, 2093].forEach((f, i) => k.tone(f, i * 0.11, 0.18, "square", 0.05));
    k.tone(1568, 0.6, 0.35, "sine", 0.12);
  },
  piano: (k) => {
    const scales = [
      [261.6, 311.1, 392, 466.2, 523.3, 466.2, 392],
      [220, 261.6, 329.6, 392, 440, 392],
      [293.7, 349.2, 440, 523.3, 587.3, 523.3],
    ];
    const notes = scales[Math.floor(Math.random() * scales.length)]!;
    notes.forEach((f, i) => {
      k.tone(f, i * 0.13, 0.45, "sawtooth", 0.05, f * 0.995);
      k.tone(f * 2, i * 0.13, 0.25, "square", 0.02);
    });
    k.tone(notes[0]! / 2, 0, notes.length * 0.13 + 0.4, "triangle", 0.08);
  },
};

export function neonOutdoor(weather: string, night: boolean): string {
  if (weather === "storm") return "neon-storm";
  if (weather === "rain" || weather === "drizzle") return "neon-rain";
  if (weather === "fog") return "neon-fog";
  if (weather === "snow" || weather === "cloudy") return "neon-wind";
  return night ? "neon-night" : "neon-day";
}
