// Redwood Camp, live drawing: the forest out the windows, lanterns on a rope,
// the campfire, dappled sun, ground fog, fireflies, a squirrel, and the light at night.
import type { Drawable, Light, OutsideInfo, PaintInfo, SkyColors, WallLightsInfo } from "../../theme.ts";
import type { Layout, PropPlacement, Rect } from "../../layout.ts";
import { floorPlan, hash, makeCanvas, mix, OUTLINE, rng } from "../../themekit.ts";
import { C, cached, Grid } from "./kit.ts";
import { decorSprite, type DecorKind } from "./decor.ts";
import { creekShimmer, festoonGlow, festoonLights, forestItems, treeLanterns } from "./forest.ts";
import { campData } from "./plan.ts";
import { bindTentCtx, tentItems, tentLights } from "./tents.ts";

type Ctx = CanvasRenderingContext2D;

// ------------------------------------------------------------------ sky

const SKY: [number, string, string, number][] = [
  [0, "#070d1a", "#142236", 1],
  [5, "#121a32", "#2c3a52", 0.9],
  [6.5, "#e2967a", "#f4d4a2", 0.22],
  [8, "#88c4dc", "#d6ecd8", 0],
  [16.5, "#7ebcdc", "#cfe8d6", 0],
  [18.5, "#e48a6c", "#f6c98c", 0.28],
  [19.6, "#4a3c6a", "#c47c78", 0.62],
  [21, "#0c1426", "#1c2a3e", 1],
  [24, "#070d1a", "#142236", 1],
];

export function sky(hour: number): SkyColors {
  for (let i = 0; i < SKY.length - 1; i++) {
    const [h0, t0, b0, n0] = SKY[i]!;
    const [h1, t1, b1, n1] = SKY[i + 1]!;
    if (hour >= h0 && hour <= h1) {
      const k = (hour - h0) / (h1 - h0);
      return { top: mix(t0, t1, k), bottom: mix(b0, b1, k), night: n0 + (n1 - n0) * k };
    }
  }
  return { top: "#88c4dc", bottom: "#d6ecd8", night: 0 };
}

// ------------------------------------------------------------------ the forest view

interface ViewPal {
  haze: string;
  farTree: string;
  far: string;
  farHi: string;
  mist: string;
  mid: string;
  midHi: string;
  near: string;
  nearHi: string;
  nearDk: string;
  canopy: string;
  canopyHi: string;
  fern: string;
  fernHi: string;
  ground: string;
}

const VIEW: Record<"day" | "dusk" | "night", ViewPal> = {
  day: {
    haze: "rgba(196,222,206,0.5)",
    farTree: "#8fb09c",
    far: "#b49a8c",
    farHi: "#c9b9ac",
    mist: "rgba(236,242,232,0.55)",
    mid: "#94503a",
    midHi: "#b06a4a",
    near: "#7a3426",
    nearHi: "#a24e34",
    nearDk: "#4a1e16",
    canopy: "#2f5230",
    canopyHi: "#4f7a3e",
    fern: "#3f7a38",
    fernHi: "#62a248",
    ground: "#4e3c2a",
  },
  dusk: {
    haze: "rgba(236,186,160,0.4)",
    farTree: "#8a6a6a",
    far: "#b0807a",
    farHi: "#c49088",
    mist: "rgba(246,206,176,0.45)",
    mid: "#6e3428",
    midHi: "#8a4a36",
    near: "#4e2018",
    nearHi: "#6a3022",
    nearDk: "#2a100c",
    canopy: "#24321f",
    canopyHi: "#34482a",
    fern: "#2a4424",
    fernHi: "#3c5e30",
    ground: "#2e2218",
  },
  night: {
    haze: "rgba(40,54,80,0.45)",
    farTree: "#1c283a",
    far: "#26324a",
    farHi: "#2e3c56",
    mist: "rgba(140,156,186,0.32)",
    mid: "#1a2232",
    midHi: "#222c40",
    near: "#121722",
    nearHi: "#1a2130",
    nearDk: "#0a0d14",
    canopy: "#0e1520",
    canopyHi: "#141e2a",
    fern: "#121c1a",
    fernHi: "#1a2a24",
    ground: "#0c1014",
  },
};

