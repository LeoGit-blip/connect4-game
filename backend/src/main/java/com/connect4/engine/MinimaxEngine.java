package com.connect4.engine;

import com.connect4.model.Board;
import com.connect4.model.Player;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Minimax algorithm implementation with alpha-beta pruning for AI opponent.
 */
@Component
public class MinimaxEngine {

    private static final int WIN_SCORE = 100000;
    private static final int DRAW_SCORE = 0;

    // Column weights - prefer center columns
    private static final int[] COLUMN_WEIGHTS = { 3, 4, 5, 7, 5, 4, 3 };

    private final GameEngine gameEngine;

    public MinimaxEngine(GameEngine gameEngine) {
        this.gameEngine = gameEngine;
    }

    /**
     * Finds the best move for the given player using minimax algorithm.
     * 
     * @param board  Current board state
     * @param player Player to find move for
     * @param depth  Search depth
     * @return Best column to play (0-6)
     */
    public int findBestMove(Board board, Player player, int depth) {
        int bestMove = 3; // Default to center
        int bestScore = Integer.MIN_VALUE;
        int alpha = Integer.MIN_VALUE;
        int beta = Integer.MAX_VALUE;

        List<Integer> validMoves = getValidMoves(board);

        // Order moves - check center columns first for better pruning
        validMoves.sort((a, b) -> Integer.compare(
                Math.abs(b - 3), Math.abs(a - 3)));

        for (int column : validMoves) {
            Board testBoard = copyBoard(board);
            int row = testBoard.dropPiece(column, player);

            if (row != -1) {
                int score = minimax(testBoard, depth - 1, alpha, beta, false, player);

                // Add column preference
                score += COLUMN_WEIGHTS[column];

                if (score > bestScore) {
                    bestScore = score;
                    bestMove = column;
                }

                alpha = Math.max(alpha, score);
            }
        }

        return bestMove;
    }

    /**
     * Minimax algorithm with alpha-beta pruning.
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

        // Check terminal conditions
        if (depth == 0 || gameEngine.isBoardFull(board)) {
            return evaluatePosition(board, player);
        }

        List<Integer> validMoves = getValidMoves(board);

        if (validMoves.isEmpty()) {
            return DRAW_SCORE;
        }

        if (isMaximizing) {
            int maxScore = Integer.MIN_VALUE;

            for (int column : validMoves) {
                Board testBoard = copyBoard(board);
                int row = testBoard.dropPiece(column, player);

                if (row != -1) {
                    // Check if this move wins
                    if (checkWin(testBoard, row, column, player)) {
                        return WIN_SCORE + depth; // Prefer faster wins
                    }

                    int score = minimax(testBoard, depth - 1, alpha, beta, false, player);
                    maxScore = Math.max(maxScore, score);
                    alpha = Math.max(alpha, score);

                    if (beta <= alpha) {
                        break; // Beta cutoff
                    }
                }
            }

            return maxScore;
        } else {
            int minScore = Integer.MAX_VALUE;

            for (int column : validMoves) {
                Board testBoard = copyBoard(board);
                int row = testBoard.dropPiece(column, opponent);

                if (row != -1) {
                    // Check if opponent wins
                    if (checkWin(testBoard, row, column, opponent)) {
                        return -WIN_SCORE - depth; // Prefer delaying losses
                    }

                    int score = minimax(testBoard, depth - 1, alpha, beta, true, player);
                    minScore = Math.min(minScore, score);
                    beta = Math.min(beta, score);

                    if (beta <= alpha) {
                        break; // Alpha cutoff
                    }
                }
            }

            return minScore;
        }
    }

    /**
     * Evaluates the board position for the given player.
     * 
     * @param board  Board to evaluate
     * @param player Player to evaluate for
     * @return Evaluation score (positive is good for player)
     */
    public int evaluatePosition(Board board, Player player) {
        Player opponent = (player == Player.RED) ? Player.YELLOW : Player.RED;
        int score = 0;

        // Evaluate all possible 4-cell windows
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

        // Add center column preference
        for (int row = 0; row < Board.ROWS; row++) {
            if (board.getCell(row, 3) == player) {
                score += 3;
            }
        }

        return score;
    }

    /**
     * Scores a 4-cell window.
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

        // Can't use this window if opponent has pieces in it
        if (playerCount > 0 && opponentCount > 0) {
            return 0;
        }

        // Score based on player's pieces
        if (playerCount == 4) {
            score += WIN_SCORE;
        } else if (playerCount == 3 && emptyCount == 1) {
            score += 100;
        } else if (playerCount == 2 && emptyCount == 2) {
            score += 10;
        }

        // Penalize opponent's threats
        if (opponentCount == 3 && emptyCount == 1) {
            score -= 80;
        } else if (opponentCount == 2 && emptyCount == 2) {
            score -= 5;
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
