# Versioning and Rollback Policy

## Branching Strategy
- **`main`**: **Stable / Public**. This is the source for production builds.
- **`dev`**: **Latest Development**. Integration branch for finished features.
- **`feature/*`**: **Work Branches**. Isolated workspaces for agents or features.

## Good Build Registry
We maintain a registry of "Known Good" states using Git Tags.
- **Tag Format**: `good/YYYY-MM-DD_<short_sha>`
- **Rule**: Create this tag only after verifying the build runs correctly.

## Version Manifest (`versions.json`)
`play.asterobia.com` listing relies on a manifest file.
- **Fields**:
  - `path`: URL/Path to the build index.html
  - `label`: Display name (e.g., "Alpha 1.2")
  - `commit`: Full git hash
  - `date`: Release date
  - `notes`: Changelog summary

## Snapshot Policy
- **Code-Only**: To save space, build snapshots should only contain code artifacts (JS, WASM, HTML, CSS).
- **Shared Assets**: Common assets (Textures, Audio, Models) should be stored in a shared directory and referenced, not duplicated in every snapshot.

## Rollback Procedure
In case of critical failure:
1.  **Identify**: Find the latest `good/` tag in the registry.
2.  **Switch**: Point the launcher/manifest live entry to the path of that good build.
3.  **Reset (if needed)**: `git checkout dev && git reset --hard <tag>` to clear poisoned code from development.

## Publish Verification Rule (Binding)
**After any git push that changes runnable code, the output must include:**
1.  **Branch Name**
2.  **Commit Hash**
3.  **List of Affected Files**
4.  **Playable URL** (if the build was deployed) or "Local Only"
