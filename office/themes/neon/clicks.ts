// Neon City: things to click. The food carts flip noodles in a burst of
// flame (or draw a queue), the holo billboard glitches or lets a giant koi
// swim over the street, the crosswalk signal sends a crowd across, the
// dumpster hides a cat and a rat, the hover-bike revs and zooms off, the AC
// units drip on people, the manholes steam (or a little maintenance bot looks
// out), the ramen shop's noren draws slurpers, and the street itself gets
// delivery drones and puddle splashes.
//
// Clicks only start things; everything is drawn from the city's live layers
// (decor, overlay, lights) by the animation clock.
import type { Drawable, GatherCue, GatherSpot, Gathering, Light, PaintInfo, SceneryActions, SceneryClickable } from "../../theme.ts";
import type { Layout } from "../../layout.ts";
import { cached, Grid, OUTLINE } from "../../themekit.ts";
import { P } from "./kit.ts";
import { planOf, type Front, type NeonPlan } from "./plan.ts";
import { aframeWidth, streetVents } from "./live.ts";

type Ctx = CanvasRenderingContext2D;
type Bit = NonNullable<NeonPlan["bits"]>[number];

const pick = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)]!;

function weighted<T extends string>(options: [T, number][]): T {
  let roll = Math.random() * options.reduce((n, [, w]) => n + w, 0);
  for (const [o, w] of options) {
    roll -= w;
    if (roll <= 0) return o;
  }
  return options[0]![0];
}

// ------------------------------------------------------------------ words

const SAY = {
  hover: {
    cart: "Street cart · order something",
    billboard: "Holo billboard · poke the ad",
    signal: "Crosswalk · press the button",
    dumpster: "Dumpster · something's rustling",
    bike: "Hover-bike · rev it",
    ac: "AC unit · it drips",
    manhole: "Manhole · it's steaming",
    noren: "Ramen shop · lift the noren",
    booth: "Ticket booth · knock on the glass",
    aframe: "Sandwich board · give it a spin",
    street: "The street · flag down a drone",
  },
  queue: [
    [1.0, 0, "One glow-noodle, extra spicy!"],
    [3.4, 1, "Smells like a whole city."],
    [6.6, 2, "Do you take crypto-yen?"],
    [9.6, 0, "Flame on!"],
  ],
  flip: ["Whoa, the flames!", "Show-off.", "Now that's wok hei.", "Eyebrows: gone."],
  rush: [
    [0.3, 0, "WALK!", "nc-chirp"],
    [1.6, 1, "Beep beep beep…"],
    [3.4, 2, "Coming through!"],
    [5.2, 3, "Made it."],
  ],
  button: ["Finally, a green.", "Press it again, it helps.", "Walk, walk, walk!"],
  billboard: ["Whoa, a holo-koi.", "Best ad in the city.", "Is it… swimming at us?", "I want one."],
  glitch: ["The ad broke.", "Have you tried turning it off and on?", "Ooh, a new ad."],
  rat: ["Eek!", "That rat has a job here.", "Was that a rat?"],
  drip: ["Hey! It's dripping on me!", "Ugh, AC water.", "Is that… rain? Indoors?"],
  bot: ["Hi little bot!", "Fixing the pipes again?", "Good morning, maintenance."],
  slurp: [
    [0.8, 0, "*slurrrp*", "nc-slurp"],
    [3.0, 1, "Best broth in the city."],
    [5.6, 2, "*slurp* *slurp*", "nc-slurp"],
    [8.6, 0, "One more bowl…"],
  ],
  order: ["Order up!", "That smells incredible.", "Who ordered the extra glow?"],
  drone: ["Package for… someone?", "Drone delivery, nice.", "Not my parcel."],
  ticket: ["Admit one!", "Is the doorman even real?", "Front row, please.", "Members only? Since when?"],
  tickets: [
    [0.8, 0, "Two for the late show!", "nc-ticket"],
    [3.6, 1, "Is the doorman even real?"],
    [6.8, 2, "Got mine!", "nc-ticket"],
  ],
  spin: ["Nice spin.", "Wheee.", "Today's special: dizzy."],
  fallen: ["I'll get it.", "Who keeps knocking that over?", "Up you go."],
  splash: ["Splash!", "My shoes!", "Neon puddle."],
} as const;

const ACT = {
  queue: "queueing at the noodle cart",
  rush: "crossing the street",
  slurp: "slurping ramen",
  tickets: "queueing for tickets",
};

function cues(list: readonly (readonly (string | number)[])[]): GatherCue[] {
  return list.map(([at, who, say, sound]) => ({ at: at as number, who: who as number, say: say as string, seconds: (say as string).length > 22 ? 3.6 : 2.4, sound: sound as string | undefined }));
}

// ------------------------------------------------------------------ where things are

function bitsOf(L: Layout, kind: Bit["kind"]): Bit[] {
  return (planOf(L)?.bits ?? []).filter((b) => b.kind === kind);
}

function norenOf(L: Layout): Front | null {
  return planOf(L)?.fronts?.find((f) => f.kind === "kitchen" && f.side === "top") ?? null;
}

