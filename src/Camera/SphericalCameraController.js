import * as THREE from 'three';
import { CameraState } from './CameraState.js';

export class SphericalCameraController {
    constructor(camera, domElement, planet) {
        this.camera = camera;
        this.domElement = domElement;
        this.planet = planet;

        // Configuration
        this.params = {
            minAltitude: 2.0,
            maxAltitude: 200.0,
            zoomSpeed: 0.5,
            rotateSpeed: 0.005,
            dampingFactor: 0.1,
            grabDamping: 0.2
        };

        // State
        this.currentState = new CameraState();
        this.targetState = new CameraState();

        // Input State
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        
        // Grab Logic State
        this.grabStartPoint = new THREE.Vector3();
        this.grabStartPivot = new THREE.Vector3();
        
        // Raycasting
        this.raycaster = new THREE.Raycaster();

        // Bindings
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onWheel = this.onWheel.bind(this);
        this.onContextMenu = this.onContextMenu.bind(this);

        // Attach events
        this.domElement.addEventListener('mousedown', this.onMouseDown);
        window.addEventListener('mousemove', this.onMouseMove);
        window.addEventListener('mouseup', this.onMouseUp);
        this.domElement.addEventListener('wheel', this.onWheel, { passive: false });
        this.domElement.addEventListener('contextmenu', this.onContextMenu);

        // Initialize
        this.initialize();
    }

    initialize() {
        const r = this.planet.terrain.params.radius;
        this.targetState.pivot.set(0, 0, r);
        this.targetState.radius = 100.0;
        this.targetState.yaw = 0;
        this.targetState.pitch = -Math.PI / 4;
        
        this.currentState.copy(this.targetState);
        this.applyTo(this.camera);
    }

    // Helper: Raycast to Planet Terrain
    getTerrainPoint(clientX, clientY) {
        const rect = this.domElement.getBoundingClientRect();
        const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
        const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
        
        const intersects = this.raycaster.intersectObject(this.planet.mesh, false);
        if (intersects.length > 0) {
            return intersects[0].point;
        }
        return null;
    }

    // Helper: Raycast to a virtual sphere
    getSpherePoint(clientX, clientY, radius) {
        const rect = this.domElement.getBoundingClientRect();
        const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
        const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
        
        const sphere = new THREE.Sphere(new THREE.Vector3(0,0,0), radius);
        const target = new THREE.Vector3();
        
        if (this.raycaster.ray.intersectSphere(sphere, target)) {
            return target;
        }
        return null;
    }

    onMouseDown(event) {
        this.isDragging = true;
        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;
        
        if (event.button === 0) { // LMB: Grab
            const hit = this.getTerrainPoint(event.clientX, event.clientY);
            if (hit) {
                this.grabStartPoint.copy(hit);
                // We don't need grabStartPivot here if we use incremental or absolute rotation of the current pivot
            } else {
                const r = this.planet.terrain.params.radius;
                const sphereHit = this.getSpherePoint(event.clientX, event.clientY, r);
                if (sphereHit) {
                    this.grabStartPoint.copy(sphereHit);
                } else {
                    this.isDragging = false;
                }
            }
        } 
        
        if (event.button === 2) { // RMB: Orbit
            const hit = this.getTerrainPoint(event.clientX, event.clientY);
            if (hit) {
                // Rebase target state to new pivot
                this.targetState.rebase(hit);
                // Snap current state to target state to prevent jump
                this.currentState.copy(this.targetState);
            }
        }
    }