/** The forest beyond one window, in one palette (the shapes are the same in all three). */
function viewLayer(win: Rect, index: number, which: keyof typeof VIEW): HTMLCanvasElement {
  return cached(`redwoods|view|${win.w}x${win.h}|${index % 5}|${which}`, () =>
    makeCanvas(win.w, win.h, (ctx) => {
      const P = VIEW[which];
      const { w, h } = win;
      const r = rng(hash(`view-${index % 5}-${w}`));
      const ground = h - 5;
      // Haze deepening toward the forest floor
      ctx.fillStyle = P.haze;
      ctx.fillRect(0, Math.round(h * 0.28), w, ground - Math.round(h * 0.28));
      ctx.fillRect(0, Math.round(h * 0.5), w, ground - Math.round(h * 0.5));
      // Young firs far away
      for (let i = 0; i < 5; i++) {
        const cx = Math.floor(r() * w);
        const th = 10 + Math.floor(r() * 12);
        ctx.fillStyle = P.farTree;
        for (let j = 0; j < th; j++) {
          const half = Math.floor((j / th) * 4) + (j % 4 === 3 ? 1 : 0);
          ctx.fillRect(cx - half, ground - th + j, half * 2 + 1, 1);
        }
      }
      // Far trunks in the haze
      for (let i = 0; i < 6; i++) {
        const x = Math.floor(r() * w);
        const tw = 2 + Math.floor(r() * 2);
        ctx.fillStyle = P.far;
        ctx.fillRect(x, 0, tw, ground);
        ctx.fillStyle = P.farHi;
        ctx.fillRect(x, 0, 1, ground);
      }
      // Mist lying low among the trees
      ctx.fillStyle = P.mist;
      ctx.fillRect(0, Math.round(h * 0.5), w, Math.round(h * 0.35));
      ctx.fillRect(0, Math.round(h * 0.42), w, 2);
      // Middle trunks, with a few green boughs
      for (let i = 0; i < 3; i++) {
        const x = Math.floor(((i + 0.3 + r() * 0.5) * w) / 3) - 2;
        const tw = 4 + Math.floor(r() * 3);
        ctx.fillStyle = P.mid;
        ctx.fillRect(x, 0, tw, ground + 1);
        ctx.fillStyle = P.midHi;
        ctx.fillRect(x, 0, 1, ground + 1);
        ctx.fillRect(x - 1, ground - 1, tw + 2, 2);
        for (let b = 0; b < 2; b++) {
          const by = 6 + Math.floor(r() * (h * 0.4));
          const dir = r() < 0.5 ? -1 : 1;
          const bx = dir < 0 ? x - 6 : x + tw;
          ctx.fillStyle = P.canopy;
          ctx.fillRect(bx, by, 6, 2);
          ctx.fillRect(bx + (dir < 0 ? 1 : 0), by - 1, 5, 1);
          ctx.fillStyle = P.canopyHi;
          ctx.fillRect(bx + 1, by - 1, 3, 1);
        }
      }
      // Canopy: dark clumps across the top with gaps of sky.
      for (let x = 0; x < w; x++) {
        const d = 2 + Math.round(3 + Math.sin(x * 0.55 + index) * 2 + Math.sin(x * 0.21 + index * 2) * 3);
        if (d <= 2) continue;
        ctx.fillStyle = P.canopy;
        ctx.fillRect(x, 0, 1, d);
        if ((x + index) % 3 === 0) {
          ctx.fillStyle = P.canopyHi;
          ctx.fillRect(x, d - 2, 1, 1);
        }
      }
      // A near trunk, big and close, on one side.
      const left = index % 2 === 0;
      const nw = 9 + (index % 3);
      const nx = left ? -2 : w - nw + 2;
      ctx.fillStyle = P.near;
      ctx.fillRect(nx, 0, nw, h);
      ctx.fillStyle = P.nearHi;
      ctx.fillRect(nx + 1, 0, 2, h);
      ctx.fillStyle = P.nearDk;
      for (let i = 0; i < 4; i++) ctx.fillRect(nx + 3 + i * 2, Math.floor(r() * 8), 1, h);
      ctx.fillRect(nx + nw - 1, 0, 1, h);
      // Forest floor and ferns
      ctx.fillStyle = P.ground;
      ctx.fillRect(0, ground, w, h - ground);
      for (let x = 1; x < w; x += 4 + Math.floor(r() * 3)) {
        const fh = 3 + Math.floor(r() * 4);
        ctx.fillStyle = P.fern;
        for (let j = 0; j < fh; j++) {
          ctx.fillRect(x - Math.floor(j / 2), ground - j, 1, 1);
          ctx.fillRect(x + Math.floor(j / 2) + 1, ground - j, 1, 1);
        }
        ctx.fillStyle = P.fernHi;
        ctx.fillRect(x, ground - fh, 1, fh);
      }
    }),
  );
}

function deer(ctx: Ctx, x: number, y: number, step: number, dir: number, graze: boolean, color: string, dark: string): void {
  // Body, neck and head, little white tail; mirrored when walking left.
  const r = (dx: number, dy: number, w: number, h: number) => ctx.fillRect(dir > 0 ? x + dx : x + 7 - dx - w + 1, y + dy, w, h);
  ctx.fillStyle = color;
  r(0, 0, 6, 3);
  if (graze) {
    r(5, 1, 2, 2);
    r(6, 2, 2, 2);
  } else {
    r(5, -2, 2, 3);
    r(6, -3, 2, 2);
  }
  ctx.fillStyle = dark;
  if (graze) r(8, 3, 1, 1);
  else {
    r(6, -4, 1, 1);
    r(8, -2, 1, 1);
  }
  ctx.fillStyle = "#e8dcc8";
  r(-1, 0, 1, 1);
  ctx.fillStyle = dark;
  const a = step % 2;
  r(a, 3, 1, 2);
  r(1 - a, 3, 1, 2);
  r(4 + a, 3, 1, 2);
  r(5 - a, 3, 1, 2);
}

