// Dusty Annex: the baked backdrop. Worn carpet tiles, cracked lino, peeling
// wallpaper with damp patches, a sagging ceiling, grimy sash windows with a
// broken blind, and the fixtures on the wall gone tired.

import type { BackgroundSteps } from "../../theme.ts";
import type { Layout, Rect, Room } from "../../layout.ts";
import { Grid, OUTLINE, hash, rect, rng, shade, mix } from "../../themekit.ts";
import { P } from "./pal.ts";

const T = 12; // carpet tile size

function put(ctx: CanvasRenderingContext2D, g: Grid, x: number, y: number): void {
  ctx.drawImage(g.toCanvas(), Math.round(x), Math.round(y));
}

/** An irregular blob of `color` (stains, damp, puddles), baked with fillRect. */
function blob(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, color: string, seed: number, clip?: Rect): void {
  const r = rng(seed);
  ctx.fillStyle = color;
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    const k = (y - cy) / ry;
    const half = Math.sqrt(Math.max(0, 1 - k * k)) * rx * (0.8 + r() * 0.35);
    let x0 = Math.round(cx - half);
    let x1 = Math.round(cx + half);
    if (clip) {
      if (y < clip.y || y >= clip.y + clip.h) continue;
      x0 = Math.max(x0, clip.x);
      x1 = Math.min(x1, clip.x + clip.w - 1);
    }
    if (x1 >= x0) ctx.fillRect(x0, y, x1 - x0 + 1, 1);
  }
}

/** A coffee ring on the floor. */
function floorRing(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(cx - 1, cy - 2, 3, 1);
  ctx.fillRect(cx - 1, cy + 2, 3, 1);
  ctx.fillRect(cx - 2, cy - 1, 1, 3);
  ctx.fillRect(cx + 2, cy - 1, 1, 3);
}

/** Carpet tiles in `r`, checker-laid with the pile turned, flecked, a few replaced. */
function carpetTiles(ctx: CanvasRenderingContext2D, r: Rect, a: string, b: string, seed: number, odd?: string): void {
  const rr = rng(seed);
  const seam = shade(mix(a, b, 0.5), -0.12);
  for (let ty = r.y; ty < r.y + r.h; ty += T) {
    for (let tx = r.x; tx < r.x + r.w; tx += T) {
      const k = (Math.floor((tx - r.x) / T) + Math.floor((ty - r.y) / T)) % 2;
      let base = k ? a : b;
      const roll = rr();
      if (odd && roll < 0.025) base = odd;
      else if (roll < 0.09) base = shade(base, 0.04);
      const w = Math.min(T, r.x + r.w - tx);
      const h = Math.min(T, r.y + r.h - ty);
      rect(ctx, tx, ty, w, h, base);
      const line = shade(base, -0.06);
      for (let i = 2; i < T - 1; i += 3) {
        if (k) {
          if (i < w) rect(ctx, tx + i, ty + 1, 1, Math.max(0, h - 2), line);
        } else if (i < h) rect(ctx, tx + 1, ty + i, Math.max(0, w - 2), 1, line);
      }
      for (let f = 0; f < 3; f++) {
        const fx = tx + Math.floor(rr() * w);
        const fy = ty + Math.floor(rr() * h);
        rect(ctx, fx, fy, 1, 1, rr() < 0.5 ? shade(base, 0.1) : shade(base, -0.14));
      }
      if (w === T) rect(ctx, tx + T - 1, ty, 1, h, seam);
      if (h === T) rect(ctx, tx, ty + T - 1, w, 1, seam);
    }
  }
}

/** Lino tiles with cracks, chips and a curled corner here and there. */
function lino(ctx: CanvasRenderingContext2D, r: Rect, a: string, b: string, size: number, seed: number): void {
  const rr = rng(seed);
  for (let ty = r.y; ty < r.y + r.h; ty += size) {
    for (let tx = r.x; tx < r.x + r.w; tx += size) {
      const k = (Math.floor((tx - r.x) / size) + Math.floor((ty - r.y) / size)) % 2;
      const base = k ? a : b;
      const w = Math.min(size, r.x + r.w - tx);
      const h = Math.min(size, r.y + r.h - ty);
      rect(ctx, tx, ty, w, h, base);
      rect(ctx, tx, ty, w, 1, shade(base, 0.08));
      rect(ctx, tx + w - 1, ty, 1, h, shade(base, -0.12));
      rect(ctx, tx, ty + h - 1, w, 1, shade(base, -0.12));
      for (let f = 0; f < 4; f++) rect(ctx, tx + Math.floor(rr() * w), ty + Math.floor(rr() * h), 1, 1, shade(base, rr() < 0.5 ? -0.1 : 0.06));
      const roll = rr();
      if (roll < 0.14 && w > 5 && h > 5) {
        // A hairline crack across the tile.
        let cx = tx + 1 + Math.floor(rr() * (w - 2));
        for (let cy = ty + 1; cy < ty + h - 1; cy++) {
          rect(ctx, cx, cy, 1, 1, shade(base, -0.32));
          cx += rr() < 0.4 ? (rr() < 0.5 ? -1 : 1) : 0;
          cx = Math.max(tx + 1, Math.min(tx + w - 2, cx));
        }
      } else if (roll < 0.2 && w > 4 && h > 4) {
        // A chipped corner: the screed shows through.
        rect(ctx, tx + w - 3, ty + h - 3, 2, 2, "#7d776a");
        rect(ctx, tx + w - 3, ty + h - 3, 2, 1, "#6a6458");
      }
    }
  }
}

