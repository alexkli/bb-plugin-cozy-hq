// Villain's Lair: what everyone wears. The staff in one-piece jumpsuits in
// their project's color with a belt, a zip and a little volcano patch; you in
// a sharp charcoal suit with a red pocket square; guards with helmets and
// clipboards, a scientist in a lab coat, a courier straight off the mini-sub.
import { wearsAtNeck, type CharPose } from "../../characters.ts";
import type { Facing } from "../../layout.ts";
import type { VisitorKind } from "../../theme.ts";
import { hash, OUTLINE, shade, type Look } from "../../themekit.ts";
import { C } from "./kit.ts";

export function lairLook(look: Look, id: string): Look {
  // One color top to bottom: the trousers follow the shirt, a shade darker.
  const pants = shade(look.shirt, -0.14);
  const accessory: Look["accessory"] = look.accessory === "beanie" || look.accessory === "bow" ? "none" : look.accessory;
  const h = hash(`lair${id}`);
  const hairStyle: Look["hairStyle"] = look.hairStyle === "cap" ? (h % 2 ? "crop" : "bun") : look.hairStyle;
  // The key names the sprite in the character cache: it must change with the outfit.
  return { ...look, key: `${look.key}|lair|${pants}|${hairStyle}|${accessory}`, pants, accessory, hairStyle };
}

export function lairNpc(kind: VisitorKind, classic: Look): Look {
  switch (kind) {
    case "boss":
      return { ...classic, shirt: "#3b3444", pants: "#2a2630", accent: C.velvet };
    case "guard":
      return { ...classic, hairStyle: "crop", shirt: "#56616e", pants: "#4a545f", accent: C.hazard, accessory: "none" };
    case "janitor":
      return { ...classic, hairStyle: "crop", shirt: "#e0a23a", pants: "#c48a2a", accent: C.ink };
    case "technician":
      return { ...classic, hairStyle: "spiky", hair: "#e8e4dc", shirt: "#f2f0ea", pants: "#3a3f4a", accent: C.glowGreen, accessory: "glasses" };
    case "delivery":
      return { ...classic, hairStyle: "crop", shirt: "#23292f", pants: "#23292f", accent: C.teal };
  }
}

/** Draws pixels on a character, mirrored when they face left (x, y: the 20×28 sprite's top-left). */
function painter(ctx: CanvasRenderingContext2D, x: number, y: number, facing: Facing, bob: number) {
  const flip = facing === "left";
  return (col: number, row: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(flip ? x + 20 - col - w : x + col, y + row + bob, w, h);
  };
}

const NO_FRONT = new Set<CharPose>(["present", "present-plan", "read", "cup"]);

/** The jumpsuit's belt, zip and shoulder patch. */
export function lairDress(ctx: CanvasRenderingContext2D, a: { x: number; y: number; facing: Facing; pose: CharPose; seed: number; seated: boolean; look: Look }): void {
  const bob = a.pose === "walk1" || a.pose === "walk3" ? -1 : 0;
  const px = painter(ctx, a.x, a.y, a.facing, bob);
  const tx = 5;
  const belt = a.seed % 4 === 1 ? "#5a3a26" : C.ink;
  px(tx, 19, 8, 1, belt);
  if (a.facing === "front") {
    if (!NO_FRONT.has(a.pose)) {
      px(tx + 3, 19, 2, 1, C.brass);
      px(tx + 4, 15, 1, 3, shade(a.look.shirt, 0.22));
    }
    // A little volcano patch on the left shoulder.
    px(tx + 6, 15, 1, 1, C.lava);
    px(tx + 6, 16, 1, 1, C.rockHi);
  } else if (a.facing !== "back") {
    px(tx + 4, 15, 1, 1, C.lava);
  }
}

/** Extras on you and the visitors. */
export function lairDressVisitor(ctx: CanvasRenderingContext2D, v: { x: number; y: number; facing: Facing; pose: CharPose; kind: VisitorKind; look?: Look }): void {
  const bob = v.pose === "walk1" || v.pose === "walk3" ? -1 : 0;
  const px = painter(ctx, v.x, v.y, v.facing, bob);
  const front = v.facing === "front";
  const back = v.facing === "back";
  switch (v.kind) {
    case "boss": {
      // A red pocket square and a gold lapel pin (not on a shirt you picked yourself).
      if (!front || v.look?.ownShirt || NO_FRONT.has(v.pose)) break;
      px(10, 15, 2, 1, C.velvetHi);
      if (!wearsAtNeck(v.look)) px(7, 15, 1, 1, C.brassHi);
      break;
    }
    case "guard": {
      // A white helmet with a red stripe, a clipboard under the arm.
      px(4, 1, 12, 1, OUTLINE);
      px(3, 2, 14, 4, "#e8e4dc");
      px(4, 2, 12, 1, "#ffffff");
      px(9, 2, 2, 4, C.velvet);
      if (!back) px(v.facing === "front" ? 2 : 6, 6, v.facing === "front" ? 16 : 12, 1, "#b8b2a6");
      if (back) break;
      const cx = front ? 13 : 14;
      px(cx, 16, 5, 7, OUTLINE);
      px(cx + 1, 17, 3, 5, "#f4f1ea");
      px(cx + 1, 16, 3, 1, C.steelHi);
      px(cx + 1, 18, 2, 1, "#9a9488");
      px(cx + 1, 20, 3, 1, "#9a9488");
      break;
    }
    case "janitor": {
      // Hazard-yellow overalls: straps and a reflective band.
      if (back) {
        px(5, 14, 1, 5, "#c48a2a");
        px(12, 14, 1, 5, "#c48a2a");
      }
      px(5, 18, 8, 1, "#f4f1ea");
      break;
    }
    case "technician": {
      // The scientist: goggles pushed up, a long lab coat over the trousers.
      px(5, 3, 10, 1, OUTLINE);
      px(6, 3, 3, 1, "#7cc8ff");
      px(11, 3, 3, 1, "#7cc8ff");
      if (v.pose.startsWith("walk") || v.pose === "stand") {
        px(5, 21, 8, 2, "#e4e1d9");
        if (front) px(9, 21, 1, 2, "#b8b4ac");
      }
      if (front) px(6, 16, 2, 1, "#5ab0e8");
      break;
    }
    case "delivery": {
      // A wetsuit with a teal stripe, a dive mask up on the head and a snorkel.
      px(4, 3, 12, 2, OUTLINE);
      px(5, 3, 4, 1, "#9fd8f0");
      px(11, 3, 4, 1, "#9fd8f0");
      if (!back) px(v.facing === "front" ? 16 : 14, 1, 1, 5, C.hazard);
      px(5, 16, 8, 1, C.teal);
      break;
    }
  }
}
