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
    initLikeButton();
    initTOC();
    initSmartFootnotes();
    initShareQuote();
    initZenMode();
    initAudio();
    initSearch(); // Initialize Search
    initShortcutsHelp(); // Initialize Help Modal

    // Expose functions required by HTML onclick attributes
    window.filterGrid = filterGrid;
    window.playStory = playStory;
    window.closeVideo = closeVideo;
    window.triggerCelebration = triggerCelebration; // Kept for Konami
    window.openSearch = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));

    // Scroll listener for Nav
    const nav = document.querySelector('nav');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 20) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    });

});

/* =========================================
   13. ZEN MODE & KEYBOARD NAV
   ========================================= */
function initZenMode() {
    const btn = document.getElementById('zenBtn');

    // Toggle Zen Mode
    if (btn) {
        btn.addEventListener('click', () => {
            document.body.classList.toggle('zen-mode');
            btn.classList.toggle('active');
        });
    }

    // Keyboard Listeners (Zen toggle + J/K Nav)
    document.addEventListener('keydown', (e) => {
        // Ignore if user is typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (e.metaKey || e.ctrlKey || e.altKey) return; // Ignore modifiers (except Shift for ?)

        // Zen Mode (Z)
        if (e.key.toLowerCase() === 'z') {
            document.body.classList.toggle('zen-mode');
            if (btn) btn.classList.toggle('active');
        }

        // Escape to exit Zen
        if (e.key === 'Escape' && document.body.classList.contains('zen-mode')) {
            document.body.classList.remove('zen-mode');
            if (btn) btn.classList.remove('active');
        }

        // J/K Scrolling (Vim style)
        if (e.key.toLowerCase() === 'j') {
            window.scrollBy({ top: 100, behavior: 'smooth' });
        }
        if (e.key.toLowerCase() === 'k') {
            window.scrollBy({ top: -100, behavior: 'smooth' });
        }
    });
}


/* =========================================
   14. AUDIO / TTS
   ========================================= */
