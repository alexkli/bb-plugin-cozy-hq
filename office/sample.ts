// Made-up threads, usage and headlines for screenshots and demos, so nothing
// from your real workspace shows. Turn on with the debug key: {"sample": true}.

import type { Story, UsageCard, Weather } from "../contract.ts";
import type { OfficeThread } from "./OfficeView.tsx";

const IDLE = { workflows: 0, backgroundAgents: 0, backgroundCommands: 0, planMode: 0 };

type Seed = Partial<OfficeThread> & { title: string; project: 0 | 1 | 2; ago: number; recap?: string };

const PROJECTS = [
  { id: "p-web", name: "Storefront", hue: 205 },
  { id: "p-app", name: "Mobile app", hue: 340 },
  { id: "p-docs", name: "Docs site", hue: 145 },
];

const SEEDS: Seed[] = [
  { title: "Build a tiny snake game", project: 1, ago: 2, recap: "The snake now speeds up every five apples.", status: "active", indicator: "runtime", model: "claude-opus-5-5" },
  { title: "Fix the login redirect loop", project: 0, ago: 1, status: "active", indicator: "runtime", model: "claude-sonnet-5-5" },
  { title: "Speed up image thumbnails", project: 0, ago: 3, status: "active", indicator: "background-agent", model: "claude-haiku-4-5", activity: { ...IDLE, backgroundAgents: 3 } },
  { title: "Refactor the payment module", project: 0, ago: 4, status: "active", indicator: "background-agent", model: "gpt-5-codex", providerId: "codex", activity: { ...IDLE, backgroundAgents: 5 } },
  { title: "Plan the search revamp", project: 0, ago: 5, status: "active", indicator: "plan-mode", activity: { ...IDLE, planMode: 1 } },
  { title: "Plan offline sync", project: 1, ago: 6, status: "active", indicator: "plan-mode", activity: { ...IDLE, planMode: 1 } },
  { title: "Design the new onboarding", project: 1, ago: 7, indicator: "waiting-for-input", hasPendingInteraction: true, interaction: "plan" },
  { title: "Add dark mode to settings", project: 1, ago: 9, indicator: "waiting-for-input", hasPendingInteraction: true, interaction: "question" },
  { title: "Run the database migration", project: 0, ago: 8, indicator: "waiting-for-input", hasPendingInteraction: true, interaction: "approval" },
  { title: "Write API docs for /orders", project: 2, ago: 12, recap: "I documented all six /orders endpoints with examples.", indicator: "unread-success", isUnread: true },
  { title: "Chart weekly signups", project: 0, ago: 14, recap: "Signups are up 12% since the new landing page went live.", indicator: "unread-success", isUnread: true },
  { title: "Investigate flaky tests", project: 0, ago: 16, recap: "The checkout test races the payment mock, so it fails one run in five.", indicator: "unread-error", isUnread: true },
  { title: "Map view for the store locator", project: 1, ago: 20, drafting: true },
  { title: "Security review of uploads", project: 0, ago: 25, recap: "Uploads now check the file type on the server, not just the extension." },
  { title: "Chat widget prototype", project: 1, ago: 70, recap: "The chat widget reconnects on its own when the network drops." },
  { title: "Music player plugin idea", project: 2, ago: 140, recap: "I sketched a playlist view and a tiny visualizer." },
  { title: "Deploy the staging pipeline", project: 0, ago: 200, recap: "Staging deploys now take four minutes instead of twenty." },
  { title: "Data export to CSV", project: 2, ago: 600, recap: "CSV export handles commas and line breaks in names now." },
  { title: "Old docs cleanup", project: 2, ago: 60 * 30 },
  // Spawned by "Fix the login redirect loop": matching lanyards.
  { title: "Add a regression test for the redirect", project: 0, ago: 4.5, status: "active", indicator: "runtime", parentThreadId: "sample-1" },
];

