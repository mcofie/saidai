
// Simple Canvas Confetti
(function () {
    // Create Canvas if not exists
    let canvas = document.getElementById('confetti-canvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'confetti-canvas';
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '150'; // Below Modal (200) but above content
        document.body.appendChild(canvas);
    }

    const ctx = canvas.getContext('2d');
    let particles = [];
    let animationId = null;

    // Resize handler
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    const colors = ['#FF4D4D', '#4D79FF', '#FFB84D', '#33CC33', '#FF66B2'];

    class Particle {
        constructor() {
            this.x = canvas.width / 2; // Start from center (or button pos if we wanted)
            this.y = window.innerHeight + 10; // Start from bottom? Or center? Let's do Center Burst
            this.y = canvas.height / 2;

            // Random velocity
            const angle = Math.random() * Math.PI * 2;
            const velocity = Math.random() * 15 + 5;

            this.vx = Math.cos(angle) * velocity;
            this.vy = Math.sin(angle) * velocity;

            this.size = Math.random() * 8 + 4;
            this.color = colors[Math.floor(Math.random() * colors.length)];
            this.gravity = 0.5;
            this.friction = 0.96;
            this.life = 1.0;
            this.decay = Math.random() * 0.02 + 0.01;
        }

        update() {
            this.vx *= this.friction;
            this.vy *= this.friction;
            this.vy += this.gravity;

            this.x += this.vx;
            this.y += this.vy;

            this.life -= this.decay;
        }

        draw() {
            ctx.globalAlpha = this.life;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.rect(this.x, this.y, this.size, this.size);
            ctx.fill();
        }
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach((p, index) => {
            p.update();
            p.draw();
            if (p.life <= 0) {
                particles.splice(index, 1);
            }
        });

        if (particles.length > 0) {
            animationId = requestAnimationFrame(animate);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            cancelAnimationFrame(animationId);
        }
    }

    // Exposed function
    window.fireConfetti = function () {
        // Create explosion
        for (let i = 0; i < 150; i++) {
            particles.push(new Particle());
        }

        if (!animationId || particles.length < 160) {
            animate();
        }
    };
})();
