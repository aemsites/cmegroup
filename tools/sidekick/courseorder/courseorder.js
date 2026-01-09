/**
 * Course Order Plugin for AEM Sidekick
 * Allows users to organize courses by dragging and dropping
 */

/* eslint-disable */
import DA_SDK from 'https://da.live/nx/utils/sdk.js';
import { DA_ORIGIN } from 'https://da.live/nx/public/utils/constants.js';

class CourseOrganiser {
  constructor(context, token, daFetch) {
    this.context = context;
    this.token = token;
    this.daFetch = daFetch;
    this.currentPath = context.path;
    this.folderPath = context.path.split('/').slice(0, -1).join('/');
    this.courseItems = [];
    this.metadataOrder = null; // Store the order from metadata
  }

  /**
   * Gets course icon based on file type
   * @param {Object} item - Course item
   * @returns {string} - Icon emoji to display
   */
  getItemIcon(item) {
    if (item.type === 'folder') {
      return '📁';
    }
    return '📄';
  }

  /**
   * Fetches courses from the current path
   * @returns {Promise<Array>} - Courses in the current path
   */
  async fetchCourses() {
    try {
      // Prepare the path
      const basePath = `/${this.context.org}/${this.context.repo}`;
      const fullPath = `${basePath}${this.currentPath}`;
      
      console.log('Fetching courses from:', fullPath);

      const { files, folders } = await this.getChildren(fullPath);
      
      // Format files and folders for display
      const filesArray = files
        .map((file) => ({
          ...file,
          type: 'file',
        }))
        .filter((file) => file.name !== 'index');
      
      const foldersArray = folders.map((folder) => ({
        name: folder.split('/').pop(),
        type: 'folder',
        path: folder,
      }));

      console.log('Course files:', filesArray.length, 'Folders:', foldersArray.length);
      
      return [...filesArray, ...foldersArray];
    } catch (error) {
      console.error('Error fetching courses:', error);
      return [];
    }
  }

  /**
   * Gets direct children (files and folders) for a path
   * @param {string} path - Path to get children for
   * @returns {Promise<Object>} - Files and folders at the path
   */
  async getChildren(path) {
    const files = [];
    const folders = [];
  
    try {
      const resp = await this.daFetch(`${DA_ORIGIN}/list${path}`);
      if (resp.ok) {
        const json = await resp.json();
        json.forEach((child) => {
          if (child.ext) {
            files.push(child);
          } else {
            folders.push(child.path);
          }
        });
      }
    } catch (error) {
      console.error('Error getting children:', error);
    }
    
    return { files, folders };
  }

  /**
   * Gets selected items based on selection state
   * @returns {Array} - Array of selected items
   */
  getSelectedItems() {
    return this.courseItems.filter(item => item.selected);
  }

  /**
   * Creates a comma-separated list of course names
   * @returns {string} - Comma-separated list of names
   */
  createFormattedList(format = "commaSeparated") {
    // Filter to only selected items if there are any
    const selectedItems = this.getSelectedItems();
    const itemsToFormat = selectedItems.length > 0 ? selectedItems : this.courseItems;
    
    if (!itemsToFormat || itemsToFormat.length === 0) {
      return '';
    }
    
    if (format === "commaSeparated") {
      // Return comma-separated list with spaces after commas
      return itemsToFormat.map(item => item.name).join(', ');
    } else if (format === "orderedListFormat") {
      return `<ol>${itemsToFormat.map((item) => `<li>${item.name}</li>`).join('')}</ol>`;
    }
  }

  /**
   * Fetches the page to extract metadata
   * @returns {Promise<Object>} Object containing order array and template type
   */
  async fetchPageMetadata() {
    try {
      // Construct the page URL
      const pageUrl = `https://main--${this.context.repo}--${this.context.org}.aem.page${this.currentPath}`;
      console.log('Fetching order metadata from:', pageUrl);
      // Fetch the page
      const response = await fetch(pageUrl);
      
      if (!response.ok) {
        console.log('Page not found, using default order');
        return {};
      }
      
      // Get the HTML content
      const html = await response.text();
      
      // Create a DOM parser to extract metadata
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Get the template type metadata
      const templateType = this.getMetadata('template', doc);
      
      // Use the getMetadata function to extract modulesOrder
      const orderMetadata = this.getMetadata('modules-order', doc);
      
      if (!orderMetadata) {
        console.log('No Modules Order metadata found, using default order');
        return { templateType };
      }
      
      // Parse the comma-separated list
      const orderArray = orderMetadata.split(',').map(item => item.trim());
      
      return { orderArray, templateType };
    } catch (error) {
      console.error('Error fetching page metadata:', error);
      return {};
    }
  }
  
