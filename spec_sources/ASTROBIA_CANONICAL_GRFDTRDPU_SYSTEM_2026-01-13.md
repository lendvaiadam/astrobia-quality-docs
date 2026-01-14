# ASTROBIA — G-R-F-Tr-D-P-U SYSTEM SPECIFICATION (CANONICAL, ENGINE-LEVEL)
**Project:** Astrobia Demo 1.0  
**Status:** CANONICAL / ENGINE SOURCE OF TRUTH  
**Date:** 2026-01-13  
**Audience:** Claude Code (implementation + refactor guidance)  
**Scope:** The complete progression engine (G-R-F-Tr-D-P-U), economy & energy network, Dark Side (Mirror AI), multiplayer/trading/social rules, SimCore/physics integration points, and the *architecture* for Feature Modules.

> **Important architecture rule (canonical):**  
> This file defines the **engine**, **data contracts**, **events**, **UI interactions**, and **math**.  
> It does **NOT** contain "final feature behavior" documents. Every Feature's gameplay logic lives in **its own dedicated feature file** (one feature = one file), which becomes the source of truth for that feature.  
> This file may include **examples** to clarify contracts, but examples are not "final catalog".

---

## 0. How Claude Code should use this document

Claude should treat this as:
1) **Engine contract**: what data exists, how it flows, how it is persisted.  
2) **Non-negotiable rules**: formulas, caps, UI rules, event semantics.  
3) **Integration map**: where feature scripts plug in and what they must emit/consume.  
4) **Implementation guidance**: recommended (non-binding) code structure, risk notes, regression gates.

### 0.1 Non-binding vs binding
- **Binding (canonical):** anything labeled **CANONICAL RULE**, **MUST**, **MUST NOT**, **Formula**, **Cap**, **Definition**.
- **Non-binding (suggested):** anything labeled **Suggested implementation**, **Example**, **Option**.

---

## 1. Canonical vocabulary (Nouns) and strict meanings

### 1.1 Goal / Need
- **Goal** is the system-level object representing a newly recognized problem or opportunity, generated from events.
- A **Need Card** is the UI representation of a Goal.

**Canonical:** Goal == Need (same entity; "Need Card" is just UI).

### 1.2 Feature (capability module)
A **Feature** is the smallest functional capability block that can be:
- Invented (unlocked) or Extended (improved constraints)
- Trained (player skill -> global multiplier)
- Allocated inside a Type Blueprint (percent allocation)
- Instantiated into Units (effective stats computed)

**Canonical:** Feature logic exists as an **independent module** with its own file and interface.

### 1.3 Type Blueprint (Type)
A **Type** is a blueprint that:
- includes a set of features (presence/absence is meaningful)
- allocates 100% across included features
- optionally contains **nested allocations** inside some features (e.g., "shooting axis split")
- is versioned (Type versioning)

### 1.4 Unit Instance (Unit)
A **Unit** is a runtime entity in the world built from a Type.
- Units have per-instance tuning modifiers and state (HP, energy buffer, position, command queue, etc.).

### 1.5 Systems / Modules (SYS_*)
"System modules" (research/design/production/repair/etc.) are just **features** that unlock actions (jobs). They still follow the same registry & allocation model unless explicitly excluded.

---

## 2. Canonical documentation architecture (no feature behavior in this file)

### 2.1 Source-of-truth split (binding)
- **This file**: engine-level contracts + rules.
- **Feature files**: detailed gameplay behavior per feature.

### 2.2 Required feature file format (binding)
Every feature file MUST contain:
1) **Feature ID and purpose**
2) **Triggers (events consumed and emitted)**
3) **State model (state machine, if any)**
4) **Stats & constraints** (base stats, extendable constraints, defaults)
5) **Training mapping** (what training affects)
6) **Design mapping** (how allocation affects it; including nested allocations if relevant)
7) **Runtime integration** (required engine calls, data fields used, networking implications)
8) **UI hooks** (if any)
9) **Edge cases & test checklist**

### 2.3 Suggested repo structure (non-binding)
```
/docs
  /systems
    grfdtrdpu_system.md   (this file)
  /features
    /movement
      MOVE_ROLL.md
      MOVE_SWIM.md
      MOVE_FLY.md
      MOVE_TUNNEL.md
      MOVE_CLIMB.md
      MOVE_CARRY.md
    /combat
      WPN_SHOOT.md         (generic shooting feature, with modality notes)
      SUP_SHIELD.md
      SUP_STEALTH.md
      SUP_DECOY.md
    /economy
      ECO_GENERATOR.md
      ECO_DRILL.md
      ECO_EXCAVATOR.md
      ECO_TRANSMIT.md
    /systems
      SYS_RESEARCH.md
      SYS_DESIGN.md
      SYS_PRODUCTION.md
      SYS_REPAIR.md
```

---

## 3. Canonical decisions & conflict resolution log (binding)

This section resolves conflicting older specs. Claude MUST implement these final decisions.

### 3.1 Extend research multiplier (binding)
**Formula (canonical):**
- `ExtendMultiplier(Level) = 1.0 + (Level * 0.5)`
- **Cap:** `Level in [0..5]` -> max multiplier = `3.5x`

**Meaning (canonical):**
- Extend affects **constraints/limits** of a feature (e.g., maxAltitude, payloadMassLimit, subsurfaceScanRangeLimit, etc.).
- Extend is **feature-level** and applies wherever the extended constraint is used.

