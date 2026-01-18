import { createNoise3D } from 'simplex-noise';
import * as THREE from 'three';

export class Terrain {
    constructor(params = {}) {
        this.noise3D = createNoise3D(() => 0.5);
        this.moistureNoise = createNoise3D(() => 0.3);
        this.temperatureNoise = createNoise3D(() => 0.7);
        
        this.params = Object.assign({
            seed: 'rts-planet',
            radius: 60,
            detail: 50,
            heightMultiplier: 6.0,
            waterLevel: 1.5,
            
            // Height-based gradient colors
            // Height-based gradient colors
            colorLowest: 0x001a33,
            heightLowest: -3.0,
            
            colorWater: 0x3d7faa,
            heightWater: -1.0, // Relative to waterLevel? No, absolute height offset usually.
            // Wait, getBiomeColor uses hardcoded values currently.
            
            colorMid: 0x4a7c2e,
            heightMid: 1.0,
            
            colorHighest: 0xffffff,
            heightPeak: 5.0,
            
            waterOpacity: 0.5,
            
            // Noise Type
            noiseType: 'ridged',
            
            // Domain Warping
            domainWarpStrength: 0.0,
            domainWarpOctaves: 4,
            domainWarpScale: 0.4,
            
            // Multi-layer Noise
            continentScale: 0.6,
            continentStrength: 0.0,
            mountainScale: 3.0,
            mountainStrength: 0.5,
            detailScale: 2.5,
            detailStrength: 0.5,
            
            // Ridged Parameters
            ridgePower: 1.5,
            
            // Environmental
            moistureScale: 0.1,
            temperatureScale: 0.1,
            
            // Erosion
            erosionStrength: 0.05
        }, params);
    }

    applyDomainWarp(x, y, z) {
        let warpX = x, warpY = y, warpZ = z;
        const strength = this.params.domainWarpStrength;
        const scale = this.params.domainWarpScale;
        
        for (let i = 0; i < this.params.domainWarpOctaves; i++) {
            const freq = Math.pow(2, i) * scale;
            const amp = strength / Math.pow(2, i);
            
            warpX += this.noise3D(warpY * freq, warpZ * freq, 100 + i) * amp;
            warpY += this.noise3D(warpZ * freq, warpX * freq, 200 + i) * amp;
            warpZ += this.noise3D(warpX * freq, warpY * freq, 300 + i) * amp;
        }
        
        return { x: warpX, y: warpY, z: warpZ };
    }

    sampleNoise(x, y, z, scale, octaves = 4, persistence = 0.5) {
        let value = 0, amplitude = 1, frequency = scale, maxValue = 0;
        
        for (let i = 0; i < octaves; i++) {
            let sample = this.noise3D(x * frequency, y * frequency, z * frequency);
            
            if (this.params.noiseType === 'ridged') {
                sample = 1 - Math.abs(sample);
                sample = Math.pow(sample, this.params.ridgePower);
            } else if (this.params.noiseType === 'billow') {
                sample = Math.abs(sample) * 2 - 1;
            }
            
            value += sample * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= 2;
        }
        
        return value / maxValue;
    }

    getHeight(x, y, z) {
        const warped = this.applyDomainWarp(x, y, z);
        
        const continent = this.sampleNoise(warped.x, warped.y, warped.z, this.params.continentScale, 3, 0.5) * this.params.continentStrength;
        const mountains = this.sampleNoise(warped.x, warped.y, warped.z, this.params.mountainScale, 5, 0.5) * this.params.mountainStrength;
        const detail = this.sampleNoise(x, y, z, this.params.detailScale, 3, 0.4) * this.params.detailStrength;
        
        let height = continent + mountains * 0.5 + detail;
        const erosion = this.params.erosionStrength;
        height = height * (1 - erosion) + Math.sign(height) * Math.pow(Math.abs(height), 1 + erosion * 0.5) * erosion;
        
        return height * this.params.heightMultiplier;
    }

