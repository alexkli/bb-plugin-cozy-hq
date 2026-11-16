// Sky Loft: everything live. The linear LED track and its wall wash, the
// lower glass and floor reflections, a few objects on the
// floor, and the lights that warm the loft at night.
import type { Drawable, Light, PaintInfo, WallLightsInfo } from "../../theme.ts";
import type { Layout, Rect } from "../../layout.ts";
import { cached, floorPlan, makeCanvas, OUTLINE } from "../../themekit.ts";
import { segKind } from "./background.ts";
import { C, clamp, sprite } from "./kit.ts";
import { drawLowerPanes, duskness } from "./view.ts";

const layoutKey = (L: Layout) => `${L.W}x${L.H}|${L.props.length}|${L.spots.length}`;

/** The bulb grid the technician knows (the classic string-light spacing). */
function bulbXs(L: Layout): number[] {
  return cached(`skyline|bulbs|${layoutKey(L)}`, () => {
    const out: number[] = [];
    for (const seg of L.segments) {
      for (let x0 = seg.x0 + 6; x0 < seg.x1 - 6; x0 += 100) {
        const x1 = Math.min(seg.x1 - 6, x0 + 100);
        if (x1 - x0 < 30) continue;
        for (let x = x0; x < x1; x++) if ((x - x0) % 10 === 5) out.push(x);
      }
    }
    return out;
  });
}

const inside = (x: number, r: Rect, pad = 0) => x >= r.x - pad && x < r.x + r.w + pad;

/** Where the downlights wash the wall: plaster and walnut, not over glass or the TV. */
function scallops(L: Layout): { x: number; depth: number; warm: boolean }[] {
  return cached(`skyline|scallops|${layoutKey(L)}`, () => {
    const out: { x: number; depth: number; warm: boolean }[] = [];
    for (const sg of L.segments) {
      const kind = segKind(L, sg);
      const n = Math.max(1, Math.round((sg.x1 - sg.x0) / 46));
      const step = (sg.x1 - sg.x0) / n;
      for (let i = 0; i < n; i++) {
        const x = Math.round(sg.x0 + step * (i + 0.5));
        if (L.wall.windows.some((w) => inside(x, w, 6))) continue;
        if (L.tv.y < sg.depth && inside(x, L.tv, 4)) continue;
        if (Math.abs(x - L.wall.door.x - L.wall.door.w / 2) < 14) continue;
        out.push({ x, depth: sg.depth, warm: kind !== "glass" });
      }
    }
    return out;
  });
}

