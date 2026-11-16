// Spaceship: the crew stations. Each desk is a console with a work surface
// set into a molded shell, a lit edge along the front and two pedestals;
// the model picks the finish (pale shell with a cyan edge, the command
// console in navy and amber, glossy white, graphite and violet, cream and
// teal). Swivel chairs with headrests in the provider's color, console
// monitors on arms, a hologram panel here and there, data slates, and an old
// terminal nobody has dared to replace.
import type { Theme } from "../../theme.ts";
import type { ChairTone, Screen } from "../../desks.ts";
import type { DeskStyle } from "../../model.ts";
import { Grid, OUTLINE, cached, makeCanvas, mix, shade } from "../../themekit.ts";
import { P } from "./pal.ts";

/** Build a sprite once: draw on a grid, outline it (glass and glow pixels stay unoutlined). */
function sprite(key: string, w: number, h: number, draw: (g: Grid) => void, skip: string[] = []): HTMLCanvasElement {
  return cached(`spaceship|${key}`, () => {
    const g = new Grid(w, h);
    draw(g);
    g.outline(OUTLINE, { skip });
    return g.toCanvas();
  });
}

// ------------------------------------------------------------------ consoles

interface Finish {
  shell: string;
  hi: string;
  lo: string;
  top: string;
  /** The lit strip along the front edge (and the monitors' status lights). */
  glow: string;
}

const FINISH: Record<DeskStyle, Finish> = {
  default: { shell: P.panel, hi: P.panelHi, lo: P.panelLo, top: "#5a6376", glow: P.cyan },
  sonnet: { shell: P.panel, hi: P.panelHi, lo: P.panelLo, top: "#5a6376", glow: P.orangeHi },
  opus: { shell: P.navy, hi: P.navyHi, lo: P.navyLo, top: "#222a45", glow: P.amber },
  haiku: { shell: P.white, hi: "#ffffff", lo: "#c3cad6", top: "#dfe5ee", glow: P.mint },
  gpt: { shell: "#2e313b", hi: "#454955", lo: "#1d1f27", top: "#1c1f27", glow: P.violet },
  gemini: { shell: "#e4d9c1", hi: "#f6efe0", lo: "#bfb091", top: "#5e5747", glow: P.tealHi },
};

/** A crew console, 48×32 like the classic desk: the surface at rows 11–25, pedestals below. */
export function shipDesk(style: DeskStyle): HTMLCanvasElement {
  const f = FINISH[style] ?? FINISH.default;
  return sprite(`desk-${style}`, 48, 32, (g) => {
    // The molded shell with a work surface set into it.
    g.rrect(2, 11, 44, 16, f.lo, 2);
    g.rrect(2, 11, 44, 15, f.shell, 2);
    g.hline(4, 11, 40, f.hi);
    g.vline(2, 13, 10, f.hi);
    g.rect(4, 13, 40, 8, f.top);
    // Lit from the top left: the inset's top and left edges in shadow, its lip catching the light.
    g.hline(4, 13, 40, shade(f.top, -0.25));
    g.vline(4, 14, 7, shade(f.top, -0.15));
    g.hline(5, 20, 39, shade(f.top, 0.14));
    // A faint touch grid on the surface.
    for (let x = 9; x < 44; x += 6) for (let y = 15; y < 20; y += 3) g.set(x, y, shade(f.top, 0.08));
    // Left: a button pad; right: a dial.
    g.rect(6, 15, 7, 4, "#141b2a");
    g.set(7, 16, P.cyan).set(9, 16, P.amber).set(11, 16, P.mint);
    g.hline(7, 18, 5, mix(f.glow, "#141b2a", 0.55)).set(9, 18, f.glow);
    g.rect(37, 15, 5, 4, "#141b2a");
    g.set(39, 15, f.glow).set(38, 17, shade("#141b2a", 0.3)).set(40, 17, shade("#141b2a", 0.3));
    // The front lip with its lit strip.
    g.hline(3, 22, 42, f.shell);
    g.hline(4, 23, 40, mix(f.glow, f.shell, 0.55));
    g.hline(4, 24, 40, f.glow);
    for (let x = 6; x < 44; x += 6) g.set(x, 24, mix(f.glow, "#ffffff", 0.5));
    g.hline(3, 25, 42, f.lo);
    // The fascia under the lip, vented.
    g.rect(4, 26, 40, 2, P.steelDk);
    for (let x = 6; x < 42; x += 3) g.set(x, 27, P.steelDeep);
    // Two pedestals on the deck.
    for (const px of [5, 37]) {
      g.rect(px, 28, 6, 3, P.steel);
      g.vline(px, 28, 3, shade(P.steel, 0.2));
      g.hline(px - 1, 31, 8, P.steelDeep);
    }
  });
}

