# Writing a scenery

A scenery (theme) moves the office to another place. Everything that
*happens* stays the same: the same people, moods, walks, get-togethers,
lunch, events, festivals, gags and visitors. A scenery changes where the
rooms are (its own floor plan, if it likes), how things look and sound, and
what they're called.

The contract is `office/theme.ts` (read it first: every hook is documented
there), the toolbox is `office/themekit.ts`. A theme is one object in
`office/themes/<id>.ts`; every hook is optional and falls back to the
classic office.

## What to translate

Think of what each place *is* in your scenery, then dress it:

| Place (room kind / prop) | Classic |
| --- | --- |
| Back wall (`background.wall`), windows (`background.window`), the view (`outside`) | Wallpaper, wainscoting, windows on a city skyline |
| Floor (`background.floor`), rooms (`background.room` per `room.kind`) | Wooden planks; tiles, carpets, parquet |
| `pod` + desks/chairs/screens | Desk pods on carpets: workstations |
| `meeting` (glass walls) + whiteboard, meeting table | Glass meeting room: planning |
| `waiting` + waiting sofas, armchairs, lounge tables, reception | Waiting room: threads waiting for you |
| `boss` (wood walls) + boss desk/chair, guest chairs, lamp, dog bed, shelf | Your office |
| `kitchen` + counter, espresso, fridge, vending, island, stools | Kitchen: short breaks |
| `lounge` + TV, couch, coffee table, piano, fishtank, armchairs, beanbags | Lounge: longer breaks |
| `games` + ping-pong, arcade, dartboard, beanbags, cornhole | Games room |
| `library` + library shelves/tables, sofas | Reading nook/library |
| `server` + server racks, AI rack | Server room |
| `garden` | Indoor garden (tall panels) |
| String lights along the wall (`wallLights`) | Party bulbs that light up at night |
| Plants (`plant`), hanging plants | Potted plants |
| Cooler, printer, bin | Utilities |
| Boss, guard, janitor, technician, delivery (`npc`) | Visitors |
| Agents' clothes (`look`, `dress`) | Shirt in the project color |
| Words (`labels.words`, `labels.poke`, `labels.npc`, TV titles) | "kitchen", "water cooler", "HQ NEWS" |
| Window sounds (`sounds`, `outdoor`) | Birds, crickets, rain, wind, thunder, foghorn |
| Night (`lighting`), the sky (`sky`), extra life (`underlay`, `decor`, `overlay`) | Lamps and screens glowing in the dark |

## Rules

- **Edit only your own files**: `office/themes/<id>.ts`, plus helper modules
  in `office/themes/<id>/` if it grows big. Nothing else gets merged. If you
  need a hook that doesn't exist, work around it (`decor`, `overlay`) and say
  so in your report.
- **Keep props the classic size** (the catalog below shows each size). The
  office places props, depth-sorts them and draws live details on them by
  their classic geometry. `edgeGlow` adds 1 px around a sprite; fine.
- **Live details are drawn on top of some props at classic positions.** Keep
  the matching part of your sprite in the same place:
  - `tv`: the TV picture is HTML over `L.tvScreen`; your sprite is the frame
    (and stand), so keep the screen area where it is.
  - `fishtank-stand`: the water and fish are drawn in `L.fishtank` above it.
  - `whiteboard`: marker strokes are drawn on the board area.
  - `arcade`: the game screen; `server-rack`: drive LEDs at x+10..12,
    y+4..29; `ai-rack`: a light band at y+2..7 and fans.
  - `espresso`: steam and a cup under the spout around x+8..16, y+10..21.
  - `kitchen-counter`: kettle steam around x+34, the microwave at the right
    end (w−24).
  - `fridge`: the door swings open over x+1..19, y+1..33.
  - `vending`: the window x+3..16, y+5..33 and the flap at x+17, y+18.
  - `printer`: paper comes out on top; `dartboard`: darts; `boss-desk`:
    papers on top; `library-shelf` `boss-shelf`: a globe on top.