### 3.2 Training multiplier scope (binding)
- Training multipliers are **global per user** and **feature-specific**.
- **Canonical:** "Always multiply per feature."  
  (Training does not apply as a generic unit multiplier; it applies feature-by-feature.)

### 3.3 Design allocation semantics (binding)
- **Presence rule:** `0% allocation` means the feature is **not included** in the Type at all.
- **Minimum included allocation:** default is **25%**, but MUST be a configurable console value (e.g., `MIN_FEATURE_ALLOCATION = 0.25`).  
  If a feature is included, its allocation must be `>= MIN_FEATURE_ALLOCATION`.

#### 3.3.1 Allocation validation (binding)
If user attempts allocation `> 0` but `< MIN_FEATURE_ALLOCATION (25%)`:
- UI must **auto-round** to `MIN_FEATURE_ALLOCATION`
- Log warning: "Allocation rounded to minimum 25%"

### 3.4 Specialization bonus (binding)
- **Canonical:** The fewer distinct features a Type contains, the higher its **Specialization Bonus**.
- This bonus is applied in the Effective Stats pipeline (see Section 8).
- The curve MUST be monotonic: fewer features -> larger multiplier.

#### 3.4.1 Default values (configurable via calibration console)
| Features with allocation > 0 | Bonus Multiplier |
|------------------------------|------------------|
| 1 | +100% (2.0x) |
| 2 | +50% (1.5x) |
| 3 | +20% (1.2x) |
| 4+ | +0% (1.0x) |

**Console variables:**
- `SPEC_BONUS_1_FEATURE = 1.0`
- `SPEC_BONUS_2_FEATURES = 0.5`
- `SPEC_BONUS_3_FEATURES = 0.2`
- `SPEC_BONUS_4_PLUS = 0.0`

### 3.5 ECO_TRANSMIT energy loss (binding)
- **Canonical:** No distance-based loss in transmit.  
  Transmission defines connectivity/range only.

### 3.6 Blueprint trading (binding)
- Blueprints are **NOT transferred** as property.  
- Buyers purchase a **usage license** (permission to instantiate or refit from that blueprint), not ownership of the blueprint data.

### 3.7 Subsurface Scan and underground visibility (binding)
**Status:** Canonical.

**Why this exists:** underground entities (resources, tunnels, underground units) must be detectable *without* granting FogOfWar area to anything except the player's own sources. The player must never "see what others see."

**Rule:**
- **Subsurface Scan** is a *Perception sub-capability* (under the top-level **Perception** feature allocation).
- It provides a `ScanRange` in meters and produces **VisionSources** in the `SUBSURFACE_SCAN` channel.
- **Underground units** are rendered/indicated via Subsurface Scan while underground; **when they surface**, they become normal optical targets.

**Scope boundary:**
- The **Perception feature** computes only the range(s) and emits sources.
- The **FogOfWar / VisionSystem runtime service** consumes those sources and performs stamping/render/persistence.

**Modes:**
- **Continuous** by default (always active while the unit exists and has `PerceptionPercent > 0`).
- A later "pulse scan" variant is allowed but is **not** required now.

**Naming:**
- The earlier term "Radar" in older notes refers to this **Subsurface Scan** capability.
- **Radar (future)** is a separate capability for long-range coarse detection of surface units (see 3.7.1).

**Extend interaction:**
- Extend multiplies feature-by-feature: `effectiveScanRange = baseScanRange * allocationPercent * ExtendMultiplier`.
- Example: Perception allocation=50% (`0.5`) and Extend=+20% (`1.2`) -> `0.5 * 1.2 = 0.6` effective factor.

**Where it must be referenced:**
- In goals/needs: triggers that currently mention "radar for underground" must be renamed to **Subsurface Scan**.
- In docs and UI: show it as **Subsurface Scan** (or "Scan") under Perception.

### 3.7.1 Radar (future) - separate from Subsurface Scan
**Status:** Planned / not required for current implementation.

**Definition:** Radar is a *surface* detection layer that can reveal **coarse** information about distant units (e.g., "blips"), potentially including stealth interactions later.

**Important:** Radar must **not** be used as a synonym for Subsurface Scan. Subsurface Scan is the underground detection capability.

### 3.8 Social mode (binding)
- Multiplayer social is **Live co-op** visiting other players' asteroids.

### 3.9 "No named builds" rule (binding)
Avoid canonical naming that implies fixed feature sets (e.g., "Sniper", "Tank").
- These are *player-constructed* configurations, not feature IDs.
- The docs may use names as **examples**, but MUST label them "Example only; not a canonical entity".

### 3.10 Calibration principle (binding)
> [!IMPORTANT]
> All key thresholds and caps are **calibration-console variables**, not hardcoded values.

Examples of calibration variables:
- `MIN_FEATURE_ALLOCATION` (default 0.25)
- `SPEC_BONUS_*` (specialization bonus table)
- `EXTEND_LEVEL_CAP` (default 5)
- `EXTEND_MULTIPLIER_SLOPE` (default 0.5)
- `MAX_VISION_SOURCES` (default 64)
- `VISION_UPDATE_HZ` (default 30)

This allows tuning without code changes during development and balancing.

---

## 4. Data architecture (contracts) - canonical schemas

> **Rule:** These schemas are engine-level contracts.  
> Feature files can extend with feature-specific fields but MUST NOT break these core shapes.

