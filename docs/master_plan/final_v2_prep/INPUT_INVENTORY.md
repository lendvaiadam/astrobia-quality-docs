# INPUT INVENTORY: Files Read for MASTER_PLAN_FINAL_v2

**Date:** 2026-01-24
**Purpose:** Inventory of all source files opened during Final v2 preparation.

---

## 1. Merge Control Files

| Path | Lines | Purpose | Target Section |
|------|-------|---------|----------------|
| `docs/master_plan/merged/MASTER_PLAN_MERGED_v1.md` | 789 | Previous merge attempt - authoritative baseline for v1 decisions | All sections (validation reference) |
| `docs/master_plan/merge/CHANGE_REQUESTS_FOR_CLAUDE.md` | 38 | Explicit merge directives from human owner | Merge Provenance + Section priorities |
| `docs/master_plan/merge/COVERAGE_MATRIX.md` | 37 | Gap analysis between Claude/Antigravity plans | Coverage Proof + Gap sections |
| `docs/master_plan/merge/OPEN_DECISIONS.md` | 50 | Decisions requiring resolution (UI, Snapshots, Replay) | Open Decisions section |

---

## 2. Claude Source Plans

| Path | Lines | Purpose | Target Section |
|------|-------|---------|----------------|
| `sources/Claude/master_plan/MASTER_DEVELOPMENT_PLAN_v1_CLAUDE.md` | 1236 | Claude's full end-to-end plan (PR breakdown, SQL schema) | Execution Plan, Backend Schema, Risk Register |
| `sources/Claude/master_plan/appendices/APPENDIX_A_MULTIPLAYER_INTERNET_STACK.md` | 630 | Transport layer, WebRTC, signaling details | Section 5: Multiplayer Stack |
| `sources/Claude/master_plan/appendices/APPENDIX_B_BACKEND_DATA_MODEL.md` | 640 | Supabase schema, RLS, persistence | Section 7: Backend & Services |
| `sources/Claude/master_plan/appendices/APPENDIX_C_GRFDTRDPU_IMPLEMENTATION.md` | 950 | Full GRFDTRDPU module code | Section 9: GRFDTRDPU Implementation |
| `sources/Claude/master_plan/appendices/APPENDIX_D_FEATURE_DEPENDENCY_GRAPH.md` | 480 | ASCII dependency graphs, lane mappings | Section 10: Feature Dependency Graph |
| `sources/Claude/master_plan/appendices/APPENDIX_E_RELEASES_SPRINTS_PR_PLAN.md` | 641 | Detailed PR breakdown per release | Section 12: Release/Sprint/PR Plan |
| `sources/Claude/master_plan/appendices/APPENDIX_F_TESTING_RISKS_OBSERVABILITY.md` | 732 | Testing strategy, risk details, debug tools | Section 13: Testing + Section 14: Risk Register |

---

## 3. Antigravity Source Plans

| Path | Lines | Purpose | Target Section |
|------|-------|---------|----------------|
| `sources/Antigravity/Release000_MasterPlan/BIG_PICTURE_MASTER_PLAN_v1_ANTIGRAVITY.md` | 126 | Antigravity's executive plan with appendix refs | Executive Summary, Architecture |
| `sources/Antigravity/Release000_MasterPlan/appendices/APPENDIX_MULTIPLAYER_INTERNET_STACK.md` | 294 | SimLoop code, StateRegistry, Mulberry32 PRNG | Section 4: Architecture, Section 6: Determinism |
| `sources/Antigravity/Release000_MasterPlan/appendices/APPENDIX_BACKEND_PERSISTENCE_SCHEMA.md` | 203 | Supabase schema (summary), storage policies | Section 7: Backend |
| `sources/Antigravity/Release000_MasterPlan/appendices/APPENDIX_GRFDTRDPU_RD_DEV_PROD_IMPLEMENTATION.md` | 200 | Feature physics code (MOVE_ROLL, WPN_SHOOT, etc.) | Section 9: GRFDTRDPU + Feature Sections |
| `sources/Antigravity/Release000_MasterPlan/appendices/APPENDIX_FEATURE_DEPENDENCY_GRAPH.md` | 116 | Mermaid graph, module interaction matrix | Section 10: Feature Dependency |
| `sources/Antigravity/Release000_MasterPlan/appendices/APPENDIX_RELEASES_SPRINTS_PR_PLAN.md` | 96 | Sprint/PR structure (less granular than Claude) | Section 12: Release Plan |
| `sources/Antigravity/Release000_MasterPlan/appendices/APPENDIX_QA_TESTING_OBSERVABILITY.md` | 105 | Jest tests, smoke test protocol, performance budgets | Section 13: Testing |
| `sources/Antigravity/Release000_MasterPlan/appendices/APPENDIX_RISK_REGISTER.md` | 69 | Code mitigations for risks (Spiral of Death, etc.) | Section 14: Risk Register |
| `sources/Antigravity/Release000_MasterPlan/appendices/GAP_ANALYSIS_REPORT.md` | 60 | 22 binding constraints from strict audit | All sections (constraint validation) |

