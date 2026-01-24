# ASTEROBIA: MASTER DEVELOPMENT PLAN v2 (FINAL)

**Version:** 2.0.0
**Date:** 2026-01-24
**Status:** AUTHORITATIVE
**Scope:** Demo 1.0 end-to-end development plan
**Prepared By:** Claude Code (Opus 4.5) + Human Owner (Adam)

---

## Document Hierarchy

This document is the **authoritative development plan** for Asterobia Demo 1.0.

**Precedence (binding):**
1. Canonical spec files in `spec_sources/` (gameplay rules, formulas, constraints)
2. This plan (development approach, releases, architecture decisions)
3. Appendices to this plan (deep technical detail)

**Source:** Reconciled from:
- `sources/Claude/master_plan/` (execution detail, PR structure)
- `sources/Antigravity/Release000_MasterPlan/` (code samples, physics)
- `spec_sources/ASTEROBIA_CANONICAL_*.md` (binding game design)
- Human owner decisions (Q1-Q20 in `final_v2_prep/QUESTIONS_FOR_ADAM.md`)

---

## Table of Contents

### Part I: Foundation
1. [Executive Summary](#1-executive-summary)
2. [Demo 1.0 Done Means (Acceptance Criteria)](#2-demo-10-done-means)
3. [Current State vs Target State](#3-current-state-vs-target-state)

### Part II: Architecture
4. [System Architecture](#4-system-architecture)
5. [SimCore & Determinism](#5-simcore--determinism)
6. [Command Queue Timeline](#6-command-queue-timeline)
7. [Direct Control Integration](#7-direct-control-integration)

### Part III: Features
8. [Feature Roadmap](#8-feature-roadmap)
9. [G-R-F-Tr-D-P-U Pipeline](#9-g-r-f-tr-d-p-u-pipeline)
10. [Core Features (Demo 1.0)](#10-core-features-demo-10)

### Part IV: Multiplayer & Backend
11. [Multiplayer Architecture](#11-multiplayer-architecture)
12. [Backend & Persistence](#12-backend--persistence)
13. [Replay System](#13-replay-system)

### Part V: Execution
14. [Release Plan (Phase 0-2)](#14-release-plan-phase-0-2)
15. [PR Workflow & Gates](#15-pr-workflow--gates)
16. [Testing & CI Strategy](#16-testing--ci-strategy)
17. [Risk Register](#17-risk-register)

### Appendices (Separate Files)
- [Appendix A: Multiplayer Deep Spec](appendices/APPENDIX_A_MULTIPLAYER_DEEP_SPEC.md)
- [Appendix B: Backend & Persistence Deep Spec](appendices/APPENDIX_B_BACKEND_PERSISTENCE_DEEP_SPEC.md)
- [Appendix C: Replay System Spec](appendices/APPENDIX_C_REPLAY_SYSTEM_SPEC.md)
- [Appendix D: GRFDTRDPU Implementation Guide](appendices/APPENDIX_D_GRFDTRDPU_IMPLEMENTATION.md)
- [Appendix E: Feature Dependency Graph](appendices/APPENDIX_E_FEATURE_DEPENDENCY_GRAPH.md)
- [Appendix F: Release/Sprint/PR Breakdown](appendices/APPENDIX_F_RELEASE_SPRINT_PR_PLAN.md)
- [Appendix G: Testing & QA Strategy](appendices/APPENDIX_G_TESTING_QA_STRATEGY.md)
- [Appendix H: Risk Register Detail](appendices/APPENDIX_H_RISK_REGISTER_DETAIL.md)
- [Appendix I: UI/UX Pipeline](appendices/APPENDIX_I_UI_UX_PIPELINE.md)

---

# PART I: FOUNDATION

---

## 1. Executive Summary

Asterobia is an evolutionary RTS on a spherical world where units evolve capabilities through the **G-R-F-Tr-D-P-U** pipeline (Goal → Research → Feature → Training → Design → Production → Unit).

**Demo 1.0 delivers:**
- Single-player core loop (research → design → produce → command → execute)
- 6 required features + 2 stretch features
- Deterministic SimCore with command-log replay
- 2-4 player host-authoritative multiplayer (LAN + internet)
- Save/Load persistence

**Key architectural decisions (binding):**
- **Tick rate:** 20 Hz (50ms timestep)
- **Determinism:** Mulberry32 PRNG, sequential IDs, no Date.now() in logic
- **Transport:** Host-authoritative star topology (host = "server-shaped")
- **UI:** Web Components / Vanilla Custom Elements
- **Refactor:** Shim-based extraction (preserve existing code, extract to SimCore)

**Source:** `spec_sources/ASTEROBIA_CANONICAL_MASTER_BIBLE_2026-01-13.md` (philosophy), Human owner decisions Q1-Q20.

---

## 2. Demo 1.0 Done Means

**Status:** BINDING (per Human Owner Q20)

Demo 1.0 is **DONE** when ALL of the following are verified:

### 2.1 Single-Player Core Loop
| Gate | Verification |
|------|--------------|
| Research works | Can research MOVE_ROLL from Need Card, unlock completes |
| Design works | Can create Type Blueprint with 2+ features, allocations sum to 100% |
| Production works | Can produce unit from blueprint at Central Unit |
| Command Queue works | Can queue movement, see duration estimates, pause/resume unit |
| Movement works | Unit follows path, respects slope bands (0-10/10-40/40-60/>60) |
| Scan works | Subsurface Scan reveals underground Matera deposits |
| Mining works | Mining unit extracts Matera, creates surface pile |
| Transport works | Transport unit collects pile, delivers to base |
| Combat works | WPN_SHOOT damages enemy units, wreck state triggers |

### 2.2 Determinism & Replay
| Gate | Verification |
|------|--------------|
| Determinism | Same seed + same commands → identical state after 1000 ticks |
| Command log | All commands logged with tick number |
| Replay playback | Can replay command log, verify identical end state |

### 2.3 Multiplayer
| Gate | Verification |
|------|--------------|
| LAN connection | 2 players connect via LAN, see each other's units |
| Internet connection | 2 players connect via TURN relay, gameplay synchronized |
| Host authority | All state changes flow through host |
| 4-player support | 4 players can join same session |
| Late join | Player can join in-progress game, receives state sync |

### 2.4 Save/Load
| Gate | Verification |
|------|--------------|
| World snapshot | Terrain, entities, deposits serialized |
| Player state | Research progress, blueprints, command queue saved |
| Load restore | Loading snapshot restores exact game state |

### 2.5 Core Features (6 Required + 2 Stretch)

**Required (MUST ship):**
| Feature | Lane | Done When |
|---------|------|-----------|
| MOVE_ROLL | LOCOMOTION | Unit moves via wheeled locomotion, respects slope physics |
| OPTICAL_VISION | Passive | Unit reveals FOW, vision range scales with allocation |
| SUBSURFACE_SCAN | PERCEPTION | Scan reveals underground deposits within range |
| MATERA_MINING | TOOL | Unit extracts Matera from deposit, creates pile |
| MATERA_TRANSPORT | LOCOMOTION | Unit carries Matera, speed penalty when loaded |
| WPN_SHOOT | WEAPON | Unit damages targets, 4-axis system (Power/Rate/Range/Accuracy) |

**Stretch (SHOULD ship):**
| Feature | Lane | Done When |
|---------|------|-----------|
| TERRAIN_SHAPING | TOOL | Unit modifies terrain height, converges over passes |
| UNIT_CARRIER | LOCOMOTION | Unit transports other units, load/unload mechanics |

### 2.6 CI Baseline Gates
| Gate | Type | Threshold |
|------|------|-----------|
| Determinism smoke | Hard | MUST pass (identical state after replay) |
| Multiplayer sync smoke | Hard | MUST pass (no desync in 5-minute session) |
| Tick time p95 | Soft | < 8ms with 50 units (measure + trend, no block) |
| Test coverage | Soft | SimCore > 80% (measure + trend) |

**Source:** Human Owner Q20 answer, `spec_sources/ASTEROBIA_CANONICAL_MASTER_BIBLE_2026-01-13.md` Section: Goal/Need → Feature Unlock Mappings.

---

## 3. Current State vs Target State

### 3.1 Current State (As Of 2026-01-24)

| Component | Status | Location | Notes |
|-----------|--------|----------|-------|
| **Unit.js** | Working | `src/Entities/Unit.js` | ~1500 lines, monolithic, contains movement + visuals |
| **Direct Control** | Working | `Unit.js:88-91, 1474-1502` | Keyboard override with path save/resume, 0.5s timeout |
| **Camera** | Working | `src/Camera/SphericalCameraController4.js` | Third-person follow for Direct Control |
| **Path System** | Working | `Unit.js` | Spline-based, waypoint editing exists |
| **FOW** | Partial | `src/World/FogOfWar.js` | GPU-based, needs CPU serialization |
| **Terrain** | Working | `src/World/` | Spherical planet, height displacement |
| **SimCore** | Stub | `src/SimCore/` | Folder exists, minimal implementation |
| **Multiplayer** | None | - | Not implemented |
| **Backend** | None | - | Supabase account exists, no schema |
| **Command Queue UI** | None | - | Data model not implemented |

### 3.2 Target State (Demo 1.0)

| Component | Target | Implementation |
|-----------|--------|----------------|
| **SimCore** | Authoritative | Fixed 20Hz tick, deterministic, all game logic |
| **Unit.js** | Render-only | State extracted to SimCore, Unit.js does interpolation + visuals |
| **Direct Control** | Preserved | Integrated with SimCore command queue (pause queue on DC) |
| **Command Queue** | Full data model | Duration estimates, loop, repeat, pause/resume per unit |
| **Command Queue UI** | Phase 1: Hybrid | List view + simple timeline bar; Phase 2: full AE-style |
| **FOW** | Serializable | CPU-readable explored state for save/load |
| **Multiplayer** | Host-authoritative | Star topology, 2-4 players, WebRTC + TURN |
| **Backend** | Supabase Pro | Auth, snapshots, signaling, RLS |
| **Replay** | Command log | Debug + anti-cheat foundation |

### 3.3 Migration Path

```
CURRENT                          TARGET
─────────────────────────────────────────────────────
Unit.js (monolith)     ──shim──► SimCore (authoritative)
                                      │
                                      ▼
                               Unit.js (render-only)
                                      │
                                      ▼
Direct Control         ──preserve──► DC ←→ SimCore.pause()
                                      │
                                      ▼
FOW (GPU-only)         ──extract──► CPU state + GPU render
                                      │
                                      ▼
Local-only             ──add──────► Transport layer
                                      │
                                      ▼
                               Host-authoritative MP
```

**Source:** Codebase inspection, `sources/Claude/master_plan/MASTER_DEVELOPMENT_PLAN_v1_CLAUDE.md` Section 2 (Current State).

---

# PART II: ARCHITECTURE

---

## 4. System Architecture

### 4.1 Layer Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PRESENTATION LAYER                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │
│  │   Three.js   │  │  Web Comp.   │  │   Command Queue UI       │   │
│  │   Renderer   │  │     UI       │  │   (List + Timeline)      │   │
│  └──────┬───────┘  └──────┬───────┘  └────────────┬─────────────┘   │
└─────────┼─────────────────┼────────────────────────┼─────────────────┘
          │                 │                        │
          ▼                 ▼                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         APPLICATION LAYER                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │
│  │    Game.js   │  │InputFactory  │  │    DebugOverlay          │   │
│  │   (Shim)     │  │              │  │                          │   │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────────────┘   │
└─────────┼─────────────────┼──────────────────────────────────────────┘
          │                 │
          ▼                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         SIMCORE (AUTHORITATIVE)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │
│  │  GameLoop    │  │ CommandQueue │  │    FeatureRegistry       │   │
│  │  (20 Hz)     │  │              │  │                          │   │
│  ├──────────────┤  ├──────────────┤  ├──────────────────────────┤   │
│  │ StateRegistry│  │CommandProc.  │  │    StatsEngine           │   │
│  ├──────────────┤  ├──────────────┤  ├──────────────────────────┤   │
│  │  IdGenerator │  │  EventBus    │  │    GoalManager           │   │
│  ├──────────────┤  ├──────────────┤  ├──────────────────────────┤   │
│  │  SeededRNG   │  │  Serializer  │  │    ResearchManager       │   │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘   │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    FEATURE MODULES                             │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │  │
│  │  │MOVE_ROLL│ │OPTICAL_ │ │SUBSURFA│ │MATERA_  │ │WPN_     │  │  │
│  │  │         │ │VISION   │ │CE_SCAN │ │MINING   │ │SHOOT    │  │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         TRANSPORT LAYER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │
│  │ITransport    │  │LocalTransport│  │    WebRTCTransport       │   │
│  │(Interface)   │  │(Single)      │  │    (Multiplayer)         │   │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘   │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         BACKEND (SUPABASE)                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │
│  │     Auth     │  │   Realtime   │  │      Storage             │   │
│  │              │  │  (Signaling) │  │   (Snapshots)            │   │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 Key Architectural Principles

| Principle | Rule | Rationale |
|-----------|------|-----------|
| **Single Source of Truth** | SimCore owns all authoritative game state | Determinism, multiplayer sync |
| **Render Interpolation** | Presentation layer interpolates between ticks | Smooth visuals at any FPS |
| **Command Pattern** | All input becomes Commands, processed on tick | Replay, networking, undo |
| **Feature Isolation** | Each feature is independent module | Testability, maintainability |
| **Transport Abstraction** | ITransport interface hides network details | Easy local → multiplayer transition |

### 4.3 File Structure (Target)

```
src/
├── SimCore/
│   ├── core/
│   │   ├── GameLoop.js          # 20Hz fixed timestep
│   │   ├── IdGenerator.js       # Sequential deterministic IDs
│   │   ├── PRNG.js              # Mulberry32
│   │   └── TimeSource.js        # Tick counter
│   ├── state/
│   │   ├── StateRegistry.js     # Entity state storage
│   │   ├── EntityState.js       # Per-entity authoritative state
│   │   └── Serializer.js        # Save/load
│   ├── commands/
│   │   ├── CommandTypes.js      # MOVE, STOP, ATTACK, etc.
│   │   ├── CommandQueue.js      # Per-unit queues + lanes
│   │   ├── CommandProcessor.js  # Execute commands on tick
│   │   └── CommandLog.js        # Replay log
│   ├── features/
│   │   ├── FeatureRegistry.js   # Feature availability + base stats
│   │   ├── StatsEngine.js       # Effective stat computation
│   │   └── modules/
│   │       ├── MOVE_ROLL.js
│   │       ├── OPTICAL_VISION.js
│   │       ├── SUBSURFACE_SCAN.js
│   │       ├── MATERA_MINING.js
│   │       ├── MATERA_TRANSPORT.js
│   │       ├── WPN_SHOOT.js
│   │       ├── TERRAIN_SHAPING.js   # Stretch
│   │       └── UNIT_CARRIER.js      # Stretch
│   ├── systems/
│   │   ├── GoalManager.js       # Event → Need card
│   │   ├── ResearchManager.js   # Invent/Extend jobs
│   │   ├── DesignManager.js     # Blueprint storage
│   │   ├── ProductionManager.js # Build/refit queues
│   │   └── TrainingManager.js   # Training outcome slider
│   ├── transport/
│   │   ├── ITransport.js        # Interface
│   │   ├── LocalTransport.js    # Single-player
│   │   └── WebRTCTransport.js   # Multiplayer
│   └── index.js                 # SimCore entry point
├── Core/
│   ├── Game.js                  # Shim: accumulates delta, calls SimCore
│   └── InteractionManager.js    # Input → InputFactory
├── Entities/
│   └── Unit.js                  # Render-only (interpolation + visuals)
├── UI/
│   ├── components/              # Web Components
│   │   ├── command-queue-list.js
│   │   ├── command-queue-timeline.js
│   │   └── ...
│   └── DebugOverlay.js
└── World/
    ├── FogOfWar.js              # GPU render + CPU state
    └── VisionSystem.js          # Source aggregation
```

**Source:** `sources/Claude/master_plan/MASTER_DEVELOPMENT_PLAN_v1_CLAUDE.md` (file structure), adapted per Human Owner Q16 (shim-based).

---

## 5. SimCore & Determinism

### 5.1 Fixed Timestep Loop

```javascript
// src/SimCore/core/GameLoop.js
export class GameLoop {
  constructor(config = {}) {
    this.tickRate = config.tickRate || 20; // Hz
    this.timestep = 1000 / this.tickRate;  // 50ms
    this.accumulator = 0;
    this.tick = 0;
  }

  accumulate(deltaMs) {
    this.accumulator += deltaMs;
    let stepsThisFrame = 0;

    while (this.accumulator >= this.timestep) {
      this.step();
      this.accumulator -= this.timestep;
      stepsThisFrame++;

      // Spiral of death prevention: max 5 steps per frame
      if (stepsThisFrame > 5) {
        this.accumulator = 0;
        console.warn('GameLoop: Dropped frames');
        break;
      }
    }

    return this.accumulator / this.timestep; // Alpha for interpolation
  }

  step() {
    this.tick++;
    // Process commands, update features, emit events
  }
}
```

### 5.2 Determinism Requirements

| Requirement | Implementation | Verification |
|-------------|----------------|--------------|
| **No Math.random()** | Use `SeededRNG.random()` | Grep codebase, CI check |
| **No Date.now() in logic** | Use `simCore.tick` | Grep codebase, CI check |
| **Sequential IDs** | `IdGenerator.next('e')` → `e_0`, `e_1`, ... | Unit test |
| **Fixed iteration order** | Arrays, not Sets/Maps for ordered ops | Code review |
| **Same inputs → same output** | Replay test: 1000 ticks, compare state hash | CI gate |

### 5.3 Seeded PRNG (Mulberry32)

```javascript
// src/SimCore/core/PRNG.js
export function createPRNG(seed) {
  let state = seed;
  return function() {
    state |= 0;
    state = state + 0x6D2B79F5 | 0;
    let t = Math.imul(state ^ state >>> 15, 1 | state);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
```

**Source:** `sources/Antigravity/Release000_MasterPlan/appendices/APPENDIX_MULTIPLAYER_INTERNET_STACK.md` (Mulberry32 code), `sources/Claude/master_plan/appendices/APPENDIX_E_RELEASES_SPRINTS_PR_PLAN.md` Release 004.

---

## 6. Command Queue Timeline

### 6.1 Data Model (Phase 1 - Demo 1.0)

The Command Queue Timeline is the **canonical scheduling mechanism** for all Action Features.

**Canonical reference:** `spec_sources/ASTEROBIA_CANONICAL_GRFDTRDPU_SYSTEM_2026-01-13.md` Section 8.6

#### 6.1.1 Core Concepts

| Concept | Definition |
|---------|------------|
| **Lane** | Category of actions (LOCOMOTION, PERCEPTION, TOOL, WEAPON) |
| **Clip** | A scheduled action with start tick, estimated duration |
| **Gummy Stretch** | Clip end is estimated; if action runs long, clip stretches |
| **Now Line** | Current tick; clips left of Now are past, right are future |
| **Per-Unit Pause** | Each unit can be paused independently; queue clock freezes |

#### 6.1.2 Lane Taxonomy (Demo 1.0)

| Lane | Features | Exclusivity |
|------|----------|-------------|
| LOCOMOTION | MOVE_ROLL, MATERA_TRANSPORT, UNIT_CARRIER | In-lane mutual exclusion |
| PERCEPTION | SUBSURFACE_SCAN | In-lane mutual exclusion |
| TOOL | MATERA_MINING, TERRAIN_SHAPING | In-lane mutual exclusion |
| WEAPON | WPN_SHOOT | In-lane mutual exclusion |

**Note:** OPTICAL_VISION is passive (always-on, no lane).

#### 6.1.3 Data Structures

```javascript
// Per-unit queue state
{
  unitId: "u_123",
  isPlaying: true,           // false = queue frozen
  loopEnabled: false,        // repeat sequence
  repeatStart: null,         // tick marker
  repeatEnd: null,           // tick marker
  lanes: {
    LOCOMOTION: [
      {
        clipId: "clip_1",
        actionType: "MOVE",
        startTick: 100,
        estimatedDuration: 50,  // ticks
        actualEndTick: null,    // set when complete
        payload: { waypointId: "wp_5" }
      }
    ],
    TOOL: [...],
    WEAPON: [...],
    PERCEPTION: [...]
  }
}
```

### 6.2 UI Strategy (Phased)

Per Human Owner Q4: **Phased approach with "profi alapokkal"** (professional foundations).

| Phase | UI Scope | Data Scope |
|-------|----------|------------|
| **Phase 1 (Demo 1.0)** | Hybrid: stable list + simple timeline bar | Full data model |
| **Phase 2 (Post-Demo)** | Full After Effects-style timeline | Same data model |

**Phase 1 UI Components:**
- `<command-queue-list>`: Ordered list of queued actions per unit
- `<command-queue-bar>`: Simple horizontal bar showing clip positions
- Play/Pause button per unit
- Loop toggle per unit

**Phase 2 UI Components (deferred):**
- Full timeline with drag-to-reorder
- Gummy stretch handles
- Repeat region markers
- Multi-unit view

**Source:** Human Owner Q4 answer, `spec_sources/ASTEROBIA_CANONICAL_GRFDTRDPU_SYSTEM_2026-01-13.md` Section 8.6.

---

## 7. Direct Control Integration

### 7.1 Current Implementation (PRESERVE)

**Status:** WORKING - DO NOT REGRESS

**Location:** `src/Entities/Unit.js` lines 88-91, 1474-1502

**Current behavior:**
```javascript
// Unit.js constructor (lines 88-91)
this.savedPath = null;           // Saved path when keyboard takes over
this.savedPathIndex = 0;         // Where we were on the path
this.keyboardOverrideTimer = 0;  // Time since last keyboard input
this.isKeyboardOverriding = false; // Currently being controlled by keyboard

// Unit.js update (lines 1474-1502)
// When keyboard input detected:
//   1. Save current path (if any)
//   2. Set isKeyboardOverriding = true
//   3. Reset keyboardOverrideTimer
// When no keyboard input for 0.5s:
//   1. Set isKeyboardOverriding = false
//   2. Resume saved path
```

**Visual feedback:** Orange glow when keyboard active (faster pulse: 6Hz vs 4Hz)

**Camera integration:** `SphericalCameraController4.js` transitions to third-person behind unit on keyboard control start.

### 7.2 SimCore Integration (Phase 0)

Direct Control must integrate with Command Queue without breaking existing behavior.

**Canonical requirement:** `spec_sources/ASTEROBIA_CANONICAL_GRFDTRDPU_SYSTEM_2026-01-13.md` Section 8.6.9

| State | Queue Behavior | Visual |
|-------|----------------|--------|
| Enter DC | Pause unit's command queue (all lanes) | Orange glow |
| During DC | MoveIntent from keyboard, queue frozen | Orange glow |
| Exit DC | Queue remains PAUSED until player presses PLAY | Selection glow |
| Resume | Engine computes return path to queued plan | Normal |

**Implementation approach:**
1. Extract DC state to SimCore (`simCore.directControl.activeUnitId`)
2. On DC enter: `unit.queueState.isPlaying = false`
3. On DC exit: queue stays paused, wait for explicit PLAY
4. On PLAY: compute return path internally, resume queue

**Migration path:**
```
CURRENT (Unit.js)              TARGET (SimCore + Unit.js render)
────────────────────────────────────────────────────────────────
isKeyboardOverriding    ──►    simCore.directControl.activeUnitId
savedPath              ──►    simCore.queueState[unitId].savedPlan
keyboardOverrideTimer  ──►    simCore.directControl.idleTimer
```

**Source:** Codebase inspection (`Unit.js:88-91, 1474-1502`), `spec_sources/ASTEROBIA_CANONICAL_GRFDTRDPU_SYSTEM_2026-01-13.md` Section 8.6.9.

---

*End of Part I + II (Foundation + Architecture)*

*Part III-V continue in subsequent commits.*

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 2.0.0 | 2026-01-24 | Claude Code + Adam | Initial v2 from reconciled sources |

---

*Continued in next commit: Part III (Features), Part IV (Multiplayer & Backend), Part V (Execution)*
