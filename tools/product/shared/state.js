/**
 * Shared application state
 */

export const appState = {
  context: null,
  token: null,
  actions: null,
  currentTab: 'single',
  currentSubTab: 'single-create',
};

export function setAuth(context, token, actions) {
  appState.context = context;
  appState.token = token;
  appState.actions = actions;
}

export function getToken() {
  return appState.token;
}

export function setCurrentTab(tabName) {
  appState.currentTab = tabName;
}

export function getCurrentTab() {
  return appState.currentTab;
}
