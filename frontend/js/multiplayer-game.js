/**
 * Multiplayer Game Handler
 * Manages WebSocket-based multiplayer game logic
 */
class MultiplayerGame {
    constructor() {
        this.wsClient = wsClient;
        this.roomCode = null;
        this.playerName = null;
        this.isHost = false;
        this.isMyTurn = false;
        this.currentBoard = null;
        this.gameStarted = false;
    }

    /**
     * Initialize multiplayer game from session storage
     */
    async init() {
        // Get multiplayer data from session storage
        const isMultiplayer = sessionStorage.getItem('multiplayerMode') === 'true';

        if (!isMultiplayer) {
            return false; // Not a multiplayer game
        }

        this.roomCode = sessionStorage.getItem('roomCode');
        this.playerName = sessionStorage.getItem('playerName');
        this.isHost = sessionStorage.getItem('isHost') === 'true';

        console.log('Initializing multiplayer game:', {
            roomCode: this.roomCode,
            playerName: this.playerName,
            isHost: this.isHost
        });

        // CRITICAL: Update wsClient's playerName from session storage
        // This is needed because game.html creates a new page load
        if (this.wsClient) {
            this.wsClient.playerName = this.playerName;
            console.log('[MULTIPLAYER_GAME] Set wsClient.playerName to:', this.wsClient.playerName);
        }

        // Connect to WebSocket if not already connected
        if (!this.wsClient.isConnected()) {
            console.log('[MULTIPLAYER_GAME] WebSocket not connected, connecting now...');
            await this.connectToServer();
        } else {
            console.log('[MULTIPLAYER_GAME] WebSocket already connected');
        }

        // Subscribe to game updates FIRST
        this.subscribeToGameUpdates();

        // Give a bit of time to ensure subscription is registered on server
        await this.sleep(500);

        // If host, start the game after subscription is established
        if (this.isHost) {
            console.log('Host starting game after subscription delay...');
            this.wsClient.startGame(this.roomCode);
        }

        return true; // This is a multiplayer game
    }

    /**
     * Connect to WebSocket server
     */
    connectToServer() {
        return new Promise((resolve, reject) => {
            console.log('[MULTIPLAYER_GAME] Attempting to connect to WebSocket...');

            this.wsClient.connect(
                () => {
                    console.log('[MULTIPLAYER_GAME] Connected to multiplayer server');
                    // CRITICAL: Restore playerName after connecting
                    this.wsClient.playerName = this.playerName;
                    console.log('[MULTIPLAYER_GAME] Restored playerName to wsClient:', this.wsClient.playerName);
                    resolve();
                },
                (error) => {
                    console.error('Failed to connect to server:', error);
                    reject(error);
                }
            );
        });
    }

