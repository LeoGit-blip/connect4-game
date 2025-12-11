/**
 * Game UI Logic
 * Handles rendering and user interactions
 */

class GameUI {
    constructor() {
        this.boardElement = document.getElementById('gameBoard');
        this.currentPlayerBadge = document.getElementById('currentPlayerBadge');
        this.currentPlayerText = document.getElementById('currentPlayerText');
        this.gameStatusElement = document.getElementById('gameStatus');
        this.moveHistoryElement = document.getElementById('moveHistory');
        this.winnerModal = document.getElementById('winnerModal');
        this.winnerIcon = document.getElementById('winnerIcon');
        this.winnerTitle = document.getElementById('winnerTitle');
        this.aiThinkingIndicator = document.getElementById('aiThinkingIndicator');

        // Initialize state properties
        this.isGameActive = true;
        this.colorMap = {};
        this.playerNames = {};
        this.customColors = {
            player1: '#ff0040',
            player2: '#ffd700'
        };

        // Debug: Check if modal elements exist
        console.log('Modal elements found:', {
            winnerModal: !!this.winnerModal,
            winnerIcon: !!this.winnerIcon,
            winnerTitle: !!this.winnerTitle
        });

        if (!this.winnerModal) {
            console.error('Winner modal not found! Looking for element with id="winnerModal"');
        }
    }

    /**
     * Sets up color mapping for players
     * @param {string} player1Color - Player 1 color
     * @param {string} player2Color - Player 2 color
     */
    setupColorMapping(player1Color, player2Color) {
        const hexToColorName = {
            '#ff0040': 'red',
            '#ffd700': 'yellow',
            '#00d4ff': 'blue',
            '#10b981': 'green',
            '#1f2937': 'black',
            '#a855f7': 'purple',
            '#f97316': 'orange',
            '#ec4899': 'pink'
        };

        this.colorMap['RED'] = hexToColorName[player1Color] || 'red';
        this.colorMap['YELLOW'] = hexToColorName[player2Color] || 'yellow';

        console.log('Color mapping setup:', this.colorMap);
    }

    /**
     * Gets the CSS class name for a player
     * @param {string} player - Backend player color (RED/YELLOW)
     * @returns {string} CSS class name
     */
    getPlayerColorClass(player) {
        return this.colorMap[player] || player.toLowerCase();
    }

    /**
     * Initializes the game board
     */
    initBoard() {
        this.boardElement.innerHTML = '';

        // Create 7 columns
        for (let col = 0; col < 7; col++) {
            const column = document.createElement('div');
            column.className = 'column';
            column.dataset.column = col;

            // Create 6 cells per column
            for (let row = 0; row < 6; row++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                column.appendChild(cell);
            }

            // Add hover listeners for ghost piece
            column.addEventListener('mouseenter', () => this.showGhostPiece(col));
            column.addEventListener('mouseleave', () => this.removeGhostPiece(col));

            this.boardElement.appendChild(column);
        }
    }

    /**
     * Shows a ghost piece in the specified column
     * @param {number} colIndex - Column index
     */
    showGhostPiece(colIndex) {
        if (!this.isGameActive) return;

        // Find the first empty cell from bottom
        const column = this.boardElement.children[colIndex];
        if (column.classList.contains('disabled')) return;

        let targetRow = -1;
        for (let row = 5; row >= 0; row--) {
            const cell = column.children[row];
            if (!cell.hasChildNodes()) {
                targetRow = row;
                break;
            }
        }

        if (targetRow !== -1) {
            const cell = column.children[targetRow];
            const ghost = document.createElement('div');

            // Determine current player color from badge
            const classes = this.currentPlayerBadge.className.split(' ');
            const colorClass = classes.length > 1 ? classes[1] : 'red';

            ghost.className = `piece ${colorClass} ghost`;
            cell.appendChild(ghost);
        }
    }

    /**
     * Removes ghost piece from the specified column
     * @param {number} colIndex - Column index
     */
    removeGhostPiece(colIndex) {
        const column = this.boardElement.children[colIndex];
        const ghosts = column.querySelectorAll('.piece.ghost');
        ghosts.forEach(g => g.remove());
    }

