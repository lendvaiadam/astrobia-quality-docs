import * as THREE from 'three';

/**
 * SphericalNavMesh - Navigation node network on a spherical planet surface.
 * 
 * Uses Fibonacci Sphere distribution for even node placement.
 * Each node stores: position (on terrain), walkable flag, neighbor indices.
 * 
 * Features:
 * - Fibonacci sphere for uniform distribution
 * - Terrain-projected positions
 * - Walkable flags (water, slope, obstacles)
 * - Nearest-node query (O(n) brute force, upgradeable to octree)
 * - Debug visualization (THREE.Points)
 * - Performance metrics
 */
export class SphericalNavMesh {
    constructor(terrain, rockSystem = null) {
        this.terrain = terrain;
        this.rockSystem = rockSystem;
        
        // Configuration
        this.config = {
            nodeCount: 2000,           // Total navigation nodes
            maxSlopeAngle: 45,         // Degrees - steeper = unwalkable
            waterMargin: 0.5,          // How far above water level is still walkable
            rockCheckRadius: 2.0,      // Radius to check for rock collisions
            neighborDistance: null,    // Auto-calculated based on node density
            debugPointSize: 0.8,
            debugWalkableColor: 0x00ff88,
            debugUnwalkableColor: 0xff4444,
            debugShowUnwalkable: true
        };
        
        // Node data (Structure of Arrays for cache efficiency)
        this.nodes = {
            positions: [],      // THREE.Vector3[] - world positions on terrain
            directions: [],     // THREE.Vector3[] - normalized direction from origin
            walkable: [],       // boolean[] - can units traverse this node?
            neighbors: [],      // number[][] - indices of connected neighbors
            slopeAngle: [],     // number[] - terrain slope at this node (degrees)
            terrainHeight: []   // number[] - height above base radius
        };
        
        // Spatial index (simple for now)
        this.nodeCount = 0;
        
        // Debug visualization
        this.debugMesh = null;
        this.debugVisible = false;
        
        // Performance metrics
        this.metrics = {
            generationTimeMs: 0,
            walkableCount: 0,
            unwalkableCount: 0,
            avgNeighborCount: 0
        };
    }
    
    /**
     * Generate the navigation mesh.
     * Call this after terrain is ready.
     */
    generate() {
        const startTime = performance.now();
        
        console.log(`[NavMesh] Generating ${this.config.nodeCount} nodes...`);
        
        // 1. Generate Fibonacci sphere points
        this._generateFibonacciNodes();
        
        // 2. Project to terrain surface
        this._projectToTerrain();
        
        // 3. Calculate walkability (slope, water, rocks)
        this._calculateWalkability();
        
        // 4. Build neighbor connections
        this._buildNeighborGraph();
        
        // 5. Create debug visualization
        this._createDebugMesh();
        
        // Record metrics
        this.metrics.generationTimeMs = performance.now() - startTime;
        this.metrics.walkableCount = this.nodes.walkable.filter(w => w).length;
        this.metrics.unwalkableCount = this.nodeCount - this.metrics.walkableCount;
        
        console.log(`[NavMesh] Generation complete in ${this.metrics.generationTimeMs.toFixed(1)}ms`);
        console.log(`[NavMesh] Walkable: ${this.metrics.walkableCount}, Unwalkable: ${this.metrics.unwalkableCount}`);
        
        return this;
    }
    
