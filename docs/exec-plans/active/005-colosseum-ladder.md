# 005 — The Colosseum ladder

**Status:** authorized 2026-10-05 ([D53](../../DECISIONS.md#d53--a-colosseum-ladder-of-athletic-cups-accepted-2026-10-05)).
M1–M3 complete ([M1](#m1-evidence--2026-10-05), [M3](#m3-evidence--2026-10-21)); M4 next.

## Purpose

Give raising a critter a goal you can climb: ranks, ranked cups against rival ranchers'
critters, and promotion cups between ranks. The lower ranks are athletic cups built on the
event engine from plan 004; the top ranks are reserved for turn-based bouts, a later
campaign ([D53](../../DECISIONS.md#d53--a-colosseum-ladder-of-athletic-cups-accepted-2026-10-05)).
A balancing simulator sets how quickly a critter can climb.

**Non-goals:** turn-based bouts and the Champion and Grand Champion ranks they open, rival
ranchers walking about the world (they appear by name on cards and boards), town shops,
breeding, injuries from competing.

**Baseline:** plan 004 complete at save v12 (`9f8ddfa`, live on Pages). Eight drills, each
with harder settings; the everyday athletic showing and five scheduled events, each a row
in `EXHIBITIONS` run as legs; points are timing (50) + favoured stats + care + a little
luck. No rival critters, no ranks.

## Ladder

| Rank           | How it is played                          | Campaign |
| :------------- | :---------------------------------------- | :------- |
| Fledgling      | Ranked cups and a promotion cup, athletic | 005      |
| Contender      | Ranked cups and a promotion cup, athletic | 005      |
| Veteran        | Ranked cups and a promotion cup, athletic | 005      |
| Champion       | Bouts                                     | Later    |
| Grand Champion | Bouts; Grandpa's old title                | Later    |

Provisional calendar: ranked cups on days 3, 7, 13, 17, 23 and 27 of each season, each of
two legs; promotion cups on days 15 and 29, of three legs, for critters with six ladder
points. Placing first, second or third earns 3, 2 or 1 ladder points; winning a promotion
cup promotes and starts the points again.

## Milestones

### M1 — Ranks, rivals and ranked cups (save v13)

- [x] Every critter has a ladder rank (from Fledgling) and ladder points; v1–v12 saves
      migrate at Fledgling with none.
- [x] A rival table: six named rivals' critters per athletic rank, each with a rancher, a
      family, stats and a usual form.
- [x] Ranked cups on their days at the booth: two legs on harder settings, chosen by the
      day, scored like events against the rank's field, for a placing, a prize and ladder
      points.
- [x] The booth, calendar, journal and companion panel show the rank, the points and each
      cup's placing and field.
- [x] Verification: unit tests (placings, points, prizes, schedule, migration, damaged
      saves), a browser test of a ranked cup, lint, build, PWA, inspected screenshots.

### M2 — Promotion cups

Built in [plan 006 M4](../completed/006-oakhaven-and-the-wider-map.md#m4-evidence--2026-10-16), at the
Colosseum's new promotion desk.

- [x] Six ladder points qualify a critter for its rank's promotion cup: three legs against
      the rank's strongest rivals. First place promotes, clears the points and pays a
      purse; any other placing keeps the qualification.
- [x] A promotion is an occasion: the crowd, a ceremony note, the rank in history and on
      the companion panel.
- [x] Winning the Veteran promotion cup makes a critter a Champion awaiting the bouts; no
      athletic cups are held for that rank.
- [x] Verification: unit tests, lint, build, inspected screenshots, and a browser test of a
      promotion (added in M3).

### M3 — Balancing simulator

- [x] A pure simulation of days of play: care, training within energy and same-day
      repeats, entering cups by the calendar, with the player's timing as a parameter.
- [x] A command prints, for a few kinds of player, the days to each promotion; tests
      guard the pacing targets (a diligent player reaches Contender within the first
      season and Veteran within about the second; a casual one takes about twice as long;
      nobody promotes without training).
- [x] Rival stats and form, cup weights and prizes tuned with it, the numbers recorded.

### M4 — Playtest balancing pass

Adjustments from the published game's playtest; empty if none are needed.

## Decisions (routine, this campaign)

## M1 evidence — 2026-10-05

- Host: `ladder.ts` (`RANKS`, `RIVALS`, `CUP`, `CUP_DAYS`, `cupLegs`, `legWeights`,
  `statPoints`, `rivalPoints`, `placingOf`, `ordinal`, `eventInfo`); the booth's cup entry,
  `enterExhibition` and `finishLeg` through `eventInfo`, and `finishCup`; the calendar's,
  notice board's, quests' and journal's cups; the companion panel's rank. Save v13 with
  the v12 → v13 migration and a frozen v12 fixture. Unit tests: 215 passed, including
  `ladder.spec.ts` (the booth and calendar on cup days, a Champion's missing cup, the legs'
  rotation, placings, purses and points for a strong and an idle critter, rivals' scoring,
  a cup across midnight and a save, the v12 migration, damaged ladders, results and cups)
  and the v1–v12 chain to v13.
- Browser: `e2e/training.spec.ts` runs a Fledgling Cup on Spring 3 for its fee and a placing
  of seven, read back in the journal (desktop and phone). Inspected:
  [a Fledgling Cup won](../evidence/005-m1/fledgling-cup.png),
  [on a phone](../evidence/005-m1/fledgling-cup-phone.png).
- Gates: lint, unit tests, production build, PWA check, and the browser suite (78 passed,
  46 skipped by project). The bundle is 72.7 kB over its budget warning (66.7 kB before).
- Found while testing: the v9 → v10 step added Pip from today's `createPip`, which now
  carries a ladder; it now adds him in v10's shape. The cup and the Clever Paws Cup shared a
  calendar kind; cups have their own.
- Routine decisions: rank names Fledgling, Contender, Veteran, Champion and Grand Champion;
  cups don't share days with events; a cup's legs favour each leg's drill stat equally;
  rivals' scores are drawn as the cup ends, with the companion's own luck; a cup pays
  purse and points only to the top three. Provisional: the rival table, fees 5/8/12,
  purses 24/14/8, 40/24/14 and 64/38/22, 40 energy and 70 minutes. With perfect timing a
  new companion already wins a Fledgling Cup; M3 balances.

## M3 evidence — 2026-10-21

- Host: `balance.ts` (`PLAYERS`, `simulate`, `pace`), `scripts/balance.ts` and
  `npm run balance`; the drill gain (`drillGain`, `applyGain`) and an event's points
  (`showingPoints`) now shared by the host, the rivals and the simulator. Players:
  _diligent_ (timing 0.85, care 0.85, drills together, rests at the barn), _casual_ (0.65,
  0.7, trains until the critter is tired, no rests), _routines_ (menu routines only) and
  _idle_ (never trains, plays every cup perfectly). A drill costs its minutes plus 30 for
  walking and play; a cup day 60 more for the walk to the Colosseum.
- Before tuning, every training player promoted on the first possible days (15, 29, 45)
  and an idle critter with perfect timing reached Contender: training adds about 10 stat
  points a day for a diligent player and 4.7 for a casual one, and the old rivals' stats
  (3–18) were passed within days.
- Tuned: each rank's authored rival stats ×9, ×13 and ×17 (Fledgling rivals total about
  170, Contender 440, Veteran 1,150); form, cup weights (5 per cup, split by leg), fees and
  purses unchanged. `npm run balance` (two years, nine families, eight seeds each):

  | Player   | Contender | Veteran | Champion | Stats total | Ladder coins |
  | :------- | :-------- | :------ | :------- | :---------- | :----------- |
  | diligent | day 29    | day 59  | day 105  | 3,377       | 358          |
  | casual   | day 59    | day 119 | day 209  | 1,197       | 246          |
  | routines | day 89    | day 209 | —        | 585         | −54          |
  | idle     | —         | —       | —        | 18          | −240         |

  Every family and seed reaches each rank on the same promotion day: by the time a cup is
  close, the stat gap decides it, and promotion days fall twice a season.

- Fixed: a promotion cup's result card was headed "WELL DONE"; it now names the cup.
- Browser: `e2e/training.spec.ts` wins a Fledgling Promotion Cup on Spring 15 (hurdles, lift,
  chess), reads Contender on the companion panel and the 1st of 5 in the journal (desktop
  and phone); `holdGauge` now stops when an event moves on from a gauge leg. Inspected:
  [the promotion won](../evidence/005-m3/promotion-cup.png),
  [on a phone](../evidence/005-m3/promotion-cup-phone.png).
- Gates: lint, unit tests (197 passed, including `balance.spec.ts`), production build, PWA
  check, browser suite (117 passed and 48 skipped by project; three phone timeouts in a slow 1.6 h run, unrelated to the ladder, passed on rerun). Formatting differences remain only in files this
  milestone did not touch; the bundle budget warning is not from this change (the
  simulator is not in the app bundle).
- Open for the product owner: stats grow without limit, so rivals reach the hundreds by
  Contender and a diligent critter totals about 1,300 after a year. Slowing training or
  a soft stat ceiling would keep numbers small; the simulator retunes rivals for either.

## Current handoff

M1–M3 complete (M2 in plan 006). Next: M4 — adjust from the published game's playtest
(empty if none needed); rerun `npm run balance` after any change to drills, cups or
rivals.