/** Threadbare lanes where everybody walks. */
function wornLanes(ctx: CanvasRenderingContext2D, L: Layout): void {
  const r = rng(hash(`annex-lanes-${L.W}x${L.H}`));
  ctx.fillStyle = "rgba(170,160,120,0.16)";
  for (const hy of L.net.halls) {
    for (let x = 0; x < L.W; x += 1) {
      for (let dy = -5; dy <= 5; dy++) {
        const p = 1 - Math.abs(dy) / 6;
        if (r() < p * 0.55) ctx.fillRect(x, hy + dy, 1, 1);
      }
    }
  }
  for (const ax of L.net.aisles) {
    const top = L.segments.find((s) => ax >= s.x0 && ax < s.x1)?.depth ?? 60;
    for (let y = top; y < L.H; y++) {
      for (let dx = -4; dx <= 4; dx++) {
        const p = 1 - Math.abs(dx) / 5;
        if (r() < p * 0.5) ctx.fillRect(ax + dx, y, 1, 1);
      }
    }
  }
}

function floor(ctx: CanvasRenderingContext2D, L: Layout): void {
  carpetTiles(ctx, { x: 0, y: 0, w: L.W, h: L.H }, "#675f45", "#615941", hash(`annex-floor-${L.W}`), "#5e5d55");
  wornLanes(ctx, L);
  const r = rng(hash(`annex-stains-${L.W}x${L.H}`));
  // Spills and coffee rings.
  const n = Math.round((L.W * L.H) / 7000);
  for (let i = 0; i < n; i++) {
    const x = Math.floor(r() * L.W);
    const y = 60 + Math.floor(r() * (L.H - 60));
    if (r() < 0.55) blob(ctx, x, y, 2 + r() * 4, 1.5 + r() * 2.5, "rgba(48,36,20,0.3)", hash(`st${i}`));
    else floorRing(ctx, x, y, "rgba(48,36,20,0.4)");
  }
  // A couple of missing tiles: bare screed and old glue.
  const holes = Math.max(1, Math.round(L.W / 300));
  for (let i = 0; i < holes; i++) {
    const tx = Math.floor((r() * (L.W - 40) + 20) / T) * T;
    const ty = Math.floor((r() * (L.H - 120) + 100) / T) * T;
    rect(ctx, tx, ty, T, T, "#86817a");
    rect(ctx, tx, ty, T, 1, "#5f5a52");
    rect(ctx, tx, ty, 1, T, "#5f5a52");
    for (let k = 0; k < 4; k++) rect(ctx, tx + 2 + ((k * 5) % 8), ty + 2 + k * 2, 3, 1, "#77726a");
    rect(ctx, tx + 7, ty + 6, 2, 1, "#9a958c");
  }
}

// ------------------------------------------------------------------ the wall

const PAPERS = [
  { base: "#bcae88", stripe: "#b1a37d", dot: "#c8bb96" },
  { base: "#b8ad8c", stripe: "#ada283", dot: "#c4b997" },
  { base: "#c0b08a", stripe: "#b4a47e", dot: "#cbbd98" },
];

