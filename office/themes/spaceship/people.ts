// Spaceship: the crew in jumpsuits. The project color stays the color of the
// suit (that's how you tell the projects apart): a one-piece in the project
// color for most, a top over crew-grey trousers for the rest, with small
// extras by person (a utility belt, a hip scanner, a plain shoulder patch, a
// comm earpiece). You wear the captain's coat; security wears a visor, the
// maintenance tech hi-vis coveralls, the engineer floats in on a little
// thruster pack, and the courier comes through the airlock in a spacesuit
// (helmet off once they're standing still).
import type { CharPose } from "../../characters.ts";
import { wearsAtNeck } from "../../characters.ts";
import type { Facing } from "../../layout.ts";
import type { Theme, VisitorKind } from "../../theme.ts";
import { OUTLINE, hash, shade, type Look } from "../../themekit.ts";
import { P } from "./pal.ts";

/** Crew-grey trousers for those not in a one-piece. */
const GREYS = ["#4a5266", "#3d4456", "#5b6375", "#343a4a"];

export function shipLook(look: Look, id: string): Look {
  const h = hash(`ship${id}`);
  const suit = h % 5 < 3;
  const pants = suit ? shade(look.shirt, -0.16) : GREYS[(h >>> 3) % GREYS.length]!;
  // Caps and beanies off on board; a comm headset instead of the beanie.
  const hairStyle: Look["hairStyle"] = look.hairStyle === "cap" ? (h % 2 ? "crop" : "bun") : look.hairStyle;
  const accessory: Look["accessory"] = look.accessory === "beanie" ? "headphones" : look.accessory;
  // The key names the sprite in the character cache: it changes with the outfit ("suit" marks a one-piece).
  return { ...look, key: `${look.key}|ship|${suit ? "suit" : "pair"}|${pants}|${hairStyle}|${accessory}`, pants, hairStyle, accessory };
}

export function shipNpc(kind: VisitorKind, classic: Look): Look {
  switch (kind) {
    case "boss":
      // The captain's coat in deep navy with gold piping (dressVisitor); your own colors win.
      return { ...classic, shirt: "#2b3656", pants: "#232a40", accent: "#f2c230" };
    case "guard":
      return { ...classic, hairStyle: "crop", shirt: "#444c60", pants: "#2b303c", accent: "#ff6b6b", accessory: "none" };
    case "janitor":
      // Hi-vis coveralls and a work cap.
      return { ...classic, hairStyle: "cap", shirt: "#d6e04a", pants: "#a9b43a", accent: "#55606e", accessory: "none" };
    case "technician":
      // Teal engineering coveralls, an amber work helmet.
      return { ...classic, hairStyle: "cap", shirt: "#2f9a94", pants: "#24706b", accent: "#ffc857", accessory: "none" };
    case "delivery":
      // A white spacesuit with orange trim; the helmet's drawn over the head.
      return { ...classic, hairStyle: "crop", shirt: "#e9edf2", pants: "#c9d0db", accent: P.orange, accessory: "none" };
  }
}

// ------------------------------------------------------------------ crew extras

const HELD = new Set<CharPose>(["present", "present-plan", "read"]);
const STANDING = new Set<CharPose>(["stand", "walk0", "walk1", "walk2", "walk3", "raise", "cheer", "cup", "draw0", "draw1", "paddle0", "paddle1", "putt0", "putt1"]);
const PATCHES = [P.orange, P.tealHi, P.white, P.amber];

/** Shades of the suit color, worked out once per color (dress runs every frame). */
const tones = new Map<string, { lo: string; hi: string; belt: string }>();
function toneOf(shirt: string): { lo: string; hi: string; belt: string } {
  let t = tones.get(shirt);
  if (!t) {
    t = { lo: shade(shirt, -0.3), hi: shade(shirt, 0.22), belt: shade(shirt, -0.55) };
    tones.set(shirt, t);
  }
  return t;
}

/** Head row offset for a pose (walking bobs, slumping and napping drop the head). */
function headDrop(pose: CharPose): number {
  return (pose === "walk1" || pose === "walk3" ? -1 : 0) + (pose === "slump" ? 2 : 0) + (pose === "nap" ? 1 : 0);
}

