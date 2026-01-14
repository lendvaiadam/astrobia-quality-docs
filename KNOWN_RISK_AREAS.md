# Known Risk Areas

Critical code areas that require extra care and thorough testing.

---

## High Risk Areas

### 1. Unit.js Monolith

**File:** `src/Entities/Unit.js`
**Lines:** ~1500+
**Severity:** HIGH

**Why It's Risky:**
- Massive monolithic file handling multiple concerns
- Movement, path following, animation, effects, interaction all in one class
- Deep coupling with Game.js, InteractionManager, Camera
- Frequent site of bugs (path following, terrain collision, state management)
- Any change can have unexpected ripple effects

**What Can Go Wrong:**
- Path following breaks (units go underground, teleport, get stuck)
- State transitions fail (hover/selected/moving states desync)
- Performance degradation (update loop is complex)
- Visual effects break (glow, spotlight, tire tracks)
- Interaction bugs (click handling, waypoint dragging)

**Mitigation Strategies:**
1. Read before modifying - Always understand the full context
2. Test path following thoroughly - It's the most fragile system
3. Check state transitions - Hover, selected, moving, idle
4. Run full smoke test - Don't skip it
5. Manual testing required - Automated tests don't catch visual bugs

**Safe Changes:**
- Tweaking visual effect parameters (glow intensity, ring size)
- Adjusting speed/turn rate constants

**Dangerous Changes:**
- Path following logic (pathIndex, segment detection)
- State management (isSelected, isHovered, isFollowingPath)
- Position/rotation updates (can cause terrain clipping)

---

### 2. Game.js God Object

**File:** `src/Core/Game.js`
**Lines:** ~2000+
**Severity:** HIGH

**Why It's Risky:**
- Central orchestrator for entire game
- Owns scene, renderer, camera, all units, terrain, FOW
- Handles game loop, input routing, state management
- Update order matters (camera before units, FOW after)
- Initialization sequence is fragile

**What Can Go Wrong:**
- Update order bugs (camera sees stale unit positions)
- Race conditions in initialization
- Memory leaks (forgetting to dispose)
- Performance issues (update loop is hot path)
- Breaking change affects everything

**Mitigation Strategies:**
1. Preserve update order - Camera → Units → FOW → Rendering
2. Test initialization thoroughly - Loader, login, scene setup
3. Watch for memory leaks - Dispose of Three.js objects
4. Profile performance changes - Update loop runs 60 times/second

**Safe Changes:**
- Adding debug logging
- Tweaking timing constants

**Dangerous Changes:**
- Update loop order
- Initialization sequence
- Scene management (adding/removing from scene)

---

### 3. FogOfWar vs VisionSystem Overlap

**Files:**
- `src/World/FogOfWar.js`
- `src/UI/VisionDebugOverlay.js` (new VisionSystem)

**Severity:** HIGH

**Why It's Risky:**
- Two competing systems for visibility
- FogOfWar is GPU-based with render targets
- VisionSystem is being introduced (unclear if replacement or supplement)
- Potential for desync between systems
- Performance impact if both run simultaneously

**What Can Go Wrong:**
- Disagreement on what's visible (FOW says yes, Vision says no)
- Double computation of visibility
- Performance degradation from redundant work
- Shader bugs (FOW uses custom shaders)

**Mitigation Strategies:**
1. Clarify ownership - Which system is source of truth?
2. Avoid running both - One system should delegate to the other
3. Test performance - GPU render targets are expensive
4. Verify visual correctness - Easy to have subtle bugs

**Questions to Resolve:**
- Is VisionSystem replacing FogOfWar?
- Or is VisionSystem for game logic, FogOfWar for rendering?

---

### 4. PathPlanner vs Unit Protocol Gap

**Files:**
- `src/Navigation/PathPlanner.js`
- `src/Entities/Unit.js` (path following)

**Severity:** MEDIUM-HIGH

**Why It's Risky:**
- PathPlanner generates paths
- Unit.js consumes and follows paths
- No formal contract between them
- Path format is implicit (array of Vector3)
- Easy to make incompatible changes

**What Can Go Wrong:**
- PathPlanner changes path format, Unit breaks
- Unit expects certain path density, PathPlanner doesn't provide
- Closed path detection fails
- Terrain projection mismatch

**Mitigation Strategies:**
1. Document the protocol - What does the path array contract guarantee?
2. Add validation - Unit should check path validity
3. Test boundary conditions - Empty path, single point, closed loops

---

### 5. InteractionManager vs Camera Ordering

**Files:**
- `src/Core/InteractionManager.js`
- `src/Camera/SphericalCameraController4.js`

