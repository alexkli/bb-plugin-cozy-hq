// Spaceship: the crew in space gear, each thread in one of three (kept by its
// id): a fitted station suit in the project color (collar ring, utility
// belt, patches, piped legs); a bulky white or orange spacesuit with the
// helmet off (neck ring, chest panel, gloves, boots, the life-support pack
// on the back, the helmet under an arm); or the full suit with the helmet
// on (a round shell over the head, a tinted visor with a glint and a hint of
// the face). The project color stays on every suit (the station suit
// itself; the spacesuits' side stripe, shoulders, knees and helmet band), so
// the projects stay easy to tell apart. Subagent helpers wear small station
// suits. You wear the captain's coat; security wears a visor, the
// maintenance tech hi-vis coveralls, the engineer floats in on a little
// thruster pack, and the courier comes through the airlock in a spacesuit.
import type { CharPose } from "../../characters.ts";
import { wearsAtNeck } from "../../characters.ts";
import type { Facing } from "../../layout.ts";
import type { Theme, VisitorKind } from "../../theme.ts";
import { Grid, OUTLINE, cached, hash, parseColor, shade, type Look } from "../../themekit.ts";
import { P } from "./pal.ts";

type Kind = "station" | "eva" | "helmet";

/** A thread's suit: its kind, the project color it carries, and the colors worked out once (dress runs every frame). */
interface Suit {
  kind: Kind;
  project: string;
  /** The project color on a spacesuit (stripes, shoulders, knees, the helmet band). */
  band: string;
  base: string;
  lo: string;
  glove: string;
  boot: string;
  /** Helmet-off suits put the helmet on to walk the corridors (some of them). */
  walkHelmet: boolean;
  trim: string;
  belt: string;
}

const SUITS = new Map<string, Suit>();
const KINDS: Kind[] = ["station", "eva", "helmet"];

