---
name: asterobia-bug-discipline
description: Protocol for logging, tracking, and fixing bugs.
---

# Asterobia Bug Discipline Skill

## When to use
- When a test fails or a defect is observed.
- Before starting a "Fix" task.
- When browsing `docs/BUGLIST.md`.

## The Protocol

1.  **Log First, Fix Later**:
    -   NEVER fix a bug "on the fly" without logging it, unless it's a trivial compilation error during active dev.
    -   Create an entry in `docs/BUGLIST.md`.
    -   Format: `BUG-YYYYMMDD-NNN: Title`.

2.  **Triage**:
    -   **Status**: `OPEN`, `IN_PROGRESS`, `FIXED`, `WONTFIX`.
    -   **Priority**: `CRITICAL` (Blocker), `HIGH` (Major), `NORMAL` (Minor).
    -   **Release**: Assign target release (e.g., `Target: R012`).

3.  **Fix & Verify**:
    -   Reproduce the bug with a Test Case (if possible).
    -   Implement the fix.
    -   Verify with Test or HU confirmation.
    -   Update `BUGLIST.md` to `FIXED` with SHA or PR link.

4.  **Known Gaps**:
    -   If a feature is incomplete but acceptable for current release, log as `KNOWN-GAP`.
    -   Example: `KNOWN-GAP-R011-001: Fog of War not saved`.

## Discipline
-   Do not delete fixed bugs immediately; keep them for history (move to Archive section if file grows too large).
-   Reference the Bug ID in commit messages: `Fix BUG-20260131-001: Rotation sync`.
