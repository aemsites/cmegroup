/* eslint-disable no-console */
/* eslint-disable import/no-absolute-path */
/* eslint-disable import/no-unresolved */

// Import SDK for Document Authoring
import DA_SDK from 'https://da.live/nx/utils/sdk.js';
import { crawl } from 'https://da.live/nx/public/utils/tree.js';

// Base path for fragments
const FRAGMENTS_BASE = '/fragments';

// Add constants at the top
const CONSTANTS = {
  AUTO_HIDE_DELAY: 1000,
  CRAWL_THROTTLE: 10,
  ICONS: {
    FOLDER: '/.da/icons/folder-icon.png',
    FOLDER_OPEN: '/.da/icons/folder-open-icon.png',
    FRAGMENT: '/.da/icons/fragment-icon.png',
  },
};

/**
 * Creates a tree structure from file paths
 * @param {Array} files - Array of file objects with paths
 * @param {string} basePath - Base path to remove from display
 * @returns {Object} Tree structure
 */
function createFileTree(files, basePath) {
  const tree = {};
  files.forEach((file) => {
    // Remove the org/repo prefix from display path
    const displayPath = file.path.replace(basePath, '');
    const parts = displayPath.split('/').filter(Boolean);
    let current = tree;
    parts.forEach((part, i) => {
      if (!current[part]) {
        current[part] = {
          isFile: i === parts.length - 1 && file.path.endsWith('.html'),
          children: {},
          path: file.path, // Keep original path for link creation
        };
      }
      current = current[part].children;
    });
  });
  return tree;
}

/**
 * Hides the message container and updates indicator
 */
function hideMessageContainer() {
  const infoWrapper = document.querySelector('.info-list-wrapper');
  const indicator = document.querySelector('.message-indicator');
  if (!infoWrapper.classList.contains('hidden')) {
    infoWrapper.classList.add('hidden');
    indicator.classList.remove('active');
  }
}

/**
 * Creates a tree item element
 * @param {string} name - Item name
 * @param {Object} node - Tree node data
 * @param {Function} onClick - Click handler for fragment items
 * @returns {HTMLElement} Tree item element
 */
function createTreeItem(name, node, onClick) {
  const item = document.createElement('li');
  item.className = 'tree-item';

  const content = document.createElement('div');
  content.className = 'tree-item-content';

  if (node.isFile) {
    const button = document.createElement('button');
    button.className = 'fragment-btn-item';
    button.setAttribute('role', 'button');
    button.setAttribute('aria-label', `Insert link for fragment "${name.replace('.html', '')}"`);

    const fragmentIcon = document.createElement('img');
    fragmentIcon.src = '/.da/icons/fragment-icon.png';
    fragmentIcon.alt = 'Fragment';
    fragmentIcon.className = 'tree-icon';
    fragmentIcon.setAttribute('aria-hidden', 'true');

    const textSpan = document.createElement('span');
    const displayName = name.replace('.html', '');
    textSpan.textContent = displayName;

    button.appendChild(fragmentIcon);
    button.appendChild(textSpan);
    button.title = `Click to insert link for "${displayName}"`;
    button.addEventListener('click', () => onClick({ path: node.path }));
    content.appendChild(button);
  } else {
    const folderButton = document.createElement('button');
    folderButton.className = 'folder-btn';
    folderButton.setAttribute('role', 'button');
    folderButton.setAttribute('aria-expanded', 'false');
    folderButton.setAttribute('aria-label', `Folder ${name}`);

    const folderIcon = document.createElement('img');
    folderIcon.src = '/.da/icons/folder-icon.png';
    folderIcon.alt = ''; // Decorative image, using aria-hidden instead
    folderIcon.className = 'tree-icon folder-icon';
    folderIcon.setAttribute('aria-hidden', 'true');

    const label = document.createElement('span');
    label.className = 'folder-name';
    label.textContent = name;

    folderButton.appendChild(folderIcon);
    folderButton.appendChild(label);

    const toggleFolder = () => {
      hideMessageContainer();
      folderButton.classList.toggle('expanded');
      folderButton.setAttribute('aria-expanded', folderButton.classList.contains('expanded'));
      folderIcon.src = folderButton.classList.contains('expanded')
        ? '/.da/icons/folder-open-icon.png'
        : '/.da/icons/folder-icon.png';
      const list = item.querySelector('.tree-list');
      if (list) {
        list.classList.toggle('hidden');
      }
    };

    folderButton.addEventListener('click', toggleFolder);
    content.appendChild(folderButton);

    if (Object.keys(node.children).length > 0) {
      const list = document.createElement('ul');
      list.className = 'tree-list hidden';

      Object.entries(node.children)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([childName, childNode]) => {
          list.appendChild(createTreeItem(childName, childNode, onClick));
        });

      item.appendChild(content);
      item.appendChild(list);
    }
  }

  if (!content.parentElement) {
    item.appendChild(content);
  }

  return item;
}

/**
 * Handles fragment selection by inserting a link
 * @param {Object} actions - SDK actions object
 * @param {Object} file - Selected fragment file
 * @param {Object} context - SDK context
 */
function handleFragmentSelect(actions, file, context) {
  if (!actions?.sendHTML) {
    console.error('Cannot insert fragment: Editor not available');
    return;
  }

  try {
    const basePath = `/${context.org}/${context.repo}`;
    const displayPath = file.path.replace(basePath, '').replace(/\.html$/, '');
    const fragmentUrl = `https://main--${context.repo}--${context.org}.aem.page${displayPath}`;
    actions.sendHTML(`<a href="${fragmentUrl}" class="fragment">${fragmentUrl}</a>`);
    actions.closeLibrary();
  } catch (error) {
    console.error('Failed to insert fragment:', error);
  }
}