export function clickables(L: Layout): SceneryClickable[] {
  const plan = planOf(L);
  if (!plan) return [];
  const out: SceneryClickable[] = [];
  plan.carts.forEach((c, i) => out.push({ id: `cart-${i}`, rect: { x: c.x, y: c.y - 21, w: 26, h: 22 }, hover: SAY.hover.cart }));
  for (const b of bitsOf(L, "billboard")) out.push({ id: "billboard", rect: { x: b.x, y: b.y, w: 44, h: 15 }, hover: SAY.hover.billboard });
  bitsOf(L, "signal").forEach((b, i) => out.push({ id: `signal-${i}`, rect: { x: b.x - 5, y: b.y - 29, w: 11, h: 29 }, hover: SAY.hover.signal }));
  for (const b of bitsOf(L, "dumpster")) out.push({ id: "dumpster", rect: { x: b.x, y: b.y - 22, w: 24, h: 22 }, hover: SAY.hover.dumpster });
  for (const b of bitsOf(L, "bike")) out.push({ id: "bike", rect: { x: b.x, y: b.y - 13, w: 26, h: 13 }, hover: SAY.hover.bike });
  bitsOf(L, "ac").forEach((b, i) => out.push({ id: `ac-${i}`, rect: { x: b.x - 8, y: b.y - 13, w: 17, h: 14 }, hover: SAY.hover.ac }));
  streetVents(L).forEach((v, i) => out.push({ id: `manhole-${i}`, rect: { x: v.x - 2, y: v.y - 2, w: v.w + 4, h: v.h + 4 }, hover: SAY.hover.manhole }));
  const n = norenOf(L);
  if (n) out.push({ id: "noren", rect: { x: n.x0, y: n.y - 4, w: n.x1 - n.x0, h: 17 }, hover: SAY.hover.noren });
  bitsOf(L, "booth").forEach((b, i) => out.push({ id: `booth-${i}`, rect: { x: b.x, y: b.y - 24, w: 16, h: 24 }, hover: SAY.hover.booth }));
  bitsOf(L, "aframe").forEach((b, i) => out.push({ id: `aframe-${i}`, rect: { x: b.x, y: b.y - 13, w: aframeWidth(b.text ?? "OPEN"), h: 14 }, hover: SAY.hover.aframe }));
  // The street itself, last: anything on it wins.
  plan.streets.forEach((st, i) => out.push({ id: `street-${i}`, rect: { x: 0, y: st.y - st.half, w: L.W, h: st.half * 2 }, hover: SAY.hover.street }));
  return out;
}

// ------------------------------------------------------------------ what's going on

type FxKind =
  | "flip"
  | "steam"
  | "glitch"
  | "koi"
  | "walk"
  | "cat"
  | "rat"
  | "clang"
  | "rev"
  | "alarm"
  | "drip"
  | "hiss"
  | "burst"
  | "bot"
  | "order"
  | "drone"
  | "splash"
  | "ticket"
  | "spin"
  | "tip";

interface Fx {
  kind: FxKind;
  t0: number;
  dur: number;
  x: number;
  y: number;
  dir: number;
  /** Where something lands (a drip on someone's head, the drone's drop). */
  to?: { x: number; y: number };
}

let fx: Fx[] = [];
/** A crowd somewhere: at a cart, at the crosswalk, at the noren. */
let crowds: { kind: "queue" | "rush" | "slurp" | "tickets"; g: Gathering; spots: GatherSpot[]; x: number; y: number }[] = [];
/** Ads cycled by glitches. */
let adShift = 0;
/** The plan the shows belong to; a new one (a resize) starts over. */
let forL: Layout | null = null;

function bind(L: Layout): void {
  if (L === forL) return;
  forL = L;
  fx = [];
  crowds = [];
}

function add(f: Fx): void {
  fx.push(f);
  if (fx.length > 16) fx.shift();
}

function active(kind: FxKind, t: number, x?: number): Fx | undefined {
  return fx.find((f) => f.kind === kind && t >= f.t0 && t - f.t0 < f.dur && (x === undefined || Math.abs(f.x - x) < 2));
}

function crowdAt(kind: string, x: number): boolean {
  return crowds.some((c) => c.kind === kind && !c.g.done && Math.abs(c.x - x) < 4);
}

export function click(id: string, act: SceneryActions): string | null {
  bind(act.L);
  const plan = planOf(act.L);
  if (!plan) return null;
  crowds = crowds.filter((c) => !c.g.done);
  const [kind, idx] = id.split("-") as [string, string | undefined];
  const i = Number(idx ?? 0);
  switch (kind) {
    case "cart": {
      const c = plan.carts[i];
      return c ? clickCart(c, act) : null;
    }
    case "billboard": {
      const b = bitsOf(act.L, "billboard")[0];
      return b ? clickBillboard(b, act) : null;
    }
    case "signal": {
      const b = bitsOf(act.L, "signal")[i];
      return b ? clickSignal(b, act) : null;
    }
    case "dumpster": {
      const b = bitsOf(act.L, "dumpster")[0];
      return b ? clickDumpster(b, act) : null;
    }
    case "bike": {
      const b = bitsOf(act.L, "bike")[0];
      if (!b || active("rev", act.t)) return null;
      const rev = Math.random() < 0.7;
      add({ kind: rev ? "rev" : "alarm", t0: act.t, dur: rev ? 9 : 3, x: b.x, y: b.y, dir: Math.random() < 0.5 ? -1 : 1 });
      return rev ? "nc-rev" : "nc-alarm";
    }
    case "ac": {
      const b = bitsOf(act.L, "ac")[i];
      return b ? clickAc(b, act) : null;
    }
    case "manhole": {
      const v = streetVents(act.L)[i];
      if (!v) return null;
      const bot = Math.random() < 0.45 && !active("bot", act.t, v.x + 6);
      add({ kind: bot ? "bot" : "burst", t0: act.t, dur: bot ? 4.2 : 3, x: v.x + 6, y: v.y + 3, dir: 1 });
      if (bot) {
        const who = act.near(v.x + 6, v.y, 70)[0];
        if (who) act.say(who.id, pick(SAY.bot), 2.4, 1.2);
      }
      return bot ? "nc-bot" : "nc-steam";
    }
    case "noren": {
      const n = norenOf(act.L);
      return n ? clickNoren(n, act) : null;
    }
    case "booth": {
      const b = bitsOf(act.L, "booth")[i];
      return b ? clickBooth(b, act) : null;
    }
    case "aframe": {
      const b = bitsOf(act.L, "aframe")[i];
      if (!b || active("spin", act.t, b.x) || active("tip", act.t, b.x)) return null;
      const tip = Math.random() < 0.3;
      add({ kind: tip ? "tip" : "spin", t0: act.t, dur: tip ? 4 : 1.2, x: b.x, y: b.y, dir: 1 });
      const who = act.near(b.x + 8, b.y, 70)[0];
      if (who) act.say(who.id, pick(tip ? SAY.fallen : SAY.spin), 2.2, tip ? 2.6 : 1);
      return tip ? "nc-thud" : "nc-spin";
    }
    case "street": {
      const st = plan.streets[i];
      if (!st) return null;
      const x = Math.round(act.at.x);
      const y = Math.round(Math.max(st.y - st.half + 3, Math.min(st.y + st.half - 3, act.at.y)));
      if (Math.random() < 0.5) {
        add({ kind: "drone", t0: act.t, dur: 4.2, x, y, dir: x < act.L.W / 2 ? 1 : -1 });
        const who = act.near(x, y, 60)[0];
        if (who) act.say(who.id, pick(SAY.drone), 2.4, 1.8);
        return "nc-drone";
      }
      add({ kind: "splash", t0: act.t, dur: 2.2, x, y, dir: 1 });
      const who = act.near(x, y, 26)[0];
      if (who) act.say(who.id, pick(SAY.splash), 2, 0.2);
      return "nc-splash";
    }
  }
  return null;
}

