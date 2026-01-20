# Asterobia Feature Spec — MOVE_ROLL (Rolling / Wheeled Locomotion)
**Project:** Asterobia Demo 1.0  
**Doc Type:** Feature Implementation Specification (Claude Code reference)  
**Feature ID:** `MOVE_ROLL`  
**Status:** CANONICAL (behavior) + *Suggested* implementation notes clearly marked  
**Last updated:** 2026-01-12 (Europe/Budapest)

---

## 0) Purpose and Non‑Goals

### Purpose
`MOVE_ROLL` defines **standard ground locomotion** for rover-like units on a **spherical world** with **heavy inertia**. It is the **initial movement solution** and the baseline against which other movement features are invented/extended.

### Non‑Goals
- This doc does **not** define other movement features (`MOVE_SWIM`, `MOVE_FLY`, `MOVE_TUNNEL`, `MOVE_CLIMB`, `MOVE_CARRY`) except for interface expectations and cross‑references.
- This doc does **not** define the full GRFTrDPU pipeline; it references it. See: `ASTEROBIA_CANONICAL_GRFDTRDPU_SYSTEM_2026-01-13.md`.

---

## 1) Canonical Design Principles (User Decisions)

1. **Feature isolation:** Feature behavior lives in its own module/file (this document). The central system spec must not contain final feature catalogs.
2. **Spherical topology:** “Up” is radial from planet center; motion is computed in tangent space.
3. **Slope rules are canonical:**  
   - 0–10° stable  
   - 10–40° speed penalty  
   - 40–60° critical (stall/slide possible)  
   - >60° blocked for `MOVE_ROLL`
4. **Training is feature‑scoped (global per user):** Training modifies `MOVE_ROLL` effectiveness across all units using this feature. (Exact training system: central doc.)
5. **Design allocation rules:** If `MOVE_ROLL` is included in a Type, it has allocation ≥ **MinIncludedAllocation** (default 25%, configurable). If allocation is 0% it means **not included** at all.
6. **Command Queue integration:** `MOVE_ROLL` is executed only when the unit’s **Movement lane** selects rolling as the active locomotion mode for the current tick.
   - **Exclusivity:** Rolling cannot overlap with other locomotion modes (swim/fly/climb/tunnel) on the same tick. See engine spec §8.6.2–§8.6.6.
   - **Concurrency:** Rolling may overlap with other lanes (e.g., **Shooting**) unless an explicit incompatibility is declared by the other action feature (not the case by default).
   - **Direct Control:** When the player drives the unit directly, the Command Queue is paused and `MOVE_ROLL` consumes `intentSource=DIRECT`. Exiting Direct Control keeps the queue paused until PLAY is pressed (engine spec §8.6.7–§8.6.8).

---

## 2) Feature Contract

### 2.1 Inputs (from engine)
`MOVE_ROLL` receives these inputs each simulation tick:

- `unitState`:
  - `position` (world XYZ)
  - `velocity` (world XYZ)
  - `up` (world XYZ unit vector; smoothed terrain normal or radial normal as chosen by engine)
  - `mass` (scalar)
  - `collisionShape` / contact footprint
  - `effectiveStats` (computed by StatsEngine; includes feature‑specific stats derived from allocation, extend levels, training, tuning)
- `intent` (from command/control layer):
  - `intentSource`: `QUEUE` | `DIRECT` | `AI`
    - `DIRECT` means the player is currently driving the unit (keyboard/gamepad). See: `grfdtrdpu_system_CANONICAL_ENGINE.md` §8.6.7.
  - `queuePaused`: boolean (true when Direct Control is active, or the user manually paused playback)
  - `desiredDirectionTangent`: unit vector in the tangent plane
  - `desiredSpeed01`: 0..1
  - `stop`: boolean (explicit stop request)
  - optional: `steeringBias`: path-following hints (e.g., toward current spline segment)
- `environment`:
  - `terrainQuery` API (height/normal at point; raycasts)
  - `waterMask` / water height or water body query (for blocked-by-water detection)
  - `rockMask` / impassable geometry query (for blocked-by-rock detection)
  - friction/material info (optional)
