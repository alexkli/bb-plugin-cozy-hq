// Mountain Cabin: the workroom's desks and chairs. Pine trestle desks with a
// drawer and a little oil lamp (stained by the model of whoever sits there),
// carved board chairs with a wool cushion in the provider's color. Screens
// stay the office's own.
import type { ChairTone } from "../../desks.ts";
import type { DeskStyle } from "../../model.ts";
import { shade } from "../../themekit.ts";
import { C, sprite } from "./kit.ts";

const WOOD: Record<DeskStyle, [string, string, string, string]> = {
  default: [C.pine, C.pineHi, C.pineLo, C.pineDk],
  sonnet: [C.pine, C.pineHi, C.pineLo, C.pineDk],
  opus: [C.beam, C.beamHi, C.beamLo, C.beamDk],
  haiku: ["#e6dccb", "#f6f0e4", "#cfc2aa", "#a8987c"],
  gpt: ["#3a3332", "#554c48", "#2a2422", "#1a1514"],
  gemini: ["#dcc49a", "#efdcb8", "#c4a87a", "#9c8258"],
};

export function desk(style: DeskStyle): HTMLCanvasElement {
  const [base, hi, lo, dk] = WOOD[style];
  return sprite(`desk-${style}`, 48, 32, (g) => {
    // The top: two wide boards, as low as the office's own desk (row 11), so
    // whoever sits behind it shows head and shoulders.
    g.rect(1, 11, 46, 11, base);
    g.rect(1, 11, 46, 1, hi);
    g.hline(2, 16, 44, lo);
    for (let x = 9; x < 46; x += 17) g.set(x, 13, lo).set(x + 1, 13, lo);
    // The apron with a drawer and an iron pull.
    g.rect(1, 22, 46, 4, lo).rect(1, 22, 46, 1, dk);
    g.rect(17, 23, 14, 2, base).set(23, 24, C.iron).set(24, 24, C.iron);
    // Trestle legs with a stretcher.
    g.rect(3, 26, 3, 5, dk).rect(42, 26, 3, 5, dk);
    g.rect(2, 30, 5, 2, lo).rect(41, 30, 5, 2, lo);
    g.rect(6, 28, 36, 1, dk);
    g.vline(4, 26, 4, shade(dk, 0.15));
  });
}

const CUSHION: Record<ChairTone, string> = {
  green: C.moss,
  claude: "#c4673f",
  copilot: "#6b4fc4",
  bedrock: "#d98a2a",
  codex: "#3a3d46",
  blue: "#3e7cc4",
};

export function chair(tone: ChairTone, side: "north" | "south"): HTMLCanvasElement {
  const c = CUSHION[tone];
  return sprite(`chair-${tone}-${side}`, 16, 16, (g) => {
    if (side === "north") {
      // Facing you: the carved back behind the seat, the cushion in front.
      g.rrect(3, 0, 10, 8, C.pine, 2).rect(4, 0, 8, 1, C.pineHi);
      g.set(6, 3, C.beamDk).set(9, 3, C.beamDk).rect(6, 4, 4, 1, C.beamDk).rect(7, 5, 2, 1, C.beamDk);
      g.rect(2, 8, 12, 4, C.pine).rect(3, 8, 10, 3, c).rect(3, 8, 10, 1, shade(c, 0.2));
      g.rect(3, 12, 2, 4, C.pineDk).rect(11, 12, 2, 4, C.pineDk);
    } else {
      // From behind: the carved back board over the seat.
      g.rect(2, 9, 12, 3, C.pine).rect(3, 9, 10, 2, c);
      g.rrect(3, 1, 10, 9, C.pine, 2).rect(4, 1, 8, 1, C.pineHi).vline(3, 3, 6, C.pineLo).vline(12, 3, 6, C.pineLo);
      g.set(6, 4, C.beamDk).set(9, 4, C.beamDk).rect(6, 5, 4, 1, C.beamDk).rect(7, 6, 2, 1, C.beamDk);
      g.rect(3, 12, 2, 4, C.pineDk).rect(11, 12, 2, 4, C.pineDk);
    }
  });
}