function clickCart(c: NeonPlan["carts"][number], act: SceneryActions): string {
  const t = act.t;
  // A queue forms now and then (when there's nobody queueing already).
  if (!crowdAt("queue", c.x) && Math.random() < 0.5) {
    const spots: GatherSpot[] = [0, 1, 2].map((k) => ({ x: c.x - 7 - k * 11, y: c.y - 2, facing: "right", pose: "stand", activity: ACT.queue }));
    const g = act.gather(spots, 12, cues(SAY.queue), 1);
    if (g) {
      crowds.push({ kind: "queue", g, spots, x: c.x, y: c.y });
      add({ kind: "steam", t0: t, dur: 2.5, x: c.x + 9, y: c.y - 16, dir: 1 });
      return "nc-sizzle";
    }
  }
  const flip = Math.random() < 0.65 || !!active("steam", t, c.x + 9);
  add({ kind: flip ? "flip" : "steam", t0: t, dur: flip ? 2.6 : 3, x: c.x + 9, y: c.y - 16, dir: 1 });
  if (flip) {
    const who = act.near(c.x + 13, c.y, 70)[0];
    if (who) act.say(who.id, pick(SAY.flip), 2.4, 0.9);
  }
  return flip ? "nc-flame" : "nc-sizzle";
}

function clickBillboard(b: Bit, act: SceneryActions): string {
  const koi = !active("koi", act.t) && Math.random() < 0.55;
  if (koi) {
    const st = planOf(act.L)!.streets.find((q) => q.main) ?? planOf(act.L)!.streets[0]!;
    const dir = Math.random() < 0.5 ? 1 : -1;
    add({ kind: "koi", t0: act.t, dur: 8, x: dir > 0 ? -40 : act.L.W + 40, y: st.y - 4, dir });
    const who = act.near(b.x + 22, b.y, 120)[0];
    if (who) act.say(who.id, pick(SAY.billboard), 2.6, 1.4);
    return "nc-koi";
  }
  add({ kind: "glitch", t0: act.t, dur: 1.6, x: b.x, y: b.y, dir: 1 });
  adShift++;
  const who = act.near(b.x + 22, b.y, 100)[0];
  if (who) act.say(who.id, pick(SAY.glitch), 2.4, 1.6);
  return "nc-glitch";
}

function clickSignal(b: Bit, act: SceneryActions): string {
  const plan = planOf(act.L)!;
  const st = plan.streets.find((q) => Math.abs(q.y - q.half - 2 - b.y) < 2) ?? plan.streets[0]!;
  const ax = b.x - 13;
  add({ kind: "walk", t0: act.t, dur: 10, x: b.x, y: b.y, dir: 1 });
  if (!crowdAt("rush", ax) && Math.random() < 0.75) {
    // A little crowd on the crosswalk, as if the whole block waited for the green.
    const spots: GatherSpot[] = [0, 1, 2, 3].map((k) => ({ x: ax - 8 + k * 5, y: st.y + 3 + (k % 2) * 5, facing: k % 2 ? "front" : "back", pose: "stand", activity: ACT.rush }));
    const g = act.gather(spots, 7, cues(SAY.rush), 1);
    if (g) {
      crowds.push({ kind: "rush", g, spots, x: ax, y: st.y });
      return "nc-chirp";
    }
  }
  const who = act.near(ax, st.y, 80)[0];
  if (who) act.say(who.id, pick(SAY.button), 2.4, 0.4);
  return "nc-chirp";
}

function clickDumpster(b: Bit, act: SceneryActions): string {
  const t = act.t;
  const kind = weighted<"cat" | "rat" | "clang">([
    ["cat", active("cat", t) ? 0 : 3],
    ["rat", active("rat", t) ? 0 : 3],
    ["clang", 2],
  ]);
  add({ kind, t0: t, dur: kind === "cat" ? 3 : kind === "rat" ? 3.4 : 1.8, x: b.x, y: b.y, dir: Math.random() < 0.5 ? -1 : 1 });
  if (kind === "rat") {
    const who = act.near(b.x + 12, b.y, 90)[0];
    if (who) act.say(who.id, pick(SAY.rat), 2, 0.6);
  }
  return kind === "cat" ? "meow" : kind === "rat" ? "nc-squeak" : "nc-clang";
}

function clickAc(b: Bit, act: SceneryActions): string {
  const t = act.t;
  // A drip on whoever's walking under it.
  const under = act.near(b.x + 5, b.y + 8, 30)[0];
  if (under && Math.random() < 0.8) {
    add({ kind: "drip", t0: t, dur: 1.2, x: b.x + 5, y: b.y, dir: 1, to: { x: Math.round(under.x), y: Math.round(under.y - 27) } });
    act.say(under.id, pick(SAY.drip), 2.4, 0.7);
    return "nc-drip";
  }
  if (Math.random() < 0.5) {
    add({ kind: "drip", t0: t, dur: 1.2, x: b.x + 5, y: b.y, dir: 1, to: { x: b.x + 5, y: b.y + 14 } });
    return "nc-drip";
  }
  add({ kind: "hiss", t0: t, dur: 2.6, x: b.x, y: b.y, dir: 1 });
  return "nc-hiss";
}