export function outside(ctx: Ctx, win: Rect, index: number, info: OutsideInfo): void {
  const { x, y, w, h } = win;
  const n = info.night;
  const day = viewLayer(win, index, "day");
  const dusk = viewLayer(win, index, "dusk");
  const night = viewLayer(win, index, "night");
  // Day → dusk → night: draw one fully, the next on top by how far along we are.
  const k = n < 0.5 ? n * 2 : (n - 0.5) * 2;
  const [a, b] = n < 0.5 ? [day, dusk] : [dusk, night];
  ctx.drawImage(a, x, y);
  if (k > 0.02) {
    ctx.globalAlpha = Math.min(1, k);
    ctx.drawImage(b, x, y);
    ctx.globalAlpha = 1;
  }
  const t = info.t;
  const wx = info.weather;
  const clear = wx === "clear" || wx === "partly";
  // Sun rays slanting down through the canopy.
  if (n < 0.35 && clear) {
    const a0 = (0.13 + 0.05 * Math.sin(t * 0.7 + index)) * (1 - n / 0.35);
    ctx.fillStyle = `rgba(255,246,206,${a0.toFixed(3)})`;
    for (const [rx, rw] of [
      [6, 4],
      [17, 3],
      [27, 5],
    ] as const) {
      ctx.beginPath();
      ctx.moveTo(x + rx, y);
      ctx.lineTo(x + rx + rw, y);
      ctx.lineTo(x + rx + rw + 12, y + h);
      ctx.lineTo(x + rx + 12, y + h);
      ctx.closePath();
      ctx.fill();
    }
  }
  // Now and then a deer wanders past, from window to window.
  if (n < 0.45 && wx !== "rain" && wx !== "storm") {
    const wins = info.windows && info.windows.length > 0 ? info.windows : [win];
    const gx0 = Math.min(...wins.map((q) => q.x));
    const gx1 = Math.max(...wins.map((q) => q.x + q.w));
    const speed = 4;
    const walk = (gx1 - gx0 + 24) / speed;
    const period = Math.max(70, walk + 40);
    const ph = t % period;
    if (ph < walk + 4) {
      const graze0 = walk * 0.42;
      const grazing = ph >= graze0 && ph < graze0 + 4;
      const k = ph < graze0 ? ph : grazing ? graze0 : ph - 4;
      const dir = Math.floor(t / period) % 2 ? -1 : 1;
      const dx = dir > 0 ? gx0 - 12 + k * speed : gx1 + 4 - k * speed;
      if (dx > x - 10 && dx < x + w + 2) {
        deer(ctx, Math.round(dx), y + h - 9, grazing ? 0 : Math.floor(t * 5), dir, grazing, n < 0.2 ? "#9a6a44" : "#6a4630", "#3a2418");
      }
    }
  }
  // Night: fog drifting between the trunks, an owl, a few fireflies.
  if (n > 0.55) {
    ctx.fillStyle = `rgba(170,184,206,${(0.16 * (n - 0.5)).toFixed(3)})`;
    for (let i = 0; i < 3; i++) {
      const fx = x + ((t * (1.5 + i * 0.6) + i * 19 + index * 13) % (w + 30)) - 25;
      ctx.fillRect(Math.round(fx), y + h - 12 - i * 5, 22, 2);
      ctx.fillRect(Math.round(fx) + 4, y + h - 13 - i * 5, 12, 1);
    }
    if (index % 3 === 1) {
      const ox = index % 2 === 0 ? x + 9 : x + w - 12;
      const oy = y + 12;
      ctx.fillStyle = "#1a1612";
      ctx.fillRect(ox, oy, 4, 5);
      ctx.fillRect(ox - 2, oy + 5, 8, 1);
      if (Math.floor(t * 1.3) % 7 !== 0) {
        ctx.fillStyle = "#ffd84a";
        ctx.fillRect(ox, oy + 1, 1, 1);
        ctx.fillRect(ox + 3, oy + 1, 1, 1);
      }
    }
    for (let i = 0; i < 3; i++) {
      const on = Math.sin(t * 2 + i * 2.1 + index) > 0.4;
      if (!on) continue;
      ctx.fillStyle = "#e8ff8a";
      ctx.fillRect(Math.round(x + 6 + ((i * 13 + index * 7) % (w - 10)) + Math.sin(t * 0.6 + i) * 3), Math.round(y + h - 10 - i * 4 + Math.cos(t * 0.5 + i) * 2), 1, 1);
    }
  }
}

// ------------------------------------------------------------------ lanterns on a rope

interface RopeBulb {
  x: number;
  y: number;
  lantern: boolean;
  color: string;
  n: number;
}

interface Rope {
  rope: { x: number; y: number }[];
  bulbs: RopeBulb[];
}

const LANTERN_COLORS = ["#ffb84a", "#ffd27a", "#ff9a6a", "#d8ec8a", "#ffd27a"];

function rope(L: Layout): Rope {
  return cached(`redwoods|rope|${L.W}x${L.H}|${L.segments.map((s) => `${s.x0}-${s.x1}`).join(",")}`, () => {
    const out: Rope = { rope: [], bulbs: [] };
    let n = 0;
    for (const seg of L.segments) {
      for (let x0 = seg.x0 + 6; x0 < seg.x1 - 6; x0 += 100) {
        const x1 = Math.min(seg.x1 - 6, x0 + 100);
        if (x1 - x0 < 30) continue;
        for (let x = x0; x < x1; x++) {
          const k = (x - x0) / (x1 - x0);
          const y = 1 + Math.round(Math.sin(k * Math.PI) * 3);
          out.rope.push({ x, y });
          if ((x - x0) % 10 === 5) {
            const lantern = n % 3 === 1;
            out.bulbs.push({ x, y, lantern, color: lantern ? LANTERN_COLORS[Math.floor(n / 3) % LANTERN_COLORS.length]! : "#fff0c0", n });
            n++;
          }
        }
      }
    }
    return out;
  });
}

/** A soft round glow, cached per color and radius. */
function glowSprite(color: string, r: number): HTMLCanvasElement {
  return cached(`redwoods|glow|${color}|${r}`, () =>
    makeCanvas(r * 2 + 1, r * 2 + 1, (ctx) => {
      const g = ctx.createRadialGradient(r + 0.5, r + 0.5, 0, r + 0.5, r + 0.5, r);
      g.addColorStop(0, `${color}cc`);
      g.addColorStop(0.4, `${color}55`);
      g.addColorStop(1, `${color}00`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, r * 2 + 1, r * 2 + 1);
    }),
  );
}

