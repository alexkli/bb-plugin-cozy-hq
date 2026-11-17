// Home Office: things to click. Ring a doorbell (whoever lives there calls
// back), honk at the traffic, and two secrets: the garden gnome that turns
// round when you're not looking, and a manhole cover with a rubber duck
// under it. The pond in your garden (feed the fish) is the office's own.
import type { Facing, Layout } from "../../layout.ts";
import type { PaintInfo, SceneryActions, SceneryClickable } from "../../theme.ts";
import type { Drawable } from "../../life.ts";
import type { Grid } from "../../themekit.ts";
import { C, h2 as h2k, OUTLINE, rect, sprite } from "./kit.ts";
import { homeData } from "./plan.ts";

type Ctx = CanvasRenderingContext2D;

const DOOR_LINES = ["Coming!", "One sec, I'm on a call", "Who's there?", "Just leave it at the door, thanks!", "Is that the pizza?", "I'm in my pajamas…", "Be right down!", "Not today, thanks!"];
const HONK_LINES = ["Hey!", "Easy there", "Some of us are on a call!", "Beep beep yourself", "Was that you?"];

let gnomeAt = -99;
let duckAt = -99;
let duck: { x: number; y: number } | null = null;

function gnomePos(L: Layout): { x: number; y: number } | null {
  const d = homeData(L);
  const g = d?.garden;
  if (!g) return null;
  return { x: g.x + g.w - 10, y: g.y + g.h - 12 };
}

/** The first street's manhole (the backdrop draws it in the same place). */
function manhole(L: Layout): { x: number; y: number } | null {
  const d = homeData(L);
  const s = d?.rows[0]?.street;
  if (!s) return null;
  const roadY = s.y + 10;
  const mid = roadY + Math.floor((s.h - 17) / 2);
  const x = Math.round(s.x + s.w * 0.25 + (h2k(100, 0) - 0.5) * 60);
  return { x, y: mid - 6 };
}

export function homeClickables(L: Layout): SceneryClickable[] {
  const d = homeData(L);
  if (!d) return [];
  const out: SceneryClickable[] = [];
  for (const u of d.units) out.push({ id: `door-${u.index}`, rect: { x: u.doorX - 6, y: u.rect.y + u.rect.h - 8, w: 12, h: 12 }, hover: "Ring the doorbell" });
  for (const [i, r] of d.rows.entries()) out.push({ id: `honk-${i}`, rect: { x: 0, y: r.street.y + 11, w: L.W, h: r.street.h - 19 }, hover: "The street · honk at the traffic" });
  const g = gnomePos(L);
  if (g) out.push({ id: "egg-gnome", rect: { x: g.x - 4, y: g.y - 10, w: 8, h: 11 }, hover: "A garden gnome", secret: true });
  const m = manhole(L);
  if (m) out.unshift({ id: "egg-duck", rect: { x: m.x - 1, y: m.y - 1, w: 10, h: 7 }, hover: "A manhole cover", secret: true });
  return out;
}

export function homeClick(id: string, act: SceneryActions): string | null {
  const L = act.L;
  if (id.startsWith("door-")) {
    const d = homeData(L);
    const u = d?.units[Number(id.slice(5))];
    if (!u) return null;
    const who = act.near(u.doorX, u.rect.y + u.rect.h / 2, u.rect.w)[0];
    if (who && Math.abs(who.x - u.doorX) < u.rect.w) act.say(who.id, DOOR_LINES[Math.floor(act.t * 7) % DOOR_LINES.length]!, 2.6, 0.6);
    return "dingdong";
  }
  if (id.startsWith("honk-")) {
    const who = act.near(act.at.x, act.at.y, 90)[0];
    if (who) act.say(who.id, HONK_LINES[Math.floor(act.t * 5) % HONK_LINES.length]!, 2.2, 0.5);
    return "honk";
  }
  if (id === "egg-gnome") {
    gnomeAt = act.t;
    act.say("boss", "Did that gnome just move?", 2.6, 1.4);
    return "squeak";
  }
  if (id === "egg-duck") {
    duckAt = act.t;
    duck = manhole(L);
    return "plop";
  }
  return null;
}