  /**
   * Gets metadata from a document
   * @param {string} name - Metadata name
   * @param {Document} doc - Document to search in
   * @returns {string} Metadata value
   */
  getMetadata(name, doc = document) {
    const attr = name && name.includes(':') ? 'property' : 'name';
    const meta = [...doc.head.querySelectorAll(`meta[${attr}="${name}"]`)]
      .map((m) => m.content)
      .join(', ');
    return meta || '';
  }
  
  /**
   * Applies the metadata order to the course items
   * @param {Array} items - Array of course items
   * @param {Array} orderArray - Array of course names in desired order
   * @returns {Array} Ordered array of items
   */
  applyMetadataOrder(items, orderArray) {
    if (!orderArray || orderArray.length === 0) {
      return items; // Return original array if no order specified
    }
    
    // Create a map for quick lookup
    const itemMap = new Map();
    items.forEach(item => {
      itemMap.set(item.name, item);
    });
    
    // Create the ordered array based on metadata
    const orderedItems = [];
    
    // First add items in the specified order
    orderArray.forEach(name => {
      if (itemMap.has(name)) {
        orderedItems.push(itemMap.get(name));
        itemMap.delete(name); // Remove from map to avoid duplicates
      }
    });
    
    // Then add any remaining items not in the metadata
    itemMap.forEach(item => {
      orderedItems.push(item);
    });
    
    return orderedItems;
  }
}

/**
 * Initializes the course order interface and sets up event handlers
 */
(async function init() {
  try {
    // Import DA SDK components
    const { context, token, actions } = await DA_SDK;
    const { daFetch } = actions;
    
    // Initialize UI elements
    initializeUI();
    
    // Get UI elements
    const elements = {
      container: document.querySelector('.course-container'),
      courseList: document.getElementById('course-list'),
      searchInput: document.getElementById('search-input'),
      refreshBtn: document.getElementById('refresh-button'),
      cancelBtn: document.getElementById('cancel-button'),
      applyBtn: document.getElementById('apply-button'),
      pathDisplay: document.getElementById('current-path')
    };
    
    // Create course organiser instance with SDK context
    const courseOrganiser = new CourseOrganiser(context, token, daFetch);
    
    // Show initial loading state
    showLoading(elements.courseList);
    
    // Set up event listeners
    setupEventListeners(elements, courseOrganiser, actions);
    
    // Load courses initially
    await loadCourses(elements, courseOrganiser);
    
  } catch (error) {
    handleInitError(error);
  }
}());

/**
 * Sets basic UI properties
 */
function initializeUI() {
  document.querySelector('.course-title').textContent = 'Course Order';
  document.title = 'Course Order';
}

/**
 * Shows loading state in the course list
 * @param {HTMLElement} courseList - Course list element
 */
function showLoading(courseList) {
  if (courseList) {
    courseList.innerHTML = '<div class="course-loading">Loading courses...</div>';
  }
}

/**
 * Sets up all event listeners
 * @param {Object} elements - UI elements
 * @param {CourseOrganiser} courseOrganiser - CourseOrganiser instance
 * @param {Object} actions - SDK actions
 */
function setupEventListeners(elements, courseOrganiser, actions) {
  const { searchInput, refreshBtn, applyBtn, cancelBtn } = elements;
  
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      filterCourses(e.target.value, elements.courseList);
    });
  }
  
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadCourses(elements, courseOrganiser);
    });
  }
  
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      applyOrderToDocument(courseOrganiser, actions);
    });
  }
}

/**
 * Filters courses based on search input
 * @param {string} searchTerm - Term to search for
 * @param {HTMLElement} courseList - Course list element
 */
function filterCourses(searchTerm, courseList) {
  const items = courseList.querySelectorAll('.course-item');
  searchTerm = searchTerm.toLowerCase();
  
  items.forEach(item => {
    // Skip parent folder from search
    if (item.classList.contains('parent')) return;
    
    const name = item.querySelector('.course-item-name').textContent.toLowerCase();
    item.style.display = name.includes(searchTerm) || searchTerm === '' ? '' : 'none';
  });
}

