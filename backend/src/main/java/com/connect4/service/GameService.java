package com.connect4.service;

import com.connect4.dto.GameResponse;
import com.connect4.dto.MoveRequest;
import com.connect4.dto.MoveResponse;

/**
 * Service interface for game operations.
 */
public interface GameService {
    /**
     * Creates a new game.
     * 
     * @return GameResponse with new game details
     */
    GameResponse createGame();

    /**
     * Retrieves a game by ID.
     * 
     * @param gameId Game identifier
     * @return GameResponse with game state
     */
    GameResponse getGame(String gameId);

    /**
     * Makes a move in the specified game.
     * 
     * @param gameId  Game identifier
     * @param request Move request containing column
     * @return MoveResponse with move result
     */
    MoveResponse makeMove(String gameId, MoveRequest request);

    /**
     * Resets an existing game.
     * 
     * @param gameId Game identifier
     * @return GameResponse with reset game state
     */
    GameResponse resetGame(String gameId);

    /**
     * Deletes a game.
     * 
     * @param gameId Game identifier
     */
    void deleteGame(String gameId);
}
