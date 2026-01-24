# DIFF LEDGER: Claude vs Antigravity vs Canonical Sources

**Date:** 2026-01-24
**Purpose:** Topic-by-topic comparison for resolving disagreements.

---

## Resolution Order (Per User Instructions)
1. Canonical `spec_sources/` documents
2. Merged plan + CHANGE_REQUESTS_FOR_CLAUDE.md
3. OPEN DECISION with options/pros/cons/decision trigger

---

## DIFF-001: Release Numbering Scheme

| Source | Position |
|--------|----------|
| **Claude Plan** | Phase 0: 001-010, Phase 1: 011-020, Phase 2: 021-025 (25 releases total) |
| **Antigravity Plan** | Same 3-phase structure, same numbering |
| **Canonical Spec** | Not specified - no binding constraint |

**DECISION:** AGREED - Both plans align. Use `release/{XXX}` format.

**Impact:** None - no conflict.

---

## DIFF-002: Tick Rate

| Source | Position |
|--------|----------|
| **Claude Plan** | 20 Hz (50ms timestep) |
| **Antigravity Plan** | 20 Hz (explicit in SimLoop code) |
| **Canonical Spec** | Not specified - implementation detail |

**DECISION:** AGREED - 20 Hz is the authoritative tick rate.

**Impact:** None - no conflict.

---

## DIFF-003: Seeded PRNG Algorithm

| Source | Position |
|--------|----------|
| **Claude Plan** | Mulberry32 |
| **Antigravity Plan** | Mulberry32 (explicit code sample) |
| **Canonical Spec** | Not specified - allows any seeded PRNG |

**DECISION:** AGREED - Mulberry32.

**Impact:** None - no conflict.

---

## DIFF-004: WebRTC Signaling Server

| Source | Position |
|--------|----------|
| **Claude Plan** | Supabase Realtime Channels (Phase 2, Release 021) |
| **Antigravity Plan** | Supabase (same approach) |
| **Canonical Spec** | Not binding on signaling mechanism |

**DECISION:** AGREED - Supabase Realtime for signaling.

**Impact:** None - no conflict.

---

## DIFF-005: Command Queue Timeline UI

| Source | Position |
|--------|----------|
| **Claude Plan** | Does not detail timeline UI - mentions Command Queue exists |
| **Antigravity Plan** | Does not detail timeline UI |
| **Canonical Spec** | Section 8.6 of GRFDTRDPU_SYSTEM specifies full timeline: fixed playhead, scrolling content, gummy stretch, per-unit PLAY/PAUSE, loop toggle |

**DECISION:** CANONICAL BINDING - The canonical spec (8.6) is authoritative. Both plans must implement the Command Queue Timeline as specified.

**Impact on Roadmap:** Neither plan allocates UI releases for timeline. **Requires addition to Phase 1** for timeline UI implementation.

---

## DIFF-006: State Snapshot Format

| Source | Position |
|--------|----------|
| **Claude Plan** | JSON via Serializer class, includes tick, seed, nextId, entities, terrain, players |
| **Antigravity Plan** | Same JSON format |
| **Canonical Spec** | Data schemas in Section 4 of GRFDTRDPU - defines Feature Registry, Goal, Research Job, Training Record, Type Blueprint, Unit Instance |

**DECISION:** AGREED - JSON serialization with canonical schemas.

**Impact:** None - no conflict.

---

## DIFF-007: Host Migration

| Source | Position |
|--------|----------|
| **Claude Plan** | Release 023 - explicit host migration with handoff protocol |
| **Antigravity Plan** | Mentioned but less detailed |
| **Canonical Spec** | Not specified - implementation detail |

**DECISION:** AGREED - Include host migration. Claude plan is more detailed - use as implementation reference.

**Impact:** None - Claude plan subsumes Antigravity.

---

## DIFF-008: Late Join / Reconnection

| Source | Position |
|--------|----------|
| **Claude Plan** | Release 024 - state sync on join, connection loss recovery |
| **Antigravity Plan** | Mentioned briefly |
| **Canonical Spec** | Section 8.1 of Testing Appendix (desync recovery procedure) |

**DECISION:** AGREED - Late join via full state sync. Claude plan is reference implementation.

**Impact:** None.

---

## DIFF-009: Determinism Verification

| Source | Position |
|--------|----------|
| **Claude Plan** | State hash comparison every 60 ticks, auto-resync on mismatch |
| **Antigravity Plan** | Mentioned, no specific tick interval |
| **Canonical Spec** | Section 6.2 of Testing Appendix - "State hash mismatch" triggers resync |

