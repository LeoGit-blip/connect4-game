package com.connect4.model;

/**
 * Room status enum
 */
public enum RoomStatus {
    WAITING, // Waiting for guest to join
    READY, // Both players connected, ready to start
    IN_PROGRESS, // Game in progress
    FINISHED // Game completed
}
