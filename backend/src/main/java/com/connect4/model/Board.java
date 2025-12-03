package com.connect4.model;

/**
 * Represents the Connect 4 game board.
 * Standard board is 6 rows by 7 columns.
 */
public class Board {
    public static final int ROWS = 6;
    public static final int COLS = 7;
    
    private Player[][] grid;
    
    /**
     * Constructor - initializes an empty board.
     */
    public Board() {
        grid = new Player[ROWS][COLS];
        reset();
    }
    
    /**
     * Resets the board to empty state.
     */
    public void reset() {
        for (int row = 0; row < ROWS; row++) {
            for (int col = 0; col < COLS; col++) {
                grid[row][col] = Player.NONE;
            }
        }
    }
    
    /**
     * Checks if a column is full.
     * @param column Column to check (0-6)
     * @return true if column is full, false otherwise
     */
    public boolean isColumnFull(int column) {
        if (column < 0 || column >= COLS) {
            return true;
        }
        return grid[0][column] != Player.NONE;
    }
    
    /**
     * Drops a piece in the specified column.
     * @param column Column to drop piece in (0-6)
     * @param player Player making the move
     * @return Row where piece landed, or -1 if column is full
     */
    public int dropPiece(int column, Player player) {
        if (isColumnFull(column)) {
            return -1;
        }
        
        // Find the lowest empty row in this column
        for (int row = ROWS - 1; row >= 0; row--) {
            if (grid[row][column] == Player.NONE) {
                grid[row][column] = player;
                return row;
            }
        }
        
        return -1;
    }
    
    /**
     * Gets the player at a specific position.
     * @param row Row index (0-5)
     * @param col Column index (0-6)
     * @return Player at that position
     */
    public Player getCell(int row, int col) {
        if (row < 0 || row >= ROWS || col < 0 || col >= COLS) {
            return Player.NONE;
        }
        return grid[row][col];
    }
    
    /**
     * Gets the entire board grid.
     * @return 2D array representing the board
     */
    public Player[][] getGrid() {
        return grid;
    }
    
    /**
     * Creates a copy of the current board state.
     * @return Deep copy of the grid
     */
    public Player[][] getGridCopy() {
        Player[][] copy = new Player[ROWS][COLS];
        for (int row = 0; row < ROWS; row++) {
            System.arraycopy(grid[row], 0, copy[row], 0, COLS);
        }
        return copy;
    }
}
