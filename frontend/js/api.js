/**
 * API Client for Connect 4 Backend
 * Handles all HTTP requests to the Java backend
 */

const API_BASE_URL = 'http://localhost:8080/api/games';

class ApiClient {
    /**
     * Creates a new game
     * @returns {Promise<Object>} Game response
     */
    async createGame() {
        try {
            const response = await fetch(API_BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error creating game:', error);
            throw error;
        }
    }

    /**
     * Gets game state by ID
     * @param {string} gameId - Game identifier
     * @returns {Promise<Object>} Game response
     */
    async getGame(gameId) {
        try {
            const response = await fetch(`${API_BASE_URL}/${gameId}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error getting game:', error);
            throw error;
        }
    }

    /**
     * Makes a move in the game
     * @param {string} gameId - Game identifier
     * @param {number} column - Column to drop piece (0-6)
     * @returns {Promise<Object>} Move response
     */
    async makeMove(gameId, column) {
        try {
            const response = await fetch(`${API_BASE_URL}/${gameId}/move`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ column })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error making move:', error);
            throw error;
        }
    }

    /**
     * Resets the game
     * @param {string} gameId - Game identifier
     * @returns {Promise<Object>} Game response
     */
    async resetGame(gameId) {
        try {
            const response = await fetch(`${API_BASE_URL}/${gameId}/reset`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error resetting game:', error);
            throw error;
        }
    }

    /**
     * Deletes a game
     * @param {string} gameId - Game identifier
     * @returns {Promise<void>}
     */
    async deleteGame(gameId) {
        try {
            const response = await fetch(`${API_BASE_URL}/${gameId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error('Error deleting game:', error);
            throw error;
        }
    }

    /**
     * Creates a game with configuration
     * @param {Object} config - Game configuration
     * @returns {Promise<Object>} Game response
     */
    async createGameWithConfig(config) {
        try {
            const response = await fetch(`${API_BASE_URL}/configured`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(config)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error creating configured game:', error);
            throw error;
        }
    }

    /**
     * Requests AI to calculate best move
     * @param {string} gameId - Game identifier
     * @returns {Promise<Object>} AI move response
     */
    async requestAIMove(gameId) {
        try {
            const response = await fetch(`${API_BASE_URL}/${gameId}/ai-move`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error requesting AI move:', error);
            throw error;
        }
    }

    /**
     * Executes AI move
     * @param {string} gameId - Game identifier
     * @returns {Promise<Object>} Move response
     */
    async executeAIMove(gameId) {
        try {
            const response = await fetch(`${API_BASE_URL}/${gameId}/ai-move/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error executing AI move:', error);
            throw error;
        }
    }
}

// Export singleton instance
const apiClient = new ApiClient();
