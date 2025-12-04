package com.connect4.engine;

import com.connect4.model.Board;
import com.connect4.model.Player;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Detects threats and strategic patterns on the Connect4 board.
 * Used to identify winning opportunities, blocking needs, and forced sequences.
 */
@Component
public class ThreatDetector {

    /**
     * Represents a threat (potential winning position).
     */
    public static class Threat {
        public final int column;
        public final int row;
        public final Player player;
        public final ThreatType type;
        public final int score;

        public Threat(int column, int row, Player player, ThreatType type, int score) {
            this.column = column;
            this.row = row;
            this.player = player;
            this.type = type;
            this.score = score;
        }
    }

    public enum ThreatType {
        IMMEDIATE_WIN, // Can win on next move
        DOUBLE_THREAT, // Two ways to win (unstoppable)
        FORCED_SEQUENCE, // Leads to guaranteed win
        SETUP_THREAT // Creates future winning opportunity
    }

    /**
     * Detects all threats for a given player.
     */
    public List<Threat> detectThreats(Board board, Player player) {
        List<Threat> threats = new ArrayList<>();

        // Check for immediate winning moves
        for (int col = 0; col < Board.COLS; col++) {
            if (!board.isColumnFull(col)) {
                int row = getLowestRow(board, col);
                if (row != -1) {
                    Board testBoard = copyBoard(board);
                    testBoard.dropPiece(col, player);
                    if (checkWin(testBoard, row, col, player)) {
                        threats.add(new Threat(col, row, player, ThreatType.IMMEDIATE_WIN, 10000));
                    }
                }
            }
        }

        // Check for double threats (two ways to win)
        for (int col = 0; col < Board.COLS; col++) {
            if (!board.isColumnFull(col)) {
                int row = getLowestRow(board, col);
                if (row != -1) {
                    Board testBoard = copyBoard(board);
                    testBoard.dropPiece(col, player);

                    // After this move, can we create two winning threats?
                    int winCount = 0;
                    for (int nextCol = 0; nextCol < Board.COLS; nextCol++) {
                        if (!testBoard.isColumnFull(nextCol)) {
                            int nextRow = getLowestRow(testBoard, nextCol);
                            if (nextRow != -1) {
                                Board testBoard2 = copyBoard(testBoard);
                                testBoard2.dropPiece(nextCol, player);
                                if (checkWin(testBoard2, nextRow, nextCol, player)) {
                                    winCount++;
                                }
                            }
                        }
                    }

                    if (winCount >= 2) {
                        threats.add(new Threat(col, row, player, ThreatType.DOUBLE_THREAT, 5000));
                    }
                }
            }
        }

        return threats;
    }

    /**
     * Checks if a move creates a vertical threat (opponent can win on top).
     * This is dangerous and should be avoided.
     */
    public boolean createsVerticalThreat(Board board, int column, Player player) {
        if (board.isColumnFull(column)) {
            return false;
        }

        int row = getLowestRow(board, column);
        if (row == -1 || row == 0) {
            return false; // Top row, no threat above
        }

        Player opponent = (player == Player.RED) ? Player.YELLOW : Player.RED;

        // Simulate our move
        Board testBoard = copyBoard(board);
        testBoard.dropPiece(column, player);

        // Check if opponent can win on the row above
        int rowAbove = row - 1;
        Board testBoard2 = copyBoard(testBoard);
        testBoard2.dropPiece(column, opponent);

        return checkWin(testBoard2, rowAbove, column, opponent);
    }

    /**
     * Evaluates the severity of a threat.
     */
    public int evaluateThreat(Threat threat) {
        return threat.score;
    }

    /**
     * Finds the best threat to pursue.
     */
    public Threat findBestThreat(List<Threat> threats) {
        if (threats.isEmpty()) {
            return null;
        }

        Threat best = threats.get(0);
        for (Threat threat : threats) {
            if (threat.score > best.score) {
                best = threat;
            }
        }
        return best;
    }

    /**
     * Checks if a position leads to a forced win within N moves.
     */
    public boolean isForcedWin(Board board, Player player, int movesAhead) {
        if (movesAhead <= 0) {
            return false;
        }

        // Check if we can win immediately
        for (int col = 0; col < Board.COLS; col++) {
            if (!board.isColumnFull(col)) {
                int row = getLowestRow(board, col);
                if (row != -1) {
                    Board testBoard = copyBoard(board);
                    testBoard.dropPiece(col, player);
                    if (checkWin(testBoard, row, col, player)) {
                        return true;
                    }
                }
            }
        }

        // Check for double threats (unstoppable)
        List<Threat> threats = detectThreats(board, player);
        for (Threat threat : threats) {
            if (threat.type == ThreatType.DOUBLE_THREAT) {
                return true;
            }
        }

        return false;
    }

    // Helper methods

    private int getLowestRow(Board board, int col) {
        for (int r = Board.ROWS - 1; r >= 0; r--) {
            if (board.getCell(r, col) == null) {
                return r;
            }
        }
        return -1;
    }

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
