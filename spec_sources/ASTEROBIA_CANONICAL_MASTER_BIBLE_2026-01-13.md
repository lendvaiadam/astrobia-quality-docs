# Asterobia — MASTER BIBLE (CANONICAL INDEX)
**Version:** CANONICAL_SET_2026-01-13  
**Date:** 2026-01-13  
**Status:** CANONICAL  
**Audience:** Claude Code / contributors implementing Asterobia systems

---

## Canonical precedence (read this first)

This repository contains multiple documents produced over time. To prevent “mixed canon,” use this precedence order:

1. **This file** (`Asterobia — MASTER BIBLE (CANONICAL INDEX)`)  
   Canonical for *project philosophy, system boundaries, cross-system invariants, and file ownership map*.

2. **Engine contract**: `ASTEROBIA_CANONICAL_GRFDTRDPU_SYSTEM_2026-01-13.md`  
   Canonical for the **G‑R‑F‑Tr‑D‑P‑U** pipeline mechanics, global math, data contracts, and the action scheduler/command queue rules.

3. **Feature specs** (one file per feature; these are canonical for feature behavior + API):  
   - `ASTEROBIA_CANONICAL_FEATURE_MOVE_ROLL_2026-01-13.md`  
   - `ASTEROBIA_CANONICAL_FEATURE_PERCEPTION_OPTICAL_VISION_2026-01-13.md`  
   - (future) additional `docs/features/**` specs (shooting, mining, storage, etc.)

4. **World/runtime service specs and audits** (FogOfWar, VisionSystem, rendering constraints, etc.)  
   These are **binding only where re‑stated** in (1)–(3). Otherwise they are reference material.

5. **Legacy snapshots** (older “bible” drafts, partial specs) are **not canonical** unless explicitly copied into (1)–(3).

**Non-negotiable rule:** If two documents conflict, the higher-precedence one above wins.

---

## Scope & purpose of this Master Bible

This file is intentionally **not** a dump of every per-feature algorithm. Instead, it defines:

- the **architectural intent** of Asterobia,
- the **system boundaries** (“what lives where”),
- the **canonical file layout** Claude must follow,
- the **cross-system invariants** that feature implementations must not violate.

Detailed feature logic belongs in **feature spec files** (one per feature). Movement and Optical Vision are the first two canonical feature specs.

---

# PART I — CORE ARCHITECTURE & PHILOSOPHY

## 1) Executive summary

Asterobia is an evolutionary RTS on a spherical world.

- **The Logic:** Units do not “climb a static tech tree.” They evolve capabilities via the **G‑R‑F‑Tr‑D‑P‑U** pipeline.
- **The Physics:** SimCore-driven, deterministic, heavy inertia (rover-like), with slope rules and tangent-space motion.
- **The Adversary:** A Mirror AI (“Dark Side”) on the opposite hemisphere that adapts to the player’s strength.

## 2) Design principles (canonical)

1. **Feature-first architecture**  
   - Every capability is a **Feature** with its own code file and spec file.  
   - No “named builds”: avoid labels like “sniper” or “tank” as if they were fundamental. They are just emergent feature allocations/configs.

2. **Units are composed from features**  
   - A Unit Type allocates **percentages** across features (sum=100%).  
   - Each feature may have internal sub-allocations (e.g., inside Shooting: Power/Rate/Range/Accuracy) but those are feature-internal and must remain editable by the player.

3. **Action vs Passive**  
   - Passive features are always-on (e.g., Optical Vision). They do **not** occupy command queue lanes.
   - Action features can be scheduled into the command queue lanes (Movement, Shooting, Mining, …).

4. **Player should only see their own perception**  
   - The player’s FogOfWar is revealed only by **their own units’** Perception sources (and optionally allies when enabled).
   - Other players’ units can appear/disappear when entering/leaving the player’s visible area, but they do not create FogOfWar reveal for the player.

---

# PART II — THE EVOLUTIONARY PIPELINE (G‑R‑F‑Tr‑D‑P‑U)

**Canonical reference:** `ASTEROBIA_CANONICAL_GRFDTRDPU_SYSTEM_2026-01-13.md`

