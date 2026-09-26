# Critterstead

**A little care. A little adventure.**

An original critter-raising game about caring, learning, useful work, and making a
home together. Critterstead is a working title, not a claim of trademark clearance.
The current browser PWA is an early playable vertical slice, with an orthographic
Three.js world made from original procedural geometry.

[Play the prototype](https://cboler.github.io/critterstead/).

## What you can play today

Care for one Brindlekin companion, practice timed cues, plant and water feed,
explore Clover Glade, teach berry gathering through observation and cues, watch
independent foraging, sell produce, improve the shed, run a small daily time trial,
and sleep into another day. There are two areas, one crop, and six berry bushes.

The prototype calls the player's young novice companion **Pip**. In the intended
story, Pip is Grandpa's ancient, experienced critter. That narrative, a separate
player starter, ownership/rosters, breeding, seasons, and the Colosseum are
**planned, not implemented**. The next priority is a compelling one-critter daily
loop, with only the necessary architectural preparation before the full prologue.

## Play and develop

Use Node.js 24 and npm:

```sh
npm ci
npm start
```

Open `http://localhost:4200/`. WASD or arrow keys move; **E** interacts; **Space**
cues the companion during training and racing; **J** opens the journal; **Esc**
pauses or closes a menu. Click/tap the ground to walk. Small screens expose touch
movement buttons. Backtick opens developer save tools, including deliberate reset.

A standard gamepad uses the left stick to move, **A** to interact/cue, the D-pad to
select actions/menu buttons, **B** to close, **X** for help, **Y** for the journal,
and Menu to pause. On-screen hints adapt to a connected controller. Automated
controller coverage uses a mocked Gamepad API; physical hardware still needs a
playtest.

The clock covers a full game day in about 30 real minutes; activities also advance
time. Menus and hidden tabs pause the simulation. Sleeping advances to the next
morning. Your homestead uses one versioned IndexedDB save in this browser profile.
Storage can be cleared/evicted; other browsers/devices have separate saves. There
is no account, backend, cloud backup, or multiplayer. Unreadable or newer saves are
reported and retained rather than silently replaced. Reset erases local progress.

## Project documentation

Read the relevant document for the task, not every file before every edit.

| Document                                     | Purpose                                                                     |
| -------------------------------------------- | --------------------------------------------------------------------------- |
| [Game design](docs/GAME-DESIGN.md)           | Intended game and narrative, including story spoilers                       |
| [Architecture](docs/ARCHITECTURE.md)         | Actual implementation, boundaries, save contract, and gaps                  |
| [Development](docs/DEVELOPMENT.md)           | Setup details, validation commands, accessibility, PWA and Pages procedures |
| [Roadmap](docs/ROADMAP.md)                   | Staged playable development and product gates                               |
| [Decisions](docs/DECISIONS.md)               | Settled rationale and genuinely unresolved questions                        |
| [Execution plans](docs/exec-plans/README.md) | Active milestones, verified progress, and exact continuation point          |

[AGENTS.md](AGENTS.md) and [GEMINI.md](GEMINI.md) are thin tool-specific entrypoints
into this shared knowledge. The former `INSTRUCTIONS.md` and `ASTRA-HANDOFF.md`
remain as compatibility pointers. Current work belongs in the active plan.

## PWA and deployment

The PWA/platform foundations came from
[cboler's Angular PWA starter](https://github.com/cboler/angular-pwa-starter); the
game has its own identity and original visuals. Pages derives its base path from
`actions/configure-pages`, and pushes to `main` run quality gates and deployment.
The repository's Pages setting must use GitHub Actions. Production offline play
requires a first online visit long enough to finish the initial asset cache.

See [Development](docs/DEVELOPMENT.md) for builds, SPA fallback, subpath/offline
verification, icon generation, and deployment evidence requirements. A local
build or branch commit does not establish that the public site was deployed.

## License

[MIT](LICENSE)