/** Hue of a color in degrees (to keep orange suits for projects that aren't orange themselves). */
function hueOf(c: string): number {
  const [r, g, b] = parseColor(c).map((v) => v / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

export function shipLook(look: Look, id: string): Look {
  const h = hash(`ship${id}`);
  // Subagent helpers aren't dressed over (only recolored): small station suits for them.
  const kind: Kind = look.key.startsWith("helper|") ? "station" : KINDS[h % 3]!;
  const project = look.shirt;
  const hue = hueOf(project);
  const orange = kind !== "station" && (h >>> 5) % 3 === 0 && (hue < 0 || hue > 70) && hue < 340;
  const base = kind === "station" ? project : orange ? "#f0974f" : "#eef1f5";
  const lo = kind === "station" ? shade(project, -0.2) : orange ? "#cf7638" : "#c9d0db";
  const pants = kind === "station" ? shade(project, -0.16) : orange ? "#e08640" : "#dde2ea";
  // Caps off on board; a comm headset instead of a beanie. Under a helmet the hair's tucked in
  // and nothing sticks out of it (glasses stay on, behind the visor).
  let hairStyle: Look["hairStyle"] = look.hairStyle === "cap" ? (h % 2 ? "crop" : "bun") : look.hairStyle;
  let accessory: Look["accessory"] = look.accessory === "beanie" ? "headphones" : look.accessory;
  if (kind === "helmet") {
    if (hairStyle !== "bald" && hairStyle !== "buzz") hairStyle = "crop";
    if (accessory !== "glasses") accessory = "none";
  }
  const key = `${look.key}|ship|${kind}|${base}|${hairStyle}|${accessory}`;
  if (!SUITS.has(key)) {
    SUITS.set(key, {
      kind,
      project,
      band: project,
      base,
      lo,
      glove: orange ? "#e8ecf2" : "#b9c0cc",
      boot: kind === "station" ? "#3d4456" : orange ? "#5c6475" : "#8a93a6",
      walkHelmet: kind === "eva" && (h >>> 8) % 2 === 0,
      trim: shade(project, 0.42),
      belt: shade(project, -0.55),
    });
  }
  return { ...look, key, shirt: base, pants, hairStyle, accessory };
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

// ------------------------------------------------------------------ suit parts (sprites, cached by color)

const done = (g: Grid): HTMLCanvasElement => {
  g.outline(OUTLINE);
  return g.toCanvas();
};

/**
 * The helmet over the head, 18×16, drawn at sprite column 1 and three rows
 * over the head: a round shell, a band in the project color over the crown,
 * a tinted visor (see-through: the face shows faintly) with a glint, and
 * the ring it locks onto at the neck.
 */
function helmetSprite(view: "front" | "side" | "back", base: string, band: string): HTMLCanvasElement {
  return cached(`spaceship|helmet|${view}|${base}|${band}`, () => {
    const g = new Grid(18, 16);
    const hi = shade(base, 0.35);
    const lo = shade(base, -0.22);
    g.ellipse(8.5, 7.6, 7.6, 6.7, lo);
    g.ellipse(8, 7, 7, 6.2, base);
    g.ellipse(6, 4.5, 3, 2, hi);
    g.set(3, 6, hi).set(3, 7, hi);
    // The band over the crown, front to back.
    if (view === "side") g.rect(4, 1, 6, 2, band).rect(3, 3, 2, 1, band);
    else g.rect(7, 1, 4, 2, band).rect(8, 3, 2, 1, band);
    const rim = "#4a5266";
    const glass = "#1a3158b8";
    const glassHi = "#5f86c4c8";
    if (view === "front") {
      g.rrect(2, 4, 14, 9, rim, 2);
      g.rrect(3, 5, 12, 7, glass, 2);
      g.rect(4, 5, 10, 1, glassHi);
      g.rect(4, 6, 2, 1, "#ffffffe6").set(4, 7, "#ffffffa0").set(13, 10, "#a8d8ff90").set(12, 11, "#a8d8ff70");
    } else if (view === "side") {
      // The visor on the side they face (the sprite faces right; facing left flips it).
      g.rrect(8, 4, 9, 9, rim, 2);
      g.rrect(9, 5, 7, 7, glass, 2);
      g.rect(10, 5, 5, 1, glassHi);
      g.rect(10, 6, 2, 1, "#ffffffe6").set(10, 7, "#ffffffa0");
      g.rect(3, 8, 3, 2, P.steelDk).set(4, 8, P.mint);
    } else {
      // The back: a vent and a little light.
      g.rect(6, 9, 6, 2, P.steelDk);
      g.rect(7, 9, 4, 1, P.steelDeep);
      g.set(8, 12, P.red);
    }
    // The neck ring.
    g.rect(3, 13, 12, 2, "#8a93a6");
    g.rect(4, 13, 5, 1, "#dfe5ee");
    return done(g);
  });
}

/** The helmet carried under the arm (8×8). */
function carriedSprite(base: string, band: string): HTMLCanvasElement {
  return cached(`spaceship|carried|${base}|${band}`, () => {
    const g = new Grid(8, 8);
    g.ellipse(3.5, 3.5, 3.2, 3.2, shade(base, -0.2));
    g.ellipse(3.2, 3.2, 2.8, 2.8, base);
    g.rect(2, 3, 4, 3, "#1a3158");
    g.set(2, 3, "#ffffff").set(3, 3, "#a8d8ff");
    g.rect(3, 0, 2, 1, band).set(4, 1, band);
    g.rect(1, 6, 6, 1, "#8a93a6");
    return done(g);
  });
}

/** The life-support pack seen from behind (10×9 at sprite column 4) or from the side (5×9 behind the back). */
function packSprite(view: "back" | "side", base: string, band: string): HTMLCanvasElement {
  return cached(`spaceship|pack|${view}|${base}|${band}`, () => {
    if (view === "back") {
      const g = new Grid(10, 9);
      g.rrect(1, 1, 8, 7, shade(base, -0.18), 1);
      g.rrect(1, 1, 8, 6, base, 1);
      g.rect(2, 1, 6, 1, shade(base, 0.3));
      g.rect(1, 3, 8, 1, band);
      g.rect(2, 5, 2, 1, P.steelDk).rect(6, 5, 2, 1, P.steelDk);
      g.set(7, 2, P.mint);
      return done(g);
    }
    const g = new Grid(5, 9);
    g.rect(1, 1, 3, 7, base);
    g.rect(1, 1, 3, 1, shade(base, 0.3));
    g.rect(1, 3, 3, 1, band);
    g.rect(1, 7, 3, 1, shade(base, -0.2));
    g.set(2, 5, P.steelDk);
    return done(g);
  });
}

// ------------------------------------------------------------------ the crew, dressed every frame

const HELD = new Set<CharPose>(["present", "present-plan", "read"]);
const SEATED = new Set<CharPose>(["type0", "type1", "slump", "sit-back", "nap", "read"]);
const UPRIGHT = new Set<CharPose>(["stand", "walk0", "walk1", "walk2", "walk3", "mope"]);
const STANDING = new Set<CharPose>(["stand", "walk0", "walk1", "walk2", "walk3", "raise", "cheer", "cup", "draw0", "draw1", "paddle0", "paddle1", "putt0", "putt1", "mope"]);
const PATCHES = [P.orange, P.tealHi, P.white, P.amber];

/** Shades of the captain's coat, worked out once per color. */
const tones = new Map<string, { lo: string }>();
function toneOf(c: string): { lo: string } {
  let t = tones.get(c);
  if (!t) {
    t = { lo: shade(c, -0.3) };
    tones.set(c, t);
  }
  return t;
}

/** Head row offset for a pose (walking bobs, slumping and napping drop the head). */
function headDrop(pose: CharPose): number {
  return (pose === "walk1" || pose === "walk3" ? -1 : 0) + (pose === "slump" ? 2 : 0) + (pose === "nap" || pose === "mope" ? 1 : 0);
}

/** Where the hands are in a pose (sprite columns and rows, facing right), as [col, row, w, h] runs; `bt` is the body's top row. */
function hands(pose: CharPose, bt: number, back: boolean): [number, number, number, number][] {
  switch (pose) {
    case "type0":
    case "type1": {
      const lift = pose === "type1" ? 1 : 0;
      return back ? [] : [[5, bt + 4 - lift, 2, 1], [11, bt + 3 + lift, 2, 1]];
    }
    case "raise":
      return [[4, bt + 4, 1, 2], [15, bt - 5, 1, 4]];
    case "cheer":
      return [[2, bt - 5, 1, 4], [15, bt - 5, 1, 4]];
    case "present":
    case "present-plan":
      return [[4, bt + 3, 1, 1], [13, bt + 3, 1, 1]];
    case "draw0":
    case "draw1": {
      const r = pose === "draw1" ? 1 : 0;
      return [[4, bt + 4, 1, 2], [14 + r, bt - 5 + r, 1, 4]];
    }
    case "putt0":
    case "putt1":
      return [[14, bt + 4, 1, 1]];
    case "arcade0":
    case "arcade1": {
      const k = pose === "arcade1" ? 1 : 0;
      return [[4, bt + 3 + k, 1, 1], [13, bt + 4 - k, 1, 1]];
    }
    case "cup":
      return back ? [[13, bt + 4, 1, 2], [3, bt + 3, 2, 1]] : [[4, bt + 4, 1, 2], [12, bt + 3, 2, 1]];
    case "read":
      return [[4, bt + 4, 1, 1], [13, bt + 4, 1, 1]];
    case "paddle0":
    case "paddle1": {
      const s = pose === "paddle1" ? 1 : 0;
      return [[4, bt + 4, 1, 2], [14, bt + 2 - s, 1, 2]];
    }
    case "nap":
      return [[6, bt + 5, 6, 1]];
    case "slump":
    case "sit-back":
      return [];
    default: {
      const swing = pose === "walk1" ? 1 : pose === "walk3" ? -1 : 0;
      return [[4, bt + 4 + Math.max(0, swing), 1, 1], [13, bt + 4 + Math.max(0, -swing), 1, 1]];
    }
  }
}

export function shipDress(ctx: CanvasRenderingContext2D, a: { x: number; y: number; facing: Facing; pose: CharPose; seed: number; seated: boolean; look: Look }, t: number): void {
  const suit = SUITS.get(a.look.key);
  if (!suit) return;
  const flip = a.facing === "left";
  const back = a.facing === "back";
  const side = a.facing === "left" || a.facing === "right";
  const pose = a.pose;
  const bob = pose === "walk1" || pose === "walk3" ? -1 : 0;
  const bt = 14 + bob;
  const hy = 3 + headDrop(pose);
  const px = (col: number, row: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(flip ? a.x + 20 - col - w : a.x + col, a.y + row, w, h);
  };
  const blit = (img: HTMLCanvasElement, col: number, row: number) => ctx.drawImage(img, flip ? a.x + 20 - col - img.width : a.x + col, a.y + row);
  const held = HELD.has(pose);
  const seated = SEATED.has(pose);
  const standing = !seated && STANDING.has(pose);
  // Boots: the shoe row, where the feet are.
  const boots = (color: string) => {
    if (!standing) {
      if (pose === "nap" || pose === "read") {
        px(3, bt + 8, 3, 1, color);
        px(12, bt + 8, 3, 1, color);
      }
      return;
    }
    const row = 26 + bob;
    if (side) {
      const s = pose === "walk1" ? -1 : pose === "walk3" ? 1 : 0;
      px(7 + s, row, 4, 1, color);
      px(10 - s, row, 4, 1, color);
    } else {
      px(5, row - (pose === "walk1" ? 1 : 0), 3, 1, color);
      px(10, row - (pose === "walk3" ? 1 : 0), 3, 1, color);
    }
  };
  const legRow = bt + 9;

  if (suit.kind === "station") {
    // A fitted one-piece: a metal collar ring, shoulder caps and piping from shoulder to ankle,
    // a utility belt with a buckle and a pouch, a patch on the arm, boots.
    if (!(held && !back)) {
      px(6, bt, 6, 1, "#aab3c2");
      px(7, bt, 2, 1, "#e4e9f0");
      px(5, bt, 1, 1, suit.trim);
      px(12, bt, 1, 1, suit.trim);
      px(5, bt + 1, 1, 5, suit.trim);
      px(12, bt + 1, 1, 5, suit.trim);
      px(5, bt + 6, 8, 1, suit.belt);
      if (back) px(6, bt + 1, 6, 1, shade(suit.base, -0.12));
      else px(8, bt + 6, 2, 1, "#c8ccd6");
      if (!seated && !back) px(side ? 9 : 10, bt + 6, 2, 2, suit.belt);
    }
    if (!(pose === "slump" || pose === "sit-back" || pose === "nap")) {
      px(4, bt + 1, 1, 1, suit.trim);
      px(13, bt + 1, 1, 1, suit.trim);
      if (!back) px(4, bt + 2, 1, 1, PATCHES[(a.seed >>> 3) % PATCHES.length]!);
    }
    if (standing) {
      if (side) px(9, bt + 7, 1, 2, suit.trim);
      else {
        px(5, bt + 7, 1, 5 - (pose === "walk1" ? 1 : 0), suit.trim);
        px(12, bt + 7, 1, 5 - (pose === "walk3" ? 1 : 0), suit.trim);
      }
    }
    boots(suit.boot);
    return;
  }

  // ---- spacesuits (helmet off or on)
  const helmetOn = suit.kind === "helmet" || (suit.walkHelmet && pose.startsWith("walk"));
  // The life-support pack: behind, or over the shoulders from the front.
  if (back) blit(packSprite("back", suit.base, suit.band), 4, bt - 1);
  else if (side) blit(packSprite("side", suit.base, suit.band), 0, bt - 2);
  else {
    px(3, bt - 1, 2, 2, OUTLINE);
    px(13, bt - 1, 2, 2, OUTLINE);
    px(3, bt, 1, 1, suit.lo);
    px(14, bt, 1, 1, suit.lo);
  }
  if (!held || back) {
    // The project color: a stripe down the side, the shoulders, a band at the waist.
    if (!back) {
      px(side ? 12 : 12, bt + 1, 1, 5, suit.band);
      if (!side) {
        // The chest panel: a little box with lights.
        px(5, bt + 2, 2, 3, "#3a4252");
        px(5, bt + 3, 1, 1, P.mint);
        px(6, bt + 3, 1, 1, Math.floor((a.seed % 7) + t * 1.7) % 3 ? P.amber : "#5a4020");
      } else px(10, bt + 2, 2, 2, "#3a4252");
    }
    if (!(pose === "slump" || pose === "sit-back" || pose === "nap")) {
      px(4, bt + 1, 1, 2, suit.band);
      px(13, bt + 1, 1, 2, suit.band);
    }
    if (!back || pose !== "sit-back") px(5, bt + 6, 8, 1, suit.band);
  }
  // Gloves over the hands.
  for (const [c, r, w, h] of hands(pose, bt, back)) px(c, r, w, h, suit.glove);
  // Knee bands and boots.
  if (standing) {
    if (side) {
      const s = pose === "walk1" ? -1 : pose === "walk3" ? 1 : 0;
      px(7 + s, legRow, 3, 1, suit.band);
      px(10 - s, legRow, 3, 1, suit.band);
    } else {
      px(5, legRow, 3, 1, suit.band);
      px(10, legRow, 3, 1, suit.band);
    }
  }
  boots(suit.boot);
  if (helmetOn) {
    blit(helmetSprite(back ? "back" : side ? "side" : "front", suit.base, suit.band), 1, hy - 3);
    return;
  }
  // Helmet off: the neck ring, and the helmet carried under an arm while they're up and about.
  const ring = Math.max(bt - 1, hy + 10);
  px(5, ring, 8, 1, "#8a93a6");
  px(6, ring, 3, 1, "#dfe5ee");
  px(4, ring, 1, 1, OUTLINE);
  px(13, ring, 1, 1, OUTLINE);
  if (UPRIGHT.has(pose)) blit(carriedSprite(suit.base, suit.band), back ? 0 : side ? 8 : 12, bt + 1);
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
  dress: shipDress,
  dressVisitor: shipDressVisitor,
};
