// Coffee Shop: the people. The regulars working on their laptops: knit vests
// and cardigans, flannel, chunky sweaters and turtlenecks, the shirt still in
// the project color; scarves, tote bags, beanies with a bobble, headphones,
// a takeaway cup in hand. You in a cozy cardigan; the visitors are a parking
// warden peeking in, the closing barista with the mop, the espresso machine
// tech and the bean delivery with a sack on the shoulder.
import { wearsAtNeck, type CharPose, type Look } from "../../characters.ts";
import type { Facing } from "../../layout.ts";
import type { VisitorKind } from "../../theme.ts";
import { hash, mix, shade } from "../../themekit.ts";
import { C, OUTLINE } from "./kit.ts";

type Ctx = CanvasRenderingContext2D;

const PANTS = ["#4a6a9a", "#2f4468", "#7a5a3a", "#b8a07a", "#5a6040", "#2e2c36", "#8c4a32", "#3d4a6b"];
const BEANIES = [C.mustard, C.rust, C.cream, C.green, "#7a4a6a", "#3a5a8a", C.oakDk];
/** Knit vests and cardigans: oatmeal, charcoal, mustard, rust, moss, cream. */
const KNITS = ["#d9c6a2", "#4a4850", C.mustard, C.rust, "#6b7a4a", C.cream, "#8a6a8a"];
const SCARVES = [C.rust, C.mustard, C.green, "#c84a5a", "#3a5a8a", C.cream];
const TOTES = [C.cream, C.kraft, "#e8dcc0", "#d9a0a8"];

/** The same person, dressed for an afternoon at the café: the shirt keeps the project color. */
export function cafeLook(look: Look, threadId: string): Look {
  const h = hash(`cafe-${threadId}`);
  const pants = PANTS[h % PANTS.length]!;
  let accessory = look.accessory;
  let hairStyle = look.hairStyle;
  // Caps come off indoors: a beanie instead (with a bobble, see dress).
  if (hairStyle === "cap") {
    hairStyle = h % 2 ? "crop" : "bob";
    accessory = "beanie";
  } else if (accessory === "none" && (h >>> 5) % 4 === 0) accessory = "headphones";
  const accent = accessory === "beanie" ? BEANIES[(h >>> 3) % BEANIES.length]! : look.accent;
  return { ...look, key: `${look.key}|cafe|${pants}|${hairStyle}|${accessory}|${accent}`, pants, hairStyle, accessory, accent };
}

export function cafeNpc(kind: VisitorKind, classic: Look): Look {
  switch (kind) {
    case "boss":
      // You, a regular: a rust knit under a cardigan, dark jeans.
      return { ...classic, key: `${classic.key}|cafe`, shirt: "#a85a3e", pants: "#2f3a52", accent: C.cream };
    case "guard":
      // A parking warden peeking in: a navy uniform and cap (the hi-vis vest goes on top).
      return { ...classic, key: "cafe-warden", shirt: "#2f3a52", pants: "#2a2f40", hair: "#2a2f40", hairStyle: "cap", accessory: "none", accent: "#2a2f40" };
    case "janitor":
      // The closing barista: a black tee, hair up in a bun (the green apron goes on top).
      return { ...classic, key: "cafe-closer", shirt: "#2e2c36", pants: "#3a3d46", hair: "#6b4128", hairStyle: "bun", accessory: "none", accent: C.green };
    case "technician":
      // The espresso machine tech: a grey work shirt under navy overalls, a copper cap.
      return { ...classic, key: "cafe-tech", shirt: "#7a8794", pants: "#2f3a5a", hair: C.copperLo, hairStyle: "cap", accessory: "glasses", accent: C.copper };
    case "delivery":
      // The bean delivery: an olive jacket and a brown cap.
      return { ...classic, key: "cafe-beans", shirt: "#6b7a4a", pants: "#3a3d46", hair: "#5a3a24", hairStyle: "cap", accessory: "none", accent: "#5a3a24" };
  }
}

// ------------------------------------------------------------------ drawing

type Px = (col: number, row: number, w: number, h: number, color: string) => void;

