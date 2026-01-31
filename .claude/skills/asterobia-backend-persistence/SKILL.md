---
name: asterobia-backend-persistence
description: Guidelines for backend storage, Save/Load systems, and Schema Versioning.
---

# Asterobia Backend Persistence Skill

## When to use
- When modifying `SaveManager.js`, `SaveSchema.js`, or `StateSurface.js`.
- When designing database schemas (Supabase/Postgres).
- When handling user profiles or cloud saves.

## Core Rules

### 1. Schema Versioning
**ALWAYS** version your data structures.
```javascript
export const SAVE_SCHEMA_VERSION = 2;
// In SaveManager:
if (data.version < SAVE_SCHEMA_VERSION) {
    data = migrate(data);
}
```
- Never break backward compatibility without a migration path.
- Keep old fields until verified unused.

### 2. State Isolation
- **Authoritative State**: Position, Velocity, Health, Inventory, RNG Seed. -> **SAVE THIS**
- **Render State**: Meshes, Lights, Particles, Sound. -> **DISCARD**
- Use `StateSurface.js` as the single source of truth for what is saved.

### 3. Server-Sync Requirements (Future)
- **World Persistence**: The world evolves while offline.
- **Merge Logic**: Loading = Syncing to *current* Server state, not just local snapshot.
- **Conflict Resolution**: Server timestamp wins.

### 4. Supabase Integration (Patterns)
- Use **Row Level Security (RLS)**.
- Use **Realtime Subscriptions** for live updates.
- Store heavy assets (large save dumps) in **Storage Buckets**, metadata in **Tables**.
