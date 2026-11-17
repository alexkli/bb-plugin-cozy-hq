// Home Office: the furniture. In every apartment a kitchenette with a coffee
// maker, a cozy armchair and a bed in the home's own fabric, a low front
// wall with the door; a small desk under the window for each model; out in
// the park a big outdoor screen on posts and a bench.
import type { DeskStyle } from "../../model.ts";
import type { Layout, PlantPlacement, PropPlacement } from "../../layout.ts";
import { Grid, shade } from "../../themekit.ts";
import { C, FABRICS, FRONTS, OUTLINE, sprite } from "./kit.ts";
import { FRONT, homeData } from "./plan.ts";

// ------------------------------------------------------------------ in an apartment

/** The kitchenette against the back wall: cupboards, the counter, a coffee maker and a kettle. */
function counter(seed: number): HTMLCanvasElement {
  const wood = ["#f4efe4", "#8fb8a0", "#c9a374", "#7a9ac4", "#e3c58a"][seed % 5]!;
  return sprite(`counter-${seed % 5}`, 24, 20, (g) => {
    g.rect(0, 6, 24, 14, wood);
    g.rect(0, 5, 24, 3, "#e9e4d8").rect(0, 5, 24, 1, "#ffffff");
    g.rect(1, 9, 10, 10, shade(wood, -0.08)).rect(13, 9, 10, 10, shade(wood, -0.08));
    g.vline(12, 9, 10, shade(wood, -0.3));
    g.set(10, 13, C.steelLo).set(14, 13, C.steelLo);
    // The coffee maker and a mug.
    g.rect(2, 0, 7, 6, C.dark).rect(3, 1, 5, 2, "#4a4655").set(4, 4, C.amber);
    g.rect(10, 3, 3, 3, "#f3ead6").set(13, 4, "#f3ead6").set(11, 3, "#5a3424");
    // A kettle.
    g.rect(17, 1, 5, 5, C.steel).rect(18, 0, 3, 1, C.steelLo).set(16, 3, C.steel).set(18, 2, "#e4e9ee");
  });
}

/** A cozy armchair facing you. */
function armchair(seed: number): HTMLCanvasElement {
  const f = FABRICS[seed % FABRICS.length]!;
  return sprite(`armchair-${seed % FABRICS.length}`, 18, 20, (g) => {
    g.rrect(2, 0, 14, 12, shade(f, -0.1), 2);
    g.rect(4, 2, 10, 7, shade(f, 0.12));
    g.rect(0, 6, 4, 11, f).rect(14, 6, 4, 11, f);
    g.rect(0, 6, 4, 1, shade(f, 0.25)).rect(14, 6, 4, 1, shade(f, 0.25));
    g.rect(4, 10, 10, 6, shade(f, 0.2)).rect(4, 15, 10, 2, shade(f, -0.15));
    g.rect(1, 17, 2, 3, C.walnutLo).rect(15, 17, 2, 3, C.walnutLo);
  });
}

/** A bed along the floor: the headboard at the left, pillow, the blanket folded back. */
function bed(seed: number): HTMLCanvasElement {
  const f = FABRICS[(seed + 3) % FABRICS.length]!;
  return sprite(`bed-${(seed + 3) % FABRICS.length}`, 38, 20, (g) => {
    g.rect(0, 0, 4, 18, C.walnut).rect(0, 0, 4, 2, "#a8744c");
    g.rect(4, 3, 33, 13, "#f8f5ee");
    g.rect(5, 5, 9, 9, "#ffffff").rect(5, 13, 9, 1, "#dcd6ca");
    g.rect(18, 3, 19, 13, f).rect(18, 3, 2, 13, shade(f, 0.3)).rect(18, 15, 19, 1, shade(f, -0.25));
    for (let x = 22; x < 36; x += 4) g.vline(x, 4, 11, shade(f, 0.12));
    g.rect(4, 16, 33, 3, C.walnutLo).rect(36, 2, 2, 17, C.walnut);
  });
}

