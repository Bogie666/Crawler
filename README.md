# LEX Site Map Dashboard

Live site architecture map for lexairconditioning.com. Crawls nightly via GitHub Actions and auto-deploys to Vercel.

## What It Does

- Crawls the full LEX website every night at 2am CT
- Detects: 404 broken links, missing meta descriptions, orphaned pages, missing schema markup
- Commits results to the repo → Vercel auto-deploys → dashboard is always current

## Setup (One Time)

### 1. Create GitHub Repo

```bash
git init
git add .
git commit -m "Initial commit"
gh repo create lex-sitemap --private --push
```

Or create the repo on github.com and push manually.

### 2. Connect to Vercel

1. Go to vercel.com → New Project → Import your GitHub repo
2. Framework: Next.js (auto-detected)
3. No env vars needed
4. Deploy

### 3. Enable GitHub Actions

The workflow file is already in `.github/workflows/crawl.yml`.
GitHub Actions is enabled by default on all repos.

**Important:** The workflow needs permission to push back to the repo.
Go to: Repo Settings → Actions → General → Workflow permissions → Select "Read and write permissions"

### 4. Run the First Crawl

In your GitHub repo, go to Actions → "Nightly Site Crawl" → "Run workflow"

This runs the crawler, commits `public/crawl-data.json`, and Vercel deploys automatically.

After that, it runs every night at 2am CT without you doing anything.

## Running the Crawler Locally

```bash
cd crawler
pip install -r requirements.txt
python crawl.py
```

## Project Structure

```
lex-sitemap/
├── .github/
│   └── workflows/
│       └── crawl.yml          # GitHub Actions schedule
├── crawler/
│   ├── crawl.py               # Python crawler
│   └── requirements.txt
├── pages/
│   ├── _app.js
│   └── index.js               # Dashboard UI
├── public/
│   └── crawl-data.json        # Output of crawler (auto-updated)
├── styles/
│   └── globals.css
└── package.json
```

## Issues Tracked

| Issue | Description |
|-------|-------------|
| Broken (404) | Page returns a 404 status |
| Missing Meta | No meta description tag |
| No Schema | No JSON-LD schema markup found |
| Orphaned | No internal links point to this page |
| Too Deep | Page is 4+ levels deep in site structure |
| Missing H1 | No H1 tag found |
| Multiple H1s | More than one H1 tag |
