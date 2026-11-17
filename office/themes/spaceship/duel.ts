// Spaceship: a rare Easter egg. About once every couple of hours with the
// office open (or when you find the tiny unlabeled switch on the side of a
// rear-deck panel, or the loose floor panel on a smaller bridge) the airlock
// cycles and a boarding party marches onto the bridge: a pirate admiral in
// chrome plates and a plumed hat, with a mechanical arm, a plasma cutlass
// and a parrot-drone on the shoulder; a scrappy young deckhand in overalls
// and goggles with a borrowed welding-torch blade that sputters; and a
// fortune-teller in a patchwork shawl who cheers from the corner and tosses
// glowing cards that fizzle harmlessly on the carpet. The crew duck, the
// admiral and the deckhand duel up and down the bridge, the admiral steps on
// a stray coffee mug and goes over, and they all bow, apologise and leave
// the way they came. Slapstick: nobody gets hurt. Everything is drawn from
// SHIP.duelAt; per frame it's three sprites, two blades and a few pixels.
import type { CharPose, Expression } from "../../characters.ts";
import type { Facing, Layout, Point, Rect } from "../../layout.ts";
import type { Drawable, Light, PoseOf, SceneryActions, SoundRecipe } from "../../theme.ts";
import { Grid, cached, drawPixelText, pixelTextWidth } from "../../themekit.ts";
import { done, fill } from "./pal.ts";
import { planOf, type ShipPlan } from "./plan.ts";
import { ih } from "./space.ts";
import { SHIP, floatK, since } from "./state.ts";

type Duel = NonNullable<ShipPlan["duel"]>;

// ------------------------------------------------------------------ the timeline (seconds from the start)

export const DUEL_LEN = 36;
const OPEN = 2.4; // the airlock door slides open
const MARCH = [2.6, 3.1, 3.6]; // admiral, deckhand, fortune-teller step in
const FIGHT = 8; // blades on
const SWAP = 17; // the deckhand vaults over the admiral (1 s)
const CUP = 21.5; // a stray coffee mug comes drifting along
const SLIP = 25.5; // ... and the admiral steps on it
const LAND = 26.3;
const UP = 28; // back on his feet (0.6 s)
const BOW = 29; // all three bow (1.4 s)
const LEAVE = [31.4, 31, 30.6]; // and march out (fortune-teller first)
const SHUT = 34.4; // the door shuts behind them, the airlock cycles
const CARDS = [10, 13.2, 16.4, 20.1, 23.4];
const SPUTTER = [12.3, 15.2, 19.6, 23.1];
/** When the blades meet (the gap closes every π/2.2 s), but not mid-vault. */
const CLASHES = Array.from({ length: 12 }, (_, i) => FIGHT + ((i + 1) * Math.PI) / 2.2).filter((c) => c < SLIP - 0.3 && Math.abs(c - SWAP - 0.5) > 0.8);

/** What the boarders say (0 admiral, 1 deckhand, 2 fortune-teller, 3 the parrot-drone). */
const LINES: [0 | 1 | 2 | 3, number, number, string][] = [
  [0, 6, 7.8, "AHOY! THIS BRIDGE IS OURS!"],
  [1, 7.9, 9.1, "AND THE SNACKS!"],
  [2, 9.4, 11, "THE CARDS SAY: DUCK!"],
  [3, 11.2, 12.4, "SQUAWK! BEEP BOOP!"],
  [1, 15, 16.6, "IT'S BORROWED!"],
  [2, 18, 19.6, "OOH! THE TOWER!"],
  [0, 20.2, 21.6, "HAVE AT YOU! POLITELY!"],
  [2, 23.4, 25, "I SEE... A MUG."],
  [0, 26.4, 27.6, "MY DIGNITY!"],
  [1, 27.7, 28.9, "ARE YOU OK?!"],
  [0, 29, 30.3, "TERRIBLY SORRY. WRONG SHIP."],
  [1, 30.4, 31.6, "SORRY ABOUT THE CARPET!"],
  [2, 31.2, 32.6, "I SAW THIS COMING."],
];

/** And the crew, ducking behind their consoles (index into whoever's nearest the bridge, "boss" for you). */
const CREW: [number | "boss", number, string][] = [
  [0, 1.4, "Is someone using the airlock?"],
  [1, 6.4, "Not on my clean carpet!"],
  [0, 9.2, "Everyone behind the consoles!"],
  ["boss", 10.8, "Oh, this I have to see."],
  [2, 15.6, "Should we… do something?"],
  [1, 21.4, "My money's on the kid."],
  [0, 26.6, "He's fine! He's fine."],
  ["boss", 30.6, "Apology accepted. Mind the step."],
  [2, 33, "Bye! Wipe your boots next time!"],
];

const ease = (x: number) => {
  const u = Math.max(0, Math.min(1, x));
  return u * u * (3 - 2 * u);
};

/** Seconds into the duel, or -1 when there isn't one. */
export function duelK(t: number): number {
  return since(SHIP.duelAt, t, DUEL_LEN);
}

// ------------------------------------------------------------------ starting it

/** Board the bridge: set the clock, line up the crew's remarks. The sound is the whole show's. */
export function startDuel(act: SceneryActions): string | null {
  const d = planOf(act.L)?.duel;
  if (!d || d.x1 - d.x0 < 60 || duelK(act.t) >= 0) return null;
  SHIP.duelAt = act.t;
  const plan = planOf(act.L)!;
  const r = plan.bridge;
  const crew = act.near(r.x + r.w / 2, r.y + r.h / 2, Math.max(r.w, r.h) * 0.6 + 60);
  for (const [who, at, text] of CREW) {
    const id = who === "boss" ? "boss" : crew[who % Math.max(1, Math.min(3, crew.length))]?.id;
    if (id) act.say(id, text, 2.6, at);
  }
  return "ship-duel";
}