    /**
     * Subscribe to game updates for this room
     */
    subscribeToGameUpdates() {
        console.log('[MULTIPLAYER_GAME] Subscribing to game updates for room:', this.roomCode);

        // Subscribe to game events (moves, game start, game over)
        const gameSubscription = this.wsClient.subscribeToGame(
            this.roomCode,
            (response) => {
                console.log('[MULTIPLAYER_GAME] Game message received:', response);
                this.handleGameUpdate(response);
            }
        );
        console.log('[MULTIPLAYER_GAME] Game subscription created');

        // Subscribe to room events (rematch invitations, guest joined, etc)
        const roomSubscription = this.wsClient.subscribeToRoom(this.roomCode, (response) => {
            console.log('[MULTIPLAYER_GAME] Room message received:', response);

            if (response.type === 'REMATCH_INVITATION') {
                console.log('[MULTIPLAYER_GAME] REMATCH_INVITATION detected!');
                this.handleRematchInvitation(response);
            } else if (response.type === 'REMATCH_DECLINED') {
                console.log('[MULTIPLAYER_GAME] REMATCH_DECLINED detected!');
                this.handleRematchDeclined(response);
            } else if (response.type === 'GUEST_JOINED') {
                console.log('[MULTIPLAYER_GAME] GUEST_JOINED detected');
            } else if (response.type === 'GUEST_LEFT') {
                console.log('[MULTIPLAYER_GAME] GUEST_LEFT detected.', {
                    leaver: response.guestName,
                    me: this.playerName,
                    isHost: this.isHost
                });

                // Logic: If I am the guest who left, I don't need a notification.
                // If I am the host, I need to know the guest left.
                if (response.guestName === this.playerName) {
                    console.log('I am the guest who left. Ignoring notification.');
                    return;
                }

                console.log('Opponent left. Showing notification.');

                if (window.app && typeof window.app.showCustomAlert === 'function') {
                    window.app.showCustomAlert('Opponent Left', 'The opponent has left the game.', () => {
                        this.cleanup();
                        sessionStorage.removeItem('multiplayerMode');
                        window.location.href = 'index.html';
                    });
                } else if (window.multiplayerUI && typeof window.multiplayerUI.showCustomAlert === 'function') {
                    window.multiplayerUI.showCustomAlert('Opponent Left', 'The opponent has left the game.', () => {
                        this.cleanup();
                        sessionStorage.removeItem('multiplayerMode');
                        window.location.href = 'index.html';
                    });
                } else {
                    alert('The opponent has left the game.');
                    this.cleanup();
                    sessionStorage.removeItem('multiplayerMode');
                    window.location.href = 'index.html';
                }

            } else if (response.type === 'ROOM_CANCELLED') {
                console.log('[MULTIPLAYER_GAME] ROOM_CANCELLED detected.', {
                    isHost: this.isHost,
                    me: this.playerName
                });

                // Logic: If I am the host, I initiated this. I don't need a notification.
                // If I am the guest, I need to know the host closed the room.
                if (this.isHost) {
                    console.log('I am the host who cancelled. Ignoring notification.');
                    return;
                }

                console.log('Host cancelled. Showing notification.');

                if (window.app && typeof window.app.showCustomAlert === 'function') {
                    window.app.showCustomAlert('Room Closed', 'The host has left the game.', () => {
                        this.cleanup();
                        sessionStorage.removeItem('multiplayerMode');
                        window.location.href = 'index.html';
                    });
                } else if (window.multiplayerUI && typeof window.multiplayerUI.showCustomAlert === 'function') {
                    window.multiplayerUI.showCustomAlert('Room Closed', 'The host has left the game.', () => {
                        this.cleanup();
                        sessionStorage.removeItem('multiplayerMode');
                        window.location.href = 'index.html';
                    });
                } else {
                    alert('The host has left the game.');
                    this.cleanup();
                    sessionStorage.removeItem('multiplayerMode');
                    window.location.href = 'index.html';
                }
            }
        });
        console.log('[MULTIPLAYER_GAME] Room subscription created');
    }

    /**
     * Handle game update from server
     */
    handleGameUpdate(response) {
        console.log('=== GAME UPDATE RECEIVED ===');
        console.log('Type:', response.type);
        console.log('Full Response:', response);

        if (!response.type) {
            console.error('Response has no type!', response);
            return;
        }

        if (response.type === 'GAME_STARTED') {
            console.log('Handling GAME_STARTED');
            this.handleGameStart(response);
        } else if (response.type === 'MOVE_MADE') {
            console.log('Handling MOVE_MADE');
            this.handleOpponentMove(response);
        } else if (response.type === 'GAME_OVER') {
            console.log('Handling GAME_OVER');
            this.handleGameOver(response);
        } else if (response.type === 'REMATCH_INVITATION') {
            console.log('Handling REMATCH_INVITATION');
            this.handleRematchInvitation(response);
        } else {
            console.log('Unknown message type:', response.type);
        }
    }

