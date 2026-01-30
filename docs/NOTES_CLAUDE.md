# NOTES — Claude (Implementation & Planning)

**Purpose:** Persistent memory for Claude / Claude Code. Read this at the start of every session.

## 1. Interaction Guidelines (Binding)
*   **Token Efficiency:** Do NOT waste tokens on long conversational filler.
*   **Focus:** High-quality coding is the priority.
*   **Chat Style:** Concise, precise, engineering-focused.
    *   *Bad:* "Certainly! I would be happy to help you with that. Here is a comprehensive explanation of..."
    *   *Good:* "Fixed. Implementation details: ..."
*   **Omission:** Do not include code or text in the chat unless it is necessary for the context or explicitly requested.

## 2. Workflows
*   **Master Plan:** Follow `docs/master_plan/MASTER_DEVELOPMENT_PLAN_Merged_v1.md` (once created).
## 4. Binding Rules
*   **Remote Discipline:**
    *   **Code** (`src/`, `package.json`): Push to `code` remote (`lendvaiadam/asterobia`).
    *   **Docs** (`docs/`, `quality/`): Push to `origin` remote (`lendvaiadam/asterobia-quality-docs`).
*   **Determinism Invariant:**
    *   After **Release 001** (Fixed Timestep) is merged: **ZERO** non-deterministic code allowed.
    *   Forbidden: `Date.now()` (logic), `Math.random()` (unseeded), `requestAnimationFrame` (sim).
*   **Rule Discovery & Documentation Protocol:**
    *   **Authority:** `docs/NOTES_CLAUDE.md` + `CURRENT_SYSTEM_SPEC.md` are authoritative. Chat memory is transient.
    *   **New Rules:** Apply newly documented rules immediately without re-validation.
    *   **No Invention:** Do not invent workflow rules. If you think a rule exists, verify it is in `docs/`. If not, ask Antigravity to document it first.
*   **Ádám Test Checklist (Mandatory):**
    *   After EVERY implementation step, output a "Test Checklist (Ádám)" section.
    *   Includes: 3-10 steps + Expected Results + Risk Focus.
*   **Bug Backlog Protocol (Mandatory):**
    *   Canonical Source: `docs/BUGLIST.md`
    *   If a bug is found, record it IMMEDIATELY in BUGLIST.
    *   Fixing is optional; recording is mandatory.
*   **Proactive Suggestions (Mandatory):**
    *   For every executed instruction, provide "Optional Suggestions (1–3 bullets)".
    *   Focus on: Risk spotted, Inconsistency, or Alternative/Better approach.
    *   Do NOT narrate long logs. Keep execution report minimal.



<<<<<<< Updated upstream
=======
## Binding rules (non-negotiable)
- No dt/frame-time authority logic. Authority advances on fixed ticks only.
- Input/UI must emit Commands; only SimCore.step consumes commands and changes authoritative state.
- Deterministic IDs only (no Date.now / Math.random for authority IDs).
- Seeded PRNG for any authoritative randomness; Math.random allowed only for render-only.
- Snapshot export must include authoritative surface only (exclude render-only).
- **Testing Rule (Binding):** Every commit/PR description must include a **HU (Human-Usable) Test Script**.
- **R002 Scope Guard:** Do NOT refactor WASD/Keyboard yet. Keep `Input.js` polling. Focus on Clicks.
- Add ITransport abstraction (Local now; later multiplayer/backend transport swap).

Reference: Canonical Phase 0 + GRFDTRDPU Appendix A (see docs/CANONICAL_SOURCES_INDEX.md).

---

## Implementation order (target)
1) Fixed-timestep SimCore heartbeat (accumulator; render is separate).
2) Command buffer per tick (Input -> Command -> SimCore.step).
3) Deterministic IDs + seeded RNG in authority paths.
4) Snapshot export (authoritative surface).
5) ITransport Local stub (interface boundary only).

---

## Open questions for Ádám
- Confirm target tick rate (default recommendation: 20Hz).
- Confirm minimum command types to support first (minimum: MOVE, STOP).

---

## Risks
- Unit.js is a monolith. Avoid deep rewrites at PR#1; prefer routing through shim entrypoints.

---

## Binding workflow reminders
- **Mailbox**: Agent-to-agent info sync only. No instructions there. Decisions flow via Ádám in chat.
- **Reference**: Always name files when referencing them (e.g. `docs/START_HERE.md`).
- **Publish Protocol**: After any push, report: `branch` + `commit hash` + `direct links to changed files` + `playable URL` (if applicable).
- **Versioning**: Follow policy in `docs/VERSIONING_ROLLBACK.md`.
- **Releases**: Check `docs/RELEASE_PLAN.md`. If your PR completes a milestone, report it.
>>>>>>> Stashed changes

## 3. Communication
*   **Mailbox:** `docs/MAILBOX.md` is for agent-to-agent syncing. Do not ask Ádám to read it.
*   **Changes:** Broadcast what changed, what is waiting, and what to test in every reply.
