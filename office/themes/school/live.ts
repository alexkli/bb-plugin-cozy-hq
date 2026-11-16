// School scenery: the live bits. Paper bunting with fairy lights along the
// wall, hallway lights and the exit sign at night, and a few extras on the
// floor (the class hamster, an easel, dodgeballs, a book cart).
import { cached, drawPixelText, floorPlan, Grid, mix } from "../../themekit.ts";
import type { Drawable, Light, PaintInfo, WallLightsInfo } from "../../theme.ts";
import type { Layout, Rect } from "../../layout.ts";
import { wallItems } from "./background.ts";
import { BOOKS, C, CRAYONS, OUTLINE, sprite } from "./kit.ts";

// ------------------------------------------------------------------ bunting

interface Flag {
  x: number;
  y: number;
  color: string;
  n: number;
}

function flagsOf(L: Layout): { strings: { x0: number; x1: number }[]; flags: Flag[]; bulbs: { x: number; y: number }[] } {
  return cached(`school|flags|${L.W}x${L.H}|${L.segments.map((s) => `${s.x0}-${s.x1}`).join(",")}`, () => {
    const strings: { x0: number; x1: number }[] = [];
    const flags: Flag[] = [];
    const bulbs: { x: number; y: number }[] = [];
    let n = 0;
    for (const seg of L.segments) {
      for (let x0 = seg.x0 + 6; x0 < seg.x1 - 6; x0 += 100) {
        const x1 = Math.min(seg.x1 - 6, x0 + 100);
        if (x1 - x0 < 30) continue;
        strings.push({ x0, x1 });
        for (let x = x0; x < x1; x++) {
          const k = (x - x0) / (x1 - x0);
          const y = 1 + Math.round(Math.sin(k * Math.PI) * 3);
          if ((x - x0) % 10 === 5) flags.push({ x, y, color: CRAYONS[n % CRAYONS.length]!, n: n++ });
          else if ((x - x0) % 10 === 0 && x > x0) bulbs.push({ x, y });
        }
      }
    }
    return { strings, flags, bulbs };
  });
}

export function wallLights(ctx: CanvasRenderingContext2D, L: Layout, info: WallLightsInfo, glow: boolean): void {
  const { strings, flags, bulbs } = flagsOf(L);
  const t = info.t;
  const night = info.party ? Math.max(info.night, 0.7) : info.night;
  const on = night > 0.3;
  const dead = info.brokenBulbX;
  if (glow) {
    if (!on) return;
    for (const [i, b] of bulbs.entries()) {
      if (dead !== null && Math.abs(b.x - dead) <= 5 && Math.floor(t * 9) % 7 !== 0) continue;
      const tw = info.party ? ((i + Math.floor(t * 8)) % 3 === 0 ? 1 : 0.35) : 0.7 + 0.3 * Math.sin(t * 1.3 + i * 1.9);
      const g = ctx.createRadialGradient(b.x + 0.5, b.y + 1.5, 0, b.x + 0.5, b.y + 1.5, 5);
      g.addColorStop(0, `rgba(255,236,170,${(0.42 * tw * night).toFixed(3)})`);
      g.addColorStop(1, "rgba(255,236,170,0)");
      ctx.fillStyle = g;
      ctx.fillRect(b.x - 5, b.y - 4, 11, 11);
      ctx.fillStyle = "#fff4c8";
      ctx.fillRect(b.x, b.y + 1, 1, 1);
    }
    return;
  }
  // The string.
  ctx.fillStyle = "#6b5a4a";
  for (const s of strings) {
    for (let x = s.x0; x < s.x1; x++) {
      const k = (x - s.x0) / (s.x1 - s.x0);
      ctx.fillRect(x, 1 + Math.round(Math.sin(k * Math.PI) * 3), 1, 1);
    }
  }
  // Paper pennants: they flutter during a show.
  for (const f of flags) {
    const flutter = info.party ? Math.round(Math.sin(t * 9 + f.n * 0.9)) : 0;
    const torn = dead === f.x;
    const c = f.color;
    const lo = mix(c, "#2a1e2e", 0.18);
    const y = f.y + 1;
    if (torn) {
      // Torn: a scrap left on the string and a corner hanging down.
      ctx.fillStyle = c;
      ctx.fillRect(f.x - 2, y, 3, 1);
      ctx.fillRect(f.x - 2, y + 1, 2, 1);
      ctx.fillStyle = lo;
      ctx.fillRect(f.x + 1, y + 1, 1, 3);
      continue;
    }
    ctx.fillStyle = c;
    ctx.fillRect(f.x - 2, y, 5, 2);
    ctx.fillRect(f.x - 1 + (flutter > 0 ? 1 : 0), y + 2, 3, 1);
    ctx.fillRect(f.x - 1 + flutter, y + 3, 3, 1);
    ctx.fillRect(f.x + flutter, y + 4, 1, 1);
    ctx.fillStyle = lo;
    ctx.fillRect(f.x + 2, y + 1, 1, 1);
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillRect(f.x - 2, y, 2, 1);
  }
  // Fairy lights between the flags.
  for (const [i, b] of bulbs.entries()) {
    const off = dead !== null && Math.abs(b.x - dead) <= 5 && Math.floor(t * 9) % 7 !== 0;
    const tw = info.party ? ((i + Math.floor(t * 8)) % 3 === 0 ? 1 : 0.4) : 1;
    ctx.fillStyle = off ? "#5a5050" : on ? (tw > 0.5 ? "#fff4c8" : "#d9c98a") : "#e9e2c8";
    ctx.fillRect(b.x, b.y + 1, 1, 1);
  }
}

