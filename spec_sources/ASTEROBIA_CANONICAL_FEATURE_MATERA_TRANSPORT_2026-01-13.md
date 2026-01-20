# Asterobia — Feature Spec: Matera Transport
**Status:** CANONICAL  
**Date:** 2026-01-13  
**Applies to:** Demo 1.0

## 0. Canonical precedence and scope
This document is the **canonical** behavior spec for **Matera Transport**.

### 0.1 Related canonical documents
- `ASTEROBIA_CANONICAL_MASTER_BIBLE_2026-01-13.md`
- `ASTEROBIA_CANONICAL_GRFDTRDPU_SYSTEM_2026-01-13.md`
- `ASTEROBIA_CANONICAL_FEATURE_MATERA_MINING_2026-01-13.md` (piles)
- `ASTEROBIA_CANONICAL_FEATURE_MOVE_ROLL_2026-01-13.md` (movement + timeline concepts)

---

## 1. Purpose
Matera Transport moves mined Matera from **surface piles** to a **central base inventory**.

Canonical user experience:
- The player draws/assigns a movement loop route that visits:
  - one or more mining pile locations
  - the base
- When Matera Transport is enabled, the transporter:
  - picks up Matera at pile locations
  - carries it along the route
  - unloads at base
- The player does not micromanage each pickup; route + enabling the feature is enough.

---

## 2. Feature classification
### 2.1 Feature ID and lane
Recommended featureId: `MATERA_TRANSPORT`  
Lane taxonomy: **LOCOMOTION** (transport/logistics)

### 2.2 On/off behavior
Matera Transport is represented as a clip in the unit’s TOOL lane:
- If the clip is active at “now”, transport logic is enabled.
- If inactive, the unit still moves (via movement lane) but does not auto-pickup/unload.

---

## 3. Cargo model
### 3.1 Capacity
Transport capacity is derived from the feature’s effective allocation scalar:
- `maxCargo = baseCapacityAt100 * TransportScalar`
Where `TransportScalar` follows the canonical multiplier stack (allocation, extend if used, training if used, specialization bonus).

All base values live in the calibration console.

### 3.2 Cargo fill
- `cargoFill = currentCargo / maxCargo`  
Clamped to 0..1.

### 3.3 Pickup and unload behavior
At a pile waypoint/stop:
- If within `pickupRadius` of a pile:
  - pick up up to `pickupRatePerSecond` while stopped (or instantly on arrival if you keep it simple)
  - do not exceed `maxCargo`
At base waypoint/stop:
- If within `unloadRadius` of base:
  - unload up to `unloadRatePerSecond` (or instantly)
  - add to base inventory

Non-binding simplification acceptable for early Demo 1.0:
- Instant pickup/unload on arrival (still respecting capacity).

---

## 4. Movement slowdown (critical; newly clarified)
Transport affects movement speed when carrying cargo.

### 4.1 Canonical requirement
The transport “slowdown multiplier” is **weighted by cargo fill**:
- If the unit is **half full**, transport reduces movement **only half as much** as it would at full cargo.

### 4.2 Canonical formula
Let:
- `moveSpeed` = the speed produced by the active movement feature (e.g., MOVE_ROLL)
- `transportEff` = effective transport multiplier in 0..1 derived from TransportScalar  
  (recommended: `transportEff = clamp(TransportScalar, 0, 1)` for Demo 1.0; you may choose a curve)
- `cargoFill` = 0..1

Then:
- `transportSpeedFactor = lerp(1.0, transportEff, cargoFill)`
- equivalently: `transportSpeedFactor = 1.0 - cargoFill * (1.0 - transportEff)`
- `effectiveSpeed = moveSpeed * transportSpeedFactor`

Properties:
- Empty (`cargoFill=0`) → no slowdown (`factor=1.0`)
- Full (`cargoFill=1`) → full slowdown (`factor=transportEff`)
- Half (`cargoFill=0.5`) → half of the slowdown (`factor = 0.5*(1 + transportEff)`)

### 4.3 Notes
- This slowdown factor applies only while the transport feature clip is active.
- If you later introduce multiple simultaneous load effects (e.g., Unit Carrier), document how they stack (product is a reasonable default).

---

## 5. Route usage (player workflow)
The transporter’s route is authored using the unit’s movement lane:
- The player creates a loop route that visits base and one or more piles.
- The transport system detects piles/base when the unit is near them.

No special “transport path” is required beyond the movement route in Demo 1.0.

---

## 6. Visuals (canonical expectations)
- When picking up from a pile, small Matera fragments/particles flow toward the transporter.
- The transporter may show a growing cargo indicator (optional).
- When unloading at base, fragments flow into base storage.

Exact visuals are non-binding.

---

## 7. Persistence (critical)
The following must be saved and restored:
- transporter `currentCargo`
- pile amounts
- base inventory amounts
- any route/command queue state needed to continue transport after reload (depending on your command queue persistence)

---

## 8. Calibration console knobs (must exist)
- `baseCapacityAt100`
- `pickupRadius`
- `unloadRadius`
- `pickupRateAt100` and/or `unloadRateAt100`
- `transportEffCurve` (optional mapping from scalar to 0..1)
- any visual tuning knobs

---

## 9. Edge cases and invariants
- Transport never creates Matera; it only moves it between world storage locations.
- If a pile is empty, pickup does nothing.
- If the transporter is full, pickup does nothing until cargo is unloaded.
- If the base is unavailable (destroyed, etc.), unloading fails gracefully (future).

---

## 10. Implementation notes (non-binding)
- Keep piles and base inventory world-owned.
- Make pickup/unload deterministic when multiple transporters operate on the same pile.