/** On its own, now and then: about once every couple of hours of office time (never twice within half an hour). */
export function duelTick(act: SceneryActions): void {
  const d = planOf(act.L)?.duel;
  if (!d || duelK(act.t) >= 0 || act.t - SHIP.duelAt < 1800) return;
  if (since(SHIP.alertAt, act.t, 8) >= 0 || since(SHIP.hailAt, act.t, 8) >= 0) return;
  if (Math.random() > 0.5 / 7200) return;
  const sound = startDuel(act);
  if (sound) act.play(sound);
}

// ------------------------------------------------------------------ who's where

interface Body {
  x: number;
  y: number;
  face: 1 | -1;
  /** 0 stand, 1 step, 2 lunge. */
  legs: 0 | 1 | 2;
  rot: number;
  up: number;
  show: boolean;
}

interface Cast {
  T: number;
  adm: Body;
  hand: Body;
  seer: Body;
  /** The blades meet over the middle (sparks), or null. */
  clash: Point | null;
  mid: number;
  hat: Point & { flip: boolean };
  cup: (Point & { spin: number }) | null;
  cheer: boolean;
}

/** The two duellists at k seconds into the fight (k ≥ 0), before any slip. */
function fight(d: Duel, k: number): { a: Point & { up: number }; h: Point & { up: number }; legs: 0 | 1 | 2; meet: boolean } {
  const amp = Math.max(0, Math.min(46, (d.x1 - d.x0) / 2 - 22));
  // (Starting right of your chair, nearer the lift they came in by; the slip lands just left of it, in plain view.)
  const m = d.cx + amp * Math.sin(k * 0.42 + 2.78);
  const wave = Math.abs(Math.sin(k * 2.2));
  const gap = 12 + 6 * wave + Math.max(0, 1 - k) * 20;
  let ax = m - gap / 2;
  let hx = m + gap / 2;
  let hUp = 0;
  let aUp = 0;
  if (k >= SWAP - FIGHT + 1) [ax, hx] = [hx, ax];
  else if (k >= SWAP - FIGHT) {
    // The vault: the deckhand goes over the top, the admiral ducks under.
    const u = ease(k - (SWAP - FIGHT));
    [ax, hx] = [m - gap / 2 + gap * u, m + gap / 2 - gap * u];
    hUp = Math.sin(Math.PI * (k - (SWAP - FIGHT))) * 20;
  }
  if (k >= 4 && k < 4.6) aUp = Math.sin((Math.PI * (k - 4)) / 0.6) * 8;
  if (k >= 13 && k < 13.5) hUp = Math.sin((Math.PI * (k - 13)) / 0.5) * 9;
  const vault = k > SWAP - FIGHT - 0.2 && k < SWAP - FIGHT + 1.2;
  return { a: { x: ax, y: d.lane, up: aUp }, h: { x: hx, y: d.lane, up: hUp }, legs: wave < 0.35 ? 2 : Math.floor(k * 5) % 2 ? 1 : 0, meet: k >= 1 && !vault && wave < 0.14 };
}

/** Walking from a to b at 30 px/s from `start`: where they are, and whether they've got there. */
function walk(a: Point, b: Point, T: number, start: number): { p: Point; moving: boolean; there: boolean; started: boolean } {
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  const u = dist < 1 ? 1 : Math.max(0, Math.min(1, ((T - start) * 30) / dist));
  return { p: { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u }, moving: T >= start && u < 1, there: u >= 1, started: T >= start };
}

let memo: { t: number; key: Duel | null; cast: Cast | null } = { t: -1, key: null, cast: null };