// ------------------------------------------------------------------ lights at night

function staticLights(L: Layout): Light[] {
  return cached(`school|lights|${L.W}x${L.H}|${L.props.length}`, () => {
    const out: Light[] = [];
    // Hallway ceiling lights left on at night.
    for (const hy of L.net.halls) for (let x = 50; x < L.W; x += 130) out.push([x, hy, 46, 0.42, "#fff1cf", 0.06]);
    for (const ax of L.net.aisles) out.push([ax, Math.round(L.H * 0.72), 30, 0.3, "#fff1cf", 0.05]);
    const exit = wallItems(L).find((it) => it.poster === "exit");
    if (exit) out.push([exit.x + exit.w / 2, exit.y + exit.h / 2, 20, 0.75, "#ff5a4a", 0.38]);
    for (const p of L.props) {
      if (p.kind === "vending") out.push([p.x + 10, p.y + 20, 24, 0.65, "#e3d2ff", 0.16]);
      if (p.kind === "fridge") out.push([p.x + 10, p.y + 18, 18, 0.55, "#e9f6ff", 0.12]);
      if (p.kind === "cooler") out.push([p.x + 6, p.y + 5, 8, 0.6, "#7be08f", 0.18]);
    }
    return out;
  });
}

export function lights(L: Layout, info: PaintInfo): Light[] {
  void info;
  return staticLights(L);
}

/** After the darkness: the exit sign glows red at night. */
export function overlay(ctx: CanvasRenderingContext2D, L: Layout, info: PaintInfo): void {
  if (info.night < 0.25) return;
  const exit = wallItems(L).find((it) => it.poster === "exit");
  if (!exit) return;
  ctx.globalAlpha = Math.min(1, info.night * 1.2);
  drawPixelText(ctx, "EXIT", exit.x + 1, exit.y + 1, "#ff6a5a");
  ctx.globalAlpha = 1;
}

// ------------------------------------------------------------------ floor extras

interface Extra {
  kind: "hamster" | "easel" | "balls" | "cart" | "lostfound" | "cones" | "cabinet";
  x: number;
  y: number;
  w: number;
  h: number;
}

const SIZES: Record<Extra["kind"], [number, number]> = {
  hamster: [18, 14],
  easel: [14, 26],
  balls: [22, 8],
  cart: [22, 20],
  lostfound: [16, 12],
  cones: [18, 8],
  cabinet: [14, 24],
};