- `time`:
  - `dt` (seconds)

### 2.2 Outputs (to engine)
- Updated `velocity` (world)
- Updated `position` (world) *or* `acceleration/forces` depending on SimCore integration
- `movementStatus` enum (canonical):
  - `ROLLING`
  - `STALLING`
  - `SLIDING`
  - `BLOCKED`
  - `STOPPING`
  - `STOPPED`
- Emitted `GameEvents` (see §6)

---

## 3) Effective Stats for MOVE_ROLL (What the system must compute)

> **Canonical rule:** Multiplication is **per-feature**, not global-blended. `MOVE_ROLL` uses only its own effective stats (plus system-level caps).

### 3.1 Required derived stats
The StatsEngine must provide `MOVE_ROLL` a structure like:

```json
{
  "MOVE_ROLL": {
    "maxSpeed_mps": 4.0,
    "accel_mps2": 1.6,
    "brake_mps2": 2.4,
    "turnRate_radps": 1.8,
    "torque_unitless": 1.0,
    "grip_unitless": 0.85,
    "maxSlopeDeg": 60
  }
}
```

### 3.2 Canonical meaning of each stat
- `maxSpeed`: top speed on flat terrain at 100% desired speed.
- `accel`: how quickly speed increases toward target.
- `brake`: deceleration strength when stopping or when target speed is lower.
- `turnRate`: angular change rate in tangent space.
- `torque`: uphill climbing “push” (used in 40–60° critical band).
- `grip`: resistance to lateral/downslope sliding (affects slip probability and slip magnitude).
- `maxSlopeDeg`: **60°** hard block threshold for `MOVE_ROLL` (unless later extended by design decision; currently canonical).

### 3.3 How training maps to stats (canonical intent)
- Training increases **Torque** and **Grip** (climbing power and less sliding).  
Exact numeric mapping is a tuning concern; engine must support it.

---

## 4) Movement Model (Canonical Behavior)

### 4.1 Coordinate basis
At runtime define:
- `Up` = unit’s current “up” vector (smoothed normal or radial).  
- `TangentPlane` = plane orthogonal to `Up`.
- `Forward` = normalized projection of current velocity onto tangent plane; if near zero, use intent direction.

All steering and speed targets are computed in tangent space and then converted back to world vectors.

### 4.2 Ground contact & suspension (canonical behavior)
`MOVE_ROLL` is a **grounded** movement mode:
- Unit attempts to stay in contact with terrain surface (“ground snap”) using raycasts or contact constraints.
- Suspension is approximated by multiple downward raycasts (e.g., front/back/left/right) to estimate:
  - average contact point
  - contact normal
  - contact stability
- If contact is lost briefly (small bumps), the unit can remain in `ROLLING` but with reduced grip; prolonged loss becomes `BLOCKED` or fallback to physics free-fall if engine supports.

> *Suggested implementation:* 4–8 raycasts per unit per tick with caching; use last-known normal smoothing to prevent jitter.

### 4.3 Speed control with inertia (canonical)
`MOVE_ROLL` must feel like a rover: **heavy inertia**, not instant velocity changes.

Compute:
- `targetSpeed = maxSpeed * desiredSpeed01`
- If `stop` flag: `targetSpeed = 0`

Then:
- If current speed < targetSpeed: apply acceleration limited by `accel`
- If current speed > targetSpeed: apply braking limited by `brake`
- Use a critically damped approach (no oscillation) if you implement as velocity solver.

### 4.4 Turning (canonical)
- Turning changes heading in tangent plane subject to `turnRate`.
- Turning effectiveness is reduced at very low grip or during sliding.

> *Suggested:* steer using “desired velocity direction” vector; compute yaw delta around `Up` and clamp by `turnRate*dt`.

---

## 5) Terrain Constraints (Canonical Rules)

### 5.1 Water blocking
`MOVE_ROLL` is **blocked by water**:
- If unit’s contact point is within water region (or below water plane where water exists), emit `COLLISION_WATER` (or `ENTER_WATER`) and set `movementStatus=BLOCKED` unless engine allows “shallow puddle” classification (not specified).
- This event is intended to trigger Goal generation for inventing `MOVE_SWIM`.

