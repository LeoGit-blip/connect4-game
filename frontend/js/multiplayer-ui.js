/**
 * Multiplayer UI Controller
 * Handles multiplayer room creation, joining, and waiting room UI
 */
class MultiplayerUI {
    constructor() {
        this.wsClient = wsClient;
        this.currentRoom = null;
        this.isHost = false;
        this.playerName = null;
        this.connectionStatusElement = null;

        // Set up connection status callback
        this.wsClient.setConnectionStatusCallback((status, message) => {
            this.updateConnectionStatus(status, message);
        });
    }

    /**
     * Update connection status indicator
     */
    updateConnectionStatus(status, message) {
        if (!this.connectionStatusElement) {
            this.connectionStatusElement = document.getElementById('connectionStatus');
        }

        if (this.connectionStatusElement) {
            this.connectionStatusElement.className = `connection-status ${status}`;
            this.connectionStatusElement.textContent = message;
        }
    }

    /**
     * Show create room dialog
     */
    showCreateRoomDialog() {
        // Create modal dialog for room setup
        const dialog = this.createSetupDialog('Create Multiplayer Room', 'Create Room', (name) => {
            if (!name || name.trim().length === 0) {
                this.showCustomAlert('Missing Name', 'Please enter your name to continue.');
                return false;
            }
            this.createRoom(name.trim());
            return true;
        });

        document.body.appendChild(dialog);
    }

    /**
     * Show join room dialog
     */
    showJoinRoomDialog() {
        // Create modal dialog for joining
        const dialog = this.createJoinDialog();
        document.body.appendChild(dialog);
    }

    /**
     * Create setup dialog HTML
     */
    createSetupDialog(title, buttonText, onSubmit) {
        const dialog = document.createElement('div');
        dialog.className = 'multiplayer-setup-dialog';
        dialog.innerHTML = `
            <div class="setup-dialog-content">
                <h2>${title}</h2>
                <div class="setup-form">
                    <div class="form-group">
                        <label>Your Name</label>
                        <input type="text" id="setupPlayerName" placeholder="Enter your name" maxlength="20" autofocus>
                    </div>
                    <div class="form-actions">
                        <button class="btn btn-primary" id="setupSubmitBtn">${buttonText}</button>
                        <button class="btn btn-secondary" id="setupCancelBtn">Cancel</button>
                    </div>
                </div>
            </div>
        `;

        // Event listeners
        const nameInput = dialog.querySelector('#setupPlayerName');
        const submitBtn = dialog.querySelector('#setupSubmitBtn');
        const cancelBtn = dialog.querySelector('#setupCancelBtn');

        submitBtn.onclick = () => {
            if (onSubmit(nameInput.value)) {
                dialog.remove();
            }
        };

        cancelBtn.onclick = () => {
            dialog.remove();
        };

        nameInput.onkeypress = (e) => {
            if (e.key === 'Enter') {
                submitBtn.click();
            }
        };

        return dialog;
    }

    /**
     * Create join dialog with room code input
     */
    createJoinDialog() {
        const dialog = document.createElement('div');
        dialog.className = 'multiplayer-setup-dialog';
        dialog.innerHTML = `
            <div class="setup-dialog-content">
                <h2>Join Multiplayer Room</h2>
                <div class="setup-form">
                    <div class="form-group">
                        <label>Your Name</label>
                        <input type="text" id="joinPlayerName" placeholder="Enter your name" maxlength="20" autofocus>
                    </div>
                    <div class="form-group">
                        <label>Room Code</label>
                        <input type="text" id="joinRoomCode" placeholder="Enter 6-character code" maxlength="6" style="text-transform: uppercase;">
                    </div>
                    <div class="form-actions">
                        <button class="btn btn-primary" id="joinSubmitBtn">Join Room</button>
                        <button class="btn btn-secondary" id="joinCancelBtn">Cancel</button>
                    </div>
                </div>
            </div>
        `;

        const nameInput = dialog.querySelector('#joinPlayerName');
        const codeInput = dialog.querySelector('#joinRoomCode');
        const submitBtn = dialog.querySelector('#joinSubmitBtn');
        const cancelBtn = dialog.querySelector('#joinCancelBtn');

        submitBtn.onclick = () => {
            const name = nameInput.value.trim();
            const code = codeInput.value.trim().toUpperCase();

            if (!name) {
                this.showCustomAlert('Missing Name', 'Please enter your name to continue.');
                return;
            }
            if (!code || code.length !== 6) {
                this.showCustomAlert('Invalid Room Code', 'Please enter a valid 6-character room code.');
                return;
            }

            this.joinRoom(name, code);
            dialog.remove();
        };

        cancelBtn.onclick = () => {
            dialog.remove();
        };

        codeInput.oninput = (e) => {
            e.target.value = e.target.value.toUpperCase();
        };

        return dialog;
    }

