// Startup House: the furniture. Everything is secondhand, borrowed or
// assembled at 2 a.m.: a sagging corduroy sectional, a door on sawhorses for
// the meeting table, folding tables for desks, a fridge covered in stickers,
// a drinks fridge full of energy drinks, an espresso machine nobody cleans, a
// rack of mismatched servers. Every prop keeps its classic size; live details
// (screens, steam, the fridge door, marker strokes) land where they always do.

import type { Layout, PlantPlacement, PropPlacement } from "../../layout.ts";
import { Grid, hash, recolor, shade } from "../../themekit.ts";
import { C, CANS, can, OUTLINE, sprite, text } from "./kit.ts";

// ------------------------------------------------------------------ the living room

function couch(): HTMLCanvasElement {
  // The sectional from behind: corduroy gone shiny, a dip in the middle, a chaise on the right, a blanket over the back.
  return sprite("couch", 84, 28, (g) => {
    const w = 82;
    g.rrect(6, 2, w - 18, 13, C.corduroy, 2);
    for (let x = 8; x < w - 12; x += 2) g.vline(x, 3, 11, C.corduroyHi);
    // The dip where everyone sits.
    g.rect(26, 2, 22, 2, null);
    g.rect(26, 4, 22, 1, C.corduroyLo);
    for (const sx of [Math.round(w / 3), Math.round((2 * w) / 3)]) g.vline(sx, 4, 10, C.corduroyLo);
    // The chaise sticks out on the right.
    g.rrect(w - 16, 0, 16, 23, C.corduroy, 2);
    g.rect(w - 15, 1, 14, 2, C.corduroyHi);
    g.rect(w - 15, 12, 14, 1, C.corduroyLo);
    // Seat fronts and arms.
    g.rect(1, 13, w - 16, 10, C.corduroyLo);
    g.rect(1, 13, w - 16, 1, shade(C.corduroyLo, 0.15));
    g.rrect(0, 4, 8, 19, C.corduroy, 2);
    g.rect(1, 5, 6, 1, C.corduroyHi);
    // A crocheted blanket thrown over the back.
    for (let x = 12; x < 30; x++) for (let y = 2; y < 12 - ((x * 3) % 4 === 0 ? 1 : 0); y++) g.set(x, y, (x + y) % 4 < 2 ? "#e86a6a" : (x + y) % 4 === 2 ? "#f4e2b8" : "#5fa8a0");
    // A pizza box on the chaise.
    g.rect(w - 14, 4, 11, 7, C.box).rect(w - 14, 4, 11, 1, C.boxHi).rect(w - 11, 6, 5, 3, "#c9483a");
    g.rect(3, 23, 3, 2, C.woodDk).rect(w - 4, 23, 3, 2, C.woodDk).rect(Math.round(w / 2), 23, 3, 2, C.woodDk);
  });
}

function coffeeTable(): HTMLCanvasElement {
  // A pallet with a sheet of glass on it: controllers, cans, a pizza box.
  return sprite("coffee-table", 38, 14, (g) => {
    g.rect(1, 1, 36, 7, C.woodHi);
    for (let x = 1; x < 37; x += 6) g.vline(x + 5, 1, 7, C.woodLo);
    g.rect(1, 1, 36, 1, "#e8c08a");
    g.rect(1, 8, 36, 3, C.woodLo);
    g.rect(3, 8, 3, 3, C.woodDk).rect(17, 8, 3, 3, C.woodDk).rect(32, 8, 3, 3, C.woodDk);
    // Glass top glint.
    g.set(3, 2, "#f4ecd8").set(4, 2, "#f4ecd8");
    // Two controllers, a can, a pizza box.
    g.rect(5, 3, 5, 3, C.black).set(5, 3, C.blackHi).set(8, 4, C.red);
    g.rect(12, 4, 5, 3, "#e8e8f0").set(15, 5, C.cyan);
    can(g, 20, 2, CANS[1]!);
    g.rect(25, 2, 10, 5, C.box).rect(25, 2, 10, 1, C.boxHi).rect(27, 4, 6, 1, "#c9483a");
  });
}

function beanbag(color: string, key: string): HTMLCanvasElement {
  return sprite(key, 26, 16, (g) => {
    g.ellipse(12.5, 9, 11.5, 6, color);
    g.ellipse(11, 6.5, 8, 4, shade(color, 0.18));
    g.rect(5, 13, 16, 1, shade(color, -0.22));
    g.set(17, 4, shade(color, 0.4)).set(18, 5, shade(color, 0.4));
    // A sticker or a patch.
    g.rect(15, 9, 3, 2, color === C.denim ? "#f4e2b8" : C.lime);
  });
}

function armchair(): HTMLCanvasElement {
  // A thrift-store recliner, the footrest stuck halfway out.
  return sprite("armchair", 28, 26, (g) => {
    const c = "#8a6a8e";
    const hi = "#a888ac";
    const lo = "#6a4e6e";
    g.rrect(4, 1, 20, 14, c, 3);
    g.rect(6, 2, 16, 2, hi);
    g.rrect(1, 8, 7, 14, c, 2).rrect(20, 8, 7, 14, c, 2);
    g.rect(2, 9, 5, 1, hi).rect(21, 9, 5, 1, hi);
    g.rect(7, 13, 14, 7, hi);
    g.rect(7, 19, 14, 2, lo);
    g.rect(8, 21, 12, 3, c).rect(8, 23, 12, 1, lo);
    g.set(10, 6, lo).set(17, 9, lo).set(14, 15, "#c8a8cc");
  });
}

function lamp(): HTMLCanvasElement {
  // An arc floor lamp with a dented dome, its base a bucket of concrete.
  return sprite("lamp", 16, 52, (g) => {
    g.ellipse(7.5, 6, 6, 4, "#e8e4da");
    g.rect(2, 6, 12, 3, "#e8e4da");
    g.rect(3, 9, 10, 1, "#b8b2a4");
    g.rect(4, 4, 4, 1, "#ffffff");
    g.vline(7, 10, 36, C.steelLo);
    g.vline(8, 10, 36, C.steel);
    g.rect(3, 45, 10, 6, "#8a8a88");
    g.rect(3, 45, 10, 1, "#a8a8a4");
    g.rect(4, 46, 8, 1, "#6a6a68");
  });
}

function piano(): HTMLCanvasElement {
  // A keyboard on an X-stand with a laptop for the synth and a stool behind it.
  return sprite("piano", 32, 32, (g) => {
    g.rect(1, 8, 30, 9, C.black);
    g.rect(2, 9, 28, 2, C.blackHi);
    g.rect(2, 12, 28, 4, "#f4f2ea");
    for (let x = 3; x < 30; x += 2) g.set(x, 12, "#2e2c36").set(x, 13, "#2e2c36");
    g.rect(4, 9, 3, 1, C.red).set(9, 9, C.lime).set(11, 9, C.lime).set(25, 9, C.cyan);
    // The laptop on the end.
    g.rect(20, 3, 9, 5, "#c9ced6").rect(21, 4, 7, 3, "#2a3a5a").set(23, 5, C.glow).set(25, 5, C.pink);
    g.rect(19, 7, 11, 1, "#dfe3e8");
    // The X-stand and the stool.
    g.line(6, 17, 12, 27, C.steelLo).line(12, 17, 6, 27, C.steelLo);
    g.line(20, 17, 26, 27, C.steelLo).line(26, 17, 20, 27, C.steelLo);
    g.rect(5, 28, 9, 1, C.steelDk).rect(19, 28, 9, 1, C.steelDk);
    // A cable to somewhere.
    g.set(30, 17, C.black).set(30, 18, C.black).set(31, 19, C.black);
  });
}

