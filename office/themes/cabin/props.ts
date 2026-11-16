// Mountain Cabin: furniture. Honey pine and old larch, red and navy wool,
// sheepskin, cast iron and copper; carved chairs with a heart in the back,
// a wood range in the kitchen, an icebox, a hut shop cupboard, frosty racks
// in the cold room. Every sprite keeps its classic size.
import type { Layout, PropPlacement } from "../../layout.ts";
import { Grid, recolor, shade } from "../../themekit.ts";
import { C, knitBand, planksV, sprite } from "./kit.ts";

// ------------------------------------------------------------------ the great room

function couch(): HTMLCanvasElement {
  // A deep red wool sofa with a cream knit throw and cushions.
  return sprite("couch", 84, 28, (g) => {
    g.rrect(4, 2, 76, 12, C.redLo, 2);
    g.rect(6, 3, 72, 1, C.red);
    g.rect(3, 12, 78, 8, C.red);
    g.rect(3, 12, 78, 1, C.redHi);
    for (const x of [29, 55]) g.vline(x, 12, 8, C.redLo);
    g.rect(3, 20, 78, 3, C.redLo);
    g.rrect(0, 7, 8, 16, C.red, 2).rect(1, 7, 6, 1, C.redHi).rect(0, 20, 8, 3, C.redLo);
    g.rrect(76, 7, 8, 16, C.red, 2).rect(77, 7, 6, 1, C.redHi).rect(76, 20, 8, 3, C.redLo);
    // The throw over one end, Nordic band and all.
    g.rect(52, 3, 18, 17, C.cream).rect(52, 3, 18, 1, C.creamHi);
    knitBand(g, 52, 8, 18, C.cream, C.navy);
    g.rect(52, 19, 18, 2, C.creamLo);
    for (let x = 53; x < 70; x += 2) g.set(x, 21, C.cream);
    g.rrect(10, 5, 10, 8, C.navy, 1).rect(11, 6, 7, 1, C.navyHi);
    g.rrect(22, 6, 8, 7, C.mustard, 1).rect(23, 7, 5, 1, "#ecc25a");
    g.rect(6, 23, 3, 4, C.beamDk).rect(75, 23, 3, 4, C.beamDk);
  });
}

function coffeeTable(): HTMLCanvasElement {
  // A thick slab of larch with the bark left on, mugs of cocoa and a game of cards.
  return sprite("coffee-table", 38, 14, (g) => {
    g.rrect(1, 2, 36, 7, C.pineLo, 2);
    g.rect(3, 2, 32, 1, C.pineHi);
    g.rect(1, 6, 36, 1, C.beam);
    g.rect(1, 7, 36, 2, C.beamLo);
    g.rect(5, 9, 4, 4, C.beamDk).rect(29, 9, 4, 4, C.beamDk);
    for (const x of [6, 11]) {
      g.rect(x, 1, 3, 3, C.red).set(x, 1, C.cream).set(x + 1, 1, "#7a4a2a").set(x + 3, 2, C.red);
    }
    g.rect(17, 3, 5, 3, C.creamHi).rect(20, 2, 4, 3, "#f4f2ee").set(21, 3, C.red);
    g.ellipse(30, 4, 3, 1.4, C.copper).set(29, 3, C.copperHi);
  });
}

function piano(): HTMLCanvasElement {
  // An upright in honey pine with brass candle sconces.
  return sprite("piano", 32, 32, (g) => {
    g.rect(1, 2, 30, 22, C.pineLo);
    g.rect(1, 2, 30, 2, C.pineHi);
    planksV(g, 3, 5, 26, 8, C.pine, C.pineHi, C.pineLo, 5);
    g.rect(3, 14, 26, 3, C.pineDk);
    g.rect(2, 17, 28, 5, "#f4f0e6");
    for (let x = 3; x < 30; x += 2) g.vline(x, 17, 3, x % 4 === 1 ? C.ironLo : "#d9d4c8");
    g.rect(2, 22, 28, 2, C.pineDk);
    g.rect(3, 24, 2, 7, C.pineDk).rect(27, 24, 2, 7, C.pineDk);
    g.rect(0, 6, 2, 2, C.brass).rect(30, 6, 2, 2, C.brass);
    g.set(0, 4, C.cream).set(0, 5, C.cream).set(31, 4, C.cream).set(31, 5, C.cream);
    g.rect(11, 6, 10, 6, C.creamHi).rect(12, 7, 8, 1, C.ironLo).rect(12, 9, 6, 1, C.ironLo);
  });
}

function fishtankStand(): HTMLCanvasElement {
  return sprite("fishtank-stand", 42, 22, (g) => {
    g.rect(1, 1, 40, 18, C.pineLo);
    g.rect(1, 1, 40, 2, C.pineHi);
    planksV(g, 2, 4, 38, 14, C.pine, C.pineHi, C.pineLo, 5);
    g.rect(14, 4, 1, 15, C.pineDk).rect(27, 4, 1, 15, C.pineDk);
    g.set(8, 10, C.iron).set(20, 10, C.iron).set(33, 10, C.iron);
    g.rect(2, 19, 3, 2, C.pineDk).rect(37, 19, 3, 2, C.pineDk);
  });
}

function tv(w: number, h: number, standing: boolean): HTMLCanvasElement {
  // A dark screen in a chunky carved pine frame, hung on the chimney stone.
  return sprite(`tv-${w}-${h}-${standing}`, w + 2, h + (standing ? 22 : 4), (g) => {
    g.rect(0, 0, w + 2, h + 2, C.pineDk);
    g.rect(1, 1, w, h, C.pine);
    g.rect(1, 1, w, 1, C.pineHi).rect(1, 1, 1, h, C.pineHi);
    g.rect(3, 3, w - 4, h - 4, C.beamDk);
    g.rect(4, 4, w - 6, h - 6, "#0d0f14");
    for (let x = 5; x < w - 2; x += 6) g.set(x, 2, C.pineLo).set(x + 2, h, C.pineLo);
    g.set(w - 3, h - 1, "#ffb04a");
    if (standing) {
      g.rect(6, h + 3, w - 10, 15, C.pineLo).rect(6, h + 3, w - 10, 1, C.pineHi);
      planksV(g, 8, h + 5, w - 14, 11, C.pine, C.pineHi, C.pineLo, 6);
      g.rect(8, h + 18, 2, 3, C.pineDk).rect(w - 8, h + 18, 2, 3, C.pineDk);
    }
  });
}