### 4.1 Feature Registry entry
```json
{
  "id": "MOVE_ROLL",
  "category": "movement|combat|economy|system|support",
  "status": "LOCKED|UNLOCKED",
  "baseStats": {
    "statKey": 123
  },
  "constraints": {
    "constraintKey": 123
  },
  "extend": {
    "levelByConstraint": {
      "constraintKey": 0
    }
  },
  "training": {
    "highScore": 0,
    "globalMultiplier": 1.0
  },
  "code": {
    "modulePath": "src/features/movement/MOVE_ROLL.js",
    "docPath": "docs/features/movement/MOVE_ROLL.md"
  },
  "design": {
    "supportsNestedAllocation": false,
    "nestedAxes": null
  }
}
```

### 4.2 Goal / Need object
```json
{
  "id": "GOAL_INVENT_SWIM",
  "type": "INVENT|EXTEND",
  "triggerEvent": "COLLISION_WATER",
  "reward": {
    "featureId": "MOVE_SWIM",
    "constraintKey": null
  },
  "description": "Unit cannot traverse water. Invent swimming.",
  "status": "AVAILABLE|IN_PROGRESS|RESOLVED",
  "createdAt": 0
}
```

### 4.3 Research job
```json
{
  "jobId": "RJOB_001",
  "goalId": "GOAL_INVENT_SWIM",
  "researcherUnitId": "UNIT_CENTRAL_001",
  "type": "INVENT|EXTEND",
  "featureId": "MOVE_SWIM",
  "constraintKey": null,
  "energyCost": 123,
  "timeCostSec": 30,
  "progress01": 0.0,
  "status": "QUEUED|RUNNING|DONE|CANCELLED"
}
```

### 4.4 Training record (per user, per feature)
```json
{
  "userId": "USER_001",
  "featureId": "MOVE_ROLL",
  "highScore": 80,
  "globalMultiplier": 1.8,
  "updatedAt": 0
}
```

### 4.5 Type Blueprint
```json
{
  "typeId": "TYPE_ROVER_MK1",
  "version": 1,
  "features": [
    {
      "featureId": "MOVE_ROLL",
      "allocation01": 0.30,
      "nested": null
    },
    {
      "featureId": "PERCEPTION",
      "allocation01": 0.40,
      "nested": null
    },
    {
      "featureId": "WPN_SHOOT",
      "allocation01": 0.20,
      "nested": {
        "axes": {
          "power01": 0.33,
          "rate01": 0.33,
          "range01": 0.34,
          "accuracy01": 0.00
        },
        "defaultsAutoManaged": true,
        "shotIntervalDefaultSec": 3.0
      }
    },
    {
      "featureId": "SUP_SHIELD",
      "allocation01": 0.10,
      "nested": null
    }
  ],
  "visualSeed": 12345,
  "createdAt": 0,
  "updatedAt": 0
}
```

### 4.6 Unit instance
```json
{
  "unitId": "UNIT_123",
  "ownerUserId": "USER_001",
  "typeId": "TYPE_ROVER_MK1",
  "typeVersion": 1,
  "hp": 100,
  "energyBuffer": {
    "capacity": 50,
    "current": 50
  },
  "tuning": {
    "byFeature": {
      "MOVE_ROLL": { "torqueMult": 1.0 },
      "WPN_SHOOT": { "rateMult": 1.0 }
    }
  },
  "effectiveStatsCache": null
}
```

---

## 5. EventBus (canonical events + payload expectations)

> **Rule:** The GoalManager listens to EventBus. Feature modules MUST emit canonical events with correct payloads.

### 5.1 Movement & exploration triggers
- `COLLISION_WATER`
  - payload: `{ unitId, position, waterLevel }`
- `BLOCKED_BY_SLOPE`
  - payload: `{ unitId, position, slopeDeg, normal }`
- `FLIGHT_CEILING_HIT`
  - payload: `{ unitId, position, attemptedAltitude, maxAltitude }`
- `SCAN_UNKNOWN_RESOURCE`
  - payload: `{ unitId, position, depth, signature }`
- `INVENTORY_FULL`
  - payload: `{ unitId, inventoryState }`

### 5.2 Combat triggers
- `UNIT_DESTROYED_BY_INVISIBLE`
  - payload: `{ unitId, attackerHint, lastKnownImpact }`
- `UNIT_DESTROYED_INSTANTLY`
  - payload: `{ unitId, damageBurst, timeToKillSec }`
- `UNKNOWN_ATTACKER`
  - payload: `{ unitId, directionHint, damageTypeHint }`

### 5.3 Economy triggers
- `LOW_ENERGY_STATE`
  - payload: `{ empireEnergy, threshold }`
- `DISTANT_UNITS_OFFLINE`
  - payload: `{ count, regionHint }`

### 5.4 Dark Side triggers
- `DARKSIDE_CONTACT`
  - payload: `{ unitId, detectionType, position }`
- `WRECK_DETECTED`
  - payload: `{ wreckUnitId, position }`
- `WRECK_CAPTURED`
  - payload: `{ wreckUnitId, newOwnerFaction }`

---

## 6. The pipeline (Verbs) - full engine logic

### 6.1 G - Goal generation (Need cards)
**Canonical rule:** Needs are reactive and originate from events.

