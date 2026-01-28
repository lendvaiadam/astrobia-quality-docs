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



## 3. Communication
*   **Mailbox:** `docs/MAILBOX.md` is for agent-to-agent syncing. Do not ask Ádám to read it.
*   **Changes:** Broadcast what changed, what is waiting, and what to test in every reply.
