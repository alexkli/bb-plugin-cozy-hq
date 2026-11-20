// Startup House: the live bits. The holiday lights nobody took down along the
// top of the front wall; out back the grill, the palms and the hammock, the
// pool loungers, the lemon tree, the pool shimmering (lit from inside at
// night) and bistro lights over the patio; indoors the TV console, the
// energy-drink pyramid, the bunk bed, the garage's workbench, bike, surfboard
// and box fans, the shoe pile by the door, the squeeze-ins' seats (./nooks.ts);
// the weather out in the yard; and every lamp that keeps the house glowing at
// 2 a.m.

import type { Drawable, Light, PaintInfo, WallLightsInfo } from "../../theme.ts";
import type { Layout, Point, Rect } from "../../layout.ts";
import { cached, floorPlan, mix, shade } from "../../themekit.ts";
import { C, CANS, can, fill, ih, OUTLINE, sprite, STICKERS } from "./kit.ts";
import { acrossFloorOf, planOf, type StartupPlan } from "./plan.ts";
import { clickDecor, clickLights, clickOverlay, clickUnderlay, pyramidAt, pyramidDown, rehearsalSpots } from "./clicks.ts";
import { lounger, nookDecor, nookLights } from "./nooks.ts";

type Ctx = CanvasRenderingContext2D;

// ------------------------------------------------------------------ holiday lights

interface Bulb {
  x: number;
  y: number;
  color: string;
}

function bulbsOf(L: Layout): { wire: Point[]; bulbs: Bulb[] } {
  return cached(`startup|bulbs|${L.W}x${L.H}|${L.segments.map((s) => `${s.x0}-${s.x1}`).join(",")}`, () => {
    const colors = ["#ff4f5a", "#4fd16a", "#4fa8ff", "#ffcf3a", "#ff8a2a", "#c86aff"];
    const wire: Point[] = [];
    const bulbs: Bulb[] = [];
    let n = 0;
    // Stapled under the crown molding every 24 px, sagging between staples, the house's front wall only.
    const top = planOf(L)?.lot.front ?? 0;
    const x0 = Math.min(...L.segments.map((s) => s.x0)) + 2;
    const x1 = Math.max(...L.segments.map((s) => s.x1)) - 2;
    for (let x = x0; x < x1; x++) {
      const k = (x % 24) / 24;
      const y = top + 5 + Math.round(Math.sin(k * Math.PI) * 3);
      wire.push({ x, y });
      if (x % 12 === 6) bulbs.push({ x, y: y + 1, color: colors[n++ % colors.length]! });
    }
    return { wire, bulbs };
  });
}

export function startupWallLights(ctx: Ctx, L: Layout, info: WallLightsInfo, glow: boolean): void {
  const { wire, bulbs } = bulbsOf(L);
  const t = info.t;
  const night = info.party ? Math.max(info.night, 0.7) : info.night;
  const on = night > 0.25 || info.party;
  const dead = info.brokenBulbX;
  const isDead = (b: Bulb) => dead !== null && Math.abs(b.x - dead) <= 6 && Math.floor(t * 9) % 7 !== 0;
  if (glow) {
    if (!on) return;
    for (const [i, b] of bulbs.entries()) {
      if (isDead(b)) continue;
      const k = info.party ? ((i + Math.floor(t * 6)) % 3 === 0 ? 1 : 0.3) : 0.75 + 0.25 * Math.sin(t * 1.1 + i * 2.3);
      const g = ctx.createRadialGradient(b.x + 0.5, b.y + 2, 0, b.x + 0.5, b.y + 2, 6);
      g.addColorStop(0, `${b.color}${Math.round(110 * k * night).toString(16).padStart(2, "0")}`);
      g.addColorStop(1, `${b.color}00`);
      ctx.fillStyle = g;
      ctx.fillRect(b.x - 6, b.y - 4, 13, 13);
    }
    return;
  }
  ctx.fillStyle = "#2f4a2a";
  for (const p of wire) ctx.fillRect(p.x, p.y, 1, 1);
  for (const [i, b] of bulbs.entries()) {
    const off = isDead(b);
    const lit = on && !off && (!info.party || (i + Math.floor(t * 6)) % 3 === 0 || night > 0.5);
    ctx.fillStyle = "#2f4a2a";
    ctx.fillRect(b.x, b.y, 1, 1);
    ctx.fillStyle = off ? "#4a4450" : lit ? mix(b.color, "#ffffff", 0.35) : shade(b.color, -0.25);
    ctx.fillRect(b.x - 1 + (i % 2), b.y + 1, 2, 3);
  }
}

// ------------------------------------------------------------------ sprites

function palmTrunk(): HTMLCanvasElement {
  return sprite("palm-trunk", 9, 44, (g) => {
    for (let y = 0; y < 44; y++) {
      const x = 3 + Math.round(Math.sin(y / 14) * 1.5);
      g.rect(x, y, 3, 1, y % 4 === 0 ? C.trunkLo : C.trunk);
      if (y % 4 === 1) g.set(x + 2, y, "#b8946a");
    }
  });
}

