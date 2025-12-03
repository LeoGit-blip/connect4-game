package com.connect4.exception;

/**
 * Exception thrown when an invalid game configuration is provided.
 */
public class InvalidConfigurationException extends RuntimeException {
    public InvalidConfigurationException(String message) {
        super(message);
    }
}
