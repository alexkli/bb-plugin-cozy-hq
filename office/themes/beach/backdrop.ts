// Surf Villa: the baked backdrop. Sun-bleached decks, whitewashed shiplap
// with aqua beadboard, palm-trunk posts, open windows with shutters, a
// cabana, a teak villa office, a tiled tiki bar and a sandy games pit.
import type { BackgroundSteps } from "../../theme.ts";
import type { Rect } from "../../layout.ts";
import { Grid, OUTLINE, rng, shade } from "../../themekit.ts";
import { C, fill, paint } from "./kit.ts";
import { boardwalk, firePit, pavers, pool, sea, shackEave, towel, workDeck } from "./grounds.ts";
import { planOf } from "./plan.ts";

// ------------------------------------------------------------------ floors

function deckRows(ctx: CanvasRenderingContext2D, r: Rect, seed: number, a: string = C.deck, b: string = C.deck2, gap: string = C.deckGap, row = 8): void {
  const rand = rng(seed);
  for (let y = r.y, n = 0; y < r.y + r.h; y += row, n++) {
    const h = Math.min(row - 1, r.y + r.h - y);
    const base = n % 2 ? a : b;
    fill(ctx, r.x, y, r.w, h, base);
    fill(ctx, r.x, y, r.w, 1, shade(base, 0.1));
    if (h === row - 1) fill(ctx, r.x, y + row - 1, r.w, 1, gap);
    const off = (n * 41) % 64;
    for (let x = r.x - off; x < r.x + r.w; x += 64) {
      if (x >= r.x) fill(ctx, x, y, 1, h, gap);
      if (x + 3 >= r.x && x + 3 < r.x + r.w) {
        fill(ctx, x + 3, y + 2, 1, 1, C.deckNail);
        fill(ctx, x + 3, y + row - 3, 1, 1, C.deckNail);
      }
      // A few grain streaks per board.
      for (let k = 0; k < 2; k++) {
        const gx = x + 10 + Math.floor(rand() * 44);
        const gy = y + 1 + Math.floor(rand() * (row - 3));
        if (gx >= r.x && gx + 6 < r.x + r.w && gy < r.y + r.h) fill(ctx, gx, gy, 3 + Math.floor(rand() * 5), 1, shade(base, -0.06));
      }
    }
  }
}

/** Sand: warm grains, faint ripples and a scatter of shells. */
function sandPatch(ctx: CanvasRenderingContext2D, r: Rect, seed: number, shells = true): void {
  fill(ctx, r.x, r.y, r.w, r.h, C.sand);
  const rand = rng(seed);
  for (let i = 0; i < (r.w * r.h) / 9; i++) {
    const x = r.x + Math.floor(rand() * r.w);
    const y = r.y + Math.floor(rand() * r.h);
    fill(ctx, x, y, 1, 1, rand() < 0.6 ? C.sandDot : C.sandLight);
  }
  // Wind ripples.
  for (let y = r.y + 5; y < r.y + r.h - 2; y += 9) {
    for (let x = r.x + 2; x < r.x + r.w - 2; x++) {
      const yy = y + Math.round(Math.sin((x + y * 3) * 0.13) * 1.5);
      if ((x + y) % 11 < 7 && yy < r.y + r.h - 1) fill(ctx, x, yy, 1, 1, C.sand2);
    }
  }
  if (!shells) return;
  for (let i = 0; i < Math.max(2, Math.floor((r.w * r.h) / 3000)); i++) {
    const x = r.x + 6 + Math.floor(rand() * (r.w - 12));
    const y = r.y + 6 + Math.floor(rand() * (r.h - 12));
    if (i % 3 === 0) {
      // A starfish.
      fill(ctx, x, y - 1, 1, 3, C.coral);
      fill(ctx, x - 1, y, 3, 1, C.coral);
      fill(ctx, x - 2, y + 2, 1, 1, C.coral);
      fill(ctx, x + 2, y + 2, 1, 1, C.coral);
      fill(ctx, x, y, 1, 1, C.coralHi);
    } else {
      fill(ctx, x, y, 3, 2, i % 2 ? "#fbe9e1" : "#f4d3c4");
      fill(ctx, x + 1, y, 1, 2, "#e4b8a4");
    }
  }
}

