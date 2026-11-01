const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

// brand-kit/strings.js is a browser script that adds to locale.js's translations,
// so give it an empty set to fill and read back every language and the "last updated" date.
function loadBrandKit() {
    const context = { window: {}, translations: { en: {}, fr: {}, es: {} } };
    const file = path.join(ROOT, 'brand-kit', 'strings.js');
    vm.runInNewContext(fs.readFileSync(file, 'utf8'), context, { filename: 'brand-kit/strings.js' });
    return { strings: context.window.brandKitStrings, updated: context.window.brandKitUpdated };
}

// Write each string into its element (marked with data-i18n="kit.*") so the page reads
// correctly before JavaScript runs. Keyed elements hold only their string, never other tags.
function applyBrandKitStrings(html, strings, file) {
    return html.replace(/(<(\w+)\b[^>]*\sdata-i18n="(kit\.[\w.]+)"[^>]*>)([\s\S]*?)(<\/\2>)/g, (match, open, tag, key, inner, close) => {
        if (!(key in strings)) throw new Error(`${file}: brand-kit/strings.js has no "${key}"`);
        return open + strings[key] + close;
    });
}

const plain = html => html.replace(/<[^>]+>/g, '');

// The bios as a text file for the downloadable kit.
function biosText(strings) {
    const s = key => plain(strings[key]);
    const section = (title, ...paragraphs) => `${title.toUpperCase()}\n${paragraphs.join('\n\n')}`;
    return [
        `Maxwell Cofie: ${s('kit.bios_label')}`,
        s('kit.updated'),
        section(s('kit.bio_short_title'), s('kit.bio_short')),
        section(s('kit.bio_medium_title'), s('kit.bio_medium')),
        section(s('kit.bio_long_title'), s('kit.bio_long_1'), s('kit.bio_long_2'), s('kit.bio_long_3'), s('kit.bio_long_4')),
        section(s('kit.intro_label'), s('kit.pronounce'), s('kit.intro_text')),
        section(s('kit.fact_contact'), 'maxcofie@gmail.com', 'https://maxwellcofie.com/brand-kit/'),
    ].join('\n\n') + '\n';
}

module.exports = { loadBrandKit, applyBrandKitStrings, biosText };
