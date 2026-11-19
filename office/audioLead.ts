// Which open office may make sound. bb can keep the panel mounted while you
// are in a thread, and you can have the office open in more than one bb
// window (File → New Window, then Mod+Shift+H). Only an office you can see
// plays, and of several you can see, the one you looked at last: it holds a
// claim in localStorage (shared by every window) and refreshes it while it
// stays visible. A claim nobody refreshed for a while is up for grabs.

export interface AudioClaim {
  id: string;
  at: number;
}

/** A claim older than this was left by an office that closed or went away. */
export const CLAIM_TTL_MS = 6_000;

/** May the office `me` play now? */
export function mayPlay(visible: boolean, claim: AudioClaim | null, me: string, now: number): boolean {
  if (!visible) return false;
  return !claim || claim.id === me || now - claim.at > CLAIM_TTL_MS;
}

export class AudioLead {
  readonly id = Math.random().toString(36).slice(2);
  private readonly key: string;
  private readonly visible: () => boolean;
  constructor(key: string, visible: () => boolean) {
    this.key = key;
    this.visible = visible;
  }

  private read(): AudioClaim | null {
    try {
      const v = JSON.parse(window.localStorage.getItem(this.key) ?? "null") as AudioClaim | null;
      return v && typeof v.id === "string" && typeof v.at === "number" ? v : null;
    } catch {
      return null;
    }
  }

  private write(claim: AudioClaim | null): void {
    try {
      if (claim) window.localStorage.setItem(this.key, JSON.stringify(claim));
      else window.localStorage.removeItem(this.key);
    } catch {
      // Storage off: every visible office plays.
    }
  }

  allowed(): boolean {
    return mayPlay(this.visible(), this.read(), this.id, Date.now());
  }

  /** You looked at this office (it showed up, you clicked it, its window got focus). */
  claim(): void {
    if (this.visible()) this.write({ id: this.id, at: Date.now() });
  }

  /** Keep the claim while visible; take a free one; let go when hidden. */
  tick(): void {
    const c = this.read();
    if (!this.visible()) {
      if (c?.id === this.id) this.write(null);
      return;
    }
    if (mayPlay(true, c, this.id, Date.now())) this.write({ id: this.id, at: Date.now() });
  }

  release(): void {
    if (this.read()?.id === this.id) this.write(null);
  }
}
