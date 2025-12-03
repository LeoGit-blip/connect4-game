package com.connect4.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.connect4.model.GameConfiguration;
import com.connect4.model.GameStatus;
import com.connect4.model.Move;
import com.connect4.model.Player;
import com.connect4.model.PlayerConfig;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response DTO for game state.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class GameResponse {
    private String gameId;
    private Player[][] board;
    private Player currentPlayer;
    private GameStatus status;
    private String message;
    private List<Move> moveHistory;
    private GameConfiguration configuration; // NEW: Game configuration

    @JsonProperty("isAITurn")
    private boolean isAITurn; // NEW: Whether AI should move next

    private PlayerConfig currentPlayerConfig; // NEW: Current player's configuration
}
