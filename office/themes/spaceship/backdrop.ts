// Spaceship: the backdrop, baked once per floor plan. Slate deck plating,
// the corridors with their light rails and chevrons pointing to the
// airlock, compartments behind low bulkheads with door gaps wherever people
// pass, each room its own floor (galley tiles, a teak captain's cabin, the
// bridge's dark deck with its glowing rings). The hull wall is ribbed, with
// the orange livery stripe; portholes on bolted plates, the airlock hatch,
// the viewscreen's bezel. On wide panels the hull's cross-section closes
// the deck at the sides and the bottom, space beyond (stars are live).
import type { BackgroundSteps } from "../../theme.ts";
import type { Layout, Rect, Room } from "../../layout.ts";
import { Grid, OUTLINE, drawPixelText, hash, mix, rect, shade } from "../../themekit.ts";
import { P, hazard, panel, rivets } from "./pal.ts";
import { planOf, type ShipPlan } from "./plan.ts";
import { screenPath } from "./space.ts";

const blit = (ctx: CanvasRenderingContext2D, g: Grid, x: number, y: number) => ctx.drawImage(g.toCanvas(), Math.round(x), Math.round(y));

function clipTo(ctx: CanvasRenderingContext2D, r: Rect, draw: () => void): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  draw();
  ctx.restore();
}

/** Deck plates in staggered rows, each a shade off, seams and the odd bolt. */
function plates(ctx: CanvasRenderingContext2D, r: Rect, base: string, seam: string, pw: number, ph: number, seed: number, vary = 0.05): void {
  clipTo(ctx, r, () => {
    rect(ctx, r.x, r.y, r.w, r.h, seam);
    for (let j = 0, y = r.y; y < r.y + r.h; j++, y += ph) {
      const off = j % 2 ? Math.floor(pw / 2) : 0;
      for (let x = r.x - off; x < r.x + r.w; x += pw) {
        const k = hash(`${seed}|${x}|${y}`);
        const tone = k % 3 === 0 ? shade(base, vary) : k % 3 === 1 ? shade(base, -vary) : base;
        rect(ctx, x + 1, y + 1, pw - 1, ph - 1, tone);
        rect(ctx, x + 1, y + 1, pw - 1, 1, shade(tone, 0.08));
        if (k % 7 === 0) {
          rect(ctx, x + 3, y + 3, 1, 1, shade(tone, -0.25));
          rect(ctx, x + pw - 3, y + ph - 3, 1, 1, shade(tone, -0.25));
        }
        if (k % 11 === 0) rect(ctx, x + 4 + (k % (pw - 10)), y + 5 + (k % (ph - 9)), 3, 1, shade(tone, -0.1));
      }
    }
  });
}

// ------------------------------------------------------------------ corridors

/** The corridor along a hall: a smooth walkway, light rails at the edges, chevrons toward the airlock. */
function corridorH(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number, doorX: number): void {
  const w = x1 - x0;
  rect(ctx, x0, y - 10, w, 20, P.deckHi);
  for (let x = x0 - (x0 % 16); x < x1; x += 16) {
    rect(ctx, x, y - 9, 1, 18, shade(P.deckHi, -0.08));
    rect(ctx, x + 1, y - 9, 1, 18, shade(P.deckHi, 0.06));
  }
  // The light rails: a dark channel with lamps every 8 px (the live chase lights them up).
  for (const ry of [y - 10, y + 7]) {
    rect(ctx, x0, ry, w, 3, P.steelDeep);
    rect(ctx, x0, ry + (ry < y ? 2 : 0), w, 1, P.steel);
    for (let x = x0 + 3 - (x0 % 8); x < x1; x += 8) rect(ctx, x, ry + 1, 2, 1, "#2f5a6e");
  }
  // A grip strip down the middle with chevrons pointing to the airlock.
  rect(ctx, x0, y - 3, w, 6, P.grate);
  for (let x = x0; x < x1; x += 2) rect(ctx, x, y - 2, 1, 4, P.grateHi);
  for (let x = x0 + 4 - (x0 % 24); x < x1; x += 24) {
    if (Math.abs(x - doorX) < 14) continue;
    const dir = x < doorX ? 1 : -1;
    for (let i = 0; i < 3; i++) {
      rect(ctx, x + dir * i, y - 2 + i, 1, 1, P.orangeLo);
      rect(ctx, x + dir * i, y + 2 - i, 1, 1, P.orangeLo);
      rect(ctx, x + dir * i + dir, y - 2 + i, 1, 1, P.orange);
      rect(ctx, x + dir * i + dir, y + 2 - i, 1, 1, P.orange);
    }
  }
}

function corridorV(ctx: CanvasRenderingContext2D, x: number, y0: number, y1: number): void {
  const h = y1 - y0;
  rect(ctx, x - 9, y0, 18, h, P.deckHi);
  for (let y = y0 - (y0 % 16); y < y1; y += 16) {
    rect(ctx, x - 8, y, 16, 1, shade(P.deckHi, -0.08));
    rect(ctx, x - 8, y + 1, 16, 1, shade(P.deckHi, 0.06));
  }
  for (const rx of [x - 10, x + 7]) {
    rect(ctx, rx, y0, 3, h, P.steelDeep);
    rect(ctx, rx + (rx < x ? 2 : 0), y0, 1, h, P.steel);
    for (let y = y0 + 3 - (y0 % 8); y < y1; y += 8) rect(ctx, rx + 1, y, 1, 2, "#2f5a6e");
  }
  rect(ctx, x - 3, y0, 6, h, P.grate);
  for (let y = y0; y < y1; y += 2) rect(ctx, x - 2, y, 4, 1, P.grateHi);
}

