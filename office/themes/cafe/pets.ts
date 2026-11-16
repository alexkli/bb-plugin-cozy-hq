// Coffee Shop: the animals and helpers. Mocha, the café dog, a scruffy brown
// terrier in the shop's green bandana who sleeps by the door; Biscotti, the
// cream-and-ginger shop cat with a bell on her collar who owns the
// windowsill; a little sweeping robot with two spinning brushes; and the
// aquarium on the sideboard by the fire, with a ceramic coffee cup the fish
// swim through.
import type { CatPose, DogPose } from "../../characters.ts";
import type { Rect } from "../../layout.ts";
import type { PaintInfo } from "../../theme.ts";
import { Grid, OUTLINE, shade as tone } from "../../themekit.ts";
import { C, sprite } from "./kit.ts";

const flipped = (g: Grid, left: boolean): Grid => (left ? g.flipped() : g);

/** Mocha (20×15): a scruffy brown terrier, wiry eyebrows and beard, a green bandana. */
function terrier(pose: DogPose, facing: "left" | "right", blink: boolean): HTMLCanvasElement {
  return sprite(`dog-${pose}-${facing}-${blink}`, 20, 15, (g0) => {
    const g = new Grid(20, 15);
    const fur = "#8a5a3a";
    const hi = "#a8774f";
    const lo = "#6a4128";
    const scruff = "#dcc09a";
    const nose = "#2a1e2e";
    const band = C.green;
    const bandHi = C.greenHi;
    const eye = OUTLINE;
    if (pose === "loaf") {
      // Curled up flat, chin on the paws.
      g.rrect(1, 7, 13, 6, fur, 3);
      g.rect(3, 7, 8, 1, hi);
      g.rect(3, 11, 9, 1, lo);
      g.set(2, 8, scruff).set(5, 8, scruff).set(8, 8, scruff);
      g.rrect(11, 5, 8, 7, fur, 2);
      g.rect(11, 4, 2, 3, lo).rect(17, 4, 2, 3, lo);
      g.rect(14, 9, 5, 3, scruff);
      g.set(18, 9, nose);
      if (!blink) g.set(14, 7, eye).set(17, 7, eye);
      else g.rect(13, 7, 2, 1, eye).rect(16, 7, 2, 1, eye);
      g.rect(13, 6, 2, 1, scruff).rect(16, 6, 2, 1, scruff);
      g.rect(10, 10, 2, 2, band).set(10, 10, bandHi);
      g.rect(14, 12, 4, 1, scruff);
      g.set(0, 9, fur).set(0, 8, hi);
    } else if (pose === "sit" || pose === "wag0" || pose === "wag1") {
      // Sitting up straight, facing you: folded ears, bushy eyebrows, the beard, the bandana.
      g.rrect(6, 8, 8, 6, fur, 2);
      g.rect(8, 9, 4, 4, hi);
      g.rrect(5, 1, 10, 8, fur, 2);
      g.rect(6, 1, 8, 1, hi);
      g.rect(3, 1, 3, 4, lo).set(3, 4, fur).rect(14, 1, 3, 4, lo).set(16, 4, fur);
      g.rect(6, 3, 3, 1, scruff).rect(11, 3, 3, 1, scruff);
      if (blink) g.rect(7, 4, 2, 1, eye).rect(11, 4, 2, 1, eye);
      else g.set(8, 4, eye).set(11, 4, eye).set(8, 5, eye).set(11, 5, eye);
      g.rect(7, 6, 6, 3, scruff).set(6, 7, scruff).set(13, 7, scruff);
      g.rect(9, 6, 2, 1, nose);
      g.rect(8, 8, 4, 1, tone(scruff, -0.12));
      // The bandana: a triangle down the chest.
      g.rect(6, 9, 8, 1, band);
      g.rect(7, 10, 6, 1, band).rect(8, 11, 4, 1, band).rect(9, 12, 2, 1, band);
      g.set(8, 10, bandHi).set(10, 11, C.cream);
      g.rect(7, 13, 2, 2, lo).rect(11, 13, 2, 2, lo).set(7, 14, scruff).set(12, 14, scruff);
      const wag = pose === "wag1" ? -1 : pose === "wag0" ? 1 : 0;
      g.set(14, 11 + wag, fur).set(15, 10 + wag, fur).set(16, 9 + wag, fur).set(16, 8 + wag, scruff);
    } else {
      // Trotting in profile: a wiry back, the tail up like an antenna.
      const step = pose === "walk1" ? 1 : 0;
      g.rrect(2, 5, 12, 6, fur, 2);
      g.rect(3, 5, 9, 1, hi);
      g.set(4, 4, scruff).set(7, 4, scruff).set(10, 4, scruff);
      g.rect(4, 10, 8, 1, lo);
      g.rrect(11, 2, 8, 7, fur, 2);
      g.rect(12, 0, 2, 3, lo).set(13, 0, fur);
      g.rect(15, 5, 4, 3, scruff);
      g.set(19, 5, nose).set(18, 5, nose);
      g.rect(15, 3, 3, 1, scruff);
      if (blink) g.rect(15, 4, 2, 1, eye);
      else g.set(16, 4, eye);
      g.rect(11, 8, 3, 2, band).set(12, 8, bandHi);
      g.rect(3 + step, 11, 2, 3, lo).rect(6 - step, 11, 2, 3, fur);
      g.rect(10 + step, 11, 2, 3, lo).rect(13 - step, 11, 2, 3, fur);
      g.rect(1, 2, 1, 4, fur).set(1, 1, scruff);
    }
    g.outline(OUTLINE);
    g0.stamp(flipped(g, facing === "left"), 0, 0);
  }, false);
}