**Severity:** MEDIUM

**Why It's Risky:**
- Both handle mouse input
- InteractionManager detects clicks on units/terrain
- Camera handles drag, orbit, zoom
- Order matters: who gets the event first?
- Modal states can conflict (dragging waypoint vs panning camera)

**What Can Go Wrong:**
- Click on unit also triggers camera orbit
- Dragging waypoint also pans camera
- Camera zoom triggers unit deselection
- Event propagation doesn't stop correctly

**Mitigation Strategies:**
1. Clear event ownership - InteractionManager decides, Camera responds
2. Stop propagation properly - `event.stopPropagation()` when handled
3. Test modal interactions - Waypoint drag, path drawing, camera controls

---

### 6. No ECS - Performance Risk

**Status:** Architectural Concern
**Severity:** MEDIUM (growing)

**Why It's Risky:**
- Current architecture is object-oriented, not ECS
- Units are individual objects with update loops
- As unit count grows, performance will degrade
- No spatial partitioning or culling
- FOW updates all terrain fragments every frame

**What Can Go Wrong:**
- Framerate drops with 10+ units
- Memory usage grows linearly with unit count
- FOW becomes bottleneck (GPU render targets)
- No way to optimize without architecture change

**Current Status:**
- 5 units: 60fps stable
- 10 units: Slight performance impact
- 20+ units: Not tested, likely problematic

**Mitigation Strategies (Short-term):**
1. LOD for effects - Disable tire tracks for distant units
2. Throttle FOW updates - Don't update every frame
3. Spatial culling - Don't update units far from camera

**Long-term Solution:**
SimCore architecture (src/SimCore/) is being built with ECS-like patterns.

---

### 7. SimCore vs Three.js Boundary Risk

**Files:** `src/SimCore/*` and `src/Adapters/*`
**Severity:** MEDIUM (new code)

**Why It's Risky:**
- New abstraction layer being added
- SimCore should be renderer-agnostic
- Three.js is tightly coupled to existing code
- Adapters bridge the gap, but adapter bugs are subtle
- Easy to leak Three.js types into SimCore

**What Can Go Wrong:**
- SimCore accidentally depends on Three.js (breaks abstraction)
- Adapters have translation bugs (position/rotation mismatch)
- Performance overhead from adapter layer
- Duplication of state (SimCore and Three.js both tracking position)

**Mitigation Strategies:**
1. Strict layering - SimCore imports nothing from Three.js
2. Type boundaries - Use generic math types in SimCore
3. Adapter testing - Verify translation is correct
4. Performance profiling - Measure adapter overhead

---

## Strengths (What's Already Good)

### 1. Spherical Math Library
**File:** `src/Math/SphericalMath.js`

**Why It's Good:**
- Well-encapsulated utility functions
- Clear API (quaternionFromZAxis, tangentVectorAt, etc.)
- Used throughout codebase consistently
- Relatively bug-free

**Lesson:** Small, focused modules are reliable.

---

### 2. Camera System (After Multiple Iterations)
**File:** `src/Camera/SphericalCameraController4.js`

**Why It's Good:**
- Multiple iterations have refined it (v4.0)
- Separation of concerns (modes: pan, orbit, chase, free-look)
- Good collision detection
- Smooth animations

---

### 3. Catmull-Rom Path Smoothing
**Context:** Path generation in Unit.js and PathPlanner.js

**Why It's Good:**
- Produces smooth, natural-looking paths
- Handles closed loops well
- Visual quality is high

---

### 4. GPU-Based Fog of War
**File:** `src/World/FogOfWar.js`

**Why It's Good:**
- Efficient GPU implementation
- Render-to-texture approach scales well
- Visual quality is excellent (explored vs unexplored vs visible)

**Note:** At risk from VisionSystem overlap (see above).

---

### 5. Modular UI Panels
**Files:** `src/UI/*.js`

**Why It's Good:**
- Each panel is independent
- Can be added/removed without affecting core game
- Debug panels are isolated from production code

---

## Risk Mitigation Checklist

Before touching a HIGH RISK area:

1. [ ] Read the file completely
2. [ ] Check KB-INDEX.md for related bugs
3. [ ] Review this risk area section
4. [ ] Consider impact on other systems
5. [ ] Plan for testing (manual + smoke)

After changing a HIGH RISK area:

1. [ ] Run full smoke test checklist
2. [ ] Manual testing of the specific area
3. [ ] Check for performance regressions
4. [ ] Document any new risks discovered
5. [ ] Create KB entry if bugs found
6. [ ] Update this file if risk level changes

---

*Last Updated: 2026-01-09*
