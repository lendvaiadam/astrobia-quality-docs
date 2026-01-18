import * as THREE from 'three';
import { Pane } from 'tweakpane';

/**
 * NavMeshDebug - Debug UI panel for the SphericalNavMesh system.
 * 
 * Provides runtime controls for:
 * - Toggle debug visualization
 * - Adjust node count and regenerate
 * - View metrics (generation time, walkable/unwalkable counts)
 * - Test nearest-node queries
 */
export class NavMeshDebug {
    constructor(game) {
        this.game = game;
        this.navMesh = game.navMesh;
        
        if (!this.navMesh) {
            console.warn('[NavMeshDebug] No navMesh found on game object');
            return;
        }
        
        this.pane = new Pane({ title: 'NavMesh Debug', expanded: false });
        this.pane.element.style.position = 'fixed';
        this.pane.element.style.top = '10px';
        this.pane.element.style.right = '320px'; // Offset from main debug panel
        
        this.setupControls();
    }
    
    setupControls() {
        const navMesh = this.navMesh;
        
        // === Visualization ===
        const visFolder = this.pane.addFolder({ title: 'Visualization' });
        
        visFolder.addBinding(navMesh, 'debugVisible', { label: 'Show Nodes' })
            .on('change', (ev) => navMesh.setDebugVisible(ev.value));
        
        visFolder.addBinding(navMesh.config, 'debugPointSize', { min: 0.2, max: 3.0, label: 'Point Size' })
            .on('change', () => {
                if (navMesh.debugMesh) {
                    navMesh.debugMesh.material.size = navMesh.config.debugPointSize;
                }
            });
        
        // === Configuration ===
        const configFolder = this.pane.addFolder({ title: 'Configuration' });
        
        configFolder.addBinding(navMesh.config, 'nodeCount', { 
            min: 500, max: 200000, step: 500, label: 'Node Count' 
        });
        
        configFolder.addBinding(navMesh.config, 'maxSlopeAngle', { 
            min: 10, max: 80, step: 5, label: 'Max Slope (°)' 
        });
        
        configFolder.addBinding(navMesh.config, 'rockCheckRadius', { 
            min: 0.5, max: 5.0, step: 0.5, label: 'Rock Radius' 
        });
        
        configFolder.addButton({ title: 'Regenerate NavMesh' })
            .on('click', () => {
                console.log('[NavMeshDebug] Regenerating...');
                navMesh.regenerate();
                this.updateMetrics();
                
                // Re-add to scene if needed
                if (navMesh.debugMesh && !navMesh.debugMesh.parent) {
                    this.game.scene.add(navMesh.debugMesh);
                }
            });
        
        // === Metrics (Read-only) ===
        const metricsFolder = this.pane.addFolder({ title: 'Metrics', expanded: true });
        
        this.metricsParams = {
            genTime: '0 ms',
            walkable: '0',
            unwalkable: '0',
            avgNeighbors: '0'
        };
        
        metricsFolder.addBinding(this.metricsParams, 'genTime', { label: 'Gen Time', readonly: true });
        metricsFolder.addBinding(this.metricsParams, 'walkable', { label: 'Walkable', readonly: true });
        metricsFolder.addBinding(this.metricsParams, 'unwalkable', { label: 'Unwalkable', readonly: true });
        metricsFolder.addBinding(this.metricsParams, 'avgNeighbors', { label: 'Avg Neighbors', readonly: true });
        
        metricsFolder.addButton({ title: 'Refresh Metrics' })
            .on('click', () => this.updateMetrics());
        
        // === Query Test ===
        const queryFolder = this.pane.addFolder({ title: 'Query Test', expanded: false });
        
        queryFolder.addButton({ title: 'Nearest to Camera' })
            .on('click', () => this.testNearestToCamera());
        
        queryFolder.addButton({ title: 'Nearest to Selected Unit' })
            .on('click', () => this.testNearestToUnit());
        
        // === A* Pathfinding Test ===
        const pathFolder = this.pane.addFolder({ title: 'A* Pathfinding', expanded: false });
        
        pathFolder.addButton({ title: 'Path: Unit → Click Point' })
            .on('click', () => this.enablePathfindingMode());
        
        pathFolder.addButton({ title: 'Path: Random Test' })
            .on('click', () => this.testRandomPath());
        
        pathFolder.addButton({ title: 'Clear Path Viz' })
            .on('click', () => this.clearPathVisualization());
        
        // Pathfinding state
        this.pathfindingMode = false;
        this.pathLine = null;
        
        // Initial metrics update
        this.updateMetrics();
    }
    
