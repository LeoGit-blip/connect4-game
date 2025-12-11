package com.connect4.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Configuration for a multiplayer room
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomConfig {
    private String theme;
    private String firstPlayer; // "HOST", "GUEST", "RANDOM"
    private String hostColor;
    private String guestColor;
}
