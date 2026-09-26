# Execution plans

Plans are shared project memory, independent of the tool/model doing the work.
Read the relevant active plan, not every historical handoff.

## Index

| Plan                                                                                 | Status                             | Next action                                                                            |
| ------------------------------------------------------------------------------------ | ---------------------------------- | -------------------------------------------------------------------------------------- |
| [001 — Make One Critter Worth Raising](active/001-make-one-critter-worth-raising.md) | Ready; gameplay work not started   | On the next implementation request, execute M1 only unless broader scope is requested. |
| [000 — Repository memory bootstrap](completed/000-repository-memory-bootstrap.md)    | Completed documentation conversion | Historical audit and verification evidence; no further bootstrap work planned.         |

## Working contract

- A campaign states its purpose, non-goals, current baseline, milestones with
  observable acceptance criteria, validation, decisions, unresolved issues, and
  exact next action. Use smaller runnable sub-slices when a milestone is too large.
- At the start of a session, inspect Git status and recent commits, check the
  plan's recorded progress against the relevant code/evidence, and mark the
  selected milestone in progress. Do not redo completed work without cause.
- “Continue” means the first incomplete milestone of the relevant active plan,
  unless the request gives different scope. Complete its verification/repair and
  stop at its boundary; later milestones require scope authorization, not routine
  permission for implementation choices inside the current milestone.
- Before each stable commit and at session end, update completed work, evidence,
  decisions, known problems, and the next concrete action. Keep intermediate notes
  current while working so an unexpected cutoff leaves recoverable context.
- Do not assume the remaining usage allowance is visible or that a final handoff
  can run after a hard cutoff. Small commits and continuously updated plans provide
  recovery; an instruction to summarize at the limit is not a guarantee.
- If interrupted mid-slice, distinguish committed, uncommitted, verified, and
  unverified work. Preserve useful work and name any broken state or blocker.
  Never declare a milestone done solely because code was written or time expired.
- Record temporary implementation decisions in the plan. Promote lasting product
  decisions to `DECISIONS.md` and the relevant canonical doc. Link to authority
  instead of copying large specifications into every plan.
- Once a campaign is complete, move its plan from `active/` to `completed/`, update
  this index and affected links, and retain compact evidence. Do not create a
  second handoff file. Completed plans are historical, not current design authority.

Verification procedures are in [DEVELOPMENT.md](../DEVELOPMENT.md). The roadmap
sets sequencing, the design sets intent, the architecture describes reality, and
the active plan selects the present slice. If these conflict, reconcile explicitly
using the latest accepted decision and actual source; do not silently guess that
planned behavior has shipped.
