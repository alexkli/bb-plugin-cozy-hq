// Cozy HQ: a pixel-art office where every BB thread is a little worker.
import "./app.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  definePluginApp,
  experimental_usePluginId,
  experimental_useProviders,
  experimental_useSidebarThreads,
  useBbNavigate,
  useRpc,
  useSettings,
  useSidebarThreadDraftIds,
  type BbNavigate,
} from "@get-bb/plugin-sdk/app";
import type { InboxItem, RpcContract, Story, UsageCard, Weather } from "./contract.ts";
import { lookKey, OfficeView, type OfficeThread } from "./office/OfficeView.tsx";
import { Buddy, freshSince, newsLevel, readLook } from "./office/Buddy.tsx";
import { visibleThreads, type InteractionKind } from "./office/model.ts";
import { updateOpened } from "./office/highlight.ts";

const PROJECT_HUES = [205, 340, 145, 32, 268, 175, 8, 295, 55, 225];

function usePoll(fn: () => void, ms: number): void {
  useEffect(() => {
    fn();
    const id = window.setInterval(() => {
      if (!document.hidden) fn();
    }, ms);
    return () => window.clearInterval(id);
  }, [fn, ms]);
}

/** Live threads plus what the office needs to know about each. */
function useOfficeThreads(withDetails: boolean): { threads: OfficeThread[]; loading: boolean } {
  const { threads, projects, status } = experimental_useSidebarThreads();
  const { providers } = experimental_useProviders();
  const drafts = useSidebarThreadDraftIds();
  const rpc = useRpc<RpcContract>();
  const [models, setModels] = useState<Record<string, string>>({});
  const [interactions, setInteractions] = useState<Record<string, InteractionKind>>({});
  // Hold the office back until we know what kind of question each waiting
  // thread has (or 2.5 s pass), so nobody is seated twice on load.
  const [infoReady, setInfoReady] = useState(!withDetails);
  useEffect(() => {
    if (infoReady) return;
    const id = window.setTimeout(() => setInfoReady(true), 2_500);
    return () => window.clearTimeout(id);
  }, [infoReady]);

  const ids = useMemo(() => threads.filter((t) => !t.isHidden && !t.isArchived).map((t) => t.id), [threads]);
  const pending = useMemo(
    () => threads.filter((t) => !t.isHidden && !t.isArchived && t.hasPendingInteraction).map((t) => t.id),
    [threads],
  );
  const idsKey = ids.join(",");
  const pendingKey = pending.join(",");
  const busyKey = threads.filter((t) => t.status === "active").map((t) => t.id).join(",");
  const loadInfo = useCallback(() => {
    if (!withDetails || ids.length === 0) return;
    rpc.call("threadInfo", { threadIds: ids.slice(0, 300), pendingIds: pending.slice(0, 100) }).then(
      (r) => {
        setModels(r.models);
        setInteractions(r.interactions);
        setInfoReady(true);
      },
      () => setInfoReady(true),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rpc, withDetails, idsKey, pendingKey, busyKey]);
  usePoll(loadInfo, 60_000);

  const office = useMemo<OfficeThread[]>(() => {
    const projectIndex = new Map(projects.map((p, i) => [p.id, i] as const));
    const projectName = new Map(projects.map((p) => [p.id, p.name] as const));
    const providerName = new Map(providers.map((p) => [p.id, p.displayName] as const));
    return threads.map((t) => ({
      id: t.id,
      displayTitle: t.displayTitle,
      projectId: t.projectId,
      providerId: t.providerId,
      status: t.status,
      indicator: t.indicator,
      hasPendingInteraction: t.hasPendingInteraction,
      isUnread: t.isUnread,
      isPinned: t.isPinned,
      isArchived: t.isArchived,
      isHidden: t.isHidden,
      parentThreadId: t.parentThreadId,
      href: t.href,
      activity: t.activity,
      updatedAt: t.updatedAt,
      lastReadAt: t.lastReadAt,
      latestAttentionAt: t.latestAttentionAt,
      drafting: drafts.has(t.id),
      interaction: t.hasPendingInteraction ? (interactions[t.id] ?? null) : null,
      model: models[t.id] ?? null,
      projectName: projectName.get(t.projectId) ?? "Project",
      projectHue: PROJECT_HUES[(projectIndex.get(t.projectId) ?? 0) % PROJECT_HUES.length]!,
      providerName: providerName.get(t.providerId) ?? t.providerId,
    }));
  }, [threads, projects, providers, drafts, interactions, models]);
  return { threads: office, loading: status === "loading" || (ids.length > 0 && !infoReady) };
}

function useBuddySetting(): [boolean, (on: boolean) => void] {
  const { values } = useSettings();
  const rpc = useRpc<RpcContract>();
  const [local, setLocal] = useState<boolean | null>(null);
  const on = local ?? values?.buddy !== false;
  useEffect(() => setLocal(null), [values?.buddy]);
  const set = useCallback(
    (next: boolean) => {
      setLocal(next);
      rpc.call("setBuddy", { on: next }).catch(() => setLocal(null));
    },
    [rpc],
  );
  return [on, set];
}

function OfficePanel() {
  const pluginId = experimental_usePluginId();
  const navigate = useBbNavigate();
  const rpc = useRpc<RpcContract>();
  const { threads, loading } = useOfficeThreads(true);
  const [buddyOn, setBuddyOn] = useBuddySetting();

  const [usage, setUsage] = useState<{ cards: UsageCard[]; updatedAt: number } | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [news, setNews] = useState<{ enabled: boolean; source: string; stories: Story[] }>({ enabled: false, source: "", stories: [] });
  const [inbox, setInbox] = useState<{ enabled: boolean; available: boolean; sources: string[]; items: InboxItem[] }>({
    enabled: false,
    available: false,
    sources: [],
    items: [],
  });

  const loadUsage = useCallback(
    (force = false) => {
      setUsageLoading(true);
      rpc
        .call("usage", { force })
        .then(setUsage, () => undefined)
        .finally(() => setUsageLoading(false));
    },
    [rpc],
  );
  const pollUsage = useCallback(() => loadUsage(false), [loadUsage]);
  // Picking another news source shows on the TV right away, not at the next poll.
  const { values } = useSettings();
  const newsSettings = `${values?.techNews}|${values?.newsSource}|${values?.newsFeed}`;
  const pollNews = useCallback(() => {
    rpc.call("news", null).then((r) => setNews({ enabled: r.enabled, source: r.source, stories: r.stories }), () => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rpc, newsSettings]);
  const pollInbox = useCallback(() => {
    rpc.call("inbox", null).then(setInbox, () => undefined);
  }, [rpc]);
  const [weather, setWeather] = useState<Weather | null>(null);
  const pollWeather = useCallback(() => {
    rpc.call("weather", null).then(setWeather, () => undefined);
  }, [rpc]);
  const recap = useCallback(
    (threadIds: string[]) =>
      rpc.call("recap", { threadIds: threadIds.slice(0, 6) }).then(
        (r) => (r.enabled ? r.recaps : null),
        () => ({}),
      ),
    [rpc],
  );
  usePoll(pollUsage, 90_000);
  usePoll(pollNews, 10 * 60_000);
  usePoll(pollInbox, 3 * 60_000);
  usePoll(pollWeather, 10 * 60_000);

  return (
    <OfficeView
      storageKey={`bb-plugin:${pluginId}`}
      threads={threads}
      loading={loading}
      usage={usage}
      usageLoading={usageLoading}
      news={news.stories}
      newsSource={news.source}
      newsEnabled={news.enabled}
      inbox={inbox}
      weather={weather}
      onRecap={recap}
      onOpenThread={(id) => navigate.toThread(id)}
      onNewThread={() => navigate.toCompose({ focusPrompt: true })}
      onOpenUrl={(url) => {
        // Headlines and inbox items come from outside: open web links only.
        if (!/^https?:\/\//i.test(url)) return;
        if (!navigate.openUrl(url)) window.open(url, "_blank", "noopener,noreferrer");
      }}
      onRefreshUsage={() => loadUsage(true)}
      buddyOn={buddyOn}
      onBuddy={setBuddyOn}
    />
  );
}

/** The page bb is showing (bb navigates without popstate, so poll too). */
function usePathname(): string {
  const [path, setPath] = useState(() => window.location.pathname);
  useEffect(() => {
    const check = () => setPath(window.location.pathname);
    const id = window.setInterval(check, 800);
    window.addEventListener("popstate", check);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("popstate", check);
    };
  }, []);
  return path;
}

/** The thread whose page is open, if any. */
function threadOnPage(threads: OfficeThread[], path: string): string | null {
  for (const t of threads) {
    if (path.includes(t.id)) return t.id;
    try {
      if (t.href && t.href !== "#" && new URL(t.href, window.location.origin).pathname === path) return t.id;
    } catch {
      // not a URL
    }
  }
  return null;
}

/**
 * Note which thread you have open, wherever you are in bb, for the office's
 * glow: bb forgets you opened a thread once you mark it unread (and doesn't
 * note opening one that has a question), this record doesn't.
 */
function useNoteOpened(storageKey: string, threads: OfficeThread[], openId: string | null, loading: boolean): void {
  useEffect(() => {
    if (!loading) updateOpened(storageKey, visibleThreads(threads), Date.now(), openId);
  }, [storageKey, threads, openId, loading]);
}

/**
 * For the "show the office / go back" shortcut: its command gets no navigation
 * of its own, so the overlay (on every page) lends it its own, and notes
 * where you were before the office.
 */
const hq = {
  navigate: null as BbNavigate | null,
  pluginId: "",
  threads: [] as OfficeThread[],
  /** Where you were before the office: a thread, or just "back". */
  before: null as { threadId: string | null } | null,
};

function toggleOffice(): void {
  const nav = hq.navigate;
  if (!nav) return;
  const path = window.location.pathname;
  if (!path.startsWith(`/plugins/${hq.pluginId}/office`)) {
    hq.before = { threadId: threadOnPage(hq.threads, path) };
    nav.toPluginPanel("office");
    return;
  }
  const before = hq.before;
  hq.before = null;
  if (before?.threadId) nav.toThread(before.threadId);
  else window.history.back();
}

function BuddyOverlay() {
  const pluginId = experimental_usePluginId();
  const navigate = useBbNavigate();
  const { threads, loading } = useOfficeThreads(false);
  const [buddyOn] = useBuddySetting();
  const path = usePathname();
  const onOffice = path.startsWith(`/plugins/${pluginId}/office`);
  const currentId = useMemo(() => (onOffice ? null : threadOnPage(threads, path)), [threads, path, onOffice]);
  hq.navigate = navigate;
  hq.pluginId = pluginId;
  hq.threads = threads;
  // Wherever you are away from the office (also when you go there some other way than the shortcut).
  useEffect(() => {
    if (!onOffice) hq.before = { threadId: currentId };
  }, [onOffice, currentId]);
  // Even with the buddy turned off.
  useNoteOpened(`bb-plugin:${pluginId}`, threads, currentId, loading);
  if (!buddyOn) return null;
  return (
    <Buddy
      pluginId={pluginId}
      threads={threads}
      storageKey={`bb-plugin:${pluginId}`}
      hidden={onOffice}
      currentId={currentId}
      onOpen={() => navigate.toPluginPanel("office")}
    />
  );
}

/** Rail badge: threads with news for you since you last looked at the office (as the buddy counts). */
function useNewsBadge() {
  const pluginId = experimental_usePluginId();
  const { threads } = experimental_useSidebarThreads();
  const key = lookKey(`bb-plugin:${pluginId}`);
  const [lastLook, setLastLook] = useState(() => readLook(key));
  useEffect(() => {
    const id = window.setInterval(() => setLastLook(readLook(key)), 4_000);
    return () => window.clearInterval(id);
  }, [key]);
  const fresh = useMemo(() => freshSince(visibleThreads(threads), lastLook), [threads, lastLook]);
  const n = fresh.length;
  if (n === 0) return null;
  const level = newsLevel(fresh);
  return {
    count: n,
    tone: level === "needs-you" ? ("warning" as const) : level === "error" ? ("critical" as const) : ("neutral" as const),
    label: `${n} ${n === 1 ? "update" : "updates"} since you last looked`,
  };
}

export default definePluginApp((app) => {
  app.slots.navPanel({
    id: "office",
    title: "Cozy HQ",
    icon: "cozy-hq/office",
    path: "office",
    component: OfficePanel,
    experimental_useBadge: useNewsBadge,
  });
  app.slots.experimental_appOverlay({ id: "buddy", component: BuddyOverlay });
  app.commands.register({
    id: "toggle-office",
    title: "Cozy HQ: show the office, or go back",
    // H for HQ. bb binds no Mod+Shift+H; rebind it in Settings → Keyboard.
    defaultShortcut: { key: "h", mod: true, shift: true },
    run: toggleOffice,
  });
});
