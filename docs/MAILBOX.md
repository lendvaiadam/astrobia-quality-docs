# MAILBOX — Cross-Agent Requests (Shared)
Purpose: A lightweight request queue for cross-agent handoffs.
All communication still flows through Ádám (copy/paste relay), but this file records “who is waiting for what”.
Keep items short. Prefer checklists over paragraphs.

> **BINDING RULE**: Do NOT put instructions for Ádám here. Allowed: Status, Questions, Risks, Ready-to-paste content (if addressed to another agent). Determine next steps in Chat.

Last updated: 2026-01-15 (Europe/Budapest)

---

## How to use
- Add a new item under OPEN with a unique ID.
- When done, move the item to DONE and add the completion note + link.
- If an item blocks progress, mark Priority as P0.

Item format:
- ID: MBX-000
  From -> To:
  Priority: P0 | P1 | P2
  What is needed:
  Where to reply (via Ádám):
  Links:

---

## OPEN

- ID: MBX-001
  From -> To: Ádám -> Claude
  Priority: P0
  What is needed: PR#1 kickoff confirmation: target tick rate (default 20Hz) + minimum commands to support first (move/stop).
  Where to reply (via Ádám): Claude chat response with chosen values.
  Links: docs/STATUS_WALKTHROUGH.md

- ID: MBX-002
  From -> To: Ádám -> ChatGPT
  Priority: P1
  What is needed: PR#1 Claude kickoff prompt.
  Delivery rule (binding): This prompt may be stored here for agent-to-agent context, but it must be delivered to Claude via ChatGPT in chat (paste-ready) with short rationale + test checklist. Do not instruct Ádám to open MAILBOX.
  **Decisions**:
  - Authority Rate: 20Hz
  - Commands: MOVE, STOP
  **Prompt Content**:
  ```markdown
  You are Claude Code (Senior Engine Architect & Implementer).
  Project: Asterobia (RTS/Simulation).
  Phase: Phase 0 "Netcode Readiness" Refactor.
  
  Your Goal: Implement "Release 001: Fixed Timestep Authority".
  
  CONTEXT (Read these first!):
  1. docs/START_HERE.md (Entry point)
  2. docs/RELEASE_PLAN.md (See Milestone 001 definition)
  3. publish/quality_docs_snapshot_2026-01-14/spec_sources/ASTROBIA_CANONICAL_GRFDTRDPU_SYSTEM_2026-01-13.md (Appendix A: Networking Contracts)
  
  REQUIREMENTS (Binding):
  - **Fixed Timestep**: Implement a 20Hz authority heartbeat in `SimCore`.
  - **Shim Integration**: Do NOT rewrite Game.js yet. Create `shim/SimCore.js` (or similar) and route `Game.js` update loop to feed it.
  - **Command Stream**: replace direct unit mutations with a minimal Command Queue (Types: MOVE, STOP).
  - **Rendering**: Logic runs at 20Hz; Render runs at requestAnimationFrame (interpolate visual state if possible, or just snap for PR#1).
  - **Determinism**: Do not use Date.now() / Math.random() in the authority loop.
  
  OUTPUT:
  - Create branch `dev` (if not exists) -> `pr1-fixed-timestep`.
  - Implement changes.
  - Verify game is still playable.
  - Commit with message "feat(netcode): release 001 fixed timestep heartbeat".
  ```

- ID: MBX-003
  From -> To: Ádám -> Antigravity
  Priority: P1
  What is needed: Confirm CANONICAL_SOURCES_INDEX contains raw-friendly absolute links (append-only) and return raw link.
  Where to reply (via Ádám): Antigravity paste raw link + commit hash.
  Links: baseline/pre-claude-stable/docs/CANONICAL_SOURCES_INDEX.md

---

## DONE
(None)
