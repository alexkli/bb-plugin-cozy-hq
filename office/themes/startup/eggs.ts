// Startup House: hidden Easter eggs (not outlined when Alt is held).
//
// - The mailbox out front: a letter! Everyone's sure it's the term sheet. It's
//   a two-for-one pizza coupon (they'll take it).
// - The trash cans by the side gate: a raccoon pops out of the lid with the
//   last slice of pizza, looks around and makes off up the side yard.
// - The gong in the garage: bang it and the whole house cheers "SHIPPED!"
//   (to staging, it turns out); confetti all over the concrete.
//
// Each also happens on its own about once every hour or two (the raccoon at
// night, the 3 am ship more likely at night too). Drawn from decor by the clock.
import type { Layout, Rect } from "../../layout.ts";
import type { Drawable, Light, PaintInfo, SceneryActions, SceneryClickable, SoundRecipe } from "../../theme.ts";
import { cached, floorPlan } from "../../themekit.ts";
import { chorus, ease, pick, rarely } from "../eggs.ts";
import { C, OUTLINE, STICKERS, fill, sprite, text } from "./kit.ts";
import { acrossFloorOf, planOf } from "./plan.ts";

type Ctx = CanvasRenderingContext2D;

const MAIL = 14;
const COON = 12;
const GONG = 12;

let forL: Layout | null = null;
let mail: { t0: number } | null = null;
let coon: { t0: number } | null = null;
let gong: { t0: number } | null = null;
let lastEgg = -1e9;

function bind(L: Layout): void {
  if (L === forL) return;
  forL = L;
  mail = coon = gong = null;
}

// ------------------------------------------------------------------ where (as the house draws them)

/** The mailbox on its post where the driveway meets the street (house.ts draws it). */
function mailboxOf(L: Layout): Rect | null {
  const plan = planOf(L);
  const g = plan?.garage?.door;
  // No front yard (a short panel): no street, no mailbox.
  if (!plan || !g || plan.lot.front < 18) return null;
  const dw = Math.min(30, plan.lot.x0 - 14);
  if (dw < 14) return null;
  const mx = Math.max(2, plan.lot.x0 - dw - 1 - 8);
  return { x: mx - 1, y: plan.lot.front - 17, w: 8, h: 12 };
}

/** The trash and recycling cans by the side gate (house.ts draws them). */
function cansOf(L: Layout): Rect | null {
  const plan = planOf(L);
  if (!plan || L.W - plan.lot.x1 < 18) return null;
  const bottom = plan.patio ? plan.patio.y : L.H;
  return { x: plan.lot.x1 + 6, y: bottom - 22, w: 17, h: 12 };
}

/** Where the gong stands in the garage: a clear bit of its floor (needs sprites, so a browser). */
function gongOf(L: Layout): Rect | null {
  const gr = planOf(L)?.garage?.r;
  if (!gr || typeof document === "undefined") return null;
  return cached(`startup|egg-gong-at|${L.W}x${L.H}|${L.props.length}|${L.spots.length}`, () => {
    const lanes = acrossFloorOf(L);
    const c = floorPlan(L).find(14, 18, 10, gr).filter((r) => !lanes.some((t) => r.x < t.x + t.w && t.x < r.x + r.w && r.y < t.y + t.h && t.y < r.y + r.h));
    return c[c.length - 1] ?? null;
  });
}

export function eggClickables(L: Layout): SceneryClickable[] {
  bind(L);
  const out: SceneryClickable[] = [];
  const m = mailboxOf(L);
  if (m) out.push({ id: "egg-mail", rect: m, hover: "Our mailbox. The flag's up.", secret: true });
  const c = cansOf(L);
  if (c) out.push({ id: "egg-cans", rect: { x: c.x - 1, y: c.y - 2, w: c.w + 2, h: c.h + 3 }, hover: "The trash cans. One of them is rattling.", secret: true });
  const g = gongOf(L);
  if (g) out.push({ id: "egg-gong", rect: g, hover: "A dusty gong. For when we ship.", secret: true });
  return out;
}

export function eggClick(id: string, act: SceneryActions): string | null {
  bind(act.L);
  if (id === "egg-mail") return letter(act);
  if (id === "egg-cans") return raccoon(act);
  if (id === "egg-gong") return ship(act);
  return null;
}

export function eggTick(act: SceneryActions): void {
  bind(act.L);
  if (mail || coon || gong || !rarely(act.t, lastEgg)) return;
  const night = act.night > 0.5;
  const options: (() => string | null)[] = [() => letter(act)];
  if (night) options.push(() => raccoon(act), () => raccoon(act), () => ship(act));
  else options.push(() => ship(act));
  const sound = pick(options)();
  if (sound) act.play(sound);
}