function armchair(): HTMLCanvasElement {
  // A wingback in navy wool with a sheepskin over the back.
  return sprite("armchair", 28, 26, (g) => {
    g.rrect(3, 1, 22, 15, C.navyLo, 3);
    g.rrect(5, 2, 18, 13, C.navy, 2);
    g.rect(7, 3, 14, 1, C.navyHi);
    g.rrect(8, 1, 12, 6, C.fleece, 2).rect(9, 6, 10, 1, C.fleeceLo);
    g.rrect(1, 9, 6, 13, C.navy, 2).rect(2, 9, 4, 1, C.navyHi);
    g.rrect(21, 9, 6, 13, C.navy, 2).rect(22, 9, 4, 1, C.navyHi);
    g.rect(6, 14, 16, 6, C.navyHi).rect(6, 14, 16, 1, shade(C.navyHi, 0.15));
    g.rect(6, 20, 16, 2, C.navyLo);
    g.rect(5, 22, 2, 3, C.beamDk).rect(21, 22, 2, 3, C.beamDk);
  });
}

function beanbag(key: string, base: string, hi: string, lo: string): HTMLCanvasElement {
  // A big knitted floor pouf.
  return sprite(`pouf-${key}`, 26, 16, (g) => {
    g.ellipse(13, 9, 11, 5.5, base);
    g.ellipse(13, 6, 9, 3.5, shade(base, 0.08));
    for (let x = 4; x < 23; x += 3) for (let y = 5; y < 14; y++) if (g.get(x, y)) g.set(x, y, lo);
    g.rect(8, 4, 5, 1, hi);
    g.rect(5, 12, 16, 1, lo);
  });
}

// ------------------------------------------------------------------ the mudroom

function bench(w: number): HTMLCanvasElement {
  // A pine bench with sheepskin pads; boots in the cubbies under it.
  return sprite(`mudbench-${w}`, w + 2, 22, (g) => {
    const W = w;
    g.rect(1, 9, W, 4, C.pine).rect(1, 9, W, 1, C.pineHi).rect(1, 12, W, 1, C.pineLo);
    g.rect(1, 13, W, 8, C.pineDk);
    for (let x = 1; x < W; x += 10) g.rect(x, 13, 1, 8, C.pineLo);
    const boots = [C.red, "#6b4a33", C.felt, "#f2c230", "#3a3d46", C.navy];
    for (let x = 3, i = 0; x + 6 < W; x += 10, i++) {
      const c = boots[(i * 5) % boots.length]!;
      g.rect(x, 15, 3, 5, c).rect(x + 4, 15, 3, 5, c);
      g.set(x, 15, shade(c, 0.25)).set(x + 4, 15, shade(c, 0.25));
    }
    g.rect(1, 20, W, 1, C.pineDeep);
    for (let x = 3; x + 14 <= W; x += 20) {
      g.rrect(x, 6, 14, 5, C.fleece, 2);
      g.rect(x + 1, 10, 12, 1, C.fleeceLo);
      for (let i = x + 2; i < x + 13; i += 3) g.set(i, 7, C.fleeceLo);
    }
  });
}

function benchBack(w: number): HTMLCanvasElement {
  return sprite(`mudbench-back-${w}`, w + 2, 16, (g) => {
    g.rect(1, 2, w, 4, C.pine).rect(1, 2, w, 1, C.pineHi);
    g.rect(1, 6, w, 7, C.pineDk);
    for (let x = 1; x < w; x += 10) g.rect(x, 6, 1, 7, C.pineLo);
    g.rect(1, 13, w, 1, C.pineDeep);
  });
}

function hutDesk(): HTMLCanvasElement {
  // The hut desk by the door: the guest book, a brass bell, a jar of trail maps.
  return sprite("reception", 36, 22, (g) => {
    g.rect(1, 6, 34, 4, C.pine).rect(1, 6, 34, 1, C.pineHi);
    planksV(g, 2, 10, 32, 10, C.pineLo, C.pine, C.pineDk, 5);
    g.rect(1, 20, 34, 1, C.pineDeep);
    // A heart cut in the front board.
    g.set(16, 13, C.beamDk).set(18, 13, C.beamDk).rect(16, 14, 3, 1, C.beamDk).set(17, 15, C.beamDk);
    g.rect(4, 4, 10, 3, C.creamHi).rect(4, 4, 5, 3, C.red).rect(9, 4, 1, 3, C.redLo);
    g.ellipse(26, 4, 3, 2.5, C.brass).set(25, 3, C.brassHi).rect(26, 0, 1, 2, C.iron);
    g.rect(30, 1, 4, 6, "#cfe6f5").rect(31, 0, 1, 2, C.cream).rect(32, 0, 1, 1, C.red);
  });
}

function sideArmchair(left: boolean): HTMLCanvasElement {
  const g0 = new Grid(18, 20);
  g0.rrect(2, 2, 14, 11, C.redLo, 2);
  g0.rrect(3, 3, 12, 9, C.red, 2).rect(4, 4, 10, 1, C.redHi);
  g0.rect(1, 10, 16, 6, C.red).rect(1, 10, 16, 1, C.redHi);
  g0.rect(2, 16, 2, 3, C.beamDk).rect(14, 16, 2, 3, C.beamDk);
  return sprite(`sidechair-${left}`, 18, 20, (g) => g.stamp(left ? g0.flipped() : g0, 0, 0));
}

function sideTable(): HTMLCanvasElement {
  // A log round on its end, a candle on top.
  return sprite("side-table", 28, 12, (g) => {
    g.ellipse(13.5, 4, 12, 3.5, C.pine);
    g.ellipse(13.5, 4, 9, 2.4, "#e0b880");
    g.ellipse(13.5, 4, 5, 1.2, C.pine);
    g.rect(3, 4, 22, 6, C.beam).rect(3, 4, 22, 1, C.beamHi);
    for (let x = 5; x < 25; x += 4) g.vline(x, 5, 5, C.beamLo);
    g.rect(12, 0, 2, 3, C.cream).set(12, 0, C.fire2);
  });
}

// ------------------------------------------------------------------ the map room and your study