function initAudio() {
    const btn = document.getElementById('audioBtn');
    if (!btn) return;

    const synth = window.speechSynthesis;
    let isSpeaking = false;
    let chunks = [];
    let chunkIndex = 0;

    // Helper: Split text into meaningful chunks (sentences) to avoid browser TTS timeout
    const chunkText = (text) => {
        // Split by punctuation followed by space or newline
        // complex regex, but essentially looks for sentence endings
        const sentenceRegex = /([^\.!\?]+[\.!\?]+)(\s+|$)/g;
        let match;
        const result = [];
        let lastIndex = 0;

        while ((match = sentenceRegex.exec(text)) !== null) {
            result.push(match[1]); // push the sentence (group 1)
            lastIndex = match.index + match[0].length;
        }

        // Add any remaining text
        if (lastIndex < text.length) {
            result.push(text.substring(lastIndex));
        }

        // If regex found nothing, just return whole text
        return result.length > 0 ? result : [text];
    };

    // Global ref to prevent GC
    if (!window.currentUtterance) window.currentUtterance = null;

    const stopAudio = () => {
        synth.cancel();
        isSpeaking = false;
        btn.classList.remove('speaking');
        // Play icon
        btn.innerHTML = `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M12 6L8 10H4V14H8L12 18V6Z" /><path d="M15.5 8.5C16.5 9.5 16.5 14.5 15.5 15.5" /><path d="M18.5 5.5C20.5 7.5 20.5 16.5 18.5 18.5" /></svg>`;
    };

    // Ensure onbeforeunload stops audio
    window.addEventListener('beforeunload', stopAudio);

    const speakChunk = () => {
        if (!isSpeaking) return;
        if (chunkIndex >= chunks.length) {
            stopAudio();
            return;
        }

        const text = chunks[chunkIndex].trim();
        if (!text) {
            chunkIndex++;
            speakChunk();
            return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        window.currentUtterance = utterance; // Prevent GC

        // Voice Selection (Do this every time in case voices just loaded)
        const voices = synth.getVoices();
        const preferred = voices.find(v => v.name.includes('Google US English')) || voices.find(v => v.lang === 'en-US');
        if (preferred) utterance.voice = preferred;

        utterance.rate = 1.0;

        utterance.onend = () => {
            chunkIndex++;
            speakChunk();
        };

        utterance.onerror = (e) => {
            console.error('TTS Error:', e);
            // Don't necessarily stop, try next chunk?
            // Usually error means fatal, so stop.
            stopAudio();
        };

        synth.speak(utterance);
    };

    btn.addEventListener('click', () => {
        if (isSpeaking) {
            stopAudio();
        } else {
            // Get content
            const content = document.getElementById('postContent') || document.querySelector('article') || document.body;
            if (!content) return;

            // Remove footnotes or other hidden stuff if needed, but innerText usually respects visibility
            const text = content.innerText;

            chunks = chunkText(text);
            chunkIndex = 0;
            isSpeaking = true;

            // Pause icon
            btn.classList.add('speaking');
            btn.innerHTML = `<svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;

            // Cancel any current speech (e.g. from other tabs or previous errors)
            synth.cancel();

            // Short timeout to ensure cancel takes effect
            setTimeout(speakChunk, 50);
        }
    });
}

/* =========================================
   15. SEARCH / COMMAND PALETTE
   ========================================= */
function initSearch() {
    // 1. Inject HTML
    const overlay = document.createElement('div');
    overlay.className = 'cmd-palette-overlay';
    overlay.innerHTML = `
        <div class="cmd-palette">
            <div class="cmd-input-wrapper">
                <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="opacity:0.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                <input type="text" class="cmd-input" placeholder="Search posts, pages, or commands..." id="cmdInput">
                <span class="cmd-shortcut">ESC</span>
            </div>
            <div class="cmd-results" id="cmdResults">
                <!-- Results go here -->
            </div>
            <div class="cmd-footer">
                <span>Navigation</span>
                <span class="cmd-shortcut">↑↓ to navigate, ↵ to select</span>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    const input = document.getElementById('cmdInput');
    const resultsContainer = document.getElementById('cmdResults');
    let searchData = [];
    let selectedIndex = 0;

    // 2. Fetch Data once
    // We try to fetch search.json from root or relative. Since this runs on all pages, root relative is safest.
    fetch('/search.json').then(res => res.json()).then(data => {
        searchData = data;

        // Add static pages
        searchData.push(
            { title: 'Home', description: 'Go back to homepage', url: '/', category: 'Page' },
            { title: 'Work', description: 'Selected projects and case studies', url: '/work/', category: 'Page' },
            { title: 'Ventures', description: 'Startups and experiments', url: '/ventures/', category: 'Page' },
            { title: 'Logbook (Writing)', description: 'All articles and thoughts', url: '/writing/', category: 'Page' },
            { title: 'About', description: 'My story and background', url: '/about/', category: 'Page' }
        );
    }).catch(err => console.log('Search index not found (dev mode?)'));

    // 3. Toggle Logic
    const toggleSearch = (open) => {
        if (open) {
            overlay.classList.add('active');
            input.value = '';
            renderResults(''); // Show defaults
            input.focus();
        } else {
            overlay.classList.remove('active');
            input.blur();
        }
    };

    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            const isOpen = overlay.classList.contains('active');
            toggleSearch(!isOpen);
        }
        if (e.key === 'Escape' && overlay.classList.contains('active')) {
            toggleSearch(false);
        }
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) toggleSearch(false);
    });

    // 4. Filter & Render
    const renderResults = (query) => {
        selectedIndex = 0;
        const q = query.toLowerCase();

        const filtered = query === ''
            ? searchData.slice(0, 5) // Show top 5 default/recent
            : searchData.filter(item =>
                item.title.toLowerCase().includes(q) ||
                (item.description && item.description.toLowerCase().includes(q))
            ).slice(0, 10);

        if (filtered.length === 0) {
            resultsContainer.innerHTML = `<div style="padding:16px; text-align:center; color:var(--text-tertiary)">No results found</div>`;
            return;
        }

        resultsContainer.innerHTML = filtered.map((item, idx) => `
            <a href="${item.url}" class="cmd-item ${idx === 0 ? 'active' : ''}" data-idx="${idx}">
                <div class="cmd-item-title">${item.title}</div>
                <div class="cmd-item-desc">${item.category ? `<span style="opacity:0.6; margin-right:6px">[${item.category}]</span>` : ''}${item.description || ''}</div>
            </a>
        `).join('');

        // Re-attach click listeners to new DOM
        document.querySelectorAll('.cmd-item').forEach(item => {
            item.addEventListener('click', () => toggleSearch(false)); // Allow default link nav
            item.addEventListener('mouseenter', () => {
                // Update selection on hover
                const idx = parseInt(item.dataset.idx);
                updateSelection(idx);
            });
        });
    };

    const updateSelection = (idx) => {
        const items = document.querySelectorAll('.cmd-item');
        if (items.length === 0) return;

        // Wrap
        if (idx < 0) idx = items.length - 1;
        if (idx >= items.length) idx = 0;

        selectedIndex = idx;
        items.forEach(el => el.classList.remove('active'));
        const activeItem = items[selectedIndex];
        activeItem.classList.add('active');

        // Scroll into view
        activeItem.scrollIntoView({ block: 'nearest' });
    };

    input.addEventListener('input', (e) => {
        renderResults(e.target.value);
    });

    input.addEventListener('keydown', (e) => {
        const items = document.querySelectorAll('.cmd-item');
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            updateSelection(selectedIndex + 1);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            updateSelection(selectedIndex - 1);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (items[selectedIndex]) {
                items[selectedIndex].click();
            }
        }
    });
}

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
 * @param {boolean} [options.sortAlphabetical] - if true, sorts items alphabetically by title
 */
