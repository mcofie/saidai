const { test } = require('node:test');
const assert = require('node:assert/strict');
const { pages, renderMetadata, updatePageMetadata } = require('../lib/metadata');

const readSchema = html => JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);

test('article text cannot break HTML attributes or terminate structured data', () => {
    const title = 'A "quote" & a </script><script>alert(1)</script> — $&';
    const html = renderMetadata({
        title, description: title, path: '/posts/example/',
        article: { title, published: '2026-10-09T00:00:00.000Z', categories: ['Product & Design'] },
    });
    assert.equal((html.match(/<script\b/g) || []).length, 1);
    assert.match(html, /content="A &quot;quote&quot; &amp; a &lt;\/script&gt;/);
    const schema = readSchema(html);
    assert.equal(schema.headline, title);
    assert.equal(schema.description, title);
    assert.equal(schema.mainEntityOfPage['@id'], 'https://maxwellcofie.com/posts/example/');
    assert.match(html, /property="og:type" content="article"/);
    assert.match(html, /property="article:tag" content="Product &amp; Design"/);
});

test('static metadata updates are idempotent and preserve page content and unrelated head elements', () => {
    const source = `<!doctype html><html><head><meta charset="utf-8">
        <title>Old</title><meta name="description" content="Old">
        <link rel="canonical" href="https://example.com/old">
        <meta property="og:url" content="https://example.com/old">
        <script type="application/ld+json">{"old":true}</script>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="stylesheet" href="style.css">
        <script>window.theme = 'system';</script>
        </head><body><h1>Original body</h1></body></html>`;
    const updated = updatePageMetadata(source, pages['index.html']);
    assert.equal(updatePageMetadata(updated, pages['index.html']), updated);
    assert.equal((updated.match(/<title>/g) || []).length, 1);
    assert.equal((updated.match(/rel="canonical"/g) || []).length, 1);
    assert.equal((updated.match(/property="og:url"/g) || []).length, 1);
    assert.match(updated, /<link rel="stylesheet" href="style.css">/);
    assert.match(updated, /<script>window.theme = 'system';<\/script>/);
    assert.match(updated, /<body><h1>Original body<\/h1><\/body>/);
    assert.equal(readSchema(updated).mainEntity.name, 'Maxwell Cofie');
});

test('default and custom sharing covers use large cards while the person keeps the original portrait', () => {
    const defaults = renderMetadata(pages['writing/index.html']);
    assert.match(defaults, /content="https:\/\/maxwellcofie.com\/assets\/images\/maxwell-cofie-social-red.png"/);
    assert.match(defaults, /name="twitter:card" content="summary_large_image"/);
    assert.match(defaults, /property="og:image:width" content="1730"/);
    assert.match(defaults, /property="og:image:height" content="909"/);
    assert.equal(readSchema(renderMetadata(pages['index.html'])).mainEntity.image, 'https://maxwellcofie.com/assets/images/maxwell-cofie.jpg');
    const custom = renderMetadata({ ...pages['writing/index.html'], image: '/assets/cover.jpg', imageAlt: 'A cover' });
    assert.match(custom, /name="twitter:card" content="summary_large_image"/);
    assert.match(custom, /property="og:image:alt" content="A cover"/);
    assert.doesNotMatch(custom, /property="og:image:(width|height|type)"/);
    assert.throws(() => renderMetadata({ ...pages['index.html'], image: 'javascript:alert(1)' }), /HTTP or HTTPS/);
});

test('error pages stay out of search indexes without claiming a canonical homepage', () => {
    const html = renderMetadata(pages['404.html']);
    assert.match(html, /name="robots" content="noindex, follow"/);
    assert.doesNotMatch(html, /canonical|application\/ld\+json|og:url/);
});