function wall(ctx: CanvasRenderingContext2D, L: Layout): void {
  L.segments.forEach((sg, i) => {
    const wp = PAPERS[i % PAPERS.length]!;
    const d = sg.depth;
    const x0 = sg.x0;
    const w = sg.x1 - sg.x0;
    const r = rng(hash(`annex-wall-${i}-${x0}-${L.W}`));
    // Wallpaper: faded stripes and a tiny motif.
    rect(ctx, x0, 0, w, d, wp.base);
    for (let x = x0 + 3; x < sg.x1; x += 12) {
      rect(ctx, x, 6, 1, d - 22, wp.stripe);
      rect(ctx, x + 2, 6, 1, d - 22, wp.stripe);
    }
    for (let y = 10; y < d - 18; y += 8) for (let x = x0 + 9 + ((y / 8) % 2) * 6; x < sg.x1 - 1; x += 12) rect(ctx, x, y, 1, 1, wp.dot);
    // Nicotine-yellow toward the ceiling.
    for (let y = 6; y < 16; y++) {
      ctx.fillStyle = `rgba(120,96,40,${0.1 * (1 - (y - 6) / 10)})`;
      ctx.fillRect(x0, y, w, 1);
    }
    // Damp patches running down from the ceiling, with tide marks.
    const damp = Math.max(1, Math.round(w / 170));
    for (let k = 0; k < damp; k++) {
      const cx = x0 + 14 + r() * (w - 28);
      const ry = 8 + r() * 10;
      const rx = 6 + r() * 8;
      const seed = hash(`damp${i}-${k}`);
      const clip = { x: x0, y: 6, w, h: d - 22 };
      blob(ctx, cx, 6 + ry * 0.6, rx + 1.5, ry + 1.5, "rgba(110,84,40,0.28)", seed, clip);
      blob(ctx, cx, 6 + ry * 0.55, rx, ry, "rgba(150,130,84,0.35)", seed, clip);
      blob(ctx, cx + 1, 6 + ry * 0.4, rx * 0.5, ry * 0.5, "rgba(120,100,60,0.22)", seed + 1, clip);
    }
    // Paper seams, a few peeling: a curled flap and bare plaster under it.
    for (let x = x0 + 22; x < sg.x1 - 6; x += 24) {
      rect(ctx, x, 6, 1, d - 22, shade(wp.base, 0.06));
      if (r() < 0.3) {
        const py = 8 + Math.floor(r() * (d - 34));
        const ph = 6 + Math.floor(r() * 6);
        // Bare plaster where the paper came away, and the curled flap beside it.
        for (let j = 0; j < ph; j++) {
          const ww = Math.max(1, Math.round((ph - j) * 0.6));
          rect(ctx, x - ww, py + j, ww, 1, shade(wp.base, 0.1));
        }
        for (let j = 0; j < ph - 1; j++) rect(ctx, x + 1, py + j, Math.max(1, Math.round((ph - j) * 0.4)), 1, shade(wp.base, 0.18));
        rect(ctx, x + 1, py + ph - 1, 2, 1, shade(wp.base, -0.22));
        rect(ctx, x, py, 1, ph, shade(wp.base, -0.15));
      }
    }
    // Hairline cracks.
    for (let k = 0; k < Math.round(w / 140); k++) {
      let cx = x0 + 10 + Math.floor(r() * (w - 20));
      let cy = 8 + Math.floor(r() * 8);
      const len = 6 + Math.floor(r() * 10);
      for (let j = 0; j < len && cy < d - 18; j++) {
        rect(ctx, cx, cy, 1, 1, "#8a7a58");
        cy++;
        if (r() < 0.5) cx += r() < 0.5 ? -1 : 1;
      }
    }
    // Ghosts of pictures that used to hang here.
    if (w > 120 && r() < 0.8) {
      const gx = x0 + 20 + Math.floor(r() * (w - 60));
      const gy = 18 + Math.floor(r() * 6);
      ctx.fillStyle = "rgba(225,214,180,0.45)";
      ctx.fillRect(gx, gy, 14, 10);
      rect(ctx, gx + 7, gy - 4, 1, 1, "#5a4a38");
    }
    // Sagging ceiling tiles along the top: water rings, one drooping, one missing.
    rect(ctx, x0, 0, w, 6, "#cfc7ab");
    rect(ctx, x0, 5, w, 1, "#a99f82");
    rect(ctx, x0, 6, w, 1, "rgba(60,48,30,0.25)");
    for (let x = x0 + 4 + (i * 7) % 18; x < sg.x1; x += 20) {
      rect(ctx, x, 0, 1, 6, "#a99f82");
      const roll = r();
      if (roll < 0.18 && x + 20 < sg.x1) {
        // Water-stained tile.
        blob(ctx, x + 10, 2.5, 5, 2.5, "rgba(140,108,58,0.35)", hash(`tile${x}`), { x: x + 1, y: 0, w: 19, h: 5 });
        rect(ctx, x + 6, 4, 6, 1, "rgba(120,88,40,0.5)");
      } else if (roll < 0.26 && x + 20 < sg.x1) {
        // A tile sagging into the room.
        rect(ctx, x + 1, 5, 19, 2, "#c4bb9d");
        rect(ctx, x + 4, 7, 13, 1, "#bdb496");
        rect(ctx, x + 1, 7, 3, 1, "#a99f82");
        rect(ctx, x + 4, 8, 13, 1, "#988e72");
      } else if (roll < 0.31 && x + 20 < sg.x1) {
        // A missing tile: the dark void and a dangling wire.
        rect(ctx, x + 1, 0, 19, 5, "#2b2620");
        rect(ctx, x + 3, 1, 8, 1, "#3a342b");
        rect(ctx, x + 12, 2, 1, 6, "#4a4a44");
        rect(ctx, x + 13, 7, 1, 2, "#4a4a44");
        rect(ctx, x + 12, 9, 2, 1, "#b08a3a");
      }
    }
    // Lower wall: tired institutional green dado with chips and scuffs.
    rect(ctx, x0, d - 16, w, 14, "#6c7356");
    rect(ctx, x0, d - 16, w, 2, "#6a5238");
    rect(ctx, x0, d - 16, w, 1, "#80664a");
    rect(ctx, x0, d - 13, w, 1, "#7a8162");
    for (let x = x0 + 6; x < sg.x1 - 6; x += 26) {
      const pw = Math.min(20, sg.x1 - 6 - x);
      rect(ctx, x, d - 11, pw, 7, "#666d51");
      rect(ctx, x, d - 11, pw, 1, "#5a6046");
      rect(ctx, x, d - 5, pw, 1, "#757c5e");
    }
    for (let k = 0; k < w / 18; k++) {
      const sx = x0 + Math.floor(r() * w);
      const sy = d - 12 + Math.floor(r() * 8);
      if (r() < 0.5) rect(ctx, sx, sy, 2 + Math.floor(r() * 3), 1, "#4f5540");
      else rect(ctx, sx, sy, 2, 2, "#b5a987");
    }
    rect(ctx, x0, d - 2, w, 2, "#4a3a2a");
    ctx.fillStyle = "rgba(30,20,10,0.25)";
    ctx.fillRect(x0, d, w, 3);
  });
  // Old cast-iron radiators under the windows, painted over a dozen times.
  for (const win of L.wall.windows) {
    const seg = L.segments.find((sg) => win.x >= sg.x0 && win.x < sg.x1);
    if (!seg) continue;
    const ry = seg.depth - 11;
    if (ry < win.y + win.h + 3) continue;
    const rx = win.x + 5;
    const rw = win.w - 10;
    rect(ctx, rx - 1, ry - 1, rw + 2, 10, OUTLINE);
    rect(ctx, rx, ry, rw, 8, "#b4a988");
    for (let x = rx + 1; x < rx + rw - 1; x += 3) rect(ctx, x + 1, ry + 1, 1, 6, "#8f8566");
    rect(ctx, rx, ry, rw, 1, "#cbc0a0");
    rect(ctx, rx + 2 + (win.x % 7), ry + 5, 3, 2, "#8a5a3a");
    rect(ctx, rx + rw - 4, ry + 2, 2, 1, "#8a5a3a");
    rect(ctx, rx - 3, ry + 6, 2, 2, P.metalLo);
  }
  // Pillars: painted concrete, chipped at knee height.
  for (const px of L.wall.pillars) {
    const left = L.segments.find((s) => s.x1 === px);
    const right = L.segments.find((s) => s.x0 === px);
    const d = Math.max(left?.depth ?? 64, right?.depth ?? 64);
    rect(ctx, px - 5, 0, 10, d + 4, "#bfb393");
    rect(ctx, px - 5, 0, 2, d + 4, "#cfc4a6");
    rect(ctx, px + 3, 0, 2, d + 4, "#a2977a");
    rect(ctx, px - 2, 14, 2, 3, "#9a8f72");
    rect(ctx, px + 1, d - 10, 3, 2, "#8f8468");
    rect(ctx, px - 6, d - 2, 12, 6, "#4a3a2a");
    rect(ctx, px - 6, d + 3, 12, 1, "#2f241a");
  }
  // A wall TV gets rabbit-ear antennas on top.
  const tv = L.props.find((p) => p.kind === "tv");
  if (tv && tv.z === 0) {
    const ax = tv.x + (tv.w ?? 120) - 22;
    const ay = tv.y;
    rect(ctx, ax - 3, ay - 2, 8, 2, "#3a342c");
    rect(ctx, ax - 2, ay - 3, 6, 1, "#4d463b");
    for (let k = 0; k < 8; k++) {
      rect(ctx, ax - 1 - k, ay - 4 - k, 1, 1, "#8c8e86");
      rect(ctx, ax + 2 + Math.round(k * 0.6), ay - 4 - k, 1, 1, "#8c8e86");
    }
    rect(ctx, ax - 9, ay - 12, 1, 1, "#c9c2a8");
    rect(ctx, ax + 6, ay - 12, 2, 1, P.tape);
  }
}

