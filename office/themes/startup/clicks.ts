// Startup House: things to click. The grill (a cookout, or a flare-up), the
// pool (a cannonball, a pizza-slice float, feet in the water), the hammock
// (a lazy swing, or it flips), the garage door (it rolls up for a demo-day
// rehearsal, or gets stuck), the energy-drink pyramid on the kitchen table
// (it collapses; someone rebuilds it taller), game night at the coffee table,
// and the bunk bed (someone's been living up there).
//
// Clicks only start things; everything is drawn from the live layers
// (underlay, decor, overlay, lights) by the animation clock.

import type { Drawable, GatherCue, GatherSpot, Gathering, Light, PaintInfo, SceneryActions, SceneryClickable } from "../../theme.ts";
import type { Layout, Point, Rect } from "../../layout.ts";
import { C, CANS, fill, sprite } from "./kit.ts";
import { planOf } from "./plan.ts";
import { CLICK_LINES as W, type ClickLine } from "./words.ts";

type Ctx = CanvasRenderingContext2D;

const pick = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)]!;

function weighted<T extends string>(options: [T, number][]): T {
  let roll = Math.random() * options.reduce((n, [, w]) => n + w, 0);
  for (const [o, w] of options) {
    roll -= w;
    if (roll <= 0) return o;
  }
  return options[0]![0];
}

// ------------------------------------------------------------------ what's going on

let forL: Layout | null = null;
let grill: { kind: "cookout" | "flare" | "smoke"; t0: number; g?: Gathering } | null = null;
let splash: { t0: number; x: number; y: number } | null = null;
let float: { t0: number } | null = null;
let dip: { t0: number; g: Gathering } | null = null;
let hammock: { kind: "swing" | "flip"; t0: number } | null = null;
let garage: { kind: "rehearsal" | "open" | "stuck"; t0: number; g?: Gathering } | null = null;
let fall: { t0: number; restack?: Gathering } | null = null;
let games: { t0: number; g: Gathering } | null = null;
let bunk: { kind: "snore" | "lights"; t0: number } | null = null;

function bind(L: Layout): void {
  if (L === forL) return;
  forL = L;
  grill = null;
  splash = null;
  float = null;
  dip = null;
  hammock = null;
  garage = null;
  fall = null;
  games = null;
  bunk = null;
}

// ------------------------------------------------------------------ where things are (pure geometry)

function coffeeTableOf(L: Layout): Rect | null {
  const p = L.props.find((q) => q.kind === "coffee-table");
  return p ? { x: p.x, y: p.y, w: 38, h: 14 } : null;
}

/**
 * Where the energy-drink pyramid stands: on the kitchen table, or (a galley
 * kitchen has none) on top of the drinks fridge. Its base, its depth, and the
 * floor the cans land on when it comes down.
 */
export function pyramidAt(L: Layout): { x: number; y: number; z: number; floor: number } | null {
  const isl = L.props.find((p) => p.id === "island");
  if (isl) return { x: isl.x + 4, y: isl.y + 1, z: isl.y + 20.6, floor: isl.y + 40 };
  const v = L.props.find((p) => p.kind === "vending");
  return v ? { x: v.x + 5, y: v.y + 1, z: v.y + 42.6, floor: v.y + 52 } : null;
}

function pyramidRect(L: Layout): Rect | null {
  const p = pyramidAt(L);
  return p ? { x: p.x - 1, y: p.y - 15, w: 15, h: 19 } : null;
}

function hammockRect(L: Layout): Rect | null {
  const hm = planOf(L)?.yard?.hammock;
  return hm ? { x: hm.x - 2, y: hm.y - 20, w: hm.w + 4, h: 22 } : null;
}

