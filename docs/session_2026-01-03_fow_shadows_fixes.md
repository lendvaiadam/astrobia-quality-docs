# Session Documentation: FOW, Shadows & Visual Fixes
**Date:** 2026-01-03
**Version:** Post-session (to be tagged)

---

## 📋 Session Summary

This session focused on fixing visual quality issues with Fog of War (FOW), shadows, rock textures, and waypoint drag behavior. All reported issues have been resolved and verified.

---

## 🐛 Bugs Fixed

### 1. Shadows Not Visible in BASIC Graphics Mode

**Problem:** When user selected "BASIC" graphics mode on the start screen, unit shadows completely disappeared.

**Root Cause:** The `enableLowSpecMode()` function in `DebugPanel.js` explicitly disabled shadows:
```javascript
// OLD (BROKEN):
this.game.renderer.shadowMap.enabled = false;
this.game.sunLight.castShadow = false;
```

**Why It Was Wrong:** User clarified that shadows should be visible in BOTH Basic and High modes - they are essential for visual quality.

**Solution:** Removed shadow disabling from `enableLowSpecMode()` and updated both PRESET definitions to have `shadows: true`:

**Files Modified:**
- `src/UI/DebugPanel.js` (lines 233-269, 277, 396)

**Code Changes:**
```javascript
// NEW (FIXED):
// enableLowSpecMode() - shadow disabling code REMOVED
// PRESETS.basic.shadows = true (was false)
```

---

### 2. Rock Textures Not Visible (All Rocks Black or Transparent)

**Problem:** All rocks appeared either completely black or completely transparent, regardless of FOW state.

**Root Cause (Multi-part):**

1. **FOW Texture Not Updated:** The rock materials' FOW uniforms (`uFogTexture`, `uVisibleTexture`) were set once at construction time but **never updated** in the game loop. When FOW state changed, rocks didn't know about it.

2. **Shader Reverted:** The rock shader in `RockSystem.js` had been reverted to an old version with hard thresholds instead of smoothstep blending.

**Why It Was Wrong:** 
- Without FOW texture updates, `isExplored` and `isVisible` values read from null/stale textures
- Hard thresholds caused sharp, pixelated edges instead of smooth transitions

**Solution:**

**Part A - Game.js:** Added rock material FOW texture updates to the update loop:
```javascript
// Update Rock FOW textures
if (this.planet.rockSystem && this.planet.rockSystem.materials) {
    for (let i = 0; i < this.planet.rockSystem.materials.length; i++) {
        const mat = this.planet.rockSystem.materials[i];
        if (mat.materialShader && mat.materialShader.uniforms) {
            mat.materialShader.uniforms.uFogTexture.value = this.fogOfWar.exploredTarget.texture;
            mat.materialShader.uniforms.uVisibleTexture.value = this.fogOfWar.visibleTarget.texture;
        }
    }
}
```

**Part B - RockSystem.js:** Updated shader with smoothstep blending:
```glsl
// Smooth transitions
float exploredFactor = smoothstep(0.0, 0.6, isExplored);
float visibleFactor = smoothstep(0.05, 0.4, isVisible);

// Unexplored = transparent (user request: not black!)
if (exploredFactor < 0.01) {
    discard;
}

// Visible = full color, Explored = dark
vec3 finalColor = mix(dimColor, brightColor, visibleFactor);
gl_FragColor = vec4(finalColor, 1.0);
```

**Files Modified:**
- `src/Core/Game.js` (lines 2060-2071)
- `src/World/RockSystem.js` (lines 98-140)

---

### 3. Waypoint Drag - Unit Doesn't Start Moving

**Problem:** When dragging a waypoint where the unit was waiting (with wait timer active), the unit would turn toward the new position but NOT start moving.

**Root Cause:** The `waitTimer` in `Unit.js` blocks all movement. When `waitTimer > 0`, the update function returns early:
```javascript
if (this.waitTimer > 0) {
    this.waitTimer -= dt;
    if (this.waitTimer <= 0) {
        this.waitTimer = 0;
    } else {
        this.velocity.set(0, 0, 0);
        return; // <-- This blocks ALL movement!
    }
}
```

**Why It Was Wrong:** The previous fix set `isFollowingPath = true` but didn't clear `waitTimer`, so the unit was stuck waiting even after the waypoint was moved.

**Solution:** Added `unit.waitTimer = 0` to the marker drag handler in `InteractionManager.js`:
```javascript
} else {
    // Unit was NOT following path (stationary at a station, possibly waiting)
    if (unit.path && unit.path.length > 0) {
        unit.isFollowingPath = true;
        unit.waitTimer = 0; // CRITICAL: Cancel any active wait timer
        unit.pathIndex = 0;
        console.log('[MarkerDrag] Unit was stationary, canceling wait, starting path from index 0');
    }
}
```