// ------------------------------------------------------------------ rooms

function pods(ctx: CanvasRenderingContext2D, L: Layout): void {
  const sets: [string, string, string][] = [
    ["#535a62", "#4f565e", "#655f4a"],
    ["#5d5a4a", "#585545", "#4f565e"],
  ];
  L.pods.forEach((pod, i) => {
    const [a, b, odd] = sets[i % sets.length]!;
    const r = { x: pod.x - 4, y: pod.y + 2, w: pod.w + 8, h: pod.h - 2 };
    carpetTiles(ctx, r, a, b, hash(`annex-pod-${i}`), odd);
    rect(ctx, r.x, r.y, r.w, 1, shade(a, -0.25));
    rect(ctx, r.x, r.y + r.h - 1, r.w, 1, shade(a, -0.25));
    rect(ctx, r.x, r.y, 1, r.h, shade(a, -0.25));
    rect(ctx, r.x + r.w - 1, r.y, 1, r.h, shade(a, -0.25));
  });
  // Chairs have worn the carpet bald where people sit.
  for (const d of L.desks) {
    const cx = d.chairX + 8;
    const cy = d.chairY + (d.side === "north" ? 12 : 10);
    blob(ctx, cx, cy, 8, 4, "rgba(160,150,120,0.16)", hash(`chairwear${d.index}`));
  }
}