    /**
     * Fibonacci Sphere Algorithm - generates evenly distributed points on a sphere.
     * Golden angle ensures uniform spacing.
     */
    _generateFibonacciNodes() {
        const n = this.config.nodeCount;
        const goldenRatio = (1 + Math.sqrt(5)) / 2;
        const angleIncrement = Math.PI * 2 * goldenRatio;
        
        this.nodes.positions = [];
        this.nodes.directions = [];
        
        for (let i = 0; i < n; i++) {
            // y goes from 1 to -1 (top to bottom of sphere)
            const y = 1 - (i / (n - 1)) * 2;
            
            // Radius at this y level (on unit sphere)
            const radiusAtY = Math.sqrt(1 - y * y);
            
            // Golden angle rotation
            const theta = angleIncrement * i;
            
            const x = Math.cos(theta) * radiusAtY;
            const z = Math.sin(theta) * radiusAtY;
            
            const direction = new THREE.Vector3(x, y, z).normalize();
            
            this.nodes.directions.push(direction);
            this.nodes.positions.push(new THREE.Vector3()); // Will be set in projectToTerrain
        }
        
        this.nodeCount = n;
        
        // Calculate expected neighbor distance based on sphere packing
        // Average area per node = 4*PI / n, so avg radius = sqrt(4*PI/n / PI) = 2/sqrt(n)
        const sphereRadius = this.terrain.params.radius;
        const avgNodeSpacing = sphereRadius * 2 / Math.sqrt(n);
        this.config.neighborDistance = avgNodeSpacing * 3.0; // 3.0x for good connectivity
        
        console.log(`[NavMesh] Avg node spacing: ${avgNodeSpacing.toFixed(2)}, neighbor radius: ${this.config.neighborDistance.toFixed(2)}`);
    }
    
    /**
     * Project all nodes onto the actual terrain surface.
     */
    _projectToTerrain() {
        for (let i = 0; i < this.nodeCount; i++) {
            const dir = this.nodes.directions[i];
            const terrainRadius = this.terrain.getRadiusAt(dir);
            
            // Store height above base
            this.nodes.terrainHeight[i] = terrainRadius - this.terrain.params.radius;
            
            // Position on terrain
            this.nodes.positions[i].copy(dir).multiplyScalar(terrainRadius);
        }
    }
    
    /**
     * Determine walkability based on:
     * 1. Water level - underwater = unwalkable
     * 2. Slope angle - too steep = unwalkable  
     * 3. Rock collision - inside rock = unwalkable
     */
    _calculateWalkability() {
        const waterLevel = this.terrain.params.waterLevel || 0;
        const baseRadius = this.terrain.params.radius;
        const waterRadius = baseRadius + waterLevel;
        const maxSlopeRad = this.config.maxSlopeAngle * Math.PI / 180;
        
        this.nodes.walkable = [];
        this.nodes.slopeAngle = [];
        
        // Prepare rock check (collect rock positions if available)
        const rockPositions = [];
        const rockRadii = [];
        if (this.rockSystem && this.rockSystem.rocks) {
            for (const rock of this.rockSystem.rocks) {
                if (rock.mesh) {
                    rockPositions.push(rock.mesh.position.clone());
                    // Estimate rock radius from scale
                    const scale = rock.mesh.scale;
                    rockRadii.push(Math.max(scale.x, scale.y, scale.z) * 1.5);
                }
            }
        }
        
        for (let i = 0; i < this.nodeCount; i++) {
            const pos = this.nodes.positions[i];
            const height = this.nodes.terrainHeight[i];
            const dir = this.nodes.directions[i];
            
            let walkable = true;
            let slopeAngle = 0;
            
            // 1. Water check
            const posRadius = pos.length();
            if (posRadius < waterRadius - this.config.waterMargin) {
                walkable = false;
            }
            
            // 2. Slope check
            if (walkable) {
                const normal = this.terrain.getNormalAt(pos);
                // Slope angle = angle between surface normal and radial direction
                const radialUp = dir.clone();
                const cosAngle = normal.dot(radialUp);
                slopeAngle = Math.acos(Math.min(1, Math.abs(cosAngle))) * 180 / Math.PI;
                
                if (slopeAngle > this.config.maxSlopeAngle) {
                    walkable = false;
                }
            }
            
            // 3. Rock collision check
            if (walkable && rockPositions.length > 0) {
                for (let r = 0; r < rockPositions.length; r++) {
                    const dist = pos.distanceTo(rockPositions[r]);
                    if (dist < rockRadii[r] + this.config.rockCheckRadius) {
                        walkable = false;
                        break;
                    }
                }
            }
            
            this.nodes.walkable[i] = walkable;
            this.nodes.slopeAngle[i] = slopeAngle;
        }
    }
    
