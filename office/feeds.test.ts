import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeEntities, decodeFeedBytes, feedUrl, interleave, newsSourceOf, parseFeed } from "./feeds.ts";

test("RSS 2.0: titles, links, dates and the feed's name", () => {
  const feed = parseFeed(
    `<?xml version="1.0"?>
    <rss version="2.0"><channel>
      <title>Example &amp; Co</title>
      <image><title>Logo</title></image>
      <item>
        <title>Robots &quot;learn&quot; to make coffee</title>
        <link> https://example.com/robots?a=1&amp;b=2 </link>
        <guid isPermaLink="false">tag:example.com,2026:1</guid>
        <pubDate>Mon, 16 Nov 2026 13:55:00 -0500</pubDate>
      </item>
      <item>
        <title>A relative link</title>
        <link>/posts/2</link>
      </item>
      <item>
        <title>Only a guid</title>
        <guid>https://example.com/3</guid>
      </item>
    </channel></rss>`,
    "https://example.com/feed.xml",
  );
  assert.equal(feed.title, "Example & Co");
  assert.deepEqual(feed.items, [
    { id: "tag:example.com,2026:1", title: 'Robots "learn" to make coffee', url: "https://example.com/robots?a=1&b=2", at: Date.parse("2026-11-16T18:55:00Z") },
    { id: "https://example.com/posts/2", title: "A relative link", url: "https://example.com/posts/2", at: null },
    { id: "https://example.com/3", title: "Only a guid", url: "https://example.com/3", at: null },
  ]);
});

test("Atom: the alternate link, html titles, published before updated", () => {
  const feed = parseFeed(
    `<feed xmlns="http://www.w3.org/2005/Atom">
      <title type="text">The Daily Byte</title>
      <link rel="self" href="https://example.org/atom.xml"/>
      <entry>
        <title type="html"><![CDATA[Apple’s <em>new</em> thing &amp; more]]></title>
        <link rel="replies" href="https://example.org/1#comments"/>
        <link rel="alternate" type="text/html" href="https://example.org/1"/>
        <id>urn:1</id>
        <updated>2026-11-16T12:00:00Z</updated>
        <published>2026-11-16T10:00:00Z</published>
        <content type="html"><![CDATA[<p>Not a <title>title</title>, nor a </entry> end.</p>]]></content>
      </entry>
      <entry>
        <title>Plain &lt;dialog&gt; element tricks</title>
        <link href='https://example.org/2'/>
        <updated>2026-11-15T08:00:00+01:00</updated>
      </entry>
    </feed>`,
    "https://example.org/atom.xml",
  );
  assert.equal(feed.title, "The Daily Byte");
  assert.deepEqual(feed.items, [
    { id: "urn:1", title: "Apple’s new thing & more", url: "https://example.org/1", at: Date.parse("2026-11-16T10:00:00Z") },
    { id: "https://example.org/2", title: "Plain <dialog> element tricks", url: "https://example.org/2", at: Date.parse("2026-11-15T07:00:00Z") },
  ]);
});

test("RSS 1.0 (RDF), as Slashdot sends it", () => {
  const feed = parseFeed(
    `<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://purl.org/rss/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/">
      <channel rdf:about="https://slashdot.org/"><title>Slashdot</title>
        <items><rdf:Seq><rdf:li rdf:resource="https://example.com/a"/></rdf:Seq></items>
      </channel>
      <item rdf:about="https://example.com/a">
        <title>Caf&#233; opens in orbit</title>
        <link>https://example.com/a?x=1&amp;y=2</link>
        <dc:date>2026-11-16T19:00:00+00:00</dc:date>
      </item>
    </rdf:RDF>`,
    "https://rss.slashdot.org/Slashdot/slashdotMain",
  );
  assert.equal(feed.title, "Slashdot");
  assert.deepEqual(feed.items, [
    { id: "https://example.com/a?x=1&y=2", title: "Café opens in orbit", url: "https://example.com/a?x=1&y=2", at: Date.parse("2026-11-16T19:00:00Z") },
  ]);
});