function room(ctx: CanvasRenderingContext2D, room: Room, L: Layout): void {
  const r = room.rect;
  const seed = hash(`annex-room-${room.kind}-${r.x}-${r.y}`);
  const rr = rng(seed);
  switch (room.kind) {
    case "meeting": {
      carpetTiles(ctx, r, "#5f6656", "#5a6152", seed, "#676047");
      // The table has rubbed a pale patch; tea spilled under it.
      blob(ctx, r.x + r.w / 2, r.y + r.h / 2, r.w * 0.3, r.h * 0.18, "rgba(170,165,130,0.12)", seed + 3);
      blob(ctx, r.x + r.w * 0.35, r.y + r.h * 0.6, 4, 2, "rgba(48,36,20,0.3)", seed + 4);
      break;
    }
    case "boss": {
      // Your corner: an old brown carpet and a threadbare rug, the worst stains in the building.
      carpetTiles(ctx, r, "#5b4a3a", "#564637", seed, "#4f4d47");
      const rugW = Math.min(r.w - 30, 110);
      const rugH = Math.min(r.h - 40, 64);
      const rug = new Grid(rugW, rugH);
      rug.rrect(0, 0, rugW, rugH, "#6a3a30", 2);
      rug.rrect(2, 2, rugW - 4, rugH - 4, "#7f4a3a", 1);
      rug.rect(5, 5, rugW - 10, rugH - 10, "#8a6a3e");
      rug.rect(6, 6, rugW - 12, rugH - 12, "#7f4a3a");
      for (let y = 9; y < rugH - 9; y += 6) for (let x = 9 + (y % 12 ? 3 : 0); x < rugW - 9; x += 6) rug.set(x, y, "#8a6a3e");
      // Worn threadbare in front of the desk, frayed fringe and a hole.
      rug.ellipse(rugW / 2 - 6, rugH * 0.55, rugW * 0.2, rugH * 0.16, "#8a5a48");
      rug.ellipse(rugW / 2 - 6, rugH * 0.55, rugW * 0.12, rugH * 0.09, "#946a54");
      for (let k = 0; k < 14; k++) rug.set(Math.floor(rugW * 0.3 + rr() * rugW * 0.3), Math.floor(rugH * 0.42 + rr() * rugH * 0.26), "#a07a62");
      for (let x = 2; x < rugW - 2; x += 2) {
        if (rr() < 0.7) rug.set(x, rugH - 1, "#c9b48a");
        if (rr() < 0.7) rug.set(x, 0, "#c9b48a");
      }
      rug.rect(rugW - 20, rugH - 16, 3, 2, "#3a2a22");
      put(ctx, rug, r.x + Math.round((r.w - rugW) / 2) + 6, r.y + 22);
      for (let k = 0; k < 6; k++) floorRing(ctx, r.x + 10 + Math.floor(rr() * (r.w - 20)), r.y + 10 + Math.floor(rr() * (r.h - 20)), "rgba(40,28,16,0.45)");
      blob(ctx, r.x + r.w * 0.7, r.y + r.h * 0.75, 6, 3, "rgba(40,28,16,0.35)", seed + 9);
      break;
    }
    case "waiting": {
      // The corridor: scuffed speckled lino and a rubber runner.
      lino(ctx, r, "#77745f", "#72705b", 16, seed);
      for (let k = 0; k < (r.w * r.h) / 25; k++) rect(ctx, r.x + Math.floor(rr() * r.w), r.y + Math.floor(rr() * r.h), 1, 1, rr() < 0.5 ? "#67644f" : "#87836d");
      for (let k = 0; k < (r.w * r.h) / 900; k++) {
        const sx = r.x + Math.floor(rr() * (r.w - 8));
        const sy = r.y + Math.floor(rr() * r.h);
        rect(ctx, sx, sy, 3 + Math.floor(rr() * 6), 1, "#4f4a3c");
      }
      rect(ctx, r.x, r.y, r.w, 1, "#5f5a48");
      break;
    }
    case "kitchen": {
      // Kitchenette: cracked lino tiles, a dark patch by the fridge.
      lino(ctx, r, "#9a8f72", "#83785e", 10, seed);
      blob(ctx, r.x + r.w - 40, r.y + 18, 10, 4, "rgba(60,44,24,0.25)", seed + 2);
      for (let k = 0; k < 4; k++) blob(ctx, r.x + 8 + Math.floor(rr() * (r.w - 16)), r.y + 20 + Math.floor(rr() * (r.h - 26)), 2 + rr() * 2, 1.5, "rgba(60,40,20,0.3)", seed + 10 + k);
      break;
    }
    case "lounge": {
      // A tired oval rug under the sofa, faded, with a scorch mark and a fraying edge.
      const c = L.couch;
      const rw = 124;
      const rh = 64;
      const g = new Grid(rw, rh);
      g.ellipse(rw / 2 - 0.5, rh / 2 - 0.5, rw / 2 - 2, rh / 2 - 2, "#6e5a3a");
      g.ellipse(rw / 2 - 0.5, rh / 2 - 0.5, rw / 2 - 6, rh / 2 - 5, "#8a7448");
      g.ellipse(rw / 2 - 0.5, rh / 2 - 0.5, rw / 2 - 12, rh / 2 - 10, "#7a6440");
      g.ellipse(rw / 2 - 0.5, rh / 2 - 0.5, rw / 2 - 20, rh / 2 - 15, "#857048");
      for (let k = 0; k < rw * rh * 0.06; k++) {
        const x = Math.floor(rr() * rw);
        const y = Math.floor(rr() * rh);
        if (g.get(x, y)) g.set(x, y, rr() < 0.5 ? "#937d52" : "#6a5636");
      }
      for (let k = 0; k < 40; k++) {
        const a = rr() * Math.PI * 2;
        g.set(Math.round(rw / 2 + Math.cos(a) * (rw / 2 - 1)), Math.round(rh / 2 + Math.sin(a) * (rh / 2 - 1)), "#a08a5a");
      }
      g.ellipse(rw * 0.78, rh * 0.62, 3, 2, "#4a3a28");
      g.ellipse(rw * 0.78, rh * 0.62, 1.5, 1, "#2f241a");
      put(ctx, g, c.x + c.w / 2 - rw / 2, c.y - 30);
      break;
    }
    case "games": {
      carpetTiles(ctx, r, "#4f5650", "#4b524c", seed, "#5f5843");
      blob(ctx, r.x + r.w * 0.4, r.y + r.h * 0.6, 7, 3, "rgba(40,30,20,0.3)", seed + 1);
      break;
    }
    case "library": {
      // The archive: dusty brown carpet.
      carpetTiles(ctx, r, "#5f5240", "#5a4d3c", seed, "#55574f");
      break;
    }
    case "server": {
      // The cupboard: bare concrete and cable spaghetti.
      rect(ctx, r.x, r.y, r.w, r.h, "#4a4943");
      for (let k = 0; k < (r.w * r.h) / 12; k++) rect(ctx, r.x + Math.floor(rr() * r.w), r.y + Math.floor(rr() * r.h), 1, 1, rr() < 0.5 ? "#55544d" : "#403f3a");
      for (let y = r.y + 10; y < r.y + r.h; y += 14) rect(ctx, r.x, y, r.w, 1, "#3d3c37");
      const colors = ["#6b6b66", "#3e5a7a", "#a89a3a", "#7a3a30", "#8a8a84"];
      for (let c = 0; c < 6; c++) {
        let x = r.x + 4 + Math.floor(rr() * (r.w - 8));
        let y = r.y + r.h - 3;
        ctx.fillStyle = colors[c % colors.length]!;
        for (let k = 0; k < r.w + r.h; k++) {
          ctx.fillRect(x, y, 1, 1);
          const dir = rr();
          if (dir < 0.45) x += rr() < 0.5 ? -1 : 1;
          else if (dir < 0.8) y -= 1;
          else x += c % 2 ? 1 : -1;
          x = Math.max(r.x + 1, Math.min(r.x + r.w - 2, x));
          if (y < r.y + 2) break;
        }
      }
      // A cold strip light along the front, half dead.
      rect(ctx, r.x, r.y + r.h - 2, r.w, 2, "#3a3a34");
      rect(ctx, r.x + 2, r.y + r.h - 2, Math.round(r.w * 0.4), 1, "#9ab0a8");
      break;
    }
    case "garden": {
      // The yard: cracked paving slabs with weeds in the gaps.
      lino(ctx, r, "#8a877c", "#827f74", 14, seed);
      for (let k = 0; k < r.w / 6; k++) {
        const x = r.x + Math.floor(rr() * r.w);
        const y = r.y + Math.floor(rr() * r.h);
        rect(ctx, x, y, 1, 2, "#5f7044");
        rect(ctx, x + 1, y + 1, 1, 1, "#71824f");
      }
      blob(ctx, r.x + r.w * 0.3, r.y + r.h * 0.7, 8, 3, "rgba(70,80,90,0.3)", seed + 5);
      rect(ctx, r.x, r.y, r.w, 2, "#5f5c52");
      break;
    }
    case "pod":
    default:
      break;
  }
}

