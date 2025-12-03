package com.connect4.model;

import lombok.Getter;

/**
 * Represents AI difficulty levels with corresponding search depths.
 */
@Getter
public enum AIDifficulty {
    EASY(2), // Depth 2, with random moves mixed in
    MEDIUM(4), // Depth 4
    HARD(6), // Depth 6
    EXPERT(8), // Depth 8
    GRANDMASTER(10); // Depth 10

    private final int searchDepth;

    AIDifficulty(int searchDepth) {
        this.searchDepth = searchDepth;
    }
}
