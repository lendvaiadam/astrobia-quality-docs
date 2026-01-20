# Asterobia Feature Spec — WPN_SHOOT (Weapon / Shooting)
**Project:** Asterobia Demo 1.0  
**Doc Type:** Feature Implementation Specification (Claude Code reference)  
**Feature ID:** `WPN_SHOOT`  
**Status:** STUB (core contract defined; detailed behavior TBD)  
**Last updated:** 2026-01-13 (Europe/Budapest)

---

## 0) Purpose and Non‑Goals

### Purpose
`WPN_SHOOT` defines the **weapon firing capability** for combat-capable units. It is an **action feature** that occupies the **WEAPON lane** in the Command Queue.

### Non‑Goals
- This doc does **not** define targeting/aiming AI (future feature).
- This doc does **not** define projectile physics in detail (SimCore concern).
- This doc does **not** define damage calculation formulas (future balancing).

---

## 1) Canonical Design Principles (User Decisions)

1. **Feature isolation:** Feature behavior lives in its own module/file.
2. **Action feature:** `WPN_SHOOT` appears in the Command Queue (WEAPON lane).
3. **Nested axes (canonical):** The shooting feature exposes internal axis allocation:
   - **Power** — effect per shot (damage)
   - **Rate** — shots per second / shot interval
   - **Range** — effective distance
   - **Accuracy** — spread / aim error model
4. **Axis allocation rule:** Axes sum to 100% of the feature's internal budget.
5. **Default handling:** If user never edits axes, use equal split (25% each for 4 axes).

---

## 2) Feature Contract

### 2.1 Inputs (from engine)
- `unitState`: position, orientation, effectiveStats
- `target`: targetId, targetPosition (provided by targeting system)
- `intent`: from Command Queue (WEAPON lane active)
- `time`: dt

### 2.2 Outputs (to engine)
- `fireEvent`: projectile spawn request
- `cooldownState`: time until next shot available
- Emitted `GameEvents`: `SHOT_FIRED`, `TARGET_HIT`, `TARGET_DESTROYED`

---

## 3) Effective Stats for WPN_SHOOT

### 3.1 Required derived stats
The StatsEngine must provide `WPN_SHOOT` a structure like:

```json
{
  "WPN_SHOOT": {
    "damage_per_shot": 10,
    "shots_per_second": 2.0,
    "range_meters": 50,
    "accuracy_01": 0.8
  }
}
```

### 3.2 Axis → Stat mapping (canonical concept)
- `Power` allocation → `damage_per_shot`
- `Rate` allocation → `shots_per_second`
- `Range` allocation → `range_meters`
- `Accuracy` allocation → `accuracy_01`

Exact formulas are a tuning concern; must be console-configurable.

---

## 4) Command Queue Integration

### 4.1 Lane
`WPN_SHOOT` belongs to the **WEAPON** lane.

### 4.2 Concurrency
- **Cross-lane:** Shooting may run in parallel with LOCOMOTION lane (move + shoot).
- **Feature flag:** `canRunWhileMoving = true` (default).

### 4.3 Scheduling
- Weapon firing can be scheduled as:
  - **Burst:** discrete action clip (N shots)
  - **Sustained:** continuous firing while clip is active
- Clip duration is estimated; extends if execution lags.

---

## 5) Goal System Hooks

`WPN_SHOOT` may emit events that trigger Goals:

- `OUT_OF_RANGE` → may suggest Extend for range
- `LOW_ACCURACY` → may suggest Training
- `WEAPON_JAMMED` (future) → may trigger repair need

---

## 6) Visual & UX Requirements

### 6.1 Readability
- Muzzle flash or projectile visual on fire
- Hit confirmation visual on target

### 6.2 Command Queue representation
- WEAPON lane shows firing clips
- Active firing indicated by visual marker

---

## 7) Testing & Acceptance Criteria (STUB)

To be defined when detailed behavior is specified:
- [ ] Basic firing loop works
- [ ] Axis allocation affects stats correctly
- [ ] Concurrency with movement works
- [ ] Events emitted correctly

---

## 8) Cross‑References

- **Central system spec:** `ASTEROBIA_CANONICAL_GRFDTRDPU_SYSTEM_2026-01-13.md`
- **Command Queue Timeline:** §8.6 of GRFDTRDPU System
- **Related features:**
  - `SUP_SHIELD.md` (defense)
  - `SUP_STEALTH.md` (visibility)
