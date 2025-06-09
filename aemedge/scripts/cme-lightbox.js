/**
 * CME Lightbox - Simplified Vanilla JS Implementation
 *
 * A lightweight lightbox component for image viewing with clean markup and minimal dependencies.
 * Uses simple CSS classes and data attributes for optimal performance and maintainability.
 *
 *
 * @example
 * <img class="lightbox-image"
 *      src="thumb.jpg"
 *      data-lightbox-src="fullsize.jpg"
 *      data-lightbox-alt="Full size image description"
 *      alt="Thumbnail description">
 */
class CMELightbox {
  constructor() {
    this.currentModal = null;
    this.init();
  }

  /**
     * Initialize lightbox functionality
     * Sets up event listeners and adds expand icons to lightbox images
     */
  init() {
    this.bindEvents();
    this.addExpandIcons();
  }

  /**
     * Bind click and keyboard events for lightbox functionality
     */
  bindEvents() {
    // Event delegation for lightbox triggers
    document.addEventListener('click', (e) => {
      const lightboxImage = e.target.closest('.lightbox-image');
      if (lightboxImage) {
        e.preventDefault();
        e.stopPropagation();
        this.openLightbox(lightboxImage);
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
     * Add expand icons to lightbox images that don't have them
     * Uses CME Group icon font for consistent styling
     */
  // eslint-disable-next-line class-methods-use-this
  addExpandIcons() {
    const lightboxImages = document.querySelectorAll('.lightbox-image');

    lightboxImages.forEach((img) => {
      // Find the lightbox container (should be the wrapper div)
      const container = img.closest('.lightbox-container');
      if (!container) return;

      // Skip if container already has an expand icon
      if (container.querySelector('.lightbox-expand-icon')) {
        return;
      }

      // Create expand icon
      const icon = document.createElement('span');
      icon.className = 'lightbox-expand-icon';
      icon.innerHTML = '\ue941'; // CME Group diagonal expand icon
      icon.setAttribute('aria-hidden', 'true');

      // Add icon to the container (which has position: relative)
      container.appendChild(icon);
    });
  }

  /**
     * Open lightbox with the specified image
     * @param {Element} img - The image element to display in lightbox
     */
  openLightbox(img) {
    if (!img) return;

    // Get image sources and alt text
    const fullSizeSrc = img.dataset.lightboxSrc || img.src;
    const altText = img.dataset.lightboxAlt || img.alt || '';

    // Create and show modal
    this.createModal(fullSizeSrc, altText);
    this.showModal();
  }

  /**
   * Create modal DOM structure with semantic HTML
   * @param {string} imageSrc - Source URL of the image to display
   * @param {string} imageAlt - Alternative text for the image
   */
  createModal(imageSrc, imageAlt) {
    // Remove existing modal if any
    this.closeLightbox();

    // Create modal structure with semantic classes
    const modal = document.createElement('div');
    modal.className = 'lightbox-modal';
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('tabindex', '-1');
    modal.setAttribute('aria-label', 'Image viewer');

    modal.innerHTML = `
            <div class="lightbox-dialog">
                <div class="lightbox-content">
                    <button type="button" class="lightbox-close" aria-label="Close image viewer"></button>
                    <div class="lightbox-body">
                        <img src="${imageSrc}" 
                             alt="${imageAlt}"
                             class="lightbox-image-display"
                             loading="lazy">
                    </div>
                </div>
            </div>
        `;

    this.currentModal = modal;
    document.body.appendChild(modal);

    // Add event handlers
    this.bindModalEvents(modal);
  }

  /**
     * Bind events for modal interaction
     * @param {Element} modal - The modal element
     */
  bindModalEvents(modal) {
    const closeBtn = modal.querySelector('.lightbox-close');
    const dialog = modal.querySelector('.lightbox-dialog');

    // Close button click
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.closeLightbox();
      });
    }

    // Close when clicking outside the dialog (on backdrop)
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeLightbox();
      }
    });

    // Prevent closing when clicking inside dialog
    if (dialog) {
      dialog.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }
  }

  /**
     * Show the modal with smooth animation
     */
  showModal() {
    if (!this.currentModal) return;

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Show modal with fade-in animation
    requestAnimationFrame(() => {
      this.currentModal.style.display = 'flex';
      requestAnimationFrame(() => {
        this.currentModal.classList.add('lightbox-modal-show');
      });
    });
  }

  /**
     * Close and remove the current lightbox modal
     */
  closeLightbox() {
    if (!this.currentModal) return;

    // Remove modal immediately
    const modalToRemove = this.currentModal;
    this.currentModal = null;

    modalToRemove.remove();

    // Restore body scroll
    document.body.style.overflow = '';
  }
}

// Initialize lightbox when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.cmeModals = new CMELightbox();
  });
} else {
  window.cmeModals = new CMELightbox();
}
