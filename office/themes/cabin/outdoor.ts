// Mountain Cabin: the things standing about that aren't office furniture:
// the woodpile and fire irons on the hearth, the barrel sauna, deck chairs
// with wool blankets, skis stuck in the snow, the boot rack in the mudroom
// and the brass telescope at the study window.
import { OUTLINE } from "../../themekit.ts";
import { C, sprite } from "./kit.ts";

/** Split logs stacked end-on: wedges with rings and bark. */
export function woodpile(w: number): HTMLCanvasElement {
  const W = Math.max(14, w);
  return sprite(`woodpile-${W}`, W, 18, (g) => {
    g.rect(0, 15, W, 3, C.pineDeep);
    for (let row = 0; row < 3; row++) {
      const y = 11 - row * 5;
      const off = row % 2 ? 3 : 0;
      for (let x = off; x + 5 <= W - (row === 2 ? 4 : 0); x += 6) {
        g.ellipse(x + 2.5, y + 2.5, 2.6, 2.4, C.beam);
        g.ellipse(x + 2.5, y + 2.5, 1.6, 1.4, "#d9b07a");
        g.set(x + 2, y + 2, "#b88a52").set(x + 3, y + 3, "#c49660");
        g.set(x + 1, y + 1, "#e8c890");
      }
    }
    // A hatchet stuck in the top log.
    g.rect(W - 6, 0, 1, 6, C.pine).rect(W - 8, 0, 4, 2, C.ironHi);
  });
}

/** Fire irons on their stand: poker, shovel and brush. */
export function toolStand(): HTMLCanvasElement {
  return sprite("tools", 9, 20, (g) => {
    g.rect(1, 18, 7, 2, C.iron);
    g.rect(4, 3, 1, 16, C.iron);
    g.rect(2, 1, 5, 2, C.ironHi);
    g.rect(1, 3, 1, 12, C.ironLo).set(0, 14, C.ironLo).set(0, 13, C.ironLo);
    g.rect(7, 3, 1, 10, C.ironLo).rect(6, 13, 3, 3, C.ironHi);
    g.set(3, 4, C.brass).set(5, 4, C.brass);
  });
}

/**
 * The sauna: a little log hut with its gable to us, a plank door with a
 * glowing window, a stovepipe through the roof and a bucket by the door.
 * `snowy`: snow piled on the roof.
 */
export function saunaHut(w: number, snowy: boolean): HTMLCanvasElement {
  const W = Math.max(36, Math.min(48, w));
  return sprite(`sauna-${W}-${snowy}`, W, 44, (g) => {
    const cx = Math.floor(W / 2);
    // The roof planes: lit on the left, shaded on the right, the ridge running away from us.
    for (let y = 0; y < 18; y++) {
      const half = Math.min(cx, 6 + Math.round(y * 1.05));
      g.rect(cx - half, y + 2, half, 1, y % 3 === 0 ? C.beam : C.beamHi);
      g.rect(cx, y + 2, half, 1, y % 3 === 0 ? C.beamDk : C.beamLo);
    }
    // The gable end: vertical boards in the triangle, logs below.
    for (let y = 8; y < 20; y++) {
      const half = Math.round((y - 8) * 1.1) + 2;
      for (let x = cx - half; x <= cx + half; x++) g.set(x, y, (x - cx) % 3 === 0 ? C.pineLo : C.pine);
    }
    for (let y = 20; y < 41; y++) g.rect(3, y, W - 6, 1, (y - 20) % 4 === 3 ? C.pineDk : (y - 20) % 4 === 0 ? C.pineHi : C.pine);
    for (let y = 21; y < 41; y += 4) g.set(2, y, C.pineHi).set(W - 3, y, C.pineLo).set(1, y + 1, C.pine).set(W - 2, y + 1, C.pineLo);
    // The door with a little glowing window, the handle; a window in the gable.
    g.rrect(cx - 6, 24, 12, 17, C.beam, 1);
    g.rect(cx - 5, 25, 10, 1, C.beamHi);
    g.rect(cx - 3, 27, 6, 4, "#ffcf7a").rect(cx - 3, 27, 6, 1, "#ffe6a8");
    g.rect(cx + 4, 33, 1, 3, C.pineHi);
    g.rect(cx - 2, 12, 4, 3, "#ffcf7a");
    // The stovepipe and the bucket with its ladle.
    g.rect(W - 13, 0, 3, 8, C.ironHi).rect(W - 14, 0, 5, 1, C.iron);
    g.rect(4, 36, 6, 5, C.pineLo).rect(4, 36, 6, 1, C.iron).rect(5, 37, 4, 1, "#7fb5d6").rect(8, 33, 1, 4, C.pineDk);
    g.rect(1, 41, W - 2, 3, C.beamDk);
    if (snowy) {
      for (let y = 0; y < 5; y++) {
        const half = Math.min(cx, 6 + Math.round((y * 3) * 1.05));
        g.rect(cx - half, 2 + y * 3, half * 2, 2, C.snow);
      }
      g.rect(3, 19, W - 6, 1, C.snowShade);
    }
  });
}

