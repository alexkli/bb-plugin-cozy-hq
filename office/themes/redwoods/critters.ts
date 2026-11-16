// Redwood Camp critters and visitors: Juniper the husky, Bandit the raccoon,
// a little solar robot mower, the trout pond with its frog, and the visitors'
// extras (the ranger's campaign hat, the courier's bag, the fixer's tool belt,
// the caretaker's rake).
import type { CharPose } from "../../characters.ts";
import type { Facing, Rect } from "../../layout.ts";
import type { PaintInfo, VisitorKind } from "../../theme.ts";
import { Grid, OUTLINE } from "../../themekit.ts";
import { C, cached } from "./kit.ts";

type Ctx = CanvasRenderingContext2D;
type DogPose = "sit" | "walk0" | "walk1" | "loaf" | "wag0" | "wag1";
type CatPose = "sit" | "walk0" | "walk1" | "loaf" | "groom" | "ride";

// ------------------------------------------------------------------ Juniper, the camp husky (20×15)

function husky(pose: DogPose, facing: "left" | "right", blink: boolean): HTMLCanvasElement {
  return cached(`redwoods|husky|${pose}|${facing}|${blink}`, () => {
    const g = new Grid(20, 15);
    const fur = "#7d8794";
    const furLo = "#5d6672";
    const white = "#f4f2ee";
    const eye = "#3a5a8a";
    const scarf = "#c4552d";
    if (pose === "loaf") {
      g.rrect(2, 8, 14, 5, fur, 2);
      g.rect(4, 11, 10, 2, white);
      g.rect(3, 8, 6, 1, furLo);
      g.rrect(11, 4, 7, 6, fur, 1);
      g.rect(12, 6, 6, 4, white);
      g.set(12, 3, fur).set(17, 3, fur).set(12, 2, furLo).set(17, 2, furLo);
      g.rect(13, 6, 1, 1, OUTLINE).set(16, 6, OUTLINE).set(15, 8, OUTLINE);
      g.rect(12, 10, 5, 1, scarf);
      // Curled tail tucked round
      g.set(1, 9, fur).set(1, 10, white).set(2, 11, white);
    } else if (pose === "sit" || pose === "wag0" || pose === "wag1") {
      g.rrect(5, 6, 8, 7, fur, 2);
      g.rect(7, 8, 4, 5, white);
      g.rrect(5, 0, 9, 7, fur, 1);
      g.rect(6, 3, 7, 4, white);
      g.rect(8, 1, 3, 2, white);
      g.set(5, 0, furLo).set(13, 0, furLo).set(5, -1, fur);
      if (blink) g.rect(7, 3, 2, 1, OUTLINE).rect(10, 3, 2, 1, OUTLINE);
      else g.set(8, 3, eye).set(11, 3, eye);
      g.set(9, 5, OUTLINE).set(10, 5, OUTLINE);
      g.rect(5, 7, 9, 1, scarf).set(9, 8, scarf).set(10, 8, scarf);
      g.rect(5, 13, 2, 1, furLo).rect(11, 13, 2, 1, furLo);
      const wag = pose === "wag1" ? -1 : pose === "wag0" ? 1 : 0;
      // The husky's tail curls up over its back.
      g.set(14, 8 + wag, fur).set(15, 7 + wag, fur).set(15, 6 + wag, white).set(14, 5 + wag, white);
    } else {
      const step = pose === "walk1" ? 1 : 0;
      g.rrect(2, 5, 13, 6, fur, 2);
      g.rect(4, 9, 9, 2, white);
      g.rect(3, 5, 9, 1, furLo);
      g.rrect(12, 1, 7, 6, fur, 1);
      g.rect(14, 3, 5, 4, white);
      g.set(13, 0, furLo).set(17, 0, furLo).set(13, -1, fur);
      if (blink) g.rect(15, 3, 2, 1, OUTLINE);
      else g.set(16, 3, eye);
      g.set(18, 4, OUTLINE);
      g.rect(12, 6, 3, 2, scarf);
      g.rect(3 + step, 11, 2, 2, furLo).rect(6 - step, 11, 2, 2, fur);
      g.rect(10 + step, 11, 2, 2, furLo).rect(13 - step, 11, 2, 2, fur);
      // Curled tail
      g.set(2, 4, fur).set(1, 3, fur).set(2, 2, white).set(3, 3, white);
    }
    g.outline(OUTLINE);
    return (facing === "left" ? g.flipped() : g).toCanvas();
  });
}

// ------------------------------------------------------------------ Bandit, the camp raccoon (16×13)