function letter(act: SceneryActions): string | null {
  const m = mailboxOf(act.L);
  if (!m || mail) return null;
  mail = { t0: act.t };
  lastEgg = act.t;
  chorus(act, m.x + 40, m.y + 80, [
    [1, pick(["MAIL! Real mail!", "The flag's up! Who sends letters?"])],
    [2.6, pick(["It's the term sheet. I can feel it.", "It's from a VC! It has to be."]), 1],
    [4.4, "We're going to be a unicorn!", 2],
    [7.2, "It's… a coupon. Two-for-one pizza.", "boss"],
    [9.4, pick(["We'll take it.", "Honestly? Still a win.", "Runway extended."])],
  ], 320);
  return "egg-mail";
}

function raccoon(act: SceneryActions): string | null {
  const c = cansOf(act.L);
  if (!c || coon) return null;
  coon = { t0: act.t };
  lastEgg = act.t;
  chorus(act, c.x, c.y - 30, [
    [2.2, pick(["Was that a raccoon?!", "Something's in the trash again."])],
    [4.6, pick(["He took the last slice!", "That was MY slice."]), 1],
    [7, "Honestly, he's here more than the cofounders.", "boss"],
  ], 260);
  return "egg-rattle";
}

function ship(act: SceneryActions): string | null {
  const g = gongOf(act.L);
  if (!g || gong) return null;
  gong = { t0: act.t };
  lastEgg = act.t;
  const near = act.near(g.x + 7, g.y + 9, 1000);
  near.slice(0, 6).forEach((p, i) => act.say(p.id, pick(["SHIPPED!", "WE SHIPPED!", "Ship it!", "Nobody touch anything!", "It's live!"]), 2.2, 0.4 + i * 0.25));
  chorus(act, g.x + 7, g.y + 9, [
    [4.4, "…to staging.", 0],
    [6.6, pick(["Who's watching the error logs?", "Wait, which branch was that?"]), 1],
    [8.8, "Ring it again when it's in production.", "boss"],
  ], 1000);
  return "egg-gong";
}

// ------------------------------------------------------------------ drawing

export function eggDecor(ctx: Ctx, L: Layout, info: PaintInfo): Drawable[] {
  if (L !== forL) return [];
  const out: Drawable[] = [];
  const t = info.t;
  const g = gongOf(L);
  if (g) {
    const k = gong ? t - gong.t0 : -1;
    const swing = k >= 0 && k < 3 ? Math.round(Math.sin(k * 14) * 2 * (1 - k / 3)) : 0;
    out.push({ z: g.y + 17, draw: () => drawGong(ctx, g, swing) });
    if (gong) {
      if (k > GONG) gong = null;
      else if (k < 6) out.push({ z: g.y + 60, draw: () => confetti(ctx, g, k) });
    }
  }
  const m = mailboxOf(L);
  if (m && mail) {
    const k = t - mail.t0;
    if (k > MAIL) mail = null;
    else out.push({ z: m.y + 40, draw: () => drawLetter(ctx, m, k, t) });
  }
  const c = cansOf(L);
  if (c && coon) {
    const k = t - coon.t0;
    if (k > COON) coon = null;
    else out.push({ z: c.y + 13 - (k > 2.4 ? 0 : 0.1), draw: () => drawRaccoon(ctx, c, k, t) });
  }
  return out;
}

export function eggLights(L: Layout, info: PaintInfo): Light[] {
  if (L !== forL || !gong) return [];
  const g = gongOf(L);
  const k = info.t - gong.t0;
  return g && k < 3 ? [[g.x + 7, g.y + 8, 30, 0.8 * (1 - k / 3), "#ffd84a", 0.35]] : [];
}

/** The gong on its stand, swinging when it's been hit (rings spreading off it). */
function drawGong(ctx: Ctx, g: Rect, swing: number): void {
  ctx.drawImage(gongStand(), g.x, g.y);
  ctx.drawImage(gongDisc(), g.x + 2 + swing, g.y + 3);
}