### G — Goal system (Need generator)
- Goals are reactive, originating from `GameEvents`.
- The GoalManager listens to the EventBus and spawns “Need Cards” (Invent / Extend requests).

### R — Research (Invent & Extend)
- **Invent:** unlocks a new Feature capability previously unavailable.
- **Extend:** increases a limit of an existing capability via a **feature-level multiplier** (feature-by-feature multiplication; linear scaling; capped levels).

### F — Feature runtime
- Features are runtime modules attached to units/types.
- Feature code must be isolated per feature file; cross-feature coupling happens only through explicitly defined contracts.

### Tr — Training (player skill)
- Global (empire-scoped) multipliers derived from player performance in training mini-games.
- Applies to all units using a feature (or sub-feature) under defined rules.

### D — Design (Blueprints)
- Blueprints are designed via `SYS_DESIGN`.
- **Blueprints are not transferable**; players buy **usage rights** (license), not ownership.

### P — Production
- Construction happens locally at producer units (`SYS_PRODUCTION`).
- Build vs Refit rules apply (refit costs the delta).

### U — Upgrade / Rebuild
- Evolution happens through new designs and refits rather than infinite stat stacking.

---

## CANONICAL: Goal/Need → Feature Unlock Mappings (Demo 1.0)

The following mappings define how in-game events trigger "Need" cards and which features they unlock. This is the canonical onboarding/discovery sequence.

| Trigger Condition | Need Label | Unlocked Feature ID |
|-------------------|------------|---------------------|
| Start: Central Unit cannot move | "Explore" | `MOVE_ROLL` |
| First mobile unit sees surface Matera protruding | "Discover Matera" | `PERCEPTION_SUBSURFACE_SCAN` |
| Subsurface Scan finds underground Matera mass | "Gather Matera" | `MATERA_MINING` |
| Matera Mining exists (pile accumulates) | "Collect Matera" | `MATERA_TRANSPORT` |
| Encounter large height difference or terrain control pressure | "Surface Control" | `TERRAIN_SHAPING` |
| Player creates a unit design that cannot self-move / needs deployment | "Deploy Unit" | `UNIT_CARRIER` |
| First time an enemy appears | "Combat Capability" | `WPN_SHOOT` |

> **Note:** These mappings are binding for Demo 1.0. Additional mappings (MOVE_SWIM, MOVE_FLY, etc.) follow the same pattern defined in the engine contract.

---

## CANONICAL: Starting Central Unit (Demo 1.0)

The Central Unit is spawned at game start with the following **default blueprint allocation**:

| Feature ID | Allocation |
|------------|------------|
| `PERCEPTION_OPTICAL_VISION` | 25% |
| `SYS_RESEARCH` | 25% |
| `SYS_DESIGN` | 25% |
| `SYS_PRODUCTION` | 25% |

**Properties:**
- **Cannot move:** The Central Unit has no `MOVE_*` feature. It is stationary until `MOVE_ROLL` is invented and a new mobile unit type is designed/produced.
- **UI naming:** `SYS_DESIGN` may be displayed as "Development" in the UI, but the canonical feature ID remains `SYS_DESIGN`.
- **Allocation rules apply:** 0% = not included; minimum allocation is console-configurable (`ALLOCATION_MIN`, default 25%).

---

# PART III — ECONOMY & ENERGY MODEL

## 1) Energy model: Hybrid global/local

- **Global pool:** empire-wide energy count; generators feed it; connected units draw from it.
- **Coverage network:** connection depends on transmitters (`ECO_TRANSMIT`) and central station range.
- **Local buffer:** each unit has a battery. If disconnected and empty → unit goes OFFLINE (immobile, non-responsive except passive self-repair).

## 2) Matera & color mixing
- Generators accept Matera items; complementary colors give efficiency bonuses.
- Drives exploration to find matching colors across zones/asteroids.

---

# PART IV — THE DARK SIDE (MIRROR AI)

## 1) Behavior logic
- Located on opposite hemisphere (initially FOW).
- Mimics player’s military value periodically and sends raids.

## 2) Capture mechanic
- Player units at 0 HP become **wrecks**.
- Dark Side repair drones can flip wreck allegiance if they repair it to full before the player recovers/destroys it.

