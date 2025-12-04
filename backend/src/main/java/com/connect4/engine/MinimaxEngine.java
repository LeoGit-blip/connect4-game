package com.connect4.engine;

import com.connect4.model.Board;
import com.connect4.model.Player;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Enhanced Minimax algorithm implementation with alpha-beta pruning,
 * threat detection, transposition tables, and iterative deepening.
 */
@Component
public class MinimaxEngine {

    private static final int WIN_SCORE = 100000;
    private static final int DRAW_SCORE = 0;

    // Column weights - prefer center columns
    private static final int[] COLUMN_WEIGHTS = { 3, 4, 5, 7, 5, 4, 3 };

    private final GameEngine gameEngine;
    private final ThreatDetector threatDetector;
    private final OpeningBook openingBook;
    private final TranspositionTable transpositionTable;

    public MinimaxEngine(GameEngine gameEngine, ThreatDetector threatDetector,
            OpeningBook openingBook, TranspositionTable transpositionTable) {
        this.gameEngine = gameEngine;
        this.threatDetector = threatDetector;
        this.openingBook = openingBook;
        this.transpositionTable = transpositionTable;
    }

    /**
     * Finds the best move for the given player using enhanced minimax algorithm.
     * Uses opening book, threat detection, transposition tables, and iterative
     * deepening.
     * 
     * @param board  Current board state
     * @param player Player to find move for
     * @param depth  Maximum search depth
     * @return Best column to play (0-6)
     */
    public int findBestMove(Board board, Player player, int depth) {
        // 1. Check opening book first
        if (openingBook.shouldUseOpeningBook(board)) {
            Integer openingMove = openingBook.getOpeningMove(board);
            if (openingMove != null) {
                return openingMove;
            }
        }

        // 2. Check for immediate threats
        List<ThreatDetector.Threat> ourThreats = threatDetector.detectThreats(board, player);
        for (ThreatDetector.Threat threat : ourThreats) {
            if (threat.type == ThreatDetector.ThreatType.IMMEDIATE_WIN) {
                return threat.column; // Take the win!
            }
        }

        // 3. Check if we need to block opponent's immediate win
        Player opponent = (player == Player.RED) ? Player.YELLOW : Player.RED;
        List<ThreatDetector.Threat> opponentThreats = threatDetector.detectThreats(board, opponent);
        for (ThreatDetector.Threat threat : opponentThreats) {
            if (threat.type == ThreatDetector.ThreatType.IMMEDIATE_WIN) {
                // Must block! But first check if it creates a vertical threat
                if (!threatDetector.createsVerticalThreat(board, threat.column, player)) {
                    return threat.column;
                }
            }
        }

        // 4. Use iterative deepening for deep searches (Grandmaster level)
        if (depth >= 12) {
            return findBestMoveIterativeDeepening(board, player, depth);
        }

        // 5. Standard minimax with alpha-beta pruning
        return findBestMoveStandard(board, player, depth);
    }

    /**
     * Iterative deepening search - progressively deepens search depth.
     * Better move ordering from shallower searches improves pruning at deeper
     * levels.
     */
    private int findBestMoveIterativeDeepening(Board board, Player player, int maxDepth) {
        int bestMove = 3; // Default to center

        // Start from depth 4 and work up to maxDepth
        for (int currentDepth = 4; currentDepth <= maxDepth; currentDepth += 2) {
            int move = findBestMoveStandard(board, player, currentDepth);
            if (move != -1) {
                bestMove = move;
            }
        }

        return bestMove;
    }

    /**
     * Standard minimax search with enhanced move ordering.
     */
    private int findBestMoveStandard(Board board, Player player, int depth) {
        int bestMove = 3; // Default to center
        int bestScore = Integer.MIN_VALUE;
        int alpha = Integer.MIN_VALUE;
        int beta = Integer.MAX_VALUE;

        List<Integer> validMoves = getValidMoves(board);

        // Enhanced move ordering for better pruning
        validMoves = orderMoves(board, validMoves, player);

        for (int column : validMoves) {
            // Skip moves that create vertical threats
            if (threatDetector.createsVerticalThreat(board, column, player)) {
                continue;
            }

            Board testBoard = copyBoard(board);
            int row = testBoard.dropPiece(column, player);

            if (row != -1) {
                int score = minimax(testBoard, depth - 1, alpha, beta, false, player);

                // Add column preference bonus
                score += COLUMN_WEIGHTS[column];

                if (score > bestScore) {
                    bestScore = score;
                    bestMove = column;
                }

                alpha = Math.max(alpha, score);

                // Alpha-beta cutoff
                if (beta <= alpha) {
                    break;
                }
            }
        }

        return bestMove;
    }

