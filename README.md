# Cozy HQ

A cozy pixel-art office for [bb](https://getbb.app). Every thread is a little
worker, and where it is in the office tells you what it's doing: busy ones at
their desks, planners at the whiteboard, threads that need you in the waiting
room, idle ones on a coffee break. It fills a whole panel and doubles as a
home screen.

![The office at midday](docs/office.png)

![A lantern walk in the evening](docs/evening.png)

<img src="docs/phone.png" width="300" alt="The office stacked for a phone held upright">

## Install

Add [alexkli's bb plugins](https://github.com/alexkli/bb-plugins) once, then
install:

```sh
bb marketplace add git:https://github.com/alexkli/bb-plugins.git@main
bb plugin install cozy-hq@alexkli
```

Cozy HQ appears as **Cozy HQ** in bb's sidebar rail (route
`/plugins/cozy-hq/office`).

## Who sits where

| Thread state | In the office |
| --- | --- |
| Running, background work, queued message | At a desk; its screen scrolls code |
| Plan mode | Meeting room: sketching at the whiteboard, or at the table with papers and blueprints |
| Plan ready for your review | Meeting room, beside the whiteboard holding the blueprint |
| Asking a question, waiting for an approval | Waiting room sofas, hand up |
| Finished, unread | Waiting room, holding its page |
| Errored, unread | Waiting room, under a rain cloud |
| You have an unsent draft for it | Your office, across the desk from you |
| Idle under 20 minutes | Kitchen: coffee, tea, fridge, vending machine, snacks |
| Idle up to 8 hours | Lounge: TV, piano, fish tank, darts, ping-pong, arcade |
| Idle longer | Napping on a beanbag |

The **Names** button (top right) puts a name tag over everyone; the tags stack
so they never overlap, and clicking one opens the thread. So does clicking a
character. A solid chip with a red dot means unread, an outlined one read. Desks are furnished by the thread's model (Opus walnut with dual
flat screens, Sonnet oak, Haiku white with a laptop, GPT/Codex black with an
ultrawide; everyone else gets a flat screen, with the odd retro CRT), chairs
by provider, and a shirt badge shows what the thread is about. One or two
people work in a Vision Pro.

When a thread runs subagents of its own (background agents, like Claude Code's
background Agent tasks), they come in through the door as small helpers in
caps of the thread's color and stand by its desk while it works: pointing at
the screen, holding up a page or a laptop, nodding along, now and then a word.
Up to three stand at a desk (two where the thread sits with its back to you),
the rest show as "+n"; hover one to see whose helper it is, click it to open
the thread. They walk back out when they're done. Threads a thread spawned
(bb child threads) keep their own desks and wear lanyards in the same color as
their parent; hovering one points at the rest of the family.

The office keeps going while you're elsewhere in bb, and it remembers what
everyone was doing when you last looked: coming back, only the threads whose
state changed since then get up and walk.

A soft glow picks out what's new. A warm gold glow means a thread finished,
failed or started waiting on you and you haven't opened it since: it glows
on its way to the waiting room (or the whiteboard, with a plan) and while it
waits there, and its name tag gets a matching halo. Opening the thread once
ends it; marking it unread again to keep it around as a reminder doesn't
bring it back, only a new finish does. A cool blue glow means a thread just
started new work and is on its way to its desk (or the meeting room to
plan); it fades once it sits down.

Idle threads get together every minute or so for a coffee, water-cooler
talk, a hallway chat, the couch, ping-pong or darts, mostly with comic speech
bubbles: small talk, a tech headline, or what the thread actually did last.
After noon they have lunch together at a long table: a delivery brings pizza,
sushi, burgers, tacos or ramen, and a few bring their own lunchbox.

## Sceneries

Pick a scenery in the settings (the gear at the top right) to move the
office to another place. Each scenery has its own floor plan, pets, visitors,
sounds and words; the people and everything that happens (desks, breaks,
meetings, lunch, events, gags) stay the same:

![The whole office in all seven sceneries, each with its own floor plan](docs/sceneries.png)

