# Critterstead — canonical game design

Canonical product and system direction for Critterstead. This document records the
intended game, core values, system mechanics, narrative canon, and design boundaries.
It is the design authority for implementation; it describes what the game is intended
to become, not a checklist of already-shipped features.

For actual implementation reality and current boundaries, see [ARCHITECTURE.md](ARCHITECTURE.md).
For historical context and settled rationale, see [DECISIONS.md](DECISIONS.md).
For sequencing and milestone planning, see [ROADMAP.md](ROADMAP.md) and [active execution plans](exec-plans/README.md).

---

## Design-reference disclaimer

References throughout this documentation to external games—including _Rune Factory 4_,
_Monster Rancher_, _Graveyard Keeper_, _Palworld_, _Mewgenics_, _Stardew Valley_,
_Dragon's Dogma_, _RimWorld_, _Ni no Kuni_, and similar titles—are comparative design shorthand.
They are used solely to communicate system depth, interaction style, pacing, or
mechanical intent between designers and engineers.

They are **not** instructions to copy another game's protected expression, including:

- proprietary code or technical architecture,
- visual art, 3D meshes, textures, animations, or visual effects,
- maps, level layouts, or geographic designs,
- characters, creature concepts, names, or backstories,
- dialogue, lore, or narrative scripts,
- trademarked names, logos, branding, or packaging,
- distinctive user interfaces or HUD layouts,
- proprietary balance numbers, data tables, or formulas.

Critterstead implements its own original systems, visual style, content, balance tables,
writing, UI, lore, and software architecture. These external references serve as
starting points for communication and iteration. Some mechanics may remain structurally
similar to proven genre conventions, others will be modified heavily, and many will
diverge completely as Critterstead develops its own distinct identity.

---

## High-level game identity

Critterstead is a life/farm RPG and creature-raising simulation combining several
interlocking gameplay fantasies:

1. **Rune Factory-like daily life**: farming, working, adventuring, gathering, town life,
   resident relationships, requests, four distinct seasons, festivals, household
   progression, crafting, and production.
2. **Monster Rancher-like critter raising**: long-term stat development, varied training
   disciplines, specialization, breeding, scheduled competitions, multiple training
   minigames, and deep individual attachment.
3. **Graveyard Keeper-like physical logistics**: resources physically exist in places;
   they must be carried, hauled, staged, processed, and delivered. Production chains can
   break and require player intervention.
4. **Palworld-like worker needs and base activity**: critters work, rest, eat, become
   unhappy or unwell, specialize, and can eventually automate the stead's routine tasks.
5. **Dragon's Dogma-like learned behavior**: critters observe player actions, learn
   techniques, recognize opportunities, develop task competence, and eventually act
   autonomously.
6. **RimWorld-like depth of assignment and priorities**: work management becomes deep
   over time (jobs, priorities, schedules, storage filters), presented through a
   friendly, character-focused, diegetic interface rather than a spreadsheet.
7. **Mewgenics-like generational individuality**: inheritance, surprising trait
   combinations, persistent life history, and deliberate breeding choices produce
   distinct individuals over generations.