    /**
     * Create a room with player name
     */
    createRoom(playerName) {
        this.playerName = playerName;

        // Sync menu settings so we use the user's preferred colors/theme
        this.syncMenuSettingsToStorage();

        // Show connecting message
        this.showConnectingMessage();

        // Connect to WebSocket
        this.wsClient.connect(
            () => {
                // Create room
                const config = this.buildRoomConfig();
                this.wsClient.createRoom(playerName, config, (response) => {
                    if (response.status === 'CREATED') {
                        this.showWaitingRoom(response.roomCode, true);
                    } else {
                        this.showError('Error creating room: ' + response.message);
                        this.hideConnectingMessage();
                    }
                });
            },
            (error) => {
                this.showError('Connection error. Please ensure the server is running.');
                this.hideConnectingMessage();
            }
        );
    }

    /**
     * Join a room
     */
    joinRoom(playerName, roomCode) {
        this.playerName = playerName;

        // Sync menu settings so we use the user's preferred colors/theme
        this.syncMenuSettingsToStorage();

        // Show connecting message
        this.showConnectingMessage();

        // Connect and join
        this.wsClient.connect(
            () => {
                this.wsClient.joinRoom(roomCode, playerName, (response) => {
                    if (response.status === 'JOINED') {
                        // Success - show waiting room as guest
                        this.showWaitingRoom(roomCode, false);

                        // Guest specific UI updates
                        document.getElementById('guestNameDisplay').textContent = playerName + ' (You)';
                        const guestCard = document.getElementById('guestPlayerCard');
                        if (guestCard) {
                            guestCard.classList.remove('empty');
                            guestCard.querySelector('.player-avatar').textContent = '👤';
                        }
                    } else {
                        this.showError('Error joining room: ' + response.message);
                        this.hideConnectingMessage();
                    }
                });
            },
            (error) => {
                this.showError('Connection error. Please ensure the server is running.');
                this.hideConnectingMessage();
            }
        );
    }