| Scenery | |
| --- | --- |
| 🏢 Classic office | Wooden floors, a cozy lounge and a city view |
| 🌃 Neon City | A city block on two neon streets: capsule desks, a ramen shop, a plaza, food carts and rain; a robo-dog and a holo-cat |
| 🌲 Redwood Camp | Canvas tents on decks among giant redwoods, trails, a creek, a campfire clearing and a treehouse office; a husky and a raccoon |
| 🏄 Surf Villa | A villa terrace, a pool deck with a tiki bar, and the beach with umbrellas, a bonfire and the surf; a beach dog and a parrot |
| 🏙️ Sky Loft | A penthouse around an elevator core, the city far below the glass, a terrace with a hot tub; a French bulldog and a grey cat |
| 🗄️ Dusty Annex | Patchwork rooms off creaky corridors and stairs, an old hall with a stage, storerooms of junk; an old terrier and an alley cat |
| 🏫 School | Classrooms off a corridor, the cafeteria, the principal's office, and a schoolyard with a field, swings and a bus stop; a reading dog and the class bunny |

Your pick is kept per browser; the buddy dresses to match.

## What else is going on

- **The wall is a home screen**: a pinboard with every enabled provider's
  usage, a calendar, a status light board, the door (a new thread), a cuckoo
  clock (hover for the time) and a big TV: HQ news with live head counts, the
  office weather and clock, tech headlines (Hacker News, or another source you
  pick) and your Work Dashboard inbox, if you use that plugin. Click the TV to
  switch channels.
- **A small server room** with blinking racks and a glowing AI cluster (click
  it to train a model, and someone idle wanders over to have a look). Now and
  then someone messes with the cables, gets a (harmless) shock, lies on the
  floor seeing stars and shuffles back.

  <img src="docs/server-room.png" width="420" alt="An agent pokes at the server cables, gets zapped (an x-ray flash) and lies on the floor seeing stars">
- **A technician** comes round in working hours to fix a crashed computer, a
  dead bulb in the string lights (up a ladder), the espresso machine, the
  printer or the vending machine, and the server rack after a shock.

  <img src="docs/technician.png" width="560" alt="The technician up a ladder changing a string-light bulb, and fixing a crashed computer">
- **You're the boss** at the big desk, with Biscuit the corgi asleep in the
  corner, a Newton's cradle on the desk and, where your office has room, a
  putting green and a paper-ball hoop over the bin. Pixel the cat, a roomba, the fish, a cleaning crew in the evening and
  a night guard on the occasional round keep the place alive.
- **Office events**: now and then idle threads gather for a party, birthday
  cake, karaoke, cornhole, darts, a stretch break or bring-your-kids-to-work
  day, and for lunch every day after noon. Click the calendar to start one.
