/* eslint-disable import/no-unresolved */
/**
 * Product Manager - Main Application
 * Modular, tabbed architecture for managing product pages
 */

import DA_SDK from 'https://da.live/nx/utils/sdk.js';
import {
  $, loadActivityLog, renderActivityLog, clearActivityLog, showToast,
} from './shared/ui.js';
import { setAuth, setCurrentTab } from './shared/state.js';
import { setupCreateListeners } from './modules/create.js';
import { setupBulkListeners } from './modules/bulk.js';

/**
 * Switch between main tabs (Single/Bulk)
 */
function switchMainTab(mainTabName) {
  // Update main tab buttons
  document.querySelectorAll('.main-tab-btn').forEach((btn) => {
    btn.classList.remove('active');
    if (btn.dataset.mainTab === mainTabName) {
      btn.classList.add('active');
    }
  });

  // Update main tab content
  document.querySelectorAll('.main-tab-content').forEach((content) => {
    content.classList.remove('active');
  });
  const activeContent = $(`#main-tab-${mainTabName}`);
  if (activeContent) {
    activeContent.classList.add('active');
  }

  // Update state
  setCurrentTab(mainTabName);
}

/**
 * Switch between sub-tabs (Create/Move/Delete)
 */
function switchSubTab(subTabName) {
  // Find the parent main tab
  const subTab = $(`#sub-tab-${subTabName}`);
  if (!subTab) return;

  const parentMainTab = subTab.closest('.main-tab-content');
  if (!parentMainTab) return;

  // Update sub-tab buttons within this main tab
  parentMainTab.querySelectorAll('.sub-tab-btn').forEach((btn) => {
    btn.classList.remove('active');
    if (btn.dataset.subTab === subTabName) {
      btn.classList.add('active');
    }
  });

  // Update sub-tab content within this main tab
  parentMainTab.querySelectorAll('.sub-tab-content').forEach((content) => {
    content.classList.remove('active');
  });
  subTab.classList.add('active');
}

/**
 * Setup global event listeners
 */
function setupGlobalListeners() {
  // Main tab navigation
  document.querySelectorAll('.main-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      switchMainTab(btn.dataset.mainTab);
    });
  });

  // Sub-tab navigation
  document.querySelectorAll('.sub-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      switchSubTab(btn.dataset.subTab);
    });
  });

  // Toast close
  const toastClose = $('.toast-close');
  toastClose?.addEventListener('click', () => {
    const toast = $('#toast');
    if (toast) {
      toast.classList.add('hidden');
    }
  });

  // Activity log modal
  const activityLogBtn = $('.activity-log-btn');
  activityLogBtn?.addEventListener('click', () => {
    renderActivityLog();
    const modal = $('#activity-log-modal');
    if (modal) {
      modal.classList.remove('hidden');
    }
  });

  const modalClose = $('.modal-close');
  modalClose?.addEventListener('click', () => {
    const modal = $('#activity-log-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  });

  // Clear log button
  const clearLogBtn = $('#clear-log-btn');
  clearLogBtn?.addEventListener('click', () => {
    clearActivityLog();
  });

  // Close modal when clicking outside
  const activityModal = $('#activity-log-modal');
  activityModal?.addEventListener('click', (e) => {
    if (e.target === activityModal) {
      activityModal.classList.add('hidden');
    }
  });
}

/**
 * Initialize the application
 */
async function initApp() {
  // Load activity log from localStorage
  loadActivityLog();

  try {
    // Initialize DA SDK
    const { context, token, actions } = await DA_SDK;
    setAuth(context, token, actions);

    // Setup event listeners
    setupGlobalListeners();
    setupCreateListeners();
    setupBulkListeners();

    // eslint-disable-next-line no-console
    console.log('Product Manager initialized successfully');
    showToast('Product Manager is ready!', 'success');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to initialize app:', error);
    showToast('Failed to initialize app. Please reload the page.', 'error');
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