### 5.2 Rock / impassable geometry blocking
`MOVE_ROLL` is **blocked by rocks/solid obstacles**:
- When forward motion would penetrate impassable collider, unit transitions to `BLOCKED` and emits `BLOCKED_BY_ROCK` (or general `BLOCKED_BY_GEOMETRY`).
- This may contribute to future needs like `MOVE_FLY` or `MOVE_TUNNEL`, depending on GoalManager rules.

### 5.3 Slope bands (canonical)
Compute local slope angle `slopeDeg` using terrain normal vs Up.

**0–10° (Stable):**
- Full speed and grip.

**10–40° (Penalty):**
- Apply speed penalty: `speed *= cos(slope)` (canonical concept).  
Implementation may approximate with a curve; must be monotonic.

**40–60° (Critical):**
- Uphill:
  - If `effectiveTorque` is insufficient relative to projected gravity component, unit may:
    - `STALLING` (speed decays to 0), then
    - slide backwards (`SLIDING`) if grip is low.
- Downhill:
  - Speed boost may occur, but must be controlled (avoid infinite acceleration).
  - If grip is low, unit can enter `SLIDING`.

**>60° (Blocked):**
- For `MOVE_ROLL`, the unit is **blocked**. Emit `BLOCKED_BY_SLOPE`.

> NOTE: `MOVE_CLIMB` and `MOVE_FLY` are the intended solutions above 60°. Do not “cheat” by letting roll climb >60° without a separate feature or explicit Extend decision.

---

## 6) State Machine (Canonical)

### 6.1 States
- `STOPPED`: speed ~0 and no intent to move.
- `ROLLING`: normal movement with ground contact.
- `STOPPING`: decelerating toward 0 due to stop intent.
- `STALLING`: uphill critical band; acceleration cannot overcome gravity.
- `SLIDING`: loss of traction; velocity aligns with downhill tangent direction with limited control.
- `BLOCKED`: hard constraint (water, rock, slope > maxSlopeDeg), or unable to progress due to repeated collision.

### 6.2 Transitions (examples)
- `STOPPED` → `ROLLING`: intent speed > 0 and not blocked.
- `ROLLING` → `STOPPING`: `stop=true` or desiredSpeed01 → 0.
- `ROLLING` → `STALLING`: slope in [40,60] uphill and torque insufficient.
- `STALLING` → `SLIDING`: stall persists and grip insufficient.
- Any → `BLOCKED`: water contact, rock collision preventing forward progress, slope > 60.
- `BLOCKED` → `ROLLING`: blocking reason removed (e.g., path changes, obstacle cleared) and intent persists.

### 6.3 “Progress detection” (important)
To avoid jitter or infinite “push into wall” behavior:
- Track progress toward current navigation target (distance decreasing).
- If for N seconds distance doesn’t decrease and collisions occur, set `BLOCKED`.

> This integrates cleanly with Goal generation triggers (blocked events).

---

## 7) Integration with Commands, Paths, and Queue Integrity

> The canonical queue integrity rule (`LeftWaypointID` / `ApproachWaypointID` + join-path) is specified in the central system doc. Here we specify the **movement-side responsibilities**.

### 7.1 Responsibilities of MOVE_ROLL
- Consume `intent.desiredDirectionTangent` produced by PathFollower/CommandQueue.
- Report `movementStatus` to help AI/command layer decide replan.
- Provide stable motion along spline/path: do not overshoot corners unrealistically (inertia + brake are the tools).

### 7.2 When paths change (map edit / waypoint drag)
If path geometry changes:
- Movement continues from **current world position** toward the new curve segment determined by `ApproachWaypointID`.
- Unit must **never** intentionally move backward to earlier waypoints. (Engine-level invariant)

`MOVE_ROLL` must tolerate abrupt direction changes by:
- applying turning rate limits
- braking before tight turns if necessary (suggested: curvature-aware speed limit)

