/**
 * Supabase Client Initialization
 *
 * R012: Provides Supabase client setup for transport and storage.
 *
 * Usage:
 *   import { initSupabase, getSupabase } from './SimCore/supabase/index.js';
 *
 *   // Initialize once at app startup
 *   const supabase = initSupabase();
 *
 *   // Get client anywhere
 *   const client = getSupabase();
 */

// Dynamic import for Supabase (optional dependency)
let _supabase = null;
let _createClient = null;

/**
 * Initialize Supabase client from environment variables.
 * Call once at application startup.
 *
 * @param {Object} [options]
 * @param {string} [options.url] - Supabase URL (overrides env)
 * @param {string} [options.anonKey] - Supabase anon key (overrides env)
 * @returns {Object|null} Supabase client or null if not configured
 */
export async function initSupabase(options = {}) {
    if (_supabase) {
        return _supabase;
    }

    // Get config from options or environment
    const url = options.url ||
        (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
        (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL);

    const anonKey = options.anonKey ||
        (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
        (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY);

    if (!url || !anonKey) {
        console.warn('[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
        console.warn('[Supabase] Supabase features will be disabled');
        return null;
    }

    try {
        // Dynamic import to avoid bundling if not used
        const { createClient } = await import('@supabase/supabase-js');
        _createClient = createClient;

        _supabase = createClient(url, anonKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true
            },
            realtime: {
                params: {
                    eventsPerSecond: 10  // Throttle rate
                }
            }
        });

        console.log('[Supabase] Client initialized:', url);
        return _supabase;

    } catch (err) {
        console.warn('[Supabase] Failed to load @supabase/supabase-js:', err.message);
        console.warn('[Supabase] Install with: npm install @supabase/supabase-js');
        return null;
    }
}

/**
 * Get the initialized Supabase client.
 * Returns null if not initialized.
 *
 * @returns {Object|null}
 */
export function getSupabase() {
    return _supabase;
}

/**
 * Check if Supabase is configured and available.
 *
 * @returns {boolean}
 */
export function isSupabaseAvailable() {
    return _supabase !== null;
}

/**
 * Reset Supabase client (for testing).
 */
export function resetSupabase() {
    _supabase = null;
}
