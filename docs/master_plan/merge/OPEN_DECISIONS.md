# RELEASE 000: OPEN DECISIONS

**Date:** 2026-01-21
**Status:** **BLOCKING MERGE**

These items are undefined in Canonical Specs or disputed between plans.

---

### OD-001: Generative AI Asset Pipeline
**Context:** Antigravity's plan explicitly names "Nano Banana" (Image) and "Trellis" (3D) as the asset generation stack. Claude's plan mentions the "Designer" but details are vague.
**Canonical Status:** `ASTEROBIA_CANONICAL_FEATURE_UNIT_DESIGNER_2026-01-18.md` does NOT explicitly mandate "Nano Banana".
**Options:**
*   **A)** Commit to Nano Banana + Trellis (Risk: External API dependency/cost).
*   **B)** Use "Placeholder Primitives" (Cubes/Spheres) for v1 (Safe, low cost).
*   **C)** Use generic "Text-to-Image" interface and decide provider later.
**Recommendation:** **Option B (Placeholders)** for Release 001-010 to ensure Netcode focus. Add GenAI in Phase 1 (Release 011+).
**Decision Trigger:** Before Release 010 (Backend Readiness).

### OD-002: Backend Auth Strategy
**Context:** Claude proposes "Host Trusts Client" for Phase 1. Antigravity proposes Supabase Auth RLS immediately.
**Options:**
*   **A)** Loose Auth (Dev Speed): Clients can spoof IDs.
*   **B)** Strict Auth (Security): Require JWT on every Socket connection.
**Recommendation:** **Option B**. Since we use Supabase, we get JWTs for free. Using RLS from day 1 prevents tech debt.
**Decision Trigger:** Release 010.

---
*End of Open Decisions*
