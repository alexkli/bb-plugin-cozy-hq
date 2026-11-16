// Dusty Annex: where the building's fixtures are (the tubes along the wall,
// the radiators under the windows, the old hall's stage and its tea urn).
// Pure geometry, shared by the backdrop, the live layers and the things to
// click, so a click lands on what's drawn.

import type { Layout, Rect } from "../../layout.ts";
import { cached, OUTLINE, rect } from "../../themekit.ts";
import { P } from "./pal.ts";
import { planOf, type Cell } from "./plan.ts";

export interface Tube {
  x: number;
  w: number;
}

/** The fluorescent fittings along the top of the wall: one over every aisle (where a ladder goes), the rest spaced out. */
export function tubes(L: Layout): Tube[] {
  return cached(`annex|tubes|${L.W}x${L.H}|${L.segments.map((s) => `${s.x0}-${s.x1}`).join(",")}|${L.net.aisles.join(",")}`, () => {
    const out: Tube[] = [];
    for (const seg of L.segments) {
      const centers = L.net.aisles.filter((x) => x - 12 >= seg.x0 + 2 && x + 12 <= seg.x1 - 2);
      const span = seg.x1 - seg.x0;
      const n = Math.max(1, Math.round(span / 64));
      for (let i = 0; i < n; i++) {
        const cx = Math.round(seg.x0 + (span / n) * (i + 0.5));
        if (cx - 12 < seg.x0 + 2 || cx + 12 > seg.x1 - 2) continue;
        if (centers.every((c) => Math.abs(c - cx) >= 30)) centers.push(cx);
      }
      if (centers.length === 0) centers.push(Math.round((seg.x0 + seg.x1) / 2));
      for (const cx of centers.sort((a, b) => a - b)) out.push({ x: cx - 11, w: 22 });
    }
    return out;
  });
}

/** The cast-iron radiators on the dado under the windows (where there's room below the sill). */
export function radiators(L: Layout): Rect[] {
  const out: Rect[] = [];
  for (const win of L.wall.windows) {
    const seg = L.segments.find((sg) => win.x >= sg.x0 && win.x < sg.x1);
    if (!seg) continue;
    const y = seg.depth - 11;
    if (y < win.y + win.h + 3) continue;
    out.push({ x: win.x + 5, y, w: win.w - 10, h: 8 });
  }
  return out;
}

export function drawRadiator(ctx: CanvasRenderingContext2D, r: Rect, seed: number): void {
  rect(ctx, r.x - 1, r.y - 1, r.w + 2, r.h + 2, OUTLINE);
  rect(ctx, r.x, r.y, r.w, r.h, "#b4a988");
  for (let x = r.x + 1; x < r.x + r.w - 1; x += 3) rect(ctx, x + 1, r.y + 1, 1, 6, "#8f8566");
  rect(ctx, r.x, r.y, r.w, 1, "#cbc0a0");
  rect(ctx, r.x + 2 + (seed % 7), r.y + 5, 3, 2, "#8a5a3a");
  rect(ctx, r.x + r.w - 4, r.y + 2, 2, 1, "#8a5a3a");
  rect(ctx, r.x - 3, r.y + 6, 2, 2, P.metalLo);
}

/** The old hall (the one open room), if this plan has one. */
export function hallOf(L: Layout): Cell | null {
  return planOf(L)?.cells.find((c) => c.kind === "hall") ?? null;
}

/** The little stage at the far end of the old hall, when the hall is big enough for one. */
export function stageOf(c: Cell): Rect | null {
  const r = c.r;
  return r.w >= 160 && r.h >= 70 ? { x: r.x + r.w - 34, y: r.y + 12, w: 28, h: r.h - 24 } : null;
}

/** The tea urn on its trolley, top left of the old hall. */
export function urnOf(L: Layout): Rect | null {
  const c = hallOf(L);
  return c && c.r.h >= 40 ? { x: c.r.x + 5, y: c.r.y + 6, w: 18, h: 24 } : null;
}

/** Where the leak drips from: the ceiling above the bucket, but not past the room it's in (or the wall). */
export function leakTop(L: Layout, b: Rect): number {
  const cell = planOf(L)?.cells.find((c) => b.x >= c.r.x && b.x < c.r.x + c.r.w && b.y >= c.r.y && b.y < c.r.y + c.r.h);
  const seg = L.segments.find((s) => b.x >= s.x0 && b.x < s.x1);
  return Math.round(Math.max(b.y - 46, (cell?.r.y ?? 0) + 2, (seg?.depth ?? 0) + 2));
}
