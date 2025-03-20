import { loadCSS } from '../../../scripts/aem.js';
import { createElement } from '../../../scripts/utils.js';

const TABS_STYLE = 'tabs';
const TABS_LEGACY_STYLE = 'tabs-legacy';
const TABS_SELECT_PLACEHOLDER = 'Please select..';
const COLLAPSIBLE_CLASSES = ['collapsible-sm', 'collapsible-md', 'collapse-all'];
const ADDITIONAL_CLASSES = ['full-width'];

/**
 * Creates a dropdown select menu for tabs
 * @param {Object[]} tabData - Array of objects with tab information
 * @return {Object} - Object containing select element and its wrapper
 */
function createTabsDropdown(tabData) {
  const selectWrapper = createElement('div', { class: 'tabs-select-wrapper' });
  const placeholderOption = createElement('option', {
    value: '',
    selected: true,
  });
  placeholderOption.textContent = TABS_SELECT_PLACEHOLDER;
  const selectElement = createElement('select', { class: 'tabs-select' }, placeholderOption);

  let isFirst = true;
  tabData.forEach(({ id, title }) => {
    const option = createElement('option', {
      value: id,
      selected: isFirst,
    });
    option.textContent = title;
    selectElement.appendChild(option);
    isFirst = false;
  });

  selectWrapper.appendChild(selectElement);
  return { selectWrapper, selectElement };
}

/**
 * Collects all applicable CSS classes from sections that should be promoted to the tabs container
 * and removes them from the original sections
 * @param {Element[]} sections - Array of section elements
 * @return {Set<string>} - Set of class names to apply to the tabs container
 */
function collectTabStyles(sections) {
  const collectedClasses = new Set();

  sections.forEach((section) => {
    section.classList.remove(TABS_STYLE);
    section.classList.remove(TABS_LEGACY_STYLE);

    COLLAPSIBLE_CLASSES.forEach((className) => {
      if (section.classList.contains(className)) {
        collectedClasses.add(className);
        section.classList.remove(className);
      }
    });

    ADDITIONAL_CLASSES.forEach((className) => {
      if (section.classList.contains(className)) {
        collectedClasses.add(className);
        section.classList.remove(className);
      }
    });
  });

  return collectedClasses;
}

/**
 * Find all consecutive groups of tab sections
 * @param {Element[]} sections - All sections in the document
 * @return {Element[][]} - Array of arrays containing grouped tab sections
 */
function findTabGroups(sections) {
  let currentGroup = [];
  const tabGroups = [];

  sections.forEach((section, index) => {
    if (section.classList.contains(TABS_STYLE) || section.classList.contains(TABS_LEGACY_STYLE)) {
      currentGroup.push(section);
    } else if (currentGroup.length > 0) {
      tabGroups.push(currentGroup);
      currentGroup = [];
    }

    // Handle the last group if we're at the end
    if (index === sections.length - 1 && currentGroup.length > 0) {
      tabGroups.push(currentGroup);
    }
  });

  return tabGroups;
}

/**
 * Determines tab configuration based on styles and classes
 * @param {Element[]} tabSections - Sections belonging to this tab group
 * @param {Set<string>} collectedStyles - Styles collected from all sections
 * @return {Object} - Configuration object for tabs
 */
function determineTabConfig(tabSections, collectedStyles) {
  const isLegacyTabs = tabSections.some(section => section.classList.contains(TABS_LEGACY_STYLE));
  const hasCollapsibleSm = collectedStyles.has('collapsible-sm');
  const hasCollapsibleMd = collectedStyles.has('collapsible-md');
  const collapseAll = collectedStyles.has('collapse-all');
  
  // Determine breakpoint for collapsible behavior
  let collapsibleBreakpoint = 0; // 0 means don't collapse
  if (hasCollapsibleSm) {
    collapsibleBreakpoint = 768;
  } else if (hasCollapsibleMd) {
    collapsibleBreakpoint = 992;
  }
  
  // Only use accordion for standard tabs with collapsible classes
  const useAccordion = !isLegacyTabs && (hasCollapsibleSm || hasCollapsibleMd);

  return {
    isLegacyTabs,
    hasCollapsibleSm,
    hasCollapsibleMd,
    collapseAll,
    collapsibleBreakpoint,
    useAccordion,
  };
}

/**
 * Creates the main tabs container element
 * @param {boolean} isLegacyTabs - Whether this is a legacy tabs group
 * @param {Set<string>} collectedStyles - Styles to apply to the container
 * @return {Element} - The tabs container element
 */
