// Sky Loft: furniture. Walnut, white oak, marble, cognac leather, blackened
// steel and brass; every sprite keeps its classic size.
import type { Layout, PropPlacement } from "../../layout.ts";
import { Grid, OUTLINE, recolor, shade } from "../../themekit.ts";
import { C, sprite } from "./kit.ts";

const BLACK = "#1f2126";

function couch(): HTMLCanvasElement {
  return sprite("couch", 84, 28, (g) => {
    g.rect(4, 22, 76, 2, C.wal).rect(4, 22, 76, 1, C.walHi);
    g.rect(7, 24, 2, 3, C.steel).rect(75, 24, 2, 3, C.steel);
    g.rrect(5, 3, 74, 11, C.oatLo, 2);
    g.rect(7, 4, 70, 1, C.oat);
    for (const sx of [30, 54]) g.vline(sx, 5, 8, shade(C.oatLo, -0.1));
    g.rect(3, 12, 78, 7, C.oat);
    g.rect(3, 12, 78, 1, C.oatHi);
    for (const sx of [29, 55]) g.vline(sx, 12, 7, C.oatLo);
    g.rect(3, 19, 78, 3, C.oatLo);
    g.rect(1, 8, 7, 14, C.oat).rect(1, 8, 7, 1, C.oatHi).rect(1, 20, 7, 2, C.oatLo);
    g.rect(76, 8, 7, 14, C.oat).rect(76, 8, 7, 1, C.oatHi).rect(76, 20, 7, 2, C.oatLo);
    // Bouclé texture
    for (let y = 13; y < 19; y += 2) for (let x = 5 + (y % 4 ? 1 : 0); x < 80; x += 4) g.set(x, y, "#d4cab9");
    g.rrect(10, 6, 9, 7, C.lea, 1).rect(11, 7, 6, 1, C.leaHi);
    g.rrect(65, 6, 9, 7, C.char, 1).rect(66, 7, 6, 1, C.charHi);
    g.outline(OUTLINE);
  });
}

function coffeeTable(): HTMLCanvasElement {
  return sprite("coffee-table", 38, 14, (g) => {
    g.rrect(1, 2, 36, 6, C.wal, 1);
    g.rect(2, 2, 34, 1, C.walHi);
    g.rect(1, 7, 36, 2, C.walLo);
    g.rect(4, 9, 30, 3, C.walDk);
    g.rect(5, 3, 9, 3, "#ece8df").rect(5, 5, 9, 1, "#cfc9bd");
    g.rect(6, 2, 8, 2, C.navy).rect(6, 2, 8, 1, C.navyHi);
    g.ellipse(28, 4, 4, 1.6, C.brass);
    g.rect(26, 3, 4, 1, C.brassHi);
    g.rect(19, 2, 3, 4, "#f2efe9").set(19, 2, "#ffffff");
    g.set(20, 1, C.leafHi).set(21, 0, C.leaf).set(19, 0, C.leafHi);
    g.outline(OUTLINE);
  });
}

function pingPong(): HTMLCanvasElement {
  return sprite("pingpong", 76, 26, (g) => {
    const w = 74;
    g.rect(1, 1, w, 13, "#2f3c4e");
    for (let y = 2; y < 13; y += 2) for (let x = 3 + (y % 4 ? 2 : 0); x < w; x += 6) g.set(x, y, "#34435a");
    g.rect(1, 1, w, 1, "#f2f2f0").rect(1, 13, w, 1, "#f2f2f0").vline(1, 1, 13, "#f2f2f0").vline(w, 1, 13, "#f2f2f0");
    g.hline(2, 7, w - 2, "#8794a6");
    g.rect(1, 14, w, 3, C.wal).rect(1, 14, w, 1, C.walHi);
    const nx = 1 + Math.floor(w / 2);
    g.rect(nx, 0, 1, 15, "#ecebe7");
    for (let y = 2; y < 14; y += 2) g.set(nx, y, "#b8bcc2");
    g.rect(nx - 1, 0, 3, 1, C.brass);
    g.rect(4, 17, 3, 7, C.walLo).rect(4, 17, 1, 7, C.wal).rect(w - 5, 17, 3, 7, C.walLo).rect(w - 5, 17, 1, 7, C.wal);
    g.rect(nx - 6, 17, 2, 5, C.steel).rect(nx + 5, 17, 2, 5, C.steel);
    g.outline(OUTLINE);
  });
}

function arcade(): HTMLCanvasElement {
  return sprite("arcade", 26, 48, (g) => {
    g.rect(2, 1, 22, 46, C.wal);
    g.vline(2, 1, 46, C.walHi).vline(23, 1, 46, C.walLo);
    g.rect(1, 1, 24, 8, BLACK);
    g.rect(3, 3, 20, 4, "#f3dfb0");
    g.rect(3, 3, 20, 1, "#fbf0d2");
    for (let i = 0; i < 4; i++) g.set(6 + i * 4, 5, [C.terra, C.navy, C.brassLo, C.sageLo][i]!);
    g.rect(2, 9, 22, 16, "#121317");
    g.rect(1, 25, 24, 6, C.walHi).rect(1, 25, 24, 1, shade(C.walHi, 0.2));
    g.set(6, 27, "#f2efe9").set(9, 28, C.brass).set(12, 27, C.terra);
    g.rect(17, 26, 1, 3, BLACK).set(17, 25, C.terra);
    g.rect(2, 32, 22, 15, C.walLo);
    g.rect(9, 36, 8, 4, BLACK).set(12, 37, C.brassHi).set(13, 37, C.brassHi);
    g.rect(2, 45, 22, 2, C.walDk);
    g.outline(OUTLINE);
  });
}

function beanbag(key: string, base: string, hi: string, lo: string): HTMLCanvasElement {
  return sprite(`beanbag-${key}`, 26, 16, (g) => {
    g.ellipse(13, 9, 11, 5.5, base);
    g.ellipse(13, 5.5, 8, 3.5, shade(base, 0.1));
    g.rect(7, 4, 5, 1, hi).set(6, 5, hi);
    g.rect(4, 12, 18, 1, lo).rect(6, 13, 14, 1, lo);
    g.set(13, 8, lo).set(8, 9, lo).set(18, 9, lo).set(13, 4, lo);
    g.outline(OUTLINE);
  });
}

