// Redwood Camp: the giant trees standing among the tents, the creek and its
// bridges, the ropes holding the outdoor screen.
import type { Drawable } from "../../theme.ts";
import type { Layout } from "../../layout.ts";
import { Grid, hash, OUTLINE, rect, rng } from "../../themekit.ts";
import { clamp } from "../../themekit.ts";
import { barkFill, C, cached } from "./kit.ts";
import { campData, type Tree } from "./plan.ts";

type Ctx = CanvasRenderingContext2D;

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** A giant trunk rising from flared roots; when it stops short of the top, its lowest boughs hide the rest. */
export function treeSprite(t: Tree): { canvas: HTMLCanvasElement; ox: number } {
  const flare = Math.max(4, Math.round(t.w * 0.32));
  const crowned = t.base - t.h > 2;
  const pad = crowned ? 8 : 0;
  const f = flare + pad;
  return cached(`redwoods|tree|${t.w}|${t.h}|${t.seed}|${crowned}`, () => {
    const gw = t.w + f * 2;
    const gh = t.h + 4;
    const g = new Grid(gw, gh);
    barkFill(g, f, 0, t.w, gh, t.seed * 7 + 3);
    const r = rng(t.seed * 13 + 1);
    // Root flare spreading into the ground.
    const rootH = Math.min(16, Math.round(t.h * 0.3));
    for (let y = gh - rootH; y < gh; y++) {
      const k = (y - (gh - rootH)) / rootH;
      const grow = Math.round(Math.pow(k, 1.7) * flare);
      for (let i = 1; i <= grow; i++) {
        g.set(f - i, y, i === grow ? C.barkDk : i > grow - 2 ? C.barkMid : C.barkHi);
        g.set(f + t.w - 1 + i, y, i === grow ? C.barkDk : C.bark);
      }
    }
    for (const rx of [f - Math.round(flare * 0.6), f + Math.round(t.w * 0.45), f + t.w + Math.round(flare * 0.5)]) {
      for (let y = gh - rootH + 4; y < gh; y++) g.set(rx + Math.round((y - gh) * 0.15), y, C.barkDk);
    }
    // Moss at the foot, a bracket fungus, a burl.
    for (let i = 0; i < gw; i++) if (g.get(i, gh - 2) && r() < 0.55) g.set(i, gh - 2 - Math.floor(r() * 3), r() < 0.5 ? C.moss : C.mossHi);
    if (t.h > 50) {
      const fy = gh - rootH - 10 - Math.floor(r() * 20);
      const fx = r() < 0.5 ? f - 2 : f + t.w - 2;
      g.rect(fx, fy, 4, 1, "#e0b77e").rect(fx + 1, fy + 1, 3, 1, "#b58652");
    }
    if (t.h > 70 && r() < 0.6) {
      const by = Math.floor(gh * (0.45 + r() * 0.25));
      g.ellipse(f + Math.floor(t.w * (0.3 + r() * 0.4)), by, 2.5, 2, C.barkMid);
      g.set(f + Math.floor(t.w * 0.5), by, C.barkDk);
    }
    if (crowned) {
      // The lowest boughs: tiers of needles hiding where the trunk goes on up.
      const crownH = clamp(Math.round(t.h * 0.34), 18, 36);
      const cx = f + t.w / 2;
      const half0 = t.w / 2 + flare + 6;
      const tiers = 3;
      for (let k = 0; k < tiers; k++) {
        const ty = Math.round((k * crownH) / (tiers + 0.6));
        const th = Math.round(crownH / 2.2);
        const hw = half0 * (0.6 + 0.4 * ((k + 1) / tiers));
        for (let j = 0; j < th; j++) {
          const q = j / th;
          const half = Math.round(hw * (0.35 + 0.65 * q));
          for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
            const edge = Math.abs(x - cx) > half - 2;
            if (edge && (x * 7 + j * 3 + k) % 5 === 0) continue;
            const lit = x < cx - half * 0.3 && j < th - 2;
            g.set(x, ty + j, j >= th - 2 ? "#1e3424" : lit ? "#47703e" : (x + j) % 4 === 0 ? "#24402a" : "#2f5530");
          }
        }
        for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x += 3) g.set(x, ty + th, "#24402a");
      }
    }
    g.outline(OUTLINE);
    if (crowned) {
      // The tip fades into the canopy mist.
      for (let y = 0; y < 3; y++) for (let x = 0; x < gw; x++) if (g.get(x, y) && BAYER[(y % 4) * 4 + (x % 4)]! / 16 > (y + 1) / 4) g.set(x, y, null);
    } else {
      // Trees that go on up past the top: no outline across the cut.
      for (let x = 0; x < gw; x++) if (g.get(x, 0) === OUTLINE) g.set(x, 0, null);
    }
    return { canvas: g.toCanvas(), ox: f };
  });
}

