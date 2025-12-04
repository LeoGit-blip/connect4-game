package com.connect4.engine;

import com.connect4.model.Board;
import com.connect4.model.Player;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Transposition table for caching board evaluations.
 * Uses Zobrist hashing for efficient position lookup.
 */
@Component
public class TranspositionTable {

    private static final int MAX_ENTRIES = 100000; // Limit cache size
    private final Map<Long, TranspositionEntry> table;
    private final long[][][] zobristTable;
    private final Random random;

    public static class TranspositionEntry {
        public final int depth;
        public final int score;
        public final int bestMove;
        public final long timestamp;

        public TranspositionEntry(int depth, int score, int bestMove) {
            this.depth = depth;
            this.score = score;
            this.bestMove = bestMove;
            this.timestamp = System.currentTimeMillis();
        }
    }

    public TranspositionTable() {
        this.table = new LinkedHashMap<Long, TranspositionEntry>(MAX_ENTRIES, 0.75f, true) {
            @Override
            protected boolean removeEldestEntry(Map.Entry<Long, TranspositionEntry> eldest) {
                return size() > MAX_ENTRIES;
            }
        };

        this.random = new Random(12345); // Fixed seed for consistency
        this.zobristTable = new long[Board.ROWS][Board.COLS][2]; // 2 players
        initializeZobristTable();
    }

    /**
     * Initializes Zobrist hash values.
     */
    private void initializeZobristTable() {
        for (int row = 0; row < Board.ROWS; row++) {
            for (int col = 0; col < Board.COLS; col++) {
                zobristTable[row][col][0] = random.nextLong();
                zobristTable[row][col][1] = random.nextLong();
            }
        }
    }

    /**
     * Computes Zobrist hash for a board position.
     */
    public long computeHash(Board board) {
        long hash = 0L;
        for (int row = 0; row < Board.ROWS; row++) {
            for (int col = 0; col < Board.COLS; col++) {
                Player player = board.getCell(row, col);
                if (player != null) {
                    int playerIndex = (player == Player.RED) ? 0 : 1;
                    hash ^= zobristTable[row][col][playerIndex];
                }
            }
        }
        return hash;
    }

    /**
     * Looks up a position in the transposition table.
     */
    public TranspositionEntry lookup(long hash, int depth) {
        TranspositionEntry entry = table.get(hash);

        // Only use cached result if it was computed at equal or greater depth
        if (entry != null && entry.depth >= depth) {
            return entry;
        }

        return null;
    }

    /**
     * Stores a position evaluation in the transposition table.
     */
    public void store(long hash, int depth, int score, int bestMove) {
        table.put(hash, new TranspositionEntry(depth, score, bestMove));
    }

    /**
     * Clears the transposition table.
     */
    public void clear() {
        table.clear();
    }

    /**
     * Gets the current size of the table.
     */
    public int size() {
        return table.size();
    }

    /**
     * Gets cache hit statistics (for debugging/optimization).
     */
    public double getHitRate() {
        // This would require tracking hits/misses - simplified for now
        return (double) table.size() / MAX_ENTRIES;
    }
}
