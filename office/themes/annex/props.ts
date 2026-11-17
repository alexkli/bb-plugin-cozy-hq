// Dusty Annex: furniture. Everything is second-hand, chipped, stained or
// mended with parcel tape. Key pieces are drawn by hand at the classic sizes
// (live details stay where the office draws them); the rest are the classic
// sprites, faded and grimed.

import type { Theme } from "../../theme.ts";
import type { Layout, PlantPlacement, PropPlacement } from "../../layout.ts";
import { Grid, OUTLINE, adjust, cached, drawPixelText, grime, hash, makeCanvas, mapPixels, pa, rng, shade, tint } from "../../themekit.ts";
import { P, carton, mug, papers, ring, speckle, tapeX } from "./pal.ts";
import { ctx2d } from "../../pixel.ts";

/** Fade, yellow and dirty a classic sprite: the default for anything not hand-drawn. */
export function shabby(src: HTMLCanvasElement, seed: number, amount = 0.1): HTMLCanvasElement {
  return grime(tint(adjust(src, { sat: 0.5, light: -0.04, contrast: 0.94 }), "#7a6440", 0.14), seed, amount);
}

function done(g: Grid): HTMLCanvasElement {
  g.outline(OUTLINE);
  return g.toCanvas();
}

// ------------------------------------------------------------------ the break room

function couch(): HTMLCanvasElement {
  // The back of a sagging corduroy sofa (people sit in it facing the telly).
  const w = 82;
  const g = new Grid(w + 2, 28);
  const base = "#7a5a3a";
  const hi = "#8f6c48";
  const lo = "#5f452c";
  g.rrect(8, 2, w - 16, 14, base, 3);
  g.rect(10, 3, w - 20, 1, hi);
  for (let x = 10; x < w - 8; x += 2) g.vline(x, 5, 10, shade(base, -0.05));
  // The middle sags.
  g.rect(Math.round(w / 3) + 2, 2, Math.round(w / 3) - 2, 1, null);
  g.rect(Math.round(w / 3) + 4, 3, Math.round(w / 3) - 6, 1, base);
  g.rect(2, 13, w - 2, 10, lo);
  g.rect(2, 13, w - 2, 1, shade(lo, 0.12));
  for (let x = 4; x < w - 2; x += 2) g.vline(x, 15, 7, shade(lo, -0.06));
  g.rrect(1, 6, 10, 17, base, 2);
  g.rrect(w - 9, 6, 10, 17, base, 2);
  g.rect(2, 7, 7, 1, hi).rect(w - 8, 7, 7, 1, hi);
  // A tartan throw over one end.
  g.rect(w - 30, 3, 16, 7, "#56603f");
  g.rect(w - 30, 10, 13, 3, "#56603f");
  for (let x = w - 29; x < w - 14; x += 4) g.vline(x, 3, 9, "#7a3a30");
  g.hline(w - 30, 6, 16, "#7a3a30").hline(w - 30, 10, 13, "#6e7a50");
  // A split seam with foam, and a tape repair on the arm.
  g.rect(24, 16, 6, 1, P.foam).rect(25, 17, 4, 1, P.foam).set(23, 16, OUTLINE).set(30, 16, OUTLINE);
  g.rect(3, 10, 5, 3, P.tape).set(4, 11, shade(P.tape, -0.15));
  speckle(g, 2, 2, w - 2, 21, shade(base, -0.12), 0.05, 41);
  // Legs: one missing, propped on two old books.
  g.rect(4, 23, 3, 2, P.woodDk);
  g.rect(w - 6, 23, 5, 1, "#4c5d70").rect(w - 6, 24, 5, 1, "#8e3b32");
  return done(g);
}

function coffeeTable(): HTMLCanvasElement {
  const g = new Grid(38, 14);
  g.rrect(1, 1, 36, 6, P.wood, 1);
  g.rect(2, 1, 34, 1, P.woodHi);
  g.rect(1, 7, 36, 2, P.woodLo);
  // A chip out of the corner shows the chipboard.
  g.rect(33, 6, 3, 2, "#b8a27a");
  g.rect(3, 9, 2, 3, P.woodDk).rect(33, 9, 2, 3, P.woodDk);
  ring(g, 8, 4, P.stain);
  ring(g, 21, 3, P.stain, true);
  // Yesterday's paper, a takeaway carton, a mug.
  g.rect(11, 2, 8, 4, "#cfc8b0").rect(12, 3, 5, 1, "#8f8a78").rect(12, 4, 6, 1, "#a8a290");
  carton(g, 24, 2);
  mug(g, 3, 2, "#c8bc97");
  return done(g);
}

function loungeTable(): HTMLCanvasElement {
  const g = new Grid(28, 12);
  g.ellipse(13.5, 4.5, 12.5, 4, P.woodLo);
  g.ellipse(13.5, 4, 11.5, 3, P.wood);
  ring(g, 8, 4, P.stain);
  // Dog-eared magazines from years ago, a dead plant.
  g.rect(5, 3, 6, 3, "#8a9aa0").rect(6, 3, 4, 1, "#cfc8b0");
  g.rect(11, 4, 5, 3, "#a87a6a");
  g.rect(18, 2, 3, 3, "#8a5a3a").set(19, 0, P.leafDead).set(18, 1, P.leafDry).set(20, 1, P.leafDead);
  g.rect(12, 8, 3, 3, P.woodDk);
  return done(g);
}

function sideTable(): HTMLCanvasElement {
  const g = new Grid(18, 14);
  g.rect(1, 1, 16, 7, P.wood);
  g.rect(1, 1, 16, 1, P.woodHi);
  g.rect(3, 2, 6, 4, "#8a9aa0").rect(8, 3, 6, 4, "#cfc8b0").rect(9, 4, 4, 1, "#8f8a78");
  ring(g, 14, 3, P.stain);
  g.rect(2, 8, 2, 5, P.woodDk).rect(14, 8, 2, 4, P.woodDk).set(14, 12, P.paper);
  return done(g);
}

function piano(): HTMLCanvasElement {
  // An upright gone out of tune: missing keys, sheet music and mugs on top.
  const g = new Grid(32, 32);
  g.rect(1, 1, 30, 22, "#4a3428");
  g.rect(1, 1, 30, 2, "#5e4434");
  g.rect(4, 5, 24, 8, "#3e2c22");
  g.rect(2, 14, 28, 5, "#e0d8bc");
  for (let x = 4; x < 30; x += 3) g.rect(x, 14, 1, 3, OUTLINE);
  g.rect(10, 17, 2, 2, "#5a4a38").rect(19, 17, 1, 2, "#5a4a38");
  g.rect(1, 19, 30, 4, "#33241c");
  g.rect(3, 23, 2, 7, "#4a3428").rect(27, 23, 2, 7, "#4a3428");
  // Sheet music and a mug on top, a ring on the lid.
  g.rect(8, 0, 9, 3, P.paperOld).rect(9, 1, 6, 1, P.paperLine);
  mug(g, 22, 0, "#7a8a6a");
  ring(g, 13, 8, "#5e4434");
  g.set(7, 3, "#a88a4a").set(24, 3, "#a88a4a");
  speckle(g, 1, 1, 30, 22, "#5a4030", 0.04, 7);
  return done(g);
}

