package com.connect4.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Configuration for a single player.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PlayerConfig {
    private String name;
    private String color; // Hex color code or preset name

    @JsonProperty("isAI")
    private boolean isAI;

    private AIDifficulty aiDifficulty; // Only used if isAI is true

    /**
     * Constructor for human player.
     */
    public PlayerConfig(String name, String color) {
        this.name = name;
        this.color = color;
        this.isAI = false;
        this.aiDifficulty = null;
    }

    /**
     * Constructor for AI player.
     */
    public PlayerConfig(String name, String color, AIDifficulty difficulty) {
        this.name = name;
        this.color = color;
        this.isAI = true;
        this.aiDifficulty = difficulty;
    }
}