function fishtankStand(): HTMLCanvasElement {
  // Two cinder blocks and a plank (the tank sits on it).
  return sprite("fishtank-stand", 42, 22, (g) => {
    g.rect(1, 1, 40, 5, C.woodHi);
    g.rect(1, 1, 40, 1, "#e8c08a");
    g.rect(1, 5, 40, 2, C.woodLo);
    for (const x of [3, 27]) {
      g.rect(x, 7, 12, 13, "#9a9894");
      g.rect(x, 7, 12, 1, "#b4b2ac");
      g.rect(x + 2, 9, 3, 5, "#6a6866").rect(x + 7, 9, 3, 5, "#6a6866");
      g.rect(x, 18, 12, 2, "#7a7874");
    }
    // A fish food tub and a net between the blocks.
    g.rect(18, 15, 5, 5, C.yellow).rect(18, 15, 5, 1, C.red);
    g.vline(24, 9, 10, C.steelLo).rect(23, 17, 3, 2, "#9ad0e0");
  });
}

/** The TV: a big flat screen (the picture is live), on the wall or on a cheap stand. */
function tv(w: number, h: number, standing: boolean): HTMLCanvasElement {
  return sprite(`tv-${w}-${h}-${standing}`, w + 2, h + (standing ? 22 : 4), (g) => {
    g.rrect(1, 1, w, h, "#1c1c22", 1);
    g.rect(2, 2, w - 2, 1, "#3a3a44");
    g.rect(1, h - 2, w, 2, "#2a2a32");
    g.set(Math.round(w / 2), h - 1, "#e85a5a");
    // A sticky note on the bezel: "DON'T TURN OFF (BUILD RUNNING)".
    g.rect(w - 9, 2, 6, 5, "#fff3a3").rect(w - 8, 4, 4, 1, "#c9a440");
    if (standing) {
      g.rect(Math.round(w / 2) - 3, h + 1, 6, 4, "#2a2a32");
      g.rect(6, h + 5, w - 10, 12, C.woodLo);
      g.rect(6, h + 5, w - 10, 1, C.woodHi);
      g.rect(8, h + 8, Math.round((w - 14) / 2) - 2, 8, C.woodDk);
      g.rect(Math.round(w / 2) + 2, h + 8, Math.round((w - 14) / 2) - 2, 8, C.woodDk);
      g.rect(12, h + 10, 12, 3, "#e8e8f0").set(22, h + 11, C.cyan);
      g.rect(7, h + 17, 2, 3, C.woodDk).rect(w - 6, h + 17, 2, 3, C.woodDk);
    }
  });
}

// ------------------------------------------------------------------ the meeting room (the old bedroom)

function doorTable(): HTMLCanvasElement {
  // An old door on two sawhorses: the knob hole still there, sticky notes, laptops, a mug.
  return sprite("meeting-table", 68, 30, (g) => {
    g.rect(1, 2, 66, 16, "#d9b483");
    g.rect(1, 2, 66, 1, "#ecd0a4");
    g.rect(4, 5, 28, 10, "#cfa874").rect(36, 5, 28, 10, "#cfa874");
    g.rect(4, 5, 28, 1, "#c09668").rect(36, 5, 28, 1, "#c09668");
    g.rect(63, 9, 2, 2, "#5a3a24");
    g.rect(1, 18, 66, 3, C.woodLo);
    // Sawhorses.
    for (const x of [6, 54]) {
      g.line(x, 21, x - 3, 28, "#c9a060").line(x + 6, 21, x + 9, 28, "#c9a060");
      g.rect(x - 1, 21, 9, 1, "#a87e48");
    }
    // Sticky notes and a mug ring.
    g.rect(8, 6, 3, 3, "#fff3a3").rect(12, 7, 3, 3, "#ffb3c8").rect(56, 6, 3, 3, "#a8e6ff");
    g.rect(59, 13, 3, 3, "#f4f4f0").set(62, 14, "#f4f4f0").rect(60, 13, 1, 1, "#7a4a2a");
  });
}

function foldingChair(back: boolean, color: string, key: string): HTMLCanvasElement {
  // A metal folding chair (16×32): the backrest up top facing you, or toward you from behind.
  return sprite(key, 16, 32, (g) => {
    const hi = shade(color, 0.25);
    const lo = shade(color, -0.2);
    if (!back) {
      g.rrect(3, 10, 10, 6, color, 1);
      g.rect(4, 11, 8, 1, hi);
      g.rect(4, 16, 1, 3, C.steelLo).rect(11, 16, 1, 3, C.steelLo);
      g.rrect(2, 18, 12, 5, color, 1);
      g.rect(3, 19, 10, 1, hi);
      g.rect(2, 22, 12, 1, lo);
      g.line(4, 23, 3, 30, C.steelLo).line(11, 23, 12, 30, C.steelLo);
      g.line(5, 23, 10, 29, C.steelDk);
    } else {
      g.rrect(3, 15, 10, 7, color, 1);
      g.rect(4, 16, 8, 1, hi);
      g.rect(3, 21, 10, 1, lo);
      g.rect(2, 23, 12, 3, shade(color, -0.08));
      g.rect(2, 23, 12, 1, hi);
      g.line(3, 26, 2, 31, C.steelLo).line(12, 26, 13, 31, C.steelLo);
    }
  });
}

function campChair(): HTMLCanvasElement {
  // A camping chair for your guests, cup holder and all (16×32, seen from behind).
  return sprite("guest-chair", 16, 32, (g) => {
    g.rect(2, 14, 12, 9, "#2f6e8a");
    g.rect(3, 15, 10, 1, "#4f8eaa");
    g.rect(2, 20, 12, 1, "#24566c");
    g.vline(1, 13, 12, C.steelLo).vline(14, 13, 12, C.steelLo);
    g.rect(0, 20, 3, 2, C.steelDk).rect(13, 20, 3, 2, C.steelDk);
    g.rect(2, 23, 12, 3, "#24566c");
    g.line(2, 26, 5, 31, C.steelLo).line(13, 26, 10, 31, C.steelLo).line(5, 26, 2, 31, C.steelDk).line(10, 26, 13, 31, C.steelDk);
    g.rect(14, 17, 2, 3, "#24566c");
  });
}

