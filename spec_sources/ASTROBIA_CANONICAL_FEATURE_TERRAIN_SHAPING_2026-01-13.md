# Astrobia — Feature Spec: Terrain Shaping (formerly “Surface Shaping”)
**Status:** CANONICAL  
**Date:** 2026-01-13  
**Applies to:** Demo 1.0 + forward-compatible

## 0. Canonical precedence and scope
This document is the **canonical** behavior spec for the **Terrain Shaping** feature.  
If any older doc/code conflicts with this file, **this file wins** for Terrain Shaping behavior.

This file describes the intended behavior in enough detail for implementation, but avoids locking into a single terrain-tech approach. Implementation suggestions are **non-binding**.

### 0.1 Related canonical documents
- `ASTROBIA_CANONICAL_MASTER_BIBLE_2026-01-13.md`
- `ASTROBIA_CANONICAL_GRFDTRDPU_SYSTEM_2026-01-13.md`
- `ASTROBIA_CANONICAL_FEATURE_MOVE_ROLL_2026-01-13.md` (movement + command queue timeline concepts)

---

## 1. Purpose
Terrain Shaping lets a unit **raise or lower** terrain height along a planned work route to create:
- trenches / ditches
- walls / berms
- ramps / leveled paths
- flat pads

Terrain Shaping is a **continuous work action**:
- It applies a small terrain change each simulation tick (or at a throttled work rate).
- Over time and repeated passes, the terrain converges toward a target profile.

---

## 2. Feature classification
### 2.1 Feature ID
Recommended featureId (data/code): `TERRAIN_SHAPING`

### 2.2 Action feature + Command Queue lane
Terrain Shaping is an **action feature** and appears as a lane/track in the unit’s Command Queue.

Canonical behavior:
- When Terrain Shaping is enabled (lane clip exists at current time), the unit performs shaping work.
- When disabled, the lane is empty and no shaping work occurs.

> Terrain Shaping work is allowed to happen while other lanes (e.g., WEAPON in future) operate, unless later restricted by meta-flags.

### 2.3 Lane taxonomy
Demo 1.0 canonical taxonomy (needed for UI + scheduling):
- `LOCOMOTION` — all MOVE_* features (Roll/Swim/Fly…)
- `WEAPON` — all weapon features (present in taxonomy even if shooting implementation arrives later)
- `TOOL` — work tools (Terrain Shaping, mining, construction, repair, transport, etc.)

Terrain Shaping belongs to: **TOOL**.

---

## 3. Core concept: keyframed target terrain profile
### 3.1 “Target height” keyframes along a route
Terrain Shaping defines a sequence of key points along a route. Each key point has:
- a world position (on the surface)
- a **target height** value (desired terrain elevation at that point)
- an optional “wait/work duration” (how long to stay and work)

Between two key points, the target height varies **continuously** (interpolated).

Canonical interpolation rule (simple, implementable):
- Along the path between key points A and B, the target height is **linear** from A.targetHeight to B.targetHeight as a function of path progress.

### 3.2 Convergence by repeated passes (canonical)
Terrain Shaping does not instantly set terrain to target height. Instead, each tick it nudges the terrain toward the target.

Example convergence (conceptual):
- Current profile: `10 12 14 16 18 20`
- Target profile:  `12 12 12 12 12 12`
- Each pass moves values 1 step toward target until it matches.

This “approach” behavior is canonical; the exact per-tick step size is determined by calibration and feature allocation.

---

## 4. Player authoring workflow (map UI) — canonical behavior
### 4.1 Selecting the feature to “program” on the map
The unit has a map-side action selector (radial wheel):
- When the player holds left mouse button on the unit, a radial menu shows available action features (Move, Terrain Shaping, Mine, etc.).
- The player drags to select one and releases.
- The selected feature becomes the unit’s active “programming mode” for left-click interactions on the map.

Terrain Shaping must be selectable here once the unit has the feature.

### 4.2 Terrain Shaping authoring via click + scroll + click
Canonical interaction:
1. Player selects Terrain Shaping mode.
2. Player left-clicks a point on the map:
   - the system samples the current terrain height at that point (baseline)
   - a provisional target height is set to that sampled value
3. Player scrolls (mouse wheel) to adjust the target height up/down.
4. Player left-clicks again at the same point to **confirm** that key point’s target height.

Then, for the next key point:
- Player left-clicks a second location.
- If the player does not change the scroll value between clicks, the target height **carries over** from the previous key point.
- Otherwise, scroll sets a new target height for that point.
- A route segment is created between consecutive key points along the **shortest surface path** (geodesic-ish, consistent with movement path planning).

