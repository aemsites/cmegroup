/**
 * Bulk Product Module
 * Handles CSV upload, validation, and batch product creation
 */

import {
  copyResource, createOrUpdateHTML, getHTML, checkProductExists,
} from '../shared/api.js';
import { $, showToast, addToActivityLog } from '../shared/ui.js';
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

// State for bulk operations
const bulkState = {
  csvData: [],
  selectedRows: [],
  isProcessing: false,
  isDryRun: false,
  results: {
    success: [],
    warnings: [],
    errors: [],
  },
};

/**
 * Parse CSV content
 */
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row');
  }

  const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));
  const rows = [];

  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parsing (handles quoted fields)
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j += 1) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    row.rowNumber = i;
    rows.push(row);
  }

  return rows;
}

/**
 * Validate a single row
 */
function validateRow(row) {
  const errors = [];
  const warnings = [];

  // Required field validation
  if (!row.title || row.title.length < 3) {
    errors.push('Title required (min 3 chars)');
  }

  if (!row.description || row.description.length < 10) {
    errors.push('Description required (min 10 chars)');
  }

  if (!row.product_name || row.product_name.length < 2) {
    errors.push('Product name required (min 2 chars)');
  }

  if (!row.product_id) {
    errors.push('Product ID required');
  }

  if (!row.product_slug) {
    errors.push('Product slug required');
  } else if (!/^[a-z0-9-]+$/.test(row.product_slug)) {
    errors.push('Slug must be lowercase alphanumeric with hyphens');
  }

  if (!row.tabs || row.tabs.trim() === '') {
    errors.push('At least one tab required');
  } else {
    const tabs = row.tabs.split('|').map((t) => t.trim()).filter((t) => t);
    if (tabs.length === 0) {
      errors.push('At least one valid tab required');
    }

    // Validate tab names
    const validTabs = Object.keys(TAB_DISPLAY_NAMES);
    const invalidTabs = tabs.filter((t) => !validTabs.includes(t));
    if (invalidTabs.length > 0) {
      warnings.push(`Unknown tabs: ${invalidTabs.join(', ')}`);
    }
  }

  if (!row.destination || row.destination.trim() === '') {
    errors.push('Destination folder required');
  } else if (!row.destination.startsWith('/')) {
    warnings.push('Destination should start with /');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check for duplicate slugs in CSV
 */
function checkDuplicateSlugs(rows) {
  const slugCounts = {};
  const duplicates = [];

  rows.forEach((row) => {
    const slug = row.product_slug;
    if (slug) {
      slugCounts[slug] = (slugCounts[slug] || 0) + 1;
    }
  });

  Object.entries(slugCounts).forEach(([slug, count]) => {
    if (count > 1) {
      duplicates.push(slug);
    }
  });

  return duplicates;
}

/**
 * Check for conflicts (existing products)
 */
async function checkConflictsForRows(rows) {
  const token = getToken();
  if (!token) return;

  const orgSite = parseOrgSiteBulk();
  if (!orgSite) return;

  const { org, site } = orgSite;

  showToast('Checking for existing products...', 'info');

  const conflictChecks = rows.map(async (row) => {
    try {
      const dest = row.destination || '';
      const cleanDest = dest.startsWith('/') ? dest.substring(1) : dest;
      const productPath = `${cleanDest}/${row.product_slug}`;
      const exists = await checkProductExists(token, org, site, productPath);
      return { rowNumber: row.rowNumber, exists };
    } catch (error) {
      return { rowNumber: row.rowNumber, exists: false };
    }
  });

  const results = await Promise.all(conflictChecks);

  results.forEach((result) => {
    const row = rows.find((r) => r.rowNumber === result.rowNumber);
    if (row) {
      row.conflict = result.exists;
    }
  });

  const conflictCount = results.filter((r) => r.exists).length;
  if (conflictCount > 0) {
    showToast(`Found ${conflictCount} existing product(s)`, 'warning');
  }
}

/**
 * Parse org/site from bulk config
 */
function parseOrgSiteBulk() {
  const orgSitePath = $('#bulk-org-site-path')?.value?.trim();
  if (!orgSitePath) return null;

  const cleanPath = orgSitePath.startsWith('/') ? orgSitePath.substring(1) : orgSitePath;
  const parts = cleanPath.split('/').filter((part) => part.length > 0);

  if (parts.length >= 2) {
    return { org: parts[0], site: parts[1] };
  }
  return null;
}

/**
 * Render preview table
 */
function renderPreviewTable(rows) {
  const container = $('#preview-table-container');
  if (!container) return;

  // Check for duplicates
  const duplicates = checkDuplicateSlugs(rows);

  let html = `
    <table class="preview-table">
      <thead>
        <tr>
          <th class="row-checkbox"><input type="checkbox" id="select-all-preview"></th>
          <th>#</th>
          <th>Title</th>
          <th>Product Name</th>
          <th>Product ID</th>
          <th>Slug</th>
          <th>Tabs</th>
          <th>Destination</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
  `;

  rows.forEach((row) => {
    const validation = validateRow(row);
    const isDuplicate = duplicates.includes(row.product_slug);
    const hasConflict = row.conflict === true;
    const tabCount = row.tabs ? row.tabs.split('|').filter((t) => t.trim()).length : 0;

    let statusBadge = '';
    let statusClass = '';

    if (!validation.valid || isDuplicate) {
      statusClass = 'invalid';
      const allErrors = [...validation.errors];
      if (isDuplicate) allErrors.push('Duplicate slug');
      statusBadge = `<span class="status-badge ${statusClass}">❌ ${allErrors[0]}</span>`;
    } else if (hasConflict) {
      statusClass = 'warning';
      statusBadge = '<span class="status-badge warning">⚠️ EXISTS</span>';
    } else if (validation.warnings.length > 0) {
      statusClass = 'warning';
      statusBadge = `<span class="status-badge ${statusClass}">⚠️ ${validation.warnings[0]}</span>`;
    } else {
      statusClass = 'valid';
      statusBadge = '<span class="status-badge valid">✓ Valid</span>';
    }

    const destDisplay = row.destination || '(missing)';
    
    html += `
      <tr data-row="${row.rowNumber}" class="${statusClass}">
        <td class="row-checkbox">
          <input type="checkbox" class="row-select" data-row="${row.rowNumber}" ${validation.valid && !isDuplicate ? 'checked' : ''}>
        </td>
        <td>${row.rowNumber}</td>
        <td title="${row.title}">${row.title.substring(0, 30)}${row.title.length > 30 ? '...' : ''}</td>
        <td>${row.product_name}</td>
        <td>${row.product_id}</td>
        <td>${row.product_slug}</td>
        <td>${tabCount}</td>
        <td class="destination-cell" title="${destDisplay}">${destDisplay}</td>
        <td class="status-cell">${statusBadge}</td>
      </tr>
    `;
  });

  html += '</tbody></table>';
  container.innerHTML = html;

  // Setup checkbox listeners
  const selectAllPreview = $('#select-all-preview');
  selectAllPreview?.addEventListener('change', (e) => {
    document.querySelectorAll('.row-select').forEach((cb) => {
      cb.checked = e.target.checked;
    });
  });

  // Show preview card
  const previewCard = $('#preview-card');
  if (previewCard) {
    previewCard.classList.remove('hidden');
  }

  // Enable action buttons
  $('#dry-run-btn').disabled = false;
  $('#bulk-create-btn').disabled = false;

  addToActivityLog(`Loaded ${rows.length} products from CSV`, 'info');
  showToast(`CSV loaded: ${rows.length} products`, 'success');
}

/**
 * Get selected rows
 */
function getSelectedRows() {
  const selected = [];
  document.querySelectorAll('.row-select:checked').forEach((cb) => {
    const rowNum = parseInt(cb.dataset.row, 10);
    const row = bulkState.csvData.find((r) => r.rowNumber === rowNum);
    if (row) selected.push(row);
  });
  return selected;
}

/**
 * Parse org/site from config
 */
function parseOrgSite() {
  const orgSitePath = $('#bulk-org-site-path')?.value?.trim();
  if (!orgSitePath) return null;

  const cleanPath = orgSitePath.startsWith('/') ? orgSitePath.substring(1) : orgSitePath;
  const parts = cleanPath.split('/').filter((part) => part.length > 0);

  if (parts.length >= 2) {
    return { org: parts[0], site: parts[1] };
  }
  return null;
}

/**
 * Get global configuration
 */
function getGlobalConfig() {
  const orgSite = parseOrgSite();
  if (!orgSite) return null;

  return {
    org: orgSite.org,
    site: orgSite.site,
    sourcePath: $('#bulk-source-path')?.value?.trim() || '',
  };
}

/**
 * Generate product HTML
 */
function generateProductHTML(metadata) {
  const {
    title, description, productName, productId, tabs,
  } = metadata;

  const tabsHTML = tabs.map((tab) => {
    const tabTitle = TAB_DISPLAY_NAMES[tab] || tab.charAt(0).toUpperCase() + tab.slice(1);
    return `<div><div><p>${tabTitle}</p></div><div><p>${tab}</p></div></div>`;
  }).join('');

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
 * Create a single product (reusable from CSV row)
 */
async function createSingleProduct(row, config) {
  const { org, site, sourcePath } = config;
  const token = getToken();

  const tabs = row.tabs.split('|').map((t) => t.trim()).filter((t) => t);
  const cleanSourcePath = sourcePath.startsWith('/') ? sourcePath.substring(1) : sourcePath;
  const cleanDestFolder = row.destination.startsWith('/') ? row.destination.substring(1) : row.destination;

  // Copy tab folders
  const folderResults = await Promise.all(
    tabs.map(async (tab) => {
      try {
        await copyResource(
          token,
          org,
          site,
          `${cleanSourcePath}/${tab}`,
          `${cleanDestFolder}/${row.product_slug}/${tab}`,
        );
        return { tab, success: true };
      } catch (error) {
        return { tab, success: false, error: error.message };
      }
    }),
  );

  // Copy tab HTML files
  const htmlResults = await Promise.all(
    tabs.map(async (tab) => {
      try {
        await copyResource(
          token,
          org,
          site,
          `${cleanSourcePath}/${tab}.html`,
          `${cleanDestFolder}/${row.product_slug}/${tab}.html`,
        );
        return { tab, success: true };
      } catch (error) {
        return { tab, success: false, error: error.message };
      }
    }),
  );

  // Create landing page
  const htmlPath = `${cleanDestFolder}/${row.product_slug}.html`;
  const htmlContent = generateProductHTML({
    title: row.title,
    description: row.description,
    productName: row.product_name,
    productId: row.product_id,
    tabs,
  });

  await createOrUpdateHTML(token, org, site, htmlPath, htmlContent);

  // Check for warnings
  const warnings = [];
  const failedFolders = folderResults.filter((r) => !r.success);
  const failedHtml = htmlResults.filter((r) => !r.success);

  if (failedFolders.length > 0) {
    warnings.push(`Failed to copy ${failedFolders.length} tab folders`);
  }
  if (failedHtml.length > 0) {
    warnings.push(`Failed to copy ${failedHtml.length} tab HTML files`);
  }

  return {
    success: true,
    warnings,
  };
}

/**
 * Update progress UI
 */
function updateProgress(current, total, currentProduct) {
  const percentage = Math.round((current / total) * 100);
  const progressFill = $('#progress-fill');
  const progressStatus = $('#progress-status');
  const progressDetails = $('#progress-details');

  if (progressFill) {
    progressFill.style.width = `${percentage}%`;
    progressFill.textContent = `${percentage}%`;
  }

  if (progressStatus) {
    progressStatus.textContent = `Processing: ${currentProduct}`;
  }

  if (progressDetails) {
    progressDetails.textContent = `${current} of ${total} processed`;
  }
}

/**
 * Dry run validation
 */
async function performDryRun() {
  const config = getGlobalConfig();
  if (!config) {
    showToast('Please configure Organization/Site and Source Template', 'error');
    return;
  }

  const selectedRows = getSelectedRows();
  if (selectedRows.length === 0) {
    showToast('Please select at least one product', 'warning');
    return;
  }

  addToActivityLog(`Starting dry run for ${selectedRows.length} products`, 'info');
  showToast(`Dry run: Validating ${selectedRows.length} products...`, 'info');

  // Reset results
  bulkState.results = { success: [], warnings: [], errors: [] };

  // Show progress card
  const progressCard = $('#progress-card');
  if (progressCard) progressCard.classList.remove('hidden');

  // Validate each row
  selectedRows.forEach((row, index) => {
    updateProgress(index + 1, selectedRows.length, row.product_slug);

    const validation = validateRow(row);
    if (validation.valid) {
      bulkState.results.success.push({
        slug: row.product_slug,
        message: 'Valid - ready to create',
      });
      if (validation.warnings.length > 0) {
        bulkState.results.warnings.push({
          slug: row.product_slug,
          message: validation.warnings.join(', '),
        });
      }
    } else {
      bulkState.results.errors.push({
        slug: row.product_slug,
        message: validation.errors.join(', '),
      });
    }
  });

  // Show results
  displayResults(true);
  addToActivityLog('Dry run completed', 'success');
  showToast('Dry run completed - review results', 'success');
}

/**
 * Bulk create products
 */
async function bulkCreateProducts() {
  const config = getGlobalConfig();
  if (!config) {
    showToast('Please configure Organization/Site and Source Template', 'error');
    return;
  }

  const selectedRows = getSelectedRows();
  if (selectedRows.length === 0) {
    showToast('Please select at least one product', 'warning');
    return;
  }

  // Confirm before proceeding
  // eslint-disable-next-line no-alert
  if (!confirm(`Create ${selectedRows.length} products? This cannot be undone.`)) {
    return;
  }

  bulkState.isProcessing = true;
  bulkState.results = { success: [], warnings: [], errors: [] };

  // Disable buttons
  $('#dry-run-btn').disabled = true;
  $('#bulk-create-btn').disabled = true;

  // Show progress card
  const progressCard = $('#progress-card');
  if (progressCard) progressCard.classList.remove('hidden');

  addToActivityLog(`Starting bulk create for ${selectedRows.length} products`, 'info');
  showToast(`Creating ${selectedRows.length} products...`, 'info');

  // Process sequentially
  for (let i = 0; i < selectedRows.length; i += 1) {
    const row = selectedRows[i];
    updateProgress(i + 1, selectedRows.length, row.product_slug);

    try {
      // eslint-disable-next-line no-await-in-loop
      const result = await createSingleProduct(row, config);

      bulkState.results.success.push({
        slug: row.product_slug,
        message: 'Created successfully',
        org: config.org,
        site: config.site,
        path: `${row.destination}/${row.product_slug}`,
      });

      if (result.warnings.length > 0) {
        bulkState.results.warnings.push({
          slug: row.product_slug,
          message: result.warnings.join(', '),
        });
      }

      addToActivityLog(`Created: ${row.product_slug}`, 'success');
    } catch (error) {
      bulkState.results.errors.push({
        slug: row.product_slug,
        message: error.message,
      });
      addToActivityLog(`Failed: ${row.product_slug} - ${error.message}`, 'error');
    }
  }

  bulkState.isProcessing = false;

  // Show results
  displayResults(false);
  addToActivityLog('Bulk create completed', 'success');
  showToast('Bulk create completed - review results', 'success');

  // Re-enable buttons
  $('#dry-run-btn').disabled = false;
  $('#bulk-create-btn').disabled = false;
}

/**
 * Display results
 */
function displayResults(isDryRun) {
  const { success, warnings, errors } = bulkState.results;

  // Update counts
  $('#success-count').textContent = success.length;
  $('#warning-count').textContent = warnings.length;
  $('#error-count').textContent = errors.length;

  // Build details HTML
  let detailsHTML = '';

  if (isDryRun) {
    detailsHTML += '<p><strong>Dry Run Results (No products were created)</strong></p>';
  }

  if (success.length > 0) {
    detailsHTML += '<h3>✅ Success</h3>';
    success.forEach((item) => {
      let linkHTML = '';
      if (!isDryRun && item.org && item.site && item.path) {
        const daUrl = `https://da.live/edit#/${item.org}/${item.site}${item.path}`;
        linkHTML = ` <a href="${daUrl}" target="_blank" class="result-link" title="Open in DA Live">→</a>`;
      }
      detailsHTML += `<div class="result-item success"><strong>${item.slug}</strong>: ${item.message}${linkHTML}</div>`;
    });
  }

  if (warnings.length > 0) {
    detailsHTML += '<h3>⚠️ Warnings</h3>';
    warnings.forEach((item) => {
      detailsHTML += `<div class="result-item warning"><strong>${item.slug}</strong>: ${item.message}</div>`;
    });
  }

  if (errors.length > 0) {
    detailsHTML += '<h3>❌ Errors</h3>';
    errors.forEach((item) => {
      detailsHTML += `<div class="result-item error"><strong>${item.slug}</strong>: ${item.message}</div>`;
    });
  }

  $('#results-details').innerHTML = detailsHTML;

  // Show results card
  const resultsCard = $('#results-card');
  if (resultsCard) resultsCard.classList.remove('hidden');

  // Hide progress card
  const progressCard = $('#progress-card');
  if (progressCard) progressCard.classList.add('hidden');
}

/**
 * Download results as CSV report
 */
function downloadReport() {
  const { success, warnings, errors } = bulkState.results;
  let csv = 'Status,Product Slug,Message\n';

  success.forEach((item) => {
    csv += `Success,"${item.slug}","${item.message}"\n`;
  });

  warnings.forEach((item) => {
    csv += `Warning,"${item.slug}","${item.message}"\n`;
  });

  errors.forEach((item) => {
    csv += `Error,"${item.slug}","${item.message}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bulk-results-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);

  showToast('Report downloaded', 'success');
}

/**
 * Reset bulk operation
 */
function resetBulk() {
  bulkState.csvData = [];
  bulkState.selectedRows = [];
  bulkState.results = { success: [], warnings: [], errors: [] };

  // Hide cards
  $('#preview-card')?.classList.add('hidden');
  $('#progress-card')?.classList.add('hidden');
  $('#results-card')?.classList.add('hidden');

  // Clear file input
  const fileInput = $('#csv-file-input');
  if (fileInput) fileInput.value = '';

  // Hide file info
  $('#file-info')?.classList.add('hidden');

  // Disable buttons
  $('#dry-run-btn').disabled = true;
  $('#bulk-create-btn').disabled = true;

  addToActivityLog('Bulk operation reset', 'info');
  showToast('Ready for new CSV upload', 'info');
}

/**
 * Handle CSV file upload
 */
function handleFileUpload(file) {
  if (!file || !file.name.endsWith('.csv')) {
    showToast('Please upload a valid CSV file', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const csvText = e.target.result;
      const rows = parseCSV(csvText);

      if (rows.length === 0) {
        showToast('CSV file is empty', 'error');
        return;
      }

      bulkState.csvData = rows;

      // Show file info
      $('#file-name').textContent = file.name;
      $('#file-rows').textContent = rows.length;
      $('#file-info').classList.remove('hidden');

      // Check for conflicts before rendering
      await checkConflictsForRows(rows);

      // Render preview
      renderPreviewTable(rows);
    } catch (error) {
      showToast(`Failed to parse CSV: ${error.message}`, 'error');
      addToActivityLog(`CSV parse error: ${error.message}`, 'error');
    }
  };

  reader.readAsText(file);
}

/**
 * Setup event listeners for bulk tab
 */
export function setupBulkListeners() {
  // File input
  const fileInput = $('#csv-file-input');
  const browseBtn = $('#browse-btn');
  const uploadArea = $('#upload-area');

  browseBtn?.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent event from bubbling to uploadArea
    fileInput?.click();
  });

  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFileUpload(file);
  });

  // Drag and drop - click on upload area (but not on buttons/links inside)
  uploadArea?.addEventListener('click', (e) => {
    // Don't trigger if clicking on buttons or links
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A') {
      return;
    }
    fileInput?.click();
  });

  uploadArea?.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
  });

  uploadArea?.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
  });

  uploadArea?.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  });

  // Clear file
  $('#clear-file-btn')?.addEventListener('click', () => {
    resetBulk();
  });

  // Select/Unselect all rows
  $('#select-all-rows')?.addEventListener('click', () => {
    document.querySelectorAll('.row-select').forEach((cb) => {
      cb.checked = true;
    });
  });

  $('#unselect-all-rows')?.addEventListener('click', () => {
    document.querySelectorAll('.row-select').forEach((cb) => {
      cb.checked = false;
    });
  });

  // Dry run button
  $('#dry-run-btn')?.addEventListener('click', () => {
    performDryRun();
  });

  // Bulk create button
  $('#bulk-create-btn')?.addEventListener('click', () => {
    bulkCreateProducts();
  });

  // Download report
  $('#download-report-btn')?.addEventListener('click', () => {
    downloadReport();
  });

  // Reset
  $('#reset-bulk-btn')?.addEventListener('click', () => {
    resetBulk();
  });
}

