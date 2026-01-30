/**
 * ITransport - Transport Layer Interface
 *
 * R007: Defines the contract for command delivery between input and simulation.
 * All player commands MUST flow through a transport implementation.
 *
 * This abstraction enables:
 * - Local play (LocalTransport - synchronous loopback)
 * - Multiplayer (WebRTCTransport, WebSocketTransport - future)
 * - Replay (ReplayTransport - command stream playback - future)
 *
 * Architecture:
 *   InputFactory → Transport.send() → [network/loopback] → Transport.onReceive → CommandQueue
 *
 * INVARIANT: No command enters the authoritative simulation without passing through transport.
 */

/**
 * @typedef {Object} TransportCommand
 * @property {string} type - Command type (SELECT, MOVE, etc.)
 * @property {*} [payload] - Command-specific data
 */

/**
 * @typedef {Object} ITransport
 * @property {function(TransportCommand): void} send - Send a command through the transport
 * @property {function(TransportCommand): void} onReceive - Callback invoked when a command is received
 * @property {function(): void} connect - Initialize the transport connection
 * @property {function(): void} disconnect - Clean up the transport connection
 * @property {boolean} isConnected - Whether the transport is currently connected
 */

/**
 * Transport state enum.
 */
export const TransportState = {
    DISCONNECTED: 'DISCONNECTED',
    CONNECTING: 'CONNECTING',
    CONNECTED: 'CONNECTED',
    ERROR: 'ERROR'
};

/**
 * Base class providing common transport functionality.
 * Concrete transports should extend this class.
 *
 * @implements {ITransport}
 */
export class TransportBase {
    constructor() {
        /** @type {TransportState} */
        this._state = TransportState.DISCONNECTED;

        /** @type {function(TransportCommand): void} */
        this._onReceive = null;

        /** @type {number} */
        this._messagesSent = 0;

        /** @type {number} */
        this._messagesReceived = 0;
    }

    /**
     * Set the receive callback. Called when commands arrive.
     * @param {function(TransportCommand): void} callback
     */
    set onReceive(callback) {
        this._onReceive = callback;
    }

    /**
     * Get the receive callback.
     * @returns {function(TransportCommand): void}
     */
    get onReceive() {
        return this._onReceive;
    }

    /**
     * Check if transport is connected.
     * @returns {boolean}
     */
    get isConnected() {
        return this._state === TransportState.CONNECTED;
    }

    /**
     * Get current transport state.
     * @returns {TransportState}
     */
    get state() {
        return this._state;
    }

    /**
     * Get statistics for debugging.
     * @returns {{ sent: number, received: number, state: TransportState }}
     */
    getStats() {
        return {
            sent: this._messagesSent,
            received: this._messagesReceived,
            state: this._state
        };
    }

    /**
     * Send a command through the transport.
     * Must be implemented by concrete transports.
     * @param {TransportCommand} command
     * @abstract
     */
    send(command) {
        throw new Error('TransportBase.send() must be implemented by subclass');
    }

    /**
     * Initialize the transport connection.
     * Must be implemented by concrete transports.
     * @abstract
     */
    connect() {
        throw new Error('TransportBase.connect() must be implemented by subclass');
    }

    /**
     * Clean up the transport connection.
     * Must be implemented by concrete transports.
     * @abstract
     */
    disconnect() {
        throw new Error('TransportBase.disconnect() must be implemented by subclass');
    }

    /**
     * Deliver a received command to the callback.
     * Called by concrete transports when a command arrives.
     * @protected
     * @param {TransportCommand} command
     */
    _deliverReceived(command) {
        this._messagesReceived++;
        if (this._onReceive) {
            this._onReceive(command);
        }
    }
}