function mapBoard(w: number): HTMLCanvasElement {
  // A big trail map on an easel: contour lines, a blue lake, a red route (marker strokes go on top).
  return sprite(`mapboard-${w}`, w + 2, 46, (g) => {
    g.rect(1, 1, w, 34, C.beam);
    g.rect(1, 1, w, 1, C.beamHi);
    g.rect(3, 3, w - 4, 30, "#efe6cf");
    for (let i = 0; i < 6; i++) {
      const cx = 12 + ((i * 23) % Math.max(1, w - 24));
      const cy = 10 + ((i * 11) % 18);
      for (let a = 0; a < 26; a++) {
        const r = 3 + (i % 3) * 2;
        const x = Math.round(cx + Math.cos(a / 4.2) * r * 1.4);
        const y = Math.round(cy + Math.sin(a / 4.2) * r * 0.8);
        if (x > 3 && x < w - 1 && y > 3 && y < 32) g.set(x, y, "#dccca6");
      }
    }
    g.ellipse(w - 14, 26, 5, 2.5, "#b9d8ea");
    g.set(w - 16, 25, "#d8ecf6");
    g.rect(w - 30, 5, 2, 2, C.redLo).set(w - 29, 4, C.redLo);
    g.rect(1, 35, w, 2, C.beamDk).rect(1, 35, w, 1, C.beam);
    g.rect(8, 34, 6, 1, C.beamDk).rect(16, 34, 6, 1, C.red).rect(24, 34, 6, 1, "#2f5a7a");
    g.line(5, 37, 3, 45, C.beam).line(w - 4, 37, w - 2, 45, C.beam);
    g.line(6, 37, 4, 45, C.beamHi);
  });
}

function mapTable(): HTMLCanvasElement {
  // A heavy timber table with a map spread out, a compass and a lantern.
  return sprite("meeting-table", 68, 30, (g) => {
    g.rect(1, 2, 66, 16, C.beam);
    g.rect(1, 2, 66, 1, C.beamHi);
    for (let y = 5; y < 17; y += 4) g.hline(2, y, 64, C.beamLo);
    g.rect(1, 18, 66, 4, C.beamLo).rect(1, 18, 66, 1, C.beamDk);
    g.rect(4, 22, 4, 7, C.beamDk).rect(60, 22, 4, 7, C.beamDk);
    g.rect(14, 4, 34, 12, "#efe6cf").rect(14, 4, 34, 1, "#fbf6e8");
    for (let x = 16; x < 46; x += 5) g.vline(x, 5, 10, "#e2d4b2");
    g.line(18, 13, 26, 7, C.red).line(26, 7, 34, 11, C.red).line(34, 11, 42, 6, C.red);
    g.ellipse(40, 12, 3, 1.5, "#b9d8ea");
    g.ellipse(55, 9, 3, 3, C.brass).set(55, 9, C.red).set(54, 8, C.brassHi);
    g.rect(6, 5, 5, 7, C.iron).rect(7, 6, 3, 4, "#ffd27a").rect(6, 4, 5, 1, C.ironHi);
  });
}

function carvedChair(key: string, back: boolean, cushion: string): HTMLCanvasElement {
  // An alpine chair: a carved board back with a heart cut out, three splayed legs, a wool cushion.
  return sprite(`stabelle-${key}-${back}`, 16, 32, (g) => {
    if (back) {
      g.rect(2, 22, 2, 9, C.pineDk).rect(12, 22, 2, 9, C.pineDk).rect(7, 24, 2, 7, C.pineLo);
      g.rect(1, 18, 14, 5, C.pine).rect(1, 18, 14, 1, C.pineHi);
      g.rect(2, 19, 12, 2, cushion);
      g.rrect(3, 4, 10, 15, C.pine, 2).rect(4, 4, 8, 1, C.pineHi);
      g.vline(3, 6, 12, C.pineLo).vline(12, 6, 12, C.pineLo);
      g.set(6, 9, C.beamDk).set(9, 9, C.beamDk).rect(6, 10, 4, 1, C.beamDk).rect(7, 11, 2, 1, C.beamDk);
    } else {
      g.rrect(3, 2, 10, 14, C.pine, 2).rect(4, 2, 8, 1, C.pineHi);
      g.set(6, 6, C.beamDk).set(9, 6, C.beamDk).rect(6, 7, 4, 1, C.beamDk).rect(7, 8, 2, 1, C.beamDk);
      g.rect(1, 16, 14, 6, C.pine).rect(1, 16, 14, 1, C.pineHi);
      g.rect(2, 17, 12, 3, cushion).rect(2, 17, 12, 1, shade(cushion, 0.15));
      g.rect(2, 22, 2, 9, C.pineDk).rect(12, 22, 2, 9, C.pineDk).rect(7, 22, 2, 8, C.pineLo);
    }
  });
}

function bossDesk(w: number): HTMLCanvasElement {
  // Your map table: old larch, a map, a brass compass, a mug and an oil lamp.
  return sprite(`boss-desk-${w}`, w + 2, 30, (g) => {
    g.rect(1, 2, w, 14, C.beam);
    g.rect(1, 2, w, 1, C.beamHi);
    for (let y = 5; y < 15; y += 4) g.hline(2, y, w - 2, C.beamLo);
    g.rect(1, 16, w, 11, C.beamLo);
    g.rect(1, 16, w, 1, C.beamDk);
    g.rect(4, 18, 14, 7, C.beam).rect(w - 17, 18, 14, 7, C.beam);
    g.rect(10, 21, 3, 1, C.brass).rect(w - 11, 21, 3, 1, C.brass);
    g.rect(1, 27, w, 2, C.beamDk);
    g.rect(22, 4, 18, 9, "#efe6cf").line(24, 10, 30, 6, C.red).line(30, 6, 37, 9, C.red);
    g.ellipse(w - 8, 6, 2.5, 2.5, C.brass).set(w - 8, 6, C.red);
  });
}

function bossChair(): HTMLCanvasElement {
  // A big wooden armchair under a sheepskin.
  return sprite("boss-chair", 22, 26, (g) => {
    g.rrect(3, 1, 16, 15, C.beam, 3);
    g.rrect(5, 2, 12, 12, C.fleece, 3);
    for (let x = 6; x < 16; x += 3) for (let y = 4; y < 13; y += 3) g.set(x, y, C.fleeceLo);
    g.rect(1, 12, 20, 6, C.beam).rect(1, 12, 20, 1, C.beamHi);
    g.rect(4, 13, 14, 3, C.red);
    g.rect(3, 18, 2, 7, C.beamDk).rect(17, 18, 2, 7, C.beamDk);
  });
}