function armchair(): HTMLCanvasElement {
  return sprite("armchair", 28, 26, (g) => {
    g.rrect(3, 1, 22, 15, C.walLo, 3);
    g.rrect(5, 2, 18, 13, C.lea, 2);
    g.rect(7, 3, 14, 1, C.leaHi);
    g.rect(7, 8, 14, 1, C.leaLo);
    g.rrect(1, 9, 6, 13, C.wal, 2).rect(2, 9, 4, 1, C.walHi);
    g.rrect(21, 9, 6, 13, C.wal, 2).rect(22, 9, 4, 1, C.walHi);
    g.rect(6, 14, 16, 6, C.leaHi).rect(6, 14, 16, 1, shade(C.leaHi, 0.15));
    g.rect(6, 20, 16, 2, C.leaLo);
    g.rect(12, 22, 4, 2, C.steel).rect(7, 24, 14, 1, C.steel);
    g.outline(OUTLINE);
  });
}

const BOOKS = [C.navy, "#e8e2d6", C.terra, C.sage, "#24272d", C.brass, C.lea, "#f2f0ec", "#7f8fa3"];

function books(g: Grid, x0: number, x1: number, base: number, seed: number, maxH = 8): void {
  let x = x0;
  let i = seed;
  while (x < x1) {
    const bw = 1 + (i % 3 === 0 ? 1 : 0) + (i % 5 === 0 ? 1 : 0);
    const bh = maxH - 2 + ((i * 7) % 3);
    if (x + bw > x1) break;
    const c = BOOKS[(i * 5) % BOOKS.length]!;
    g.rect(x, base - bh, bw, bh, c);
    g.set(x, base - bh, shade(c, 0.2));
    x += bw + (i % 6 === 4 ? 2 : 0);
    i++;
  }
}

function bookshelf(): HTMLCanvasElement {
  return sprite("bookshelf", 38, 36, (g) => {
    g.rect(1, 6, 36, 28, C.walLo);
    g.rect(1, 6, 36, 1, C.walHi);
    g.rect(3, 8, 32, 11, "#3a2418");
    g.rect(3, 21, 32, 11, "#3a2418");
    g.rect(1, 19, 36, 2, C.wal).rect(1, 19, 36, 1, C.walHi);
    g.rect(1, 32, 36, 2, C.wal);
    books(g, 4, 24, 19, 1, 9);
    g.rect(27, 13, 4, 6, "#f2efe9").rect(28, 11, 2, 2, "#f2efe9").set(27, 13, "#ffffff");
    books(g, 13, 34, 32, 4, 8);
    g.ellipse(7.5, 29.5, 2.5, 2.5, C.brass);
    g.set(6, 28, C.brassHi);
    // Up top: a trailing plant and a little sculpture.
    g.rect(6, 3, 5, 3, "#e9e6e0");
    g.set(7, 1, C.leafHi).set(8, 0, C.leaf).set(6, 2, C.leaf).set(10, 2, C.leafHi).set(11, 4, C.leaf).set(11, 5, C.leafHi);
    g.rect(27, 2, 2, 4, BLACK).rect(26, 1, 4, 1, BLACK);
    g.outline(OUTLINE);
  });
}

function lamp(): HTMLCanvasElement {
  return sprite("lamp", 16, 52, (g) => {
    g.rect(2, 1, 12, 9, "#efe7d6");
    g.rect(2, 1, 12, 1, "#f9f4ea");
    g.rect(2, 8, 12, 2, "#d9cfba");
    g.rect(3, 2, 1, 6, "#f9f4ea");
    g.rect(7, 10, 2, 38, "#25272c");
    g.rect(7, 10, 2, 1, C.brass);
    g.rect(7, 30, 2, 1, C.brass);
    g.rect(3, 48, 10, 2, "#e8e6e1").rect(3, 48, 10, 1, "#fbfaf8");
    g.outline(OUTLINE);
  });
}

function printer(): HTMLCanvasElement {
  return sprite("printer", 30, 26, (g) => {
    g.rect(2, 14, 26, 10, C.wal).rect(2, 14, 26, 1, C.walHi);
    g.rect(14, 15, 1, 9, C.walLo);
    g.set(11, 18, C.brass).set(17, 18, C.brass);
    g.rrect(2, 3, 26, 11, "#ebebe8", 1);
    g.rect(3, 3, 24, 1, "#f8f8f6");
    g.rect(4, 4, 22, 2, "#2b2e34");
    g.rect(6, 8, 18, 2, "#c4c7cb");
    g.rect(20, 10, 6, 3, "#1f2b36").set(22, 11, C.led).set(24, 11, "#ffffff");
    g.set(5, 11, "#5ad18a");
    g.rect(8, 0, 14, 3, "#ffffff").rect(9, 1, 8, 1, "#d9d6cf");
    g.outline(OUTLINE);
  });
}

function cooler(): HTMLCanvasElement {
  // A sparkling water tap: a slim brushed-steel column.
  return sprite("cooler", 17, 36, (g) => {
    g.rect(3, 3, 11, 31, "#c6cad0");
    g.rect(3, 3, 1, 31, "#e4e7eb").rect(4, 3, 1, 31, "#d6dade");
    g.rect(13, 3, 1, 31, "#a2a7ae");
    g.rect(3, 1, 11, 2, BLACK).rect(4, 1, 9, 1, "#3a3d44");
    g.rect(5, 6, 7, 3, "#14202b").set(6, 7, C.led).set(8, 7, C.ledHi).set(10, 7, C.led);
    g.rect(5, 11, 7, 10, "#2a2d33");
    g.rect(7, 11, 3, 2, "#9aa0a8").set(8, 13, "#c3c8cf");
    g.rect(7, 16, 3, 4, "#cfe8f4").set(7, 16, "#ffffff").set(9, 18, "#a9d4ea");
    g.rect(5, 20, 7, 1, "#8a8f96");
    g.rect(3, 33, 11, 2, BLACK);
    g.outline(OUTLINE);
  });
}

function meetingTable(): HTMLCanvasElement {
  return sprite("meeting-table", 68, 30, (g) => {
    g.rect(1, 1, 66, 20, C.wal);
    g.rect(1, 1, 66, 1, C.walHi);
    for (const [y, x, w] of [[4, 6, 20], [7, 30, 26], [11, 10, 18], [15, 36, 22], [17, 4, 14], [9, 48, 14]] as const) g.rect(x, y, w, 1, "#66402d");
    g.rect(1, 20, 66, 1, C.walLo);
    g.rect(1, 21, 66, 1, C.walDk);
    g.rect(10, 22, 3, 5, C.steel).rect(55, 22, 3, 5, C.steel);
    g.rect(7, 27, 9, 1, C.steel).rect(52, 27, 9, 1, C.steel);
    // A water carafe with glasses, and an orchid at the far end.
    g.rect(4, 4, 3, 5, "#d8eaf2").set(4, 4, "#ffffff").rect(5, 2, 1, 2, "#d8eaf2");
    g.rect(8, 7, 2, 2, "#d8eaf2").rect(4, 10, 2, 2, "#d8eaf2");
    g.rect(61, 7, 4, 3, "#f2f0ec").set(61, 7, "#ffffff");
    g.set(62, 6, C.leafHi).set(63, 5, C.leaf).set(63, 4, C.leaf).set(64, 3, "#f4e8f0").set(62, 3, "#f4e8f0").set(63, 2, "#e9c2d8").set(65, 4, "#e9c2d8");
    g.outline(OUTLINE);
  });
}

