// Pure office logic: what each thread is doing and where it should be.
// No DOM or SDK imports, so it can be unit tested with node --test.

import type { Spot, SpotGroup } from "./layout.ts";

export type Mood = "needs-you" | "error" | "done" | "drafting" | "planning" | "working" | "idle";

/** Which counter window a waiting thread sits at. */
export type WaitKind = "question" | "plan" | "approval" | "drafting" | "done" | "error";

/** What the server could tell about a pending interaction. */
export type InteractionKind = "question" | "plan" | "approval";

/** The subset of the SDK's PluginSidebarThread the office reads. */
export interface ThreadLike {
  id: string;
  displayTitle: string;
  projectId: string;
  providerId: string;
  status: string;
  indicator: string;
  hasPendingInteraction: boolean;
  isUnread: boolean;
  isPinned: boolean;
  isArchived: boolean;
  isHidden: boolean;
  parentThreadId: string | null;
  href: string;
  activity: { workflows: number; backgroundAgents: number; backgroundCommands: number; planMode: number };
  updatedAt: number;
  lastReadAt: number | null;
  latestAttentionAt: number;
  /** You have an unsent draft for this thread in a composer. */
  drafting?: boolean;
  /** Kind of the pending interaction, when known. */
  interaction?: InteractionKind | null;
  /** The model the thread runs on, when known. */
  model?: string | null;
}

const WORKING_INDICATORS = new Set([
  "runtime",
  "background-agent",
  "background-command",
  "workflow",
  "queued-waiting",
  "working-draft",
]);

const BUSY_STATUSES = new Set(["starting", "active", "stopping"]);

export function isBusy(t: ThreadLike): boolean {
  const a = t.activity;
  return (
    BUSY_STATUSES.has(t.status) ||
    WORKING_INDICATORS.has(t.indicator) ||
    a.workflows + a.backgroundAgents + a.backgroundCommands > 0
  );
}

export function moodOf(t: ThreadLike): Mood {
  if (t.hasPendingInteraction || t.indicator === "waiting-for-input") return "needs-you";
  if (t.indicator === "unread-error" || t.indicator === "queued-failed") return "error";
  if (t.indicator === "plan-mode" || t.activity.planMode > 0) return "planning";
  if (isBusy(t)) return "working";
  if (t.indicator === "unread-success") return "done";
  if (t.status === "error" && t.isUnread) return "error";
  if (t.drafting) return "drafting";
  return "idle";
}

/** Moods that walk up to the counter to wait for you. */
export function waitsForYou(mood: Mood): boolean {
  return mood === "needs-you" || mood === "error" || mood === "done" || mood === "drafting";
}

export function waitKindOf(t: ThreadLike): WaitKind | null {
  const mood = moodOf(t);
  switch (mood) {
    case "needs-you":
      if (t.interaction === "plan") return "plan";
      if (t.interaction === "approval") return "approval";
      return "question";
    case "error":
      return "error";
    case "done":
      return "done";
    case "drafting":
      return "drafting";
    default:
      return null;
  }
}

/** Counter windows, left to right. */
export const WAIT_ORDER: WaitKind[] = ["question", "plan", "approval", "drafting", "done", "error"];

export const WAIT_LABEL: Record<WaitKind, string> = {
  question: "Has a question",
  plan: "Plan ready for review",
  approval: "Needs your approval",
  drafting: "Waiting while you write",
  done: "Done, not read yet",
  error: "Hit an error",
};

export const MOOD_RANK: Record<Mood, number> = {
  "needs-you": 0,
  error: 1,
  done: 2,
  drafting: 3,
  planning: 4,
  working: 5,
  idle: 6,
};

export const IDLE_BREAK_MS = 20 * 60_000;
export const IDLE_NAP_MS = 8 * 60 * 60_000;

/** Freshly idle threads take a coffee break, older ones lounge, stale ones nap. */
export function idleGroup(t: ThreadLike, now: number): SpotGroup {
  const since = now - Math.max(t.updatedAt, t.lastReadAt ?? 0);
  if (since < IDLE_BREAK_MS) return "break";
  if (since < IDLE_NAP_MS) return "lounge";
  return "nap";
}