/** Where a corridor meets an aisle: a hatch ring in the deck. */
function junction(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const g = new Grid(20, 20);
  g.rrect(0, 0, 20, 20, P.steel, 3);
  g.rrect(1, 1, 18, 18, P.deck, 3);
  g.ellipse(9.5, 9.5, 7, 7, P.steelDk);
  g.ellipse(9.5, 9.5, 6, 6, P.deckHi);
  g.ellipse(9.5, 9.5, 3, 3, P.grate);
  for (const [dx, dy] of [[2, 2], [16, 2], [2, 16], [16, 16]] as const) g.set(dx, dy, P.panelLo);
  g.set(9, 3, P.orange).set(10, 3, P.orange).set(9, 16, P.orange).set(10, 16, P.orange);
  blit(ctx, g, x - 10, y - 10);
}

// ------------------------------------------------------------------ the hull at the edges

/** The hull's cross-section closing the deck at the sides and the bottom; space beyond is filled in live. */
function hullEdges(ctx: CanvasRenderingContext2D, L: Layout, plan: ShipPlan): void {
  const E = plan.edgeX;
  const EB = plan.edgeY;
  const bottom = L.H - EB;
  if (E > 0) {
    for (const left of [true, false]) {
      const x = left ? E - 5 : L.W - E;
      rect(ctx, left ? 0 : L.W - E + 5, 0, E - 5, L.H, P.void);
      rect(ctx, x, 0, 5, bottom + (EB > 0 ? 5 : 0), P.steel);
      rect(ctx, left ? x : x + 4, 0, 1, bottom, OUTLINE);
      rect(ctx, left ? x + 1 : x + 1, 0, 3, bottom, P.steelDk);
      rect(ctx, left ? x + 3 : x + 1, 0, 1, bottom, P.panelLo);
      // Frame ribs show in the section every so often.
      for (let y = 40; y < bottom - 6; y += 48) rect(ctx, x + 1, y, 3, 4, P.panelMid);
    }
  }
  if (EB > 0) {
    rect(ctx, 0, bottom + 5, L.W, EB - 5, P.void);
    rect(ctx, Math.max(0, E - 5), bottom, L.W - 2 * Math.max(0, E - 5), 5, P.steelDk);
    rect(ctx, Math.max(0, E - 5), bottom + 4, L.W - 2 * Math.max(0, E - 5), 1, OUTLINE);
    rect(ctx, Math.max(0, E - 5), bottom, L.W - 2 * Math.max(0, E - 5), 1, P.panelLo);
    for (let x = E + 20; x < L.W - E - 6; x += 48) rect(ctx, x, bottom + 1, 4, 3, P.panelMid);
  }
}

// ------------------------------------------------------------------ compartments

/** Gaps in a room's edge where people pass: spot paths crossing or running along it, aisles and halls. */
function openings(L: Layout, horizontal: boolean, at: number, from: number, to: number): [number, number][] {
  const out: [number, number][] = [];
  const add = (a: number, z: number) => out.push([Math.max(from, a), Math.min(to, z)]);
  const seg = (ax: number, ay: number, bx: number, by: number) => {
    // In the edge's frame: u along it, v across it.
    const [au, av, bu, bv] = horizontal ? [ax, ay, bx, by] : [ay, ax, by, bx];
    if (Math.max(au, bu) < from - 9 || Math.min(au, bu) > to + 9) return;
    if (av === bv) {
      if (Math.abs(av - at) <= 6) add(Math.min(au, bu) - 9, Math.max(au, bu) + 9);
      return;
    }
    if ((av - at) * (bv - at) > 0) return;
    const k = (at - av) / (bv - av);
    const u = au + (bu - au) * k;
    add(u - 9, u + 9);
  };
  for (const s of L.spots) for (let i = 1; i < s.path.length; i++) seg(s.path[i - 1]!.x, s.path[i - 1]!.y, s.path[i]!.x, s.path[i]!.y);
  for (let i = 1; i < L.entrancePath.length; i++) seg(L.entrancePath[i - 1]!.x, L.entrancePath[i - 1]!.y, L.entrancePath[i]!.x, L.entrancePath[i]!.y);
  for (const x of L.net.aisles) seg(x, 0, x, L.H);
  for (const y of L.net.halls) seg(0, y, L.W, y);
  return out.filter(([a, z]) => z > a).sort((p, q) => p[0] - q[0]);
}

/** A low bulkhead along a room's edge, open where people walk through (a door frame either side). */
function bulkhead(ctx: CanvasRenderingContext2D, L: Layout, horizontal: boolean, at: number, from: number, to: number, face: boolean): void {
  const gaps = openings(L, horizontal, at, from, to);
  let u = from;
  const piece = (a: number, z: number) => {
    if (z - a < 6) return;
    if (horizontal) {
      rect(ctx, a, at - 2, z - a, 3, P.steelDk);
      rect(ctx, a, at - 2, z - a, 1, P.panelMid);
      if (face) {
        rect(ctx, a, at + 1, z - a, 2, P.steel);
        rect(ctx, a, at + 3, z - a, 1, "rgba(20,24,36,0.35)");
      }
    } else {
      rect(ctx, at - 1, a, 3, z - a, P.steelDk);
      rect(ctx, at - 1, a, 1, z - a, P.panelMid);
    }
  };
  const post = (p: number) => {
    if (horizontal) {
      rect(ctx, p - 1, at - 4, 3, 7, OUTLINE);
      rect(ctx, p, at - 3, 1, 5, P.orange);
    } else {
      rect(ctx, at - 2, p - 1, 5, 3, OUTLINE);
      rect(ctx, at - 1, p, 3, 1, P.orange);
    }
  };
  for (const [a, z] of gaps) {
    if (a > u) {
      piece(u, a);
      if (a - u >= 6) post(a - 1);
    }
    if (z - u >= 0 && z < to && a >= from) post(z);
    u = Math.max(u, z);
  }
  if (u < to) piece(u, to);
}