function chairFront(key: string, body: string, hi: string): HTMLCanvasElement {
  // A leather boardroom chair facing you (the back rises behind the sitter).
  return sprite(`chair-front-${key}`, 16, 32, (g) => {
    g.rrect(2, 8, 12, 10, body, 2);
    g.rect(4, 9, 8, 1, hi);
    g.rect(4, 12, 8, 1, shade(body, -0.12)).rect(4, 15, 8, 1, shade(body, -0.12));
    g.rrect(2, 18, 12, 6, shade(body, 0.08), 1);
    g.rect(3, 18, 10, 1, hi);
    g.rect(1, 17, 1, 4, C.chromeLo).rect(14, 17, 1, 4, C.chromeLo);
    g.rect(7, 24, 2, 4, C.chrome);
    g.rect(3, 28, 10, 1, C.chromeLo);
    g.set(3, 29, BLACK).set(12, 29, BLACK).set(7, 29, BLACK).set(8, 29, BLACK);
    g.outline(OUTLINE);
  });
}

function chairBack(key: string, body: string, hi: string): HTMLCanvasElement {
  // The same chair seen from behind (the sitter faces away from you).
  return sprite(`chair-back-${key}`, 16, 32, (g) => {
    g.rrect(2, 14, 12, 11, body, 2);
    g.rect(4, 15, 8, 1, hi);
    g.rect(7, 17, 2, 6, shade(body, -0.12));
    g.rect(2, 25, 12, 2, shade(body, 0.08));
    g.rect(7, 27, 2, 2, C.chrome);
    g.rect(3, 29, 10, 1, C.chromeLo);
    g.set(3, 30, BLACK).set(12, 30, BLACK).set(7, 30, BLACK).set(8, 30, BLACK);
    g.outline(OUTLINE);
  });
}

function planRolls(): HTMLCanvasElement {
  return sprite("plan-rolls", 18, 28, (g) => {
    const rolls: [number, number, string][] = [
      [3, 1, "#7fb3e6"],
      [8, 4, "#fbfaf5"],
      [12, 2, "#5a8fd0"],
      [6, 7, "#9fc4ff"],
    ];
    for (const [x, y, c] of rolls) {
      g.rect(x, y, 3, 16, c);
      g.rect(x, y, 3, 1, shade(c, 0.2));
      g.set(x + 1, y, shade(c, -0.25));
    }
    g.rect(2, 15, 14, 12, BLACK);
    for (let x = 3; x < 16; x += 2) g.rect(x, 16, 1, 10, "#3a3d45");
    g.rect(2, 15, 14, 1, C.brass);
    g.rect(2, 26, 14, 1, C.steelLo);
    g.outline(OUTLINE);
  });
}

function glassFront(w: number, gapX: number, wood: boolean): HTMLCanvasElement {
  return sprite(`front-${w}-${gapX}-${wood}`, w, 11, (g) => {
    const frame = wood ? C.walDk : C.steel;
    const light = wood ? C.walHi : C.steelHi;
    const glass = wood ? "#d6c6aeb0" : "#e2ecf2a8";
    const band = wood ? "#efe3cfe0" : "#f7fafcea";
    const open = (x: number) => gapX >= 0 && x >= gapX - 9 && x < gapX + 9;
    for (let x = 0; x < w; x++) {
      if (open(x)) continue;
      g.set(x, 0, frame).set(x, 1, light);
      for (let y = 2; y < 9; y++) g.set(x, y, glass);
      g.set(x, 4, x % 2 ? band : glass).set(x, 5, band);
      g.set(x, 9, frame).set(x, 10, wood ? "#2a170e" : C.steelLo);
    }
    for (let x = 14; x < w; x += 30) {
      if (open(x) || open(x + 1)) continue;
      g.vline(x, 1, 9, frame);
    }
    for (let x = 4; x < w; x += 30) {
      if (open(x) || open(x + 3)) continue;
      g.set(x, 3, "#ffffffcc").set(x + 1, 2, "#ffffffaa").set(x + 3, 7, "#ffffff88");
    }
    if (gapX >= 0) {
      for (const x of [gapX - 10, gapX + 9]) if (x >= 0 && x < w) g.vline(x, 0, 11, frame);
    }
  });
}

function libraryShelf(): HTMLCanvasElement {
  return sprite("library-shelf", 32, 32, (g) => {
    g.rect(1, 1, 30, 30, C.walLo);
    g.rect(1, 1, 30, 1, C.walHi);
    for (const y of [3, 12, 21]) {
      g.rect(3, y, 26, 8, "#3a2418");
      g.rect(1, y + 8, 30, 1, C.wal);
    }
    books(g, 4, 20, 11, 2, 7);
    g.rect(22, 7, 3, 4, "#f2efe9").set(22, 7, "#ffffff");
    books(g, 9, 28, 20, 7, 7);
    g.ellipse(5.5, 18.5, 1.5, 1.5, C.brass);
    books(g, 4, 16, 29, 3, 7);
    g.rect(19, 27, 9, 2, C.navy).rect(19, 25, 7, 2, "#e8e2d6");
    g.rect(1, 30, 30, 1, C.walDk);
    g.outline(OUTLINE);
  });
}

function libraryTable(): HTMLCanvasElement {
  return sprite("library-table", 32, 32, (g) => {
    g.rect(2, 6, 28, 21, C.oak);
    g.rect(2, 6, 28, 1, C.oakHi);
    for (const [y, x, w] of [[10, 5, 12], [15, 12, 14], [20, 4, 10], [23, 16, 10]] as const) g.rect(x, y, w, 1, "#ccad80");
    g.rect(2, 26, 28, 2, C.oakLo).rect(2, 27, 28, 1, C.oakDk);
    g.rect(4, 28, 2, 3, BLACK).rect(26, 28, 2, 3, BLACK);
    // An open book and a brass reading lamp.
    g.rect(8, 13, 9, 5, "#f7f4ec").vline(12, 13, 5, "#d9d3c6");
    g.rect(22, 15, 4, 1, C.brassLo).rect(23, 10, 1, 5, C.brass).rect(21, 8, 5, 2, C.brass).set(21, 8, C.brassHi);
    g.outline(OUTLINE);
  });
}

