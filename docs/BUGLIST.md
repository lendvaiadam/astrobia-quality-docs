# BUGLIST - Canonical Bug Backlog

This file is the single source of truth for known bugs that are not yet fixed.
**Protocol:**
- Discovering a bug -> IMMEDIATE entry here.
- Fixing is optional; recording is mandatory.
- Use the template below for consistency.

---

## BUG-20260130-001
**Title:** Unit selection via bottom tabs does not emit SELECT command in overlay history
**Area:** Input/UI
**Where:** game.html → bottom unit tabs; CMD overlay history
**Repro steps:**
1. Open http://localhost:8081/game.html
2. Toggle CMD overlay ON (`Shift+C`)
3. Click unit on canvas → SELECT appears in history
4. Click the same unit via bottom unit tabs → NO SELECT appears
**Expected:** tab selection also emits SELECT command (visible in overlay history)
**Actual:** tab selection changes selection visually, but command history does not reflect it
**Severity:** Minor (unless you consider this a determinism/input unification requirement)
**Determinism Impact:** No (debug visibility / inconsistent input pipeline)
**Suggested Fix:**
Route tab UI selection through InputFactory or emit a SELECT command into the queue.

**Notes/Links:**
- `src/UI/BottomPanel.js`
- `src/Core/Input.js`

---

## BUG-20260130-002
**Title:** Dust particles accumulate over time, causing FPS drop to 10 or lower
**Area:** Performance / Particles
**Where:** `src/Entities/Unit.js` → `updateDustParticles()`
**Repro steps:**
1. Open game, move unit along path
2. Wait 30-60 seconds while unit moves
3. Observe Performance HUD (Shift+P): renderFPS drops from 60 → 10 → lower
4. Dust particles visually accumulate instead of fading/despawning
**Expected:** Old dust particles should fade out and be removed/recycled
**Actual:** Particles appear to stack/accumulate, progressively slowing render
**Severity:** High (makes game unplayable after ~1 minute)
**Determinism Impact:** No (visual-only system)
**Suggested Fix:**
- Check particle lifecycle: ensure particles are removed after fade-out
- Check instanced mesh count cap
- Possible leak in dustGroup or dustInstancedMesh management

**Notes/Links:**
- `src/Entities/Unit.js` lines ~1726-1850 (dust system)
- Likely missing cleanup in particle spawn/despawn cycle

---

## BUG-20260130-003
**Title:** Vehicle/unit movement + headlight/light movement stutters (non-continuous)
**Area:** Render/Interpolation
**Where:** `src/Entities/Unit.js` (Visual Update)
**Repro steps:**
1. Boot game (http://localhost:8081/game.html)
2. Move unit via right-click
3. Observe movement of vehicle body and headlight cone
**Expected:** Smooth continuous motion (interpolated between ticks)
**Actual:** Visible stepping/stuttering in both mesh and light position
**Severity:** Medium (Ruins "premium feel" but gameplay works)
**Determinism Impact:** No (Visual-only)
**Suggested Fix:**
- Verify if `renderUpdate` interpolation logic is correctly applied to both Mesh position AND Light target/position.
- Check if `alpha` is being calculated correctly in `SimLoop`.

**Notes/Links:**
- Classified as **PRE-EXISTING** (observed on main before R007 merge).
- Target fix: **R008 Verify & Tune**.
- **Status:** FIXED in Release 008 (SHA: 4cd448dde67e3e1cb005c540b93cd3e03d6573eb)


---

## BUG-20260130-004
**Title:** Reordering waypoint keypoints can send unit to wrong position when dragging a point past multiple others
**Area:** Path/Waypoints UI
**Where:** game.html → path keypoints editing (drag/reorder)
**Repro steps:**
1. Open http://localhost:8081/game.html
2. Select a unit.
3. Create a multi-point path (Shift+Left click to place 4–6 waypoints).
4. Drag/reorder an upcoming waypoint so it crosses over multiple later waypoints (move it beyond 2–3 points).
5. Observe the unit’s next movement segment.
**Expected:** The unit follows the updated waypoint order/location after the reorder.
**Actual:** The unit moves to an unexpected location / does not follow the intended reordered next waypoint.
**Severity:** Medium (breaks control precision)
**Determinism Impact:** Unknown (likely No; appears to be path editing logic, but needs localization)
**Suggested Fix:** Localize waypoint reorder logic (index/order rebuild) and ensure drag past multiple points updates route consistently.
**Notes/Links:** Pre-existing (reported as old behavior). Needs deeper localization before fix.

---

## KNOWN-GAP-R011-001
**Title:** Fog-of-War / discovered area not included in R011 Save/Load state
**Area:** Save/Load / FogOfWar
**Where:** `src/SimCore/persistence/SaveManager.js`, `src/SimCore/runtime/StateSurface.js`
**Description:**
R011 Save/Load captures authoritative SimCore state including:
- Unit positions, velocities, quaternions, health
- SimLoop tick count & accumulator
- SeededRNG state (seed, internal state, call count)
- Entity ID counter
- Selected unit ID

**NOT included (Known Gap):**
- Fog-of-War explored/visible textures
- Discovered map area state

**Why it matters:**
After Load, the fog-of-war will be reset to initial state (fully unexplored), not the explored state at save time. This means areas the player discovered before saving will appear unexplored after loading.

**Expected behavior (future fix):**
Save should capture FogOfWar texture data or exploration bitmap; Load should restore it.

**Current workaround:**
None. HU testers should be aware that fog resets on load.

**Severity:** Low (cosmetic/exploration state, not gameplay-critical)
**Determinism Impact:** No (FogOfWar is render-only state)
**Added:** R011

---
