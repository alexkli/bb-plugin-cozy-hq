// Dusty Annex: the animals and the odd things visitors carry. An old scruffy
// terrier who snores, an alley cat who came in through a window and stayed,
// a robot vacuum held together with tape, and one surviving goldfish in a
// tank nobody has cleaned since it was bought.

import type { PaintInfo, Theme, VisitorKind } from "../../theme.ts";
import type { CharPose, Look } from "../../characters.ts";
import type { Facing, Rect } from "../../layout.ts";
import { Grid, OUTLINE, cached } from "../../themekit.ts";
import { P } from "./pal.ts";

type DogPose = "sit" | "walk0" | "walk1" | "loaf" | "wag0" | "wag1";
type CatPose = "sit" | "walk0" | "walk1" | "loaf" | "groom" | "ride";

function flipIf(g: Grid, left: boolean): HTMLCanvasElement {
  g.outline(OUTLINE);
  return (left ? g.flipped() : g).toCanvas();
}

/** A wiry old terrier, grey-brown, eyebrows and a beard like a retired colonel. */
function dog(pose: DogPose, facing: "left" | "right", blink: boolean): HTMLCanvasElement {
  return cached(`annex|dog|${pose}|${facing}|${blink}`, () => {
    const g = new Grid(20, 15);
    const fur = "#857560";
    const lo = "#65584a";
    const hi = "#a2927a";
    const beard = "#c4b89c";
    const eye = OUTLINE;
    if (pose === "loaf") {
      // Flat out, snoring.
      g.rrect(2, 8, 14, 5, fur, 2);
      g.rect(3, 8, 3, 1, hi).rect(8, 8, 2, 1, hi);
      g.rect(4, 12, 10, 1, lo);
      g.rrect(11, 5, 7, 6, fur, 1);
      g.rect(12, 5, 2, 1, hi);
      g.rect(11, 6, 2, 4, lo).rect(17, 6, 1, 3, lo);
      g.rect(14, 9, 4, 2, beard);
      g.rect(13, 7, 2, 1, eye).set(17, 8, eye);
      g.set(1, 10, fur).set(0, 9, lo);
    } else if (pose === "sit" || pose === "wag0" || pose === "wag1") {
      g.rrect(5, 6, 8, 7, fur, 2);
      g.rect(7, 8, 4, 5, beard);
      g.rrect(5, 0, 9, 7, fur, 1);
      g.rect(6, 0, 3, 1, hi);
      // Droopy ears, bushy brows, the beard.
      g.rect(4, 1, 2, 4, lo).rect(13, 1, 2, 4, lo);
      g.rect(7, 2, 2, 1, beard).rect(10, 2, 2, 1, beard);
      if (blink) g.rect(7, 3, 2, 1, eye).rect(10, 3, 2, 1, eye);
      else g.set(8, 3, eye).set(11, 3, eye);
      g.rect(7, 5, 5, 2, beard);
      g.set(9, 4, eye).set(10, 4, eye);
      g.rect(5, 13, 2, 1, lo).rect(11, 13, 2, 1, lo);
      const wag = pose === "wag1" ? -1 : pose === "wag0" ? 1 : 0;
      g.set(14, 10 + wag, fur).set(15, 9 + wag, fur).set(16, 9 + wag, lo);
      g.set(4, 7, hi).set(13, 8, hi);
    } else {
      const step = pose === "walk1" ? 1 : 0;
      g.rrect(2, 5, 13, 6, fur, 2);
      g.rect(3, 5, 4, 1, hi).rect(9, 5, 3, 1, hi);
      g.rect(4, 10, 9, 1, lo);
      g.rrect(12, 1, 7, 6, fur, 1);
      g.rect(12, 2, 2, 4, lo);
      g.rect(15, 2, 2, 1, beard);
      if (blink) g.rect(15, 3, 2, 1, eye);
      else g.set(16, 3, eye);
      g.rect(16, 5, 3, 2, beard);
      g.set(18, 4, eye);
      g.rect(3 + step, 11, 2, 2, lo).rect(6 - step, 11, 2, 2, fur);
      g.rect(10 + step, 11, 2, 2, lo).rect(13 - step, 11, 2, 2, fur);
      g.set(1, 5, fur).set(0, 4, fur).set(0, 3, lo);
    }
    return flipIf(g, facing === "left");
  });
}

