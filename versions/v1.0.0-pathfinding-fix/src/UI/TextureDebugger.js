import * as THREE from 'three';

export class TextureDebugger {
    constructor(renderer, texture) {
        this.renderer = renderer;
        this.texture = texture;
        this.enabled = false; // Toggle for showing texture
        
        this.scene = new THREE.Scene();
        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        
        const geometry = new THREE.PlaneGeometry(0.5, 0.5);
        geometry.translate(-0.70, 0.70, 0);
        
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            depthTest: false,
            depthWrite: false
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.scene.add(this.mesh);
    }
    
    update() {
        if (!this.enabled) return;
        
        this.renderer.autoClear = false;
        this.renderer.render(this.scene, this.camera);
        this.renderer.autoClear = true;
    }
}
