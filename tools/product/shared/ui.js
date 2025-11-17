/**
 * UI utilities for toasts, modals, and activity log
 */

const ACTIVITY_LOG_KEY = 'product-manager-activity-log';

// Helper function to get elements
export const $ = (selector) => document.querySelector(selector);
export const $all = (selector) => document.querySelectorAll(selector);

// Activity Log Management
let activityLog = [];

export function loadActivityLog() {
  try {
    const stored = localStorage.getItem(ACTIVITY_LOG_KEY);
    activityLog = stored ? JSON.parse(stored) : [];
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error loading activity log:', error);
    activityLog = [];
  }
}

function saveActivityLog() {
  try {
    localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(activityLog));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error saving activity log:', error);
  }
}

function addToActivityLog(message, type = 'info') {
  const entry = {
    timestamp: new Date().toISOString(),
    message,
    type,
  };
  activityLog.unshift(entry);
  saveActivityLog();
}

export function clearActivityLog() {
  activityLog = [];
  saveActivityLog();
  renderActivityLog();
}

export function renderActivityLog() {
  const logContainer = $('#log-container');
  if (!logContainer) return;

  if (activityLog.length === 0) {
    logContainer.innerHTML = '<div class="log-empty">No activity yet. Create a product to see the activity log.</div>';
    return;
  }

  logContainer.innerHTML = activityLog
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

// Toast Notifications
export function showToast(message, type = 'info') {
  // Add to activity log
  addToActivityLog(message, type);

  const toast = $('#toast');
  if (!toast) {
    // eslint-disable-next-line no-console
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
