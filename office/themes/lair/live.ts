// Villain's Lair: the live layers. The lava lake shimmering far below the
// crater rail (steaming when it rains), its glow under the catwalk grating,
// outposts blinking on the world map and a radar sweep, tape reels turning,
// the monorail, the lava lamp, caged lamps along the wall, the blast door,
// and the lights the base makes at night.
import type { Drawable, Light, PaintInfo, WallLightsInfo } from "../../theme.ts";
import type { Layout, PropPlacement, Rect } from "../../layout.ts";
import { cached, Grid, OUTLINE, rect } from "../../themekit.ts";
import { mapPoint, OUTPOSTS } from "./atlas.ts";
import { clickDecor, clickLights, clickOverlay, clickUnderlay, reelSpeed } from "./clicks.ts";
import { C } from "./kit.ts";
import { planOf, type LairPlan } from "./plan.ts";

type Ctx = CanvasRenderingContext2D;

/** The reactor core and the lava lamp, looked up once per floor plan. */
const fixtures = new WeakMap<Layout, { core: PropPlacement | null; lamp: PropPlacement | null }>();
function fixturesOf(L: Layout): { core: PropPlacement | null; lamp: PropPlacement | null } {
  let f = fixtures.get(L);
  if (!f) {
    f = { core: L.props.find((p) => p.kind === "ai-rack") ?? null, lamp: L.props.find((p) => p.kind === "lamp") ?? null };
    fixtures.set(L, f);
  }
  return f;
}

// ------------------------------------------------------------------ the crater

function lavaLake(ctx: Ctx, plan: LairPlan, t: number): void {
  const c = plan.crater;
  if (!c) return;
  const top = c.y + c.h - 5;
  rect(ctx, 0, top + 1, c.w, c.y + c.h - top - 1, C.lavaLo);
  for (let x = 0; x < c.w; x += 3) {
    const k = Math.sin(t * 1.3 + x * 0.07) + Math.sin(t * 0.7 - x * 0.13);
    ctx.fillStyle = k > 1.1 ? C.lavaHot : k > 0.2 ? C.lavaHi : k > -0.8 ? C.lava : C.crust;
    ctx.fillRect(x, top + 1 + (k > 0.5 ? 0 : 1), 3, 1);
    if (k < -1.2) {
      ctx.fillStyle = C.crustDk;
      ctx.fillRect(x, top + 3, 2, 1);
    }
  }
  // The heat glows up the crater walls.
  const pulse = 0.12 + 0.05 * Math.sin(t * 0.9);
  ctx.fillStyle = `rgba(255,110,40,${pulse})`;
  ctx.fillRect(0, top - 6, c.w, 6);
}

/** Rain and snow fall into the crater and hiss off the lava as steam; fog hangs over it. */
function craterWeather(ctx: Ctx, plan: LairPlan, info: PaintInfo): void {
  const c = plan.crater;
  if (!c) return;
  const t = info.t;
  const wx = info.weather;
  const wet = wx === "rain" || wx === "drizzle" || wx === "storm";
  if (wet || wx === "snow") {
    ctx.fillStyle = wx === "snow" ? "#ffffff" : "rgba(200,220,240,0.8)";
    const n = Math.round(c.w / (wx === "drizzle" ? 14 : wx === "storm" ? 5 : 8));
    for (let i = 0; i < n; i++) {
      const x = (i * 37 + Math.floor(t * (wx === "snow" ? 6 : 24))) % c.w;
      const y = c.y + 3 + ((i * 13 + Math.floor(t * (wx === "snow" ? 8 : 40))) % (c.h - 6));
      ctx.fillRect(x, y, 1, wx === "snow" ? 1 : 2);
    }
    // Steam where it lands.
    for (let i = 0; i < 6; i++) {
      const life = (t * 0.5 + i / 6) % 1;
      const x = ((i * 113) % c.w) + Math.sin(t + i) * 3;
      const y = c.y + c.h - 6 - life * (c.h - 4);
      ctx.fillStyle = `rgba(235,235,240,${0.35 * (1 - life)})`;
      ctx.fillRect(Math.round(x), Math.round(y), 4 + Math.round(life * 4), 2);
    }
  } else if (wx === "fog") {
    ctx.fillStyle = "rgba(220,220,228,0.35)";
    ctx.fillRect(0, c.y + 4, c.w, c.h - 6);
  }
}

/** The rail along the crater's edge: in front of whoever leans on it. */
function craterRail(ctx: Ctx, plan: LairPlan): void {
  const c = plan.crater;
  if (!c) return;
  const y = c.y - 6;
  ctx.drawImage(railSprite(c.w), 0, y);
}

