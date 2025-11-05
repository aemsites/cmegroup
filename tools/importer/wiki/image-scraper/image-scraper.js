const { chromium } = require('playwright');
const { writeFileSync, mkdirSync, existsSync } = require('fs');
const { join, basename } = require('path');

/**
 * Simple image scraper for Confluence wiki pages using Playwright
 * Usage: node image-scraper.js <wiki-url>
 */

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
    console.log(`✓ Downloaded: ${basename(outputPath)}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to download ${url}:`, error.message);
    return false;
  }
}

function extractPathFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(p => p);
    
    // Extract: /wiki/spaces/EPICSANDBOX/pages/457575539/CME+Group+Client+Systems+Wiki+Overview
    // We want: spaces/EPICSANDBOX/pages/457575539/CME+Group+Client+Systems+Wiki+Overview
    const wikiIndex = pathParts.indexOf('wiki');
    if (wikiIndex >= 0 && wikiIndex < pathParts.length - 1) {
      return pathParts.slice(wikiIndex + 1).join('/');
    }
    
    // Fallback: use the full path
    return pathParts.join('/');
  } catch (error) {
    console.error('Error parsing URL:', error.message);
    return 'default';
  }
}

async function scrapeImages(wikiUrl) {
  console.log(`\n🚀 Starting image scraper for: ${wikiUrl}\n`);

  // Create output directory matching URL structure
  const urlPath = extractPathFromUrl(wikiUrl);
  const outputDir = join(__dirname, 'scraped-images', urlPath);

  console.log(`📁 Output directory: ${outputDir}\n`);

  // Launch browser
  // Use --headless flag or default to headless mode
  const isHeadless = process.argv.includes('--headless') || !process.argv.includes('--visible');
  const browser = await chromium.launch({ 
    headless: isHeadless
  });
  
  console.log(`🌐 Running in ${isHeadless ? 'headless' : 'visible'} mode\n`);
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();

  try {
    console.log('⏳ Loading page...');
    await page.goto(wikiUrl, { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });

    // Wait a bit for dynamic content
    await page.waitForTimeout(2000);

    // Scroll through the page to trigger lazy loading
    console.log('📜 Scrolling through page to trigger lazy loading...');
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

    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    // Scroll back to top
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1000);

    console.log('🔍 Searching for images...\n');

    // Helper function to extract images from a frame
    async function extractImagesFromFrame(frame, frameName = 'main') {
      try {
        const images = await frame.evaluate(() => {
          const imgs = [];
          
          // Get all img elements
          document.querySelectorAll('img').forEach(img => {
            const src = img.src;
            const alt = img.alt || '';
            const width = img.naturalWidth || img.width;
            const height = img.naturalHeight || img.height;
            
            // Filter out tiny images (icons, etc.) and data URLs
            if (src && !src.startsWith('data:') && width > 50 && height > 50) {
              imgs.push({
                src,
                alt,
                width,
                height
              });
            }
          });

          // Also check for background images
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
        console.error(`⚠️  Could not extract images from frame "${frameName}":`, error.message);
        return [];
      }
    }

    // Extract images from main page
    console.log('   Checking main page...');
    let images = await extractImagesFromFrame(page, 'main');

    // Check for iframes and extract images from them
    const frames = page.frames();
    console.log(`   Found ${frames.length} frame(s) (including main)`);
    
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      if (frame !== page.mainFrame()) {
        const frameUrl = frame.url();
        const frameName = frame.name() || `iframe-${i}`;
        console.log(`   Checking ${frameName}: ${frameUrl.substring(0, 80)}...`);
        
        // Scroll within the iframe to trigger lazy loading
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
          console.log(`   ⚠️  Could not scroll in ${frameName}`);
        }
        
        const frameImages = await extractImagesFromFrame(frame, frameName);
        images = images.concat(frameImages);
      }
    }

    // Filter to only valid image types (png, jpg, jpeg, gif)
    const validImages = images.filter(img => isValidImageUrl(img.src));
    
    console.log(`📊 Found ${images.length} total images, ${validImages.length} valid (png/jpg/jpeg/gif)\n`);

    if (validImages.length === 0) {
      console.log('⚠️  No valid images found on this page (only png/jpg/jpeg/gif are downloaded)');
      await browser.close();
      return;
    }

    // Only create folder if we have valid images
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    // Display images info
    validImages.forEach((img, index) => {
      console.log(`${index + 1}. ${img.alt || '(no alt text)'}`);
      console.log(`   Frame: ${img.frame}`);
      console.log(`   Size: ${img.width}x${img.height}`);
      console.log(`   URL: ${img.src}`);
      console.log('');
    });

    // Download images
    console.log('⬇️  Downloading images...\n');
    
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
    console.log(`\n📝 Saved metadata to: metadata.json`);

    console.log(`\n✨ Done! Downloaded ${successCount}/${validImages.length} images`);
    console.log(`📁 Files saved to: ${outputDir}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

// Main execution
const wikiUrl = process.argv[2] || 'https://cmegroupclientsite.atlassian.net/wiki/spaces/EPICSANDBOX/pages/457575539/CME+Group+Client+Systems+Wiki+Overview';

scrapeImages(wikiUrl).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

