/* eslint-disable import/no-unresolved, no-restricted-globals, max-len */

/**
 * Product Manager - Create and manage product pages via DA Admin API
 */

import DA_SDK from 'https://da.live/nx/utils/sdk.js';

// App state
const app = {
  context: null,
  token: null,
  products: [],
  activityLog: [],
  template: {
    org: 'cmegroup',
    repo: 'www',
    path: '/drafts/kunwar/markets/corn',
  },
};

// API endpoints
const API = {
  SOURCE: 'https://admin.da.live/source',
  COPY: 'https://admin.da.live/copy',
  LIST: 'https://admin.da.live/list',
};

function $(selector) {
  return document.querySelector(selector);
}

function $all(selector) {
  return Array.from(document.querySelectorAll(selector));
}

// Activity log functions
const ACTIVITY_LOG_KEY = 'product-manager-activity-log';

function loadActivityLog() {
  try {
    const stored = localStorage.getItem(ACTIVITY_LOG_KEY);
    app.activityLog = stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading activity log:', error);
    app.activityLog = [];
  }
}

function saveActivityLog() {
  try {
    localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(app.activityLog));
  } catch (error) {
    console.error('Error saving activity log:', error);
  }
}

function addToActivityLog(message, type = 'info') {
  const entry = {
    timestamp: new Date().toISOString(),
    message,
    type,
  };
  app.activityLog.unshift(entry); // Add to beginning
  saveActivityLog();
}

function clearActivityLog() {
  app.activityLog = [];
  saveActivityLog();
  renderActivityLog();
}

function renderActivityLog() {
  const logContainer = $('#log-container');
  if (!logContainer) return;

  if (app.activityLog.length === 0) {
    logContainer.innerHTML = '<div class="log-empty">No activity yet. Create a product to see the activity log.</div>';
    return;
  }

  logContainer.innerHTML = app.activityLog
    .map((entry) => {
      const date = new Date(entry.timestamp);
      const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      return `
        <div class="log-entry">
          <span class="log-time">${timeStr}</span>
          <span class="log-type ${entry.type}">${entry.type}</span>
          <span class="log-message">${entry.message}</span>
        </div>
      `;
    })
    .join('');
}

function showToast(message, type = 'info') {
  // Add to activity log
  addToActivityLog(message, type);
  const toast = $('#toast');
  if (!toast) {
    console.warn('Toast element not found');
    return;
  }

  const messageEl = toast.querySelector('.toast-message');
  if (messageEl) {
    messageEl.textContent = message;
  }

  // Remove all type classes
  toast.classList.remove('success', 'error', 'warning', 'info');
  // Add the appropriate type class
  toast.classList.add(type);
  // Show toast
  toast.classList.remove('hidden');

  // Auto-hide after 3 seconds
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
}

function setAllTabs(checked) {
  $all('.tab-checkbox').forEach((cb) => {
    cb.checked = checked;
  });
}

function getSelectedTabs() {
  return $all('.tab-checkbox')
    .filter((cb) => cb.checked)
    .map((cb) => cb.value);
}

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

async function createProduct() {
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
    const { token } = app;
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
      const tabSourceUrl = `${API.COPY}/${org}/${site}/${tabSourcePath}`;
      const tabDestinationPath = `/${org}/${site}/${cleanDestFolder}/${productSlug}/${tab}`;

      const tabFormData = new FormData();
      tabFormData.append('destination', tabDestinationPath);

      try {
        const tabResponse = await fetch(tabSourceUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: tabFormData,
        });

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
      const tabHtmlSourceUrl = `${API.COPY}/${org}/${site}/${tabHtmlSourcePath}`;
      const tabHtmlDestinationPath = `/${org}/${site}/${cleanDestFolder}/${productSlug}/${tab}.html`;

      const tabHtmlFormData = new FormData();
      tabHtmlFormData.append('destination', tabHtmlDestinationPath);

      try {
        const tabHtmlResponse = await fetch(tabHtmlSourceUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: tabHtmlFormData,
        });

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

    // Refresh the product list
    // await loadProductList();
  } catch (error) {
    console.error('Error creating product:', error);
    showToast(`Failed to create product: ${error.message}`, 'error');
  }
}

async function createProductLandingPage(org, site, folder, slug, metadata) {
  const { token } = app;
  const htmlPath = `${folder}/${slug}.html`;
  const sourceUrl = `${API.SOURCE}/${org}/${site}/${htmlPath}`;

  try {
    // Generate the HTML content with metadata
    const htmlContent = generateProductHTML(metadata);

    // Save the content
    const formData = new FormData();
    formData.append('data', new Blob([htmlContent], { type: 'text/html' }));

    const saveResponse = await fetch(sourceUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!saveResponse.ok) {
      throw new Error(`Failed to create page: ${saveResponse.status}`);
    }

    console.log('Product landing page created successfully:', slug);
    showToast('Product landing page created successfully!', 'success');
  } catch (error) {
    console.error('Error creating product page:', error);
    throw error;
  }
}

function generateProductHTML(metadata) {
  const {
    title, description, productName, productId, tabs,
  } = metadata;

  // Map tab slugs to display names
  const tabDisplayNames = {
    overview: 'Overview',
    quotes: 'Quotes',
    settlements: 'Settlements',
    volume: 'Volume & OI',
    specs: 'Specs',
    margins: 'Margins',
    calendar: 'Calendar',
  };

  // Build the product-tabs HTML
  const tabsHTML = tabs.map((tab) => {
    const tabTitle = tabDisplayNames[tab] || tab.charAt(0).toUpperCase() + tab.slice(1);
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

async function initApp() {
  // Load activity log from localStorage
  loadActivityLog();

  try {
    const { context, token, actions } = await DA_SDK;

    app.context = context;
    app.token = token;
    app.actions = actions;

    setupEventListeners();

    showToast('Product Manager is ready!', 'success');
  } catch (error) {
    console.error('Failed to initialize app:', error);
    showToast('Failed to initialize app. Please reload the page.', 'error');
  }
}

function setupEventListeners() {
  const selectAllBtn = $('#select-all-tabs');
  const unselectAllBtn = $('#unselect-all-tabs');
  const createBtn = $('#create-product');
  const toastClose = $('.toast-close');
  const activityLogBtn = $('.activity-log-btn');
  const modalClose = $('.modal-close');

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

  toastClose?.addEventListener('click', () => {
    const toast = $('#toast');
    if (toast) {
      toast.classList.add('hidden');
    }
  });

  activityLogBtn?.addEventListener('click', () => {
    renderActivityLog();
    const modal = $('#activity-log-modal');
    if (modal) {
      modal.classList.remove('hidden');
    }
  });

  modalClose?.addEventListener('click', () => {
    const modal = $('#activity-log-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  });

  // Clear log button
  const clearLogBtn = $('#clear-log-btn');
  clearLogBtn?.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear the activity log?')) {
      clearActivityLog();
    }
  });

  // Close modal when clicking outside
  const activityModal = $('#activity-log-modal');
  activityModal?.addEventListener('click', (e) => {
    if (e.target === activityModal) {
      activityModal.classList.add('hidden');
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
