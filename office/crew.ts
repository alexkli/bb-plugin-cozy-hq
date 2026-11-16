// A thread's subagents in the office: small helpers who come in through the
// door, stand next to the thread's desk while it works (pointing at the
// screen, holding up a page or a laptop, nodding along, now and then a word)
// and walk back out when they're done. The world owns one Crew; where they
// stand and how many come is decided in subagents.ts.

import { ANCHOR_X, ANCHOR_Y, charSprite, lookFor, OUTLINE, type CharPose, type Expression, type Look } from "./characters.ts";
import type { Desk, Facing, Layout, Rect } from "./layout.ts";
import { route, step, type Drawable, type Walker } from "./life.ts";
import { Grid, hash, rng, shade, SpriteCache } from "./pixel.ts";
import { drawPixelText, pixelTextWidth } from "./pixelfont.ts";
import { helperCount, helperSpots, lanyardOf, type HelperSpot } from "./subagents.ts";
import { relabel, type Theme } from "./theme.ts";

/** A thread working at a desk (or on its way there) with subagents running. */
export interface DeskWork {
  id: string;
  /** The thread's own look: its helpers wear the same shirt. */
  look: Look;
  subagents: number;
  desk: Desk;
}

type Act = "watch" | "point" | "page" | "laptop" | "nod";

interface Helper extends Walker {
  key: string;
  threadId: string;
  look: Look;
  seed: number;
  /** Where they stand once they've arrived (null on the way). */
  spot: HelperSpot | null;
  target: HelperSpot | null;
  leaving: boolean;
  /** Seconds until they come in (a few arriving at once come one after another). */
  wait: number;
  act: Act;
  actUntil: number;
  blinkAt: number;
  /** Their look in the scenery's clothes, with the crew cap (and what it was made from). */
  outfit: Look | null;
  outfitOf: Look | null;
}

const SPEED = 30;
/** What helpers say now and then (through the scenery's words). */
const LINES = ["On it", "Found it", "Checking", "Tests pass", "One sec", "Looks good", "Got it", "Almost done", "Reading docs", "Hmm", "Fixed", "See here"];
const ACTS: Act[] = ["watch", "point", "page", "laptop", "nod", "watch", "point"];

export class Crew {
  private L: Layout | null = null;
  private helpers = new Map<string, Helper>();
  /** Subagents beyond the ones standing at the desk, per thread. */
  private more = new Map<string, { n: number; desk: Desk }>();
  private spots = new Map<number, HelperSpot[]>();
  private say: { key: string; text: string; until: number } | null = null;
  private nextLine = 8;
  private lines: string[] = LINES;
  private linesFor: Theme | null = null;
  /** Place the next arrivals right away (a fresh office, a new floor plan). */
  private instant = true;
  private rand = rng((Date.now() ^ 0x5ab) >>> 0);
  /** Someone comes in or goes out: open the door. */
  private onDoor: () => void;

  constructor(onDoor: () => void) {
    this.onDoor = onDoor;
  }

  /** A new floor plan: everyone hops to their new places on the next sync. */
  setLayout(L: Layout): void {
    this.L = L;
    this.spots.clear();
    this.helpers.clear();
    this.more.clear();
    this.say = null;
    this.linesFor = null;
    this.instant = true;
  }

  private spotsAt(desk: Desk): HelperSpot[] {
    let s = this.spots.get(desk.index);
    if (!s) {
      s = helperSpots(desk);
      this.spots.set(desk.index, s);
    }
    return s;
  }