/** Ground shadows and leaf litter around the trees' roots (baked into the floor). */
export function treeShadows(ctx: Ctx, L: Layout): void {
  const d = campData(L);
  if (!d) return;
  for (const t of d.trees) {
    const cx = t.x + t.w / 2;
    const rx = t.w * 0.9 + 6;
    ctx.fillStyle = "rgba(20,14,8,0.22)";
    for (let y = -4; y <= 4; y++) {
      const half = Math.round(rx * Math.sqrt(1 - (y * y) / 20));
      ctx.fillRect(Math.round(cx - half + 3), t.base + y, half * 2, 1);
    }
  }
}

// ------------------------------------------------------------------ the creek

export function creekX(pts: { x: number; y: number }[], y: number): number {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    if (y <= b.y) return a.x + ((b.x - a.x) * (y - a.y)) / Math.max(1, b.y - a.y);
  }
  return pts[pts.length - 1]!.x;
}

/** The creek bed, banks and stones (static; the shimmer is live). */
export function paintCreek(ctx: Ctx, L: Layout): void {
  const d = campData(L);
  const c = d?.creek;
  if (!c) return;
  const y0 = c.pts[0]!.y;
  const r = rng(hash(`creek-${L.W}`));
  for (let y = y0; y < L.H; y++) {
    const x = Math.round(creekX(c.pts, y) - c.w / 2);
    const fall = y - y0 < 10;
    rect(ctx, x - 3, y, c.w + 6, 1, "#3e4a2a");
    rect(ctx, x - 2, y, c.w + 4, 1, "#5a5242");
    rect(ctx, x - 1, y, c.w + 2, 1, "#2f5f72");
    rect(ctx, x, y, c.w, 1, fall ? "#7ec0d4" : "#3f7f9a");
    if (!fall && (y * 7) % 11 < 2) rect(ctx, x + 1 + ((y * 5) % Math.max(1, c.w - 2)), y, 2, 1, "#5f9fb8");
    // Stones and moss along the banks
    if (r() < 0.16) {
      const side = r() < 0.5 ? x - 4 : x + c.w + 1;
      rect(ctx, side, y, 3, 2, C.stone);
      rect(ctx, side, y, 2, 1, C.stoneHi);
    } else if (r() < 0.12) rect(ctx, r() < 0.5 ? x - 4 : x + c.w + 2, y, 2, 1, C.mossHi);
    if (r() < 0.05) {
      // A stone in the stream with a little foam
      const sx = x + 1 + Math.floor(r() * Math.max(1, c.w - 3));
      rect(ctx, sx, y, 2, 2, C.stoneDk);
      rect(ctx, sx, y - 1, 2, 1, "#d8eef4");
    }
  }
  // The spring at the top: rocks around where it comes out from under the wall.
  const sx = Math.round(creekX(c.pts, y0));
  for (const [dx, dy, w] of [
    [-c.w / 2 - 6, 2, 5],
    [c.w / 2 + 1, 1, 6],
    [-c.w / 2 - 3, 7, 4],
    [c.w / 2 + 2, 8, 4],
  ] as const) {
    rect(ctx, Math.round(sx + dx), y0 + dy, w, 3, C.stone);
    rect(ctx, Math.round(sx + dx), y0 + dy, w, 1, C.stoneHi);
    rect(ctx, Math.round(sx + dx), y0 + dy + 3, w, 1, C.stoneDk);
  }
}

