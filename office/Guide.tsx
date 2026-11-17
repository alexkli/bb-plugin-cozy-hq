// The guided tour: a spotlight on one part of the office at a time with a
// note saying what it is ("this is an agent, one for each thread", "this is
// you", the desks, the waiting area, …). It opens by itself the first time
// someone opens Cozy HQ, and from the sticky-note legend any time after.
// Sceneries retell it in their own words and places (Theme.guide).

import { useEffect, useMemo } from "react";
import type { CSSProperties } from "react";
import type { Layout, PokeKind, Rect } from "./layout.ts";
import { relabel, withPets, type GuideStepId, type GuideStop, type Theme } from "./theme.ts";

export interface GuideStep {
  id: GuideStepId;
  title: string;
  text: string;
  /** What to point at (native px); none: a note in the middle. */
  rects: Rect[];
}

/** Where an agent stands: from its head anchor (see World.anchorOf). */
export function agentRect(p: { x: number; y: number }): Rect {
  return { x: p.x - 12, y: p.y - 2, w: 24, h: 34 };
}

const pad = (r: Rect, m = 3): Rect => ({ x: r.x - m, y: r.y - m, w: r.w + m * 2, h: r.h + m * 2 });

/** Things worth clicking first, in order. */
const FUN: PokeKind[] = ["coffee", "piano", "fishtank", "arcade", "vending", "plant", "dartboard", "globe", "couch", "cradle"];

/** The tour for this floor plan: the office's steps, retold by the scenery, words relabeled. */
export function guideSteps(L: Layout, theme: Theme, named: Theme, agent: Rect | null): GuideStep[] {
  const fun: Rect[] = [];
  for (const k of FUN) {
    const p = L.pokeables.find((q) => q.kind === k);
    if (p && fun.length < 5) fun.push(p.rect);
  }
  const boss = L.boss.seat;
  const base: GuideStep[] = [
    {
      id: "welcome",
      title: "Welcome to Cozy HQ",
      text: "Every thread you have in bb is a little worker in this office, and where they are tells you what they're doing. A quick tour?",
      rects: [],
    },
    {
      id: "agent",
      title: "An agent",
      text: "This is an agent: one for each thread. Click one to open its thread; hover over it to see what it's up to. The Names button at the top (or the N key) puts a name tag over everyone.",
      rects: agent ? [agent] : [],
    },
    {
      id: "you",
      title: "You, the boss",
      text: "This is you, the boss, at your desk. Click yourself to whistle for {dog}; pick how you look in the settings.",
      rects: [{ x: boss.x - 16, y: boss.y - 32, w: 32, h: 38 }],
    },
    {
      id: "desks",
      title: "The work desks",
      text: "Threads at work sit at the desks, typing away. The desk shows the model, the chair the provider; helpers in caps are a thread's subagents.",
      rects: L.pods.length > 0 ? L.pods : L.desks.map((d) => ({ x: d.x, y: d.y - 8, w: 48, h: 48 })),
    },
    {
      id: "meeting",
      title: "The meeting room",
      text: "Threads in plan mode plan at the whiteboard. When a plan is ready for your review, they present it here, blueprint in hand.",
      rects: [L.meeting],
    },
    {
      id: "waiting",
      title: "The waiting area",
      text: "Threads that need you wait here: a hand up for a question or an approval, a page ✓ when they're done, a rain cloud after an error. Click one to answer it.",
      rects: [L.waiting],
    },
    {
      id: "breaks",
      title: "Breaks",
      text: "Idle threads take a break: a coffee in the kitchen first, then the lounge, and a nap after a long while. They chat about what they did.",
      rects: [L.kitchen, L.lounge],
    },
    {
      id: "door",
      title: "The door",
      text: "Click the door to start a new thread. New threads walk in here; the +n beside it counts any there's no room for.",
      rects: [L.wall.door],
    },
    {
      id: "pinboard",
      title: "The pinboard",
      text: "How much of your plan each provider has used, and when it resets. Click it to refresh.",
      rects: [L.wall.pinboard],
    },
    {
      id: "tv",
      title: "The TV",
      text: "Office news, the weather, tech headlines (and your inbox). Click it to change the channel.",
      rects: [L.tv],
    },
    {
      id: "click",
      title: "Click on stuff",
      text: "Lots to click for fun: the espresso machine, the piano, the plants, the fish, {dog} and {cat}… Hold Alt (Option) to see everything you can click.",
      rects: fun,
    },
    {
      id: "legend",
      title: "What everything means",
      text: "The sticky note explains what everything means, and has this tour. The gear at the top right holds the settings: sound, the scenery (move the office somewhere else) and how you look.",
      rects: [L.wall.legendNote],
    },
  ];
  const own: Partial<Record<GuideStepId, GuideStop>> = theme.guide?.(L) ?? {};
  const out: GuideStep[] = [];
  for (const s of base) {
    const o = own[s.id];
    if (o?.skip) continue;
    const step: GuideStep = {
      id: s.id,
      title: o?.title ?? relabel(named, s.title),
      text: o?.text ?? relabel(named, s.text),
      rects: (s.id === "agent" ? s.rects : (o?.rects ?? s.rects)).map((r) => pad(r)),
    };
    step.title = withPets(step.title, named);
    step.text = withPets(step.text, named);
    // An agent to point at, or the step is left out (nobody in yet).
    if (s.id === "agent" && step.rects.length === 0) continue;
    out.push(step);
  }
  return out;
}

