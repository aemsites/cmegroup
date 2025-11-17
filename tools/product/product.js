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

/**
 * Switch between tabs
 */
function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.remove('active');
    if (btn.dataset.tab === tabName) {
      btn.classList.add('active');
    }
  });

  // Update tab content
  document.querySelectorAll('.tab-content').forEach((content) => {
    content.classList.remove('active');
  });
  const activeContent = $(`#tab-${tabName}`);
  if (activeContent) {
    activeContent.classList.add('active');
  }

  // Update state
  setCurrentTab(tabName);
}

/**
 * Setup global event listeners
 */
function setupGlobalListeners() {
  // Tab navigation
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!btn.disabled) {
        switchTab(btn.dataset.tab);
      }
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