function renderProjects(containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Default to all projects if no specific source provided
    let items = options.dataSource ? [...options.dataSource] : (window.allProjects ? [...window.allProjects] : []);

    if (items.length === 0) return;

    // Handle Sorting (Alphabetical)
    if (options.sortAlphabetical) {
        items.sort((a, b) => a.title.localeCompare(b.title));
    }

    // Handle Randomization (overrides sort if both true, but usually mutually exclusive)
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

/* =========================================
   9. LIKE BUTTON LOGIC
   ========================================= */
function initLikeButton() {
    // Select all like buttons on the page (top and bottom)
    const btns = document.querySelectorAll('.js-like-btn');
    const countEls = document.querySelectorAll('.js-like-count');

    if (btns.length === 0) return;

    // Assume all buttons on the page are for the same post (same slug)
    // We grab the slug from the first one
    const firstBtn = btns[0];
    const slug = firstBtn.getAttribute('data-slug');
    if (!slug) return;

    const storageKey = `liked_${slug}`;
    const isLiked = localStorage.getItem(storageKey) === 'true';

    // 1. Generate Deterministic Base Count
    let hash = 0;
    for (let i = 0; i < slug.length; i++) {
        hash = ((hash << 5) - hash) + slug.charCodeAt(i);
        hash |= 0;
    }
    const baseCount = Math.abs(hash) % 50 + 12;

    // 2. Initialize State
    let currentCount = baseCount + (isLiked ? 1 : 0);

    // Helper to update all UI elements
    const updateUI = (liked, count, animateBtn = null) => {
        // Update all buttons
        btns.forEach(b => {
            if (liked) b.classList.add('liked');
            else b.classList.remove('liked');

            if (animateBtn && b === animateBtn && liked) {
                b.classList.add('animating');
                setTimeout(() => b.classList.remove('animating'), 600);
            }
        });

        // Update all counters
        countEls.forEach(el => {
            el.style.opacity = 0;
            setTimeout(() => {
                el.textContent = count;
                el.style.opacity = 1;
            }, 150);
        });
    };

    // Initial Render
    updateUI(isLiked, currentCount);

    // 3. Attach Listeners
    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            const currentlyLiked = btn.classList.contains('liked');

            if (currentlyLiked) {
                // Unlike
                currentCount--;
                localStorage.removeItem(storageKey);
                updateUI(false, currentCount);
            } else {
                // Like
                currentCount++;
                localStorage.setItem(storageKey, 'true');

                // Trigger Confetti
                if (window.fireConfetti) {
                    const rect = btn.getBoundingClientRect();
                    const x = (rect.left + rect.width / 2) / window.innerWidth;
                    const y = (rect.top + rect.height / 2) / window.innerHeight;

                    window.fireConfetti({
                        origin: { x: x, y: y },
                        particleCount: 40,
                        startVelocity: 20,
                        spread: 60,
                        scalar: 0.6,
                        ticks: 60
                    });
                }

                updateUI(true, currentCount, btn);
            }
        });
    });
}