function libraryShelf(): HTMLCanvasElement {
  return sprite("library-shelf", 32, 32, (g) => {
    g.rect(1, 1, 30, 30, C.pineLo);
    g.rect(1, 1, 30, 1, C.pineHi);
    const books = [C.red, C.navy, C.mustard, C.moss, C.cream, C.redLo, C.navyHi, "#7a4a2a"];
    for (const [r, y] of [12, 21, 30].entries()) {
      g.rect(3, y - 8, 26, 8, C.pineDeep);
      g.rect(1, y, 30, 1, C.pine);
      let x = 4;
      let i = r * 3;
      while (x < 27) {
        const bw = 1 + (i % 3 === 0 ? 1 : 0);
        const bh = 5 + ((i * 7) % 3);
        if (r === 0 && x > 18) break;
        g.rect(x, y - bh, bw, bh, books[(i * 5) % books.length]!);
        x += bw + (i % 5 === 4 ? 2 : 0);
        i++;
      }
    }
    // A wooden ibex and a candle on the top shelf.
    g.rect(21, 8, 4, 2, C.pine).set(21, 7, C.pine).set(20, 6, C.pineDk).set(25, 10, C.pineDk).set(22, 10, C.pineDk);
    g.rect(27, 7, 2, 4, C.cream).set(27, 6, C.fire2);
  });
}

function libraryTable(): HTMLCanvasElement {
  return sprite("library-table", 32, 32, (g) => {
    g.rect(1, 8, 30, 14, C.pine).rect(1, 8, 30, 1, C.pineHi);
    for (let y = 11; y < 21; y += 4) g.hline(2, y, 28, C.pineLo);
    g.rect(1, 22, 30, 3, C.pineDk);
    g.rect(3, 25, 3, 6, C.pineDk).rect(26, 25, 3, 6, C.pineDk);
    g.rect(5, 10, 8, 6, C.creamHi).rect(9, 10, 1, 6, C.creamLo).rect(6, 11, 2, 1, C.ironLo);
    g.rect(20, 3, 6, 8, C.iron).rect(21, 4, 4, 5, "#ffd27a").rect(20, 2, 6, 1, C.ironHi);
    g.rect(15, 14, 4, 3, C.red).set(19, 15, C.red);
  });
}

function lamp(): HTMLCanvasElement {
  // A wrought-iron floor lamp with a parchment shade.
  return sprite("lamp", 16, 52, (g) => {
    g.rrect(2, 1, 12, 10, "#f0dcae", 2);
    g.rect(3, 2, 10, 1, "#fbeccc");
    g.rect(2, 9, 12, 2, "#d8c08e");
    for (let x = 4; x < 13; x += 3) g.vline(x, 3, 6, "#e4cc9a");
    g.rect(7, 11, 2, 36, C.iron).vline(7, 11, 36, C.ironHi);
    g.set(6, 28, C.iron).set(9, 30, C.iron);
    g.rect(3, 47, 10, 2, C.iron).rect(2, 49, 12, 2, C.ironLo);
  });
}

function dogBed(): HTMLCanvasElement {
  // A big woven basket with a navy wool blanket.
  return sprite("dog-bed", 26, 14, (g) => {
    g.ellipse(13, 7, 12, 6, "#b88a52");
    g.ellipse(13, 6.5, 9.5, 4, C.navy);
    g.ellipse(13, 6, 7, 2.5, C.navyHi);
    for (let x = 2; x < 25; x += 2) for (const y of [10, 11, 12]) if (g.get(x, y) === "#b88a52") g.set(x, y, "#9a6e3e");
    g.rect(8, 3, 6, 1, C.cream);
  });
}

// ------------------------------------------------------------------ the kitchen

function counter(width: number): HTMLCanvasElement {
  // Pine cupboards with a heart in each door, a black wood range with the kettle on it,
  // a copper sink, jars on the counter and the range's warming oven at the right end.
  return sprite(`kcounter-${width}`, width + 2, 36, (g) => {
    const w = width;
    const top = 10;
    g.rect(1, top, w, 5, C.pine).rect(1, top, w, 1, C.pineHi).rect(1, top + 4, w, 1, C.pineLo);
    g.rect(1, top + 5, w, 19, C.pineLo);
    for (let x = 3; x < w - 3; x += 20) {
      const dw = Math.min(18, w - 3 - x);
      g.rect(x, top + 7, dw, 15, C.pine).rect(x, top + 7, dw, 1, C.pineHi).rect(x, top + 21, dw, 1, C.pineDk);
      const hx = x + Math.floor(dw / 2);
      if (dw > 8) g.set(hx - 1, top + 11, C.beamDk).set(hx + 1, top + 11, C.beamDk).rect(hx - 1, top + 12, 3, 1, C.beamDk).set(hx, top + 13, C.beamDk);
    }
    g.rect(1, top + 24, w, 2, C.pineDeep);
    // The wood range: black iron with brass rails, the firebox glowing.
    const sx = 27;
    g.rect(sx, top - 1, 22, 26, C.iron).rect(sx, top - 1, 22, 2, C.ironHi);
    g.rect(sx + 1, top + 1, 20, 1, C.brass);
    g.rect(sx + 3, top + 6, 7, 6, C.ironLo).rect(sx + 4, top + 9, 5, 2, "#f07a2a").set(sx + 5, top + 9, "#ffcf5a");
    g.rect(sx + 12, top + 6, 8, 14, C.ironLo).rect(sx + 13, top + 7, 6, 1, C.ironHi);
    g.rect(sx + 14, top + 12, 3, 1, C.brass);
    // The kettle on the hob (steam comes out at x+34).
    g.rrect(31, 2, 8, 7, "#3f6a8a", 2).rect(32, 3, 3, 1, "#6a96b8");
    g.rect(34, 0, 2, 2, C.ironLo).set(39, 4, "#3f6a8a").set(40, 3, "#3f6a8a");
    if (w >= 80) {
      // The copper sink and a pot of herbs.
      g.rect(53, top + 1, 15, 4, C.copper).rect(54, top + 2, 13, 2, C.copperLo);
      g.rect(59, top - 5, 2, 6, C.brass).rect(59, top - 5, 4, 1, C.brass);
      g.rect(70, top - 4, 5, 4, "#c97a4f").set(71, top - 6, C.mossHi).set(72, top - 7, C.moss).set(73, top - 6, C.mossHi).set(74, top - 5, C.moss);
      g.rect(5, top - 6, 4, 6, "#cfe6f5").rect(5, top - 6, 4, 1, C.red).rect(11, top - 5, 4, 5, "#e9d6a8").rect(11, top - 5, 4, 1, C.cream);
    }
    if (w >= 100) {
      // The warming oven at the right end (the office's microwave).
      g.rect(w - 26, 0, 22, 14, C.iron).rect(w - 26, 0, 22, 1, C.ironHi);
      g.rect(w - 24, 2, 13, 10, C.ironLo).rect(w - 23, 3, 11, 1, C.ironHi);
      g.rect(w - 9, 3, 3, 8, C.ironLo).set(w - 8, 4, C.brass).set(w - 8, 7, C.brass);
      g.rect(w - 22, 7, 7, 1, C.brass);
    }
  });
}