function clickBooth(b: Bit, act: SceneryActions): string {
  add({ kind: "ticket", t0: act.t, dur: 2.6, x: b.x, y: b.y, dir: 1 });
  if (!crowdAt("tickets", b.x) && Math.random() < 0.45) {
    // A short line along the curb, on whichever side keeps off the panel edge and the crossings.
    const line = (left: boolean) => [0, 1, 2].map((k) => (left ? b.x - 7 - k * 11 : b.x + 22 + k * 11));
    const bad = (xs: number[]) => xs.filter((x) => x < 6 || x > act.L.W - 6 || act.L.net.aisles.some((ax) => Math.abs(ax - x) < 12)).length;
    const left = bad(line(true)) <= bad(line(false));
    const spots: GatherSpot[] = line(left).map((x) => ({ x, y: b.y, facing: left ? "right" : "left", pose: "stand", activity: ACT.tickets }));
    const g = act.gather(spots, 9, cues(SAY.tickets), 1);
    if (g) {
      crowds.push({ kind: "tickets", g, spots, x: b.x, y: b.y });
      return "nc-ticket";
    }
  }
  const who = act.near(b.x + 8, b.y, 80)[0];
  if (who) act.say(who.id, pick(SAY.ticket), 2.4, 0.8);
  return "nc-ticket";
}

function clickNoren(n: Front, act: SceneryActions): string {
  const t = act.t;
  const cx = Math.round((n.x0 + n.x1) / 2);
  if (!crowdAt("slurp", cx) && Math.random() < 0.6) {
    // Slurpers on the sidewalk under the awning, bowls in hand.
    // Out of the doorways, and clear of the carts and their queues.
    const carts = planOf(act.L)!.carts.filter((c) => Math.abs(c.y - n.y) < 30);
    const free = (x: number) =>
      x > n.x0 + 6 && x < n.x1 - 6 && !n.gaps.some((g) => Math.abs(g - x) < 9) && !carts.some((c) => x > c.x - 40 && x < c.x + 34);
    const xs: number[] = [];
    for (let d = 0; xs.length < 3 && d < n.x1 - n.x0; d += 8) {
      for (const x of d === 0 ? [cx] : [cx - d, cx + d]) if (xs.length < 3 && free(x) && xs.every((o) => Math.abs(o - x) >= 16)) xs.push(x);
    }
    xs.sort((p, q) => p - q);
    const spots: GatherSpot[] = xs.map((x) => ({ x, y: n.y - 6, facing: "front", pose: "cup", activity: ACT.slurp }));
    const g = spots.length > 0 ? act.gather(spots, 12, cues(SAY.slurp), 1) : null;
    if (g) {
      crowds.push({ kind: "slurp", g, spots, x: cx, y: n.y });
      return "nc-bell";
    }
  }
  add({ kind: "order", t0: t, dur: 3.2, x: cx + (Math.random() < 0.5 ? -14 : 14), y: n.y + 5, dir: 1 });
  const who = act.near(cx, n.y, 90)[0];
  if (who) act.say(who.id, pick(SAY.order), 2.4, 1);
  return "nc-bell";
}

// ------------------------------------------------------------------ what the live layers ask

/** The billboard: how glitched it is right now (0 … 1) and which ad is up. */
export function billboardFx(t: number): { glitch: number; ad: number } {
  const g = active("glitch", t);
  return { glitch: g ? 1 - (t - g.t0) / g.dur : 0, ad: adShift };
}

/** Whether the crosswalk signal at x is forced to WALK (someone pressed the button). */
export function signalWalk(x: number, t: number): boolean {
  return !!active("walk", t, x);
}

/** The hover-bike's whereabouts: where it hovers (dx, lift), or gone off down the street. */
export function bikeFx(t: number): { dx: number; lift: number; gone: boolean; flash: boolean } | null {
  const r = active("rev", t);
  if (r) {
    const k = t - r.t0;
    if (k < 2.2) return { dx: Math.round(Math.sin(k * 30) * (k > 1 ? 1 : 0)), lift: Math.round(Math.min(1, k / 0.6) * 5), gone: false, flash: false };
    if (k < 3.2) return { dx: Math.round(r.dir * (k - 2.2) * (k - 2.2) * 400), lift: 5, gone: false, flash: false };
    if (k < 6.8) return { dx: 0, lift: 0, gone: true, flash: false };
    const back = 1 - (k - 6.8) / 2.2;
    return { dx: Math.round(-r.dir * back * back * 260), lift: Math.round(back * 5), gone: false, flash: false };
  }
  const a = active("alarm", t);
  if (a) return { dx: Math.round(Math.sin((t - a.t0) * 40)), lift: 0, gone: false, flash: Math.floor((t - a.t0) * 6) % 2 === 0 };
  return null;
}

/** Whether the stray cat is off its dumpster (it's doing something else). */
export function strayBusy(t: number): boolean {
  return !!active("cat", t);
}

/** A cart's vendor at work (flipping), for the flame and the arm. */
function flipping(x: number, t: number): number | null {
  const f = active("flip", t, x);
  if (f) return t - f.t0;
  // Queueing customers keep the vendor busy: a flip every few seconds.
  const q = crowds.find((c) => c.kind === "queue" && !c.g.done && c.g.arrivedAt !== null && Math.abs(c.x + 9 - x) < 2);
  if (q && q.g.arrivedAt !== null) {
    const k = (t - q.g.arrivedAt) % 4;
    return k < 2.6 ? k : null;
  }
  return null;
}

