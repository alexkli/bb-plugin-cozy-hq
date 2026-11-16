// Startup House: the people. Hoodies, fleece vests and joggers; headphones
// on half the house; a laptop under the arm on the way to the kitchen. You're
// the founder; the visitors are an investor in a fleece vest swinging by,
// the cleaner, the internet installer and the pizza delivery. Squeezed in
// when the desks are full: a laptop on the lap (./nooks.ts).

import type { VisitorKind } from "../../theme.ts";
import { wearsAtNeck, type CharPose, type Look } from "../../characters.ts";
import type { Facing } from "../../layout.ts";
import { hash, shade } from "../../themekit.ts";
import { OUTLINE } from "./kit.ts";
import { laptopOnLap } from "./nooks.ts";

type Ctx = CanvasRenderingContext2D;

const PANTS = ["#4a6a9a", "#2f4468", "#2e2c36", "#b8a07a", "#6a6e78", "#4a5a3a"];
const VESTS = ["#2f3a52", "#5a6470", "#4a5a3a", "#6a3a3a"];

export function startupLook(look: Look, threadId: string): Look {
  const h = hash(`startup-${threadId}`);
  // Half the house lives in headphones; jeans, joggers and cargo shorts.
  const accessory = look.accessory === "none" && h % 3 === 0 ? "headphones" : look.accessory === "bow" ? "beanie" : look.accessory;
  return { ...look, accessory, pants: PANTS[h % PANTS.length]!, key: `${look.key}|startup` };
}

export function startupNpc(kind: VisitorKind, classic: Look): Look {
  switch (kind) {
    case "boss":
      // You, the founder: a charcoal tee, jeans, an orange accent.
      return { ...classic, key: `${classic.key}|startup`, shirt: "#3a3a44", pants: "#4a6a9a", accent: "#ff9a3d" };
    case "guard":
      // An investor swinging by: a pale blue button-down (the vest goes on top), chinos, salt-and-pepper.
      return { ...classic, key: "startup-investor", shirt: "#a8c8e8", pants: "#c8b48a", hair: "#8a8278", hairStyle: "crop", accessory: "glasses", accent: "#2f3a52" };
    case "janitor":
      // The cleaner, in teal scrubs.
      return { ...classic, key: "startup-cleaner", shirt: "#3fa8a0", pants: "#2f6b66", accent: "#f2c14e" };
    case "technician":
      // The internet installer: an orange polo and a cap.
      return { ...classic, key: "startup-installer", shirt: "#f2a03a", pants: "#2f3a5a", hair: "#2f3a5a", hairStyle: "cap", accent: "#ffd84a" };
    case "delivery":
      // Pizza: a red cap and shirt.
      return { ...classic, key: "startup-pizza", shirt: "#d8483a", hair: "#d8483a", hairStyle: "cap", accent: "#ffd84a" };
  }
}

const px = (ctx: Ctx, c: string, x: number, y: number, w = 1, h = 1) => {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
};

/** A fleece vest over the torso (x, y: the sprite's top left). */
function vest(ctx: Ctx, x: number, y: number, facing: Facing, bob: number, color: string): void {
  const bt = y + 14 + bob;
  const hi = shade(color, 0.18);
  if (facing === "back") {
    px(ctx, color, x + 5, bt, 8, 6);
    px(ctx, hi, x + 5, bt, 8, 1);
    return;
  }
  if (facing === "front") {
    px(ctx, color, x + 5, bt, 2, 6);
    px(ctx, color, x + 11, bt, 2, 6);
    px(ctx, hi, x + 5, bt, 1, 6);
    px(ctx, "#c8ced6", x + 7, bt + 1, 1, 1);
    return;
  }
  // In profile: the front panel and the armhole.
  const fx = facing === "right" ? x + 9 : x + 5;
  px(ctx, color, fx, bt, 4, 6);
  px(ctx, hi, fx, bt, 4, 1);
}

/** Vests, hoodie strings, a laptop under the arm on the way somewhere, or on the lap squeezed in somewhere. */
export function startupDress(ctx: Ctx, a: { x: number; y: number; facing: Facing; pose: CharPose; seed: number; seated: boolean; look: Look; spot?: string | null }, t: number): void {
  dressFor(ctx, a);
  laptopOnLap(ctx, a, t);
}

function dressFor(ctx: Ctx, a: { x: number; y: number; facing: Facing; pose: CharPose; seed: number }): void {
  const { x, y, facing, pose, seed } = a;
  if (pose === "nap" || pose === "slump") return;
  const bob = pose === "walk1" || pose === "walk3" ? -1 : 0;
  const role = seed % 10;
  if (role <= 1) vest(ctx, x, y, facing, bob, VESTS[(seed >>> 4) % VESTS.length]!);
  else if (role <= 3 && facing === "front") {
    // Hoodie drawstrings.
    const bt = y + 14 + bob;
    px(ctx, "#f4f2ea", x + 7, bt + 1, 1, 2);
    px(ctx, "#f4f2ea", x + 10, bt + 1, 1, 2);
  }
  if (role === 4 && pose.startsWith("walk") && (facing === "left" || facing === "right")) {
    // A laptop tucked under the arm.
    const lx = facing === "right" ? x + 3 : x + 10;
    const ly = y + 18 + bob;
    px(ctx, OUTLINE, lx - 1, ly - 1, 9, 4);
    px(ctx, "#c9ced6", lx, ly, 7, 2);
    px(ctx, ["#ff5fa2", "#b6e34a", "#43d1f0"][seed % 3]!, lx + 2, ly, 2, 1);
  }
}

/** The investor's fleece vest and phone, the installer's cable coil, your hoodie strings (unless you dressed yourself). */
export function startupDressVisitor(ctx: Ctx, v: { x: number; y: number; facing: Facing; pose: CharPose; kind: VisitorKind; look?: Look }, t: number): void {
  void t;
  const { x, y, facing, pose, kind, look } = v;
  const bob = pose === "walk1" || pose === "walk3" ? -1 : 0;
  if (kind === "guard") {
    vest(ctx, x, y, facing, bob, "#2f3a52");
    if (facing === "front" && !pose.startsWith("walk")) {
      // A phone, checking the metrics.
      px(ctx, OUTLINE, x + 13, y + 18, 3, 5);
      px(ctx, "#7fe0ff", x + 14, y + 19, 1, 3);
    }
  } else if (kind === "technician") {
    // A coil of fiber cable over the shoulder.
    const cx = facing === "left" ? x + 11 : x + 4;
    const bt = y + 14 + bob;
    px(ctx, "#ffd84a", cx, bt, 5, 1);
    px(ctx, "#ffd84a", cx, bt + 4, 5, 1);
    px(ctx, "#ffd84a", cx, bt + 1, 1, 3);
    px(ctx, "#ffd84a", cx + 4, bt + 1, 1, 3);
  } else if (kind === "boss" && look && !look.ownShirt && !wearsAtNeck(look) && (!look.top || look.top === "hoodie") && facing === "front") {
    // Your hoodie's drawstrings.
    const bt = y + 14 + bob;
    px(ctx, "#f4f2ea", x + 7, bt + 1, 1, 2);
    px(ctx, "#f4f2ea", x + 10, bt + 1, 1, 2);
  }
}