export function startupClickables(L: Layout): SceneryClickable[] {
  if (L !== forL) bind(L);
  const plan = planOf(L);
  const out: SceneryClickable[] = [];
  const y = plan?.yard;
  if (y?.grill) out.push({ id: "grill", rect: { x: y.grill.x - 10, y: y.grill.y - 24, w: 24, h: 26 }, hover: W.hover.grill });
  if (y) out.push({ id: "pool", rect: y.pool, hover: W.hover.pool });
  const hr = hammockRect(L);
  if (hr) out.push({ id: "hammock", rect: hr, hover: W.hover.hammock });
  const door = plan?.garage?.door;
  // The door in the side wall and the end of the driveway in front of it.
  if (door) out.push({ id: "garage", rect: { x: Math.max(0, door.x - 14), y: door.y, w: door.x - Math.max(0, door.x - 14) + door.w, h: door.h }, hover: W.hover.garage });
  const pr = pyramidRect(L);
  if (pr) out.push({ id: "pyramid", rect: pr, hover: W.hover.pyramid });
  const ct = coffeeTableOf(L);
  if (ct) out.push({ id: "console", rect: ct, hover: W.hover.console });
  if (plan?.bunk) out.push({ id: "bunk", rect: plan.bunk, hover: W.hover.bunk });
  return out;
}

export function click(id: string, act: SceneryActions): string | null {
  bind(act.L);
  switch (id) {
    case "grill":
      return clickGrill(act);
    case "pool":
      return clickPool(act);
    case "hammock":
      return clickHammock(act);
    case "garage":
      return clickGarage(act);
    case "pyramid":
      return clickPyramid(act);
    case "console":
      return clickConsole(act);
    case "bunk":
      return clickBunk(act);
    default:
      return null;
  }
}

/** Whoever's closest says one of these (after a beat). */
function mutter(act: SceneryActions, x: number, y: number, lines: readonly string[], delay = 0.6, r = 90): void {
  const who = act.near(x, y, r)[0];
  if (who) act.say(who.id, pick(lines), 2.8, delay);
}

function cues(list: readonly ClickLine[]): GatherCue[] {
  return list
    .filter(([, , say, sound]) => say || sound)
    .map(([at, who, say, sound]) => ({ at, who: who >= 0 ? who : undefined, say: say || undefined, seconds: say.length > 22 ? 3.6 : 2.6, sound }));
}

/**
 * A path into the yard: on the lawn left of the pool, straight in from the side path nearest it;
 * elsewhere down the aisle to a lane below the pool, across, up to the spot.
 */
function yardPath(L: Layout, x: number, y: number): Point[] {
  const yd = planOf(L)!.yard!;
  const { hallY, aisleX } = yd.access;
  const side = L.net.aisles.find((a) => a >= yd.r.x - 1 && a < yd.pool.x - 10);
  if (side !== undefined && x < yd.pool.x - 4) return [{ x: side, y: hallY, c: true }, { x: side, y }, { x, y }];
  const lane = yd.pool.y + yd.pool.h + 9;
  return [{ x: aisleX, y: hallY, c: true }, { x: aisleX, y: lane }, { x, y: lane }, { x, y }];
}

function clickGrill(act: SceneryActions): string | null {
  const g0 = planOf(act.L)?.yard?.grill;
  if (!g0) return null;
  const busy = grill?.g && !grill.g.done;
  if (!busy && Math.random() < 0.65) {
    // A cookout: someone on the tongs, a line with paper plates.
    const base: Omit<GatherSpot, "path">[] = [
      { x: g0.x, y: g0.y - 6, facing: "front", pose: "stand", activity: "manning the grill" },
      { x: g0.x + 24, y: g0.y + 2, facing: "left", pose: "cup", activity: "waiting for a burger" },
      { x: g0.x + 36, y: g0.y + 11, facing: "left", pose: "cup", activity: "waiting for a burger" },
      { x: g0.x + 16, y: g0.y + 19, facing: "back", pose: "cup", activity: "waiting for a burger" },
    ];
    const spots: GatherSpot[] = base.map((s) => ({ ...s, path: yardPath(act.L, s.x, s.y) }));
    const g = act.gather(spots, 16, cues(W.cookout), 2);
    if (g) {
      grill = { kind: "cookout", t0: act.t, g };
      return "su-sizzle";
    }
  }
  const kind = Math.random() < 0.6 ? "flare" : "smoke";
  grill = { kind, t0: act.t };
  mutter(act, g0.x, g0.y, kind === "flare" ? W.flare : W.smoke, kind === "flare" ? 0.4 : 1, 120);
  return kind === "flare" ? "su-whoosh" : "su-sizzle";
}

