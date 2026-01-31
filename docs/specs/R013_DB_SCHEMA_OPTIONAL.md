# R013: Database Schema (OPTIONAL)

**Status**: Optional Reference (Not Required for MVP)
**Related**: [R013_MULTIPLAYER_HANDSHAKE_HOST_AUTHORITY.md](./R013_MULTIPLAYER_HANDSHAKE_HOST_AUTHORITY.md)

---

## Overview

This document provides SQL schema proposals for R013 database tables. These are **optional** enhancements that enable:

- Persistent lobby listings (survive Host browser refresh)
- Command log for resync (faster reconnection)
- Session analytics

**MVP Alternative**: R013 can function with Realtime broadcast only, using in-memory state on Host. This schema enables persistence and crash recovery.

---

## 1. Sessions Table

Tracks active game sessions for lobby discovery and reconnection.

```sql
-- ============================================================
-- TABLE: sessions
-- Purpose: Active game session registry
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Host identification
  host_id UUID REFERENCES auth.users(id) NOT NULL,
  host_display_name TEXT NOT NULL DEFAULT 'Host',

  -- Session metadata
  session_name TEXT NOT NULL DEFAULT 'Untitled Game',
  map_seed TEXT NOT NULL,
  protocol_version TEXT NOT NULL DEFAULT '0.13.0',

  -- Player tracking
  current_players INTEGER NOT NULL DEFAULT 1,
  max_players INTEGER NOT NULL DEFAULT 4,
  player_slots JSONB NOT NULL DEFAULT '[]',
  -- Format: [{"slot": 0, "userId": "uuid", "displayName": "Player1", "status": "active"}, ...]

  -- Timing
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- State reference
  current_sim_tick BIGINT NOT NULL DEFAULT 0,
  snapshot_id UUID REFERENCES public.world_states(id),

  -- Visibility
  is_public BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Constraints
  CONSTRAINT valid_player_count CHECK (current_players >= 1 AND current_players <= max_players),
  CONSTRAINT valid_max_players CHECK (max_players >= 2 AND max_players <= 8)
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Fast lookup for lobby listing
CREATE INDEX idx_sessions_active_public
  ON public.sessions (is_active, is_public)
  WHERE is_active = true AND is_public = true;

-- Fast lookup by host
CREATE INDEX idx_sessions_host_id
  ON public.sessions (host_id);

-- Cleanup stale sessions (heartbeat older than 30s)
CREATE INDEX idx_sessions_heartbeat
  ON public.sessions (last_heartbeat);

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Anyone can see public active sessions
CREATE POLICY "Public sessions visible to all"
  ON public.sessions FOR SELECT
  USING (is_public = true AND is_active = true);

-- Host can see their own sessions (even inactive)
CREATE POLICY "Host can see own sessions"
  ON public.sessions FOR SELECT
  USING (auth.uid() = host_id);

-- Only host can insert
CREATE POLICY "Host can create session"
  ON public.sessions FOR INSERT
  WITH CHECK (auth.uid() = host_id);

-- Only host can update
CREATE POLICY "Host can update own session"
  ON public.sessions FOR UPDATE
  USING (auth.uid() = host_id);

-- Only host can delete (or mark inactive)
CREATE POLICY "Host can delete own session"
  ON public.sessions FOR DELETE
  USING (auth.uid() = host_id);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sessions_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_sessions_updated_at();

-- Cleanup stale sessions (run via pg_cron or Edge Function)
CREATE OR REPLACE FUNCTION cleanup_stale_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM public.sessions
    WHERE last_heartbeat < NOW() - INTERVAL '60 seconds'
      AND is_active = true
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 2. Command Log Table

Ephemeral command history for resync operations. Short TTL.

```sql
-- ============================================================
-- TABLE: command_log
-- Purpose: Ephemeral command history for resync
-- Note: Designed for short retention (10-15 minutes)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.command_log (
  id BIGSERIAL PRIMARY KEY,

  -- Session reference
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,

  -- Tick identification
  sim_tick BIGINT NOT NULL,

  -- Command batch (all commands for this tick)
  commands JSONB NOT NULL,
  -- Format: [{"slot": 0, "seq": 42, "command": {...}}, ...]

  -- Timing
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Composite unique constraint
  CONSTRAINT unique_session_tick UNIQUE (session_id, sim_tick)
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Fast range queries for resync
CREATE INDEX idx_command_log_session_tick
  ON public.command_log (session_id, sim_tick DESC);

-- Cleanup old entries
CREATE INDEX idx_command_log_created_at
  ON public.command_log (created_at);

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE public.command_log ENABLE ROW LEVEL SECURITY;

-- Session participants can read command log
CREATE POLICY "Session participants can read commands"
  ON public.command_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = command_log.session_id
        AND (
          s.host_id = auth.uid()
          OR s.player_slots @> jsonb_build_array(jsonb_build_object('userId', auth.uid()::text))
        )
    )
  );

-- Only host can insert commands
CREATE POLICY "Host can insert commands"
  ON public.command_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = command_log.session_id
        AND s.host_id = auth.uid()
    )
  );

-- ============================================================
-- CLEANUP FUNCTION
-- ============================================================

-- Delete commands older than 10 minutes
CREATE OR REPLACE FUNCTION cleanup_old_commands()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM public.command_log
    WHERE created_at < NOW() - INTERVAL '10 minutes'
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 3. Player Sessions Table (Analytics)

Optional table for tracking player participation.

