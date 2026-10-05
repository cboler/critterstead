# 005 — The Colosseum ladder

**Status:** authorized 2026-10-05 ([D53](../../DECISIONS.md#d53--a-colosseum-ladder-of-athletic-cups-accepted-2026-10-05)).
M1 next.

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

- [ ] Every critter has a ladder rank (from Fledgling) and ladder points; v1–v12 saves
      migrate at Fledgling with none.
- [ ] A rival table: six named rivals' critters per athletic rank, each with a rancher, a
      family, stats and a usual form.
- [ ] Ranked cups on their days at the booth: two legs on harder settings, chosen by the
      day, scored like events against the rank's field, for a placing, a prize and ladder
      points.
- [ ] The booth, calendar, journal and companion panel show the rank, the points and each
      cup's placing and field.
- [ ] Verification: unit tests (placings, points, prizes, schedule, migration, damaged
      saves), a browser test of a ranked cup, lint, build, PWA, inspected screenshots.

### M2 — Promotion cups

- [ ] Six ladder points qualify a critter for its rank's promotion cup: three legs against
      the rank's strongest rivals. First place promotes, clears the points and pays a
      purse; any other placing keeps the qualification.
- [ ] A promotion is an occasion: the crowd, a ceremony note, the rank in history and on
      the companion panel.
- [ ] Winning the Veteran promotion cup makes a critter a Champion awaiting the bouts; no
      athletic cups are held for that rank.
- [ ] Verification: unit tests, a browser test of a promotion, lint, build, PWA,
      inspected screenshots.

### M3 — Balancing simulator

- [ ] A pure simulation of days of play: care, training within energy and same-day
      repeats, entering cups by the calendar, with the player's timing as a parameter.
- [ ] A command prints, for a few kinds of player, the days to each promotion; tests
      guard the pacing targets (a diligent player reaches Contender within the first
      season and Veteran within about the second; a casual one takes about twice as long;
      nobody promotes without training).
- [ ] Rival stats and form, cup weights and prizes tuned with it, the numbers recorded.

### M4 — Playtest balancing pass

Adjustments from the published game's playtest; empty if none are needed.

## Decisions (routine, this campaign)

## Current handoff

Plan written. Next: M1 — ranks, rivals and ranked cups (save v13).
