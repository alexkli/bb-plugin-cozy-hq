// School scenery: the baked backdrop. Speckled linoleum halls, painted block
// walls with lockers, cubbies and posters, ABC rugs under the classrooms,
// a cafeteria, a library corner, a gym floor and the principal's office.
import { cached, drawPixelText, Grid, mix, pa, pixelTextWidth, rect, rng, shade } from "../../themekit.ts";
import type { BackgroundSteps } from "../../theme.ts";
import type { Layout, Rect, Room } from "../../layout.ts";
import { BOOKS, C, CRAYONS, noise, OUTLINE, overlaps, stamp, wallFixtures } from "./kit.ts";

// ------------------------------------------------------------------ floors

/** Speckled vinyl tiles (the halls), with the odd accent tile. */
function linoleum(ctx: CanvasRenderingContext2D, r: Rect, a: string, b: string, grout: string, size = 10, accents = true, speckle = 26): void {
  const specks = [shade(a, -0.1), shade(a, 0.35), shade(b, -0.14)];
  const accent = ["#bcd3ea", "#f0c9b8", "#c7e3cf", "#f3e2a6"];
  for (let ty = 0; ty * size < r.h; ty++) {
    for (let tx = 0; tx * size < r.w; tx++) {
      const x = r.x + tx * size;
      const y = r.y + ty * size;
      const w = Math.min(size, r.x + r.w - x);
      const h = Math.min(size, r.y + r.h - y);
      const n = noise(Math.floor(x / size), Math.floor(y / size), 3);
      const base = accents && n < 0.035 ? accent[Math.floor(n * 1000) % accent.length]! : (tx + ty) % 2 ? a : b;
      rect(ctx, x, y, w, h, base);
      if (w === size) rect(ctx, x + size - 1, y, 1, h, grout);
      if (h === size) rect(ctx, x, y + size - 1, w, 1, grout);
    }
  }
  // Speckles
  const count = speckle > 0 ? Math.round((r.w * r.h) / speckle) : 0;
  const rand = rng(r.x * 7919 + r.y * 104729 + r.w + 1);
  for (let i = 0; i < count; i++) {
    const px = r.x + Math.floor(rand() * r.w);
    const py = r.y + Math.floor(rand() * r.h);
    rect(ctx, px, py, 1, 1, specks[i % specks.length]!);
  }
}

/** Wooden strips (classrooms, library, gym). */
function planks(ctx: CanvasRenderingContext2D, r: Rect, a: string, b: string, seam: string, rowH = 5, len = 40): void {
  for (let row = 0; row * rowH < r.h; row++) {
    const y = r.y + row * rowH;
    const h = Math.min(rowH, r.y + r.h - y);
    rect(ctx, r.x, y, r.w, h, row % 2 ? a : b);
    if (h === rowH) rect(ctx, r.x, y + rowH - 1, r.w, 1, seam);
    const off = (row * 17) % len;
    for (let x = r.x - off; x < r.x + r.w; x += len) {
      if (x > r.x) rect(ctx, x, y, 1, h - 1, seam);
      if (noise(x, y, 5) < 0.4 && x + 14 < r.x + r.w && x + 14 > r.x) rect(ctx, x + 14, y + 2, 3, 1, shade(row % 2 ? a : b, -0.05));
    }
  }
}

function carpetFleck(ctx: CanvasRenderingContext2D, r: Rect, base: string, fleck: string, edge?: string): void {
  rect(ctx, r.x, r.y, r.w, r.h, edge ?? base);
  const i0 = edge ? 2 : 0;
  rect(ctx, r.x + i0, r.y + i0, r.w - i0 * 2, r.h - i0 * 2, base);
  for (let y = r.y + 3; y < r.y + r.h - 3; y += 3) {
    for (let x = r.x + 3 + ((y - r.y) % 6 ? 1 : 0); x < r.x + r.w - 3; x += 4) if (noise(x, y, 9) < 0.55) rect(ctx, x, y, 1, 1, fleck);
  }
}

/** Carpet squares with the pile turned every other tile (library, reading corner). */
function carpetTiles(ctx: CanvasRenderingContext2D, r: Rect, a: string, b: string, fleck: string): void {
  const size = 12;
  for (let y = r.y; y < r.y + r.h; y += size) {
    for (let x = r.x; x < r.x + r.w; x += size) {
      const w = Math.min(size, r.x + r.w - x);
      const h = Math.min(size, r.y + r.h - y);
      const alt = ((x - r.x) / size + (y - r.y) / size) % 2 === 1;
      rect(ctx, x, y, w, h, alt ? a : b);
      for (let k = 2; k < (alt ? w : h) - 1; k += 3) {
        if (alt) rect(ctx, x + k, y + 1, 1, h - 2, fleck);
        else rect(ctx, x + 1, y + k, w - 2, 1, fleck);
      }
    }
  }
}

