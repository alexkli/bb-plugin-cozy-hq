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

for (const theme of THEMES.filter((t) => t.clickables)) {
  test(`${theme.name}: its things to click are on the panel, each with an id and a hover text`, () => {
    for (const [w, h] of SIZES) {
      const size = layoutSize(w, h);
      const L = theme.layout?.(size.W, size.H, { threads: 12, portrait: size.portrait }) ?? buildLayout(w, h, { threads: 12 });
      const list = theme.clickables!(L);
      assert.ok(list.length > 0, `${theme.id} at ${w}×${h} has something to click`);
      assert.equal(new Set(list.map((c) => c.id)).size, list.length, `${theme.id} at ${w}×${h}: ids are unique`);
      for (const c of list) {
        assert.ok(c.hover, `${c.id} has a hover text`);
        const r = c.rect;
        assert.ok(r.w > 0 && r.h > 0 && r.x + r.w > 0 && r.y + r.h > 0 && r.x < L.W && r.y < L.H, `${theme.id} at ${w}×${h}: ${c.id} is on the panel`);
      }
    }
  });
}
