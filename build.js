const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { marked } = require('marked');
const fm = require('front-matter');
const hljs = require('highlight.js');
const { pages, renderMetadata, updatePageMetadata } = require('./lib/metadata');
const { cloudinaryUrl, readImageSizes } = require('./lib/images');
const { loadBrandKit, applyBrandKitStrings } = require('./lib/brand-kit');
const { parseLogEntry, decorateLogItems, hostOf } = require('./lib/log');
const { renderLogCover } = require('./lib/log-covers');

// Configuration
const CONTENT_DIR = path.join(__dirname, 'content/posts');
const OUTPUT_DIR = path.join(__dirname, 'posts');
const INDEX_PATH = path.join(__dirname, 'index.html');
const WRITING_DIR = path.join(__dirname, 'writing');
const WRITING_INDEX_PATH = path.join(WRITING_DIR, 'index.html');
const LOG_CONTENT_DIR = path.join(__dirname, 'content/log');
const LOG_OUTPUT_DIR = path.join(__dirname, 'log');

function writeGeneratedFile(filePath, contents) {
    const tempPath = `${filePath}.tmp`;
    fs.writeFileSync(tempPath, contents);
    fs.renameSync(tempPath, filePath);
}

function renderSiteNav(root, activePage = '') {
    const link = (page, href, key, label) => `<a href="${root}${href}" class="nav-link${activePage === page ? ' active' : ''}" data-i18n="${key}">${label}</a>`;
    return `<nav>
        <a href="${root}" class="logo">Maxwell Cofie</a>
        <div class="nav-links">
            ${link('work', 'work/', 'nav.work', 'Work')}
            ${link('ventures', 'ventures/', 'nav.ventures', 'Ventures')}
            ${link('writing', 'writing/', 'nav.writing', 'Logbook')}
            <button class="theme-toggle" onclick="openSearch()" aria-label="Search" style="margin-right: 4px;">
                <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            </button>
            <button class="theme-toggle" id="themeBtn" aria-label="Toggle Theme">
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-2a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" /></svg>
            </button>
            <div class="lang-switcher">
                <button class="lang-btn active" data-lang="en" aria-pressed="true">EN</button>
                <button class="lang-btn" data-lang="fr" aria-pressed="false">FR</button>
                <button class="lang-btn" data-lang="es" aria-pressed="false">ES</button>
            </div>
        </div>
    </nav>`;
}

function renderSiteFooter(root) {
    return `<footer>
        <a href="mailto:hello@maxwellcofie.com" class="footer-link" data-i18n="footer.email">Email</a>
        <a href="https://x.com/maxwellcofie" target="_blank" rel="noopener noreferrer" class="footer-link" data-i18n="footer.twitter">Twitter</a>
        <a href="https://linkedin.com/in/maxwell-cofie" target="_blank" rel="noopener noreferrer" class="footer-link" data-i18n="footer.linkedin">LinkedIn</a>
        <a href="https://thekompound.substack.com" target="_blank" rel="noopener noreferrer" class="footer-link" data-i18n="footer.substack">Substack</a>
        <a href="https://www.youtube.com/@maxwellcofie" target="_blank" rel="noopener noreferrer" class="footer-link" data-i18n="footer.youtube">YouTube</a>
        <a href="${root}brand-kit/" class="footer-link" data-i18n="footer.brand_kit">Brand Kit</a>
        <span style="flex-grow: 1;"></span>
        <span class="footer-link" style="color: var(--text-tertiary); cursor: default;">&copy; ${new Date().getFullYear()} Maxwell Cofie</span>
    </footer>`;
}

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));
const escapeXml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'
}[char]));

const slugifyHeading = value => value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}_-]+/gu, '-')
    .replace(/^-+|-+$/g, '') || 'section';

function assignHeadingIds(tokens) {
    const counts = new Map();
    return tokens.map(token => {
        if (token.type !== 'heading') return token;
        const base = slugifyHeading(token.text);
        const count = (counts.get(base) || 0) + 1;
        counts.set(base, count);
        return { ...token, headingId: count === 1 ? base : `${base}-${count}` };
    });
}

// Ensure output dirs exist
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}
if (!fs.existsSync(WRITING_DIR)) {
    fs.mkdirSync(WRITING_DIR, { recursive: true });
}

// 1. Configure Marked with Highlight.js and Custom Renderer
const renderer = new marked.Renderer();
let headingIds = [];

