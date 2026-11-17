// Mountain Cabin: the people. Everyone in a wool sweater in their project's
// color with a Nordic yoke round the shoulders, thick socks instead of boots
// (those stay in the mudroom), bobble hats on the beanie wearers and the odd
// pair of ski goggles pushed up. You in a red knit; the ski patrol in red
// with a white cross, the mountain guide with a rope and a helmet, the hut
// keeper in an apron, the courier on snowshoes with a pack frame.
import { wearsAtNeck, type CharPose } from "../../characters.ts";
import type { Facing } from "../../layout.ts";
import type { VisitorKind } from "../../theme.ts";
import { hash, mix, OUTLINE, type Look } from "../../themekit.ts";
import { C } from "./kit.ts";
import { laptopOnLap } from "./nooks.ts";

const PANTS = ["#2f3a4f", "#3a3d46", "#4a3a32", "#2e4a3e", "#5a4a3a", "#45384a", "#3d4a6b"];
const HATS = [C.red, C.navy, C.cream, C.mustard, C.moss, "#e86aa8", "#3a8ad8"];

/** The same person in lodge clothes: the sweater keeps the project color. */
export function look(base: Look, id: string): Look {
  const h = hash(`cabin${id}`);
  const pants = PANTS[h % PANTS.length]!;
  let accessory = base.accessory;
  let hairStyle = base.hairStyle;
  // Caps don't do up here: a beanie instead (with a bobble, see dress).
  if (hairStyle === "cap") {
    hairStyle = h % 2 ? "crop" : "bob";
    accessory = "beanie";
  }
  const accent = accessory === "beanie" ? HATS[(h >>> 3) % HATS.length]! : base.accent;
  return { ...base, key: `${base.key}|cabin|${pants}|${hairStyle}|${accessory}|${accent}`, pants, hairStyle, accessory, accent };
}

export function npc(kind: VisitorKind, classic: Look): Look {
  switch (kind) {
    case "boss":
      // A deep red knit.
      return { ...classic, shirt: "#9a3530", pants: "#2f3a4f", accent: C.cream };
    case "guard":
      // Ski patrol: a red jacket, black salopettes.
      return { ...classic, hairStyle: "crop", accessory: "none", shirt: "#d23a32", pants: "#2a2c36", accent: "#f4f2ee", key: "cabin-patrol" };
    case "janitor":
      // The hut keeper in a loden jacket.
      return { ...classic, shirt: "#4f6a4a", pants: "#4a3a32", accent: C.cream, key: "cabin-keeper" };
    case "technician":
      // The mountain guide (and the lodge's handyman): a blue softshell.
      return { ...classic, hairStyle: "crop", accessory: "none", shirt: "#2f5f8a", pants: "#4a4f58", accent: "#f08a3a", key: "cabin-guide" };
    case "delivery":
      // The courier who comes up on snowshoes: a yellow shell.
      return { ...classic, shirt: "#e8b830", pants: "#2f3a4f", accent: "#3a8ad8", key: "cabin-courier" };
  }
}

const COVERED = new Set<CharPose>(["read", "present", "present-plan"]);
const WALK = new Set<CharPose>(["walk0", "walk1", "walk2", "walk3"]);
const STANDING = new Set<CharPose>(["stand", "walk0", "walk1", "walk2", "walk3", "cup", "raise", "cheer"]);

type Px = (col: number, row: number, w: number, h: number, color: string) => void;

function painter(ctx: CanvasRenderingContext2D, x: number, y: number, facing: Facing): Px {
  const flip = facing === "left";
  return (col, row, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(flip ? x + 20 - col - w : x + col, y + row, w, h);
  };
}

/** The Nordic yoke: a light band round the shoulders with a dotted row in the sweater's color. */
function yoke(px: Px, facing: Facing, shirt: string): void {
  const band = mix(shirt, "#f4efe4", 0.78);
  const dot = mix(shirt, "#1a1020", 0.35);
  const side = facing === "left" || facing === "right";
  const x0 = side ? 6 : 5;
  const w = side ? 6 : 8;
  px(x0, 14, w, 2, band);
  for (let i = 0; i < w; i += 2) px(x0 + i + 1, 14, 1, 1, dot);
  for (let i = 0; i < w; i += 2) px(x0 + i, 15, 1, 1, dot);
}

/** Thick wool socks (or felt slippers): cream with a red top. */
function socks(px: Px, pose: CharPose, facing: Facing, top: string): void {
  const side = facing === "left" || facing === "right";
  if (side) {
    const s = pose === "walk1" ? -1 : pose === "walk3" ? 1 : 0;
    for (const fx of [7 + s, 10 - s]) {
      px(fx, 26, 4, 1, C.cream);
      px(fx, 25, 3, 1, top);
    }
  } else {
    const lUp = pose === "walk1" ? 1 : 0;
    const rUp = pose === "walk3" ? 1 : 0;
    for (const [fx, up] of [
      [5, lUp],
      [10, rUp],
    ] as const) {
      px(fx, 26 - up, 3, 1, C.cream);
      px(fx, 25 - up, 3, 1, top);
    }
  }
}

