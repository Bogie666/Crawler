#!/usr/bin/env python3
"""
LEX Air Conditioning - Site Crawler
Tracks: page structure, 404s, meta descriptions, orphaned pages, schema markup.
"""

import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import json
import time
from datetime import datetime, timezone
from collections import defaultdict
import sys

BASE_URL = "https://lexairconditioning.com"
OUTPUT_PATH = "public/crawl-data.json"
MAX_PAGES = 500
DELAY = 0.5
HEADERS = {
    "User-Agent": "LEX-SiteMapper/1.0 (Internal SEO Tool; +https://lexairconditioning.com)"
}

def normalize_url(url):
    parsed = urlparse(url)
    path = parsed.path.rstrip("/") or "/"
    return f"{parsed.scheme}://{parsed.netloc}{path}"

def is_internal(url):
    parsed = urlparse(url)
    base_netloc = urlparse(BASE_URL).netloc
    return parsed.netloc == base_netloc or parsed.netloc == ""

def get_depth(url):
    path = urlparse(url).path.rstrip("/")
    if not path or path == "/":
        return 0
    return len([p for p in path.split("/") if p])

def get_schema_types(soup):
    scripts = soup.find_all("script", {"type": "application/ld+json"})
    types = []
    for script in scripts:
        try:
            data = json.loads(script.string or "")
            if isinstance(data, dict):
                t = data.get("@type", "")
                if t: types.append(t)
            elif isinstance(data, list):
                for item in data:
                    t = item.get("@type", "")
                    if t: types.append(t)
        except Exception:
            pass
    return types

def crawl():
    visited = {}
    queue = [(BASE_URL + "/", None, 0)]
    inbound_links = defaultdict(set)
    crawl_errors = []
    queued = set([normalize_url(BASE_URL + "/")])

    print(f"Starting crawl of {BASE_URL}")
    start_time = time.time()

    while queue and len(visited) < MAX_PAGES:
        url, parent, depth = queue.pop(0)
        normalized = normalize_url(url)
        if normalized in visited:
            continue

        print(f"  [{len(visited)+1}] {normalized}")
        time.sleep(DELAY)

        try:
            resp = requests.get(normalized, headers=HEADERS, timeout=10, allow_redirects=True)
            status_code = resp.status_code
            final_url = normalize_url(resp.url)
            was_redirected = final_url != normalized

            soup = BeautifulSoup(resp.text, "html.parser") if status_code == 200 else None

            title = meta_description = canonical = ""
            schema_types = []
            has_schema_markup = False
            h1_count = 0

            if soup:
                title_tag = soup.find("title")
                title = title_tag.get_text(strip=True) if title_tag else ""

                meta_desc = soup.find("meta", {"name": "description"})
                meta_description = meta_desc.get("content", "").strip() if meta_desc else ""

                canonical_tag = soup.find("link", {"rel": "canonical"})
                canonical = canonical_tag.get("href", "").strip() if canonical_tag else ""

                schema_types = get_schema_types(soup)
                has_schema_markup = len(schema_types) > 0
                h1_count = len(soup.find_all("h1"))

                for a in soup.find_all("a", href=True):
                    href = a["href"].strip()
                    if not href or href.startswith("#") or href.startswith("mailto:") or href.startswith("tel:"):
                        continue
                    abs_url = normalize_url(urljoin(normalized, href))
                    if is_internal(abs_url):
                        inbound_links[abs_url].add(normalized)
                        if abs_url not in visited and abs_url not in queued:
                            queue.append((abs_url, normalized, get_depth(abs_url)))
                            queued.add(abs_url)

            issues = []
            if status_code == 404:
                issues.append({"type": "broken", "message": "Page returns 404"})
            if status_code >= 500:
                issues.append({"type": "server_error", "message": f"Server error {status_code}"})
            if soup and not meta_description:
                issues.append({"type": "missing_meta", "message": "Missing meta description"})
            if soup and not has_schema_markup:
                issues.append({"type": "no_schema", "message": "No schema markup detected"})
            if soup and h1_count == 0:
                issues.append({"type": "missing_h1", "message": "No H1 tag found"})
            if soup and h1_count > 1:
                issues.append({"type": "multiple_h1", "message": f"Multiple H1 tags ({h1_count})"})
            if depth >= 4:
                issues.append({"type": "deep_page", "message": f"Page is {depth} levels deep"})

            visited[normalized] = {
                "url": normalized, "parent": parent, "depth": depth,
                "status_code": status_code, "title": title,
                "meta_description": meta_description, "canonical": canonical,
                "has_schema": has_schema_markup, "schema_types": schema_types,
                "h1_count": h1_count, "child_count": 0, "inbound_count": 0,
                "issues": issues, "was_redirected": was_redirected,
                "redirected_to": final_url if was_redirected else None,
            }

        except requests.exceptions.RequestException as e:
            print(f"    ERROR: {e}")
            crawl_errors.append({"url": normalized, "error": str(e)})
            visited[normalized] = {
                "url": normalized, "parent": parent, "depth": depth,
                "status_code": 0, "title": "", "meta_description": "",
                "canonical": "", "has_schema": False, "schema_types": [],
                "h1_count": 0, "child_count": 0, "inbound_count": 0,
                "issues": [{"type": "request_error", "message": str(e)}],
                "was_redirected": False, "redirected_to": None,
            }

    # Post-process
    child_counts = defaultdict(int)
    for url, data in visited.items():
        inbound = inbound_links.get(url, set())
        data["inbound_count"] = len(inbound)
        data["inbound_links"] = list(inbound)[:10]
        if url != normalize_url(BASE_URL + "/") and len(inbound) == 0:
            data["issues"].append({"type": "orphan", "message": "No internal links point to this page"})
        if data["parent"]:
            child_counts[data["parent"]] += 1
    for url, data in visited.items():
        data["child_count"] = child_counts[url]

    pages = list(visited.values())
    issue_counts = defaultdict(int)
    for page in pages:
        for issue in page["issues"]:
            issue_counts[issue["type"]] += 1

    summary = {
        "crawled_at": datetime.now(timezone.utc).isoformat(),
        "base_url": BASE_URL,
        "total_pages": len(pages),
        "crawl_duration_seconds": round(time.time() - start_time, 1),
        "max_depth": max((p["depth"] for p in pages), default=0),
        "issue_counts": dict(issue_counts),
        "total_issues": sum(len(p["issues"]) for p in pages),
        "pages_with_issues": sum(1 for p in pages if p["issues"]),
        "crawl_errors": crawl_errors,
    }

    output = {"summary": summary, "pages": pages}
    with open(OUTPUT_PATH, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\nDone! {len(pages)} pages, {summary['total_issues']} issues, {summary['crawl_duration_seconds']}s")
    return summary

if __name__ == "__main__":
    try:
        crawl()
        sys.exit(0)
    except Exception as e:
        print(f"FATAL: {e}")
        sys.exit(1)
