/**
 * UnitModel - Pure State Container for a Unit
 * 
 * Engine-agnostic, serializable unit state.
 * NO Three.js or rendering code allowed here.
 * 
 * This is the "truth" of a unit's state. The visual representation
 * (mesh, materials, effects) lives in Adapters/three/UnitView.js.
 * 
 * @example
 * const model = new UnitModel({ id: 'unit-001', name: 'Scout' });
 * model.position = { x: 10, y: 5, z: 0 };
 * const json = model.serialize(); // Safe for localStorage/network
 */
export class UnitModel {
    /**
     * @param {Object} config - Initial configuration
     * @param {string} [config.id] - Unique identifier
     * @param {string} [config.name] - Display name
     * @param {string} [config.typeId] - Reference to TypeBlueprint
     */
    constructor(config = {}) {
        // === IDENTITY ===
        this.id = config.id || this._generateId();
        this.name = config.name || `Unit-${this.id.slice(-4)}`;
        this.typeId = config.typeId || null; // Future: links to TypeBlueprint
        
        // === POSITION & ORIENTATION ===
        // Plain objects for serializability (no Vector3/Quaternion)
        this.position = { x: 0, y: 10, z: 0 };
        this.rotation = { x: 0, y: 0, z: 0, w: 1 }; // Quaternion as XYZW
        this.velocity = { x: 0, y: 0, z: 0 };
        this.velocityDirection = { x: 0, y: 0, z: 1 };
        
        // === MOVEMENT STATS ===
        this.speed = 5.0;           // Base movement speed
        this.currentSpeed = 0.0;    // Actual speed this frame
        this.turnSpeed = 2.0;       // Rotation speed
        this.groundOffset = 0.22;   // Hover height above terrain
        
        // === COMMAND QUEUE ===
        this.commands = [];             // Array of command objects
        this.currentCommandIndex = 0;   // Current command being executed
        
        // === WAYPOINTS ===
        this.waypoints = [];            // Array of waypoint objects
        this.targetWaypointId = null;   // ID of current target
        this.lastWaypointId = null;     // ID of last passed waypoint
        this.loopingEnabled = false;    // Loop path when complete
        this.isPathClosed = false;      // Path forms a closed loop
        
        // === NAVIGATION STATE ===
        this.isFollowingPath = false;
        this.pathIndex = 0;
        this.segmentProgress = 0.0;
        
        // === WATER BEHAVIOR ===
        this.waterState = 'normal';     // normal, wading, escaping, etc.
        this.waterSlowdownFactor = 1.0;
        this.canSwim = false;
        this.canWalkUnderwater = false;
        
        // === COMBAT / HEALTH ===
        this.health = 100;              // Current health (0-100)
        this.maxHealth = 100;
        this.shieldLevel = 0;           // Shield percentage (0-100)
        this.disabled = false;          // True if unit is a wreck
        this.amortization = 100;        // Wear level (100 = new, 0 = broken)
        
        // === STATS (computed by StatsEngine in Prompt 03) ===
        this.effectiveStats = {
            move: 100,
            vision: 100,
            shot: 0,
            shield: 0
        };
        
        // === FLAGS ===
        this.isSelected = false;
        this.isHovered = false;
        this.pausedByCommand = false;
        
        // === INTERNAL TIMERS (ephemeral, not always serialized) ===
        this.stuckTimer = 0;
        this.actionTimer = 0;
    }