/** A woven jute rug with a striped border. */
function rug(ctx: CanvasRenderingContext2D, r: Rect, border: string, inner: string = C.white, base = "#dcc690", seed = 3, lattice = false): void {
  fill(ctx, r.x - 1, r.y - 1, r.w + 2, r.h + 2, shade(border, -0.35));
  fill(ctx, r.x, r.y, r.w, r.h, border);
  fill(ctx, r.x + 3, r.y + 3, r.w - 6, r.h - 6, inner);
  const ix = r.x + 4;
  const iy = r.y + 4;
  const iw = r.w - 8;
  const ih = r.h - 8;
  fill(ctx, ix, iy, iw, ih, base);
  const lo = shade(base, -0.08);
  const hi = shade(base, 0.12);
  for (let y = 0; y < ih; y++) {
    for (let x = (y % 2) * 2; x < iw; x += 4) fill(ctx, ix + x, iy + y, 1, 1, (Math.floor(y / 2) + Math.floor(x / 4)) % 2 ? lo : hi);
  }
  if (lattice) {
    // A woven diamond trellis with coral knots, and a coral inner border.
    const line = shade(base, -0.1);
    for (let y = 4; y < ih - 4; y++) {
      for (let x = 4; x < iw - 4; x++) {
        const a = (x + y) % 18;
        const b = (x - y + 1800) % 18;
        if (a === 0 || b === 0) fill(ctx, ix + x, iy + y, 1, 1, line);
        if (a === 0 && b === 0) {
          fill(ctx, ix + x - 1, iy + y, 3, 1, C.coral);
          fill(ctx, ix + x, iy + y - 1, 1, 3, C.coral);
        }
      }
    }
    fill(ctx, ix + 2, iy + 2, iw - 4, 1, C.coral);
    fill(ctx, ix + 2, iy + ih - 3, iw - 4, 1, C.coral);
    fill(ctx, ix + 2, iy + 2, 1, ih - 4, C.coral);
    fill(ctx, ix + iw - 3, iy + 2, 1, ih - 4, C.coral);
  }
  // Border stitches.
  for (let x = r.x + 2; x < r.x + r.w - 2; x += 3) {
    fill(ctx, x, r.y + 1, 1, 1, shade(border, 0.25));
    fill(ctx, x, r.y + r.h - 2, 1, 1, shade(border, 0.25));
  }
  void seed;
}

const TILE = ["aa....aa", "a..bb..a", "..bccb..", ".bc..cb.", ".bc..cb.", "..bccb..", "a..bb..a", "aa....aa"];

function cementTiles(ctx: CanvasRenderingContext2D, r: Rect): void {
  const colors: Record<string, string> = { ".": "#f7f2e7", a: "#8fd6cf", b: "#3fa6b2", c: "#f5cf74" };
  const g = new Grid(8, 8);
  TILE.forEach((row, y) => [...row].forEach((ch, x) => g.set(x, y, colors[ch]!)));
  const tile = g.toCanvas();
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  for (let y = r.y; y < r.y + r.h; y += 8) for (let x = r.x; x < r.x + r.w; x += 8) ctx.drawImage(tile, x, y);
  ctx.restore();
  fill(ctx, r.x, r.y, r.w, 1, "#d9cfba");
}

function rope(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  for (let i = 0; i < Math.max(w, h); i++) {
    const c = i % 3 === 0 ? "#a8823f" : "#d2ae6c";
    if (w > h) fill(ctx, x + i, y, 1, 2, c);
    else fill(ctx, x, y + i, 2, 1, c);
  }
}

// ------------------------------------------------------------------ the steps