function sofaFront(): HTMLCanvasElement {
  return sprite("sofa-front", 32, 16, (g) => {
    g.rect(1, 0, 30, 3, C.charLo);
    g.rect(0, 1, 32, 2, C.char);
    g.rect(1, 1, 30, 1, C.charHi);
    g.rect(0, 3, 32, 4, C.charLo);
    g.rect(0, 7, 32, 6, C.char).rect(0, 7, 32, 1, C.charHi);
    g.vline(15, 7, 6, C.charLo);
    g.rect(0, 13, 32, 1, C.walLo);
    g.rect(1, 14, 2, 2, C.steel).rect(29, 14, 2, 2, C.steel);
  });
}

function sofaBack(): HTMLCanvasElement {
  return sprite("sofa-back", 32, 16, (g) => {
    g.rect(1, 2, 30, 1, C.charHi);
    g.rect(0, 3, 32, 10, C.char);
    g.rect(0, 3, 32, 1, C.charHi);
    for (let y = 6; y < 12; y += 2) for (let x = 2 + (y % 4 ? 2 : 0); x < 30; x += 4) g.set(x, y, C.charLo);
    g.rect(0, 13, 32, 1, C.walLo);
    g.rect(1, 14, 2, 2, C.steel).rect(29, 14, 2, 2, C.steel);
  });
}

function lowShelf(): HTMLCanvasElement {
  return sprite("low-shelf", 32, 16, (g) => {
    g.rect(1, 6, 30, 9, C.wal);
    g.rect(1, 6, 30, 1, C.walHi);
    g.rect(3, 8, 12, 5, "#3a2418");
    books(g, 4, 14, 13, 5, 5);
    g.rect(17, 8, 12, 5, C.walLo).vline(23, 8, 5, C.walDk).set(21, 10, C.brass).set(25, 10, C.brass);
    g.rect(19, 2, 3, 4, "#f2efe9").set(20, 1, C.leaf).set(21, 0, C.leafHi);
    g.rect(6, 4, 6, 2, C.navy).rect(7, 3, 5, 1, "#e8e2d6");
    g.rect(2, 15, 2, 1, C.steel).rect(28, 15, 2, 1, C.steel);
    g.outline(OUTLINE);
  });
}

function planter(width: number): HTMLCanvasElement {
  return sprite(`planter-${width}`, width, 20, (g) => {
    g.rect(1, 11, width - 2, 8, "#b8b4ad");
    g.rect(1, 11, width - 2, 1, "#d2cec7");
    g.rect(1, 17, width - 2, 2, "#a19d96");
    for (let x = 8; x < width - 6; x += 16) g.set(x, 14, "#9d9991");
    g.rect(2, 10, width - 4, 1, "#4a3a2c");
    for (let x = 6; x < width - 8; x += 20) {
      g.ellipse(x + 4, 7, 4, 3.4, C.leafLo);
      g.ellipse(x + 3.5, 6, 2.6, 2, C.leaf);
      g.set(x + 2, 5, C.leafHi);
    }
    g.outline(OUTLINE);
    // Grasses spill over the rim (no outline, they're fine).
    const blades = [C.olive, C.oliveHi, C.oliveLo, C.leafHi];
    for (let x = 3; x < width - 3; x += 2) {
      if ((x + 2) % 20 < 9) continue;
      const h = 4 + ((x * 7) % 6);
      const c = blades[(x / 2) % blades.length | 0]!;
      for (let k = 0; k < h; k++) g.set(x + (k > h - 3 ? ((x / 2) % 2 ? 1 : -1) : 0), 10 - k, c);
    }
  });
}

function kitchenIsland(width: number): HTMLCanvasElement {
  return sprite(`island-${width}`, width + 2, 26, (g) => {
    const w = width;
    g.rect(1, 1, w, 11, C.marb);
    g.rect(1, 1, w, 1, C.marbHi);
    for (let x = 6; x < w; x += 17) {
      g.set(x, 3, C.vein).set(x + 1, 4, C.vein).set(x + 2, 4, C.vein).set(x + 3, 5, C.vein).set(x + 5, 6, C.vein).set(x + 6, 7, C.vein);
    }
    g.rect(1, 12, w, 2, C.marbLo);
    g.rect(1, 14, w, 8, C.wal);
    for (let x = 2; x < w; x += 2) g.vline(x, 14, 8, C.walLo);
    g.rect(1, 14, w, 1, C.walHi);
    g.rect(2, 22, w - 2, 2, "#1b1d21");
    // Espresso cups, a bowl of lemons, a vase of olive branches.
    for (const x of [8, 13]) g.rect(x, 5, 3, 2, "#ffffff").set(x + 3, 5, "#ffffff").set(x + 1, 7, C.marbLo);
    g.ellipse(w - 14, 6, 5, 2.4, C.char);
    g.ellipse(w - 14, 5.5, 4, 1.4, C.charHi);
    g.set(w - 16, 4, "#f2d14a").set(w - 13, 4, "#e9c43c").set(w - 15, 5, "#f7dc6a").set(w - 12, 5, "#f2d14a");
    g.rect(w - 30, 4, 3, 5, "#e9e6e0").set(w - 30, 4, "#ffffff");
    g.set(w - 29, 3, C.olive).set(w - 30, 2, C.oliveHi).set(w - 28, 2, C.olive).set(w - 31, 1, C.oliveLo).set(w - 27, 1, C.oliveHi);
    g.outline(OUTLINE);
  });
}

