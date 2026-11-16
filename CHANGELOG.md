# Changelog

## Unreleased

- Redwood Camp has no back wall any more: the forest runs to the top edge.
  - The usage board stands on log posts, and the clock, calendar and status board hang on trunks.
  - The door is a trailhead gate.
  - The windows are gaps in the treeline that look out of the woods at the sky.
  - The weather falls on the whole camp: rain with puddles, snow that settles, fog between the trunks, storm gusts and cloud shadows.
- In Redwood Camp you can click the campfire, the giant trees and the creek.
  - The campfire: idle campers come over for s'mores (one marshmallow always catches fire), a singalong with a guitar, or ghost stories by flashlight after dark; or the fire roars up into a bonfire, or pops popcorn.
  - The trees: an owl, a grey squirrel running up the trunk, a woodpecker, a bird flying off, or a pinecone on someone's head.
  - The creek: a jumping trout, a frog plopping in, a duck or a paper boat floating by, and now and then a bear cub fishing.
- For scenery authors: an `openWindow` hook, and the "Open the window" hover text goes through `labels.words`.
- Tech news on the TV from more sources: pick Hacker News, Lobsters, Techmeme, The Verge, Ars Technica, DEV Community, Slashdot, the GitHub Blog, a mix of the first five, or any RSS or Atom feed (`newsSource`, `newsFeed`). The TECH channel names its source, and in a mix each headline's.
- A soft glow picks out what's new:
  - Warm gold around a thread that finished, failed or asked you something and that you haven't opened since, walking to the waiting room and sitting there; its name tag gets a matching halo.
  - Opening the thread once ends it. Marking it unread again to keep as a reminder doesn't bring it back; only a new finish does.
  - Cool blue around a thread that just started new work, while it walks to its desk.
- For scenery authors: `clickables` and `click` hooks for things to click in the scenery, which can ask idle people over with lines and sounds.

## 0.4.0 (2026-11-15)

Every scenery is now its own place, not only a new look for the classic office.

- **Own floor plans** for wide panels and phones held upright:
  - **Neon City** is a city block on two neon streets: shops with awnings and shutters, capsule desks, a ramen shop, events on a plaza, food carts, crosswalk signals and rain on the street.
  - **Redwood Camp** puts canvas tents on decks among giant redwoods, with trails, a creek with plank bridges, a trout pond, a campfire clearing and a treehouse office around a trunk.
  - **Surf Villa** runs from a villa terrace past a pool deck with a tiki bar down to the beach: umbrellas and deck chairs, a lifeguard tower, a bonfire and the surf.
  - **Sky Loft** is a penthouse around an elevator core, with the city far below the glass, a terrace with a hot tub and fire table, and a corner office.
  - **Dusty Annex** is a rambling old building: patchwork rooms off corridors and creaky stairs, storerooms of junk, mismatched waiting chairs and an old hall with a stage.
  - **School** has classrooms off a corridor, the cafeteria, the principal's office and a schoolyard with a field, swings, a garden, a gate and a bus stop.
- **Pets, cleaner, fish tank and visitors to match:**
  - Neon City: a robo-dog, a holo-cat, a sweeper drone and jellyfish.
  - Redwood Camp: a husky, a raccoon, a solar mower and a trout pond.
  - Surf Villa: a beach dog, a parrot, a hermit crab and a rock pool.
  - Sky Loft: a French bulldog, a grey cat, a robot vacuum and a planted aquarium.
  - Dusty Annex: an old terrier, an alley cat, a taped-up vacuum and one goldfish.
  - School: a reading dog, the class bunny, a ladybug robot and a turtle.
  - Visitors get outfits too: a ranger hat, a lifeguard float, a doorman's cap.
- The TV says where events happen in each place: on the plaza, out in the schoolyard, on the terrace, in the old hall.
- In the settings, the office buddy toggle now sits above the scenery list.
- For scenery authors:
  - A `layout` hook with the classic room builders exported from `office/themekit.ts`, plus `checkLayout`. The tests check every scenery's plan at 8 panel sizes and 3 head counts.
  - New hooks `pet`, `roomba`, `fishTank`, `dressVisitor` and `doorOpen`.
  - Word swaps that hold for one floor plan only (`L.words`), and `labels.npc.roomba`.