function createTabsContainer(isLegacyTabs, collectedStyles) {
  const tabsContainer = createElement('div', { 
    class: `section tabs ${isLegacyTabs ? 'tabs-legacy' : ''}` 
  });
  
  // Add collected styles to container
  collectedStyles.forEach(className => {
    tabsContainer.classList.add(className);
  });

  return tabsContainer;
}

/**
 * Process and normalize tab IDs from all sections
 * @param {Element[]} sections - All sections in this tab group
 * @return {Object} - Contains map of sections to IDs and set of unique IDs
 */
function normalizeTabIds(sections) {
  const uniqueTabIds = new Set();
  const tabIdMap = new Map(); // Maps section to its normalized tab ID
  
  // First pass - collect all defined tab IDs
  sections.forEach((section) => {
    if (section.dataset.tabId) {
      const normalizedId = section.dataset.tabId.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '-');
      uniqueTabIds.add(normalizedId);
      tabIdMap.set(section, normalizedId);
    }
  });

  // If no tab IDs defined, use default
  if (uniqueTabIds.size === 0) {
    uniqueTabIds.add('default-tab');
    sections.forEach((section) => {
      tabIdMap.set(section, 'default-tab');
    });
  }
  
  // Second pass - apply normalized tab IDs to all sections
  sections.forEach((section) => {
    let sectionTabId = tabIdMap.get(section);
    
    // If this section doesn't have a tab ID, assign the first valid one from the set
    if (!sectionTabId && uniqueTabIds.size > 0) {
      sectionTabId = uniqueTabIds.values().next().value;
      tabIdMap.set(section, sectionTabId);
    }
    
    section.dataset.normalizedTabId = sectionTabId;
  });

  return { uniqueTabIds, tabIdMap };
}

/**
 * Group sections by their normalized tab ID
 * @param {Element[]} sections - All sections in this tab group
 * @return {Object[]} - Array of tab data objects with id, title, and sections
 */
function groupSectionsByTabId(sections) {
  const sectionGroups = new Map();
  
  sections.forEach((section) => {
    const normalizedId = section.dataset.normalizedTabId || 'default-tab';
    
    if (!sectionGroups.has(normalizedId)) {
      // Initialize with empty title, we'll find the first valid title later
      sectionGroups.set(normalizedId, {
        title: '',
        sections: [],
      });
    }
    
    // If this section has a tab title and the group doesn't have one yet, use this title
    if (section.dataset.tabTitle && !sectionGroups.get(normalizedId).title) {
      sectionGroups.get(normalizedId).title = section.dataset.tabTitle;
    }
    
    sectionGroups.get(normalizedId).sections.push(section);
  });
  
  // Make sure all groups have titles - default to ID if no title found
  sectionGroups.forEach((group, id) => {
    if (!group.title) {
      group.title = id;
    }
  });

  // Convert to array format for easier use
  return Array.from(sectionGroups).map(([id, data]) => ({
    id,
    title: data.title,
    sections: data.sections,
  }));
}

/**
 * Creates desktop tab elements (buttons and panels)
 * @param {Object[]} tabData - Array of tab data with id, title, and sections
 * @param {string} hash - Current URL hash
 * @param {boolean} collapseAll - Whether all tabs should be collapsed by default
 * @param {boolean} isFullWidth - Whether this is a full-width tab container
 * @return {Object} - Desktop tabs DOM elements and references
 */
function createDesktopTabs(tabData, hash, collapseAll, isFullWidth) {
  const desktopTabsList = createElement('div', { class: 'tabs-list desktop-tabs', role: 'tablist' });
  const desktopContent = createElement('div', { class: 'tabs-content desktop-content' });
  const desktopButtons = {};
  const desktopPanels = {};
  
  const hashMatchesTab = tabData.some(tab => tab.id === hash);
  
  // Create desktop tab buttons
  tabData.forEach(({ id, title, sections }, index) => {
    // Determine if this tab should be initially selected
    const isSelected = (hashMatchesTab && id === hash) || 
                      (!hashMatchesTab && index === 0 && !collapseAll);
                      
    const button = createElement('button', {
      class: 'tabs-tab',
      id: `desktop-${id}`,
      role: 'tab',
      'aria-controls': `desktop-panel-${id}`,
      'aria-selected': isSelected,
      type: 'button',
    });
    button.textContent = title;
    desktopTabsList.appendChild(button);
    desktopButtons[id] = button;
    
    // Create desktop panels
    const panel = createElement('div', {
      class: 'tab',
      id: `desktop-panel-${id}`,
      role: 'tabpanel',
      'aria-labelledby': `desktop-${id}`,
      'aria-hidden': !isSelected,
    });
    
    // Clone the section content for desktop panels
    sections.forEach((section) => {
      const sectionClone = section.cloneNode(true);
      sectionClone.style.removeProperty('display');
      
      // Only add container class if the tab is full-width
      if (isFullWidth) {
        sectionClone.classList.add('container');
      }
      panel.appendChild(sectionClone);
    });
    
    desktopContent.appendChild(panel);
    desktopPanels[id] = panel;
  });

  return {
    desktopTabsList,
    desktopContent,
    desktopButtons,
    desktopPanels,
    hashMatchesTab,
  };
}

