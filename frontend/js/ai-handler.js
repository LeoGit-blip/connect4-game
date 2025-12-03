/**
 * AI Handler
 * Manages AI move requests and UI updates
 */

class AIHandler {
    constructor(apiClient, gameUI) {
        this.apiClient = apiClient;
        this.gameUI = gameUI;
        this.isThinking = false;
    }

    /**
     * Requests and executes AI move
     * @param {string} gameId - Game identifier
     * @returns {Promise<Object>} Move response
     */
    async executeAIMove(gameId) {
        if (this.isThinking) {
            console.log('AI is already thinking');
            return null;
        }

        try {
            this.showAIThinking();

            // Request AI move (this calculates the best move)
            const aiResponse = await this.apiClient.executeAIMove(gameId);

            // Wait for minimum thinking time for better UX
            await this.sleep(aiResponse.thinkingTimeMs || 500);

            this.hideAIThinking();

            return aiResponse;
        } catch (error) {
            this.hideAIThinking();
            console.error('AI move failed:', error);
            throw error;
        }
    }

    /**
     * Shows AI thinking indicator
     */
    showAIThinking() {
        this.isThinking = true;
        this.gameUI.showAIThinking();
    }

    /**
     * Hides AI thinking indicator
     */
    hideAIThinking() {
        this.isThinking = false;
        this.gameUI.hideAIThinking();
    }

    /**
     * Checks if AI is currently thinking
     */
    isAIThinking() {
        return this.isThinking;
    }

    /**
     * Utility sleep function
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export for use in app.js
const aiHandler = new AIHandler(apiClient, gameUI);
