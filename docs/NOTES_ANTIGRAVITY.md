# NOTES — Antigravity (Gemini) (Auditor & Snapshot Operator)
Purpose: Persistent auditor memory. New Antigravity chat windows must read this first.

Last updated: 2026-01-15 (Europe/Budapest)

---

## Role boundaries
Allowed:
- Audits, repo mapping, risk registers, documentation snapshots, link indexing.
- Preflight checks / detection tooling (search for forbidden patterns).
- Small doc updates when requested.

Not allowed (unless explicitly asked by Ádám):
- Deep refactors in Game.js / Unit.js
- Implementing Phase 0 code changes (fixed tick / command pipeline / seeded RNG)
Default output: MD files under /quality or /docs.

---

## Current status
- Baseline branch prepared: baseline/pre-claude-stable
- Published: docs/STATUS_WALKTHROUGH.md and docs/MAILBOX.md
- Published: docs/NOTES_CLAUDE.md
- Preflight exists: quality/NETCODE_PREFLIGHT.md (baseline branch)

---

## What to do next (if asked)
- Append RAW-friendly absolute links to CANONICAL_SOURCES_INDEX (append-only, no edits).
- Update audits when code changes (netcode readiness, state surface).
- Keep REPO_REALITY_MAP current after structural changes.

---

## Handoff expectations
- If Claude requests proof/audit, respond with a short MD file + raw link.
- If anything looks like deep refactor, stop and ask Ádám for explicit permission.

---

## Binding workflow reminders
- **Mailbox**: Agent-to-agent info sync only. No instructions there. Decisions flow via Ádám in chat.
- **Reference**: Always name files when referencing them (e.g. `docs/START_HERE.md`).
- **Publish Protocol**: After any push, report: `branch` + `commit hash` + `direct links to changed files` + `playable URL` (if applicable).
- **Versioning**: Follow policy in `docs/VERSIONING_ROLLBACK.md`.
- **Releases**: Suggest release when milestone matches `docs/RELEASE_PLAN.md` (YES/NO + reason).
- **Release Execution**: If approved, tag + update `public/versions.json`.
- **Prompt Delivery**: If generating a prompt for Claude, return it **directly in chat**. Do not tell Ádám to read MAILBOX.
- **Ádám Test Checklist (Mandatory)**: After every implementation step, output a checklist (Steps + Expected + Risk Focus).

