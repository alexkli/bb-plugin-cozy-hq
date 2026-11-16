// Neon City people: vivid tech jackets in the project's color, dark cargo
// pants, neon accents; now and then a visor, a hair streak, an LED trim or a
// blinking earpiece. Visitors get their megacity outfits.
import type { CharPose } from "../../characters.ts";
import type { Facing } from "../../layout.ts";
import type { VisitorKind } from "../../theme.ts";
import { hash, hsl, type Look } from "../../themekit.ts";
import { hslOf, P } from "./kit.ts";

const PANTS = ["#1c1830", "#221a38", "#141a2c", "#2a1a2e", "#1a2230"];
const ACCENTS = [P.cyan, P.mag, P.lime, P.yel, P.vio];
const NEON_HAIR: Record<string, string> = { "#8a5fd6": "#b56bff", "#3f8ad8": "#2ed8ff", "#e57aa8": "#ff4fb8", "#f2f2f2": "#eaf2ff" };

export function neonLook(l: Look, threadId: string): Look {
  const [h] = hslOf(l.shirt);
  const r = hash(`neon-${threadId}`);
  return {
    ...l,
    shirt: hsl(Math.round(h), 80, 54),
    pants: PANTS[r % PANTS.length]!,
    accent: ACCENTS[(r >>> 4) % ACCENTS.length]!,
    hair: NEON_HAIR[l.hair] ?? l.hair,
  };
}

export function neonNpc(kind: VisitorKind, l: Look): Look {
  switch (kind) {
    case "boss":
      // A long dark coat, a magenta tie.
      return { ...l, shirt: "#221d33", pants: "#120f1c", accent: P.mag };
    case "guard":
      // Security: dark armor, a lit helmet.
      return { ...l, shirt: "#1e2642", pants: "#11152a", accent: "#28d8ff" };
    case "janitor":
      return { ...l, shirt: "#127070", pants: "#0f2a30", accent: P.yel };
    case "technician":
      // A cyber mechanic in a hazard jacket.
      return { ...l, shirt: "#ff7a2a", pants: "#1e2440", accent: P.lime };
    case "delivery":
      // A courier in a glowing jacket.
      return { ...l, shirt: "#a6ff3a", pants: "#1c1830", accent: P.mag, hair: l.hair };
  }
}

const NO_HEM = new Set<CharPose>(["present", "present-plan", "read", "nap"]);

export function neonDress(ctx: CanvasRenderingContext2D, a: { x: number; y: number; facing: Facing; pose: CharPose; seed: number; seated: boolean; look?: Look }, t: number): void {
  const kind = a.seed % 5;
  if (kind === 4) return;
  const bob = a.pose === "walk1" || a.pose === "walk3" ? -1 : 0;
  const drop = (a.pose === "slump" ? 2 : 0) + (a.pose === "nap" ? 1 : 0);
  const y0 = a.y + 2 + bob + drop;
  const side = a.facing === "left" || a.facing === "right";
  const flip = a.facing === "left";
  const px = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(flip ? a.x + 20 - x - w : a.x + x, y, w, h);
  };
  // Their own neon accent (the color of their headphones, cap or book).
  const neon = a.look?.accent ?? ACCENTS[(a.seed >>> 3) % ACCENTS.length]!;
  switch (kind) {
    case 0: {
      // A visor across the eyes.
      if (a.facing === "back" || a.pose === "nap") return;
      const ey = y0 + 6;
      const s = side ? 1 : 0;
      px(4 + s, ey, 12 - s, 1, P.cyan);
      px(5 + s, ey + 1, 10 - s, 1, P.cyanLo);
      px(side ? 14 : 13, ey, 1, 1, P.cyanHi);
      break;
    }
    case 1:
      // A neon streak in the hair.
      px(side ? 9 : 8, y0, 2, 1, neon);
      px(side ? 10 : 9, y0 + 1, 2, 1, neon);
      break;
    case 2: {
      // An LED trim along the jacket hem.
      if (NO_HEM.has(a.pose)) return;
      const hem = a.y + 14 + bob + 6;
      px(5, hem, 8, 1, neon);
      break;
    }
    case 3: {
      // A blinking earpiece.
      if (a.facing === "back") return;
      if (Math.floor(t * 1.6 + a.seed) % 3 === 0) return;
      px(side ? 15 : 2, y0 + 6, 1, 1, neon);
      break;
    }
  }
}
