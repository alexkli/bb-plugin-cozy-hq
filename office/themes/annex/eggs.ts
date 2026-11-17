// Dusty Annex: hidden Easter eggs (not outlined when Alt is held).
//
// - The box marked DO NOT OPEN, tucked away on the floor: open it and out
//   come a cloud of dust, a flutter of moths and one yellowed memo, which
//   says… please do not open this box.
// - The staff photo from 1987 on the back wall: one of the faces in it is
//   still smiling at you. Tap it and the clerk who never clocked out drifts
//   out of the wall, wanders the corridor with an armful of forms (still on
//   lunch break) and fades through the far wall. Nobody else saw a thing.
// - The side of the snack machine: give it a kick and it finally drops
//   everything it's been holding since the nineties.
//
// Each also happens on its own about once every hour or two (the clerk only
// after dark). Drawn from decor and overlay by the clock.
import type { Layout, Rect } from "../../layout.ts";
import type { Drawable, Light, PaintInfo, SceneryActions, SceneryClickable, SoundRecipe } from "../../theme.ts";
import { ctx2d } from "../../pixel.ts";
import { cached, drawPixelText, floorPlan, Grid, OUTLINE, pixelTextWidth } from "../../themekit.ts";
import { bareWall, chorus, ease, pick, rarely } from "../eggs.ts";
import { P } from "./pal.ts";
import { siteOf } from "./plan.ts";

type Ctx = CanvasRenderingContext2D;

const sprite = (key: string, w: number, h: number, draw: (g: Grid) => void, outline = true): HTMLCanvasElement =>
  cached(`annex-egg|${key}`, () => {
    const g = new Grid(w, h);
    draw(g);
    if (outline) g.outline(OUTLINE);
    return g.toCanvas();
  });

const BOX = 16;
const GHOST = 22;
const SNACKS = 22;

let forL: Layout | null = null;
let box: { t0: number } | null = null;
let ghost: { t0: number } | null = null;
let snacks: { t0: number } | null = null;
let lastEgg = -1e9;

function bind(L: Layout): void {
  if (L === forL) return;
  forL = L;
  box = ghost = snacks = null;
}

// ------------------------------------------------------------------ where

/** The DO NOT OPEN box: a clear bit of floor, in a room of its own if possible (needs sprites, so a browser). */
function boxOf(L: Layout): Rect | null {
  if (typeof document === "undefined") return null;
  return cached(`annex-egg|box-at|${L.W}x${L.H}|${L.props.length}|${L.spots.length}`, () => {
    // Inside the building (the panel's edges can be the street or the brick outside).
    const s = siteOf(L);
    const c = floorPlan(L).find(14, 13, 16, { x: s.x + 12, y: 0, w: s.w - 24, h: s.h - 12 });
    return c[Math.floor(c.length * 0.7)] ?? null;
  });
}

/** The staff photo on the back wall, near the door. */
function photoOf(L: Layout): Rect | null {
  return cached(`annex-egg|photo-at|${L.W}x${L.H}|${L.wall.door.x}`, () => bareWall(L, 16, 12, 14, L.wall.door.x));
}

/** The snack machine and the bit of its side you kick. */
function machineOf(L: Layout): { v: Rect; side: Rect } | null {
  const p = L.props.find((q) => q.kind === "vending");
  if (!p) return null;
  const v = { x: p.x, y: p.y, w: 24, h: 44 };
  return { v, side: { x: v.x + 23, y: v.y + 10, w: 4, h: 30 } };
}

/** The corridor the clerk wanders: the first hallway under the back wall. */
function corridorY(L: Layout): number {
  const top = Math.max(...L.segments.map((s) => s.depth));
  return L.net.halls.find((y) => y > top) ?? L.net.halls[0] ?? L.H / 2;
}

export function eggClickables(L: Layout): SceneryClickable[] {
  bind(L);
  const out: SceneryClickable[] = [];
  const b = boxOf(L);
  if (b) out.push({ id: "egg-box", rect: b, hover: "A taped-up box: DO NOT OPEN", secret: true });
  const ph = photoOf(L);
  if (ph) out.push({ id: "egg-photo", rect: ph, hover: "Staff photo, 1987. One of them is still smiling at you.", secret: true });
  const m = machineOf(L);
  if (m) out.push({ id: "egg-kick", rect: m.side, hover: "The side of the snack machine. It's dented at kicking height.", secret: true });
  return out;
}

export function eggClick(id: string, act: SceneryActions): string | null {
  bind(act.L);
  if (id === "egg-box") return openBox(act);
  if (id === "egg-photo") return haunt(act);
  if (id === "egg-kick") return kick(act);
  return null;
}

