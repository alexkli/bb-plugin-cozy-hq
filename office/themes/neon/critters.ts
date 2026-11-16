// Neon City creatures and gadgets: a robo-dog, a holo-cat, a hover drone that
// sweeps the floor, a jellyfish tank, and the visitors' gear (the guard's
// visor, the courier's glowing pack, the mechanic's goggles).
import type { Rect } from "../../layout.ts";
import type { CharPose } from "../../characters.ts";
import type { Facing } from "../../layout.ts";
import type { PaintInfo, VisitorKind } from "../../theme.ts";
import { cached, Grid, OUTLINE } from "../../themekit.ts";
import { P } from "./kit.ts";

type DogPose = "sit" | "walk0" | "walk1" | "loaf" | "wag0" | "wag1";
type CatPose = "sit" | "walk0" | "walk1" | "loaf" | "groom" | "ride";

/** Byte, the robo-dog: brushed steel, a visor of eyes and an antenna tail (20×15). */
function roboDog(pose: DogPose, facing: "left" | "right", blink: boolean): HTMLCanvasElement {
  return cached(`neon|dog|${pose}|${facing}|${blink}`, () => {
    const g = new Grid(20, 15);
    const body = "#7a80a4";
    const lo = "#4c5274";
    const plate = "#b8bedc";
    const eye = blink ? "#1a7a8c" : P.cyan;
    if (pose === "loaf") {
      g.rrect(2, 8, 14, 5, body, 2);
      g.rect(4, 11, 10, 2, lo);
      g.rect(5, 9, 8, 1, plate);
      g.rrect(11, 4, 7, 6, body, 1);
      g.rect(12, 6, 5, 1, "#14122a").rect(13, 6, 3, 1, eye);
      g.set(12, 3, lo).set(17, 3, lo).set(12, 2, plate).set(17, 2, plate);
      g.set(16, 9, P.mag);
      g.set(1, 10, lo).set(0, 9, P.mag);
    } else if (pose === "sit" || pose === "wag0" || pose === "wag1") {
      g.rrect(5, 6, 8, 7, body, 2);
      g.rect(7, 8, 4, 4, plate);
      g.set(8, 9, P.cyanLo).set(10, 9, P.cyanLo);
      g.rrect(5, 0, 9, 7, body, 1);
      g.rect(6, 3, 7, 2, "#14122a");
      g.rect(7, 3, 2, 1, eye).rect(10, 3, 2, 1, eye);
      g.rect(8, 5, 3, 1, lo);
      g.set(5, 0, lo).set(13, 0, lo).set(4, 0, plate).set(14, 0, plate);
      g.rect(5, 13, 2, 1, lo).rect(11, 13, 2, 1, lo);
      const wag = pose === "wag1" ? -1 : pose === "wag0" ? 1 : 0;
      g.set(14, 10 + wag, lo).set(15, 9 + wag, lo).set(16, 8 + wag, P.mag);
    } else {
      const step = pose === "walk1" ? 1 : 0;
      g.rrect(2, 5, 13, 6, body, 2);
      g.rect(4, 7, 9, 1, plate);
      g.rect(4, 9, 9, 2, lo);
      g.set(6, 8, P.cyanLo).set(10, 8, P.cyanLo);
      g.rrect(12, 1, 7, 6, body, 1);
      g.rect(14, 3, 5, 1, "#14122a").rect(15, 3, 3, 1, eye);
      g.rect(15, 5, 4, 1, lo);
      g.set(13, 0, lo).set(17, 0, lo);
      g.rect(3 + step, 11, 2, 2, lo).rect(6 - step, 11, 2, 2, body);
      g.rect(10 + step, 11, 2, 2, lo).rect(13 - step, 11, 2, 2, body);
      g.set(1, 5, lo).set(0, 4, lo).set(0, 3, P.mag);
    }
    g.outline(OUTLINE, { skip: [P.mag] });
    const c = g.toCanvas();
    if (facing === "left") return flip(c);
    return c;
  });
}

