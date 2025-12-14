import * as THREE from 'three';
import { SphericalMath } from '../Math/SphericalMath.js';

export class Unit {
    constructor(planet) {
        this.planet = planet;
        this.speed = 5.0;
        this.speed = 5.0;
        this.turnSpeed = 2.0;
        this.groundOffset = 0.5; // Height above terrain
        this.smoothingRadius = 2.0; // Radius for normal averaging
        
        // Speed control for hover slowdown
        this.speedFactor = 1.0; // Start at full speed
        this.hoverState = false;
        
        // Water capabilities (for future use)
        this.canWalkUnderwater = false; // Can walk on sea floor
        this.canSwim = false; // Can swim on water surface
        
        // Water reaction state machine
        // States: 'normal', 'wading', 'escaping', 'shaking', 'backing', 'stopped'
        this.waterState = 'normal';
        this.waterSlowdownFactor = 1.0;
        this.waterShakeTimer = 0;
        this.waterBackupTimer = 0;
        this.waterWadeTimer = 0; // Time spent wading in water
        this.waterEntryPosition = null; // Position where we entered water
        
        this.mesh = this.createMesh();
        
        // State
        // Start at North Pole for simplicity, or any point
        this.position = new THREE.Vector3(0, 10, 0); 
        
        // Initial Orientation: Up aligned with Y (Normal at pole), Forward aligned with Z
        this.quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0);
        
        // Align to initial surface
        this.snapToSurface();
        this.alignToSurfaceInitial();
        
        // === PER-UNIT COMMAND QUEUE (Independent waypoints) ===
        this.waypointControlPoints = [];
        this.waypointMarkers = [];
        this.waypointCurveLine = null;
        this.loopingEnabled = false;
        this.isPathClosed = false;
        this.lastCommittedControlPointCount = 0;
        this.passedControlPointCount = 0;
        
        // === SEGMENT-BASED PATH TRACKING (NEW) ===
        // Track position as: which segment (A→B) and progress (0-1) within it
        this.currentSegmentIndex = 0;  // Index of START control point of current segment
        this.segmentProgress = 0.0;    // 0.0 = at segment start, 1.0 = at segment end
        this.lastControlPointIds = []; // Cache of control point IDs for change detection
        
        // === TERRAIN-PROJECTED SELECTION RING ===
        this.selectionRingRadius = 2.5;  // World units from unit center
        this.selectionRingSegments = 48; // Ring resolution
        this.terrainRing = null;         // THREE.Mesh - created on demand
        this.terrainRingMaterial = null;
        
        // === KEYBOARD OVERRIDE SYSTEM ===
        // When user takes manual control, save path state for later resume
        this.savedPath = null;           // Saved path when keyboard takes over
        this.savedPathIndex = 0;         // Where we were on the path
        this.keyboardOverrideTimer = 0;  // Time since last keyboard input (4s to resume)
        this.isKeyboardOverriding = false; // Currently being controlled by keyboard
        
