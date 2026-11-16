// Redwood Camp furniture: camp kitchen, campfire, log benches, tents' insides,
// the cabin, the porch, the lawn games and the solar hut. Classic sizes throughout.
import type { Layout, PropPlacement } from "../../layout.ts";
import { adjust, Grid, shade, tint } from "../../themekit.ts";
import { barkFill, boards, C, cached, hlog, lanternAt, logEnd, mugAt, OUTLINE, plaidFill, rng, sprite } from "./kit.ts";

// ------------------------------------------------------------------ small parts

const BOOKS = ["#b23a32", "#3f6b3a", "#d9a531", "#2f5a7a", "#8a5a3c", "#e6dabd", "#c4552d", "#5a7a8a"];

function books(g: Grid, x0: number, x1: number, base: number, seed: number): void {
  const r = rng(seed);
  let x = x0;
  let i = 0;
  while (x < x1) {
    const bw = r() < 0.3 ? 2 : 1 + (r() < 0.5 ? 1 : 0);
    const bh = 4 + Math.floor(r() * 3);
    const c = BOOKS[Math.floor(r() * BOOKS.length)]!;
    if (r() < 0.12 && x + 3 < x1) {
      // A leaning book
      g.set(x, base - 1, c).set(x + 1, base - 2, c).set(x + 2, base - 3, c).set(x + 1, base - 1, shade(c, -0.2));
      x += 4;
      continue;
    }
    g.rect(x, base - bh, bw, bh, c);
    g.set(x, base - bh, shade(c, 0.25));
    x += bw;
    if (i++ % 5 === 4) x += 1;
  }
}

/** Fern fronds rising from (x, y). */
function fern(g: Grid, x: number, y: number, h: number, spread: number, seed: number, cols: [string, string, string] = [C.fernDk, C.fern, C.fernHi]): void {
  const r = rng(seed);
  const n = 5;
  for (let f = 0; f < n; f++) {
    const ang = -spread + (f / (n - 1)) * spread * 2;
    const len = h * (0.75 + r() * 0.3) * (f === 2 ? 1 : 0.85);
    for (let i = 0; i < len; i++) {
      const k = i / len;
      const fx = x + Math.round(Math.sin(ang) * i * 0.9 + ang * k * k * 3);
      const fy = y - Math.round(Math.cos(ang * 0.8) * i);
      g.set(fx, fy, cols[1]);
      if (i % 2 === 0 && i > 1 && i < len - 1) {
        g.set(fx - 1, fy, cols[f % 2 ? 0 : 2]).set(fx + 1, fy, cols[f % 2 ? 2 : 0]);
      }
    }
  }
}

/** A young conifer: stacked tiers of needles. */
function conifer(g: Grid, cx: number, top: number, h: number, w: number, dark: string, mid: string, hi: string): void {
  const tiers = Math.max(3, Math.round(h / 6));
  for (let t = 0; t < tiers; t++) {
    const ty = top + Math.round((t * h) / tiers);
    const th = Math.round(h / tiers) + 2;
    const tw = Math.round(((t + 1) / tiers) * w);
    for (let j = 0; j < th; j++) {
      const half = Math.max(1, Math.round((j / th) * tw * 0.5) + 1);
      g.rect(cx - half, ty + j, half * 2, 1, mid);
      g.set(cx - half, ty + j, dark).set(cx + half - 1, ty + j, dark);
      if (j > 0) g.set(cx - half + 1, ty + j, hi);
    }
    g.rect(cx - Math.round(tw / 2), ty + th - 1, Math.round(tw), 1, dark);
  }
}

function campChair(g: Grid, ox: number, oy: number, front: boolean, cloth: string, clothHi: string): void {
  const wood = C.log;
  if (front) {
    // Seen from the front: canvas back up top, seat, crossed legs.
    g.rect(ox + 2, oy, 2, 17, wood).rect(ox + 12, oy, 2, 17, wood);
    g.rect(ox + 2, oy, 1, 17, C.logHi).rect(ox + 12, oy, 1, 17, C.logHi);
    g.rect(ox + 4, oy + 1, 8, 6, cloth).rect(ox + 4, oy + 1, 8, 1, clothHi);
    g.rect(ox + 4, oy + 9, 8, 5, cloth).rect(ox + 4, oy + 9, 8, 1, clothHi);
    g.rect(ox + 2, oy + 14, 12, 2, C.logLo);
    g.line(ox + 3, oy + 16, ox + 12, oy + 22, C.logLo).line(ox + 12, oy + 16, ox + 3, oy + 22, C.logDk);
    g.rect(ox + 2, oy + 22, 2, 1, C.logDk).rect(ox + 12, oy + 22, 2, 1, C.logDk);
  } else {
    // Seen from behind: the canvas back, the frame and legs.
    g.rect(ox + 2, oy, 2, 12, wood).rect(ox + 12, oy, 2, 12, wood);
    g.rect(ox + 2, oy, 1, 12, C.logHi).rect(ox + 12, oy, 1, 12, C.logHi);
    g.rect(ox + 4, oy + 1, 8, 7, shade(cloth, -0.12)).rect(ox + 4, oy + 1, 8, 1, cloth);
    g.rect(ox + 2, oy + 9, 12, 2, C.logLo);
    g.line(ox + 3, oy + 11, ox + 12, oy + 16, C.logLo).line(ox + 12, oy + 11, ox + 3, oy + 16, C.logDk);
  }
}

// ------------------------------------------------------------------ the lounge: campfire circle

function couch(): HTMLCanvasElement {
  return sprite("couch", 84, 28, (g) => {
    // Seen from behind, like the classic couch: the backrest log is nearest.
    hlog(g, 4, 12, 76, 10, 21, true);
    // Stump legs
    for (const x of [9, 71]) g.rect(x, 22, 4, 4, C.barkMid).rect(x, 22, 1, 4, C.barkHi).rect(x + 3, 22, 1, 4, C.bark);
    hlog(g, 2, 3, 80, 10, 23, true);
    // Posts holding the backrest
    for (const x of [8, 40, 72]) g.rect(x, 1, 3, 3, C.logLo).set(x, 1, C.logHi);
    // A cream pillow peeking over, a plaid blanket hung over the right end.
    g.rrect(5, 0, 12, 5, C.wool, 1).rect(6, 1, 9, 1, C.cream).set(10, 3, C.canvasDk);
    plaidFill(g, 66, 2, 11, 15, C.plaid, C.plaidDk, C.plaidBk, 2);
    g.rect(66, 2, 11, 1, "#c94a40");
    for (let x = 66; x < 77; x += 2) g.set(x, 17, C.cream);
    // Knit throw in the middle
    g.rect(28, 3, 9, 7, "#3f6b5a");
    for (let x = 28; x < 37; x += 2) g.set(x, 4, "#5a8a74").set(x + 1, 6, "#5a8a74").set(x, 8, "#5a8a74");
    g.rect(28, 10, 9, 1, "#2f5040");
  });
}

function fireRing(): HTMLCanvasElement {
  return sprite("fire-ring", 38, 14, (g) => {
    g.ellipse(18.5, 7.5, 16.5, 5, C.stoneDk);
    g.ellipse(18.5, 7.5, 13, 3.6, "#2e2420");
    g.ellipse(18.5, 7.5, 9, 2.2, "#4a3a32");
    // Stones around the ring
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const sx = Math.round(18.5 + Math.cos(a) * 15);
      const sy = Math.round(7.5 + Math.sin(a) * 4.6);
      const c = i % 3 === 0 ? C.stoneHi : i % 3 === 1 ? C.stone : "#95928a";
      g.rect(sx - 1, sy - 1, 3, 2, c);
      g.set(sx - 1, sy - 1, C.stoneLt);
    }
    // Crossed logs and embers
    g.line(11, 9, 25, 6, C.logLo).line(11, 8, 25, 5, C.barkMid);
    g.line(12, 5, 26, 9, C.bark).line(12, 6, 26, 10, C.barkHi);
    logEnd(g, 11, 8.5, 1, 1);
    logEnd(g, 26, 9.5, 1, 1);
    for (const [x, y] of [
      [15, 8],
      [21, 7],
      [18, 9],
      [23, 8],
      [14, 6],
    ] as const) g.set(x, y, C.ember);
    g.set(19, 8, C.flame).set(16, 7, C.flame);
  });
}

