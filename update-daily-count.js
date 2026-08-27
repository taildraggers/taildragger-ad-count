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
        const res = await fetch(url);
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

/**
 * Pulls Taildraggers.com's own live count from their public "Ad Count" page,
 * which lists per-category totals like "Aircraft (76)" and "Fly Market (0)".
 * We sum every "(N)" we find on the page.
 *
 * NOTE: this scrapes their HTML, so if that page's markup ever changes this
 * may need a small regex tweak.
 */
async function getTaildraggersLiveCount() {
  const res = await fetch('https://taildraggers.com/ad-count/');
  if (!res.ok) {
    throw new Error(`Failed to fetch ad-count page: ${res.status}`);
  }
  const html = await res.text();

  const matches = [...html.matchAll(/\(([\d,]+)\)/g)];
  if (matches.length === 0) {
    throw new Error('No counts found on Taildraggers ad-count page — page format may have changed.');
  }

  return matches.reduce((sum, m) => sum + parseInt(m[1].replace(/,/g, ''), 10), 0);
}

async function main() {
  const [scraped, taildraggersTotal] = await Promise.all([
    getScrapedSitesTotal(),
    getTaildraggersLiveCount(),
  ]);

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