function espresso(): HTMLCanvasElement {
  // A copper lever coffee machine with an eagle-free dome.
  return sprite("espresso", 26, 30, (g) => {
    g.ellipse(13, 4, 7, 3, C.copper).set(10, 2, C.copperHi).set(11, 2, C.copperHi);
    g.rect(12, 0, 2, 2, C.brass);
    g.rect(4, 5, 18, 17, C.copper);
    g.rect(4, 5, 2, 17, C.copperHi).rect(20, 5, 2, 17, C.copperLo);
    g.rect(7, 8, 12, 4, C.cream).rect(8, 9, 3, 1, C.redLo).rect(13, 9, 4, 1, C.ironLo);
    g.rect(9, 13, 8, 3, C.brass);
    g.rect(10, 16, 6, 2, C.iron);
    g.rect(20, 1, 2, 10, C.beam).rect(19, 0, 4, 2, C.beamDk);
    g.rect(3, 22, 20, 3, C.brass).rect(3, 22, 20, 1, C.brassHi);
    for (let x = 5; x < 22; x += 2) g.set(x, 23, C.copperLo);
    g.rect(7, 19, 3, 3, C.creamHi);
    g.rect(2, 25, 22, 2, C.ironLo);
  });
}

function icebox(): HTMLCanvasElement {
  // An old oak icebox with iron hinges and latches.
  return sprite("fridge", 20, 34, (g) => {
    g.rect(1, 1, 18, 31, C.pineLo);
    g.rect(1, 1, 18, 1, C.pineHi);
    g.rect(2, 3, 16, 12, C.pine).rect(2, 17, 16, 13, C.pine);
    g.rect(2, 3, 16, 1, C.pineHi).rect(2, 17, 16, 1, C.pineHi);
    for (const y of [4, 13, 18, 28]) g.rect(2, y, 3, 1, C.iron);
    g.rect(14, 8, 3, 2, C.brass).rect(14, 22, 3, 2, C.brass);
    g.rect(1, 32, 2, 2, C.pineDk).rect(17, 32, 2, 2, C.pineDk);
    g.rect(6, 6, 5, 3, C.creamHi).set(7, 7, C.red);
  });
}

function hutShop(): HTMLCanvasElement {
  // The hut shop cupboard: chocolate, crackers, dried apricots behind glass, an honesty box.
  return sprite("vending", 24, 44, (g) => {
    g.rect(1, 1, 22, 42, C.pineLo);
    g.rect(1, 1, 22, 3, C.beam).rect(1, 1, 22, 1, C.beamHi);
    g.rect(3, 5, 14, 28, "#d8e8ef");
    const goods = [C.red, C.navy, "#f2d04a", "#7a4a2a", C.cream, "#e8873a", C.moss, "#f4f2ee"];
    for (let r = 0; r < 4; r++) {
      g.rect(3, 11 + r * 7, 14, 1, C.pineDk);
      for (let c = 0; c < 4; c++) {
        const col = goods[(r * 3 + c) % goods.length]!;
        const tall = (r + c) % 2 === 0;
        g.rect(4 + c * 3, (tall ? 6 : 8) + r * 7, 2, tall ? 5 : 3, col);
        g.set(4 + c * 3, (tall ? 6 : 8) + r * 7, shade(col, 0.3));
      }
    }
    g.set(4, 6, "#ffffff").set(5, 7, "#ffffff");
    g.rect(18, 6, 4, 10, C.pine).rect(18, 6, 4, 1, C.pineHi);
    g.rect(19, 8, 2, 1, C.ironLo);
    g.rect(17, 18, 5, 3, C.iron).rect(18, 19, 3, 1, C.ironLo);
    g.rect(3, 35, 18, 5, C.pine).rect(3, 34, 18, 1, C.pineDk);
    g.rect(9, 36, 6, 2, C.iron);
    g.rect(1, 42, 22, 1, C.pineDeep);
  });
}

function island(width: number): HTMLCanvasElement {
  // A butcher-block table on turned legs, bread and a cheese board on it.
  return sprite(`island-${width}`, width + 2, 26, (g) => {
    const w = width;
    g.rect(1, 2, w, 10, C.pine);
    g.rect(1, 2, w, 1, C.pineHi);
    for (let x = 4; x < w; x += 6) g.vline(x, 3, 9, C.pineLo);
    g.rect(1, 12, w, 4, C.pineLo).rect(1, 12, w, 1, C.pineDk);
    g.rect(3, 16, 3, 9, C.pineDk).rect(w - 4, 16, 3, 9, C.pineDk);
    g.rect(3, 19, w - 4, 1, C.pineDk);
    g.rect(5, 4, 8, 4, "#d8a868").rect(6, 4, 6, 1, "#ecc488");
    g.rect(w - 18, 5, 10, 4, C.beamHi).rect(w - 16, 4, 6, 3, "#f2d870").set(w - 14, 5, "#d8b850");
  });
}

function stool(): HTMLCanvasElement {
  // A three-legged milking stool.
  return sprite("stool", 12, 10, (g) => {
    g.ellipse(5.5, 2.5, 4.5, 2, C.pine);
    g.rect(3, 1, 4, 1, C.pineHi);
    g.line(2, 4, 1, 9, C.pineDk).line(9, 4, 10, 9, C.pineDk).line(5, 4, 5, 9, C.pineLo);
  });
}

// ------------------------------------------------------------------ the cold room, the ski room, the rest

function serverRack(): HTMLCanvasElement {
  // A rack in the cold room: dark steel, frost on top, icicles.
  return sprite("server-rack", 16, 33, (g) => {
    g.rect(1, 1, 14, 31, "#2c333d");
    g.rect(1, 1, 14, 1, "#4a5562");
    for (let y = 4; y < 30; y += 4) g.rect(3, y, 6, 2, "#1f252d");
    g.rect(1, 0, 14, 2, C.snow);
    g.set(3, 2, C.ice).set(7, 2, C.ice).set(7, 3, C.ice).set(12, 2, C.ice);
    g.rect(1, 31, 14, 1, "#1a1e24");
  });
}