function kitchenCounter(width: number): HTMLCanvasElement {
  return sprite(`kcounter-${width}`, width + 2, 36, (g) => {
    const w = width;
    const top = 10;
    g.rect(1, top, w, 6, C.marb);
    g.rect(1, top, w, 1, C.marbHi);
    for (let x = 9; x < w; x += 23) g.set(x, top + 2, C.vein).set(x + 1, top + 3, C.vein).set(x + 3, top + 3, C.vein).set(x + 4, top + 4, C.vein);
    g.rect(1, top + 5, w, 2, C.marbLo);
    g.rect(1, top + 7, w, 17, C.char);
    g.rect(1, top + 7, w, 1, C.charHi);
    for (let x = 3; x < w - 3; x += 22) {
      g.rect(x, top + 9, Math.min(20, w - 3 - x), 13, "#51545c");
      g.rect(x, top + 9, Math.min(20, w - 3 - x), 1, "#5c6068");
      g.rect(x + 8, top + 10, 4, 1, C.brass);
    }
    g.rect(1, top + 24, w, 2, "#1b1d21");
    // A black gooseneck kettle on its base.
    g.rect(31, 13, 9, 1, "#2a2c31");
    g.rrect(32, 7, 8, 6, BLACK, 2);
    g.rect(33, 8, 2, 1, "#3d4048");
    g.set(36, 6, C.brass);
    g.rect(30, 8, 1, 4, BLACK);
    g.set(40, 10, BLACK).set(41, 9, BLACK).set(42, 8, BLACK).set(43, 8, BLACK);
    if (w >= 80) {
      // Undermount sink with a matte black faucet.
      g.rect(44, top + 1, 15, 4, "#c9ced4");
      g.rect(45, top + 2, 13, 2, "#a3aab3");
      g.rect(51, top - 5, 2, 6, BLACK).rect(51, top - 5, 4, 1, BLACK).set(54, top - 4, BLACK);
      // Olive oil and a pot of basil.
      g.rect(62, top - 6, 2, 6, "#9aa34a").set(62, top - 7, "#3a3d44").set(63, top - 7, "#3a3d44");
      g.rect(66, top - 3, 5, 3, C.terra).set(67, top - 5, C.leafHi).set(68, top - 6, C.leaf).set(69, top - 5, C.leafHi).set(70, top - 4, C.leaf).set(66, top - 4, C.leaf);
    }
    if (w >= 100) {
      g.rect(w - 26, 0, 22, 14, BLACK);
      g.rect(w - 26, 0, 22, 1, "#3d4048");
      g.rect(w - 24, 2, 13, 10, "#353a44");
      g.rect(w - 23, 3, 4, 1, "#4d5462");
      g.rect(w - 9, 3, 3, 8, "#111316").set(w - 8, 4, C.led);
    }
    g.rect(w >= 80 ? 74 : 20, top - 3, 3, 3, "#ffffff").rect(w >= 100 ? w - 34 : w - 8, top - 3, 3, 3, "#f2efe9");
    g.outline(OUTLINE);
  });
}

function stool(): HTMLCanvasElement {
  return sprite("stool", 12, 10, (g) => {
    g.ellipse(5.5, 2.5, 4.5, 2, C.wal);
    g.rect(3, 1, 4, 1, C.walHi);
    g.rect(5, 4, 2, 4, C.steel);
    g.rect(3, 6, 6, 1, C.brass);
    g.rect(3, 8, 6, 1, C.steel);
    g.outline(OUTLINE);
  });
}

function fridge(): HTMLCanvasElement {
  return sprite("fridge", 20, 34, (g) => {
    g.rrect(1, 1, 18, 31, "#c6cbd1", 1);
    g.rect(2, 2, 1, 29, "#e0e4e9");
    for (let x = 4; x < 18; x += 3) g.vline(x, 2, 19, "#bfc4ca");
    g.rect(1, 21, 18, 1, "#8f959e");
    g.vline(10, 1, 20, "#8f959e");
    g.rect(8, 6, 1, 11, BLACK).rect(11, 6, 1, 11, BLACK);
    g.rect(5, 24, 10, 1, BLACK);
    g.rect(14, 3, 3, 2, "#1d2a36").set(15, 3, C.led);
    g.rect(1, 31, 18, 1, "#2a2c31");
    g.outline(OUTLINE);
  });
}

function vending(): HTMLCanvasElement {
  // The micro-market: a glass-front cooler with a pay screen.
  return sprite("vending", 24, 44, (g) => {
    g.rect(1, 1, 22, 42, "#202227");
    g.rect(1, 1, 22, 3, C.wal).rect(1, 1, 22, 1, C.walHi);
    g.rect(3, 3, 18, 1, "#ffe6b8");
    g.rect(3, 5, 13, 28, "#0f1114");
    const items = ["#d6e9f2", C.terra, "#e8d27a", C.sage, "#f2f0ec", "#7cc8ff", "#e98a6f", "#c9b48a"];
    for (let r = 0; r < 4; r++) {
      g.rect(3, 11 + r * 7, 13, 1, "#3a3f48");
      for (let c = 0; c < 4; c++) {
        const col = items[(r * 3 + c) % items.length]!;
        const tall = (r + c) % 2 === 0;
        g.rect(4 + c * 3, (tall ? 6 : 8) + r * 7, 2, tall ? 5 : 3, col);
        g.set(4 + c * 3, (tall ? 6 : 8) + r * 7, shade(col, 0.3));
      }
    }
    g.rect(17, 6, 5, 10, "#2a2d34");
    g.rect(18, 7, 3, 5, "#1a3550").set(19, 8, C.led).set(18, 10, "#ffffff");
    g.rect(18, 13, 3, 2, "#444a55");
    g.rect(17, 18, 5, 2, C.brass);
    g.rect(3, 35, 18, 5, "#141518");
    g.rect(3, 34, 18, 1, C.brassLo);
    g.rect(1, 42, 22, 1, C.steelLo);
    g.outline(OUTLINE);
  });
}

function fishtankStand(): HTMLCanvasElement {
  return sprite("fishtank-stand", 42, 22, (g) => {
    g.rect(1, 1, 40, 18, C.wal);
    g.rect(1, 1, 40, 2, C.walHi);
    g.rect(1, 3, 40, 1, C.walLo);
    for (const x of [14, 27]) g.vline(x, 4, 15, C.walLo);
    for (let x = 3; x < 40; x += 2) if (x !== 14 && x !== 27) g.vline(x, 5, 13, "#66402e");
    g.set(12, 10, C.brass).set(16, 10, C.brass).set(25, 10, C.brass).set(29, 10, C.brass);
    g.rect(3, 19, 2, 2, C.steel).rect(37, 19, 2, 2, C.steel);
    g.outline(OUTLINE);
  });
}

function whiteboard(w: number): HTMLCanvasElement {
  // A frameless glass board on a slim black easel.
  return sprite(`whiteboard-${w}`, w + 2, 46, (g) => {
    g.rect(1, 1, w, 34, "#c5cdd4");
    g.rect(2, 2, w - 2, 32, "#edf2f5");
    g.rect(3, 3, w - 4, 30, "#fbfcfd");
    for (const [x, y] of [[2, 2], [w - 1, 2], [2, 33], [w - 1, 33]] as const) g.set(x, y, C.chromeLo);
    g.set(w - 8, 5, "#ffffff").set(w - 9, 6, "#e8eef2");
    g.rect(1, 35, w, 2, C.steel).rect(1, 35, w, 1, C.steelHi);
    g.rect(8, 34, 6, 1, "#2a2c31").rect(16, 34, 6, 1, "#3e8ed0").rect(24, 34, 6, 1, C.terra);
    g.rect(5, 37, 2, 8, C.steel).rect(w - 6, 37, 2, 8, C.steel);
    g.rect(3, 44, 6, 1, C.steel).rect(w - 8, 44, 6, 1, C.steel);
    g.outline(OUTLINE);
  });
}