    /**
     * Build neighbor connections based on distance.
     * Simple O(n²) for now - can optimize with spatial hash later.
     */
    _buildNeighborGraph() {
        const maxDist = this.config.neighborDistance;
        const maxDistSq = maxDist * maxDist;
        
        this.nodes.neighbors = [];
        let totalNeighbors = 0;
        
        for (let i = 0; i < this.nodeCount; i++) {
            const neighbors = [];
            const posI = this.nodes.positions[i];
            
            for (let j = 0; j < this.nodeCount; j++) {
                if (i === j) continue;
                
                const distSq = posI.distanceToSquared(this.nodes.positions[j]);
                if (distSq < maxDistSq) {
                    neighbors.push(j);
                }
            }
            
            this.nodes.neighbors[i] = neighbors;
            totalNeighbors += neighbors.length;
        }
        
        this.metrics.avgNeighborCount = totalNeighbors / this.nodeCount;
        console.log(`[NavMesh] Avg neighbors per node: ${this.metrics.avgNeighborCount.toFixed(1)}`);
    }
    
    /**
     * Find the nearest node to a world position.
     * O(n) brute force - upgrade to octree for large node counts.
     */
    findNearestNode(worldPosition, walkableOnly = false) {
        let bestIndex = -1;
        let bestDistSq = Infinity;
        
        for (let i = 0; i < this.nodeCount; i++) {
            if (walkableOnly && !this.nodes.walkable[i]) continue;
            
            const distSq = worldPosition.distanceToSquared(this.nodes.positions[i]);
            if (distSq < bestDistSq) {
                bestDistSq = distSq;
                bestIndex = i;
            }
        }
        
        return {
            index: bestIndex,
            position: bestIndex >= 0 ? this.nodes.positions[bestIndex].clone() : null,
            distance: Math.sqrt(bestDistSq),
            walkable: bestIndex >= 0 ? this.nodes.walkable[bestIndex] : false
        };
    }
    
    /**
     * Find all nodes within a radius.
     */
    findNodesInRadius(worldPosition, radius, walkableOnly = false) {
        const radiusSq = radius * radius;
        const results = [];
        
        for (let i = 0; i < this.nodeCount; i++) {
            if (walkableOnly && !this.nodes.walkable[i]) continue;
            
            const distSq = worldPosition.distanceToSquared(this.nodes.positions[i]);
            if (distSq < radiusSq) {
                results.push({
                    index: i,
                    position: this.nodes.positions[i],
                    distance: Math.sqrt(distSq),
                    walkable: this.nodes.walkable[i]
                });
            }
        }
        
        return results.sort((a, b) => a.distance - b.distance);
    }
    
    // =====================================================
    // A* PATHFINDING WITH GREAT-CIRCLE HEURISTIC
    // =====================================================
    
    /**
     * Great-circle (geodesic) distance between two points on a sphere.
     * This is the optimal heuristic for spherical pathfinding - admissible and consistent.
     * 
     * @param {THREE.Vector3} posA - First position
     * @param {THREE.Vector3} posB - Second position
     * @returns {number} Arc distance on the sphere surface
     */
    greatCircleDistance(posA, posB) {
        // Normalize to get directions from origin
        const dirA = posA.clone().normalize();
        const dirB = posB.clone().normalize();
        
        // Angle between directions (in radians)
        const dot = Math.max(-1, Math.min(1, dirA.dot(dirB)));
        const angle = Math.acos(dot);
        
        // Arc length = angle * radius
        // Use average radius of the two points for better accuracy on terrain
        const radius = (posA.length() + posB.length()) / 2;
        
        return angle * radius;
    }
    
