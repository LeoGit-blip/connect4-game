/**
 * Client-side Game Logic
 * Handles game rules, state management, and AI for offline play
 */

class GameLogic {
    constructor() {
        this.games = new Map();
        this.ROWS = 6;
        this.COLS = 7;
    }

    createGame(config) {
        // Normalize config to handle both backend-style (player1Config) and frontend-style (player1)
        // The app sends player1Config/player2Config via buildConfigRequest
        const normalizedConfig = {
            ...config,
            player1: config.player1 || config.player1Config,
            player2: config.player2 || config.player2Config
        };

        const gameId = 'local_' + Date.now();
        const game = {
            id: gameId,
            board: Array(this.ROWS).fill().map(() => Array(this.COLS).fill(null)),
            currentPlayer: config.firstPlayer || 'RED',
            status: 'IN_PROGRESS',
            config: normalizedConfig,
            moveHistory: [],
            winner: null
        };

        this.games.set(gameId, game);
        return this.formatGameResponse(game);
    }

    getGame(gameId) {
        const game = this.games.get(gameId);
        if (!game) throw new Error('Game not found');
        return this.formatGameResponse(game);
    }

    makeMove(gameId, column) {
        const game = this.games.get(gameId);
        if (!game) throw new Error('Game not found');
        if (game.status !== 'IN_PROGRESS') throw new Error('Game is over');

        // Find the first empty row in the column
        let row = -1;
        for (let r = this.ROWS - 1; r >= 0; r--) {
            if (game.board[r][column] === null) {
                row = r;
                break;
            }
        }

        if (row === -1) throw new Error('Column is full');

        // Make the move
        game.board[row][column] = game.currentPlayer;

        const move = {
            player: game.currentPlayer,
            column: column,
            row: row,
            timestamp: new Date().toISOString()
        };
        game.moveHistory.push(move);

        // Check for win or draw
        if (this.checkWin(game.board, row, column, game.currentPlayer)) {
            game.status = game.currentPlayer + '_WINS';
            game.winner = game.currentPlayer;
        } else if (this.checkDraw(game.board)) {
            game.status = 'DRAW';
        } else {
            // Switch player
            game.currentPlayer = game.currentPlayer === 'RED' ? 'YELLOW' : 'RED';
        }

        return {
            success: true,
            gameId: game.id,
            board: game.board,
            gameStatus: game.status,
            currentPlayer: game.currentPlayer,
            move: move,
            message: this.getStatusMessage(game.status, game.currentPlayer)
        };
    }

    checkWin(board, r, c, player) {
        // Check horizontal
        let count = 0;
        for (let col = 0; col < this.COLS; col++) {
            if (board[r][col] === player) count++;
            else count = 0;
            if (count >= 4) return true;
        }

        // Check vertical
        count = 0;
        for (let row = 0; row < this.ROWS; row++) {
            if (board[row][c] === player) count++;
            else count = 0;
            if (count >= 4) return true;
        }

        // Check diagonal (top-left to bottom-right)
        // We need to check all diagonals that pass through (r, c)
        // But simpler to just scan the whole board for any diagonal win
        // Optimization: just check diagonals involving the new piece

        // Check diagonal /
        for (let row = 3; row < this.ROWS; row++) {
            for (let col = 0; col < this.COLS - 3; col++) {
                if (board[row][col] === player &&
                    board[row - 1][col + 1] === player &&
                    board[row - 2][col + 2] === player &&
                    board[row - 3][col + 3] === player) return true;
            }
        }

        // Check diagonal \
        for (let row = 0; row < this.ROWS - 3; row++) {
            for (let col = 0; col < this.COLS - 3; col++) {
                if (board[row][col] === player &&
                    board[row + 1][col + 1] === player &&
                    board[row + 2][col + 2] === player &&
                    board[row + 3][col + 3] === player) return true;
            }
        }

        return false;
    }

    checkDraw(board) {
        return board[0].every(cell => cell !== null);
    }

    getStatusMessage(status, currentPlayer) {
        if (status === 'IN_PROGRESS') return `${currentPlayer}'s Turn`;
        if (status === 'RED_WINS') return 'Red Wins!';
        if (status === 'YELLOW_WINS') return 'Yellow Wins!';
        if (status === 'DRAW') return 'Game Draw!';
        return '';
    }

    formatGameResponse(game) {
        return {
            gameId: game.id,
            board: game.board.map(row => [...row]),
            status: game.status,
            currentPlayer: game.currentPlayer,
            moveHistory: [...game.moveHistory],
            config: game.config,
            isAITurn: game.config.gameMode === 'PLAYER_VS_AI' &&
                game.status === 'IN_PROGRESS' &&
                ((game.currentPlayer === 'YELLOW' && !game.config.player1.isAI) ||
                    (game.currentPlayer === 'RED' && game.config.player1.isAI))
        };
    }

    // Simple AI implementation
    getAIMove(gameId) {
        const game = this.games.get(gameId);
        if (!game) throw new Error('Game not found');

        // Simple heuristic: 
        // 1. Can I win now?
        // 2. Can opponent win next? Block them.
        // 3. Pick random valid column.

        const validMoves = [];
        for (let c = 0; c < this.COLS; c++) {
            if (game.board[0][c] === null) validMoves.push(c);
        }

        if (validMoves.length === 0) throw new Error('No valid moves');

        // 1. Check for winning move
        for (let col of validMoves) {
            if (this.canWin(game.board, col, game.currentPlayer)) return col;
        }

        // 2. Check for blocking move
        const opponent = game.currentPlayer === 'RED' ? 'YELLOW' : 'RED';
        for (let col of validMoves) {
            if (this.canWin(game.board, col, opponent)) return col;
        }

        // 3. Random move (prefer center)
        if (validMoves.includes(3)) return 3;
        return validMoves[Math.floor(Math.random() * validMoves.length)];
    }

    canWin(board, col, player) {
        // Simulate move
        let row = -1;
        for (let r = this.ROWS - 1; r >= 0; r--) {
            if (board[r][col] === null) {
                row = r;
                break;
            }
        }
        if (row === -1) return false;

        // Clone board to not affect state
        const newBoard = board.map(row => [...row]);
        newBoard[row][col] = player;

        return this.checkWin(newBoard, row, col, player);
    }
}

// Export singleton
const localGameLogic = new GameLogic();
