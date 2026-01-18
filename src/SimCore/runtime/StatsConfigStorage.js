/**
 * StatsConfigStorage - localStorage Persistence for Stats Configuration
 * 
 * Saves and loads the StatsEngine configuration to/from localStorage.
 * Enables Dev Panel values to persist across browser sessions.
 */

import { DEFAULT_STATS_CONFIG } from '../rules/StatsEngine.js';

const STORAGE_KEY = 'ASTEROIDA_StatsConfig';

/**
 * Load stats configuration from localStorage
 * @returns {Object} Saved config or default config
 */
export function loadStatsConfig() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            // Merge with defaults to handle new fields added in updates
            return deepMerge(DEFAULT_STATS_CONFIG, parsed);
        }
    } catch (error) {
        console.warn('[StatsConfigStorage] Failed to load config:', error);
    }
    return { ...DEFAULT_STATS_CONFIG };
}

/**
 * Save stats configuration to localStorage
 * @param {Object} config - Configuration to save
 */
export function saveStatsConfig(config) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
        console.warn('[StatsConfigStorage] Failed to save config:', error);
    }
}

/**
 * Reset stats configuration to defaults
 */
export function resetStatsConfig() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.warn('[StatsConfigStorage] Failed to reset config:', error);
    }
}

/**
 * Check if stats config has been customized (differs from defaults)
 * @returns {boolean}
 */
export function hasCustomConfig() {
    try {
        return localStorage.getItem(STORAGE_KEY) !== null;
    } catch {
        return false;
    }
}

/**
 * Deep merge two objects (source into target)
 * @param {Object} target - Base object (defaults)
 * @param {Object} source - Object to merge (saved)
 * @returns {Object} Merged object
 */
function deepMerge(target, source) {
    const result = { ...target };
    
    for (const key of Object.keys(source)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            result[key] = deepMerge(target[key] || {}, source[key]);
        } else {
            result[key] = source[key];
        }
    }
    
    return result;
}