function washSprite(rgb = "255,214,160"): HTMLCanvasElement {
  return cached(`skyline|wash|${rgb}`, () =>
    makeCanvas(24, 40, (ctx) => {
      for (let y = 0; y < 40; y++) {
        const spread = 2 + y * 0.32;
        const fade = Math.pow(1 - y / 40, 1.4);
        for (let x = 0; x < 24; x++) {
          const dx = Math.abs(x - 11.5) / spread;
          if (dx > 1) continue;
          const a = (1 - dx * dx) * fade * (y < 3 ? 1 : 0.85);
          ctx.fillStyle = `rgba(${rgb},${a.toFixed(3)})`;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }),
  );
}

const PARTY = ["255,90,120", "255,170,60", "250,230,90", "110,230,140", "80,200,255", "150,120,255", "240,110,230"];
const partyRgb = (x: number, t: number) => PARTY[Math.floor(((x * 4 - t * 260) / 360) * PARTY.length + 1000 * PARTY.length) % PARTY.length]!;

/** The linear LED track along the ceiling line; a color chase when clicked. */
export function skylineWallLights(ctx: CanvasRenderingContext2D, L: Layout, info: WallLightsInfo, glow: boolean): void {
  const t = info.t;
  const night = info.party ? Math.max(info.night, 0.8) : info.night;
  const on = night > 0.25;
  const dead = info.brokenBulbX;
  const deadNow = dead !== null && Math.floor(t * 9) % 7 !== 0;
  const isDead = (x: number) => dead !== null && deadNow && x >= dead - 5 && x <= dead + 4;
  if (!glow) {
    for (const sg of L.segments) {
      for (let x = sg.x0 + 2; x < sg.x1 - 2; x++) {
        if (isDead(x)) {
          ctx.fillStyle = "#3a3d44";
          ctx.fillRect(x, 2, 1, 2);
          continue;
        }
        if (info.party) {
          ctx.fillStyle = `rgb(${partyRgb(x, t)})`;
          ctx.fillRect(x, 2, 1, 2);
        } else {
          ctx.fillStyle = on ? "#fff6e4" : "#dfe2e6";
          ctx.fillRect(x, 2, 1, 1);
          ctx.fillStyle = on ? "#f2d9b0" : "#9aa0a8";
          ctx.fillRect(x, 3, 1, 1);
        }
      }
      // Driver joints every 10 px along the track.
      ctx.fillStyle = "#2a2d33";
      for (const bx of bulbXs(L)) if (bx >= sg.x0 && bx < sg.x1) ctx.fillRect(bx + 5, 2, 1, 2);
    }
    if (dead !== null) {
      // The dead section: a scorched driver.
      ctx.fillStyle = deadNow ? "#5a4a46" : "#fff6e4";
      ctx.fillRect(dead - 1, 2, 2, 2);
    }
    return;
  }
  if (!on && !info.party) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  // A soft line of light under the track.
  for (const sg of L.segments) {
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = info.party ? `rgba(200,160,255,${(0.16 - i * 0.04) * night})` : `rgba(255,220,170,${(0.2 - i * 0.05) * night})`;
      ctx.fillRect(sg.x0 + 2, 4 + i, sg.x1 - sg.x0 - 4, 1);
    }
  }
  // Scallops of light washing down the wall (colored during the show).
  for (const s of scallops(L)) {
    if (isDead(s.x)) continue;
    const wash = info.party ? washSprite(partyRgb(s.x, t)) : washSprite();
    ctx.globalAlpha = clamp(night * (info.party ? 0.8 : s.warm ? 0.55 : 0.3), 0, 1);
    ctx.drawImage(wash, s.x - 12, 4, 24, Math.min(40, s.depth - 7));
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function reflectionSprite(w: number, rgb: string): HTMLCanvasElement {
  return cached(`skyline|refl|${w}|${rgb}`, () =>
    makeCanvas(w, 30, (ctx) => {
      for (let y = 0; y < 30; y++) {
        const a = Math.pow(1 - y / 30, 1.6);
        for (let x = 0; x < w; x++) {
          const edge = Math.min(x, w - 1 - x);
          if (edge < 1) continue;
          const k = Math.min(1, edge / 4) * a * ((x + y) % 2 === 0 ? 1 : 0.7);
          ctx.fillStyle = `rgba(${rgb},${(k * 0.9).toFixed(3)})`;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }),
  );
}

/** The lower glass, and the windows mirrored in the polished floor. */
export function skylineUnderlay(ctx: CanvasRenderingContext2D, L: Layout, info: PaintInfo): void {
  drawLowerPanes(ctx, L, info);
  const gloomy = info.weather !== "clear" && info.weather !== "partly";
  for (const win of L.wall.windows) {
    const sg = L.segments.find((s) => win.x >= s.x0 && win.x < s.x1);
    if (!sg) continue;
    // By day the bright glass; at night the warm city glow.
    const spr = reflectionSprite(win.w - 8, info.night > 0.5 ? "255,200,140" : "255,255,255");
    ctx.globalAlpha = info.night > 0.5 ? 0.14 : gloomy ? 0.1 : 0.2;
    ctx.drawImage(spr, win.x + 4, sg.depth + 1);
    ctx.globalAlpha = 1;
  }
}

// ------------------------------------------------------------------ decor

function telescope(): HTMLCanvasElement {
  return sprite("telescope", 16, 26, (g) => {
    // Brass refractor on a black tripod, aimed out the window.
    g.line(11, 3, 5, 10, C.brass).line(12, 4, 6, 11, C.brass).line(11, 4, 5, 11, C.brassLo);
    g.rect(10, 2, 3, 3, C.brassHi);
    g.rect(4, 10, 3, 2, "#2a2c31");
    g.rect(7, 11, 2, 3, "#2a2c31");
    g.line(8, 14, 3, 24, "#2a2c31").line(8, 14, 13, 24, "#2a2c31").line(8, 14, 8, 24, "#3a3d44");
    g.outline(OUTLINE);
  });
}

function umbrellaStand(): HTMLCanvasElement {
  return sprite("umbrellas", 12, 20, (g) => {
    g.rect(3, 9, 6, 10, "#2a2c31");
    g.rect(4, 9, 1, 10, "#41454e");
    g.rect(3, 8, 6, 1, C.brass);
    g.line(4, 8, 3, 2, C.navy).line(5, 8, 5, 1, C.navy);
    g.rect(2, 1, 2, 1, "#1d1f24").set(2, 2, "#1d1f24");
    g.line(7, 8, 8, 3, C.terra).rect(8, 2, 2, 1, "#5a3a24").set(10, 3, "#5a3a24");
    g.outline(OUTLINE);
  });
}

function floorVase(): HTMLCanvasElement {
  return sprite("floor-vase", 14, 30, (g) => {
    g.rect(4, 16, 6, 12, "#efebe4");
    g.rect(5, 14, 4, 2, "#efebe4");
    g.rect(4, 16, 1, 12, "#ffffff");
    g.rect(9, 17, 1, 11, "#d6d1c8");
    // Dried pampas and branches.
    const stems: [number, number, number, number][] = [
      [6, 14, 2, 1],
      [7, 14, 7, 0],
      [8, 14, 12, 2],
      [6, 14, 4, 6],
    ];
    for (const [x0, y0, x1, y1] of stems) g.line(x0, y0, x1, y1, "#a08a6a");
    for (const [x, y] of [[2, 1], [7, 0], [12, 2], [4, 6], [3, 2], [11, 3], [8, 1]] as const) {
      g.rect(x - 1, y, 2, 2, "#e8dcc2");
      g.set(x, y - 1, "#f2e9d6");
    }
    g.outline(OUTLINE);
  });
}

function sculpture(): HTMLCanvasElement {
  return sprite("sculpture", 14, 28, (g) => {
    g.rect(2, 14, 10, 13, "#f2f0ec");
    g.rect(2, 14, 10, 1, "#ffffff");
    g.rect(11, 15, 1, 12, "#d9d5ce");
    g.ellipse(7, 7, 4.5, 4.5, C.brass);
    for (let y = 5; y <= 9; y++) for (let x = 5; x <= 9; x++) if ((x - 7) ** 2 + (y - 7) ** 2 <= 4) g.set(x, y, null);
    g.set(4, 5, C.brassHi).set(5, 4, C.brassHi);
    g.rect(6, 12, 2, 2, C.brassLo);
    g.outline(OUTLINE);
  });
}

interface DecorPlan {
  items: { canvas: HTMLCanvasElement; x: number; y: number; z: number }[];
}

function plan(L: Layout): DecorPlan {
  return cached(`skyline|decor|${layoutKey(L)}`, () => {
    const fp = floorPlan(L);
    const items: DecorPlan["items"] = [];
    const taken: Rect[] = [];
    const ev = L.eventArea;
    const apart = (r: Rect, o: Rect, m: number) => r.x + r.w < o.x - m || r.x > o.x + o.w + m || r.y + r.h < o.y - m || r.y > o.y + o.h + m;
    const closed = L.rooms.filter((room) => room.walls).map((room) => room.rect);
    const clearOfEvents = (r: Rect) => apart(r, ev, 8) && closed.every((c) => apart(r, c, 4));
    const place = (c: HTMLCanvasElement, within: Rect | undefined, pick: "first" | "last" = "first", anywhere = false) => {
      const spots = fp
        .find(c.width + 2, c.height, 24, within)
        .filter((r) => (anywhere ? apart(r, ev, 8) : clearOfEvents(r)) && !taken.some((o) => Math.abs(o.x - r.x) < 48 && Math.abs(o.y - r.y) < 48));
      const r = pick === "first" ? spots[0] : spots[spots.length - 1];
      if (!r) return false;
      taken.push(r);
      items.push({ canvas: c, x: r.x + 1, y: r.y, z: r.y + c.height - 1 });
      return true;
    };
    // A telescope by the glass, umbrellas by the elevator.
    for (const win of L.wall.windows) {
      const sg = L.segments.find((s) => win.x >= s.x0 && win.x < s.x1);
      if (sg && place(telescope(), { x: win.x - 10, y: sg.depth + 2, w: win.w + 20, h: 40 }, "first", true)) break;
    }
    const d = L.wall.door;
    const dseg = L.segments.find((s) => d.x >= s.x0 && d.x < s.x1);
    place(umbrellaStand(), { x: d.x - 34, y: (dseg?.depth ?? 64) + 1, w: d.w + 68, h: 30 });
    place(floorVase(), { x: L.lounge.x, y: L.lounge.y, w: L.lounge.w, h: L.lounge.h });
    place(sculpture(), { x: L.waiting.x, y: L.waiting.y, w: L.waiting.w, h: L.waiting.h }, "last");
    if (!items.some((it) => it.canvas === floorVase())) place(floorVase(), undefined, "last");
    return { items };
  });
}

export function skylineDecor(ctx: CanvasRenderingContext2D, L: Layout): Drawable[] {
  const P = plan(L);
  const out: Drawable[] = [];
  for (const it of P.items) out.push({ z: it.z, draw: () => ctx.drawImage(it.canvas, it.x, it.y) });
  return out;
}

// ------------------------------------------------------------------ night lights

export function skylineLights(L: Layout, info: PaintInfo): Light[] {
  const base = cached(`skyline|lights|${layoutKey(L)}`, () => {
    const out: Light[] = [];
    for (const pod of L.pods) {
      for (const k of [0.25, 0.75]) out.push([pod.x + pod.w * k, pod.y + pod.h / 2, 46, 0.42, "#ffe2b8", 0.05]);
    }
    for (const p of L.props) {
      const w = p.w ?? 0;
      switch (p.kind) {
        case "kitchen-island":
          for (const k of [0.2, 0.5, 0.8]) out.push([p.x + 1 + (w || 72) * k, p.y + 6, 22, 0.75, "#ffd59a", 0.2]);
          break;
        case "meeting-table":
          out.push([p.x + 20, p.y + 10, 34, 0.6, "#ffe7c0", 0.1], [p.x + 48, p.y + 10, 34, 0.6, "#ffe7c0", 0.1]);
          break;
        case "reception":
          out.push([p.x + 18, p.y + 8, 32, 0.65, "#ffd9a0", 0.14]);
          break;
        case "couch":
          out.push([p.x + 42, p.y + 12, 54, 0.45, "#ffd9a0", 0.08]);
          break;
        case "pingpong":
          out.push([p.x + 38, p.y + 8, 40, 0.6, "#fff3dc", 0.08]);
          break;
        case "library-table":
          out.push([p.x + 23, p.y + 10, 22, 0.7, "#ffcf8a", 0.16]);
          break;
        case "waiting-sofa":
          out.push([p.x + (w || 42) / 2, p.y + 12, 34, 0.35, "#ffe2b8", 0.04]);
          break;
        case "vending":
          out.push([p.x + 10, p.y + 18, 18, 0.6, "#cfe8ff", 0.12]);
          break;
        default:
          break;
      }
    }
    for (const win of L.wall.windows) {
      const sg = L.segments.find((s) => win.x >= s.x0 && win.x < s.x1);
      out.push([win.x + win.w / 2, (sg?.depth ?? 64) + 6, 40, 0.42, "#ffc9a0", 0.05]);
      out.push([win.x + win.w / 2, win.y + win.h + 8, 22, 0.55, "#ffd9a0", 0.06]);
    }
    for (const s of scallops(L)) if (s.warm) out.push([s.x, s.depth - 12, 22, 0.4, "#ffe0b0", 0.04]);
    // Recessed downlights in a grid over the floor: warm pools on the concrete.
    const top = Math.max(...L.segments.map((sg) => sg.depth)) + 26;
    for (let y = top, row = 0; y < L.H - 10; y += 84, row++) {
      for (let x = 48 + (row % 2) * 48; x < L.W - 20; x += 96) out.push([x, y, 36, 0.34, "#ffd9a8", 0.05]);
    }
    return out;
  });
  // Golden hour: low sun spilling in through the glass.
  const dusk = duskness(info.hour);
  if (dusk < 0.05 || (info.weather !== "clear" && info.weather !== "partly")) return base;
  const out = base.slice();
  for (const win of L.wall.windows) {
    const sg = L.segments.find((s) => win.x >= s.x0 && win.x < s.x1);
    out.push([win.x + win.w / 2 + 8, (sg?.depth ?? 64) + 24, 84, 0.55 * dusk, "#ffa055", 0.34 * dusk]);
  }
  return out;
}

