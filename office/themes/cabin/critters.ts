// Mountain Cabin: the residents. Fondue, a big fluffy mountain dog with a red
// collar and a first-aid pouch (no cask); Murmel, a marmot who moved in and
// stands up on its hind legs to look around; a little snow-plow robot that
// clears the deck; alpine trout in a cold, clear tank.
import type { CatPose, DogPose } from "../../characters.ts";
import type { Rect } from "../../layout.ts";
import type { PaintInfo } from "../../theme.ts";
import { Grid, hash, OUTLINE } from "../../themekit.ts";
import { C, sprite } from "./kit.ts";

// ------------------------------------------------------------------ the dog

function mountainDog(pose: DogPose, facing: "left" | "right", blink: boolean): HTMLCanvasElement {
  return sprite(
    `dog-${pose}-${facing}-${blink}`,
    20,
    15,
    (out) => {
      const g = new Grid(20, 15);
      const white = "#f4efe6";
      const whiteLo = "#ddd3c4";
      const brown = "#a85a2a";
      const brownLo = "#7a3e1c";
      const eye = OUTLINE;
      if (pose === "loaf") {
        g.rrect(1, 7, 15, 7, white, 3);
        g.rect(3, 7, 7, 4, brown).rect(4, 7, 5, 1, "#c4743e");
        g.rect(2, 12, 12, 2, whiteLo);
        g.rrect(11, 4, 8, 7, white, 2);
        g.rect(11, 4, 3, 4, brown).rect(17, 4, 2, 4, brown);
        g.rect(12, 8, 1, 3, brownLo).set(18, 8, brownLo);
        g.set(16, 9, "#3a2420");
        g.set(14, 6, blink ? brownLo : eye);
        g.rect(1, 9, 2, 3, white).set(0, 10, whiteLo);
      } else if (pose === "sit" || pose === "wag0" || pose === "wag1") {
        g.rrect(4, 7, 12, 8, white, 3);
        g.rect(5, 8, 3, 5, brown).rect(13, 8, 2, 5, brown);
        g.rect(8, 9, 5, 5, white);
        g.rrect(4, 1, 12, 8, white, 3);
        g.rect(4, 1, 5, 4, brown).rect(11, 1, 5, 4, brown);
        g.rect(3, 3, 2, 5, brownLo).rect(15, 3, 2, 5, brownLo);
        g.rect(9, 1, 2, 7, white);
        if (blink) g.rect(6, 4, 2, 1, eye).rect(12, 4, 2, 1, eye);
        else g.set(7, 4, eye).set(12, 4, eye);
        g.rect(9, 6, 2, 1, "#3a2420");
        // The red collar and the little first-aid pouch.
        g.rect(5, 8, 10, 1, C.red);
        g.rect(9, 9, 3, 2, C.red).set(10, 9, "#f4f2ee").set(10, 10, "#f4f2ee");
        g.rect(5, 14, 3, 1, whiteLo).rect(12, 14, 3, 1, whiteLo);
        const wag = pose === "wag1" ? -1 : pose === "wag0" ? 1 : 0;
        g.rect(16, 10 + wag, 3, 2, white).set(18, 9 + wag, white);
      } else {
        const step = pose === "walk1" ? 1 : 0;
        g.rrect(2, 4, 13, 7, white, 3);
        g.rect(4, 4, 8, 3, brown).rect(5, 4, 5, 1, "#c4743e");
        g.rect(3, 9, 11, 2, whiteLo);
        g.rrect(12, 1, 7, 7, white, 2);
        g.rect(12, 1, 3, 3, brown).rect(17, 1, 2, 3, brown);
        g.rect(12, 3, 2, 4, brownLo);
        g.set(18, 5, "#3a2420");
        if (blink) g.rect(15, 3, 2, 1, eye);
        else g.set(16, 3, eye);
        g.rect(13, 7, 4, 1, C.red);
        g.rect(4 + step, 11, 2, 3, whiteLo).rect(7 - step, 11, 2, 3, white);
        g.rect(10 + step, 11, 2, 3, whiteLo).rect(13 - step, 11, 2, 3, white);
        g.rect(0, 4, 3, 2, white).set(0, 3, white).set(1, 6, whiteLo);
      }
      g.outline(OUTLINE);
      out.stamp(facing === "left" ? g.flipped() : g, 0, 0);
    },
    false,
  );
}