export function shipDress(ctx: CanvasRenderingContext2D, a: { x: number; y: number; facing: Facing; pose: CharPose; seed: number; seated: boolean; look: Look }): void {
  const flip = a.facing === "left";
  const back = a.facing === "back";
  const bob = a.pose === "walk1" || a.pose === "walk3" ? -1 : 0;
  const top = a.y + 14 + bob;
  const px = (col: number, row: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(flip ? a.x + 20 - col - w : a.x + col, top + row, w, h);
  };
  const tx = 5;
  const tone = toneOf(a.look.shirt);
  const suit = a.look.key.includes("|ship|suit|");
  const held = HELD.has(a.pose);
  const kind = a.seed % 5;
  // A one-piece: a seam at the collar and a belt at the waist.
  if (suit && !back && !held) {
    px(tx + 2, 0, 1, 1, tone.lo);
    px(tx + 5, 0, 1, 1, tone.lo);
  }
  if ((suit || kind === 0) && !held) {
    px(tx, 6, 8, 1, tone.belt);
    if (!back) px(tx + 3, 6, 2, 1, P.panelMid);
  }
  switch (kind) {
    case 0:
      // A pouch on the hip.
      if (!held) px(back ? tx + 6 : tx, 5, 2, 2, "#3d4456");
      break;
    case 1: {
      // A plain patch on the shoulder.
      const c = PATCHES[(a.seed >>> 3) % PATCHES.length]!;
      if (!held) px(back ? tx + 6 : tx + 1, 1, 1, 2, c);
      break;
    }
    case 2:
      // A scanner clipped to the hip, its light on.
      if (held || a.seated) break;
      px(tx + 8, 5, 2, 3, OUTLINE);
      px(tx + 8, 5, 1, 2, "#5c6475");
      px(tx + 9, 5, 1, 1, P.cyan);
      break;
    case 3:
    case 4: {
      // A comm earpiece with a little light.
      const ear = a.y + 3 + headDrop(a.pose) + 5;
      if (back) break;
      ctx.fillStyle = OUTLINE;
      ctx.fillRect(flip ? a.x + 3 : a.x + 15, ear - 1, 2, 3);
      ctx.fillStyle = kind === 3 ? P.cyan : P.mint;
      ctx.fillRect(flip ? a.x + 4 : a.x + 15, ear, 1, 1);
      break;
    }
  }
}

// ------------------------------------------------------------------ you and the visitors

/** The courier's helmet bubble: a glass dome over the head with a collar ring and a reflection. */
function helmet(px: (col: number, row: number, w: number, h: number, color: string) => void): void {
  px(4, 0, 12, 1, OUTLINE);
  px(2, 1, 2, 1, OUTLINE);
  px(16, 1, 2, 1, OUTLINE);
  px(1, 2, 1, 11, OUTLINE);
  px(18, 2, 1, 11, OUTLINE);
  px(4, 1, 12, 1, "rgba(200,236,255,0.35)");
  px(2, 2, 16, 11, "rgba(170,225,255,0.16)");
  px(4, 2, 3, 1, "rgba(255,255,255,0.85)");
  px(3, 3, 1, 2, "rgba(255,255,255,0.7)");
  px(15, 10, 2, 1, "rgba(255,255,255,0.4)");
  // The collar ring at the neck.
  px(2, 13, 16, 2, OUTLINE);
  px(3, 13, 14, 1, P.panelMid);
  px(3, 13, 4, 1, P.panelHi);
}

/** The helmet carried under the arm once they're in. */
function helmetCarried(px: (col: number, row: number, w: number, h: number, color: string) => void): void {
  px(0, 16, 6, 6, OUTLINE);
  px(1, 17, 4, 4, "rgba(170,225,255,0.55)");
  px(1, 17, 2, 1, "rgba(255,255,255,0.9)");
  px(1, 21, 4, 1, P.panelMid);
}

