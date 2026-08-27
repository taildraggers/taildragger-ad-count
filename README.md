# Taildragger Ad Count

Daily-updating listing count widget, embeddable via iframe. No server required —
GitHub Actions runs the update on a schedule, and GitHub Pages hosts the JSON + widget.

## Setup

1. **Create the repo.** On GitHub, create a new repository (e.g. `taildragger-ad-count`)
   and push these files to it (`update-daily-count.js`, `ad-count-widget.html`,
   `.github/workflows/update-count.yml`).

2. **Fill in your scrape total.** Open `update-daily-count.js` and replace the
   placeholder inside `getScrapedSitesTotal()` with whatever pulls your existing
   scraped ad total (read a file, query a DB, call an API — whatever your scrape
   project already does).

3. **Enable GitHub Pages.**
   Repo → Settings → Pages → under "Build and deployment", set Source to
   "Deploy from a branch", branch `main`, folder `/ (root)`. Save.

4. **Run the workflow once manually** to generate the first `ad-count.json`
   (don't wait for the daily schedule): repo → Actions tab → "Update Ad Count" →
   "Run workflow".

5. **Embed the widget** anywhere you want the stat to show, using your Pages URL:

   ```html
   <iframe
     src="https://<your-username>.github.io/<repo-name>/ad-count-widget.html"
     style="border:none;width:300px;height:50px;">
   </iframe>
   ```

## How it works

- `.github/workflows/update-count.yml` runs daily (default 12:00 UTC — edit the
  cron line to change it), executing `update-daily-count.js`.
- That script fetches Taildraggers.com's public `/ad-count/` page and sums the
  per-category counts shown there (e.g. `Aircraft (76)`, `Fly Market (0)`), adds
  your own scraped total, and writes it all to `ad-count.json` at the repo root.
- The workflow commits that file back to the repo.
- `ad-count-widget.html` (served by GitHub Pages) just fetches `ad-count.json`
  from the same origin and displays the total — no CORS issues since it's all
  same-domain.

## Notes

- Everything here is public (repo, Actions logs, the JSON file) since GitHub
  Pages and public Actions runs are visible to anyone — fine here since nothing
  sensitive is involved, just a listing count.
- If Taildraggers.com ever redesigns their `/ad-count/` page, the regex in
  `getTaildraggersLiveCount()` may need a small update.