/** The blanket pulled up over whoever's napping (drawn over them). */
export function blanket(seed: number): HTMLCanvasElement {
  const f = FABRICS[(seed + 3) % FABRICS.length]!;
  return sprite(`blanket-${(seed + 3) % FABRICS.length}`, 24, 13, (g) => {
    g.rect(0, 0, 23, 12, f).rect(0, 0, 2, 12, shade(f, 0.3)).rect(0, 11, 23, 1, shade(f, -0.25));
    for (let x = 4; x < 22; x += 4) g.vline(x, 1, 10, shade(f, 0.12));
  });
}

/** A two-seat sofa facing you. */
function sofa(seed: number): HTMLCanvasElement {
  const f = FABRICS[(seed + 5) % FABRICS.length]!;
  return sprite(`sofa-${(seed + 5) % FABRICS.length}`, 36, 18, (g) => {
    g.rrect(2, 0, 32, 10, shade(f, -0.12), 2);
    g.rect(0, 5, 5, 11, f).rect(31, 5, 5, 11, f);
    g.rect(0, 5, 5, 1, shade(f, 0.25)).rect(31, 5, 5, 1, shade(f, 0.25));
    g.rect(5, 9, 13, 6, shade(f, 0.2)).rect(18, 9, 13, 6, shade(f, 0.2));
    g.vline(18, 9, 6, shade(f, -0.1));
    g.rect(5, 14, 26, 2, shade(f, -0.18));
    g.rect(7, 2, 5, 5, "#f3ead6").rect(24, 2, 5, 5, shade(f, 0.45));
    g.rect(1, 16, 2, 2, C.walnutLo).rect(33, 16, 2, 2, C.walnutLo);
  });
}

/** A loft bed up on posts, a ladder at the side (the desk fits under it). */
function loftBed(seed: number): HTMLCanvasElement {
  const f = FABRICS[(seed + 3) % FABRICS.length]!;
  return sprite(`loftbed-${(seed + 3) % FABRICS.length}`, 40, 34, (g) => {
    g.rect(0, 0, 3, 34, C.walnut).rect(37, 0, 3, 34, C.walnut);
    g.rect(3, 8, 34, 12, "#f8f5ee").rect(4, 9, 8, 9, "#ffffff");
    g.rect(16, 8, 21, 12, f).rect(16, 8, 2, 12, shade(f, 0.3));
    g.rect(3, 20, 34, 3, C.walnutLo).rect(3, 5, 34, 2, C.walnut);
    for (let y = 23; y < 34; y += 3) g.hline(30, y, 6, "#a8744c");
    g.vline(30, 20, 14, C.walnut).vline(35, 20, 14, C.walnut);
  });
}

/** A flipchart on its easel. */
function flipchart(): HTMLCanvasElement {
  return sprite("flipchart", 16, 24, (g) => {
    g.rect(1, 0, 14, 14, "#fbfbf8").rect(1, 0, 14, 2, "#aeb6bf");
    g.hline(3, 4, 8, "#3e8ed0").hline(3, 7, 10, "#e5484d").hline(3, 10, 6, "#30a46c");
    g.vline(3, 14, 10, "#6e6a62").vline(12, 14, 10, "#6e6a62").vline(8, 14, 7, "#6e6a62");
    g.hline(2, 14, 12, "#8d96a0");
  });
}

/** A hammock slung between two posts. */
function hammock(seed: number): HTMLCanvasElement {
  const f = FABRICS[(seed + 1) % FABRICS.length]!;
  return sprite(`hammock-${(seed + 1) % FABRICS.length}`, 34, 16, (g) => {
    g.rect(0, 0, 3, 16, C.bark).rect(31, 0, 3, 16, C.bark);
    g.line(3, 3, 8, 7, "#e9dcc4").line(30, 3, 25, 7, "#e9dcc4");
    for (let x = 7; x < 27; x++) {
      const sag = Math.round(Math.sin(((x - 7) / 20) * Math.PI) * 3);
      g.vline(x, 6 + sag, 3, (x >> 1) % 2 ? f : C.white);
    }
  });
}

