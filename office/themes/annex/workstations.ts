// Dusty Annex: workstations. Battered desks in the model's finish, chairs
// faded but still in the provider's colour, and beige CRTs (the odd
// chunky laptop or green-screen terminal) glowing amber.

import type { Theme } from "../../theme.ts";
import type { ChairTone, Screen } from "../../desks.ts";
import type { DeskStyle } from "../../model.ts";
import { Grid, OUTLINE, adjust, cached, grime, hash, paRecolor, rng, shade } from "../../themekit.ts";
import { P, mug, ring } from "./pal.ts";

const FINISH: Record<DeskStyle, { top: string; hi: string; edge: string; front: string; leg: string }> = {
  default: { top: "#8a7454", hi: "#a08a66", edge: "#6a5438", front: "#3e3024", leg: P.metalLo },
  sonnet: { top: "#8a7454", hi: "#a08a66", edge: "#6a5438", front: "#3e3024", leg: P.metalLo },
  opus: { top: "#5a4030", hi: "#74563e", edge: "#3e2c20", front: "#2a1e16", leg: "#3a2a1e" },
  haiku: { top: "#8c8e86", hi: "#a9aba2", edge: "#6d6f68", front: "#4f514c", leg: P.metalDk },
  gpt: { top: "#3e3c38", hi: "#56534c", edge: "#2a2824", front: "#1a1916", leg: P.metalDk },
  gemini: { top: "#b8ac88", hi: "#cbbf9a", edge: "#968a68", front: "#6e6448", leg: P.metalLo },
};

function desk(style: DeskStyle): HTMLCanvasElement {
  return cached(`annex|desk|${style}`, () => {
    const f = FINISH[style];
    const g = new Grid(48, 32);
    const r = rng(hash(`annex-desk-${style}`));
    g.rect(2, 11, 44, 15, f.edge);
    g.rect(3, 12, 42, 12, f.top);
    g.rect(3, 12, 42, 1, f.hi);
    g.rect(3, 24, 42, 1, f.edge);
    g.rect(2, 26, 44, 1, f.front);
    // Scratches, a chipped corner, rings and a burn of old tea.
    for (let k = 0; k < 5; k++) {
      const x = 5 + Math.floor(r() * 34);
      const y = 14 + Math.floor(r() * 9);
      g.rect(x, y, 2 + Math.floor(r() * 5), 1, shade(f.top, k % 2 ? 0.1 : -0.12));
    }
    g.rect(43, 22, 2, 3, "#b8a27a").set(42, 24, "#b8a27a");
    ring(g, 23, 21, shade(f.top, -0.25));
    ring(g, 9, 15, shade(f.top, -0.2));
    // A sticky note gone curly and a biro.
    g.rect(28, 20, 3, 3, "#e2d27a").set(30, 22, "#c9b85c");
    g.rect(34, 18, 4, 1, "#3e5a7a").set(38, 18, "#1a1814");
    // Metal legs, one wedged with folded card.
    g.rect(3, 27, 4, 4, f.leg).rect(4, 27, 1, 4, shade(f.leg, 0.15));
    g.rect(41, 27, 4, 4, f.leg).rect(42, 27, 1, 3, shade(f.leg, 0.15));
    g.rect(41, 31, 4, 1, P.paper);
    g.outline(OUTLINE);
    return g.toCanvas();
  });
}

function chair(tone: ChairTone, side: "north" | "south", classic: () => HTMLCanvasElement): HTMLCanvasElement {
  return cached(`annex|chair|${tone}|${side}`, () => {
    const c = grime(adjust(classic(), { sat: 0.62, light: -0.05, contrast: 0.95 }), hash(`${tone}${side}`), 0.08);
    const ctx = c.getContext("2d")!;
    if (side === "north") {
      // A split in the seat, foam showing; a strip of tape.
      ctx.fillStyle = P.foam;
      ctx.fillRect(9, 8, 2, 1);
      ctx.fillRect(10, 9, 1, 1);
      ctx.fillStyle = P.tape;
      ctx.fillRect(4, 2, 3, 1);
    } else {
      ctx.fillStyle = P.tape;
      ctx.fillRect(5, 6, 3, 2);
    }
    return c;
  });
}

