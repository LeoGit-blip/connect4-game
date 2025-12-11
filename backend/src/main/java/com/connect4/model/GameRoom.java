package com.connect4.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * Represents a multiplayer game room
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GameRoom {
    private String roomCode;
    private String hostId;
    private String hostName;
    private String guestId;
    private String guestName;
    private RoomStatus status;
    private RoomConfig config;
    private Game game;
    private Instant createdAt;
    private Instant expiresAt;
    private Instant lastActivityAt;

    // Statistics for rematch tracking
    @Builder.Default
    private int gamesPlayed = 0;

    @Builder.Default
    private Map<String, Integer> playerWins = new HashMap<>();

    @Builder.Default
    private Map<String, Boolean> rematchRequests = new HashMap<>();

    /**
     * Increment the number of games played in this room
     */
    public void incrementGameCount() {
        this.gamesPlayed++;
    }

    /**
     * Record a win for a player
     */
    public void recordWin(String playerName) {
        playerWins.merge(playerName, 1, Integer::sum);
    }

    /**
     * Check if both players want a rematch
     */
    public boolean bothPlayersWantRematch() {
        return rematchRequests.values().stream()
                .filter(Boolean::booleanValue)
                .count() == 2;
    }

    /**
     * Reset rematch requests
     */
    public void resetRematchRequests() {
        rematchRequests.clear();
    }

    /**
     * Get the opponent's name for a given player
     */
    public String getOpponent(String playerName) {
        if (playerName.equals(hostName)) {
            return guestName;
        } else if (playerName.equals(guestName)) {
            return hostName;
        }
        return null;
    }

    /**
     * Update last activity timestamp
     */
    public void updateActivity() {
        this.lastActivityAt = Instant.now();
    }
}
