const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseLogEntry, decorateLogItems } = require('../lib/log');

const entry = (front, body = '') => `---\n${front}\n---\n${body}`;

test('a log entry is named by its month and published on its last day', () => {
    const log = parseLogEntry('2026-02.md', entry('brief: "A short month."', '## Read\n\n- [A](https://a.com) — note\n- [B](https://b.com)\n'));
    assert.equal(log.title, 'Monthly Log · February 2026');
    assert.equal(log.isoDate, '2026-02-28');
    assert.equal(log.date, 'Feb 2026');
    assert.equal(log.itemCount, 2);
    assert.equal(log.url, '2026-02/');
});

test('drafts are skipped and bad files fail the build', () => {
    assert.equal(parseLogEntry('2026-10.md', entry('draft: true\nbrief: "x"')), null);
    assert.throws(() => parseLogEntry('october.md', entry('brief: "x"')), /name log files by month/);
    assert.throws(() => parseLogEntry('2026-10.md', entry('title: "x"')), /add a "brief"/);
    assert.throws(() => parseLogEntry('2026-10.md', entry('brief: "x"\npick:\n  title: "No link"')), /needs a title and a url/);
});

test('list items get their source site and note', () => {
    const html = decorateLogItems('<ul>\n<li><a href="https://www.example.com/x">Title</a> — Why it mattered.</li>\n<li><a href="https://b.org">Bare</a></li>\n</ul>');
    assert.match(html, /<ul class="log-list">/);
    assert.match(html, /class="log-link">Title<\/a><span class="log-source">example\.com<\/span><span class="log-note">Why it mattered\.<\/span>/);
    assert.match(html, /class="log-link">Bare<\/a><span class="log-source">b\.org<\/span><\/li>/);
});

test('every month has an illustrated cover, and a cover photo needs a description', () => {
    const { renderLogCover } = require('../lib/log-covers');
    for (let month = 1; month <= 12; month++) {
        const svg = renderLogCover(`2026-${String(month).padStart(2, '0')}`);
        assert.match(svg, /^<svg[\s\S]*<\/svg>$/);
        assert.match(svg, /role="img" aria-label="[A-Z][a-z]+: /);
    }
    assert.match(renderLogCover('2026-10', { caption: 'A & B' }), /A &amp; B/);
    assert.throws(() => parseLogEntry('2026-10.md', entry('brief: "x"\ncover: "https://example.com/a.jpg"')), /coverAlt/);
});

test('each year has its own cover style, and a month can borrow another', () => {
    const { renderLogCover, styleForYear } = require('../lib/log-covers');
    assert.deepEqual([2026, 2027, 2028, 2029, 2030].map(year => styleForYear(year).key), ['canopy', 'kente', 'linework', 'cutout', 'canopy']);
    assert.notEqual(renderLogCover('2026-10'), renderLogCover('2027-10'));
    assert.match(renderLogCover('2026-10', { style: 'linework' }), /Newsreader/);
    assert.throws(() => renderLogCover('2026-10', { style: 'nope' }), /Unknown cover style/);
});
