// Redwood Camp, the big plan: a camp scattered through the redwoods.
//
// Two dirt trails run across the camp (the hallways) and two down it (the
// aisles); in the forest between them stand the desk tents (each pod row on
// its own deck under canvas), the campfire clearing under the outdoor screen,
// the big safari tent, the camp-kitchen pavilion, the porch tent, the solar
// hut and your treehouse, built around a giant redwood that grows up through
// its deck. A creek runs down beside the clearing past the trout pond.
// Panels too short or narrow for this use the compact plan in plan.ts.
import {
  type Access,
  Builder,
  buildBoss,
  buildKitchen,
  buildLounge,
  buildMeeting,
  buildServerRoom,
  buildWaiting,
  clamp,
  finish,
  type Network,
  POD_H,
  utilities,
  type WallSegment,
} from "../../themekit.ts";
import type { Layout, Rect } from "../../layout.ts";
import { blockers, type CampData, clearPlants, creekPath, deskTents, dropPlant, fillTrees, overlaps, stripTrees, type Tree } from "./plan.ts";

export function campBold(W: number, H: number, threads: number): Layout | null {
  const b = new Builder();
  const edgeR = W >= 640 ? 34 : 28;
  const mL = W >= 860 ? 22 : 8;
  const podCols = 3;
  const A: Rect = { x: mL, y: 0, w: podCols * 48, h: H };
  const a1 = A.x + A.w + 16;
  const wC = clamp(Math.round(W * 0.27), 160, 230);
  const cx = W - edgeR - wC;
  const a2 = cx - 16;
  const creekW = W >= 640 ? 22 : 14;
  const bx = a1 + 16;
  const bw = a2 - 16 - creekW - bx;
  if (bw < 176) return null;
  const d1 = 60;
  const d2 = 86;
  const d3 = 60;
  const segments: WallSegment[] = [
    { x0: 0, x1: a1 + 12, depth: d1 },
    { x0: a1 + 12, x1: a2 - 8, depth: d2 },
    { x0: a2 - 8, x1: W, depth: d3 },
  ];
  const top = 60;
  const avail = H - 6 - top;
  const row1Min = 128;
  const row2Min = 126;
  const row3Min = 108;
  if (avail < row1Min + row2Min + row3Min) return null;
  const extra = avail - (row1Min + row2Min + row3Min);
  const h1 = top + row1Min + Math.round(extra * 0.45);
  const h2 = h1 + row2Min + Math.round(extra * 0.25);
  const net: Network = { halls: [h1, h2], aisles: [a1, a2] };
  const tents: Rect[] = [];
  const desksWanted = threads + 3;

  // Row 1: a desk tent, the campfire clearing under the outdoor screen, the big tent.
  // Row 2: the camp kitchen, a grove with the solar hut by the creek, a desk tent.
  // Row 3: another desk tent (or the water jug corner), the porch tent, the treehouse.
  const accA1: Access = { hallY: h1, aisleX: a1 };
  tents.push(...deskTents(b, { x: A.x, y: h1 - 10 - POD_H, w: A.w, h: POD_H }, accA1));
  const kitchen: Rect = { x: A.x, y: h1 + 34, w: A.w, h: Math.min(96, h2 - 10 - (h1 + 34)) };
  buildKitchen(b, kitchen, accA1);

  const tvW = clamp(bw - 84, 96, 144);
  const tvH = Math.min(Math.round(tvW * 0.56), d2 - 14);
  const wallTv: Rect = { x: bx + Math.round((bw - tvW) / 2), y: d2 - tvH - 6, w: tvW, h: tvH };
  const lounge: Rect = { x: bx, y: d2, w: bw, h: h1 - 10 - d2 };
  const tvParts = buildLounge(b, lounge, { hallY: h1, aisleX: a1 }, wallTv, true);
  const hutW = Math.min(bw - 70, 124);
  const hutH = Math.min(52, h2 - 10 - (h1 + 30));
  buildServerRoom(b, { x: bx + bw - hutW - 2, y: h2 - 10 - hutH, w: hutW, h: hutH });
  const grove: Rect = { x: bx, y: h1 + 12, w: bw - hutW - 8, h: h2 - 10 - (h1 + 12) };
  const waiting: Rect = { x: bx, y: h2 + 12, w: bw >= 214 ? Math.max(184, bw - 34) : bw, h: Math.min(170, H - 6 - (h2 + 12)) };
  buildWaiting(b, waiting, h2);

  const meeting: Rect = { x: cx, y: Math.max(d3 + 18, h1 - 10 - 180), w: wC, h: Math.min(180, h1 - 10 - (d3 + 18)) };
  const whiteboard = buildMeeting(b, meeting, h1);
  const t2w = Math.min(3, Math.floor((wC - 8) / 48)) * 48;
  tents.push(...deskTents(b, { x: cx + wC - t2w - 2, y: h1 + 12, w: t2w, h: POD_H }, { hallY: h1, aisleX: a2 }));
  const gapC = clamp(W - 6 - cx - 186, 0, 36);
  const bossRoom: Rect = { x: cx + gapC, y: h2 + 12, w: W - 6 - cx - gapC, h: Math.min(170, H - 8 - (h2 + 12)) };
  const boss = buildBoss(b, bossRoom, h2);

  const row3: Rect = { x: A.x, y: h2 + 12, w: A.w, h: H - 6 - (h2 + 12) };
  if (row3.h >= POD_H + 48 && desksWanted > b.desks.length) tents.push(...deskTents(b, { x: A.x, y: row3.y, w: A.w, h: POD_H }, { hallY: h2, aisleX: a1 }));
  utilities(b, H, A.x + 4, h2);

  const couch = tvParts.couch;
  const loungeFree = lounge.y + lounge.h - (couch.y + couch.h + 6);
  const side = loungeFree >= 40 && lounge.w - 2 * 30 >= 110 ? 30 : 16;
  const eventArea: Rect = { x: lounge.x + side, y: couch.y + couch.h + 4, w: lounge.w - 2 * side, h: Math.max(26, loungeFree) };
  const L = finish(b, W, H, false, segments, net, {
    meeting,
    whiteboard,
    boss,
    waiting,
    kitchen,
    lounge,
    games: null,
    eventArea,
    tvParts,
    gamesParts: null,
    doorX: a1,
    lamp: boss.lamp,
    wallTv,
  });

  // The door stands where the calendar was: the calendar and the status board hang by the cuckoo clock instead.
  const clk = L.wall.clock;
  const nx = clk.x + clk.r + 8;
  L.wall.calendar = { ...L.wall.calendar, x: nx };
  L.wall.status = { ...L.wall.status, x: nx };
  // ---- the treehouse: a giant grows up through the cabin's deck at the right edge.
  const tw = edgeR - 8;
  const trunk: Tree = { x: W - edgeR + 2, w: tw, base: bossRoom.y + 46, h: bossRoom.y + 46, seed: 211, role: "treehouse" };
  for (const p of L.props) {
    if (p.id === "boss-shelf") p.x -= tw + 10;
  }
  for (const k of L.pokeables) if (k.kind === "globe") k.rect = { ...k.rect, x: k.rect.x - tw - 10 };
  dropPlant(L, (p) => p.sprite === "PLANT" && p.y < bossRoom.y && p.x > bossRoom.x + bossRoom.w - 70);
  dropPlant(L, (p) => p.sprite === "LARGE_PLANT" && p.y < lounge.y + 10 && p.x > lounge.x && p.x < lounge.x + lounge.w);

  // ---- the forest
  const block = blockers(L);
  const trees: Tree[] = [trunk];
  const creekStrip: Rect = { x: bx + bw, y: 0, w: creekW, h: H };
  // The spring tree at the head of the creek holds one end of the screen; a giant in the clearing's corner the other.
  const spring: Tree = { x: creekStrip.x + Math.round((creekW - (creekW + 2)) / 2), w: creekW + 2, base: d2 + 6, h: d2 + 6, seed: 150 };
  const left: Tree = { x: lounge.x + 2, w: 20, base: d2 + 8, h: d2 + 8, seed: 7 };
  trees.push(spring, left);
  // Giants down the sides of the clearing, carrying the festoon lights.
  const openBlock = blockers(L, ["lounge"]);
  if (side >= 30) {
    const tops = L.props.filter((p) => (p.kind === "piano" || p.kind === "fishtank-stand") && p.y < h1).map((p) => p.z);
    const roof = Math.max(lounge.y + 20, ...tops) + 4;
    for (const [i, sx] of [lounge.x + 2, lounge.x + lounge.w - side + 2].entries()) {
      trees.push(...stripTrees(L, { x: sx, y: roof + 40, w: side - 4, h: h1 - 4 - roof - 40 }, openBlock, 60 + i * 9, { roof, spacing: 100, max: 1, w: side - 6, maxH: 110 }).map((t) => ({ ...t, role: "clearing" as const })));
    }
  }
  if (mL >= 18) trees.push(...stripTrees(L, { x: -8, y: d1 + 50, w: mL + 4, h: H - d1 - 50 }, block, 300, { spacing: 100, wide: true, roof: d1 + 4 }));
  // Wherever else a whole giant fits.
  trees.push(...fillTrees(L, block, trees, 6, 500));
  const creek = creekPath(creekStrip, spring.base - 2, H);
  const keep = trees.filter((t) => t === spring || !(t.x + t.w > creekStrip.x - 2 && t.x < creekStrip.x + creekStrip.w + 2));
  clearPlants(L, keep);
  const hut = L.server!;
  const bridges: Rect[] = [{ x: creekStrip.x - 2, y: hut.y + hut.h - 9, w: creekStrip.w + 4, h: 10 }];
  const data: CampData = { trees: keep, strips: [grove, creekStrip], creek, bridges, screenTrees: [left, spring], tents, trails: true };
  L.themeData = data;
  void overlaps;
  return L;
}
