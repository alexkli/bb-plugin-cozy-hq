# Writing a scenery

A scenery (theme) dresses the office as another place. Everything that
*happens* stays the same: the same rooms in the same places, the same
people, moods, walks, get-togethers, lunch, events, festivals, gags and
visitors. A scenery changes how things look, sound and are called.

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
