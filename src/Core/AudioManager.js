import * as THREE from 'three';

export class AudioManager {
    constructor() {
        this.listener = new THREE.AudioListener();
        this.audioLoader = new THREE.AudioLoader();

        // Ambient sounds
        this.spaceSound = null;
        this.atmoSound = null;

        // Unit sounds registry
        // Map<Unit, THREE.PositionalAudio>
        this.unitSounds = new Map();

        this.isInitialized = false;

        // Audio Params
        this.planetRadius = 100; // Default, can be updated
        this.crossfadeStart = 110; // Distance where Atmo starts fading out (Extremely close only)
        this.crossfadeEnd = 160;   // Distance where Space is full volume (Planet fully visible)

        // Startup Logic
        this.startupTime = -1;
        this.startupDuration = 15.0; // Seconds to fade from "Intro Loudness" to "Normal Distance Volume"
        this.fadeInDuration = 3.0; // Seconds for initial volume fade-in (0 -> 1)
        this.atmosphereDelay = 5.0; // Seconds before atmosphere starts fading in

        // Pending sounds to start after user gesture
        this.pendingUnitSounds = [];
    }

    init(camera) {
        if (this.isInitialized) return;

        this.camera = camera;
        this.listener = new THREE.AudioListener();
        camera.add(this.listener);

        this.audioLoader = new THREE.AudioLoader();

        // Load Space Ambience (Globally)
        this.spaceSound = new THREE.Audio(this.listener);
        this.audioLoader.load('assets/audio/Bolygo_1.mp3', (buffer) => {
            this.spaceSound.setBuffer(buffer);
            this.spaceSound.setLoop(true);
            this.spaceSound.setVolume(0.5);
            // DON'T play here - wait for user gesture
            this.spaceSoundReady = true;
        });

        // Load Atmosphere Ambience (Globally)
        this.atmoSound = new THREE.Audio(this.listener);
        this.audioLoader.load('assets/audio/Atmosphere_1.mp3', (buffer) => {
            this.atmoSound.setBuffer(buffer);
            this.atmoSound.setLoop(true);
            this.atmoSound.setVolume(0);
            // DON'T play here - wait for user gesture
            this.atmoSoundReady = true;
        });

        this.isInitialized = true;
        console.log("AudioManager initialized");
    }

    // Resume context (browser policy)
    resumeContext() {
        if (this.listener.context.state === 'suspended') {
            this.listener.context.resume();
        }
        if (this.startupTime === -1) {
            this.startupTime = this.listener.context.currentTime;
        }
    }

    addUnitSound(unit) {
        if (!unit.mesh) return;

        const sound = new THREE.PositionalAudio(this.listener);
        this.audioLoader.load('assets/audio/Motor_hum_1.mp3', (buffer) => {
            sound.setBuffer(buffer);
            sound.setRefDistance(10);
            sound.setRolloffFactor(1.5);
            sound.setLoop(true);
            sound.setVolume(0);
            // DON'T play here - wait for user gesture
            sound.isReady = true;

            unit.mesh.add(sound);
            this.unitSounds.set(unit, sound);
            this.pendingUnitSounds.push(sound);
        });
    }

    // Preload music files in background (can be called immediately on page load)
    // Doesn't require user gesture - just loads the audio buffers
    preloadMusic() {
        if (this.isPreloading) return;
        this.isPreloading = true;

        // Start loading immediately, don't wait for init
        if (!this.audioLoader) {
            this.audioLoader = new THREE.AudioLoader();
        }

        console.log('[AudioManager] Preloading music in background...');

        this.audioLoader.load('assets/audio/Bolygo_1.mp3', (buffer) => {
            this.preloadedSpaceBuffer = buffer;
            console.log('[AudioManager] Space music preloaded!');
        });

        this.audioLoader.load('assets/audio/Atmosphere_1.mp3', (buffer) => {
            this.preloadedAtmoBuffer = buffer;
            console.log('[AudioManager] Atmosphere music preloaded!');
        });
    }