function palmCrown(v: number): HTMLCanvasElement {
  return sprite(`palm-crown-${v}`, 50, 30, (g) => {
    // Fronds fanning out and drooping, each a spine with leaflets either side.
    const fronds: [number, number][] = [[-23, 9], [-18, 17], [-9, 21], [9, 21], [18, 17], [23, 9], [-15, -3], [15, -3], [-3, -9], [5, 14]];
    for (const [i, [dx, dy]] of fronds.entries()) {
      const steps = 18;
      const c = (i + v) % 3 === 0 ? C.palmHi : (i + v) % 3 === 1 ? C.palm : C.palmLo;
      for (let s = 1; s <= steps; s++) {
        const k = s / steps;
        const x = 25 + dx * k;
        const y = 10 + dy * k + (Math.abs(dx) > 10 ? k * k * 7 : 0);
        g.set(x, y, shade(c, -0.1));
        if (s > 2 && s < steps) {
          // Leaflets hang down off the spine.
          const len = s < steps - 3 ? 2 : 1;
          for (let j = 1; j <= len; j++) g.set(x + (dx > 0 ? -j * 0.5 : j * 0.5), y + j, c);
          if (s % 2 === 0) g.set(x, y - 1, shade(c, 0.15));
        }
      }
    }
    g.ellipse(25, 10, 3, 2, C.palmLo);
    g.rect(23, 11, 2, 2, "#8a6a2a").rect(26, 11, 2, 2, "#7a5a24");
  });
}

function grillSprite(lidUp: boolean): HTMLCanvasElement {
  // A red kettle grill on three legs, a side table of tongs and buns.
  return sprite(`grill-${lidUp}`, 24, 26, (g) => {
    g.line(7, 17, 4, 24, C.steelDk).line(13, 17, 16, 24, C.steelDk).vline(10, 17, 7, C.steelDk);
    g.ellipse(10, 15, 7, 4, "#c4342a");
    g.ellipse(10, 14, 7, 3, "#2e2c36");
    if (lidUp) {
      g.ellipse(10, 6, 7, 5, "#c4342a");
      g.ellipse(9, 4, 4, 2, "#e85a4a");
      g.rect(9, 0, 3, 2, C.black);
      for (const x of [6, 10, 14]) g.rect(x - 1, 13, 3, 2, "#6a3a2a");
    } else {
      g.ellipse(10, 11, 7, 5, "#c4342a");
      g.ellipse(9, 9, 4, 2, "#e85a4a");
      g.rect(9, 6, 3, 2, C.black);
    }
    // The side table: tongs and a bag of buns.
    g.rect(17, 12, 6, 3, C.fence).rect(17, 12, 6, 1, C.fenceHi);
    g.vline(18, 15, 8, C.fenceLo).vline(22, 15, 8, C.fenceLo);
    g.rect(18, 10, 4, 2, "#e8c080");
  });
}

function lemonTree(): HTMLCanvasElement {
  return sprite("lemon", 28, 34, (g) => {
    g.vline(13, 20, 13, C.trunkLo).vline(14, 22, 11, C.trunk);
    g.ellipse(13.5, 12, 12, 10, C.palm);
    g.ellipse(11, 9, 7, 5, C.palmHi);
    for (const [x, y] of [[6, 12], [18, 8], [12, 17], [20, 15], [9, 5], [16, 13]] as const) g.rect(x, y, 2, 2, "#ffe14a").set(x, y, "#fff5a0");
    g.rect(4, 31, 3, 2, "#ffe14a").rect(19, 32, 2, 2, "#e8c83a");
  });
}

function consoleStand(w: number): HTMLCanvasElement {
  // A low media console under the TV: the game console, a tangle of cables, a stack of games.
  return sprite(`console-${w}`, w, 10, (g) => {
    g.rect(1, 2, w - 2, 6, C.woodLo);
    g.rect(1, 2, w - 2, 1, C.woodHi);
    g.rect(3, 4, Math.round(w / 2) - 5, 3, C.woodDk).rect(Math.round(w / 2) + 2, 4, Math.round(w / 2) - 5, 3, C.woodDk);
    g.rect(2, 8, 2, 1, C.woodDk).rect(w - 4, 8, 2, 1, C.woodDk);
    // The console on top, standing up, with its little light.
    const cx = Math.round(w / 2) - 4;
    g.rect(cx, 0, 8, 3, "#f4f4f0").set(cx + 6, 1, C.cyan);
    g.rect(6, 1, 5, 2, C.red).rect(w - 12, 1, 6, 2, "#4a4856");
    for (const x of [cx + 2, cx + 5]) g.vline(x, 3, 6, "#1a1a22");
  });
}

function pyramid(): HTMLCanvasElement {
  // The energy-drink pyramid: four, three, two, one (it's taller every week).
  return sprite("pyramid", 14, 18, (g) => {
    let n = 0;
    for (let row = 0; row < 4; row++) {
      const count = 4 - row;
      for (let i = 0; i < count; i++) can(g, 1 + row * 1.5 + i * 3 + (row % 2 ? 0.5 : 0), 13 - row * 4, CANS[n++ % CANS.length]!);
    }
  });
}