    getRadiusAt(direction) {
        return this.params.radius + this.getHeight(direction.x, direction.y, direction.z);
    }

    getMoisture(x, y, z) {
        return this.moistureNoise(x * this.params.moistureScale, y * this.params.moistureScale, z * this.params.moistureScale) * 0.5 + 0.5;
    }

    getTemperature(x, y, z, height) {
        const baseTemp = this.temperatureNoise(x * this.params.temperatureScale, y * this.params.temperatureScale, z * this.params.temperatureScale) * 0.5 + 0.5;
        const heightFactor = Math.max(0, 1 - height / 3.0);
        const latitudeFactor = 1 - Math.abs(y) * 0.5;
        return baseTemp * heightFactor * latitudeFactor;
    }

    getBiomeColor(height, moisture, temperature, slope = 0) {
        const c = new THREE.Color();
        const waterLevel = this.params.waterLevel;
        
        const smoothstep = (edge0, edge1, x) => {
            const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
            return t * t * (3 - 2 * t);
        };
        
        const lowestColor = new THREE.Color(this.params.colorLowest);
        const waterColor = new THREE.Color(this.params.colorWater);
        const midColor = new THREE.Color(this.params.colorMid);
        const highestColor = new THREE.Color(this.params.colorHighest);
        
        const minHeight = this.params.heightLowest;
        const waterHeight = this.params.waterLevel + this.params.heightWater; // Maybe relative to water level?
        // The user wants to adjust "at what height the color should be".
        // Let's make them absolute height values relative to the radius (heightOffset).
        
        // Helper to convert hex to string
        const hexStr = (c) => '#' + c.getHexString();
        
        // Log colors once (Debounced or check flag?)
        if (!this.hasLoggedColors) {
            console.log("Terrain Colors (Brightest/Darkest Check):");
            console.log(" Lowest (Deep Water/Abyss):", hexStr(lowestColor));
            console.log(" Highest (Peak/Snow):", hexStr(highestColor));
            console.log(" Water Surface:", hexStr(waterColor));
            this.hasLoggedColors = true;
        }

        const hLowest = this.params.heightLowest;
        const hWater = this.params.heightWater; // Typically around 0 or waterLevel
        const hMid = this.params.heightMid;
        const hPeak = this.params.heightPeak;
        
        if (height < hWater) {
            const t = smoothstep(hLowest, hWater, height);
            c.lerpColors(lowestColor, waterColor, t);
        } else if (height < hMid) {
            const t = smoothstep(hWater, hMid, height);
            c.lerpColors(waterColor, midColor, t);
        } else {
            const t = smoothstep(hMid, hPeak, height);
            c.lerpColors(midColor, highestColor, t);
        }
        
        return c;
    }

    getNormalAt(position) {
        const epsilon = 0.01;
        const p0 = position.clone();
        const normal = p0.clone().normalize();
        
        let tangent1 = new THREE.Vector3(0, 1, 0).cross(normal);
        if (tangent1.lengthSq() < 0.001) tangent1 = new THREE.Vector3(1, 0, 0).cross(normal);
        tangent1.normalize();
        
        const tangent2 = new THREE.Vector3().crossVectors(normal, tangent1).normalize();
        const p1Dir = p0.clone().add(tangent1.clone().multiplyScalar(epsilon)).normalize();
        const p2Dir = p0.clone().add(tangent2.clone().multiplyScalar(epsilon)).normalize();
        
        const v0 = normal.clone().multiplyScalar(this.getRadiusAt(normal));
        const v1 = p1Dir.clone().multiplyScalar(this.getRadiusAt(p1Dir));
        const v2 = p2Dir.clone().multiplyScalar(this.getRadiusAt(p2Dir));
        
        const edge1 = new THREE.Vector3().subVectors(v1, v0);
        const edge2 = new THREE.Vector3().subVectors(v2, v0);
        
        return new THREE.Vector3().crossVectors(edge1, edge2).normalize();
    }
}
