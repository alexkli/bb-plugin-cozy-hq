// Home Office: the people. Everyone's at home, so: hoodies and comfy
// sweaters (the shirt keeps the project color), joggers and pajama
// bottoms, socks; a headset when they're on a call. You in a cardigan. The
// visitors are the neighborhood: a patrol officer on the beat, the street
// sweeper in hi-vis, the internet technician fixing someone's wifi and the
// bike courier with a big insulated bag.
import { wearsAtNeck, type CharPose, type Look } from "../../characters.ts";
import type { Facing } from "../../layout.ts";
import type { VisitorKind } from "../../theme.ts";
import { hash } from "../../themekit.ts";
import { OUTLINE, rect } from "./kit.ts";

type Ctx = CanvasRenderingContext2D;

/** Joggers, pajama bottoms, jeans, leggings. */
const BOTTOMS = ["#6b6f7a", "#3d4a6b", "#8a6aa8", "#5a7a9a", "#2e2c36", "#a85a5a", "#4a6a4a", "#7a8a9a"];

/** The same person, at home: the shirt (a hoodie or a sweater) keeps the project color. */
export function homeLook(look: Look, threadId: string): Look {
  const h = hash(`home-${threadId}`);
  const pants = BOTTOMS[h % BOTTOMS.length]!;
  let hairStyle = look.hairStyle;
  let accessory = look.accessory;
  // No caps indoors at home; a beanie stays (it's cold), a bow stays.
  if (hairStyle === "cap") hairStyle = h % 2 ? "crop" : "bob";
  if (accessory === "none" && (h >>> 4) % 5 === 0) accessory = "glasses";
  return { ...look, key: `${look.key}|home|${pants}|${hairStyle}|${accessory}`, pants, hairStyle, accessory };
}

export function homeNpc(kind: VisitorKind, classic: Look): Look {
  switch (kind) {
    case "boss":
      // You, at home: an oatmeal cardigan over the shirt, comfy dark joggers.
      return { ...classic, key: `${classic.key}|home`, shirt: "#d9c6a2", pants: "#3a3d46", accent: "#a85a3e" };
    case "guard":
      // The patrol officer on the beat: navy uniform and cap.
      return { ...classic, key: "home-patrol", shirt: "#2f3a5a", pants: "#232a40", hair: "#232a40", hairStyle: "cap", accessory: "none", accent: "#232a40" };
    case "janitor":
      // The street sweeper: an orange work jacket (the hi-vis stripes go on top), a grey beanie.
      return { ...classic, key: "home-sweeper", shirt: "#f08a3a", pants: "#3a4250", hair: "#6a6e78", hairStyle: "cap", accessory: "none", accent: "#6a6e78" };
    case "technician":
      // The internet technician: a blue polo, a cap in the company's teal.
      return { ...classic, key: "home-isp", shirt: "#3e7ac4", pants: "#2f3440", hair: "#1f8a8a", hairStyle: "cap", accessory: "glasses", accent: "#1f8a8a" };
    case "delivery":
      // The bike courier: a green jacket and a helmet-ish cap.
      return { ...classic, key: "home-courier", shirt: "#3aa36a", pants: "#2e2c36", hair: "#2a8a5a", hairStyle: "cap", accessory: "none", accent: "#2a8a5a" };
  }
}

/** Hoodie strings on about half of them (not when you wear something at the neck). */
export function hoodie(ctx: Ctx, a: { x: number; y: number; facing: Facing; pose: CharPose; seed: number; seated: boolean; look: Look }): void {
  if (a.facing !== "front" || a.seed % 2 === 1 || wearsAtNeck(a.look)) return;
  const y = a.y + (a.seated || a.pose === "type0" || a.pose === "type1" || a.pose === "read" || a.pose === "slump" ? 3 : 0);
  rect(ctx, a.x + 8, y + 15, 1, 3, "#f4f1ea");
  rect(ctx, a.x + 11, y + 15, 1, 3, "#f4f1ea");
}

export function homeDressVisitor(ctx: Ctx, v: { x: number; y: number; facing: Facing; pose: CharPose; kind: VisitorKind; look?: Look }, t: number): void {
  const { x, y, facing } = v;
  switch (v.kind) {
    case "janitor":
      // Hi-vis stripes.
      if (facing !== "back" || true) {
        rect(ctx, x + 5, y + 18, 10, 1, "#f4f1a0");
        rect(ctx, x + 5, y + 21, 10, 1, "#f4f1a0");
      }
      break;
    case "delivery":
      // The big insulated bag on the back.
      if (facing === "back") {
        rect(ctx, x + 3, y + 12, 14, 12, OUTLINE);
        rect(ctx, x + 4, y + 13, 12, 10, "#3aa36a");
        rect(ctx, x + 4, y + 13, 12, 2, "#5ac48a");
      } else if (facing === "left" || facing === "right") {
        const bx = facing === "left" ? x + 12 : x + 1;
        rect(ctx, bx, y + 12, 7, 12, OUTLINE);
        rect(ctx, bx + 1, y + 13, 5, 10, "#3aa36a");
      } else {
        rect(ctx, x + 2, y + 13, 2, 8, "#2a7a4a");
        rect(ctx, x + 16, y + 13, 2, 8, "#2a7a4a");
      }
      break;
    case "guard":
      // A badge.
      if (facing === "front") rect(ctx, x + 12, y + 16, 2, 2, "#f2c14e");
      break;
    case "technician":
      // A router in hand.
      if (facing === "front" && v.pose !== "raise") {
        rect(ctx, x + 14, y + 19, 6, 4, OUTLINE);
        rect(ctx, x + 15, y + 20, 4, 2, "#f4f1ea");
        rect(ctx, x + 15, y + 20, 1, 1, Math.floor(t * 3) % 2 ? "#5ad18a" : "#2f7a4a");
      }
      break;
    default:
      break;
  }
}
