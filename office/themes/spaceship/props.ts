// Spaceship: furniture. Molded white shells with an orange livery stripe,
// navy and teal cushions, slate steel, consoles that glow cyan, amber and
// mint. Everything is drawn by hand at the classic sizes so the office's
// live details (screens, steam, the fridge door, the globe, darts, papers)
// land where they always do; the rarely seen pieces are classic sprites
// tinted into the ship's palette.

import type { Theme } from "../../theme.ts";
import type { Layout, PlantPlacement, PropPlacement } from "../../layout.ts";
import { Grid, OUTLINE, adjust, cached, hash, mix, shade, tint } from "../../themekit.ts";
import { P, done, panel } from "./pal.ts";

/** Classic sprites for the pieces the deck rarely shows: cooled down into the ship's palette. */
function shipTint(src: HTMLCanvasElement): HTMLCanvasElement {
  return tint(adjust(src, { sat: 0.55, light: 0.02 }), "#8fa3c4", 0.18);
}

/** A tiny screen: dark glass with a lit line or two. */
function readout(g: Grid, x: number, y: number, w: number, h: number, ink: string): void {
  g.rect(x, y, w, h, P.screen);
  g.hline(x, y, w, P.screenHi);
  for (let j = 1; j < h; j += 2) g.hline(x + 1, y + j, Math.max(1, w - 2 - ((j * 3) % 4)), mix(ink, P.screen, 0.25 + (j % 3) * 0.2));
}

// ------------------------------------------------------------------ the rec room

function couch(): HTMLCanvasElement {
  // The back of a molded crew couch: people sit in it facing the news screen.
  const w = 82;
  const g = new Grid(w + 2, 28);
  // Headrest cushions peek over the shell.
  for (const [x0, x1] of [
    [10, 30],
    [32, 52],
    [54, 74],
  ] as const) {
    g.rrect(x0, 1, x1 - x0, 9, P.cushion, 2);
    g.hline(x0 + 2, 1, x1 - x0 - 4, P.cushionHi);
    g.hline(x0 + 1, 2, 3, P.cushionHi);
    g.hline(x0 + 2, 8, x1 - x0 - 4, P.cushionLo);
  }
  // The shell, its livery stripe and seams.
  g.rrect(5, 7, w - 8, 17, P.panel, 2);
  g.hline(7, 7, w - 12, P.panelHi);
  g.rect(5, 19, w - 8, 5, P.panelMid);
  g.hline(5, 19, w - 8, shade(P.panelMid, 0.15));
  g.rect(7, 13, w - 12, 2, P.orange);
  g.hline(7, 15, w - 12, P.orangeLo);
  for (const x of [31, 53]) g.vline(x, 8, 4, P.panelMid).vline(x, 16, 3, P.panelMid);
  // Arm pods with teal tops.
  for (const x of [1, w - 9]) {
    g.rrect(x, 4, 10, 20, P.panel, 3);
    g.rrect(x + 1, 4, 8, 5, P.teal, 2);
    g.hline(x + 2, 4, 6, P.tealHi);
    g.vline(x + 1, 10, 9, P.panelHi);
    g.rect(x, 19, 10, 5, P.panelMid);
  }
  // A dark skirt with a strip of floor light under it.
  g.rect(4, 24, w - 6, 2, P.steelDk);
  for (let x = 7; x < w - 4; x += 5) g.set(x, 25, P.tealHi);
  return done(g);
}

function coffeeTable(): HTMLCanvasElement {
  const g = new Grid(38, 14);
  g.rrect(1, 1, 36, 7, P.panelHi, 2);
  g.rect(1, 6, 36, 2, P.panelMid);
  g.hline(3, 1, 32, "#ffffff");
  // A little holo display and a tray of snack cubes.
  g.rect(4, 2, 9, 4, P.screen);
  g.rect(5, 3, 2, 2, P.cyan).set(8, 3, P.mint).rect(9, 4, 3, 1, P.cyanDk);
  g.rect(21, 2, 12, 4, P.steelDk);
  g.rect(22, 3, 2, 2, P.amber).rect(25, 3, 2, 2, P.leafHi).rect(28, 3, 2, 2, "#ff9fb2").set(31, 3, P.cyan).set(31, 4, P.cyan);
  g.rect(15, 3, 3, 3, P.white).set(16, 3, P.orange);
  // One pedestal, a soft glow under it.
  g.rect(16, 8, 6, 3, P.steel);
  g.rect(12, 11, 14, 2, P.steelDk);
  g.set(14, 12, P.tealHi).set(23, 12, P.tealHi);
  return done(g);
}

function pingPong(): HTMLCanvasElement {
  // Zero-g table tennis: a navy table with a glowing force-field net.
  const w = 74;
  const g = new Grid(w + 2, 26);
  const top = "#2c4a7a";
  g.rect(1, 1, w, 13, top);
  g.rect(1, 1, w, 1, P.white).rect(1, 13, w, 1, P.white);
  g.vline(1, 1, 13, P.white).vline(w, 1, 13, P.white);
  g.hline(2, 7, w - 2, "#4d6ea8");
  for (let x = 6; x < w - 2; x += 9) g.set(x, 4, "#3a5c94").set(x + 4, 10, "#3a5c94");
  g.rect(1, 14, w, 3, P.panel);
  g.hline(1, 16, w, P.panelMid);
  for (let x = 4; x < w; x += 8) g.set(x, 15, P.orange);
  // The net: a column of light between two emitters.
  const nx = 1 + Math.floor(w / 2);
  g.rect(nx - 1, 0, 3, 1, P.steel);
  g.vline(nx, 1, 13, P.cyan);
  for (let y = 2; y < 14; y += 2) g.set(nx, y, "#c8f4ff");
  g.set(nx - 1, 14, P.steel).set(nx + 1, 14, P.steel);
  // Magnetic legs.
  for (const x of [4, w - 5]) {
    g.rect(x, 17, 2, 6, P.steel);
    g.rect(x - 1, 23, 4, 1, P.steelDk);
  }
  g.rect(nx - 6, 17, 2, 4, P.steelDk).rect(nx + 5, 17, 2, 4, P.steelDk);
  return done(g);
}

function arcade(): HTMLCanvasElement {
  // A sim pod: a rounded white cabinet, teal trim, the game screen (drawn live) at 3..22 × 10..23.
  const w = 24;
  const h = 46;
  const g = new Grid(w + 2, h + 2);
  g.rrect(1, 1, w, h - 1, P.panel, 3);
  g.vline(2, 4, h - 8, P.panelHi);
  g.rect(w - 1, 4, 2, h - 8, P.panelMid);
  // The marquee: a star field and a little orbit.
  g.rrect(3, 2, w - 4, 6, P.navy, 1);
  for (const [x, y] of [[5, 3], [9, 5], [15, 3], [19, 6], [12, 4]] as const) g.set(x, y, "#ffffff");
  g.hline(6, 6, 13, P.tealHi).set(17, 5, P.amber).set(18, 5, P.amber);
  // The screen bezel.
  g.rect(2, 9, w - 2, 16, P.steelDk);
  g.rect(3, 10, w - 4, 14, "#120f22");
  // Controls: a stick and three buttons.
  g.rect(2, 25, w - 2, 6, P.teal);
  g.hline(2, 25, w - 2, P.tealHi);
  g.rect(6, 26, 1, 3, P.steelDeep).rect(5, 25, 3, 1, P.red);
  g.set(12, 27, P.amber).set(15, 28, P.cyan).set(18, 27, P.mint);
  // The pod's lower shell, the coin slot glowing.
  g.rect(3, 32, w - 4, h - 34, P.panelMid);
  g.hline(3, 32, w - 4, P.panelLo);
  g.rect(9, 36, 8, 3, P.steelDeep).rect(11, 37, 4, 1, P.amber);
  g.rect(3, 42, w - 4, 2, P.orange);
  return done(g);
}

