// Startup House: the animals and helpers. Pivot, a lazy fawn bulldog with an
// underbite; Beta, the backyard hen who wanders in through the patio door;
// a robot vacuum plastered in stickers; and the aquarium, where the fish
// swim around a tiny server rack with blinking lights.

import { Grid, OUTLINE } from "../../themekit.ts";
import type { PaintInfo } from "../../theme.ts";
import type { CatPose, DogPose } from "../../characters.ts";
import type { Rect } from "../../layout.ts";
import { sprite, STICKERS } from "./kit.ts";

function flipped(g: Grid, left: boolean): Grid {
  return left ? g.flipped() : g;
}

/** Pivot, the house bulldog (20×15): wide, low, wrinkly, an underbite, a spiked collar that fools nobody. */
function bulldog(pose: DogPose, facing: "left" | "right", blink: boolean): HTMLCanvasElement {
  return sprite(`dog-${pose}-${facing}-${blink}`, 20, 15, (g0) => {
    const g = new Grid(20, 15);
    const fur = "#d9a874";
    const furHi = "#ecc69a";
    const furLo = "#b4824e";
    const white = "#f4ece0";
    const muzzle = "#5a4436";
    const collar = "#3a6ec4";
    const eye = OUTLINE;
    if (pose === "loaf") {
      // Flat out, chin on the floor.
      g.rrect(1, 7, 14, 6, fur, 3);
      g.rect(3, 7, 9, 1, furHi);
      g.rect(4, 11, 8, 1, furLo);
      g.rrect(11, 5, 8, 7, fur, 2);
      g.rect(12, 9, 6, 3, white);
      g.rect(14, 10, 4, 2, muzzle);
      g.set(11, 5, furLo).set(18, 5, furLo);
      g.rect(13, 7, 2, 1, eye).rect(16, 7, 2, 1, eye);
      g.rect(11, 11, 1, 1, collar);
      g.rect(2, 12, 3, 1, white).rect(16, 12, 3, 1, white);
    } else if (pose === "sit" || pose === "wag0" || pose === "wag1") {
      // Sitting square, facing you: the big head, the underbite, legs splayed.
      g.rrect(4, 7, 12, 7, fur, 3);
      g.rect(7, 8, 6, 5, white);
      g.rrect(3, 1, 14, 8, fur, 3);
      g.rect(5, 1, 10, 1, furHi);
      g.set(3, 1, furLo).set(4, 1, furLo).set(15, 1, furLo).set(16, 1, furLo);
      g.rect(7, 4, 6, 1, furLo);
      g.rect(6, 5, 8, 4, white);
      g.rect(7, 6, 6, 2, muzzle);
      g.set(8, 8, white).set(11, 8, white);
      if (blink) g.rect(5, 3, 2, 1, eye).rect(13, 3, 2, 1, eye);
      else g.rect(5, 3, 2, 2, eye).rect(13, 3, 2, 2, eye).set(5, 3, "#ffffff").set(13, 3, "#ffffff");
      g.rect(5, 9, 10, 1, collar).set(10, 10, "#c8ced6");
      g.rect(4, 13, 3, 1, white).rect(13, 13, 3, 1, white);
      const wag = pose === "wag1" ? -1 : pose === "wag0" ? 1 : 0;
      g.set(16, 11 + wag, fur).set(17, 11 + wag, furLo);
    } else {
      // Trotting in profile, all shoulders.
      const step = pose === "walk1" ? 1 : 0;
      g.rrect(2, 4, 13, 7, fur, 3);
      g.rect(4, 4, 9, 1, furHi);
      g.rect(5, 9, 7, 2, white);
      g.rrect(11, 2, 8, 8, fur, 2);
      g.set(11, 2, furLo).set(12, 2, furLo);
      g.rect(15, 6, 4, 3, white);
      g.rect(17, 6, 2, 2, muzzle);
      g.set(18, 9, white);
      if (blink) g.rect(14, 4, 2, 1, eye);
      else g.rect(15, 4, 1, 2, eye);
      g.rect(11, 8, 2, 2, collar);
      g.rect(3 + step, 11, 2, 2, furLo).rect(6 - step, 11, 2, 2, fur);
      g.rect(10 + step, 11, 2, 2, furLo).rect(13 - step, 11, 2, 2, fur);
      g.set(1, 5, fur);
    }
    g.outline(OUTLINE);
    g0.stamp(flipped(g, facing === "left"), 0, 0);
  }, false);
}

