// Redwood Camp is out in the open: there is no back wall. The top of the camp
// is the treeline, giant trunks with the sky showing through the gaps between
// them (the office's windows). The notice board stands on log posts, the
// calendar and status board hang on a signpost, the cuckoo clock on a giant,
// and people come and go through the trailhead gate.
import type { Layout, Rect } from "../../layout.ts";
import { campData, dropPlant, type LineTrunk } from "./plan.ts";

interface Span {
  a: number;
  b: number;
}

const hits = (busy: Span[], a: number, b: number) => busy.some((s) => a < s.b && b > s.a);

/** Turn the plan's back wall into the treeline: sky gaps, trunks, and posts under the fixtures. */
export function outdoors(L: Layout): void {
  const data = campData(L);
  if (!data) return;
  const W = L.W;
  const wl = L.wall;
  // Nothing hangs on a wall out here.
  wl.paintings = [];
  dropPlant(L, (p) => p.sprite === "HANGING_PLANT");
  const segAt = (x: number) => L.segments.find((s) => x >= s.x0 && x < s.x1) ?? (x < 0 ? L.segments[0]! : L.segments[L.segments.length - 1]!);
  const depthAt = (x: number) => segAt(Math.round(x)).depth;
  const trunks: LineTrunk[] = [];
  let n = 0;
  const add = (x: number, w: number, kind: LineTrunk["kind"], d = depthAt(x + w / 2)): LineTrunk => {
    const t: LineTrunk = { x: Math.round(x), w: Math.max(3, Math.round(w)), d, seed: 300 + n++ * 37, kind };
    trunks.push(t);
    return t;
  };
  const busy: Span[] = [];

  // The notice board stands on two log posts.
  const pin = wl.pinboard;
  add(pin.x + 8, 5, "post").top = pin.y + 4;
  add(pin.x + pin.w - 13, 5, "post").top = pin.y + 4;
  busy.push({ a: pin.x - 3, b: pin.x + pin.w + 3 });
  // The trailhead: a trunk on the left (the "?" note is pinned to it), a post on the right.
  const door = wl.door;
  const note = wl.legendNote;
  add(note.x - 2, door.x - 3 - (note.x - 2), "trunk");
  add(door.x + door.w + 1, 5, "post").top = door.y - 8;
  busy.push({ a: note.x - 4, b: door.x + door.w + 8 });
  // The screen and the giants that come up from the camp floor.
  const tvSeg = segAt(L.tv.x);
  if (L.tv.y < tvSeg.depth) busy.push({ a: L.tv.x - 16, b: L.tv.x + L.tv.w + 16 });
  for (const t of data.trees) if (t.base - t.h < depthAt(t.x + t.w / 2)) busy.push({ a: t.x - 5, b: t.x + t.w + 5 });

  // The cuckoo clock hangs on a giant of its own (with the calendar and the
  // status board when they're beside it, else those hang on a signpost).
  const clk = wl.clock;
  const cal = wl.calendar;
  // On a phone the top-right corner is under the panel's buttons: hang the clock by the calendar instead.
  if (L.portrait) clk.x = Math.min(clk.x, cal.x + cal.w + 22);
  const near = cal.x > clk.x && cal.x - clk.x < 44;
  if (!near) busy.push({ a: cal.x - 3, b: cal.x + cal.w + 3 });
  const g0 = clk.x - 16;
  const g1 = near ? cal.x + cal.w + 4 : clk.x + 16;
  let dx = 0;
  for (let k = 0; k < W; k++) {
    const cands = [k, -k];
    const ok = cands.find((d) => g0 + d >= 2 && g1 + d <= W - 2 && !hits(busy, g0 + d - 2, g1 + d + 2));
    if (ok !== undefined) {
      dx = ok;
      break;
    }
  }
  clk.x += dx;
  if (near) {
    wl.calendar = { ...cal, x: cal.x + dx };
    wl.status = { ...wl.status, x: wl.status.x + dx };
  }
  const t0 = clk.x - 14;
  const t1 = near ? wl.calendar.x + wl.calendar.w + 4 : clk.x + 14;
  add(t0, t1 - t0, "trunk");
  busy.push({ a: g0 + dx - 2, b: g1 + dx + 2 });
  if (!near) add(wl.calendar.x + 7, 6, "post").top = 1;

  // Giants where the camp's sections meet (they hide the step in the treeline).
  for (const px of wl.pillars) {
    if (busy.some((s) => px > s.a - 6 && px < s.b + 6)) continue;
    const d = Math.max(...L.segments.filter((s) => s.x0 === px || s.x1 === px).map((s) => s.depth));
    add(px - 11, 22, "trunk", d);
    busy.push({ a: px - 13, b: px + 13 });
  }

  // Sky gaps between the trunks, of different widths.
  const shells = [
    ...L.rooms.filter((r) => r.kind !== "lounge" && r.kind !== "games" && r.kind !== "garden" && r.kind !== "library").map((r) => ({ rect: r.rect, peak: r.kind === "meeting" })),
    ...(data.tents ?? []).map((t) => ({ rect: t, peak: false })),
  ];
  const windows: Rect[] = [];
  const widths = [40, 34, 44, 30, 38];
  const gaps = [14, 20, 12, 18];
  const m = 9;
  for (const s of L.segments) {
    const edgeR = s.x1 >= W;
    const hi = edgeR ? W - 3 : s.x1 - 2 - m;
    let x = (s.x0 <= 0 ? 4 : s.x0 + 2) + m;
    while (x < hi) {
      const i = windows.length;
      // The planned width, or a narrower gap where that doesn't fit.
      let w = 0;
      for (let ww = widths[i % widths.length]!; ww >= 26; ww -= 4) {
        if (x + ww <= hi && !hits(busy, x - m, x + ww + (edgeR && x + ww + m > W ? 0 : m))) {
          w = ww;
          break;
        }
      }
      if (w === 0) {
        x += 2;
        continue;
      }
      const y = 9 + [0, 2, -1, 3][i % 4]!;
      let bottom = Math.min(s.depth - 14, 59);
      for (const r of shells) {
        if (r.rect.x < x + w + 2 && r.rect.x + r.rect.w > x - 2 && r.rect.y <= s.depth + 6) bottom = Math.min(bottom, r.rect.y - (r.peak ? 27 : 12));
      }
      if (bottom - y < 20) {
        x += 2;
        continue;
      }
      windows.push({ x, y, w, h: bottom - y });
      busy.push({ a: x - 3, b: x + w + 3 });
      x += w + gaps[i % gaps.length]!;
    }
  }
  windows.sort((p, q) => p.x - q.x);
  // A trunk on each side of a gap (one shared between close neighbours).
  // The office clears the sky in at x+4..x+w-4, so the bark stops just outside that.
  for (const [i, w] of windows.entries()) {
    const prev = windows[i - 1];
    const next = windows[i + 1];
    if (!prev || w.x - (prev.x + prev.w) > 24) add(w.x + 3 - 12, 12, "trunk");
    const tw = next && next.x - (w.x + w.w) <= 24 ? next.x + 3 - (w.x + w.w - 2) : 12;
    add(w.x + w.w - 2, tw, "trunk");
  }
  wl.windows = windows;

  // More giants wherever the treeline has room for one.
  const taken: Span[] = [...busy, ...trunks.map((t) => ({ a: t.x - 4, b: t.x + t.w + 4 }))];
  let houses = 0;
  for (const s of L.segments) {
    const cuts = taken.filter((c) => c.b > s.x0 && c.a < s.x1).sort((p, q) => p.a - q.a);
    let x = s.x0;
    const free: Span[] = [];
    for (const c of cuts) {
      if (c.a > x) free.push({ a: x, b: c.a });
      x = Math.max(x, c.b);
    }
    if (x < s.x1) free.push({ a: x, b: s.x1 });
    for (const f of free) {
      const atEdge = f.a <= 0 || f.b >= W;
      const len = f.b - f.a;
      if (len < (atEdge ? 12 : 20)) continue;
      const w = Math.min(26, len - (atEdge ? 2 : 8));
      const x0 = f.a <= 0 ? -2 : f.b >= W ? W - w + 2 : Math.round((f.a + f.b - w) / 2);
      const t = add(x0, w, "trunk", s.depth);
      if (w >= 14 && houses++ % 2 === 0) t.house = 18 + (t.seed % 13);
    }
  }
  data.line = { trunks };
}
