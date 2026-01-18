import * as THREE from 'three';

export class CameraState {
    constructor() {
        this.pivot = new THREE.Vector3(0, 0, 100); // Target point on terrain
        this.radius = 100.0; // Distance from pivot
        this.yaw = 0.0; // Rotation around Local Up (radians)
        this.pitch = -Math.PI / 4; // Rotation around Local Right (radians)
        this.center = new THREE.Vector3(0, 0, 0); // Planet center
    }

    clone() {
        const state = new CameraState();
        state.pivot.copy(this.pivot);
        state.radius = this.radius;
        state.yaw = this.yaw;
        state.pitch = this.pitch;
        state.center.copy(this.center);
        return state;
    }

    copy(other) {
        this.pivot.copy(other.pivot);
        this.radius = other.radius;
        this.yaw = other.yaw;
        this.pitch = other.pitch;
        this.center.copy(other.center);
        return this;
    }

    // Re-calculate Radius, Yaw, Pitch for the CURRENT camera position relative to a NEW Pivot
    rebase(newPivot) {
        // 1. Calculate current camera position from current state
        const dummyCam = new THREE.Object3D();
        this.applyTo(dummyCam);
        const currentPos = dummyCam.position;
        
        // 2. Update Pivot
        this.pivot.copy(newPivot);
        
        // 3. Calculate new Radius
        this.radius = currentPos.distanceTo(newPivot);
        
        // 4. Calculate Local Frame at New Pivot
        const localUp = newPivot.clone().normalize();
        let globalUp = new THREE.Vector3(0, 1, 0);
        if (Math.abs(localUp.dot(globalUp)) > 0.99) globalUp.set(0, 0, 1);
        const localRight = new THREE.Vector3().crossVectors(globalUp, localUp).normalize();
        const localForward = new THREE.Vector3().crossVectors(localUp, localRight).normalize();
        
        // 5. Calculate Yaw/Pitch
        const offset = new THREE.Vector3().subVectors(currentPos, newPivot);
        const dir = offset.clone().normalize();
        
        // Pitch: Angle between dir and Up = 90 + Pitch (since Pitch is -90..0)
        // Pitch = Angle(dir, Up) - 90 (in degrees) -> radians
        const angleUp = dir.angleTo(localUp);
        this.pitch = angleUp - Math.PI / 2;
        
        // Yaw: Angle of projected dir on horizontal plane relative to South
        const south = localForward.clone().negate();
        const dirHoriz = new THREE.Vector3().subVectors(dir, localUp.clone().multiplyScalar(dir.dot(localUp))).normalize();
        
        this.yaw = Math.atan2(
            dirHoriz.dot(localRight),
            dirHoriz.dot(south)
        );
    }

    // Re-calculate Radius, Yaw, Pitch for the CURRENT camera position relative to a NEW Pivot
    rebase(newPivot) {
        // 1. Calculate current camera position from current state
        const dummyCam = new THREE.Object3D();
        this.applyTo(dummyCam);
        const currentPos = dummyCam.position;
        
        // 2. Update Pivot
        this.pivot.copy(newPivot);
        
        // 3. Calculate new Radius
        this.radius = currentPos.distanceTo(newPivot);
        
        // 4. Calculate Local Frame at New Pivot
        const localUp = newPivot.clone().normalize();
        let globalUp = new THREE.Vector3(0, 1, 0);
        if (Math.abs(localUp.dot(globalUp)) > 0.99) globalUp.set(0, 0, 1);
        const localRight = new THREE.Vector3().crossVectors(globalUp, localUp).normalize();
        const localForward = new THREE.Vector3().crossVectors(localUp, localRight).normalize();
        
        // 5. Calculate Yaw/Pitch
        const offset = new THREE.Vector3().subVectors(currentPos, newPivot);
        const dir = offset.clone().normalize();
        
        // Pitch: Angle between dir and Up = 90 + Pitch (since Pitch is -90..0)
        // Pitch = Angle(dir, Up) - 90 (in degrees) -> radians
        const angleUp = dir.angleTo(localUp);
        this.pitch = angleUp - Math.PI / 2;
        
        // Yaw: Angle of projected dir on horizontal plane relative to South
        const south = localForward.clone().negate();
        const dirHoriz = new THREE.Vector3().subVectors(dir, localUp.clone().multiplyScalar(dir.dot(localUp))).normalize();
        
        this.yaw = Math.atan2(
            dirHoriz.dot(localRight),
            dirHoriz.dot(south)
        );
    }

    // Apply this state to the Three.js camera
    applyTo(camera) {
        // 1. Calculate Local Frame at Pivot
        // Local Up: Vector from Planet Center to Pivot
        const localUp = new THREE.Vector3().subVectors(this.pivot, this.center).normalize();

        // Local Right: Cross Product of Global Up (0,1,0) and Local Up
        // Handle singularity at poles
        let globalUp = new THREE.Vector3(0, 1, 0);
        if (Math.abs(localUp.dot(globalUp)) > 0.99) {
            globalUp.set(0, 0, 1); // Fallback axis
        }
        const localRight = new THREE.Vector3().crossVectors(globalUp, localUp).normalize();

        // Local Forward: Cross Product of Local Up and Local Right
        const localForward = new THREE.Vector3().crossVectors(localUp, localRight).normalize();

        // 2. Calculate Rotation
        // We want to rotate the "offset vector" (which starts as Local Up * Radius)
        // Rotation order: Yaw (around Local Up) then Pitch (around Local Right)
        
        const qYaw = new THREE.Quaternion().setFromAxisAngle(localUp, this.yaw);
        
        const sinP = Math.sin(-this.pitch);
        const cosP = Math.cos(-this.pitch);
        
        // Base Offset Vector (before Yaw)
        // In the plane defined by LocalUp and LocalForward
        // We want to be "behind" the pivot looking forward.
        // So we are along -LocalForward (South) and +LocalUp.
        const baseOffset = new THREE.Vector3()
            .addScaledVector(localUp, sinP)
            .addScaledVector(localForward, -cosP) // South
            .multiplyScalar(this.radius);
            
        // 3. Apply Yaw
        // Rotate the base offset around Local Up
        baseOffset.applyQuaternion(qYaw);
        
        // 4. Set Camera Position
        camera.position.copy(this.pivot).add(baseOffset);
        
        // 5. Look At Pivot
        camera.lookAt(this.pivot);
        
        // 6. Fix Camera Up
        if (this.pitch < -Math.PI / 2 + 0.01) {
            // Top down view
            // Camera Up should be "North" (Local Forward rotated by Yaw)
            const north = localForward.clone().applyQuaternion(qYaw);
            camera.up.copy(north);
        } else {
            // Normal view
            camera.up.copy(localUp);
        }
    }
}
