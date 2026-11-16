// Tech news for the office TV: the sources to pick from and a small RSS /
// Atom reader for them. Pure (no DOM, no dependencies), so the server and
// tests can use it.

export const NEWS_SOURCE_IDS = ["hn", "lobsters", "techmeme", "verge", "ars", "dev", "slashdot", "github", "mix", "custom"] as const;
export type NewsSourceId = (typeof NEWS_SOURCE_IDS)[number];

export interface NewsSource {
  /** In the settings. */
  name: string;
  /** On the TV ("TECH ▸ HN"), and next to each headline in a mix. */
  tv: string;
  /** RSS or Atom; the others have their own API. */
  feed?: string;
}

export const NEWS_SOURCES: Record<NewsSourceId, NewsSource> = {
  hn: { name: "Hacker News", tv: "HN" },
  lobsters: { name: "Lobsters", tv: "Lobsters" },
  techmeme: { name: "Techmeme", tv: "Techmeme", feed: "https://www.techmeme.com/feed.xml" },
  verge: { name: "The Verge", tv: "Verge", feed: "https://www.theverge.com/rss/index.xml" },
  ars: { name: "Ars Technica", tv: "Ars", feed: "https://feeds.arstechnica.com/arstechnica/index" },
  dev: { name: "DEV Community", tv: "DEV" },
  slashdot: { name: "Slashdot", tv: "Slashdot", feed: "https://rss.slashdot.org/Slashdot/slashdotMain" },
  github: { name: "GitHub Blog", tv: "GitHub", feed: "https://github.blog/feed/" },
  mix: { name: "Mix (Hacker News, Lobsters, Techmeme, The Verge, Ars Technica)", tv: "Mix" },
  custom: { name: "Custom feed", tv: "Feed" },
};

/** The sources a mix takes turns between. */
export const MIX: readonly NewsSourceId[] = ["hn", "lobsters", "techmeme", "verge", "ars"];

/** Headlines per source (and per mix) on the TV. */
export const MAX_STORIES = 16;

/** The picked source; anything unknown is Hacker News. */
export function newsSourceOf(setting: string): NewsSourceId {
  return (NEWS_SOURCE_IDS as readonly string[]).includes(setting) ? (setting as NewsSourceId) : "hn";
}

/** The custom feed setting as a URL: https only, anything else is no feed. */
export function feedUrl(raw: string): URL | null {
  try {
    const u = new URL(raw.trim());
    return u.protocol === "https:" && !u.username && !u.password ? u : null;
  } catch {
    return null;
  }
}

/** "www.example.com" → "example.com". */
export function siteOf(u: URL): string {
  return u.hostname.replace(/^www\./, "");
}

const NAMED: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  laquo: "«",
  raquo: "»",
  middot: "·",
  bull: "•",
  copy: "©",
  reg: "®",
  trade: "™",
  euro: "€",
  times: "×",
};

/** XML entities, numeric references and the HTML ones headlines use; unknown ones stay as they are. */
export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, e: string) => {
    if (e[0] !== "#") return NAMED[e] ?? whole;
    const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    if (code < 32) return " ";
    return code <= 0x10ffff && (code < 0xd800 || code > 0xdfff) ? String.fromCodePoint(code) : whole;
  });
}

