// Villain's Lair: the residents and the help. Rivet is a robot guard hound
// (all wag, no bite), Meringue a fluffy white cat with a jeweled collar; a
// little security drone sweeps the floors, and a small shark patrols the
// lounge tank with its piranha friends.
import type { CatPose, DogPose } from "../../characters.ts";
import type { Rect } from "../../layout.ts";
import type { PaintInfo } from "../../theme.ts";
import { Grid, OUTLINE } from "../../themekit.ts";
import { C, sprite } from "./kit.ts";

// ------------------------------------------------------------------ the robot hound

function robotHound(pose: DogPose, facing: "left" | "right", blink: boolean): HTMLCanvasElement {
  return sprite(`hound-${pose}-${facing}-${blink}`, 20, 15, (out) => {
    const g = new Grid(20, 15);
    const body = C.steelHi;
    const lo = C.steel;
    const dark = C.steelDk;
    const eye = blink ? "#2a6a72" : "#7cf0f0";
    if (pose === "loaf") {
      g.rrect(2, 8, 13, 5, body, 2);
      g.rect(3, 11, 11, 2, lo);
      g.rect(5, 9, 6, 1, C.hazard);
      g.rrect(11, 4, 8, 6, body, 1);
      g.rect(15, 6, 4, 2, dark).rect(16, 6, 2, 1, eye);
      g.rect(12, 1, 1, 3, dark).set(12, 0, C.glowRed);
      g.set(1, 9, dark).set(0, 8, C.glowAmber);
    } else if (pose === "sit" || pose === "wag0" || pose === "wag1") {
      g.rrect(5, 7, 10, 7, body, 2);
      g.rect(7, 9, 6, 4, lo);
      g.rect(8, 10, 4, 1, C.hazard);
      g.rrect(4, 1, 12, 7, body, 2);
      // A visor for eyes, two antenna ears.
      g.rect(6, 3, 8, 3, dark).rect(7, 4, 6, 1, eye);
      g.rect(5, 0, 1, 2, dark).rect(14, 0, 1, 2, dark).set(5, 0, C.glowRed).set(14, 0, C.glowRed);
      g.rect(9, 7, 2, 1, dark);
      g.rect(6, 14, 2, 1, dark).rect(12, 14, 2, 1, dark);
      const wag = pose === "wag1" ? -1 : pose === "wag0" ? 1 : 0;
      g.set(16, 10 + wag, dark).set(17, 9 + wag, C.glowAmber);
    } else {
      const step = pose === "walk1" ? 1 : 0;
      g.rrect(3, 5, 12, 6, body, 2);
      g.rect(4, 9, 10, 2, lo);
      g.rect(6, 6, 6, 1, C.hazard);
      g.rrect(12, 1, 7, 7, body, 2);
      g.rect(15, 3, 4, 3, dark).rect(16, 4, 3, 1, eye);
      g.rect(13, 0, 1, 2, dark).set(13, 0, C.glowRed);
      g.rect(4 + step, 11, 2, 3, dark).rect(7 - step, 11, 2, 3, lo);
      g.rect(10 + step, 11, 2, 3, dark).rect(13 - step, 11, 2, 3, lo);
      g.set(2, 6, dark).set(1, 5, C.glowAmber);
    }
    g.outline(OUTLINE);
    out.stamp(facing === "left" ? g.flipped() : g, 0, 0);
  });
}

// ------------------------------------------------------------------ the white cat

