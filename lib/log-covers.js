// Illustrated headers for the Monthly Log: the month's name framed by flat motifs for what the
// month looks like in Ghana (the weather, a festival, a national day). Each year has its own look,
// so the log reads like a set of volumes. Drawn as inline SVG so they stay sharp, cost no image
// requests and use the site's own fonts.

// Each motif is drawn around 0,0 and roughly 120 units across. `c` is its colour, `k` a darker ink.
const MOTIFS = {
    leaf: (c, k) => `<path d="M0,-60 C34,-30 34,30 0,60 C-34,30 -34,-30 0,-60Z" fill="${c}"/>
        <path d="M0,-48 V54 M0,-20 L16,-34 M0,0 L19,-14 M0,20 L16,6 M0,-20 L-16,-34 M0,0 L-19,-14 M0,20 L-16,6" stroke="${k}" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.35"/>`,
    frond: c => `<path d="M0,62 C2,20 0,-20 -4,-62" stroke="${c}" stroke-width="4" fill="none" stroke-linecap="round"/>
        ${[-44, -24, -4, 16, 36].map(y => `<ellipse cx="14" cy="${y}" rx="18" ry="6" transform="rotate(-30 0 ${y})" fill="${c}"/><ellipse cx="-14" cy="${y}" rx="18" ry="6" transform="rotate(30 0 ${y})" fill="${c}"/>`).join('')}`,
    berries: (c, k) => `<path d="M-40,50 C-10,20 10,-10 40,-50 M0,0 C14,4 26,14 32,28 M-14,18 C-30,16 -42,6 -48,-8" stroke="${k}" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.6"/>
        ${[[40, -50], [32, 28], [-48, -8], [18, -26], [-24, 34]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="10" fill="${c}"/>`).join('')}`,
    cocoa: (c, k) => `<rect x="-5" y="-72" width="10" height="20" rx="4" fill="${k}" opacity="0.7"/>
        <ellipse cx="0" cy="0" rx="32" ry="58" fill="${c}"/>
        <path d="M-14,-52 C-22,-20 -22,20 -14,52 M0,-58 V58 M14,-52 C22,-20 22,20 14,52" stroke="${k}" stroke-width="3" fill="none" opacity="0.3"/>`,
    raindrop: c => `<path d="M0,-38 C14,-12 24,4 24,16 A24,24 0 0 1 -24,16 C-24,4 -14,-12 0,-38Z" fill="${c}"/>`,
    rain: c => [[-30, -30], [10, -6], [-12, 26], [30, 30]].map(([x, y]) => `<path d="M${x},${y - 14} C${x + 6},${y - 4} ${x + 9},${y + 1} ${x + 9},${y + 5} A9,9 0 0 1 ${x - 9},${y + 5} C${x - 9},${y + 1} ${x - 6},${y - 4} ${x},${y - 14}Z" fill="${c}"/>`).join(''),
    cloud: c => `<g fill="${c}"><circle cx="-30" cy="8" r="24"/><circle cx="2" cy="-8" r="32"/><circle cx="34" cy="10" r="22"/><rect x="-30" y="8" width="64" height="24" rx="10"/></g>`,
    sun: c => `<circle r="28" fill="${c}"/>${Array.from({ length: 12 }, (_, i) => `<line x1="0" y1="-40" x2="0" y2="-56" stroke="${c}" stroke-width="5" stroke-linecap="round" transform="rotate(${i * 30})"/>`).join('')}`,
    hazysun: c => `<circle r="56" fill="${c}" opacity="0.18"/><circle r="42" fill="${c}" opacity="0.3"/><circle r="28" fill="${c}"/>`,
    dust: c => [[-40, -10, 5], [-18, 22, 3], [6, -30, 4], [22, 10, 6], [44, -18, 3], [-8, 44, 4], [36, 40, 3]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" opacity="0.7"/>`).join(''),
    star: c => `<polygon points="0,-44 10,-14 42,-14 16,6 26,36 0,18 -26,36 -16,6 -42,-14 -10,-14" fill="${c}"/>`,
    sparkle: c => `<path d="M0,-30 C4,-6 6,-4 30,0 C6,4 4,6 0,30 C-4,6 -6,4 -30,0 C-6,-4 -4,-6 0,-30Z" fill="${c}"/>`,
    kente: (c, k, colors) => `<g transform="rotate(8)"><rect x="-28" y="-60" width="56" height="120" rx="4" fill="${k}"/>
        ${[0, 1, 2, 3, 4, 5].map(i => `<rect x="-28" y="${-60 + i * 20}" width="56" height="10" fill="${colors[i % colors.length]}"/>
        <path d="M-20,${-45 + i * 20} l8,-5 l8,5 l8,-5 l8,5 l8,-5" stroke="${c}" stroke-width="2" fill="none" opacity="0.8"/>`).join('')}</g>`,
    drum: (c, k) => `<ellipse cx="0" cy="-48" rx="38" ry="10" fill="${k}" opacity="0.5"/>
        <path d="M-38,-48 L38,-48 L16,8 L26,58 L-26,58 L-16,8Z" fill="${c}"/>
        <path d="M-34,-40 L-8,4 L-30,-40 M-12,-44 L8,6 M10,-44 L-6,6 M30,-42 L10,4" stroke="${k}" stroke-width="2.5" fill="none" opacity="0.45"/>
        <ellipse cx="0" cy="-48" rx="38" ry="10" fill="none" stroke="${k}" stroke-width="3" opacity="0.6"/>`,
    umbrella: (c, k) => `<path d="M0,-4 V44 a10,10 0 0 1 -20,0" stroke="${k}" stroke-width="4" fill="none" stroke-linecap="round"/>
        <path d="M-60,0 A60,52 0 0 1 60,0 Q45,-12 30,0 Q15,-12 0,0 Q-15,-12 -30,0 Q-45,-12 -60,0Z" fill="${c}"/>`,
    firework: c => Array.from({ length: 12 }, (_, i) => `<g transform="rotate(${i * 30})"><line x1="0" y1="-14" x2="0" y2="-44" stroke="${c}" stroke-width="4" stroke-linecap="round"/><circle cy="-54" r="4" fill="${c}"/></g>`).join(''),
    paraglider: (c, k) => `<path d="M-58,-30 Q0,-74 58,-30 Q0,-52 -58,-30Z" fill="${c}"/>
        <path d="M-54,-32 L0,40 M-20,-46 L0,40 M20,-46 L0,40 M54,-32 L0,40" stroke="${k}" stroke-width="1.5" opacity="0.6"/>
        <circle cx="0" cy="44" r="7" fill="${k}"/>`,
    corn: (c, k, colors) => `<path d="M0,58 C-40,30 -40,-20 -24,-50 C-18,-10 -10,20 0,58Z M0,58 C40,30 40,-20 24,-50 C18,-10 10,20 0,58Z" fill="${colors[1] || k}"/>
        <ellipse cx="0" cy="-6" rx="18" ry="50" fill="${c}"/>
        ${[-36, -20, -4, 12, 28].map(y => `<path d="M-14,${y} H14" stroke="${k}" stroke-width="2" opacity="0.3"/>`).join('')}`,
    heart: c => `<path d="M0,40 C-50,6 -44,-40 -14,-40 C-4,-40 0,-30 0,-24 C0,-30 4,-40 14,-40 C44,-40 50,6 0,40Z" fill="${c}"/>`,
    lights: (c, k, colors) => `<path d="M-64,-10 Q0,40 64,-10" stroke="${k}" stroke-width="2" fill="none" opacity="0.6"/>
        ${[-48, -24, 0, 24, 48].map((x, i) => `<circle cx="${x}" cy="${12 - Math.abs(x) * 0.33}" r="8" fill="${colors[i % colors.length]}"/>`).join('')}`,
};