function roomWalls(ctx: CanvasRenderingContext2D, room: Room, L: Layout): void {
  const r = room.rect;
  if (!room.walls) return;
  const wood = room.walls === "wood";
  const frame = wood ? "#5a4332" : "#7c7e76";
  const pane = wood ? "#c2b795" : "#aeb8b2";
  const seg = L.segments.find((sg) => r.x >= sg.x0 && r.x < sg.x1);
  const atWall = seg !== undefined && r.y <= seg.depth + 1;
  for (const x of [r.x - 2, r.x + r.w - 1]) {
    rect(ctx, x, r.y - (atWall ? 2 : 6), 3, r.h + (atWall ? 2 : 6), frame);
    rect(ctx, x + 1, r.y - (atWall ? 2 : 6), 1, r.h + (atWall ? 2 : 6), pane);
    // Fingerprints and a smear.
    for (let y = r.y + 6; y < r.y + r.h - 6; y += 17) rect(ctx, x + 1, y, 1, 3, wood ? "#a89a74" : "#8f9a94");
  }
  if (!atWall) {
    const gap = room.doorSide === "top" ? room.doorX ?? -1 : -1;
    for (let x = r.x - 2; x < r.x + r.w + 1; x++) {
      if (gap >= 0 && x >= gap - 9 && x < gap + 9) continue;
      rect(ctx, x, r.y - 8, 1, 2, frame);
      rect(ctx, x, r.y - 6, 1, 5, (x * 7) % 23 < 3 ? (wood ? "#ab9f7c" : "#c4ccc6") : pane);
      rect(ctx, x, r.y - 1, 1, 1, frame);
    }
  }
}

// ------------------------------------------------------------------ windows and fixtures

function window(ctx: CanvasRenderingContext2D, win: Rect): void {
  const { x, y, w, h } = win;
  const g = new Grid(w + 4, h + 8);
  const fr = "#b2a682";
  const frHi = "#c8bd99";
  const frLo = "#8e8362";
  // Frame and the meeting rail of a sash window.
  g.rect(2, 1, w, h, fr);
  g.rect(2, 1, w, 1, frHi);
  g.rect(2, 1, 1, h, frHi);
  g.rect(w + 1, 1, 1, h, frLo);
  const my = Math.floor(h / 2) + 1;
  g.rect(2, my, w, 2, fr).rect(2, my, w, 1, frHi);
  // The sill, deeper than the frame, paint flaking.
  g.rect(0, h + 1, w + 4, 3, "#a3987a");
  g.rect(0, h + 1, w + 4, 1, "#c2b796");
  g.rect(1, h + 4, w + 2, 1, "#7d7358");
  g.outline(OUTLINE);
  // Clear the glass (two sashes).
  for (let j = 4; j <= h - 2; j++) {
    for (let i = 6; i <= w - 2; i++) {
      if (j === my || j === my + 1) continue;
      g.set(i, j, null);
    }
  }
  // Flaking paint.
  const r = rng(hash(`annex-win-${x}`));
  for (let k = 0; k < 6; k++) {
    const px = 2 + Math.floor(r() * w);
    const py = 1 + Math.floor(r() * h);
    if (g.get(px, py) === fr) g.set(px, py, "#8a7f62");
  }
  // A blind, broken: bunched crooked at the top, one end hanging loose.
  const gx0 = 6;
  const gx1 = w - 2;
  for (let i = gx0; i <= gx1; i++) {
    const k = (i - gx0) / (gx1 - gx0);
    const drop = Math.round((1 - k) * 3);
    g.set(i, 3, "#6e6a5a");
    for (let s = 0; s < 2 + drop; s++) g.set(i, 4 + s, s % 2 ? "#a8a086" : "#d4ccb2");
  }
  // Slats dangling at a slant.
  const loose = r() < 0.5;
  const lx = loose ? gx1 - 6 : gx0 + 8;
  for (let s = 0; s < 4; s++) {
    for (let k = 0; k < 7; k++) {
      const px = lx + (loose ? -k : k) + (loose ? s : -s);
      const py = 6 + s * 2 + Math.round(k * 0.6);
      if (py < my) g.set(px, py, k % 3 === 0 ? "#a8a086" : "#d4ccb2");
    }
  }
  // The cord.
  const cx = loose ? gx0 + 2 : gx1 - 2;
  for (let j = 5; j < my + 6 && j < h - 1; j++) g.set(cx, j, "#e4dcc0");
  g.set(cx, Math.min(h - 2, my + 6), "#8a7f62");
  const c = g.toCanvas();
  const cc = c.getContext("2d")!;
  // Grime on the glass, mostly in the corners and low down.
  for (let j = 4; j <= h - 2; j++) {
    for (let i = 6; i <= w - 2; i++) {
      if (g.get(i, j) !== null) continue;
      const corner = Math.min(i - 6, w - 2 - i, j - 4, h - 2 - j);
      const low = (j - 4) / (h - 5);
      const a = corner < 2 ? 0.22 : low > 0.85 ? 0.12 : (i * 13 + j * 7) % 31 === 0 ? 0.12 : 0;
      if (a > 0) {
        cc.fillStyle = `rgba(110,100,72,${a})`;
        cc.fillRect(i, j, 1, 1);
      }
    }
  }
  // A crack across one pane, taped.
  if (r() < 0.45) {
    let px = 8 + Math.floor(r() * (w - 16));
    for (let j = my + 3; j < h - 2; j++) {
      cc.fillStyle = "rgba(240,240,230,0.5)";
      cc.fillRect(px, j, 1, 1);
      px += r() < 0.5 ? 1 : 0;
    }
    cc.fillStyle = "rgba(205,191,143,0.85)";
    cc.fillRect(px - 3, my + 6, 6, 2);
  }
  ctx.drawImage(c, x - 2, y - 1);
  // Bits on the sill: a dead plant, a mug, dead flies.
  const sy = y + h + 1;
  const kind = hash(`sill${x}`) % 3;
  if (kind === 0) {
    rect(ctx, x + 4, sy - 4, 5, 4, OUTLINE);
    rect(ctx, x + 5, sy - 3, 3, 3, "#9a5a3a");
    rect(ctx, x + 5, sy - 7, 1, 3, P.leafDead);
    rect(ctx, x + 7, sy - 6, 1, 2, P.leafDry);
    rect(ctx, x + 6, sy - 8, 1, 1, P.leafDead);
  } else if (kind === 1) {
    rect(ctx, x + w - 10, sy - 4, 5, 4, OUTLINE);
    rect(ctx, x + w - 9, sy - 3, 3, 3, "#d8d0bc");
    rect(ctx, x + w - 9, sy - 3, 3, 1, P.stain);
    rect(ctx, x + w - 5, sy - 2, 1, 1, OUTLINE);
  }
  rect(ctx, x + 12, sy, 1, 1, "#2a2420");
  rect(ctx, x + 19, sy + 1, 1, 1, "#2a2420");
}