// ------------------------------------------------------------------ the marmot

function marmot(pose: CatPose, facing: "left" | "right", blink: boolean): HTMLCanvasElement {
  return sprite(
    `marmot-${pose}-${facing}-${blink}`,
    16,
    13,
    (out) => {
      const g = new Grid(16, 13);
      const fur = "#9a7a58";
      const furLo = "#7a5c40";
      const furHi = "#b8986e";
      const belly = "#c8aa80";
      const cap = "#5a4430";
      const eye = OUTLINE;
      if (pose === "sit" || pose === "groom") {
        // Up on its hind legs, keeping watch.
        g.rrect(5, 4, 7, 8, fur, 2);
        g.rect(7, 6, 3, 5, belly);
        g.rrect(5, 0, 7, 5, fur, 2);
        g.rect(6, 0, 5, 1, cap).set(5, 1, cap).set(11, 1, cap);
        g.rect(7, 3, 3, 2, belly).set(8, 3, "#3a2420");
        if (blink || pose === "groom") g.rect(6, 2, 1, 1, eye).rect(10, 2, 1, 1, eye);
        else g.set(6, 2, eye).set(10, 2, eye);
        if (pose === "groom") g.rect(7, 4, 3, 2, furHi);
        else g.set(6, 6, furLo).set(10, 6, furLo);
        g.rect(5, 12, 3, 1, furLo).rect(9, 12, 3, 1, furLo);
        g.rect(12, 9, 2, 3, furLo).set(13, 8, cap);
      } else if (pose === "loaf") {
        g.rrect(2, 5, 12, 7, fur, 3);
        g.rect(4, 5, 7, 1, furHi);
        g.rect(3, 10, 10, 2, furLo);
        g.rrect(10, 4, 5, 5, fur, 1);
        g.rect(10, 4, 5, 1, cap);
        g.set(12, 6, blink ? furLo : eye);
        g.set(14, 7, "#3a2420");
        g.rect(1, 8, 2, 3, furLo);
      } else {
        // On all fours (or riding the plow): low and round, a short bushy tail.
        const step = pose === "walk1" ? 1 : 0;
        g.rrect(2, 4, 11, 6, fur, 2);
        g.rect(3, 4, 8, 1, furHi);
        g.rect(4, 8, 7, 2, belly);
        g.rrect(10, 2, 5, 5, fur, 1);
        g.rect(10, 2, 5, 1, cap);
        g.set(14, 5, "#3a2420").set(13, 6, belly);
        if (blink) g.rect(12, 4, 1, 1, OUTLINE);
        else g.set(12, 3, eye);
        if (pose !== "ride") {
          g.rect(3 + step, 10, 2, 2, furLo).rect(6 - step, 10, 2, 2, fur);
          g.rect(9 + step, 10, 2, 2, furLo).rect(11 - step, 10, 2, 2, fur);
        }
        g.rect(0, 4, 3, 3, cap).set(0, 7, furLo);
      }
      g.outline(OUTLINE);
      out.stamp(facing === "left" ? g.flipped() : g, 0, 0);
    },
    false,
  );
}

export function pet(kind: "dog" | "cat", pose: DogPose | CatPose, facing: "left" | "right", blink: boolean): HTMLCanvasElement {
  return kind === "dog" ? mountainDog(pose as DogPose, facing, blink) : marmot(pose as CatPose, facing, blink);
}

/** A little snow plow: an orange body, a yellow blade in front, a beacon on top. */
export function plow(): HTMLCanvasElement {
  return sprite("plow", 16, 9, (g) => {
    g.rrect(3, 2, 10, 5, "#e8873a", 1);
    g.rect(4, 2, 8, 1, "#f2a86a");
    g.rect(5, 3, 4, 2, "#2a2c36").set(6, 3, "#7fd0ff");
    g.rect(7, 0, 2, 2, "#f2c230");
    g.rect(13, 1, 2, 7, "#f2c230").rect(13, 1, 1, 7, "#f8dc70");
    g.rect(3, 7, 3, 2, "#2a2c36").rect(9, 7, 3, 2, "#2a2c36");
    g.rect(0, 5, 3, 2, C.snow);
  });
}

// ------------------------------------------------------------------ the trout tank

