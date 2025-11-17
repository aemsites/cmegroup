/**
 * Create Product Module
 * Handles product creation from templates
 */

import { copyResource, createOrUpdateHTML } from '../shared/api.js';
import { $, showToast } from '../shared/ui.js';
import { getToken } from '../shared/state.js';

// Tab display name mapping
const TAB_DISPLAY_NAMES = {
  overview: 'Overview',
  quotes: 'Quotes',
  settlements: 'Settlements',
  volume: 'Volume & OI',
  specs: 'Specs',
  margins: 'Margins',
  calendar: 'Calendar',
};

/**
 * Parse org/site from input field
 */
function parseOrgSite() {
  const orgSitePath = $('#org-site-path')?.value?.trim();
  if (!orgSitePath) return null;

  const cleanPath = orgSitePath.startsWith('/') ? orgSitePath.substring(1) : orgSitePath;
  const parts = cleanPath.split('/').filter((part) => part.length > 0);

  if (parts.length >= 2) {
    return { org: parts[0], site: parts[1] };
  }
  return null;
}

/**
 * Get selected tabs
 */
function getSelectedTabs() {
  return Array.from(document.querySelectorAll('.tab-checkbox'))
    .filter((cb) => cb.checked)
    .map((cb) => cb.value);
}

/**
 * Set all tabs checked/unchecked
 */
function setAllTabs(checked) {
  document.querySelectorAll('.tab-checkbox').forEach((cb) => {
    cb.checked = checked;
  });
}

/**
 * Generate product HTML structure
 */
function generateProductHTML(metadata) {
  const {
    title, description, productName, productId, tabs,
  } = metadata;

  // Build the product-tabs HTML
  const tabsHTML = tabs.map((tab) => {
    const tabTitle = TAB_DISPLAY_NAMES[tab] || tab.charAt(0).toUpperCase() + tab.slice(1);
    return `<div><div><p>${tabTitle}</p></div><div><p>${tab}</p></div></div>`;
  }).join('');

  // Generate complete HTML structure
  const html = `<body>
  <header></header>
  <main>
    <div>
      <h2></h2>
      <div class="hero-baseball"></div>
      <div class="section-metadata">
        <div>
          <div><p>Style</p></div>
          <div><p>Full Width</p></div>
        </div>
      </div>
    </div>
    <div>
      <div class="product-tabs">
${tabsHTML}
      </div>
    </div>
    <div>
      <div class="metadata">
        <div>
          <div><p>Title</p></div>
          <div><p>${title}</p></div>
        </div>
        <div>
          <div><p>Description</p></div>
          <div><p>${description}</p></div>
        </div>
        <div>
          <div><p>Template</p></div>
          <div><p>product</p></div>
        </div>
        <div>
          <div><p>Product</p></div>
          <div><p>${productName}</p></div>
        </div>
        <div>
          <div><p>Product Id</p></div>
          <div><p>${productId}</p></div>
        </div>
      </div>
    </div>
  </main>
  <footer></footer>
</body>
`;

  return html;
}

/**
 * Create product landing page with metadata
 */
async function createProductLandingPage(org, site, folder, slug, metadata) {
  const token = getToken();
  const htmlPath = `${folder}/${slug}.html`;

  try {
    // Generate the HTML content with metadata
    const htmlContent = generateProductHTML(metadata);

    // Save the content
    const saveResponse = await createOrUpdateHTML(token, org, site, htmlPath, htmlContent);

    if (!saveResponse.ok) {
      throw new Error(`Failed to create page: ${saveResponse.status}`);
    }

    // eslint-disable-next-line no-console
    console.log('Product landing page created successfully:', slug);
    showToast('Product landing page created successfully!', 'success');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error creating product page:', error);
    throw error;
  }
}

/**
 * Main create product function
 */
