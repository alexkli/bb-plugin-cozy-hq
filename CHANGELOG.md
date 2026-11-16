# Changelog

## Unreleased

- Four new sceneries, each with its own floor plan, pets, visitors, words, sounds and things to click:
  - **Startup House**: a suburban ranch house turned founders' office, with a garage server room and a backyard pool, grill and hammock.
  - **Mountain Cabin**: a timber lodge above the treeline, with a fieldstone fireplace, a sun deck and sauna, peaks, a chairlift and skiers.
  - **Villain's Lair**: a secret base in a volcano, with a world map, a countdown that always stops at 00:01, a shark tank, a big red button and a monorail.
  - **Spaceship**: a deck on a long-haul starship, with a viewscreen that jumps between star systems, a food synthesizer, a gravity switch and spacewalks; the local weather becomes space weather.
- For scenery authors: `windowWeather: false` for windows that don't look out at the local weather.
- In the Sky Loft you can click the hot tub, the fire table, the telescopes, the glass with the city below, the globe pendants and the spiral stair.
  - The hot tub: the jets come on, idle people climb in for a soak ("Ahh…"), and now and then a rubber duck bobs about.
  - The fire table roars up; people come over to toast marshmallows (one goes flambé) or, on cold nights, to sip cocoa.
  - The telescopes: someone takes a look, and a round lens view shows what they spotted: a peregrine falcon on a ledge, a parade with a giant balloon, a rooftop party, a proposal ("They said yes!"), someone waving from the tower across the street, or the moon.
  - The glass: a helicopter flies close by (with a searchlight after dark), a blimp drifts past with a light board, the window washers' cradle rises past and they wave; at night, fireworks over the city, in the windows and seen from above in the glass below, while people watch from the terrace.
  - The globe pendants put on a dimmer show; a slinky walks down the spiral stair, or a paper plane with a note glides down from the roof.
  - Each with its own synth sounds.
