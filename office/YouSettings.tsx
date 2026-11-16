// The "You" section of the settings: how the boss (you) looks in the office
// and which pronouns its words use, with a live preview of the sprite as the
// current scenery dresses you.

import { useEffect, useMemo, useRef, useState } from "react";
import { CHAR_H, CHAR_W, charSprite, type Expression } from "./characters.ts";
import type { Theme } from "./theme.ts";
import { FIGURES, HAIR_COLORS, HAIR_STYLES, PRONOUNS, SKIN_TONES, youEmblem, youLook, type You } from "./you.ts";

const SCALE = 3;

/** Your sprite, dressed by the scenery the way the office draws you; it blinks now and then. */
function YouPreview(props: { you: You; theme: Theme }) {
  const { you, theme } = props;
  const ref = useRef<HTMLCanvasElement>(null);
  const native = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = CHAR_W;
    c.height = CHAR_H;
    return c;
  }, []);
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    let off = 0;
    const id = window.setInterval(() => {
      setBlink(true);
      off = window.setTimeout(() => setBlink(false), 140);
    }, 3200);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(off);
    };
  }, []);
  useEffect(() => {
    const out = ref.current?.getContext("2d");
    const ctx = native.getContext("2d");
    if (!out || !ctx) return;
    const base = youLook(you);
    const dressed = theme.npc?.("boss", base) ?? base;
    // Same as the office: a scenery that keeps the key gets its own sprite.
    const look = theme.npc && dressed.key === base.key ? { ...dressed, key: `${base.key}|${theme.id}` } : dressed;
    const expr: Expression = blink ? "blink" : "open";
    ctx.clearRect(0, 0, CHAR_W, CHAR_H);
    ctx.drawImage(charSprite({ look, facing: "front", pose: "stand", expr, emblem: youEmblem(you) }), 0, 0);
    theme.dressVisitor?.(ctx, { x: 0, y: 0, facing: "front", pose: "stand", kind: "boss", look }, 0);
    out.imageSmoothingEnabled = false;
    out.clearRect(0, 0, CHAR_W * SCALE, CHAR_H * SCALE);
    out.drawImage(native, 0, 0, CHAR_W * SCALE, CHAR_H * SCALE);
  }, [you, theme, blink, native]);
  return <canvas ref={ref} className="chq-you-preview" width={CHAR_W * SCALE} height={CHAR_H * SCALE} role="img" aria-label="How you look in the office" />;
}

function Choices<T extends string>(props: { label: string; value: T; options: { id: T; label: string }[]; onPick: (id: T) => void }) {
  return (
    <div className="chq-you-chips" role="radiogroup" aria-label={props.label}>
      {props.options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={o.id === props.value} className={`chq-you-chip${o.id === props.value ? " is-on" : ""}`} onClick={() => props.onPick(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Swatches(props: { label: string; value: string; options: { color: string; name: string }[]; onPick: (color: string) => void }) {
  return (
    <div className="chq-you-swatches" role="radiogroup" aria-label={props.label}>
      {props.options.map((o) => (
        <button
          key={o.color}
          type="button"
          role="radio"
          aria-checked={o.color === props.value}
          aria-label={o.name}
          title={o.name}
          className={`chq-you-swatch${o.color === props.value ? " is-on" : ""}`}
          style={{ background: o.color }}
          onClick={() => props.onPick(o.color)}
        />
      ))}
    </div>
  );
}

export function YouSettings(props: { you: You; theme: Theme; onChange: (patch: Partial<You>) => void }) {
  const { you } = props;
  const set = props.onChange;
  return (
    <div className="chq-you">
      <div className="chq-you-top">
        <YouPreview you={you} theme={props.theme} />
        <div className="chq-you-who">
          <span className="chq-you-sub">Figure</span>
          <Choices
            label="Figure"
            value={you.figure}
            options={FIGURES}
            onPick={(figure) => set({ figure, pronouns: FIGURES.find((f) => f.id === figure)!.pronouns })}
          />
          <span className="chq-you-sub">Pronouns</span>
          <Choices label="Pronouns" value={you.pronouns} options={PRONOUNS} onPick={(pronouns) => set({ pronouns })} />
        </div>
      </div>
      <span className="chq-you-sub">Skin</span>
      <Swatches label="Skin tone" value={you.skin} options={SKIN_TONES} onPick={(skin) => set({ skin })} />
      <span className="chq-you-sub">Hair</span>
      <Swatches label="Hair color" value={you.hair} options={HAIR_COLORS} onPick={(hair) => set({ hair })} />
      <Choices label="Hair style" value={you.hairStyle} options={HAIR_STYLES} onPick={(hairStyle) => set({ hairStyle })} />
      <label className="chq-sound-amb chq-you-glasses">
        <input type="checkbox" checked={you.glasses} onChange={(e) => set({ glasses: e.target.checked })} />
        <span>Glasses</span>
      </label>
    </div>
  );
}