function clickPool(act: SceneryActions): string | null {
  const yd = planOf(act.L)?.yard;
  if (!yd) return null;
  const p = yd.pool;
  const busy = dip && !dip.g.done;
  const kind = weighted<"cannonball" | "float" | "dip">(busy ? [["cannonball", 2], ["float", 1]] : [["cannonball", 3], ["float", 2], ["dip", 2]]);
  if (kind === "dip") {
    // Feet in the water along the near edge.
    const y = p.y + p.h + 3;
    const n = Math.max(1, Math.min(3, Math.floor((p.w - 10) / 18)));
    const spots: GatherSpot[] = Array.from({ length: n }, (_, k) => {
      const x = p.x + 10 + k * 18;
      return { x, y, facing: "back" as const, pose: "sit-back" as const, activity: "dangling feet in the pool", path: yardPath(act.L, x, y) };
    });
    const g = act.gather(spots, 14, cues(W.dip));
    if (g) {
      dip = { t0: act.t, g };
      return "su-float";
    }
  }
  if (kind === "float") {
    float = { t0: act.t };
    mutter(act, p.x + p.w / 2, p.y + p.h, W.float, 1, 130);
    return "su-float";
  }
  // A cannonball where you clicked.
  splash = { t0: act.t, x: Math.max(p.x + 6, Math.min(p.x + p.w - 6, act.at.x)), y: Math.max(p.y + 6, Math.min(p.y + p.h - 4, act.at.y)) };
  mutter(act, p.x + p.w / 2, p.y + p.h, W.cannonball, 0.8, 140);
  return "su-splash";
}

function clickHammock(act: SceneryActions): string | null {
  const hm = planOf(act.L)?.yard?.hammock;
  if (!hm) return null;
  const kind = Math.random() < 0.65 ? "swing" : "flip";
  hammock = { kind, t0: act.t };
  // Whoever's napping in it has something to say about that.
  const who = act.near(hm.x + hm.w / 2, hm.y, 8)[0];
  if (who) act.say(who.id, pick(kind === "swing" ? W.swingNapper : W.flipNapper), 2.8, kind === "flip" ? 0.6 : 0.4);
  else mutter(act, hm.x + hm.w / 2, hm.y, kind === "swing" ? W.swing : W.flip, 0.8, 110);
  return kind === "swing" ? "su-creak" : "su-thud";
}

function clickGarage(act: SceneryActions): string | null {
  const gp = planOf(act.L)?.garage;
  if (!gp?.door || !gp.access) return null;
  const busy = garage?.g && !garage.g.done;
  if (!busy && Math.random() < 0.6) {
    // Demo-day rehearsal: the door rolls up for the light, one pitches, the rest poke holes.
    const spots = rehearsalSpots(act.L);
    const g = act.gather(spots, 18, cues(W.rehearsal), 2);
    if (g) {
      garage = { kind: "rehearsal", t0: act.t, g };
      return "su-garage";
    }
  }
  const kind = Math.random() < 0.6 ? "open" : "stuck";
  garage = { kind, t0: act.t };
  mutter(act, gp.door.x + 40, gp.door.y + gp.door.h / 2, kind === "open" ? W.garageOpen : W.garageStuck, 1.2, 130);
  return "su-garage";
}

