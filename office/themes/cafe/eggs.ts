// Coffee Shop: hidden Easter eggs. None of them is outlined when you hold
// Alt (they're for finding), and each also happens on its own about once
// every hour or two with the office open.
//
// - The terrace croissant: someone left half a croissant on a bistro table
//   out front. Click it and a pigeon swoops in, has a peck and makes off
//   with it over the road (a fresh one turns up a while later).
// - DO NOT UNPLUG: the sticky note by the STAFF sign over the back room. Unplug it anyway
//   and the Wi-Fi drops: everyone at a table holds their laptop up in the
//   air hunting for a signal, until the router blinks back to life.
// - The busker's case: an open accordion case by the fountain. A busker in a
//   beret strolls up, plays a little waltz and passers-by toss coins in.
//
// Clicks only set the clock (EGG); everything is drawn from it by `eggDecor`
// and `eggOverlay`. Per frame that's a handful of cached sprites.

import { ANCHOR_X, ANCHOR_Y, charSprite, type CharPose, type Look } from "../../characters.ts";
import type { Layout, Point, Rect } from "../../layout.ts";
import type { Drawable, PaintInfo, PoseOf, SceneryActions, SceneryClickable, SoundRecipe } from "../../theme.ts";
import { C, fill, sprite } from "./kit.ts";
import { planOf, type CafePlan } from "./plan.ts";

type Ctx = CanvasRenderingContext2D;

const NEVER = -1e9;
const HEIST = 8;
/** How long the table stays bare before the bakery sends out another croissant. */
const RESTOCK = 45;
const WIFI = 13;
const BUSK = 23;

const EGG = { heistAt: NEVER, wifiAt: NEVER, buskAt: NEVER, autoAt: NEVER };

const HOVER = {
  croissant: "Half a croissant · someone's coming back for that",
  note: "A sticky note: DO NOT UNPLUG",
  case: "An open accordion case · a few coins in it",
};

const LINES = {
  heist: ["Hey! My croissant!", "Not again.", "That pigeon has a whole operation."],
  wifi: ["Wi-Fi's down!", "Is it just me?", "Try the window seat!", "Hold it higher!"],
  wifiBoss: "Turn it off and on again.",
  wifiBack: "We're back!",
  busk: ["Ooh, a waltz.", "Bravo!", "Encore!", "Is that the café's song?"],
};

const since = (at: number, t: number, len: number) => (t - at >= 0 && t - at < len ? t - at : -1);
const ease = (u: number) => {
  const x = Math.max(0, Math.min(1, u));
  return x * x * (3 - 2 * x);
};
const pick = <T>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)]!;

// ------------------------------------------------------------------ where things are

/** The bistro table the croissant sits on (one a bit left of the middle, clear of the door). */
function croissantTable(plan: CafePlan): CafePlan["bistro"][number] | null {
  if (!plan.terrace || plan.bistro.length < 2) return null;
  const doors = plan.facade?.doors ?? [];
  const ok = plan.bistro.filter((b) => doors.every((d) => Math.abs(b.x - d) > 24));
  return ok[Math.floor(ok.length * 0.35)] ?? null;
}

/** Stuck on the wall over the back room's door, beside the STAFF sign (the room itself is the server's click). */
function noteRect(plan: CafePlan): Rect | null {
  const s = plan.server;
  return s ? { x: s.r.x + s.r.w - 22, y: s.r.y - 11, w: 7, h: 7 } : null;
}

/** The busker's spot beside the fountain (the side without an edge bench close by), and where the case lies. */
function buskSpot(plan: CafePlan): { x: number; y: number; dir: 1 | -1; case: Rect; from: number } | null {
  const P = plan.piazza;
  const f = plan.fountain;
  if (!P || !f || !plan.terrace) return null;
  const clear = (x: number) => plan.benches.every((b) => Math.abs(b.x - x) > 16 || Math.abs(b.y - (f.y + 8)) > 22);
  const right = Math.min(P.x + P.w - 14, f.x + f.rx + 26);
  const left = Math.max(P.x + 14, f.x - f.rx - 26);
  const dir: 1 | -1 = clear(left) ? 1 : -1;
  const x = dir === 1 ? left : right;
  if (!clear(x)) return null;
  const y = f.y + 8;
  const cx = dir === 1 ? x + 6 : x - 18;
  return { x, y, dir, case: { x: cx, y: y - 5, w: 12, h: 6 }, from: dir === 1 ? P.x + 4 : P.x + P.w - 4 };
}