This repeats to create a continuous shaping route.

### 4.3 Resulting data
Each confirmed point becomes a **TerrainShapingWaypoint** in the unit’s Terrain Shaping lane.

---

## 5. Command Queue timeline representation (canonical)
### 5.1 Unit rows and expansion
Command Queue UI is After-Effects-like:
- Each unit is one top-level row (layer).
- The unit row can be collapsed:
  - shows thin strips representing all lanes
- Or expanded:
  - shows each action feature lane as separate rows under the unit

### 5.2 Waypoints as clips/markers with “gummy” waits
Terrain Shaping uses the same waypoint-and-wait visual language as movement:
- A waypoint is a point in the lane.
- A wait is represented as a stretchable “gummy” segment.
- Dragging the end of the gummy extends the work duration at that point.

### 5.3 Timeline time is an estimate (canonical)
All clip durations in the Command Queue are **estimates**:
- based on path length / estimated current speed (for movement-linked work)
- and/or based on expected work duration for shaping segments

As simulation runs, if an action takes longer than predicted (e.g., blocked movement), the UI must:
- “grab” the clip end at the present-time playhead
- and **stretch** the clip until the action completes
- causing downstream planned clips to ripple rightward in time

This is canonical behavior for time drift.

### 5.4 Playhead and per-unit pause
The Command Queue timeline:
- has a fixed playhead (vertical “now” line)
- content scrolls right-to-left as time advances (zoomable)

Each unit has its own Play/Pause:
- If paused, that unit’s timeline does not advance toward the playhead.
- Other units may continue if playing.

---

## 6. Editing behavior and replanning (canonical)
Any manipulation of Terrain Shaping waypoints triggers **replanning**:
- Spatial replanning (route geometry)
- Temporal replanning (clip durations and downstream ripple)

Key invariants:
- Changing the order of waypoints changes both:
  - the spatial route
  - the estimated time durations (because distances change)
- Extending a wait duration causes a ripple edit:
  - all future events for that unit shift later

---

## 7. Execution model (simulation)
### 7.1 When shaping applies
When Terrain Shaping is ON:
- If the unit is moving along the shaping route:
  - apply shaping work continuously along the route as the unit traverses it
- If the unit is stationary at a waypoint (wait/work):
  - apply shaping work under/around the unit footprint toward the waypoint’s target height

### 7.2 Stationary shaping: dig-down or build-up (canonical)
If the unit performs shaping while stationary:
- If the target height is below current terrain: it **digs down** under itself (creates a pit).
- If the target height is above: it **builds up** under itself (creates a mound/tower).

The unit’s world position should remain “on the surface,” meaning:
- digging down causes the unit to descend with the surface
- building up causes the unit to rise with the surface

(Exactly how this couples to physics/collision is implementation-defined, but this visible behavior is canonical.)

### 7.3 Work rate
Terrain shaping rate is governed by:
- feature allocation % (effective capacity)
- extend multiplier (if used for tools; consistent with the system doc)
- training multiplier (if the tool uses training)
- specialization bonus

Canonical expectation:
- Work output is proportional to elapsed time (continuous), not discrete “one-shot” results.

---

## 8. Persistence (critical)
Terrain shaping changes the world. Therefore:
- Terrain modifications must be part of the persistent world state.
- Save/load must reproduce the same terrain after reload.
- Multiplayer persistence must support late join / return later.

Non-binding implementation suggestion:
- Store terrain edits as a list of “stamps” or “patch operations” (vector path + target heights + falloff) and replay on load.
- Or maintain a CPU-side delta heightfield/mesh patch system that can be serialized.

---

## 9. Calibration console knobs (must exist)
All values must be adjustable during development (and later fixed for release):
- `terrainShapingRateAt100` (meters of height change per second, per footprint)
- `terrainShapingFootprintRadius`
- `terrainShapingMaxDeltaPerTick`
- `terrainShapingSmoothing` (optional)
- `terrainShapingEnergyCost` (optional; may be added later)

---

## 10. Edge cases and invariants
- Terrain Shaping ON with 0% effective allocation: does nothing.
- Terrain Shaping never “teleports” terrain; it converges over time.
- Repeated looping routes eventually converge the path to the target profile.

---

## 11. Implementation notes (non-binding)
- Reuse the same waypoint editing components and replanning logic as Movement where possible.
- Ensure deterministic results by applying stamps in stable order and by using fixed tick time steps in simulation.

