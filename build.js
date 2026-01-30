const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const fm = require('front-matter');
const hljs = require('highlight.js');

// Configuration
const CONTENT_DIR = path.join(__dirname, 'content/posts');
const OUTPUT_DIR = path.join(__dirname, 'posts');
const INDEX_PATH = path.join(__dirname, 'index.html');
const WRITING_DIR = path.join(__dirname, 'writing');
const WRITING_INDEX_PATH = path.join(WRITING_DIR, 'index.html');

// Ensure output dirs exist
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}
if (!fs.existsSync(WRITING_DIR)) {
    fs.mkdirSync(WRITING_DIR, { recursive: true });
}

// 1. Configure Marked with Highlight.js and Custom Renderer
const renderer = new marked.Renderer();

// Override image renderer to support video embeds
renderer.image = ({ href, title, text }) => {
    if (href && (href.endsWith('.webm') || href.endsWith('.mp4') || href.endsWith('.mov'))) {
        return `
        <video controls playsinline loop muted autoplay class="post-video">
            <source src="${href}" type="video/${href.split('.').pop()}">
            Your browser does not support the video tag.
        </video>`;
    }
    return `<img src="${href}" alt="${text}" title="${title || ''}" class="post-img">`;
};

// Override code renderer to support filenames
renderer.code = ({ text, lang, escaped }) => {
    // Check if lang has a filename: e.g. "javascript:app.js"
    let language = (lang || '').split(':')[0];
    const filename = (lang || '').split(':')[1];

    const validLang = hljs.getLanguage(language) ? language : 'plaintext';
    const highlighted = hljs.highlight(text, { language: validLang }).value;

    let headerHTML = '';
    if (filename) {
        headerHTML = `<div class="code-header">
                        <span class="code-filename">${filename}</span>
                      </div>`;
    }

    return `<div class="code-block-wrapper">
                ${headerHTML}
                <pre><code class="hljs language-${validLang}">${highlighted}</code></pre>
            </div>`;
};

marked.setOptions({
    renderer: renderer,
    langPrefix: 'hljs language-'
});

// 2. Read All Posts
const posts = [];
const files = fs.readdirSync(CONTENT_DIR);

files.forEach(file => {
    if (path.extname(file) !== '.md') return;

    const content = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8');
    const { attributes, body } = fm(content);

    // Extract TOC before parsing full body
    const tokens = marked.lexer(body);
    const headings = tokens.filter(t => t.type === 'heading' && (t.depth === 2 || t.depth === 3));

    const tocHTML = headings.length > 0 ? `
        <nav class="toc">
            <div class="toc-label">Table of Contents</div>
            <ul>
                ${headings.map(h => {
        const id = h.text.toLowerCase().replace(/[^\w]+/g, '-');
        return `<li class="toc-level-${h.depth}"><a href="#${id}">${h.text}</a></li>`;
    }).join('')}
            </ul>
        </nav>` : '';

    const htmlContent = marked.parse(body);

    // Inject IDs into headings in htmlContent? 
    // Marked renderer.heading isn't overridden yet, so headings won't have IDs by default unless we do it.
    // Let's rely on a custom renderer for heading IDs to match the TOC.

    const slug = path.basename(file, '.md');
    const wordCount = body.split(/\s+/).length;
    const readTime = Math.ceil(wordCount / 200);

    // Normalize categories
    let categories = [];
    if (attributes.categories) {
        categories = Array.isArray(attributes.categories) ? attributes.categories : [attributes.categories];
    } else if (attributes.category) {
        categories = [attributes.category];
    }

    posts.push({
        ...attributes,
        categories,
        slug,
        htmlContent, // This will be regenerated with IDs in the loop below properly
        readTime,
        tocHTML,
        outputFile: `${slug}/index.html`,
        url: `${slug}/`
    });
});

// Need to update renderer for Headings to have IDs for TOC
renderer.heading = ({ text, depth }) => {
    const id = text.toLowerCase().replace(/[^\w]+/g, '-');
    return `<h${depth} id="${id}">${text}</h${depth}>`;
};

// Re-process content now that renderer has heading support
posts.forEach(p => {
    const content = fs.readFileSync(path.join(CONTENT_DIR, p.slug + '.md'), 'utf8');
    const { body } = fm(content);
    p.htmlContent = marked.parse(body);
});