/** The compartment around an open room: bulkheads on the sides that don't meet the hull wall or the panel edge. */
function compartment(ctx: CanvasRenderingContext2D, r: Rect, L: Layout, plan: ShipPlan | null): void {
  const E = plan?.edgeX ?? 0;
  const seg = L.segments.find((s) => r.x + 4 >= s.x0 && r.x + 4 < s.x1);
  const atWall = seg !== undefined && r.y <= seg.depth + 6;
  // Rooms that host the office's get-togethers stay open toward their hallway.
  const ev = L.eventArea;
  const hosts = ev.x >= r.x - 2 && ev.x + ev.w <= r.x + r.w + 2 && ev.y >= r.y - 2 && ev.y + ev.h <= r.y + r.h + 2;
  const hallAbove = L.net.halls.some((h) => h < r.y && r.y - h < 30);
  const hallBelow = L.net.halls.some((h) => h > r.y + r.h && h - (r.y + r.h) < 30);
  if (!atWall && !(hosts && hallAbove)) bulkhead(ctx, L, true, r.y - 3, r.x - 2, r.x + r.w + 2, true);
  if (r.y + r.h < L.H - 8 - (plan?.edgeY ?? 0) && !(hosts && hallBelow)) bulkhead(ctx, L, true, r.y + r.h + 2, r.x - 2, r.x + r.w + 2, true);
  if (r.x > E + 8) bulkhead(ctx, L, false, r.x - 3, r.y - 2, r.y + r.h + 2, false);
  if (r.x + r.w < L.W - E - 8) bulkhead(ctx, L, false, r.x + r.w + 2, r.y - 2, r.y + r.h + 2, false);
}

// ------------------------------------------------------------------ room floors

function checker(ctx: CanvasRenderingContext2D, r: Rect, a: string, b: string, grout: string, size: number): void {
  clipTo(ctx, r, () => {
    rect(ctx, r.x, r.y, r.w, r.h, grout);
    for (let y = r.y; y < r.y + r.h; y += size) {
      for (let x = r.x; x < r.x + r.w; x += size) {
        const c = (((x - r.x) / size + (y - r.y) / size) | 0) % 2 ? a : b;
        rect(ctx, x, y, size - 1, size - 1, c);
        rect(ctx, x, y, size - 1, 1, shade(c, 0.06));
      }
    }
  });
}

function carpetFlecks(ctx: CanvasRenderingContext2D, r: Rect, base: string, fleck: string, star?: string): void {
  rect(ctx, r.x, r.y, r.w, r.h, base);
  for (let y = r.y + 3; y < r.y + r.h - 2; y += 5) {
    for (let x = r.x + 2 + ((y - r.y) % 10 ? 3 : 0); x < r.x + r.w - 2; x += 7) rect(ctx, x, y, 1, 1, fleck);
  }
  if (star) {
    for (let i = 0; i < (r.w * r.h) / 900; i++) {
      const k = hash(`star${r.x}|${r.y}|${i}`);
      const x = r.x + 4 + (k % Math.max(1, r.w - 8));
      const y = r.y + 4 + ((k >>> 8) % Math.max(1, r.h - 8));
      rect(ctx, x, y - 1, 1, 3, star);
      rect(ctx, x - 1, y, 3, 1, star);
    }
  }
}