function castAt(d: Duel, t: number): Cast | null {
  const T = duelK(t);
  if (T < 0) return null;
  if (memo.t === t && memo.key === d) return memo.cast;
  const start = fight(d, 0);
  const end = fight(d, SLIP - FIGHT);
  const k = Math.max(0, Math.min(T, SLIP) - FIGHT);
  const now = fight(d, k);
  const homes = [start.a, start.h, d.corner];
  const lastSpots = [end.a, end.h, d.corner];
  const bodies: Body[] = [0, 1, 2].map((i) => {
    const b: Body = { x: 0, y: 0, face: 1, legs: 0, rot: 0, up: 0, show: true };
    if (T < LEAVE[i]!) {
      const w = walk(d.door, homes[i]!, T, MARCH[i]!);
      b.show = w.started;
      if (!w.there) {
        b.x = w.p.x;
        b.y = w.p.y;
        b.face = homes[i]!.x < d.door.x ? -1 : 1;
        b.legs = w.moving && Math.floor(T * 5) % 2 ? 1 : 0;
        return b;
      }
      if (i === 2) {
        b.x = d.corner.x;
        b.y = d.corner.y;
        return b;
      }
      const p = T >= FIGHT ? (i === 0 ? now.a : now.h) : homes[i]!;
      b.x = p.x;
      b.y = p.y;
      b.up = "up" in p ? (p as { up: number }).up : 0;
      b.legs = T >= FIGHT && T < SLIP ? now.legs : 0;
      return b;
    }
    const w = walk(lastSpots[i]!, d.door, T, LEAVE[i]!);
    b.show = !w.there;
    b.x = w.p.x;
    b.y = w.p.y;
    b.face = d.door.x < lastSpots[i]!.x ? -1 : 1;
    b.legs = Math.floor(T * 5) % 2 ? 1 : 0;
    return b;
  });
  const [adm, hand, seer] = bodies as [Body, Body, Body];
  // Facing each other while they fight (and the fortune-teller faces the fight).
  const mid = (adm.x + hand.x) / 2;
  if (T >= MARCH[1]! + 1.5 && T < LEAVE[1]!) {
    adm.face = hand.x >= adm.x ? 1 : -1;
    hand.face = adm.face === 1 ? -1 : 1;
  }
  if (T < LEAVE[2]! && seer.x === d.corner.x && seer.y === d.corner.y) seer.face = mid < seer.x ? -1 : 1;
  // The slip: feet up, over backwards, a moment on the carpet, back up.
  if (T >= SLIP && T < UP + 0.6) {
    const back = -adm.face * (Math.PI / 2);
    if (T < LAND) {
      const u = (T - SLIP) / (LAND - SLIP);
      adm.rot = back * ease(u);
      adm.up = Math.sin(Math.PI * u) * 7;
    } else if (T < UP) adm.rot = back;
    else adm.rot = back * (1 - ease((T - UP) / 0.6));
    adm.legs = 2;
  }
  // The bow.
  if (T >= BOW && T < BOW + 1.4) for (const b of bodies) b.rot = b.face * 0.38 * Math.sin((Math.PI * (T - BOW)) / 1.4);
  // Zero-g: the boarders float like everyone else.
  const fk = floatK(t);
  if (fk > 0) bodies.forEach((b, i) => (b.up += fk * (10 + 2 * Math.sin(t * 1.4 + i * 2))));
  // The hat: off over the top of the slip and back down onto his head.
  const span = UP + 0.6 - SLIP;
  const hu = (T - SLIP) / span;
  const hat = T >= SLIP && hu < 1 ? { x: end.a.x, y: d.lane - 32 - Math.sin(Math.PI * hu) * 26, flip: Math.floor(T * 7) % 2 === 1 } : { x: NaN, y: NaN, flip: false };
  // The mug: drifting (or, with gravity on, rolling) in from the side, then off and away.
  let cup: Cast["cup"] = null;
  const zeroG = fk > 0.2;
  const target = { x: end.a.x + (end.a.x < end.h.x ? 3 : -3), y: d.lane - (zeroG ? 7 : 1) };
  const from = target.x < d.cx ? d.x0 - 14 : d.x1 + 14;
  if (T >= CUP && T < SLIP) {
    const u = (T - CUP) / (SLIP - CUP);
    cup = { x: from + (target.x - from) * u, y: target.y + (zeroG ? Math.sin(T * 3) * 2 : 0), spin: zeroG ? T * 2 : (T * 9) % (Math.PI * 2) };
  } else if (T >= SLIP && T < SLIP + 1.6) {
    const u = (T - SLIP) / 1.6;
    const dir = target.x < d.cx ? -1 : 1;
    cup = { x: target.x + dir * 34 * u, y: target.y - 34 * u + 12 * u * u, spin: T * 14 };
  }
  const meet = T >= FIGHT && T < SLIP && now.meet;
  const top = Math.min(adm.y - adm.up, hand.y - hand.up) - 24;
  const cheer = meet || (T >= SLIP && T < UP) || CARDS.some((c) => T >= c - 0.35 && T < c + 0.1) || (T >= BOW && T < BOW + 1.4);
  const cast: Cast = { T, adm, hand, seer, clash: meet ? { x: mid, y: top } : null, mid, hat, cup, cheer };
  memo = { t, key: d, cast };
  return cast;
}

/** A point on someone's sprite (body-local, facing right, feet at 0, 0) in the room. */
function at(b: Body, lx: number, ly: number): Point {
  const px = b.face * lx;
  const c = Math.cos(b.rot);
  const s = Math.sin(b.rot);
  return { x: b.x + px * c - ly * s, y: b.y - b.up + px * s + ly * c };
}

// ------------------------------------------------------------------ sprites

const A = {
  skin: "#e2a882",
  skinLo: "#c4865f",
  hair: "#b9b9c6",
  stache: "#ececf3",
  coat: "#6b2f4f",
  coatLo: "#4e2039",
  chrome: "#c9d3e0",
  chromeHi: "#f4f7fb",
  chromeLo: "#8a96aa",
  gold: "#e3b341",
  belt: "#2a1d14",
  trousers: "#2b2b3a",
  boot: "#17171f",
  glove: "#3a2a22",
  brass: "#c8a24a",
  brassHi: "#ecd17f",
  joint: "#3a3a48",
  steel: "#8e9bb0",
  hat: "#24514a",
  hatHi: "#2f6b60",
  plume: "#ff7a59",
  plumeHi: "#ffc0a8",
  bird: "#38c9b0",
  birdLo: "#228a7a",
  beak: "#ff9a3d",
  eye: "#fff36b",
};

