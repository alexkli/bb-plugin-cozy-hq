// Which agents wear a soft glow: warm for one that just finished (or started
// waiting on you) and that you haven't opened since, cool for one that got to
// work since you last looked, for as long as it works. Pure logic (but for updateOpened, which keeps the record
// in localStorage), so it can be unit tested with node --test.
//
// bb sets a thread's lastReadAt when you open it, but clears it when you mark
// the thread unread, and doesn't touch it when you open a thread that's
// already read (one with a question, say). So we keep a small record of when
// you last had each thread open, and when its current question came in.

import { moodOf, type Mood, type ThreadLike } from "./model.ts";

/** Warm: finished, new for you. Cool: got to work since you last looked. */
export type Highlight = "finished" | "started";

/** What we know about one thread beyond bb's own fields. */
export interface Opened {
  /** The last time you had it open (its page in bb, or bb's lastReadAt). */
  o: number;
  /** When we first saw its current question, approval or plan (bb keeps no time for those; 0: from before we watched). */
  q?: number;
}

export interface OpenedRecord {
  /** When the record was last brought up to date (0: never). */
  at: number;
  /** Only threads bb's lastReadAt doesn't already cover. */
  threads: Record<string, Opened>;
}

export const NO_RECORD: OpenedRecord = { at: 0, threads: {} };

/** Kept in localStorage under the office's key, shared by the office and the overlay that sees which thread you open. */
export function openedKey(storageKey: string): string {
  return `${storageKey}:opened`;
}

export function parseOpened(raw: string | null): OpenedRecord {
  try {
    const v = raw ? (JSON.parse(raw) as Partial<OpenedRecord>) : null;
    if (v && typeof v.at === "number" && v.threads && typeof v.threads === "object") return { at: v.at, threads: v.threads };
  } catch {
    // unreadable: start over
  }
  return NO_RECORD;
}

/**
 * Bring the record up to date with the threads as they are now, and the one
 * whose page is open (if any). Threads that are gone are dropped.
 *
 * The very first time, a finished thread is new if bb says you haven't opened
 * it since (lastReadAt before the finish); one you had marked unread, or one
 * already waiting on you, is not: bb can't say whether you looked. After
 * that, a question we haven't seen yet came in while we weren't watching, so
 * it is new.
 */
export function noteOpened(rec: OpenedRecord, threads: readonly ThreadLike[], now: number, openId: string | null): OpenedRecord {
  // Still loading: keep what we know.
  if (threads.length === 0) return rec;
  const first = rec.at === 0;
  const out: Record<string, Opened> = {};
  for (const t of threads) {
    const prev = rec.threads[t.id];
    // Marked unread since our last look (only read threads can be): it was seen by then (or now, the first time).
    const base = prev?.o ?? (t.lastReadAt === null ? (first ? now : rec.at) : 0);
    const o = Math.max(base, t.lastReadAt ?? 0, t.id === openId ? now : 0);
    const entry: Opened = { o };
    if (moodOf(t) === "needs-you") entry.q = prev?.q ?? (first ? 0 : now);
    // Remember only what bb's lastReadAt doesn't say.
    if (entry.q !== undefined || t.lastReadAt === null || o > t.lastReadAt) out[t.id] = entry;
  }
  return { at: now, threads: out };
}

/** When it last started waiting on you, as far as anyone knows (0: not waiting). */
function waitingSince(t: ThreadLike, rec: OpenedRecord): number {
  const mood = moodOf(t);
  if (mood === "needs-you") return rec.threads[t.id]?.q ?? 0;
  // bb stamps latestAttentionAt when a turn ends, done or failed.
  if (mood === "done" || mood === "error") return t.latestAttentionAt;
  return 0;
}

/**
 * Finished (or asked, or has a plan for you) after you last had it open.
 * Opening it once ends that; marking it unread again doesn't bring it back,
 * only a new finish does.
 */
export function isUnopened(t: ThreadLike, rec: OpenedRecord): boolean {
  const since = waitingSince(t, rec);
  if (since <= 0) return false;
  const opened = Math.max(rec.threads[t.id]?.o ?? 0, t.lastReadAt ?? 0);
  return since > opened;
}

/** Work happens at a desk or, for plans, in the meeting room. */
export function isWork(mood: Mood): boolean {
  return mood === "working" || mood === "planning";
}

/** Moved into work from anything else (null: a thread that's new to the office). */
export function startsWork(from: Mood | null, to: Mood): boolean {
  return isWork(to) && (from === null || !isWork(from));
}

/** Whether the cool glow is on after a mood change: it comes on when work starts and stays until the work ends (planning into working is the same work). */
export function keepsStarted(was: boolean, from: Mood | null, to: Mood): boolean {
  return startsWork(from, to) || (was && isWork(to));
}

/** The glow an agent wears right now: a new finish until opened, a start for as long as it works (positional: called every frame). */
export function highlightOf(mood: Mood, unopened: boolean, started: boolean): Highlight | null {
  if (unopened) return "finished";
  if (started && isWork(mood)) return "started";
  return null;
}

/** Bring the stored record up to date (browser only: reads and writes localStorage). */
export function updateOpened(storageKey: string, threads: readonly ThreadLike[], now: number, openId: string | null): OpenedRecord {
  const key = openedKey(storageKey);
  let rec = NO_RECORD;
  try {
    rec = parseOpened(window.localStorage.getItem(key));
  } catch {
    // storage blocked: start from nothing
  }
  const next = noteOpened(rec, threads, now, openId);
  try {
    window.localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // storage full or blocked: highlights just won't survive a reload
  }
  return next;
}