/** Paints in the 20×28 character grid, mirrored for people facing left (the sprites are). */
function painter(ctx: Ctx, x: number, y: number, facing: Facing): Px {
  const flip = facing === "left";
  return (col, row, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(flip ? x + 20 - col - w : x + col, y + row, w, h);
  };
}

const WALK = new Set<CharPose>(["walk0", "walk1", "walk2", "walk3"]);
const STANDING = new Set<CharPose>(["stand", "walk0", "walk1", "walk2", "walk3", "cup", "raise", "cheer"]);
/** Poses where a book, a plan or the arms cover the chest. */
const COVERED = new Set<CharPose>(["read", "present", "present-plan"]);

const bobOf = (pose: CharPose) => (pose === "walk1" || pose === "walk3" ? -1 : 0);

/** A knit vest (or a cardigan left open): panels either side of the shirt; from behind only its collar and ribbed hem. */
function knitVest(px: Px, facing: Facing, color: string): void {
  const hi = shade(color, 0.16);
  const lo = shade(color, -0.2);
  if (facing === "back") {
    px(5, 14, 8, 1, color);
    px(5, 20, 8, 1, lo);
    return;
  }
  if (facing === "front") {
    px(5, 14, 2, 7, color);
    px(11, 14, 2, 7, color);
    px(5, 14, 1, 7, hi);
    px(12, 20, 1, 1, lo);
    px(6, 20, 1, 1, lo);
    px(7, 15, 1, 1, lo);
    px(10, 15, 1, 1, lo);
    return;
  }
  // In profile: the front panel.
  px(9, 14, 4, 7, color);
  px(9, 14, 4, 1, hi);
  px(9, 20, 4, 1, lo);
}

/** Flannel: a darker check over the shirt (it keeps the project color). */
function flannel(px: Px, facing: Facing, shirt: string): void {
  const line = shade(shirt, -0.3);
  const side = facing === "left" || facing === "right";
  const x0 = side ? 6 : 5;
  const w = side ? 7 : 8;
  for (let c = x0 + 1; c < x0 + w; c += 3) px(c, 14, 1, 6, line);
  px(x0, 17, w, 1, line);
  if (facing === "front") px(8, 15, 2, 1, shade(shirt, 0.2));
}

/** A chunky sweater: ribbed hem and a cable down the front. */
function sweater(px: Px, facing: Facing, shirt: string): void {
  const rib = mix(shirt, "#fff6e8", 0.35);
  const side = facing === "left" || facing === "right";
  px(side ? 6 : 5, 20, side ? 7 : 8, 1, rib);
  for (let i = 0; i < (side ? 7 : 8); i += 2) px((side ? 6 : 5) + i, 20, 1, 1, shade(shirt, -0.15));
  if (facing === "front") {
    for (let r = 15; r < 20; r++) px(8 + (r % 2), r, 1, 1, rib);
    px(9 - (15 % 2), 15, 1, 1, shade(shirt, -0.15));
  }
}

/** A turtleneck's folded collar. */
function turtleneck(px: Px, facing: Facing, shirt: string): void {
  const c = shade(shirt, -0.12);
  if (facing === "back") px(6, 14, 6, 1, c);
  else if (facing === "front") {
    px(6, 14, 6, 1, c);
    px(7, 13, 4, 1, shade(shirt, 0.1));
  } else px(8, 13, 4, 2, c);
}

/** A knitted scarf, wound once with a tail hanging down. */
function scarf(px: Px, facing: Facing, color: string): void {
  const lo = shade(color, -0.25);
  if (facing === "back") {
    px(6, 14, 7, 1, color);
    px(6, 15, 2, 3, color);
    px(6, 17, 2, 1, lo);
    return;
  }
  if (facing === "front") {
    px(6, 14, 7, 2, color);
    px(6, 15, 7, 1, lo);
    px(10, 16, 2, 4, color);
    px(10, 19, 2, 1, lo);
    px(10, 18, 2, 1, mix(color, "#ffffff", 0.4));
    return;
  }
  px(8, 14, 5, 2, color);
  px(8, 15, 5, 1, lo);
  px(11, 16, 2, 3, color);
}