function sleepPod(pad: string): HTMLCanvasElement {
  // A capsule bunk, its canopy slid back: a padded bed in a molded shell.
  const g = new Grid(26, 16);
  const canopy = "#bfe6f4cc";
  // The canopy, slid back behind the pillow.
  g.rrect(3, 0, 20, 4, canopy, 2);
  g.hline(5, 0, 16, "#e8f8ffdd");
  // The shell.
  g.rrect(1, 3, 24, 12, P.panel, 4);
  g.hline(4, 3, 18, P.panelHi);
  g.rect(2, 11, 22, 3, P.panelMid);
  g.hline(3, 13, 20, P.panelLo);
  // The pad and the pillow.
  g.rrect(4, 4, 18, 8, pad, 3);
  g.hline(6, 5, 12, shade(pad, 0.22));
  g.hline(5, 10, 16, shade(pad, -0.18));
  g.rrect(8, 3, 10, 4, P.cream, 2);
  g.hline(9, 3, 8, "#fbf6ea");
  // A status light and the orange stripe.
  g.set(22, 12, P.mint);
  g.hline(3, 12, 6, P.orange);
  return done(g);
}

function recliner(): HTMLCanvasElement {
  const g = new Grid(28, 26);
  g.rrect(4, 1, 20, 16, P.panel, 4);
  g.rrect(6, 3, 16, 12, P.teal, 3);
  g.hline(8, 3, 12, P.tealHi);
  g.rrect(1, 9, 6, 13, P.panelMid, 2);
  g.rrect(21, 9, 6, 13, P.panelMid, 2);
  g.hline(2, 9, 4, P.panelHi).hline(22, 9, 4, P.panelHi);
  g.rect(6, 15, 16, 6, P.tealLo);
  g.hline(6, 15, 16, P.teal);
  g.rect(12, 21, 4, 2, P.steel);
  g.rect(7, 23, 14, 1, P.steelDk);
  g.set(23, 12, P.amber);
  return done(g);
}

function synthKeys(): HTMLCanvasElement {
  // A synth console: a sloped panel of sliders and a little scope over the keys.
  const g = new Grid(32, 32);
  g.rrect(1, 1, 30, 22, P.steelDk, 2);
  g.hline(3, 1, 26, P.steel);
  g.rect(3, 3, 26, 9, P.steelDeep);
  readout(g, 4, 4, 9, 6, P.mint);
  g.rect(5, 6, 1, 1, P.mint).rect(6, 5, 1, 1, P.mint).rect(7, 7, 1, 1, P.mint).rect(8, 5, 1, 1, P.mint).rect(10, 6, 2, 1, P.mint);
  for (let i = 0; i < 6; i++) {
    const x = 15 + i * 2;
    g.vline(x, 4, 7, P.steel);
    g.set(x, 5 + ((i * 3) % 5), [P.orange, P.cyan, P.amber][i % 3]!);
  }
  g.rect(2, 14, 28, 5, P.white);
  for (let x = 4; x < 30; x += 3) g.rect(x, 14, 1, 3, P.steelDeep);
  g.hline(2, 18, 28, P.whiteLo);
  g.rect(1, 19, 30, 4, P.steelDeep);
  g.hline(3, 20, 26, P.orange);
  g.rect(4, 23, 2, 6, P.steel).rect(26, 23, 2, 6, P.steel);
  g.rect(3, 29, 4, 1, P.steelDk).rect(25, 29, 4, 1, P.steelDk);
  return done(g);
}

function target(): HTMLCanvasElement {
  // A magnetic target on a stand: the darts stick wherever they land.
  const g = new Grid(20, 34);
  g.ellipse(9.5, 9.5, 8.5, 8.5, P.steelDeep);
  g.ellipse(9.5, 9.5, 7, 7, P.navy);
  g.ellipse(9.5, 9.5, 5.5, 5.5, P.orange);
  g.ellipse(9.5, 9.5, 4, 4, P.panelHi);
  g.ellipse(9.5, 9.5, 2.5, 2.5, P.teal);
  g.ellipse(9.5, 9.5, 1, 1, P.cyan);
  for (const [x, y] of [[9, 2], [9, 17], [2, 9], [17, 9]] as const) g.set(x, y, P.amber);
  g.rect(9, 19, 2, 11, P.steel);
  g.vline(9, 19, 11, P.panelLo);
  g.rrect(4, 30, 12, 3, P.steelDk, 1);
  g.set(6, 31, P.cyan).set(13, 31, P.cyan);
  return done(g);
}

function waterSphereBase(): HTMLCanvasElement {
  // The emitter that holds the zero-g water sphere afloat above it.
  const g = new Grid(42, 22);
  g.ellipse(20.5, 4, 17, 3.5, P.steelDk);
  g.ellipse(20.5, 3.5, 15, 2.5, "#3a6f86");
  g.ellipse(20.5, 3.5, 11, 1.6, P.cyanDk);
  g.ellipse(20.5, 3.2, 6, 1, P.cyan);
  g.rect(5, 5, 32, 13, P.panel);
  g.hline(5, 5, 32, P.panelHi);
  g.rect(5, 15, 32, 3, P.panelMid);
  g.rect(8, 8, 26, 4, P.navy);
  for (let x = 10; x < 33; x += 4) g.set(x, 9, x % 8 === 2 ? P.cyan : P.tealHi);
  g.hline(5, 13, 32, P.orange);
  g.rect(7, 18, 4, 2, P.steelDk).rect(31, 18, 4, 2, P.steelDk);
  return done(g);
}

function newsScreen(w: number, h: number, standing: boolean): HTMLCanvasElement {
  // The news screen's frame (the picture is HTML over 4..w−4): slate bezel, orange corner brackets.
  const g = new Grid(w + 2, h + (standing ? 22 : 4));
  g.rrect(1, 1, w, h, P.steelDk, 1);
  g.hline(2, 1, w - 2, P.steel);
  g.rect(3, 3, w - 4, h - 4, "#0c0b14");
  for (const [x, y, dx, dy] of [
    [1, 1, 1, 1],
    [w, 1, -1, 1],
    [1, h, 1, -1],
    [w, h, -1, -1],
  ] as const) {
    g.set(x, y, P.orange).set(x + dx, y, P.orange).set(x + 2 * dx, y, P.orange).set(x, y + dy, P.orange).set(x, y + 2 * dy, P.orange);
  }
  g.set(w - 3, h - 1, P.mint).set(w - 5, h - 1, P.amber);
  if (standing) {
    // A low console under it: white shell, a strip of lights.
    g.rect(1 + w / 2 - 4, h + 1, 8, 4, P.steel);
    g.rrect(8, h + 5, w - 14, 14, P.panel, 2);
    g.hline(10, h + 5, w - 18, P.panelHi);
    g.rect(8, h + 15, w - 14, 4, P.panelMid);
    g.hline(10, h + 11, w - 18, P.orange);
    for (let x = 14; x < w - 8; x += 6) g.set(x, h + 8, P.tealHi);
    g.rect(11, h + 19, 3, 2, P.steelDk).rect(w - 10, h + 19, 3, 2, P.steelDk);
  } else {
    g.rect(1 + w / 2 - 7, h + 1, 14, 2, P.steel);
    g.set(1 + w / 2 - 6, h + 1, P.panelLo).set(1 + w / 2 + 5, h + 1, P.panelLo);
  }
  return done(g);
}

// ------------------------------------------------------------------ the galley

