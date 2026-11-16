// Subagents and spawned threads, as the office shows them. Pure: no DOM.
//
// bb tells a plugin about two kinds:
// - `activity.backgroundAgents`: a coding agent's own subagents running in the
//   background inside one thread (Claude Code's background Agent tasks). They
//   aren't threads, so they come over as small helpers and stand next to the
//   thread's desk while it works.
// - `parentThreadId`: bb threads spawned (or forked) by another thread. They
//   are workers of their own with their own desks; a thread and the ones it
//   spawned wear matching lanyards.

import type { Desk, Facing, Point } from "./layout.ts";
import type { ThreadLike } from "./model.ts";
import { hash } from "./pixel.ts";

/** At most this many helpers stand at one desk; the rest show as "+n". */
export const HELPER_CAP = 3;

/** Where a helper stands next to a desk. */
export interface HelperSpot {
  x: number;
  y: number;
  /** Turned toward the person at the desk. */
  facing: Facing;
  /** Turned toward the screen, when pointing at it or reading along. */
  screen: Facing;
  /** From a hallway (first point) to the spot (last point). */
  path: Point[];
}

/** The thread's own subagents at work right now (bb's background agent count). */
export function subagentsOf(t: Pick<ThreadLike, "activity">): number {
  const n = t.activity.backgroundAgents;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/**
 * Standing room next to a desk, best first. Desks sit 48 px apart in a row,
 * so each side of a desk has room for one helper (the neighbor's helper
 * stands in the other half of the gap). North seats face you from behind
 * their desk: helpers stand beside the chair, a step back so they stand
 * taller than the seated thread, the desk hiding their legs, and a third
 * looks over its shoulder from behind the chair. South seats have their back
 * to you: helpers stand on either side in front of the desk; there's no room
 * for a third that wouldn't hide the thread or stand in the lane behind the
 * chairs that people walk along.
 */
export function helperSpots(desk: Desk): HelperSpot[] {
  const s = desk.spot;
  // The lane point before the seat: walk along the lane, then step in.
  const lane = s.path[s.path.length - 2] ?? s.path[0]!;
  const at = (dx: number, dy: number, facing: Facing, screen: Facing): HelperSpot => {
    const x = s.x + dx;
    const y = s.y + dy;
    return { x, y, facing, screen, path: [...s.path.slice(0, -1), { x, y: lane.y }, { x, y }] };
  };
  if (desk.side === "north") return [at(16, -7, "left", "front"), at(-16, -7, "right", "front"), at(8, -15, "front", "front")];
  return [at(16, -1, "left", "back"), at(-16, -1, "right", "back")];
}

/** How many helpers stand at a desk with room for `room`, and how many more there are. */
export function helperCount(subagents: number, room: number): { shown: number; more: number } {
  const n = Math.max(0, Math.floor(subagents));
  const shown = Math.min(n, HELPER_CAP, Math.max(0, room));
  return { shown, more: n - shown };
}

/** Lanyard colors, one per family (bright, so they read on any shirt). */
export const LANYARDS = ["#ff5d73", "#ffc53d", "#3ddc97", "#4cc3ff", "#b48cff", "#ff8f3d", "#2ec4b6"];

/**
 * Families of threads in the office: thread id → the id of the topmost
 * thread of its family that's here too. Only threads with a parent or a
 * child among `threads` are in one.
 */
export function familiesOf(threads: readonly Pick<ThreadLike, "id" | "parentThreadId">[]): Map<string, string> {
  const parent = new Map<string, string>();
  const here = new Set(threads.map((t) => t.id));
  for (const t of threads) if (t.parentThreadId && t.parentThreadId !== t.id && here.has(t.parentThreadId)) parent.set(t.id, t.parentThreadId);
  const out = new Map<string, string>();
  for (const t of threads) {
    let root = t.id;
    // Walk up while the parent is here (a guard against loops).
    for (let i = 0; i < 32 && parent.has(root); i++) root = parent.get(root)!;
    if (root !== t.id) {
      out.set(t.id, root);
      out.set(root, root);
    }
  }
  return out;
}

/** The lanyard color of a family. */
export function lanyardOf(root: string): string {
  return LANYARDS[hash(root) % LANYARDS.length]!;
}
