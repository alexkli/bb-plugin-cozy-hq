// Sky Loft: the residents and the help. Biscuit is a fawn French bulldog,
// Pixel a sleek grey cat; a lidar robot vacuum does the floors, discus swim
// in a dark planted aquarium; building security wears a peaked cap, the
// courier an insulated bag, the facilities tech carries a tablet.
import type { CatPose, CharPose, DogPose, Look } from "../../characters.ts";
import type { Facing, Rect } from "../../layout.ts";
import type { PaintInfo, VisitorKind } from "../../theme.ts";
import { Grid, hash, OUTLINE } from "../../themekit.ts";
import { C, sprite } from "./kit.ts";

// ------------------------------------------------------------------ the dog

function frenchie(pose: DogPose, facing: "left" | "right", blink: boolean): HTMLCanvasElement {
  return sprite(`frenchie-${pose}-${facing}-${blink}`, 20, 15, (out) => {
    const g = new Grid(20, 15);
    const fur = "#d8b086";
    const furLo = "#b88d63";
    const mask = "#3e322c";
    const chest = "#f3eadc";
    const ear = "#e3a29a";
    const eye = OUTLINE;
    if (pose === "loaf") {
      g.rrect(2, 8, 13, 5, fur, 2);
      g.rect(4, 11, 9, 2, furLo);
      g.rrect(10, 4, 8, 6, fur, 1);
      g.rect(10, 1, 2, 3, fur).rect(16, 1, 2, 3, fur).set(11, 2, ear).set(16, 2, ear);
      g.rect(14, 6, 4, 3, mask);
      g.set(12, 6, eye).set(17, 6, "#1f1814");
      g.set(1, 9, furLo);
    } else if (pose === "sit" || pose === "wag0" || pose === "wag1") {
      g.rrect(5, 8, 10, 6, fur, 2);
      g.rect(7, 9, 6, 5, chest);
      g.rrect(4, 2, 12, 7, fur, 2);
      // Bat ears, upright.
      g.rect(4, 0, 3, 3, fur).rect(13, 0, 3, 3, fur).set(5, 1, ear).set(14, 1, ear);
      // The flat black mask.
      g.rect(7, 5, 6, 3, mask).set(9, 4, mask).set(10, 4, mask);
      g.set(9, 6, "#1f1814").set(10, 6, "#1f1814");
      if (blink) g.rect(5, 4, 2, 1, eye).rect(13, 4, 2, 1, eye);
      else g.set(6, 4, eye).set(13, 4, eye);
      g.set(9, 8, "#e07f8a");
      g.rect(6, 14, 2, 1, furLo).rect(12, 14, 2, 1, furLo);
      const wag = pose === "wag1" ? -1 : pose === "wag0" ? 1 : 0;
      g.set(15, 11 + wag, furLo);
    } else {
      const step = pose === "walk1" ? 1 : 0;
      g.rrect(3, 5, 12, 6, fur, 2);
      g.rect(5, 9, 8, 2, chest);
      g.rrect(12, 2, 7, 7, fur, 2);
      g.rect(12, 0, 2, 3, fur).rect(16, 0, 2, 3, fur).set(13, 1, ear).set(16, 1, ear);
      g.rect(16, 5, 3, 3, mask);
      if (blink) g.rect(14, 4, 2, 1, eye);
      else g.set(15, 4, eye);
      g.rect(4 + step, 11, 2, 2, furLo).rect(7 - step, 11, 2, 2, fur);
      g.rect(10 + step, 11, 2, 2, furLo).rect(13 - step, 11, 2, 2, fur);
      g.set(2, 6, furLo);
    }
    g.outline(OUTLINE);
    out.stamp(facing === "left" ? g.flipped() : g, 0, 0);
  });
}

// ------------------------------------------------------------------ the cat

