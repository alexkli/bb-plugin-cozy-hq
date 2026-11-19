import { test } from "node:test";
import assert from "node:assert/strict";
import { assignSpots, updateHomeDesks, deskStyleFor, diffEvents, idleGroup, moodOf, topicOf, waitKindOf, wantedGroup, type ThreadLike } from "./model.ts";
import { buildLayout, connect, MIN_H_WIDE, MIN_W_WIDE, PORTRAIT_MIN_H, PORTRAIT_W, type Layout, type Point } from "./layout.ts";
import { EVENTS, EVENT_KINDS, pickEventKind, planEvent } from "./life.ts";
import { THEMES } from "./themes/index.ts";
import { easterSunday, SEASONS, seasonOf, seasonsOf, thanksgivingDay } from "./seasons.ts";

const NOW = 1_800_000_000_000;
const L = buildLayout(640, 360);

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
    updatedAt: NOW - 60 * 60_000,
    lastReadAt: NOW - 60 * 60_000,
    latestAttentionAt: 0,
    ...over,
  };
}

const groupOf = (spotId: string | undefined) => (spotId === undefined ? undefined : L.byId.get(spotId)?.group);

test("moods follow bb's indicators, attention first", () => {
  assert.equal(moodOf(thread("a", { status: "active" })), "working");
  assert.equal(moodOf(thread("a", { status: "active", hasPendingInteraction: true })), "needs-you");
  assert.equal(moodOf(thread("a", { indicator: "waiting-for-input" })), "needs-you");
  assert.equal(moodOf(thread("a", { indicator: "unread-success" })), "done");
  assert.equal(moodOf(thread("a", { indicator: "unread-error" })), "error");
  assert.equal(moodOf(thread("a", { status: "active", indicator: "plan-mode" })), "planning");
  assert.equal(moodOf(thread("a", { activity: { workflows: 0, backgroundAgents: 0, backgroundCommands: 0, planMode: 1 } })), "planning");
  assert.equal(moodOf(thread("a", { status: "error", isUnread: false })), "idle");
  assert.equal(moodOf(thread("a", { activity: { workflows: 0, backgroundAgents: 1, backgroundCommands: 0, planMode: 0 } })), "working");
  assert.equal(moodOf(thread("a")), "idle");
});

test("idle threads pick an area by how long they've been idle", () => {
  assert.equal(idleGroup(thread("a", { updatedAt: NOW - 5 * 60_000, lastReadAt: null }), NOW), "break");
  assert.equal(idleGroup(thread("a", { updatedAt: NOW - 3 * 3_600_000, lastReadAt: null }), NOW), "lounge");
  assert.equal(idleGroup(thread("a", { updatedAt: NOW - 30 * 3_600_000, lastReadAt: null }), NOW), "nap");
  assert.equal(idleGroup(thread("a", { updatedAt: NOW - 30 * 3_600_000, lastReadAt: NOW - 60_000 }), NOW), "break");
});

test("each state goes to its own area", () => {
  const ts = [
    thread("work", { status: "active" }),
    thread("plan", { status: "active", indicator: "plan-mode" }),
    thread("ask", { indicator: "waiting-for-input" }),
    thread("done", { indicator: "unread-success" }),
    thread("oops", { indicator: "unread-error" }),
    thread("rest"),
    thread("sleep", { updatedAt: NOW - 40 * 3_600_000, lastReadAt: null }),
  ];
  const { spots, overflow } = assignSpots(ts, L.spots, new Map(), new Map(), NOW);
  assert.deepEqual(overflow, []);
  assert.equal(groupOf(spots.get("work")), "desk");
  assert.equal(groupOf(spots.get("plan")), "meeting");
  assert.equal(groupOf(spots.get("ask")), "review");
  assert.equal(groupOf(spots.get("done")), "review");
  assert.equal(groupOf(spots.get("oops")), "review");
  assert.equal(groupOf(spots.get("rest")), "lounge");
  assert.equal(groupOf(spots.get("sleep")), "nap");
  assert.equal(new Set(spots.values()).size, spots.size, "no shared spots");
});

