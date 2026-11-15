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
} from "@get-bb/plugin-sdk/app";
import type { InboxItem, RpcContract, Story, UsageCard } from "./contract.ts";
import { OfficeView, type OfficeThread } from "./office/OfficeView.tsx";
import { Buddy } from "./office/Buddy.tsx";
import { moodOf, type InteractionKind } from "./office/model.ts";

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
      },
      () => undefined,
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
  return { threads: office, loading: status === "loading" };
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
  const [news, setNews] = useState<{ enabled: boolean; stories: Story[] }>({ enabled: false, stories: [] });
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
  const pollNews = useCallback(() => {
    rpc.call("news", null).then((r) => setNews({ enabled: r.enabled, stories: r.stories }), () => undefined);
  }, [rpc]);
  const pollInbox = useCallback(() => {
    rpc.call("inbox", null).then(setInbox, () => undefined);
  }, [rpc]);
  usePoll(pollUsage, 90_000);
  usePoll(pollNews, 10 * 60_000);
  usePoll(pollInbox, 3 * 60_000);

  return (
    <OfficeView
      storageKey={`bb-plugin:${pluginId}`}
      threads={threads}
      loading={loading}
      usage={usage}
      usageLoading={usageLoading}
      news={news.stories}
      newsEnabled={news.enabled}
      inbox={inbox}
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

/** Tracks whether the Cozy HQ page itself is showing (the buddy hides there). */
function useOnOfficePage(pluginId: string): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const check = () => setOn(window.location.pathname.startsWith(`/plugins/${pluginId}/office`));
    check();
    const id = window.setInterval(check, 800);
    window.addEventListener("popstate", check);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("popstate", check);
    };
  }, [pluginId]);
  return on;
}

function BuddyOverlay() {
  const pluginId = experimental_usePluginId();
  const navigate = useBbNavigate();
  const { threads } = useOfficeThreads(false);
  const [buddyOn] = useBuddySetting();
  const onOffice = useOnOfficePage(pluginId);
  if (!buddyOn) return null;
  return (
    <Buddy
      pluginId={pluginId}
      threads={threads}
      storageKey={`bb-plugin:${pluginId}`}
      hidden={onOffice}
      onOpen={() => navigate.toPluginPanel("office")}
    />
  );
}

/** Rail badge: how many threads are waiting on you. */
function useNeedsYouBadge() {
  const { threads } = experimental_useSidebarThreads();
  const n = threads.filter((t) => !t.isHidden && !t.isArchived && moodOf(t) === "needs-you").length;
  if (n === 0) return null;
  return { count: n, tone: "warning" as const, label: `${n} ${n === 1 ? "thread needs" : "threads need"} you` };
}

export default definePluginApp((app) => {
  app.slots.navPanel({
    id: "office",
    title: "Cozy HQ",
    icon: "cozy-hq/office",
    path: "office",
    component: OfficePanel,
    experimental_useBadge: useNeedsYouBadge,
  });
  app.slots.experimental_appOverlay({ id: "buddy", component: BuddyOverlay });
});