// ------------------------------------------------------------------ chairs

/** Seat colors by provider: [cushion, highlight, shadow]. */
const SEAT: Record<ChairTone, [string, string, string]> = {
  green: ["#4f9a5a", "#78c27f", "#356b3e"],
  claude: ["#d9774a", "#f29e74", "#9e4f2c"],
  copilot: ["#7a5fd0", "#a48ef0", "#4f3a96"],
  bedrock: ["#33445c", "#f29b38", "#1f2a3a"],
  codex: ["#3a3d48", "#5c606e", "#24262e"],
  blue: ["#3e7cc4", "#7fb3e6", "#26507f"],
};

/** A swivel crew chair: north chairs face you (headrest, back cushion, seat), south ones show their shell. */
export function shipChair(tone: ChairTone, side: "north" | "south"): HTMLCanvasElement {
  const [c, hi, lo] = SEAT[tone] ?? SEAT.green;
  return sprite(`chair-${tone}-${side}`, 16, 16, (g) => {
    if (side === "north") {
      // Headrest above the back cushion.
      g.rrect(5, 0, 6, 3, P.panel, 1);
      g.hline(6, 1, 4, hi);
      g.rect(4, 3, 8, 1, P.panelLo);
      // The back: a cushion in a pale shell.
      g.rrect(3, 3, 10, 6, P.panel, 2);
      g.rrect(4, 4, 8, 5, c, 1);
      g.hline(5, 4, 6, hi);
      g.vline(7, 5, 3, lo).vline(8, 5, 3, lo);
      // Armrests and the seat.
      g.rect(1, 7, 2, 4, P.panelMid).hline(1, 7, 2, P.steelDk);
      g.rect(13, 7, 2, 4, P.panelMid).hline(13, 7, 2, P.steelDk);
      g.rrect(3, 9, 10, 3, hi, 1);
      g.hline(3, 11, 10, c);
      // Swivel column and a star base on casters.
      g.rect(7, 12, 2, 2, P.steel);
      g.hline(3, 14, 10, P.steelDk);
      g.set(3, 15, P.steelDeep).set(7, 15, P.steelDeep).set(8, 15, P.steelDeep).set(12, 15, P.steelDeep);
    } else {
      // Seen from behind: the shell of the back with a cushion band (low, so the head shows above it).
      g.rrect(3, 4, 10, 8, P.panel, 2);
      g.hline(5, 4, 6, P.panelHi);
      g.vline(3, 6, 4, P.panelHi);
      g.rect(5, 6, 6, 3, c);
      g.hline(5, 6, 6, hi);
      g.hline(4, 10, 8, P.panelLo);
      g.set(7, 11, P.steelDk).set(8, 11, P.steelDk);
      // The seat's edges peek out on both sides.
      g.rect(2, 9, 1, 3, lo).rect(13, 9, 1, 3, lo);
      g.rect(7, 12, 2, 2, P.steel);
      g.hline(3, 14, 10, P.steelDk);
      g.set(3, 15, P.steelDeep).set(7, 15, P.steelDeep).set(8, 15, P.steelDeep).set(12, 15, P.steelDeep);
    }
  });
}

// ------------------------------------------------------------------ monitors

