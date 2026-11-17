// The classic office's hidden Easter eggs (not outlined when Alt is held):
//
// - The window washer: tap a window sill and a washer on a cradle comes down
//   outside the glass, soaps it, squeegees it clean, waves at whoever's
//   looking, gets a pigeon landing on his hard hat and goes back up.
// - The lost and found: a battered box tucked away on the floor. Open it and
//   the office's lost things come flying out (a single sock, a rubber duck, a
//   trophy, a humming tupperware…), and their owners have something to say.
//
// Both also happen on their own, about once every hour or two (the washer by
// day only). Clicks only start them; they're drawn from decor by the clock.
import type { Layout, Rect } from "../../layout.ts";
import type { Drawable, PaintInfo, SceneryActions, SceneryClickable, SoundRecipe } from "../../theme.ts";
import { cached, floorPlan, Grid, OUTLINE } from "../../themekit.ts";
import { chorus, ease, pick, rarely } from "../eggs.ts";

type Ctx = CanvasRenderingContext2D;

const sprite = (key: string, w: number, h: number, draw: (g: Grid) => void, outline = true): HTMLCanvasElement =>
  cached(`classic-egg|${key}`, () => {
    const g = new Grid(w, h);
    draw(g);
    if (outline) g.outline(OUTLINE);
    return g.toCanvas();
  });

// ------------------------------------------------------------------ what's going on

const WASH = 16;
const BURST = 26;

let forL: Layout | null = null;
let washer: { t0: number; win: number } | null = null;
let found: { t0: number; items: number[] } | null = null;
let lastEgg = -1e9;

function bind(L: Layout): void {
  if (L === forL) return;
  forL = L;
  washer = null;
  found = null;
}

/** Where the lost-and-found box sits: a clear bit of floor, near the lounge if there's room (needs sprites, so a browser). */
function boxAt(L: Layout): Rect | null {
  if (typeof document === "undefined") return null;
  return cached(`classic-egg|box|${L.W}x${L.H}|${L.props.length}|${L.spots.length}`, () => {
    const fp = floorPlan(L);
    const lo = L.lounge;
    const near = fp.find(16, 14, 12, { x: lo.x - 30, y: lo.y, w: lo.w + 60, h: lo.h + 30 });
    const any = near.length > 0 ? near : fp.find(16, 14, 12);
    return any[Math.floor(any.length / 2)] ?? null;
  });
}

const sill = (w: Rect): Rect => ({ x: w.x, y: w.y + w.h, w: w.w, h: 4 });

export function clickables(L: Layout): SceneryClickable[] {
  bind(L);
  const out: SceneryClickable[] = L.wall.windows.map((w, i) => ({ id: `egg-sill-${i}`, rect: sill(w), hover: "A window sill. Something squeaks outside.", secret: true }));
  const b = boxAt(L);
  if (b) out.push({ id: "egg-lost", rect: b, hover: "A battered box: LOST + FOUND", secret: true });
  return out;
}

export function click(id: string, act: SceneryActions): string | null {
  bind(act.L);
  if (id.startsWith("egg-sill-")) return startWasher(act, Number(id.slice(9)));
  if (id === "egg-lost") return openBox(act);
  return null;
}

/** Now and then, on its own. */
export function tick(act: SceneryActions): void {
  bind(act.L);
  if (washer || found || !rarely(act.t, lastEgg)) return;
  const day = act.hour > 8 && act.hour < 18 && act.L.wall.windows.length > 0;
  const sound = day && Math.random() < 0.5 ? startWasher(act, Math.floor(Math.random() * act.L.wall.windows.length)) : openBox(act);
  if (sound) act.play(sound);
}

function startWasher(act: SceneryActions, win: number): string | null {
  const w = act.L.wall.windows[win];
  if (!w || washer) return null;
  washer = { t0: act.t, win };
  lastEgg = act.t;
  const x = w.x + w.w / 2;
  chorus(act, x, w.y + w.h + 30, [
    [3, pick(["Is he… waving at me?", "Oh hey, the window guy!", "We're on the ninth floor!"])],
    [6.5, pick(["Wave back. Be polite.", "Give him a thumbs up."]), "boss"],
    [10.6, pick(["That pigeon has no respect.", "Did a pigeon just land on him?", "He didn't even flinch!"]), 1],
  ], 200);
  return "egg-squeak";
}

// The lost things: what comes out of the box, and what their owner says.
const ITEMS: { make: () => HTMLCanvasElement; line: string }[] = [
  { make: () => sockSprite(), line: "Just the one sock. Classic." },
  { make: () => duckSprite(), line: "My rubber duck! I debugged everything with him." },
  { make: () => trophySprite(), line: "\"World's okayest coder.\" …That's mine." },
  { make: () => tubSprite(), line: "Whose tupperware is this? It's humming." },
  { make: () => umbrellaSprite(), line: "So that's where all the umbrellas went." },
  { make: () => mugSprite(), line: "\"I survived the reorg.\" Twice, actually." },
  { make: () => skateSprite(), line: "Who roller-skates to the office?" },
];

