# Critterstead — implementation handoff

## Current state

Repository: https://github.com/cboler/critterstead, created from the Angular PWA starter without changing the starter. Main is 06aa91e, deployed on GitHub Pages. Gameplay polish, controller support, full-day validation, and Chromium test reliability are committed. The game launches locally at http://127.0.0.1:4200/ and publicly at https://cboler.github.io/critterstead/.

A complete first day is playable: meet and care for Pip, feed her, practice timing at the hoops, plant and water feed, walk together to Clover Glade, show her three sunberry harvests, cue two harvests, watch her independently forage, return to sell berries, mend the shed, harvest the garden, run the Clover Cup time trial, sleep, and reload into day two with the improvements intact. The desktop browser scenario exercises that sequence with real keyboard and button input. It passes in Edge and Chromium. The test uses real keyboard movement and button interactions; precise read-only development state shortens the Chromium scenario to about 1.1 minutes with phase-aware cue checks. The cottage waypoint stays outside its collision footprint.

The procedural Three.js world has interaction and learning sparkles, care hearts, a click destination ring, and movement during training and racing. Nearby actions show the first available action clearly and explain fully blocked actions. Menus trap keyboard focus. The desktop layout was visually checked and fits the world, companion, goals, and satchel without document or side-rail scrolling at 1024×768, 1280×800, 1440×900, and 1920×1080. Responsive portrait and landscape views remain available.

## Architecture to preserve

- src/app/game/model.ts defines the state and command contract.
- src/app/game/content.ts holds authored areas and content.
- src/app/game/host.ts owns the pure TypeScript local authoritative simulation, command validation, deterministic outcomes, time, collision, and learning.
- src/app/game/storage.ts owns one versioned IndexedDB save behind a storage interface. Web Locks permit only one active writing tab; invalid or newer saves remain intact until explicit reset.
- src/app/game/world.ts presents the world with Three.js; it does not own gameplay rules.
- Angular owns HUD, menus, and input routing. Gamepad polling and keyboard input dispatch into the same host commands. The animation loop runs outside Angular.

The host remains a seam for future authority elsewhere; no remote host exists.

## Controls and behavior

Keyboard: WASD/arrows move, E interacts, Space cues Pip during training and racing, J opens the journal, Escape pauses or closes a menu, and backtick opens developer save tools. Click or tap the ground to walk. Touch movement buttons appear on small screens. Standard gamepad: left stick moves, A interacts or cues, D-pad selects nearby actions or menu buttons, B closes, X opens help, Y opens journal, and Menu pauses. A connected controller changes on-screen hints. Controller input was verified with a mocked standard Gamepad API in a real Edge browser; physical hardware remains to be checked.

One in-game day lasts about thirty real minutes, while activities also advance time. Menus and hidden tabs pause the clock. Commands save immediately; autonomous journal/day changes also save, with periodic active-play saves. A second tab cannot overwrite the owner. A blocked second tab asks for a reload after the owner closes.

## Verification

- npm run format:check and npm run lint pass.
- npm test -- --watch=false passes 23 simulation/storage tests.
- npm run build:pages passes; manifest, Angular service worker, and SPA fallback are present.
- Playwright covers responsive smoke, desktop no-scroll layout, controller navigation, complete-day progress, reload, multi-tab ownership, and damaged/newer save protection. The final Edge browser suite passes: 23 tests passed and nine intentionally skipped across four viewport projects. The complete-day test runs on desktop; controller and no-scroll checks are desktop-specific, while responsive smoke and save tests cover smaller viewports.
- npm run check:pwa passed with base / and with the actual /critterstead/ Pages subpath. Both checks used a production build, active service worker, offline reload, rendered world, and retained Pip care.
- Browser visuals were inspected locally and the published Pages URL was opened in a browser. A separate Chromium check on the published URL rendered the world, cared for Pip, and retained that care through an offline reload after the first service-worker cache finished installing (about ten seconds on that run).

Windows sandboxed Angular compilation can fail with an ancestor-directory access denial; the same commands pass when run with the required elevated workspace access. For local Edge tests, set PLAYWRIGHT_CHANNEL=msedge. CI installs Chromium. The Playwright configuration uses 127.0.0.1; CI runs one worker to avoid contention.

## Deployment

GitHub Pages is live at https://cboler.github.io/critterstead/. Workflow run 35944702796 deployed commit 06aa91e after passing format, lint, 23 unit tests, 23 browser tests (nine intentional viewport skips), the production offline/persistence check, and artifact upload. The published page was opened in a browser; a separate Chromium check rendered the world, cared for Pip, then reloaded offline with that care retained.

On a first visit, stay online for a few seconds while the service worker fills its initial asset cache. Its control event can precede completion of that cache. Earlier failed deployment attempts exposed rounded-waypoint and visual-timing issues in the browser harness; the current tests use precise read-only development state for those observations while keeping real player input.

## Next priorities and limits

Play through with a physical controller, then tune Pip's animation/personality, interaction approach and navigation around solid buildings, feedback/audio, and pacing from fresh-player observation. The time trial is deliberately tiny; expand it only after the care, training, and gathering loop feels good. One Brindlekin companion, one crop, and six renewable berry bushes are authored. Movement has solid cottage/shed collision and direct walking, but no pathfinding around obstacles. The working title has no trademark clearance. Browser storage is local to the profile and has no cloud backup.

Do not add backend services, networking, town/guild systems, breeding/genetics, combat, or a broad economy during this slice. Keep changes integrated and playful, update this file with verified evidence, and make logical commits.
