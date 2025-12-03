/**
 * Statistics Manager - Per-Player Tracking
 * Handles game statistics tracking and persistence for multiple players
 */

class StatsManager {
    constructor() {
        this.storageKey = 'connect4_stats_v2';
        this.stats = this.loadStats();
    }

    /**
     * Loads stats from localStorage
     * @returns {Object} Stats object
     */
    loadStats() {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error("Failed to parse stats", e);
            }
        }

        // Try to migrate from old v1 stats
        this.migrateFromV1();

        // Cleanup invalid stats (RED/YELLOW keys from bug)
        this.cleanupInvalidStats();

        return this.stats;
    }

    /**
     * Removes invalid player entries (RED/YELLOW) caused by a bug
     */
    cleanupInvalidStats() {
        if (!this.stats || !this.stats.players) return;

        const invalidKeys = ['RED', 'YELLOW'];
        let changed = false;

        invalidKeys.forEach(key => {
            if (this.stats.players[key]) {
                console.log(`Removing invalid player stat: ${key}`);
                delete this.stats.players[key];
                changed = true;
            }
        });

        if (changed) {
            this.saveStats();
        }
    }

    /**
     * Migrates old single-player stats to new multi-player format
     * @returns {Object} Migrated stats or default stats
     */
    migrateFromV1() {
        const oldKey = 'connect4_stats_v1';
        const oldStats = localStorage.getItem(oldKey);

        if (oldStats) {
            try {
                const parsed = JSON.parse(oldStats);
                console.log("Migrating stats from v1 to v2");

                // Create new structure with old stats under "Player 1"
                const newStats = {
                    players: {
                        "Player 1": parsed
                    },
                    lastUpdated: Date.now()
                };

                this.saveStats(newStats);
                return newStats;
            } catch (e) {
                console.error("Failed to migrate v1 stats", e);
            }
        }

        return this.getDefaultStats();
    }

    /**
     * Returns default stats structure
     * @returns {Object} Default stats
     */
    getDefaultStats() {
        return {
            players: {},
            lastUpdated: Date.now()
        };
    }

    /**
     * Returns default player stats
     * @returns {Object} Default player stats
     */
    getDefaultPlayerStats() {
        return {
            wins: 0,
            losses: 0,
            draws: 0,
            gamesPlayed: 0,
            currentStreak: 0,
            maxStreak: 0,
            history: []
        };
    }

    /**
     * Saves stats to localStorage
     * @param {Object} stats - Stats object to save (optional, uses this.stats if not provided)
     */
    saveStats(stats = null) {
        const toSave = stats || this.stats;
        toSave.lastUpdated = Date.now();
        localStorage.setItem(this.storageKey, JSON.stringify(toSave));
        if (stats) this.stats = stats;
    }

    /**
     * Gets or creates player stats
     * @param {string} playerName - Player name
     * @returns {Object} Player stats
     */
    getPlayerStats(playerName) {
        if (!this.stats.players[playerName]) {
            this.stats.players[playerName] = this.getDefaultPlayerStats();
        }
        return this.stats.players[playerName];
    }

    /**
     * Records a game result for a specific player
     * @param {string} playerName - Player name
     * @param {string} result - 'win', 'loss', or 'draw'
     */
    recordGameForPlayer(playerName, result) {
        // Validate player name
        if (!this.isValidPlayerName(playerName)) {
            console.warn('Attempted to record game for invalid player name:', playerName);
            return;
        }

        const playerStats = this.getPlayerStats(playerName);

        playerStats.gamesPlayed++;

        if (result === 'win') {
            playerStats.wins++;
            playerStats.currentStreak++;
            if (playerStats.currentStreak > playerStats.maxStreak) {
                playerStats.maxStreak = playerStats.currentStreak;
            }
        } else if (result === 'loss') {
            playerStats.losses++;
            playerStats.currentStreak = 0;
        } else if (result === 'draw') {
            playerStats.draws++;
            // Draws don't reset streak
        }

        // Add to history (keep last 10)
        playerStats.history.unshift(result);
        if (playerStats.history.length > 10) {
            playerStats.history.pop();
        }

        this.saveStats();
        console.log(`Game recorded for ${playerName}:`, result, playerStats);
    }

    /**
     * Gets all player names
     * @returns {Array<string>} Array of player names
     */
    getAllPlayers() {
        return Object.keys(this.stats.players)
            .filter(name => this.isValidPlayerName(name))
            .sort();
    }

    /**
     * Gets leaderboard sorted by wins
     * @returns {Array<Object>} Array of {name, stats} sorted by wins
     */
    getLeaderboard() {
        return Object.entries(this.stats.players)
            .filter(([name]) => this.isValidPlayerName(name))
            .map(([name, stats]) => ({
                name,
                stats,
                winRate: stats.gamesPlayed > 0
                    ? Math.round((stats.wins / stats.gamesPlayed) * 100)
                    : 0
            }))
            .sort((a, b) => {
                // Sort by wins first, then by win rate
                if (b.stats.wins !== a.stats.wins) {
                    return b.stats.wins - a.stats.wins;
                }
                return b.winRate - a.winRate;
            });
    }

    /**
     * Cleans all invalid player names from storage
     * @returns {boolean} True if any names were cleaned
     */
    cleanInvalidPlayers() {
        let cleaned = false;

        Object.keys(this.stats.players).forEach(playerName => {
            if (!this.isValidPlayerName(playerName)) {
                delete this.stats.players[playerName];
                cleaned = true;
                console.log('Removed invalid player:', playerName);
            }
        });

        if (cleaned) {
            this.saveStats();
            console.log('Cleaned invalid player names from statistics');
        }

        return cleaned;
    }

    /**
     * Resets all stats
     */
    resetStats() {
        this.stats = this.getDefaultStats();
        this.saveStats();
    }

    /**
     * Resets stats for a specific player
     * @param {string} playerName - Player name
     */
    resetPlayerStats(playerName) {
        if (this.stats.players[playerName]) {
            delete this.stats.players[playerName];
            this.saveStats();
        }
    }

    // Legacy method for backward compatibility
    recordGame(result) {
        console.warn("recordGame() is deprecated, use recordGameForPlayer() instead");
        this.recordGameForPlayer("Player 1", result);
    }

    // Legacy method for backward compatibility
    getStats() {
        console.warn("getStats() is deprecated, use getPlayerStats() instead");
        return this.getPlayerStats("Player 1");
    }

    /**
     * List of invalid player names to filter
     */
    static INVALID_NAMES = ['RED', 'YELLOW', 'NONE', 'red', 'yellow', 'none'];

    /**
     * Checks if a player name is valid
     * @param {string} playerName - Player name to validate
     * @returns {boolean} True if valid
     */
    isValidPlayerName(playerName) {
        if (!playerName || typeof playerName !== 'string') return false;
        const normalized = playerName.trim().toUpperCase();
        return !StatsManager.INVALID_NAMES.includes(normalized);
    }

}

// Create global instance
const statsManager = new StatsManager();
window.statsManager = statsManager;