function tv(w: number, h: number, standing: boolean): HTMLCanvasElement {
  return sprite(`tv-${w}-${h}-${standing}`, w + 2, h + (standing ? 22 : 4), (g) => {
    g.rrect(1, 1, w, h, "#16171b", 1);
    g.rect(2, 1, w - 2, 1, "#33363d");
    g.rect(3, 3, w - 4, h - 4, "#0c0d10");
    g.set(w - 3, h - 1, "#7cc8ff");
    if (standing) {
      g.rect(1 + w / 2 - 4, h + 1, 8, 4, "#22242a");
      g.rect(6, h + 5, w - 10, 13, C.wal);
      g.rect(6, h + 5, w - 10, 1, C.walHi);
      for (let x = 8; x < w - 5; x += 2) g.vline(x, h + 7, 10, C.walLo);
      g.rect(6, h + 17, w - 10, 1, C.walDk);
      g.rect(9, h + 18, 2, 3, C.steel).rect(w - 7, h + 18, 2, 3, C.steel);
    } else {
      g.rect(1 + w / 2 - 22, h + 1, 44, 2, "#1d1f24");
      g.rect(1 + w / 2 - 22, h + 1, 44, 1, "#34373e");
    }
    g.outline(OUTLINE);
  });
}

function piano(): HTMLCanvasElement {
  // A black lacquer baby grand, keyboard toward the player.
  return sprite("piano", 32, 32, (g) => {
    const lac = "#17181c";
    for (let y = 1; y <= 13; y++) {
      const right = 30 - Math.round(((13 - y) * (13 - y)) / 16);
      g.rect(2, y, right - 1, 1, lac);
    }
    g.rect(3, 2, 1, 10, "#3a3d45");
    for (let i = 0; i < 6; i++) g.set(10 + i * 2, 3 + i, "#33363e");
    g.rect(9, 8, 14, 4, "#0d0e11");
    g.rect(11, 8, 10, 3, "#f4f2ec").rect(12, 9, 8, 1, "#c9c4b8");
    g.rect(1, 14, 30, 2, "#0d0e11");
    g.rect(2, 16, 28, 3, "#f4f2ec");
    for (let x = 3; x < 30; x += 3) g.rect(x, 16, 1, 2, "#1c1d21");
    g.rect(1, 19, 30, 2, lac);
    g.set(29, 15, C.brass);
    g.rect(3, 21, 2, 8, lac).rect(27, 21, 2, 8, lac);
    g.set(3, 29, C.brass).set(4, 29, C.brass).set(27, 29, C.brass).set(28, 29, C.brass);
    g.rect(15, 21, 2, 5, lac);
    g.rect(14, 26, 4, 1, C.brass);
    g.outline(OUTLINE);
  });
}

function waitingSofa(w: number): HTMLCanvasElement {
  return sprite(`wait-sofa-${w}`, w + 2, 22, (g) => {
    g.rrect(3, 1, w - 4, 11, C.leaLo, 2);
    g.rect(5, 2, w - 8, 1, C.lea);
    for (let x = 6; x < w - 3; x += 4) g.set(x, 5, shade(C.leaLo, -0.15)).set(x + 2, 8, shade(C.leaLo, -0.15));
    g.rect(1, 6, 5, 12, C.lea).rect(w - 4, 6, 5, 12, C.lea);
    g.rect(1, 6, 5, 1, C.leaHi).rect(w - 4, 6, 5, 1, C.leaHi);
    g.rect(6, 10, w - 10, 7, C.lea);
    const half = (w - 10) / 2;
    g.rect(6, 10, half - 1, 2, C.leaHi).rect(6 + half + 1, 10, half - 1, 2, C.leaHi);
    g.vline(6 + Math.floor(half), 10, 7, C.leaLo);
    g.rect(1, 17, w, 2, C.walDk);
    g.rect(3, 19, 2, 2, C.steel).rect(w - 3, 19, 2, 2, C.steel);
    g.outline(OUTLINE);
  });
}

function waitingSofaBack(w: number): HTMLCanvasElement {
  return sprite(`sofa-back-${w}`, w + 2, 16, (g) => {
    g.rect(1, 1, w, 10, C.leaLo);
    g.rect(1, 1, w, 2, C.lea);
    g.rect(3, 1, w - 4, 1, C.leaHi);
    for (let x = 4; x < w - 2; x += 5) g.vline(x, 4, 6, shade(C.leaLo, -0.12));
    g.rect(1, 11, w, 2, C.walDk);
    g.rect(2, 13, 2, 2, C.steel).rect(w - 2, 13, 2, 2, C.steel);
    g.outline(OUTLINE);
  });
}

function armchairSide(left: boolean): HTMLCanvasElement {
  return sprite(left ? "arm-side-left" : "arm-side", 18, 20, (g) => {
    const s = new Grid(18, 20);
    s.rrect(1, 1, 5, 15, C.leaLo, 1);
    s.rect(2, 2, 2, 12, C.lea);
    s.rect(5, 9, 11, 6, C.lea);
    s.rect(5, 9, 11, 2, C.leaHi);
    s.rect(13, 7, 4, 8, C.leaLo).rect(13, 7, 4, 1, C.lea);
    s.rect(1, 15, 16, 2, C.walLo);
    s.rect(2, 17, 2, 2, C.steel).rect(14, 17, 2, 2, C.steel);
    s.outline(OUTLINE);
    g.stamp(left ? s.flipped() : s, 0, 0);
  });
}

function loungeTable(): HTMLCanvasElement {
  return sprite("lounge-table", 28, 12, (g) => {
    g.ellipse(13.5, 4.5, 12.5, 4, C.marbLo);
    g.ellipse(13.5, 4, 11.5, 3, C.marb);
    g.set(6, 4, C.vein).set(7, 5, C.vein).set(9, 5, C.vein).set(19, 3, C.vein).set(20, 2, C.vein);
    g.rect(5, 3, 6, 3, C.navy).rect(6, 3, 5, 1, C.navyHi).rect(6, 2, 4, 1, "#e8e2d6");
    g.rect(17, 2, 3, 3, "#f2efe9").set(18, 1, C.leaf).set(18, 0, C.leafHi).set(19, 0, C.leaf);
    g.rect(12, 8, 4, 3, C.steel);
    g.outline(OUTLINE);
  });
}