/**
 * Creates mobile accordion elements (buttons and panels)
 * @param {Object[]} tabData - Array of tab data with id, title, and sections
 * @param {string} hash - Current URL hash
 * @param {boolean} collapseAll - Whether all tabs should be collapsed by default
 * @param {boolean} hashMatchesTab - Whether the hash matches any tab
 * @param {boolean} isFullWidth - Whether this is a full-width tab container
 * @return {Object} - Mobile accordion DOM elements and references
 */
function createMobileAccordion(tabData, hash, collapseAll, hashMatchesTab, isFullWidth) {
  const mobileAccordion = createElement('div', { class: 'tabs-list mobile-accordion', role: 'tablist' });
  const mobileButtons = {};
  const mobilePanels = {};
  
  // Create mobile accordion buttons and panels
  tabData.forEach(({ id, title, sections }, index) => {
    // Determine if this accordion item should be initially selected/expanded
    const isSelected = (hashMatchesTab && id === hash) || 
                      (!hashMatchesTab && index === 0 && !collapseAll);
                      
    const button = createElement('button', {
      class: 'tabs-tab',
      id: `mobile-${id}`,
      role: 'tab',
      'aria-controls': `mobile-panel-${id}`,
      'aria-selected': isSelected,
      type: 'button',
    });
    button.textContent = title;
    mobileAccordion.appendChild(button);
    mobileButtons[id] = button;
    
    // Create the panel right after its button
    const panel = createElement('div', {
      class: 'tab',
      id: `mobile-panel-${id}`,
      role: 'tabpanel',
      'aria-labelledby': `mobile-${id}`,
      'aria-hidden': !isSelected,
    });
    
    sections.forEach((section) => {
      // Clone the section instead of moving the original
      const sectionClone = section.cloneNode(true);
      // Only add container class if the tab is full-width
      if (isFullWidth) {
        sectionClone.classList.add('container');
      }
      panel.appendChild(sectionClone);
    });
    
    mobileAccordion.appendChild(panel);
    mobilePanels[id] = panel;
  });

  return {
    mobileAccordion,
    mobileButtons,
    mobilePanels,
  };
}

/**
 * Set up desktop tab event listeners
 * @param {Element} tabsList - The tabs list element
 * @param {Element} content - The content container element
 * @param {Object} buttons - Map of tab IDs to button elements
 * @param {Object} panels - Map of tab IDs to panel elements
 * @param {Object} mobileElements - Mobile accordion elements
 * @param {Element} selectElement - The select dropdown element for mobile
 */
function setupDesktopTabEvents(tabsList, content, buttons, panels, mobileElements, selectElement) {
  const { mobileButtons, mobilePanels } = mobileElements || {};

  Object.entries(buttons).forEach(([id, button]) => {
    button.addEventListener('click', () => {
      // Update buttons state
      tabsList.querySelectorAll('button').forEach((btn) => {
        btn.setAttribute('aria-selected', btn === button);
      });
      
      // Update panels visibility
      content.querySelectorAll('.tab[role="tabpanel"]').forEach((panel) => {
        panel.setAttribute('aria-hidden', panel !== panels[id]);
      });
      
      // Update URL hash
      const url = new URL(window.location);
      url.hash = id;
      window.history.pushState({}, '', url);
      
      // Update mobile accordion if it exists
      if (mobileButtons && mobileButtons[id]) {
        // Close all panels first
        Object.values(mobileButtons).forEach((btn) => {
          btn.setAttribute('aria-selected', false);
        });
        Object.values(mobilePanels).forEach((panel) => {
          panel.setAttribute('aria-hidden', true);
        });
        
        // Open the selected panel
        mobileButtons[id].setAttribute('aria-selected', true);
        mobilePanels[id].setAttribute('aria-hidden', false);
      }
      
      // Update dropdown if it exists
      if (selectElement) {
        selectElement.value = id;
      }
    });
  });
}