function piano(): HTMLCanvasElement {
  return sprite("piano", 32, 32, (g) => {
    const wood = "#8a5434";
    g.rect(1, 1, 30, 22, wood);
    g.rect(1, 1, 30, 2, "#a86c46");
    for (let x = 3; x < 30; x += 5) g.rect(x, 4, 1, 9, "#764628");
    g.rect(4, 5, 24, 8, "#7a4a2c");
    g.rect(2, 14, 28, 5, "#f4ecd8");
    for (let x = 4; x < 30; x += 3) g.rect(x, 14, 1, 3, OUTLINE);
    g.rect(1, 19, 30, 4, "#5e3620");
    g.rect(3, 23, 2, 7, "#6e4028").rect(27, 23, 2, 7, "#6e4028");
    // Candle lantern and a jar of wildflowers on top
    lanternAt(g, 4, -2);
    g.rect(22, 0, 3, 3, "#cfe0d8").set(22, -1, "#e5a03a").set(24, -1, "#e8e0f0").set(23, -1, C.fernHi);
    // Lace runner
    for (let x = 10; x < 21; x++) g.set(x, 2, x % 2 ? C.cream : C.wool);
  });
}

function fishtankStand(): HTMLCanvasElement {
  return sprite("pond-bank", 42, 22, (g) => {
    // The trout pond's stone bank, mossy, with ferns at the ends.
    const stones: [number, number, number, number][] = [
      [1, 1, 9, 6],
      [10, 1, 8, 7],
      [18, 1, 10, 6],
      [28, 1, 8, 7],
      [36, 1, 5, 6],
      [3, 7, 10, 6],
      [13, 8, 9, 6],
      [22, 7, 10, 7],
      [32, 8, 8, 6],
      [1, 13, 8, 6],
      [9, 14, 11, 5],
      [20, 14, 9, 5],
      [29, 14, 12, 5],
    ];
    for (const [i, [x, y, w, h]] of stones.entries()) {
      const c = i % 3 === 0 ? C.stone : i % 3 === 1 ? "#958f84" : "#7d7a70";
      g.rrect(x, y, w, h, c, 1);
      g.rect(x + 1, y, w - 2, 1, C.stoneHi);
      g.rect(x + 1, y + h - 1, w - 2, 1, C.stoneDk);
      if (i % 4 === 1) g.rect(x + 1, y + 1, 3, 1, C.mossHi).set(x + 2, y + 2, C.moss);
    }
    g.rect(1, 19, 40, 2, C.mossDk);
    for (let x = 2; x < 40; x += 3) g.set(x, 19, C.moss);
    fern(g, 3, 19, 9, 0.9, 41);
    fern(g, 38, 19, 8, 0.9, 42);
  });
}

function tvFrame(w: number, h: number, standing: boolean): HTMLCanvasElement {
  return sprite(`tv-${w}-${h}-${standing}`, w + 2, h + (standing ? 22 : 4), (g) => {
    // An outdoor screen in a frame of lashed poles.
    g.rect(1, 1, w, h, C.log);
    barkFill(g, 1, 1, 3, h, 61);
    barkFill(g, w - 2, 1, 3, h, 62);
    hlog(g, 1, 1, w, 3, 63, false);
    hlog(g, 1, h - 2, w, 3, 64, false);
    g.rect(4, 4, w - 6, h - 6, "#14121c");
    // Rope lashings at the corners
    for (const [x, y] of [
      [2, 2],
      [w - 1, 2],
      [2, h - 1],
      [w - 1, h - 1],
    ] as const) {
      g.set(x - 1, y - 1, C.canvasHi).set(x, y, C.canvasHi).set(x + 1, y + 1, C.canvasHi).set(x + 1, y - 1, C.canvas).set(x - 1, y + 1, C.canvas);
    }
    g.set(w - 5, h - 1, "#7ae08a");
    if (standing) {
      for (const x of [6, w - 7]) {
        g.rect(x, h + 1, 3, 20, C.barkMid).rect(x, h + 1, 1, 20, C.barkHi).rect(x + 2, h + 1, 1, 20, C.bark);
      }
      // A crate of firewood and blankets between the posts
      g.rect(12, h + 6, w - 22, 13, C.log);
      g.rect(12, h + 6, w - 22, 1, C.logHi);
      for (let x = 16; x < w - 12; x += 10) g.rect(x, h + 7, 1, 12, C.logLo);
      plaidFill(g, 14, h + 9, 14, 6, C.plaid, C.plaidDk, C.plaidBk, 2);
      for (let i = 0; i < 3; i++) logEnd(g, w - 26 + i * 5, h + 13, 2, 2);
      g.rect(12, h + 18, w - 22, 1, C.logDk);
    } else {
      g.rect(w / 2 - 5, h + 1, 12, 2, C.logLo);
    }
  });
}

function beanbagMoss(): HTMLCanvasElement {
  return sprite("moss-cushion", 26, 16, (g) => {
    g.ellipse(13, 9, 11, 5.5, C.moss);
    g.ellipse(13, 6.5, 8.5, 3.6, C.mossHi);
    g.ellipse(11, 5.5, 4, 1.6, C.mossLt);
    g.rect(4, 12, 18, 1, C.mossDk);
    for (const [x, y] of [
      [6, 9],
      [18, 8],
      [14, 11],
      [9, 7],
      [20, 11],
    ] as const) g.set(x, y, C.mossDk);
    g.set(16, 5, "#f4f0dc").set(8, 10, "#f4f0dc").set(19, 9, "#f2d24a");
  });
}

function beanbagNest(): HTMLCanvasElement {
  return sprite("blanket-nest", 26, 16, (g) => {
    // A round wicker nest with a sheepskin and a plaid throw.
    g.ellipse(13, 9, 11, 5.5, "#b08a52");
    for (let x = 3; x < 24; x += 2) g.set(x, 11, "#8a6a3a").set(x + 1, 13, "#8a6a3a");
    g.ellipse(13, 7.5, 8.5, 3.6, C.wool);
    g.ellipse(12, 6.5, 5, 2, C.cream);
    plaidFill(g, 15, 5, 7, 5, C.plaid, C.plaidDk, C.plaidBk, 2);
    g.set(15, 5, null).set(21, 9, null);
    g.rect(4, 12, 18, 1, "#7a5a2e");
  });
}

// ------------------------------------------------------------------ the camp kitchen

function gingham(g: Grid, x: number, y: number, w: number, h: number): void {
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const a = Math.floor(i / 2) % 2;
      const b = Math.floor(j / 2) % 2;
      g.set(x + i, y + j, a && b ? "#b8433a" : a || b ? "#e0a090" : C.cream);
    }
  }
  for (let i = 2; i < w; i += 4) g.rect(x + i, y + 1, 1, h - 1, "#c88a7a");
  g.rect(x, y + h - 1, w, 1, "#b8433a");
}

function kitchenCounter(w: number): HTMLCanvasElement {
  return sprite(`kcounter-${w}`, w + 2, 36, (g) => {
    const top = 10;
    // Cabinet with gingham curtains
    g.rect(1, top + 7, w, 17, C.walnut);
    g.rect(1, top + 7, w, 1, C.walnutHi);
    for (let x = 4; x < w - 6; x += 22) gingham(g, x, top + 9, Math.min(18, w - 3 - x), 13);
    // Butcher-block top
    g.rect(1, top, w, 7, C.log);
    g.rect(1, top, w, 1, C.logHi);
    g.rect(1, top + 6, w, 1, C.logLo);
    for (let x = 3; x < w; x += 6) g.set(x, top + 3, C.ring).set(x + 3, top + 4, C.ring);
    // Camp stove with the enamel kettle on it
    g.rect(27, 10, 17, 4, "#3f6b4a").rect(27, 10, 17, 1, "#5a8a64").rect(28, 13, 15, 1, "#2c4c36");
    g.rect(31, 12, 8, 1, OUTLINE);
    g.rrect(31, 4, 9, 8, C.blueEnamel, 2);
    for (const [x, y] of [
      [33, 6],
      [36, 8],
      [34, 9],
      [37, 5],
    ] as const) g.set(x, y, C.enamelSpeck);
    g.rect(33, 2, 5, 2, C.iron).set(35, 1, C.ironHi);
    g.set(40, 7, C.blueEnamel).set(41, 6, C.blueEnamel);
    g.set(32, 5, "#6a94bc");
    // Enamel wash basin and a hand pump
    if (w >= 80) {
      g.rect(46, top + 1, 14, 5, "#e8eef0");
      g.rect(46, top + 1, 14, 1, C.blueEnamel);
      g.rect(47, top + 2, 12, 3, "#b9c8d0");
      g.rect(52, top - 6, 2, 7, C.iron).rect(51, top - 7, 4, 2, C.ironHi).line(54, top - 7, 58, top - 9, C.iron).set(50, top - 3, C.iron);
    }
    // A little camp oven where the microwave goes
    if (w >= 100) {
      g.rect(w - 26, 0, 22, 14, "#2f4a3e");
      g.rect(w - 26, 0, 22, 1, "#4a6a5a");
      g.rect(w - 24, 2, 13, 10, "#22302a");
      g.rect(w - 23, 3, 3, 2, "#4a5a52");
      g.rect(w - 9, 3, 3, 8, "#1e2a24").set(w - 8, 4, "#7ae08a").set(w - 8, 7, C.brass);
      g.rect(w - 25, 12, 1, 2, C.iron).rect(w - 6, 12, 1, 2, C.iron);
    }
    // Enamel mugs
    mugAt(g, w >= 80 ? 62 : 22, top - 4);
    mugAt(g, w >= 100 ? w - 34 : w - 8, top - 4, C.cream, "#b8433a");
  });
}

