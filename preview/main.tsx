// A standalone preview of the office with made-up data, for working on
// sceneries without bb: build with `npm run preview`, then open
// preview/index.html?scenery=neon&w=1000&h=711&hour=14 in a browser.
//
// Query: scenery, w, h (CSS px of the office), hour, weather, event, gag,
// season, news (mix, feed: other TV headlines), labels=1, catalog=1 (every
// sprite, classic next to the scenery's).
import "../app.css";
import { createRoot } from "react-dom/client";
import { OfficeView } from "../office/OfficeView.tsx";
import { showCatalog } from "./catalog.ts";

const q = new URLSearchParams(location.search);
const key = "preview";

// `hour` sets the clock as well (the TV, tooltips, lunch), not only the light.
if (q.has("hour")) {
  const RealDate = Date;
  const h = Number(q.get("hour"));
  const target = new RealDate();
  target.setHours(Math.floor(h), Math.round((h % 1) * 60), 0, 0);
  const offset = target.getTime() - RealDate.now();
  class ShiftedDate extends RealDate {
    constructor(...args: unknown[]) {
      if (args.length === 0) super(RealDate.now() + offset);
      else super(...(args as [number]));
    }
    static override now(): number {
      return RealDate.now() + offset;
    }
  }
  globalThis.Date = ShiftedDate as DateConstructor;
}
const debug: Record<string, unknown> = { sample: true, expose: true };
if (q.has("hour")) debug.hour = Number(q.get("hour"));
for (const k of ["weather", "event", "gag", "season", "scenery", "news"]) if (q.has(k)) debug[k] = q.get(k);
localStorage.setItem(`${key}:debug`, JSON.stringify(debug));
localStorage.setItem(`${key}:labels`, JSON.stringify({ on: q.get("labels") === "1" }));
localStorage.setItem(`${key}:sound`, JSON.stringify({ on: false, volume: 0, ambient: false }));

const stage = document.getElementById("stage")!;
if (q.get("catalog") === "1") {
  showCatalog(stage, q.get("scenery") ?? "classic");
} else {
  const w = Number(q.get("w") ?? 1000);
  const h = Number(q.get("h") ?? 711);
  stage.style.width = `${w}px`;
  stage.style.height = `${h}px`;
  const noop = () => undefined;
  createRoot(stage).render(
    <OfficeView
      storageKey={key}
      threads={[]}
      loading={false}
      usage={null}
      usageLoading={false}
      news={[]}
      newsSource=""
      newsEnabled={false}
      inbox={{ enabled: false, available: false, sources: [], items: [] }}
      weather={null}
      onRecap={async () => null}
      onOpenThread={noop}
      onNewThread={noop}
      onOpenUrl={noop}
      onRefreshUsage={noop}
      buddyOn={false}
      onBuddy={noop}
    />,
  );
}
