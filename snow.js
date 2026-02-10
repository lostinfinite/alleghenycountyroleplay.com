// Snow Particle System
class SnowParticle {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.reset();
    }

    reset() {
        // General properties
        this.size = Math.random() * 3 + 1;
        this.opacity = Math.random() * 0.8 + 0.2;
        this.speed = Math.random() * 2 + 0.5;
        // Small horizontal drift for natural look, but primarily vertical
        this.vx = (Math.random() - 0.5) * 0.3;
        this.vy = Math.abs(this.speed);

        // Always spawn near the top at a random horizontal position
        this.x = Math.random() * this.canvas.width;
        this.y = -10 - Math.random() * 50;
    }

    update() {
        // Add a slight jitter for natural motion
        const jitter = (Math.random() - 0.5) * 0.3;

        // Small horizontal jitter for natural motion; primarily move downwards
        this.x += this.vx + jitter;
        this.y += this.vy + jitter; 

        const offBottom = this.y > this.canvas.height + 50;
        const offSide = this.x < -100 || this.x > this.canvas.width + 100;

        // Reset particle if it's sufficiently off-screen and we aren't fading out
        if ((offBottom || offSide) && !window.snowEffect?.fadingOut) {
            this.reset();
        }
    }

    draw() {
        this.ctx.save();
        this.ctx.globalAlpha = this.opacity;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
    }
}

class SnowEffect {
    isSnowSeason() {
        // FORCE SNOW: Always return true to show snow year-round
        return true;
    }

    constructor() {
        // FORCE SNOW: Always initialize snow effect
        this.canvas = null;
        this.ctx = null;
        this.particles = [];
        this.cssSnowActive = false;
        this.emojiSnowActive = false;
        // FORCE SNOW: Default to enabled
        this.isActive = true; // Always start enabled
        this.particleCount = 50;
        this.animationId = null;
        this.fadingOut = false; // Flag for graceful fade-out mode

        // Initialize without mouse-direction behavior
        this.init();
        // Create the toggle button after initialization
        setTimeout(() => this.createSnowToggle(), 100);

    }

    isSnowSeason() {
        // Ultimate backup: try all methods in order of preference
        try {
            this.initCanvasSnow();
            console.log('Canvas snow activated (primary method)');
        } catch (e1) {
            console.warn('Canvas snow failed, trying CSS animation fallback:', e1);
            try {
                this.initCSSFallback();
                console.log('CSS animation snow activated (secondary method)');
            } catch (e2) {
                console.warn('CSS animation failed, trying DOM element fallback:', e2);
                try {
                    this.initDOMFallback();
                    console.log('DOM element snow activated (tertiary method)');
                } catch (e3) {
                    console.warn('DOM element failed, trying particle backup:', e3);
                    try {
                        this.initParticleBackup();
                        console.log('Particle snow activated (quaternary method)');
                    } catch (e4) {
                        console.warn('Particle backup failed, trying emoji fallback:', e4);
                        try {
                            this.initEmojiFallback();
                            console.log('Emoji snow activated (quinary method)');
                        } catch (e5) {
                            console.warn('Emoji fallback failed, trying ultimate CSS backup:', e5);
                            try {
                                this.initUltimateBackup();
                                console.log('Ultimate CSS snow activated (final backup)');
                            } catch (e6) {
                                console.error('ALL snow methods failed! Even the ultimate backup failed:', e1, e2, e3, e4, e5, e6);
                                // Absolute last resort: simple background
                                document.body.style.background = 'linear-gradient(45deg, rgba(255,255,255,0.05) 25%, transparent 25%), linear-gradient(-45deg, rgba(255,255,255,0.05) 25%, transparent 25%)';
                                document.body.style.backgroundSize = '20px 20px';
                                console.log('Basic background pattern activated (absolute last resort)');
                            }
                        }
                    }
                }
            }
        }
    }

    init() {
        // FORCE SNOW: Use comprehensive backup system
        this.initBackupSnow();
    }

