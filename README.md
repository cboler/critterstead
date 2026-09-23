# Critterstead

**A little care. A little adventure.**

An original cozy game about making a home with one small creature and growing together. Care for your brindlekin, practice together, explore a berry glade, and gradually teach your companion to lend a paw. This is the first playable vertical slice; Critterstead is a working title, not a claim of trademark clearance.

The world is an orthographic Three.js diorama, built from original procedural geometry. The game runs entirely in the browser, with one local, versioned homestead save in IndexedDB. There is no account, backend, or multiplayer service.

## Play and develop

Use Node.js 24 and npm. Install and start the development server:

```sh
npm ci
npm start
```

Open `http://localhost:4200/`. Use **WASD** or **arrow keys** to walk, approach a landmark or your companion, and use the interaction controls. The interface explains available activities and training timing. The intended day lasts around 30 real minutes; sleeping advances to the next morning.

Your homestead is saved in the current browser profile. Browser storage can be cleared or evicted, and another browser or device has a separate save. There is no cloud backup. A damaged or newer save is reported rather than silently replaced. Resetting the homestead deliberately erases that local progress.

## Architecture

- `src/app/game/model.ts` defines persistent individuals, stable entity IDs, world state, commands, and the versioned save model.
- `src/app/game/` contains the TypeScript simulation, declarative content, local authority, and storage boundary. Gameplay rules belong here, separate from Angular and Three.js presentation.
- The renderer turns authoritative state into a small, animated world. It does not own economy, training rewards, or progression rules.
- Angular presents interaction controls, the companion's condition, activity feedback, and the game journal.
- `public/icons/critterstead.svg` is original vector artwork. Eight original PNG sizes and `public/favicon.ico` provide the installed app identity. `scripts/generate-icons.ps1` reproduces the raster icons with Windows' native drawing API, without an added dependency.
- `docs/ASTRA-HANDOFF.md` records the current implementation, validation, limitations, and ordered next steps. Read it before continuing development.

The host is a seam for moving authority later, not an implementation of a remote server. Breeding, pedigrees beyond foundational data, additional species, tournaments, town management, multiplayer, and a broad crafting economy remain future work.

## Validation

```sh
npm run format
npm run format:check
npm run lint
npm test -- --watch=false
npm run build:pages
npx playwright install chromium
npm run e2e
```

Playwright provides browser validation; simulation tests cover meaningful gameplay and persistence invariants. Visual changes also require starting the application and inspecting actual browser rendering. A successful source check alone does not verify deployment or playability.

## PWA and deployment

The Angular service worker, manifest, responsive foundations, GitHub Actions, and SPA fallback were inherited from [cboler's Angular PWA foundation](https://github.com/cboler/angular-pwa-starter). The game uses its own application identity and original visuals.

The Pages workflow resolves its deployment base path through `actions/configure-pages`; no repository path is hard-coded. Pushing to `main` runs quality gates and builds for the configured Pages destination. The repository must have **Settings → Pages → Build and deployment → GitHub Actions** enabled. Deployment is confirmed only after the workflow succeeds and the deployed page is inspected.

`npm run build:pages` creates the production bundle and its `404.html` routing fallback. To test a specific deployment subpath locally, supply that path to `npm run build -- --base-href /your-path/`, then run `node scripts/prepare-pages.mjs`. Service workers need HTTPS or localhost and are enabled only in production builds. Initial installation needs a network connection; static assets are then cached for subsequent visits. A development server alone does not validate offline behavior.

## License

[MIT](LICENSE)
