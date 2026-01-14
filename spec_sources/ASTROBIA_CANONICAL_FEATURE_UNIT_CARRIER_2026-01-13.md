# Astrobia — Feature Spec: Unit Carrier
**Status:** CANONICAL  
**Date:** 2026-01-13  
**Applies to:** Demo 1.0 + forward-compatible

## 0. Canonical precedence and scope
This document is the **canonical** behavior spec for the **Unit Carrier** feature.

### 0.1 Related canonical documents
- `ASTROBIA_CANONICAL_MASTER_BIBLE_2026-01-13.md`
- `ASTROBIA_CANONICAL_GRFDTRDPU_SYSTEM_2026-01-13.md`
- `ASTROBIA_CANONICAL_FEATURE_MOVE_ROLL_2026-01-13.md` (movement + command queue)

---

## 1. Purpose
Unit Carrier allows a carrier unit to **pick up and carry** another unit while moving.

Canonical user expectation:
- A carrier can grab a unit, transport it, and later drop it.
- Carrying reduces movement speed.

---

## 2. Feature classification
### 2.1 Feature ID and lane
Recommended featureId: `UNIT_CARRIER`  
Lane taxonomy: **LOCOMOTION** (transport/logistics)

### 2.2 Action feature + Command Queue representation
Unit Carrier is represented as a lane/track under the unit:
- Pickup and Drop are discrete actions (events/clips).
- The “carrying” state persists between Pickup and Drop.

Non-binding UI suggestion:
- Represent “carrying” as a continuous clip segment between Pickup and Drop.

---

## 3. Carry model
### 3.1 What can be carried
Demo 1.0 minimum:
- Any friendly unit can be carried (unless tagged “non-carryable” in future).

Future-proof hooks:
- `carryMass` per unit
- `maxCarryMass` per carrier (derived from allocation)

### 3.2 Carry capacity (optional in Demo 1.0)
If implementing mass/capacity:
- `maxCarryMass = baseCarryMassAt100 * CarrierScalar`
If not implementing mass:
- allow carrying exactly one unit at a time.

---

## 4. Movement slowdown while carrying (canonical)
Carrying reduces movement speed based on both:
- the active movement feature output
- the Unit Carrier feature effective scalar

### 4.1 Baseline canonical rule (simple and sufficient for Demo 1.0)
Let:
- `moveSpeed` = speed produced by the active movement feature
- `carrierEff` = effective carrier multiplier in 0..1 derived from CarrierScalar  
  (recommended: `carrierEff = clamp(CarrierScalar, 0, 1)` for Demo 1.0)

Then while carrying:
- `effectiveSpeed = moveSpeed * carrierEff`

### 4.2 Example (matches the stated intuition)
If:
- movement allocation yields “50% speed”
- unit carrier yields “50% efficiency”
Then carrying speed becomes:
- `0.5 * 0.5 = 0.25` (25% of max speed)

### 4.3 Optional refinement (future-proof; non-binding)
If you introduce carried mass and want load-weighted slowdown:
- define `carryLoad = carriedUnitMass / maxCarryMass` in 0..1
- apply: `speedFactor = lerp(1.0, carrierEff, carryLoad)`
This mirrors the “cargo-fill weighted slowdown” used by Matera Transport.

---

## 5. Player authoring (map UI)
Using the unit radial action wheel:
- Select Unit Carrier mode.
- Click a friendly unit to pick it up (Pickup action).
- Then either:
  - move normally (the carried unit follows), and
  - click a drop location (Drop action), or
  - click another UI affordance to drop.

Exact UI affordances can evolve; the canonical requirement is:
- Pickup and Drop are user-authorable actions.
- Carry state persists and is visible.

---

## 6. Simulation behavior
### 6.1 Pickup
Pickup succeeds only if:
- target unit is within `pickupRadius`
- carrier is not already carrying (unless multi-carry is later supported)
- carrier feature is enabled (lane active, or the pickup action exists)

On success:
- carried unit attaches to carrier (transform follows)
- carried unit’s own movement/actions are disabled while carried (Demo 1.0 simplification)

### 6.2 Drop
Drop places the unit on the terrain near the drop location:
- snap to surface
- resolve collisions minimally (implementation-defined)

---

## 7. Persistence (critical)
Must be saved/restored:
- whether the carrier is carrying
- which unit is being carried
- attachment offset
- any queued pickup/drop actions in command queue (depending on your queue persistence)

---

## 8. Calibration console knobs (must exist)
- `baseCarryMassAt100` (if using mass)
- `pickupRadius`
- `dropRadius` (or placement constraints)
- `carrierEffCurve` (mapping scalar → 0..1)
- any visuals tuning

---

## 9. Visuals (non-binding)
- Show the carried unit being physically lifted/attached.
- Optionally show a “carry” icon on the carrier while carrying.

---

## 10. Edge cases and invariants
- A carried unit does not contribute to the carrier’s FoW unless explicitly allowed later.
- Dropping must never place units inside terrain.
- Carry speed reduction must be stable and deterministic.