  /** Bring the helpers in line with who's working at which desk with how many subagents. */
  sync(work: readonly DeskWork[], now: number, instant = false): void {
    const L = this.L;
    if (!L) return;
    const place = instant || this.instant;
    this.instant = false;
    const wanted = new Set<string>();
    this.more.clear();
    for (const w of work) {
      const spots = this.spotsAt(w.desk);
      const { shown, more } = helperCount(w.subagents, spots.length);
      if (more > 0) this.more.set(w.id, { n: more, desk: w.desk });
      for (let slot = 0; slot < shown; slot++) {
        const key = `${w.id}#${slot}`;
        const spot = spots[slot]!;
        wanted.add(key);
        let h = this.helpers.get(key);
        if (!h) {
          h = this.newHelper(w, key, now);
          this.helpers.set(key, h);
          if (place) this.place(h, spot);
          else {
            h.wait = slot * 0.9 + this.rand() * 0.4;
            this.walkTo(h, spot);
          }
          continue;
        }
        h.leaving = false;
        if (h.spot !== spot && h.target !== spot) this.walkTo(h, spot);
      }
    }
    for (const h of this.helpers.values()) {
      if (wanted.has(h.key) || h.leaving) continue;
      if (h.wait > 0) {
        // Never came in: they needn't walk out either.
        this.helpers.delete(h.key);
        continue;
      }
      h.leaving = true;
      h.spot = null;
      h.target = null;
      h.path = route(h, L.net, L.entrancePath);
    }
  }

  private newHelper(w: DeskWork, key: string, now: number): Helper {
    const L = this.L!;
    const seed = hash(key);
    // Anonymous (a face of their own) in the thread's shirt; the cap comes with the outfit.
    const face = lookFor(`${key}|helper`, 0);
    const look: Look = { ...face, accessory: face.accessory === "glasses" ? "glasses" : "none", shirt: w.look.shirt, key: `helper|${face.key}|${w.look.shirt}` };
    return {
      key,
      threadId: w.id,
      look,
      seed,
      x: L.entrance.x,
      y: L.entrance.y,
      path: [],
      approach: [L.entrancePath[0]!, L.entrance],
      facing: "front",
      walked: 0,
      lane: { x: ((seed >>> 2) % 9) - 4, y: ((seed >>> 6) % 7) - 3 },
      cut: 8 + ((seed >>> 9) % 8),
      sway: 1 + ((seed >>> 13) % 3),
      spot: null,
      target: null,
      leaving: false,
      wait: 0,
      act: "watch",
      actUntil: now + 2 + (seed % 5),
      blinkAt: now + 1 + (seed % 4),
      outfit: null,
      outfitOf: null,
    };
  }

  private place(h: Helper, spot: HelperSpot): void {
    h.x = spot.x;
    h.y = spot.y;
    h.spot = spot;
    h.target = null;
    h.path = [];
    h.approach = [...spot.path];
    h.facing = spot.facing;
  }

  private walkTo(h: Helper, spot: HelperSpot): void {
    h.path = route(h, this.L!.net, spot.path);
    h.spot = null;
    h.target = spot;
  }

  update(dt: number, now: number): void {
    for (const h of this.helpers.values()) {
      if (h.wait > 0) {
        h.wait -= dt;
        if (h.wait <= 0) this.onDoor();
        continue;
      }
      if (h.path.length > 0 && step(h, dt, SPEED * (0.9 + ((h.seed >>> 11) % 20) / 100))) {
        if (h.leaving) {
          this.helpers.delete(h.key);
          this.onDoor();
          continue;
        }
        if (h.target) this.place(h, h.target);
      }
      if (h.spot && now > h.actUntil) {
        h.act = ACTS[Math.floor(this.rand() * ACTS.length)]!;
        h.actUntil = now + 2.5 + this.rand() * 4;
      }
      if (now > h.blinkAt + 0.15) h.blinkAt = now + 2 + this.rand() * 4;
    }
    if (this.say && now > this.say.until) this.say = null;
    if (now > this.nextLine) {
      this.nextLine = now + 14 + this.rand() * 20;
      const settled = [...this.helpers.values()].filter((h) => h.spot !== null);
      const h = settled[Math.floor(this.rand() * settled.length)];
      if (h) this.say = { key: h.key, text: this.lines[Math.floor(this.rand() * this.lines.length)]!, until: now + 2.6 };
    }
  }