export function wallLights(ctx: Ctx, L: Layout, info: WallLightsInfo, glow: boolean): void {
  const R = rope(L);
  const t = info.t;
  const party = info.party;
  const night = party ? Math.max(info.night, 0.75) : info.night;
  if (!glow) {
    ctx.fillStyle = "#6b5238";
    for (const p of R.rope) ctx.fillRect(p.x, p.y, 1, 1);
  }
  for (const b of R.bulbs) {
    const dead = info.brokenBulbX === b.x && Math.floor(t * 9) % 7 !== 0;
    const on = night > 0.3 && !dead;
    let tw = 0.7 + 0.3 * Math.sin(t * 1.1 + b.n * 1.9);
    if (party) {
      const wave = (b.n + Math.floor(t * 10)) % 6;
      tw = wave === 0 ? 1 : wave < 3 ? 0.55 : 0.25;
    }
    const c = party ? LANTERN_COLORS[(b.n + Math.floor(t * 4)) % LANTERN_COLORS.length]! : b.color;
    if (glow) {
      if (!on) continue;
      const g = glowSprite(c, b.lantern ? 9 : 4);
      ctx.globalAlpha = Math.min(1, tw * night * (b.lantern ? 0.9 : 0.8));
      ctx.drawImage(g, b.x - (g.width >> 1), b.y + (b.lantern ? 5 : 2) - (g.height >> 1));
      ctx.globalAlpha = 1;
      ctx.fillStyle = c;
      if (b.lantern) ctx.fillRect(b.x - 1, b.y + 4, 3, 2);
      else ctx.fillRect(b.x, b.y + 1, 1, 1);
      continue;
    }
    const lit = dead ? "#4a4238" : on ? c : mix(c, "#7a6a58", 0.55);
    if (b.lantern) {
      // A little tin lantern on a hook.
      ctx.fillStyle = "#4a3a2a";
      ctx.fillRect(b.x, b.y + 1, 1, 1);
      ctx.fillStyle = OUTLINE;
      ctx.fillRect(b.x - 2, b.y + 2, 5, 6);
      ctx.fillStyle = "#3a3632";
      ctx.fillRect(b.x - 1, b.y + 2, 3, 1);
      ctx.fillRect(b.x - 1, b.y + 7, 3, 1);
      ctx.fillStyle = lit;
      ctx.fillRect(b.x - 1, b.y + 3, 3, 4);
      if (on) {
        ctx.fillStyle = "#fff6d8";
        ctx.fillRect(b.x, b.y + 4, 1, 2);
      }
    } else {
      ctx.fillStyle = lit;
      ctx.fillRect(b.x, b.y + 1, 1, 2);
    }
  }
}

// ------------------------------------------------------------------ where things are

interface Spots {
  fire: { x: number; y: number; z: number } | null;
  /** Little lanterns on every other camp table. */
  deskLamps: { x: number; y: number; z: number }[];
  /** Static decor on free floor. */
  items: { kind: DecorKind; x: number; y: number; z: number }[];
  /** Glowing mushrooms along the pod planters. */
  shrooms: { x: number; y: number }[];
  /** Firefly home points. */
  flies: { x: number; y: number }[];
  wallMin: number;
}

function propsOf(L: Layout, kind: PropPlacement["kind"]): PropPlacement[] {
  return L.props.filter((p) => p.kind === kind);
}

function spots(L: Layout): Spots {
  return cached(`redwoods|spots|${L.W}x${L.H}|${L.props.length}|${L.spots.length}`, () => {
    const table = propsOf(L, "coffee-table")[0];
    const fire = table ? { x: table.x + 19, y: table.y + 7, z: table.z + 0.2 } : null;
    const plan = floorPlan(L);
    const wallMin = Math.min(...L.segments.map((s) => s.depth));
    const items: Spots["items"] = [];
    const r = rng(hash(`decor-${L.W}x${L.H}`));
    const kinds: DecorKind[] = ["log", "ferns", "bush", "shrooms", "rock", "ferns", "stump", "bush", "cones", "lantern-stake", "log", "woodpile", "ferns", "shrooms", "bush"];
    const sizes: Record<DecorKind, [number, number]> = {
      ferns: [16, 12],
      shrooms: [10, 8],
      rock: [12, 8],
      stump: [14, 12],
      cones: [8, 6],
      "lantern-stake": [8, 18],
      woodpile: [20, 12],
      log: [32, 12],
      bush: [18, 14],
    };
    // Only on open forest floor: not on decks, in tents, cabins or the kitchen.
    const keepOut = L.rooms.filter((rm) => rm.kind !== "lounge" && rm.kind !== "garden" && rm.kind !== "games" && rm.kind !== "library").map((rm) => rm.rect);
    const used: Rect[] = keepOut.map((k) => ({ x: k.x - 8, y: k.y - 14, w: k.w + 10, h: k.h + 14 }));
    // Leave the gathering spot clear for office events, and the giants' roots.
    const ev = L.eventArea;
    used.push({ x: ev.x - 10, y: ev.y - 16, w: ev.w + 20, h: ev.h + 26 });
    for (const t of campData(L)?.trees ?? []) used.push({ x: t.x - 10, y: t.base - 24, w: t.w + 20, h: 30 });
    for (const c of campData(L)?.creek ? [campData(L)!.strips[1]!] : []) used.push({ x: c.x - 4, y: 0, w: c.w + 8, h: L.H });
    const clash = (q: Rect) => used.some((u) => q.x < u.x + u.w + 6 && q.x + q.w + 6 > u.x && q.y < u.y + u.h + 6 && q.y + q.h + 6 > u.y);
    let ki = 0;
    for (let tries = 0; tries < 15 && items.length < Math.round((L.W * L.H) / (campData(L)?.tents ? 8000 : 14000)); tries++) {
      const kind = kinds[ki % kinds.length]!;
      const [w, h] = sizes[kind];
      const found = plan.find(w, h, 400).filter((q) => q.y > wallMin + 6 && !clash(q));
      if (found.length === 0) {
        ki++;
        continue;
      }
      const q = found[Math.floor(r() * found.length)]!;
      used.push(q);
      items.push({ kind, x: q.x, y: q.y, z: q.y + h - 1 });
      ki++;
      tries = 0;
    }
    const shrooms: Spots["shrooms"] = [];
    for (const p of propsOf(L, "planter")) {
      const w = p.w ?? 48;
      for (let k = 0, x = 10; x < w - 6; k++, x += 34) shrooms.push({ x: p.x + x + ((k * 5) % 9), y: p.y + 10 });
    }
    const flies: Spots["flies"] = [];
    for (const pl of L.plants) if (pl.sprite !== "HANGING_PLANT") flies.push({ x: pl.x + 8, y: pl.y + 4 });
    for (const it of items) flies.push({ x: it.x + 6, y: it.y });
    if (fire) flies.push({ x: fire.x - 30, y: fire.y + 10 }, { x: fire.x + 34, y: fire.y + 6 });
    for (const room of L.rooms) if (room.kind === "garden" || room.kind === "games" || room.kind === "library") flies.push({ x: room.rect.x + room.rect.w / 2, y: room.rect.y + room.rect.h / 2 });
    const deskLamps: Spots["deskLamps"] = [];
    for (const d of L.desks) {
      if (d.index % 2 !== 0) continue;
      const plant = hash(`desk-plant-${d.index}`) % 3 === 0;
      if (d.side === "north" && plant) continue;
      const x = d.side === "north" ? d.x + 40 : plant ? d.x + 15 : d.x + 7;
      deskLamps.push({ x, y: d.y + 6, z: d.y + 26.7 });
    }
    return { fire, deskLamps, items, shrooms, flies, wallMin };
  });
}