- **Festivals** through the year, each with decorations and its own party:

  | When | Festival |
  | --- | --- |
  | Jan | Snow day: hot cocoa and a snowman |
  | Jan/Feb | Lunar New Year: lanterns, red envelopes, a dragon dance |
  | Feb | Valentine's Day, Carnival (and on 11.11.) |
  | Mar | St. Patrick's Day, Holi |
  | Mar/Apr | Easter: an egg hunt, and eggs hidden around the office for you |
  | Apr–Jun | Maifest: dancing round the maypole |
  | Jun–Aug | Summer party: BBQ, lemonade, a beach ball |
  | Sep/Oct | Oktoberfest |
  | Oct | Halloween costume party, Diwali |
  | Nov | Laternenfest (a lantern walk round a St. Martin's fire), Thanksgiving |
  | Dec | The holidays: snow, a tree in your office, a holiday party |

  Easter, Carnival and Thanksgiving are computed for each year. Lunar New
  Year, Diwali and Holi follow lunar calendars and are looked up through 2030.
- **Click things**: the espresso machine, kettle, microwave, fridge, vending
  machine, piano, dartboard, printer, plants, globe, arcade, couch, beanbags,
  roomba, string lights, your lamp, your own desk (whistles for the dog) and
  more. In your office: the putting green (you walk over and putt: in the
  hole, lipped out, way short, or under the desk, where the dog fetches it),
  the paper-ball hoop (a shot from your chair) and the Newton's cradle. Each does something, with a synthesized sound. Open a window to hear
  outside: birds, crickets at night, rain, wind, thunder or a foghorn.
- **Day and night** follow your clock, with sunsets, stars and lamps. **The
  weather outside is your real local weather**: sun, clouds, fog, drizzle,
  rain, snow or a thunderstorm with lightning, also on the TV.
- **Office buddy**: an agent from the office strolls in a corner of bb
  wherever you are (drag it anywhere, click it to open Cozy HQ). Inside a
  thread it's that thread's own figure. Its bubble counts the threads with
  news for you since you last looked at the office: yellow when one waits on
  you, red for an error, green when they're just done. No news, no bubble.
- **Rail badge**: the number on the Cozy HQ icon is the same count, so you
  see it even with the buddy off.
- **Fits any panel**: a wide floor plan in landscape, rooms stacked top to
  bottom on a phone held upright. Taller panels get a reading nook in the
  lounge, a library and a small indoor garden instead of empty floor.

## Settings

The gear at the top right of the office (or either speaker next to the TV)
opens the settings: how you look, sound on/off, volume and ambient sounds,
the scenery and the office buddy. **You** is the boss at the big desk: pick a
figure (woman, man or nonbinary), your pronouns (she, he or they; what the
office says about you uses them), skin tone, hair color and style, and
glasses, with a live preview. Every scenery dresses you its own way. Next to it, **Names** puts a name tag over everyone.
Everything else:

```sh
bb plugin config cozy-hq                    # show
bb plugin config cozy-hq set buddy false    # the office buddy
bb plugin config cozy-hq set techNews false # tech news on the TV
bb plugin config cozy-hq set newsSource lobsters   # where the tech news comes from (below)
bb plugin config cozy-hq set newsFeed "https://example.com/feed.xml"   # for newsSource custom
bb plugin config cozy-hq set inbox false    # Work Dashboard inbox on the TV
bb plugin config cozy-hq set weather false  # live weather (else the odd rainy day)
bb plugin config cozy-hq set weatherPlace "Basel"   # or "47.56,7.59"; empty: from your IP
bb plugin config cozy-hq set workTalk false # speech bubbles don't quote your threads
```

The TV's tech news (`newsSource`) comes from `hn` (Hacker News, the
default), `lobsters` (Lobsters), `techmeme` (Techmeme), `verge` (The Verge),
`ars` (Ars Technica), `dev` (DEV Community), `slashdot` (Slashdot), `github`
(the GitHub Blog), `mix` (Hacker News, Lobsters, Techmeme, The Verge and Ars
Technica taking turns, each headline labeled with its source) or `custom`:
any RSS or Atom feed at the `https://` address in `newsFeed`, named on the TV
by its own title. None needs an account or a key.

## Privacy and network

- The office reads your threads, projects and providers through the plugin
  SDK, and usage from plugins that publish `provider-usage.v1` usage. It
  changes nothing.
- Outside requests:
  - The source you picked for the TECH channel (`newsSource`), at most
    every 20 minutes (5 after a failure). Turn it off with `techNews false`.
    - `hn`: the Hacker News API, `hacker-news.firebaseio.com`
    - `lobsters`: `lobste.rs`
    - `techmeme`: `www.techmeme.com`
    - `verge`: `www.theverge.com`
    - `ars`: `feeds.arstechnica.com`
    - `dev`: the DEV API, `dev.to`
    - `slashdot`: `rss.slashdot.org`
    - `github`: `github.blog`
    - `mix`: the first five of these
    - `custom`: the host in `newsFeed`, which you set yourself (`https` only)
  - The weather: `api.open-meteo.com` at most every 15 minutes, with your
    location rounded to about a kilometer. The location comes from your IP
    address via `get.geojs.io` (looked up at most every 6 hours), or from
    `weatherPlace`, which is looked up with `geocoding-api.open-meteo.com`.
    Turn it all off with `weather false`.
- Speech bubbles can quote the first sentence of a thread's latest reply,
  read through the plugin SDK. That stays in the office on your screen; turn
  it off with `workTalk false`.
- Only `http`/`https` links from headlines and inbox items are opened.
- Preferences (sound, the buddy's position, remembered desks, what everyone
  was doing when you last looked, which threads you opened, recent office
  news) stay in your browser's local storage.

## Develop

```sh
npm install
npm run typecheck
npm test            # node --test office/*.test.ts
bb plugin build . && bb plugin reload cozy-hq
```