/** A colorful classroom rug of letter (or number) squares. */
function letterRug(ctx: CanvasRenderingContext2D, r: Rect, index: number): void {
  const border = [C.navy, "#3a7a5a", "#7a4a8a"][index % 3]!;
  rect(ctx, r.x, r.y, r.w, r.h, OUTLINE);
  rect(ctx, r.x + 1, r.y + 1, r.w - 2, r.h - 2, border);
  rect(ctx, r.x + 3, r.y + 3, r.w - 6, r.h - 6, "#f4ecd8");
  const cell = 12;
  const cols = Math.floor((r.w - 8) / cell);
  const rows = Math.floor((r.h - 8) / cell);
  const ox = r.x + Math.floor((r.w - cols * cell) / 2);
  const oy = r.y + Math.floor((r.h - rows * cell) / 2);
  const soft = CRAYONS.map((c) => mix(c, "#fff6e6", 0.4));
  const glyphs = index % 2 === 0 ? "ABCDEFGHIJKLMNOPQRSTUVWXYZ" : "1234567890+-";
  let k = 0;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const color = soft[(i + j * 2 + index) % soft.length]!;
      const x = ox + i * cell;
      const y = oy + j * cell;
      rect(ctx, x, y, cell - 1, cell - 1, color);
      rect(ctx, x, y, cell - 1, 1, shade(color, 0.18));
      const ch = glyphs[k++ % glyphs.length]!;
      drawPixelText(ctx, ch, x + 4, y + 3, shade(color, 0.55));
    }
  }
}

function rainbowRug(ctx: CanvasRenderingContext2D, cx: number, cy: number, rw: number, rh: number): void {
  const g = new Grid(rw, rh);
  const rings = [C.red, C.orange, C.yellow, C.green, C.blue, C.purple];
  g.ellipse(rw / 2 - 0.5, rh / 2 - 0.5, rw / 2 - 1, rh / 2 - 1, shade(C.red, -0.25));
  rings.forEach((c, i) => g.ellipse(rw / 2 - 0.5, rh / 2 - 0.5, rw / 2 - 2 - i * 7, rh / 2 - 2 - i * 3.5, mix(c, "#fff4e0", 0.18)));
  g.ellipse(rw / 2 - 0.5, rh / 2 - 0.5, rw / 2 - 2 - 6 * 7, rh / 2 - 2 - 6 * 3.5, "#fbf3df");
  stamp(ctx, g, cx - rw / 2, cy - rh / 2);
}

// ------------------------------------------------------------------ the back wall

interface WallItem {
  kind: "lockers" | "cubbies" | "poster";
  x: number;
  y: number;
  w: number;
  h: number;
  n: number;
  seed: number;
  poster?: PosterKind;
}

type PosterKind = "abc" | "hundred" | "drawing" | "read" | "map" | "exit" | "rules" | "planets";

const POSTER_SIZE: Record<PosterKind, [number, number]> = {
  abc: [27, 9],
  hundred: [15, 17],
  drawing: [12, 10],
  read: [17, 20],
  map: [21, 14],
  exit: [15, 7],
  rules: [14, 18],
  planets: [20, 12],
};

/** Where lockers, cubbies and posters fit on this layout's back wall. */
export function wallItems(L: Layout): WallItem[] {
  return cached(`school|wallitems|${L.W}x${L.H}|${L.props.length}`, () => {
    const fixtures = wallFixtures(L);
    const items: WallItem[] = [];
    const free = (r: Rect) => !fixtures.some((f) => overlaps(f, r)) && !items.some((it) => overlaps({ x: it.x - 3, y: it.y - 3, w: it.w + 6, h: it.h + 6 }, r));
    const runs = (sg: Layout["segments"][number], y: number, h: number): [number, number][] => {
      const out: [number, number][] = [];
      let start = -1;
      for (let x = sg.x0 + 2; x <= sg.x1 - 2; x++) {
        const ok = x < sg.x1 - 2 && free({ x, y, w: 1, h });
        if (ok && start < 0) start = x;
        if (!ok && start >= 0) {
          out.push([start, x]);
          start = -1;
        }
      }
      return out;
    };
    let seed = 1;
    let exitPlaced = false;
    for (const sg of L.segments) {
      const d = sg.depth;
      // Tall lockers where the wall is clear down to the floor.
      for (const [a, b] of runs(sg, d - 33, 33)) {
        const n = Math.floor((b - a - 1) / 7);
        if (n < 2) continue;
        const w = n * 7 + 1;
        items.push({ kind: "lockers", x: a + Math.floor((b - a - w) / 2), y: d - 32, w, h: 31, n, seed: seed++ });
      }
      // Low cubbies with backpacks where only the bottom is clear.
      for (const [a, b] of runs(sg, d - 16, 16)) {
        const n = Math.floor((b - a - 1) / 11);
        if (n < 2) continue;
        const w = n * 11 + 1;
        items.push({ kind: "cubbies", x: a + Math.floor((b - a - w) / 2), y: d - 15, w, h: 14, n, seed: seed++ });
      }
    }
    // Posters and drawings on the upper wall, a few per free stretch.
    const order: PosterKind[] = ["abc", "read", "hundred", "drawing", "map", "rules", "drawing", "planets", "drawing", "abc", "hundred", "drawing"];
    let k = 0;
    for (const sg of L.segments) {
      const d = sg.depth;
      for (let pass = 0; pass < 3; pass++) {
        for (let x = sg.x0 + 6; x < sg.x1 - 6; x += 3) {
          for (const y of [11, 14, 22, 30]) {
            if (!exitPlaced) {
              const [ew, eh] = POSTER_SIZE.exit;
              if (y + eh < d - 34 && free({ x, y, w: ew, h: eh })) {
                items.push({ kind: "poster", poster: "exit", x, y, w: ew, h: eh, n: 0, seed: seed++ });
                exitPlaced = true;
                continue;
              }
            }
            const kind = order[k % order.length]!;
            const [pw, ph] = POSTER_SIZE[kind];
            if (y + ph > d - 20 || x + pw > sg.x1 - 4) continue;
            const r = { x, y, w: pw, h: ph };
            if (!free(r)) continue;
            items.push({ kind: "poster", poster: kind, ...r, n: 0, seed: seed++ });
            k++;
          }
        }
      }
    }
    return items;
  });
}

