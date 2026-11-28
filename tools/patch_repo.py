"""Add listings.json output (taildraggers.com theme v4) to one scraper/aggregator repo.

Additive only: index.html is produced exactly as before, so existing iframes and the
state aggregators / ad counter that read index.html keep working.

Usage: python patch_repo.py <repo-dir>
"""
import re
import sys
from pathlib import Path

MARK = "# --- listings.json for taildraggers.com (theme v4) ---"

WRITE_JSON = '''
''' + MARK + '''
JSON_PATH = os.path.join(os.path.dirname(OUTPUT_PATH), "listings.json")
_JSON_DATE_FORMATS = ("%B %d %Y", "%b %d %Y", "%m/%d/%Y", "%m/%d/%y", "%Y-%m-%d")


def _json_date(date_posted: str) -> str:
    """'November 24, 2026' / '11/24/2026' -> '2026-11-24' (or '' if unknown)."""
    cleaned = (date_posted or "").replace(",", "").strip()
    for fmt in _JSON_DATE_FORMATS:
        try:
            return dt.datetime.strptime(cleaned, fmt).date().isoformat()
        except ValueError:
            continue
    return ""


def _json_price_value(price: str) -> int:
    digits = re.sub(r"[^\\d.]", "", price or "")
    try:
        return int(float(digits)) if digits else 0
    except ValueError:
        return 0


def write_json(listings, html_doc: str) -> None:
    """Write docs/listings.json: the same listings, title, disclaimer and "Search more"
    buttons as docs/index.html, as data. taildraggers.com shows these natively (no iframe)."""

    def _text(pattern: str) -> str:
        m = re.search(pattern, html_doc, re.S)
        return html.unescape(re.sub(r"<[^>]+>", "", m.group(1))).strip() if m else ""

    links = [
        {"name": html.unescape(name), "url": html.unescape(url)}
        for url, name in re.findall(r'<a class="resource-link" href="([^"]+)"[^>]*>\\s*<span>(.*?)</span>', html_doc)
    ]
    data = {
        "version": 1,
        "page_title": PAGE_TITLE,
        "updated": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat(),
        "count": len(listings),
        "disclaimer": _text(r'class="disclaimer">(.*?)</div>'),
        "search_heading": _text(r'<div class="more-resources">\\s*<h2>(.*?)</h2>'),
        "search_intro": _text(r'<div class="more-resources">.*?<p>(.*?)</p>'),
        "search_links": links,
        "listings": [
            {
                "title": getattr(item, "title", "") or "",
                "url": getattr(item, "url", "") or "",
                "price": getattr(item, "price", "") or "",
                "price_value": _json_price_value(getattr(item, "price", "")),
                "location": getattr(item, "location", "") or "",
                "date_posted": getattr(item, "date_posted", "") or "",
                "date": _json_date(getattr(item, "date_posted", "")),
                "site": getattr(item, "site", "") or "",
            }
            for item in listings
        ],
    }
    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print(f"[main] wrote {JSON_PATH}")

'''

README_NOTE = '''

## On taildraggers.com (theme v4)

Each run also writes `docs/listings.json`: the same listings, title, disclaimer and
"Search more" buttons as `docs/index.html`, as data. The taildraggers.com child theme
(v4+) reads it and shows the listings natively on the matching page, so the
`<iframe>` is no longer needed (any iframe still pointing here is swapped for the
native list automatically). `docs/index.html` is still produced exactly as before.
'''


def patch(repo: Path) -> list[str]:
    done = []
    main = repo / "main.py"
    src = main.read_text(encoding="utf-8")
    if MARK not in src:
        if not re.search(r"^import json\b", src, re.M):
            src = re.sub(r"^import html\n", "import html\nimport json\n", src, count=1, flags=re.M)
        if not re.search(r"^import re\b", src, re.M):
            src = re.sub(r"^import os\n", "import os\nimport re\n", src, count=1, flags=re.M)
        idx = src.index("\ndef main(")
        src = src[:idx] + "\n" + WRITE_JSON + src[idx:]
        call = '    print(f"[main] wrote {OUTPUT_PATH}")\n'
        assert src.count(call) == 1, "write call not found exactly once"
        src = src.replace(call, call + "    write_json(listings, html_doc)\n")
        main.write_text(src, encoding="utf-8")
        done.append("main.py")
    for wf in (repo / ".github" / "workflows").glob("*.yml"):
        w = wf.read_text(encoding="utf-8")
        if "docs/listings.json" not in w and "git add docs/index.html" in w:
            wf.write_text(w.replace("git add docs/index.html", "git add docs/index.html docs/listings.json"), encoding="utf-8")
            done.append(str(wf.relative_to(repo)))
    readme = repo / "README.md"
    if readme.exists() and "listings.json" not in readme.read_text(encoding="utf-8"):
        readme.write_text(readme.read_text(encoding="utf-8").rstrip("\n") + "\n" + README_NOTE, encoding="utf-8")
        done.append("README.md")
    return done


if __name__ == "__main__":
    print(sys.argv[1], patch(Path(sys.argv[1])))