/** The front wall of a home: a low wall in its outside color with the doorway; a railing for a balcony. */
function frontWall(w: number, gap: number, seed: number, kind: "home" | "house" | "cottage" | "balcony" | "cafe"): HTMLCanvasElement {
  const f =
    kind === "house" ? { wall: "#efe2c8", hi: "#fbf3e2", lo: "#c9b28a", brick: false }
    : kind === "cottage" ? { wall: "#e9dcc4", hi: "#f4ead6", lo: "#8a5a3c", brick: false }
    : kind === "cafe" ? { wall: "#2f5d50", hi: "#46806e", lo: "#173129", brick: false }
    : FRONTS[seed % FRONTS.length]!;
  return sprite(`front-${kind}-${w}-${gap}-${seed % FRONTS.length}`, w, FRONT + 1, (g) => {
    if (kind === "balcony") {
      // A metal railing with a handrail; the plants show through.
      g.rect(0, 0, w, 2, "#5d6670").rect(0, 0, w, 1, "#8e98a2");
      for (let x = 1; x < w; x += 3) g.vline(x, 2, FRONT - 1, "#5d6670");
      g.rect(0, FRONT, w, 1, "#3e464e");
      for (const x of [0, w - 3]) g.rect(x, 0, 3, FRONT + 1, f.wall);
    } else {
      g.rect(0, 0, w, FRONT + 1, f.wall);
      g.rect(0, 0, w, 2, f.hi);
      if ("brick" in f && f.brick) for (let x = 0; x < w; x += 6) g.vline(x + ((x / 6) % 2) * 3, 3, 3, f.lo);
      g.rect(0, FRONT, w, 1, f.lo);
    }
    if (gap >= 0) for (let x = gap - 6; x < gap + 6; x++) for (let y = 0; y <= FRONT; y++) g.set(x, y, null);
  });
}

// ------------------------------------------------------------------ the park, the street, the café

/** The big screen on a shopfront, bolted to the wall with little lights round the frame. */
function billboard(w: number, h: number): HTMLCanvasElement {
  return sprite(`billboard-${w}x${h}`, w + 2, h + 4, (g) => {
    g.rrect(1, 1, w, h, C.frame, 1);
    g.rect(3, 3, w - 4, h - 4, "#14121c");
    g.rect(1, 1, w, 1, C.frameHi);
    for (let x = 4; x < w - 2; x += 6) g.set(x, 1, "#ffd84a");
    g.set(w - 3, h - 1, "#5ad18a");
    g.rect(w / 2 - 8, h + 1, 16, 2, "#3a3546");
  });
}

function bench(w: number): HTMLCanvasElement {
  return sprite(`bench-${w}`, w, 13, (g) => {
    g.rect(0, 0, w, 3, "#9a6a3c").rect(0, 0, w, 1, "#b8844e");
    g.rect(0, 4, w, 3, "#9a6a3c").rect(0, 4, w, 1, "#b8844e");
    g.rect(0, 8, w, 2, "#8a5a32");
    g.rect(2, 3, 2, 10, "#3a3846").rect(w - 4, 3, 2, 10, "#3a3846");
  });
}