        // Unit identity
        this.id = Math.floor(Math.random() * 10000);
        this.name = `Unit ${this.id}`;
    }

    createMesh() {
        const group = new THREE.Group();

        // 1. Main Body (Cone)
        const coneGeo = new THREE.ConeGeometry(0.3, 1, 8);
        const geo = coneGeo.clone(); // Clone to manipulating
        geo.rotateX(Math.PI / 2); // Point Z+
        geo.translate(0, 0.3, 0);

        this.bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        const body = new THREE.Mesh(geo, this.bodyMaterial);
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);
        
        // CONTACT SHADOW (Blob shadow directly under unit to prevent "floating" look)
        const contactShadowGeo = new THREE.CircleGeometry(0.6, 32);
        contactShadowGeo.rotateX(-Math.PI / 2); // Flat on ground
        const contactShadowMat = new THREE.ShaderMaterial({
            uniforms: {},
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                varying vec2 vUv;
                void main() {
                    // Soft radial falloff from center
                    float dist = length(vUv - vec2(0.5, 0.5)) * 2.0;
                    float alpha = smoothstep(1.0, 0.0, dist) * 0.5; // Max 50% opacity at center
                    gl_FragColor = vec4(0.0, 0.0, 0.0, alpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide
        });
        this.contactShadow = new THREE.Mesh(contactShadowGeo, contactShadowMat);
        this.contactShadow.position.y = 0.02; // Just above terrain to avoid z-fighting
        this.contactShadow.renderOrder = -1; // Render before other elements
        group.add(this.contactShadow);
        
        // 2. Selection Ring
        const ringGeo = new THREE.RingGeometry(0.8, 0.9, 32);
        ringGeo.rotateX(-Math.PI / 2); // Flat on ground (Local X-Z plane)
        
        // Highlight Ring (Thin, Faint)
        this.highlightMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffaa00, 
            transparent: true, 
            opacity: 0.0, // Hidden by default
            side: THREE.DoubleSide 
        });
        this.highlightRing = new THREE.Mesh(ringGeo, this.highlightMaterial);
        this.highlightRing.position.y = 0.05;
        group.add(this.highlightRing);
        
        // 3. Selection Spotlight (Cone of light from above - projects ring on terrain)
        this.spotLight = new THREE.SpotLight(0x00ff88, 0.0); // Start off
        this.spotLight.angle = Math.PI / 3; // 60 degrees - wider light cone for visible ring
        this.spotLight.penumbra = 0.5; // Softer edge
        this.spotLight.distance = 25; // Longer range
        this.spotLight.decay = 1.5;
        this.spotLight.position.set(0, 8, 0); // Higher above unit for wider spread
        this.spotLight.castShadow = true; // Enable shadow for terrain lighting effect
        this.spotLight.shadow.mapSize.width = 512;
        this.spotLight.shadow.mapSize.height = 512;
        this.spotLight.shadow.camera.near = 0.5;
        this.spotLight.shadow.camera.far = 25;
        // Target needs to be added to scene or hierarchy to work correctly
        this.spotLight.target.position.set(0, 0, 0);
        
        group.add(this.spotLight);
        group.add(this.spotLight.target);
        
        // 4. Glow Ring (Pulsating on ground - visible "spotlight" effect)
        // Large enough to create a noticeable ring around the unit
        const glowGeo = new THREE.RingGeometry(1.5, 3.5, 64);
        glowGeo.rotateX(-Math.PI / 2);
        this.glowMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ff88,
            transparent: true, 
            opacity: 0.0,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending, // Glow effect
            depthWrite: false // Avoid z-fighting with terrain
        });
        this.glowRing = new THREE.Mesh(glowGeo, this.glowMaterial);
        this.glowRing.position.y = 0.1; // Slightly higher to avoid z-fighting
        group.add(this.glowRing);
        
        // 5. HEADLIGHTS (Front spotlights that cast shadows)
        this.headlightLeft = new THREE.SpotLight(0xffffee, 3.0); // Warm white
        this.headlightLeft.angle = Math.PI / 8; // Narrow beam
        this.headlightLeft.penumbra = 0.5;
        this.headlightLeft.distance = 15; // Effective range
        this.headlightLeft.decay = 2.0;
        this.headlightLeft.castShadow = true;
        this.headlightLeft.shadow.mapSize.width = 512;
        this.headlightLeft.shadow.mapSize.height = 512;
        this.headlightLeft.shadow.camera.near = 0.1;
        this.headlightLeft.shadow.camera.far = 15;
        this.headlightLeft.position.set(-0.2, 0.3, 0.5); // Front-left of vehicle
        this.headlightLeft.target.position.set(-0.2, 0.0, 5); // Aim forward
        group.add(this.headlightLeft);
        group.add(this.headlightLeft.target);
        
        this.headlightRight = new THREE.SpotLight(0xffffee, 3.0);
        this.headlightRight.angle = Math.PI / 8;
        this.headlightRight.penumbra = 0.5;
        this.headlightRight.distance = 15;
        this.headlightRight.decay = 2.0;
        this.headlightRight.castShadow = true;
        this.headlightRight.shadow.mapSize.width = 512;
        this.headlightRight.shadow.mapSize.height = 512;
        this.headlightRight.shadow.camera.near = 0.1;
        this.headlightRight.shadow.camera.far = 15;
        this.headlightRight.position.set(0.2, 0.3, 0.5); // Front-right
        this.headlightRight.target.position.set(0.2, 0.0, 5);
        group.add(this.headlightRight);
        group.add(this.headlightRight.target);
        
        this.selectionIntensity = 0.0; // 0 to 1 smooth transition state
        this.timeAccumulator = 0.0; // For pulsing
        
        // Hover & Speed Smooth
        this.hoverState = false;
        this.speedFactor = 1.0; // 0.0 (Stopped) to 1.0 (Full Speed)
        this.pausedByCommand = false; // Manual Pause (Stop Button or Manual Steer)

        return group;
    }

    setHover(state) {
        this.hoverState = state;
        this.isHovered = state; // Track hover state for visuals
        
        // STRONG HOVER HIGHLIGHT (brighter than selection)
        if (this.bodyMaterial) {
            if (state && !this.isSelected) {
                // Hover = bright white highlight
                this.bodyMaterial.emissive = new THREE.Color(0xffffff);
                this.bodyMaterial.emissiveIntensity = 2.0;
            } else if (!state && !this.isSelected) {
                // No hover, no selection = no glow
                this.bodyMaterial.emissiveIntensity = 0;
            }
            // If selected, updateSelectionVisuals handles the glow
        }
        
        // Show/hide highlight ring
        if (this.highlightMaterial) {
            this.highlightMaterial.opacity = (state && !this.isSelected) ? 0.6 : 0.0;
        }
    }
    
    setCommandPause(paused) {
        this.pausedByCommand = paused;
        // If unpaused, ensure we are in path following mode if path exists
        if (!paused && this.path) {
            this.isFollowingPath = true;
        }
    }

    alignToSurfaceInitial() {
        // If mesh is Group, we rotate the Group
        const normal = this.position.clone().normalize();
        const up = new THREE.Vector3(0, 1, 0);
        const q = new THREE.Quaternion().setFromUnitVectors(up, normal);
        this.mesh.quaternion.copy(q);
    }

    setHighlight(active) {
        // This is now handled by setHover for consistency
        if (this.isSelected) return; // Selection overrides highlight
        if (this.highlightMaterial) {
            this.highlightMaterial.opacity = active ? 0.4 : 0.0;
        }
    }

    setSelection(active) {
        this.isSelected = active;
        // Selection visuals handled in update() for smooth transition
    }

    updateSelectionVisuals(dt) {
        const targetIntensity = this.isSelected ? 1.0 : 0.0;
        
        // Smooth transition (Ease-out)
        const lerpSpeed = this.isSelected ? 5.0 : 3.0;
        this.selectionIntensity = THREE.MathUtils.lerp(this.selectionIntensity, targetIntensity, dt * lerpSpeed);
        
        if (this.selectionIntensity < 0.01) {
            this.spotLight.intensity = 0;
            this.glowMaterial.opacity = 0;
            this.bodyMaterial.emissiveIntensity = 0;
            this.glowRing.visible = false;
            // Hide terrain ring
            if (this.terrainRing) this.terrainRing.visible = false;
            return;
        }
        
        this.glowRing.visible = true;
        this.timeAccumulator += dt;
        
        // Pulse Logic (Sine wave)
        // Frequency: 2.0 Hz
        const pulse = (Math.sin(this.timeAccumulator * 4.0) * 0.5 + 0.5); // 0 to 1
        
        // 1. Spotlight Intensity - Projects visible ring on terrain
        const spotMax = 60.0; // Increased for visible terrain fénykarika
        this.spotLight.intensity = this.selectionIntensity * (spotMax * 0.7 + spotMax * 0.3 * pulse);
        
        // 2. Glow Ring Opacity - VISIBLE selection ring
        const ringOpacity = 0.5 + 0.3 * pulse; // Increased for visible selection ring
        this.glowMaterial.opacity = this.selectionIntensity * ringOpacity;
        
        // 3. Unit Emissive Glow - SUBTLE with tab accent color (green)
        if (this.bodyMaterial) {
             this.bodyMaterial.emissive = new THREE.Color(0x00ff9d); // Tab accent green
             this.bodyMaterial.emissiveIntensity = this.selectionIntensity * (0.5 + 0.3 * pulse); // Reduced
        }
        
        // 4. PULSING GLOW (simpler effect, spotlight casts light on terrain)
        this.updateSelectionGlow(pulse);
        
        // Hide highlight ring if selected/transitioning
        if (this.highlightMaterial) {
            this.highlightMaterial.opacity = 0.0;
        }
    }
    
    /**
     * Enhanced selection glow - uses spotlight to cast light on terrain around unit.
     * No complex terrain ring, just pulsing glow and light projection.
     */
    updateSelectionGlow(pulse) {
        // The spotlight already casts light on the terrain around the unit
        // Just ensure it's positioned correctly above the unit
        if (this.spotLight) {
            // Position spotlight above unit in local space (already done in createMesh)
            // Intensity is already pulsed in updateSelectionVisuals
        }
        
        // The glowRing is a flat ring that follows the unit
        // It provides the visual "glow" effect at the unit's feet
        if (this.glowRing) {
            // Scale the glow ring slightly with pulse for breathing effect
            const scale = 1.0 + 0.1 * pulse;
            this.glowRing.scale.set(scale, 1, scale);
        }
        
        // Remove terrain ring if it exists (we're not using it anymore)
        if (this.terrainRing) {
            const scene = this.mesh.parent;
            if (scene) {
                scene.remove(this.terrainRing);
                this.terrainRing.geometry.dispose();
                this.terrainRingMaterial.dispose();
            }
            this.terrainRing = null;
            this.terrainRingMaterial = null;
        }
    }

    setPath(points) {
        // Smart Path Update (No Backtracking)
        // If unit is already past start, don't reset index to 0.
        
        if (!points || points.length === 0) return;
        
        let closestIndex = 0;
        let minDist = Infinity;
        
        // Find closest point on NEW path
        for (let i = 0; i < points.length; i++) {
            const d = this.position.distanceToSquared(points[i]);
            if (d < minDist) {
                minDist = d;
                closestIndex = i;
            }
        }
        
        // If we are strictly "between" two points, we want the next one.
        // Heuristic: Set target to Closest + 1.
        // Limit to end of path.
        // Exception: If closest is 0 (Start), target 1.
        let nextIndex = closestIndex + 1;
        if (nextIndex >= points.length) nextIndex = points.length - 1;
        
        this.path = points;
        this.pathIndex = nextIndex;
        
        this.isFollowingPath = true;
        this.pausedByCommand = false;
        
        console.log(`Path Set. Closest Node: ${closestIndex}, Next Target: ${this.pathIndex}`);
    }

    steerTowards(point) {
        this.steerTarget = point;
        this.isSteering = true;
        this.path = null; // Override path
    }

    stopSteering() {
        this.isSteering = false;
        this.steerTarget = null;
    }

    update(input, dt) {
        // Selection Visuals
        if (this.isSelected || this.selectionIntensity > 0.01) {
            this.updateSelectionVisuals(dt);
        }

        const turnSpeed = this.turnSpeed * dt;
        
        // Hover Speed Logic (Easy In / Easy Out)
        // If hovered, target factor is 0.0. If not, 1.0.
        const targetFactor = this.hoverState ? 0.0 : 1.0;
        // Smoothly interpolate factor - FAST stop (8.0), slower resume (4.0)
        const lerpSpeed = this.hoverState ? 8.0 : 4.0;
        this.speedFactor = THREE.MathUtils.lerp(this.speedFactor, targetFactor, dt * lerpSpeed);
        
        // Effective Speed
        let moveSpeed = (this.speed || 10) * dt * this.speedFactor * this.waterSlowdownFactor;
        
        // If "effectively stopped", clamp to 0 to avoid micro-movements
        if (this.speedFactor < 0.05 && this.hoverState) {
             moveSpeed = 0;
             this.speedFactor = 0; // Snap to fully stopped
        }

        let autoTurn = 0;
        let autoMove = 0;



        // Path Following Logic - SIMPLE SEQUENTIAL
        // Just follow the dense path array point by point, wrap around for closed paths
        if (this.path && this.path.length > 0 && this.isFollowingPath && !this.pausedByCommand) {
            // Initialize path index if needed
            if (this.pathIndex === undefined || this.pathIndex < 0) this.pathIndex = 0;
            if (this.pathIndex >= this.path.length) {
                this.pathIndex = (this.loopingEnabled || this.isPathClosed) ? 0 : this.path.length - 1;
            }
            
            // Calculate remaining distance we can travel this frame
            let remainingMove = moveSpeed;
            
            // END-OF-PATH SLOWDOWN (Only for non-looping paths)
            if (!this.loopingEnabled && !this.isPathClosed) {
                const remainingPoints = this.path.length - this.pathIndex;
                const slowdownZone = Math.min(30, this.path.length * 0.2);
                if (remainingPoints < slowdownZone) {
                    const slowdownFactor = Math.max(0.1, remainingPoints / slowdownZone);
                    remainingMove *= slowdownFactor;
                }
            }
            
            // Get water level for path checking
            const waterLevel = this.planet.terrain.params.waterLevel || 0;
            const baseRadius = this.planet.terrain.params.radius || 10;
            const pathWaterRadius = baseRadius + waterLevel;
            const canEnterWater = this.canWalkUnderwater || this.canSwim;
            
            // SIMPLE FORWARD MOVEMENT along the path
            let iterations = 0;
            const maxIterations = 100; // Safety limit
            
            while (remainingMove > 0 && this.waterState === 'normal' && iterations < maxIterations) {
                iterations++;
                
                // Bounds check
                if (this.pathIndex >= this.path.length) {
                    if (this.loopingEnabled || this.isPathClosed) {
                        this.pathIndex = 0;
                        // console.log("Path looping - starting new cycle");
                    } else {
                        this.isFollowingPath = false;
                        this.pathIndex = this.path.length - 1;
                        // console.log("Path completed");
                        break;
                    }
                }
                
                const currentTarget = this.path[this.pathIndex];
                if (!currentTarget) break;
                
                // CHECK IF TARGET IS UNDERWATER
                const targetDir = currentTarget.clone().normalize();
                const targetTerrainRadius = this.planet.terrain.getRadiusAt(targetDir);
                const targetIsUnderwater = targetTerrainRadius < pathWaterRadius;
                
                if (targetIsUnderwater && !canEnterWater) {
                    console.log("Path leads to water! Stopping and backing up!");
                    this.waterState = 'backing';
                    this.waterBackupTimer = 0;
                    this.waterShakeTimer = 1.2;
                    this.waterShakeCount = 4 + Math.floor(Math.random() * 7);
                    this.isFollowingPath = false;
                    break;
                }
                
                const distToTarget = this.position.distanceTo(currentTarget);
                
                if (distToTarget <= remainingMove) {
                    // Reached this point, move to next
                    this.position.copy(currentTarget);
                    remainingMove -= distToTarget;
                    this.pathIndex++;
                } else {
                    // Move towards target
                    const dir = currentTarget.clone().sub(this.position).normalize();
                    this.position.addScaledVector(dir, remainingMove);
                    remainingMove = 0;
                }
            }
            
            // ORIENTATION: Use CURVE TANGENT from current and next path point
            // Look ahead to next point(s) for smooth tangent
            let lookAhead = this.pathIndex + 3;
            if (lookAhead >= this.path.length && (this.loopingEnabled || this.isPathClosed)) {
                lookAhead = lookAhead % this.path.length;
            } else {
                lookAhead = Math.min(lookAhead, this.path.length - 1);
            }
            
            let tangent = new THREE.Vector3();
            
            if (this.path[lookAhead]) {
                // Tangent is direction from current position to look-ahead point
                tangent = this.path[lookAhead].clone().sub(this.position).normalize();
            } else if (this.pathIndex < this.path.length && this.path[this.pathIndex]) {
                // Use current target direction
                tangent = this.path[this.pathIndex].clone().sub(this.position).normalize();
            }
            
            // Project tangent onto SPHERE surface plane (for pure Heading)
            // Visual tilt is handled at the end of update()
            const sphereNormal = this.position.clone().normalize();
            const projectedTangent = tangent.clone().sub(
                sphereNormal.clone().multiplyScalar(tangent.dot(sphereNormal))
            ).normalize();
            
            if (projectedTangent.lengthSq() > 0.01) {
                // Build orientation from Sphere Normal (up) and curve tangent (forward)
                const up = sphereNormal;
                const forward = projectedTangent;
                const right = new THREE.Vector3().crossVectors(up, forward).normalize();
                
                // Re-orthogonalize forward
                const orthoForward = new THREE.Vector3().crossVectors(right, up).normalize();
                
                // Build rotation matrix
                const m = new THREE.Matrix4().makeBasis(right, up, orthoForward);
                const targetHeading = new THREE.Quaternion().setFromRotationMatrix(m);
                
                // SET headingQuaternion directly (not just slerp) for proper curve following
                this.headingQuaternion.copy(targetHeading);
            }
            
            // Skip normal movement
            autoMove = 0;
            autoTurn = 0;
        } else if (this.path && this.path.length > 0) {
            // Legacy steering-based path following (fallback)
            const target = this.path[0];
            const dist = this.position.distanceTo(target);
            
            if (dist < 1.0) {
                this.path.shift();
            } else {
                const basis = SphericalMath.getBasis(this.headingQuaternion);
                const toTarget = target.clone().sub(this.position).normalize();
                const up = basis.up;
                const tangentTarget = toTarget.clone().sub(up.clone().multiplyScalar(toTarget.dot(up))).normalize();
                const forward = basis.forward;
                const right = basis.right;
                const dot = forward.dot(tangentTarget);
                const cross = right.dot(tangentTarget);
                
                if (Math.abs(cross) > 0.05) autoTurn = Math.sign(cross);
                if (dot > -0.3) autoMove = 1;
            }
        }
        
        // Manual Steering Logic (Mouse Hold)
        if (this.isSteering && this.steerTarget) {
            const target = this.steerTarget;
            // Calculate steering
            const basis = SphericalMath.getBasis(this.headingQuaternion);
            const toTarget = target.clone().sub(this.position).normalize();
            const up = basis.up;
            const tangentTarget = toTarget.clone().sub(up.clone().multiplyScalar(toTarget.dot(up))).normalize();
            
            const forward = basis.forward;
            const right = basis.right;
            
            const dot = forward.dot(tangentTarget);
            const cross = right.dot(tangentTarget);
            
            if (Math.abs(cross) > 0.05) autoTurn = Math.sign(cross);
            
            // Move if facing roughly target
            if (dot > 0.0) autoMove = 1; // Allow move even if turning, for smooth arc
            else autoMove = 0; // Pivot if behind?
            // User wants "Vehicle goes in direction".
            // If angle is large, maybe slow down?
            // For now, simple drive.
             if (dot > -0.5) autoMove = 1; // Drive unless backwards
        }

        // Calculate manual input values
        const manualTurn = (input.right ? 1 : 0) - (input.left ? 1 : 0);
        const manualMove = (input.forward ? 1 : 0) - (input.backward ? 1 : 0);
        
        // KEYBOARD OVERRIDE SYSTEM
        // When user uses keyboard while following a path, pause and save path
        // After 4 seconds of no keyboard input, auto-resume the saved path
        const hasKeyboardInput = manualTurn !== 0 || manualMove !== 0;
        
        if (hasKeyboardInput) {
            // User is using keyboard
            this.keyboardOverrideTimer = 0; // Reset timer
            
            if (!this.isKeyboardOverriding && this.isFollowingPath && this.path && this.path.length > 0) {
                // FIRST keyboard input while on a path - SAVE the path!
                console.log("Keyboard Override: Saving path at index", this.pathIndex);
                this.savedPath = [...this.path]; // Clone the path
                this.savedPathIndex = this.pathIndex || 0;
                this.isKeyboardOverriding = true;
                this.isFollowingPath = false;
                this.pausedByCommand = true;
            } else if (!this.isKeyboardOverriding && !this.savedPath) {
                // Keyboard control without any path - just mark as overriding
                this.isKeyboardOverriding = true;
                if (this.isFollowingPath) {
                    this.isFollowingPath = false;
                    this.pausedByCommand = true;
                }
            }
        } else {
            // No keyboard input
            if (this.isKeyboardOverriding) {
                // Was overriding, now stopped - start counting
                this.keyboardOverrideTimer += dt;
                
                // After 4 seconds, resume saved path
                if (this.keyboardOverrideTimer >= 4.0 && this.savedPath && this.savedPath.length > 0) {
                    console.log("Keyboard Override: Resuming path at index", this.savedPathIndex);
                    this.path = this.savedPath;
                    this.pathIndex = this.savedPathIndex;
                    this.savedPath = null;
                    this.savedPathIndex = 0;
                    this.isKeyboardOverriding = false;
                    this.pausedByCommand = false;
                    this.isFollowingPath = true;
                } else if (this.keyboardOverrideTimer >= 4.0 && !this.savedPath) {
                    // No saved path, just reset override state
                    this.isKeyboardOverriding = false;
                }
            }
        }
        
        // Calculate final input (manual or auto)
        const turnInput = this.pausedByCommand ? manualTurn : (manualTurn || autoTurn);
        let moveInput = this.pausedByCommand ? manualMove : (manualMove || autoMove);
        
        // Initialize heading quaternion if needed
        if (!this.headingQuaternion) {
            this.headingQuaternion = this.mesh.quaternion.clone();
        }
        
        // DRIFT FIX: Force HeadingQuaternion to Align with Sphere Normal
        // This ensures the "Vertical Axis" of the quaternion is always the Sphere Normal
        const currentSphereNormal = this.position.clone().normalize();
        const headingForward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.headingQuaternion).normalize();
        // Project forward to be orthogonal to sphere normal
        const orthoForward = headingForward.clone().sub(currentSphereNormal.clone().multiplyScalar(headingForward.dot(currentSphereNormal))).normalize();
        
        const sphereRight = new THREE.Vector3().crossVectors(currentSphereNormal, orthoForward).normalize();
        const sphereBasis = new THREE.Matrix4().makeBasis(sphereRight, currentSphereNormal, orthoForward);
        this.headingQuaternion.setFromRotationMatrix(sphereBasis);
        
        // 1. Handle Turning (Local Y Axis)
        if (turnInput !== 0) {
            let dir = turnInput > 0 ? -1 : 1; // Invert because Right is Negative Rotation
            
            // INVERTED REVERSE STEERING
            // If we are strictly reversing (manual input < 0 or auto-reverse), flip steering.
            // Check moveInput (which captures manual or auto move command)
            if (moveInput < 0) {
                dir *= -1;
            }

            // Rotate around World Up (Sphere Normal) to ensure correct Yaw
            const axis = this.position.clone().normalize();
            const rot = new THREE.Quaternion().setFromAxisAngle(axis, dir * turnSpeed);
            this.headingQuaternion.premultiply(rot);
        }

        // 2. Handle Movement (Local Z Axis)
        const forwardLocal = new THREE.Vector3(0, 0, 1);
        const forwardWorld = forwardLocal.applyQuaternion(this.headingQuaternion).normalize();


        // === WATER BEHAVIOR STATE MACHINE (Reactive) ===
        // Check current depth
        const baseRadius = this.planet.terrain.params.radius || 10;
        const waterLevel = this.planet.terrain.params.waterLevel || 0;
        const waterRadius = baseRadius + waterLevel;
        
        const currentDir = this.position.clone().normalize();
        const currentTerrainRadius = this.planet.terrain.getRadiusAt(currentDir);
        const waterDepth = Math.max(0, waterRadius - currentTerrainRadius);
        const isUnderwater = waterDepth > 0;
        const canEnterWater = this.canWalkUnderwater || this.canSwim;
        
        const unitHeight = 1.0; 
        const stopDepth = unitHeight * 0.2; // Stop at 20% submersion (Knee deep)

        // State Transitions
        if (this.waterState === 'normal') {
            this.waterSlowdownFactor = 1.0;
            if (isUnderwater && !canEnterWater && moveInput > 0) {
                this.waterState = 'wading';
                console.log("Water: Entering water...");
            }
        }
        else if (this.waterState === 'wading') {
            // Gradual Slowdown
            const depthFraction = Math.min(1.0, waterDepth / stopDepth);
            const targetSlowdown = 1.0 - (depthFraction * 0.9); 
            this.waterSlowdownFactor = THREE.MathUtils.lerp(this.waterSlowdownFactor, targetSlowdown, dt * 5.0);
            
            // Stop & Shake
            if (waterDepth > stopDepth) {
                 this.waterState = 'backing';
                 this.waterBackupTimer = 0;
                 this.waterShakeTimer = 1.5;
                 this.waterSlowdownFactor = 0.0;
                 console.log("Water: Refusal! Backing out.");
            } else if (moveInput < 0 || !isUnderwater) {
                 this.waterState = 'escaping';
            }
        }
        else if (this.waterState === 'backing') {
            // Force Backward Movement
            moveInput = -1; // Override Input!
            this.waterSlowdownFactor = 1.0; 
            
            // IMMEDIATE EXIT: If back on land, stop everything
            if (!isUnderwater) {
                this.waterState = 'normal';
                this.waterShakeTimer = 0;
                moveInput = 0;
                this.waterSlowdownFactor = 1.0;
                
                // Cleanup Shake
                if (this.waterShakeBaseHeading) {
                    this.headingQuaternion.copy(this.waterShakeBaseHeading);
                    this.waterShakeBaseHeading = null;
                }
                console.log("Water: Backed out to shore (Early Exit).");
                return; // Skip shake logic for this frame
            }
            
            /* Backing logic is autonomous */
            
            this.waterBackupTimer += dt;
            
            // Shake Effect
            if (this.waterShakeTimer > 0) {
                this.waterShakeTimer -= dt;
                
                // Initialize if needed
                if (this.waterShakeSeed === undefined) {
                    this.waterShakeSeed = Math.random();
                    this.waterShakeCount = 4 + Math.floor(Math.random() * 7);
                    this.waterShakeDuration = 1.5;
                }

                // Calculate shake progress (1.0 at start, 0.0 at end)
                const shakeProgress = Math.max(0, this.waterShakeTimer / this.waterShakeDuration);
                
                // AMPLITUDE: Max 10 degrees
                const maxAmplitude = (10 * Math.PI) / 180; 
                const amplitude = maxAmplitude * shakeProgress; 
                
                // FREQUENCY
                const elapsedTime = this.waterShakeDuration - this.waterShakeTimer;
                const frequency = this.waterShakeCount / this.waterShakeDuration;
                
                // Variation
                const freqVariation = 1.0 + (this.waterShakeSeed - 0.5) * 0.3;
                
                const shakeAngle = amplitude * Math.sin(elapsedTime * frequency * 2 * Math.PI * freqVariation);
                const terrainNormal = this.position.clone().normalize();
                const shakeQuat = new THREE.Quaternion().setFromAxisAngle(terrainNormal, shakeAngle);
                
                if (!this.waterShakeBaseHeading) {
                    this.waterShakeBaseHeading = this.headingQuaternion.clone();
                }
                
                this.headingQuaternion.copy(this.waterShakeBaseHeading).premultiply(shakeQuat);

            } else {
                // Reset shake state
                 if (this.waterShakeBaseHeading) {
                     this.headingQuaternion.copy(this.waterShakeBaseHeading);
                     this.waterShakeBaseHeading = null;
                 }
                 this.waterShakeSeed = undefined;
                 this.waterShakeCount = undefined;
                 this.waterShakeDuration = undefined;

                 // After shake/backup, check if safe
                 if (waterDepth < stopDepth * 0.8) {
                     this.waterState = 'wading'; // Can try again or escape
                 }
                 if (!isUnderwater) {
                     this.waterState = 'normal';
                 }
            }
        }
        else if (this.waterState === 'escaping') {
             this.waterSlowdownFactor = THREE.MathUtils.lerp(this.waterSlowdownFactor, 1.0, dt * 2.0);
             if (!isUnderwater) {
                 this.waterState = 'normal';
                 this.waterSlowdownFactor = 1.0;
             }
        }

        if (moveInput !== 0) {

            const oldPos = this.position.clone();
            const oldSphereNormal = oldPos.clone().normalize();
            
            const baseRadius = this.planet.terrain.params.radius || 10;
            const dist = moveInput * moveSpeed;
            
            // Calculate potential new position
            const newPosRaw = SphericalMath.moveAlongGreatCircle(
                oldPos, 
                forwardWorld, 
                dist, 
                baseRadius
            );

            // Apply movement (including backing/wading slowdown)
            {
                const adjustedDist = dist * this.waterSlowdownFactor;
                const finalPos = SphericalMath.moveAlongGreatCircle(
                    oldPos, 
                    forwardWorld, 
                    adjustedDist, 
                    baseRadius
                );
                
                this.position.copy(finalPos);
                
                // Update Orientation (Parallel Transport)
                const newSphereNormal = this.position.clone().normalize();
                const newHeading = SphericalMath.applyParallelTransport(
                    this.headingQuaternion,
                    oldSphereNormal,
                    newSphereNormal
                );
                this.headingQuaternion.copy(newHeading);
            }
        } else {
            // Not moving - reset water state if in transitional state
            // Don't reset if shaking/backing (those need to complete)
            if (this.waterState === 'wading' || this.waterState === 'escaping' || this.waterState === 'stopped') {
                this.waterState = 'normal';
                this.waterSlowdownFactor = 1.0;
            }
        }
        
        // 3. Apply Terrain Slope (Visual Only)
        // We calculate the precise orientation:
        // Up = Terrain Normal
        // Forward = Heading Forward projected on Terrain Plane
        
        // SKIP snapToSurface when following path - path points are already on terrain
        if (!this.isFollowingPath) {
            this.snapToSurface();
        }
        
        // Use smoothed normal for better alignment
        const terrainNormal = this.getSmoothedNormal();
        
        // Get forward from heading (which is sphere-aligned)
        // const basis = SphericalMath.getBasis(this.headingQuaternion); // Already declared above
        // Reuse existing basis or just get forward from heading directly if basis changed?
        // Actually basis above (line 77) was from headingQuaternion BEFORE movement.
        // Heading quaternion might have changed in step 1 (turn) or step 2 (transport).
        // So we should re-calculate basis or just use getBasis again but assign to new var or let.
        
        // Compute target orientation:
        // 1. Start with Heading (Sphere aligned).
        // 2. Rotate to match Terrain Normal (Tilt).
        
        // Heading basis (Sphere space)
        const visualHeadingForward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.headingQuaternion).normalize();
        
        // Construct Basis aligned to Terrain Normal but facing Heading
        const up = terrainNormal;
        
        // Project Heading Forward onto Terrain Plane
        let forward = visualHeadingForward.clone().sub(up.clone().multiplyScalar(visualHeadingForward.dot(up))).normalize();
        
        // Calculate Right (Up x Forward)
        const right = new THREE.Vector3().crossVectors(up, forward).normalize();
        
        // Re-calculate Forward to ensure orthogonality (Forward = Right x Up)
        forward.crossVectors(right, up).normalize();
        
        // Create Target Rotation Matrix
        const m = new THREE.Matrix4().makeBasis(right, up, forward);
        const targetQuat = new THREE.Quaternion().setFromRotationMatrix(m);
        
        // Smoothly rotate mesh towards target
        this.mesh.quaternion.slerp(targetQuat, 0.2); 
        
        // Sync mesh position
        this.mesh.position.copy(this.position);
        
        // Update logical quaternion for Camera (Sphere Aligned)
        this.quaternion.copy(this.headingQuaternion);
        
        // Update Selection Effects
        this.updateSelectionVisuals(dt);
    }

    snapToSurface() {
        // Use TERRAIN radius directly, ignoring water
        const dir = this.position.clone().normalize();
        const radius = this.planet.terrain.getRadiusAt(dir);
        this.position.copy(dir.multiplyScalar(radius + this.groundOffset));
    }
    
    getSmoothedNormal() {
        // Center normal
        const n0 = this.planet.terrain.getNormalAt(this.position);
        
        // Sample radius (footprint size)
        // Sample radius (footprint size)
        const radius = this.smoothingRadius; 
        const basis = SphericalMath.getBasis(this.headingQuaternion);
        
        // Sample 4 points around
        // Need to project radius onto sphere surface approximately
        const pFront = this.position.clone().add(basis.forward.clone().multiplyScalar(radius));
        const pBack = this.position.clone().add(basis.forward.clone().multiplyScalar(-radius));
        const pRight = this.position.clone().add(basis.right.clone().multiplyScalar(radius));
        const pLeft = this.position.clone().add(basis.right.clone().multiplyScalar(-radius));
        
        const nFront = this.planet.terrain.getNormalAt(pFront);
        const nBack = this.planet.terrain.getNormalAt(pBack);
        const nRight = this.planet.terrain.getNormalAt(pRight);
        const nLeft = this.planet.terrain.getNormalAt(pLeft);
        
        // Average them (simple unweighted average for now, improves stability significantly)
        const avgNormal = new THREE.Vector3()
            .add(n0).add(n0) // Weight center more (2x)
            .add(nFront).add(nBack)
            .add(nRight).add(nLeft)
            .normalize();
            
        return avgNormal;
    }
    
    // === TIRE TRACKS SYSTEM ===
    initTireTracks(scene) {
        this.scene = scene;
        this.tireTrackSegments = []; // Array of {mesh, opacity, age, createdAt}
        this.lastTrackPosition = null;
        this.trackSpacing = 0.3; // Restored dense spacing
        this.trackWidth = 0.15;
        
        // Adaptive lifetime based on performance
        this.trackMinLifetime = 300.0; // Minimum 300 seconds (10x increased)
        this.trackMaxLifetime = 3000.0; // Maximum 50 minutes
        this.trackCurrentLifetime = 600.0; // Start at 600 seconds
        
        this.trackFadeStep = 0.02; // 2% opacity loss per fadeInterval
        this.trackFadeInterval = 1.0; // Fade once per second
        this.trackFadeTimer = 0;
        this.maxTrackSegments = 2000; // Higher limit since we have adaptive cleanup
        
        // Performance monitoring
        this.frameTimeHistory = [];
        this.frameTimeHistoryMax = 30; // Track last 30 frames
        this.performanceCheckInterval = 2.0; // Check every 2 seconds
        this.performanceCheckTimer = 0;
        this.lastFrameTime = performance.now();
        
        // Shared geometry for all tracks (optimization) - wide, rectangular
        this.sharedTrackGeo = new THREE.PlaneGeometry(0.12, 0.35);
    }
    
    updateTireTracks(dt) {
        if (!this.scene || !this.tireTrackSegments) return;
        
        // === PERFORMANCE MONITORING ===
        const now = performance.now();
        const frameTime = now - this.lastFrameTime;
        this.lastFrameTime = now;
        
        // Track frame times
        this.frameTimeHistory.push(frameTime);
        if (this.frameTimeHistory.length > this.frameTimeHistoryMax) {
            this.frameTimeHistory.shift();
        }
        
        // Periodic performance check
        this.performanceCheckTimer += dt;
        if (this.performanceCheckTimer >= this.performanceCheckInterval) {
            this.performanceCheckTimer = 0;
            
            // Calculate average frame time
            const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
            
            // Target: 16.67ms (60fps). If above 25ms (40fps), reduce lifetime. If below 20ms, increase.
            if (avgFrameTime > 25) {
                // Performance struggling - reduce lifetime (faster fade)
                this.trackCurrentLifetime = Math.max(this.trackMinLifetime, this.trackCurrentLifetime * 0.8);
                // console.log(`Track lifetime reduced to ${this.trackCurrentLifetime.toFixed(1)}s (avg frame: ${avgFrameTime.toFixed(1)}ms)`);
            } else if (avgFrameTime < 20 && this.trackCurrentLifetime < this.trackMaxLifetime) {
                // Performance good - increase lifetime
                this.trackCurrentLifetime = Math.min(this.trackMaxLifetime, this.trackCurrentLifetime * 1.1);
            }
            
            // Recalculate fade step based on current lifetime
            // USER REQUEST: 12 opacity levels for smoother fading
            // Starting opacity is 0.6 (for multiply blend), divide into 12 steps
            const numFadeLevels = 12;
            const stepsPerSecond = numFadeLevels / this.trackCurrentLifetime;
            this.trackFadeStep = 0.6 / numFadeLevels; // Each step reduces by 0.05
            this.trackFadeInterval = 1.0 / stepsPerSecond; // Time between steps
        }
        
        // Check if we've moved enough to add a new track segment
        const currentPos = this.position.clone();
        if (!this.lastTrackPosition) {
            this.lastTrackPosition = currentPos.clone();
            return;
        }
        
        const distMoved = currentPos.distanceTo(this.lastTrackPosition);
        
        if (distMoved >= this.trackSpacing) {
            // Create new track segment
            const basis = SphericalMath.getBasis(this.headingQuaternion);
            
            // Left and right track positions (wheelbase)
            const wheelOffset = 0.15;
            const leftPos = this.position.clone().add(basis.right.clone().multiplyScalar(-wheelOffset));
            const rightPos = this.position.clone().add(basis.right.clone().multiplyScalar(wheelOffset));
            
            // Project to terrain
            const leftDir = leftPos.clone().normalize();
            const rightDir = rightPos.clone().normalize();
            const leftRadius = this.planet.terrain.getRadiusAt(leftDir);
            const rightRadius = this.planet.terrain.getRadiusAt(rightDir);
            const leftFinal = leftDir.multiplyScalar(leftRadius + 0.01);
            const rightFinal = rightDir.multiplyScalar(rightRadius + 0.01);
            
            // Check segment limit for performance
            if (this.tireTrackSegments.length >= this.maxTrackSegments * 2) {
                // Remove oldest segments
                const toRemove = this.tireTrackSegments.splice(0, 4);
                toRemove.forEach(track => {
                    this.scene.remove(track.mesh);
                    track.mesh.material.dispose();
                });
            }
            
            // Get terrain color at track position for multiply effect
            // This is CPU-based but runs only once per track segment (not per frame)
            const terrainDir = this.position.clone().normalize();
            const terrainHeight = this.planet.terrain.getHeight(terrainDir.x, terrainDir.y, terrainDir.z);
            const terrainColor = this.planet.terrain.getBiomeColor(terrainHeight, 0.5, 0.5, 0);
            
            // Blend terrain color with brownish pastel for natural tire track look
            const brownTint = new THREE.Color(0x8B7355); // Pastel brown
            const trackColor = terrainColor.clone().lerp(brownTint, 0.5).multiplyScalar(0.5);
            
            // Blur shader material for soft edges with terrain color
            // INDENTATION SHADOW: Simulates depth with sun-based shadow
            const trackMat = new THREE.ShaderMaterial({
                uniforms: {
                    opacity: { value: 0.6 },
                    color: { value: trackColor },
                    sunDirection: { value: new THREE.Vector3(0.6, 0.3, 0.4).normalize() } // Matches Game.js sun
                },
                vertexShader: `
                    varying vec2 vUv;
                    varying vec3 vNormal;
                    varying vec3 vWorldPos;
                    void main() {
                        vUv = uv;
                        vNormal = normalize(normalMatrix * normal);
                        vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform float opacity;
                    uniform vec3 color;
                    uniform vec3 sunDirection;
                    varying vec2 vUv;
                    varying vec3 vNormal;
                    varying vec3 vWorldPos;
                    
                    void main() {
                        // Rectangular soft edge (more oval than circle)
                        vec2 center = vec2(0.5, 0.5);
                        vec2 uv = (vUv - center) * 2.0;
                        // Oval falloff: X is narrower, Y is longer
                        float dist = length(vec2(uv.x * 1.5, uv.y * 0.8));
                        float alpha = smoothstep(1.0, 0.4, dist) * opacity;
                        
                        // INDENTATION SHADOW EFFECT
                        // Simulate a small depression - edges facing away from sun are darker
                        // Create fake "rim normal" based on UV position
                        vec3 rimNormal = normalize(vec3(uv.x * 0.5, 1.0, uv.y * 0.5));
                        
                        // Calculate shadow factor based on sun angle to rim
                        float sunDot = dot(rimNormal, sunDirection);
                        float shadowFactor = smoothstep(-0.3, 0.5, sunDot);
                        
                        // Apply shadow - darker on sun-facing rim (simulates shadow cast by opposite rim)
                        float edgeness = smoothstep(0.3, 0.8, dist);
                        float indentShadow = mix(1.0, shadowFactor, edgeness * 0.6);
                        
                        // SPECULAR HIGHLIGHT on inner edge (sun-facing side catches light)
                        // The compressed dirt on the inner rim reflects some light
                        float innerEdge = smoothstep(0.2, 0.5, dist) * (1.0 - smoothstep(0.5, 0.8, dist));
                        float specAngle = max(0.0, dot(rimNormal, sunDirection));
                        float specular = pow(specAngle, 4.0) * innerEdge * 0.15; // Subtle glint
                        
                        // For MULTIPLY blend: output darker values, with specular brightening
                        vec3 shadedColor = color * indentShadow;
                        vec3 multiplyColor = mix(vec3(1.0), shadedColor, alpha);
                        // Add specular on top (makes it slightly brighter than terrain)
                        multiplyColor += vec3(specular * alpha);
                        gl_FragColor = vec4(multiplyColor, 1.0);
                    }
                `,
                transparent: false,
                side: THREE.DoubleSide,
                depthWrite: false,
                blending: THREE.MultiplyBlending
            });
            
            // Helper function to orient track on terrain
            const orientTrack = (track, pos, normal, forward) => {
                track.position.copy(pos);
                const projForward = forward.clone().sub(normal.clone().multiplyScalar(forward.dot(normal))).normalize();
                const lookTarget = pos.clone().add(normal);
                track.lookAt(lookTarget);
                const currentUp = new THREE.Vector3(0, 1, 0).applyQuaternion(track.quaternion);
                const angle = Math.atan2(
                    new THREE.Vector3().crossVectors(currentUp, projForward).dot(normal),
                    currentUp.dot(projForward)
                );
                track.rotateZ(angle);
            };
            
            // Left track
            const leftTrack = new THREE.Mesh(this.sharedTrackGeo, trackMat.clone());
            const leftNormal = this.planet.terrain.getNormalAt(leftFinal);
            orientTrack(leftTrack, leftFinal, leftNormal, basis.forward);
            this.scene.add(leftTrack);
            this.tireTrackSegments.push({ mesh: leftTrack, opacity: 0.6, age: 0 });
            
            // Right track
            const rightTrack = new THREE.Mesh(this.sharedTrackGeo, trackMat.clone());
            const rightNormal = this.planet.terrain.getNormalAt(rightFinal);
            orientTrack(rightTrack, rightFinal, rightNormal, basis.forward);
            this.scene.add(rightTrack);
            this.tireTrackSegments.push({ mesh: rightTrack, opacity: 0.6, age: 0 });
            
            this.lastTrackPosition = this.position.clone();
        }
        
        // Fade existing tracks
        this.trackFadeTimer += dt;
        if (this.trackFadeTimer >= this.trackFadeInterval) {
            this.trackFadeTimer = 0;
            
            for (let i = this.tireTrackSegments.length - 1; i >= 0; i--) {
                const track = this.tireTrackSegments[i];
                track.opacity -= this.trackFadeStep;
                
                // Update shader uniform for opacity
                if (track.mesh.material.uniforms && track.mesh.material.uniforms.opacity) {
                    track.mesh.material.uniforms.opacity.value = Math.max(0, track.opacity);
                } else {
                    track.mesh.material.opacity = Math.max(0, track.opacity);
                }
                
                // Remove fully faded tracks
                if (track.opacity <= 0) {
                    this.scene.remove(track.mesh);
                    // Don't dispose shared geometry, only material
                    track.mesh.material.dispose();
                    this.tireTrackSegments.splice(i, 1);
                }
            }
        }
    }
}