export function eggTick(act: SceneryActions): void {
  bind(act.L);
  if (box || ghost || snacks || !rarely(act.t, lastEgg)) return;
  const options: (() => string | null)[] = [() => openBox(act), () => kick(act)];
  if (act.night > 0.5) options.push(() => haunt(act), () => haunt(act));
  const sound = pick(options)();
  if (sound) act.play(sound);
}

function openBox(act: SceneryActions): string | null {
  const b = boxOf(act.L);
  if (!b || box) return null;
  box = { t0: act.t };
  lastEgg = act.t;
  chorus(act, b.x + 7, b.y + 6, [
    [0.6, pick(["Who opened the box?!", "It said DO NOT OPEN!"])],
    [2.2, "*cough* *cough*", 1],
    [5.4, "There's a memo. \"Please do not open this box.\"", 0],
    [8.8, pick(["Dated 1987. Signed by nobody.", "It's been initialled by six managers."]), 1],
    [11.6, "Tape it back up. Nobody saw anything.", "boss"],
  ], 220);
  return "egg-dust";
}

function haunt(act: SceneryActions): string | null {
  const ph = photoOf(act.L);
  if (!ph || ghost) return null;
  ghost = { t0: act.t };
  lastEgg = act.t;
  act.say("boss", "Did that photo just… blink?", 2.6, 0.8);
  // Whoever's along the corridor when the clerk drifts by.
  const y = corridorY(act.L);
  const x = ph.x + ph.w / 2;
  const by = act.near(x + 120, y, 260)[0];
  if (by) act.say(by.id, pick(["Did it just get cold in here?", "Who's humming?"]), 2.6, 9);
  act.say("boss", pick(["Did anyone else see that?", "…Was that Doris from Accounts?"]), 2.8, GHOST - 2.5);
  const n = act.near(x, y, 400)[1];
  if (n) act.say(n.id, "See what?", 2.2, GHOST - 0.5);
  return "egg-ghost";
}

function kick(act: SceneryActions): string | null {
  const m = machineOf(act.L);
  if (!m || snacks) return null;
  snacks = { t0: act.t };
  lastEgg = act.t;
  chorus(act, m.v.x + 12, m.v.y + 40, [
    [0.3, pick(["Don't kick it, it bites back!", "Oof. Right in the coin slot."])],
    [2.6, "It's raining snacks!", 1],
    [5.6, pick(["\"Best before 1998.\"", "These crisps are older than me."]), 0],
    [8.4, "…Still crunchy.", 1],
  ], 200);
  return "egg-kick";
}

// ------------------------------------------------------------------ drawing

export function eggDecor(ctx: Ctx, L: Layout, info: PaintInfo): Drawable[] {
  if (L !== forL) return [];
  const out: Drawable[] = [];
  const t = info.t;
  const ph = photoOf(L);
  if (ph) {
    // The photo itself, on the wall: four faded faces, one of them glowing faintly when it's looking at you.
    const look = ghost && t - ghost.t0 < 3;
    out.push({ z: ph.y + ph.h, draw: () => ctx.drawImage(photo(ghost !== null && !look ? "gone" : look ? "look" : "all"), ph.x, ph.y) });
  }
  const b = boxOf(L);
  if (b) {
    const k = box ? t - box.t0 : -1;
    const shake = k >= 0 && k < 0.5 ? Math.round(Math.sin(k * 50)) : 0;
    out.push({ z: b.y + 12, draw: () => ctx.drawImage(boxSprite(k >= 0.4 && k < BOX - 2), b.x + shake, b.y) });
    if (box && k > BOX) box = null;
  }
  const m = machineOf(L);
  if (m && snacks) {
    const k = t - snacks.t0;
    if (k > SNACKS) snacks = null;
    else {
      // Bags and bars tumble out of the flap and pile up on the floor in front of it.
      for (let i = 0; i < 9; i++) {
        const k0 = k - 1 - i * 0.22;
        if (k0 < 0) continue;
        const q = Math.min(1, k0 / 0.5);
        const lx = m.v.x + 2 + ((i * 7) % 20);
        const ly = m.v.y + 46 + ((i * 3) % 6);
        const x = m.v.x + 18 + (lx - m.v.x - 18) * q;
        const y = m.v.y + 30 + (ly - m.v.y - 30) * q - Math.sin(q * Math.PI) * 6;
        const s = snack(i % 4);
        out.push({ z: ly + 2, draw: () => ctx.drawImage(s, Math.round(x), Math.round(y)) });
      }
    }
  }
  if (ph && ghost) {
    const k = t - ghost.t0;
    if (k > GHOST) ghost = null;
    else out.push({ z: corridorY(L) + 1, draw: () => drawClerk(ctx, L, ph, k, t) });
  }
  return out;
}

