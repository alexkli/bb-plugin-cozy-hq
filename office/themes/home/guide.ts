// Home Office: the guided tour, told for the neighborhood. Everyone works
// from home, so the places it points at are in every home (the desks, the
// whiteboards, the armchairs) and the calls run between them.
import type { Layout, Rect } from "../../layout.ts";
import type { GuideStepId, GuideStop } from "../../theme.ts";
import { homeData } from "./plan.ts";

const pad = (r: Rect, m = 2): Rect => ({ x: r.x - m, y: r.y - m, w: r.w + m * 2, h: r.h + m * 2 });

export function homeGuide(L: Layout): Partial<Record<GuideStepId, GuideStop>> {
  const d = homeData(L);
  if (!d) return {};
  const desks = d.units.map((u) => L.desks[u.deskIndex]).filter((x) => x !== undefined).map((k) => pad({ x: k.x, y: k.y - 8, w: 30, h: 50 }));
  const boards = d.units.map((u) => L.byId.get(`home-${u.index}-board`)).filter((s) => s !== undefined).map((s) => pad({ x: s.x - 14, y: s.y - 34, w: 28, h: 36 }));
  const lobby = L.seats.map((s) => pad({ x: s.x - 10, y: s.y - 26, w: 20, h: 28 }));
  const homes = d.units.map((u) => u.rect);
  return {
    welcome: {
      title: "Welcome to the neighborhood",
      text: "Here everyone works from home: every thread in bb lives in a little home of its own, and they meet on video calls. A quick tour?",
    },
    agent: { text: "This is an agent: one for each thread, at home. Where it is in its home tells you what it's doing. Click it to open its thread; hover for what it's up to." },
    you: { text: "This is you, the boss, working from your house with a small garden. Click yourself to whistle for the dog; pick how you look in the settings." },
    desks: {
      title: "The work desks",
      text: d.cafe
        ? "Every home has a desk under the window: a thread at work sits there typing. More threads than homes? The newest work from the co-working café until a home's free (the most urgent get one first)."
        : "Every home has a desk under the window: a thread at work sits there typing. The desk shows the model, the chair the provider.",
      rects: d.cafe ? [...desks, pad(d.cafe)] : desks,
    },
    meeting: {
      title: "Meetings are video calls",
      text: "Threads in plan mode plan at the whiteboard at home, on a group call (the purple line between them). A plan for your review: they hold up the blueprint on a call with you (the gold line to your house).",
      rects: boards.length > 0 ? boards : homes,
    },
    waiting: {
      title: "The call lobby",
      text: "Threads that need you wait in their armchair, in the lobby of a call with you: a hand up for a question or an approval, a page ✓ when done, a rain cloud after an error. Without a home, they come round and wait on the bench in your garden.",
      rects: lobby,
    },
    breaks: {
      title: "Breaks at home",
      text: "Idle threads make a coffee in their kitchenette, then sink into an armchair, a sofa or a hammock, and after a long while nap in bed. Now and then two of them catch up on a quick call (the blue line).",
      rects: d.units.flatMap((u) => [pad(u.bed), ...u.pieces.filter((p) => p.kind === "counter" || p.kind === "sofa" || p.kind === "hammock" || p.kind === "armchair" || p.kind === "beanbag").map((p) => pad(p.rect))]),
    },
    door: { title: "The front door", text: "The door across the street: click it to start a new thread. A new one moves in to a free home." },
    tv: { title: "The big screen", text: "The big screen across the street: block news, the weather, tech headlines (and your inbox). Click it to change the channel." },
    click: {
      text: "Click on stuff for fun: ring a doorbell, honk at the traffic, feed the fish in your pond, water the plants, play the arcade. Hold Alt to see everything you can click (a few things are left for you to find).",
    },
  };
}
