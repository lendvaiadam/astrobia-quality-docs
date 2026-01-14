# VISION & FOG OF WAR SYSTEM AUDIT

### 0) Purpose & Scope
This document provides an exhaustive, code-grounded audit of the Vision and Fog of War (FOW) systems in the ASTEROBIA codebase.
**Scope:**
- Vision logic (Unit stats, source collection)
- FOW rendering (GPU implementation, textures)
- Integration points (Game loop, UI)
**Exclusions:**
- **SHOOTING & WEAPONS:** Strictly excluded. No checking for firing solutions or weapon ranges.

---

### 1) Executive Map (Dependency Graph)

The system uses a **unidirectional data flow** from Unit Stats to GPU Rendering.

**Flow:**
1.  **State Source:** `Unit.js` (Stats via `SimCore/StatsEngine`)
2.  **Logic Controller:** `VisionSystem.js` (Collects sources, handles seam wrapping)
3.  **Renderer:** `FogOfWar.js` (Manages GPU Buffers & Render Targets)
4.  **GPU:** Shaders render "vision stamps" to `visibleTarget` & `exploredTarget` textures.
5.  **View:** `Planet.js` / Terrain Shaders read these textures to darken terrain.

**Missing Loops (Not Implemented):**
- **Gameplay Gating:** No system currently *reads back* visibility data for logic (e.g. AI targeting).
- **Minimap:** No minimap component exists.
- **Networking:** No synchronization state exists.

---

### 2) Single Source of Truth (SoT)

| Concept | SoT Implementation | File / Symbol |
| :--- | :--- | :--- |
| **(A) Vision Range** | **Derived Stat** | `SimCore/runtime/VisionSystem.js` : `collectSources()`<br>Reads `unit.model.effectiveStats.vision` (0-100) and maps to meters (`config.minVisionRadius`...`config.maxVisionRadius`). |
| **(B) FOW State** | **GPU Texture** | `World/FogOfWar.js` : `exploredTarget` (Accumulated)<br>`visibleTarget` (Current Frame). **No CPU mirroring.** |
| **(C) Update Tick** | **Game Loop** | `Core/Game.js` : `animate()`<br>Calls `this.visionSystem.update(this.units, this.camera)`. Throttled to ~30Hz. |
| **(D) Rendering** | **Instanced Mesh** | `World/FogOfWar.js` : `stampVisionInstanced()`<br>Uses `instancedMesh` with localized UV quads to draw "vision circles" onto the sphere map. |
| **(E) UI Usage** | **Debug Only** | `UI/VisionDebugOverlay.js`<br>Shows active source count. No player-facing UI (minimap) exists. |
| **(F) Gameplay Gating** | **NOT IMPLEMENTED** | No code checks `isVisible(target)`. |
| **(G) Multiplayer** | **NOT IMPLEMENTED** | System is strictly local/client-side per unit list. |

---

### 3) Data Model & Vocabulary Audit

- **`Vision Source`**: A point in the world (Unit position) with a radius (meters).
- **`Explored`**: Areas that have *ever* been seen. Stored in `exploredTarget` (Red channel). "Once seen, always explored."
- **`Visible`**: Areas currently in line-of-sight. Stored in `visibleTarget` (Red channel).
- **`Revealed`**: Used interchangeably with `Explored`.
- **`Seam Wrapping`**: Technical term in `VisionSystem.js` for handling the UV 0->1 discontinuity on the sphere.

**Inconsistencies:**
- `FogOfWar.js` has legacy "Brush Material" code (full screen quad) mixed with new "Instanced" code. The legacy code is effectively dead paths but still present.

---

### 4) FOW State Representation

- **Type:** **GPU Texture (RenderTarget)**.
- **Resolution:** 2048x2048 (Configurable in `FogOfWar.js`).
- **Projection:** Equirectangular (Spherical mapping).
- **Persistence:** **None.** Reset on page reload.
- **CPU Access:** **None.** The state lives strictly on the GPU. There is no `readPixels` or CPU grid. This means logic cannot "check" visibility without async GPU readback (expensive) or a separate CPU-side approximation (not implemented).

### 5) Update Pipeline