const GLASS = "#0f1828";
const GLASS_HI = "#1d2a40";
/** Hologram pixels stay translucent and unoutlined. */
const HOLO = "#7fe3ff40";
const HOLO_EDGE = "#7fe3ffc0";
const HOLO_BEAM = "#7fe3ff26";
const NO_OUTLINE = [HOLO, HOLO_EDGE, HOLO_BEAM];

type Kind = "steel" | "white" | "dark" | "big" | "holo";

const BEZEL: Record<Exclude<Kind, "holo">, { bezel: string; edge: string; back: string }> = {
  steel: { bezel: P.panelMid, edge: P.panel, back: P.panelLo },
  white: { bezel: P.white, edge: "#ffffff", back: P.whiteLo },
  dark: { bezel: "#2a2e38", edge: "#40444f", back: "#353946" },
  big: { bezel: "#23262f", edge: "#3a3e49", back: "#2e323c" },
};

/** Dark screen glass with a soft reflection in the top-left corner. */
function glass(g: Grid, x: number, y: number, w: number, h: number): void {
  g.rect(x, y, w, h, GLASS);
  g.hline(x, y, Math.min(4, w), GLASS_HI).set(x, y + 1, GLASS_HI);
}

/** The touch deck where a keyboard would be: dark glass with lit keys and a pad beside it. */
function touchDeck(g: Grid, x: number, y: number, glow: string, keys = 11): void {
  g.rect(x, y, keys, 4, "#1a2233");
  g.hline(x, y, keys, "#2b3550");
  for (let i = 0; i < Math.floor(keys / 2); i++) g.set(x + 1 + i * 2, y + 1, mix(glow, "#1a2233", 0.45)).set(x + 2 + i * 2, y + 2, mix(glow, "#1a2233", 0.6));
  g.rect(x + keys + 2, y + 1, 3, 3, P.panelMid).set(x + keys + 3, y + 2, glow);
}

/** A console monitor facing us on an arm (16 or 22 wide); screen glass at (2, 2). */
function monitorFront(g: Grid, ox: number, kind: Kind, glow: string): void {
  if (kind === "holo") {
    // A projector puck on the desk and a floating pane of light.
    g.rect(ox + 1, 1, 14, 11, HOLO);
    g.hline(ox + 1, 1, 3, HOLO_EDGE).vline(ox + 1, 2, 2, HOLO_EDGE).hline(ox + 12, 11, 3, HOLO_EDGE).vline(ox + 14, 9, 2, HOLO_EDGE);
    g.hline(ox + 12, 1, 3, HOLO_EDGE).hline(ox + 1, 11, 3, HOLO_EDGE);
    for (let y = 12; y < 15; y++) g.hline(ox + 5 - (14 - y), y, 6 + 2 * (14 - y), HOLO_BEAM);
    g.rrect(ox + 4, 15, 8, 2, P.panelMid, 1);
    g.hline(ox + 5, 15, 6, glow);
    return;
  }
  const big = kind === "big";
  const w = big ? 22 : 16;
  const sh = big ? 11 : 9;
  const c = BEZEL[kind];
  g.rect(ox + 1, 1, w - 2, sh + 2, c.bezel);
  g.hline(ox + 1, 1, w - 2, c.edge);
  glass(g, ox + 2, 2, w - 4, sh);
  // A status light in the bottom bezel.
  g.set(ox + w - 4, sh + 2, glow);
  // The arm: a neck and a foot plate.
  const mid = ox + Math.floor(w / 2);
  g.rect(mid - 1, sh + 3, 2, 2, P.steel);
  g.rect(mid - 4, sh + 5, 8, 1, P.steelDk);
}