    /**
     * Handle game start
     */
    handleGameStart(response) {
        console.log('Game started!', response);

        // Clean up any rematch modals
        const rematchWaitingModal = document.getElementById('rematchWaitingModal');
        if (rematchWaitingModal) rematchWaitingModal.remove();

        const rematchInvitationModal = document.getElementById('rematchInvitationModal');
        if (rematchInvitationModal) rematchInvitationModal.remove();

        this.gameStarted = true;
        this.currentBoard = response.board;

        // Store player names from response (for rematch, these might already be set)
        if (response.hostName && response.guestName) {
            this.hostName = response.hostName;
            this.guestName = response.guestName;
        }

        // Map player colors to names
        this.playerNames = {
            'RED': this.hostName,
            'YELLOW': this.guestName
        };

        console.log('Player mapping:', this.playerNames);
        console.log('hostName:', this.hostName, 'guestName:', this.guestName);
        console.log('isHost:', this.isHost);

        // Set up color mapping validation
        const p1Color = '#ff0040'; // Always Red for Host
        const p2Color = '#ffd700'; // Always Yellow for Guest

        console.log('Using standard multiplayer colors:', { p1Color, p2Color });

        // Set up color mapping in gameUI
        gameUI.setupColorMapping(p1Color, p2Color);
        gameUI.updatePlayerNames(this.hostName, this.guestName);

        // Initialize the game UI
        gameUI.initBoard();
        gameUI.isGameActive = true; // Ensure game is active
        gameUI.renderBoard(this.convertBoard(response.board));

        // Reset app move lock
        if (window.app) {
            window.app.moveInProgress = false;
        }

        // Clear move history for new game
        gameUI.clearMoveHistory();

        // Determine if it's my turn
        const currentPlayer = response.currentPlayer;
        console.log('currentPlayer from server:', currentPlayer);

        this.isMyTurn = this.isMyTurnCheck(currentPlayer);
        console.log('isMyTurnCheck result:', this.isMyTurn);
        console.log('Expected: host is RED, guest is YELLOW');
        console.log('I am:', this.isHost ? 'RED (host)' : 'YELLOW (guest)');

        console.log('Current player:', currentPlayer, 'Is my turn:', this.isMyTurn);

        // Update turn display with player name AND update gameUI
        this.updateTurnDisplay(currentPlayer);
        gameUI.updateCurrentPlayer(currentPlayer); // This updates the UI display

        // CRITICAL: Always enable or disable based on isMyTurn
        if (!this.isMyTurn) {
            console.log('Disabling board - waiting for opponent');
            gameUI.disableBoard();
        } else {
            console.log('Enabling board - it is my turn!');
            gameUI.enableBoard();
        }

        // Update game ID display
        document.getElementById('gameId').textContent = `Room: ${this.roomCode}`;

        // Show player info
        this.showPlayerInfo();

        // Enforce local theme preference
        // This ensures the host's theme doesn't override the guest's local choice
        try {
            const savedTheme = localStorage.getItem('connect4-theme');
            if (savedTheme) {
                document.body.setAttribute('data-theme', savedTheme);
                console.log('[MULTIPLAYER_GAME] Enforcing local theme:', savedTheme);
            }
        } catch (e) {
            console.warn('Failed to re-apply local theme', e);
        }
    }

    /**
     * Update turn display with player name
     */
    updateTurnDisplay(currentPlayer) {
        const playerName = this.playerNames[currentPlayer];

        // Update gameUI current player display
        if (gameUI && gameUI.updateCurrentPlayer) {
            gameUI.updateCurrentPlayer(currentPlayer);
        }

        // Also update the custom turn indicator if it exists
        const turnIndicator = document.getElementById('currentPlayerIndicator');
        if (turnIndicator) {
            turnIndicator.textContent = `${playerName}'s Turn`;
            // Update color class
            turnIndicator.className = 'current-player-indicator';
            turnIndicator.classList.add(currentPlayer === 'RED' ? 'red' : 'yellow');
        }
    }

    /**
     * Show player info in game
     */
    showPlayerInfo() {
        const gameId = document.getElementById('gameId');
        if (gameId) {
            // Remove old player info if it exists
            const oldPlayerInfo = document.querySelector('.multiplayer-player-info');
            if (oldPlayerInfo) {
                oldPlayerInfo.remove();
            }

            const playerInfo = document.createElement('div');
            playerInfo.className = 'multiplayer-player-info';
            // High-fidelity structure
            playerInfo.innerHTML = `
                <div class="player-card host">
                    <div class="player-avatar red">
                        <span>${this.hostName.charAt(0).toUpperCase()}</span>
                    </div>
                    <div class="player-details">
                        <span class="player-name">${this.hostName}</span>
                        <span class="player-role">HOST</span>
                    </div>
                </div>
                
                <div class="vs-badge">
                    <span>VS</span>
                </div>

                <div class="player-card guest">
                    <div class="player-details right">
                        <span class="player-name">${this.guestName}</span>
                        <span class="player-role">GUEST</span>
                    </div>
                    <div class="player-avatar yellow">
                        <span>${this.guestName.charAt(0).toUpperCase()}</span>
                    </div>
                </div>
            `;

            // Insert after the board
            const boardElement = document.querySelector('.board');
            if (boardElement && boardElement.parentNode) {
                boardElement.parentNode.insertBefore(playerInfo, boardElement.nextSibling);
            } else {
                // Fallback if board not found (unlikely)
                gameId.parentNode.insertBefore(playerInfo, gameId.nextSibling);
            }
        }
    }