/** The admiral, facing right, feet at the bottom middle (18×26, no hat). */
function admiralBody(legs: number): HTMLCanvasElement {
  return cached(`spaceship|duel-admiral-${legs}`, () => {
    const g = new Grid(18, 26);
    const xs = legs === 0 ? [6, 9] : legs === 1 ? [4, 10] : [3, 11];
    for (const x of xs) {
      g.rect(x, 19, 2, 5, A.trousers);
      g.rect(x - 1, 24, 4, 2, A.boot);
      g.set(x + 2, 25, A.chrome);
    }
    // Coat tails, torso, the chest plate, belt.
    g.rect(4, 15, 9, 4, A.coat).vline(3, 16, 3, A.coatLo).hline(4, 18, 9, A.coatLo);
    g.rect(5, 8, 8, 7, A.coat);
    g.rect(8, 8, 5, 6, A.chrome).set(9, 9, A.chromeHi).set(10, 9, A.chromeHi).set(9, 10, A.chromeHi);
    g.hline(8, 13, 5, A.chromeLo).vline(12, 9, 4, A.chromeLo);
    g.hline(5, 14, 8, A.belt).set(9, 14, A.gold).set(10, 14, A.gold);
    // The other arm: a sleeve and a glove.
    g.rect(5, 9, 2, 6, A.coatLo).set(6, 15, A.glove);
    // Shoulder plates and a gold collar.
    g.rrect(3, 7, 4, 3, A.chrome, 1).set(4, 7, A.chromeHi);
    g.rrect(10, 7, 4, 3, A.chrome, 1).set(11, 7, A.chromeHi);
    g.hline(7, 7, 3, A.gold);
    // The head: grey hair at the back, one bright eye, a magnificent moustache.
    g.rect(7, 0, 5, 7, A.skin).vline(6, 1, 5, A.hair).set(7, 1, A.hair).set(7, 2, A.hair);
    g.set(10, 1, A.hair).set(10, 2, "#1d1d29").set(12, 3, A.skin).set(8, 3, A.skinLo);
    g.rect(9, 4, 4, 1, A.stache).set(13, 3, A.stache).set(8, 5, A.stache).set(12, 5, A.stache);
    // The mechanical arm: brass, dark joints, a steel claw.
    g.set(12, 10, A.joint).rect(13, 10, 1, 3, A.brass).set(13, 10, A.brassHi);
    g.set(13, 13, A.joint).rect(14, 13, 2, 1, A.brass).set(14, 12, A.brassHi);
    g.rect(16, 12, 2, 2, A.steel).set(17, 11, A.steel);
    // The parrot-drone on the back shoulder: teal, an orange beak, a yellow eye light.
    g.rect(2, 3, 3, 4, A.bird).set(2, 6, A.birdLo).set(1, 7, A.birdLo).set(3, 5, A.birdLo);
    g.set(5, 4, A.beak).set(4, 3, A.eye);
    return done(g);
  });
}

/** The admiral's hat: a broad brim, a gold band, a big plume streaming back (16×8). */
function admiralHat(): HTMLCanvasElement {
  return cached("spaceship|duel-hat", () => {
    const g = new Grid(16, 8);
    g.rect(0, 6, 16, 2, A.hat).hline(0, 7, 16, A.gold).set(0, 5, A.hat).set(15, 5, A.hat);
    g.rrect(4, 2, 8, 5, A.hat, 2).hline(5, 2, 5, A.hatHi).hline(4, 5, 8, A.gold).set(9, 3, A.gold);
    for (const [x, y, hi] of [[4, 1, 0], [3, 0, 0], [2, 0, 1], [3, 1, 1], [2, 1, 0], [1, 1, 0], [1, 2, 1], [0, 2, 0], [0, 3, 0]] as const) g.set(x, y, hi ? A.plumeHi : A.plume);
    return done(g);
  });
}

const D = {
  skin: "#a86b45",
  skinLo: "#8a5434",
  hair: "#d0703a",
  hairLo: "#a8542a",
  strap: "#4a3a2a",
  lens: "#ffbf47",
  lensHi: "#fff1c2",
  shirt: "#efe3c4",
  denim: "#3f7fbf",
  denimLo: "#2f629a",
  patch: "#ff9a3d",
  boot: "#6a4026",
  steel: "#8e9bb0",
};

/** The deckhand, facing right (16×24): goggles up, overalls, the borrowed torch-blade's hilt in hand. */
function deckhandBody(legs: number): HTMLCanvasElement {
  return cached(`spaceship|duel-deckhand-${legs}`, () => {
    const g = new Grid(16, 24);
    const xs = legs === 0 ? [5, 8] : legs === 1 ? [4, 9] : [3, 10];
    for (const x of xs) {
      g.rect(x, 17, 2, 5, D.denim);
      g.rect(x - 1, 22, 3, 2, D.boot).set(x + 1, 22, D.boot);
    }
    g.rect(4, 9, 7, 2, D.shirt);
    g.rect(5, 10, 6, 7, D.denim).set(6, 9, D.denimLo).set(9, 9, D.denimLo);
    g.rect(7, 12, 2, 1, D.denimLo).set(5, 15, D.patch).set(6, 15, D.patch);
    g.vline(4, 10, 4, D.shirt).set(4, 14, D.skin);
    // The blade arm, the hilt (a welding torch with an orange nozzle).
    g.set(10, 10, D.shirt).set(11, 10, D.shirt).set(11, 11, D.skin).set(12, 11, D.skin).set(13, 11, D.skin);
    g.set(13, 10, D.steel).set(13, 9, D.steel).set(14, 9, D.patch);
    // Head, spiky hair, goggles pushed up, freckles.
    g.rect(5, 3, 6, 6, D.skin).set(9, 5, "#1d1d29").set(10, 6, D.skinLo).set(9, 7, D.skinLo);
    g.rect(4, 1, 7, 2, D.hair).set(5, 0, D.hair).set(7, 0, D.hair).set(10, 0, D.hair).vline(4, 3, 3, D.hairLo);
    g.hline(4, 3, 7, D.strap).rect(8, 2, 2, 2, D.lens).set(8, 2, D.lensHi);
    return done(g);
  });
}