// ------------------------------------------------------------------ sprites

function spr(key: string, w: number, h: number, draw: (g: Grid) => void, flip = false): HTMLCanvasElement {
  return cached(`neon|click|${key}|${flip}`, () => {
    const g = new Grid(w, h);
    draw(g);
    g.outline(OUTLINE);
    if (flip) {
      const f = new Grid(g.w, g.h);
      for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) f.set(g.w - 1 - x, y, g.get(x, y));
      return f.toCanvas();
    }
    return g.toCanvas();
  });
}

/** The street-cart vendor peeking over the counter. */
const vendor = () =>
  spr("vendor", 9, 8, (g) => {
    g.rrect(1, 1, 7, 6, "#d9a07a", 1);
    g.rect(1, 1, 7, 2, "#2a2440").rect(1, 3, 7, 1, P.red);
    g.set(3, 4, OUTLINE).set(5, 4, OUTLINE);
    g.rect(0, 7, 9, 1, "#f4f2ff");
  });

const rat = (step: boolean) =>
  spr(`rat-${step}`, 9, 4, (g) => {
    g.rect(2, 1, 5, 2, "#6a6670").rect(6, 0, 2, 2, "#6a6670").set(7, 1, OUTLINE);
    g.rect(0, 2, 2, 1, "#c89a9a");
    g.set(3, 3, "#4a4650").set(step ? 5 : 6, 3, "#4a4650");
  });

const catJump = (pose: "up" | "hiss") =>
  spr(`stray-${pose}`, 13, 9, (g) => {
    if (pose === "up") {
      g.rrect(2, 2, 8, 4, "#3a3a4a", 2).rrect(8, 0, 5, 4, "#3a3a4a", 1);
      g.set(8, 0, "#3a3a4a").set(12, 0, "#3a3a4a").set(9, 2, P.lime).set(11, 2, P.lime);
      g.rect(2, 6, 1, 3, "#3a3a4a").rect(8, 6, 1, 3, "#3a3a4a").rect(0, 1, 2, 1, "#3a3a4a");
    } else {
      g.rrect(1, 3, 9, 5, "#3a3a4a", 2).rect(3, 1, 4, 2, "#3a3a4a");
      g.rrect(8, 2, 5, 4, "#3a3a4a", 1).set(8, 1, "#3a3a4a").set(12, 1, "#3a3a4a");
      g.set(9, 3, P.lime).set(11, 3, P.lime).rect(10, 5, 2, 1, "#ff9ad6");
      g.rect(0, 2, 1, 3, "#3a3a4a");
    }
  });

const bot = (look: number) =>
  spr(`bot-${look}`, 9, 8, (g) => {
    g.rrect(1, 1, 7, 7, "#e8b83a", 2);
    g.rect(1, 1, 7, 1, "#ffd23f");
    g.rect(2, 3, 5, 2, "#1a1428");
    g.set(3 + look, 3, P.cyan).set(5 + look, 3, P.cyan);
    g.set(4, 0, "#6a6694");
    g.rect(2, 6, 5, 1, "#b88a12");
  });

const drone = () =>
  spr("drone", 13, 7, (g) => {
    g.rect(3, 2, 7, 3, "#3a3458").rect(4, 2, 5, 1, "#5a5486");
    g.rect(0, 1, 4, 1, "#6a6694").rect(9, 1, 4, 1, "#6a6694");
    g.rect(5, 5, 3, 2, "#c9a06a");
    g.set(6, 3, P.cyan);
  });

/** A giant holographic koi (drawn translucent over the street). */
const bigKoi = (frame: number, flip: boolean) =>
  spr(
    `koi-${frame}`,
    40,
    16,
    (g) => {
      const body = "#ff9a4a";
      const lo = "#d8602a";
      g.ellipse(18, 8, 13, 5, body);
      g.ellipse(27, 8, 6, 4, body);
      g.rect(9, 6, 6, 3, "#f4f2ff").rect(20, 5, 5, 2, "#f4f2ff").rect(14, 10, 4, 2, P.red);
      g.set(31, 7, OUTLINE).set(33, 9, "#ffd0a0");
      // The tail sweeps.
      const sw = frame === 0 ? -2 : frame === 1 ? 0 : 2;
      g.line(5, 8, 0, 3 + sw, lo).line(5, 8, 0, 13 + sw, lo).line(4, 8, 1, 8 + sw, body);
      g.rect(14, 2 + (frame % 2), 4, 2, lo).rect(14, 12 - (frame % 2), 4, 2, lo);
    },
    flip,
  );

// ------------------------------------------------------------------ drawing

/** Steam puffs rising from (x, y). */
function steam(ctx: Ctx, x: number, y: number, k: number, n: number, height: number, alpha = 0.55): void {
  ctx.fillStyle = "#e8e4ff";
  for (let i = 0; i < n; i++) {
    const ph = (k * 0.9 + i / n) % 1;
    ctx.globalAlpha = alpha * (1 - ph) * Math.min(1, k * 3);
    const s = 2 + Math.floor(ph * 3);
    ctx.fillRect(Math.round(x - s / 2 + Math.sin(k * 3 + i * 1.7) * (2 + ph * 4)), Math.round(y - ph * height), s, s);
  }
  ctx.globalAlpha = 1;
}

function flame(ctx: Ctx, x: number, y: number, k: number, t: number): void {
  // A burst of flame out of the wok, noodles tossed up through it.
  const up = k < 0.25 ? k / 0.25 : k < 1.4 ? 1 : Math.max(0, 1 - (k - 1.4) / 0.6);
  if (up > 0) {
    const h = Math.round(4 + up * 12 + (Math.floor(t * 14) % 2) * 2);
    ctx.fillStyle = "#ff5a2a";
    ctx.fillRect(x - 3, y - h, 7, h);
    ctx.fillStyle = "#ffb03a";
    ctx.fillRect(x - 2, y - h + 2, 5, h - 2);
    ctx.fillStyle = "#fff0a0";
    ctx.fillRect(x - 1, y - Math.round(h * 0.6), 3, Math.round(h * 0.6));
  }
  const toss = k - 0.3;
  if (toss > 0 && toss < 1.4) {
    const p = toss / 1.4;
    const ny = Math.round(y - 4 - Math.sin(p * Math.PI) * 18);
    ctx.fillStyle = "#f0d090";
    for (let s = 0; s < 4; s++) ctx.fillRect(x - 3 + s * 2, ny + (s % 2), 1, 4 - (s % 2));
  }
}