/**
 * Set up mobile accordion event listeners
 * @param {Object} mobileButtons - Map of tab IDs to mobile button elements
 * @param {Object} mobilePanels - Map of tab IDs to mobile panel elements
 * @param {Object} desktopElements - Desktop tabs elements
 * @param {Element} selectElement - The select dropdown element for mobile
 */
function setupMobileAccordionEvents(mobileButtons, mobilePanels, desktopElements, selectElement) {
  if (!mobileButtons) return;

  const { desktopTabsList, desktopContent, desktopButtons, desktopPanels } = desktopElements;

  Object.entries(mobileButtons).forEach(([id, button]) => {
    button.addEventListener('click', () => {
      const isSelected = button.getAttribute('aria-selected') === 'true';
      
      // Close all panels first
      Object.values(mobileButtons).forEach((btn) => {
        btn.setAttribute('aria-selected', false);
      });
      
      Object.values(mobilePanels).forEach((panel) => {
        panel.setAttribute('aria-hidden', true);
      });
      
      // Toggle current panel
      if (!isSelected) {
        button.setAttribute('aria-selected', true);
        mobilePanels[id].setAttribute('aria-hidden', false);
        
        // Update desktop tabs
        desktopTabsList.querySelectorAll('button').forEach((btn) => {
          btn.setAttribute('aria-selected', btn === desktopButtons[id]);
        });
        
        desktopContent.querySelectorAll('.tab[role="tabpanel"]').forEach((panel) => {
          panel.setAttribute('aria-hidden', panel !== desktopPanels[id]);
        });
        
        // Update URL hash
        const url = new URL(window.location);
        url.hash = id;
        window.history.pushState({}, '', url);
        
        // Update dropdown for legacy tabs
        if (selectElement) {
          selectElement.value = id;
        }
      }
    });
  });
}

/**
 * Set up mobile dropdown event listeners
 * @param {Element} selectElement - The select dropdown element
 * @param {Object} desktopButtons - Map of tab IDs to desktop button elements
 */
function setupDropdownEvents(selectElement, desktopButtons) {
  if (!selectElement) return;
  
  selectElement.addEventListener('change', () => {
    const selectedId = selectElement.value;
    if (desktopButtons[selectedId]) {
      desktopButtons[selectedId].click();
    }
  });
}

/**
 * Create a resize handler function for responsive behavior
 * @param {Object} config - Tab configuration object
 * @param {Element} container - The tabs container element
 * @param {Object} desktop - Desktop elements
 * @param {Object} mobile - Mobile elements 
 * @param {Element} selectWrapper - The select wrapper element for legacy tabs
 * @return {Function} - Resize handler function
 */
function createResizeHandler(config, container, desktop, mobile, selectWrapper) {
  const { isLegacyTabs, collapsibleBreakpoint, useAccordion } = config;
  const { desktopTabsList, desktopContent, desktopButtons } = desktop;
  const { mobileAccordion } = mobile || {};

  return () => {
    const windowWidth = window.innerWidth;
    
    if (isLegacyTabs) {
      // Legacy tabs behavior (always use dropdown at 992px)
      const isMobile = windowWidth <= 992;
      
      if (isMobile) {
        container.classList.add('tabs-mobile');
        container.classList.add('tabs-mobile-dropdown');
        if (selectWrapper) selectWrapper.style.display = 'block';
        desktopTabsList.style.display = 'none';
      } else {
        container.classList.remove('tabs-mobile', 'tabs-mobile-dropdown');
        if (selectWrapper) selectWrapper.style.display = 'none';
        desktopTabsList.style.display = 'flex';
        desktopContent.style.display = 'block';
      }
    } else {
      // Standard tabs behavior (based on collapsible classes)
      const shouldCollapse = collapsibleBreakpoint > 0 && windowWidth <= collapsibleBreakpoint;
      
      if (shouldCollapse) {
        // Show accordion
        container.classList.add('tabs-mobile');
        container.classList.add('tabs-mobile-accordion');
        
        if (useAccordion && mobileAccordion) {
          mobileAccordion.style.display = 'block';
          desktopTabsList.style.display = 'none';
          desktopContent.style.display = 'none';
        } else {
          // Tabs without accordion still show horizontal tabs
          desktopTabsList.style.display = 'flex';
          desktopContent.style.display = 'block';
        }
      } else {
        // Show horizontal tabs
        container.classList.remove('tabs-mobile', 'tabs-mobile-accordion');
        
        if (useAccordion && mobileAccordion) {
          mobileAccordion.style.display = 'none';
        }
        
        desktopTabsList.style.display = 'flex';
        desktopContent.style.display = 'block';
      }
    }
    
    // Ensure a tab is selected when switching to desktop view
    if (windowWidth > collapsibleBreakpoint) {
      const activeButton = desktopTabsList.querySelector('button[aria-selected="true"]');
      if (!activeButton && Object.keys(desktopButtons).length > 0) {
        // If no tab is active (possibly after collapsing all in accordion),
        // select the first tab in desktop view
        desktopButtons[Object.keys(desktopButtons)[0]].click();
      }
    }
  };
}

