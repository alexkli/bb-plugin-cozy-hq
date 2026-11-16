// Sky Loft: business casual. Tailored trousers, the odd blazer and scarf
// over a crisp shirt in the project color; a suit for you, building staff
// for the visitors.
import type { CharPose } from "../../characters.ts";
import type { Facing } from "../../layout.ts";
import type { VisitorKind } from "../../theme.ts";
import { hash, parseColor, shade, type Look } from "../../themekit.ts";

const PANTS = ["#2b2f3a", "#3a3f4b", "#2e3a55", "#b5a68b", "#5b5f68", "#1f2126", "#8a7660"];
const DARK_BLAZERS = ["#3a3d46", "#2b3550", "#4a3a34", "#33403a"];
const LIGHT_BLAZERS = ["#a37b52", "#8a8f99", "#b9a88c", "#7d6a5a"];
const SCARVES = ["#b8434f", "#c8a04c", "#2e3a55", "#8d9c86", "#d9cfc0", "#6b4fa0"];

export function skylineLook(look: Look, id: string): Look {
  const h = hash(`sky${id}`);
  const pants = PANTS[h % PANTS.length]!;
  const hairStyle: Look["hairStyle"] = look.hairStyle === "cap" ? (h % 2 ? "crop" : "bun") : look.hairStyle;
  const accessory: Look["accessory"] = look.accessory === "beanie" ? "none" : look.accessory;
  // The key names the sprite in the character cache: it must change with the outfit.
  return { ...look, key: `${look.key}|sky|${pants}|${hairStyle}|${accessory}`, pants, hairStyle, accessory };
}

export function skylineNpc(kind: VisitorKind, classic: Look): Look {
  switch (kind) {
    case "boss":
      return { ...classic, shirt: "#2b3142", pants: "#2b3142" };
    case "guard":
      return { ...classic, hairStyle: "crop", shirt: "#232b40", pants: "#3a3f4a", accent: "#232b40", accessory: "none" };
    case "janitor":
      return { ...classic, shirt: "#56636e", pants: "#3a4450", accent: "#3a4450" };
    case "technician":
      return { ...classic, shirt: "#2f4f7a", pants: "#2a3550", accent: "#f0eee8" };
    case "delivery":
      return { ...classic, shirt: "#23877a", pants: "#2a2f40", accent: "#f2c230" };
  }
}

const NO_FRONT = new Set<CharPose>(["present", "present-plan", "read", "cup"]);
const ARMS_DOWN = new Set<CharPose>(["stand", "walk0", "walk1", "walk2", "walk3", "type0", "type1", "sit-back"]);

/** Blazers and scarves, drawn over the torso (x, y: the sprite's top-left). */
const luma = (c: string) => {
  const [r, g, b] = parseColor(c);
  return r * 0.3 + g * 0.59 + b * 0.11;
};

export function skylineDress(ctx: CanvasRenderingContext2D, a: { x: number; y: number; facing: Facing; pose: CharPose; seed: number; seated: boolean; look?: Look }): void {
  const blazer = a.seed % 5 < 2;
  const scarf = !blazer && a.seed % 7 === 3;
  if (!blazer && !scarf) return;
  const flip = a.facing === "left";
  const back = a.facing === "back";
  const bob = a.pose === "walk1" || a.pose === "walk3" ? -1 : 0;
  const top = a.y + 14 + bob;
  const px = (col: number, row: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(flip ? a.x + 20 - col - w : a.x + col, top + row, w, h);
  };
  const tx = 5;
  if (blazer) {
    if (!back && NO_FRONT.has(a.pose)) return;
    // A blazer that stands apart from the shirt (the shirt is the project color).
    const pool = a.look && luma(a.look.shirt) < 110 ? LIGHT_BLAZERS : DARK_BLAZERS;
    const c = pool[Math.floor(a.seed / 8) % pool.length]!;
    const hi = shade(c, 0.22);
    const lo = shade(c, -0.18);
    px(tx, 0, 1, 7, c);
    px(tx + 7, 0, 1, 7, lo);
    if (back) {
      px(tx, 0, 8, 1, c);
    } else {
      px(tx + 1, 0, 1, 2, hi);
      px(tx + 6, 0, 1, 1, hi);
      if (a.facing === "front") px(tx + 7, 3, 1, 1, shade(c, 0.4));
    }
    if (ARMS_DOWN.has(a.pose)) {
      const swing = a.pose === "walk1" ? 1 : a.pose === "walk3" ? -1 : 0;
      px(tx - 1, 1 + Math.max(0, swing), 1, 3, lo);
      px(tx + 8, 1 + Math.max(0, -swing), 1, 3, lo);
    }
    return;
  }
  const c = SCARVES[Math.floor(a.seed / 4) % SCARVES.length]!;
  if (back) {
    px(tx, 0, 8, 1, c);
    return;
  }
  px(tx + 1, 0, 6, 1, c);
  if (!NO_FRONT.has(a.pose)) px(tx + 5, 1, 1, 3, shade(c, -0.12));
}
