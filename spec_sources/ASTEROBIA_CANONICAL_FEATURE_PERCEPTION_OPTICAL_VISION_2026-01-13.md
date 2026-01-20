# Asterobia — FEATURE FILE SPEC
## Perception Feature (Optical Vision + Fog of War Integration)
**Status:** CANONICAL (implementation-spec source for Claude Code)  
**Last Updated:** 2026-01-12  
**Scope:** This document specifies **how to refactor and implement the current Vision/Fog-of-War functionality as a Feature** while preserving all existing behavior, and how it must integrate with the World-level Fog-of-War renderer/service.  
**No summarization:** This file is intentionally exhaustive.

---

## 0) Why this file exists

Asterobia’s long-term architecture requires that **each Feature’s code lives in its own dedicated file** (e.g., Movement already started with `MOVE_ROLL.md`, and later Shooting, Mining, etc.). The current “Vision” behavior exists partly as a runtime system (`VisionSystem`) and partly as a renderer/service (`FogOfWar`). This file defines:

1) **The boundary**: what remains a World service vs. what becomes Feature logic.  
2) **The full behavior contract**: so Claude can refactor without breaking semantics.  
3) **The Perception feature model**: “Vision” is a *sub-capability* inside a top-level **Perception** feature (future-proof for Scan/Heat/Sound/Radar).

---

## 1) Canonical decisions (from chat; non-negotiable)

### 1.1 Perception vs. Vision naming (feature taxonomy)
- The top-level feature that receives an allocation percentage in the Type Designer is: **Perception**.
- The capability previously called “Vision” becomes **Optical Vision** inside Perception.
- **Rename requirement:** any occurrence of “Radar” that previously meant “subsurface sensing” must be renamed to:
  - **Subsurface Scan** (preferred full name), or
  - **Scan** (short form).
- A separate, later feature may be named “Radar” again, but that is **not** the subsurface scan described here.

### 1.2 Perception/Vision is passive
- **Perception is passive**: it does **not** appear on a Command Queue lane.
- It is **continuously in effect** (subject to update throttling), and it affects Fog-of-War state.

### 1.3 Vision only means range
- For Optical Vision, the only numeric stat is **VisionRange** (meters).  
- Optical Vision does **not** include stealth logic, accuracy, targeting, etc. (those belong elsewhere).

### 1.4 Baseline calibration rule (important)
- The current in-game Vision value/behavior is treated as **“50% Perception allocation”**.
- Therefore:
  - A Type that allocates **50%** to Perception should see **approximately what the game sees today** (baseline).
  - A Type that allocates **100%** to Perception should have **~2×** that baseline VisionRange.
- All of this must be **calibratable via dev console variables**, because final values must be tuned later.

### 1.5 Extend scaling rule (global canon; overrides earlier drafts)
Extend upgrades apply **per feature** as a feature-level multiplier.

- **Formula:** `ExtendMultiplier = 1.0 + (Level * 0.5)`
- **Scale:** Linear
- **Meaning:** Each Extend level increases the *feature’s* applicable limit by **+50%**.
- **Cap:** `Level <= 5` → maximum `ExtendMultiplier = 3.5×`
- This multiplier must be applied to Optical Vision’s **VisionRange** as well:
  - Example: basePerceptionAllocation=0.5 and Extend=+20% is expressed as `0.5 × 1.2 = 0.6` (see §5.4).

### 1.6 Allocation semantics (0% and minimum step)
- **0% means the feature is not present** in the Type.
- There is a minimum allocation step of **25%** *when the feature is present*, but this minimum must be **configurable via console variable** (so it can change later).

### 1.7 Specialization bonus is required
- **Yes, specialization bonus is required.**
- Rule of thumb: **the fewer top-level features a Type uses, the higher the specialization and the larger the specialization bonus.**
- The exact formula can be treated as a “canonical knob” (see §5.6) but must exist as a multiplier in Effective Stats.