/**
 * Process and render a single tab group
 * @param {Element[]} tabSections - Sections in this tab group
 */
function processTabGroup(tabSections) {
  if (tabSections.length === 0) return;

  // Collect styles and determine tab configuration
  const collectedStyles = collectTabStyles(tabSections);
  const config = determineTabConfig(tabSections, collectedStyles);
  
  // Create container and wrapper
  const tabsContainer = createTabsContainer(config.isLegacyTabs, collectedStyles);
  const tabsWrapper = createElement('div', { class: 'tabs-wrapper' });

  // Insert container into DOM
  const firstSection = tabSections[0];
  firstSection.parentNode.insertBefore(tabsContainer, firstSection);

  // Process tab IDs and group sections
  normalizeTabIds(tabSections);
  const tabData = groupSectionsByTabId(tabSections);

  // Get current URL hash
  const hash = window.location.hash.substring(1).toLowerCase();
  
  // Check if this is a full-width tab container
  const isFullWidth = tabsContainer.classList.contains('full-width');
  
  // Create DOM elements for desktop and mobile
  const desktop = createDesktopTabs(tabData, hash, config.collapseAll, isFullWidth);
  
  let mobile = null;
  if (config.useAccordion) {
    mobile = createMobileAccordion(tabData, hash, config.collapseAll, desktop.hashMatchesTab, isFullWidth);
  }
  
  // Create dropdown for legacy tabs
  const { selectWrapper, selectElement } = config.isLegacyTabs 
    ? createTabsDropdown(tabData) 
    : { selectWrapper: null, selectElement: null };
  
  // Assemble the components
  tabsWrapper.append(desktop.desktopTabsList, desktop.desktopContent);
  
  // Add mobile accordion if needed
  if (config.useAccordion && mobile) {
    tabsWrapper.appendChild(mobile.mobileAccordion);
    // Initially hide it
    mobile.mobileAccordion.style.display = 'none';
  }
  
  // Add dropdown for legacy tabs
  if (config.isLegacyTabs && selectWrapper) {
    tabsWrapper.appendChild(selectWrapper);
    // Initially hide it
    selectWrapper.style.display = 'none';
  }
  
  tabsContainer.appendChild(tabsWrapper);

  // Set up event listeners
  setupDesktopTabEvents(
    desktop.desktopTabsList, 
    desktop.desktopContent, 
    desktop.desktopButtons, 
    desktop.desktopPanels, 
    mobile, 
    selectElement
  );
  
  if (config.useAccordion && mobile) {
    setupMobileAccordionEvents(
      mobile.mobileButtons, 
      mobile.mobilePanels, 
      desktop, 
      selectElement
    );
  }
  
  if (config.isLegacyTabs && selectElement) {
    setupDropdownEvents(selectElement, desktop.desktopButtons);
  }
  
  // Create and attach resize handler
  const handleResize = createResizeHandler(
    config, 
    tabsContainer, 
    desktop, 
    mobile, 
    selectWrapper
  );
  
  // Initial call to set correct state
  handleResize();
  
  // Add resize listener
  window.addEventListener('resize', handleResize);
  
  // If there's a hash in the URL, trigger the click on the matching tab
  if (hash && desktop.desktopButtons[hash]) {
    desktop.desktopButtons[hash].click();
  }
  
  // Remove the original tab sections from the DOM since they've been processed
  // and are now part of the tab component
  tabSections.forEach(section => {
    // Only remove if the section is still in the DOM
    if (section.parentNode) {
      section.parentNode.removeChild(section);
    }
  });
}

/**
 * Creates tabs from sections with the tab class
 * @param {Element} main - The main element containing sections
 * @return {Promise} - Resolves when tabs are created
 */
export default async function createTabs(main) {
  const allSections = [...main.querySelectorAll('.section')];
  if (!allSections.length) return Promise.resolve();

  // Find tab groups
  const tabGroups = findTabGroups(allSections);
  if (tabGroups.length === 0) return Promise.resolve();

  // Loading CSS after confirming that tabs exist
  await loadCSS(`${window.hlx.codeBasePath}/blocks/dynamic/tabs/tabs.css`);

  // Process each group of consecutive tabs
  tabGroups.forEach(processTabGroup);

  return Promise.resolve();
}