#### 6.1.1 GoalManager responsibilities (binding)
- Subscribes to EventBus.
- For each incoming event:
  1) map event -> candidate goals
  2) check FeatureRegistry state and current capabilities
  3) if missing capability or limit exceeded -> create Goal
  4) avoid spam: deduplicate active goals by `(type, featureId, constraintKey)` and cooldown windows

#### 6.1.2 Demo 1.0 Onboarding Sequence (binding)

The following mappings form the canonical discovery path for Demo 1.0:

| Trigger Condition | Need Label | Unlocked Feature ID |
|-------------------|------------|---------------------|
| Start: Central Unit cannot move | "Explore" | `MOVE_ROLL` |
| First mobile unit sees surface Matera protruding | "Discover Matera" | `PERCEPTION_SUBSURFACE_SCAN` |
| Subsurface Scan finds underground Matera mass | "Gather Matera" | `MATERA_MINING` |
| Matera Mining exists (pile accumulates) | "Collect Matera" | `MATERA_TRANSPORT` |
| Encounter height difference / terrain control pressure | "Surface Control" | `TERRAIN_SHAPING` |
| Player creates a non-mobile unit design | "Deploy Unit" | `UNIT_CARRIER` |
| First enemy appears | "Combat Capability" | `WPN_SHOOT` |

> **Canonical reference:** See `ASTROBIA_CANONICAL_MASTER_BIBLE_2026-01-13.md` for the full Goal/Need→Feature table and Starting Central Unit allocation.

#### 6.1.3 Additional Example Mappings (non-binding for exact content)
- `COLLISION_WATER` -> `GOAL_INVENT_SWIM` (Invent MOVE_SWIM)
- `BLOCKED_BY_SLOPE` (slope>60) -> `GOAL_INVENT_CLIMB` (Invent MOVE_CLIMB)
- `FLIGHT_CEILING_HIT` -> `GOAL_EXTEND_FLIGHT` (Extend MOVE_FLY.maxAltitude)
- `UNIT_DESTROYED_BY_INVISIBLE` -> `GOAL_INVENT_SUBSURFACE_SCAN` (Invent PERCEPTION_SUBSURFACE_SCAN)
- `UNIT_DESTROYED_INSTANTLY` -> `GOAL_INVENT_SHIELD` (Invent SUP_SHIELD)
- `SCAN_UNKNOWN_RESOURCE` (underground) -> `GOAL_INVENT_MINING` (Invent MATERA_MINING)
- `INVENTORY_FULL` -> `GOAL_INVENT_TRANSPORT` (Invent MATERA_TRANSPORT)

> Note: Exact Feature IDs for combat/economy are defined in their own feature files.  
> This file defines the mapping mechanism and the event semantics.

#### 6.1.3 UI behavior (binding)
- Needs appear as **cards** in a "Needs List" sidebar.
- Each card:
  - shows a short description
  - shows type: Invent vs Extend
  - shows estimated cost (energy/time) if known
  - is draggable

---

### 6.2 R - Research (Invent & Extend)

#### 6.2.1 Interaction (binding)
1) Player drags a Need Card.
2) System highlights units that can accept the card:
   - units containing the `SYS_RESEARCH` capability (Research-capable)
3) Player drops card onto a valid unit.
4) A research job is created and queued on that unit.

#### 6.2.2 Invent (binding)
- Precondition: feature status is `LOCKED`.
- Completion effect: `FeatureRegistry[featureId].status = UNLOCKED`.

#### 6.2.3 Extend (binding)
- Precondition: feature status is `UNLOCKED`.
- Completion effect: increment Extend level for the referenced constraint:
  - `FeatureRegistry[featureId].extend.levelByConstraint[constraintKey] += 1` (cap at 5)

**Canonical multiplier formula:**  
`ExtendMultiplier(Level) = 1.0 + Level*0.5`, cap Level 5.

#### 6.2.4 Costs and progress (binding)
- Research consumes:
  - **Energy** (from global pool when connected; else from local buffer if permitted by economy rules)
  - **Time** (job duration seconds)
- UI shows:
  - processing animation on unit
  - progress bar above the unit
  - job status in a per-unit job queue panel

---

### 6.3 Tr - Training (Player skill, global per feature)

#### 6.3.1 Entry (binding)
- Feature Registry UI:
  - select feature
  - press "TRAIN"
- Loads `SCENE_TRAINING` (isolated "holodeck" training scene).

#### 6.3.2 Session (binding)
- Duration: **60 seconds** (or feature file can specify a completion-based variant; must be explicit there).
- Output: score `0..100`.

#### 6.3.3 Global multiplier (binding)
`GlobalTrainingMultiplier = 1.0 + (HighScore / 100)`

- Scope: **per user, per feature**
- Applies to **all** units that use that feature.

#### 6.3.4 Persistence (binding)
- Store highest score only (unless feature file requires history).
- Recompute multiplier immediately.

---

### 6.4 D - Design (Type creation + allocation)

#### 6.4.1 Actor (binding)
- A unit with design capability (`SYS_DESIGN`) is required to edit/store blueprints.

#### 6.4.2 Blueprint slots (binding)
- Slot capacity depends on how much allocation the designer unit dedicates to its design capability.

**Formula:** `Slots = floor(DesignAllocationPercent / 25%)`

- Example: 50% -> 2 slots.

#### 6.4.3 Feature inclusion (binding)
- A feature is included in a Type only if it has allocation > 0.
- **Minimum included allocation**: configurable, default 25%.

