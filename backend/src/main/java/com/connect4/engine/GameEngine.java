package com.connect4.engine;

import com.connect4.model.Board;
import com.connect4.model.GameStatus;
import com.connect4.model.Player;
import org.springframework.stereotype.Component;

/**
 * Game engine containing all game logic for Connect 4.
 * Handles win detection and game state validation.
 */
@Component
public class GameEngine {
    private static final int CONNECT_COUNT = 4;

    /**
     * Checks if the last move resulted in a win or draw.
     * 
     * @param board   Current board state
     * @param lastRow Row of last move
     * @param lastCol Column of last move
     * @param player  Player who made the last move
     * @return GameStatus indicating the result
     */
    public GameStatus checkWin(Board board, int lastRow, int lastCol, Player player) {
        // Check all four directions for a win
        if (checkDirection(board, lastRow, lastCol, 0, 1, player) || // Horizontal
                checkDirection(board, lastRow, lastCol, 1, 0, player) || // Vertical
                checkDirection(board, lastRow, lastCol, 1, 1, player) || // Diagonal \
                checkDirection(board, lastRow, lastCol, 1, -1, player)) { // Diagonal /

            return (player == Player.RED) ? GameStatus.RED_WINS : GameStatus.YELLOW_WINS;
        }

        // Check for draw (board full)
        if (isBoardFull(board)) {
            return GameStatus.DRAW;
        }

        return GameStatus.IN_PROGRESS;
    }

    /**
     * Checks for 4 consecutive pieces in a specific direction.
     * 
     * @param board  Current board state
     * @param row    Starting row
     * @param col    Starting column
     * @param dRow   Row direction (-1, 0, or 1)
     * @param dCol   Column direction (-1, 0, or 1)
     * @param player Player to check for
     * @return true if 4 in a row found, false otherwise
     */
    private boolean checkDirection(Board board, int row, int col, int dRow, int dCol, Player player) {
        // Count in positive direction
        int count = 1; // Count the piece just placed
        count += countConsecutive(board, row, col, dRow, dCol, player);

        // Count in negative direction
        count += countConsecutive(board, row, col, -dRow, -dCol, player);

        return count >= CONNECT_COUNT;
    }

    /**
     * Counts consecutive pieces in a specific direction.
     * 
     * @param board  Current board state
     * @param row    Starting row
     * @param col    Starting column
     * @param dRow   Row direction
     * @param dCol   Column direction
     * @param player Player to check for
     * @return Number of consecutive pieces found
     */
    private int countConsecutive(Board board, int row, int col, int dRow, int dCol, Player player) {
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
     * Checks if the board is completely full.
     * 
     * @param board Board to check
     * @return true if board is full, false otherwise
     */
    public boolean isBoardFull(Board board) {
        for (int col = 0; col < Board.COLS; col++) {
            if (!board.isColumnFull(col)) {
                return false;
            }
        }
        return true;
    }
}