test("the review line is first come, first served, needs-you first", () => {
  const ts = [
    thread("late-done", { indicator: "unread-success", latestAttentionAt: NOW - 1_000 }),
    thread("early-done", { indicator: "unread-success", latestAttentionAt: NOW - 9_000 }),
    thread("ask", { indicator: "waiting-for-input", latestAttentionAt: NOW }),
  ];
  const { spots } = assignSpots(ts, L.spots, new Map(), new Map(), NOW);
  const order = L.spots.filter((s) => s.group === "review").map((s) => s.id);
  const pos = (id: string) => order.indexOf(spots.get(id)!);
  assert.ok(pos("ask") < pos("early-done"));
  assert.ok(pos("early-done") < pos("late-done"));
});

test("archived and hidden threads stay out of the office", () => {
  const { spots } = assignSpots([thread("a", { isArchived: true }), thread("b", { isHidden: true })], L.spots, new Map(), new Map(), NOW);
  assert.equal(spots.size, 0);
});

test("assignments are stable and home desks are remembered", () => {
  const ts = [thread("w1", { status: "active" }), thread("w2", { status: "active" }), thread("i1")];
  const first = assignSpots(ts, L.spots, new Map(), new Map([["w2", 5]]), NOW);
  assert.equal(first.spots.get("w2"), "desk-5");
  const second = assignSpots(ts, L.spots, first.spots, new Map(), NOW);
  assert.deepEqual([...second.spots].sort(), [...first.spots].sort());
});

test("new workers pick desks at random, not the first ones in order", () => {
  const big = buildLayout(1200, 520, { threads: 16 });
  const desks = big.spots.filter((s) => s.group === "desk").map((s) => s.id);
  const ts = Array.from({ length: 4 }, (_, i) => thread(`worker-${i}`, { status: "active" }));
  const { spots } = assignSpots(ts, big.spots, new Map(), new Map(), NOW);
  const picked = ts.map((t) => spots.get(t.id)!);
  assert.equal(new Set(picked).size, 4);
  for (const id of picked) assert.ok(desks.includes(id));
  assert.notDeepEqual(picked.sort(), desks.slice(0, 4).sort(), "not just the first four desks");
});

test("squeeze-in seats: the hearth is picked at random with the desks, spare seats only once those are full", () => {
  const cabin = THEMES.find((t) => t.id === "cabin")!;
  const C = cabin.layout!(900, 520, { threads: 20, portrait: false })!;
  const desk = C.spots.filter((s) => s.group === "desk");
  const real = desk.filter((s) => s.kind === "desk");
  const open = desk.filter((s) => !s.spare);
  const spare = desk.filter((s) => s.spare);
  assert.ok(spare.length > 0 && open.length > real.length, "the hearth is open, the rest spare");
  // Every desk is someone's home (they're idle now): newcomers still pick desks and the hearth, not the spare seats.
  const homes = new Map(real.map((s, i) => [`home-${i}`, Number(s.id.slice(5))] as const));
  const idle = real.map((_, i) => thread(`home-${i}`));
  const workers = Array.from({ length: 4 }, (_, i) => thread(`w${i}`, { status: "active" }));
  const few = assignSpots([...idle, ...workers], C.spots, new Map(), homes, NOW);
  for (const w of workers) assert.ok(open.some((s) => s.id === few.spots.get(w.id)), `${w.id} at a desk or the hearth`);
  // More than the desks and the hearth hold: the spare seats fill in order.
  const many = Array.from({ length: open.length + 2 }, (_, i) => thread(`m${i}`, { status: "active" }));
  const full = assignSpots(many, C.spots, new Map(), new Map(), NOW);
  const used = new Set(full.spots.values());
  for (const s of open) assert.ok(used.has(s.id));
  assert.deepEqual(spare.filter((s) => used.has(s.id)).map((s) => s.id), spare.slice(0, 2).map((s) => s.id));
});