function raccoon(pose: CatPose, facing: "left" | "right", blink: boolean): HTMLCanvasElement {
  return cached(`redwoods|raccoon|${pose}|${facing}|${blink}`, () => {
    const g = new Grid(16, 13);
    const fur = "#8e8a84";
    const furLo = "#66625e";
    const pale = "#d8d4cc";
    const mask = "#2e2a2a";
    const ringTail = (x: number, y: number, len: number, dx: number, dy: number) => {
      for (let i = 0; i < len; i++) g.set(x + dx * i, y + dy * i, i % 2 ? mask : pale).set(x + dx * i, y + dy * i + 1, i % 2 ? furLo : fur);
    };
    if (pose === "loaf") {
      g.rrect(2, 6, 11, 5, fur, 2);
      g.rect(4, 10, 7, 1, furLo);
      g.rrect(9, 3, 6, 5, fur, 1);
      g.rect(10, 5, 5, 1, mask);
      g.set(9, 2, furLo).set(14, 2, furLo);
      g.rect(10, 6, 5, 1, pale);
      if (!blink) g.set(11, 5, "#f4f0e0").set(13, 5, "#f4f0e0");
      g.set(15, 7, OUTLINE);
      ringTail(0, 8, 4, 1, 0);
    } else if (pose === "sit" || pose === "groom") {
      g.rrect(4, 6, 7, 6, fur, 2);
      g.rect(5, 8, 3, 4, pale);
      g.rrect(5, 1, 7, 6, fur, 1);
      g.set(5, 0, furLo).set(11, 0, furLo);
      g.rect(5, 3, 7, 2, mask);
      g.rect(6, 5, 5, 1, pale);
      if (blink || pose === "groom") g.rect(6, 3, 2, 1, "#5a5654").rect(9, 3, 2, 1, "#5a5654");
      else g.set(7, 3, "#f4f0e0").set(10, 3, "#f4f0e0");
      g.set(8, 6, OUTLINE).set(9, 6, OUTLINE);
      if (pose === "groom") g.rect(6, 7, 2, 2, pale);
      ringTail(11, 9, 4, 1, 0);
    } else {
      const step = pose === "walk1" ? 1 : 0;
      g.rrect(2, 5, 10, 5, fur, 2);
      g.rect(3, 9, 8, 1, furLo);
      g.rrect(9, 2, 6, 5, fur, 1);
      g.set(9, 1, furLo).set(13, 1, furLo);
      g.rect(10, 3, 5, 2, mask);
      g.rect(11, 5, 4, 1, pale);
      if (blink) g.rect(12, 3, 2, 1, "#5a5654");
      else g.set(13, 3, "#f4f0e0");
      g.set(15, 5, OUTLINE);
      if (pose !== "ride") {
        g.rect(3 + step, 10, 1, 2, mask).rect(6 - step, 10, 1, 2, furLo);
        g.rect(8 + step, 10, 1, 2, mask).rect(10 - step, 10, 1, 2, furLo);
      }
      ringTail(0, 3, 3, 1, 1);
    }
    g.outline(OUTLINE);
    return (facing === "left" ? g.flipped() : g).toCanvas();
  });
}

export function pet(kind: "dog" | "cat", pose: string, facing: "left" | "right", blink: boolean): HTMLCanvasElement {
  return kind === "dog" ? husky(pose as DogPose, facing, blink) : raccoon(pose as CatPose, facing, blink);
}

// ------------------------------------------------------------------ the solar robot mower (16×9)

export function mower(): HTMLCanvasElement {
  return cached("redwoods|mower", () => {
    const g = new Grid(16, 9);
    g.rrect(2, 2, 12, 5, "#4f8a4a", 1);
    g.rect(3, 2, 10, 1, "#6fae64");
    g.rect(4, 3, 8, 2, "#2d4a7a").set(6, 3, "#8fa0b8").set(9, 3, "#8fa0b8");
    g.set(12, 5, "#ffcf4a");
    g.rect(2, 7, 3, 1, "#2a2626").rect(11, 7, 3, 1, "#2a2626");
    g.outline(OUTLINE);
    return g.toCanvas();
  });
}

// ------------------------------------------------------------------ the trout pond