**DECISION:** AGREED - Hash comparison. Use 60 tick interval from Claude plan.

**Impact:** None.

---

## DIFF-010: Feature Unlock Sequence (Demo 1.0)

| Source | Position |
|--------|----------|
| **Claude Plan** | Matches canonical sequence |
| **Antigravity Plan** | Matches canonical sequence |
| **Canonical Spec** | Master Bible Section: Goal/Need -> Feature Unlock Mappings (binding) |

**DECISION:** CANONICAL BINDING - Use the exact sequence from Master Bible:
1. Central Unit cannot move -> MOVE_ROLL
2. Surface Matera seen -> PERCEPTION_SUBSURFACE_SCAN
3. Underground Matera found -> MATERA_MINING
4. Pile accumulates -> MATERA_TRANSPORT
5. Height difference -> TERRAIN_SHAPING
6. Non-mobile design -> UNIT_CARRIER
7. First enemy -> WPN_SHOOT

**Impact:** None - all sources agree.

---

## DIFF-011: Starting Central Unit Allocation

| Source | Position |
|--------|----------|
| **Claude Plan** | 25% each: OPTICAL_VISION, SYS_RESEARCH, SYS_DESIGN, SYS_PRODUCTION |
| **Antigravity Plan** | Same |
| **Canonical Spec** | Master Bible explicitly states this allocation (binding) |

**DECISION:** CANONICAL BINDING - 25%/25%/25%/25%.

**Impact:** None.

---

## DIFF-012: Extend Multiplier Formula

| Source | Position |
|--------|----------|
| **Claude Plan** | `1.0 + (Level * 0.5)`, cap Level 5, max 3.5x |
| **Antigravity Plan** | Same formula |
| **Canonical Spec** | GRFDTRDPU Section 3.1 explicitly states this formula (binding) |

**DECISION:** CANONICAL BINDING - Formula agreed by all sources.

**Impact:** None.

---

## DIFF-013: Training Multiplier Formula

| Source | Position |
|--------|----------|
| **Claude Plan** | `1.0 + (HighScore / 100)` |
| **Antigravity Plan** | Same |
| **Canonical Spec** | GRFDTRDPU Section 6.3.3 states this formula (binding) |

**DECISION:** CANONICAL BINDING - Formula agreed by all sources.

**Impact:** None.

---

## DIFF-014: Specialization Bonus

| Source | Position |
|--------|----------|
| **Claude Plan** | 1 feature: 2.0x, 2: 1.5x, 3: 1.2x, 4+: 1.0x |
| **Antigravity Plan** | Same |
| **Canonical Spec** | GRFDTRDPU Section 3.4.1 states this table (binding, configurable) |

**DECISION:** CANONICAL BINDING - Default values agreed.

**Impact:** None.

---

## DIFF-015: Minimum Feature Allocation

| Source | Position |
|--------|----------|
| **Claude Plan** | 25% minimum if feature is included |
| **Antigravity Plan** | Same |
| **Canonical Spec** | GRFDTRDPU Section 3.3: "default 25%, console configurable" (binding) |

**DECISION:** CANONICAL BINDING - 25% default, configurable via `MIN_FEATURE_ALLOCATION`.

**Impact:** None.

---

## DIFF-016: Max Vision Sources

| Source | Position |
|--------|----------|
| **Claude Plan** | Not explicitly stated |
| **Antigravity Plan** | Not explicitly stated |
| **Canonical Spec** | VISION_MAX_SOURCES_POLICY: 64 sources max (binding) |

**DECISION:** CANONICAL BINDING - Max 64 vision sources.

**Impact:** Must be added to implementation notes.

---

## DIFF-017: FOW Persistence

| Source | Position |
|--------|----------|
| **Claude Plan** | CPU-serializable representation required |
| **Antigravity Plan** | Same |
| **Canonical Spec** | Master Bible Part VI: "makes it insufficient to keep important gameplay state purely GPU-only" |

**DECISION:** CANONICAL BINDING - FOW must have CPU-serializable explored state.

**Impact:** None - agreed.

---

## DIFF-018: Energy Transmission Loss

| Source | Position |
|--------|----------|
| **Claude Plan** | No distance-based loss |
| **Antigravity Plan** | Same |
| **Canonical Spec** | GRFDTRDPU Section 3.5: "No distance-based loss in transmit" (binding) |

**DECISION:** CANONICAL BINDING - No transmission loss, range is connectivity-only.

**Impact:** None.

---

## DIFF-019: Blueprint Trading

| Source | Position |
|--------|----------|
| **Claude Plan** | License rights only, not ownership transfer |
| **Antigravity Plan** | Same |
| **Canonical Spec** | GRFDTRDPU Section 3.6: "usage license, not ownership" (binding) |

