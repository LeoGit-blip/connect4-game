package com.connect4.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request to make a move in multiplayer game
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MultiplayerMoveRequest {
    private String roomCode;
    private int column;
    private String playerName;
}
