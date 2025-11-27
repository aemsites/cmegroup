# Bulk Image Scraper for Confluence Wiki

Scrape images from hundreds or thousands of Confluence wiki pages efficiently.

## Quick Start

### 1. Create a URLs file

Create a text file with one URL per line:

```bash
# wiki-urls.txt
https://example.com/wiki/spaces/SPACE/pages/123456/Page+One
https://example.com/wiki/spaces/SPACE/pages/123457/Page+Two
https://example.com/wiki/spaces/SPACE/pages/123458/Page+Three
# ... 1500 more URLs
```

### 2. Run the bulk scraper

```bash
# From project root
node tools/importer/wiki/image-scraper/bulk-image-scraper.js tools/importer/wiki/image-scraper/wiki-urls.txt

# OR from the image-scraper directory (easier)
cd tools/importer/wiki/image-scraper
node bulk-image-scraper.js wiki-urls.txt

# With visible browser (slower, for debugging)
node bulk-image-scraper.js wiki-urls.txt --visible
```

## Key Features

✅ **Efficient** - Reuses single browser instance for all URLs  
✅ **Resumable** - Automatically resumes if interrupted  
✅ **Smart Skipping** - Skips already-scraped pages  
✅ **Image Filtering** - Only downloads png, jpg, jpeg, gif images  
✅ **No Empty Folders** - Only creates folders when valid images are found  
✅ **Progress Tracking** - Shows real-time progress  
✅ **Comprehensive Logging** - Logs all successes and failures  
✅ **Error Handling** - One failure won't stop the entire batch  
✅ **Lazy Loading** - Scrolls through pages and iframes  
✅ **Organized Output** - Mirrors wiki URL structure  

## Image Filtering

The scraper **only downloads** these image formats:
- `.png`
- `.jpg` 
- `.jpeg`
- `.gif`

All other formats (SVG, WebP, AVIF, etc.) are automatically filtered out.

**Folder Creation:**
- Folders are **only created** when valid images (png/jpg/jpeg/gif) are found
- Pages with no valid images won't create empty folders
- This keeps your output directory clean and organized

## Progress & Logging

The scraper creates a `logs/` folder with three files:

### `logs/scraping-progress.json`
Tracks which URLs have been completed or failed. Used for resuming.

```json
{
  "completed": [
    "https://example.com/wiki/spaces/SPACE/pages/123456/Page+One",
    "https://example.com/wiki/spaces/SPACE/pages/123457/Page+Two"
  ],
  "failed": [
    "https://example.com/wiki/spaces/SPACE/pages/999999/Bad+Page"
  ]
}
```

### `logs/scraping-errors.log`
Detailed error log for failed URLs:

```
[2025-10-28T14:30:00.000Z] https://example.com/wiki/page1
  Error: Navigation timeout

[2025-10-28T14:35:00.000Z] https://example.com/wiki/page2
  Error: Failed to download: 404
```

### `logs/scraping-success.log`
Success log with image counts and timing:

```
[2025-10-28T14:25:00.000Z] https://example.com/wiki/page1 - 15 images - 12.5s
[2025-10-28T14:26:00.000Z] https://example.com/wiki/page2 - 8 images - 8.2s
```

## Output Structure

All output is contained within the `image-scraper` folder. Images are organized by URL path:

```
tools/importer/wiki/image-scraper/
├── bulk-image-scraper.js
├── image-scraper.js
├── wiki-urls.txt
├── logs/ (created during run)
│   ├── scraping-progress.json
│   ├── scraping-errors.log
│   └── scraping-success.log
└── scraped-images/
    └── spaces/
        └── EPICSANDBOX/
            └── pages/
                ├── 123456/
                │   └── Page+One/
                │       ├── image-1-1920x1080.png
                │       ├── image-2-800x600.jpg
                │       └── metadata.json
                ├── 123457/
                │   └── Page+Two/
                │       ├── image-1-1024x768.png
                │       └── metadata.json
                └── 123458/
                    └── Page+Three/
                        └── metadata.json
```

## Resume After Interruption

If the scraper is interrupted (Ctrl+C, crash, timeout), simply run it again:

```bash
# From image-scraper directory
cd tools/importer/wiki/image-scraper
node bulk-image-scraper.js wiki-urls.txt
```

It will:
1. Read `logs/scraping-progress.json`
2. Skip already-completed URLs
3. Continue from where it left off

## Example Output