function aiRack(classic: () => HTMLCanvasElement): HTMLCanvasElement {
  return recolor(classic(), { "#181a22": "#1f2a36", "#4b2f7a": "#2f5a8a", "#262a36": "#28323e", "#111318": "#141a22" });
}

function printer(): HTMLCanvasElement {
  // A printer on a pine cabinet.
  return sprite("printer", 30, 26, (g) => {
    g.rect(1, 3, 28, 9, "#e6e2d8").rect(1, 3, 28, 1, "#f6f4ee");
    g.rect(4, 1, 22, 3, "#d6d2c6");
    g.rect(6, 8, 18, 2, "#4a4f58");
    g.set(25, 5, "#7be08f");
    g.rect(1, 12, 28, 12, C.pineLo).rect(1, 12, 28, 1, C.pineHi);
    g.rect(3, 14, 11, 8, C.pine).rect(16, 14, 11, 8, C.pine);
    g.set(13, 18, C.iron).set(16, 18, C.iron);
    g.rect(1, 24, 28, 1, C.pineDeep);
  });
}

function waterBarrel(): HTMLCanvasElement {
  // Spring water in an oak barrel on a stand, a brass tap, enamel mugs on hooks.
  return sprite("cooler", 17, 36, (g) => {
    g.rrect(2, 4, 13, 16, C.pine, 3);
    for (let x = 3; x < 15; x += 3) g.vline(x, 5, 14, C.pineLo);
    g.rect(2, 7, 13, 1, C.iron).rect(2, 16, 13, 1, C.iron);
    g.ellipse(8.5, 4.5, 6, 1.6, C.pineHi);
    g.rect(7, 19, 3, 2, C.brass).set(8, 21, C.brassHi);
    g.rect(2, 22, 13, 2, C.pineDk);
    g.rect(3, 24, 2, 11, C.pineDk).rect(12, 24, 2, 11, C.pineDk).rect(3, 30, 11, 1, C.pineDk);
    g.rect(6, 26, 5, 3, "#f4f2ee").rect(6, 26, 5, 1, "#3f6a8a");
  });
}

function basket(): HTMLCanvasElement {
  return sprite("bin", 16, 16, (g) => {
    g.rect(2, 4, 12, 11, "#b88a52");
    for (let y = 5; y < 15; y += 2) g.hline(2, y, 12, "#9a6e3e");
    for (let x = 4; x < 14; x += 3) g.vline(x, 4, 11, "#c89a62");
    g.rect(1, 3, 14, 2, "#c89a62");
    g.rect(5, 1, 3, 3, C.creamHi).set(9, 2, C.creamHi);
  });
}

function planter(width: number): HTMLCanvasElement {
  // A long pine trough of alpine flowers between the desk rows: blue gentians, edelweiss.
  return sprite(`planter-${width}`, width, 20, (g) => {
    const w = width;
    g.rect(1, 10, w - 2, 8, C.pineLo).rect(1, 10, w - 2, 1, C.pineHi).rect(1, 17, w - 2, 1, C.pineDk);
    for (let x = 6; x < w - 2; x += 12) g.vline(x, 11, 6, C.pineDk);
    g.rect(2, 8, w - 4, 2, "#5a4232");
    for (let x = 3; x < w - 4; x += 4) {
      const k = (x * 7) % 5;
      g.vline(x, 4 + (k % 3), 5 - (k % 3), C.moss);
      g.set(x + 1, 6 + (k % 2), C.mossHi);
      if (k < 2) g.rect(x - 1, 3 + (k % 3), 2, 2, "#3a5ad8").set(x - 1, 3 + (k % 3), "#6a8af0");
      else if (k === 3) g.set(x, 3, C.creamHi).set(x - 1, 4, C.creamHi).set(x + 1, 4, C.creamHi).set(x, 5, C.creamHi).set(x, 4, "#e8d27a");
    }
  });
}

function dartboard(): HTMLCanvasElement {
  // A dartboard on a timber post with a little chalk score slate.
  return sprite("dartboard", 20, 34, (g) => {
    g.rect(9, 14, 3, 19, C.beam).vline(9, 14, 19, C.beamHi);
    g.rect(5, 31, 11, 2, C.beamDk);
    g.ellipse(10, 8, 8, 7.5, "#2a2c31");
    g.ellipse(10, 8, 6.5, 6, "#e9dcc0");
    for (let a = 0; a < 20; a++) {
      if (a % 2) continue;
      const an = (a / 20) * Math.PI * 2;
      for (let r = 2; r < 6.5; r += 0.7) g.set(Math.round(10 + Math.cos(an) * r), Math.round(8 + Math.sin(an) * r * 0.92), "#2a2c31");
    }
    g.ellipse(10, 8, 6.3, 5.8, null as unknown as string);
    g.ellipse(10, 8, 1.5, 1.4, C.red);
    g.set(10, 8, "#3a8a4a");
    g.rect(13, 19, 6, 5, "#3a4038").rect(14, 20, 3, 1, "#d8d8d0");
  });
}

function pingPong(): HTMLCanvasElement {
  return sprite("pingpong", 76, 26, (g) => {
    const w = 74;
    g.rect(1, 1, w, 13, "#2f5a48");
    g.rect(1, 1, w, 1, "#f4f2ee").rect(1, 13, w, 1, "#f4f2ee").vline(1, 1, 13, "#f4f2ee").vline(w, 1, 13, "#f4f2ee");
    g.hline(2, 7, w - 2, "#6a9a84");
    g.rect(1, 14, w, 3, C.pineLo).rect(1, 14, w, 1, C.pine);
    const nx = 1 + Math.floor(w / 2);
    g.rect(nx, 0, 1, 15, "#ecebe7");
    for (let y = 2; y < 14; y += 2) g.set(nx, y, "#b8bcc2");
    g.rect(4, 17, 3, 7, C.pineDk).rect(w - 5, 17, 3, 7, C.pineDk);
  });
}

