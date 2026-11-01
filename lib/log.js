// The Monthly Log: one Markdown file per month in content/log/ (named YYYY-MM.md) wrapping up
// what I read, watched and listened to. build.js turns each into a page at /log/YYYY-MM/.
const path = require('path');
const fm = require('front-matter');

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const plainText = markdown => String(markdown ?? '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

function truncate(text, max) {
    if (text.length <= max) return text;
    return `${text.slice(0, text.lastIndexOf(' ', max - 1)).replace(/[,;:.\s]+$/, '')}…`;
}

// Reads one log file. Returns null for drafts so they can be written ahead of time without going live.
function parseLogEntry(file, source) {
    const { attributes, body } = fm(source);
    if (attributes.draft === true) return null;

    const slug = path.basename(file, '.md');
    const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(slug);
    if (!match) throw new Error(`content/log/${file}: name log files by month, like 2026-10.md`);
    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;
    const monthName = `${MONTHS[monthIndex]} ${year}`;

    if (!String(attributes.brief ?? '').trim()) {
        throw new Error(`content/log/${file}: add a "brief", a few sentences on the month`);
    }
    if (attributes.cover && !String(attributes.coverAlt ?? '').trim()) {
        throw new Error(`content/log/${file}: describe the cover photo in "coverAlt"`);
    }
    if (attributes.pick && !(attributes.pick.title && attributes.pick.url)) {
        throw new Error(`content/log/${file}: "pick" needs a title and a url`);
    }

    // Published on the last day of the month unless the file says otherwise.
    const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).toISOString().slice(0, 10);
    const isoDate = String(attributes.isoDate || lastDay);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate) || Number.isNaN(new Date(`${isoDate}T00:00:00Z`).getTime())) {
        throw new Error(`content/log/${file}: isoDate must be a valid YYYY-MM-DD date`);
    }

    const itemCount = (body.match(/^\s*[-*+]\s+\S/gm) || []).length + (attributes.pick ? 1 : 0);

    return {
        slug,
        month: slug,
        monthName,
        title: attributes.title || `Monthly Log · ${monthName}`,
        description: attributes.description || truncate(plainText(attributes.brief), 155),
        brief: String(attributes.brief).trim(),
        pick: attributes.pick || null,
        // Optional: a photo instead of the illustrated header, or a different line under the month's name.
        cover: attributes.cover || null,
        coverAlt: attributes.coverAlt || '',
        coverCaption: attributes.coverCaption ?? undefined,
        coverStyle: attributes.coverStyle || undefined,
        body,
        itemCount,
        isoDate,
        date: `${MONTHS[monthIndex].slice(0, 3)} ${year}`,
        url: `${slug}/`,
        outputFile: `${slug}/index.html`,
    };
}

const hostOf = href => {
    try {
        return new URL(href).hostname.replace(/^www\./, '');
    } catch {
        return '';
    }
};

const isExternal = href => /^https?:\/\//i.test(href);

// Turns rendered list items written as "[Title](url) — why it stayed with me" into a title,
// the site it's from and the note on its own line.
function decorateLogItems(html) {
    return html
        .replace(/<ul>(\s*<li><a href=)/g, '<ul class="log-list">$1')
        .replace(/<li>(<a href="([^"]+)"([^>]*)>([\s\S]*?)<\/a>)(?:\s*(?:—|–|-|:)\s*([\s\S]*?))?\s*<\/li>/g,
            (match, link, href, attrs, title, note) => {
                const host = hostOf(href);
                const target = isExternal(href) ? ' target="_blank" rel="noopener noreferrer"' : '';
                return `<li class="log-item"><a href="${href}"${attrs}${target} class="log-link">${title}</a>`
                    + (host ? `<span class="log-source">${host}</span>` : '')
                    + (note && note.trim() ? `<span class="log-note">${note.trim()}</span>` : '')
                    + '</li>';
            });
}

module.exports = { parseLogEntry, decorateLogItems, hostOf };
