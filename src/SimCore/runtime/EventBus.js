/**
 * EventBus - Pub/Sub Event System for SimCore
 * 
 * Engine-agnostic event system for decoupling components.
 * No Three.js or rendering dependencies allowed here.
 * 
 * @example
 * const bus = new EventBus();
 * bus.on('UNIT_MOVED', (data) => console.log(data));
 * bus.emit('UNIT_MOVED', { unitId: 1, position: {x: 0, y: 0, z: 0} });
 */
export class EventBus {
    constructor() {
        /** @type {Map<string, Set<Function>>} */
        this._listeners = new Map();
        
        /** @type {Map<string, Set<Function>>} */
        this._onceListeners = new Map();
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} handler - Callback function
     * @returns {Function} Unsubscribe function
     */
    on(event, handler) {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, new Set());
        }
        this._listeners.get(event).add(handler);
        
        // Return unsubscribe function for convenience
        return () => this.off(event, handler);
    }

    /**
     * Subscribe to an event only once
     * @param {string} event - Event name
     * @param {Function} handler - Callback function
     * @returns {Function} Unsubscribe function
     */
    once(event, handler) {
        if (!this._onceListeners.has(event)) {
            this._onceListeners.set(event, new Set());
        }
        this._onceListeners.get(event).add(handler);
        
        return () => {
            const listeners = this._onceListeners.get(event);
            if (listeners) {
                listeners.delete(handler);
            }
        };
    }

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {Function} handler - Callback function to remove
     */
    off(event, handler) {
        const listeners = this._listeners.get(event);
        if (listeners) {
            listeners.delete(handler);
        }
        
        const onceListeners = this._onceListeners.get(event);
        if (onceListeners) {
            onceListeners.delete(handler);
        }
    }

    /**
     * Emit an event to all subscribers
     * @param {string} event - Event name
     * @param {*} payload - Data to pass to handlers
     */
    emit(event, payload = null) {
        // Regular listeners
        const listeners = this._listeners.get(event);
        if (listeners) {
            listeners.forEach(handler => {
                try {
                    handler(payload);
                } catch (error) {
                    console.error(`[EventBus] Error in handler for "${event}":`, error);
                }
            });
        }
        
        // Once listeners (fire and remove)
        const onceListeners = this._onceListeners.get(event);
        if (onceListeners) {
            onceListeners.forEach(handler => {
                try {
                    handler(payload);
                } catch (error) {
                    console.error(`[EventBus] Error in once-handler for "${event}":`, error);
                }
            });
            this._onceListeners.delete(event);
        }
    }

    /**
     * Remove all listeners for an event, or all events if no event specified
     * @param {string} [event] - Optional event name
     */
    clear(event = null) {
        if (event) {
            this._listeners.delete(event);
            this._onceListeners.delete(event);
        } else {
            this._listeners.clear();
            this._onceListeners.clear();
        }
    }

    /**
     * Get the number of listeners for an event
     * @param {string} event - Event name
     * @returns {number}
     */
    listenerCount(event) {
        const regular = this._listeners.get(event)?.size || 0;
        const once = this._onceListeners.get(event)?.size || 0;
        return regular + once;
    }
}

// Singleton instance for global use
export const globalEventBus = new EventBus();
