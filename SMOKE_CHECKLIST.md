# Smoke Test Checklist

Quick validation tests to run before committing changes.

## When to Run

- **Before every commit**: Minimum viable checks
- **After refactoring**: Full checklist
- **Before PR/release**: Full checklist + extended tests

---

## Quick Smoke (2 minutes)

Run these every time:

### 1. Game Loads
- [ ] `npm start` runs without errors
- [ ] Open http://localhost:8081 (or 8082)
- [ ] Login screen appears
- [ ] Click "INITIALIZE LINK"
- [ ] Loader appears with spinning asteroid
- [ ] Game scene loads (planet visible)

### 2. Basic Controls
- [ ] LMB drag pans camera
- [ ] RMB drag orbits around point
- [ ] Mouse wheel zooms
- [ ] Camera doesn't clip through terrain

### 3. Unit Interaction
- [ ] Click on a unit to select it
- [ ] Selected unit shows green glow and spotlight
- [ ] Click terrain to deselect
- [ ] Hover over unit shows white glow

---

## Standard Smoke (5 minutes)

Run after any changes to core systems:

### Camera System
- [ ] LMB drag: Camera pans smoothly, no rotation
- [ ] RMB drag: Orbits around picked point
- [ ] LMB + RMB: Free-look (camera stays, view rotates)
- [ ] Scroll: Zooms toward cursor
- [ ] Double-click unit: Fly-to animation triggers
- [ ] Chase mode: Camera follows unit from behind
- [ ] No terrain/rock clipping during movement

### Unit System
- [ ] Select unit with click
- [ ] Shift + click terrain: Adds waypoint
- [ ] Drag from unit to terrain: Draws path
- [ ] Unit follows path smoothly
- [ ] Path visualization shows as green tube
- [ ] Waypoint markers are visible and draggable
- [ ] Close path: Click on starting waypoint
- [ ] Closed path: Unit loops correctly

### Terrain & World
- [ ] Planet renders with terrain detail
- [ ] Water is visible and transparent
- [ ] Rocks are placed on surface
- [ ] No floating rocks
- [ ] Terrain height varies (not flat sphere)
- [ ] Skybox shows stars

### Fog of War
- [ ] Unexplored areas are black
- [ ] Visible areas around units are bright
- [ ] Explored areas are darker/desaturated
- [ ] FOW updates as unit moves
- [ ] Water in unexplored areas is invisible

### UI
- [ ] Bottom panel appears
- [ ] Unit tabs show for each unit
- [ ] Click tab switches selected unit
- [ ] Double-click unit opens command panel
- [ ] Panel shows unit info

---

## Full Smoke (10 minutes)

Run before releases or after major refactors:

### Advanced Camera
- [ ] Fly-to takes smooth path (not instant)
- [ ] Fly-to uses shortest rotation (<180°)
- [ ] Chase mode: Elevation drifts to ideal angle
- [ ] Chase mode: Azimuth follows unit heading
- [ ] Collision: Camera lifts over obstacles
- [ ] Zoom: Smooth easing (not linear)

### Path Following
- [ ] Unit stays on terrain surface (no underground)
- [ ] Speed adjusts for terrain slope
- [ ] Rotation is smooth (slerp, not snap)
- [ ] Path updates when waypoint moved during movement
- [ ] No teleporting at segment boundaries
- [ ] Closed paths loop seamlessly

### Unit States
- [ ] Hover (not selected): White glow, highlight ring
- [ ] Selected: Green glow, spotlight, ring
- [ ] Neither: No glow
- [ ] Tire tracks appear behind moving unit
- [ ] Tire tracks fade over time

### Multiple Units
- [ ] Can select different units via tabs
- [ ] Each unit has independent path
- [ ] Units don't interfere with each other
- [ ] FOW reveals from all units

### Performance
- [ ] 60fps with all units moving
- [ ] No lag when adding waypoints
- [ ] Smooth camera movement under load
- [ ] No console errors during normal use

---

## Regression Guards

After fixing a bug, add specific tests here:

*(Add more as bugs are discovered and fixed)*

---

## Failure Response

### If Quick Smoke Fails
**STOP. DO NOT COMMIT.**
1. Identify what broke
2. Check recent changes
3. Revert or fix immediately
4. Re-run quick smoke

### If Standard/Full Smoke Fails
1. Create KB entry for the bug
2. Add to KB-INDEX.md
3. Update KNOWN_RISK_AREAS.md if new risk
4. Fix the issue
5. Add regression guard to checklist
6. Re-run full smoke

---

*Last Updated: 2026-01-09*
*Checklist Version: 1.0*