/** Plank bridges where people cross the creek, and railings where a boardwalk does. */
export function paintBridges(ctx: Ctx, L: Layout): void {
  const d = campData(L);
  const c = d?.creek;
  if (!d || !c) return;
  const plank = (x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = "rgba(20,14,8,0.3)";
    ctx.fillRect(x + 1, y + h, w, 2);
    for (let i = 0; i < w; i += 3) {
      rect(ctx, x + i, y, 2, h, i % 6 ? C.log : C.logLo);
      rect(ctx, x + i, y, 2, 1, C.logHi);
      rect(ctx, x + i + 2, y, 1, h, C.logDk);
    }
  };
  for (const b of d.bridges) {
    const cx = Math.round(creekX(c.pts, b.y + b.h / 2));
    const x = cx - Math.round(c.w / 2) - 5;
    const w = c.w + 10;
    plank(x, b.y + 2, w, b.h - 3);
    // Rope rails on posts
    for (const ry of [b.y, b.y + b.h]) {
      rect(ctx, x, ry, w, 1, "#8f7b58");
      rect(ctx, x, ry - 2, 1, 3, C.logDk);
      rect(ctx, x + w - 1, ry - 2, 1, 3, C.logDk);
    }
  }
  // Rails along the boardwalks where they cross the creek.
  for (const hy of L.net.halls) {
    const cx = Math.round(creekX(c.pts, hy));
    const x = cx - Math.round(c.w / 2) - 5;
    const w = c.w + 10;
    for (const ry of [hy - 8, hy + 7]) {
      rect(ctx, x, ry, w, 2, C.logLo);
      rect(ctx, x, ry, w, 1, C.logHi);
      rect(ctx, x, ry - 3, 2, 5, C.logDk);
      rect(ctx, x + w - 2, ry - 3, 2, 5, C.logDk);
    }
  }
}

/** Live: light glinting on the water as it runs. */
export function creekShimmer(ctx: Ctx, L: Layout, t: number, night: number): void {
  const d = campData(L);
  const c = d?.creek;
  if (!c) return;
  const y0 = c.pts[0]!.y;
  const len = L.H - y0;
  ctx.fillStyle = night > 0.5 ? "rgba(150,180,220,0.55)" : "rgba(235,250,255,0.85)";
  for (let i = 0; i < Math.round(len / 9); i++) {
    const y = y0 + ((i * 37 + Math.floor(t * 18)) % len);
    const x = Math.round(creekX(c.pts, y) - c.w / 2 + 1 + ((i * 3) % Math.max(1, c.w - 2)));
    ctx.fillRect(x, Math.round(y), 2, 1);
  }
}

// ------------------------------------------------------------------ drawables

const ropeItem: { z: number; L: Layout | null; ctx: Ctx | null; night: number; t: number } = { z: 0.5, L: null, ctx: null, night: 0, t: 0 };

/** Lanterns hung on some trees: [x, y] of each lantern's glass. */
export function treeLanterns(L: Layout): [number, number][] {
  const d = campData(L);
  if (!d) return [];
  return cached(`redwoods|treelanterns|${L.W}x${L.H}|${d.trees.length}`, () =>
    d.trees.filter((t, i) => i % 2 === 0 && t.h >= 60).map((t) => [t.x - 3, t.base - Math.min(Math.round(t.h * 0.45), 46)] as [number, number]),
  );
}

/** The festoon across the clearing: the two anchor points and its sag. */
export function festoon(L: Layout): { ax: number; ay: number; bx: number; by: number; sag: number } | null {
  const d = campData(L);
  if (!d) return null;
  return cached(`redwoods|festoon|${L.W}x${L.H}|${d.trees.length}`, () => {
    const cl = d.trees.filter((t) => t.role === "clearing");
    if (cl.length < 2) return null;
    const l = cl.reduce((a, b) => (b.x < a.x ? b : a));
    const r = cl.reduce((a, b) => (b.x > a.x ? b : a));
    if (r.x - l.x < 60) return null;
    const ya = l.base - l.h + Math.min(30, Math.round(l.h * 0.34)) + 6;
    const yb = r.base - r.h + Math.min(30, Math.round(r.h * 0.34)) + 6;
    return { ax: l.x + l.w - 2, ay: ya, bx: r.x + 2, by: yb, sag: 12 };
  });
}

function festoonPoint(f: { ax: number; ay: number; bx: number; by: number; sag: number }, k: number): [number, number] {
  return [f.ax + (f.bx - f.ax) * k, f.ay + (f.by - f.ay) * k + Math.sin(k * Math.PI) * f.sag];
}

