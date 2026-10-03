# 003 — Household and Opening (Stage 2)

**Status:** authorized 2026-10-02 ([D43](../../DECISIONS.md#d43--stage-2-begins-accepted-2026-10-02)).
M1 in progress.

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

Each milestone changes ordinary play (D18). M4 and M5 need the product owner's story beats
before they start.

### M1 — The nine families and a choice of starter (save v9)

- [ ] Nine primary families in host content with descriptions and provisional starting
      stat tendencies of equal total; Brindlekin stays a lineage, reserved.
- [ ] Each family has a distinct, animated low-poly figure from one shared parametric figure
      builder, with seeded individual variation in colour and size.
- [ ] A fresh game opens on a starter offer: Mallow (now Canine) plus two other families
      drawn from the new game's seed without duplicates. Each shows name, family,
      personality and stats; the player may rename the one they choose.
- [ ] The chosen critter is the companion, and every existing system (care, foraging,
      hauling, drills, exhibition) works for every family.
- [ ] Save v9: Brindlekin companions from v1–v8 become Canine with identity, name, stats
      and history intact; unknown families fail validation without touching the save.
- [ ] Keyboard, gamepad and touch can make the choice; controls are labelled.
- [ ] Verification: unit tests (offer determinism, no duplicates, Mallow present, v8→v9
      and chained migration), e2e suite updated to choose a starter, lint, build, PWA
      check, and inspected screenshots of every family at phone and desktop sizes.

### M2 — Grandpa, Pip and the road to Oakhaven

Grandpa lives on the stead; Pip (Grandpa-owned, D20) forages on its own; more than one
critter is simulated and drawn; Oakhaven is a reachable area and the Colosseum moves there.

### M3 — The walk to town

The scripted opening for fresh games ([Opening](../../GAME-DESIGN.md#opening-and-acquisition)):
Pip picks berries, Gemothy and the bin, Grandpa's ways of partnering, the offer in town,
the walk home and the first guided day. Needs a product-owner choice on how existing saves
meet the prologue.

### M4 — The years with Grandpa

Spring-and-summer years with timeskips and Grandpa-guided routines. Needs story beats.

### M5 — Grandpa's passing and the first winter

Fixed, scripted passing; Pip's after-routines; inheriting the stead. Needs story beats.

## Decisions (routine, this campaign)

- Critter figures are parametric and built in code, not imported meshes: chimeras will mix
  family body plans (D09) and the figure's animation is part-based. Blender remains
  available for authored set pieces.
- No save exists until a starter is chosen. Reloading before choosing draws a new seed
  (provisional; M3 moves the offer into the walk).
- In M1 every family can learn the existing behaviors; morphology limits arrive with tools.

## Current handoff

M1 in progress. Next: family content and save v9 in the host, then the figure builder, then
the offer screen and e2e updates.
