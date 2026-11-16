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
  // Things to click on the street.
  "nc-sizzle": (k) => {
    k.swell(0, 1.4, 0.12, 3400, 2600, 0.6);
    k.noise(0.05, 0.6, 0.06, 5200);
  },
  "nc-flame": (k) => {
    k.swell(0, 0.9, 0.22, 180, 1400, 0.7, "lowpass");
    k.noise(0.05, 0.5, 0.12, 900);
    k.swell(0.5, 1.4, 0.1, 3200, 2400, 0.6);
  },
  "nc-glitch": (k) => {
    for (let i = 0; i < 7; i++) k.tone(200 + Math.random() * 1800, i * 0.07, 0.05, "square", 0.05);
    k.noise(0, 0.4, 0.06, 2400);
    k.tone(880, 0.6, 0.12, "sine", 0.08, 1320);
  },
  "nc-koi": (k) => {
    [523.3, 659.3, 784, 1046.5, 1318.5].forEach((f, i) => k.tone(f, i * 0.16, 0.6, "sine", 0.07));
    k.swell(0, 2.4, 0.04, 400, 900, 2);
  },
  "nc-chirp": (k) => {
    for (let i = 0; i < 6; i++) k.tone(2300, i * 0.18, 0.06, "square", 0.04, 1900);
  },
  "nc-squeak": (k) => {
    for (let i = 0; i < 3; i++) k.tone(2400 + i * 300, i * 0.12, 0.06, "sine", 0.06, 3000);
    k.noise(0.1, 0.5, 0.03, 4000);
  },
  "nc-clang": (k) => {
    k.noise(0, 0.12, 0.2, 700);
    k.tone(180, 0, 0.5, "triangle", 0.12, 150);
    k.tone(520, 0.02, 0.3, "square", 0.03, 480);
  },
  "nc-rev": (k) => {
    k.tone(70, 0, 1.2, "sawtooth", 0.06, 220);
    k.tone(140, 0.9, 0.8, "sawtooth", 0.05, 420);
    k.swell(1.4, 1.4, 0.12, 300, 2600, 3);
  },
  "nc-alarm": (k) => {
    for (let i = 0; i < 6; i++) k.tone(i % 2 ? 990 : 1320, i * 0.22, 0.2, "square", 0.04);
  },
  "nc-drip": (k) => {
    k.tone(1500, 0.35, 0.08, "sine", 0.12, 600);
  },
  "nc-hiss": (k) => {
    k.swell(0, 1.8, 0.1, 5200, 4200, 0.6);
  },
  "nc-steam": (k) => {
    k.noise(0, 0.15, 0.1, 1600);
    k.swell(0.05, 2.2, 0.14, 3800, 2400, 0.5);
  },
  "nc-bot": (k) => {
    [880, 1320, 990, 1480].forEach((f, i) => k.tone(f, 0.6 + i * 0.12, 0.08, "square", 0.04));
    k.tone(220, 0, 0.5, "triangle", 0.05, 330);
  },
  "nc-bell": (k) => {
    k.tone(1318.5, 0, 0.5, "sine", 0.12);
    k.tone(1975.5, 0.02, 0.4, "sine", 0.05);
  },
  "nc-slurp": (k) => {
    k.swell(0, 0.6, 0.08, 500, 1800, 3);
    k.tone(300, 0.05, 0.4, "sine", 0.05, 900);
  },
  "nc-drone": (k) => {
    k.tone(190, 0, 2.4, "sawtooth", 0.025, 230);
    k.swell(0, 2.6, 0.08, 600, 1500, 4);
  },
  "nc-splash": (k) => {
    k.noise(0, 0.25, 0.14, 1800);
    for (let i = 0; i < 4; i++) k.tone(900 + Math.random() * 900, 0.05 + i * 0.07, 0.05, "sine", 0.05, 500);
  },
  "nc-ticket": (k) => {
    for (let i = 0; i < 8; i++) k.tone(1800 + (i % 2) * 400, 0.1 + i * 0.06, 0.04, "square", 0.03);
    k.noise(0.62, 0.08, 0.08, 3000);
  },
  "nc-spin": (k) => {
    k.swell(0, 0.5, 0.1, 600, 2400, 2);
    k.swell(0.45, 0.6, 0.07, 2000, 700, 2);
  },
  "nc-thud": (k) => {
    k.tone(110, 0.15, 0.25, "triangle", 0.2, 60);
    k.noise(0.15, 0.2, 0.12, 600);
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