/* =========================================
   10. TABLE OF CONTENTS (Active State)
   ========================================= */
function initTOC() {
    const tocLinks = document.querySelectorAll('.toc a');
    const sections = document.querySelectorAll('.post-content h2, .post-content h3');

    if (!tocLinks.length || !sections.length) return;

    const observerOptions = {
        root: null,
        rootMargin: '-100px 0px -60% 0px', // Trigger when section is near top
        threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                // Remove active from all
                tocLinks.forEach(link => link.classList.remove('active'));
                // Add active to current
                const activeLink = document.querySelector(`.toc a[href="#${id}"]`);
                if (activeLink) activeLink.classList.add('active');
            }
        });
    }, observerOptions);

    sections.forEach(section => observer.observe(section));
}

/* =========================================
   11. SMART FOOTNOTES (Popover)
   ========================================= */
function initSmartFootnotes() {
    const refs = document.querySelectorAll('.footnote-ref, sup a'); // Matches standard markdown footnotes
    if (!refs.length) return;

    // Create popover element
    const popover = document.createElement('div');
    popover.className = 'fn-popover';
    document.body.appendChild(popover);

    let activeRef = null;

    const hidePopover = () => {
        popover.classList.remove('active');
        activeRef = null;
    };

    // Close on outside click
    document.addEventListener('click', (e) => {
        if (activeRef && !activeRef.contains(e.target) && !popover.contains(e.target)) {
            hidePopover();
        }
    });

    refs.forEach(ref => {
        ref.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const href = ref.getAttribute('href'); // e.g. #fn1
            if (!href) return;

            // Allow default behavior if it's not a hash link
            if (!href.startsWith('#')) return;

            const targetId = href.substring(1); // fn1
            // Try to find the footnote content
            // Standard markdown puts footnotes at bottom in a list
            const targetEl = document.getElementById(targetId);
            if (!targetEl) return;

            // Get text content (strip back link arrows if any)
            let content = targetEl.innerHTML;
            // Remove the "return" link often present in footnotes
            content = content.replace(/<a[^>]*class="footnote-backref"[^>]*>.*?<\/a>/g, '');

            popover.innerHTML = content;
            popover.classList.add('active');
            activeRef = ref;

            // Positioning
            const rect = ref.getBoundingClientRect();
            const popRect = popover.getBoundingClientRect();

            // Center above the reference
            let left = rect.left + rect.width / 2 - popRect.width / 2;
            let top = rect.top + window.scrollY - popRect.height - 10;

            // Boundary checks
            if (left < 10) left = 10;
            if (left + popRect.width > window.innerWidth - 10) left = window.innerWidth - popRect.width - 10;

            popover.style.left = `${left}px`;
            popover.style.top = `${top}px`;
        });

        // Optional: Hover support
        ref.addEventListener('mouseenter', () => {
            // We could trigger it here too, but click is often safer for mobile
        });
    });
}