    /**
     * Generate a unique ID for this unit
     * @private
     */
    _generateId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `unit-${timestamp}-${random}`;
    }

    // === POSITION HELPERS ===
    
    /**
     * Set position from x, y, z values
     */
    setPosition(x, y, z) {
        this.position.x = x;
        this.position.y = y;
        this.position.z = z;
    }

    /**
     * Set position from an object with x, y, z properties
     */
    setPositionFromObject(obj) {
        if (obj && typeof obj.x === 'number') {
            this.position.x = obj.x;
            this.position.y = obj.y;
            this.position.z = obj.z;
        }
    }

    /**
     * Set rotation from quaternion components
     */
    setRotation(x, y, z, w) {
        this.rotation.x = x;
        this.rotation.y = y;
        this.rotation.z = z;
        this.rotation.w = w;
    }

    // === COMMAND QUEUE ===
    
    /**
     * Add a command to the queue
     * @param {Object} command - Command object with type and params
     */
    addCommand(command) {
        this.commands.push(command);
    }

    /**
     * Clear all commands
     */
    clearCommands() {
        this.commands = [];
        this.currentCommandIndex = 0;
    }

    /**
     * Get the current command being executed
     * @returns {Object|null}
     */
    getCurrentCommand() {
        if (this.currentCommandIndex < this.commands.length) {
            return this.commands[this.currentCommandIndex];
        }
        return null;
    }

    /**
     * Move to the next command
     */
    advanceCommand() {
        this.currentCommandIndex++;
    }

    // === SERIALIZATION ===

    /**
     * Serialize unit state to a plain object (safe for JSON.stringify)
     * @param {boolean} [includeEphemeral=false] - Include timers/temp state
     * @returns {Object}
     */
    serialize(includeEphemeral = false) {
        const data = {
            // Identity
            id: this.id,
            name: this.name,
            typeId: this.typeId,
            
            // Position
            position: { ...this.position },
            rotation: { ...this.rotation },
            velocity: { ...this.velocity },
            
            // Movement
            speed: this.speed,
            turnSpeed: this.turnSpeed,
            groundOffset: this.groundOffset,
            
            // Commands
            commands: JSON.parse(JSON.stringify(this.commands)),
            currentCommandIndex: this.currentCommandIndex,
            
            // Waypoints
            waypoints: JSON.parse(JSON.stringify(this.waypoints)),
            targetWaypointId: this.targetWaypointId,
            lastWaypointId: this.lastWaypointId,
            loopingEnabled: this.loopingEnabled,
            isPathClosed: this.isPathClosed,
            
            // Water
            waterState: this.waterState,
            canSwim: this.canSwim,
            canWalkUnderwater: this.canWalkUnderwater,
            
            // Combat
            health: this.health,
            maxHealth: this.maxHealth,
            shieldLevel: this.shieldLevel,
            disabled: this.disabled,
            amortization: this.amortization,
            
            // Stats
            effectiveStats: { ...this.effectiveStats }
        };
        
        if (includeEphemeral) {
            data.stuckTimer = this.stuckTimer;
            data.actionTimer = this.actionTimer;
            data.isSelected = this.isSelected;
            data.isFollowingPath = this.isFollowingPath;
        }
        
        return data;
    }

    /**
     * Deserialize data into this model
     * @param {Object} data - Serialized unit data
     */
    deserialize(data) {
        if (!data) return;
        
        // Identity
        if (data.id) this.id = data.id;
        if (data.name) this.name = data.name;
        if (data.typeId) this.typeId = data.typeId;
        
        // Position
        if (data.position) this.position = { ...data.position };
        if (data.rotation) this.rotation = { ...data.rotation };
        if (data.velocity) this.velocity = { ...data.velocity };
        
        // Movement
        if (data.speed !== undefined) this.speed = data.speed;
        if (data.turnSpeed !== undefined) this.turnSpeed = data.turnSpeed;
        if (data.groundOffset !== undefined) this.groundOffset = data.groundOffset;
        
        // Commands
        if (data.commands) this.commands = JSON.parse(JSON.stringify(data.commands));
        if (data.currentCommandIndex !== undefined) this.currentCommandIndex = data.currentCommandIndex;
        
        // Waypoints
        if (data.waypoints) this.waypoints = JSON.parse(JSON.stringify(data.waypoints));
        if (data.targetWaypointId !== undefined) this.targetWaypointId = data.targetWaypointId;
        if (data.lastWaypointId !== undefined) this.lastWaypointId = data.lastWaypointId;
        if (data.loopingEnabled !== undefined) this.loopingEnabled = data.loopingEnabled;
        if (data.isPathClosed !== undefined) this.isPathClosed = data.isPathClosed;
        
        // Water
        if (data.waterState) this.waterState = data.waterState;
        if (data.canSwim !== undefined) this.canSwim = data.canSwim;
        if (data.canWalkUnderwater !== undefined) this.canWalkUnderwater = data.canWalkUnderwater;
        
        // Combat
        if (data.health !== undefined) this.health = data.health;
        if (data.maxHealth !== undefined) this.maxHealth = data.maxHealth;
        if (data.shieldLevel !== undefined) this.shieldLevel = data.shieldLevel;
        if (data.disabled !== undefined) this.disabled = data.disabled;
        if (data.amortization !== undefined) this.amortization = data.amortization;
        
        // Stats
        if (data.effectiveStats) this.effectiveStats = { ...data.effectiveStats };
    }

    /**
     * Create a deep clone of this model
     * @returns {UnitModel}
     */
    clone() {
        const cloned = new UnitModel();
        cloned.deserialize(this.serialize(true));
        return cloned;
    }

    /**
     * Check if this unit is alive and operational
     * @returns {boolean}
     */
    isOperational() {
        return !this.disabled && this.health > 0;
    }

    /**
     * Apply damage to this unit
     * @param {number} amount - Damage amount
     * @returns {boolean} True if unit was disabled by this damage
     */
    takeDamage(amount) {
        // Shield absorbs first
        if (this.shieldLevel > 0) {
            const shieldAbsorb = Math.min(this.shieldLevel, amount);
            this.shieldLevel -= shieldAbsorb;
            amount -= shieldAbsorb;
        }
        
        // Remaining damage hits health
        this.health = Math.max(0, this.health - amount);
        
        if (this.health <= 0) {
            this.disabled = true;
            return true;
        }
        return false;
    }

    /**
     * Heal this unit
     * @param {number} amount - Heal amount
     */
    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
        if (this.health > 0) {
            this.disabled = false;
        }
    }
}
