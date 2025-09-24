/* eslint-disable no-unused-vars */
import { generateRandomId, createElement } from '../../scripts/utils.js';

/* Helper Functions */
function debounce(fn, delay = 250) {
  let timer;
  // eslint-disable-next-line func-names
  return function (...args) {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      fn(...args);
      timer = null;
    }, delay);
  };
}

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
      return $all('.slider__slide', this.elem);
    }

    get sliderInner() {
      return $('.slider__inner', this.elem);
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
        this.sliderInner.style.height = `calc(${slidesTotal * 100}% + ${slidesTotal * gap}px)`;
        this.sliderInner.style.top = `calc(-100% - ${gap}px)`;
      } else {
        this.sliderInner.style.width = `calc(${slidesTotal * 100}% + ${slidesTotal * gap}px)`;
        this.sliderInner.style.left = `calc(-100% - ${gap}px)`;
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
      const arrowNext = createNode('button', { className: 'slider__arrow slider__arrow--next', type: 'button', 'data-slide-change': '1' }, createNode('span', { className: 'slider__chevron-icon slider__chevron-icon--next' }));
      const arrowPrev = createNode('button', { className: 'slider__arrow slider__arrow--prev', type: 'button', 'data-slide-change': '-1' }, createNode('span', { className: 'slider__chevron-icon slider__chevron-icon--prev' }));
      const arrowsWrapper = createNode('div', { className: 'slider__arrows' }, arrowPrev, arrowNext);

      arrowsWrapper.addEventListener('click', (e) => {
        if (!e.target.classList.contains('slider__arrow')) return;
        const selectedSlide = this.state.activeSlide + parseInt(e.target.dataset.slideChange, 10);
        if (selectedSlide < 0 || selectedSlide > this.slides.length - 1) return;
        this.setActiveSlide(selectedSlide);
      });
      this.elem.appendChild(arrowsWrapper);
    }

    mountDots() {
      const dotsList = createNode('ul', { className: 'slider__dots' });
      // eslint-disable-next-line no-plusplus
      for (let i = 0; i < this.state.slidesTotal; i++) {
        const dot = createNode('li', { className: `slider__dot${i === 0 ? ' is-active' : ''}`, 'data-index': i });
        dotsList.appendChild(dot);
      }
      dotsList.addEventListener('click', (e) => {
        if (!e.target.classList.contains('slider__dot')) return;
        const slideIndex = +e.target.dataset.index + 1;
        this.setActiveSlide(slideIndex);
      });
      this.elem.appendChild(dotsList);
    }

    slide(movePos = 0) {
      const { isVertical } = this.settings;
      const slideLength = isVertical ? this.slides[0].offsetHeight : this.slides[0].offsetWidth;
      const gap = 20;
      const endPos = (this.state.activeSlide * -slideLength) - (this.state.activeSlide * gap);
      const axis = isVertical ? 'top' : 'left';
      if (!this.state.skipTransition) {
        this.sliderInner.classList.remove('no-transition');
      } else {
        this.sliderInner.classList.add('no-transition');
        this.setState({ skipTransition: false });
      }
      this.sliderInner.style[axis] = `${endPos + movePos}px`;
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

      if (!swipeDirection) {
        this.setState({
          swipeDirection: Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical',
        });
      }

      if (this.state.swipeDirection === 'horizontal') {
        e.preventDefault();
        this.slide(deltaX);
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
        startX: null, startY: null, startTime: null, isAnimating: false, swipeDirection: null,
      });

      window.removeEventListener('mousemove', this.swipeMove);
      window.removeEventListener('mouseup', this.swipeEnd);
      window.removeEventListener('touchmove', this.swipeMove);
      window.removeEventListener('touchend', this.swipeEnd);
    }

    resizeSlider(e) {
      this.slide();
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
        const currentDot = $('.slider__dot.is-active', this.elem);
        const selectedDot = $all('.slider__dot', this.elem)[dotIndex];

        if (currentDot) currentDot.classList.remove('is-active');
        if (selectedDot) selectedDot.classList.add('is-active');
      }
    }
  }
  return Slider;
}());

function createSlide(row, slideIndex, carouselId) {
  const slide = createElement('div', { class: 'slider__slide' });
  slide.setAttribute('id', `slider__slide--${slideIndex}`);
  slide.dataset.slideIndex = slideIndex;
  slide.dataset.carouselId = carouselId;

  row.querySelectorAll(':scope > div').forEach((column) => {
    slide.append(column);
  });

  const labeledBy = slide.querySelector('h1, h2, h3, h4, h5, h6');
  if (labeledBy) {
    labeledBy.classList.add('slide__caption');
    slide.setAttribute('aria-labelledby', labeledBy.getAttribute('id'));
  }

  return slide;
}

export default async function decorate(block) {
  const carouselId = generateRandomId();
  block.setAttribute('id', `carousel-${carouselId}`);
  const rows = block.querySelectorAll(':scope > div');
  const isSingleSlide = rows.length < 2;

  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', 'Carousel');

  const container = createElement('div', { class: 'carousel-container' });
  const slider = createElement('div', { class: 'slider' });
  slider.setAttribute('id', `slider-${carouselId}`);
  const slidesList = createElement('div', { class: 'slider__inner' });

  rows.forEach((row, idx) => {
    const slide = createSlide(row, idx, carouselId);
    slidesList.append(slide);
    row.remove();
  });

  slider.append(slidesList);
  container.append(slider);
  block.prepend(container);

  if (!isSingleSlide) {
    const sliderComponent = new SliderPlugin({ id: `slider-${carouselId}` });
  }
}
