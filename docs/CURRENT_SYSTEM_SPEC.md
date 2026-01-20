# Current System Spec (Reality)

## 1. Scope & Rule of Precedence
This document represents the **current implementations state** of the `asterobia` repository.
**Precedence Rule:** If this document conflicts with Canonical Specs, **Canonical Specs win**. This document describes *what is*, while specs describe *what must be*.

## 2. Runtime Architecture Snapshot
*   **Game Loop:** Monolithic `Game.js` controls initialization, render loop `requestAnimationFrame`, and input handling.
    *   *Evidence:* `src/Game.js` (GOD CLASS, see `quality/NETCODE_READINESS_AUDIT.md`)
*   **SimCore Boundary:** `SimCore` exists as a skeleton (`runtime/Store.js`), but major logic (physics, movement) remains in `Unit.js`.
    *   *Evidence:* `quality/REPO_REALITY_MAP.md` (SimCore structure exists but partial)

## 3. Authority & Determinism Status
*   **Time Model:** **Client-Authoritative / FPS-Dependent**.
    *   Uses `clock.getDelta()` in `Game.js`. Non-deterministic.
    *   *Evidence:* `quality/NETCODE_READINESS_AUDIT.md` Section 2A.
*   **Randomness:** **Unseeded `Math.random()`**.
    *   Used in Map logic, Unit stats, Rock generation.
    *   *Evidence:* `quality/NETCODE_READINESS_AUDIT.md` Section 2B.
*   **Time Source:** **Wall-clock `Date.now() / performance.now()`**.
    *   Used for Entity IDs and frame timing.
    *   *Evidence:* `quality/NETCODE_READINESS_AUDIT.md` Section 2C.

## 4. Command Pipeline Status
*   **Mechanism:** Direct Method Calls (e.g., `unit.setTarget()`).
*   **Command Objects:** Missing. No localized Command pattern yet.
*   **Input Entry:** `Input.js` directly mutates state.
    *   *Evidence:* `quality/NETCODE_READINESS_AUDIT.md` Section 4.

## 5. State Surface Map
*   **Authoritative State:** Mixed with Render state.
    *   Units store physics (`position`, `velocity`) and render (`mesh`, `mixer`) on the same object.
    *   *Evidence:* `quality/STATE_SURFACE_MAP.md` Section 1 & 2.
*   **Serialization:** **MISSING**. No easy way to snapshot.
    *   *Evidence:* `quality/NETCODE_READINESS_AUDIT.md` Section 3.

## 6. Vision/FOW Status
*   **Pipeline:** Shader-based visual effect. State persistence is unclear/partial.
    *   *Reference:* `ASTROBIA_CANONICAL_FEATURE_PERCEPTION_OPTICAL_VISION_2026-01-13.md` (Target) vs Current Reality (Shader-heavy).

## 7. Terrain Status
*   **Implementation:** Heightmap-based, mutable via `TerrainMod`.
    *   *Evidence:* `quality/STATE_SURFACE_MAP.md` Section 1.3 (Terrain Mods list).

## 8. Multiplayer/Backend Readiness Status
*   **Status:** **NOT READY**.
*   **Verdict:** Requires `ITransport` injection, fixed timestep, and state separation.
    *   *Evidence:* `quality/NETCODE_READINESS_AUDIT.md` Verdict.

## 9. Known Deviations from Canonical
1.  **Loop:** Variable `dt` vs Canonical Fixed Timestep [NETCODE_AUDIT].
2.  **IDs:** `Date.now()` vs Canonical Deterministic IDs [NETCODE_AUDIT].
3.  **Input:** Direct mutation vs Canonical Command Queue [NETCODE_AUDIT].
4.  **Unit State:** Hybrid Render/Logic object vs Canonical Entity/View separation [STATE_MAP].
5.  **SimCore:** Skeleton only vs Canonical Logic Kernel [REPO_MAP].

## 10. Update Rules (Binding)
*   Update this file after **every Release PR merge** to reflect the new reality.
*   Antigravity is the owner of this file.