/** A scrappy black-and-white tom: a torn ear, a kinked tail, green eyes. */
function cat(pose: CatPose, facing: "left" | "right", blink: boolean): HTMLCanvasElement {
  return cached(`annex|cat|${pose}|${facing}|${blink}`, () => {
    const g = new Grid(16, 13);
    const fur = "#2e2a2c";
    const lo = "#221e20";
    const white = "#d4cebe";
    const eye = "#9ac04a";
    if (pose === "loaf") {
      g.rrect(2, 6, 11, 5, fur, 2);
      g.rect(4, 10, 7, 1, white);
      g.rrect(9, 3, 6, 5, fur, 1);
      g.set(9, 2, fur).set(14, 2, lo);
      g.rect(11, 6, 3, 2, white);
      if (blink) g.rect(10, 5, 1, 1, lo).rect(13, 5, 1, 1, lo);
      else g.set(10, 5, eye).set(13, 5, eye);
      g.rect(1, 9, 2, 1, fur).set(0, 8, fur);
    } else if (pose === "sit" || pose === "groom") {
      g.rrect(4, 6, 7, 6, fur, 2);
      g.rect(6, 7, 3, 5, white);
      g.rrect(5, 1, 7, 6, fur, 1);
      // One ear torn in a fight long ago.
      g.set(5, 0, fur).set(11, 1, lo);
      g.rect(7, 4, 3, 2, white);
      if (blink || pose === "groom") g.rect(6, 3, 2, 1, lo).rect(9, 3, 2, 1, lo);
      else g.set(7, 3, eye).set(10, 3, eye);
      g.set(8, 5, "#c07a80");
      g.rect(5, 11, 2, 1, white).rect(8, 11, 2, 1, white);
      g.rect(11, 10, 2, 1, fur).set(13, 9, fur).set(13, 8, fur).set(14, 7, fur);
      if (pose === "groom") g.rect(6, 6, 2, 2, white);
    } else {
      const step = pose === "walk1" ? 1 : 0;
      g.rrect(2, 5, 10, 5, fur, 2);
      g.rect(4, 9, 6, 1, white);
      g.rrect(9, 1, 6, 5, fur, 1);
      g.set(9, 0, fur).set(14, 1, lo);
      g.rect(12, 4, 3, 2, white);
      if (blink) g.rect(12, 3, 2, 1, lo);
      else g.set(13, 3, eye);
      if (pose !== "ride") {
        g.rect(3 + step, 10, 1, 2, white).rect(6 - step, 10, 1, 2, fur);
        g.rect(8 + step, 10, 1, 2, white).rect(10 - step, 10, 1, 2, fur);
      }
      // The kinked tail.
      g.rect(0, 4, 2, 1, fur).set(1, 3, fur).set(0, 2, fur).set(1, 1, fur);
    }
    return flipIf(g, facing === "left");
  });
}

function roomba(): HTMLCanvasElement {
  return cached("annex|roomba", () => {
    // A robot vacuum from a jumble sale: dented, taped, one light still on.
    const g = new Grid(16, 9);
    g.ellipse(8, 4, 6.5, 3.2, "#5e5e58");
    g.ellipse(8, 3.5, 5, 2, "#7a7a72");
    g.rect(4, 3, 4, 1, P.tape).rect(5, 2, 2, 1, P.tape);
    g.set(10, 3, "#d04a3a");
    g.rect(3, 6, 10, 1, "#3e3e38");
    g.set(13, 5, null).set(14, 4, null).set(13, 4, "#4a4a44");
    g.outline(OUTLINE);
    return g.toCanvas();
  });
}

/** One surviving goldfish in a tank gone green. */
function fishTank(ctx: CanvasRenderingContext2D, tank: Rect, info: PaintInfo & { fish: { x: number; y: number; dir: 1 | -1; color: string; phase: number }[]; feeding: boolean }): boolean {
  const { x, y, w, h } = tank;
  const t = info.t;
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  // Scum on top, green murk, gravel and a sunken mug.
  ctx.fillStyle = "#8a9a62";
  ctx.fillRect(x, y, w, 2);
  ctx.fillStyle = "#4a5e36";
  ctx.fillRect(x, y + 2, w, h - 2);
  ctx.fillStyle = "#56693e";
  ctx.fillRect(x, y + 2, w, 6);
  ctx.fillStyle = "#3e4e2e";
  ctx.fillRect(x, y + h - 9, w, 5);
  ctx.fillStyle = "#5e5442";
  ctx.fillRect(x, y + h - 4, w, 4);
  ctx.fillStyle = "#6e6450";
  for (let i = 2; i < w; i += 5) ctx.fillRect(x + i, y + h - 4, 2, 1);
  ctx.fillStyle = "#c8bc97";
  ctx.fillRect(x + 26, y + h - 8, 5, 4);
  ctx.fillStyle = "#4a5e36";
  ctx.fillRect(x + 27, y + h - 7, 3, 2);
  ctx.fillStyle = "#c8bc97";
  ctx.fillRect(x + 31, y + h - 7, 1, 2);
  // Algae crawling up the glass.
  ctx.fillStyle = "#6a8a3e";
  for (let i = 0; i < 6; i++) ctx.fillRect(x + (i * 7) % w, y + h - 6 - (i % 3) * 3, 2, 3 + (i % 2) * 3);
  ctx.fillRect(x, y + 3, 1, h - 6);
  ctx.fillRect(x + w - 1, y + 5, 1, h - 9);
  // A plastic weed that has seen things.
  ctx.fillStyle = "#7a7a3a";
  for (let j = 0; j < 9; j++) ctx.fillRect(x + 8 + Math.round(Math.sin(t * 1.2 + j * 0.6) * (j / 9) * 1.5), y + h - 5 - j, 1, 1);
  // A wheezy air stone.
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.6 + i / 3) % 1;
    ctx.fillStyle = "rgba(210,230,190,0.6)";
    ctx.fillRect(x + 4 + Math.round(Math.sin(t * 3 + i) * 1), Math.round(y + h - 5 - k * (h - 8)), 1, 1);
  }
  // The goldfish, carrying on regardless.
  const f = info.fish[0];
  if (f) {
    const fx = Math.round(f.x);
    const fy = Math.round(f.y);
    const flick = Math.floor(f.phase * 6) % 2;
    ctx.fillStyle = "#e08a3a";
    ctx.fillRect(fx, fy, 3, 2);
    ctx.fillRect(f.dir > 0 ? fx - 1 : fx + 3, fy - flick, 1, 2 + flick);
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(f.dir > 0 ? fx + 2 : fx, fy, 1, 1);
  }
  if (info.feeding) {
    ctx.fillStyle = "#d8b060";
    for (let i = 0; i < 5; i++) ctx.fillRect(x + 6 + i * 6 + Math.round(Math.sin(t * 2 + i)), y + 2 + ((Math.floor(t * 6) + i * 3) % 8), 1, 1);
  }
  ctx.fillStyle = "rgba(220,230,200,0.18)";
  ctx.fillRect(x + 2, y + 3, 1, h - 8);
  return true;
}