1.  **Trigger:** `Game.animate()` calls `VisionSystem.update()` every frame.
2.  **Throttle:** `VisionSystem` limits execution to `config.updateHz` (default 30Hz).
3.  **Collection (CPU):**
    - Iterates `this.units`.
    - Calculates vision radius (lerp based on Stats).
    - Converts World Pos -> UV.
    - **Seam Check:** If near UV edge, duplicates source to other side (`handleSeamWrapping`).
    - Sorts by distance to camera (Optimization).
4.  **Buffer Upload (CPU->GPU):**
    - `VisionSystem.buildBuffers()` fills `Float32Array`s (Position, Radius, UV).
    - `FogOfWar.stampVisionInstanced()` transfers these to `THREE.InstancedBufferAttribute`.
5.  **Rendering (GPU):**
    - `FogOfWar` renders the `instancedMesh` (billboard quads) into `visibleTarget` (Clear + Draw).
    - Then draws `visibleTarget` additively into `exploredTarget`.

### 6) Line-of-Sight / Occlusion

- **Status:** **NOT IMPLEMENTED**.
- **Current Behavior:** Vision is a simple "Circle through Walls".
- **Code implementation:** `VisionSystem.js` calculates a simple radius. The shader (`FogOfWar.js`) draws a circle. There is no terrain height check or raycast for occlusion. Units see through mountains.

### 7) Rendering Implementation

- **Location:** `src/World/FogOfWar.js`
- **Technique:** "Stamping". Instead of computing vision per-pixel for the whole planet (expensive), it draws instances of a "Vision Sprite" (a soft circle) onto the texture.
- **Shader:** Custom `ShaderMaterial` inside `FogOfWar.js`.
- **Soft Edges:** Configurable `uSoftEdge` uniform.
- **Terrain Integration:** The `Planet.js` materials (not shown in audit but inferred from context) consume the generated textures (`uExploredMap`, `uVisibleMap`) to mix color/darkness.

### 8) UI Integration

- **Minimap:** **NOT IMPLEMENTED.**
- **Debug:** `UI/VisionDebugOverlay.js` provides a tech readout (Source Count, FPS).
- **Tweakpane:** `UI/DevPanel.js` allows runtime editing of:
    - Update Frequency (Hz)
    - Soft Edge
    - Max Sources

### 9) Gameplay Coupling (Non-shooting)

**Status: ZERO COUPLING.**
- **Selection:** You can select units anywhere, seen or unseen.
- **Movement:** You can move units anywhere.
- **AI:** No AI logic exists that checks this system.
- **Discovery:** No resource discovery logic exists linked to this.

### 10) Underground & Scan Interactions

- **Status:** **NOT IMPLEMENTED.**
- **Notes:** Codebase contains no references to `UNDERGROUND` states in the context of vision.

### 11) Networking / Determinism Readiness

- **Readiness:** **Low.**
- **Issues:**
    - FOW is purely visual/client-side.
    - No concept of "Team Vision" vs "Enemy Vision".
    - No mechanism to sync "Explored State" to a late-joining player (requires serializing the texture or replaying all unit paths).

---

### 12) Repo-wide References

#### **Fog / FOW / Reveal**
- `src/World/FogOfWar.js`: Core class.
- `src/SimCore/runtime/VisionSystem.js`: Logic class.
- `src/Core/Game.js`: Instantiation & Update loop.
- `src/UI/DevPanel.js`: Configuration UI.

#### **Visibility / Visible**
- `src/World/FogOfWar.js` (`visibleTarget`, `currentVisionRadius`)
- `src/SimCore/runtime/VisionSystem.js` (`visionPercent`, logic calculations)

#### **Minimap / Radar / Scan**
- **No results found.**

---

### 13) Inconsistencies & Suggestions

1.  **Missing "Game Logic" Layer:** The biggest gap is that FOW is purely graphical. To support "Don't shoot what you can't see" or "AI Scouting", we need a CPU-side representation (e.g., a low-res `SpatialHash` or `Grid`) that mirrors the GPU state.
2.  **Legacy Code:** `FogOfWar.js` contains `createBrushMaterial` and `meshPool` which are legacy leftovers from the non-instanced system. **Suggestion:** Remove to clean up.
3.  **Occlusion:** The lack of terrain occlusion (seeing through mountains) is a visual/logic flaw for a strategy game. **Suggestion:** Implement a height-based check in the vertex shader or a CPU-side raycast for the vision polygon.
4.  **No Persistence:** Refreshing the page wipes exploration. **Suggestion:** Save `exploredTarget` to `localStorage` or serialize `VisionSystem` history.
