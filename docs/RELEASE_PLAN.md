# Release Plan (Phase 0: Netcode Readiness)

## Release 001: Fixed Timestep Authority
- **Objective**: Establish the 20Hz SimCore heartbeat and separate tick/render loops.
- **Canonical Sources**: `GRFDTRDPU_SYSTEM`, `MASTER_BIBLE`
- **Definition of Done**:
  - [ ] SimCore loop runs at fixed 20Hz.
  - [ ] Render loop runs at monitor rate (interp).
  - [ ] `SimCore.step()` is the single source of state truth.
  - [ ] Game is playable (move/select works).

## Release 002: Command Buffer Shim
- **Objective**: Replace direct input mutation with Command objects.
- **Canonical Sources**: `GRFDTRDPU_SYSTEM` (Appendix A)
- **Definition of Done**:
  - [ ] Input events -> Command Objects -> Queue.
  - [ ] SimCore consumes Queue (no direct writes to state).
  - [ ] Supported: `MOVE`, `STOP`.

## Release 003: Deterministic IDs
- **Objective**: Remove `Date.now` / `Math.random` from ID generation.
- **Canonical Sources**: `NETCODE_READINESS_AUDIT`
- **Definition of Done**:
  - [ ] `Unit.id` generation uses `sim.nextId++`.
  - [ ] No `uuid` or random strings in authority state.

## Release 004: Seeded RNG
- **Objective**: Replace strictly authoritative randoms with seeded PRNG.
- **Canonical Sources**: `NETCODE_READINESS_AUDIT`
- **Definition of Done**:
  - [ ] `SimCore.rng` exists (seeded).
  - [ ] Game logic uses `SimCore.rng`.
  - [ ] `Math.random` only used for particles/visuals.

## Release 005: State Surface Definition
- **Objective**: Explicitly separate Authoritative State from Render State.
- **Canonical Sources**: `STATE_SURFACE_MAP`
- **Definition of Done**:
  - [ ] `serializeState()` function implemented.
  - [ ] Export contains ONLY gameplay data (pos, hp, queue).
  - [ ] Export excludes meshes, materials, audio.

## Release 006: Input Factory (Command Abstraction)
- **Objective**: Refactor `Input` to produce command structs via `InputFactory` (delegated from Input).
- **Canonical Sources**: `GRFDTRDPU_SYSTEM` (Appendix A), `STATUS_WALKTHROUGH` (binding execution order)
- **Definition of Done**:
  - [ ] `InputFactory` creates deterministic command structs.
  - [ ] `Input` class delegates to Factory.
  - [ ] Command Queue receives clean objects (no raw events).

## Release 007: Local Transport Shim
- **Objective**: Interface abstraction for networking.
- **Canonical Sources**: `GRFDTRDPU_SYSTEM` (Appendix A)
- **Definition of Done**:
  - [ ] `ITransport` interface defined.
  - [ ] `LocalTransport` implementation (loopback).
  - [ ] SimCore uses `transport.send/receive`.

## Release 008: Snapshot Interpolation
- **Objective**: Render loop interpolates between two authoritative snapshots.
- **Canonical Sources**: `MASTER_BIBLE` (Netcode)
- **Definition of Done**:
  - [ ] Visuals lag slightly behind authority (buffer).
  - [ ] Movement is smooth even at 10Hz tick.

## Release 009: Pathfinding Determinism
- **Objective**: Ensure pathfinder returns identical paths on all clients.
- **Canonical Sources**: `NETCODE_READINESS_AUDIT`
- **Definition of Done**:
  - [ ] Pathfinding runs inside `SimCore.step`.
  - [ ] No async pathfinding that races with tick.

## Release 010: Full Determinism Verification
- **Objective**: Prove determinism.
- **Canonical Sources**: `NETCODE_PREFLIGHT`
- **Definition of Done**:
  - [ ] Auto-run 2 instances with same inputs.
  - [ ] Hashes of `serializeState` match 100% of ticks.

## Release 011: Backend Readiness (Phase 0 Complete)
- **Objective**: Ready for Supabase/WebRTC.
- **Definition of Done**:
  - [ ] All "Netcode Readiness" audits passing.
  - [ ] Codebase clean and commented.
