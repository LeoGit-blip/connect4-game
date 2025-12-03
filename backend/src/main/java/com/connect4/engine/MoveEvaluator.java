package com.connect4.engine;

import com.connect4.model.Board;
import com.connect4.model.Player;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Utility class for evaluating moves.
 */
@Component
public class MoveEvaluator {

    /**
     * Checks if a move in the given column would result in an immediate win.
     * 
     * @param board  Current board state
     * @param column Column to check
     * @param player Player making the move
     * @return true if move wins, false otherwise
     */
    public boolean isWinningMove(Board board, int column, Player player) {
        if (board.isColumnFull(column)) {
            return false;
        }

        // Simulate the move
        Board testBoard = copyBoard(board);
        int row = testBoard.dropPiece(column, player);

        if (row == -1) {
            return false;
        }

        // Check if this creates a win
        return checkWinFromPosition(testBoard, row, column, player);
    }

    /**
     * Checks if a move would block opponent's winning move.
     * 
     * @param board  Current board state
     * @param column Column to check
     * @param player Player making the move
     * @return true if move blocks opponent win, false otherwise
     */
    public boolean isBlockingMove(Board board, int column, Player player) {
        Player opponent = (player == Player.RED) ? Player.YELLOW : Player.RED;
        return isWinningMove(board, column, opponent);
    }

    /**
     * Evaluates a single move.
     * 
     * @param board  Current board state
     * @param column Column to evaluate
     * @param player Player making the move
     * @return Score for this move (higher is better)
     */
    public int evaluateMove(Board board, int column, Player player) {
        if (board.isColumnFull(column)) {
            return Integer.MIN_VALUE;
        }

        int score = 0;

        // Winning move gets highest score
        if (isWinningMove(board, column, player)) {
            score += 10000;
        }

        // Blocking opponent's win gets high score
        if (isBlockingMove(board, column, player)) {
            score += 5000;
        }

        // Center columns are preferred
        int centerDistance = Math.abs(column - 3);
        score += (7 - centerDistance) * 10;

        return score;
    }

    /**
     * Counts the number of potential winning positions for a player.
     * 
     * @param board  Current board state
     * @param player Player to count threats for
     * @return Number of potential wins
     */
    public int countThreats(Board board, Player player) {
        int threats = 0;

        // Check all possible 4-in-a-row positions
        // Horizontal
        for (int row = 0; row < Board.ROWS; row++) {
            for (int col = 0; col <= Board.COLS - 4; col++) {
                if (isThreateningWindow(board, row, col, 0, 1, player)) {
                    threats++;
                }
            }
        }

        // Vertical
        for (int row = 0; row <= Board.ROWS - 4; row++) {
            for (int col = 0; col < Board.COLS; col++) {
                if (isThreateningWindow(board, row, col, 1, 0, player)) {
                    threats++;
                }
            }
        }

        // Diagonal (down-right)
        for (int row = 0; row <= Board.ROWS - 4; row++) {
            for (int col = 0; col <= Board.COLS - 4; col++) {
                if (isThreateningWindow(board, row, col, 1, 1, player)) {
                    threats++;
                }
            }
        }

        // Diagonal (down-left)
        for (int row = 0; row <= Board.ROWS - 4; row++) {
            for (int col = 3; col < Board.COLS; col++) {
                if (isThreateningWindow(board, row, col, 1, -1, player)) {
                    threats++;
                }
            }
        }

        return threats;
    }

    /**
     * Checks if a 4-cell window is threatening (3 of player's pieces + 1 empty).
     */
    private boolean isThreateningWindow(Board board, int startRow, int startCol,
            int dRow, int dCol, Player player) {
        int playerCount = 0;
        int emptyCount = 0;

        for (int i = 0; i < 4; i++) {
            int row = startRow + i * dRow;
            int col = startCol + i * dCol;
            Player cell = board.getCell(row, col);

            if (cell == player) {
                playerCount++;
            } else if (cell == Player.NONE) {
                emptyCount++;
            } else {
                return false; // Opponent piece blocks this window
            }
        }

        return playerCount == 3 && emptyCount == 1;
    }

    /**
     * Checks for win from a specific position.
     */
    private boolean checkWinFromPosition(Board board, int row, int col, Player player) {
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
     * Counts consecutive pieces in a direction (not including starting position).
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
     * Creates a copy of the board.
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