    /**
     * A* Pathfinding on the spherical navmesh.
     * 
     * @param {THREE.Vector3} startPos - Start world position
     * @param {THREE.Vector3} goalPos - Goal world position
     * @param {Object} options - Optional settings
     * @param {boolean} options.smoothPath - If true, apply path smoothing (default: true)
     * @param {number} options.maxIterations - Max iterations before giving up (default: nodeCount)
     * @returns {Object} Result with path, success flag, and metrics
     */
    findPath(startPos, goalPos, options = {}) {
        const startTime = performance.now();
        const {
            smoothPath = true,
            maxIterations = this.nodeCount
        } = options;
        
        // Find nearest walkable nodes to start and goal
        const startNode = this.findNearestNode(startPos, true);
        const goalNode = this.findNearestNode(goalPos, true);
        
        // Check if start/goal are valid
        if (startNode.index < 0 || goalNode.index < 0) {
            return {
                success: false,
                path: [],
                nodeIndices: [],
                reason: startNode.index < 0 ? 'No walkable start node' : 'No walkable goal node',
                metrics: { timeMs: performance.now() - startTime, nodesExplored: 0 }
            };
        }
        
        // Same node - already at goal
        if (startNode.index === goalNode.index) {
            return {
                success: true,
                path: [startPos.clone(), goalPos.clone()],
                nodeIndices: [startNode.index],
                reason: 'Already at goal',
                metrics: { timeMs: performance.now() - startTime, nodesExplored: 1 }
            };
        }
        
        // A* data structures
        const openSet = new MinHeap(); // Priority queue by fScore
        const cameFrom = new Map();    // For path reconstruction
        const gScore = new Map();      // Cost from start to each node
        const fScore = new Map();      // gScore + heuristic
        const closedSet = new Set();   // Already evaluated
        
        // Initialize start node
        gScore.set(startNode.index, 0);
        fScore.set(startNode.index, this.greatCircleDistance(
            this.nodes.positions[startNode.index],
            this.nodes.positions[goalNode.index]
        ));
        openSet.push(startNode.index, fScore.get(startNode.index));
        
        let iterations = 0;
        let nodesExplored = 0;
        
        // A* Main Loop
        while (!openSet.isEmpty() && iterations < maxIterations) {
            iterations++;
            
            // Get node with lowest fScore
            const current = openSet.pop();
            nodesExplored++;
            
            // Goal reached!
            if (current === goalNode.index) {
                const nodePath = this._reconstructPath(cameFrom, current);
                let worldPath = nodePath.map(idx => this.nodes.positions[idx].clone());
                
                // Add actual start/goal positions
                worldPath.unshift(startPos.clone());
                worldPath.push(goalPos.clone());
                
                // Optional path smoothing
                if (smoothPath) {
                    worldPath = this._smoothPath(worldPath);
                }
                
                return {
                    success: true,
                    path: worldPath,
                    nodeIndices: nodePath,
                    reason: 'Path found',
                    metrics: {
                        timeMs: performance.now() - startTime,
                        nodesExplored,
                        pathLength: nodePath.length,
                        totalDistance: this._calculatePathDistance(worldPath)
                    }
                };
            }
            
            closedSet.add(current);
            
            // Explore neighbors
            const neighbors = this.nodes.neighbors[current];
            for (const neighbor of neighbors) {
                // Skip if already evaluated or not walkable
                if (closedSet.has(neighbor) || !this.nodes.walkable[neighbor]) {
                    continue;
                }
                
                // Calculate tentative gScore
                const edgeCost = this.nodes.positions[current].distanceTo(
                    this.nodes.positions[neighbor]
                );
                const tentativeG = gScore.get(current) + edgeCost;
                
                // Skip if we already have a better path to this neighbor
                if (gScore.has(neighbor) && tentativeG >= gScore.get(neighbor)) {
                    continue;
                }
                
                // This is the best path to neighbor so far
                cameFrom.set(neighbor, current);
                gScore.set(neighbor, tentativeG);
                
                // Heuristic: great-circle distance to goal
                const h = this.greatCircleDistance(
                    this.nodes.positions[neighbor],
                    this.nodes.positions[goalNode.index]
                );
                fScore.set(neighbor, tentativeG + h);
                
                // Add to open set (or update priority)
                if (!openSet.contains(neighbor)) {
                    openSet.push(neighbor, fScore.get(neighbor));
                } else {
                    openSet.updatePriority(neighbor, fScore.get(neighbor));
                }
            }
        }
        
        // No path found
        return {
            success: false,
            path: [],
            nodeIndices: [],
            reason: iterations >= maxIterations ? 'Max iterations reached' : 'No path exists',
            metrics: {
                timeMs: performance.now() - startTime,
                nodesExplored
            }
        };
    }
    