    /**
     * Orders moves for better alpha-beta pruning.
     * Priority: center columns, winning moves, blocking moves, cached best moves.
     */
    private List<Integer> orderMoves(Board board, List<Integer> moves, Player player) {
        List<MoveScore> scoredMoves = new ArrayList<>();

        for (int col : moves) {
            int score = 0;

            // Prefer center columns
            score += COLUMN_WEIGHTS[col] * 10;

            // Check if this move wins
            Board testBoard = copyBoard(board);
            int row = testBoard.dropPiece(col, player);
            if (row != -1 && checkWin(testBoard, row, col, player)) {
                score += 10000; // Winning moves first!
            }

            // Check if this blocks opponent win
            Player opponent = (player == Player.RED) ? Player.YELLOW : Player.RED;
            Board testBoard2 = copyBoard(board);
            int row2 = testBoard2.dropPiece(col, opponent);
            if (row2 != -1 && checkWin(testBoard2, row2, col, opponent)) {
                score += 5000; // Blocking moves second
            }

            scoredMoves.add(new MoveScore(col, score));
        }

        // Sort by score descending
        scoredMoves.sort((a, b) -> Integer.compare(b.score, a.score));

        List<Integer> orderedMoves = new ArrayList<>();
        for (MoveScore ms : scoredMoves) {
            orderedMoves.add(ms.column);
        }

        return orderedMoves;
    }

    /**
     * Helper class for move ordering.
     */
    private static class MoveScore {
        int column;
        int score;

        MoveScore(int column, int score) {
            this.column = column;
            this.score = score;
        }
    }

    /**
     * Minimax algorithm with alpha-beta pruning and transposition table.
     * 
     * @param board        Current board state
     * @param depth        Remaining search depth
     * @param alpha        Alpha value for pruning
     * @param beta         Beta value for pruning
     * @param isMaximizing True if maximizing player's turn
     * @param player       The AI player
     * @return Evaluation score
     */
    private int minimax(Board board, int depth, int alpha, int beta,
            boolean isMaximizing, Player player) {
        Player opponent = (player == Player.RED) ? Player.YELLOW : Player.RED;

        // Check transposition table
        long hash = transpositionTable.computeHash(board);
        TranspositionTable.TranspositionEntry cached = transpositionTable.lookup(hash, depth);
        if (cached != null) {
            return cached.score;
        }

        // Check terminal conditions
        if (depth == 0 || gameEngine.isBoardFull(board)) {
            int score = evaluatePosition(board, player);
            transpositionTable.store(hash, depth, score, -1);
            return score;
        }

        List<Integer> validMoves = getValidMoves(board);

        if (validMoves.isEmpty()) {
            transpositionTable.store(hash, depth, DRAW_SCORE, -1);
            return DRAW_SCORE;
        }

        // Order moves for better pruning
        validMoves = orderMoves(board, validMoves, isMaximizing ? player : opponent);

        if (isMaximizing) {
            int maxScore = Integer.MIN_VALUE;
            int bestMove = -1;

            for (int column : validMoves) {
                Board testBoard = copyBoard(board);
                int row = testBoard.dropPiece(column, player);

                if (row != -1) {
                    // Check if this move wins
                    if (checkWin(testBoard, row, column, player)) {
                        int winScore = WIN_SCORE + depth; // Prefer faster wins
                        transpositionTable.store(hash, depth, winScore, column);
                        return winScore;
                    }

                    int score = minimax(testBoard, depth - 1, alpha, beta, false, player);

                    if (score > maxScore) {
                        maxScore = score;
                        bestMove = column;
                    }

                    alpha = Math.max(alpha, score);

                    if (beta <= alpha) {
                        break; // Beta cutoff
                    }
                }
            }

            transpositionTable.store(hash, depth, maxScore, bestMove);
            return maxScore;
        } else {
            int minScore = Integer.MAX_VALUE;
            int bestMove = -1;

            for (int column : validMoves) {
                Board testBoard = copyBoard(board);
                int row = testBoard.dropPiece(column, opponent);

                if (row != -1) {
                    // Check if opponent wins
                    if (checkWin(testBoard, row, column, opponent)) {
                        int lossScore = -WIN_SCORE - depth; // Prefer delaying losses
                        transpositionTable.store(hash, depth, lossScore, column);
                        return lossScore;
                    }

                    int score = minimax(testBoard, depth - 1, alpha, beta, true, player);

                    if (score < minScore) {
                        minScore = score;
                        bestMove = column;
                    }

                    beta = Math.min(beta, score);

                    if (beta <= alpha) {
                        break; // Alpha cutoff
                    }
                }
            }

            transpositionTable.store(hash, depth, minScore, bestMove);
            return minScore;
        }
    }

