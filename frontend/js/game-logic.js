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

    // AI implementation with enhanced difficulty levels
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

        // 1. Check opening book for first few moves
        const moveCount = game.moveHistory.length;
        if (moveCount <= 4 && (difficulty === 'EXPERT' || difficulty === 'GRANDMASTER')) {
            const openingMove = this.getOpeningMove(game.board, moveCount);
            if (openingMove !== null) {
                console.log('AI using opening book:', openingMove);
                return openingMove;
            }
        }

        // 2. Check for immediate winning move
        for (let col of validMoves) {
            if (this.canWin(game.board, col, game.currentPlayer)) {
                console.log('AI found winning move:', col);
                return col;
            }
        }

        // 3. Check for blocking opponent's winning move
        const opponent = game.currentPlayer === 'RED' ? 'YELLOW' : 'RED';
        for (let col of validMoves) {
            if (this.canWin(game.board, col, opponent)) {
                console.log('AI blocking opponent at:', col);
                return col;
            }
        }

        // 4. Use minimax for EXPERT and GRANDMASTER
        if (difficulty === 'EXPERT' || difficulty === 'GRANDMASTER') {
            const depth = difficulty === 'EXPERT' ? 10 : 14; // Grandmaster: depth 14!
            return this.minimaxMove(game.board, game.currentPlayer, depth, validMoves);
        }

        // EASY: 40% chance of random move, otherwise strategic
        if (difficulty === 'EASY') {
            if (Math.random() < 0.4) {
                return validMoves[Math.floor(Math.random() * validMoves.length)];
            }
        }

        // HARD: Look for setup moves (create two-in-a-row opportunities)
        if (difficulty === 'HARD') {
            const setupMove = this.findSetupMove(game.board, validMoves, game.currentPlayer);
            if (setupMove !== -1) {
                console.log('AI found setup move:', setupMove);
                return setupMove;
            }
        }

        // 5. Intelligent column selection with some randomness
        // Score each valid column and pick the best one
        let columnScores = validMoves.map(col => {
            let score = 0;

            // Slight preference for center columns (but not overwhelming)
            const distanceFromCenter = Math.abs(col - 3);
            score += (3 - distanceFromCenter) * 0.5; // Max +1.5 for center

            // Add randomness to prevent predictability
            score += Math.random() * 2; // Add 0-2 random points

            return { col, score };
        });

        // Sort by score and pick the best
        columnScores.sort((a, b) => b.score - a.score);
        const bestMove = columnScores[0].col;

        console.log('AI strategic move:', bestMove, 'scores:', columnScores);
        return bestMove;
    }

    // Opening book for strong opening play
    getOpeningMove(board, moveCount) {
        // First move: always play center
        if (moveCount === 0) {
            return 3;
        }

        // Count pieces in each column (simple board state representation)
        const colCounts = [];
        for (let c = 0; c < this.COLS; c++) {
            let count = 0;
            for (let r = 0; r < this.ROWS; r++) {
                if (board[r][c] !== null) count++;
            }
            colCounts.push(count);
        }

        // If opponent played center, play adjacent
        if (moveCount === 1 && colCounts[3] === 1) {
            return Math.random() < 0.5 ? 2 : 4;
        }

        // If opponent didn't play center, take it
        if (moveCount === 1 && colCounts[3] === 0) {
            return 3;
        }

        // For later moves, return null to use minimax
        return null;
    }

    // Minimax algorithm for EXPERT and GRANDMASTER
    minimaxMove(board, player, maxDepth, validMoves) {
        let bestScore = -Infinity;
        let bestMoves = []; // Track all moves with best score

        for (let col of validMoves) {
            const row = this.getLowestRow(board, col);
            if (row === -1) continue;

            // Make move
            const newBoard = board.map(r => [...r]);
            newBoard[row][col] = player;

            // Evaluate
            const score = this.minimax(newBoard, maxDepth - 1, false, player, -Infinity, Infinity);

            // Track best moves
            if (score > bestScore) {
                bestScore = score;
                bestMoves = [col];
            } else if (score === bestScore) {
                bestMoves.push(col); // Add to tied moves
            }
        }

        // If multiple moves have same score, pick randomly among them
        if (bestMoves.length > 0) {
            const randomIndex = Math.floor(Math.random() * bestMoves.length);
            console.log('Minimax best moves:', bestMoves, 'choosing:', bestMoves[randomIndex]);
            return bestMoves[randomIndex];
        }

        // Fallback to random valid move
        return validMoves[Math.floor(Math.random() * validMoves.length)];
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

    // Enhanced evaluation function for board positions
    evaluateBoard(board, player) {
        const opponent = player === 'RED' ? 'YELLOW' : 'RED';
        let score = 0;

        // 1. Score potential winning positions (windows)
        score += this.scorePosition(board, player) - this.scorePosition(board, opponent);

        // 2. Center column control (very important in Connect4)
        const centerCol = 3;
        let centerCount = 0;
        for (let r = 0; r < this.ROWS; r++) {
            if (board[r][centerCol] === player) {
                centerCount++;
                score += 5; // Bonus for each piece in center
            } else if (board[r][centerCol] === opponent) {
                score -= 3; // Penalty for opponent center control
            }
        }
        
        // Extra bonus for strong center control
        if (centerCount >= 3) {
            score += 10;
        }

        // 3. Connectivity bonus - reward connected pieces
        score += this.evaluateConnectivity(board, player) - this.evaluateConnectivity(board, opponent);

        // 4. Positional scoring - prefer lower rows and center columns
        const COLUMN_WEIGHTS = [3, 4, 5, 7, 5, 4, 3];
        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS; c++) {
                if (board[r][c] === player) {
                    // Prefer pieces in lower rows (more stable)
                    score += (this.ROWS - r);
                    
                    // Prefer center columns
                    score += COLUMN_WEIGHTS[c];
                }
            }
        }

        return score;
    }

    // Evaluate connectivity - how well pieces are connected
    evaluateConnectivity(board, player) {
        let connectivity = 0;
        
        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS; c++) {
                if (board[r][c] === player) {
                    let adjacentCount = 0;
                    
                    // Check all 8 directions
                    const directions = [
                        [-1, -1], [-1, 0], [-1, 1],
                        [0, -1],           [0, 1],
                        [1, -1],  [1, 0],  [1, 1]
                    ];
                    
                    for (let [dr, dc] of directions) {
                        const nr = r + dr;
                        const nc = c + dc;
                        if (nr >= 0 && nr < this.ROWS && nc >= 0 && nc < this.COLS) {
                            if (board[nr][nc] === player) {
                                adjacentCount++;
                            }
                        }
                    }
                    
                    connectivity += adjacentCount * 2; // Bonus for each connection
                }
            }
        }
        
        return connectivity;
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

    // Enhanced window evaluation with better threat scoring
    evaluateWindow(window, player) {
        const opponent = player === 'RED' ? 'YELLOW' : 'RED';
        const playerCount = window.filter(cell => cell === player).length;
        const opponentCount = window.filter(cell => cell === opponent).length;
        const emptyCount = window.filter(cell => cell === null).length;

        // Can't use window if both players have pieces
        if (playerCount > 0 && opponentCount > 0) {
            return 0;
        }

        let score = 0;

        // Score player's pieces
        if (playerCount === 4) {
            score += 100000; // Win
        } else if (playerCount === 3 && emptyCount === 1) {
            score += 150; // Strong threat (increased from 5)
        } else if (playerCount === 2 && emptyCount === 2) {
            score += 15; // Setup (increased from 2)
        } else if (playerCount === 1 && emptyCount === 3) {
            score += 2; // Potential
        }

        // Penalize opponent threats more aggressively
        if (opponentCount === 3 && emptyCount === 1) {
            score -= 120; // Must block (increased from 4)
        } else if (opponentCount === 2 && emptyCount === 2) {
            score -= 10; // Watch opponent
        }

        return score;
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