    /**
     * Reconstruct path from A* cameFrom map.
     */
    _reconstructPath(cameFrom, current) {
        const path = [current];
        while (cameFrom.has(current)) {
            current = cameFrom.get(current);
            path.unshift(current);
        }
        return path;
    }
    
    /**
     * Simple path smoothing using Catmull-Rom spline.
     * Increases point density for smoother movement.
     */
    _smoothPath(path) {
        if (path.length < 3) return path;
        
        // Create Catmull-Rom curve
        const curve = new THREE.CatmullRomCurve3(path, false, 'centripetal', 0.5);
        
        // Sample more points for smooth movement
        const numSamples = Math.max(path.length * 3, 20);
        const smoothed = curve.getPoints(numSamples);
        
        // Project each point back onto terrain surface
        return smoothed.map(p => {
            const dir = p.clone().normalize();
            const radius = this.terrain.getRadiusAt(dir);
            return dir.multiplyScalar(radius);
        });
    }
    
    /**
     * Calculate total path distance.
     */
    _calculatePathDistance(path) {
        let total = 0;
        for (let i = 1; i < path.length; i++) {
            total += path[i - 1].distanceTo(path[i]);
        }
        return total;
    }
    
    /**
     * Create THREE.Points mesh for debug visualization.
     */
    _createDebugMesh() {
        // Cleanup old
        if (this.debugMesh) {
            if (this.debugMesh.geometry) this.debugMesh.geometry.dispose();
            if (this.debugMesh.material) this.debugMesh.material.dispose();
        }
        
        const positions = new Float32Array(this.nodeCount * 3);
        const colors = new Float32Array(this.nodeCount * 3);
        
        const walkableColor = new THREE.Color(this.config.debugWalkableColor);
        const unwalkableColor = new THREE.Color(this.config.debugUnwalkableColor);
        
        for (let i = 0; i < this.nodeCount; i++) {
            const pos = this.nodes.positions[i];
            positions[i * 3] = pos.x;
            positions[i * 3 + 1] = pos.y;
            positions[i * 3 + 2] = pos.z;
            
            const color = this.nodes.walkable[i] ? walkableColor : unwalkableColor;
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }
        
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: this.config.debugPointSize,
            vertexColors: true,
            sizeAttenuation: true,
            depthTest: true,
            depthWrite: false,
            transparent: true,
            opacity: 0.8
        });
        
        this.debugMesh = new THREE.Points(geometry, material);
        this.debugMesh.visible = this.debugVisible;
        this.debugMesh.renderOrder = 100; // Render on top
        
        return this.debugMesh;
    }
    
    /**
     * Toggle debug visualization.
     */
    setDebugVisible(visible) {
        this.debugVisible = visible;
        if (this.debugMesh) {
            this.debugMesh.visible = visible;
        }
    }
    
    /**
     * Update debug colors (call after walkability changes).
     */
    updateDebugColors() {
        if (!this.debugMesh) return;
        
        const colors = this.debugMesh.geometry.attributes.color;
        const walkableColor = new THREE.Color(this.config.debugWalkableColor);
        const unwalkableColor = new THREE.Color(this.config.debugUnwalkableColor);
        
        for (let i = 0; i < this.nodeCount; i++) {
            const color = this.nodes.walkable[i] ? walkableColor : unwalkableColor;
            colors.setXYZ(i, color.r, color.g, color.b);
        }
        
        colors.needsUpdate = true;
    }
    
    /**
     * Get performance and debug info.
     */
    getMetrics() {
        return {
            ...this.metrics,
            nodeCount: this.nodeCount,
            configuredNodes: this.config.nodeCount,
            neighborDistance: this.config.neighborDistance
        };
    }
    
    /**
     * Regenerate with new node count or after terrain changes.
     */
    regenerate(newNodeCount = null) {
        if (newNodeCount !== null) {
            this.config.nodeCount = newNodeCount;
        }
        return this.generate();
    }
    
    /**
     * Mark a region as unwalkable (e.g., new obstacle placed).
     */
    markUnwalkableInRadius(center, radius) {
        const radiusSq = radius * radius;
        let count = 0;
        
        for (let i = 0; i < this.nodeCount; i++) {
            if (!this.nodes.walkable[i]) continue;
            
            if (this.nodes.positions[i].distanceToSquared(center) < radiusSq) {
                this.nodes.walkable[i] = false;
                count++;
            }
        }
        
        if (count > 0) {
            this.updateDebugColors();
            this.metrics.walkableCount -= count;
            this.metrics.unwalkableCount += count;
        }
        
        return count;
    }
    
    /**
     * Dispose all resources.
     */
    dispose() {
        if (this.debugMesh) {
            if (this.debugMesh.geometry) this.debugMesh.geometry.dispose();
            if (this.debugMesh.material) this.debugMesh.material.dispose();
            this.debugMesh = null;
        }
        
        this.nodes = { positions: [], directions: [], walkable: [], neighbors: [], slopeAngle: [], terrainHeight: [] };
        this.nodeCount = 0;
    }
}