function counter(w: number): HTMLCanvasElement {
  // A galley counter: white top, slate cabinets with teal doors; the kettle, a sink and the
  // food warmer (the microwave) at the right end. x+46..64 stays clear for the food synthesizer.
  const g = new Grid(w + 2, 36);
  const top = 10;
  g.rect(1, top, w, 7, P.panelHi);
  g.hline(1, top, w, "#ffffff");
  g.hline(1, top + 6, w, P.panel);
  g.rect(1, top + 7, w, 17, P.steel);
  g.hline(1, top + 7, w, P.deckHi);
  for (let x = 4; x + 16 < w - 2; x += 20) {
    panel(g, x, top + 9, 16, 12, P.tealLo, 1);
    g.rect(x + 13, top + 13, 1, 4, P.tealHi);
  }
  g.hline(1, top + 22, w, P.orange);
  g.rect(1, top + 23, w, 1, P.steelDeep);
  // The kettle: a white pot with a teal lid (its light is live at x+34, y+13).
  g.rrect(31, 5, 9, 10, P.white, 2);
  g.rect(32, 4, 7, 2, P.teal).set(35, 3, P.tealLo);
  g.vline(40, 7, 4, P.panelMid).set(31, 13, P.whiteLo);
  g.hline(32, 14, 7, P.panelMid);
  // The sink past the synthesizer's spot.
  const sink = 68;
  if (sink + 16 <= (w >= 100 ? w - 28 : w - 2)) {
    g.rect(sink, top + 1, 16, 5, P.panelMid);
    g.rect(sink + 1, top + 2, 14, 3, P.panelLo);
    g.set(sink + 4, top + 3, P.waterHi);
    g.rect(sink + 7, top - 4, 2, 5, P.steel).set(sink + 8, top - 4, P.panelLo).set(sink + 6, top - 4, P.steel);
  }
  // The food warmer.
  if (w >= 100) {
    g.rrect(w - 26, 0, 22, 14, P.steelDk, 1);
    g.hline(w - 25, 0, 20, P.steel);
    g.rect(w - 24, 2, 13, 10, P.steelDeep);
    g.rect(w - 23, 3, 3, 1, P.steel);
    g.rect(w - 9, 3, 3, 8, P.void);
    g.set(w - 8, 4, P.amber).set(w - 8, 6, P.steel).set(w - 8, 8, P.steel);
  }
  // A mug and a squeeze tube on the counter.
  if (w >= 100) g.rect(w - 34, top - 4, 3, 4, P.teal).set(w - 31, top - 3, P.teal);
  if (w >= 100) g.rect(88, top - 3, 2, 3, P.orange).set(88, top - 4, P.white);
  return done(g);
}

function brewer(): HTMLCanvasElement {
  // The recycled-coffee brewer: a teal body, a grounds recycler on top, the display at 8..18 × 8..12.
  const g = new Grid(26, 30);
  // The grounds recycler: a glass tank of dark coffee with a loop of piping.
  g.rrect(13, 0, 9, 6, "#5a3a26", 2);
  g.rect(14, 1, 2, 3, "#8a5a3a");
  g.hline(13, 0, 9, "#bfe6f4");
  g.vline(4, 1, 4, P.steel).hline(4, 1, 8, P.steel).vline(11, 1, 4, P.steel);
  g.rect(2, 4, 22, 2, P.panelHi);
  g.hline(2, 5, 22, P.panel);
  // Body.
  g.rrect(2, 6, 22, 16, P.teal, 1);
  g.hline(3, 7, 20, P.tealHi);
  g.rect(2, 19, 22, 3, P.tealLo);
  // Display and buttons.
  g.rect(8, 8, 10, 4, "#14261e");
  g.rect(9, 9, 4, 1, P.mint).rect(14, 9, 3, 1, P.mint).rect(9, 10, 6, 1, "#2f6b4a");
  g.set(5, 9, P.amber).set(5, 11, P.white).set(20, 9, P.white).set(20, 11, P.orange);
  // The spout over the cup (the stream and the cup are live at x+8..11, y+18..21).
  g.rect(7, 13, 5, 3, P.panelLo);
  g.rect(8, 16, 3, 1, P.steelDeep);
  g.rect(15, 13, 5, 3, P.panelLo).rect(16, 16, 3, 1, P.steelDeep);
  g.rect(23, 12, 1, 6, P.panelMid);
  // Drip tray and a recycle mark.
  g.rect(3, 22, 20, 3, P.steelDk);
  for (let x = 4; x < 22; x += 2) g.set(x, 23, P.steel);
  g.rect(7, 19, 3, 3, P.white).set(10, 20, P.white);
  g.rect(15, 18, 5, 2, P.orange);
  g.rect(2, 25, 22, 2, P.steelDeep);
  return done(g);
}

function coldLocker(): HTMLCanvasElement {
  // Cold storage: a frosted steel locker (its door swings open over 1..19 × 1..33).
  const g = new Grid(20, 34);
  g.rrect(1, 1, 18, 31, P.panel, 1);
  g.hline(2, 1, 16, P.panelHi);
  g.vline(1, 2, 29, P.panelHi);
  g.rect(18, 2, 1, 29, P.panelMid);
  // A frosted window, a temperature readout, the handle.
  g.rect(4, 4, 10, 7, "#cdeaf7");
  g.rect(5, 5, 3, 1, "#ffffff").set(5, 6, "#ffffff").set(11, 9, "#a8d8ee").set(9, 8, "#a8d8ee");
  g.rect(4, 13, 6, 3, P.screen).rect(5, 14, 4, 1, P.cyan);
  g.rect(15, 5, 1, 10, P.steel).set(15, 4, P.panelLo);
  g.hline(2, 18, 16, P.panelMid);
  g.hline(2, 19, 16, P.teal);
  for (let y = 23; y < 30; y += 2) g.hline(4, y, 12, P.panelMid);
  g.rect(2, 31, 16, 1, P.steelDk);
  return done(g);
}

function dispenser(): HTMLCanvasElement {
  // The snack dispenser: the window at 3..15 × 5..32, the flap at 17..21 × 18.
  const g = new Grid(24, 44);
  g.rrect(1, 1, 22, 42, P.navy, 1);
  g.hline(2, 1, 20, P.navyHi);
  g.rect(1, 2, 22, 2, P.orange);
  g.rect(3, 5, 13, 28, "#14182a");
  const snacks = [P.amber, P.cyan, P.leafHi, "#ff9fb2", P.violet, P.orange];
  for (let r = 0; r < 4; r++) {
    g.hline(3, 11 + r * 7, 13, P.steel);
    for (let c = 0; c < 3; c++) {
      const col = snacks[(r * 3 + c) % snacks.length]!;
      // Cubes, tubes and pouches.
      if ((r + c) % 3 === 0) g.rect(4 + c * 4, 7 + r * 7, 3, 4, col).set(4 + c * 4, 7 + r * 7, shade(col, 0.3));
      else if ((r + c) % 3 === 1) g.rect(5 + c * 4, 6 + r * 7, 1, 5, col).rect(4 + c * 4, 10 + r * 7, 3, 1, shade(col, -0.2));
      else g.rrect(4 + c * 4, 8 + r * 7, 3, 3, col, 1);
    }
  }
  g.rect(17, 6, 5, 10, P.steelDeep);
  for (let i = 0; i < 6; i++) g.set(18 + (i % 2) * 2, 7 + Math.floor(i / 2) * 3, i === 2 ? P.amber : P.cyan);
  g.rect(17, 18, 5, 2, P.steelDk);
  g.hline(17, 21, 5, P.navyLo);
  g.rect(3, 35, 18, 5, P.steelDeep);
  g.hline(4, 36, 16, P.steel);
  g.rect(2, 41, 20, 1, P.navyLo);
  return done(g);
}

function messTable(w: number): HTMLCanvasElement {
  // The mess table: meal trays on a white top, a slate base with the livery stripe.
  const g = new Grid(w + 2, 26);
  g.rrect(1, 1, w, 12, P.panelHi, 1);
  g.hline(2, 1, w - 2, "#ffffff");
  g.rect(1, 13, w, 10, P.steel);
  g.hline(1, 13, w, P.deckHi);
  g.hline(1, 18, w, P.orange);
  for (let x = 6; x < w - 4; x += 16) g.rect(x, 15, 8, 2, P.steelDk);
  // Trays with compartments of food.
  const foods = [P.leafHi, P.amber, "#ff9fb2", P.orangeHi, "#c9a07a", P.violet];
  for (let i = 0, x = 4; x + 12 <= w - 2; i++, x += 16) {
    g.rect(x, 3, 12, 8, P.panelMid);
    g.rect(x + 1, 4, 5, 3, foods[i % foods.length]!);
    g.rect(x + 7, 4, 4, 3, foods[(i + 2) % foods.length]!);
    g.rect(x + 1, 8, 10, 2, foods[(i + 4) % foods.length]!);
    if (i % 2 === 0 && x + 15 < w) g.rect(x + 13, 2, 2, 3, P.teal);
  }
  return done(g);
}

function magStool(): HTMLCanvasElement {
  const g = new Grid(12, 10);
  g.ellipse(5.5, 2.5, 4.5, 2, P.orange);
  g.hline(3, 1, 4, P.orangeHi);
  g.rect(5, 4, 2, 3, P.steel);
  g.ellipse(5.5, 8, 3.5, 1, P.steelDk);
  g.set(3, 8, P.cyan).set(8, 8, P.cyan);
  return done(g);
}