/** An alpine deck chair (a slatted lounger) with a navy wool blanket folded at the foot. */
export function deckChair(snowy: boolean): HTMLCanvasElement {
  return sprite(`deckchair-${snowy}`, 20, 14, (g) => {
    g.rect(2, 2, 16, 4, C.pineLo);
    for (let x = 3; x < 18; x += 3) g.vline(x, 2, 4, C.pineHi);
    g.rect(1, 6, 18, 5, C.pine);
    for (let x = 2; x < 19; x += 3) g.vline(x, 6, 5, C.pineLo);
    g.rect(12, 6, 7, 5, C.navy).rect(12, 6, 7, 1, C.navyHi);
    for (let x = 13; x < 19; x += 2) g.set(x, 8, C.cream);
    g.rect(2, 11, 2, 3, C.pineDk).rect(16, 11, 2, 3, C.pineDk);
    if (snowy) g.rect(2, 1, 16, 2, C.snow).rect(3, 5, 8, 1, C.snow);
  });
}

/** Skis and poles stuck upright in a snowbank. `wide`: four pairs (along the wall), else two. */
export function skiRack(wide: boolean): HTMLCanvasElement {
  const W = wide ? 28 : 14;
  return sprite(`skirack-${wide}`, W, 32, (g) => {
    const cols = ["#d0453a", "#f2c230", "#3a8ad8", "#e9ecef", "#4fbf7a", "#e86aa8"];
    for (let i = 0; i < W / 7; i++) {
      const x = 1 + i * 7;
      const c = cols[(i * 2) % cols.length]!;
      g.rect(x, 2, 2, 26, c).set(x, 1, c).set(x + 1, 0, c);
      g.vline(x, 4, 22, "#ffffff55");
      g.rect(x + 3, 3, 2, 25, cols[(i * 2 + 1) % cols.length]!).set(x + 4, 2, cols[(i * 2 + 1) % cols.length]!);
      g.rect(x + 5, 6, 1, 22, "#8d949e").set(x + 5, 5, C.iron);
    }
    g.rrect(0, 25, W, 7, C.snow, 2);
    g.rect(1, 30, W - 2, 2, C.snowShade);
  });
}

/** A low pine rack of boots: ski boots, leather boots, felt boots, a dripping pair. */
export function bootRack(w: number): HTMLCanvasElement {
  const W = Math.max(24, w);
  return sprite(`bootrack-${W}`, W, 14, (g) => {
    g.rect(0, 9, W, 3, C.pine).rect(0, 9, W, 1, C.pineHi).rect(0, 12, W, 2, C.pineDk);
    g.rect(1, 12, 2, 2, C.pineDeep).rect(W - 3, 12, 2, 2, C.pineDeep);
    const boots = [C.red, "#6b4a33", C.felt, "#f2c230", "#3a3d46", C.navy, "#8a5a32", C.cream];
    for (let x = 3, i = 0; x + 8 <= W - 2; x += 10, i++) {
      const c = boots[i % boots.length]!;
      for (const bx of [x, x + 4]) {
        g.rect(bx, 2, 3, 7, c).rect(bx, 7, 4, 2, c);
        g.vline(bx, 2, 7, "#ffffff40");
        g.set(bx + 1, 1, c);
      }
      if (i % 3 === 1) g.rect(x, 1, 7, 1, C.snow);
    }
  });
}

/** A brass telescope on a wooden tripod, aimed up and out of the window. */
export function telescope(): HTMLCanvasElement {
  return sprite("telescope", 15, 28, (g) => {
    g.line(7, 14, 2, 27, C.pineDk).line(7, 14, 12, 27, C.pineDk).line(7, 14, 7, 27, C.pine);
    g.rect(6, 12, 3, 3, C.iron);
    // The tube, from the eyepiece low left up toward the window.
    g.line(2, 15, 12, 5, C.brass);
    g.line(2, 14, 12, 4, C.brassHi);
    g.line(3, 15, 13, 5, C.copperLo);
    g.rect(11, 2, 3, 4, C.brass).set(12, 2, C.brassHi).set(14, 3, "#cfe6f5");
    g.rect(1, 15, 2, 2, C.ironLo);
  });
}