// Override image renderer to support video embeds
renderer.image = ({ href, title, text }) => {
    const safeHref = escapeHtml(href);
    const safeTitle = escapeHtml(title || '');
    const safeAlt = escapeHtml(text || '');
    if (href && /\.(webm|mp4|mov)(?:[?#].*)?$/i.test(href)) {
        return `
        <video controls playsinline preload="metadata" class="post-video">
            <source src="${safeHref}">
            Your browser does not support the video tag.
        </video>`;
    }
    return `<img src="${safeHref}" alt="${safeAlt}" title="${safeTitle}" class="post-img" loading="lazy" decoding="async">`;
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

// Serve post images at the size they're shown, with dimensions so the page doesn't
// jump as they load. Only the first image loads eagerly; it's often the largest thing in view.
const imageSizes = readImageSizes();

function optimizeImages(html) {
    let imageIndex = 0;
    return html.replace(/<img\b[^>]*>/g, tag => {
        const isFirst = imageIndex++ === 0;
        const src = tag.match(/\ssrc="([^"]+)"/)?.[1];
        const decodedSrc = src && src.replace(/&amp;/g, '&');
        const small = decodedSrc && cloudinaryUrl(decodedSrc, 640);
        let result = tag;
        if (small && !/\ssrcset=/.test(tag)) {
            const medium = cloudinaryUrl(decodedSrc, 960);
            const large = cloudinaryUrl(decodedSrc, 1280);
            const size = imageSizes[decodedSrc];
            const dimensions = size && !/\swidth=/.test(tag) ? ` width="${size.width}" height="${size.height}"` : '';
            result = result.replace(` src="${src}"`,
                ` src="${escapeHtml(large)}" srcset="${escapeHtml(small)} 640w, ${escapeHtml(medium)} 960w, ${escapeHtml(large)} 1280w" sizes="(max-width: 640px) 100vw, 640px"${dimensions}`);
        }
        if (isFirst) {
            result = result.replace(/\sloading="lazy"/, '').replace(/^<img\b/, '<img fetchpriority="high"');
        } else if (!/\sloading=/.test(result)) {
            result = result.replace(/^<img\b/, '<img loading="lazy"');
        }
        if (!/\sdecoding=/.test(result)) result = result.replace(/^<img\b/, '<img decoding="async"');
        return result;
    });
}

function renderToc(headings) {
    if (!headings.length) return '';
    return `
        <div class="toc">
            <div class="toc-label">Table of Contents</div>
            <ul>
                ${headings.map(h => `<li class="toc-level-${h.depth}"><a href="#${escapeHtml(h.headingId)}">${marked.parseInline(h.text)}</a></li>`).join('')}
            </ul>
        </div>`;
}

// 2. Read All Posts
const posts = [];
const files = fs.readdirSync(CONTENT_DIR);

files.forEach(file => {
    if (path.extname(file) !== '.md') return;

    const content = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8');
    const { attributes, body } = fm(content);

    const requiredFields = ['title', 'description', 'date', 'isoDate'];
    const missing = requiredFields.filter(field => !String(attributes[field] ?? '').trim());
    if (missing.length) {
        throw new Error(`${file}: missing required front matter field${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}`);
    }
    const parsedDate = new Date(`${attributes.isoDate}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(attributes.isoDate) || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== attributes.isoDate) {
        throw new Error(`${file}: isoDate must be a valid YYYY-MM-DD date`);
    }

    const { tokens, html: htmlContent } = renderMarkdown(body);
    const headings = tokens.filter(t => t.type === 'heading' && (t.depth === 2 || t.depth === 3));

    const tocHTML = renderToc(headings);

    const slug = path.basename(file, '.md');
    const wordCount = body.split(/\s+/).length;
    const readTime = Math.ceil(wordCount / 200);

    // Normalize categories
    let categories = [];
    if (attributes.categories) {
        categories = Array.isArray(attributes.categories) ? attributes.categories : [attributes.categories];
    } else if (attributes.category) {
        if (typeof attributes.category === 'string' && attributes.category.includes(',')) {
            categories = attributes.category.split(',').map(c => c.trim());
        } else {
            categories = [attributes.category];
        }
    }
    categories = categories
        .filter(Boolean)
        .map(c => c.trim())
        .map(c => c.charAt(0).toUpperCase() + c.slice(1));

    posts.push({
        ...attributes,
        categories,
        slug,
        htmlContent,
        readTime,
        tocHTML,
        outputFile: `${slug}/index.html`,
        url: `${slug}/`
    });
});

// Need to update renderer for Headings to have IDs for TOC
renderer.heading = ({ text, depth }) => {
    const id = headingIds.shift() || slugifyHeading(text);
    return `<h${depth} id="${escapeHtml(id)}">${text}</h${depth}>`;
};

function renderMarkdown(body) {
    const tokens = assignHeadingIds(marked.lexer(body));
    headingIds = tokens.filter(token => token.type === 'heading').map(token => token.headingId);
    return { tokens, html: optimizeImages(marked.parser(tokens)) };
}

// Sort posts by date (newest first)
posts.sort((a, b) => new Date(b.isoDate) - new Date(a.isoDate));

// 3. Generate HTML Files for each post
const HTML_TEMPLATE = `<!doctype html>
<!-- GENERATED BY build.js FROM content/posts/*.md. DO NOT EDIT THIS FILE DIRECTLY. -->
<html lang="en" data-theme="system" itemscope itemtype="https://schema.org/BlogPosting">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    {{METADATA}}
    <link rel="icon" type="image/png" sizes="32x32" href="../../favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="../../favicon-16x16.png">
    <link rel="apple-touch-icon" sizes="180x180" href="../../apple-touch-icon.png">
    <link rel="shortcut icon" href="../../favicon.ico">
    <!-- View Transitions -->
    <meta name="view-transition" content="same-origin" />

    <link rel="preload" href="../../assets/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="../../assets/fonts/mansalva-latin.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="../../assets/fonts/newsreader-latin.woff2" as="font" type="font/woff2" crossorigin>
    {{IMAGE_PRECONNECT}}
    
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

        /* POST LAYOUT */
        .post-wrapper {
            position: relative;
            width: 100%;
        }

        /* TOC SIDEBAR */
        .toc-sidebar {
            display: none;
        }
        
        @media (min-width: 1200px) {
            .toc-sidebar {
                display: block;
                position: absolute;
                right: calc(100% + 40px);
                top: 0;
                width: 180px;
                font-size: 13px;
                max-height: calc(100vh - 80px);
                overflow-y: auto;
            }
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
            width: 100%;
            max-width: 100%;
            min-width: 0; /* flex/grid fix */
            view-transition-name: article-content;
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
            padding: 4px 0 4px 24px;
            font-family: 'Newsreader', serif;
            font-style: normal;
            font-size: 1.15em;
            line-height: 1.6;
            margin: 36px 0;
            color: var(--text-main);
        }

        .post-content blockquote p {
            margin-bottom: 16px;
        }

        .post-content blockquote p:last-child {
            margin-bottom: 0;
        }

        .post-content blockquote strong {
            font-weight: 600;
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

        @media (max-width: 600px) {
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

        /* Signature: the SVG is used as a mask so it takes the text colour in light and dark mode */
        .post-signature {
            margin-top: 56px;
            padding-top: 32px;
            border-top: 1px solid var(--border-color);
        }

        .signature-mark {
            display: block;
            width: 120px;
            aspect-ratio: 792 / 776;
            margin-left: -6px; /* the loop's left edge sits flush with the text */
            background-color: var(--text-main);
            -webkit-mask: url("../../assets/images/signature.svg") center / contain no-repeat;
            mask: url("../../assets/images/signature.svg") center / contain no-repeat;
        }

        /* Signed left to right when it scrolls into view (set up by the reader script) */
        .post-signature.is-waiting .signature-mark {
            clip-path: inset(0 100% 0 0);
        }

        .post-signature.is-signed .signature-mark {
            clip-path: inset(0 0 0 0);
            transition: clip-path 1.6s cubic-bezier(0.65, 0, 0.35, 1);
        }

        .signature-name {
            display: block;
            margin-top: 2px;
            font-size: 14px;
            font-weight: 500;
            color: var(--text-muted);
            transition: opacity 0.6s ease 1.1s;
        }

        .post-signature.is-waiting .signature-name {
            opacity: 0;
        }

        .post-signature.is-signed .signature-name {
            opacity: 1;
        }

    </style>
    {{EXTRA_STYLE}}
</head>

<body>
    <div class="reader-progress" id="progressBar"></div>
    <div id="shareTooltip" class="share-tooltip">
        <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg> 
        Share
    </div>

    ${renderSiteNav('../../')}
    
    <a href="{{BACK_HREF}}" class="back-link" data-i18n="nav.back_writing">← Logbook</a>
    
    <div class="post-wrapper">
        <aside class="toc-sidebar">
            {{TOC}}
        </aside>

        <article>
            {{COVER}}
            <h1>{{TITLE}}</h1>
            <div class="post-meta-row">
                <span class="post-author">{{AUTHOR}}</span>
                <span class="post-date">{{DATE}}</span>
                <span class="reading-time">{{READ_LABEL}}</span>
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

            <div class="post-signature">
                <span class="signature-mark" role="img" aria-label="Signature of Maxwell Cofie"></span>
                <span class="signature-name">Maxwell Cofie</span>
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
                    <a href="https://twitter.com/intent/tweet?text={{TITLE}}&url={{SHARE_URL}}" target="_blank" rel="noopener noreferrer" class="share-btn">
                        Twitter
                    </a>
                    <a href="https://www.linkedin.com/sharing/share-offsite/?url={{SHARE_URL}}" target="_blank" rel="noopener noreferrer" class="share-btn">
                        LinkedIn
                    </a>
                </div>
    
                <div class="subscribe-box">
                    <div class="sub-title">Enjoyed this reading?</div>
                    <div class="sub-desc">I write about product, design, and building in Africa. Subscribe to my Substack to get updates.</div>
                    <a href="https://open.substack.com/pub/mcofie" target="_blank" rel="noopener noreferrer" class="sub-btn">Subscribe on Substack</a>
                </div>
            </div>
            
            <div class="related-section">
                <div class="related-label">{{RELATED_LABEL}}</div>
                <div class="related-grid">
                    {{RELATED_POSTS}}
                </div>
            </div>
        </article>
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

    ${renderSiteFooter('../../')}
    <script src="../../locale.js" defer></script>
    <script src="../../app.js" defer></script>

    <script>
        // --- SIGNATURE ---
        // Hidden until it scrolls into view, then signed left to right. Stays visible without JS
        // or with reduced motion.
        const signature = document.querySelector('.post-signature');
        if (signature && 'IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            signature.classList.add('is-waiting');
            new IntersectionObserver((entries, observer) => {
                if (!entries[0].isIntersecting) return;
                signature.classList.add('is-signed');
                observer.disconnect();
            }, { threshold: 0.6 }).observe(signature);
        }

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
        .replace(/{{READ_LABEL}}/g, `${post.readTime} min read`)
        .replace(/{{BACK_HREF}}/g, '../../writing/')
        .replace(/{{SHARE_URL}}/g, `https://maxwellcofie.com/posts/${post.slug}/`)
        .replace(/{{RELATED_LABEL}}/g, 'Read Next')
        .replace('{{EXTRA_STYLE}}', '')
        .replace('{{COVER}}', '')
        .replace(/{{CONTENT}}/g, post.htmlContent)
        .replace('{{IMAGE_PRECONNECT}}', () => post.htmlContent.includes('https://res.cloudinary.com/')
            ? '<link rel="preconnect" href="https://res.cloudinary.com">' : '')
        .replace(/{{TOC}}/g, post.tocHTML)
        .replace(/{{CATEGORY_TAG}}/g, post.categories.map(cat =>
            `<span class="post-category ${cat.toLowerCase().replace(/\s+/g, '-')}">${cat}</span>`
        ).join(''))
        .replace(/{{RELATED_POSTS}}/g, relatedHTML)
        .replace('{{METADATA}}', () => renderMetadata({
            title: `${post.title} | Maxwell Cofie`,
            description: post.description,
            path: `/posts/${encodeURIComponent(post.slug)}/`,
            image: post.image,
            imageAlt: post.imageAlt,
            article: {
                title: post.title,
                author: post.author,
                published: new Date(post.isoDate).toISOString(),
                categories: post.categories,
            },
        }));

    const postPath = path.join(OUTPUT_DIR, post.outputFile); // posts/slug/index.html
    const postDir = path.dirname(postPath);

    if (!fs.existsSync(postDir)) {
        fs.mkdirSync(postDir, { recursive: true });
    }

    writeGeneratedFile(postPath, html);
    console.log(`Generated: ${post.outputFile}`);
});

// Remove only stale generated post HTML. Other files in post folders are preserved.
const currentPostFiles = new Set(posts.map(post => path.resolve(OUTPUT_DIR, post.outputFile)));
for (const entry of fs.readdirSync(OUTPUT_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const stalePath = path.join(OUTPUT_DIR, entry.name, 'index.html');
    if (!fs.existsSync(stalePath) || currentPostFiles.has(path.resolve(stalePath))) continue;
    const existingHtml = fs.readFileSync(stalePath, 'utf8');
    if (existingHtml.startsWith('<!doctype html>\n<!-- GENERATED BY build.js FROM content/posts/*.md. DO NOT EDIT THIS FILE DIRECTLY. -->')) {
        fs.unlinkSync(stalePath);
    }
}


// 3.5 Monthly Log: what I read, watched and listened to, one page per month at /log/YYYY-MM/.
// Uses the post template, with each link shown with its site and my note underneath.
const LOG_STYLE = `<style>
        .log-cover {
            margin: 0 0 40px;
            border-radius: 16px;
            overflow: hidden;
            aspect-ratio: 5 / 2;
            background: var(--surface);
        }
        .log-cover svg,
        .log-cover img {
            display: block;
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .log-brief {
            font-size: 1.1em;
            color: var(--text-main);
            margin-bottom: 40px;
        }
        .log-brief p { margin-bottom: 16px; }
        .log-pick {
            margin: 0 0 16px;
            padding: 24px;
            border: 1px solid var(--border-color);
            border-radius: 12px;
            background: var(--surface);
        }
        .log-pick-label {
            display: block;
            margin-bottom: 10px;
            font-family: 'Inter', sans-serif;
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: var(--text-tertiary);
        }
        .post-content .log-pick-title {
            font-size: 1.2em;
            font-weight: 500;
            text-decoration: none;
        }
        .log-pick .log-source { margin-left: 10px; }
        .log-pick p { margin: 10px 0 0; }
        .post-content ul.log-list {
            list-style: none;
            padding-left: 0;
        }
        .post-content .log-item {
            display: flex;
            flex-wrap: wrap;
            align-items: baseline;
            gap: 4px 10px;
            margin: 0;
            padding: 14px 0;
            border-bottom: 1px solid var(--border-color);
        }
        .post-content .log-item:last-child { border-bottom: 0; }
        .post-content .log-link { font-weight: 500; }
        .log-source {
            font-family: 'Inter', sans-serif;
            font-size: 12px;
            color: var(--text-tertiary);
        }
        .log-note {
            flex-basis: 100%;
            font-size: 0.92em;
        }
    </style>`;

if (!fs.existsSync(LOG_OUTPUT_DIR)) {
    fs.mkdirSync(LOG_OUTPUT_DIR, { recursive: true });
}
const logEntries = (fs.existsSync(LOG_CONTENT_DIR) ? fs.readdirSync(LOG_CONTENT_DIR) : [])
    .filter(file => path.extname(file) === '.md')
    .map(file => parseLogEntry(file, fs.readFileSync(path.join(LOG_CONTENT_DIR, file), 'utf8')))
    .filter(Boolean)
    .sort((a, b) => b.month.localeCompare(a.month));

const LOG_CATEGORY = 'Monthly Log';
const LOG_GENERATED_HEADER = '<!doctype html>\n<!-- GENERATED BY build.js FROM content/log/*.md. DO NOT EDIT THIS FILE DIRECTLY. -->';

// The month's header: a photo if the entry names one, otherwise its illustration.
function renderLogCoverHTML(entry) {
    if (entry.cover) {
        return `<img src="${escapeHtml(entry.cover)}" alt="${escapeHtml(entry.coverAlt)}">`;
    }
    return renderLogCover(entry.month, { caption: entry.coverCaption, style: entry.coverStyle });
}

function renderLogPick(pick) {
    if (!pick) return '';
    const host = hostOf(pick.url);
    const label = ['Pick of the month', pick.type].filter(Boolean).map(escapeHtml).join(' · ');
    return `<aside class="log-pick">
                <span class="log-pick-label">${label}</span>
                <a href="${escapeHtml(pick.url)}" class="log-pick-title" target="_blank" rel="noopener noreferrer">${escapeHtml(pick.title)}</a>${host ? `<span class="log-source">${escapeHtml(host)}</span>` : ''}
                ${pick.note ? `<p>${marked.parseInline(String(pick.note))}</p>` : ''}
            </aside>`;
}

logEntries.forEach((entry, index) => {
    const { tokens, html: bodyHTML } = renderMarkdown(entry.body);
    const headings = tokens.filter(t => t.type === 'heading' && (t.depth === 2 || t.depth === 3));
    const contentHTML = `<div class="log-brief">${marked.parse(entry.brief)}</div>
            ${renderLogPick(entry.pick)}
            ${decorateLogItems(bodyHTML)}`;

    // Read next: the months either side, then the latest essays if there aren't two.
    const neighbours = [logEntries[index - 1], logEntries[index + 1]].filter(Boolean)
        .map(e => ({ href: `../../log/${e.url}`, label: LOG_CATEGORY, title: e.monthName, date: e.date }));
    const essays = posts.map(p => ({ href: `../../posts/${p.url}`, label: p.categories[0] || 'Writing', title: p.title, date: p.date }));
    const relatedHTML = [...neighbours, ...essays].slice(0, 2).map(card => `
        <a href="${card.href}" class="related-card">
            <span class="related-cat">${escapeHtml(card.label)}</span>
            <div class="related-title">${escapeHtml(card.title)}</div>
            <div class="related-date">${card.date}</div>
        </a>
    `).join('');

    const values = {
        TITLE: escapeHtml(entry.title),
        AUTHOR: 'Maxwell Cofie',
        DATE: entry.date,
        SLUG: `log-${entry.slug}`,
        READ_LABEL: `${entry.itemCount} ${entry.itemCount === 1 ? 'pick' : 'picks'}`,
        BACK_HREF: '../../writing/?tab=log',
        SHARE_URL: `https://maxwellcofie.com/log/${entry.url}`,
        RELATED_LABEL: 'Read Next',
        EXTRA_STYLE: LOG_STYLE,
        COVER: `<figure class="log-cover">${optimizeImages(renderLogCoverHTML(entry))}</figure>`,
        CONTENT: contentHTML,
        IMAGE_PRECONNECT: contentHTML.includes('https://res.cloudinary.com/') ? '<link rel="preconnect" href="https://res.cloudinary.com">' : '',
        TOC: renderToc(headings),
        CATEGORY_TAG: `<span class="post-category monthly-log">${LOG_CATEGORY}</span>`,
        RELATED_POSTS: relatedHTML,
        METADATA: renderMetadata({
            title: `${entry.title} | Maxwell Cofie`,
            description: entry.description,
            path: `/log/${entry.url}`,
            article: {
                title: entry.title,
                published: new Date(`${entry.isoDate}T00:00:00Z`).toISOString(),
                categories: [LOG_CATEGORY],
            },
        }),
    };
    // One pass, so nothing in the content is mistaken for a placeholder.
    const html = HTML_TEMPLATE
        .replace('<!-- GENERATED BY build.js FROM content/posts/*.md. DO NOT EDIT THIS FILE DIRECTLY. -->',
            '<!-- GENERATED BY build.js FROM content/log/*.md. DO NOT EDIT THIS FILE DIRECTLY. -->')
        .replace(/{{([A-Z_]+)}}/g, (match, key) => (key in values ? String(values[key]) : match));

    const logPath = path.join(LOG_OUTPUT_DIR, entry.outputFile);
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    writeGeneratedFile(logPath, html);
    console.log(`Generated: log/${entry.outputFile}`);
});

// Remove pages for log entries that were deleted or turned back into drafts.
const currentLogFiles = new Set(logEntries.map(entry => path.resolve(LOG_OUTPUT_DIR, entry.outputFile)));
for (const entry of fs.readdirSync(LOG_OUTPUT_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const stalePath = path.join(LOG_OUTPUT_DIR, entry.name, 'index.html');
    if (!fs.existsSync(stalePath) || currentLogFiles.has(path.resolve(stalePath))) continue;
    if (fs.readFileSync(stalePath, 'utf8').startsWith(LOG_GENERATED_HEADER)) {
        fs.unlinkSync(stalePath);
        if (!fs.readdirSync(path.join(LOG_OUTPUT_DIR, entry.name)).length) fs.rmdirSync(path.join(LOG_OUTPUT_DIR, entry.name));
    }
}

// 4. Update writing/index.html Index
const categories = [...new Set(posts.flatMap(p => p.categories))].sort();
const filterHTML = `
    <div class="filter-bar" role="group" aria-label="Filter articles by category">
        <button class="filter-btn active" aria-pressed="true" onclick="filterPosts(this, 'all')">All</button>
        ${categories.map(cat => `<button class="filter-btn" aria-pressed="false" onclick="filterPosts(this, ${escapeHtml(JSON.stringify(cat))})">${escapeHtml(cat)}</button>`).join('')}
    </div>
`;

// Essays and the Monthly Log share the Logbook page as two tabs (the tabs appear once there's a log entry).
const hasLog = logEntries.length > 0;
const logbookTabsHTML = hasLog ? `
        <div class="logbook-tabs" role="tablist" aria-label="Logbook">
            <button class="logbook-tab" role="tab" id="tab-essays" data-tab="essays" aria-selected="true" aria-controls="essaysPanel" data-i18n="writing.tab_essays">Essays</button>
            <button class="logbook-tab" role="tab" id="tab-log" data-tab="log" aria-selected="false" aria-controls="logPanel" tabindex="-1" data-i18n="writing.tab_log">Monthly Log</button>
        </div>` : '';
const logPanelHTML = hasLog ? `
        <div id="logPanel" role="tabpanel" aria-labelledby="tab-log" hidden>
            <p class="log-panel-intro" data-i18n="writing.log_intro">What I read, watched and listened to, wrapped up at the end of every month.</p>
            ${[...new Set(logEntries.map(entry => entry.month.slice(0, 4)))].map(year => `
            <div class="section-label log-year">${year}</div>
            <div class="project-list">
                ${logEntries.filter(entry => entry.month.startsWith(year)).map(entry => `
                <a href="../log/${entry.url}" class="project-item log-entry-item">
                    <div class="log-thumb" aria-hidden="true">${entry.cover
        ? `<img src="${escapeHtml(entry.cover)}" alt="" loading="lazy">`
        : renderLogCover(entry.month, { caption: '', style: entry.coverStyle })}</div>
                    <div class="proj-left">
                        <div class="proj-header">
                            <span class="proj-title">${escapeHtml(entry.monthName)}</span>
                            <span class="arrow">→</span>
                        </div>
                        <span class="proj-desc">${escapeHtml(entry.description)}</span>
                    </div>
                    <div class="proj-meta">
                        <span>${entry.itemCount} ${entry.itemCount === 1 ? 'pick' : 'picks'}</span>
                    </div>
                </a>`).join('')}
            </div>`).join('')}
        </div>` : '';

const INDEX_HTML = `<!doctype html>
<html lang="en" data-theme="system">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    ${renderMetadata(pages['writing/index.html'])}
    <link rel="icon" type="image/png" sizes="32x32" href="../favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="../favicon-16x16.png">
    <link rel="apple-touch-icon" sizes="180x180" href="../apple-touch-icon.png">
    <link rel="shortcut icon" href="../favicon.ico">
    <!-- View Transitions -->
    <meta name="view-transition" content="same-origin" />

    <link rel="preload" href="../assets/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="../assets/fonts/mansalva-latin.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="stylesheet" href="../style.css?v=8">
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
            gap: 24px;
            padding: 48px 0;
            margin-top: 40px;
            border-top: 1px dotted var(--border-color);
        }
        .page-btn {
            background: transparent;
            border: none;
            color: var(--text-tertiary);
            cursor: pointer;
            font-size: 20px;
            padding: 0;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 44px; 
            height: 44px;
            border-radius: 50%;
        }
        .page-btn:hover:not(:disabled) {
            color: var(--text-main);
            background: var(--surface);
            transform: scale(1.1);
        }
        .page-btn:disabled {
            opacity: 0.2;
            cursor: default;
        }
        .logbook-tabs {
            display: flex;
            gap: 24px;
            margin-bottom: 32px;
            border-bottom: 1px solid var(--border-color);
        }
        .logbook-tab {
            margin-bottom: -1px;
            padding: 10px 0;
            background: none;
            border: 0;
            border-bottom: 2px solid transparent;
            font: inherit;
            font-size: 14px;
            font-weight: 500;
            color: var(--text-tertiary);
            cursor: pointer;
            transition: color 0.2s, border-color 0.2s;
        }
        .logbook-tab:hover { color: var(--text-main); }
        .logbook-tab[aria-selected="true"] {
            color: var(--text-main);
            border-bottom-color: var(--text-main);
        }
        .project-item.log-entry-item {
            grid-template-columns: 160px 1fr auto;
            gap: 20px;
            align-items: center;
        }
        .log-thumb {
            aspect-ratio: 5 / 2;
            border-radius: 8px;
            overflow: hidden;
        }
        .log-thumb svg,
        .log-thumb img {
            display: block;
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        @media (max-width: 480px) {
            .log-thumb { margin-bottom: 14px; }
        }
        .log-year { margin-top: 8px; }
        .log-panel-intro {
            margin-bottom: 24px;
            font-size: 14px;
            color: var(--text-muted);
        }
        .page-info {
            font-size: 13px;
            font-weight: 500;
            color: var(--text-tertiary);
            font-feature-settings: "tnum";
            letter-spacing: 0.1em;
            user-select: none;
        }
    </style>
</head>

<body>

    ${renderSiteNav('../', 'writing')}

    <div class="intro">
            <p data-i18n="writing.intro">Thoughts on technology, design, and building products.</p>
    </div>

    <div class="project-list-container">
        ${logbookTabsHTML}
        <div id="essaysPanel"${hasLog ? ' role="tabpanel" aria-labelledby="tab-essays"' : ''}>
        ${hasLog ? '' : '<div class="section-label" data-i18n="writing.articles">Articles</div>'}
        ${filterHTML}

        <div class="project-list" id="projectList">
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
        
        <!-- Empty State -->
        <div id="emptyState" style="display:none; text-align:center; padding: 60px 0; color: var(--text-tertiary);">
            <div style="font-size: 14px; margin-bottom: 8px;">No articles found</div>
            <div style="font-size: 13px; opacity: 0.7;">Try selecting a different category</div>
        </div>
        
        <!-- Pagination Controls -->
        <div class="pagination-controls" id="paginationControls" style="display:none;">
            <button class="page-btn" id="prevBtn" onclick="changePage(-1)" aria-label="Previous Page">←</button>
            <span class="page-info" id="pageInfo">1 / 1</span>
            <button class="page-btn" id="nextBtn" onclick="changePage(1)" aria-label="Next Page">→</button>
        </div>
        </div>
        ${logPanelHTML}
    </div>

    ${renderSiteFooter('../')}
    <script src="../locale.js" defer></script>
    <script src="../app.js" defer></script>
    <script>
        const itemsPerPage = 6;
        let currentPage = 1;
        let currentCategory = 'all';

        // Initialize from URL
        const params = new URLSearchParams(window.location.search);
        if (params.has('category')) currentCategory = params.get('category');
        if (params.has('page')) currentPage = parseInt(params.get('page')) || 1;
        let currentTab = params.get('tab') === 'log' ? 'log' : 'essays';

        // Essays / Monthly Log tabs
        const tabButtons = Array.from(document.querySelectorAll('.logbook-tab'));
        function showTab(tab) {
            if (!tabButtons.length) return;
            currentTab = tab;
            tabButtons.forEach(button => {
                const selected = button.dataset.tab === tab;
                button.setAttribute('aria-selected', String(selected));
                button.tabIndex = selected ? 0 : -1;
            });
            document.getElementById('essaysPanel').hidden = tab !== 'essays';
            document.getElementById('logPanel').hidden = tab !== 'log';
        }
        tabButtons.forEach((button, index) => {
            button.addEventListener('click', () => {
                if (button.dataset.tab === currentTab) return;
                showTab(button.dataset.tab);
                const url = new URL(window.location);
                ['category', 'page', 'tab'].forEach(key => url.searchParams.delete(key));
                if (currentTab === 'log') url.searchParams.set('tab', 'log');
                currentCategory = 'all';
                currentPage = 1;
                window.history.pushState({}, '', url);
                syncFilterUI();
                performRender();
            });
            button.addEventListener('keydown', event => {
                if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
                const next = tabButtons[(index + (event.key === 'ArrowRight' ? 1 : tabButtons.length - 1)) % tabButtons.length];
                next.focus();
                next.click();
            });
        });

        // Sync UI with URL state on load
        function syncFilterUI() {
             document.querySelectorAll('.filter-btn').forEach(b => {
                 const active = b.innerText === currentCategory || (currentCategory === 'all' && b.innerText === 'All');
                 b.setAttribute('aria-pressed', String(active));
                 if (active) {
                     b.classList.add('active');
                     if (b.scrollIntoView && window.innerWidth <= 640) {
                         b.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                     }
                 } else {
                     b.classList.remove('active');
                 }
             });
        }

        function updateURL() {
            const url = new URL(window.location);
            url.searchParams.delete('tab');
            if (currentCategory === 'all') url.searchParams.delete('category');
            else url.searchParams.set('category', currentCategory);
            
            if (currentPage === 1) url.searchParams.delete('page');
            else url.searchParams.set('page', currentPage);
            
            window.history.pushState({}, '', url);
        }

        function performRender() {
            const allItems = Array.from(document.querySelectorAll('#projectList .project-item'));
            const emptyState = document.getElementById('emptyState');
            
            // 1. Filter
            const visibleItems = allItems.filter(item => {
                const itemCat = item.getAttribute('data-category');
                if (!itemCat) return false;
                return currentCategory === 'all' || itemCat.split(',').includes(currentCategory);
            });

            // 2. Handle Empty State
            if (visibleItems.length === 0) {
                 allItems.forEach(item => item.style.display = 'none');
                 emptyState.style.display = 'block';
                 document.getElementById('paginationControls').style.display = 'none';
                 return;
            } else {
                 emptyState.style.display = 'none';
            }

            // 3. Paginate
            const totalPages = Math.ceil(visibleItems.length / itemsPerPage);
            // Ensure currentPage is valid
            if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;
            if (currentPage < 1) currentPage = 1;

            const start = (currentPage - 1) * itemsPerPage;
            const end = start + itemsPerPage;
            const itemsToShow = visibleItems.slice(start, end);

            // 4. Update DOM visibility
            allItems.forEach(item => item.style.display = 'none'); // Hide all first
            itemsToShow.forEach(item => item.style.display = ''); // Show page items

            // 5. Update Controls
            const paginationRow = document.getElementById('paginationControls');
            const prevBtn = document.getElementById('prevBtn');
            const nextBtn = document.getElementById('nextBtn');
            const pageInfo = document.getElementById('pageInfo');

            if (visibleItems.length <= itemsPerPage && currentPage === 1) {
                paginationRow.style.display = 'none';
            } else {
                paginationRow.style.display = 'flex';
                prevBtn.disabled = currentPage === 1;
                nextBtn.disabled = currentPage === totalPages || totalPages === 0;
                pageInfo.textContent = \`\${currentPage} / \${totalPages || 1}\`;
            }
        }

        function render() {
             // View Transitions API
             if (document.startViewTransition) {
                 document.startViewTransition(() => performRender());
             } else {
                 performRender();
             }
        }

        function filterPosts(btn, category) {
            // Update buttons immediately for responsiveness
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            if (btn.scrollIntoView && window.innerWidth <= 640) {
                btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
            
            currentCategory = category;
            currentPage = 1; // Reset to page 1
            updateURL();
            render();
        }

        function changePage(delta) {
            currentPage += delta;
            updateURL();
            
            if (document.startViewTransition) {
                 document.startViewTransition(() => {
                     performRender();
                     // Scroll to top of list
                     const list = document.querySelector('.project-list-container');
                     if(list) list.scrollIntoView({ behavior: 'smooth' });
                 });
            } else {
                 performRender();
                 const list = document.querySelector('.project-list-container');
                 if(list) list.scrollIntoView({ behavior: 'smooth' });
            }
        }

        // Initial Render
        document.addEventListener('DOMContentLoaded', () => {
            showTab(currentTab);
            syncFilterUI();
            performRender(); // No transition on initial load
            
            // Handle browser back/forward buttons
            window.addEventListener('popstate', () => {
                const params = new URLSearchParams(window.location.search);
                currentCategory = params.get('category') || 'all';
                currentPage = parseInt(params.get('page')) || 1;
                showTab(params.get('tab') === 'log' ? 'log' : 'essays');
                syncFilterUI();
                render();
            });
        });
    </script>
</body>
</html>`;

writeGeneratedFile(WRITING_INDEX_PATH, INDEX_HTML.replace('<!doctype html>', '<!doctype html>\n<!-- GENERATED BY build.js FROM content/posts/*.md. DO NOT EDIT THIS FILE DIRECTLY. -->'));
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
             <a href="https://open.substack.com/pub/mcofie" target="_blank" rel="noopener noreferrer" class="project-item" data-category="writing">
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
const hasWritingMarkers = (indexContent.match(/<!-- WRITING_LIST_START -->/g) || []).length === 1 &&
    (indexContent.match(/<!-- WRITING_LIST_END -->/g) || []).length === 1;
if (!hasWritingMarkers) {
    throw new Error('index.html must contain exactly one WRITING_LIST_START and WRITING_LIST_END marker pair.');
}
const updatedIndexContent = indexContent.replace(
    /<!-- WRITING_LIST_START -->[\s\S]*<!-- WRITING_LIST_END -->/,
    latestPostsHTML
);

writeGeneratedFile(INDEX_PATH, updatedIndexContent);
console.log('--- Updated index.html with latest posts ---');


// 5. Generate Search Index
const searchIndex = posts.map(post => ({
    title: post.title,
    description: post.description,
    category: post.categories[0],
    url: `/posts/${post.url}`,
    date: post.date
})).concat(logEntries.map(entry => ({
    title: entry.title,
    description: entry.description,
    category: LOG_CATEGORY,
    url: `/log/${entry.url}`,
    date: entry.date
})));

writeGeneratedFile(path.join(__dirname, 'search.json'), JSON.stringify(searchIndex));
console.log('--- Generated search.json ---');

// 6. Generate RSS Feed
// Essays and Monthly Log entries, newest first.
const feedItems = [
    ...posts.map(post => ({ ...post, link: `https://maxwellcofie.com/posts/${post.url}` })),
    ...logEntries.map(entry => ({ ...entry, link: `https://maxwellcofie.com/log/${entry.url}` })),
].sort((a, b) => b.isoDate.localeCompare(a.isoDate));
const feedDate = feedItems.length ? new Date(`${feedItems[0].isoDate}T00:00:00Z`) : new Date(0);
const RSS_TEMPLATE = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
 <title>Maxwell Cofie</title>
 <description>Thoughts on technology, design, and building products in Africa.</description>
 <link>https://maxwellcofie.com</link>
 <lastBuildDate>${feedDate.toUTCString()}</lastBuildDate>
 <pubDate>${feedDate.toUTCString()}</pubDate>
 <ttl>1800</ttl>

 ${feedItems.map(post => `
  <item>
   <title>${escapeXml(post.title)}</title>
   <description>${escapeXml(post.description)}</description>
   <link>${post.link}</link>
   <guid>${post.link}</guid>
   <pubDate>${new Date(post.isoDate).toUTCString()}</pubDate>
  </item>
 `).join('')}

</channel>
</rss>`;

writeGeneratedFile(path.join(__dirname, 'rss.xml'), RSS_TEMPLATE);
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
    <loc>https://maxwellcofie.com/books/</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://maxwellcofie.com/music/</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://maxwellcofie.com/brand-kit/</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
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
  ${logEntries.map(entry => `
  <url>
    <loc>https://maxwellcofie.com/log/${entry.url}</loc>
    <lastmod>${entry.isoDate}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
  </url>`).join('')}
</urlset>`;

writeGeneratedFile(path.join(__dirname, 'sitemap.xml'), SITEMAP_TEMPLATE);
console.log('--- Generated sitemap.xml ---');

// 8. Shared nav/footer and pre-rendered project lists for hand-written pages
// data.js and locale.js are browser scripts, so run them in a sandbox to read their values.
function loadBrowserScript(file, expose = '') {
    const context = { window: {}, document: { addEventListener() {} } };
    vm.runInNewContext(`${fs.readFileSync(path.join(__dirname, file), 'utf8')}\n${expose}`, context, { filename: file });
    return context;
}
const siteData = loadBrowserScript('data.js').window;
const englishStrings = loadBrowserScript('locale.js', 'exported = translations;').exported.en;

// Mirrors renderProjects() in app.js so the list is in the HTML before JavaScript runs.
const renderProjectItems = items => [...items]
    .sort((a, b) => a.title.localeCompare(b.title))
    .map(proj => `
            <a href="${escapeHtml(proj.url)}" target="_blank" rel="noopener noreferrer" class="project-item" data-category="${escapeHtml(proj.category)}">
                <div class="proj-left">
                    <div class="proj-header">
                        <span class="proj-title">${escapeHtml(proj.title)} <span class="year-label">(${escapeHtml(proj.year)})</span></span>
                        <span class="arrow">↗</span>
                    </div>
                    <span class="proj-desc" data-i18n="${proj.descKey}">${escapeHtml(englishStrings[proj.descKey])}</span>
                </div>
                <div class="proj-meta" data-i18n="${proj.metaKey}">${escapeHtml(englishStrings[proj.metaKey])}</div>
            </a>`).join('');

const STATIC_PAGES = {
    'index.html': { root: './' },
    'about/index.html': { root: '../' },
    'work/index.html': {
        root: '../',
        active: 'work',
        lists: { WORKS_LIST: siteData.works, INITIATIVES_LIST: siteData.initiatives },
    },
    'ventures/index.html': { root: '../', active: 'ventures' },
    'books/index.html': { root: '../' },
    'music/index.html': { root: '../' },
    'brand-kit/index.html': { root: '../' },
    // Served at any missing URL, so its links must be root-absolute.
    '404.html': { root: '/' },
};

function replaceMarkedBlock(content, marker, replacement, file) {
    const start = `<!-- ${marker}_START -->`;
    const end = `<!-- ${marker}_END -->`;
    if (content.split(start).length !== 2 || content.split(end).length !== 2) {
        throw new Error(`${file} must contain exactly one ${start} and ${end} marker pair.`);
    }
    return content.replace(new RegExp(`([ \\t]*)${start}[\\s\\S]*${end}`),
        (match, indent) => `${indent}${start}\n${indent}${replacement.trim()}\n${indent}${end}`);
}

for (const [file, { root, active, lists = {} }] of Object.entries(STATIC_PAGES)) {
    const filePath = path.join(__dirname, file);
    let content = fs.readFileSync(filePath, 'utf8');
    content = replaceMarkedBlock(content, 'SITE_NAV', renderSiteNav(root, active), file);
    content = replaceMarkedBlock(content, 'SITE_FOOTER', renderSiteFooter(root), file);
    for (const [marker, items] of Object.entries(lists)) {
        content = replaceMarkedBlock(content, marker, renderProjectItems(items), file);
    }
    writeGeneratedFile(filePath, content);
}
console.log('--- Updated shared nav, footer and project lists ---');

// 9. Brand kit: its English copy comes from brand-kit/strings.js (French and Spanish load in the browser)
const brandKitStrings = loadBrandKit().strings;
for (const file of ['brand-kit/index.html', 'brand-kit/profile/index.html']) {
    const filePath = path.join(__dirname, file);
    writeGeneratedFile(filePath, applyBrandKitStrings(fs.readFileSync(filePath, 'utf8'), brandKitStrings.en, file));
}
console.log('--- Updated brand kit copy ---');

// Refresh static page metadata from the same configuration on every build.
for (const [file, metadata] of Object.entries(pages)) {
    if (file === 'writing/index.html') continue;
    const filePath = path.join(__dirname, file);
    writeGeneratedFile(filePath, updatePageMetadata(fs.readFileSync(filePath, 'utf8'), metadata));
}

console.log('Build Complete! 🚀');
