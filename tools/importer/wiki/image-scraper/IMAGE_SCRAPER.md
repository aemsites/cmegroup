# Image Scraper for Confluence Wiki

A simple standalone script to scrape images from Confluence wiki pages, including images inside iframes.

> **📦 Need to scrape multiple pages?** See [BULK_SCRAPER.md](./BULK_SCRAPER.md) for batch processing 1500+ URLs efficiently.

## Installation

First, install Playwright and Chromium:

```bash
npm install -D playwright
npx playwright install chromium
```

## Usage

Run the script with a Confluence wiki URL:

```bash
# From project root - Default: runs in headless mode (background)
node tools/importer/wiki/image-scraper/image-scraper.js <wiki-url>

# OR from the image-scraper directory
cd tools/importer/wiki/image-scraper
node image-scraper.js <wiki-url>

# Run with visible browser (useful for debugging)
node image-scraper.js <wiki-url> --visible

# Use default URL (CME Group Client Systems Wiki Overview)
node image-scraper.js

# Use default URL with visible browser
node image-scraper.js --visible
```

## Features

- ✅ Extracts images from main page
- ✅ Extracts images from all iframes
- ✅ Scrolls through page and iframes to trigger lazy loading
- ✅ Triggers intersection observers and scroll event listeners
- ✅ **Only downloads png, jpg, jpeg, gif images**
- ✅ **Only creates folders when valid images are found**
- ✅ Filters out tiny images (icons, etc.)
- ✅ Downloads images with descriptive filenames
- ✅ Creates metadata JSON with image info
- ✅ Shows progress in real-time
- ✅ Runs in headless mode by default (use `--visible` flag to see browser)

## Output

Images are saved to a folder structure that mirrors the wiki URL structure:
```
tools/importer/wiki/scraped-images/
└── spaces/
    └── EPICSANDBOX/
        └── pages/
            └── 457575539/
                └── CME+Group+Client+Systems+Wiki+Overview/
                    ├── image-1-1920x1080.png
                    ├── image-2-800x600.jpg
                    ├── ...
                    └── metadata.json
```

For example:
- URL: `https://example.com/wiki/spaces/MYSPACE/pages/123456/Page+Title`
- Output: `scraped-images/spaces/MYSPACE/pages/123456/Page+Title/`

The `metadata.json` file contains:
- Source URL
- Timestamp
- For each image:
  - Filename
  - Original URL
  - Alt text
  - Dimensions
  - Frame source (main page or iframe name)

## Configuration

### Command Line Options
- `--visible` - Show browser window (helpful for debugging)
- `--headless` - Run without browser UI (default behavior)

### Script Configuration

Edit `image-scraper.js` to adjust:

- Minimum image size (currently 50x50 pixels)
- Timeout settings  
- Wait time for dynamic content
- Scroll speed and behavior

## Example Output

```
🚀 Starting image scraper for: https://cmegroupclientsite.atlassian.net/wiki/spaces/EPICSANDBOX/pages/457575539/CME+Group+Client+Systems+Wiki+Overview

📁 Output directory: tools/importer/wiki/scraped-images/spaces/EPICSANDBOX/pages/457575539/CME+Group+Client+Systems+Wiki+Overview

🌐 Running in headless mode

⏳ Loading page...
📜 Scrolling through page to trigger lazy loading...
🔍 Searching for images...

   Checking main page...
   Found 3 frame(s) (including main)
   Checking iframe-1: https://example.com/content/frame1...
   
📊 Found 20 total images, 15 valid (png/jpg/jpeg/gif)

1. CME Group Overview Diagram
   Frame: iframe-1
   Size: 1920x1080
   URL: https://example.com/images/overview.png

...

⬇️  Downloading images...

✓ Downloaded: image-1-1920x1080.png
✓ Downloaded: image-2-800x600.jpg
...

📝 Saved metadata to: metadata.json

✨ Done! Downloaded 15/15 images
📁 Files saved to: scraped-images/spaces/EPICSANDBOX/pages/457575539/CME+Group+Client+Systems+Wiki+Overview
```

