# BUGLIST - Canonical Bug Backlog

This file is the single source of truth for known bugs that are not yet fixed.
**Protocol:**
- Discovering a bug -> IMMEDIATE entry here.
- Fixing is optional; recording is mandatory.
- Use the template below for consistency.

---

## BUG-20260130-001
**Title:** Unit selection via bottom tabs does not emit SELECT command in overlay history
**Area:** UI / Input
**Where:** `game.html` (Main Game Loop)
**Repro steps:**
1. Open `/game.html`
2. Toggle CMD overlay (`Shift+C`)
3. Click unit on canvas -> Verify SELECT command appears in overlay
4. Click unit in bottom panel unit tabs -> Observe unit is selected locally (visuals)
5. Check overlay history -> **No SELECT command appears**

**Expected:**
SELECT command should be generated and processed via `Input` -> `CommandQueue` regardless of selection method (canvas click vs GUI tab click).

**Actual:**
Tab click likely bypasses `Input.js` / `CommandQueue` and calls `Game.selectUnit` directly or via a non-command event handler.

**Severity:** Medium (Inconsistency in determinism/command log)
**Determinism Impact:** Yes. Selection state drift if inputs are not normalized to commands.
**Suggested Fix:**
Refactor `BottomPanel.js` or `Game.js` tab click handler to route through `Input` or generate a `SELECT` command instead of direct method call.

**Notes/Links:**
- `src/UI/BottomPanel.js`
- `src/Core/Input.js`

---