---

## 4. Canonical Spec Sources (spec_sources/)

| Path | Lines | Purpose | Target Section |
|------|-------|---------|----------------|
| `spec_sources/ASTEROBIA_CANONICAL_MASTER_BIBLE_2026-01-13.md` | 257 | Project philosophy, system boundaries, canonical precedence | Section 2: Executive Summary, Scope |
| `spec_sources/ASTEROBIA_CANONICAL_GRFDTRDPU_SYSTEM_2026-01-13.md` | 1099 | Engine contract, data schemas, Command Queue Timeline | Section 9: GRFDTRDPU, Section 8.6: Timeline |
| `spec_sources/ASTEROBIA_CANONICAL_REFACTOR_PROCESS_2026-01-13.md` | 151 | Feature-first architecture, lane assignments | Section 4: Architecture |
| `spec_sources/ASTEROBIA_CANONICAL_FEATURE_MOVE_ROLL_2026-01-13.md` | 334 | Locomotion physics, slope bands | Feature: MOVE_ROLL |
| `spec_sources/ASTEROBIA_CANONICAL_FEATURE_WPN_SHOOT_2026-01-13.md` | 132 | Combat mechanics, 4-axis system | Feature: WPN_SHOOT |
| `spec_sources/ASTEROBIA_CANONICAL_FEATURE_PERCEPTION_OPTICAL_VISION_2026-01-13.md` | 562 | Vision system, FOW integration | Feature: Perception/FOW |
| `spec_sources/ASTEROBIA_CANONICAL_FEATURE_PERCEPTION_SUBSURFACE_SCAN_2026-01-13.md` | 259 | Underground detection | Feature: SUBSURFACE_SCAN |
| `spec_sources/ASTEROBIA_CANONICAL_FEATURE_MATERA_MINING_2026-01-13.md` | 147 | Mining mechanics | Feature: MATERA_MINING |
| `spec_sources/ASTEROBIA_CANONICAL_FEATURE_MATERA_TRANSPORT_2026-01-13.md` | 149 | Transport slowdown formula | Feature: MATERA_TRANSPORT |
| `spec_sources/ASTEROBIA_CANONICAL_FEATURE_TERRAIN_SHAPING_2026-01-13.md` | 225 | Terrain modification | Feature: TERRAIN_SHAPING |
| `spec_sources/ASTEROBIA_CANONICAL_FEATURE_UNIT_CARRIER_2026-01-13.md` | 147 | Unit transport | Feature: UNIT_CARRIER |
| `spec_sources/ASTEROBIA_CANONICAL_VISION_MAX_SOURCES_POLICY_2026-01-13.md` | 115 | Max vision sources cap (64) | Vision system config |
| `spec_sources/VISION_FOW_REFACTOR_AUDIT.md` | 169 | FOW refactor status | Vision/FOW validation |
| `spec_sources/VISION_FOW_SYSTEM_AUDIT.md` | 152 | Current FOW implementation state | Vision/FOW validation |
| `spec_sources/VISION_MAX_SOURCES_SPEC.md` | 104 | Vision source limiting | Vision system config |

---

## 5. Summary Statistics

| Category | File Count | Total Lines |
|----------|------------|-------------|
| Merge Control | 4 | ~914 |
| Claude Sources | 7 | ~5,309 |
| Antigravity Sources | 9 | ~1,269 |
| Canonical Specs | 15 | ~4,001 |
| **TOTAL** | **35** | **~11,493** |

---

## 6. Files NOT Read (By Design)

| Path | Reason |
|------|--------|
| `sources/Antigravity/Release000_MasterPlan/Antigravity_1.zip` | Backup of same folder - no additional content |
| `sources/Claude/short_term_plans/*` | Lower priority - short-term plans superseded by master plans |
| `docs/master_plan/final/*` | Previous attempt - reference only, will not modify |

---

*End of INPUT_INVENTORY.md*