    /**
     * Renders the board state
     * @param {Array} board - 2D array of player states
     */
    renderBoard(board) {
        console.log('Rendering board:', board);

        if (!board) {
            console.warn('renderBoard called with null/undefined board');
            return;
        }

        for (let row = 0; row < 6; row++) {
            for (let col = 0; col < 7; col++) {
                const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                if (!cell) {
                    console.warn(`Cell not found: row ${row}, col ${col}`);
                    continue;
                }

                // Clear existing piece
                cell.innerHTML = '';

                const player = board[row][col];
                console.log(`Board[${row}][${col}] = ${player}`);

                // Check if cell is occupied (handle both 'NONE' string and null)
                if (player && player !== 'NONE' && player !== null) {
                    const piece = document.createElement('div');
                    const colorClass = this.getPlayerColorClass(player);
                    piece.className = `piece ${colorClass}`;
                    cell.appendChild(piece);
                    console.log(`Placed ${colorClass} piece at [${row}][${col}]`);
                }
            }
        }
    }

    /**
     * Animates a piece dropping into position
     * @param {number} column - Column index
     * @param {number} row - Row index
     * @param {string} player - Player color
     */
    animatePieceDrop(column, row, player) {
        const cell = document.querySelector(`[data-row="${row}"][data-col="${column}"]`);
        if (!cell) {
            console.warn(`Cell not found for animation: row ${row}, col ${column}`);
            return;
        }

        const piece = document.createElement('div');
        const colorClass = this.getPlayerColorClass(player);
        piece.className = `piece ${colorClass} dropping`;
        cell.appendChild(piece);
    }

    /**
     * Updates the current player display
     * @param {string} player - Current player
     */
    updateCurrentPlayer(player) {
        if (!player || player === 'NONE') {
            console.warn('updateCurrentPlayer called with invalid player:', player);
            return;
        }

        const colorClass = this.getPlayerColorClass(player);
        const playerName = this.playerNames[player] || (player === 'RED' ? 'Player 1' : 'Player 2');

        console.log(`Updating current player to: ${playerName} (${colorClass})`);

        this.currentPlayerText.textContent = `${playerName}'s Turn`;

        // Update badge styling - remove all color classes first
        this.currentPlayerBadge.classList.remove('red', 'yellow', 'blue', 'green', 'black', 'purple', 'orange', 'pink');
        this.currentPlayerBadge.classList.add(colorClass);

        // Update piece indicator
        const pieceIndicator = this.currentPlayerBadge.querySelector('.player-piece');
        if (pieceIndicator) {
            pieceIndicator.className = `player-piece ${colorClass}`;
        }
    }

    /**
     * Updates the game status display
     * @param {string} status - Game status
     * @param {string} message - Status message
     */
    updateStatus(status, message) {
        if (!this.gameStatusElement) return;
        const statusText = this.gameStatusElement.querySelector('.status-text');
        if (statusText) {
            statusText.textContent = message || 'Game in progress';
        }
    }

    /**
     * Adds a move to the history panel
     * @param {Object} move - Move object
     * @param {number} moveNumber - Move number
     */
    addMoveToHistory(move, moveNumber) {
        // Remove empty state if present
        const emptyState = this.moveHistoryElement.querySelector('.empty-state');
        if (emptyState) {
            emptyState.remove();
        }

        const moveItem = document.createElement('div');
        moveItem.className = 'move-item';

        const piece = document.createElement('div');
        const colorClass = this.getPlayerColorClass(move.player);
        piece.className = `player-piece ${colorClass}`;

        const text = document.createElement('span');
        text.textContent = `Move ${moveNumber}: Column ${move.column + 1}`;

        moveItem.appendChild(piece);
        moveItem.appendChild(text);

        this.moveHistoryElement.appendChild(moveItem);

        // Scroll to bottom
        this.moveHistoryElement.scrollTop = this.moveHistoryElement.scrollHeight;
    }

    /**
     * Clears the move history
     */
    clearMoveHistory() {
        this.moveHistoryElement.innerHTML = '<p class="empty-state">No moves yet</p>';
    }