/** Biscotti (16×13): a cream cat with ginger stripes, white socks and a red collar with a gold bell. */
function shopCat(pose: CatPose, facing: "left" | "right", blink: boolean): HTMLCanvasElement {
  return sprite(`cat-${pose}-${facing}-${blink}`, 16, 13, (g0) => {
    const g = new Grid(16, 13);
    const fur = "#ecc996";
    const lo = "#d4a86a";
    const stripe = "#c8844a";
    const white = "#fbf3e6";
    const ear = "#f2b2b0";
    const collar = "#c8423a";
    const bell = C.brassHi;
    const eye = "#4a7a3a";
    if (pose === "loaf" || pose === "ride") {
      // A neat loaf, paws tucked.
      g.rrect(2, 6, 11, 5, fur, 2);
      g.rect(3, 10, 9, 1, lo);
      g.set(4, 6, stripe).set(6, 6, stripe).set(8, 6, stripe);
      g.rrect(9, 3, 6, 5, fur, 1);
      g.set(9, 2, fur).set(14, 2, fur).set(10, 2, ear).set(13, 2, ear);
      g.set(11, 3, stripe).set(12, 3, stripe);
      if (blink || pose === "ride") g.rect(10, 5, 2, 1, OUTLINE).rect(13, 5, 1, 1, OUTLINE);
      else g.set(10, 5, eye).set(13, 5, eye);
      g.rect(9, 8, 5, 1, collar).set(11, 9, bell);
      g.rect(12, 10, 2, 1, white);
      g.rect(0, 9, 3, 1, fur).set(0, 8, stripe);
    } else if (pose === "sit" || pose === "groom") {
      // Sitting tall: white chest, tail round the paws.
      g.rrect(4, 6, 7, 6, fur, 2);
      g.rect(6, 8, 3, 4, white);
      g.rrect(5, 1, 7, 6, fur, 1);
      g.set(5, 0, fur).set(11, 0, fur).set(6, 1, ear).set(10, 1, ear);
      g.set(7, 1, stripe).set(9, 1, stripe).set(8, 2, stripe);
      if (blink || pose === "groom") g.rect(6, 3, 2, 1, OUTLINE).rect(9, 3, 2, 1, OUTLINE);
      else g.rect(7, 3, 1, 2, eye).rect(10, 3, 1, 2, eye);
      g.set(8, 5, "#e07f8a").set(9, 5, "#e07f8a");
      g.rect(5, 7, 7, 1, collar).set(8, 8, bell);
      g.set(4, 9, stripe).set(10, 9, stripe);
      g.rect(5, 11, 2, 1, white).rect(9, 11, 2, 1, white);
      g.rect(11, 10, 3, 1, fur).set(13, 9, stripe).set(13, 8, fur);
      if (pose === "groom") g.rect(6, 6, 2, 2, white);
    } else {
      // Walking in profile, tail up.
      const step = pose === "walk1" ? 1 : 0;
      g.rrect(2, 5, 10, 5, fur, 2);
      g.rect(3, 9, 8, 1, lo);
      g.set(4, 5, stripe).set(6, 5, stripe).set(8, 5, stripe).set(5, 6, stripe).set(7, 6, stripe);
      g.rrect(9, 1, 6, 5, fur, 1);
      g.set(9, 0, fur).set(14, 0, fur).set(13, 1, ear);
      g.set(11, 1, stripe);
      if (blink) g.rect(12, 3, 2, 1, OUTLINE);
      else g.rect(13, 2, 1, 2, eye);
      g.set(14, 4, "#e07f8a");
      g.rect(10, 6, 3, 1, collar).set(11, 7, bell);
      g.rect(3 + step, 10, 1, 2, lo).rect(6 - step, 10, 1, 2, fur);
      g.rect(8 + step, 10, 1, 2, lo).rect(10 - step, 10, 1, 2, fur);
      g.set(3 + step, 11, white).set(6 - step, 11, white).set(8 + step, 11, white).set(10 - step, 11, white);
      g.rect(0, 3, 2, 1, fur).set(1, 4, fur).set(0, 1, stripe).set(0, 2, fur);
    }
    g.outline(OUTLINE);
    g0.stamp(flipped(g, facing === "left"), 0, 0);
  }, false);
}