#### 6.4.4 Allocation totals (binding)
- Sum of allocations across included features must equal exactly **100%**.

#### 6.4.5 Nested allocations inside a feature (binding capability; exact axes defined per feature)
Some features may expose nested axis allocation. Canonical example: "Shooting axes".
- The Type allocates X% to the feature.
- Inside that X%, the player can allocate axes (e.g., power/rate/range/accuracy).
- Axis allocations must sum to 100% of that feature's internal budget.

**Default handling rule (binding):**
- If user never edits nested axes, feature uses default axis split.
- If new axes are introduced later (e.g., adding Accuracy after launch), the system must apply an explicit migration rule (see 6.4.6).

#### 6.4.6 Adding a new nested axis (migration rule; binding)
When a feature gains a new axis (e.g., Accuracy):
- If `defaultsAutoManaged == true` and user has not manually edited:
  - defaults rebalance equally across all axes.
  - Example: 3 axes at ~33% -> 4 axes at 25% each.
- If the user has manually edited:
  - **Suggested (non-binding default):** preserve existing ratios and introduce the new axis at 0%, mark "needs review".
  - Feature file may specify a different binding migration rule, but it must be explicit.

---

### 6.5 P - Production (Build + Refit)

#### 6.5.1 Locality rule (binding)
Production occurs **at the world position** of a unit that has production capability (`SYS_PRODUCTION`).
There is **no global build menu**.

#### 6.5.2 Build vs Refit (binding)
- **BUILD:** creates a new Unit from a Type (current version unless user selects older).
- **REFIT:** updates an existing Unit to a newer Type version.

Refit requirements:
- Target unit must be within a defined radius of the producer (range defined by production feature file).
- Cost is "delta complexity" (engine defines that delta mechanism).

#### 6.5.3 Production queues (binding)
- Each production-capable unit maintains its own queue.
- Parallel production requires multiple producer units.

---

### 6.6 U - Unit lifecycle (runtime + tuning)

#### 6.6.1 Tuning (binding)
A repair-capable unit can apply a "Tuning Job":
- targets one unit instance
- applies a **permanent** stat modifier (per feature or per stat) to that unit only
- does not change the Type blueprint

#### 6.6.2 Wreck state (binding)
- When HP reaches 0, the unit becomes a **WRECK** (not fully deleted) unless feature file specifies exceptions.
- Wrecks are interactable objects for capture/repair mechanics.

---

## 7. Economy & Energy network (canonical)

### 7.1 Matera
- Matera is the raw resource.
- Matera has colors (zone/asteroid dependent).
- Matera exists as items used by economy features.

### 7.2 Energy generation
- Generators consume Matera and produce Energy.

**Canonical:** Generator uses **two input slots**:
- If input colors are complementary -> **200% efficiency**
- Otherwise -> 100%

### 7.3 Hybrid global/local energy model (binding)

#### 7.3.1 Global pool
- Empire has one global Energy pool (top-bar UI).
- Connected units draw from the pool.
- Connected generators feed into the pool.

#### 7.3.2 Coverage network (Transmitters)
- Units are "Connected" if within range of:
  - central station connectivity, or
  - an energy transmitter feature

**Canonical:** no distance loss, only connectivity.

#### 7.3.3 Local buffer
Each unit has a small internal battery:
- When disconnected, the unit draws from local buffer.
- When buffer reaches 0, the unit becomes **OFFLINE**:
  - immobile
  - cannot execute commands
  - can only run explicitly allowed passive actions (e.g., self-repair if defined)

#### 7.3.4 Reconnection
When reconnected:
- unit can recharge local buffer (rules defined by energy feature files)
- resumes commands based on command queue state.

---

## 8. Effective stats pipeline (canonical math)

### 8.1 Key rule: multiply per feature (binding)
Every computed stat is computed in a feature-specific way. Do not apply a single global multiplier to everything.

### 8.2 Canonical formula (binding template)
For each feature `F` on a unit `U`, each effective stat `S` is:

```js
EffectiveStat(U,F,S) =
  BaseStat(F,S)
  * AllocationMultiplier(Type,U,F,S)
  * SpecializationBonus(Type,U) 
  * ExtensionMultiplier(F, constraintKey, level)
  * TrainingMultiplier(userId, F)
  * TuningMultiplier(U, F, S)
  * ContextMultiplier(U, F, S) // e.g., slope, environment, connectivity
```

Where:
- `ExtensionMultiplier` uses the canonical Extend formula and cap.
- `TrainingMultiplier` is global per user per feature.

### 8.3 Specialization bonus (binding behavior, configurable curve)
SpecializationBonus depends on how many features a Type includes.

**Binding behavior:**
- Let `n = number of included features in Type`.
- Bonus MUST increase as `n` decreases.

**Default curve (see 3.4.1):**
- 1 feature = +100% (2.0x)
- 2 features = +50% (1.5x)
- 3 features = +20% (1.2x)
- 4+ features = +0% (1.0x)

### 8.4 Allocation multiplier details (binding rules)
- Allocation is per feature presence.
- 0% = not included.
- included allocations must sum to 100%.
- Feature files define whether allocation maps linearly to stats or uses a nonlinear curve.

### 8.5 Nested axes (binding)
If a feature exposes nested axes:
- Effective stats for that feature additionally multiply by the axis allocation.
- Axis mapping is feature-defined.