/**
 * Filters tree items based on search text
 * @param {string} searchText - Text to search for
 * @param {HTMLElement} fragmentsList - List container element
 */
function filterFragments(searchText, fragmentsList) {
  const items = fragmentsList.querySelectorAll('.tree-item');
  const searchLower = searchText.toLowerCase();

  // Hide message container when searching
  const msgContainer = document.querySelector('.message-wrapper');
  const indicator = document.querySelector('.message-indicator');
  if (!msgContainer.classList.contains('hidden')) {
    msgContainer.classList.add('hidden');
    indicator.classList.remove('active');
  }

  // First pass: Find matching items and their parent folders
  const matchingPaths = new Set();
  items.forEach((item) => {
    const button = item.querySelector('.fragment-btn-item');
    if (button && button.textContent.toLowerCase().includes(searchLower)) {
      // Add current item and all its parent folders to matching paths
      let current = item;
      while (current && current.classList.contains('tree-item')) {
        matchingPaths.add(current);
        current = current.parentElement.closest('.tree-item');
      }
    }
  });

  // Second pass: Show/hide items and expand folders
  items.forEach((item) => {
    const isMatching = matchingPaths.has(item);
    item.style.display = isMatching ? '' : 'none';

    // If it's a folder and it's in the matching paths, expand it
    const folderBtn = item.querySelector('.folder-btn');
    const list = item.querySelector('.tree-list');
    if (folderBtn && list && isMatching) {
      folderBtn.classList.add('expanded');
      folderBtn.setAttribute('aria-expanded', 'true');
      const folderIcon = folderBtn.querySelector('.folder-icon');
      if (folderIcon) {
        folderIcon.src = '/.da/icons/folder-open-icon.png';
      }
      list.classList.remove('hidden');
    }
  });

  // If search is cleared, collapse all folders
  if (!searchText) {
    items.forEach((item) => {
      const folderBtn = item.querySelector('.folder-btn');
      const list = item.querySelector('.tree-list');
      if (folderBtn && list) {
        folderBtn.classList.remove('expanded');
        folderBtn.setAttribute('aria-expanded', 'false');
        const folderIcon = folderBtn.querySelector('.folder-icon');
        if (folderIcon) {
          folderIcon.src = '/.da/icons/folder-icon.png';
        }
        list.classList.add('hidden');
      }
      item.style.display = '';
    });
  }
}

// Function to get the depth of FRAGMENTS_BASE
function getBasePathDepth() {
  return FRAGMENTS_BASE.split('/').filter(Boolean).length; // filter(Boolean) removes empty strings
}

// Function to expand folder to specific depth
function expandToDepth(item, currentDepth, targetDepth) {
  const folderBtn = item.querySelector('.folder-btn');
  const list = item.querySelector('.tree-list');

  if (folderBtn && list && currentDepth <= targetDepth) {
    // Expand this folder
    folderBtn.classList.add('expanded');
    folderBtn.setAttribute('aria-expanded', 'true');
    const folderIcon = folderBtn.querySelector('.folder-icon');
    if (folderIcon) {
      folderIcon.src = '/.da/icons/folder-open-icon.png';
    }
    list.classList.remove('hidden');

    // Recursively expand child folders
    const childFolders = list.querySelectorAll(':scope > .tree-item');
    childFolders.forEach((childItem) => {
      expandToDepth(childItem, currentDepth + 1, targetDepth);
    });
  }
}

/**
 * Initializes the fragments interface and sets up event handlers
 */
(async function init() {
  const { actions } = await DA_SDK;

  const form = document.querySelector('.fragments-form');
  const fragmentsList = document.querySelector('.fragments-list');
  const searchInput = document.querySelector('.fragment-search');
  const refreshBtn = document.querySelector('.fragment-btn[type="button"]');

  // Prevent default form submission
  form.addEventListener('submit', (e) => e.preventDefault());

  // Add search handler
  searchInput.addEventListener('input', (e) => {
    filterFragments(e.target.value, fragmentsList);
  });

  // Function to load fragments
  async function loadFragments() {
    const fragmentsContainer = document.querySelector('.fragments-list');
    const cancelBtn = document.querySelector('.fragment-btn[type="reset"]');

    if (!fragmentsContainer.querySelector('.loading-state')) {
      fragmentsContainer.innerHTML = '<div class="loading-state">Loading fragments...</div>';
    }

    cancelBtn.disabled = false;

    try {
      const files = [];
      const { context, token } = await DA_SDK;
      const path = `/${context.org}/${context.repo}${FRAGMENTS_BASE}`;
      const basePath = `/${context.org}/${context.repo}`;

      const { results, cancelCrawl } = crawl({
        path,
        callback: (file) => file.path.endsWith('.html') && files.push(file),
        throttle: CONSTANTS.CRAWL_THROTTLE,
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });

      cancelBtn.addEventListener('click', cancelCrawl, { once: true });
      await results;

      // Disable cancel button after crawl completes
      cancelBtn.disabled = true;

      // Clear loading message
      fragmentsContainer.innerHTML = '';

      const tree = createFileTree(files, basePath);
      const targetDepth = getBasePathDepth();

      Object.entries(tree)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([name, node]) => {
          const item = createTreeItem(
            name,
            node,
            (file) => handleFragmentSelect(actions, file, context),
          );
          fragmentsContainer.appendChild(item);

          // Expand folders to the target depth
          expandToDepth(item, 1, targetDepth);
        });
    } catch (error) {
      console.error('Failed to load fragments:', error);
      // Also disable cancel button on error
      cancelBtn.disabled = true;
    }
  }

  // Load fragments initially
  await loadFragments();

  // Add refresh handler
  refreshBtn.addEventListener('click', loadFragments);
}());
