#!/usr/bin/env node
// Copies only the files the live site needs into dist/, which is what gets deployed.
// Anything not listed here (source Markdown, build scripts, notes, node_modules) stays private.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const { loadBrandKit, biosText } = require('../lib/brand-kit');
const { createZip } = require('../lib/zip');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const PROFILE_HASH = path.join(ROOT, 'content', 'profile.hash');

const SITE_FILES = [
    'index.html', '404.html', 'CNAME', '.nojekyll', 'robots.txt',
    'style.css', 'app.js', 'data.js', 'locale.js', 'books-data.js', 'music-data.js', 'confetti.js',
    'rss.xml', 'sitemap.xml', 'search.json',
    'favicon.ico', 'favicon-16x16.png', 'favicon-32x32.png', 'apple-touch-icon.png',
];
const SITE_DIRS = ['about', 'work', 'ventures', 'writing', 'books', 'music', 'dev', 'posts', 'log', 'assets', 'brand-kit'];

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
for (const dir of SITE_DIRS) {
    if (fs.existsSync(path.join(ROOT, dir))) copy(dir);
}

// The brand kit's "download everything" ZIP: photos, signature, one-page profile and bios in each language.
const KIT_DIR = path.join(DIST, 'assets', 'brand-kit');
const PROFILE_PDF = 'maxwell-cofie-profile.pdf';
const { strings: kitStrings, updated } = loadBrandKit();
const kitFile = name => fs.readFileSync(path.join(KIT_DIR, name));
const kitFiles = [
    ['headshots/maxwell-cofie-headshot-circle.png', kitFile('maxwell-cofie-headshot-circle.png')],
    ['headshots/maxwell-cofie-headshot-square.jpg', kitFile('maxwell-cofie-headshot-medium.jpg')],
    ['headshots/maxwell-cofie-headshot-portrait.jpg', kitFile('maxwell-cofie-headshot-portrait.jpg')],
    ['signature/maxwell-cofie-signature-black.png', kitFile('maxwell-cofie-signature-black.png')],
    ['signature/maxwell-cofie-signature-black.svg', kitFile('maxwell-cofie-signature-black.svg')],
    ['signature/maxwell-cofie-signature-white.png', kitFile('maxwell-cofie-signature-white.png')],
    ['signature/maxwell-cofie-signature-white.svg', kitFile('maxwell-cofie-signature-white.svg')],
    ['maxwell-cofie-social-card.jpg', kitFile('maxwell-cofie-social-card.jpg')],
    [PROFILE_PDF, kitFile(PROFILE_PDF)],
    ...Object.keys(kitStrings).map(lang => [`bios/bios-${lang}.txt`, Buffer.from(biosText(kitStrings[lang]))]),
];
fs.writeFileSync(path.join(KIT_DIR, 'maxwell-cofie-brand-kit.zip'),
    createZip(kitFiles.map(([name, data]) => ({ name: `maxwell-cofie-brand-kit/${name}`, data })), new Date(`${updated}T12:00:00Z`)));

// The one-page profile PDF is made locally with Chrome (npm run profile-pdf), so flag it when
// the sheet's text has changed since.
const sheetHash = crypto.createHash('sha256')
    .update(fs.readFileSync(path.join(DIST, 'brand-kit', 'profile', 'index.html'))).digest('hex');
const recordedHash = fs.existsSync(PROFILE_HASH) ? fs.readFileSync(PROFILE_HASH, 'utf8').trim() : '';
if (sheetHash !== recordedHash) {
    console.warn('!!! The one-page profile PDF is out of date. Run `npm run profile-pdf` to refresh it.');
}

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