function roomFloor(ctx: CanvasRenderingContext2D, room: Room, L: Layout, plan: ShipPlan | null): void {
  const r = room.rect;
  switch (room.kind) {
    case "kitchen":
      checker(ctx, r, "#e9edf2", "#cfd7e1", "#aeb7c4", 8);
      break;
    case "lounge": {
      carpetFlecks(ctx, r, "#3e5f78", "#4c7090", "#5e86a6");
      // A round rug under the couch: navy with an orange ring.
      const c = L.couch;
      const g = new Grid(128, 62);
      g.ellipse(63.5, 30.5, 62, 29, P.navyLo);
      g.ellipse(63.5, 30.5, 59, 27, P.orangeLo);
      g.ellipse(63.5, 30.5, 57, 25, P.navy);
      g.ellipse(63.5, 30.5, 44, 18, P.navyHi);
      g.ellipse(63.5, 30.5, 42, 16, P.navy);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        g.set(63 + Math.round(Math.cos(a) * 51), 30 + Math.round(Math.sin(a) * 21), P.amber);
      }
      clipTo(ctx, r, () => blit(ctx, g, c.x + c.w / 2 - 64, c.y - 30));
      break;
    }
    case "waiting": {
      // Studded rubber matting with the station's number painted on.
      rect(ctx, r.x, r.y, r.w, r.h, "#4b5b72");
      for (let y = r.y + 2; y < r.y + r.h; y += 4) for (let x = r.x + 2 + ((y - r.y) % 8 ? 2 : 0); x < r.x + r.w; x += 4) rect(ctx, x, y, 1, 1, "#5a6c86");
      rect(ctx, r.x + 2, r.y + 2, r.w - 4, 1, P.hazard);
      rect(ctx, r.x + 2, r.y + r.h - 3, r.w - 4, 1, P.hazard);
      drawPixelText(ctx, "MUSTER 3", r.x + 4, r.y + r.h - 11, "#8a9ab4");
      break;
    }
    case "meeting": {
      // The bridge: a dark deck with glowing rings around the chart table.
      rect(ctx, r.x, r.y, r.w, r.h, "#25304a");
      for (let y = r.y; y < r.y + r.h; y += 12) rect(ctx, r.x, y, r.w, 1, "#2c3956");
      for (let x = r.x; x < r.x + r.w; x += 12) rect(ctx, x, r.y, 1, r.h, "#2c3956");
      const table = L.props.find((p) => p.kind === "meeting-table");
      const cx = table ? table.x + 34 : r.x + r.w / 2;
      const cy = table ? table.y + 18 : r.y + r.h * 0.6;
      clipTo(ctx, r, () => {
        for (const [rx, ry, c] of [[56, 30, "#3a6f99"], [74, 40, "#2f5579"]] as const) {
          for (let i = 0; i < 160; i++) {
            const a = (i / 160) * Math.PI * 2;
            rect(ctx, Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), 1, 1, c);
          }
        }
      });
      rect(ctx, r.x, r.y, r.w, 2, "#3aa6cc");
      break;
    }
    case "boss":
      if (plan) bridgeFloor(ctx, r, plan);
      break;
    case "games": {
      // The rec deck: a court with painted lines.
      rect(ctx, r.x, r.y, r.w, r.h, "#4d6a86");
      for (let y = r.y + 1; y < r.y + r.h; y += 3) rect(ctx, r.x, y, r.w, 1, "#527090");
      const c = "#e08a4c";
      rect(ctx, r.x + 3, r.y + 3, r.w - 6, 1, c);
      rect(ctx, r.x + 3, r.y + r.h - 4, r.w - 6, 1, c);
      rect(ctx, r.x + 3, r.y + 3, 1, r.h - 6, c);
      rect(ctx, r.x + r.w - 4, r.y + 3, 1, r.h - 6, c);
      const cx = r.x + Math.round(r.w / 2);
      rect(ctx, cx, r.y + 3, 1, r.h - 6, c);
      clipTo(ctx, r, () => {
        for (let i = 0; i < 64; i++) {
          const a = (i / 64) * Math.PI * 2;
          rect(ctx, Math.round(cx + Math.cos(a) * 14), Math.round(r.y + r.h / 2 + Math.sin(a) * 10), 1, 1, c);
        }
      });
      break;
    }
    case "library":
      // Crew quarters: soft, dim carpet for sleeping.
      carpetFlecks(ctx, r, "#4a4566", "#55507a", "#625d88");
      break;
    case "server": {
      // The engine room: dark grating, hazard edges, conduits glowing toward the core.
      rect(ctx, r.x, r.y, r.w, r.h, "#1f2533");
      for (let y = r.y; y < r.y + r.h; y += 2) rect(ctx, r.x, y, r.w, 1, "#262d3d");
      for (let x = r.x; x < r.x + r.w; x += 6) rect(ctx, x, r.y, 1, r.h, "#1a1f2b");
      const core = plan?.core;
      if (core && core.x >= r.x - 2 && core.x < r.x + r.w) {
        const cx = core.x + core.w / 2;
        for (const y of [r.y + r.h - 8, r.y + Math.round(r.h * 0.45)]) {
          if (y < r.y + 3) continue;
          rect(ctx, Math.min(cx, r.x + 3), y, Math.abs(cx - (cx < r.x + r.w / 2 ? r.x + r.w - 3 : r.x + 3)), 1, "#2a6f8f");
        }
      }
      const g = new Grid(r.w, 3);
      hazard(g, 0, 0, r.w, 3);
      blit(ctx, g, r.x, r.y + r.h - 3);
      break;
    }
    case "garden": {
      // Hydroponics: green mats with drain grates.
      for (let y = r.y; y < r.y + r.h; y += 4) for (let x = r.x; x < r.x + r.w; x += 4) rect(ctx, x, y, 4, 4, ((x + y) >> 2) % 2 ? "#3f7a5a" : "#45835f");
      for (let x = r.x + 8; x < r.x + r.w - 8; x += 30) {
        rect(ctx, x, r.y + r.h - 14, 12, 6, P.steelDk);
        for (let i = 1; i < 12; i += 2) rect(ctx, x + i, r.y + r.h - 13, 1, 4, P.grate);
      }
      break;
    }
    default:
      break;
  }
}

// ------------------------------------------------------------------ the bridge

const BR = { beige: "#d8c4a2", beigeHi: "#ead9bb", beigeLo: "#b49c78", wine: "#6e2f3e", wineHi: "#8a3c4e", carpet: "#4b3a46", carpetLo: "#3f303b", deck: "#5d4a54" };

