# Asterobia — Feature Spec: Matera Mining
**Status:** CANONICAL  
**Date:** 2026-01-13  
**Applies to:** Demo 1.0

## 0. Canonical precedence and scope
This document is the **canonical** behavior spec for the **Matera Mining** feature.

### 0.1 Related canonical documents
- `ASTEROBIA_CANONICAL_MASTER_BIBLE_2026-01-13.md`
- `ASTEROBIA_CANONICAL_GRFDTRDPU_SYSTEM_2026-01-13.md`
- `ASTEROBIA_CANONICAL_FEATURE_PERCEPTION_SUBSURFACE_SCAN_2026-01-13.md` (discovery of deposits)
- `ASTEROBIA_CANONICAL_FEATURE_MOVE_ROLL_2026-01-13.md` (movement + timeline concepts)

---

## 1. Purpose
Matera Mining extracts **Matera** from an underground Matera deposit.

Canonical properties:
- It is a **continuous** action: output is proportional to elapsed time.
- It requires a deposit beneath/near the mining unit.
- It visibly shows extraction (beam + particles) and reduces the deposit over time.
- Extracted Matera appears as a **surface pile** near the mining unit for transport.

---

## 2. World object: Matera deposit (owned by world service)
Matera deposits are world entities (not owned by the unit):
- `depositId` (stable)
- `worldTransform`
- `totalAmount` (resource units)
- `remainingAmount`
- `mesh / volume representation`
- `discoveredState` (per player/team; produced by Subsurface Scan)
- `surfaceOutcrop` representation where it intersects terrain
- `materaColor` (per asteroid/player palette)

Mining **consumes** `remainingAmount`.  
When `remainingAmount` reaches 0, the deposit is exhausted and should no longer produce output.

---

## 3. Feature classification
### 3.1 Feature ID and lane
Recommended featureId: `MATERA_MINING`  
Lane taxonomy: **TOOL**

Matera Mining is represented as a clip in the unit’s TOOL lane (or a sub-lane under TOOL).

### 3.2 On/off and scheduling
- When the mining clip is active at “now”, the unit mines continuously.
- When inactive, mining stops.

Mining can be looped by the unit’s loop mechanism (if the player sets loops in the unit timeline).

---

## 4. Player authoring (map UI)
When Matera Mining mode is selected on the unit’s radial action wheel:
- A left-click on the map sets the mining target location (a point on the surface).
- The unit attempts to mine “down” from that location.

The player’s minimum effort expectation:
- They discovered Matera with Subsurface Scan.
- They position a mining unit over/near the discovered deposit.
- They enable Mining.

---

## 5. Execution model
### 5.1 Finding the deposit
When mining is active:
- Cast a vertical ray (or a small cone) downward from the unit (or from the chosen target point).
- If it intersects a Matera deposit volume:
  - mining is “engaged”
  - extraction begins
- If no deposit is intersected:
  - mining produces no output (and should show an “inactive” UI state)

### 5.2 Output over time (continuous)
Mining produces Matera at a calibrated rate:
- `outputPerSecond = baseMiningRateAt100 * MiningScalar`
Where `MiningScalar` follows the canonical multiplier stack from the system doc:
- allocation
- extend (if used for tools)
- training (if applied)
- specialization bonus

Mining should optionally emit output in small bursts every N seconds (e.g., every 20s) for easy visualization, but the underlying accounting remains continuous.

### 5.3 Deposit depletion
Each output unit reduces the deposit:
- `remainingAmount -= outputAmount`
Deposit visual volume shrinks proportionally (implementation-defined mapping is acceptable in Demo 1.0).

### 5.4 Surface pile creation
Extracted Matera is added to a surface pile entity near the miner:
- The pile is a world object with its own `pileId`, `worldPos`, and `amount`.
- The pile grows as mining continues.
- The pile is the pickup source for Matera Transport units.

---

## 6. Visuals (canonical expectations)
- A vertical beam extends down from the mining unit.
- After a depth threshold, the beam may fade/stop being visible for readability.
- When the beam intersects Matera:
  - small Matera fragments/particles flow upward along the beam
  - the deposit visibly shrinks over time
- The surface pile increases in size/volume over time.

Exact shader/particle implementations are non-binding.

---

## 7. Persistence (critical)
The following must be saved and restored:
- deposit `remainingAmount`
- discovered state (from Subsurface Scan)
- surface piles (positions + amounts)
- any in-progress mining action state needed for smooth resume (optional)

This is required for persistent multiplayer / late join / return later.

---

## 8. Calibration console knobs (must exist)
- `baseMiningRateAt100`
- `miningRayMaxDepth`
- `miningBurstIntervalSeconds` (optional)
- `pileSpawnOffset` (visual)
- any energy cost values if introduced later

---

## 9. Edge cases and invariants
- Mining with no deposit under target produces 0 output and does not create piles.
- Mining never creates Matera from nothing; it is bounded by deposit remainingAmount.
- Multiple miners can mine the same deposit; depletion must remain consistent and deterministic.

---

## 10. Implementation notes (non-binding)
- Keep the deposit and pile systems world-owned so that multiple units and multiplayer sync remain straightforward.
- Use deterministic IDs and stable ordering when resolving multiple miners.

