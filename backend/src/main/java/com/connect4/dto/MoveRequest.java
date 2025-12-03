package com.connect4.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for making a move.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MoveRequest {
    @Min(value = 0, message = "Column must be between 0 and 6")
    @Max(value = 6, message = "Column must be between 0 and 6")
    private int column;
}