### 1.8 Fog-of-War visibility ownership (critical for multiplayer)
- The local player must **only see what their own units see**.
- Other units (enemy/neutral/other players) may appear/disappear based on being in visible space, but:
  - **They do not create Fog-of-War** in the local player’s FOW textures.
- This implies a **team/ownership filter** must exist in source collection, even if the game currently has only one team.

### 1.9 Multiplayer persistence requirement (explored state)
- The game must be able to evolve into multiplayer where:
  - the player can return later and still see their explored world,
  - the world state is backend-stored,
  - the frontend periodically autosaves and/or saves on “save&exit”.
- Therefore, **GPU-only explored state that is never persisted is not acceptable long term**.
- This file defines required persistence hooks and one recommended implementation strategy.

---

## 2) Current implementation audit (verified by Antigravity)

### 2.1 Call site & scope
- `src/Core/Game.js` calls (in `Game.update()` / main loop):
  - `this.visionSystem.update(this.units, this.camera, performance.now());`
- `this.units` contains **all loaded units in the world**.
- Current `VisionSystem.collectSources()` has **no ownership filtering**.
- Therefore in its current form, if many enemy units are present, they could consume maxSources and suppress the player’s own stamps. This must be fixed.

### 2.2 Current pipeline in `src/SimCore/runtime/VisionSystem.js`
- Iterates all units passed in.
- Filters `visionPercent > 0`.
- Computes UV.
- Sorts by distance to **active camera**.
- Slices to `config.maxSources`.
- Adds seam-wrapped duplicates (UV +/- 1).
- Hard clamps to 256 in GPU buffer upload.

### 2.3 Deterministic ordering problem (must fix)
Current sort:
```js
sources.sort((a,b) => a.distToCamera - b.distToCamera)
```
This is **unstable** when two sources have equal distance (browser-dependent ordering).

**Required fix:** add a stable tie-breaker:
- primary: `distToCamera` ascending
- secondary: stable `unitId` (or stable `sourceId`) ascending

---

## 3) What must remain World-service vs what becomes Feature logic

### 3.1 World service remains: Fog-of-War renderer/service
**FogOfWar** stays a world-level service responsible for:

- Owning GPU render targets:
  - `visibleTarget` (cleared each update, shows what is visible “now”)
  - `exploredTarget` (accumulates over time; “once seen always explored”)
- Owning stamp rendering implementation:
  - Instanced mesh (or equivalent) stamping
  - soft edge / falloff
  - render passes and blend modes
- Owning shader hookups:
  - binding textures to planet/water/starfield materials
  - uniform naming contract
- Owning resolution and texture format decisions

**FogOfWar is not a Feature**. It is a **world visualization + visibility data store**.

### 3.2 Feature becomes: Perception (Optical Vision now; more later)
Perception Feature is responsible for:

- Computing **effective Perception allocation** and deriving Optical Vision’s effective **VisionRange**.
- Producing **VisionSources** that represent the unit’s perception contributions:
  - position + radius + channel/mode
- (Future) producing additional channels:
  - Subsurface Scan
  - Thermal Gradient Tracking
  - Acoustic Bearing
  - Radar (later; separate from Scan)

Perception Feature does **not** own GPU stamping code. It only supplies data.

### 3.3 The “collector/aggregator” location (chosen architecture)
A world/runtime system should continue to exist as the **collector** (can keep name `VisionSystem` short-term or rename to `PerceptionSystem`):

- It iterates units, asks their PerceptionFeature to contribute VisionSources, filters by ownership, applies caps, and hands a normalized array to FogOfWar.
- The collector is a thin coordinator; PerceptionFeature contains all feature-level math and semantics.

This matches the desired style:
- World runtime systems orchestrate.
- Feature files define feature behavior and stats.

---

## 4) Canonical data contract: VisionSource

A stable contract is required because new Perception channels will be added later.

### 4.1 VisionSource fields (minimum)
Each VisionSource MUST include:

- `sourceId` (string or int)
  - stable and deterministic across frames
  - recommended: `${ownerId}:${unitId}:${channel}`