**Files Modified:**
- `src/Core/InteractionManager.js` (lines 399-408)

---

### 4. FOW Edge Not Smooth (Pixelated Boundaries)

**Problem:** The boundary between explored and unexplored areas had hard, pixelated edges instead of smooth, feathered transitions.

**Root Cause:** Both terrain and rock shaders used hard `if/else` thresholds:
```glsl
// OLD (BROKEN):
if (isVisible > 0.1) { ... }
else if (isExplored > 0.1) { ... }
else { ... }
```

**Why It Was Wrong:** Hard thresholds create sharp steps. GPU doesn't interpolate between states.

**Solution:** Replaced with `smoothstep()` for gradient transitions:
```glsl
// NEW (FIXED):
float exploredFactor = smoothstep(0.0, 0.6, isExplored); // Wide feather
float visibleFactor = smoothstep(0.05, 0.4, isVisible);
vec3 finalColor = mix(dimColor, brightColor, visibleFactor);
```

**Files Modified:**
- `src/World/Planet.js` (terrain and water shaders)
- `src/World/RockSystem.js` (rock shader)
- `src/World/FogOfWar.js` (brush blur increased from 0.3 to 0.5)

---

## 🔧 Technical Notes

### Current Graphics Mode Differences (BASIC vs HIGH)

| Setting | BASIC | HIGH |
|---------|-------|------|
| Resolution Scale | 60% | 100-200% (devicePixelRatio) |
| Shadows | ✅ ON | ✅ ON |
| Terrain Polygons | 100 | 308 |
| FOW Resolution | 256 | 2048 |
| Dust Particles % | 25-30 | 50-60 |
| Performance Mode | ON (logs disabled) | OFF |

### FOW Shader Architecture

The FOW system uses two render targets:
1. `exploredTarget` - Areas ever seen (persistent)
2. `visibleTarget` - Areas currently visible (real-time)

Each material that needs FOW awareness must:
1. Declare uniforms: `uFogTexture`, `uVisibleTexture`
2. Sample these in fragment shader using spherical UV mapping
3. Be updated every frame in `Game.js` update loop

**Currently FOW-aware materials:**
- Terrain mesh (`Planet.js`)
- Water mesh (`Planet.js`)
- StarField (`Planet.js`)
- Rock materials (`RockSystem.js`)

---

## 📝 Planned Features (Not Yet Implemented)

### Command Queue Expansion (V3 Spec)
- **Attack Command:** Right-click on enemy to queue attack action
- **Area Command:** Define patrol/guard zones
- **Priority System:** Commands can have priority levels

### Preloader Refinement
- Immediate music download on page load
- User-initiated preloader animation
- Synchronized asset loading via THREE.LoadingManager (✅ Implemented)
- Smooth preloader fade-out (✅ Implemented)

### Visual Enhancements
- Wider FOW feather band (✅ Implemented via smoothstep)
- Unit shadow preservation in FOW shaders (✅ Implemented)
- Optimized FOW blur sampling (5-tap cross pattern)

---

## 📁 Files Modified This Session

| File | Changes |
|------|---------|
| `src/UI/DebugPanel.js` | Shadows enabled in BASIC mode |
| `src/World/RockSystem.js` | Smoothstep FOW shader, discard for unexplored |
| `src/Core/Game.js` | Rock FOW texture updates in game loop |
| `src/Core/InteractionManager.js` | waitTimer reset on waypoint drag |
| `src/World/Planet.js` | Smoothstep FOW on terrain/water |
| `src/World/FogOfWar.js` | Increased brush blur |

---

## 🔖 Version Control Notes

This session's changes should be committed with message:
```
Fix: FOW smooth edges, rock visibility, shadows in BASIC mode, waypoint drag waitTimer
```

Previous stable commit: `1a9a93f` ("Fix: Restore Command Queue Drag & Drop")

---

## ⚠️ Known Issues / Gotchas

1. **Git Sync Can Revert Changes:** Several fixes were lost during the session due to Git operations reverting files. Always commit important changes before any sync.

2. **Rock FOW Requires Game Loop Update:** The `onBeforeCompile` hook sets initial values, but FOW textures must be updated every frame in `Game.js`.

3. **waitTimer Blocks Everything:** In `Unit.js`, `waitTimer > 0` causes early return from update(). Any code that starts unit movement MUST also clear this timer.