    initBackupSnow() {
        // Ultimate backup: try all methods in order of preference
        try {
            this.initCanvasSnow();
            console.log('Canvas snow activated (primary method)');
        } catch (e1) {
            console.warn('Canvas snow failed, trying CSS animation fallback:', e1);
            try {
                this.initCSSFallback();
                console.log('CSS animation snow activated (secondary method)');
            } catch (e2) {
                console.warn('CSS animation failed, trying DOM element fallback:', e2);
                try {
                    this.initDOMFallback();
                    console.log('DOM element snow activated (tertiary method)');
                } catch (e3) {
                    console.warn('DOM element failed, trying particle backup:', e3);
                    try {
                        this.initParticleBackup();
                        console.log('Particle snow activated (quaternary method)');
                    } catch (e4) {
                        console.warn('Particle backup failed, trying emoji fallback:', e4);
                        try {
                            this.initEmojiFallback();
                            console.log('Emoji snow activated (quinary method)');
                        } catch (e5) {
                            console.warn('Emoji fallback failed, trying ultimate CSS backup:', e5);
                            try {
                                this.initUltimateBackup();
                                console.log('Ultimate CSS snow activated (final backup)');
                            } catch (e6) {
                                console.error('ALL snow methods failed! Even the ultimate backup failed:', e1, e2, e3, e4, e5, e6);
                                // Absolute last resort: simple background
                                document.body.style.background = 'linear-gradient(45deg, rgba(255,255,255,0.05) 25%, transparent 25%), linear-gradient(-45deg, rgba(255,255,255,0.05) 25%, transparent 25%)';
                                document.body.style.backgroundSize = '20px 20px';
                                console.log('Basic background pattern activated (absolute last resort)');
                            }
                        }
                    }
                }
            }
        }
    }

    initCanvasSnow() {
        // Create canvas
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'snow-canvas';
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '1000';
        document.body.appendChild(this.canvas);

        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();

        // Create particles
        for (let i = 0; i < this.particleCount; i++) {
            const p = new SnowParticle(this.canvas);
            p.reset();
            this.particles.push(p);
        }

        // Handle window resize
        window.addEventListener('resize', () => this.resizeCanvas());

        // Start animation if enabled
        if (this.isActive) {
            this.start();
        } else {
            this.canvas.style.display = 'none';
        }
    }



    resizeCanvas() {
        if (this.canvas) {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        }
    }

