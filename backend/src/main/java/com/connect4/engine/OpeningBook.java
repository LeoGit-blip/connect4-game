package com.connect4.engine;

import com.connect4.model.Board;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

/**
 * Opening book for Connect4.
 * Contains pre-calculated optimal opening moves for strong play.
 */
@Component
public class OpeningBook {

    private final Map<String, Integer> openingMoves;

    public OpeningBook() {
        this.openingMoves = new HashMap<>();
        initializeOpenings();
    }

    /**
     * Gets the optimal opening move for the current board state.
     * Returns null if no opening book move is available.
     */
    public Integer getOpeningMove(Board board) {
        int moveCount = countMoves(board);

        // Only use opening book for first 4 moves
        if (moveCount > 4) {
            return null;
        }

        String boardKey = getBoardKey(board);
        return openingMoves.get(boardKey);
    }

    /**
     * Initializes the opening book with proven strong moves.
     */
    private void initializeOpenings() {
        // First move: Always play center (column 3)
        openingMoves.put(emptyBoardKey(), 3);

        // Response to center opening
        // If opponent plays center, play adjacent (col 2 or 4)
        openingMoves.put("0000003", 2); // Opponent played center, we play left-center

        // Response to off-center openings
        openingMoves.put("0000030", 3); // Opponent played col 4, we take center
        openingMoves.put("0000300", 3); // Opponent played col 5, we take center
        openingMoves.put("0003000", 3); // Opponent played col 2, we take center
        openingMoves.put("0030000", 3); // Opponent played col 1, we take center
        openingMoves.put("0300000", 3); // Opponent played col 0, we take center
        openingMoves.put("3000000", 3); // Opponent played col 6, we take center

        // Second move patterns (after we played center)
        // Opponent plays adjacent to our center
        openingMoves.put("0000033", 4); // We: center(3), Opp: col 4, We: col 5
        openingMoves.put("0000330", 2); // We: center(3), Opp: col 2, We: col 1

        // Third move patterns - maintain center control
        openingMoves.put("0003033", 2); // Maintain symmetry
        openingMoves.put("0330300", 4); // Maintain symmetry
    }

    /**
     * Generates a simple key representing the board state.
     * Only considers the bottom row for simplicity.
     */
    private String getBoardKey(Board board) {
        StringBuilder key = new StringBuilder();
        for (int col = 0; col < Board.COLS; col++) {
            int count = 0;
            for (int row = Board.ROWS - 1; row >= 0; row--) {
                if (board.getCell(row, col) != null) {
                    count++;
                }
            }
            key.append(count);
        }
        return key.toString();
    }

    private String emptyBoardKey() {
        return "0000000";
    }

    /**
     * Counts total moves made on the board.
     */
    private int countMoves(Board board) {
        int count = 0;
        for (int row = 0; row < Board.ROWS; row++) {
            for (int col = 0; col < Board.COLS; col++) {
                if (board.getCell(row, col) != null) {
                    count++;
                }
            }
        }
        return count;
    }

    /**
     * Checks if we should use the opening book for this position.
     */
    public boolean shouldUseOpeningBook(Board board) {
        return countMoves(board) <= 4;
    }
}
