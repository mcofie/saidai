#!/usr/bin/env node
// Records the display size of every Cloudinary image used in a post, so the build can
// give each <img> a width and height and the page doesn't jump as images load.
// Only images missing from content/image-sizes.json are looked up.
const fs = require('fs');
const path = require('path');
const { CLOUDINARY_UPLOAD, IMAGE_SIZES_PATH, cloudinaryUrl, readImageSizes } = require('../lib/images');

const CONTENT_DIR = path.join(__dirname, '..', 'content', 'posts');

async function main() {
    const sizes = readImageSizes();
    const sources = new Set();
    for (const file of fs.readdirSync(CONTENT_DIR).filter(name => name.endsWith('.md'))) {
        const markdown = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8');
        for (const [url] of markdown.matchAll(/https:\/\/res\.cloudinary\.com\/[^\s"')]+/g)) {
            if (CLOUDINARY_UPLOAD.test(url)) sources.add(url);
        }
    }

    const missing = [...sources].filter(src => !sizes[src]);
    let failures = 0;
    for (const src of missing) {
        try {
            const response = await fetch(cloudinaryUrl(src, 1280, 'fl_getinfo'));
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const { output } = await response.json();
            sizes[src] = { width: output.width, height: output.height };
        } catch (error) {
            failures++;
            console.warn(`Could not get the size of ${src}: ${error.message}`);
        }
    }

    const sorted = Object.fromEntries(Object.keys(sizes).sort().map(key => [key, sizes[key]]));
    fs.writeFileSync(IMAGE_SIZES_PATH, `${JSON.stringify(sorted, null, 2)}\n`);
    console.log(`--- Image sizes: ${missing.length - failures} added, ${failures} failed, ${sources.size} total ---`);
}

main();
