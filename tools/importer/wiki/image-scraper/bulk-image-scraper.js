const { chromium } = require('playwright');
const { writeFileSync, mkdirSync, existsSync, readFileSync, appendFileSync } = require('fs');
const { join, basename } = require('path');

/**
 * Bulk image scraper for multiple Confluence wiki pages
 * Usage: node bulk-image-scraper.js <urls-file.txt>
 * 
 * URLs file format: one URL per line
 */

const LOGS_DIR = join(__dirname, 'logs');
const PROGRESS_LOG = join(LOGS_DIR, 'scraping-progress.json');
const ERROR_LOG = join(LOGS_DIR, 'scraping-errors.log');
const SUCCESS_LOG = join(LOGS_DIR, 'scraping-success.log');

// Ensure logs directory exists
if (!existsSync(LOGS_DIR)) {
  mkdirSync(LOGS_DIR, { recursive: true });
}

function extractPathFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(p => p);
    
    const wikiIndex = pathParts.indexOf('wiki');
    if (wikiIndex >= 0 && wikiIndex < pathParts.length - 1) {
      return pathParts.slice(wikiIndex + 1).join('/');
    }
    
    return pathParts.join('/');
  } catch (error) {
    console.error('Error parsing URL:', error.message);
    return null;
  }
}

const VALID_IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif'];

function isValidImageUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();
    const ext = pathname.split('.').pop().split('?')[0];
    return VALID_IMAGE_EXTENSIONS.includes(ext);
  } catch (error) {
    return false;
  }
}

async function downloadImage(url, outputPath) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.status}`);
    }
    const buffer = await response.arrayBuffer();
    writeFileSync(outputPath, Buffer.from(buffer));
    return true;
  } catch (error) {
    console.error(`   ✗ Failed to download ${basename(outputPath)}:`, error.message);
    return false;
  }
}

async function scrapeImagesFromUrl(page, wikiUrl, outputDir) {
  const startTime = Date.now();
  
  try {
    // Navigate to page
    await page.goto(wikiUrl, { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });

    // Wait and scroll main page
    await page.waitForTimeout(2000);
    
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1000);

    // Helper function to extract images from a frame
    async function extractImagesFromFrame(frame, frameName = 'main') {
      try {
        const images = await frame.evaluate(() => {
          const imgs = [];
          
          document.querySelectorAll('img').forEach(img => {
            const src = img.src;
            const alt = img.alt || '';
            const width = img.naturalWidth || img.width;
            const height = img.naturalHeight || img.height;
            
            if (src && !src.startsWith('data:') && width > 50 && height > 50) {
              imgs.push({ src, alt, width, height });
            }
          });

          document.querySelectorAll('*').forEach(el => {
            const style = window.getComputedStyle(el);
            const bgImage = style.backgroundImage;
            if (bgImage && bgImage !== 'none') {
              const match = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
              if (match && match[1] && !match[1].startsWith('data:')) {
                imgs.push({
                  src: match[1],
                  alt: 'background-image',
                  width: el.offsetWidth,
                  height: el.offsetHeight
                });
              }
            }
          });

          return imgs;
        });

        return images.map(img => ({ ...img, frame: frameName }));
      } catch (error) {
        return [];
      }
    }

    // Extract images from main page
    let images = await extractImagesFromFrame(page, 'main');

    // Check iframes
    const frames = page.frames();
    
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      if (frame !== page.mainFrame()) {
        const frameName = frame.name() || `iframe-${i}`;
        
        try {
          await frame.evaluate(async () => {
            await new Promise((resolve) => {
              let totalHeight = 0;
              const distance = 100;
              const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight) {
                  clearInterval(timer);
                  resolve();
                }
              }, 50);
            });
          });
          await frame.evaluate(() => window.scrollTo(0, 0));
          await page.waitForTimeout(500);
        } catch (error) {
          // Silently continue
        }
        
        const frameImages = await extractImagesFromFrame(frame, frameName);
        images = images.concat(frameImages);
      }
    }

    // Filter to only valid image types (png, jpg, jpeg, gif)
    const validImages = images.filter(img => isValidImageUrl(img.src));

    if (validImages.length === 0) {
      return {
        success: true,
        url: wikiUrl,
        imageCount: 0,
        totalImages: images.length,
        duration: Date.now() - startTime,
        message: `No valid images found (found ${images.length} total, filtered to png/jpg/jpeg/gif)`
      };
    }

    // Only create folder if we have valid images
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    // Download images
    const metadata = {
      sourceUrl: wikiUrl,
      scrapedAt: new Date().toISOString(),
      images: []
    };

    let successCount = 0;
    
    for (let i = 0; i < validImages.length; i++) {
      const img = validImages[i];
      const ext = img.src.split('.').pop().split('?')[0] || 'jpg';
      const filename = `image-${i + 1}-${img.width}x${img.height}.${ext}`;
      const outputPath = join(outputDir, filename);
      
      const success = await downloadImage(img.src, outputPath);
      
      if (success) {
        successCount++;
        metadata.images.push({
          filename,
          originalUrl: img.src,
          alt: img.alt,
          width: img.width,
          height: img.height,
          frame: img.frame
        });
      }
    }

    // Save metadata
    const metadataPath = join(outputDir, 'metadata.json');
    writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    return {
      success: true,
      url: wikiUrl,
      imageCount: successCount,
      totalImages: validImages.length,
      duration: Date.now() - startTime
    };

  } catch (error) {
    return {
      success: false,
      url: wikiUrl,
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}

function loadProgress() {
  if (existsSync(PROGRESS_LOG)) {
    try {
      return JSON.parse(readFileSync(PROGRESS_LOG, 'utf8'));
    } catch (error) {
      return { completed: [], failed: [] };
    }
  }
  return { completed: [], failed: [] };
}

function saveProgress(progress) {
  writeFileSync(PROGRESS_LOG, JSON.stringify(progress, null, 2));
}

function logError(url, error) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${url}\n  Error: ${error}\n\n`;
  appendFileSync(ERROR_LOG, logLine);
}