const S = {
  skin: "#c98f6a",
  skinLo: "#a8714f",
  curls: "#d5d5de",
  scarf: "#7a3e9d",
  scarfLo: "#5b2a78",
  gold: "#f2c94c",
  lens: "#dff6ff",
  skirt: "#5a2f6e",
  skirtLo: "#47235a",
  shoe: "#3a2430",
  patches: ["#e0b040", "#3fa7a0", "#d0607a", "#8a4fb0", "#7aa64a"],
};

/** The fortune-teller, facing right (16×28): a coin-trimmed headscarf, round spectacles, a patchwork shawl. */
function seerBody(legs: number): HTMLCanvasElement {
  return cached(`spaceship|duel-seer-${legs}`, () => {
    const g = new Grid(16, 28);
    g.rect(4, 17, 8, 9, S.skirt).vline(6, 18, 7, S.skirtLo).vline(9, 19, 6, S.skirtLo);
    for (let x = 5; x < 12; x += 2) g.set(x, 25, S.gold);
    g.rect(legs ? 4 : 5, 26, 2, 2, S.shoe).rect(legs ? 10 : 9, 26, 2, 2, S.shoe);
    // The shawl: little squares in five colors, a gold fringe.
    for (let y = 10; y < 17; y += 2) {
      const x0 = y === 10 ? 5 : 3;
      const x1 = y === 10 ? 11 : 13;
      for (let x = x0; x < x1; x += 2) g.rect(x, y, 2, 2, S.patches[(Math.floor(x / 2) + y / 2) % 5]!);
    }
    for (let x = 3; x < 13; x += 2) g.set(x, 17, S.gold);
    // Head: grey curls, spectacles, a smile; the scarf with coins and a knot at the back.
    g.rect(6, 5, 5, 5, S.skin).vline(4, 5, 4, S.curls).vline(5, 5, 5, S.curls);
    g.rect(8, 6, 3, 2, S.gold).set(9, 6, S.lens).set(9, 7, S.lens).set(11, 8, S.skinLo).set(9, 9, "#7a3a3a");
    g.set(6, 9, S.gold);
    g.rrect(4, 0, 8, 5, S.scarf, 2).hline(5, 1, 5, "#9a5cc0");
    for (let x = 5; x < 12; x += 2) g.set(x, 4, S.gold);
    g.set(3, 3, S.scarfLo).set(2, 4, S.scarfLo).set(2, 5, S.scarfLo);
    return done(g);
  });
}

// ------------------------------------------------------------------ drawing

function drawBody(ctx: CanvasRenderingContext2D, b: Body, sprite: HTMLCanvasElement, ax: number, extra?: () => void): void {
  fill(ctx, Math.round(b.x) - 5, Math.round(b.y), 10, 2, "rgba(10,8,20,0.18)");
  ctx.save();
  ctx.translate(Math.round(b.x), Math.round(b.y - b.up));
  if (b.rot) ctx.rotate(b.rot);
  if (b.face < 0) ctx.scale(-1, 1);
  ctx.drawImage(sprite, -ax, -sprite.height);
  extra?.();
  ctx.restore();
}

/** A glowing blade from the hand: `bend` curves it (the cutlass), `gaps` makes it sputter (the torch). */
function blade(ctx: CanvasRenderingContext2D, h: Point, ang: number, len: number, bend: number, core: string, edge: string, gaps: number, seed: number): void {
  let x = h.x;
  let y = h.y;
  let a = ang;
  for (let i = 0; i < len; i++) {
    x += Math.cos(a);
    y += Math.sin(a);
    a += bend;
    if (gaps && ih(seed, i, 7) % gaps === 0) continue;
    const px = Math.round(x);
    const py = Math.round(y);
    fill(ctx, px - 1, py - 1, 3, 3, edge);
    fill(ctx, px, py, 1, 1, core);
  }
}

/** Blade angle: up and forward on guard, swinging; straight at the meeting point in a clash. */
function bladeAngle(b: Body, h: Point, c: Cast, phase: number): number {
  if (c.clash) return Math.atan2(c.clash.y - h.y, c.clash.x - h.x);
  const local = -1.0 + Math.sin(c.T * 6 + phase) * 0.35;
  return (b.face > 0 ? local : Math.PI - local) + b.rot;
}