function drawFestoon(ctx: Ctx, L: Layout, night: number, t: number, glow: boolean): void {
  const f = festoon(L);
  if (!f) return;
  const n = Math.round(f.bx - f.ax);
  if (!glow) {
    ctx.fillStyle = "#4a3a2a";
    for (let i = 0; i <= n; i++) {
      const [x, y] = festoonPoint(f, i / n);
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
  }
  const on = night > 0.3;
  for (let i = 4, j = 0; i < n - 2; i += 8, j++) {
    const [x, y] = festoonPoint(f, i / n);
    const c = ["#ffd27a", "#ffb84a", "#fff0c0", "#ff9a6a"][j % 4]!;
    const tw = 0.7 + 0.3 * Math.sin(t * 1.7 + j);
    if (glow) {
      if (!on) continue;
      ctx.globalAlpha = night * tw * 0.5;
      ctx.fillStyle = c;
      ctx.fillRect(Math.round(x) - 2, Math.round(y) + 1, 5, 4);
      ctx.globalAlpha = 1;
      ctx.fillRect(Math.round(x), Math.round(y) + 2, 1, 2);
    } else {
      ctx.fillStyle = OUTLINE;
      ctx.fillRect(Math.round(x) - 1, Math.round(y) + 1, 3, 4);
      ctx.fillStyle = on ? c : "#b8a888";
      ctx.fillRect(Math.round(x), Math.round(y) + 2, 1, 2);
    }
  }
}

/** The festoon's glow at night, drawn over the darkness. */
export function festoonGlow(ctx: Ctx, L: Layout, night: number, t: number): void {
  if (night > 0.3) drawFestoon(ctx, L, night, t, true);
}

export function festoonLights(L: Layout): [number, number][] {
  const f = festoon(L);
  if (!f) return [];
  const n = Math.round(f.bx - f.ax);
  const out: [number, number][] = [];
  for (let i = 12; i < n - 6; i += 24) out.push(festoonPoint(f, i / n));
  return out;
}

function drawScreenRopes(ctx: Ctx, L: Layout): void {
  const d = campData(L);
  const pair = d?.screenTrees;
  if (!pair) return;
  const tv = L.tv;
  const [l, r] = pair;
  for (const [ax, bx] of [
    [l.x + l.w - 3, tv.x + 3],
    [r.x + 3, tv.x + tv.w - 3],
  ] as const) {
    const ay = tv.y + 2;
    const n = Math.abs(bx - ax);
    for (let i = 0; i <= n; i++) {
      const k = i / Math.max(1, n);
      const x = Math.round(ax + (bx - ax) * k);
      const y = Math.round(ay - 6 + Math.sin(k * Math.PI) * 3 + k * 6);
      rect(ctx, x, y, 1, 1, "#8f7b58");
    }
    rect(ctx, ax - 2, ay - 8, 5, 3, "#8f7b58");
  }
}

/** The trees (depth-sorted with people), and the ropes to the screen. */
export function forestItems(ctx: Ctx, L: Layout, night = 0, t = 0): Drawable[] {
  ropeItem.night = night;
  ropeItem.t = t;
  const d = campData(L);
  if (!d) return [];
  const list = cached(`redwoods|forest|${L.W}x${L.H}|${d.trees.length}|${L.props.length}`, () => {
    const items: Drawable[] = d.trees.map((t) => {
      const s = treeSprite(t);
      return { z: t.base, draw: () => ropeItem.ctx?.drawImage(s.canvas, t.x - s.ox, t.base - t.h) };
    });
    if (d.screenTrees) items.push({ z: ropeItem.z, draw: () => ropeItem.ctx && ropeItem.L && drawScreenRopes(ropeItem.ctx, ropeItem.L) });
    // Lanterns hung on nails
    for (const [x, y] of treeLanterns(L)) {
      items.push({
        z: y + 60,
        draw: () => {
          const c = ropeItem.ctx;
          if (!c) return;
          const lit = ropeItem.night > 0.35;
          c.fillStyle = C.iron;
          c.fillRect(x + 2, y - 3, 3, 1);
          c.fillRect(x + 4, y - 3, 1, 2);
          c.fillStyle = OUTLINE;
          c.fillRect(x, y - 1, 5, 7);
          c.fillStyle = C.iron;
          c.fillRect(x + 1, y - 1, 3, 1);
          c.fillStyle = lit ? "#ffd27a" : C.glass;
          c.fillRect(x + 1, y, 3, 4);
          c.fillStyle = lit ? "#fff6d8" : C.flameHi;
          c.fillRect(x + 2, y + 1, 1, 2);
        },
      });
    }
    if (festoon(L)) items.push({ z: L.H + 1, draw: () => ropeItem.ctx && ropeItem.L && drawFestoon(ropeItem.ctx, ropeItem.L, ropeItem.night, ropeItem.t, false) });
    return items;
  });
  ropeItem.ctx = ctx;
  ropeItem.L = L;
  return list;
}