function bunkBed(): HTMLCanvasElement {
  // The bunk bed from the bedroom days, shoved into the corner: a sleeping bag on top, laundry below, fairy lights.
  return sprite("bunk", 28, 46, (g) => {
    const wood = C.wood;
    g.vline(1, 0, 45, C.woodLo).vline(2, 0, 45, wood).vline(25, 0, 45, C.woodLo).vline(26, 0, 45, wood);
    // Top bunk.
    g.rect(3, 6, 22, 10, "#f4f2ea");
    g.rect(3, 6, 22, 1, "#ffffff");
    g.rrect(4, 7, 14, 8, "#3a6ea8", 2);
    g.rect(5, 8, 12, 1, "#5a8ec8");
    g.rrect(19, 7, 5, 5, "#ffffff", 1);
    g.rect(3, 16, 22, 3, wood).rect(3, 16, 22, 1, C.woodHi);
    // Bottom bunk: a mattress with laundry and a laptop.
    g.rect(3, 26, 22, 10, "#e8e2d4");
    g.rect(5, 28, 8, 5, "#c4483a").rect(9, 30, 6, 4, "#5f7fa8").rect(15, 29, 7, 4, "#c9ced6");
    g.rect(3, 36, 22, 3, wood).rect(3, 36, 22, 1, C.woodHi);
    // The ladder.
    g.vline(22, 16, 20, C.woodLo);
    for (let y = 20; y < 36; y += 4) g.rect(20, y, 4, 1, wood);
    // Fairy lights along the top rail.
    for (let x = 3; x < 25; x += 3) g.set(x, 4 + (x % 2), STICKERS[(x / 3) % STICKERS.length]!);
    g.rect(3, 3, 22, 1, wood);
    g.rect(0, 43, 4, 2, C.woodDk).rect(24, 43, 4, 2, C.woodDk);
  });
}

function workbench(): HTMLCanvasElement {
  // A workbench: a vise, a soldering iron, a 3D printer mid-print, a coffee can of screws.
  return sprite("workbench", 40, 24, (g) => {
    g.rect(1, 8, 38, 7, C.woodHi);
    g.rect(1, 8, 38, 1, "#e8c08a");
    g.rect(1, 15, 38, 3, C.woodLo);
    g.rect(2, 18, 2, 5, C.woodDk).rect(36, 18, 2, 5, C.woodDk);
    g.rect(3, 20, 34, 1, C.woodLo);
    // The 3D printer.
    g.rect(22, 0, 14, 12, "#3a3a44");
    g.rect(23, 1, 12, 9, "#22222a");
    g.rect(25, 7, 6, 3, C.orange).rect(27, 3, 3, 1, "#c8ced6");
    g.vline(28, 1, 2, "#c8ced6");
    // The vise, the iron, the screws.
    g.rect(3, 5, 6, 4, C.steelLo).rect(4, 4, 4, 1, C.steel);
    g.line(11, 10, 17, 12, "#e8c060").set(18, 12, C.red);
    g.rect(12, 6, 4, 4, "#c8a040").rect(12, 6, 4, 1, "#e8d080");
  });
}

function bike(): HTMLCanvasElement {
  // A road bike leaning on its kickstand (seen from the side).
  return sprite("bike", 26, 16, (g) => {
    g.ellipse(5, 10, 4.5, 4.5, "#2e2c36");
    g.ellipse(5, 10, 3, 3, "#b8c0c8");
    g.ellipse(20, 10, 4.5, 4.5, "#2e2c36");
    g.ellipse(20, 10, 3, 3, "#b8c0c8");
    g.line(5, 10, 11, 4, "#3fb5a8").line(11, 4, 18, 4, "#3fb5a8").line(11, 4, 13, 10, "#3fb5a8").line(13, 10, 5, 10, "#3fb5a8").line(18, 4, 20, 10, "#3fb5a8").line(13, 10, 18, 4, "#3fb5a8");
    g.rect(9, 2, 4, 1, "#2e2c36").rect(17, 2, 3, 1, "#2e2c36").vline(18, 2, 2, "#3fb5a8");
  }, false);
}

function surfboard(): HTMLCanvasElement {
  return sprite("surfboard", 10, 36, (g) => {
    g.ellipse(4.5, 18, 4, 17, "#f4e8c8");
    g.vline(4, 2, 32, "#e86a3a");
    g.rect(2, 10, 5, 2, "#43d1f0");
    g.rect(3, 30, 3, 2, "#2e2c36");
  });
}

function boxFan(): HTMLCanvasElement {
  return sprite("fan", 13, 14, (g) => {
    g.rect(1, 1, 11, 11, "#e8e4da");
    g.ellipse(6, 6, 4, 4, "#8a949e");
    g.ellipse(6, 6, 1, 1, "#4a4856");
    g.rect(2, 12, 2, 1, "#b8b4a8").rect(9, 12, 2, 1, "#b8b4a8");
    g.rect(5, 0, 3, 1, "#b8b4a8");
  });
}

function fanBlades(): HTMLCanvasElement {
  return sprite("fan-blur", 9, 9, (g) => {
    g.ellipse(4, 4, 3.5, 3.5, "#c8ced4");
    g.set(4, 4, "#4a4856");
  }, false);
}

function shoeBench(): HTMLCanvasElement {
  // A low bench by the back door, shoes kicked off under and around it.
  return sprite("shoe-bench", 40, 16, (g) => {
    g.rect(1, 3, 38, 4, C.wood).rect(1, 3, 38, 1, C.woodHi);
    g.rect(1, 7, 38, 1, C.woodLo);
    g.rect(2, 8, 2, 6, C.woodDk).rect(36, 8, 2, 6, C.woodDk);
    g.rect(6, 1, 9, 2, "#5f7fa8").rect(7, 0, 6, 1, "#7f9fc8");
    const shoes: [number, number, string][] = [[5, 10, "#f4f4f0"], [11, 11, "#e5544b"], [18, 10, "#2e2c36"], [24, 11, "#43d1f0"], [30, 10, "#ffd84a"]];
    for (const [x, y, c] of shoes) g.rrect(x, y, 5, 3, c, 1).set(x + 1, y + 1, shade(c, -0.25));
  });
}

