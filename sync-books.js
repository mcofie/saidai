const fs = require('fs');
const https = require('https');
const path = require('path');

const GOODREADS_USER_ID = '108237344';
const OUTPUT_FILE = path.join(__dirname, 'books-data.js');

function fetchXml(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.end();
  });
}

function cleanString(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[\u00ad\u200b-\u200d\ufeff]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const isbnOverrides = {
  "Lessons in Chemistry": "0385547372",
  "Verity": "1538724731",
  "Stories That Stick: How Storytelling Can Captivate Customers, Influence Audiences, and Transform Your Business": "0062905759",
  "Yellowface": "0063250837",
  "Atomic Habits: An Easy & Proven Way to Build Good Habits & Break Bad Ones": "0735211299",
  "Tomorrow Died Yesterday": "9789028456",
  "Homegoing": "1101971061",
  "The Stranger": "0679720200",
  "Nearly All the Men in Lagos Are Mad": "1953103340",
  "The Compound Effect: Jumpstart Your Income, Your Life, Your Success": "159315724X",
  "Maame": "1250282527",
  "I'm Glad My Mom Died": "1982185821",
  "Measure What Matters": "0525536221",
  "Do It Today: Overcome Procrastination, Improve Productivity, and Achieve More Meaningful Things": "1797746401",
  "Transcendent Kingdom": "0525658181",
  "Sprint: How to Solve Big Problems and Test New Ideas in Just Five Days": "150112174X",
  "The Art of War": "1599869772",
  "Homo Deus: A History of Tomorrow": "0062464310",
  "Turning Pro": "1936891034",
  "Think and Grow Rich": "1585424331",
  "How to Win Friends & Influence People": "0671027034",
  "Crushing It!: How Great Entrepreneurs Build Their Business and Influence and How You Can Too – A State-of-the-Art Guide to Personal Branding and Social Media": "0062674676",
  "The Subtle Art of Not Giving a F*ck: A Counterintuitive Approach to Living a Good Life": "0062457713",
  "The Tipping Point: How Little Things Can Make a Big Difference": "0316346624",
  "Sapiens: A Brief History of Humankind": "0062316095"
};

async function fetchShelf(shelfName) {
  const url = `https://www.goodreads.com/review/list_rss/${GOODREADS_USER_ID}?shelf=${shelfName}&_cb=${Date.now()}`;
  const xml = await fetchXml(url);
  const items = xml.split('<item>');
  items.shift();

  return items.map(item => {
    const getTag = (tag) => {
      const m = item.match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?<\\/${tag}>`, 's'));
      return m ? cleanString(m[1]) : '';
    };

    const bookId = getTag('book_id') || getTag('guid');
    let rawTitle = getTag('title');
    let author = getTag('author_name');
    let isbn = getTag('isbn');
    let isbn13 = getTag('isbn13');
    let year = getTag('book_published');
    let rating = parseInt(getTag('user_rating'), 10) || 0;
    let img = getTag('book_large_image_url') || getTag('book_medium_image_url') || getTag('book_image_url');

    if (year === '-500') year = '500 BC';

    const effectiveIsbn = isbnOverrides[rawTitle] || (isbn && isbn.length >= 9 ? isbn : (isbn13 && isbn13.length >= 10 ? isbn13 : ''));
    let amazonUrl = '';
    if (effectiveIsbn) {
      amazonUrl = `https://www.amazon.com/dp/${effectiveIsbn}`;
    } else {
      const cleanSearchTitle = rawTitle.split('(')[0].split(':')[0].trim();
      amazonUrl = `https://www.amazon.com/s?k=${encodeURIComponent(cleanSearchTitle + ' ' + author)}`;
    }

    let title = rawTitle;
    let subtitle = '';

    if (rawTitle.startsWith("HBR's 10 Must Reads on Communication")) {
      title = "HBR's 10 Must Reads on Communication";
      subtitle = 'Featuring "The Necessary Art of Persuasion" by Jay A. Conger';
    } else if (rawTitle.startsWith('Ikigai: The Japanese Secret')) {
      title = 'Ikigai';
      subtitle = 'The Japanese Secret to a Long and Happy Life';
    } else if (rawTitle.startsWith('Eat That Frog!')) {
      title = 'Eat That Frog!';
      subtitle = '21 Great Ways to Stop Procrastinating and Get More Done in Less Time';
    } else {
      let series = '';
      const seriesMatch = rawTitle.match(/^(.*?)\s*\(([^)]*#\d+[^)]*)\)$/);
      if (seriesMatch) {
        rawTitle = seriesMatch[1].trim();
        series = seriesMatch[2].trim();
      }

      if (rawTitle.includes(': ')) {
        const parts = rawTitle.split(': ');
        title = parts[0].trim();
        subtitle = parts.slice(1).join(': ').trim();
      } else if (rawTitle.includes(' — ')) {
        const parts = rawTitle.split(' — ');
        title = parts[0].trim();
        subtitle = parts.slice(1).join(' — ').trim();
      } else {
        title = rawTitle;
      }

      if (series && !subtitle) {
        subtitle = series;
      }
    }

    return {
      bookId,
      rawTitle,
      title,
      subtitle,
      author,
      year,
      status: shelfName, // "currently-reading" | "read" | "to-read"
      rating,
      isbn: effectiveIsbn,
      amazonUrl,
      image: img
    };
  });
}

async function syncBooks() {
  console.log(`Connecting to real-time Goodreads shelf feeds for user ${GOODREADS_USER_ID}...`);

  // Fetch all 3 specific shelves in parallel (avoids Goodreads' stale global ALL cache)
  const [reading, read, toRead] = await Promise.all([
    fetchShelf('currently-reading'),
    fetchShelf('read'),
    fetchShelf('to-read')
  ]);

  const seenIds = new Set();
  const allBooks = [];

  [...reading, ...read, ...toRead].forEach((book, idx) => {
    // Avoid duplicates if a book is temporarily on two shelves
    const uniqueKey = book.bookId || book.rawTitle;
    if (seenIds.has(uniqueKey)) return;
    seenIds.add(uniqueKey);

    allBooks.push({
      id: `book-${allBooks.length + 1}`,
      title: book.title,
      subtitle: book.subtitle,
      author: book.author,
      year: book.year,
      status: book.status,
      rating: book.rating,
      isbn: book.isbn,
      amazonUrl: book.amazonUrl,
      image: book.image
    });
  });

  const fileContent = `/**
 * Curated Bookshelf Data for Maxwell Cofie
 * Generated automatically from live Goodreads shelf RSS feeds (User ID: ${GOODREADS_USER_ID})
 * Run "npm run sync-books" to fetch latest updates.
 */
window.books = ${JSON.stringify(allBooks, null, 4)};
`;

  fs.writeFileSync(OUTPUT_FILE, fileContent);
  console.log(`✅ Successfully synced ${allBooks.length} books to books-data.js!`);
  console.log(`   - Currently Reading: ${allBooks.filter(b => b.status === 'currently-reading').length}`);
  console.log(`   - Read & Recommended: ${allBooks.filter(b => b.status === 'read').length}`);
  console.log(`   - Reading Queue: ${allBooks.filter(b => b.status === 'to-read').length}`);
}

syncBooks().catch(err => {
  console.error('Error syncing books:', err);
  process.exit(1);
});