function arcade(): HTMLCanvasElement {
  // A pine arcade cabinet (a downhill game) with a red marquee.
  return sprite("arcade", 26, 48, (g) => {
    g.rect(2, 1, 22, 46, C.pineLo);
    g.vline(2, 1, 46, C.pineHi).vline(23, 1, 46, C.pineDk);
    g.rect(1, 1, 24, 8, C.red);
    g.rect(3, 3, 20, 4, C.redHi);
    g.rect(6, 4, 3, 2, C.snow).rect(8, 3, 2, 3, C.snow).rect(13, 4, 7, 1, C.creamHi).rect(13, 5, 5, 1, C.creamHi);
    g.rect(2, 9, 22, 16, "#101318");
    g.rect(1, 25, 24, 6, C.pine).rect(1, 25, 24, 1, C.pineHi);
    g.set(6, 27, C.red).set(9, 28, C.mustard).set(12, 27, C.navy);
    g.rect(17, 26, 1, 3, C.iron).set(17, 25, C.red);
    g.rect(2, 32, 22, 15, C.pineLo);
    planksV(g, 3, 33, 20, 12, C.pineLo, C.pine, C.pineDk, 5);
    g.rect(9, 37, 8, 4, C.iron).set(12, 38, C.brass).set(13, 38, C.brass);
  });
}

function lowShelf(): HTMLCanvasElement {
  return sprite("low-shelf", 38, 36, (g) => {
    g.rect(1, 6, 36, 28, C.pineLo).rect(1, 6, 36, 1, C.pineHi);
    g.rect(3, 8, 32, 11, C.pineDeep).rect(3, 21, 32, 11, C.pineDeep);
    g.rect(4, 13, 3, 6, C.red).rect(8, 12, 2, 7, C.navy).rect(11, 14, 3, 5, C.mustard);
    g.rect(4, 26, 10, 6, C.cream).rect(20, 24, 8, 8, "#b88a52");
  });
}

function gardenBench(): HTMLCanvasElement {
  return sprite("bench", 36, 16, (g) => {
    g.rect(1, 1, 34, 3, C.pine).rect(1, 1, 34, 1, C.pineHi);
    g.rect(1, 6, 34, 4, C.pine).rect(1, 6, 34, 1, C.pineHi);
    g.rect(3, 10, 2, 5, C.pineDk).rect(31, 10, 2, 5, C.pineDk);
    g.rect(3, 4, 2, 2, C.pineDk).rect(31, 4, 2, 2, C.pineDk);
  });
}

function glassFront(w: number, gapX: number, kind: "glass" | "wood" | "cold"): HTMLCanvasElement {
  // The front wall of a room: a low timber sill with glass over it (pine boards for your study, frosted for the cold room).
  return sprite(`front-${w}-${gapX}-${kind}`, w, 11, (g) => {
    const frame = kind === "wood" ? C.pineDk : kind === "cold" ? "#8aa6bc" : C.beam;
    const light = kind === "wood" ? C.pineHi : kind === "cold" ? "#e6f3fa" : C.beamHi;
    const pane = kind === "cold" ? "#e8f4faD8" : "#dcebf2b0";
    const open = (x: number) => gapX >= 0 && x >= gapX - 9 && x < gapX + 9;
    for (let x = 0; x < w; x++) {
      if (open(x)) continue;
      g.set(x, 0, "#2a1e2e").set(x, 1, frame);
      if (kind === "wood") {
        for (let y = 2; y < 9; y++) g.set(x, y, x % 6 === 0 ? C.pineLo : x % 6 === 1 ? C.pineHi : C.pine);
      } else {
        for (let y = 2; y < 6; y++) g.set(x, y, pane);
        g.set(x, 6, frame);
        for (let y = 7; y < 9; y++) g.set(x, y, kind === "cold" ? "#c9dbe6" : C.pine);
      }
      g.set(x, 9, frame).set(x, 10, "#2a1e2e");
      g.set(x, 1, light);
    }
    if (kind !== "wood") {
      for (let x = 12; x < w; x += 24) if (!open(x)) g.vline(x, 1, 9, frame);
      for (let x = 4; x < w; x += 24) if (!open(x) && !open(x + 2)) g.set(x, 3, "#ffffffcc").set(x + 1, 2, "#ffffffaa");
      if (kind === "cold") for (let x = 2; x < w; x += 7) if (!open(x)) g.set(x, 2, C.snow).set(x + 1, 3, "#ffffffcc");
    }
    if (gapX >= 0) for (const x of [gapX - 10, gapX + 9]) if (x >= 0 && x < w) g.vline(x, 0, 11, frame);
  });
}

export function speaker(): HTMLCanvasElement {
  // A pine speaker box hung on the stone.
  return sprite("speaker", 12, 28, (g) => {
    g.rrect(1, 1, 10, 26, C.pineLo, 1);
    g.rect(2, 1, 8, 1, C.pineHi).vline(1, 2, 24, C.pineHi);
    g.rect(2, 3, 8, 22, "#3a2a22");
    for (let y = 4; y < 24; y += 2) for (let x = 3 + (y % 4 ? 1 : 0); x < 9; x += 2) g.set(x, y, "#4a3a30");
    g.ellipse(5.5, 7, 1.6, 1.6, "#1e1614").set(5, 7, C.brass);
    g.ellipse(5.5, 17, 3.2, 3.2, "#1e1614");
    g.ellipse(5.5, 17, 1.3, 1.3, C.copperLo);
  });
}

