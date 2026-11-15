// Cozy HQ backend: gathers usage from every enabled provider's usage source,
// tech headlines for the office TV, and (optionally) the Work Dashboard inbox.
import { type BbPluginApi } from "@get-bb/plugin-sdk";
import { z } from "zod";
import { rpcContract, type InboxItem, type Story, type UsageCard } from "./contract.ts";

const LIST_METHOD = "provider-usage.v1.listResources";
const FETCH_METHOD = "provider-usage.v1.getResource";

const resourceListSchema = z.looseObject({
  label: z.string().nullish(),
  resources: z.array(
    z.looseObject({
      id: z.string(),
      providerId: z.string(),
      label: z.string().nullish(),
      accountKey: z.string().nullish(),
      scope: z.looseObject({ kind: z.string(), hostId: z.string().optional() }),
    }),
  ),
});

const measurementSchema = z.looseObject({
  accountKey: z.string().nullish(),
  usage: z.looseObject({
    status: z.string(),
    planLabel: z.string().nullish(),
    message: z.string().nullish(),
    windows: z
      .array(
        z.looseObject({
          label: z.string(),
          usedPercent: z.number(),
          resetsAt: z.string().nullish(),
          cost: z.looseObject({ usedUsdCents: z.number(), limitUsdCents: z.number() }).nullish(),
        }),
      )
      .optional(),
  }),
});
type Measurement = z.infer<typeof measurementSchema>;

const dashboardSchema = z.looseObject({
  items: z.array(
    z.looseObject({
      id: z.string(),
      source: z.string(),
      title: z.string(),
      context: z.string().nullish(),
      author: z.string().nullish(),
      updatedAt: z.string(),
      url: z.string(),
      unread: z.boolean().optional(),
    }),
  ),
  accounts: z.array(z.looseObject({ provider: z.string(), state: z.string() })).optional(),
});

const hnItemSchema = z.looseObject({
  id: z.number(),
  title: z.string().optional(),
  url: z.string().optional(),
  score: z.number().optional(),
  descendants: z.number().optional(),
  by: z.string().optional(),
});

/** Only plain web links leave the server: anything else (javascript:, file:, …) is dropped. */
function webUrl(raw: string | null | undefined): URL | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" || u.protocol === "http:" ? u : null;
  } catch {
    return null;
  }
}

