// Spaceship: the ship's animals and helpers. Gasket is a little service
// robot dog (white plates, the orange livery, a visor face with LED eyes and
// an antenna tail with a glowing tip); Plum is a fluffy lilac critter from
// nobody-knows-which planet, with big eyes, long drooping ears that glow at
// the tips and a plume of a tail. A hovering maintenance drone does the
// floors, and the fish live in a zero-g water sphere floating over its
// pedestal.
import type { CatPose, DogPose } from "../../characters.ts";
import type { Rect } from "../../layout.ts";
import type { PaintInfo, Theme } from "../../theme.ts";
import { cached, Grid, hash, OUTLINE } from "../../themekit.ts";
import { P } from "./pal.ts";

function bake(g: Grid, left: boolean, skip: string[] = []): HTMLCanvasElement {
  g.outline(OUTLINE, { skip });
  return (left ? g.flipped() : g).toCanvas();
}

// ------------------------------------------------------------------ Gasket, the robot dog

const DOG = {
  plate: P.white,
  plateLo: "#d3d9e2",
  plateDk: "#a9b1bf",
  joint: P.steel,
  visor: "#1c2639",
  eye: P.cyan,
  eyeOff: "#33415c",
  stripe: P.orange,
  tip: P.amber,
};

/** A small service robot dog (20×15): rounded plates, a visor face, an antenna tail. */
function robotDog(pose: DogPose, facing: "left" | "right", blink: boolean): HTMLCanvasElement {
  return cached(`spaceship|dog|${pose}|${facing}|${blink}`, () => {
    const g = new Grid(20, 15);
    const c = DOG;
    const eye = blink ? c.eyeOff : c.eye;
    if (pose === "loaf") {
      // Lying down, chin on its paws, in standby.
      g.rrect(2, 8, 13, 5, c.plate, 2);
      g.rect(4, 12, 9, 1, c.plateLo);
      g.hline(4, 10, 8, c.stripe);
      g.vline(8, 9, 3, c.plateLo);
      g.rrect(11, 4, 7, 6, c.plate, 2);
      g.rect(11, 8, 7, 1, c.plateLo);
      g.rect(14, 6, 4, 2, c.visor);
      // Standby: a sleepy dash of an eye.
      g.hline(15, 7, 2, blink ? c.eyeOff : "#4fb6d8");
      g.rect(12, 2, 2, 2, c.plateDk).set(12, 2, c.stripe);
      g.rect(14, 12, 4, 1, c.plateLo);
      g.set(1, 10, c.joint).set(1, 9, c.tip);
    } else if (pose === "sit" || pose === "wag0" || pose === "wag1") {
      // Sitting up, facing you.
      g.rect(3, 2, 2, 4, c.plateDk).rect(15, 2, 2, 4, c.plateDk);
      g.set(3, 2, c.stripe).set(16, 2, c.stripe);
      g.rrect(5, 1, 10, 7, c.plate, 2);
      g.hline(6, 1, 8, P.panelHi);
      g.rrect(6, 3, 8, 3, c.visor, 1);
      g.rect(7, 3, 2, 2, eye).rect(11, 3, 2, 2, eye);
      if (!blink) g.set(7, 3, "#e6fbff").set(11, 3, "#e6fbff");
      g.hline(9, 6, 2, c.plateDk);
      g.rrect(5, 8, 10, 6, c.plate, 2);
      g.rect(6, 12, 8, 1, c.plateLo);
      g.hline(6, 8, 8, c.stripe);
      // The chest light.
      g.rect(9, 10, 2, 2, c.visor).set(9, 10, c.eye);
      g.rect(6, 11, 2, 2, c.plateDk).rect(12, 11, 2, 2, c.plateDk);
      g.rect(5, 13, 3, 1, c.plate).rect(12, 13, 3, 1, c.plate);
      const wag = pose === "wag1" ? -1 : pose === "wag0" ? 1 : 0;
      g.set(15, 11, c.joint).set(16, 10 + wag, c.joint).set(17, 9 + wag * 2, c.tip);
    } else {
      // Trotting (walk0, walk1), seen from the side.
      const step = pose === "walk1" ? 1 : 0;
      g.rrect(3, 5, 12, 6, c.plate, 2);
      g.hline(5, 5, 8, P.panelHi);
      g.rect(4, 9, 10, 2, c.plateLo);
      g.hline(5, 7, 8, c.stripe);
      g.vline(9, 6, 3, c.plateLo);
      g.rrect(12, 1, 7, 6, c.plate, 2);
      g.rect(15, 3, 4, 2, c.visor);
      g.set(17, 3, eye);
      if (!blink) g.set(16, 3, "#4fb6d8");
      g.hline(16, 5, 2, c.plateLo);
      g.rect(13, 0, 2, 2, c.plateDk).set(13, 0, c.stripe);
      for (const [x, near] of [
        [3 + step, false],
        [6 - step, true],
        [10 + step, false],
        [13 - step, true],
      ] as const) {
        g.rect(x, 11, 2, 1, near ? c.joint : P.steelDk);
        g.rect(x, 12, 2, 1, near ? c.plate : c.plateDk);
      }
      g.set(2, 6, c.joint).set(1, 5, c.joint).set(1, 4, c.tip);
    }
    return bake(g, facing === "left");
  });
}

