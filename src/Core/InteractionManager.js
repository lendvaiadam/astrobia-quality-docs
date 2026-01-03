import * as THREE from 'three';

/**
 * Manages all mouse/touch interactions strictly according to V3 Spec:
 * - One interaction per Mousedown-Mouseup cycle.
 * - Modes: SELECT, DESELECT, TERRAIN_DRAG, PATH_DRAW.
 */
export class InteractionManager {
    constructor(game) {
        this.game = game;
        this.domElement = game.renderer.domElement;

        // Configuration
        this.DRAG_THRESHOLD = 3; // pixels

        // State
        this.state = 'IDLE'; // IDLE, MOUSE_DOWN, DRAGGING_TERRAIN, DRAWING_PATH
        this.startMouse = new THREE.Vector2();
        this.currentMouse = new THREE.Vector2();
        this.mouseDownUnit = null; // Unit hit on mousedown
        this.mouseDownTerrain = null; // Terrain point hit on mousedown
        this.isLeftButton = false;

        this.hoveredUnit = null;

        // Raycaster
        this.raycaster = new THREE.Raycaster();
        this.mouseNDC = new THREE.Vector2();

        // Bindings
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onDblClick = this.onDblClick.bind(this);

        // Listeners
        // USE CAPTURE PHASE for MouseDown to intercept events before CameraController
        this.domElement.addEventListener('mousedown', this.onMouseDown, { capture: true });
        window.addEventListener('mousemove', this.onMouseMove); // Window for drag continuation
        window.addEventListener('mouseup', this.onMouseUp);
        this.domElement.addEventListener('dblclick', this.onDblClick);
    }

    onMouseDown(event) {
        // Ensure Audio Context is assumed
        if (this.game.audioManager) {
            this.game.audioManager.resumeContext();
        }

        // RMB Handling
        if (event.button === 2) {
            if (this.state === 'DRAWING_PATH') {
                // RMB during Path Draw = ATTACK COMMAND Logic
                event.stopImmediatePropagation(); // Block Camera Orbit
                this.isRightButtonInPathMode = true;

                // Show Attack Range Visualization?
                // User: "Jelenjen meg egy lőtávolság gömb...". 
                // We'll trigger this in MouseMove or just here?
                // For now, toggle "Attack Mode" pending click.
                return;
            }
            // Normal RMB (Orbit) - let it pass to CameraControls
            return;
        }

        if (event.button !== 0) return; // Only Left Button for Drag/Select
        this.isLeftButton = true;

        this.startMouse.set(event.clientX, event.clientY);
        this.currentMouse.copy(this.startMouse);

        // If we were already in DRAWING_PATH (from Shift+Select?), we continue?
        // Actually, DRAWING_PATH state usually resets on MouseUp unless Shift held?
        // Let's assume Drag initiates Drawing.

        this.state = 'MOUSE_DOWN';

        this.updateMouseNDC(event.clientX, event.clientY);

        // ... rest of logic ...

        // 0. Raycast Waypoint Markers (for dragging)
        const hitMarker = this.raycastWaypointMarker();
        if (hitMarker) {
            this.mouseDownMarker = hitMarker;
            this.mouseDownUnit = null;
            this.mouseDownTerrain = null;

            // PRIORITY: Stop camera controls from seeing this event
            event.stopImmediatePropagation();
            // event.preventDefault(); // Optional, but good practice to prevent text selection etc

            return;
        }

        // 1. Raycast Unit
        const hitUnit = this.raycastUnit();
        if (hitUnit) {
            this.mouseDownUnit = hitUnit;
            this.mouseDownTerrain = null;
            this.mouseDownMarker = null;
            // Potential Select or Path Draw
        } else {
            // 2. Raycast Terrain
            const hitTerrain = this.raycastTerrain();
            this.mouseDownUnit = null;
            this.mouseDownTerrain = hitTerrain;
            this.mouseDownMarker = null;
            // Potential Deselect or Terrain Drag
        }

        // Stop Camera Controller's default drag if we might draw path
        // Actually, we want to control Camera entirely if Terrain Drag.
        // For now, let's assume we call camera controls manually if needed.
        if (this.game.cameraControls) {
            // Disable default drag until we decide it IS a drag
            this.game.cameraControls.isLMBDown = false;
        }
    }

    raycastWaypointMarker() {
        const unit = this.game.selectedUnit;
        if (!unit || !unit.waypointMarkers || unit.waypointMarkers.length === 0) return null;

        this.raycaster.setFromCamera(this.mouseNDC, this.game.camera);
        const intersects = this.raycaster.intersectObjects(unit.waypointMarkers, false);

        if (intersects.length > 0) {
            return intersects[0].object;
        }
        return null;
    }

