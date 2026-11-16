// Office small talk: what idle agents say when they get together, and the
// helpers behind it. Pure (no DOM), so the server and tests can use it too.

import type { WeatherKind } from "../contract.ts";

/** WMO weather code (Open-Meteo) → what the office windows show. */
export function weatherKindOf(code: number): WeatherKind {
  if (code <= 0) return "clear";
  if (code <= 2) return "partly";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95) return "storm";
  return "cloudy";
}

const FILLER = /^(done|sure|okay|ok|great|perfect|all set|alright|got it|here'?s|here is|here are|let me|i'll|i will|now|next|summary|thanks)\b/i;

/**
 * One line an agent could say about its session, from the preview of its
 * latest reply: markdown stripped, the first real sentence, kept short.
 */
export function recapLine(preview: string, max = 90): string | null {
  const lines = preview
    .replace(/```[\s\S]*?(```|$)/g, "\n")
    .split(/\n+/)
    .map((line) =>
      line
        .replace(/`([^`]*)`/g, "$1")
        .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/https?:\/\/\S+/g, "")
        .replace(/^\s{0,3}(#{1,6}|[-*+]|\d+[.)]|>)\s+/, "")
        .replace(/(\*\*|__|~~|\*|_)(?=\S)([^*_~]+?)\1/g, "$2")
        .replace(/[|]/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);
  for (const line of lines) {
    for (const raw of line.split(/(?<=[.!?:])\s+/)) {
      const s = raw.replace(/:$/, ".").trim();
      if (s.length < 18 || FILLER.test(s)) continue;
      if (s.length <= max) return s;
      const cut = s.slice(0, max - 1);
      const space = cut.lastIndexOf(" ");
      return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[,;:.\s]+$/, "")}…`;
    }
  }
  return null;
}

/** Someone in the office, as far as small talk is concerned. */
export interface Talker {
  id: string;
  title: string;
  project: string;
  /** What the thread did last, in its own words (if known). */
  recap: string | null;
  mood: "idle" | "done" | "error" | "other";
}

export interface TalkContext {
  /** Tech headlines from the TV (or none). */
  news: readonly string[];
  weather: WeatherKind | null;
  hour: number;
  /** Today's festival, if any ("Halloween"). */
  festival: string | null;
}

export type Topic = "work" | "news" | "small";

const SMALL = [
  "Is it Friday yet?",
  "Who keeps taking my mug?",
  "The espresso machine is making that noise again.",
  "Biscuit stole half my sandwich.",
  "Anyone up for ping-pong later?",
  "I think the cat likes me now.",
  "My tests pass. I don't trust it.",
  "Do we still have oat milk?",
  "I named my branch after the dog.",
  "Pixel sat on my keyboard again.",
  "Who reset the thermostat?",
  "I could get used to these breaks.",
  "Somebody microwaved fish. Again.",
  "That roomba has a grudge against me.",
  "The fish look extra happy today.",
  "New record on the arcade machine!",
  "Has anyone seen my headphones?",
  "I dreamt in YAML last night.",
  "One more coffee and I'll refactor everything.",
  "The boss is in a good mood today.",
  // {they}, {them}, {their}: the boss's pronouns, from the settings (the office fills them in).
  "Is the boss in? I need {their} sign-off.",
  "The boss was humming at {their} desk. Good sign.",
];

const WEATHER_TALK: Partial<Record<WeatherKind, string[]>> = {
  clear: ["Gorgeous day out there.", "Lunch outside today?"],
  partly: ["Nice out, mostly.", "Sun's trying its best today."],
  cloudy: ["Bit grey out today.", "Perfect weather for coding."],
  fog: ["Can't even see across the street.", "The fog rolled in again."],
  drizzle: ["Just a drizzle. Umbrella, though?", "Bit damp out there."],
  rain: ["Pouring out there!", "Good day to stay in and ship."],
  snow: ["It's snowing! Snowball fight?", "Look at the snow!"],
  storm: ["Did you hear that thunder?!", "Hope the servers like lightning."],
};

const NEWS_OPEN = ["Did you see this? “{t}”", "Wild headline: “{t}”", "Everyone's talking about “{t}”", "Reading “{t}” right now."];
const NEWS_REPLY = ["The comments are something else.", "Yeah, wild times.", "Saw it. Not sure what to think.", "Bookmarked for later!", "We should try that.", "Hype, mostly."];

const WORK_OPEN_RECAP = ["{r}", "{r}", "Just wrapped this up: {r}", "Guess what? {r}", "Update: {r}"];
const WORK_OPEN_DONE = ["Finally done with “{t}”.", "Shipped “{t}”!", "“{t}” is ready for the boss."];
const WORK_OPEN_ERROR = ["“{t}” blew up on me.", "Hit a wall on “{t}”.", "Ugh. “{t}” keeps failing."];
const WORK_OPEN_IDLE = ["Took a break from “{t}”.", "Still thinking about “{t}”.", "{p} is keeping me busy."];
const WORK_REPLY = ["Nice!", "Ooh, how?", "Ship it!", "Ha, classic.", "Same here.", "Teach me later?", "Respect.", "The boss will love that.", "Show the boss, {they}'ll love it."];
const WORK_REPLY_ERROR = ["Want a second pair of eyes?", "Turn it off and on again?", "Coffee first, then debug.", "Been there."];
const SMALL_REPLY = ["Ha, right?", "Totally.", "Not again…", "Don't get me started.", "Haha!", "Same.", "Tell me about it."];

