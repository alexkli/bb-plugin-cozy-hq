// You in the settings: a compact row (a small preview, the figure, and a
// button to customize) and the look editor it opens, with a big live preview
// of you as the current scenery dresses you, front and back.

import { useEffect, useMemo, useRef, useState } from "react";
import { CHAR_H, CHAR_W, charSprite, type Expression, type Wear } from "./characters.ts";
import type { Facing } from "./layout.ts";
import type { Theme } from "./theme.ts";
import {
  ACCENTS,
  DEFAULT_YOU,
  dressYou,
  EXTRA_WEAR,
  FACE_WEAR,
  FIGURES,
  HAIR_COLORS,
  HAIR_STYLES,
  HATS,
  PATTERNS,
  PRONOUNS,
  SHIRT_COLORS,
  SKIN_TONES,
  TOPS,
  toggleWear,
  withFigure,
  youEmblem,
  type You,
} from "./you.ts";

type Update = (update: (you: You) => You) => void;

/** Blinks now and then, like the office. */
function useBlink(): boolean {
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
  return blink;
}

/** Your sprite, dressed by the scenery the way the office draws you. */
function YouPreview(props: { you: You; theme: Theme; facing: Facing; scale: number; blink: boolean; label: string }) {
  const { you, theme, facing, scale, blink } = props;
  const ref = useRef<HTMLCanvasElement>(null);
  const native = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = CHAR_W;
    c.height = CHAR_H;
    return c;
  }, []);
  useEffect(() => {
    const out = ref.current?.getContext("2d");
    const ctx = native.getContext("2d");
    if (!out || !ctx) return;
    const look = dressYou(you, theme);
    const expr: Expression = blink ? "blink" : "open";
    ctx.clearRect(0, 0, CHAR_W, CHAR_H);
    ctx.drawImage(charSprite({ look, facing, pose: "stand", expr, emblem: facing === "back" ? null : youEmblem(you) }), 0, 0);
    theme.dressVisitor?.(ctx, { x: 0, y: 0, facing, pose: "stand", kind: "boss", look }, 0);
    out.imageSmoothingEnabled = false;
    out.clearRect(0, 0, CHAR_W * scale, CHAR_H * scale);
    out.drawImage(native, 0, 0, CHAR_W * scale, CHAR_H * scale);
  }, [you, theme, facing, scale, blink, native]);
  return <canvas ref={ref} className="chq-you-preview" width={CHAR_W * scale} height={CHAR_H * scale} role="img" aria-label={props.label} />;
}

