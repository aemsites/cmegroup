const postcss = require('postcss');
const postcssImport = require('postcss-import');
const { glob } = require('glob');
const fs = require('fs-extra');
const path = require('path');

async function buildGlobalStyles() {
  const stylesPath = path.join('aemedge', 'styles', 'styles.css');
  if (!fs.existsSync(stylesPath)) {
    console.error(`Global styles not found at ${stylesPath}`);
    return;
  }

  try {
    const css = fs.readFileSync(stylesPath, 'utf8');

    if (!css.includes('@import')) {
      console.log('Skipping global styles - no @import found');
      return;
    }

    const bundled = await postcss([
      postcssImport({
        filter: (filename) => !filename.includes('/external/'),
      }),
    ]).process(css, {
      from: stylesPath,
      to: stylesPath,
    });

    // Write flattened CSS back to styles.css
    await fs.writeFile(stylesPath, bundled.css);
    console.log('Built global styles.css');
  } catch (error) {
    console.error('Error processing global styles:', error);
  }
}

async function buildBlockCSS(specificBlocks = []) {
  const blockFolders = specificBlocks.length > 0
    ? specificBlocks.map(block => `aemedge/blocks/${block}`)
    : await glob('aemedge/blocks/*');
  
  for (const blockFolder of blockFolders) {
    const mainCssFile = path.join(blockFolder, `${path.basename(blockFolder)}.css`);
    const importsFile = path.join(blockFolder, `${path.basename(blockFolder)}.imports.css`);
    
    try {
      let sourceFile = null;
      let css = '';

      // Prefer explicit *.imports.css if present
      if (fs.existsSync(importsFile)) {
        sourceFile = importsFile;
        css = fs.readFileSync(importsFile, 'utf8');
      } else if (fs.existsSync(mainCssFile)) {
        // Fallback: flatten @import directly inside <block>.css
        sourceFile = mainCssFile;
        css = fs.readFileSync(mainCssFile, 'utf8');
      } else {
        console.log(`Skipping ${blockFolder} - no CSS found`);
        continue;
      }

      if (!css.includes('@import')) {
        console.log(`Skipping ${blockFolder} - no @import found`);
        continue;
      }

      // Process with PostCSS (inline imports)
      const bundled = await postcss([
        postcssImport({
          filter: (filename) => !filename.includes('/external/'),
        }),
      ]).process(css, {
        from: sourceFile,
        to: mainCssFile,
      });

      // Remove any existing stylelint comments
      let processedCSS = bundled.css.replace(/\/\* stylelint-disable[^*]*\*\/|\/\* stylelint-enable[^*]*\*\//g, '');
      
      // Add single stylelint-disable at the top
      const disableComment = '/* stylelint-disable */\n';
      const enableComment = '\n/* stylelint-enable */';
      const finalCSS = disableComment + processedCSS + enableComment;

      await fs.writeFile(mainCssFile, finalCSS);
      
      console.log(`Built CSS for ${blockFolder} (${path.basename(sourceFile)} -> ${path.basename(mainCssFile)})`);
    } catch (error) {
      console.error(`Error processing ${blockFolder}:`, error);
    }
  }
}

// CLI
const args = process.argv.slice(2);
const doGlobal = args.includes('--global');
const blockNames = args.filter((a) => a !== '--global');

(async () => {
  if (doGlobal) {
    await buildGlobalStyles();
  }
  await buildBlockCSS(blockNames);
})().catch(console.error);