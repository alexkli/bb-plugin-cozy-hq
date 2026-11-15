// A tiny 3×5 pixel font for in-scene labels (calendar, light board, signs).

const GLYPHS: Record<string, string> = {
  "0": "111101101101111",
  "1": "010110010010111",
  "2": "111001111100111",
  "3": "111001111001111",
  "4": "101101111001001",
  "5": "111100111001111",
  "6": "111100111101111",
  "7": "111001010010010",
  "8": "111101111101111",
  "9": "111101111001111",
  A: "010101111101101",
  B: "110101110101110",
  C: "011100100100011",
  D: "110101101101110",
  E: "111100110100111",
  F: "111100110100100",
  G: "011100101101011",
  J: "001001001101010",
  L: "100100100100111",
  M: "101111111101101",
  N: "110101101101101",
  O: "010101101101010",
  P: "110101110100100",
  R: "110101110101101",
  S: "011100010001110",
  T: "111010010010010",
  U: "101101101101111",
  V: "101101101101010",
  Y: "101101010010010",
  H: "101101111101101",
  I: "111010010010111",
  K: "101101110101101",
  Q: "010101101110011",
  W: "101101101111101",
  X: "101101010101101",
  Z: "111001010100111",
  "-": "000000111000000",
  ":": "000010000010000",
  ".": "000000000000010",
  "'": "010010000000000",
  "+": "000010111010000",
  "!": "010010010000010",
  "?": "111001010000010",
  " ": "000000000000000",
};

/** Draw text at (x, y) top-left; `s` scales each font pixel. Returns the width. */
export function drawPixelText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  s = 1,
): number {
  ctx.fillStyle = color;
  let cx = x;
  for (const ch of text.toUpperCase()) {
    const g = GLYPHS[ch] ?? GLYPHS["?"]!;
    for (let i = 0; i < 15; i++) {
      if (g[i] === "1") ctx.fillRect(cx + (i % 3) * s, y + Math.floor(i / 3) * s, s, s);
    }
    cx += 4 * s;
  }
  return cx - x - s;
}

export function pixelTextWidth(text: string, s = 1): number {
  return text.length * 4 * s - s;
}
