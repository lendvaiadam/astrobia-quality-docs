/**
 * Debug - Centralized debug logging with runtime toggle.
 * 
 * Usage:
 *   import { Debug } from '../Utils/Debug.js';
 *   Debug.log('Category', 'message');  // Only logs if enabled
 *   Debug.warn('Category', 'warning'); // Always logs
 * 
 * Toggle in console: Debug.enable('NavMesh') or Debug.disableAll()
 */
export const Debug = {
    // Categories that are enabled (set in console for runtime debugging)
    enabled: new Set(['Error', 'Warn']),
    
    // Enable a category
    enable(category) {
        this.enabled.add(category);
        console.log(`[Debug] Enabled: ${category}`);
    },
    
    // Disable a category
    disable(category) {
        this.enabled.delete(category);
    },
    
    // Disable all except errors/warnings
    disableAll() {
        this.enabled.clear();
        this.enabled.add('Error');
        this.enabled.add('Warn');
    },
    
    // Enable all common categories
    enableAll() {
        ['NavMesh', 'Path', 'Unit', 'Camera', 'Game', 'Rock', 'FOW'].forEach(c => this.enabled.add(c));
    },
    
    // Conditional log
    log(category, ...args) {
        if (this.enabled.has(category)) {
            console.log(`[${category}]`, ...args);
        }
    },
    
    // Always log warnings
    warn(category, ...args) {
        console.warn(`[${category}]`, ...args);
    },
    
    // Always log errors
    error(category, ...args) {
        console.error(`[${category}]`, ...args);
    }
};

// Expose globally for console access
if (typeof window !== 'undefined') {
    window.Debug = Debug;
}
