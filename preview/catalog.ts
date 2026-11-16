// Every sprite the office uses, classic next to the scenery's version, with
// sizes: a checklist for scenery authors.
import { chairCanvas, deskCanvas, screenFor, type ChairTone } from "../office/desks.ts";
import { classicProp, pa } from "../office/furniture.ts";
import { buildLayout, type PlantPlacement, type PropPlacement } from "../office/layout.ts";
import type { DeskStyle } from "../office/model.ts";
import { themeById } from "../office/themes/index.ts";

const SCALE = 3;

function big(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = src.width * SCALE;
  c.height = src.height * SCALE;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

function figure(parent: HTMLElement, label: string, classic: HTMLCanvasElement, themed: HTMLCanvasElement | null): void {
  const f = document.createElement("figure");
  const pair = document.createElement("div");
  pair.className = "pair";
  pair.append(big(classic));
  if (themed && themed !== classic) pair.append(big(themed));
  const cap = document.createElement("figcaption");
  cap.textContent = `${label} · ${classic.width}×${classic.height}${themed && themed !== classic ? ` → ${themed.width}×${themed.height}` : " · classic"}`;
  f.append(pair, cap);
  parent.append(f);
}

export function showCatalog(stage: HTMLElement, scenery: string): void {
  const theme = themeById(scenery);
  const head = document.createElement("h2");
  head.textContent = `${theme.icon} ${theme.name}: every sprite (classic left, scenery right)`;
  stage.append(head);
  const grid = document.createElement("div");
  grid.className = "cat";
  stage.append(grid);
  // Props from a few layouts, so every kind shows up once.
  const seen = new Set<string>();
  for (const [w, h] of [[666, 474], [900, 420], [600, 698], [390, 844]] as const) {
    const L = buildLayout(w, h, { threads: 16 });
    for (const p of L.props as PropPlacement[]) {
      const k = `${p.kind}`;
      if (seen.has(k)) continue;
      seen.add(k);
      const classic = classicProp(p, L);
      figure(grid, `prop ${p.kind}${p.w ? ` (w ${p.w})` : ""}`, classic, theme.prop?.(p, L, () => classic) ?? null);
    }
  }
  for (const s of ["PLANT", "PLANT_2", "LARGE_PLANT", "CACTUS", "POT", "HANGING_PLANT"] as PlantPlacement["sprite"][]) {
    const classic = pa(s);
    figure(grid, `plant ${s}`, classic, theme.plant?.(s, () => classic) ?? null);
  }
  for (const style of ["default", "opus", "sonnet", "haiku", "gpt", "gemini"] as DeskStyle[]) {
    const classic = deskCanvas(style);
    figure(grid, `desk ${style}`, classic, theme.desk?.(style, () => classic) ?? null);
  }
  for (const tone of ["green", "claude", "copilot", "codex"] as ChairTone[]) {
    for (const side of ["north", "south"] as const) {
      const classic = chairCanvas(tone, side);
      figure(grid, `chair ${tone} ${side}`, classic, theme.chair?.(tone, side, () => classic) ?? null);
    }
  }
  for (const style of ["default", "opus", "haiku", "gpt"] as DeskStyle[]) {
    for (const side of ["north", "south"] as const) {
      const classic = screenFor(style, side, 0, false);
      const themed = theme.screen?.(style, side, 0, false, () => classic) ?? null;
      figure(grid, `screen ${style} ${side}`, classic.canvas, themed?.canvas ?? null);
    }
  }
}
