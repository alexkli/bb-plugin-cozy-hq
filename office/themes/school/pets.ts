// School scenery: the school's animals and helpers. A golden reading dog
// with a bandana, Clover the class bunny, a ladybug coding robot instead of
// the roomba, the class aquarium with a turtle, and extras for the visitors
// (the hall monitor's sash and stop sign, the custodian's keys, lanyards).
import { Grid, OUTLINE } from "../../themekit.ts";
import type { PaintInfo, VisitorKind } from "../../theme.ts";
import { wearsAtNeck, type CharPose, type Look } from "../../characters.ts";
import type { Facing, Rect } from "../../layout.ts";
import { C, sprite } from "./kit.ts";

type DogPose = "sit" | "walk0" | "walk1" | "loaf" | "wag0" | "wag1";
type CatPose = "sit" | "walk0" | "walk1" | "loaf" | "groom" | "ride";

function flipped(g: Grid, left: boolean): Grid {
  return left ? g.flipped() : g;
}

/** Biscuit, the school's calm golden reading dog (20×15). */
function readingDog(pose: DogPose, facing: "left" | "right", blink: boolean): HTMLCanvasElement {
  return sprite(`dog-${pose}-${facing}-${blink}`, 20, 15, (g0) => {
    const g = new Grid(20, 15);
    const fur = "#e8b45e";
    const furHi = "#f5cf86";
    const furLo = "#c48f3e";
    const ear = "#b97f34";
    const eye = OUTLINE;
    const scarf = C.red;
    if (pose === "loaf") {
      g.rrect(2, 7, 14, 6, fur, 2);
      g.rect(4, 7, 9, 1, furHi);
      g.rrect(11, 3, 7, 7, fur, 2);
      g.rect(10, 4, 2, 5, ear).rect(17, 4, 1, 4, ear);
      g.rect(14, 6, 1, 1, eye).set(17, 7, eye);
      g.rect(12, 9, 5, 1, scarf);
      g.rect(1, 10, 2, 2, fur);
    } else if (pose === "sit" || pose === "wag0" || pose === "wag1") {
      g.rrect(5, 6, 9, 8, fur, 2);
      g.rect(7, 8, 4, 5, furHi);
      g.rrect(5, 0, 9, 7, fur, 2);
      g.rect(4, 1, 2, 6, ear).rect(13, 1, 2, 6, ear);
      g.rect(7, 4, 5, 3, furHi);
      if (blink) g.rect(7, 3, 2, 1, eye).rect(10, 3, 2, 1, eye);
      else g.set(8, 3, eye).set(11, 3, eye);
      g.set(9, 5, eye).set(10, 5, eye);
      g.rect(6, 7, 7, 1, scarf).set(9, 8, scarf).set(10, 8, scarf);
      g.rect(5, 13, 2, 1, furLo).rect(11, 13, 2, 1, furLo);
      const wag = pose === "wag1" ? -1 : pose === "wag0" ? 1 : 0;
      g.set(14, 11 + wag, fur).set(15, 10 + wag, fur).set(16, 9 + wag, furHi);
    } else {
      const step = pose === "walk1" ? 1 : 0;
      g.rrect(2, 5, 13, 6, fur, 2);
      g.rect(4, 5, 9, 1, furHi);
      g.rect(4, 9, 9, 2, furLo);
      g.rrect(12, 1, 7, 6, fur, 2);
      g.rect(12, 2, 2, 5, ear);
      g.rect(16, 4, 3, 2, furHi);
      if (blink) g.rect(15, 3, 2, 1, eye);
      else g.set(16, 3, eye);
      g.set(18, 4, eye);
      g.rect(12, 7, 3, 1, scarf).set(13, 8, scarf);
      g.rect(3 + step, 11, 2, 2, furLo).rect(6 - step, 11, 2, 2, fur);
      g.rect(10 + step, 11, 2, 2, furLo).rect(13 - step, 11, 2, 2, fur);
      g.set(1, 5, fur).set(0, 4, furHi);
    }
    g.outline(OUTLINE);
    g0.stamp(flipped(g, facing === "left"), 0, 0);
  }, false);
}

