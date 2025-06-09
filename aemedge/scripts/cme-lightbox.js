/**
 * CME Lightbox Component
 *
 * A custom lightbox implementation for CME Group that provides modal image viewing
 * with zoom capabilities. Works with the CME Group design system and icon fonts.
 *
 * Features:
 * - Modal image display with backdrop
 * - CME Group branded close and magnify icons
 * - Keyboard navigation (Escape to close)
 * - Click outside to close
 * - Responsive design
 * - Event delegation for dynamic content
 *
 * Usage:
 * The lightbox automatically initializes and detects images with the following structure:
 *
 * <div class="component image" data-img-style="lightbox">
 *   <figure>
 *     <a role="button">
 *       <picture>
 *         <img src="image.jpg" alt="Description">
 *       </picture>
 *       <span class="magnify-icon default">🔍</span>
 *     </a>
 *   </figure>
 * </div>
 *
 * The lightbox will automatically add magnify icons to images that don't have them
 * and handle all click events for opening/closing modals.
 *
 * @author CME Group
 * @version 1.0.0
 */
class CMELightbox {
  /**
     * Creates a new CME Lightbox instance
     * @constructor
     */
  constructor() {
    /** @type {HTMLElement|null} The currently active modal element */
    this.currentModal = null;
    this.init();
  }

  /**
     * Initializes the lightbox by setting up event listeners and adding missing icons
     * @private
     */
  init() {
    // Find all lightbox trigger images
    this.bindEvents();
    // Add magnify icons to images that don't have them
    this.addMagnifyIcons();
  }

  /**
     * Sets up event delegation for lightbox triggers and keyboard navigation
     * Uses event delegation to handle dynamically added content
     * @private
     */
  bindEvents() {
    // Event delegation for lightbox triggers
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('[role="button"]');
      if (trigger && this.isLightboxImage(trigger)) {
        e.preventDefault();
        e.stopPropagation();
        this.openLightbox(trigger);
      }
    });

    // Close modal on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.currentModal) {
        this.closeLightbox();
      }
    });
  }

  /**
     * Checks if an element is a lightbox-enabled image
     * @param {HTMLElement} element - The element to check
     * @returns {boolean} True if the element is a lightbox image
     * @private
     */
  isLightboxImage(element) {
    // Check if this is a lightbox image by looking for the parent component
    const component = element.closest('.component.image[data-img-style="lightbox"]');
    return component !== null;
  }

  /**
     * Adds magnify icons to lightbox images that don't already have them
     * Uses the CME Group icon font character \ue901 for consistency
     * @public
     */
  addMagnifyIcons() {
    // Add magnify icons to images that don't have them
    const lightboxImages = document.querySelectorAll('.component.image[data-img-style="lightbox"] [role="button"]');

    lightboxImages.forEach((button) => {
      if (!button.querySelector('.magnify-icon')) {
        const icon = document.createElement('span');
        icon.className = 'magnify-icon default';
        icon.innerHTML = '\ue901'; // CMEGroup-Icons magnify/search icon
        button.appendChild(icon);
      }
    });
  }

  /**
     * Opens the lightbox modal for a specific image
     * @param {HTMLElement} trigger - The clicked trigger element containing the image
     * @public
     */
  openLightbox(trigger) {
    // Get image info
    const img = trigger.querySelector('img');
    const component = trigger.closest('.component.image');

    if (!img || !component) return;

    // Get high-res image source from data attribute or use current src
    const highResSrc = component.dataset.imgSrc || img.src;
    const alt = img.alt || '';

    // Create and show modal
    this.createModal(highResSrc, alt);
    this.showModal();
  }

  /**
     * Creates the modal DOM structure with image and close button
     * @param {string} imageSrc - The image source URL (preferably high resolution)
     * @param {string} imageAlt - The image alt text for accessibility
     * @private
     */
  createModal(imageSrc, imageAlt) {
    // Remove existing modal if any
    this.closeLightbox();

    // Create modal structure
    const modal = document.createElement('div');
    modal.className = 'modal fade lightbox-modal';
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('tabindex', '-1');

    // Modal HTML structure with CME Group styling
    modal.innerHTML = `
            <div class="modal-dialog universal-modal image-modal modal-dialog-centered" role="document">
                <div class="modal-content">
                    <span class="icon-menu-close" aria-label="Close"></span>
                    <div class="modal-body">
                        <div class="pinch-to-zoom-container">
                            <div class="pinch-to-zoom-area">
                                <img src="${imageSrc}" 
                                     alt="${imageAlt}"
                                     loading="lazy">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

    this.currentModal = modal;
    document.body.appendChild(modal);

    // Add click handlers AFTER adding to DOM
    const closeBtn = modal.querySelector('.icon-menu-close');

    // Close button click handler
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.closeLightbox();
      });
    }

    // Close when clicking outside the modal content (on backdrop)
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeLightbox();
      }
    });

    // Prevent closing when clicking inside modal content
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
      modalContent.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }
  }

  /**
     * Shows the modal with fade-in animation
     * Prevents body scrolling while modal is open
     * @private
     */
  showModal() {
    if (!this.currentModal) return;

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Show modal with animation
    requestAnimationFrame(() => {
      this.currentModal.style.display = 'block';
      requestAnimationFrame(() => {
        this.currentModal.classList.add('show');
      });
    });
  }

  /**
     * Closes the current lightbox modal and cleans up
     * Restores body scrolling and removes modal from DOM
     * @public
     */
  closeLightbox() {
    if (!this.currentModal) return;

    // Remove modal immediately - same as escape key behavior
    const modalToRemove = this.currentModal;
    this.currentModal = null;

    modalToRemove.remove();

    // Restore body scroll
    document.body.style.overflow = '';
  }
}

// Initialize lightbox when DOM is ready - SINGLE INITIALIZATION
// This ensures the lightbox is ready to handle images loaded dynamically
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    /** @type {CMELightbox} Global lightbox instance */
    window.cmeModals = new CMELightbox();
  });
} else {
  /** @type {CMELightbox} Global lightbox instance */
  window.cmeModals = new CMELightbox();
}
