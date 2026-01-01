/**
 * app.js
 * Centralized logic for Maxwell Cofie's portfolio.
 * Includes: Theme, Time, Filtering, Puzzle, and 'Konami' easter egg.
 */

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initClock();
    initKonami();

    // Expose functions required by HTML onclick attributes
    window.filterGrid = filterGrid;
    window.popStickers = popStickers;
    window.closePuzzle = closePuzzle;
    window.checkPuzzle = checkPuzzle;
    window.triggerCelebration = triggerCelebration;
    window.closeVideo = closeVideo;
});

/* =========================================
   1. THEME MANAGEMENT
   ========================================= */
const sunIcon = `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`;
const moonIcon = `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;

function initTheme() {
    const themeBtn = document.getElementById('themeBtn');
    if (!themeBtn) return;

    const root = document.documentElement;
    const savedTheme = localStorage.getItem('theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    const setTheme = (theme) => {
        root.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        themeBtn.innerHTML = theme === 'dark' ? sunIcon : moonIcon;
    };

    if (savedTheme) {
        setTheme(savedTheme);
    } else {
        setTheme(systemDark ? 'dark' : 'light');
    }

    themeBtn.addEventListener('click', () => {
        const current = root.getAttribute('data-theme');
        setTheme(current === 'dark' ? 'light' : 'dark');
    });
}

/* =========================================
   2. CLOCK (Accra Time)
   ========================================= */
function initClock() {
    const updateTime = () => {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Africa/Accra'
        });
        const clockEl = document.getElementById('clock');
        if (clockEl) {
            clockEl.textContent = timeString;
        }
    };
    updateTime();
    setInterval(updateTime, 60000);
}

/* =========================================
   3. PROJECT FILTERING
   ========================================= */
function filterGrid(category, event) {
    if (event) event.preventDefault();

    // Update nav state
    const buttons = document.querySelectorAll('.nav-link[onclick]');
    if (buttons.length) {
        buttons.forEach(b => b.classList.remove('active'));
        if (event && event.target) event.target.classList.add('active');
    }

    const items = document.querySelectorAll('.project-item');

    // Reset animations
    items.forEach((item) => {
        item.style.animation = 'none';
        item.offsetHeight; /* trigger reflow */
    });

    let delayCounter = 0;
    items.forEach(item => {
        const itemCat = item.getAttribute('data-category');
        // Ventures are in a separate list, but this function runs globally just in case
        if (category === 'all' || itemCat === category) {
            item.classList.remove('hidden');
            // Re-apply animation with index calculation for stagger
            item.style.animation = `slideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${delayCounter * 0.05}s forwards`;
            delayCounter++;
        } else {
            item.classList.add('hidden');
        }
    });
}

/* =========================================
   4. PUZZLE & GAMIFICATION
   ========================================= */
let correctPuzzleAnswer = 0;

function popStickers() {
    const modal = document.getElementById('puzzle-modal');

    // Randomly select operation: 0-2 (Basic), 3-5 (Intermediate), 6-7 (Complex)
    // 0=Add, 1=Sub, 2=Mult, 3=Div, 4=Square, 5=Order of Ops, 6=Algebra, 7=Square Root
    const op = Math.floor(Math.random() * 8);
    let a, b, c;
    let questionText = "";

    if (op === 0) { // Addition
        a = Math.floor(Math.random() * 15) + 1;
        b = Math.floor(Math.random() * 15) + 1;
        correctPuzzleAnswer = a + b;
        questionText = `${a} + ${b} = ?`;
    } else if (op === 1) { // Subtraction
        a = Math.floor(Math.random() * 20) + 5;
        b = Math.floor(Math.random() * a) + 1;
        correctPuzzleAnswer = a - b;
        questionText = `${a} - ${b} = ?`;
    } else if (op === 2) { // Multiplication
        a = Math.floor(Math.random() * 9) + 2;
        b = Math.floor(Math.random() * 9) + 2;
        correctPuzzleAnswer = a * b;
        questionText = `${a} × ${b} = ?`;
    } else if (op === 3) { // Division
        b = Math.floor(Math.random() * 9) + 2;
        const result = Math.floor(Math.random() * 9) + 2;
        a = b * result;
        correctPuzzleAnswer = result;
        questionText = `${a} ÷ ${b} = ?`;
    } else if (op === 4) { // Square
        a = Math.floor(Math.random() * 10) + 2;
        correctPuzzleAnswer = a * a;
        questionText = `${a}² = ?`;
    } else if (op === 5) { // Order of Operations (A + B * C)
        a = Math.floor(Math.random() * 10) + 1;
        b = Math.floor(Math.random() * 5) + 1;
        c = Math.floor(Math.random() * 5) + 1;
        correctPuzzleAnswer = a + (b * c);
        questionText = `${a} + ${b} × ${c} = ?`;
    } else if (op === 6) { // Simple Algebra (Ax + B = C)
        // We generate x first to ensure integer solution
        const x = Math.floor(Math.random() * 8) + 2; // Answer
        a = Math.floor(Math.random() * 5) + 2;       // Coefficient
        b = Math.floor(Math.random() * 10) + 1;      // Constant
        const result = (a * x) + b;                  // Total
        correctPuzzleAnswer = x;
        questionText = `${a}x + ${b} = ${result}, x = ?`;
    } else { // Square Root
        const root = Math.floor(Math.random() * 12) + 2; // 2 to 13
        a = root * root;
        correctPuzzleAnswer = root;
        questionText = `√${a} = ?`;
    }

    const qEl = document.getElementById('puzzle-question');
    const iEl = document.getElementById('puzzle-input');

    if (qEl) qEl.innerText = questionText;
    if (iEl) iEl.value = '';

    if (modal) modal.classList.add('active');
    setTimeout(() => {
        if (iEl) iEl.focus();
    }, 100);
}

function closePuzzle() {
    const modal = document.getElementById('puzzle-modal');
    if (modal) modal.classList.remove('active');
}

function checkPuzzle() {
    const input = document.getElementById('puzzle-input');
    if (!input) return;

    const val = parseInt(input.value);

    if (val === correctPuzzleAnswer) {
        closePuzzle();
        triggerCelebration();
    } else {
        // Error shake
        input.style.borderColor = 'red';
        input.animate([
            { transform: 'translateX(0)' },
            { transform: 'translateX(-10px)' },
            { transform: 'translateX(10px)' },
            { transform: 'translateX(0)' }
        ], { duration: 300 });
        setTimeout(() => input.style.borderColor = 'var(--surface)', 2000);
    }
}

function triggerCelebration() {
    // 1. Fire Confetti
    if (window.fireConfetti) {
        window.fireConfetti();
    }

    // 2. Open Video Modal
    const vModal = document.getElementById('video-modal');
    const video = document.getElementById('greeting-video');

    if (vModal) vModal.classList.add('active');

    // Auto play if possible
    if (video) {
        video.currentTime = 0;
        video.play().catch(e => console.log('Autoplay blocked', e));
    }
}

function closeVideo() {
    const vModal = document.getElementById('video-modal');
    const video = document.getElementById('greeting-video');

    if (vModal) vModal.classList.remove('active');
    if (video) video.pause();
}

/* =========================================
   5. EASTER EGG (KONAMI CODE)
   ========================================= */
function initKonami() {
    const code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let index = 0;

    document.addEventListener('keydown', (e) => {
        if (e.key === code[index]) {
            index++;
            if (index === code.length) {
                activateEasterEgg();
                index = 0;
            }
        } else {
            index = 0;
        }
    });
}

function activateEasterEgg() {
    // 1. Massive Confetti
    if (window.fireConfetti) {
        for (let i = 0; i < 5; i++) {
            setTimeout(() => window.fireConfetti(), i * 300);
        }
    }

    // 2. Alert
    alert("🚀 CHEAT CODE ACTIVATED: You are awesome!");

    // 3. Matrix Mode (Just for fun CSS swap)
    document.documentElement.style.setProperty('--bg', '#000');
    document.documentElement.style.setProperty('--text-main', '#00FF00');
    document.documentElement.style.setProperty('--text-muted', '#008800');
}
