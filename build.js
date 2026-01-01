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


    const wordCount = body.split(/\s+/).length;
    const readTime = Math.ceil(wordCount / 200);

    posts.push({
        ...attributes,
        slug,
        htmlContent,
        readTime,
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
    <!-- Readability Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,200..800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    
    <link rel="stylesheet" href="../../style.css?v=2">
    
    <style>
        /* FOUC fix for i18n */
        [data-i18n] { visibility: visible; }
    </style>
    
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

        article {
            max-width: var(--post-max-w);
            margin: 0 auto;
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

        .reading-time::before {
             content: "•";
             margin-right: 16px;
             opacity: 0.4;
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

        /* Syntax Highlighting - Minimal */
        pre {
            background-color: var(--surface); 
            padding: 24px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 40px -24px; /* Slight bleed */
            font-size: 13px; 
            font-family: 'JetBrains Mono', monospace;
            border: 1px solid var(--border-color);
        }

        @media (max-width: 600px) {
            pre {
                margin: 32px -20px;
                border-radius: 0;
                border-left: 0;
                border-right: 0;
            }
        }

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
</head>

<body>
    <div class="reader-progress" id="progressBar"></div>

    <nav>
        <a href="../../" class="logo">Maxwell Cofie</a>
        <div class="nav-links">
            <a href="../../" class="nav-link" data-i18n="nav.work">Work</a>
            <a href="../../ventures/" class="nav-link" data-i18n="nav.ventures">Ventures</a>
            <a href="../../writing/" class="nav-link" data-i18n="nav.writing">Writing</a>
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
    
    <a href="../../writing/" class="back-link" data-i18n="nav.back_writing">← Writing</a>

    <article>
        <h1>{{TITLE}}</h1>
        <div class="post-meta-row">
            <span class="post-date">{{DATE}}</span>
            <span class="reading-time">{{READ_TIME}} min read</span>
        </div>

        <div class="post-content" id="postContent">
            {{CONTENT}}
        </div>
    </article>
    
    <!-- Reader Controls FAB -->
    <div class="reader-controls">
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
    let html = HTML_TEMPLATE
        .replace(/{{TITLE}}/g, post.title)
        .replace(/{{DATE}}/g, post.date)
        .replace(/{{DESCRIPTION}}/g, post.description)
        .replace(/{{READ_TIME}}/g, post.readTime)
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
        /* FOUC fix for i18n */
        [data-i18n] { visibility: visible; }
    </style>
    
    <style>
        .project-item { align-items: center; }
    </style>
</head>

<body>

    <nav>
        <a href="../" class="logo">Maxwell Cofie</a>
        <div class="nav-links">
            <a href="../" class="nav-link" data-i18n="nav.work">Work</a>
            <a href="../ventures/" class="nav-link" data-i18n="nav.ventures">Ventures</a>
            <a href="./" class="nav-link active" data-i18n="nav.writing">Writing</a>
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
        <a href="mailto:hello@maxwellcofie.com" class="footer-link" data-i18n="footer.email">Email</a>
        <a href="https://x.com/maxwellcofie" target="_blank" class="footer-link" data-i18n="footer.twitter">Twitter</a>
        <a href="https://linkedin.com/in/maxwell-cofie" target="_blank" class="footer-link" data-i18n="footer.linkedin">LinkedIn</a>
        <a href="https://github.com/mcofie" target="_blank" class="footer-link" data-i18n="footer.github">GitHub</a>
        <span style="flex-grow: 1;"></span>
        <span class="footer-link" style="color: var(--text-tertiary); cursor: default;">&copy; 2025 Maxwell Cofie</span>
    </footer>
    <script src="../locale.js"></script>
    <script src="../app.js"></script>
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

// 6. Generate Sitemap
const SITEMAP_TEMPLATE = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://maxwellcofie.com/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
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