test("a home desk stays free for its thread while others are free, and stays its home after a detour", () => {
  const big = buildLayout(1200, 520, { threads: 16 });
  const desks = big.spots.filter((s) => s.group === "desk");
  // Lots of newcomers while w1 is away: none of them takes w1's desk.
  const homes = new Map([["w1", 3]]);
  const newcomers = Array.from({ length: desks.length - 1 }, (_, i) => thread(`n${i}`, { status: "active" }));
  const away = assignSpots([thread("w1"), ...newcomers], big.spots, new Map(), homes, NOW);
  assert.ok(![...away.spots.values()].includes("desk-3"));
  // Back at work: w1 goes to its desk.
  const back = assignSpots([thread("w1", { status: "active" })], big.spots, new Map(), homes, NOW);
  assert.equal(back.spots.get("w1"), "desk-3");
  // Someone sits at it: w1 works elsewhere for now, but its home doesn't move.
  const taken = assignSpots([thread("x", { status: "active" }), thread("w1", { status: "active" })], big.spots, new Map([["x", "desk-3"]]), homes, NOW);
  assert.notEqual(taken.spots.get("w1"), "desk-3");
  const deskOf = (s: string) => (s.startsWith("desk-") ? Number(s.slice(5)) : null);
  const has = (i: number) => big.byId.has(`desk-${i}`);
  updateHomeDesks(homes, [thread("x", { status: "active" }), thread("w1", { status: "active" })], taken.spots, deskOf, has, NOW);
  assert.equal(homes.get("w1"), 3);
  // A desk gone from the floor plan: the home moves to where they work now.
  const moved = new Map([["w1", 999]]);
  updateHomeDesks(moved, [thread("w1", { status: "active" })], new Map([["w1", "desk-2"]]), deskOf, has, NOW);
  assert.equal(moved.get("w1"), 2);
  // Not working (waiting for you at a fallback desk): no new home.
  const none = new Map<string, number>();
  updateHomeDesks(none, [thread("r", { status: "idle" })], new Map([["r", "desk-2"]]), deskOf, has, NOW);
  assert.equal(none.has("r"), false);
});

test("a full area falls back instead of doubling up", () => {
  const planners = Array.from({ length: 9 }, (_, i) => thread(`p${i}`, { status: "active", indicator: "plan-mode" }));
  const { spots } = assignSpots(planners, L.spots, new Map(), new Map(), NOW);
  const meeting = L.spots.filter((s) => s.group === "meeting").length;
  assert.equal([...spots.values()].filter((id) => groupOf(id) === "meeting").length, meeting);
  assert.equal([...spots.values()].filter((id) => groupOf(id) === "desk").length, 9 - meeting);
  assert.equal(new Set(spots.values()).size, spots.size);
});

test("a full office reports overflow", () => {
  const desks = L.desks.length;
  const busy = Array.from({ length: desks + 3 }, (_, i) => thread(`w${i}`, { status: "active" }));
  const { overflow } = assignSpots(busy, L.spots, new Map(), new Map(), NOW);
  assert.equal(overflow.length, 3);
});

function inside(lay: Layout, p: Point): boolean {
  return p.x >= 0 && p.x <= lay.W && p.y >= 0 && p.y <= lay.H;
}

const SIZES = [
  [600, 270],
  [640, 360],
  [664, 316],
  [900, 300],
  [700, 480],
  [1200, 400],
  [900, 420],
  [345, 640],
  [390, 844],
  [360, 900],
  [340, 600],
] as const;

