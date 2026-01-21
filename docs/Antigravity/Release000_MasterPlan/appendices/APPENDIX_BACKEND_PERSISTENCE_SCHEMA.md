# APPENDIX: BACKEND & PERSISTENCE SCHEMA

**Parent Document:** [Big Picture Master Plan](../BIG_PICTURE_MASTER_PLAN_v1_ANTIGRAVITY.md)
**Scope:** Database Schema, Authentication, Session Management, Snapshots.

---

## 1. Backend Philosophy
Although Phase 0/1 is **Host-Authoritative P2P**, we treat the Backend (Supabase) as the **Control Plane**. It does not run game logic, but it holds the Truth about:
1.  **Identity** (Who are you?)
2.  **Meta-Progression** (What blueprints have you invented?)
3.  **Discovery** (Where are the active lobbies?)

---

## 2. Database Schema (Supabase PostgreSQL)

### 2.1 Table: `profiles` (User Meta)
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | uuid | PK, references `auth.users` |
| `username` | text | Display name (unique constraint) |
| `created_at` | timestamptz | Account age |
| `xp_total` | int8 | Meta-progression currency |

### 2.2 Table: `lobbies` (Signaling)
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | uuid | PK, Public Room ID |
| `host_user_id` | uuid | FK -> profiles.id |
| `host_peer_id` | text | WebRTC Signal ID (PeerJS) |
| `status` | enum | `OPEN`, `PLAYING`, `CLOSED` |
| `config` | jsonb | Map settings, Max players |
| `players` | jsonb | Array of connected user IDs (for lobby UI) |
| `last_heartbeat` | timestamptz | For GC (delete stale lobbies) |

### 2.3 Table: `blueprints` (User Content)
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | uuid | PK |
| `owner_id` | uuid | FK -> profiles.id |
| `name` | text | Strict format `[CVC-CVC][VER]` (e.g. `MORDIG10`) |
| `version` | int | Capacity / 10 |
| `data` | jsonb | **Immutable** Spec (Allocations, Stats) |
| `assets` | jsonb | Links to `.glb` / `.png` (Storage Buckets) |
| `created_at` | timestamptz | |
| `is_public` | bool | Market listing status |

### 2.4 Table: `matches` (History)
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | uuid | PK |
| `started_at` | timestamptz | |
| `ended_at` | timestamptz | |
| `winner_id` | uuid | Nullable (Draw) |
| `replay_url` | text | Link to full replay file (Storage) |

---

## 3. Storage Buckets

### 3.1 `user-assets`
- **Path:** `/{user_id}/{blueprint_id}/model.glb`
- **generated via:** MS Trellis 2 Pipeline.
- **Access:** Public Read, Private Write (Server-side signed URL).

### 3.2 `replays`
- **Path:** `/{match_id}/full_session.json.gz`
- **Format:** Initial State + Command Stream.

---

## 4. Authentication Flow (Phase 1)
1.  **Client Boot:** Checks LocalStorage for Supabase Session.
2.  **Login:** Anon (Guest) or Email/Discord.
3.  **Profile Check:** If new user, create `profiles` row.
4.  **Token:** JWT used for all RLS (Row Level Security) enforcement.
    *   *Rule:* You cannot delete another user's Blueprint.
    *   *Rule:* You cannot close another user's Lobby.

---
*Open Decision: Do we need a dedicated "Session" table for active units?*
*Current Decision: No. Active gameplay state lives in RAM (Host). Only Final Results and Blueprints are persisted to DB.*