// What each month looks like in Ghana.
const THEMES = {
    1: { caption: 'Harmattan haze', bg: '#C9A27E', text: '#FFF7EC', colors: ['#F6E3C6', '#A8754F', '#E9C9A0', '#8C5A3C'], ink: '#5C3A24', motifs: ['hazysun', 'dust', 'leaf', 'dust', 'frond', 'dust'] },
    2: { caption: 'Chocolate Day · Dry season', bg: '#5A2E2A', text: '#FBE3D2', colors: ['#E36A5D', '#C98B3A', '#F2B9A8', '#8E4A2E'], ink: '#2E1513', motifs: ['heart', 'cocoa', 'sparkle', 'heart', 'leaf', 'cocoa'] },
    3: { caption: 'Independence Day · 6 March', bg: '#0F6B3E', text: '#FFF6DA', colors: ['#FCD116', '#CE1126', '#111111', '#FCD116'], ink: '#073A21', motifs: ['star', 'kente', 'sparkle', 'star', 'leaf', 'kente'] },
    4: { caption: 'Easter in Kwahu', bg: '#7DB8DF', text: '#FFFFFF', colors: ['#F2C14E', '#E4572E', '#FFFFFF', '#3F8F5B'], ink: '#24506E', motifs: ['paraglider', 'cloud', 'paraglider', 'sparkle', 'cloud', 'leaf'] },
    5: { caption: 'The rains arrive · Africa Day, 25 May', bg: '#2F6670', text: '#E8FBF7', colors: ['#9FD8CF', '#5FB37F', '#F2C14E', '#CFEDE7'], ink: '#173A40', motifs: ['rain', 'leaf', 'cloud', 'raindrop', 'frond', 'rain'] },
    6: { caption: 'Rainy season in Accra', bg: '#2B4257', text: '#E7F1FA', colors: ['#F2C14E', '#E4572E', '#8DB8D8', '#5FB37F'], ink: '#14212C', motifs: ['umbrella', 'rain', 'cloud', 'umbrella', 'raindrop', 'leaf'] },
    7: { caption: 'Republic Day · Cool season', bg: '#5F8A6A', text: '#F5FBEF', colors: ['#F2D06B', '#D7E8C6', '#C0533F', '#2F4F38'], ink: '#2C4433', motifs: ['leaf', 'star', 'kente', 'frond', 'cloud', 'leaf'] },
    8: { caption: 'Homowo in Accra', bg: '#B8553A', text: '#FFF1E2', colors: ['#F4C95D', '#6E9B53', '#FBE3C0', '#7A2E1F'], ink: '#5A2316', motifs: ['corn', 'drum', 'berries', 'corn', 'sparkle', 'leaf'] },
    9: { caption: "Founders' Day · Minor rains", bg: '#235766', text: '#8FD3E0', colors: ['#F2B441', '#C9502F', '#79B657', '#E58A3A'], ink: '#133640', motifs: ['leaf', 'berries', 'frond', 'leaf', 'star', 'raindrop'] },
    10: { caption: 'Cocoa season · Minor rains', bg: '#4A2F24', text: '#F6DFC6', colors: ['#E9A23B', '#C4562E', '#7BA05B', '#F2C46B'], ink: '#24140E', motifs: ['cocoa', 'leaf', 'raindrop', 'cocoa', 'frond', 'leaf'] },
    11: { caption: 'Hogbetsotso · Harmattan begins', bg: '#7A3A2C', text: '#FBE8D4', colors: ['#F2C14E', '#2F7D4F', '#E9D2B4', '#C9302C'], ink: '#3B1A12', motifs: ['drum', 'kente', 'dust', 'drum', 'leaf', 'kente'] },
    12: { caption: 'Detty December', bg: '#1E1B3A', text: '#FCE7A8', colors: ['#F2C14E', '#E4572E', '#5FC2B3', '#E86AA6'], ink: '#0D0B1F', motifs: ['firework', 'lights', 'sparkle', 'firework', 'star', 'lights'] },
};