/** Where the demo-day rehearsal stands in the garage: the one pitching on the left, the skeptics facing them. */
export function rehearsalSpots(L: Layout): GatherSpot[] {
  const gp = planOf(L)?.garage;
  if (!gp?.door || !gp.access) return [];
  const top = gp.r.y;
  const x0 = gp.r.x + 2;
  const way = gp.access;
  const at = (x: number, y: number, facing: GatherSpot["facing"], pose: GatherSpot["pose"], activity: string): GatherSpot => ({
    x,
    y,
    facing,
    pose,
    activity,
    path: [{ x: way.x, y: way.hallY, c: true }, { x: way.x, y }, { x, y }],
  });
  return [
    at(x0 + 30, top + 30, "right", "throw", "rehearsing the demo-day pitch"),
    at(x0 + 60, top + 24, "left", "stand", "poking holes in the pitch"),
    at(x0 + 78, top + 32, "left", "stand", "poking holes in the pitch"),
    at(x0 + 62, top + 42, "left", "cup", "poking holes in the pitch"),
  ];
}

function clickPyramid(act: SceneryActions): string | null {
  const r = pyramidRect(act.L);
  if (!r) return null;
  if (fall) return "su-clatter";
  // Down it comes; whoever's free walks over and stacks it up again, taller.
  const coffee = act.L.byId.get("coffee");
  const k = act.L.kitchen;
  let g: Gathering | null = null;
  if (coffee) {
    const y = Math.max(k.y + 32, pyramidAt(act.L)!.floor - 16);
    const x = r.x + 6;
    g = act.gather([{ x, y, facing: "front", pose: "stand", activity: "rebuilding the can pyramid", path: [coffee.path[0]!, { x: coffee.path[1]!.x, y }, { x, y }] }], 7, cues(W.restack));
  }
  fall = { t0: act.t, restack: g ?? undefined };
  if (!g) mutter(act, r.x + 6, r.y + 20, W.collapse, 0.9, 120);
  return "su-clatter";
}

/** The pyramid is lying on the floor (until someone stacks it up again). */
export function pyramidDown(L: Layout, t: number): boolean {
  if (L !== forL || !fall) return false;
  const g = fall.restack;
  if (g && g.arrivedAt !== null) return t - g.arrivedAt < 4;
  if (g && !g.done) return true;
  return t - fall.t0 < 26;
}

function clickConsole(act: SceneryActions): string | null {
  const L = act.L;
  const c = L.couch;
  const seat = L.byId.get("couch-1");
  if (!seat) return null;
  if (games && !games.g.done) {
    mutter(act, c.x + c.w / 2, c.y, W.gameBusy, 0.3, 120);
    return "su-game";
  }
  // Game night: two on the floor by the coffee table, two standing behind the couch.
  const [h0, a0] = seat.path;
  const lane = c.y - 8;
  const behind = c.y + 34;
  const via = (x: number, y: number, laneY: number): Point[] => [h0!, { x: a0!.x, y: laneY }, { x, y: laneY }, { x, y }];
  const spots: GatherSpot[] = [
    { x: c.x + 12, y: c.y - 9, facing: "back", pose: "sit-back", activity: "gaming instead of shipping", path: via(c.x + 12, c.y - 9, lane) },
    { x: c.x + 70, y: c.y - 9, facing: "back", pose: "sit-back", activity: "gaming instead of shipping", path: via(c.x + 70, c.y - 9, lane) },
    { x: c.x - 6, y: c.y + 26, facing: "back", pose: "stand", activity: "waiting for next game", path: via(c.x - 6, c.y + 26, behind) },
    { x: c.x + c.w + 6, y: c.y + 26, facing: "back", pose: "stand", activity: "waiting for next game", path: via(c.x + c.w + 6, c.y + 26, behind) },
  ];
  const g = act.gather(spots, 16, cues(W.gameNight), 2);
  if (g) {
    games = { t0: act.t, g };
    return "su-game";
  }
  mutter(act, c.x + c.w / 2, c.y, W.gameBusy, 0.3, 120);
  return "su-game";
}

function clickBunk(act: SceneryActions): string | null {
  const b = planOf(act.L)?.bunk;
  if (!b) return null;
  const kind = Math.random() < 0.6 ? "snore" : "lights";
  bunk = { kind, t0: act.t };
  mutter(act, b.x + b.w / 2, b.y + b.h, kind === "snore" ? W.snore : W.bunkLights, 1.4, 120);
  return kind === "snore" ? "su-snore" : "su-twinkle";
}