function espresso(): HTMLCanvasElement {
  return sprite("espresso", 26, 30, (g) => {
    // A big copper coffee urn with a brass spigot, on a crate.
    const cu = "#c06a3e";
    const cuHi = "#e3955f";
    const cuLo = "#8e4628";
    g.rect(2, 24, 22, 4, C.log).rect(2, 24, 22, 1, C.logHi).rect(2, 27, 22, 1, C.logDk);
    for (const x of [7, 13, 19]) g.set(x, 25, C.logLo).set(x, 26, C.logLo);
    g.rect(3, 22, 20, 2, C.iron);
    for (let x = 4; x < 22; x += 2) g.set(x, 22, C.ironHi);
    // Body: a tall copper drum with bands.
    g.rect(5, 5, 16, 17, cu);
    g.rect(6, 5, 2, 17, cuHi).rect(9, 5, 1, 17, "#d4804c");
    g.rect(18, 5, 2, 17, cuLo);
    g.rect(5, 7, 16, 1, cuLo).rect(5, 19, 16, 1, cuLo);
    // Lid with a wooden knob
    g.rect(6, 2, 14, 3, cuLo).rect(7, 2, 12, 1, cu);
    g.rect(11, 0, 4, 2, C.walnut).set(11, 0, C.walnutHi);
    // A slim brass level gauge (the display blinks in it)
    g.rect(8, 9, 10, 3, C.brass).rect(9, 10, 8, 1, "#2a1e16").set(8, 9, C.brassHi);
    // Side handles
    g.rect(3, 9, 2, 1, C.iron).rect(3, 9, 1, 5, C.iron).rect(3, 13, 2, 1, C.iron);
    g.rect(21, 9, 2, 1, C.iron).rect(22, 9, 1, 5, C.iron).rect(21, 13, 2, 1, C.iron);
    // Brass spigot and a mug under it
    g.rect(7, 15, 4, 2, C.brass).set(7, 15, C.brassHi).rect(8, 17, 2, 1, C.brass);
    g.rect(7, 19, 3, 3, C.cream).set(10, 20, C.cream).rect(7, 19, 3, 1, C.blueEnamel);
    g.rect(14, 14, 4, 3, C.cream).rect(15, 15, 2, 1, "#6b3e1e");
  });
}

function fridge(): HTMLCanvasElement {
  return sprite("icebox", 20, 34, (g) => {
    // An old oak icebox with brass latches.
    const oak = "#b8844c";
    g.rrect(1, 1, 18, 31, oak, 1);
    g.rect(2, 1, 16, 1, "#d4a06a");
    g.rect(1, 12, 18, 1, "#7a5230");
    g.rect(3, 3, 14, 7, "#a6743e").rect(3, 3, 14, 1, "#c8925a");
    g.rect(3, 14, 14, 15, "#a6743e").rect(3, 14, 14, 1, "#c8925a");
    for (let y = 16; y < 28; y += 3) g.rect(4, y, 12, 1, "#9a6a36");
    g.rect(15, 5, 2, 3, C.brass).set(15, 5, C.brassHi);
    g.rect(15, 18, 2, 4, C.brass).set(15, 18, C.brassHi);
    g.rect(2, 30, 3, 2, C.walnutDk).rect(15, 30, 3, 2, C.walnutDk);
    // A note and a magnet pinecone
    g.rect(5, 15, 5, 4, C.cream).rect(6, 16, 3, 1, "#9a8a6a").set(10, 15, C.walnut);
  });
}

function vending(): HTMLCanvasElement {
  return sprite("snack-cabinet", 24, 44, (g) => {
    // The camp store cabinet: jars of trail mix behind glass, an honesty box.
    const body = "#3f6b4a";
    g.rect(1, 1, 22, 42, body);
    g.rect(1, 1, 22, 4, "#e6dabd");
    g.rect(1, 1, 22, 1, C.cream);
    // Carved sign: a little pine and a tent
    g.set(5, 2, "#2c5530").rect(4, 3, 3, 1, "#2c5530");
    g.set(10, 2, "#b5653a").rect(9, 3, 3, 1, "#b5653a").set(14, 2, "#2c5530").rect(13, 3, 3, 1, "#2c5530").set(18, 2, "#2c5530").rect(17, 3, 3, 1, "#2c5530");
    g.rect(3, 5, 13, 28, "#1c2420");
    const jars = ["#c48a52", "#e8c872", "#9a5a3a", "#f1e7cf", "#b8433a", "#7a9a5a"];
    for (let r = 0; r < 4; r++) {
      g.rect(3, 11 + r * 7, 13, 1, C.logLo);
      for (let c = 0; c < 3; c++) {
        const jc = jars[(r * 3 + c) % jars.length]!;
        g.rect(4 + c * 4, 7 + r * 7, 3, 4, jc).rect(4 + c * 4, 6 + r * 7, 3, 1, C.brass);
        g.set(4 + c * 4, 8 + r * 7, shade(jc, 0.3));
      }
    }
    // Honesty box with a coin slot
    g.rect(17, 6, 5, 10, C.log).rect(17, 6, 5, 1, C.logHi).rect(18, 8, 3, 1, OUTLINE);
    g.set(19, 11, "#e8c872").set(19, 13, "#e8c872");
    g.rect(17, 18, 5, 2, C.brass);
    g.rect(3, 35, 18, 5, "#2c4c36").rect(4, 36, 16, 1, "#4a7a5a");
    g.rect(1, 42, 22, 1, "#2c4c36");
  });
}

function island(w: number): HTMLCanvasElement {
  return sprite(`island-${w}`, w + 2, 26, (g) => {
    g.rect(1, 13, w, 10, C.walnut);
    g.rect(1, 13, w, 1, C.walnutHi);
    gingham(g, 4, 15, w - 6, 7);
    boards(g, 1, 1, w, 12, { hi: C.logHi, base: C.log, lo: C.logLo, gap: C.ring }, 4, 77);
    g.rect(1, 1, w, 1, C.logHi);
    // Cast-iron pan, a bread board, a bowl of apples, a utensil jar and a lantern.
    g.ellipse(9, 6, 4.5, 2.5, C.iron);
    g.ellipse(9, 5.5, 3, 1.4, "#2a2826");
    g.rect(14, 5, 5, 1, C.iron);
    g.rect(21, 3, 8, 6, C.logLo).rect(22, 4, 6, 3, "#d9a066").rect(23, 4, 4, 1, "#e8c08a");
    g.rect(31, 3, 3, 5, "#cfe0d8").set(31, 2, C.ironHi).set(33, 1, C.logDk).set(32, 1, C.ironHi);
    const bx = w - 20;
    g.ellipse(bx, 6, 4.5, 2.4, "#e8eef0");
    g.rect(bx - 4, 6, 9, 1, C.blueEnamel);
    g.set(bx - 2, 5, "#c4383f").set(bx, 4, "#d9a531").set(bx + 2, 5, "#86c97f").set(bx - 1, 6, "#c4383f").set(bx + 1, 6, "#c4383f");
    lanternAt(g, w - 10, 1);
  });
}