    initCSSFallback() {
        // CSS-based snow effect as backup
        const snowContainer = document.createElement('div');
        snowContainer.id = 'css-snow-container';
        snowContainer.style.position = 'fixed';
        snowContainer.style.top = '0';
        snowContainer.style.left = '0';
        snowContainer.style.width = '100%';
        snowContainer.style.height = '100%';
        snowContainer.style.pointerEvents = 'none';
        snowContainer.style.zIndex = '1000';
        snowContainer.style.overflow = 'hidden';

        // Create CSS snowflakes
        for (let i = 0; i < 50; i++) {
            const snowflake = document.createElement('div');
            snowflake.className = 'css-snowflake';
            snowflake.innerHTML = '❄';
            snowflake.style.position = 'absolute';
            snowflake.style.color = 'white';
            snowflake.style.fontSize = Math.random() * 20 + 10 + 'px';
            snowflake.style.opacity = Math.random() * 0.8 + 0.2;
            snowflake.style.left = Math.random() * 100 + '%';
            snowflake.style.animationDelay = Math.random() * 10 + 's';
            snowflake.style.animationDuration = Math.random() * 10 + 10 + 's';
            snowContainer.appendChild(snowflake);
        }

        document.body.appendChild(snowContainer);

        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes css-snow-fall {
                0% { transform: translateY(-100px) rotate(0deg); }
                100% { transform: translateY(100vh) rotate(360deg); }
            }
            .css-snowflake {
                animation: css-snow-fall linear infinite;
            }
        `;
        document.head.appendChild(style);

        this.cssSnowActive = true;
        console.log('CSS snow fallback activated');
    }

    initEmojiFallback() {
        // Emoji-based snow as last resort
        const emojiContainer = document.createElement('div');
        emojiContainer.id = 'emoji-snow-container';
        emojiContainer.style.position = 'fixed';
        emojiContainer.style.top = '0';
        emojiContainer.style.left = '0';
        emojiContainer.style.width = '100%';
        emojiContainer.style.height = '100%';
        emojiContainer.style.pointerEvents = 'none';
        emojiContainer.style.zIndex = '1000';
        emojiContainer.style.fontSize = '24px';
        emojiContainer.style.textAlign = 'center';
        emojiContainer.style.lineHeight = '30px';
        emojiContainer.innerHTML = '❄️❄️❄️<br>❄️❄️❄️<br>❄️❄️❄️<br>❄️❄️❄️<br>❄️❄️❄️';
        emojiContainer.style.opacity = '0.3';

        document.body.appendChild(emojiContainer);
        this.emojiSnowActive = true;
        console.log('Emoji snow fallback activated');
    }

    initDOMFallback() {
        // DOM element-based snow as another fallback
        const domContainer = document.createElement('div');
        domContainer.id = 'dom-snow-container';
        domContainer.style.position = 'fixed';
        domContainer.style.top = '0';
        domContainer.style.left = '0';
        domContainer.style.width = '100%';
        domContainer.style.height = '100%';
        domContainer.style.pointerEvents = 'none';
        domContainer.style.zIndex = '1000';
        domContainer.style.overflow = 'hidden';

        // Create DOM snowflakes
        for (let i = 0; i < 30; i++) {
            const snowflake = document.createElement('div');
            snowflake.className = 'dom-snowflake';
            snowflake.textContent = '❄';
            snowflake.style.position = 'absolute';
            snowflake.style.color = 'white';
            snowflake.style.fontSize = Math.random() * 15 + 10 + 'px';
            snowflake.style.opacity = Math.random() * 0.6 + 0.2;
            snowflake.style.left = Math.random() * 100 + '%';
            snowflake.style.top = '-20px';
            snowflake.style.animationDelay = Math.random() * 5 + 's';
            snowflake.style.animationDuration = Math.random() * 8 + 8 + 's';
            domContainer.appendChild(snowflake);
        }

        document.body.appendChild(domContainer);

        // Add CSS animation for DOM snow
        const style = document.createElement('style');
        style.textContent = `
            @keyframes dom-snow-fall {
                0% { transform: translateY(0) rotate(0deg); opacity: 0; }
                10% { opacity: 1; }
                90% { opacity: 1; }
                100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
            }
            .dom-snowflake {
                animation: dom-snow-fall linear infinite;
            }
        `;
        document.head.appendChild(style);

        this.domSnowActive = true;
        console.log('DOM snow fallback activated');
    }

    initUltimateBackup() {
        // Ultimate backup: CSS background snow effect
        const style = document.createElement('style');
        style.id = 'ultimate-snow-backup';
        style.textContent = `
            body::before {
                content: '';
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-image:
                    radial-gradient(circle at 10% 20%, rgba(255,255,255,0.1) 1px, transparent 1px),
                    radial-gradient(circle at 30% 40%, rgba(255,255,255,0.1) 1px, transparent 1px),
                    radial-gradient(circle at 50% 60%, rgba(255,255,255,0.1) 1px, transparent 1px),
                    radial-gradient(circle at 70% 80%, rgba(255,255,255,0.1) 1px, transparent 1px),
                    radial-gradient(circle at 90% 10%, rgba(255,255,255,0.1) 1px, transparent 1px);
                background-size: 100px 100px, 120px 120px, 80px 80px, 150px 150px, 90px 90px;
                background-position: 0 0, 20px 30px, 40px 60px, 60px 10px, 80px 50px;
                animation: snow-drift 20s linear infinite;
                pointer-events: none;
                z-index: 999;
            }

            @keyframes snow-drift {
                0% { transform: translateY(0); }
                100% { transform: translateY(100px); }
            }
        `;
        document.head.appendChild(style);
        console.log('Ultimate CSS snow backup activated');
    }

    initParticleBackup() {
        // Backup using CSS particles (no JavaScript animation)
        const particleContainer = document.createElement('div');
        particleContainer.id = 'particle-snow-backup';
        particleContainer.style.position = 'fixed';
        particleContainer.style.top = '0';
        particleContainer.style.left = '0';
        particleContainer.style.width = '100%';
        particleContainer.style.height = '100%';
        particleContainer.style.pointerEvents = 'none';
        particleContainer.style.zIndex = '1000';
        particleContainer.style.overflow = 'hidden';

        // Create static snow particles
        for (let i = 0; i < 100; i++) {
            const particle = document.createElement('div');
            particle.style.position = 'absolute';
            particle.style.width = '2px';
            particle.style.height = '2px';
            particle.style.background = 'white';
            particle.style.borderRadius = '50%';
            particle.style.opacity = Math.random() * 0.5 + 0.1;
            particle.style.left = Math.random() * 100 + '%';
            particle.style.top = Math.random() * 100 + '%';
            particle.style.animation = `float${i % 3} ${Math.random() * 10 + 10}s linear infinite`;
            particleContainer.appendChild(particle);
        }

        document.body.appendChild(particleContainer);

        // Add floating animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes float0 { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }
            @keyframes float1 { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-15px); } }
            @keyframes float2 { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-25px); } }
        `;
        document.head.appendChild(style);

        console.log('Particle snow backup activated');
    }

