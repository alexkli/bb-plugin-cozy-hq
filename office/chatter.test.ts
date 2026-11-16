import { test } from "node:test";
import assert from "node:assert/strict";
import { openLine, pickTopic, recapLine, replyLine, weatherKindOf, type Talker } from "./chatter.ts";

test("weather codes map to what the windows show", () => {
  assert.equal(weatherKindOf(0), "clear");
  assert.equal(weatherKindOf(2), "partly");
  assert.equal(weatherKindOf(3), "cloudy");
  assert.equal(weatherKindOf(45), "fog");
  assert.equal(weatherKindOf(53), "drizzle");
  assert.equal(weatherKindOf(63), "rain");
  assert.equal(weatherKindOf(81), "rain");
  assert.equal(weatherKindOf(75), "snow");
  assert.equal(weatherKindOf(86), "snow");
  assert.equal(weatherKindOf(95), "storm");
});

test("a recap is the first real sentence of the latest reply, without markdown", () => {
  assert.equal(
    recapLine("Done! I fixed the **redirect loop** in `auth.ts` by clearing the stale cookie. Tests pass."),
    "I fixed the redirect loop in auth.ts by clearing the stale cookie.",
  );
  assert.equal(recapLine("## Summary\n\n- Added [retry](https://x.dev) to the upload worker so flaky networks recover."), "Added retry to the upload worker so flaky networks recover.");
  assert.equal(recapLine("Here's what I changed:"), null);
  assert.equal(recapLine("```ts\nconst x = 1;\n```"), null);
  const long = recapLine("The migration renames every legacy column in the orders table and backfills the new totals from the line items in batches of five hundred.");
  assert.ok(long && long.length <= 90 && long.endsWith("…"), long ?? "");
});

test("small talk picks a topic and fills in the speaker", () => {
  let i = 0;
  const seq = [0.1, 0.0, 0.5, 0.9, 0.2];
  const r = () => seq[i++ % seq.length]!;
  const who: Talker = { id: "a", title: "Fix the login redirect loop", project: "Storefront", recap: "I fixed the redirect loop.", mood: "idle" };
  const ctx = { news: ["A pixel-art office for your agents"], weather: "rain" as const, hour: 15, festival: null };
  assert.equal(pickTopic(who, ctx, () => 0.1), "work");
  assert.equal(pickTopic(who, ctx, () => 0.6), "news");
  assert.equal(pickTopic(who, { ...ctx, news: [] }, () => 0.6), "small");
  assert.match(openLine("work", who, ctx, r), /redirect loop/);
  assert.match(openLine("news", who, ctx, () => 0), /pixel-art office/);
  assert.ok(replyLine("small", who, () => 0).length > 0);
});
