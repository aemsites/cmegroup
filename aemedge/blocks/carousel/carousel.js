/* eslint-disable no-unused-vars */
import { generateRandomId, createElement, debounce } from '../../scripts/utils.js';

/* Helper Functions */
function $(selector, context = document) {
  return context.querySelector(selector);
}

function $all(selector, context = document) {
  return context.querySelectorAll(selector);
}

const createNode = (tagName, attributes, ...children) => {
  const node = document.createElement(tagName);

  if (attributes) {
    Object.keys(attributes).forEach((key) => {
      if (key === 'className') {
        const classes = attributes[key].split(' ');
        classes.forEach((x) => node.classList.add(x));
      } else if (/^data-/.test(key)) {
        const dataProp = key
          .slice(5)
          .split('-')
          .map(
            (str, i) => (i === 0
              ? str
              : str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()),
          )
          .join('');
        node.dataset[dataProp] = attributes[key];
      } else {
        node.setAttribute(key, attributes[key]);
      }
    });
  }

  children.forEach((child) => {
    if (typeof child === 'undefined' || child === null) {
      return;
    }
    if (typeof child === 'string') {
      node.appendChild(document.createTextNode(child));
    } else {
      node.appendChild(child);
    }
  });

  return node;
};

const mouseTouch = () => ('ontouchstart' in document === true ? 'touchstart' : 'mousedown');

const isWebkit = 'WebkitAppearance' in document.documentElement.style;

