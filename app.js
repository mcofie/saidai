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
    initShareButton();


    // Expose functions required by HTML onclick attributes
    window.filterGrid = filterGrid;
    window.playStory = playStory;
    window.closeVideo = closeVideo;
    window.triggerCelebration = triggerCelebration; // Kept for Konami
    // window.renderProjects is now exposed globally at the bottom of the file
    // No need to do it here inside the listener if it's defined at top level scope


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
    // Theme is mostly likely already set by inline script in head to prevent FOUC
    // But we check just in case, or to start the icon state correctly
    let currentTheme = root.getAttribute('data-theme');

    // Fallback if script didn't run for some reason (rare)
    if (!currentTheme) {
        const savedTheme = localStorage.getItem('theme');
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        currentTheme = savedTheme ? savedTheme : (systemDark ? 'dark' : 'light');
        root.setAttribute('data-theme', currentTheme);
    }

    // Set initial icon
    themeBtn.innerHTML = currentTheme === 'dark' ? sunIcon : moonIcon;

    themeBtn.addEventListener('click', () => {
        const current = root.getAttribute('data-theme');
        const newTheme = current === 'dark' ? 'light' : 'dark';

        root.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        themeBtn.innerHTML = newTheme === 'dark' ? sunIcon : moonIcon;
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
            // Uses .innerHTML to include the dot
            clockEl.innerHTML = `<span class="live-dot"></span>${timeString}`;
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

function initShareButton() {
    const btn = document.getElementById('copyLinkBtn');
    if (!btn) return;

    btn.addEventListener('click', () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(window.location.href).then(() => {
                const originalText = btn.innerHTML;
                btn.innerHTML = '✨ Copied!';
                btn.classList.add('copied');

                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.classList.remove('copied');
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy', err);
            });
        }
    });
}

/* =========================================
   7. PROJECT RENDERING
   ========================================= */
/* =========================================
   7. PROJECT RENDERING
   ========================================= */
/**
 * Renders a list of projects into a container.
 * @param {string} containerId - The ID of the container element.
 * @param {Object} options - Options for rendering.
 * @param {Array} [options.dataSource] - specific array of projects to use (defaults to window.allProjects)
 * @param {number} [options.limit] - max number of items to show
 * @param {boolean} [options.randomize] - whether to shuffle the list
 * @param {boolean} [options.persistRandom] - if true, saves/loads the random selection from sessionStorage (for homepage)
 */
function renderProjects(containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Default to all projects if no specific source provided
    let items = options.dataSource ? [...options.dataSource] : (window.allProjects ? [...window.allProjects] : []);

    if (items.length === 0) return;

    // Handle Randomization
    if (options.randomize) {
        if (options.persistRandom) {
            // Try to get cached order for session consistency
            const storedOrder = sessionStorage.getItem('hp_project_order');
            if (storedOrder) {
                const ids = JSON.parse(storedOrder);
                // Sort items based on the saved ID list
                // We map the IDs back to the item objects. 
                // Filter ensures if we removed a project from data.js it doesn't break.
                const orderedItems = ids.map(id => items.find(i => i.id === id)).filter(Boolean);

                // If we have items (and data hasn't drastically changed), use them.
                // Otherwise fall back to new random.
                if (orderedItems.length > 0) {
                    items = orderedItems;
                } else {
                    items.sort(() => 0.5 - Math.random());
                    sessionStorage.setItem('hp_project_order', JSON.stringify(items.map(i => i.id)));
                }
            } else {
                // New random order
                items.sort(() => 0.5 - Math.random());
                sessionStorage.setItem('hp_project_order', JSON.stringify(items.map(i => i.id)));
            }
        } else {
            // Pure random (no stickiness)
            items.sort(() => 0.5 - Math.random());
        }
    }

    // Apply Limit
    if (options.limit) {
        items = items.slice(0, options.limit);
    }

    container.innerHTML = '';

    items.forEach((proj, index) => {
        const item = document.createElement('a');
        item.href = proj.url;
        item.target = '_blank';
        item.className = 'project-item';
        item.setAttribute('data-category', proj.category);

        // Stagger animation
        item.style.animation = `slideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.1}s forwards`;

        item.innerHTML = `
            <div class="proj-left">
                <div class="proj-header">
                    <span class="proj-title">${proj.title} <span class="year-label">(${proj.year})</span></span>
                    <span class="arrow">↗</span>
                </div>
                <span class="proj-desc" data-i18n="${proj.descKey}">Loading...</span>
            </div>
            <div class="proj-meta" data-i18n="${proj.metaKey}">Type</div>
        `;
        container.appendChild(item);
    });

    // Re-apply current language
    const currentLang = localStorage.getItem('lang') || 'en';
    if (typeof setLanguage === 'function') {
        setLanguage(currentLang);
    }
}
// Explicitly expose to window to be safe across different script loading contexts
window.renderProjects = renderProjects;

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
