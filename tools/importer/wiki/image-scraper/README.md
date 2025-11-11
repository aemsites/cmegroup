# Image Scraper for Confluence Wiki

This folder contains tools for scraping images from Confluence wiki pages.

## Quick Start

```bash
# Navigate to this directory
cd tools/importer/wiki/image-scraper

# For a single URL
node image-scraper.js <wiki-url>

# For bulk scraping (1500+ URLs)
node bulk-image-scraper.js wiki-urls.txt
```

## Contents

- **`image-scraper.js`** - Single page scraper
  - [Full documentation](./IMAGE_SCRAPER.md)
  
- **`bulk-image-scraper.js`** - Batch scraper for 1500+ URLs
  - [Full documentation](./BULK_SCRAPER.md)
  
- **`wiki-urls.txt`** - Input file for bulk scraper (one URL per line)

- **`scraped-images/`** - Output directory (mirrors wiki URL structure)

- **`logs/`** - Log files directory (created during bulk scraping)
  - `scraping-progress.json` - Resume checkpoint
  - `scraping-errors.log` - Error log  
  - `scraping-success.log` - Success log

## Key Features

✅ Only downloads png, jpg, jpeg, gif images  
✅ Only creates folders when valid images are found  
✅ Scrolls pages and iframes to trigger lazy loading  
✅ Resumable bulk processing  
✅ Organized output matching wiki structure  

## Installation

First time only (from project root):

```bash
cd /Users/saluja/Desktop/WorkArea/Franklin/cmegroup
npm install -D playwright
npx playwright install chromium
```

## Usage Examples

### Single Page

```bash
# Headless mode (default)
node image-scraper.js "https://example.com/wiki/spaces/SPACE/pages/123456/Page+Title"

# Visible mode (for debugging)
node image-scraper.js "https://example.com/wiki/spaces/SPACE/pages/123456/Page+Title" --visible
```

### Bulk Processing

```bash
# Create or edit wiki-urls.txt with your URLs
# Then run:
node bulk-image-scraper.js wiki-urls.txt

# With visible browser (debugging)
node bulk-image-scraper.js wiki-urls.txt --visible
```

## Output Structure

```
image-scraper/
├── scraped-images/
│   └── spaces/
│       └── EPICSANDBOX/
│           └── pages/
│               └── 457575539/
│                   └── CME+Group+Client+Systems+Wiki+Overview/
│                       ├── image-1-1920x1080.png
│                       ├── image-2-800x600.jpg
│                       └── metadata.json
└── logs/
    ├── scraping-progress.json
    ├── scraping-errors.log
    └── scraping-success.log
```

## Documentation

- [Single Page Scraper Guide](./IMAGE_SCRAPER.md)
- [Bulk Scraper Guide](./BULK_SCRAPER.md)

## Tips

- Use **headless mode** for production (default)
- Use **visible mode** (`--visible` flag) for debugging
- Bulk scraper automatically resumes if interrupted
- Check logs for progress and errors
- All output stays in this folder (no pollution of parent directories)