function confetti(ctx: Ctx, g: Rect, k: number): void {
  if (k < 2) {
    // Rings of sound off the gong.
    ctx.fillStyle = `rgba(255,230,140,${(0.7 * (1 - k / 2)).toFixed(2)})`;
    for (let ring = 0; ring < 2; ring++) {
      const r = Math.round(6 + (k + ring * 0.4) * 14);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        ctx.fillRect(Math.round(g.x + 7 + Math.cos(a) * r), Math.round(g.y + 8 + Math.sin(a) * r * 0.6), 1, 1);
      }
    }
  }
  // Confetti up and drifting down over the garage.
  for (let i = 0; i < 40; i++) {
    const a = (i * 2.399) % (Math.PI * 2);
    const v = 20 + ((i * 37) % 30);
    const x = g.x + 7 + Math.cos(a) * v * Math.min(1, k) * 1.6 + Math.sin(k * 3 + i) * 2;
    const y = g.y + 4 - Math.abs(Math.sin(a)) * v * Math.min(1, k) + Math.max(0, k - 0.6) * 14;
    if (k > 5 && i % 3 === 0) continue;
    fill(ctx, Math.round(x), Math.round(y), (i + Math.floor(k * 8)) % 3 ? 2 : 1, 1, STICKERS[i % STICKERS.length]!);
  }
}

/** The letter: out of the mailbox, up, open: a pizza coupon. */
function drawLetter(ctx: Ctx, m: Rect, k: number, t: number): void {
  const up = ease(k / 1.2);
  const x = m.x + 1;
  const y = Math.round(m.y - 2 - up * 10 + Math.sin(t * 3) * (k < 6.5 ? 1 : 0));
  if (k < 6.6) {
    ctx.drawImage(envelope(), x - 4, y);
    // It sparkles: surely, the term sheet.
    if (k > 1 && k < 6.5 && Math.floor(t * 6) % 2) {
      fill(ctx, x - 6, y - 2, 1, 1, "#fff3a0");
      fill(ctx, x + 9, y + 1, 1, 1, "#fff3a0");
      fill(ctx, x + 3, y - 4, 1, 1, "#ffffff");
    }
  } else {
    const fade = Math.min(1, (MAIL - k) / 1.5);
    ctx.globalAlpha = fade;
    // Held up beside the mailbox, over the lawn (clear of the panel's edges).
    ctx.drawImage(coupon(), x + 8, Math.max(1, y));
    ctx.globalAlpha = 1;
  }
}

/** The raccoon: up out of the can (the lid tipping), a look round, then off up the side yard with the slice. */
function drawRaccoon(ctx: Ctx, c: Rect, k: number, t: number): void {
  const lid = k > 0.4 && k < 4.6 ? -3 : 0;
  // The lid of the first can, tipped up.
  fill(ctx, c.x - 1, c.y - 1 + lid, 9, 2, OUTLINE);
  fill(ctx, c.x, c.y - 1 + lid, 7, 1, "#5a6a5a");
  if (k < 0.4) {
    // Rattling first.
    fill(ctx, c.x + 1 + (Math.floor(t * 30) % 2), c.y - 3, 1, 1, "#e8e4da");
    return;
  }
  const blink = Math.floor(t * 2) % 5 === 0;
  if (k < 3.6) {
    // Peeking up out of the can, looking left, then right.
    const rise = Math.round(ease((k - 0.4) / 0.6) * 7);
    const look = k > 1.6 && k < 2.6 ? -1 : k >= 2.6 ? 1 : 0;
    ctx.save();
    ctx.beginPath();
    ctx.rect(c.x - 4, c.y - 20, 18, 20);
    ctx.clip();
    ctx.drawImage(coonHead(blink), c.x - 1 + look, c.y - rise);
    ctx.restore();
    if (k > 1) ctx.drawImage(slice(), c.x + 6 + look, c.y - rise + 3);
    return;
  }
  // Off up the side yard, the slice in its mouth, fading out by the hedge.
  const q = (k - 3.6) / (COON - 3.6);
  const x = c.x + 2 + Math.sin(q * 9) * 2;
  const y = c.y - 4 - q * 150;
  ctx.globalAlpha = Math.min(1, (1 - q) * 4);
  ctx.drawImage(coonRun(Math.floor(t * 10) % 2), Math.round(x), Math.round(y));
  ctx.drawImage(slice(), Math.round(x + 2), Math.round(y - 4));
  ctx.globalAlpha = 1;
}

// ------------------------------------------------------------------ sprites

const gongStand = () =>
  sprite("egg-gong-stand", 14, 18, (g) => {
    g.rect(0, 0, 14, 2, C.fenceLo).vline(0, 0, 18, C.fenceLo).vline(13, 0, 18, C.fenceLo);
    g.rect(0, 16, 3, 2, C.fence).rect(11, 16, 3, 2, C.fence);
    g.set(5, 2, "#3a3a44").set(8, 2, "#3a3a44");
  });