/** Pixel, the holo-cat: a flickery cyan hologram with a magenta trim (16×13). */
function holoCat(pose: CatPose, facing: "left" | "right", blink: boolean): HTMLCanvasElement {
  return cached(`neon|cat|${pose}|${facing}|${blink}`, () => {
    const g = new Grid(16, 13);
    const fur = "#3ad8ffb0";
    const furLo = "#1a8ab8c0";
    const stripe = "#ff4fc0c8";
    const belly = "#b8f8ffb8";
    const eye = "#ffffff";
    if (pose === "loaf") {
      g.rrect(2, 6, 11, 5, fur, 2);
      g.rect(4, 10, 7, 1, furLo);
      g.rrect(9, 3, 6, 5, fur, 1);
      g.set(9, 2, fur).set(14, 2, fur).set(10, 2, stripe);
      g.rect(10, 5, 1, 1, eye).rect(13, 5, 1, 1, eye);
      g.set(5, 7, stripe).set(7, 7, stripe);
      g.rect(1, 9, 2, 1, fur);
    } else if (pose === "sit" || pose === "groom") {
      g.rrect(4, 6, 7, 6, fur, 2);
      g.rect(5, 8, 3, 4, belly);
      g.rrect(5, 1, 7, 6, fur, 1);
      g.set(5, 0, fur).set(11, 0, fur).set(6, 1, stripe).set(10, 1, stripe);
      if (blink || pose === "groom") g.rect(6, 3, 2, 1, eye).rect(9, 3, 2, 1, eye);
      else g.rect(7, 3, 1, 2, eye).rect(10, 3, 1, 2, eye);
      g.set(8, 5, stripe).set(9, 5, stripe);
      g.rect(11, 10, 3, 1, fur).set(13, 9, fur).set(13, 8, furLo);
      if (pose === "groom") g.rect(6, 6, 2, 2, belly);
    } else {
      const step = pose === "walk1" ? 1 : 0;
      g.rrect(2, 5, 10, 5, fur, 2);
      g.rect(3, 9, 8, 1, furLo);
      g.set(4, 5, stripe).set(6, 5, stripe).set(8, 5, stripe);
      g.rrect(9, 1, 6, 5, fur, 1);
      g.set(9, 0, fur).set(14, 0, fur).set(13, 1, stripe);
      if (blink) g.rect(12, 3, 2, 1, eye);
      else g.rect(13, 2, 1, 2, eye);
      if (pose !== "ride") {
        g.rect(3 + step, 10, 1, 2, furLo).rect(6 - step, 10, 1, 2, fur);
        g.rect(8 + step, 10, 1, 2, furLo).rect(10 - step, 10, 1, 2, fur);
      }
      g.rect(0, 3, 2, 1, fur).set(1, 4, fur).set(0, 2, furLo);
    }
    // A bright hologram edge instead of an ink outline, and scanlines.
    g.outline("#9ffcff");
    for (let y = 1; y < 13; y += 3) for (let x = 0; x < 16; x++) if (g.get(x, y) === fur) g.set(x, y, "#3ad8ff60");
    const c = g.toCanvas();
    return facing === "left" ? flip(c) : c;
  });
}

function flip(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = src.width;
  c.height = src.height;
  const ctx = c.getContext("2d")!;
  ctx.translate(src.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(src, 0, 0);
  return c;
}

export function neonPet(kind: "dog" | "cat", pose: string, facing: "left" | "right", blink: boolean): HTMLCanvasElement {
  return kind === "dog" ? roboDog(pose as DogPose, facing, blink) : holoCat(pose as CatPose, facing, blink);
}

/** The floor sweeper: a little hover drone with a dome and running lights (16×9). */
export function neonRoomba(): HTMLCanvasElement {
  return cached("neon|roomba", () => {
    const g = new Grid(16, 9);
    g.ellipse(8, 4, 6.5, 2.6, "#3a3458");
    g.ellipse(8, 3.5, 5, 1.8, "#5a5486");
    g.ellipse(8, 2.6, 2.2, 1.4, P.cyan);
    g.set(7, 2, P.cyanHi);
    g.set(2, 4, P.red).set(14, 4, P.lime);
    g.rect(4, 7, 8, 1, P.vio);
    g.outline(OUTLINE, { skip: [P.vio] });
    return g.toCanvas();
  });
}

/** The jellyfish tank: deep violet water, glowing jellies drifting up and down. */
export function neonFishTank(ctx: CanvasRenderingContext2D, tank: Rect, info: PaintInfo & { fish: { x: number; y: number; dir: 1 | -1; color: string; phase: number }[]; feeding: boolean }): boolean {
  const { x, y, w, h } = tank;
  const t = info.t;
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  const bands = ["#1a1048", "#160d3e", "#120a34", "#0e082a"];
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = bands[i]!;
    ctx.fillRect(x, y + Math.floor((i * h) / 4), w, Math.ceil(h / 4));
  }
  ctx.fillStyle = "#3a2a7a";
  ctx.fillRect(x, y, w, 1);
  // Light rays from the top.
  ctx.fillStyle = "rgba(160,120,255,0.12)";
  for (let k = 0; k < 3; k++) ctx.fillRect(x + 6 + k * 13 + Math.round(Math.sin(t * 0.4 + k) * 2), y + 1, 3, h - 4);
  // Sand with glowing pebbles.
  ctx.fillStyle = "#2a2050";
  ctx.fillRect(x, y + h - 3, w, 3);
  ctx.fillStyle = P.cyanLo;
  ctx.fillRect(x + 7, y + h - 2, 1, 1);
  ctx.fillStyle = P.magLo;
  ctx.fillRect(x + 26, y + h - 2, 1, 1);
  // The jellies follow the fish (x), bobbing on their own.
  const cols = [P.mag, P.cyan, P.vio, "#ff9ad6", "#9ffcff"];
  info.fish.forEach((f, i) => {
    const pulse = (Math.sin(t * 2.2 + i * 1.7) + 1) / 2;
    const jx = Math.round(Math.max(x + 2, Math.min(x + w - 5, f.x)));
    const jy = Math.round(y + 4 + ((Math.sin(t * 0.6 + i * 2.1) + 1) / 2) * (h - 14));
    const c = cols[i % cols.length]!;
    ctx.fillStyle = c;
    ctx.fillRect(jx, jy, 4, 2);
    ctx.fillRect(jx + 1, jy - 1, 2, 1);
    ctx.globalAlpha = 0.7;
    for (let k = 0; k < 3; k++) {
      const len = 3 + Math.round(pulse * 2) + (k % 2);
      ctx.fillRect(jx + k + (k === 2 ? 1 : 0), jy + 2, 1, len);
    }
    ctx.globalAlpha = 0.25;
    ctx.fillRect(jx - 1, jy - 2, 6, 5);
    ctx.globalAlpha = 1;
  });
  // Bubbles, and food when someone feeds them.
  ctx.fillStyle = "rgba(200,220,255,0.6)";
  for (let k = 0; k < 3; k++) {
    const ph = (t * 0.5 + k / 3) % 1;
    ctx.fillRect(x + 34 + (k % 2), Math.round(y + h - 4 - ph * (h - 6)), 1, 1);
  }
  if (info.feeding) {
    ctx.fillStyle = P.yel;
    for (let k = 0; k < 5; k++) ctx.fillRect(x + 8 + k * 6, y + 2 + Math.round(((t * 6 + k * 3) % (h - 6))), 1, 1);
  }
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(x + 2, y + 3, 1, h - 8);
  return true;
}