function gnomeSprite(facing: Facing): HTMLCanvasElement {
  return sprite(`gnome-${facing}`, 8, 11, (g: Grid) => {
    g.rect(2, 0, 4, 1, "#d0505a").rect(1, 1, 6, 3, "#d0505a");
    if (facing === "front") g.rect(2, 4, 4, 2, "#f2c9a0").rect(2, 6, 4, 2, C.white).set(3, 4, OUTLINE).set(5, 4, OUTLINE);
    else g.rect(2, 4, 4, 4, "#d0505a");
    g.rect(1, 7, 6, 3, "#3e8ed0").rect(1, 10, 2, 1, C.bark).rect(5, 10, 2, 1, C.bark);
  });
}

export function homeClickDecor(ctx: Ctx, L: Layout, info: PaintInfo): Drawable[] {
  const out: Drawable[] = [];
  const g = gnomePos(L);
  if (g) {
    // It faces the house; when clicked it hops round to face you for a moment.
    const k = info.t - gnomeAt;
    const turned = k >= 0 && k < 2.4;
    const hop = turned && k < 0.4 ? -2 : 0;
    const spr = gnomeSprite(turned ? "front" : "back");
    out.push({ z: g.y, draw: () => ctx.drawImage(spr, g.x - 4, g.y - 10 + hop) });
  }
  const k = info.t - duckAt;
  if (duck && k >= 0 && k < 3.2) {
    const up = Math.min(1, k * 4) * (k > 2.6 ? Math.max(0, (3.2 - k) / 0.6) : 1);
    const y = Math.round(duck.y - up * 6);
    out.push({
      z: duck.y + 8,
      draw: () => {
        rect(ctx, duck!.x + 1, y + 1, 6, 4, OUTLINE);
        rect(ctx, duck!.x + 2, y + 2, 4, 3, "#ffd84a");
        rect(ctx, duck!.x + 5, y, 3, 3, OUTLINE);
        rect(ctx, duck!.x + 5, y + 1, 2, 1, "#ffd84a");
        rect(ctx, duck!.x + 7, y + 2, 1, 1, "#ff8a3a");
      },
    });
  }
  return out;
}

/** The pond in your garden: water, lily pads, the fish going round. */
export function homeFishTank(ctx: Ctx, tank: { x: number; y: number; w: number; h: number }, info: PaintInfo & { fish: { x: number; y: number; dir: 1 | -1; color: string; phase: number }[]; feeding: boolean }): boolean {
  const g = sprite(`pond-${tank.w}x${tank.h}`, tank.w, tank.h, (gr) => {
    gr.ellipse(tank.w / 2 - 0.5, tank.h / 2 - 0.5, tank.w / 2 - 0.5, tank.h / 2 - 0.5, "#9c968c");
    gr.ellipse(tank.w / 2 - 0.5, tank.h / 2 - 0.5, tank.w / 2 - 3, tank.h / 2 - 3, "#4f9cc0");
    gr.ellipse(tank.w / 2 - 3, tank.h / 2 - 3, tank.w / 2 - 9, tank.h / 2 - 8, "#65b2d4");
    gr.ellipse(8, tank.h - 9, 3, 2, C.leafHi).set(8, tank.h - 9, "#3a7a3a");
    gr.ellipse(tank.w - 10, 8, 3, 2, C.leafHi).set(tank.w - 9, 7, "#f2a7c0");
  }, false);
  ctx.drawImage(g, tank.x, tank.y);
  for (const f of info.fish) {
    const x = Math.round(Math.min(tank.x + tank.w - 8, Math.max(tank.x + 5, f.x)));
    const y = Math.round(Math.min(tank.y + tank.h - 7, Math.max(tank.y + 5, f.y)));
    rect(ctx, x, y, 3, 2, f.color === "#7fd1ff" ? "#ffffff" : f.color);
    rect(ctx, f.dir === 1 ? x - 1 : x + 3, y, 1, 2, f.color);
  }
  // Ripples now and then.
  const k = (info.t * 0.4) % 1;
  if (k < 0.5) {
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    const r = Math.round(2 + k * 8);
    ctx.fillRect(tank.x + tank.w / 2 - r, tank.y + tank.h / 2, r * 2, 1);
  }
  return true;
}