**Canonical example mapping concept for "Shooting":**
- `Power` affects effect per shot
- `Rate` affects shots per second / shot interval
- `Range` affects effective distance
- `Accuracy` affects spread / aim error model

(Exact firing model modalities and ballistic rules live in the feature file.)

### 8.6 Command Queue Timeline (binding)

This section defines the **Command Queue Timeline** - a time-based, multi-lane editor for scheduling unit actions. It is inspired by After Effects: each Unit is a row, expandable into multiple lanes representing Action Feature categories.

> [!IMPORTANT]
> The Command Queue Timeline is the canonical scheduling mechanism for all Action Features.

---

#### 8.6.1 Timeline time model (binding)

**Fixed playhead, scrolling content:**
- The timeline UI has a vertical **"Now" line (playhead)** that is **fixed** in the viewport.
- Timeline content scrolls **right-to-left** as time passes:
  - Right of Now = future
  - Left of Now = past
- **Zoom** changes the time-to-pixel scale (seconds-per-pixel).

**Estimation + elastic stretch:**
- All future clip lengths are **estimates**, because real events can cause drift (blocked by obstacle, detour, etc.).
- If an action's estimated end would pass the Now line but the action is **not actually finished**, then:
  - The clip end is **held and stretched** rightward until real completion.
  - Downstream clips **ripple-shift** accordingly.
- **Critical invariant:** The clip end **never crosses Now prematurely**.

---

#### 8.6.2 Per-unit PLAY/PAUSE (binding)

Each Unit row has a **PLAY/PAUSE toggle**:

- **If PLAY:** The unit's queue advances in time (content scrolls left with global timeline flow).
- **If PAUSE:** The unit's queue is frozen:
  - Future events do not approach Now.
  - The unit row appears "stopped in time" while other playing units continue.

**Semantics:**
- Global time always moves.
- Each unit has a **local queue clock** that advances only when PLAY is active.
- Edits apply immediately; no "save button" required (autosave handles persistence).

---

#### 8.6.3 Lane taxonomy (binding)

**Canonical lanes for Demo 1.0:**

| Lane ID | Contains | Exclusivity |
|---------|----------|-------------|
| LOCOMOTION | MOVE_ROLL, UNIT_CARRIER, MATERA_TRANSPORT (+ future: MOVE_SWIM, MOVE_FLY, MOVE_CLIMB, MOVE_TUNNEL) | In-lane mutual exclusion |
| PERCEPTION | OPTICAL_VISION (passive), SUBSURFACE_SCAN (toggleable action) | Sub-capabilities share Perception % |
| TOOL | TERRAIN_SHAPING, MATERA_MINING (+ future: construction, repair) | In-lane mutual exclusion |
| WEAPON | WPN_SHOOT | In-lane mutual exclusion |

**Concurrency rules:**
- **Within a lane:** Actions are **mutually exclusive** (cannot overlap in time).
- **Across lanes:** May run in **parallel**, governed by feature constraint flags:
  - `canRunWhileMoving` (e.g., shooting while moving)
  - `requiresStationary` / `blocksLocomotion` (e.g., mining requires stationary)
- If conflicting, the constrained action **does not execute** during the conflict interval.

---

#### 8.6.4 Action features vs passive features (binding)

- **Action feature:** Creates time-bounded actions (movement, shooting, mining, etc.). Eligible for Command Queue lanes.
- **Passive feature:** Always-on, does not create queued actions (e.g., Perception/Optical Vision).

**Only Action Features may appear as clips on the Command Queue Timeline.**

---

#### 8.6.5 Waypoint scheduling model ("Gummy Targets") (binding)

Movement is authored as a **sequence of waypoints** placed on the map.

**Fundamental unit:**
- A "movement action" is the segment between two consecutive waypoints: `Waypoint[i] -> Waypoint[i+1]`.
- Clip duration is estimated from: `distance / current_speed_estimate` (may stretch if delayed).

**Waypoint semantics:**
- Each waypoint is a location event with two states:
  - **Instant departure (default):** Shown as a small point (0 wait).
  - **Wait:** Shown as a stretched segment (a "gummy" band).
- The waypoint on the timeline represents the moment when **waiting ENDS** (the "release moment").

**Editing mechanics ("gummy stretch"):**
- **Drag the right edge:** Increases/decreases wait duration.
  - Dragging right -> increases wait (point becomes band).
  - Dragging left -> decreases wait (trim).
- **Drag the clip body:** Reorders/moves the segment in sequence.
  - Causes waypoint order change -> route recompute -> duration re-estimate.
- **Left edge is anchored:** "Sticks" to prior event (left-gravity).

---

#### 8.6.6 Map vs Timeline authoring (binding)

**Map-first principle:**
- **New waypoints are created on the map only** (via "place waypoint" mode).
- **The timeline cannot add waypoints** - only reorder and adjust waits.

**Insert policy:**
- User can only **append** new actions at the end (via map inputs).
- Then **reorder** on the timeline.
- There is **no "insert at current time"** creation workflow on the timeline.

**Live preview:**
- While dragging a waypoint on the map, UI should provide a live preview of updated route and duration estimates (partial/approx preview acceptable if full recompute is expensive).

---

#### 8.6.7 Path edit effects (binding)

**Any waypoint manipulation triggers:**
1. Path re-planning (geometry update)
2. Timeline re-planning (duration estimates update)