/** A row of skis leaning in a rack along a wall. */
export function skiWall(w: number): HTMLCanvasElement {
  return sprite(`skiwall-${w}`, w, 20, (g) => {
    const cols = ["#d0453a", "#f2c230", "#3a8ad8", "#e9ecef", "#4fbf7a", "#9a5a32", "#e86aa8", C.navy];
    g.rect(0, 4, w, 14, C.pineDk);
    for (let x = 1, i = 0; x + 2 <= w - 1; x += 3, i++) {
      const c = cols[(Math.floor(i / 2) * 3) % cols.length]!;
      g.rect(x, 2, 2, 17, c).set(x + (i % 2), 1, c);
      g.set(x, 4, "#ffffff");
    }
    g.rect(0, 12, w, 2, C.pine).rect(0, 12, w, 1, C.pineHi);
    g.rect(0, 18, w, 2, C.pineDk);
  });
}

/** The waxing bench: trestles, a ski clamped on top, an iron and a block of wax. */
export function waxBench(): HTMLCanvasElement {
  return sprite("waxbench", 40, 16, (g) => {
    g.rect(1, 4, 38, 4, C.pine).rect(1, 4, 38, 1, C.pineHi);
    g.rect(3, 8, 3, 7, C.pineDk).rect(34, 8, 3, 7, C.pineDk).rect(3, 12, 34, 1, C.pineDk);
    g.rect(2, 2, 36, 2, "#d0453a").set(1, 1, "#d0453a").set(0, 0, "#d0453a").rect(4, 2, 30, 1, "#f08a7a");
    g.rect(22, 0, 6, 3, C.iron).rect(23, 0, 3, 1, C.ironHi).set(28, 1, C.red);
    g.rect(10, 1, 4, 2, "#f2c230");
  });
}

/** A snowman in a red scarf with a bobble hat, stick arms and a carrot nose. */
export function snowman(): HTMLCanvasElement {
  return sprite("snowman", 16, 22, (g) => {
    g.ellipse(7.5, 16, 6, 5, C.snow);
    g.ellipse(7.5, 9.5, 4.5, 3.8, C.snow);
    g.ellipse(7.5, 4.5, 3.4, 3.2, C.snow);
    for (let x = 2; x < 14; x++) if (g.get(x, 19)) g.set(x, 19, C.snowShade).set(x, 20, C.snowShade);
    g.set(6, 4, OUTLINE).set(9, 4, OUTLINE).rect(8, 5, 3, 1, "#f08a3a");
    g.rect(4, 7, 8, 1, C.red).rect(9, 8, 2, 4, C.red);
    g.rect(5, 0, 6, 2, C.navy).set(8, 0, C.cream).rect(4, 2, 8, 1, C.navy);
    g.line(3, 9, 0, 6, C.beamDk).line(12, 9, 15, 7, C.beamDk);
    g.set(7, 10, OUTLINE).set(7, 13, OUTLINE);
  });
}

/** An iron wall lantern by a door out to the deck. */
export function lantern(lit: boolean): HTMLCanvasElement {
  return sprite(`lantern-${lit}`, 7, 11, (g) => {
    g.rect(2, 0, 3, 1, C.iron).set(3, 1, C.iron);
    g.rect(1, 2, 5, 1, C.ironHi);
    g.rect(1, 3, 5, 5, lit ? "#ffcf6a" : "#cfe0e8").vline(3, 3, 5, C.iron);
    g.rect(1, 8, 5, 1, C.iron).rect(2, 9, 3, 1, C.ironLo);
  });
}

/** A little sauna-goer in a towel (the one who runs out into the snow). */
export function towelGuy(frame: number, skin: string): HTMLCanvasElement {
  return sprite(`towel-${frame}-${skin}`, 8, 12, (g) => {
    g.rect(2, 0, 4, 4, skin).rect(2, 0, 4, 1, "#5a3a2a");
    g.rect(1, 4, 6, 3, skin);
    g.rect(1, 7, 6, 3, "#f4f2ee").rect(1, 9, 6, 1, "#d8d4ca");
    const a = frame % 2;
    g.rect(1 + a, 10, 2, 2, skin).rect(5 - a, 10, 2, 2, skin);
    g.set(3, 2, OUTLINE).set(5, 2, OUTLINE);
  });
}