export function fluffyCat(pose: CatPose, facing: "left" | "right", blink: boolean): HTMLCanvasElement {
  return sprite(`persian-${pose}-${facing}-${blink}`, 16, 13, (out) => {
    const g = new Grid(16, 13);
    const fur = "#f6f3ee";
    const furLo = "#dcd6cc";
    const furHi = "#ffffff";
    const ear = "#f0b8c0";
    const eye = "#5ab0e8";
    const collar = C.velvetHi;
    if (pose === "loaf") {
      g.rrect(1, 5, 12, 7, fur, 3);
      g.rect(3, 5, 7, 1, furHi);
      g.rect(3, 10, 9, 1, furLo);
      g.rrect(8, 2, 7, 6, fur, 2);
      g.set(9, 1, fur).set(14, 1, fur).set(9, 2, ear);
      if (blink) g.rect(10, 4, 1, 1, OUTLINE).rect(13, 4, 1, 1, OUTLINE);
      else g.set(10, 4, eye).set(13, 4, eye);
      g.set(11, 6, ear);
      g.rect(10, 7, 3, 1, collar).set(11, 8, C.brassHi);
      g.rect(0, 8, 2, 2, fur);
    } else if (pose === "sit" || pose === "groom") {
      g.rrect(3, 5, 9, 7, fur, 3);
      g.rect(4, 6, 3, 4, furHi);
      g.rect(4, 11, 7, 1, furLo);
      g.rrect(4, 0, 8, 6, fur, 2);
      g.set(4, 0, fur).set(11, 0, fur).set(5, 1, ear).set(10, 1, ear);
      if (blink || pose === "groom") g.rect(5, 3, 2, 1, OUTLINE).rect(9, 3, 2, 1, OUTLINE);
      else g.set(6, 3, eye).set(9, 3, eye);
      g.set(7, 4, ear).set(8, 4, ear);
      g.rect(5, 6, 6, 1, collar).set(8, 7, C.brassHi);
      // A plume of a tail curled round.
      g.rect(11, 10, 4, 2, fur).rect(13, 7, 2, 3, fur).set(14, 6, furLo);
      if (pose === "groom") g.rect(5, 6, 2, 2, furHi);
    } else {
      const step = pose === "walk1" ? 1 : 0;
      g.rrect(1, 4, 12, 6, fur, 3);
      g.rect(3, 4, 7, 1, furHi);
      g.rect(3, 9, 8, 1, furLo);
      g.rrect(9, 0, 6, 6, fur, 2);
      g.set(9, 0, fur).set(14, 0, fur).set(13, 1, ear);
      if (blink) g.rect(12, 2, 2, 1, OUTLINE);
      else g.set(12, 2, eye).set(14, 2, eye);
      g.set(14, 4, ear);
      g.rect(10, 5, 3, 1, collar);
      if (pose !== "ride") {
        g.rect(3 + step, 10, 2, 2, furLo).rect(5 - step, 10, 2, 2, fur);
        g.rect(9 + step, 10, 2, 2, furLo).rect(11 - step, 10, 2, 2, fur);
      }
      g.rect(0, 2, 2, 3, fur).set(0, 1, furLo);
    }
    g.outline(OUTLINE);
    out.stamp(facing === "left" ? g.flipped() : g, 0, 0);
  });
}

export function lairPet(kind: "dog" | "cat", pose: DogPose | CatPose, facing: "left" | "right", blink: boolean): HTMLCanvasElement {
  return kind === "dog" ? robotHound(pose as DogPose, facing, blink) : fluffyCat(pose as CatPose, facing, blink);
}

/** The security drone: a little hovering disc with a camera eye and its shadow under it. */
export function lairDrone(): HTMLCanvasElement {
  return sprite("drone", 16, 9, (g) => {
    g.ellipse(7.5, 7.5, 5, 1, "#00000040");
    g.rect(0, 1, 4, 1, C.steelLo).rect(12, 1, 4, 1, C.steelLo);
    g.rect(0, 0, 3, 1, "#c9d0d6aa").rect(13, 0, 3, 1, "#c9d0d6aa");
    g.ellipse(7.5, 3, 4.5, 2.2, C.steelHi);
    g.rect(5, 2, 4, 1, C.steelTop);
    g.rect(6, 4, 3, 1, C.steelDk);
    g.set(7, 4, C.glowRed);
    g.outline(OUTLINE, { skip: ["#00000040", "#c9d0d6aa"] });
  });
}

// ------------------------------------------------------------------ the shark tank

