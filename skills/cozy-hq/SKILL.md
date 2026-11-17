---
name: cozy-hq
description: What the Cozy HQ office panel shows and how to configure it. Use when the user asks about the Cozy HQ office, why a character sits somewhere, its usage pinboard, office TV channels, or its sounds.
---

# Cozy HQ

Cozy HQ is a full-screen pixel-art office in the bb sidebar (the **Cozy HQ**
destination, route `/plugins/cozy-hq/office`). Every active, visible thread is
one character; archived and hidden threads are not shown.

## Where a thread sits

| Thread state | In the office |
| --- | --- |
| Running, background work, queued message | At a desk in one of the pods; its screen scrolls code |
| Plan mode | Glass meeting room: sketching at the whiteboard, or at the table with papers and blueprints |
| Asking a question | Waiting room, hand up, "?" tag |
| Plan ready for approval | Meeting room, beside the whiteboard holding the blueprint, plan written on the board |
| Waiting for an approval (command, file, tool) | Waiting room, hand up, "!" tag |
| You have an unsent draft for it | Your office, across the desk from you, going over documents |
| Finished, unread | Waiting room, holding its page |
| Errored, unread | Waiting room, under a rain cloud |
| Idle under 20 minutes (or just read) | Kitchen: coffee, tea, fridge, vending machine, island, water cooler |
| Idle up to 8 hours | Lounge (TV, piano, fish tank), darts, ping-pong, arcade, library |
| Idle 8 hours or more | Napping on a beanbag or in an armchair |
| Idle during an office event | At the event (party, cake, cornhole, kids day, …) |

Seasonal decorations and parties follow the date: snow day (January), Lunar
New Year, Valentine's Day, Carnival (and 11.11.), St. Patrick's Day, Holi,
Easter (with eggs hidden around the office to click), Maifest (a maypole
dance), summer, Oktoberfest, Halloween, Diwali, Laternenfest (a lantern walk
around a St. Martin's fire), Thanksgiving and the holidays. In season, about
half the random office events are that festival's party; clicking the
calendar can start one too.

Desks are dressed by the occupant's model (Opus: walnut + dual monitors,
Sonnet: oak, Haiku: white + laptop, GPT/Codex: black + ultrawide); chairs by
provider. A small shirt badge shows the topic guessed from the thread title.
Small helpers in caps of a thread's color standing by its desk are its own
subagents (bb's background agent count for the thread, e.g. Claude Code's
background Agent tasks): up to three per desk (two where the thread sits with
its back to you), the rest shown as "+n"; they walk in when the count goes up
and out when it drops. bb child threads (a thread's `parentThreadId`) keep
their own desks and wear a lanyard in the same color as their parent.
The office is laid out for the panel's size and the number of threads; tall
panels (a phone held upright) stack the rooms vertically.
When an area is full, waiting threads fall back to a desk and drafts to the
waiting room; threads that still do not fit are counted on a sign next to the
door.

The **Names** button (top right of the office, or the `N` key while the office
has focus) puts a name tag over every character; tags tier upward so they never overlap, and clicking one opens the
thread. A tag's chip shows the state (`?` question, `!` approval, `▤` plan,
`✓` done, `✕` error, `✎` draft or planning, `▸` working, `~` idle): a solid
chip with a red dot means unread, an outlined chip means read. Without tags,
threads waiting for you show a small bubble over their heads instead.

Holding **Alt** (Option on a Mac) puts light corner brackets around
everything in the office you can click (people, pets, visitors, props,
the wall, empty desks, scenery things, the buttons) until you let go; the
Easter eggs and the string lights stay secret. Clicks still work meanwhile.
There's no equivalent on phones.

A soft glow marks what's new. Warm gold: the thread finished, failed or
started waiting on you (question, approval, plan) and you haven't opened it
since; it glows walking to the waiting room and sitting there, and its name
tag gets a gold halo. Opening the thread once ends it; marking it unread
again doesn't bring it back, only a new finish does (the office remembers
which threads you opened, per browser). Cool blue: the thread got to work
since you last looked at the office; it glows walking to its desk or the
meeting room and while it works there, and fades when the work ends. Threads
already working when you last looked don't glow.

The office keeps living while you're elsewhere in bb and remembers what each
thread was doing when you last looked; coming back, only threads whose state
changed since then walk to their new place. The office buddy's bubble and
the number on the Cozy HQ rail icon both count threads with news since you
last looked at the office (yellow when one waits on you, red for an error).
Inside a thread, the buddy is that thread's own figure from the office.

Idle threads get together every minute or so: a coffee at the espresso
machine, water-cooler talk, a hallway chat, the couch, a ping-pong match or
darts. Most get-togethers (and office events) come with comic speech bubbles:
small talk, a tech headline, or a line from what the thread last did
(the first real sentence of its latest reply; `workTalk false` turns that
off). Once a day after noon idle threads have lunch together at a long table;
a delivery person brings pizza, sushi, burgers, tacos or ramen, and some
bring their own lunchbox. Once in a while someone pokes at the server cables,
gets a harmless shock (a flash and an x-ray skeleton), lies on the floor
seeing stars and shuffles back; clicking the server room sends someone idle
over right away. A technician
does the rounds in working hours: a crashed computer, a dead string-light
bulb (up a ladder), the espresso machine, the printer or the vending machine,
and the server rack after a shock.

