#!/usr/bin/env node
// Prints brand-kit/profile/ (the one-page profile) to the PDF in the brand kit, using a local Chrome.
// Run through `npm run profile-pdf`, which fills in the sheet's text first.
const { execFileSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SHEET = path.join(ROOT, 'brand-kit', 'profile', 'index.html');
const PDF = path.join(ROOT, 'assets', 'brand-kit', 'maxwell-cofie-profile.pdf');
const HASH = path.join(ROOT, 'content', 'profile.hash');

const CHROME_PATHS = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean);

const chrome = CHROME_PATHS.find(candidate => fs.existsSync(candidate));
if (!chrome) {
    console.error('Chrome was not found. Set CHROME_PATH to your Chrome or Chromium executable.');
    process.exit(1);
}

const temp = path.join(os.tmpdir(), `profile-${process.pid}.pdf`);
execFileSync(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--no-pdf-header-footer',
    '--allow-file-access-from-files',
    '--virtual-time-budget=5000', // let fonts and the photo load before printing
    `--print-to-pdf=${temp}`,
    `file://${SHEET}`,
], { stdio: 'ignore' });

fs.copyFileSync(temp, PDF);
fs.rmSync(temp);
fs.writeFileSync(HASH, `${crypto.createHash('sha256').update(fs.readFileSync(SHEET)).digest('hex')}\n`);
console.log(`--- One-page profile saved to ${path.relative(ROOT, PDF)} ---`);