/** A sandwich board mid-spin or knocked flat; false when it's just standing there. */
export function drawAframe(ctx: Ctx, sprite: HTMLCanvasElement, x: number, base: number, t: number): boolean {
  if (forL === null) return false;
  const f = active("spin", t, x) ?? active("tip", t, x);
  if (!f) return false;
  const k = t - f.t0;
  const w = sprite.width;
  if (f.kind === "spin") {
    // Two turns, slowing down; the back is plain.
    const turn = Math.cos((1 - (1 - k / f.dur) ** 2) * Math.PI * 4);
    const ww = Math.max(2, Math.round(Math.abs(turn) * w));
    const left = Math.round(x + w / 2 - ww / 2);
    if (turn > 0) ctx.drawImage(sprite, 0, 0, w, 14, left, base - 13, ww, 14);
    else {
      ctx.fillStyle = OUTLINE;
      ctx.fillRect(left, base - 13, ww, 12);
      ctx.fillStyle = "#2a2444";
      ctx.fillRect(left + 1, base - 12, Math.max(1, ww - 2), 10);
    }
    return true;
  }
  // Tipped: a wobble, flat on its back for a bit, then someone stands it up again.
  if (k < 0.3 || k > f.dur - 0.25) {
    ctx.drawImage(sprite, x + (k < 0.3 ? Math.round(Math.sin(k * 40)) : 0), base - 13);
    return true;
  }
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(x, base - 5, w, 5);
  ctx.fillStyle = "#2a2444";
  ctx.fillRect(x + 1, base - 4, w - 2, 3);
  ctx.fillStyle = "#4c4670";
  ctx.fillRect(x + 2, base - 4, w - 4, 1);
  if (k < 0.7) {
    ctx.globalAlpha = 0.5 * (1 - (k - 0.3) / 0.4);
    ctx.fillStyle = "#c8c4e8";
    ctx.fillRect(x - 2, base - 3, 3, 2);
    ctx.fillRect(x + w - 1, base - 3, 3, 2);
    ctx.globalAlpha = 1;
  }
  return true;
}

/** Things on the street, sorted with people (decor). */
export function clickItems(ctx: Ctx, L: Layout, info: PaintInfo): Drawable[] {
  const plan = planOf(L);
  if (!plan) return [];
  const t = info.t;
  const out: Drawable[] = [];
  // The vendors are always at their carts.
  for (const c of plan.carts) {
    const fl = L === forL ? flipping(c.x + 9, t) : null;
    out.push({
      z: c.y - 0.5,
      draw: () => {
        const bob = fl !== null ? -1 : Math.round(Math.sin(t * 1.3 + c.x) * 0.5);
        ctx.drawImage(vendor(), c.x + 17, c.y - 16 + bob);
      },
    });
    if (fl !== null) out.push({ z: c.y + 0.4, draw: () => flame(ctx, c.x + 9, c.y - 13, fl, t) });
  }
  if (L !== forL) return out;
  if (fx.length > 0 && t - fx[0]!.t0 > fx[0]!.dur) fx = fx.filter((f) => t - f.t0 <= f.dur);
  for (const f of fx) {
    const k = t - f.t0;
    if (k < 0 || k > f.dur) continue;
    const item = fxItem(ctx, f, k, t);
    if (item) out.push(item);
  }
  // Bowls for the slurpers.
  for (const c of crowds) {
    if (c.kind !== "slurp" || c.g.done || c.g.arrivedAt === null) continue;
    const k = t - c.g.arrivedAt;
    for (let i = 0; i < c.g.size; i++) {
      if (!c.g.present[i]) continue;
      const sp = c.spots[i]!;
      out.push({
        z: sp.y + 0.7,
        draw: () => {
          ctx.fillStyle = OUTLINE;
          ctx.fillRect(sp.x - 1, sp.y - 13, 7, 4);
          ctx.fillStyle = "#f4f2ff";
          ctx.fillRect(sp.x, sp.y - 12, 5, 2);
          ctx.fillStyle = "#e0a050";
          ctx.fillRect(sp.x, sp.y - 12, 5, 1);
          steam(ctx, sp.x + 2, sp.y - 13, k + i * 0.3, 3, 8, 0.4);
        },
      });
    }
  }
  return out;
}

