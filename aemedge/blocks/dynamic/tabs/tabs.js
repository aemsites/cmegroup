import { loadCSS } from '../../../scripts/aem.js';
import { createElement } from '../../../scripts/utils.js';

const TABS_STYLE = 'tabs';
const COLLAPSIBLE_CLASSES = ['collapsible-sm', 'collapsible-md', 'collapse-all'];
const ADDITIONAL_CLASSES = ['full-width'];

class TabsManager {
  constructor(main) {
    this.main = main;
    this.currentHash = window.location.hash.substring(1).toLowerCase();
  }

  async initialize() {
    const allSections = [...this.main.querySelectorAll(':scope >.section')];
    if (!allSections.length) return Promise.resolve();

    const tabGroups = TabsManager.findTabGroups(allSections);
    if (tabGroups.length === 0) return Promise.resolve();

    // removed await intentionally to avoid blocking the main thread
    // we can revisit adding this await if we have dependencies on some computed styles
    loadCSS(`${window.hlx.codeBasePath}/blocks/dynamic/tabs/tabs.css`);
    tabGroups.forEach((sections) => this.processTabGroup(sections));

    return Promise.resolve();
  }

  static findTabGroups(sections) {
    let currentGroup = [];
    const tabGroups = [];

    sections.forEach((section, index) => {
      if (section.classList.contains(TABS_STYLE)) {
        currentGroup.push(section);
      } else if (currentGroup.length > 0) {
        tabGroups.push(currentGroup);
        currentGroup = [];
      }

      if (index === sections.length - 1 && currentGroup.length > 0) {
        tabGroups.push(currentGroup);
      }
    });

    return tabGroups;
  }

  static collectTabStyles(sections) {
    const collectedClasses = new Set();

    sections.forEach((section) => {
      if (section.classList.contains(TABS_STYLE)) {
        collectedClasses.add(TABS_STYLE);
        section.classList.remove(TABS_STYLE);
      }

      [...COLLAPSIBLE_CLASSES, ...ADDITIONAL_CLASSES].forEach((className) => {
        if (section.classList.contains(className)) {
          collectedClasses.add(className);
          section.classList.remove(className);
        }
      });
    });

    return collectedClasses;
  }

  static processTabData(sections) {
    const tabIdMap = new Map();
    const uniqueTabIds = new Set();

    sections.forEach((section) => {
      if (section.dataset.tabId) {
        const normalizedId = section.dataset.tabId.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '-');
        uniqueTabIds.add(normalizedId);
        tabIdMap.set(section, normalizedId);
      }
    });

    if (uniqueTabIds.size === 0) {
      uniqueTabIds.add('default-tab');
      sections.forEach((section) => tabIdMap.set(section, 'default-tab'));
    }

    sections.forEach((section) => {
      if (!tabIdMap.has(section)) {
        const firstId = uniqueTabIds.values().next().value;
        tabIdMap.set(section, firstId);
      }
      section.dataset.normalizedTabId = tabIdMap.get(section);
    });

    const tabGroups = new Map();
    sections.forEach((section) => {
      const id = section.dataset.normalizedTabId;
      if (!tabGroups.has(id)) {
        tabGroups.set(id, { title: section.dataset.tabTitle || id, sections: [] });
      } else if (section.dataset.tabTitle && !tabGroups.get(id).title) {
        tabGroups.get(id).title = section.dataset.tabTitle;
      }
      tabGroups.get(id).sections.push(section);
    });

