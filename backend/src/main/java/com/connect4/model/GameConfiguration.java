package com.connect4.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Complete game configuration including mode, players, and settings.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class GameConfiguration {
    private GameMode gameMode;
    private PlayerConfig player1Config; // RED player
    private PlayerConfig player2Config; // YELLOW player
    private Player firstPlayer; // Who starts (RED or YELLOW)
    private String theme; // Visual theme name

    /**
     * Checks if any player is AI.
     */
    public boolean hasAIPlayer() {
        return (player1Config != null && player1Config.isAI()) ||
                (player2Config != null && player2Config.isAI());
    }

    /**
     * Gets the AI player configuration.
     * 
     * @return PlayerConfig of AI player, or null if no AI
     */
    public PlayerConfig getAIPlayerConfig() {
        if (player1Config != null && player1Config.isAI()) {
            return player1Config;
        }
        if (player2Config != null && player2Config.isAI()) {
            return player2Config;
        }
        return null;
    }

    /**
     * Gets the player that is AI.
     * 
     * @return Player.RED or Player.YELLOW if AI exists, null otherwise
     */
    public Player getAIPlayer() {
        if (player1Config != null && player1Config.isAI()) {
            return Player.RED;
        }
        if (player2Config != null && player2Config.isAI()) {
            return Player.YELLOW;
        }
        return null;
    }

    /**
     * Gets configuration for a specific player.
     */
    public PlayerConfig getConfigForPlayer(Player player) {
        if (player == Player.RED) {
            return player1Config;
        } else if (player == Player.YELLOW) {
            return player2Config;
        }
        return null;
    }
}
