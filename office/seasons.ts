// Seasons and festivals: which ones are on today, how the office decorates
// for them, and the decor, accessories and lights of their parties.

import { OUTLINE } from "./characters.ts";
import type { Facing, Layout, Point, Rect } from "./layout.ts";
import type { Drawable, EventPlan } from "./life.ts";

export type Season =
  | "valentines"
  | "carnival"
  | "stpatricks"
  | "holi"
  | "easter"
  | "summer"
  | "diwali"
  | "halloween"
  | "laternenfest"
  | "thanksgiving"
  | "holidays"
  | "snowday"
  | "lunarnewyear"
  | "spring"
  | "oktoberfest";

/** When several are on at once, the first decorates the office. */
const PRIORITY: Season[] = [
  "valentines",
  "lunarnewyear",
  "stpatricks",
  "holi",
  "easter",
  "diwali",
  "laternenfest",
  "thanksgiving",
  "carnival",
  "oktoberfest",
  "halloween",
  "holidays",
  "snowday",
  "spring",
  "summer",
];

export const SEASONS: readonly Season[] = PRIORITY;

export const SEASON_TITLE: Record<Season, string> = {
  valentines: "Valentine's Day",
  carnival: "Carnival",
  stpatricks: "St. Patrick's Day",
  holi: "Holi",
  easter: "Easter",
  summer: "Summer",
  diwali: "Diwali",
  halloween: "Halloween",
  laternenfest: "Laternenfest",
  thanksgiving: "Thanksgiving",
  holidays: "The holidays",
  snowday: "Snow days",
  lunarnewyear: "Lunar New Year",
  spring: "Maifest",
  oktoberfest: "Oktoberfest",
};

const dayNo = (y: number, m: number, d: number) => Math.floor(Date.UTC(y, m, d) / 86_400_000);
const dayOf = (d: Date) => dayNo(d.getFullYear(), d.getMonth(), d.getDate());

/** Easter Sunday (Gregorian computus). */
export function easterSunday(y: number): Date {
  const a = y % 19;
  const b = Math.floor(y / 100);
  const c = y % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const n = h + l - 7 * m + 114;
  return new Date(y, Math.floor(n / 31) - 1, (n % 31) + 1);
}

/** US Thanksgiving: the fourth Thursday of November. */
export function thanksgivingDay(y: number): Date {
  const first = new Date(y, 10, 1).getDay();
  return new Date(y, 10, 1 + ((4 - first + 7) % 7) + 21);
}

// Lunar New Year, Diwali and Holi follow lunar calendars; these are looked up through 2030
// (later years simply skip them until the table is extended).
const DIWALI: Record<number, [number, number]> = { 2025: [9, 20], 2026: [10, 8], 2027: [9, 29], 2028: [9, 17], 2029: [10, 5], 2030: [9, 26] };
const LUNAR_NEW_YEAR: Record<number, [number, number]> = { 2025: [0, 29], 2026: [1, 17], 2027: [1, 6], 2028: [0, 26], 2029: [1, 13], 2030: [1, 3] };
const HOLI: Record<number, [number, number]> = { 2025: [2, 14], 2026: [2, 4], 2027: [2, 22], 2028: [2, 11], 2029: [2, 1], 2030: [2, 20] };

/** Every season or festival on at this date, most specific first. */
export function seasonsOf(d: Date): Season[] {
  const y = d.getFullYear();
  const today = dayOf(d);
  const near = (date: Date | null, before: number, after: number) => date !== null && today >= dayOf(date) - before && today <= dayOf(date) + after;
  const span = (m0: number, d0: number, m1: number, d1: number) => today >= dayNo(y, m0, d0) && today <= dayNo(y, m1, d1);
  const lunar = (table: Record<number, [number, number]>) => {
    const md = table[y];
    return md ? new Date(y, md[0], md[1]) : null;
  };
  const easter = easterSunday(y);
  const tg = thanksgivingDay(y);
  const on = new Set<Season>();
  if (span(1, 7, 1, 14)) on.add("valentines");
  if (span(0, 4, 1, 6)) on.add("snowday");
  if (near(lunar(LUNAR_NEW_YEAR), 2, 6)) on.add("lunarnewyear");
  if (span(3, 15, 5, 19)) on.add("spring");
  if (span(8, 16, 9, 6)) on.add("oktoberfest");
  // Carnival: Weiberfastnacht to Shrove Tuesday, and the 11.11. kick-off.
  if (near(easter, 52, -47) || (d.getMonth() === 10 && d.getDate() === 11)) on.add("carnival");
  if (span(2, 10, 2, 17)) on.add("stpatricks");
  if (near(lunar(HOLI), 3, 1)) on.add("holi");
  if (near(easter, 7, 1)) on.add("easter");
  if (span(5, 20, 7, 31)) on.add("summer");
  if (near(lunar(DIWALI), 3, 1)) on.add("diwali");
  if (span(9, 17, 9, 31)) on.add("halloween");
  if (span(10, 1, 10, 15)) on.add("laternenfest");
  if (near(tg, 6, 1)) on.add("thanksgiving");
  if (today >= dayOf(tg) + 2 || (d.getMonth() === 0 && d.getDate() <= 3)) on.add("holidays");
  return PRIORITY.filter((s) => on.has(s));
}

/** The season that decorates the office today, if any. */
export function seasonOf(d: Date): Season | null {
  return seasonsOf(d)[0] ?? null;
}

// ------------------------------------------------------------------ little things to draw

type Ctx = CanvasRenderingContext2D;