function shoePile(): HTMLCanvasElement {
  // Everyone's shoes by the door: sneakers, flip-flops, one boot.
  return sprite("shoes", 26, 10, (g) => {
    const shoes: [number, number, string][] = [[1, 5, "#f4f4f0"], [6, 3, "#e5544b"], [11, 6, "#2e2c36"], [15, 2, "#43d1f0"], [19, 5, "#f4f4f0"], [8, 7, "#ffd84a"]];
    for (const [x, y, c] of shoes) {
      g.rrect(x, y, 6, 3, c, 1);
      g.set(x + 1, y + 1, shade(c, -0.25));
    }
    g.rect(21, 1, 3, 6, "#6a4a30").rect(21, 6, 5, 2, "#6a4a30");
  });
}

function coatRack(): HTMLCanvasElement {
  // A coat rack drowning in hoodies.
  return sprite("coatrack", 14, 36, (g) => {
    g.vline(6, 2, 32, C.woodLo).vline(7, 2, 32, C.wood);
    g.rect(3, 33, 8, 2, C.woodDk);
    g.rrect(1, 4, 6, 12, "#4a5a7a", 1);
    g.rect(2, 5, 4, 1, "#6a7a9a");
    g.rrect(8, 5, 5, 14, "#e86a3a", 1);
    g.rect(9, 6, 3, 1, "#f8a06a");
    g.rrect(3, 10, 7, 10, "#7a7a84", 1);
    g.rect(5, 12, 3, 2, C.lime);
  });
}

function packages(): HTMLCanvasElement {
  // Deliveries nobody's opened: hardware, swag, a box big enough for a mattress.
  return sprite("packages", 30, 20, (g) => {
    g.rect(1, 6, 16, 12, C.box).rect(1, 6, 16, 1, C.boxHi).rect(8, 6, 2, 12, "#d8c49a").rect(3, 10, 4, 3, C.paper);
    g.rect(15, 10, 13, 8, "#c09060").rect(15, 10, 13, 1, "#d8a878").rect(20, 10, 2, 8, "#e0cc9a");
    g.rect(5, 1, 10, 6, "#b8935e").rect(5, 1, 10, 1, "#d0aa74").rect(9, 1, 2, 6, "#e0cc9a");
    g.rect(22, 6, 6, 4, "#2e2c36").rect(23, 7, 4, 1, C.pink);
  });
}

function scooter(): HTMLCanvasElement {
  // An electric scooter, lying where it was dropped.
  return sprite("scooter", 24, 10, (g) => {
    g.rect(3, 5, 16, 2, "#2e2c36");
    g.ellipse(3, 7, 2, 2, "#1a1a22");
    g.ellipse(20, 7, 2, 2, "#1a1a22");
    g.line(19, 6, 22, 1, "#4a4856");
    g.rect(20, 0, 4, 1, "#4a4856");
    g.set(8, 5, C.lime).set(9, 5, C.lime);
  }, false);
}

function rollingBoard(): HTMLCanvasElement {
  // A whiteboard on wheels, every inch covered: boxes, arrows, a hockey-stick graph, "MVP?" circled twice.
  return sprite("rolling-board", 32, 38, (g) => {
    g.rect(1, 1, 30, 22, "#c9ced4");
    g.rect(2, 2, 28, 20, "#fbfcfd");
    g.rect(4, 4, 7, 1, "#3a74c4").rect(4, 7, 7, 1, "#3a74c4").vline(4, 4, 4, "#3a74c4").vline(10, 4, 4, "#3a74c4");
    g.rect(11, 6, 5, 1, "#3a74c4").set(15, 5, "#3a74c4").set(15, 7, "#3a74c4");
    g.rect(17, 4, 7, 1, "#e5544b").rect(17, 7, 7, 1, "#e5544b").vline(17, 4, 4, "#e5544b").vline(23, 4, 4, "#e5544b");
    for (let k = 0; k < 12; k++) g.set(4 + k, 19 - Math.floor((k * k) / 18), "#3a9a5a");
    g.vline(4, 11, 9, "#2e2c36").rect(4, 19, 13, 1, "#2e2c36");
    g.rect(20, 12, 8, 1, "#2e2c36").rect(20, 15, 6, 1, "#2e2c36").rect(20, 18, 7, 1, "#e5544b");
    g.rect(1, 23, 30, 2, "#aab2bc");
    g.vline(5, 25, 10, C.steelLo).vline(26, 25, 10, C.steelLo);
    g.rect(2, 34, 8, 1, C.steelDk).rect(22, 34, 8, 1, C.steelDk);
    g.set(2, 35, "#1a1a22").set(9, 35, "#1a1a22").set(22, 35, "#1a1a22").set(29, 35, "#1a1a22");
  });
}

function recycling(): HTMLCanvasElement {
  // The recycling bin, overflowing with cans.
  return sprite("recycling", 16, 18, (g) => {
    g.rect(2, 6, 12, 11, "#3a74c4");
    g.rect(2, 6, 3, 11, "#5a94e4");
    g.rect(1, 5, 14, 2, "#2a5aa0");
    for (let i = 0; i < 5; i++) can(g, 2 + (i % 3) * 4, 1 + (i > 2 ? 2 : 0) + (i % 2), CANS[i % CANS.length]!);
    g.rect(6, 10, 4, 3, "#e8f0ff");
  });
}

