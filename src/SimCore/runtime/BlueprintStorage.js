/**
 * BlueprintStorage - Versioned localStorage Persistence for TypeBlueprints
 * 
 * Stores blueprints in localStorage with schema versioning.
 * Supports CRUD operations and future migration hooks.
 * 
 * Storage key: simcore:typeBlueprints:v1
 * Schema: { schemaVersion: number, blueprints: { [id]: TypeBlueprintData } }
 */

import { TypeBlueprint, BLUEPRINT_SCHEMA_VERSION } from '../domain/TypeBlueprint.js';

const STORAGE_KEY = 'simcore:typeBlueprints:v1';

/**
 * @typedef {Object} BlueprintStorageData
 * @property {number} schemaVersion
 * @property {Object<string, import('../domain/TypeBlueprint.js').TypeBlueprintData>} blueprints
 */

/**
 * Load storage data from localStorage
 * @returns {BlueprintStorageData}
 */
function loadStorageData() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const data = JSON.parse(raw);
            // Migration hook (for future versions)
            if (data.schemaVersion < BLUEPRINT_SCHEMA_VERSION) {
                return migrateStorageData(data);
            }
            return data;
        }
    } catch (error) {
        console.warn('[BlueprintStorage] Failed to load:', error);
    }
    
    // Return empty storage
    return {
        schemaVersion: BLUEPRINT_SCHEMA_VERSION,
        blueprints: {}
    };
}

/**
 * Save storage data to localStorage
 * @param {BlueprintStorageData} data 
 */
function saveStorageData(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
        console.error('[BlueprintStorage] Failed to save:', error);
    }
}

/**
 * Migrate old schema to current version
 * @param {BlueprintStorageData} oldData 
 * @returns {BlueprintStorageData}
 */
function migrateStorageData(oldData) {
    console.log(`[BlueprintStorage] Migrating from v${oldData.schemaVersion} to v${BLUEPRINT_SCHEMA_VERSION}`);
    
    // Add migration logic here for future versions
    // For now, just update version
    return {
        schemaVersion: BLUEPRINT_SCHEMA_VERSION,
        blueprints: oldData.blueprints || {}
    };
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Get all saved blueprints
 * @returns {TypeBlueprint[]}
 */
export function getAllBlueprints() {
    const data = loadStorageData();
    return Object.values(data.blueprints).map(bp => TypeBlueprint.deserialize(bp));
}

/**
 * Get blueprints by owner
 * @param {string} ownerId 
 * @returns {TypeBlueprint[]}
 */
export function getBlueprintsByOwner(ownerId) {
    return getAllBlueprints().filter(bp => bp.ownerId === ownerId);
}

/**
 * Get a blueprint by ID
 * @param {string} id 
 * @returns {TypeBlueprint|null}
 */
export function getBlueprint(id) {
    const data = loadStorageData();
    const bp = data.blueprints[id];
    return bp ? TypeBlueprint.deserialize(bp) : null;
}

/**
 * Check if a blueprint exists
 * @param {string} id 
 * @returns {boolean}
 */
export function hasBlueprint(id) {
    const data = loadStorageData();
    return id in data.blueprints;
}

/**
 * Save a blueprint (create or update)
 * @param {TypeBlueprint} blueprint 
 */
export function saveBlueprint(blueprint) {
    const data = loadStorageData();
    blueprint.touch(); // Update timestamp
    data.blueprints[blueprint.id] = blueprint.serialize();
    saveStorageData(data);
}

/**
 * Delete a blueprint by ID
 * @param {string} id 
 * @returns {boolean} True if deleted, false if not found
 */
export function deleteBlueprint(id) {
    const data = loadStorageData();
    if (id in data.blueprints) {
        delete data.blueprints[id];
        saveStorageData(data);
        return true;
    }
    return false;
}

/**
 * Delete all blueprints (careful!)
 */
export function clearAllBlueprints() {
    saveStorageData({
        schemaVersion: BLUEPRINT_SCHEMA_VERSION,
        blueprints: {}
    });
}

/**
 * Get seed blueprints only
 * @returns {TypeBlueprint[]}
 */
export function getSeedBlueprints() {
    return getAllBlueprints().filter(bp => bp.isSeed);
}

/**
 * Get non-seed blueprints only (user-created)
 * @returns {TypeBlueprint[]}
 */
export function getUserBlueprints() {
    return getAllBlueprints().filter(bp => !bp.isSeed);
}

/**
 * Get blueprint count
 * @returns {number}
 */
export function getBlueprintCount() {
    const data = loadStorageData();
    return Object.keys(data.blueprints).length;
}

/**
 * Export all blueprints as JSON string (for backup)
 * @returns {string}
 */
export function exportBlueprints() {
    const data = loadStorageData();
    return JSON.stringify(data, null, 2);
}

/**
 * Import blueprints from JSON string
 * @param {string} json 
 * @param {boolean} [merge=true] - If true, merge with existing. If false, replace all.
 * @returns {number} Number of blueprints imported
 */
export function importBlueprints(json, merge = true) {
    try {
        const imported = JSON.parse(json);
        const currentData = merge ? loadStorageData() : {
            schemaVersion: BLUEPRINT_SCHEMA_VERSION,
            blueprints: {}
        };
        
        const importedBlueprints = imported.blueprints || {};
        let count = 0;
        
        for (const [id, bp] of Object.entries(importedBlueprints)) {
            currentData.blueprints[id] = bp;
            count++;
        }
        
        saveStorageData(currentData);
        return count;
    } catch (error) {
        console.error('[BlueprintStorage] Import failed:', error);
        return 0;
    }
}
