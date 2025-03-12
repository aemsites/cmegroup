const postcss = require('postcss');
const postcssImport = require('postcss-import');
const { glob } = require('glob');
const fs = require('fs-extra');
const path = require('path');

async function buildBlockCSS(specificBlocks = []) {
  const blockFolders = specificBlocks.length > 0
    ? specificBlocks.map(block => `aemedge/blocks/${block}`)
    : await glob('aemedge/blocks/*');
  
  for (const blockFolder of blockFolders) {
    const mainCssFile = path.join(blockFolder, `${path.basename(blockFolder)}.css`);
    const importsFile = path.join(blockFolder, `${path.basename(blockFolder)}.imports.css`);
    
    if (!fs.existsSync(importsFile)) {
      console.log(`Skipping ${blockFolder} - imports file not found`);
      continue;
    }

    try {
      const css = fs.readFileSync(importsFile, 'utf8');
      
      if (!css.includes('@import')) {
        console.log(`Skipping ${blockFolder} - no imports found`);
        continue;
      }
      
      // Process with PostCSS
      const bundled = await postcss([
        postcssImport({
          filter: (filename) => !filename.includes('/external/'),
        })
      ]).process(css, {
        from: importsFile,
        to: mainCssFile
      });

      // Remove any existing stylelint comments
      let processedCSS = bundled.css.replace(/\/\* stylelint-disable[^*]*\*\/|\/\* stylelint-enable[^*]*\*\//g, '');
      
      // Add single stylelint-disable at the top
      const disableComment = '/* stylelint-disable */\n';
      const enableComment = '\n/* stylelint-enable */';
      const finalCSS = disableComment + processedCSS + enableComment;

      await fs.writeFile(mainCssFile, finalCSS);
      
      console.log(`Built CSS for ${blockFolder}`);
    } catch (error) {
      console.error(`Error processing ${blockFolder}:`, error);
    }
  }
}

// Get block names from command line arguments
const blockNames = process.argv.slice(2);
buildBlockCSS(blockNames).catch(console.error); 