function hackTable(): HTMLCanvasElement {
  // The old dining table, now the hackathon table: laptops, cables, a pizza, a rubber duck.
  return sprite("hack-table", 64, 28, (g) => {
    g.rect(1, 4, 62, 14, C.wood);
    g.rect(1, 4, 62, 1, C.woodHi);
    g.rect(1, 18, 62, 3, C.woodLo);
    g.rect(3, 21, 2, 6, C.woodDk).rect(59, 21, 2, 6, C.woodDk);
    for (const [x, c] of [[4, STICKERS[0]], [22, STICKERS[2]], [44, STICKERS[4]]] as const) {
      g.rect(x, 6, 11, 7, "#c9ced6").rect(x + 1, 7, 9, 4, "#2a3a5a").set(x + 2, 8, "#7fe0ff").rect(x + 3, 9, 4, 1, "#7a9ad0");
      g.rect(x + 7, 12, 2, 1, c!);
    }
    g.ellipse(39, 14, 4, 2.5, "#e8b45a");
    g.set(38, 13, "#d8483a").set(40, 15, "#d8483a");
    g.rect(57, 7, 3, 2, "#ffd84a").set(59, 6, "#ffd84a").set(60, 7, "#ff9a3d");
    for (let x = 15; x < 22; x++) g.set(x, 15 + (x % 2), "#2e2c36");
  });
}

function airMattress(): HTMLCanvasElement {
  // Someone's air mattress on the living-room floor, a sleeping bag kicked off it.
  return sprite("air-mattress", 30, 16, (g) => {
    g.rrect(1, 2, 28, 12, "#5a8ec8", 2);
    g.rect(2, 3, 26, 1, "#7aaee8");
    for (let x = 4; x < 27; x += 4) g.vline(x, 4, 9, "#4a7ab0");
    g.rrect(3, 4, 7, 5, "#f4f2ea", 1);
    g.rrect(12, 6, 16, 9, "#d86a3a", 2);
    g.rect(13, 7, 14, 1, "#f08a5a");
  });
}

function pizzaTower(): HTMLCanvasElement {
  // Pizza boxes stacked up to the light switch.
  return sprite("pizzas", 18, 22, (g) => {
    for (let i = 0; i < 6; i++) {
      const y = 17 - i * 3;
      const dx = (i * 3) % 4 - 1;
      g.rect(2 + dx, y, 14, 3, C.box);
      g.rect(2 + dx, y, 14, 1, C.boxHi);
      g.set(4 + dx, y + 1, "#c9483a");
    }
    g.rect(4, 2, 10, 1, "#c9483a");
  });
}

// ------------------------------------------------------------------ where things go

interface Spots {
  console: { x: number; y: number; w: number } | null;
  pyramid: { x: number; y: number; z: number } | null;
  bench: Rect | null;
  bike: Rect | null;
  surf: Rect | null;
  fans: Rect[];
  shoes: Rect | null;
  shoeBench: Rect | null;
  coats: Rect | null;
  packages: Rect | null;
  scooter: Rect | null;
  board: Rect | null;
  crash: Rect | null;
  recycling: Rect | null;
  hack: Rect | null;
  pizzas: Rect | null;
}

/** Where the TV console stands: on the floor under a wall TV. */
function consoleOf(L: Layout): { x: number; y: number; w: number } | null {
  const seg = L.segments.find((s) => L.tv.x >= s.x0 && L.tv.x < s.x1);
  if (!seg || L.tv.y >= seg.depth) return null;
  const w = Math.min(L.tv.w - 40, 64);
  return { x: Math.round(L.tv.x + (L.tv.w - w) / 2), y: seg.depth - 4, w };
}


function spotsOf(L: Layout): Spots {
  return cached(`startup|spots|${L.W}x${L.H}|${L.spots.length}|${L.props.length}`, () => {
    const plan = planOf(L);
    const fp = floorPlan(L);
    const pick = (w: number, h: number, within: Rect | undefined, taken: Rect[]): Rect | null => {
      if (!within) return null;
      for (const r of fp.find(w, h, 12, within)) if (!taken.some((t) => r.x < t.x + t.w + 4 && t.x < r.x + r.w + 4 && r.y < t.y + t.h + 4 && t.y < r.y + r.h + 4)) return r;
      return null;
    };
    // Keep the floor clear where the demo-day rehearsal stands, and around the squeeze-ins' seats.
    const taken: Rect[] = rehearsalSpots(L).map((p) => ({ x: p.x - 10, y: p.y - 26, w: 20, h: 30 }));
    for (const n of plan?.nooks ?? []) taken.push({ x: n.x - 13, y: n.y - 26, w: 24, h: 28 });
    if (plan?.futon) taken.push(plan.futon);
    // Nor on the ways people cut across the floor.
    taken.push(...acrossFloorOf(L));
    const keep = (r: Rect | null) => {
      if (r) taken.push(r);
      return r;
    };
    const garage = plan?.garage?.r;
    const entry = plan?.cells.find((c) => c.kind === "entry")?.r;
    const kitchen = plan?.cells.find((c) => c.kind === "kitchen")?.r;
    const inset = (r: Rect | undefined, m: number): Rect | undefined => (r ? { x: r.x + m, y: r.y + m, w: r.w - m * 2, h: r.h - m * 2 } : undefined);
    const bench = keep(pick(40, 24, inset(garage, 4), taken));
    const surf = keep(pick(10, 36, inset(garage, 4), taken));
    const bk = keep(pick(26, 16, inset(garage, 4), taken));
    const fans: Rect[] = [];
    if (L.server) {
      const s = L.server;
      for (const r of fp.find(13, 14, 6, { x: s.x - 18, y: s.y - 18, w: s.w + 36, h: s.h + 20 })) {
        if (fans.length >= 2) break;
        const inCage = r.x < s.x + s.w + 2 && s.x - 2 < r.x + r.w && r.y < s.y + s.h && s.y - 10 < r.y + r.h;
        if (!inCage && !taken.some((t) => r.x < t.x + t.w && t.x < r.x + r.w && r.y < t.y + t.h && t.y < r.y + r.h)) fans.push(keep(r)!);
      }
    }
    // The entryway: a coat rack wherever it fits; the shoe bench, the packages and the scooter on the floor below the chairs.
    const seatsBottom = L.seats.reduce((m, s) => Math.max(m, s.y), 0);
    const below = entry && seatsBottom > 0 ? { x: entry.x + 4, y: seatsBottom + 4, w: entry.w - 8, h: entry.y + entry.h - seatsBottom - 8 } : undefined;
    const hack = below && below.h >= 60 ? keep(pick(64, 28, { ...below, y: below.y + 22, h: below.h - 22 }, taken)) : null;
    const bench2 = keep(pick(40, 16, below, taken));
    const shoes = bench2 ? null : keep(pick(26, 10, inset(entry, 4), taken));
    const coats = keep(pick(14, 36, inset(entry, 4), taken));
    const parcels = keep(pick(30, 20, below ?? inset(entry, 4), taken));
    const scoot = keep(pick(24, 10, below ?? inset(entry, 4), taken));
    const pizzas = keep(pick(18, 22, inset(kitchen, 2), taken));
    const bin2 = keep(pick(16, 18, inset(kitchen, 4), taken));
    const lc = { x: L.couch.x + L.couch.w / 2, y: L.couch.y };
    const living = plan?.cells.find((c) => c.kind === "living" && lc.x >= c.r.x && lc.x < c.r.x + c.r.w && lc.y >= c.r.y && lc.y < c.r.y + c.r.h)?.r;
    const area = living ? { x: L.lounge.x, y: L.couch.y + L.couch.h + 4, w: L.lounge.w, h: living.y + living.h - (L.couch.y + L.couch.h + 4) - 4 } : undefined;
    const wb = keep(pick(32, 38, area, taken));
    // The crash pad: an air mattress wherever the living room has floor left.
    const lv = plan?.cells.find((c) => c.kind === "living")?.r;
    const crash = keep(pick(30, 16, lv ? { x: lv.x + 4, y: lv.y + 40, w: lv.w - 8, h: lv.h - 44 } : undefined, taken));
    return { console: consoleOf(L), pyramid: pyramidAt(L), bench, bike: bk, surf, fans, board: wb, crash, recycling: bin2, hack, shoes, shoeBench: bench2, coats, packages: parcels, scooter: scoot, pizzas };
  });
}

