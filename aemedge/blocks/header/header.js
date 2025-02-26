import { createElement } from '../../scripts/utils.js';
import { loadFragment } from '../fragment/fragment.js';

const BRAND_IMG = '<img loading="lazy" alt="Adobe" src="/blocks/nav/adobe-logo.svg">';
const IS_OPEN = 'is-open';

async function loadTabContent(fragmentPath) {
  try {
    return await loadFragment(fragmentPath);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Error loading fragment: ${fragmentPath}`, error);
    return null;
  }
}

class Nav {
  constructor(body, el) {
    this.el = el;
    this.body = body;
    this.env = {};
    this.desktop = window.matchMedia('(min-width: 1200px)');
  }

  init = async () => {
    this.state = {};
    this.curtain = createElement('div', { class: 'nav-curtain' });
    const nav = createElement('nav', { class: 'nav' });
    const fauxNavbar = createElement('div', { class: 'nav-faux-navbar' });

    const brand = this.decorateBrand();
    if (brand) {
      const fauxBrand = brand.cloneNode(true);
      fauxNavbar.append(fauxBrand);
      nav.append(brand);
    }

    const mobileToggle = this.decorateToggle(nav);
    const mobileCloseNav = this.decorateCloseNav(nav);
    this.curtain = this.decorateCurtain(nav);
    fauxNavbar.append(mobileToggle);
    nav.append(mobileCloseNav);

    const mainNav = await this.decorateMainNav();
    if (mainNav) {
      nav.append(mainNav);
    }

    const wrapper = createElement('div', { class: 'nav-wrapper' }, nav);
    this.el.append(this.curtain, fauxNavbar);
    this.el.append(this.curtain, wrapper);

    let prevWindowWidth = window.innerWidth;
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const windowWidth = window.innerWidth;
        const crossedBreakpointDown = (prevWindowWidth > 993 && windowWidth <= 992);
        const crossedBreakpointUp = (prevWindowWidth <= 992 && windowWidth > 993);
        if (crossedBreakpointDown) {
          const openMenu = document.querySelector('.has-menu.is-open');
          if (openMenu) {
            this.toggleMenu(openMenu);
          }
        }
        if (crossedBreakpointUp) {
          const openNavbar = document.querySelector('.nav.is-open');
          if (openNavbar) {
            this.closeNav(openNavbar);
          }
        }
        prevWindowWidth = windowWidth;
      }, 250);
    });

    let previousScrollPosition = window.scrollY;
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const currentScrollPosition = window.scrollY;
        if (currentScrollPosition > previousScrollPosition) {
          document.body.classList.add('scrolling-down');
        } else {
          document.body.classList.remove('scrolling-down');
        }
        previousScrollPosition = currentScrollPosition;
      }, 100);
    });
  };

  decorateToggle = (nav) => {
    const toggle = createElement('button', {
      class: 'icon-toggle nav-toggle',
      'aria-label': 'Navigation menu',
      'aria-expanded': false,
    });
    const onMediaChange = (e) => {
      if (e.matches) {
        nav.parentElement.classList.remove(IS_OPEN);
        nav.classList.remove(IS_OPEN);
        this.curtain.classList.remove(IS_OPEN);
      }
    };
    toggle.addEventListener('click', async () => {
      this.openNav(nav, onMediaChange);
    });
    return toggle;
  };

  decorateCloseNav = (nav) => {
    const closeNav = createElement('button', {
      class: 'icon-close nav-close',
      'aria-label': 'Navigation close menu',
      'aria-expanded': false,
    });
    closeNav.addEventListener('click', async () => {
      this.closeNav(nav);
    });
    return closeNav;
  };

  decorateCurtain = (nav) => {
    const curtain = createElement('div', { class: 'nav-curtain' });
    const desktop = window.matchMedia('(min-width: 993px)');
    if (desktop.matches) {
      curtain.addEventListener('click', async () => {
        this.toggleMenu(document.querySelector('.has-menu.is-open'));
      });
    }
    curtain.addEventListener('click', async () => {
      this.closeNav(nav);
    });
    return curtain;
  };

  decorateBrand = () => {
    const brandBlock = this.body.querySelector('[class^="nav-brand"]');
    if (!brandBlock) return null;
    const brand = brandBlock.querySelector('a');

    const { className } = brandBlock;
    const classNameClipped = className.slice(0, -1);
    const classNames = classNameClipped.split('--');
    brand.className = classNames.join(' ');
    if (brand.classList.contains('with-logo')) {
      brand.insertAdjacentHTML('afterbegin', BRAND_IMG);
    }
    return brand;
  };

  decorateMainNav = async () => {
    const mainNav = createElement('ul', { class: 'nav-main-nav' });
    const primaryLinks = this.body.querySelectorAll('.primary h2 > a');
    const secondaryLinks = this.body.querySelectorAll('.secondary h2 > a');

    await Promise.all([
      this.buildMainNav(mainNav, primaryLinks, 'primary'),
      this.buildMainNav(mainNav, secondaryLinks, 'secondary'),
    ]);

    return mainNav;
  };

  buildMainNav = async (mainNav, navLinks, menuType) => {
    const promises = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const [idx, navLink] of navLinks.entries()) {
      const navItem = createElement('li', { class: 'nav-nav-item' });
      const navItemMenuContainer = navLink.closest('div');
      const mainHomeContainer = navItemMenuContainer.nextElementSibling;
      const menu = mainHomeContainer.parentElement.nextElementSibling;
      navItemMenuContainer.querySelector('h2').remove();
      navItem.appendChild(navLink);
      navItem.classList.add(menuType);
      if (menu.childElementCount > 0) {
        const id = `nav-menu-${idx}`;
        menu.id = id;
        navItem.classList.add('has-menu');
        navLink.setAttribute('role', 'button');
        navLink.setAttribute('aria-expanded', false);
        navLink.setAttribute('aria-controls', id);
        mainHomeContainer.classList.add('main-home-link');
        promises.push(this.decorateMenu(navItem, navLink, menu, mainHomeContainer)
          .then((decoratedMenu) => {
            navItem.appendChild(decoratedMenu);
            return navItem;
          }));
      } else {
        promises.push(Promise.resolve(navItem));
      }
    }

    const resolvedNavItems = await Promise.all(promises);

    resolvedNavItems.forEach((navItem) => {
      mainNav.appendChild(navItem);
    });
  };

  buildSubNav = (menu, subNav, subNavLinks, subMenuType) => {
    const groupMap = new Map();
    subNavLinks.forEach((subNavLink, idx) => {
      const subNavItem = createElement('li', { class: 'nav-subnav-item' });
      const subNavItemLink = createElement('a', { class: 'nav-subnav-item-link' });
      const subMenu = subNavLink.parentElement.nextElementSibling.getElementsByTagName('li')[0].getElementsByTagName('ul')[0];
      subNavItemLink.appendChild(subNavLink.cloneNode(true));
      subNavItem.appendChild(subNavItemLink);
      subNavItem.classList.add(subMenuType);

      if (subMenu.childElementCount > 0) {
        const id = `nav-submenu-${idx}`;
        subMenu.id = id;
        subNavItem.classList.add('has-menu');
        subNavItemLink.setAttribute('role', 'button');
        subNavItemLink.setAttribute('aria-expanded', false);
        subNavItemLink.setAttribute('aria-controls', id);
        const decoratedMenu = this.decorateSubMenu(subNavItem, subNavItemLink, subMenu);
        subNavItem.appendChild(decoratedMenu);

        const parentDiv = subNavLink.closest('div');
        if (parentDiv && parentDiv.querySelector('ul + p em')) {
          const groupName = parentDiv.querySelector('ul + p em').textContent.trim();
          if (!groupMap.has(groupName)) {
            groupMap.set(groupName, createElement('div', { class: `nav-subnav-item-group-${groupName}` }));
            subNav.appendChild(groupMap.get(groupName));
          }
          groupMap.get(groupName).appendChild(subNavItem);
        } else {
          subNav.appendChild(subNavItem);
        }
      }
    });
  };

  // eslint-disable-next-line class-methods-use-this
  decoratePromoBox = async (menuPromo) => {
    const promoBox = createElement('div', { class: 'promo-box-subnav' });
    const fragmentPromises = [];

    if (menuPromo) {
      const fragmentPath = menuPromo.getAttribute('href');
      fragmentPromises.push(loadTabContent(fragmentPath)
        .then((fragment) => ({ fragment })));
    }

    const fragments = await Promise.all(fragmentPromises);
    fragments.forEach(({ fragment }) => {
      if (fragment) {
        promoBox.append(...fragment.children);
      }
    });

    return promoBox;
  };

  decorateMenu = async (navItem, navLink, menu, menuHomeLink) => {
    menu.className = 'nav-nav-item-menu';
    const menuPromo = menu.querySelector('div > a[href*="/fragment"]');
    const container = createElement('div', { class: 'nav-menu-container' });
    const subNav = createElement('ul', { class: 'nav-subnav' });
    const subMenuLi = menu.querySelectorAll('p em');
    const menuDivs = Array.from(menu.querySelectorAll('div'));
    const divsForMenu = menuDivs.filter((div) => div.querySelector('p'));
    const classColNumber = `sub-menu-col-${divsForMenu.length}`;
    if (subMenuLi.length > 0) {
      this.buildSubNav(menu, subNav, subMenuLi, 'sub-nav');
    }
    container.append(subNav);
    menu.innerHTML = '';
    const desktopMenuContainer = createElement('div', { class: 'item-menu-container' });
    const desktopMenuColumn = createElement('div', { class: 'item-menu-column' });
    desktopMenuContainer.classList.add(classColNumber);
    menu.append(desktopMenuContainer);
    desktopMenuContainer.append(desktopMenuColumn);
    desktopMenuColumn.append(menuHomeLink);
    desktopMenuColumn.append(container);

    const promoBox = await this.decoratePromoBox(menuPromo);
    desktopMenuContainer.append(promoBox);

    navLink.addEventListener('focus', () => {
      window.addEventListener('keydown', this.toggleOnSpace);
    });
    navLink.addEventListener('blur', () => {
      window.removeEventListener('keydown', this.toggleOnSpace);
    });
    navLink.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleMenu(navItem);
    });
    return menu;
  };

  decorateSubMenu = (subNavItem, subNavLink, subMenu) => {
    subMenu.className = 'nav-nav-item-submenu';
    subNavLink.addEventListener('focus', () => {
      window.addEventListener('keydown', this.toggleOnSpace);
    });
    subNavLink.addEventListener('blur', () => {
      window.removeEventListener('keydown', this.toggleOnSpace);
    });
    subNavLink.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleMenu(subNavItem);
    });
    return subMenu;
  };

  openNav = (nav, onMediaChange) => {
    nav.parentElement.classList.add(IS_OPEN);
    nav.classList.add(IS_OPEN);
    this.desktop.addEventListener('change', onMediaChange);
    this.curtain.classList.add(IS_OPEN);
  };

  closeNav = (nav) => {
    if (nav.classList.contains(IS_OPEN)) {
      nav.parentElement.classList.remove(IS_OPEN);
      nav.classList.remove(IS_OPEN);
      this.curtain.classList.remove(IS_OPEN);
      const allElOpen = nav.querySelectorAll('.is-open');
      // eslint-disable-next-line no-plusplus
      for (let i = 0; i < allElOpen.length; i++) {
        this.closeMenu(allElOpen[i]);
      }
    }
  };

  toggleMenu = (el) => {
    const desktop = window.matchMedia('(min-width: 993px)');
    if (desktop.matches) {
      const elSiblings = Array.from(el.parentNode.children);
      elSiblings.forEach((sibling) => {
        if (sibling.classList.contains('is-open') && sibling !== el) {
          this.closeMenu(sibling);
        }
      });
    }
    if (el && el.classList.contains('is-open')) {
      this.closeMenu(el);
    } else {
      this.openMenu(el);
    }
  };

  closeMenu = (el) => {
    el.classList.remove(IS_OPEN);
    this.curtain.classList.remove(IS_OPEN);
    document.body.classList.remove('curtain-visible');
    document.removeEventListener('click', this.closeOnDocClick);
    window.removeEventListener('keydown', this.closeOnEscape);
    const menuToggle = el.querySelector('[aria-expanded]');
    menuToggle.setAttribute('aria-expanded', false);
  };

  openMenu = (el) => {
    el.classList.add(IS_OPEN);
    this.curtain.classList.add(IS_OPEN);
    document.body.classList.add('curtain-visible');
    const menuToggle = el.querySelector('[aria-expanded]');
    menuToggle.setAttribute('aria-expanded', true);
    document.addEventListener('click', this.closeOnDocClick);
    window.addEventListener('keydown', this.closeOnEscape);
  };

  toggleOnSpace = (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      const parentEl = e.target.closest('.has-menu');
      this.toggleMenu(parentEl);
    }
  };

  closeOnEscape = (e) => {
    if (e.code === 'Escape') {
      this.toggleMenu(document.querySelector('.has-menu.is-open'));
    }
  };
}

async function fetchNav(url) {
  const resp = await fetch(`${url}.plain.html`);
  const html = await resp.text();
  return html;
}

export default async function init(blockEl) {
  const url = blockEl.getAttribute('data-nav-source') || '/nav';
  if (url) {
    const html = await fetchNav(url);
    if (html) {
      try {
        const parser = new DOMParser();
        const navDoc = parser.parseFromString(html, 'text/html');
        const nav = new Nav(navDoc.body, blockEl);
        nav.init();
      } catch {
        // eslint-disable-next-line no-console
        console.log('Could not create global navigation.');
      }
    }
  }
}
