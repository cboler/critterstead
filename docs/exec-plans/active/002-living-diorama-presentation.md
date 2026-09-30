# 002 — Living diorama presentation

**Status:** in progress (V1). Requested 2026-09-30 by the product owner: the game reads as
"compact"; make the visuals impressive. Independent of Campaign 001 M9 and save schema.

## Outcome and scope

Make the world the star: a full-screen diorama with a following camera, scenery beyond
the playable fence, time-of-day light and weather, visible life, and a toy-miniature
finish. Keep the design's identity ([visual direction](../../GAME-DESIGN.md#visual-direction-and-world-diorama)):
original low-poly geometry, warm palette, orthographic 2.5D. Rendering stays
presentation-only: no simulation, save, or rule changes.

Non-goals: new areas, new mechanics, imported art assets, new npm dependencies (three.js
add-ons ship with the existing package).

## Milestones

- **V1 — Stage and camera.** Full-bleed canvas with HUD overlays on desktop and phones;
  follow camera with smoothing, zoom (wheel, pinch, keys, buttons) and HUD-aware framing;
  compact companion/rancher panel; layout tests updated to the new intent (the canvas
  never resizes; the dock never covers the rancher).
- **V2 — World beyond the fence.** Terrain continuing past the playable square, forest
  ring, hills, a brook with bridges on the yard–glade path, seasonal palettes.
- **V3 — Light and weather.** Sun path and moving shadows, time-of-day grading, night
  window/lantern glow and fireflies, rain and snow from the existing forecast.
- **V4 — Life and feel.** Wind sway, expressive critter and rancher animation, footstep
  dust, contact shadows, interaction highlight, ambient butterflies and petals.
- **V5 — Finish and performance.** Automatic quality tiers (software renderers and
  phones get lighter settings) with a player override; tilt-shift, bloom, vignette and
  soft reflections on capable devices; area fade and morning title card; docs.

## Validation

Unit tests, lint, formatting, production `/critterstead/` build and `check:pwa`; full
browser suite (headless runs on SwiftShader, so it must pick the light tier); visual
inspection at 1440×900, 1280×800, 390×844 and 844×390; 44 px targets and reduced motion.

## Decisions and notes

- Headless Chromium reports `SwiftShader`; the in-app browser reports a real GPU. Tier
  detection uses the unmasked WebGL renderer string.
- App styles move to a global stylesheet so the HUD theme is not limited by the
  per-component style budget (the component file already exceeded its warning).

## Next action

Implement V1.
