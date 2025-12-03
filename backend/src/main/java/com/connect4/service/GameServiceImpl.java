package com.connect4.service;

import com.connect4.dto.GameConfigRequest;
import com.connect4.dto.GameResponse;
import com.connect4.dto.MoveRequest;
import com.connect4.dto.MoveResponse;
import com.connect4.engine.GameEngine;
import com.connect4.exception.GameNotFoundException;
import com.connect4.exception.InvalidConfigurationException;
import com.connect4.exception.InvalidMoveException;
import com.connect4.model.*;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Implementation of GameService.
 * Manages game state and operations.
 */
@Service
public class GameServiceImpl implements GameService {
    private final Map<String, Game> games = new ConcurrentHashMap<>();
    private final GameEngine gameEngine;

    public GameServiceImpl(GameEngine gameEngine) {
        this.gameEngine = gameEngine;
    }

    @Override
    public GameResponse createGame() {
        String gameId = generateGameId();
        Game game = new Game(gameId);
        games.put(gameId, game);

        return buildGameResponse(game, "Game created successfully");
    }

    /**
     * Creates a game with configuration.
     */
    public GameResponse createGameWithConfig(GameConfigRequest configRequest) {
        // Validate configuration
        validateConfiguration(configRequest);

        // Build configuration
        GameConfiguration config = new GameConfiguration();
        config.setGameMode(configRequest.getGameMode());
        config.setPlayer1Config(configRequest.getPlayer1Config());
        config.setPlayer2Config(configRequest.getPlayer2Config());
        config.setFirstPlayer(configRequest.getFirstPlayer() != null ? configRequest.getFirstPlayer() : Player.RED);
        config.setTheme(configRequest.getTheme() != null ? configRequest.getTheme() : "classic");

        // Create game
        String gameId = generateGameId();
        Game game = new Game(gameId, config);
        games.put(gameId, game);

        return buildGameResponse(game, "Game created successfully");
    }

    @Override
    public GameResponse getGame(String gameId) {
        Game game = getGameOrThrow(gameId);
        return buildGameResponse(game, getStatusMessage(game));
    }

    @Override
    public MoveResponse makeMove(String gameId, MoveRequest request) {
        Game game = getGameOrThrow(gameId);

        // Validate game is in progress
        if (game.getStatus() != GameStatus.IN_PROGRESS) {
            throw new InvalidMoveException("Game is already finished");
        }

        int column = request.getColumn();

        // Validate column
        if (column < 0 || column >= 7) {
            throw new InvalidMoveException("Invalid column: must be between 0 and 6");
        }

        // Check if column is full
        if (game.getBoard().isColumnFull(column)) {
            throw new InvalidMoveException("Column " + column + " is full");
        }

        // Make the move
        Player currentPlayer = game.getCurrentPlayer();
        int row = game.getBoard().dropPiece(column, currentPlayer);

        if (row == -1) {
            throw new InvalidMoveException("Failed to place piece in column " + column);
        }

        // Create and save move
        Move move = new Move(column, row, currentPlayer);
        game.addMove(move);

        // Check for win or draw
        GameStatus newStatus = gameEngine.checkWin(game.getBoard(), row, column, currentPlayer);
        game.setStatus(newStatus);

        // Build response
        MoveResponse response = new MoveResponse();
        response.setSuccess(true);
        response.setMove(move);
        response.setGameStatus(newStatus);
        response.setBoard(game.getBoard().getGridCopy());

        if (newStatus == GameStatus.RED_WINS || newStatus == GameStatus.YELLOW_WINS) {
            response.setWinner(currentPlayer);
            response.setMessage(currentPlayer + " wins!");
        } else if (newStatus == GameStatus.DRAW) {
            response.setMessage("Game ended in a draw!");
            response.setWinner(null);
        } else {
            // Switch player for next turn
            game.switchPlayer();
            response.setMessage("Move successful");
            response.setWinner(null);
        }

        return response;
    }

    @Override
    public GameResponse resetGame(String gameId) {
        Game game = getGameOrThrow(gameId);
        game.reset();
        return buildGameResponse(game, "Game reset successfully");
    }

    @Override
    public void deleteGame(String gameId) {
        if (!games.containsKey(gameId)) {
            throw new GameNotFoundException("Game not found: " + gameId);
        }
        games.remove(gameId);
    }

    /**
     * Retrieves a game or throws exception if not found.
     * Made public for AIService to access.
     */
    public Game getGameOrThrow(String gameId) {
        Game game = games.get(gameId);
        if (game == null) {
            throw new GameNotFoundException("Game not found: " + gameId);
        }
        return game;
    }

    /**
     * Generates a unique game ID.
     */
    private String generateGameId() {
        return UUID.randomUUID().toString().substring(0, 8);
    }

    /**
     * Builds a GameResponse from a Game object.
     */
    private GameResponse buildGameResponse(Game game, String message) {
        GameResponse response = new GameResponse();
        response.setGameId(game.getGameId());
        response.setBoard(game.getBoard().getGridCopy());
        response.setCurrentPlayer(game.getCurrentPlayer());
        response.setStatus(game.getStatus());
        response.setMessage(message);
        response.setMoveHistory(game.getMoveHistory());
        response.setConfiguration(game.getConfiguration());
        response.setAITurn(game.isAITurn());
        response.setCurrentPlayerConfig(game.getCurrentPlayerConfig());
        return response;
    }

    /**
     * Gets appropriate status message for game.
     */
    private String getStatusMessage(Game game) {
        return switch (game.getStatus()) {
            case IN_PROGRESS -> "Game in progress";
            case RED_WINS -> "Red wins!";
            case YELLOW_WINS -> "Yellow wins!";
            case DRAW -> "Game ended in a draw!";
        };
    }

    /**
     * Validates game configuration.
     */
    private void validateConfiguration(GameConfigRequest config) {
        if (config == null) {
            throw new InvalidConfigurationException("Configuration cannot be null");
        }

        if (config.getGameMode() == null) {
            throw new InvalidConfigurationException("Game mode is required");
        }

        if (config.getPlayer1Config() == null || config.getPlayer2Config() == null) {
            throw new InvalidConfigurationException("Both player configurations are required");
        }

        // Validate AI configuration
        if (config.getGameMode() == GameMode.PLAYER_VS_AI) {
            boolean hasAI = config.getPlayer1Config().isAI() || config.getPlayer2Config().isAI();
            if (!hasAI) {
                throw new InvalidConfigurationException("PLAYER_VS_AI mode requires at least one AI player");
            }

            // Check that AI player has difficulty set
            if (config.getPlayer1Config().isAI() && config.getPlayer1Config().getAiDifficulty() == null) {
                throw new InvalidConfigurationException("AI player must have difficulty level set");
            }
            if (config.getPlayer2Config().isAI() && config.getPlayer2Config().getAiDifficulty() == null) {
                throw new InvalidConfigurationException("AI player must have difficulty level set");
            }
        }

        // Validate PvP mode doesn't have AI
        if (config.getGameMode() == GameMode.PLAYER_VS_PLAYER) {
            if (config.getPlayer1Config().isAI() || config.getPlayer2Config().isAI()) {
                throw new InvalidConfigurationException("PLAYER_VS_PLAYER mode cannot have AI players");
            }
        }
    }
}