export function pond(ctx: Ctx, tank: Rect, info: PaintInfo & { fish: { x: number; y: number; dir: 1 | -1; color: string; phase: number }[]; feeding: boolean }): boolean {
  const { x, y, w, h } = tank;
  const t = info.t;
  const night = info.night;
  // Stone rim and water.
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = C.stone;
  ctx.fillRect(x, y, w, 2);
  ctx.fillStyle = C.stoneHi;
  for (let i = 0; i < w; i += 5) ctx.fillRect(x + i, y, 3, 1);
  const deep = night > 0.5 ? "#1c3a44" : "#2f6274";
  const mid = night > 0.5 ? "#24485a" : "#3f7f92";
  ctx.fillStyle = deep;
  ctx.fillRect(x, y + 2, w, h - 2);
  ctx.fillStyle = mid;
  ctx.fillRect(x + 2, y + 2, w - 4, 6);
  // Pebbles on the bottom near the front
  ctx.fillStyle = night > 0.5 ? "#4a4a40" : "#8a8a72";
  for (let i = 0; i < w; i += 4) ctx.fillRect(x + i + ((i * 3) % 3), y + h - 2, 2, 1);
  // Trout, olive with a rosy stripe, under the surface
  for (const f of info.fish) {
    const fx = Math.round(f.x);
    const fy = Math.round(f.y);
    const flick = Math.floor(f.phase * 6) % 2;
    ctx.fillStyle = "#6a7a48";
    ctx.fillRect(fx - 1, fy, 5, 2);
    ctx.fillStyle = "#d88a8a";
    ctx.fillRect(fx, fy + 1, 3, 1);
    ctx.fillStyle = "#4a5a34";
    ctx.fillRect(f.dir > 0 ? fx - 2 : fx + 4, fy - flick, 1, 2 + flick);
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(f.dir > 0 ? fx + 3 : fx - 1, fy, 1, 1);
  }
  // Lily pads, one with a frog on it.
  const pads: [number, number][] = [
    [6, 6],
    [w - 12, 12],
    [w / 2 - 2, h - 8],
  ];
  pads.forEach(([px, py], i) => {
    const cx = Math.round(x + px);
    const cy = Math.round(y + py);
    ctx.fillStyle = "#3f7a3a";
    ctx.fillRect(cx - 2, cy - 1, 6, 3);
    ctx.fillRect(cx - 1, cy - 2, 4, 5);
    ctx.fillStyle = "#62a24a";
    ctx.fillRect(cx - 1, cy - 1, 3, 1);
    ctx.fillStyle = deep;
    ctx.fillRect(cx + 1, cy, 2, 1);
    if (i === 1) {
      ctx.fillStyle = "#e8a0b8";
      ctx.fillRect(cx + 2, cy - 2, 2, 2);
    }
  });
  // The frog (hops to another pad now and then; jumps when you feed the fish).
  const hop = info.feeding ? Math.floor(t * 2) % 3 : Math.floor(t / 9) % 3;
  const [fxp, fyp] = pads[hop === 1 ? 0 : hop === 2 ? 2 : 0]!;
  const jump = info.feeding && t % 1 < 0.3 ? 2 : 0;
  const fx = Math.round(x + fxp);
  const fy = Math.round(y + fyp) - 2 - jump;
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(fx - 1, fy - 1, 5, 4);
  ctx.fillStyle = "#5aa040";
  ctx.fillRect(fx, fy, 3, 2);
  ctx.fillStyle = "#86c862";
  ctx.fillRect(fx, fy, 1, 1);
  ctx.fillRect(fx + 2, fy, 1, 1);
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(fx, fy - 1 + 1, 1, 1);
  // Reeds and cattails at the corners
  for (const [rx, tall] of [
    [x + 1, 9],
    [x + 3, 7],
    [x + w - 3, 10],
    [x + w - 5, 6],
  ] as const) {
    for (let j = 0; j < tall; j++) {
      ctx.fillStyle = j % 3 ? "#4a7a3a" : "#5f9a48";
      ctx.fillRect(rx + Math.round(Math.sin(t * 1.3 + rx + j * 0.3) * (j / tall)), y + h - 2 - j, 1, 1);
    }
    ctx.fillStyle = "#6a3e22";
    ctx.fillRect(rx, y + h - 2 - tall, 1, 2);
  }
  // Ripples (rings when the fish are fed)
  const n = info.feeding ? 4 : 2;
  for (let i = 0; i < n; i++) {
    const k = (t * (info.feeding ? 0.9 : 0.35) + i / n) % 1;
    const rx = x + 8 + ((i * 13) % (w - 16));
    const ry = y + 5 + ((i * 7) % (h - 10));
    const rr = Math.round(1 + k * 5);
    ctx.globalAlpha = 1 - k;
    ctx.fillStyle = night > 0.5 ? "#7f9fb8" : "#cfeaf2";
    ctx.fillRect(rx - rr, ry, 1, 1);
    ctx.fillRect(rx + rr, ry, 1, 1);
    ctx.fillRect(rx, ry - Math.max(1, rr >> 1), 1, 1);
    ctx.fillRect(rx, ry + Math.max(1, rr >> 1), 1, 1);
    ctx.globalAlpha = 1;
  }
  // A glint of light on the surface
  ctx.fillStyle = night > 0.5 ? "rgba(200,220,255,0.35)" : "rgba(255,255,255,0.45)";
  ctx.fillRect(x + 4 + Math.round(Math.sin(t * 0.5) * 2), y + 4, 6, 1);
  return true;
}

