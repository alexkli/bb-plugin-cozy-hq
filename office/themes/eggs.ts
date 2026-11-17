// Small helpers for the sceneries' hidden Easter eggs: when one goes off on
// its own, and who says what when it does. Each scenery keeps its eggs in
// its own folder (eggs.ts there); these are just the bits they share.
import type { Layout, Rect } from "../layout.ts";
import type { SceneryActions } from "../theme.ts";

/**
 * Whether an Easter egg goes off on its own now: the scenery's tick runs about
 * twice a second, so this is true about once every `every` seconds of office
 * time, and never within `gap` seconds of the last one (`last`, PaintInfo.t).
 */
export function rarely(t: number, last: number, every = 5400, gap = 1800): boolean {
  if (t - last < gap) return false;
  return Math.random() < 0.5 / every;
}

/** A line each from whoever's nearest a point (the first line the nearest), `at` seconds from now; "boss" lines are yours. */
export function chorus(act: SceneryActions, x: number, y: number, lines: readonly (readonly [number, string, ("boss" | number)?])[], r = 160): void {
  const near = act.near(x, y, r);
  for (const [at, text, who] of lines) {
    const id = who === "boss" ? "boss" : near[(who ?? 0) % Math.max(1, near.length)]?.id;
    if (id) act.say(id, text, text.length > 26 ? 3.4 : 2.6, at);
  }
}

/** One of a list, at random. */
export const pick = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)]!;

/** Smoothstep of x over [0, 1]: easing for things that start and stop gently. */
export const ease = (x: number): number => {
  const u = Math.max(0, Math.min(1, x));
  return u * u * (3 - 2 * u);
};

/**
 * A bare stretch of the back wall for something small hung on it (w×h, its
 * top `fromTop` px down the wall): clear of the wall's fixtures, windows, the
 * TV and its speakers (and `avoid`: the scenery's own things on the wall).
 * The one nearest `towardX`, or null when it's all taken.
 */
export function bareWall(L: Layout, w: number, h: number, fromTop: number, towardX = L.W / 2, avoid: readonly Rect[] = []): Rect | null {
  const wl = L.wall;
  const cr = wl.clock.r + 3;
  const taken: Rect[] = [
    wl.pinboard, wl.calendar, wl.status, wl.legendNote, L.tv, ...L.speakers, ...wl.windows,
    { x: wl.door.x - 4, y: 0, w: wl.door.w + 8, h: 999 },
    { x: wl.clock.x - cr, y: wl.clock.y - cr, w: cr * 2, h: cr * 2 },
    ...avoid,
  ];
  let best: Rect | null = null;
  for (const sg of L.segments) {
    const y = fromTop;
    if (y + h > sg.depth - 2) continue;
    for (let x = sg.x0 + 4; x + w <= sg.x1 - 4; x += 2) {
      const r = { x, y, w, h };
      if (taken.some((q) => r.x < q.x + q.w + 3 && q.x < r.x + r.w + 3 && r.y < q.y + q.h + 2 && q.y < r.y + r.h + 2)) continue;
      if (!best || Math.abs(x + w / 2 - towardX) < Math.abs(best.x + w / 2 - towardX)) best = r;
    }
  }
  return best;
}
