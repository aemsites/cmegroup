import { createElement } from '../../scripts/utils.js';

const title = createElement('div', { class: 'title' });
title.innerText = 'Jump To';

const selectionBar = createElement('div', { class: 'selection-bar' });

function onTransitionEnd() {
  selectionBar.classList.remove('show');
}

selectionBar.addEventListener('transitionend', onTransitionEnd);

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
}

function updateBarPosition(selected) {
  const menuActive = selected;
  const pseudoStyle = getComputedStyle(menuActive, '::after');
  const menuBarWidth = parseFloat(pseudoStyle.getPropertyValue('width'));
  const menuBarLeft = parseFloat(pseudoStyle.getPropertyValue('left'));
  const paddingLeft = parseFloat(
    getComputedStyle(selected.parentElement.parentElement).getPropertyValue('padding-left'),
  );
  const scrollLeft = 0;
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

function scrollSection(targetElement, isClickedAfter) {
  const headerHeight = document.querySelector('.header')?.offsetHeight;
  const jumpToHeight = 80;
  targetElement.style.cssText = `
    scroll-margin-top: ${isClickedAfter ? jumpToHeight : headerHeight + jumpToHeight}px;
  `;
  targetElement.scrollIntoView();
}

function setupActiveStates(nav) {
  const links = nav.querySelectorAll('a');
  const sections = [];

  links.forEach((link) => {
    const href = link.getAttribute('href');
    if (href && href.startsWith('#')) {
      const targetId = href.substring(1);
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        sections.push({ element: targetElement, link });
        link.addEventListener('click', () => {
          const activeLink = document.querySelector('.active');
          const linksArray = Array.from(links);
          const clickedIndex = linksArray.indexOf(link);
          let isClickedAfter = false;

          if (activeLink) {
            const activeIndex = linksArray.indexOf(activeLink);
            if (clickedIndex > activeIndex) {
              isClickedAfter = true;
            }
          }
          scrollSection(targetElement, isClickedAfter);
        });
      }
    }
  });

  if (!sections.length) {
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        links.forEach((link) => link.classList.remove('active'));

        const section = sections.find((s) => s.element === entry.target);
        if (section) {
          updateBarPosition(section.link);
          section.link.classList.add('active');
        }
      }
    });
  }, {
    rootMargin: '-20% 0px -80% 0px',
    threshold: 0,
  });

  sections.forEach((section) => {
    observer.observe(section.element);
  });
}