// ------------------------------------------------------------------ visitors

const WALK = new Set<CharPose>(["walk1", "walk3"]);

export function dressVisitor(ctx: Ctx, v: { x: number; y: number; facing: Facing; pose: CharPose; kind: VisitorKind }): void {
  const bob = WALK.has(v.pose) ? -1 : 0;
  const x = v.x;
  const y = v.y + bob;
  const flip = v.facing === "left";
  const px = (cx: number, w = 1) => x + (flip ? 20 - cx - w : cx);
  const side = v.facing === "left" || v.facing === "right";
  switch (v.kind) {
    case "guard": {
      // The ranger's flat-brimmed campaign hat.
      ctx.fillStyle = OUTLINE;
      ctx.fillRect(x + 1, y + 4, 18, 3);
      ctx.fillRect(x + 5, y, 10, 5);
      ctx.fillStyle = "#b09060";
      ctx.fillRect(x + 2, y + 5, 16, 1);
      ctx.fillStyle = "#c8a874";
      ctx.fillRect(x + 6, y + 1, 8, 4);
      ctx.fillStyle = "#a88456";
      ctx.fillRect(x + 9, y + 1, 2, 1);
      ctx.fillStyle = "#5a3e26";
      ctx.fillRect(x + 6, y + 4, 8, 1);
      if (v.facing !== "back") {
        // A little badge on the chest
        ctx.fillStyle = "#e8c040";
        ctx.fillRect(px(side ? 8 : 6), y + 15, 2, 2);
      }
      break;
    }
    case "delivery": {
      // A courier bag on a strap across the body.
      ctx.fillStyle = "#2a3a44";
      if (v.facing === "back" || v.facing === "front") {
        for (let i = 0; i < 6; i++) ctx.fillRect(px(6 + i), y + 14 + i, 1, 1);
      }
      ctx.fillStyle = OUTLINE;
      ctx.fillRect(px(side ? 2 : 11, 7), y + 18, 7, 6);
      ctx.fillStyle = "#e8c040";
      ctx.fillRect(px(side ? 3 : 12, 5), y + 19, 5, 4);
      ctx.fillStyle = "#c4952a";
      ctx.fillRect(px(side ? 3 : 12, 5), y + 19, 5, 1);
      break;
    }
    case "technician": {
      // A tool belt with a hammer and a wrench.
      ctx.fillStyle = "#6b4128";
      ctx.fillRect(px(5, 8), y + 20, 8, 1);
      ctx.fillStyle = "#e8c040";
      ctx.fillRect(px(8, 2), y + 20, 2, 1);
      ctx.fillStyle = "#8a8a92";
      ctx.fillRect(px(5), y + 21, 1, 3);
      ctx.fillStyle = "#a86c3a";
      ctx.fillRect(px(12), y + 21, 1, 3);
      ctx.fillStyle = "#5a5a62";
      ctx.fillRect(px(11, 3), y + 21, 3, 1);
      break;
    }
    case "janitor": {
      // The caretaker carries a leaf rake.
      if (v.facing === "back") break;
      const rx = px(side ? 15 : 16);
      ctx.fillStyle = C.logLo;
      ctx.fillRect(rx, y + 6, 1, 20);
      ctx.fillStyle = OUTLINE;
      ctx.fillRect(rx - 3, y + 3, 7, 3);
      ctx.fillStyle = "#9aa3ad";
      for (let i = -2; i <= 2; i += 2) ctx.fillRect(rx + i, y + 3, 1, 2);
      ctx.fillRect(rx - 2, y + 5, 5, 1);
      break;
    }
    case "boss": {
      // The fleece's zip and collar.
      if (v.facing === "back") break;
      ctx.fillStyle = "#2f5038";
      ctx.fillRect(px(7, 6), y + 14, 6, 1);
      ctx.fillStyle = "#d8d4cc";
      ctx.fillRect(px(9), y + 15, 1, 5);
      break;
    }
  }
}