```
🚀 Bulk Image Scraper for Confluence Wiki

📄 Loaded 1500 URLs from wiki-urls.txt

📊 Progress: 250/1500 completed
⏭️  Resuming with 1250 remaining URLs

🌐 Launching browser in headless mode

[251/1500] Processing: https://example.com/wiki/spaces/SPACE/pages/457575539/Overview
   ✓ Success: 15 images in 12.5s

[252/1500] Processing: https://example.com/wiki/spaces/SPACE/pages/457575540/Details
   ✓ Success: 8 images in 8.2s

[253/1500] Processing: https://example.com/wiki/spaces/SPACE/pages/457575541/Guide
   ⚠️  No valid images found (found 5 total, filtered to png/jpg/jpeg/gif)

[254/1500] Processing: https://example.com/wiki/spaces/SPACE/pages/457575542/Tutorial
   ✗ Failed: Navigation timeout

...

[260/1500] Processing: ...
   ✓ Success: 12 images in 10.1s

📊 Progress Update:
   Completed: 260/1500
   Success: 258 | Failed: 2 | Remaining: 1240

...

============================================================
✨ Bulk Scraping Complete!
============================================================
Total URLs: 1500
Completed: 1498
Failed: 2

📁 Images saved to: scraped-images/
📝 Logs:
   Progress: logs/scraping-progress.json
   Errors: logs/scraping-errors.log
   Success: logs/scraping-success.log
============================================================
```

## Performance Tips

### For 1500 URLs:

**Headless Mode (Recommended)**
```bash
cd tools/importer/wiki/image-scraper
node bulk-image-scraper.js wiki-urls.txt
```
- Estimated time: 3-6 hours (depends on page complexity)
- ~5-15 seconds per page average
- Lower CPU usage

**Visible Mode (Debugging Only)**
```bash
cd tools/importer/wiki/image-scraper
node bulk-image-scraper.js wiki-urls.txt --visible
```
- Slower due to rendering
- Only use for debugging first 10-20 URLs

### Handling Large Batches

**Split into chunks:**
```bash
# Create multiple URL files
split -l 500 wiki-urls.txt chunk-

# Run them separately
node bulk-image-scraper.js chunk-aa
node bulk-image-scraper.js chunk-ab
node bulk-image-scraper.js chunk-ac
```

**Run overnight:**
```bash
# Use nohup to keep running after logout
cd tools/importer/wiki/image-scraper
nohup node bulk-image-scraper.js wiki-urls.txt > scraping-output.log 2>&1 &

# Check progress later
tail -f scraping-output.log
```

## Troubleshooting

### "Already scraped, skipping"
The scraper found `metadata.json` in the output folder. To re-scrape:
```bash
rm -rf scraped-images/spaces/SPACE/pages/123456/
```

### Retry Failed URLs
Extract failed URLs from progress:
```bash
# Create a file with only failed URLs
node -e "console.log(JSON.parse(require('fs').readFileSync('logs/scraping-progress.json')).failed.join('\n'))" > failed-urls.txt

# Retry them
node bulk-image-scraper.js failed-urls.txt
```

### Memory Issues
For very large batches (5000+), restart browser periodically by splitting into chunks.

## Configuration

Edit `bulk-image-scraper.js` to adjust:

- `timeout: 60000` - Navigation timeout (60 seconds)
- `width > 50 && height > 50` - Minimum image size filter
- `processedCount % 10 === 0` - Progress update frequency
- Scroll speeds and wait times

## Comparison: Single vs Bulk

| Feature | Single Scraper | Bulk Scraper |
|---------|---------------|--------------|
| URLs | One at a time | Multiple (1500+) |
| Browser | New for each run | Reused for all URLs |
| Resume | Manual | Automatic |
| Progress | None | JSON + Logs |
| Time for 1500 URLs | ~10 hours* | ~3-6 hours |

*Including manual restart time

## Next Steps

1. Navigate to the image-scraper directory: `cd tools/importer/wiki/image-scraper`
2. Create your `wiki-urls.txt` file with all 1500 URLs (or use existing one)
3. Run `npx playwright install chromium` (first time only, from project root)
4. Start the scraper: `node bulk-image-scraper.js wiki-urls.txt`
5. Monitor progress in the logs folder: `logs/scraping-progress.json`, `logs/scraping-errors.log`, `logs/scraping-success.log`
6. Let it run to completion (or resume later)

All output (images, logs, progress) stays organized in the `image-scraper` folder with logs in the `logs/` subfolder!

Happy scraping! 🚀