// ------------------------------------------------------------------ the bridge

function chartTable(): HTMLCanvasElement {
  // The bridge's chart table: dark glass with a faint grid (a blueprint is drawn live in the middle).
  const g = new Grid(68, 30);
  g.rrect(1, 1, 66, 20, P.panel, 2);
  g.rect(3, 3, 62, 16, "#16233a");
  for (let x = 6; x < 64; x += 6) g.vline(x, 3, 16, "#1e3150");
  for (let y = 6; y < 18; y += 5) g.hline(3, y, 62, "#1e3150");
  g.hline(3, 3, 62, "#24395c");
  // Little readouts at the corners.
  g.rect(5, 5, 4, 3, P.cyanDk).set(6, 6, P.cyan);
  g.rect(58, 14, 4, 3, P.amber).set(59, 15, "#fff3d0");
  g.hline(2, 20, 64, P.panelMid);
  g.rect(1, 21, 66, 2, P.steel);
  g.hline(2, 21, 64, P.orange);
  for (let x = 8; x < 62; x += 9) g.set(x, 22, P.tealHi);
  g.rect(4, 23, 4, 5, P.steelDk).rect(60, 23, 4, 5, P.steelDk);
  g.rect(30, 23, 8, 4, P.steelDk);
  return done(g);
}

function seatBack(): HTMLCanvasElement {
  // A bridge seat from behind (the classic chair's rows 15..31): a padded back on a pedestal.
  const g = new Grid(16, 32);
  g.rrect(3, 15, 10, 10, P.panel, 2);
  g.rrect(4, 16, 8, 7, P.navy, 1);
  g.hline(5, 16, 6, P.navyHi);
  g.rect(2, 22, 12, 3, P.panelMid);
  g.hline(2, 22, 12, P.panelHi);
  g.set(12, 23, P.amber);
  g.rect(7, 25, 2, 3, P.steel);
  g.rect(4, 28, 8, 1, P.steelDk);
  g.set(4, 29, P.steelDk).set(11, 29, P.steelDk);
  return done(g);
}

function seatFront(): HTMLCanvasElement {
  // A bridge seat from the front (rows 9..31): headrest, cushion, armrests, pedestal.
  const g = new Grid(16, 32);
  g.rrect(3, 9, 10, 4, P.panel, 1);
  g.rect(5, 10, 6, 2, P.navy);
  g.rrect(3, 13, 10, 9, P.navy, 2);
  g.hline(5, 13, 6, P.navyHi);
  g.vline(4, 14, 6, P.navyHi);
  g.rect(2, 18, 2, 6, P.panelMid).rect(12, 18, 2, 6, P.panelMid);
  g.set(2, 18, P.panelHi).set(12, 18, P.panelHi).set(13, 20, P.cyan);
  g.rect(3, 22, 10, 3, P.navyLo);
  g.hline(3, 22, 10, P.navy);
  g.rect(7, 25, 2, 4, P.steel);
  g.rect(4, 29, 8, 1, P.steelDk);
  g.set(4, 30, P.steelDk).set(11, 30, P.steelDk);
  return done(g);
}

function starChart(w: number): HTMLCanvasElement {
  // The bridge's chart display: a pale glass board in a slate frame (the strokes land on 3..w−1 × 3..33).
  const g = new Grid(w + 2, 46);
  g.rrect(1, 1, w, 34, P.steelDk, 1);
  g.hline(2, 1, w - 2, P.steel);
  g.rect(3, 3, w - 4, 30, "#eaf4f8");
  // A faint grid and a few chart marks under the strokes.
  for (let x = 8; x < w - 2; x += 10) g.vline(x, 4, 28, "#dbe9f0");
  for (let y = 8; y < 32; y += 8) g.hline(4, y, w - 6, "#dbe9f0");
  g.set(w - 12, 7, "#b8cfdc").set(w - 20, 26, "#b8cfdc").set(w - 9, 22, "#b8cfdc");
  g.rect(1, 35, w, 2, P.steel);
  g.hline(1, 36, w, P.orange);
  g.rect(8, 34, 5, 1, P.red).rect(15, 34, 5, 1, P.cyan).rect(22, 34, 5, 1, P.mint);
  g.rect(4, 37, 2, 8, P.steel).rect(w - 5, 37, 2, 8, P.steel);
  g.set(4, 44, P.steelDk).set(w - 5, 44, P.steelDk);
  return done(g);
}

function slateRack(): HTMLCanvasElement {
  // A rack of data slates and rolled star charts for the bridge's corner.
  const g = new Grid(18, 28);
  const rolls: [number, number, string][] = [
    [3, 2, "#9fc4ff"],
    [12, 4, P.cream],
  ];
  for (const [x, y, c] of rolls) {
    g.rect(x, y, 3, 15, c);
    g.set(x + 1, y, shade(c, -0.25));
    g.hline(x, y + 4, 3, shade(c, -0.12));
  }
  // Slates standing in the rack, screens lit.
  for (const [x, y, c] of [
    [6, 4, P.cyan],
    [9, 6, P.mint],
  ] as const) {
    g.rect(x, y, 3, 12, P.steelDk);
    g.rect(x + 1, y + 1, 1, 9, c);
  }
  g.rrect(2, 15, 14, 12, P.panel, 1);
  g.hline(3, 15, 12, P.panelHi);
  g.rect(2, 22, 14, 5, P.panelMid);
  g.hline(2, 20, 14, P.orange);
  g.set(13, 24, P.amber);
  return done(g);
}

/** The front edges of walled rooms: the bridge's console rail, the engine room's glass, the cabin's bulkhead. */
function roomFront(w: number, gapX: number, kind: string | undefined): HTMLCanvasElement {
  const g = new Grid(w, 11);
  const inGap = (x: number) => gapX >= 0 && x >= gapX - 9 && x < gapX + 9;
  const glass = kind === "boss" ? "#d8dce2e6" : "#cfeaf5a0";
  for (let x = 0; x < w; x++) {
    if (inGap(x)) continue;
    g.set(x, 0, P.steelDk).set(x, 1, P.panel);
    for (let y = 2; y < 8; y++) g.set(x, y, glass);
    g.set(x, 8, P.panelMid).set(x, 9, kind === "server" ? (Math.floor(x / 2) % 2 ? P.steelDeep : P.hazard) : P.steel).set(x, 10, P.steelDeep);
  }
  if (kind === "boss") {
    // The cabin's front: an opaque lower bulkhead with the livery stripe, a strip of viewport above.
    for (let x = 0; x < w; x++) {
      g.set(x, 5, P.panel).set(x, 6, P.orange).set(x, 7, P.panelMid);
      g.set(x, 2, "#b9d6e8b0").set(x, 3, "#cfe6f5a0").set(x, 4, "#e2f2fa90");
    }
  }
  // Posts, glints and running lights.
  for (let x = 6; x < w; x += 24) {
    if (!inGap(x) && !inGap(x + 2) && kind !== "boss") g.set(x, 3, "#ffffffcc").set(x + 1, 4, "#ffffffcc").set(x + 2, 5, "#ffffffaa");
    if (!inGap(x + 12)) {
      g.vline(x + 12, 1, 8, P.panelMid);
      g.set(x + 12, 9, kind === "server" ? P.red : P.cyan);
    }
  }
  if (gapX >= 0) {
    // Door posts in the livery color either side of the gap.
    for (const x of [gapX - 10, gapX + 9]) if (x >= 0 && x < w) g.vline(x, 0, 11, P.orange).set(x, 0, P.orangeHi);
  }
  for (const x of [0, w - 1]) g.vline(x, 0, 11, P.steelDk);
  return g.toCanvas();
}

// ------------------------------------------------------------------ the captain's cabin