- The preview's `hour` parameter now sets the clock too, not only the light.

## 0.3.1 (2026-11-15)

- A gear at the top right opens the settings: sound, the scenery and the office buddy. The speakers still open them too.
- The scenery switcher moved into the settings; the Names toggle stays next to the gear.

## 0.3.0 (2026-11-15)

- Seven sceneries for the same office: Classic office, Neon City, Redwood Camp, Surf Villa, Sky Loft, Dusty Annex and School. The people, rooms, events and gags stay the same; the look, sounds and words change. The buddy dresses to match.
- A theme layer for sceneries: the backdrop in steps, every prop, plant, desk, chair, monitor and speaker, the view outside, wall lights, lighting, floor and overlay layers, decor, outfits, visitor looks, board ink, word swaps and window sounds (`office/theme.ts`, `office/themekit.ts`, `office/themes/`).
- A standalone preview with sample data and a sprite catalog for scenery work (`npm run preview`).
- Fixes:
  - The front edge of your office was drawn as glass.
  - Seed shifts could go negative, which skewed walking lanes and pace and lost screen colors.
  - Forced debug gags now retry until someone is free.

## 0.2.0 (2026-11-15)

- **Name tags** for everyone behind a Names button: solid chips for unread threads, outlined for read ones.
- **Badges:** the rail badge counts news since you last looked, the same as the buddy. Inside a thread, the buddy is that thread's own figure.
- **Live local weather** outside the windows and on the TV (Open-Meteo; your location from IP via geojs.io, or the `weatherPlace` setting). Open a window to hear it.
- **Get-togethers:** idle agents meet for coffee, hallway chats, the couch, ping-pong and darts, with comic speech bubbles: small talk, tech news or what their thread did last (the `workTalk` setting).
- **Team lunch** after noon: a delivery brings pizza, sushi, burgers, tacos or ramen, and some bring their own lunchbox.
- **Server room:** a harmless shock with an x-ray flash, also when you click the server room. A technician fixes PCs, bulbs and machines.
- **Walking:** walkers keep their own lane, cut corners and vary their pace.
- **More to see:** more plants, sounds and clickables.
- **Layout fixes:** the server room fits short panels, and the phone layout no longer routes through the meeting room.

## 0.1.1 (2026-11-15)

- **Coming back:** only threads whose state changed since you last looked get up and walk. The office keeps living while you're away and remembers what you saw across reloads.
- **Office buddy:** it counts threads with news since you last looked, and shows nothing when there is none.
- **TV:** a proper newsroom with a headline card, live head counts and a ticker, plus a weather channel with the clock and today's festival.
- **Furniture:**
  - Sofa islands around lounge tables in the waiting room.
  - Flat-screen monitors with the odd retro CRT and a Vision Pro or two.
  - A big red espresso machine with a proper brewing sound.
  - More plants and hanging plants.
- **Rooms:**
  - A glass server room with blinking racks and an AI cluster, placed to fit phones, landscape and tall screens.
  - Tall panels get a reading nook, a library and an indoor garden instead of empty floor.
- **Festivals** for the gaps in the calendar: snow day, Lunar New Year, Maifest and Oktoberfest.
- Hacker News and inbox links are checked to be web links before they open.

## 0.1.0 (2026-11-15)

First release: a full-panel bb home screen where every thread is a little worker.

- **Where threads sit:** desks for busy threads, the glass meeting room for planning and plans to review, the waiting room (with non-overlapping title tags) for threads that need you, your office for drafts, and the kitchen and lounge for idle ones.
- **The wall:** provider usage, a calendar, a light board and a TV with office news, Hacker News and the Work Dashboard inbox.
- **Office life:** a dog, a cat, visitors, office events, festivals through the year, things to click and synthesized sound.
- **Fits every panel:** it lays itself out for wide panels and phones, and adds an optional office buddy overlay to the rest of bb.
- Furniture sprites from Pixel Agents (MIT); see [ATTRIBUTION.md](ATTRIBUTION.md).