// ------------------------------------------------------------------ clicks

export function eggClickables(L: Layout): SceneryClickable[] {
  const plan = planOf(L);
  if (!plan) return [];
  const out: SceneryClickable[] = [];
  const b = croissantTable(plan);
  if (b) out.push({ id: "egg-croissant", rect: { x: b.x - 6, y: b.y - 14, w: 12, h: 7 }, hover: HOVER.croissant, secret: true });
  const n = noteRect(plan);
  if (n) out.push({ id: "egg-note", rect: { x: n.x - 1, y: n.y - 1, w: n.w + 2, h: n.h + 2 }, hover: HOVER.note, secret: true });
  const s = buskSpot(plan);
  if (s) out.push({ id: "egg-case", rect: { x: s.case.x - 1, y: s.case.y - 2, w: s.case.w + 2, h: s.case.h + 3 }, hover: HOVER.case, secret: true });
  return out;
}

function busy(t: number): boolean {
  return since(EGG.heistAt, t, HEIST) >= 0 || since(EGG.wifiAt, t, WIFI) >= 0 || since(EGG.buskAt, t, BUSK) >= 0;
}

/** Lines from whoever's nearest a point, staggered. */
function chatter(act: SceneryActions, x: number, y: number, r: number, lines: [number, string][]): void {
  const who = act.near(x, y, r);
  lines.forEach(([at, text], i) => {
    const p = who[i % Math.max(1, Math.min(2, who.length))];
    if (p) act.say(p.id, text, 2.6, at);
  });
}

export function eggClick(id: string, act: SceneryActions): string | null {
  const plan = planOf(act.L);
  if (!plan) return null;
  const t = act.t;
  switch (id) {
    case "egg-croissant": {
      const b = croissantTable(plan);
      if (!b || since(EGG.heistAt, t, RESTOCK) >= 0) return null;
      EGG.heistAt = t;
      chatter(act, b.x, b.y, 120, [[1.4, LINES.heist[0]!], [3.8, LINES.heist[1]!], [6.2, LINES.heist[2]!]]);
      return "cafe-heist";
    }
    case "egg-note": {
      if (since(EGG.wifiAt, t, WIFI) >= 0) return null;
      EGG.wifiAt = t;
      const who = act.near(act.L.W / 2, act.L.H / 2, 4000).filter((p) => !plan.facade || p.y < plan.facade.y);
      LINES.wifi.forEach((text, i) => {
        const p = who[(i * 3) % Math.max(1, who.length)];
        if (p) act.say(p.id, text, 2.4, 0.8 + i * 1.6);
      });
      act.say("boss", LINES.wifiBoss, 2.6, 6.6);
      if (who[1]) act.say(who[1].id, LINES.wifiBack, 2.4, WIFI - 2.2);
      return "cafe-unplug";
    }
    case "egg-case": {
      const s = buskSpot(plan);
      if (!s || since(EGG.buskAt, t, BUSK) >= 0) return null;
      EGG.buskAt = t;
      chatter(act, s.x, s.y, 200, [[5, LINES.busk[0]!], [11, LINES.busk[1]!], [17.5, LINES.busk[2]!]]);
      return "cafe-accordion";
    }
  }
  return null;
}

/** On their own now and then: about once an hour one of them, never within half an hour of the last. */
export function eggTick(act: SceneryActions): void {
  if (busy(act.t) || act.t - EGG.autoAt < 1800 || Math.random() > 1 / 7200) return;
  const ids = eggClickables(act.L).map((c) => c.id);
  if (ids.length === 0) return;
  EGG.autoAt = act.t;
  const sound = eggClick(pick(ids), act);
  if (sound) act.play(sound);
}

// ------------------------------------------------------------------ habits

/** Laptops held up for a signal this frame (filled by `eggPose`, drawn in `eggOverlay`). */
const raised: { t: number; at: (Point & { back: boolean })[] } = { t: -1, at: [] };