function lightColumn(): HTMLCanvasElement {
  // A tall light column: a glowing capsule on a slim post.
  const g = new Grid(16, 52);
  g.rrect(3, 1, 10, 12, P.panel, 3);
  g.rrect(4, 2, 8, 9, "#fff3d6", 3);
  g.rect(5, 3, 2, 5, "#ffffff");
  g.hline(4, 10, 8, "#ffe0a8");
  g.rect(3, 12, 10, 2, P.panelMid);
  g.set(7, 12, P.orange).set(8, 12, P.orange);
  g.rect(7, 14, 2, 33, P.steel);
  g.vline(7, 14, 33, P.panelLo);
  g.rrect(3, 47, 10, 3, P.steelDk, 1);
  g.hline(4, 47, 8, P.steel);
  g.set(5, 48, P.cyan);
  return done(g);
}

function captainsDesk(w: number): HTMLCanvasElement {
  // The captain's desk: a slate top with a console inset, a white shell front with the livery.
  const g = new Grid(w + 2, 30);
  g.rect(1, 1, w, 12, P.steelDk);
  g.hline(1, 1, w, P.steel);
  g.rect(3, 3, w - 4, 8, P.steelDeep);
  g.hline(3, 3, w - 4, "#2a3040");
  // The captain's screen (from behind), a slate, a mug, a little ringed planet model.
  g.rect(8, 1, 14, 9, P.panelLo).rect(9, 2, 12, 7, P.panel);
  g.rect(13, 9, 4, 2, P.steel);
  g.rect(w - 24, 6, 9, 5, P.screen).rect(w - 23, 7, 6, 1, P.cyan).rect(w - 23, 9, 4, 1, P.cyanDk);
  g.rect(w - 9, 4, 4, 5, P.white).set(w - 7, 5, P.orange);
  g.ellipse(26, 7, 2, 2, P.amber);
  g.set(25, 6, P.orangeHi).hline(22, 8, 9, P.panelHi).set(22, 7, P.panelHi).set(30, 9, P.panelHi);
  // Front panel.
  g.rect(1, 13, w, 12, P.panel);
  g.hline(1, 13, w, P.panelHi);
  g.rect(4, 16, w - 8, 7, P.panelMid);
  g.hline(4, 18, w - 8, P.orange);
  g.rect(w / 2 - 6, 20, 12, 2, P.navy);
  g.set(w / 2 - 4, 20, P.cyan).set(w / 2, 20, P.amber).set(w / 2 + 4, 20, P.mint);
  g.rect(1, 25, w, 2, P.steelDk);
  g.rect(3, 27, 3, 2, P.steelDeep).rect(w - 4, 27, 3, 2, P.steelDeep);
  return done(g);
}

function captainsChair(): HTMLCanvasElement {
  // The captain's chair: a tall padded back with wings, armrests with little control panels.
  const g = new Grid(22, 26);
  g.rrect(3, 0, 16, 19, P.panel, 4);
  g.rrect(5, 2, 12, 15, P.navy, 3);
  g.hline(7, 2, 8, P.navyHi);
  g.vline(5, 5, 9, P.navyHi);
  // Headrest wings and the stripe.
  g.rect(3, 4, 2, 5, P.panelHi).rect(17, 4, 2, 5, P.panelMid);
  g.hline(6, 8, 10, P.orange);
  for (let y = 11; y < 16; y += 3) g.hline(7, y, 8, P.navyLo);
  // Armrests with tiny lights.
  for (const x of [0, 17]) {
    g.rrect(x, 11, 5, 9, P.panelMid, 1);
    g.hline(x + 1, 11, 3, P.panelHi);
    g.rect(x + 1, 13, 3, 3, P.screen);
  }
  g.set(1, 14, P.cyan).set(3, 13, P.red).set(18, 14, P.amber).set(20, 15, P.mint).set(2, 15, P.mint).set(19, 13, P.cyan);
  g.rect(10, 19, 2, 4, P.steel);
  g.rect(5, 23, 12, 1, P.steelDk);
  g.set(5, 24, P.steelDk).set(16, 24, P.steelDk);
  return done(g);
}

function chargePad(): HTMLCanvasElement {
  // The robot dog's charging pad: a round dock with a glowing ring.
  const g = new Grid(26, 14);
  g.ellipse(12.5, 7, 11.5, 5.5, P.panel);
  g.ellipse(12.5, 7.5, 10, 4, P.panelMid);
  g.ellipse(12.5, 7.5, 8, 3, P.cyanDk);
  g.ellipse(12.5, 7.5, 6.5, 2, "#294a5e");
  g.hline(9, 7, 7, P.cyan);
  g.set(12, 6, "#c8f4ff").set(13, 8, "#c8f4ff");
  g.hline(6, 2, 13, P.panelHi);
  g.set(22, 9, P.mint);
  return done(g);
}

function displayShelf(): HTMLCanvasElement {
  // A display shelf: model ships, a geode, a sprout; the top stays flat (the globe stands on it at x+22).
  const g = new Grid(32, 32);
  g.rect(1, 2, 30, 29, P.panel);
  g.hline(1, 1, 30, P.panelHi);
  g.hline(1, 2, 30, P.panel);
  g.rect(3, 4, 26, 11, P.steelDeep);
  g.rect(3, 17, 26, 11, P.steelDeep);
  g.rect(1, 15, 30, 2, P.panelMid);
  g.hline(1, 15, 30, P.panelHi);
  g.rect(1, 28, 30, 3, P.panelMid);
  g.hline(1, 29, 30, P.orange);
  // Top shelf: a stubby rocket, a ring-shaped station, a tiny strip light.
  g.rect(6, 7, 3, 7, P.white).set(7, 6, P.white).set(7, 5, P.orange).set(5, 13, P.orange).set(9, 13, P.orange);
  g.set(7, 9, P.cyanDk);
  g.ellipse(16, 11, 4, 2, P.panelLo);
  g.ellipse(16, 11, 2, 1, P.steelDeep);
  g.rect(16, 8, 1, 3, P.panelLo);
  g.rect(22, 9, 4, 5, P.teal).set(23, 10, P.tealHi).hline(22, 13, 4, P.tealLo);
  g.hline(3, 4, 26, "#2a3344");
  // Bottom shelf: a geode, data cubes, a sprout in a pod.
  g.ellipse(7, 25, 3, 2, "#6b5a7a");
  g.set(6, 24, P.violet).set(7, 25, P.grow).set(8, 24, "#e7c8ff");
  g.rect(13, 23, 3, 3, P.amber).rect(17, 24, 3, 2, P.cyanDk).set(13, 23, "#fff0b8");
  g.rect(23, 23, 4, 4, P.white).set(24, 21, P.leaf).set(25, 20, P.leafHi).set(26, 21, P.leaf);
  g.hline(3, 17, 26, "#2a3344");
  return done(g);
}

function holoGreen(w: number): HTMLCanvasElement {
  // A putting mat with a holo edge: the cup at w−13..w−8 (the flag stands in it at w−11), the ball starts at 16.
  const g = new Grid(w, 14);
  g.rrect(1, 1, w - 2, 11, "#2f7a4a", 2);
  g.rrect(1, 1, w - 2, 10, "#3f9a5a", 2);
  for (let x = 4; x < w - 4; x += 8) g.vline(x, 2, 8, "#4aa866");
  g.hline(2, 1, w - 4, "#7ff0c4");
  g.hline(2, 10, w - 4, "#2a6a40");
  for (let x = 3; x < w - 3; x += 6) g.set(x, 1, P.cyan);
  g.rect(9, 3, 1, 6, "#d8f8e8");
  g.rect(w - 13, 5, 5, 3, "#122a1a").rect(w - 12, 5, 3, 1, "#081810").rect(w - 13, 8, 5, 1, "#7ff0c4");
  return done(g);
}

function cradle(): HTMLCanvasElement {
  // The desk cradle in white and orange (the end balls at 3 and 11 swing live).
  const g = new Grid(16, 11);
  const air = "#010203";
  g.rect(2, 2, 12, 6, air);
  g.rect(1, 1, 14, 1, P.panelHi).vline(1, 2, 6, P.orange).vline(14, 2, 6, P.orange);
  g.rect(1, 8, 14, 2, P.steelDk).rect(1, 8, 14, 1, P.steel);
  for (const x of [5, 7, 9]) {
    g.vline(x, 2, 4, "#87909c");
    g.rect(x, 6, 2, 2, "#c9d1da").set(x, 6, "#ffffff").set(x + 1, 7, "#8d96a3");
  }
  g.outline(OUTLINE, { skip: [air, "#87909c"] });
  for (let y = 2; y < 8; y++) for (let x = 2; x < 14; x++) if (g.get(x, y) === air) g.set(x, y, null);
  return g.toCanvas();
}