export function sampleThreads(now: number): OfficeThread[] {
  return SEEDS.map(({ title, project, ago, recap: _recap, ...rest }, i) => {
    const p = PROJECTS[project]!;
    const at = now - ago * 60_000;
    return {
      id: `sample-${i}`,
      displayTitle: title,
      projectId: p.id,
      providerId: "claude-code",
      status: "idle",
      indicator: "none",
      hasPendingInteraction: false,
      isUnread: false,
      isPinned: i === 1,
      isArchived: false,
      isHidden: false,
      parentThreadId: null,
      href: "#",
      activity: IDLE,
      updatedAt: at,
      lastReadAt: at,
      latestAttentionAt: at,
      model: "claude-sonnet-5-5",
      projectName: p.name,
      projectHue: p.hue,
      ...rest,
      providerName: rest.providerId === "codex" ? "Codex" : "Claude Code",
    };
  });
}

export function sampleUsage(now: number): { cards: UsageCard[]; updatedAt: number } {
  const reset = (h: number) => new Date(now + h * 3_600_000).toISOString();
  return {
    updatedAt: now,
    cards: [
      {
        id: "sample-claude",
        title: "Claude Code",
        providers: ["Claude Code"],
        plan: "Max",
        status: "ok",
        message: null,
        windows: [
          { label: "5h", usedPercent: 42, resetsAt: reset(2.5), usedCents: null, limitCents: null },
          { label: "Week", usedPercent: 18, resetsAt: reset(80), usedCents: null, limitCents: null },
        ],
      },
      {
        id: "sample-codex",
        title: "Codex",
        providers: ["Codex"],
        plan: "Plus",
        status: "ok",
        message: null,
        windows: [
          { label: "5h", usedPercent: 12, resetsAt: reset(4), usedCents: null, limitCents: null },
          { label: "Week", usedPercent: 31, resetsAt: reset(120), usedCents: null, limitCents: null },
        ],
      },
    ],
  };
}

const HN_SAMPLE: Story[] = [
  { id: "1", title: "A pixel-art office for your coding agents", url: "https://example.com/", site: "example.com", score: 412, comments: 88, by: "sample", source: "HN", at: null },
  { id: "2", title: "Show HN: I taught my agents to take coffee breaks", url: "https://example.com/", site: "example.com", score: 230, comments: 51, by: "sample", source: "HN", at: null },
];

/** A headline from a plain feed (no points), published `min` minutes ago. */
function fed(id: string, source: string, title: string, site: string, min: number, now: number): Story {
  return { id, title, url: `https://${site}/`, site, score: null, comments: null, by: "", source, at: now - min * 60_000 };
}

/**
 * Made-up headlines and the source the TV names: Hacker News by default,
 * `mix` for several sources taking turns, `feed` for a plain RSS feed.
 */
export function sampleNews(kind: string | undefined, now: number): { source: string; stories: Story[] } {
  if (kind === "feed") {
    return {
      source: "Ars",
      stories: [
        fed("f1", "Ars", "Office plants are quietly running the building's air conditioning now", "example.org", 25, now),
        fed("f2", "Ars", "The surprising physics of a perfectly pulled espresso shot", "example.org", 190, now),
      ],
    };
  }
  if (kind !== "mix") return { source: "HN", stories: HN_SAMPLE };
  return {
    source: "Mix",
    stories: [
      HN_SAMPLE[0]!,
      { id: "m1", title: "Writing a tiny RSS reader without dependencies", url: "https://example.net/", site: "example.net", score: 57, comments: 12, by: "sample", source: "Lobsters", at: now - 80 * 60_000 },
      fed("m2", "Techmeme", "Startup ships an espresso machine that files its own bug reports (Example Daily)", "example.com", 40, now),
      fed("m3", "Verge", "The best mechanical keyboards for night-owl coders", "example.org", 130, now),
      fed("m4", "Ars", "Why the office dog is better at standups than you", "example.org", 300, now),
      HN_SAMPLE[1]!,
    ],
  };
}

/** What a sample thread did last, for its speech bubbles. */
export function sampleRecap(id: string): string | null {
  const i = Number(id.replace(/^sample-/, ""));
  return SEEDS[i]?.recap ?? null;
}

export const SAMPLE_WEATHER: Weather = {
  enabled: true,
  place: "Springfield",
  kind: "partly",
  tempC: 21,
  isDay: true,
  updatedAt: 0,
};