// Sort posts by date (newest first)
posts.sort((a, b) => new Date(b.isoDate) - new Date(a.isoDate));

// 3. Generate HTML Files for each post
const HTML_TEMPLATE = `<!doctype html>
<html lang="en" data-theme="system" itemscope itemtype="https://schema.org/BlogPosting">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{TITLE}} | Maxwell Cofie</title>
    <meta name="description" content="{{DESCRIPTION}}">
    <link rel="canonical" href="https://maxwellcofie.com/posts/{{SLUG}}/">
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🇬🇭</text></svg>">
    <!-- View Transitions -->
    <meta name="view-transition" content="same-origin" />

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Mansalva&display=swap" rel="stylesheet">
    <!-- Readability Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,200..800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    
    <link rel="stylesheet" href="../../style.css?v=6">
    
    <style>
        /* FOUC fix for i18n */
        [data-i18n] { visibility: visible; }
    </style>
    <script>
        (function() {
            try {
                const savedTheme = localStorage.getItem('theme');
                const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                const theme = savedTheme ? savedTheme : (systemDark ? 'dark' : 'light');
                document.documentElement.setAttribute('data-theme', theme);
            } catch (e) {}
        })();
    </script>
    
    <!-- Prism/Highlight Theme - Minimal Monochrome -->
    <style>
        /* Blog Post Specifics */
        :root {
            --post-font: 'Inter', sans-serif;
            --post-size: 17px;
            --post-lh: 1.6;
            --post-max-w: 680px;
        }

        [data-font="serif"] {
            --post-font: 'Newsreader', serif;
            --post-size: 20px; /* Serif needs to be slightly larger */
        }
        
        .back-link {
            display: inline-block;
            margin-bottom: 40px;
            font-size: 13px;
            color: var(--text-tertiary);
            transition: color 0.2s;
            text-decoration: none;
        }
        
        .back-link:hover {
            color: var(--text-main);
        }

        /* LAYOUT GRID FOR TOC + CONTENT */
        .post-wrapper {
            display: grid;
            grid-template-columns: 1fr var(--post-max-w) 1fr;
            gap: 40px;
            align-items: start;
        }

        /* TOC SIDEBAR */
        .toc-sidebar {
            position: sticky;
            top: 40px;
            font-size: 13px;
            max-height: calc(100vh - 80px);
            overflow-y: auto;
            display: none; /* Hidden on small screens by default */
        }
        
        @media (min-width: 1100px) {
            .toc-sidebar { display: block; }
        }

        .toc-label {
            text-transform: uppercase;
            letter-spacing: 0.05em;
            font-size: 11px;
            color: var(--text-tertiary);
            margin-bottom: 16px;
            font-weight: 600;
        }

        .toc ul {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .toc li {
            margin-bottom: 8px;
            line-height: 1.4;
        }
        
        .toc a {
            color: var(--text-muted);
            text-decoration: none;
            transition: color 0.2s;
            border-left: 1px solid transparent;
            padding-left: 12px;
            display: block;
            margin-left: -13px; /* visual align */
        }

        .toc a:hover {
            color: var(--text-main);
        }

        .toc a.active {
            color: var(--text-main);
            border-left-color: var(--text-main);
            font-weight: 500;
        }
        
        .toc-level-3 {
            padding-left: 12px;
            font-size: 0.95em;
        }

        article {
            max-width: var(--post-max-w);
            min-width: 0; /* flex/grid fix */
            view-transition-name: article-content;
            grid-column: 2; /* Center column */
        }

        h1 {
            font-size: clamp(28px, 4vw, 40px);
            margin-bottom: 12px;
            letter-spacing: -0.02em;
            line-height: 1.1;
            font-weight: 500;
        }

        .post-meta-row {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 64px;
            font-size: 13px;
            color: var(--text-tertiary);
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 24px;
        }

        .post-date::before,
        .reading-time::before {
             content: "•";
             margin-right: 16px;
             opacity: 0.4;
        }

        @media (max-width: 600px) {
            .post-meta-row {
                flex-wrap: wrap;
                gap: 8px 12px; /* Row gap 8px, Col gap 12px */
                line-height: 1.6;
            }
            
            .post-date::before,
            .reading-time::before {
                 margin-right: 8px;
            }
        }

        .post-content {
            font-family: var(--post-font);
            font-size: var(--post-size); 
            line-height: var(--post-lh);
            color: var(--text-muted);
        }

        .post-content p {
            margin-bottom: 28px;
        }
        
        /* Offset anchors for fixed header or spacing */
        .post-content h2, .post-content h3 {
            scroll-margin-top: 40px;
        }

        .post-content h2 {
            font-size: 24px;
            margin-top: 64px;
            margin-bottom: 24px;
            color: var(--text-main);
            letter-spacing: -0.01em;
            font-weight: 500;
        }

        .post-content h3 {
             font-size: 18px;
             margin-top: 40px;
             margin-bottom: 16px;
             font-weight: 600;
             color: var(--text-main);
        }

        .post-content ul {
            margin-bottom: 32px;
            padding-left: 20px;
        }

        .post-content li {
            margin-bottom: 12px;
        }
        
        .post-content a {
            text-decoration: underline;
            text-underline-offset: 4px;
            text-decoration-color: var(--border-color);
            color: var(--text-main);
            transition: all 0.2s;
        }
        
        .post-content a:hover {
            text-decoration-color: var(--text-main);
            background-color: var(--surface);
            border-radius: 2px;
        }

        .post-content blockquote {
             border-left: 2px solid var(--text-main);
             padding-left: 24px;
             font-family: 'Newsreader', serif;
             font-style: italic;
             font-size: 1.1em;
             margin: 40px 0;
             color: var(--text-main);
        }
        
        /* FOOTNOTES */
        .footnote-ref {
            font-size: 0.8em;
            vertical-align: super;
            text-decoration: none !important;
            margin-left: 2px;
            color: var(--text-main) !important;
            cursor: pointer;
        }
        
        /* Popover Footnote */
        .fn-popover {
            position: absolute;
            background: var(--bg);
            border: 1px solid var(--border-color);
            padding: 16px;
            border-radius: 8px;
            box-shadow: var(--shadow-lg);
            width: 300px;
            font-size: 14px;
            color: var(--text-main);
            z-index: 1000;
            opacity: 0;
            transform: translateY(10px) scale(0.98);
            transition: all 0.2s ease;
            pointer-events: none;
        }
        
        .fn-popover.active {
            opacity: 1;
            transform: translateY(0) scale(1);
            pointer-events: auto;
        }

        /* --- CODE BLOCKS & HEADERS --- */
        .code-block-wrapper {
            margin: 40px -24px;
            border-radius: 8px;
            border: 1px solid var(--border-color);
            background-color: var(--surface); 
            overflow: hidden;
        }
        
        .code-header {
            padding: 12px 24px;
            border-bottom: 1px solid var(--border-color);
            background: rgba(255,255,255,0.02);
            font-family: 'JetBrains Mono', monospace;
            font-size: 12px;
            color: var(--text-tertiary);
            display: flex;
            align-items: center;
        }

        pre {
            background-color: transparent !important; 
            padding: 24px;
            margin: 0 !important;
            border: none !important;
            overflow-x: auto;
            font-size: 13px; 
            font-family: 'JetBrains Mono', monospace;
        }
        
        /* SHARE QUOTE TOOLTIP */
        .share-tooltip {
            position: absolute;
            background: var(--text-main);
            color: var(--bg);
            padding: 8px 16px;
            border-radius: 99px;
            font-size: 13px;
            font-weight: 600;
            pointer-events: none;
            opacity: 0;
            transform: translate(-50%, 10px);
            transition: all 0.2s var(--ease-out);
            z-index: 2000;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .share-tooltip.visible {
            opacity: 1;
            transform: translate(-50%, -140%); /* Sit above selection */
            pointer-events: auto;
        }
        
        .share-tooltip::after {
            content: '';
            position: absolute;
            bottom: -6px;
            left: 50%;
            transform: translateX(-50%);
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-top: 6px solid var(--text-main);
        }

        @media (max-width: 1100px) {
            .post-wrapper {
                 display: block; /* Stack */
            }
            article {
                 min-width: 100%;
            }
            .code-block-wrapper {
                border-radius: 0;
                border-left: 0;
                border-right: 0;
            }
        }

        /* Syntax Highlighting - Minimal */
        .hljs-keyword, .hljs-selector-tag, .hljs-title, .hljs-section, .hljs-doctag, .hljs-name, .hljs-strong {
            font-weight: 500;
            color: var(--text-main);
        }
        .hljs-comment { color: var(--text-tertiary); font-style: italic; }
        .hljs-string, .hljs-built_in, .hljs-literal, .hljs-type {
            color: var(--text-muted); 
        }

        /* --- READER TOOLS --- */
        .reader-progress {
            position: fixed;
            top: 0;
            left: 0;
            height: 3px;
            background: var(--text-main);
            width: 0%;
            z-index: 9999;
            transition: width 0.1s;
        }

        .reader-controls {
            position: fixed;
            bottom: 32px;
            right: 32px;
            display: flex;
            gap: 8px;
            z-index: 100;
            opacity: 0;
            transform: translateY(20px);
            animation: slideUp 0.6s var(--ease-out) 1s forwards;
        }

        .control-btn {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: var(--bg);
            border: 1px solid var(--border-color);
            color: var(--text-tertiary);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            transition: all 0.2s;
        }

        .control-btn:hover {
            transform: translateY(-2px);
            color: var(--text-main);
            border-color: var(--text-tertiary);
            box-shadow: 0 6px 16px rgba(0,0,0,0.08);
        }
        
        .control-btn.active {
            background: var(--text-main);
            color: var(--bg);
            border-color: var(--text-main);
        }

        @keyframes slideUp {
            to { opacity: 1; transform: translateY(0); }
        }

    </style>
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": "{{TITLE}}",
      "description": "{{DESCRIPTION}}",
      "author": {
        "@type": "Person",
        "name": "Maxwell Cofie",
        "url": "https://maxwellcofie.com"
      },
      "datePublished": "{{ISO_DATE}}",
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": "https://maxwellcofie.com/posts/{{SLUG}}/"
      }
    }
    </script>
</head>

<body>
    <div class="reader-progress" id="progressBar"></div>
    <div id="shareTooltip" class="share-tooltip">
        <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg> 
        Share
    </div>

    <nav>
        <a href="../../" class="logo">Maxwell Cofie</a>
        <div class="nav-links">
            <a href="../../work/" class="nav-link" data-i18n="nav.work">Work</a>
            <a href="../../ventures/" class="nav-link" data-i18n="nav.ventures">Ventures</a>
            <a href="../../writing/" class="nav-link" data-i18n="nav.writing">Logbook</a>
            <button class="theme-toggle" onclick="openSearch()" aria-label="Search" style="margin-right: 4px;">
                <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            </button>
            <button class="theme-toggle" id="themeBtn" aria-label="Toggle Theme">
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 0 24 24">
                    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-2a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" />
                </svg>
            </button>
            <div class="lang-switcher">
                <button class="lang-btn active" data-lang="en">EN</button>
                <button class="lang-btn" data-lang="fr">FR</button>
                <button class="lang-btn" data-lang="es">ES</button>
            </div>
        </div>
    </nav>
    
    <a href="../../writing/" class="back-link" data-i18n="nav.back_writing">← Logbook</a>
    
    <div class="post-wrapper">
        <aside class="toc-sidebar">
            {{TOC}}
        </aside>

        <article>
            <h1>{{TITLE}}</h1>
            <div class="post-meta-row">
                <span class="post-author">{{AUTHOR}}</span>
                <span class="post-date">{{DATE}}</span>
                <span class="reading-time">{{READ_TIME}} min read</span>
                {{CATEGORY_TAG}}
                
                <button class="like-btn-inline js-like-btn" aria-label="Like this post" data-slug="{{SLUG}}">
                    <svg viewBox="0 0 24 24">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                    <span class="like-count js-like-count">--</span>
                </button>
            </div>
    
            <div class="post-content" id="postContent">
                {{CONTENT}}
            </div>
    
            <div class="like-section">
                <!-- Reaction Bar (Micro-Feedback) -->
                <div class="reaction-bar">
                   <button class="like-btn js-like-btn" aria-label="Like this post" data-slug="{{SLUG}}">
                        <svg viewBox="0 0 24 24">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                        <span class="like-count js-like-count">--</span>
                    </button>
                    <!-- We can add more reactions here later -->
                </div>
            </div>
    
            <div class="post-footer">
                <div class="share-row">
                    <span class="share-label">Share this post</span>
                    <button class="share-btn" id="copyLinkBtn">
                        🔗 Copy Link
                    </button>
                    <a href="https://twitter.com/intent/tweet?text={{TITLE}}&url=https://maxwellcofie.com/posts/{{SLUG}}" target="_blank" class="share-btn">
                        Twitter
                    </a>
                    <a href="https://www.linkedin.com/sharing/share-offsite/?url=https://maxwellcofie.com/posts/{{SLUG}}" target="_blank" class="share-btn">
                        LinkedIn
                    </a>
                </div>
    
                <div class="subscribe-box">
                    <div class="sub-title">Enjoyed this reading?</div>
                    <div class="sub-desc">I write about product, design, and building in Africa. Subscribe to my Substack to get updates.</div>
                    <a href="https://open.substack.com/pub/mcofie" target="_blank" class="sub-btn">Subscribe on Substack</a>
                </div>
            </div>
            
            <div class="related-section">
                <div class="related-label">Read Next</div>
                <div class="related-grid">
                    {{RELATED_POSTS}}
                </div>
            </div>
        </article>
        
        <!-- Right column empty for balance or future use -->
        <div></div>
    </div>
    
    <!-- Reader Controls FAB -->
    <div class="reader-controls">
        <button class="control-btn" id="audioBtn" aria-label="Listen to Article">
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M12 6L8 10H4V14H8L12 18V6Z" /><path d="M15.5 8.5C16.5 9.5 16.5 14.5 15.5 15.5" /><path d="M18.5 5.5C20.5 7.5 20.5 16.5 18.5 18.5" /></svg>
        </button>
        <button class="control-btn" id="zenBtn" aria-label="Zen Mode" title="Zen Mode (J/K to scroll)">
             <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
        </button>
        <button class="control-btn" id="fontToggle" aria-label="Toggle Serif/Sans">
            <span style="font-family: 'Newsreader', serif; font-size: 18px;">A</span>
        </button>
        <button class="control-btn" id="topBtn" aria-label="Back to Top">
            ↑
        </button>
    </div>

    <footer>
        <a href="mailto:hello@maxwellcofie.com" class="footer-link" data-i18n="footer.email">Email</a>
        <a href="https://x.com/maxwellcofie" target="_blank" class="footer-link" data-i18n="footer.twitter">Twitter</a>
        <a href="https://linkedin.com/in/maxwell-cofie" target="_blank" class="footer-link" data-i18n="footer.linkedin">LinkedIn</a>
        <a href="https://github.com/mcofie" target="_blank" class="footer-link" data-i18n="footer.github">GitHub</a>
        <a href="../../dev/" class="footer-link" data-i18n="nav.dev">Dev</a>
        <span style="flex-grow: 1;"></span>
        <span class="footer-link" style="color: var(--text-tertiary); cursor: default;">&copy; 2025 Maxwell Cofie</span>
    </footer>
    <script src="../../locale.js"></script>

    <script src="../../locale.js"></script>
    <script src="../../app.js"></script>

    <script>
        // --- READER MODE ---
        // 1. Progress Bar
        window.addEventListener('scroll', () => {
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrolled = (window.scrollY / docHeight) * 100;
            document.getElementById('progressBar').style.width = scrolled + '%';
        });

        // 2. Font Toggle (Serif/Sans)
        const fontBtn = document.getElementById('fontToggle');
        const article = document.querySelector('article');
        
        // Load saved font preference
        const savedFont = localStorage.getItem('reader-font');
        if (savedFont) {
            article.setAttribute('data-font', savedFont);
            fontBtn.classList.toggle('active', savedFont === 'serif');
        }

        fontBtn.addEventListener('click', () => {
            const current = article.getAttribute('data-font');
            const newFont = current === 'serif' ? 'sans' : 'serif';
            article.setAttribute('data-font', newFont);
            localStorage.setItem('reader-font', newFont);
            fontBtn.classList.toggle('active');
        });

        // 3. Back to Top
        document.getElementById('topBtn').addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    </script>
</body>
</html>`;