/** The boarders, the mug and the tiny switch, sorted in with everything else. */
export function duelDecor(ctx: CanvasRenderingContext2D, L: Layout, plan: ShipPlan, t: number): Drawable[] {
  const d = plan.duel;
  if (!d) return [];
  seen = { bridge: plan.bridge, seat: L.boss.seat, d };
  const out: Drawable[] = [];
  // The switch: a tiny unlabeled toggle whose light winks now and then (flipped down while a duel's on),
  // or a loose floor panel with one corner sticking up (it sits flat while they're aboard).
  const sw = d.switch;
  const on = duelK(t) >= 0;
  out.push({
    z: d.loose ? sw.y : sw.y + sw.h + 2,
    draw: () => {
      if (d.loose) {
        fill(ctx, sw.x, sw.y, sw.w, sw.h, "rgba(20,14,30,0.35)");
        fill(ctx, sw.x + 1, sw.y + 1, sw.w - 2, sw.h - 2, "rgba(255,240,230,0.08)");
        if (!on) fill(ctx, sw.x + sw.w - 2, sw.y - 1, 2, 1, "rgba(255,240,230,0.25)");
        return;
      }
      fill(ctx, sw.x, sw.y + 1, 3, 3, "#2a2f3a");
      fill(ctx, sw.x + 1, on ? sw.y + 3 : sw.y, 1, 2, "#c9d3e0");
      if (on || t % 6 < 0.25) fill(ctx, sw.x + 3, sw.y + 2, 1, 1, "#c58bff");
    },
  });
  const c = castAt(d, t);
  if (!c) return out;
  const T = c.T;
  const lit = T >= FIGHT - 0.5 && T < SLIP;
  const grow = Math.max(0, Math.min(1, (T - (FIGHT - 0.5)) / 0.5));
  if (c.adm.show) {
    const b = c.adm;
    out.push({
      z: b.y,
      draw: () => {
        drawBody(ctx, b, admiralBody(b.legs), 9, () => {
          // The parrot-drone's rotor, a blur over its head.
          fill(ctx, -8 + (Math.floor(t * 20) % 2), -24, 4, 1, "rgba(220,240,255,0.8)");
          if (!Number.isFinite(c.hat.x)) ctx.drawImage(admiralHat(), -8, -32);
        });
        if (lit) {
          const h = at(b, 8, -14);
          const ang = bladeAngle(b, h, c, 0);
          blade(ctx, h, ang, Math.round(13 * grow), b.face * 0.03, "#fff4cf", "rgba(255,170,60,0.38)", 0, 0);
          // Crackles along the cutlass.
          const i = ih(Math.floor(t * 18), 3, 9) % 12;
          fill(ctx, Math.round(h.x + Math.cos(ang) * i) + ((i % 3) - 1) * 2, Math.round(h.y + Math.sin(ang) * i) - 1, 1, 1, "#ff7ad9");
          fill(ctx, Math.round(h.x) - 1, Math.round(h.y), 2, 2, A.gold);
        }
      },
    });
  }
  if (Number.isFinite(c.hat.x)) {
    const hat = c.hat;
    out.push({
      z: d.lane + 1,
      draw: () => {
        ctx.save();
        ctx.translate(Math.round(hat.x), Math.round(hat.y));
        if (hat.flip) ctx.scale(-1, 1);
        ctx.drawImage(admiralHat(), -8, -4);
        ctx.restore();
      },
    });
  }
  if (c.hand.show) {
    const b = c.hand;
    out.push({
      z: b.y + 0.5,
      draw: () => {
        drawBody(ctx, b, deckhandBody(b.legs), 8);
        const sput = SPUTTER.some((s) => Math.abs(T - s) < 0.35);
        if (lit && (!sput || Math.floor(t * 12) % 2)) {
          const h = at(b, 6, -15);
          blade(ctx, h, bladeAngle(b, h, c, 1.7), Math.round(10 * grow), 0, "#f2fff9", "rgba(120,240,200,0.38)", sput ? 3 : 6, Math.floor(t * 24));
        } else if (T >= SLIP && T < SLIP + 0.6 && Math.floor(t * 14) % 2) {
          // Pfft: the borrowed blade gives up.
          const h = at(b, 6, -15);
          fill(ctx, Math.round(h.x), Math.round(h.y) - 2, 1, 1, "#f2fff9");
          fill(ctx, Math.round(h.x) + b.face, Math.round(h.y) - 4, 1, 1, "rgba(200,200,210,0.7)");
        }
      },
    });
  }
  if (c.seer.show) {
    const b = c.seer;
    out.push({
      z: b.y,
      draw: () =>
        drawBody(ctx, b, seerBody(b.legs), 8, () => {
          // The arm, raised to throw or cheer, and the glowing cards fanned in the hand.
          const up = c.cheer;
          const hand = up ? { x: 5, y: -24 } : { x: 5, y: -15 };
          fill(ctx, 3, -17, 1, 1, S.skin);
          fill(ctx, 4, up ? -20 : -16, 1, up ? 3 : 1, S.skin);
          fill(ctx, hand.x, hand.y, 1, 1, S.skin);
          const glow = 0.6 + 0.4 * Math.sin(t * 5);
          for (const [i, col] of ["#ffd86b", "#ff8fb5", "#7ff0e0"].entries()) {
            fill(ctx, hand.x - 1 + i * 2, hand.y - 3 + (i === 1 ? -1 : 0), 2, 3, col);
            fill(ctx, hand.x - 1 + i * 2, hand.y - 4 + (i === 1 ? -1 : 0), 2, 1, `rgba(255,255,255,${glow * 0.5})`);
          }
        }),
    });
  }
  if (c.cup) {
    const m = c.cup;
    out.push({
      z: d.lane - 0.5,
      draw: () => {
        ctx.save();
        ctx.translate(Math.round(m.x), Math.round(m.y));
        ctx.rotate(Math.round(m.spin * 2) / 2);
        fill(ctx, -3, -3, 6, 6, "#2a2238");
        fill(ctx, 3, -2, 2, 4, "#2a2238");
        fill(ctx, -2, -2, 4, 4, "#f4f1ea");
        fill(ctx, -2, -2, 4, 1, "#6b3f22");
        fill(ctx, 3, -1, 1, 2, "#f4f1ea");
        fill(ctx, -2, 1, 4, 1, "#c9c4b8");
        fill(ctx, -1, 0, 2, 1, "#ff9a3d");
        ctx.restore();
        // A few drops of coffee keeping it company.
        for (let i = 0; i < 3; i++) fill(ctx, Math.round(m.x + Math.sin(t * 2 + i * 2.1) * 5), Math.round(m.y - 3 + Math.cos(t * 1.7 + i) * 3), 1, 1, "#6b3f22");
      },
    });
  }
  return out;
}