The windows show your real local weather (clear, partly cloudy, cloudy, fog,
drizzle, rain, snow, thunderstorms with lightning), from Open-Meteo for your
approximate location; click a window to open it and hear outside (birds,
crickets at night, rain, wind, thunder, a foghorn in fog).

The settings (the gear at the top right) pick a scenery that moves the office to another place:
Classic office, Neon City (cyberpunk streets), Redwood Camp (tents among the
redwoods), Surf Villa (villa, pool and beach), Sky Loft (a New York
penthouse), Dusty Annex (a shabby back office), School, Startup House (a
founders' house), Mountain Cabin (an alpine lodge), Villain's Lair (a volcano
base), Spaceship, Coffee Shop or Home Office (everyone works from their own
little home down the street: one thread per home, get-togethers are video
calls drawn as dotted lines between the homes, threads without a home work
from the co-working café or wait on the bench in your garden). Each has its own
floor plan, pets, visitors, sounds and words (the TV says where events
happen there: the plaza, the schoolyard, the terrace); everything that
happens stays the same. The pick is kept per browser and the buddy dresses
to match.

Characters that are not threads: you (the boss at the big desk), Biscuit the
dog, Pixel the cat, a roomba, the cleaning crew (evenings and early mornings),
a guard on occasional rounds, the technician, and kids on
bring-your-kids-to-work day.

Click a character or a tag to open its thread, the door or an empty desk for a
new thread, the reception bell for the first thread waiting, the calendar to
start an office event, and the `?` sticky note for the legend (its first
note, **Take the tour**, starts the guided tour that also opens by itself the
first time someone opens Cozy HQ). In your office,
the putting green (where the room has space) sends you over to putt: in the
hole, lipped out, short, or under the desk, where the dog fetches the ball;
the paper-ball hoop is a shot from your chair; the Newton's cradle clacks. The
arcade (in the games room, else the lounge; Dusty Annex's is in the old hall) opens an arcade cabinet
over the office with four small games (Noodle, Inbox Zero, Desk Rally, Bug
Hunt; keys or a touch pad, a high score per game kept per browser), and you
walk over and play along, cheering a win or sulking under a rain cloud after a
loss. Most furniture
does something with a sound when clicked (also the couch, beanbags, roomba,
string lights and windows); hover the clock for the time and a window for the
weather.

## Pinboard, TV, sound

- The pinboard shows one note per enabled provider account that publishes
  `provider-usage.v1` usage. Providers sharing a quota merge into one note.
  Click it (or its ↻) to refresh.
- The TV rotates channels: HQ NEWS (thread events), TECH (tech headlines,
  Hacker News unless `newsSource` picks another source; the channel names
  it, e.g. "TECH ▸ LOBSTERS"), and INBOX (newest items from the Work
  Dashboard plugin, if installed). Click the TV to switch channels; click a
  headline to open it.
- The TV announces a running office event on the HQ NEWS channel.
- The gear at the top right (or either speaker next to the TV) opens the
  settings: sound on/off, volume and ambient sounds (background life such as
  agents brewing coffee), the office buddy, you (the boss) and the scenery.
  These are kept per browser. **You** has the figure (woman, man,
  nonbinary) and **Customize…**, a look editor with a big front and back
  preview: pronouns (she, he, they; the office's words about the boss use
  them), skin tone, hair color and style, a top (shirt and tie, V-neck,
  T-shirt, polo, hoodie, turtleneck, sweater, blazer…) with a color and
  pattern, a hat, glasses, freckles, a beard, and extras (headphones,
  earrings, necklace, nose stud, scarf, lanyard, pin, hair bow, flower).
  Every scenery dresses you its own way and keeps what you picked. The
  **Names** button next to the gear toggles name tags.

## Settings

`bb plugin config cozy-hq` lists, all on by default: `techNews` (TECH
channel), `inbox` (INBOX channel), `buddy` (the office buddy that strolls in a
corner of bb; also toggled from the speaker controls), `weather` (live weather
outside the windows) and `workTalk` (speech bubbles may quote what a thread
did last). `weatherPlace` sets the weather's place: a city or
`latitude,longitude`; empty means your approximate location from your IP
address (via geojs.io).

`newsSource` picks the TECH channel's source: `hn` (Hacker News, the
default), `lobsters`, `techmeme`, `verge` (The Verge), `ars` (Ars Technica),
`dev` (DEV Community), `slashdot`, `github` (the GitHub Blog), `mix` (Hacker
News, Lobsters, Techmeme, The Verge and Ars Technica taking turns, each
headline labeled with its source) or `custom`, which reads the RSS or Atom
feed at the `https://` address in `newsFeed`. Headlines refresh at most every
20 minutes; when a source fails, the TV keeps its last headlines.