function fxItem(ctx: Ctx, f: Fx, k: number, t: number): Drawable | null {
  switch (f.kind) {
    case "flip":
      return null;
    case "steam":
      return { z: f.y + 17, draw: () => steam(ctx, f.x, f.y, k, 6, 22, 0.6 * Math.min(1, (f.dur - k) / 0.6)) };
    case "cat": {
      // Out it pops, hisses on the lid, and settles back down.
      const up = k < 0.5 ? Math.sin((k / 0.5) * Math.PI) * 10 : 0;
      const pose = k < 0.5 ? "up" : "hiss";
      return { z: f.y + 0.2, draw: () => ctx.drawImage(catJump(k > 2.6 ? "up" : pose), f.x + 6, Math.round(f.y - 23 - up)) };
    }
    case "rat": {
      const x = f.x + 12 + f.dir * k * 46;
      return { z: f.y + 1, draw: () => ctx.drawImage(rat(Math.floor(t * 12) % 2 === 0), Math.round(x), f.y - 3) };
    }
    case "clang": {
      // The lid bangs up, and a bit of trash flies out.
      const lid = k < 0.8 ? Math.round(Math.sin((k / 0.8) * Math.PI) * 6) : 0;
      return {
        z: f.y + 0.3,
        draw: () => {
          ctx.fillStyle = "#3f7a62";
          ctx.fillRect(f.x + 1, f.y - 16 - lid, 22, 2);
          ctx.fillStyle = OUTLINE;
          ctx.fillRect(f.x + 1, f.y - 17 - lid, 22, 1);
          for (let i = 0; i < 4; i++) {
            const p = Math.min(1, k / 1.2);
            ctx.fillStyle = ["#e8e4ff", "#c9a06a", "#7a80a4", "#ff9ad6"][i]!;
            ctx.fillRect(Math.round(f.x + 12 + (i - 1.5) * 8 * p), Math.round(f.y - 16 - Math.sin(p * Math.PI) * (8 + i * 2) + p * 14), 2, 2);
          }
        },
      };
    }
    case "rev":
    case "alarm":
      return null;
    case "drip": {
      const to = f.to!;
      const p = Math.min(1, k / 0.5);
      return {
        z: Math.max(f.y, to.y + 27) + 1,
        draw: () => {
          ctx.fillStyle = "#9fd8ff";
          if (p < 1) ctx.fillRect(Math.round(f.x + (to.x - f.x) * p), Math.round(f.y + (to.y - f.y) * p * p), 1, 2);
          else {
            const s = Math.round((k - 0.5) * 8);
            ctx.globalAlpha = Math.max(0, 1 - (k - 0.5) / 0.7);
            ctx.fillRect(to.x - s, to.y, 1, 1);
            ctx.fillRect(to.x + s, to.y, 1, 1);
            ctx.fillRect(to.x, to.y - 1, 1, 1);
            ctx.globalAlpha = 1;
          }
        },
      };
    }
    case "hiss":
      return { z: f.y + 1, draw: () => steam(ctx, f.x + 6, f.y, k, 5, 14, 0.5 * Math.min(1, (f.dur - k) / 0.5)) };
    case "burst":
      return {
        z: f.y + 4,
        draw: () => {
          const fade = Math.min(1, (f.dur - k) / 0.8);
          steam(ctx, f.x, f.y, k * 1.4, 10, 34, 0.65 * fade);
          // The lid hops.
          if (k < 0.5) {
            ctx.fillStyle = OUTLINE;
            ctx.fillRect(f.x - 6, f.y - 3 - Math.round(Math.sin((k / 0.5) * Math.PI) * 4), 12, 3);
          }
        },
      };
    case "bot": {
      // A maintenance bot pops its head out, looks both ways and ducks back.
      const rise = k < 0.6 ? k / 0.6 : k > 3.6 ? Math.max(0, 1 - (k - 3.6) / 0.6) : 1;
      const look = k < 1.2 ? 0 : Math.floor((k - 1.2) / 0.8) % 2 === 0 ? -1 : 1;
      const h = Math.round(rise * 7);
      return {
        z: f.y + 1,
        draw: () => {
          if (h <= 0) return;
          ctx.save();
          ctx.beginPath();
          ctx.rect(f.x - 6, f.y - 12, 12, 12);
          ctx.clip();
          ctx.drawImage(bot(look), f.x - 4, f.y - 2 - h);
          ctx.restore();
          if (rise >= 1 && Math.floor(t * 3) % 2 === 0) {
            ctx.fillStyle = P.red;
            ctx.fillRect(f.x, f.y - 11, 1, 1);
          }
        },
      };
    }
    case "ticket": {
      // A paper ticket feeds out of the slot, then gets torn off.
      const len = Math.min(6, Math.round(k * 5));
      if (k > 2.2) return null;
      return {
        z: f.y + 0.3,
        draw: () => {
          ctx.fillStyle = OUTLINE;
          ctx.fillRect(f.x + 5, f.y - 6, 6, len + 1);
          ctx.fillStyle = "#f4e8d8";
          ctx.fillRect(f.x + 6, f.y - 6, 4, len);
          ctx.fillStyle = P.mag;
          if (len > 3) ctx.fillRect(f.x + 6, f.y - 3, 4, 1);
          // The doorman's visor flashes while he prints.
          ctx.fillStyle = Math.floor(t * 8) % 2 ? P.cyanHi : P.mag;
          ctx.fillRect(f.x + 6, f.y - 15, 4, 1);
        },
      };
    }
    case "order": {
      // The chef pushes through the noren with a steaming bowl.
      const out = k < 0.4 ? k / 0.4 : k > 2.7 ? Math.max(0, 1 - (k - 2.7) / 0.5) : 1;
      return {
        z: f.y + 8,
        draw: () => {
          ctx.globalAlpha = out;
          ctx.drawImage(vendor(), f.x - 4, f.y - 2);
          ctx.fillStyle = OUTLINE;
          ctx.fillRect(f.x - 4, f.y + 6, 8, 4);
          ctx.fillStyle = "#f4f2ff";
          ctx.fillRect(f.x - 3, f.y + 7, 6, 2);
          ctx.fillStyle = "#e0a050";
          ctx.fillRect(f.x - 3, f.y + 7, 6, 1);
          ctx.globalAlpha = 1;
          steam(ctx, f.x, f.y + 6, k, 4, 12, 0.5 * out);
        },
      };
    }
    case "splash":
      return {
        z: f.y - 0.5,
        draw: () => {
          // Rings of neon spreading on the wet street, and a few drops.
          for (let r = 0; r < 3; r++) {
            const p = (k - r * 0.25) / 1.6;
            if (p <= 0 || p >= 1) continue;
            const rx = 3 + p * 16;
            const ry = 1 + p * 4;
            ctx.globalAlpha = 0.7 * (1 - p);
            ctx.fillStyle = r % 2 ? P.mag : P.cyan;
            for (let a = 0; a < Math.PI * 2; a += 0.2) ctx.fillRect(Math.round(f.x + Math.cos(a) * rx), Math.round(f.y + Math.sin(a) * ry), 1, 1);
          }
          ctx.globalAlpha = 1;
          if (k < 0.6) {
            ctx.fillStyle = "#c2fcff";
            for (let i = 0; i < 5; i++) {
              const p = k / 0.6;
              ctx.fillRect(Math.round(f.x + (i - 2) * 3 * p), Math.round(f.y - Math.sin(p * Math.PI) * (4 + (i % 3) * 2)), 1, 1);
            }
          }
        },
      };
    default:
      return null;
  }
}