- `ownerId` (or `teamId`)
  - used for filtering “my vision only”
- `worldPos` (Vector3)
- `radiusMeters` (number)
- `channel` (enum / string)
  - now: `OPTICAL_VISION`
  - later: `SUBSURFACE_SCAN`, `THERMAL_TRACKING`, `ACOUSTIC_BEARING`
- `timestampMs` (optional; for debugging / throttling)

### 4.2 Explored semantics coupling
Current behavior is:
- `visibleTarget` is redrawn each update.
- The same visible pass is additively accumulated into `exploredTarget`.

Therefore:
- “Explored” is currently derived from “Visible” automatically by FogOfWar.
- PerceptionFeature does not decide explored vs visible; it supplies visible stamps.
- If later you need different explored rules, that will be a FogOfWar policy change, not a PerceptionFeature change.

---

## 5) Perception / Optical Vision stat model (how range is computed)

### 5.1 Inputs that can affect effective VisionRange
Optical Vision’s effective range must be derived from these sources (some already exist in the canonical system; others may be TODO but must be explicitly placed in the formula):

1) **Type allocation**: how much of the Type’s 100% budget is allocated to Perception (top-level).
2) **Extend level** for Perception:
   - uses the canonical `ExtendMultiplier` in §1.5.
3) **Training factor** for Perception (global per player, per feature):
   - canonical form: `GlobalTrainingFactor = 1.0 + (HighScore / 100)`  
     (HighScore in 0..100 → factor in 1.0..2.0)
4) **Specialization bonus** (required): depends on the number of top-level features used by the Type.
5) **Unit tuning modifier** (if your system supports per-unit permanent tuning via SYS_REP).
6) **Connectivity/energy** constraints do not affect VisionRange directly unless you add future rules (not part of current canon).

### 5.2 Baseline mapping (50% is “today”)
Define an explicit baseline range:

- `VisionRangeAt50PercentAllocationMeters`  
  This is the range a unit should have when:
  - Type allocates 50% to Perception,
  - ExtendLevel = 0,
  - TrainingFactor = 1.0,
  - SpecializationBonus = 1.0,
  - Tuning = 1.0

**Requirement:** Calibrate `VisionRangeAt50PercentAllocationMeters` so that it matches today’s gameplay feel.

### 5.3 Allocation scaling (50% baseline → 100% = 2× baseline)
Let:
- `alloc = PerceptionAllocationPercent` in `[0.0 .. 1.0]` (0%..100%)
- baseline is `0.5`

Then:
- `allocScale = alloc / 0.5`  
- clamp: `allocScale` must not exceed `2.0` (because 100% should be 2× baseline)
- when `alloc = 0.5` → `allocScale = 1.0`
- when `alloc = 1.0` → `allocScale = 2.0`

**If alloc = 0.0**, the feature is absent → no VisionSources.

### 5.4 Extend interaction example (explicit chat requirement)
If a Type has:
- `alloc = 0.5` (50% Perception)
and later Perception Extend adds +20%:
- represent this as:
  - `allocEffective = alloc * 1.2 = 0.6`
  - or as multipliers:
    - `allocScale` stays from allocation
    - `ExtendMultiplier` applies to the final range
Either way, the result is multiplicative:
- `0.5 × 1.2 = 0.6` (as requested)

**Implementation note:** keep allocation and extend as separate multipliers internally, but ensure their combined effect matches this behavior.

### 5.5 Complete recommended formula (explicit and testable)
A recommended (non-binding) structure, consistent with the canonical system:

```
VisionRangeMeters =
  VisionRangeAt50PercentAllocationMeters
  * clamp(PerceptionAlloc / 0.5, 0.0, 2.0)
  * ExtendMultiplier(PerceptionExtendLevel)         // 1.0 .. 3.5
  * GlobalTrainingFactor(Perception)               // 1.0 .. 2.0
  * SpecializationBonus(Type)                      // >= 1.0
  * UnitTuningModifier(unit, Perception)           // default 1.0
```