function greyCat(pose: CatPose, facing: "left" | "right", blink: boolean): HTMLCanvasElement {
  return sprite(`greycat-${pose}-${facing}-${blink}`, 16, 13, (out) => {
    const g = new Grid(16, 13);
    const fur = "#8b939f";
    const furLo = "#6d7581";
    const furHi = "#a8afba";
    const ear = "#d9a3ad";
    const eye = "#7fd39a";
    if (pose === "loaf") {
      g.rrect(2, 6, 11, 5, fur, 2);
      g.rect(4, 6, 6, 1, furHi);
      g.rect(4, 10, 7, 1, furLo);
      g.rrect(9, 3, 6, 5, fur, 1);
      g.set(9, 2, fur).set(14, 2, fur).set(10, 2, ear);
      if (blink) g.rect(10, 5, 1, 1, OUTLINE).rect(13, 5, 1, 1, OUTLINE);
      else g.set(10, 5, eye).set(13, 5, eye);
      g.rect(1, 9, 2, 1, furLo);
    } else if (pose === "sit" || pose === "groom") {
      g.rrect(4, 6, 7, 6, fur, 2);
      g.rect(5, 7, 2, 3, furHi);
      g.rrect(5, 1, 7, 6, fur, 1);
      g.set(5, 0, fur).set(11, 0, fur).set(6, 1, ear).set(10, 1, ear);
      if (blink || pose === "groom") g.rect(6, 3, 2, 1, OUTLINE).rect(9, 3, 2, 1, OUTLINE);
      else g.set(7, 3, eye).set(7, 4, OUTLINE).set(10, 3, eye).set(10, 4, OUTLINE);
      g.set(8, 5, "#c98a94").set(9, 5, "#c98a94");
      // A long, thin tail curled round.
      g.rect(11, 11, 3, 1, fur).set(14, 10, fur).set(14, 9, furLo).set(14, 8, furLo);
      if (pose === "groom") g.rect(6, 6, 2, 2, furHi);
    } else {
      const step = pose === "walk1" ? 1 : 0;
      g.rrect(2, 5, 10, 4, fur, 2);
      g.rect(3, 5, 7, 1, furHi);
      g.rect(3, 8, 8, 1, furLo);
      g.rrect(10, 1, 5, 5, fur, 1);
      g.set(10, 0, fur).set(14, 0, fur).set(13, 1, ear);
      if (blink) g.rect(12, 3, 2, 1, OUTLINE);
      else g.set(13, 2, eye).set(13, 3, OUTLINE);
      g.set(14, 4, "#c98a94");
      if (pose !== "ride") {
        g.rect(3 + step, 9, 1, 3, furLo).rect(5 - step, 9, 1, 3, fur);
        g.rect(9 + step, 9, 1, 3, furLo).rect(11 - step, 9, 1, 3, fur);
      }
      g.rect(0, 3, 2, 1, fur).set(0, 2, furLo).set(1, 4, fur);
    }
    g.outline(OUTLINE);
    out.stamp(facing === "left" ? g.flipped() : g, 0, 0);
  });
}

export function skylinePet(kind: "dog" | "cat", pose: DogPose | CatPose, facing: "left" | "right", blink: boolean): HTMLCanvasElement {
  return kind === "dog" ? frenchie(pose as DogPose, facing, blink) : greyCat(pose as CatPose, facing, blink);
}

/** A matte black robot vacuum with a lidar turret. */
export function skylineRoomba(): HTMLCanvasElement {
  return sprite("robovac", 16, 9, (g) => {
    g.ellipse(8, 4.5, 6.5, 3.2, "#1f2126");
    g.ellipse(8, 4, 5.4, 2.3, "#2f3238");
    g.rect(4, 3, 3, 1, "#454a53");
    g.rect(7, 2, 3, 2, "#3a3d44").set(8, 2, "#7cc8ff");
    g.rect(4, 7, 8, 1, "#c8a04c");
    g.outline(OUTLINE);
  });
}

// ------------------------------------------------------------------ the aquarium

const DISCUS = ["#ff8a3d", "#e5604a", "#3fc1c9", "#f2d14a", "#ff6fa3", "#7cc8ff"];

