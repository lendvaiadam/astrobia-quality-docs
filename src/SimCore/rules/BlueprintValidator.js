/**
 * BlueprintValidator - TypeBlueprint Validation Module
 * 
 * Validates TypeBlueprint instances against game rules.
 * Uses DevPanel config for dynamic thresholds.
 * 
 * NO Three.js or rendering dependencies.
 */

import { FeatureRegistry } from '../domain/FeatureRegistry.js';
import { loadStatsConfig } from '../runtime/StatsConfigStorage.js';

/**
 * Default validation config (overridden by DevPanel)
 */
const DEFAULT_VALIDATION_CONFIG = {
    minAllocation: 0.20,         // 20% minimum per feature
    designStep: 20,              // Must be divisible by 20
    maxTypeSlots: 10,            // Max slots from designPct
    maxFeatureCount: 6,          // Max features per type
    allocSumTolerance: 0.001     // Floating point tolerance
};

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - True if all checks pass
 * @property {string[]} errors - List of error messages
 * @property {string[]} warnings - List of warning messages
 */

/**
 * Validate a TypeBlueprint
 * @param {import('../domain/TypeBlueprint.js').TypeBlueprint} blueprint 
 * @param {Object} [configOverride] - Optional config override
 * @returns {ValidationResult}
 */
export function validateBlueprint(blueprint, configOverride = null) {
    const errors = [];
    const warnings = [];
    
    // Load config from DevPanel or use defaults
    const statsConfig = loadStatsConfig();
    const config = {
        ...DEFAULT_VALIDATION_CONFIG,
        minAllocation: statsConfig.minAllocation || DEFAULT_VALIDATION_CONFIG.minAllocation,
        designStep: statsConfig.designStep || DEFAULT_VALIDATION_CONFIG.designStep,
        maxTypeSlots: statsConfig.maxTypeSlots || DEFAULT_VALIDATION_CONFIG.maxTypeSlots,
        ...configOverride
    };

    // === BASIC FIELD VALIDATION ===
    
    if (!blueprint) {
        errors.push('Blueprint is null or undefined');
        return { valid: false, errors, warnings };
    }

    if (!blueprint.id || typeof blueprint.id !== 'string') {
        errors.push('Blueprint ID must be a non-empty string');
    }

    if (!blueprint.ownerId || typeof blueprint.ownerId !== 'string') {
        errors.push('ownerId must be a non-empty string');
    }

    if (!blueprint.name || typeof blueprint.name !== 'string') {
        errors.push('name must be a non-empty string');
    }

    // === DESIGN PCT VALIDATION ===
    
    if (typeof blueprint.designPct !== 'number' || blueprint.designPct <= 0) {
        errors.push('designPct must be a positive number');
    } else {
        // Must be divisible by step
        if (blueprint.designPct % config.designStep !== 0) {
            errors.push(`designPct (${blueprint.designPct}) must be divisible by ${config.designStep}`);
        }
        
        // Check max slots
        const slots = Math.floor(blueprint.designPct / config.designStep);
        if (slots > config.maxTypeSlots) {
            errors.push(`designPct (${blueprint.designPct}) exceeds max slots (${config.maxTypeSlots} × ${config.designStep} = ${config.maxTypeSlots * config.designStep})`);
        }
    }

    // === ALLOCATION VALIDATION ===
    
    const allocations = blueprint.allocations || {};
    const includedFeatures = Object.keys(allocations).filter(k => allocations[k] > 0);
    
    // Check feature count
    if (includedFeatures.length > config.maxFeatureCount) {
        errors.push(`Too many features: ${includedFeatures.length} > max ${config.maxFeatureCount}`);
    }

    // Check each allocation
    let totalAllocation = 0;
    
    for (const [featureId, allocation] of Object.entries(allocations)) {
        // Skip zero allocations
        if (allocation <= 0) continue;
        
        // Check if feature exists
        if (!FeatureRegistry.has(featureId)) {
            errors.push(`Unknown feature: "${featureId}"`);
            continue;
        }
        
        // Check minimum allocation
        if (allocation < config.minAllocation - config.allocSumTolerance) {
            errors.push(`Feature "${featureId}" allocation (${(allocation * 100).toFixed(1)}%) below minimum (${(config.minAllocation * 100).toFixed(0)}%)`);
        }
        
        totalAllocation += allocation;
    }

    // Check total allocation equals 100%
    if (Math.abs(totalAllocation - 1.0) > config.allocSumTolerance) {
        errors.push(`Allocation sum (${(totalAllocation * 100).toFixed(1)}%) must equal 100%`);
    }

    // === SUB-ALLOCATION VALIDATION ===
    
    const subAllocations = blueprint.subAllocations || {};
    
    for (const [featureId, subAlloc] of Object.entries(subAllocations)) {
        // Check if feature exists
        if (!FeatureRegistry.has(featureId)) {
            errors.push(`SubAllocation for unknown feature: "${featureId}"`);
            continue;
        }
        
        const featureDef = FeatureRegistry.get(featureId);
        
        // Check if feature supports sub-allocation
        if (!featureDef.subAllocKeys || featureDef.subAllocKeys.length === 0) {
            warnings.push(`Feature "${featureId}" does not support sub-allocations`);
            continue;
        }
        
        // Validate sub-allocation keys
        const validKeys = new Set(featureDef.subAllocKeys);
        const providedKeys = Object.keys(subAlloc);
        
        for (const key of providedKeys) {
            if (!validKeys.has(key)) {
                errors.push(`Invalid sub-allocation key "${key}" for feature "${featureId}". Valid: ${featureDef.subAllocKeys.join(', ')}`);
            }
        }
        
        // Check sub-allocation sum equals 100%
        let subTotal = 0;
        for (const value of Object.values(subAlloc)) {
            if (typeof value !== 'number' || value < 0) {
                errors.push(`Sub-allocation values must be non-negative numbers`);
                continue;
            }
            subTotal += value;
        }
        
        if (Math.abs(subTotal - 1.0) > config.allocSumTolerance) {
            errors.push(`Sub-allocation sum for "${featureId}" (${(subTotal * 100).toFixed(1)}%) must equal 100%`);
        }
    }

    // === CHECK FEATURES WITH REQUIRED SUB-ALLOCATIONS ===
    
    for (const featureId of includedFeatures) {
        const featureDef = FeatureRegistry.get(featureId);
        if (featureDef && featureDef.subAllocKeys && featureDef.subAllocKeys.length > 0) {
            if (!subAllocations[featureId]) {
                warnings.push(`Feature "${featureId}" requires sub-allocations but none provided`);
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Quick validation check (returns boolean only)
 * @param {import('../domain/TypeBlueprint.js').TypeBlueprint} blueprint 
 * @returns {boolean}
 */
export function isValidBlueprint(blueprint) {
    return validateBlueprint(blueprint).valid;
}

/**
 * Validate and throw if invalid
 * @param {import('../domain/TypeBlueprint.js').TypeBlueprint} blueprint 
 * @throws {Error} If validation fails
 */
export function assertValidBlueprint(blueprint) {
    const result = validateBlueprint(blueprint);
    if (!result.valid) {
        throw new Error(`Invalid blueprint: ${result.errors.join('; ')}`);
    }
}

/**
 * Validate allocation values only (without full blueprint check)
 * @param {Object<string, number>} allocations 
 * @returns {ValidationResult}
 */
export function validateAllocations(allocations) {
    const blueprint = { 
        id: 'temp', 
        ownerId: 'temp', 
        name: 'temp', 
        designPct: 100, 
        allocations, 
        subAllocations: {} 
    };
    return validateBlueprint(blueprint);
}
