package com.connect4.dto;

import com.connect4.model.GameStatus;
import com.connect4.model.Move;
import com.connect4.model.Player;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response DTO for move operations.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MoveResponse {
    private boolean success;
    private String message;
    private Move move;
    private GameStatus gameStatus;
    private Player[][] board;
    private Player winner;
}
