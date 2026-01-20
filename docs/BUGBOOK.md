# Bugbook (Troubleshooting & Known Issues)

## 1. How to use this document
Check this list if you encounter recurring Git, Workflow, or Runtime issues.
**Golden Rule:** If you fix a recurring bug twice, add it here.

## 2. Recurring Git/GitHub Issues

### Raw Link 404 / "False 404"
*   **Symptom:** Newly pushed file returns 404 on raw.githubusercontent.com link.
*   **Cause:** GitHub raw CDN caching delay (up to 5 mins).
*   **Fix Steps:**
    1.  Wait 2-5 minutes.
    2.  Hard refresh (Ctrl+F5).
    3.  Append `?nocache=1` to the URL.
*   **Verification:** File content appears.

### Untracked Folders Not Pushed
*   **Symptom:** Local files exist (e.g., `src/SimCore`) but are missing on Remote.
*   **Cause:** Empty folders are ignored by git, or `.gitignore` rules.
*   **Fix Steps:**
    1.  Run `git check-ignore -v <path>`.
    2.  If ignored, edit `.gitignore`.
    3.  If empty, add `.gitkeep`.
    4.  `git add .` -> `git commit`.
*   **Verification:** `git ls-tree -r HEAD <path>` shows files.

### Branch Mismatch / Wrong Remote
*   **Symptom:** `git push` fails or pushes to wrong place.
*   **Cause:** User has multiple remotes (`origin`, `code`) or detached HEAD.
*   **Fix Steps:**
    1.  `git remote -v` to check remotes (Target: `code`).
    2.  `git checkout main` (or `dev`).
    3.  `git push code main`.
*   **Verification:** `git log` shows `code/main` aligned.

## 3. Recurring Workflow Issues

### Mailbox Misuse
*   **Symptom:** Prompts for Ádám stored in `docs/MAILBOX.md`.
*   **Cause:** Agent misunderstanding "Mailbox is for sync only".
*   **Fix Steps:**
    1.  Move prompt to Agent Chat (paste-ready).
    2.  Replace Mailbox content with "Delivery Rule" note.
    3.  Do not instruct Ádám to read Mailbox.

### Missing Canonical Reading
*   **Symptom:** Plan proposes `dt`-based movement or direct `Unit.js` mutation.
*   **Cause:** Agent skipped `NETCODE_READINESS_AUDIT.md`.
*   **Fix Steps:**
    1.  **PAUSE**.
    2.  Force read of `quality/NETCODE_READINESS_AUDIT.md`.
    3.  Reject plan until fixed timestep is adopted.

## 4. Runtime/Dev Issues (Known)

### Nondeterministic Physics / Movement
*   **Symptom:** Units move differently on different frame rates.
*   **Cause:** `clock.getDelta()` usage in `Game.js`.
*   **Fix Plan:** Release 001 (Fixed Timestep Shim).

### ID Collision / Divergence
*   **Symptom:** Entity IDs differ between runs or clients.
*   **Cause:** `Date.now()` / `Math.random()` in ID generation.
*   **Fix Plan:** Release 002 (Deterministic IDs).