/** The visitors' gear. */
export function neonDressVisitor(ctx: CanvasRenderingContext2D, v: { x: number; y: number; facing: Facing; pose: CharPose; kind: VisitorKind }, t: number): void {
  const bob = v.pose === "walk1" || v.pose === "walk3" ? -1 : 0;
  const y0 = v.y + 2 + bob;
  const side = v.facing === "left" || v.facing === "right";
  const flipX = v.facing === "left";
  const px = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(flipX ? v.x + 20 - x - w : v.x + x, y, w, h);
  };
  const ey = y0 + 6;
  const s = side ? 1 : 0;
  switch (v.kind) {
    case "guard": {
      if (v.facing === "back") {
        px(4, ey, 12, 1, "#1a2440");
        break;
      }
      // A glowing visor that scans.
      px(4 + s, ey - 1, 12 - s, 3, "#0c1a2a");
      px(5 + s, ey, 10 - s, 1, P.cyan);
      px(5 + s + (Math.floor(t * 6) % (9 - s)), ey, 2, 1, P.cyanHi);
      break;
    }
    case "delivery": {
      // A glowing courier pack.
      const by = v.y + 14 + bob;
      if (v.facing === "front") {
        px(5, by, 1, 6, P.lime);
        px(12, by, 1, 6, P.lime);
      } else {
        const bx = v.facing === "back" ? 5 : 1;
        px(bx, by - 1, side ? 6 : 10, 7, OUTLINE);
        px(bx + 1, by, side ? 4 : 8, 5, "#1a2a10");
        px(bx + 1, by, side ? 4 : 8, 1, P.lime);
        if (Math.floor(t * 2) % 2) px(bx + 2, by + 2, 2, 1, P.lime);
      }
      break;
    }
    case "technician":
      // Goggles pushed up on the cap.
      if (v.facing === "back") break;
      px(5 + s, y0 + 1, 3, 2, P.yel);
      px(9 + s, y0 + 1, 3, 2, P.yel);
      px(8 + s, y0 + 1, 1, 1, OUTLINE);
      break;
    case "boss":
      // A high collar on the long coat, lit at the edge.
      px(5, v.y + 14, 1, 3, P.mag);
      px(14, v.y + 14, 1, 3, P.mag);
      break;
    case "janitor":
      if (v.facing === "back") break;
      px(14 + s, ey + 1, 1, 1, Math.floor(t * 1.5) % 2 ? P.yel : "#5a4a10");
      break;
  }
}
