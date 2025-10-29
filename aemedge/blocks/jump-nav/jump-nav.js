import { createElement } from '../../scripts/utils.js';

let intersectionObserver = null;
let allLinks = [];
let sections = [];
const title = createElement('div', { class: 'title' });
title.innerText = 'Jump To';
const selectionBar = createElement('div', { class: 'selection-bar' });
let pendingActiveLink = null;

function onTransitionEnd() {
  selectionBar.classList.remove('show');
  if (pendingActiveLink) {
    allLinks.forEach((l) => l.classList.remove('active'));
    pendingActiveLink.classList.add('active');
    pendingActiveLink = null;
  }
}

selectionBar.addEventListener('transitionend', onTransitionEnd);

function scrollToCenter(element, container) {
  const elementOffset = element.offsetLeft;
  const elementWidth = element.offsetWidth;
  const containerWidth = container.offsetWidth;
  const targetScrollLeft = elementOffset + (elementWidth / 2) - (containerWidth / 2);
  container.scrollTo({
    left: targetScrollLeft,
    behavior: 'smooth',
  });
}

export default function decorate(block) {
  const nav = block.querySelector('ul');
  if (!nav) {
    return;
  }

  block.prepend(title);
  block.append(selectionBar);

  const container = block.closest('.jump-nav-container');
  if (container) {
    setupHeaderSync(container);
  }

  setupActiveStates(nav);
  setupDraggableScroll(nav);

  handleInitialHashScroll(nav);
}

function handleInitialHashScroll(nav) {
  const { hash } = window.location;
  if (hash) {
    const targetElement = document.getElementById(hash.substring(1));
    const link = nav.querySelector(`a[href="${hash}"]`);

    if (targetElement && link) {
      window.scrollTo(0, 0);

      setTimeout(() => {
        scrollSection(targetElement, link, false, false, nav, true);
      }, 200);
    }
  }
}

function updateBarPosition(selected) {
  const menuActive = selected;
  const pseudoStyle = getComputedStyle(menuActive, '::after');
  const menuBarWidth = parseFloat(pseudoStyle.getPropertyValue('width'));
  const menuBarLeft = parseFloat(pseudoStyle.getPropertyValue('left'));
  const paddingLeft = parseFloat(
    getComputedStyle(selected.parentElement.parentElement).getPropertyValue('padding-left'),
  );
  const { scrollLeft } = selected.parentElement.parentElement;
  const selectionBarLeft = paddingLeft + menuActive.offsetLeft - scrollLeft + menuBarLeft;
  const selectionBarWidth = menuBarWidth;

  selectionBar.style.cssText = `
    left: ${selectionBarLeft}px;
    width: ${selectionBarWidth}px;
  `;
  selectionBar.classList.add('show');
}

function setupHeaderSync(container) {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const body = mutation.target;
        const isScrollingDown = body.classList.contains('scrolling-down');

        if (isScrollingDown) {
          container.classList.remove('below-header');
        } else {
          container.classList.add('below-header');
        }
      }
    });
  });

  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['class'],
  });

  const initialIsScrollingDown = document.body.classList.contains('scrolling-down');
  if (initialIsScrollingDown) {
    container.classList.remove('below-header');
  } else {
    container.classList.add('below-header');
  }
}

function scrollSection(targetElement, link, isSmooth, updateHash, nav, initialLoad = false) {
  const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
  const jumpToHeight = document.querySelector('.jump-nav')?.offsetHeight || 0;

  const totalOffset = headerHeight + jumpToHeight;

  targetElement.style.scrollMarginTop = `${totalOffset}px`;

  if (updateHash) {
    const href = link.getAttribute('href');
    if (href) {
      // eslint-disable-next-line no-restricted-globals
      history.pushState(null, '', href);
    }
  }

  if (intersectionObserver) {
    intersectionObserver.disconnect();

    targetElement.scrollIntoView({ behavior: isSmooth ? 'smooth' : 'auto' });

    if (nav && link.parentElement) {
      scrollToCenter(link.parentElement, nav);
    }

    setTimeout(() => {
      allLinks.forEach((l) => l.classList.remove('active'));

      if (initialLoad || isSmooth) {
        link.classList.add('active');
        pendingActiveLink = null;
      } else {
        pendingActiveLink = link;
      }

      updateBarPosition(link);
    }, 500);
  }

  const delay = isSmooth ? 500 : 50;

  if (intersectionObserver) {
    setTimeout(() => {
      sections.forEach((section) => {
        intersectionObserver.observe(section.element);
      });
    }, delay);
  }
}