    onMouseMove(event) {
        // ALWAYS update hover if Idle
        this.updateMouseNDC(event.clientX, event.clientY);
        if (this.state === 'IDLE') {
            this.handleHover();
            return;
        }

        if (this.state === 'MOUSE_DOWN') {
            this.currentMouse.set(event.clientX, event.clientY);
            const dist = this.currentMouse.distanceTo(this.startMouse);

            if (dist > this.DRAG_THRESHOLD) {
                // DECISION POINT
                if (this.mouseDownMarker) {
                    // Drag on Marker -> Marker Drag
                    this.state = 'DRAGGING_MARKER';
                    console.log("Started dragging marker:", this.mouseDownMarker.userData.waypointNumber);
                } else if (this.mouseDownUnit) {
                    // Drag on Unit -> Path Draw
                    this.state = 'DRAWING_PATH';
                    this.game.startPathDrawing(this.mouseDownUnit); // Delegate to Game
                    // Ensure camera doesn't move
                } else if (this.mouseDownTerrain) {
                    // Drag on Terrain -> Terrain/Camera Drag
                    this.state = 'DRAGGING_TERRAIN';
                    // Enable Camera Pan?
                    // Or manually call pan.
                    // For System 4.0, we might need to tell it "Start Dragging Now".
                    if (this.game.cameraControls) {
                        this.game.cameraControls.startDrag(this.mouseDownTerrain);
                        this.game.cameraControls.isLMBDown = true; // Hand back control
                    }
                }
            }
        }

        // Handle active marker dragging
        if (this.state === 'DRAGGING_MARKER' && this.mouseDownMarker) {
            const hitPoint = this.raycastTerrain();
            if (hitPoint) {
                // Move marker to terrain hit point
                const dir = hitPoint.clone().normalize();
                const terrainRadius = this.game.planet.terrain.getRadiusAt(dir);
                const newPos = dir.multiplyScalar(terrainRadius);

                this.mouseDownMarker.position.copy(newPos);

                // Move label sprite too
                if (this.mouseDownMarker.userData.labelSprite) {
                    this.mouseDownMarker.userData.labelSprite.position.copy(newPos);
                }
            }
        }

        if (this.state === 'DRAWING_PATH') {
            // Update Path
            this.game.updatePathDrawing(this.mouseNDC);
        }

        if (this.state === 'DRAGGING_TERRAIN') {
            // Camera Controller handles this via its own listeners? 
            // Yes, CameraController listens to window.
            // But we disabled isLMBDown in onMouseDown.
            // So we enabled it back above. It should work.
        }
    }