function Choices<T extends string | null>(props: { label: string; value: T; options: { id: T; label: string }[]; onPick: (id: T) => void }) {
  return (
    <div className="chq-you-chips" role="radiogroup" aria-label={props.label}>
      {props.options.map((o) => (
        <button key={String(o.id)} type="button" role="radio" aria-checked={o.id === props.value} className={`chq-you-chip${o.id === props.value ? " is-on" : ""}`} onClick={() => props.onPick(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggles(props: { label: string; on: readonly Wear[]; options: { id: Wear; label: string }[]; onToggle: (w: Wear) => void }) {
  return (
    <div className="chq-you-chips" role="group" aria-label={props.label}>
      {props.options.map((o) => {
        const on = props.on.includes(o.id);
        return (
          <button key={o.id} type="button" aria-pressed={on} className={`chq-you-chip${on ? " is-on" : ""}`} onClick={() => props.onToggle(o.id)}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Color swatches; `auto` adds a first one for "as the scenery dresses you" (null). */
function Swatches(props: { label: string; value: string | null; options: { color: string; name: string }[]; auto?: string; onPick: (color: string | null) => void }) {
  const items: { color: string | null; name: string }[] = props.auto ? [{ color: null, name: props.auto }, ...props.options] : props.options;
  return (
    <div className="chq-you-swatches" role="radiogroup" aria-label={props.label}>
      {items.map((o) => (
        <button
          key={o.color ?? "auto"}
          type="button"
          role="radio"
          aria-checked={o.color === props.value}
          aria-label={o.name}
          title={o.name}
          className={`chq-you-swatch${o.color === props.value ? " is-on" : ""}${o.color === null ? " is-auto" : ""}`}
          style={o.color ? { background: o.color } : undefined}
          onClick={() => props.onPick(o.color)}
        />
      ))}
    </div>
  );
}

/** The compact "You" row in the settings: a small preview, the figure, and Customize. */
export function YouRow(props: { you: You; theme: Theme; onChange: Update; onCustomize: () => void }) {
  const blink = useBlink();
  return (
    <div className="chq-you-row">
      <YouPreview you={props.you} theme={props.theme} facing="front" scale={2} blink={blink} label="How you look in the office" />
      <div className="chq-you-who">
        <Choices label="Figure" value={props.you.figure} options={FIGURES} onPick={(f) => props.onChange((y) => withFigure(y, f))} />
        <button type="button" className="chq-you-more" onClick={props.onCustomize}>
          Customize…
        </button>
      </div>
    </div>
  );
}

/** The full look editor: a dialog over the office with a big preview (front and back). */
export function LookEditor(props: { you: You; theme: Theme; onChange: Update; onClose: () => void }) {
  const { you, theme, onChange } = props;
  const set = (patch: Partial<You>) => onChange((y) => ({ ...y, ...patch }));
  const blink = useBlink();
  const ref = useRef<HTMLDivElement>(null);
  const onClose = props.onClose;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    ref.current?.querySelector<HTMLElement>(".chq-look-done")?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const section = (title: string) => <div className="chq-settings-label">{title}</div>;
  return (
    <div className="chq-look-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="chq-look" ref={ref} role="dialog" aria-modal="true" aria-label="Your look">
        <div className="chq-settings-head">
          <b>Your look</b>
          <button type="button" className="chq-sound-x" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="chq-look-body">
          <div className="chq-look-stage">
            <YouPreview you={you} theme={theme} facing="front" scale={4} blink={blink} label="You from the front" />
            <YouPreview you={you} theme={theme} facing="back" scale={4} blink={false} label="You from behind" />
            <small>as {theme.name} dresses you</small>
          </div>
          <div className="chq-look-opts">
            {section("Figure")}
            <Choices label="Figure" value={you.figure} options={FIGURES} onPick={(f) => onChange((y) => withFigure(y, f))} />
            {section("Pronouns")}
            <Choices label="Pronouns" value={you.pronouns} options={PRONOUNS} onPick={(pronouns) => set({ pronouns })} />
            {section("Skin")}
            <Swatches label="Skin tone" value={you.skin} options={SKIN_TONES} onPick={(skin) => skin && set({ skin })} />
            {section("Hair")}
            <Swatches label="Hair color" value={you.hair} options={HAIR_COLORS} onPick={(hair) => hair && set({ hair })} />
            <Choices label="Hair style" value={you.hairStyle} options={HAIR_STYLES} onPick={(hairStyle) => set({ hairStyle })} />
            {section("Top")}
            <Choices label="Top" value={you.top} options={TOPS} onPick={(top) => set({ top })} />
            <Swatches label="Shirt color" value={you.shirt} options={SHIRT_COLORS} auto="As the scenery dresses you" onPick={(shirt) => set({ shirt })} />
            <Choices label="Pattern" value={you.pattern} options={PATTERNS} onPick={(pattern) => set({ pattern })} />
            {section("Hat")}
            <Choices label="Hat" value={you.hat} options={HATS} onPick={(hat) => set({ hat })} />
            {section("Face")}
            <Toggles label="Face" on={you.wear} options={FACE_WEAR} onToggle={(w) => onChange((y) => toggleWear(y, w))} />
            {section("Extras")}
            <Toggles label="Extras" on={you.wear} options={EXTRA_WEAR} onToggle={(w) => onChange((y) => toggleWear(y, w))} />
            <span className="chq-you-sub">Color of the hat, scarf, headphones, lanyard, pin and bow</span>
            <Swatches label="Accent color" value={you.accent} options={ACCENTS} auto="As the scenery has it" onPick={(accent) => set({ accent })} />
          </div>
        </div>
        <div className="chq-look-foot">
          <button type="button" className="chq-sound-test chq-look-reset" onClick={() => onChange((y) => ({ ...DEFAULT_YOU, figure: y.figure, pronouns: y.pronouns, top: FIGURES.find((f) => f.id === y.figure)!.top }))}>
            Start over
          </button>
          <button type="button" className="chq-sound-toggle is-on chq-look-done" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