    /**
     * Display waiting room
     */
    showWaitingRoom(roomCode, isHost) {
        this.currentRoom = roomCode;
        this.isHost = isHost;

        // Hide menu and connecting message
        document.getElementById('modeSelection').classList.add('hidden');
        document.getElementById('playerConfig').classList.add('hidden');
        this.hideConnectingMessage();

        // Show waiting room
        const waitingRoom = document.getElementById('waitingRoom');
        if (!waitingRoom) {
            this.createWaitingRoomUI();
        }

        const waitingRoomEl = document.getElementById('waitingRoom');
        waitingRoomEl.classList.remove('hidden');

        // Display room code
        document.getElementById('displayRoomCode').textContent = roomCode;

        // Add connection status indicator
        this.addConnectionStatusToWaitingRoom();

        // Initialize Host Name if I am host
        if (isHost) {
            document.getElementById('hostNameDisplay').textContent = this.playerName;
        }

        // --- HOST VIEW LOGIC ---
        if (isHost) {
            document.getElementById('waitingMessage').textContent = 'Waiting for opponent to join...';
            document.getElementById('startMultiplayerBtn').classList.add('hidden');

            // Reset Guest slot to "Waiting" state
            const guestCard = document.getElementById('guestPlayerCard');
            const guestName = document.getElementById('guestNameDisplay');
            if (guestCard) {
                guestCard.classList.add('empty');
                guestCard.querySelector('.player-avatar').textContent = '❓';
                guestName.textContent = 'Waiting...';
            }

            // Subscribe to room updates
            this.wsClient.subscribeToRoom(roomCode, (update) => {
                const guestCard = document.getElementById('guestPlayerCard');
                const guestName = document.getElementById('guestNameDisplay');

                if (update.type === 'GUEST_JOINED') {
                    // Update Guest Slot
                    console.log('[MULTIPLAYER_UI] Guest Joined Event:', update.guestName);
                    if (guestCard) {
                        guestCard.classList.remove('empty');
                        guestCard.querySelector('.player-avatar').textContent = '👤';
                        guestName.textContent = update.guestName;
                    }

                    document.getElementById('waitingMessage').textContent =
                        `${update.guestName} joined! Ready to start.`;
                    document.getElementById('startMultiplayerBtn').classList.remove('hidden');
                    document.getElementById('startMultiplayerBtn').disabled = false;

                } else if (update.type === 'GUEST_LEFT') {
                    // Reset Guest Slot
                    if (guestCard) {
                        guestCard.classList.add('empty');
                        guestCard.querySelector('.player-avatar').textContent = '❓';
                        guestName.textContent = 'Waiting...';
                    }

                    document.getElementById('waitingMessage').textContent =
                        'Guest left. Waiting for opponent to join...';
                    document.getElementById('startMultiplayerBtn').classList.add('hidden');
                }
            });

            // --- GUEST VIEW LOGIC ---
        } else {
            console.log('[MULTIPLAYER_UI] Configuring Guest View');
            document.getElementById('waitingMessage').textContent = 'Waiting for host to start game...';
            document.getElementById('startMultiplayerBtn').classList.add('hidden');

            // 1. Update MY Slot (Guest)
            const guestCard = document.getElementById('guestPlayerCard');
            const guestName = document.getElementById('guestNameDisplay');

            if (guestCard && guestName) {
                console.log('[MULTIPLAYER_UI] Setting Guest Slot to:', this.playerName);
                guestCard.classList.remove('empty');
                guestCard.querySelector('.player-avatar').textContent = '👤';
                guestName.textContent = this.playerName + ' (You)';
            } else {
                console.error('[MULTIPLAYER_UI] Guest elements not found!');
            }

            // 2. Update Host Slot (Placeholder)
            const hostName = document.getElementById('hostNameDisplay');
            if (hostName) hostName.textContent = 'Host';

            // Subscribe to room updates
            this.wsClient.subscribeToRoom(roomCode, (update) => {
                console.log('[MULTIPLAYER_UI] Update received:', update);
                if (update.type === 'ROOM_CANCELLED') {
                    this.showCustomAlert('Room Cancelled', 'The host has ended this game session.', () => {
                        this.cancelRoom(true);
                    });
                }
                // Note: We could handle PLAYER_JOINED if the server sent it for the Host too, but mostly we wait for start.
            });
        }

        // Subscribe to game start ONLY - this is where we detect the game has actually started
        console.log('[MULTIPLAYER_UI] Setting up game start listener for room:', roomCode);
        this.wsClient.subscribeToGame(roomCode, (response) => {
            console.log('[MULTIPLAYER_UI] Game message received:', response);
            if (response.type === 'GAME_STARTED') {
                console.log('[MULTIPLAYER_UI] GAME_STARTED detected, navigating to game');
                this.startMultiplayerGame(roomCode, response);
            }
        });
    }

    /**
     * Add connection status indicator to waiting room
     */
    addConnectionStatusToWaitingRoom() {
        const waitingRoom = document.getElementById('waitingRoom');
        if (waitingRoom && !document.getElementById('connectionStatus')) {
            const statusDiv = document.createElement('div');
            statusDiv.id = 'connectionStatus';
            statusDiv.className = 'connection-status connected';
            statusDiv.textContent = 'Connected';
            waitingRoom.querySelector('.waiting-room-content').prepend(statusDiv);
        }
    }