export function dress(ctx: CanvasRenderingContext2D, a: { x: number; y: number; facing: Facing; pose: CharPose; seed: number; seated: boolean; look: Look; spot?: string | null }, t: number): void {
  // Squeezed in somewhere with a laptop on the lap.
  laptopOnLap(ctx, a, t);
  const bob = a.pose === "walk1" || a.pose === "walk3" ? -1 : 0;
  const px = painter(ctx, a.x, a.y + bob, a.facing);
  const back = a.facing === "back";
  const side = a.facing === "left" || a.facing === "right";
  if (!COVERED.has(a.pose) || back) {
    if (a.seed % 5 < 3) yoke(px, a.facing, a.look.shirt);
    else if (!back) {
      // A zip-neck collar.
      px(side ? 8 : 7, 14, side ? 4 : 6, 1, mix(a.look.shirt, "#1a1020", 0.3));
      if (!side) px(9, 15, 1, 3, "#e8e4da");
    }
  }
  // A bobble on the beanie.
  if (a.look.accessory === "beanie") {
    const c = a.look.accent;
    px(9, 0, 2, 2, OUTLINE);
    px(9, 0, 2, 1, mix(c, "#ffffff", 0.5));
    px(9, 1, 2, 1, c);
  } else if (a.seed % 11 === 4 && a.look.accessory !== "glasses" && a.look.accessory !== "headphones" && !back) {
    // Ski goggles pushed up on the forehead.
    px(side ? 6 : 5, 4, side ? 8 : 10, 1, OUTLINE);
    px(side ? 7 : 6, 4, side ? 6 : 8, 1, "#f08a3a");
    px(side ? 7 : 6, 4, 2, 1, "#ffd27a");
  }
  if (!a.seated && STANDING.has(a.pose)) socks(px, a.pose, a.facing, [C.red, C.navy, C.moss, C.mustard][a.seed % 4]!);
}

export function dressVisitor(ctx: CanvasRenderingContext2D, v: { x: number; y: number; facing: Facing; pose: CharPose; kind: VisitorKind; look?: Look }): void {
  const bob = WALK.has(v.pose) && (v.pose === "walk1" || v.pose === "walk3") ? -1 : 0;
  const px = painter(ctx, v.x, v.y + bob, v.facing);
  const back = v.facing === "back";
  const side = v.facing === "left" || v.facing === "right";
  const hat = !!v.look?.hat;
  const helmet = (c: string, hi: string) => {
    if (hat) return;
    px(4, 1, 12, 5, OUTLINE);
    px(5, 1, 10, 4, c);
    px(6, 1, 5, 1, hi);
    if (!back) px(side ? 12 : 4, 5, side ? 3 : 12, 1, c);
  };
  switch (v.kind) {
    case "guard": {
      // Ski patrol: a white cross on the back (and small on the chest), a helmet, a radio.
      helmet("#c42a26", "#e8605a");
      if (back) {
        px(9, 15, 2, 6, "#f4f2ee");
        px(7, 17, 6, 2, "#f4f2ee");
      } else if (!side) {
        px(11, 15, 1, 3, "#f4f2ee");
        px(10, 16, 3, 1, "#f4f2ee");
        px(6, 14, 1, 3, "#2a2c36");
        px(6, 12, 1, 2, "#5a5d66");
      } else px(9, 16, 2, 2, "#f4f2ee");
      break;
    }
    case "technician": {
      // The guide: an orange helmet and a coil of rope over one shoulder.
      helmet("#f08a3a", "#ffb87a");
      const rope = "#d8402e";
      const ropeHi = "#f2c230";
      if (back || !side) {
        for (let i = 0; i < 7; i++) px(6 + i, 14 + i, 1, 1, i % 2 ? rope : ropeHi);
        px(4, 18, 3, 4, rope);
        px(5, 19, 1, 2, ropeHi);
      } else {
        px(5, 15, 4, 5, OUTLINE);
        px(6, 16, 2, 3, rope);
      }
      break;
    }
    case "janitor": {
      // The hut keeper's apron (and a wooden spoon in the pocket).
      if (back) {
        px(5, 17, 8, 1, C.cream);
        break;
      }
      px(side ? 7 : 6, 16, side ? 5 : 8, 7, C.cream);
      px(side ? 7 : 6, 16, side ? 5 : 8, 1, C.creamLo);
      if (!side) px(11, 15, 1, 3, C.pine);
      break;
    }
    case "delivery": {
      // A pack frame with a crate of supplies, snowshoes on the feet.
      if (back) {
        px(4, 9, 12, 14, OUTLINE);
        px(5, 10, 10, 6, C.pine);
        px(5, 10, 10, 1, C.pineHi);
        px(7, 12, 6, 2, C.red);
        px(5, 16, 1, 6, C.beam);
        px(14, 16, 1, 6, C.beam);
      } else if (side) {
        px(0, 9, 6, 14, OUTLINE);
        px(1, 10, 4, 6, C.pine);
        px(1, 16, 1, 6, C.beam);
      } else {
        px(4, 7, 12, 4, OUTLINE);
        px(5, 7, 10, 3, C.pine);
      }
      // Snowshoes: wide oval frames under the boots.
      px(2, 26, 7, 2, OUTLINE);
      px(11, 26, 7, 2, OUTLINE);
      px(3, 26, 5, 1, C.beamHi);
      px(12, 26, 5, 1, C.beamHi);
      break;
    }
    case "boss": {
      // You: felt slippers indoors, and the knit's yoke unless you picked your own shirt (or wear something at your neck).
      const l = v.look;
      if (l && !l.ownShirt && !wearsAtNeck(l) && l.top !== undefined && l.top !== "tie" && l.top !== "blazer" && l.top !== "shirt") yoke(px, v.facing, l.shirt);
      if (STANDING.has(v.pose)) socks(px, v.pose, v.facing, "#7a5a3a");
      break;
    }
  }
}

