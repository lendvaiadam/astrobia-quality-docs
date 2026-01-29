/**
 * Determinism tests for SeededRNG.
 *
 * Run in browser console:
 *   import('./src/SimCore/runtime/__tests__/seededRNG.test.js')
 *     .then(m => m.runAllTests())
 */

import {
    SeededRNG,
    createRNG,
    resetGlobalRNG,
    rngNext,
    globalRNG
} from '../SeededRNG.js';

/**
 * Test: Same seed produces same sequence
 */
function testSameSeedSameSequence() {
    const rng1 = createRNG(12345);
    const rng2 = createRNG(12345);

    const seq1 = [rng1.next(), rng1.next(), rng1.next(), rng1.next(), rng1.next()];
    const seq2 = [rng2.next(), rng2.next(), rng2.next(), rng2.next(), rng2.next()];

    for (let i = 0; i < seq1.length; i++) {
        if (seq1[i] !== seq2[i]) {
            throw new Error(`Mismatch at index ${i}: ${seq1[i]} !== ${seq2[i]}`);
        }
    }

    console.log('✓ testSameSeedSameSequence passed');
    return true;
}

/**
 * Test: Different seeds produce different sequences
 */
function testDifferentSeedDifferentSequence() {
    const rng1 = createRNG(12345);
    const rng2 = createRNG(54321);

    const seq1 = [rng1.next(), rng1.next(), rng1.next()];
    const seq2 = [rng2.next(), rng2.next(), rng2.next()];

    // At least one value should differ
    let allSame = true;
    for (let i = 0; i < seq1.length; i++) {
        if (seq1[i] !== seq2[i]) {
            allSame = false;
            break;
        }
    }

    if (allSame) {
        throw new Error('Different seeds produced identical sequences');
    }

    console.log('✓ testDifferentSeedDifferentSequence passed');
    return true;
}

/**
 * Test: Reset returns to same sequence
 */
function testResetSequence() {
    const rng = createRNG(99999);

    const first = [rng.next(), rng.next(), rng.next()];
    rng.reset();
    const second = [rng.next(), rng.next(), rng.next()];

    for (let i = 0; i < first.length; i++) {
        if (first[i] !== second[i]) {
            throw new Error(`Mismatch after reset at index ${i}`);
        }
    }

    console.log('✓ testResetSequence passed');
    return true;
}

/**
 * Test: Output is in [0, 1) range
 */
function testOutputRange() {
    const rng = createRNG(42);

    for (let i = 0; i < 1000; i++) {
        const val = rng.next();
        if (val < 0 || val >= 1) {
            throw new Error(`Value out of range: ${val}`);
        }
    }

    console.log('✓ testOutputRange passed');
    return true;
}

/**
 * Test: nextInt produces integers in range
 */
function testNextInt() {
    const rng = createRNG(777);

    for (let i = 0; i < 100; i++) {
        const val = rng.nextInt(10);
        if (!Number.isInteger(val) || val < 0 || val >= 10) {
            throw new Error(`nextInt(10) produced invalid value: ${val}`);
        }
    }

    console.log('✓ testNextInt passed');
    return true;
}

/**
 * Test: Global RNG determinism
 */
function testGlobalRNGDeterminism() {
    resetGlobalRNG(88888);
    const first = [rngNext(), rngNext(), rngNext()];

    resetGlobalRNG(88888);
    const second = [rngNext(), rngNext(), rngNext()];

    for (let i = 0; i < first.length; i++) {
        if (first[i] !== second[i]) {
            throw new Error(`Global RNG not deterministic at index ${i}`);
        }
    }

    console.log('✓ testGlobalRNGDeterminism passed');
    return true;
}

/**
 * Test: State serialization roundtrip
 */
function testStateSerialization() {
    const rng = createRNG(11111);
    rng.next();
    rng.next();

    const state = rng.getState();
    const val1 = rng.next();

    // Create new RNG and restore state
    const rng2 = createRNG(0);
    rng2.setState(state);
    const val2 = rng2.next();

    if (val1 !== val2) {
        throw new Error(`State restoration failed: ${val1} !== ${val2}`);
    }

    console.log('✓ testStateSerialization passed');
    return true;
}

/**
 * Test: Call count tracking
 */
function testCallCount() {
    const rng = createRNG(22222);

    if (rng.callCount !== 0) {
        throw new Error(`Initial callCount should be 0, got ${rng.callCount}`);
    }

    rng.next();
    rng.next();
    rng.next();

    if (rng.callCount !== 3) {
        throw new Error(`After 3 calls, callCount should be 3, got ${rng.callCount}`);
    }

    rng.reset();

    if (rng.callCount !== 0) {
        throw new Error(`After reset, callCount should be 0, got ${rng.callCount}`);
    }

    console.log('✓ testCallCount passed');
    return true;
}

/**
 * Run all tests
 */
export function runAllTests() {
    console.log('=== SeededRNG Determinism Tests ===');
    let passed = 0;
    let failed = 0;

    const tests = [
        testSameSeedSameSequence,
        testDifferentSeedDifferentSequence,
        testResetSequence,
        testOutputRange,
        testNextInt,
        testGlobalRNGDeterminism,
        testStateSerialization,
        testCallCount,
    ];

    for (const test of tests) {
        try {
            test();
            passed++;
        } catch (err) {
            console.error(`✗ ${test.name} FAILED:`, err.message);
            failed++;
        }
    }

    // Cleanup
    resetGlobalRNG(0);

    console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
    return { passed, failed };
}

if (typeof window !== 'undefined') {
    console.log('SeededRNG tests loaded. Call runAllTests() to execute.');
}