- **Windows**: the glass is cleared before `background.window` runs; paint
  the frame and at most thin mullions over the glass. The view is `outside`.
- **Wall fixtures** keep their places: the pinboard (HTML usage notes drawn
  3 px inside it), calendar and status board (contents are live), the door
  (with its "+" sign: a new thread), the "?" sticky note (the legend), the
  clock (hands are live), the speakers next to the TV.
- **People** are the same sprites: `look` may change shirt, pants, accent,
  accessory, hair style and colors, but keep who they are recognizable (skin,
  usually hair). `dress` can draw small extras on top (a backpack, a visor).
- **Original art only**: no brand logos, no characters or names from shows,
  films or games. "Inspired by the mood of" is fine; copying is not.
- **Pixel art style**: crisp pixels at native size, 1 px dark outlines
  (`OUTLINE` #2a1e2e) on objects, a top-down three-quarter view (you see the
  front and the top), light from the top left, a coherent palette per
  scenery. Night matters: the office gets dark, so give the scenery its own
  light sources (`lighting.lights`).
- Performance: hooks that return sprites are called once per layout/theme
  (cached), but `outside`, `wallLights`, `underlay`, `decor`, `overlay` and
  `lighting.lights` run every frame (30 fps): cache sprites with `cached()`,
  keep per-frame work small.

## Floor plans

A scenery can lay the office out its own way with `layout(W, H, { threads,
portrait })`: tents among redwoods, a villa around a pool, classrooms along a
school corridor. Everything that happens stays the same, so the plan has to
provide every place and fixture a `Layout` has (`office/layout.ts`), and
`node --test office/layoutcheck.test.ts` checks it at eight panel sizes and
three head counts (`checkLayout` in `office/layoutcheck.ts` says what's
wrong). Return null for a size you don't handle to use the classic plan, but
aim to cover wide panels (from 600×300) and the phone held upright (from
340×600, `portrait`).

**How people move.** Hallways (`net.halls`, y values) run the full width
and aisles (`net.aisles`, x values) the full height; people walk along them
between places, cutting corners a little. Every spot's `path` starts on a
hallway point `{ x, y: <a hall>, c: true }`, then leads through open floor to
the spot (`via(access, laneY, x, y)` makes the usual hall → aisle → lane →
spot path). So keep hallways and aisles clear along their whole length and
draw them as what they are in your scenery (boardwalks, a street, a school
corridor, a pool deck). Paths must not cut through walled rooms (except into
their own room).

**Room builders** (in themekit) lay out a room and its spots, props and
clickables inside a rect; compose them anywhere, or write your own rooms
with the same spot kinds and ids:

| Builder | Access |
| --- | --- |
| `buildPods(b, r, { hallY, aisleX })` | desk pods: rows of 48 px desk pairs, `POD_H` (104) tall per row |
| `buildMeeting(b, r, hallY)` | glass room, door bottom right: the hallway must be **below** it |
| `buildBoss(b, r, hallY)` | wood room (you, guest chairs, dog bed, lamp), door top left: hallway **above** |
| `buildWaiting(b, r, hallY)` | reception and seats (fill order in `b.seats`): hallway **above** |
| `buildKitchen(b, r, access)` | counter (espresso, kettle, microwave) along the top, fridge, vending, island, stools |
| `buildLounge(b, r, access, wallTv, naps)` | TV (on the wall if `wallTv`, else standing), couch, piano, fish tank (beanbags if `naps`) |
| `buildGames`, `buildLibrary`, `buildGarden` | games room (darts, ping-pong, arcade), reading nook, garden |
| `buildServerRoom(b, r)` | glass server room (the shock gag and the technician need it); keep an aisle beside it |
| `utilities(b, H, x, hallY)` | cooler, printer and bin along the bottom edge |
| `finish(b, W, H, portrait, segments, net, parts)` | the back wall (pinboard, calendar, status board, door at `parts.doorX`, "?" note, windows, clock), entrance, patrol; returns the Layout |