function serverRack(): HTMLCanvasElement {
  return sprite("server-rack", 16, 33, (g) => {
    g.rect(1, 1, 14, 30, "#16181d");
    g.rect(1, 1, 14, 1, "#3a3f4c");
    for (let y = 3; y < 29; y += 4) {
      g.rect(3, y, 10, 3, "#23272f");
      g.rect(3, y, 10, 1, "#2f3440");
      g.rect(4, y + 1, 5, 1, "#121419");
    }
    g.vline(1, 2, 29, "#2f6fa8");
    g.set(13, 6, "#3a4250").set(12, 7, "#3a4250").set(13, 18, "#3a4250");
    g.rect(1, 31, 14, 1, "#0b0c0f");
    g.outline(OUTLINE);
  });
}

function reception(): HTMLCanvasElement {
  return sprite("reception", 36, 22, (g) => {
    g.rect(1, 6, 34, 5, C.marb);
    g.rect(1, 6, 34, 1, C.marbHi);
    g.set(8, 8, C.vein).set(9, 9, C.vein).set(22, 7, C.vein).set(23, 8, C.vein);
    g.rect(1, 11, 34, 9, C.oak);
    for (let x = 2; x < 35; x += 2) g.vline(x, 11, 9, C.oakLo);
    g.rect(1, 11, 34, 1, C.oakHi);
    g.rect(1, 19, 34, 1, C.brass);
    g.rect(1, 20, 34, 1, C.steelLo);
    // Brass bell and a visitor sign-in tablet.
    g.ellipse(9, 4, 3.5, 2.5, C.brass);
    g.rect(7, 3, 2, 1, C.brassHi);
    g.rect(6, 5, 7, 1, C.brassLo);
    g.set(9, 1, C.brassHi);
    g.rect(24, 1, 7, 6, "#1f2126");
    g.rect(25, 2, 5, 3, "#2b4a66").set(26, 3, C.ledHi);
    g.rect(26, 5, 3, 1, "#3a3d44");
    g.outline(OUTLINE);
  });
}

function bossDesk(w: number): HTMLCanvasElement {
  return sprite(`boss-desk-${w}`, w + 2, 30, (g) => {
    g.rect(1, 1, w, 12, "#4a2c1e");
    g.rect(1, 1, w, 1, "#6e4632");
    for (const [y, x, l] of [[4, 4, 14], [7, 24, 20], [10, 10, 16]] as const) g.rect(x, y, Math.min(l, w - x - 2), 1, "#43271a");
    g.rect(1, 13, w, 12, "#3a2216");
    g.rect(1, 13, w, 1, "#5a3828");
    for (let x = 4; x < w - 2; x += 3) g.vline(x, 15, 9, "#331d12");
    g.rect(4, 14, w - 8, 1, C.brassLo);
    g.rect(2, 25, 3, 4, C.steel).rect(w - 3, 25, 3, 4, C.steel);
    // Monitor back, a leather pad, nameplate, tumbler and a brass lamp.
    g.rect(8, 1, 14, 9, "#c3c8cf").rect(9, 2, 12, 7, "#d9dde2").rect(14, 4, 2, 2, "#ffffff");
    g.rect(26, 4, 12, 7, "#2a2c31").rect(26, 4, 12, 1, "#3d4048");
    g.rect(w - 24, 9, 10, 2, C.brass).rect(w - 23, 10, 8, 1, C.brassLo);
    g.rect(w - 8, 5, 3, 4, "#d8eaf2").set(w - 8, 5, "#ffffff").rect(w - 8, 8, 3, 1, "#c48a52");
    g.outline(OUTLINE);
  });
}

function bossChair(): HTMLCanvasElement {
  return sprite("boss-chair", 22, 26, (g) => {
    g.rrect(2, 1, 18, 18, C.lea, 3);
    g.rect(4, 2, 14, 1, C.leaHi);
    for (const y of [6, 10, 14]) g.rect(5, y, 12, 1, C.leaLo);
    g.rect(1, 12, 3, 8, C.chromeLo).rect(1, 12, 3, 1, C.chrome);
    g.rect(18, 12, 3, 8, C.chromeLo).rect(18, 12, 3, 1, C.chrome);
    g.rect(10, 19, 2, 4, C.chrome);
    g.rect(5, 23, 12, 1, C.chromeLo);
    g.set(5, 24, BLACK).set(16, 24, BLACK).set(10, 24, BLACK);
    g.outline(OUTLINE);
  });
}

function dogBed(): HTMLCanvasElement {
  return sprite("dog-bed", 26, 14, (g) => {
    g.ellipse(12.5, 7, 11.5, 5.5, C.char);
    g.ellipse(12.5, 6, 10.5, 4, C.charHi);
    g.ellipse(12.5, 7.5, 8.5, 3.5, C.oat);
    g.set(9, 6, C.oatHi).set(15, 8, C.oatHi).set(12, 7, C.oatLo);
    g.outline(OUTLINE);
  });
}

function bin(): HTMLCanvasElement {
  return sprite("bin", 16, 16, (g) => {
    g.rect(4, 4, 8, 10, "#2a2c31");
    g.rect(5, 4, 1, 10, "#41454e");
    g.rect(10, 4, 1, 10, "#1d1f23");
    g.rect(4, 3, 8, 1, C.brass);
    g.rect(5, 2, 6, 1, C.brassHi);
    g.rect(5, 4, 6, 1, "#121316");
    g.rect(5, 14, 6, 1, "#1b1d21");
    g.outline(OUTLINE);
  });
}

function sideTable(): HTMLCanvasElement {
  return sprite("side-table", 18, 14, (g) => {
    g.rect(1, 1, 16, 7, C.marb);
    g.rect(1, 1, 16, 1, C.marbHi);
    g.rect(1, 7, 16, 1, C.marbLo);
    g.set(5, 3, C.vein).set(6, 4, C.vein).set(12, 5, C.vein);
    g.rect(3, 2, 6, 3, C.navy).rect(4, 2, 5, 1, C.navyHi);
    g.rect(12, 1, 3, 4, "#e9e6e0").set(13, 0, C.leaf);
    g.rect(2, 8, 2, 5, C.steel).rect(14, 8, 2, 5, C.steel);
    g.outline(OUTLINE);
  });
}

function bench(): HTMLCanvasElement {
  return sprite("bench", 36, 16, (g) => {
    for (const y of [1, 4]) g.rect(2, y, 32, 2, C.oak).rect(2, y, 32, 1, C.oakHi);
    g.rect(4, 3, 2, 6, C.steel).rect(30, 3, 2, 6, C.steel);
    g.rect(1, 8, 34, 3, C.oak).rect(1, 8, 34, 1, C.oakHi).rect(1, 10, 34, 1, C.oakLo);
    g.rect(3, 11, 2, 4, C.steel).rect(31, 11, 2, 4, C.steel);
    g.outline(OUTLINE);
  });
}

