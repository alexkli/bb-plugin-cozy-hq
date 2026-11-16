// Surf Villa: the animals and the visitors' extras. Biscuit is a sandy beach
// dog in a red bandana, the cat is Mango the parrot (who flies from perch to
// perch and rides the hermit crab), the roomba is a hermit crab that tidies
// the beach, and the fish tank is a rock pool with starfish and anemones.
import type { PaintInfo, Theme } from "../../theme.ts";
import type { Rect } from "../../layout.ts";
import { cached, Grid, hash, OUTLINE } from "../../themekit.ts";
import { C, fill } from "./kit.ts";
import { wearsAtNeck } from "../../characters.ts";

type DogPose = "sit" | "walk0" | "walk1" | "loaf" | "wag0" | "wag1";
type CatPose = "sit" | "walk0" | "walk1" | "loaf" | "groom" | "ride";

const EYE = OUTLINE;

/** Biscuit: a sandy beach dog with floppy ears and a red bandana (20×15). */
function beachDog(pose: DogPose, facing: "left" | "right", blink: boolean): HTMLCanvasElement {
  return cached(`beach|dog|${pose}|${facing}|${blink}`, () => {
    const g = new Grid(20, 15);
    const fur = "#e2c48e";
    const furLo = "#b9965c";
    const white = "#fbf3e6";
    const ear = "#9a7444";
    const band = "#e8453c";
    const bandHi = "#ff8a6a";
    if (pose === "loaf") {
      g.rrect(2, 8, 14, 5, fur, 2);
      g.rect(4, 11, 10, 2, white);
      g.rrect(11, 4, 7, 6, fur, 1);
      g.rect(14, 7, 4, 3, white);
      g.rect(11, 4, 2, 4, ear).set(17, 4, ear);
      g.set(15, 6, blink ? furLo : EYE).set(17, 8, EYE);
      g.rect(10, 9, 4, 1, band).set(11, 10, band).set(12, 10, bandHi);
      g.set(1, 10, fur).set(0, 9, furLo);
    } else if (pose === "sit" || pose === "wag0" || pose === "wag1") {
      g.rrect(5, 6, 8, 7, fur, 2);
      g.rect(7, 8, 4, 5, white);
      g.rrect(5, 0, 9, 7, fur, 1);
      g.rect(7, 3, 5, 4, white);
      g.rect(4, 1, 2, 4, ear).rect(13, 1, 2, 4, ear);
      if (blink) g.rect(7, 3, 2, 1, EYE).rect(10, 3, 2, 1, EYE);
      else g.set(8, 3, EYE).set(11, 3, EYE);
      g.set(9, 5, EYE).set(10, 5, EYE);
      g.set(10, 6, "#e07f8a");
      g.rect(5, 6, 9, 1, band).rect(7, 7, 5, 1, band).rect(8, 8, 3, 1, band).set(9, 9, band).set(6, 6, bandHi).set(9, 7, bandHi);
      g.rect(5, 13, 2, 1, furLo).rect(11, 13, 2, 1, furLo);
      const wag = pose === "wag1" ? -1 : pose === "wag0" ? 1 : 0;
      g.set(14, 10 + wag, fur).set(15, 9 + wag, fur).set(16, 8 + wag, furLo);
    } else {
      const step = pose === "walk1" ? 1 : 0;
      g.rrect(2, 5, 13, 6, fur, 2);
      g.rect(4, 9, 9, 2, white);
      g.set(5, 6, furLo).set(8, 6, furLo);
      g.rrect(12, 1, 7, 6, fur, 1);
      g.rect(15, 4, 4, 3, white);
      g.rect(12, 1, 2, 5, ear);
      if (blink) g.rect(15, 3, 2, 1, EYE);
      else g.set(16, 3, EYE);
      g.set(18, 4, EYE);
      g.rect(12, 6, 3, 1, band).rect(11, 5, 1, 3, band).set(12, 7, band).set(13, 7, bandHi);
      g.rect(3 + step, 11, 2, 2, furLo).rect(6 - step, 11, 2, 2, fur);
      g.rect(10 + step, 11, 2, 2, furLo).rect(13 - step, 11, 2, 2, fur);
      g.set(1, 5, fur).set(0, 4, fur);
    }
    g.outline(OUTLINE);
    return (facing === "left" ? g.flipped() : g).toCanvas();
  });
}

