/**
 * SimCore Domain Module
 * 
 * Contains game entity models (state only, serializable).
 * NO Three.js or rendering code allowed here.
 * 
 * Entities:
 * - UnitModel: Unit state (position, stats, commands)
 * - TypeBlueprint: Unit type definitions (allocations, features)
 * - FeatureRegistry: Feature definitions registry
 */

export { UnitModel } from './UnitModel.js';
export { 
    FeatureRegistry, 
    FEATURE_CATEGORIES 
} from './FeatureRegistry.js';
export { 
    TypeBlueprint, 
    BLUEPRINT_SCHEMA_VERSION,
    createSeedBlueprint,
    createScoutSeedBlueprint
} from './TypeBlueprint.js';

export const DOMAIN_VERSION = '0.3.0';

// Placeholder types for TypeScript-style documentation
/**
 * @typedef {Object} Position3D
 * @property {number} x
 * @property {number} y
 * @property {number} z
 */

/**
 * @typedef {Object} UnitState
 * @property {string} id - Unique unit identifier
 * @property {string} typeId - Reference to TypeBlueprint
 * @property {Position3D} position - World position
 * @property {number} health - Current health/integrity
 * @property {Object} stats - Computed effective stats
 */