console.log('--- Generating Posts ---');
posts.forEach(post => {
    // Find related posts (exclude self, prioritize same category)
    // Find related posts (exclude self, prioritize shared category)
    let related = posts.filter(p => {
        if (p.url === post.url) return false;
        return p.categories.some(c => post.categories.includes(c));
    });

    if (related.length < 2) {
        let others = posts.filter(p => p.url !== post.url && !related.includes(p));
        related = related.concat(others);
    }
    related = related.slice(0, 2);

    const relatedHTML = related.map(p => `
        <a href="../../posts/${p.url}" class="related-card">
            <span class="related-cat">${p.category || 'Writing'}</span>
            <div class="related-title">${p.title}</div>
            <div class="related-date">${p.date}</div>
        </a>
    `).join('');

    let html = HTML_TEMPLATE
        .replace(/{{TITLE}}/g, post.title)
        .replace(/{{AUTHOR}}/g, post.author || 'Maxwell Cofie')
        .replace(/{{DATE}}/g, post.date)
        .replace(/{{SLUG}}/g, post.url.replace('/index.html', ''))
        .replace(/{{ISO_DATE}}/g, new Date(post.isoDate).toISOString())
        .replace(/{{DESCRIPTION}}/g, post.description)
        .replace(/{{SLUG}}/g, post.slug)
        .replace(/{{READ_TIME}}/g, post.readTime)
        .replace(/{{CONTENT}}/g, post.htmlContent)
        .replace(/{{TOC}}/g, post.tocHTML)
        .replace(/{{CATEGORY_TAG}}/g, post.categories.map(cat =>
            `<span class="post-category ${cat.toLowerCase().replace(/\s+/g, '-')}">${cat}</span>`
        ).join(''))
        .replace(/{{RELATED_POSTS}}/g, relatedHTML);

    const postPath = path.join(OUTPUT_DIR, post.outputFile); // posts/slug/index.html
    const postDir = path.dirname(postPath);

    if (!fs.existsSync(postDir)) {
        fs.mkdirSync(postDir, { recursive: true });
    }

    fs.writeFileSync(postPath, html);
    console.log(`Generated: ${post.outputFile}`);
});


