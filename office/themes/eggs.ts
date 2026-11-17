// Small helpers for the sceneries' hidden Easter eggs: when one goes off on
// its own, and who says what when it does. Each scenery keeps its eggs in
// its own folder (eggs.ts there); these are just the bits they share.
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
