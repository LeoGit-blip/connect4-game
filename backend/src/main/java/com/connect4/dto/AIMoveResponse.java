package com.connect4.dto;

import com.connect4.model.GameConfiguration;
import com.connect4.model.PlayerConfig;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response DTO for AI move calculations.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AIMoveResponse {
    private int column; // Chosen column
    private int evaluationScore; // Board evaluation score
    private int thinkingTimeMs; // Simulated thinking time
    private String reasoning; // Human-readable explanation (optional)
}