/** Mango: a scarlet parrot (16×13); perched, preening, fluffed up, or flying low. */
function parrot(pose: CatPose, facing: "left" | "right", blink: boolean): HTMLCanvasElement {
  return cached(`beach|parrot|${pose}|${facing}|${blink}`, () => {
    const g = new Grid(16, 13);
    const red = "#e8453c";
    const redHi = "#ff6a5c";
    const redLo = "#b8302a";
    const blue = "#3a7bd5";
    const yellow = "#ffd166";
    const face = "#fbf3e6";
    const beak = "#f4ead8";
    if (pose === "walk0" || pose === "walk1") {
      // Flying low, wings up or down.
      const up = pose === "walk0";
      g.ellipse(7.5, 7, 4, 2, red);
      g.rect(5, 6, 5, 1, redHi);
      g.rrect(10, 4, 4, 4, red, 1);
      g.set(12, 5, face).set(12, 5, EYE);
      g.set(11, 5, face);
      g.rect(14, 5, 1, 2, beak).set(14, 7, "#3a3030");
      g.rect(0, 7, 4, 1, red).rect(0, 8, 3, 1, blue).set(1, 6, redLo);
      if (up) {
        g.rect(5, 2, 4, 4, blue).rect(6, 1, 3, 1, blue).rect(5, 5, 4, 1, yellow).set(4, 1, blue).set(5, 0, blue);
      } else {
        g.rect(5, 8, 4, 3, blue).rect(5, 8, 4, 1, yellow).set(4, 11, blue).set(5, 11, blue);
      }
    } else if (pose === "loaf") {
      // Fluffed up and resting.
      g.ellipse(7.5, 8, 4.5, 3.2, red);
      g.rect(4, 7, 3, 4, blue).rect(4, 7, 3, 1, yellow);
      g.rrect(7, 2, 6, 5, red, 1);
      g.rect(10, 3, 2, 2, face);
      if (blink) g.rect(10, 4, 2, 1, EYE);
      else g.set(11, 3, EYE);
      g.rect(13, 3, 1, 3, beak).set(12, 5, "#3a3030");
      g.rect(1, 9, 3, 1, red).rect(1, 10, 2, 1, blue);
      g.set(6, 11, "#8a8a8a").set(9, 11, "#8a8a8a");
    } else {
      // Perched upright (also on the crab), or preening.
      const preen = pose === "groom";
      g.rrect(5, 4, 6, 6, red, 2);
      g.rect(6, 5, 1, 4, redHi);
      g.rect(5, 6, 3, 4, blue).rect(5, 6, 3, 1, yellow);
      g.rrect(6, 0, 6, 5, red, 1);
      if (preen) {
        g.rect(6, 2, 2, 2, face).set(6, 2, blink ? face : EYE);
        g.rect(5, 3, 1, 2, beak).set(5, 5, "#3a3030");
      } else {
        g.rect(9, 1, 2, 3, face);
        if (blink) g.rect(9, 2, 2, 1, EYE);
        else g.set(10, 2, EYE);
        g.rect(12, 1, 1, 3, beak).set(12, 4, "#3a3030").set(11, 4, beak);
      }
      g.rect(6, 10, 2, 1, blue).rect(5, 11, 2, 1, red).rect(4, 12, 2, 1, blue);
      g.set(7, 10, "#8a8a8a").set(9, 10, "#8a8a8a");
    }
    g.outline(OUTLINE);
    return (facing === "left" ? g.flipped() : g).toCanvas();
  });
}

export const beachPet: NonNullable<Theme["pet"]> = (kind, pose, facing, blink) =>
  kind === "dog" ? beachDog(pose as DogPose, facing, blink) : parrot(pose as CatPose, facing, blink);

