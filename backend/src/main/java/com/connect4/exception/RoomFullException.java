package com.connect4.exception;

/**
 * Exception thrown when trying to join a full room
 */
public class RoomFullException extends RuntimeException {
    public RoomFullException(String message) {
        super(message);
    }
}