    updateMetrics() {
        const metrics = this.navMesh.getMetrics();
        this.metricsParams.genTime = `${metrics.generationTimeMs.toFixed(1)} ms`;
        this.metricsParams.walkable = `${metrics.walkableCount}`;
        this.metricsParams.unwalkable = `${metrics.unwalkableCount}`;
        this.metricsParams.avgNeighbors = `${metrics.avgNeighborCount.toFixed(1)}`;
        this.pane.refresh();
    }
    
    testNearestToCamera() {
        if (!this.game.camera) return;
        
        const camPos = this.game.camera.position.clone();
        const startTime = performance.now();
        const result = this.navMesh.findNearestNode(camPos, false);
        const queryTime = performance.now() - startTime;
        
        console.log(`[NavMesh Query] Nearest to camera:`);
        console.log(`  Index: ${result.index}`);
        console.log(`  Distance: ${result.distance.toFixed(2)}`);
        console.log(`  Walkable: ${result.walkable}`);
        console.log(`  Query time: ${queryTime.toFixed(2)}ms`);
        
        // Highlight the found node (optional visual feedback)
        if (result.position) {
            this._highlightNode(result.index);
        }
    }
    
    testNearestToUnit() {
        const unit = this.game.selectedUnit;
        if (!unit) {
            console.log('[NavMesh Query] No unit selected');
            return;
        }
        
        const startTime = performance.now();
        const result = this.navMesh.findNearestNode(unit.position, true);
        const queryTime = performance.now() - startTime;
        
        console.log(`[NavMesh Query] Nearest walkable to unit:`);
        console.log(`  Index: ${result.index}`);
        console.log(`  Distance: ${result.distance.toFixed(2)}`);
        console.log(`  Query time: ${queryTime.toFixed(2)}ms`);
        
        if (result.position) {
            this._highlightNode(result.index);
        }
    }
    
    _highlightNode(index) {
        // Temporarily make one node bright yellow
        const colors = this.navMesh.debugMesh?.geometry?.attributes?.color;
        if (!colors) return;
        
        // Save original color
        const origR = colors.getX(index);
        const origG = colors.getY(index);
        const origB = colors.getZ(index);
        
        // Set to yellow
        colors.setXYZ(index, 1, 1, 0);
        colors.needsUpdate = true;
        
        // Restore after 2 seconds
        setTimeout(() => {
            colors.setXYZ(index, origR, origG, origB);
            colors.needsUpdate = true;
        }, 2000);
    }
    
    // === A* Pathfinding Test Methods ===
    
    /**
     * Test A* with two random walkable nodes.
     */
    testRandomPath() {
        // Get all walkable node indices
        const walkableIndices = [];
        for (let i = 0; i < this.navMesh.nodeCount; i++) {
            if (this.navMesh.nodes.walkable[i]) {
                walkableIndices.push(i);
            }
        }
        
        if (walkableIndices.length < 2) {
            console.log('[A* Test] Not enough walkable nodes');
            return;
        }
        
        // Pick two random nodes
        const startIdx = walkableIndices[Math.floor(Math.random() * walkableIndices.length)];
        let goalIdx = startIdx;
        while (goalIdx === startIdx) {
            goalIdx = walkableIndices[Math.floor(Math.random() * walkableIndices.length)];
        }
        
        const startPos = this.navMesh.nodes.positions[startIdx];
        const goalPos = this.navMesh.nodes.positions[goalIdx];
        
        console.log(`[A* Test] Finding path from node ${startIdx} to node ${goalIdx}`);
        
        const result = this.navMesh.findPath(startPos, goalPos);
        
        console.log(`[A* Test] Result:`, result.reason);
        console.log(`  Success: ${result.success}`);
        console.log(`  Path nodes: ${result.nodeIndices.length}`);
        console.log(`  World points: ${result.path.length}`);
        if (result.metrics) {
            console.log(`  Time: ${result.metrics.timeMs.toFixed(2)}ms`);
            console.log(`  Nodes explored: ${result.metrics.nodesExplored}`);
            if (result.metrics.totalDistance) {
                console.log(`  Total distance: ${result.metrics.totalDistance.toFixed(2)}`);
            }
        }
        
        // Visualize the path
        if (result.success && result.path.length > 0) {
            this.visualizePath(result.path);
        }
        
        // Highlight start (cyan) and goal (magenta)
        this._highlightNodeColor(startIdx, 0, 1, 1);
        this._highlightNodeColor(goalIdx, 1, 0, 1);
    }
    