In one line: **raise critters for the Colosseum; the stead is where they learn to live and
work.** Training and competition are the spine; farming, production and delegated jobs fill
the days between and pay for the stead ([D47](DECISIONS.md#d47--raise-critters-for-the-colosseum-accepted-2026-10-03)).

The emotional heart beneath these systems is Grandpa: growing up with him, losing him,
and carrying his name forward ([The years with Grandpa](#the-years-with-grandpa)).
The fantasy is not owning a bag of monsters but building a life with generations of
critters who became good at things because of what they lived through with you. Success
means players look back across years remembering individuals, proud enough of their
critters to want to show them off. Critterstead is an offline game first.

These systems are not disconnected minigames; they form mutually reinforcing loops:

```
body / genetics -> stats -> skills -> checks -> work / training -> resources
       ^                                                                |
       |                                                                v
expanded possibilities <- delegation <- upgrades <- production <- logistics
```

and for care and development:

```
care -> condition / happiness -> performance -> development -> specialization -> autonomy
```

and for world interaction:

```
training / work / adventure -> stat / skill growth -> visibly greater capability -> new world interactions
```

---

## Core values and critter philosophy

### Usefulness vs. value

**A critter’s usefulness and a critter’s value are not the same thing.**

Critters are persistent individuals first, not disposable stat packages. While
optimization, specialization, breeding, competition, and min-maxing are enjoyable and
legitimate goals, less-useful or less-optimal critters are never less worthy of care.
The emotional core of Critterstead depends on players valuing their companions as
living members of the household, not discardable production units.

### Individual attributes

Every critter possesses a rich individual identity that persists across saves:

- **Persistent identity**: permanent ID, player-given name, sex, species/lineage.
- **Life stage & age**: numeric age in game days, life stage (young, adult, elder),
  and natural longevity.
- **Condition & needs**: health, hunger, stamina/energy, happiness/wellbeing, and bond.
- **Capability stats**: Strength (STR), Endurance (END), Speed (SPD), Intelligence (INT).
- **Learned skills**: proficiencies in recognized trades and disciplines.
- **Learned behaviors**: observation, cue response, opportunity recognition, and
  autonomous execution across specific jobs.
- **Physical morphology**: body shape, size, weight, locomotion type, manipulators/hands,
  wings, equipment compatibility, and diet.
- **Genetics & pedigree**: parentage, ancestral lineage, aptitude ceilings, and inheritable traits.
- **Life history**: recorded milestones, competition trophies, injuries, honors, and memories.
- **Personality & preferences**: evolving likes, dislikes, and temperamental quirks over time.

### Happiness is a condition, not a stat

Happiness/wellbeing is **not** one of the four capability stats. It reflects _how an
individual is doing_, not _what they are capable of doing_. Comfortable housing, adequate
food and rest, affection, competence at assigned tasks, manageable workloads, illness,
injury, and environmental conditions all influence happiness over time.

---

## Core capability stats

Humans and critters use the same conceptual four-stat capability system:

- **STR** — Strength
- **END** — Endurance
- **SPD** — Speed
- **INT** — Intelligence

### Stat scale and progression

- Stats broadly range from approximately **1 to 999**.
- The small stat set is deliberate: many diverse tasks draw upon the same four core
  capabilities.
- Stats grow primarily through **meaningful actions, checks, and training**, but grow
  much more slowly than skills.
- Very high stats represent major long-term achievements and produce impressive,
  sometimes humorous, visibly exceptional outcomes in the world.

### STR (Strength)

- **Governs**: carrying capacity, inventory encumbrance tolerance, lifting, pushing,
  pulling, heavy tool operation, moving construction materials, hauling heavy loads,
  and physical-force combat checks.
- **Trained by**: lifting weights, carrying heavy cargo, pulling loads, pushing boulders,
  heavy manual labor, and strength-based combat actions.
- **World impact**: A strong bovine pushing a quarry boulder visibly interacts with that
  boulder's mass and encumbrance rather than merely receiving an invisible percentage bonus.

### END (Endurance)

- **Governs**: maximum stamina pool, sustained work capacity before exhaustion, long-distance
  travel, distance running, hauling routes, prolonged combat/dungeon stamina, recovery
  tolerance, and resistance to physical breakdown under prolonged load.
- **Trained by**: sustained physical exertion, long hauling routes, extended labor, and
  pacing drills.
- **World impact**: END improves particularly slowly; ordinary years of dedicated work
  meaningfully contribute to an individual's stamina reservoir.

### SPD (Speed)

- **Governs**: movement speed in the world, dexterity, reaction time, turn order in
  turn-based Colosseum competition, timing-window leniency, attack frequency, and quick
  tool manipulation.
- **Trained by**: running drills, obstacle courses, reflex/timing exercises, and rapid
  dexterous tasks.
- **World impact**: High-SPD critters move visibly faster in the world, act earlier in
  competitions, and complete rapid handiwork in less game time.

### INT (Intelligence)

- **Governs**: learning rate for new behaviors and skills, perception checks, understanding
  multi-step job sequences, technical ability, machine and appliance operation, recognizing
  unprompted work opportunities, task planning, independent problem-solving, and eventual
  autonomous base self-management.
- **Trained by**: observing complex tasks, command sequences, puzzle drills, operating
  machinery, and alchemy/crafting synthesis.
- **World impact**: High-INT critters learn new behaviors with fewer demonstrations,
  detect broken production links, and self-manage complex daily chore sequences without
  player intervention.

---

## Skills system

Humans and critters both possess skills. Skills are distinct from capability stats:

- **Skill range**: approximately **1 to 99**, progressing through experience.
- **Taxonomy**: skills represent recognizable professions, learned techniques, or
  disciplines, rather than granular output types.
- **Sensible grouping**:
  - _Mining_ encompasses both pickaxe mining and stone quarrying, because both involve
    breaking rock with percussion tools and learned technique.
  - _Woodcutting_ is distinct from Mining because the tools, cutting action, and technique differ.
  - Skills are **not** split by material output (e.g., no separate "Iron Mining",
    "Coal Mining", or "Stone Quarrying" skills).
- **Core skill categories**:
  - _Primary extraction_: Mining, Woodcutting, Farming, Fishing, Foraging.
  - _Production & crafting_: Cooking, Alchemy, Smithing, Carpentry, Machine Operation.
  - _Logistics & handling_: Hauling, Critter Care, Building/Construction.
  - _Athletics & competition_: Racing, Athletics/Acrobatics, Weapon Mastery, Blocking.

---

## Checks and simulation

Gameplay actions resolve through an extensible check model incorporating capability,
learned skill, tools, physiology, and environmental circumstances:

$$\text{Check Score} = \text{Skill} + f(\text{Relevant Stats}) + \text{Tool Quality} + \text{Body/Aptitude Modifiers} + \text{Circumstances vs. Difficulty}$$

### Felt outcomes over raw dice

Ordinary play expresses check results through tangible world feedback rather than raw
number popups:

- task completion speed and animation tempo,
- stamina cost incurred,
- harvest yield quantity and material grade/quality,
- wasted raw materials or fuel,
- wear and tear on equipped tools,
- accidental setbacks,
- creation of new problems requiring attention.

A roll popup may be appropriate for discrete, high-stakes events (such as Colosseum
judging). Players can inspect detailed simulation mechanics via an optional diagnostic
log (analogous to detailed combat math in simulation chronicles).

### Degrees of failure and cascading disruption

Failure is not a simple binary "nothing happened." Failure has degrees and consequences:

- slower progress or wasted clock time,
- reduced harvest yield or lower-quality goods,
- wasted ingredients or destroyed intermediate items,
- tool dulling, chipping, or breakage,
- physical strain, sprains, or minor injury,
- accidental fire or structural damage at workstations,
- logistical disruption (e.g., dropped cargo blocking a path).

Cascading systemic failures are an intentional design element: a broken tool stops a
production line, starving a delivery route, which in turn halts an appliance until the
player or an autonomous helper diagnoses and resolves the bottleneck.

---

## Organic progression

Characters and critters grow stronger by living and doing, not solely through dedicated
training interfaces:

- Regular mining improves the _Mining_ skill noticeably, while slowly conditioning
  _STR_ and _END_.
- Operating complicated machinery or mixing alchemical reagents improves _INT_ and
  _Technical/Alchemy_ skills.
- Heavy manual tools emphasize _STR_ gains; precision or powered tools emphasize _INT_
  and technical proficiency.
- Hauling supplies across the stead builds _END_ and carrying capability.

---

## Training system

The timing hoops practice in the early prototype is merely one initial training minigame.
Critterstead features a family of interactive training minigames inspired in spirit by
_Monster Rancher_, where the visual and mechanical metaphor fits the capability trained:

- **Lifting / Pressing**: rapid rhythmic input or force-gauge balance against visible
  weights (_STR_).
- **Distance Running / Pacing**: sustained movement and stamina-pacing challenges (_END_).
- **Reflex Drills / SIMON-style sequences**: quick reaction and pattern matching (_SPD_ / _INT_).
- **Command & Logic Sequences**: multi-step instructions and spatial routing (_INT_).
- **Hauling & Sled Pulling**: drag-weight resistance courses (_STR_ + _END_).
- **Obstacle Courses**: jumping, ducking, and balance courses (_SPD_ + _END_).
- **Woodchopping**: rhythmic force and accuracy at the chopping block (_STR_ + _Woodcutting_).
- **Fishing**: aim, tension control, timing, and rod technique (_SPD_ + _Fishing_).
- **Sparring / Arena Drills**: simulated combat reactions and positioning (_STR_ / _SPD_ / _Combat_).

### Two ways to train

Each drill can be played **together**, as a short real-time minigame that costs the critter
less energy and pays from poor to excellent on your play, or, once played, run as a
**routine** from a menu: more critter energy, little of yours, a fair result that is
occasionally better ([D48](DECISIONS.md#d48--two-ways-to-train-accepted-2026-10-03)).
Routines are what later let Pip or a trained critter coach the others.

Drills are built from a small set of familiar patterns, two drills per stat; the roster
and later pool live in [plan 004](exec-plans/completed/004-training-and-exhibitions.md).
Exhibition events chain drills on harder settings. A wider-timing assist applies to every
drill.

### Demonstration and mentoring

A player or an experienced critter can demonstrate a training exercise before a novice
attempts it. Grandpa and Pip can mentor young critters around the homestead, providing
learning bonuses.

### Diminishing returns

Repeatedly grinding the exact same training discipline on the same day yields sharply
diminishing returns, encouraging balanced daily scheduling. Ordinary productive work
continues to provide modest organic gains even when intensive training has reached daily
exhaustion. Later consumables, tonics, and medicinal baths may alleviate fatigue and
restore training readiness.

---

## Morphology, body simulation, and encumbrance

Critters are not interchangeable stat blocks; their physical bodies define what they can
and cannot do:

### Morphological traits

- **Body shape and size**: tiny foragers, nimble bipeds, massive quadrupeds, serpentine forms.
- **Mass & weight**: phenotype properties that interact with physics, pushing leverage,
  and inertia (not core stats).
- **Locomotion**: walking, running, slithering, hopping, flying/gliding, swimming.
- **Manipulators**: hands capable of fine tool use, paws, hooves, claws, or prehensile tails.
- **Appendages**: wings capable of flight or draft fanning, horns for leverage, shell armor.
- **Diet**: herbivore, carnivore, omnivore, or mineral/magical diets.
- **Equipment compatibility**: hats, packs, satchels, harnesses, boots, or custom-fitted tools.

Some tasks require appropriate morphology or specially adapted tools: a hoofed bovine
cannot hold a standard jeweler's needle, but excels at pushing heavy rollers or pulling
stone-boats.

### Graduated encumbrance model

Inspired in design spirit by _Dragon's Dogma_, carrying weight affects characters physically:

- Light loads permit normal movement speed and standard stamina consumption.
- Moderate loads noticeably reduce sprint speed and increase stamina drain.
- Heavy loads slow movement to a walk and heavily penalize exertion.
- Severe overload halts movement entirely.
- Physical carrying capability varies by form: a small creature may carry one bundle in
  its paws; an equipped companion can wear saddlebags; a large bovine can pull a loaded
  wagon or roll a quarry block.

---

## Genetics, lineages, breeding, and chimeras

### The nine foundational families

1. **Bird / Avian** (aerial grace, keen vision, swift movement, light carrying)
2. **Reptile** (dense scales, environmental resilience, deliberate power, patient focus)
3. **Dog / Canine** (loyal, high stamina, pack coordination, excellent tracking/hearing)
4. **Cat / Feline** (nimble, high reflex/speed, balance, sharp senses, independent)
5. **Cow / Ox / Bovine** (massive strength, unmatched pushing/pulling, steady temperament, heavy hauling)
6. **Bear / Ursine** (broad physical power, foraging aptitude, tough constitution)
7. **Horse / Equine** (ground speed, distance endurance, riding/draft capability)
8. **Slime** (amorphous flexibility, elemental absorption, unique liquid logistics)
9. **Insect** (exoskeleton defense, proportional strength, specialized manipulators, rapid life cycles)

_Brindlekin_ represents an established, stabilized woodland chimera lineage rather than a
separate root family; even Grandpa's household cannot say which families went into it
([D49](DECISIONS.md#d49--brindlekin-is-a-chimera-lineage-accepted-2026-10-03)). Familiar animals outside the nine arise the same way: a raccoon-like critter
sits somewhere between a bear crossed with a cat and a dog. Players name individuals,
never breeds. As a first pass, a chimera's breed name joins its parents' names by whole or
partial word concatenation ([D42](DECISIONS.md#d42--chimera-breed-names-join-the-parents-names-accepted-2026-10-02)).

### Breeding and artificial growth technology

- Natural breeding between closely related lineages follows biological compatibility.
- Advanced in-world gene-combination and growth-chamber technology allows **any two critters**
  to produce viable offspring.
- This technology is culturally normal, ancient, and established in the setting, though
  costly for a rural homestead. Artificial gestation avoids requiring graphic birth gameplay.
- Offspring inherit morphology, stat potentials, growth curves, and aptitudes along authored
  spectra between parent families.
- **"Bad genetics" is never a death sentence**: dedicated care, patient training, and
  experience allow even an underdog critter to achieve surprising success.

---

## Learned behavior, jobs, and delegation

### The learning cycle

The proven berry learning arc generalizes across all homestead activities:
$$\text{Observe} \longrightarrow \text{Learn} \longrightarrow \text{Perform on Cue} \longrightarrow \text{Recognize Opportunity} \longrightarrow \text{Perform Autonomously}$$

### Multi-step compositional jobs

Complex work is not a single hardcoded toggle; it is composed of constituent learned
competencies. For example, **Garden Duty** decomposes into:

1. Observing watering $\rightarrow$ watering dry soil on cue $\rightarrow$ independently recognizing dry plots.
2. Observing sowing $\rightarrow$ retrieving seed from storage $\rightarrow$ sowing empty prepared tilled soil.
3. Recognizing weed/pest infestation $\rightarrow$ pulling weeds or applying organic treatment.
4. Recognizing crop ripeness $\rightarrow$ harvesting mature produce $\rightarrow$ hauling harvested goods to designated crates or bins.

A critter learns these behaviors step by step. Once all constituent skills are mastered,
the companion can be assigned comprehensive "Garden Duty."

### Work management and delegation

As the homestead grows, critters can be assigned to formal roles:

- Gardeners and field hands,
- Haulers and warehouse organizers,
- Woodcutters and quarry workers,
- Kitchen assistants and millers,
- Workshop smiths and carpenters,
- Livestock and nursery caregivers.

Management offers _RimWorld_-like depth—job priorities, permitted work types, schedules,
and localized storage rules—but is accessed through a warm, character-centered, diegetic
interface (chalkboards, chore bells, companion dialog) rather than cold spreadsheets.

### Critter self-management

Competent critters take care of their own basic needs:

- When hungry, they seek food from accessible troughs, pantries, or berry stores.
- When exhausted, they return to their nook or barn stall to rest.
- Once recovered, high-INT critters remember their assigned priority and resume work.

---

## Automation philosophy

Critterstead is designed to become **highly automatable** in the late game. Delegating
routine chores to capable critters is a celebrated milestone of mastery, not a lack of
content.

As the stead becomes self-sustaining, the player's role shifts toward:

- estate expansion and architectural layout,
- resolving logistical bottlenecks and supply failures,
- training elite champions for Colosseum festivals,
- cross-breeding ambitious new lineages,
- venturing into dangerous wilderness and dungeons,
- deep town relationships, festivals, and personal commissions.

Crucially, **automation is physical and simulated**, not an abstract menu upgrade.
Materials must physically move, tools must remain sharp, and critters must remain healthy
and fed for the machines of the stead to run.

---

## Physical logistics and storage

### No magical global inventory

Critterstead rejects magical global homestead inventories. **Items physically exist where
they are placed**:

- A wooden chest holds items physically placed inside that specific chest.
- A kitchen refrigerator stores perishable food located in the kitchen.
- A water bucket sits by the homestead well.
- A grain mill requires harvested wheat physically dumped into its hopper.
- Ground flour accumulates in the mill's output tray until hauled away.
- A blacksmith's forge requires charcoal and ore hauled to its input staging bay.

### Concrete failure chains

Physical logistics creates natural, emerging gameplay:

> **The Broken Hammer Chain**: A blacksmith critter stops working because its forge
> hammer shattered. A replacement hammer must be crafted at the carpentry/smithing bench.
> The lumber and metal ingots for the new tool are stored in the shed, but no hauling
> critter is currently assigned to deliver them. The production chain stalls until the
> player notices the stoppage, investigates the forge, and either carries the materials
> personally or assigns a hauler to clear the bottleneck.

### Locality and layout design

Spatial arrangement directly dictates efficiency:

- Placing the root cellar or refrigerator adjacent to the kitchen prep stove cuts meal
  preparation time dramatically.
- Placing feed storage near the critter barn prevents workers from wasting hours walking
  across the estate for breakfast.
- Workstations feature dedicated input and output slots; if an output hopper fills, the
  machine halts.

---

## Production chains and tools

Raw resources are refined through multi-tiered production networks:

- **Forestry**: Fallen branches $\rightarrow$ Chopped logs $\rightarrow$ Sawmill lumber $\rightarrow$ Finished handles & furniture.
- **Masonry**: Quarry boulders $\rightarrow$ Split stone slabs $\rightarrow$ Dressed building blocks & millstones.
- **Metallurgy**: Ore veins $\rightarrow$ Crushed ore $\rightarrow$ Smelted ingots $\rightarrow$ Tool heads & hardware.
- **Agriculture**: Grains $\rightarrow$ Windmill / watermill flour $\rightarrow$ Dough $\rightarrow$ Baked breads & celebration cakes.
- **Dairying**: Fresh milk $\rightarrow$ Cheese press $\rightarrow$ Aged wheels of cheese.
- **Orchardry**: Sunberries & orchard fruits $\rightarrow$ Preserving kettle $\rightarrow$ Jams & medicinal tonics.

### Tools, physical usability, and learned proficiency

Tools and implements are physical equipment with real physical demands, skill scaling, and maintenance:

- **Physical usability (stats & morphology)**: Physical attributes and body morphology determine
  whether an actor can physically wield or handle a tool. For example, a heavy felling axe or
  quarry sledge requires sufficient STR; critters require compatible manipulators (hands,
  prehensile appendages, or an adapted draft harness) and suitable body size/form. When a physical
  requirement is not met, the tool may be genuinely unusable or impose severe encumbrance and
  fatigue penalties.
- **Learned proficiency (skill realization)**: Skills determine how effectively the actor uses
  the tool. A novice may be physically capable of swinging a high-quality or masterwork tool, but
  gains little or none of its advanced benefit over a mundane implement. A skilled practitioner
  can increasingly exploit the tool's intrinsic qualities—balance, precision, cutting edge or
  striking efficiency, action speed, durability retention, and specialized features.
- **Governing concept**: _Physical capability determines whether and how comfortably the tool can
  be used; skill determines how much of the tool's potential the actor can realize._ A masterwork
  item offers little greater utility to a layperson than a basic tool, while becoming truly
  exceptional in expert hands.
- **Durability & maintenance**: Tools wear down with use, losing edge and efficiency before breaking.
  Worn tools can be honed at a grindstone; broken tools must be repaired or reforged at a
  smithy/carpentry bench.
- **Open balance questions**: Exact physical thresholds, item tiers, skill breakpoints, and
  quality scaling formulas remain open balance questions to be tuned through play.

---

## Construction and spatial layout

### Authored macro-spaces, player micro-spaces

Critterstead balances bespoke authored geography with player spatial creativity:

- **Macro-spaces are authored**: the homestead footprint, cottage shell, barn foundations,
  forest perimeter, town square, quarry basin, and dungeon ruins are hand-crafted,
  scenic diorama spaces.
- **Micro-spaces are player-designed**: within buildable property zones, the player
  freely arranges storage chests, tool racks, processing machines, furniture, fences,
  troughs, garden beds, and stone pathways.
- Limited buildable footprints turn base layout into a satisfying spatial and logistical puzzle.

---

## Farming depth

Farming expands far beyond a single feed plot into a rich, full-featured agricultural simulation:

- **Seasonal crops**: seasonal growth profiles; out-of-season crops wither unless protected
  in greenhouses or hotbeds.
- **Soil quality & moisture**: soil requires tilling, daily watering, and weed control.
- **Fertilizers & compost**: organic matter, crushed bone, and compost enhance growth speed,
  water retention, and yield quality.
- **Crop quality tiers**: standard, quality, pristine, and rare giant varieties.
- **Pests & weather**: aphids, foraging birds, sudden freezes, heat waves, and storms create
  agricultural challenges requiring critter guardians or protective measures.

---

## Calendar, time, and seasons

### Calendar structure

- **Four seasons**: Spring, Summer, Autumn, Winter.
- **30 days per season** $\times$ 4 seasons = **120 days per game year**.
- An inspectable wall calendar in the player's cottage tracks birthdays, scheduled
  Colosseum events, weekly market days, seasonal festivals, and delivery deadlines.

### Pacing

- One complete 24-hour game day corresponds to roughly 30 minutes of real time, with
  focused activities advancing clock minutes.
- Sleeping overnight restores fatigue, recalculates crop growth, increments age, and
  advances world simulation.
- The **Rest together** action allows daytime recovery at the companion nook at the
  cost of 90–120 game minutes without skipping the day.

---

## Home and stead progression

The homestead begins in a neglected, overgrown state: brambles choke the paths, the shed
roof leaks, and the cottage interior is sparse.

- Stead restoration proceeds through visible, multi-tier construction upgrades.
- Upgrades demand funds, gathered logs/stone, processed materials, construction time,
  and physical material delivery to the worksite.
- Expanding the house unlocks interior rooms, an inspectable calendar, and functional
  appliances (stove, oven, icebox).
- Expanding the barn increases critter housing capacity and provides dedicated indoor stalls.

---

## Town, economy, and commerce

The starting honesty stall is temporary prototype scaffolding. The nearby town of
**Oakhaven** is a vibrant, inhabited rural center:

- **Scheduled town residents**: shopkeepers, artisans, elders, rivals, and wandering merchants
  with daily routines, favorite hangouts, and relationship arcs.
- **Functional shops**:
  - _Carpenter & Stonemason_: building upgrades, lumber, masonry, and architectural structures.
  - _Blacksmith_: tools, equipment upgrades, repair supplies, and metal hardware.
  - _General Store & Seed Merchant_: seasonal seeds, basic supplies, and household dry goods.
  - _Furniture & Appliance Showroom_: kitchen stoves (unlocking cooking/baking), iceboxes,
    storage armoires, workbenches, and decor.
  - _Apothecary & Veterinarian_: critter tonics, remedies for illness, grooming brushes,
    and nutritional feed additives.

### Commerce and contracts

- **Shipping bin**: offers convenient daily liquidation of goods, but pays baseline bulk prices.
- **Direct commerce**: selling directly to town shops, merchant stalls, or specialized
  buyers yields significantly better profit.
- **Contracts & commissions**: town residents post personal requests, restaurant supply
  orders, and seasonal merchant commissions on the town bulletin board, offering bonus coin,
  rare recipes, or goodwill.

---

## Exploration, adventuring, and party structure

### Traveling party

The player travels outside the homestead with an active party of **three visible critters**.
Group members walk with the player, navigate obstacles, assist with gathering, and stand
together in encounters.

### Dangerous adventuring vs. Colosseum competition

Critterstead deliberately separates wild exploration combat from town Colosseum contests:

| Dimension        | Wilderness & Dungeon Adventuring                                                            | Town Colosseum Competitions                                                                         |
| :--------------- | :------------------------------------------------------------------------------------------ | :-------------------------------------------------------------------------------------------------- |
| **System**       | **Real-time** exploration and action checks                                                 | **Turn-based**, theatrical, tactical presentation                                                   |
| **Stakes**       | Dangerous; wild beasts, hazards, potential defeat                                           | Nonlethal; staged spectator event, sport, prestige                                                  |
| **Goals**        | Resource gathering, discovery, dungeon delving                                              | Stat showcase, trophies, prize money, title standing                                                |
| **Consequences** | Defeat collapses the expedition (clinic revival / reload; see defeat and revival direction) | Loss yields experience, constructive critique, or modest recognition depending on tier (rules open) |

Wild exploration includes forests, rocky canyons, abandoned quarries, subterranean mines,
and ancient ruins.

### Wilderness defeat, clinic revival, and personal reconstitution

Exploration combat in wild terrain and deep ruins is genuinely dangerous, setting it apart from
the theatrical safety of the town Colosseum:

- **Expedition collapse**: An overwhelmed party is defeated and their expedition ends immediately.
- **Clinic revival & reconstitution (standard mode)**: In ordinary (non-Ironman) play, defeat
  results in the party being rescued or reconstituted at an Oakhaven clinic with meaningful
  economic or resource consequences (such as medical treatment fees, loss of unbanked expedition
  proceeds, or temporary recovery penalties).
- **Personal reconstitution facility (late progression)**: In later progression, leveraging the
  setting's established advanced biological and genetic technology, the player may be able to obtain
  or build a personal revival / reconstitution / clone-pod-like facility on the stead, reducing
  reliance on town medical services.
- **Resource depletion & insolvency handling**: Running out of money is **not** currently canonized
  as automatic permanent death in normal mode. Possible future handling includes emergency medical
  debt, loss of expedition resources, temporary recovery penalties, or allowing the player to reload.
- **Optional Ironman mode (future)**: A future optional Ironman difficulty mode may disable or
  severely restrict revival, making combat defeat permanent.
- **Open design parameters**: Exact lore terminology, revival formulas, monetary costs, unlock
  timing, and specific penalty structures remain open design questions rather than settled canon.

---

## The Colosseum

The town Colosseum is a grand community amphitheater and festival fairground, not merely
a combat pit:

- **Theatrical turn-based combat**: critter abilities, personality traits, and elemental
  aptitudes are showcased under stadium lights with audience fanfare.
- **Speed-based initiative**: SPD governs turn order and reaction windows.
- **Varied attack origins**: physical strikes draw from STR, lunges from SPD, technical
  tactics from INT, and endurance reserves from END.
- **Diverse athletic events**: obstacle hurdle courses, sprint relays, heavy stone pulls,
  harvest time trials, and beauty/physique exhibitions.
- **The ladder**: critters climb ranks — Fledgling, Contender, Veteran — through ranked
  cups against rival ranchers' critters and a promotion cup at each rank. Champion and
  Grand Champion, Grandpa's old title, are won in turn-based bouts
  ([D53](DECISIONS.md#d53--a-colosseum-ladder-of-athletic-cups-accepted-2026-10-05)).

---

## Critter care, health, aging, and mortality

### Comprehensive wellbeing

Long-term critter raising includes:

- **Nutritional balance**: high-energy feeds, fresh garden greens, and favorite treats.
- **Hygiene & grooming**: regular brushing, mud cleaning, and hoof/feather care improve
  morale and bond.
- **Illness & injury**: overworking in foul weather or severe strain can induce illness
  or physical injury requiring rest, poultices, and veterinarian care.
- **Affection & bond**: daily petting, shared meals, and working alongside the player build
  devotion and responsiveness.

### Aging and respectful mortality

Critters grow from energetic youths into peak adults and eventually wise elders:

- Eldership brings slower movement and lower maximum stamina, balanced by seasoned skill
  mastery and exceptional mentoring capability.
- Critters enjoy long, fulfilling lifespans. Maximum age differs between families and is
  a primary trait offspring inherit ([D50](DECISIONS.md#d50--lifespan-is-a-family-trait-and-is-inherited-accepted-2026-10-03)).
- When an elder critter reaches the natural end of its life, the event is treated with
  warmth, dignity, and gentle respect (retirement to pasture, memorial groves, passing
  down keepsakes to offspring).
- The game approaches loss honestly without cruel or arbitrary punishment.

---

## Visual direction and world diorama

### Aesthetic identity

- **Deliberately low-poly**: clean, readable faceted surfaces with soft beveled edges.
- **Warm, cute, toy-like**: characters and critters evoke the tactile charm of handcrafted
  wooden and ceramic figurine sets.
- **Rich, harmonious palette**: natural earth tones, sunny ochres, leafy greens, and soft
  sky blues avoiding garish primaries.
- **Original artistic expression**: completely original geometry, proportions, and silhouettes;
  no trademarked toy branding or derivative commercial styles.

### World architecture

Several place names below came from brainstorming and are working names, not final branding.

- Discrete **orthographic 2.5D diorama areas** connected by scenic path transitions:
  1. _Bramblewick Yard_ (homestead, cottage, barn, garden, workshops).
  2. _Cottage Interior_ (kitchen, bedroom, hearth, calendar, storage).
  3. _Oakhaven Town_ (town square, shops, tavern, clinic, artisan yards).
  4. _The Grand Colosseum_ (arena floor, stables, grandstands), at the edge of Oakhaven.
  5. _Whispering Woods_ (timber reserve, wild foraging, ancient hollows).
  6. _Old Quarry & Mine_ (boulder fields, iron veins, deep tunnels).
  7. _Sunken Brook_ (fishing piers, reeds, watermill).
  8. _Ruin Hollows_ (dungeon exploration, ancient machinery).
- Path clearing: blocked routes (fallen timber, rockslides) require player and critter
  labor to permanently open.

### Presentation

- The diorama fills the screen; HUD panels float above it and never cover the rancher.
- The camera follows at a fixed orthographic angle with player zoom; each area continues
  past its fence as scenery, so spaces read as places rather than floating islands.
- Time of day, weather and seasons are visible in light, sky tint, precipitation and
  foliage; a gentle miniature focus and warm glows at night support the toy-diorama feel.
- Each kind of information has one place. An action's result appears just above the
  actions and fades; what it changed floats briefly over the rancher or companion. Stats
  live in the details panel (a chip with energy, hunger and bond on phones), where just-
  changed values glow. A finished drill's result holds its card's place for a moment, so
  taps meant for the drill never start another.
- On touch screens, holding a finger on the world walks toward it and releasing stops;
  a tap walks to a spot. There are no on-screen arrows.
- The journal opens on quests: what is worth doing today and the longer journey, each a
  reading of the save rather than stored state; history is grouped by day. When nothing
  is nearby, the HUD names the journey's next step.
- Learning has its own tab: each lesson's stage, progress and what the companion's growth
  now earns (a likelier third berry, finer berries, quicker hauling), plus practice levels.
  Reaching a stage shows a brief banner. Practice and autonomous work float over the
  companion like any other result.
- The companion fidgets when idle (looking around, stretching, sniffing, hopping), yawns
  when tired, begs when hungry, and reacts to a scritch, a meal and a drill's result.
- Storage shows one row per item with counts and compact moves, so it scales as item
  kinds grow.

### Viewport and interaction stability

The 3D world diorama is the heart of the experience. Opening, closing, or cycling nearby
interaction cards or bottom docks must **never** resize the Three.js viewport canvas or
alter its aspect ratio. Overlay controls remain strictly independent of the 3D scene
renderer.

---

## Narrative canon and household history

### Grandpa, Pip, and the player

- **The player**: a scripted protagonist, roughly 12–14 at the start, living with their
  grandparents. Only Grandpa has developed canon; do not invent Grandma's.
- **Grandpa's legacy**: Grandpa was once the grand champion of the Colosseum, and the
  town still knows him from markets and community life. The player grows up knowing him
  simply as loving Grandpa; his history surfaces through people and places, never
  front-loaded exposition.
- **Pip's origin**: Pip belongs to Grandpa, not the player. Pip is extraordinarily old—the
  pinnacle of Grandpa's lifetime of breeding, training, and care. That Grandpa spent his
  life's fortune on Pip is a later reveal; at first the player does not know where it went.
- **Pip's role**: Pip is not a novice starter. Pip demonstrates mature autonomous harvesting
  in the opening, guides the player, outlives Grandpa, and becomes an honored homestead
  mentor to the player's new generation of critters. Pip is a Brindlekin, the chimera lineage
  Grandpa bred, and the only one of his kind ([D44](DECISIONS.md#d44--pip-is-the-one-brindlekin-accepted-2026-10-02), [D49](DECISIONS.md#d49--brindlekin-is-a-chimera-lineage-accepted-2026-10-03)).
- **Pip after Grandpa**: Pip stays, for the ache of it and for its use. Pip keeps the
  routines once shared with Grandpa, visits and lingers at the spots Grandpa used to go,
  and teaches the player's critters basic learned jobs. The player inherits responsibility
  for Pip without erasing Grandpa's ownership history. Pip's lifespan is exceptional and
  never taken from a generic lifecycle table.
- **The passing of the torch**: Grandpa's death is fixed, scripted and unavoidable; no
  branch or optimization prevents it. It ends the guided childhood era and begins
  independent homestead management. Townspeople sometimes remark that the player carries
  Grandpa's spirit—sparingly, as community memory rather than hero worship.
- **The friendly cousin (undecided)**: A cousin of similar age might receive a starter
  around the same time as a friendly rival. This is a maybe, not canon
  ([D39](DECISIONS.md#d39--the-childhood-centers-on-grandpa-cousin-reopened-accepted-2026-10-02)).

### The years with Grandpa

The emotional heart of the game is losing Grandpa and carrying on: keeping his name
alive and learning, after he is gone, who he really was (comparable in intent to
_Ni no Kuni_). The childhood therefore spends its time developing Grandpa himself.

- **Length (provisional)**: two or three years of only spring and summer, using timeskips
  rather than hundreds of fully simulated days. The player's first winter comes after
  Grandpa's passing. Playtesting may lengthen or shorten this.

### Opening and acquisition

The opening teaches the game's fantasy through the world, not modal tutorials. The first
critter is chosen after a scripted walk into Oakhaven with Grandpa and Pip:

- **Pip picks berries** along the way, showing that critters perform jobs they have learned.
- **Gemothy** is met beside a garbage bin he has just knocked over.
- **Grandpa explains the ways to partner with a critter**: raising one, buying from a
  breeder, finding or bonding with a wild one, rescuing one, a breeding arrangement with
  another owner, and later gene technology. Not every path supplies a starter.
- **The offer**: three critters of different primary families. **Mallow**, met as an
  example along the walk, is always one of them, recast as Canine rather than Brindlekin; the other two families are drawn at random without duplicates. The player
  chooses exactly one ([D04](DECISIONS.md#decision-index)).
- **Home**: the group returns to the stead. After the first night, Grandpa guides the
  first real day of care, chores and training.

### Named critters

Pip and Gemothy are the only named story critters so far.

- **Gemothy** is a raccoon-like scavenger who belongs to no one. His name nods to
  Jimothy the raccoon and to Gemini, one of the tools that shaped this design. In the
  world's rules he is a chimera, somewhere between a bear crossed with a cat and a dog.
  The player may later find him again and perhaps convince him to join them. The
  reference is if-you-know-you-know; it need not land for everyone.