export const BACKDROP: Partial<BackgroundSteps> = {
  floor(ctx, L) {
    const P = planOf(L);
    if (!P) deckRows(ctx, { x: 0, y: 0, w: L.W, h: L.H }, 91);
    else {
      // Sand everywhere, the villa's deck along the top, the pool deck, the pools, boardwalks and the surf.
      sandPatch(ctx, { x: 0, y: 0, w: L.W, h: L.H }, 61);
      deckRows(ctx, { x: 0, y: 0, w: L.W, h: P.terraceEnd }, 91);
      fill(ctx, 0, P.terraceEnd, L.W, 2, "#9a7a50");
      fill(ctx, 0, P.terraceEnd + 2, L.W, 2, "rgba(90,60,30,0.18)");
      if (P.pavers) {
        pavers(ctx, { x: 0, y: P.pavers.y0 + 2, w: L.W, h: P.pavers.y1 - P.pavers.y0 - 2 });
        fill(ctx, 0, P.pavers.y1, L.W, 2, "#c8b48e");
        fill(ctx, 0, P.pavers.y1 + 2, L.W, 2, "rgba(120,90,50,0.15)");
      }
      for (const pl of P.pools) {
        // A paved apron around a pool out on the sand.
        if (!P.pavers || pl.y > P.pavers.y1) pavers(ctx, { x: pl.x - 10, y: pl.y - 10, w: pl.w + 20, h: pl.h + 18 });
        pool(ctx, pl);
      }
      for (const w of P.walks) boardwalk(ctx, w);
      if (P.sea) sea(ctx, P.sea);
      if (P.bonfire) firePit(ctx, P.bonfire.x, P.bonfire.y);
    }
    // A sisal doormat and a dusting of sand by the door.
    const e = L.entrance;
    const mat: Rect = { x: e.x - 12, y: e.y + 1, w: 24, h: 9 };
    const rand = rng(5);
    for (let i = 0; i < 60; i++) {
      const dx = (rand() - 0.5) * 40;
      const dy = rand() * 26;
      fill(ctx, Math.round(e.x + dx), Math.round(e.y + 4 + dy), 1, 1, rand() < 0.5 ? C.sand2 : C.sandDot);
    }
    fill(ctx, mat.x - 1, mat.y - 1, mat.w + 2, mat.h + 2, "#8a6a3a");
    fill(ctx, mat.x, mat.y, mat.w, mat.h, "#cfae6e");
    for (let x = mat.x + 1; x < mat.x + mat.w - 1; x += 2) fill(ctx, x, mat.y + 1, 1, mat.h - 2, "#bf9b58");
    fill(ctx, mat.x + 3, mat.y + 3, mat.w - 6, 3, C.aqua);
    fill(ctx, mat.x + 5, mat.y + 4, mat.w - 10, 1, C.aquaHi);
  },

  wall(ctx, L) {
    L.segments.forEach((sg, i) => {
      const d = sg.depth;
      const w = sg.x1 - sg.x0;
      const feature = i === 1 && L.segments.length > 2;
      // Shiplap boards (the TV wall is woven grasscloth).
      if (feature) {
        fill(ctx, sg.x0, 0, w, d - 16, "#e9dcbf");
        for (let y = 3; y < d - 16; y++) {
          for (let x = sg.x0 + ((y * 3) % 4); x < sg.x1; x += 4) fill(ctx, x, y, 2, 1, y % 2 ? "#e1d2b2" : "#efe4cc");
        }
        for (let x = sg.x0 + 30; x < sg.x1; x += 31) fill(ctx, x, 3, 1, d - 19, "#d6c6a2");
      } else {
        for (let y = 0; y < d - 16; y += 5) {
          fill(ctx, sg.x0, y, w, 5, C.wash);
          fill(ctx, sg.x0, y + 4, w, 1, C.washLine);
          fill(ctx, sg.x0, y, w, 1, C.white);
        }
        const rand = rng(17 + i);
        for (let k = 0; k < w / 30; k++) fill(ctx, sg.x0 + Math.floor(rand() * w), 5 + Math.floor(rand() * (d - 26) / 5) * 5 + 2, 4 + Math.floor(rand() * 6), 1, "#ece5d6");
      }
      // A teak beam along the ceiling.
      fill(ctx, sg.x0, 0, w, 3, C.teak);
      fill(ctx, sg.x0, 0, w, 1, C.teakHi);
      fill(ctx, sg.x0, 3, w, 1, "rgba(90,50,30,0.25)");
      // Aqua beadboard wainscot with a white rail and a teak skirting.
      fill(ctx, sg.x0, d - 16, w, 14, C.aqua);
      for (let x = sg.x0 + 1; x < sg.x1; x += 4) {
        fill(ctx, x, d - 14, 1, 12, C.aquaLo);
        fill(ctx, x + 1, d - 14, 1, 12, "#5fd0cc");
      }
      fill(ctx, sg.x0, d - 17, w, 3, C.white);
      fill(ctx, sg.x0, d - 14, w, 1, C.washShade);
      fill(ctx, sg.x0, d - 3, w, 3, C.teakLo);
      fill(ctx, sg.x0, d - 3, w, 1, C.teak);
      ctx.fillStyle = "rgba(80,50,30,0.16)";
      ctx.fillRect(sg.x0, d, w, 3);
    });
    // Palm-trunk posts where the wall steps in or out.
    for (const px of L.wall.pillars) {
      const left = L.segments.find((s) => s.x1 === px);
      const right = L.segments.find((s) => s.x0 === px);
      const d = Math.max(left?.depth ?? 64, right?.depth ?? 64);
      fill(ctx, px - 6, 0, 12, d + 4, OUTLINE);
      fill(ctx, px - 5, 0, 10, d + 4, "#b48c5a");
      fill(ctx, px - 5, 0, 2, d + 4, "#d2ae7c");
      fill(ctx, px + 3, 0, 2, d + 4, "#8c6a40");
      for (let y = 2; y < d + 2; y += 5) {
        fill(ctx, px - 5, y, 10, 1, "#8c6a40");
        fill(ctx, px - 4, y + 1, 3, 1, "#c4a070");
      }
      fill(ctx, px - 6, d + 3, 12, 1, OUTLINE);
    }
  },

  pods(ctx, L) {
    if (planOf(L)) {
      L.pods.forEach((pod, i) => workDeck(ctx, pod, i));
      return;
    }
    const borders = [C.aqua, C.coral, C.sea];
    L.pods.forEach((pod, i) => rug(ctx, { x: pod.x - 4, y: pod.y + 2, w: pod.w + 8, h: pod.h - 2 }, borders[i % borders.length]!, C.white, i % 2 ? "#e0cb98" : "#dcc690", i));
  },

  room(ctx, room, L) {
    const r = room.rect;
    switch (room.kind) {
      case "meeting": {
        // The cabana: whitewashed boards and a striped rug under the table.
        for (let x = r.x, n = 0; x < r.x + r.w; x += 7, n++) {
          const w = Math.min(6, r.x + r.w - x);
          fill(ctx, x, r.y, w, r.h, n % 2 ? C.wash : "#efe8d7");
          fill(ctx, x, r.y, 1, r.h, C.white);
          if (w === 6) fill(ctx, x + 6, r.y, 1, r.h, C.washShade);
          for (let y = r.y + ((n * 37) % 50); y < r.y + r.h; y += 50) fill(ctx, x, y, w, 1, C.washShade);
        }
        const tableX = r.x + Math.round((r.w - 68) / 2) - 6;
        const tall = r.h >= 150;
        const ry = tall ? r.y + 66 : r.y + 50;
        const rh = tall ? 72 : Math.min(56, r.h - 54);
        if (rh > 20) {
          const rr: Rect = { x: tableX - 10, y: ry, w: 88, h: rh };
          fill(ctx, rr.x - 1, rr.y - 1, rr.w + 2, rr.h + 2, C.aquaDk);
          for (let x = 0; x < rr.w; x++) fill(ctx, rr.x + x, rr.y, 1, rr.h, Math.floor(x / 6) % 2 ? C.white : "#9fe0da");
          for (let x = rr.x; x < rr.x + rr.w; x += 2) {
            fill(ctx, x, rr.y - 3, 1, 2, C.washShade);
            fill(ctx, x, rr.y + rr.h + 1, 1, 2, C.washShade);
          }
        }
        break;
      }
      case "boss": {
        // Teak boards and a big jute rug with a sea-blue border.
        deckRows(ctx, r, 12, "#9a5f36", "#8f5730", "#6a3c20", 6);
        const rw = Math.min(r.w - 30, 110);
        const rh = Math.min(r.h - 40, 64);
        if (rw > 20 && rh > 20) rug(ctx, { x: r.x + Math.round((r.w - rw) / 2) + 6, y: r.y + 22, w: rw, h: rh }, C.seaLo, C.sunHi, "#d9c189", 4);
        break;
      }
      case "waiting": {
        const P = planOf(L);
        if (P) P.towels.forEach((t, i) => towel(ctx, t, i));
        else rug(ctx, { x: r.x + 2, y: r.y + 2, w: r.w - 4, h: r.h - 4 }, C.aqua, C.white, "#e3d3a8", 8, true);
        break;
      }
      case "kitchen":
        cementTiles(ctx, r);
        break;
      case "games": {
        // A sand pit with a rope edge and the shadow of a shade sail.
        sandPatch(ctx, r, 21);
        const P = planOf(L);
        if (P) shackEave(ctx, r, P.shack);
        ctx.fillStyle = "rgba(150,110,60,0.13)";
        ctx.beginPath();
        ctx.moveTo(r.x + r.w * 0.22, r.y + 6);
        ctx.lineTo(r.x + r.w * 0.86, r.y + 12);
        ctx.lineTo(r.x + r.w * 0.58, r.y + Math.min(r.h - 8, 70));
        ctx.closePath();
        ctx.fill();
        rope(ctx, r.x, r.y, r.w, 2);
        rope(ctx, r.x, r.y + r.h - 2, r.w, 2);
        rope(ctx, r.x, r.y, 2, r.h);
        rope(ctx, r.x + r.w - 2, r.y, 2, r.h);
        break;
      }
      case "garden": {
        // Dunes with beach grass and a boardwalk.
        sandPatch(ctx, r, 33, false);
        const rand = rng(44);
        for (let i = 0; i < (r.w * r.h) / 160; i++) {
          const x = r.x + 3 + Math.floor(rand() * (r.w - 6));
          const y = r.y + 4 + Math.floor(rand() * (r.h - 28));
          for (let k = -2; k <= 2; k++) {
            const h = 4 - Math.abs(k) + Math.floor(rand() * 2);
            fill(ctx, x + k, y - h + 3, 1, h, k % 2 ? C.palmLo : "#7fae5a");
          }
        }
        const by = r.y + r.h - 16;
        for (let x = r.x + 4; x < r.x + r.w - 4; x += 5) {
          fill(ctx, x, by, 4, 9, C.drift);
          fill(ctx, x, by, 4, 1, C.driftHi);
          fill(ctx, x + 4, by, 1, 9, C.driftLo);
          fill(ctx, x + 1, by + 2, 1, 1, C.driftDk);
          fill(ctx, x + 1, by + 6, 1, 1, C.driftDk);
        }
        rope(ctx, r.x, r.y, r.w, 2);
        break;
      }
      case "server": {
        // The board shed: painted blue planks.
        for (let x = r.x, n = 0; x < r.x + r.w; x += 6, n++) {
          const w = Math.min(5, r.x + r.w - x);
          fill(ctx, x, r.y, w, r.h, n % 2 ? "#5b7d92" : "#55768b");
          fill(ctx, x, r.y, 1, r.h, "#6c90a4");
          fill(ctx, x + 5, r.y, 1, r.h, "#3e5869");
        }
        fill(ctx, r.x, r.y + r.h - 2, r.w, 2, C.aquaHi);
        fill(ctx, r.x, r.y, r.w, 1, C.sun);
        break;
      }
      case "library":
        rug(ctx, { x: r.x + 2, y: r.y + 2, w: r.w - 4, h: r.h - 4 }, C.palm, C.sunHi, "#dcc690", 9);
        break;
      case "lounge": {
        const c = L.couch;
        const rw = 124;
        const rh = 64;
        const g = new Grid(rw, rh);
        const cx = rw / 2 - 0.5;
        const cy = rh / 2 - 0.5;
        g.ellipse(cx, cy, rw / 2 - 1, rh / 2 - 1, C.aquaDk);
        g.ellipse(cx, cy, rw / 2 - 2, rh / 2 - 2, C.aqua);
        g.ellipse(cx, cy, rw / 2 - 6, rh / 2 - 5, "#e3cf9c");
        g.ellipse(cx, cy, rw / 2 - 13, rh / 2 - 10, C.coral);
        g.ellipse(cx, cy, rw / 2 - 15, rh / 2 - 11, "#dcc690");
        g.ellipse(cx, cy, rw / 2 - 26, rh / 2 - 18, "#e6d4a4");
        for (let y = 0; y < rh; y++) for (let x = (y % 3) * 2; x < rw; x += 6) if (g.get(x, y) === "#dcc690" || g.get(x, y) === "#e3cf9c") g.set(x, y, "#cdb57c");
        paint(ctx, g, c.x + c.w / 2 - rw / 2, c.y - 30);
        break;
      }
      default:
        break;
    }
  },

  roomWalls(ctx, room, L) {
    const r = room.rect;
    if (!room.walls) return;
    const seg = L.segments.find((sg) => r.x >= sg.x0 && r.x < sg.x1);
    const atWall = seg !== undefined && r.y <= seg.depth + 1;
    const top = r.y - (atWall ? 2 : 6);
    const h = r.h + (atWall ? 2 : 6);
    const wood = room.walls === "wood";
    const cabana = room.kind === "meeting";
    for (const x of [r.x - 2, r.x + r.w - 1]) {
      if (wood) {
        fill(ctx, x, top, 3, h, C.teakLo);
        fill(ctx, x + 1, top, 1, h, C.teakHi);
      } else if (cabana) {
        // Sheer white curtains, gathered in folds.
        for (let y = top; y < top + h; y++) {
          const k = Math.floor((y - top) / 3) % 3;
          fill(ctx, x, y, 3, 1, k === 0 ? C.white : k === 1 ? "#f1ece0" : "#e4dccb");
          fill(ctx, x + 1, y, 1, 1, k === 2 ? "#ece5d6" : C.white);
        }
        for (let y = top + 24; y < top + h - 8; y += 48) fill(ctx, x, y, 3, 2, C.rattanLo);
      } else {
        fill(ctx, x, top, 3, h, C.bamboo);
        fill(ctx, x + 2, top, 1, h, C.bambooLo);
        for (let y = top + 4; y < top + h; y += 9) fill(ctx, x, y, 3, 1, C.bambooNode);
      }
    }
    if (!atWall) {
      const gap = room.doorSide === "top" ? room.doorX ?? -1 : -1;
      for (let x = r.x - 2; x < r.x + r.w + 1; x++) {
        if (gap >= 0 && x >= gap - 9 && x < gap + 9) continue;
        if (wood && planOf(L)) {
          // The bungalow's thatched eave.
          const len = 7 + ((x * 7) % 3 === 0 ? 1 : 0);
          fill(ctx, x, r.y - 9, 1, 1, C.thatchDk);
          fill(ctx, x, r.y - 8, 1, len, x % 2 ? C.thatch : C.thatchHi);
          if ((x * 5) % 4 === 0) fill(ctx, x, r.y - 6, 1, 2, C.thatchLo);
          fill(ctx, x, r.y - 9 + len, 1, 1, C.thatchDk);
        } else if (wood) {
          fill(ctx, x, r.y - 8, 1, 2, C.teakLo);
          fill(ctx, x, r.y - 6, 1, 5, (x - r.x) % 6 === 0 ? C.teak : "#e6d6b6");
          fill(ctx, x, r.y - 1, 1, 1, C.teakDk);
        } else if (cabana) {
          // A scalloped valance.
          const k = (x - r.x + 40) % 8;
          fill(ctx, x, r.y - 8, 1, 2, C.rattanLo);
          fill(ctx, x, r.y - 6, 1, k < 5 ? 5 : 3, k === 0 || k === 4 ? "#e4dccb" : C.white);
        } else {
          fill(ctx, x, r.y - 8, 1, 2, C.bambooLo);
          fill(ctx, x, r.y - 6, 1, 4, (x * 7) % 5 === 0 ? C.thatchLo : C.thatch);
          fill(ctx, x, r.y - 2, 1, 1, (x % 2) ? C.thatchDk : C.thatch);
        }
      }
    }
  },

  window(ctx, win, L) {
    const { x, y, w, h } = win;
    // Open aqua shutters either side (unless a post or another window is in the way).
    const nearPost = (sx: number) => L.wall.pillars.some((p) => sx > p - 9 && sx < p + 9);
    const sh = h + 2;
    for (const [sx, side] of [
      [x - 7, -1],
      [x + w + 1, 1],
    ] as const) {
      if (nearPost(sx + 3) || L.wall.windows.some((o) => o !== win && sx + 6 > o.x - 8 && sx < o.x + o.w + 8)) continue;
      fill(ctx, sx - 1, y - 2, 8, sh + 2, OUTLINE);
      fill(ctx, sx, y - 1, 6, sh, C.aqua);
      for (let yy = y + 1; yy < y + sh - 2; yy += 2) {
        fill(ctx, sx + 1, yy, 4, 1, C.aquaLo);
        fill(ctx, sx + 1, yy - 1, 4, 1, "#62d1cd");
      }
      fill(ctx, side < 0 ? sx : sx + 5, y - 1, 1, sh, C.aquaDk);
      fill(ctx, sx + 1, y + Math.floor(sh / 2) - 1, 4, 1, C.aquaHi);
    }
    // A whitewashed frame with a deep sill and a slim transom.
    const g = new Grid(w + 2, h + 6);
    g.rect(1, 1, w, h, C.white);
    g.rect(1, 1, w, 1, "#ffffff");
    g.rect(1, 2, 3, h - 1, C.wash);
    g.rect(w - 2, 2, 3, h - 1, C.washLine);
    g.rect(0, h + 1, w + 2, 4, C.teak);
    g.rect(0, h + 1, w + 2, 1, C.teakHi);
    g.rect(0, h + 4, w + 2, 1, C.teakLo);
    g.outline(OUTLINE);
    for (let j = 4; j < h - 1; j++) for (let i = 5; i < w - 3; i++) g.set(i, j, null);
    // Transom bar.
    for (let i = 5; i < w - 3; i++) g.set(i, 10, i % 2 ? C.wash : C.white);
    paint(ctx, g, x - 1, y - 1);
    // A shell on the sill.
    fill(ctx, x + w - 10, y + h + 1, 4, 2, "#f6d6c8");
    fill(ctx, x + w - 9, y + h + 1, 1, 2, "#e0ad98");
  },

  pinboard(ctx, r) {
    // Driftwood frame around a pale cork board, a starfish pinned in the corner.
    const { x, y, w, h } = r;
    const g = new Grid(w + 2, h + 2);
    g.rect(1, 1, w, h, C.drift);
    for (let i = 1; i <= w; i += 5) g.set(i, 1, C.driftHi).set(i + 2, h, C.driftLo);
    for (let j = 2; j < h; j += 4) g.set(1, j, C.driftHi).set(w, j + 1, C.driftLo);
    g.rect(4, 4, w - 6, h - 6, "#dcbf8c");
    for (let i = 0; i < 260; i++) g.set(4 + ((i * 37) % (w - 6)), 4 + ((i * 53 + (i >> 3)) % (h - 6)), i % 3 ? "#cdae78" : "#e8cfa0");
    g.outline(OUTLINE);
    const s = [
      [3, 0],
      [3, 1],
      [2, 2],
      [3, 2],
      [4, 2],
      [0, 3],
      [1, 3],
      [2, 3],
      [3, 3],
      [4, 3],
      [5, 3],
      [6, 3],
      [2, 4],
      [3, 4],
      [4, 4],
      [1, 5],
      [2, 5],
      [4, 5],
      [5, 5],
      [1, 6],
      [5, 6],
    ];
    for (const [sx, sy] of s) g.set(w - 8 + sx!, h - 7 + sy!, sx === 3 && sy === 3 ? C.coralHi : C.coral);
    paint(ctx, g, x - 1, y - 1);
  },

  calendar(ctx, c) {
    const g = new Grid(c.w + 2, c.h + 2);
    g.rect(1, 1, c.w, c.h, C.white);
    g.rect(1, 1, c.w, 7, C.aqua);
    g.rect(1, 1, c.w, 1, C.aquaHi);
    for (let i = 1; i <= c.w; i++) g.set(i, c.h - 1, i % 4 < 2 ? "#9fe0da" : C.white).set(i, c.h, "#e7dfcd");
    g.outline(OUTLINE);
    paint(ctx, g, c.x - 1, c.y - 1);
  },

  status(ctx, s) {
    const b = new Grid(s.w + 2, s.h + 2);
    b.rect(1, 1, s.w, s.h, C.bamboo);
    for (let j = 1; j <= s.h; j += 4) b.set(1, j, C.bambooNode).set(s.w, j + 2, C.bambooNode);
    b.rect(2, 2, s.w - 2, s.h - 2, "#1a2028");
    b.outline(OUTLINE);
    paint(ctx, b, s.x - 1, s.y - 1);
  },

  door(ctx, d) {
    // A teak door with louvres and a porthole, the "+" sign on a little plank.
    const g = new Grid(d.w + 6, d.h + 4);
    g.rect(0, 2, d.w + 6, d.h + 2, C.white);
    g.rect(0, 2, d.w + 6, 1, "#ffffff");
    g.rect(3, 4, d.w, d.h, C.teak);
    g.rect(3, 4, 1, d.h, C.teakHi);
    g.ellipse(3 + d.w / 2 - 0.5, 11, 4, 4, C.chromeLo);
    g.ellipse(3 + d.w / 2 - 0.5, 11, 3, 3, "#bfe8f2");
    g.set(Math.floor(3 + d.w / 2) - 2, 9, "#ffffff");
    for (let yy = 19; yy < d.h - 2; yy += 3) {
      g.rect(5, yy, d.w - 4, 1, C.teakLo);
      g.rect(5, yy + 1, d.w - 4, 1, C.teakHi);
    }
    g.set(d.w - 1, 24, C.sun).set(d.w - 1, 25, C.sun);
    g.outline(OUTLINE);
    paint(ctx, g, d.x - 3, d.y - 3);
    const sg = new Grid(16, 10);
    sg.rrect(1, 1, 14, 8, C.aqua, 1);
    sg.rect(2, 1, 12, 1, C.aquaHi);
    sg.rect(7, 2, 2, 6, C.white).rect(5, 4, 6, 2, C.white);
    sg.outline(OUTLINE);
    paint(ctx, sg, d.x + d.w / 2 - 8, Math.max(1, d.y - 12));
  },

  legend(ctx, n) {
    // The "?" note, pinned with a shell.
    const g = new Grid(n.w + 2, n.h + 2);
    g.rect(1, 1, n.w, n.h, "#fff3b0");
    g.rect(1, 1, n.w, 2, "#f6dc78");
    const qx = Math.floor(n.w / 2) - 1;
    g.rect(qx, 4, 3, 1, "#6b5a2e").set(qx + 2, 5, "#6b5a2e").set(qx + 1, 6, "#6b5a2e").set(qx + 1, 8, "#6b5a2e");
    g.outline(OUTLINE);
    paint(ctx, g, n.x - 1, n.y - 1);
    fill(ctx, n.x + Math.floor(n.w / 2) - 1, n.y - 1, 3, 2, C.pink);
    fill(ctx, n.x + Math.floor(n.w / 2), n.y - 1, 1, 2, C.coralLo);
  },

  painting(ctx, p) {
    if (p.sprite === "SMALL_PAINTING_2") {
      // A little surfboard hung on the wall.
      const g = new Grid(10, 34);
      g.ellipse(4.5, 16, 3.6, 14.5, C.coral);
      g.rect(4, 3, 1, 27, C.white);
      g.rect(2, 6, 1, 4, C.coralHi);
      g.rect(3, 20, 3, 2, C.sun);
      g.set(4, 31, C.ink).set(4, 32, C.ink);
      g.outline(OUTLINE);
      paint(ctx, g, p.x + 3, p.y + 1);
      return;
    }
    // A sunset surf poster in a bamboo frame.
    const big = p.sprite === "LARGE_PAINTING";
    const w = big ? 28 : 14;
    const h = big ? 24 : 20;
    const g = new Grid(w + 2, h + 2);
    g.rect(1, 1, w, h, C.bamboo);
    for (let i = 1; i <= w; i += 4) g.set(i, 1, C.bambooNode).set(i + 2, h, C.bambooNode);
    const bands = ["#ffcf7a", "#ffb070", "#ff8f6a", "#f07a7a"];
    const ih = h - 4;
    for (let j = 0; j < ih; j++) {
      const sky = j < ih * 0.6;
      const c = sky ? bands[Math.min(3, Math.floor((j / (ih * 0.6)) * 4))]! : j % 2 ? C.seaLo : C.sea;
      g.rect(3, 3 + j, w - 4, 1, c);
    }
    const sy = 3 + Math.floor(ih * 0.6);
    g.ellipse(3 + (w - 4) * 0.62, sy - 1, 3, 2, C.sunHi);
    g.rect(3, sy, w - 4, 1, C.sunHi);
    // Palm silhouette.
    const px = 5;
    for (let j = 0; j < ih - 2; j++) g.set(px + Math.floor(j / 6), 3 + ih - 1 - j, "#4a2e3a");
    const topY = 5;
    const tx = px + Math.floor((ih - 3) / 6);
    for (const [dx, dy] of [[-2, 0], [-1, -1], [1, -1], [2, 0], [3, 1], [-3, 1], [0, -1], [1, 1], [-1, 1]] as const) g.set(tx + dx, topY + dy, "#4a2e3a");
    g.outline(OUTLINE);
    paint(ctx, g, p.x, p.y + 3);
  },

  clock(ctx, k) {
    // A life ring around the clock face.
    const { x, y, r } = k;
    const R = r + 2.5;
    const size = Math.ceil(R) * 2 + 5;
    const c = Math.floor(size / 2);
    const g = new Grid(size, size);
    for (let j = 0; j < size; j++) {
      for (let i = 0; i < size; i++) {
        const dx = i - c;
        const dy = j - c;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > R) continue;
        if (d <= r - 1) {
          g.set(i, j, "#fdf8ec");
          continue;
        }
        const a = Math.atan2(dy, dx) + Math.PI * 2;
        const seg = Math.floor((a / (Math.PI / 2)) * 1 + 0.5) % 2;
        const ring = d > r + 1.5 ? (seg ? "#e8453c" : "#f4ede0") : seg ? "#ff6a5c" : "#ffffff";
        g.set(i, j, ring);
      }
    }
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]] as const) {
      g.set(c + dx * Math.round(r - 2.6), c + dy * Math.round(r - 2.6), "#4b3d5c");
      // Rope loops across the ring.
      const rx = c + Math.round((dx - dy) * 0.707 * (r + 0.5));
      const ry = c + Math.round((dy + dx) * 0.707 * (r + 0.5));
      g.set(rx, ry, "#c9a46a").set(rx + 1, ry, "#c9a46a");
    }
    g.outline(OUTLINE);
    paint(ctx, g, x - c, y - c);
  },
};