/** The back of a console monitor (the person sits facing us). */
function monitorBack(g: Grid, ox: number, kind: Kind, glow: string): void {
  if (kind === "holo") {
    // The pane from behind: a ghost of light over the puck.
    g.rect(ox + 1, 8, 14, 9, HOLO);
    g.hline(ox + 1, 8, 14, HOLO_EDGE);
    for (let y = 17; y < 19; y++) g.hline(ox + 5, y, 6, HOLO_BEAM);
    g.rrect(ox + 4, 19, 8, 2, P.panelMid, 1);
    g.hline(ox + 5, 19, 6, glow);
    return;
  }
  const big = kind === "big";
  const w = big ? 22 : 16;
  const top = big ? 7 : 8;
  const h = big ? 11 : 9;
  const c = BEZEL[kind];
  g.rect(ox + 1, top, w - 2, h, c.back);
  g.hline(ox + 1, top, w - 2, c.edge);
  // A vent grille and the status light on top.
  for (let y = top + 3; y < top + h - 2; y += 2) g.hline(ox + 4, y, w - 8, shade(c.back, -0.2));
  g.set(ox + w - 4, top + 1, glow);
  const mid = ox + Math.floor(w / 2);
  g.rect(mid - 1, top + h, 2, 3, P.steel);
  g.rect(mid - 4, top + h + 3, 8, 1, P.steelDk);
}

/** The old terminal: a boxy casing, a deep little screen and a chunky keyboard (the classic CRT's screen rect). */
function terminalFront(g: Grid): void {
  g.rrect(1, 2, 14, 13, "#c9c2ae", 1);
  g.hline(2, 2, 12, "#e2dcc8");
  g.rect(2, 4, 12, 7, "#8e8774");
  glass(g, 3, 5, 10, 5);
  g.set(12, 12, P.amber).hline(3, 12, 4, "#a8a08c");
  g.rect(3, 15, 10, 2, "#a8a08c");
  g.rect(0, 18, 14, 4, "#c9c2ae");
  for (let i = 0; i < 6; i++) g.set(1 + i * 2, 19, "#8e8774").set(2 + i * 2, 20, "#8e8774");
}

function terminalBack(g: Grid): void {
  g.rrect(2, 6, 12, 12, "#bdb6a2", 2);
  g.hline(3, 6, 10, "#d8d2be");
  for (let y = 9; y < 16; y += 2) g.hline(4, y, 8, "#9d967f");
  g.set(11, 7, P.amber);
  g.rect(4, 18, 8, 2, "#a8a08c");
}

const KINDS: Kind[] = ["steel", "white", "dark", "big", "holo", "steel"];

