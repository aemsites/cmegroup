/**
 * CME Lightbox - Integrated with AEM Modal System
 *
 * A lightweight lightbox component for image viewing that leverages the existing
 * AEM modal system for consistent behavior and accessibility.
 *
 * @example
 * <img class="lightbox-image"
 *      src="thumb.jpg"
 *      data-lightbox-src="fullsize.jpg"
 *      data-lightbox-alt="Full size image description"
 *      alt="Thumbnail description">
 */

import { createModal } from '../blocks/modal/modal.js';

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
   * Bind click events for lightbox functionality
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
   * Open lightbox with the specified image using the AEM modal system
   * @param {Element} img - The image element to display in lightbox
   */
  async openLightbox(img) {
    if (!img) return;

    // Get image sources and alt text
    const fullSizeSrc = img.dataset.lightboxSrc || img.src;
    const altText = img.dataset.lightboxAlt || img.alt || '';

    // Create image element for the modal
    const imageElement = document.createElement('img');
    imageElement.src = fullSizeSrc;
    imageElement.alt = altText;
    imageElement.className = 'lightbox-image-display';
    imageElement.loading = 'lazy';

    // Use the existing modal system
    const modal = await createModal([imageElement]);

    // Store reference for cleanup
    this.currentModal = modal;

    // Customize the modal for lightbox use
    this.customizeModalForLightbox(modal);

    // Show the modal
    modal.showModal();
  }

  /**
   * Customize the modal for lightbox-specific styling and behavior
   * @param {Object} modal - The modal object from createModal
   */
  // eslint-disable-next-line class-methods-use-this
  customizeModalForLightbox(modal) {
    const { block } = modal;
    const dialog = block.querySelector('dialog');

    // Add lightbox-specific class for styling
    dialog.classList.add('lightbox-modal');

    // Add custom cleanup when modal closes
    dialog.addEventListener('close', () => {
      this.currentModal = null;
    }, { once: true });
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