/** Lodge furniture; null keeps the classic sprite. */
export function prop(p: PropPlacement, L: Layout, classic: () => HTMLCanvasElement): HTMLCanvasElement | null {
  switch (p.kind) {
    case "couch":
      return couch();
    case "coffee-table":
      return coffeeTable();
    case "piano":
      return piano();
    case "fishtank-stand":
      return fishtankStand();
    case "tv":
      return tv(p.w ?? 120, L.tv.h, p.z > 0);
    case "armchair":
      return armchair();
    case "beanbag-blue":
      return beanbag("navy", C.navy, C.navyHi, C.navyLo);
    case "beanbag-pink":
      return beanbag("red", C.red, C.redHi, C.redLo);
    case "waiting-sofa":
      return bench(p.w ?? 42);
    case "waiting-sofa-back":
      return benchBack(p.w ?? 42);
    case "waiting-armchair":
      return sideArmchair(false);
    case "waiting-armchair-left":
      return sideArmchair(true);
    case "waiting-chair":
      return carvedChair("wait", false, C.red);
    case "reception":
      return hutDesk();
    case "lounge-table":
    case "side-table":
      return sideTable();
    case "whiteboard":
      return mapBoard(p.w ?? 80);
    case "meeting-table":
      return mapTable();
    case "meeting-chair-front":
      return carvedChair("meet", false, C.navy);
    case "meeting-chair-back":
      return carvedChair("meet", true, C.navy);
    case "guest-chair":
      return carvedChair("guest", true, C.red);
    case "plan-rolls":
      return recolor(classic(), { "#f4eee2": C.creamHi, "#e6dccb": C.creamLo });
    case "boss-desk":
      return bossDesk(p.w ?? 60);
    case "boss-chair":
      return bossChair();
    case "library-shelf":
      return libraryShelf();
    case "library-table":
      return libraryTable();
    case "lamp":
      return lamp();
    case "dog-bed":
      return dogBed();
    case "kitchen-counter":
      return counter(p.w ?? 100);
    case "espresso":
      return espresso();
    case "fridge":
      return icebox();
    case "vending":
      return hutShop();
    case "kitchen-island":
      return island(p.w ?? 72);
    case "stool":
      return stool();
    case "server-rack":
      return serverRack();
    case "ai-rack":
      return aiRack(classic);
    case "printer":
      return printer();
    case "cooler":
      return waterBarrel();
    case "bin":
      return basket();
    case "planter":
      return planter(p.w ?? 48);
    case "dartboard":
      return dartboard();
    case "pingpong":
      return pingPong();
    case "arcade":
      return arcade();
    case "bookshelf":
    case "low-shelf":
      return lowShelf();
    case "bench":
      return gardenBench();
    case "sofa-front":
      return couch();
    case "glass-front": {
      const room = L.rooms.find((r) => r.walls && r.rect.x === p.x && r.rect.w === p.w && r.rect.y + r.rect.h - 10 === p.y);
      const gap = room?.doorSide === "bottom" && room.doorX !== undefined ? room.doorX - room.rect.x : -1;
      return glassFront(p.w ?? 100, gap, room?.kind === "server" ? "cold" : room?.walls === "wood" ? "wood" : "glass");
    }
    case "cornhole":
      return recolor(classic(), { "#d9a066": C.pine, "#ecbd84": C.pineHi, "#3e8ed0": C.navy });
  }
  return null;
}

// ------------------------------------------------------------------ plants

/** Alpine plants: a dwarf mountain pine, gentians, edelweiss, a potted spruce, houseleeks in a stone trough. */
export function plant(name: string): HTMLCanvasElement | null {
  switch (name) {
    case "PLANT":
      return sprite("plant-pine", 16, 32, (g) => {
        g.rect(4, 24, 8, 7, "#c97a4f").rect(3, 23, 10, 2, "#d88a5a").rect(4, 30, 8, 1, "#a8613c");
        for (let j = 0; j < 18; j++) {
          const half = Math.round(1 + (j / 18) * 5);
          g.rect(8 - half, 5 + j, half * 2, 1, j % 3 === 0 ? C.mossLo : "#3f6a50");
          if (j % 3 === 0) g.rect(8 - half, 5 + j, half, 1, "#5a8a6a");
        }
        g.set(7, 4, "#3f6a50").set(8, 3, "#3f6a50");
      });
    case "PLANT_2":
      return sprite("plant-gentian", 16, 32, (g) => {
        g.rect(3, 24, 10, 7, C.stoneLo).rect(3, 24, 10, 1, C.stoneHi).rect(3, 30, 10, 1, C.stoneDk);
        for (let x = 4; x < 13; x += 2) g.vline(x, 16 + (x % 3), 8 - (x % 3), C.moss);
        for (const [x, y] of [[4, 14], [7, 12], [10, 13], [12, 16], [6, 17]] as const) g.rect(x, y, 2, 3, "#2f4ec8").set(x, y, "#5a7af0");
        g.set(9, 19, C.creamHi).set(8, 20, C.creamHi).set(10, 20, C.creamHi).set(9, 21, C.creamHi).set(9, 20, "#e8d27a");
      });
    case "CACTUS":
      return sprite("plant-houseleek", 16, 32, (g) => {
        g.rect(1, 24, 14, 7, C.stone).rect(1, 24, 14, 1, C.stoneHi).rect(1, 30, 14, 1, C.stoneDk);
        g.rect(2, 25, 12, 1, "#5a4232");
        for (const [cx, cy, c] of [[5, 22, "#7aa66a"], [11, 22, "#8ab07a"], [8, 19, "#6a9a5a"]] as const) {
          g.ellipse(cx, cy, 3, 2, c);
          g.set(cx, cy - 1, "#b8d8a0").set(cx - 2, cy, "#c06a6a").set(cx + 2, cy, "#c06a6a");
        }
        g.vline(8, 10, 8, C.moss).set(8, 9, "#e86aa8").set(7, 10, "#e86aa8").set(9, 10, "#e86aa8");
      });
    case "LARGE_PLANT":
      return sprite("plant-spruce", 32, 48, (g) => {
        g.rect(10, 38, 12, 9, C.pineLo).rect(9, 37, 14, 2, C.pine).rect(10, 46, 12, 1, C.pineDk);
        for (let x = 11; x < 21; x += 3) g.vline(x, 39, 7, C.pineDk);
        for (let j = 0; j < 34; j++) {
          const half = Math.round(1 + (j / 34) * 12) - (j % 5 === 4 ? 2 : 0);
          g.rect(16 - half, 3 + j, half * 2, 1, j % 5 < 2 ? "#2f5a48" : "#3c6b56");
          if (j % 5 === 0) g.rect(16 - half, 3 + j, Math.max(1, half - 2), 1, "#5a8a6a");
        }
        g.set(15, 1, "#2f5a48").set(16, 2, "#2f5a48").set(15, 2, "#3c6b56");
      });
    case "POT":
      return sprite("plant-crock", 16, 16, (g) => {
        g.rrect(4, 7, 8, 8, "#d8cbb0", 2).rect(5, 8, 2, 5, "#ece2cc");
        g.rect(4, 9, 8, 1, C.navy);
        g.line(6, 7, 3, 1, "#c4a050").line(8, 7, 8, 0, "#c4a050").line(10, 7, 12, 2, "#c4a050");
        g.set(3, 1, "#e8c870").set(8, 0, "#e8c870").set(12, 2, "#e8c870");
      });
    case "HANGING_PLANT":
      return sprite("plant-hang", 16, 32, (g) => {
        g.vline(8, 0, 10, C.iron);
        g.rect(4, 10, 8, 5, "#b88a52");
        for (let i = 0; i < 6; i++) g.vline(3 + i * 2, 13, 4 + ((i * 5) % 9), i % 2 ? C.moss : C.mossHi);
      });
  }
  return null;
}