/** Above everything: the dust and the moths out of the box, the snack machine's rattle. */
export function eggOverlay(ctx: Ctx, L: Layout, info: PaintInfo): void {
  if (L !== forL) return;
  const t = info.t;
  const b = boxOf(L);
  if (b && box) {
    const k = t - box.t0;
    if (k < 3) {
      // A puff of dust, rolling out and settling.
      for (let i = 0; i < 26; i++) {
        const a = i * 2.4;
        const d = 3 + ease(k / 1.6) * (10 + (i % 5) * 4);
        ctx.fillStyle = `rgba(200,188,150,${(0.55 * (1 - k / 3)).toFixed(2)})`;
        ctx.fillRect(Math.round(b.x + 7 + Math.cos(a) * d), Math.round(b.y + 4 + Math.sin(a) * d * 0.5 - k * 3), 2, 2);
      }
    }
    if (k > 0.6 && k < 11) {
      // Moths fluttering up and away.
      for (let i = 0; i < 6; i++) {
        const q = (k - 0.6) / 10.4;
        const x = b.x + 7 + Math.sin(t * (3 + i) + i) * (6 + q * 30) + (i - 2.5) * q * 30;
        const y = b.y - q * (60 + i * 12) + Math.sin(t * 7 + i) * 2;
        const flap = Math.floor(t * 12 + i) % 2;
        ctx.fillStyle = "#d8ccaa";
        ctx.fillRect(Math.round(x) - (flap ? 1 : 0), Math.round(y), flap ? 3 : 1, 1);
        ctx.fillRect(Math.round(x), Math.round(y) + 1, 1, 1);
      }
    }
    if (k > 3.4 && k < 12) {
      // The memo, floating up out of the box and hanging there to be read.
      const up = ease((k - 3.4) / 1.2);
      ctx.globalAlpha = Math.min(1, (12 - k) / 1);
      ctx.drawImage(memo(), b.x, Math.round(b.y - 4 - up * 12 + Math.sin(t * 2)));
      ctx.globalAlpha = 1;
    }
  }
}

export function eggLights(L: Layout, info: PaintInfo): Light[] {
  if (L !== forL || !ghost) return [];
  const p = clerkAt(L, photoOf(L)!, info.t - ghost.t0);
  return p ? [[p.x, p.y - 8, 26, 0.5 * p.a, "#cfe6ff", 0.3]] : [];
}

/** Where the clerk is: out of the photo, down to the corridor, along it, through the far wall (and how solid). */
function clerkAt(L: Layout, ph: Rect, k: number): { x: number; y: number; a: number; face: 1 | -1 } | null {
  if (k < 2.5 || k > GHOST - 1) return null;
  const y0 = ph.y + ph.h + 18;
  const yc = corridorY(L) + 4;
  const x0 = ph.x + ph.w / 2;
  const far = x0 < L.W / 2 ? L.W + 10 : -10;
  const face = far > x0 ? 1 : -1;
  const a = Math.min(1, (k - 2.5) / 1.5, (GHOST - 1 - k) / 1.5);
  if (k < 6) return { x: x0, y: y0 + (yc - y0) * ease((k - 2.5) / 3.5), a, face };
  return { x: x0 + (far - x0) * ((k - 6) / (GHOST - 7)), y: yc, a, face };
}

function drawClerk(ctx: Ctx, L: Layout, ph: Rect, k: number, t: number): void {
  const p = clerkAt(L, ph, k);
  if (!p) return;
  ctx.globalAlpha = (0.7 + 0.1 * Math.sin(t * 5)) * p.a;
  const bob = Math.round(Math.sin(t * 2.2) * 1.5);
  const s = clerk(p.face);
  ctx.drawImage(s, Math.round(p.x - 6), Math.round(p.y - 22 + bob));
  ctx.globalAlpha = 1;
  // "Still on my lunch break!" floats over them halfway along.
  if (k > 9 && k < 12.5) {
    ctx.globalAlpha = Math.min(1, (k - 9) * 2, (12.5 - k) * 2) * 0.85;
    const n = lunchNote();
    ctx.drawImage(n, Math.round(p.x - n.width / 2), Math.round(p.y - 34 + bob));
    ctx.globalAlpha = 1;
  }
}

// ------------------------------------------------------------------ sprites

const boxSprite = (open: boolean) =>
  sprite(`box-${open}`, 14, 13, (g) => {
    g.rect(0, 3, 14, 10, P.card).rect(0, 3, 14, 2, P.cardHi).hline(0, 8, 14, P.cardLo);
    // Red stencil (DO NOT OPEN, as best it fits) and a lot of tape.
    g.hline(2, 6, 3, P.red).hline(6, 6, 3, P.red).hline(10, 6, 2, P.red).hline(3, 10, 8, P.red);
    if (open) g.rect(0, 0, 3, 4, P.cardHi).rect(11, 0, 3, 4, P.cardHi);
    else g.rect(0, 1, 14, 2, P.cardLo).rect(6, 1, 2, 12, P.tape);
  });

