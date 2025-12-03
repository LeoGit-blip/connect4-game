/**
 * Configuration management utilities
 */

const CONFIG_KEY = 'connect4_config';

/**
 * Default configuration
 */
function getDefaultConfig() {
    return {
        gameMode: 'PLAYER_VS_PLAYER',
        player1: {
            name: 'Player 1',
            color: '#ff0040',
            isAI: false
        },
        player2: {
            name: 'Player 2',
            color: '#ffd700',
            isAI: false
        },
        aiDifficulty: 'MEDIUM',
        firstPlayer: 'RED',
        theme: 'classic'
    };
}

/**
 * Saves game configuration to localStorage
 * @param {Object} config - Configuration object
 */
function saveGameConfig(config) {
    try {
        localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    } catch (error) {
        console.error('Failed to save configuration:', error);
    }
}

/**
 * Loads game configuration from localStorage
 * @returns {Object} Configuration object
 */
function loadGameConfig() {
    try {
        const saved = localStorage.getItem(CONFIG_KEY);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (error) {
        console.error('Failed to load configuration:', error);
    }
    return getDefaultConfig();
}

/**
 * Validates configuration object
 * @param {Object} config - Configuration to validate
 * @returns {boolean} True if valid
 */
function validateConfig(config) {
    if (!config) return false;

    // Check required fields
    if (!config.gameMode || !config.player1 || !config.player2) {
        return false;
    }

    // Validate player configs
    if (!config.player1.name || !config.player1.color) {
        return false;
    }

    if (!config.player2.name || !config.player2.color) {
        return false;
    }

    // Validate AI mode
    if (config.gameMode === 'PLAYER_VS_AI') {
        if (!config.player2.isAI || !config.aiDifficulty) {
            return false;
        }
    }

    return true;
}

/**
 * Builds GameConfigRequest for API
 * @param {Object} config - Menu configuration
 * @returns {Object} API request object
 */
function buildConfigRequest(config) {
    return {
        gameMode: config.gameMode,
        player1Config: {
            name: config.player1.name,
            color: config.player1.color,
            isAI: config.player1.isAI,
            aiDifficulty: config.player1.isAI ? config.aiDifficulty : null
        },
        player2Config: {
            name: config.player2.name,
            color: config.player2.color,
            isAI: config.player2.isAI,
            aiDifficulty: config.player2.isAI ? config.aiDifficulty : null
        },
        firstPlayer: config.firstPlayer,
        theme: config.theme
    };
}