- Every scenery calls its pets by their own names everywhere: Juniper in Redwood Camp gets the whistle from your desk, not Biscuit, and people's small talk names the scenery's dog and cat (`labels.pets` for scenery authors).
- **You** in the settings: pick how the boss at the big desk (you) looks.
  - A compact row under the office buddy: a small preview, the figure (woman, man or nonbinary) and **Customize…**, which opens the look editor with a big preview from the front and the back (it fits a phone too).
  - Your pronouns (she, he or they); the office's small talk about the boss uses them. The figure suggests pronouns and a top.
  - Skin tone, hair color (grey and white too) and hair style (a buzz cut and bald are new).
  - Your top: shirt and tie, open shirt, V-neck, T-shirt, polo, hoodie, turtleneck, sweater or blazer, in a color of your own (or the scenery's outfit) with stripes, a check or dots.
  - A hat (cap, beanie, sun hat, fedora, beret), glasses, freckles, a beard, and extras: headphones, earrings, a necklace, a nose stud, a scarf, a lanyard, a pin, a hair bow, a flower, in an accent color of your choice.
  - Kept per browser. Every scenery dresses you its own way but keeps what you picked: your hat replaces the Dusty Annex trilby, your necklace or scarf the beach lei and the school lanyard, and a shirt color of your own leaves off the scenery's collars and ties.
  - The defaults are the classic boss, so nothing changes until you pick something.
  - For scenery authors: `dressVisitor` gets `v.look` (`top`, `hat`, `wear`, `ownShirt`, and `wearsAtNeck()`); your `npc("boss", …)` outfit applies unless the user picked otherwise.
- Curly hair no longer hides the eyes.
- **Your office** gets toys to click:
  - A putting green on the floor, where the room has space: you walk over, line up and putt. In the hole (a small cheer and a wiggling flag), lipped out, way short, or sliced under the desk, where the dog fetches it if it's around. Then back to the desk.
  - A paper-ball hoop over a bin: a shot from your chair, swish or off the rim onto the floor.
  - A Newton's cradle on the desk: clack, clack.
  - Their own synth sounds, and the hover texts and remarks use your pronouns ("watch her putt", "He sank it!").
  - Every scenery gets them; the treehouse keeps them clear of its redwood, and other decor keeps clear of your way to the green.
  - For scenery authors: props `putting-green`, `cradle`, `hoop` (pokes `putt`, `cradle`, `hoop`), `bossToys()` for your own boss room, and `buildBoss(…, keepOut)`.
- **The arcade** has real games: click it and an arcade cabinet opens over the office.
  - Four small originals to pick from: Noodle (steer a noodle to twenty dumplings without biting yourself), Inbox Zero (knock out the unread mail with a ball), Desk Rally (a paddle duel with the CPU, first to five) and Bug Hunt (zap the swarm before it lands).
  - Each has a title screen, a score, lives, you win and game over screens, and a high score kept per browser.
  - Arrow keys or WASD, space or Enter, P to pause, Esc to quit; on a phone a d-pad and an A button, or swipe and tap the screen. It pauses when you click away, and the bleeps go through the office's synth (sound settings apply).
  - Meanwhile you get up from your desk, walk over through the hallways and play along at the arcade, its screen flickering. Win and you jump for joy under confetti; lose and you hang your head under a little rain cloud, each with a line. Someone idle nearby may come and watch. Close the cabinet and you walk back.
  - Busy out on the green? You come over once you're done. Whoever was playing the arcade finds something else to do.
  - Every office has a cabinet now: in the games room, else in the lounge beside the piano or the fish tank (in a narrow lounge in its top corner or out on its floor), and in Dusty Annex's old hall by the stage. A test checks every scenery has one on desktop and phone panels; only the narrowest, shortest plans (Redwood Camp and Dusty Annex at 600 px wide and 300 to 426 tall, with few threads) have no room for one.
  - For scenery authors: `bossToys()` sets `L.boss.way` (your way out through your door), the arcade poses `arcade0`, `arcade1` and `mope`, and `node --test` walks you to the arcade and back in every plan. `buildArcade()` puts the office's one cabinet anywhere (`arcadeFromAbove()` against the top of an open room under a hallway), `buildLounge(…, arcade)` adds one unless told a games room comes later, and `L.arcade` is wherever it went.
- Redwood Camp has no back wall any more: the forest runs to the top edge.
  - The usage board stands on log posts, and the clock, calendar and status board hang on trunks.
  - The door is a trailhead gate.
  - The windows are gaps in the treeline that look out of the woods at the sky.
  - The weather falls on the whole camp: rain with puddles, snow that settles, fog between the trunks, storm gusts and cloud shadows.
- In Redwood Camp you can click the campfire, the giant trees and the creek.
  - The campfire: idle campers come over for s'mores (one marshmallow always catches fire), a singalong with a guitar, or ghost stories by flashlight after dark; or the fire roars up into a bonfire, or pops popcorn.
  - The trees: an owl, a grey squirrel running up the trunk, a woodpecker, a bird flying off, or a pinecone on someone's head.
  - The creek: a jumping trout, a frog plopping in, a duck or a paper boat floating by, and now and then a bear cub fishing.
- In the Dusty Annex you can click the building, and nothing works properly:
  - The leak: the bucket fills and overflows, the ceiling gushes, or the drips play a little tune.
  - The fluorescent tubes: one sputters out or flares too bright, or someone comes over to thump the one by the door (it holds, or it doesn't).
  - The storerooms: an avalanche of boxes, a drawer spitting paper, a cloud of dust, a mouse; a dead photocopier there jams in a fountain of paper.
  - The old hall: the tea urn draws a queue of mugs and complaints, and the stage puts on a one-person show in a spotlight for an audience of two or three (or the PA squeals, or the curtain comes off its rail).
  - The radiators clank, hiss or sit stone cold, and a stair gives way and gets taped over.
- The Dusty Annex is smaller and more cramped, and everyone in it has bad habits:
  - A narrow building squeezed in between a neighbour's brick wall with a rusty fire escape, the street (a lamp post, bin bags, a parked car) and a back yard of wheelie bins, pallets and a dumped armchair. Rain falls on the street, not indoors.
  - Only as many desks as people, shoved against filing cabinets where a desk would have gone; fewer waiting chairs; every room lined with boxes, cabinets and dead equipment, and boxes stacked along the corridors (never in anyone's way).
  - You, at your desk, take turns: smoking over an overflowing ashtray (a haze in your office, a glowing tip in the dark), feet up on the desk, takeaway with chopsticks, a packet of crisps, a nap with the paper over your face. A stained mug and half a sandwich never leave the desk. Your look from the settings stays.
  - You grumble when someone sits down across the desk, and when clicked ("I was resting my eyes."). Now and then, with company, there's a noise from your chair; your visitors get up fanning the air.
  - The staff, one at a time now and then: a crafty smoke out of the corridor window onto the fire escape, feeding the pigeons on the pavement, peeking at the street through the blinds ("Same van. Different hat."), fish in the microwave with everyone nearby complaining and fanning. Some doze off on the keyboard; a few desks have a tower of files.
- For scenery authors: `pose(p, info)` gives someone (an agent, or you at your desk) another pose where they are, and `tick(act)` lets a scenery start things on its own; see "Habits" in `office/themes/README.md`.
- In Neon City you can click the street and what's on it.
  - The food carts: the cook flips the wok into a tall flame, it steams, or idle people line up and order.
  - The holo billboard: a giant holo koi swims down the street, or the ad glitches into static and comes back as a new one.
  - The crosswalk button: the signal goes WALK and a little crowd hurries across.
  - The ramen shop's noren: people stand outside slurping from bowls, or the chef brings an order out.
  - The manholes: a burst of steam, or a maintenance bot pops up and looks around.
  - The ticket booth prints a ticket (sometimes a line forms), and the sandwich boards spin or fall over until someone stands them up.
  - On the back alley: the dumpster (the stray cat, a rat or a clang), the hover-bike (it lifts off and races away on a neon trail, or its alarm goes off) and the AC units, which drip, sometimes right on someone's head.
  - The street itself: a delivery drone drops off a parcel, or a puddle splashes.
  - Each with its own synth sound, and people nearby comment.
- In the School you can click things too: idle people come over and play along, with their own lines and sounds.
  - The school bell on the wall: recess out on the field (tag, a red ball), or a line in the hall when there's no yard. Otherwise, and after dark, the PA chimes and its message types out under the smartboard, and someone answers back.
  - The field: a game of kickball, a ball booted over the fence, or stargazing with fireflies at night.
  - The swings (higher!), the slide (a ball rolls down), the sandbox (a castle with a moat and a flag that stays a while), hopscotch and four square.
  - The apple trees: someone picks one, or an apple drops on a head.
  - The bus stop: the yellow bus pulls up with kids at the windows, folds its doors open, honks and drives off (headlights at night).
  - The lockers: one jams, another pops open and a basketball and books tumble out.
  - The cafeteria's serving line: a lunch line with trays. The reading rug: story time, where there's room.
  - Feeding the class aquarium brings Shelly the turtle up for the flakes.
- In the Surf Villa you can click the pool, the surf, the lifeguard tower, the bonfire, the beach, the tiki bar and the palms.
  - The pool: idle people wade in for a pool-noodle duel, a game of catch with a beach ball, or a nap on the flamingo float, or someone does a cannonball while two others come over to judge it. Otherwise the pool robot does its rounds or an inflatable drifts by.
  - The surf: a surfer (who sometimes wipes out), dolphins, a whale that spouts and waves its tail, a sailboat, or a message in a bottle washing up.
  - The lifeguard tower: a whistle, a look through the binoculars, or a run into the waves to save a rubber duck.
  - The bonfire: a ukulele singalong or marshmallows on sticks, or the fire flares up.
  - The beach: people build a sandcastle (the sea takes it if it's too close), dig for buried treasure or throw a frisbee; or a gull steals someone's fries, or crabs parade by.
  - The tiki bar slides a coconut drink to whoever is closest, and a palm drops a coconut, now and then on someone's head.
- For scenery authors: an `openWindow` hook, and the "Open the window" hover text goes through `labels.words`.
- Tech news on the TV from more sources: pick Hacker News, Lobsters, Techmeme, The Verge, Ars Technica, DEV Community, Slashdot, the GitHub Blog, a mix of the first five, or any RSS or Atom feed (`newsSource`, `newsFeed`). The TECH channel names its source, and in a mix each headline's.
- A soft glow picks out what's new:
  - Warm gold around a thread that finished, failed or asked you something and that you haven't opened since, walking to the waiting room and sitting there; its name tag gets a matching halo.
  - Opening the thread once ends it. Marking it unread again to keep as a reminder doesn't bring it back; only a new finish does.
  - Cool blue around a thread that got to work since you last looked: on its way to its desk (or the meeting room, to plan) and while it works there, until it stops. At night its desk lamp takes on the same blue.
- For scenery authors: `clickables` and `click` hooks for things to click in the scenery, which can ask idle people over with lines and sounds.
- Hold Alt (Option on a Mac) to see everything you can click: light corner brackets around people, pets, visitors, props, the wall, empty desks and the scenery's own things, and outlines on the buttons, the TV and the pinboard, until you let go. The Easter eggs and the string lights stay secret. Not while you're typing.
- Subagents help out at the desk: while a thread works with background agents of its own, they come in as small helpers in caps of its color and stand next to its desk, pointing at the screen, holding up a page or a laptop, nodding, now and then a word.
  - Up to three per desk (two at desks with their back to you), the rest as "+n"; hover a helper to see whose it is, click it to open the thread.
  - They walk in through the door when they start and back out when they're done.
  - Child threads keep their own desks and wear lanyards matching their parent's; hovering one points at the rest of the family, and the tooltip says whose child it is.

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