function fishtankStand(): HTMLCanvasElement {
  // A chipboard cabinet, the door swollen from years of spills.
  const g = new Grid(42, 22);
  g.rect(1, 1, 40, 18, "#7a6a50");
  g.rect(1, 1, 40, 2, "#8c7b5c");
  g.rect(4, 6, 16, 10, "#6e5f47").rect(22, 6, 16, 10, "#6e5f47");
  g.rect(22, 15, 16, 2, "#857455");
  g.set(18, 10, P.metal).set(23, 10, P.metal);
  g.rect(28, 3, 9, 2, "#c9b98a");
  g.rect(2, 19, 3, 2, P.woodDk).rect(37, 19, 3, 2, P.woodDk);
  speckle(g, 1, 1, 40, 18, "#625440", 0.06, 5);
  return done(g);
}

function tv(w: number, h: number, standing: boolean): HTMLCanvasElement {
  // A chunky old set in wood-effect plastic; the picture is live.
  const g = new Grid(w + 2, h + (standing ? 22 : 4));
  const veneer = "#5e4632";
  g.rrect(1, 1, w, h, veneer, 1);
  g.rect(2, 1, w - 2, 1, "#7a5e44");
  for (let x = 6; x < w - 2; x += 9) g.set(x, 2, "#6e543c");
  g.rect(3, 3, w - 4, h - 4, "#14120e");
  // Taped-up corner and a crack in the casing.
  g.rect(w - 6, 1, 6, 2, P.tape).set(w - 4, 3, P.tape);
  g.set(5, h - 1, "#3a2a1e").set(6, h, "#3a2a1e");
  if (standing) {
    // Chipboard cabinet, a video player and a heap of tapes.
    g.rect(1 + w / 2 - 4, h + 1, 8, 4, "#3a3530");
    g.rect(8, h + 5, w - 14, 14, "#7a6a50");
    g.rect(8, h + 5, w - 14, 2, "#8c7b5c");
    g.rect(12, h + 9, 26, 6, "#2a2824").rect(14, h + 11, 6, 1, "#5f8f5a").rect(30, h + 11, 6, 1, "#3a3834");
    for (let i = 0; i < 4; i++) g.rect(44 + i * 6, h + 9 + (i % 2), 5, 8 - (i % 2), i % 2 ? "#2f2c28" : "#3a3632");
    g.rect(10, h + 19, 3, 2, P.woodDk).rect(w - 10, h + 19, 3, 2, P.woodDk);
  } else {
    // A strip of knobs under the screen.
    g.rect(w / 2 - 14, h + 1, 28, 2, "#4a3828");
    g.set(w / 2 - 10, h + 1, P.metalHi).set(w / 2 - 6, h + 1, P.metalHi).set(w / 2 + 8, h + 1, "#8e3b32");
  }
  return done(g);
}

function beanbag(color: string): HTMLCanvasElement {
  const g = new Grid(26, 16);
  g.ellipse(13, 9.5, 11, 5, color);
  g.ellipse(12, 6, 8, 3, shade(color, 0.1));
  g.rect(7, 5, 3, 1, shade(color, 0.25));
  g.rect(4, 12, 18, 1, shade(color, -0.2));
  // A patch and a few escaped beans.
  g.rect(16, 8, 4, 3, P.tape).set(17, 9, shade(P.tape, -0.15));
  speckle(g, 2, 3, 22, 11, shade(color, -0.12), 0.06, hash(color));
  g.set(23, 14, P.foam).set(1, 13, P.foam);
  return done(g);
}

// ------------------------------------------------------------------ the kitchenette

function kitchenCounter(w: number): HTMLCanvasElement {
  const g = new Grid(w + 2, 36);
  const top = 10;
  g.rect(1, top, w, 7, "#b4ac92");
  g.rect(1, top, w, 1, "#c8c0a6");
  g.rect(1, top + 6, w, 1, "#9a927a");
  g.rect(1, top + 7, w, 17, "#86704f");
  g.rect(1, top + 7, w, 1, "#9a8460");
  // Cupboard doors: one hanging off its hinge, one missing a handle.
  let n = 0;
  for (let x = 4; x < w - 6; x += 22) {
    const off = n === 1 ? 1 : 0;
    g.rect(x, top + 10 + off, 18, 11, "#7a6446");
    g.rect(x, top + 10 + off, 18, 1, "#8f7754");
    if (n === 1) g.rect(x, top + 10, 18, 1, "#2a2218").vline(x + 18, top + 10, 12, "#2a2218");
    if (n !== 2) g.rect(x + 8, top + 15 + off, 2, 1, P.metal);
    n++;
  }
  // Grime along the worktop, crumbs and rings.
  speckle(g, 1, top, w, 6, "#9a917a", 0.08, w);
  ring(g, 20, top + 3, P.stain);
  ring(g, 64, top + 4, P.stain);
  // An old kettle, furred with limescale.
  g.rrect(31, 6, 9, 9, "#d6cfb8", 2);
  g.rect(33, 4, 5, 2, "#bdb59c").set(40, 9, "#bdb59c").set(40, 10, "#bdb59c");
  g.rect(32, 12, 7, 2, "#c4bca4").set(33, 8, "#ece6d2");
  // The sink: dirty mugs piled up, a sad sponge.
  if (w >= 80) {
    g.rect(42, top + 1, 16, 5, "#9a9a92");
    g.rect(43, top + 2, 14, 3, "#7a7a72");
    g.rect(49, top - 4, 2, 5, "#8c8e86").set(50, top - 4, "#b0b2aa");
    g.rect(44, top - 1, 3, 3, "#c8bc97").rect(47, top, 3, 2, "#7a8a6a").rect(52, top - 1, 3, 3, "#a87a6a");
    g.rect(55, top + 1, 3, 2, "#c4c23a").set(55, top + 2, "#5f8f5a");
  }
  // A tired microwave (the window is live).
  if (w >= 100) {
    g.rect(w - 26, 0, 22, 14, "#8c826a");
    g.rect(w - 26, 0, 22, 1, "#a2987e");
    g.rect(w - 24, 2, 13, 10, "#2f2c26");
    g.rect(w - 9, 3, 3, 8, "#5a5444").set(w - 8, 4, "#d08a3a");
    g.rect(w - 22, 0, 5, 3, "#e2d27a");
  }
  // Mugs nobody claims, and a jar of instant.
  g.rect(w >= 80 ? 60 : 24, top - 4, 3, 4, "#8a9aa0").rect(w >= 100 ? w - 34 : w - 8, top - 4, 3, 4, "#a87a6a");
  if (w >= 100) g.rect(w - 40, top - 6, 4, 6, "#4a3424").rect(w - 40, top - 6, 4, 1, "#c9b98a").rect(w - 40, top - 3, 4, 1, "#c4383f");
  return done(g);
}

function espresso(): HTMLCanvasElement {
  // An old filter coffee machine: stale jug, scorched hotplate, paper cups.
  const g = new Grid(26, 30);
  const body = "#2f2c28";
  const bodyHi = "#46423a";
  // A tower of paper cups and the instant jar on top.
  g.rect(17, 0, 5, 4, "#ddd5c0").rect(17, 1, 5, 1, "#c4bca6");
  g.rect(4, 1, 5, 3, "#5a4030").rect(4, 1, 5, 1, "#c9b98a");
  g.rrect(2, 4, 22, 6, body, 1);
  g.rect(3, 4, 20, 1, bodyHi);
  // Display strip (blinks while brewing).
  g.rect(9, 9, 8, 3, "#14140f");
  // Tower and water tank with a cloudy gauge.
  g.rect(16, 10, 8, 14, body);
  g.rect(17, 10, 1, 13, bodyHi);
  g.rect(20, 12, 2, 8, "#8a8a7a").rect(20, 16, 2, 4, "#6a7a7a");
  // The filter head, and the drip recess with the jug.
  g.rect(3, 10, 13, 2, body);
  g.rect(5, 12, 9, 2, "#3a3630");
  g.rect(4, 14, 11, 9, "#1c1a17");
  g.rect(5, 15, 9, 7, "#5a5a52");
  g.rect(6, 15, 7, 1, "#8a8a82");
  g.rect(5, 19, 9, 3, "#3a2216");
  g.rect(14, 16, 1, 4, "#5a5a52");
  g.set(6, 16, "#b8b8b0");
  // The hotplate base with a red "on" light that's been on for years.
  g.rect(2, 22, 22, 4, "#3a3630");
  g.rect(2, 22, 22, 1, "#4a4640");
  g.set(20, 24, "#d04a3a");
  // A warning sticky note.
  g.rect(17, 21, 5, 4, "#e2d27a").set(18, 22, "#8e3b32").set(19, 23, "#8e3b32").set(20, 22, "#8e3b32");
  g.rect(2, 25, 22, 2, "#24221e");
  return done(g);
}

