---
name: asterobia-multiplayer-preflight
description: Pre-flight checks before enabling multiplayer features.
---

# Asterobia Multiplayer Preflight Skill

## When to use
- Before merging any feature tagged "Multiplayer" or "Networking".
- When integrating Supabase or WebRTC.
- When expanding the `Release 012` scope.

## The Checklist
Multiplayer readiness requires **Strict Determinism** and **State Isolation**.

1.  **Transport Layer**:
    - [ ] Is `LocalTransport` fully functional?
    - [ ] Is `NetworkTransport` (if present) implementing the same Interface?
    - [ ] Are messages serialized cleanly (JSON-safe)?

2.  **State Surface**:
    - [ ] Is `serializeState()` comprehensive? (Includes all gameplay data).
    - [ ] Is `StateSurface.js` free of Three.js objects (Mesh, Material)?
    - [ ] Are all IDs deterministic (no random UUIDs)?

3.  **SimLoop**:
    - [ ] Is the update loop fixed-timestep?
    - [ ] Are we using `SeededRNG` for all gameplay logic?
    - [ ] Are `Math.random()` calls restricted to visual-only effects?

## Architecture Reminder (Host-Authoritative)
-   **Server (Host)** is the source of truth.
-   **Clients** send Inputs, receive State Updates (or Input streams for lockstep).
-   Do **NOT** trust client-side positions. Use inputs to drive simulation on Host.

## Migration Path
-   R011 verified Save/Load (Persistence).
-   R012 will verify Realtime Sync (Supabase).
-   Ensure your changes support **Snapshot Interpolation** (rendering state is separate from authoritative state).