// Spots around the edge of the frame, clear of the month's name: x, y, scale, rotation.
const SLOTS = [
    [40, 50, 1.9, -25], [215, 40, 1.05, 18], [400, 30, 0.7, 40], [800, 28, 0.75, -32], [990, 44, 1.1, 24], [1165, 60, 1.9, -14],
    [30, 250, 1.4, 14], [1172, 250, 1.45, -24], [170, 175, 0.6, -8], [1035, 180, 0.6, 12],
    [60, 445, 1.8, 30], [250, 462, 1.05, -14], [455, 468, 0.65, 8], [745, 466, 0.7, -18], [960, 455, 1.1, 22], [1150, 440, 1.9, -34],
];

// Small seeded random numbers, so each month's header is the same on every build.
function random(seed) {
    let t = seed;
    return () => {
        t = (t + 0x6D2B79F5) | 0;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const escapeXml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

const place = (x, y, scale, rotation, art) => `<g transform="translate(${x} ${y}) rotate(${rotation}) scale(${scale})">${art}</g>`;
// Redraw a motif in one colour: as outlines, or flat for a cut-paper shadow.
const asOutline = (art, colour) => art
    .replace(/fill="#[0-9A-Fa-f]{3,8}"/g, `fill="none" stroke="${colour}" stroke-width="2.5" vector-effect="non-scaling-stroke" stroke-linejoin="round"`)
    .replace(/stroke="#[0-9A-Fa-f]{3,8}"(?! stroke-width="2.5" vector-effect)/g, `stroke="${colour}"`);
const asShadow = (art, colour) => art
    .replace(/fill="#[0-9A-Fa-f]{3,8}"/g, `fill="${colour}"`)
    .replace(/stroke="#[0-9A-Fa-f]{3,8}"/g, `stroke="${colour}"`);

// One look per year. Each gets the month's theme and returns the inside of a 1200×480 SVG.
const STYLES = {
    // Flat foliage framing the month's name in handwriting.
    canopy: { label: 'Canopy', draw({ theme, monthNumber, name, line, rand }) {
        const bokeh = Array.from({ length: 12 }, () =>
            `<circle cx="${Math.round(rand() * 1200)}" cy="${Math.round(rand() * 480)}" r="${Math.round(14 + rand() * 40)}" fill="#FFFFFF" opacity="0.07"/>`).join('');
        const motifs = SLOTS.map(([x, y, scale, rotation], i) => {
            const draw = MOTIFS[theme.motifs[i % theme.motifs.length]];
            const colour = theme.colors[(i * 3 + monthNumber) % theme.colors.length];
            const jitter = Math.round((rand() - 0.5) * 20);
            return place(x + jitter, y, scale, rotation + jitter, draw(colour, theme.ink, theme.colors));
        }).join('');
        return `<rect width="1200" height="480" fill="${theme.bg}"/>${bokeh}${motifs}
            <text x="600" y="262" text-anchor="middle" font-family="Mansalva, cursive" font-size="150" fill="${theme.text}">${name}</text>
            ${line ? `<text x="600" y="330" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="20" font-weight="600" letter-spacing="4" fill="${theme.text}" opacity="0.8">${escapeXml(line.toUpperCase())}</text>` : ''}`;
    } },

    // Woven bands like kente cloth, with the name set in bold capitals.
    kente: { label: 'Kente', draw({ theme, monthNumber, name, line, rand }) {
        const palette = [...theme.colors, theme.ink];
        const band = y => Array.from({ length: 30 }, (_, i) => {
            const x = i * 40;
            const colour = palette[(i * 2 + monthNumber + (y ? 1 : 0)) % palette.length];
            const pattern = i % 2
                ? `<path d="M${x + 6},${y + 40} l7,-8 l7,8 l7,-8 l7,8" stroke="${theme.text}" stroke-width="2" fill="none" opacity="0.7"/>`
                : `<rect x="${x + 8}" y="${y + 14}" width="24" height="5" fill="${theme.text}" opacity="0.6"/><rect x="${x + 8}" y="${y + 52}" width="24" height="5" fill="${theme.text}" opacity="0.6"/>`;
            return `<rect x="${x}" y="${y}" width="40" height="72" fill="${colour}"/>${pattern}`;
        }).join('');
        const left = MOTIFS[theme.motifs[0]](theme.colors[0], theme.ink, theme.colors);
        const right = MOTIFS[theme.motifs[3 % theme.motifs.length]](theme.colors[1 % theme.colors.length], theme.ink, theme.colors);
        const lift = Math.round((rand() - 0.5) * 12);
        return `<rect width="1200" height="480" fill="${theme.bg}"/>
            ${band(0)}${band(408)}
            <rect y="72" width="1200" height="4" fill="${theme.text}" opacity="0.5"/><rect y="404" width="1200" height="4" fill="${theme.text}" opacity="0.5"/>
            ${place(140, 240 + lift, 1.45, -12, left)}${place(1060, 240 - lift, 1.45, 12, right)}
            <text x="600" y="262" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="84" font-weight="600" letter-spacing="10" fill="${theme.text}">${name.toUpperCase()}</text>
            ${line ? `<text x="600" y="318" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="18" font-weight="500" letter-spacing="4" fill="${theme.text}" opacity="0.8">${escapeXml(line.toUpperCase())}</text>` : ''}`;
    } },

    // Line drawings on paper, with the name in a serif, like a field notebook.
    linework: { label: 'Linework', draw({ theme, monthNumber, year, name, line, rand }) {
        const grain = Array.from({ length: 140 }, () =>
            `<circle cx="${Math.round(rand() * 1200)}" cy="${Math.round(rand() * 480)}" r="1.4" fill="${theme.ink}" opacity="0.08"/>`).join('');
        const cluster = [[850, 140, 1.25, -18], [1020, 120, 0.95, 24], [940, 285, 1.6, 8], [1100, 350, 1.05, -28], [790, 360, 0.85, 14]];
        const motifs = cluster.map(([x, y, scale, rotation], i) => {
            const art = MOTIFS[theme.motifs[i % theme.motifs.length]](theme.colors[0], theme.ink, theme.colors);
            return place(x, y, scale, rotation, asOutline(art, theme.bg));
        }).join('');
        return `<rect width="1200" height="480" fill="#F6F0E4"/>${grain}
            <circle cx="950" cy="240" r="175" fill="${theme.colors[0]}" opacity="0.28"/>
            ${motifs}
            <text x="84" y="150" font-family="'JetBrains Mono', monospace" font-size="18" letter-spacing="3" fill="${theme.bg}">${String(monthNumber).padStart(2, '0')} / ${year}</text>
            <line x1="84" y1="172" x2="200" y2="172" stroke="${theme.bg}" stroke-width="2"/>
            <text x="78" y="285" font-family="Newsreader, Georgia, serif" font-size="124" font-weight="500" fill="${theme.ink}">${name}</text>
            ${line ? `<text x="84" y="338" font-family="'JetBrains Mono', monospace" font-size="16" letter-spacing="2" fill="${theme.ink}" opacity="0.75">${escapeXml(line.toUpperCase())}</text>` : ''}`;
    } },

    // Layered paper cut-outs with soft shadows and hills along the bottom.
    cutout: { label: 'Cut paper', draw({ theme, monthNumber, name, line, rand }) {
        const shadowed = (x, y, scale, rotation, art) =>
            `<g opacity="0.35">${place(x + 6, y + 8, scale, rotation, asShadow(art, theme.ink))}</g>${place(x, y, scale, rotation, art)}`;
        const hill = (d, colour) => `<path d="${d}" fill="${theme.ink}" opacity="0.35" transform="translate(0 -8)"/><path d="${d}" fill="${colour}"/>`;
        const spots = [[80, 90, 1.5, -15], [250, 60, 0.9, 20], [960, 60, 0.9, -20], [1120, 95, 1.5, 18], [60, 290, 1.1, 10], [1140, 290, 1.1, -12], [330, 392, 1, -8], [880, 384, 1.1, 12]];
        const motifs = spots.map(([x, y, scale, rotation], i) => {
            const art = MOTIFS[theme.motifs[i % theme.motifs.length]](theme.colors[(i + monthNumber) % theme.colors.length], theme.ink, theme.colors);
            return shadowed(x, y + Math.round((rand() - 0.5) * 10), scale, rotation, art);
        }).join('');
        return `<rect width="1200" height="480" fill="${theme.bg}"/>
            <circle cx="1200" cy="0" r="200" fill="${theme.colors[2 % theme.colors.length]}" opacity="0.35"/>
            <circle cx="0" cy="480" r="230" fill="${theme.colors[1 % theme.colors.length]}" opacity="0.3"/>
            ${hill('M0,420 C180,370 380,440 620,400 C840,364 1000,430 1200,392 V480 H0Z', theme.colors[3 % theme.colors.length])}
            ${hill('M0,452 C240,420 480,470 720,440 C900,420 1060,460 1200,440 V480 H0Z', theme.colors[0])}
            ${motifs}
            <text x="606" y="256" text-anchor="middle" font-family="Mansalva, cursive" font-size="140" fill="${theme.ink}" opacity="0.4">${name}</text>
            <text x="600" y="250" text-anchor="middle" font-family="Mansalva, cursive" font-size="140" fill="${theme.text}">${name}</text>
            ${line ? `<text x="600" y="312" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="19" font-weight="600" letter-spacing="4" fill="${theme.text}" opacity="0.85">${escapeXml(line.toUpperCase())}</text>` : ''}`;
    } },
};

// 2026 is Canopy, 2027 Kente, 2028 Linework, 2029 Cut paper, then round again.
const YEAR_STYLES = ['canopy', 'kente', 'linework', 'cutout'];
function styleForYear(year) {
    const key = YEAR_STYLES[(((year - 2026) % YEAR_STYLES.length) + YEAR_STYLES.length) % YEAR_STYLES.length];
    return { key, label: STYLES[key].label };
}

function themeFor(month) {
    return THEMES[Number(String(month).slice(5, 7))];
}

// month is "YYYY-MM". caption overrides the theme's line under the month's name; style overrides the year's look.
function renderLogCover(month, { caption, style } = {}) {
    const [year, monthNumber] = String(month).split('-').map(Number);
    const theme = THEMES[monthNumber];
    if (!theme) throw new Error(`No cover theme for month "${month}"`);
    const key = style || styleForYear(year).key;
    if (!STYLES[key]) throw new Error(`Unknown cover style "${key}". Use one of: ${Object.keys(STYLES).join(', ')}`);
    const name = MONTHS[monthNumber - 1];
    const line = caption ?? theme.caption;
    const inner = STYLES[key].draw({ theme, monthNumber, year, name, line, rand: random(year * 100 + monthNumber) });
    return `<svg class="log-cover-art" viewBox="0 0 1200 480" role="img" aria-label="${escapeXml(line ? `${name}: ${line}` : name)}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}

module.exports = { renderLogCover, styleForYear, themeFor, THEMES, STYLES };