function pinboard(ctx: CanvasRenderingContext2D, r: Rect): void {
  const { x, y, w, h } = r;
  const g = new Grid(w + 2, h + 2);
  g.rect(1, 1, w, h, "#5e4a34");
  g.rect(1, 1, w, 1, "#76603f");
  g.rect(4, 4, w - 6, h - 6, "#9d7d52");
  const rr = rng(hash(`annex-pin-${w}`));
  for (let i = 0; i < w * h * 0.25; i++) g.set(4 + Math.floor(rr() * (w - 6)), 4 + Math.floor(rr() * (h - 6)), rr() < 0.6 ? "#8a6c45" : "#ae8d60");
  // Sun-faded rectangles where old notices hung, and stray pins.
  g.rect(w - 30, h - 16, 14, 10, "#ab8f66");
  g.rect(12, h - 12, 10, 7, "#ab8f66");
  for (let i = 0; i < 9; i++) g.set(6 + Math.floor(rr() * (w - 12)), 6 + Math.floor(rr() * (h - 12)), ["#8e3b32", "#4c5d70", "#c8bc97"][i % 3]!);
  g.rect(w - 6, 2, 4, 2, "#4f3d2a");
  g.outline(OUTLINE);
  put(ctx, g, x - 1, y - 1);
}

function calendar(ctx: CanvasRenderingContext2D, c: Rect): void {
  const g = new Grid(c.w + 2, c.h + 3);
  g.rect(1, 1, c.w, c.h, "#ded6bd");
  g.rect(1, 1, c.w, 7, "#7a3a30");
  g.rect(1, 7, c.w, 1, "#5e2c25");
  g.rect(1, c.h - 1, c.w, 2, "#c9c0a4");
  // Curled bottom corner, old pages bunched behind.
  g.set(c.w, c.h, null).set(c.w - 1, c.h, "#bfb595").set(c.w, c.h - 1, "#bfb595");
  g.rect(2, c.h + 1, c.w - 2, 1, "#b8ae8f");
  g.outline(OUTLINE);
  put(ctx, g, c.x - 1, c.y - 1);
  rect(ctx, c.x + Math.floor(c.w / 2), c.y - 3, 1, 2, "#5a4a38");
}

function status(ctx: CanvasRenderingContext2D, s: Rect): void {
  // An old beige box with a dim little screen.
  const b = new Grid(s.w + 2, s.h + 3);
  b.rect(1, 1, s.w, s.h + 1, P.beigeLo);
  b.rect(1, 1, s.w, 1, P.beige);
  b.rect(2, 2, s.w - 2, s.h - 2, "#12140f");
  b.rect(2, s.h, s.w - 2, 1, P.beigeDk);
  b.set(s.w - 1, s.h + 1, "#6a8a4a");
  b.outline(OUTLINE);
  put(ctx, b, s.x - 1, s.y - 1);
}

