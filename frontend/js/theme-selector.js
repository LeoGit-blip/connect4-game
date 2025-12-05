// Global Theme Selector
class ThemeSelector {
    constructor() {
        this.toggleBtn = document.getElementById('themeToggleBtn');
        this.dropdown = document.getElementById('themeDropdown');
        this.themeOptions = document.querySelectorAll('.theme-option');
        this.currentTheme = this.loadTheme();

        this.init();
    }

    init() {
        // Apply saved theme on load
        this.applyTheme(this.currentTheme);

        // Toggle dropdown
        this.toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.dropdown.classList.toggle('active');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.theme-selector-global')) {
                this.dropdown.classList.remove('active');
            }
        });

        // Theme option clicks
        this.themeOptions.forEach(option => {
            option.addEventListener('click', () => {
                const theme = option.dataset.theme;
                this.setTheme(theme);
                this.dropdown.classList.remove('active');
            });
        });
    }

    loadTheme() {
        return localStorage.getItem('connect4-theme') || 'classic';
    }

    saveTheme(theme) {
        localStorage.setItem('connect4-theme', theme);
    }

    applyTheme(theme) {
        // Set data-theme attribute on body
        document.body.setAttribute('data-theme', theme);

        // Update active state in dropdown
        this.themeOptions.forEach(option => {
            if (option.dataset.theme === theme) {
                option.classList.add('active');
            } else {
                option.classList.remove('active');
            }
        });

        this.currentTheme = theme;
    }

    setTheme(theme) {
        this.applyTheme(theme);
        this.saveTheme(theme);
    }
}

// Initialize theme selector when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ThemeSelector();
});