/** Clover, the class bunny (16×13): long ears, a cotton tail, hops instead of walks. */
function bunny(pose: CatPose, facing: "left" | "right", blink: boolean): HTMLCanvasElement {
  return sprite(`bunny-${pose}-${facing}-${blink}`, 16, 13, (g0) => {
    const g = new Grid(16, 13);
    const fur = "#f4f1ec";
    const furLo = "#d9d2c8";
    const patch = "#b9a58f";
    const pink = "#f2a6b8";
    const eye = OUTLINE;
    if (pose === "loaf") {
      g.rrect(2, 6, 11, 6, fur, 3);
      g.rect(3, 10, 9, 1, furLo);
      g.rrect(9, 4, 6, 5, fur, 2);
      g.rect(9, 1, 2, 4, fur).rect(12, 2, 2, 3, patch);
      g.set(10, 2, pink);
      g.set(13, 6, eye);
      g.set(15, 7, pink);
      g.rect(1, 8, 2, 2, "#ffffff");
      g.rect(4, 7, 3, 2, patch);
    } else if (pose === "sit" || pose === "groom") {
      g.rrect(4, 6, 8, 6, fur, 3);
      g.rect(5, 10, 6, 1, furLo);
      g.rrect(5, 3, 7, 5, fur, 2);
      if (pose === "groom") {
        // Ears pulled down to wash them.
        g.rect(4, 4, 2, 5, fur).rect(11, 4, 2, 5, patch);
      } else {
        g.rect(6, 0, 2, 4, fur).rect(9, 0, 2, 4, patch);
        g.set(6, 1, pink).set(9, 1, "#d9a0a8");
      }
      if (blink) g.rect(6, 5, 2, 1, eye).rect(9, 5, 2, 1, eye);
      else g.set(7, 5, eye).set(10, 5, eye);
      g.set(8, 6, pink).set(9, 6, pink);
      g.rect(7, 7, 3, 1, "#ffffff");
      g.rect(4, 11, 2, 1, furLo).rect(10, 11, 2, 1, furLo);
    } else {
      // Hopping in profile (and riding the robot).
      const hop = pose === "walk1" ? -1 : 0;
      g.rrect(2, 6 + hop, 10, 5, fur, 2);
      g.rect(4, 6 + hop, 4, 2, patch);
      g.rrect(9, 3 + hop, 6, 5, fur, 2);
      g.rect(9, 0 + hop, 2, 4, fur).rect(11, 0 + hop, 2, 3, patch);
      g.set(9, 1 + hop, pink);
      if (blink) g.rect(12, 5 + hop, 2, 1, eye);
      else g.set(13, 5 + hop, eye);
      g.set(15, 6 + hop, pink);
      g.rect(1, 7 + hop, 2, 2, "#ffffff");
      if (pose !== "ride") {
        g.rect(3, 11 + hop, 3, 1, furLo).rect(9, 11 + hop, 3, 1, furLo);
        if (pose === "walk1") g.rect(2, 11, 3, 1, furLo);
      }
    }
    g.outline(OUTLINE);
    g0.stamp(flipped(g, facing === "left"), 0, 0);
  }, false);
}

export function schoolPet(kind: "dog" | "cat", pose: DogPose | CatPose, facing: "left" | "right", blink: boolean): HTMLCanvasElement {
  return kind === "dog" ? readingDog(pose as DogPose, facing, blink) : bunny(pose as CatPose, facing, blink);
}