// ------------------------------------------------------------------ underlay: sun dapples, ground fog

function dappleCanvas(L: Layout): HTMLCanvasElement {
  return cached(`redwoods|dapple|${L.W}x${L.H}`, () =>
    makeCanvas(L.W + 8, L.H, (ctx) => {
      const r = rng(hash(`dap-${L.W}`));
      const top = Math.min(...L.segments.map((s) => s.depth)) + 2;
      for (let i = 0; i < (L.W * L.H) / 1500; i++) {
        const x = Math.floor(r() * (L.W + 8));
        const y = top + Math.floor(r() * (L.H - top));
        const rx = 2 + Math.floor(r() * 4);
        const ry = 1 + Math.floor(r() * 2);
        ctx.fillStyle = "rgba(255,240,190,0.55)";
        ctx.fillRect(x - rx, y, rx * 2, ry);
        ctx.fillRect(x - rx + 1, y - 1, rx * 2 - 2, ry + 2);
        if (r() < 0.4) ctx.fillRect(x + rx + 2, y + 1, 2, 1);
      }
    }),
  );
}

function wispCanvas(w: number, h: number, seed: number): HTMLCanvasElement {
  return cached(`redwoods|wisp|${w}x${h}|${seed}`, () =>
    makeCanvas(w, h, (ctx) => {
      const r = rng(seed);
      for (let i = 0; i < 9; i++) {
        const cx = w * (0.15 + r() * 0.7);
        const cy = h * (0.35 + r() * 0.3);
        const rx = w * (0.12 + r() * 0.16);
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
        g.addColorStop(0, "rgba(236,240,244,0.5)");
        g.addColorStop(1, "rgba(236,240,244,0)");
        ctx.fillStyle = g;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(1, 0.42);
        ctx.translate(-cx, -cy);
        ctx.fillRect(cx - rx, cy - rx, rx * 2, rx * 2);
        ctx.restore();
      }
    }),
  );
}

function fogAmount(info: PaintInfo): number {
  const h = info.hour;
  const morning = h > 4.5 && h < 9 ? Math.min(1, (h - 4.5) / 1.5, (9 - h) / 1.5) * 0.55 : 0;
  const nightFog = info.night > 0.6 ? 0.35 : 0;
  const wx = info.weather === "fog" ? 1 : info.weather === "rain" || info.weather === "drizzle" ? 0.35 : 0;
  return Math.max(morning, nightFog, wx);
}

export function underlay(ctx: Ctx, L: Layout, info: PaintInfo): void {
  const t = info.t;
  const wx = info.weather;
  creekShimmer(ctx, L, t, info.night);
  // Rain running down the canvas walls.
  if (wx === "rain" || wx === "storm" || wx === "drizzle") {
    const heavy = wx === "storm" ? 1.6 : wx === "drizzle" ? 0.5 : 1;
    for (const [si, sg] of L.segments.entries()) {
      const n = Math.round(((sg.x1 - sg.x0) / 26) * heavy);
      for (let i = 0; i < n; i++) {
        const x = sg.x0 + ((i * 37 + si * 11) % Math.max(1, sg.x1 - sg.x0));
        const run = sg.depth - 16;
        const y = 6 + ((t * (14 + (i % 5) * 3) + i * 17) % run);
        ctx.fillStyle = "rgba(80,70,50,0.12)";
        ctx.fillRect(x, 6, 1, Math.round(y) - 6);
        ctx.fillStyle = "rgba(200,220,236,0.75)";
        ctx.fillRect(x, Math.round(y), 1, 2);
      }
    }
  }
  const sun = wx === "clear" ? 1 : wx === "partly" ? 0.55 : 0;
  const dayK = Math.max(0, 1 - info.night * 2.5) * sun;
  if (dayK > 0.02) {
    ctx.globalAlpha = dayK * (0.32 + 0.1 * Math.sin(t * 0.5));
    ctx.drawImage(dappleCanvas(L), Math.round(-4 + Math.sin(t * 0.23) * 3), 0);
    ctx.globalAlpha = 1;
  }
  const fog = fogAmount(info);
  if (fog > 0.02) {
    const S = spots(L);
    const wisp = wispCanvas(150, 34, 5);
    const n = Math.ceil(L.W / 120) + 2;
    for (let i = 0; i < n * 2; i++) {
      const row = i % 4;
      const y = S.wallMin + 10 + ((row * 0.27 + (i * 0.13) % 0.2) * (L.H - S.wallMin));
      const x = ((t * (2.2 + row * 0.6) + i * 137) % (L.W + 300)) - 150;
      ctx.globalAlpha = fog * (info.night > 0.5 ? 0.4 : 0.55);
      ctx.drawImage(wisp, Math.round(x), Math.round(y));
    }
    ctx.globalAlpha = 1;
  }
}