/* =========================================
   12. SHARE QUOTE TOOLTIP
   ========================================= */
function initShareQuote() {
    const tooltip = document.getElementById('shareTooltip');
    const article = document.querySelector('.post-content');
    if (!tooltip || !article) return;

    const handleSelection = () => {
        const selection = window.getSelection();
        if (selection.isCollapsed) {
            tooltip.classList.remove('visible');
            return;
        }

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // Ensure selection is within article
        if (!article.contains(range.commonAncestorContainer) && !range.commonAncestorContainer.contains(article)) {
            tooltip.classList.remove('visible');
            return;
        }

        const quote = selection.toString().trim();
        if (quote.length < 5) return;

        // Position tooltip
        tooltip.style.left = `${rect.left + rect.width / 2}px`;
        tooltip.style.top = `${rect.top + window.scrollY}px`;
        tooltip.classList.add('visible');

        // Store quote for click
        tooltip.dataset.quote = quote;
    };

    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('keyup', handleSelection); // For keyboard selection
    document.addEventListener('scroll', () => {
        // Hide on scroll to prevent misalignment
        if (tooltip.classList.contains('visible')) {
            tooltip.classList.remove('visible');
            // Deselect? No, just hide tooltip
        }
    });

    tooltip.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();

        const quote = tooltip.dataset.quote;
        const url = window.location.href;
        const twitterUrl = `https://twitter.com/intent/tweet?text="${encodeURIComponent(quote)}" — @maxwellcofie&url=${encodeURIComponent(url)}`;

        window.open(twitterUrl, '_blank', 'width=550,height=420');
        tooltip.classList.remove('visible');
    });
}

/* =========================================
   16. SHORTCUTS HELP MODAL (?)
   ========================================= */
function initShortcutsHelp() {
    // 1. Create Modal
    const modal = document.createElement('div');
    modal.className = 'shortcuts-modal';
    modal.innerHTML = `
        <div class="shortcuts-content">
            <div class="shortcuts-header">
                <h3>Keyboard Shortcuts</h3>
                <span class="close-shortcuts">×</span>
            </div>
            <div class="shortcuts-grid">
                <div class="shortcut-row">
                    <span class="key-combo">
                        <kbd>⌘</kbd> <kbd>K</kbd>
                    </span>
                    <span class="sc-desc">Search / Command Palette</span>
                </div>
                <div class="shortcut-row">
                    <span class="key-combo">
                        <kbd>Z</kbd>
                    </span>
                    <span class="sc-desc">Toggle Zen Mode</span>
                </div>
                 <div class="shortcut-row">
                    <span class="key-combo">
                        <kbd>J</kbd> / <kbd>K</kbd>
                    </span>
                    <span class="sc-desc">Scroll Down/Up</span>
                </div>
                <div class="shortcut-row">
                    <span class="key-combo">
                        <kbd>T</kbd>
                    </span>
                    <span class="sc-desc">Toggle Theme</span>
                </div>
                <div class="shortcut-row">
                    <span class="key-combo">
                        <kbd>?</kbd>
                    </span>
                    <span class="sc-desc">Show Shortcuts</span>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    const closeBtn = modal.querySelector('.close-shortcuts');
    const toggleModal = (show) => {
        if (show) modal.classList.add('active');
        else modal.classList.remove('active');
    };

    closeBtn.addEventListener('click', () => toggleModal(false));

    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) toggleModal(false);
    });

    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        // ? key (Shift + /)
        if (e.key === '?') {
            toggleModal(!modal.classList.contains('active'));
        }

        // Escape closes it
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            toggleModal(false);
        }

        // Add 'T' for Theme Toggle while we are here
        if (e.key.toLowerCase() === 't' && !e.metaKey && !e.ctrlKey) {
            const themeBtn = document.getElementById('themeBtn');
            if (themeBtn) themeBtn.click();
        }
    });
}