To preview other times and states, set this in devtools on the bb page:

```js
localStorage["bb-plugin:cozy-hq:debug"] = '{"hour":20,"sample":true,"event":"lanterns"}'
```

- `hour` (0–24) sets the time of day; `weather` the weather (`clear`,
  `partly`, `cloudy`, `fog`, `drizzle`, `rain`, `snow`, `storm`; `rainy`
  still works).
- `gag` sets something off now: `shock` (the server-room mishap),
  `technician`, `lunch`, `huddle`, or a kind of get-together (`coffee`,
  `cooler`, `chat`, `couch`, `pingpong`, `darts`).
- `sample` replaces your threads, usage and headlines with made-up ones (the
  screenshots use it); with it, `news` set to `mix` or `feed` shows headlines
  from several sources or from a plain feed. `demo` dresses your first twelve
  threads up in every state instead.
- `patch` changes sample threads by id to try out state changes, e.g.
  `{"sample-13": {"status": "active", "indicator": "runtime"}}` sends one to
  work (with its cool glow).
- `event` keeps an office event running: `party`, `birthday`, `baby-shower`,
  `lunch`, `karaoke`, `cornhole`, `darts`, `kids`, `yoga`, `ice-cream`, or a
  festival: `snowday`, `lunarnewyear`, `valentines`, `carnival`, `stpatricks`,
  `holi`, `easter`, `maifest`, `summer`, `oktoberfest`, `halloween`, `diwali`,
  `lanterns`, `thanksgiving`, `holiday`.
- `season` decorates for a season whatever the date (`snowday`,
  `lunarnewyear`, `valentines`, `carnival`, `stpatricks`, `holi`, `easter`,
  `spring`, `summer`, `oktoberfest`, `halloween`, `diwali`, `laternenfest`,
  `thanksgiving`, `holidays`), or `none`.
- `scenery` shows a scenery whatever you picked (`classic`, `neon`,
  `redwoods`, `beach`, `skyline`, `annex`, `school`).
- `expose` puts the world on `window.__cozyHq`.

Only the view changes. Remove the key to go back to normal.

| File | What |
| --- | --- |
| `app.tsx` | Panel and buddy registration, rail badge, data hooks |
| `server.ts`, `contract.ts` | Usage aggregation, tech news, weather, thread recaps, Work Dashboard inbox |
| `office/feeds.ts` | Tech news sources and a small RSS/Atom reader (pure) |
| `office/chatter.ts` | Small talk, weather codes, recap lines (pure) |
| `office/model.ts` | Pure logic: thread mood, spot assignment, office news |
| `office/subagents.ts`, `office/crew.ts` | Subagents helping at desks and child-thread families: where helpers stand (pure), and their life in the office |
| `office/layout.ts` | The classic floor plans (wide and portrait) and the room builders sceneries reuse |
| `office/layoutcheck.ts` | What every floor plan must get right (tested for every scenery at many sizes) |
| `office/world.ts` | Simulation and canvas renderer |
| `office/life.ts` | Hallway walking and office events |
| `office/seasons.ts` | Festival calendar, decorations and party decor |
| `office/characters.ts`, `office/furniture.ts`, `office/desks.ts` | Pixel sprites |
| `office/sound.ts` | Synthesized sound effects |
| `office/OfficeView.tsx`, `app.css` | Panel UI, TV, pinboard, tags, sound controls |
| `office/Buddy.tsx` | The office buddy overlay |
| `office/sample.ts` | Made-up data for screenshots |
| `office/theme.ts`, `office/themekit.ts`, `office/themes/` | Sceneries: the hooks, the drawing kit and one file per scenery ([how to write one](office/themes/README.md)) |
| `preview/` | A standalone preview with made-up data (`npm run preview`, then open `preview/index.html?scenery=neon`) |

## Changes

See [CHANGELOG.md](CHANGELOG.md).

## Credits

Desks, PCs, chairs, plants and a few other furniture sprites come from
[Pixel Agents](https://github.com/pixel-agents-hq/pixel-agents) (MIT); see
[ATTRIBUTION.md](ATTRIBUTION.md). Everything else is drawn and synthesized by
Cozy HQ's own code.

## License

MIT
