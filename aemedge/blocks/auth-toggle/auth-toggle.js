/**
 * Authentication State Toggle Block
 * Provides a draggable toggle interface to switch between authenticated and anonymous states
 * Only active in author/development environments
 */

import { createElement } from '../../scripts/utils.js';
import { loadCSS } from '../../scripts/aem.js';

// CSS class constants
const CSS_CLASSES = {
  TOGGLE: 'auth-toggle',
  HANDLE: 'auth-handle',
  HANDLE_ICON: 'auth-handle-icon',
  HEADER: 'auth-header',
  CLOSE: 'auth-close',
  STATE: 'auth-state',
  OPTIONS: 'auth-options',
  OPTION_BUTTON: 'auth-option-button',
  EXPANDED: 'expanded',
  HIDDEN: 'hidden',
  DRAGGING: 'dragging',
  VISIBLE: 'visible',
  BOUNCE: 'bounce',
  ACTIVE: 'active',
  CURRENT_STATE: 'current-state',
  AUTHENTICATED: 'authenticated',
  ANONYMOUS: 'anonymous'
};

/**
 * Get the authentication state from query parameters
 * @returns {boolean} True = authenticated, false/null = anonymous (default)
 */
function getAuthState() {
  const urlParams = new URLSearchParams(window.location.search);
  const authValue = urlParams.get('auth');

  // Default to anonymous if no auth parameter
  if (!authValue || authValue === 'false') {
    return false;
  }

  return authValue === 'true';
}

/**
 * Decorate the auth toggle block
 * @param {Element} block The auth toggle block element
 */