function stool(): HTMLCanvasElement {
  return sprite("stump-stool", 12, 10, (g) => {
    g.rect(2, 3, 8, 5, C.barkMid);
    g.rect(2, 3, 2, 5, C.barkHi).rect(8, 3, 2, 5, C.bark);
    g.set(5, 5, C.barkDk).set(6, 6, C.barkDk);
    g.rect(1, 7, 10, 1, C.bark);
    logEnd(g, 5.5, 2.5, 4.5, 2);
  });
}

function cooler(): HTMLCanvasElement {
  return sprite("water-jug", 17, 36, (g) => {
    // An insulated water jug on a stump, enamel cups hung on a peg.
    g.rect(3, 18, 11, 15, C.barkMid);
    g.rect(3, 18, 3, 15, C.barkHi).rect(12, 18, 2, 15, C.bark);
    for (const x of [7, 9, 11]) g.rect(x, 20, 1, 12, C.barkDk);
    g.rect(2, 32, 13, 1, C.bark);
    logEnd(g, 8, 17.5, 6, 1.6);
    g.rrect(3, 3, 11, 14, "#d9643a", 2);
    g.rect(4, 4, 2, 11, "#ef8a5a");
    g.rect(12, 5, 1, 10, "#b04a2a");
    g.rect(3, 9, 11, 2, C.cream);
    g.rrect(4, 1, 9, 3, "#efe8dc", 1);
    g.rect(6, 0, 5, 1, "#c9c2b4");
    g.rect(7, 13, 3, 2, "#c9c2b4").set(8, 15, "#9aa3ad");
    mugAt(g, 12, 22, C.cream, C.blueEnamel);
  });
}

function printer(): HTMLCanvasElement {
  return sprite("typewriter", 30, 26, (g) => {
    // A typewriter on a wooden crate.
    g.rect(2, 13, 26, 11, C.log);
    g.rect(2, 13, 26, 1, C.logHi);
    for (const y of [17, 21]) g.rect(2, y, 26, 1, C.logLo);
    g.rect(2, 13, 2, 11, C.logLo).rect(26, 13, 2, 11, C.logLo);
    g.rect(10, 18, 10, 2, C.logDk);
    const body = "#2f4a3a";
    g.rrect(4, 5, 22, 9, body, 1);
    g.rect(5, 5, 20, 1, "#4a6a54");
    for (let y = 8; y < 12; y += 2) for (let x = 6 + (y % 4 ? 1 : 0); x < 24; x += 2) g.set(x, y, C.cream);
    g.rect(5, 2, 20, 3, OUTLINE).rect(6, 3, 18, 1, "#4a4a4a");
    g.rect(3, 2, 2, 3, C.ironHi).rect(25, 2, 2, 3, C.ironHi);
    g.rect(8, 0, 14, 2, "#fbfaf2");
    g.set(24, 11, "#e8c872");
  });
}

// ------------------------------------------------------------------ the big tent (meeting)

function meetingTable(): HTMLCanvasElement {
  return sprite("meeting-table", 68, 30, (g) => {
    boards(g, 1, 1, 66, 19, { hi: C.logHi, base: C.log, lo: C.logLo, gap: C.logDk }, 7, 13);
    g.rect(1, 1, 66, 1, C.logHi);
    g.rect(1, 20, 66, 2, C.logLo);
    g.rect(1, 22, 66, 1, C.logDk);
    for (const x of [5, 59]) {
      g.line(x, 23, x + 4, 28, C.logLo).line(x + 4, 23, x, 28, C.logDk);
      g.rect(x - 1, 28, 7, 1, C.logDk);
    }
    lanternAt(g, 3, 1);
    mugAt(g, 60, 6);
    g.rect(52, 14, 3, 3, C.walnut).set(53, 14, C.walnutHi).set(52, 16, C.walnutLo);
  });
}

function whiteboard(w: number): HTMLCanvasElement {
  return sprite(`board-${w}`, w + 2, 46, (g) => {
    // A paper planning board on a pole easel.
    g.rect(1, 1, w, 34, C.logLo);
    barkFill(g, 1, 1, 2, 34, 81);
    barkFill(g, w - 1, 1, 2, 34, 82);
    hlog(g, 1, 1, w, 2, 83, false);
    g.rect(3, 3, w - 4, 30, "#fbfaf2");
    g.rect(1, 35, w, 2, C.barkMid);
    g.rect(1, 35, w, 1, C.barkHi);
    g.rect(8, 34, 6, 1, "#c4383f").rect(16, 34, 6, 1, "#2f5a7a").rect(24, 34, 6, 1, "#3f6b3a");
    g.line(4, 37, 2, 44, C.barkMid).line(5, 37, 3, 44, C.barkHi);
    g.line(w - 3, 37, w - 1, 44, C.barkMid).line(w - 4, 37, w - 2, 44, C.bark);
    // Rope lashings at the top corners
    g.set(2, 2, C.canvasHi).set(3, 3, C.canvasHi).set(w - 1, 2, C.canvasHi).set(w - 2, 3, C.canvasHi);
  });
}

function planRolls(): HTMLCanvasElement {
  return sprite("trail-maps", 18, 28, (g) => {
    const rolls: [number, number, string][] = [
      [3, 1, "#e8d8b0"],
      [8, 4, "#c9a46a"],
      [12, 2, "#9ab88a"],
      [6, 7, "#f1e7cf"],
    ];
    for (const [x, y, c] of rolls) {
      g.rect(x, y, 3, 16, c);
      g.rect(x, y, 3, 1, shade(c, 0.2));
      g.set(x + 1, y, shade(c, -0.3));
      g.set(x + 1, y + 6, "#b8433a");
    }
    g.rect(2, 15, 14, 12, "#b08a52");
    for (let y = 16; y < 27; y += 2) for (let x = 2 + (y % 4 ? 0 : 1); x < 16; x += 2) g.set(x, y, "#8a6a3a");
    g.rect(2, 15, 14, 1, "#c8a46a");
  });
}

function glassFront(p: PropPlacement, L: Layout): HTMLCanvasElement {
  const room = L.rooms.find((r) => r.walls && r.rect.x === p.x && r.rect.w === p.w && r.rect.y + r.rect.h - 10 === p.y);
  const w = p.w ?? 100;
  const gapX = room?.doorSide === "bottom" && room.doorX !== undefined ? room.doorX - room.rect.x : -1;
  const kind = room?.walls === "wood" ? "cabin" : room?.kind === "server" ? "hut" : "tent";
  return cached(`redwoods|front|${kind}|${w}|${gapX}`, () => {
    const g = new Grid(w, 11);
    const inGap = (x: number) => gapX >= 0 && x >= gapX - 9 && x < gapX + 9;
    for (let x = 0; x < w; x++) {
      if (inGap(x)) continue;
      if (kind === "tent") {
        // Canvas skirt with a mesh window band above it.
        g.set(x, 0, C.logDk).set(x, 1, C.canvasHi);
        for (let y = 2; y < 6; y++) g.set(x, y, (x + y) % 2 ? "#4a4a3a66" : "#e6dabd55");
        g.set(x, 6, C.canvasDk).set(x, 7, C.canvas).set(x, 8, C.canvas).set(x, 9, C.canvasLo).set(x, 10, "#7a6a4a");
      } else if (kind === "hut") {
        g.set(x, 0, "#4a5646").set(x, 1, "#879680");
        for (let y = 2; y < 6; y++) g.set(x, y, (x + y) % 2 ? "#3a404066" : "#cfe0d855");
        const rib = x % 3 === 0 ? "#5a6a56" : "#7a8a74";
        for (let y = 6; y < 10; y++) g.set(x, y, rib);
        g.set(x, 10, "#3a4436");
      } else {
        // Porch railing: top rail, balusters, bottom log.
        g.set(x, 0, C.logDk).set(x, 1, C.logHi).set(x, 2, C.logLo);
        for (let y = 3; y < 7; y++) g.set(x, y, x % 5 === 2 ? C.log : "#e9dcc644");
        g.set(x, 7, C.barkHi).set(x, 8, C.barkMid).set(x, 9, C.bark).set(x, 10, C.barkDk);
      }
    }
    // Posts
    for (let x = 0; x < w; x += kind === "cabin" ? 20 : 30) {
      for (const px of [x, Math.min(w - 2, x + 1)]) {
        if (inGap(px)) continue;
        for (let y = 0; y < 10; y++) g.set(px, y, px === x ? (kind === "hut" ? "#4a5646" : C.logLo) : kind === "hut" ? "#6c7a66" : C.log);
      }
    }
    // Door posts either side of the gap.
    if (gapX >= 0) {
      for (const px of [gapX - 10, gapX + 9]) if (px >= 0 && px < w) for (let y = 0; y < 11; y++) g.set(px, y, kind === "hut" ? "#4a5646" : C.logLo);
    }
    return g.toCanvas();
  });
}

