/**
 * SimCore Systems Module
 * 
 * Contains game systems that process entities each tick.
 * NO Three.js or rendering code allowed here.
 * 
 * Future contents (Prompt 04+):
 * - ResearchSystem: Goal → Feature progression
 * - DevSystem: Feature → TypeBlueprint progression
 * - ProductionSystem: Type → Unit creation
 * - CombatSystem: Damage resolution, disable, capture
 * - EconomySystem: Energy pool, Materia conversion
 * - TimelineSystem: Command → Action execution
 * - MovementSystem: Position updates (engine-agnostic)
 */

// Placeholder - systems will be added in future prompts
export const SYSTEMS_VERSION = '0.1.0';

/**
 * Base class for all systems (optional pattern)
 * Systems process entities each tick without owning state.
 */
export class BaseSystem {
    constructor(name) {
        this.name = name;
        this.enabled = true;
    }

    /**
     * Called each simulation tick
     * @param {number} dt - Delta time in seconds
     * @param {Object} context - Shared context (store, entities, etc.)
     */
    update(dt, context) {
        // Override in subclass
    }

    /**
     * Enable this system
     */
    enable() {
        this.enabled = true;
    }

    /**
     * Disable this system
     */
    disable() {
        this.enabled = false;
    }
}
