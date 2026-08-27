/**
 * update-daily-count.js
 *
 * Runs once a day via the GitHub Actions workflow in
 * .github/workflows/update-count.yml. It writes ad-count.json at the repo
 * root, which ad-count-widget.html (served via GitHub Pages) reads.
 *
 * Requires Node 18+ (for built-in fetch) — the workflow already sets this up.
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, 'ad-count.json');

/**
 * TODO: Wire this up to your existing scrape project's output.
 * This should return the total ad count across all the OTHER sites
 * you already scrape (not including Taildraggers.com itself).
 *
 * If your scraper also lives in (or can write to) this repo, you could
 * have it commit a `scrape-results.json` file here and read it below, e.g.:
 *
 *   const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'scrape-results.json'), 'utf8'));
 *   return data.reduce((sum, site) => sum + site.adCount, 0);
 */
async function getScrapedSitesTotal() {
  return 0; // <-- replace with real logic
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
  const [scrapedTotal, taildraggersTotal] = await Promise.all([
    getScrapedSitesTotal(),
    getTaildraggersLiveCount(),
  ]);

  const total = scrapedTotal + taildraggersTotal;

  const payload = {
    scrapedTotal,
    taildraggersTotal,
    total,
    updatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(payload, null, 2));

  console.log(
    `Updated ad-count.json: ${total} total listings ` +
    `(Taildraggers live: ${taildraggersTotal}, other scraped sites: ${scrapedTotal})`
  );
}

main().catch((err) => {
  console.error('update-daily-count.js failed:', err);
  process.exit(1);
});