**Future-only rewrite:**
- Edits rewrite the timeline **from current moment forward** for that unit.
- Past does not rewind.
- Past items eventually disappear and are not editable.

**Ripple editing:**
- If user extends a wait, changes waypoint order, or changes positions:
  - All subsequent planned items **shift (ripple)** accordingly.

**Live duration correction:**
- Movement segment duration is estimated up front, but **continuously corrected**:
  - If unit won't arrive by estimated end -> segment is stretched as it runs.
  - Downstream items shift.

---

#### 8.6.8 Repeat region markers (binding)

**Loop toggle:**
- Each unit has a **loop/repeat toggle** next to Play/Pause.
- When enabled, the unit repeats its planned action sequence **indefinitely** until user stops it.

**Repeat markers:**
- User can mark a **repeat start** and **repeat end** on the unit's queue.
- The segment loops indefinitely until disabled.

**Loop construction:**
- At the moment loop is enabled:
  - System takes upcoming planned actions (future sequence).
  - Ensures they connect into a repeatable chain.
  - For movement: adds/ensures a path from last point back to first (closing the loop).
  - Then repeats.

**Past is not rewindable:**
- Executed actions are not scrubbed back or replayed.
- Past disappears; only future planning matters.

**Map-side equivalent:**
- Loop can be created by clicking from last waypoint back to first waypoint (closing the route).

---

#### 8.6.9 Direct Control integration (binding)

**Entering Direct Control:**
- **Pauses the Command Queue** (all lanes) for that unit.

**During Direct Control:**
- Unit accepts **direct movement input** (keyboard/gamepad) producing a `MoveIntent`.
- Queued actions do not advance.

**Exiting Direct Control:**
- Queue **remains PAUSED** until player presses **PLAY**.

**Resume behavior (critical):**
- When player presses PLAY after Direct Control:
  1. Engine computes a **return path** from current position to queued plan.
  2. Unit follows return path to re-attach (movement lane active).
  3. Once re-attached, queue continues from paused position.
- "Return to path" is **internal only** - not represented as a visible clip on timeline.

**Binding constraint:**
- Return/re-attach logic must preserve **Command Queue Integrity** (9.4) - no backwards waypoint progression.

---

#### 8.6.10 Tick scheduling responsibility (binding)

Who decides what runs on a tick?

**Process:**
1. Determine active action per lane at time `t` (based on playhead position, lane state, cooldowns).
2. For each active action, call owning feature's `tick/update` to produce:
   - Intents (e.g., `MoveIntent`)
   - Direct world effects (e.g., fire event spawn, mining extraction)
   - Emitted `GameEvents`
3. Resolve conflicts:
   - In-lane conflicts must not exist (engine/UI prevents).
   - Cross-lane conflicts resolved by declared constraints (feature-defined).

> **Implementation note (suggested):** Treat each lane as a small state machine producing per-tick "requests"; unit aggregates and applies in deterministic order.

---

#### 8.6.11 MoveIntent and locomotion selection (binding)

The movement lane produces a `MoveIntent`. The unit selects **exactly one active locomotion feature** to satisfy it at a time.

**Selection based on:**
- Active movement action in LOCOMOTION lane
- Environment constraints (e.g., water contact)
- Feature availability

**If no locomotion feature can satisfy intent:**
- Unit enters blocked state
- Emits appropriate `GameEvent` (e.g., `COLLISION_WATER` -> invent swim)

---

#### 8.6.12 Persistence and autosave (binding)

**Save everything relevant:**
- Unit queue plan (waypoints, order, waits, loop state, play/pause state)
- Lane items
- Feature action schedules
- Tuning parameters

**Autosave during editing:**
- Tick-based autosave is acceptable.
- Editor changes must be durable (not only on exit).

---

#### 8.6.13 Continuous along-the-path actions (conceptual)

A class of actions exists that:
- Runs continuously over time
- Produces results proportional to elapsed time
- May be keyframed at waypoints

**Example:** `TERRAIN_SHAPING` sets target terrain values at waypoints. As unit traverses (especially in loop), each pass nudges current state toward targets (incremental convergence).

This pattern defines:
- Why timeline needs continuous actions
- Why loop matters
- Why lane concurrency/constraints must exist

---

## 9. SimCore / Physics integration points (canonical)

This section defines the engine constraints required by multiple features (movement first).

### 9.1 Spherical coordinate basis (binding)
- `Up` = normalized vector from planet center to unit position (or smoothed terrain normal if terrain displacement exists).
- `Forward` = projected velocity direction on tangent plane.
- `Right` = cross(Up, Forward).

### 9.2 Tangent-space movement (binding)
All movement forces and velocities MUST be computed in tangent space (surface plane) unless a feature explicitly changes locomotion mode (e.g., flight).

### 9.3 Slope physics rules (binding)
- 0-10 degrees: stable
- 10-40 degrees: speed penalty (suggested `speed *= cos(slope)`; exact in movement files)
- 40-60 degrees: critical; uphill requires torque; downhill may boost speed
- >60 degrees: blocked for standard rolling locomotion (unless climb/flight etc.)

### 9.4 Command queue integrity (binding)
When map/path geometry changes, units must not "get lost".

**Canonical mechanism:**
- Unit tracks:
  - `LeftWaypointID` (last passed)
  - `ApproachWaypointID` (next target)