test("layouts fill any panel size and keep every spot reachable", () => {
  for (const [w, h] of SIZES) {
    const lay = buildLayout(w, h);
    const tag = `${w}×${h}`;
    assert.equal(lay.W, Math.max(lay.portrait ? PORTRAIT_W : MIN_W_WIDE, w), tag);
    assert.equal(lay.H, Math.max(lay.portrait ? PORTRAIT_MIN_H : MIN_H_WIDE, h), tag);
    assert.ok(lay.desks.length >= 4, `${tag} has desks`);
    assert.ok(lay.seats.length >= 4, `${tag} has waiting-room seats (${lay.seats.length})`);
    assert.ok(lay.spots.filter((s) => s.group === "meeting").length >= 2, `${tag} has a meeting room`);
    assert.equal(lay.spots.filter((s) => s.group === "boss").length, 2, `${tag} has two guest chairs in your office`);
    for (const s of lay.spots) {
      const start = s.path[0]!;
      assert.ok(start.c && lay.net.halls.includes(start.y), `${s.id} starts on a hallway at ${tag}`);
      assert.deepEqual(s.path.at(-1), { x: s.x, y: s.y }, `${s.id} ends on its spot`);
      for (const p of s.path) assert.ok(inside(lay, p), `${s.id} path stays inside at ${tag}`);
    }
    // Any spot can reach any other along the hallways.
    const a = lay.spots[0]!.path[0]!;
    for (const s of lay.spots) for (const p of connect(lay.net, a, s.path[0]!)) assert.ok(inside(lay, p) && p.c, `${tag} route to ${s.id}`);
    for (const r of lay.rooms) {
      assert.ok(r.rect.x >= 0 && r.rect.x + r.rect.w <= lay.W && r.rect.y + r.rect.h <= lay.H, `${r.kind} inside at ${tag}`);
    }
  }
  const wide = buildLayout(1200, 400, { threads: 40 });
  assert.ok(wide.desks.length > buildLayout(600, 400, { threads: 40 }).desks.length, "wider panels fit more desks");
  assert.ok(buildLayout(600, 460, { threads: 30 }).desks.length > buildLayout(600, 460, { threads: 4 }).desks.length, "pods follow the head count");
});

test("every office past the smallest has a server room, and tall ones don't sprawl", () => {
  // A folded phone, a tablet in landscape and one held upright, and friends.
  for (const [w, h, threads] of [[390, 600, 16], [600, 425, 16], [600, 698, 16], [600, 446, 12], [900, 420, 8], [345, 640, 8], [390, 844, 12], [700, 480, 8], [600, 365, 16], [700, 360, 8]] as const) {
    const lay = buildLayout(w, h, { threads });
    assert.ok(lay.server, `${w}×${h} has a server room`);
    const s = lay.server!;
    for (const r of lay.rooms) {
      if (r.kind === "server") continue;
      const overlap = r.rect.x < s.x + s.w && s.x < r.rect.x + r.rect.w && r.rect.y < s.y + s.h && s.y < r.rect.y + r.rect.h;
      assert.ok(!overlap, `${w}×${h}: server room overlaps the ${r.kind}`);
    }
    // Nobody walks through the server room.
    for (const spot of lay.spots) {
      for (const p of spot.path) assert.ok(!(p.x > s.x && p.x < s.x + s.w && p.y > s.y && p.y < s.y + s.h), `${w}×${h}: ${spot.id} walks through the server room`);
    }
  }
  const tall = buildLayout(600, 698, { threads: 16 });
  assert.ok(tall.waiting.h <= 170, `waiting room stays compact (${tall.waiting.h})`);
  assert.ok(tall.meeting.h <= 230, `meeting room stays compact (${tall.meeting.h})`);
  assert.ok(tall.rooms.some((r) => r.kind === "garden"), "a garden fills the space under the waiting room");
  assert.ok(tall.rooms.some((r) => r.kind === "library"), "a reading nook fills the tall lounge");
});

test("a phone held upright gets a stacked office without a big empty bottom", () => {
  for (const [w, h] of [[390, 844], [360, 900], [345, 640]] as const) {
    const lay = buildLayout(w, h);
    assert.ok(lay.portrait, `${w}×${h} is portrait`);
    const bottom = Math.max(...lay.rooms.map((r) => r.rect.y + r.rect.h));
    assert.ok(bottom >= lay.H - 50, `${w}×${h}: rooms reach ${bottom} of ${lay.H}`);
  }
  assert.ok(!buildLayout(900, 420).portrait);
});

