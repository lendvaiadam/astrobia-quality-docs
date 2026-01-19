# Branch Protection Checklist (Manual Setup)

Since I cannot modify GitHub repository settings directly, please perform these steps manually to prevent future data loss.

1. Go to Repository **Settings** > **Branches**.
2. Click **"Add branch protection rule"**.
3. **Branch name pattern**: `main`
4. **Protect matching branches**:
    - [x] **Require a pull request before merging** (Prevents direct pushes)
    - [x] **Require status checks to pass before merging** (Select `Required Docs Check` once the Action is active)
    - [x] **Do not allow bypassing the above settings** (Crucial!)
    - [x] **Restrict who can push to matching branches** (Optional: Uncheck this if PRs are required, effectively restricting pushes)

> [!WARNING]
> WITHOUT THIS, ANY AGENT OR USER CAN FORCE-PUSH AND DELETE HISTORY AGAIN.