// ------------------------------------------------------------------ decor: campfire, critters, floor dressing

let now: PaintInfo = { t: 0, hour: 12, night: 0, weather: "clear", date: new Date(0), season: null };
let ctxNow: Ctx | null = null;

function drawFire(ctx: Ctx, cx: number, by: number, t: number, big: boolean): void {
  const n = big ? 5 : 4;
  for (let i = 0; i < n; i++) {
    const x = cx - Math.floor(n) + i * 2;
    const hgt = 3 + Math.round(3 * Math.abs(Math.sin(t * 7.3 + i * 1.9))) + (i === Math.floor(n / 2) ? 4 : i === 1 || i === n - 2 ? 2 : 0);
    ctx.fillStyle = C.ember;
    ctx.fillRect(x, by - hgt + 1, 2, hgt);
    ctx.fillStyle = C.flame;
    ctx.fillRect(x, by - hgt + 2, 2, hgt - 2);
    ctx.fillStyle = C.flameHi;
    ctx.fillRect(x + (i % 2), by - Math.ceil(hgt * 0.55), 1, Math.ceil(hgt * 0.55));
  }
  ctx.fillStyle = C.flameCore;
  ctx.fillRect(cx - 2, by - 2, 4, 2);
  // Sparks
  for (let i = 0; i < 4; i++) {
    const k = (t * 0.7 + i * 0.27) % 1;
    const sx = cx + Math.round(Math.sin(t * 2 + i * 5) * (2 + k * 5));
    const sy = by - 8 - Math.round(k * 16);
    ctx.fillStyle = k < 0.5 ? C.flameHi : C.flame;
    ctx.globalAlpha = 1 - k;
    ctx.fillRect(sx, sy, 1, 1);
  }
  ctx.globalAlpha = 1;
}

const fireItem: Drawable = { z: 0, draw: () => undefined };
let fireAt: { x: number; y: number } = { x: 0, y: 0 };
fireItem.draw = () => {
  if (ctxNow) drawFire(ctxNow, fireAt.x, fireAt.y, now.t, true);
};

function squirrel(ctx: Ctx, x: number, y: number, dir: number, t: number): void {
  const hop = Math.floor(t * 10) % 2;
  const s = (dx: number) => (dir > 0 ? x + dx : x - dx);
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(Math.min(s(-4), s(3)) - 1, y - 6 - hop, 9, 6);
  ctx.fillStyle = "#b5652e";
  ctx.fillRect(Math.min(s(0), s(3)), y - 4 - hop, 4, 3);
  ctx.fillRect(Math.min(s(2), s(3)), y - 5 - hop, 2, 2);
  ctx.fillStyle = "#d98a4a";
  ctx.fillRect(Math.min(s(-3), s(-1)), y - 6 - hop, 3, 4);
  ctx.fillStyle = "#f0d8b0";
  ctx.fillRect(s(1), y - 2 - hop, 1, 1);
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(s(3), y - 5 - hop, 1, 1);
}

export function decor(ctx: Ctx, L: Layout, info: PaintInfo): Drawable[] {
  now = info;
  ctxNow = ctx;
  const S = spots(L);
  const list = cached(`redwoods|decorlist|${L.W}x${L.H}|${L.props.length}|${L.spots.length}`, () =>
    S.items.map((it) => ({ z: it.z, draw: () => ctxNow?.drawImage(decorSprite(it.kind, it.x + it.y), it.x, it.y) }) as Drawable),
  );
  bindTentCtx(ctx);
  const out = list.concat(forestItems(ctx, L, info.night, info.t), tentItems(ctx, L, info.t, info.night));
  const lit = info.night > 0.35;
  const lamp = deskLamp(lit);
  for (const d of S.deskLamps) out.push({ z: d.z, draw: () => ctx.drawImage(lamp, d.x, d.y) });
  if (S.fire) {
    fireAt = S.fire;
    fireItem.z = S.fire.z;
    out.push(fireItem);
  }
  // A doe wanders in to graze at dawn and at dusk.
  const h = info.hour;
  if (((h > 5.6 && h < 8.8) || (h > 17.6 && h < 20.4)) && info.weather !== "rain" && info.weather !== "storm") {
    const at = doeSpot(L);
    if (at) {
      const graze = Math.floor(info.t / 3.5) % 3 !== 0;
      const flick = Math.floor(info.t * 2.3) % 7 === 0;
      const left = at.x > L.W / 2;
      out.push({ z: at.y + 13, draw: () => ctx.drawImage(doe(graze, flick, left), at.x, at.y) });
    }
  }
  // A squirrel dashes along a boardwalk now and then.
  const period = 41;
  const ph = info.t % period;
  if (ph < 6 && L.net.halls.length > 0 && info.night < 0.7) {
    const cycle = Math.floor(info.t / period);
    const hy = L.net.halls[cycle % L.net.halls.length]!;
    const dir = cycle % 2 ? -1 : 1;
    const k = ph / 6;
    const pause = k > 0.45 && k < 0.6;
    const kk = pause ? 0.45 : k < 0.45 ? k : k - 0.15;
    const x = dir > 0 ? -10 + kk * 1.18 * (L.W + 20) : L.W + 10 - kk * 1.18 * (L.W + 20);
    out.push({ z: hy + 4, draw: () => squirrel(ctx, Math.round(x), hy + 5, dir, pause ? 0 : info.t) });
  }
  return out;
}

