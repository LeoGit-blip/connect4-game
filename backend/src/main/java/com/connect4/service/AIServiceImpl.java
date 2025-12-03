package com.connect4.service;

import com.connect4.dto.AIMoveResponse;
import com.connect4.engine.MinimaxEngine;
import com.connect4.engine.MoveEvaluator;
import com.connect4.exception.GameNotFoundException;
import com.connect4.exception.InvalidMoveException;
import com.connect4.model.*;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * Implementation of AIService.
 * Handles AI move calculations with different difficulty levels.
 */
@Service
public class AIServiceImpl implements AIService {

    private final MinimaxEngine minimaxEngine;
    private final MoveEvaluator moveEvaluator;
    private final GameServiceImpl gameService;
    private final Random random;

    public AIServiceImpl(MinimaxEngine minimaxEngine,
            MoveEvaluator moveEvaluator,
            GameServiceImpl gameService) {
        this.minimaxEngine = minimaxEngine;
        this.moveEvaluator = moveEvaluator;
        this.gameService = gameService;
        this.random = new Random();
    }

    @Override
    public AIMoveResponse calculateBestMove(String gameId) {
        // Get the game
        Game game = gameService.getGameOrThrow(gameId);

        if (!game.isAITurn()) {
            throw new InvalidMoveException("It is not AI's turn");
        }

        if (game.getStatus() != GameStatus.IN_PROGRESS) {
            throw new InvalidMoveException("Game is not in progress");
        }

        Player aiPlayer = game.getCurrentPlayer();
        PlayerConfig aiConfig = game.getCurrentPlayerConfig();

        if (aiConfig == null || !aiConfig.isAI()) {
            throw new InvalidMoveException("Current player is not AI");
        }

        AIDifficulty difficulty = aiConfig.getAiDifficulty();
        if (difficulty == null) {
            difficulty = AIDifficulty.MEDIUM; // Default
        }

        long startTime = System.currentTimeMillis();
        int bestColumn;
        int evaluationScore;
        String reasoning;

        // Calculate move based on difficulty
        switch (difficulty) {
            case EASY:
                // 50% random, 50% smart move with low depth
                if (random.nextBoolean()) {
                    bestColumn = getRandomMove(game.getBoard());
                    evaluationScore = 0;
                    reasoning = "Random move (Easy mode)";
                } else {
                    bestColumn = minimaxEngine.findBestMove(game.getBoard(), aiPlayer, 2);
                    evaluationScore = minimaxEngine.evaluatePosition(game.getBoard(), aiPlayer);
                    reasoning = "Simple analysis (Easy mode)";
                }
                break;

            case HARD:
                // Full minimax with depth 6
                bestColumn = minimaxEngine.findBestMove(game.getBoard(), aiPlayer, 6);
                evaluationScore = minimaxEngine.evaluatePosition(game.getBoard(), aiPlayer);
                reasoning = getReasoning(game.getBoard(), bestColumn, aiPlayer, "Strategic position (Hard mode)");
                break;

            case EXPERT:
                // Depth 8 - significantly stronger
                bestColumn = minimaxEngine.findBestMove(game.getBoard(), aiPlayer, 8);
                evaluationScore = minimaxEngine.evaluatePosition(game.getBoard(), aiPlayer);
                reasoning = getReasoning(game.getBoard(), bestColumn, aiPlayer, "Calculated move (Expert mode)");
                break;

            case GRANDMASTER:
                // Depth 10 - very strong, might be slow
                bestColumn = minimaxEngine.findBestMove(game.getBoard(), aiPlayer, 10);
                evaluationScore = minimaxEngine.evaluatePosition(game.getBoard(), aiPlayer);
                reasoning = getReasoning(game.getBoard(), bestColumn, aiPlayer, "Deep analysis (Grandmaster)");
                break;

            case MEDIUM:
            default:
                // Minimax with depth 4
                bestColumn = minimaxEngine.findBestMove(game.getBoard(), aiPlayer, 4);
                evaluationScore = minimaxEngine.evaluatePosition(game.getBoard(), aiPlayer);

                reasoning = getReasoning(game.getBoard(), bestColumn, aiPlayer, "Good position (Medium mode)");
                break;
        }

        long endTime = System.currentTimeMillis();
        int thinkingTime = (int) (endTime - startTime);

        // Simulate minimum thinking time for better UX
        int minThinkingTime = switch (difficulty) {
            case EASY -> 100;
            case MEDIUM -> 300;
            case HARD -> 500;
            case EXPERT -> 800;
            case GRANDMASTER -> 1000;
        };

        thinkingTime = Math.max(thinkingTime, minThinkingTime);

        return new AIMoveResponse(bestColumn, evaluationScore, thinkingTime, reasoning);
    }

    @Override
    public int evaluateBoard(Board board, Player player) {
        return minimaxEngine.evaluatePosition(board, player);
    }

    @Override
    public List<Integer> getValidMoves(Board board) {
        List<Integer> validMoves = new ArrayList<>();
        for (int col = 0; col < Board.COLS; col++) {
            if (!board.isColumnFull(col)) {
                validMoves.add(col);
            }
        }
        return validMoves;
    }

    /**
     * Gets a random valid move.
     */
    private int getRandomMove(Board board) {
        List<Integer> validMoves = getValidMoves(board);
        if (validMoves.isEmpty()) {
            return 3; // Default to center if somehow no moves
        }
        return validMoves.get(random.nextInt(validMoves.size()));
    }

    /**
     * Helper to generate reasoning text.
     */
    private String getReasoning(Board board, int column, Player player, String defaultReason) {
        if (moveEvaluator.isWinningMove(board, column, player)) {
            return "Winning move!";
        } else if (moveEvaluator.isBlockingMove(board, column, player)) {
            return "Blocking opponent";
        }
        return defaultReason;
    }
}
