// The office buddy: one of your agents strolls in a corner of bb wherever you
// are. It prefers an agent that needs you; otherwise it rotates through the
// office. Click it to open Cozy HQ; drag it anywhere.

import { useEffect, useMemo, useRef, useState } from "react";
import { charSprite, lookFor, CHAR_W, CHAR_H, type CharPose, type Expression } from "./characters.ts";
import { moodOf, topicOf, visibleThreads, waitKindOf, WAIT_LABEL, type ThreadLike, type WaitKind } from "./model.ts";

export interface BuddyThread extends ThreadLike {
  projectHue: number;
}

interface Props {
  pluginId: string;
  threads: BuddyThread[];
  storageKey: string;
  hidden: boolean;
  onOpen: () => void;
}

const S = 3; // CSS px per sprite pixel
const TOP = 12; // sprite pixels of headroom for the speech bubble
const TRACK = 70; // CSS px it strolls back and forth

function pickOrder(threads: BuddyThread[]): BuddyThread[] {
  const needy = threads.filter((t) => waitKindOf(t) !== null);
  return needy.length > 0 ? needy : threads;
}

const BUBBLE: Record<WaitKind, { icon: string; color: string }> = {
  question: { icon: "?", color: "#9fd0ff" },
  plan: { icon: "▤", color: "#9fc4ff" },
  approval: { icon: "!", color: "#ffcf4a" },
  drafting: { icon: "…", color: "#ffffff" },
  done: { icon: "✓", color: "#7be08f" },
  error: { icon: "✕", color: "#ff9a9a" },
};

export function Buddy(props: Props) {
  const visible = useMemo(() => visibleThreads(props.threads) as BuddyThread[], [props.threads]);
  const order = useMemo(() => pickOrder(visible), [visible]);
  const [index, setIndex] = useState(0);
  const current = order.length > 0 ? order[index % order.length]! : null;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pos, setPos] = useState<{ right: number; bottom: number }>(() => {
    try {
      const raw = window.localStorage.getItem(`${props.storageKey}:buddy-pos`);
      const p = raw ? (JSON.parse(raw) as { right?: unknown; bottom?: unknown }) : null;
      if (p && typeof p.right === "number" && typeof p.bottom === "number" && Number.isFinite(p.right) && Number.isFinite(p.bottom)) {
        return { right: Math.max(0, p.right), bottom: Math.max(0, p.bottom) };
      }
    } catch {
      // ignore
    }
    return { right: 22, bottom: 150 };
  });
  const [hover, setHover] = useState(false);
  const drag = useRef<{ x: number; y: number; right: number; bottom: number; moved: boolean } | null>(null);

  // Rotate every 20 s (needy agents rotate among themselves).
  useEffect(() => {
    const id = window.setInterval(() => setIndex((i) => i + 1), 20_000);
    return () => window.clearInterval(id);
  }, []);

  const state = useRef({ x: 0, dir: 1 as 1 | -1, walked: 0, pause: 2, wave: 0, t: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !current || props.hidden) return;
    const ctx = canvas.getContext("2d")!;
    const look = lookFor(current.id, current.projectHue);
    const emblem = topicOf(current.displayTitle);
    const mood = moodOf(current);
    const kind = waitKindOf(current);
    const waiting = kind !== null;
    const bubble = kind ? BUBBLE[kind] : null;
    let raf = 0;
    let last = performance.now();
    const st = state.current;
    st.wave = waiting ? 1.5 : 0;
    const frame = (ts: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.1, (ts - last) / 1000);
      last = ts;
      if (document.hidden) return;
      st.t += dt;
      let pose: CharPose = "stand";
      let facing: "front" | "left" | "right" = "front";
      let expr: Expression = Math.floor(st.t * 10) % 41 === 0 ? "blink" : "open";
      if (st.wave > 0) {
        st.wave -= dt;
        pose = Math.floor(st.t * 3) % 2 ? "raise" : "stand";
        expr = "happy";
      } else if (st.pause > 0) {
        st.pause -= dt;
        if (mood === "working") pose = Math.floor(st.t * 6) % 2 ? "type1" : "type0";
        if (st.pause <= 0 && Math.random() < 0.25) st.wave = 1.2;
      } else {
        const step = 14 * dt;
        st.x += st.dir * step;
        st.walked += step;
        if (st.x > TRACK / S || st.x < 0) {
          st.dir = st.x > TRACK / S ? -1 : 1;
          st.x = Math.max(0, Math.min(TRACK / S, st.x));
          st.pause = 2 + Math.random() * 4;
        }
        facing = st.dir > 0 ? "right" : "left";
        pose = (`walk${Math.floor(st.walked / 3) % 4}` as CharPose);
      }
      const sprite = charSprite({ look, facing, pose, expr, emblem });
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      const px = Math.round(st.x);
      ctx.fillRect((px + 5) * S, (TOP + CHAR_H - 1) * S, 10 * S, 2 * S);
      ctx.drawImage(sprite, px * S, TOP * S, CHAR_W * S, CHAR_H * S);
      if (bubble) {
        const bob = Math.round(Math.abs(Math.sin(st.t * 3)) * 2);
        const bx = (px + 12) * S;
        const by = (1 - bob / S) * S;
        ctx.fillStyle = "#2a1e2e";
        ctx.fillRect(bx - S, by - S, 11 * S, 10 * S);
        ctx.fillRect(bx, by + 9 * S, 3 * S, 2 * S);
        ctx.fillStyle = bubble.color;
        ctx.fillRect(bx, by, 9 * S, 8 * S);
        ctx.fillStyle = "#2a1e2e";
        ctx.font = `bold ${6 * S}px ui-monospace, Menlo, monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(bubble.icon, bx + 4.5 * S, by + 4.3 * S);
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [current, props.hidden]);

  if (props.hidden || !current) return null;
  const kind = waitKindOf(current);
  const width = TRACK + CHAR_W * S;
  const height = (CHAR_H + TOP) * S;
  const savePos = (p: { right: number; bottom: number }) => {
    try {
      window.localStorage.setItem(`${props.storageKey}:buddy-pos`, JSON.stringify(p));
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="chq-buddy"
      data-bb-plugin-root=""
      data-bb-plugin={props.pluginId}
      style={{ right: pos.right, bottom: pos.bottom, width, height }}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        drag.current = { x: e.clientX, y: e.clientY, right: pos.right, bottom: pos.bottom, moved: false };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        const dx = e.clientX - d.x;
        const dy = e.clientY - d.y;
        if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true;
        if (!d.moved) return;
        const next = {
          right: Math.max(0, Math.min(window.innerWidth - width, d.right - dx)),
          bottom: Math.max(0, Math.min(window.innerHeight - height, d.bottom - dy)),
        };
        setPos(next);
      }}
      onPointerUp={() => {
        const d = drag.current;
        drag.current = null;
        if (d?.moved) savePos(pos);
        else props.onOpen();
      }}
      role="button"
      tabIndex={0}
      aria-label={`Open Cozy HQ. ${current.displayTitle}${kind ? `: ${WAIT_LABEL[kind]}` : ""}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") props.onOpen();
      }}
    >
      <canvas ref={canvasRef} width={width} height={height} className="chq-buddy-canvas" />
      {hover ? (
        <span className="chq-buddy-tip">
          <b>{current.displayTitle}</b>
          <span>{kind ? WAIT_LABEL[kind] : moodOf(current) === "working" ? "Working" : "Hanging out"} · open Cozy HQ</span>
        </span>
      ) : null}
    </div>
  );
}