test("broken items are skipped, the rest still read", () => {
  const feed = parseFeed(
    `<rss><channel><title>Junk</title>
      <!-- <item><title>Commented out</title><link>https://example.com/c</link></item> -->
      <item><title></title><link>https://example.com/empty</link></item>
      <item><title>No link</title></item>
      <item><title>Script link</title><link>javascript:alert(1)</link></item>
      <item><title/><link>https://example.com/self-closing</link></item>
      <item><title>Bad date, good item</title><link>https://example.com/ok</link><pubDate>someday</pubDate></item>
      <item><title>Never closed</title><link>https://example.com/cut`,
    "https://example.com/",
  );
  assert.deepEqual(
    feed.items.map((it) => [it.title, it.url, it.at]),
    [["Bad date, good item", "https://example.com/ok", null]],
  );
  assert.deepEqual(parseFeed("not xml at all", "https://example.com/"), { title: null, items: [] });
  assert.deepEqual(parseFeed("", "https://example.com/"), { title: null, items: [] });
});

test("at most so many items, and long titles are cut", () => {
  const items = Array.from({ length: 30 }, (_, i) => `<item><title>${i === 0 ? "x".repeat(400) : `Item ${i}`}</title><link>https://example.com/${i}</link></item>`);
  const feed = parseFeed(`<rss><channel>${items.join("")}</channel></rss>`, "https://example.com/", 5);
  assert.equal(feed.items.length, 5);
  assert.equal(feed.items[0]!.title.length, 300);
  assert.ok(feed.items[0]!.title.endsWith("…"));
});

test("entities: named, numeric, double-escaped and unknown", () => {
  assert.equal(decodeEntities("Fish &amp; Chips &mdash; &#8220;yum&#8221; &#x1F355; &bogus; &#xD800;"), "Fish & Chips — “yum” 🍕 &bogus; &#xD800;");
  assert.equal(parseFeed("<rss><item><title>It&amp;#8217;s here</title><link>https://e.com/</link></item></rss>", "https://e.com/").items[0]!.title, "It’s here");
});

test("feed bytes are decoded in the charset they declare", () => {
  const latin1 = Uint8Array.from([...'<?xml version="1.0" encoding="ISO-8859-1"?><title>Caf'].map((c) => c.charCodeAt(0)).concat(0xe9, ...[..."</title>"].map((c) => c.charCodeAt(0))));
  assert.match(decodeFeedBytes(latin1, "text/xml"), /Café/);
  const utf8 = new TextEncoder().encode("<title>Café</title>");
  assert.match(decodeFeedBytes(utf8, "application/rss+xml; charset=UTF-8"), /Café/);
  assert.match(decodeFeedBytes(utf8, "text/xml; charset=no-such-charset"), /Café/);
});

test("a mix takes turns between sources and skips repeated links", () => {
  const a = [{ url: "a1" }, { url: "same" }, { url: "a3" }];
  const b = [{ url: "same" }, { url: "b2" }];
  const c: { url: string }[] = [];
  assert.deepEqual(interleave([a, b, c], 10).map((s) => s.url), ["a1", "same", "b2", "a3"]);
  assert.deepEqual(interleave([a, b], 2).map((s) => s.url), ["a1", "same"]);
  assert.deepEqual(interleave([], 5), []);
});

test("settings: unknown sources fall back to Hacker News, custom feeds must be https", () => {
  assert.equal(newsSourceOf("lobsters"), "lobsters");
  assert.equal(newsSourceOf("myspace"), "hn");
  assert.equal(feedUrl(" https://example.com/feed.xml ")?.href, "https://example.com/feed.xml");
  assert.equal(feedUrl("http://example.com/feed.xml"), null);
  assert.equal(feedUrl("file:///etc/passwd"), null);
  assert.equal(feedUrl("https://user:pw@example.com/feed"), null);
  assert.equal(feedUrl("example.com/feed"), null);
  assert.equal(feedUrl(""), null);
});