function deskLamp(lit: boolean): HTMLCanvasElement {
  return cached(`redwoods|desklamp|${lit}`, () => {
    const g = new Grid(7, 9);
    g.set(3, 0, C.iron).rect(2, 1, 3, 1, C.iron);
    g.rect(1, 2, 5, 5, C.iron);
    g.rect(2, 2, 3, 4, lit ? "#ffd27a" : C.glass);
    g.set(3, 4, lit ? "#fff6d8" : C.flameHi);
    g.rect(1, 7, 5, 1, C.iron);
    g.outline(OUTLINE);
    return g.toCanvas();
  });
}

function doe(graze: boolean, flick: boolean, left: boolean): HTMLCanvasElement {
  return cached(`redwoods|doe|${graze}|${flick}|${left}`, () => {
    const g = new Grid(16, 14);
    const fur = "#a8723e";
    const lo = "#86562c";
    const belly = "#e8d4b0";
    g.rrect(2, 6, 10, 4, fur, 1);
    g.rect(3, 9, 8, 1, belly);
    g.rect(2, 6, 3, 1, lo);
    for (const x of [3, 5, 9, 11]) g.rect(x, 10, 1, 3, lo);
    g.set(1, 6, belly).set(1, 7, flick ? belly : fur);
    if (graze) {
      g.rect(11, 7, 2, 3, fur).rect(12, 9, 2, 3, fur).set(14, 11, OUTLINE).set(12, 8, lo);
    } else {
      g.rect(11, 3, 2, 4, fur).rect(12, 1, 3, 3, fur).set(15, 2, OUTLINE).set(13, 2, OUTLINE);
      g.set(12, 0, lo).set(11, 1, flick ? fur : lo);
    }
    g.outline(OUTLINE);
    return (left ? g.flipped() : g).toCanvas();
  });
}

function doeSpot(L: Layout): { x: number; y: number } | null {
  return cached(`redwoods|doespot|${L.W}x${L.H}|${L.props.length}`, () => {
    const S = spots(L);
    const plan = floorPlan(L);
    const trees = campData(L)?.trees ?? [];
    const found = plan.find(18, 14, 60).filter(
      (q) =>
        q.y > S.wallMin + 30 &&
        !L.rooms.some((rm) => rm.kind !== "lounge" && rm.kind !== "garden" && rm.kind !== "games" && q.x < rm.rect.x + rm.rect.w + 6 && q.x + 18 > rm.rect.x - 6 && q.y < rm.rect.y + rm.rect.h + 4 && q.y + 14 > rm.rect.y - 10) &&
        !(campData(L)?.creek && q.x < campData(L)!.strips[1]!.x + campData(L)!.strips[1]!.w + 4 && q.x + 18 > campData(L)!.strips[1]!.x - 4) &&
        !S.items.some((it) => Math.abs(it.x - q.x) < 22 && Math.abs(it.y - q.y) < 18) &&
        !trees.some((t) => q.x < t.x + t.w + 12 && q.x + 18 > t.x - 12 && q.y < t.base + 4 && q.y + 14 > t.base - t.h) &&
        !(q.x < L.eventArea.x + L.eventArea.w && q.x + 18 > L.eventArea.x && q.y < L.eventArea.y + L.eventArea.h && q.y + 14 > L.eventArea.y),
    );
    return found.length ? found[Math.floor(found.length / 2)]! : null;
  });
}

// ------------------------------------------------------------------ overlay: fireflies, smoke, fog

