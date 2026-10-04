# 004 — Training and exhibitions

**Status:** authorized 2026-10-03 ([D47](../../DECISIONS.md#d47--raise-critters-for-the-colosseum-accepted-2026-10-03)).
M1 in progress.

## Purpose

Make training the thing you do with your critter: two real-time drills per stat, each
also runnable as a menu routine ([D48](../../DECISIONS.md#d48--two-ways-to-train-accepted-2026-10-03)),
and exhibitions that chain drills into scheduled events. The Colosseum ladder follows as
the next campaign and will take a few balancing passes.

**Non-goals:** the ladder's ranks and promotion cups (next campaign), turn-based Colosseum
combat, town shops, breeding. Plan 003's M4–M5 resume when their story beats arrive.

**Baseline:** plan 003 M3 at save v10 (`f4b0ef4`, live on Pages). Three drills (hoops,
boulder lift, distance pacing), the Clover Cup, and one daily exhibition (sprint, then a
heavy stone pull). Each drill is wired by hand through the host, the training card and the
renderer. Only houses, the shed and cottage furniture block walking.

## Drill roster

| Stat | Drill            | Pattern                                                                 | Status   |
| :--- | :--------------- | :---------------------------------------------------------------------- | :------- |
| STR  | Boulder lift     | Hold in band: tap against gravity                                       | Existing |
| STR  | Log toss         | Charge and release: stop the power at its peak                          | M1       |
| END  | Distance pacing  | Pace with a breath reserve                                              | Existing |
| END  | Balance beam     | Track a drifting zone: steer left and right                             | M3       |
| SPD  | Hoops            | Timing sweep: press in the green                                        | Existing |
| SPD  | Runner           | Endless runner, 20–30 s, jump and double jump                           | M3       |
| INT  | Rhythm routine   | Notes in three or four lanes                                            | M4       |
| INT  | Chess or reading | The critter plays; you cheer at the right moments, or shoo distractions | M4       |

Later pool, for drills or exhibition events: glide (gaps in a moving band), quick draw,
berry catch, shell game, sequence memory, tug of war, stacking.

## Milestones

### M1 — Drill table, log toss, timing assist, solid town and Colosseum

- [ ] Drills come from one host table (stat, side stat, energy, minutes, pattern settings);
      hoops, lift and pacing move onto it with unchanged results.
- [ ] Log toss in the yard: hold to charge, release at the peak; the sweet spot widens with
      strength. Builds STR, a little SPD.
- [ ] A "wider timing windows" assist widens every drill's green zone, stored on the device
      like the quality setting.
- [ ] Oakhaven's buildings, well, carts and notice board and the Colosseum's wall and stands
      block walking; the Colosseum keeps an open entrance on the path from the gate.
- [ ] Verification: unit tests (table parity for the old drills, log toss scoring, assist,
      blockers), browser test for the log toss and walking into a wall, lint, build, PWA,
      inspected screenshots.

### M2 — Routines

Every drill played together at least once can be run as a routine from its station: more
critter energy, little of yours, a usually fair result with a chance of great or a flop on
condition and bond. Same-day diminishing returns apply to both modes.

### M3 — Balance beam and runner

Two new patterns, playable on keyboard, gamepad and touch.

### M4 — Rhythm routine and chess or reading

INT gets its two drills.

### M5 — Exhibition schedule

Several exhibition events on the calendar, each chaining two or three drills on harder
settings and favouring different stats; entry fees and prizes.

## Decisions (routine, this campaign)

- New drill ids widen the saved per-day session record without a save version: v10 saves
  stay valid and nothing is migrated.
- The assist is a device preference passed to the host, not part of the save, like the
  rendering quality.

## Current handoff

M1 in progress.
