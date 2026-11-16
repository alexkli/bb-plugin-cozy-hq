import { test } from "node:test";
import assert from "node:assert/strict";
import { highlightOf, isUnopened, keepsStarted, NO_RECORD, noteOpened, parseOpened, startsWork, type OpenedRecord } from "./highlight.ts";
import { moodOf, type ThreadLike } from "./model.ts";

const NOW = 1_800_000_000_000;
const MIN = 60_000;

function thread(id: string, over: Partial<ThreadLike> = {}): ThreadLike {
  return {
    id,
    displayTitle: id,
    projectId: "p",
    providerId: "claude-code",
    status: "idle",
    indicator: "none",
    hasPendingInteraction: false,
    isUnread: false,
    isPinned: false,
    isArchived: false,
    isHidden: false,
    parentThreadId: null,
    href: `/t/${id}`,
    activity: { workflows: 0, backgroundAgents: 0, backgroundCommands: 0, planMode: 0 },
    updatedAt: NOW - 60 * MIN,
    lastReadAt: NOW - 60 * MIN,
    latestAttentionAt: NOW - 60 * MIN,
    ...over,
  };
}

// bb's fields for each step of a thread's life (see bb's markRead / markUnread and status transitions).
const working = (at: number) => ({ status: "active", indicator: "runtime", updatedAt: at });
const finished = (at: number, read: number | null) => ({ indicator: "unread-success", isUnread: true, updatedAt: at, latestAttentionAt: at, lastReadAt: read });
const opened = (at: number, finishedAt: number) => ({ updatedAt: at, latestAttentionAt: finishedAt, lastReadAt: at });
const asking = { status: "active", indicator: "waiting-for-input", hasPendingInteraction: true };

/** Note the threads at a moment, like the overlay or the office does on every update. */
function note(rec: OpenedRecord, now: number, threads: ThreadLike[], openId: string | null = null): OpenedRecord {
  return noteOpened(rec, threads, now, openId);
}

test("a finished thread is new until you open it once; marking it unread doesn't bring that back", () => {
  let rec = note(NO_RECORD, NOW, [thread("a", working(NOW))]);
  const done = thread("a", finished(NOW + 5 * MIN, NOW - 60 * MIN));
  rec = note(rec, NOW + 5 * MIN, [done]);
  assert.equal(moodOf(done), "done");
  assert.equal(isUnopened(done, rec), true, "finished: new for you");

  const read = thread("a", opened(NOW + 9 * MIN, NOW + 5 * MIN));
  rec = note(rec, NOW + 9 * MIN, [read], "a");
  assert.equal(moodOf(read), "idle");
  assert.equal(isUnopened(read, rec), false, "opened");

  // Mark unread: bb clears lastReadAt, so it's back in the waiting room...
  const unread = thread("a", { ...finished(NOW + 5 * MIN, null), updatedAt: NOW + 12 * MIN });
  rec = note(rec, NOW + 12 * MIN, [unread]);
  assert.equal(moodOf(unread), "done");
  assert.equal(isUnopened(unread, rec), false, "kept unread as a reminder: no highlight");
  // ...and stays quiet across reloads (the record is plain JSON).
  rec = parseOpened(JSON.stringify(rec));
  rec = note(rec, NOW + 60 * MIN, [unread]);
  assert.equal(isUnopened(unread, rec), false);

  // New work, a new finish: new again (lastReadAt is still cleared).
  rec = note(rec, NOW + 70 * MIN, [thread("a", { ...working(NOW + 70 * MIN), lastReadAt: null })]);
  const again = thread("a", finished(NOW + 80 * MIN, null));
  rec = note(rec, NOW + 80 * MIN, [again]);
  assert.equal(isUnopened(again, rec), true, "finished again");
});

test("a thread that finished while the office was closed is new when you come back", () => {
  let rec = note(NO_RECORD, NOW, [thread("a", working(NOW)), thread("b", working(NOW)), thread("c", working(NOW))]);
  // Two hours later (bb was closed): a finished, b failed, c asked something.
  const a = thread("a", finished(NOW + 30 * MIN, NOW - 60 * MIN));
  const b = thread("b", { status: "error", indicator: "unread-error", isUnread: true, latestAttentionAt: NOW + 40 * MIN });
  const c = thread("c", asking);
  rec = note(rec, NOW + 120 * MIN, [a, b, c]);
  assert.equal(moodOf(b), "error");
  assert.equal(isUnopened(a, rec), true);
  assert.equal(isUnopened(b, rec), true);
  assert.equal(isUnopened(c, rec), true);
});