const gongDisc = () =>
  sprite("egg-gong-disc", 10, 10, (g) => {
    g.ellipse(5, 5, 4, 4, "#d8a42a").ellipse(5, 5, 2, 2, "#f2c43a").set(4, 4, "#fff3a0").set(3, 2, "#f2c43a");
  });

const envelope = () =>
  sprite("egg-envelope", 10, 7, (g) => {
    g.rect(0, 0, 10, 7, "#f4f2ea").line(0, 0, 5, 4, "#c8c4bc").line(9, 0, 5, 4, "#c8c4bc").rect(7, 1, 2, 2, "#e5544b");
  });

const coupon = () =>
  sprite("egg-coupon", 40, 13, (g) => {
    g.rect(0, 0, 40, 13, "#fff3c8").rect(0, 0, 40, 1, "#e5544b").rect(0, 12, 40, 1, "#e5544b");
    for (let x = 1; x < 39; x += 2) g.set(x, 11, "#e8d8a8");
    // A slice, and 2 FOR 1.
    for (let y = 3; y < 10; y++) g.rect(2 + Math.floor((y - 3) / 2), y, 7 - (y - 3), 1, "#f2c14e");
    g.rect(2, 3, 7, 1, "#d8903a").set(4, 5, "#d8483a").set(6, 4, "#d8483a").set(5, 7, "#d8483a");
    text(g, "2 FOR 1", 11, 4, "#c4342a");
  });

const coonHead = (blink: boolean) =>
  sprite(`egg-coon-head-${blink}`, 10, 9, (g) => {
    g.rect(1, 2, 8, 7, "#8a8a92").set(1, 1, "#8a8a92").set(8, 1, "#8a8a92").set(1, 0, "#5a5a62").set(8, 0, "#5a5a62");
    // The mask, the eyes, the nose.
    g.rect(1, 4, 8, 2, "#2e2c36").rect(4, 2, 2, 2, "#f4f2ea");
    if (!blink) g.set(3, 4, "#f4f2ea").set(6, 4, "#f4f2ea");
    g.rect(3, 7, 4, 2, "#d8d4cc").set(4, 7, "#2e2c36");
  });

const coonRun = (step: number) =>
  sprite(`egg-coon-run-${step}`, 9, 14, (g) => {
    // From above, running up: ears, the masked face, the body, a ringed tail.
    g.set(1, 0, "#5a5a62").set(5, 0, "#5a5a62");
    g.rect(1, 1, 5, 4, "#8a8a92").rect(1, 2, 5, 1, "#2e2c36");
    g.rect(1, 5, 5, 5, "#7a7a82").rect(2, 6, 3, 3, "#8a8a92");
    g.set(step ? 0 : 6, 6, "#5a5a62").set(step ? 6 : 0, 9, "#5a5a62");
    g.rect(3, 10, 1, 4, "#8a8a92").set(3, 11, "#2e2c36").set(3, 13, "#2e2c36");
  });

const slice = () =>
  sprite("egg-slice", 5, 5, (g) => {
    g.rect(0, 0, 5, 1, "#d8903a").rect(0, 1, 4, 1, "#f2c14e").rect(1, 2, 3, 1, "#f2c14e").rect(1, 3, 2, 1, "#f2c14e").set(2, 4, "#f2c14e").set(2, 1, "#d8483a");
  });

// ------------------------------------------------------------------ sounds

export const EGG_SOUNDS: Record<string, SoundRecipe> = {
  "egg-mail"(k) {
    // The mailbox door creaking, then a hopeful little fanfare.
    k.tone(420, 0, 0.25, "sawtooth", 0.02, 260);
    for (const [i, f] of [523, 659, 784].entries()) k.tone(f, 0.5 + i * 0.12, 0.18, "triangle", 0.05);
  },
  "egg-rattle"(k) {
    for (let i = 0; i < 7; i++) k.noise(i * 0.06, 0.04, 0.08, 2600 + Math.random() * 1500);
    k.tone(900, 0.5, 0.08, "square", 0.02, 1400);
  },
  "egg-gong"(k) {
    // A big brassy gong, ringing out.
    k.tone(110, 0, 3.2, "sine", 0.18, 104);
    k.tone(167, 0, 2.6, "sine", 0.08, 160);
    k.tone(253, 0, 2, "triangle", 0.05, 248);
    k.noise(0, 0.12, 0.14, 1200);
  },
};
