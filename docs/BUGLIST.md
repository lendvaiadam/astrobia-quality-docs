# BUGLIST - Canonical Bug Backlog

This file is the single source of truth for known bugs that are not yet fixed.
**Protocol:**
- Discovering a bug -> IMMEDIATE entry here.
- Fixing is optional; recording is mandatory.
- Use the template below for consistency.

---

## BUG-20260130-001
**Title:** Unit selection via bottom tabs does not emit SELECT command in overlay history
**Area:** Input/UI
**Where:** game.html → bottom unit tabs; CMD overlay history
**Repro steps:**
1. Open http://localhost:8081/game.html
2. Toggle CMD overlay ON (`Shift+C`)
3. Click unit on canvas → SELECT appears in history
4. Click the same unit via bottom unit tabs → NO SELECT appears
**Expected:** tab selection also emits SELECT command (visible in overlay history)
**Actual:** tab selection changes selection visually, but command history does not reflect it
**Severity:** Minor (unless you consider this a determinism/input unification requirement)
**Determinism Impact:** No (debug visibility / inconsistent input pipeline)
**Suggested Fix:**
Route tab UI selection through InputFactory or emit a SELECT command into the queue.

**Notes/Links:**
- `src/UI/BottomPanel.js`
- `src/Core/Input.js`

---