function door(ctx: CanvasRenderingContext2D, d: Rect): void {
  // A heavy old fire door: chipped paint, wired glass, a scuffed kick plate.
  const g = new Grid(d.w + 6, d.h + 4);
  g.rect(0, 2, d.w + 6, d.h + 2, "#4f3f2e");
  g.rect(1, 2, d.w + 4, 1, "#665238");
  g.rect(3, 4, d.w, d.h, "#7a6a4f");
  g.rect(3, 4, d.w, 1, "#8c7b5c");
  g.rect(3, 4, 1, d.h, "#8c7b5c");
  // Wired glass panel.
  g.rect(7, 8, d.w - 8, 12, "#4a4f4a");
  g.rect(8, 9, d.w - 10, 10, "#9aa69e");
  for (let yy = 9; yy < 19; yy += 3) g.rect(8, yy, d.w - 10, 1, "#7f8a82");
  for (let xx = 9; xx < d.w - 2; xx += 3) g.rect(xx, 9, 1, 10, "#7f8a82");
  g.set(9, 10, "#c9d2ca").set(10, 11, "#c9d2ca");
  // Push plate and kick plate.
  g.rect(d.w - 2, 22, 2, 6, P.metal);
  g.rect(4, d.h - 6, d.w - 2, 5, P.metalLo);
  g.rect(4, d.h - 6, d.w - 2, 1, P.metal);
  for (let k = 0; k < 5; k++) g.set(5 + k * 3, d.h - 4 + (k % 2), P.metalDk);
  // Chips.
  g.set(6, 24, "#a89a7a").set(7, 24, "#a89a7a").set(d.w, 30, "#a89a7a");
  g.outline(OUTLINE);
  put(ctx, g, d.x - 3, d.y - 3);
  // The sign above: a dull green box with a "+".
  const sg = new Grid(14, 9);
  sg.rect(1, 1, 12, 7, "#3f5a40");
  sg.rect(1, 1, 12, 1, "#4f6e50");
  sg.rect(6, 2, 2, 5, "#cfe3b8").rect(4, 4, 6, 1, "#cfe3b8");
  sg.set(11, 6, "#2f4430");
  sg.outline(OUTLINE);
  put(ctx, sg, d.x + d.w / 2 - 7, Math.max(1, d.y - 12));
}

function legend(ctx: CanvasRenderingContext2D, n: Rect): void {
  // A sun-yellowed sticky note, one corner curling.
  const g = new Grid(n.w + 2, n.h + 2);
  g.rect(1, 1, n.w, n.h, "#e2d27a");
  g.rect(1, 1, n.w, 2, "#cdb95c");
  const qx = Math.floor(n.w / 2) - 1;
  g.rect(qx, 4, 3, 1, "#5e5026").set(qx + 2, 5, "#5e5026").set(qx + 1, 6, "#5e5026").set(qx + 1, 8, "#5e5026");
  g.set(n.w, n.h, null).set(n.w - 1, n.h, "#bfae58").set(n.w, n.h - 1, "#bfae58");
  g.outline(OUTLINE);
  put(ctx, g, n.x - 1, n.y - 1);
  rect(ctx, n.x + Math.floor(n.w / 2), n.y, 2, 2, "#4c5d70");
}

function painting(ctx: CanvasRenderingContext2D, p: Layout["wall"]["paintings"][number]): void {
  // A sun-bleached print in a cheap frame, hanging crooked.
  const big = p.sprite === "LARGE_PAINTING";
  const w = big ? 26 : 14;
  const h = big ? 20 : 18;
  const g = new Grid(w + 4, h + 4);
  const fr = "#6a5238";
  // Each row shifts a little: a tilt.
  for (let j = 0; j < h; j++) {
    const off = Math.floor((j * 2) / h);
    g.rect(1 + off, 1 + j, w, 1, fr);
  }
  const kind = hash(`paint${p.x}`) % 3;
  for (let j = 2; j < h - 2; j++) {
    const off = Math.floor((j * 2) / h);
    for (let i = 2; i < w - 2; i++) {
      const k = (j - 2) / (h - 4);
      let c: string;
      if (kind === 0) c = k < 0.5 ? "#a9b2b0" : k < 0.62 ? "#8e9c9a" : "#9a9478"; // a faded seascape
      else if (kind === 1) c = k < 0.45 ? "#b8b39a" : "#8f9670"; // a faded field
      else c = "#c9bf9e"; // a faded certificate
      g.set(1 + off + i, 1 + j, c);
    }
  }
  if (kind === 0) g.rect(5 + Math.floor(w / 3), Math.floor(h * 0.48), 4, 2, "#6e6252").set(6 + Math.floor(w / 3), Math.floor(h * 0.4), "#d8d2c0");
  if (kind === 1) g.rect(4, Math.floor(h * 0.42), 3, 2, "#6e7656");
  if (kind === 2) {
    for (let j = 5; j < h - 4; j += 3) g.rect(4, j, w - 6, 1, "#9a9070");
    g.set(w - 3, h - 4, "#8e3b32").set(w - 2, h - 4, "#8e3b32");
  }
  g.outline(OUTLINE);
  put(ctx, g, p.x - 1, p.y + 3);
  rect(ctx, p.x + Math.floor(w / 2), p.y, 1, 3, "#3a3026");
}

function clock(ctx: CanvasRenderingContext2D, k: { x: number; y: number; r: number }): void {
  // A cheap institutional clock, its face yellowed and cracked.
  const { x, y, r } = k;
  const g = new Grid(r * 2 + 5, r * 2 + 5);
  const c = r + 2;
  g.ellipse(c, c, r, r, "#2f2b26");
  g.ellipse(c, c, r - 1.5, r - 1.5, "#e2d8bc");
  g.ellipse(c - 2, c - 2, r - 5, r - 5, "#e9e0c6");
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.set(c + Math.round(Math.sin(a) * (r - 2.6)), c - Math.round(Math.cos(a) * (r - 2.6)), i % 3 === 0 ? "#2f2b26" : "#a89e84");
  }
  g.set(c + 3, c - 5, "#a89e84").set(c + 4, c - 4, "#a89e84").set(c + 4, c - 3, "#a89e84").set(c + 5, c - 2, "#a89e84");
  g.outline(OUTLINE);
  put(ctx, g, x - c, y - c);
}

export const BACKGROUND: Partial<BackgroundSteps> = {
  floor,
  wall,
  pods,
  room,
  roomWalls,
  window,
  pinboard,
  calendar,
  status,
  door,
  legend,
  painting,
  clock,
};

export { blob };