All multipliers must be explicitly logged in debug to allow calibration.

### 5.6 Specialization bonus (required; minimal canonical requirements)
You must implement a specialization multiplier for Type effective stats.

Canonical requirements:
- fewer top-level features → higher specialization bonus
- must be multiplicative
- must be capped to avoid runaway values

Non-binding suggestion (for clarity only):
- define `n = number of top-level features with alloc > 0`
- define `bonus = clamp( (targetN / n) ^ k, 1.0, bonusCap )`
  - where `targetN` could be 4, and `k` is a tunable exponent (e.g., 0.5..1.0)

The exact values must be console-configurable.

---

## 6) What Optical Vision reveals (gameplay semantics)

Optical Vision:
- Reveals units that do not have an active stealth/invisibility state (stealth is another feature).
- Enables visibility-based rendering and “current visibility” checks.
- Also reveals certain environmental traces:
  - **Wheel tracks on sand** become visible within Optical Vision (and fade over time).
  - Track fading behavior must remain time-based and gradual.
  - (If track rendering is separate from FOW, Optical Vision still defines *whether* they are visible.)

Note: Optical Vision does not define how stealth works; it only provides the visibility area.

---

## 7) Fog-of-War semantics that must be preserved

### 7.1 Two-layer model (visible vs explored)
- **VisibleNow:** reset/cleared each update; shows immediate vision.
- **Explored:** accumulative; once explored, remains explored (“once seen always explored”).

### 7.2 No gameplay gating (current) vs future gating
Current audit states “GPU-only; gameplay gating not implemented”.

This means:
- The FOW textures are currently used for rendering, not for authoritative gameplay logic (e.g., enemy targeting).
- However, the architecture must allow future gameplay gating to use an authoritative explored/visible mask (see persistence strategy).

---

## 8) MaxSources cap: what it is, what it is NOT, and worst-case behavior

### 8.1 What the cap means (correct interpretation)
- The cap (`config.maxSources`, e.g., 64) limits **how many simultaneous vision circles are stamped into the GPU visible texture per update**.
- It exists for performance: stamping N circles per frame is O(N) GPU work, and instancing buffers have fixed sizes.
- It does **not** mean:
  - there is a FOW texture per unit,
  - units “own their own fog”.
There is still a **single shared FOW texture** per player/session.

### 8.2 Scope (must be per local player’s view)
After refactor, the cap must apply to:
- **only the local player’s (and allies’, if supported) Perception sources**
- never to enemy/neutral sources

### 8.3 Deterministic truncation (required behavior)
When sources exceed cap:
1) Sort sources by a deterministic priority rule (see below).
2) Take first `maxSources`.
3) Apply seam wrapping duplicates after truncation (preserve current behavior).
4) Ensure total uploaded instances never exceed the GPU buffer hard clamp (256).

### 8.4 Priority rule (chosen for now)
**For now, preserve the current rule: prioritize by distance to the active camera**, because:
- it matches player’s immediate visual needs,
- it naturally focuses resources on what the player is looking at.

**But** it must be stable:
- tie-break with stable `unitId`/`sourceId`.

### 8.5 Worst-case outcomes (what can go wrong)
Assume `maxSources = 64`, and the local player has **N** perception sources.

#### Worst case A: N <= 64 (common, intended)
- All perception circles are stamped every update.
- No visible artifacts from the cap.

#### Worst case B: N > 64 (rare if you cap unit count, but must still be defined)
- Only the 64 highest-priority sources (closest to camera) are stamped on that update.
- The remaining sources:
  - do not contribute to **VisibleNow** that moment,
  - therefore do not contribute to **Explored** that moment either (because explored is derived from visible).
- Practical symptom:
  - Areas around far-away units may appear unexplored or not updated **until** the camera gets near them (and those units enter the top-64 list).

