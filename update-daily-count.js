/**
 * update-daily-count.js
 *
 * Runs once a day via the GitHub Actions workflow in
 * .github/workflows/update-count.yml. It writes docs/ad-count.json, which
 * docs/ad-count-widget.html (served via GitHub Pages) reads.
 *
 * Requires Node 18+ (for built-in fetch) — the workflow already sets this up.
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, 'docs', 'ad-count.json');

// Some sites (Taildraggers.com included) 403 Node's default fetch, which
// sends no User-Agent header at all. A normal browser UA clears that.
const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
};

// Every other taildraggers.com scraper repo, each publishing its own listings
// page (one row per listing) to its own GitHub Pages site at this URL pattern.
const SCRAPED_SITES = [
  'aeronca',
  'american-champion',
  'aviat',
  'beech',
  'bellanca',
  'cessna',
  'cub-crafters',
  'de-Havilland',
  'just-aircraft',
  'kitfox',
  'luscombe',
  'maule',
  'piper',
  'pitts',
  'rans',
  'stearman',
  'swift',
  'taylorcraft',
  'vans',
  'waco',
];

/**
 * Fetches each scraper repo's published Pages site and pulls the listing
 * count out of its "Updated ... · N listing(s)" line (see render_html() in
 * every repo's main.py). One site failing (page down, markup changed) is
 * logged and counted as 0 rather than failing the whole run.
 */
async function getScrapedSitesTotal() {
  const bySite = {};
  await Promise.all(
    SCRAPED_SITES.map(async (repo) => {
      const url = `https://taildraggers.github.io/${repo}/`;
      try {
        const res = await fetch(url, { headers: FETCH_HEADERS });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();
        const match = html.match(/(\d+)\s+listing\(s\)/);
        if (!match) throw new Error('listing count not found on page');
        bySite[repo] = parseInt(match[1], 10);
      } catch (err) {
        console.warn(`[warn] ${repo}: ${err.message} — counting as 0`);
        bySite[repo] = 0;
      }
    })
  );
  const total = Object.values(bySite).reduce((sum, n) => sum + n, 0);
  return { total, bySite };
}

// Taildraggers.com's own live ad count. taildraggers.com/ad-count/ returns
// HTTP 403 to every fetch attempt from GitHub Actions (browser User-Agent
// included), almost certainly a WAF rule blocking GitHub's runner IP ranges
// rather than anything fetch-side — so this is a manually-set base count
// instead of a live scrape. Update this number by hand as needed.
const TAILDRAGGERS_BASE_COUNT = 75;

async function main() {
  const scraped = await getScrapedSitesTotal();
  const taildraggersTotal = TAILDRAGGERS_BASE_COUNT;

  const total = scraped.total + taildraggersTotal;

  const payload = {
    scrapedTotal: scraped.total,
    scrapedBySite: scraped.bySite,
    taildraggersTotal,
    total,
    updatedAt: new Date().toISOString(),
  };

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(payload, null, 2));

  console.log(
    `Updated docs/ad-count.json: ${total} total listings ` +
    `(Taildraggers live: ${taildraggersTotal}, other scraped sites: ${scraped.total})`
  );
}

main().catch((err) => {
  console.error('update-daily-count.js failed:', err);
  process.exit(1);
});
