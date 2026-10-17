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

- [ ] Areas can be rectangles; terrain, camera and walking bounds follow.
- [ ] Two road areas: the Hedgerow lane between the yard and Oakhaven, and the Colosseum
      road between Oakhaven and the Colosseum, each longer than wide with its own scenery.
- [ ] Wild critters of the nine families wander the roads by a seeded daily table; walking
      up to one lets you greet it, and the journal keeps the kinds you have met.
- [ ] The opening walk passes through the lane, with Pip's hedge there.
- [ ] Grandpa's and Pip's whereabouts and quests route through the roads.
- [ ] Save v14; v13 and older saves are retired with a clear message (D55), and the
      migration chain and legacy fixtures are removed.
- [ ] Verification: unit tests, the browser suite reaching the Colosseum by road, lint,
      build, PWA, inspected screenshots at desktop and phone sizes.

### M2 — Oakhaven's store, shelter and residents

- [ ] A larger Oakhaven: square, shop row, tavern and its bin, the critter shelter.
- [ ] The general store's shopkeeper sells feed and seeds and buys berries and produce at
      better prices than the pickup (M3), during opening hours.
- [ ] The shelter's keeper looks after a few critters waiting for homes (adoption in M8).
- [ ] Residents are named, keep their posts on a simple timetable and say a few lines;
      Grandpa's reputation surfaces sparingly.

### M3 — The farm, the sales pickup and the barn (save v15)

- [ ] A farm field beside the cottage holds the garden plots, with a storage box.
- [ ] A sales pickup: goods left in it are collected overnight at baseline prices, paid at
      dawn with a journal note. The honesty stall is retired; nothing sells instantly.
- [ ] A barn on the stead where critters not following you sleep and rest.

### M4 — The Colosseum forecourt, booths and promotion cups

- [ ] Booths with staff: the exhibition steward, the ladder registrar (ranked cups) and
      the promotion desk; the calendar, quests and journal name the booth.
- [ ] Plan 005 M2 lands here: promotion cups at the promotion desk.

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

## Current handoff

M1 in progress.
