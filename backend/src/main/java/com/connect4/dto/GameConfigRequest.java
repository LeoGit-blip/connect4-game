package com.connect4.dto;

import com.connect4.model.GameMode;
import com.connect4.model.Player;
import com.connect4.model.PlayerConfig;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for creating a game with configuration.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class GameConfigRequest {
    @NotNull(message = "Game mode is required")
    private GameMode gameMode;

    @Valid
    @NotNull(message = "Player 1 configuration is required")
    private PlayerConfig player1Config;

    @Valid
    @NotNull(message = "Player 2 configuration is required")
    private PlayerConfig player2Config;

    private Player firstPlayer; // Optional, defaults to RED
    private String theme; // Optional, defaults to "classic"
}