/** The closet's sliding doors, mirrored once, now the whiteboard (marker strokes are live). */
function closetBoard(w: number): HTMLCanvasElement {
  return sprite(`whiteboard-${w}`, w + 2, 46, (g) => {
    g.rect(1, 1, w, 36, "#d8dde2");
    g.rect(1, 1, w, 1, "#f4f6f8");
    g.rect(3, 3, w - 4, 31, "#f6f8fa");
    // The two doors' seam and a pull.
    const mid = Math.round(w / 2);
    g.vline(mid, 3, 31, "#c4ccd4");
    g.rect(mid - 3, 16, 1, 5, "#aab2bc").rect(mid + 3, 16, 1, 5, "#aab2bc");
    // A faint mirror sheen down one side.
    for (let y = 4; y < 33; y++) g.set(w - 6 + (y % 3 === 0 ? 1 : 0), y, "#e8eef4");
    // Sticky notes along the edges, the bottom track.
    const notes = ["#fff3a3", "#ffb3c8", "#a8e6ff", "#c8f0a8", "#ffd8a0"];
    for (let i = 0, x = 4; x < w - 4; i++, x += 7) if (i % 2 === 0 || x > w - 20) g.rect(x, 31 - (i % 3), 4, 3, notes[i % notes.length]!);
    for (let y = 6; y < 28; y += 6) g.rect(w - 4, y, 3, 3, notes[(y / 6) % notes.length]!);
    g.rect(1, 37, w, 2, "#b8c0c8");
    g.rect(1, 39, w, 1, "#8a949e");
    // The marker ledge: two markers and an eraser.
    g.rect(6, 36, 5, 1, C.red).rect(13, 36, 5, 1, C.blue).rect(w - 14, 35, 7, 2, "#2e2c36");
  });
}

function sleepingBags(): HTMLCanvasElement {
  // Rolled-up sleeping bags and a pillow: the room was a bedroom, after all (the plan-rolls corner, 18×28).
  return sprite("plan-rolls", 18, 28, (g) => {
    g.rrect(1, 12, 16, 7, "#3a6ea8", 3);
    g.rect(3, 13, 12, 1, "#5a8ec8");
    g.rect(6, 12, 1, 7, "#2a4e80").rect(12, 12, 1, 7, "#2a4e80");
    g.rrect(1, 18, 16, 7, "#d86a3a", 3);
    g.rect(3, 19, 12, 1, "#f08a5a");
    g.rect(8, 18, 1, 7, "#a84a2a");
    g.rrect(2, 5, 14, 7, "#f4f2ea", 2);
    g.rect(4, 6, 10, 1, "#ffffff");
  });
}

// ------------------------------------------------------------------ the kitchen

function counter(w: number): HTMLCanvasElement {
  // Oak cabinets from the eighties, a laminate top, the sink full of mugs, the microwave at the end.
  return sprite(`kitchen-counter-${w}`, w + 2, 36, (g) => {
    g.rect(1, 1, w, 14, "#efe8d6");
    g.rect(1, 1, w, 1, "#fbf6ea");
    g.rect(1, 14, w, 2, "#c8bfa8");
    g.rect(1, 16, w, 18, "#b98a52");
    g.rect(1, 16, w, 1, "#d0a46a");
    for (let x = 3; x + 14 <= w; x += 16) {
      g.rect(x, 18, 14, 14, "#a87a46");
      g.rect(x + 1, 19, 12, 12, "#c09060");
      g.rect(x + 1, 19, 12, 1, "#d4a874");
      g.rect(x + 11, 24, 1, 3, "#e0c070");
    }
    g.rect(1, 33, w, 1, "#6a4a2a");
    // The sink, mugs piled in it.
    const sx = 44;
    if (w >= 70) {
      g.rect(sx, 3, 18, 9, "#c4ccd4");
      g.rect(sx + 1, 4, 16, 7, "#9aa4ae");
      g.rect(sx + 3, 6, 3, 3, "#f4f2ea").rect(sx + 7, 5, 3, 3, C.red).rect(sx + 11, 7, 3, 3, "#5aa8a0");
      g.rect(sx + 8, 1, 2, 3, C.steelLo).set(sx + 9, 4, C.steel);
    }
    // The kettle (steam is live around x+34).
    g.rect(31, 7, 7, 6, "#e8e4da").rect(32, 6, 5, 1, "#e8e4da").set(38, 9, "#e8e4da").set(34, 5, C.black);
    // Paper towels, a cereal box, a jar of sauce.
    if (w >= 96) {
      g.rect(66, 3, 4, 9, "#ffffff").rect(66, 3, 4, 1, "#e0e0e0");
      g.rect(72, 1, 6, 11, "#f2c14e").rect(73, 3, 4, 3, C.red).rect(73, 7, 4, 1, "#ffffff");
    }
    // The microwave at the right end (it lights up live).
    if (w >= 100) {
      const mx = w - 24;
      g.rect(mx - 1, 0, 22, 14, "#3a3a44");
      g.rect(mx, 1, 15, 11, "#1a1a22");
      g.rect(mx + 16, 1, 4, 11, "#4a4a56");
      g.set(mx + 17, 3, C.lime).set(mx + 18, 3, C.lime);
    }
  });
}

function island(w: number): HTMLCanvasElement {
  // The kitchen table that became the breakfast bar: pizza boxes, cereal, a stack of mail.
  return sprite(`kitchen-island-${w}`, w + 2, 26, (g) => {
    g.rect(1, 1, w, 12, "#efe8d6");
    g.rect(1, 1, w, 1, "#fbf6ea");
    g.rect(1, 13, w, 2, "#c8bfa8");
    g.rect(1, 15, w, 9, "#b98a52");
    g.rect(1, 15, w, 1, "#d0a46a");
    for (let x = 4; x + 10 <= w; x += 14) g.rect(x, 17, 10, 5, "#a87a46");
    // A stack of pizza boxes on the right, cereal and bowls in the middle.
    const px = w - 18;
    g.rect(px, 2, 15, 8, C.box).rect(px, 2, 15, 1, C.boxHi).rect(px + 1, 5, 13, 1, C.boxLo).rect(px + 4, 3, 7, 1, "#c9483a");
    g.rect(px - 13, 2, 5, 8, "#4a8fe0").rect(px - 12, 4, 3, 2, C.yellow);
    g.ellipse(px - 20, 7, 2.5, 1.5, "#ffffff");
    g.rect(px - 24, 3, 5, 3, C.paper).rect(px - 23, 4, 3, 1, C.paperLo);
  });
}

function stool(): HTMLCanvasElement {
  return sprite("stool", 12, 10, (g) => {
    g.ellipse(5.5, 2.5, 4.5, 2, "#c4483a");
    g.rect(2, 2, 8, 1, "#e06a5a");
    g.vline(3, 4, 5, C.steelLo).vline(8, 4, 5, C.steelLo);
    g.rect(3, 7, 6, 1, C.steelDk);
  });
}