// 4. Update writing/index.html Index
const categories = [...new Set(posts.flatMap(p => p.categories))].sort();
const filterHTML = `
    <div class="filter-bar">
        <button class="filter-btn active" onclick="filterPosts(this, 'all')">All</button>
        ${categories.map(cat => `<button class="filter-btn" onclick="filterPosts(this, '${cat}')">${cat}</button>`).join('')}
    </div>
`;

const INDEX_HTML = `<!doctype html>
<html lang="en" data-theme="system">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Logbook | Maxwell Cofie</title>
    <meta name="description" content="Thoughts on technology, design, and building products in Africa.">
    <link rel="canonical" href="https://maxwellcofie.com/writing/">
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🇬🇭</text></svg>">
    <!-- View Transitions -->
    <meta name="view-transition" content="same-origin" />

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Mansalva&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../style.css">
    <style>
        /* FOUC fix for i18n */
        [data-i18n] { visibility: visible; }
    </style>
    <script>
        (function() {
            try {
                const savedTheme = localStorage.getItem('theme');
                const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                const theme = savedTheme ? savedTheme : (systemDark ? 'dark' : 'light');
                document.documentElement.setAttribute('data-theme', theme);
            } catch (e) {}
        })();
    </script>
    
    <style>
        .project-item { align-items: center; }
        
        .pagination-controls {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 16px;
            padding: 32px 0;
            margin-top: 24px;
        }
        .page-btn {
            padding: 8px 16px;
            border: 1px solid var(--border-color);
            background: var(--surface);
            color: var(--text-main);
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
        }
        .page-btn:hover:not(:disabled) {
            background: var(--border-color);
        }
        .page-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            color: var(--text-tertiary);
        }
        .page-info {
            font-size: 14px;
            color: var(--text-tertiary);
            font-feature-settings: "tnum";
            min-width: 80px;
            text-align: center;
        }
    </style>
</head>

<body>

    <nav>
        <a href="../" class="logo">Maxwell Cofie</a>
        <div class="nav-links">
            <a href="../work/" class="nav-link" data-i18n="nav.work">Work</a>
            <a href="../ventures/" class="nav-link" data-i18n="nav.ventures">Ventures</a>
            <a href="./" class="nav-link active" data-i18n="nav.writing">Logbook</a>
            <button class="theme-toggle" onclick="openSearch()" aria-label="Search" style="margin-right: 4px;">
                <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            </button>
            <button class="theme-toggle" id="themeBtn" aria-label="Toggle Theme">
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-2a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" />
                </svg>
            </button>
            <div class="lang-switcher">
                <button class="lang-btn active" data-lang="en">EN</button>
                <button class="lang-btn" data-lang="fr">FR</button>
                <button class="lang-btn" data-lang="es">ES</button>
            </div>
        </div>
    </nav>

    <div class="intro">
            <p data-i18n="writing.intro">Thoughts on technology, design, and building products.</p>
    </div>

    <div class="project-list-container">
        <div class="section-label" data-i18n="writing.articles">Articles</div>
        ${filterHTML}

        <div class="project-list">
            ${posts.map(post => `
            <a href="../posts/${post.url}" class="project-item" data-category="${post.categories.join(',')}">
                <div class="proj-left">
                    <div class="proj-header">
                        <span class="proj-title">${post.title}</span>
                        <span class="arrow">→</span>
                    </div>
                    <span class="proj-desc">${post.description}</span>
                </div>
                <div class="proj-meta">
                     ${post.categories.map(cat => `<span class="post-category ${cat.toLowerCase().replace(/\s+/g, '-')}">${cat}</span>`).join('')}
                     <span>${post.date}</span>
                </div>
            </a>
            `).join('')}
        </div>
        
        <!-- Pagination Controls -->
        <div class="pagination-controls" id="paginationControls" style="display:none;">
            <button class="page-btn" id="prevBtn" onclick="changePage(-1)">Previous</button>
            <span class="page-info" id="pageInfo">Page 1 of 1</span>
            <button class="page-btn" id="nextBtn" onclick="changePage(1)">Next</button>
        </div>
    </div>

    <footer>
        <a href="mailto:hello@maxwellcofie.com" class="footer-link" data-i18n="footer.email">Email</a>
        <a href="https://x.com/maxwellcofie" target="_blank" class="footer-link" data-i18n="footer.twitter">Twitter</a>
        <a href="https://linkedin.com/in/maxwell-cofie" target="_blank" class="footer-link" data-i18n="footer.linkedin">LinkedIn</a>
        <a href="https://github.com/mcofie" target="_blank" class="footer-link" data-i18n="footer.github">GitHub</a>
        <a href="../dev/" class="footer-link" data-i18n="nav.dev">Dev</a>
        <span style="flex-grow: 1;"></span>
        <span class="footer-link" style="color: var(--text-tertiary); cursor: default;">&copy; 2025 Maxwell Cofie</span>
    </footer>
    <script src="../locale.js"></script>
    <script src="../app.js"></script>
    <script>
        const itemsPerPage = 6;
        let currentPage = 1;
        let currentCategory = 'all';

        function render() {
            const allItems = Array.from(document.querySelectorAll('.project-list .project-item'));
            
            // 1. Filter
            const visibleItems = allItems.filter(item => {
                const itemCat = item.getAttribute('data-category');
                if (!itemCat) return false;
                return currentCategory === 'all' || itemCat.split(',').includes(currentCategory);
            });

            // 2. Paginate
            const totalPages = Math.ceil(visibleItems.length / itemsPerPage);
            // Ensure currentPage is valid
            if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;
            if (currentPage < 1) currentPage = 1;

            const start = (currentPage - 1) * itemsPerPage;
            const end = start + itemsPerPage;
            const itemsToShow = visibleItems.slice(start, end);

            // 3. Update DOM visibility
            allItems.forEach(item => item.style.display = 'none'); // Hide all first
            itemsToShow.forEach(item => item.style.display = ''); // Show page items (revert to CSS)

            // 4. Update Controls
            const paginationRow = document.getElementById('paginationControls');
            const prevBtn = document.getElementById('prevBtn');
            const nextBtn = document.getElementById('nextBtn');
            const pageInfo = document.getElementById('pageInfo');

            // Hide controls if no pagination needed (and we are on page 1)
            // But if we have 0 items, we might want to show "No items" or just nothing.
            if (visibleItems.length <= itemsPerPage && currentPage === 1) {
                paginationRow.style.display = 'none';
            } else {
                paginationRow.style.display = 'flex';
                
                prevBtn.disabled = currentPage === 1;
                nextBtn.disabled = currentPage === totalPages || totalPages === 0;
                pageInfo.textContent = \`Page \${currentPage} of \${totalPages || 1}\`;
            }
        }

        function filterPosts(btn, category) {
            // Update buttons
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            currentCategory = category;
            currentPage = 1; // Reset to page 1
            render();
        }

        function changePage(delta) {
            currentPage += delta;
            render();
            // Scroll to top of list
            const list = document.querySelector('.project-list-container');
            if(list) list.scrollIntoView({ behavior: 'smooth' });
        }

        // Initial Render
        document.addEventListener('DOMContentLoaded', () => {
            render();
        });
    </script>
</body>
</html>`;

