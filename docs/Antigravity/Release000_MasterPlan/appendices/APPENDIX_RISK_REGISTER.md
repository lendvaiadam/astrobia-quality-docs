# APPENDIX: RISK REGISTER

**Parent Document:** [Big Picture Master Plan](../BIG_PICTURE_MASTER_PLAN_v1_ANTIGRAVITY.md)
**Scope:** Detailed risk tracking, probability, impact, and mitigation triggers.

---

## 1. Technical Risks

### R01: JavaScript Performance Ceiling (Spiral of Death)
*   **Description:** JS Main Thread blocks > 50ms, causing "catch-up" loops that further block thread.
*   **Impact:** Critical (Unplayable stutter).
*   **Probability:** Medium-High (with >50 units).
*   **Mitigation Strategy:**
    1.  **Optimization:** Profile `onTick`. Remove allocation garbage.
    2.  **Offloading:** Move `SimCore` to WebWorker (Release 006+).
    3.  **WASM:** Rewrite Physics Loop in Rust/AssemblyScript.
*   **Trigger:** If `AvgTickDuration > 15ms` on Reference Hardware (M1 Air equivalent).

### R02: Determinism Decomposition (Float Drift)
*   **Description:** Cross-browser float math differences cause desync.
*   **Impact:** Critical (Game States diverge).
*   **Probability:** Medium (Modern browsers are mostly standardized on IEEE 754, but JIT varies).
*   **Mitigation:**
    1.  **Avoid Transcendental Functions:** Minimize `sin/cos/sqrt` in state-critical paths.
    2.  **Sanity Check:** Use `Math.fround()` if needed to truncate precision.
    3.  **Nuclear Option:** Switch to Fixed Point Math Library (creates dev friction but guarantees integer determinism).
*   **Trigger:** Verify Determinism Protocol fails > 1% of matches.

### R03: WebRTC NAT Traversal Failure
*   **Description:** P2P connection fails for users behind strict Corporate/University Firewalls (Symmetric NAT).
*   **Impact:** High (User cannot join).
*   **Probability:** ~15-20% of users.
*   **Mitigation:**
    1.  **STUN:** Essential.
    2.  **TURN:** Implementing a Relay Server (Cost money/bandwidth).
    3.  **Fallback:** Websocket Relay via Supabase (High latency, but works).
*   **Trigger:** Connection Success Rate < 90%.

---

## 2. Design Risks

### R04: "Too Many Features" (Scope Creep)
*   **Description:** The GRFDTRDPU pipeline requires 7 systems to work for *one* unit.
*   **Impact:** Delay (Phase 1 takes 6 months instead of 2).
*   **Mitigation:** **Strict Pipeline adherence.** Do not build bespoke logic. If it doesn't fit the pipeline, cut the feature.

### R05: Host Disconnect
*   **Description:** Host leaves, game ends for everyone.
*   **Impact:** High Frustration.
*   **Mitigation:**
    1.  **Host Migration:** Transfer State Authority to Peer B (Complex).
    2.  **Snapshot Save:** Auto-save on disconnect, allow Peer B to re-host from Save (Easier).
*   **Decision:** Implement Snapshot Save first (Release 020).

---
*End of Appendix*
