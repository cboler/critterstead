# 006 — Oakhaven and the wider map

**Status:** authorized 2026-10-16 ([D54](../../DECISIONS.md#d54--a-wider-map-a-town-with-residents-and-selling-through-the-pickup-or-the-shop-accepted-2026-10-16),
[D55](../../DECISIONS.md#d55--saves-from-earlier-builds-may-be-retired-before-release-accepted-2026-10-16)).
M1 in progress.

## Purpose

Make the world feel like a place you travel through rather than five rooms joined by
gates: roads with room between the stead, Oakhaven and the Colosseum where critters can
be met; a town with a few residents doing real jobs; a farm and a barn beside the
cottage; selling through a sales pickup or the town store instead of the honesty stall;
Colosseum booths with staff; Gemothy back at the tavern bin as a friend; a map and an
optional minimap; inventory screens; more than one critter of your own, with a way to
choose who follows you; and figures loaded from model files you can edit.

The working pass is done when a new game shows all of this in ordinary play.

**Non-goals:** a full NPC schedule and relationship system (residents keep simple posts
and a few lines), shops beyond one general store, contracts and the bulletin-board
economy, wild-critter taming, the three-critter travelling party and expeditions,
turn-based bouts, the Whispering Woods, quarry and other later areas.

**Baseline:** plan 005 M1 at save v13 (`196d473`). Five areas, each a 20×20 square joined
by gates (`content.ts` `AREAS`): Bramblewick Yard (cottage, nook, garden, honesty stall,
lift, time trial, chest, mill, trough), the cottage interior, Clover Glade (berries and
four drills), Oakhaven (square, well, three closed shopfronts, notice board, tavern bin)
and the Colosseum grounds (one exhibition steward). All buying and selling happens at the
stall, instantly. Gemothy appears only in the pre-save opening walk. Supplies are a plain
list in the journal. Figures are built in code (`render/figures.ts`).

## Shape of the new map (provisional)

```
 Colosseum ── Colosseum road ── Oakhaven ── Hedgerow lane ── Bramblewick Yard ── Clover Glade
 forecourt    (critters met)    square,     (critters met,    farm, storage box,
 & booths                       store,      the opening's     sales pickup, barn,
                                shelter,    hedge)            cottage, nook
                                tavern bin
```

Working names, like every place name. Areas stay discrete authored dioramas (D29, D36);
"space between" is new and larger areas, not an open world. Areas may now be rectangles.

## Milestones

Each changes ordinary play (D18). Saves from before a milestone's save version are
retired, not migrated (D55): the game says so, keeps the record, and offers a new game.

### M1 — Roads between places (save v14)

- [x] Areas can be rectangles; terrain, camera and walking bounds follow.
- [x] Two road areas: the Hedgerow lane between the yard and Oakhaven, and the Colosseum
      road between Oakhaven and the Colosseum, each 36 × 12 with its own scenery.
- [x] Wild critters of the nine families wander the roads by a seeded daily table; walking
      up to one lets you greet it, and the journal's Critters tab keeps the families met.
- [x] The opening walk passes through the lane, with Pip's hedge there.
- [x] Grandpa's and Pip's routines stay on the stead, so they need no routing; quests and
      the notice board name the road.
- [x] Save v14; v13 and older saves are retired with a clear message (D55), and the
      migration chain and legacy fixtures are removed.
- [x] Verification: see [M1 evidence](#m1-evidence--2026-10-16).

### M2 — Oakhaven's store, shelter and residents

- [x] A larger Oakhaven (32 × 22): the square, a back row of houses, the tavern and its
      bin, the critter shelter and its pen.
- [x] Marigold Hale's general store sells feed and seed from 8:00 to 18:00 and buys berries
      and produce; the honesty stall now only buys (until M3) and the household starts with
      two packets of turnip seed from Grandpa.
- [x] Wren Ashby's shelter keeps three critters waiting for homes, lasting individuals drawn
      from the household's `origin` seed; you can visit each once a day (adoption in M8).
- [x] Four residents (store, shelter, tavern, clinic) keep their posts in their hours and
      chat once a day, introducing themselves first; Grandpa's past surfaces in two lines.

### M3 — The farm, the sales pickup and the barn

- [x] The yard widens to 28 × 20; a fenced farm field west of the cottage holds six beds,
      with a storage box by the cottage.
- [x] A sales pickup by the lane gate: goods left in it (berries, turnips, wheat) are
      collected overnight at 60% of the store's price and paid at dawn with a journal note.
- [x] The honesty stall is retired; Grandpa leans on the field fence instead. Nothing sells
      instantly at the stead.
- [x] The companion nook is now the barn (a larger red barn where the nook stood, mended for
      12 coins as before). Stalls for more critters arrive with adoption in M8; its own
      interior comes later.

### M4 — The Colosseum forecourt, booths and promotion cups

- [x] Three booths with staff in their hours (8:00–20:00): Ottilie Marsh's exhibition booth
      (the everyday showing and scheduled events), Gus Penrose's ladder booth (ranked cups)
      and Celia Vane's promotion desk; each offers only its own entries and a chat.
- [x] Plan 005 M2 lands here: promotion cups on days 15 and 29 for critters with six ladder
      points, three legs against the rank's four strongest rivals. First place promotes,
      clears the points and pays a purse; any other placing keeps the qualification. A
      Veteran who wins becomes a Champion awaiting bouts.
- [x] The calendar shows promotion cups (and whether the companion qualifies); the day's
      quests point at the right booth.

### M5 — Gemothy, a friend at the tavern bin

- [ ] Gemothy turns up near the tavern bin on some days, more often on bin day.
- [ ] Calm visits and scraps build his trust over days; startling him sets it back.
- [ ] A friend, never a party member: once he trusts you he leaves you something he has
      found each week (and may later show you a training).

### M6 — The map and the minimap

- [ ] Grandpa gives you the map on the opening walk.
- [ ] A map screen of every area and road, where you, your critters, Grandpa and Pip are,
      and what matters today.
- [ ] An optional minimap, off by default, toggled in Help; a device preference.

### M7 — Inventory screens

- [ ] Backpack and satchel side by side with item details; standing at a container, the
      container beside your backpack with move one, move all; a read-only household view
      of every container.

### M8 — More than one critter: adoption, the roster and who follows

- [ ] Adopt from the shelter; the newcomer lives in the barn.
- [ ] A roster (at the barn and in the companion panel) chooses which critter follows
      you; the others rest in the barn or go about the jobs they have learned.

### M9 — Figures from model files

- [ ] The code-built figures are exported once to glTF files in the repository, then
      loaded at runtime, with named parts for animation and named materials for each
      individual's colours; editing a file in Blender changes the game.
- [ ] A short how-to for editing them in `DEVELOPMENT.md`.

## Open questions for the product owner

- **Death in the Colosseum.** Raised 2026-10-16: critters might die in Colosseum bouts,
  so retiring means they are very strong. This conflicts with D28 (Colosseum combat is
  strictly nonlethal; danger lives in the wilds) and with the Monster Rancher inspiration
  (monsters are hurt and age out; they do not die in tournaments). It does not affect
  this campaign; bouts are later.

## Model tweaking

Today figures are built in code from shared parts (`render/figures.ts`); M9 moves them to
model files. Three.js stays the engine: memory use comes from scenery detail and textures,
which the quality tiers already control, not from the library.

## Decisions (routine, this campaign)

- Who follows: one companion follows; the others work or rest. The design's party of three
  remains for expeditions, a later campaign.

## M1 evidence — 2026-10-16

- Host: `cast.ts` (`castFor`, `wildCritters`, `familiesMet`, `noise`), the `lane` and
  `road` areas and `sign` objects in `content.ts`, travel and greeting in `host.ts`,
  `SAVE_VERSION` 14 and `readSave`'s retirement in `storage.ts`. Unit tests: 172 passed,
  including `cast.spec.ts` (determinism, placement, night, greeting once a day, families
  kept across a save) and the walk yard → lane → town → road → Colosseum and back.
- Browser: `opening.spec.ts` passes the hedge in the lane; `training.spec.ts` walks both
  roads to the Colosseum. Inspected in the dev server: the opening's hedge beat in the lane
  with a wild equine, a greeting recorded in the Critters tab, the Colosseum road.
- Gates: lint, unit tests, production build (bundle 79.8 kB over its budget warning,
  72.7 kB before).
- Routine decisions: roads are 36 × 12; each step onto or off a road is 5 minutes
  (yard to town is now 10 minutes plus the walk); two or three wild critters per road on a
  fair day, one in rain or snow, none from 20:00 to 06:00; trees stay off the camera side.

## M2 evidence — 2026-10-16

- Host: `RESIDENTS`, `residentsAbout`, `shelterWaiting` and the shelter's cast in
  `cast.ts`; `shelterCandidate` in `families.ts`; `shop` and `shelter` objects, chats
  (`chat:<resident>`, from face to face or across a counter), visits and the store's
  `sellActions`/`buyActions` in `host.ts`; `GameState.origin` (v14, unreleased, so no
  bump). Unit tests: 177 passed, including residents' hours and introductions, chatting
  across the counter, the shelter's lasting critters and daily visits, the store's hours.
- Inspected in the dev server: the square with the store's awning and Marigold, the
  shelter pen with three named critters and Wren, Dr. Fenn and Bertram at their doors.
- Routine decisions: working names Marigold Hale, Wren Ashby, Bertram Cobb and Dr. Isolde
  Fenn; store prices are the stall's old prices; one chat per resident per day.

## M3 evidence — 2026-10-16

- Host: `FARM_FIELD`, `FARM_BEDS`, `FARM_FENCE` and `PICKUP_SHARE` in `content.ts`; the
  `box` and `pickup` containers in `logistics.ts`; `collectPickup` at dawn and
  `pickupValue` in `host.ts`; the barn's copy; the stall removed. No save bump: v14 is
  unreleased. Unit tests: 178 passed, including the pickup refusing feed, quoting 60% and
  paying at dawn, and the three-day campaign shipping berries and turnips.
- Inspected in the dev server: the wider yard with the barn, the fenced field behind the
  cottage with its beds and box, and the pickup's flag by the lane gate.
- Browser tests sell through the pickup and stand in for the cart's payment.

## M4 evidence — 2026-10-16

- Host: `PROMOTION`, `PROMOTION_DAYS`, `promotionLegs`, `promotionField` and
  `qualifiedForPromotion` in `ladder.ts`; `eventInfo('promotion')`; `finishPromotion`; the
  `ladder` and `promotion` booths and their staff; saves accept `promotion` events and
  results (v14, unreleased). Unit tests: 181 passed, including entry by qualification, a win
  that promotes and survives a save, a loss that keeps the qualification, and a Veteran
  becoming a Champion.
- Inspected in the dev server: the forecourt's two new booths with Gus and Celia, the
  promotion desk's offer on Spring 15.
- Routine decisions (provisional, for plan 005's simulator): fees 10/16/24, purses
  60/30/15, 100/50/25, 160/80/40, 50 energy and 90 minutes; four rivals in the field.

## Current handoff

M1–M4 complete. Next: M5 — Gemothy at the tavern bin.
