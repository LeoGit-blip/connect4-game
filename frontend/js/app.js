/**
 * Main Application Controller
 * Coordinates between UI and API, handles AI integration
 */

class App {
    constructor() {
        this.currentGameId = null;
        this.currentGameState = null;
        this.gameConfig = null;
        this.moveInProgress = false; // Prevent spam clicking
        this.isMultiplayer = false; // Track multiplayer mode
    }

    /**
     * Initializes the application
     */
    async init() {
        console.log('Initializing Connect 4 Game...');

        // Check if this is a multiplayer game
        const isMultiplayer = sessionStorage.getItem('multiplayerMode') === 'true';

        if (isMultiplayer) {
            console.log('Multiplayer mode detected!');
            this.isMultiplayer = true;

            // Initialize UI
            gameUI.initBoard();
            this.setupEventListeners();

            // Initialize multiplayer game
            try {
                await multiplayerGame.init();
                console.log('Multiplayer game initialized');
            } catch (error) {
                console.error('Failed to initialize multiplayer:', error);
                alert('Failed to connect to multiplayer game. Returning to menu.');
                window.location.href = 'index.html';
            }
            return;
        }

        // Regular single-player/AI game initialization
        // Check for configuration from menu
        const urlParams = new URLSearchParams(window.location.search);
        const configParam = urlParams.get('config');

        if (configParam) {
            try {
                this.gameConfig = JSON.parse(decodeURIComponent(configParam));
                console.log('Loaded configuration from URL:', this.gameConfig);
            } catch (error) {
                console.error('Failed to parse configuration:', error);
            }
        }

        // Fallback to localStorage if no URL config
        if (!this.gameConfig) {
            console.log('No URL config, checking localStorage...');
            const savedConfig = loadGameConfig();
            if (savedConfig) {
                this.gameConfig = savedConfig;
                console.log('Loaded configuration from localStorage:', this.gameConfig);
            }
        }

        // Initialize UI
        gameUI.initBoard();

        // Set up event listeners
        this.setupEventListeners();

        // Create initial game
        if (this.gameConfig) {
            await this.createConfiguredGame();
        } else {
            // This should rarely happen now as loadGameConfig returns defaults
            console.warn('No configuration found, redirecting to menu');
            window.location.href = 'index.html';
        }
    }