/** What visitors carry: a dripping umbrella and a takeaway bag, a torch, a toolbox, your hat. */
function dressVisitor(ctx: CanvasRenderingContext2D, v: { x: number; y: number; facing: Facing; pose: CharPose; kind: VisitorKind; look?: Look }, t: number): void {
  const bob = v.pose === "walk1" || v.pose === "walk3" ? -1 : 0;
  const left = v.facing === "left";
  const handA = v.x + (left ? 6 : 13);
  const handB = v.x + (left ? 15 : 4);
  const hy = v.y + 18 + bob;
  const r = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(x), Math.round(y), w, h);
  };
  switch (v.kind) {
    case "delivery": {
      // A soggy umbrella over the head...
      const cx = handA;
      const top = v.y - 3 + bob;
      r(cx - 8, top, 16, 4, OUTLINE);
      r(cx - 7, top - 1, 14, 1, OUTLINE);
      r(cx - 7, top, 14, 3, "#2f4a3a");
      r(cx - 6, top, 12, 1, "#466a54");
      r(cx - 4, top + 1, 1, 2, "#24382c");
      r(cx + 3, top + 1, 1, 2, "#24382c");
      r(cx, top + 4, 1, hy - top - 4, "#3a3632");
      for (let i = 0; i < 2; i++) {
        const k = (t * 1.4 + i * 0.5) % 1;
        r(cx + (i ? 7 : -8), top + 3 + k * 9, 1, 1, "rgba(160,200,230,0.9)");
      }
      // ...and the takeaway, in a carrier bag.
      r(handB - 2, hy, 5, 5, OUTLINE);
      r(handB - 1, hy + 1, 3, 3, "#e2dccb");
      r(handB - 1, hy + 2, 3, 1, P.red);
      break;
    }
    case "guard":
      // A heavy torch.
      r(handA - 1, hy - 1, 3, 5, OUTLINE);
      r(handA, hy, 1, 3, "#3a3a36");
      r(handA, hy + 3, 1, 1, "#ffe08a");
      break;
    case "technician":
      // The toolbox, older than the building.
      r(handB - 3, hy, 7, 5, OUTLINE);
      r(handB - 2, hy + 1, 5, 3, "#8e3b32");
      r(handB - 2, hy + 1, 5, 1, "#a9503f");
      r(handB - 1, hy - 1, 3, 1, OUTLINE);
      break;
    case "boss": {
      // You, in a trilby that matches the coat (unless you picked a hat of your own).
      if (v.look?.hat) break;
      const top = v.y + 1 + bob;
      r(v.x + 6, top - 1, 8, 4, OUTLINE);
      r(v.x + 4, top + 2, 12, 2, OUTLINE);
      r(v.x + 7, top, 6, 2, "#5e4a38");
      r(v.x + 7, top + 1, 6, 1, "#3a2a20");
      r(v.x + 5, top + 2, 10, 1, "#6e5a44");
      break;
    }
    default:
      break;
  }
}

export const PETS: Pick<Theme, "pet" | "roomba" | "fishTank" | "dressVisitor"> = {
  pet: (kind, pose, facing, blink) => (kind === "dog" ? dog(pose as DogPose, facing, blink) : cat(pose as CatPose, facing, blink)),
  roomba: () => roomba(),
  fishTank,
  dressVisitor,
};