export default function decorate(block) {
  const currentState = getAuthState();
  let isExpanded = false;

  // Clear any existing content
  block.innerHTML = '';

  // Set up the toggle structure
  block.id = CSS_CLASSES.TOGGLE;
  block.classList.add(CSS_CLASSES.TOGGLE);

  const handleIcon = createElement('div', {
    class: CSS_CLASSES.HANDLE_ICON,
  }, 'AUTH STATE');

  const handle = createElement('div', {
    class: CSS_CLASSES.HANDLE,
    title: 'Click to expand or drag to move',
  }, handleIcon);

  const headerText = createElement('span', {}, 'Auth State');
  const closeBtn = createElement('button', {
    class: CSS_CLASSES.CLOSE,
    'aria-label': 'Close auth panel',
  }, '×');

  const header = createElement('div', {
    class: CSS_CLASSES.HEADER,
  }, headerText, closeBtn);

  // Handle two states: true (authenticated), false (anonymous)

  // Create current state indicator and opposite state button
  const optionsContainer = createElement('div', {
    class: CSS_CLASSES.OPTIONS,
  });

  // Current state indicator (non-clickable, green)
  const currentStateIndicator = createElement('div', {
    class: `${CSS_CLASSES.OPTION_BUTTON} ${CSS_CLASSES.CURRENT_STATE}`,
  }, currentState ? 'Authenticated' : 'Anonymous');

  // Opposite state button (clickable)
  const switchButton = createElement('button', {
    class: CSS_CLASSES.OPTION_BUTTON,
    'data-auth-state': currentState ? CSS_CLASSES.ANONYMOUS : CSS_CLASSES.AUTHENTICATED,
  }, currentState ? 'Switch to Anonymous' : 'Switch to Authenticated');

  // Clear any existing content and add only our two elements
  optionsContainer.innerHTML = '';
  optionsContainer.append(currentStateIndicator, switchButton);

  function togglePanel() {
    isExpanded = !isExpanded;
    block.classList.toggle(CSS_CLASSES.EXPANDED, isExpanded);
    handle.classList.toggle(CSS_CLASSES.HIDDEN, isExpanded);

    if (isExpanded) {
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 100); // Small delay to prevent immediate closure
    } else {
      document.removeEventListener('click', handleClickOutside);
    }
  }

  function handleClickOutside(event) {
    if (block.contains(event.target)) {
      return;
    }

    if (isExpanded) {
      togglePanel();
    }
  }

  // Drag functionality with AbortController for cleaner event management
  let isDragging = false;
  let dragController = null;
  
  function getClientCoords(e) {
    return {
      x: e.clientX || (e.touches && e.touches[0]?.clientX) || 0,
      y: e.clientY || (e.touches && e.touches[0]?.clientY) || 0
    };
  }

  function startDrag(e) {
    e.preventDefault();
    isDragging = false;

    const { x: clientX, y: clientY } = getClientCoords(e);
    const rect = block.getBoundingClientRect();
    
    const dragState = {
      startX: clientX,
      startY: clientY,
      initialX: rect.left,
      initialY: rect.top
    };

    dragController = new AbortController();
    const { signal } = dragController;
    
    document.addEventListener('mousemove', (e) => onDrag(e, dragState), { signal });
    document.addEventListener('mouseup', endDrag, { signal });
    document.addEventListener('touchmove', (e) => onDrag(e, dragState), { signal });
    document.addEventListener('touchend', endDrag, { signal });
  }

  function onDrag(e, dragState) {
    e.preventDefault();

    const { x: clientX, y: clientY } = getClientCoords(e);
    const deltaX = clientX - dragState.startX;
    const deltaY = clientY - dragState.startY;

    const DRAG_THRESHOLD = 5;
    if (!isDragging && (Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD)) {
      isDragging = true;
      block.classList.add(CSS_CLASSES.DRAGGING);
    }

    if (isDragging) {
      const newX = dragState.initialX + deltaX;
      const newY = dragState.initialY + deltaY;

      // Constrain to viewport
      const maxX = window.innerWidth - block.offsetWidth;
      const maxY = window.innerHeight - block.offsetHeight;

      const constrainedX = Math.max(0, Math.min(newX, maxX));
      const constrainedY = Math.max(0, Math.min(newY, maxY));

      block.style.left = `${constrainedX}px`;
      block.style.top = `${constrainedY}px`;
      block.style.right = 'auto';
    }
  }

  function endDrag() {
    if (dragController) {
      dragController.abort();
      dragController = null;
    }

    if (isDragging) {
      block.classList.remove(CSS_CLASSES.DRAGGING);
      isDragging = false;
    } else {
      togglePanel();
    }
  }

  handle.addEventListener('mousedown', startDrag);
  handle.addEventListener('touchstart', startDrag);
  closeBtn.addEventListener('click', togglePanel);

  function handleOptionClick(targetState) {
    const url = new URL(window.location);

    if (targetState === CSS_CLASSES.AUTHENTICATED) {
      url.searchParams.set('auth', 'true');
    } else if (targetState === CSS_CLASSES.ANONYMOUS) {
      url.searchParams.set('auth', 'false');
    }

    window.location.href = url.toString();
  }

  switchButton.addEventListener('click', () => {
    const targetState = switchButton.getAttribute('data-auth-state');
    handleOptionClick(targetState);
  });

  block.appendChild(handle);
  block.appendChild(header);
  block.appendChild(optionsContainer);

  function cleanup() {
    document.removeEventListener('click', handleClickOutside);
    if (dragController) {
      dragController.abort();
      dragController = null;
    }
  }

  block.cleanup = cleanup;

  setTimeout(() => {
    block.classList.add(CSS_CLASSES.VISIBLE);
    setTimeout(() => {
      handle.classList.add(CSS_CLASSES.BOUNCE);
      setTimeout(() => {
        handle.classList.remove(CSS_CLASSES.BOUNCE);
      }, 400);
    }, 500);
  }, 1000);

  return block;
}

/**
 * Create and add an auth toggle to the page programmatically
 * @returns {HTMLElement} The auth toggle element
 */
export async function createAuthToggle() {
  // Load CSS file for the auth toggle block
  await loadCSS(`${window.hlx.codeBasePath}/blocks/auth-toggle/auth-toggle.css`);
  
  const block = createElement('div', { class: CSS_CLASSES.TOGGLE });
  document.body.appendChild(block);
  return decorate(block);
}
