#!/usr/bin/env node
// Copies only the files the live site needs into dist/, which is what gets deployed.
// Anything not listed here (source Markdown, build scripts, notes, node_modules) stays private.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

const SITE_FILES = [
    'index.html', '404.html', 'CNAME', '.nojekyll', 'robots.txt',
    'style.css', 'app.js', 'data.js', 'locale.js', 'books-data.js', 'music-data.js', 'confetti.js',
    'rss.xml', 'sitemap.xml', 'search.json',
    'favicon.ico', 'favicon-16x16.png', 'favicon-32x32.png', 'apple-touch-icon.png',
];
const SITE_DIRS = ['about', 'work', 'ventures', 'writing', 'books', 'music', 'dev', 'posts', 'assets'];

// Files inside SITE_DIRS that are no longer used by any page.
const EXCLUDED = new Set([
    'assets/images/maxwell-cofie-social.png',
    'assets/images/maxwell-cofie-social-red.png',
]);

fs.rmSync(DIST, { recursive: true, force: true });

function copy(relativePath) {
    if (EXCLUDED.has(relativePath)) return;
    const source = path.join(ROOT, relativePath);
    const target = path.join(DIST, relativePath);
    if (fs.statSync(source).isDirectory()) {
        for (const entry of fs.readdirSync(source)) {
            if (entry === '.DS_Store' || entry.endsWith('.tmp')) continue;
            copy(path.join(relativePath, entry));
        }
        return;
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
}

for (const file of SITE_FILES) {
    if (fs.existsSync(path.join(ROOT, file))) copy(file);
}
for (const dir of SITE_DIRS) copy(dir);

function htmlFiles(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) return htmlFiles(fullPath);
        return entry.name.endsWith('.html') ? [fullPath] : [];
    });
}

// Give every page the same content-hashed URL for shared CSS/JS, so the browser
// reuses one cached copy across pages and fetches a new one only when the file changes.
const VERSIONED_FILES = ['style.css', 'app.js', 'locale.js', 'data.js', 'books-data.js', 'music-data.js', 'confetti.js'];
const versions = Object.fromEntries(VERSIONED_FILES.map(file => [
    file,
    crypto.createHash('sha256').update(fs.readFileSync(path.join(DIST, file))).digest('hex').slice(0, 10),
]));
const versionedRef = new RegExp(`(\\s(?:href|src)="(?:/|(?:\\.\\./)*)?)(${VERSIONED_FILES.map(f => f.replace('.', '\\.')).join('|')})(?:\\?[^"]*)?"`, 'g');
for (const page of htmlFiles(DIST)) {
    const html = fs.readFileSync(page, 'utf8');
    fs.writeFileSync(page, html.replace(versionedRef, (match, prefix, file) => `${prefix}${file}?v=${versions[file]}"`));
}

// Fail the build if any page links to a local file that didn't make it into dist/.
const missing = [];
for (const page of htmlFiles(DIST)) {
    const html = fs.readFileSync(page, 'utf8');
    for (const [, ref] of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
        if (/^(?:[a-z]+:|\/\/|#|\$\{)/i.test(ref)) continue;
        const cleanRef = decodeURI(ref.split(/[?#]/)[0]);
        if (!cleanRef) continue;
        let target = cleanRef.startsWith('/')
            ? path.join(DIST, cleanRef)
            : path.resolve(path.dirname(page), cleanRef);
        if (cleanRef.endsWith('/') || (fs.existsSync(target) && fs.statSync(target).isDirectory())) {
            target = path.join(target, 'index.html');
        }
        if (!fs.existsSync(target)) missing.push(`${path.relative(DIST, page)} -> ${ref}`);
    }
}

if (missing.length) {
    throw new Error(`dist/ is missing files that pages link to:\n  ${missing.join('\n  ')}`);
}
console.log(`--- Packaged site into ${path.relative(ROOT, DIST)}/ ---`);