/** With the Wi-Fi down, everyone at a table stands and holds their laptop up, hunting for a signal. */
export function eggPose(p: PoseOf, info: PaintInfo): { pose: CharPose; expr: "worried" } | null {
  const k = since(EGG.wifiAt, info.t, WIFI);
  if (k < 0.6 || k > WIFI - 2 || p.kind !== "agent" || p.spot !== "desk") return null;
  if (raised.t !== info.t) {
    raised.t = info.t;
    raised.at = [];
  }
  // Waved about a little, this way and that.
  raised.at.push({ x: p.x + (Math.floor(info.t * 1.5 + p.seed) % 2 ? 1 : -1), y: p.y, back: p.facing === "back" });
  return { pose: "raise", expr: "worried" };
}

// ------------------------------------------------------------------ sprites

const croissantSprite = () =>
  sprite("egg-croissant", 8, 4, (g) => {
    // Half a croissant, flaky and golden.
    g.rect(1, 1, 6, 2, "#d99a4e").rect(0, 2, 8, 1, "#c47f38").set(2, 1, "#f0c27a").set(4, 0, "#e8ad5e").set(5, 1, "#f0c27a");
  });

function pigeonSprite(frame: 0 | 1): HTMLCanvasElement {
  return sprite(`egg-pigeon-${frame}`, 9, 7, (g) => {
    // A street pigeon from the side, wings up or down.
    g.rect(2, 3, 5, 3, "#8a8f9c").rect(6, 2, 2, 2, "#6c7180").set(8, 3, "#e8a066").set(7, 2, "#2a2a30");
    g.set(3, 4, "#a7d0b8").set(4, 4, "#b49ad6");
    if (frame === 0) g.rect(1, 0, 4, 3, "#a3a8b4");
    else g.rect(1, 5, 4, 2, "#a3a8b4");
    g.set(0, 4, "#6c7180");
  });
}

const noteSprite = () =>
  sprite("egg-note", 7, 7, (g) => {
    // A curling yellow sticky note, scrawled in red.
    g.rect(0, 0, 7, 7, "#f4dc8a").set(6, 6, "#d8bd62").set(5, 6, "#e6cc74");
    g.hline(1, 2, 5, "#c23544").hline(1, 4, 4, "#c23544");
  }, false);

const caseSprite = () =>
  sprite("egg-case", 12, 6, (g) => {
    // The open case: worn leather, red velvet inside, a few coins.
    g.rect(0, 0, 12, 6, C.leatherLo).rect(1, 1, 10, 4, "#9c2a3a").set(3, 3, C.brassHi).set(7, 2, C.brassHi).set(8, 4, C.chrome);
  });

function accordionSprite(stretch: number): HTMLCanvasElement {
  const w = 8 + stretch;
  return sprite(`egg-accordion-${stretch}`, w, 8, (g) => {
    // Two red end boxes and the pleated bellows between them.
    g.rect(0, 0, 3, 8, "#c23544").rect(w - 3, 0, 3, 8, "#c23544").set(1, 2, C.chromeHi).set(1, 5, C.chromeHi);
    for (let x = 3; x < w - 3; x++) g.vline(x, 1, 6, x % 2 ? C.cream : C.creamLo);
  });
}

/** A laptop held up over someone's head: the screen (a spinner, no bars) or, from behind, the lid with its sticker. */
function laptopUp(back: boolean): HTMLCanvasElement {
  return sprite(`egg-laptop-up-${back ? "back" : "front"}`, 13, 8, (g) => {
    if (back) g.rect(0, 0, 13, 7, C.chrome).hline(0, 0, 13, C.chromeHi).rect(5, 2, 3, 3, C.copper).set(6, 3, C.cream);
    else g.rect(0, 0, 13, 7, C.chromeLo).rect(1, 1, 11, 5, "#1d1a22").set(6, 2, C.chalkBlue).set(5, 3, C.chalkBlue).set(7, 4, "#4e5a66");
    g.hline(0, 7, 13, C.chromeDk);
  });
}

/** No Wi-Fi: the fan of bars, struck through. */
const noSignal = () =>
  sprite("egg-no-signal", 9, 7, (g) => {
    g.hline(1, 1, 7, C.cream).hline(2, 3, 5, C.cream).hline(3, 5, 3, C.cream);
    for (let i = 0; i < 7; i++) g.set(1 + i, i, "#e5484d");
  });

const BUSKER: Look = { key: "cafe-busker", skin: "#e0ac84", hair: "#3b2a22", hairStyle: "crop", shirt: "#2f3a5a", pants: "#2a2a34", accessory: "beanie", accent: "#c23544" };