function fridge(): HTMLCanvasElement {
  // An ancient cream fridge: rounded, rust at the hem, magnets and a stern note.
  const g = new Grid(20, 34);
  g.rrect(1, 1, 18, 31, "#d4ccb2", 2);
  g.rect(2, 1, 16, 1, "#e4dcc4");
  g.rect(17, 3, 1, 28, "#b8b098");
  g.rect(1, 12, 18, 1, "#a69e86");
  g.rect(15, 4, 1, 6, P.metal).rect(15, 15, 1, 8, P.metal);
  // Note: LABEL YOUR FOOD, and an older one under it.
  g.rect(3, 15, 8, 7, P.paper);
  g.rect(4, 16, 5, 1, "#8e3b32").rect(4, 18, 6, 1, P.paperLine).rect(4, 20, 4, 1, P.paperLine);
  g.rect(9, 21, 4, 3, P.paperOld);
  g.set(5, 5, "#8e3b32").set(9, 7, "#4c5d70").set(6, 9, "#a88a3e");
  // Rust and a dent.
  g.rect(2, 29, 4, 2, P.rust).set(12, 30, P.rust).set(13, 29, "#a0623a");
  g.set(11, 26, "#b8b098").set(12, 27, "#b8b098");
  return done(g);
}

function vending(): HTMLCanvasElement {
  // The machine that takes your money: faded, nearly empty, out of order.
  const g = new Grid(24, 44);
  g.rect(1, 1, 22, 42, "#5e3a32");
  g.rect(1, 1, 22, 3, "#7a4a3e");
  g.rect(2, 2, 12, 1, "#9a6a58");
  g.rect(3, 5, 13, 28, "#161613");
  for (let r = 0; r < 4; r++) {
    g.rect(3, 11 + r * 7, 13, 1, "#4a4a44");
    // Mostly empty spirals; a few sad packets left.
    for (let c = 0; c < 3; c++) {
      if ((r * 3 + c) % 4 === 1) g.rect(4 + c * 4, 6 + r * 7, 3, 4, ["#a88a3e", "#6f8a5c", "#8e5a4a"][(r + c) % 3]!);
      else g.set(5 + c * 4, 9 + r * 7, "#3a3a34").set(6 + c * 4, 8 + r * 7, "#3a3a34");
    }
  }
  // One packet stuck, hanging off its spiral forever.
  g.rect(9, 17, 3, 4, "#b8823a").set(10, 21, "#b8823a");
  // A crack in the glass.
  g.set(13, 7, "#6a6a62").set(12, 8, "#6a6a62").set(12, 9, "#6a6a62").set(11, 10, "#6a6a62");
  // Coin panel, scratched.
  g.rect(17, 6, 5, 10, "#2a2622");
  for (let i = 0; i < 6; i++) g.set(18 + (i % 2) * 2, 7 + Math.floor(i / 2) * 3, i === 3 ? "#3a3632" : "#8a8270");
  g.rect(17, 18, 5, 2, "#9a8a5a");
  // Pick-up flap and the sign.
  g.rect(3, 35, 18, 5, "#24201c");
  g.rect(4, 34, 15, 7, P.paper);
  g.rect(4, 34, 15, 1, "#f0ead8");
  g.set(4, 34, P.tape).set(18, 34, P.tape);
  speckle(g, 1, 1, 22, 42, "#4e302a", 0.05, 3);
  const c = done(g);
  drawPixelText(ctx2d(c), "OUT", 6, 35, "#8e3b32");
  return c;
}

function kitchenIsland(width: number): HTMLCanvasElement {
  // A formica table doing duty as an island: mugs, biscuit tin, the honesty box.
  const g = new Grid(width + 2, 26);
  g.rect(1, 1, width, 12, "#c2b896");
  g.rect(1, 1, width, 1, "#d4cba8");
  speckle(g, 1, 2, width, 10, "#b0a684", 0.12, width);
  g.rect(1, 13, width, 10, "#7a6a50");
  g.rect(1, 13, width, 1, "#8c7b5c");
  for (let x = 6; x < width - 2; x += 14) g.rect(x, 16, 8, 5, "#6e5f47");
  g.rect(20, 17, 8, 4, "#6a5a42");
  // Biscuit tin, a mug tree of chipped mugs, the honesty box, a carton.
  g.ellipse(9, 6, 4, 3, "#7a3a30").ellipse(9, 5.5, 3, 2, "#9a4a3a").set(9, 5, "#c9a24a");
  mug(g, 17, 5, "#8a9aa0");
  mug(g, 22, 7, "#c8bc97");
  mug(g, 27, 4, "#a87a6a");
  g.rect(width - 30, 3, 6, 6, "#6e5a40").rect(width - 29, 3, 4, 1, "#2a2218");
  carton(g, width - 18, 5);
  ring(g, width - 10, 9, "#9a8e6e");
  ring(g, 36, 8, "#9a8e6e");
  return done(g);
}

function stool(): HTMLCanvasElement {
  const g = new Grid(12, 10);
  g.ellipse(5.5, 2.5, 4.5, 2, "#6e4c35");
  g.set(4, 1, "#8a6444").set(7, 3, P.foam).set(6, 3, P.foam);
  g.rect(5, 4, 2, 4, P.metalLo);
  g.rect(3, 8, 6, 1, P.metalLo);
  return done(g);
}

function cooler(): HTMLCanvasElement {
  // The dripping tap: a small pedestal sink with a cracked mirror tile above.
  const g = new Grid(17, 36);
  g.rect(3, 1, 11, 9, "#8a8e84");
  g.rect(4, 2, 9, 7, "#a9b4b0");
  g.set(6, 3, "#d0d8d4").set(7, 4, "#d0d8d4").set(9, 5, "#6a706a").set(10, 6, "#6a706a").set(10, 7, "#6a706a");
  g.rect(7, 10, 3, 2, P.metal);
  g.rect(8, 12, 2, 2, P.metalHi);
  g.rrect(1, 14, 15, 6, "#d8d2be", 1);
  g.rect(3, 15, 11, 3, "#a8a492");
  g.set(8, 16, "#6a6a62");
  g.rect(2, 19, 13, 1, "#bdb7a2");
  g.rect(6, 20, 5, 13, "#d0cab6");
  g.rect(6, 20, 1, 13, "#e2dcc8");
  g.rect(4, 33, 9, 1, "#bdb7a2");
  // A stain where it's dripped for years.
  g.rect(9, 15, 2, 2, "#8a7a52");
  return done(g);
}

// ------------------------------------------------------------------ meeting room

