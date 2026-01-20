# Asterobia — Feature Spec: Perception / Subsurface Scan (formerly “Radar”)
**Status:** CANONICAL  
**Date:** 2026-01-13  
**Applies to:** Demo 1.0 refactor + forward-compatible design

## 0. Canonical precedence and scope
This document is the **canonical** behavior spec for the **Subsurface Scan** feature (Perception sub-capability).  
If any older document or code comment conflicts with this file, **this file wins** for Subsurface Scan behavior.

This file intentionally contains **no engine-specific code**. Where implementation approaches are described, they are **non-binding suggestions** intended to help Claude implement a correct system.

### 0.1 Related canonical documents
- `ASTEROBIA_CANONICAL_MASTER_BIBLE_2026-01-13.md` (project-level canonical rules)
- `ASTEROBIA_CANONICAL_GRFDTRDPU_SYSTEM_2026-01-13.md` (allocation + research/extend + training + specialization bonus)
- `ASTEROBIA_CANONICAL_FEATURE_PERCEPTION_OPTICAL_VISION_2026-01-13.md` (Optical Vision + Optical FoW semantics)
- `ASTEROBIA_CANONICAL_FEATURE_MOVE_ROLL_2026-01-13.md` (movement + command queue concepts)

---

## 1. Purpose
Subsurface Scan reveals **subsurface world content** (Demo 1.0: **Matera resource deposits**) by “probing” a spherical volume in the ground around a scanning unit.

Key properties:
- **Per-unit scan bubble** (a sphere) with a radius derived from the unit’s **Perception budget**.
- **Partial reveal**: only the **intersection** of the scan sphere and the hidden 3D deposit is visible.
- **Persistent discovery**: revealed subsurface parts **do not disappear** when the unit moves away. Scan discovery is an accumulating, saved “discovered volume.”
- Scan discovery is **separate** from Optical Vision FoW (visible/explored on the surface).

> Naming: In older notes this was called “Radar.” **That term is retired.**  
> Use **Subsurface Scan** / **Scan** consistently. “Radar (future)” is a different, later feature.

---

## 2. Player ownership rule (critical)
**Only the local player’s units (and later: the player’s team/allies) contribute scan sources.**  
Enemy units never “paint” scan discovery for the player, even if they are near the camera.

This must be explicit in refactors because older code collected sources globally without team filtering.

---

## 3. Feature classification
### 3.1 Feature family and ID
- Conceptual family: **Perception**
- Sub-capability name: **Subsurface Scan**
- Recommended featureId naming (for code/data): `PERCEPTION_SUBSURFACE_SCAN`  
  (Exact ID can differ; the important part is that it is clearly a Perception sub-capability and not called Radar.)

### 3.2 Passive vs action
- Optical Vision is **passive** and always in effect when allocated.
- **Subsurface Scan is an action feature**: it can be **enabled/disabled** and is represented as a **clip on the Command Queue timeline**.

Canonical behavior:
- If Subsurface Scan is **ON**, the unit continuously produces scan stamps.
- If **OFF**, it produces none (but previously discovered volumes remain visible).

### 3.3 Command Queue lane representation
- Subsurface Scan appears as a dedicated lane/track under the unit in the Command Queue UI.
- When ON, the lane contains a clip (stretchable in time).
- When OFF, the lane is empty.

(How the user creates/removes the clip is a UI detail; the behavior above is the invariant.)

---

## 4. Allocation model (Perception + sub-splits)
### 4.1 Top-level allocation
The unit Type allocates a % budget to **Perception** (as described in the GRFDTRDPU system doc).  
Perception is included iff allocation is **0% or ≥ MIN_FEATURE_ALLOCATION** (snap rule is a UI responsibility).

### 4.2 Internal Perception sub-allocation (required once Scan exists)
Perception contains sub-capabilities. In Demo 1.0:
- Optical Vision
- Subsurface Scan

Canonical rule:
- Perception maintains a **sub-allocation vector** that splits the Perception budget across available sub-capabilities.
- Sub-allocations are also governed by **0% or ≥ MIN_SUBCAP_ALLOCATION** (use the same calibratable minimum unless later separated).

Recommended default behavior:
- If only Optical Vision exists, it implicitly receives **100%** of the Perception budget.
- When Subsurface Scan becomes available, initialize sub-allocations as:
  - Optical Vision: 100%
  - Subsurface Scan: 0%
  This preserves existing vision behavior until the user explicitly invests in Scan.

### 4.3 Effective Scan “budget”
Define:
- `P` = Perception allocation normalized to 0..1 (e.g., 50% → 0.5)
- `S` = Subsurface Scan sub-allocation normalized to 0..1 within Perception
- `E` = Extend multiplier for Perception (from research/extend; see system doc)
- `T` = Training multiplier for Perception (from training mini-game; see system doc)
- `B` = Specialization bonus multiplier (from system doc)

Then the effective scan scalar is:
- `ScanScalar = P * S * E * T * B`

> Note: Exact multiplier stacking order should be consistent across features, but the product form is canonical at the “spec level.”  
> Where existing engine stacks differ, adjust carefully and document the final choice in the engine doc.

---

## 5. Range (scan sphere radius)
### 5.1 What the “value” means
For Subsurface Scan, the only primary stat is **Scan Radius** (meters).  
No directionality, no bearing, no “enemy detection.” It reveals **resources** (Demo 1.0).

### 5.2 Calibratable base
Scan radius is derived from a calibratable curve that maps `ScanScalar` to meters.

Canonical calibration anchor:
- The current “typical” gameplay value corresponds to **50% effective allocation** and should be used as the **reference** point.
- Max scan radius at 100% effective allocation is **2×** the 50% reference (same philosophy as Optical Vision).

