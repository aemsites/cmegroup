/**
 * Mock Product Data for Local Development
 */

export const MOCK_PRODUCT_DATA = {
  beginCrossTime: '0',
  blockEligible: '1',
  clearingCode: 'C',
  createDate: '2009-09-25T00:00:00.000-0500',
  displayInBlock: '1',
  displayInCmeGroupCom: '1',
  displayInContract: '1',
  endCrossTime: '0',
  exchangeClearing: 'XCBT',
  exchangeGlobex: 'XCBT',
  globexEligible: '1',
  globexGroupCode: 'ZC',
  itcCode: 'ZC',
  lastUpdated: '2015-07-03T00:00:00.000-0500',
  longName: 'Corn Future',
  pitEligible: '0',
  productCategory: 'Grains',
  productGuid: 'YFTQK63AXPDN',
  productId: '300',
  productName: 'Corn',
  productType: 'FUT',
  prsCode: 'C',
  quadrantName: 'Commodities',
  quadrantNameMarketing: 'Agriculture',
  quoteDelay: '600',
  shortName: 'ZC',
  spreadIndicator: '0',
  tccCode: 'C',
  underlyingProduct: 'YFTQK63AXPDN',
  underlyingProductType: 'FUT',
  uriCmegroupcom2: '/markets/agriculture/grains/corn.html',
  webSubGroup: 'Grains',
  weekNumber: '0',
  marketingExchangeCode: 'CBOT',
  optionsLabels: [
    {
      daily: 'false', label: 'American Options', name: 'Corn Options', optionType: 'AME', pitEligible: '0', productId: '301', productIds: '301', sto: 'false', weekly: 'false', isActive: true, isTrading: true,
    },
    {
      daily: 'false', label: 'March-July Calendar Spread Options', listDate: '2013-11-11', name: 'Corn Mar-Jul CSO', optionType: 'H2N', pitEligible: '0', productId: '2700', productIds: '2700', sto: 'false', weekly: 'false', isActive: true, isTrading: true,
    },
    {
      daily: 'false', label: 'March-December Calendar Spread Options', listDate: '2013-11-11', name: 'Corn Mar-Dec CSO', optionType: 'H2Z', pitEligible: '0', productId: '2701', productIds: '2701', sto: 'false', weekly: 'false', isActive: true, isTrading: true,
    },
    {
      daily: 'false', label: 'July-December Calendar Spread Options', name: 'Corn July-Dec CSO', optionType: 'N2Z', pitEligible: '0', productId: '2702', productIds: '2702', sto: 'false', weekly: 'false', isActive: true, isTrading: true,
    },
    {
      daily: 'false', label: 'December-July Calendar Spread Options', name: 'Corn Dec-July CSO', optionType: 'Z2N', pitEligible: '0', productId: '2883', productIds: '2883', sto: 'false', weekly: 'false', isActive: true, isTrading: true,
    },
    {
      daily: 'false', label: 'December-December Calendar Spread Options', name: 'Corn Dec-Dec CSO', optionType: 'Z2Z', pitEligible: '0', productId: '2884', productIds: '2884', sto: 'false', weekly: 'false', isActive: true, isTrading: true,
    },
    {
      daily: 'false', label: 'Consecutive Calendar Spread Option', name: 'Consecutive Corn CSO', optionType: 'CCS', pitEligible: '0', productId: '2730', productIds: '2730', sto: 'false', weekly: 'false', isActive: true, isTrading: true,
    },
    {
      daily: 'false', label: 'Short-Dated New Crop Options', name: 'Short-Dated New Crop Corn Options', optionType: 'SDO', pitEligible: '0', productId: '6756', productIds: '6756', sto: 'false', weekly: 'false', isActive: true, isTrading: true,
    },
    {
      daily: 'false', label: 'Weekly Monday Option', listDate: '2025-02-10', name: 'Corn Monday Weekly Options', optionType: 'MW1', pitEligible: '0', productId: '10960', productIds: ['10960', '10961', '10962', '10963', '10964'], sto: 'false', weekly: 'true', isActive: true, isTrading: true,
    },
    {
      daily: 'false', label: 'Weekly Tuesday Option', listDate: '2025-02-10', name: 'Corn Tuesday Weekly Options', optionType: 'AB1', pitEligible: '0', productId: '10965', productIds: ['10965', '10966', '10967', '10968', '10969'], sto: 'false', weekly: 'true', isActive: true, isTrading: true,
    },
    {
      daily: 'false', label: 'Weekly Wednesday Option', listDate: '2025-02-10', name: 'Corn Wednesday Weekly Options', optionType: 'WD1', pitEligible: '0', productId: '10970', productIds: ['10970', '10971', '10972', '10973', '10974'], sto: 'false', weekly: 'true', isActive: true, isTrading: true,
    },
    {
      daily: 'false', label: 'Weekly Thursday Option', listDate: '2025-02-10', name: 'Corn Thursday Weekly Options', optionType: 'BB1', pitEligible: '0', productId: '10975', productIds: ['10975', '10976', '10977', '10978', '10979'], sto: 'false', weekly: 'true', isActive: true, isTrading: true,
    },
    {
      daily: 'false', label: 'Weekly Friday Option', name: 'Corn Friday Weekly Options', optionType: 'E21', pitEligible: '0', productId: '6244', productIds: ['6244', '6245', '6246', '6247', '6248'], sto: 'false', weekly: 'true', isActive: true, isTrading: true,
    },
    {
      daily: 'false', label: 'Weekly New Crop Options', listDate: '2023-01-23', name: 'New Crop Corn Weekly Options', optionType: 'WC1', pitEligible: '0', productId: '10309', productIds: ['10309', '10310', '10311', '10312', '10313'], sto: 'false', weekly: 'true', isActive: true, isTrading: true,
    },
  ],
  assetClassTitle: 'Agricultural',
  assetClassUrl: '/market-data/volume-open-interest/agriculture-commodities-volume.html',
  productTab: 'overview',
  productTabTitle: 'Overview',
  productTabFullTitle: 'Overview',
  hasOptions: true,
  productSubtitle: 'Futures and Options',
  fullProductName: 'Corn Futures',
  optionProductId: '',
  venueProduct: 'globex',
};

/**
 * Initialize mock data on localhost
 * Called automatically from scripts.js
 */
/**
 * Initialize mock data on localhost
 * Called automatically from templates/product/product.js
 *
 * TO DISABLE MOCKING: Comment out the call to this function in templates/product/product.js
 */
export function initMockData() {
  if (window.location.hostname.includes('localhost')) {
    window.productData = MOCK_PRODUCT_DATA;
    // eslint-disable-next-line no-console
    console.log('[MOCK MODE] window.productData initialized from mock-data.js');
  }
}

/**
 * Check if we're in mock mode
 * @returns {boolean} True if mock mode is active
 */
function isMockMode() {
  return !!window.productData;
}

/**
 * Get product data for loadProductData()
 * @returns {Object|null} Mock data if in mock mode, null to use real API
 */
export function getMockProductData() {
  return isMockMode() ? window.productData : null;
}

/**
 * Check if path exists (for indexHasPath)
 * @returns {boolean|null} True if mock mode (all paths exist), null to use real API
 */
export function getMockIndexHasPath() {
  return isMockMode() ? true : null;
}

/**
 * Get product metadata (productId, productName)
 * @returns {Object|null} Mock metadata if in mock mode, null to use real metadata
 */
export function getMockProductMetadata() {
  if (!isMockMode()) return null;

  return {
    productId: MOCK_PRODUCT_DATA.productId,
    productName: MOCK_PRODUCT_DATA.productName,
  };
}