/** The bridge floor: soft plum carpet, the command well, the raised rear deck, ramps up both sides, console banks on the side walls. */
function bridgeFloor(ctx: CanvasRenderingContext2D, r: Rect, plan: ShipPlan): void {
  rect(ctx, r.x, r.y, r.w, r.h, BR.carpet);
  for (let y = r.y + 2; y < r.y + r.h; y += 4) for (let x = r.x + 1 + ((y - r.y) % 8 ? 2 : 0); x < r.x + r.w; x += 5) rect(ctx, x, y, 1, 1, "#56434f");
  const rail = plan.rail;
  const cap = plan.captain;
  if (cap && rail) {
    // A darker ellipse of carpet under the command area, a pale inlay ring around it.
    const cx = cap.x + cap.w / 2;
    const cy = cap.y + 4;
    clipTo(ctx, r, () => {
      for (let y = -24; y <= 24; y++) {
        const half = Math.round(Math.sqrt(Math.max(0, 1 - (y / 24) ** 2)) * 62);
        rect(ctx, cx - half, cy + y, half * 2, 1, BR.carpetLo);
      }
      for (let i = 0; i < 180; i++) {
        const a = (i / 180) * Math.PI * 2;
        rect(ctx, Math.round(cx + Math.cos(a) * 64), Math.round(cy + Math.sin(a) * 25), 1, 1, "#7a6070");
      }
    });
  }
  const deck = plan.rearDeck;
  if (deck) {
    // The raised rear deck: a lighter carpet with a lit step along its front.
    rect(ctx, deck.x, deck.y, deck.w, deck.h, BR.deck);
    for (let y = deck.y + 3; y < deck.y + deck.h; y += 4) for (let x = deck.x + 2 + ((y - deck.y) % 8 ? 2 : 0); x < deck.x + deck.w; x += 6) rect(ctx, x, y, 1, 1, "#6a5660");
    rect(ctx, deck.x, deck.y + deck.h, deck.w, 2, "rgba(20,14,20,0.35)");
  }
  for (const [i, q] of plan.ramps.entries()) {
    // A ramp: ribbed treads rising toward the rear deck, a lit edge.
    rect(ctx, q.x, q.y, q.w, q.h, "#a89070");
    for (let y = q.y + 2; y < q.y + q.h; y += 3) rect(ctx, q.x + 1, y, q.w - 2, 1, "#8f7658");
    rect(ctx, q.x, q.y, q.w, 1, "#c8b08a");
    rect(ctx, i ? q.x : q.x + q.w - 1, q.y, 1, q.h, "#ffd9a0");
  }
  // Console banks along the side walls, curving in toward the screen.
  const bank = (x: number, dir: 1 | -1) => {
    const y0 = r.y + 6;
    const len = Math.min(r.h - 30, (rail?.y ?? r.y + r.h) - r.y - 10);
    for (let j = 0; j < len; j++) {
      const k = Math.max(0, 1 - j / 18);
      const w = 5 + Math.round(k * 10);
      const xx = dir > 0 ? x : x - w;
      rect(ctx, xx, y0 + j, w, 1, j === 0 ? BR.beigeHi : BR.beige);
      rect(ctx, dir > 0 ? xx + w - 1 : xx, y0 + j, 1, 1, BR.beigeLo);
      if (j % 7 === 3) rect(ctx, dir > 0 ? xx + 1 : xx + w - 3, y0 + j, 2, 1, j % 14 === 3 ? "#ffc857" : "#7fe3ff");
    }
  };
  bank(r.x + 1, 1);
  bank(r.x + r.w - 1, -1);
}

/** The bridge's side walls: warm beige bulkheads with a burgundy band, the ready room's door to port and the lift's to starboard. */
function bridgeWalls(ctx: CanvasRenderingContext2D, r: Rect, plan: ShipPlan | null): void {
  for (const x of [r.x - 3, r.x + r.w - 1]) {
    rect(ctx, x, r.y - 2, 4, r.h + 2, OUTLINE);
    rect(ctx, x + 1, r.y - 2, 2, r.h + 2, BR.beige);
    rect(ctx, x + 1, r.y - 2, 1, r.h + 2, BR.beigeHi);
    for (let y = r.y + 10; y < r.y + r.h - 6; y += 28) rect(ctx, x + 1, y, 2, 6, BR.wine);
  }
  for (const d of [plan?.readyRoom, plan?.lift]) {
    if (!d) continue;
    const g = new Grid(d.w + 2, d.h + 2);
    g.rrect(1, 1, d.w, d.h, BR.beigeLo, 1);
    g.rect(2, 3, d.w - 2, d.h - 3, "#8f7658");
    g.vline(Math.floor(d.w / 2) + 1, 3, d.h - 3, "#6e5a44");
    g.rect(2, 2, d.w - 2, 1, d === plan?.readyRoom ? "#ffc857" : "#7fe3ff");
    g.outline(OUTLINE);
    blit(ctx, g, d.x - 1, d.y - 1);
  }
}

/** The cargo bay: diamond plate inside a hazard stripe, tie-down rings, the bay number. */
function cargoFloor(ctx: CanvasRenderingContext2D, r: Rect): void {
  rect(ctx, r.x, r.y, r.w, r.h, "#666d7c");
  for (let y = r.y + 2; y < r.y + r.h; y += 4) {
    for (let x = r.x + 2 + ((y - r.y) % 8 ? 2 : 0); x < r.x + r.w; x += 4) {
      rect(ctx, x, y, 2, 1, "#7a8292");
      rect(ctx, x + 1, y + 1, 1, 1, "#535a68");
    }
  }
  const g = new Grid(r.w, r.h);
  hazard(g, 0, 0, 3, r.h);
  hazard(g, r.w - 3, 0, 3, r.h);
  hazard(g, 0, r.h - 3, r.w, 3);
  for (const [x, y] of [[8, 8], [r.w - 10, 8], [8, r.h - 12], [r.w - 10, r.h - 12]] as const) {
    g.ellipse(x, y, 2, 2, P.steelDk);
    g.set(x, y, P.panelLo);
  }
  blit(ctx, g, r.x, r.y);
  drawPixelText(ctx, "BAY 2", r.x + Math.round(r.w / 2) - 10, r.y + Math.round(r.h / 2) - 3, "#8a93a4", 1);
}

// ------------------------------------------------------------------ the hull wall

