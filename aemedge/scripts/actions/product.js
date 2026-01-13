import { PRODUCT_ACTIONS } from '../constants/index.js';

// ==================== PRODUCT DATA ACTIONS ====================

export function setProductData(data) {
  return {
    type: PRODUCT_ACTIONS.SET_PRODUCT_DATA,
    payload: data,
  };
}

export function updateProductField(field, value) {
  return {
    type: PRODUCT_ACTIONS.UPDATE_PRODUCT_FIELD,
    payload: { field, value },
  };
}

export function clearProductData() {
  return {
    type: PRODUCT_ACTIONS.CLEAR_PRODUCT_DATA,
  };
}

// ==================== API DATA ACTIONS ====================

export function setAPIData(apiName, data) {
  return {
    type: PRODUCT_ACTIONS.SET_API_DATA,
    payload: { apiName, data },
  };
}

export function setFetchPromise(apiName, promise) {
  return {
    type: PRODUCT_ACTIONS.SET_FETCH_PROMISE,
    payload: { apiName, promise },
  };
}

export function clearFetchPromise(apiName) {
  return {
    type: PRODUCT_ACTIONS.CLEAR_FETCH_PROMISE,
    payload: { apiName },
  };
}

// ==================== TAB SELECTION ACTIONS (LEGACY) ====================

export function loadedProductTab(loaded) {
  return {
    type: PRODUCT_ACTIONS.LOADED_PRODUCT_TAB,
    payload: { loaded },
  };
}

export function setTabSelection(tab, contractId) {
  return {
    type: PRODUCT_ACTIONS.SET_TAB_SELECTION,
    payload: { tab, contractId },
  };
}

export function clearTabSelection(tab) {
  return {
    type: PRODUCT_ACTIONS.CLEAR_TAB_SELECTION,
    payload: { tab },
  };
}

export function clearAllTabSelections() {
  return {
    type: PRODUCT_ACTIONS.CLEAR_ALL_TAB_SELECTIONS,
  };
}

// ==================== GLOBAL OPTION SELECTION ACTIONS ====================

export function setGlobalOptionSelection(contractId) {
  return {
    type: PRODUCT_ACTIONS.SET_GLOBAL_OPTION_SELECTION,
    payload: { contractId },
  };
}

export function clearGlobalOptionSelection() {
  return {
    type: PRODUCT_ACTIONS.CLEAR_GLOBAL_OPTION_SELECTION,
  };
}

// ==================== NAVIGATION ACTIONS ====================

export function setNavigationToken(token) {
  return {
    type: PRODUCT_ACTIONS.SET_NAVIGATION_TOKEN,
    payload: { token },
  };
}

export function setCreatingToggle(isCreating) {
  return {
    type: PRODUCT_ACTIONS.SET_CREATING_TOGGLE,
    payload: { isCreating },
  };
}

export function setToggleOperation(token) {
  return {
    type: PRODUCT_ACTIONS.SET_TOGGLE_OPERATION,
    payload: { token },
  };
}