// ------------------------------------------------------------------ sprites

const canSprite = (c: string, lying: boolean) =>
  sprite(`can-${c}-${lying}`, lying ? 5 : 4, lying ? 4 : 5, (g) => {
    if (lying) {
      g.rect(0, 1, 4, 3, c);
      g.rect(0, 1, 1, 3, "#e6e9ee");
      g.rect(1, 1, 3, 1, "#ffffff");
    } else {
      g.rect(0, 0, 3, 4, c);
      g.rect(0, 0, 3, 1, "#e6e9ee");
    }
  }, false);

const pizzaFloat = () =>
  sprite("float", 18, 14, (g) => {
    // A pizza-slice pool float.
    for (let y = 1; y < 13; y++) {
      const half = Math.round((y / 12) * 8);
      g.rect(9 - half, y, half * 2, 1, "#f2c14e");
    }
    g.rect(1, 12, 16, 2, "#d8903a");
    g.rect(5, 6, 2, 2, "#d8483a").rect(10, 8, 2, 2, "#d8483a").rect(8, 4, 2, 1, "#d8483a").rect(12, 11, 2, 1, "#d8483a");
    g.set(9, 1, "#fff3a0");
  });

// ------------------------------------------------------------------ drawing

/** On the floor and the water: the float, the splash's wet patch, the cans rolling, sunlight through the garage door. */
export function clickUnderlay(ctx: Ctx, L: Layout, info: PaintInfo): void {
  if (L !== forL) return;
  const t = info.t;
  const plan = planOf(L);
  const pool = plan?.yard?.pool;
  if (pool && float) {
    const k = t - float.t0;
    if (k > 40) float = null;
    else {
      // It drifts lazily from one end to the other and turns a little.
      const q = (Math.sin(k * 0.12 - Math.PI / 2) + 1) / 2;
      const fx = pool.x + 2 + q * (pool.w - 20);
      const fy = pool.y + 4 + (pool.h - 18) * (0.5 + 0.4 * Math.sin(k * 0.21));
      ctx.globalAlpha = Math.min(1, k * 2, (40 - k) / 2);
      ctx.drawImage(pizzaFloat(), Math.round(fx), Math.round(fy + Math.sin(t * 2) * 0.6));
      ctx.globalAlpha = 1;
    }
  }
  if (pool && splash) {
    const k = t - splash.t0;
    if (k > 12) splash = null;
    else if (k > 0.3) {
      // Water slopped over the coping.
      ctx.fillStyle = `rgba(60,90,110,${(0.3 * Math.min(1, (12 - k) / 4)).toFixed(2)})`;
      ctx.fillRect(splash.x - 10, pool.y + pool.h, 20, 4);
      ctx.fillRect(splash.x - 6, pool.y + pool.h + 4, 12, 3);
    }
  }
  const door = plan?.garage?.door;
  if (door && garage) {
    const k = t - garage.t0;
    const open = garageOpen(k, garage);
    if (open > 0) {
      // The door rolls up: daylight spills in across the concrete from the driveway.
      const night = info.night;
      ctx.fillStyle = night > 0.5 ? `rgba(255,220,150,${(0.12 * open).toFixed(3)})` : `rgba(255,248,210,${(0.32 * open).toFixed(3)})`;
      const depth = Math.round(70 * open);
      const x = door.x + door.w;
      ctx.beginPath();
      ctx.moveTo(x, door.y);
      ctx.lineTo(x, door.y + door.h);
      ctx.lineTo(x + depth, door.y + door.h - 10);
      ctx.lineTo(x + depth, door.y + 10);
      ctx.closePath();
      ctx.fill();
      // The opening where the door was, rolled up from the top.
      const gone = Math.round(door.h * open);
      fill(ctx, door.x, door.y, door.w, gone, night > 0.5 ? "#3a3a44" : "#d8d4cc");
      fill(ctx, door.x, door.y + gone - 1, door.w, 1, "#8a8a90");
    }
  }
  if (fall) {
    const r = pyramidRect(L);
    if (r) {
      // Cans on the floor in front of it, rolling to a stop.
      const k = t - fall.t0;
      const floorY = pyramidAt(L)!.floor;
      for (let i = 0; i < 10; i++) {
        const k0 = Math.max(0, k - i * 0.05);
        const roll = Math.min(1, k0 / 1.6);
        const dir = i % 2 ? 1 : -1;
        const dist = 6 + ((i * 7) % 19);
        const x = r.x + 6 + dir * dist * (1 - (1 - roll) * (1 - roll)) + (i % 3) * 3;
        const y = floorY + ((i * 5) % 9) * roll;
        if (k0 < 0.35) continue;
        ctx.drawImage(canSprite(CANS[i % CANS.length]!, true), Math.round(x), Math.round(y));
      }
    }
  }
}

