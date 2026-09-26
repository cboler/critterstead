# Playable development roadmap

This is staged direction, not a flat authorized backlog. The relevant execution
plan defines the bounded work requested in a session. Later stages should be
refined when evidence makes them useful, rather than predesigned in detail now.

| Stage                                   | Playable outcome                                                                                                                      | Exit evidence                                                                                                                       |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 0 — Repository memory                   | Shared design, honest implementation map, short tool entrypoints, recoverable plans                                                   | [Completed bootstrap record](exec-plans/completed/000-repository-memory-bootstrap.md)                                               |
| 1 — Make one critter worth raising      | A player can make understandable care/work/training/recovery choices, see useful learning, and want another day                       | Save-safe architecture preparation; several days of coherent play; observed choices, friction, and motivation recorded and reviewed |
| 2 — Establish the household and opening | Grandpa/Pip demonstration, walk to town, individual starter encounters, exactly one chosen starter, return/sleep/first guided morning | Complete opening flows into the proven daily game; NPC ownership and existing saves stay coherent                                   |
| 3 — Earn wider responsibility           | Housing/visible upgrades, a three-critter active group, richer farming/jobs and recurring Colosseum events                            | Added companions change planning without multiplying chores into tedium; non-player companions remain distinct from ownership       |
| 4 — Develop lineages                    | Natural breeding plus expensive ordinary gene-combination services; authored family-pair morphology and stable lineages               | Meaningful inheritance, fertility rules, individual histories, and useful work niches; no random-parts art shortcut                 |
| 5 — Carry the stead forward             | Playable childhood progression, timeskips, unavoidable loss, inheritance, and Pip's continuing presence and teaching                  | Emotional arc grows from established routines; calendar, longevity, and save continuity support years of play                       |

This sequence puts implementation of the full story after evidence for the daily
loop, while preserving the narrative constraints now. Stages 3–5 may overlap or be
reordered by explicit product decisions; their internals are not current scope.
Pip's advanced lineage is a narrative fact without requiring the whole breeding
simulator to ship before Pip can appear in the opening.

## Current campaign

[001 — Make One Critter Worth Raising](exec-plans/active/001-make-one-critter-worth-raising.md)
is prepared, **not implemented**. The bootstrap did not expand gameplay.

The campaign begins with bounded identity/ownership and learned-behavior changes,
each preserving the current playable loop. Then it tests meaningful recovery and
daily choices, one additional useful learned job, and repeated-day goals through
the existing small competition and homestead. No full prologue, town buildout,
breeding engine, mortality system, or broad economy is required for this evidence.

Do not confuse a full-day browser test passing with a player wanting to play for
several days. Agent inspection can find friction and verify alternatives; fresh
human playtest feedback is the product gate before major story investment.

## Cross-cutting work

Preserve PWA/offline operation, save safety, original visual identity, accessible
inputs, and repository-independent deployment at every stage. Physical controller
testing remains an explicit gap. Navigation around buildings, personality/animation,
feedback/audio, localization, and color-blind support should be addressed when
relevant to the active playable outcome; their mention is not permission for a
parallel polish campaign. No backend, account service, or multiplayer work is
scheduled here.
