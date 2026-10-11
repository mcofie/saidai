const SITE_URL = 'https://maxwellcofie.com/';
const SITE_NAME = 'Maxwell Cofie';
const PORTRAIT_IMAGE = new URL('assets/images/maxwell-cofie.jpg', SITE_URL).href;
const DEFAULT_IMAGE = new URL('assets/images/maxwell-cofie-social-red.png', SITE_URL).href;

// Page metadata lives here; article metadata comes from Markdown front matter.
const pages = {
    'index.html': {
        path: '/',
        title: 'Maxwell Cofie | Product, Capital & Community',
        description: "Maxwell Cofie builds digital products, connects founders with capital, and shares lessons from Africa's tech ecosystem. Based in Accra, Ghana.",
        schemaType: 'WebPage',
    },
    'about/index.html': {
        path: '/about/',
        title: 'About Maxwell Cofie | Building in Africa',
        description: 'Meet Maxwell Cofie: building products through Stage 2, connecting founders with capital, and bringing builders together through Sandbox Réseau in Accra.',
        schemaType: 'AboutPage',
    },
    'work/index.html': {
        path: '/work/',
        title: 'Product Design & Engineering Work | Maxwell Cofie',
        description: 'Explore products and initiatives by Maxwell Cofie across fintech, events, commerce, and community, built for the realities of African markets.',
        schemaType: 'CollectionPage',
    },
    'ventures/index.html': {
        path: '/ventures/',
        title: 'Ventures & Experiments in Ghana | Maxwell Cofie',
        description: 'Explore Maxwell Cofie’s ventures and experiments in Ghana, spanning theatre, apparel, modular furniture, hospitality, and sustainable agriculture.',
        schemaType: 'CollectionPage',
    },
    'writing/index.html': {
        path: '/writing/',
        title: 'The Logbook | Product, Africa & Life — Maxwell Cofie',
        description: 'Essays by Maxwell Cofie on building digital products, funding ventures, growing communities, and travelling across Africa. Notes from the work and the journey.',
        schemaType: 'CollectionPage',
    },
    'books/index.html': {
        path: '/books/',
        title: 'Bookshelf & Reading List | Maxwell Cofie',
        description: 'Browse Maxwell Cofie’s bookshelf: current reads, recommendations, and a reading queue covering product, strategy, leadership, fiction, and life.',
        schemaType: 'CollectionPage',
    },
    'music/index.html': {
        path: '/music/',
        title: 'Playlists for Work & Life | Maxwell Cofie',
        description: 'Listen to Maxwell Cofie’s curated Apple Music playlists: the music behind focused work, late-night building, and everyday life.',
        schemaType: 'CollectionPage',
    },
    'dev/index.html': {
        path: '/dev/',
        title: 'Maxwell Cofie | Full Stack Engineer & Solutions Architect',
        description: 'Explore Maxwell Cofie’s engineering experience, technical skills, and selected projects building digital products across fintech, events, commerce, and more.',
        schemaType: 'ProfilePage',
    },
    '404.html': {
        title: 'Page Not Found | Maxwell Cofie',
        description: 'This page could not be found. Explore Maxwell Cofie’s work, ventures, and essays from the homepage.',
        noindex: true,
    },
};

const escapeAttribute = value => String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

function absoluteUrl(value) {
    const url = new URL(value, SITE_URL);
    if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error(`Metadata URL must use HTTP or HTTPS: ${value}`);
    }
    return url.href;
}

