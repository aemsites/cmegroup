import { PRODUCT_ACTIONS } from '../constants/index.js';

// ==================== INITIAL STATES ====================

export const productDataInitState = {
  loaded: false,
  productId: null,
  productRoot: null,
  productName: null,
  productSymbol: null,
  fetchedAt: null,
  fetchPromises: {},
  // API data will be stored here dynamically
  optionsExpirations: null,
  quotesData: {
    table: null,
    labels: null,
    cvol: null,
    marketRecap: null,
  },
  settlementsData: {
    tradeDates: null,
  },
  contractsMetadata: null,
};

export const tabSelectionsInitState = {};

export const productTabInitState = {
  loaded: false,
};

export const globalOptionSelectionInitState = {
  selectedContract: null, // null = futures, string = option product ID
};

export const navigationInitState = {
  currentToken: null,
  isCreatingToggle: false,
  currentToggleOperation: null,
};

// ==================== REDUCERS ====================

/**
 * Product Data Reducer
 * Handles all product-related data updates
 */
// eslint-disable-next-line default-param-last
export function productDataReducer(state = productDataInitState, action) {
  switch (action.type) {
    case PRODUCT_ACTIONS.SET_PRODUCT_DATA:
      return {
        ...state,
        ...action.payload,
      };

    case PRODUCT_ACTIONS.UPDATE_PRODUCT_FIELD: {
      const { field, value } = action.payload;
      const newState = { ...state };

      // Handle nested paths like 'quotesData.table'
      if (field.includes('.')) {
        const keys = field.split('.');
        const lastKey = keys.pop();
        let target = newState;

        keys.forEach((key) => {
          if (!target[key]) target[key] = {};
          else target[key] = { ...target[key] }; // Clone for immutability
          target = target[key];
        });

        target[lastKey] = value;
      } else {
        // Simple top-level field
        newState[field] = value;
      }

      return newState;
    }

    case PRODUCT_ACTIONS.CLEAR_PRODUCT_DATA:
      return { ...productDataInitState };

    case PRODUCT_ACTIONS.SET_API_DATA: {
      const { apiName, data } = action.payload;
      // Handle nested keys like 'quotesData.table'
      if (apiName.includes('.')) {
        const [parent, child] = apiName.split('.');
        return {
          ...state,
          [parent]: {
            ...state[parent],
            [child]: data,
          },
        };
      }
      return {
        ...state,
        [apiName]: data,
      };
    }

    case PRODUCT_ACTIONS.SET_FETCH_PROMISE:
      return {
        ...state,
        fetchPromises: {
          ...state.fetchPromises,
          [action.payload.apiName]: action.payload.promise,
        },
      };

    case PRODUCT_ACTIONS.CLEAR_FETCH_PROMISE: {
      const newPromises = { ...state.fetchPromises };
      delete newPromises[action.payload.apiName];
      return {
        ...state,
        fetchPromises: newPromises,
      };
    }

    default:
      return state;
  }
}

/**
 * Tab Selections Reducer
 * Handles per-tab contract selections
 */
// eslint-disable-next-line default-param-last
export function tabSelectionsReducer(state = tabSelectionsInitState, action) {
  switch (action.type) {
    case PRODUCT_ACTIONS.SET_TAB_SELECTION:
      return {
        ...state,
        [action.payload.tab]: action.payload.contractId,
      };

    case PRODUCT_ACTIONS.CLEAR_TAB_SELECTION: {
      const newState = { ...state };
      delete newState[action.payload.tab];
      return newState;
    }

    case PRODUCT_ACTIONS.CLEAR_ALL_TAB_SELECTIONS:
      return {};

    default:
      return state;
  }
}

/**
 * Product Tab Reducer
 * Handles product tab load
 */
// eslint-disable-next-line default-param-last
export function productTabReducer(state = productTabInitState, action) {
  switch (action.type) {
    case PRODUCT_ACTIONS.LOADED_PRODUCT_TAB:
      return {
        loaded: action.payload.loaded,
      };

    default:
      return state;
  }
}

/**
 * Global Option Selection Reducer
 * Handles global option selection that applies to all tabs
 */
// eslint-disable-next-line default-param-last
export function globalOptionSelectionReducer(state = globalOptionSelectionInitState, action) {
  switch (action.type) {
    case PRODUCT_ACTIONS.SET_GLOBAL_OPTION_SELECTION:
      return {
        ...state,
        selectedContract: action.payload.contractId,
      };

    case PRODUCT_ACTIONS.CLEAR_GLOBAL_OPTION_SELECTION:
      return {
        ...state,
        selectedContract: null,
      };

    default:
      return state;
  }
}

/**
 * Navigation Reducer
 * Handles navigation and UI state
 */
// eslint-disable-next-line default-param-last
export function navigationReducer(state = navigationInitState, action) {
  switch (action.type) {
    case PRODUCT_ACTIONS.SET_NAVIGATION_TOKEN:
      return {
        ...state,
        currentToken: action.payload.token,
      };

    case PRODUCT_ACTIONS.SET_CREATING_TOGGLE:
      return {
        ...state,
        isCreatingToggle: action.payload.isCreating,
      };

    case PRODUCT_ACTIONS.SET_TOGGLE_OPERATION:
      return {
        ...state,
        currentToggleOperation: action.payload.token,
      };

    default:
      return state;
  }
}