test("a question is new until you open its page, which bb doesn't record", () => {
  let rec = note(NO_RECORD, NOW, [thread("a", working(NOW))]);
  const ask = thread("a", { ...asking, updatedAt: NOW + 2 * MIN });
  rec = note(rec, NOW + 2 * MIN, [ask]);
  assert.equal(isUnopened(ask, rec), true, "asked");
  rec = note(rec, NOW + 3 * MIN, [ask], "a");
  assert.equal(isUnopened(ask, rec), false, "you opened it (lastReadAt unchanged: it was read)");
  rec = note(rec, NOW + 4 * MIN, [thread("a", { ...asking, lastReadAt: null })]);
  assert.equal(isUnopened(thread("a", { ...asking, lastReadAt: null }), rec), false, "marked unread: still quiet");
  // Answered, back to work, then a new question.
  rec = note(rec, NOW + 5 * MIN, [thread("a", { ...working(NOW + 5 * MIN), lastReadAt: null })]);
  const next = thread("a", { ...asking, lastReadAt: null });
  rec = note(rec, NOW + 8 * MIN, [next]);
  assert.equal(isUnopened(next, rec), true, "asked again");
});

test("a question that comes in while you're on its page is not new", () => {
  let rec = note(NO_RECORD, NOW, [thread("a", working(NOW))], "a");
  const ask = thread("a", asking);
  rec = note(rec, NOW + MIN, [ask], "a");
  assert.equal(isUnopened(ask, rec), false);
});

test("first run: bb's own read state decides finishes; old questions and reminders stay quiet", () => {
  const fresh = thread("fresh", finished(NOW - 10 * MIN, NOW - 50 * MIN));
  const reminder = thread("reminder", finished(NOW - 3 * 24 * 60 * MIN, null));
  const ask = thread("ask", asking);
  const rec = note(NO_RECORD, NOW, [fresh, reminder, ask]);
  assert.equal(isUnopened(fresh, rec), true, "never opened since it finished");
  assert.equal(isUnopened(reminder, rec), false, "marked unread before we watched");
  assert.equal(isUnopened(ask, rec), false, "can't tell whether you saw it");
  // A thread we've never seen that's waiting on you came in while we weren't watching.
  const later = thread("later", asking);
  const rec2 = note(rec, NOW + 60 * MIN, [fresh, reminder, ask, later]);
  assert.equal(isUnopened(later, rec2), true);
  assert.equal(isUnopened(ask, rec2), false);
});

test("the record keeps only what bb doesn't, drops gone threads and survives loading", () => {
  let rec = note(NO_RECORD, NOW, [thread("plain"), thread("gone", asking), thread("unread", { lastReadAt: null })]);
  assert.deepEqual(Object.keys(rec.threads).sort(), ["gone", "unread"]);
  assert.equal(note(rec, NOW + MIN, []), rec, "an empty list while loading changes nothing");
  rec = note(rec, NOW + MIN, [thread("plain"), thread("unread", { lastReadAt: null })]);
  assert.deepEqual(Object.keys(rec.threads), ["unread"]);
  assert.deepEqual(parseOpened("not json"), NO_RECORD);
  assert.deepEqual(parseOpened(JSON.stringify({ at: "x" })), NO_RECORD);
});

test("starting work glows on the way to the desk and while it works there", () => {
  assert.equal(startsWork("idle", "working"), true);
  assert.equal(startsWork("needs-you", "working"), true, "answered: back to the desk");
  assert.equal(startsWork(null, "planning"), true, "a new thread comes in to plan");
  assert.equal(startsWork("planning", "working"), false, "already at work");
  assert.equal(startsWork("working", "done"), false);
  // The glow through a thread's day: starts, plans then builds, finishes, starts again.
  let on = keepsStarted(false, "idle", "planning");
  assert.equal(on, true, "starts");
  on = keepsStarted(on, "planning", "working");
  assert.equal(on, true, "plan into work: same stretch of work");
  assert.equal(highlightOf("working", false, on), "started", "seated at the desk, still glowing");
  on = keepsStarted(on, "working", "done");
  assert.equal(on, false, "done: the cool glow ends");
  assert.equal(keepsStarted(false, "working", "working"), false, "already working when you looked: no glow");
  assert.equal(keepsStarted(on, "done", "working"), true, "back to work");
  assert.equal(highlightOf("working", false, false), null, "moving desks is not news");
  assert.equal(highlightOf("done", true, false), "finished", "walking to the waiting room and sitting there");
});
