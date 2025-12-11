package com.connect4.dto;

import com.connect4.model.RoomConfig;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request to create a new multiplayer room
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateRoomRequest {
    private String hostName;
    private RoomConfig config;
}