    start() {
        if (this.animationId) return;

        // Reset fade-out mode when starting
        this.fadingOut = false;

        // Handle canvas snow
        if (this.canvas) {
            this.canvas.style.display = 'block';
            const animate = () => {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.particles.forEach(particle => {
                    particle.update();
                    particle.draw();
                });

                // If fading out, check if all particles are off-screen
                if (this.fadingOut) {
                    const allParticlesOffScreen = this.particles.every(particle => particle.y > this.canvas.height + 10);
                    if (allParticlesOffScreen) {
                        // All particles have fallen, now actually stop
                        this.canvas.style.display = 'none';
                        this.animationId = null;
                        this.fadingOut = false;
                        return; // Stop the animation loop
                    }
                }

                this.animationId = requestAnimationFrame(animate);
            };
            animate();
        }

        // Handle CSS snow
        const cssContainer = document.getElementById('css-snow-container');
        if (cssContainer) {
            cssContainer.style.display = 'block';
        }

        // Handle DOM snow
        const domContainer = document.getElementById('dom-snow-container');
        if (domContainer) {
            domContainer.style.display = 'block';
        }

        // Handle emoji snow
        const emojiContainer = document.getElementById('emoji-snow-container');
        if (emojiContainer) {
            emojiContainer.style.display = 'block';
        }

        this.isActive = true;
        localStorage.setItem('snowEnabled', 'true');
    }

