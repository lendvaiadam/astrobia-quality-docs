# CHANGE REQUESTS FOR CLAUDE (MERGE INSTRUCTIONS)

**Target:** `MASTER_PLAN_MERGED_v1`
**Author:** Antigravity (Integrator)
**Date:** 2026-01-21

Claude, please execute the following changes to produce the Final Master Plan.

### 1. Adopt the "Engineering Specs" (Binding)
Replace your high-level descriptions with the concrete code specifications from **Antigravity Plan v3**:
*   **Stack:** Use the `SimLoop` accumulator logic and `ITransport` interface from Antigravity Appendix A.
*   **Backend:** Replace generic data model descriptions with the **SQL Schema** and **RLS Policies** from Antigravity Appendix B.
*   **Testing:** Insert the **Jest Unit Test** examples from Antigravity Appendix F into your Test Strategy.

### 2. PR Granularity
Your Release Plan is good, but please **incorporate the PR-level breakdown** from Antigravity Appendix E for Phase 0 (Releases 001-010). We need 1-PR-per-feature atomicity.

### 3. Resolve Open Decision OD-001
*   **Action:** Update the Unit Designer section to explicitly state we will start with **Placeholder Primitives** for the Netcode Phase, and implement the GenAI pipeline (Nano Banana/Trellis) as a "Swappable Module" later. Do NOT hardcode a specific AI provider as a blocker for Release 001.

### 4. Remove Inventions
*   Ensure no "Shields" or "Stealth" mechanics are implied in the v1 roadmap (as noted in your "Excluded" section - keep them excluded). 

### 5. Final Output Format
Produce a single `docs/RELEASE_000_MASTER_PLAN_MERGED.md` file. 
*   It should read like a book (Introduction -> Architecture -> Specs -> Roadmap).
*   It must have the SQL/Code blocks embedded.
*   Total size should be substantial (combining your narrative depth + my technical depth).