// ------------------------------------------------------------------ screens

/** A beige CRT, seen from the front (the screen faces us). */
function crtFront(g: Grid, ox: number, seed: number): void {
  const r = rng(seed);
  const yellow = r() < 0.5 ? 0 : 0.04;
  const b = shade(P.beige, -yellow);
  // The deep body behind the bezel, seen from above.
  g.rect(ox + 3, 1, 10, 1, shade(b, 0.08));
  g.rect(ox + 2, 2, 12, 1, P.beigeHi);
  // Bezel and screen.
  g.rect(ox + 1, 3, 14, 12, b);
  g.rect(ox + 1, 3, 14, 1, P.beigeHi);
  g.rect(ox + 2, 4, 12, 9, P.beigeLo);
  g.rect(ox + 3, 4, 10, 8, P.crt);
  g.rect(ox + 1, 14, 14, 1, P.beigeLo);
  g.set(ox + 12, 13, "#6a8a4a").set(ox + 10, 13, P.beigeDk);
  // A sticky note on the bezel, more often than not.
  if (r() < 0.6) g.rect(ox + 1, 5, 2, 2, "#e2d27a");
  // Swivel foot.
  g.rect(ox + 5, 15, 6, 2, P.beigeLo);
  g.rect(ox + 4, 16, 8, 1, P.beigeDk);
}

/** A yellowed keyboard and a ball mouse. */
function keyboard(g: Grid, x: number, y: number): void {
  g.rect(x, y, 12, 4, P.beige);
  g.rect(x, y, 12, 1, P.beigeHi);
  for (let i = 0; i < 5; i++) g.set(x + 1 + i * 2, y + 1, P.beigeDk).set(x + 2 + i * 2, y + 2, P.beigeDk);
  g.rect(x + 13, y + 1, 3, 3, P.beige).set(x + 14, y + 1, P.beigeDk);
}

/** A beige CRT from behind (the old Pixel Agents CRT, yellowed). */
function crtBack(g: Grid, ox: number): void {
  const src = paRecolor("PC_BACK", { "#757b7c": P.beigeDk, "#e1e3e9": P.beigeHi, "#3f3740": "#4a4234", "#b5bfc7": P.beige, "#ffffff": "#e6dcc0" });
  const d = src.getContext("2d")!.getImageData(0, 0, src.width, src.height).data;
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const i = (y * src.width + x) * 4;
      if (d[i + 3] === 0) continue;
      const hex = `#${[d[i], d[i + 1], d[i + 2]].map((v) => v!.toString(16).padStart(2, "0")).join("")}`;
      g.set(ox + x, y, hex);
    }
  }
}