/** Black speakers with a charcoal grille and brass caps (the pulse shows on the woofer). */
export function skylineSpeaker(): HTMLCanvasElement {
  return sprite("speaker", 12, 28, (g) => {
    g.rrect(1, 1, 10, 26, C.steel, 1);
    g.rect(2, 1, 8, 1, C.steelHi);
    g.rect(1, 2, 1, 24, C.steelHi);
    g.rect(2, 3, 8, 22, C.charLo);
    for (let y = 4; y < 24; y += 2) for (let x = 3 + (y % 4 ? 1 : 0); x < 9; x += 2) g.set(x, y, C.char);
    g.ellipse(5.5, 7, 1.6, 1.6, "#1b1c20");
    g.set(5, 7, C.brassHi);
    g.ellipse(5.5, 17, 3.2, 3.2, "#1b1c20");
    g.ellipse(5.5, 17, 1.3, 1.3, C.brassLo);
    g.rect(2, 25, 8, 1, C.steelLo);
    g.outline(OUTLINE);
  });
}

/** Sky Loft furniture; null keeps the classic sprite. */
export function skylineProp(p: PropPlacement, L: Layout, classic: () => HTMLCanvasElement): HTMLCanvasElement | null {
  switch (p.kind) {
    case "couch":
      return couch();
    case "coffee-table":
      return coffeeTable();
    case "pingpong":
      return pingPong();
    case "arcade":
      return arcade();
    case "beanbag-blue":
      return beanbag("blue", C.char, C.charHi, C.charLo);
    case "beanbag-pink":
      return beanbag("pink", C.lea, C.leaHi, C.leaLo);
    case "armchair":
      return armchair();
    case "bookshelf":
      return bookshelf();
    case "lamp":
      return lamp();
    case "printer":
      return printer();
    case "cooler":
      return cooler();
    case "meeting-table":
      return meetingTable();
    case "meeting-chair-front":
      return chairFront("black", "#2a2c31", "#4a4e57");
    case "meeting-chair-back":
      return chairBack("black", "#2a2c31", "#4a4e57");
    case "guest-chair":
      return chairBack("cognac", C.lea, C.leaHi);
    case "plan-rolls":
      return planRolls();
    case "glass-front": {
      // The room whose front edge this is (rooms can share x and width, so match the bottom too).
      const room = L.rooms.find((r) => r.walls && r.rect.x === p.x && r.rect.w === p.w && r.rect.y + r.rect.h - 10 === p.y);
      const gap = room?.doorSide === "bottom" && room.doorX !== undefined ? room.doorX - room.rect.x : -1;
      return glassFront(p.w ?? 100, gap, room?.walls === "wood");
    }
    case "library-shelf":
      return libraryShelf();
    case "library-table":
      return libraryTable();
    case "sofa-front":
      return sofaFront();
    case "sofa-back":
      return sofaBack();
    case "low-shelf":
      return lowShelf();
    case "planter":
      return planter(p.w ?? 48);
    case "kitchen-island":
      return kitchenIsland(p.w ?? 72);
    case "kitchen-counter":
      return kitchenCounter(p.w ?? 100);
    case "stool":
      return stool();
    case "fridge":
      return fridge();
    case "vending":
      return vending();
    case "fishtank-stand":
      return fishtankStand();
    case "whiteboard":
      return whiteboard(p.w ?? 80);
    case "tv":
      return tv(p.w ?? 120, L.tv.h, p.z > 0);
    case "piano":
      return piano();
    case "dartboard":
      return recolor(classic(), { "#6b7280": C.steel, "#4b4458": C.brass, "#2a2633": "#1b1d22" });
    case "cornhole":
      return recolor(classic(), { "#d9a066": C.wal, "#ecbd84": C.walHi, "#3e8ed0": C.navy });
    case "waiting-chair":
      return recolor(classic(), { "#3f8f8c": C.lea, "#6fc1bd": C.leaHi, "#173a38": C.leaLo, "#9e9295": C.steel });
    case "waiting-sofa":
      return waitingSofa(p.w ?? 42);
    case "waiting-sofa-back":
      return waitingSofaBack(p.w ?? 42);
    case "waiting-armchair":
      return armchairSide(false);
    case "waiting-armchair-left":
      return armchairSide(true);
    case "lounge-table":
      return loungeTable();
    case "bench":
      return bench();
    case "espresso":
      return espresso();
    case "server-rack":
      return serverRack();
    case "ai-rack":
      return recolor(classic(), { "#181a22": "#121318", "#4b2f7a": "#26305a", "#262a36": "#1e2129", "#111318": "#0b0c0f" });
    case "side-table":
      return sideTable();
    case "reception":
      return reception();
    case "boss-desk":
      return bossDesk(p.w ?? 60);
    case "boss-chair":
      return bossChair();
    case "dog-bed":
      return dogBed();
    case "bin":
      return bin();
  }
  return null;
}

function espresso(): HTMLCanvasElement {
  // A polished steel two-group machine with a walnut side panel.
  return sprite("espresso", 26, 30, (g) => {
    g.rect(5, 1, 4, 3, "#ffffff").rect(10, 1, 4, 3, "#ffffff").rect(16, 2, 4, 2, "#2a2c31");
    g.rect(2, 4, 22, 2, "#d9dde2").rect(2, 4, 22, 1, "#ffffff");
    g.rrect(2, 6, 22, 16, "#c3c8cf", 1);
    g.rect(3, 7, 20, 1, "#e6e9ed");
    g.rect(2, 6, 3, 16, C.wal).rect(2, 6, 1, 16, C.walHi);
    g.rect(21, 6, 3, 16, C.wal).rect(23, 6, 1, 16, C.walLo);
    g.rect(2, 20, 22, 2, "#8f959e");
    g.rect(8, 8, 10, 4, "#141a20").rect(9, 9, 4, 1, C.led).rect(14, 9, 3, 1, C.led).rect(9, 10, 6, 1, "#2b4a66");
    for (const x of [6, 15]) {
      g.rect(x, 13, 5, 3, "#8f959e");
      g.rect(x + 1, 16, 3, 1, BLACK);
      g.rect(x - 2, 14, 2, 1, BLACK);
    }
    g.rect(23, 12, 1, 7, "#d9dde2").set(22, 18, "#d9dde2");
    g.rect(3, 22, 20, 3, "#8f959e");
    for (let x = 4; x < 22; x += 2) g.set(x, 23, "#5f656e");
    g.rect(7, 19, 3, 3, "#ffffff").set(10, 20, "#ffffff");
    g.rect(11, 18, 4, 2, C.brass);
    g.rect(2, 25, 22, 2, BLACK);
    g.outline(OUTLINE);
  });
}