    onMouseUp(event) {
        if (!this.isLeftButton) return;
        this.isLeftButton = false;

        if (this.state === 'MOUSE_DOWN') {
            // CLICK (No Drag)
            if (this.mouseDownMarker) {
                // Click on Marker - check if it's the START marker for path closure
                const unit = this.game.selectedUnit;
                if (this.mouseDownMarker.userData.isStartMarker &&
                    unit && unit.waypointControlPoints &&
                    unit.waypointControlPoints.length >= 3 &&
                    !unit.isPathClosed) {
                    // Close the path loop!
                    this.game.closePath();
                }
                // Clear marker reference (no drag happened)
                this.mouseDownMarker = null;
            } else if (this.mouseDownUnit) {
                // (1) Click on Unit -> SELECT ONLY (Don't fly)
                // User Request: "Ha bal gombbal kiválasztom a unitot, akkor nem kell mozgatni a kamerát"
                this.game.selectUnit(this.mouseDownUnit, true);
            } else if (this.mouseDownTerrain) {
                // (2) Click on Terrain
                if (event.shiftKey && this.game.selectedUnit) {
                    // Shift+Click -> ADD WAYPOINT
                    this.game.addWaypoint(this.mouseDownTerrain);
                } else {
                    // Normal Click -> DESELECT
                    this.game.deselectUnit();
                }
            } else {
                // No hit -> DESELECT
                this.game.deselectUnit();
            }
        } else if (this.state === 'DRAWING_PATH') {
            // Finish Path
            this.game.finishPathDrawing();
        } else if (this.state === 'DRAGGING_MARKER') {
            // Finished Marker Drag - update control point
            const unit = this.game.selectedUnit;
            if (this.mouseDownMarker && unit && unit.waypointControlPoints) {
                const cpIndex = this.mouseDownMarker.userData.controlPointIndex;
                const newPos = this.mouseDownMarker.position.clone();

                // Store unit's current state BEFORE path changes
                const unitCurrentPos = unit.position.clone();
                const wasFollowingPath = unit.isFollowingPath;

                // === SAVE ORIGINAL TARGET BEFORE PATH CHANGES ===
                // This is where the unit WAS heading - we must continue toward this direction
                let originalTargetPos = null;
                let originalVelocityDir = null;
                if (wasFollowingPath && unit.path && unit.pathIndex !== undefined && unit.path[unit.pathIndex]) {
                    originalTargetPos = unit.path[unit.pathIndex].clone();
                    originalVelocityDir = unit.velocityDirection
                        ? unit.velocityDirection.clone().normalize()
                        : originalTargetPos.clone().sub(unitCurrentPos).normalize();
                }

                // Update control point
                if (cpIndex >= 0 && cpIndex < unit.waypointControlPoints.length) {
                    unit.waypointControlPoints[cpIndex] = newPos;

                    // CRITICAL FIX: Update persistent waypoint data used by Unit.js logic!
                    // Without this, the Unit flies to New Pos but checks dist against Old Pos.
                    if (unit.waypoints && unit.waypoints[cpIndex]) {
                        unit.waypoints[cpIndex].position = newPos;
                    }

                    // === ROBUST ID-BASED TARGETING ===
                    // 1. Identify Target Waypoint ID
                    // If we don't have a locked target, derive it from current position
                    if (!unit.targetWaypointId && unit.pathSegmentIndices) {
                        // Find segment we are in
                        let cpIndex = 0;
                        for (let i = 0; i < unit.pathSegmentIndices.length; i++) {
                            if (unit.pathSegmentIndices[i] > unit.pathIndex) {
                                cpIndex = i;
                                break;
                            }
                        }
                        // Target is the END of this segment (so cpIndex)
                        // Verify bounds
                        if (cpIndex >= unit.waypoints.length) cpIndex = 0;

                        // Set persistent ID
                        if (unit.waypoints[cpIndex]) {
                            unit.targetWaypointId = unit.waypoints[cpIndex].id;
                        }
                    }

                    // 2. Regenerate Path (Updates positions, keeps IDs)
                    unit.lastCommittedControlPointCount = 0;
                    unit.path = [];
                    this.game.updateWaypointCurve();

                    // 3. Find Target on NEW Path using ID
                    if (wasFollowingPath && unit.path && unit.path.length > 0 && unit.targetWaypointId) {

                        // Find index of our target ID in the new waypoint list
                        // (It might have moved index if reordered, but here we just coordinate change)
                        let targetCPIndex = unit.waypoints.findIndex(wp => wp.id === unit.targetWaypointId);

                        // If persistent ID not found (deleted?), fallback to numeric index mapping or closest
                        if (targetCPIndex === -1) {
                            targetCPIndex = (unit.targetControlPointIndex || 1) % unit.waypoints.length;
                        }

                        if (targetCPIndex !== -1 && unit.pathSegmentIndices) {
                            // Get start of that segment on the dense path
                            let startIdx = 0;
                            let endIdx = unit.pathSegmentIndices[targetCPIndex];

                            // Find start of segment (index of previous CP)
                            let prevCPIndex = (targetCPIndex - 1 + unit.waypoints.length) % unit.waypoints.length;
                            if (unit.pathSegmentIndices[prevCPIndex] !== undefined) {
                                startIdx = unit.pathSegmentIndices[prevCPIndex];
                            }

                            // Handle wrap
                            const checkIndices = [];
                            if (endIdx < startIdx) {
                                for (let i = startIdx; i < unit.path.length; i++) checkIndices.push(i);
                                for (let i = 0; i <= endIdx; i++) checkIndices.push(i);
                            } else {
                                for (let i = startIdx; i <= endIdx; i++) checkIndices.push(i);
                            }

                            // Find best forward point in this segment
                            let bestMergeIdx = endIdx;
                            let bestDist = Infinity;
                            const unitForward = unit.velocityDirection ? unit.velocityDirection.clone().normalize() : unit.position.clone().sub(unit.lastPosition).normalize();

                            // Heuristic: shortest distance that is also in front
                            for (const idx of checkIndices) {
                                const pt = unit.path[idx];
                                if (!pt) continue;
                                const toPt = pt.clone().sub(unit.position).normalize();
                                const dot = toPt.dot(unitForward);
                                const dist = pt.distanceTo(unit.position);

                                if (dot > 0.0 && dist < bestDist) {
                                    bestDist = dist;
                                    bestMergeIdx = idx;
                                }
                            }

                            // Fallback to endIdx if no forward point found
                            if (bestDist === Infinity) bestMergeIdx = endIdx;

                            // 4. Generate Simple Transition Arc for smooth rejoin
                            // Create a Bezier-like arc from current position to merge point
                            const arcPoints = [];
                            const mergePoint = unit.path[bestMergeIdx];
                            if (mergePoint && unit.velocityDirection) {
                                const segmentCount = 15;
                                const currentPos = unit.position.clone();
                                const terrainRadius = this.game.planet.terrain.params.radius || 100;

                                // Control point: extend current velocity direction
                                const extendDist = currentPos.distanceTo(mergePoint) * 0.4;
                                const controlPt = currentPos.clone().addScaledVector(
                                    unit.velocityDirection.clone().normalize(), extendDist
                                );

                                // Generate arc using quadratic Bezier
                                for (let i = 0; i <= segmentCount; i++) {
                                    const t = i / segmentCount;
                                    const oneMinusT = 1 - t;

                                    // Quadratic Bezier: B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
                                    const pt = currentPos.clone().multiplyScalar(oneMinusT * oneMinusT)
                                        .add(controlPt.clone().multiplyScalar(2 * oneMinusT * t))
                                        .add(mergePoint.clone().multiplyScalar(t * t));

                                    // Project to terrain surface
                                    const dir = pt.normalize();
                                    const r = this.game.planet.terrain.getRadiusAt(dir);
                                    arcPoints.push(dir.multiplyScalar(r + (unit.groundOffset || 0.5)));
                                }

                                // Set transition arc on unit
                                if (arcPoints.length > 0) {
                                    unit.transitionPath = arcPoints;
                                    unit.transitionIndex = 0;
                                    unit.isInTransition = true;
                                    unit.isFollowingPath = true; // CRITICAL: Ensure unit continues moving
                                    unit.pathIndex = bestMergeIdx + 1; // Resume after merge point
                                    console.log('[Transition] Created arc with', arcPoints.length, 'points');
                                }
                            }


                            // Just ensure manual panel update if needed
                        }
                    } else {
                        // Unit was NOT following path (stationary at a station, possibly waiting)
                        // After dragging a waypoint, start moving again
                        if (unit.path && unit.path.length > 0) {
                            unit.isFollowingPath = true;
                            unit.waitTimer = 0; // CRITICAL: Cancel any active wait timer
                            unit.pathIndex = 0; // Start from beginning of path
                            console.log('[MarkerDrag] Unit was stationary, canceling wait, starting path from index 0');
                        }
                    }

                    // Update panel if open
                    if (this.game.isFocusMode && this.game.focusedUnit) {
                        this.game.updatePanelContent(this.game.focusedUnit);
                    }

                    console.log("Marker dragged to new position:", newPos, "CP index:", cpIndex);
                }
            }
            this.mouseDownMarker = null;
        } else if (this.state === 'DRAGGING_TERRAIN') {
            // Finished Drag
            if (this.game.cameraControls) {
                this.game.cameraControls.onMouseUp(event); // Ensure it stops
                this.game.cameraControls.isLMBDown = false;
            }
        }

        this.state = 'IDLE';
        this.mouseDownUnit = null;
        this.mouseDownTerrain = null;
    }

