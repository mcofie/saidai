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

// 1. Configure Marked with Highlight.js
marked.setOptions({
    highlight: function (code, lang) {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext';
        return hljs.highlight(code, { language }).value;
    },
    langPrefix: 'hljs language-'
});

// 2. Read All Posts
const posts = [];
const files = fs.readdirSync(CONTENT_DIR);

files.forEach(file => {
    if (path.extname(file) !== '.md') return;

    const content = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8');
    const { attributes, body } = fm(content);
    const htmlContent = marked.parse(body);
    const slug = path.basename(file, '.md');

    posts.push({
        ...attributes,
        slug,
        htmlContent,
        outputFile: `${slug}/index.html`, // Directory pattern
        url: `${slug}/` // Clean URL for links
    });
});

// Sort posts by date (newest first)
posts.sort((a, b) => new Date(b.isoDate) - new Date(a.isoDate));

// 3. Generate HTML Files for each post
const HTML_TEMPLATE = `<!doctype html>
<html lang="en" data-theme="system">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{TITLE}} | Maxwell Cofie</title>
    <meta name="description" content="{{DESCRIPTION}}">
    <!-- View Transitions -->
    <meta name="view-transition" content="same-origin" />

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Mansalva&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../../style.css">
    
    <!-- Prism/Highlight Theme - Minimal Monochrome -->
    <style>
        /* Blog Post Specifics */
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

        article {
            max-width: 100%;
            view-transition-name: article-content;
        }

        h1 {
            font-size: clamp(24px, 4vw, 32px);
            margin-bottom: 8px;
            letter-spacing: -0.02em;
            line-height: 1.2;
        }

        .post-date {
            font-size: 13px;
            color: var(--text-tertiary);
            margin-bottom: 48px;
            display: block;
            font-variant-numeric: tabular-nums;
        }

        .post-content {
            font-size: 16px; 
            line-height: 1.7;
            color: var(--text-muted);
        }

        .post-content p {
            margin-bottom: 24px;
        }

        .post-content h2 {
            font-size: 20px;
            margin-top: 48px;
            margin-bottom: 16px;
            color: var(--text-main);
            letter-spacing: -0.01em;
            font-weight: 500;
        }

        .post-content h3 {
             font-size: 16px;
             margin-top: 32px;
             margin-bottom: 12px;
             font-weight: 600;
             color: var(--text-main);
        }

        .post-content ul {
            margin-bottom: 24px;
            padding-left: 20px;
        }

        .post-content li {
            margin-bottom: 8px;
        }
        
        .post-content a {
            text-decoration: underline;
            text-underline-offset: 4px;
            text-decoration-color: var(--border-color);
            color: var(--text-main);
        }
        
        .post-content a:hover {
            text-decoration-color: var(--text-main);
        }

        .post-content blockquote {
             border-left: 2px solid var(--border-color);
             padding-left: 20px;
             font-style: italic;
             margin: 32px 0;
             color: var(--text-main);
        }

        /* Syntax Highlighting - Minimal */
        pre {
            background-color: var(--tag-bg, #f4f4f4); /* Make sure to define tag-bg or use a fallback */
            padding: 20px;
            border-radius: 4px;
            overflow-x: auto;
            margin: 32px 0;
            font-size: 13px; 
            font-family: 'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace;
            border: 1px solid var(--border-color);
        }

        [data-theme="dark"] pre {
            background-color: #111;
        }

        .hljs-keyword, .hljs-selector-tag, .hljs-title, .hljs-section, .hljs-doctag, .hljs-name, .hljs-strong {
            font-weight: bold;
        }
        .hljs-comment { color: #999; }
        .hljs-string, .hljs-title, .hljs-section, .hljs-built_in, .hljs-literal, .hljs-type, .hljs-addition, .hljs-tag, .hljs-quote, .hljs-name, .hljs-selector-id, .hljs-selector-class {
            color: var(--text-main); 
        }

    </style>
</head>

<body>
    <nav>
        <a href="../../" class="logo">Maxwell Cofie</a>
        <div class="nav-links">
            <a href="../../" class="nav-link">Work</a>
            <a href="../../ventures/" class="nav-link">Ventures</a>
            <a href="../../writing/" class="nav-link">Writing</a>
            <button class="theme-toggle" id="themeBtn" aria-label="Toggle Theme">
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-2a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" />
                </svg>
            </button>
        </div>
    </nav>
    
    <a href="../../writing/" class="back-link">← Writing</a>

    <article>
        <h1>{{TITLE}}</h1>
        <span class="post-date">{{DATE}}</span>

        <div class="post-content">
            {{CONTENT}}
        </div>
    </article>

    <footer>
        <a href="mailto:maxwcofie@gmail.com" class="footer-link">Email</a>
        <a href="https://x.com/maxwellcofie" target="_blank" class="footer-link">Twitter</a>
        <a href="https://linkedin.com/in/maxwell-cofie" target="_blank" class="footer-link">LinkedIn</a>
        <a href="https://github.com/mcofie" target="_blank" class="footer-link">GitHub</a>
        <span style="flex-grow: 1;"></span>
        <span class="footer-link" style="color: var(--text-tertiary); cursor: default;">&copy; 2025 Maxwell Cofie</span>
    </footer>

    <script>
        // --- THEME ---
        const themeBtn = document.getElementById('themeBtn');
        const root = document.documentElement;

        // Minimalist Icons
        const sunIcon = '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
        const moonIcon = '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

        function setTheme(theme) {
            root.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
            themeBtn.innerHTML = theme === 'dark' ? sunIcon : moonIcon;
        }

        const savedTheme = localStorage.getItem('theme');
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (savedTheme) {
            setTheme(savedTheme);
        } else {
            setTheme(systemDark ? 'dark' : 'light');
        }

        themeBtn.addEventListener('click', () => {
            const current = root.getAttribute('data-theme');
            setTheme(current === 'dark' ? 'light' : 'dark');
        });
    </script>
</body>
</html>`;

