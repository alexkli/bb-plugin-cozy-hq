// School scenery: teachers and staff (lanyards, backpacks), the principal
// and the visitors: hall monitor, custodian, IT teacher, pizza-day delivery.
import { hash, parseColor, shade } from "../../themekit.ts";
import type { Look } from "../../themekit.ts";
import type { VisitorKind } from "../../theme.ts";
import type { CharPose } from "../../characters.ts";
import type { Facing } from "../../layout.ts";
import { C, CRAYONS, OUTLINE } from "./kit.ts";

const PANTS = ["#3d4a6b", "#5b4a3c", "#3a3a44", "#6c5a48", "#4f5d7f", "#7a5f8f", "#8a7a5a"];

export function schoolLook(look: Look, threadId: string): Look {
  const h = hash(`school-${threadId}`);
  // Teachers: more glasses, fewer headphones; khakis, cords and skirts.
  const accessory = look.accessory === "headphones" ? (h % 2 ? "glasses" : "none") : look.accessory;
  return { ...look, accessory, pants: PANTS[h % PANTS.length]!, key: `${look.key}|school` };
}

export function schoolNpc(kind: VisitorKind, classic: Look): Look {
  switch (kind) {
    case "boss":
      // You, the principal: a burgundy cardigan (glasses if you wear them).
      return { ...classic, key: `${classic.key}|school`, shirt: "#8a3b4a", pants: "#3a3a44", accent: "#f2c14e" };
    case "guard":
      // The hall monitor in a bright safety vest.
      return { ...classic, key: "school-monitor", shirt: "#c6e24a", pants: "#2f3a5a", hairStyle: "cap", accent: C.orange };
    case "janitor":
      // The custodian in work blues.
      return { ...classic, key: "school-custodian", shirt: "#5a7fa8", pants: "#33465c", hairStyle: "cap", accent: "#2f4a6a" };
    case "technician":
      // The IT teacher: sweater, glasses, no hard hat.
      return { ...classic, key: "school-it", shirt: "#3fb5a8", pants: "#4a4458", hairStyle: "crop", hair: "#6b4128", accessory: "glasses", accent: "#3fb5a8" };
    case "delivery":
      // Pizza day!
      return { ...classic, key: "school-pizza", shirt: C.orange, accent: C.red };
  }
}

/** Lanyards for most, a backpack for some, a hall pass now and then. */
export function schoolDress(
  ctx: CanvasRenderingContext2D,
  a: { x: number; y: number; facing: Facing; pose: CharPose; seed: number; seated: boolean; look?: Look },
  t: number,
): void {
  void t;
  const { x, y, facing, pose, seed, seated, look } = a;
  if (pose === "nap" || pose === "slump") return;
  const bob = pose === "walk1" || pose === "walk3" ? -1 : 0;
  const bt = y + 14 + bob;
  const role = seed % 10;
  const px = (c: string, xx: number, yy: number, w = 1, h = 1) => {
    ctx.fillStyle = c;
    ctx.fillRect(xx, yy, w, h);
  };
  const busyHands = pose === "present" || pose === "present-plan" || pose === "read";
  if (role >= 7 && !seated && pose !== "sit-back") {
    // A backpack.
    const bag = contrasting(look?.shirt, CRAYONS, seed >>> 3);
    if (facing === "back") {
      px(OUTLINE, x + 5, bt + 1, 8, 7);
      px(bag, x + 6, bt + 2, 6, 5);
      px(shade(bag, 0.25), x + 6, bt + 2, 6, 2);
      px(OUTLINE, x + 7, bt + 5, 4, 1);
    } else if (facing === "left" || facing === "right") {
      const bx = facing === "right" ? x + 3 : x + 14;
      px(OUTLINE, bx, bt + 1, 4, 6);
      px(bag, bx + 1, bt + 2, 2, 4);
    } else if (!busyHands) {
      px("#3a3046", x + 5, bt, 1, 4);
      px("#3a3046", x + 12, bt, 1, 4);
    }
    return;
  }
  if (facing !== "front" || busyHands) return;
  // A lanyard with an ID badge.
  const strap = contrasting(look?.shirt, [C.red, C.blue, C.green, C.yellowLo], role);
  px(strap, x + 7, bt, 1, 2);
  px(strap, x + 10, bt, 1, 2);
  px(strap, x + 8, bt + 2, 2, 1);
  px(OUTLINE, x + 7, bt + 3, 4, 3);
  px("#ffffff", x + 8, bt + 3, 2, 2);
  px(strap, x + 8, bt + 3, 2, 1);
}

/** A color from `options` that stands out against the shirt (stable per seed). */
function contrasting(shirt: string | undefined, options: string[], seed: number): string {
  const first = options[seed % options.length]!;
  if (!shirt) return first;
  const [r, g, b] = parseColor(shirt);
  const far = (c: string) => {
    const [r2, g2, b2] = parseColor(c);
    return Math.abs(r - r2) + Math.abs(g - g2) + Math.abs(b - b2);
  };
  if (far(first) > 160) return first;
  return [...options].sort((p, q) => far(q) - far(p))[0]!;
}