    onDblClick(event) {
        // Phase 2: Double click on unit
        this.updateMouseNDC(event.clientX, event.clientY);
        const hitUnit = this.raycastUnit();
        if (hitUnit) {
            this.game.onUnitDoubleClicked(hitUnit);
        }
    }

    // --- Helpers ---

    updateMouseNDC(clientX, clientY) {
        this.mouseNDC.x = (clientX / window.innerWidth) * 2 - 1;
        this.mouseNDC.y = -(clientY / window.innerHeight) * 2 + 1;
    }

    raycastUnit() {
        this.raycaster.setFromCamera(this.mouseNDC, this.game.camera);
        const unitMeshes = this.game.units.filter(u => u && u.mesh).map(u => u.mesh);
        const intersects = this.raycaster.intersectObjects(unitMeshes, true);
        if (intersects.length > 0) {
            // Find parent Unit object
            const hitObject = intersects[0].object;
            return this.game.units.find(u => {
                let current = hitObject;
                while (current) {
                    if (current === u.mesh) return true;
                    current = current.parent;
                }
                return false;
            });
        }
        return null;
    }

    raycastTerrain() {
        this.raycaster.setFromCamera(this.mouseNDC, this.game.camera);
        const intersects = this.raycaster.intersectObject(this.game.planet.mesh, false);
        if (intersects.length > 0) return intersects[0].point;
        return null;
    }

