# 006 — Oakhaven and the wider map

**Status:** proposed 2026-10-16 from the product owner's direction ([D54](../../DECISIONS.md#d54--a-wider-map-a-town-with-residents-and-selling-through-the-pickup-or-the-shop-accepted-2026-10-16)).
Not started. M1 is next once the [open questions](#open-questions-for-the-product-owner)
that block it are answered (none block M1).

## Purpose

Make the world feel like a place you travel through rather than five rooms joined by
gates: roads with room between the stead, Oakhaven and the Colosseum where critters can
be met; a town with a few residents doing real jobs; a farm beside the cottage; selling
through a sales pickup or the town shop instead of the honesty stall; Gemothy back at the
tavern bin to befriend; a map and an optional minimap; and inventory screens that can
manage what you carry and store.

**Non-goals:** a full NPC schedule and relationship system (residents keep simple posts
and a few lines), shops beyond one general store, contracts and the bulletin-board
economy, wild-critter taming or a capture mechanic, a multi-critter party, the Whispering
Woods, quarry and other later areas, imported 3D model files (see
[model tweaking](#model-tweaking)).

**Baseline:** plan 005 M1 at save v13 (`196d473`). Five areas, each a 20×20 square joined
by gates (`content.ts` `AREAS`): Bramblewick Yard (cottage, nook, garden, honesty stall,
lift, time trial, chest, mill, trough), the cottage interior, Clover Glade (berries and
four drills), Oakhaven (square, well, three closed shopfronts, notice board, tavern bin)
and the Colosseum grounds (one exhibition steward). All buying and selling happens at the
stall, instantly. Gemothy appears only in the pre-save opening walk. Supplies are a plain
list in the journal; storage moves happen in the dock beside a container.

## Shape of the new map (provisional)

```
 Colosseum ── Colosseum road ── Oakhaven ── Hedgerow lane ── Bramblewick Yard ── Clover Glade
 forecourt    (critters met)    square,     (critters met,    farm, storage box,
 & booths                       store,      the opening's     sales pickup,
                                shelter,    hedge)            cottage, nook
                                tavern bin
```

Working names, like every place name ([open](../../DECISIONS.md#open-or-exploratory--do-not-invent-canon)).
Travel time between the stead and town stays about 20 minutes in all, now split across
the lane. Areas stay discrete authored dioramas (D29, D36); "space between" is new areas
and larger ones, not an open world.

## Milestones

Each changes ordinary play (D18). Order follows dependencies: places first, then the
people and rules that live in them, then the views over them.

### M1 — Roads between places (save v14)

- [ ] Two road areas: the Hedgerow lane between the yard and Oakhaven, and the Colosseum
      road between Oakhaven and the Colosseum, each longer than wide, with its own scenery
      and walking time; the town and yard gates now lead to them.
- [ ] Wild critters of the nine families wander the roads by a seeded daily table (which
      family, where, when); walking up to one lets you greet it, and the journal keeps the
      kinds you have met. They cannot be owned yet.
- [ ] The opening walk passes through the lane, with Pip's hedge there.
- [ ] Grandpa's and Pip's whereabouts, quests and Grandpa's next-step lines route through
      the roads.
- [ ] Save v14: the new area ids; v1–v13 saves in any area migrate intact; a save standing
      on a road reloads there.
- [ ] Verification: unit tests (area links, wild-critter table determinism, migration),
      the browser suite reaching the Colosseum by road, lint, build, PWA, inspected
      screenshots at desktop and phone sizes.

### M2 — Oakhaven's store and residents

- [ ] Oakhaven grows: the square, a shop row and a lane to the tavern; the general store,
      the critter shelter and the tavern are enterable or have a counter you walk up to.
- [ ] The general store has a shopkeeper at the counter during opening hours: buy feed,
      seeds and the seasonal seeds now sold at the stall; sell berries and produce at
      better prices than the pickup will pay (M3).
- [ ] The critter shelter has a keeper who talks about the critters in their care and the
      ways of partnering Grandpa described; adoption waits on the
      [open question](#open-questions-for-the-product-owner).
- [ ] Residents are named, stand at their posts on a simple daily timetable (closed at
      night and in bad weather where it makes sense) and say a few lines; Grandpa's town
      reputation can surface in one or two of them (sparingly).
- [ ] Verification: unit tests (prices, opening hours, closed counters), a browser test of
      buying and selling at the store, lint, build, PWA, inspected screenshots.

### M3 — The farm and the sales pickup (save v15)

- [ ] A farm field beside the cottage: the garden plots move there with a storage box for
      seeds and harvest; plots, crops and moisture carry over exactly.
- [ ] A sales pickup by the farm gate: goods put in it are collected overnight at baseline
      prices (lower than the store), paid at dawn, with a note in the journal.
- [ ] The honesty stall is retired; Grandpa's routine moves from "stall" to the farm.
      Nothing sells instantly at the stead any more.
- [ ] Save v15: the storage box and pickup containers; anything a save would lose by
      moving the garden goes into the storage box; quests that pointed at the stall point
      at the pickup or the store.
- [ ] Verification: unit tests (overnight sale, prices, migration of a v14 save mid-sale),
      a browser test of a day's harvest sold through the pickup, lint, build, PWA,
      inspected screenshots.

### M4 — The Colosseum forecourt and its booths

- [ ] The Colosseum grounds gain a forecourt with registration booths, each with an NPC
      during opening hours: the exhibition steward (everyday showing and scheduled
      events), the ladder registrar (ranked cups) and, once plan 005 M2 lands, the
      promotion desk.
- [ ] Each booth offers only its own entries; the calendar, quests and journal name the
      booth to visit.
- [ ] Verification: unit tests (booth offers by day), the browser suite's events and cups
      entered at their booths, lint, build, PWA, inspected screenshots.

### M5 — Gemothy at the tavern bin

- [ ] Gemothy turns up near the tavern bin on some days and hours (seeded by the day, more
      often on bin day), visibly scavenging; otherwise he is elsewhere.
- [ ] Befriending: approaching him calmly, leaving scraps, and returning across days build
      his trust, shown in what he does (bolting, watching, coming closer, following you a
      little way). Startling him (running at him, a companion that is too boisterous) sets
      him back.
- [ ] Where befriending ends follows the [open question](#open-questions-for-the-product-owner).
- [ ] Save: his trust (and any join) on the save, with migration; he is never a stored
      position.
- [ ] Verification: unit tests (appearance table, trust rules, migration), a browser test
      of a visit, lint, build, PWA, inspected screenshots.

### M6 — The map and the minimap

- [ ] Grandpa gives you the map during the opening walk (a short beat as you leave the
      yard). Households that already exist get it the next time they talk to him; until
      then the map screen says Grandpa has one for you.
- [ ] A map screen drawn from the area table: every area and road, where you, your
      companion, Grandpa and Pip are, and the places that matter today (the store's hours,
      a cup at the Colosseum, crops ready). Keyboard, gamepad and touch open and close it.
- [ ] An optional minimap in a screen corner showing the current area and its exits,
      off by default, toggled in Help; the choice is a device preference, not save data,
      and it never resizes the viewport (D32) or covers the rancher.
- [ ] Verification: unit tests (the map's reading of the save), browser tests of the
      screen and the toggle, lint, build, PWA, inspected screenshots at both sizes.

### M7 — Inventory screens

- [ ] An inventory screen replacing the journal's Supplies tab: your backpack and your
      companion's satchel side by side with item, quantity, quality and what it is for.
- [ ] Standing at a container (storage box, yard chest, trough, mill, pickup), the screen
      opens on it beside your backpack, with move one, move all, and move the rest; it
      respects capacity and allowed items, and works by keyboard, gamepad and touch.
- [ ] A household view lists every container and what is in it, read only, so you can
      see where things are without walking there (D26: items still live where they are).
- [ ] Verification: unit tests for any new host commands, browser tests of moving goods,
      lint, build, PWA, inspected screenshots at both sizes.

## Open questions for the product owner

- **Gemothy's end state (blocks M5's last item):** once he trusts you, does he join your
  household as a second critter of your own (needs a way to switch companion), stay a
  friend who follows you about town, or something else?
- **The shelter (blocks adoption in M2):** can you adopt from the shelter in this
  campaign, or is it a place to visit until barns and a roster arrive in Stage 3?
- **Plan 005 M2 (promotion cups):** before, alongside (with M4) or after this campaign?
  Recommended: alongside M4, since the promotion desk is a booth.

## Model tweaking

Critter, Grandpa and Gemothy figures are built in code from shared parts
(`render/figures.ts`), not loaded from model files, so there is nothing to open in a 3D
editor today. Tweaks are edits to that file's numbers and colours, seen live with
`npm start`. Loading hand-made models would need an import path (three.js already ships a
glTF loader, so no new dependency) and a decision; it is outside this campaign.

## Decisions (routine, this campaign)

## Current handoff

Plan written; nothing built. Next: M1 — roads between places, starting with the two road
areas in `content.ts` and the save v14 migration.
