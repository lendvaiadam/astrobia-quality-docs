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
*   **Gates:** Strictly adhere to `docs/IMPLEMENTATION_GATES.md`.

## 3. Communication
*   **Mailbox:** `docs/MAILBOX.md` is for agent-to-agent syncing. Do not ask Ádám to read it.
*   **Changes:** Broadcast what changed, what is waiting, and what to test in every reply.