/** Overhead: the drone and the giant koi fly over everyone. */
export function clickOverlay(ctx: Ctx, L: Layout, info: PaintInfo): void {
  if (L !== forL || fx.length === 0) return;
  const t = info.t;
  for (const f of fx) {
    const k = t - f.t0;
    if (k < 0 || k > f.dur) continue;
    if (f.kind === "drone") {
      // Swoops in from high up, hovers over the spot, drops a parcel, zooms off.
      const p = k < 1.4 ? k / 1.4 : k < 2.4 ? 1 : 1 + (k - 2.4) / 1.8;
      const x = Math.round(f.x - f.dir * (1 - Math.min(1, p)) * 90 + f.dir * Math.max(0, p - 1) * 140);
      const y = Math.round(f.y - 34 + (p < 1 ? -(1 - p) * 40 : p > 1 ? -(p - 1) * 30 : Math.sin(t * 4)));
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fillRect(x - 4, f.y, 9, 2);
      ctx.drawImage(drone(), x - 6, y);
      ctx.fillStyle = Math.floor(t * 20) % 2 ? "#e8e4ff" : "#9a98c8";
      ctx.fillRect(x - 6, y, 4, 1);
      ctx.fillRect(x + 3, y, 4, 1);
      ctx.fillStyle = Math.floor(t * 4) % 2 ? P.red : P.lime;
      ctx.fillRect(x, y + 3, 1, 1);
      // The parcel drops at 1.8 s and lands.
      if (k > 1.8) {
        const d = Math.min(1, (k - 1.8) / 0.5);
        ctx.fillStyle = OUTLINE;
        ctx.fillRect(f.x - 3, Math.round(y + 7 + (f.y - y - 10) * d) - 1, 7, 5);
        ctx.fillStyle = "#c9a06a";
        ctx.fillRect(f.x - 2, Math.round(y + 7 + (f.y - y - 10) * d), 5, 3);
      }
    } else if (f.kind === "koi") {
      const x = f.x + f.dir * k * ((L.W + 80) / f.dur);
      const y = f.y + Math.round(Math.sin(k * 1.8) * 4);
      ctx.globalAlpha = 0.62 * Math.min(1, k / 0.6, (f.dur - k) / 0.6);
      ctx.drawImage(bigKoi(Math.floor(t * 5) % 3, f.dir < 0), Math.round(x - 20), y - 8);
      ctx.globalAlpha *= 0.5;
      ctx.fillStyle = P.cyanHi;
      for (let i = 0; i < 5; i++) ctx.fillRect(Math.round(x - f.dir * (24 + i * 7)), y + Math.round(Math.sin(k * 3 + i) * 3), 2, 1);
      ctx.globalAlpha = 1;
    } else if (f.kind === "walk" && k < 0.6) {
      ctx.fillStyle = `rgba(125,255,106,${0.35 * (1 - k / 0.6)})`;
      ctx.fillRect(f.x - 5, f.y - 29, 11, 11);
    }
  }
}

/** The bike, wherever it is now, and its trail (called by the city's own bike drawing). */
export function drawBikeTrail(ctx: Ctx, x: number, base: number, t: number): void {
  const b = bikeFx(t);
  if (!b || b.gone) return;
  if (b.lift > 0) {
    // Thrusters under it, and a long neon streak behind when it's moving fast.
    ctx.fillStyle = P.cyan;
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 30);
    ctx.fillRect(x + b.dx + 5, base - 1 - Math.round(b.lift / 2), 4, 1);
    ctx.fillRect(x + b.dx + 15, base - 1 - Math.round(b.lift / 2), 4, 1);
    if (Math.abs(b.dx) > 4) {
      const dir = b.dx > 0 ? -1 : 1;
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = P.mag;
      ctx.fillRect(x + b.dx + (dir < 0 ? -30 : 26), base - 6 - b.lift, 30, 1);
      ctx.fillStyle = P.cyan;
      ctx.fillRect(x + b.dx + (dir < 0 ? -22 : 26), base - 4 - b.lift, 22, 1);
    }
    ctx.globalAlpha = 1;
  }
}

export function clickLights(L: Layout, info: PaintInfo): Light[] {
  const out: Light[] = [];
  const plan = planOf(L);
  if (!plan || L !== forL) return out;
  const t = info.t;
  for (const c of plan.carts) if (flipping(c.x + 9, t) !== null) out.push([c.x + 9, c.y - 22, 30, 0.9, "#ff8a3a", 0.35]);
  for (const f of fx) {
    const k = t - f.t0;
    if (k < 0 || k > f.dur) continue;
    if (f.kind === "koi") out.push([f.x + f.dir * k * ((L.W + 80) / f.dur), f.y, 40, 0.7, "#ff9a4a", 0.25]);
    if (f.kind === "drone") out.push([f.x, f.y - 20, 18, 0.6, P.lime, 0.12]);
    if (f.kind === "walk") out.push([f.x, f.y - 24, 16, 0.9, P.lime, 0.3]);
    if (f.kind === "bot") out.push([f.x, f.y - 6, 12, 0.7, P.yel, 0.2]);
  }
  const bike = bitsOf(L, "bike")[0];
  const b = bike ? bikeFx(t) : null;
  if (bike && b && !b.gone) out.push([bike.x + 13 + b.dx, bike.y - 4, b.flash ? 30 : 20, 0.8, b.flash ? P.red : P.mag, b.flash ? 0.35 : 0.25]);
  return out;
}