/** The airlock (the lift door): hazard lights while it cycles, open while they come and go. */
export function duelDoor(ctx: CanvasRenderingContext2D, plan: ShipPlan, t: number): void {
  const T = duelK(t);
  const lift = plan.lift;
  if (T < 0 || !lift) return;
  const cycling = T < OPEN + 0.2 || T >= SHUT - 0.2;
  if (cycling && Math.floor(t * 4) % 2) {
    fill(ctx, lift.x + 2, lift.y - 3, 6, 2, "#ffb23f");
    fill(ctx, lift.x + 3, lift.y - 3, 4, 1, "#fff1c2");
  }
  if (T >= OPEN && T < SHUT) {
    const u = Math.min(1, (T - OPEN) / 0.4, (SHUT - T) / 0.4);
    const h = Math.round((lift.h - 2) * u);
    fill(ctx, lift.x + 2, lift.y + 1, lift.w - 4, h, "#0b0f1c");
    fill(ctx, lift.x + 2, lift.y + 1, lift.w - 4, 1, "rgba(255,178,63,0.6)");
  }
}

/** On top: the clash sparks, the cards in flight and their fizzles, the boarders' speech bubbles. */
export function duelOverlay(ctx: CanvasRenderingContext2D, L: Layout, plan: ShipPlan, t: number): void {
  const d = plan.duel;
  if (!d) return;
  const c = castAt(d, t);
  if (!c) return;
  const T = c.T;
  if (c.clash) {
    const s = Math.floor(t * 18);
    for (let j = 0; j < 7; j++) {
      const h = ih(s, j, 11);
      fill(ctx, Math.round(c.clash.x) + (h % 11) - 5, Math.round(c.clash.y) + ((h >>> 4) % 9) - 5, 1, 1, ["#fff6c2", "#ffb23f", "#7ff0c8", "#ffffff"][j % 4]!);
    }
  }
  // Cards: an arc from the fortune-teller's hand to the carpet near the duel, a harmless fizzle where they land.
  for (const [i, ct] of CARDS.entries()) {
    const u = (T - ct) / 0.7;
    if (u < 0 || u >= 1.7) continue;
    const from = at(c.seer, 5, -26);
    const to = { x: c.mid + (ih(i, 5, 3) % 25) - 12, y: d.lane + 4 };
    if (u < 1) {
      const x = from.x + (to.x - from.x) * u;
      const y = from.y + (to.y - from.y) * u - Math.sin(Math.PI * u) * 14;
      const col = ["#ffd86b", "#ff8fb5", "#7ff0e0"][Math.floor(t * 8) % 3]!;
      fill(ctx, Math.round(x) - 1, Math.round(y) - 1, 4, 5, "rgba(255,240,200,0.3)");
      fill(ctx, Math.round(x), Math.round(y), 2, 3, col);
    } else {
      const r = (u - 1) * 14;
      for (let j = 0; j < 6; j++) {
        const a = (j * Math.PI) / 3 + u * 2;
        fill(ctx, Math.round(to.x + Math.cos(a) * r), Math.round(to.y + Math.sin(a) * r * 0.5), 1, 1, j % 2 ? "#ffd86b" : "#7ff0e0");
      }
      if (u < 1.3) fill(ctx, Math.round(to.x) - 1, Math.round(to.y) - 1, 3, 2, "#fff6c2");
    }
  }
  // Stars over the admiral's head while he's on the carpet.
  if (T >= LAND && T < UP) {
    const hd = at(c.adm, 0, -22);
    for (let j = 0; j < 3; j++) {
      const a = t * 4 + (j * Math.PI * 2) / 3;
      fill(ctx, Math.round(hd.x + Math.cos(a) * 6), Math.round(hd.y - 4 + Math.sin(a) * 2), 1, 1, "#ffd86b");
    }
  }
  for (const [who, from, to, text] of LINES) {
    if (T < from || T >= to) continue;
    const b = who === 3 ? c.adm : [c.adm, c.hand, c.seer][who]!;
    if (!b.show) continue;
    // Over their head (upright, so a bubble stays put through a bow or a fall).
    const tall = Math.abs(b.rot) > 0.8 ? 16 : who === 0 ? 34 : who === 1 ? 26 : who === 2 ? 30 : 30;
    bubble(ctx, L, text, b.x - (who === 3 ? 6 * b.face : 0), b.y - b.up - tall);
  }
}

function bubble(ctx: CanvasRenderingContext2D, L: Layout, text: string, x: number, y: number): void {
  const w = pixelTextWidth(text) + 6;
  const h = 11;
  const bx = Math.round(Math.max(2, Math.min(L.W - w - 2, x - w / 2)));
  const by = Math.round(Math.max(2, y - h - 3));
  fill(ctx, bx, by - 1, w, h + 2, "#2a2238");
  fill(ctx, bx - 1, by, w + 2, h, "#2a2238");
  fill(ctx, bx, by, w, h, "#fffaf0");
  const tx = Math.round(Math.max(bx + 2, Math.min(bx + w - 4, x)));
  fill(ctx, tx, by + h, 2, 2, "#fffaf0");
  fill(ctx, tx, by + h + 2, 1, 1, "#2a2238");
  drawPixelText(ctx, text, bx + 3, by + 3, "#2a2238");
}