// ------------------------------------------------------------------ the porch (waiting)

function porchSettee(w: number): HTMLCanvasElement {
  return sprite(`settee-${w}`, w + 2, 22, (g) => {
    g.rrect(3, 1, w - 4, 11, C.logLo, 1);
    g.rect(3, 1, w - 4, 2, C.logHi);
    for (let x = 6; x < w - 2; x += 4) g.rect(x, 3, 2, 8, C.log);
    g.rect(1, 6, 5, 12, C.log).rect(w - 4, 6, 5, 12, C.log);
    g.rect(1, 6, 5, 1, C.logHi).rect(w - 4, 6, 5, 1, C.logHi);
    const half = Math.floor((w - 10) / 2);
    for (const x of [6, 6 + half + 1]) {
      g.rect(x, 10, half - 1, 7, "#c4552d");
      g.rect(x, 10, half - 1, 2, "#dc7448");
      g.rect(x, 16, half - 1, 1, "#9a3a20");
    }
    // A plaid pillow on one side, a knit one on the other.
    plaidFill(g, 7, 6, 6, 5, C.plaid, C.plaidDk, C.plaidBk, 2);
    g.rect(w - 12, 6, 6, 5, C.wool).rect(w - 11, 7, 4, 1, C.cream);
    g.rect(1, 17, w, 2, C.logLo);
    g.rect(3, 19, 2, 2, C.logDk).rect(w - 3, 19, 2, 2, C.logDk);
  });
}

function porchSetteeBack(w: number): HTMLCanvasElement {
  return sprite(`settee-back-${w}`, w + 2, 16, (g) => {
    g.rect(1, 1, w, 10, C.logLo);
    g.rect(1, 1, w, 2, C.logHi);
    for (let x = 4; x < w - 1; x += 4) g.rect(x, 3, 2, 8, C.log);
    g.rect(1, 11, w, 2, C.logDk);
    g.rect(2, 13, 2, 2, C.walnutDk).rect(w - 2, 13, 2, 2, C.walnutDk);
  });
}

function adirondack(left: boolean): HTMLCanvasElement {
  return cached(`redwoods|adirondack|${left}`, () => {
    const g = new Grid(18, 20);
    const paint = "#3f6b4a";
    const hi = "#5a8a5e";
    const lo = "#2c4c36";
    // Slanted slatted back
    for (let j = 0; j < 15; j++) {
      const x = 1 + Math.floor(j / 4);
      g.rect(x, 1 + j, 3, 1, j % 3 === 0 ? hi : paint);
    }
    // Seat sloping down to the back, a cushion on it
    g.line(5, 12, 15, 10, paint).line(5, 13, 15, 11, lo);
    g.rect(6, 10, 8, 1, C.cream).rect(7, 9, 6, 1, C.wool);
    // Wide flat arm and the front leg
    g.rect(5, 7, 12, 2, hi).rect(5, 8, 12, 1, paint);
    g.rect(13, 9, 2, 9, paint).rect(13, 9, 1, 9, hi);
    g.rect(3, 14, 2, 4, lo);
    g.rect(2, 17, 14, 1, lo);
    g.outline(OUTLINE);
    return (left ? g.flipped() : g).toCanvas();
  });
}

function logTable(): HTMLCanvasElement {
  return sprite("log-table", 28, 12, (g) => {
    g.rect(11, 7, 6, 4, C.barkMid).rect(11, 7, 2, 4, C.barkHi);
    g.ellipse(13.5, 4.5, 12.5, 4, C.barkMid);
    g.ellipse(13.5, 4, 11.5, 3, C.log);
    g.ellipse(13.5, 4, 8, 2, C.ring);
    g.ellipse(13.5, 4, 5, 1.2, C.logHi);
    g.set(13, 4, C.logLo);
    mugAt(g, 5, 2);
    g.rect(10, 4, 5, 2, "#e8d8b0").set(11, 4, "#b8433a");
    lanternAt(g, 19, -1);
  });
}

function reception(): HTMLCanvasElement {
  return sprite("checkin", 36, 22, (g) => {
    // The check-in counter: half-log front, slab top, a bell and the guest book.
    for (let x = 1; x < 35; x += 4) {
      g.rect(x, 12, 4, 9, C.barkMid);
      g.rect(x, 12, 1, 9, C.barkHi);
      g.rect(x + 3, 12, 1, 9, C.barkDk);
    }
    g.rect(1, 6, 34, 6, C.log);
    g.rect(1, 6, 34, 1, C.logHi);
    g.rect(1, 11, 34, 1, C.logLo);
    g.rect(13, 14, 10, 5, "#3f6b3a").rect(13, 14, 10, 1, "#5a8a4a");
    g.set(18, 15, C.cream).rect(17, 16, 3, 1, C.cream).rect(16, 17, 5, 1, C.cream);
    // Bell
    g.ellipse(7, 4, 3.5, 2.5, C.brass);
    g.rect(4, 5, 7, 1, "#a8822a");
    g.set(7, 1, C.brass).set(6, 3, C.brassHi);
    // Guest book and pen
    g.rect(15, 2, 10, 5, C.cream).set(20, 2, C.canvasDk).set(20, 3, C.canvasDk).set(20, 4, C.canvasDk).set(20, 5, C.canvasDk);
    g.rect(16, 3, 3, 1, "#9a8a6a").rect(21, 3, 3, 1, "#9a8a6a").rect(16, 5, 2, 1, "#9a8a6a");
    g.line(23, 6, 26, 3, "#2f5a7a");
    lanternAt(g, 28, -1);
  });
}

// ------------------------------------------------------------------ your cabin (boss)

function bossDesk(w: number): HTMLCanvasElement {
  return sprite(`boss-desk-${w}`, w + 2, 30, (g) => {
    // A live-edge slab on a log base.
    g.rect(1, 13, w, 12, C.walnutLo);
    g.rect(1, 13, w, 1, C.walnut);
    for (let x = 4; x < w; x += 7) g.rect(x, 14, 1, 10, C.walnutDk);
    g.rect(w / 2 - 7, 16, 14, 6, C.walnut).rect(w / 2 - 7, 16, 14, 1, C.walnutHi);
    g.rect(w / 2 - 2, 18, 4, 1, C.brass);
    g.rect(1, 1, w, 12, C.walnut);
    for (let y = 2; y < 12; y += 3) for (let x = 2 + (y % 2); x < w; x += 9) g.rect(x, y, 5, 1, C.walnutHi);
    g.rect(1, 1, w, 1, C.walnutHi);
    // The live edge: a wavy strip of bark along the front.
    for (let x = 1; x <= w; x++) {
      g.set(x, 12, x % 7 < 3 ? C.barkMid : C.bark);
      if (x % 9 < 3) g.set(x, 11, C.barkHi);
    }
    g.rect(2, 25, 3, 3, C.barkMid).rect(w - 3, 25, 3, 3, C.barkMid);
    // Laptop seen from behind with a pine sticker, papers, nameplate, mug, a pinecone.
    g.rect(8, 1, 14, 9, "#7a8478").rect(9, 2, 12, 7, "#96a092");
    g.set(14, 4, C.fernDk).rect(13, 5, 3, 1, C.fernDk).rect(12, 6, 5, 1, C.fernDk).set(14, 7, C.walnutLo);
    g.rect(26, 4, 9, 7, "#f4ecd6").rect(28, 3, 9, 7, "#fbf6e8").rect(29, 5, 6, 1, "#b9a98a").rect(29, 7, 5, 1, "#b9a98a");
    g.rect(w - 22, 8, 12, 3, C.log).rect(w - 21, 9, 10, 1, C.brass);
    mugAt(g, w - 8, 4, C.cream, "#3f6b3a");
    g.rect(w - 13, 3, 3, 3, C.walnutDk).set(w - 12, 3, C.walnutHi);
  });
}