/** The area a thread belongs in right now. */
export function wantedGroup(t: ThreadLike, now: number, event = false): SpotGroup {
  const mood = moodOf(t);
  // Drafting: you are writing to them, so they sit with you in your office.
  if (mood === "drafting") return "boss";
  // A plan for you to review: presented at the whiteboard in the meeting room.
  if (waitKindOf(t) === "plan") return "present";
  if (waitsForYou(mood)) return "review";
  if (mood === "planning") return "meeting";
  if (mood === "working") return "desk";
  return event ? "event" : idleGroup(t, now);
}

export function visibleThreads(threads: readonly ThreadLike[]): ThreadLike[] {
  return threads.filter((t) => !t.isHidden && !t.isArchived);
}

/** Who gets placed first when the office is full. */
export function byPriority(a: ThreadLike, b: ThreadLike): number {
  const ra = MOOD_RANK[moodOf(a)];
  const rb = MOOD_RANK[moodOf(b)];
  if (ra !== rb) return ra - rb;
  if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
  // First come, first served in the review line.
  if (ra <= MOOD_RANK.drafting) return (a.latestAttentionAt || a.updatedAt) - (b.latestAttentionAt || b.updatedAt);
  return b.updatedAt - a.updatedAt;
}

function seeded(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Where to go when the preferred area is full. */
const FALLBACK: Record<SpotGroup, SpotGroup[]> = {
  boss: ["boss", "review", "desk"],
  event: ["event", "lounge", "break", "nap"],
  review: ["review", "desk"],
  present: ["present", "meeting", "review", "desk"],
  meeting: ["meeting", "desk"],
  desk: ["desk"],
  break: ["break", "lounge", "nap"],
  lounge: ["lounge", "nap", "break"],
  nap: ["nap", "lounge", "break"],
};

/** Areas that fill in a fixed order (desks, the review line); others pick by id. */
const ORDERED = new Set<SpotGroup>(["desk", "review", "present", "meeting", "boss", "event"]);

export interface Assignment {
  /** threadId → spot id */
  spots: Map<string, string>;
  /** Threads that did not fit, in priority order. */
  overflow: string[];
}

/**
 * Give every visible thread a spot in the area its state calls for: working
 * threads at desks (their current desk, else their remembered home desk),
 * planners in the meeting room, threads with output or a question in the
 * review line, idle ones in the lounge by how long they've been idle. A
 * thread keeps its current spot while that spot is still in the right area,
 * so nobody shuffles around needlessly.
 */
export function assignSpots(
  threads: readonly ThreadLike[],
  layoutSpots: readonly Spot[],
  previous: ReadonlyMap<string, string>,
  homeDesks: ReadonlyMap<string, number>,
  now: number,
  opts: { event?: boolean } = {},
): Assignment {
  const event = opts.event === true;
  const sorted = visibleThreads(threads).sort(byPriority);
  const groupOf = new Map(layoutSpots.map((s) => [s.id, s.group] as const));
  const taken = new Set<string>();
  const spots = new Map<string, string>();
  const overflow: string[] = [];

  // The counter: one block per window (questions first), first come first
  // served within a window. Recomputed each time so blocks stay together.
  const waiting = sorted
    .filter((t) => wantedGroup(t, now, event) === "review")
    .sort((a, b) => {
      const ka = WAIT_ORDER.indexOf(waitKindOf(a) ?? "done");
      const kb = WAIT_ORDER.indexOf(waitKindOf(b) ?? "done");
      if (ka !== kb) return ka - kb;
      return (a.latestAttentionAt || a.updatedAt) - (b.latestAttentionAt || b.updatedAt);
    });
  const stools = layoutSpots.filter((s) => s.group === "review");
  const atCounter = new Set<string>();
  waiting.forEach((t, i) => {
    const stool = stools[i];
    if (!stool) return;
    taken.add(stool.id);
    spots.set(t.id, stool.id);
    atCounter.add(t.id);
  });

  // Pass 1: keep current spots that still fit.
  const pending: ThreadLike[] = [];
  for (const t of sorted) {
    if (atCounter.has(t.id)) continue;
    const want = wantedGroup(t, now, event);
    const prev = previous.get(t.id);
    if (prev !== undefined && groupOf.get(prev) === want && !taken.has(prev)) {
      taken.add(prev);
      spots.set(t.id, prev);
    } else pending.push(t);
  }
  // Pass 2: home desks for returning workers.
  const rest: ThreadLike[] = [];
  for (const t of pending) {
    const home = homeDesks.get(t.id);
    const homeId = home === undefined ? null : `desk-${home}`;
    if (wantedGroup(t, now, event) === "desk" && homeId !== null && groupOf.has(homeId) && !taken.has(homeId)) {
      taken.add(homeId);
      spots.set(t.id, homeId);
    } else rest.push(t);
  }
  // Pass 3: first free spot in the wanted area, or a fallback.
  for (const t of rest) {
    let pick: Spot | undefined;
    const want = wantedGroup(t, now, event);
    for (const group of FALLBACK[want]) {
      const free = layoutSpots.filter((s) => s.group === group && !taken.has(s.id));
      // Extra plans to review wait at the table, leaving the whiteboard to the planners.
      if (want === "present" && group === "meeting") free.sort((a, b) => Number(b.kind === "meeting-seat") - Number(a.kind === "meeting-seat"));
      if (free.length > 0) {
        pick = ORDERED.has(group) ? free[0] : free[seeded(t.id) % free.length];
        break;
      }
    }
    if (pick === undefined) {
      overflow.push(t.id);
      continue;
    }
    taken.add(pick.id);
    spots.set(t.id, pick.id);
  }
  return { spots, overflow };
}

/** Human text for a tooltip line. */
export function moodLabel(mood: Mood): string {
  switch (mood) {
    case "needs-you":
      return "Needs your input";
    case "error":
      return "Ran into an error";
    case "done":
      return "Finished · unread";
    case "planning":
      return "Planning";
    case "drafting":
      return "Waiting while you write";
    case "working":
      return "Working";
    case "idle":
      return "Idle";
  }
}

export function ago(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

export interface OfficeEvent {
  at: number;
  threadId: string;
  title: string;
  kind: "arrived" | "left" | "started" | "planning" | "done" | "needs-you" | "error";
}

/** Diff two snapshots of moods into office news. */
export function diffEvents(
  before: ReadonlyMap<string, Mood>,
  after: ReadonlyMap<string, { mood: Mood; title: string }>,
  titles: ReadonlyMap<string, string>,
  now: number,
): OfficeEvent[] {
  const out: OfficeEvent[] = [];
  for (const [id, { mood, title }] of after) {
    const prev = before.get(id);
    if (prev === undefined) {
      out.push({ at: now, threadId: id, title, kind: "arrived" });
      continue;
    }
    if (prev === mood) continue;
    if (mood === "working" && prev !== "working") out.push({ at: now, threadId: id, title, kind: "started" });
    else if (mood === "planning") out.push({ at: now, threadId: id, title, kind: "planning" });
    else if (mood === "done") out.push({ at: now, threadId: id, title, kind: "done" });
    else if (mood === "needs-you") out.push({ at: now, threadId: id, title, kind: "needs-you" });
    else if (mood === "error") out.push({ at: now, threadId: id, title, kind: "error" });
    else if (mood === "idle" && prev === "working") out.push({ at: now, threadId: id, title, kind: "done" });
  }
  for (const id of before.keys()) {
    if (!after.has(id)) out.push({ at: now, threadId: id, title: titles.get(id) ?? "A thread", kind: "left" });
  }
  return out;
}

// ------------------------------------------------------------------ topics

export type Topic =
  | "game"
  | "auth"
  | "bug"
  | "test"
  | "docs"
  | "design"
  | "data"
  | "deploy"
  | "review"
  | "speed"
  | "api"
  | "map"
  | "chat"
  | "chart"
  | "plugin"
  | "security"
  | "refactor"
  | "music"
  | "search"
  | "ai";

const TOPIC_RULES: [Topic, RegExp][] = [
  ["game", /\b(game|gaming|arcade|sprite|level|player|pixel ?art|tetris|chess)\b/i],
  ["auth", /\b(auth\w*|login|logout|sign[ -]?in|oauth|sso|token|password|session|cookie|jwt|credential\w*|keys?)\b/i],
  ["security", /\b(security|secur\w+|vuln\w*|cve|xss|csrf|permission\w*|rbac|encrypt\w*)\b/i],
  ["bug", /\b(bug|fix\w*|crash\w*|broken|regression|error|issue|debug\w*)\b/i],
  ["test", /\b(tests?|testing|spec|e2e|flaky|coverage|vitest|jest)\b/i],
  ["review", /\b(review\w*|pr|pull request|#\d+)\b/i],
  ["docs", /\b(docs?|documentation|readme|write|writing|blog|guide|notes?|feedback|email|draft)\b/i],
  ["design", /\b(ui|ux|css|design|style\w*|theme|layout|icon\w*|visuali[sz]\w*|animation)\b/i],
  ["data", /\b(db|database|sql|migration\w*|schema|postgres|sqlite|storage|cache)\b/i],
  ["deploy", /\b(deploy\w*|release\w*|ci|cd|pipeline|build|publish\w*|ship\w*|docker|k8s)\b/i],
  ["speed", /\b(perf\w*|speed|fast\w*|slow|optimi[sz]\w*|latency|memory)\b/i],
  ["map", /\b(map|maps|location|geo\w*|gps|iss|travel|route)\b/i],
  ["chat", /\b(slack|chat|message\w*|teams|discord|notification\w*|mohit)\b/i],
  ["chart", /\b(dashboard|chart\w*|metric\w*|analytics|report\w*|usage|stats)\b/i],
  ["plugin", /\b(plugin\w*|extension\w*|addon\w*|integration\w*|app)\b/i],
  ["refactor", /\b(refactor\w*|cleanup|clean up|rename|consolidat\w*|migrat\w*|provider|settings|config\w*|reset|fork|sync)\b/i],
  ["music", /\b(music|audio|sound\w*|song|podcast)\b/i],
  ["search", /\b(search\w*|find|index\w*|query)\b/i],
  ["ai", /\b(ai|llm|model|agent\w*|prompt\w*|claude|gpt|copilot)\b/i],
  ["api", /\b(api|server|endpoint\w*|rpc|backend|http|webhook\w*|column|repository|repo)\b/i],
];

/** A best guess at what a thread is about, from its title. */
export function topicOf(title: string): Topic | null {
  for (const [topic, re] of TOPIC_RULES) if (re.test(title)) return topic;
  return null;
}

// ------------------------------------------------------------------ desk styles

export type DeskStyle = "opus" | "sonnet" | "haiku" | "gpt" | "gemini" | "default";

/** Desks are furnished by the model of whoever sits there. */
export function deskStyleFor(model: string | null | undefined, providerId: string): DeskStyle {
  const m = `${model ?? ""} ${providerId}`.toLowerCase();
  if (/opus/.test(m)) return "opus";
  if (/haiku|mini|nano|flash-lite|lite/.test(m)) return "haiku";
  if (/sonnet/.test(m)) return "sonnet";
  if (/gemini|flash/.test(m)) return "gemini";
  if (/gpt|codex|\bo[134]\b|o\d-|openai/.test(m)) return "gpt";
  if (/claude/.test(m)) return "sonnet";
  return "default";
}

export const DESK_STYLE_LABEL: Record<DeskStyle, string> = {
  opus: "walnut desk, dual monitors",
  sonnet: "oak desk",
  haiku: "white desk, laptop",
  gpt: "black desk, ultrawide",
  gemini: "birch desk",
  default: "oak desk",
};