/** One stretch of the hull wall, `d` deep: ribbed panels, the livery stripe, the kickplate. */
function hullWall(ctx: CanvasRenderingContext2D, x0: number, x1: number, d: number): void {
  const w = x1 - x0;
  rect(ctx, x0, 0, w, d, P.panel);
  // Panels between the ribs, with seams and the odd vent or label.
  const mid = Math.round((d - 22) * 0.52);
  rect(ctx, x0, mid, w, 1, P.panelMid);
  rect(ctx, x0, mid + 1, w, 1, P.panelHi);
  for (let x = x0 - (x0 % 40); x < x1; x += 40) {
    const k = hash(`hull${x}`);
    if (k % 4 === 0) {
      for (let i = 0; i < 4; i++) rect(ctx, x + 14, mid + 6 + i * 2, 10, 1, P.panelLo);
    } else if (k % 4 === 1 && d > 70) {
      rect(ctx, x + 12, 10, 8, 4, P.panelMid);
      rect(ctx, x + 13, 11, 6, 1, P.orange);
    }
    rect(ctx, x + 8, 8, 1, 1, P.panelLo);
    rect(ctx, x + 31, 8, 1, 1, P.panelLo);
    rect(ctx, x + 8, d - 25, 1, 1, P.panelLo);
    rect(ctx, x + 31, d - 25, 1, 1, P.panelLo);
  }
  // The ribs: structural frames every 40 px.
  for (let x = x0 - (x0 % 40) + 36; x < x1; x += 40) {
    rect(ctx, x, 4, 5, d - 13, P.panelLo);
    rect(ctx, x, 4, 1, d - 13, P.panelHi);
    rect(ctx, x + 4, 4, 1, d - 13, P.panelDk);
    rect(ctx, x + 1, 8, 3, 2, P.panelMid);
    rect(ctx, x + 1, d - 16, 3, 2, P.panelMid);
  }
  // Ceiling trim with the light rail (the lights themselves are live).
  rect(ctx, x0, 0, w, 6, P.steelDk);
  rect(ctx, x0, 5, w, 1, P.steelDeep);
  rect(ctx, x0, 0, w, 1, P.steel);
  // The livery: a teal pinstripe over the orange band.
  rect(ctx, x0, d - 22, w, 1, P.teal);
  rect(ctx, x0, d - 20, w, 3, P.orange);
  rect(ctx, x0, d - 20, w, 1, P.orangeHi);
  rect(ctx, x0, d - 17, w, 1, P.orangeLo);
  rect(ctx, x0, d - 16, w, 6, P.panelMid);
  // The kickplate with vent slots.
  rect(ctx, x0, d - 10, w, 10, P.steel);
  rect(ctx, x0, d - 10, w, 1, P.panelLo);
  rect(ctx, x0, d - 1, w, 1, P.steelDeep);
  for (let x = x0 - (x0 % 20) + 6; x < x1 - 6; x += 20) for (let i = 0; i < 3; i++) rect(ctx, x, d - 8 + i * 2, 8, 1, P.steelDeep);
  ctx.fillStyle = "rgba(16,20,34,0.28)";
  ctx.fillRect(x0, d, w, 3);
}

/** The viewscreen's bezel (the picture is live) and the bridge console under it: the AI's eye, the gravity switch. */
function viewscreenFrame(ctx: CanvasRenderingContext2D, plan: ShipPlan): void {
  const v = plan.viewscreen;
  if (v.w <= 0) return;
  // A wide screen in a steel bezel, with seams where its panels meet.
  const g = new Grid(v.w + 8, v.h + 8);
  const seams = [Math.round(v.w * 0.24), Math.round(v.w * 0.76)];
  g.rect(0, 1, v.w + 8, v.h + 6, P.steel);
  g.hline(0, 1, v.w + 8, P.panelLo);
  g.rect(4, v.h + 4, v.w, 3, P.steelDk);
  g.hline(4, v.h + 6, v.w, P.steelDeep);
  for (const sx of seams) {
    g.vline(sx + 4, 1, 3, P.panelHi);
    g.vline(sx + 4, v.h + 4, 3, P.panelHi);
  }
  // Corner brackets and a tab under the middle.
  for (const [x, y] of [[0, 1], [v.w + 4, 1], [0, v.h + 3], [v.w + 4, v.h + 3]] as const) g.rect(x, y, 4, 4, P.orange).set(x + 1, y + 1, P.orangeHi);
  g.rect(Math.floor(v.w / 2) - 5, v.h + 5, 18, 2, P.steelDeep);
  g.outline(OUTLINE);
  blit(ctx, g, v.x - 4, v.y - 4);
  ctx.fillStyle = "#03050c";
  ctx.fill(screenPath(v));
  // The console under it.
  const band = plan.ai?.y ?? v.y + v.h + 6;
  const cw = v.w + 4;
  const c = new Grid(cw, 20);
  panel(c, 0, 2, cw, 18, P.steel, 2);
  c.rect(2, 4, cw - 4, 1, P.steelDk);
  for (let x = 30; x < cw - 34; x += 6) c.rect(x, 9, 4, 2, x % 12 ? P.steelDk : P.steelDeep);
  rivets(c, 4, 16, cw - 6, 10, P.steel);
  c.outline(OUTLINE);
  blit(ctx, c, v.x - 2, band - 2);
  if (plan.ai) {
    const a = plan.ai;
    const e = new Grid(a.w, a.h);
    e.rrect(0, 0, a.w, a.h, P.steelDeep, 2);
    e.ellipse(a.w / 2 - 0.5, a.h / 2 - 1.5, 5, 5, P.steelDk);
    e.ellipse(a.w / 2 - 0.5, a.h / 2 - 1.5, 4, 4, "#0b1020");
    e.hline(3, a.h - 3, a.w - 6, P.steelDk);
    e.outline(OUTLINE);
    blit(ctx, e, a.x, a.y);
  }
  if (plan.gravity) {
    const s = plan.gravity;
    const e = new Grid(s.w, s.h);
    e.rrect(0, 0, s.w, s.h, P.steelDeep, 1);
    hazard(e, 1, 1, s.w - 2, 3);
    e.rect(Math.floor(s.w / 2) - 1, 5, 2, s.h - 7, "#0b1020");
    e.outline(OUTLINE);
    blit(ctx, e, s.x, s.y);
  }
}

// ------------------------------------------------------------------ the steps

