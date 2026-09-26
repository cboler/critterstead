# Codex repository entrypoint

Critterstead is an Angular/Three.js critter-raising game. This file is a navigation
map; project facts and working procedures are shared with other tools under `docs/`.

## Read for the task

| Task                                         | Relevant authority                                                               |
| -------------------------------------------- | -------------------------------------------------------------------------------- |
| Setup, controls, quick overview              | [README.md](README.md)                                                           |
| Gameplay or narrative intent                 | [GAME-DESIGN.md](docs/GAME-DESIGN.md)                                            |
| State, simulation, saves, rendering          | [ARCHITECTURE.md](docs/ARCHITECTURE.md)                                          |
| Commands, verification, platform constraints | [DEVELOPMENT.md](docs/DEVELOPMENT.md)                                            |
| Scope and sequencing                         | [ROADMAP.md](docs/ROADMAP.md)                                                    |
| Why a decision was made; open questions      | [DECISIONS.md](docs/DECISIONS.md)                                                |
| Substantial work or resumption               | [Execution-plan index](docs/exec-plans/README.md), then the relevant active plan |

Load the relevant sections progressively. Do not read the entire design, completed
plans, or historical chat for a small unrelated edit. `INSTRUCTIONS.md` and
`docs/ASTRA-HANDOFF.md` are retired pointers, not additional instruction layers.

## Preserve

- The host owns game rules; Angular and Three.js present state and route commands.
- Keep persistent individual identities and deterministic outcomes. Protect saves
  on validation or migration failure; never silently reset progress.
- Preserve the PWA, portable Pages base path, accessibility, and existing inputs.
- Keep this project's own identity and avoid speculative dependencies or services.

For a milestone, finish its acceptance criteria and relevant verification, repair
regressions, then commit a stable slice and update its plan with evidence and the
exact next action. Follow the plan's scope; later milestones are not automatically
authorized. Record routine decisions there; raise choices that materially change
product direction. Keep product facts model-neutral and update their owning doc
instead of growing this entrypoint.