    /**
     * Displays the winner modal
     * @param {string} winner - Winning player or 'DRAW'
     */
    // Method to show winner modal
    showWinner(winner) {
        const modal = document.getElementById('winnerModal');
        const winnerIcon = document.getElementById('winnerIcon');
        const winnerTitle = document.getElementById('winnerTitle');

        if (!modal) return;

        // Clear previous classes
        winnerIcon.className = 'winner-icon';

        if (winner === 'DRAW') {
            winnerIcon.classList.add('draw');
            winnerTitle.textContent = "It's a Draw!";
        } else {
            const colorClass = this.getPlayerColorClass(winner);
            winnerIcon.classList.add(colorClass);
            const playerName = this.playerNames?.[winner] || winner;
            winnerTitle.textContent = `${playerName} Wins!`;
        }

        // Show modal with animation
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    }

    // Method to hide winner modal
    hideWinner() {
        const modal = document.getElementById('winnerModal');
        if (modal) {
            modal.classList.remove('show');
            modal.style.display = 'none';
        }
    }

    /**
     * Disables board interaction
     */
    disableBoard() {
        const columns = this.boardElement.querySelectorAll('.column');
        columns.forEach(col => col.classList.add('disabled'));
    }

    /**
     * Enables board interaction
     */
    enableBoard() {
        const columns = this.boardElement.querySelectorAll('.column');
        columns.forEach(col => col.classList.remove('disabled'));
    }

    /**
     * Disables specific columns that are full
     * @param {Array} board - Current board state
     */
    updateColumnStates(board) {
        if (!board) return;

        const columns = this.boardElement.querySelectorAll('.column');
        columns.forEach((col, index) => {
            // Check if top cell is filled
            const topCell = board[0][index];
            const isColumnFull = topCell && topCell !== 'NONE' && topCell !== null;
            if (isColumnFull) {
                col.classList.add('disabled');
            } else {
                col.classList.remove('disabled');
            }
        });
    }

    /**
     * Highlights winning pieces
     * @param {Array} winningCells - Array of winning cell coordinates
     */
    highlightWinningPieces(winningCells) {
        if (!winningCells) return;

        winningCells.forEach(([row, col]) => {
            const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            if (cell) {
                const piece = cell.querySelector('.piece');
                if (piece) {
                    // Get the current background color (which includes custom colors)
                    const computedStyle = window.getComputedStyle(piece);
                    const currentColor = computedStyle.backgroundColor;

                    // Apply the winning class
                    piece.classList.add('winning');

                    // Preserve the custom color by setting it as an inline style
                    // This ensures the animation uses the correct color
                    piece.style.setProperty('--piece-color', currentColor);
                    piece.style.backgroundColor = currentColor;
                }
            }
        });
    }

    /**
     * Shows AI thinking indicator
     */
    showAIThinking() {
        if (this.aiThinkingIndicator) {
            this.aiThinkingIndicator.classList.remove('hidden');
        }
        this.disableBoard();
    }

    /**
     * Hides AI thinking indicator
     */
    hideAIThinking() {
        if (this.aiThinkingIndicator) {
            this.aiThinkingIndicator.classList.add('hidden');
        }
    }

    /**
     * Applies custom colors to pieces
     * @param {string} player1Color - Player 1 color
     * @param {string} player2Color - Player 2 color
     */
    applyCustomColors(player1Color, player2Color) {
        this.customColors.player1 = player1Color;
        this.customColors.player2 = player2Color;

        // Set CSS variables
        document.documentElement.style.setProperty('--player1-color', player1Color);
        document.documentElement.style.setProperty('--player2-color', player2Color);
    }

    /**
     * Updates player name displays
     * @param {string} player1Name - Player 1 name
     * @param {string} player2Name - Player 2 name
     */
    updatePlayerNames(player1Name, player2Name) {
        // Map player names to backend colors
        // Player 1 is always RED in backend logic
        // Player 2 is always YELLOW in backend logic
        this.playerNames.RED = player1Name;
        this.playerNames.YELLOW = player2Name;
        this.playerNames.player1 = player1Name;
        this.playerNames.player2 = player2Name;
        console.log(`Players updated: RED=${player1Name}, YELLOW=${player2Name}`);

        // Update UI if elements exist
        const p1Element = document.getElementById('player1NameDisplay');
        const p2Element = document.getElementById('player2NameDisplay');

        if (p1Element) p1Element.textContent = player1Name;
        if (p2Element) p2Element.textContent = player2Name;
    }
}

// Create and export singleton instance
const gameUI = new GameUI();