/** Beta, the backyard hen (16×13): russet feathers, a red comb, opinions. */
function hen(pose: CatPose, facing: "left" | "right", blink: boolean): HTMLCanvasElement {
  return sprite(`hen-${pose}-${facing}-${blink}`, 16, 13, (g0) => {
    const g = new Grid(16, 13);
    const body = "#b8653a";
    const hi = "#d88a52";
    const lo = "#8a4a2a";
    const comb = "#e53a3a";
    const beak = "#f2c14e";
    const leg = "#e8a83a";
    const eye = OUTLINE;
    if (pose === "loaf" || pose === "ride") {
      // Settled down like a tea cosy.
      g.rrect(2, 5, 11, 6, body, 3);
      g.rect(4, 6, 6, 1, hi);
      g.rect(3, 9, 9, 1, lo);
      g.rect(1, 4, 3, 3, lo).set(1, 3, body);
      g.rrect(10, 2, 4, 5, body, 1);
      g.rect(11, 0, 2, 2, comb).set(10, 1, comb);
      g.rect(14, 4, 1, 1, beak).set(12, 6, comb);
      if (!blink) g.set(12, 3, eye);
    } else if (pose === "groom") {
      // Head tucked, preening a wing.
      g.rrect(3, 4, 10, 6, body, 3);
      g.rect(5, 5, 6, 1, hi);
      g.rect(2, 3, 3, 3, lo);
      g.rrect(9, 3, 4, 4, body, 1);
      g.rect(10, 2, 2, 1, comb);
      g.set(9, 6, beak);
      g.vline(6, 10, 2, leg).vline(9, 10, 2, leg);
    } else {
      // Standing or strutting: the head bobs forward with each step.
      const step = pose === "walk1" ? 1 : 0;
      const head = pose === "walk0" ? 1 : 0;
      g.rrect(2, 4, 10, 6, body, 3);
      g.rect(4, 5, 6, 1, hi);
      g.rect(3, 8, 8, 1, lo);
      g.rect(1, 2, 3, 4, lo).set(2, 1, body).set(0, 3, lo);
      g.rrect(9 + head, 1, 4, 5, body, 1);
      g.rect(10 + head, 0, 2, 1, comb).set(12 + head, 0, comb);
      g.rect(13 + head, 3, 2, 1, beak);
      g.set(12 + head, 5, comb);
      if (!blink) g.set(11 + head, 2, eye);
      g.vline(5 + step, 10, 2, leg).vline(8 - step, 10, 2, leg);
      g.set(4 + step, 12, leg).set(9 - step, 12, leg);
    }
    g.outline(OUTLINE);
    g0.stamp(flipped(g, facing === "left"), 0, 0);
  }, false);
}

export function startupPet(kind: "dog" | "cat", pose: DogPose | CatPose, facing: "left" | "right", blink: boolean): HTMLCanvasElement {
  return kind === "dog" ? bulldog(pose as DogPose, facing, blink) : hen(pose as CatPose, facing, blink);
}

