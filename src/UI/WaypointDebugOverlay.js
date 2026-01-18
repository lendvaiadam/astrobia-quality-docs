export class WaypointDebugOverlay {
    constructor(game) {
        this.game = game;
        this.element = document.createElement('div');
        this.visible = true; // Default visible
        this.initDOM();
        this.startUpdateLoop();
    }

    show() {
        this.visible = true;
        this.element.style.display = 'block';
    }

    hide() {
        this.visible = false;
        this.element.style.display = 'none';
    }

    toggle() {
        if (this.visible) this.hide();
        else this.show();
        return this.visible;
    }

    initDOM() {
        this.element.style.position = 'absolute';
        this.element.style.top = '10px';
        this.element.style.left = '10px';
        this.element.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.element.style.color = '#0f0';
        this.element.style.fontFamily = 'monospace';
        this.element.style.fontSize = '12px';
        this.element.style.padding = '10px';
        this.element.style.pointerEvents = 'none'; // Click-through
        this.element.style.zIndex = '1000';
        this.element.style.borderRadius = '4px';
        this.element.style.whiteSpace = 'pre';
        document.body.appendChild(this.element);
    }

    startUpdateLoop() {
        // Update 10 times per second
        setInterval(() => this.update(), 100);
    }

    update() {
        if (!this.game.units || this.game.units.length === 0) {
            this.element.textContent = "No Units";
            return;
        }

        const unit = this.game.units[0]; // Assume single unit for now
        if (!unit) {
            this.element.textContent = "Unit not loaded";
            return;
        }
        
        if (!unit.waypoints || unit.waypoints.length === 0) {
            this.element.textContent = "No Waypoints";
            return;
        }

        let output = "WAYPOINT DEBUG (Strict State)\n";
        output += "--------------------------------------------------\n";
        output += "ID       | State       | Start # | End #\n";
        output += "--------------------------------------------------\n";

        unit.waypoints.forEach((wp, index) => {
            const shortId = wp.id.slice(-4);
            const state = (wp.logicalState || 'neutral').padEnd(11);
            const start = (wp.actionStartedCount || 0).toString().padStart(7);
            const end = (wp.actionCompletedCount || 0).toString().padStart(6);
            
            // Highlight current target
            const isTarget = unit.targetWaypointId === wp.id;
            const prefix = isTarget ? "> " : "  ";
            
            output += `${prefix}${shortId} | ${state} | ${start} | ${end}\n`;
        });

        output += "--------------------------------------------------\n";
        output += `Unit Target: ${unit.targetWaypointId ? unit.targetWaypointId.slice(-4) : 'None'}\n`;
        output += `Path Index:  ${unit.pathIndex}\n`;

        this.element.textContent = output;
    }
    
    // Optional: Call this to remove when needed
    dispose() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}