test("the meeting room is a glass room on the right; your office has wooden walls", () => {
  const lay = buildLayout(900, 420);
  const meeting = lay.rooms.find((r) => r.kind === "meeting")!;
  const boss = lay.rooms.find((r) => r.kind === "boss")!;
  assert.equal(meeting.walls, "glass");
  assert.equal(boss.walls, "wood");
  assert.ok(meeting.rect.x > lay.W / 2 && boss.rect.x > lay.W / 2);
  assert.ok(lay.segments.length >= 3, "the back wall steps in and out");
  assert.ok(lay.wall.windows.length >= 4, `more windows (${lay.wall.windows.length})`);
  assert.ok(lay.tv.w >= 120, `a big TV (${lay.tv.w})`);
});

test("waiting room seats group by kind; plans go to the meeting room, drafts to your office", () => {
  const ts = [
    thread("done1", { indicator: "unread-success", latestAttentionAt: NOW - 50 }),
    thread("err", { indicator: "unread-error" }),
    thread("q", { indicator: "waiting-for-input", hasPendingInteraction: true, interaction: "question" }),
    thread("plan", { indicator: "waiting-for-input", hasPendingInteraction: true, interaction: "plan" }),
    thread("ok?", { indicator: "waiting-for-input", hasPendingInteraction: true, interaction: "approval" }),
    thread("draft", { drafting: true }),
  ];
  const { spots } = assignSpots(ts, L.spots, new Map(), new Map(), NOW);
  const order = L.seats.map((s) => s.id);
  const seat = (id: string) => order.indexOf(spots.get(id)!);
  assert.deepEqual(["q", "ok?", "done1", "err"].map(seat), [0, 1, 2, 3]);
  assert.equal(spots.get("plan"), "present-0");
  assert.match(spots.get("draft")!, /^boss-guest-/);
});

test("the meeting room has the whiteboard, presenters and a table set for planners", () => {
  for (const [w, h] of SIZES) {
    const lay = buildLayout(w, h);
    const ids = lay.spots.map((s) => s.id);
    assert.ok(ids.includes("board-0") && ids.includes("present-0"), `${w}×${h} has board and presenter spots`);
  }
  const lay = buildLayout(600, 445, { threads: 12 });
  const seats = lay.spots.filter((s) => s.kind === "meeting-seat");
  assert.ok(seats.some((s) => s.facing === "front") && seats.some((s) => s.facing === "back"), "seats on both sides of the table");
  // Planners fill the whiteboard first, then the table; extra plans to review fall back to the table.
  const ts = [
    thread("p1", { status: "active", indicator: "plan-mode" }),
    thread("p2", { status: "active", indicator: "plan-mode" }),
    thread("p3", { status: "active", indicator: "plan-mode" }),
    ...[1, 2, 3].map((i) => thread(`r${i}`, { indicator: "waiting-for-input", hasPendingInteraction: true, interaction: "plan" })),
  ];
  const { spots } = assignSpots(ts, lay.spots, new Map(), new Map(), NOW);
  assert.deepEqual(["p1", "p2"].map((id) => spots.get(id)).sort(), ["board-0", "board-1"]);
  assert.equal(lay.byId.get(spots.get("p3")!)?.kind, "meeting-seat");
  assert.deepEqual(["r1", "r2"].map((id) => spots.get(id)).sort(), ["present-0", "present-1"]);
  assert.equal(lay.byId.get(spots.get("r3")!)?.group, "meeting");
});