```sql
-- ============================================================
-- TABLE: player_sessions
-- Purpose: Track player participation (analytics)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.player_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- References
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,

  -- Assignment
  slot_index INTEGER NOT NULL,
  display_name TEXT NOT NULL,

  -- Timing
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Status
  status TEXT NOT NULL DEFAULT 'active',
  -- Values: 'active', 'disconnected', 'left', 'kicked'

  -- Stats (optional)
  commands_sent INTEGER NOT NULL DEFAULT 0,
  resyncs_requested INTEGER NOT NULL DEFAULT 0,

  -- Constraints
  CONSTRAINT valid_slot CHECK (slot_index >= 0 AND slot_index < 8),
  CONSTRAINT valid_status CHECK (status IN ('active', 'disconnected', 'left', 'kicked'))
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_player_sessions_session
  ON public.player_sessions (session_id);

CREATE INDEX idx_player_sessions_user
  ON public.player_sessions (user_id);

CREATE UNIQUE INDEX idx_player_sessions_unique_slot
  ON public.player_sessions (session_id, slot_index)
  WHERE status = 'active';

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE public.player_sessions ENABLE ROW LEVEL SECURITY;

-- Users can see their own participation
CREATE POLICY "Users can see own player_sessions"
  ON public.player_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Host can see all participants in their sessions
CREATE POLICY "Host can see session participants"
  ON public.player_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = player_sessions.session_id
        AND s.host_id = auth.uid()
    )
  );

-- System inserts via trigger or Edge Function
-- Direct insert blocked; use session join flow
```

---

## 4. Realtime Configuration

Enable Realtime for relevant tables.

```sql
-- ============================================================
-- REALTIME PUBLICATION
-- ============================================================

-- Add sessions to realtime for lobby updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;

-- Note: command_log is NOT added to Realtime
-- Commands are broadcast via channel, not DB subscription
-- This keeps Realtime lean and focused on lobby updates

-- Note: world_states was added in R012
-- (already published)
```

---

## 5. Scheduled Cleanup (pg_cron)

If using Supabase's pg_cron extension:

```sql
-- ============================================================
-- SCHEDULED JOBS
-- Requires pg_cron extension (Supabase Pro or self-hosted)
-- ============================================================

-- Enable extension (requires superuser)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Clean stale sessions every minute
SELECT cron.schedule(
  'cleanup-stale-sessions',
  '* * * * *',  -- Every minute
  $$SELECT cleanup_stale_sessions()$$
);

-- Clean old commands every 5 minutes
SELECT cron.schedule(
  'cleanup-old-commands',
  '*/5 * * * *',  -- Every 5 minutes
  $$SELECT cleanup_old_commands()$$
);
```

**Alternative without pg_cron**: Use Supabase Edge Functions with a scheduled trigger, or perform cleanup on Host client periodically.

---

## 6. Migration Notes

### Applying to Existing R012 Setup

1. Run the SQL in order (sessions → command_log → player_sessions → realtime)
2. Existing `world_states` table remains unchanged
3. No data migration required (new tables)

### Rollback

```sql
-- To remove R013 tables (if needed)
DROP TABLE IF EXISTS public.player_sessions CASCADE;
DROP TABLE IF EXISTS public.command_log CASCADE;
DROP TABLE IF EXISTS public.sessions CASCADE;

-- Remove functions
DROP FUNCTION IF EXISTS update_sessions_updated_at();
DROP FUNCTION IF EXISTS cleanup_stale_sessions();
DROP FUNCTION IF EXISTS cleanup_old_commands();
```

---

## 7. Schema Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         R013 SCHEMA                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────────┐         ┌─────────────────────┐           │
│   │   auth.users    │         │    world_states     │           │
│   │    (Supabase)   │         │      (R012)         │           │
│   └────────┬────────┘         └──────────┬──────────┘           │
│            │                             │                       │
│            │ host_id                     │ snapshot_id           │
│            │ user_id                     │                       │
│            ▼                             │                       │
│   ┌────────────────────────────────────────┐                    │
│   │              sessions                  │◄────────────────┐   │
│   │  - id (PK)                            │                  │   │
│   │  - host_id (FK → auth.users)          │                  │   │
│   │  - session_name                        │                  │   │
│   │  - map_seed                            │                  │   │
│   │  - current_players, max_players        │                  │   │
│   │  - player_slots (JSONB)                │                  │   │
│   │  - current_sim_tick                    │                  │   │
│   │  - snapshot_id (FK → world_states)     │                  │   │
│   │  - is_public, is_active                │                  │   │
│   │  - last_heartbeat                      │                  │   │
│   └──────────────┬─────────────────────────┘                  │   │
│                  │                                            │   │
│                  │ session_id                                 │   │
│                  ▼                                            │   │
│   ┌────────────────────────┐      ┌────────────────────────┐ │   │
│   │      command_log       │      │    player_sessions     │ │   │
│   │  - id (PK, BIGSERIAL)  │      │  - id (PK)             │ │   │
│   │  - session_id (FK)     │      │  - session_id (FK) ────┼─┘   │
│   │  - sim_tick            │      │  - user_id (FK)        │     │
│   │  - commands (JSONB)    │      │  - slot_index          │     │
│   │  - created_at          │      │  - joined_at, left_at  │     │
│   └────────────────────────┘      │  - status              │     │
│                                   └────────────────────────┘     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

Legend:
  PK = Primary Key
  FK = Foreign Key
  ──► = References
```

---

## 8. Size Estimates

| Table | Rows per Session | Row Size | Session Total |
|-------|------------------|----------|---------------|
| `sessions` | 1 | ~500B | 500B |
| `command_log` | ~12,000 (10 min @ 20Hz) | ~200B | ~2.4MB |
| `player_sessions` | 4 (max players) | ~200B | 800B |
| `world_states` | 1-10 snapshots | ~20KB | ~200KB |

**Cleanup Impact**: With 10-minute TTL on `command_log`, table stays under 5MB per session.

---

*Document Version: 0.13.0*
*Last Updated: 2026-01-31*
*Author: Claude Code (Docs Worker)*