#### Worst case C: N >> 64, camera stays in one place, far units keep moving
- Those far units could explore territory “in simulation”, but the client won’t show it because their circles never get stamped.
- This is **purely a presentation / persistence mismatch problem** (not a physics/sim tick problem), assuming gameplay logic does not use FOW gating yet.
- If later you add gameplay gating based on explored state, this becomes higher-stakes and you must upgrade the explored persistence strategy.

### 8.6 Why this is acceptable (given your current design intent)
- You stated you do not expect >60 units. If that holds:
  - set `maxSources` >= 64 and the cap will effectively never be hit.
- Even if it is hit, camera-distance prioritization is the most reasonable “least surprising” fallback.

### 8.7 Optional visual fallback (not required now)
You asked about a “greyed out stale state” for sources beyond cap.  
This can be added later, but would require an additional mask/state that remembers last-stamped positions. Not required for the refactor.

---

## 9) Update throttle and timing

### 9.1 Update frequency
- Keep update throttle (default **30 Hz**) for perception source updates and stamping.
- Must be configurable (console variable), e.g., 10..60 Hz.

### 9.2 Why throttle exists
- Vision stamping is GPU work, and source collection is CPU work.
- Throttle ensures stable performance, especially as unit counts grow.

---

## 10) Seam wrapping (UV seam at 0/1)

### 10.1 Behavior must remain
- Sources near UV seam are duplicated with UV offsets so the stamp wraps across the seam.
- This is a rendering artifact related to the FOW texture mapping.
- Keep behavior and keep it deterministic.

### 10.2 Where the code should live after refactor
Non-binding but recommended:
- seam wrapping belongs to FogOfWar renderer/service (rendering concern),
- PerceptionFeature should not care about UV seams.

---

## 11) Persistence: explored state must be saveable

### 11.1 What must be persistable
At minimum:
- Explored mask (the “once seen always explored” state) must survive:
  - local reload (frontend),
  - save&exit,
  - backend storage and later rejoin.

VisibleNow does not need persistence.

### 11.2 Strategy requirements
This file defines a minimum requirement and a recommended approach. You may implement either, but the result must be:

- serializable,
- reloadable,
- versioned (so future upgrades don’t break saves),
- and not excessively expensive during autosave.

### 11.3 Recommended approach (from audit): CPU-side explored grid + GPU upload
**Recommended for feature/world split and multiplayer readiness:**

- Maintain a low-res explored grid on CPU (e.g., 256×128 or 512×256) as a `Uint8Array`.
- Each time a VisionSource is stamped (or periodically), update this CPU grid by “painting” the circle.
- Periodically (or on save&exit), serialize the CPU grid and store it.
- On load:
  - deserialize CPU grid,
  - upload to GPU and “seed” the exploredTarget once.

This avoids frequent GPU readback stalls.

### 11.4 Alternative approach: GPU readback on save (acceptable if rare)
- On save&exit only (not frequent autosave), read the exploredTarget into CPU:
  - possible performance hitch
  - compress and store
- On load:
  - restore via a full-screen quad draw into exploredTarget.

### 11.5 Required hooks (even if you postpone persistence implementation)
To ensure the refactor is future-proof, the implementation must include:

- A single function or service call that represents:
  - `getExploredSnapshot()` → returns serializable data
  - `setExploredSnapshot(data)` → restores explored state
- A version tag in the snapshot payload.
- A debug toggle to clear explored state for testing.

---

## 12) Ownership filtering (must be explicit)

### 12.1 Rule
Only include VisionSources that belong to:
- the local player (and optionally allies) in the optical channel.

Enemy/neutral sources must never stamp into the local player’s FOW.

### 12.2 Implementation requirement
Source collection must:
- take `currentPlayerId` (or local team id) as an input,
- filter units by ownership.

This is part of the refactor deliverable; it cannot be left implicit.

---

## 13) Future Perception channels (roadmap; must not block current refactor)

Perception may later include these sub-capabilities. The architecture must support adding them without breaking the Optical Vision pipeline.

### 13.1 Subsurface Scan (formerly misnamed “Radar”)
- Produces a spherical scan volume under the surface.
- Reveals:
  - underground resources,
  - underground units/structures,
  - shown as “cut-out” 3D shapes plus FOW-like masking.