/**
 * Loads courses from current path
 * @param {Object} elements - UI elements
 * @param {CourseOrganiser} courseOrganiser - CourseOrganiser instance
 */
async function loadCourses(elements, courseOrganiser) {
  const { courseList, searchInput, pathDisplay } = elements;
  
  if (searchInput) {
    searchInput.value = '';
  }
  
  try {
    // Update path display with folder path
    if (pathDisplay) {
      const displayPath = courseOrganiser.currentPath || 'Root';
      pathDisplay.textContent = displayPath;
    }
    
    // First fetch metadata order if available
    const metadataResult = await courseOrganiser.fetchPageMetadata();
    const { orderArray, templateType } = metadataResult;
    
    courseOrganiser.metadataOrder = orderArray; // Store for future reference
    
    // Check if the template is course or chapter
    const validTemplates = ['course', 'chapter'];
    const isValidTemplate = validTemplates.some(valid => 
      templateType?.toLowerCase().includes(valid)
    );

    console.log('Template type:', templateType);
    console.log('Is valid template?', isValidTemplate);
    
    if (!isValidTemplate) {
      if (courseList) {
        courseList.innerHTML = '<div class="course-error">Plugin available for course and chapter templates only</div>';
      }
      return; // Exit early
    }
    
    // Fetch and display courses
    const children = await courseOrganiser.fetchCourses();
    
    // Check if we have any children
    if (children.length === 0) {
      if (courseList) {
        courseList.innerHTML = '<div class="course-empty">No courses found</div>';
      }
      return; // Exit early
    }
    
    // Apply metadata order if available
    if (orderArray && orderArray.length > 0) {
      console.log('Applying metadata order to courses: ', orderArray);
      courseOrganiser.courseItems = courseOrganiser.applyMetadataOrder(children, orderArray);
    } else {
      courseOrganiser.courseItems = children;
    }
    
    // Render the course list
    renderCourseList(courseList, courseOrganiser);
    
    // Set up drag and drop
    setupDragAndDrop(courseList, courseOrganiser);
  } catch (error) {
    console.error('Error loading courses:', error);
    if (courseList) {
      courseList.innerHTML = `<div class="course-error">Error loading courses: ${error.message}</div>`;
    }
  }
}

/**
 * Renders the course list
 * @param {HTMLElement} courseList - Course list element
 * @param {CourseOrganiser} courseOrganiser - CourseOrganiser instance
 */
function renderCourseList(courseList, courseOrganiser) {
  if (!courseList) return;
  
  courseList.innerHTML = '';
  
  // Add parent directory option if not at root
  if (courseOrganiser.currentPath && courseOrganiser.currentPath !== '/') {
    const parentEl = createParentFolderElement();
    courseList.appendChild(parentEl);
  }
  
  courseOrganiser.courseItems.forEach((item, index) => {
    const itemEl = createCourseElement(item, index, courseOrganiser);
    courseList.appendChild(itemEl);
  });
}

/**
 * Creates parent folder element
 * @returns {HTMLElement} - Parent folder element
 */
function createParentFolderElement() {
  const parentEl = document.createElement('div');
  parentEl.className = 'course-item folder parent';
  parentEl.draggable = false;
  parentEl.innerHTML = `
    <span class="course-item-icon">📂</span>
    <span class="course-item-name">..</span>
  `;
  return parentEl;
}

/**
 * Creates a course element
 * @param {Object} item - Course data
 * @param {number} index - Item index
 * @param {CourseOrganiser} courseOrganiser - CourseOrganiser instance
 * @returns {HTMLElement} - Course element
 */
function createCourseElement(item, index, courseOrganiser) {
  const itemEl = document.createElement('div');
  itemEl.className = `course-item ${item.type}`;
  itemEl.setAttribute('data-index', index);
  
  // Create the UI structure with more explicit handles
  const icon = courseOrganiser.getItemIcon(item);
  itemEl.innerHTML = `
    <span class="course-drag-handle" title="Drag to reorder">≡</span>
    <span class="course-item-icon">${icon}</span>
    <span class="course-item-name">${item.name}</span>
  `;
  
  // Add click event for selection (excluding the drag handle)
  itemEl.addEventListener('click', function(e) {
    // Don't trigger when clicking on drag handle
    if (e.target.classList.contains('course-drag-handle')) {
      e.stopPropagation();
      return;
    }
    
    // Toggle selection
    if (this.classList.contains('selected')) {
      this.classList.remove('selected');
      item.selected = false;
    } else {
      this.classList.add('selected');
      item.selected = true;
    }
  });
  
  return itemEl;
}