test("seasons and festivals follow the calendar", () => {
  const on = (y: number, m: number, d: number) => seasonsOf(new Date(y, m - 1, d));
  assert.deepEqual(on(2026, 2, 14), ["valentines", "carnival"]); // Valentine's falls in carnival week
  assert.deepEqual(on(2026, 2, 16), ["lunarnewyear", "carnival"]); // Rosenmontag, and Lunar New Year is the next day
  assert.deepEqual(on(2026, 3, 4), ["holi"]);
  assert.deepEqual(on(2026, 3, 17), ["stpatricks"]);
  assert.deepEqual(on(2026, 4, 5), ["easter"]);
  assert.deepEqual(on(2026, 4, 6), ["easter"]); // Easter Monday
  assert.deepEqual(on(2026, 7, 15), ["summer"]);
  assert.deepEqual(on(2026, 10, 31), ["halloween"]);
  assert.deepEqual(on(2026, 11, 8), ["diwali", "laternenfest"]);
  assert.deepEqual(on(2026, 11, 11), ["laternenfest", "carnival"]); // St. Martin and 11.11.
  assert.deepEqual(on(2026, 11, 14), ["laternenfest"]);
  assert.deepEqual(on(2026, 11, 20), ["thanksgiving"]);
  assert.deepEqual(on(2026, 11, 26), ["thanksgiving"]);
  assert.deepEqual(on(2026, 11, 28), ["holidays"]);
  assert.deepEqual(on(2027, 1, 2), ["holidays"]);
  assert.deepEqual(on(2027, 1, 12), ["snowday"]);
  assert.deepEqual(on(2027, 2, 5), ["lunarnewyear", "carnival", "snowday"]);
  assert.deepEqual(on(2027, 5, 1), ["spring"]); // Maifest
  assert.deepEqual(on(2027, 6, 1), ["spring"]);
  assert.deepEqual(on(2027, 9, 20), ["oktoberfest"]);
  assert.deepEqual(on(2027, 10, 4), ["oktoberfest"]);
  assert.deepEqual(on(2027, 9, 5), []); // a quiet week between summer and Oktoberfest
  assert.equal(easterSunday(2027).getMonth(), 2); // March 28, 2027
  assert.equal(easterSunday(2027).getDate(), 28);
  assert.equal(thanksgivingDay(2027).getDate(), 25);
  assert.equal(seasonOf(new Date(2026, 10, 8)), "diwali");
});

test("seasonal parties only happen in their season", () => {
  let i = 0;
  const seq = () => [0.1, 0.0][i++ % 2]!;
  assert.equal(pickEventKind(18, true, seq, ["holidays"]), "holiday");
  i = 0;
  assert.equal(pickEventKind(18, true, seq, ["laternenfest"]), "lanterns");
  for (let n = 0; n < 300; n++) {
    const k = pickEventKind(n % 24, n % 2 === 0, Math.random, []);
    assert.ok(!EVENTS[k].season, `${k} only in season`);
  }
  for (const season of SEASONS) {
    const party = EVENT_KINDS.filter((k) => EVENTS[k].season === season);
    assert.equal(party.length, 1, `${season} has a party`);
  }
});

test("office events gather idle threads and leave busy ones alone", () => {
  const ts = [thread("idle1"), thread("idle2"), thread("busy", { status: "active" }), thread("q", { indicator: "waiting-for-input", hasPendingInteraction: true, interaction: "question" })];
  const plan = planEvent("party", L.eventArea, L.net, 2);
  assert.equal(plan.spots.length, 2);
  for (const s of plan.spots) assert.ok(s.path[0]!.c && L.net.halls.includes(s.path[0]!.y));
  const { spots } = assignSpots(ts, [...L.spots, ...plan.spots], new Map(), new Map(), NOW, { event: true });
  assert.match(spots.get("idle1")!, /^event-/);
  assert.match(spots.get("idle2")!, /^event-/);
  assert.match(spots.get("busy")!, /^desk-/);
  assert.equal(L.byId.get(spots.get("q")!)?.group, "review");
});

test("drafting only counts while the thread is not busy", () => {
  assert.equal(waitKindOf(thread("a", { drafting: true })), "drafting");
  assert.equal(waitKindOf(thread("a", { drafting: true, status: "active" })), null);
});

test("topics come from titles", () => {
  assert.equal(topicOf("Build a tiny snake game"), "game");
  assert.equal(topicOf("Login improvements"), "auth");
  assert.equal(topicOf("Track ISS location on map"), "map");
  assert.equal(topicOf("Quarterly thoughts"), null);
});

test("desk styles follow the model", () => {
  assert.equal(deskStyleFor("claude-opus-5-5", "claude-copilot"), "opus");
  assert.equal(deskStyleFor("claude-sonnet-5-5", "claude-code"), "sonnet");
  assert.equal(deskStyleFor("claude-haiku-4-5", "claude-code"), "haiku");
  assert.equal(deskStyleFor("gpt-5-codex", "codex"), "gpt");
  assert.equal(deskStyleFor(null, "pi"), "default");
});

