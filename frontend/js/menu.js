/**
 * Menu Controller
 * Handles main menu interactions and game configuration
 */

class MenuController {
  constructor() {
    this.selectedMode = null;
    this.selectedDifficulty = "MEDIUM";
    this.player1Color = "RED";
    this.player2Color = "YELLOW";
    this.availableColors = [
      "RED",
      "YELLOW",
      "BLUE",
      "GREEN",
      "BLACK",
      "PURPLE",
      "ORANGE",
      "PINK",
    ];

    // DOM elements
    this.modeSelection = document.getElementById("modeSelection");
    this.playerConfig = document.getElementById("playerConfig");
    this.player2Setup = document.getElementById("player2Setup");
    this.aiSetup = document.getElementById("aiSetup");

    // Input elements
    this.player1Name = document.getElementById("player1Name");
    this.player2Name = document.getElementById("player2Name");
    this.firstPlayer = document.getElementById("firstPlayer");
    this.firstPlayerContainer = document.getElementById("firstPlayerContainer");
    this.theme = document.getElementById("theme");
  }

  /**
   * Initializes the menu
   */
  init() {
    this.setupEventListeners();
    this.loadSavedSettings();
    this.resetDifficultyButtons();
  }

  /**
   * Sets up all event listeners
   */
  setupEventListeners() {
    // Mode card selection
    const modeCards = document.querySelectorAll(".mode-card");
    modeCards.forEach((card) => {
      card.addEventListener("click", () => {
        const mode = card.dataset.mode;
        this.handleGameModeSelection(mode);
      });
    });

    // Back button
    document.getElementById("backBtn").addEventListener("click", () => {
      this.showModeSelection();
    });

    // Color choice buttons
    const colorBtns = document.querySelectorAll(".color-btn");
    colorBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const player = btn.dataset.player;
        const color = btn.dataset.color;
        this.handleColorChoice(player, color);
      });
    });

    // Difficulty buttons
    const difficultyBtns = document.querySelectorAll(".difficulty-btn");
    difficultyBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const difficulty = btn.dataset.difficulty;
        this.handleDifficultySelection(difficulty);
      });
    });

    // Stats card
    const statsCard = document.getElementById("statsCard");
    if (statsCard) {
      statsCard.addEventListener("click", () => {
        this.showStats();
      });
    }

    // Stats back button
    const statsBackBtn = document.getElementById("statsBackBtn");
    if (statsBackBtn) {
      statsBackBtn.addEventListener("click", () => {
        this.showModeSelection();
      });
    }

    // Start game button
    document.getElementById("startGameBtn").addEventListener("click", () => {
      this.startGame();
    });

    // Clear stats button
    const clearStatsBtn = document.getElementById('clearStatsBtn');
    if (clearStatsBtn) {
      clearStatsBtn.addEventListener('click', () => {
        this.handleClearStats();
      });
    }
  }

  /**
   * Shows statistics dashboard
   */
  showStats() {
    this.modeSelection.classList.add("hidden");
    this.playerConfig.classList.add("hidden");

    const statsDashboard = document.getElementById("statsDashboard");
    if (statsDashboard) {
      statsDashboard.classList.remove("hidden");
      this.populatePlayerSelector();
      this.updateStatsUI();
    }
  }

  /**
   * Populates the player selector dropdown
   */
  populatePlayerSelector() {
    if (!window.statsManager) return;

    const selector = document.getElementById("playerSelector");
    if (!selector) return;

    const players = window.statsManager.getAllPlayers();

    // Clear existing options except "All Players"
    selector.innerHTML = '<option value="__all__">🏆 All Players (Leaderboard)</option>';

    // Add each player
    players.forEach(playerName => {
      const option = document.createElement("option");
      option.value = playerName;
      option.textContent = playerName;
      selector.appendChild(option);
    });

    // Add event listener for selection change
    selector.addEventListener("change", () => {
      this.updateStatsUI();
    });
  }

  /**
   * Updates the statistics UI based on selected player
   */
  updateStatsUI() {
    if (!window.statsManager) return;

    const selector = document.getElementById("playerSelector");
    const selectedPlayer = selector ? selector.value : "__all__";

    const leaderboardView = document.getElementById("leaderboardView");
    const playerStatsView = document.getElementById("playerStatsView");

    if (selectedPlayer === "__all__") {
      // Show leaderboard
      leaderboardView.classList.remove("hidden");
      playerStatsView.classList.add("hidden");
      this.renderLeaderboard();
    } else {
      // Show individual player stats
      leaderboardView.classList.add("hidden");
      playerStatsView.classList.remove("hidden");
      this.renderPlayerStats(selectedPlayer);
    }
  }

  /**
   * Renders the leaderboard table
   */
  renderLeaderboard() {
    if (!window.statsManager) return;

    const leaderboard = window.statsManager.getLeaderboard();
    const tbody = document.getElementById("leaderboardBody");

    if (!tbody) return;

    tbody.innerHTML = '';

    if (leaderboard.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-leaderboard">No games played yet</td></tr>';
      return;
    }

    leaderboard.forEach((entry, index) => {
      const row = document.createElement("tr");
      const rank = index + 1;

      // Add rank badge for top 3
      let rankBadge = rank;
      if (rank === 1) rankBadge = '🥇';
      else if (rank === 2) rankBadge = '🥈';
      else if (rank === 3) rankBadge = '🥉';

      const wld = `${entry.stats.wins}-${entry.stats.losses}-${entry.stats.draws}`;

      row.innerHTML = `
        <td class="rank-cell">${rankBadge}</td>
        <td class="player-name-cell">${entry.name}</td>
        <td>${wld}</td>
        <td>${entry.winRate}%</td>
        <td>${entry.stats.maxStreak}</td>
      `;

      tbody.appendChild(row);
    });
  }

  /**
   * Renders individual player statistics
   * @param {string} playerName - Player name
   */
  renderPlayerStats(playerName) {
    if (!window.statsManager) return;

    const stats = window.statsManager.getPlayerStats(playerName);

    // Update stat cards
    document.getElementById("statWins").textContent = stats.wins;
    document.getElementById("statLosses").textContent = stats.losses;
    document.getElementById("statDraws").textContent = stats.draws;
    document.getElementById("statCurrentStreak").textContent = stats.currentStreak;
    document.getElementById("statMaxStreak").textContent = stats.maxStreak;

    // Calculate win rate
    const totalGames = stats.wins + stats.losses + stats.draws;
    const winRate = totalGames > 0 ? Math.round((stats.wins / totalGames) * 100) : 0;
    document.getElementById("statWinRate").textContent = `${winRate}%`;

    // Update history list
    const historyList = document.getElementById("historyList");
    historyList.innerHTML = '';

    if (stats.history && stats.history.length > 0) {
      stats.history.forEach((result, index) => {
        const item = document.createElement("div");
        item.className = `history-item ${result}`;

        let resultText = "Win";
        if (result === 'loss') resultText = "Loss";
        if (result === 'draw') resultText = "Draw";

        item.innerHTML = `
          <span class="history-result">${resultText}</span>
          <span class="history-time">Game ${stats.gamesPlayed - index}</span>
        `;
        historyList.appendChild(item);
      });
    } else {
      historyList.innerHTML = '<p class="empty-history">No games played yet</p>';
    }
  }

  /**
 * Resets difficulty buttons to only show medium as active
 */
  resetDifficultyButtons() {
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    // Set medium as default
    const mediumBtn = document.querySelector('[data-difficulty="MEDIUM"]');
    if (mediumBtn) {
      mediumBtn.classList.add('active');
    }
  }

  /**
   * Handles game mode selection
   */
  handleGameModeSelection(mode) {
    this.selectedMode = mode;

    // Update UI
    document.querySelectorAll(".mode-card").forEach((card) => {
      card.classList.remove("selected");
    });
    document.querySelector(`[data-mode="${mode}"]`).classList.add("selected");

    // Show configuration after short delay
    setTimeout(() => {
      this.showPlayerConfig(mode);
    }, 300);
  }

  /**
   * Shows player configuration screen
   */
  showPlayerConfig(mode) {
    this.modeSelection.classList.add("hidden");
    this.playerConfig.classList.remove("hidden");

    if (mode === "pvp") {
      this.player2Setup.classList.remove("hidden");
      this.aiSetup.classList.add("hidden");
      this.firstPlayerContainer.classList.remove("hidden");
      // Update first player dropdown for PvP mode
      this.updateFirstPlayerOptions(mode);
    } else {
      this.player2Setup.classList.add("hidden");
      this.aiSetup.classList.remove("hidden");
      this.firstPlayerContainer.classList.remove("hidden");
      // Update first player dropdown for PvAI mode
      this.updateFirstPlayerOptions(mode);
    }
  }

  /**
   * Updates first player dropdown options based on game mode
   */
  updateFirstPlayerOptions(mode) {
    const firstPlayerSelect = document.getElementById('firstPlayer');

    if (mode === 'pvai') {
      // Player vs AI: Only show Random
      firstPlayerSelect.innerHTML = `
        <option value="RANDOM">Random</option>
      `;
    } else {
      // Player vs Player: Show all options
      firstPlayerSelect.innerHTML = `
        <option value="RED">Player 1</option>
        <option value="YELLOW">Player 2</option>
        <option value="RANDOM">Random</option>
      `;
    }
  }

  /**
   * Shows mode selection screen
   */
  showModeSelection() {
    this.playerConfig.classList.add("hidden");
    const statsDashboard = document.getElementById("statsDashboard");
    if (statsDashboard) statsDashboard.classList.add("hidden");

    this.modeSelection.classList.remove("hidden");
  }

  /**
   * Handles color choice
   */
  handleColorChoice(player, color) {
    if (player === "1") {
      this.player1Color = color;
      // Update other player if same color
      if (this.player2Color === color) {
        // Find a different color for player 2
        const otherColors = this.availableColors.filter((c) => c !== color);
        this.player2Color = otherColors[0];
        this.updateColorButtons();
      }
    } else {
      this.player2Color = color;
      // Update other player if same color
      if (this.player1Color === color) {
        // Find a different color for player 1
        const otherColors = this.availableColors.filter((c) => c !== color);
        this.player1Color = otherColors[0];
        this.updateColorButtons();
      }
    }

    this.updateColorButtons();
  }

  /**
   * Updates color button states
   */
  updateColorButtons() {
    // Player 1 buttons
    document.querySelectorAll('[data-player="1"]').forEach((btn) => {
      if (btn.dataset.color === this.player1Color) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // Player 2 buttons
    document.querySelectorAll('[data-player="2"]').forEach((btn) => {
      if (btn.dataset.color === this.player2Color) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  }

  /**
   * Handles difficulty selection
   */
  handleDifficultySelection(difficulty) {
    this.selectedDifficulty = difficulty;

    // Update UI
    document.querySelectorAll(".difficulty-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
    document
      .querySelector(`[data-difficulty="${difficulty}"]`)
      .classList.add("active");
  }

  /**
   * Validates configuration
   */
  validateConfiguration() {
    const player1Name = this.player1Name.value.trim();
    if (!player1Name) {
      alert("Please enter a name for Player 1");
      return false;
    }

    if (this.selectedMode === "pvp") {
      const player2Name = this.player2Name.value.trim();
      if (!player2Name) {
        alert("Please enter a name for Player 2");
        return false;
      }
    }

    return true;
  }

  /**
   * Gets a random AI color different from player's color
   */
  getRandomAIColor() {
    const availableColors = this.availableColors.filter(
      (c) => c !== this.player1Color
    );
    const randomIndex = Math.floor(Math.random() * availableColors.length);
    return availableColors[randomIndex];
  }

  /**
   * Builds configuration object
   */
  buildConfiguration() {
    const gameMode =
      this.selectedMode === "pvp" ? "PLAYER_VS_PLAYER" : "PLAYER_VS_AI";

    // Map colors to hex values
    const colorMap = {
      RED: "#ff0040",
      YELLOW: "#ffd700",
      BLUE: "#00d4ff",
      GREEN: "#10b981",
      BLACK: "#1f2937",
      PURPLE: "#a855f7",
      ORANGE: "#f97316",
      PINK: "#ec4899",
    };

    // For AI mode, randomly select AI color
    let aiColor = this.player2Color;
    if (this.selectedMode === "pvai") {
      aiColor = this.getRandomAIColor();
    }

    // Handle random first player selection
    let firstPlayer = this.firstPlayer.value;

    // In AI mode, always random start
    if (this.selectedMode === "pvai") {
      firstPlayer = Math.random() < 0.5 ? "RED" : "YELLOW";
      console.log("AI Mode: Random first player selected:", firstPlayer);
    }
    // In PvP mode, handle specific random selection
    else if (firstPlayer === "RANDOM") {
      firstPlayer = Math.random() < 0.5 ? "RED" : "YELLOW";
      console.log("Random first player selected:", firstPlayer);
    }

    const config = {
      gameMode: gameMode,
      player1: {
        name: this.player1Name.value.trim(),
        color: colorMap[this.player1Color],
        isAI: false,
      },
      player2: {
        name:
          this.selectedMode === "pvp"
            ? this.player2Name.value.trim()
            : "Computer",
        color: colorMap[aiColor],
        isAI: this.selectedMode === "pvai",
      },
      aiDifficulty: this.selectedDifficulty,
      firstPlayer: firstPlayer,
      theme: this.theme.value,
    };

    return config;
  }

  /**
   * Starts the game
   */
  async startGame() {
    if (!this.validateConfiguration()) {
      return;
    }

    const config = this.buildConfiguration();

    // Save configuration
    saveGameConfig(config);

    // Navigate to game with configuration
    const configParam = encodeURIComponent(JSON.stringify(config));
    window.location.href = `game.html?config=${configParam}`;
  }

  /**
   * Loads saved settings from config
   */
  loadSavedSettings() {
    const config = loadGameConfig();

    // Safety check - ensure config has the expected structure
    if (!config || !config.player1 || !config.player2) {
      console.warn("Invalid config structure, using defaults");
      return;
    }

    // Load player 1
    if (config.player1.name) {
      this.player1Name.value = config.player1.name;
    }

    // Load player 2
    if (config.gameMode === "PLAYER_VS_PLAYER" && config.player2.name) {
      this.player2Name.value = config.player2.name;
    }

    // Load difficulty
    if (config.aiDifficulty) {
      this.selectedDifficulty = config.aiDifficulty;
      document.querySelectorAll(".difficulty-btn").forEach((btn) => {
        if (btn.dataset.difficulty === config.aiDifficulty) {
          btn.classList.add("active");
        }
      });
    }

    // Load other settings
    if (config.firstPlayer) {
      this.firstPlayer.value = config.firstPlayer;
    }
    if (config.theme) {
      this.theme.value = config.theme;
    }
  }

  /** 
   * Handles clearing all statistics
   */
  handleClearStats() {
    // Show confirmation dialog
    const confirmation = confirm(
      '⚠️ Are you sure you want to clear all statistics?\n\n' +
      'This will permanently delete:\n' +
      '• All player records\n' +
      '• Win/loss/draw statistics\n' +
      '• Game history\n\n' +
      'This action cannot be undone!'
    );

    if (confirmation) {
      try {
        // Clear the statistics
        if (window.statsManager) {
          window.statsManager.resetStats();
          console.log('Statistics cleared successfully');
        }

        // Show success message
        alert('✅ All statistics have been cleared successfully!');

        // Refresh the statistics display
        this.populatePlayerSelector();
        this.updateStatsUI();

      } catch (error) {
        console.error('Error clearing statistics:', error);
        alert('❌ Error clearing statistics. Please try again.');
      }
    }
  }
}
// Initialize menu when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  const menu = new MenuController();
  menu.init();
});