/** A tote bag: the strap across the chest, the bag on the hip when standing. */
function tote(px: Px, facing: Facing, color: string, standing: boolean): void {
  const strap = shade(color, -0.25);
  if (facing === "back") {
    for (let i = 0; i < 6; i++) px(6 + i, 14 + i, 1, 1, strap);
  } else if (facing === "front") {
    for (let i = 0; i < 6; i++) px(12 - i, 14 + i, 1, 1, strap);
  } else px(9, 14, 1, 4, strap);
  if (!standing) return;
  // The bag itself, hanging at the left hip (behind the arm in profile).
  const bx = facing === "front" || facing === "back" ? 1 : 4;
  px(bx, 18, 5, 6, OUTLINE);
  px(bx + 1, 19, 3, 4, color);
  px(bx + 2, 20, 1, 2, shade(color, -0.35));
}

/** A takeaway cup with a lid and a sleeve, over the classic mug (the "cup" pose). */
function takeaway(px: Px, facing: Facing): void {
  const c = facing === "back" ? 2 : 11;
  px(c - 1, 13, 5, 6, OUTLINE);
  px(c, 14, 3, 4, C.paper);
  px(c, 14, 3, 1, "#4a3a32");
  px(c, 16, 3, 1, C.kraft);
  px(c - 1, 13, 5, 1, "#f4efe6");
}

/** Vests, flannel, sweaters, scarves and totes; bobbles on beanies; a takeaway cup in hand. */
export function cafeDress(ctx: Ctx, a: { x: number; y: number; facing: Facing; pose: CharPose; seed: number; seated: boolean; look: Look }, t: number): void {
  void t;
  const { facing, pose, seed, look } = a;
  if (pose === "nap" || pose === "slump") return;
  const px = painter(ctx, a.x, a.y + bobOf(pose), facing);
  const covered = COVERED.has(pose) && facing !== "back";
  const standing = !a.seated && STANDING.has(pose);
  const role = seed % 8;
  const neck = wearsAtNeck(look);
  if (!covered) {
    if (role <= 1) knitVest(px, facing, KNITS[(seed >>> 4) % KNITS.length]!);
    else if (role === 2) flannel(px, facing, look.shirt);
    else if (role === 3) sweater(px, facing, look.shirt);
    else if (role === 4 && !neck) turtleneck(px, facing, look.shirt);
    else if (role === 5) tote(px, facing, TOTES[(seed >>> 3) % TOTES.length]!, standing);
  }
  // A scarf on the cold-blooded (not with a turtleneck, nor over a necklace or a lanyard).
  if (!neck && role !== 4 && (seed >>> 6) % 5 === 0) scarf(px, facing, SCARVES[(seed >>> 2) % SCARVES.length]!);
  // A bobble on the beanie.
  if (look.accessory === "beanie") {
    px(9, 0, 2, 2, OUTLINE);
    px(9, 0, 2, 1, mix(look.accent, "#ffffff", 0.5));
    px(9, 1, 2, 1, look.accent);
  }
  if (pose === "cup") takeaway(px, facing);
  // A laptop under the arm on the way somewhere, stickers and all.
  if (role === 6 && WALK.has(pose) && (facing === "left" || facing === "right")) {
    px(3, 17, 9, 4, OUTLINE);
    px(4, 18, 7, 2, "#c9ced6");
    px(6, 18, 2, 1, [C.chalkPink, C.chalkYellow, C.chalkBlue][seed % 3]!);
  }
}

// ------------------------------------------------------------------ you and the visitors

/** A hi-vis vest: lime with silver reflective bands. */
function hiVis(px: Px, facing: Facing): void {
  const vest = "#d8f03a";
  const band = "#e8eef4";
  if (facing === "back") {
    px(5, 14, 8, 7, vest);
    px(5, 16, 8, 1, band);
    px(5, 19, 8, 1, band);
    px(7, 17, 4, 1, "#2a2f40");
    return;
  }
  if (facing === "front") {
    px(5, 14, 3, 7, vest);
    px(10, 14, 3, 7, vest);
    px(5, 16, 3, 1, band);
    px(10, 16, 3, 1, band);
    px(5, 19, 3, 1, band);
    px(10, 19, 3, 1, band);
    return;
  }
  px(7, 14, 6, 7, vest);
  px(7, 16, 6, 1, band);
  px(7, 19, 6, 1, band);
}

