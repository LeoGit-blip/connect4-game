package com.connect4.service;

import com.connect4.dto.AIMoveResponse;
import com.connect4.model.Board;
import com.connect4.model.Player;

import java.util.List;

/**
 * Service interface for AI operations.
 */
public interface AIService {
    /**
     * Calculates the best move for the AI in the given game.
     * 
     * @param gameId Game identifier
     * @return AI move response with column and evaluation
     */
    AIMoveResponse calculateBestMove(String gameId);

    /**
     * Evaluates the board position for a player.
     * 
     * @param board  Current board state
     * @param player Player to evaluate for
     * @return Evaluation score
     */
    int evaluateBoard(Board board, Player player);

    /**
     * Gets all valid moves (non-full columns).
     * 
     * @param board Current board state
     * @return List of valid column indices
     */
    List<Integer> getValidMoves(Board board);
}