`buildWide` and `buildPortrait` are the classic plans: copy one as a starting
point. After `finish` you may move wall fixtures, windows (they show your
`outside` view anywhere), or the door (keep `entrance`, `entrancePath` and an
aisle at it consistent), and keep your own geometry in `L.themeData`. The
back wall (`segments`, each `depth` tall) can be anything in your scenery, but
the door is 42 px tall, so keep it at least ~48 deep where the door is.

Words that only hold for some plans go in `L.words` (over `labels.words`):
say "in the lounge" → "out in the schoolyard" only when the plan has the yard
where events happen.

The office looks some places up by id or kind: `coffee`, `tea`, `fridge`,
`vending`, `cooler`, `darts`, `pingpong-l`/`-r`, `couch-*`, `beanbag-*`,
`piano`, `arcade`, `desk-<n>`, `boss-guest-*`, `present-*`, the waiting seats,
the `boss-shelf` prop (globe) and the clickables. The builders create them;
custom rooms should keep the ones they replace, or that bit of life (coffee
chats, darts, ping-pong) quietly goes missing. The event area
(`L.eventArea`) hosts parties, lunch, kids and the roomba: give it open floor.

## Pets, the roomba, the fish tank, visitors

- `pet("dog" | "cat", pose, facing, blink, classic)`: any animal that fits
  the scenery, same sprite size (dog 20×15, cat 16×13) and poses. Rename
  them in `labels.npc.dog` / `labels.npc.cat`.
- `roomba(classic)`: whatever cleans the floor (16×9); its hover text is
  `labels.npc.roomba`.
- `fishTank(ctx, tank, info)`: draw the tank's water and fish yourself (a
  pond, a jellyfish tank, a tide pool); return true.
- `dressVisitor(ctx, v, t)`: extras on you and the visitors (`v.kind`).

## Preview

Work in your copy of the repository. It shares `node_modules`.

```sh
npm run preview                 # bundle preview/ (about a second)
npx tsc --noEmit -p .           # typecheck; fix anything in your files
node --test office/*.test.ts    # tests stay green
```

Then open the preview in a headless browser and take screenshots (bb's
browser automation; these commands talk to bb, so run them outside the
sandbox):

```sh
bb browser-automation open --backend local --headless --machine host_zt877dhe68 --json   # note the "id"
bb browser-automation run <id> --script-file <file.js> --script-host host_zt877dhe68 --timeout 30s
```

A script (Puppeteer-style `page`; keep each run under ~35 s or bb stops the
session, then just open a new one):

```js
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const page = await browser.getPage("main");
await page.setViewport({ width: 1040, height: 760, deviceScaleFactor: 2 });
await page.goto("file:///<your copy>/preview/index.html?scenery=<id>&w=1000&h=711&hour=14");
await sleep(2500);
await page.screenshot({ path: "<your shots dir>/day.png", type: "png", clip: { x: 0, y: 0, width: 1000, height: 711 } });
return await page.evaluate(() => window.__cozyHq?.layout?.W); // the world is on window.__cozyHq
```

Then look at the PNG with the Read tool. Query parameters:

- `scenery` (your id), `w`, `h` (CSS px; with deviceScaleFactor 2 these give
  the native office sizes): `1000×711` (desktop, native 666×474),
  `1350×630` (wide and short), `900×1047` (tall), `390×844` (phone held
  upright; set the viewport to fit).
- `hour` (14 day, 19.5 sunset, 23 night), `weather` (`clear`, `partly`,
  `cloudy`, `fog`, `rain`, `snow`, `storm`), `season` (`holidays`,
  `halloween`, …), `event` (`lunch`, `party`, `karaoke`, …), `gag` (`shock`,
  `technician`, `lunch`, `coffee`, `chat`), `labels=1` (name tags).
- `catalog=1`: every prop, plant, desk, chair and screen, classic on the
  left and yours on the right, with sizes. Use it as your checklist.

`window.__cozyHq` is the live world (e.g. `__cozyHq.startEvent("lunch")`,
`__cozyHq.startMishap()`, `__cozyHq.callTechnician()`, `__cozyHq.openWindow(0)`).
