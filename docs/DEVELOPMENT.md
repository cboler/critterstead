# Development and verification

Shared procedures for people and agents. Product intent lives in
[GAME-DESIGN.md](GAME-DESIGN.md); engineering invariants and current limitations
live in [ARCHITECTURE.md](ARCHITECTURE.md). Read those when the task touches them.

## Local setup

Use Node.js 24 and npm. The lockfile is committed; use `npm ci`.

```sh
npm ci
npm start
```

The development app opens at `http://localhost:4200/`. The Playwright configuration
starts its own server at `http://127.0.0.1:4200/`. Default browser is Chromium;
install it with `npx playwright install chromium` (CI also installs OS dependencies).
For an installed Edge browser, set `PLAYWRIGHT_CHANNEL=msedge` in the environment.
CI uses one worker to avoid contention. See [playwright.config.ts](../playwright.config.ts).

## Work and verification

Start with repository status and the relevant active plan. Preserve unrelated
changes. Work through the authorized slice, including inspection and repair.
Commit stable, runnable sub-slices and keep the plan current as work proceeds.
Use the [execution-plan conventions](exec-plans/README.md) for durable handoffs;
do not maintain a second rolling handoff in chat or an agent-specific document.

| Change                                     | Required evidence                                                                                                                                                                                  |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Documentation only                         | Check linked paths, statements against source, implemented/planned labels, scope, and consistency; format changed docs; run formatting check and `git diff --check`. No new gameplay tests needed. |
| Simulation or persistence                  | Relevant invariant/migration tests, lint, production build, and affected browser flows including reload.                                                                                           |
| UI, interaction, or rendering              | Run the app, inspect actual narrow and desktop rendering and inputs; run affected Playwright scenarios. Compilation alone is insufficient.                                                         |
| Service worker, build, routing, or release | Production build, SPA fallback, manifest/icons, offline persistence check, and relevant subpath verification.                                                                                      |

Standard quality gates available in this repository:

```sh
npm run format:check
npm run lint
npm test -- --watch=false
npm run build:pages
npm run e2e
npm run check:pwa
```

Run the formatter before the formatting check. `npm run format` formats the whole
repository; for a scoped change prefer `npx prettier --write <changed-files>` so
unrelated files are not churned. CI runs formatting, lint, unit tests, production
build, browser tests, and the production PWA check. Do not weaken checks to hide a
regression. Document pre-existing failures or missing tooling separately from
failures introduced by the change.

Verification reports must distinguish source inspection, local commands, browser
inspection, physical-device checks, and deployment evidence. Record commands,
outcomes, date, and relevant commit/environment in the active plan. Historical
test counts are evidence from that run, not a permanent expected total. Tests can
prove behavior and save safety; they cannot certify that the daily loop is fun.

### Verification workflow and remote CI

Implementation sessions must not spend active reasoning time polling or waiting
for GitHub Actions after equivalent local verification checks have already passed.
The intended delivery workflow is:

1. **Verify locally first**: Run the relevant quality gates for the scope of the change
   (e.g., formatting, lint, unit tests, production build, browser/E2E, and offline checks).
2. **Commit and push**: Once local checks pass, commit the stable slice and push to `main`
   (or the active branch).
3. **Report status immediately**: State the pushed commit SHA, the specific local checks
   performed, any environment limitations, and list remote CI/Pages status as pending if
   it has not completed.
4. **Do not poll**: Stop the session rather than idling or polling GitHub Actions unless
   the task explicitly requires deployment verification or CI troubleshooting.

Remote CI remains vital independent verification and catches platform differences, but
there is a clear distinction between:

- **Local verification complete**: the code satisfies quality gates in the working environment.
- **Remote CI/release verification complete**: the remote pipeline has finished building and deploying.

### Human testing: fresh-start vs. migration instructions

When a milestone requires evaluating new-game or fresh-start behavior, human test
instructions must explicitly explain how to create a clean save and distinguish fresh-start
testing from migration testing:

- **IndexedDB persistence**: A browser hard refresh (such as `Shift+F5`) does **not** create
  a fresh homestead save because save state is stored in IndexedDB.
- **Developer reset**: Open the developer field kit using the backtick key (`` ` ``), select
  **Reset saved game**, and confirm. The homestead will cleanly reinitialize with the
  provisional starter (Mallow in current builds).
- **Migration testing**: Evaluates how an existing legacy save (such as a v1 homestead with
  Pip) loads and behaves without being overwritten.

## Presentation and platform constraints

- Use original geometry, artwork, and character identity. Commercial games may
  inform design goals, not supply copied characters or assets.
- Preserve accessible focus indicators and menu focus handling, reduced-motion
  support, safe-area insets, and touch targets of at least 44px. Check horizontal
  overflow on narrow screens and usable layout on desktop.
- Keep ordinary proximity interaction UI compact and low-profile (e.g. a bottom
  interaction dock). It must not substantially obscure the player, companion,
  navigation path, or surrounding explorable area. Dedicated activity UIs (such as
  training) may occupy more space since the activity is the focal task.
- Keep keyboard, pointer/touch, and controller inputs functional. Mocked Gamepad
  API tests do not constitute physical controller verification.
- Rendering picks a quality tier from the WebGL renderer. Headless Playwright runs on
  SwiftShader and gets the light tier (no post-processing or sun shadows, half
  resolution), so browser tests do not show the cinematic look; for visual review, launch
  Chromium with `--use-angle=d3d11 --enable-gpu --ignore-gpu-blocklist` (Windows) to use
  the real GPU.
- CI runners render several times slower than a desktop, so browser tests must not depend
  on frame rate: walk with the shared `walk` helper to a stop from `SPOTS` (where the whole
  arrival tolerance is nearest the intended station), drive per-frame input from inside
  the page, and scale long timeouts by `PACE`.
- Preserve manifest, service worker, installed-app icons, CI/Pages workflows,
  and the SPA fallback. Avoid unnecessary dependencies and backend services.
- Localization and color-blind accessibility are future design concerns; do not
  describe them as shipped systems. Avoid making future adoption harder.

## PWA and Pages

The existing public destination is <https://cboler.github.io/critterstead/>.
`main` pushes trigger the Pages workflow, including quality gates. Repository
Settings → Pages must use GitHub Actions. Treat a merge/push to `main` as a release
action; a feature-branch commit is not a deployed result.

The workflow derives the base path from `actions/configure-pages`. Do not hardcode
the repository name in runtime paths. `npm run build:pages` produces `dist/browser`
and a `404.html` fallback. To verify another subpath:

```sh
npm run build -- --base-href /your-path/
node scripts/prepare-pages.mjs
npm run check:pwa
```

`check:pwa` serves the built output locally, reads its base path, and exercises
service-worker control, offline reload, rendered world, and persisted care. It
does not inspect the live deployment. Service workers require HTTPS or localhost;
the development server does not validate production offline behavior. Initial
installation requires network access and enough time to finish the asset cache.
The control event can precede completed caching; retain that diagnostic when
investigating first-install failures.

The original icon source is `public/icons/critterstead.svg`.
`scripts/generate-icons.ps1` reproduces the PNG/ICO identity with Windows drawing
APIs. Historical Windows sandbox compilation failures involved ancestor-directory
access; use the environment's supported permission process if that recurs, and
report the actual blocker rather than assuming an application defect.