/** A ladybug coding robot (16×9), the kind kids program to roll across the floor. */
export function ladybugBot(): HTMLCanvasElement {
  return sprite("ladybug-bot", 16, 9, (g) => {
    g.ellipse(7, 4.5, 5.5, 3.2, C.red);
    g.rect(7, 2, 1, 5, OUTLINE);
    g.set(4, 3, OUTLINE).set(10, 3, OUTLINE).set(5, 6, OUTLINE).set(9, 6, OUTLINE);
    g.set(4, 2, C.redHi).set(5, 2, C.redHi);
    g.rrect(12, 2, 3, 5, "#3a3a46", 1);
    g.set(13, 3, "#7fd6ff").set(13, 5, "#7fd6ff");
    g.rect(3, 8, 2, 1, "#3a3a46").rect(9, 8, 2, 1, "#3a3a46");
  });
}

// ------------------------------------------------------------------ the aquarium

/** The class aquarium: fish, a turtle basking on its rock (or paddling about), bubbles. */
export function aquarium(ctx: CanvasRenderingContext2D, tank: Rect, info: PaintInfo & { fish: { x: number; y: number; dir: 1 | -1; color: string; phase: number }[]; feeding: boolean }): boolean {
  const { x, y, w, h } = tank;
  const t = info.t;
  const px = (c: string, xx: number, yy: number, ww = 1, hh = 1) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(xx), Math.round(yy), ww, hh);
  };
  px(OUTLINE, x - 1, y - 1, w + 2, h + 2);
  px("#d9f1f7", x, y, w, 2);
  px("#55b6d2", x, y + 2, w, h - 2);
  px("#6cc6df", x, y + 2, w, 5);
  px("#4aa5c2", x, y + h - 9, w, 5);
  // Gravel in crayon colors.
  for (let i = 0; i < w; i++) px(["#f2c14e", "#e5744b", "#7fb6ee", "#86c97f", "#f4efe6"][(i * 7) % 5]!, x + i, y + h - 3 - (i % 3 === 0 ? 1 : 0), 1, 3 + (i % 3 === 0 ? 1 : 0));
  // Swaying plants.
  for (const [sx, hgt] of [[3, 12], [6, 9], [34, 13], [37, 9]] as const) {
    for (let j = 0; j < hgt; j++) px(j % 3 ? "#3f9a5a" : "#57b86f", x + sx + Math.round(Math.sin(t * 1.4 + j * 0.5 + sx) * (j / hgt) * 1.5), y + h - 4 - j);
  }
  // The rock island, and the turtle: basking for a while, then a swim.
  const rx = x + 15;
  const ry = y + h - 9;
  px(OUTLINE, rx - 1, ry - 1, 12, 7);
  px("#8e8a84", rx, ry, 10, 6);
  px("#a8a39b", rx + 1, ry, 7, 2);
  const cycle = (t * 0.06) % 1;
  let tx: number;
  let ty: number;
  let dir = 1;
  if (info.feeding) {
    // Feeding time: Shelly paddles up to the surface and snaps at the flakes.
    const sw = Math.sin(t * 2.4);
    tx = x + w / 2 - 3 + sw * 6;
    ty = y + 3 + (Math.floor(t * 6) % 2);
    dir = Math.cos(t * 2.4) >= 0 ? 1 : -1;
  } else if (cycle < 0.55) {
    tx = rx + 2;
    ty = ry - 3;
  } else {
    const k = (cycle - 0.55) / 0.45;
    const sw = Math.sin(k * Math.PI * 2);
    tx = x + 8 + (w - 22) * (0.5 + 0.5 * sw);
    ty = y + 10 + Math.sin(t * 1.3) * 2;
    dir = Math.cos(k * Math.PI * 2) >= 0 ? 1 : -1;
  }
  px(OUTLINE, tx - 1, ty - 1, 8, 5);
  px("#5fa65a", tx, ty, 6, 3);
  px("#86c97f", tx + 1, ty, 3, 1);
  px("#4f8a3a", tx + 2, ty + 1, 2, 1);
  px("#9ad67a", dir > 0 ? tx + 6 : tx - 2, ty + 1, 2, 2);
  px(OUTLINE, dir > 0 ? tx + 7 : tx - 2, ty + 1);
  px("#9ad67a", tx, ty + 3, 1, 1);
  px("#9ad67a", tx + 5, ty + 3, 1, 1);
  // Fish.
  for (const f of info.fish) {
    const fx = Math.round(f.x);
    const fy = Math.round(f.y);
    const flick = Math.floor(f.phase * 6) % 2;
    px(f.color, fx, fy, 3, 2);
    px(f.color, f.dir > 0 ? fx - 1 : fx + 3, fy - flick, 1, 2 + flick);
    px(OUTLINE, f.dir > 0 ? fx + 2 : fx, fy);
  }
  // Bubbles from the filter, and food when someone feeds them.
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.5 + i / 3) % 1;
    px("rgba(255,255,255,0.7)", x + w - 4 + Math.round(Math.sin(k * 9) * 1), y + h - 6 - k * (h - 8));
  }
  if (info.feeding) {
    for (let i = 0; i < 6; i++) px("#e8b06a", x + 8 + ((i * 7) % (w - 14)), y + 3 + ((t * 6 + i * 3) % 8));
  }
  px("rgba(255,255,255,0.25)", x + 2, y + 3, 1, h - 8);
  return true;
}

