class ConfettiManager {
    constructor() {
        this.colors = ['#ff0000', '#ffff00', '#0000ff', '#00ff00', '#ff00ff', '#00ffff'];
        this.container = null;
    }

    init() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'confetti-container';
            document.body.appendChild(this.container);
        }
    }

    burst() {
        this.init();
        const particleCount = 100;

        for (let i = 0; i < particleCount; i++) {
            this.createParticle();
        }

        // Cleanup after animation
        setTimeout(() => {
            if (this.container) {
                this.container.innerHTML = '';
            }
        }, 3000);
    }

    createParticle() {
        const particle = document.createElement('div');
        particle.className = 'confetti';

        // Random properties
        const x = Math.random() * 100; // percent
        const delay = Math.random() * 2; // seconds
        const duration = 1 + Math.random() * 2; // seconds
        const color = this.colors[Math.floor(Math.random() * this.colors.length)];

        particle.style.left = `${x}%`;
        particle.style.top = '-10px';
        particle.style.backgroundColor = color;
        particle.style.animationDuration = `${duration}s`;
        particle.style.animationDelay = `${delay}s`;

        // Random rotation
        particle.style.transform = `rotate(${Math.random() * 360}deg)`;

        this.container.appendChild(particle);
    }
}

window.confettiManager = new ConfettiManager();