// ------------------------------------------------------------------ Plum, the critter

const PLUM = {
  coat: "#c6b0ee",
  coatHi: "#e2d6ff",
  coatLo: "#9f88cf",
  belly: "#f6eedd",
  glow: "#8ff0b5",
  glowHi: "#e2fff0",
  eye: OUTLINE,
  shine: "#ffffff",
  nose: "#ff8fb0",
  blush: "#f2b1d6",
  white: "#f6f0ff",
};

/** A fluffy little alien (16×13): a big head with big eyes, long lop ears with glowing tips, a plume of a tail. */
function critter(pose: CatPose, facing: "left" | "right", blink: boolean): HTMLCanvasElement {
  return cached(`spaceship|critter|${pose}|${facing}|${blink}`, () => {
    const g = new Grid(16, 13);
    const c = PLUM;
    const deep = "#4a3b7a";
    if (pose === "loaf") {
      // Curled up on its tail, an ear draped over its back.
      g.rrect(1, 3, 5, 8, c.coatHi, 2);
      g.rect(1, 3, 3, 2, c.white);
      g.rrect(3, 5, 9, 6, c.coat, 3);
      g.rect(5, 5, 4, 1, c.coatHi);
      g.rrect(8, 2, 7, 7, c.coat, 3);
      g.rect(9, 2, 4, 1, c.coatHi);
      if (blink) g.hline(11, 5, 2, c.eye);
      else g.rect(11, 4, 2, 2, c.eye).set(11, 4, c.shine);
      g.set(14, 6, c.nose).set(13, 6, c.blush);
      g.rect(7, 4, 2, 2, c.coatLo).set(6, 6, c.coatLo);
      g.rect(5, 7, 2, 2, c.glow).set(5, 7, c.glowHi);
      g.rrect(3, 9, 10, 2, c.coatLo, 1);
    } else if (pose === "sit" || pose === "groom") {
      // Sitting, facing you: lop ears hang past its cheeks, the tail peeks out behind.
      g.rrect(11, 8, 4, 4, c.coatHi, 1);
      g.set(14, 8, c.coat);
      g.rrect(4, 7, 8, 5, c.coat, 2);
      g.rect(6, 8, 4, 3, c.belly);
      g.rrect(3, 1, 10, 7, c.coat, 3);
      g.rect(5, 1, 5, 1, c.coatHi).set(4, 2, c.coatHi);
      g.set(8, 0, c.coatHi).set(7, 0, c.coat);
      g.rect(1, 2, 2, 5, c.coatLo).rect(13, 2, 2, 5, c.coatLo);
      g.rect(1, 7, 2, 2, c.glow).rect(13, 7, 2, 2, c.glow);
      g.set(1, 7, c.glowHi).set(13, 7, c.glowHi);
      if (blink || pose === "groom") {
        // Content little arcs.
        g.set(5, 4, c.eye).set(6, 3, c.eye).set(7, 4, c.eye);
        g.set(8, 4, c.eye).set(9, 3, c.eye).set(10, 4, c.eye);
      } else {
        g.rect(5, 3, 2, 3, c.eye).rect(9, 3, 2, 3, c.eye);
        g.set(5, 3, c.shine).set(9, 3, c.shine).set(6, 5, deep).set(10, 5, deep);
      }
      g.set(4, 5, c.blush).set(11, 5, c.blush);
      g.set(7, 6, c.nose).set(8, 6, c.nose);
      g.rect(5, 11, 2, 1, c.coatLo).rect(9, 11, 2, 1, c.coatLo);
      if (pose === "groom") g.rect(7, 6, 2, 2, c.belly);
    } else {
      // Scampering (walk0, walk1) or riding the drone (ride), seen from the side.
      const step = pose === "walk1" ? 1 : 0;
      // The tail: a plume curling up behind.
      g.rrect(1, 1, 4, 7, c.coatHi, 2);
      g.rect(1, 1, 3, 2, c.white);
      g.rrect(3, 5, 8, 5, c.coat, 2);
      g.rect(5, 5, 3, 1, c.coatHi);
      g.hline(5, 9, 5, c.belly);
      g.rrect(8, 1, 7, 7, c.coat, 3);
      g.rect(9, 1, 4, 1, c.coatHi);
      if (blink) g.hline(11, 4, 2, c.eye);
      else g.rect(11, 3, 2, 3, c.eye).set(11, 3, c.shine).set(12, 5, deep);
      g.set(14, 5, c.nose).set(13, 6, c.blush);
      // The ear streams back as it runs, its tip aglow.
      g.rect(7, 2, 2, 2, c.coatLo).set(7, 4, c.coatLo);
      g.rect(5, 4, 2, 2, c.glow).set(5, 4, c.glowHi);
      if (pose !== "ride") {
        g.rect(4 + step, 10, 2, 2, step ? c.coatLo : c.coat).rect(8 - step, 10, 2, 2, step ? c.coat : c.coatLo);
      }
    }
    return bake(g, facing === "left");
  });
}