    /**
     * Sets up all event listeners
     */
    setupEventListeners() {
        // Board click handler
        const board = document.getElementById('gameBoard');
        if (board) {
            board.addEventListener('click', (e) => {
                const column = e.target.closest('.column');
                // Check: column exists, not disabled, game active, and no move in progress
                if (column && !column.classList.contains('disabled') && gameUI.isGameActive && !this.moveInProgress) {
                    window.audioManager.playButtonClick();
                    const columnIndex = parseInt(column.dataset.column);
                    this.handleColumnClick(columnIndex);
                }
            });
        }

        // Back to menu button
        const menuBtn = document.getElementById('menuBtn');
        if (menuBtn) {
            menuBtn.addEventListener('click', (e) => {
                if (window.audioManager) window.audioManager.playButtonClick();

                // Check if in multiplayer mode
                const isMultiplayer = sessionStorage.getItem('multiplayerMode') === 'true';

                if (isMultiplayer) {
                    // Prevent default navigation
                    e.preventDefault();

                    this.showCustomConfirm(
                        'Leave Game?',
                        'Are you sure you want to leave? The game will be ended.',
                        () => {
                            // On Confirm
                            if (typeof multiplayerGame !== 'undefined') {
                                // Try to leave room politely 
                                if (multiplayerGame.roomCode && multiplayerGame.wsClient && multiplayerGame.wsClient.connected) {
                                    console.log('Sending leave request before exit');
                                    multiplayerGame.wsClient.leaveRoom(multiplayerGame.roomCode, multiplayerGame.playerName);
                                }
                                multiplayerGame.cleanup();
                            }
                            sessionStorage.removeItem('multiplayerMode');

                            // Give the socket a moment to send the leave message before redirecting
                            setTimeout(() => {
                                window.location.href = 'index.html';
                            }, 500);
                        }
                    );
                    return;
                }

                // Standard Exit
                if (typeof multiplayerGame !== 'undefined') {
                    multiplayerGame.cleanup();
                }
                sessionStorage.removeItem('multiplayerMode');
                window.location.href = 'index.html';
            });
        }


        // Play again button in modal - restart game with same config
        const playAgainBtn = document.getElementById('playAgainBtn');
        if (playAgainBtn) {
            playAgainBtn.addEventListener('click', async () => {
                window.audioManager.playButtonClick();
                // Hide the modal
                const modal = document.getElementById('winnerModal');
                if (modal) {
                    modal.classList.remove('show');
                    modal.style.display = 'none';
                }
                // Restart the game with the same configuration
                await this.createConfiguredGame();
            });
        }

        // Back to menu button in modal
        const backToMenuBtn = document.getElementById('backToMenuBtn');
        if (backToMenuBtn) {
            backToMenuBtn.addEventListener('click', (e) => {
                if (window.audioManager) window.audioManager.playButtonClick();

                // Check if in multiplayer mode
                const isMultiplayer = sessionStorage.getItem('multiplayerMode') === 'true';

                if (isMultiplayer) {
                    // Prevent default navigation if needed (though it's a button)
                    e.preventDefault();

                    this.showCustomConfirm(
                        'Leave Game?',
                        'Are you sure you want to leave? The game will be ended.',
                        () => {
                            // On Confirm
                            if (typeof multiplayerGame !== 'undefined') {
                                // Try to leave room politely 
                                if (multiplayerGame.roomCode && multiplayerGame.wsClient && multiplayerGame.wsClient.connected) {
                                    console.log('Sending leave request before exit');
                                    multiplayerGame.wsClient.leaveRoom(multiplayerGame.roomCode, multiplayerGame.playerName);
                                }
                                multiplayerGame.cleanup();
                            }
                            sessionStorage.removeItem('multiplayerMode');

                            // Give the socket a moment to send the leave message before redirecting
                            setTimeout(() => {
                                window.location.href = 'index.html';
                            }, 500);
                        }
                    );
                    return;
                }

                // Standard Exit
                // Cleanup multiplayer session if it exists (safety check)
                if (typeof multiplayerGame !== 'undefined') {
                    multiplayerGame.cleanup();
                }
                sessionStorage.removeItem('multiplayerMode');
                window.location.href = 'index.html';
            });
        }


        // Audio controls
        const muteBtn = document.getElementById('muteBtn');
        if (muteBtn) {
            muteBtn.addEventListener('click', () => {
                const muted = window.audioManager.toggleMute();
                muteBtn.classList.toggle('muted', muted);
            });
        }

        // View Board button functionality
        const viewBoardBtn = document.getElementById('viewBoardBtn');
        const winnerModal = document.getElementById('winnerModal');

        if (viewBoardBtn && winnerModal) {
            viewBoardBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent event bubbling
                console.log('View Board clicked!');
                window.audioManager.playButtonClick();
                winnerModal.classList.add('minimized');
            });

