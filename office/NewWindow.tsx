// A button in the office's title bar: "open in a new window". bb gives a
// plugin no way to open a bb window (the desktop app only takes that from its
// menu and shortcuts), so the button explains the two shortcuts that do it.

import { useEffect, useRef, useState } from "react";

const MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const keys = (k: string) => (MAC ? `⌘⇧${k}` : `Ctrl+Shift+${k}`);

export function NewWindowButton() {
  const [at, setAt] = useState<{ top: number; right: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!at) return;
    const away = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!pop.current?.contains(t) && !btn.current?.contains(t)) setAt(null);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAt(null);
    };
    const close = () => setAt(null);
    window.addEventListener("pointerdown", away, true);
    window.addEventListener("keydown", esc);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("pointerdown", away, true);
      window.removeEventListener("keydown", esc);
      window.removeEventListener("resize", close);
    };
  }, [at]);
  const toggle = () => {
    if (at) return setAt(null);
    const r = btn.current?.getBoundingClientRect();
    if (r) setAt({ top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) });
  };
  return (
    <>
      <button
        ref={btn}
        type="button"
        className={`chq-newwin${at ? " is-open" : ""}`}
        title="Open the office in a new window"
        aria-label="Open the office in a new window"
        aria-expanded={at !== null}
        onClick={toggle}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="3" y="5" width="14" height="14" rx="2" />
          <path d="M3 9h14" />
          <path d="M14 3h7v7" />
          <path d="M21 3l-7 7" />
        </svg>
      </button>
      {at && (
        <div ref={pop} className="chq-newwin-pop" role="dialog" aria-label="Open in a new window" style={{ top: at.top, right: at.right }}>
          <b>The office in its own window</b>
          <ol>
            <li>
              Press <kbd>{keys("N")}</kbd> for a new bb window (File → New Window).
            </li>
            <li>
              In it, press <kbd>{keys("H")}</kbd> to bring the office there.
            </li>
          </ol>
          <p>bb doesn't let a plugin open a window itself, hence the two steps. Only the office you're looking at plays sound.</p>
        </div>
      )}
    </>
  );
}