fs.writeFileSync(WRITING_INDEX_PATH, INDEX_HTML);
console.log(`--- Updated ${WRITING_INDEX_PATH} ---`);

// 4.5 Update Homepage (index.html) with Latest Posts
const indexContent = fs.readFileSync(INDEX_PATH, 'utf8');
const latestPosts = posts.slice(0, 3); // Get top 3
const latestPostsHTML = `<!-- WRITING_LIST_START -->
        <div class="project-list">
            ${latestPosts.map(post => `
            <a href="posts/${post.url}" class="project-item" data-category="writing">
                <div class="proj-left">
                    <div class="proj-header">
                        <span class="proj-title">${post.title}</span>
                        <span class="arrow">→</span>
                    </div>
                    <span class="proj-desc">${post.description}</span>
                </div>
                <div class="proj-meta">
                    ${post.categories.map(cat => `<span class="post-category ${cat.toLowerCase().replace(/\s+/g, '-')}">${cat}</span>`).join('')}
                    <span>${post.date}</span>
                </div>
            </a>
            `).join('')}
             <!-- Fallback Substack Link (Optional) -->
             <a href="https://open.substack.com/pub/mcofie" target="_blank" class="project-item" data-category="writing">
                <div class="proj-left">
                    <div class="proj-header">
                        <span class="proj-title" style="color: var(--text-tertiary);" data-i18n="writing.archives">Archives (Substack)</span>
                        <span class="arrow">↗</span>
                    </div>
                </div>
                <div class="proj-meta"></div>
            </a>
        </div>
        <!-- WRITING_LIST_END -->`;