function garageOpen(k: number, g: NonNullable<typeof garage>): number {
  if (g.kind === "stuck") return k < 1.2 ? (k / 1.2) * 0.45 : k < 6 ? 0.45 : k < 7.5 ? 0.45 * (1 - (k - 6) / 1.5) : 0;
  const dur = g.kind === "rehearsal" ? (g.g?.done ? 0 : 999) : 14;
  if (g.kind === "rehearsal" && g.g?.done) return 0;
  if (k < 2) return k / 2;
  if (k < dur - 2) return 1;
  if (k < dur) return (dur - k) / 2;
  return 0;
}

/** Among the people: the flames and the open lid, the cans in mid-air, the bunk's sleeper. */
export function clickDecor(ctx: Ctx, L: Layout, info: PaintInfo): Drawable[] {
  if (L !== forL) return [];
  const out: Drawable[] = [];
  const t = info.t;
  const yd = planOf(L)?.yard;
  if (yd?.grill && grill) {
    const g0 = yd.grill;
    const k = t - grill.t0;
    const cooking = grill.kind === "cookout" ? !grill.g?.done : k < 4;
    if (cooking) {
      out.push({
        z: g0.y + 0.2,
        draw: () => {
          // Lid up, patties on, the coals glowing.
          ctx.drawImage(lidUp(), g0.x - 10, g0.y - 24);
          for (let i = 0; i < 4; i++) fill(ctx, g0.x - 5 + i * 3, g0.y - 11 + (i % 2), 1, 1, Math.floor(t * 6 + i) % 2 ? "#ff8a2a" : "#ffcf4a");
          if (grill!.kind === "flare" && k < 2.4) {
            const h = Math.round(10 + Math.sin(k * 20) * 3) * Math.max(0, 1 - k / 2.4);
            for (let i = 0; i < 7; i++) {
              const fx = g0.x - 6 + i * 2;
              const fh = Math.round(h * (0.5 + 0.5 * Math.sin(i * 1.7 + t * 25)));
              fill(ctx, fx, g0.y - 12 - fh, 2, fh, i % 2 ? "#ff6a2a" : "#ffb42a");
              fill(ctx, fx, g0.y - 12 - Math.round(fh * 0.5), 1, Math.round(fh * 0.5), "#fff3a0");
            }
          }
        },
      });
    } else if (grill.kind !== "cookout" || grill.g?.done) grill = null;
  }
  if (fall) {
    const r = pyramidRect(L);
    const k = t - fall.t0;
    if (r && k < 0.5) {
      // Mid-collapse: cans in the air.
      out.push({
        z: r.y + 40,
        draw: () => {
          for (let i = 0; i < 10; i++) {
            const dir = i % 2 ? 1 : -1;
            const x = r.x + 6 + dir * (k * 30 + (i % 3) * 2);
            const y = r.y + 4 + (i % 4) * 3 - Math.sin(k * 6) * 6 + k * k * 60;
            ctx.drawImage(canSprite(CANS[i % CANS.length]!, false), Math.round(x), Math.round(y));
          }
        },
      });
    }
  }
  const b = planOf(L)?.bunk;
  if (b && bunk?.kind === "snore") {
    out.push({
      z: b.y + b.h + 0.1,
      draw: () => {
        // A lump in the sleeping bag on the top bunk, breathing.
        const breathe = Math.round(Math.sin(t * 2) + 1) > 0 ? 1 : 0;
        fill(ctx, b.x + 6, b.y + 9 - breathe, 11, 4 + breathe, "#2a5a90");
        fill(ctx, b.x + 7, b.y + 9 - breathe, 9, 1, "#5a8ec8");
        fill(ctx, b.x + 20, b.y + 8, 4, 3, "#6a4a30");
      },
    });
  }
  return out;
}