// ------------------------------------------------------------------ visitors

export function dressVisitor(ctx: CanvasRenderingContext2D, v: { x: number; y: number; facing: Facing; pose: CharPose; kind: VisitorKind; look?: Look }, t: number): void {
  void t;
  const { x, y, facing, pose, kind } = v;
  const bob = pose === "walk1" || pose === "walk3" ? -1 : 0;
  const bt = y + 14 + bob;
  const px = (c: string, xx: number, yy: number, w = 1, h = 1) => {
    ctx.fillStyle = c;
    ctx.fillRect(xx, yy, w, h);
  };
  const front = facing === "front";
  switch (kind) {
    case "guard": {
      // The hall monitor's sash, and a stop sign in hand.
      if (facing !== "back") for (let i = 0; i < 6; i++) px(C.orange, x + 5 + i + (front ? 0 : 1), bt + i, 2, 1);
      if (pose === "stand" || pose.startsWith("walk")) {
        const sx = facing === "left" ? x + 15 : x + 1;
        px("#6b7280", sx + 2, bt - 1, 1, 7);
        px(OUTLINE, sx, bt - 7, 5, 6);
        px(C.red, sx + 1, bt - 6, 3, 4);
        px("#ffffff", sx + 1, bt - 4, 3, 1);
      }
      break;
    }
    case "janitor":
      // A big ring of keys on the belt.
      if (facing !== "back") {
        const kx = facing === "left" ? x + 6 : x + 11;
        px("#c9a031", kx, bt + 6, 2, 2);
        px("#e8c14a", kx + 1, bt + 8, 1, 1);
        px("#9aa3ad", kx - 1, bt + 8, 1, 1);
      }
      break;
    case "technician":
    case "boss":
      // Staff lanyard (gold for the principal, who may wear their own things at the neck).
      if (front && pose !== "read" && pose !== "present" && pose !== "present-plan" && !(kind === "boss" && wearsAtNeck(v.look))) {
        const strap = kind === "boss" ? C.yellowLo : C.teal;
        px(strap, x + 7, bt, 1, 2);
        px(strap, x + 10, bt, 1, 2);
        px(strap, x + 8, bt + 2, 2, 1);
        px(OUTLINE, x + 7, bt + 3, 4, 3);
        px(kind === "boss" ? "#fbe08a" : "#ffffff", x + 8, bt + 3, 2, 2);
      }
      break;
    case "delivery":
      // A pizza slice on the cap.
      if (facing !== "back") {
        px(C.yellow, x + 9, y + 3, 3, 1);
        px(C.red, x + 10, y + 3, 1, 1);
      }
      break;
  }
}
