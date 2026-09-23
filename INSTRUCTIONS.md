# Critterstead development instructions

Critterstead is a browser-based critter-raising game, built with Angular and Three.js. Read `docs/ASTRA-HANDOFF.md` for current status before changing the game.

## Keep the slice focused

- The creature is a persistent individual, never an inventory item. Preserve stable entity IDs, learned behavior, care, and a coherent versioned save.
- Gameplay changes enter through commands into the local authoritative simulation. Angular and Three.js must not directly apply game rules.
- Keep important outcomes deterministic from state, commands, game time, and the central seeded random source.
- Use simple original geometry and artwork. Preserve Critterstead's own identity; do not imitate commercial-game characters or assets.
- Prefer platform features and existing dependencies. Avoid speculative frameworks, new abstractions, backend services, or network implementations.
- Improve the care → training → gathering → homestead loop before adding breadth. Breeding, town management, full tournaments, and multiplayer remain deferred.

## Preserve the platform

- Keep the service worker, manifest, installed-app icons, GitHub Actions workflow, and `scripts/prepare-pages.mjs` SPA fallback working.
- Keep deployment repository-independent. The workflow gets its base path from `actions/configure-pages`; never hard-code the repository path into assets or application logic.
- Preserve accessible focus indicators, reduced-motion support, safe-area insets, and touch targets of at least 44px. Check narrow and wide viewports for overflow.
- Serialize local saves and preserve an unreadable or newer save rather than silently overwriting it. A developer reset must be deliberate.

## Validate and hand off

Run the formatter before the check, then the applicable quality gates:

```sh
npm run format
npm run format:check
npm run lint
npm test -- --watch=false
npm run build:pages
npm run e2e
```

Start the app locally and inspect real browser rendering at desktop and narrow viewports for visual changes. Test the actual interaction loop and reload persistence, not only a successful build. Report separately what was checked locally, tested in a browser, and deployed.

Keep `README.md` and `docs/ASTRA-HANDOFF.md` accurate. Record known defects, intentionally simplified behavior, deferred systems, and exact next actions. Commit useful runnable checkpoints.
