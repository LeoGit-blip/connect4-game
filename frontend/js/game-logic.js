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

    // AI implementation with difficulty levels
    getAIMove(gameId) {
        const game = this.games.get(gameId);
        if (!game) throw new Error('Game not found');

        const validMoves = [];
        for (let c = 0; c < this.COLS; c++) {
            if (game.board[0][c] === null) validMoves.push(c);
        }

        if (validMoves.length === 0) throw new Error('No valid moves');

        // Get difficulty level from config (default to MEDIUM)
        const difficulty = game.config?.aiDifficulty || 'MEDIUM';

        // EXPERT and GRANDMASTER: Use opening book + minimax algorithm
        if (difficulty === 'EXPERT' || difficulty === 'GRANDMASTER') {
            // Check opening book first (only for AI's first 2 moves)
            const aiMoveCount = game.moveHistory.filter(m => m.player === game.currentPlayer).length;
            if (aiMoveCount < 2) {
                const openingMove = this.getOpeningBookMove(game.board, game.currentPlayer);
                if (openingMove !== -1) {
                    console.log('Using opening book move:', openingMove);
                    return openingMove;
                }
            }

            // Use minimax with increased depth
            const depth = difficulty === 'EXPERT' ? 7 : 8;
            return this.minimaxMove(game.board, game.currentPlayer, depth);
        }

        // EASY: 30% chance of random move, otherwise strategic
        if (difficulty === 'EASY') {
            if (Math.random() < 0.3) {
                return validMoves[Math.floor(Math.random() * validMoves.length)];
            }
        }

        // Strategic moves (used by EASY 70%, MEDIUM 100%, HARD 100%)
        // 1. Check for winning move
        for (let col of validMoves) {
            if (this.canWin(game.board, col, game.currentPlayer)) return col;
        }

        // 2. Check for blocking move
        const opponent = game.currentPlayer === 'RED' ? 'YELLOW' : 'RED';
        for (let col of validMoves) {
            if (this.canWin(game.board, col, opponent)) return col;
        }

        // HARD: Look for setup moves (create two-in-a-row opportunities)
        if (difficulty === 'HARD') {
            const setupMove = this.findSetupMove(game.board, validMoves, game.currentPlayer);
            if (setupMove !== -1) return setupMove;
        }

        // 3. Prefer center column
        if (validMoves.includes(3)) return 3;

        // 4. Prefer columns near center
        const centerPreference = [3, 2, 4, 1, 5, 0, 6];
        for (let col of centerPreference) {
            if (validMoves.includes(col)) return col;
        }

        // Fallback to random
        return validMoves[Math.floor(Math.random() * validMoves.length)];
    }

    // Opening book: Optimal opening moves for EXPERT/GRANDMASTER
    getOpeningBookMove(board, player) {
        // Count AI's pieces to determine which move this is
        let aiPieceCount = 0;
        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS; c++) {
                if (board[r][c] === player) aiPieceCount++;
            }
        }

        // AI's first move
        if (aiPieceCount === 0) {
            // Always play center on first move
            if (board[5][3] === null) return 3;
            // If center is taken (shouldn't happen), play next to it
            return Math.random() < 0.5 ? 2 : 4;
        }

        // AI's second move
        if (aiPieceCount === 1) {
            // Find where AI played first
            let aiFirstCol = -1;
            for (let c = 0; c < this.COLS; c++) {
                if (board[5][c] === player) {
                    aiFirstCol = c;
                    break;
                }
            }

            // If AI played center, build next to it
            if (aiFirstCol === 3) {
                // Prefer columns 2 or 4
                if (board[5][2] === null && board[5][4] === null) {
                    return Math.random() < 0.5 ? 2 : 4;
                }
                if (board[5][2] === null) return 2;
                if (board[5][4] === null) return 4;
            }

            // If AI didn't play center, try to take it
            if (board[5][3] === null) return 3;
        }

        // After 2 moves, use minimax
        return -1;
    }


    // Minimax algorithm for EXPERT and GRANDMASTER
    minimaxMove(board, player, maxDepth) {
        let bestScore = -Infinity;
        let bestMove = 3; // Default to center

        const validMoves = [];
        for (let c = 0; c < this.COLS; c++) {
            if (board[0][c] === null) validMoves.push(c);
        }

        for (let col of validMoves) {
            const row = this.getLowestRow(board, col);
            if (row === -1) continue;

            // Make move
            const newBoard = board.map(r => [...r]);
            newBoard[row][col] = player;

            // Evaluate
            const score = this.minimax(newBoard, maxDepth - 1, false, player, -Infinity, Infinity);

            // Undo move (not needed since we cloned)
            if (score > bestScore) {
                bestScore = score;
                bestMove = col;
            }
        }

        return bestMove;
    }

    // Minimax with alpha-beta pruning
    minimax(board, depth, isMaximizing, aiPlayer, alpha, beta) {
        const opponent = aiPlayer === 'RED' ? 'YELLOW' : 'RED';
        const currentPlayer = isMaximizing ? aiPlayer : opponent;

        // Check terminal states
        if (this.checkWinForPlayer(board, aiPlayer)) return 1000 + depth;
        if (this.checkWinForPlayer(board, opponent)) return -1000 - depth;
        if (this.isBoardFull(board)) return 0;
        if (depth === 0) return this.evaluateBoard(board, aiPlayer);

        const validMoves = [];
        for (let c = 0; c < this.COLS; c++) {
            if (board[0][c] === null) validMoves.push(c);
        }

        if (isMaximizing) {
            let maxScore = -Infinity;
            for (let col of validMoves) {
                const row = this.getLowestRow(board, col);
                if (row === -1) continue;

                const newBoard = board.map(r => [...r]);
                newBoard[row][col] = currentPlayer;

                const score = this.minimax(newBoard, depth - 1, false, aiPlayer, alpha, beta);
                maxScore = Math.max(maxScore, score);
                alpha = Math.max(alpha, score);
                if (beta <= alpha) break; // Pruning
            }
            return maxScore;
        } else {
            let minScore = Infinity;
            for (let col of validMoves) {
                const row = this.getLowestRow(board, col);
                if (row === -1) continue;

                const newBoard = board.map(r => [...r]);
                newBoard[row][col] = currentPlayer;

                const score = this.minimax(newBoard, depth - 1, true, aiPlayer, alpha, beta);
                minScore = Math.min(minScore, score);
                beta = Math.min(beta, score);
                if (beta <= alpha) break; // Pruning
            }
            return minScore;
        }
    }

    // Helper: Get lowest available row in column
    getLowestRow(board, col) {
        for (let r = this.ROWS - 1; r >= 0; r--) {
            if (board[r][col] === null) return r;
        }
        return -1;
    }

    // Helper: Check if specific player has won
    checkWinForPlayer(board, player) {
        // Check all positions for a win
        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS; c++) {
                if (board[r][c] === player) {
                    if (this.checkWin(board, r, c, player)) return true;
                }
            }
        }
        return false;
    }

    // Helper: Check if board is full
    isBoardFull(board) {
        return board[0].every(cell => cell !== null);
    }

    // Evaluate board position for minimax
    evaluateBoard(board, player) {
        const opponent = player === 'RED' ? 'YELLOW' : 'RED';
        let score = 0;

        // Score center column control
        for (let r = 0; r < this.ROWS; r++) {
            if (board[r][3] === player) score += 3;
            else if (board[r][3] === opponent) score -= 3;
        }

        // Score potential winning positions
        score += this.scorePosition(board, player) - this.scorePosition(board, opponent);

        return score;
    }

    // Score potential winning positions
    scorePosition(board, player) {
        let score = 0;

        // Check horizontal, vertical, and diagonal patterns
        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS; c++) {
                // Horizontal
                if (c <= this.COLS - 4) {
                    const window = [board[r][c], board[r][c + 1], board[r][c + 2], board[r][c + 3]];
                    score += this.evaluateWindow(window, player);
                }
                // Vertical
                if (r <= this.ROWS - 4) {
                    const window = [board[r][c], board[r + 1][c], board[r + 2][c], board[r + 3][c]];
                    score += this.evaluateWindow(window, player);
                }
                // Diagonal /
                if (r >= 3 && c <= this.COLS - 4) {
                    const window = [board[r][c], board[r - 1][c + 1], board[r - 2][c + 2], board[r - 3][c + 3]];
                    score += this.evaluateWindow(window, player);
                }
                // Diagonal \
                if (r <= this.ROWS - 4 && c <= this.COLS - 4) {
                    const window = [board[r][c], board[r + 1][c + 1], board[r + 2][c + 2], board[r + 3][c + 3]];
                    score += this.evaluateWindow(window, player);
                }
            }
        }

        return score;
    }

    // Evaluate a window of 4 cells
    evaluateWindow(window, player) {
        const opponent = player === 'RED' ? 'YELLOW' : 'RED';
        const playerCount = window.filter(cell => cell === player).length;
        const opponentCount = window.filter(cell => cell === opponent).length;
        const emptyCount = window.filter(cell => cell === null).length;

        if (playerCount === 4) return 100;
        if (playerCount === 3 && emptyCount === 1) return 5;
        if (playerCount === 2 && emptyCount === 2) return 2;
        if (opponentCount === 3 && emptyCount === 1) return -4; // Block opponent

        return 0;
    }

    // Find a move that sets up future winning opportunities (for HARD mode)
    findSetupMove(board, validMoves, player) {
        let bestMove = -1;
        let bestScore = -1;

        for (let col of validMoves) {
            let score = 0;

            // Find where piece would land
            let row = -1;
            for (let r = this.ROWS - 1; r >= 0; r--) {
                if (board[r][col] === null) {
                    row = r;
                    break;
                }
            }
            if (row === -1) continue;

            // Check horizontal potential
            let leftCount = 0, rightCount = 0;
            for (let c = col - 1; c >= 0 && board[row][c] === player; c--) leftCount++;
            for (let c = col + 1; c < this.COLS && board[row][c] === player; c++) rightCount++;
            if (leftCount + rightCount >= 2) score += 3;

            // Check vertical potential (pieces below)
            let belowCount = 0;
            for (let r = row + 1; r < this.ROWS && board[r][col] === player; r++) belowCount++;
            if (belowCount >= 2) score += 3;

            // Prefer center columns
            if (col === 3) score += 2;
            else if (col === 2 || col === 4) score += 1;

            if (score > bestScore) {
                bestScore = score;
                bestMove = col;
            }
        }

        return bestScore > 0 ? bestMove : -1;
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
