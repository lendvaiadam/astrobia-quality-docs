# STATUS WALKTHROUGH (Living Document)

STATE (2026-01-29): Final Master Plan v2 is merged to main. Do NOT request new plans. Use docs/master_plan/final_v2/ as authoritative.

Last updated: 2026-01-29 (Europe/Budapest)

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

**POST-PLAN PHASE**
1. **Sync**: Ensure you are on `main` or a feature branch off `main`.
2. **Read**: The authoritative source is `docs/master_plan/final_v2/`.
3. **Execute**: Proceed with the active Work Package (currently R002 Command Buffer) as defined in the Final Plan.
4. **Docs**: If you find discrepancies, update the docs to match the Final Plan, do NOT request a new plan.

### Current Work Package
- **RELEASE 002 — COMMAND BUFFER** (See `docs/master_plan/final_v2/` for details)

### Done When
- R002 Implementation Complete
- Smoke Test PASS

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

### RELEASE 002 ROLE MAP (SimCore Command Buffer)
*   **Worker-1: ARCHITECT — Command Infrastructure**
    *   Scope: `CommandTypes.js`, `CommandQueue.js`, `CommandProcessor.js`
    *   Goal: Create the "plumbing" for commands to exist and be queued.
*   **Worker-2: REFACTORER — Input Factory**
    *   Scope: `InputFactory.js`, `InteractionManager.js`
    *   Goal: Convert mouse clicks from "direct mutation" to "Command Object creation".
*   **Worker-3: INTEGRATOR — Game Loop Wiring**
    *   Scope: `Game.js`, `index.js` (SimCore)
    *   Goal: Ensure `CommandProcessor.process()` runs exactly once per tick in `GameLoop`.
*   **Worker-4: QA — Determinism Verification**
    *   Scope: `tests/SimCore/commands.test.js`
    *   Goal: Verify commands execute in strict order and timestamp is respected.
*   **Worker-5: UI — Visual Debugger**
    *   Scope: `DebugOverlay.js`
    *   Goal: Visualize the queue size and current command execution (simple text).

---

## LATER
- (See IDEA_LOG.md for triage)