    return Array.from(tabGroups).map(([id, data]) => ({ id, ...data }));
  }

  static getTabConfig(collectedStyles) {
    return {
      useAccordion: collectedStyles.has('collapsible-sm') || collectedStyles.has('collapsible-md'),
      collapseAll: collectedStyles.has('collapse-all'),
      isFullWidth: collectedStyles.has('full-width'),
    };
  }

  static createTabElement(tabData, options) {
    const { id, title, sections } = tabData;
    const {
      prefix,
      isSelected,
      isFullWidth,
      useClones = true,
    } = options;

    const button = createElement('button', {
      class: 'tabs-tab',
      id: `${prefix}-${id}`,
      role: 'tab',
      'aria-controls': `${prefix}-panel-${id}`,
      'aria-selected': isSelected,
      type: 'button',
    });
    button.textContent = title;

    const panel = createElement('div', {
      class: 'tab',
      id: `${prefix}-panel-${id}`,
      role: 'tabpanel',
      'aria-labelledby': `${prefix}-${id}`,
      'aria-hidden': !isSelected,
    });

    sections.forEach((section) => {
      const sectionEl = useClones ? section.cloneNode(true) : section;
      if (useClones) sectionEl.style.removeProperty('display');
      if (isFullWidth) sectionEl.classList.add('container');
      panel.appendChild(sectionEl);
    });

    return { button, panel };
  }

  createTabsUI(tabData, config) {
    const { collapseAll, isFullWidth } = config;
    const hashMatchesTab = tabData.some((tab) => tab.id === this.currentHash);

    const desktopTabsList = createElement('div', {
      class: 'tabs-list desktop-tabs',
      role: 'tablist',
      'aria-orientation': 'horizontal',
    });
    const desktopContent = createElement('div', { class: 'tabs-content desktop-content' });
    const desktopButtons = {};
    const desktopPanels = {};

    let mobileAccordion;
    let mobileButtons;
    let mobilePanels;
    if (config.useAccordion) {
      mobileAccordion = createElement('div', {
        class: 'tabs-list mobile-accordion',
      });
      mobileButtons = {};
      mobilePanels = {};
    }

    tabData.forEach((tab, index) => {
      const isSelected = (hashMatchesTab && tab.id === this.currentHash)
        || (!hashMatchesTab && index === 0 && !collapseAll);

      const desktop = TabsManager.createTabElement(tab, {
        prefix: 'desktop',
        isSelected,
        isFullWidth,
      });

      desktopTabsList.appendChild(desktop.button);
      desktopButtons[tab.id] = desktop.button;
      desktopContent.appendChild(desktop.panel);
      desktopPanels[tab.id] = desktop.panel;

      if (config.useAccordion) {
        const mobileButton = createElement('button', {
          class: 'tabs-tab',
          id: `mobile-tab-${tab.id}`,
          'aria-expanded': isSelected ? 'true' : 'false',
          'aria-controls': `mobile-panel-${tab.id}`,
          type: 'button',
        });
        mobileButton.textContent = tab.title;

        const mobilePanel = createElement('div', {
          class: 'tab',
          id: `mobile-panel-${tab.id}`,
          hidden: !isSelected,
        });

        tab.sections.forEach((section) => {
          const sectionEl = section.cloneNode(true);
          sectionEl.style.removeProperty('display');
          if (isFullWidth) sectionEl.classList.add('container');
          mobilePanel.appendChild(sectionEl);
        });

        mobileAccordion.appendChild(mobileButton);
        mobileAccordion.appendChild(mobilePanel);
        mobileButtons[tab.id] = mobileButton;
        mobilePanels[tab.id] = mobilePanel;
      }
    });

    return {
      desktopTabsList,
      desktopContent,
      desktopButtons,
      desktopPanels,
      hashMatchesTab,
      mobileAccordion,
      mobileButtons,
      mobilePanels,
    };
  }

  setupEventListeners(elements) {
    const {
      desktopTabsList,
      desktopContent,
      desktopButtons,
      desktopPanels,
      mobileButtons,
      mobilePanels,
    } = elements;

    Object.entries(desktopButtons).forEach(([id, button]) => {
      button.addEventListener('click', () => {
        desktopTabsList.querySelectorAll('button').forEach((btn) => {
          btn.setAttribute('aria-selected', btn === button);
        });

        desktopContent.querySelectorAll('.tab[role="tabpanel"]').forEach((panel) => {
          panel.setAttribute('aria-hidden', panel !== desktopPanels[id]);
        });

        window.history.pushState({}, '', `${new URL(window.location).pathname}#${id}`);

        if (mobileButtons && mobileButtons[id]) {
          Object.values(mobileButtons).forEach((btn) => {
            btn.setAttribute('aria-expanded', 'false');
          });
          Object.values(mobilePanels).forEach((panel) => {
            panel.hidden = true;
          });

          mobileButtons[id].setAttribute('aria-expanded', 'true');
          mobilePanels[id].hidden = false;
        }
      });
    });

    if (mobileButtons) {
      Object.entries(mobileButtons).forEach(([id, button]) => {
        button.addEventListener('click', () => {
          const isExpanded = button.getAttribute('aria-expanded') === 'true';

          Object.values(mobileButtons).forEach((btn) => {
            btn.setAttribute('aria-expanded', 'false');
          });
          Object.values(mobilePanels).forEach((panel) => {
            panel.hidden = true;
          });

          if (!isExpanded) {
            button.setAttribute('aria-expanded', 'true');
            mobilePanels[id].hidden = false;

            desktopTabsList.querySelectorAll('button').forEach((btn) => {
              btn.setAttribute('aria-selected', btn === desktopButtons[id]);
            });

            desktopContent.querySelectorAll('.tab[role="tabpanel"]').forEach((panel) => {
              panel.setAttribute('aria-hidden', panel !== desktopPanels[id]);
            });

            window.history.pushState({}, '', `${new URL(window.location).pathname}#${id}`);
          }
        });
      });
    }

    if (this.currentHash && desktopButtons[this.currentHash]) {
      desktopButtons[this.currentHash].click();
    } else if (Object.keys(desktopButtons).length > 0) {
      const firstId = Object.keys(desktopButtons)[0];
      desktopButtons[firstId].click();
    }
  }

  processTabGroup(tabSections) {
    if (!tabSections.length) return;

    const collectedStyles = TabsManager.collectTabStyles(tabSections);
    const config = TabsManager.getTabConfig(collectedStyles);
    const tabsContainer = createElement('div', {
      class: `section ${TABS_STYLE}`,
    });

    collectedStyles.forEach((className) => tabsContainer.classList.add(className));

    const firstSection = tabSections[0];
    firstSection.parentNode.insertBefore(tabsContainer, firstSection);

    const tabData = TabsManager.processTabData(tabSections);
    const elements = this.createTabsUI(tabData, config);

    const tabsWrapper = createElement('div', { class: 'tabs-wrapper' });
    tabsWrapper.append(elements.desktopTabsList, elements.desktopContent);

    if (config.useAccordion && elements.mobileAccordion) {
      tabsWrapper.appendChild(elements.mobileAccordion);
    }

    tabsContainer.appendChild(tabsWrapper);

    this.setupEventListeners(elements);

    tabSections.forEach((section) => {
      if (section.parentNode) section.parentNode.removeChild(section);
    });
  }
}

export default async function createTabs(main) {
  return new TabsManager(main).initialize();
}
