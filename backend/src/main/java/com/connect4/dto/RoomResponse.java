package com.connect4.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response for room operations
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomResponse {
    private String roomCode;
    private String status;
    private String message;
    private String hostName;
    private String guestName;
    private Integer gamesPlayed;
}