function hoop(): HTMLCanvasElement {
  // A clip-on hoop over a recycling canister (the rim's center is x+8, y+11).
  const g = new Grid(16, 30);
  g.rect(7, 8, 2, 10, P.steel);
  g.rect(2, 1, 12, 8, P.panelHi).hline(2, 8, 12, P.panelMid);
  // A little ringed planet on the backboard.
  g.ellipse(8, 4.5, 2, 2, P.orange);
  g.set(7, 4, P.orangeHi).hline(4, 5, 9, P.navy).set(4, 4, P.navy).set(12, 6, P.navy);
  g.rect(5, 10, 6, 1, P.orange).set(4, 11, P.orange).set(11, 11, P.orange).rect(5, 11, 6, 1, OUTLINE).rect(5, 12, 6, 1, P.orangeLo);
  g.rect(5, 13, 6, 1, P.white).set(6, 14, P.white).set(9, 14, P.white).rect(7, 15, 2, 1, P.white);
  canister(g, 2, 18, 12, 11);
  return done(g);
}

/** A recycling canister: slate, a teal band and a dark mouth. */
function canister(g: Grid, x: number, y: number, w: number, h: number): void {
  g.rrect(x, y, w, h, P.panelMid, 1);
  g.rect(x + 1, y, w - 2, 2, P.steelDeep);
  g.hline(x, y + 2, w, P.panelHi);
  g.rect(x, y + 5, w, 3, P.teal);
  g.hline(x, y + 5, w, P.tealHi);
  g.set(x + w / 2 - 1, y + 6, "#ffffff").set(x + w / 2, y + 6, "#ffffff");
  g.vline(x + 1, y + 3, h - 4, P.panel);
  g.hline(x, y + h - 1, w, P.panelLo);
}

function recycler(): HTMLCanvasElement {
  const g = new Grid(16, 16);
  canister(g, 3, 3, 10, 12);
  g.set(6, 2, P.white).rect(7, 1, 3, 2, "#e8e0cc");
  return done(g);
}

// ------------------------------------------------------------------ the muster station, utilities

function commsDesk(): HTMLCanvasElement {
  // The muster station's comms desk: a call button (the bell), a screen and a mic.
  const g = new Grid(36, 22);
  g.rrect(1, 6, 34, 6, P.panelHi, 1);
  g.hline(2, 6, 32, "#ffffff");
  g.rect(1, 12, 34, 9, P.navy);
  g.hline(1, 12, 34, P.navyHi);
  g.rect(4, 14, 28, 5, P.navyLo);
  g.hline(4, 16, 28, P.orange);
  g.set(30, 18, P.mint).set(27, 18, P.amber);
  // The call button.
  g.ellipse(9, 4, 3.5, 2.5, P.orange);
  g.rect(6, 5, 7, 1, P.orangeLo);
  g.set(8, 3, P.orangeHi).set(9, 1, P.orangeHi);
  // A slanted screen and a mic stalk.
  g.rect(22, 1, 9, 6, P.steelDk);
  readout(g, 23, 2, 7, 4, P.cyan);
  g.vline(16, 2, 4, P.steel).set(16, 1, P.steelDk).set(17, 1, P.red);
  return done(g);
}

function jumpSeat(): HTMLCanvasElement {
  // A jump seat with harness straps (mostly hidden by whoever sits in it).
  const g = new Grid(16, 16);
  g.rrect(2, 0, 12, 8, P.panel, 2);
  g.rrect(3, 1, 10, 6, P.navy, 1);
  g.hline(4, 1, 8, P.navyHi);
  g.vline(4, 1, 9, P.orange).vline(11, 1, 9, P.orange);
  g.set(4, 9, P.panelLo).set(11, 9, P.panelLo);
  g.rect(2, 8, 12, 4, P.navy);
  g.hline(2, 8, 12, P.navyHi);
  g.rect(2, 11, 12, 2, P.panelMid);
  g.hline(2, 11, 12, P.panel);
  g.rect(3, 13, 2, 3, P.steel).rect(11, 13, 2, 3, P.steel);
  return done(g);
}

function greenBench(): HTMLCanvasElement {
  const g = new Grid(36, 16);
  g.rrect(2, 1, 32, 6, P.panel, 2);
  g.rect(4, 2, 28, 3, P.teal);
  g.hline(5, 2, 26, P.tealHi);
  g.rect(4, 6, 2, 3, P.steel).rect(30, 6, 2, 3, P.steel);
  g.rrect(1, 8, 34, 4, P.panelHi, 1);
  g.hline(1, 11, 34, P.panelMid);
  g.hline(3, 10, 30, P.orange);
  g.rect(3, 12, 2, 3, P.steelDk).rect(31, 12, 2, 3, P.steelDk);
  // A sprouting tag stuck in the seat end.
  g.set(33, 7, P.leafHi).set(34, 6, P.leaf);
  return done(g);
}

function fabricator(): HTMLCanvasElement {
  // The fabricator: prints flat sheets out of the slot on top (8..22), a part half-made inside.
  const g = new Grid(30, 26);
  g.rrect(2, 7, 26, 17, P.panel, 1);
  g.hline(3, 7, 24, P.panelHi);
  g.rect(2, 21, 26, 3, P.panelMid);
  g.rect(5, 11, 14, 9, P.steelDeep);
  g.hline(5, 11, 14, "#2c3344");
  g.rect(9, 16, 5, 3, P.orange).rect(10, 15, 3, 1, "#ff9a4a90");
  g.hline(6, 13, 12, P.cyan);
  g.rect(21, 11, 5, 3, P.screen).rect(22, 12, 3, 1, P.mint);
  g.set(22, 16, P.amber).set(24, 16, P.steel).set(22, 18, P.steel).set(24, 18, P.steel);
  g.rrect(3, 1, 24, 7, P.panelHi, 1);
  g.rect(7, 2, 16, 2, P.steelDeep);
  g.hline(8, 4, 14, P.panel);
  g.hline(3, 7, 24, P.orange);
  return done(g);
}

function waterRecycler(): HTMLCanvasElement {
  const g = new Grid(17, 36);
  // The water globe.
  g.ellipse(8, 6.5, 5.5, 5.5, P.water);
  g.ellipse(8, 7.5, 4.5, 4, "#4ab0dc");
  g.rect(5, 3, 2, 3, P.waterHi).set(5, 6, P.waterHi);
  g.set(10, 8, "#c8f0ff").set(9, 10, "#c8f0ff").set(11, 5, "#c8f0ff");
  g.rect(6, 12, 5, 2, P.steel);
  g.rect(2, 14, 13, 20, P.panel);
  g.hline(2, 14, 13, P.panelHi);
  g.vline(2, 15, 18, P.panelHi);
  g.rect(14, 15, 1, 18, P.panelMid);
  // Taps, a gauge and the recycling loop in teal.
  g.rect(5, 18, 2, 2, P.cyanDk).rect(10, 18, 2, 2, P.orange);
  g.rect(4, 22, 9, 1, P.panelMid);
  g.rect(6, 25, 5, 4, P.teal).set(7, 26, P.tealHi).set(9, 27, P.white);
  g.rect(2, 32, 13, 2, P.steelDk);
  return done(g);
}