function screen(style: DeskStyle, side: "north" | "south", variant: number, vision: boolean, classic: () => Screen): Screen | null {
  void classic;
  if (vision) return null;
  const front = side === "south";
  switch (style) {
    case "opus":
      return cached(`annex|scr|opus|${side}`, () => {
        const g = new Grid(32, 32);
        if (front) {
          crtFront(g, 0, 3);
          crtFront(g, 16, 8);
          keyboard(g, 8, 19);
        } else {
          crtBack(g, 0);
          crtBack(g, 16);
        }
        g.outline(OUTLINE);
        return {
          canvas: g.toCanvas(),
          dx: -8,
          dy: 0,
          screens: front
            ? [
                { x: 3, y: 4, w: 10, h: 8 },
                { x: 19, y: 4, w: 10, h: 8 },
              ]
            : [],
        };
      });
    case "haiku":
      // A heavy old laptop, its lid held on with tape.
      return cached(`annex|scr|haiku|${side}`, () => {
        if (front) {
          const g = new Grid(18, 14);
          g.rect(2, 1, 14, 9, "#3a3a36");
          g.rect(3, 2, 12, 7, "#24241f");
          g.rect(4, 3, 10, 5, P.crt);
          g.rect(1, 10, 16, 3, "#4a4a44");
          for (let i = 0; i < 6; i++) g.set(3 + i * 2, 11, "#2f2f2a");
          g.rect(2, 9, 2, 2, P.tape);
          g.outline(OUTLINE);
          return { canvas: g.toCanvas(), dx: -1, dy: 12, screens: [{ x: 4, y: 3, w: 10, h: 5 }] };
        }
        const g = new Grid(18, 12);
        g.rect(2, 1, 14, 9, "#3a3a36");
        g.rect(3, 2, 12, 7, "#44443e");
        g.rect(5, 4, 4, 3, "#a8a290").rect(11, 6, 3, 2, P.tape);
        g.outline(OUTLINE);
        return { canvas: g.toCanvas(), dx: -1, dy: 12, screens: [] };
      });
    case "gpt":
      // A wide green-screen terminal from another decade.
      return cached(`annex|scr|gpt|${side}`, () => {
        if (front) {
          const g = new Grid(32, 22);
          g.rect(2, 0, 28, 2, P.beigeHi);
          g.rect(1, 1, 30, 11, P.beige);
          g.rect(1, 1, 30, 1, P.beigeHi);
          g.rect(3, 3, 26, 7, P.beigeLo);
          g.rect(4, 4, 24, 5, P.crt);
          g.set(28, 10, "#6a8a4a");
          g.rect(13, 12, 6, 3, P.beigeLo);
          keyboard(g, 9, 16);
          g.outline(OUTLINE);
          return { canvas: g.toCanvas(), dx: -8, dy: 4, screens: [{ x: 4, y: 4, w: 24, h: 5 }] };
        }
        const g = new Grid(32, 16);
        g.rect(1, 1, 30, 4, P.beigeLo);
        g.rect(1, 1, 30, 1, P.beige);
        g.rect(3, 5, 26, 6, P.beige);
        g.rect(3, 5, 26, 1, P.beigeHi);
        for (let i = 0; i < 8; i++) g.rect(6 + i * 3, 8, 1, 2, P.beigeDk);
        g.rect(14, 11, 4, 3, "#3a3630");
        g.outline(OUTLINE);
        return { canvas: g.toCanvas(), dx: -2, dy: 8, screens: [] };
      });
    default: {
      // Beige CRTs everywhere; one desk in nine still has a mug parked on top.
      const mugOn = variant % 9 === 4;
      return cached(`annex|scr|crt|${side}|${variant % 3}|${mugOn}`, () => {
        if (front) {
          const g = new Grid(16, 32);
          crtFront(g, 0, variant % 3);
          if (mugOn) mug(g, 10, 0, "#7a8a6a");
          keyboard(g, 0, 18);
          g.outline(OUTLINE);
          return { canvas: g.toCanvas(), dx: 0, dy: 0, screens: [{ x: 3, y: 4, w: 10, h: 8 }] };
        }
        const g = new Grid(16, 32);
        crtBack(g, 0);
        if (mugOn) mug(g, 6, 3, "#7a8a6a");
        g.outline(OUTLINE);
        return { canvas: g.toCanvas(), dx: 0, dy: 0, screens: [] };
      });
    }
  }
}

export const DESKS: Pick<Theme, "desk" | "chair" | "screen" | "screenColors" | "boardInk"> = {
  desk: (style) => desk(style),
  chair: (tone, side, classic) => chair(tone, side, classic),
  screen,
  // Amber on black, the odd line of green.
  screenColors: { bg: "#100d06", code: ["#ffb000", "#e09a10", "#ffcc55", "#b87a10", "#ffb000", "#7fe07f"] },
  // Whiteboard markers, all of them running dry.
  boardInk: ["#3e5a8a", "#8a3a34", "#3e6a4a", "#3a3632"],
};