export function shipDressVisitor(ctx: CanvasRenderingContext2D, v: { x: number; y: number; facing: Facing; pose: CharPose; kind: VisitorKind; look?: Look }, t: number): void {
  const bob = v.pose === "walk1" || v.pose === "walk3" ? -1 : 0;
  const flip = v.facing === "left";
  const back = v.facing === "back";
  const side = v.facing === "left" || v.facing === "right";
  const walking = v.pose.startsWith("walk");
  const px = (col: number, row: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(flip ? v.x + 20 - col - w : v.x + col, v.y + row + bob, w, h);
  };
  const tx = 5;
  const top = 14;
  switch (v.kind) {
    case "boss": {
      // The captain's coat: gold piping down both front edges, gold cuffs and tails below the waist.
      const look = v.look;
      const gold = "#f2c230";
      const coat = look?.shirt ?? "#2b3656";
      const lo = toneOf(coat).lo;
      const held = HELD.has(v.pose);
      if (!back && !held) {
        // Piping on the open front, clear of the collar (nothing at the neck when you wear something there).
        const from = wearsAtNeck(look) ? 2 : 1;
        if (v.facing === "front") {
          px(tx, top + from, 1, 6 - from, gold);
          px(tx + 7, top + from, 1, 6 - from, gold);
        } else px(tx + 7, top + from, 1, 6 - from, gold);
      }
      if (v.pose === "stand" || walking) {
        const swing = v.pose === "walk1" ? 1 : v.pose === "walk3" ? -1 : 0;
        px(tx - 1, top + 4 + Math.max(0, swing), 1, 1, gold);
        px(tx + 8, top + 4 + Math.max(0, -swing), 1, 1, gold);
        // Coat tails over the top of the legs.
        if (side) {
          px(tx - 1, top + 7, 3, 3, lo);
          px(tx - 1, top + 7, 1, 3, OUTLINE);
        } else {
          px(tx, top + 7, 2, 2, coat);
          px(tx + 6, top + 7, 2, 2, coat);
          px(tx, top + 9, 2, 1, lo);
          px(tx + 6, top + 9, 2, 1, lo);
          px(tx - 1, top + 7, 1, 3, OUTLINE);
          px(tx + 8, top + 7, 1, 3, OUTLINE);
          if (back) px(tx + 3, top + 4, 2, 3, lo);
        }
      }
      break;
    }
    case "guard": {
      // A security visor over the eyes, a duty belt with a torch.
      if (back) {
        px(2, 8, 16, 1, "#1f2430");
      } else {
        const x0 = side ? 8 : 2;
        const w = side ? 9 : 16;
        px(x0, 7, w, 1, OUTLINE);
        px(x0, 8, w, 2, "rgba(127,227,255,0.45)");
        px(x0, 10, w, 1, OUTLINE);
        px(x0 + 1, 8, 2, 1, "rgba(235,252,255,0.9)");
      }
      px(tx, top + 6, 8, 1, "#1b1f28");
      if (!back) px(tx + 3, top + 6, 2, 1, "#ff6b6b");
      if (STANDING.has(v.pose) && !back) {
        px(tx + 8, top + 5, 3, 2, OUTLINE);
        px(tx + 9, top + 5, 1, 1, "#5c6475");
        px(tx + 10, top + 5, 1, 1, "#fff3c0");
      }
      break;
    }
    case "janitor": {
      // A hi-vis harness: reflective straps over the shoulders and round the waist, bands on the legs, a tool bag.
      const band = "#eef3f6";
      px(tx, top, 1, 6, band);
      px(tx + 7, top, 1, 6, band);
      px(tx, top + 6, 8, 1, band);
      if (v.pose !== "walk1" && v.pose !== "walk3") {
        px(tx, 23, 3, 1, band);
        px(tx + 5, 23, 3, 1, band);
      }
      const bx = back ? tx + 5 : side ? tx + 1 : tx - 3;
      px(bx, top + 4, 5, 4, OUTLINE);
      px(bx + 1, top + 5, 3, 2, "#c2632a");
      px(bx + 1, top + 5, 3, 1, P.orangeHi);
      px(bx + 2, top + 3, 1, 1, "#7f8a96");
      break;
    }
    case "technician": {
      // A thruster pack: two nozzles that puff a little flame as they float about.
      const flame = walking ? Math.floor(t * 12) % 3 : -1;
      const fire = (col: number, row: number) => {
        if (flame < 0) return;
        px(col, row, 2, 1, flame === 0 ? "#fff3c0" : "#ffc857");
        if (flame !== 2) px(col, row + 1, 2, 1, "rgba(255,140,60,0.75)");
      };
      if (back) {
        px(tx, top, 8, 7, OUTLINE);
        px(tx + 1, top + 1, 6, 5, P.panelMid);
        px(tx + 1, top + 1, 6, 1, P.panelHi);
        px(tx + 2, top + 3, 4, 1, P.amber);
        px(tx, top + 7, 2, 2, P.steelDk);
        px(tx + 6, top + 7, 2, 2, P.steelDk);
        fire(tx, top + 9);
        fire(tx + 6, top + 9);
      } else if (side) {
        px(tx - 4, top - 1, 4, 9, OUTLINE);
        px(tx - 3, top, 2, 7, P.panelMid);
        px(tx - 3, top, 2, 1, P.panelHi);
        px(tx - 3, top + 3, 2, 1, P.amber);
        fire(tx - 3, top + 8);
      } else {
        // Two tanks showing past the shoulders, nozzles under them.
        for (const c of [tx - 4, tx + 9]) {
          px(c, top - 1, 3, 8, OUTLINE);
          px(c + 1, top, 1, 6, P.panelMid);
          px(c + 1, top, 1, 1, P.panelHi);
          px(c + 1, top + 3, 1, 1, P.amber);
          fire(c + (c < tx ? 0 : 1), top + 7);
        }
      }
      break;
    }
    case "delivery": {
      // A spacesuit: an air pack, orange trim, and the helmet on until they're standing still.
      const trim = P.orange;
      if (back) {
        px(tx + 1, top, 6, 8, OUTLINE);
        px(tx + 2, top + 1, 4, 6, P.white);
        px(tx + 2, top + 3, 4, 1, trim);
      } else if (side) {
        px(tx - 3, top, 3, 7, OUTLINE);
        px(tx - 2, top + 1, 2, 5, P.white);
        px(tx - 2, top + 3, 2, 1, trim);
      } else {
        px(tx + 1, top, 1, 3, "#5c6475");
        px(tx + 6, top, 1, 3, "#5c6475");
      }
      px(tx - 1, top + 1, 1, 1, trim);
      px(tx + 8, top + 1, 1, 1, trim);
      if (walking || v.pose === "raise" || v.pose === "cheer") helmet(px);
      else if (!back) helmetCarried(px);
      break;
    }
  }
}

export const PEOPLE: Pick<Theme, "look" | "npc" | "dress" | "dressVisitor"> = {
  look: shipLook,
  npc: shipNpc,
  dress: (ctx, a) => shipDress(ctx, a),
  dressVisitor: shipDressVisitor,
};