**DECISION:** CANONICAL BINDING - License model.

**Impact:** None.

---

## DIFF-020: Replay System

| Source | Position |
|--------|----------|
| **Claude Plan** | Not mentioned in releases |
| **Antigravity Plan** | Not mentioned |
| **Canonical Spec** | Not required for Demo 1.0 |
| **OPEN_DECISIONS.md** | Lists replay as needing decision |

**DECISION:** **OPEN DECISION**

**Options:**
1. **Defer replay** - Not in Demo 1.0 scope
2. **Include command-log replay** - Store command stream, replay deterministically

**Pros/Cons:**
- Option 1: Simpler, faster to ship
- Option 2: Valuable for debugging, but adds complexity

**Decision Trigger:** Human owner must decide if replay is in Demo 1.0 scope.

**Impact:** If included, adds ~1 release to Phase 1.

---

## DIFF-021: UI Framework

| Source | Position |
|--------|----------|
| **Claude Plan** | Not specified - uses existing Three.js/HTML |
| **Antigravity Plan** | Not specified |
| **Canonical Spec** | Not binding on UI framework |
| **OPEN_DECISIONS.md** | Lists UI framework as open |

**DECISION:** **OPEN DECISION**

**Options:**
1. **HTML/CSS overlays** - Simple, existing approach
2. **React/Vue** - Modern component model, more complex setup
3. **Leva/dat.GUI** - Debug-focused, fast iteration

**Decision Trigger:** Human owner preference + complexity tolerance.

**Impact:** Affects all UI-related releases.

---

## DIFF-022: PR Granularity

| Source | Position |
|--------|----------|
| **Claude Plan** | Highly granular: 001.1, 001.2, 001.3, etc. (multiple PRs per release) |
| **Antigravity Plan** | Less granular - one PR per release suggested |
| **Canonical Spec** | Not binding |

**DECISION:** **OPEN DECISION**

**Options:**
1. **Claude granularity** - Multiple PRs per release (safer, more review points)
2. **Single PR per release** - Faster, less overhead

**Decision Trigger:** Human owner workflow preference.

**Impact:** Affects commit/review cadence but not features.

---

## DIFF-023: Slope Physics Bands

| Source | Position |
|--------|----------|
| **Claude Plan** | 0-10: flat, 10-40: penalty, 40-60: critical, >60: blocked |
| **Antigravity Plan** | Same |
| **Canonical Spec** | Master Bible Part V Section 2 + MOVE_ROLL spec (binding) |

**DECISION:** CANONICAL BINDING - Slope bands agreed.

**Impact:** None.

---

## DIFF-024: Direct Control Behavior

| Source | Position |
|--------|----------|
| **Claude Plan** | Not detailed |
| **Antigravity Plan** | Not detailed |
| **Canonical Spec** | GRFDTRDPU Section 8.6.9: DC pauses queue, exit keeps paused until PLAY, return path computed internally |

**DECISION:** CANONICAL BINDING - Direct Control as specified in 8.6.9.

**Impact:** Must be explicitly included in Phase 1 releases.

---

## DIFF-025: Command Queue Lane Assignments

| Source | Position |
|--------|----------|
| **Claude Plan** | Lists 4 lanes (LOCOMOTION, PERCEPTION, TOOL, WEAPON) |
| **Antigravity Plan** | Same |
| **Canonical Spec** | GRFDTRDPU Section 8.6.3 + REFACTOR_PROCESS Section 7 (binding) |

**DECISION:** CANONICAL BINDING - Lane taxonomy agreed.

| Lane | Features |
|------|----------|
| LOCOMOTION | MOVE_ROLL, UNIT_CARRIER, MATERA_TRANSPORT |
| PERCEPTION | SUBSURFACE_SCAN (action) |
| TOOL | TERRAIN_SHAPING, MATERA_MINING |
| WEAPON | WPN_SHOOT |

**Note:** OPTICAL_VISION is passive (no lane).

**Impact:** None.

---

## Summary: Open Decisions Requiring Human Input

| ID | Topic | Options | Blocker Level |
|----|-------|---------|---------------|
| DIFF-020 | Replay System | Defer vs Include | NON-BLOCKER |
| DIFF-021 | UI Framework | HTML vs React vs Leva | NON-BLOCKER |
| DIFF-022 | PR Granularity | Multi-PR vs Single-PR | NON-BLOCKER |

**All other items:** RESOLVED (either agreed or canonical binding applies).

---

*End of DIFF_LEDGER.md*