export function cafeDressVisitor(ctx: Ctx, v: { x: number; y: number; facing: Facing; pose: CharPose; kind: VisitorKind; look?: Look }, t: number): void {
  const { facing, pose, kind } = v;
  const px = painter(ctx, v.x, v.y + bobOf(pose), facing);
  const back = facing === "back";
  const side = facing === "left" || facing === "right";
  const walking = WALK.has(pose);
  switch (kind) {
    case "guard": {
      // The warden: hi-vis vest, a badge on the cap, the ticket pad out when stopping to look in.
      hiVis(px, facing);
      if (!back) px(side ? 12 : 9, 2, 2, 1, "#f0cc78");
      if (!walking && !back) {
        px(side ? 12 : 13, 16, 4, 6, OUTLINE);
        px(side ? 13 : 14, 17, 2, 4, "#fbf7ee");
        px(side ? 13 : 14, 18, 2, 1, "#c84a5a");
        if (Math.floor(t * 2) % 2) px(side ? 12 : 13, 15, 1, 2, "#3a3d46");
      }
      break;
    }
    case "janitor": {
      // The closing barista: the shop's green apron and a towel over the shoulder.
      if (back) {
        px(5, 18, 8, 1, C.green);
        px(9, 14, 1, 4, C.greenLo);
        px(12, 14, 2, 3, C.cream);
        break;
      }
      px(side ? 8 : 5, 15, side ? 5 : 8, 9, C.green);
      px(side ? 8 : 5, 15, side ? 5 : 8, 1, C.greenHi);
      if (!side) {
        px(6, 14, 1, 1, C.greenLo);
        px(11, 14, 1, 1, C.greenLo);
        px(7, 18, 4, 2, C.greenLo);
        px(8, 18, 1, 1, C.chalk);
      }
      px(side ? 6 : 4, 14, 2, 4, C.cream);
      px(side ? 6 : 4, 17, 2, 1, C.creamLo);
      break;
    }
    case "technician": {
      // The espresso tech: navy overall straps and bib, a wrench in the pocket, a pressure gauge on the belt.
      const o = "#2f3a5a";
      if (back) {
        px(6, 14, 1, 5, o);
        px(11, 14, 1, 5, o);
        px(7, 18, 4, 1, o);
      } else if (!side) {
        px(6, 14, 1, 2, o);
        px(11, 14, 1, 2, o);
        px(6, 16, 6, 5, o);
        px(7, 17, 4, 1, shade(o, 0.25));
        px(10, 15, 1, 3, C.chromeLo);
        px(10, 15, 1, 1, C.chromeHi);
        px(5, 20, 2, 2, OUTLINE);
        px(5, 20, 1, 1, C.chromeHi);
      } else {
        px(9, 14, 1, 2, o);
        px(8, 16, 5, 5, o);
        px(11, 17, 1, 3, C.chromeLo);
      }
      break;
    }
    case "delivery": {
      // A burlap sack of coffee beans on the shoulder.
      const burlap = "#c4a274";
      const lo = "#9c7a4e";
      const stamp = C.rust;
      if (back) {
        px(8, 9, 10, 9, OUTLINE);
        px(9, 10, 8, 7, burlap);
        px(9, 16, 8, 1, lo);
        px(11, 12, 4, 2, stamp);
      } else if (side) {
        px(1, 9, 9, 9, OUTLINE);
        px(2, 10, 7, 7, burlap);
        px(2, 16, 7, 1, lo);
        px(4, 12, 3, 2, stamp);
      } else {
        px(10, 8, 9, 8, OUTLINE);
        px(11, 9, 7, 6, burlap);
        px(11, 14, 7, 1, lo);
        px(13, 11, 3, 2, stamp);
        px(12, 15, 2, 3, v.look?.skin ?? "#c98a5e");
      }
      break;
    }
    case "boss": {
      // You: an open cardigan over your top, unless you picked your own shirt or wear something smart.
      const l = v.look;
      if (l && !l.ownShirt && l.top !== "tie" && l.top !== "blazer" && l.top !== "shirt") knitVest(px, facing, "#d9c6a2");
      break;
    }
  }
}
