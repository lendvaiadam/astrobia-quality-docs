# R012: Supabase Integration Setup & Gates

**Objective**: Detailed guide for configuring Supabase backend, RLS policies, and Verification Gates for Release 012.

---

## 1. Supabase Dashboard Steps (Click-by-Click)

### A. Project Creation
1. Log in to [Supabase Dashboard](https://supabase.com/dashboard).
2. Click **"New Project"**.
3. Select organization.
4. Name: `Asterobia-Dev` (or similar).
5. Database Password: generates a strong password (SAVE THIS).
6. Region: Primary target audience (e.g., Frankfurt or London).
7. Click **"Create new project"**.
8. Wait for provisioning (~2 minutes).

### B. Auth Configuration (Anonymous Only for R012)
1. Go to **Authentication** (Sidebar) > **Providers**.
2. **Email**: Disable (OFF) - *Keep it simple for R012*.
3. **Phone**: Disable (OFF).
4. **Anonymous Sign-ins**: Enable (ON) (if available, otherwise use Email/Password dummy for dev).
   - *Note*: If Anon is not available, enable Email without confirm, and use a dummy `dev@asterobia.local` account.

### C. Database Schema (SQL Editor)
1. Go to **SQL Editor** (Sidebar).
2. Click **"New Query"**.
3. Paste the contents of **section 2 (SQL Schema)** below.
4. Click **Run**.

---

## 2. SQL Schema & RLS Policies

```sql
-- 1. Enable UUID extension
create extension if not exists "uuid-ossp";

-- 2. Create World States Table
create table if not exists public.world_states (
  id uuid primary key default uuid_generate_v4(),
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- The save payload (JSONB for flexibility)
  state_data jsonb not null,
  
  -- Metadata for queries
  owner_id uuid references auth.users(id) not null,
  sim_tick bigint not null,
  map_seed text,
  
  -- Constraint: 1 save per user for now (Simplify R012)
  constraint one_save_per_user unique (owner_id)
);

-- 3. Enable RLS (CRITICAL)
alter table public.world_states enable row level security;

-- 4. Create Policies

-- POLICY: Users can SEE their own save
create policy "Users can select own save"
on public.world_states for select
using ( auth.uid() = owner_id );

-- POLICY: Users can INSERT their own save
create policy "Users can insert own save"
on public.world_states for insert
with check ( auth.uid() = owner_id );

-- POLICY: Users can UPDATE their own save
create policy "Users can update own save"
on public.world_states for update
using ( auth.uid() = owner_id );

-- 5. Realtime Setup
-- Enable Realtime for world_states table
alter publication supabase_realtime add table public.world_states;
```

---

## 3. R012 Gates & Proofs Checklist

### A. Determinism & No-Bypass Invariants
- [ ] **Transport Isolation**: `SupabaseTransport` MUST NOT mutate `Game` state directly. It only pushes to `Queue`.
- [ ] **Lockstep Time**: `SimCore` tick logic uses `sim.tickCount`, ignoring network timestamps (latency variation).
- [ ] **Mockability**: Tests use a `MockSupabaseClient`, verifying logic without hitting the cloud.

### B. Security Gates
- [ ] **RLS Verify**: Try to select *another user's* save via SQL editor (simulate hacker). Should return 0 rows.
- [ ] **Key Hygiene**: `SUPABASE_ANON_KEY` is public. `SERVICE_ROLE_KEY` is NEVER in client bundle.
- [ ] **Auth State**: App handles "Not Logged In" state (e.g., fallback to LocalTransport or show Login UI).

### C. Performance Gates
- [ ] **Throttle**: Network updates capped (e.g., 5Hz or 10Hz), independent of 60Hz Render.
- [ ] **Payload Size**: `serializeState()` output is < 10KB (ensure no Meshes/Textures leaked into JSON).
- [ ] **Index**: `owner_id` is indexed (it is unique, so implicit index exists).

---

## 4. Human User (HU) Test Script: "The Echo Test"

**Objective**: Verify database persistence and connectivity (Phase 1).

### Setup
1. Open browser to `http://localhost:8081?net=supabase`.
2. Open DevTools (F12) > Console.

### Scenario 1: Initial Save
1. **Action**: Click "Connect" (or Login).
2. **Observe**: "Connected to Supabase" log.
3. **Action**: Move Unit 1 to a new location.
4. **Action**: Click [Save].
5. **Observe**: "Save successful" log. "Upload X bytes".

### Scenario 2: Hard Refresh Restore
1. **Action**: Refresh the page (F5).
2. **Action**: Click [Load] (or Auto-load).
3. **Observe**:
   - Unit 1 snaps to the *new* location (from Scenario 1).
   - Console logs "Loaded state from Supabase".

### Scenario 3: RLS Check (Pseudo-Security)
1. **Action**: Open a 2nd Incognito window.
2. **Action**: Login as a *different* user (or Anon ID 2).
3. **Action**: Click [Load].
4. **Observe**: Should NOT load User 1's state (Empty or New Game).

---

## 5. R013 Placeholder: Multiplayer Handshake & Host Authority

*To keep R012 simple, we defer full Host negotiation.*

- **R012**: Client = Host. Everyone saves their own state.
- **R013**: Discovery Phase.
  - "I am Host" broadcasts presence.
  - "I am Client" connects to Host.
  - Host writes state; Clients read state.
  - *This avoids R012 becoming a netcode massive refactor.*