    /**
     * Handle opponent's move
     */
    async handleOpponentMove(response) {
        console.log('=== OPPONENT MOVE RECEIVED ===');
        console.log('Full response:', response);
        console.log('Board data:', response.board);
        console.log('Move details:', { column: response.column, player: response.player });

        // Play piece drop sound
        if (window.audioManager) {
            window.audioManager.playPieceDrop();
        }

        // Animate the piece drop
        const rowIndex = this.findRow(response.board, response.column);
        console.log('Animating drop at column', response.column, 'row', rowIndex);
        gameUI.animatePieceDrop(
            response.column,
            rowIndex,
            response.player
        );

        // FIXED: Only add to history if this move is from opponent
        // Check if this move was made by me (already added optimistically)
        const playerColor = this.isHost ? 'RED' : 'YELLOW';
        if (response.player !== playerColor) {
            // This is an opponent move, add it to history
            const moveNumber = this.calculateMoveNumber(response.board);
            gameUI.addMoveToHistory({
                column: response.column,
                player: response.player
            }, moveNumber);
        } else {
            console.log('Skipping addMoveToHistory - this was my move (already added optimistically)');
        }

        // Wait for animation
        await this.sleep(500);

        // Update board
        this.currentBoard = response.board;
        console.log('Current board after move:', this.currentBoard);

        // Convert and render
        const convertedBoard = this.convertBoard(response.board);
        console.log('Converted board:', convertedBoard);
        gameUI.renderBoard(convertedBoard);
        console.log('Board rendered');

        // Update column states to disable full columns
        gameUI.updateColumnStates(response.board);

        // Update current player with name
        this.updateTurnDisplay(response.currentPlayer);

        // Check if it's my turn now
        this.isMyTurn = this.isMyTurnCheck(response.currentPlayer);
        console.log('After opponent move - isMyTurn:', this.isMyTurn, 'currentPlayer:', response.currentPlayer);

        if (this.isMyTurn) {
            console.log('Enabling board for my turn');
            gameUI.enableBoard();
        } else {
            console.log('Disabling board - waiting for opponent');
            gameUI.disableBoard();
        }

        // CRITICAL: Reset the app's moveInProgress flag so player can move again
        if (window.app) {
            window.app.moveInProgress = false;
            console.log('Reset app.moveInProgress flag');
        }
    }

    /**
     * Calculate move number based on board state
     */
    calculateMoveNumber(board) {
        let count = 0;
        if (board && Array.isArray(board)) {
            for (let r = 0; r < board.length; r++) {
                for (let c = 0; c < board[r].length; c++) {
                    if (board[r][c] !== 'NONE' && board[r][c] !== null) {
                        count++;
                    }
                }
            }
        }
        return count; // Current count is the move number for the move just made
    }

    /**
     * Handle game over
     */
    async handleGameOver(response) {
        console.log('Game over:', response);

        // CRITICAL FIX: Render the final board state first (includes winning move)
        if (response.board) {
            console.log('Rendering final board state with winning move');
            this.currentBoard = response.board;
            const convertedBoard = this.convertBoard(response.board);
            gameUI.renderBoard(convertedBoard);

            // CRITICAL: Add final move to history if this is opponent's winning move
            // The player who made the move already added it optimistically
            // But the opponent needs to see it in their history
            if (response.column !== undefined && response.player) {
                const playerColor = this.isHost ? 'RED' : 'YELLOW';
                // Only add if this was opponent's move (not our own)
                if (response.player !== playerColor) {
                    const moveNumber = this.calculateMoveNumber(response.board);
                    gameUI.addMoveToHistory({
                        column: response.column,
                        player: response.player
                    }, moveNumber);
                    console.log('Added final winning move to opponent history');
                }
            }

            // Highlight winning line if present
            if (response.winningLine && response.winningLine.length > 0) {
                console.log('Highlighting winning line:', response.winningLine);
                response.winningLine.forEach(pos => {
                    const [row, col] = pos;
                    // Find the cell and add winning class to the piece
                    const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                    if (cell) {
                        const piece = cell.querySelector('.piece');
                        if (piece) {
                            piece.classList.add('winning');
                            console.log(`Added winning class to piece at [${row}, ${col}]`);
                        }
                    }
                });
            }
        }

        gameUI.isGameActive = false;
        gameUI.disableBoard();

        // Play appropriate sound
        if (response.gameStatus === 'DRAW') {
            if (window.audioManager) window.audioManager.playDraw();
            gameUI.showWinner('DRAW');
        } else {
            if (window.audioManager) window.audioManager.playWin();
            if (window.confettiManager) {
                window.confettiManager.burst();
            }

            // Determine winner
            const winner = response.gameStatus === 'RED_WINS' ? 'RED' : 'YELLOW';
            gameUI.showWinner(winner);
        }

        // Show rematch button in modal
        this.showRematchButton();
    }