    /**
     * Enable click-to-pathfind mode (from selected unit to click point).
     */
    enablePathfindingMode() {
        const unit = this.game.selectedUnit;
        if (!unit) {
            console.log('[A* Test] Select a unit first, then click on terrain');
            return;
        }
        
        console.log('[A* Test] Click on terrain to find path from selected unit...');
        
        // Add one-time click listener
        const onClickForPath = (event) => {
            // Raycast to terrain
            const mouse = new THREE.Vector2(
                (event.clientX / window.innerWidth) * 2 - 1,
                -(event.clientY / window.innerHeight) * 2 + 1
            );
            
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, this.game.camera);
            
            const intersects = raycaster.intersectObject(this.game.planet.mesh);
            
            if (intersects.length > 0) {
                const goalPos = intersects[0].point;
                const startPos = unit.position.clone();
                
                console.log(`[A* Test] Finding path from unit to clicked point...`);
                
                const result = this.navMesh.findPath(startPos, goalPos);
                
                console.log(`[A* Test] Result:`, result.reason);
                if (result.metrics) {
                    console.log(`  Time: ${result.metrics.timeMs.toFixed(2)}ms, Explored: ${result.metrics.nodesExplored}`);
                }
                
                if (result.success) {
                    this.visualizePath(result.path);
                }
            }
            
            // Remove listener after one click
            this.game.renderer.domElement.removeEventListener('click', onClickForPath);
        };
        
        this.game.renderer.domElement.addEventListener('click', onClickForPath, { once: true });
    }
    
    /**
     * Visualize a path as a colored line.
     */
    visualizePath(path) {
        this.clearPathVisualization();
        
        if (path.length < 2) return;
        
        // Offset points above terrain surface so line is visible
        const points = path.map(p => {
            const dir = p.clone().normalize();
            return dir.multiplyScalar(p.length() + 0.5); // 0.5 units above surface
        });
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        
        const material = new THREE.LineBasicMaterial({
            color: 0xffff00,
            linewidth: 2,
            depthTest: false, // Always render on top
            transparent: true,
            opacity: 0.9
        });
        
        this.pathLine = new THREE.Line(geometry, material);
        this.pathLine.renderOrder = 150;
        this.game.scene.add(this.pathLine);
        
        console.log(`[A* Test] Path visualized with ${points.length} points`);
    }
    
    /**
     * Clear path visualization.
     */
    clearPathVisualization() {
        if (this.pathLine) {
            this.game.scene.remove(this.pathLine);
            if (this.pathLine.geometry) this.pathLine.geometry.dispose();
            if (this.pathLine.material) this.pathLine.material.dispose();
            this.pathLine = null;
        }
    }
    
    /**
     * Highlight a node with a specific color.
     */
    _highlightNodeColor(index, r, g, b) {
        const colors = this.navMesh.debugMesh?.geometry?.attributes?.color;
        if (!colors || index < 0) return;
        
        const origR = colors.getX(index);
        const origG = colors.getY(index);
        const origB = colors.getZ(index);
        
        colors.setXYZ(index, r, g, b);
        colors.needsUpdate = true;
        
        setTimeout(() => {
            colors.setXYZ(index, origR, origG, origB);
            colors.needsUpdate = true;
        }, 5000);
    }
    
    dispose() {
        this.clearPathVisualization();
        if (this.pane) {
            this.pane.dispose();
        }
    }
}