export const BACKGROUND: Partial<BackgroundSteps> = {
  floor(ctx, L) {
    const plan = planOf(L);
    plates(ctx, { x: 0, y: 0, w: L.W, h: L.H }, P.deck, P.deckSeam, 24, 16, 7);
    const doorX = L.entrance.x;
    const top = Math.min(...L.segments.map((s) => s.depth));
    for (const hy of L.net.halls) corridorH(ctx, 0, L.W, hy, doorX);
    for (const ax of L.net.aisles) corridorV(ctx, ax, top, L.H);
    for (const hy of L.net.halls) for (const ax of L.net.aisles) junction(ctx, ax, hy);
    if (plan?.cargo) cargoFloor(ctx, plan.cargo);
    if (plan) hullEdges(ctx, L, plan);
  },
  wall(ctx, L) {
    const plan = planOf(L);
    const E = plan?.edgeX ?? 0;
    for (const sg of L.segments) hullWall(ctx, Math.max(sg.x0, E), Math.min(sg.x1, L.W - E), sg.depth);
    // Columns where the wall steps in or out.
    for (const px of L.wall.pillars) {
      const left = L.segments.find((s) => s.x1 === px);
      const right = L.segments.find((s) => s.x0 === px);
      const d = Math.max(left?.depth ?? 64, right?.depth ?? 64);
      rect(ctx, px - 4, 0, 8, d + 3, P.panelLo);
      rect(ctx, px - 4, 0, 2, d + 3, P.panelHi);
      rect(ctx, px + 2, 0, 2, d + 3, P.panelDk);
      rect(ctx, px - 5, d - 1, 10, 4, P.steelDk);
      for (let y = 10; y < d - 6; y += 12) rect(ctx, px - 1, y, 2, 1, P.panelMid);
    }
    if (plan) viewscreenFrame(ctx, plan);
  },
  pods(ctx, L) {
    // Crew stations stand on raised platforms with a glowing trim.
    for (const pod of L.pods) {
      const r = { x: pod.x - 4, y: pod.y + 2, w: pod.w + 8, h: pod.h - 2 };
      rect(ctx, r.x, r.y, r.w, r.h, P.steelDk);
      plates(ctx, { x: r.x + 2, y: r.y + 2, w: r.w - 4, h: r.h - 4 }, "#6c7486", "#5a6172", 16, 12, pod.x + pod.y, 0.03);
      rect(ctx, r.x + 2, r.y + 2, r.w - 4, 1, "#4fb6d6");
      rect(ctx, r.x + 2, r.y + r.h - 3, r.w - 4, 1, "#2f6f86");
      rect(ctx, r.x, r.y + r.h, r.w, 2, "rgba(16,20,34,0.3)");
    }
  },
  room(ctx, room, L) {
    const plan = planOf(L);
    roomFloor(ctx, room, L, plan);
    if (!room.walls && room.kind !== "pod") compartment(ctx, room.rect, L, plan);
  },
  roomWalls(ctx, room, L) {
    const r = room.rect;
    if (!room.walls) return;
    if (room.kind === "boss") {
      bridgeWalls(ctx, r, planOf(L));
      return;
    }
    const seg = L.segments.find((sg) => r.x >= sg.x0 && r.x < sg.x1);
    const atWall = seg !== undefined && r.y <= seg.depth + 1;
    const cabin = room.walls === "wood";
    const frame = cabin ? P.panelMid : P.steel;
    const glass = cabin ? P.cream : "#9fd7ea";
    const up = atWall ? 2 : 8;
    // Side bulkheads: a frame with a glass (or panelled) inlay.
    for (const x of [r.x - 3, r.x + r.w - 1]) {
      rect(ctx, x, r.y - up, 4, r.h + up, OUTLINE);
      rect(ctx, x + 1, r.y - up, 2, r.h + up, frame);
      rect(ctx, x + 1, r.y - up, 1, r.h + up, cabin ? P.creamLo : "#c6ecf7");
      for (let y = r.y + 8; y < r.y + r.h - 6; y += 24) rect(ctx, x + 1, y, 2, 2, cabin ? "#8f6040" : P.panelLo);
    }
    if (!atWall) {
      const gap = room.doorSide === "top" ? (room.doorX ?? -1) : -1;
      for (let x = r.x - 3; x < r.x + r.w + 3; x++) {
        if (gap >= 0 && x >= gap - 9 && x < gap + 9) continue;
        rect(ctx, x, r.y - 9, 1, 1, OUTLINE);
        rect(ctx, x, r.y - 8, 1, 2, frame);
        rect(ctx, x, r.y - 6, 1, 4, glass);
        rect(ctx, x, r.y - 2, 1, 1, cabin ? "#8f6040" : P.cyanDk);
        rect(ctx, x, r.y - 1, 1, 1, OUTLINE);
      }
      if (gap >= 0) {
        for (const p of [gap - 10, gap + 9]) {
          rect(ctx, p, r.y - 11, 2, 11, OUTLINE);
          rect(ctx, p, r.y - 10, 1, 9, P.orange);
        }
      }
    }
  },
  window(ctx, win) {
    // A porthole on a bolted plate; the glass circle sits inside the cleared pane.
    const { x, y } = win;
    const n = 31;
    const c = 15;
    const g = new Grid(n, n);
    g.rrect(0, 0, n, n, P.panelMid, 5);
    g.rrect(1, 1, n - 2, n - 2, P.panel, 5);
    g.ellipse(c, c, 13, 13, P.steelDk);
    g.ellipse(c, c, 12, 12, P.steel);
    g.ellipse(c - 0.6, c - 0.6, 11, 11, P.panelLo);
    g.ellipse(c, c, 10, 10, P.steelDk);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      g.set(Math.round(c + Math.cos(a) * 11.6), Math.round(c + Math.sin(a) * 11.6), P.panelHi);
    }
    for (const [bx, by] of [[2, 2], [n - 3, 2], [2, n - 3], [n - 3, n - 3]] as const) g.set(bx, by, P.panelLo);
    g.outline(OUTLINE);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) if ((i - c) ** 2 + (j - c) ** 2 <= 7.9 ** 2) g.set(i, j, null);
    blit(ctx, g, x + 12 - c, y + 12 - c);
  },
  pinboard(ctx, r) {
    // The crew notice board: navy felt in a steel frame, a header strip.
    const g = new Grid(r.w + 2, r.h + 2);
    panel(g, 0, 0, r.w + 2, r.h + 2, P.steel, 2);
    g.rect(3, 3, r.w - 4, r.h - 4, "#2c3a5c");
    for (let i = 0; i < 220; i++) g.set(3 + ((i * 37) % (r.w - 4)), 3 + ((i * 53 + (i >> 3)) % (r.h - 4)), i % 3 ? "#33436a" : "#27334f");
    g.rect(r.w / 2 - 14, 0, 28, 2, P.orange);
    g.outline(OUTLINE);
    blit(ctx, g, r.x - 1, r.y - 1);
  },
  calendar(ctx, c) {
    const g = new Grid(c.w + 4, c.h + 4);
    panel(g, 0, 0, c.w + 4, c.h + 4, P.steel, 1);
    g.rect(2, 2, c.w, c.h, P.white);
    g.rect(2, 2, c.w, 7, P.orangeLo);
    g.rect(2, c.h, c.w, 2, P.whiteLo);
    g.outline(OUTLINE);
    blit(ctx, g, c.x - 2, c.y - 2);
  },
  status(ctx, s) {
    const g = new Grid(s.w + 4, s.h + 4);
    panel(g, 0, 0, s.w + 4, s.h + 4, P.steel, 1);
    g.rect(2, 2, s.w, s.h, "#0d1322");
    g.outline(OUTLINE);
    blit(ctx, g, s.x - 2, s.y - 2);
  },
  door(ctx, d) {
    // The airlock: a heavy hatch in a hazard-striped frame, two leaves that slide apart.
    const g = new Grid(d.w + 10, d.h + 6);
    g.rrect(0, 0, d.w + 10, d.h + 6, P.steelDk, 3);
    hazard(g, 1, 1, d.w + 8, 3);
    hazard(g, 1, 1, 3, d.h + 4);
    hazard(g, d.w + 6, 1, 3, d.h + 4);
    g.rrect(4, 4, d.w + 2, d.h + 2, P.steelDeep, 2);
    // The leaves.
    const lw = Math.floor(d.w / 2);
    for (const [x0, dir] of [[5, 1], [5 + lw, -1]] as const) {
      g.rect(x0, 5, lw, d.h, P.panelMid);
      g.rect(x0, 5, lw, 1, P.panelHi);
      g.rect(dir > 0 ? x0 : x0 + lw - 1, 5, 1, d.h, dir > 0 ? P.panelHi : P.panelLo);
      g.rect(x0 + 1, 20, lw - 2, 2, P.orange);
      for (let y = 26; y < d.h; y += 4) g.hline(x0 + 2, y, lw - 4, P.panelLo);
    }
    g.vline(5 + lw - 1, 5, d.h, P.steelDk);
    g.vline(5 + lw, 5, d.h, P.steelDeep);
    // A small round window in the hatch.
    g.ellipse(4 + d.w / 2 + 0.5, 12.5, 3.5, 3.5, P.steelDk);
    g.ellipse(4 + d.w / 2 + 0.5, 12.5, 2.4, 2.4, "#1a2c4a");
    g.set(4 + d.w / 2, 11, "#6f8fc9");
    g.outline(OUTLINE);
    blit(ctx, g, d.x - 5, d.y - 3);
    // The "+" over it: a lit sign (a new thread comes aboard).
    const sg = new Grid(14, 9);
    sg.rect(1, 1, 12, 7, "#1f5a46");
    sg.rect(6, 2, 2, 5, P.mint).rect(4, 4, 6, 1, P.mint);
    sg.outline(OUTLINE);
    ctx.drawImage(sg.toCanvas(), Math.round(d.x + d.w / 2 - 7), Math.max(1, Math.round(d.y - 13)));
  },
  legend(ctx, n) {
    // A yellow help tag with a "?".
    const g = new Grid(n.w + 2, n.h + 2);
    g.rrect(1, 1, n.w, n.h, P.hazard, 1);
    g.rect(1, 1, n.w, 2, mix(P.hazard, "#ffffff", 0.3));
    const qx = Math.floor(n.w / 2) - 1;
    g.rect(qx, 4, 3, 1, P.steelDeep).set(qx + 2, 5, P.steelDeep).set(qx + 1, 6, P.steelDeep).set(qx + 1, 8, P.steelDeep);
    g.outline(OUTLINE);
    blit(ctx, g, n.x - 1, n.y - 1);
  },
  painting() {
    // No paintings on a hull.
  },
  clock(ctx, k) {
    // The ship's chronometer: a pale dial in a steel bezel with orange ticks.
    const { x, y, r } = k;
    const g = new Grid(r * 2 + 7, r * 2 + 7);
    const c = r + 3;
    g.ellipse(c, c, r + 1, r + 1, P.steelDk);
    g.ellipse(c, c, r, r, P.steel);
    g.ellipse(c, c, r - 1.5, r - 1.5, P.white);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.set(c + Math.round(Math.sin(a) * (r - 2.6)), c - Math.round(Math.cos(a) * (r - 2.6)), i % 3 === 0 ? P.orangeLo : P.panelMid);
    }
    g.outline(OUTLINE);
    blit(ctx, g, x - c, y - c);
  },
};
