/**
 * StatsEngine - Percentage-Based Stat Calculation System
 * 
 * Implements the formula from MASTER_SYSTEM_PLAN:
 * EffectiveF = BaseF × TypeAllocation% × SpecializationBonus% × FeatureTraining%
 *            × UnitTraining% × Tuning% × Amort% × Damage%
 * 
 * NO Three.js or rendering dependencies.
 * All balance values are externalized to a config object editable via Dev Panel.
 */

/**
 * Default configuration for the stats system
 * All values here are dev-panel editable
 */
export const DEFAULT_STATS_CONFIG = {
    // Base values (meaning of 100% for each feature)
    baseValues: {
        move: 10,       // 10 m/s at 100%
        vision: 100,    // 100m range at 100%
        shot: 100,      // 100 shot rating at 100%
        shield: 100     // 100 shield capacity at 100%
    },

    // Minimum allocation per included feature (20% = 0.20)
    minAllocation: 0.20,

    // Maximum number of type slots (Design% / 20, capped at this)
    maxTypeSlots: 10,

    // Design% step (20 = steps of 20, 40, 60...)
    designStep: 20,

    // Specialization bonus table (feature count → multiplier)
    // Fewer features = higher bonus (specialist units)
    specializationTable: {
        1: 1.50,    // 1 feature → 150%
        2: 1.25,    // 2 features → 125%
        3: 1.15,    // 3 features → 115%
        4: 1.10,    // 4 features → 110%
        5: 1.00     // 5+ features → 100% (no bonus)
    },

    // Training caps
    trainingCaps: {
        feature: 3.00,  // Max 300% for individual feature training
        unit: 2.00      // Max 200% for whole-unit training
    },

    // Tuning bonus (only one feature per unit can be tuned)
    tuningBonus: 1.20,  // +20%

    // Fire rate curve params (for Shot feature internal allocation)
    fireRateCurve: {
        minInterval: 0.1,   // Fastest: 0.1 seconds between shots
        maxInterval: 30,    // Slowest: 30 seconds between shots
        maxPct: 300,        // 300% = fastest fire rate
        curve: 1.0          // Curve exponent (1.0 = linear)
    },

    // Shot internal allocation base values
    shotBaseValues: {
        range: 10,      // Base 10m range
        power: 10,      // Base 10 damage
        interval: 1.0   // Base 1 second between shots
    }
};

/**
 * StatsEngine class
 * Computes effective stats for units based on type allocations and modifiers
 */
export class StatsEngine {
    /**
     * @param {Object} config - Configuration object (uses defaults if not provided)
     */
    constructor(config = null) {
        this.config = config || { ...DEFAULT_STATS_CONFIG };
    }

    /**
     * Update configuration (from Dev Panel)
     * @param {Object} newConfig 
     */
    setConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * Get current configuration
     * @returns {Object}
     */
    getConfig() {
        return this.config;
    }

    /**
     * Get specialization bonus based on feature count
     * @param {number} featureCount - Number of features in the type
     * @returns {number} Multiplier (e.g., 1.25 for 125%)
     */
    getSpecializationBonus(featureCount) {
        const table = this.config.specializationTable;
        
        // Find the right entry (5+ uses the 5 entry)
        const key = Math.min(featureCount, 5);
        return table[key] || 1.0;
    }

    /**
     * Compute the effective stat for a single feature on a unit
     * 
     * @param {string} feature - Feature name ('move', 'vision', 'shot', 'shield')
     * @param {Object} unitData - Unit data containing:
     *   - typeAllocation: { [feature]: percentage } - Type designer allocation (sums to 1.0)
     *   - featureCount: number - Total features in the type
     *   - featureTraining: { [feature]: multiplier } - Per-feature training (1.0-3.0)
     *   - unitTraining: number - Whole-unit training multiplier (1.0-2.0)
     *   - tunedFeature: string|null - Which feature is tuned (only one)
     *   - amortization: number - Wear multiplier (1.0 = new, 0.5 = 50% worn)
     *   - damage: { [layer]: multiplier } - Damage per layer
     * @returns {number} Effective stat value
     */
    computeEffectiveStat(feature, unitData) {
        const config = this.config;
        
        // Base value for this feature
        const base = config.baseValues[feature] || 100;
        
        // Type allocation (0.0 - 1.0, default 0 if not allocated)
        const typeAlloc = unitData.typeAllocation?.[feature] || 0;
        
        // If not allocated, stat is 0
        if (typeAlloc <= 0) {
            return 0;
        }
        
        // Specialization bonus based on feature count
        const specBonus = this.getSpecializationBonus(unitData.featureCount || 1);
        
        // Feature-specific training (default 1.0 = no training)
        let featureTraining = unitData.featureTraining?.[feature] || 1.0;
        featureTraining = Math.min(featureTraining, config.trainingCaps.feature);
        
        // Unit-wide training (default 1.0 = no training)
        let unitTraining = unitData.unitTraining || 1.0;
        unitTraining = Math.min(unitTraining, config.trainingCaps.unit);
        
        // Tuning bonus (only if this feature is the tuned one)
        const tuning = (unitData.tunedFeature === feature) ? config.tuningBonus : 1.0;
        
        // Amortization (wear, default 1.0 = new)
        const amort = unitData.amortization ?? 1.0;
        
        // Damage modifier (layered, default 1.0 = no damage)
        // For simplicity, we use a single damage multiplier per feature
        // Later: implement layered damage (shield→weapons→movement→vision)
        const damage = unitData.damage?.[feature] ?? 1.0;
        
        // Compute effective stat
        const effective = base 
            * typeAlloc 
            * specBonus 
            * featureTraining 
            * unitTraining 
            * tuning 
            * amort 
            * damage;
        
        return effective;
    }

