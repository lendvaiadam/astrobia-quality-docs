# R012 Echo Test - Human User Script

**Purpose:** Verify R012 Supabase integration works end-to-end with RLS isolation.
**Audience:** Non-programmers (no code or console knowledge required)
**Time:** ~3 minutes

---

## Prerequisites

1. Game server running: `npm start` (http://localhost:8081)
2. Your `public/config.js` has **real** Supabase credentials
   - Copy from Supabase Dashboard → Settings → API
   - Use "anon public" key only (NOT service_role)

---

## 5-Step Echo Test

### Step 1: Open the Dev URL
**Action:** Open this URL in your browser:
```
http://localhost:8081/game.html?net=supabase&dev=1
```

**Expected HUD (top-right corner):**
```
┌─────────────────────────┐
│ R012 DEV HUD            │
│ NET MODE: SUPABASE      │  ← Green
│ CONFIG: OK              │  ← Green
│ AUTH: ANON OK           │  ← Green
│ REALTIME: CONNECTED     │  ← Green (may show CONNECTING... briefly)
│ ─────────────────────── │
│ [Save] [Load]           │
│ DB: ready               │
└─────────────────────────┘
```

**If you see red CONFIG status:** Edit `public/config.js` with real credentials first.

---

### Step 2: Save to Cloud
**Action:**
1. Wait for game to fully load (world visible)
2. Click the green **[Save]** button

**Expected:**
- Status shows: `DB: SAVING...` briefly
- Then: `DB: SAVE OK t:XX X.XKB [CLOUD]`
- Text is **green**
- `[CLOUD]` indicates Supabase storage (not localStorage)

---

### Step 3: Hard Refresh + Load
**Action:**
1. Press **Ctrl+F5** (hard refresh) or **Shift+Refresh**
2. Wait for game to load
3. Click the blue **[Load]** button

**Expected:**
- Status shows: `DB: LOADING...` briefly
- Then: `DB: LOAD OK t:XX X.XKB [CLOUD]`
- Text is **green**
- The game state is restored (unit positions snap back)

---

### Step 4: Verify REALTIME Status
**Action:** Watch the REALTIME line after refresh.

**Expected:**
- Shows `REALTIME: CONNECTING...` (orange) briefly after page load
- Changes to `REALTIME: CONNECTED` (green) within 2-3 seconds
- This proves the Supabase Realtime channel is working

---

### Step 5: RLS Isolation Test (Incognito)
**Action:**
1. Open a new **Incognito/Private** browser window
2. Go to: `http://localhost:8081/game.html?net=supabase&dev=1`
3. Click **[Load]** button

**Expected:**
- Status shows: `DB: LOAD FAIL: Save not found` (red)
- This is **CORRECT** - proves RLS isolation is working
- The incognito session has a different anonymous user ID
- Your save from Step 2 is only visible to YOUR session

**If Load succeeds in incognito:** RLS may not be configured correctly on Supabase.

---

## Quick Reference: HUD Status Colors

| Status | Color | Meaning |
|--------|-------|---------|
| `OK`, `CONNECTED`, `ANON OK` | Green | Working correctly |
| `CONNECTING...`, `SAVING...`, `LOADING...` | Orange | In progress |
| `MISSING`, `PLACEHOLDER`, `FAIL`, `ERROR` | Red | Needs attention |
| `N/A` | Gray | Not applicable (Local mode) |
| `[CLOUD]` | Suffix | Using Supabase storage |
| `[LOCAL]` | Suffix | Using localStorage |

---

## Test Result

- [ ] **PASS** - All 5 steps completed successfully
- [ ] **PARTIAL** - Steps 1-4 pass, Step 5 (RLS) needs Supabase config
- [ ] **FAIL** - (Describe issues below)

**Notes:**
```
[Write any issues or observations here]
```

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| `CONFIG: PLACEHOLDER` | Example values in config | Edit public/config.js with real credentials |
| `CONFIG: SERVICE_ROLE!` | Wrong key type | Use "anon public" key, NEVER service_role |
| `REALTIME: ERROR` | Network or credential issue | Check Supabase dashboard, verify URL/key |
| `SAVE FAIL: Not authenticated` | Auth not working | Check Supabase auth settings, enable anonymous auth |
| Load works in incognito | RLS not configured | Add RLS policy on world_states table |
| `AUTH: FAIL` | Invalid JWT | Regenerate anon key from Supabase dashboard |

---

## Security Note

The `service_role` key must **NEVER** be placed in `public/config.js`.

- ✅ `anon` (public) key - safe for frontend, limited by RLS
- ❌ `service_role` key - bypasses RLS, admin access

The game validates the key role and will show `CONFIG: SERVICE_ROLE!` if you accidentally use the wrong key.
