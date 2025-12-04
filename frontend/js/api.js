/**
 * API Client for Connect 4 (Local Version)
 * Adapts the frontend to use local game logic instead of a backend
 */

class ApiClient {
    /**
     * Creates a new game
     * @returns {Promise<Object>} Game response
     */
    async createGame() {
        return localGameLogic.createGame({
            gameMode: 'PLAYER_VS_PLAYER',
            player1: { name: 'Player 1', color: '#ff0040', isAI: false },
            player2: { name: 'Player 2', color: '#ffd700', isAI: false },
            firstPlayer: 'RED'
        });
    }

    /**
     * Gets game state by ID
     * @param {string} gameId - Game identifier
     * @returns {Promise<Object>} Game response
     */
    async getGame(gameId) {
        return localGameLogic.getGame(gameId);
    }

    /**
     * Makes a move in the game
     * @param {string} gameId - Game identifier
     * @param {number} column - Column to drop piece (0-6)
     * @returns {Promise<Object>} Move response
     */
    async makeMove(gameId, column) {
        return localGameLogic.makeMove(gameId, column);
    }

    /**
     * Resets the game
     * @param {string} gameId - Game identifier
     * @returns {Promise<Object>} Game response
     */
    async resetGame(gameId) {
        // For local, just create a new game with same config
        const oldGame = localGameLogic.getGame(gameId);
        return localGameLogic.createGame(oldGame.config);
    }

    /**
     * Deletes a game
     * @param {string} gameId - Game identifier
     * @returns {Promise<void>}
     */
    async deleteGame(gameId) {
        // No-op for local
    }

    /**
     * Creates a game with configuration
     * @param {Object} config - Game configuration
     * @returns {Promise<Object>} Game response
     */
    async createGameWithConfig(config) {
        return localGameLogic.createGame(config);
    }

    /**
     * Requests AI to calculate best move
     * @param {string} gameId - Game identifier
     * @returns {Promise<Object>} AI move response
     */
    async requestAIMove(gameId) {
        const column = localGameLogic.getAIMove(gameId);
        return { column };
    }

    /**
     * Executes AI move
     * @param {string} gameId - Game identifier
     * @returns {Promise<Object>} Move response
     */
    async executeAIMove(gameId) {
        const column = localGameLogic.getAIMove(gameId);
        return localGameLogic.makeMove(gameId, column);
    }
}

// Export singleton instance
const apiClient = new ApiClient();