/**
 * Sets up drag and drop functionality using jQuery UI Sortable
 * @param {HTMLElement} courseList - Course list element
 * @param {CourseOrganiser} courseOrganiser - CourseOrganiser instance
 */
function setupDragAndDrop(courseList, courseOrganiser) {
  if (!courseList) return;
  
  // Destroy any existing sortable to prevent duplicates
  try {
    if ($(courseList).hasClass('ui-sortable')) {
      $(courseList).sortable('destroy');
    }
  } catch (e) {
    console.log('No existing sortable to destroy');
  }
  
  // Initialize jQuery UI Sortable
  $(courseList).sortable({
    items: ".course-item:not(.parent)", // Don't allow sorting the parent folder
    handle: ".course-drag-handle",      // Use the drag handle for dragging
    placeholder: "course-item-placeholder", // CSS class for the placeholder
    cursor: "grabbing",                 // Cursor style while dragging
    opacity: 0.8,                       // Opacity of dragged item
    tolerance: "pointer",               // Use pointer position for tolerance
    delay: 150,                         // Small delay to prevent accidental drags
    
    start: function(event, ui) {
      // Store original index
      const index = $(ui.item).attr('data-index');
      $(ui.item).data('start-index', index);
      console.log('Started dragging item with index:', index);
    },
    
    // Update event fires when sorting has stopped and DOM position has changed
    update: function(event, ui) {
      // Get the new index (position in the DOM)
      const newIndex = ui.item.index() - (courseOrganiser.currentPath && courseOrganiser.currentPath !== '/' ? 1 : 0);
      
      // Get original index from data attribute
      const oldIndex = parseInt($(ui.item).data('start-index'));
      
      console.log('Reordering course from index', oldIndex, 'to', newIndex);
      
      // Get the actual item from the array
      const item = courseOrganiser.courseItems[oldIndex];
      
      // Make sure we have valid indices
      if (isNaN(oldIndex) || !item) {
        console.error('Invalid index or item not found', oldIndex);
        renderCourseList(courseList, courseOrganiser); // Re-render to fix the state
        return;
      }
      
      // Remove the item from its old position
      courseOrganiser.courseItems.splice(oldIndex, 1);
      
      // Insert it at the new position
      courseOrganiser.courseItems.splice(newIndex, 0, item);
      
      // Update data-index attributes for all items
      renderCourseList(courseList, courseOrganiser);
      
      // Re-initialize sortable after re-rendering
      setupDragAndDrop(courseList, courseOrganiser);
      
      console.log('Reordered course items');
    }
  });
  
  // Make sure handles have proper cursor
  $('.course-drag-handle').css('cursor', 'grab');
}

/**
 * Applies the current order to the document at cursor position
 * @param {CourseOrganiser} courseOrganiser - CourseOrganiser instance
 * @param {Object} actions - SDK actions
 */
function applyOrderToDocument(courseOrganiser, actions) {
  const orderedList = courseOrganiser.createFormattedList("orderedListFormat");
  console.log('Ordered list:', orderedList);
  
  if (!orderedList) {
    console.error('No courses to apply');
    return;
  }
  
  try {
    if (actions && actions.sendHTML) {
      actions.sendHTML(orderedList);
      actions.closeLibrary();
      
      // Show success message
      const successMsg = document.getElementById('success-message');
      if (successMsg) {
        successMsg.classList.add('show');
        
        // Hide success message after 2 seconds
        setTimeout(() => {
          successMsg.classList.remove('show');
        }, 2000);
      }
      
      console.log('Applied course order to document:', orderedList);
    } else {
      console.error('Cannot apply order: actions.sendHtml not available');
      alert('Cannot apply order: Document editor not available');
    }
  } catch (err) {
    console.error('Could not apply course order to document:', err);
    alert('Failed to apply course order to document: ' + err);
  }
}

/**
 * Handles initialization error
 * @param {Error} error - Error object
 */
function handleInitError(error) {
  console.error('Error initializing Course Order:', error);
  const container = document.querySelector('.course-container');
  if (container) {
    container.innerHTML = `
      <div class="course-error">
        <h2>Error initializing Course Order</h2>
        <p>${error.message}</p>
        <p>Please try refreshing the page.</p>
      </div>
    `;
  }
}