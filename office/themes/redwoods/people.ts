// Redwood Camp people: flannel and fleece in each project's color, earthy
// pants, beanies; a park ranger, a camp fixer, a bike courier and you in a fleece.
import type { CharPose } from "../../characters.ts";
import type { Facing } from "../../layout.ts";
import type { VisitorKind } from "../../theme.ts";
import { hash, hex, mix, parseColor, type Look } from "../../themekit.ts";
import { OUTLINE } from "./kit.ts";

const PANTS = ["#7a6a48", "#5a6440", "#3d4a6b", "#5b4a3c", "#4a4038", "#6b4a32", "#46523a"];
const BEANIES = ["#d9a531", "#c4552d", "#3f7a4a", "#e6dabd", "#b23a32", "#2f7a7a", "#8a5a8a", "#5a7aa0"];

function toHsl(c: string): [number, number, number] {
  const [r0, g0, b0] = parseColor(c);
  const r = r0 / 255;
  const g = g0 / 255;
  const b = b0 / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function fromHsl(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return hex(f(0) * 255, f(8) * 255, f(4) * 255);
}

/** The same person in camp clothes: the shirt keeps its project hue, a touch deeper (flannel). */
export function look(base: Look): Look {
  const h = hash(base.key);
  const [hue, sat, light] = toHsl(base.shirt);
  const shirt = fromHsl(hue, Math.min(0.62, sat * 0.95), Math.max(0.36, light - 0.1));
  const pants = PANTS[h % PANTS.length]!;
  let accessory = base.accessory;
  if ((accessory === "none" || accessory === "bow") && h % 5 < 2) accessory = "beanie";
  const accent = BEANIES[(h >>> 4) % BEANIES.length]!;
  return { ...base, shirt, pants, accessory, accent, key: `${base.key}|rw` };
}

/** You and the visitors. */
export function npc(kind: VisitorKind, classic: Look): Look {
  switch (kind) {
    case "boss":
      // A cozy forest-green fleece.
      return { ...classic, shirt: "#3f6b4a", pants: "#4a4038", accent: "#c4552d", key: "rw-boss" };
    case "guard":
      // Park ranger: khaki shirt, olive trousers, a ranger's hat.
      return { ...classic, hairStyle: "crop", shirt: "#b8a070", pants: "#4a5a3a", accent: "#7a6a40", key: "rw-ranger" };
    case "janitor":
      // The camp caretaker in green coveralls.
      return { ...classic, hairStyle: "cap", shirt: "#4a6b3a", pants: "#3a5030", accent: "#d9a531", key: "rw-caretaker" };
    case "technician":
      // The camp fixer: red flannel, denim, a mustard beanie.
      return { ...classic, hairStyle: "crop", accessory: "beanie", shirt: "#b8433a", pants: "#3d4a6b", accent: "#d9a531", key: "rw-fixer" };
    case "delivery":
      // A bike courier in a teal rain shell.
      return { ...classic, shirt: "#2f8a7a", pants: "#3a3a44", accent: "#e8c040", key: "rw-courier" };
  }
}

// ------------------------------------------------------------------ dress: flannel checks, vests, packs, boots

const VESTS = ["#5a6b3a", "#9a4a2a", "#2f3a55", "#c49a3a", "#4a3a32"];
const PACKS = ["#c4552d", "#3f6b4a", "#d9a531", "#2f5a7a", "#7a4a8a"];
const BOOT = "#7a4e2c";
const BOOT_HI = "#9a6a3e";

const TYPING = new Set<CharPose>(["type0", "type1"]);
const COVERED = new Set<CharPose>(["read", "present", "present-plan"]);
const WALK = new Set<CharPose>(["walk0", "walk1", "walk2", "walk3"]);

export function dress(ctx: CanvasRenderingContext2D, a: { x: number; y: number; facing: Facing; pose: CharPose; seed: number; seated: boolean; look?: Look }): void {
  const { pose, facing, seed } = a;
  const flip = facing === "left";
  // Columns in the unflipped 20-wide sprite; mirror for left-facing.
  const px = (cx: number, w = 1) => a.x + (flip ? 20 - cx - w : cx);
  const bob = pose === "walk1" || pose === "walk3" ? -1 : 0;
  const top = a.y + 14 + bob;
  const tx = 5;
  const outfit = seed % 10;
  const back = facing === "back";
  const side = facing === "left" || facing === "right";

  if (!COVERED.has(pose)) {
    if (outfit < 6) {
      // Flannel: dark check lines over the shirt, and a light thread.
      const shirt = a.look?.shirt;
      ctx.fillStyle = shirt ? mix(shirt, "#1a1020", 0.42) : "rgba(30,14,16,0.32)";
      ctx.fillRect(px(tx, 8), top + 2, 8, 1);
      if (!side) {
        ctx.fillRect(px(tx + 2), top + 1, 1, 5);
        ctx.fillRect(px(tx + 5), top + 1, 1, 5);
      } else ctx.fillRect(px(tx + 3), top + 1, 1, 5);
      ctx.fillStyle = shirt ? mix(shirt, "#fff4e0", 0.28) : "rgba(255,240,215,0.18)";
      ctx.fillRect(px(tx, 8), top + 4, 8, 1);
    } else if (outfit < 8) {
      // A puffer vest over the shirt.
      ctx.fillStyle = VESTS[seed % VESTS.length]!;
      const rows = TYPING.has(pose) ? 3 : 6;
      if (back) ctx.fillRect(px(tx, 8), top, 8, rows);
      else if (side) ctx.fillRect(px(tx + 1, 6), top, 6, rows);
      else {
        ctx.fillRect(px(tx, 2), top, 2, rows);
        ctx.fillRect(px(tx + 6, 2), top, 2, rows);
      }
      ctx.fillStyle = "rgba(0,0,0,0.22)";
      ctx.fillRect(px(tx, 8), top + 2, 8, 1);
      if (rows > 4) ctx.fillRect(px(tx, 8), top + 4, 8, 1);
    }
  }

  // Hikers carry a little day pack on the trail.
  if (WALK.has(pose) && seed % 3 === 1) {
    const pack = PACKS[(seed >> 2) % PACKS.length]!;
    if (back) {
      ctx.fillStyle = OUTLINE;
      ctx.fillRect(px(tx, 8), top - 1, 8, 7);
      ctx.fillStyle = pack;
      ctx.fillRect(px(tx + 1, 6), top, 6, 5);
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(px(tx + 1, 6), top + 2, 6, 1);
      ctx.fillStyle = "#e6dabd";
      ctx.fillRect(px(tx + 3, 2), top + 3, 2, 1);
    } else if (side) {
      ctx.fillStyle = OUTLINE;
      ctx.fillRect(px(tx - 3, 4), top - 1, 4, 7);
      ctx.fillStyle = pack;
      ctx.fillRect(px(tx - 2, 3), top, 3, 5);
    } else {
      ctx.fillStyle = "rgba(40,24,20,0.7)";
      ctx.fillRect(px(tx + 1), top, 1, 4);
      ctx.fillRect(px(tx + 6), top, 1, 4);
    }
  }

  // Hiking boots.
  if (!a.seated && (pose === "stand" || WALK.has(pose) || pose === "cup" || pose === "raise" || pose === "cheer")) {
    const foot = a.y + 26 + bob;
    if (side) {
      const s = pose === "walk1" ? -1 : pose === "walk3" ? 1 : 0;
      for (const fx of [7 + s, 10 - s]) {
        ctx.fillStyle = BOOT;
        ctx.fillRect(px(fx, 4), foot, 4, 1);
        ctx.fillStyle = BOOT_HI;
        ctx.fillRect(px(fx, 3), foot - 1, 3, 1);
      }
    } else {
      const lUp = pose === "walk1" ? 1 : 0;
      const rUp = pose === "walk3" ? 1 : 0;
      for (const [fx, up] of [
        [5, lUp],
        [10, rUp],
      ] as const) {
        ctx.fillStyle = BOOT;
        ctx.fillRect(px(fx, 3), foot - up, 3, 1);
        ctx.fillStyle = BOOT_HI;
        ctx.fillRect(px(fx, 3), foot - up - 1, 3, 1);
      }
    }
  }
}