    /**
     * Make a move in multiplayer game
     */
    async makeMove(column) {
        console.log('=== MAKE MOVE DEBUG ===');
        console.log('isMyTurn:', this.isMyTurn);
        console.log('gameStarted:', this.gameStarted);
        console.log('column:', column);

        if (!this.gameStarted) {
            console.log('Game not started yet');
            return false;
        }

        if (!this.isMyTurn) {
            console.log('Not your turn!');
            console.log('You are:', this.isHost ? 'HOST (RED)' : 'GUEST (YELLOW)');
            console.log('Current player should be:', this.isHost ? 'RED' : 'YELLOW');
            return false;
        }

        console.log(`Making multiplayer move in column ${column}`);

        // Disable board immediately to prevent spam clicking
        gameUI.disableBoard();

        // Optimistically update turn state
        this.isMyTurn = false;

        // Send move to server
        this.wsClient.sendMove(this.roomCode, column);

        // FIXED: Add move to history optimistically (will be shown only once)
        const playerColor = this.isHost ? 'RED' : 'YELLOW';

        // Count pieces for move number (approximate until server confirms)
        let pieceCount = 0;
        if (this.currentBoard) {
            for (let r = 0; r < this.currentBoard.length; r++) {
                for (let c = 0; c < this.currentBoard[r].length; c++) {
                    if (this.currentBoard[r][c] !== 'NONE') pieceCount++;
                }
            }
        }

        gameUI.addMoveToHistory({
            column: column,
            player: playerColor
        }, pieceCount + 1);

        // Log that move was sent
        console.log('Move sent to server for column:', column);

        return true;
    }

    /**
     * Check if it's my turn
     */
    isMyTurnCheck(currentPlayer) {
        // Host is RED, Guest is YELLOW
        if (this.isHost) {
            return currentPlayer === 'RED';
        } else {
            return currentPlayer === 'YELLOW';
        }
    }

    /**
     * Convert backend board format to frontend format
     */
    convertBoard(backendBoard) {
        // Backend sends Player enum (RED, YELLOW, NONE)
        // Frontend expects same format, so just return it
        return backendBoard;
    }

    /**
     * Find the row where a piece landed in a column
     */
    findRow(board, column) {
        // Find the topmost filled piece in the column
        for (let row = board.length - 1; row >= 0; row--) {
            const cell = board[row][column];
            // Check for both 'NONE' string and null
            if (cell && cell !== 'NONE' && cell !== null) {
                return row;
            }
        }
        return board.length - 1;
    }