function shipPet(kind: "dog" | "cat", pose: DogPose | CatPose, facing: "left" | "right", blink: boolean): HTMLCanvasElement {
  return kind === "dog" ? robotDog(pose as DogPose, facing, blink) : critter(pose as CatPose, facing, blink);
}

// ------------------------------------------------------------------ the maintenance drone

const GLOW = "#7fe3ffcc";
const GLOW_FAINT = "#7fe3ff55";

/** A little hovering maintenance drone (16×9): a pod with a sensor dome and a thruster glow underneath. */
function drone(): HTMLCanvasElement {
  return cached("spaceship|drone", () => {
    const g = new Grid(16, 9);
    g.ellipse(7.5, 4, 5.5, 2, P.white);
    g.rect(3, 5, 10, 1, "#d3d9e2");
    g.hline(4, 4, 8, P.orange);
    g.hline(4, 3, 3, P.panelHi);
    g.rrect(6, 1, 4, 3, "#1c2639", 1);
    g.set(8, 2, P.cyan).set(7, 2, "#3aa6cc");
    g.set(1, 4, P.steel).set(14, 4, P.steel);
    g.rect(6, 6, 4, 1, P.steel);
    g.rect(6, 7, 4, 1, GLOW);
    g.rect(7, 8, 2, 1, GLOW_FAINT);
    return bake(g, false, [GLOW, GLOW_FAINT]);
  });
}

// ------------------------------------------------------------------ the zero-g water sphere

const WOBBLE = 8;
const SW = 42;
const SH = 27;

/** One wobble frame of the floating water: a lumpy, shimmering blob with a bright rim (42×27, tank coords + 1, + 2). */
function blob(frame: number): HTMLCanvasElement {
  return cached(`spaceship|sphere|${frame}`, () => {
    const g = new Grid(SW, SH);
    const a = (frame / WOBBLE) * Math.PI * 2;
    const cx = 20.5;
    const cy = 13;
    const rx = 18.6 + Math.sin(a) * 0.7;
    const ry = 10.6 - Math.sin(a) * 0.6;
    const inside = (x: number, y: number, k: number) => {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      const th = Math.atan2(dy, dx);
      const lump = 1 + 0.035 * Math.sin(th * 3 + a) + 0.02 * Math.sin(th * 5 - a * 2);
      return dx * dx + dy * dy <= k * lump * lump;
    };
    for (let y = 0; y < SH; y++) {
      for (let x = 0; x < SW; x++) {
        if (!inside(x, y, 1)) continue;
        const v = (y - (cy - ry)) / (ry * 2);
        let col = v < 0.3 ? "#6cc4ecdd" : v < 0.62 ? "#4aa7dcdd" : "#3184c2e6";
        if (!inside(x, y, 0.8)) col = v < 0.5 ? "#a9e6ffee" : "#5fb4e6ee";
        g.set(x, y, col);
      }
    }
    // The shine at the top left, and a faint reflection lower right.
    for (let y = 0; y < SH; y++) {
      for (let x = 0; x < SW; x++) {
        if (!g.get(x, y) || !inside(x, y, 0.62) || inside(x, y, 0.4)) continue;
        if (x < cx - 6 && y < cy - 2) g.set(x, y, "#e4f8ffee");
        else if (x > cx + 9 && y > cy + 4) g.set(x, y, "#86cdf2e6");
      }
    }
    g.set(Math.round(cx - 10), Math.round(cy - 6), "#ffffff").set(Math.round(cx - 9), Math.round(cy - 7), "#ffffff");
    g.outline(OUTLINE);
    return g.toCanvas();
  });
}