function fridge(): HTMLCanvasElement {
  // An old white fridge covered in magnets, stickers, a takeout menu and a passive-aggressive note.
  return sprite("fridge", 20, 34, (g) => {
    g.rrect(1, 1, 18, 32, "#f4f2ec", 1);
    g.rect(2, 2, 16, 1, "#ffffff");
    g.rect(1, 11, 18, 1, "#c8c4b8");
    g.rect(16, 4, 1, 5, "#b8b4a8").rect(16, 14, 1, 8, "#b8b4a8");
    // Magnets and stickers.
    const stuff: [number, number, string][] = [[3, 3, C.red], [7, 5, C.lime], [11, 3, C.cyan], [4, 14, C.pink], [12, 16, C.yellow], [8, 25, C.purple], [3, 27, C.orange]];
    for (const [x, y, c] of stuff) g.rect(x, y, 3, 2, c);
    // The takeout menu and the note.
    g.rect(5, 17, 6, 8, "#ffffff").rect(6, 18, 4, 1, C.red).rect(6, 20, 4, 1, "#b8b0a0").rect(6, 22, 3, 1, "#b8b0a0");
    g.rect(11, 22, 5, 4, "#fff3a3").rect(12, 23, 3, 1, "#c9a440");
    g.rect(2, 32, 16, 1, "#8a867c");
  });
}

function drinksFridge(): HTMLCanvasElement {
  // A glass-door drinks fridge, packed with energy drinks (the window x+3..16, y+5..33 and the slot at x+17, y+18 stay put).
  return sprite("vending", 24, 44, (g) => {
    g.rrect(1, 1, 22, 42, "#2e2c36", 1);
    g.rect(2, 2, 20, 2, "#4a4856");
    g.rect(3, 5, 14, 29, "#1a2a34");
    for (let row = 0; row < 6; row++) {
      const y = 6 + row * 5;
      for (let col = 0; col < 4; col++) can(g, 4 + col * 3 + (col > 1 ? 0 : 0), y, CANS[(row + col * 2) % CANS.length]!);
      g.rect(3, y + 4, 14, 1, "#3a5a6a");
    }
    // The handle and the light strip, a brand-free glow sticker.
    g.rect(18, 8, 2, 9, C.steel).rect(18, 8, 1, 9, C.steelHi);
    g.rect(17, 18, 5, 2, "#1a1a22");
    g.rect(18, 22, 3, 3, C.lime);
    g.rect(3, 35, 18, 6, "#3a3846");
    for (let x = 4; x < 20; x += 2) g.set(x, 37, "#22222a").set(x, 39, "#22222a");
  });
}

function espresso(): HTMLCanvasElement {
  // A gleaming espresso machine, worth more than the car, never cleaned (the spout around x+8..16).
  return sprite("espresso", 26, 30, (g) => {
    g.rrect(2, 3, 22, 20, "#c8ced6", 1);
    g.rect(3, 4, 20, 2, "#eef2f6");
    g.rect(3, 3, 20, 1, "#ffffff");
    // Cups warming on top.
    g.rect(5, 0, 4, 3, "#f4f2ea").rect(11, 0, 4, 3, "#f4f2ea").rect(17, 1, 4, 2, C.red);
    // Gauges and the display.
    g.ellipse(6, 9, 2, 2, "#2e2c36");
    g.set(6, 9, "#f4f2ea");
    g.rect(10, 9, 7, 3, "#1a1a22");
    g.ellipse(20, 9, 2, 2, "#2e2c36");
    g.set(20, 9, "#f4f2ea");
    // The group head and portafilter.
    g.rect(7, 13, 10, 3, "#8a949e");
    g.rect(4, 15, 6, 2, C.black);
    g.rect(9, 16, 6, 2, "#5c6670");
    // Drip tray and a grinder on the side, coffee grounds everywhere.
    g.rect(3, 22, 20, 3, "#5c6670");
    g.rect(4, 22, 18, 1, "#8a949e");
    g.rect(2, 25, 22, 3, "#efe8d6");
    for (const x of [3, 6, 11, 19, 22]) g.set(x, 26, "#5a3a24");
    g.set(8, 27, "#5a3a24").set(16, 26, "#5a3a24");
  });
}

// ------------------------------------------------------------------ the entryway

function hallTable(): HTMLCanvasElement {
  // The hall table: a bowl of keys, a pile of mail, a lanyard, the bell.
  return sprite("reception", 36, 22, (g) => {
    g.rect(1, 6, 34, 6, C.wood);
    g.rect(1, 6, 34, 1, C.woodHi);
    g.rect(1, 12, 34, 3, C.woodLo);
    g.rect(3, 15, 2, 6, C.woodDk).rect(31, 15, 2, 6, C.woodDk);
    g.rect(4, 13, 28, 1, C.woodDk);
    g.ellipse(8, 7, 4, 2, "#5aa8a0");
    g.set(6, 6, C.yellow).set(9, 6, C.steel).set(8, 5, C.red);
    g.rect(14, 4, 9, 6, C.paper).rect(15, 3, 8, 6, "#f4e2b8").rect(16, 5, 5, 1, C.red).rect(16, 7, 4, 1, "#b8b0a0");
    // The bell, polished by impatience.
    g.ellipse(29, 6, 3, 2, "#e8c060");
    g.rect(26, 7, 7, 2, "#c9a440");
    g.set(29, 3, "#c9a440");
    g.set(28, 5, "#fff3c0");
  });
}

/** Whatever chairs the house had, all different (16×16, like the classic waiting chair). */
function anyChair(v: number): HTMLCanvasElement {
  switch (v) {
    case 0:
      // A metal folding chair.
      return sprite("wait-fold", 16, 16, (g) => {
        g.rrect(3, 0, 10, 6, "#5c6670", 1);
        g.rect(4, 1, 8, 1, "#7a8490");
        g.rect(4, 6, 1, 2, C.steelLo).rect(11, 6, 1, 2, C.steelLo);
        g.rrect(2, 7, 12, 5, "#5c6670", 1);
        g.rect(3, 8, 10, 1, "#7a8490");
        g.line(3, 12, 2, 15, C.steelLo).line(12, 12, 13, 15, C.steelLo).line(4, 12, 11, 15, C.steelDk);
      });
    case 1:
      // A wooden dining chair.
      return sprite("wait-dining", 16, 16, (g) => {
        g.rect(3, 0, 10, 2, C.wood).rect(3, 0, 10, 1, C.woodHi);
        g.vline(3, 2, 6, C.woodLo).vline(12, 2, 6, C.woodLo).vline(6, 2, 5, C.wood).vline(9, 2, 5, C.wood);
        g.rect(2, 8, 12, 4, C.wood).rect(2, 8, 12, 1, C.woodHi);
        g.rect(2, 12, 12, 1, C.woodDk);
        g.vline(3, 13, 3, C.woodDk).vline(12, 13, 3, C.woodDk);
      });
    case 2:
      // A white plastic patio chair.
      return sprite("wait-patio", 16, 16, (g) => {
        g.rrect(2, 0, 12, 8, "#f4f2ea", 2);
        g.rect(4, 2, 8, 1, "#d4d0c4").rect(4, 4, 8, 1, "#d4d0c4");
        g.rrect(1, 7, 14, 5, "#f4f2ea", 1);
        g.rect(2, 11, 12, 1, "#d4d0c4");
        g.vline(2, 12, 4, "#d4d0c4").vline(13, 12, 4, "#d4d0c4");
      });
    case 3:
      // A gaming chair with a split seam.
      return sprite("wait-gamer", 16, 16, (g) => {
        g.rrect(3, 0, 10, 8, C.black, 2);
        g.rect(4, 1, 8, 1, C.red).rect(4, 3, 2, 4, C.red).rect(10, 3, 2, 4, C.red);
        g.rrect(2, 7, 12, 5, C.black, 1);
        g.rect(3, 8, 10, 1, C.blackHi);
        g.set(9, 9, "#f4e2b8");
        g.vline(7, 12, 2, C.steelDk).rect(3, 14, 10, 1, C.steelDk);
        g.set(3, 15, C.black).set(12, 15, C.black);
      });
    default:
      // A milk crate with a cushion on it.
      return sprite("wait-crate", 16, 16, (g) => {
        g.rect(2, 5, 12, 10, "#2f6ec4");
        for (let x = 3; x < 14; x += 3) g.vline(x, 7, 7, "#1f4e94");
        g.rect(2, 5, 12, 2, "#4f8ee4");
        g.rrect(2, 2, 12, 5, "#e8a03a", 1);
        g.rect(3, 3, 10, 1, "#f8c06a");
      });
  }
}