/**
 * MinHeap - Binary heap for A* priority queue.
 * Optimized for pathfinding with O(log n) push/pop and O(n) priority update.
 */
class MinHeap {
    constructor() {
        this.heap = [];      // Array of {node, priority}
        this.nodeIndex = new Map(); // node -> index in heap for O(1) lookup
    }
    
    isEmpty() {
        return this.heap.length === 0;
    }
    
    contains(node) {
        return this.nodeIndex.has(node);
    }
    
    push(node, priority) {
        const entry = { node, priority };
        this.heap.push(entry);
        this.nodeIndex.set(node, this.heap.length - 1);
        this._bubbleUp(this.heap.length - 1);
    }
    
    pop() {
        if (this.isEmpty()) return null;
        
        const min = this.heap[0];
        const last = this.heap.pop();
        this.nodeIndex.delete(min.node);
        
        if (!this.isEmpty()) {
            this.heap[0] = last;
            this.nodeIndex.set(last.node, 0);
            this._bubbleDown(0);
        }
        
        return min.node;
    }
    
    updatePriority(node, newPriority) {
        if (!this.nodeIndex.has(node)) return;
        
        const idx = this.nodeIndex.get(node);
        const oldPriority = this.heap[idx].priority;
        this.heap[idx].priority = newPriority;
        
        if (newPriority < oldPriority) {
            this._bubbleUp(idx);
        } else {
            this._bubbleDown(idx);
        }
    }
    
    _bubbleUp(idx) {
        while (idx > 0) {
            const parentIdx = Math.floor((idx - 1) / 2);
            if (this.heap[parentIdx].priority <= this.heap[idx].priority) break;
            
            this._swap(idx, parentIdx);
            idx = parentIdx;
        }
    }
    
    _bubbleDown(idx) {
        const length = this.heap.length;
        
        while (true) {
            const leftIdx = 2 * idx + 1;
            const rightIdx = 2 * idx + 2;
            let smallest = idx;
            
            if (leftIdx < length && this.heap[leftIdx].priority < this.heap[smallest].priority) {
                smallest = leftIdx;
            }
            if (rightIdx < length && this.heap[rightIdx].priority < this.heap[smallest].priority) {
                smallest = rightIdx;
            }
            
            if (smallest === idx) break;
            
            this._swap(idx, smallest);
            idx = smallest;
        }
    }
    
    _swap(i, j) {
        [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
        this.nodeIndex.set(this.heap[i].node, i);
        this.nodeIndex.set(this.heap[j].node, j);
    }
}