    /**
     * Compute all effective stats for a unit
     * @param {Object} unitData - Unit data (see computeEffectiveStat)
     * @returns {Object} { move, vision, shot, shield }
     */
    computeAllStats(unitData) {
        return {
            move: this.computeEffectiveStat('move', unitData),
            vision: this.computeEffectiveStat('vision', unitData),
            shot: this.computeEffectiveStat('shot', unitData),
            shield: this.computeEffectiveStat('shield', unitData)
        };
    }

    /**
     * Map fire rate percentage to interval in seconds
     * 
     * Formula from master plan:
     *   t = clamp(ratePct / maxPct, 0, 1)
     *   interval = maxInterval * (1 - t)^curve + minInterval * t^curve
     *   interval = interval / shotFactor
     *   interval = clamp(interval, minInterval, maxInterval)
     * 
     * @param {number} ratePct - Fire rate allocation percentage (0-300)
     * @param {number} shotFactor - Overall shot rating factor (ShotRating / 100)
     * @returns {number} Interval between shots in seconds
     */
    mapFireRate(ratePct, shotFactor = 1.0) {
        const params = this.config.fireRateCurve;
        
        // Normalize to 0-1 range
        const t = Math.max(0, Math.min(1, ratePct / params.maxPct));
        
        // Apply curve
        const tCurved = Math.pow(t, params.curve);
        const oneMinusTCurved = Math.pow(1 - t, params.curve);
        
        // Interpolate between max and min interval
        let interval = params.maxInterval * oneMinusTCurved + params.minInterval * tCurved;
        
        // Apply shot factor (better rating = faster)
        if (shotFactor > 0) {
            interval = interval / shotFactor;
        }
        
        // Clamp to valid range
        interval = Math.max(params.minInterval, Math.min(params.maxInterval, interval));
        
        return interval;
    }

    /**
     * Compute shot sub-stats from internal allocation
     * Shot has internal allocation: range%, power%, fire-rate% (sums to 100%)
     * 
     * @param {number} shotRating - Effective shot rating from main formula
     * @param {Object} internalAlloc - { range: 0-1, power: 0-1, rate: 0-1 }
     * @returns {Object} { range, power, interval }
     */
    computeShotSubStats(shotRating, internalAlloc) {
        const base = this.config.shotBaseValues;
        const shotFactor = shotRating / 100;
        
        const rangePct = internalAlloc.range || 0.33;
        const powerPct = internalAlloc.power || 0.33;
        const ratePct = internalAlloc.rate || 0.34;
        
        return {
            range: base.range * rangePct * shotFactor,
            power: base.power * powerPct * shotFactor,
            interval: this.mapFireRate(ratePct * 300, shotFactor) // Convert 0-1 to 0-300%
        };
    }

    /**
     * Calculate type slots available based on Design%
     * slots = Design% / 20, capped at maxTypeSlots
     * 
     * @param {number} designPct - Design percentage (20, 40, 60... 200)
     * @returns {number} Number of available type slots
     */
    getTypeSlots(designPct) {
        const slots = Math.floor(designPct / this.config.designStep);
        return Math.min(slots, this.config.maxTypeSlots);
    }

    /**
     * Calculate development speed multiplier based on Design%
     * devSpeed = Design% / 100
     * 
     * @param {number} designPct - Design percentage
     * @returns {number} Development speed multiplier
     */
    getDevSpeed(designPct) {
        return designPct / 100;
    }

    /**
     * Validate type allocation (must sum to ~100%, each feature >= minAllocation)
     * @param {Object} allocation - { [feature]: percentage }
     * @returns {{ valid: boolean, errors: string[] }}
     */
    validateTypeAllocation(allocation) {
        const errors = [];
        let total = 0;
        
        for (const [feature, pct] of Object.entries(allocation)) {
            if (pct > 0 && pct < this.config.minAllocation) {
                errors.push(`${feature}: ${(pct * 100).toFixed(0)}% < minimum ${(this.config.minAllocation * 100).toFixed(0)}%`);
            }
            total += pct;
        }
        
        // Allow small floating point error
        if (Math.abs(total - 1.0) > 0.01) {
            errors.push(`Total allocation ${(total * 100).toFixed(0)}% != 100%`);
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
}

// Singleton instance for global use
export const globalStatsEngine = new StatsEngine();
