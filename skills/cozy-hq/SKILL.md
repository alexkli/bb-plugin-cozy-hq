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
The office is laid out for the panel's size and the number of threads; tall
panels (a phone held upright) stack the rooms vertically.
When an area is full, waiting threads fall back to a desk and drafts to the
waiting room; threads that still do not fit are counted on a sign next to the
door. Waiting-room title tags tier upward so they never overlap.

The office keeps living while you're elsewhere in bb and remembers what each
thread was doing when you last looked; coming back, only threads whose state
changed since then walk to their new place. The office buddy's bubble counts
threads with news since you last looked (none, no bubble). The number on the
Cozy HQ rail icon counts threads waiting for your input.

Characters that are not threads: you (the boss at the big desk), Biscuit the
dog, Pixel the cat, a roomba, the cleaning crew (evenings and early mornings),
a guard on occasional rounds, and kids on bring-your-kids-to-work day.

Click a character or a tag to open its thread, the door or an empty desk for a
new thread, the reception bell for the first thread waiting, the calendar to
start an office event, and the `?` sticky note for the legend. Most furniture
does something with a sound when clicked; hover the clock for the time.

## Pinboard, TV, sound

- The pinboard shows one note per enabled provider account that publishes
  `provider-usage.v1` usage. Providers sharing a quota merge into one note.
  Click it (or its ↻) to refresh.
- The TV rotates channels: HQ NEWS (thread events), TECH (Hacker News), and
  INBOX (newest items from the Work Dashboard plugin, if installed). Click the
  TV to switch channels; click a headline to open it.
- The TV announces a running office event on the HQ NEWS channel.
- Click either speaker next to the TV for the sound controls: on/off, volume
  and ambient sounds (background life such as agents brewing coffee). Sound
  preferences are kept per browser.

## Settings

`bb plugin config cozy-hq` lists three booleans, all on by default:
`techNews` (TECH channel), `inbox` (INBOX channel) and `buddy` (the office
buddy that strolls in a corner of bb; also toggled from the speaker controls).
