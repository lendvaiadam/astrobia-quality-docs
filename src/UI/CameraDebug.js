export class CameraDebug {
    constructor(game) {
        this.game = game;
        this.container = document.createElement('div');
        this.container.style.position = 'absolute';
        this.container.style.top = '10px';
        this.container.style.left = '10px';
        this.container.style.color = '#00ff00';
        this.container.style.fontFamily = 'monospace';
        this.container.style.fontSize = '12px';
        this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        this.container.style.padding = '10px';
        this.container.style.pointerEvents = 'none';
        this.container.style.whiteSpace = 'pre';
        this.container.style.zIndex = '1000';
        document.body.appendChild(this.container);
    }

    update() {
        const cam = this.game.camera;
        const controls = this.game.cameraControls;
        const mouse = this.game.mouse; // NDC
        
        const mode = controls.isFreeLooking ? 'FREE LOOK' : 
                    controls.isOrbiting ? 'ORBIT' : 
                    controls.isDragging ? 'DRAG' : 'IDLE';

        const text = `
Camera Debug (System 4.0 - Transform)
-------------------------------------
Mode: ${mode}

Position:   
  X: ${cam.position.x.toFixed(2)}
  Y: ${cam.position.y.toFixed(2)}
  Z: ${cam.position.z.toFixed(2)}
  Altitude: ${cam.position.length().toFixed(2)}

Orientation (Quaternion):
  X: ${cam.quaternion.x.toFixed(3)}
  Y: ${cam.quaternion.y.toFixed(3)}
  Z: ${cam.quaternion.z.toFixed(3)}
  W: ${cam.quaternion.w.toFixed(3)}

Mouse (NDC):
  X: ${mouse.x.toFixed(3)}
  Y: ${mouse.y.toFixed(3)}

Anchors:
  Orbit Pivot: ${controls.orbitPivot ? 'ACTIVE' : 'NONE'}
  Drag Anchor: ${controls.dragAnchor ? 'ACTIVE' : 'NONE'}
`;
        this.container.textContent = text;
    }
}