  private poseOf(h: Helper, now: number): { pose: CharPose; expr: Expression; facing: Facing; dip: number } {
    const blink = now > h.blinkAt && now < h.blinkAt + 0.15;
    if (!h.spot) {
      const frame = Math.floor(h.walked / 4) % 4;
      return { pose: `walk${frame}` as CharPose, expr: blink ? "blink" : "open", facing: h.facing, dip: 0 };
    }
    const s = h.spot;
    const talking = this.say?.key === h.key;
    if (talking) return { pose: "stand", expr: Math.floor(now * 7) % 2 ? "open" : "happy", facing: s.facing, dip: 0 };
    switch (h.act) {
      case "point":
        // Pointing something out on the screen.
        return { pose: "raise", expr: "focus", facing: s.screen, dip: 0 };
      case "page":
        return { pose: "present", expr: blink ? "blink" : "happy", facing: s.facing, dip: 0 };
      case "laptop":
        // Reading along on a laptop of their own, its lid toward you.
        return { pose: "stand", expr: "focus", facing: "front", dip: 0 };
      case "nod":
        return { pose: "stand", expr: "happy", facing: s.facing, dip: Math.floor((now + (h.seed % 5) / 5) * 3) % 2 };
      default:
        return { pose: "stand", expr: blink ? "blink" : "focus", facing: s.screen, dip: 0 };
    }
  }

  /** Helpers to draw, depth-sorted with everyone else. */
  items(ctx: CanvasRenderingContext2D, now: number, dress: (look: Look, id: string) => Look): Drawable[] {
    const out: Drawable[] = [];
    for (const h of this.helpers.values()) {
      if (h.wait > 0) continue;
      out.push({ z: h.y + 0.45, draw: () => this.drawHelper(ctx, h, now, dress) });
    }
    return out;
  }

  private drawHelper(ctx: CanvasRenderingContext2D, h: Helper, now: number, dress: (look: Look, id: string) => Look): void {
    const { pose, expr, facing, dip } = this.poseOf(h, now);
    // Dressed for the scenery like everyone, then a cap in their shirt's color: the thread's crew.
    const dressed = dress(h.look, h.key);
    if (h.outfitOf !== dressed) {
      h.outfitOf = dressed;
      h.outfit = { ...dressed, hairStyle: "cap", accent: dressed.shirt, key: `${dressed.key}|crew` };
    }
    const look = h.outfit!;
    const sprite = charSprite({ look, facing, pose, expr, short: true });
    const x = Math.round(h.x);
    const y = Math.round(h.y) + dip;
    ctx.fillStyle = "rgba(40,20,30,0.18)";
    ctx.fillRect(x - 4, Math.round(h.y) - 1, 8, 2);
    ctx.drawImage(sprite, x - ANCHOR_X, y - ANCHOR_Y);
    if (h.spot && h.act === "laptop" && this.say?.key !== h.key) drawLaptop(ctx, x, y, look.shirt);
  }

  /** Words and "+n" tags, drawn over everything. */
  drawOverlay(ctx: CanvasRenderingContext2D, theme: Theme): void {
    if (this.linesFor !== theme) {
      this.linesFor = theme;
      const words = { ...theme.labels?.words, ...this.L?.words };
      const named: Theme = { ...theme, labels: { ...theme.labels, words } };
      this.lines = LINES.map((l) => relabel(named, l));
    }
    if (this.say) {
      const h = this.helpers.get(this.say.key);
      if (h?.spot) bubble(ctx, this.say.text, Math.round(h.x), Math.round(h.y) - 23, true, this.L!.W);
    }
    for (const { n, desk } of this.more.values()) {
      const at = this.tagAt(desk);
      bubble(ctx, `+${n}`, at.x, at.y, false, this.L!.W);
    }
  }

  /** Where a desk's "+n" tag goes: over the helper who stands highest, so it never hides the thread. */
  private tagAt(desk: Desk): { x: number; y: number } {
    const top = this.spotsAt(desk).reduce((a, b) => (b.y < a.y ? b : a));
    return { x: top.x + 8, y: top.y - 24 };
  }