/** The hermit crab that tidies the beach (16×9). */
export function hermitCrab(): HTMLCanvasElement {
  return cached("beach|crab", () => {
    const g = new Grid(16, 9);
    g.ellipse(9.5, 3.5, 5, 3.2, "#f6d6c8");
    g.ellipse(10, 3, 3, 2, "#fbe6dc");
    g.set(10, 3, "#e0a898").set(11, 2, "#e0a898").set(12, 3, "#e0a898").set(11, 4, "#e0a898").set(9, 4, "#e0a898").set(8, 3, "#d08878");
    g.rect(5, 5, 9, 1, "#e0a898");
    g.rect(2, 4, 4, 3, C.coral);
    g.rect(1, 5, 2, 2, C.coralLo).set(1, 4, C.coral);
    g.set(3, 2, EYE).set(5, 2, EYE).set(3, 3, C.coralLo).set(5, 3, C.coralLo);
    for (const x of [6, 9, 12]) g.set(x, 7, C.coralLo).set(x + 1, 7, C.coral);
    g.outline(OUTLINE);
    return g.toCanvas();
  });
}

/** The rock pool: clear water over sand, starfish, an anemone, seaweed and the fish. */
export const beachTidePool: NonNullable<Theme["fishTank"]> = (ctx, tank: Rect, info: PaintInfo & { fish: { x: number; y: number; dir: 1 | -1; color: string; phase: number }[]; feeding: boolean }) => {
  const { x, y, w, h } = tank;
  const t = info.t;
  // A rim of rocks.
  fill(ctx, x - 2, y - 2, w + 4, h + 4, OUTLINE);
  const rocks = ["#8a8278", "#a39a8e", "#6e665c", "#b4ab9e"];
  for (let i = -1; i < w + 1; i += 3) {
    const c = rocks[hash(`r${i}`) % rocks.length]!;
    fill(ctx, x + i, y - 1, 3, 3, c);
    fill(ctx, x + i, y + h - 2, 3, 3, rocks[(hash(`b${i}`) + 1) % rocks.length]!);
  }
  for (let j = 1; j < h - 1; j += 3) {
    fill(ctx, x - 1, y + j, 3, 3, rocks[hash(`l${j}`) % rocks.length]!);
    fill(ctx, x + w - 2, y + j, 3, 3, rocks[hash(`q${j}`) % rocks.length]!);
  }
  fill(ctx, x + 1, y - 1, w - 2, 1, "#cfc6b8");
  // Water and the sandy floor.
  const ix = x + 2;
  const iy = y + 2;
  const iw = w - 4;
  const ih = h - 4;
  for (let j = 0; j < ih; j++) fill(ctx, ix, iy + j, iw, 1, j < 2 ? "#8fe6e0" : j < ih * 0.5 ? "#5fd0d0" : "#45bcc6");
  fill(ctx, ix, iy + ih - 4, iw, 4, "#e8d39a");
  fill(ctx, ix, iy + ih - 4, iw, 1, "#d9c084");
  for (let i = 2; i < iw; i += 7) fill(ctx, ix + i, iy + ih - 2, 2, 1, "#c8b07a");
  // Seaweed swaying, an anemone, a starfish and an urchin.
  for (const [sx, len] of [[4, 9], [6, 7], [iw - 6, 10]] as const) {
    for (let j = 0; j < len; j++) {
      const off = Math.round(Math.sin(t * 1.3 + j * 0.5 + sx) * (j / len) * 1.5);
      fill(ctx, ix + sx + off, iy + ih - 4 - j, 1, 1, j % 3 ? "#3f9a5a" : "#57b86f");
    }
  }
  const ax = ix + Math.round(iw * 0.62);
  const ay = iy + ih - 4;
  fill(ctx, ax - 1, ay - 2, 4, 2, "#e8608a");
  for (let k = 0; k < 4; k++) fill(ctx, ax - 2 + k + Math.round(Math.sin(t * 2 + k) * 0.6), ay - 4, 1, 2, "#ff9fc0");
  const sx = ix + 10;
  const sy = iy + ih - 3;
  fill(ctx, sx, sy - 1, 1, 3, C.coral);
  fill(ctx, sx - 1, sy, 3, 1, C.coral);
  fill(ctx, sx - 2, sy + 1, 1, 1, C.coral);
  fill(ctx, sx + 2, sy + 1, 1, 1, C.coral);
  fill(ctx, ix + iw - 12, iy + ih - 3, 3, 2, "#6a4a8a");
  fill(ctx, ix + iw - 13, iy + ih - 3, 1, 1, "#8a6aaa");
  // The fish.
  ctx.save();
  ctx.beginPath();
  ctx.rect(ix, iy, iw, ih);
  ctx.clip();
  for (const f of info.fish) {
    const fx = Math.round(f.x);
    const fy = Math.round(f.y);
    const flick = Math.floor(f.phase * 6) % 2;
    fill(ctx, fx, fy, 3, 2, f.color);
    fill(ctx, f.dir > 0 ? fx - 1 : fx + 3, fy - flick, 1, 2 + flick, f.color);
    fill(ctx, f.dir > 0 ? fx + 2 : fx, fy, 1, 1, OUTLINE);
  }
  if (info.feeding) {
    ctx.fillStyle = "#c8925a";
    for (let i = 0; i < 6; i++) ctx.fillRect(ix + 6 + ((i * 7) % (iw - 10)), iy + 2 + ((Math.floor(t * 8) + i * 3) % (ih - 6)), 1, 1);
  }
  ctx.restore();
  // Ripples on the surface.
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  for (let i = 0; i < 3; i++) ctx.fillRect(ix + ((Math.floor(t * 4) + i * 13) % (iw - 4)), iy + 1 + (i % 2) * 3, 3, 1);
  return true;
};