function bossChair(): HTMLCanvasElement {
  return sprite("boss-chair", 22, 26, (g) => {
    // A high-backed leather chair with a sheepskin thrown over it.
    g.rect(2, 1, 2, 22, C.logLo).rect(18, 1, 2, 22, C.logLo);
    g.rect(2, 1, 1, 22, C.logHi).rect(18, 1, 1, 22, C.logHi);
    g.rrect(4, 1, 14, 17, "#8a4a2a", 2);
    g.rect(5, 2, 12, 1, "#a8603a");
    for (const [x, y] of [
      [7, 6],
      [11, 6],
      [15, 6],
      [9, 10],
      [13, 10],
    ] as const) g.set(x, y, "#5e2e18");
    g.rrect(5, 0, 12, 6, C.wool, 2).rect(6, 1, 9, 1, C.cream).set(8, 4, C.canvasLo).set(13, 3, C.canvasLo);
    g.rect(1, 12, 3, 8, C.log).rect(18, 12, 3, 8, C.log);
    g.rect(10, 19, 2, 4, C.logDk).rect(5, 23, 12, 1, C.logDk);
  });
}

function guestChair(): HTMLCanvasElement {
  return sprite("guest-chair", 16, 32, (g) => campChair(g, 0, 15, false, "#8a5a3a", "#a8744c"));
}

function dogBed(): HTMLCanvasElement {
  return sprite("dog-bed", 26, 14, (g) => {
    g.ellipse(12.5, 7, 11.5, 5.5, C.plaidDk);
    for (let x = 1; x < 25; x++) for (let y = 1; y < 13; y++) if (g.get(x, y) && (Math.floor(x / 2) + Math.floor(y / 2)) % 2) g.set(x, y, x % 4 < 2 ? C.plaidBk : C.plaid);
    g.ellipse(12.5, 7.5, 8.5, 3.5, C.wool);
    g.ellipse(12, 7, 5, 2, C.cream);
    g.set(10, 6, "#ffffff").set(15, 8, "#ffffff");
  });
}

function bookCrates(): HTMLCanvasElement {
  return sprite("book-crates", 32, 32, (g) => {
    // Two apple crates stacked as a shelf, full of books (the globe sits on top).
    for (const y of [6, 15]) {
      g.rect(1, y, 30, 9, C.log);
      g.rect(1, y, 30, 1, C.logHi);
      g.rect(3, y + 1, 26, 7, "#5a3a22");
      g.rect(1, y + 8, 30, 1, C.logLo);
      g.rect(15, y + 1, 2, 7, C.log);
    }
    books(g, 3, 15, 14, 3);
    books(g, 17, 29, 14, 4);
    books(g, 3, 15, 23, 5);
    g.rect(18, 19, 4, 4, "#d9c49a").rect(23, 20, 5, 3, C.walnut).set(24, 20, C.walnutHi);
    g.rect(1, 24, 30, 1, C.logDk);
    g.rect(3, 3, 3, 3, C.walnut).set(4, 2, C.walnutHi).set(3, 5, C.walnutLo);
  });
}

function lampPost(): HTMLCanvasElement {
  return sprite("lantern-post", 16, 52, (g) => {
    g.rect(7, 13, 2, 34, C.barkMid).rect(7, 13, 1, 34, C.barkHi);
    g.set(7, 22, C.barkDk).set(8, 30, C.barkDk).set(7, 38, C.barkDk);
    g.ellipse(8, 48, 6, 2.5, C.stone);
    g.ellipse(7, 47.5, 3.5, 1.2, C.stoneHi);
    g.set(3, 48, C.mossHi).set(12, 49, C.moss);
    // The lantern
    g.set(7, 0, C.iron).set(8, 0, C.iron);
    g.rect(6, 1, 4, 1, C.iron);
    g.rect(4, 2, 8, 2, C.iron).rect(4, 2, 8, 1, C.ironHi);
    g.rect(4, 4, 8, 8, C.iron);
    g.rect(5, 4, 6, 7, C.glass);
    g.rect(7, 7, 2, 4, C.cream).set(7, 6, C.flameHi).set(8, 5, C.flame);
    g.rect(4, 11, 8, 2, C.iron);
    g.set(5, 4, "#fff8e0");
  });
}

// ------------------------------------------------------------------ the lawn (games)

function pingPong(): HTMLCanvasElement {
  return sprite("pingpong", 76, 26, (g) => {
    const w = 74;
    g.rect(1, 1, w, 13, "#3f7a4a");
    for (let y = 3; y < 13; y += 3) g.rect(1, y, w, 1, "#468252");
    g.rect(1, 1, w, 1, "#f4f0e0").rect(1, 13, w, 1, "#f4f0e0");
    g.vline(1, 1, 13, "#f4f0e0").vline(w, 1, 13, "#f4f0e0");
    g.hline(2, 7, w - 2, "#cfe0c8");
    g.rect(1, 14, w, 3, C.logLo);
    g.rect(1, 14, w, 1, C.log);
    const nx = 1 + Math.floor(w / 2);
    g.rect(nx, 0, 1, 15, "#e6dabd");
    for (let y = 1; y < 14; y += 2) g.set(nx, y, "#9a8a6a");
    g.rect(nx - 1, 0, 3, 1, C.logDk);
    for (const x of [4, w - 5]) g.rect(x, 17, 2, 7, C.barkMid).set(x, 17, C.barkHi);
    for (const x of [nx - 6, nx + 5]) g.rect(x, 17, 2, 5, C.bark);
  });
}

function arcade(): HTMLCanvasElement {
  return sprite("arcade", 26, 48, (g) => {
    const w = 24;
    g.rect(2, 1, w - 2, 46, C.log);
    for (let x = 4; x < w; x += 4) g.rect(x, 25, 1, 21, C.logLo);
    g.rect(w - 1, 1, 1, 46, C.logLo);
    // Marquee: a painted sign of mountains and pines
    g.rect(1, 1, w, 8, C.walnutLo);
    g.rect(3, 2, w - 4, 6, "#f0e2bc");
    for (let i = 0; i < 9; i++) g.rect(4 + i, 6 - Math.floor(i / 2), 1, Math.floor(i / 2) + 1, "#7a8a9a");
    for (let i = 0; i < 7; i++) g.rect(12 + i, 4 + Math.floor(Math.abs(i - 3) / 2), 1, 3 - Math.floor(Math.abs(i - 3) / 2), "#8a9aaa");
    g.set(19, 3, "#2c5530").rect(18, 4, 3, 1, "#2c5530").rect(17, 5, 5, 1, "#2c5530").set(19, 6, C.walnut);
    g.set(5, 3, "#e8a03a");
    // Screen bezel (the game shows through)
    g.rect(2, 9, w - 2, 16, C.walnutDk);
    g.rect(3, 10, w - 4, 14, "#141a16");
    // Control panel with brass buttons
    g.rect(1, 25, w, 6, C.walnut);
    g.rect(1, 25, w, 1, C.walnutHi);
    g.set(6, 27, "#c4383f").set(9, 28, "#3f8a5a").set(12, 27, C.brassHi);
    g.rect(16, 26, 1, 3, OUTLINE).set(16, 25, "#c4383f");
    g.rect(2, 31, w - 2, 1, C.logLo);
    // Coin door
    g.rect(8, 35, 8, 5, C.walnutLo).rect(9, 36, 2, 2, C.brass).rect(13, 36, 2, 2, C.brass);
    g.rect(2, 44, w - 2, 3, C.walnutDk);
  });
}

function dartboard(): HTMLCanvasElement {
  return sprite("log-target", 20, 34, (g) => {
    g.line(9, 17, 3, 32, C.barkMid).line(10, 17, 16, 32, C.barkMid).line(9, 17, 9, 32, C.bark);
    g.ellipse(9.5, 9.5, 8.5, 8.5, C.barkMid);
    g.ellipse(9.5, 9.5, 7.2, 7.2, C.log);
    g.ellipse(9.5, 9.5, 6, 6, "#b8433a");
    g.ellipse(9.5, 9.5, 4.6, 4.6, C.logHi);
    g.ellipse(9.5, 9.5, 3.2, 3.2, "#b8433a");
    g.ellipse(9.5, 9.5, 1.6, 1.6, C.logHi);
    g.set(9, 9, OUTLINE).set(10, 10, OUTLINE);
    g.set(4, 6, C.ring).set(14, 13, C.ring);
  });
}