function setupActiveStates(nav) {
  const links = nav.querySelectorAll('a');
  allLinks = Array.from(links);
  sections = [];

  links.forEach((link) => {
    const href = link.getAttribute('href');
    if (href && href.startsWith('#')) {
      const targetId = href.substring(1);
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        sections.push({ element: targetElement, link });
        link.addEventListener('click', (e) => {
          if (nav.classList.contains('is-dragging')) {
            e.preventDefault();
            e.stopPropagation();
            nav.classList.remove('is-dragging');
            return;
          }
          e.preventDefault();
          scrollSection(targetElement, link, true, true, nav);
        });
      }
    }
  });

  if (!sections.length) {
    return;
  }

  const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
  const jumpToHeight = document.querySelector('.jump-nav')?.offsetHeight || 0;
  const totalStickyHeight = headerHeight + jumpToHeight;

  const observerOptions = {
    rootMargin: `-${totalStickyHeight}px 0px -${window.innerHeight - totalStickyHeight}px 0px`,
    threshold: 0,
  };

  intersectionObserver = new IntersectionObserver((entries) => {
    let currentActiveEntry = null;
    let minDistanceFromTop = Infinity;

    entries.forEach((entry) => {
      const rectTop = entry.boundingClientRect.top;
      if (rectTop <= totalStickyHeight && entry.isIntersecting) {
        const distance = totalStickyHeight - rectTop;

        if (distance >= 0 && distance < minDistanceFromTop) {
          minDistanceFromTop = distance;
          currentActiveEntry = entry;
        }
      }
    });

    if (currentActiveEntry) {
      const section = sections.find((s) => s.element === currentActiveEntry.target);

      if (section) {
        const linkToActivate = section.link;
        const currentlyActive = document.querySelector('.jump-nav a.active');

        if (currentlyActive !== linkToActivate) {
          allLinks.forEach((link) => link.classList.remove('active'));
          linkToActivate.classList.add('active');

          scrollToCenter(linkToActivate.parentElement, nav);

          updateBarPosition(linkToActivate);

          const href = linkToActivate.getAttribute('href');
          if (href) {
            // eslint-disable-next-line no-restricted-globals
            history.replaceState(null, '', href);
          }
        }
      }
    } else if (window.scrollY === 0 && sections.length > 0) {
      const firstSectionLink = sections[0].link;
      const currentlyActive = document.querySelector('.jump-nav a.active');

      if (currentlyActive !== firstSectionLink) {
        allLinks.forEach((link) => link.classList.remove('active'));
        firstSectionLink.classList.add('active');
        scrollToCenter(firstSectionLink.parentElement, nav);
        updateBarPosition(firstSectionLink);
      }
    }
  }, observerOptions);

  sections.forEach((section) => {
    intersectionObserver.observe(section.element);
  });
}

function setupDraggableScroll(nav) {
  let isDown = false;
  let startX;
  let scrollLeft;
  const dragThreshold = 5;

  nav.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;

    e.preventDefault();
    isDown = true;
    nav.classList.add('active-drag');
    startX = e.pageX - nav.offsetLeft;
    scrollLeft = nav.scrollLeft;
    nav.classList.remove('is-dragging');
  });

  document.addEventListener('mouseup', () => {
    isDown = false;
    nav.classList.remove('active-drag');
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDown) return;

    const x = e.pageX - nav.offsetLeft;
    const distance = x - startX;
    const walk = distance * 1.5;

    if (Math.abs(distance) > dragThreshold) {
      nav.classList.add('is-dragging');
    }

    if (nav.classList.contains('is-dragging')) {
      nav.scrollLeft = scrollLeft - walk;
    }
  });

  nav.addEventListener('mouseleave', () => {
    nav.classList.remove('active-drag');
  });
}
