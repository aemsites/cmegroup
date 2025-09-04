export default function decorate(block) {
  const nav = block.querySelector('ul');
  if (!nav) {
    return;
  }

  const container = block.closest('.jump-nav-container');
  if (container) {
    setupHeaderSync(container);
  }

  setupActiveStates(nav);
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