function renderMetadata({ title, description, path, schemaType = 'WebPage', article, image, imageAlt, noindex = false }) {
    const meta = (attribute, name, content) => `    <meta ${attribute}="${name}" content="${escapeAttribute(content)}">`;
    const tags = [
        '    <!-- METADATA_START -->',
        `    <title>${escapeAttribute(title)}</title>`,
        meta('name', 'description', description),
    ];

    if (noindex) {
        return [...tags, meta('name', 'robots', 'noindex, follow'), '    <!-- METADATA_END -->'].join('\n');
    }

    const url = absoluteUrl(path);
    const imageUrl = image ? absoluteUrl(image) : DEFAULT_IMAGE;
    const alt = imageAlt || (image ? title : 'Maxwell Cofie — Product, Capital & Community. Accra, Ghana. maxwellcofie.com. Portrait on a red background.');
    const author = article?.author || SITE_NAME;
    tags.push(
        `    <link rel="canonical" href="${escapeAttribute(url)}">`,
        meta('name', 'author', author),
        meta('property', 'og:site_name', SITE_NAME),
        meta('property', 'og:locale', 'en_GH'),
        meta('property', 'og:type', article ? 'article' : 'website'),
        meta('property', 'og:title', title),
        meta('property', 'og:description', description),
        meta('property', 'og:url', url),
        meta('property', 'og:image', imageUrl),
        meta('property', 'og:image:alt', alt),
        meta('name', 'twitter:card', 'summary_large_image'),
        meta('name', 'twitter:site', '@maxwellcofie'),
        meta('name', 'twitter:title', title),
        meta('name', 'twitter:description', description),
        meta('name', 'twitter:image', imageUrl),
        meta('name', 'twitter:image:alt', alt),
    );

    if (!image) {
        tags.push(
            meta('property', 'og:image:type', 'image/png'),
            meta('property', 'og:image:width', '1730'),
            meta('property', 'og:image:height', '909'),
        );
    }

    const person = {
        '@type': 'Person', '@id': `${SITE_URL}#person`, name: SITE_NAME,
        url: SITE_URL, image: PORTRAIT_IMAGE,
        sameAs: ['https://x.com/maxwellcofie', 'https://linkedin.com/in/maxwell-cofie', 'https://github.com/mcofie'],
    };
    const schema = article ? {
        '@context': 'https://schema.org', '@type': 'BlogPosting',
        '@id': `${url}#article`, url, headline: article.title, description,
        image: imageUrl, inLanguage: 'en', datePublished: article.published,
        author: author === SITE_NAME ? person : { '@type': 'Person', name: author },
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    } : {
        '@context': 'https://schema.org', '@type': schemaType,
        '@id': url, url, name: title, description, inLanguage: 'en',
        isPartOf: { '@type': 'WebSite', '@id': `${SITE_URL}#website`, url: SITE_URL, name: SITE_NAME },
        ...(schemaType === 'AboutPage' || schemaType === 'ProfilePage' || path === '/' ? { mainEntity: person } : {}),
    };

    if (article) {
        tags.push(meta('property', 'article:published_time', article.published));
        for (const category of article.categories || []) tags.push(meta('property', 'article:tag', category));
    }

    // JSON.stringify escapes quotes; escaping '<' prevents text from closing the script element.
    tags.push(`    <script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>`);
    return [...tags, '    <!-- METADATA_END -->'].join('\n');
}

function updatePageMetadata(html, metadata) {
    const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i);
    if (!head) throw new Error('Cannot update metadata: page has no head element');
    const clean = head[1]
        .replace(/\s*<!-- METADATA_START -->[\s\S]*?<!-- METADATA_END -->/g, '')
        .replace(/\s*<title\b[^>]*>[\s\S]*?<\/title>/gi, '')
        .replace(/\s*<meta\b(?=[^>]*(?:name|property)=["'](?:description|author|robots|og:[^"']+|twitter:[^"']+|article:[^"']+)["'])[^>]*>/gi, '')
        .replace(/\s*<link\b(?=[^>]*rel=["']canonical["'])[^>]*>/gi, '')
        .replace(/\s*<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, '');
    // Keep charset first in the document head.
    const charset = /<meta\b[^>]*charset=[^>]+>/i;
    if (!charset.test(clean)) throw new Error('Cannot update metadata: page has no charset declaration');
    const updatedHead = clean.replace(charset, match => `${match}\n${renderMetadata(metadata)}`);
    return html.replace(head[0], () => `<head>${updatedHead}</head>`);
}

module.exports = { pages, renderMetadata, updatePageMetadata };
