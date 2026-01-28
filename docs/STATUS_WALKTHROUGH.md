# STATUS WALKTHROUGH (Living Document)

<<<<<<< Updated upstream
## NOW
=======
Last updated: 2026-01-15 (Europe/Budapest)

---

## Current baseline
- Stable starting ref: baseline/pre-claude-stable
- Canonical index (stable): https://raw.githubusercontent.com/lendvaiadam/asterobia/baseline/pre-claude-stable/docs/CANONICAL_SOURCES_INDEX.md
- Preflight: https://raw.githubusercontent.com/lendvaiadam/asterobia/baseline/pre-claude-stable/quality/NETCODE_PREFLIGHT.md

---

## Direction (what we are building toward)
Phase 0 “Netcode Readiness” (binding):
- Fixed-timestep authority loop (no dt-based authority).
- Command-stream input only.
- Deterministic IDs + seeded PRNG.
- Authoritative snapshot surface export.
- ITransport abstraction (Local now, later multiplayer/backend).

- Host-authoritative as MVP; backend Phase 1 = Auth + Lobby/Signaling.

---

## CURRENT STATE / HANDOFF (2026-01-28)
*   **R001 (Fixed Timestep) DONE:**
    *   Merged to `code/main` (SHA: `6d7a168`).
    *   Status: Fixed 50ms SimLoop + renderUpdate separation verified. Smoke Pass.
*   **R002 (Command Buffer) IN PROGRESS:**
    *   Active Branch: `work/r002-command-buffer` (Tip: `0b237af` on `code` remote).
    *   **Scope:** Discrete click actions (SELECT, DESELECT, SET_PATH, ADD_WAYPOINT) are now **Command-Only**.
    *   **Scope Guard (Binding):** Keyboard/WASD input remains **POLLED** in `simTick` (deterministic enough for 20Hz V0). UI Panel actions deferred to R002b.
    *   **Architecture:** `InteractionManager` -> `CommandQueue` -> `simTick` -> `CommandProcessor`.
*   **Testing Rule (Binding):** Every implementation step/commit MUST include a **HU (Human-Usable) Test Script** in the commit/PR description.
*   **Console Note:** "Async response channel closed" errors are currently benign (browser extension noise) unless gameplay is affected.

--- ## NOW
>>>>>>> Stashed changes
### Current Work Package
- **RELEASE 002 — COMMAND BUFFER**
  Implement the Command Queue Shim to stop direct state mutation.

### Tasks
- [x] **Release 001** (Fixed Timestep) COMPLETE (Merged to `code/main` / Smoke Test PASS).
- [ ] **Release 002** (Command Object/Queue) STARTING.

### Deliverables
- `src/SimCore/CommandQueue.js`
- `src/Core/Input.js` (Refactor to emit commands)

### Previous Blocks (Done)
- [x] SimLoop.js created (50ms fixed tick)
- [x] Game.js wired
- [x] Smoke Test PASS (see `docs/TEST_LOGS/R001_SMOKE_TEST.md`)


### Commits (on code remote)
- `eea9311` r001: add SimLoop fixed 50ms accumulator
- `6d7a168` r001: wire SimLoop fixed tick into Game loop

### Migration Note
R001 code was initially pushed to `origin` (quality-docs) by mistake. Commits have been cherry-picked to `code` remote (asterobia.git) on branch `work/r001-determinism-wiring`. Quality-docs history remains intact (no destructive ops).

### Next Blockers (Determinism Scan Results)
- **E2: Unseeded Randomness** — 10 BLOCKER sites in src/ (Math.random in IDs, spawn positions, replanning)
- **E3: Non-Deterministic Timestamps** — 5 BLOCKER sites (Date.now in command IDs, TypeBlueprint)

### Done When
- PR merged to code/main
- Determinism scan shows E1 (variable timestep) resolved
- Game still runs (smoke test)

---

## COMPLETED

### RELEASE 000 — MERGE ROUND (COMPLETE)
Synthesized the Final Executable Master Plan from Claude and Antigravity drafts.

**Deliverables (all committed):**
- `docs/master_plan/merged/MASTER_PLAN_MERGED_v1.md`
- `docs/master_plan/final_v2/MASTER_PLAN_FINAL_v2.md` (with 9 appendices)
- `docs/master_plan/merge/` artifacts (Coverage Matrix, Open Decisions, Change Requests)

**Approval Checkpoint:** Ádám acknowledged Master Plan v2 direction (DATE_TBD).

---

## WORK PACKAGE ROLE MAP (BINDING)
- Antigravity MUST assign and publish the Role Map for each Work Package.
- Ádám MAY override role assignments by explicit instruction.
- Execution MUST NOT start until the Role Map is published here.
- Roles are dynamic per Work Package; do not force tasks into fixed specialties.
- Required format:
  - Worker-1: <role> — <scope>
  - Worker-2: <role> — <scope>
  - Worker-3: <role> — <scope>
  - Worker-4: <role> — <scope>
  - Worker-5: <role> — <scope>
- Each worker output MUST include:
  (a) summary, (b) files touched, (c) acceptance criteria, (d) compact HU test scenario for Ádám.

---

## LATER
- (See IDEA_LOG.md for triage)