    handleHover() {
        // 1. Raycast Unit (Direct Hit)
        let hitUnit = this.raycastUnit();

        // 2. Raycast Waypoint Marker (Direct Hit)
        let hitMarker = null;
        if (!hitUnit && this.game.selectedUnit) {
            hitMarker = this.raycastWaypointMarker();
        }

        // 3. Proximity Check (Screen Space) - Backup if no direct hit
        if (!hitUnit && !hitMarker) {
            const hoverRadiusScreen = 30; // Pixel radius
            let closestDist = Infinity;

            this.game.units.forEach(unit => {
                if (!unit) return;
                // Project unit position to screen space
                const screenPos = unit.position.clone().project(this.game.camera);
                const screenX = (screenPos.x + 1) / 2 * window.innerWidth;
                const screenY = (-screenPos.y + 1) / 2 * window.innerHeight;

                // Get mouse position in screen space
                const mouseX = (this.mouseNDC.x + 1) / 2 * window.innerWidth;
                const mouseY = (-this.mouseNDC.y + 1) / 2 * window.innerHeight; // Fixed variable usage

                const dist = Math.sqrt((screenX - mouseX) ** 2 + (screenY - mouseY) ** 2);

                if (dist < hoverRadiusScreen && dist < closestDist) {
                    closestDist = dist;
                    hitUnit = unit;
                }
            });
        }

        // === HANDLE MARKER HIGHLIGHT ===
        // Reset previous marker highlight
        if (this.hoveredMarker && this.hoveredMarker !== hitMarker) {
            // Restore scale
            this.hoveredMarker.scale.set(1, 1, 1);
            // Restore color/emissive if needed (though color is state-based)
            this.hoveredMarker = null;
        }

        if (hitMarker) {
            // Apply Highlight
            if (this.hoveredMarker !== hitMarker) {
                hitMarker.scale.set(1.5, 1.5, 1.5); // Pulse effect
                this.hoveredMarker = hitMarker;
            }

            // Treat marker hover as Unit Interaction -> Find owner unit
            // If marker has unitId, find that unit. Or assume selectedUnit.
            const unitId = hitMarker.userData.unitId;
            const ownerUnit = this.game.units.find(u => u.id === unitId) || this.game.selectedUnit;

            if (ownerUnit) {
                hitUnit = ownerUnit; // Override hitUnit so we trigger stop/highlight on owner
            }
        }

        // === HANDLE UNIT HIGHLIGHT/STOP ===
        if (hitUnit !== this.hoveredUnit) {
            // Clear previous hover
            if (this.hoveredUnit) {
                this.hoveredUnit.setHighlight(false);
                // Resume movement (smoothly via setHover)
                this.hoveredUnit.setHover(false);

                // Hide path visualization if not selected
                if (this.hoveredUnit !== this.game.selectedUnit) {
                    this.game.hideUnitMarkers(this.hoveredUnit);
                } else {
                    // Restore selected opacity (40%)
                    if (this.hoveredUnit.waypointCurveLine) {
                        this.hoveredUnit.waypointCurveLine.material.opacity = 0.4;
                    }
                }
            }

            // Set new hover
            if (hitUnit) {
                hitUnit.setHighlight(true);

                // ONLY stop unit if it's AUTO-FOLLOWING a path
                // Don't block manual keyboard control
                // User Request: Stop even if hovering waypoint (handled by hitMarker->hitUnit logic above)
                if (hitUnit.isFollowingPath && !hitUnit.isKeyboardOverriding) {
                    hitUnit.setHover(true);
                }

                // Show path visualization when hovering
                if (hitUnit.path && hitUnit.path.length > 0) {
                    this.game.showUnitMarkers(hitUnit);
                }

                // Set hover opacity (20%) - dimmer than selected
                if (hitUnit.waypointCurveLine && hitUnit !== this.game.selectedUnit) {
                    hitUnit.waypointCurveLine.material.opacity = 0.2;
                }
            }
            this.hoveredUnit = hitUnit;
        } else if (hitUnit) {
            // Already hovering handling - ensure stop persists if we transiently switched from Unit to Marker
            if (hitUnit.isFollowingPath && !hitUnit.isKeyboardOverriding) {
                hitUnit.setHover(true);
            }
        }
    }
}