    onMouseMove(event) {
        if (!this.isDragging) return;

        const deltaX = event.clientX - this.lastMouseX;
        const deltaY = event.clientY - this.lastMouseY;
        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;

        const isLMB = (event.buttons & 1) === 1;
        const isRMB = (event.buttons & 2) === 2;

        if (isLMB && isRMB) {
            // Free Look (LMB + RMB)
            this.targetState.yaw -= deltaX * this.params.rotateSpeed;
            this.targetState.pitch -= deltaY * this.params.rotateSpeed;
            this.targetState.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(-0.1, this.targetState.pitch));
            
        } else if (isLMB) {
            // Grab & Drag (Google Earth Style)
            const r = this.grabStartPoint.length();
            
            // We want to rotate the Pivot such that the world moves with the mouse.
            // 1. Get point on sphere under CURRENT mouse pos
            const vCurr = this.getSpherePoint(event.clientX, event.clientY, r);
            // 2. Get point on sphere under PREVIOUS mouse pos
            const vPrev = this.getSpherePoint(event.clientX - deltaX, event.clientY - deltaY, r);
            
            if (vCurr && vPrev) {
                // Rotation to move vCurr to vPrev (Drag World)
                const q = new THREE.Quaternion().setFromUnitVectors(vCurr.normalize(), vPrev.normalize());
                
                // Apply to Pivot
                this.targetState.pivot.applyQuaternion(q);
            }
            
        } else if (isRMB) {
            // Orbit Pivot
            this.targetState.yaw -= deltaX * this.params.rotateSpeed;
            this.targetState.pitch -= deltaY * this.params.rotateSpeed;
            this.targetState.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(-0.1, this.targetState.pitch));
        }
    }

    onMouseUp(event) {
        this.isDragging = false;
    }

    onWheel(event) {
        event.preventDefault();
        
        const zoomFactor = 1.0 + Math.abs(event.deltaY * 0.001 * this.params.zoomSpeed);
        const zoomingIn = event.deltaY < 0;
        const hit = this.getTerrainPoint(event.clientX, event.clientY);
        
        if (zoomingIn && hit) {
            // Zoom to Cursor Logic
            // 1. Rebase both states to the new pivot (hit point)
            this.currentState.rebase(hit);
            this.targetState.rebase(hit);
            
            // 2. Now reduce the radius (move closer)
            this.targetState.radius /= zoomFactor;
        } else {
            // Zoom out or no hit: just change radius
            this.targetState.radius *= zoomFactor;
        }
        
        // Clamp Radius (Altitude)
        const pivotNorm = this.targetState.pivot.clone().normalize();
        const terrainH = this.planet.terrain.getRadiusAt(pivotNorm);
        const minR = terrainH + this.params.minAltitude;
        const maxR = terrainH + this.params.maxAltitude;
        
        this.targetState.radius = Math.max(minR, Math.min(maxR, this.targetState.radius));
    }

    onContextMenu(event) {
        event.preventDefault();
    }

    update(dt) {
        const d = this.params.dampingFactor;
        
        this.currentState.pivot.lerp(this.targetState.pivot, d);
        this.currentState.radius += (this.targetState.radius - this.currentState.radius) * d;
        this.currentState.yaw += (this.targetState.yaw - this.currentState.yaw) * d;
        this.currentState.pitch += (this.targetState.pitch - this.currentState.pitch) * d;
        
        // Altitude Constraint (Safety)
        // Ensure camera doesn't go below terrain
        const dummyCam = new THREE.Object3D();
        this.currentState.applyTo(dummyCam);
        const camPos = dummyCam.position;
        const camDir = camPos.clone().normalize();
        const terrainH = this.planet.terrain.getRadiusAt(camDir);
        const minH = terrainH + this.params.minAltitude;
        
        if (camPos.length() < minH) {
            // Push camera up?
            // This is hard because we drive state by Pivot/Radius.
            // If we are too low, we should increase Radius?
            // Or move Pivot up?
            // Easiest: Increase Radius.
            // Distance from Pivot to Camera.
            // We need to increase it such that Camera is at minH.
            
            // This is an approximation loop or simple clamp if Pivot is below Camera.
            // If Pivot is on surface, and Camera is above, Radius should be enough.
            // But if Camera is sideways (horizon view), Radius can be large but Altitude low.
            
            // Let's just clamp the Radius in the state if it results in low altitude?
            // No, Radius is distance to Pivot.
            
            // If we are too low, we force the camera position to be higher.
            // But we need to reflect this in the State.
            // This is the "Inverse Kinematics" problem of the camera.
            
            // Simple fix: If actual altitude is too low, overwrite the current state radius?
            // Only works if looking down.
            
            // Let's just hard clamp the camera position in applyTo? 
            // No, applyTo is pure.
            
            // For now, let's trust the Zoom clamp, but that only checks Pivot altitude.
            // If we are in "Horizon View", we might clip.
            // Let's add a soft constraint here:
            if (this.currentState.radius < 5) this.currentState.radius = 5; // Absolute min
        }
    }

    applyTo(camera) {
        this.currentState.applyTo(camera);
    }
}