function px(ctx: Ctx, x: number, y: number, w: number, h: number, c: string): void {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

/** A decorated tree; `h` is the height of the branches. */
export function drawTree(ctx: Ctx, cx: number, baseY: number, h: number, t: number): void {
  const trunk = Math.max(3, Math.round(h / 8));
  px(ctx, cx - 3, baseY - trunk - 1, 6, trunk + 1, OUTLINE);
  px(ctx, cx - 2, baseY - trunk, 4, trunk, "#8a5a34");
  const top = baseY - trunk - h;
  const tiers = 3;
  const tierH = h / tiers;
  for (let i = 0; i <= h; i++) {
    const y = top + i;
    const tier = Math.min(tiers - 1, Math.floor(i / tierH));
    const local = i - tier * tierH;
    const half = Math.round(1 + tier * (h / 9) + local * 0.55);
    px(ctx, cx - half - 1, y, half * 2 + 3, 1, OUTLINE);
    px(ctx, cx - half, y, half * 2 + 1, 1, i % 4 === 0 ? "#2f8f4e" : "#257a42");
    px(ctx, cx - half, y, Math.max(1, Math.round(half * 0.5)), 1, "#3fa85f");
  }
  const colors = ["#ffd84a", "#ff6b8b", "#5ad1ff", "#fbfaf5", "#e5484d"];
  for (let i = 0; i < Math.round(h * 0.7); i++) {
    const k = ((i * 0.618) % 1) * 0.9 + 0.08;
    const yy = Math.round(top + 3 + k * (h - 4));
    const tier = Math.min(tiers - 1, Math.floor((yy - top) / tierH));
    const half = 1 + tier * (h / 9) + (yy - top - tier * tierH) * 0.55;
    const on = Math.floor(t * 2 + i * 0.7) % 3 !== 0;
    px(ctx, cx + Math.sin(i * 2.4) * (half - 1), yy, 1, 1, on ? colors[i % colors.length]! : "#1f5c34");
  }
  const tw = Math.floor(t * 3) % 2;
  px(ctx, cx - 1, top - 3, 3, 3, "#ffd84a");
  px(ctx, cx, top - 4 - tw, 1, 5 + tw, "#ffd84a");
  px(ctx, cx - 2 - tw, top - 2, 5 + tw * 2, 1, "#ffd84a");
}

/** A pumpkin; carved ones glow when `lit`. */
export function drawPumpkin(ctx: Ctx, x: number, y: number, t: number, lit: boolean, size = 1, carved = true): void {
  const w = 9 * size;
  const h = 7 * size;
  px(ctx, x - w / 2 - 1, y - h, w + 2, h + 1, OUTLINE);
  px(ctx, x - w / 2, y - h - 1, w, h + 3, OUTLINE);
  px(ctx, x - w / 2, y - h, w, h, "#ff8a3d");
  px(ctx, x - Math.round(w / 6), y - h, 1, h, "#d9651e");
  px(ctx, x + Math.round(w / 6), y - h, 1, h, "#d9651e");
  px(ctx, x, y - h - 2, size > 1 ? 2 : 1, 2, "#3f7a3a");
  if (!carved) return;
  const glow = lit ? (Math.floor(t * 7 + x) % 3 === 0 ? "#fff3a3" : "#ffd84a") : "#7a3410";
  const ey = y - h + Math.round(h * 0.3);
  px(ctx, x - 3 * size, ey, 2 * size, size, glow);
  px(ctx, x + size, ey, 2 * size, size, glow);
  px(ctx, x - 2 * size, y - Math.round(h * 0.35), 5 * size, size, glow);
}

export function gift(ctx: Ctx, x: number, y: number, box: string, ribbon: string): void {
  px(ctx, x - 3, y - 6, 7, 7, OUTLINE);
  px(ctx, x - 2, y - 5, 5, 5, box);
  px(ctx, x, y - 5, 1, 5, ribbon);
  px(ctx, x - 2, y - 3, 5, 1, ribbon);
  px(ctx, x - 1, y - 7, 1, 1, ribbon);
  px(ctx, x + 1, y - 7, 1, 1, ribbon);
}

export function roundTable(ctx: Ctx, x: number, y: number, cloth: string): void {
  px(ctx, x - 15, y - 9, 30, 12, OUTLINE);
  px(ctx, x - 13, y - 10, 26, 14, OUTLINE);
  px(ctx, x - 14, y - 9, 28, 10, cloth);
  px(ctx, x - 12, y - 10, 24, 1, cloth);
  px(ctx, x - 12, y - 9, 24, 2, "#ffffff55");
  px(ctx, x - 14, y - 1, 28, 2, "#00000022");
  px(ctx, x - 1, y + 1, 2, 4, "#6b4a3a");
}

function heart(ctx: Ctx, x: number, y: number, c: string, outline = true): void {
  if (outline) {
    px(ctx, x - 1, y - 1, 3, 3, OUTLINE);
    px(ctx, x + 2, y - 1, 3, 3, OUTLINE);
    px(ctx, x - 1, y, 7, 3, OUTLINE);
    px(ctx, x, y + 3, 5, 1, OUTLINE);
    px(ctx, x + 1, y + 4, 3, 1, OUTLINE);
    px(ctx, x + 2, y + 5, 1, 1, OUTLINE);
  }
  px(ctx, x, y, 2, 2, c);
  px(ctx, x + 3, y, 2, 2, c);
  px(ctx, x, y + 1, 5, 2, c);
  px(ctx, x + 1, y + 3, 3, 1, c);
  px(ctx, x + 2, y + 4, 1, 1, c);
}

function shamrock(ctx: Ctx, x: number, y: number): void {
  px(ctx, x - 1, y - 1, 2, 2, "#30a46c");
  px(ctx, x + 1, y - 1, 2, 2, "#30a46c");
  px(ctx, x, y - 2, 2, 2, "#3fbf7a");
  px(ctx, x + 1, y + 1, 1, 2, "#257a42");
}

function egg(ctx: Ctx, x: number, y: number, c: string, stripe: string): void {
  px(ctx, x - 2, y - 5, 5, 6, OUTLINE);
  px(ctx, x - 1, y - 6, 3, 8, OUTLINE);
  px(ctx, x - 1, y - 5, 3, 5, c);
  px(ctx, x - 2, y - 4, 5, 3, c);
  px(ctx, x - 2, y - 3, 5, 1, stripe);
  px(ctx, x - 1, y - 4, 1, 1, "#ffffff99");
}

const EGG_COLORS: [string, string][] = [
  ["#ffc4d6", "#ff8fb2"],
  ["#bfe3ff", "#5a8fd0"],
  ["#fff3b8", "#ff9a3d"],
  ["#d7f5d0", "#30a46c"],
  ["#e8dcff", "#8e5bd8"],
];

function diya(ctx: Ctx, x: number, y: number, t: number, i: number): void {
  px(ctx, x - 3, y - 2, 7, 3, OUTLINE);
  px(ctx, x - 2, y - 2, 5, 2, "#c4622d");
  px(ctx, x - 2, y - 2, 5, 1, "#e08a4a");
  const f = Math.floor(t * 8 + i) % 3;
  px(ctx, x, y - 5 + (f === 0 ? 1 : 0), 1, 3 - (f === 0 ? 1 : 0), "#ffd84a");
  px(ctx, x, y - 3, 1, 1, "#ff8a3d");
}

function paperLantern(ctx: Ctx, x: number, y: number, c: string, t: number, i: number, lit: boolean): void {
  px(ctx, x - 3, y, 7, 7, OUTLINE);
  px(ctx, x - 2, y - 1, 5, 9, OUTLINE);
  px(ctx, x - 2, y, 5, 7, c);
  if (lit) px(ctx, x - 1, y + 2, 3, 3, Math.floor(t * 5 + i) % 4 === 0 ? "#fff8d0" : "#ffe9a0");
  px(ctx, x - 2, y + 1, 5, 1, "#00000022");
  px(ctx, x - 2, y + 5, 5, 1, "#00000022");
}

function potOfGold(ctx: Ctx, x: number, y: number, rainbow: boolean, t: number): void {
  if (rainbow) {
    const colors = ["#e5484d", "#ff9a3d", "#ffd84a", "#30a46c", "#3e8ed0", "#8e5bd8"];
    colors.forEach((c, i) => {
      const r = 14 - i;
      for (let a = 0; a <= 40; a++) {
        const ang = Math.PI + (a / 40) * Math.PI;
        px(ctx, x - 10 + Math.cos(ang) * r, y - 8 + Math.sin(ang) * r * 0.8, 1, 1, c);
      }
    });
  }
  px(ctx, x - 6, y - 6, 12, 7, OUTLINE);
  px(ctx, x - 5, y - 5, 10, 5, "#2a2633");
  px(ctx, x - 6, y - 7, 12, 2, OUTLINE);
  for (let i = 0; i < 5; i++) px(ctx, x - 5 + i * 2, y - 8 - (i % 2), 2, 2, Math.floor(t * 3 + i) % 4 === 0 ? "#fff3a3" : "#ffd84a");
}

function rangoli(ctx: Ctx, x: number, y: number, r: number): void {
  const rings = ["#e5484d", "#ff9a3d", "#ffd84a", "#30a46c", "#3e8ed0", "#c45aa8"];
  for (let i = 0; i < rings.length && r - i * 2 > 1; i++) {
    const rr = r - i * 2;
    for (let a = 0; a < 48; a++) {
      const ang = (a / 48) * Math.PI * 2;
      const petal = 1 + 0.18 * Math.cos(ang * 8);
      px(ctx, x + Math.cos(ang) * rr * petal, y + Math.sin(ang) * rr * 0.5 * petal, 2, 1, rings[i]!);
    }
  }
  px(ctx, x - 1, y - 1, 3, 2, "#fbfaf5");
}

function bonfire(ctx: Ctx, x: number, y: number, t: number): void {
  px(ctx, x - 9, y - 3, 18, 3, OUTLINE);
  px(ctx, x - 8, y - 2, 16, 2, "#6b4128");
  px(ctx, x - 6, y - 4, 12, 2, "#8a5a34");
  for (let i = 0; i < 7; i++) {
    const h = 5 + ((Math.floor(t * 9 + i * 3) % 5) + (i === 3 ? 5 : i % 3 === 0 ? 2 : 0));
    const fx = x - 6 + i * 2;
    px(ctx, fx, y - 4 - h, 2, h, i % 2 ? "#ff8a3d" : "#ffb347");
    px(ctx, fx, y - 4 - Math.round(h * 0.45), 2, Math.round(h * 0.45), "#ffe066");
  }
  px(ctx, x - 1, y - 7, 2, 3, "#fff6c0");
}

function grill(ctx: Ctx, x: number, y: number, t: number): void {
  px(ctx, x - 10, y - 12, 20, 8, OUTLINE);
  px(ctx, x - 9, y - 11, 18, 6, "#3a3546");
  px(ctx, x - 9, y - 11, 18, 1, "#6b6280");
  for (let i = 0; i < 4; i++) {
    px(ctx, x - 8 + i * 4, y - 10, 3, 1, Math.floor(t * 2 + i) % 3 ? "#c4622d" : "#8a3e1a");
    px(ctx, x - 8 + i * 4, y - 9, 3, 1, "#e08a4a");
  }
  px(ctx, x - 8, y - 4, 1, 4, "#4b4458");
  px(ctx, x + 7, y - 4, 1, 4, "#4b4458");
  // Lemonade jug on a stool beside it.
  px(ctx, x + 12, y - 11, 6, 8, OUTLINE);
  px(ctx, x + 13, y - 10, 4, 6, "#fff3a3");
  px(ctx, x + 13, y - 7, 4, 3, "#ffd84a");
  px(ctx, x + 13, y - 3, 4, 3, "#8a5a34");
}

function feastTable(ctx: Ctx, x: number, y: number): void {
  px(ctx, x - 22, y - 10, 44, 12, OUTLINE);
  px(ctx, x - 21, y - 9, 42, 9, "#f2a65e");
  px(ctx, x - 21, y - 9, 42, 1, "#ffc88a");
  px(ctx, x - 21, y - 1, 42, 1, "#d9823f");
  // Turkey
  px(ctx, x - 6, y - 13, 12, 7, OUTLINE);
  px(ctx, x - 5, y - 12, 10, 5, "#b0632a");
  px(ctx, x - 4, y - 12, 6, 1, "#d9823f");
  px(ctx, x - 8, y - 9, 3, 2, "#fbfaf5");
  px(ctx, x + 5, y - 9, 3, 2, "#fbfaf5");
  // Pie, corn, cranberries
  px(ctx, x - 18, y - 8, 8, 4, OUTLINE);
  px(ctx, x - 17, y - 7, 6, 2, "#e08a4a");
  px(ctx, x + 10, y - 8, 7, 4, "#ffd84a");
  px(ctx, x + 10, y - 8, 7, 1, "#30a46c");
  px(ctx, x - 1, y - 4, 3, 2, "#c4383f");
}

function bigDrum(ctx: Ctx, x: number, y: number, t: number): void {
  const hit = Math.floor(t * 2) % 2;
  px(ctx, x - 9, y - 16, 18, 15, OUTLINE);
  px(ctx, x - 8, y - 15, 16, 13, "#e5484d");
  px(ctx, x - 6, y - 13, 12, 9, "#fbfaf5");
  for (let i = 0; i < 4; i++) px(ctx, x - 8 + i * 5, y - 15, 1, 13, "#ffd84a");
  px(ctx, x - 4, y - 11, 1, 5, "#2a2633");
  px(ctx, x - 2, y - 11, 1, 5, "#2a2633");
  px(ctx, x + 1, y - 11, 1, 5, "#2a2633");
  px(ctx, x + 3, y - 11, 1, 5, "#2a2633");
  px(ctx, x + 9, y - 14 - hit, 1, 6, "#8a5a34");
  px(ctx, x + 8, y - 15 - hit, 3, 2, "#fbfaf5");
}

function snowman(ctx: Ctx, x: number, y: number, t: number): void {
  const ball = (cx: number, cy: number, r: number) => {
    for (let dy = -r; dy <= r; dy++) {
      const half = Math.round(Math.sqrt(r * r - dy * dy));
      px(ctx, cx - half - 1, cy + dy, half * 2 + 3, 1, OUTLINE);
    }
    for (let dy = -r + 1; dy <= r - 1; dy++) {
      const half = Math.round(Math.sqrt((r - 1) * (r - 1) - dy * dy));
      px(ctx, cx - half, cy + dy, half * 2 + 1, 1, dy < 0 ? "#ffffff" : "#e6eef6");
    }
  };
  ball(x, y - 6, 6);
  ball(x, y - 16, 5);
  ball(x, y - 24, 4);
  px(ctx, x - 2, y - 26, 1, 1, OUTLINE);
  px(ctx, x + 1, y - 26, 1, 1, OUTLINE);
  px(ctx, x, y - 24, 3, 1, "#ff8a3d");
  px(ctx, x - 4, y - 21, 9, 2, "#e5484d");
  px(ctx, x + 2, y - 19, 2, 4, "#e5484d");
  px(ctx, x - 3, y - 32, 7, 4, "#2a2633");
  px(ctx, x - 5, y - 28, 11, 1, "#2a2633");
  const wave = Math.floor(t * 2) % 2;
  for (let i = 0; i < 5; i++) {
    px(ctx, x - 6 - i, y - 16 - Math.round(i * 0.6), 1, 1, "#6b4128");
    px(ctx, x + 6 + i, y - 16 - Math.round(i * (0.6 + wave * 0.4)), 1, 1, "#6b4128");
  }
  px(ctx, x, y - 15, 1, 1, OUTLINE);
  px(ctx, x, y - 12, 1, 1, OUTLINE);
}

function cocoaPot(ctx: Ctx, x: number, y: number): void {
  px(ctx, x - 7, y - 6, 14, 6, OUTLINE);
  px(ctx, x - 6, y - 5, 12, 4, "#c48a52");
  px(ctx, x - 3, y - 12, 7, 7, OUTLINE);
  px(ctx, x - 2, y - 11, 5, 5, "#b9c2cc");
  px(ctx, x + 4, y - 10, 2, 2, "#b9c2cc");
  px(ctx, x - 6, y - 8, 3, 3, "#fbfaf5");
  px(ctx, x - 6, y - 8, 3, 1, "#6b3e1e");
}

function dragon(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, t: number): void {
  const n = 7;
  for (let k = n - 1; k >= 0; k--) {
    const ang = t * 0.9 - k * 0.42;
    const x = Math.round(cx + Math.cos(ang) * rx);
    const y = Math.round(cy + Math.sin(ang) * ry - 10 + Math.sin(t * 6 - k) * 2);
    const dir = -Math.sin(ang) >= 0 ? 1 : -1;
    // The people under the dragon.
    px(ctx, x - 2, y + 5, 1, 5, "#2a2633");
    px(ctx, x + 1, y + 5, 1, 5, "#2a2633");
    if (k === 0) {
      px(ctx, x - 6, y - 5, 13, 10, OUTLINE);
      px(ctx, x - 5, y - 4, 11, 8, "#e5484d");
      px(ctx, x - 5, y + 1, 11, 2, "#ffd84a");
      px(ctx, x + dir * 2, y - 2, 2, 2, "#ffffff");
      px(ctx, x + dir * 2 + (dir > 0 ? 1 : 0), y - 2, 1, 1, OUTLINE);
      px(ctx, x - 4, y - 7, 2, 3, "#ffd84a");
      px(ctx, x + 3, y - 7, 2, 3, "#ffd84a");
      px(ctx, x + dir * 6, y, 3 * dir, 1, "#fbfaf5");
      px(ctx, x + dir * 5, y + 3, 4 * dir, 1, "#c4383f");
    } else {
      px(ctx, x - 4, y - 3, 9, 8, OUTLINE);
      px(ctx, x - 3, y - 2, 7, 6, k % 2 ? "#e5484d" : "#c4383f");
      px(ctx, x - 3, y + 2, 7, 2, "#ffd84a");
      px(ctx, x - 1, y - 4, 2, 2, "#ffd84a");
    }
  }
}

function maypole(ctx: Ctx, x: number, y: number, t: number): void {
  px(ctx, x - 4, y - 2, 9, 3, OUTLINE);
  px(ctx, x - 3, y - 1, 7, 1, "#8a5a34");
  for (let yy = y - 40; yy < y; yy++) px(ctx, x - 1, yy, 3, 1, (yy >> 2) % 2 ? "#fbfaf5" : "#5aa9e6");
  const colors = ["#ff6b8b", "#ffd84a", "#fbfaf5", "#c39bff"];
  for (let a = 0; a < 12; a++) {
    const ang = (a / 12) * Math.PI * 2 + t * 0.3;
    px(ctx, x + Math.cos(ang) * 5, y - 41 + Math.sin(ang) * 2, 2, 2, a % 3 ? "#3f9a5a" : colors[a % colors.length]!);
  }
}

function beerTable(ctx: Ctx, x: number, y: number, t: number): void {
  px(ctx, x - 24, y - 9, 48, 9, OUTLINE);
  px(ctx, x - 23, y - 8, 46, 6, "#c48a52");
  px(ctx, x - 23, y - 8, 46, 1, "#d9a066");
  for (let i = 0; i < 46; i += 4) px(ctx, x - 23 + i, y - 5, 2, 1, i % 8 ? "#fbfaf5" : "#5aa9e6");
  px(ctx, x - 20, y - 1, 2, 4, "#6b4128");
  px(ctx, x + 18, y - 1, 2, 4, "#6b4128");
  const foam = Math.floor(t * 2) % 2;
  for (const dx of [-15, -3, 9]) {
    px(ctx, x + dx - 1, y - 16, 7, 9, OUTLINE);
    px(ctx, x + dx, y - 14, 5, 6, "#f2c14e");
    px(ctx, x + dx, y - 15 - foam, 5, 2, "#fbfaf5");
    px(ctx, x + dx + 5, y - 13, 2, 3, OUTLINE);
  }
  // Pretzels
  for (const dx of [-9, 16]) {
    px(ctx, x + dx - 3, y - 11, 2, 2, "#b0632a");
    px(ctx, x + dx + 1, y - 11, 2, 2, "#b0632a");
    px(ctx, x + dx - 2, y - 9, 5, 1, "#b0632a");
  }
}

function holiBowls(ctx: Ctx, x: number, y: number): void {
  px(ctx, x - 16, y - 5, 32, 6, OUTLINE);
  px(ctx, x - 15, y - 4, 30, 4, "#c48a52");
  const colors = ["#ff4fa0", "#ffd84a", "#30c46c", "#3e8ed0"];
  colors.forEach((c, i) => {
    const bx = x - 12 + i * 8;
    px(ctx, bx - 3, y - 8, 7, 4, OUTLINE);
    px(ctx, bx - 2, y - 7, 5, 2, "#e6d3b8");
    px(ctx, bx - 2, y - 9, 5, 2, c);
    px(ctx, bx - 1, y - 10, 3, 1, c);
  });
}

function heartTable(ctx: Ctx, x: number, y: number, t: number): void {
  roundTable(ctx, x, y + 2, "#ffd6e5");
  heart(ctx, x - 3, y - 9, "#e5484d");
  // Box of chocolates and roses in a vase
  px(ctx, x + 4, y - 7, 8, 5, OUTLINE);
  px(ctx, x + 5, y - 6, 6, 3, "#6b3e1e");
  px(ctx, x + 6, y - 5, 1, 1, "#ffd84a");
  px(ctx, x + 9, y - 5, 1, 1, "#ffd84a");
  px(ctx, x - 11, y - 9, 3, 6, "#9fd8ff");
  for (const [dx, dy] of [[-12, -12], [-10, -13], [-9, -11]] as const) px(ctx, x + dx, y + dy, 2, 2, Math.floor(t + dx) % 5 ? "#e5484d" : "#ff6b8b");
}

// ------------------------------------------------------------------ the office, decorated

/** Run `fn` along the top of every wall section's baseboard. */
function alongRail(L: Layout, spacing: number, fn: (x: number, y: number, i: number) => void): void {
  let i = 0;
  for (const sg of L.segments) {
    for (let x = sg.x0 + 6 + (spacing >> 1); x < sg.x1 - 6; x += spacing) fn(x, sg.depth - 18, i++);
  }
}

/** Run `fn` along the ceiling, for things that hang down. */
function alongTop(L: Layout, spacing: number, fn: (x: number, i: number, sg: { x0: number; x1: number; depth: number }) => void): void {
  let i = 0;
  for (const sg of L.segments) {
    for (let x = sg.x0 + 10; x < sg.x1 - 8; x += spacing) fn(x, i++, sg);
  }
}

function railString(ctx: Ctx, L: Layout, color: string): void {
  for (const sg of L.segments) {
    for (let x = sg.x0 + 4; x < sg.x1 - 4; x++) px(ctx, x, sg.depth - 18 + Math.round(Math.abs(Math.sin((x - sg.x0) * 0.12)) * 2), 1, 1, color);
  }
}

/** Seasonal touches on the walls, windows and door. */
export function drawSeasonWall(ctx: Ctx, L: Layout, season: Season, t: number, night: number): void {
  const d = L.wall.door;
  const dcx = Math.round(d.x + d.w / 2);
  const dcy = d.y + 11;
  switch (season) {
    case "holidays": {
      const colors = ["#ffd84a", "#e5484d", "#5ad1ff", "#fbfaf5"];
      let n = 0;
      for (const sg of L.segments) {
        const y0 = sg.depth - 18;
        for (let x = sg.x0 + 4; x < sg.x1 - 4; x++) {
          const yy = y0 + Math.round(Math.abs(Math.sin((x - sg.x0) * 0.12)) * 3);
          px(ctx, x, yy, 1, 2, (x + yy) % 3 ? "#2f8f4e" : "#3fa85f");
          if ((x - sg.x0) % 9 === 4) {
            const on = Math.floor(t * 1.5 + n) % 3 !== 0 || night < 0.3;
            px(ctx, x, yy + 2, 1, 2, on ? colors[n % colors.length]! : "#6b5a5a");
            n++;
          }
        }
      }
      for (let a = 0; a < 16; a++) {
        const ang = (a / 16) * Math.PI * 2;
        px(ctx, dcx + Math.cos(ang) * 4 - 1, dcy + Math.sin(ang) * 4 - 1, 2, 2, a % 3 ? "#2f8f4e" : "#257a42");
      }
      px(ctx, dcx - 2, dcy + 3, 2, 2, "#e5484d");
      px(ctx, dcx + 1, dcy + 3, 2, 2, "#e5484d");
      px(ctx, dcx, dcy + 4, 1, 3, "#e5484d");
      for (const w of L.wall.windows) {
        px(ctx, w.x, w.y + w.h, w.w + 2, 1, "#ffffff");
        px(ctx, w.x + 2, w.y + w.h - 1, w.w - 3, 1, "#ffffff");
      }
      break;
    }
    case "halloween":
      ctx.fillStyle = "rgba(240,240,250,0.7)";
      for (const w of L.wall.windows) {
        const x = w.x + 4;
        const y = w.y + 3;
        for (let i = 0; i < 7; i++) {
          ctx.fillRect(x + i, y, 1, 1);
          ctx.fillRect(x, y + i, 1, 1);
          ctx.fillRect(x + i, y + i, 1, 1);
        }
        for (const [dx, dy] of [[3, 1], [1, 3], [5, 3], [3, 5]] as const) ctx.fillRect(x + dx, y + dy, 1, 1);
      }
      break;
    case "laternenfest": {
      const colors = ["#ff8a3d", "#e5484d", "#ffd84a", "#5ad1ff", "#86e07f"];
      alongTop(L, 34, (x, i) => {
        const drop = 6 + (i % 3) * 4;
        px(ctx, x, 3, 1, drop, "#6b5a4a");
        paperLantern(ctx, x, 3 + drop, colors[i % colors.length]!, t, i, night > 0.2);
      });
      break;
    }
    case "thanksgiving": {
      railString(ctx, L, "#8a5a34");
      const leaves = ["#e5484d", "#ff8a3d", "#d9a531", "#b0632a"];
      alongRail(L, 7, (x, y, i) => {
        const yy = y + Math.round(Math.abs(Math.sin(i * 0.9)) * 2);
        px(ctx, x - 1, yy, 3, 2, leaves[i % leaves.length]!);
        px(ctx, x, yy + 2, 1, 1, leaves[(i + 1) % leaves.length]!);
      });
      for (let a = 0; a < 14; a++) {
        const ang = (a / 14) * Math.PI * 2;
        px(ctx, dcx + Math.cos(ang) * 4 - 1, dcy + Math.sin(ang) * 4 - 1, 2, 2, leaves[a % leaves.length]!);
      }
      break;
    }
    case "valentines":
      railString(ctx, L, "#ff9fb2");
      alongRail(L, 12, (x, y, i) => heart(ctx, x - 2, y + 1, i % 2 ? "#e5484d" : "#ff6b8b", false));
      heart(ctx, dcx - 3, dcy - 3, "#e5484d");
      break;
    case "stpatricks":
      railString(ctx, L, "#257a42");
      alongRail(L, 11, (x, y, i) => (i % 2 ? shamrock(ctx, x, y + 3) : px(ctx, x, y + 2, 2, 2, "#ffd84a")));
      shamrock(ctx, dcx - 1, dcy);
      shamrock(ctx, dcx + 2, dcy + 2);
      break;
    case "easter":
      railString(ctx, L, "#c9b8ff");
      alongRail(L, 13, (x, y, i) => {
        const [c, s] = EGG_COLORS[i % EGG_COLORS.length]!;
        egg(ctx, x, y + 7, c, s);
      });
      break;
    case "diwali": {
      // Diyas along the baseboards, a marigold toran over the door.
      alongRail(L, 16, (x, y, i) => diya(ctx, x, y + 1, t, i));
      for (let x = d.x - 3; x <= d.x + d.w + 3; x += 2) {
        const sag = Math.round(Math.sin(((x - d.x + 3) / (d.w + 6)) * Math.PI) * 3);
        px(ctx, x, d.y - 1 + sag, 2, 2, (x >> 1) % 2 ? "#ff9a3d" : "#ffd84a");
      }
      break;
    }
    case "holi": {
      const colors = ["#ff4fa0", "#ffd84a", "#30c46c", "#3e8ed0", "#8e5bd8"];
      alongRail(L, 23, (x, y, i) => {
        ctx.globalAlpha = 0.55;
        const c = colors[i % colors.length]!;
        px(ctx, x - 4, y - 6, 8, 5, c);
        px(ctx, x - 2, y - 8, 5, 9, c);
        px(ctx, x + 4, y - 9, 2, 2, c);
        px(ctx, x - 6, y - 2, 2, 2, c);
        ctx.globalAlpha = 1;
      });
      break;
    }
    case "summer": {
      const colors = ["#ff6b8b", "#ffd84a", "#5ad1ff", "#86e07f", "#ff9a3d"];
      alongTop(L, 8, (x, i) => {
        px(ctx, x - 3, 6, 7, 1, "#4a3a46");
        const c = colors[i % colors.length]!;
        px(ctx, x - 2, 7, 5, 2, c);
        px(ctx, x - 1, 9, 3, 2, c);
        px(ctx, x, 11, 1, 1, c);
      });
      break;
    }
    case "snowday":
      // Paper snowflakes on the panes, snow on the sills.
      for (const w of L.wall.windows) {
        for (const [fx, fy] of [[w.x + 7, w.y + 6], [w.x + w.w - 8, w.y + w.h - 9]] as const) {
          px(ctx, fx - 2, fy, 5, 1, "#ffffff");
          px(ctx, fx, fy - 2, 1, 5, "#ffffff");
          px(ctx, fx - 1, fy - 1, 1, 1, "#ffffff");
          px(ctx, fx + 1, fy + 1, 1, 1, "#ffffff");
          px(ctx, fx + 1, fy - 1, 1, 1, "#ffffff");
          px(ctx, fx - 1, fy + 1, 1, 1, "#ffffff");
        }
        px(ctx, w.x, w.y + w.h, w.w + 2, 1, "#ffffff");
      }
      break;
    case "lunarnewyear": {
      alongTop(L, 30, (x, i) => {
        const drop = 5 + (i % 2) * 4;
        px(ctx, x, 3, 1, drop, "#8a3e1a");
        paperLantern(ctx, x, 3 + drop, "#e5484d", t, i, night > 0.2);
        px(ctx, x, 3 + drop + 8, 1, 3, "#ffd84a");
      });
      // Red couplets either side of the door.
      for (const cx of [d.x - 7, d.x + d.w + 3]) {
        px(ctx, cx, d.y + 4, 4, 30, "#c4383f");
        for (let y = d.y + 7; y < d.y + 32; y += 6) px(ctx, cx + 1, y, 2, 2, "#ffd84a");
      }
      px(ctx, dcx - 3, dcy - 3, 7, 7, "#c4383f");
      px(ctx, dcx - 1, dcy - 1, 3, 3, "#ffd84a");
      break;
    }
    case "spring": {
      railString(ctx, L, "#5a9a4a");
      const petals = ["#ff9fb2", "#ffd84a", "#fbfaf5", "#c39bff"];
      alongRail(L, 9, (x, y, i) => {
        const c = petals[i % petals.length]!;
        px(ctx, x - 1, y + 1, 3, 1, c);
        px(ctx, x, y, 1, 3, c);
        px(ctx, x, y + 1, 1, 1, "#ff9a3d");
      });
      break;
    }
    case "oktoberfest": {
      // Blue-and-white bunting and a pretzel on the door.
      alongTop(L, 6, (x, i) => {
        px(ctx, x - 3, 6, 7, 1, "#4a3a46");
        const c = i % 2 ? "#fbfaf5" : "#5aa9e6";
        px(ctx, x - 2, 7, 5, 2, c);
        px(ctx, x - 1, 9, 3, 1, c);
        px(ctx, x, 10, 1, 1, c);
      });
      const pc = "#b0632a";
      px(ctx, dcx - 4, dcy - 2, 3, 2, pc);
      px(ctx, dcx + 2, dcy - 2, 3, 2, pc);
      px(ctx, dcx - 5, dcy, 2, 3, pc);
      px(ctx, dcx + 4, dcy, 2, 3, pc);
      px(ctx, dcx - 3, dcy + 3, 7, 1, pc);
      px(ctx, dcx - 1, dcy - 1, 3, 3, pc);
      px(ctx, dcx - 2, dcy + 1, 1, 1, "#fbfaf5");
      px(ctx, dcx + 2, dcy, 1, 1, "#fbfaf5");
      break;
    }
    case "carnival": {
      const colors = ["#e5484d", "#ffd84a", "#3e8ed0", "#30a46c", "#ff6b8b"];
      alongTop(L, 15, (x, i) => {
        const c = colors[i % colors.length]!;
        const len = 10 + (i % 4) * 3;
        for (let y = 4; y < 4 + len; y++) px(ctx, x + Math.round(Math.sin(y * 0.7 + i + t * 0.5) * 1.5), y, 1, 1, c);
      });
      // A mask on the door.
      px(ctx, dcx - 5, dcy - 2, 11, 5, OUTLINE);
      px(ctx, dcx - 4, dcy - 1, 9, 3, "#ffd84a");
      px(ctx, dcx - 3, dcy, 2, 1, OUTLINE);
      px(ctx, dcx + 1, dcy, 2, 1, OUTLINE);
      px(ctx, dcx - 6, dcy - 3, 2, 2, "#e5484d");
      px(ctx, dcx + 5, dcy - 3, 2, 2, "#3e8ed0");
      break;
    }
  }
}

/** Under-foot decorations: a rangoli at the door, confetti, colored powder. */
export function drawSeasonFloor(ctx: Ctx, L: Layout, season: Season): void {
  const e = L.entrance;
  switch (season) {
    case "diwali":
      rangoli(ctx, e.x, e.y + 16, 11);
      break;
    case "carnival": {
      const colors = ["#e5484d", "#ffd84a", "#3e8ed0", "#30a46c", "#ff6b8b"];
      for (let i = 0; i < 46; i++) px(ctx, e.x - 30 + ((i * 37) % 60), e.y + 6 + ((i * 23) % 30), 1, 1, colors[i % colors.length]!);
      break;
    }
    case "holi": {
      const colors = ["#ff4fa0", "#ffd84a", "#30c46c", "#3e8ed0"];
      ctx.globalAlpha = 0.4;
      for (let i = 0; i < 5; i++) px(ctx, e.x - 26 + i * 11, e.y + 10 + (i % 2) * 6, 9, 4, colors[i % colors.length]!);
      ctx.globalAlpha = 1;
      break;
    }
    default:
      break;
  }
}

/** Upright seasonal things around the office, depth-sorted with everyone. */
export function seasonItems(ctx: Ctx, L: Layout, season: Season, t: number, night: number): Drawable[] {
  const out: Drawable[] = [];
  const bell = L.pokeables.find((q) => q.id === "bell");
  const desk = bell ? { x: bell.rect.x + 30, y: bell.rect.y + 14 } : null;
  const door = { x: L.wall.door.x + L.wall.door.w + 8, y: L.wall.door.y + L.wall.door.h + 6 };
  const corner = { x: L.boss.room.x + 44, y: L.boss.room.y + L.boss.room.h - 10 };
  const at = (p: Point | null, draw: (p: Point) => void) => {
    if (p) out.push({ z: p.y + 1, draw: () => draw(p) });
  };
  switch (season) {
    case "halloween":
      at(corner, (p) => drawPumpkin(ctx, p.x, p.y, t, night > 0.2, 2));
      at(desk, (p) => drawPumpkin(ctx, p.x, p.y, t, night > 0.2, 1));
      at(door, (p) => drawPumpkin(ctx, p.x, p.y, t, night > 0.2, 1));
      break;
    case "thanksgiving":
      at(corner, (p) => {
        drawPumpkin(ctx, p.x, p.y, t, false, 2, false);
        drawPumpkin(ctx, p.x + 12, p.y + 1, t, false, 1, false);
      });
      at(door, (p) => drawPumpkin(ctx, p.x, p.y, t, false, 1, false));
      break;
    case "laternenfest":
      at(desk, (p) => paperLantern(ctx, p.x, p.y - 9, "#ff8a3d", t, 1, true));
      break;
    case "valentines":
      at(desk, (p) => {
        px(ctx, p.x - 2, p.y - 6, 4, 6, "#9fd8ff");
        for (const [dx, dy] of [[-3, -9], [0, -10], [2, -8]] as const) px(ctx, p.x + dx, p.y + dy, 2, 2, "#e5484d");
      });
      break;
    case "stpatricks":
      at(door, (p) => potOfGold(ctx, p.x + 4, p.y, false, t));
      break;
    case "diwali":
      at(desk, (p) => {
        diya(ctx, p.x - 4, p.y - 1, t, 0);
        diya(ctx, p.x + 4, p.y - 1, t, 2);
      });
      break;
    case "lunarnewyear":
      at(desk, (p) => {
        px(ctx, p.x - 6, p.y - 3, 12, 4, OUTLINE);
        px(ctx, p.x - 5, p.y - 2, 10, 2, "#e8f0f8");
        for (let i = 0; i < 4; i++) px(ctx, p.x - 5 + i * 3, p.y - 5 - (i % 2), 3, 3, "#ff9a3d");
      });
      break;
    case "spring":
      at(desk, (p) => {
        px(ctx, p.x - 3, p.y - 4, 6, 4, "#c4622d");
        for (const [dx, c] of [[-3, "#ff6b8b"], [0, "#ffd84a"], [3, "#e5484d"]] as const) {
          px(ctx, p.x + dx, p.y - 9, 1, 5, "#3f9a5a");
          px(ctx, p.x + dx - 1, p.y - 11, 3, 2, c);
        }
      });
      break;
    case "oktoberfest":
      at(door, (p) => {
        px(ctx, p.x - 6, p.y - 10, 12, 10, OUTLINE);
        px(ctx, p.x - 5, p.y - 9, 10, 8, "#a86c3a");
        px(ctx, p.x - 5, p.y - 7, 10, 1, "#6b4128");
        px(ctx, p.x - 5, p.y - 3, 10, 1, "#6b4128");
        px(ctx, p.x - 1, p.y - 6, 2, 2, "#3a3546");
      });
      break;
    case "summer":
      at({ x: L.couch.x + L.couch.w + 8, y: L.couch.y + 30 }, (p) => {
        px(ctx, p.x - 4, p.y - 8, 9, 8, OUTLINE);
        px(ctx, p.x - 3, p.y - 7, 7, 6, "#fbfaf5");
        px(ctx, p.x - 3, p.y - 7, 3, 3, "#e5484d");
        px(ctx, p.x + 1, p.y - 4, 3, 3, "#3e8ed0");
      });
      break;
    default:
      break;
  }
  return out;
}

/** Hidden eggs around the office at Easter (next to the plants). */
export function eggSpots(L: Layout): Point[] {
  const out: Point[] = [];
  for (const pl of L.plants) {
    const w = pl.sprite === "LARGE_PLANT" ? 32 : 16;
    const p = { x: Math.round(Math.min(L.W - 6, pl.x + w + 4)), y: Math.round(Math.min(L.H - 2, pl.z + 1)) };
    if (!out.some((q) => Math.abs(q.x - p.x) + Math.abs(q.y - p.y) < 20)) out.push(p);
    if (out.length >= 6) break;
  }
  return out;
}

export function drawEgg(ctx: Ctx, p: Point, i: number): void {
  const [c, s] = EGG_COLORS[i % EGG_COLORS.length]!;
  egg(ctx, p.x, p.y, c, s);
}

type Light = [number, number, number, number, string, number];

/** Warm little lights from the decorations, for the night lighting pass. */
export function seasonLights(L: Layout, season: Season): Light[] {
  const out: Light[] = [];
  if (season === "laternenfest") {
    alongTop(L, 34, (x, i) => out.push([x, 3 + 6 + (i % 3) * 4 + 3, 14, 0.8, "#ffcf8a", 0.18]));
  } else if (season === "diwali") {
    alongRail(L, 16, (x, y) => out.push([x, y - 2, 12, 0.85, "#ffcf6a", 0.2]));
  } else if (season === "halloween") {
    const c = L.boss.room;
    out.push([c.x + 44, c.y + c.h - 14, 18, 0.8, "#ff9a3d", 0.2]);
  }
  return out;
}

/** Seasonal weather and goings-on outside the windows. */
export function paintSeasonSky(ctx: Ctx, season: Season, win: Rect, index: number, t: number, night: number): void {
  const { x, y, w, h } = win;
  switch (season) {
    case "holidays":
    case "snowday":
      for (let i = 0; i < Math.round(w / 3); i++) {
        const fx = x + ((((i * 23 + Math.floor(Math.sin(t * 0.8 + i) * 2)) % w) + w) % w);
        const fy = y + ((i * 17 + Math.floor(t * (6 + (i % 3) * 2))) % h);
        px(ctx, fx, fy, 1, 1, "#ffffff");
      }
      break;
    case "thanksgiving": {
      const colors = ["#e5484d", "#ff8a3d", "#d9a531"];
      for (let i = 0; i < Math.round(w / 8); i++) {
        const fx = x + ((((i * 31 + Math.floor(t * 5)) % w) + w) % w);
        const fy = y + ((i * 19 + Math.floor(t * 7)) % h);
        px(ctx, fx, fy, 2, 1, colors[i % colors.length]!);
      }
      break;
    }
    case "halloween":
      if (night > 0.4 && index === 0) {
        const bp = (t * 14) % 180;
        if (bp < w + 10) {
          const bx = x + bp - 5;
          const by = y + 10 + Math.sin(t * 3) * 3;
          const flap = Math.floor(t * 8) % 2;
          px(ctx, bx + 2, by, 2, 2, "#1a1722");
          px(ctx, bx, by - flap, 2, 1, "#1a1722");
          px(ctx, bx + 4, by - flap, 2, 1, "#1a1722");
        }
      }
      break;
    case "laternenfest":
      // A lantern walk passes by down in the street.
      if (night > 0.15) {
        const colors = ["#ffcf6a", "#ff9a3d", "#fff3a3"];
        for (let i = 0; i < 9; i++) {
          const lx = x + ((((t * 3 + index * 17 - i * 6) % (w + 60)) + w + 60) % (w + 60)) - 30;
          if (lx < x || lx >= x + w) continue;
          px(ctx, lx, y + h - 4 - (i % 2), 1, 1, colors[i % colors.length]!);
        }
      }
      break;
    case "diwali":
      if (night > 0.4) {
        // Fireworks over the city.
        const cycle = (t + index * 1.7) % 3.2;
        if (cycle < 1.2) {
          const fx = x + 8 + ((Math.floor((t + index * 1.7) / 3.2) * 13) % Math.max(1, w - 16));
          const fy = y + 8 + ((Math.floor((t + index) / 3.2) * 7) % Math.max(1, h / 2));
          const colors = ["#ffd84a", "#ff6b8b", "#5ad1ff", "#86e07f"];
          const r = cycle * 7;
          for (let a = 0; a < 10; a++) {
            const ang = (a / 10) * Math.PI * 2;
            px(ctx, fx + Math.cos(ang) * r, fy + Math.sin(ang) * r, 1, 1, colors[(a + Math.floor(t)) % colors.length]!);
          }
        }
      }
      break;
    case "stpatricks":
      if (night < 0.3 && index === 0) {
        const colors = ["#e5484d", "#ff9a3d", "#ffd84a", "#30a46c", "#3e8ed0", "#8e5bd8"];
        ctx.globalAlpha = 0.5;
        colors.forEach((c, i) => {
          const r = w * 0.55 - i;
          for (let a = 0; a <= 60; a++) {
            const ang = Math.PI + (a / 60) * Math.PI;
            px(ctx, x + w / 2 + Math.cos(ang) * r, y + h + Math.sin(ang) * r * 0.7, 1, 1, c);
          }
        });
        ctx.globalAlpha = 1;
      }
      break;
    default:
      break;
  }
}

// ------------------------------------------------------------------ party accessories

/**
 * What people wear or carry at a seasonal party. `y` is the character's draw
 * baseline (feet); `splash` counts Holi color hits.
 */
export function drawAccessory(ctx: Ctx, kind: string, ax: number, y: number, seed: number, t: number, facing: Facing, splash = 0): void {
  const top = Math.round(y - 24); // top of the head
  const x = Math.round(ax);
  const front = facing === "front";
  const side = facing === "left" || facing === "right";
  switch (kind) {
    case "holiday": {
      const hx = x - 6;
      const hy = top - 2;
      const lean = seed % 2 ? 1 : -1;
      px(ctx, hx - 1, hy - 1, 14, 4, OUTLINE);
      px(ctx, hx + 2, hy - 5, 8, 5, OUTLINE);
      px(ctx, hx + 3, hy - 4, 6, 3, "#e5484d");
      px(ctx, hx + 5 + lean * 2, hy - 6, 3, 2, "#e5484d");
      px(ctx, hx, hy, 12, 2, "#fbfaf5");
      px(ctx, hx + 6 + lean * 4, hy - 7, 2, 2, "#fbfaf5");
      break;
    }
    case "halloween":
      if (seed % 3 === 0) {
        px(ctx, x - 8, top - 1, 16, 3, OUTLINE);
        px(ctx, x - 4, top - 7, 8, 7, OUTLINE);
        px(ctx, x - 1, top - 10, 4, 4, OUTLINE);
        px(ctx, x - 7, top, 14, 1, "#3a3046");
        px(ctx, x - 3, top - 6, 6, 6, "#3a3046");
        px(ctx, x, top - 9, 2, 3, "#3a3046");
        px(ctx, x - 3, top - 2, 6, 1, "#8e5bd8");
      } else if (seed % 3 === 1) {
        px(ctx, x - 7, top - 3, 4, 4, OUTLINE);
        px(ctx, x + 3, top - 3, 4, 4, OUTLINE);
        px(ctx, x - 6, top - 2, 2, 2, "#2a2633");
        px(ctx, x + 4, top - 2, 2, 2, "#2a2633");
        px(ctx, x - 6, top - 1, 1, 1, "#ff9fb2");
        px(ctx, x + 5, top - 1, 1, 1, "#ff9fb2");
      } else {
        px(ctx, x - 6, top + 11, 12, 2, "#ff8a3d");
        px(ctx, x - 7, top + 13, 2, 8, "#3a3046");
        px(ctx, x + 5, top + 13, 2, 8, "#3a3046");
      }
      break;
    case "stpatricks": {
      // Green top hat with a gold buckle.
      px(ctx, x - 8, top - 1, 15, 3, OUTLINE);
      px(ctx, x - 5, top - 9, 9, 9, OUTLINE);
      px(ctx, x - 7, top, 13, 1, "#257a42");
      px(ctx, x - 4, top - 8, 7, 8, "#30a46c");
      px(ctx, x - 4, top - 3, 7, 2, "#2a2633");
      px(ctx, x - 1, top - 3, 2, 2, "#ffd84a");
      break;
    }
    case "easter": {
      // Bunny ears.
      const wob = Math.floor(t * 2 + seed) % 2;
      for (const ex of [x - 5, x + 2]) {
        px(ctx, ex - 1, top - 9 + (ex > x ? wob : 0), 4, 10, OUTLINE);
        px(ctx, ex, top - 8 + (ex > x ? wob : 0), 2, 8, "#fbfaf5");
        px(ctx, ex + (ex > x ? 0 : 1), top - 7 + (ex > x ? wob : 0), 1, 5, "#ffb3c8");
      }
      break;
    }
    case "carnival": {
      // A jester's cap with bells.
      const bells = Math.floor(t * 4 + seed) % 2;
      px(ctx, x - 8, top - 3, 16, 4, OUTLINE);
      px(ctx, x - 7, top - 2, 7, 3, "#e5484d");
      px(ctx, x, top - 2, 7, 3, "#ffd84a");
      px(ctx, x - 11, top - 5 - bells, 5, 3, OUTLINE);
      px(ctx, x + 6, top - 5 - (1 - bells), 5, 3, OUTLINE);
      px(ctx, x - 10, top - 4 - bells, 3, 1, "#e5484d");
      px(ctx, x + 7, top - 4 - (1 - bells), 3, 1, "#ffd84a");
      px(ctx, x - 11, top - 4 - bells, 1, 1, "#fff3a3");
      px(ctx, x + 10, top - 4 - (1 - bells), 1, 1, "#fff3a3");
      break;
    }
    case "summer":
      if (front) {
        px(ctx, x - 6, top + 4, 11, 3, OUTLINE);
        px(ctx, x - 5, top + 5, 4, 1, "#3a3546");
        px(ctx, x + 1, top + 5, 4, 1, "#3a3546");
        px(ctx, x - 5, top + 5, 1, 1, "#9fd8ff");
      } else if (side) {
        const sx = facing === "right" ? x : x - 6;
        px(ctx, sx, top + 4, 7, 3, OUTLINE);
        px(ctx, sx + 1, top + 5, 5, 1, "#3a3546");
      }
      break;
    case "diwali":
      // A marigold garland.
      for (let i = 0; i < 7; i++) px(ctx, x - 5 + i * 1.5, top + 11 + Math.round(Math.sin((i / 6) * Math.PI) * 2), 2, 1, i % 2 ? "#ff9a3d" : "#ffd84a");
      break;
    case "valentines": {
      const bob = Math.floor(t * 3 + seed) % 2;
      px(ctx, x - 6, top - 1, 12, 1, "#2a2633");
      for (const hx of [x - 6, x + 3]) {
        px(ctx, hx + 1, top - 4, 1, 3, "#2a2633");
        heart(ctx, hx - 1, top - 8 - bob, "#ff6b8b");
      }
      break;
    }
    case "snowday": {
      // A knitted beanie and scarf.
      px(ctx, x - 7, top - 3, 13, 6, OUTLINE);
      px(ctx, x - 6, top - 2, 11, 4, "#e5484d");
      px(ctx, x - 6, top, 11, 1, "#fbfaf5");
      px(ctx, x - 2, top - 5, 3, 3, OUTLINE);
      px(ctx, x - 1, top - 4, 1, 1, "#fbfaf5");
      px(ctx, x - 5, top + 11, 9, 2, "#3e8ed0");
      px(ctx, x - 5, top + 11, 2, 2, "#fbfaf5");
      px(ctx, x + 2, top + 13, 2, 4, "#3e8ed0");
      break;
    }
    case "lunarnewyear":
      // A red envelope.
      px(ctx, x + 4, top + 12, 4, 5, OUTLINE);
      px(ctx, x + 5, top + 13, 2, 3, "#e5484d");
      px(ctx, x + 5, top + 14, 2, 1, "#ffd84a");
      break;
    case "maifest": {
      // A flower crown.
      const colors = ["#ff6b8b", "#ffd84a", "#fbfaf5", "#c39bff"];
      px(ctx, x - 7, top, 13, 1, "#3f9a5a");
      for (let i = 0; i < 5; i++) px(ctx, x - 7 + i * 3, top - 1, 2, 2, colors[(i + seed) % colors.length]!);
      break;
    }
    case "oktoberfest": {
      // A green felt hat with a feather.
      px(ctx, x - 8, top - 1, 15, 3, OUTLINE);
      px(ctx, x - 5, top - 6, 10, 6, OUTLINE);
      px(ctx, x - 7, top, 13, 1, "#3f6b3a");
      px(ctx, x - 4, top - 5, 8, 5, "#2f5a2c");
      px(ctx, x - 4, top - 2, 8, 1, "#c4383f");
      px(ctx, x + 4, top - 9, 1, 5, "#fbfaf5");
      px(ctx, x + 5, top - 10, 1, 3, "#8a5a34");
      break;
    }
    case "holi": {
      const colors = ["#ff4fa0", "#ffd84a", "#30c46c", "#3e8ed0", "#8e5bd8"];
      for (let i = 0; i < Math.min(14, splash * 2 + 1); i++) {
        const h = (seed * 31 + i * 17) >>> 0;
        const sx = x - 6 + (h % 11);
        const sy = top + 2 + ((h >> 4) % 19);
        px(ctx, sx, sy, 2, 2, colors[(h >> 8) % colors.length]!);
      }
      break;
    }
    default:
      break;
  }
}

/** A paper lantern on a stick, held out in front while walking. */
export function drawCarriedLantern(ctx: Ctx, ax: number, y: number, facing: Facing, seed: number, t: number, lit: boolean): Point {
  const dir = facing === "left" ? -1 : 1;
  const hx = Math.round(ax + dir * 6);
  const hy = Math.round(y - 13);
  for (let i = 0; i < 6; i++) px(ctx, hx + dir * i, hy - i, 1, 1, "#8a5a34");
  const lx = hx + dir * 6;
  const ly = hy - 5 + Math.round(Math.sin(t * 3 + seed) * 0.6);
  px(ctx, lx, ly, 1, 2, "#6b5a4a");
  const colors = ["#ff8a3d", "#e5484d", "#ffd84a", "#5ad1ff", "#86e07f", "#c39bff"];
  paperLantern(ctx, lx, ly + 2, colors[seed % colors.length]!, t, seed, lit);
  return { x: lx, y: ly + 5 };
}

// ------------------------------------------------------------------ party decor

/** Floor-level decor for seasonal parties. */
export function seasonalEventFloor(ctx: Ctx, plan: EventPlan, t: number, night: number): void {
  const { kind, center: c, area } = plan;
  switch (kind) {
    case "holiday":
      px(ctx, c.x - 22, c.y - 6, 44, 12, "#8a2f3a");
      px(ctx, c.x - 20, c.y - 5, 40, 10, "#b8434f");
      for (let x = c.x - 18; x < c.x + 18; x += 6) px(ctx, x, c.y - 1, 2, 2, "#fbfaf5");
      break;
    case "halloween":
      ctx.globalAlpha = 0.18 + night * 0.12;
      for (let i = 0; i < 7; i++) {
        const x = c.x - area.w * 0.4 + ((i * 37 + t * 4) % (area.w * 0.8));
        px(ctx, x - 8, c.y + 6 + Math.sin(t + i) * 3, 16, 3, "#8e5bd8");
      }
      ctx.globalAlpha = 1;
      break;
    case "diwali":
      rangoli(ctx, c.x, c.y, 16);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        diya(ctx, Math.round(c.x + Math.cos(a) * 24), Math.round(c.y + Math.sin(a) * 11), t, i);
      }
      break;
    case "holi": {
      const colors = ["#ff4fa0", "#ffd84a", "#30c46c", "#3e8ed0", "#8e5bd8"];
      const n = Math.min(14, 4 + Math.floor((t % 1000) / 6));
      ctx.globalAlpha = 0.35;
      for (let i = 0; i < n; i++) {
        const x = c.x - area.w * 0.4 + ((i * 41) % (area.w * 0.8));
        const y = c.y - area.h * 0.3 + ((i * 23) % (area.h * 0.6));
        px(ctx, x - 5, y - 2, 10, 4, colors[i % colors.length]!);
        px(ctx, x - 3, y - 3, 6, 6, colors[i % colors.length]!);
      }
      ctx.globalAlpha = 1;
      break;
    }
    case "summer":
      // A picnic blanket.
      for (let yy = 0; yy < 12; yy += 3) {
        for (let xx = 0; xx < 36; xx += 3) px(ctx, c.x - 18 + xx, c.y - 4 + yy, 3, 3, ((xx + yy) / 3) % 2 ? "#e5484d" : "#fbfaf5");
      }
      break;
    case "carnival": {
      const colors = ["#e5484d", "#ffd84a", "#3e8ed0", "#30a46c", "#ff6b8b"];
      for (let i = 0; i < 6; i++) {
        const x0 = area.x + 10 + ((i * 53) % Math.max(1, area.w - 30));
        const y0 = c.y - 10 + ((i * 29) % 24);
        for (let k = 0; k < 14; k++) px(ctx, x0 + k, y0 + Math.round(Math.sin(k * 0.9 + i) * 2), 1, 1, colors[i % colors.length]!);
      }
      for (let i = 0; i < 60; i++) px(ctx, area.x + ((i * 37) % area.w), area.y + 12 + ((i * 23) % Math.max(1, area.h - 14)), 1, 1, colors[i % colors.length]!);
      break;
    }
    case "valentines":
      for (let i = 0; i < 18; i++) px(ctx, c.x - 30 + ((i * 29) % 60), c.y - 10 + ((i * 17) % 24), 2, 1, i % 2 ? "#e5484d" : "#ff9fb2");
      break;
    case "thanksgiving": {
      const leaves = ["#e5484d", "#ff8a3d", "#d9a531", "#b0632a"];
      for (let i = 0; i < 22; i++) px(ctx, area.x + 6 + ((i * 43) % Math.max(1, area.w - 12)), area.y + 14 + ((i * 19) % Math.max(1, area.h - 16)), 2, 1, leaves[i % leaves.length]!);
      break;
    }
    case "easter":
      ctx.globalAlpha = 0.5;
      for (let i = 0; i < 16; i++) px(ctx, c.x - 34 + ((i * 31) % 68), c.y - 12 + ((i * 13) % 26), 3, 1, "#86c96f");
      ctx.globalAlpha = 1;
      break;
    case "snowday":
      px(ctx, c.x - 22, c.y - 3, 30, 7, "#eef4fa");
      px(ctx, c.x - 20, c.y - 5, 26, 2, "#eef4fa");
      break;
    case "lunarnewyear":
      px(ctx, c.x - 30, c.y - 8, 60, 16, "#a62d35");
      px(ctx, c.x - 28, c.y - 6, 56, 12, "#c4383f");
      for (let x = c.x - 26; x < c.x + 26; x += 8) px(ctx, x, c.y - 1, 3, 2, "#ffd84a");
      break;
    case "maifest": {
      const petals = ["#ff9fb2", "#ffd84a", "#fbfaf5", "#c39bff"];
      for (let i = 0; i < 24; i++) px(ctx, c.x - 40 + ((i * 37) % 80), c.y - 14 + ((i * 17) % 30), 1, 1, petals[i % petals.length]!);
      break;
    }
    default:
      break;
  }
}