// ------------------------------------------------------------------ the garage

function rack(ai: boolean): HTMLCanvasElement {
  // Mismatched servers on wire shelving (drive LEDs at x+10..12, y+4..29); the AI box is an open-frame GPU rig.
  if (ai) {
    return sprite("ai-rack", 20, 33, (g) => {
      g.rect(1, 1, 18, 31, "#2a2a32");
      g.rect(2, 2, 16, 6, "#1a1a22");
      for (let y = 9; y < 30; y += 7) {
        g.rect(2, y, 16, 6, "#3a3a44");
        g.rect(3, y + 1, 6, 4, "#4a4a56").rect(10, y + 1, 6, 4, "#4a4a56");
        g.ellipse(5.5, y + 3, 1.5, 1.5, "#22222a");
        g.ellipse(12.5, y + 3, 1.5, 1.5, "#22222a");
      }
      g.vline(1, 1, 31, C.steelLo).vline(18, 1, 31, C.steelLo);
      // Zip ties and a cable that should not be there.
      g.set(1, 10, C.yellow).set(18, 20, C.yellow).set(19, 22, C.orange).set(19, 23, C.orange);
    });
  }
  return sprite("server-rack", 16, 33, (g) => {
    g.vline(1, 1, 31, C.steelLo).vline(14, 1, 31, C.steelLo);
    for (let y = 2; y < 31; y += 9) g.rect(1, y + 8, 14, 1, C.steel);
    // An old tower, a pizza-box server, a NAS, a mini PC stacked on the shelves.
    g.rect(2, 2, 12, 8, "#d8d4c8").rect(3, 3, 6, 1, "#a8a498").rect(3, 5, 6, 1, "#a8a498");
    g.rect(2, 11, 12, 4, "#3a3a44").rect(2, 15, 12, 4, "#2e2c36");
    g.rect(2, 20, 12, 9, "#5c6670").rect(3, 21, 5, 7, "#4a5260");
    g.rect(2, 29, 12, 2, "#2a2a32");
    g.rect(9, 3, 4, 26, "#1e1e26");
  });
}

function waterJug(): HTMLCanvasElement {
  // A five-gallon water jug on a cheap dispenser (17×36).
  return sprite("cooler", 17, 36, (g) => {
    g.rrect(3, 1, 10, 13, "#9ad0f0", 3);
    g.rect(5, 2, 2, 10, "#d8f0ff");
    g.rect(4, 6, 8, 1, "#7ab8e0").rect(4, 10, 8, 1, "#7ab8e0");
    g.rect(6, 14, 4, 2, "#5a9ad0");
    g.rect(2, 16, 13, 18, "#f4f2ea");
    g.rect(2, 16, 13, 1, "#ffffff");
    g.rect(4, 20, 2, 3, "#3a74c4").rect(10, 20, 2, 3, C.red);
    g.rect(3, 25, 11, 2, "#c8c4b8");
    g.rect(5, 26, 3, 3, "#ffffff");
    g.rect(2, 33, 13, 1, "#a8a498");
  });
}

function printer(): HTMLCanvasElement {
  // An inkjet on a moving box, the paper tray out (paper comes out on top, live).
  return sprite("printer", 30, 26, (g) => {
    g.rect(3, 12, 24, 13, C.box);
    g.rect(3, 12, 24, 1, C.boxHi);
    g.rect(14, 12, 2, 13, "#d8c49a");
    g.rect(5, 18, 8, 3, "#f4f2ea").rect(6, 19, 6, 1, "#2e2c36");
    g.rect(2, 2, 26, 10, "#3a3a44");
    g.rect(2, 2, 26, 1, "#5a5a66");
    g.rect(7, 1, 16, 2, "#f4f2ea");
    g.rect(4, 9, 22, 2, "#22222a");
    g.set(24, 5, C.lime).set(22, 5, C.orange);
  });
}

function bin(): HTMLCanvasElement {
  // A trash can that gave up: a pizza box sticking out the top.
  return sprite("bin", 16, 16, (g) => {
    g.rect(3, 6, 10, 9, "#5c6670");
    g.rect(3, 6, 2, 9, "#7a8490");
    g.rect(2, 5, 12, 2, "#4a5260");
    g.rect(5, 0, 8, 6, C.box).rect(5, 0, 8, 1, C.boxHi).rect(7, 2, 4, 1, "#c9483a");
    g.rect(2, 3, 3, 3, CANS[2]!).set(2, 3, "#e6e9ee");
  });
}

function arcade(): HTMLCanvasElement {
  // A secondhand arcade cabinet, woodgrain and peeling art (the game screen is live at x+2..21, y+9..22).
  return sprite("arcade", 26, 48, (g) => {
    const w = 24;
    const h = 46;
    g.rect(2, 1, w - 2, h - 1, "#3a2a5a");
    g.rect(1, 1, w, 8, "#1a1a22");
    g.rect(2, 2, w - 2, 6, "#ff5fa2");
    text(g, "8BIT", 5, 3, "#fff3a3");
    g.rect(3, 10, w - 4, 14, "#141420");
    g.rect(1, 25, w, 6, "#5a4a7a");
    g.rect(1, 25, w, 1, "#7a6a9a");
    g.rect(6, 27, 2, 2, C.black).set(7, 26, C.red);
    g.set(13, 28, C.yellow).set(16, 27, C.cyan).set(19, 28, C.lime);
    g.rect(2, 32, w - 2, h - 33, "#2e2248");
    g.rect(8, 36, 8, 3, "#1a1a22").rect(11, 37, 2, 1, C.orange);
    // Woodgrain side and a peeling sticker.
    g.vline(1, 9, h - 9, "#8a5a34").vline(w, 9, h - 9, "#8a5a34");
    g.rect(16, 40, 4, 3, "#c8f0a8").set(19, 40, "#2e2248");
  });
}