/** Feed bytes as text, in the charset the server or the XML declaration names (Slashdot's is ISO-8859-1). */
export function decodeFeedBytes(bytes: Uint8Array, contentType: string | null): string {
  const head = String.fromCharCode(...bytes.subarray(0, 256));
  const label =
    /charset\s*=\s*["']?([\w.:-]+)/i.exec(contentType ?? "")?.[1] ??
    /<\?xml[^>]*\sencoding\s*=\s*["']([\w.:-]+)["']/i.exec(head)?.[1] ??
    "utf-8";
  try {
    return new TextDecoder(label).decode(bytes);
  } catch {
    return new TextDecoder().decode(bytes);
  }
}

export interface FeedItem {
  /** The guid or id, else the link. */
  id: string;
  title: string;
  /** An http(s) link, resolved against the feed's address. */
  url: string;
  /** When it was published (ms), if the feed says. */
  at: number | null;
}

export interface Feed {
  /** The feed's own name, e.g. "Ars Technica". */
  title: string | null;
  items: FeedItem[];
}

// CDATA becomes escaped text (so markup inside can't look like the feed's
// own tags) and comments go, in one pass so neither can hide in the other.
const RAW = /<!\[CDATA\[([\s\S]*?)\]\]>|<!--[\s\S]*?-->/g;
const ITEM = /<(item|entry)(?:\s[^>]*)?(?<!\/)>([\s\S]*?)<\/\1\s*>/g;
const element = (name: string) => new RegExp(`<${name}(\\s[^>]*)?(?<!/)>([\\s\\S]*?)</${name}\\s*>`);
const TITLE = element("title");
const LINK = element("link");
const GUID = element("guid");
const ID = element("id");
const DATES = ["pubDate", "published", "updated", "dc:date"].map(element);
const LINK_TAG = /<link\s([^>]*)>/g;
const ATTR = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

const escapeText = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function attrs(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of raw.matchAll(ATTR)) out[m[1]!.toLowerCase()] = decodeEntities(m[2] ?? m[3] ?? "");
  return out;
}

/** A title as plain text: Atom's html titles lose their markup, double-escaped references get decoded. */
function titleText(m: RegExpExecArray | null): string | null {
  if (!m) return null;
  let s = decodeEntities(m[2]!);
  if (/\btype\s*=\s*["']x?html["']/i.test(m[1] ?? "")) s = decodeEntities(s.replace(/<[^>]*>/g, ""));
  else if (/&#(?:\d+|x[0-9a-f]+);/i.test(s)) s = decodeEntities(s);
  s = s.replace(/\s+/g, " ").trim();
  if (s.length > 300) s = `${s.slice(0, 299).trimEnd()}…`;
  return s || null;
}

/** Atom's alternate link (an html one if there are several). */
function atomLink(block: string): string | null {
  let any: string | null = null;
  for (const m of block.matchAll(LINK_TAG)) {
    const a = attrs(m[1]!);
    if (!a.href || (a.rel ?? "alternate") !== "alternate") continue;
    if (!a.type || a.type.includes("html")) return a.href;
    any ??= a.href;
  }
  return any;
}

function webLink(raw: string | null | undefined, base: string): string | null {
  if (!raw?.trim()) return null;
  try {
    const u = new URL(raw.trim(), base);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : null;
  } catch {
    return null;
  }
}

function dateOf(block: string): number | null {
  for (const re of DATES) {
    const m = re.exec(block);
    const t = m ? Date.parse(decodeEntities(m[2]!).trim()) : NaN;
    if (Number.isFinite(t)) return t;
  }
  return null;
}

/**
 * Reads RSS 2.0, RSS 1.0 (RDF) and Atom: titles, links and dates of the
 * first `max` items. Items without a title or a web link are skipped, so a
 * half-broken feed still gives what it can.
 */
export function parseFeed(xml: string, base: string, max = MAX_STORIES): Feed {
  const doc = xml.replace(RAW, (whole, cdata: string | undefined) => (cdata === undefined ? "" : escapeText(cdata)));
  const items: FeedItem[] = [];
  let first = -1;
  for (const m of doc.matchAll(ITEM)) {
    if (first < 0) first = m.index;
    if (items.length >= max) break;
    const block = m[2]!;
    const title = titleText(TITLE.exec(block));
    const guid = GUID.exec(block);
    const permalink = guid && !/isPermaLink\s*=\s*["']false/i.test(guid[1] ?? "") ? decodeEntities(guid[2]!) : null;
    const rssLink = LINK.exec(block);
    const url = webLink(atomLink(block) ?? (rssLink ? decodeEntities(rssLink[2]!) : permalink), base);
    if (!title || !url) continue;
    const id = (guid ?? ID.exec(block))?.[2];
    items.push({ id: id ? decodeEntities(id).trim() || url : url, title, url, at: dateOf(block) });
  }
  return { title: titleText(TITLE.exec(first < 0 ? doc : doc.slice(0, first))), items };
}

/** Takes turns between the lists (a mix of sources), skipping links already in. */
export function interleave<T extends { url: string }>(lists: readonly (readonly T[])[], max: number): T[] {
  const out: T[] = [];
  const seen = new Set<string>();
  const longest = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < longest && out.length < max; i++) {
    for (const list of lists) {
      const it = list[i];
      if (!it || seen.has(it.url) || out.length >= max) continue;
      seen.add(it.url);
      out.push(it);
    }
  }
  return out;
}
