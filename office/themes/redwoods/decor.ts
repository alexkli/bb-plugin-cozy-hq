// Redwood Camp: little things on the forest floor (ferns, mushrooms, rocks, stumps).
import { C, logEnd, sprite } from "./kit.ts";

export type DecorKind = "ferns" | "shrooms" | "rock" | "stump" | "cones" | "lantern-stake" | "woodpile";

function frond(g: import("../../themekit.ts").Grid, x: number, y: number, len: number, dir: number, c: string, hi: string): void {
  // A fern frond arching out from (x, y), leaflets on both sides.
  for (let i = 0; i < len; i++) {
    const fx = x + Math.round(dir * i * 0.8);
    const fy = y - Math.round(Math.sin((i / len) * Math.PI * 0.9) * (len * 0.55));
    g.set(fx, fy, hi);
    if (i > 0 && i < len - 1) {
      g.set(fx, fy - 1, c);
      g.set(fx, fy + 1, c);
      if (i % 2 === 0 && i < len - 2) g.set(fx - dir, fy - 2, c).set(fx - dir, fy + 2, c);
    }
  }
}

export function decorSprite(kind: DecorKind, seed: number): HTMLCanvasElement {
  const v = seed % 3;
  switch (kind) {
    case "ferns":
      return sprite(`decor-ferns-${v}`, 16, 12, (g) => {
        frond(g, 7, 10, 7, -1, C.fern, C.fernHi);
        frond(g, 8, 10, 7, 1, C.fern, C.fernHi);
        frond(g, 7, 10, 5, -0.3, C.fernDk, C.fern);
        frond(g, 8, 10, 5, 0.4, C.fernDk, C.fern);
        if (v === 1) g.set(4, 6, C.fernLt).set(11, 5, C.fernLt);
        g.rect(6, 10, 4, 1, C.mossDk);
      });
    case "shrooms":
      return sprite(`decor-shrooms-${v}`, 10, 8, (g) => {
        const caps = v === 0 ? ["#c4552d", "#e07a4a"] : v === 1 ? ["#d9a066", "#ecc08a"] : ["#b23a32", "#d85a4a"];
        g.rect(2, 4, 1, 3, C.cream).rect(6, 3, 1, 4, C.cream);
        g.rect(1, 3, 3, 1, caps[0]!).set(2, 2, caps[1]!);
        g.rect(5, 1, 3, 2, caps[0]!).rect(6, 1, 1, 1, caps[1]!);
        if (v === 2) g.set(5, 1, C.cream).set(7, 2, C.cream);
        g.rect(0, 7, 9, 1, C.mossHi);
      });
    case "rock":
      return sprite(`decor-rock-${v}`, 12, 8, (g) => {
        g.ellipse(5.5, 4, 4.8, 3, C.stone);
        g.ellipse(4.5, 3, 3, 1.6, C.stoneHi);
        g.set(3, 2, C.stoneLt);
        g.rect(2, 6, 7, 1, C.stoneDk);
        g.rect(1, 2, 3, 1, C.mossHi).set(2, 1, C.moss);
      });
    case "stump":
      return sprite(`decor-stump-${v}`, 14, 12, (g) => {
        g.rect(2, 4, 10, 6, C.barkMid);
        g.rect(2, 4, 2, 6, C.barkHi);
        g.rect(10, 4, 2, 6, C.bark);
        for (const x of [5, 7, 9]) g.rect(x, 5, 1, 5, C.barkDk);
        g.rect(1, 9, 12, 1, C.bark).set(0, 9, C.barkMid).set(13, 9, C.bark);
        logEnd(g, 6.5, 3, 5, 2.4);
        if (v !== 0) g.set(11, 7, "#e0b77e").set(12, 7, "#b58652");
        g.rect(1, 10, 3, 1, C.mossHi);
      });
    case "cones":
      return sprite(`decor-cones-${v}`, 8, 6, (g) => {
        for (const [x, y] of [
          [1, 2],
          [4, 1],
        ] as const) {
          g.rect(x, y, 3, 3, C.walnut).set(x + 1, y, C.walnutHi).set(x, y + 2, C.walnutLo).set(x + 2, y + 1, C.walnutLo);
        }
      });
    case "lantern-stake":
      return sprite(`decor-lstake`, 8, 18, (g) => {
        g.rect(3, 7, 1, 10, C.logDk);
        g.rect(1, 6, 5, 1, C.iron);
        g.set(3, 0, C.iron).rect(2, 1, 3, 1, C.iron).rect(1, 2, 5, 4, C.iron);
        g.rect(2, 2, 3, 3, C.glass).set(3, 3, C.flameHi);
        g.rect(2, 16, 3, 1, C.mossHi);
      });
    case "woodpile":
      return sprite(`decor-woodpile`, 20, 12, (g) => {
        for (const [x, y] of [
          [3, 7],
          [8, 7],
          [13, 7],
          [5.5, 3.5],
          [10.5, 3.5],
        ] as const) logEnd(g, x, y, 2.6, 2.4);
        g.set(17, 9, C.mossHi).set(1, 10, C.moss);
      });
  }
}
