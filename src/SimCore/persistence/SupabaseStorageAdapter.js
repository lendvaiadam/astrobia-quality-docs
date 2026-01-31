/**
 * SupabaseStorageAdapter - Supabase Database Storage Backend
 *
 * R012: Implements the StorageAdapter interface using Supabase PostgreSQL.
 * Stores save data in the world_states table with Row Level Security (RLS).
 *
 * Architecture:
 *   SaveManager → SupabaseStorageAdapter → Supabase DB (world_states table)
 *
 * Security:
 * - RLS ensures users can only access their own saves
 * - Anonymous auth supported for dev/testing
 * - Authenticated user ID is used as owner_id
 *
 * Table Schema (see docs/specs/R012_SUPABASE_SETUP.md):
 *   - id: uuid (primary key)
 *   - owner_id: uuid (auth.users reference)
 *   - state_data: jsonb (save envelope)
 *   - sim_tick: bigint (for metadata queries)
 *   - updated_at: timestamp
 */

/**
 * SupabaseStorageAdapter provides persistence via Supabase database.
 */
export class SupabaseStorageAdapter {
    /**
     * @param {Object} supabaseClient - Initialized Supabase client
     * @param {Object} [options]
     * @param {string} [options.table='world_states'] - Table name
     */
    constructor(supabaseClient, options = {}) {
        if (!supabaseClient) {
            throw new Error('SupabaseStorageAdapter requires supabaseClient');
        }

        /** @type {Object} Supabase client */
        this._supabase = supabaseClient;

        /** @type {string} Table name */
        this._table = options.table || 'world_states';

        /** @type {string|null} Cached user ID */
        this._userId = null;
    }

    /**
     * Get the current authenticated user ID.
     * @returns {Promise<string|null>}
     * @private
     */
    async _getUserId() {
        if (this._userId) {
            return this._userId;
        }

        const { data: { user }, error } = await this._supabase.auth.getUser();

        if (error || !user) {
            console.warn('[SupabaseStorageAdapter] No authenticated user');
            return null;
        }

        this._userId = user.id;
        return this._userId;
    }

    /**
     * Save data to Supabase.
     * Uses upsert to create or update the save.
     *
     * @param {string} key - Save slot key (stored in state_data for multi-slot future)
     * @param {Object} data - Data to persist (save envelope)
     * @returns {Promise<{ success: boolean, error?: string }>}
     */
    async save(key, data) {
        try {
            const userId = await this._getUserId();
            if (!userId) {
                return { success: false, error: 'Not authenticated' };
            }

            // Extract sim tick for metadata column
            const simTick = data.state?.simLoop?.tickCount ?? 0;

            // Upsert (update if exists, insert if not)
            const { error } = await this._supabase
                .from(this._table)
                .upsert({
                    owner_id: userId,
                    state_data: {
                        ...data,
                        _slotKey: key  // Embed slot key for future multi-slot support
                    },
                    sim_tick: simTick,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'owner_id',  // Single save per user for R012
                    ignoreDuplicates: false
                });

            if (error) {
                console.error('[SupabaseStorageAdapter] Save error:', error);
                return { success: false, error: error.message };
            }

            console.log(`[SupabaseStorageAdapter] Saved (tick: ${simTick})`);
            return { success: true };

        } catch (err) {
            console.error('[SupabaseStorageAdapter] Save exception:', err);
            return { success: false, error: err.message || 'Save failed' };
        }
    }

    /**
     * Load data from Supabase.
     *
     * @param {string} key - Save slot key (ignored for R012 single-save)
     * @returns {Promise<{ success: boolean, data?: Object, error?: string }>}
     */
    async load(key) {
        try {
            const userId = await this._getUserId();
            if (!userId) {
                return { success: false, error: 'Not authenticated' };
            }

            const { data, error } = await this._supabase
                .from(this._table)
                .select('state_data, sim_tick, updated_at')
                .eq('owner_id', userId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // No rows returned
                    return { success: false, error: 'Save not found' };
                }
                console.error('[SupabaseStorageAdapter] Load error:', error);
                return { success: false, error: error.message };
            }

            // Extract the save envelope from state_data
            const envelope = data.state_data;

            // Remove our internal slot key before returning
            if (envelope._slotKey) {
                delete envelope._slotKey;
            }

            console.log(`[SupabaseStorageAdapter] Loaded (tick: ${data.sim_tick})`);
            return { success: true, data: envelope };

        } catch (err) {
            console.error('[SupabaseStorageAdapter] Load exception:', err);
            return { success: false, error: err.message || 'Load failed' };
        }
    }

    /**
     * Delete a save from Supabase.
     *
     * @param {string} key - Save slot key (ignored for R012 single-save)
     * @returns {Promise<{ success: boolean, error?: string }>}
     */
    async delete(key) {
        try {
            const userId = await this._getUserId();
            if (!userId) {
                return { success: false, error: 'Not authenticated' };
            }

            const { error } = await this._supabase
                .from(this._table)
                .delete()
                .eq('owner_id', userId);

            if (error) {
                console.error('[SupabaseStorageAdapter] Delete error:', error);
                return { success: false, error: error.message };
            }

            return { success: true };

        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    /**
     * List all save keys for the current user.
     * For R012, returns at most one key since we have single-save-per-user.
     *
     * @returns {Promise<string[]>}
     */
    async list() {
        try {
            const userId = await this._getUserId();
            if (!userId) {
                return [];
            }

            const { data, error } = await this._supabase
                .from(this._table)
                .select('state_data')
                .eq('owner_id', userId);

            if (error || !data) {
                return [];
            }

            // Return slot keys (or 'default' if not set)
            return data.map(row => row.state_data?._slotKey || 'default');

        } catch (err) {
            console.error('[SupabaseStorageAdapter] List exception:', err);
            return [];
        }
    }

    /**
     * Check if a save exists for the current user.
     *
     * @param {string} key - Save slot key (ignored for R012)
     * @returns {Promise<boolean>}
     */
    async exists(key) {
        try {
            const userId = await this._getUserId();
            if (!userId) {
                return false;
            }

            const { count, error } = await this._supabase
                .from(this._table)
                .select('id', { count: 'exact', head: true })
                .eq('owner_id', userId);

            if (error) {
                return false;
            }

            return count > 0;

        } catch (err) {
            return false;
        }
    }

    /**
     * Clear cached user ID (for logout or user switch).
     */
    clearUserCache() {
        this._userId = null;
    }

    /**
     * Sign in anonymously to Supabase.
     * Creates a temporary user for dev/testing.
     *
     * @returns {Promise<{ success: boolean, userId?: string, error?: string }>}
     */
    async signInAnonymously() {
        try {
            const { data, error } = await this._supabase.auth.signInAnonymously();

            if (error) {
                console.error('[SupabaseStorageAdapter] Anonymous sign-in failed:', error);
                return { success: false, error: error.message };
            }

            this._userId = data.user?.id || null;
            console.log('[SupabaseStorageAdapter] Signed in anonymously:', this._userId);
            return { success: true, userId: this._userId };

        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    /**
     * Sign out from Supabase.
     *
     * @returns {Promise<{ success: boolean }>}
     */
    async signOut() {
        try {
            await this._supabase.auth.signOut();
            this._userId = null;
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }
}