function logSuccess(url, imageCount, duration) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${url} - ${imageCount} images - ${(duration / 1000).toFixed(1)}s\n`;
  appendFileSync(SUCCESS_LOG, logLine);
}

async function bulkScrape(urlsFile) {
  console.log('\n🚀 Bulk Image Scraper for Confluence Wiki\n');

  // Read URLs from file
  if (!existsSync(urlsFile)) {
    console.error(`❌ File not found: ${urlsFile}`);
    console.log('\nCreate a text file with one URL per line, then run:');
    console.log(`   node bulk-image-scraper.js ${urlsFile}`);
    process.exit(1);
  }

  const fileContent = readFileSync(urlsFile, 'utf8');
  const allUrls = fileContent
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#') && line.startsWith('http'));

  console.log(`📄 Loaded ${allUrls.length} URLs from ${urlsFile}\n`);

  // Load progress to support resume
  const progress = loadProgress();
  const urlsToProcess = allUrls.filter(url => !progress.completed.includes(url));

  if (urlsToProcess.length === 0) {
    console.log('✨ All URLs have already been processed!');
    console.log(`   Completed: ${progress.completed.length}`);
    console.log(`   Failed: ${progress.failed.length}`);
    return;
  }

  console.log(`📊 Progress: ${progress.completed.length}/${allUrls.length} completed`);
  console.log(`⏭️  Resuming with ${urlsToProcess.length} remaining URLs\n`);

  // Launch browser once for all URLs (reuse for efficiency)
  const isHeadless = process.argv.includes('--headless') || !process.argv.includes('--visible');
  console.log(`🌐 Launching browser in ${isHeadless ? 'headless' : 'visible'} mode\n`);
  
  const browser = await chromium.launch({ 
    headless: isHeadless
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();

  let processedCount = 0;
  let successCount = 0;
  let failCount = 0;

  for (const url of urlsToProcess) {
    processedCount++;
    const currentIndex = allUrls.indexOf(url) + 1;
    
    console.log(`\n[${ currentIndex}/${allUrls.length}] Processing: ${url}`);
    
    const urlPath = extractPathFromUrl(url);
    if (!urlPath) {
      console.log('   ⚠️  Invalid URL format, skipping');
      progress.failed.push(url);
      logError(url, 'Invalid URL format');
      saveProgress(progress);
      continue;
    }

    const outputDir = join(__dirname, 'scraped-images', urlPath);
    
    // Skip if already scraped (has metadata.json)
    if (existsSync(join(outputDir, 'metadata.json'))) {
      console.log('   ⏭️  Already scraped, skipping');
      progress.completed.push(url);
      saveProgress(progress);
      continue;
    }

    const result = await scrapeImagesFromUrl(page, url, outputDir);

    if (result.success) {
      if (result.imageCount === 0) {
        console.log(`   ⚠️  ${result.message || 'No valid images found'}`);
      } else {
        console.log(`   ✓ Success: ${result.imageCount} images in ${(result.duration / 1000).toFixed(1)}s`);
      }
      progress.completed.push(url);
      logSuccess(url, result.imageCount, result.duration);
      successCount++;
    } else {
      console.log(`   ✗ Failed: ${result.error}`);
      progress.failed.push(url);
      logError(url, result.error);
      failCount++;
    }

    saveProgress(progress);

    // Progress summary every 10 URLs
    if (processedCount % 10 === 0) {
      const remaining = urlsToProcess.length - processedCount;
      console.log(`\n📊 Progress Update:`);
      console.log(`   Completed: ${progress.completed.length}/${allUrls.length}`);
      console.log(`   Success: ${successCount} | Failed: ${failCount} | Remaining: ${remaining}\n`);
    }
  }

  await browser.close();

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('✨ Bulk Scraping Complete!');
  console.log('='.repeat(60));
  console.log(`Total URLs: ${allUrls.length}`);
  console.log(`Completed: ${progress.completed.length}`);
  console.log(`Failed: ${progress.failed.length}`);
  console.log(`\n📁 Images saved to: scraped-images/`);
  console.log(`📝 Logs:`);
  console.log(`   Progress: ${PROGRESS_LOG}`);
  console.log(`   Errors: ${ERROR_LOG}`);
  console.log(`   Success: ${SUCCESS_LOG}`);
  console.log('='.repeat(60) + '\n');
}

// Main execution
const urlsFile = process.argv[2] || 'wiki-urls.txt';

bulkScrape(urlsFile).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

