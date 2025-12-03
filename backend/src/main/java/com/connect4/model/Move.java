package com.connect4.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Represents a single move in the game.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Move {
    private int column;
    private int row;
    private Player player;
    private LocalDateTime timestamp;

    public Move(int column, int row, Player player) {
        this.column = column;
        this.row = row;
        this.player = player;
        this.timestamp = LocalDateTime.now();
    }
}