async function fetchJson(url: string, signal: AbortSignal): Promise<unknown> {
  const res = await fetch(url, { signal, headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
}

export default async function plugin(bb: BbPluginApi) {
  const settings = bb.settings.define({
    techNews: {
      type: "boolean",
      label: "Tech news on the office TV",
      description: "Show Hacker News front-page headlines as a TV channel.",
      default: true,
    },
    buddy: {
      type: "boolean",
      label: "Office buddy",
      description: "A little agent from the office strolls in a corner of bb wherever you are (drag it anywhere). Click it to open Cozy HQ.",
      default: true,
    },
    inbox: {
      type: "boolean",
      label: "Work Dashboard inbox on the office TV",
      description:
        "Show your newest Slack, Teams, GitHub and mail items from the Work Dashboard plugin as a TV channel, when that plugin is installed.",
      default: true,
    },
  });

  // ---------------------------------------------------------------- usage
  let usageCache: { at: number; cards: UsageCard[] } | null = null;
  let usageInflight: Promise<UsageCard[]> | null = null;

  interface Reading {
    providerId: string;
    label: string;
    m: Measurement | null;
    fallbackKey: string;
  }

  async function collectUsage(force: boolean): Promise<UsageCard[]> {
    const signal = AbortSignal.timeout(40_000);
    const [providers, hosts, sources] = await Promise.all([
      bb.sdk.providers.list().catch(() => []),
      bb.sdk.hosts.list().catch(() => []),
      bb.sdk.plugins.experimental_discoverRpc({ method: LIST_METHOD }).catch(() => []),
    ]);
    // Only providers that are enabled and available right now get a note.
    const enabled = new Map(providers.filter((p) => p.available).map((p) => [p.id, p.displayName] as const));
    const connected = new Set(hosts.filter((h) => h.status === "connected").map((h) => h.id));
    const order = new Map(providers.map((p, i) => [p.id, i] as const));

    const lists = await Promise.all(
      sources.map((source) =>
        bb.sdk.plugins
          .callRpc({ pluginId: source.pluginId, method: LIST_METHOD, input: {}, outputSchema: resourceListSchema, signal })
          .then(
            (list) => ({ pluginId: source.pluginId, list }),
            (cause) => {
              bb.log.warn(`usage list failed for ${source.pluginId}: ${String(cause)}`);
              return null;
            },
          ),
      ),
    );
    const jobs: Promise<Reading>[] = [];
    for (const entry of lists) {
      if (!entry) continue;
      for (const r of entry.list.resources) {
        const label = enabled.get(r.providerId);
        if (label === undefined) continue;
        if (r.scope.kind === "host" && r.scope.hostId && !connected.has(r.scope.hostId)) continue;
        const fallbackKey = `${entry.pluginId}:${r.id}`;
        jobs.push(
          bb.sdk.plugins
            .callRpc({
              pluginId: entry.pluginId,
              method: FETCH_METHOD,
              input: { resourceId: r.id, refresh: force },
              outputSchema: measurementSchema,
              signal,
            })
            .then(
              (m) => ({ providerId: r.providerId, label, m, fallbackKey }),
              (cause) => {
                bb.log.warn(`usage fetch failed for ${entry.pluginId}: ${String(cause)}`);
                return { providerId: r.providerId, label, m: null, fallbackKey };
              },
            ),
        );
      }
    }
    const results = await Promise.all(jobs);
    results.sort((a, b) => (order.get(a.providerId) ?? 99) - (order.get(b.providerId) ?? 99));

    // One note per account: providers sharing a quota (same account key and
    // the same readings) collapse into one.
    const cards = new Map<string, UsageCard>();
    for (const { label, m, fallbackKey } of results) {
      const usage = m?.usage;
      if (usage?.status === "not_installed") continue;
      const windows = (usage?.windows ?? []).map((w) => ({
        label: w.label,
        usedPercent: Math.max(0, w.usedPercent),
        resetsAt: w.resetsAt ?? null,
        usedCents: w.cost?.usedUsdCents ?? null,
        limitCents: w.cost?.limitUsdCents ?? null,
      }));
      const status: UsageCard["status"] =
        usage === undefined || usage.status === "error" ? "error" : usage.status === "ok" ? "ok" : "signed-out";
      const key = m?.accountKey ? `${m.accountKey}|${windows.map((w) => w.label).join(",")}` : fallbackKey;
      const existing = cards.get(key);
      if (existing) {
        if (!existing.providers.includes(label)) existing.providers.push(label);
        // Sources can be read moments apart; keep the higher reading.
        existing.windows.forEach((w, i) => {
          const other = windows[i];
          if (other && other.usedPercent > w.usedPercent) existing.windows[i] = other;
        });
        continue;
      }
      cards.set(key, {
        id: key,
        title: label,
        providers: [label],
        plan: usage?.planLabel ?? null,
        status,
        message: status === "signed-out" ? "Not signed in" : status === "error" ? (usage?.message ?? "Usage unavailable") : null,
        windows,
      });
    }
    return [...cards.values()];
  }

  async function readUsage(force: boolean): Promise<UsageCard[]> {
    if (!force && usageCache && Date.now() - usageCache.at < 120_000) return usageCache.cards;
    if (usageInflight) return usageInflight;
    usageInflight = collectUsage(force)
      .then((cards) => {
        usageCache = { at: Date.now(), cards };
        return cards;
      })
      .finally(() => {
        usageInflight = null;
      });
    return usageInflight;
  }

  // ---------------------------------------------------------------- news
  let newsCache: { at: number; stories: Story[] } | null = null;
  async function readNews(): Promise<Story[]> {
    if (newsCache && Date.now() - newsCache.at < 20 * 60_000) return newsCache.stories;
    const signal = AbortSignal.timeout(15_000);
    const ids = z
      .array(z.number())
      .parse(await fetchJson("https://hacker-news.firebaseio.com/v0/topstories.json", signal));
    const items = await Promise.all(
      ids.slice(0, 16).map((id) =>
        fetchJson(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, signal)
          .then((raw) => hnItemSchema.parse(raw))
          .catch(() => null),
      ),
    );
    const stories: Story[] = [];
    for (const it of items) {
      if (it === null || typeof it.title !== "string") continue;
      const link = webUrl(it.url);
      stories.push({
        id: it.id,
        title: it.title,
        url: link?.href ?? `https://news.ycombinator.com/item?id=${it.id}`,
        site: link ? link.hostname.replace(/^www\./, "") : "",
        score: it.score ?? 0,
        comments: it.descendants ?? 0,
        by: it.by ?? "",
      });
    }
    newsCache = { at: Date.now(), stories };
    return stories;
  }

  // ---------------------------------------------------------------- inbox
  async function readInbox(): Promise<{ available: boolean; sources: string[]; items: InboxItem[] }> {
    try {
      const data = await bb.sdk.plugins.callRpc({
        pluginId: "work-dashboard",
        method: "dashboard",
        input: null,
        outputSchema: dashboardSchema,
        signal: AbortSignal.timeout(20_000),
      });
      const items = data.items
        .filter((it) => webUrl(it.url) !== null)
        .sort(
          (a, b) =>
            Number(b.unread ?? false) - Number(a.unread ?? false) || b.updatedAt.localeCompare(a.updatedAt),
        )
        .slice(0, 12)
        .map((it) => ({
          id: it.id,
          source: it.source,
          title: it.title,
          context: it.context ?? "",
          author: it.author ?? null,
          updatedAt: it.updatedAt,
          url: it.url,
          unread: it.unread ?? false,
        }));
      const sources = [
        ...new Set((data.accounts ?? []).filter((a) => a.state === "ok").map((a) => a.provider)),
      ];
      return { available: true, sources, items };
    } catch {
      return { available: false, sources: [], items: [] };
    }
  }

  // ---------------------------------------------------------------- per-thread details
  const modelCache = new Map<string, { model: string; at: number }>();
  const interactionSchema = z.array(
    z.looseObject({ payload: z.looseObject({ kind: z.string(), subject: z.looseObject({ kind: z.string() }).optional() }).optional() }),
  );
  async function modelOf(threadId: string): Promise<string | null> {
    const hit = modelCache.get(threadId);
    if (hit && Date.now() - hit.at < 5 * 60_000) return hit.model;
    try {
      const opts = await bb.sdk.threads.defaultExecutionOptions({ threadId });
      const model = opts?.model ?? "";
      modelCache.set(threadId, { model, at: Date.now() });
      return model || null;
    } catch {
      return hit?.model ?? null;
    }
  }
  async function interactionOf(threadId: string): Promise<"question" | "plan" | "approval" | null> {
    try {
      const raw = await bb.sdk.threads.interactions.list({ threadId });
      const list = interactionSchema.parse(raw);
      for (const it of list) {
        const kind = it.payload?.kind;
        if (kind === "approval") return it.payload?.subject?.kind === "plan" ? "plan" : "approval";
        if (kind) return "question";
      }
      return list.length > 0 ? "question" : null;
    } catch {
      return null;
    }
  }

  bb.rpc.register(rpcContract, {
    threadInfo: async ({ threadIds, pendingIds }) => {
      const models: Record<string, string> = {};
      const interactions: Record<string, "question" | "plan" | "approval"> = {};
      for (let i = 0; i < threadIds.length; i += 8) {
        await Promise.all(
          threadIds.slice(i, i + 8).map(async (id) => {
            const m = await modelOf(id);
            if (m) models[id] = m;
          }),
        );
      }
      await Promise.all(
        pendingIds.map(async (id) => {
          const k = await interactionOf(id);
          if (k) interactions[id] = k;
        }),
      );
      return { models, interactions };
    },
    setBuddy: async ({ on }) => {
      await settings.experimental_set({ buddy: on });
      return { ok: true };
    },
    usage: async ({ force }) => ({ cards: await readUsage(force), updatedAt: usageCache?.at ?? Date.now() }),
    news: async () => {
      const { techNews } = await settings.get();
      if (!techNews) return { enabled: false, stories: [], updatedAt: Date.now() };
      try {
        return { enabled: true, stories: await readNews(), updatedAt: newsCache?.at ?? Date.now() };
      } catch (cause) {
        bb.log.warn(`news fetch failed: ${String(cause)}`);
        return { enabled: true, stories: newsCache?.stories ?? [], updatedAt: newsCache?.at ?? 0 };
      }
    },
    inbox: async () => {
      const { inbox } = await settings.get();
      if (!inbox) return { enabled: false, available: false, sources: [], items: [] };
      return { enabled: true, ...(await readInbox()) };
    },
  });

  // Usage changes when turns finish: let the next poll refetch.
  const invalidate = (event?: unknown) => {
    if (usageCache) usageCache.at = 0;
    // A finished turn may have switched models.
    const id = (event as { threadId?: string } | undefined)?.threadId;
    if (id) modelCache.delete(id);
  };
  bb.events.on("thread.idle", invalidate);
  bb.events.on("thread.failed", invalidate);
}