    // Start music - call after user gesture
    startMusic() {
        console.error('[Audio] startMusic() called');
        console.error('[Audio] spaceSound:', !!this.spaceSound, 'buffer:', !!this.spaceSound?.buffer, 'ready:', this.spaceSoundReady);
        console.error('[Audio] preloadedSpaceBuffer:', !!this.preloadedSpaceBuffer);

        this.resumeContext();

        // FIX: If spaceSound has buffer but ready flag isn't set, set it now
        // This handles the case where init() loaded buffer but callback didn't fire yet
        if (this.spaceSound && this.spaceSound.buffer && !this.spaceSoundReady) {
            console.error('[Audio] Setting spaceSoundReady=true (buffer exists)');
            this.spaceSoundReady = true;
        }

        if (this.atmoSound && this.atmoSound.buffer && !this.atmoSoundReady) {
            console.error('[Audio] Setting atmoSoundReady=true (buffer exists)');
            this.atmoSoundReady = true;
        }

        // Use preloaded buffers if available (faster startup when init buffer isn't ready)
        if (this.preloadedSpaceBuffer && this.spaceSound && !this.spaceSound.buffer) {
            console.error('[Audio] Using preloaded space buffer');
            this.spaceSound.setBuffer(this.preloadedSpaceBuffer);
            this.spaceSound.setLoop(true);
            this.spaceSound.setVolume(0.5);
            this.spaceSoundReady = true;
        }

        if (this.preloadedAtmoBuffer && this.atmoSound && !this.atmoSound.buffer) {
            console.error('[Audio] Using preloaded atmo buffer');
            this.atmoSound.setBuffer(this.preloadedAtmoBuffer);
            this.atmoSound.setLoop(true);
            this.atmoSound.setVolume(0);
            this.atmoSoundReady = true;
        }

        // Try to play
        if (this.spaceSound && this.spaceSoundReady && !this.spaceSound.isPlaying) {
            try {
                this.spaceSound.play();
                console.error("[Audio] Space music play() called, isPlaying now:", this.spaceSound.isPlaying);
            } catch (e) {
                console.error("[Audio] play() threw error:", e);
            }
        } else {
            console.error('[Audio] Cannot play space music:',
                'spaceSound:', !!this.spaceSound,
                'ready:', this.spaceSoundReady,
                'isPlaying:', this.spaceSound?.isPlaying);
        }

        if (this.atmoSound && this.atmoSoundReady && !this.atmoSound.isPlaying) {
            this.atmoSound.play();
            console.error("[Audio] Atmosphere sound started");
        }

        // Start all pending unit sounds
        for (const sound of this.pendingUnitSounds) {
            if (sound.isReady && !sound.isPlaying) {
                sound.play();
            }
        }
        this.pendingUnitSounds = [];
        console.error("[Audio] All audio started after user gesture");

        // RETRY MECHANISM: If music didn't start, retry periodically
        if (!this.spaceSound?.isPlaying && !this._retryInterval) {
            console.error('[Audio] Music not playing yet, setting up retry...');
            this._retryCount = 0;
            this._retryInterval = setInterval(() => {
                this._retryCount++;
                console.error('[Audio] Retry attempt', this._retryCount);

                // Check if buffer is now available
                if (this.spaceSound && this.spaceSound.buffer && !this.spaceSound.isPlaying) {
                    this.spaceSoundReady = true;
                    try {
                        this.spaceSound.play();
                        console.error('[Audio] Music started on retry!');
                    } catch (e) {
                        console.error('[Audio] Retry play error:', e);
                    }
                }

                if (this.atmoSound && this.atmoSound.buffer && !this.atmoSound.isPlaying) {
                    this.atmoSoundReady = true;
                    this.atmoSound.play();
                }

                // Stop retrying after success or 10 attempts
                if (this.spaceSound?.isPlaying || this._retryCount >= 10) {
                    clearInterval(this._retryInterval);
                    this._retryInterval = null;
                    console.error('[Audio] Retry mechanism stopped, isPlaying:', this.spaceSound?.isPlaying);
                }
            }, 1000);
        }
    }