const railSprite = (w: number) =>
  cached(`lair|rail-${w}`, () => {
    const g = new Grid(w, 10);
    for (let x = 0; x < w; x++) {
      g.set(x, 0, OUTLINE);
      g.set(x, 1, (x >> 2) % 2 ? C.hazard : C.ink);
      g.set(x, 2, OUTLINE);
      g.set(x, 5, C.steelHi);
      g.set(x, 6, OUTLINE);
    }
    for (let x = 2; x < w; x += 16) {
      g.rect(x, 3, 2, 7, C.steelLo);
      g.set(x, 3, C.steelHi);
      g.set(x + 2, 3, OUTLINE).set(x + 2, 4, OUTLINE).set(x - 1, 3, OUTLINE).set(x - 1, 4, OUTLINE);
    }
    return g.toCanvas();
  });

// ------------------------------------------------------------------ the wall

function mapLife(ctx: Ctx, plan: LairPlan, t: number): void {
  const m = plan.map;
  // Outposts blinking in turn.
  OUTPOSTS.forEach(([lon, lat], i) => {
    const p = mapPoint(m, lon, lat);
    const on = Math.sin(t * 2.2 + i * 1.9) > 0.2;
    ctx.fillStyle = on ? (i % 3 === 0 ? C.glowAmber : C.glowRed) : "#5a1a18";
    ctx.fillRect(p.x, p.y, 1, 1);
    if (on && i % 3 === 0) ctx.fillRect(p.x - 1, p.y, 3, 1);
  });
  // The base itself, pulsing white.
  const home = mapPoint(m, -140, -12);
  ctx.fillStyle = Math.floor(t * 2) % 2 ? "#ffffff" : C.glowGreen;
  ctx.fillRect(home.x - 1, home.y - 1, 3, 3);
  // A radar sweep crossing the map.
  const sx = m.x + Math.floor((t * 18) % m.w);
  ctx.fillStyle = "rgba(124,240,200,0.35)";
  ctx.fillRect(sx, m.y, 1, m.h);
  ctx.fillStyle = "rgba(124,240,200,0.12)";
  ctx.fillRect(Math.max(m.x, sx - 6), m.y, Math.min(6, sx - m.x), m.h);
}

const reel = (frame: number) =>
  cached(`lair|reel-${frame}`, () => {
    const g = new Grid(7, 7);
    g.ellipse(3, 3, 3, 3, "#7d868f");
    g.ellipse(3, 3, 2, 2, "#3a3438");
    g.set(3, 3, C.steelTop);
    const spokes = [
      [3, 1],
      [5, 3],
      [3, 5],
      [1, 3],
    ];
    const s = spokes[frame % 4]!;
    g.set(s[0]!, s[1]!, C.steelTop);
    const o = spokes[(frame + 2) % 4]!;
    g.set(o[0]!, o[1]!, C.steelTop);
    return g.toCanvas();
  });

function tapeLife(ctx: Ctx, plan: LairPlan, t: number): void {
  const speed = reelSpeed(t);
  plan.tapes.forEach((tp, i) => {
    const f = Math.floor(t * speed + i) % 4;
    ctx.drawImage(reel(f), tp.x + 3, tp.y + 6);
    ctx.drawImage(reel((f + 1) % 4), tp.x + tp.w - 10, tp.y + 6);
    // The lamp row blinks.
    for (let x = tp.x + 3; x < tp.x + tp.w - 3; x += 3) {
      if (Math.sin(t * (speed > 2 ? 9 : 2) + x * 1.7 + i) > 0.4) continue;
      ctx.fillStyle = "#1a1418";
      ctx.fillRect(x, tp.y + 26, 1, 1);
    }
  });
}

function gratingGlow(ctx: Ctx, L: Layout, t: number): void {
  const k = 0.06 + 0.04 * Math.sin(t * 0.8);
  ctx.fillStyle = `rgba(255,100,40,${k})`;
  for (const hy of L.net.halls) ctx.fillRect(0, hy - 6, L.W, 12);
}

// ------------------------------------------------------------------ the lava lamp

function lampBlobs(ctx: Ctx, L: Layout, t: number): Drawable[] {
  const lamp = fixturesOf(L).lamp;
  if (!lamp) return [];
  return [
    {
      z: lamp.z + 0.1,
      draw: () => {
        for (let i = 0; i < 3; i++) {
          const y = lamp.y + 8 + Math.round(((Math.sin(t * 0.35 + i * 2.1) + 1) / 2) * 24);
          const x = lamp.x + 6 + (i % 2);
          ctx.fillStyle = i === 1 ? C.lava : C.lavaLo;
          ctx.fillRect(x, y, 3, 2 + (i % 2));
          ctx.fillRect(x + 1, y - 1, 1, 1);
        }
      },
    },
  ];
}

// ------------------------------------------------------------------ the hooks

export function lairUnderlay(ctx: Ctx, L: Layout, info: PaintInfo): void {
  const plan = planOf(L);
  if (!plan) return;
  gratingGlow(ctx, L, info.t);
  lavaLake(ctx, plan, info.t);
  craterWeather(ctx, plan, info);
  mapLife(ctx, plan, info.t);
  tapeLife(ctx, plan, info.t);
  clickUnderlay(ctx, L, plan, info);
}

