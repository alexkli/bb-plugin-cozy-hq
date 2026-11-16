import { test } from "node:test";
import assert from "node:assert/strict";
import { buildLayout, layoutSize } from "./layout.ts";
import { checkLayout } from "./layoutcheck.ts";
import { THEMES } from "./themes/index.ts";

const SIZES = [
  [600, 300],
  [666, 474],
  [700, 360],
  [900, 420],
  [1200, 520],
  [600, 698],
  [390, 844],
  [345, 640],
] as const;

for (const theme of THEMES) {
  test(`${theme.name}: the floor plan works at every size`, () => {
    for (const [w, h] of SIZES) {
      for (const threads of [4, 12, 28]) {
        const size = layoutSize(w, h);
        const L = theme.layout?.(size.W, size.H, { threads, portrait: size.portrait }) ?? buildLayout(w, h, { threads });
        const problems = checkLayout(L, { threads });
        assert.deepEqual(problems, [], `${theme.id} at ${w}×${h} with ${threads} threads:\n  ${problems.slice(0, 8).join("\n  ")}`);
      }
    }
  });
}
