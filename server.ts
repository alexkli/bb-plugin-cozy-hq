// Cozy HQ backend: gathers usage from every enabled provider's usage source,
// tech headlines for the office TV, the weather outside the windows, what
// threads did last (for office small talk) and, optionally, the Work
// Dashboard inbox.
import { type BbPluginApi } from "@get-bb/plugin-sdk";
import { z } from "zod";
import { rpcContract, type InboxItem, type Story, type UsageCard, type Weather } from "./contract.ts";
import { recapLine, weatherKindOf } from "./office/chatter.ts";
import {
  decodeFeedBytes,
  feedUrl,
  interleave,
  MAX_STORIES,
  MIX,
  NEWS_SOURCE_IDS,
  NEWS_SOURCES,
  newsSourceOf,
  parseFeed,
  siteOf,
  type NewsSourceId,
} from "./office/feeds.ts";

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

const ipPlaceSchema = z.looseObject({
  latitude: z.union([z.string(), z.number()]),
  longitude: z.union([z.string(), z.number()]),
  city: z.string().nullish(),
});
const geocodeSchema = z.looseObject({
  results: z.array(z.looseObject({ name: z.string(), latitude: z.number(), longitude: z.number() })).optional(),
});
const forecastSchema = z.looseObject({
  current: z.looseObject({ temperature_2m: z.number(), weather_code: z.number(), is_day: z.number() }),
});
const outlineSchema = z.looseObject({
  items: z.array(z.looseObject({ preview: z.string(), role: z.string() })),
});