// eslint-disable-next-line func-names
const SliderPlugin = (function () {
  const def = {
    id: '',
    showArrows: true,
    showDots: false,
    onInfiniteLoop: true,
    isVertical: false,
  };

  const propTypes = {
    id: 'string',
    showArrows: 'boolean',
    showDots: 'boolean',
    onInfiniteLoop: 'boolean',
    isVertical: 'boolean',
  };

  class Slider {
    constructor(settings) {
      try {
        if ('id' in settings === false) {
          throw new Error('Must include prop `id`');
        }
        Object.keys(settings).forEach((key) => {
          const definedType = propTypes[key];
          if (typeof definedType === 'undefined') {
            throw new Error(`Invalid propName: \`${key}\` is undefined`);
          }
          // eslint-disable-next-line valid-typeof
          if (typeof settings[key] !== definedType) {
            throw new Error(`Invalid propType for \`${key}\`: expected type \`${definedType}\`, received \`${typeof settings[key]}\``);
          }
        });
        this.settings = {
          ...def,
          ...settings,
        };
        this.state = {
          activeSlide: 0,
          slidesTotal: 0,
          skipTransition: false,
          isAnimating: false,
          startX: null,
          startY: null,
          startTime: null,
          swipeDirection: null,
        };
        this.elem = $(`#${settings.id}`);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e.message);
      }
      this.swipeMove = this.swipeMove.bind(this);
      this.swipeStart = this.swipeStart.bind(this);
      this.swipeEnd = this.swipeEnd.bind(this);
      this.resizeSlider = this.resizeSlider.bind(this);
      this.init();
    }

    get slides() {
      return $all('.slider-slide', this.elem);
    }

    get sliderInner() {
      return $('.slider-inner', this.elem);
    }

    init() {
      this.state.slidesTotal = this.slides.length;
      this.initSliderInner();
      if (this.settings.onInfiniteLoop) {
        this.setState({
          activeSlide: 1,
        });
        this.initInfiniteLoop();
      }
      if (this.settings.showArrows) {
        this.mountArrows();
      }
      if (this.settings.showDots) {
        this.mountDots();
      }

      this.setDynamicHeight();
      this.slide();

      this.sliderInner.addEventListener(mouseTouch(), this.swipeStart);
      window.addEventListener('resize', debounce(this.resizeSlider, 250));
    }

    setState(newState) {
      this.state = {
        ...this.state,
        ...newState,
      };
    }

    initSliderInner() {
      const { onInfiniteLoop } = this.settings;
      const slidesTotal = !onInfiniteLoop ? this.slides.length : this.slides.length + 2;
      const gap = 20;

      if (this.settings.isVertical) {
        this.elem.classList.add('is-vertical');
      } else {
        this.sliderInner.style.width = `calc(${slidesTotal * 100}% + ${slidesTotal * gap}px)`;
        // The initial transform is applied here, but slide() will re-apply it based on activeSlide
        this.sliderInner.style.transform = `translateX(calc(-100% - ${gap}px))`;
      }
    }

    setDynamicHeight() {
      if (this.settings.isVertical) return;

      // Get the active slide index, accounting for infinite loop clones(index 0 & last index)
      const activeSlideIndex = this.state.activeSlide;
      const currentSlide = this.slides[activeSlideIndex];

      if (!currentSlide) return;

      // Apply height to the carousel container parent
      const carouselContainer = $('.carousel-container', this.elem.parentNode);

      // Use offsetHeight (including padding/border) to get the rendered height of the slide content
      const contentHeight = currentSlide.offsetHeight;

      if (carouselContainer) {
        carouselContainer.style.height = `${contentHeight}px`;
      }

      // Also apply to the slider element to contain other positioned elements like arrows/dots
      const sliderElement = $('.slider', this.elem.parentNode);
      if (sliderElement) {
        sliderElement.style.height = `${contentHeight}px`;
      }
    }

    initInfiniteLoop() {
      const cloneFirst = this.slides[0].cloneNode(true);
      const cloneLast = this.slides[this.slides.length - 1].cloneNode(true);
      this.sliderInner.appendChild(cloneFirst);
      this.sliderInner.insertBefore(cloneLast, this.sliderInner.firstElementChild);

      this.sliderInner.addEventListener('transitionend', () => {
        const currentIndex = this.state.activeSlide;
        const lastIndex = this.slides.length - 1;
        if (currentIndex !== 0 && currentIndex !== lastIndex) return;
        this.setState({
          skipTransition: true,
        });
        const nextIndex = currentIndex === 0 ? lastIndex - 1 : 1;
        this.setActiveSlide(nextIndex);
      });
    }

    mountArrows() {
      const arrowNext = createNode('button', { className: 'slider-arrow slider-arrow-next', type: 'button', 'data-slide-change': '1' }, createNode('span', { className: 'slider-chevron-icon slider-chevron-icon-next' }));
      const arrowPrev = createNode('button', { className: 'slider-arrow slider-arrow-prev', type: 'button', 'data-slide-change': '-1' }, createNode('span', { className: 'slider-chevron-icon slider-chevron-icon-prev' }));
      const arrowsWrapper = createNode('div', { className: 'slider-arrows' }, arrowPrev, arrowNext);

      arrowsWrapper.addEventListener('click', (e) => {
        if (!e.target.classList.contains('slider-arrow')) return;
        const selectedSlide = this.state.activeSlide + parseInt(e.target.dataset.slideChange, 10);
        if (selectedSlide < 0 || selectedSlide > this.slides.length - 1) return;
        this.setActiveSlide(selectedSlide);
      });
      this.elem.appendChild(arrowsWrapper);
    }

    mountDots() {
      const dotsList = createNode('ul', { className: 'slider-dots' });
      // eslint-disable-next-line no-plusplus
      for (let i = 0; i < this.state.slidesTotal; i++) {
        const dot = createNode('li', { className: `slider-dot${i === 0 ? ' is-active' : ''}`, 'data-index': i });
        dotsList.appendChild(dot);
      }
      dotsList.addEventListener('click', (e) => {
        if (!e.target.classList.contains('slider-dot')) return;
        const slideIndex = +e.target.dataset.index + 1;
        this.setActiveSlide(slideIndex);
      });
      this.elem.appendChild(dotsList);
    }

    slide(movePos = 0) {
      const { isVertical } = this.settings;

      if (this.slides.length === 0) return;

      const slideLength = isVertical ? this.slides[0].offsetHeight : this.slides[0].offsetWidth;
      const gap = 20;

      const endPos = (this.state.activeSlide * slideLength) + (this.state.activeSlide * gap);
      const axis = isVertical ? 'Y' : 'X';

      if (!this.state.skipTransition) {
        this.sliderInner.classList.remove('no-transition');
      } else {
        this.sliderInner.classList.add('no-transition');
        this.setState({ skipTransition: false });
      }

      this.sliderInner.style.transform = `translate${axis}(${-(endPos - movePos)}px)`;

      this.setDynamicHeight();
    }

    swipeStart(e) {
      if (this.state.isAnimating) return;
      const touch = e.type !== 'touchstart' ? e : (e.targetTouches[0] || e.changedTouches[0]);
      this.sliderInner.classList.add('is-grabbing');
      this.sliderInner.classList.add('no-transition');

      this.setState({
        startX: touch.pageX,
        startY: touch.pageY,
        startTime: Date.now(),
        isAnimating: true,
      });

      switch (e.type) {
        case 'mousedown':
          window.addEventListener('mousemove', this.swipeMove);
          window.addEventListener('mouseup', this.swipeEnd);
          break;
        case 'touchstart':
          window.addEventListener('touchmove', this.swipeMove, { passive: false });
          window.addEventListener('touchend', this.swipeEnd);
          break;
        default:
          break;
      }
    }

    swipeMove(e) {
      const touch = e.type !== 'touchmove' ? e : (e.targetTouches[0] || e.changedTouches[0]);
      const { startX, startY, swipeDirection } = this.state;
      const deltaX = touch.pageX - startX;
      const deltaY = touch.pageY - startY;
      const { isVertical } = this.settings;

      if (!swipeDirection) {
        this.setState({
          swipeDirection: Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical',
        });
      }

      const currentTransform = window.getComputedStyle(this.sliderInner).transform;
      // Extract the current translate value(e.g. -100px from matrix(...) or translate(..., -100px))
      const matrixMatch = currentTransform.match(/matrix\(([^,]+), ([^,]+), ([^,]+), ([^,]+), ([^,]+), ([^,]+)\)/);
      let currentTranslation = 0;
      if (matrixMatch) {
        currentTranslation = isVertical ? parseFloat(matrixMatch[6]) : parseFloat(matrixMatch[5]);
      } else {
        // Fallback for browsers that report translate()
        const translateMatch = currentTransform.match(/translate(X|Y)\(([^)]+)/);
        if (translateMatch) {
          currentTranslation = parseFloat(translateMatch[2].replace('px', ''));
        }
      }

      if (this.state.swipeDirection === 'horizontal') {
        e.preventDefault();
        this.sliderInner.style.transform = `translateX(${currentTranslation + deltaX}px)`;
      }
    }

    swipeEnd(e) {
      const touch = e.type.endsWith('up') ? e : (e.changedTouches[0]);
      this.sliderInner.classList.remove('is-grabbing');
      this.sliderInner.classList.remove('no-transition');

      const { startX, startTime } = this.state;
      const endTime = Date.now();
      const moveX = touch.pageX - startX;
      const velocity = moveX / (endTime - startTime);
      const slideWidth = this.slides[0].offsetWidth;

      const shouldChangeSlide = (Math.abs(moveX) > slideWidth / 3) || (Math.abs(velocity) > 0.4);

      if (shouldChangeSlide && moveX !== 0) {
        const direction = Math.sign(moveX);
        this.setActiveSlide(this.state.activeSlide - direction);
      } else {
        this.slide();
      }

      this.setState({
        startX: null,
        startY: null,
        startTime: null,
        isAnimating: false,
        swipeDirection: null,
      });

      window.removeEventListener('mousemove', this.swipeMove);
      window.removeEventListener('mouseup', this.swipeEnd);
      window.removeEventListener('touchmove', this.swipeMove);
      window.removeEventListener('touchend', this.swipeEnd);
    }

    resizeSlider(e) {
      this.slide();
      this.setDynamicHeight();
    }

    setActiveSlide(index) {
      this.setState({ activeSlide: index });
      this.updateView();
    }

    updateView() {
      const dotIndex = !this.settings.onInfiniteLoop
        ? this.state.activeSlide : this.state.activeSlide - 1;
      const { showDots } = this.settings;
      this.slide();
      if (showDots) {
        const currentDot = $('.slider-dot.is-active', this.elem);
        const selectedDot = $all('.slider-dot', this.elem)[dotIndex];

        if (currentDot) currentDot.classList.remove('is-active');
        if (selectedDot) selectedDot.classList.add('is-active');
      }
    }
  }
  return Slider;
}());