/** The café's bar: walnut with a marble top, an espresso machine, cups and a cake stand. */
function cafeBar(w: number): HTMLCanvasElement {
  return sprite(`cafe-bar-${w}`, w, 22, (g) => {
    g.rect(0, 7, w, 15, "#6e432a").rect(0, 7, w, 1, "#8a5737");
    for (let x = 4; x < w - 2; x += 8) g.vline(x, 9, 12, "#53311f");
    g.rect(0, 5, w, 3, "#ece8e2").rect(0, 5, w, 1, "#faf8f4");
    g.rect(4, 0, 14, 6, "#cfd6dc").rect(5, 1, 12, 2, "#8e98a2").set(8, 4, "#3b2116").set(13, 4, "#3b2116");
    for (let x = 22; x < Math.min(w - 16, 46); x += 5) g.rect(x, 2, 3, 3, "#f6efe4").set(x + 1, 2, "#c58a52");
    g.rect(w - 14, 0, 10, 5, "#f3d9b0").rect(w - 15, 4, 12, 1, "#cfd6dc").set(w - 10, 0, "#c4486a");
  });
}

// ------------------------------------------------------------------ hooks

export function homeProp(p: PropPlacement, L: Layout, classic: () => HTMLCanvasElement): HTMLCanvasElement | null {
  const d = homeData(L);
  if (!d) return null;
  const m = /^home-(\d+)-(\w+)$/.exec(p.id);
  if (m) {
    const u = d.units[Number(m[1])];
    if (!u) return null;
    switch (m[2]) {
      case "counter":
        return counter(u.seed);
      case "chair":
        return armchair(u.seed);
      case "bed":
        return bed(u.seed);
      case "loft":
        return loftBed(u.seed);
      case "sofa":
        return sofa(u.seed);
      case "flip":
        return flipchart();
      case "hammock":
        return hammock(u.seed);
      case "front":
        return frontWall(u.rect.w, u.doorX - u.rect.x, u.seed, u.template === "balcony" ? "balcony" : u.template === "cottage" ? "cottage" : "home");
    }
    return null;
  }
  switch (p.id) {
    case "house-front": {
      const room = L.rooms.find((r) => r.kind === "boss");
      return frontWall(p.w ?? 100, room?.doorX !== undefined ? room.doorX - p.x : -1, 0, "house");
    }
    case "cafe-front":
      return d.cafe ? frontWall(p.w ?? 100, d.cafeDoor - d.cafe.x, 0, "cafe") : null;
    case "cafe-bar":
      return cafeBar(p.w ?? 80);
    case "tv":
      return billboard(L.tv.w, L.tv.h);
    case "park-bench-0":
    case "park-bench-1":
      return bench(26);
    case "porch-bench":
      return bench(p.id === "porch-bench" && d.garden ? d.garden.w - 6 : 36);
  }
  void classic;
  return null;
}

export function homePlant(sprite: PlantPlacement["sprite"]): HTMLCanvasElement | null {
  void sprite;
  return null;
}

// ------------------------------------------------------------------ desks

const DESK_WOOD: Record<DeskStyle, [string, string, string]> = {
  opus: ["#7a4e2e", "#946038", "#5a361e"],
  sonnet: ["#c99a66", "#dcae78", "#a87a4a"],
  haiku: ["#f2efe8", "#ffffff", "#cfc9bd"],
  gpt: ["#33313b", "#4a4855", "#22202a"],
  gemini: ["#e0c49a", "#ecd4ae", "#c4a678"],
  default: ["#c99a66", "#dcae78", "#a87a4a"],
};

/** A small desk under the window (30×18), in the model's wood. */
export function homeDesk(style: DeskStyle): HTMLCanvasElement {
  const [base, hi, lo] = DESK_WOOD[style];
  return sprite(`desk-${style}`, 30, 18, (g) => {
    g.rect(0, 0, 30, 9, base).rect(0, 0, 30, 1, hi);
    g.rect(0, 8, 30, 2, lo);
    g.rect(1, 10, 3, 8, lo).rect(26, 10, 3, 8, lo);
    g.rect(18, 10, 9, 6, base).hline(19, 13, 7, lo);
    // A mug and a notebook.
    g.rect(2, 3, 3, 3, "#f3ead6").set(3, 3, "#5a3424");
    g.rect(23, 2, 5, 4, "#e5a33c").vline(23, 2, 4, "#c4842a");
  });
}
