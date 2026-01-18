/**
 * SimCore Rules Module
 * 
 * Contains stat formulas, cost calculations, and game balance rules.
 * NO Three.js or rendering code allowed here.
 * 
 * Main exports:
 * - StatsEngine: The percentage-based stat calculation system
 * - BlueprintValidator: TypeBlueprint validation
 */

export { 
    StatsEngine, 
    DEFAULT_STATS_CONFIG, 
    globalStatsEngine 
} from './StatsEngine.js';

export {
    validateBlueprint,
    isValidBlueprint,
    assertValidBlueprint,
    validateAllocations
} from './BlueprintValidator.js';

export const RULES_VERSION = '0.3.0';

// Re-export default values for convenience
export { DEFAULT_STATS_CONFIG as DEFAULT_BASE_VALUES } from './StatsEngine.js';