function drawLockers(ctx: CanvasRenderingContext2D, it: WallItem): void {
  const colors = [C.blue, C.red, C.yellowLo, C.green];
  const body = colors[it.seed % colors.length]!;
  const hi = shade(body, 0.28);
  const lo = shade(body, -0.22);
  const g = new Grid(it.w, it.h + 1);
  g.rect(0, 0, it.w, it.h, OUTLINE);
  for (let i = 0; i < it.n; i++) {
    const x = 1 + i * 7;
    g.rect(x, 1, 6, it.h - 3, body);
    g.rect(x, 1, 6, 1, hi);
    g.vline(x, 2, it.h - 4, shade(body, 0.12));
    // Vents, number plate, handle
    for (let v = 0; v < 3; v++) g.rect(x + 1, 3 + v * 2, 4, 1, lo);
    g.rect(x + 2, 10, 2, 1, "#e9edf1");
    g.rect(x + 4, 14, 1, 4, "#cfd5dc").set(x + 4, 14, "#ffffff");
    for (let v = 0; v < 3; v++) g.rect(x + 1, it.h - 9 + v * 2, 4, 1, lo);
    const r = noise(it.seed, i, 4);
    if (r < 0.3) g.rect(x + 1, 19, 3, 2, ["#fff3a3", "#ffd1e0", "#d1f0ff"][i % 3]!); // a note
    else if (r < 0.45) g.set(x + 2, 20, C.yellowHi).set(x + 1, 21, C.yellowHi).set(x + 3, 21, C.yellowHi).set(x + 2, 22, C.yellowHi); // a star sticker
  }
  g.rect(0, it.h - 2, it.w, 2, "#4b5563");
  g.rect(0, it.h, it.w, 1, "rgba(40,30,40,0.25)");
  stamp(ctx, g, it.x, it.y);
}

function drawCubbies(ctx: CanvasRenderingContext2D, it: WallItem): void {
  const g = new Grid(it.w, it.h);
  g.rect(0, 0, it.w, it.h, OUTLINE);
  g.rect(1, 1, it.w - 2, it.h - 2, C.maple);
  g.rect(1, 1, it.w - 2, 1, C.mapleHi);
  for (let i = 0; i < it.n; i++) {
    const x = 1 + i * 11;
    g.rect(x + 1, 3, 9, it.h - 5, "#7a5236");
    g.rect(x + 2, 1, 7, 1, C.paper); // name tag
    g.set(x + 3, 1, CRAYONS[(i + it.seed) % CRAYONS.length]!).set(x + 4, 1, CRAYONS[(i + it.seed) % CRAYONS.length]!);
    if (i < it.n - 1) g.vline(x + 10, 2, it.h - 3, C.mapleLo);
    const r = noise(it.seed, i, 7);
    const bag = CRAYONS[(i * 2 + it.seed) % CRAYONS.length]!;
    if (r < 0.7) {
      // A backpack: body, flap, pocket
      g.rect(x + 2, 5, 7, 7, OUTLINE);
      g.rect(x + 3, 6, 5, 5, bag);
      g.rect(x + 3, 6, 5, 2, shade(bag, 0.2));
      g.rect(x + 4, 9, 3, 2, shade(bag, -0.2));
      g.set(x + 5, 4, OUTLINE).set(x + 4, 4, OUTLINE).set(x + 6, 4, OUTLINE);
    } else if (r < 0.85) {
      // A lunchbox
      g.rect(x + 2, 8, 7, 4, OUTLINE);
      g.rect(x + 3, 9, 5, 2, bag);
      g.rect(x + 4, 7, 3, 1, OUTLINE);
    } else {
      // Books
      g.rect(x + 2, 6, 2, 6, BOOKS[i % BOOKS.length]!).rect(x + 4, 7, 2, 5, BOOKS[(i + 3) % BOOKS.length]!).rect(x + 6, 6, 2, 6, BOOKS[(i + 5) % BOOKS.length]!);
    }
  }
  g.rect(1, it.h - 2, it.w - 2, 1, C.mapleLo);
  stamp(ctx, g, it.x, it.y);
}