/** A dark planted aquarium with driftwood and discus (the fish swim where the office says). */
export function skylineFishTank(ctx: CanvasRenderingContext2D, tank: Rect, info: PaintInfo & { fish: { x: number; y: number; dir: 1 | -1; color: string; phase: number }[]; feeding: boolean }): boolean {
  const { x, y, w, h } = tank;
  const t = info.t;
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  // Deep water, lighter under the LED bar.
  const bands = ["#2f7d99", "#286f8c", "#22617d", "#1d5570", "#194a63"];
  for (let i = 0; i < bands.length; i++) {
    ctx.fillStyle = bands[i]!;
    ctx.fillRect(x, y + 2 + Math.floor((i * (h - 2)) / bands.length), w, Math.ceil((h - 2) / bands.length) + 1);
  }
  ctx.fillStyle = "#e9f6ff";
  ctx.fillRect(x, y, w, 1);
  ctx.fillStyle = "#9fd8f0";
  ctx.fillRect(x, y + 1, w, 1);
  // Sand, driftwood and long-leaved plants swaying.
  ctx.fillStyle = "#d9cdb0";
  ctx.fillRect(x, y + h - 3, w, 3);
  ctx.fillStyle = "#c4b590";
  for (let i = 2; i < w; i += 5) ctx.fillRect(x + i, y + h - 2, 2, 1);
  ctx.fillStyle = "#5a4232";
  for (let i = 0; i < 9; i++) ctx.fillRect(x + 12 + i, y + h - 4 - Math.round(i * 0.7), 2, 1);
  ctx.fillRect(x + 16, y + h - 8, 1, 4);
  for (const [sx, hgt] of [[4, 14], [7, 10], [29, 16], [33, 11], [36, 13]] as const) {
    if (sx >= w - 1) continue;
    for (let j = 0; j < hgt; j++) {
      const off = Math.round(Math.sin(t * 1.2 + j * 0.45 + sx) * (j / hgt) * 1.5);
      ctx.fillStyle = j % 3 ? "#3f9a5a" : "#6fc27a";
      ctx.fillRect(x + sx + off, y + h - 4 - j, 1, 1);
    }
  }
  // Discus: round, flat and bright.
  for (const f of info.fish) {
    const fx = Math.round(f.x);
    const fy = Math.round(f.y);
    const c = DISCUS[hash(f.color) % DISCUS.length]!;
    ctx.fillStyle = c;
    ctx.fillRect(fx, fy - 1, 3, 4);
    ctx.fillRect(fx - 1, fy, 5, 2);
    ctx.fillStyle = "#ffffff55";
    ctx.fillRect(fx + 1, fy - 1, 1, 4);
    ctx.fillStyle = c;
    const flick = Math.floor(f.phase * 6) % 2;
    ctx.fillRect(f.dir > 0 ? fx - 2 : fx + 4, fy - flick, 1, 2);
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(f.dir > 0 ? fx + 2 : fx, fy, 1, 1);
  }
  // Bubbles from the back corner, flakes when someone feeds them.
  ctx.fillStyle = "#cfefff";
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.5 + i / 3) % 1;
    ctx.fillRect(x + w - 5 + (i % 2), Math.round(y + h - 4 - k * (h - 7)), 1, 1);
  }
  if (info.feeding) {
    ctx.fillStyle = "#e9c46a";
    for (let i = 0; i < 6; i++) ctx.fillRect(x + 6 + i * 5, Math.round(y + 3 + ((t * 6 + i * 3) % (h - 7))), 1, 1);
  }
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(x + 2, y + 3, 1, h - 8);
  return true;
}

// ------------------------------------------------------------------ visitors

/** Extras on you and the visitors (x, y: the 20×28 sprite's top-left). */
export function skylineDressVisitor(ctx: CanvasRenderingContext2D, v: { x: number; y: number; facing: Facing; pose: CharPose; kind: VisitorKind; look?: Look }): void {
  const bob = v.pose === "walk1" || v.pose === "walk3" ? -1 : 0;
  const flip = v.facing === "left";
  const px = (col: number, row: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(flip ? v.x + 20 - col - w : v.x + col, v.y + row + bob, w, h);
  };
  switch (v.kind) {
    case "guard": {
      // A peaked cap with a brass badge.
      px(3, 1, 14, 1, OUTLINE);
      px(3, 2, 14, 3, "#22293d");
      px(4, 2, 12, 1, "#33405c");
      if (v.facing !== "back") {
        px(v.facing === "front" ? 2 : 6, 5, v.facing === "front" ? 16 : 12, 1, "#111318");
        if (v.facing === "front") px(9, 3, 2, 1, C.brassHi);
      }
      break;
    }
    case "delivery": {
      // An insulated food bag on the back.
      const bag = "#1f8a7d";
      const hi = "#3fb3a4";
      if (v.facing === "back") {
        px(4, 12, 12, 10, OUTLINE);
        px(5, 13, 10, 8, bag);
        px(5, 13, 10, 1, hi);
        px(5, 17, 10, 1, "#e9f6f2");
      } else if (v.facing === "front") {
        px(3, 11, 2, 3, bag);
        px(15, 11, 2, 3, bag);
      } else {
        px(0, 12, 5, 10, OUTLINE);
        px(1, 13, 4, 8, bag);
        px(1, 13, 4, 1, hi);
      }
      break;
    }
    case "technician": {
      // A tablet with the work order.
      if (v.facing === "back") break;
      const col = v.facing === "front" ? 12 : 13;
      px(col, 18, 5, 4, OUTLINE);
      px(col + 1, 19, 3, 2, "#5ab0e8");
      break;
    }
    case "boss": {
      // A crisp shirt and a tie under the suit (the other figures keep their own neckline).
      if (v.facing !== "front" || (v.look?.figure && v.look.figure !== "man")) break;
      px(8, 14, 3, 1, "#f4f2ee");
      px(9, 15, 1, 3, "#b8434f");
      break;
    }
    default:
      break;
  }
}
