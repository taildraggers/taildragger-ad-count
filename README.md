# Taildragger Ad Count

Daily-updating listing count widget, embeddable via iframe. No server required —
GitHub Actions runs the update on a schedule, and GitHub Pages hosts the JSON + widget.

## How it works

- `.github/workflows/update-count.yml` runs daily (default 12:00 UTC — edit the
  cron line to change it), executing `update-daily-count.js`.
- That script:
  1. Fetches every other taildraggers.com scraper repo's published GitHub
     Pages site (aeronca, piper, cessna, vans, stearman, waco, pitts,
     taylorcraft, swift, beech, maule, aviat, kitfox, rans, luscombe,
     bellanca, cub-crafters, american-champion, de-Havilland, just-aircraft)
     and pulls the listing count out of each page's "N listing(s)" line.
     One site being down or changing its markup only zeroes that one site,
     it doesn't fail the run — check the Action logs for `[warn]` lines.
  2. Fetches Taildraggers.com's own public `/ad-count/` page and sums the
     per-category counts shown there (e.g. `Aircraft (76)`, `Fly Market (0)`).
  3. Adds both totals together and writes `docs/ad-count.json`.
- The workflow commits that file back to the repo.
- `docs/ad-count-widget.html` (served by GitHub Pages from the `/docs` folder)
  fetches `ad-count.json` from the same origin and displays the total — no
  CORS issues since it's all same-domain.

## One-time setup: enable GitHub Pages

1. Repo → Settings → Pages → under "Build and deployment", set Source to
   "Deploy from a branch", branch `main`, folder `/docs`. Save.
2. Run the workflow once manually to generate the first `ad-count.json`
   (don't wait for the daily schedule): repo → Actions tab → "Update Ad Count" →
   "Run workflow".
3. Embed the widget anywhere you want the stat to show:

   ```html
   <iframe
     src="https://taildraggers.github.io/taildragger-ad-count/ad-count-widget.html"
     style="border:none;width:300px;height:50px;">
   </iframe>
   ```

## Adding a new scraper site

When a new manufacturer repo goes live, add its repo name to the
`SCRAPED_SITES` array in `update-daily-count.js` — that's the only place it
needs to be listed.

## Notes

- Everything here is public (repo, Actions logs, the JSON file) since GitHub
  Pages and public Actions runs are visible to anyone — fine here since nothing
  sensitive is involved, just a listing count.
- If Taildraggers.com ever redesigns their `/ad-count/` page, the regex in
  `getTaildraggersLiveCount()` may need a small update.
- If a scraper repo's page template changes the "N listing(s)" text, update
  the regex in `getScrapedSitesTotal()` to match.