function createSlide(row, slideIndex, carouselId) {
  const slide = createElement('div', { class: 'slider-slide' });
  slide.setAttribute('id', `slider-slide--${slideIndex}`);
  slide.dataset.slideIndex = slideIndex;
  slide.dataset.carouselId = carouselId;

  row.querySelectorAll(':scope > div').forEach((column) => {
    slide.append(column);
  });

  const labeledBy = slide.querySelector('h1, h2, h3, h4, h5, h6');
  if (labeledBy) {
    labeledBy.classList.add('slide-caption');
    slide.setAttribute('aria-labelledby', labeledBy.getAttribute('id'));
  }

  return slide;
}

function createSpinner() {
  const spinner = createElement('div', { class: 'carousel-spinner' });
  return spinner;
}

function waitForImagesToLoad(container) {
  const images = container.querySelectorAll('img');
  if (images.length === 0) {
    return Promise.resolve();
  }
  const imagePromises = Array.from(images).map((img) => new Promise((resolve) => {
    // A single handler for both load and error events, which resolves the promise.
    const resolveHandler = () => {
      img.removeEventListener('load', resolveHandler);
      img.removeEventListener('error', resolveHandler);
      resolve();
    };

    // 1. Attach listeners FIRST.
    img.addEventListener('load', resolveHandler);
    img.addEventListener('error', resolveHandler);

    setTimeout(() => {
      // 2. Check for completion or broken state.
      if (img.complete) {
        // If 'complete' but broken (no natural dimensions),
        // OR if 'complete' and successfully loaded (natural dimensions exist),
        // we must force the browser to re-evaluate to fire the event
        // or manually resolve the promise.
        if (img.naturalHeight !== 0) {
          // Image successfully loaded from cache. Manually resolve.
          setTimeout(() => {
            resolveHandler();
          }, 100);
        } else if (img.src) {
          // Image is complete but dimensions are zero (broken or incomplete cache).
          // Temporarily blank the src and restore it to force a reliable re-trigger of load/error.
          const currentSrc = img.src;
          img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; // 1x1 transparent gif
          img.src = currentSrc;
        } else {
          // Edge case: complete but no src (not possible in standard use, but safe fallback)
          resolveHandler();
        }
      }
    }, 0);

    // For images that were not complete, the attached listeners (step 1) will handle resolution.
  }));

  return Promise.all(imagePromises);
}