- If spline changes:
  - unit computes a "join path" from current position to the new spline segment forward of `LeftWaypointID`
  - unit MUST NOT move backward in waypoint sequence.

(Full movement-specific details belong in movement feature docs; this file defines the invariant.)

---

## 10. Dark Side (Mirror AI) - canonical behavior

### 10.1 Location and fog
- Dark Side exists on opposite hemisphere.
- Initially hidden by Fog of War.

### 10.2 Mimicry (binding)
- AI periodically polls player's **Total Military Value**.
- AI spawns/builds counter-value units to match or slightly exceed.

### 10.3 Raids (binding)
- AI periodically sends raid parties to player hemisphere.
- Raid frequency can scale with player threat.

### 10.4 Capture mechanic (binding)
- Player unit reaching 0 HP becomes a WRECK.
- Dark Side repair drones attempt to "heal" wreck.
- If repaired to 100% -> wreck flips allegiance to Dark Side.

Player counterplay:
- repair wreck first OR destroy wreck to deny capture.

### 10.5 Goal pressure (binding)
- Dark Side threats generate combat needs via the Goal system (events).

---

## 11. Multiplayer, trading, social (canonical)

### 11.1 Tradable categories (binding)
- **Units:** Selling pre-built, tuned units ("mercenaries").
- **Matera:** Selling specific colors for complementary energy bonus.
- **Blueprint license:** purchase a **usage right**, not ownership.

### 11.2 Blueprint license rules (binding)
- License grants:
  - right to build units from that Type blueprint (or refit to it)
- License does NOT grant:
  - right to export blueprint data
  - right to resell blueprint itself

### 11.3 Live co-op visiting (binding)
- Players can visit other players' asteroids in live co-op.
- Co-op may include:
  - helping against Dark Side raids
  - shared activities by permission

### 11.4 Security and authority (binding expectations)
- Ownership/permissions must be enforced at the server layer (even in early demos with minimal backend, rules must be explicit).
- Host/client authority model is implementation detail, but trades/licensing must be secure.

---

## 12. Onboarding flow (canonical)

1) Central unit lands.
2) Player scans.
3) System detects no movement units available -> creates `Need: Invent Movement`.
4) Player researches movement.
5) Training prompt appears for that feature.
6) Player designs first Type.
7) Production builds first rover.
8) Exploration triggers new needs (water, cliffs, underground resources), looping the system.

---

## 13. Implementation plan & checklist (canonical priorities)

### 13.1 Phase 1 - Engine Core (MUST)
- FeatureRegistry: data structure + persistence
- EventBus: canonical events and routing
- GoalManager: event->need mapping + dedupe
- ResearchManager: DnD, job queues, invent/extend, costs
- TrainingManager: training scene stub, score persistence, multiplier
- DesignManager: type storage, slot rules, allocation rules, nested axes support
- StatsEngine: effective stat computation per feature
- ProductionManager: locality rule, build/refit, queues
- EnergySystem: global pool, coverage, local buffer, offline state
- DarkSideAI: mimicry + raid + wreck capture

### 13.2 Phase 2 - Feature files (MUST, sequential)
- Create **one feature file per feature**, starting with movement:
  - movement is first, because it touches SimCore + physics + command queue invariants.
- Next: shooting (generic), then radar/stealth/shield, then economy features.

### 13.3 Regression gates (binding)
Before merging any major feature:
- Goal generation still works (no spam, correct dedupe)
- Extend cap respected (max level 5)
- Allocation rules enforced (sum=100, 0% absent, min allocation)
- Training multiplier applies per feature and persists per user
- Energy network offline behavior deterministic
- Command queue integrity preserved under path edits

---

## 14. Notes for Claude: what NOT to do (binding)

- Do NOT treat "Sniper" or "Tank" as canonical entities.
- Do NOT hardcode feature logic into this system file; create feature docs/files.
- Do NOT introduce distance loss in ECO_TRANSMIT.
- Do NOT apply a single global multiplier for all stats; multiply per feature.
- Do NOT allow blueprint data transfer as property; only license rights.

---

## 15. Cross-references

### LOCOMOTION Lane
- `ASTROBIA_CANONICAL_FEATURE_MOVE_ROLL_2026-01-13.md`
- `ASTROBIA_CANONICAL_FEATURE_UNIT_CARRIER_2026-01-13.md`
- `ASTROBIA_CANONICAL_FEATURE_MATERA_TRANSPORT_2026-01-13.md`

### PERCEPTION Lane
- `ASTROBIA_CANONICAL_FEATURE_PERCEPTION_OPTICAL_VISION_2026-01-13.md`
- `ASTROBIA_CANONICAL_FEATURE_PERCEPTION_SUBSURFACE_SCAN_2026-01-13.md`

### TOOL Lane
- `ASTROBIA_CANONICAL_FEATURE_TERRAIN_SHAPING_2026-01-13.md`
- `ASTROBIA_CANONICAL_FEATURE_MATERA_MINING_2026-01-13.md`

### WEAPON Lane
- `ASTROBIA_CANONICAL_FEATURE_WPN_SHOOT_2026-01-13.md`

### Other canonical docs
- `ASTROBIA_CANONICAL_VISION_MAX_SOURCES_POLICY_2026-01-13.md`
- `ASTROBIA_CANONICAL_MASTER_BIBLE_2026-01-13.md`
- `ASTROBIA_CANONICAL_REFACTOR_PROCESS_2026-01-13.md`