const union = (rs: Rect[]): Rect | null => {
  if (rs.length === 0) return null;
  const x0 = Math.min(...rs.map((r) => r.x));
  const y0 = Math.min(...rs.map((r) => r.y));
  const x1 = Math.max(...rs.map((r) => r.x + r.w));
  const y1 = Math.max(...rs.map((r) => r.y + r.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
};

export function Guide(props: {
  steps: GuideStep[];
  index: number;
  /** CSS px per native px, and the scene's size in CSS px. */
  scale: number;
  width: number;
  height: number;
  onStep: (index: number) => void;
  onClose: () => void;
}) {
  const { steps, index, scale, width, height, onStep, onClose } = props;
  const step = steps[Math.min(index, steps.length - 1)];
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        if (index >= steps.length - 1) onClose();
        else onStep(index + 1);
      } else if (e.key === "ArrowLeft" && index > 0) {
        e.preventDefault();
        onStep(index - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, steps.length, onStep, onClose]);
  const holes = useMemo(
    () =>
      (step?.rects ?? []).map((r) => {
        const x = Math.max(0, r.x * scale);
        const y = Math.max(0, r.y * scale);
        return { x, y, w: Math.min(width, (r.x + r.w) * scale) - x, h: Math.min(height, (r.y + r.h) * scale) - y };
      }),
    [step, scale, width, height],
  );
  if (!step) return null;
  const first = index === 0;
  const last = index >= steps.length - 1;
  // The note goes below what it points at when there's room, else above, else beside it.
  const cardW = Math.min(320, width - 16);
  const cardH = 150;
  const u = union(holes);
  let card: CSSProperties;
  if (!u) card = { left: (width - cardW) / 2, top: Math.max(8, (height - cardH) / 2) };
  else {
    const cx = Math.min(Math.max(u.x + u.w / 2 - cardW / 2, 8), width - cardW - 8);
    if (u.y + u.h + 12 + cardH <= height) card = { left: cx, top: u.y + u.h + 12 };
    else if (u.y - 12 - cardH >= 0) card = { left: cx, top: u.y - 12 - cardH };
    else card = { left: cx, top: Math.max(8, height - cardH - 8) };
  }
  return (
    <div className="chq-guide" role="dialog" aria-modal="true" aria-label="Tour of the office" onClick={(e) => e.stopPropagation()}>
      <svg className="chq-guide-dim" width={width} height={height} aria-hidden>
        <defs>
          <mask id="chq-guide-mask">
            <rect x="0" y="0" width={width} height={height} fill="white" />
            {holes.map((h, i) => (
              <rect key={i} x={h.x} y={h.y} width={h.w} height={h.h} rx={6} fill="black" />
            ))}
          </mask>
        </defs>
        <rect x="0" y="0" width={width} height={height} fill="rgba(18,12,28,0.62)" mask="url(#chq-guide-mask)" />
      </svg>
      {holes.map((h, i) => (
        <div key={i} className="chq-guide-ring" style={{ left: h.x - 2, top: h.y - 2, width: h.w + 4, height: h.h + 4 }} />
      ))}
      <div className={`chq-guide-card${first ? " is-welcome" : ""}`} style={{ ...card, width: cardW }} key={step.id}>
        <i className="chq-pushpin" />
        {first ? null : (
          <span className="chq-guide-count">
            {index} / {steps.length - 1}
          </span>
        )}
        <b>{step.title}</b>
        <p>{step.text}</p>
        <div className="chq-guide-buttons">
          {first ? (
            <>
              <button type="button" className="chq-guide-skip" onClick={onClose}>
                Not now
              </button>
              <button type="button" className="chq-guide-next" onClick={() => onStep(1)} autoFocus>
                Show me around ▸
              </button>
            </>
          ) : (
            <>
              <button type="button" className="chq-guide-skip" onClick={onClose}>
                Skip
              </button>
              {index > 1 ? (
                <button type="button" className="chq-guide-back" onClick={() => onStep(index - 1)}>
                  ◂ Back
                </button>
              ) : null}
              <button type="button" className="chq-guide-next" onClick={() => (last ? onClose() : onStep(index + 1))} autoFocus>
                {last ? "Done" : "Next ▸"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