export function overlay(ctx: Ctx, L: Layout, info: PaintInfo): void {
  const S = spots(L);
  const t = info.t;
  festoonGlow(ctx, L, info.night, t);
  // Shafts of sun slanting down through the canopy on clear days.
  const sun = info.weather === "clear" ? 1 : info.weather === "partly" ? 0.5 : 0;
  const rayK = sun * Math.max(0, 1 - info.night * 3);
  if (rayK > 0.02) {
    for (const [fx, fw, ph] of [
      [0.36, 22, 0],
      [0.58, 14, 2.1],
      [0.8, 26, 4.2],
    ] as const) {
      const a = rayK * (0.07 + 0.03 * Math.sin(t * 0.35 + ph));
      const x0 = Math.round(L.W * fx);
      const drop = L.H * 0.9;
      ctx.fillStyle = `rgba(255,244,206,${a.toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(x0, 0);
      ctx.lineTo(x0 + fw, 0);
      ctx.lineTo(x0 + fw + drop * 0.42 + fw, drop);
      ctx.lineTo(x0 + drop * 0.42, drop);
      ctx.closePath();
      ctx.fill();
    }
  }
  // Campfire smoke curling up.
  if (S.fire) {
    for (let i = 0; i < 5; i++) {
      const k = (t * 0.22 + i / 5) % 1;
      const x = S.fire.x + Math.round(Math.sin(t * 0.8 + i * 2.3 + k * 4) * (1 + k * 6));
      const y = S.fire.y - 12 - Math.round(k * 34);
      ctx.fillStyle = info.night > 0.5 ? "rgba(150,150,160,1)" : "rgba(210,206,198,1)";
      ctx.globalAlpha = (1 - k) * 0.35;
      ctx.fillRect(x - 1, y, 3 + Math.round(k * 3), 2);
    }
    ctx.globalAlpha = 1;
  }
  // Fireflies after dark.
  if (info.night > 0.5) {
    const amt = (info.night - 0.5) * 2;
    const glow = glowSprite("#d8ff6a", 4);
    const n = Math.min(S.flies.length * 2, 30);
    for (let i = 0; i < n; i++) {
      const home = S.flies[i % S.flies.length]!;
      const fx = home.x + Math.sin(t * 0.37 + i * 1.3) * 16 + Math.sin(t * 0.9 + i) * 3;
      const fy = home.y - 6 + Math.cos(t * 0.29 + i * 1.7) * 10;
      const blink = Math.sin(t * 1.6 + i * 2.37);
      if (blink < 0.15) continue;
      ctx.globalAlpha = amt * blink;
      ctx.drawImage(glow, Math.round(fx) - 4, Math.round(fy) - 4);
      ctx.fillStyle = "#f4ffb0";
      ctx.fillRect(Math.round(fx), Math.round(fy), 1, 1);
    }
    ctx.globalAlpha = 1;
  }
  // Thick fog rolls through everything.
  if (info.weather === "fog") {
    const wisp = wispCanvas(220, 48, 9);
    for (let i = 0; i < Math.ceil(L.W / 160) + 2; i++) {
      const x = ((t * (3 + (i % 3)) + i * 211) % (L.W + 440)) - 220;
      const y = S.wallMin + ((i * 97) % Math.max(1, L.H - S.wallMin - 30));
      ctx.globalAlpha = 0.35;
      ctx.drawImage(wisp, Math.round(x), Math.round(y));
    }
    ctx.globalAlpha = 1;
  }
}

// ------------------------------------------------------------------ light at night

export function lights(L: Layout, info: PaintInfo): Light[] {
  const S = spots(L);
  const t = info.t;
  const out: Light[] = [];
  if (S.fire) {
    const f = 0.85 + Math.sin(t * 9) * 0.06 + Math.sin(t * 3.7) * 0.08;
    out.push([S.fire.x, S.fire.y - 2, 78, 0.95 * f, "#ff9a4a", 0.32 * f]);
    out.push([S.fire.x, S.fire.y - 4, 26, 1, "#ffcf6a", 0.3]);
  }
  for (const b of rope(L).bulbs) if (b.lantern && b.x !== null) out.push([b.x, b.y + 5, 16, 0.45, b.color, 0.1]);
  for (const s of S.shrooms) out.push([s.x, s.y, 12, 0.6, "#7fffd0", 0.18]);
  for (const d of S.deskLamps) out.push([d.x + 3, d.y + 4, 24, 0.6, "#ffd27a", 0.14]);
  for (const [x, y] of tentLights(L)) out.push([x, y, 18, 0.7, "#ffd27a", 0.16]);
  for (const [x, y] of treeLanterns(L)) out.push([x + 2, y + 2, 24, 0.75, "#ffc864", 0.2]);
  for (const [x, y] of festoonLights(L)) out.push([x, y + 4, 30, 0.55, "#ffd27a", 0.12]);
  for (const it of S.items) if (it.kind === "lantern-stake") out.push([it.x + 4, it.y + 3, 26, 0.8, "#ffc864", 0.2]);
  const isl = propsOf(L, "kitchen-island")[0];
  if (isl) out.push([isl.x + (isl.w ?? 72) - 10, isl.y + 2, 30, 0.7, "#ffd27a", 0.16]);
  const mt = propsOf(L, "meeting-table")[0];
  if (mt) out.push([mt.x + 6, mt.y + 4, 40, 0.75, "#ffd27a", 0.18]);
  for (const p of propsOf(L, "lounge-table")) out.push([p.x + 22, p.y + 2, 18, 0.6, "#ffcf7a", 0.14]);
  const rec = propsOf(L, "reception")[0];
  if (rec) out.push([rec.x + 30, rec.y + 2, 26, 0.7, "#ffd27a", 0.16]);
  return out;
}

/** The plank door swung open onto the lit lodge inside. */
export function doorOpen(ctx: Ctx, d: Rect, info: PaintInfo): boolean {
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(d.x, d.y + 1, d.w, d.h - 1);
  ctx.fillStyle = info.night > 0.5 ? "#4a3018" : "#3a2a1e";
  ctx.fillRect(d.x + 1, d.y + 2, d.w - 2, d.h - 3);
  // Lantern light spilling across the floor inside
  ctx.fillStyle = info.night > 0.5 ? "#c8843a" : "#6a4a2a";
  ctx.fillRect(d.x + 2, d.y + d.h - 8, d.w - 4, 6);
  ctx.fillStyle = "#ffd27a";
  ctx.fillRect(d.x + d.w / 2 - 1, d.y + 8, 3, 4);
  // The plank leaf swung back against the frame
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(d.x - 5, d.y + 1, 5, d.h - 1);
  ctx.fillStyle = C.deck;
  ctx.fillRect(d.x - 4, d.y + 2, 3, d.h - 3);
  ctx.fillStyle = C.deckHi;
  ctx.fillRect(d.x - 4, d.y + 2, 1, d.h - 3);
  ctx.fillStyle = C.iron;
  ctx.fillRect(d.x - 4, d.y + 9, 3, 1);
  ctx.fillRect(d.x - 4, d.y + d.h - 3, 3, 1);
  return true;
}

export function darkness(night: number, _weather: unknown, classic: number): number {
  const gloom = Math.max(0, classic - night * 0.5);
  return night * 0.7 + gloom;
}

