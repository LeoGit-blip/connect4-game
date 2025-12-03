package com.connect4.exception;

/**
 * Exception thrown when an invalid move is attempted.
 */
public class InvalidMoveException extends RuntimeException {
    public InvalidMoveException(String message) {
        super(message);
    }
}
