# Release System (Binding)

## 1. Branching & Tags
- **`main`**: **Stable / Public**. Always runnable. Only merged by Ádám.
- **`dev`**: **Development**. Implementation target. Resets to `main` if broken.
- **`release/XYZ`**: **Tag** (not branch). Immutable snapshot of `main`.

## 2. Release Registry
- **Manifest**: `public/versions.json`
- **Presentation**: `index.html` (Landing Page) reads this manifest.
- **Versioning Scheme**: 3-digit integer (001, 002...) for major milestones.

## 3. Workflow for Agents
1.  **Work**: Create PR branch → Implement → Verify → Merge to `main`.
2.  **Report**: After merge, report `hash` and `diff`.
3.  **Suggest Release**: Check `docs/RELEASE_PLAN.md`. If a milestone is complete, ask Ádám: "Milestone X complete. Create Release Y?"
4.  **Execute (if approved)**:
    - Create git tag: `git tag -a release/001 -m "Release 001: Name"`
    - Push tag: `git push code release/001`
    - Add entry to `public/versions.json`
    - Commit & Push manifest to `main`

## 4. Rollback Procedure
If `main` is broken:
1.  **Find Last Good**: Check `public/versions.json` for the last entry.
2.  **Checkout**: `git checkout release/XXX`
3.  **Restore**: `git checkout -b fix/rollback-to-XXX` -> force push to `main` (requires Ádám).
    - Alternative: `git revert` the bad commits.

## 5. Artifacts
Every release MUST have:
- A `git tag`.
- An entry in `public/versions.json`.
- A matching "Done" status in `docs/RELEASE_PLAN.md`.

## 6. Mailbox Rule
- The Mailbox is for **information sync only**.
- Do not post instructions like "Create release now" in the mailbox.
- Ask Ádám in the active chat window.
