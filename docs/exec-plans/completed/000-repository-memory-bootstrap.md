# 000 — Repository memory bootstrap

**Date:** 2026-09-26. **Status:** completed. **Scope:** documentation only.
**Source baseline:** `e60c5b7` (`Record verified Pages release [skip ci]`), with
gameplay at `06aa91e`. No application, test, dependency, save, or workflow changes
are part of this conversion. Final validation is recorded below.

## Completed conversion

- Created thin `AGENTS.md` and `GEMINI.md` entrypoints into shared project knowledge.
- Captured accepted narrative, ownership, learning, families/chimeras, life-cycle,
  and competition direction without claiming it is implemented.
- Audited the current model, host, storage, presentation/input boundaries,
  authored content, tests, PWA scripts, and CI/Pages workflows.
- Established the roadmap, decision/open-question register, and active/completed
  plan structure. Prepared the first one-critter campaign; did not implement it.
- Replaced the previous instruction and rolling handoff files with compatibility
  pointers. Updated README navigation and prototype/design distinction.

## Where existing knowledge moved

| Previous material                                                        | Current owner                                                                                                       |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `INSTRUCTIONS.md` host, deterministic outcomes, individuality/save rules | [ARCHITECTURE.md](../../ARCHITECTURE.md)                                                                            |
| `INSTRUCTIONS.md` platform, accessibility, validation, checkpoints       | [DEVELOPMENT.md](../../DEVELOPMENT.md) and [plan conventions](../README.md)                                         |
| `ASTRA-HANDOFF.md` implementation/boundaries/limitations                 | [ARCHITECTURE.md](../../ARCHITECTURE.md)                                                                            |
| Handoff setup, browser configuration, PWA/Windows diagnostics            | [DEVELOPMENT.md](../../DEVELOPMENT.md)                                                                              |
| Handoff controls and local-save explanation                              | [README.md](../../../README.md)                                                                                     |
| Handoff previous verification/deployment results                         | Historical evidence below                                                                                           |
| Handoff next priorities and old slice exclusions                         | Superseded by [ROADMAP.md](../../ROADMAP.md) and [active campaign](../active/001-make-one-critter-worth-raising.md) |
| September design discussion                                              | [GAME-DESIGN.md](../../GAME-DESIGN.md) and [DECISIONS.md](../../DECISIONS.md)                                       |

Original documents remain available in Git history at `e60c5b7`; no duplicate
archive of the old, conflicting priorities is needed in the current reading path.

## Historical evidence carried forward

These are reports from the prior handoff, **not checks rerun by this bootstrap**:

- `06aa91e`: formatting and lint passed; 23 simulation/storage tests passed;
  `build:pages` produced manifest, service worker, and SPA fallback.
- The final Edge Playwright suite reported 23 passes and nine intentional skips
  across four viewport projects. The desktop full-day path covered care/feed,
  timing practice, planting/watering, three observed berry harvests, two cued
  harvests, autonomous foraging, sale, shed repair, crop harvest, Clover Cup,
  sleep, and day-two reload. Edge and Chromium full-day runs passed.
- The prior desktop visual inspection covered 1024×768, 1280×800, 1440×900, and
  1920×1080 without document/side-rail scrolling; responsive portrait/landscape
  views were also available. Do not treat these dimensions as freshly checked.
- Controller input was tested through a mocked standard Gamepad API in a real
  Edge browser. Physical controller testing remained outstanding.
- `check:pwa` reportedly passed for `/` and `/critterstead/`, including production
  offline reload and retained care. The published page was opened and a separate
  Chromium check retained care through an offline reload after initial caching.
- [Pages workflow run 35944702796](https://github.com/cboler/critterstead/actions/runs/35944702796)
  reportedly deployed `06aa91e` after quality gates and artifact upload. This is
  historical deployment evidence, not a claim about the current live site.
- Chromium harness fixes used precise read-only development state instead of
  rounded waypoints/visual timing, with real keyboard and button input. The full
  scenario was approximately 1.1 minutes; that accelerated test is not a pacing
  study. The cottage waypoint stays outside its collision footprint.

The continuing practical caveats (first service-worker cache completion, Windows
sandbox compilation access, Edge channel configuration, and one CI worker) are
retained in [DEVELOPMENT.md](../../DEVELOPMENT.md).

## Bootstrap verification

Fresh checks on 2026-09-26 in Linux with Node 24.19.0 / npm 11.9.0:

- Installed the locked dependencies with `npm ci --ignore-scripts --no-audit --no-fund`.
- Formatted only the changed Markdown files; `npm run format:check` passed.
- `npm run lint` passed.
- `npm test -- --watch=false`: two files, all 23 simulation/storage tests passed.
- Checked 85 local Markdown links/anchors across 13 documents; all resolved.
- Reviewed source-versus-design labels, decision/open-question consistency,
  ownership versus active group, Pip's legacy-save treatment, and milestone scope.
- `git diff --check` passed; all 13 changed/new files are Markdown. Application,
  tests, dependencies/lockfile, assets, and workflows are unchanged.

No fresh browser/physical-controller, production-build, offline, or live-deployment
check was performed for this documentation-only pass. Historical evidence above
is preserved with that distinction. No remote CI was triggered by this session because publishing was blocked.

## Decisions and remaining work

The two tool entrypoints share facts and procedures rather than copying the game
manual. `DEVELOPMENT.md` holds the common runbook so commands/platform rules do
not grow in both adapters. Current source limitations are separate from accepted
design. Open questions stay explicit; no numeric life spans, finalized machine
name, or complete party/housing progression was invented.

The first implementation session should execute M1 in the
[active campaign](../active/001-make-one-critter-worth-raising.md): minimal
individual/ownership preparation with protected legacy progress, while keeping
one playable companion. No gameplay milestone is complete. The active plan is
the durable continuation point; the old model-specific handoff is retired.

## Delivery status

The completed documentation is committed on local branch
`docs/repository-memory-bootstrap`. Publishing was blocked: the shell had no
GitHub push credentials, and the connected GitHub integration returned HTTP 403
(`Resource not accessible by integration`) for the tree write. No remote branch,
pull request, merge, or deployment was created by this session.

An apply-ready Git patch carries the documentation commit for an authorized
checkout. Apply it with `git am <patch-path>` from a clean checkout containing the
baseline, inspect the resulting commit, then publish through the normal repository
workflow. If the repository has changed, resolve any patch conflicts while
preserving newer work. The active gameplay plan is ready once this documentation
commit is present; no gameplay implementation should be inferred from delivery.
