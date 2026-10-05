# 004 — Training and exhibitions

**Status:** completed 2026-10-04. Authorized 2026-10-03
([D47](../../DECISIONS.md#d47--raise-critters-for-the-colosseum-accepted-2026-10-03)); evidence for
[M1](#m1-evidence--2026-10-03), [M2](#m2-evidence--2026-10-03), [M3](#m3-evidence--2026-10-03),
[M4](#m4-evidence--2026-10-04) and [M5](#m5-evidence--2026-10-04).

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

| Stat | Drill           | Pattern                                                                 | Status   |
| :--- | :-------------- | :---------------------------------------------------------------------- | :------- |
| STR  | Boulder lift    | Hold in band: tap against gravity                                       | Existing |
| STR  | Log toss        | Charge and release: stop the power at its peak                          | M1       |
| END  | Distance pacing | Pace with a breath reserve                                              | Existing |
| END  | Balance beam    | Track a drifting zone: steer left and right                             | M3       |
| SPD  | Hoops           | Timing sweep: press in the green                                        | Existing |
| SPD  | Hurdle run      | Endless runner, 24 s, jump and double jump                              | M3       |
| INT  | Rhythm steps    | Notes in three lanes                                                    | M4       |
| INT  | Chess puzzles   | The critter plays; you cheer at the right moments and shoo distractions | M4       |

Later pool, for drills or exhibition events: glide (gaps in a moving band), quick draw,
berry catch, shell game, sequence memory, tug of war, stacking.

## Milestones

### M1 — Drill table, log toss, timing assist, solid town and Colosseum

- [x] Drills come from one host table (stat, side stat, energy, minutes, gain weights);
      hoops, lift and pacing move onto it with unchanged results.
- [x] Log toss in the glade: hold to charge, release at the peak (or tap, tap); the sweet
      spot widens with strength. Builds STR, a little SPD.
- [x] A "wider timing windows" assist widens every drill's green zone, stored on the device
      like the quality setting.
- [x] Oakhaven's buildings, well, carts, bin and notice board and the Colosseum's wall,
      stands, booth and pull stone block walking; the Colosseum keeps an open entrance on
      the path from the gate.
- [x] Verification: unit tests (log toss scoring and input, assist, blockers; the existing
      drill tests unchanged), browser test for the log toss, lint, build, PWA, inspected
      screenshots.

### M2 — Routines (save v11)

- [x] Every drill played together at least once can be run as a routine from its station:
      10 more critter energy, none of yours, a usually fair result with a chance of great
      or a flop on condition and bond. Same-day diminishing returns apply to both modes.
- [x] The critter is seen running the drill alone for a few seconds; nothing to press.
- [x] Save v11 remembers practice per critter; v1–v10 saves migrate with what they had
      already played together; damaged practice or routines fail validation untouched.
- [x] Verification: unit tests, the browser log toss test running the routine, lint,
      build, PWA, inspected screenshots.

### M3 — Balance beam and hurdle run

- [x] Balance beam in the glade: lean left and right to keep the critter in a zone that
      drifts from a per-session seed; outside it the critter wobbles and slows. Endurance
      widens the zone. Builds END, a little STR.
- [x] Hurdle run in the glade: a 24-second course of stumps (one jump) and hedges (a
      double jump), laid out from a per-session seed. Speed jumps a little higher. Builds
      SPD, a little END.
- [x] Both play on keyboard (A/D or arrows; Space, W or ↑), gamepad (d-pad or stick; A)
      and touch (held lean buttons; the jump button on press), run as routines, and save
      and resume mid-drill.
- [x] Verification: unit tests (scoring, steering, double jump, course layout, saves,
      routine), browser tests (both drills on desktop and phone, controller), lint, build,
      PWA, inspected screenshots.

### M4 — Rhythm steps and chess puzzles

- [x] Rhythm steps in the cottage: sixteen notes from a per-session seed slide down three
      lanes to the gramophone's tune; step each lane as its note reaches the line (perfect
      or good). Intelligence widens the good window; stray steps spend composure. Builds
      INT, a little SPD.
- [x] Chess puzzles at a cottage table: the critter works a puzzle from Grandpa's book;
      cheer when it sees a move and shoo the moths that drift in. Wrong-time cheers and
      shoos break focus; intelligence holds an idea longer. Builds INT, a little END.
- [x] Both need the companion indoors, play on keyboard (A/S/D, arrows or J/K/L; Space and
      S), gamepad (d-pad or X/A/B; A and B) and touch (lane buttons; Cheer and Shoo), run as
      routines, and save and resume mid-drill.
- [x] Verification: unit tests, browser tests (both drills on desktop and phone,
      controller), lint, build, PWA, inspected screenshots.

### M5 — Exhibition schedule (save v12)

- [x] Events come from one table: legs, stat weights, energy, minutes, entry fee, medal
      thresholds, prizes and days of the season. Beside the everyday athletic showing:
      the Hedgerow Dash (run, sprint; SPD) on days 4, 14 and 24; the Strongpaw Trials (toss,
      stone; STR) on 6, 16 and 26; the Clever Paws Cup (chess, rhythm; INT) on 8, 18 and
      28; the Meadow Marathon (pacing, beam; END) on 10 and 20; and the Grand Exhibition
      (toss, run, chess; every stat) on 30.
- [x] Each leg is its drill on harder settings (narrower windows, the heavy stone, faster
      breath); legs pay medals and coins, not drill sessions. Entry fees are paid at the
      booth; one entry per event per day.
- [x] The calendar, the booth, Oakhaven's notice board and the day's quests show the
      events; the journal remembers each by name.
- [x] Save v12 plays the athletic showing as two legs; a v11 exhibition in progress carries
      on as its sprint or stone pull. Damaged event state fails validation untouched.
- [x] Verification: unit tests, browser tests (the athletic showing and the Hedgerow Dash
      on desktop and phone), lint, build, PWA, inspected screenshots.

## Decisions (routine, this campaign)

- New drill ids widen the saved per-day session record without a save version: v10 saves
  stay valid and nothing is migrated.
- The assist is a device preference passed to the host, not part of the save, like the
  rendering quality.

## M1 evidence — 2026-10-03

- Host: the `DRILLS` table and `finishDrill`; the log toss in `drills.ts` (`tossPower`,
  `tossBand`, `throwLog`) with `training-release`; area `blockers` and glancing movement.
  Unit tests: 167 passed. The 158 earlier tests pass unchanged, so hoops, lift and pacing
  still pay as before; `toss.spec.ts` covers scoring, hold and tap input, time-out,
  mid-throw saves and the assist; `walking.spec.ts` covers the arena wall, stands and
  entrance, Oakhaven's buildings and well, and walking out of scenery from an older save.
- Browser: `e2e/training.spec.ts` throws three logs on desktop and phone (button taps, a
  held Space, then in-page timing); the exhibition test still walks through Oakhaven and in
  at the new entrance. Inspected with the GPU:
  [Colosseum entrance](../evidence/004-m1/colosseum-entrance.png),
  [charging a throw](../evidence/004-m1/log-toss-charging.png).
- Gates: lint, production build, PWA check, and the browser suite (68 passed, 32 skipped by
  project). The suite caught a glade test spot that now sits by the log toss; moved.
- Found while testing: a new charge kept the previous throw's power for a frame, and
  walking straight at the well stopped instead of sliding round it. Both fixed.
- Routine decisions: the log toss sits in the glade (the yard is full), replacing a
  decorative stone, and throws west along pegs at 5, 8 and 11 m; the steward's booth
  moved just inside the entrance. Provisional: toss timing (1.2 s rise, peak 0.82), sweet
  spot widths, throw distances, the assist's 40% widening.

## M2 evidence — 2026-10-03

- Host: `routineAction`, `routineScore` and the `routine` activity; `finishDrill` pays it
  from the drawn score with half the bond. Save v11 with the v10 → v11 migration and a
  frozen v10 fixture (Pip written out as data). Unit tests: 175 passed, including
  `routines.spec.ts` (locking, cost, no input, mid-routine saves, payouts below a good
  session together, outcome odds by condition, the v10 migration, damaged saves) and the
  v1–v10 chain to v11.
- Browser: the log toss test runs the toss as a routine after playing it. Inspected with
  the GPU: [the station dock](../evidence/004-m2/dock-two-actions.png),
  [a lift routine](../evidence/004-m2/routine-lift.png).
- Gates: lint, production build, PWA check, and the browser suite (67 passed, 32 skipped by
  project; the one failure, the exhibition on a phone, walked to a spot just out of the
  moved booth's reach. It now walks into the entrance gap and passed four reruns).
- Routine decisions: routines cost no player energy but still take the drill's game time;
  a routine bonds +1 against +2 together; its result is drawn when it starts, so a save
  mid-routine resumes the same outcome. Provisional: +10 energy, 3 seconds, scores
  0.2/0.5/0.8, odds 5–20% flop and 10–25% great.
- Test note: neighbouring small seeds give nearly the same first random draw, so the odds
  test spreads its seeds; real saves start from large seeds.

## M3 evidence — 2026-10-03

- Host: `beamZone`, `beamBand`, `stepBeam`, `beamScore`; `runCourse`, `jump`, `stepRun`,
  `runScore` in `drills.ts`; the `training-steer` command; both drills on the drill table
  and as glade stations. No save version: v11 saves accept the new kinds and fields, and a
  run may hold one result per hurdle. Unit tests: 186 passed, including `agility.spec.ts`
  (beam scoring, steering only on the beam, wobble and time-out, seeded drift, endurance
  and assist widths, mid-crossing save; course layout, a bot clearing every hurdle,
  single jumps missing every hedge, two jumps at most, mid-run save, the run routine).
- Browser: `e2e/training.spec.ts` leans with the held button and A, crosses the beam,
  jumps by button and Space, and runs a course (desktop and phone; the in-page bot
  cleared 11 of 11 and 12 of 12); `e2e/controller.spec.ts` leans with the d-pad and stick
  and double jumps with A. Inspected: [the beam](../evidence/004-m3/balance-beam.png),
  [the hurdle run on a phone](../evidence/004-m3/hurdle-run-phone.png).
- Gates: lint, unit tests, production build, PWA check, and the browser suite (71 passed,
  37 skipped by project). The build's initial-bundle budget warning predates M3 (35.6 kB
  over before, 46.6 kB now).
- Found while testing: the first test bot spent its double jump on a stump just before a
  hedge, which showed a stump-then-hedge gap of 1.3 s was tight for people too; hedges now
  get a 1.6 s run-up. The first beam spot sat behind two camera-side trees.
- After push: the Pages run failed the desktop hurdle test. On CI's software rendering the
  first jump landed before the test's next press, so both double-jump checks now press
  twice inside the page within a few frames; they pass locally with the CPU throttled 6×.
- Routine decisions: the drill is called the hurdle run; both stations are in the glade,
  the beam in its open middle and the lane south-west. Two south-edge trees moved further
  south so they no longer hide the lane, and a decorative stone made way for the beam.
  The runner's side view lives in the drill card; the world shows the critter shuttling
  along the lane with the coming hurdles laid out where it will meet them. Provisional:
  10 s crossing (20 s limit), lean 0.6/s, zone half-width 0.08–0.16, 24 s course, jump
  2.1 against gravity 5.2 (+12% at most from speed), stumps 0.2 and hedges 0.6 high,
  35% hedges after the second hurdle, 30 energy and 35 minutes for the run.

## M4 evidence — 2026-10-04

- Host: `rhythmSong`, `rhythmWindow`, `stepToNote`, `stepRhythm`, `rhythmScore`;
  `chessMoments`, `momentWindow`, `activeMoment`, `answerMoment`, `stepChess`,
  `chessScore`; `training-hit` with a `lane`, and `training-shoo`. Both drills are on the
  drill table and stand in the cottage, needing the companion indoors. No save version.
  Unit tests: 194 passed, including `thinking.spec.ts` (perfect, late and idle dancing;
  mashing paying less; skipped notes; song layout and windows; companion away; mid-song
  save; right, wrong and idle sittings; stray cheers; sitting layout and windows;
  mid-sitting save; the chess routine).
- Browser: `e2e/training.spec.ts` walks into the cottage, makes a stray lane tap, dances
  the song and sits a puzzle (desktop and phone); `e2e/controller.spec.ts` steps a lane
  with the d-pad and shoos and cheers with B and A. Inspected:
  [chess puzzles](../evidence/004-m4/chess-puzzles.png),
  [rhythm steps on a phone](../evidence/004-m4/rhythm-steps-phone.png).
- Gates: lint, unit tests, production build, PWA check, and the browser suite (73 passed,
  42 skipped by project, one failure in the new phone test, fixed and rerun: its stray tap
  landed in the drill's first 0.08 s, which ignores input; the drill specs then passed on
  every viewport). The new timing tests also pass with the CPU throttled 6×. The bundle is
  60.5 kB over its budget warning (46.6 kB after M3).
- Found while testing: the idea's glow sat inside the critter's body from the camera, so it
  now floats at the critter's right at head height.
- Routine decisions: chess rather than reading, as a puzzle from Grandpa's book with moths
  for distractions; both INT drills in the cottage (a gramophone by the rug and a chess
  table by the window, which blocks walking); "Rhythm steps" avoids clashing with the
  routine mode's name. Space, E and Enter take the middle lane and cheer. Provisional:
  100 beats a minute, sixteen notes, perfect ±0.07 s, good ±0.14–0.20 s, stray steps −0.08
  composure; ideas wait 1.0–1.4 s and moths 1.4 s, stray cheers −0.15 and shoos −0.1
  focus; score × (0.7 + 0.3 composure); 20 and 15 energy, 30 and 40 minutes.

## M5 evidence — 2026-10-04

- Host: `EXHIBITIONS`, `scheduledExhibition` and `legKind` in `content.ts`; `nextExhibition`
  and the calendar's event entries; `enterExhibition`, `finishLeg`, `finishExhibition`,
  `beginDrill` and `drillScore` in the host; `hard` settings in `drills.ts`. Save v12 with
  the v11 → v12 migration and a frozen v11 fixture (a silver behind, a stone pull under
  way). Unit tests: 207 passed, including `events.spec.ts` (the schedule and posters; the
  booth's actions, fee and refusals; each scheduled event played leg by leg to a medal;
  stat weighting; narrower windows; a mid-event save and damaged event state; the v11
  migration of a pull and of a sprint) and the v1–v11 chain to v12.
- Browser: `e2e/training.spec.ts` still earns the athletic medal through Oakhaven, and runs
  the Hedgerow Dash on Spring 4 for its fee (desktop and phone). Inspected:
  [the calendar's events](../evidence/004-m5/calendar-events.png),
  [a Hedgerow Dash silver on a phone](../evidence/004-m5/hedgerow-result-phone.png).
- Gates: lint, unit tests, production build, PWA check, and the browser suite. Its first
  run failed 34 tests that still expected save v11; with those updated, the persistence
  and opening specs passed on every viewport, and the rest of the suite had passed. The
  bundle is 66.7 kB over its budget warning (60.5 kB after M4).
- Found while testing: the run helper waited for the activity to end, which in an event
  is the next leg, so it now stops when its leg does; a calendar tint was lost to a
  malformed stylesheet edit and restored.
- Routine decisions: a save version, not a widening, because the exhibition's activity
  changed shape; the everyday athletic showing stays free and keeps its id, so earlier
  medals read the same; legs pay medals, coins, bond and a point of each leg's skill, not
  drill sessions; drills whose heading reports their state keep it during an event. In
  the arena every leg is drawn on the sand. Provisional: the days, fees (6, or 10 for the
  finale), prizes (40/22/10, or 70/38/16), thresholds (84/64, or 86/66), energy 35–60,
  minutes 70–100, windows at 80% and breath 1.3× faster on harder settings.

## Current handoff

Plan 004 is complete. The next campaign, the Colosseum ladder (ranks, promotion cups and a
balancing simulator), needs authorizing; plan 003's M4–M5 still wait on their story beats.
