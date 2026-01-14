# MaxSources Cap & Deterministic Ordering (Current Behavior)

> [!NOTE]
> The **canonical VisionSource schema** is defined in `ASTROBIA_CANONICAL_FEATURE_PERCEPTION_OPTICAL_VISION_2026-01-13.md` §4.1.
> This document describes the **runtime behavior** of the VisionSystem/Collector.

## 1) VisionSource Structure
In the current implementation (`src/SimCore/runtime/VisionSystem.js`), a **VisionSource** is a transient Plain Old JavaScript Object (POJO) created anew every frame in `collectSources()`.

**Structure Definition:**
There is no class definition, but the structure is consistent (Lines 143-151):
```javascript
{
    position: THREE.Vector3, // Cloned from unit.position
    radius: number,          // Calculated in meters (derived from unit.stats)
    uvX: number,             // 0.0 - 1.0 (Equirectangular Longitude)
    uvY: number,             // 0.0 - 1.0 (Equirectangular Latitude)
    uvRadX: number,          // UV-space width approximation
    uvRadY: number,          // UV-space height approximation
    distToCamera: number     // Sorting metric
}
```
**Relationship:**
-   **1 Unit = 1 Source** (initially).
-   **Seam Wrapping:** Can generate **1 extra Shadow Source** per unit if it crosses the texture edge (UV 0/1). These are separate entries in the `sources` array marked with `isWrapped: true`.

---

## 2) Cap Enforcement & Limits
The system enforces limits at **two distinct stages** in `collectSources`.

**Limit 1: Soft Cap (Gameplay/Config)**
-   **Config Key:** `config.maxSources` (Default: 64).
-   **Enforcement Point:** **Explicitly Before Seam Wrapping.**
    -   *Code:* `VisionSystem.js`, lines 158-160: `this.sources = this.sources.slice(0, this.config.maxSources);`
    -   *Logic:* We pick the "best" 64 units *first*, ignoring whether they need wrapping.

**Limit 2: Hard Ceiling (GPU Buffer)**
-   **Config Key:** `this.maxBufferSize` (Hardcoded: **256**).
-   **Reason:** The GPU Instance Buffers (`uvCenterBuffer`, etc.) are allocated to this fixed size in the constructor. Exceeding it would cause buffer overflows or requires expensive reallocation.
-   **Enforcement Point:** **During Buffer Building** (after wrapping).
    -   *Code:* `VisionSystem.js`, line 231: `count = Math.min(this.sources.length, this.maxBufferSize);`

---

## 3) Deterministic Ordering
**Current Implementation:**
The system attempts to sort important units to the front, but the sort is **UNSTABLE** (Not fully deterministic) for equidistant units.

**Sorting Logic:**
-   **Metric:** Distance to Camera (`distToCamera`).
-   **Code:** `VisionSystem.js`, line 155:
    ```javascript
    this.sources.sort((a, b) => a.distToCamera - b.distToCamera);
    ```
-   **Camera Used:** The `camera` object passed to `update(units, camera)`. In `Game.js`, this is `this.camera` (the Main Active Camera).
-   **Missing Tie-Breaker:** If two units are at exactly the same distance, their order depends on the browser's implementation of `Array.sort()`. **This is a source of non-determinism.**

---

## 4) Conceptual Purpose of Cap
The cap serves two purposes:
1.  **Performance (Primary):** Limits the number of instances drawn in the `FogOfWar` render pass. Each source is a quad drawn to a specialized RenderTarget.
2.  **Memory Safety (Secondary):** Prevents overflowing the pre-allocated Float32Array buffers (256 instances).

**Impact of Increasing Cap:**
-   **GPU:** Linear increase in vertex processing for the FOW pass (cheap).
-   **CPU:** Linear increase in `collectSources` (math) and buffer filling `buildBuffers`.
-   **Risk:** `256` is the hard limit. Increasing `config.maxSources` > 128 is risky because seam wrapping could double the effective count, hitting the 256 hard ceiling and causing "popping" (missing wraps).

---

## 5) Behavior Examples

**Scenario A: Over-saturation**
-   **Setup:** 200 Units, `config.maxSources` = 64.
-   **Outcome:**
    1.  All 200 units generate a candidate source.
    2.  Sort: The 200 sources are sorted by distance to camera.
    3.  **Truncate:** Only the **closest 64** are kept. The furthest 136 are discarded immediately.
    4.  **Result:** Units far away or off-screen drop their vision. If you zoom out, the "closest" set changes, potentially causing distant vision circles to flicker if they border the cut-off.

**Scenario B: Seam Wrapping Edge Case**
-   **Setup:** `config.maxSources` = 64. All 64 closest units are standing exactly on the map seam (UV 0).
-   **Outcome:**
    1.  Sources truncated to 64.
    2.  `handleSeamWrapping` runs. All 64 need wrapping.
    3.  It attempts to add 64 duplicates.
    4.  Total Sources = 128.
    5.  **Check:** `128 < 256` (Hard Buffer Limit).
    6.  **Result:** All 128 (originals + shadows) are rendered. No clamping occurs at the buffer level.

---

## 6) Refactor Guidance
**Preserving Behavior:**
When refactoring into `PerceptionSystem` vs `VisionRenderer`:
-   **Scope:** The `maxSources` cap **MUST** apply strictly to the **Optical/Visual Channel** (the one that feeds the FOW texture) because that is the expensive/limited resource.
-   **Future Channels: Additional **Perception** channels (e.g., **Subsurface Scan**, **Thermal**, **Acoustic**, and **Radar (future)**) may use separate targets/caps. Do **not** assume they share the Optical Vision maxSources cap unless explicitly designed to.
-   **Determinism Fix (Recommended):** Add a tie-breaker to the sort.
    ```javascript
    // Suggested Refactor Change
    this.sources.sort((a, b) => {
        const diff = a.distToCamera - b.distToCamera;
        if (Math.abs(diff) < 0.001) return a.unitId - b.unitId; // Determinstic
        return diff;
    });
    ```


## Critical scope rule: Optical Vision uses ONLY the local player’s sources
**Canonical requirement (from code audit + design intent):**
- The Optical Vision channel (what the player sees + explored accumulation) must **only** consume VisionSources belonging to the local player’s empire/team (and optionally allies, if enabled).
- Enemy/neutral units must **never** contribute to the player’s FogOfWar reveal, regardless of their count.
- The maxSources cap is therefore applied **after** this ownership/team filtering for the Optical Vision channel.