export function cafePet(kind: "dog" | "cat", pose: DogPose | CatPose, facing: "left" | "right", blink: boolean): HTMLCanvasElement | null {
  return kind === "dog" ? terrier(pose as DogPose, facing, blink) : shopCat(pose as CatPose, facing, blink);
}

/** The sweeping robot (16×9): a little dome on two spinning brushes, a dustpan lip at the front. */
export function cafeRoomba(): HTMLCanvasElement | null {
  return sprite("roomba", 16, 9, (g) => {
    g.ellipse(7.5, 4.5, 7, 3.5, C.green);
    g.ellipse(7.5, 3.5, 5.5, 2.5, C.greenHi);
    g.rect(5, 2, 5, 1, "#7ab8a0");
    g.set(10, 4, C.warm).set(5, 4, C.chalk);
    // The brushes: bristles fanned out at both front corners.
    g.rect(0, 6, 3, 2, C.kraft).set(1, 5, C.kraftLo).set(0, 8, C.kraftLo);
    g.rect(13, 6, 3, 2, C.kraft).set(14, 5, C.kraftLo).set(15, 8, C.kraftLo);
    g.rect(4, 7, 8, 1, C.iron);
  });
}

type FishInfo = PaintInfo & { fish: { x: number; y: number; dir: 1 | -1; color: string; phase: number }[]; feeding: boolean };

/** The aquarium on the sideboard: sand, river stones, swaying plants, a ceramic coffee cup tipped on its side, the fish. */
export function cafeFishTank(ctx: CanvasRenderingContext2D, tank: Rect, info: FishInfo): boolean {
  const { x, y, w, h } = tank;
  const t = info.t;
  const px = (c: string, xx: number, yy: number, ww = 1, hh = 1) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(xx), Math.round(yy), ww, hh);
  };
  // The glass and the water, a little green from the plants.
  px(OUTLINE, x - 1, y - 1, w + 2, h + 2);
  px(C.walnut, x - 1, y - 1, w + 2, 2);
  px(C.walnutHi, x, y - 1, w, 1);
  px("#cfeee6", x, y + 1, w, 1);
  px("#4f9fa0", x, y + 2, w, h - 2);
  px("#62b2ae", x, y + 2, w, 6);
  px("#468f90", x, y + h - 8, w, 4);
  // Sand and stones.
  for (let i = 0; i < w; i++) px(i % 5 === 0 ? "#c8b48a" : "#e2d2a8", x + i, y + h - 3 - (i % 7 === 3 ? 1 : 0), 1, 3 + (i % 7 === 3 ? 1 : 0));
  px("#8e98a2", x + 4, y + h - 5, 4, 2);
  px("#b8c0c8", x + 5, y + h - 5, 2, 1);
  px("#7a8088", x + w - 12, y + h - 4, 3, 2);
  // The cup, tipped over, the fish's favorite cave.
  const cx = x + w - 20;
  const cy = y + h - 9;
  px(OUTLINE, cx - 1, cy - 1, 9, 7);
  px(C.cream, cx, cy, 7, 5);
  px(C.creamLo, cx, cy + 4, 7, 1);
  px("#2a4a4a", cx, cy + 1, 2, 3);
  px(C.green, cx + 3, cy + 1, 3, 1);
  px(OUTLINE, cx + 7, cy + 1, 2, 3);
  px(C.cream, cx + 7, cy + 2, 1, 1);
  // Plants, swaying.
  for (const [sx, hgt] of [[2, 13], [9, 9], [w - 4, 12], [w - 8, 7]] as const) {
    for (let j = 0; j < hgt; j++) px(j % 3 ? "#3f8a4a" : "#5aae5f", x + sx + Math.round(Math.sin(t * 1.3 + j * 0.45 + sx) * (j / hgt) * 1.6), y + h - 4 - j);
  }
  // Bubbles from the cup.
  for (let i = 0; i < 4; i++) {
    const q = (t * 0.3 + i / 4) % 1;
    px("rgba(235,250,250,0.7)", cx + 2 + Math.round(Math.sin(q * 7 + i) * 1.5), cy - 2 - q * (cy - y - 6), 1, 1);
  }
  if (info.feeding) for (let i = 0; i < 6; i++) px("#d8a050", x + 5 + i * 5, y + 3 + ((t * 6 + i * 3) % 10), 1, 1);
  for (const f of info.fish) {
    const fx = Math.round(f.x);
    const fy = Math.round(f.y);
    const flick = Math.floor(f.phase * 6) % 2;
    px(f.color, fx, fy, 3, 2);
    px(f.color, f.dir > 0 ? fx - 1 : fx + 3, fy - flick, 1, 2 + flick);
    px(OUTLINE, f.dir > 0 ? fx + 2 : fx, fy, 1, 1);
  }
  // A glint on the glass.
  px("rgba(255,255,255,0.28)", x + 2, y + 3, 1, h - 8);
  px("rgba(255,255,255,0.18)", x + 4, y + 3, 1, 4);
  return true;
}
