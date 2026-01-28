# R002 Smoke Test Log (Template)

**Date:** YYYY-MM-DD
**Branch:** `work/r002-command-buffer`
**Tester:** [Name]

## 1. Discrete Actions (Command-Only Check)
*   [ ] **Selection:** Click Unit -> UI Updates? (Command: `SELECT`)
*   [ ] **Deselection:** Click Ground -> Selection clears? (Command: `DESELECT`)
*   [ ] **Set Path:** Shift+Click Ground -> Green line/marker appears? (Command: `SET_PATH`)
*   [ ] **Move:** Right-Click Ground -> Unit moves? (Command: `MOVE`)
*   [ ] **Stop:** Stop Button -> Unit stops? (Command: `STOP`)

## 2. continuous Input (Scope Guard Check)
*   [ ] **WASD:** Arrow keys still move the camera/unit? (Polled in `simTick`) -> **MUST WORK**

## 3. Console Check
*   [ ] No "CommandProcessor: Unknown command" errors.
*   [ ] No "Cannot read property of undefined" loops.

## Result
*   [ ] PASS
*   [ ] FAIL (Blocker details below)
