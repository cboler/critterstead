# 002 — Living diorama presentation

**Status:** complete (2026-09-30). Requested by the product owner: the game read as
"compact"; make the visuals impressive. Independent of Campaign 001 M9 and the save schema
(presentation only). Human visual review happens on the published page.

## Outcome and scope

Make the world the star: a full-screen diorama with a following camera, scenery beyond
the playable fence, time-of-day light and weather, visible life, and a toy-miniature
finish, keeping the design's identity ([visual direction](../../GAME-DESIGN.md#visual-direction-and-world-diorama)).
Non-goals: new areas, new mechanics, imported art assets, new npm dependencies (three.js
add-ons ship with the existing package).

## Milestones

- **V1 — Stage and camera** (`2c7b6dc`). Full-bleed canvas; frosted HUD panels; details
  panel with companion/rancher tabs that collapses to a chip (phones start collapsed);
  orthographic follow camera with damping, zoom 4.2–12 (wheel, pinch, keys, buttons) and
  HUD-aware framing via `setInsets`; quality tiers with a Help override.
- **V2 — World beyond the fence** (`9d39bab`). Seeded terrain with hills, an instanced
  forest of merged low-poly variants, hedges on unfenced edges, meadow grass, paths past
  the gates, an animated brook with a plank bridge on the yard–glade path, and seasonal
  palettes. Tall scenery is never placed where the fixed camera angle would let it hide
  playable ground.
- **V3 — Light and weather** (`3c811da`). Sun arc and moon, graded moods through the day,
  weather tints and exposure, GPU rain/snow/fireflies, night lanterns and window glow,
  warm indoor lighting at every hour, night-style HUD text.
- **V4 — Life and feel** (`eb94696`). World-space wind on grass and canopies, group sway
  for yard trees and crops, blinking/glancing/squashing Mallow, swinging rancher arms,
  footstep dust, contact shadows, a gold ring on the dock's target, butterflies.
- **V5 — Finish and performance.** Post-processing (tilt-shift band around the rancher,
  night-only bloom, display-space grade and vignette) on cinematic/balanced; figure-only
  glazed reflections; area fade and morning title card; Colosseum stands, banners and
  winter roofs; a light tier without sun shadows; docs.

## Evidence

- Unit 119/119, lint, formatting; production `/critterstead/` build (initial 1.05 MB,
  under the 1.1 MB warning; no component-style warning) and `check:pwa` pass.
- Browser suite on SwiftShader (light tier): 63 passed, 25 project-scoped skips, 0 failed
  (14.7 min); the gauge drill test also passed 4/4 repeated runs. The dock test now
  asserts the canvas fills the viewport and the dock never covers the rancher's projected
  position.
  SwiftShader first ran the larger world at 9.6 fps (desktop), too slow for the gauge
  drill's tap loop; dropping sun shadows on the light tier and low-poly flower buds raised
  it to 16 fps (phone profile 17 → 26).
- GPU screenshots (headless Chromium on the real GPU) inspected at 1440×900 DPR 1.75,
  1280×800, 390×844 DPR 3 and 844×390: every season, dawn/golden hour/sunset/night, rain,
  snow, cottage day/night, glade, Colosseum. Cinematic ran ~54–60 fps at 1280–1440 wide
  on the dev machine's integrated GPU; balanced on the phone profile ran 60 fps.

## Decisions and notes

- Tier detection uses the unmasked WebGL renderer: SwiftShader/llvmpipe → light, coarse
  pointer or small screen → balanced, otherwise cinematic. Cinematic caps pixel ratio at
  1.5 (the miniature blur hides the difference).
- App styles moved to global `src/hud.scss` (loaded after base styles) so the HUD theme is
  not limited by the per-component style budget.
- Root cause of an early pale veil: fog still started at 49 units after the camera moved
  to a 60-unit focus distance; fog now begins at 74. Bloom runs only after dusk, since
  daylight HDR values would wash out.
- Browser tests: the learning meter is matched without visibility (phones start with the
  details panel collapsed), and nook visits walk to a point west of the nook, since the old
  target sat within the walk tolerance of the feed trough and passed only by frame timing.
- Space/E and controller A are ignored for 0.7 s after a drill ends: slower frames exposed
  that a tap meant for the gauge could land after the finish and start a second paid lift
  (a real risk for players mashing too). Clicking a dock action is never delayed.
- Provisional: zoom limits, camera damping, wind strengths, mood colors, tilt-shift band,
  quality thresholds. No physical-device or human visual acceptance is claimed.

## Next action

None in this plan. Campaign 001 continues with M9.