function meetingTable(): HTMLCanvasElement {
  // A wobbly table: peeling veneer, rings, a folded wedge under one leg.
  const g = new Grid(68, 30);
  g.rect(1, 1, 66, 20, "#8a7050");
  g.rect(1, 1, 66, 1, "#a08660");
  g.rect(1, 20, 66, 2, "#6a543a");
  g.rect(1, 22, 66, 1, "#3e3024");
  g.rect(58, 2, 8, 4, "#b8a27a").rect(60, 6, 5, 2, "#b8a27a");
  speckle(g, 1, 2, 66, 18, "#7c6446", 0.05, 68);
  ring(g, 12, 15, "#5e4a34", true);
  ring(g, 50, 6, "#5e4a34");
  ring(g, 44, 16, "#5e4a34");
  g.rect(3, 23, 3, 5, P.metalDk).rect(62, 23, 3, 4, P.metalDk);
  g.rect(61, 27, 5, 1, P.paper);
  // A pen pot of dried-out pens, a cold tea, sugar sachets.
  g.rect(4, 4, 3, 4, "#6a6252").set(4, 3, "#8e3b32").set(6, 2, "#4c5d70").set(5, 3, "#2f2c28");
  mug(g, 60, 9, "#c8bc97");
  g.set(22, 17, "#e6dfc8").set(23, 17, "#e6dfc8").set(26, 18, "#c9a24a").set(27, 18, "#c9a24a");
  return done(g);
}

function whiteboard(w: number): HTMLCanvasElement {
  // A grubby whiteboard: ghosts of old meetings won't wipe off.
  const g = new Grid(w + 2, 46);
  g.rect(1, 1, w, 34, P.metalLo);
  g.rect(1, 1, w, 1, P.metal);
  g.rect(3, 3, w - 4, 30, "#e2dfd2");
  const r = rng(w * 7);
  for (let k = 0; k < 6; k++) {
    const x = 5 + Math.floor(r() * (w - 20));
    const y = 5 + Math.floor(r() * 22);
    const len = 6 + Math.floor(r() * 12);
    for (let i = 0; i < len; i++) g.set(x + i, y + Math.round(Math.sin(i * 0.7 + k) * 1), "#cfcbbc");
  }
  g.rect(w - 14, 4, 6, 4, "#d2cebf").rect(w - 14, 4, 6, 1, "#cfcbbc");
  g.rect(4, 26, 5, 6, "#d6cdb0");
  // A yellowed DO NOT ERASE note, curling.
  g.rect(w - 9, 4, 6, 6, "#e2d27a").set(w - 4, 9, "#c9b85c");
  g.set(w - 8, 6, "#8e3b32").set(w - 7, 6, "#8e3b32").set(w - 6, 6, "#8e3b32").set(w - 8, 8, "#8e3b32").set(w - 6, 8, "#8e3b32");
  g.rect(1, 35, w, 2, P.metalDk);
  g.rect(8, 34, 6, 1, "#7a3a30").rect(20, 34, 3, 1, "#2f2c28");
  // Legs: one bent and taped.
  g.rect(4, 37, 2, 8, P.metalDk);
  g.rect(w - 5, 37, 2, 4, P.metalDk).rect(w - 4, 41, 2, 4, P.metalDk);
  g.rect(w - 6, 40, 4, 2, P.tape);
  return done(g);
}

function planRolls(): HTMLCanvasElement {
  // A cardboard box of old rolled maps and floor plans.
  const g = new Grid(18, 28);
  const rolls: [number, number, string][] = [
    [3, 3, "#9aa6a8"],
    [8, 5, "#d3c8a6"],
    [12, 2, "#8a9a9c"],
    [6, 8, "#c4b896"],
  ];
  for (const [x, y, c] of rolls) {
    g.rect(x, y, 3, 14, c);
    g.rect(x, y, 3, 1, shade(c, 0.15));
    g.set(x + 1, y, shade(c, -0.3));
  }
  g.rect(2, 15, 14, 12, P.card);
  g.rect(2, 15, 14, 1, P.cardHi);
  g.rect(2, 15, 3, 2, P.cardLo).rect(13, 14, 4, 2, P.cardHi);
  g.rect(3, 20, 12, 2, P.tape);
  return done(g);
}

function glassFront(w: number, gapX: number, wood: boolean): HTMLCanvasElement {
  const g = new Grid(w, 11);
  const frame = wood ? "#4f3a2a" : "#6f716a";
  const light = wood ? "#6e5440" : "#94968e";
  const glass = wood ? "#cbbf9cdd" : "#b4c0bab0";
  const smear = wood ? "#d8ceaedd" : "#d6ded8c0";
  const dirt = wood ? "#ab9f7cdd" : "#9aa49cb8";
  for (let x = 0; x < w; x++) {
    if (gapX >= 0 && x >= gapX - 9 && x < gapX + 9) continue;
    g.set(x, 0, frame).set(x, 1, light);
    for (let y = 2; y < 9; y++) g.set(x, y, glass);
    g.set(x, 9, frame).set(x, 10, wood ? "#33261a" : "#4e5048");
    // Smears, handprints and grime along the bottom.
    if ((x * 5) % 17 < 3) g.set(x, 3 + (x % 3), smear).set(x + 1, 4 + (x % 3), smear);
    if ((x * 11) % 7 === 0) g.set(x, 8, dirt);
  }
  for (let x = 12; x < w; x += 24) {
    if (gapX >= 0 && x >= gapX - 10 && x < gapX + 10) continue;
    g.vline(x, 1, 9, frame);
  }
  // A crack, taped across.
  const cx = Math.round(w * 0.3);
  if (!(gapX >= 0 && cx >= gapX - 12 && cx < gapX + 12)) {
    g.set(cx, 3, "#eef2ee").set(cx + 1, 4, "#eef2ee").set(cx + 1, 5, "#eef2ee").set(cx + 2, 6, "#eef2ee");
    g.rect(cx - 2, 4, 6, 2, P.tape);
  }
  // Notes stuck on the office partition.
  if (wood) {
    for (let x = 8; x < w - 8; x += 37) {
      if (gapX >= 0 && x >= gapX - 14 && x < gapX + 12) continue;
      g.rect(x, 3, 4, 4, "#e2d27a").set(x + 1, 4, "#8a7a3a");
    }
  }
  return g.toCanvas();
}

// ------------------------------------------------------------------ the corridor (waiting)

function waitingSofa(w: number): HTMLCanvasElement {
  // Brown vinyl, split seams, a tape repair.
  const g = new Grid(w + 2, 22);
  g.rrect(3, 1, w - 4, 11, P.vinylLo, 2);
  g.rect(5, 2, w - 8, 1, P.vinyl);
  g.rect(1, 6, 5, 12, P.vinyl).rect(w - 4, 6, 5, 12, P.vinyl);
  g.rect(1, 6, 5, 1, P.vinylHi).rect(w - 4, 6, 5, 1, P.vinylHi);
  g.rect(6, 10, w - 10, 7, P.vinyl);
  const half = Math.floor((w - 10) / 2);
  g.rect(6, 10, half - 1, 2, P.vinylHi).rect(6 + half + 1, 10, half - 1, 2, P.vinylHi);
  g.rect(9, 13, 4, 1, P.foam).set(8, 13, OUTLINE).set(13, 13, OUTLINE);
  g.rect(w - 14, 4, 5, 3, P.tape);
  g.rect(1, 17, w, 2, P.vinylLo);
  g.rect(3, 19, 2, 2, P.metalDk).rect(w - 3, 19, 2, 2, P.metalDk);
  speckle(g, 1, 1, w, 17, "#4a3020", 0.04, w * 3);
  return done(g);
}