const TROUT: [string, string, string][] = [
  ["#8a7a52", "#d8c890", "#c4402e"],
  ["#7a8a8a", "#e88aa0", "#3a3a40"],
  ["#5a6a5a", "#e8873a", "#f4f2ee"],
  ["#9a8a62", "#e8d8a8", "#3a3a40"],
];

/** Cold clear water over river pebbles, a mossy stone, swaying grass and trout. */
export function troutTank(ctx: CanvasRenderingContext2D, tank: Rect, info: PaintInfo & { fish: { x: number; y: number; dir: 1 | -1; color: string; phase: number }[]; feeding: boolean }): boolean {
  const { x, y, w, h } = tank;
  const t = info.t;
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  const bands = ["#9ad0d8", "#86c2cc", "#72b2be", "#62a2b0", "#5592a2"];
  for (let i = 0; i < bands.length; i++) {
    ctx.fillStyle = bands[i]!;
    ctx.fillRect(x, y + 2 + Math.floor((i * (h - 2)) / bands.length), w, Math.ceil((h - 2) / bands.length) + 1);
  }
  ctx.fillStyle = "#e9f8fb";
  ctx.fillRect(x, y, w, 1);
  ctx.fillStyle = "#c4e6ee";
  ctx.fillRect(x, y + 1, w, 1);
  // River pebbles.
  const peb = ["#9a948a", "#b8b2a6", "#7a766e", "#c8b89a"];
  for (let i = 0; i < w; i += 3) {
    ctx.fillStyle = peb[(i * 7) % peb.length]!;
    ctx.fillRect(x + i, y + h - 3 + ((i * 5) % 2), 3, 3 - ((i * 5) % 2));
  }
  // A mossy stone and a sunken bit of old ski pole.
  ctx.fillStyle = "#6a6e74";
  ctx.fillRect(x + 6, y + h - 8, 9, 5);
  ctx.fillStyle = "#5d7a4e";
  ctx.fillRect(x + 6, y + h - 8, 9, 2);
  ctx.fillStyle = "#c4402e";
  for (let i = 0; i < 8; i++) ctx.fillRect(x + w - 16 + i, y + h - 5 - Math.round(i * 0.5), 1, 1);
  // Grass swaying in the current.
  for (const [sx, hgt] of [[3, 10], [19, 12], [22, 8], [w - 5, 11]] as const) {
    if (sx >= w - 1) continue;
    for (let j = 0; j < hgt; j++) {
      const off = Math.round(Math.sin(t * 1.4 + j * 0.5 + sx) * (j / hgt) * 1.6);
      ctx.fillStyle = j % 3 ? "#4a7a4a" : "#6a9a5a";
      ctx.fillRect(x + sx + off, y + h - 4 - j, 1, 1);
    }
  }
  // The trout: long, spotted, a pale belly.
  for (const f of info.fish) {
    const fx = Math.round(f.x);
    const fy = Math.round(f.y);
    const [back, belly, spot] = TROUT[hash(f.color) % TROUT.length]!;
    const d = f.dir;
    ctx.fillStyle = back;
    ctx.fillRect(fx - 2, fy - 1, 6, 1);
    ctx.fillStyle = belly;
    ctx.fillRect(fx - 2, fy, 6, 1);
    ctx.fillStyle = spot;
    ctx.fillRect(fx + (d > 0 ? 0 : 1), fy - 1, 1, 1);
    const flick = Math.floor(f.phase * 6) % 2;
    ctx.fillStyle = back;
    ctx.fillRect(d > 0 ? fx - 3 : fx + 4, fy - flick, 1, 2);
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(d > 0 ? fx + 3 : fx - 2, fy - 1, 1, 1);
  }
  ctx.fillStyle = "#e9f8fb";
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.45 + i / 3) % 1;
    ctx.fillRect(x + w - 6 + (i % 2), Math.round(y + h - 5 - k * (h - 8)), 1, 1);
  }
  if (info.feeding) {
    ctx.fillStyle = "#c8a060";
    for (let i = 0; i < 6; i++) ctx.fillRect(x + 6 + i * 5, Math.round(y + 3 + ((t * 6 + i * 3) % (h - 7))), 1, 1);
  }
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.fillRect(x + 2, y + 3, 1, h - 8);
  return true;
}
