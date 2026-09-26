# Critterstead — game design

Canonical product direction, reconciled from the September 25–26, 2026 design
discussion. This describes the intended game, not a list of shipped features.
[ARCHITECTURE.md](ARCHITECTURE.md) records the implementation;
[DECISIONS.md](DECISIONS.md) records rationale and unresolved choices.

## Core promise and priority

Raise persistent, individual critters whose care, training, learned behaviors, and
family histories change life on a growing stead. The player should enjoy spending
time with one creature before wanting, and feeling ready for, several. Progress
should change what companions can do and how the player organizes a day, not
merely increase numbers.

The daily game must earn the player's attachment before the story asks for an
emotional response. Near-term development prioritizes caring, training, working,
resting, farming, and competing with one critter. Build only the architectural
preparation needed for that work before attempting the full prologue.

The intended presentation is an original orthographic 2.5D world with discrete
areas. The browser/PWA is the current platform; desktop play and a possible later
Steam release are longer-term interests, not a shipping or packaging commitment.
Keep touch, keyboard, and controller play viable. There is no backend requirement
for the current game. Future limited multiplayer must not drive speculative work.

## Household, childhood, and inheritance

The player begins as an older child or young teenager living with grandparents.
Grandpa is handing over his old stead; Grandpa and Pip helped maintain the home
and garden and helped raise the player. The protagonist can be scripted for now.
Later character customization remains possible but should not drive this phase.

Roughly two to three narrative years establish competence and attachment through
playable weeks/seasons, recurring chores, training, and competitions. Scripted
timeskips are acceptable; exact duration and calendar ratios are unresolved.
Increasing responsibility should feel earned through growing independence.

Grandpa's death is fixed and unavoidable. It approximately ends the guided
childhood/tutorial era and begins independent responsibility for the stead. It is
not a failure state or a consequence the player can optimize away. The story may
be moving, but enjoyable play remains the prerequisite for building it.

Pip belongs to Grandpa, not to the player as a starter. Pip is extraordinarily old:
the culmination of a lifetime of breeding, training, care, and learned behavior,
and an example of what the player may someday achieve. Pip substantially outlives
Grandpa. The player inherits responsibility for Pip, who continues familiar
routines, may visit places associated with Grandpa, and can accompany younger
critters as an experienced teacher. Learned behaviors persisting in younger
critters can carry that legacy forward. Do not combine the two deaths into one
scripted tragedy or make Pip a novice that the player must teach from scratch.

A friendly competitive cousin of similar age may receive a critter and later
become an ally. This relationship is secondary and optional in scope. Do not
introduce a hostility/reconciliation arc by default.

**Exploratory note:** the first playable winter arriving around or after Grandpa's
death is a promising thematic transition. It is not a fixed seasonal requirement.

## Opening and acquisition

The eventual opening takes the player with Grandpa and Pip through berry fields
into town. Pip demonstrates mature autonomous harvesting en route. Through
interactive encounters, the player meets several individual critters and learns
about normal acquisition paths: breeders and pedigrees, rescue, wild encounters,
other owners, breeding/stud services, and advanced gene combination.

The player ultimately chooses exactly one starter. Additional ownership is earned
gradually. Returning home, sleeping, and a first guided morning of care, chores,
and training are the intended opening shape; this prologue is later roadmap work.
One critter should initially be substantial responsibility. Learning, improved
facilities, and player competence gradually make more companions manageable.

## Ownership and physical presence

Target traveling/working group size is **three visible critters**. Active group
membership and total ownership are different: housing expansion, such as shed or
barn upgrades, supports a larger owned roster. Critters physically inhabit the
world; a roster is bookkeeping, not a fiction that stores creatures as items.

A tutorial outing could show Pip, the player's starter, and the cousin's critter
together without granting the player three owned critters. The exact party unlock
sequence, housing capacities, and off-party routines remain open.

Each critter has persistent individuality: a freely chosen individual name, age
and life stage, personality, bond, health/wellbeing, stamina, Strength, Endurance,
Speed, Intelligence, skills, learned behaviors, pedigree, genetics, visual traits,
history, and competition records. Player naming of individuals does not imply
globally player-named species.

## Learning, work, and the daily loop

The berry prototype expresses the general pattern:
**observe → learn → perform on cue → recognize opportunities → perform autonomously**.
Future systems should generalize that pattern instead of adding one hardcoded
knowledge field per job. Experienced critters, especially Pip, should eventually
model useful behaviors for younger ones. Exact teaching and inheritance mechanics
are not settled; genetic aptitude and acquired knowledge are distinct concepts.

Care, practice, useful work, and recovery should create understandable choices
across a day and across repeated days. Automation is a reward for learning and a
way to change the player's responsibilities. It should remain legible and respect
the critter's condition, rather than silently draining stamina or making care
irrelevant. Balance and specific recovery mechanics must be established by play.

Environmental roles can include farming, gathering, construction, woodcutting,
quarrying, mining, and future activities. All four core stats and all foundational
families should eventually have meaningful niches. These are directions for
staged expansion, not instructions to build every job in the first campaign.

Farming should deepen toward the variety and interconnected routines associated
with farming/life games such as Rune Factory and Stardew Valley. It should grow
beyond one abstract feed plot. Shed/barn, house, and farm upgrades should visibly
change the world and change function or capacity. Preserve original assets and
identity rather than copying the reference games' content.

## Families, lineages, and gene combination

The nine foundational families are Bird/Avian, Reptile, Dog/Canine, Cat/Feline,
Cow/Ox/Bovine, Bear/Ursine, Horse/Equine, Slime, and Insect. Brindlekin is an example
of a developed/stabilized lineage, not necessarily a tenth foundational family.
Pip may embody many generations of accomplished breeding; exact ancestry is open.

Natural breeding can have biological compatibility limits, including mule-like
hybrids with limited or absent fertility. Advanced gene-combination technology
can produce viable offspring from **any two critters**. Its use is culturally
normal and widespread in the setting, but expensive for an individual player.
Its true origin need not be explained. Cottages, hand tools, and this technology
can coexist without the technology being a strange new discovery.

Technology-created chimeras can establish stable, fertile lineages where
appropriate. Chimeras are central to raising and breeding, not rare one-off
trophies. The exact fertility rules and economy remain to be designed. “Gene-Loom”
is a provisional label from discussion, not a finalized machine or system name.

Each family pairing should receive deliberate design consideration. Nine families
give 36 unordered cross-family pairs, or 45 including the nine same-family pairs.
That is a planning grid, not a cap on offspring diversity or a complete solution
for later multi-family ancestry. Authored morphology rules may support several
dominance levels, proportions, coverings, appendages, colors, and aptitudes.
Fantastical forms are welcome; unrestricted random part assembly is not the art
direction. A future chimera design bible should define valid forms and lineages.

## Life cycle and competition

Aging and eventual natural death are part of the current direction, with long,
genetically variable lifespans. Exact lengths, life-stage effects, care influence,
and end-of-life pacing remain unresolved. A prototype constant is not a canon
lifespan. Do not add routine accidental deaths; dangerous exploration and any
associated mortality are unapproved possibilities, not current scope.

The Colosseum is the town's fairground/stadium/exhibition venue, not solely a
battle arena. Different days can host nonlethal Monster Rancher-like combat,
races, strength and athletic contests, problem-solving or skill exhibitions,
critter shows, produce/vegetable judging, markets, and festivals. Its recurring
calendar should help make all four stats useful. Combat in these competitions is
nonlethal. Event cadence and the calendar itself remain open; the current Clover
Cup is only a prototype time trial.