// ------------------------------------------------------------------ drawing

export function eggDecor(ctx: Ctx, L: Layout, info: PaintInfo): Drawable[] {
  const plan = planOf(L);
  if (!plan) return [];
  const t = info.t;
  const out: Drawable[] = [];
  const b = croissantTable(plan);
  const hk = since(EGG.heistAt, t, RESTOCK);
  if (b) {
    const tx = b.x - 4;
    const ty = b.y - 12;
    // On the table until the pigeon lifts off with it.
    if (hk < 0 || hk < 3.2) out.push({ z: b.y + 1.5, draw: () => ctx.drawImage(croissantSprite(), tx, ty) });
    if (hk >= 0 && hk < HEIST) {
      out.push({
        z: b.y + 2,
        draw: () => {
          let x: number;
          let y: number;
          let flap = true;
          if (hk < 1.6) {
            // Swooping down from over the awning.
            const u = ease(hk / 1.6);
            x = tx + 50 * (1 - u);
            y = ty - 6 - 46 * (1 - u) + Math.sin(u * Math.PI) * -8;
          } else if (hk < 3.2) {
            // A peck or two.
            x = tx - 1;
            y = ty - 5 + (Math.floor(hk * 6) % 2);
            flap = false;
          } else {
            // Off over the road with it.
            const u = (hk - 3.2) / (HEIST - 3.2);
            x = tx - 1 - u * 160;
            y = ty - 5 - u * 70 + Math.sin(u * 9) * 3;
          }
          const frame: 0 | 1 = flap && Math.floor(t * 10) % 2 ? 1 : 0;
          if (hk >= 3.2) ctx.drawImage(croissantSprite(), Math.round(x) + 1, Math.round(y) + 6);
          // Facing left all the way (the sprite faces right).
          ctx.save();
          ctx.translate(Math.round(x) + 9, Math.round(y));
          ctx.scale(-1, 1);
          ctx.drawImage(pigeonSprite(frame), 0, 0);
          ctx.restore();
        },
      });
    }
  }
  const n = noteRect(plan);
  if (n) {
    const wk = since(EGG.wifiAt, t, WIFI);
    // Peeled off and hanging by a corner while the router's unplugged.
    out.push({
      z: n.y + 30,
      draw: () => {
        if (wk >= 0 && wk < WIFI - 2) {
          ctx.save();
          ctx.translate(n.x + 1, n.y);
          ctx.rotate(0.5);
          ctx.drawImage(noteSprite(), 0, 0);
          ctx.restore();
        } else ctx.drawImage(noteSprite(), n.x, n.y);
      },
    });
  }
  const s = buskSpot(plan);
  if (s) {
    out.push({ z: s.case.y + s.case.h, draw: () => ctx.drawImage(caseSprite(), s.case.x, s.case.y) });
    const k = since(EGG.buskAt, t, BUSK);
    if (k >= 0) out.push({ z: s.y, draw: () => drawBusker(ctx, s, k, t) });
  }
  return out;
}