test("wanted areas", () => {
  assert.equal(wantedGroup(thread("a", { indicator: "unread-success" }), NOW), "review");
  assert.equal(wantedGroup(thread("a", { status: "active" }), NOW), "desk");
  assert.equal(wantedGroup(thread("a", { drafting: true }), NOW), "boss");
  assert.equal(wantedGroup(thread("a"), NOW, true), "event");
});

test("mood changes become office news", () => {
  const before = new Map([
    ["a", "working" as const],
    ["b", "idle" as const],
    ["c", "idle" as const],
    ["gone", "idle" as const],
  ]);
  const after = new Map([
    ["a", { mood: "done" as const, title: "A" }],
    ["b", { mood: "needs-you" as const, title: "B" }],
    ["c", { mood: "planning" as const, title: "C" }],
    ["new", { mood: "working" as const, title: "N" }],
  ]);
  const kinds = diffEvents(before, after, new Map([["gone", "G"]]), NOW).map((e) => `${e.threadId}:${e.kind}`);
  assert.deepEqual(kinds.sort(), ["a:done", "b:needs-you", "c:planning", "gone:left", "new:arrived"]);
});

// ------------------------------------------------------------------ separate homes

/** Three homes with a spot for every group, and a shared event spot. */
function homesSpots(n = 3): Layout["spots"] {
  const groups = ["desk", "meeting", "present", "review", "boss", "break", "lounge", "nap"] as const;
  const out: Layout["spots"] = [];
  for (let h = 0; h < n; h++) {
    for (const [i, g] of groups.entries()) {
      out.push({ id: g === "desk" ? `desk-${h}` : `home-${h}-${g}`, kind: g === "desk" ? "desk" : "huddle", group: g, x: h * 100 + i, y: 50, facing: "front", pose: "stand", path: [{ x: 0, y: 0, c: true }], activity: g, home: h });
    }
  }
  out.push({ id: "event-0", kind: "event", group: "event", x: 0, y: 200, facing: "front", pose: "stand", path: [{ x: 0, y: 0, c: true }], activity: "party" });
  return out;
}

test("homes: one resident each, who only goes to spots of their own home", () => {
  const spots = homesSpots();
  const home = (id: string | undefined) => spots.find((s) => s.id === id)?.home;
  const ts = [thread("work", { status: "active" }), thread("ask", { indicator: "waiting-for-input" }), thread("idle")];
  const a = assignSpots(ts, spots, new Map(), new Map(), NOW);
  const homes = ts.map((t) => home(a.spots.get(t.id)));
  assert.equal(new Set(homes).size, 3, "everyone has a home of their own");
  // Each state picks its spot within the home.
  const prev = new Map(a.spots);
  const b = assignSpots([thread("work", { status: "active", indicator: "plan-mode" }), ts[1]!, thread("idle", { status: "active" })], spots, prev, new Map(), NOW);
  assert.equal(home(b.spots.get("work")), homes[0]);
  assert.equal(spots.find((s) => s.id === b.spots.get("work"))?.group, "meeting");
  assert.equal(home(b.spots.get("idle")), homes[2]);
  assert.equal(b.spots.get("idle"), `desk-${homes[2]}`, "working at the desk of their own home");
});

test("homes: returning threads get the home with their desk; extras overflow", () => {
  const spots = homesSpots(2);
  const desks = new Map([["late", 1]]);
  const a = assignSpots([thread("early"), thread("late"), thread("third")], spots, new Map(), desks, NOW);
  assert.equal(spots.find((s) => s.id === a.spots.get("late"))?.home, 1);
  assert.equal(spots.find((s) => s.id === a.spots.get("early"))?.home, 0);
  assert.deepEqual(a.overflow, ["third"], "no home left, and nothing shared outside an event");
  // During an event the idle ones meet at the shared spot.
  const e = assignSpots([thread("early"), thread("late", { status: "active" })], spots, a.spots, desks, NOW, { event: true });
  assert.equal(e.spots.get("early"), "event-0");
  assert.equal(e.spots.get("late"), "desk-1");
});
