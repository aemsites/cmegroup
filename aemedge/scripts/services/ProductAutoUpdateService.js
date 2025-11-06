/**
 * Product Auto-Update Service
 * Handles periodic fetching and updating of product data (quotes, settlements, etc.)
 * 
 * USAGE:
 * import { startAutoUpdates, stopAutoUpdates } from './ProductAutoUpdateService.js';
 * const timers = startAutoUpdates(productId, config);
 * stopAutoUpdates(timers); // to stop
 */

import { store } from '../store/store.js';
import { updateProductField } from '../actions/product.js';

/**
 * Parse delay string (e.g., "10 minutes", "3 min", "5m") to milliseconds
 */
export function parseDelayToMs(delayString) {
  if (!delayString || typeof delayString !== 'string') return null;
  
  const match = delayString.toLowerCase().match(/(\d+)\s*(min|minute|minutes|m|sec|second|seconds|s|hour|hours|h)?/);
  if (!match) return null;
  
  const value = parseInt(match[1], 10);
  const unit = match[2] || 'minutes';
  
  const multipliers = {
    s: 1000,
    sec: 1000,
    second: 1000,
    seconds: 1000,
    m: 60 * 1000,
    min: 60 * 1000,
    minute: 60 * 1000,
    minutes: 60 * 1000,
    h: 60 * 60 * 1000,
    hour: 60 * 60 * 1000,
    hours: 60 * 60 * 1000,
  };
  
  return value * (multipliers[unit] || 60 * 1000);
}

/**
 * Default configuration for auto-updating different data types
 * Each data source can have its own update frequency
 */
export const AUTO_UPDATE_CONFIG = {
  quotes: {
    endpoint: (productId) => `/CmeWS/mvc/quotes/v2/${productId}`,
    storeKey: 'quotesData.table',
    interval: 'auto', // Will use quoteDelay from API response
    fallbackInterval: 3 * 60 * 1000, // 3 minutes fallback
    transform: (data) => data.quotes || data,
    extractDelay: (data) => data.quoteDelay,
    enabled: true,
  },
  settlements: {
    endpoint: (productId) => `/CmeWS/mvc/Settlements/Futures/TradeDate/${productId}`,
    storeKey: 'settlementsData',
    interval: 15 * 60 * 1000, // 15 minutes
    transform: (data) => data,
    enabled: true,
  },
  volume: {
    endpoint: (productId) => `/api/volume/${productId}`,
    storeKey: 'volumeData',
    interval: 5 * 60 * 1000, // 5 minutes
    transform: (data) => data,
    enabled: false,
  },
  specs: {
    endpoint: (productId) => `/api/specs/${productId}`,
    storeKey: 'specsData',
    interval: 60 * 60 * 1000, // 1 hour
    transform: (data) => data,
    enabled: false,
  },
};

/**
 * Start auto-updating product data
 * 
 * @param {string} productId - Product ID to fetch data for
 * @param {object} config - Configuration object (defaults to AUTO_UPDATE_CONFIG)
 * @returns {object} - Object containing timers for each data source (for cleanup)
 * 
 * EXAMPLE (Demo with sample.json):
 * 
 * const demoConfig = {
 *   quotes: {
 *     endpoint: () => '/aemedge/blocks/quotes-table/sample.json',
 *     storeKey: 'quotesData.table',
 *     interval: 30 * 1000, // 30 seconds fixed
 *     transform: (data) => data.quotes,
 *     enabled: true,
 *   },
 * };
 * 
 * const timers = startAutoUpdates('300', demoConfig);
 */
export function startAutoUpdates(productId, config = AUTO_UPDATE_CONFIG) {
  const timers = {};
  const intervals = {};
  
  Object.entries(config).forEach(([name, settings]) => {
    if (!settings.enabled) {
      return;
    }
    
    const update = async () => {
      try {
        const response = await fetch(settings.endpoint(productId));
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        const transformed = settings.transform(data);
        
        // Dispatch to store - all subscribed blocks auto-update!
        store.dispatch(updateProductField(settings.storeKey, transformed));
        
        // If interval is 'auto', extract delay from response
        if (settings.interval === 'auto' && settings.extractDelay && !intervals[name]) {
          const delayString = settings.extractDelay(data);
          if (delayString) {
            const parsedDelay = parseDelayToMs(delayString);
            if (parsedDelay) {
              intervals[name] = parsedDelay;
              
              // Restart with new interval
              if (timers[name]) {
                clearInterval(timers[name]);
              }
              timers[name] = setInterval(update, parsedDelay);
            }
          }
        }
      } catch (error) {
        // Silent fail - auto-update errors are non-critical
      }
    };
    
    // Initial fetch
    update();
    
    // Schedule periodic updates
    const updateInterval = settings.interval === 'auto' 
      ? settings.fallbackInterval 
      : settings.interval;
      
    timers[name] = setInterval(update, updateInterval);
  });
  
  return timers;
}

/**
 * Stop all auto-updates
 * 
 * @param {object} timers - Timer object returned from startAutoUpdates()
 */
export function stopAutoUpdates(timers) {
  Object.values(timers).forEach((timer) => {
    clearInterval(timer);
  });
}

// ==================== ENABLE AUTO-UPDATES ====================
//
// UNCOMMENT THE SECTION BELOW TO ENABLE AUTO-UPDATING:
//
// For PRODUCTION (real APIs):
// import { getMetadata } from '../aem.js';
// const productId = getMetadata('product-id') || '300';
// const updateTimers = startAutoUpdates(productId, AUTO_UPDATE_CONFIG);
//
// For DEMO (using sample.json with 30-second interval):
// const demoConfig = {
//   quotes: {
//     endpoint: () => '/aemedge/blocks/quotes-table/sample.json',
//     storeKey: 'quotesData.table',
//     interval: 30 * 1000, // 30 seconds fixed
//     transform: (data) => data.quotes,
//     enabled: true,
//   },
// };
// const updateTimers = startAutoUpdates('300', demoConfig);
//
// To STOP auto-updates (in console):
// window.stopAutoUpdates(window.updateTimers);
//
// ==================== END OF AUTO-UPDATE SYSTEM ====================