/** The lounge tank: a small shark on patrol, piranhas, a sunken chest and a rubber duck. */
export function lairFishTank(ctx: CanvasRenderingContext2D, tank: Rect, info: PaintInfo & { fish: { x: number; y: number; dir: 1 | -1; color: string; phase: number }[]; feeding: boolean }): boolean {
  const { x, y, w, h } = tank;
  const t = info.t;
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  const bands = ["#3a9ab8", "#2f88a8", "#267596", "#1f6584", "#1a5672"];
  for (let i = 0; i < bands.length; i++) {
    ctx.fillStyle = bands[i]!;
    ctx.fillRect(x, y + 2 + Math.floor((i * (h - 2)) / bands.length), w, Math.ceil((h - 2) / bands.length) + 1);
  }
  ctx.fillStyle = "#cfefff";
  ctx.fillRect(x, y, w, 1);
  ctx.fillStyle = "#7fd0e8";
  ctx.fillRect(x, y + 1, w, 1);
  // Light rays wavering down.
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  for (let i = 0; i < 3; i++) {
    const rx = x + 6 + i * 13 + Math.round(Math.sin(t * 0.7 + i) * 2);
    ctx.fillRect(rx, y + 2, 2, h - 6);
  }
  // Sand, rocks, a sunken chest and kelp.
  ctx.fillStyle = "#c9b98e";
  ctx.fillRect(x, y + h - 3, w, 3);
  ctx.fillStyle = "#5a5056";
  ctx.fillRect(x + 2, y + h - 5, 5, 2);
  ctx.fillStyle = "#7a4a26";
  ctx.fillRect(x + w - 12, y + h - 6, 7, 4);
  ctx.fillStyle = C.brass;
  ctx.fillRect(x + w - 12, y + h - 5, 7, 1);
  ctx.fillStyle = C.brassHi;
  ctx.fillRect(x + w - 9, y + h - 6, 1, 1);
  for (const [sx, hgt] of [[9, 12], [12, 8], [26, 10]] as const) {
    for (let j = 0; j < hgt; j++) {
      const off = Math.round(Math.sin(t * 1.3 + j * 0.5 + sx) * (j / hgt) * 1.5);
      ctx.fillStyle = j % 3 ? "#3f8a4a" : "#63b05e";
      ctx.fillRect(x + sx + off, y + h - 4 - j, 1, 1);
    }
  }
  const feeding = info.feeding;
  info.fish.forEach((f, i) => {
    const fx = Math.round(f.x);
    const fy = Math.round(f.y);
    const d = f.dir;
    if (i === 0) {
      // The shark: grey back, white belly, a fin, a little grin. It speeds about at feeding time.
      const sx = feeding ? Math.round(x + w / 2 + Math.sin(t * 3) * (w / 2 - 8)) : fx;
      const dir = feeding ? (Math.cos(t * 3) > 0 ? 1 : -1) : d;
      const body = (dx: number, dy: number, ww: number, hh: number, c: string) => {
        ctx.fillStyle = c;
        ctx.fillRect(dir > 0 ? sx + dx : sx - dx - ww + 1, fy + dy, ww, hh);
      };
      body(-4, -1, 9, 2, "#7f8b96");
      body(-4, 1, 9, 1, "#e8ecef");
      body(-3, -2, 6, 1, "#7f8b96");
      body(-1, -4, 2, 2, "#6a7580");
      body(-6, -2, 2, 1, "#6a7580");
      body(-6, 1, 2, 1, "#6a7580");
      body(-5, -1, 1, 2, "#6a7580");
      body(3, -1, 1, 1, OUTLINE);
      body(3, 1, 2, 1, "#ffffff");
      return;
    }
    // Piranhas: dark backs, red bellies; more of them join in when food goes in.
    const flick = Math.floor(f.phase * 6) % 2;
    ctx.fillStyle = "#4a5a6a";
    ctx.fillRect(fx - 1, fy - 1, 4, 1);
    ctx.fillStyle = feeding ? "#ff4a3a" : "#d0503a";
    ctx.fillRect(fx - 1, fy, 4, 1);
    ctx.fillStyle = "#4a5a6a";
    ctx.fillRect(d > 0 ? fx - 2 : fx + 3, fy - flick, 1, 2);
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(d > 0 ? fx + 2 : fx - 1, fy - 1, 1, 1);
  });
  if (feeding) {
    // A frenzy: food flakes and bubbles everywhere.
    ctx.fillStyle = "#e9c46a";
    for (let i = 0; i < 7; i++) ctx.fillRect(x + 4 + i * 5, Math.round(y + 3 + ((t * 7 + i * 3) % (h - 7))), 1, 1);
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 6; i++) ctx.fillRect(x + 3 + ((i * 11 + Math.floor(t * 20)) % (w - 6)), y + 2 + ((i * 7 + Math.floor(t * 9)) % (h - 6)), 1, 1);
  } else {
    ctx.fillStyle = "#cfefff";
    for (let i = 0; i < 3; i++) {
      const k = (t * 0.5 + i / 3) % 1;
      ctx.fillRect(x + 4 + (i % 2), Math.round(y + h - 5 - k * (h - 8)), 1, 1);
    }
  }
  // A rubber duck bobbing on the surface.
  const dx = x + w - 10 + Math.round(Math.sin(t * 0.4) * 3);
  const dy = y + Math.round(Math.sin(t * 2) * 0.6);
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(dx - 1, dy - 3, 6, 4);
  ctx.fillStyle = "#ffd84a";
  ctx.fillRect(dx, dy - 2, 4, 2);
  ctx.fillRect(dx + 2, dy - 3, 2, 1);
  ctx.fillStyle = C.orange;
  ctx.fillRect(dx + 4, dy - 2, 1, 1);
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fillRect(x + 2, y + 3, 1, h - 8);
  return true;
}