/** The robot vacuum, more sticker than plastic (16×9). */
export function stickerBot(): HTMLCanvasElement {
  return sprite("roomba", 16, 9, (g) => {
    g.ellipse(7.5, 4, 7, 3.5, "#3a3a44");
    g.ellipse(7.5, 3.5, 6, 2.5, "#4a4a56");
    g.rect(3, 2, 2, 2, STICKERS[0]!).rect(6, 1, 3, 1, STICKERS[1]!).rect(10, 2, 2, 2, STICKERS[2]!);
    g.rect(7, 4, 2, 2, STICKERS[4]!).rect(4, 5, 2, 1, STICKERS[5]!);
    g.set(12, 4, "#7fe0ff");
    g.rect(2, 7, 12, 1, "#22222a");
  });
}

type FishInfo = PaintInfo & { fish: { x: number; y: number; dir: 1 | -1; color: string; phase: number }[]; feeding: boolean };

/** The aquarium: blue gravel, a tiny server rack with blinking lights, bubbles from its "cooling", the fish. */
export function serverAquarium(ctx: CanvasRenderingContext2D, tank: Rect, info: FishInfo): boolean {
  const { x, y, w, h } = tank;
  const t = info.t;
  const px = (c: string, xx: number, yy: number, ww = 1, hh = 1) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(xx), Math.round(yy), ww, hh);
  };
  px(OUTLINE, x - 1, y - 1, w + 2, h + 2);
  px("#d9f1f7", x, y, w, 2);
  px("#3f9ab8", x, y + 2, w, h - 2);
  px("#56b2cf", x, y + 2, w, 5);
  // Gravel, a sunken keyboard key, two plants.
  for (let i = 0; i < w; i++) px(["#7fb6ee", "#4a7ac0", "#a8d0f4"][(i * 7) % 3]!, x + i, y + h - 3 - (i % 4 === 0 ? 1 : 0), 1, 3 + (i % 4 === 0 ? 1 : 0));
  px("#f4f2ea", x + 30, y + h - 6, 3, 3);
  px("#c8c4b8", x + 30, y + h - 4, 3, 1);
  for (const [sx, hgt] of [[3, 12], [6, 8], [36, 11]] as const) {
    for (let j = 0; j < hgt; j++) px(j % 3 ? "#3f9a5a" : "#57b86f", x + sx + Math.round(Math.sin(t * 1.4 + j * 0.5 + sx) * (j / hgt) * 1.5), y + h - 4 - j);
  }
  // The tiny rack.
  const rx = x + 15;
  const ry = y + h - 15;
  px(OUTLINE, rx - 1, ry - 1, 10, 13);
  px("#3a3a44", rx, ry, 8, 11);
  for (let i = 0; i < 4; i++) {
    px("#22222a", rx + 1, ry + 1 + i * 2.5, 6, 2);
    const on = Math.floor(t * (3 + i) + i * 1.7) % 3 !== 0;
    px(on ? (i % 2 ? "#7be08f" : "#7fe0ff") : "#2a4a3a", rx + 5, ry + 1 + i * 2.5, 1, 1);
  }
  // Bubbles out of the rack's "fans".
  for (let i = 0; i < 4; i++) {
    const q = (t * 0.35 + i / 4) % 1;
    px("rgba(230,250,255,0.7)", rx + 3 + Math.round(Math.sin(q * 8 + i) * 1.5), ry - 2 - q * (ry - y - 6), 1, 1);
  }
  // Food flakes when someone feeds them.
  if (info.feeding) for (let i = 0; i < 6; i++) px("#e8b45a", x + 6 + i * 5, y + 3 + ((t * 6 + i * 3) % 10), 1, 1);
  for (const f of info.fish) {
    const fx = Math.round(f.x);
    const fy = Math.round(f.y);
    const flick = Math.floor(f.phase * 6) % 2;
    px(f.color, fx, fy, 3, 2);
    px(f.color, f.dir > 0 ? fx - 1 : fx + 3, fy - flick, 1, 2 + flick);
    px(OUTLINE, f.dir > 0 ? fx + 2 : fx, fy, 1, 1);
  }
  px("rgba(255,255,255,0.25)", x + 2, y + 3, 1, h - 8);
  return true;
}
