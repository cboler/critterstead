# Critterstead — implementation handoff

## Current state

Repository created from `cboler/angular-pwa-starter`: https://github.com/cboler/critterstead. The integrated game now launches locally at `http://127.0.0.1:4200/`. Original procedural Three.js diorama, direct movement, Pip following/care, timing training, crops, glade gathering and learning, market, shed upgrade, race, clock, sleep and IndexedDB persistence are implemented. Full-day browser testing is underway; do not claim it complete yet.

Verified so far: all 23 domain/storage tests pass via `npm test -- --watch=false`; ESLint clean; production `npm run build:pages` succeeds (887 kB raw, about 205 kB transferred), service worker and manifest present, SPA fallback generated. Browser screenshot inspected at desktop and narrow layout; care interaction visibly raises bond and mood. Windows sandbox blocks Angular ancestor-directory reads; these commands have worked with normal elevated tool execution. Initial direct `vitest` call omitted Angular's globals setup for storage tests; use the npm test command above.

## Agreed architecture

- `src/app/game/model.ts`: shared pure TypeScript state and command contract.
- `src/app/game/content.ts`: authored areas and content.
- `src/app/game/host.ts`: local authoritative simulation, command validation, seeded outcomes, clock, learning.
- `src/app/game/storage.ts`: one versioned save behind a storage interface.
- `src/app/game/world.ts`: Three.js presentation only.
- Angular application: HUD, input routing, menus. Animation loop outside Angular.

First companion: Pip, a Brindlekin, an original small moss-tailed creature. Areas: homestead and berry glade. Aim: care, timing training, crops, learning through shared gathering, market, shed improvement, sleep and persistence. Racing only after those are coherent.

## Commands

`npm start`, `npm test -- --watch=false`, `npm run lint`, `npm run format`, `npm run format:check`, `npm run build:pages`, `npm run e2e`.

## Deployment

Repository created public as required for template Pages hosting. Pages configuration and first game deployment still pending. Preserve repository-independent base path, service worker and SPA fallback.

## Next actions

1. Validate full miniature-day loop and persistence with real browser input; finish E2E tests.
2. Polish action/learning feedback and protect autosave for autonomous changes.
3. Run all quality gates, commit checkpoints, push and verify Pages.
4. Update this document with actual validation and precise remaining limitations.

## Controls and current limitations

WASD/arrows move relative to the camera, click ground walks directly, E performs a nearby action, Space cues training, J journal, Escape pause/menu close, backtick developer kit. Touch arrows also available. Local menus/hidden tabs pause simulation. Save after commands and every eight active seconds. Simple movement has building collision and direct walking; no pathfinding around obstacles. One authored species/companion, one crop and six regenerating berry bushes. Working title has no trademark clearance. No remote account/sync. Stay in one game tab until simultaneous-tab ownership is addressed.

## Deliberately deferred

Backend, multiplayer, breeding mechanics, chimeras, guild/town management, combat, deep economy, final artwork, native packaging and broad content. No new framework is needed. Three.js is the only new runtime dependency.