    /**
     * Enhanced evaluation function for board positions.
     * Considers windows, center control, connectivity, and threats.
     * 
     * @param board  Board to evaluate
     * @param player Player to evaluate for
     * @return Evaluation score (positive is good for player)
     */
    public int evaluatePosition(Board board, Player player) {
        Player opponent = (player == Player.RED) ? Player.YELLOW : Player.RED;
        int score = 0;

        // 1. Evaluate all possible 4-cell windows
        // Horizontal windows
        for (int row = 0; row < Board.ROWS; row++) {
            for (int col = 0; col <= Board.COLS - 4; col++) {
                List<Player> window = new ArrayList<>();
                for (int i = 0; i < 4; i++) {
                    window.add(board.getCell(row, col + i));
                }
                score += scoreWindow(window, player, opponent);
            }
        }

        // Vertical windows
        for (int row = 0; row <= Board.ROWS - 4; row++) {
            for (int col = 0; col < Board.COLS; col++) {
                List<Player> window = new ArrayList<>();
                for (int i = 0; i < 4; i++) {
                    window.add(board.getCell(row + i, col));
                }
                score += scoreWindow(window, player, opponent);
            }
        }

        // Diagonal windows (down-right)
        for (int row = 0; row <= Board.ROWS - 4; row++) {
            for (int col = 0; col <= Board.COLS - 4; col++) {
                List<Player> window = new ArrayList<>();
                for (int i = 0; i < 4; i++) {
                    window.add(board.getCell(row + i, col + i));
                }
                score += scoreWindow(window, player, opponent);
            }
        }

        // Diagonal windows (down-left)
        for (int row = 0; row <= Board.ROWS - 4; row++) {
            for (int col = 3; col < Board.COLS; col++) {
                List<Player> window = new ArrayList<>();
                for (int i = 0; i < 4; i++) {
                    window.add(board.getCell(row + i, col - i));
                }
                score += scoreWindow(window, player, opponent);
            }
        }

        // 2. Center column control (very important in Connect4)
        int centerCol = 3;
        int centerCount = 0;
        for (int row = 0; row < Board.ROWS; row++) {
            if (board.getCell(row, centerCol) == player) {
                centerCount++;
                score += 5; // Bonus for each piece in center
            } else if (board.getCell(row, centerCol) == opponent) {
                score -= 3; // Penalty for opponent center control
            }
        }

        // Extra bonus for strong center control
        if (centerCount >= 3) {
            score += 10;
        }

        // 3. Connectivity bonus - reward connected pieces
        score += evaluateConnectivity(board, player) - evaluateConnectivity(board, opponent);

        // 4. Positional scoring - prefer lower rows and center columns
        for (int row = 0; row < Board.ROWS; row++) {
            for (int col = 0; col < Board.COLS; col++) {
                if (board.getCell(row, col) == player) {
                    // Prefer pieces in lower rows (more stable)
                    score += (Board.ROWS - row);

                    // Prefer center columns
                    score += COLUMN_WEIGHTS[col];
                }
            }
        }

        // 5. Threat evaluation
        List<ThreatDetector.Threat> ourThreats = threatDetector.detectThreats(board, player);
        List<ThreatDetector.Threat> oppThreats = threatDetector.detectThreats(board, opponent);

        for (ThreatDetector.Threat threat : ourThreats) {
            score += threat.score / 10; // Add threat value
        }

        for (ThreatDetector.Threat threat : oppThreats) {
            score -= threat.score / 10; // Penalize opponent threats
        }

        return score;
    }