/** The blades light the bridge a little (at night especially). */
export function duelLights(plan: ShipPlan, t: number): Light[] {
  const d = plan.duel;
  if (!d) return [];
  const c = castAt(d, t);
  if (!c || c.T < FIGHT - 0.5 || c.T >= SLIP) return [];
  const a = at(c.adm, 8, -20);
  const h = at(c.hand, 6, -20);
  return [
    [a.x, a.y, 26, 0.55, "#ffb23f", 0.5],
    [h.x, h.y, 22, 0.45, "#7ff0c8", 0.5],
  ];
}

// ------------------------------------------------------------------ the audience

/** The bridge, your seat and the duel's geometry, as of the last frame drawn (for `pose`, which doesn't get the layout). */
let seen: { bridge: Rect; seat: Point; d: Duel } | null = null;

/** Your chair during the duel: turned to follow the fight (or the airlock), else null. */
export function duelWatch(t: number): "left" | "right" | null {
  if (!seen) return null;
  const c = castAt(seen.d, t);
  if (!c) return null;
  const x = c.adm.show || c.hand.show ? c.mid : seen.d.door.x;
  return x < seen.seat.x ? "left" : "right";
}

const SEATED = new Set<CharPose>(["sit-back", "type0", "type1", "slump", "read", "nap", "cup"]);

/** The crew on the bridge cower (or stare, from behind); you swivel to watch. Undefined: no opinion. */
export function duelPose(p: PoseOf, t: number): { pose: CharPose; expr: Expression; facing?: Facing } | null | undefined {
  if (!seen) return undefined;
  const T = duelK(t);
  if (T < 0) return undefined;
  const c = castAt(seen.d, t);
  if (!c) return undefined;
  const surprised = !!c.clash || (T >= SLIP && T < UP);
  if (p.kind === "boss") {
    if (Math.abs(p.x - seen.seat.x) > 2 || Math.abs(p.y - seen.seat.y) > 2) return undefined;
    const watch = duelWatch(t);
    return { pose: "sit-back", expr: surprised ? "surprised" : T >= BOW ? "happy" : "focus", facing: watch ?? "front" };
  }
  const r = seen.bridge;
  if (!p.spot || p.x < r.x || p.x > r.x + r.w || p.y < r.y || p.y > r.y + r.h || T < 5.5 || T >= LEAVE[0]!) return undefined;
  const expr: Expression = surprised ? "surprised" : T >= BOW ? "happy" : "worried";
  if (p.facing === "back") return { pose: p.pose, expr, facing: p.facing };
  if (T >= BOW) return { pose: p.pose, expr };
  return { pose: SEATED.has(p.pose) ? "slump" : "mope", expr };
}

// ------------------------------------------------------------------ the sound

/** The whole show's sound in one recipe: the airlock, boots, blades humming and clashing, the sputter, the slip, a bow. */
export const DUEL_SOUND: SoundRecipe = (k) => {
  for (const at of [0, SHUT - 0.2]) {
    k.tone(196, at + 0.2, 0.25, "square", 0.02);
    k.tone(196, at + 1, 0.25, "square", 0.02);
    k.swell(at, 2.2, 0.035, 300, 2400, 0.8);
  }
  k.swell(OPEN, 0.6, 0.05, 1800, 700, 1);
  for (let i = 0; i < 8; i++) k.noise(MARCH[0]! + 0.1 + i * 0.42, 0.05, 0.03, 300);
  // Blades on: a rising whoosh, then a low two-note hum under the fight.
  k.tone(110, FIGHT - 0.5, 0.5, "sawtooth", 0.02, 330);
  k.tone(147, FIGHT, SLIP - FIGHT, "sine", 0.012);
  k.tone(221, FIGHT, SLIP - FIGHT, "triangle", 0.005);
  for (const c of CLASHES) {
    k.noise(c, 0.09, 0.06, 5000);
    k.tone(1760, c, 0.12, "square", 0.018, 1200);
  }
  for (const s of SPUTTER) for (let i = 0; i < 5; i++) k.noise(s - 0.3 + i * 0.13, 0.04, 0.035, 1500);
  // The vault, the parrot-drone, the cards fizzling.
  k.tone(392, SWAP, 0.6, "sine", 0.04, 880);
  k.tone(2200, 11.2, 0.08, "square", 0.02, 3000);
  k.tone(2600, 11.4, 0.1, "square", 0.02, 1800);
  for (const c of CARDS) {
    k.tone(2400, c + 0.7, 0.08, "square", 0.012, 3200);
    k.noise(c + 0.7, 0.25, 0.03, 6000);
  }
  // The mug (plink), the slip (a slide whistle down), the bump; the torch blade gives up.
  k.tone(1568, SLIP - 0.05, 0.06, "sine", 0.03);
  k.tone(880, SLIP, 0.7, "sine", 0.05, 196);
  k.tone(110, LAND, 0.18, "sine", 0.08, 70);
  k.noise(LAND, 0.12, 0.05, 400);
  k.noise(SLIP + 0.1, 0.35, 0.03, 900);
  // A little fanfare for the bow, then boots out.
  k.tone(523, BOW, 0.2, "triangle", 0.05);
  k.tone(659, BOW + 0.2, 0.2, "triangle", 0.05);
  k.tone(784, BOW + 0.4, 0.45, "triangle", 0.05);
  for (let i = 0; i < 8; i++) k.noise(LEAVE[2]! + 0.1 + i * 0.42, 0.05, 0.03, 300);
};
