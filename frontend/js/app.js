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
    }

    /**
     * Initializes the application
     */
    async init() {
        console.log('Initializing Connect 4 Game...');

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
            menuBtn.addEventListener('click', () => {
                window.audioManager.playButtonClick();
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
            backToMenuBtn.addEventListener('click', () => {
                window.audioManager.playButtonClick();
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

            // If AI starts first, make AI move
            if (response.isAITurn) {
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
    app.init();
});
