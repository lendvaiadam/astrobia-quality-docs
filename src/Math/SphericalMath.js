import * as THREE from 'three';

export const SphericalMath = {
    /**
     * Moves a position along a great circle in a given direction.
     * @param {THREE.Vector3} position - Current position (on sphere surface).
     * @param {THREE.Vector3} forwardDir - Tangent direction to move in.
     * @param {number} distance - Distance to move.
     * @param {number} radius - Sphere radius.
     * @returns {THREE.Vector3} New position.
     */
    moveAlongGreatCircle: (position, forwardDir, distance, radius) => {
        // Angle to rotate around the sphere center
        const angle = distance / radius;

        // Axis of rotation is perpendicular to position and forward direction
        // We assume position is relative to center (0,0,0)
        const normal = position.clone().normalize();
        const axis = new THREE.Vector3().crossVectors(normal, forwardDir).normalize();

        // Rotate position around axis
        const quaternion = new THREE.Quaternion().setFromAxisAngle(axis, angle);
        return position.clone().applyQuaternion(quaternion);
    },

    /**
     * Calculates the rotation needed to align an object from one surface normal to another,
     * preserving its relative "forward" heading (Parallel Transport).
     * @param {THREE.Quaternion} currentOrientation - Current orientation of the object.
     * @param {THREE.Vector3} oldNormal - Previous surface normal.
     * @param {THREE.Vector3} newNormal - New surface normal.
     * @returns {THREE.Quaternion} New orientation.
     */
    applyParallelTransport: (currentOrientation, oldNormal, newNormal) => {
        // Calculate the rotation that aligns oldNormal to newNormal
        const alignQuat = new THREE.Quaternion().setFromUnitVectors(oldNormal, newNormal);
        
        // Apply this rotation to the current orientation
        // This effectively "transports" the local frame to the new location
        // while keeping the "heading" relative to the geodesic constant.
        const newOrientation = alignQuat.multiply(currentOrientation);
        return newOrientation;
    },

    /**
     * Gets the local basis vectors for an object on a sphere.
     * @param {THREE.Quaternion} orientation 
     * @returns {Object} { forward, right, up }
     */
    getBasis: (orientation) => {
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(orientation);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(orientation); // -1 if X is Left
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(orientation);
        return { forward, right, up };
    }
};