            // Click on minimized modal to expand it again
            winnerModal.addEventListener('click', (e) => {
                if (winnerModal.classList.contains('minimized') && !e.target.closest('.btn')) {
                    console.log('Expanding modal');
                    window.audioManager.playButtonClick();
                    winnerModal.classList.remove('minimized');
                }
            });
        } else {
            console.log('View Board button or modal not found:', { viewBoardBtn, winnerModal });
        }

        const volumeSlider = document.getElementById('volumeSlider');
        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                const volume = parseInt(e.target.value) / 100;
                window.audioManager.setVolume(volume);
            });

            // Set initial value from saved settings
            volumeSlider.value = window.audioManager.getVolume() * 100;
        }

        // Initialize mute button state
        if (muteBtn && window.audioManager.isMuted()) {
            muteBtn.classList.add('muted');
        }
    }

    /**
     * Show a high-fidelity alert modal
     * @param {string} title 
     * @param {string} message 
     * @param {Function} callback 
     */
    showCustomAlert(title, message, callback) {
        // Remove any existing modal
        const existing = document.getElementById('customAlertModal');
        if (existing) existing.remove();

        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'custom-modal';
        modalOverlay.id = 'customAlertModal';

        // Warning/Info Icon SVG
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
                <button class="custom-modal-btn" id="modalOkBtn">Got it</button>
            </div>
        `;

        const btn = modalOverlay.querySelector('#modalOkBtn');
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
                    <button class="custom-modal-btn secondary" id="modalCancelBtn" style="background: transparent; border: 2px solid var(--color-border); color: var(--color-text-primary);">Cancel</button>
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

    /**
     * Creates a configured game
     */
    async createConfiguredGame() {
        try {
            console.log('Creating configured game...');
            console.log('Config:', this.gameConfig);

            // Apply theme from global theme selector (localStorage)
            // Don't override with gameConfig.theme to respect user's global theme choice
            const savedTheme = localStorage.getItem('connect4-theme');
            if (savedTheme) {
                document.body.setAttribute('data-theme', savedTheme);
            }

            // Build config request
            const configRequest = buildConfigRequest(this.gameConfig);
            console.log('Config request:', configRequest);
            console.log('Config request JSON:', JSON.stringify(configRequest, null, 2));

            const response = await apiClient.createGameWithConfig(configRequest);

            this.currentGameId = response.gameId;
            this.currentGameState = response;

            // Setup color mapping
            if (this.gameConfig.player1 && this.gameConfig.player2) {
                gameUI.setupColorMapping(
                    this.gameConfig.player1.color,
                    this.gameConfig.player2.color
                );
                gameUI.updatePlayerNames(
                    this.gameConfig.player1.name,
                    this.gameConfig.player2.name
                );
            }

            this.updateUI(response);

            console.log('Configured game created:', response.gameId);
            console.log('Is AI turn?', response.isAITurn);
            console.log('Is AI vs AI?', this.gameConfig.isAIvsAI);

            // If AI vs AI mode, start auto-play
            if (this.gameConfig.isAIvsAI) {
                console.log('AI vs AI mode detected - starting auto-play');
                // Start auto-play after a short delay
                setTimeout(() => {
                    this.startAIvsAIAutoPlay();
                }, 1000);
            }
            // If AI starts first in regular AI mode, make AI move
            else if (response.isAITurn) {
                console.log('AI starts first!');
                await this.handleAITurn();
            }
        } catch (error) {
            console.error('Failed to create configured game:', error);
            alert('Failed to create game: ' + error.message);
        }
    }

    /**
     * Handles column click
     * @param {number} columnIndex - Column that was clicked
     */
    async handleColumnClick(columnIndex) {
        // Handle multiplayer moves
        if (this.isMultiplayer) {
            console.log('Handling multiplayer move for column:', columnIndex);
            this.moveInProgress = true;

            const success = await multiplayerGame.makeMove(columnIndex);

            if (!success) {
                console.log('Multiplayer move failed or not your turn');
                this.moveInProgress = false;
                gameUI.enableBoard();
            }
            // On success, keep moveInProgress = true until server responds
            // The opponent move handler will reset it when the board updates
            return;
        }

        // Regular single-player/AI game logic
        // Prevent spam clicking - check if move is already in progress
        if (this.moveInProgress) {
            console.log('Move already in progress, ignoring click');
            return;
        }

        if (!this.currentGameId || !gameUI.isGameActive) {
            return;
        }

        // Don't allow moves during AI turn
        if (this.currentGameState && this.currentGameState.isAITurn) {
            console.log('Cannot move during AI turn');
            return;
        }

        // Set flag to prevent concurrent moves
        this.moveInProgress = true;
        gameUI.disableBoard(); // Visually disable board

        try {
            console.log(`Making move in column ${columnIndex}...`);
            const response = await apiClient.makeMove(this.currentGameId, columnIndex);

            if (response.success) {
                await this.handleMoveResponse(response);

                // Refresh game state to get updated isAITurn flag
                const gameState = await apiClient.getGame(this.currentGameId);
                this.currentGameState = gameState;

                console.log('After player move - Is AI turn?', gameState.isAITurn);

                // Check if it's AI's turn next
                if (gameState.isAITurn && gameState.status === 'IN_PROGRESS') {
                    console.log('AI turn detected, executing AI move');
                    // Don't clear moveInProgress yet - AI will handle it
                    await this.handleAITurn();
                } else {
                    // Clear flag if no AI turn follows
                    this.moveInProgress = false;
                    if (gameState.status === 'IN_PROGRESS') {
                        gameUI.enableBoard();
                    }
                }
            } else {
                // Move failed, clear flag
                this.moveInProgress = false;
                gameUI.enableBoard();
            }
        } catch (error) {
            console.error('Failed to make move:', error);
            this.moveInProgress = false; // Clear flag on error
            gameUI.enableBoard();
            alert(error.message || 'Failed to make move');
        }
    }

    /**
     * Handles AI's turn
     */
    async handleAITurn() {
        if (!this.currentGameId) return;

        try {
            console.log('AI is thinking...');
            window.audioManager.playAIThinking();
            gameUI.showAIThinking();
            gameUI.disableBoard(); // Keep board disabled during AI turn

            // Wait a moment for better UX
            await this.sleep(800);

            // Execute AI move
            const response = await apiClient.executeAIMove(this.currentGameId);

            gameUI.hideAIThinking();

            if (response.success) {
                await this.handleMoveResponse(response);

                // Refresh game state
                const gameState = await apiClient.getGame(this.currentGameId);
                this.currentGameState = gameState;

                // Clear moveInProgress flag after AI move
                this.moveInProgress = false;

                // Re-enable board if game is still in progress
                if (gameState.status === 'IN_PROGRESS') {
                    gameUI.enableBoard();
                }
            } else {
                this.moveInProgress = false;
                gameUI.enableBoard();
            }
        } catch (error) {
            console.error('AI move failed:', error);
            gameUI.hideAIThinking();
            this.moveInProgress = false; // Clear flag on error
            gameUI.enableBoard();
            alert('AI move failed: ' + error.message);
        }
    }

    /**
     * Starts AI vs AI auto-play mode
     */
    async startAIvsAIAutoPlay() {
        console.log('Starting AI vs AI auto-play mode...');

        // Disable board interaction for spectator mode
        gameUI.disableBoard();

        // Continuously make AI moves until game ends
        while (this.currentGameState && this.currentGameState.status === 'IN_PROGRESS') {
            try {
                // Wait for configured delay
                const delay = this.gameConfig.autoPlaySpeed || 1000;
                await this.sleep(delay);

                // Show AI thinking indicator
                gameUI.showAIThinking();
                window.audioManager.playAIThinking();

                // Make AI move
                const response = await apiClient.executeAIMove(this.currentGameId);

                gameUI.hideAIThinking();

                if (response.success) {
                    await this.handleMoveResponse(response);

                    // Refresh game state
                    const gameState = await apiClient.getGame(this.currentGameId);
                    this.currentGameState = gameState;

                    console.log('AI vs AI move completed. Status:', gameState.status);
                } else {
                    console.error('AI move failed');
                    break;
                }
            } catch (error) {
                console.error('Error in AI vs AI auto-play:', error);
                gameUI.hideAIThinking();
                break;
            }
        }

        console.log('AI vs AI game ended. Final status:', this.currentGameState.status);
    }

    /**
     * Handles move response (common logic for player and AI moves)
     */
    async handleMoveResponse(response) {
        // Play piece drop sound
        window.audioManager.playPieceDrop();

        // Animate piece drop
        gameUI.animatePieceDrop(
            response.move.column,
            response.move.row,
            response.move.player
        );

        // Wait for animation to complete
        await this.sleep(500);

        // Update board
        gameUI.renderBoard(response.board);

        // Add to move history
        const moveNumber = this.currentGameState.moveHistory.length + 1;
        gameUI.addMoveToHistory(response.move, moveNumber);

        // Update game state
        this.currentGameState.board = response.board;
        this.currentGameState.status = response.gameStatus;
        this.currentGameState.moveHistory.push(response.move);

        // Check game status
        if (response.gameStatus === 'IN_PROGRESS') {
            // Update current player for next turn
            const nextPlayer = response.move.player === 'RED' ? 'YELLOW' : 'RED';
            this.currentGameState.currentPlayer = nextPlayer;

            gameUI.updateCurrentPlayer(nextPlayer);
            gameUI.updateStatus(response.gameStatus, response.message);
            gameUI.updateColumnStates(response.board);
            gameUI.enableBoard();
        } else {
            // Game ended - play appropriate sound
            if (response.gameStatus === 'DRAW') {
                window.audioManager.playDraw();
            } else {
                window.audioManager.playWin();
                if (window.confettiManager) {
                    window.confettiManager.burst();
                }
            }

            gameUI.updateStatus(response.gameStatus, response.message);

            // Record statistics for both players
            if (window.statsManager && this.gameConfig) {
                const player1Name = this.gameConfig.player1?.name;
                const player2Name = this.gameConfig.player2?.name;

                if (response.gameStatus === 'RED_WINS') {
                    // RED is always player1
                    if (player1Name) window.statsManager.recordGameForPlayer(player1Name, 'win');
                    if (player2Name) window.statsManager.recordGameForPlayer(player2Name, 'loss');
                    gameUI.showWinner('RED');
                } else if (response.gameStatus === 'YELLOW_WINS') {
                    // YELLOW is always player2
                    if (player1Name) window.statsManager.recordGameForPlayer(player1Name, 'loss');
                    if (player2Name) window.statsManager.recordGameForPlayer(player2Name, 'win');
                    gameUI.showWinner('YELLOW');
                } else if (response.gameStatus === 'DRAW') {
                    // Both players get a draw
                    if (player1Name) window.statsManager.recordGameForPlayer(player1Name, 'draw');
                    if (player2Name) window.statsManager.recordGameForPlayer(player2Name, 'draw');
                    gameUI.showWinner('DRAW');
                }
            } else {
                // Fallback if statsManager not available
                if (response.gameStatus === 'RED_WINS') {
                    gameUI.showWinner('RED');
                } else if (response.gameStatus === 'YELLOW_WINS') {
                    gameUI.showWinner('YELLOW');
                } else if (response.gameStatus === 'DRAW') {
                    gameUI.showWinner('DRAW');
                }
            }
        }
    }

    /**
     * Updates UI with game state
     */
    updateUI(response) {
        document.getElementById('gameId').textContent = response.gameId;
        gameUI.initBoard();
        gameUI.renderBoard(response.board);
        gameUI.updateCurrentPlayer(response.currentPlayer);
        gameUI.updateStatus(response.status, response.message);
        gameUI.clearMoveHistory();
        gameUI.enableBoard();
        gameUI.hideWinner();

        // CRITICAL: Force hide winner modal on game start
        const modal = document.getElementById('winnerModal');
        if (modal) {
            modal.classList.remove('show');
            modal.style.display = 'none';
        }
    }

    /**
     * Utility function to sleep
     * @param {number} ms - Milliseconds to sleep
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    // Expose app globally so multiplayer game can reset moveInProgress
    window.app = app;
    app.init();
});