    /**
     * Show rematch button
     */
    showRematchButton() {
        const playAgainBtn = document.getElementById('playAgainBtn');
        if (playAgainBtn) {
            // Update text to "Rematch"
            playAgainBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                Rematch
            `;

            // Remove old event listener and add new one
            const newBtn = playAgainBtn.cloneNode(true);
            playAgainBtn.parentNode.replaceChild(newBtn, playAgainBtn);

            newBtn.addEventListener('click', () => {
                if (window.audioManager) window.audioManager.playButtonClick();
                this.requestRematch();
            });
        }
    }

    /**
     * Request a rematch
     */
    requestRematch() {
        console.log('Requesting rematch...');

        // Hide modal
        const modal = document.getElementById('winnerModal');
        if (modal) {
            modal.classList.remove('show');
            modal.style.display = 'none';
        }

        // Send rematch request
        this.wsClient.requestRematch(this.roomCode);

        console.log('Rematch request sent');
    }

    /**
     * Handle rematch invitation from opponent
     */
    handleRematchInvitation(response) {
        console.log('[MULTIPLAYER_GAME] handleRematchInvitation called with:', response);
        console.log('Received rematch invitation from:', response.fromPlayer);

        // If we're the one who sent it, show waiting message
        if (response.fromPlayer === this.playerName) {
            console.log('[MULTIPLAYER_GAME] We sent the rematch request, showing waiting message');

            // Hide winner modal
            const winnerModal = document.getElementById('winnerModal');
            if (winnerModal) {
                winnerModal.classList.remove('show');
                winnerModal.style.display = 'none';
            }

            // Show waiting modal using winner-modal structure for consistency
            const waitingModal = document.createElement('div');
            waitingModal.className = 'winner-modal show'; // Reuse winner-modal class
            waitingModal.id = 'rematchWaitingModal';
            waitingModal.style.display = 'flex';

            waitingModal.innerHTML = `
                <div class="winner-content">
                    <div class="winner-icon blue">
                        <!-- Spinner using simple CSS or SVG -->
                        <div class="ai-thinking-spinner" style="width: 40px; height: 40px; border-width: 4px; margin: 0 auto;"></div>
                    </div>
                    <h2 class="winner-title" style="font-size: 2rem;">Waiting...</h2>
                    <p class="winner-message">Waiting for ${response.opponent || (this.isHost ? this.guestName : this.hostName)} to accept...</p>
                </div>
            `;

            document.body.appendChild(waitingModal);
            return;
        }

        // Otherwise, show the opponent's rematch invitation
        console.log('[MULTIPLAYER_GAME] Opponent sent rematch invitation, showing accept/decline');

        // Hide the winner modal first
        const winnerModal = document.getElementById('winnerModal');
        if (winnerModal) {
            winnerModal.classList.remove('show');
            winnerModal.style.display = 'none';
        }

        // Create a proper modal dialog using winner-modal structure
        const rematchModal = document.createElement('div');
        rematchModal.className = 'winner-modal show'; // Reuse winner-modal class
        rematchModal.id = 'rematchInvitationModal';
        rematchModal.style.display = 'flex';

        rematchModal.innerHTML = `
            <div class="winner-content">
                <div class="winner-icon purple">
                    <span style="font-size: 40px; font-weight: bold; color: white;">?</span>
                </div>
                <h2 class="winner-title" style="font-size: 2rem;">Rematch?</h2>
                <p class="winner-message" style="margin-bottom: 2rem;">${response.fromPlayer} wants to play again!</p>
                <div class="winner-buttons">
                    <button class="btn btn-large btn-primary" id="acceptRematchBtn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Accept
                    </button>
                    <button class="btn btn-large btn-secondary" id="declineRematchBtn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                             <line x1="18" y1="6" x2="6" y2="18"></line>
                             <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                        Decline
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(rematchModal);

        // Add event listeners
        setTimeout(() => {
            const acceptBtn = document.getElementById('acceptRematchBtn');
            const declineBtn = document.getElementById('declineRematchBtn');

            if (acceptBtn) {
                acceptBtn.addEventListener('click', () => {
                    console.log('[MULTIPLAYER_GAME] Accepting rematch');
                    const modal = document.getElementById('rematchInvitationModal');
                    if (modal) modal.remove();
                    this.wsClient.respondToRematch(this.roomCode, true);
                });
            }

            if (declineBtn) {
                declineBtn.addEventListener('click', () => {
                    console.log('[MULTIPLAYER_GAME] Declining rematch');
                    const modal = document.getElementById('rematchInvitationModal');
                    if (modal) modal.remove();
                    this.wsClient.respondToRematch(this.roomCode, false);
                });
            }
        }, 50);
    }

    /**
     * Handle rematch declined by opponent
     */
    handleRematchDeclined(response) {
        console.log('[MULTIPLAYER_GAME] handleRematchDeclined called');
        console.log('Rematch declined by:', response.playerName);

        // Remove waiting modal if it exists
        const waitingModal = document.getElementById('rematchWaitingModal');
        if (waitingModal) {
            waitingModal.remove();
        }

        alert(`${response.playerName} declined the rematch.`);

        // Show the modal again so they can try again or go back to menu
        const modal = document.getElementById('winnerModal');
        if (modal) {
            modal.classList.add('show');
            modal.style.display = 'flex';
        }
    }

    /**
     * Utility sleep function
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Cleanup on page unload
     */
    cleanup() {
        // Clear session storage
        sessionStorage.removeItem('multiplayerMode');
        sessionStorage.removeItem('roomCode');
        sessionStorage.removeItem('playerName');
        sessionStorage.removeItem('isHost');
    }
}

// Create singleton instance
const multiplayerGame = new MultiplayerGame();