> *Suggested:* PathFollower computes target speed cap based on curvature; `MOVE_ROLL` just respects target speed.

---

## 8) Goal System Hooks (Events emitted by MOVE_ROLL)

The GoalManager listens to EventBus and generates Need Cards. `MOVE_ROLL` must emit:

### 8.1 Water
- `COLLISION_WATER` or `ENTER_WATER`
  - payload: `{ unitId, position, time }`
  - intent: triggers `NEED_INVENT_SWIM`

### 8.2 Slope
- `BLOCKED_BY_SLOPE`
  - payload: `{ unitId, position, slopeDeg, time }`
  - intent: triggers `NEED_INVENT_CLIMB` (if >60) and/or `NEED_INVENT_FLY`

### 8.3 Geometry
- `BLOCKED_BY_ROCK` / `BLOCKED_BY_GEOMETRY`
  - payload: `{ unitId, position, colliderId?, time }`

### 8.4 Stall/slide telemetry (optional but useful)
- `UNIT_STALLED` (uphill critical band)
- `UNIT_SLIDING` (loss of grip)
These are not required for Need Cards but are valuable for debugging and future training metrics.

---

## 9) Visual & UX Requirements (What player must see)

### 9.1 Readability on the map
- Unit should visibly align to terrain; wheels/suspension imply contact.
- When blocked:
  - show an icon or status text (“Blocked: Water”, “Blocked: Slope”, etc.)
  - optionally highlight the obstacle area.

### 9.2 Feedback for goal generation
When `COLLISION_WATER` or `BLOCKED_BY_SLOPE` is emitted:
- UI should be able to show “Need Card” creation context (“Your rover cannot traverse water.”)

> Exact UI mechanism is in the central spec; this feature must provide the event data.

---

## 10) Multiplayer Considerations
Movement simulation should be deterministic enough to replicate:
- Input intent is the authoritative signal.
- Movement resolves locally using deterministic math when possible.

> Network model is out of scope here, but `MOVE_ROLL` should avoid non-deterministic randomness in core physics.

---

## 11) Testing & Acceptance Criteria

### 11.1 Acceptance tests (must pass)
1. **Flat movement:** On 0–10° slope, unit reaches `maxSpeed` smoothly.
2. **Water block:** Entering water emits `COLLISION_WATER` and results in `BLOCKED`.
3. **Slope block:** Approaching >60° slope emits `BLOCKED_BY_SLOPE` and results in `BLOCKED`.
4. **Critical uphill behavior:** On 40–60° uphill, low-torque units stall/slide; high-torque units climb slowly.
5. **No backwards waypoint regression:** After path edit, unit proceeds toward `ApproachWaypointID` without moving backward in waypoint sequence.
6. **Training effect visible:** Increasing training for `MOVE_ROLL` increases grip/torque (less sliding, better climb).

### 11.2 Debug instrumentation (recommended)
- Render slope angle and traction state (dev overlay).
- Log events with unit id and position.

---

## 12) Suggested Implementation Notes (Non‑Binding)
These are suggestions only. They can be changed.

### 12.1 File placement
- `src/features/movement/MOVE_ROLL.js`
- `src/features/movement/movement_common.js` (shared helpers: tangent projection, slope calc)
- `src/simcore/terrainQuery.js` (engine)

### 12.2 Performance notes
- Cache terrain normals at unit positions; update at lower frequency than physics tick if needed.
- Batch raycasts where possible.

---

## 13) Cross‑References
- **Central system spec:** `ASTEROBIA_CANONICAL_GRFDTRDPU_SYSTEM_2026-01-13.md`
  - GRFTrDPU pipeline, Training, Extend, Specialization bonus, Energy model, Dark Side, Trading, Social.
  - **Command Queue Timeline:** §8.6 defines waypoint scheduling, gummy editing, repeat markers, and PLAY/PAUSE per-unit.
- **Related movement features (to be authored next):**
  - `MOVE_SWIM.md`
  - `MOVE_FLY.md`
  - `MOVE_TUNNEL.md`
  - `MOVE_CLIMB.md`
  - `MOVE_CARRY.md`
