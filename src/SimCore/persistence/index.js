/**
 * SimCore Persistence Module
 *
 * R011: Save/Load system for game state persistence.
 * R012: Supabase cloud storage adapter.
 *
 * Exports:
 * - SaveManager: Main save/load orchestrator
 * - StorageAdapters: localStorage, memory (for testing), Supabase (R012)
 * - Schema utilities: versioning, validation, migration
 */

export { SaveManager } from './SaveManager.js';

export {
    LocalStorageAdapter,
    MemoryStorageAdapter,
    defaultStorageAdapter
} from './StorageAdapter.js';

export { SupabaseStorageAdapter } from './SupabaseStorageAdapter.js';

export {
    SAVE_SCHEMA_VERSION,
    createSaveEnvelope,
    validateSaveEnvelope,
    migrateSaveEnvelope,
    extractSaveMetadata
} from './SaveSchema.js';