export default async function decorate(block) {
  const carouselId = generateRandomId();
  block.setAttribute('id', `carousel-${carouselId}`);
  const rows = block.querySelectorAll(':scope > div');
  const isSingleSlide = rows.length < 2;

  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', 'Carousel');

  block.classList.add('carousel-loading');
  const spinner = createSpinner();
  block.prepend(spinner);

  const container = createElement('div', { class: 'carousel-container' });
  const slider = createElement('div', { class: 'slider' });
  slider.setAttribute('id', `slider-${carouselId}`);
  const slidesList = createElement('div', { class: 'slider-inner' });

  rows.forEach((row, idx) => {
    const slide = createSlide(row, idx, carouselId);
    slidesList.append(slide);
    row.remove();
  });

  const placeholderImg = slidesList.querySelector('.slider-slide');
  placeholderImg.classList.add('placeholder');

  slider.append(slidesList);
  container.append(slider);
  block.prepend(container);
  block.prepend(placeholderImg);

  waitForImagesToLoad(slidesList).then(() => {
    spinner.remove();
    block.classList.remove('carousel-loading');
    block.querySelector('.slider-slide.placeholder').remove();

    if (!isSingleSlide) {
      // eslint-disable-next-line no-new
      const sliderComponent = new SliderPlugin({ id: `slider-${carouselId}` });
    }
  });
}