    // Check if music is ready to play
    isMusicReady() {
        return this.spaceSoundReady && this.atmoSoundReady;
    }

    // Check if music is playing
    isMusicPlaying() {
        return this.spaceSound && this.spaceSound.isPlaying;
    }

    update(cameraDistance, units) {
        // Resume context if needed
        if (this.listener.context.state === 'suspended') {
            // We rely on user interaction elsewhere to resume, but we can try
        }

        if (this.startupTime === -1) {
            this.startupTime = this.listener.context.currentTime;
        }

        const time = this.listener.context.currentTime;
        const elapsed = time - this.startupTime;

        // === 1. MUSIC & ATMOSPHERE MIXING ===
        // Startup Override: 
        // For first 15s (startupDuration), Music is FORCE PLAYING at High Volume
        // Then fades to distance-based mixing.

        let startupMix = 0; // 0 = normal distance logic, 1 = startup override
        if (elapsed < this.startupDuration) {
            startupMix = 1.0;
        } else if (elapsed < this.startupDuration + 5.0) {
            // Fade out the override over 5 seconds
            startupMix = 1.0 - (elapsed - this.startupDuration) / 5.0;
        }

        // Calculate Distance-Based Volumes
        // Near Surface (< crossfadeStart): Max Atmo, Min Space
        // Deep Space (> crossfadeEnd): Min Atmo, Max Space

        let spaceVol = 0;
        let atmoVol = 0;

        const dist = cameraDistance - this.planetRadius;
        const t = THREE.MathUtils.clamp((dist - (this.crossfadeStart - 100)) / (this.crossfadeEnd - this.crossfadeStart), 0, 1);

        spaceVol = t;         // 0 at surface, 1 at space
        atmoVol = 1.0 - t;    // 1 at surface, 0 at space

        // Apply Startup Override: Force Space (Music) to 1.0, Atmo to 0.5
        // User Request: "Az elején mindenképpen szóljon 15 másodperci"
        if (startupMix > 0) {
            const targetSpace = 0.8; // Loud music at start
            const targetAtmo = 0.2;
            spaceVol = THREE.MathUtils.lerp(spaceVol, targetSpace, startupMix);
            atmoVol = THREE.MathUtils.lerp(atmoVol, targetAtmo, startupMix);
        }

        // User Request: "azért nagyon halkan még a unit közvetlen közelében is lehessen hallani"
        // Ensure Space Music never drops below 0.05
        spaceVol = Math.max(spaceVol, 0.05);

        if (this.spaceSound && this.spaceSound.isPlaying) {
            this.spaceSound.setVolume(spaceVol);
        }

        if (this.atmoSound && this.atmoSound.isPlaying) {
            this.atmoSound.setVolume(atmoVol * 0.6); // Atmosphere slightly quieter overall
        }


        // Update Unit Sounds
        if (units) {
            this.updateUnitSounds(units);
        }
    }

    // Helper to update unit sounds based on sound
    updateUnitSounds(units) {
        units.forEach(unit => {
            const sound = this.unitSounds.get(unit);
            if (sound && sound.isPlaying) {
                // Volume based on speed
                // Speed ~0 -> Volume 0.3 (Idle - always audible)
                // Speed ~5 (Max) -> Volume 0.8
                const speed = unit.currentSpeed || 0;
                const targetVol = THREE.MathUtils.lerp(0.3, 0.8, Math.min(speed / 5.0, 1.0));

                // Smooth transition
                sound.setVolume(THREE.MathUtils.lerp(sound.getVolume(), targetVol, 0.1));
            }
        });
    }
}