/** The lifeguard's whistle and rescue float, the courier's smoothie cooler, the fixer's tool belt, a rake for the cleanup crew, a lei for you. */
export const beachDressVisitor: NonNullable<Theme["dressVisitor"]> = (ctx, v) => {
  const { x, y, facing, kind } = v;
  const back = facing === "back";
  const X = (px: number, w: number) => (facing === "left" ? x + 20 - px - w : x + px);
  const put = (px: number, py: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(X(px, w), y + py, w, h);
  };
  switch (kind) {
    case "guard":
      if (!back) {
        put(8, 14, 1, 2, "#f4ead8");
        put(9, 16, 2, 1, C.sun);
      }
      // The red rescue float under the arm.
      put(13, 13, 4, 10, OUTLINE);
      put(14, 14, 2, 8, "#e8453c");
      put(14, 17, 2, 1, C.white);
      break;
    case "delivery":
      // A smoothie cooler box.
      if (back) {
        put(5, 14, 10, 7, OUTLINE);
        put(6, 15, 8, 5, C.aqua);
        put(6, 15, 8, 1, C.white);
      } else {
        put(12, 17, 7, 6, OUTLINE);
        put(13, 18, 5, 4, C.white);
        put(13, 20, 5, 2, C.aqua);
        put(15, 16, 1, 2, C.pink);
      }
      break;
    case "technician":
      put(5, 19, 10, 1, "#7a4e2c");
      put(6, 19, 2, 2, C.sun);
      put(11, 19, 2, 2, C.chromeLo);
      break;
    case "janitor":
      // A beach rake.
      put(16, 6, 1, 18, "#9a7444");
      put(14, 23, 5, 1, OUTLINE);
      put(14, 24, 1, 2, OUTLINE);
      put(16, 24, 1, 2, OUTLINE);
      put(18, 24, 1, 2, OUTLINE);
      break;
    case "boss":
      // A lei, unless you wear something at your neck already.
      if (!back && !wearsAtNeck(v.look)) [[5, 14], [6, 15], [7, 16], [8, 16], [9, 16], [10, 16], [11, 15], [12, 14]].forEach(([px, py], i) => put(px!, py!, 1, 1, ["#ff4f7b", "#ffd166", "#ffffff", "#ff9fc0"][i % 4]!));
      break;
  }
};