// ------------------------------------------------------------------ underlay: water and cords

export function startupUnderlay(ctx: Ctx, L: Layout, info: PaintInfo): void {
  const plan = planOf(L);
  const pool = plan?.yard?.pool;
  if (pool) {
    // The water moves: light ripples drift across.
    const t = info.t;
    ctx.fillStyle = `rgba(255,255,255,${(0.22 - info.night * 0.1).toFixed(2)})`;
    for (let i = 0; i < Math.max(3, Math.round((pool.w * pool.h) / 260)); i++) {
      const sx = pool.x + 3 + (ih(i, 11) + t * (3 + (i % 3))) % (pool.w - 8);
      const sy = pool.y + 5 + (ih(i, 12) % Math.max(1, pool.h - 8));
      const len = 2 + (i % 3);
      ctx.fillRect(Math.round(sx), Math.round(sy + Math.sin(t * 1.3 + i) * 1.2), len, 1);
    }
    if (info.night > 0.3) {
      // The pool light underwater.
      const g = ctx.createRadialGradient(pool.x + pool.w / 2, pool.y + pool.h / 2, 0, pool.x + pool.w / 2, pool.y + pool.h / 2, pool.w / 2);
      g.addColorStop(0, `rgba(120,240,255,${(0.35 * info.night).toFixed(2)})`);
      g.addColorStop(1, "rgba(120,240,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(pool.x, pool.y, pool.w, pool.h);
    }
  }
  clickUnderlay(ctx, L, info);
}

// ------------------------------------------------------------------ decor

export function startupDecor(ctx: Ctx, L: Layout, info: PaintInfo): Drawable[] {
  const out: Drawable[] = [];
  const plan = planOf(L);
  const t = info.t;
  const yard = plan?.yard;
  if (yard) yardDecor(ctx, yard, info, out);
  const s = spotsOf(L);
  if (s.console) {
    const c = s.console;
    const img = consoleStand(c.w);
    out.push({ z: c.y + 9, draw: () => ctx.drawImage(img, c.x, c.y) });
  }
  if (s.pyramid && !pyramidDown(L, t)) {
    const p = s.pyramid;
    const img = pyramid();
    out.push({ z: p.z, draw: () => ctx.drawImage(img, p.x, p.y - 15) });
  }
  if (plan?.bunk) {
    const b = plan.bunk;
    const img = bunkBed();
    out.push({ z: b.y + b.h, draw: () => ctx.drawImage(img, b.x, b.y) });
  }
  const put = (r: Rect | null, img: () => HTMLCanvasElement, dz = 0) => {
    if (r) out.push({ z: r.y + r.h + dz, draw: () => ctx.drawImage(img(), r.x, r.y) });
  };
  put(s.bench, workbench);
  put(s.surf, surfboard);
  put(s.board, rollingBoard);
  put(s.crash, airMattress);
  put(s.recycling, recycling);
  put(s.hack, hackTable);
  put(s.bike, bike);
  put(s.shoes, shoePile);
  put(s.shoeBench, shoeBench);
  put(s.coats, coatRack);
  put(s.packages, packages);
  put(s.scooter, scooter);
  put(s.pizzas, pizzaTower);
  for (const f of s.fans) {
    out.push({
      z: f.y + f.h,
      draw: () => {
        ctx.drawImage(boxFan(), f.x, f.y);
        // The blades spin (a blur that flickers).
        if (Math.floor(t * 20) % 2) ctx.drawImage(fanBlades(), f.x + 2, f.y + 2);
      },
    });
  }
  nookDecor(ctx, L, info, out);
  out.push(...clickDecor(ctx, L, info));
  return out;
}

function yardDecor(ctx: Ctx, yard: NonNullable<StartupPlan["yard"]>, info: PaintInfo, out: Drawable[]): void {
  const t = info.t;
  const windy = info.weather === "storm" ? 2 : info.weather === "rain" ? 1 : 0;
  // The palms (the hammock hangs between the first two).
  yard.palms.forEach((p, i) => {
    out.push({
      z: p.y,
      draw: () => {
        ctx.drawImage(palmTrunk(), p.x - 4, p.y - 42);
        const sway = Math.round(Math.sin(t * 0.9 + i * 1.7) * (0.6 + windy));
        ctx.drawImage(palmCrown(i), p.x - 25 + sway, p.y - 54);
      },
    });
  });
  const hm = yard.hammock;
  if (hm) {
    // The cloth hangs from the trunks, sagging; its near edge goes in front of whoever's napping.
    const y0 = hm.y - 13;
    const swing = Math.sin(t * 1.2) * 0.8;
    const sagAt = (x: number) => {
      const k = (x - hm.x) / hm.w;
      return Math.round(y0 + Math.sin(k * Math.PI) * 9 + Math.sin(k * Math.PI) * swing);
    };
    out.push({
      z: hm.y - 0.2,
      draw: () => {
        for (let x = hm.x + 2; x < hm.x + hm.w - 1; x++) {
          const y = sagAt(x);
          const k = (x - hm.x) / hm.w;
          const edge = k < 0.12 || k > 0.88;
          if (edge) {
            fill(ctx, x, y, 1, 1, "#e8dcc0");
            continue;
          }
          fill(ctx, x, y - 3, 1, 5, OUTLINE);
          fill(ctx, x, y - 2, 1, 3, ((x - hm.x) >> 2) % 2 ? "#e86a3a" : "#f4e2b8");
        }
      },
    });
    out.push({
      z: hm.y + 0.7,
      draw: () => {
        for (let x = hm.x + 6; x < hm.x + hm.w - 5; x++) {
          const y = sagAt(x) + 2;
          fill(ctx, x, y, 1, 2, ((x - hm.x) >> 2) % 2 ? "#c4542a" : "#d8c49a");
          fill(ctx, x, y + 2, 1, 1, OUTLINE);
        }
      },
    });
  }
  for (const l of yard.loungers) out.push({ z: l.y - 0.3, draw: () => ctx.drawImage(lounger(), l.x - 7, l.y - 20) });
  if (yard.lemon) {
    const p = yard.lemon;
    out.push({ z: p.y, draw: () => ctx.drawImage(lemonTree(), p.x - 14, p.y - 33) });
  }
  if (yard.grill) {
    const g = yard.grill;
    out.push({
      z: g.y,
      draw: () => {
        ctx.drawImage(grillSprite(false), g.x - 10, g.y - 24);
      },
    });
  }
}

// ------------------------------------------------------------------ overlay: weather out back

export function startupOverlay(ctx: Ctx, L: Layout, info: PaintInfo): void {
  const plan = planOf(L);
  const out = outdoorRects(plan);
  const wx = info.weather;
  const t = info.t;
  if (out.length > 0 && (wx === "rain" || wx === "storm" || wx === "snow" || wx === "fog")) {
    for (const r of out) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(r.x, r.y, r.w, r.h);
      ctx.clip();
      if (wx === "fog") {
        ctx.fillStyle = "rgba(226,232,238,0.32)";
        ctx.fillRect(r.x, r.y, r.w, r.h);
        for (let i = 0; i < 4; i++) {
          const fx = r.x + ((t * (4 + i) + i * 97) % (r.w + 80)) - 40;
          ctx.fillStyle = "rgba(240,244,248,0.22)";
          ctx.fillRect(Math.round(fx), r.y + 10 + ((i * 37) % Math.max(1, r.h - 20)), 70, 10);
        }
      } else if (wx === "snow") {
        ctx.fillStyle = "rgba(240,246,255,0.22)";
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.fillStyle = "#ffffff";
        const n = Math.round((r.w * r.h) / 160);
        for (let i = 0; i < n; i++) {
          const sx = r.x + (ih(i, 13) + Math.sin(t * 0.8 + i) * 6) % r.w;
          const sy = r.y + (ih(i, 14) + t * (10 + (i % 5) * 3)) % r.h;
          ctx.fillRect(Math.round(sx), Math.round(sy), i % 4 === 0 ? 2 : 1, i % 4 === 0 ? 2 : 1);
        }
      } else {
        const heavy = wx === "storm";
        ctx.fillStyle = heavy ? "rgba(40,50,70,0.16)" : "rgba(60,70,90,0.1)";
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.fillStyle = "rgba(200,220,245,0.55)";
        const n = Math.round((r.w * r.h) / (heavy ? 90 : 150));
        for (let i = 0; i < n; i++) {
          const sx = r.x + (ih(i, 15) + t * (heavy ? 60 : 30)) % r.w;
          const sy = r.y + (ih(i, 16) + t * (heavy ? 260 : 190)) % r.h;
          if (heavy) {
            // Driven sideways by the wind.
            ctx.fillRect(Math.round(sx), Math.round(sy), 1, 2);
            ctx.fillRect(Math.round(sx) - 1, Math.round(sy) + 2, 1, 2);
          } else ctx.fillRect(Math.round(sx), Math.round(sy), 1, 3);
        }
        // Rings on the pool.
        const pool = plan?.yard?.pool;
        if (pool) {
          ctx.fillStyle = "rgba(230,245,255,0.6)";
          for (let i = 0; i < 6; i++) {
            const k = (t * 1.5 + i / 6) % 1;
            const px = pool.x + 4 + (ih(i, Math.floor(t * 1.5 + i / 6)) % Math.max(1, pool.w - 10));
            const py = pool.y + 4 + (ih(i + 50, Math.floor(t * 1.5 + i / 6)) % Math.max(1, pool.h - 8));
            const rr = Math.round(1 + k * 3);
            ctx.globalAlpha = 1 - k;
            ctx.fillRect(px - rr, py, rr * 2 + 1, 1);
            ctx.fillRect(px, py - Math.max(1, rr - 1), 1, 1);
          }
          ctx.globalAlpha = 1;
        }
      }
      ctx.restore();
    }
  }
  drawBistro(ctx, L, info);
  clickOverlay(ctx, L, info);
}