Recommended simple mapping (non-binding suggestion):
- `ScanRadiusMeters = baseScanRadiusAt50 * (ScanScalar / 0.5)`
- Clamp at `maxScanRadiusMeters = 2 * baseScanRadiusAt50` (or via a curve)

All constants live in the **calibration console** (not hard-coded).

---

## 6. What gets revealed (Matera deposits)
### 6.1 Target content
Demo 1.0 target: **Matera deposits** (a world resource object).

A Matera deposit is a 3D volumetric/modeled object that may be fully underground or partly above the surface.

### 6.2 Reveal semantics: intersection + persistence
Canonical rule:
- The scan bubble reveals **only** the deposit volume that intersects the scan sphere at the time of scanning.
- That revealed volume is **added** to a persistent “discovered” set for that deposit.
- Previously discovered parts remain visible even if the unit leaves scan range.

This is a “FoW” for resources, but it is **not** the same texture/mask as Optical FoW.

### 6.3 Visual semantics
- Underground revealed Matera is rendered as a **glowing, X-ray-like 3D volume**:
  - brighter edges
  - mostly transparent interior
- Where the deposit protrudes above the terrain surface, it appears as a **colored rock** in the player’s “Matera color.”
  - The Matera color is world-level: each player’s asteroid can have a different Matera color.

---

## 7. Data contract and responsibilities
### 7.1 What the feature provides (canonical)
Per unit, when Scan is ON and effective allocation > 0:
- A **ScanSource** contribution:
  - `sourceId` (stable/deterministic)
  - `ownerId / teamId` (for filtering)
  - `worldPos` (scan center)
  - `radiusMeters` (computed)
  - `channel` = `SUBSURFACE_SCAN_MATERA` (future-proof for more channels)

The feature does **not** decide what is inside the ground; it only provides the scan volume.

### 7.2 What the world service provides (canonical)
A world-level system/service (names are non-binding) owns:
- The set of subsurface “hidden” objects (Matera deposits)
- The discovered-state storage
- The rendering resources (GPU buffers/textures, shaders)
- The algorithm that accumulates ScanSources into discovered state
- Save/load (including persistence to backend + frontend autosave)

### 7.3 UV / camera-distance fields: who computes them?
If your renderer needs derived fields (e.g., `uvX/uvY/distToCamera`):
- **Collector/World system computes them.**
- Feature remains world-space and gameplay-oriented.

Rationale:
- Keeps feature code independent from render projection.
- Allows deterministic ordering and caps to live in one place.

---

## 8. Performance, caps, and deterministic ordering
### 8.1 Why any cap exists
A cap exists only to protect frame time during stamping/rendering. It must never change gameplay simulation.

### 8.2 Scope of cap
- Caps apply to **stamping inputs** (ScanSources) or **render-time processing**.
- Caps **must not** delete discovered data; discovery persistence is separate.

### 8.3 Deterministic selection when over cap
If you ever truncate sources:
- Sort deterministically (example: `distToCamera`, then `unitId` tie-breaker).
- Truncation must apply **after ownership filtering** (player/team only).

Given the expectation that the player will not exceed ~60 units, the cap is expected to be a non-issue in Demo 1.0, but it must remain correct.

---

## 9. Save/load and multiplayer persistence (critical)
### 9.1 The problem to solve
The project goal is “live co-op / persistent world”: a player can return later and see:
- previously discovered scan results
- mined-out deposits
- the same world state even if they were offline

Therefore:
- A GPU-only scan state that is not persisted is **unacceptable**.

### 9.2 Canonical persistence requirement
- Subsurface Scan discovery must have a **CPU-side persisted representation**.
- On load, GPU resources are rebuilt from that CPU state.

### 9.3 Recommended persisted representation (non-binding)
A practical, incremental approach:
- Store **scan stamps** (sphere centers + radii + timestamp) per deposit and/or per player.
- On render, compute visibility as union-of-spheres intersection against the deposit mesh/shader.
- Compress/merge stamps if they grow too large (optional later).

This preserves “partial bite” semantics without expensive volumetric baking early.

---

## 10. UI/UX behavior (what must be true)
### 10.1 Player control
- The player can turn Subsurface Scan ON/OFF per unit through the Command Queue lane.
- When ON, scan visualization shows the scan bubble (optional), and discovered subsurface volumes are visible.

### 10.2 Relationship to the unit action wheel
When the player holds the left mouse button on a selected unit, a radial action wheel appears (Move, Fire, Mine, etc.).  
Subsurface Scan is typically a toggle (ON/OFF) rather than a “targeted” action.

Non-binding UX suggestion:
- Include Scan as a toggle icon in the wheel that adds/removes the scan clip in the lane.

---

## 11. Calibration console knobs (must exist, names non-binding)
All of these must be changeable during development without code edits:
- `MIN_FEATURE_ALLOCATION` (global)
- `MIN_SUBCAP_ALLOCATION` (Perception internal split; may reuse global)
- `baseScanRadiusAt50`
- `maxScanRadiusMultiplier` (default 2.0)
- `scanStampHz` (update throttle; default aligned with Optical Vision’s throttle philosophy)
- `maxActiveScanSources` (render/stamp protection; can be high or disabled)

---

## 12. Edge cases and invariants
- If effective scan allocation is 0, scan produces no sources even if ON.
- Discovery persists across:
  - unit death
  - unit leaving range
  - camera movement
  - save/load
- Scan discovery is player/team scoped (you do not see what enemies discovered).
- If a deposit is being mined and shrinks, already-discovered parts shrink consistently.

---

## 13. Implementation notes (non-binding)
- Use stable IDs for deposits and scan sources.
- Keep discovered data in a backend-serializable structure.
- Treat discovery as part of the world simulation state, not as pure rendering.