function waitingSofaBack(w: number): HTMLCanvasElement {
  const g = new Grid(w + 2, 16);
  g.rect(1, 1, w, 10, P.mustLo);
  g.rect(1, 1, w, 2, P.must);
  g.rect(3, 3, w - 4, 1, shade(P.must, -0.05));
  for (let x = 3; x < w; x += 4) g.vline(x, 4, 6, shade(P.mustLo, -0.06));
  g.rect(w - 12, 5, 4, 3, "#6a5420");
  g.rect(1, 11, w, 2, "#5e4c22");
  g.rect(2, 13, 2, 2, P.woodDk).rect(w - 2, 13, 2, 2, P.woodDk);
  return done(g);
}

function waitingArmchair(left: boolean): HTMLCanvasElement {
  const g = new Grid(18, 20);
  const body = P.olive;
  const hi = P.oliveHi;
  const lo = P.oliveLo;
  g.rrect(1, 1, 5, 15, lo, 1);
  g.rect(2, 2, 2, 12, body);
  g.rect(5, 9, 11, 6, body);
  g.rect(5, 9, 11, 2, hi);
  g.rect(13, 7, 4, 8, lo).rect(13, 7, 4, 1, body);
  g.rect(8, 11, 3, 2, "#4f4a2a");
  g.rect(1, 15, 16, 2, lo);
  g.rect(2, 17, 2, 2, P.woodDk).rect(14, 17, 2, 2, P.woodDk);
  const c = done(g);
  if (!left) return c;
  return makeCanvas(c.width, c.height, (ctx) => {
    ctx.translate(c.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(c, 0, 0);
  });
}

function reception(): HTMLCanvasElement {
  // A battered counter: brass bell, a sign-in clipboard, a dead plant.
  const g = new Grid(36, 22);
  g.rect(1, 6, 34, 6, "#b4ac92");
  g.rect(1, 6, 34, 1, "#c8c0a6");
  g.rect(1, 12, 34, 9, "#7a6446");
  g.rect(4, 14, 28, 5, "#86704f");
  g.rect(20, 15, 4, 3, "#9a8460");
  speckle(g, 1, 12, 34, 9, "#6a543a", 0.06, 36);
  g.ellipse(9, 4, 3.5, 2.5, "#b8963a");
  g.rect(6, 5, 7, 1, "#8a6e2a");
  g.set(9, 1, "#b8963a").set(8, 3, "#d4b45a");
  g.rect(15, 3, 6, 5, "#7a5e3a").rect(16, 4, 4, 3, P.paper).set(17, 5, P.paperLine).set(18, 2, P.metal);
  g.rect(26, 3, 4, 4, "#8a5a3a").set(27, 1, P.leafDead).set(28, 0, P.leafDry).set(29, 2, P.leafDead).set(26, 2, P.leafDead);
  ring(g, 32, 8, "#8a8068");
  return done(g);
}

// ------------------------------------------------------------------ your office

function bossDesk(w: number): HTMLCanvasElement {
  // The messiest desk in the building: files, cartons, mugs, a beige monitor.
  const g = new Grid(w + 2, 30);
  g.rect(1, 1, w, 12, "#5a4030");
  g.rect(1, 1, w, 1, "#74563e");
  g.rect(1, 13, w, 12, "#4a3426");
  g.rect(1, 13, w, 1, "#644836");
  g.rect(4, 16, w - 8, 7, "#3e2c20");
  g.rect(Math.round(w / 2) - 5, 18, 10, 2, "#8a7a4a");
  // A drawer that won't shut, files poking out.
  g.rect(6, 15, 12, 3, "#5a4030").rect(7, 14, 9, 1, P.paperOld);
  // The beige monitor's back, a tower of files, takeaway, mugs.
  g.rect(8, 1, 14, 9, P.beigeLo).rect(9, 2, 12, 6, P.beige).rect(12, 9, 6, 2, P.beigeDk);
  g.set(10, 3, P.beigeHi);
  papers(g, 25, 5, 8, 6, 4);
  carton(g, w - 22, 4);
  mug(g, w - 9, 3, "#c8bc97");
  mug(g, w - 14, 8, "#7a8a6a");
  g.rect(w - 6, 8, 4, 3, "#9a6a3a").set(w - 5, 8, "#c9b98a");
  ring(g, w - 18, 10, "#3a2a1e");
  ring(g, 6, 9, "#3a2a1e");
  // Box files stacked at the very edge.
  g.rect(1, 3, 5, 9, "#6a7a5a").rect(1, 3, 5, 1, "#7f8f6a").set(3, 6, P.paper);
  return done(g);
}

function bossChair(): HTMLCanvasElement {
  // Cracked leatherette, tape on the arm, one castor short.
  const g = new Grid(22, 26);
  g.rrect(2, 1, 18, 18, "#3a2a22", 3);
  g.rect(4, 3, 14, 1, "#56402f");
  for (let y = 6; y < 16; y += 4) g.rect(5, y, 12, 1, "#4a3428");
  g.set(7, 8, "#6a5040").set(8, 9, "#6a5040").set(9, 9, "#6a5040").set(13, 12, P.foam).set(14, 12, P.foam);
  g.rect(1, 12, 3, 8, "#3a2a22").rect(18, 12, 3, 8, "#3a2a22");
  g.rect(18, 14, 3, 2, P.tape);
  g.rect(10, 19, 2, 4, P.metalDk).rect(5, 23, 12, 1, P.metalDk).set(16, 24, P.metalDk);
  return done(g);
}

function armchair(): HTMLCanvasElement {
  // The stained armchair: mustard, threadbare arms, a cushion that's seen things.
  const g = new Grid(28, 26);
  const c = P.must;
  g.rrect(4, 1, 20, 16, c, 3);
  g.rect(6, 2, 16, 1, P.mustHi);
  g.rrect(1, 9, 6, 13, shade(c, -0.1), 2);
  g.rrect(21, 9, 6, 13, shade(c, -0.1), 2);
  g.rect(6, 15, 16, 6, shade(c, -0.18));
  g.rect(2, 11, 3, 3, "#b8a87a").rect(23, 12, 3, 2, "#b8a87a");
  g.ellipse(13, 9, 3, 2, "#7a6428");
  g.ellipse(17, 17, 2, 1, "#6a5420");
  g.rect(4, 22, 2, 2, P.woodDk).rect(22, 22, 2, 2, P.woodDk);
  return done(g);
}

function lamp(): HTMLCanvasElement {
  // A standard lamp with a scorched, tilted shade.
  const g = new Grid(16, 52);
  for (let j = 0; j < 9; j++) {
    const inset = Math.max(0, 3 - Math.floor(j / 2));
    g.rect(2 + inset - (j > 4 ? 0 : 0), 1 + j, 12 - inset * 2 + (j < 3 ? 1 : 0), 1, j < 2 ? "#d8cba0" : "#cbbd90");
  }
  g.rect(3, 8, 10, 2, "#b0a278");
  g.rect(5, 3, 3, 2, "#a08a5a");
  g.rect(7, 10, 2, 38, P.metalLo).set(7, 25, P.tape).set(8, 25, P.tape).set(7, 26, P.tape).set(8, 26, P.tape);
  g.rect(4, 48, 8, 2, P.metalDk);
  return done(g);
}

function bookshelf(): HTMLCanvasElement {
  // A sagging shelf of box files and binders, leaning; dust on top.
  const g = new Grid(38, 36);
  g.rect(1, 6, 36, 28, P.woodLo);
  g.rect(1, 6, 36, 2, P.wood);
  g.rect(3, 9, 32, 10, "#3e3024");
  g.rect(3, 21, 32, 10, "#3e3024");
  // The middle shelf bows.
  g.rect(1, 19, 36, 2, P.wood);
  g.rect(12, 21, 14, 1, P.wood);
  const colors = ["#6a7a5a", "#7a3a30", "#4c5d70", "#a88a3e", "#c8bc97", "#6e5a40"];
  let x = 4;
  let i = 0;
  while (x < 33) {
    const bw = 3 + (i % 2);
    const bh = 8 + (i % 2);
    const lean = i === 4 ? 1 : 0;
    g.rect(x + lean, 19 - bh, bw, bh, colors[i % colors.length]!);
    g.rect(x + lean + 1, 19 - bh + 2, bw - 2, 2, P.paper);
    x += bw + (i === 3 ? 2 : 0);
    i++;
  }
  // Lower shelf: loose papers and a toppled stack.
  papers(g, 5, 28, 10, 3, 3);
  g.rect(18, 25, 3, 6, "#4c5d70").rect(21, 27, 8, 3, "#7a3a30").rect(29, 24, 3, 7, "#6a7a5a");
  // On top: a dusty box and a dead plant (globes are live elsewhere).
  g.rect(22, 2, 12, 4, P.card).rect(22, 2, 12, 1, P.cardHi).rect(27, 2, 2, 4, P.tape);
  g.rect(6, 3, 4, 3, "#8a5a3a").set(7, 1, P.leafDead).set(8, 0, P.leafDry).set(6, 2, P.leafDead).set(9, 2, P.leafDead);
  return done(g);
}

function printer(): HTMLCanvasElement {
  // A beige workhorse that jams on principle.
  const g = new Grid(30, 26);
  g.rect(2, 8, 26, 16, P.beigeLo);
  g.rect(2, 8, 26, 1, P.beige);
  g.rect(5, 12, 20, 9, P.beigeDk);
  g.rrect(3, 1, 24, 8, P.beige, 1);
  g.rect(5, 3, 20, 2, "#3a3630");
  // A crumpled jam poking out of the side, a blinking amber light.
  g.rect(25, 13, 4, 3, P.paper).set(28, 12, P.paper).set(26, 14, P.paperLine);
  g.set(24, 6, "#d08a3a");
  g.rect(7, 22, 4, 1, P.paperOld);
  speckle(g, 2, 1, 26, 22, "#9a8e6a", 0.05, 30);
  return done(g);
}

function dogBed(): HTMLCanvasElement {
  // A cardboard box with a tatty blanket: the dog's favourite.
  const g = new Grid(26, 14);
  g.rect(2, 3, 22, 10, P.cardLo);
  g.rect(2, 3, 22, 1, P.card);
  g.rect(4, 4, 18, 6, "#6e5a6a");
  g.rect(5, 5, 6, 3, "#857088").set(16, 7, "#857088").set(18, 6, "#857088");
  g.rect(2, 9, 22, 4, P.card);
  g.rect(2, 9, 22, 1, P.cardHi);
  g.rect(10, 10, 6, 2, P.tape);
  g.rect(0, 1, 4, 3, P.cardHi).rect(22, 1, 4, 3, P.cardHi);
  return done(g);
}

// ------------------------------------------------------------------ games room

function pingPong(): HTMLCanvasElement {
  const w = 74;
  const h = 24;
  const g = new Grid(w + 2, h + 2);
  g.rect(1, 1, w, 13, "#4a6650");
  g.rect(1, 1, w, 1, "#c8c4b0").rect(1, 13, w, 1, "#c8c4b0");
  g.vline(1, 1, 13, "#c8c4b0").vline(w, 1, 13, "#c8c4b0");
  g.hline(2, 7, w - 2, "#a8b0a0");
  g.rect(1, 14, w, 3, "#3a5240");
  speckle(g, 2, 2, w - 2, 11, "#40594a", 0.12, 74);
  // A chunk out of one corner, a sagging net held up with tape.
  g.rect(w - 4, 11, 4, 3, null);
  g.rect(w - 4, 14, 4, 3, null);
  g.rect(w - 5, 11, 1, 6, "#8a7a5a");
  const nx = 1 + Math.floor(w / 2);
  g.rect(nx, 0, 1, 15, "#d8d2c0");
  g.rect(nx - 1, 0, 3, 1, "#a8a290");
  for (let y = 2; y < 14; y += 2) g.set(nx, y, "#b8b2a0");
  g.set(nx, 6, "#5f5a4a").set(nx, 7, "#5f5a4a");
  g.rect(nx - 1, 9, 3, 2, P.tape);
  g.rect(4, 17, 2, 7, P.metalDk).rect(w - 7, 17, 2, 7, P.metalDk);
  g.rect(nx - 6, 17, 2, 5, P.metalDk).rect(nx + 5, 17, 2, 5, P.metalDk);
  return done(g);
}

function arcade(): HTMLCanvasElement {
  // A second-hand cabinet: sun-faded art, a burnt-out marquee, scratches.
  const w = 24;
  const h = 46;
  const g = new Grid(w + 2, h + 2);
  const body = "#3e3a4a";
  g.rect(2, 1, w - 2, h - 1, body);
  g.rect(1, 1, w, 8, "#6a4a5a");
  g.rect(3, 3, w - 4, 4, "#8a7a70");
  for (let i = 0; i < 4; i++) g.set(5 + i * 4, 5, i === 2 ? "#5a4a50" : "#c8a090");
  g.rect(3, 10, w - 4, 14, "#100e14");
  g.rect(1, 25, w, 6, "#4e4a5e");
  g.set(6, 27, "#a04a40").set(9, 28, "#4a7a90").set(12, 27, "#3a3640");
  g.rect(16, 26, 1, 3, "#2a2a2a").set(16, 25, "#a04a40");
  g.rect(2, 32, w - 2, h - 33, shade(body, -0.15));
  g.rect(8, 36, 8, 3, "#2a2632").set(11, 37, "#8a7a5a");
  g.rect(3, 33, 4, 6, "#57506a").set(4, 34, "#6a6280");
  g.rect(18, 40, 4, 2, P.tape);
  speckle(g, 2, 1, w - 2, h - 1, "#34303e", 0.05, 24);
  return done(g);
}

function dartboard(): HTMLCanvasElement {
  // A cork board riddled with holes, on a stand; the wall behind has had it worse.
  const g = new Grid(20, 34);
  g.ellipse(9.5, 9.5, 8.5, 8.5, "#2f2b26");
  g.ellipse(9.5, 9.5, 7, 7, "#7a3a30");
  g.ellipse(9.5, 9.5, 5.5, 5.5, "#c9b88e");
  g.ellipse(9.5, 9.5, 3.5, 3.5, "#4f6a46");
  g.ellipse(9.5, 9.5, 1.5, 1.5, "#7a3a30");
  speckle(g, 2, 2, 16, 16, "#3a2a20", 0.1, 20);
  g.rect(9, 19, 2, 12, P.metalLo);
  g.rect(5, 31, 10, 2, P.metalDk);
  return done(g);
}

function cornhole(): HTMLCanvasElement {
  const g = new Grid(16, 22);
  g.rect(1, 1, 14, 20, P.wood);
  g.rect(1, 1, 14, 1, P.woodHi);
  g.rect(3, 3, 10, 16, "#4c5d70");
  g.ellipse(7.5, 7, 2.5, 2.5, "#1a1814");
  g.rect(3, 13, 10, 2, "#5c6d80").set(12, 17, "#6a543a");
  return done(g);
}

function planter(width: number): HTMLCanvasElement {
  // A long trough of dry soil, dead stalks and a crisp packet.
  const g = new Grid(width, 20);
  g.rect(1, 12, width - 2, 7, "#5a5650");
  g.rect(1, 12, width - 2, 2, "#6e6a62");
  g.rect(2, 11, width - 4, 1, "#4a3a2a");
  for (let x = 6; x < width - 4; x += 12) g.rect(x, 15, 6, 1, "#4a4640");
  g.outline(OUTLINE);
  const c = g.toCanvas();
  const ctx = ctx2d(c);
  const r = rng(width);
  const cols = [P.leafDead, P.leafDry, "#6e5a36", P.leafSick];
  for (let x = 3; x < width - 3; x += 3) {
    if (r() < 0.35) continue;
    const h = 2 + Math.floor(r() * 6);
    ctx.fillStyle = cols[Math.floor(r() * cols.length)]!;
    ctx.fillRect(x, 12 - h, 1, h);
    if (r() < 0.6) ctx.fillRect(x + 1, 12 - h + 1, 1, 1);
  }
  ctx.fillStyle = "#c4383f";
  ctx.fillRect(Math.round(width * 0.6), 10, 3, 2);
  ctx.fillStyle = "#e6dfc8";
  ctx.fillRect(Math.round(width * 0.6) + 1, 10, 1, 1);
  return c;
}

function bench(): HTMLCanvasElement {
  const g = new Grid(36, 16);
  for (const y of [1, 4]) g.rect(2, y, 32, 2, "#8a7a5a").rect(2, y, 32, 1, "#a0906a");
  g.rect(20, 4, 3, 2, null);
  g.rect(4, 3, 2, 6, P.metalDk).rect(30, 3, 2, 6, P.metalDk);
  g.rect(1, 8, 34, 3, "#8a7a5a").rect(1, 8, 34, 1, "#a0906a");
  speckle(g, 1, 1, 34, 10, "#6f8a5c", 0.05, 36);
  g.rect(3, 11, 2, 4, P.metalDk).rect(31, 11, 2, 4, P.metalDk);
  return done(g);
}

// ------------------------------------------------------------------ the cupboard (server)

function serverRack(): HTMLCanvasElement {
  // A rack of dusty old boxes, cables hanging out the front.
  const g = new Grid(16, 33);
  g.rect(1, 1, 14, 30, "#3a3934");
  g.rect(1, 1, 14, 1, "#55534a");
  for (let y = 3; y < 29; y += 4) {
    g.rect(3, y, 10, 3, y % 8 === 3 ? "#8a8470" : "#4a4842");
    g.rect(3, y, 10, 1, y % 8 === 3 ? "#a09a84" : "#5a5850");
    g.rect(4, y + 1, 5, 1, "#24231f");
  }
  // Cable spaghetti.
  g.rect(13, 6, 1, 8, "#3e5a7a").rect(14, 13, 1, 10, "#3e5a7a").rect(2, 10, 1, 12, "#a89a3a").rect(1, 21, 1, 6, "#a89a3a");
  g.set(12, 18, "#7a3a30").set(13, 19, "#7a3a30").set(13, 20, "#7a3a30");
  g.rect(1, 31, 14, 1, "#24231f");
  speckle(g, 1, 1, 14, 30, "#5f5c52", 0.06, 16);
  return done(g);
}

function aiRack(): HTMLCanvasElement {
  // The "AI box": a beige tower stack with case fans, a taped label band.
  const g = new Grid(20, 33);
  g.rect(1, 1, 18, 30, "#7f755a");
  g.rect(1, 1, 18, 6, "#4a3e5e");
  g.rect(2, 7, 16, 1, "#5f5744");
  for (let y = 8; y < 29; y += 6) {
    g.rect(3, y, 14, 4, P.beigeLo);
    g.rect(3, y, 14, 1, P.beige);
    g.ellipse(6.5, y + 1.5, 1.5, 1.5, "#1c1a16");
    g.ellipse(12.5, y + 1.5, 1.5, 1.5, "#1c1a16");
  }
  g.rect(16, 4, 3, 9, P.tape);
  g.rect(1, 31, 18, 1, "#24231f");
  return done(g);
}

// ------------------------------------------------------------------ seating: chairs and PA sprites

function woodenChair(name: "WOODEN_CHAIR_BACK" | "WOODEN_CHAIR_FRONT", seed: number): HTMLCanvasElement {
  return shabby(pa(name), seed, 0.08);
}

/** A waiting-room chair seen from the front, 16×16: plastic, vinyl, an office chair or a kitchen chair. */
function oddChair(v: number): HTMLCanvasElement {
  const g = new Grid(16, 16);
  if (v === 0) {
    // Moulded orange plastic, stacked once too often.
    const c = "#b0603a";
    g.rrect(3, 1, 10, 7, c, 2);
    g.rect(4, 2, 8, 1, "#c8784c");
    g.rect(6, 4, 4, 1, "#8e4a2c");
    g.rrect(2, 8, 12, 4, c, 1);
    g.rect(3, 8, 10, 1, "#c8784c");
    g.rect(3, 12, 1, 3, P.metal).rect(12, 12, 1, 3, P.metal);
    g.set(9, 9, "#8e4a2c");
  } else if (v === 1) {
    // Brown vinyl, split and taped.
    g.rect(3, 1, 10, 7, P.vinylLo);
    g.rect(4, 2, 8, 5, P.vinyl);
    g.rect(2, 8, 12, 4, P.vinyl);
    g.rect(3, 8, 10, 1, P.vinylHi);
    g.rect(7, 9, 3, 1, P.foam);
    g.rect(4, 3, 3, 2, P.tape);
    g.rect(3, 12, 2, 3, P.woodDk).rect(11, 12, 2, 3, P.woodDk);
  } else if (v === 2) {
    // An office chair that lost its wheels and its armrests.
    g.rrect(3, 0, 10, 8, "#4e5560", 2);
    g.rect(4, 1, 8, 1, "#626a76");
    g.rect(2, 8, 12, 4, "#5c6470");
    g.rect(3, 8, 10, 1, "#6e7684");
    g.rect(7, 12, 2, 2, P.metalDk);
    g.rect(4, 14, 8, 1, P.metalDk);
    g.set(10, 10, "#4a5058");
  } else {
    // A kitchen chair from somebody's house clearance.
    g.rect(3, 0, 2, 9, P.wood).rect(11, 0, 2, 9, P.wood);
    g.rect(3, 1, 10, 2, P.woodHi);
    g.rect(5, 4, 6, 1, P.woodLo).rect(5, 6, 6, 1, P.woodLo);
    g.rect(2, 9, 12, 3, P.wood);
    g.rect(2, 9, 12, 1, P.woodHi);
    g.rect(3, 12, 1, 3, P.woodDk).rect(12, 12, 1, 3, P.woodDk);
    g.set(8, 10, P.stain);
  }
  return done(g);
}

// ------------------------------------------------------------------ plants

/** Leaves turned brown and yellow; the cactus is the one survivor. */
function wilt(src: HTMLCanvasElement, seed: number, alive: number): HTMLCanvasElement {
  const r = rng(seed);
  return mapPixels(src, (cr, cg, cb, a, x, y) => {
    const green = cg > cr + 12 && cg > cb + 6;
    if (!green) {
      // Pots: faded and dirty.
      const grey = 0.3 * cr + 0.59 * cg + 0.11 * cb;
      return [grey + (cr - grey) * 0.6 - 6, grey + (cg - grey) * 0.6 - 8, grey + (cb - grey) * 0.6 - 10, a];
    }
    const light = (cr + cg + cb) / 3;
    const k = r();
    // Lower leaves die first.
    const dead = k > alive || y > src.height * 0.55 + x * 0;
    if (dead) {
      const tone = light > 110 ? [168, 136, 74] : light > 80 ? [138, 106, 58] : [104, 80, 46];
      return [tone[0]!, tone[1]!, tone[2]!, a];
    }
    return [cr * 0.85 + 20, cg * 0.8 + 10, cb * 0.6, a];
  });
}

function plantSprite(sprite: PlantPlacement["sprite"], classic: () => HTMLCanvasElement): HTMLCanvasElement {
  return cached(`annex|plant|${sprite}`, () => {
    const src = classic();
    switch (sprite) {
      case "CACTUS":
        // The stubborn survivor: a bit dusty, otherwise thriving.
        return grime(adjust(src, { sat: 0.8, light: -0.03 }), 91, 0.2);
      case "LARGE_PLANT":
        return wilt(src, 17, 0.6);
      case "HANGING_PLANT":
        return wilt(src, 23, 0.2);
      case "POT":
        return shabby(src, 5);
      default:
        return wilt(src, hash(sprite), 0.35);
    }
  });
}

// ------------------------------------------------------------------ the prop hook

function propSprite(p: PropPlacement, L: Layout, classic: () => HTMLCanvasElement): HTMLCanvasElement | null {
  const k = (id: string, build: () => HTMLCanvasElement) => cached(`annex|prop|${id}`, build);
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
      return k("beanbag-blue", () => beanbag("#5f6a72"));
    case "beanbag-pink":
      return k("beanbag-pink", () => beanbag("#8a5e5a"));
    case "armchair":
      return k("armchair", armchair);
    case "bookshelf":
      return k("bookshelf", bookshelf);
    case "lamp":
      return k("lamp", lamp);
    case "printer":
      return k("printer", printer);
    case "cooler":
      return k("cooler", cooler);
    case "meeting-table":
      return k("meeting-table", meetingTable);
    case "meeting-chair-back":
    case "guest-chair":
      return k("chair-back", () => woodenChair("WOODEN_CHAIR_BACK", 31));
    case "meeting-chair-front":
      return k("chair-front", () => woodenChair("WOODEN_CHAIR_FRONT", 37));
    case "plan-rolls":
      return k("plan-rolls", planRolls);
    case "glass-front": {
      // The room whose front edge this is (rooms can share x and width, so match the bottom too).
      const room = L.rooms.find((r) => r.walls && r.rect.x === p.x && r.rect.w === p.w && r.rect.y + r.rect.h - 10 === p.y);
      const gap = room?.doorSide === "bottom" && room.doorX !== undefined ? room.doorX - room.rect.x : -1;
      const wood = room?.walls === "wood";
      return k(`front-${p.w}-${gap}-${wood}-${p.y}`, () => glassFront(p.w ?? 100, gap, wood));
    }
    case "planter":
      return k(`planter-${p.w}`, () => planter(p.w ?? 48));
    case "kitchen-island":
      return k(`island-${p.w}`, () => kitchenIsland(p.w ?? 72));
    case "kitchen-counter":
      return k(`counter-${p.w}`, () => kitchenCounter(p.w ?? 100));
    case "stool":
      return k("stool", stool);
    case "fridge":
      return k("fridge", fridge);
    case "vending":
      return k("vending", vending);
    case "fishtank-stand":
      return k("fishtank-stand", fishtankStand);
    case "whiteboard":
      return k(`whiteboard-${p.w}`, () => whiteboard(p.w ?? 80));
    case "tv":
      return k(`tv-${p.w}-${L.tv.h}-${p.z > 0}`, () => tv(p.w ?? 120, L.tv.h, p.z > 0));
    case "piano":
      return k("piano", piano);
    case "dartboard":
      return k("dartboard", dartboard);
    case "cornhole":
      return k("cornhole", cornhole);
    case "waiting-sofa":
      return k(`wait-sofa-${p.w}`, () => waitingSofa(p.w ?? 42));
    case "waiting-sofa-back":
      return k(`wait-sofa-back-${p.w}`, () => waitingSofaBack(p.w ?? 42));
    case "waiting-armchair":
      return k("wait-arm-r", () => waitingArmchair(false));
    case "waiting-armchair-left":
      return k("wait-arm-l", () => waitingArmchair(true));
    case "lounge-table":
      return k("lounge-table", loungeTable);
    case "bench":
      return k("bench", bench);
    case "espresso":
      return k("espresso", espresso);
    case "server-rack":
      return k("server-rack", serverRack);
    case "ai-rack":
      return k("ai-rack", aiRack);
    case "side-table":
      return k("side-table", sideTable);
    case "reception":
      return k("reception", reception);
    case "boss-desk":
      return k(`boss-desk-${p.w}`, () => bossDesk(p.w ?? 60));
    case "boss-chair":
      return k("boss-chair", bossChair);
    case "dog-bed":
      return k("dog-bed", dogBed);
    case "waiting-chair": {
      // No two alike: whatever chairs the building had left over.
      const v = hash(p.id) % 5;
      return k(`waiting-chair-${v}`, () => (v === 4 ? shabby(classic(), 11, 0.1) : oddChair(v)));
    }
    case "bin":
      return k("bin", () => {
        // Overflowing, as ever.
        const c = shabby(classic(), 13, 0.1);
        const ctx = ctx2d(c);
        for (const [x, y] of [[5, 1], [8, 0], [10, 2]] as const) {
          ctx.fillStyle = OUTLINE;
          ctx.fillRect(x - 1, y - 1 + 1, 5, 4);
          ctx.fillStyle = P.paper;
          ctx.fillRect(x, y + 1, 3, 2);
          ctx.fillStyle = P.paperLine;
          ctx.fillRect(x + 1, y + 2, 1, 1);
        }
        return c;
      });
    case "sofa-front":
    case "sofa-back":
    case "library-shelf":
    case "library-table":
    case "low-shelf":
    default:
      return k(`shabby-${p.kind}-${p.w ?? 0}`, () => shabby(classic(), hash(p.kind), 0.1));
  }
}

function speaker(): HTMLCanvasElement {
  return cached("annex|speaker", () => {
    // A hi-fi speaker in wood-effect veneer, its grille cloth sagging and taped.
    const g = new Grid(12, 28);
    g.rect(1, 1, 10, 26, "#5e4632");
    g.rect(1, 1, 10, 1, "#7a5e44");
    g.rect(2, 3, 8, 22, "#3a342c");
    for (let y = 4; y < 24; y += 2) g.rect(2, y, 8, 1, "#423b32");
    g.ellipse(5.5, 8, 2.5, 2.5, "#2a2620");
    g.ellipse(5.5, 8, 1, 1, "#5a5248");
    g.ellipse(5.5, 17, 3, 3, "#2a2620");
    g.ellipse(5.5, 17, 1.2, 1.2, "#5a5248");
    g.rect(7, 20, 3, 4, "#4a4238").set(8, 21, P.foam);
    g.rect(2, 3, 3, 2, P.tape);
    g.rect(1, 25, 10, 2, "#4a3828");
    g.outline(OUTLINE);
    return g.toCanvas();
  });
}

export const PROPS: Pick<Theme, "prop" | "plant" | "speaker"> = {
  prop: propSprite,
  plant: plantSprite,
  speaker: () => speaker(),
};