function hydroTrough(w: number): HTMLCanvasElement {
  // A hydroponic trough between the crew stations: heads of lettuce, kale and tomato vines over
  // a nutrient channel, grow LEDs along the front.
  const g = new Grid(w, 20);
  for (let x = 5, i = 0; x < w - 5; x += 8, i++) {
    const kind = hash(`trough${i}`) % 4;
    const h = 1 + (hash(`th${i}`) % 2);
    if (kind === 3) {
      // A tomato vine on a stake.
      g.vline(x, 2 + h, 9 - h, P.leafLo);
      g.set(x - 1, 4 + h, P.leaf).set(x + 1, 6 + h, P.leaf).set(x - 1, 8 + h, P.leafHi).set(x + 1, 3 + h, P.leafHi);
      g.rect(x + 1, 5 + h, 2, 2, "#e5484d").set(x + 1, 5 + h, "#ff8a7a");
      g.rect(x - 2, 8 + h, 2, 2, "#e5484d");
      continue;
    }
    const col = kind === 0 ? P.leafHi : kind === 1 ? P.leaf : "#2f8a6a";
    g.ellipse(x, 8, 3, 3 - (h - 1), shade(col, -0.18));
    g.ellipse(x, 7.5, 2.5, 2.5 - (h - 1), col);
    g.set(x - 1, 6, shade(col, 0.3)).set(x + 1, 7, shade(col, 0.2));
    g.vline(x, 7, 3, shade(col, -0.3));
    // Frilly edges on the lettuce, a leaf hanging over the rim.
    if (kind === 0) g.set(x - 3, 7, col).set(x + 3, 6, col).set(x - 2, 5, col);
    g.set(x + 2, 11, shade(col, -0.1)).set(x + 3, 12, shade(col, -0.1));
  }
  g.rect(1, 11, w - 2, 8, P.panel);
  g.hline(1, 11, w - 2, P.panelHi);
  g.rect(1, 16, w - 2, 3, P.panelMid);
  g.hline(2, 12, w - 4, "#3a6f86");
  for (let x = 4; x < w - 4; x += 3) g.set(x, 12, (x / 3) % 2 ? P.water : "#4ab0dc");
  for (let x = 5; x < w - 4; x += 8) g.set(x + 4, 12, shade(P.leaf, -0.1)).set(x + 4, 13, shade(P.leaf, -0.2));
  for (let x = 5; x < w - 4; x += 7) g.set(x, 14, P.grow);
  g.hline(1, 17, w - 2, P.orange);
  return done(g);
}

// ------------------------------------------------------------------ the engine room

function powerRack(): HTMLCanvasElement {
  // A rack of power cells (the status LEDs are live in the dark column at 10..12).
  const g = new Grid(16, 33);
  g.rect(1, 1, 14, 30, P.steelDeep);
  g.hline(1, 1, 14, P.steel);
  for (let y = 3; y < 29; y += 4) {
    // Two cells and the LED strip.
    g.rect(3, y, 6, 3, "#2d4a58");
    g.set(3, y, P.tealHi).hline(4, y, 4, P.teal);
    g.vline(6, y, 3, P.steelDeep);
    g.rect(10, y, 3, 3, "#1a1d24");
  }
  g.rect(1, 29, 14, 2, P.steel);
  g.hline(2, 30, 12, P.orange);
  g.rect(1, 31, 14, 1, P.void);
  return done(g);
}

function aiCore(): HTMLCanvasElement {
  // The ship's AI rack: a light band on top (live), fan bays below (live fans at 6.5 and 12.5).
  const g = new Grid(20, 33);
  g.rect(1, 1, 18, 30, "#161a26");
  g.rect(1, 1, 18, 6, "#2e2860");
  g.hline(1, 1, 18, "#4a3f8f");
  for (let y = 8; y < 29; y += 6) {
    g.rect(3, y, 14, 4, "#222838");
    g.hline(3, y, 14, "#2c3448");
    g.ellipse(6.5, y + 1.5, 1.5, 1.5, "#0d0f16");
    g.ellipse(12.5, y + 1.5, 1.5, 1.5, "#0d0f16");
  }
  g.rect(1, 29, 18, 2, P.steel);
  g.hline(2, 30, 16, P.violet);
  g.rect(1, 31, 18, 1, P.void);
  return done(g);
}

// ------------------------------------------------------------------ plants

/** A white hydroponic pod (with a nutrient line and a little LED) from row y down to `bottom`. */
function pod(g: Grid, cx: number, y: number, w: number, bottom: number): void {
  const x = Math.round(cx - w / 2);
  g.rrect(x, y, w, bottom - y, P.panel, 2);
  g.hline(x + 1, y, w - 2, P.panelHi);
  g.rect(x, y, w, 2, P.panelHi);
  g.hline(x + 1, y + 1, w - 2, P.soil);
  g.hline(x, y + 4, w, P.teal);
  g.vline(x + 1, y + 2, bottom - y - 4, P.panelHi);
  g.rect(x + w - 2, y + 2, 1, bottom - y - 4, P.panelMid);
  g.set(x + w - 3, bottom - 3, P.mint);
  g.hline(x + 1, bottom - 1, w - 2, P.panelLo);
}

/** A leaf as a short stroke of pixels with a lighter tip. */
function leafStroke(g: Grid, x0: number, y0: number, x1: number, y1: number, c: string): void {
  g.line(x0, y0, x1, y1, c);
  g.set(x1, y1, shade(c, 0.3));
}

function plantFern(): HTMLCanvasElement {
  // Broad curling fronds with glowing berries.
  const g = new Grid(16, 32);
  const fronds: [number, number, number, number, string][] = [
    [8, 20, 2, 8, P.leafLo],
    [8, 20, 13, 7, P.leafLo],
    [8, 20, 4, 4, P.leaf],
    [8, 20, 11, 3, P.leaf],
    [8, 20, 8, 2, P.leafHi],
    [8, 20, 1, 14, P.leaf],
    [8, 20, 14, 13, P.leaf],
  ];
  for (const [a, b, c, d, col] of fronds) {
    leafStroke(g, a, b, c, d, col);
    leafStroke(g, a + 1, b, c + (c < 8 ? 1 : -1), d + 1, shade(col, -0.1));
  }
  g.rect(3, 9, 2, 2, P.leafHi).rect(11, 8, 2, 2, P.leafHi).rect(6, 5, 2, 2, P.leaf);
  g.set(4, 6, P.cyan).set(12, 5, P.cyan).set(9, 3, "#c8f4ff").set(2, 12, P.cyan);
  pod(g, 8, 20, 12, 31);
  return done(g);
}

function plantSpikes(): HTMLCanvasElement {
  // Tall blue-green spears with violet tips.
  const g = new Grid(16, 32);
  const blade = "#3fa58a";
  for (const [x, top, lean] of [
    [8, 1, 0],
    [6, 4, -2],
    [10, 3, 2],
    [4, 9, -3],
    [12, 8, 3],
  ] as const) {
    g.line(8, 20, x + lean, top, blade);
    g.line(9, 20, x + lean + 1, top + 1, shade(blade, -0.18));
    g.set(x + lean, top, P.grow).set(x + lean, top + 1, P.violet);
  }
  g.vline(8, 10, 10, shade(blade, 0.2));
  pod(g, 8, 20, 12, 31);
  return done(g);
}

function plantBubble(): HTMLCanvasElement {
  // A bubble cactus: stacked green spheres dotted with soft pink nodes.
  const g = new Grid(16, 32);
  g.ellipse(8, 15, 4.5, 5, P.leafLo);
  g.ellipse(7.5, 14.5, 3.5, 4, P.leaf);
  g.ellipse(4, 9, 2.5, 3, P.leaf);
  g.ellipse(11.5, 7.5, 2.5, 3.5, P.leafLo);
  g.ellipse(8, 5, 2.5, 3, P.leaf);
  for (const [x, y] of [[6, 12], [7, 16], [4, 8], [11, 6], [8, 4], [10, 14]] as const) g.set(x, y, shade(P.leaf, 0.35));
  g.set(8, 2, "#ff9fd0").set(4, 6, "#ff9fd0").set(12, 4, "#ff9fd0").set(10, 11, "#ffc8e8");
  pod(g, 8, 20, 12, 31);
  return done(g);
}