    /**
     * Create waiting room UI elements
     */
    createWaitingRoomUI() {
        const waitingRoomHTML = `
            <div class="waiting-room hidden" id="waitingRoom">
                <div class="waiting-room-content">
                    <h2>Multiplayer Room</h2>
                    
                    <div class="room-code-display" style="margin-bottom: 2rem;">
                        <label>Room Code:</label>
                        <div class="room-code-box">
                            <span id="displayRoomCode">------</span>
                            <button class="btn-copy" id="copyCodeBtn" onclick="multiplayerUI.copyRoomCode()">
                                📋 Copy
                            </button>
                        </div>
                    </div>

                    <!-- VS Player Layout -->
                    <div class="players-vs-container">
                        <!-- Host Slot (Left) -->
                        <div class="player-card host">
                            <div class="host-crown">👑</div>
                            <div class="player-avatar">👤</div>
                            <div class="player-name" id="hostNameDisplay">Host</div>
                            <div class="player-role-badge" style="font-size: 0.8rem; opacity: 0.8; margin-top:0.2rem;">HOST</div>
                        </div>

                        <div class="vs-badge"><span>VS</span></div>

                        <!-- Guest Slot (Right) -->
                        <div class="player-card guest empty" id="guestPlayerCard">
                            <div class="player-avatar">❓</div>
                            <div class="player-name" id="guestNameDisplay">Waiting...</div>
                            <div class="player-role-badge" style="font-size: 0.8rem; opacity: 0.8; margin-top:0.2rem;">GUEST</div>
                        </div>
                    </div>

                    <p class="waiting-message" id="waitingMessage">Waiting for opponent to join...</p>

                    <div class="waiting-room-actions">
                        <button class="btn btn-secondary" id="cancelRoomBtn" onclick="multiplayerUI.cancelRoom()">
                            Cancel
                        </button>
                        <button class="btn btn-primary" id="startMultiplayerBtn" onclick="multiplayerUI.startGame()" disabled>
                            Start Game
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.querySelector('.menu-container').insertAdjacentHTML('beforeend', waitingRoomHTML);
    }

    /**
     * Copy room code to clipboard
     */
    copyRoomCode() {
        const roomCode = document.getElementById('displayRoomCode').textContent;
        navigator.clipboard.writeText(roomCode).then(() => {
            const btn = document.getElementById('copyCodeBtn');
            const originalText = btn.textContent;
            btn.textContent = '✓ Copied!';
            setTimeout(() => {
                btn.textContent = originalText;
            }, 2000);
        });
    }

    /**
     * Start multiplayer game
     */
    startGame() {
        if (!this.isHost) return;

        console.log('[MULTIPLAYER_UI] Host clicking start game button');
        this.wsClient.startGame(this.currentRoom);
    }

    /**
     * Navigate to game page
     */
    startMultiplayerGame(roomCode, gameData) {
        console.log('[MULTIPLAYER_UI] Starting multiplayer game, navigating to game.html');

        // Store multiplayer data in session storage
        sessionStorage.setItem('multiplayerMode', 'true');
        sessionStorage.setItem('roomCode', roomCode);
        sessionStorage.setItem('playerName', this.playerName);
        sessionStorage.setItem('isHost', this.isHost);

        // Navigate to game
        window.location.href = 'game.html';
    }

    /**
     * Cancel room and return to menu
     * @param {boolean} isRemote - If true, it means the cancel was triggered by an external event (like Host leaving), so we don't need to send a leave request.
     */
    cancelRoom(isRemote = false) {
        // Retrieve roomCode and playerName if possible
        const rawRoomCode = document.getElementById('displayRoomCode') ? document.getElementById('displayRoomCode').textContent : null;
        const roomCode = rawRoomCode ? rawRoomCode.trim() : null;

        console.log('[MULTIPLAYER_UI] cancelRoom called', { isRemote, roomCode, connected: this.wsClient.connected });

        if (!isRemote && roomCode && this.wsClient.connected) {
            console.log('[MULTIPLAYER_UI] Sending leaveRoom command...');
            this.wsClient.leaveRoom(roomCode, this.playerName);

            // Give the socket a moment to send the leave message before disconnecting
            setTimeout(() => {
                console.log('[MULTIPLAYER_UI] Disconnecting after leaveRoom...');
                this.wsClient.disconnect();
                document.getElementById('waitingRoom').classList.add('hidden');
                document.getElementById('modeSelection').classList.remove('hidden');
            }, 300); // Increased delay slightly to 300ms to be safe
            return;
        }

        console.log('[MULTIPLAYER_UI] Disconnecting immediately (remote or no connection)...');
        this.wsClient.disconnect();
        document.getElementById('waitingRoom').classList.add('hidden');
        document.getElementById('modeSelection').classList.remove('hidden');
    }

    /**
     * Build room configuration
     */
    buildRoomConfig() {
        let theme = 'classic';

        // We still want to send the valid theme if possible, but colors should be standard
        if (window.loadGameConfig) {
            const config = window.loadGameConfig();
            if (config && config.theme) {
                theme = config.theme;
            }
        }

        return {
            theme: theme,
            firstPlayer: 'RANDOM',
            hostColor: '#ff0040',
            guestColor: '#ffd700'
        };
    }

    /**
     * Show error message
     */
    showError(message) {
        alert(message);
    }

    /**
     * Show connecting message
     */
    showConnectingMessage() {
        const msg = document.createElement('div');
        msg.id = 'connectingMessage';
        msg.className = 'connecting-message';
        msg.textContent = 'Connecting to server';
        document.body.appendChild(msg);
    }

    /**
     * Hide connecting message
     */
    hideConnectingMessage() {
        const msg = document.getElementById('connectingMessage');
        if (msg) msg.remove();
    }

    /**
     * Syncs the current menu selections (colors, names, theme) to local storage.
     * This ensures that MultiplayerGame picks up the user's latest intended config,
     * even if they haven't explicitly started a local game to save it.
     */
    syncMenuSettingsToStorage() {
        try {
            const colorMap = {
                RED: "#ff0040", YELLOW: "#ffd700", BLUE: "#00d4ff", GREEN: "#10b981",
                BLACK: "#1f2937", PURPLE: "#a855f7", ORANGE: "#f97316", PINK: "#ec4899"
            };

            // Scrape Player 1 Config
            const p1Btn = document.querySelector('.color-btn[data-player="1"].active');
            const p1ColorName = p1Btn ? p1Btn.dataset.color : 'RED';
            const p1Color = colorMap[p1ColorName] || '#ff0040';
            const p1Name = document.getElementById('player1Name').value || 'Player 1';

            // Scrape Player 2 Config
            const p2Btn = document.querySelector('.color-btn[data-player="2"].active');
            const p2ColorName = p2Btn ? p2Btn.dataset.color : 'YELLOW';
            const p2Color = colorMap[p2ColorName] || '#ffd700';
            const p2Name = document.getElementById('player2Name').value || 'Player 2';

            // Scrape Theme
            const theme = document.getElementById('theme') ? document.getElementById('theme').value : 'classic';

            // Build minimal config for storage
            const config = {
                gameMode: 'MULTIPLAYER', // Placeholder
                player1: { name: p1Name, color: p1Color, isAI: false },
                player2: { name: p2Name, color: p2Color, isAI: false },
                theme: theme,
                firstPlayer: 'RANDOM'
            };

            // Save to storage
            if (window.saveGameConfig) {
                window.saveGameConfig(config);
                console.log('[MULTIPLAYER_UI] Synced menu settings to storage:', config);
            }
        } catch (e) {
            console.error('[MULTIPLAYER_UI] Failed to sync settings:', e);
        }
    }
    /**
     * Show a high-fidelity custom alert modal
     */
    showCustomAlert(title, message, callback) {
        // Remove any existing modal
        const existing = document.getElementById('customAlertModal');
        if (existing) existing.remove();

        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'custom-modal';
        modalOverlay.id = 'customAlertModal';

        // Warning Icon SVG
        const iconSvg = `
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
        `;

        modalOverlay.innerHTML = `
            <div class="custom-modal-content">
                <div class="custom-modal-icon">
                    ${iconSvg}
                </div>
                <h3 class="custom-modal-title">${title}</h3>
                <p class="custom-modal-message">${message}</p>
                <button class="custom-modal-btn">Got it</button>
            </div>
        `;

        const btn = modalOverlay.querySelector('.custom-modal-btn');
        btn.addEventListener('click', () => {
            // Animate out
            modalOverlay.style.opacity = '0';
            setTimeout(() => {
                modalOverlay.remove();
                if (callback) callback();
            }, 300);
        });

        document.body.appendChild(modalOverlay);
    }

    /**
     * Show a high-fidelity confirmation modal
     * @param {string} title 
     * @param {string} message 
     * @param {Function} onConfirm 
     * @param {Function} onCancel 
     */
    showCustomConfirm(title, message, onConfirm, onCancel) {
        // Remove any existing modal
        const existing = document.getElementById('customAlertModal');
        if (existing) existing.remove();

        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'custom-modal';
        modalOverlay.id = 'customAlertModal';

        // Question/Info Icon SVG
        const iconSvg = `
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
        `;

        modalOverlay.innerHTML = `
            <div class="custom-modal-content">
                <div class="custom-modal-icon" style="color: var(--color-accent-blue);">
                    ${iconSvg}
                </div>
                <h3 class="custom-modal-title">${title}</h3>
                <p class="custom-modal-message">${message}</p>
                <div class="custom-modal-actions" style="display: flex; gap: 1rem; width: 100%;">
                    <button class="custom-modal-btn secondary" id="modalCancelBtn" style="background: transparent; border: 2px solid var(--color-border);">Cancel</button>
                    <button class="custom-modal-btn primary" id="modalConfirmBtn" style="background: var(--gradient-danger);">Yes, Leave</button>
                </div>
            </div>
        `;

        const cancelBtn = modalOverlay.querySelector('#modalCancelBtn');
        const confirmBtn = modalOverlay.querySelector('#modalConfirmBtn');

        cancelBtn.addEventListener('click', () => {
            // Animate out
            modalOverlay.style.opacity = '0';
            setTimeout(() => {
                modalOverlay.remove();
                if (onCancel) onCancel();
            }, 300);
        });

        confirmBtn.addEventListener('click', () => {
            // Animate out
            modalOverlay.style.opacity = '0';
            setTimeout(() => {
                modalOverlay.remove();
                if (onConfirm) onConfirm();
            }, 300);
        });

        document.body.appendChild(modalOverlay);
    }
}

// Initialize
const multiplayerUI = new MultiplayerUI();