  /** Helpers you can click (front ones first) and the "+n" tags, each with its thread and box. */
  targets(): { id: string; key: string; rect: Rect }[] {
    const out: { id: string; key: string; rect: Rect }[] = [];
    const shown = [...this.helpers.values()].filter((h) => h.wait <= 0 && !h.leaving).sort((p, q) => q.y - p.y);
    for (const h of shown) out.push({ id: h.threadId, key: h.key, rect: { x: h.x - 6, y: h.y - 21, w: 13, h: 23 } });
    for (const [id, { n, desk }] of this.more) {
      const at = this.tagAt(desk);
      const half = (pixelTextWidth(`+${n}`) + 6) / 2;
      out.push({ id, key: `${id}#0`, rect: { x: at.x - half, y: at.y - 10, w: half * 2 + 1, h: 12 } });
    }
    return out;
  }

  /** Native point above a helper's head, for the hover marker. */
  anchorOf(key: string): { x: number; y: number } | null {
    const h = this.helpers.get(key);
    return h ? { x: h.x, y: h.y - 24 } : null;
  }
}

const COVERED = new Set<CharPose>(["present", "present-plan", "read"]);
const lanyards = new SpriteCache();

/**
 * A lanyard in the family's color, drawn over a 20×28 character sprite whose
 * top-left is (sx, sy): the cord around the neck and down the left side to
 * a little card at the hip, clear of the shirt badge in the middle.
 */
export function drawLanyard(ctx: CanvasRenderingContext2D, sx: number, sy: number, facing: Facing, pose: CharPose, family: string): void {
  const color = lanyardOf(family);
  const covered = COVERED.has(pose);
  const sprite = lanyards.get(`${color}|${facing}|${covered}`, () => {
    const g = new Grid(20, 28);
    const card = (x: number, y: number, w: number) => g.rect(x, y, w, 3, shade(color, -0.15)).set(x, y + 1, "#ffffff");
    if (facing === "back") g.rect(6, 14, 2, 1, color).rect(10, 14, 2, 1, color);
    else if (facing === "front") {
      g.set(7, 14, color).set(10, 14, color);
      if (!covered) {
        g.rect(6, 15, 1, 2, color);
        card(5, 17, 2);
      }
    } else {
      // In profile: around the neck, the card at the chest.
      g.rect(9, 14, 3, 1, color);
      if (!covered) {
        g.set(12, 15, color);
        card(12, 16, 1);
      }
    }
    return facing === "left" ? g.flipped() : g;
  });
  ctx.drawImage(sprite, sx, sy + (pose === "walk1" || pose === "walk3" ? -1 : 0));
}

/** An open laptop held at the chest of a short helper standing at (x, y), the lid toward you. */
function drawLaptop(ctx: CanvasRenderingContext2D, x: number, y: number, sticker: string): void {
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(x - 5, y - 11, 10, 7);
  ctx.fillStyle = "#c9ced6";
  ctx.fillRect(x - 4, y - 10, 8, 5);
  ctx.fillStyle = "#e4e8ee";
  ctx.fillRect(x - 4, y - 10, 8, 1);
  ctx.fillStyle = sticker;
  ctx.fillRect(x - 1, y - 8, 2, 2);
}

/** A tiny pixel-font bubble (or tag) at (cx, bottom), kept inside a panel `width` wide. */
function bubble(ctx: CanvasRenderingContext2D, text: string, cx: number, bottom: number, tail: boolean, width: number): void {
  const w = pixelTextWidth(text) + 4;
  const x = Math.max(2, Math.min(width - w - 2, Math.round(cx - w / 2)));
  const y = bottom - 9;
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(x - 1, y - 1, w + 2, 11);
  if (tail) ctx.fillRect(cx - 1, y + 9, 3, 3);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x, y, w, 9);
  if (tail) ctx.fillRect(cx, y + 9, 1, 2);
  drawPixelText(ctx, text, x + 2, y + 2, OUTLINE);
}
