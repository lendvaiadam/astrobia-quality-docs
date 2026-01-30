/**
 * LocalTransport - Synchronous Loopback Transport
 *
 * R007: Implements ITransport for local (single-machine) play.
 * Commands sent are immediately delivered to the receive callback.
 *
 * This is the default transport for:
 * - Single-player mode
 * - Local testing
 * - Development without network
 *
 * Design notes:
 * - Synchronous delivery (send() immediately calls onReceive)
 * - No network latency simulation (add LatencyTransport wrapper if needed)
 * - Thread-safe for single-threaded JS environment
 * - Zero allocations in hot path beyond command object itself
 */

import { TransportBase, TransportState } from './ITransport.js';

/**
 * LocalTransport provides synchronous command loopback.
 * @extends TransportBase
 */
export class LocalTransport extends TransportBase {
    constructor() {
        super();

        /**
         * Optional: queue commands if not connected.
         * For LocalTransport, we auto-connect, but this supports
         * consistent behavior if connect() is called late.
         * @type {Array}
         * @private
         */
        this._pendingBeforeConnect = [];
    }

    /**
     * Initialize the transport.
     * LocalTransport is always "connected" - this just sets state.
     */
    connect() {
        if (this._state === TransportState.CONNECTED) {
            return; // Already connected
        }

        this._state = TransportState.CONNECTED;

        // Flush any commands that arrived before connect()
        if (this._pendingBeforeConnect.length > 0) {
            const pending = this._pendingBeforeConnect;
            this._pendingBeforeConnect = [];
            for (const cmd of pending) {
                this._deliverReceived(cmd);
            }
        }
    }

    /**
     * Disconnect the transport.
     * LocalTransport can be reconnected by calling connect() again.
     */
    disconnect() {
        this._state = TransportState.DISCONNECTED;
    }

    /**
     * Send a command through the loopback.
     * Immediately delivers to onReceive callback if connected.
     *
     * @param {Object} command - The command to send
     */
    send(command) {
        this._messagesSent++;

        if (this._state !== TransportState.CONNECTED) {
            // Queue for delivery when connected
            this._pendingBeforeConnect.push(command);
            return;
        }

        // Synchronous loopback - immediate delivery
        this._deliverReceived(command);
    }

    /**
     * Get transport type identifier.
     * @returns {string}
     */
    get type() {
        return 'local';
    }
}

/**
 * Global LocalTransport singleton for default local play.
 */
export const globalLocalTransport = new LocalTransport();
