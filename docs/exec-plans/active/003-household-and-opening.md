# 003 — Household and Opening (Stage 2)

**Status:** authorized 2026-10-02 ([D43](../../DECISIONS.md#d43--stage-2-begins-accepted-2026-10-02)). M1–M3 built and locally
verified ([M1](#m1-evidence--2026-10-02), [M2](#m2-evidence--2026-10-02), [M3](#m3-evidence--2026-10-03)); M4–M5 built
2026-11-16 ([evidence](#m4m5-evidence--2026-11-16)), awaiting the published playtest.

## Purpose

Give the game its story: the years with Grandpa and Pip, the walk to Oakhaven, choosing a
first critter, and, eventually, Grandpa's passing and the first winter alone. Design
authority: [narrative canon](../../GAME-DESIGN.md#narrative-canon-and-household-history),
[D39](../../DECISIONS.md#d39--the-childhood-centers-on-grandpa-cousin-reopened-accepted-2026-10-02)–D43.

**Non-goals:** town commerce and shops (Stage 3), breeding and chimera generation (Stage 4),
the cousin (undecided), Gemothy's later return, online features (D41).

**Baseline:** Campaign 001 complete at save v8 (`f152b1e` plus docs). One player-owned
critter, Mallow (Brindlekin, provisional), rendered by a single hand-built figure.

## Milestones

Each milestone changes ordinary play (D18). M4 and M5 were written and built together at
the product owner's request ([D57](../../DECISIONS.md#d57--the-story-of-bramblewick-accepted-2026-11-16)).

### M1 — The nine families and a choice of starter (save v9)

- [x] Nine primary families in host content with descriptions and provisional starting
      stat tendencies of equal total; Brindlekin stays a lineage, reserved.
- [x] Each family has a distinct, animated low-poly figure from one shared parametric figure
      builder, with seeded individual variation in colour and size.
- [x] A fresh game opens on a starter offer: Mallow (now Canine) plus two other families
      drawn from the new game's seed without duplicates. Each shows name, family,
      personality and stats; the player may rename the one they choose.
- [x] The chosen critter is the companion, and every existing system (care, foraging,
      hauling, drills, exhibition) works for every family.
- [x] Save v9: Brindlekin companions from v1–v8 become Canine with identity, name, stats
      and history intact; unknown families fail validation without touching the save.
- [x] Keyboard, gamepad and touch can make the choice; controls are labelled.
- [x] Verification: unit tests (offer determinism, no duplicates, Mallow present, v8→v9
      and chained migration), e2e suite updated to choose a starter, lint, build, PWA
      check, and inspected screenshots of every family at phone and desktop sizes.

### M2 — Grandpa, Pip and the road to Oakhaven (save v10)

- [x] Oakhaven is reachable west of the yard (20 minutes): a square with a well, shopfronts
      (not yet open), benches and a notice board. The Colosseum moves to its west edge.
- [x] Grandpa keeps a daily routine on the stead (garden, porch, lunch, stall, hearth;
      indoors in bad weather) and can be talked to; he ends with your next goal.
- [x] Pip, Grandpa's Brindlekin (D44), keeps near Grandpa and forages the glade on fair
      mornings; his picks fill the yard chest and teach a companion who watches.
- [x] Save v10: every household gains Pip and allows saves in Oakhaven; older saves keep
      everything, including a legacy companion named Pip.
- [x] Verification: unit tests, the browser suite with the Colosseum reached through town,
      lint, build, PWA check, inspected screenshots.

### M3 — The walk to town

- [x] Fresh games open on the walk to Oakhaven ([Opening](../../GAME-DESIGN.md#opening-and-acquisition)):
      leaving the yard with Grandpa and Pip, Pip picking from the hedge unasked, Gemothy and
      the tavern bin, Grandpa's ways of partnering, Mallow, then the choice in the square.
- [x] Continue by button, Enter, Space or A; skip to the choice by button, Escape or Start.
- [x] Choosing sends the critter home with Grandpa's farewell; the household begins the
      next morning with Grandpa's greeting as its first journal line.
- [x] Existing saves skip the prologue (product owner, 2026-10-03); nothing is saved during it.
- [x] Verification: unit tests for the script, a browser test walking every beat, the
      browser suite skipping the walk, controller skip, PWA check, inspected screenshots.

### M4 — The years with Grandpa (save v16)

- [x] Three springs and summers; waking in autumn is the school cart, and the night
      carries the household to spring with the stead minded and letters from home.
- [x] Scenes with Grandpa on their days and after a first ribbon or a Champion's; his
      routine and what he says change each year; the calendar warns of the cart.
- [x] The opening's lines polished to plant what the ending returns to.

### M5 — Grandpa's passing, Pip's rounds and the title

- [x] The passing on the first morning of the third autumn: fixed, scripted, saved.
      Grandpa leaves the world; the stone and bench stand in Clover Glade; forty-one coins.
- [x] Pip keeps the old round alone; sitting with him turns up five keepsakes in order,
      kept in the journal's Story tab, where seen scenes can be read again.
- [x] Townsfolk each say their piece once; Hetty Larkspur and Lantern at the rail.
- [x] The Grand Championship at Midwinter and each season's turn after: five legs for
      Grandpa's title, Pip at the rail. Winning plays the ending and the credits; play
      continues, with Pip at the player's heel.
- [x] Verification: unit tests, a browser test of the scenes, lint, build, PWA check,
      inspected screenshots.

## Decisions (routine, this campaign)

- Critter figures are parametric and built in code, not imported meshes: chimeras will mix
  family body plans (D09) and the figure's animation is part-based. Blender remains
  available for authored set pieces.
- No save exists until a starter is chosen. Reloading before choosing draws a new seed
  (provisional; M3 moves the offer into the walk).
- In M1 every family can learn the existing behaviors; morphology limits arrive with tools.

## M1 evidence — 2026-10-02

- Host: `families.ts` (nine families, `starterOffer`, `starterName`), save v9 with v8 → v9
  migration, `createInitialState(starter, seed)`. Unit tests: 143 passed, including offer
  determinism over 200 seeds, every non-Canine family reachable, the v1–v8 chain to v9, and
  refusal of unknown families, missing sizes and ambiguous v8 records.
- Presentation: `render/figures.ts` with nine family figures; the offer sheet with
  keyboard (arrows, Enter), gamepad (D-pad, A) and touch choice. Inspected in the browser
  at 1280×720 and 375×812; all nine figures checked close up. Evidence:
  [desktop offer](../evidence/003-m1/desktop-offer.png),
  [phone offer](../evidence/003-m1/phone-offer.png).
- Gates: lint, production build, PWA check (now taking Mallow home first), and the browser suite: 64 passed and
  28 skipped by project, after the reset tests were taught to choose a starter (36/36
  persistence tests on the rerun).
- Provisional: family stat tendencies, colour pools, name pools, offer positions in the
  yard, size range 0.9–1.1.
- Known: Mallow keeps her original look and long ears, which read more fennec than hound;
  reshaping her is a product call. Reloading before choosing draws a new offer.

## M2 evidence — 2026-10-02

- Host: `household.ts` (Grandpa's and Pip's routines, Pip's picks, what Grandpa says),
  Oakhaven in `content.ts`, save v10. Unit tests: 154 passed, including Grandpa's day, Pip's
  two fair-morning picks into the yard chest, teaching a watching companion, foul-weather
  days, the v1–v9 chain to v10, and refusal of saves without Pip or with a stranger owner.
- Presentation: Grandpa's figure, Pip's Brindlekin figure, the Oakhaven diorama and the
  yard's west road. Evidence: [yard](../evidence/003-m2/yard-grandpa-pip.png),
  [Oakhaven](../evidence/003-m2/oakhaven.png).
- Gates: lint, production build, PWA check, and the browser suite (64 passed, 28 skipped by
  project). The suite caught Grandpa standing on bed 2's and the stall's working spots;
  his spots were moved off them. Tests about your own teaching mark Pip's round as done.
- Routine decisions: residents join the dock within 1.4 units, so your companion keeps it
  until you walk up to Grandpa or Pip; when you are not in the glade, Pip picks the farthest
  bushes; everyone ages overnight. Provisional: Pip's age (4800 days) and stats, Grandpa's
  spots and hours, his lines, travel times.
- Known: Grandpa is not yet a saved entity (M5 will need that for his passing); town shops
  are facades until Stage 3.

## M3 evidence — 2026-10-03

- `opening.ts` (ten beats, `stageOpening`, Grandpa's farewell); `GameWorld.setScene` with
  Gemothy's figure, the hedge and the tavern bin; the opening card in `app.ts`. Unit tests:
  158 passed. Browser: the full walk on desktop and phone (`e2e/opening.spec.ts`), and the
  controller skip. Screenshots: [Gemothy](../evidence/003-m3/gemothy.png),
  [the choice](../evidence/003-m3/the-choice.png).
- Gates: lint, production build, PWA check (now skipping the walk first), and the browser
  suite (66 passed, 30 skipped by project).
- Routine decisions: the walk is a sequence of staged beats you advance, not free
  movement; the starter offer moved into Oakhaven's square. Provisional: every line and
  mark in the script.

## M4–M5 evidence — 2026-11-16

- Host: `story.ts` (when scenes fall due, keepsakes, title days, staging, credits),
  `story-scenes.ts` (the script: 19 scenes), `household.ts` (Grandpa's years, Pip's vigil),
  `ladder.ts` (`TITLE`, `TITLE_FIELD`), the host's `sleep` hooks, `carryTo`, `schoolTerm`,
  `grandpaPasses`, `sit-with-pip`, save v16 with v14/v15 migration. Unit tests: 224 passed,
  including `story.spec.ts` (every scene staged in bounds, school terms, the passing, the
  vigil's hours, keepsakes in order, the title lost and won, play after the credits,
  migration, damaged story records).
- Presentation: the scene card, chapter cards, letters, credits, the journal's Story tab,
  the glade's stone. Browser: `e2e/story.spec.ts` plays the passing, the letter, the ending
  and the credits, reloads, and re-reads a scene (desktop and phone). Inspected: the
  [funeral in the glade](../evidence/003-m5/the-glade.png), [a letter](../evidence/003-m5/the-letter.png),
  [the road home](../evidence/003-m5/the-east-road-phone.png), the chapter card and the credits.
- Gates: lint, unit tests, production build (the scenes are a lazy chunk; the initial
  bundle is at its error budget), PWA check, `npm run balance` unchanged, and the browser
  suite (81 passed, 55 skipped by project, 33 minutes).
- Routine decisions: scenes with Grandpa play on waking, the evening's first; at most one
  dated scene a morning; a household already in autumn or winter with Grandpa alive meets
  the cart (or, from year three, his passing) at its next sleep; three days are carried
  around the funeral; a term adds one to each stat and two foraging lessons from Pip;
  Pip's ownership stays Grandpa's. Provisional: every line, every date, `STORY`, the
  title's field, fee and purse.
- Known: scenes show the townsfolk only where their posts are (the funeral's mourners are
  told, not drawn); the companion in a scene is whoever follows you; the Grand
  Championship is not in the balancing simulator; credits name no maker (add one in
  `credits()`); breeding after the credits waits for Stage 4.

## Current handoff

M1–M5 built and locally verified. Next: publish, then playtest the story on the published
site (the developer kit's next-day reaches each scene quickly); tune the number of summers
(`STORY.lastSummerYear`), scene dates and the title match from that. The plan moves to
`completed/` once the playtest is in.
