/**
 * app.js
 * Centralized logic for Maxwell Cofie's portfolio.
 * Includes: Theme, Time, Filtering, Puzzle, and 'Konami' easter egg.
 */

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initClock();
    initKonami();
    initCopyButtons();
    initLightbox();


    // Expose functions required by HTML onclick attributes
    window.filterGrid = filterGrid;
    window.playStory = playStory;
    window.closeVideo = closeVideo;
    window.triggerCelebration = triggerCelebration; // Kept for Konami
    window.toggleMoreProjects = toggleMoreProjects;

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
   4. VIDEO STORY TELLING
   ========================================= */
function playStory() {
    const vModal = document.getElementById('video-modal');
    const container = document.querySelector('.video-container-crt');
    const video = document.getElementById('greeting-video');

    if (vModal) {
        vModal.classList.add('active');

        // Trigger CRT Animation
        if (container) {
            container.classList.remove('animate-on');
            void container.offsetWidth; // Force reflow
            container.classList.add('animate-on');
        }

        // Auto play with slight delay to match animation peak
        if (video && video.contentWindow) {
            setTimeout(() => {
                // Send Play command to YouTube iframe
                video.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
            }, 300); // Wait for the "flash" of the CRT
        }
    }
}

function closeVideo() {
    const vModal = document.getElementById('video-modal');
    const video = document.getElementById('greeting-video');
    const container = document.querySelector('.video-container-crt');

    if (vModal) vModal.classList.remove('active');

    // Stop video (YouTube API)
    if (video && video.contentWindow) {
        video.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
    }

    // Reset Animation State
    if (container) {
        container.classList.remove('animate-on');
    }
}

// Kept for Konami Easter Egg
function triggerCelebration() {
    if (window.fireConfetti) window.fireConfetti();
    // We could launch the video here too if we want
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
    document.documentElement.style.setProperty('--text-muted', '#008800');
}

/* =========================================
   6. CODE COPY BUTTONS
   ========================================= */
function initCopyButtons() {
    // Wait a tick for Prism/Highlight if needed, though they usually run sync or we don't depend on them for text content
    const codeBlocks = document.querySelectorAll('pre');

    codeBlocks.forEach(block => {
        // Check if button already exists (if re-initializing)
        if (block.querySelector('.copy-btn')) return;

        const btn = document.createElement('button');
        btn.className = 'copy-btn';
        btn.textContent = 'Copy';

        // Find code content
        const code = block.querySelector('code');
        const textToCopy = code ? code.innerText : block.innerText;

        btn.addEventListener('click', () => {
            if (navigator.clipboard) {
                navigator.clipboard.writeText(textToCopy).then(() => {
                    const originalText = btn.textContent;
                    btn.textContent = 'Copied!';
                    btn.classList.add('copied');

                    setTimeout(() => {
                        btn.textContent = originalText;
                        btn.classList.remove('copied');
                    }, 2000);
                }).catch(err => {
                    console.error('Failed to copy class', err);
                });
            }
        });

        block.appendChild(btn);
    });
}

/* =========================================
   7. HOMEPAGE SHOW MORE
   ========================================= */
function toggleMoreProjects() {
    const extras = document.querySelectorAll('.extra-project');
    const btnContainer = document.getElementById('showMoreContainer');

    extras.forEach((el, index) => {
        el.style.display = ''; // Reverts to CSS (grid/block)
        el.style.animation = 'none';
        el.offsetHeight; /* trigger reflow */
        el.style.animation = `slideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.1}s forwards`;
    });

    if (btnContainer) {
        btnContainer.style.display = 'none';
    }
}

/* =========================================
   8. LIGHTBOX
   ========================================= */
function initLightbox() {
    // Only run if we have images
    const images = document.querySelectorAll('.image-grid img, .post-content img:not(.emoji)');
    if (!images.length) return;

    // Create lightbox elements
    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox-container';

    const imgElement = document.createElement('img');
    imgElement.className = 'lightbox-img';

    lightbox.appendChild(imgElement);
    document.body.appendChild(lightbox);

    // Add click listeners
    images.forEach(img => {
        img.addEventListener('click', (e) => {
            e.stopPropagation(); // prevent document click
            imgElement.src = img.src;
            imgElement.alt = img.alt;
            lightbox.classList.add('active');
            document.body.style.overflow = 'hidden'; // prevent scroll
        });
    });

    // Close on click
    lightbox.addEventListener('click', () => {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
        setTimeout(() => {
            imgElement.src = ''; // clear for next time
        }, 300);
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox.classList.contains('active')) {
            lightbox.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
}