function bigTree(): HTMLCanvasElement {
  // A hydroponic tree-fern in a large pod, a nutrient tube looping into it.
  const g = new Grid(32, 48);
  const cols = [P.leafDk, P.leafLo, P.leaf, P.leafHi];
  const fronds: [number, number, number][] = [
    [2, 18, 0],
    [29, 17, 0],
    [5, 8, 1],
    [26, 8, 1],
    [11, 3, 2],
    [21, 4, 2],
    [16, 1, 3],
    [8, 14, 2],
    [24, 13, 2],
  ];
  for (const [x, y, c] of fronds) {
    const col = cols[c]!;
    g.line(16, 30, x, y, shade(col, -0.15));
    g.line(16, 29, x + (x < 16 ? 1 : -1), y + 1, col);
    // Leaflets along the frond.
    for (let k = 0.3; k < 1; k += 0.17) {
      const px = Math.round(16 + (x - 16) * k);
      const py = Math.round(30 + (y - 30) * k);
      g.set(px, py - 1, shade(col, 0.15)).set(px + (x < 16 ? -1 : 1), py, col).set(px, py + 1, shade(col, -0.1));
    }
  }
  g.vline(16, 20, 12, "#6b5a3a").vline(15, 22, 10, "#806a48");
  for (const [x, y] of [[9, 9], [23, 10], [16, 6], [5, 16], [27, 15]] as const) g.set(x, y, P.cyan);
  // The pod and its tube.
  g.rrect(7, 33, 18, 14, P.panel, 3);
  g.rect(7, 33, 18, 2, P.panelHi);
  g.hline(8, 34, 16, P.soil);
  g.hline(7, 38, 18, P.teal);
  g.vline(8, 35, 10, P.panelHi);
  g.rect(23, 35, 1, 10, P.panelMid);
  g.hline(8, 46, 16, P.panelLo);
  g.set(22, 43, P.mint);
  g.line(25, 40, 29, 42, P.cyanDk).line(29, 42, 29, 46, P.cyanDk).set(29, 44, P.cyan);
  return done(g);
}

function sprout(): HTMLCanvasElement {
  const g = new Grid(16, 16);
  g.line(8, 8, 5, 3, P.leaf).line(8, 8, 11, 2, P.leaf).vline(8, 3, 6, P.leafLo);
  g.set(5, 3, P.leafHi).set(11, 2, P.leafHi).set(4, 4, P.leaf).set(12, 3, P.leaf);
  pod(g, 8, 8, 10, 15);
  return done(g);
}

function hangingPod(): HTMLCanvasElement {
  // A pod on a cable with trailing vines and glowing bulbs.
  const g = new Grid(16, 32);
  g.vline(8, 0, 6, P.steel);
  g.rrect(3, 6, 10, 7, P.panel, 2);
  g.hline(4, 6, 8, P.panelHi);
  g.hline(3, 9, 10, P.teal);
  for (const [x, len] of [[4, 18], [6, 24], [9, 21], [12, 15]] as const) {
    for (let j = 0; j < len; j++) g.set(x + Math.round(Math.sin(j * 0.5 + x) * 1.2), 12 + j, j % 3 === 0 ? P.leafHi : P.leaf);
    g.set(x, 12 + len, P.cyan);
  }
  g.rect(4, 4, 8, 3, P.leaf).set(5, 3, P.leafHi).set(10, 3, P.leafHi);
  return done(g);
}

function plantSprite(sprite: PlantPlacement["sprite"]): HTMLCanvasElement {
  return cached(`spaceship|plant|${sprite}`, () => {
    switch (sprite) {
      case "PLANT":
        return plantFern();
      case "PLANT_2":
        return plantSpikes();
      case "CACTUS":
        return plantBubble();
      case "LARGE_PLANT":
        return bigTree();
      case "POT":
        return sprout();
      case "HANGING_PLANT":
        return hangingPod();
    }
  });
}

// ------------------------------------------------------------------ the prop hook

function propSprite(p: PropPlacement, L: Layout, classic: () => HTMLCanvasElement): HTMLCanvasElement | null {
  const k = (id: string, build: () => HTMLCanvasElement) => cached(`spaceship|prop|${id}`, build);
  switch (p.kind) {
    case "couch":
      return k("couch", couch);
    case "coffee-table":
      return k("coffee-table", coffeeTable);
    case "pingpong":
      return k("pingpong", pingPong);
    case "arcade":
      return k("arcade", arcade);
    case "beanbag-blue":
      return k("pod-blue", () => sleepPod(P.cushion));
    case "beanbag-pink":
      return k("pod-pink", () => sleepPod("#d9707a"));
    case "armchair":
      return k("armchair", recliner);
    case "lamp":
      return k("lamp", lightColumn);
    case "printer":
      return k("printer", fabricator);
    case "cooler":
      return k("cooler", waterRecycler);
    case "meeting-table":
      return k("meeting-table", chartTable);
    case "meeting-chair-back":
    case "guest-chair":
      return k("seat-back", seatBack);
    case "meeting-chair-front":
      return k("seat-front", seatFront);
    case "plan-rolls":
      return k("plan-rolls", slateRack);
    case "glass-front": {
      // The room whose front edge this is (rooms can share x and width, so match the bottom too).
      const room = L.rooms.find((r) => r.walls && r.rect.x === p.x && r.rect.w === p.w && r.rect.y + r.rect.h - 10 === p.y);
      const gap = room?.doorSide === "bottom" && room.doorX !== undefined ? room.doorX - room.rect.x : -1;
      const kind = room?.walls === "wood" ? "boss" : room?.kind;
      return k(`front-${p.w}-${gap}-${kind}`, () => roomFront(p.w ?? 100, gap, kind));
    }
    case "planter":
      return k(`planter-${p.w}`, () => hydroTrough(p.w ?? 48));
    case "kitchen-island":
      return k(`island-${p.w}`, () => messTable(p.w ?? 72));
    case "kitchen-counter":
      return k(`counter-${p.w}`, () => counter(p.w ?? 100));
    case "stool":
      return k("stool", magStool);
    case "fridge":
      return k("fridge", coldLocker);
    case "vending":
      return k("vending", dispenser);
    case "fishtank-stand":
      return k("fishtank-stand", waterSphereBase);
    case "whiteboard":
      return k(`whiteboard-${p.w}`, () => starChart(p.w ?? 80));
    case "tv":
      return k(`tv-${p.w}-${L.tv.h}-${p.z > 0}`, () => newsScreen(p.w ?? 120, L.tv.h, p.z > 0));
    case "piano":
      return k("piano", synthKeys);
    case "dartboard":
      return k("dartboard", target);
    case "reception":
      return k("reception", commsDesk);
    case "waiting-chair":
      return k("waiting-chair", jumpSeat);
    case "bench":
      return k("bench", greenBench);
    case "espresso":
      return k("espresso", brewer);
    case "server-rack":
      return k("server-rack", powerRack);
    case "ai-rack":
      return k("ai-rack", aiCore);
    case "boss-desk":
      return k(`boss-desk-${p.w}`, () => captainsDesk(p.w ?? 60));
    case "boss-chair":
      return k("boss-chair", captainsChair);
    case "dog-bed":
      return k("dog-bed", chargePad);
    case "library-shelf":
      return k("library-shelf", displayShelf);
    case "putting-green":
      return k(`green-${p.w}`, () => holoGreen(p.w ?? 56));
    case "cradle":
      return k("cradle", cradle);
    case "hoop":
      return k("hoop", hoop);
    case "bin":
      return k("bin", recycler);
    default:
      // Pieces the deck rarely shows (cornhole, sofas, side tables, low shelves): classic, in ship colors.
      return k(`tinted-${p.kind}-${p.w ?? 0}`, () => shipTint(classic()));
  }
}

function intercom(): HTMLCanvasElement {
  return cached("spaceship|speaker", () => {
    // An intercom column: a slate panel with grille slits, a round driver, an orange cap.
    const g = new Grid(12, 28);
    g.rrect(1, 1, 10, 26, P.panel, 1);
    g.rect(1, 1, 10, 3, P.orange);
    g.hline(2, 1, 8, P.orangeHi);
    g.rect(3, 6, 6, 7, P.steelDk);
    for (let y = 7; y < 13; y += 2) g.hline(3, y, 6, P.steelDeep);
    g.ellipse(5.5, 18, 3, 3, P.steelDeep);
    g.ellipse(5.5, 18, 1.4, 1.4, P.steel);
    g.set(5, 17, P.panelLo);
    g.set(8, 24, P.mint);
    g.rect(1, 25, 10, 2, P.panelMid);
    return done(g);
  });
}

export const PROPS: Pick<Theme, "prop" | "plant" | "speaker"> = {
  prop: propSprite,
  plant: (s) => plantSprite(s),
  speaker: () => intercom(),
};