export async function createProduct() {
  const orgSite = parseOrgSite();
  const sourcePath = $('#source-path')?.value?.trim() || '';
  const destinationFolder = $('#destination-folder')?.value?.trim() || '';
  const title = $('#product-title')?.value?.trim() || '';
  const description = $('#product-description')?.value?.trim() || '';
  const productName = $('#product-name')?.value?.trim() || '';
  const productId = $('#product-id')?.value?.trim() || '';
  const productSlug = $('#product-slug')?.value?.trim() || '';
  const tabs = getSelectedTabs();

  // Validation
  if (!orgSite) {
    showToast('Please enter Organization/Site in format: /org/site', 'error');
    return;
  }

  const { org, site } = orgSite;
  if (!sourcePath) {
    showToast('Please enter Source path', 'error');
    return;
  }
  if (!destinationFolder) {
    showToast('Please enter Destination folder', 'error');
    return;
  }
  if (!title) {
    showToast('Please enter Title', 'error');
    return;
  }
  if (!productName) {
    showToast('Please enter Product Name', 'error');
    return;
  }
  if (!productId) {
    showToast('Please enter Product ID', 'error');
    return;
  }
  if (!productSlug) {
    showToast('Please enter Product Slug', 'error');
    return;
  }
  if (tabs.length === 0) {
    showToast('Please select at least one tab', 'error');
    return;
  }

  try {
    const token = getToken();
    if (!token) {
      showToast('Not authenticated. Please reload the page.', 'error');
      return;
    }

    showToast('Creating product page...', 'info');

    // Build paths
    const cleanSourcePath = sourcePath.startsWith('/') ? sourcePath.substring(1) : sourcePath;
    const cleanDestFolder = destinationFolder.startsWith('/') ? destinationFolder.substring(1) : destinationFolder;

    // Step 1: Copy only selected tab folders
    const folderCopyPromises = tabs.map(async (tab, index) => {
      const tabSourcePath = `${cleanSourcePath}/${tab}`;
      const tabDestinationPath = `${cleanDestFolder}/${productSlug}/${tab}`;

      try {
        const tabResponse = await copyResource(token, org, site, tabSourcePath, tabDestinationPath);

        if (tabResponse.ok) {
          showToast(`Copied ${tab} folder (${index + 1}/${tabs.length})...`, 'info');
          return true;
        }
        // eslint-disable-next-line no-console
        console.warn(`Failed to copy ${tab} folder: ${tabResponse.status}`);
        return false;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(`Error copying ${tab} folder:`, error);
        return false;
      }
    });

    const folderResults = await Promise.all(folderCopyPromises);
    const copiedCount = folderResults.filter((result) => result).length;

    if (copiedCount === 0) {
      showToast('Warning: No tab folders were copied. Continuing...', 'warning');
    } else {
      showToast(`Copied ${copiedCount} tab folders. Now copying tab HTML files...`, 'info');
    }

    // Step 2: Copy tab HTML files
    const htmlCopyPromises = tabs.map(async (tab, index) => {
      const tabHtmlSourcePath = `${cleanSourcePath}/${tab}.html`;
      const tabHtmlDestinationPath = `${cleanDestFolder}/${productSlug}/${tab}.html`;

      try {
        const tabHtmlResponse = await copyResource(token, org, site, tabHtmlSourcePath, tabHtmlDestinationPath);

        if (tabHtmlResponse.ok) {
          showToast(`Copied ${tab}.html (${index + 1}/${tabs.length})...`, 'info');
          return true;
        }
        // eslint-disable-next-line no-console
        console.warn(`Failed to copy ${tab}.html: ${tabHtmlResponse.status}`);
        return false;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(`Error copying ${tab}.html:`, error);
        return false;
      }
    });

    const htmlResults = await Promise.all(htmlCopyPromises);
    const htmlCopiedCount = htmlResults.filter((result) => result).length;

    if (htmlCopiedCount > 0) {
      showToast(`Copied ${htmlCopiedCount} tab HTML files. Now creating landing page...`, 'info');
    } else {
      showToast('No tab HTML files found. Now creating landing page...', 'warning');
    }

    // Step 3: Create the landing page HTML file from scratch with correct metadata
    showToast('Creating landing page with product metadata...', 'info');

    await createProductLandingPage(org, site, cleanDestFolder, productSlug, {
      title,
      description,
      productName,
      productId,
      tabs,
    });

    showToast(`Product created successfully: ${productSlug}`, 'success');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error creating product:', error);
    showToast(`Failed to create product: ${error.message}`, 'error');
  }
}

/**
 * Setup event listeners for Create tab
 */
export function setupCreateListeners() {
  const selectAllBtn = $('#select-all-tabs');
  const unselectAllBtn = $('#unselect-all-tabs');
  const createBtn = $('#create-product');

  selectAllBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    setAllTabs(true);
  });

  unselectAllBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    setAllTabs(false);
  });

  createBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    createProduct();
  });
}
