/**
 * FeatureRegistry - Dynamic Feature Definition Registry
 * 
 * Manages feature definitions for the Type system.
 * Built-in features are auto-registered on import.
 * Supports modding via controlled registration.
 * 
 * NO Three.js or rendering dependencies.
 */

// Feature categories
export const FEATURE_CATEGORIES = {
    COMBAT: 'Combat',
    MOVEMENT: 'Movement',
    RDP: 'RDP',           // Research, Design, Production
    SENSORS: 'Sensors',
    LOGISTICS: 'Logistics'
};

/**
 * @typedef {Object} FeatureDef
 * @property {string} id - Stable identifier (lowercase, no spaces)
 * @property {string} displayName - Human-readable name
 * @property {string} category - One of FEATURE_CATEGORIES
 * @property {boolean} isPassive - True = no active commands
 * @property {string[]|null} subAllocKeys - Sub-allocation keys (e.g. ['range', 'power', 'rate'])
 * @property {number} version - Definition version for migrations
 */

/**
 * Built-in feature definitions
 * @type {FeatureDef[]}
 */
const BUILT_IN_FEATURES = [
    {
        id: 'move',
        displayName: 'Movement',
        category: FEATURE_CATEGORIES.MOVEMENT,
        isPassive: false,
        subAllocKeys: null,
        version: 1
    },
    {
        id: 'vision',
        displayName: 'Vision',
        category: FEATURE_CATEGORIES.SENSORS,
        isPassive: true,
        subAllocKeys: null,
        version: 1
    },
    {
        id: 'shot',
        displayName: 'Weapon System',
        category: FEATURE_CATEGORIES.COMBAT,
        isPassive: false,
        subAllocKeys: ['range', 'power', 'rate'],
        version: 1
    },
    {
        id: 'shield',
        displayName: 'Shield',
        category: FEATURE_CATEGORIES.COMBAT,
        isPassive: true,
        subAllocKeys: null,
        version: 1
    },
    {
        id: 'research',
        displayName: 'Research',
        category: FEATURE_CATEGORIES.RDP,
        isPassive: false,
        subAllocKeys: null,
        version: 1
    },
    {
        id: 'design',
        displayName: 'Design',
        category: FEATURE_CATEGORIES.RDP,
        isPassive: false,
        subAllocKeys: null,
        version: 1
    },
    {
        id: 'produce_repair',
        displayName: 'Production & Repair',
        category: FEATURE_CATEGORIES.RDP,
        isPassive: false,
        subAllocKeys: null,
        version: 1
    },
    {
        id: 'radar',
        displayName: 'Radar',
        category: FEATURE_CATEGORIES.SENSORS,
        isPassive: true,
        subAllocKeys: null,
        version: 1
    }
];

/**
 * FeatureRegistry singleton
 */
class FeatureRegistryClass {
    constructor() {
        /** @type {Map<string, FeatureDef>} */
        this._features = new Map();
        
        /** @type {Set<string>} */
        this._builtInIds = new Set();
        
        /** @type {boolean} */
        this._builtInsFrozen = false;
        
        // Auto-register built-ins
        for (const def of BUILT_IN_FEATURES) {
            this._features.set(def.id, Object.freeze({ ...def }));
            this._builtInIds.add(def.id);
        }
    }

    /**
     * Get a feature definition by ID
     * @param {string} id 
     * @returns {FeatureDef|undefined}
     */
    get(id) {
        return this._features.get(id);
    }

    /**
     * Check if a feature exists
     * @param {string} id 
     * @returns {boolean}
     */
    has(id) {
        return this._features.has(id);
    }

    /**
     * Get all feature definitions
     * @returns {FeatureDef[]}
     */
    getAll() {
        return Array.from(this._features.values());
    }

    /**
     * Get all feature IDs
     * @returns {string[]}
     */
    getAllIds() {
        return Array.from(this._features.keys());
    }

    /**
     * Get IDs of built-in features
     * @returns {string[]}
     */
    getBuiltInIds() {
        return Array.from(this._builtInIds);
    }

    /**
     * Check if a feature is built-in
     * @param {string} id 
     * @returns {boolean}
     */
    isBuiltIn(id) {
        return this._builtInIds.has(id);
    }

    /**
     * Register a new feature definition (for modding)
     * @param {FeatureDef} def 
     * @throws {Error} If validation fails or duplicate ID
     */
    register(def) {
        // Validate definition
        const errors = this.validateFeatureDef(def);
        if (errors.length > 0) {
            throw new Error(`Invalid feature definition: ${errors.join(', ')}`);
        }

        // Check for built-in overwrite
        if (this._builtInsFrozen && this._builtInIds.has(def.id)) {
            throw new Error(`Cannot overwrite frozen built-in feature: ${def.id}`);
        }

        // Check for duplicate (non-built-in)
        if (this._features.has(def.id) && !this._builtInIds.has(def.id)) {
            throw new Error(`Feature already registered: ${def.id}`);
        }

        // Register
        this._features.set(def.id, Object.freeze({ ...def }));
    }

    /**
     * Validate a feature definition
     * @param {FeatureDef} def 
     * @returns {string[]} Array of error messages (empty if valid)
     */
    validateFeatureDef(def) {
        const errors = [];

        if (!def) {
            errors.push('Definition is null or undefined');
            return errors;
        }

        // Required string fields
        if (!def.id || typeof def.id !== 'string') {
            errors.push('id must be a non-empty string');
        } else if (!/^[a-z][a-z0-9_]*$/.test(def.id)) {
            errors.push('id must be lowercase alphanumeric with underscores, starting with letter');
        }

        if (!def.displayName || typeof def.displayName !== 'string') {
            errors.push('displayName must be a non-empty string');
        }

        if (!def.category || typeof def.category !== 'string') {
            errors.push('category must be a non-empty string');
        }

        if (typeof def.isPassive !== 'boolean') {
            errors.push('isPassive must be a boolean');
        }

        if (typeof def.version !== 'number' || def.version < 1) {
            errors.push('version must be a positive number');
        }

        // Optional subAllocKeys
        if (def.subAllocKeys !== null && def.subAllocKeys !== undefined) {
            if (!Array.isArray(def.subAllocKeys)) {
                errors.push('subAllocKeys must be an array or null');
            } else {
                for (const key of def.subAllocKeys) {
                    if (typeof key !== 'string' || key.length === 0) {
                        errors.push('subAllocKeys must contain non-empty strings');
                        break;
                    }
                }
            }
        }

        return errors;
    }

    /**
     * Freeze built-in features to prevent overwriting
     * Call this after initial setup to protect core features.
     */
    freezeBuiltIns() {
        this._builtInsFrozen = true;
    }

    /**
     * Check if built-ins are frozen
     * @returns {boolean}
     */
    areBuiltInsFrozen() {
        return this._builtInsFrozen;
    }

    /**
     * Get features by category
     * @param {string} category 
     * @returns {FeatureDef[]}
     */
    getByCategory(category) {
        return this.getAll().filter(f => f.category === category);
    }

    /**
     * Get features that have sub-allocations
     * @returns {FeatureDef[]}
     */
    getFeaturesWithSubAlloc() {
        return this.getAll().filter(f => f.subAllocKeys && f.subAllocKeys.length > 0);
    }
}

// Singleton instance
export const FeatureRegistry = new FeatureRegistryClass();

// Freeze built-ins by default (can be disabled for testing)
// FeatureRegistry.freezeBuiltIns(); // Uncomment to freeze on import