/** The monitors on a crew console, by model style and seat side (keeps the classic screen geometry). */
export function shipScreen(style: DeskStyle, side: "north" | "south", variant: number, vision: boolean): Screen {
  const front = side === "south";
  const glow = (FINISH[style] ?? FINISH.default).glow;
  const key = `screen|${style}|${side}`;
  if (vision) {
    // Wearing a headset: only the touch deck, nothing on the desk when seen from behind.
    return front
      ? { canvas: sprite(`${key}|vision`, 16, 32, (g) => touchDeck(g, 0, 18, glow)), dx: 0, dy: 0, screens: [] }
      : { canvas: cached("spaceship|screen-none", () => makeCanvas(1, 1, () => undefined)), dx: 0, dy: 0, screens: [] };
  }
  switch (style) {
    case "opus":
      // The command console: twin monitors in navy over a wide deck.
      return front
        ? {
            canvas: sprite(
              key,
              32,
              32,
              (g) => {
                monitorFront(g, 0, "dark", glow);
                monitorFront(g, 16, "dark", glow);
                g.rect(11, 14, 10, 1, P.steelDk);
                touchDeck(g, 4, 18, glow, 19);
              },
              NO_OUTLINE,
            ),
            dx: -8,
            dy: 0,
            screens: [
              { x: 2, y: 2, w: 12, h: 9 },
              { x: 18, y: 2, w: 12, h: 9 },
            ],
          }
        : {
            canvas: sprite(key, 32, 32, (g) => {
              monitorBack(g, 0, "dark", glow);
              monitorBack(g, 16, "dark", glow);
            }),
            dx: -8,
            dy: 0,
            screens: [],
          };
    case "haiku":
      // A data slate on its kickstand, a stylus beside it.
      return front
        ? {
            canvas: sprite(key, 18, 14, (g) => {
              g.rrect(2, 1, 14, 9, P.white, 1);
              g.hline(3, 1, 12, "#ffffff");
              glass(g, 4, 3, 10, 5);
              g.set(9, 9, glow);
              g.rect(5, 10, 8, 2, P.panelMid);
              g.vline(16, 6, 6, P.steelDk).set(16, 5, glow);
            }),
            dx: -1,
            dy: 12,
            screens: [{ x: 4, y: 3, w: 10, h: 5 }],
          }
        : {
            canvas: sprite(key, 18, 12, (g) => {
              // The slate's back, leaning on its kickstand.
              g.rrect(2, 3, 14, 6, P.whiteLo, 1);
              g.hline(3, 3, 12, P.white);
              g.hline(3, 8, 12, P.panelMid);
              g.set(13, 4, glow);
              g.vline(9, 9, 2, P.steelDk);
              g.hline(7, 10, 5, P.steel);
            }),
            dx: -1,
            dy: 12,
            screens: [],
          };
    case "gpt":
      // A wide curved screen on a center stand.
      return front
        ? {
            canvas: sprite(key, 32, 22, (g) => {
              g.rect(3, 1, 26, 10, "#22252e");
              g.rect(1, 2, 30, 8, "#22252e");
              g.hline(3, 1, 26, "#3a3e49");
              g.set(2, 2, "#3a3e49");
              glass(g, 3, 3, 26, 7);
              g.set(28, 10, glow);
              g.rect(14, 11, 4, 2, P.steel);
              g.rect(10, 13, 12, 1, P.steelDk);
              touchDeck(g, 7, 16, glow, 15);
            }),
            dx: -8,
            dy: 4,
            screens: [{ x: 4, y: 4, w: 24, h: 5 }],
          }
        : {
            canvas: sprite(key, 32, 16, (g) => {
              g.rect(3, 1, 26, 10, "#2e323c");
              g.rect(1, 2, 30, 8, "#2e323c");
              g.hline(3, 1, 26, "#454a56");
              for (let x = 6; x < 27; x += 3) g.vline(x, 4, 4, "#23262e");
              g.set(26, 2, glow);
              g.rect(14, 11, 4, 3, P.steel);
            }),
            dx: -2,
            dy: 8,
            screens: [],
          };
    default: {
      if (variant % 9 === 4) {
        return front
          ? { canvas: sprite("screen|terminal-front", 16, 32, terminalFront), dx: 0, dy: 0, screens: [{ x: 3, y: 5, w: 10, h: 5 }] }
          : { canvas: sprite("screen|terminal-back", 16, 32, terminalBack), dx: 0, dy: 0, screens: [] };
      }
      const kind = KINDS[variant % KINDS.length]!;
      const big = kind === "big";
      const w = big ? 22 : 16;
      return front
        ? {
            canvas: sprite(
              `${key}|${kind}`,
              w,
              32,
              (g) => {
                monitorFront(g, 0, kind, glow);
                touchDeck(g, big ? 3 : 0, 18, glow);
              },
              NO_OUTLINE,
            ),
            dx: big ? -3 : 0,
            dy: 0,
            screens: [{ x: 2, y: 2, w: big ? 18 : 12, h: big ? 11 : 9 }],
          }
        : { canvas: sprite(`${key}|${kind}`, w, 32, (g) => monitorBack(g, 0, kind, glow), NO_OUTLINE), dx: big ? -3 : 0, dy: 0, screens: [] };
    }
  }
}

export const DESKS: Pick<Theme, "desk" | "chair" | "screen" | "screenColors"> = {
  desk: (style) => shipDesk(style),
  chair: (tone, side) => shipChair(tone, side),
  screen: (style, side, variant, vision) => shipScreen(style, side, variant, vision),
  // Busy screens: deep navy with cyan, mint, amber and violet readouts.
  screenColors: { bg: "#0c1424", code: [P.cyan, P.mint, P.amber, P.violet, "#62d8d0", "#c9d6ea"] },
};