let abcIndex = 0;
function drawPoster(ctx: CanvasRenderingContext2D, it: WallItem): void {
  const { x, y, w, h } = it;
  const tape = "rgba(250,240,200,0.85)";
  switch (it.poster) {
    case "abc": {
      // Alphabet cards: "Aa Bb Cc"
      const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      for (let i = 0; i < 3; i++) {
        const cx = x + i * 9;
        rect(ctx, cx, y, 8, h, OUTLINE);
        rect(ctx, cx + 1, y + 1, 6, h - 2, C.paper);
        rect(ctx, cx + 1, y + 1, 6, 1, CRAYONS[(abcIndex + i) % CRAYONS.length]!);
        drawPixelText(ctx, letters[(abcIndex + i) % 26]!, cx + 2, y + 2, CRAYONS[(abcIndex + i) % CRAYONS.length]!);
      }
      abcIndex += 3;
      break;
    }
    case "hundred": {
      // A hundreds chart.
      rect(ctx, x, y, w, h, OUTLINE);
      rect(ctx, x + 1, y + 1, w - 2, h - 2, C.paper);
      rect(ctx, x + 1, y + 1, w - 2, 6, C.blue);
      drawPixelText(ctx, "123", x + 2, y + 1, "#ffffff");
      for (let j = 0; j < 4; j++) {
        for (let i = 0; i < 6; i++) {
          const c = (i + j) % 5 === 0 ? C.yellow : (i * j) % 3 === 0 ? "#bcd3ea" : "#e3ddd0";
          rect(ctx, x + 2 + i * 2, y + 8 + j * 2, 1, 1, c);
        }
      }
      break;
    }
    case "rules": {
      rect(ctx, x, y, w, h, OUTLINE);
      rect(ctx, x + 1, y + 1, w - 2, h - 2, "#fff6d6");
      rect(ctx, x + 1, y + 1, w - 2, 4, C.green);
      for (let i = 0; i < 4; i++) {
        rect(ctx, x + 2, y + 7 + i * 3, 1, 1, CRAYONS[i]!);
        rect(ctx, x + 4, y + 7 + i * 3, w - 7 - (i % 2) * 2, 1, "#b9b0a2");
      }
      rect(ctx, x + w - 4, y + h - 4, 2, 2, C.red); // a heart, roughly
      break;
    }
    case "read": {
      rect(ctx, x, y, w, h, OUTLINE);
      rect(ctx, x + 1, y + 1, w - 2, h - 2, C.yellowHi);
      const word = "READ";
      word.split("").forEach((ch, i) => drawPixelText(ctx, ch, x + 1 + i * 4, y + 2, [C.red, C.blue, C.green, C.purple][i]!));
      // An open book
      rect(ctx, x + 3, y + 10, 11, 6, OUTLINE);
      rect(ctx, x + 4, y + 11, 4, 4, C.paper);
      rect(ctx, x + 9, y + 11, 4, 4, C.paper);
      rect(ctx, x + 5, y + 12, 2, 1, "#b9b0a2");
      rect(ctx, x + 10, y + 12, 2, 1, "#b9b0a2");
      rect(ctx, x + 3, y + 16, 11, 1, C.red);
      break;
    }
    case "map": {
      rect(ctx, x, y, w, h, OUTLINE);
      rect(ctx, x + 1, y + 1, w - 2, h - 2, "#8fc4ea");
      const land = "#86c97f";
      rect(ctx, x + 3, y + 3, 4, 3, land);
      rect(ctx, x + 4, y + 6, 2, 4, land);
      rect(ctx, x + 9, y + 3, 4, 2, land);
      rect(ctx, x + 10, y + 5, 3, 5, "#e6c27a");
      rect(ctx, x + 14, y + 3, 5, 4, land);
      rect(ctx, x + 16, y + 9, 3, 2, "#e6c27a");
      rect(ctx, x + 1, y + 1, w - 2, 1, "#b8dcf5");
      break;
    }
    case "planets": {
      rect(ctx, x, y, w, h, OUTLINE);
      rect(ctx, x + 1, y + 1, w - 2, h - 2, "#2a2f5a");
      rect(ctx, x + 2, y + 4, 3, 3, C.yellow);
      const pl = [["#c9a27a", 1], ["#e8b06a", 2], [C.blue, 2], [C.red, 1], ["#e3c08a", 3]] as const;
      let px = x + 6;
      for (const [c, s] of pl) {
        rect(ctx, px, y + 6 - Math.floor(s / 2), s, s, c);
        px += s + 1;
      }
      rect(ctx, x + 5, y + 9, 1, 1, "#ffffff");
      rect(ctx, x + 12, y + 2, 1, 1, "#ffffff");
      rect(ctx, x + 17, y + 9, 1, 1, "#ffffff");
      break;
    }
    case "exit": {
      rect(ctx, x, y, w, h, OUTLINE);
      rect(ctx, x + 1, y + 1, w - 2, h - 2, "#f4f1ea");
      drawPixelText(ctx, "EXIT", x + 1, y + 1, "#d43b34");
      break;
    }
    case "drawing":
    default: {
      // A kid's drawing on construction paper, taped at the corners.
      const papers = ["#fbfaf3", "#fff2c2", "#dff0ff", "#ffe0ea"];
      const s = it.seed;
      rect(ctx, x, y, w, h, OUTLINE);
      rect(ctx, x + 1, y + 1, w - 2, h - 2, papers[s % papers.length]!);
      switch (s % 4) {
        case 0: // house and sun
          rect(ctx, x + 2, y + 2, 2, 2, C.yellow);
          rect(ctx, x + 5, y + 5, 4, 3, C.red);
          rect(ctx, x + 4, y + 4, 6, 1, C.blue);
          rect(ctx, x + 6, y + 6, 1, 2, "#7a5236");
          rect(ctx, x + 1, y + h - 2, w - 2, 1, C.green);
          break;
        case 1: // rainbow
          rect(ctx, x + 2, y + 3, 8, 1, C.red);
          rect(ctx, x + 2, y + 4, 8, 1, C.yellow);
          rect(ctx, x + 2, y + 5, 8, 1, C.green);
          rect(ctx, x + 2, y + 6, 8, 1, C.blue);
          rect(ctx, x + 1, y + 7, 2, 1, "#ffffff");
          rect(ctx, x + 9, y + 7, 2, 1, "#ffffff");
          break;
        case 2: // a stick-figure family
          for (let i = 0; i < 3; i++) {
            const fx = x + 2 + i * 3;
            rect(ctx, fx, y + 3, 1, 1, "#e5a07a");
            rect(ctx, fx, y + 4, 1, 3, CRAYONS[(i + s) % CRAYONS.length]!);
          }
          rect(ctx, x + w - 3, y + 2, 1, 1, C.yellow);
          break;
        default: // a cat
          rect(ctx, x + 3, y + 4, 5, 3, C.orange);
          rect(ctx, x + 3, y + 3, 1, 1, C.orange);
          rect(ctx, x + 7, y + 3, 1, 1, C.orange);
          rect(ctx, x + 8, y + 5, 2, 1, C.orange);
          rect(ctx, x + 4, y + 5, 1, 1, OUTLINE);
          break;
      }
      rect(ctx, x - 1, y - 1, 2, 2, tape);
      rect(ctx, x + w - 1, y - 1, 2, 2, tape);
    }
  }
}