console.log('--- Generating Posts ---');
posts.forEach(post => {
    let html = HTML_TEMPLATE
        .replace(/{{TITLE}}/g, post.title)
        .replace(/{{DATE}}/g, post.date)
        .replace(/{{DESCRIPTION}}/g, post.description)
        .replace(/{{CONTENT}}/g, post.htmlContent);

    const postPath = path.join(OUTPUT_DIR, post.outputFile); // posts/slug/index.html
    const postDir = path.dirname(postPath);

    if (!fs.existsSync(postDir)) {
        fs.mkdirSync(postDir, { recursive: true });
    }

    fs.writeFileSync(postPath, html);
    console.log(`Generated: ${post.outputFile}`);
});


// 4. Update writing/index.html Index
const INDEX_HTML = `<!doctype html>
<html lang="en" data-theme="system">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Writing | Maxwell Cofie</title>
    <meta name="description" content="Thoughts on technology, design, and building products in Africa.">
    <!-- View Transitions -->
    <meta name="view-transition" content="same-origin" />

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Mansalva&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../style.css">
    
    <style>
        .project-item { align-items: center; }
    </style>
</head>

<body>

    <nav>
        <a href="../" class="logo">Maxwell Cofie</a>
        <div class="nav-links">
            <a href="../" class="nav-link">Work</a>
            <a href="../ventures/" class="nav-link">Ventures</a>
            <a href="./" class="nav-link active">Writing</a>
            <button class="theme-toggle" id="themeBtn" aria-label="Toggle Theme">
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-2a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" />
                </svg>
            </button>
        </div>
    </nav>

    <div class="intro">
        <p>Thoughts on technology, design, and building products.</p>
    </div>

    <div class="project-list-container">
        <div class="section-label">Articles</div>

        <div class="project-list">
            ${posts.map(post => `
            <a href="../posts/${post.url}" class="project-item">
                <div class="proj-left">
                    <div class="proj-header">
                        <span class="proj-title">${post.title}</span>
                        <span class="arrow">→</span>
                    </div>
                    <span class="proj-desc">${post.description}</span>
                </div>
                <div class="proj-meta">${post.date}</div>
            </a>
            `).join('')}
        </div>
    </div>

    <footer>
        <a href="mailto:maxwcofie@gmail.com" class="footer-link">Email</a>
        <a href="https://x.com/maxwellcofie" target="_blank" class="footer-link">Twitter</a>
        <a href="https://linkedin.com/in/maxwell-cofie" target="_blank" class="footer-link">LinkedIn</a>
        <a href="https://github.com/mcofie" target="_blank" class="footer-link">GitHub</a>
        <span style="flex-grow: 1;"></span>
        <span class="footer-link" style="color: var(--text-tertiary); cursor: default;">&copy; 2025 Maxwell Cofie</span>
    </footer>

    <script>
        const themeBtn = document.getElementById('themeBtn');
        const root = document.documentElement;

        // Minimalist Icons
        const sunIcon = '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
        const moonIcon = '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

        function setTheme(theme) {
            root.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
            themeBtn.innerHTML = theme === 'dark' ? sunIcon : moonIcon;
        }

        const savedTheme = localStorage.getItem('theme');
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (savedTheme) setTheme(savedTheme);
        else setTheme(systemDark ? 'dark' : 'light');

        themeBtn.addEventListener('click', () => {
            const current = root.getAttribute('data-theme');
            setTheme(current === 'dark' ? 'light' : 'dark');
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
                <div class="proj-meta">${post.date}</div>
            </a>
            `).join('')}
             <!-- Fallback Substack Link (Optional) -->
             <a href="https://open.substack.com/pub/mcofie" target="_blank" class="project-item" data-category="writing">
                <div class="proj-left">
                    <div class="proj-header">
                        <span class="proj-title" style="color: var(--text-tertiary);">Archives (Substack)</span>
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


// 5. Generate RSS Feed
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
console.log('Build Complete! 🚀');