const FISH = ["#ff8a3d", "#ffd84a", "#7fd1ff", "#ff6fa3", "#8ff0b5"];

type TankInfo = PaintInfo & { fish: { x: number; y: number; dir: 1 | -1; color: string; phase: number }[]; feeding: boolean };

/** Fish swimming in a wobbling ball of water that floats over its pedestal, droplets drifting round it. */
function shipFishTank(ctx: CanvasRenderingContext2D, tank: Rect, info: TankInfo): boolean {
  const { x, y, h } = tank;
  const t = info.t;
  const bob = Math.round(Math.sin(t * 1.3));
  const frame = Math.floor(t * 5) % WOBBLE;
  const cx = x + 20.5;
  const cy = y + 11 + bob;
  // The levitation field: a faint beam from the pedestal up into the water.
  ctx.fillStyle = "rgba(127,227,255,0.22)";
  ctx.fillRect(x + 12, y + h - 3 + bob, 17, 4 - bob);
  ctx.fillStyle = "rgba(200,245,255,0.35)";
  ctx.fillRect(x + 15 + (Math.floor(t * 6) % 3) * 4, y + h - 1, 2, 1);
  ctx.drawImage(blob(frame), x - 1, y - 2 + bob);
  // Fish, inside the water.
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, 17, 9, 0, 0, Math.PI * 2);
  ctx.clip();
  for (const f of info.fish) {
    const fx = Math.round(f.x);
    const fy = Math.round(f.y) + bob;
    const flick = Math.floor(f.phase * 6) % 2;
    ctx.fillStyle = FISH[hash(f.color) % FISH.length]!;
    ctx.fillRect(fx, fy, 3, 2);
    ctx.fillRect(fx + 1, fy - 1, 1, 1);
    ctx.fillRect(f.dir > 0 ? fx - 1 : fx + 3, fy - flick, 1, 2 + flick);
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(f.dir > 0 ? fx + 2 : fx, fy, 1, 1);
  }
  // A couple of air bubbles that never rise (there's no up), just wander.
  ctx.fillStyle = "#d9f6ff";
  for (let i = 0; i < 3; i++) {
    const a = t * (0.35 + i * 0.12) + i * 2.1;
    ctx.fillRect(Math.round(cx + Math.cos(a) * (8 + i * 3)), Math.round(cy + Math.sin(a * 1.3) * (4 + i)), 1, 1);
  }
  if (info.feeding) {
    ctx.fillStyle = "#e9c46a";
    for (let i = 0; i < 6; i++) {
      const a = t * 0.6 + i * 1.05;
      ctx.fillRect(Math.round(cx + Math.cos(a) * (5 + (i % 3) * 4)), Math.round(cy - 3 + Math.sin(a * 0.8) * 4), 1, 1);
    }
  }
  ctx.restore();
  // Stray droplets orbiting the sphere.
  for (let i = 0; i < 3; i++) {
    const a = t * (0.4 + i * 0.07) + i * 2.3;
    const dx = Math.round(cx + Math.cos(a) * (21 + i));
    const dy = Math.round(cy + Math.sin(a) * (12 + (i % 2)));
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(dx, dy + 1, 2, 1);
    ctx.fillStyle = i === 1 ? "#a9e6ff" : "#6cc4ec";
    ctx.fillRect(dx, dy, 2, 1);
    if (i === 2) ctx.fillRect(dx, dy - 1, 1, 1);
  }
  return true;
}

export const CRITTERS: Pick<Theme, "pet" | "roomba" | "fishTank"> = {
  pet: (kind, pose, facing, blink) => shipPet(kind, pose, facing, blink),
  roomba: () => drone(),
  fishTank: shipFishTank,
};