    stop() {
        // Enter fade-out mode instead of immediately stopping
        this.fadingOut = true;
        this.isActive = false;
        localStorage.setItem('snowEnabled', 'false');

        // Hide non-canvas snow immediately
        const containers = ['css-snow-container', 'dom-snow-container', 'emoji-snow-container'];
        containers.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = 'none';
            }
        });
    }

    toggle() {
        // Allow proper toggling on/off
        if (this.isActive) {
            this.stop();
        } else {
            this.start();
        }
    }

    forceEnable() {
        // FORCE SNOW: Method to ensure snow is always enabled
        this.isActive = true;
        localStorage.setItem('snowEnabled', 'true');
        this.start();
    }

    createSnowToggle() {
        // Create toggle button - BOTTOM RIGHT position, SMALLER SIZE
        const toggleButton = document.createElement('button');
        toggleButton.id = 'snow-toggle';
        toggleButton.innerHTML = '❄️';
        toggleButton.title = 'Toggle Snow Effect';
        toggleButton.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: rgba(255, 187, 0, 0.8);
            border: 2px solid #FFBB00;
            color: white;
            font-size: 16px;
            cursor: pointer;
            z-index: 1001;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
            box-shadow: 0 4px 12px rgba(255, 187, 0, 0.3);
        `;

        // Update button appearance based on snow state: YELLOW = active, GRAY = inactive
        function updateButtonState() {
            const isSnowActive = localStorage.getItem('snowEnabled') !== 'false';
            if (isSnowActive) {
                toggleButton.style.background = 'rgba(255, 187, 0, 0.8)';
                toggleButton.style.borderColor = '#FFBB00';
                toggleButton.style.boxShadow = '0 4px 12px rgba(255, 187, 0, 0.3)';
                toggleButton.title = 'Snow Effect Active - Click to disable';
            } else {
                toggleButton.style.background = 'rgba(128, 128, 128, 0.7)';
                toggleButton.style.borderColor = '#666';
                toggleButton.style.boxShadow = '0 4px 12px rgba(128, 128, 128, 0.3)';
                toggleButton.title = 'Snow Effect Disabled - Click to enable';
            }
        }

        // Add hover effects
        toggleButton.onmouseover = () => {
            toggleButton.style.transform = 'scale(1.1)';
            const isSnowActive = localStorage.getItem('snowEnabled') !== 'false';
            if (isSnowActive) {
                toggleButton.style.boxShadow = '0 6px 16px rgba(255, 187, 0, 0.4)';
            } else {
                toggleButton.style.boxShadow = '0 6px 16px rgba(128, 128, 128, 0.4)';
            }
        };
        toggleButton.onmouseout = () => {
            toggleButton.style.transform = 'scale(1)';
            updateButtonState();
        };

        // Add click handler - PROPER TOGGLE: allow turning on/off
        toggleButton.onclick = () => {
            const isCurrentlyActive = localStorage.getItem('snowEnabled') !== 'false';
            if (isCurrentlyActive) {
                // Turn off snow
                this.stop();
                localStorage.setItem('snowEnabled', 'false');
            } else {
                // Turn on snow
                this.start();
                localStorage.setItem('snowEnabled', 'true');
            }
            updateButtonState();

            // Visual feedback
            toggleButton.style.transform = 'scale(0.9)';
            setTimeout(() => {
                toggleButton.style.transform = 'scale(1)';
                updateButtonState();
            }, 150);
        };

        // Initial state
        updateButtonState();

        document.body.appendChild(toggleButton);
        console.log('Snow toggle button created (bottom right, smaller size)');
    }
}

// Initialize snow effect when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.snowEffect = new SnowEffect();
    // Check if snow should be enabled based on localStorage
    const snowEnabled = localStorage.getItem('snowEnabled') !== 'false';
    if (snowEnabled) {
        setTimeout(() => {
            if (window.snowEffect) {
                window.snowEffect.start();
            }
        }, 100);
    }
});

// Also initialize if script is loaded after DOM
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(() => {
        if (!window.snowEffect) {
            window.snowEffect = new SnowEffect();
            // Check if snow should be enabled based on localStorage
            const snowEnabled = localStorage.getItem('snowEnabled') !== 'false';
            if (snowEnabled) {
                setTimeout(() => {
                    if (window.snowEffect) {
                        window.snowEffect.start();
                    }
                }, 200);
            }
        }
    }, 100);
}

// Global function to toggle snow - can be called from console or other scripts
window.toggleSnow = function() {
    if (window.snowEffect) {
        window.snowEffect.toggle();
    } else {
        // Create new snow effect if it doesn't exist
        window.snowEffect = new SnowEffect();
        setTimeout(() => {
            if (window.snowEffect) {
                window.snowEffect.start();
            }
        }, 200);
    }
    console.log('❄️ Snow toggled!');
};