function openBox(act: SceneryActions): string | null {
  const b = boxAt(act.L);
  if (!b || found) return null;
  const order = ITEMS.map((_, i) => i).sort(() => Math.random() - 0.5).slice(0, 4);
  found = { t0: act.t, items: order };
  lastEgg = act.t;
  chorus(act, b.x + 8, b.y + 8, [
    [0.8, pick(["The lost and found!", "Oh no. Who opened the box?"])],
    ...order.map((it, k) => [2.2 + k * 2.6, ITEMS[it]!.line, k] as const),
    [14, "Everyone, take your things home. Please.", "boss"],
  ], 220);
  return "egg-rummage";
}

// ------------------------------------------------------------------ drawing

export function decor(ctx: Ctx, L: Layout, info: PaintInfo): Drawable[] {
  if (L !== forL) return [];
  const out: Drawable[] = [];
  const t = info.t;
  const b = boxAt(L);
  if (b) {
    const k = found ? t - found.t0 : -1;
    // The box, its flaps open while things come out (and a rattle first).
    const shake = k >= 0 && k < 0.8 ? Math.round(Math.sin(k * 40)) : 0;
    out.push({ z: b.y + 13, draw: () => ctx.drawImage(boxSprite(k >= 0.6 && k < BURST - 2), b.x + shake, b.y) });
    if (found) {
      if (k > BURST) found = null;
      else {
        found.items.forEach((it, i) => {
          const k0 = k - 0.8 - i * 2.6;
          if (k0 < 0 || k > BURST - 1.5) return;
          // Up out of the box in an arc, then lying on the floor beside it.
          const q = Math.min(1, k0 / 0.7);
          const side = i % 2 ? 1 : -1;
          const land = { x: b.x + 4 + side * (14 + i * 5), y: b.y + 8 + (i % 2) * 6 };
          const x = b.x + 4 + (land.x - b.x - 4) * q;
          const y = b.y - 2 + (land.y - b.y + 2) * q - Math.sin(q * Math.PI) * 18;
          const s = ITEMS[it]!.make();
          out.push({ z: q < 1 ? b.y + 40 : land.y + s.height, draw: () => ctx.drawImage(s, Math.round(x), Math.round(y - s.height + 6)) });
        });
      }
    }
  }
  if (washer) {
    const w = L.wall.windows[washer.win];
    const k = t - washer.t0;
    if (!w || k > WASH) washer = null;
    else out.push({ z: w.y + w.h + 0.5, draw: () => drawWasher(ctx, w, k, t) });
  }
  return out;
}

/** The washer on his cradle outside the glass: down, soap, squeegee, wave, pigeon, up. */
function drawWasher(ctx: Ctx, w: Rect, k: number, t: number): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(w.x + 1, w.y + 1, w.w - 2, w.h - 2);
  ctx.clip();
  const down = ease(k / 2.5) * (1 - ease((k - 13) / 2.5));
  const py = Math.round(w.y - 16 + down * (w.h * 0.62 + 16));
  // The ropes and the cradle.
  ctx.fillStyle = "#3a3a44";
  ctx.fillRect(w.x + 3, w.y, 1, py - w.y + 14);
  ctx.fillRect(w.x + w.w - 4, w.y, 1, py - w.y + 14);
  ctx.fillStyle = "#8a8f9a";
  ctx.fillRect(w.x + 2, py + 13, w.w - 4, 2);
  ctx.fillStyle = "#5a5f6a";
  ctx.fillRect(w.x + 2, py + 15, w.w - 4, 1);
  // Soap on the glass, wiped away as the squeegee passes.
  const wiped = ease((k - 4) / 5);
  if (k > 2.6 && wiped < 1) {
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    const top = w.y + 3;
    const h = Math.round((w.h - 6) * (1 - wiped));
    for (let x = w.x + 3; x < w.x + w.w - 3; x += 2) ctx.fillRect(x, top + ((x * 7) % 5), 1, Math.max(0, h - ((x * 3) % 6)));
  }
  // The washer: hard hat, overalls, the squeegee going side to side (or a wave).
  const cx = Math.round(w.x + w.w / 2);
  const waving = k > 5.8 && k < 7.6;
  const scrub = k > 3 && k < 9.5 && !waving ? Math.round(Math.sin(k * 5) * 6) : 0;
  const hop = k > 10.8 && k < 11.4 ? -2 : 0;
  ctx.drawImage(washerSprite(), cx - 5, py + hop);
  ctx.fillStyle = "#e8b48a";
  if (waving) {
    const up = Math.floor(t * 6) % 2;
    ctx.fillRect(cx + 5, py + 2 - up, 1, 4);
    ctx.fillRect(cx + 5 + (up ? 1 : 0), py + 1 - up, 2, 2);
  } else {
    ctx.fillRect(cx + 4, py + 7, 3 + Math.max(0, scrub), 1);
    ctx.fillStyle = "#2a2a34";
    ctx.fillRect(cx + 6 + scrub, py + 3, 1, 7);
  }
  // The pigeon, landing on his hat and taking off again when he jumps.
  if (k > 8.6 && k < 12.4) {
    const land = Math.min(1, (k - 8.6) / 0.8);
    const off = k > 10.9 ? (k - 10.9) / 1.5 : 0;
    const bx = cx - 2 + Math.round((1 - land) * 18 + off * 26);
    const by = py - 3 - Math.round((1 - land) * 10 + off * 18);
    ctx.drawImage(pigeonSprite(land < 1 || off > 0 ? Math.floor(t * 10) % 2 : 2), bx, by);
  }
  ctx.restore();
}