function pingpong(classic: () => HTMLCanvasElement): HTMLCanvasElement {
  // A garage ping-pong table, the paint a bit sun-bleached.
  return recolor(classic(), { "#3b9b6b": "#3f6fa8", "#2a7a52": "#2c5288", "#d8f0e2": "#d8e6f4" });
}

function dartboard(): HTMLCanvasElement {
  // A dartboard on a sheet of plywood leaning on a sawhorse, the plywood full of misses.
  return sprite("dartboard", 20, 34, (g) => {
    g.rect(1, 1, 18, 22, "#d9b483");
    g.rect(1, 1, 18, 1, "#ecd0a4");
    g.ellipse(9.5, 10, 7, 7, "#2e2c36");
    g.ellipse(9.5, 10, 6, 6, "#e8dcc0");
    g.ellipse(9.5, 10, 4.5, 4.5, "#c4483a");
    g.ellipse(9.5, 10, 3, 3, "#e8dcc0");
    g.ellipse(9.5, 10, 1.4, 1.4, "#3a8a4a");
    for (const [x, y] of [[3, 3], [16, 19], [4, 20], [17, 4]] as const) g.set(x, y, "#5a3a24");
    g.line(5, 23, 2, 32, "#c9a060").line(14, 23, 17, 32, "#c9a060");
    g.rect(3, 23, 14, 1, "#a87e48");
  });
}

// ------------------------------------------------------------------ your room

function standingDesk(w: number): HTMLCanvasElement {
  // A standing desk, raised: a big monitor, the laptop, a cold brew and a stack of term sheets (papers are live).
  return sprite(`boss-desk-${w}`, w + 2, 30, (g) => {
    g.rect(1, 6, w, 10, "#e8e2d4");
    g.rect(1, 6, w, 1, "#f8f4ea");
    g.rect(1, 16, w, 3, "#3a3a44");
    // The legs and the motor box.
    g.rect(6, 19, 3, 9, "#4a4a56").rect(w - 8, 19, 3, 9, "#4a4a56");
    g.rect(3, 27, 9, 2, "#2e2c36").rect(w - 11, 27, 9, 2, "#2e2c36");
    g.rect(w - 14, 17, 5, 2, "#5a5a66").set(w - 13, 17, C.lime);
    // A wide monitor on an arm, the laptop, a cold brew, a little rocket.
    g.rect(Math.round(w / 2) - 14, 0, 28, 8, "#1c1c22");
    g.rect(Math.round(w / 2) - 13, 1, 26, 5, "#2a3a5a");
    g.rect(Math.round(w / 2) - 11, 2, 9, 1, C.glow).rect(Math.round(w / 2) - 11, 4, 14, 1, "#7a9ad0");
    g.rect(Math.round(w / 2) - 1, 8, 2, 2, "#4a4a56");
    g.rect(4, 9, 11, 5, "#c9ced6").rect(5, 10, 9, 3, "#2a3a5a");
    g.rect(w - 10, 8, 4, 6, "#3a2418").rect(w - 10, 8, 4, 1, "#e8e4da");
    g.rect(w - 4, 9, 2, 4, "#e9edf2").set(w - 4, 8, C.red).set(w - 3, 8, C.red);
  });
}

function gamingChair(): HTMLCanvasElement {
  // Your gaming chair, high back, a lumbar pillow with a rocket on it (22×26).
  return sprite("boss-chair", 22, 26, (g) => {
    g.rrect(4, 0, 14, 16, "#2e2c36", 3);
    g.rect(6, 1, 10, 1, "#4a4856");
    g.rect(5, 3, 2, 11, C.orange).rect(15, 3, 2, 11, C.orange);
    g.rrect(8, 4, 6, 4, "#3a3a44", 1);
    g.rect(1, 12, 4, 6, "#2e2c36").rect(17, 12, 4, 6, "#2e2c36");
    g.rrect(3, 15, 16, 5, "#2e2c36", 1);
    g.rect(4, 16, 14, 1, "#4a4856");
    g.vline(10, 20, 3, C.steelDk).vline(11, 20, 3, C.steelDk);
    g.rect(4, 23, 14, 1, C.steelDk);
    g.set(4, 24, "#1a1a22").set(17, 24, "#1a1a22").set(10, 24, "#1a1a22");
  });
}

function trophyShelf(): HTMLCanvasElement {
  // A bookcase: programming books, a hackathon trophy, a bobblehead, a framed first sale (the globe sits on top, live).
  return sprite("boss-shelf", 32, 32, (g) => {
    g.rect(1, 1, 30, 30, C.wood);
    g.rect(1, 1, 30, 1, C.woodHi);
    g.rect(3, 3, 26, 26, C.woodDk);
    for (const y of [11, 20]) g.rect(3, y, 26, 1, C.wood);
    const books = [C.red, C.blue, "#f4e2b8", C.green, C.purple, C.orange, "#2e2c36", C.yellow];
    let x = 4;
    for (let i = 0; x < 18; i++) {
      const bw = 1 + (i % 3 === 0 ? 1 : 0);
      g.rect(x, 4 + (i % 2), bw, 7 - (i % 2), books[i % books.length]!);
      x += bw;
    }
    // The trophy and the bobblehead.
    g.rect(21, 5, 5, 3, "#e8c060").rect(22, 8, 3, 2, "#c9a440").rect(21, 10, 5, 1, "#8a6a2a");
    g.ellipse(7, 15, 2, 2, "#f1c7a4").rect(6, 17, 3, 3, C.blue);
    g.rect(13, 13, 9, 7, "#f4f2ea").rect(14, 14, 7, 5, "#3a8a4a").rect(16, 15, 3, 3, "#e8f4e0");
    x = 4;
    for (let i = 3; x < 28; i++) {
      const bw = 1 + (i % 2);
      g.rect(x, 22 + (i % 3 === 0 ? 1 : 0), bw, 7 - (i % 3 === 0 ? 1 : 0), books[i % books.length]!);
      x += bw;
    }
  });
}

function gameShelf(): HTMLCanvasElement {
  // The den's shelf: board games stacked sideways, a VR headset, manuals nobody read.
  return sprite("game-shelf", 32, 32, (g) => {
    g.rect(1, 1, 30, 30, "#e8e2d4");
    g.rect(1, 1, 30, 1, "#f8f4ea");
    g.rect(3, 3, 26, 26, "#5a4a3a");
    for (const y of [11, 20]) g.rect(3, y, 26, 1, "#e8e2d4");
    const boxes = ["#e5544b", "#4a8fe0", "#ffd84a", "#3a9a5a", "#9b72e6", "#ff9a3d"];
    for (let i = 0; i < 4; i++) g.rect(4, 9 - i * 2, 14 - (i % 2) * 3, 2, boxes[i]!);
    g.rect(21, 6, 6, 4, "#2e2c36").rect(22, 7, 4, 1, "#43d1f0");
    for (let x = 4, i = 2; x < 28; i++) {
      const w = 2 + (i % 2);
      g.rect(x, 22 + (i % 3 === 0 ? 1 : 0), w, 6, boxes[i % boxes.length]!);
      x += w + 1;
    }
    g.rect(5, 15, 8, 4, "#f4f2ea").rect(6, 16, 6, 1, "#b8b0a0");
    g.ellipse(21, 16, 3, 2, "#3fb5a8");
  });
}

