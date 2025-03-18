import { loadCSS } from '../../../scripts/aem.js';
import { createElement } from '../../../scripts/utils.js';

const TABS_STYLE = 'tabs';
const TABS_SELECT_PLACEHOLDER = 'Please select..';

/**
 * Creates a dropdown select menu for tabs
 * @param {Object[]} tabData - Array of objects with tab information
 * @return {Object} - Object containing select element and its wrapper
 */
function createTabsDropdown(tabData) {
  const selectWrapper = createElement('div', { class: 'tabs-select-wrapper' });
  const placeholderOption = createElement('option', { 
    value: '', 
    selected: true 
  });
  placeholderOption.textContent = TABS_SELECT_PLACEHOLDER;
  const selectElement = createElement('select', { class: 'tabs-select' }, placeholderOption);
  
  let isFirst = true;
  tabData.forEach(({ id, title }) => {
    const option = createElement('option', { 
      value: id, 
      selected: isFirst 
    });
    option.textContent = title;
    selectElement.appendChild(option);
    isFirst = false;
  });
  
  selectWrapper.appendChild(selectElement);
  return { selectWrapper, selectElement };
}

/**
 * Creates tab buttons for the tabs interface
 * @param {Object[]} tabData - Array of objects with tab information
 * @return {Object} - Object containing tabs list element and button references
 */
function createTabButtons(tabData) {
  const tabsList = createElement('div', { class: 'tabs-list', role: 'tablist' });
  const buttons = {};
  
  let isFirst = true;
  tabData.forEach(({ id, title }) => {
    const button = createElement('button', { 
      class: 'tabs-tab', 
      id: id, 
      role: 'tab', 
      'aria-controls': id, 
      'aria-selected': isFirst, 
      type: 'button' 
    });
    button.textContent = title;
    tabsList.appendChild(button);
    buttons[id] = button;
    isFirst = false;
  });
  
  return { tabsList, buttons };
}

/**
 * Creates tab panels to contain tab content
 * @param {Object[]} tabData - Array of objects with tab information and sections
 * @return {Object} - Object containing content container and panel references
 */
function createTabPanels(tabData) {
  const tabsContent = createElement('div', { class: 'tabs-content' });
  const panels = {};
  
  let isFirst = true;
  tabData.forEach(({ id, sections }) => {
    const tabPanel = createElement('div', { 
      class: 'tab', 
      id: id, 
      role: 'tabpanel', 
      'aria-labelledby': id, 
      'aria-hidden': !isFirst 
    });
    
    sections.forEach(section => {
      section.style.removeProperty('display');
      tabPanel.appendChild(section);
    });
    
    tabsContent.appendChild(tabPanel);
    panels[id] = tabPanel;
    isFirst = false;
  });
  
  return { tabsContent, panels };
}

/**
 * Sets up event handlers for tabs
 * @param {Object} elements - Object containing all tab interface elements
 * @param {Object} elements.buttons - References to all tab buttons
 * @param {Object} elements.panels - References to all tab panels
 * @param {Element} elements.tabsList - The tabs list container
 * @param {Element} elements.tabsContent - The tabs content container
 * @param {Element} elements.selectElement - The select dropdown element
 */
function setupTabEvents({ buttons, panels, tabsList, tabsContent, selectElement }) {
  // Setup button click events
  Object.entries(buttons).forEach(([tabId, button]) => {
    button.addEventListener('click', () => {
      // Update buttons state
      tabsList.querySelectorAll('button').forEach((btn) => {
        btn.setAttribute('aria-selected', btn === button);
      });
      
      // Update panels visibility
      tabsContent.querySelectorAll('.tab[role="tabpanel"]').forEach((panel) => {
        panel.setAttribute('aria-hidden', panel !== panels[tabId]);
      });
      
      // Update select dropdown value
      selectElement.value = tabId;
      
      // Update URL hash
      const url = new URL(window.location);
      url.hash = tabId;
      window.history.pushState({}, '', url);
    });
  });
  
  // Setup select change event
  selectElement.addEventListener('change', () => {
    const selectedTabId = selectElement.value;
    if (buttons[selectedTabId]) {
      buttons[selectedTabId].click();
    }
  });
}

/**
 * Handles initial tab selection based on URL hash
 * @param {Object} buttons - References to all tab buttons
 */
function handleInitialTabSelection(buttons) {
  const hash = window.location.hash.substring(1).toLowerCase();
  if (hash && buttons[hash]) {
    buttons[hash].click();
  }
}

export async function createTabs(main) {
  const allSections = [...main.querySelectorAll('.section')];
  if (!allSections.length) return Promise.resolve();

  // Find consecutive groups of tab sections
  let currentGroup = [];
  const tabGroups = [];

  allSections.forEach((section, index) => {
    if (section.classList.contains(TABS_STYLE)) {
      currentGroup.push(section);
    } else {
      if (currentGroup.length > 0) {
        tabGroups.push(currentGroup);
        currentGroup = [];
      }
    }

    if (index === allSections.length - 1 && currentGroup.length > 0) {
      tabGroups.push(currentGroup);
    }
  });

  if (tabGroups.length === 0) return Promise.resolve();

  // loading css after confirming that tabs exist
  await loadCSS(`${window.hlx.codeBasePath}/blocks/dynamic/tabs/tabs.css`);

  // Process each group of consecutive tabs
  tabGroups.forEach(tabSections => {
    if (tabSections.length === 0) return;

    // Create container elements
    const tabsContainer = createElement('div', { class: 'section tabs' });
    const tabsWrapper = createElement('div', { class: 'tabs-wrapper' });
    
    // Insert container into DOM
    const firstSection = tabSections[0];
    firstSection.parentNode.insertBefore(tabsContainer, firstSection);

    // Process and normalize tab IDs
    const uniqueTabIds = new Set();
    tabSections.forEach((section) => {
      if (section.dataset.tabId) {
        const normalizedId = section.dataset.tabId.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '-');
        uniqueTabIds.add(normalizedId);
        section.dataset.normalizedTabId = normalizedId;
      }
    });

    if (uniqueTabIds.size === 0) {
      uniqueTabIds.add('default-tab');
      tabSections.forEach(section => {
        section.dataset.normalizedTabId = 'default-tab';
      });
    }

    // Group sections by normalized tab ID
    const sectionGroups = new Map();
    tabSections.forEach((section) => {
      const normalizedId = section.dataset.normalizedTabId || 'default-tab';
      
      if (!sectionGroups.has(normalizedId)) {
        sectionGroups.set(normalizedId, {
          title: section.dataset.tabTitle || normalizedId,
          sections: []
        });
      }
      sectionGroups.get(normalizedId).sections.push(section);
    });

    // Create data structure for tab creation
    const tabData = Array.from(sectionGroups).map(([id, data]) => ({
      id,
      title: data.title,
      sections: data.sections
    }));

    // Create tab interface components
    const { selectWrapper, selectElement } = createTabsDropdown(tabData);
    const { tabsList, buttons } = createTabButtons(tabData);
    const { tabsContent, panels } = createTabPanels(tabData);
    
    // Set up event handlers
    setupTabEvents({ 
      buttons, 
      panels, 
      tabsList, 
      tabsContent, 
      selectElement 
    });
    
    // Handle initial tab selection from URL
    handleInitialTabSelection(buttons);

    // Assemble the tab interface
    tabsWrapper.append(selectWrapper, tabsList, tabsContent);
    tabsContainer.append(tabsWrapper);
  });

  return Promise.resolve();
}