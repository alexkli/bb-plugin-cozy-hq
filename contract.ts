// RPC contract shared by server.ts and the app (the app imports types only).
import { defineRpcContract } from "@get-bb/plugin-sdk";
import { z } from "zod";

export const usageWindowSchema = z.object({
  label: z.string(),
  usedPercent: z.number(),
  resetsAt: z.string().nullable(),
  usedCents: z.number().nullable(),
  limitCents: z.number().nullable(),
});

export const usageCardSchema = z.object({
  id: z.string(),
  title: z.string(),
  /** Every enabled provider this quota is shared by. */
  providers: z.array(z.string()),
  plan: z.string().nullable(),
  status: z.enum(["ok", "signed-out", "error"]),
  message: z.string().nullable(),
  windows: z.array(usageWindowSchema),
});
export type UsageCard = z.infer<typeof usageCardSchema>;
export type UsageWindow = z.infer<typeof usageWindowSchema>;

export const storySchema = z.object({
  id: z.number(),
  title: z.string(),
  url: z.string(),
  /** The link's site, e.g. "github.com"; empty for Hacker News discussions. */
  site: z.string(),
  score: z.number(),
  comments: z.number(),
  by: z.string(),
});
export type Story = z.infer<typeof storySchema>;

export const inboxItemSchema = z.object({
  id: z.string(),
  source: z.string(),
  title: z.string(),
  context: z.string(),
  author: z.string().nullable(),
  updatedAt: z.string(),
  url: z.string(),
  unread: z.boolean(),
});
export type InboxItem = z.infer<typeof inboxItemSchema>;

export const interactionKindSchema = z.enum(["question", "plan", "approval"]);

/** The weather outside, simplified for the office windows. */
export const weatherKindSchema = z.enum(["clear", "partly", "cloudy", "fog", "drizzle", "rain", "snow", "storm"]);
export type WeatherKind = z.infer<typeof weatherKindSchema>;

export const weatherSchema = z.object({
  enabled: z.boolean(),
  /** Where the weather is for, e.g. "Basel". */
  place: z.string().nullable(),
  kind: weatherKindSchema.nullable(),
  tempC: z.number().nullable(),
  isDay: z.boolean().nullable(),
  updatedAt: z.number(),
});
export type Weather = z.infer<typeof weatherSchema>;

export const rpcContract = defineRpcContract({
  threadInfo: {
    input: z.object({
      threadIds: z.array(z.string()).max(300),
      pendingIds: z.array(z.string()).max(100),
    }),
    output: z.object({
      models: z.record(z.string(), z.string()),
      interactions: z.record(z.string(), interactionKindSchema),
    }),
  },
  setBuddy: {
    input: z.object({ on: z.boolean() }),
    output: z.object({ ok: z.boolean() }),
  },
  usage: {
    input: z.object({ force: z.boolean() }),
    output: z.object({ cards: z.array(usageCardSchema), updatedAt: z.number() }),
  },
  news: {
    input: z.null(),
    output: z.object({ enabled: z.boolean(), stories: z.array(storySchema), updatedAt: z.number() }),
  },
  weather: {
    input: z.null(),
    output: weatherSchema,
  },
  recap: {
    input: z.object({ threadIds: z.array(z.string()).max(6) }),
    output: z.object({ enabled: z.boolean(), recaps: z.record(z.string(), z.string()) }),
  },
  inbox: {
    input: z.null(),
    output: z.object({
      enabled: z.boolean(),
      available: z.boolean(),
      sources: z.array(z.string()),
      items: z.array(inboxItemSchema),
    }),
  },
});

export type RpcContract = typeof rpcContract;
