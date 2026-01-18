import * as THREE from 'three';

export const MathUtils = {
    // Get height from center for a given position on a sphere of radius R
    // This will be replaced by actual terrain lookup later
    getRadius: (position) => {
        return position.length();
    },

    // Align an object to the surface normal
    alignToSurface: (object, position, center) => {
        const up = new THREE.Vector3().subVectors(position, center).normalize();
        const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
        object.quaternion.copy(quaternion);
    }
};