const short = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, n - 1).trimEnd()}…`);
const pick = <T>(list: readonly T[], r: () => number): T => list[Math.floor(r() * list.length) % list.length]!;
const fill = (tpl: string, vars: Record<string, string>) => tpl.replace(/\{(\w)\}/g, (_, k: string) => vars[k] ?? "");

/** What the conversation is about: work talk needs something to say, news needs headlines. */
export function pickTopic(speaker: Talker, ctx: TalkContext, r: () => number): Topic {
  const roll = r();
  // Real work news is the best gossip.
  if (roll < (speaker.recap ? 0.45 : 0.3)) return "work";
  if (roll < 0.7 && ctx.news.length > 0) return "news";
  return "small";
}

/** The opening line of a chat. */
export function openLine(topic: Topic, speaker: Talker, ctx: TalkContext, r: () => number): string {
  const vars = { t: short(speaker.title, 42), p: speaker.project, r: speaker.recap ?? "" };
  if (topic === "work") {
    if (speaker.recap && r() < 0.8) return fill(pick(WORK_OPEN_RECAP, r), vars);
    if (speaker.mood === "error") return fill(pick(WORK_OPEN_ERROR, r), vars);
    if (speaker.mood === "done") return fill(pick(WORK_OPEN_DONE, r), vars);
    return fill(pick(WORK_OPEN_IDLE, r), vars);
  }
  if (topic === "news" && ctx.news.length > 0) return fill(pick(NEWS_OPEN, r), { t: short(pick(ctx.news, r), 60) });
  const seasonal: string[] = [];
  if (ctx.festival) seasonal.push(`Happy ${ctx.festival}!`, `Are you coming to the ${ctx.festival} party?`);
  if (ctx.weather) seasonal.push(...(WEATHER_TALK[ctx.weather] ?? []));
  if (ctx.hour < 10) seasonal.push("Morning! Coffee first.");
  if (ctx.hour >= 18) seasonal.push("Long day, huh?");
  return r() < 0.35 && seasonal.length > 0 ? pick(seasonal, r) : pick(SMALL, r);
}

/** A reply to the opening line. */
export function replyLine(topic: Topic, speaker: Talker, r: () => number): string {
  if (topic === "work") return pick(speaker.mood === "error" ? WORK_REPLY_ERROR : WORK_REPLY, r);
  if (topic === "news") return pick(NEWS_REPLY, r);
  return pick(SMALL_REPLY, r);
}

/** Shouts during a game. */
export const GAME_LINES: Record<"pingpong" | "darts", string[]> = {
  pingpong: ["Nice shot!", "Out!", "Ha! Point!", "Rematch?", "Spin serve!", "Net!"],
  darts: ["Bullseye!", "So close!", "Triple twenty!", "Your turn.", "Missed the board…"],
};

type Food = "pizza" | "sushi" | "burgers" | "tacos" | "ramen";

const DELIVERY: Record<Food, string[]> = {
  pizza: ["Pizza delivery!", "Four large pizzas for the office!"],
  sushi: ["Sushi for the office!", "One big sushi platter!"],
  burgers: ["Burgers are here!", "Burgers and fries!"],
  tacos: ["Taco Tuesday delivery!", "Tacos for the team!"],
  ramen: ["Ramen, piping hot!", "Ramen for everyone!"],
};

const FOOD_TALK: Record<Food, string[]> = {
  pizza: ["Who took the last slice?", "Pineapple belongs on pizza. Fight me.", "Crust is the best part.", "Extra cheese, nice."],
  sushi: ["Pass the wasabi?", "I can't do chopsticks today.", "This salmon is amazing.", "Soy sauce, anyone?"],
  burgers: ["These fries though!", "Ketchup or mayo?", "Best burger in town.", "I'm saving the pickles for last."],
  tacos: ["Salsa verde, please!", "Taco count: three. So far.", "Who ordered extra guac?", "These are messy. Worth it."],
  ramen: ["Slurping is polite, right?", "This broth is everything.", "Careful, it's hot!", "Extra egg, best decision."],
};

const LUNCHBOX = ["Leftovers again. No regrets.", "Meal prep Sunday paid off.", "Homemade. Don't judge.", "My kid packed this. It's mostly crackers.", "Brought my own, but I'll take a slice."];
const LUNCH = ["Best part of the day.", "Napkins, anyone?", "Who's buying next time?", "Lunch together is so nice.", "I'm going to need a nap after this.", "Should we do this every Friday?"];
const WAITING = ["Where's the food?", "I'm starving.", "Did someone order already?", "I can hear my stomach."];

/** What the delivery person calls out. */
export function deliveryLine(food: Food, r: () => number): string {
  return pick(DELIVERY[food], r);
}

/** Lunch-table talk: about the food, their own lunchbox, or waiting for it. */
export function lunchLine(food: Food, ownBox: boolean, delivered: boolean, r: () => number): string {
  if (ownBox && r() < 0.5) return pick(LUNCHBOX, r);
  if (!delivered) return pick(WAITING, r);
  return r() < 0.6 ? pick(FOOD_TALK[food], r) : pick(LUNCH, r);
}