    /**
     * Evaluates connectivity - how well pieces are connected.
     */
    private int evaluateConnectivity(Board board, Player player) {
        int connectivity = 0;

        for (int row = 0; row < Board.ROWS; row++) {
            for (int col = 0; col < Board.COLS; col++) {
                if (board.getCell(row, col) == player) {
                    // Check adjacent cells (horizontal, vertical, diagonal)
                    int adjacentCount = 0;

                    // Horizontal neighbors
                    if (col > 0 && board.getCell(row, col - 1) == player)
                        adjacentCount++;
                    if (col < Board.COLS - 1 && board.getCell(row, col + 1) == player)
                        adjacentCount++;

                    // Vertical neighbors
                    if (row > 0 && board.getCell(row - 1, col) == player)
                        adjacentCount++;
                    if (row < Board.ROWS - 1 && board.getCell(row + 1, col) == player)
                        adjacentCount++;

                    // Diagonal neighbors
                    if (row > 0 && col > 0 && board.getCell(row - 1, col - 1) == player)
                        adjacentCount++;
                    if (row > 0 && col < Board.COLS - 1 && board.getCell(row - 1, col + 1) == player)
                        adjacentCount++;
                    if (row < Board.ROWS - 1 && col > 0 && board.getCell(row + 1, col - 1) == player)
                        adjacentCount++;
                    if (row < Board.ROWS - 1 && col < Board.COLS - 1 && board.getCell(row + 1, col + 1) == player)
                        adjacentCount++;

                    connectivity += adjacentCount * 2; // Bonus for each connection
                }
            }
        }

        return connectivity;
    }

    /**
     * Scores a 4-cell window with enhanced threat detection.
     * 
     * @param window   List of 4 cells
     * @param player   AI player
     * @param opponent Opponent player
     * @return Score for this window
     */
    private int scoreWindow(List<Player> window, Player player, Player opponent) {
        int score = 0;

        int playerCount = 0;
        int opponentCount = 0;
        int emptyCount = 0;

        for (Player cell : window) {
            if (cell == player) {
                playerCount++;
            } else if (cell == opponent) {
                opponentCount++;
            } else {
                emptyCount++;
            }
        }

        // Can't use this window if both players have pieces in it
        if (playerCount > 0 && opponentCount > 0) {
            return 0;
        }

        // Score based on player's pieces
        if (playerCount == 4) {
            score += WIN_SCORE; // Four in a row = win
        } else if (playerCount == 3 && emptyCount == 1) {
            score += 150; // Three in a row with one empty = strong threat (increased from 100)
        } else if (playerCount == 2 && emptyCount == 2) {
            score += 15; // Two in a row with two empty = setup (increased from 10)
        } else if (playerCount == 1 && emptyCount == 3) {
            score += 2; // One piece with three empty = potential
        }

        // Penalize opponent's threats more aggressively
        if (opponentCount == 3 && emptyCount == 1) {
            score -= 120; // Must block opponent's three in a row (increased from 80)
        } else if (opponentCount == 2 && emptyCount == 2) {
            score -= 10; // Watch opponent's two in a row (increased from 5)
        }

        return score;
    }

    /**
     * Gets all valid moves (non-full columns).
     */
    private List<Integer> getValidMoves(Board board) {
        List<Integer> validMoves = new ArrayList<>();
        for (int col = 0; col < Board.COLS; col++) {
            if (!board.isColumnFull(col)) {
                validMoves.add(col);
            }
        }
        return validMoves;
    }

    /**
     * Checks if a move resulted in a win.
     */
    private boolean checkWin(Board board, int row, int col, Player player) {
        // Check horizontal
        if (countInDirection(board, row, col, 0, 1, player) +
                countInDirection(board, row, col, 0, -1, player) >= 3) {
            return true;
        }

        // Check vertical
        if (countInDirection(board, row, col, 1, 0, player) +
                countInDirection(board, row, col, -1, 0, player) >= 3) {
            return true;
        }

        // Check diagonal \
        if (countInDirection(board, row, col, 1, 1, player) +
                countInDirection(board, row, col, -1, -1, player) >= 3) {
            return true;
        }

        // Check diagonal /
        if (countInDirection(board, row, col, 1, -1, player) +
                countInDirection(board, row, col, -1, 1, player) >= 3) {
            return true;
        }

        return false;
    }

    /**
     * Counts consecutive pieces in a direction.
     */
    private int countInDirection(Board board, int row, int col, int dRow, int dCol, Player player) {
        int count = 0;
        int r = row + dRow;
        int c = col + dCol;

        while (r >= 0 && r < Board.ROWS && c >= 0 && c < Board.COLS) {
            if (board.getCell(r, c) == player) {
                count++;
                r += dRow;
                c += dCol;
            } else {
                break;
            }
        }

        return count;
    }

    /**
     * Creates a deep copy of the board.
     */
    private Board copyBoard(Board original) {
        Board copy = new Board();
        Player[][] originalGrid = original.getGrid();
        Player[][] copyGrid = copy.getGrid();

        for (int row = 0; row < Board.ROWS; row++) {
            for (int col = 0; col < Board.COLS; col++) {
                copyGrid[row][col] = originalGrid[row][col];
            }
        }

        return copy;
    }
}