// ------------------------------------------------------------------ steps

export const BACKGROUND: Partial<BackgroundSteps> = {
  floor(ctx, L) {
    linoleum(ctx, { x: 0, y: 0, w: L.W, h: L.H }, "#ece4d2", "#e6ddca", "#d7ccb5");
    // Hallway lane lines.
    for (const hy of L.net.halls) {
      for (const dy of [-11, 10]) {
        rect(ctx, 0, hy + dy, L.W, 1, "#9dbfe0");
        rect(ctx, 0, hy + dy + 1, L.W, 1, "#b8d2ea");
      }
    }
  },
  wall(ctx, L) {
    abcIndex = 0;
    for (const sg of L.segments) {
      const d = sg.depth;
      const w = sg.x1 - sg.x0;
      // Painted cinder block.
      rect(ctx, sg.x0, 0, w, d, C.wall);
      for (let y = 4; y < d - 21; y += 6) {
        rect(ctx, sg.x0, y, w, 1, "#ece1c3");
        const off = (y / 6) % 2 ? 6 : 0;
        for (let x = sg.x0 + off; x < sg.x1; x += 12) rect(ctx, x, y - 5, 1, 5, "#efe5c9");
      }
      rect(ctx, sg.x0, 0, w, 2, "#ddd0ae");
      // Stripes: school blue and a yellow pinstripe.
      rect(ctx, sg.x0, d - 22, w, 3, C.blue);
      rect(ctx, sg.x0, d - 22, w, 1, C.blueHi);
      rect(ctx, sg.x0, d - 19, w, 1, C.yellow);
      // Glazed tile wainscot.
      rect(ctx, sg.x0, d - 18, w, 16, "#bfe0d6");
      for (let y = d - 18; y < d - 2; y += 4) {
        rect(ctx, sg.x0, y, w, 1, "#a9cfc4");
        for (let x = sg.x0 + ((y / 4) % 2 ? 3 : 0); x < sg.x1; x += 6) rect(ctx, x, y, 1, 4, "#a9cfc4");
      }
      rect(ctx, sg.x0, d - 17, w, 1, "#d6eee7");
      rect(ctx, sg.x0, d - 2, w, 2, "#4f6f69");
      ctx.fillStyle = "rgba(40,50,60,0.16)";
      ctx.fillRect(sg.x0, d, w, 3);
    }
    // Pillars, one with a fire alarm.
    L.wall.pillars.forEach((px, i) => {
      const left = L.segments.find((s) => s.x1 === px);
      const right = L.segments.find((s) => s.x0 === px);
      const d = Math.max(left?.depth ?? 64, right?.depth ?? 64);
      rect(ctx, px - 5, 0, 10, d + 4, "#efe6cd");
      rect(ctx, px - 5, 0, 2, d + 4, "#faf4e4");
      rect(ctx, px + 3, 0, 2, d + 4, "#d8cba9");
      rect(ctx, px - 6, d - 2, 12, 6, "#4f6f69");
      rect(ctx, px - 6, d + 3, 12, 1, OUTLINE);
      if (i === 0) {
        const y = d - 40;
        rect(ctx, px - 3, y, 6, 7, OUTLINE);
        rect(ctx, px - 2, y + 1, 4, 5, "#d6403a");
        rect(ctx, px - 2, y + 3, 4, 1, "#ffffff");
      }
    });
    for (const it of wallItems(L)) {
      if (it.kind === "lockers") drawLockers(ctx, it);
      else if (it.kind === "cubbies") drawCubbies(ctx, it);
      else drawPoster(ctx, it);
    }
  },
  pods(ctx, L) {
    L.pods.forEach((pod, i) => letterRug(ctx, { x: pod.x - 4, y: pod.y + 2, w: pod.w + 8, h: pod.h - 2 }, i));
  },
  room(ctx, room, L) {
    const r = room.rect;
    switch (room.kind) {
      case "meeting": {
        // A classroom: mint and cream tiles.
        linoleum(ctx, r, "#e3efdc", "#d8e9d3", "#c6dbc1", 8, false, 70);
        break;
      }
      case "boss": {
        carpetFleck(ctx, r, "#5d7aa8", "#6d8bb8");
        const rw = Math.min(r.w - 30, 110);
        const rh = Math.min(r.h - 40, 64);
        const g = new Grid(rw, rh);
        g.rrect(0, 0, rw, rh, "#7a2f38", 3);
        g.rrect(2, 2, rw - 4, rh - 4, "#a8404a", 2);
        g.rrect(5, 5, rw - 10, rh - 10, C.yellowLo, 1);
        g.rrect(6, 6, rw - 12, rh - 12, "#a8404a", 1);
        // An apple in the middle.
        const ax = Math.floor(rw / 2);
        const ay = Math.floor(rh / 2);
        g.ellipse(ax - 0.5, ay + 1, 4, 3.5, "#e5544b");
        g.rect(ax - 2, ay - 2, 1, 1, "#f2837a");
        g.rect(ax, ay - 4, 1, 2, "#7a5236").rect(ax + 1, ay - 4, 2, 1, C.green);
        stamp(ctx, g, r.x + Math.round((r.w - rw) / 2) + 6, r.y + 22);
        break;
      }
      case "waiting": {
        // The hallway by the principal's office and the nurse.
        rect(ctx, r.x, r.y, r.w, r.h, C.navy);
        linoleum(ctx, { x: r.x + 2, y: r.y + 2, w: r.w - 4, h: r.h - 4 }, "#f1ead9", "#d5e4f2", "#c6d6e6", 10, false, 0);
        break;
      }
      case "kitchen": {
        // Cafeteria checkerboard.
        rect(ctx, r.x, r.y, r.w, r.h, "#c9574d");
        linoleum(ctx, { x: r.x + 2, y: r.y + 2, w: r.w - 4, h: r.h - 4 }, "#f5ead8", "#f2c4b5", "#e6cdb9", 8, false, 0);
        break;
      }
      case "lounge": {
        // Library corner: honey wood and a rainbow reading rug.
        carpetTiles(ctx, r, "#a9cfc6", "#a2c8bf", "#b6d8cf");
        const c = L.couch;
        rainbowRug(ctx, Math.round(c.x + c.w / 2), c.y + 2, 124, 64);
        break;
      }
      case "games": {
        // The gym: maple strips and court lines.
        planks(ctx, r, "#ecc994", "#e6c28b", "#d6ad73", 4, 60);
        const inset = 6;
        const line = "#2f5f9e";
        const box = { x: r.x + inset, y: r.y + inset, w: r.w - inset * 2, h: r.h - inset * 2 };
        rect(ctx, box.x, box.y, box.w, 1, line);
        rect(ctx, box.x, box.y + box.h - 1, box.w, 1, line);
        rect(ctx, box.x, box.y, 1, box.h, line);
        rect(ctx, box.x + box.w - 1, box.y, 1, box.h, line);
        const cx = Math.round(r.x + r.w / 2);
        const cy = Math.round(r.y + r.h / 2);
        rect(ctx, cx, box.y, 1, box.h, "#d6403a");
        const g = new Grid(31, 21);
        g.ellipse(15, 10, 14, 9.5, "#d6403a");
        g.ellipse(15, 10, 13, 8.5, "#ecc994");
        g.ellipse(15, 10, 5, 3.5, C.yellow);
        stamp(ctx, g, cx - 15, cy - 10);
        // Keys at both ends
        const kh = Math.min(30, box.h - 10);
        for (const kx of [box.x, box.x + box.w - 22]) {
          ctx.fillStyle = "rgba(229,84,75,0.22)";
          ctx.fillRect(kx + 1, cy - kh / 2, 21, kh);
          rect(ctx, kx, cy - kh / 2, 22, 1, line);
          rect(ctx, kx, cy + kh / 2, 22, 1, line);
        }
        break;
      }
      case "garden": {
        // The school garden: grass, raised beds and stepping stones.
        for (let y = r.y; y < r.y + r.h; y += 4) {
          for (let x = r.x; x < r.x + r.w; x += 4) rect(ctx, x, y, 4, 4, ((x + y) >> 2) % 2 ? "#7fbf5e" : "#88c766");
        }
        for (let i = 0; i < (r.w * r.h) / 40; i++) rect(ctx, r.x + ((i * 37) % r.w), r.y + ((i * 53) % r.h), 1, 2, "#64a24c");
        const beds = Math.max(1, Math.floor((r.w - 20) / 50));
        for (let b = 0; b < beds; b++) {
          const bx = r.x + 12 + b * 50;
          const by = r.y + 10;
          rect(ctx, bx, by, 38, 16, OUTLINE);
          rect(ctx, bx + 1, by + 1, 36, 14, C.mapleLo);
          rect(ctx, bx + 3, by + 3, 32, 10, "#6b4a32");
          for (let x = bx + 5; x < bx + 34; x += 5) {
            rect(ctx, x, by + 5, 3, 2, "#5cb860");
            rect(ctx, x + 1, by + 4, 1, 1, "#8fd88a");
            rect(ctx, x, by + 9, 3, 2, "#5cb860");
            rect(ctx, x + 1, by + 11, 1, 1, b % 2 ? "#e5544b" : "#f39a3d");
          }
        }
        for (let x = r.x + 10; x < r.x + r.w - 10; x += 14) {
          const y = r.y + r.h - 18 + Math.round(Math.sin(x * 0.08) * 3);
          rect(ctx, x, y, 9, 5, "#d4cbb9");
          rect(ctx, x + 1, y, 7, 1, "#ebe4d6");
        }
        rect(ctx, r.x, r.y, r.w, 2, "#64a24c");
        break;
      }
      case "server": {
        // Computer lab closet: light anti-static tiles.
        linoleum(ctx, r, "#d5dbe2", "#cbd2da", "#b6bfc9", 8, false, 0);
        rect(ctx, r.x, r.y + r.h - 2, r.w, 2, C.blue);
        break;
      }
      case "library":
        carpetFleck(ctx, r, "#86b0dc", "#a3c5e8", "#5f8fc4");
        break;
      default:
        break;
    }
  },
  roomWalls(ctx, room, L) {
    const r = room.rect;
    if (!room.walls) return;
    const frame = room.walls === "wood" ? "#8a5a34" : C.blueLo;
    const pane = room.walls === "wood" ? "#efe4cf" : "#d6ebf8";
    const seg = L.segments.find((sg) => r.x >= sg.x0 && r.x < sg.x1);
    const atWall = seg !== undefined && r.y <= seg.depth + 1;
    for (const x of [r.x - 2, r.x + r.w - 1]) {
      rect(ctx, x, r.y - (atWall ? 2 : 6), 3, r.h + (atWall ? 2 : 6), frame);
      rect(ctx, x + 1, r.y - (atWall ? 2 : 6), 1, r.h + (atWall ? 2 : 6), pane);
    }
    if (!atWall) {
      const gap = room.doorSide === "top" ? room.doorX ?? -1 : -1;
      for (let x = r.x - 2; x < r.x + r.w + 1; x++) {
        if (gap >= 0 && x >= gap - 9 && x < gap + 9) continue;
        rect(ctx, x, r.y - 8, 1, 2, frame);
        rect(ctx, x, r.y - 6, 1, 5, pane);
        rect(ctx, x, r.y - 1, 1, 1, frame);
      }
    }
  },
  window(ctx, win, L) {
    const { x, y, w, h } = win;
    const index = L.wall.windows.indexOf(win);
    const g = new Grid(w + 2, h + 7);
    const frame = "#f4f6f8";
    const frameLo = "#d5dce4";
    g.rect(1, 1, w, h, frame);
    const mx = Math.floor(w / 2);
    const my = Math.floor(h * 0.36);
    g.rect(1, h - 1, w, 2, frameLo);
    // Sill
    g.rect(0, h + 1, w + 2, 3, "#e9e2d2");
    g.rect(0, h + 1, w + 2, 1, "#ffffff");
    g.rect(0, h + 4, w + 2, 1, "#c9bfa9");
    // Rolled-up shade along the top.
    g.rect(2, 1, w - 2, 3, "#f1e2b8");
    g.rect(2, 3, w - 2, 1, "#d9c48c");
    g.set(mx, 4, "#b39a5a").set(mx, 5, "#b39a5a");
    g.outline(OUTLINE);
    for (let j = 4; j < h - 2; j++) {
      for (let i = 5; i < w - 3; i++) {
        if (i === mx || j === my) continue;
        g.set(i, j, null);
      }
    }
    // The pull cord hangs over the glass a little.
    g.set(mx, 4, "#b39a5a");
    // Things on the sill.
    const sx = 4;
    if (index % 3 === 0) {
      // An apple and a sprout cup.
      g.rect(sx, h - 1, 4, 3, "#e5544b").set(sx + 1, h - 1, "#f2837a").set(sx + 2, h - 2, "#7a5236").set(sx + 3, h - 2, C.green);
      g.rect(w - 6, h - 1, 3, 3, "#ffffff").set(w - 6, h, C.blue).set(w - 5, h - 2, C.green).set(w - 6, h - 3, C.greenHi).set(w - 4, h - 3, C.greenHi);
    } else if (index % 3 === 1) {
      // Books and a pencil cup.
      g.rect(sx, h - 1, 6, 1, C.red).rect(sx, h, 6, 1, C.blue).rect(sx + 1, h - 2, 5, 1, C.yellow);
      g.rect(w - 6, h - 1, 3, 3, C.purple).set(w - 6, h - 2, C.yellow).set(w - 4, h - 3, C.red);
    } else {
      // Sprout cups.
      for (const cx of [sx, sx + 5, w - 8]) g.rect(cx, h - 1, 3, 3, "#ffffff").set(cx + 1, h - 2, C.green).set(cx, h - 3, C.greenHi).set(cx + 2, h - 3, C.greenHi);
    }
    stamp(ctx, g, x - 1, y - 1);
  },
  pinboard(ctx, r) {
    // A bulletin board: cork with a scalloped paper border.
    const { x, y, w, h } = r;
    const g = new Grid(w + 2, h + 2);
    g.rect(1, 1, w, h, C.cork);
    for (let i = 0; i < 300; i++) g.set(4 + ((i * 37) % (w - 6)), 4 + ((i * 53 + (i >> 3)) % (h - 6)), i % 3 ? "#c48f55" : "#e6bb84");
    const border = (i: number) => CRAYONS[Math.floor(i / 4) % CRAYONS.length]!;
    for (let i = 1; i <= w; i++) {
      const c = border(i);
      const bump = i % 4 === 1 || i % 4 === 2 ? 3 : 2;
      for (let k = 0; k < bump; k++) g.set(i, 1 + k, c).set(i, h - k, c);
    }
    for (let j = 1; j <= h; j++) {
      const c = border(j + 2);
      const bump = j % 4 === 1 || j % 4 === 2 ? 3 : 2;
      for (let k = 0; k < bump; k++) g.set(1 + k, j, c).set(w - k, j, c);
    }
    g.outline(OUTLINE);
    stamp(ctx, g, x - 1, y - 1);
  },
  calendar(ctx, c) {
    const g = new Grid(c.w + 2, c.h + 2);
    g.rect(1, 1, c.w, c.h, C.paper);
    g.rect(1, 1, c.w, 7, C.blue);
    g.rect(1, 8, c.w, 1, C.blueLo);
    for (let x = 4; x < c.w; x += 4) for (let yy = 10; yy < c.h; yy += 4) g.set(x, yy, "#e4e8ef");
    g.rect(1, c.h - 1, c.w, 2, C.paperLo);
    g.outline(OUTLINE);
    g.set(5, 0, "#9aa3ad").set(c.w - 4, 0, "#9aa3ad");
    stamp(ctx, g, c.x - 1, c.y - 1);
  },
  status(ctx, s) {
    // A tiny chalkboard.
    const b = new Grid(s.w + 2, s.h + 2);
    b.rect(1, 1, s.w, s.h, C.mapleLo);
    b.rect(2, 2, s.w - 2, s.h - 2, "#24443a");
    b.rect(2, 2, s.w - 2, 1, "#2e5246");
    b.outline(OUTLINE);
    stamp(ctx, b, s.x - 1, s.y - 1);
  },
  door(ctx, d) {
    // A classroom door: painted frame, wood slab, a narrow window and a kick plate.
    const g = new Grid(d.w + 6, d.h + 4);
    g.rect(0, 2, d.w + 6, d.h + 2, C.blueLo);
    g.rect(1, 2, 1, d.h + 2, C.blue);
    g.rect(3, 4, d.w, d.h, "#d6a466");
    for (let yy = 6; yy < d.h + 2; yy += 3) g.rect(4, yy, d.w - 2, 1, "#cc9858");
    g.rect(6, 7, 5, 16, OUTLINE);
    g.rect(7, 8, 3, 14, "#cfe6f5");
    g.set(7, 9, "#ffffff").set(7, 10, "#ffffff");
    g.rect(3, d.h - 3, d.w, 4, C.steel);
    g.rect(3, d.h - 3, d.w, 1, C.steelHi);
    g.rect(d.w - 2, 24, 3, 1, C.steelLo).set(d.w - 2, 25, C.steelLo);
    // A paper star with a name on it.
    g.set(d.w - 4, 11, C.yellow).rect(d.w - 5, 12, 3, 1, C.yellow).set(d.w - 4, 13, C.yellow);
    g.outline(OUTLINE);
    stamp(ctx, g, d.x - 3, d.y - 3);
    const sg = new Grid(14, 9);
    sg.rect(1, 1, 12, 7, C.green);
    sg.rect(1, 1, 12, 1, C.greenHi);
    sg.rect(6, 2, 2, 5, "#ffffff").rect(4, 4, 6, 1, "#ffffff");
    sg.outline(OUTLINE);
    stamp(ctx, sg, d.x + d.w / 2 - 7, Math.max(1, d.y - 12));
  },
  legend(ctx, n) {
    // An index card with a big "?", pinned.
    const g = new Grid(n.w + 2, n.h + 2);
    g.rect(1, 1, n.w, n.h, "#fff6c9");
    g.rect(1, 3, n.w, 1, "#f2a6a0");
    for (let yy = 5; yy < n.h; yy += 2) g.rect(1, yy, n.w, 1, "#d6e6f5");
    const qx = Math.floor(n.w / 2) - 1;
    const ink = C.blueLo;
    g.rect(qx, 4, 3, 1, ink).set(qx + 2, 5, ink).set(qx + 2, 6, ink).set(qx + 1, 7, ink).set(qx + 1, 9, ink).set(qx, 5, ink);
    g.outline(OUTLINE);
    stamp(ctx, g, n.x - 1, n.y - 1);
    rect(ctx, n.x + Math.floor(n.w / 2), n.y, 2, 2, C.red);
  },
  painting(ctx, p) {
    // Kids' art in place of paintings: a drawing the size of the frame.
    const src = pa(p.sprite);
    const s = src.getContext("2d")!.getImageData(0, 0, src.width, src.height).data;
    let x0 = src.width;
    let y0 = src.height;
    let x1 = 0;
    let y1 = 0;
    for (let yy = 0; yy < src.height; yy++) {
      for (let xx = 0; xx < src.width; xx++) {
        if (s[(yy * src.width + xx) * 4 + 3]! > 0) {
          x0 = Math.min(x0, xx);
          y0 = Math.min(y0, yy);
          x1 = Math.max(x1, xx);
          y1 = Math.max(y1, yy);
        }
      }
    }
    if (x1 <= x0) return;
    drawPoster(ctx, { kind: "poster", poster: "drawing", x: p.x + x0, y: p.y + y0, w: x1 - x0 + 1, h: y1 - y0 + 1, n: 0, seed: p.x + p.y });
  },
  clock(ctx, k) {
    // The school clock: black rim, white face.
    const { x, y, r } = k;
    const g = new Grid(r * 2 + 5, r * 2 + 5);
    const c = r + 2;
    g.ellipse(c, c, r, r, "#2b2b33");
    g.ellipse(c, c, r - 1.5, r - 1.5, "#ffffff");
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.set(c + Math.round(Math.sin(a) * (r - 2.6)), c - Math.round(Math.cos(a) * (r - 2.6)), i % 3 === 0 ? "#2b2b33" : "#9aa3ad");
    }
    g.outline(OUTLINE);
    stamp(ctx, g, x - c, y - c);
  },
};

export { pixelTextWidth };