function spoolTable(): HTMLCanvasElement {
  // A wooden cable spool, rolled in from a building site: the classic table.
  return sprite("spool", 32, 32, (g) => {
    g.ellipse(15.5, 12, 13, 6, "#c9a060");
    g.ellipse(15.5, 11, 12, 5, "#dcb478");
    g.ellipse(15.5, 11, 3, 1.5, "#a87e48");
    g.rect(8, 16, 16, 8, "#a87e48");
    g.rect(8, 16, 16, 1, "#8a6236");
    g.ellipse(15.5, 25, 13, 4, "#b8904e");
    g.rect(6, 7, 4, 2, "#e5544b").set(20, 9, "#43d1f0").rect(19, 8, 3, 1, "#2e2c36");
  });
}

function dogBed(): HTMLCanvasElement {
  // A huge round cushion for a small, heavy dog.
  return sprite("dog-bed", 26, 14, (g) => {
    g.ellipse(12.5, 7, 12, 6, "#7a5a8a");
    g.ellipse(12.5, 6.5, 9, 4, "#a888b8");
    g.ellipse(12.5, 7, 7, 3, "#c4a8d4");
    g.rect(16, 6, 3, 2, "#e8e0c8");
  });
}

// ------------------------------------------------------------------ outdoors and odds and ends

function patioBench(): HTMLCanvasElement {
  return sprite("bench", 36, 16, (g) => {
    g.rect(1, 1, 34, 3, C.fence).rect(1, 1, 34, 1, C.fenceHi);
    g.rect(1, 6, 34, 4, C.fence).rect(1, 6, 34, 1, C.fenceHi);
    g.rect(1, 10, 34, 1, C.fenceLo);
    g.rect(3, 11, 2, 4, C.fenceLo).rect(31, 11, 2, 4, C.fenceLo);
  });
}

function movingBoxes(w: number): HTMLCanvasElement {
  // Between desk rows: moving boxes nobody unpacked, a plant on top of one.
  return sprite(`planter-${w}`, w + 2, 20, (g) => {
    for (let x = 1, i = 0; x + 12 <= w; x += 14, i++) {
      const h = 9 + (i % 3) * 2;
      g.rect(x, 19 - h, 13, h, C.box);
      g.rect(x, 19 - h, 13, 1, C.boxHi);
      g.rect(x + 5, 19 - h, 3, h, "#d8c49a");
      if (i % 4 === 1) g.rect(x + 2, 19 - h + 3, 5, 2, C.paper);
    }
    g.rect(3, 4, 6, 4, "#c4673f").rect(4, 1, 1, 3, C.palm).rect(6, 0, 1, 4, C.palmHi).rect(7, 2, 1, 2, C.palm);
  });
}

function wallFront(p: PropPlacement, L: Layout): HTMLCanvasElement {
  // The front edge of a walled room: drywall with its doorway, or the server cage's mesh.
  const room = L.rooms.find((r) => r.walls && r.rect.x === p.x && r.rect.w === p.w && r.rect.y + r.rect.h - 10 === p.y);
  const w = p.w ?? 100;
  const gap = room?.doorSide === "bottom" && room.doorX !== undefined ? room.doorX - room.rect.x : -1;
  const cage = room?.kind === "server";
  return sprite(`front-${w}-${gap}-${cage}`, w, 11, (g) => {
    for (let x = 0; x < w; x++) {
      if (gap >= 0 && x >= gap - 10 && x < gap + 10) continue;
      if (cage) {
        g.set(x, 0, "#6a727c").set(x, 1, "#aab2bc");
        for (let y = 2; y < 9; y++) if ((x + y) % 3 === 0) g.set(x, y, "#c8ced4cc");
        g.set(x, 9, "#6a727c").set(x, 10, "#4a525c");
      } else {
        // A low cutaway wall, so whoever sits by it still shows.
        g.set(x, 3, OUTLINE).set(x, 4, C.trim).set(x, 5, C.trim);
        for (let y = 6; y < 9; y++) g.set(x, y, C.wall);
        g.set(x, 9, C.trim).set(x, 10, "#a99a7a");
      }
    }
    if (cage) for (let x = 0; x < w; x += 16) if (!(gap >= 0 && x >= gap - 11 && x < gap + 11)) g.vline(x, 0, 10, "#6a727c");
    if (gap >= 0) {
      // Door trim at the doorway's edges.
      for (const x of [gap - 11, gap + 10]) if (x >= 0 && x < w) g.vline(x, cage ? 0 : 3, cage ? 11 : 8, OUTLINE);
    }
    g.vline(0, cage ? 0 : 3, cage ? 11 : 8, OUTLINE).vline(w - 1, cage ? 0 : 3, cage ? 11 : 8, OUTLINE);
  }, false);
}

function cornhole(): HTMLCanvasElement {
  return sprite("cornhole", 20, 30, (g) => {
    g.rect(2, 1, 16, 27, "#e8d4a8");
    g.rect(2, 1, 16, 1, "#f8e8c8");
    g.rect(2, 1, 3, 27, "#3f8f8a").rect(15, 1, 3, 27, "#3f8f8a");
    g.ellipse(9.5, 7, 3, 3, "#2e2c36");
    g.rect(6, 15, 8, 8, C.orange).rect(8, 17, 4, 4, C.yellow);
    g.rect(2, 28, 16, 1, C.woodDk);
  });
}

function loungeTable(): HTMLCanvasElement {
  return sprite("lounge-table", 28, 12, (g) => {
    g.ellipse(13.5, 4, 12, 3, C.woodHi);
    g.rect(3, 4, 22, 3, C.woodLo);
    g.vline(6, 7, 4, C.woodDk).vline(21, 7, 4, C.woodDk);
    can(g, 9, 1, CANS[0]!);
  });
}

function sideTable(): HTMLCanvasElement {
  return sprite("side-table", 16, 16, (g) => {
    g.rect(2, 4, 12, 9, "#2f6ec4");
    for (let x = 3; x < 14; x += 3) g.vline(x, 6, 6, "#1f4e94");
    g.rect(2, 4, 12, 2, "#4f8ee4");
    can(g, 6, 1, CANS[3]!);
  });
}