function cornhole(): HTMLCanvasElement {
  return sprite("cornhole", 16, 22, (g) => {
    g.rect(1, 1, 14, 20, C.log);
    g.rect(1, 1, 14, 1, C.logHi);
    for (let y = 5; y < 21; y += 5) g.rect(1, y, 14, 1, C.logLo);
    g.ellipse(7.5, 6, 2.5, 2.5, "#1a1612");
    for (let j = 0; j < 7; j++) g.rect(7 - Math.floor(j / 2), 11 + j, 1 + Math.floor(j / 2) * 2, 1, j % 2 ? "#2c5530" : "#3f7a4a");
    g.set(7, 18, C.walnut);
  });
}

function armchair(): HTMLCanvasElement {
  return sprite("armchair", 28, 26, (g) => {
    g.rect(3, 1, 2, 22, C.logLo).rect(23, 1, 2, 22, C.logLo);
    g.rrect(5, 1, 18, 15, C.plaid, 2);
    plaidFill(g, 6, 2, 16, 13, C.plaid, C.plaidDk, C.plaidBk, 2);
    g.rrect(1, 9, 6, 13, C.log, 2);
    g.rrect(21, 9, 6, 13, C.log, 2);
    g.rect(2, 10, 4, 1, C.logHi).rect(22, 10, 4, 1, C.logHi);
    g.rect(6, 15, 16, 6, C.wool);
    g.rect(6, 15, 16, 1, C.cream).rect(6, 20, 16, 1, C.canvasLo);
    g.rect(4, 22, 2, 2, C.logDk).rect(22, 22, 2, 2, C.logDk);
  });
}

function bench(): HTMLCanvasElement {
  return sprite("log-bench", 36, 16, (g) => {
    hlog(g, 2, 1, 32, 5, 91, true);
    g.rect(4, 6, 2, 3, C.logDk).rect(30, 6, 2, 3, C.logDk);
    g.rect(1, 8, 34, 3, C.log);
    g.rect(1, 8, 34, 1, C.logHi);
    g.rect(1, 10, 34, 1, C.logLo);
    g.rect(3, 11, 3, 4, C.barkMid).rect(30, 11, 3, 4, C.barkMid);
  });
}

function sideTable(): HTMLCanvasElement {
  return sprite("stump-side", 18, 14, (g) => {
    g.rect(4, 5, 10, 7, C.barkMid);
    g.rect(4, 5, 3, 7, C.barkHi).rect(11, 5, 3, 7, C.bark);
    g.ellipse(8.5, 3.5, 7.5, 2.6, C.log);
    g.ellipse(8.5, 3.5, 4.5, 1.4, C.ring);
    g.rect(3, 2, 6, 3, "#3f6b3a").rect(4, 2, 4, 1, "#5a8a4a");
    mugAt(g, 11, 1);
  });
}

function bookshelf(): HTMLCanvasElement {
  return sprite("bookshelf", 38, 36, (g) => {
    for (const y of [6, 20]) {
      g.rect(1, y, 36, 13, C.log);
      g.rect(1, y, 36, 1, C.logHi);
      g.rect(3, y + 2, 32, 10, "#5a3a22");
      g.rect(1, y + 12, 36, 1, C.logLo);
    }
    books(g, 4, 33, 18, 7);
    books(g, 4, 31, 32, 8);
    lanternAt(g, 26, -1);
    fern(g, 8, 6, 5, 0.9, 5);
  });
}

// ------------------------------------------------------------------ the solar hut (servers)

function batteryRack(): HTMLCanvasElement {
  return sprite("battery", 16, 33, (g) => {
    g.rect(1, 1, 14, 30, "#3b4a3e");
    g.rect(1, 1, 14, 1, "#5a6a5c");
    for (let y = 3; y < 29; y += 4) {
      g.rect(3, y, 10, 3, "#4a5a4c");
      g.rect(3, y, 10, 1, "#5e6e60");
      g.rect(4, y + 1, 4, 1, "#d9a531");
      g.rect(9, y + 1, 4, 1, "#1a2420");
    }
    g.rect(1, 31, 14, 1, "#1e2620");
  });
}

function inverter(): HTMLCanvasElement {
  return sprite("inverter", 20, 33, (g) => {
    g.rect(1, 1, 18, 30, "#2e3a33");
    g.rect(1, 1, 18, 6, "#5a3a5a");
    for (let y = 8; y < 29; y += 6) {
      g.rect(3, y, 14, 4, "#3a4a40");
      g.ellipse(6.5, y + 1.5, 1.5, 1.5, "#141a16");
      g.ellipse(12.5, y + 1.5, 1.5, 1.5, "#141a16");
    }
    g.rect(1, 31, 18, 1, "#1e2620");
    g.rect(0, 12, 1, 6, C.brass);
  });
}

function bucket(): HTMLCanvasElement {
  return sprite("bucket", 16, 16, (g) => {
    g.rect(4, 4, 8, 10, C.log);
    for (let x = 5; x < 12; x += 2) g.rect(x, 4, 1, 10, C.logLo);
    g.rect(4, 4, 1, 10, C.logHi);
    g.rect(3, 6, 10, 1, C.iron).rect(3, 11, 10, 1, C.iron);
    g.ellipse(7.5, 3.5, 4.5, 1.6, C.logLo);
    g.ellipse(7.5, 3.5, 3.4, 0.8, "#3a2a1a");
    g.set(6, 3, "#fbfaf2").set(8, 3, "#e6dabd");
  });
}

function planter(w: number): HTMLCanvasElement {
  return cached(`redwoods|planter|${w}`, () => {
    // A mossy fallen log with ferns and glowing mushrooms growing on it.
    const g = new Grid(w, 20);
    hlog(g, 1, 11, w - 2, 8, w, true);
    for (let x = 3; x < w - 3; x++) {
      if ((x * 7) % 5 < 3) g.set(x, 11, C.mossHi);
      if ((x * 3) % 7 < 2) g.set(x, 12, C.moss);
    }
    for (let x = 6; x < w - 6; x += 11) fern(g, x + ((x * 7) % 4), 11, 8 + ((x * 3) % 4), 0.95, x);
    // Pale mushrooms (they glow at night) where the light goes.
    for (let k = 0, x = 10; x < w - 6; k++, x += 34) {
      const mx = x + ((k * 5) % 9);
      g.rect(mx - 1, 10, 3, 1, "#cfeee0").set(mx, 9, "#e8fff4").set(mx, 11, C.cream);
      g.set(mx + 3, 11, "#cfeee0").set(mx + 3, 12, C.cream);
    }
    g.outline(OUTLINE);
    return g.toCanvas();
  });
}

/** A wooden speaker box with woven grilles (the classic 12×28). */
export function speaker(): HTMLCanvasElement {
  return sprite("speaker", 12, 28, (g) => {
    g.rrect(1, 1, 10, 26, C.walnut, 1);
    g.rect(2, 1, 8, 1, C.walnutHi);
    g.rect(2, 3, 8, 22, "#c9b48a");
    for (let y = 4; y < 24; y += 2) for (let x = 2 + ((y / 2) % 2); x < 10; x += 2) g.set(x, y, "#b09a70");
    g.ellipse(5.5, 7, 2.6, 2.6, C.walnutLo);
    g.ellipse(5.5, 7, 1.2, 1.2, "#8a6a4a");
    g.ellipse(5.5, 17, 3, 3, C.walnutLo);
    g.ellipse(5.5, 17, 1.4, 1.4, "#8a6a4a");
    g.rect(2, 25, 8, 1, C.walnutDk);
  });
}

// ------------------------------------------------------------------ the prop hook