const memo = () =>
  sprite("memo", 14, 11, (g) => {
    g.rect(0, 0, 14, 11, P.paperOld).rect(0, 0, 14, 1, P.paper);
    for (let y = 3; y < 9; y += 2) g.hline(2, y, y === 7 ? 6 : 10, P.paperLine);
    g.set(11, 8, P.red).set(12, 8, P.red);
  });

const photo = (state: "all" | "look" | "gone") =>
  sprite(`photo-${state}`, 16, 12, (g) => {
    g.rect(0, 0, 16, 12, P.woodLo).rect(1, 1, 14, 10, "#b8a888");
    // Four faded faces in a row; the clerk's (the third) looks at you, or is missing.
    for (let i = 0; i < 4; i++) {
      const x = 2 + i * 3;
      if (i === 2 && state === "gone") continue;
      g.rect(x, 4, 2, 2, i === 2 && state === "look" ? "#e8f2ff" : "#c8a888").rect(x, 6, 2, 4, i % 2 ? P.blue : P.olive);
    }
    if (state === "look") g.set(8, 4, OUTLINE).set(9, 4, OUTLINE);
    g.hline(1, 10, 14, P.paperLine);
  });

const clerk = (face: 1 | -1) =>
  sprite(`clerk-${face}`, 12, 22, (g) => {
    // A pale see-through clerk: cardigan, tie, half-moon glasses, an armful of forms.
    g.rect(3, 0, 6, 2, "#dfe9f6").rect(2, 2, 8, 6, "#eef4fb").set(face > 0 ? 7 : 4, 4, "#7a8aa4").set(face > 0 ? 8 : 3, 4, "#7a8aa4");
    g.rect(2, 8, 8, 9, "#cfdcf0").vline(6, 8, 6, "#a8bad6");
    g.rect(face > 0 ? 6 : 1, 10, 5, 4, "#f8f8ff").hline(face > 0 ? 6 : 1, 11, 5, "#c8d0e0");
    // No feet: it fades out at the hem.
    g.rect(3, 17, 6, 2, "#dfe9f6").set(3, 19, "#dfe9f6").set(6, 19, "#dfe9f6").set(8, 20, "#dfe9f6");
  }, false);

const NOTE = "STILL ON LUNCH!";
const lunchNote = () =>
  cached("annex-egg|lunch-note", () => {
    const w = pixelTextWidth(NOTE) + 6;
    const g = new Grid(w, 10);
    g.rrect(0, 0, w, 10, "#eef4fb", 2);
    g.outline("#9aaccc");
    const c = g.toCanvas();
    drawPixelText(ctx2d(c), NOTE, 3, 2, "#5a6a8a");
    return c;
  });

const snack = (i: number) =>
  sprite(`snack-${i}`, 6, 5, (g) => {
    const c = [P.red, P.must, P.green, P.blue][i]!;
    if (i % 2) g.rect(0, 1, 6, 3, c).set(1, 2, P.paper).set(4, 2, P.paper);
    else g.rect(1, 0, 4, 5, c).hline(1, 0, 4, shadeOf(c)).set(2, 2, P.paper);
  });

const shadeOf = (c: string) => (c === P.red ? P.redHi : c === P.green ? P.greenHi : c === P.blue ? P.blueHi : P.mustHi);

// ------------------------------------------------------------------ sounds

export const EGG_SOUNDS: Record<string, SoundRecipe> = {
  "egg-dust"(k) {
    // Old tape giving way, the flaps, a dusty whoomph.
    for (let i = 0; i < 5; i++) k.noise(i * 0.05, 0.04, 0.06, 3200);
    k.swell(0.3, 1.2, 0.12, 900, 300, 0.7);
  },
  "egg-ghost"(k) {
    // A faraway hum and a sigh.
    k.tone(220, 0, 2.4, "sine", 0.05, 233);
    k.tone(330, 0.4, 2, "sine", 0.03, 311);
    k.swell(1.2, 1.6, 0.05, 500, 1200, 2);
  },
  "egg-kick"(k) {
    // A hollow metal thump, then everything clattering down the chute.
    k.tone(90, 0, 0.3, "triangle", 0.2, 60);
    k.noise(0, 0.08, 0.18, 600);
    for (let i = 0; i < 9; i++) k.noise(1 + i * 0.22, 0.06, 0.08, 1800 + Math.random() * 1200);
  },
};