/** The busker: strolls up, plays (bellows breathing in and out, notes rising), coins fly into the case, a wave, and off again. */
function drawBusker(ctx: Ctx, s: NonNullable<ReturnType<typeof buskSpot>>, k: number, t: number): void {
  const WALK = 2.5;
  const PLAY = BUSK - 4.5;
  let x = s.x;
  let pose: CharPose = "stand";
  let facing: "left" | "right" | "front" = "front";
  if (k < WALK) {
    x = Math.round(s.from + (s.x - s.from) * (k / WALK));
    pose = `walk${Math.floor(k * 6) % 4}` as CharPose;
    facing = s.x > s.from ? "right" : "left";
  } else if (k > PLAY + 1.5) {
    const u = (k - PLAY - 1.5) / (BUSK - PLAY - 1.5);
    x = Math.round(s.x + (s.from - s.x) * u);
    pose = `walk${Math.floor(k * 6) % 4}` as CharPose;
    facing = s.from > s.x ? "right" : "left";
  } else if (k > PLAY) pose = "raise";
  const spr = charSprite({ look: BUSKER, facing, pose, expr: k > WALK && k < PLAY ? "happy" : "open" });
  ctx.drawImage(spr, x - ANCHOR_X, s.y - ANCHOR_Y);
  if (k < WALK || k > PLAY) return;
  const stretch = 2 + Math.round((Math.sin((k - WALK) * 3.4) + 1) * 2.5);
  const acc = accordionSprite(stretch);
  ctx.drawImage(acc, x - Math.round(acc.width / 2), s.y - 16);
  // Notes drifting up and away.
  for (let i = 0; i < 3; i++) {
    const u = (k * 0.5 + i / 3) % 1;
    const nx = Math.round(x + s.dir * (4 + u * 14) + Math.sin(u * 6 + i) * 2);
    const ny = Math.round(s.y - 30 - u * 22);
    const c = ["#f4dc8a", "#f2a7b8", "#9fd0e6"][i]!;
    fill(ctx, nx, ny, 2, 2, c);
    fill(ctx, nx + 1, ny - 4, 1, 4, c);
  }
  // Coins tossed in from the terrace side.
  for (const at of [6.2, 10.6, 15]) {
    const u = (k - at) / 0.8;
    if (u < 0 || u > 1) continue;
    const cx = Math.round(s.case.x + 6 - s.dir * (40 * (1 - u)));
    const cy = Math.round(s.case.y + 2 - Math.sin(u * Math.PI) * 18);
    fill(ctx, cx, cy, 2, 2, Math.floor(t * 12) % 2 ? C.brassHi : C.brass);
  }
}

export function eggOverlay(ctx: Ctx, _L: Layout, info: PaintInfo): void {
  if (raised.t !== info.t || raised.at.length === 0) return;
  // Up over their heads, the "no signal" sign blinking over every other one.
  for (const [i, p] of raised.at.entries()) {
    ctx.drawImage(laptopUp(p.back), p.x - 6, p.y - 35);
    if ((i + Math.floor(info.t * 2)) % 2 === 0) ctx.drawImage(noSignal(), p.x - 4, p.y - 45);
  }
}

// ------------------------------------------------------------------ sounds

export const EGG_SOUNDS: Record<string, SoundRecipe> = {
  // Wings flapping in, a coo, wings off again.
  "cafe-heist": (k) => {
    for (const s of [0, 0.25, 0.5, 3.2, 3.4, 3.6, 3.8]) k.noise(s, 0.12, 0.04, 2200);
    k.tone(520, 2.0, 0.25, "sine", 0.03, 440);
    k.tone(500, 2.4, 0.3, "sine", 0.03, 420);
  },
  // A plug pulled (a pop and a falling bleep), then the router's chime when it's back.
  "cafe-unplug": (k) => {
    k.noise(0, 0.05, 0.06, 3000);
    k.tone(880, 0.05, 0.14, "square", 0.025, 440);
    k.tone(440, 0.22, 0.3, "square", 0.02, 220);
    k.tone(660, WIFI - 2.4, 0.1, "sine", 0.04);
    k.tone(990, WIFI - 2.25, 0.2, "sine", 0.04);
  },
  // A little waltz on the accordion: oom-pah-pah under a lilting tune, and three coins.
  "cafe-accordion": (k) => {
    const tune = [659, 698, 784, 880, 784, 698, 659, 587, 523, 587, 659, 523, 587, 659, 698, 659, 587, 523];
    const bass = [131, 147, 175, 131, 147, 196];
    const beat = 0.42;
    for (let bar = 0; bar < 12; bar++) {
      const s = 2.6 + bar * beat * 3;
      const b = bass[bar % bass.length]!;
      k.tone(b, s, beat * 0.8, "triangle", 0.035);
      k.tone(b * 2.5, s + beat, beat * 0.5, "square", 0.012);
      k.tone(b * 2.5, s + beat * 2, beat * 0.5, "square", 0.012);
      const m = tune[bar % tune.length]!;
      k.tone(m, s, beat * 2, "sawtooth", 0.014);
      k.tone(m * 1.004, s, beat * 2, "square", 0.01);
      k.tone(tune[(bar + 3) % tune.length]!, s + beat * 2, beat, "sawtooth", 0.012);
    }
    for (const c of [7, 11.4, 15.8]) {
      k.tone(2600, c, 0.07, "triangle", 0.03);
      k.tone(3100, c + 0.08, 0.1, "triangle", 0.025);
    }
  },
};