function outdoorRects(plan: StartupPlan | null): Rect[] {
  if (!plan?.yard) return [];
  const out: Rect[] = [plan.yard.r];
  if (plan.patio) out.push({ x: plan.patio.x0, y: plan.patio.y, w: plan.patio.x1 - plan.patio.x0, h: 20 });
  return out;
}

// ------------------------------------------------------------------ lights

function staticLights(L: Layout): Light[] {
  return cached(`startup|lights|${L.W}x${L.H}|${L.props.length}`, () => {
    const out: Light[] = [];
    const plan = planOf(L);
    // Hallway ceiling lights (indoors).
    const yd = plan?.yard?.r;
    const indoors = (x: number, y: number) => !yd || x < yd.x || x > yd.x + yd.w || y < yd.y - 22;
    for (const hy of L.net.halls) for (let x = 60; x < L.W; x += 150) if (indoors(x, hy)) out.push([x, hy, 40, 0.4, "#ffe9c0", 0.06]);
    // The kitchen's pendant over the table, the drinks fridge, the water jug.
    for (const p of L.props) {
      if (p.kind === "kitchen-island") out.push([p.x + 30, p.y + 6, 44, 0.6, "#ffdca0", 0.12]);
      if (p.kind === "vending") out.push([p.x + 10, p.y + 20, 22, 0.7, "#9af0ff", 0.18]);
      if (p.kind === "cooler") out.push([p.x + 8, p.y + 22, 8, 0.5, "#7ab8ff", 0.14]);
    }
    // The street lamp out front.
    if ((plan?.lot.front ?? 0) > 0) out.push([Math.round(L.W * 0.3) + 1, 6, 34, 0.7, "#ffe2a0", 0.2]);
    // The garage's fluorescent tube.
    const g = plan?.garage?.r;
    if (g) out.push([g.x + g.w / 2, g.y + 20, 60, 0.5, "#e8f4ff", 0.08]);
    // The pool light, the patio's bistro bulbs.
    const pool = plan?.yard?.pool;
    if (pool) out.push([pool.x + pool.w / 2, pool.y + pool.h / 2, Math.max(40, pool.w * 0.6), 0.85, "#7af0ff", 0.22]);
    for (const b of bistroBulbs(L)) out.push([b.x, b.y + 2, 14, 0.55, "#ffcf7a", 0.25]);
    // The bunk bed's fairy lights.
    const bk = plan?.bunk;
    if (bk) out.push([bk.x + bk.w / 2, bk.y + 6, 20, 0.6, "#ffb0e0", 0.18]);
    return out;
  });
}