const washerSprite = () =>
  sprite("washer", 11, 14, (g) => {
    g.rect(2, 0, 7, 2, "#f2c43a").rect(1, 2, 9, 1, "#d8a42a");
    g.rect(3, 3, 5, 3, "#e8b48a").set(4, 4, OUTLINE).set(6, 4, OUTLINE);
    g.rect(2, 6, 7, 6, "#3a6ab0").rect(3, 6, 5, 2, "#e8eef4");
    g.rect(3, 12, 2, 2, "#3a3a44").rect(6, 12, 2, 2, "#3a3a44");
  });

const pigeonSprite = (wing: number) =>
  sprite(`pigeon-${wing}`, 7, 5, (g) => {
    g.rect(1, 2, 5, 2, "#8a8e9a").rect(4, 1, 2, 2, "#6a6e7a").set(6, 2, "#e8a066").set(4, 1, "#7fbf9a");
    if (wing === 0) g.rect(1, 0, 3, 2, "#a8acb8");
    else if (wing === 1) g.rect(1, 4, 3, 1, "#a8acb8");
    else g.set(2, 4, "#e8a066").set(4, 4, "#e8a066");
  }, false);

const boxSprite = (open: boolean) =>
  sprite(`box-${open}`, 16, 14, (g) => {
    g.rect(1, 4, 14, 10, "#b8864e").rect(1, 4, 14, 2, "#cc9c62").hline(1, 9, 14, "#a07440");
    // A marker scrawl for LOST + FOUND.
    g.hline(3, 7, 4, "#3a2a2a").hline(9, 7, 4, "#3a2a2a").set(8, 7, "#c4342a");
    if (open) g.rect(0, 1, 4, 4, "#cc9c62").rect(12, 1, 4, 4, "#cc9c62");
    else g.rect(1, 2, 14, 2, "#a87a44").vline(8, 2, 3, "#e8d8a8");
  });

const sockSprite = () => sprite("sock", 8, 7, (g) => g.rect(1, 0, 3, 5, "#e8e4f0").rect(1, 4, 6, 2, "#e8e4f0").rect(1, 1, 3, 1, "#e5544b").rect(5, 5, 2, 1, "#e5544b"));
const duckSprite = () => sprite("duck", 8, 7, (g) => g.rect(1, 3, 6, 3, "#ffd23a").rect(3, 0, 3, 3, "#ffd23a").set(6, 1, "#ff8a2a").set(4, 1, OUTLINE));
const trophySprite = () => sprite("trophy", 7, 9, (g) => g.rect(1, 0, 5, 4, "#f2c43a").set(0, 1, "#d8a42a").set(6, 1, "#d8a42a").rect(3, 4, 1, 2, "#d8a42a").rect(1, 6, 5, 2, "#7a5a3a"));
const tubSprite = () => sprite("tub", 9, 6, (g) => g.rect(0, 0, 9, 2, "#3a74c4").rect(1, 2, 7, 3, "#9ad87a").set(3, 3, "#6aa84a").set(6, 3, "#c8e8a8"));
const umbrellaSprite = () => sprite("umbrella", 10, 5, (g) => g.rect(0, 1, 9, 2, "#2e2c36").rect(1, 0, 6, 1, "#3a3a4a").vline(9, 1, 3, "#7a5a3a").set(8, 4, "#7a5a3a"));
const mugSprite = () => sprite("mug", 7, 7, (g) => g.rect(0, 1, 5, 5, "#f4f2ea").vline(5, 2, 3, "#d8d4cc").set(6, 3, "#d8d4cc").hline(1, 3, 3, "#e5544b"));
const skateSprite = () => sprite("skate", 9, 8, (g) => g.rect(1, 0, 4, 4, "#ff6fa8").rect(1, 4, 7, 2, "#ff6fa8").set(2, 7, "#2e2c36").set(6, 7, "#2e2c36").set(4, 1, "#f4f2ea"));

// ------------------------------------------------------------------ sounds

export const SOUNDS: Record<string, SoundRecipe> = {
  "egg-squeak"(k) {
    // The squeegee on the glass, a few long squeaks.
    for (let i = 0; i < 4; i++) k.tone(1300 + i * 140, 0.2 + i * 0.32, 0.22, "sine", 0.03, 1900 + i * 120);
  },
  "egg-rummage"(k) {
    // Cardboard flaps, then things tumbling out.
    k.noise(0, 0.2, 0.12, 900);
    for (let i = 0; i < 6; i++) k.noise(0.5 + i * 0.16 + Math.random() * 0.05, 0.06, 0.07, 1800 + Math.random() * 2000);
    k.tone(880, 1.4, 0.12, "square", 0.025, 1320);
  },
};
