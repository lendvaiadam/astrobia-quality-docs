# APPENDIX: FEATURE DEPENDENCY GRAPH

**Parent Document:** [Big Picture Master Plan](../BIG_PICTURE_MASTER_PLAN_v1_ANTIGRAVITY.md)
**Scope:** Visualizing the implementation order of the 7 Canonical Features.

---

## 1. Dependency Philosophy
The G-R-F-Tr-D-P-U pipeline dictates order.
1.  **Locomotion Is Root:** Nothing works if things don't move.
2.  **Perception Is Key:** You can't shoot what you can't see (or select).
3.  **Tool Lane Is Complex:** Mining requires Navigation + Tools.

---

## 2. The Dependency Graph (Mermaid)

```mermaid
graph TD
    classDef baseline fill:#f9f,stroke:#333,stroke-width:2px;
    classDef phase1 fill:#bbf,stroke:#333,stroke-width:2px;
    classDef phase2 fill:#ddd,stroke:#333,stroke-width:1px;

    %% Baseline Infrastructure
    Net[Netcode Foundation (SimCore)]:::baseline
    Loop[Fixed Timestep Loop]:::baseline
    State[State Registry]:::baseline
    Cmd[Command Queue]:::baseline

    Loop --> Net
    Cmd --> Net
    State --> Net

    %% Phase 1 Features
    Move[F01: MOVE_ROLL]:::phase1
    Vis[F03: PERCEPTION_OPTICAL]:::phase1
    Mine[F05: MATERA_MINING]:::phase1
    Trans[F06: MATERA_TRANSPORT]:::phase1
    Scan[F04: PERCEPTION_SCAN]:::phase1
    Shape[F07: TERRAIN_SHAPING]:::phase1
    Wpn[F02: WPN_SHOOT]:::phase1

    %% Dependencies
    Net --> Move
    Move --> Vis
    Vis --> Wpn
    Move --> Scan
    Move --> Mine
    Mine --> Trans
    Trans --> Shape
    
    %% Implicit
    Vis -.->|Targeting| Wpn
    Scan -.->|Targeting| Mine

    %% GRFDTRDPU
    Design[D - Designer UI]:::phase1
    Prod[P - Production Factory]:::phase1
    
    Design --> Prod
    Prod --> Move

```

## 3. Sequencing Logic

### Sequence 1: The "rover" (SimCore + Move)
*   **Why:** Minimum Testable Product. A ball rolling on terrain.
*   **Requires:** Physics, Input, Rendering.

### Sequence 2: The "Observer" (Vision)
*   **Why:** Adds interaction limits (Fog of War).
*   **Requires:** Grid system, Raycasting.

### Sequence 3: The "Miner" (Scan + Mine)
*   **Why:** First Economy loop.
*   **Requires:** World Objects (Deposits), Resource State.

### Sequence 4: The "Truck" (Transport)
*   **Why:** Completes the economy loop (Source -> Sink).
*   **Requires:** Inventory State, Weight Physics.

### Sequence 5: The "Soldier" (Weapon)
*   **Why:** The conflict loop.
*   **Note:** Left for last in Phase 1 because it's easiest to verify once Movement is solid.

---
*End of Appendix*
