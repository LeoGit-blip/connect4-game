package com.connect4.controller;

import com.connect4.dto.AIMoveResponse;
import com.connect4.dto.GameConfigRequest;
import com.connect4.dto.GameResponse;
import com.connect4.dto.MoveRequest;
import com.connect4.dto.MoveResponse;
import com.connect4.service.AIService;
import com.connect4.service.GameService;
import com.connect4.service.GameServiceImpl;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST Controller for Connect 4 game operations.
 */
@RestController
@RequestMapping("/api/games")
@CrossOrigin(origins = "*")
public class GameController {
    private final GameServiceImpl gameService;
    private final AIService aiService;

    public GameController(GameServiceImpl gameService, AIService aiService) {
        this.gameService = gameService;
        this.aiService = aiService;
    }

    /**
     * Creates a new game (default configuration).
     * POST /api/games
     */
    @PostMapping
    public ResponseEntity<GameResponse> createGame() {
        GameResponse response = gameService.createGame();
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Creates a new game with configuration.
     * POST /api/games/configured
     */
    @PostMapping("/configured")
    public ResponseEntity<GameResponse> createConfiguredGame(
            @Valid @RequestBody GameConfigRequest configRequest) {
        GameResponse response = gameService.createGameWithConfig(configRequest);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Gets game state by ID.
     * GET /api/games/{gameId}
     */
    @GetMapping("/{gameId}")
    public ResponseEntity<GameResponse> getGame(@PathVariable String gameId) {
        GameResponse response = gameService.getGame(gameId);
        return ResponseEntity.ok(response);
    }

    /**
     * Makes a move in the game.
     * POST /api/games/{gameId}/move
     */
    @PostMapping("/{gameId}/move")
    public ResponseEntity<MoveResponse> makeMove(
            @PathVariable String gameId,
            @Valid @RequestBody MoveRequest request) {
        MoveResponse response = gameService.makeMove(gameId, request);
        return ResponseEntity.ok(response);
    }

    /**
     * Requests AI to calculate best move (without executing it).
     * POST /api/games/{gameId}/ai-move
     */
    @PostMapping("/{gameId}/ai-move")
    public ResponseEntity<AIMoveResponse> requestAIMove(@PathVariable String gameId) {
        AIMoveResponse response = aiService.calculateBestMove(gameId);
        return ResponseEntity.ok(response);
    }

    /**
     * Requests AI to calculate and execute best move.
     * POST /api/games/{gameId}/ai-move/execute
     */
    @PostMapping("/{gameId}/ai-move/execute")
    public ResponseEntity<MoveResponse> executeAIMove(@PathVariable String gameId) {
        // Calculate AI move
        AIMoveResponse aiMove = aiService.calculateBestMove(gameId);

        // Execute the move
        MoveRequest moveRequest = new MoveRequest(aiMove.getColumn());
        MoveResponse response = gameService.makeMove(gameId, moveRequest);

        // Add AI reasoning to response message
        if (aiMove.getReasoning() != null && !aiMove.getReasoning().isEmpty()) {
            response.setMessage(response.getMessage() + " - " + aiMove.getReasoning());
        }

        return ResponseEntity.ok(response);
    }

    /**
     * Resets a game.
     * POST /api/games/{gameId}/reset
     */
    @PostMapping("/{gameId}/reset")
    public ResponseEntity<GameResponse> resetGame(@PathVariable String gameId) {
        GameResponse response = gameService.resetGame(gameId);
        return ResponseEntity.ok(response);
    }

    /**
     * Deletes a game.
     * DELETE /api/games/{gameId}
     */
    @DeleteMapping("/{gameId}")
    public ResponseEntity<Void> deleteGame(@PathVariable String gameId) {
        gameService.deleteGame(gameId);
        return ResponseEntity.noContent().build();
    }
}