export function prop(p: PropPlacement, L: Layout, classic: () => HTMLCanvasElement): HTMLCanvasElement | null {
  switch (p.kind) {
    case "couch":
      return couch();
    case "coffee-table":
      return fireRing();
    case "piano":
      return piano();
    case "fishtank-stand":
      return fishtankStand();
    case "tv":
      return tvFrame(p.w ?? 120, L.tv.h, p.z > 0);
    case "beanbag-blue":
      return beanbagMoss();
    case "beanbag-pink":
      return beanbagNest();
    case "kitchen-counter":
      return kitchenCounter(p.w ?? 100);
    case "espresso":
      return espresso();
    case "fridge":
      return fridge();
    case "vending":
      return vending();
    case "kitchen-island":
      return island(p.w ?? 72);
    case "stool":
      return stool();
    case "cooler":
      return cooler();
    case "printer":
      return printer();
    case "meeting-table":
      return meetingTable();
    case "meeting-chair-front":
      return sprite("tent-chair-front", 16, 32, (g) => campChair(g, 0, 9, true, "#6f7a48", "#8a9660"));
    case "meeting-chair-back":
      return sprite("tent-chair-back", 16, 32, (g) => campChair(g, 0, 15, false, "#6f7a48", "#8a9660"));
    case "guest-chair":
      return guestChair();
    case "whiteboard":
      return whiteboard(p.w ?? 80);
    case "plan-rolls":
      return planRolls();
    case "glass-front":
      return glassFront(p, L);
    case "waiting-sofa":
      return porchSettee(p.w ?? 42);
    case "waiting-sofa-back":
      return porchSetteeBack(p.w ?? 42);
    case "waiting-armchair":
      return adirondack(false);
    case "waiting-armchair-left":
      return adirondack(true);
    case "waiting-chair":
      return sprite("porch-chair", 16, 16, (g) => {
        g.rect(2, 0, 2, 13, C.log).rect(12, 0, 2, 13, C.log);
        g.rect(4, 1, 8, 5, "#3f6b4a").rect(4, 1, 8, 1, "#5a8a5e");
        g.rect(3, 7, 10, 5, "#c4552d").rect(3, 7, 10, 1, "#dc7448");
        g.rect(2, 12, 12, 1, C.logLo);
        g.rect(2, 13, 2, 2, C.logDk).rect(12, 13, 2, 2, C.logDk);
      });
    case "lounge-table":
      return logTable();
    case "reception":
      return reception();
    case "boss-desk":
      return bossDesk(p.w ?? 60);
    case "boss-chair":
      return bossChair();
    case "dog-bed":
      return dogBed();
    case "library-shelf":
      return bookCrates();
    case "library-table":
      return sprite("round-table", 32, 32, (g) => {
        g.rect(13, 18, 6, 11, C.barkMid).rect(13, 18, 2, 11, C.barkHi);
        g.rect(10, 28, 12, 2, C.bark);
        g.ellipse(15.5, 13, 13.5, 6.5, C.barkMid);
        g.ellipse(15.5, 12.5, 12.5, 5.5, C.log);
        g.ellipse(15.5, 12.5, 9, 3.8, C.ring);
        g.ellipse(15.5, 12.5, 5.5, 2.2, C.logHi);
        g.rect(6, 10, 7, 4, "#3f6b3a").rect(7, 10, 5, 1, "#5a8a4a");
        mugAt(g, 21, 10);
      });
    case "lamp":
      return lampPost();
    case "pingpong":
      return pingPong();
    case "arcade":
      return arcade();
    case "dartboard":
      return dartboard();
    case "cornhole":
      return cornhole();
    case "armchair":
      return armchair();
    case "bench":
      return bench();
    case "side-table":
      return sideTable();
    case "bookshelf":
      return bookshelf();
    case "server-rack":
      return batteryRack();
    case "ai-rack":
      return inverter();
    case "bin":
      return bucket();
    case "planter":
      return planter(p.w ?? 48);
    case "sofa-front":
    case "sofa-back":
    case "low-shelf":
      return cached(`redwoods|warm|${p.kind}`, () => adjust(tint(classic(), C.logLo, 0.35), { sat: 0.85 }));
    default:
      return null;
  }
}

// ------------------------------------------------------------------ plants

export function plant(spriteName: string): HTMLCanvasElement | null {
  switch (spriteName) {
    case "PLANT":
      return sprite("plant-fern", 16, 32, (g) => {
        // A sword fern in a wooden bucket.
        g.rect(3, 22, 10, 9, C.log);
        for (let x = 4; x < 13; x += 2) g.rect(x, 22, 1, 9, C.logLo);
        g.rect(3, 22, 1, 9, C.logHi);
        g.rect(2, 24, 12, 1, C.iron).rect(2, 28, 12, 1, C.iron);
        g.rect(3, 21, 10, 1, C.soil);
        fern(g, 7, 21, 16, 1.1, 11);
        fern(g, 8, 21, 12, 0.6, 12);
      });
    case "PLANT_2":
      return sprite("plant-sapling", 16, 32, (g) => {
        // A little fir sapling in a clay pot.
        g.rect(4, 23, 8, 8, "#b5653a");
        g.rect(3, 22, 10, 2, "#c87a4a");
        g.rect(5, 25, 1, 5, "#c87a4a");
        g.rect(7, 19, 2, 4, C.walnut);
        conifer(g, 8, 2, 19, 12, C.fernDk, "#3a6a3a", "#5a8a4a");
      });
    case "LARGE_PLANT":
      return sprite("plant-redwood", 32, 48, (g) => {
        // A young redwood in a half barrel.
        g.rect(5, 36, 22, 11, C.log);
        for (let x = 7; x < 27; x += 3) g.rect(x, 36, 1, 11, C.logLo);
        g.rect(5, 36, 1, 11, C.logHi);
        g.rect(4, 38, 24, 1, C.iron).rect(4, 44, 24, 1, C.iron);
        g.rect(5, 35, 22, 1, C.soil);
        g.rect(15, 28, 3, 8, C.barkMid).set(15, 30, C.barkHi);
        conifer(g, 16, 1, 31, 26, "#24442a", "#30582f", "#4a7a3e");
        g.set(9, 34, C.mossHi).set(22, 34, "#d9a066");
      });
    case "CACTUS":
      return sprite("plant-shrooms", 16, 32, (g) => {
        // A mossy stump sprouting mushrooms.
        g.rect(3, 20, 10, 11, C.barkMid);
        g.rect(3, 20, 3, 11, C.barkHi).rect(10, 20, 3, 11, C.bark);
        g.rect(2, 30, 12, 1, C.bark);
        logEnd(g, 7.5, 19.5, 5, 2);
        g.rect(4, 17, 8, 2, C.mossHi).set(3, 22, C.moss).set(12, 25, C.moss);
        g.rect(5, 11, 1, 7, C.cream).rect(9, 13, 1, 5, C.cream).rect(11, 15, 1, 3, C.cream);
        g.rrect(2, 8, 7, 4, "#c4552d", 1).rect(3, 8, 3, 1, "#e07a4a").set(4, 10, C.cream).set(7, 9, C.cream);
        g.rrect(7, 11, 5, 3, "#d9a066", 1).set(8, 11, "#ecc08a");
        g.rect(10, 14, 3, 2, "#b5653a");
        g.rect(13, 22, 2, 1, "#e0b77e").rect(13, 23, 2, 1, "#b58652");
      });
    case "POT":
      return sprite("plant-pot", 16, 16, (g) => {
        g.rect(4, 9, 8, 6, "#b5653a").rect(3, 8, 10, 2, "#c87a4a");
        g.rect(4, 7, 8, 1, C.mossHi).set(5, 6, C.moss).set(10, 6, C.mossHi);
        g.rect(7, 4, 1, 3, C.cream).rect(6, 3, 3, 1, "#c4552d").set(7, 2, "#e07a4a");
      });
    case "HANGING_PLANT":
      return sprite("plant-hanging", 16, 32, (g) => {
        // A wicker basket on ropes, trailing ivy.
        for (let j = 0; j < 9; j++) g.set(7 + Math.round((j / 9) * -4), j, "#8f7b58").set(8 + Math.round((j / 9) * 4), j, "#8f7b58");
        g.rect(7, 0, 2, 1, C.iron);
        g.rect(2, 9, 12, 5, "#b08a52");
        for (let x = 3; x < 14; x += 2) g.set(x, 10, "#8a6a3a").set(x - 1, 12, "#8a6a3a");
        g.rect(2, 9, 12, 1, "#c8a46a");
        for (const [x, len] of [
          [3, 14],
          [6, 18],
          [9, 11],
          [12, 16],
        ] as const) {
          for (let j = 0; j < len; j++) {
            const vx = x + Math.round(Math.sin(j * 0.6 + x) * 1);
            g.set(vx, 13 + j, j % 3 === 0 ? C.fernHi : C.fern);
            if (j % 3 === 1) g.set(vx + 1, 13 + j, C.fernDk);
          }
        }
        fern(g, 8, 9, 7, 1.2, 4);
      });
    default:
      return null;
  }
}