export function lairDecor(ctx: Ctx, L: Layout, info: PaintInfo): Drawable[] {
  const plan = planOf(L);
  if (!plan) return [];
  const out: Drawable[] = [...lampBlobs(ctx, L, info.t), ...clickDecor(ctx, L, plan, info)];
  if (plan.crater) out.push({ z: plan.crater.y + 0.5, draw: () => craterRail(ctx, plan) });
  return out;
}

export function lairOverlay(ctx: Ctx, L: Layout, info: PaintInfo): void {
  const plan = planOf(L);
  if (plan) clickOverlay(ctx, L, plan, info);
}

export function lairLights(L: Layout, info: PaintInfo): Light[] {
  const plan = planOf(L);
  if (!plan) return [];
  const out: Light[] = [];
  const c = plan.crater;
  if (c) for (let x = 20; x < L.W; x += 70) out.push([x, L.H - 4, 46, 0.75, "#ff6a2a", 0.3]);
  for (const hy of L.net.halls) for (let x = 40; x < L.W; x += 110) out.push([x, hy, 24, 0.3, "#ff6a2a", 0.08]);
  const m = plan.map;
  out.push([m.x + m.w / 2, m.y + m.h / 2, Math.max(40, m.w * 0.45), 0.6, "#5ae0c8", 0.12]);
  const cd = plan.countdown;
  out.push([cd.x + cd.w / 2, cd.y + cd.h / 2, 18, 0.7, "#ff4a3a", 0.2]);
  const { core, lamp } = fixturesOf(L);
  if (core) out.push([core.x + 10, core.y + 18, 28, 0.9, "#5ae0c8", 0.35]);
  if (lamp) out.push([lamp.x + 8, lamp.y + 20, 22, 0.7, "#ff8a3a", 0.25]);
  out.push(...clickLights(L, plan, info.t));
  return out;
}

// ------------------------------------------------------------------ the caged lamps

function lampXs(L: Layout): number[] {
  return cached(`lair|lamps|${L.W}x${L.H}|${L.wall.door.x}`, () => {
    const plan = planOf(L);
    const avoid: Rect[] = [L.wall.pinboard, L.wall.calendar, L.wall.door, ...L.wall.windows];
    if (plan) avoid.push(plan.map, plan.countdown, ...plan.tapes);
    const xs: number[] = [];
    for (const sg of L.segments) {
      for (let x = sg.x0 + 11; x < sg.x1 - 6; x += 40) {
        if (avoid.some((r) => x > r.x - 6 && x < r.x + r.w + 6 && r.y < 14)) continue;
        if (Math.abs(x - L.wall.clock.x) < 14 || L.wall.pillars.some((p) => Math.abs(x - p) < 8)) continue;
        xs.push(x);
      }
    }
    return xs;
  });
}

export function lairWallLights(ctx: Ctx, L: Layout, info: WallLightsInfo, glow: boolean): void {
  const night = info.party ? Math.max(info.night, 0.7) : info.night;
  lampXs(L).forEach((x, i) => {
    const dead = info.brokenBulbX !== null && Math.abs(x - info.brokenBulbX) < 20 && Math.floor(info.t * 9) % 7 !== 0;
    const alarm = info.party && (i + Math.floor(info.t * 6)) % 3 === 0;
    const on = !dead && (night > 0.3 || alarm);
    const color = info.party ? (alarm ? "#ff4a3a" : "#ffc54a") : "#ffd27a";
    if (glow) {
      if (!on) return;
      const g = ctx.createRadialGradient(x + 1, 10, 0, x + 1, 10, 9);
      g.addColorStop(0, `${color}${Math.round(110 * night).toString(16).padStart(2, "0")}`);
      g.addColorStop(1, `${color}00`);
      ctx.fillStyle = g;
      ctx.fillRect(x - 8, 2, 18, 18);
      ctx.fillStyle = color;
      ctx.fillRect(x, 8, 2, 3);
      return;
    }
    rect(ctx, x, 5, 1, 2, OUTLINE);
    rect(ctx, x - 1, 7, 4, 5, OUTLINE);
    rect(ctx, x, 8, 2, 3, dead ? "#4a4040" : on ? color : "#8a7a5a");
    rect(ctx, x - 1, 9, 4, 1, C.steelLo);
  });
}

/** The blast door slides aside into the rock while someone comes or goes. */
export function lairDoorOpen(ctx: Ctx, door: Rect, info: PaintInfo): boolean {
  const { x, y, w, h } = door;
  rect(ctx, x, y, w, h, "#0e0c10");
  // A lit corridor behind, a red light in its ceiling.
  ctx.fillStyle = "rgba(255,200,140,0.18)";
  ctx.fillRect(x + 3, y + h - 12, w - 6, 12);
  rect(ctx, x + w / 2 - 1, y + 2, 2, 1, Math.floor(info.t * 3) % 2 ? C.glowRed : "#6a1a14");
  // The slab, slid most of the way into the wall.
  rect(ctx, x + w - 4, y, 4, h, C.steel);
  rect(ctx, x + w - 4, y, 1, h, C.steelHi);
  rect(ctx, x + w - 5, y, 1, h, OUTLINE);
  return true;
}
