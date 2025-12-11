package com.connect4.exception;

/**
 * Exception thrown when a room is not found
 */
public class RoomNotFoundException extends RuntimeException {
    public RoomNotFoundException(String message) {
        super(message);
    }
}