const hnItemSchema = z.looseObject({
  id: z.number(),
  title: z.string().optional(),
  url: z.string().optional(),
  score: z.number().optional(),
  descendants: z.number().optional(),
  by: z.string().optional(),
  time: z.number().optional(),
});
const lobstersItemSchema = z.looseObject({
  short_id: z.string(),
  title: z.string(),
  url: z.string().nullish(),
  comments_url: z.string(),
  score: z.number().optional(),
  comment_count: z.number().optional(),
  submitter_user: z.string().catch(""),
  created_at: z.string().optional(),
});
const devItemSchema = z.looseObject({
  id: z.number(),
  title: z.string(),
  url: z.string(),
  positive_reactions_count: z.number().optional(),
  comments_count: z.number().optional(),
  published_at: z.string().nullish(),
  user: z.looseObject({ username: z.string() }).optional(),
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

async function fetchJson(url: string, signal: AbortSignal, headers?: Record<string, string>): Promise<unknown> {
  const res = await fetch(url, { signal, headers: { accept: "application/json", ...headers } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
}

/** News sites see who's asking, as with any feed reader. */
const NEWS_HEADERS = { "user-agent": "Cozy HQ (bb plugin; +https://github.com/alexkli/bb-plugin-cozy-hq)" };
const MAX_FEED_BYTES = 2_000_000;

/** A feed's text, read up to 2 MB. */
async function fetchFeed(url: string, signal: AbortSignal): Promise<string> {
  const res = await fetch(url, {
    signal,
    headers: { ...NEWS_HEADERS, accept: "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.9, */*;q=0.5" },
  });
  if (!res.ok || !res.body) throw new Error(`${url}: HTTP ${res.status}`);
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_FEED_BYTES) {
      await reader.cancel();
      throw new Error(`${url}: over 2 MB`);
    }
    chunks.push(value);
  }
  return decodeFeedBytes(Buffer.concat(chunks), res.headers.get("content-type"));
}

/** Parses each entry on its own: a broken one is skipped, not the whole list. */
function eachValid<T>(raw: unknown, schema: z.ZodType<T>): T[] {
  if (!Array.isArray(raw)) throw new Error("not a list");
  return raw.flatMap((it) => {
    const r = schema.safeParse(it);
    return r.success ? [r.data] : [];
  });
}

function timeOf(raw: string | null | undefined): number | null {
  const t = raw ? Date.parse(raw) : NaN;
  return Number.isFinite(t) ? t : null;
}

export default async function plugin(bb: BbPluginApi) {
  const settings = bb.settings.define({
    techNews: {
      type: "boolean",
      label: "Tech news on the office TV",
      description: "Show tech headlines as a TV channel, from the source below.",
      default: true,
    },
    newsSource: {
      type: "select",
      label: "Tech news source",
      description:
        "Where the TV's tech headlines come from. Mix takes turns between Hacker News, Lobsters, Techmeme, The Verge and Ars Technica. Custom feed reads the RSS or Atom feed below.",
      options: [...NEWS_SOURCE_IDS],
      experimental_optionLabels: Object.fromEntries(NEWS_SOURCE_IDS.map((id) => [id, NEWS_SOURCES[id].name])),
      default: "hn",
    },
    newsFeed: {
      type: "string",
      label: "Custom news feed",
      description: "The https:// address of an RSS or Atom feed, for the TV when the source is Custom feed.",
      default: "",
      experimental_schema: z
        .string()
        .refine((v) => v.trim() === "" || feedUrl(v) !== null, "Use the https:// address of an RSS or Atom feed."),
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
    weather: {
      type: "boolean",
      label: "Live weather outside the windows",
      description:
        "Show your local weather outside the office windows and on the TV, from Open-Meteo. Your location comes from your IP address (via geojs.io) unless you set a place below.",
      default: true,
    },
    weatherPlace: {
      type: "string",
      label: "Weather place",
      description: "A city (\"Basel\") or latitude,longitude (\"47.56,7.59\") for the weather. Empty: your approximate location from your IP address.",
      default: "",
    },
    workTalk: {
      type: "boolean",
      label: "Agents chat about their work",
      description:
        "When idle agents get together, their speech bubbles sometimes quote what their thread did last. Off: only small talk and tech news.",
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
  async function fetchHn(signal: AbortSignal): Promise<Story[]> {
    const ids = z
      .array(z.number())
      .parse(await fetchJson("https://hacker-news.firebaseio.com/v0/topstories.json", signal));
    const items = await Promise.all(
      ids.slice(0, MAX_STORIES).map((id) =>
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
        id: `hn:${it.id}`,
        title: it.title,
        url: link?.href ?? `https://news.ycombinator.com/item?id=${it.id}`,
        site: link ? siteOf(link) : "",
        score: it.score ?? 0,
        comments: it.descendants ?? 0,
        by: it.by ?? "",
        source: NEWS_SOURCES.hn.tv,
        at: it.time ? it.time * 1000 : null,
      });
    }
    return stories;
  }

  async function fetchLobsters(signal: AbortSignal): Promise<Story[]> {
    const items = eachValid(await fetchJson("https://lobste.rs/hottest.json", signal, NEWS_HEADERS), lobstersItemSchema);
    const stories: Story[] = [];
    for (const it of items.slice(0, MAX_STORIES)) {
      // Text posts have no link of their own: open the discussion.
      const link = webUrl(it.url);
      const url = link ?? webUrl(it.comments_url);
      if (!url) continue;
      stories.push({
        id: `lobsters:${it.short_id}`,
        title: it.title,
        url: url.href,
        site: link ? siteOf(link) : "",
        score: it.score ?? 0,
        comments: it.comment_count ?? 0,
        by: it.submitter_user,
        source: NEWS_SOURCES.lobsters.tv,
        at: timeOf(it.created_at),
      });
    }
    return stories;
  }

  async function fetchDev(signal: AbortSignal): Promise<Story[]> {
    const url = `https://dev.to/api/articles?top=1&per_page=${MAX_STORIES}`;
    const items = eachValid(await fetchJson(url, signal, NEWS_HEADERS), devItemSchema);
    const stories: Story[] = [];
    for (const it of items) {
      const link = webUrl(it.url);
      if (!link) continue;
      stories.push({
        id: `dev:${it.id}`,
        title: it.title,
        url: link.href,
        site: "",
        score: it.positive_reactions_count ?? 0,
        comments: it.comments_count ?? 0,
        by: it.user?.username ?? "",
        source: NEWS_SOURCES.dev.tv,
        at: timeOf(it.published_at),
      });
    }
    return stories;
  }

  /** An RSS or Atom feed's headlines; a custom feed is named by its own title. */
  async function fetchFeedStories(url: URL, source: string | null, signal: AbortSignal): Promise<{ name: string; stories: Story[] }> {
    const feed = parseFeed(await fetchFeed(url.href, signal), url.href);
    const name = source ?? (feed.title && feed.title.length <= 40 ? feed.title : siteOf(url));
    return {
      name,
      stories: feed.items.map((it) => ({
        id: it.id,
        title: it.title,
        url: it.url,
        site: siteOf(new URL(it.url)),
        score: null,
        comments: null,
        by: "",
        source: name,
        at: it.at,
      })),
    };
  }

  interface Headlines {
    /** When they were fetched (or last tried). */
    at: number;
    ok: boolean;
    /** The source's name on the TV. */
    name: string;
    stories: Story[];
  }
  const newsCache = new Map<string, Headlines>();

  /**
   * One source's headlines, fetched at most every 20 minutes. After a failure
   * the last good ones stay and the next try waits 5 minutes.
   */
  async function readSource(id: NewsSourceId, custom: URL | null): Promise<Headlines> {
    const tv = NEWS_SOURCES[id].tv;
    const feed = id === "custom" ? custom : NEWS_SOURCES[id].feed ? new URL(NEWS_SOURCES[id].feed) : null;
    if (id === "custom" && !feed) return { at: Date.now(), ok: false, name: tv, stories: [] };
    const key = id === "custom" ? `custom:${feed!.href}` : id;
    const hit = newsCache.get(key);
    if (hit && Date.now() - hit.at < (hit.ok ? 20 : 5) * 60_000) return hit;
    const signal = AbortSignal.timeout(15_000);
    let next: Headlines;
    try {
      if (feed) {
        const got = await fetchFeedStories(feed, id === "custom" ? null : tv, signal);
        next = { at: Date.now(), ok: true, name: got.name, stories: got.stories };
      } else {
        const stories = await (id === "lobsters" ? fetchLobsters(signal) : id === "dev" ? fetchDev(signal) : fetchHn(signal));
        next = { at: Date.now(), ok: true, name: tv, stories };
      }
      // An error page or an empty list is no reason to drop good headlines.
      if (next.stories.length === 0) throw new Error("no headlines");
    } catch (cause) {
      bb.log.warn(`news fetch failed for ${NEWS_SOURCES[id].name}: ${String(cause)}`);
      next = { at: Date.now(), ok: false, name: hit?.name ?? tv, stories: hit?.stories ?? [] };
    }
    newsCache.set(key, next);
    if (newsCache.size > 24) newsCache.delete(newsCache.keys().next().value!);
    return next;
  }

  async function readNews(setting: string, customFeed: string): Promise<Omit<Headlines, "ok">> {
    const id = newsSourceOf(setting);
    if (id !== "mix") return readSource(id, feedUrl(customFeed));
    const parts = await Promise.all(MIX.map((m) => readSource(m, null)));
    return {
      at: Math.max(...parts.map((p) => p.at)),
      name: NEWS_SOURCES.mix.tv,
      stories: interleave(parts.map((p) => p.stories), MAX_STORIES),
    };
  }

  // ---------------------------------------------------------------- weather
  interface Place {
    key: string;
    name: string | null;
    lat: number;
    lon: number;
    at: number;
  }
  let place: Place | null = null;
  let weatherCache: { key: string; at: number; value: Weather } | null = null;
  const validCoords = (lat: number, lon: number) =>
    Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;

  /** Where to get the weather for: the configured place, else the IP's city. */
  async function findPlace(setting: string, signal: AbortSignal): Promise<Place | null> {
    const key = setting.trim().slice(0, 120);
    if (place && place.key === key && Date.now() - place.at < 6 * 3_600_000) return place;
    let next: Place | null = null;
    const coords = /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/.exec(key);
    if (coords) {
      const lat = Number(coords[1]);
      const lon = Number(coords[2]);
      if (validCoords(lat, lon)) next = { key, name: null, lat, lon, at: Date.now() };
    } else if (key) {
      const url = `https://geocoding-api.open-meteo.com/v1/search?count=1&format=json&name=${encodeURIComponent(key)}`;
      const hit = geocodeSchema.parse(await fetchJson(url, signal)).results?.[0];
      if (hit && validCoords(hit.latitude, hit.longitude)) next = { key, name: hit.name, lat: hit.latitude, lon: hit.longitude, at: Date.now() };
    } else {
      const geo = ipPlaceSchema.parse(await fetchJson("https://get.geojs.io/v1/ip/geo.json", signal));
      const lat = Number(geo.latitude);
      const lon = Number(geo.longitude);
      if (validCoords(lat, lon)) next = { key, name: geo.city ?? null, lat, lon, at: Date.now() };
    }
    if (next) place = next;
    return next;
  }

  async function readWeather(setting: string): Promise<Weather> {
    const key = setting.trim();
    if (weatherCache && weatherCache.key === key && Date.now() - weatherCache.at < 15 * 60_000) return weatherCache.value;
    const signal = AbortSignal.timeout(15_000);
    const where = await findPlace(key, signal);
    if (!where) return { enabled: true, place: null, kind: null, tempC: null, isDay: null, updatedAt: Date.now() };
    // City-level precision is plenty for the sky outside the window.
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${where.lat.toFixed(2)}&longitude=${where.lon.toFixed(2)}` +
      "&current=temperature_2m,weather_code,is_day";
    const now = forecastSchema.parse(await fetchJson(url, signal)).current;
    const value: Weather = {
      enabled: true,
      place: where.name,
      kind: weatherKindOf(now.weather_code),
      tempC: Math.round(now.temperature_2m * 10) / 10,
      isDay: now.is_day === 1,
      updatedAt: Date.now(),
    };
    weatherCache = { key, at: Date.now(), value };
    return value;
  }

  // ---------------------------------------------------------------- recaps
  const recapCache = new Map<string, { text: string | null; at: number }>();
  /** One line on what a thread did last, from the preview of its latest reply. */
  async function recapOf(threadId: string): Promise<string | null> {
    const hit = recapCache.get(threadId);
    if (hit && Date.now() - hit.at < 5 * 60_000) return hit.text;
    let text: string | null = null;
    try {
      const raw = await bb.sdk.threads.conversationOutline({ threadId, role: "assistant", signal: AbortSignal.timeout(8_000) });
      const items = outlineSchema.parse(raw).items.filter((it) => it.role === "assistant");
      for (let i = items.length - 1; i >= Math.max(0, items.length - 3) && !text; i--) text = recapLine(items[i]!.preview);
    } catch {
      text = hit?.text ?? null;
    }
    recapCache.set(threadId, { text, at: Date.now() });
    if (recapCache.size > 300) recapCache.delete(recapCache.keys().next().value!);
    return text;
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
      const { techNews, newsSource, newsFeed } = await settings.get();
      if (!techNews) return { enabled: false, source: "", stories: [], updatedAt: Date.now() };
      const news = await readNews(newsSource, newsFeed);
      return { enabled: true, source: news.name, stories: news.stories, updatedAt: news.at };
    },
    weather: async () => {
      const { weather, weatherPlace } = await settings.get();
      if (!weather) return { enabled: false, place: null, kind: null, tempC: null, isDay: null, updatedAt: Date.now() };
      try {
        return await readWeather(weatherPlace);
      } catch (cause) {
        bb.log.warn(`weather fetch failed: ${String(cause)}`);
        return weatherCache?.value ?? { enabled: true, place: null, kind: null, tempC: null, isDay: null, updatedAt: 0 };
      }
    },
    recap: async ({ threadIds }) => {
      const { workTalk } = await settings.get();
      if (!workTalk) return { enabled: false, recaps: {} };
      const recaps: Record<string, string> = {};
      await Promise.all(
        threadIds.map(async (id) => {
          const line = await recapOf(id);
          if (line) recaps[id] = line;
        }),
      );
      return { enabled: true, recaps };
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
    if (id) {
      modelCache.delete(id);
      recapCache.delete(id);
    }
  };
  bb.events.on("thread.idle", invalidate);
  bb.events.on("thread.failed", invalidate);
}