function extras(L: Layout): Extra[] {
  return cached(`school|extras|${L.W}x${L.H}|${L.props.length}|${L.spots.length}`, () => {
    const plan = floorPlan(L);
    const out: Extra[] = [];
    const room = (kind: string): Rect | undefined => L.rooms.find((r) => r.kind === kind)?.rect;
    const want: [Extra["kind"], Rect | undefined][] = [
      ["easel", room("lounge")],
      ["hamster", room("lounge")],
      ["cart", room("library") ?? room("lounge")],
      ["balls", L.games ?? undefined],
      ["cones", L.games ?? undefined],
      ["lostfound", room("waiting")],
      ["cabinet", room("boss")],
      ["hamster", room("pod")],
    ];
    const placed = new Set<Extra["kind"]>();
    for (const [kind, within] of want) {
      if (!within || placed.has(kind)) continue;
      const [w, h] = SIZES[kind];
      const ev = L.eventArea;
      const clear = (r: Rect) =>
        !(r.x < ev.x + ev.w && ev.x < r.x + r.w && r.y < ev.y + ev.h && ev.y < r.y + r.h) &&
        !out.some((o) => Math.abs(o.x - r.x) < 30 && Math.abs(o.y - r.y) < 30) &&
        !L.plants.some((pl) => {
          const pw = pl.sprite === "LARGE_PLANT" ? 32 : 16;
          const ph = pl.sprite === "LARGE_PLANT" ? 48 : 32;
          return r.x < pl.x + pw + 2 && pl.x - 2 < r.x + r.w && r.y < pl.y + ph && pl.y < r.y + r.h;
        });
      const spot = plan.find(w, h, 12, within).find(clear);
      if (!spot) continue;
      out.push({ kind, ...spot });
      placed.add(kind);
    }
    return out;
  });
}

function hamsterCage(): HTMLCanvasElement {
  return sprite("hamster-cage", 18, 14, (g) => {
    g.rect(1, 9, 16, 4, C.blue);
    g.rect(1, 9, 16, 1, C.blueHi);
    g.rect(2, 2, 14, 7, "#e9f2f8");
    for (let x = 2; x < 16; x += 2) g.vline(x, 2, 7, "#b8c2cc");
    g.rect(2, 1, 14, 1, C.blue);
    g.rect(3, 8, 12, 1, "#e8d9a8");
    g.rect(13, 6, 2, 2, "#7fb6ee");
  });
}

function easel(): HTMLCanvasElement {
  return sprite("easel", 14, 26, (g) => {
    g.rect(2, 9, 1, 16, C.mapleDk).rect(11, 9, 1, 16, C.mapleDk).rect(6, 20, 2, 6, C.mapleDk);
    g.rect(1, 1, 12, 15, C.paper);
    g.rect(1, 1, 12, 1, "#ffffff");
    drawText(g, "ABC", 2, 3, [C.red, C.blue, C.green]);
    g.rect(3, 10, 8, 1, "#c9d8ea").rect(3, 12, 6, 1, "#c9d8ea");
    g.set(10, 12, C.yellow).set(10, 13, C.yellow);
    g.rect(1, 16, 12, 2, C.maple);
  });
}

function drawText(g: Grid, s: string, x: number, y: number, colors: string[]): void {
  const glyphs: Record<string, string> = { A: "010101111101101", B: "110101110101110", C: "011100100100011" };
  s.split("").forEach((ch, i) => {
    const gl = glyphs[ch];
    if (!gl) return;
    for (let k = 0; k < 15; k++) if (gl[k] === "1") g.set(x + i * 4 + (k % 3), y + Math.floor(k / 3), colors[i % colors.length]!);
  });
}

function balls(): HTMLCanvasElement {
  return sprite("dodgeballs", 22, 8, (g) => {
    for (const [x, y, c] of [[3, 4, C.red], [10, 3, C.red], [17, 4, C.blue]] as const) {
      g.ellipse(x, y, 2.6, 2.6, c);
      g.set(x - 1, y - 1, "#ffffff");
    }
  });
}

function cones(): HTMLCanvasElement {
  return sprite("cones", 18, 8, (g) => {
    for (const x of [3, 13]) {
      g.rect(x - 2, 6, 5, 1, C.orange);
      g.rect(x - 1, 3, 3, 3, C.orange);
      g.set(x, 2, C.orange);
      g.rect(x - 1, 4, 3, 1, "#ffffff");
    }
  });
}