const lidUp = () => sprite("grill-open", 24, 26, (g) => {
  g.line(7, 17, 4, 24, C.steelDk).line(13, 17, 16, 24, C.steelDk).vline(10, 17, 7, C.steelDk);
  g.ellipse(10, 15, 7, 4, "#c4342a");
  g.ellipse(10, 14, 7, 3, "#2e2c36");
  for (const x of [6, 10, 14]) g.rect(x - 1, 13, 3, 2, "#6a3a2a");
  g.ellipse(10, 6, 7, 5, "#c4342a");
  g.ellipse(9, 4, 4, 2, "#e85a4a");
  g.rect(9, 0, 3, 2, C.black);
  g.rect(17, 12, 6, 3, C.fence).rect(17, 12, 6, 1, C.fenceHi);
  g.vline(18, 15, 8, C.fenceLo).vline(22, 15, 8, C.fenceLo);
  g.rect(18, 10, 4, 2, "#e8c080");
});

/** Above everything: smoke, the splash, Zzz, the hammock flipping, the stuck door's sparks. */
export function clickOverlay(ctx: Ctx, L: Layout, info: PaintInfo): void {
  if (L !== forL) return;
  const t = info.t;
  const plan = planOf(L);
  const yd = plan?.yard;
  if (yd?.grill && grill) {
    const g0 = yd.grill;
    const k = t - grill.t0;
    const big = grill.kind === "smoke" ? 6 : grill.kind === "flare" ? 3 : 2;
    const going = grill.kind === "cookout" ? !grill.g?.done : k < 6;
    if (going) {
      for (let i = 0; i < 4 + big * 2; i++) {
        const q = (k * 0.5 + i / (4 + big * 2)) % 1;
        const sx = g0.x + Math.sin(k * 1.5 + i * 2.1) * (2 + q * 4 * big) + q * 10 * (big > 3 ? 1.5 : 0.6);
        const sy = g0.y - 16 - q * (18 + big * 4);
        ctx.fillStyle = `rgba(${big > 3 ? "150,150,150" : "220,220,215"},${(0.5 * (1 - q)).toFixed(2)})`;
        ctx.fillRect(Math.round(sx), Math.round(sy), 2 + Math.round(q * big), 2 + Math.round(q * big * 0.6));
      }
    }
  }
  if (yd && splash) {
    const k = t - splash.t0;
    if (k < 1.6) {
      // A column of water and droplets everywhere, rings spreading.
      const h = Math.round(22 * Math.sin(Math.min(1, k / 0.7) * Math.PI));
      ctx.fillStyle = "rgba(220,245,255,0.85)";
      ctx.fillRect(splash.x - 3, splash.y - h, 6, h);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillRect(splash.x - 1, splash.y - h, 2, Math.max(0, h - 2));
      for (let i = 0; i < 14; i++) {
        const q = Math.min(1, k / 1.2);
        const a = (i / 14) * Math.PI * 2;
        const d = 4 + q * (12 + (i % 3) * 5);
        ctx.fillRect(Math.round(splash.x + Math.cos(a) * d), Math.round(splash.y - Math.sin(q * Math.PI) * 14 + Math.sin(a) * d * 0.4), 1, 1);
      }
    }
    if (k < 3) {
      ctx.fillStyle = `rgba(255,255,255,${(0.6 * (1 - k / 3)).toFixed(2)})`;
      const rr = Math.round(4 + k * 9);
      ctx.fillRect(splash.x - rr, splash.y + 2, rr * 2, 1);
      ctx.fillRect(splash.x - Math.round(rr * 0.6), splash.y - 1, Math.round(rr * 1.2), 1);
    }
  }
  const hm = yd?.hammock;
  if (hm && hammock) {
    const k = t - hammock.t0;
    if (hammock.kind === "flip" && k < 1.4) {
      // A puff of dust where someone hit the grass.
      for (let i = 0; i < 8; i++) {
        const q = k / 1.4;
        ctx.fillStyle = `rgba(200,190,150,${(0.5 * (1 - q)).toFixed(2)})`;
        ctx.fillRect(Math.round(hm.x + hm.w / 2 + Math.cos(i) * (3 + q * 10)), Math.round(hm.y + 2 - q * 4 + Math.sin(i) * 2), 2, 2);
      }
    }
    if (k > 6) hammock = null;
  }
  if (plan?.bunk && bunk) {
    const b = plan.bunk;
    const k = t - bunk.t0;
    if (bunk.kind === "snore" && k < 9) {
      for (let i = 0; i < 3; i++) {
        const q = ((k * 0.45) + i / 3) % 1;
        ctx.globalAlpha = 1 - q;
        const z = sprite(`z-${i}`, 5, 5, (g) => {
          g.rect(0, 0, 4, 1, "#f4f4ff").set(2, 1, "#f4f4ff").set(1, 2, "#f4f4ff").rect(0, 3, 4, 1, "#f4f4ff");
        });
        ctx.drawImage(z, Math.round(b.x + 12 + q * 10 + Math.sin(q * 6) * 2), Math.round(b.y + 4 - q * 18));
      }
      ctx.globalAlpha = 1;
    } else if (bunk.kind === "lights" && k < 6) {
      for (let x = b.x + 3; x < b.x + 25; x += 3) {
        const on = (Math.floor(t * 8) + x) % 3 === 0;
        fill(ctx, x, b.y + 4 + (x % 2), 1, 1, on ? "#ffffff" : "#5a4a6a");
      }
    } else if (k > 9) bunk = null;
  }
  const door = plan?.garage?.door;
  if (door && garage) {
    const k = t - garage.t0;
    if (garage.kind === "stuck" && k > 1.1 && k < 2.2) {
      // It jams with a grind and a shower of sparks from the track.
      const sy = door.y + Math.round(door.h * 0.45);
      for (let i = 0; i < 6; i++) fill(ctx, door.x + door.w + ((i * 5 + Math.floor(t * 30)) % 9), sy - ((i * 3) % 5), 1, 1, i % 2 ? "#ffd84a" : "#ffffff");
    }
    if (garage.kind !== "rehearsal" && k > 16) garage = null;
    else if (garage.kind === "rehearsal" && garage.g?.done && k > 3) garage = null;
  }
  if (fall && !pyramidDown(L, t) && t - fall.t0 > 2) fall = null;
  if (dip && dip.g.done) dip = null;
  if (games && games.g.done) games = null;
}

/** Light: the grill's coals, the flare, the garage's daylight at night, the bunk's lights. */
export function clickLights(L: Layout, info: PaintInfo): Light[] {
  if (L !== forL) return [];
  const out: Light[] = [];
  const g0 = planOf(L)?.yard?.grill;
  if (g0 && grill) out.push([g0.x, g0.y - 12, grill.kind === "flare" ? 40 : 22, 0.9, "#ff9a3a", grill.kind === "flare" ? 0.45 : 0.25]);
  const b = planOf(L)?.bunk;
  if (b && bunk?.kind === "lights") out.push([b.x + b.w / 2, b.y + 6, 30, 0.8, "#ff8ae0", 0.3]);
  void info;
  return out;
}

