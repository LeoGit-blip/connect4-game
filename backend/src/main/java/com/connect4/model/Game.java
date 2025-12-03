package com.connect4.model;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Represents a complete Connect 4 game session.
 */
@Data
public class Game {
    private String gameId;
    private Board board;
    private Player currentPlayer;
    private GameStatus status;
    private List<Move> moveHistory;
    private LocalDateTime createdAt;
    private LocalDateTime lastMoveAt;
    private GameConfiguration configuration; // NEW: Game configuration
    private boolean isAIThinking; // NEW: AI processing state

    /**
     * Constructor - creates a new game.
     * 
     * @param gameId Unique identifier for this game
     */
    public Game(String gameId) {
        this.gameId = gameId;
        this.board = new Board();
        this.currentPlayer = Player.RED; // RED always starts by default
        this.status = GameStatus.IN_PROGRESS;
        this.moveHistory = new ArrayList<>();
        this.createdAt = LocalDateTime.now();
        this.lastMoveAt = LocalDateTime.now();
        this.configuration = null;
        this.isAIThinking = false;
    }

    /**
     * Constructor with configuration.
     */
    public Game(String gameId, GameConfiguration configuration) {
        this(gameId);
        this.configuration = configuration;
        if (configuration != null && configuration.getFirstPlayer() != null) {
            this.currentPlayer = configuration.getFirstPlayer();
        }
    }

    /**
     * Adds a move to the game history.
     * 
     * @param move Move to add
     */
    public void addMove(Move move) {
        moveHistory.add(move);
        lastMoveAt = LocalDateTime.now();
    }

    /**
     * Switches the current player.
     */
    public void switchPlayer() {
        currentPlayer = (currentPlayer == Player.RED) ? Player.YELLOW : Player.RED;
    }

    /**
     * Resets the game to initial state.
     */
    public void reset() {
        board.reset();
        currentPlayer = (configuration != null && configuration.getFirstPlayer() != null)
                ? configuration.getFirstPlayer()
                : Player.RED;
        status = GameStatus.IN_PROGRESS;
        moveHistory.clear();
        lastMoveAt = LocalDateTime.now();
        isAIThinking = false;
    }

    /**
     * Checks if current turn is AI's turn.
     */
    public boolean isAITurn() {
        if (configuration == null || !configuration.hasAIPlayer()) {
            return false;
        }
        Player aiPlayer = configuration.getAIPlayer();
        return currentPlayer == aiPlayer;
    }

    /**
     * Gets configuration for current player.
     */
    public PlayerConfig getCurrentPlayerConfig() {
        if (configuration == null) {
            return null;
        }
        return configuration.getConfigForPlayer(currentPlayer);
    }
}
