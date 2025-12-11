/**
 * WebSocket Client Manager for Multiplayer
 * Handles WebSocket connection and messaging using STOMP protocol
 */
class WebSocketClient {
    constructor() {
        this.stompClient = null;
        this.connected = false;
        this.roomCode = null;
        this.subscriptions = [];
        this.playerName = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3;
        this.connectionStatusCallback = null;
    }

    /**
     * Set connection status callback
     */
    setConnectionStatusCallback(callback) {
        this.connectionStatusCallback = callback;
    }

    /**
     * Update connection status
     */
    updateConnectionStatus(status, message) {
        if (this.connectionStatusCallback) {
            this.connectionStatusCallback(status, message);
        }
    }

    /**
     * Connect to WebSocket server
     */
    connect(onConnected, onError) {
        this.updateConnectionStatus('connecting', 'Connecting to server...');

        // Use environment-specific URL
        const wsUrl = window.location.hostname === 'localhost'
            ? 'http://localhost:8080/ws'
            : 'https://YOUR_BACKEND_URL.up.railway.app/ws'; // Replace with your actual backend URL

        const socket = new SockJS(wsUrl);
        // Use StompJs.Stomp from the CDN library
        this.stompClient = StompJs.Stomp.over(socket);

        // Disable debug logging in production
        this.stompClient.debug = (msg) => {
            console.log('[WebSocket]', msg);
        };

        this.stompClient.connect({},
            (frame) => {
                this.connected = true;
                this.reconnectAttempts = 0;
                console.log('WebSocket connected:', frame);
                this.updateConnectionStatus('connected', 'Connected');
                if (onConnected) onConnected();
            },
            (error) => {
                this.connected = false;
                console.error('WebSocket error:', error);
                this.updateConnectionStatus('disconnected', 'Connection failed');

                // Attempt reconnection
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    this.updateConnectionStatus('reconnecting', `Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
                    setTimeout(() => {
                        this.connect(onConnected, onError);
                    }, 2000);
                } else {
                    this.updateConnectionStatus('error', 'Connection failed. Please refresh.');
                    if (onError) onError(error);
                }
            }
        );

        // Handle disconnection
        socket.onclose = () => {
            this.connected = false;
            this.updateConnectionStatus('disconnected', 'Disconnected from server');
            console.log('WebSocket disconnected');
        };
    }

    /**
     * Create a new room
     */
    createRoom(hostName, config, callback) {
        if (!this.connected) {
            throw new Error('Not connected to server');
        }

        this.playerName = hostName;

        // Subscribe to room responses
        this.stompClient.subscribe('/user/queue/room', (message) => {
            const response = JSON.parse(message.body);
            callback(response);
        });

        // Send create room request
        this.stompClient.send('/app/room/create', {}, JSON.stringify({
            hostName: hostName,
            config: config
        }));
    }

    /**
     * Join an existing room
     */
    joinRoom(roomCode, guestName, callback) {
        if (!this.connected) {
            throw new Error('Not connected to server');
        }

        this.roomCode = roomCode;
        this.playerName = guestName;

        // Subscribe to room responses
        this.stompClient.subscribe('/user/queue/room', (message) => {
            const response = JSON.parse(message.body);
            callback(response);
        });

        // Send join request
        this.stompClient.send('/app/room/join', {}, JSON.stringify({
            roomCode: roomCode,
            guestName: guestName
        }));
    }

    /**
     * Leave a room
     */
    leaveRoom(roomCode, playerName) {
        if (!this.connected) return;

        console.log('[WS] Sending /app/room/leave', roomCode, playerName);
        this.stompClient.send('/app/room/leave', {}, JSON.stringify({
            roomCode: roomCode,
            playerName: playerName
        }));
    }

    /**
     * Subscribe to room updates
     */
    subscribeToRoom(roomCode, onUpdate) {
        const subscription = this.stompClient.subscribe(
            `/topic/room/${roomCode}`,
            (message) => {
                const update = JSON.parse(message.body);
                console.log('[WS] Room update received:', update);
                if (onUpdate) onUpdate(update);
            }
        );
        this.subscriptions.push(subscription);
    }

    /**
     * Subscribe to game updates
     */
    subscribeToGame(roomCode, onMessage) {
        console.log('[WS] Subscribing to /topic/game/' + roomCode);

        const subscription = this.stompClient.subscribe(
            `/topic/game/${roomCode}`,
            (message) => {
                try {
                    const response = JSON.parse(message.body);
                    console.log('[WS] Message received on /topic/game/' + roomCode + ':', response);

                    // Forward all messages to the handler - let it decide what to do
                    if (onMessage) {
                        onMessage(response);
                    }
                } catch (error) {
                    console.error('[WS] Error parsing game message:', error);
                }
            }
        );
        this.subscriptions.push(subscription);
        console.log('[WS] Subscription created for /topic/game/' + roomCode);
    }

    /**
     * Start the game
     */
    startGame(roomCode) {
        if (!this.connected) {
            console.error('Cannot start game: not connected');
            return;
        }
        console.log('[WS] Sending /app/room/start for roomCode:', roomCode);
        this.stompClient.send('/app/room/start', {}, JSON.stringify({
            roomCode: roomCode
        }));
    }

    /**
     * Send move to server
     */
    sendMove(roomCode, column) {
        if (!this.connected) {
            console.error('Cannot send move: not connected');
            return;
        }
        console.log('[WS] Sending /app/game/move - roomCode:', roomCode, 'column:', column, 'playerName:', this.playerName);
        this.stompClient.send('/app/game/move', {}, JSON.stringify({
            roomCode: roomCode,
            column: column,
            playerName: this.playerName
        }));
    }

    /**
     * Request rematch
     */
    requestRematch(roomCode) {
        if (!this.connected) {
            console.error('Cannot request rematch: not connected');
            return;
        }
        this.stompClient.send('/app/game/rematch', {}, JSON.stringify({
            roomCode: roomCode,
            playerName: this.playerName
        }));
    }

    /**
     * Respond to rematch invitation
     */
    respondToRematch(roomCode, accepted) {
        if (!this.connected) {
            console.error('Cannot respond to rematch: not connected');
            return;
        }
        this.stompClient.send('/app/game/rematch/respond', {}, JSON.stringify({
            roomCode: roomCode,
            playerName: this.playerName,
            accepted: accepted
        }));
    }

    /**
     * Disconnect from server
     */
    disconnect() {
        if (this.stompClient) {
            this.subscriptions.forEach(sub => sub.unsubscribe());
            this.subscriptions = [];
            this.stompClient.disconnect();
            this.connected = false;
            this.updateConnectionStatus('disconnected', 'Disconnected');
        }
    }

    /**
     * Check if connected
     */
    isConnected() {
        return this.connected;
    }
}

// Export singleton
const wsClient = new WebSocketClient();