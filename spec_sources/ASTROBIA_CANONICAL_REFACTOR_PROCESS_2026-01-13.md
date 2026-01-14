# ASTROBIA — REFACTOR PROCESS: SPLIT SYSTEMS INTO FEATURE FILES
**Version:** CANONICAL_SET_2026-01-13  
**Date:** 2026-01-13  
**Status:** CANONICAL PROCESS DOC  
**Audience:** Claude Code / contributors refactoring the codebase

---

## 0) Canonical precedence

If this process doc conflicts with:
- `ASTROBIA_CANONICAL_MASTER_BIBLE_2026-01-13.md` or
- `ASTROBIA_CANONICAL_GRFDTRDPU_SYSTEM_2026-01-13.md` or
- a feature spec file,

then the higher-precedence file wins.

---

## 1) Goal of the refactor

Astrobia is moving to a **feature-first architecture**:

- Each gameplay capability is implemented as an **independent feature module** (one code file + one spec file).
- World/runtime services remain separate (FogOfWar, VisionSystem aggregator, SimCore loop).
- The “central system doc” must **not** embed detailed per-feature algorithms; those belong in feature specs.

This refactor must be performed without changing gameplay behavior unless explicitly required by the spec.

---

## 2) What must NOT change (global invariants)

1. **Determinism / stability**  
   - Same inputs → same outputs within a tick, for all authoritative logic.
2. **Canonical scheduling rules**  
   - Action features run via command queue lanes (LOCOMOTION, TOOL, WEAPON, or dedicated PERCEPTION lane).
   - Passive features are continuous (e.g., Optical Vision).
   - Within a lane, mutually exclusive actions cannot run simultaneously (e.g., Roll vs Swim).
3. **Perception ownership**  
   - Player sees only what **their own** units reveal (and optionally allies when enabled).
4. **Seam wrapping + update throttle**  
   - Existing FOW seam behavior must remain.
   - Existing throttling (e.g., 30Hz) remains unless explicitly revised.
5. **Command Queue Timeline integrity**  
   - Per-unit PLAY/PAUSE must freeze that unit's queue only.
   - Elastic clip extension (clip end never crosses Now prematurely).
   - Loop toggle and repeat markers required for Demo 1.0.
   - Map-first authoring: timeline cannot add waypoints, only reorder/adjust.

---

## 3) Recommended refactor sequence (safe order)

### Step 1 — Documentation freeze & invariants
- Confirm the canonical docs are present:
  - Master Bible (canonical index)
  - Engine contract (G‑R‑F‑Tr‑D‑P‑U)
  - Feature specs for the systems being split (Movement first, then Perception/Optical Vision)

### Step 2 — Extract feature runtime stubs
For each feature being split (e.g., `MOVE_ROLL`, `PERCEPTION_OPTICAL_VISION`):
- Create a feature module file (code) with:
  - `FeatureId`
  - `isPassive` / `isAction`
  - `getIntents()` or `computeContribution()` hooks depending on feature type
  - `serialize()` / `deserialize()` hooks if the feature owns persistent state
- Wire it into FeatureRegistry so types can allocate % to it.

### Step 3 — Keep world services world-level
Do NOT move these into feature code:
- FogOfWar render target ownership & stamping implementation
- VisionSystem aggregation loop
- GPU resource lifecycle and shader hookups

Instead, feature code provides **data** to the world service:
- `VisionSource` structures for Optical/Scan channels
- (later) other sensor contributions

### Step 4 — Add team filtering (required)
If the current VisionSystem has no ownership filter:
- Implement filtering so Optical Vision consumes **only** local player (and optionally allies) sources.
- Keep deterministic ordering when sorting by camera distance.

### Step 5 — Preserve maxSources behavior
- Keep the cap and deterministic truncation rules.
- Apply the cap after team filtering for the Optical Vision channel.
- Preserve seam wrapping duplication behavior.

### Step 6 — Verification gates
Before merging:
- Verify identical behavior with same test scene:
  - Single unit, standard vision → FOW reveal identical
  - Multiple units near camera → same maxSources behavior
  - Seam wrap at ±180° → identical wrap
- Log performance counters for source counts and stamp calls.

---

## 4) “What goes where” decision checklist (use every time)

When splitting a capability, decide:

### A) Is it a Feature or a World Service?
- Feature: owned by unit/type allocation; may be action or passive.
- World service: shared infrastructure (rendering, aggregation, persistence, simulation tick loop).

### B) Does it belong in the command queue?
- If it is an **action feature** (Move, Mine, Shoot, Subsurface Scan, etc.) → yes, it can appear in a lane (LOCOMOTION, TOOL, WEAPON, or PERCEPTION).
- If it is **passive** (Optical Vision) → no lanes, always-on.

### C) Does it need serialization?
- If the data must survive reload/multiplayer sync → it needs a CPU-serializable representation.
- GPU-only state is not sufficient for long-term persistence.

---

## 5) Canonical artifact outputs of this refactor

After the refactor, the repository must contain:

- A feature spec markdown file for each implemented feature.
- A feature code file implementing the spec (suggested structure only).
- A stable data contract for interop (`VisionSource`, queue action structs, etc.)
- A short “Open Questions” block only when truly necessary.

---

## 6) Anti-patterns (do not do these)

- Do not embed feature logic back into the engine contract doc.
- Do not introduce named “unit classes” as canon (sniper/tank) — treat them as allocations/configs.
- Do not let enemies/other players reveal FogOfWar for the local player.
- Do not introduce non-deterministic source ordering (sort ties must be deterministic).

---

## 7) Target Feature Map (Canonical Lane Assignments)

Refactorers should map code into these buckets:

| Feature ID | Lane | Type | Note |
|------------|------|------|------|
| `MOVE_ROLL` | LOCOMOTION | Action | |
| `UNIT_CARRIER` | LOCOMOTION | Action | |
| `MATERA_TRANSPORT` | LOCOMOTION | Action | |
| `WPN_SHOOT` | WEAPON | Action | |
| `TERRAIN_SHAPING` | TOOL | Action | |
| `MATERA_MINING` | TOOL | Action | |
| `PERCEPTION_OPTICAL_VISION` | N/A | Passive | Always on |
| `PERCEPTION_SUBSURFACE_SCAN`| PERCEPTION | Action | Toggleable |
