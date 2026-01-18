import { Game } from './Core/Game.js';

// VERSION - displayed on screen
const VERSION = 'V2.0.009';

window.addEventListener('DOMContentLoaded', () => {
    // Display version number at top of screen
    const versionDiv = document.createElement('div');
    versionDiv.id = 'version-display';
    versionDiv.textContent = VERSION;
    versionDiv.style.cssText = 'position:fixed;top:5px;right:10px;color:rgba(255,255,255,0.5);font-family:monospace;font-size:12px;z-index:9999;pointer-events:none;';
    document.body.appendChild(versionDiv);
    
    const game = new Game();
    window.game = game; // Expose for UI access

    // Start loading music in background immediately
    // (Will play after user gesture)
    let musicStartTime = null;
    let worldReady = false;

    // Set callback for when game is fully rendered (world is ready)
    game.onFirstRender = () => {
        worldReady = true;
        console.log('[Main] World fully rendered!');
    };

    // Get DOM elements
    const startScreen = document.getElementById('start-screen');
    const startBtnBasic = document.getElementById('start-btn-basic');
    const startBtnHigh = document.getElementById('start-btn-high');
    const loader = document.getElementById('loader');

    // Start background music loading as soon as possible
    // This will preload the audio file but NOT play it (needs user gesture)
    if (game.audioManager) {
        game.audioManager.preloadMusic();
    }

    const startGame = (mode) => {
        console.log('[Main] Starting game with mode:', mode);

        // 1. IMMEDIATELY show preloader (add visible class)
        if (loader) {
            loader.classList.add('visible');
            loader.classList.remove('fade-stage-1', 'fade-stage-2', 'fade-complete');
            console.log('[Main] Loader visible');
        }

        // 2. Hide start screen with fade
        if (startScreen) {
            startScreen.classList.add('fade-out');
            setTimeout(() => startScreen.remove(), 500);
        }

        // 2. Apply Graphics Mode
        if (mode === 'basic') {
            if (game.enableLowSpecMode) {
                game.enableLowSpecMode();
            }
            // Dust 25%
            if (game.units) {
                game.units.forEach(u => {
                    if (u && u.dustMaxParticles !== undefined) {
                        u.dustMaxParticles = 25;
                    }
                });
            }
        } else {
            // High Mode - Dust 50%
            if (game.units) {
                game.units.forEach(u => {
                    if (u && u.dustMaxParticles !== undefined) {
                        u.dustMaxParticles = 50;
                    }
                });
            }
        }

        // 3. Start Music (User Gesture) - Start playing as soon as loaded
        if (game.audioManager) {
            game.audioManager.startMusic();
        }

        // 4. Wait for music to start, then track when it started
        const gameStartTime = Date.now();
        const MAX_WAIT_MS = 10000; // Absolute max wait - start game after 10s regardless

        const waitForMusicAndWorld = () => {
            const musicPlaying = game.audioManager && game.audioManager.isMusicPlaying();
            const elapsed = Date.now() - gameStartTime;

            // If music just started playing, record the time
            if (musicPlaying && !musicStartTime) {
                musicStartTime = Date.now();
                console.error('[Main] Music started playing!');
            }

            // Calculate how long music has been playing
            const musicPlayingDuration = musicStartTime ? (Date.now() - musicStartTime) : 0;
            const MIN_MUSIC_DURATION_MS = 2000; // Reduced to 2 seconds for faster load

            // Debug: Log status every second
            if (elapsed % 1000 < 100) {
                console.log(`[Preloader] worldReady=${worldReady} musicPlaying=${musicPlaying} musicDuration=${musicPlayingDuration}ms elapsed=${elapsed}ms`);
            }

            // Conditions for fade:
            // 1. World is ready (first render complete)
            // 2. Music has been playing for at least 2 seconds
            // 3. OR timeout reached (10 seconds) - start anyway
            const musicCondition = musicPlayingDuration >= MIN_MUSIC_DURATION_MS;
            const timeout = elapsed >= MAX_WAIT_MS;
            const canFade = worldReady && (musicCondition || timeout);

            if (timeout && !musicCondition) {
                console.error('[Main] Timeout reached, starting game without music condition');
            }

            if (canFade) {
                console.error('[Main] Fading preloader...');
                if (loader) {
                    loader.classList.add('fade-stage-1');

                    // Fly to first unit
                    if (game.units && game.units.length > 0) {
                        game.selectAndFlyToUnit(game.units[0]);
                    }

                    setTimeout(() => loader.classList.add('fade-stage-2'), 1000);
                    setTimeout(() => loader.classList.add('fade-complete'), 2000);
                }
            } else {
                // Keep waiting
                setTimeout(waitForMusicAndWorld, 100);
            }
        };

        // Start checking
        waitForMusicAndWorld();
    };

    // Attach button listeners immediately (buttons should be responsive)
    if (startBtnBasic) {
        startBtnBasic.addEventListener('click', () => startGame('basic'));
    }
    if (startBtnHigh) {
        startBtnHigh.addEventListener('click', () => startGame('high'));
    }

    // Start the game (rendering begins, but UI waits for button)
    game.start();
});
