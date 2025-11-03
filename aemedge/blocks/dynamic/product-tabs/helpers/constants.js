/**
 * Centralized constants for Product Tabs dynamic block
 * Keep all configuration and constants here to avoid scattered definitions
 */

// API Configuration - centralized endpoint management
export const API_CONFIG = {
  // Quotes tab
  quotesReportsEndpoint: '/aemedge/blocks/dynamic/product-tabs/mock-api/quotes/market-recap.json',
  quotesTableEndpoint: '/aemedge/blocks/dynamic/product-tabs/mock-api/quotes/quotes-table.json',
  cvolEndpoint: '/aemedge/blocks/dynamic/product-tabs/mock-api/quotes/cvol.json',
  optionsLabelsEndpoint: '/aemedge/blocks/dynamic/product-tabs/mock-api/quotes/quotes-v2-getlabels.json',
  optionsDataEndpoint: '/aemedge/blocks/dynamic/product-tabs/mock-api/quotes/quotes-v2-300-',

  // Shared
  expirations: '/aemedge/blocks/dynamic/product-tabs/mock-api/expirations.json',
};

// Fragment URLs
export const FRAGMENT_URLS = {
  productTabs: '/drafts/kunwar/corn/fragments/product/tabs',
  aboutReport: '/drafts/kunwar/corn/fragments/product/about-quotes',
};

// Modal system constants
export const MODAL_CONSTANTS = {
  linkClasses: {
    aboutReport: 'about-report-link',
    modalClass: 'about-report-modal',
  },
};

// Futures/Options toggle system constants
export const TOGGLE_CONSTANTS = {
  toggleClasses: {
    container: 'futures-options-toggle',
    button: 'toggle-btn',
    active: 'active',
    content: 'toggle-content',
    futuresContent: 'futures-content',
    optionsContent: 'options-content',
    dropdown: 'options-dropdown',
    dropdownButton: 'dropdown-btn',
    dropdownMenu: 'dropdown-menu',
    dropdownItem: 'dropdown-item',
    dropdownOpen: 'dropdown-open',
  },
  toggleTypes: {
    futures: 'futures',
    options: 'options',
  },
};

// Cards variants
export const CARDS_VARIANTS = {
  marketRecap: 'market-recap',
  cvol: 'cvol',
};

// Table system constants
export const TABLE_CONSTANTS = {
  variants: {
    fixedRowHeader: 'fixed-row-header',
  },
  placeholders: {
    noData: '--',
    loading: 'Loading...',
    chart: 'CHT',
    options: 'OPT',
  },
};

// Table formatters for consistent data display
export const TABLE_FORMATTERS = {
  volume: (value) => (value && !Number.isNaN(Number(value)) ? parseInt(value, 10).toLocaleString() : '--'),
  price: (value) => (value && !Number.isNaN(Number(value)) ? parseFloat(value).toFixed(2) : '--'),
  change: (change, percentage) => {
    const changeVal = change || '--';
    const percentVal = percentage || '--';
    return `${changeVal} (${percentVal})`;
  },
  simpleTime: (value) => {
    if (!value) return '--';
    try {
      const date = new Date(value);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      });
    } catch {
      return '--';
    }
  },
};

// Quotes table specific constants
export const QUOTES_TABLE_CONSTANTS = {
  tableId: {
    quotes: 'quotes-table',
    options: 'options-table-quotes',
  },
  headers: {
    quotes: ['Contract', 'Last', 'Change', 'Open', 'High', 'Low', 'Volume', 'Updated'],
    options: ['Strike', 'Calls Last', 'Calls Change', 'Calls Volume', 'Puts Last', 'Puts Change', 'Puts Volume'],
  },
};