function bookCart(): HTMLCanvasElement {
  return sprite("book-cart", 22, 20, (g) => {
    g.rect(1, 6, 20, 2, C.mapleLo).rect(1, 13, 20, 2, C.mapleLo);
    g.rect(1, 6, 1, 10, C.mapleDk).rect(20, 6, 1, 10, C.mapleDk);
    let x = 2;
    let i = 0;
    while (x < 20) {
      const w = 1 + (i % 3 === 0 ? 1 : 0);
      g.rect(x, 1 + (i % 2), w, 5 - (i % 2), BOOKS[i % BOOKS.length]!);
      g.rect(x, 9 + ((i + 1) % 2), w, 4 - ((i + 1) % 2), BOOKS[(i + 4) % BOOKS.length]!);
      x += w;
      i++;
    }
    g.rect(2, 16, 2, 2, OUTLINE).rect(18, 16, 2, 2, OUTLINE);
  });
}

function fileCabinet(): HTMLCanvasElement {
  // The principal's filing cabinet, with a trophy on top.
  return sprite("file-cabinet", 14, 24, (g) => {
    g.rect(1, 6, 12, 17, "#9aa5b1");
    g.rect(1, 6, 12, 1, "#c9d1d9");
    for (const y of [8, 13, 18]) {
      g.rect(2, y, 10, 4, "#b7c0ca");
      g.rect(5, y + 1, 4, 1, "#6b7684");
      g.rect(6, y + 2, 2, 1, C.paper);
    }
    g.rect(4, 4, 6, 2, C.mapleDk);
    g.rect(5, 1, 4, 3, "#e8c14a").set(4, 1, "#e8c14a").set(9, 1, "#e8c14a");
    g.set(6, 1, "#fbe08a");
  });
}

function lostFound(): HTMLCanvasElement {
  return sprite("lost-found", 16, 12, (g) => {
    g.rect(1, 4, 14, 7, "#c9a06a");
    g.rect(1, 4, 14, 1, "#dfbb85");
    g.rect(4, 7, 8, 2, C.paper);
    g.rect(3, 1, 5, 4, C.red).rect(8, 2, 4, 3, C.green).set(12, 3, C.blue);
  });
}

export function decor(ctx: CanvasRenderingContext2D, L: Layout, info: PaintInfo): Drawable[] {
  const out: Drawable[] = [];
  for (const e of extras(L)) {
    const z = e.y + e.h;
    switch (e.kind) {
      case "hamster":
        out.push({
          z,
          draw: () => {
            ctx.drawImage(hamsterCage(), e.x, e.y);
            // The wheel spins; the hamster runs (or sleeps at night).
            const cx = e.x + 6;
            const cy = e.y + 5;
            ctx.fillStyle = "#9aa3ad";
            ctx.fillRect(cx - 2, cy - 2, 5, 1);
            ctx.fillRect(cx - 2, cy + 2, 5, 1);
            ctx.fillRect(cx - 3, cy - 1, 1, 3);
            ctx.fillRect(cx + 3, cy - 1, 1, 3);
            const awake = info.night < 0.5;
            const a = awake ? info.t * 7 : 0;
            ctx.fillStyle = "#c9ced6";
            ctx.fillRect(Math.round(cx + Math.cos(a) * 2), Math.round(cy + Math.sin(a) * 2), 1, 1);
            ctx.fillStyle = "#e8a050";
            if (awake) ctx.fillRect(cx, cy + 1 - (Math.floor(info.t * 8) % 2), 2, 1);
            else ctx.fillRect(e.x + 9, e.y + 7, 3, 1);
          },
        });
        break;
      case "easel":
        out.push({ z, draw: () => ctx.drawImage(easel(), e.x, e.y) });
        break;
      case "balls":
        out.push({ z, draw: () => ctx.drawImage(balls(), e.x, e.y) });
        break;
      case "cones":
        out.push({ z, draw: () => ctx.drawImage(cones(), e.x, e.y) });
        break;
      case "cart":
        out.push({ z, draw: () => ctx.drawImage(bookCart(), e.x, e.y) });
        break;
      case "lostfound":
        out.push({ z, draw: () => ctx.drawImage(lostFound(), e.x, e.y) });
        break;
      case "cabinet":
        out.push({ z, draw: () => ctx.drawImage(fileCabinet(), e.x, e.y) });
        break;
    }
  }
  return out;
}