/** The scenery's sprite for a placed prop (null keeps the classic one). */
export function startupProp(p: PropPlacement, L: Layout, classic: () => HTMLCanvasElement): HTMLCanvasElement | null {
  switch (p.kind) {
    case "couch":
      return couch();
    case "coffee-table":
      return coffeeTable();
    case "pingpong":
      return pingpong(classic);
    case "arcade":
      return arcade();
    case "beanbag-blue":
      return beanbag(C.denim, "beanbag-blue");
    case "beanbag-pink":
      return beanbag("#e8803a", "beanbag-pink");
    case "armchair":
      return armchair();
    case "lamp":
      return lamp();
    case "printer":
      return printer();
    case "cooler":
      return waterJug();
    case "meeting-table":
      return doorTable();
    case "meeting-chair-front":
      return foldingChair(false, ["#5c6670", "#c4483a", "#3f8f8a"][hash(p.id) % 3]!, `chair-front-${hash(p.id) % 3}`);
    case "meeting-chair-back":
      return foldingChair(true, ["#5c6670", "#c4483a", "#3f8f8a"][hash(p.id) % 3]!, `chair-back-${hash(p.id) % 3}`);
    case "guest-chair":
      return campChair();
    case "plan-rolls":
      return sleepingBags();
    case "glass-front":
      return wallFront(p, L);
    case "library-shelf":
      return p.id === "boss-shelf" ? trophyShelf() : gameShelf();
    case "library-table":
      return spoolTable();
    case "planter":
      return movingBoxes(p.w ?? 48);
    case "kitchen-island":
      return island(p.w ?? 72);
    case "kitchen-counter":
      return counter(p.w ?? 100);
    case "stool":
      return stool();
    case "fridge":
      return fridge();
    case "vending":
      return drinksFridge();
    case "fishtank-stand":
      return fishtankStand();
    case "whiteboard":
      return closetBoard(p.w ?? 80);
    case "tv":
      return tv(p.w ?? 120, L.tv.h, p.z > 0);
    case "piano":
      return piano();
    case "dartboard":
      return dartboard();
    case "cornhole":
      return cornhole();
    case "waiting-chair":
      return anyChair(hash(p.id) % 5);
    case "lounge-table":
      return loungeTable();
    case "bench":
      return patioBench();
    case "espresso":
      return espresso();
    case "server-rack":
      return rack(false);
    case "ai-rack":
      return rack(true);
    case "side-table":
      return sideTable();
    case "reception":
      return hallTable();
    case "boss-desk":
      return standingDesk(p.w ?? 60);
    case "boss-chair":
      return gamingChair();
    case "dog-bed":
      return dogBed();
    case "bin":
      return bin();
    default:
      return null;
  }
}

// ------------------------------------------------------------------ plants

function pot(g: Grid, x: number, y: number, w: number, h: number, color: string): void {
  g.rect(x, y, w, 2, shade(color, 0.2));
  g.rect(x + 1, y + 2, w - 2, h - 2, color);
  g.rect(x + 1, y + 2, 1, h - 2, shade(color, 0.25));
  g.rect(x + 2, y + h - 1, w - 4, 1, shade(color, -0.2));
}

/** House plants: a fiddle-leaf fig, a snake plant, a pothos in a mug, succulents, the one nobody waters. */
export function startupPlant(s: PlantPlacement["sprite"]): HTMLCanvasElement {
  switch (s) {
    case "PLANT":
      // A snake plant in a terracotta pot: unkillable, thankfully.
      return sprite("plant", 16, 32, (g) => {
        for (const [x, h, c] of [[5, 16, C.palm], [7, 20, C.palmHi], [9, 18, C.palm], [11, 14, C.palmLo], [6, 12, C.palmLo]] as const) {
          g.rect(x, 24 - h, 2, h, c);
          g.set(x, 24 - h, shade(c, 0.3));
          g.set(x + 1, 24 - h + 4, "#d8e8a0").set(x, 24 - h + 9, "#d8e8a0");
        }
        pot(g, 3, 23, 10, 8, "#c4673f");
      });
    case "PLANT_2":
      // A monstera, one leaf with a hole in it.
      return sprite("plant2", 16, 32, (g) => {
        for (const [cx, cy, r] of [[5, 10, 4], [11, 9, 4], [8, 15, 4.5], [4, 18, 3], [12, 17, 3]] as const) {
          g.ellipse(cx, cy, r, r * 0.8, C.palm);
          g.set(cx - 1, cy - 1, C.palmHi);
        }
        g.set(8, 15, null).set(11, 9, C.palmLo).set(5, 10, C.palmLo);
        g.vline(8, 18, 6, C.palmLo);
        pot(g, 3, 23, 10, 8, "#f4f2ea");
      });
    case "LARGE_PLANT":
      // The fiddle-leaf fig, dropping a leaf whenever anyone moves it.
      return sprite("large-plant", 32, 48, (g) => {
        g.vline(16, 14, 22, C.trunkLo).vline(15, 20, 16, C.trunk);
        for (const [cx, cy] of [[10, 8], [20, 6], [15, 3], [8, 16], [23, 14], [12, 22], [21, 22], [16, 12], [6, 26], [25, 27]] as const) {
          g.ellipse(cx, cy, 4, 3.2, C.palm);
          g.set(cx - 1, cy - 1, C.palmHi).set(cx, cy - 1, C.palmHi).set(cx + 1, cy + 1, C.palmLo);
        }
        g.rect(25, 40, 3, 2, "#a89a3a");
        pot(g, 8, 35, 16, 12, "#e8e2d4");
        g.rect(10, 39, 12, 1, "#c4bca8");
      });
    case "CACTUS":
      // Succulents in a coffee mug.
      return sprite("cactus", 16, 32, (g) => {
        g.ellipse(6, 20, 3, 2.5, "#7ab88a");
        g.ellipse(10, 19, 3, 3, "#8ac89a");
        g.ellipse(8, 17, 2.5, 2, "#a8d8b0");
        g.set(10, 17, "#e8a0b0").set(5, 19, "#5a9870");
        g.rect(3, 22, 10, 9, "#f4f2ea");
        g.rect(3, 22, 10, 1, "#ffffff");
        g.rect(13, 24, 2, 4, "#f4f2ea");
        g.rect(5, 26, 6, 2, C.orange);
      });
    case "POT":
      // The plant nobody waters.
      return sprite("pot", 16, 16, (g) => {
        g.line(8, 9, 5, 4, "#a8944a").line(8, 9, 11, 5, "#b8a45a").vline(8, 3, 6, "#9a8a3a");
        g.set(5, 4, "#c8b46a").set(11, 5, "#c8b46a").rect(3, 10, 2, 1, "#c8b46a");
        pot(g, 4, 9, 8, 6, "#c4673f");
      });
    case "HANGING_PLANT":
      // A pothos in a macrame hanger, trailing down the wall.
      return sprite("hanging", 16, 32, (g) => {
        g.line(8, 0, 4, 10, "#e8dcc0").line(8, 0, 12, 10, "#e8dcc0").vline(8, 0, 10, "#e8dcc0");
        g.rect(4, 10, 9, 5, "#c4673f").rect(4, 10, 9, 1, "#d88a5a");
        for (const [x, len] of [[3, 14], [6, 9], [10, 16], [13, 11]] as const) {
          for (let y = 13; y < 13 + len; y += 2) g.rect(x + ((y / 2) % 2 ? 1 : 0), y, 2, 2, (y / 2) % 3 ? C.palm : C.palmHi);
        }
      });
  }
}