---

# PART V — PHYSICS & SIMULATION CORE (CROSS-SYSTEM)

## 1) Spherical coordinates
- Up vector = smoothed terrain normal.
- Physics uses tangent space for velocity/acceleration integration.

## 2) Slope physics (canonical thresholds)
- 0–10°: flat
- 10–40°: standard
- 40–60°: critical
- >60°: blocked unless feature allows (climb/fly, etc.)
- Downhill: controlled slide / speed boost behavior

## 3) Command queue integrity
- The command queue is authoritative for scheduled actions.
- Path editing must preserve `LeftWaypointID` / `ApproachWaypointID` semantics and must not force a unit to “go backwards.”

(Full scheduling rules, direct control behavior, and lane constraints are defined in the engine contract.)

---

# PART VI — MULTIPLAYER & PERSISTENCE (TARGET STATE)

## 1) Persistence requirement (canonical)
Asterobia must support:
- Re‑entering later and seeing the same world state.
- Backend-hosted world state **and** frontend autosave/snapshot behavior.

This makes it insufficient to keep important gameplay state purely GPU-only with no serialization path.

## 2) Live co‑op (canonical requirement)
Multiple authenticated users may control the same empire in real time. Concurrency rules must remain deterministic and server/host-authoritative where applicable.

---

# PART VII — CANONICAL FILE OWNERSHIP MAP

## 1) Engine contract
- `ASTEROBIA_CANONICAL_GRFDTRDPU_SYSTEM_2026-01-13.md`

## 2) Feature specs (canonical, organized by Command Queue Lane)

### LOCOMOTION Lane
- `ASTEROBIA_CANONICAL_FEATURE_MOVE_ROLL_2026-01-13.md`
- `ASTEROBIA_CANONICAL_FEATURE_UNIT_CARRIER_2026-01-13.md`
- `ASTEROBIA_CANONICAL_FEATURE_MATERA_TRANSPORT_2026-01-13.md`
- Future: `MOVE_SWIM`, `MOVE_FLY`, `MOVE_CLIMB`, `MOVE_TUNNEL`, etc.

### PERCEPTION Lane
Perception is a top-level feature with sub-capabilities that share its allocation %.
- `ASTEROBIA_CANONICAL_FEATURE_PERCEPTION_OPTICAL_VISION_2026-01-13.md` (passive)
- `ASTEROBIA_CANONICAL_FEATURE_PERCEPTION_SUBSURFACE_SCAN_2026-01-13.md` (action, toggleable)
- Future: `PERCEPTION_THERMAL`, `PERCEPTION_ACOUSTIC`, etc.

### TOOL Lane
- `ASTEROBIA_CANONICAL_FEATURE_TERRAIN_SHAPING_2026-01-13.md`
- `ASTEROBIA_CANONICAL_FEATURE_MATERA_MINING_2026-01-13.md`
- Future: construction, repair tools

### WEAPON Lane
- `ASTEROBIA_CANONICAL_FEATURE_WPN_SHOOT_2026-01-13.md`
- Future: additional weapon types

## 3) Runtime services (world-level, not features)
- FogOfWar service (render targets, stamping, persistence hooks)
- VisionSystem aggregator (collect sources, filter/limit, call FogOfWar service)

---

# PART VIII — IMPLEMENTATION CHECKLIST (HIGH-LEVEL)

This is not a step-by-step plan; it is a “do we have the pieces” checklist.

- [ ] FeatureRegistry exists and defines base stats and feature availability.
- [ ] GoalManager converts GameEvents into Need Cards.
- [ ] ResearchManager implements Invent + Extend and respects caps.
- [ ] CommandQueue supports lanes + deterministic scheduling and integrates Direct Control behavior.
- [ ] FogOfWar service supports persistence of explored state (CPU-serializable representation).
- [ ] Perception features emit VisionSources (Optical now; later other channels).

---

## Notes to Claude Code

- Treat any concrete implementation details as **suggestions**, unless explicitly marked “canonical requirement.”
- If a needed detail is missing, create a short “Open Questions” section in the relevant spec file, do not invent behavior silently.