/** Upright decor for seasonal parties. */
export function seasonalEventDecor(ctx: Ctx, plan: EventPlan, t: number): Drawable[] {
  const { kind, center: c, area } = plan;
  const out: Drawable[] = [];
  switch (kind) {
    case "holiday":
      out.push({
        z: c.y + 4,
        draw: () => {
          drawTree(ctx, c.x, c.y + 4, 30, t);
          gift(ctx, c.x - 10, c.y + 4, "#e5484d", "#ffd84a");
          gift(ctx, c.x + 9, c.y + 4, "#30a46c", "#fbfaf5");
          gift(ctx, c.x - 4, c.y + 6, "#3e8ed0", "#fbfaf5");
          gift(ctx, c.x + 4, c.y + 7, "#ffd84a", "#e5484d");
        },
      });
      break;
    case "halloween":
      out.push({
        z: c.y + 2,
        draw: () => {
          px(ctx, c.x - 9, c.y - 8, 18, 10, OUTLINE);
          px(ctx, c.x - 8, c.y - 7, 16, 8, "#3a3546");
          px(ctx, c.x - 7, c.y - 8, 14, 2, "#86e07f");
          for (let i = 0; i < 3; i++) px(ctx, c.x - 4 + i * 4 + Math.sin(t * 2 + i), c.y - 10 - ((t * 6 + i * 3) % 7), 1, 1, "#b6f5a0");
          for (const [dx, col] of [[-12, "#ff6b8b"], [11, "#ffd84a"], [-14, "#8e5bd8"]] as const) px(ctx, c.x + dx, c.y, 2, 2, col);
        },
      });
      for (const [dx, dy, size] of [[-area.w * 0.36, 10, 2], [area.w * 0.36, 12, 1], [area.w * 0.3, -8, 1]] as const) {
        const p = { x: Math.round(c.x + dx), y: Math.round(c.y + dy) };
        out.push({ z: p.y, draw: () => drawPumpkin(ctx, p.x, p.y, t, true, size) });
      }
      break;
    case "lanterns":
      out.push({ z: c.y + 2, draw: () => bonfire(ctx, c.x, c.y + 2, t) });
      break;
    case "thanksgiving":
      out.push({ z: c.y + 2, draw: () => feastTable(ctx, c.x, c.y + 2) });
      break;
    case "valentines":
      out.push({ z: c.y + 2, draw: () => heartTable(ctx, c.x, c.y, t) });
      for (const bx of [area.x + 14, area.x + area.w - 14]) {
        out.push({
          z: c.y + 8,
          draw: () => {
            for (let i = 0; i < 3; i++) {
              const hx = bx - 6 + i * 5 + Math.round(Math.sin(t * 1.3 + i));
              const hy = c.y - 22 - (i % 2) * 5 + Math.round(Math.sin(t * 1.7 + i * 2) * 1.5);
              for (let yy = hy + 6; yy < c.y + 7; yy += 2) px(ctx, bx + (hx - bx) * ((c.y + 7 - yy) / (c.y + 7 - hy)), yy, 1, 1, "#6b5a6e");
              heart(ctx, hx - 2, hy, i % 2 ? "#ff6b8b" : "#e5484d");
            }
          },
        });
      }
      break;
    case "stpatricks":
      out.push({ z: c.y + 2, draw: () => potOfGold(ctx, c.x + 10, c.y + 2, true, t) });
      break;
    case "easter":
      out.push({
        z: c.y + 2,
        draw: () => {
          // Basket
          px(ctx, c.x - 7, c.y - 6, 14, 8, OUTLINE);
          px(ctx, c.x - 6, c.y - 5, 12, 6, "#c48a52");
          for (let i = 0; i < 3; i++) px(ctx, c.x - 6, c.y - 4 + i * 2, 12, 1, "#a86c3a");
          for (let i = 0; i < 4; i++) {
            const [col] = EGG_COLORS[i % EGG_COLORS.length]!;
            px(ctx, c.x - 5 + i * 3, c.y - 8, 2, 3, col);
          }
          px(ctx, c.x - 6, c.y - 12, 1, 6, "#8a5a34");
          px(ctx, c.x + 5, c.y - 12, 1, 6, "#8a5a34");
          px(ctx, c.x - 6, c.y - 12, 12, 1, "#8a5a34");
        },
      });
      plan.items.slice(plan.found).forEach((p, i) => {
        out.push({ z: p.y, draw: () => drawEgg(ctx, p, i + plan.found) });
      });
      break;
    case "diwali":
      out.push({
        z: c.y + 2,
        draw: () => {
          // A plate of sweets.
          px(ctx, c.x - 6, c.y - 2, 12, 3, OUTLINE);
          px(ctx, c.x - 5, c.y - 1, 10, 1, "#d9dde2");
          for (let i = 0; i < 4; i++) px(ctx, c.x - 4 + i * 2, c.y - 3 - (i % 2), 2, 2, "#ffb347");
        },
      });
      break;
    case "holi":
      out.push({ z: c.y + 2, draw: () => holiBowls(ctx, c.x, c.y + 2) });
      break;
    case "summer":
      out.push({ z: c.y + 2, draw: () => grill(ctx, c.x - 4, c.y + 2, t) });
      break;
    case "carnival":
      out.push({ z: c.y + 2, draw: () => bigDrum(ctx, c.x, c.y + 2, t) });
      break;
    case "snowday":
      out.push({ z: c.y + 2, draw: () => snowman(ctx, c.x - 8, c.y + 2, t) });
      out.push({ z: c.y + 4, draw: () => cocoaPot(ctx, c.x + 12, c.y + 4) });
      break;
    case "lunarnewyear":
      out.push({ z: c.y + 12, draw: () => dragon(ctx, c.x, c.y, plan.rx * 0.5, plan.ry * 0.45, t) });
      break;
    case "maifest":
      out.push({ z: c.y + 2, draw: () => maypole(ctx, c.x, c.y + 2, t) });
      break;
    case "oktoberfest":
      out.push({ z: c.y + 2, draw: () => beerTable(ctx, c.x, c.y + 2, t) });
      break;
    default:
      break;
  }
  return out;
}

/** Lights from a party's decor (fire, diyas, the tree). */
export function eventLights(plan: EventPlan): Light[] {
  const c = plan.center;
  switch (plan.kind) {
    case "lanterns":
      return [[c.x, c.y - 4, 48, 0.95, "#ffb36b", 0.28]];
    case "diwali": {
      const out: Light[] = [];
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        out.push([c.x + Math.cos(a) * 24, c.y + Math.sin(a) * 11 - 3, 14, 0.85, "#ffcf6a", 0.2]);
      }
      return out;
    }
    case "holiday":
      return [[c.x, c.y - 14, 30, 0.7, "#fff2c0", 0.15]];
    case "halloween":
      return [[c.x, c.y - 6, 26, 0.75, "#86e07f", 0.18]];
    default:
      return [];
  }
}