/** Bistro lights strung along the back of the house over the patio. */
function bistroBulbs(L: Layout): Point[] {
  return cached(`startup|bistro|${L.W}x${L.H}`, () => {
    const p = planOf(L)?.patio;
    if (!p) return [];
    const out: Point[] = [];
    for (let x = p.x0 + 8; x < p.x1 - 6; x += 14) out.push({ x, y: p.y + 2 + Math.round(Math.sin(((x - p.x0) % 42) / 42 * Math.PI) * 3) });
    return out;
  });
}

export function startupLights(L: Layout, info: PaintInfo): Light[] {
  const out = staticLights(L);
  const extra = [...clickLights(L, info), ...nookLights(L, info)];
  return extra.length > 0 ? [...out, ...extra] : out;
}

/** The bistro string itself, drawn after the darkness so the bulbs shine. */
function drawBistro(ctx: Ctx, L: Layout, info: PaintInfo): void {
  const bulbs = bistroBulbs(L);
  if (bulbs.length === 0) return;
  const on = info.night > 0.3;
  ctx.fillStyle = "#3a3440";
  for (let i = 0; i + 1 < bulbs.length; i++) {
    const a = bulbs[i]!;
    const b = bulbs[i + 1]!;
    for (let x = a.x; x < b.x; x++) {
      const k = (x - a.x) / (b.x - a.x);
      ctx.fillRect(x, Math.round(a.y + (b.y - a.y) * k + Math.sin(k * Math.PI) * 2) - 1, 1, 1);
    }
  }
  for (const b of bulbs) {
    ctx.fillStyle = on ? "#fff0b8" : "#e8e0c8";
    ctx.fillRect(b.x, b.y, 2, 2);
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(b.x, b.y - 1, 2, 1);
  }
}