// Regex replacement to find the block
const updatedIndexContent = indexContent.replace(
    /<!-- WRITING_LIST_START -->[\s\S]*<!-- WRITING_LIST_END -->/,
    latestPostsHTML
);

fs.writeFileSync(INDEX_PATH, updatedIndexContent);
console.log('--- Updated index.html with latest posts ---');


// 5. Generate Search Index
const searchIndex = posts.map(post => ({
    title: post.title,
    description: post.description,
    category: post.categories[0],
    url: `/posts/${post.url}`,
    date: post.date
}));

fs.writeFileSync(path.join(__dirname, 'search.json'), JSON.stringify(searchIndex));
console.log('--- Generated search.json ---');

// 6. Generate RSS Feed
const RSS_TEMPLATE = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
 <title>Maxwell Cofie</title>
 <description>Thoughts on technology, design, and building products in Africa.</description>
 <link>https://maxwellcofie.com</link>
 <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
 <pubDate>${new Date().toUTCString()}</pubDate>
 <ttl>1800</ttl>

 ${posts.map(post => `
  <item>
   <title>${post.title}</title>
   <description>${post.description}</description>
   <link>https://maxwellcofie.com/posts/${post.url}</link>
   <guid>https://maxwellcofie.com/posts/${post.url}</guid>
   <pubDate>${new Date(post.isoDate).toUTCString()}</pubDate>
  </item>
 `).join('')}

</channel>
</rss>`;

fs.writeFileSync(path.join(__dirname, 'rss.xml'), RSS_TEMPLATE);
console.log('--- Generated rss.xml ---');

// 7. Generate Sitemap
const SITEMAP_TEMPLATE = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://maxwellcofie.com/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://maxwellcofie.com/about/</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://maxwellcofie.com/work/</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://maxwellcofie.com/ventures/</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://maxwellcofie.com/writing/</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
      <loc>https://maxwellcofie.com/dev/</loc>
      <changefreq>monthly</changefreq>
      <priority>0.5</priority>
  </url>
  ${posts.map(post => `
  <url>
    <loc>https://maxwellcofie.com/posts/${post.url}</loc>
    <lastmod>${new Date(post.isoDate).toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`).join('')}
</urlset>`;

fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), SITEMAP_TEMPLATE);
console.log('--- Generated sitemap.xml ---');

console.log('Build Complete! 🚀');