- Requires its own `ScanRange` stat and its own channel.

### 13.2 Thermal Gradient Tracking
- Reveals “heat tracks” of units on both sand and rock.
- Requires `HeatSensitiveRange`.

### 13.3 Acoustic Bearing
- Reveals direction + intensity of unit sounds within `SoundRange`.

### 13.4 Radar (future, less important than Scan)
- Shows distant units as blobby signatures.
- Separate from Subsurface Scan.

**Important:** None of these channels should be implemented now unless explicitly requested; this file only ensures the contract supports them.

---

## 14) Refactor deliverable: what Claude must implement (checklist)

This section is written as an implementation contract for Claude Code.

### 14.1 Create/define PerceptionFeature module
- Implement a PerceptionFeature that:
  - reads Type allocation for Perception,
  - computes Optical Vision range according to §5,
  - exposes a method like `getVisionSources()` returning `VisionSource[]`.

### 14.2 Introduce ownership-aware Perception/Vision collector
- Keep (or rename) the runtime system that:
  - iterates units,
  - filters to local player units,
  - gathers VisionSources,
  - applies deterministic sorting + culling,
  - hands sources to FogOfWar to render.

### 14.3 Preserve FogOfWar rendering semantics
- VisibleNow + Explored layering must remain unchanged (§7).
- Uniform contract must remain unchanged (planet/water shaders still bind `uFogTexture`, `uVisibleTexture` as before unless you standardize names everywhere in one coordinated change).

### 14.4 Determinism fix
- Implement stable sort tie-breaker (§2.3, §8.4).

### 14.5 Persistence hooks
- Add snapshot/restore hooks (§11.5), even if the full persistence solution is deferred.

### 14.6 Dev console calibration knobs
Expose console-configurable parameters for:
- `VisionRangeAt50PercentAllocationMeters`
- `maxVisionAllocationMultiplierOverBaseline` (default 2.0)
- `maxSources` (default 64)
- update throttle Hz (default 30)
- minimum allocation step (default 25%)
- specialization bonus params
- extend cap level (default 5)
- extend multiplier slope (default 0.5)

---

## 15) Acceptance criteria (must pass after implementation)

### 15.1 Behavioral parity (single-player)
- With existing units, the visible area and explored area look the same as before refactor (baseline calibration required).
- Seam wrapping still works identically.

### 15.2 Ownership isolation (multiplayer readiness)
- If you spawn many “non-player” units (enemy/neutral), they do **not** create fog clearing or explored growth for the player.
- Player’s own units always drive the FOW.

### 15.3 Deterministic behavior
- When multiple sources are at the same camera distance, stamping selection remains stable across frames and browsers.

### 15.4 Cap behavior
- When player sources exceed maxSources:
  - only the highest-priority sources stamp,
  - no crashes or buffer overflow,
  - behavior is stable and predictable.

### 15.5 Persistence hooks exist
- There is a clear API or service call for:
  - snapshot explored,
  - restore explored,
  even if autosave/back-end wiring is done later.

---

## 16) Where this spec connects to other canonical docs

- The global pipeline and multipliers are defined in:
  - `ASTEROBIA_CANONICAL_GRFDTRDPU_SYSTEM_2026-01-13.md`
- Movement feature patterns are defined in:
  - `ASTEROBIA_CANONICAL_FEATURE_MOVE_ROLL_2026-01-13.md`
- Vision/FOW audits that informed this spec:
  - `VISION_FOW_SYSTEM_AUDIT.md`
  - `VISION_FOW_REFACTOR_AUDIT.md`
  - `ASTEROBIA_CANONICAL_VISION_MAX_SOURCES_POLICY_2026-01-13.md`

This Perception/Vision Feature spec must remain consistent with those files. If a conflict is found later, treat the *latest “CANONICAL” tagged document* as authoritative, and record an explicit “Conflict Resolution” section in the updated file.
