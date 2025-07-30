import { getMetadata } from '../../scripts/aem.js';
import { createElement, i18n, setupDayjsLibs } from '../../scripts/utils.js';
import { loadFragment } from '../fragment/fragment.js';
import { store } from '../../scripts/store/store.js';
import { authentication as authStatus } from '../../scripts/modules/index.js';
import { renderSearch } from './search/search.js';

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

async function getLogoSVG() {
  const answer = await fetch('/aemedge/icons/cme-logo.svg');
  const svgContent = await answer.text();
  const logoContainer = createElement('div', { class: 'site-header-logo' });
  if (logoContainer) {
    logoContainer.innerHTML = svgContent;
  }
  return logoContainer;
}

class Nav {
  constructor(body, el) {
    this.el = el;
    this.body = body;
    this.env = {};
    this.desktop = window.matchMedia('(min-width: 75rem)');
    this.login = this.body.querySelector('.login');
    this.login.classList.remove('header');
    this.login.classList.add('menu');
    this.navOverlay = createElement('div', { class: 'nav-overlay' });
    this.searchOverlay = createElement('div', { class: 'search-overlay' });
    this.searchDrawer = createElement('div', { class: 'search-panel' });
    this.searchDrawerCloseBtn = createElement('button', {
      class: 'btn-search-panel-close',
      'aria-label': 'Close search',
    });
    this.nav = createElement('nav', { class: 'nav' });
    this.navDesktopRight = createElement('div', { class: 'nav-desktop-right' });
    this.mobileRightSide = createElement('div', { class: 'site-header-right' });
    this.utilities = createElement('div', { class: 'utilities' });
    this.searchBtn = this.decorateSearchNav();
    this.searchBtnMobile = this.decorateSearchNav();
    this.searchBtnMobileInNav = this.decorateSearchNav();
    this.navLoginBtn = createElement('button', { class: 'nav-login secondary' });
    this.mobileNavbar = createElement('div', { class: 'site-header-mobile-bar' });
    this.wrapper = createElement('div', { class: 'nav-wrapper' }, this.nav);
    this.userBtnDesktopContainer = createElement('div', { class: 'user-menu' });
    this.welcomeMessageDesktop = createElement('p');
    this.innerContentDesktop = '';
    this.innerContentMobile = '';
    this.innerContainerDesktop = createElement('div', { class: 'submenu' });
    this.navLogoutBtn = createElement('button', { class: 'nav-logout secondary' });
    this.navItemMobile = createElement('li', { class: 'navigation-item has-menu' });
    this.navItemMobileAnchor = createElement('a');
    this.innerContainerMobile = createElement('div', { class: 'submenu' });
    this.navLogoutBtnMobile = createElement('button', { class: 'nav-logout secondary' });
    this.loggedIn = false;
    this.loginInfo = {};

    store.subscribe(({ authentication }) => authentication, ({ isLoggedIn, loginInfo }) => {
      if (isLoggedIn !== this.loggedIn) {
        this.loggedIn = isLoggedIn;
        this.loginInfo = loginInfo;
        this.updateNavState();
      }
    });
  }

  async updateNavState() {
    this.logBtnToRightSide();
    this.logDesktopGreeting();
    this.logInnerContentDesktop();
    this.logOutBtnToContDesktop();
    this.logMobileGreeting();
    this.logInnerContentMobile();
    this.logOutBtnToContMobile();
  }

  init = async () => {
    await this.initializeLabels();
    this.checkPage();
    const cmeLogo = await getLogoSVG();
    const header = document.querySelector('.header.block');
    const isHomePage = header?.classList.contains('home');
    let previousScrollPosition = window.scrollY;
    let scrollTimeout;
    let prevWindowWidth = window.innerWidth;
    let resizeTimeout;

    if (cmeLogo) {
      const fauxBrand = cmeLogo.cloneNode(true);
      this.mobileNavbar.append(fauxBrand);
      this.nav.append(cmeLogo);
    }

    const mobileToggle = this.decorateToggle(this.nav);
    const mobileCloseNav = this.decorateCloseNav(this.nav);
    this.navOverlay = this.decorateCurtain(this.nav);

    this.mobileRightSide.append(this.searchBtnMobile);
    this.mobileRightSide.append(mobileToggle);
    this.mobileNavbar.append(this.mobileRightSide);
    const mobileRightSideInNav = createElement('div', { class: 'mobile-right-side-in-nav' });
    mobileRightSideInNav.append(this.searchBtnMobileInNav);
    mobileRightSideInNav.append(mobileCloseNav);
    this.nav.append(mobileRightSideInNav);

    const mainNav = await this.decorateMainNav();
    if (mainNav) {
      this.nav.append(mainNav);
    }

    this.navDesktopRight.append(this.utilities);
    this.utilities.append(this.searchBtn);

    const userBtn = await this.buildLoginDesktopNav();
    if (userBtn) {
      this.utilities.append(userBtn);
    }

    this.navLoginBtn.innerHTML = this.loginLabel;
    this.navLoginBtn.addEventListener('click', async () => {
      authStatus.login();
    });
    this.logBtnToRightSide();
    this.wrapper.append(this.navDesktopRight);

    this.el.append(this.navOverlay, this.mobileNavbar);
    this.el.append(this.navOverlay, this.wrapper);

    this.searchOverlay.addEventListener('click', async () => {
      this.closeSearchDrawer();
    });

    this.searchDrawerCloseBtn.addEventListener('click', async () => {
      this.closeSearchDrawer();
    });
    this.searchDrawer.append(this.searchDrawerCloseBtn);

    this.el.append(this.searchOverlay);
    this.el.append(this.searchDrawer);

    const baseLogo = document.querySelectorAll('.site-header-logo');
    let logoContainer;

    function updateLogoReferences() {
      const isDesktop = window.matchMedia('(min-width: 993px)').matches;
      logoContainer = baseLogo[isDesktop ? 1 : 0];
    }

    updateLogoReferences();

    function updateHeaderState() {
      const currentScrollPosition = window.scrollY;
      const scrollingDown = currentScrollPosition > previousScrollPosition;
      if (scrollingDown) {
        if (isHomePage) {
          header.classList.remove('transparent');
          logoContainer.classList.remove('logo-white');
        } else if (!header.classList.contains('hidden')) {
          document.body.classList.add('scrolling-down');
          header.classList.add('hidden');
        }
      } else if (!isHomePage && header.classList.contains('hidden')) {
        document.body.classList.remove('scrolling-down');
        header.classList.remove('hidden');
      } else if (isHomePage) {
        header.classList.toggle('transparent', currentScrollPosition === 0);
        logoContainer.classList.toggle('logo-white', currentScrollPosition === 0);
      }
      previousScrollPosition = currentScrollPosition;
    }

    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const windowWidth = window.innerWidth;
        const crossedBreakpointDown = (prevWindowWidth > 993 && windowWidth <= 992);
        const crossedBreakpointUp = (prevWindowWidth <= 992 && windowWidth > 993);
        updateLogoReferences();
        updateHeaderState();
        if (crossedBreakpointDown) {
          const openMenu = document.querySelector('.is-open');
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

    if (isHomePage && previousScrollPosition === 0) {
      header.classList.add('transparent');
      logoContainer.classList.add('logo-white');
    }

    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(updateHeaderState, 100);
    });

    this.el.querySelectorAll('a').forEach((a) => {
      const href = a.getAttribute('href');
      if (href) {
        const isExternal = !href.startsWith('/') && !href.startsWith('#');
        const isCMEPage = href.includes('www.cmegroup.com');
        const isLogin = href.includes('https://login.cmegroup.com');
        const isCMEDirect = href.includes('https://cmedirect.cmegroup.com');
        if (isExternal && !isCMEPage && !isLogin && !isCMEDirect) {
          a.setAttribute('target', '_blank');
        }
      }
    });
  };

  async initializeLabels() {
    const [welcomeLabel, loginLabel, logoutLabel, loginAccount, createAccount] = await Promise.all([
      i18n('Welcome'),
      i18n('LOG IN'),
      i18n('LOG OUT'),
      i18n('Login to your account'),
      i18n('Create an Account'),
    ]);

    this.welcomeLabel = welcomeLabel;
    this.loginLabel = loginLabel;
    this.logoutLabel = logoutLabel;
    this.loginAccount = loginAccount;
    this.createAccount = createAccount;
  }

  logBtnToRightSide = () => {
    if (!this.loggedIn) {
      this.navDesktopRight.append(this.navLoginBtn);
    } else if (this.navDesktopRight.contains(this.navLoginBtn)) {
      this.navLoginBtn.remove();
    }
  };

  logDesktopGreeting = () => {
    if (this.loggedIn) {
      this.userBtnDesktopContainer.classList.add('is-logged');
      if (this.loginInfo.userName) {
        const indexName = this.loginInfo.userName.indexOf(' ');
        const userFirstName = this.loginInfo.userName.substring(0, indexName);
        this.welcomeMessageDesktop.innerHTML = `${this.welcomeLabel}, ${userFirstName}`;
      }
    } else {
      this.userBtnDesktopContainer.classList.remove('is-logged');
    }
  };

  logInnerContentDesktop = () => {
    this.innerContainerDesktop.replaceChildren();

    if (this.loggedIn) {
      this.innerContainerDesktop.appendChild(this.welcomeMessageDesktop);
      this.innerContentDesktop = this.login?.cloneNode(true);
      const innerDiv = this.innerContentDesktop.querySelector('div');
      innerDiv?.classList.add('login-container');
      const targetDivs = innerDiv?.children;
      if (targetDivs) {
        Array.from(targetDivs).forEach((child) => {
          child.classList.add('user-container');
        });
      }
    } else {
      this.innerContentDesktop = this.createNoLoggedInItems(this.login?.cloneNode(true));
    }

    this.innerContainerDesktop.appendChild(this.innerContentDesktop);
  };

  logOutBtnToContDesktop = () => {
    if (this.loggedIn) {
      this.innerContainerDesktop.appendChild(this.navLogoutBtn);
    } else if (this.innerContainerDesktop.contains(this.navLogoutBtn)) {
      this.navLogoutBtn.remove();
    }
  };

  logMobileGreeting = () => {
    if (this.loggedIn) {
      if (this.loginInfo.userName) {
        this.navItemMobile.classList.add('is-logged');
        const indexName = this.loginInfo.userName.indexOf(' ');
        const userFirstName = this.loginInfo.userName.substring(0, indexName);
        this.navItemMobileAnchor.innerHTML = `${this.welcomeLabel}, ${userFirstName}`;
      }
    } else {
      this.navItemMobile.classList.remove('is-logged');
      this.navItemMobileAnchor.innerHTML = this.loginLabel;
    }
  };

  logInnerContentMobile = () => {
    this.innerContainerMobile.replaceChildren();

    if (this.loggedIn) {
      this.innerContentMobile = this.login?.cloneNode(true);
      const innerDiv = this.innerContentMobile.querySelector('div');
      innerDiv.classList.add('login-container');
      const targetDivs = innerDiv.children;

      Array.from(targetDivs.children).forEach((child) => {
        child.classList.add('user-container');
      });
    } else {
      this.innerContentMobile = this.createNoLoggedInItems(this.login?.cloneNode(true), true);
    }

    this.innerContainerMobile.appendChild(this.innerContentMobile);
  };

  logOutBtnToContMobile = () => {
    const innerDiv = this.innerContentMobile.querySelector('div');
    if (this.loggedIn) {
      innerDiv.appendChild(this.navLogoutBtnMobile);
    } else if (innerDiv.contains(this.navLogoutBtnMobile)) {
      this.navLogoutBtnMobile.remove();
    }
  };

  decorateToggle = (nav) => {
    const toggle = createElement('button', {
      class: 'btn-menu-toggle',
      'aria-label': 'Navigation menu',
      'aria-expanded': false,
    });
    const onMediaChange = (e) => {
      if (e.matches) {
        nav.parentElement.classList.remove(IS_OPEN);
        nav.classList.remove(IS_OPEN);
        this.navOverlay.classList.remove(IS_OPEN);
      }
    };
    toggle.addEventListener('click', async () => {
      this.openNav(nav, onMediaChange);
    });
    return toggle;
  };

  decorateCloseNav = (nav) => {
    const closeNav = createElement('button', {
      class: 'btn-menu-close icon-close',
      'aria-label': 'Navigation close menu',
      'aria-expanded': false,
    });
    closeNav.addEventListener('click', async () => {
      this.closeNav(nav);
    });
    return closeNav;
  };

  // eslint-disable-next-line class-methods-use-this
  decorateSearchNav = () => {
    const searchBtn = createElement('button', {
      class: 'btn-search',
      'aria-label': 'Open search',
    });
    searchBtn.addEventListener('click', async () => {
      await setupDayjsLibs();
      this.openSearchDrawer();
    });
    return searchBtn;
  };

  decorateCurtain = (nav) => {
    const curtain = createElement('div', { class: 'nav-overlay' });
    const desktop = window.matchMedia('(min-width: 993px)');
    if (desktop.matches) {
      curtain.addEventListener('click', async () => {
        this.toggleMenu(document.querySelector('.is-open'));
      });
    }
    curtain.addEventListener('click', async () => {
      this.closeNav(nav);
    });
    return curtain;
  };

  // eslint-disable-next-line class-methods-use-this
  checkPage = () => {
    const navStyleMeta = getMetadata('nav-style');
    if (navStyleMeta === 'home') {
      const navTest = document.querySelector('.header.block');
      navTest.classList.add(navStyleMeta);
    }
  };

  decorateMainNav = async () => {
    const mainNav = createElement('ul', { class: 'navigation' });
    const primaryLinks = this.body.querySelectorAll('.primary h2 > a');
    const secondaryLinks = this.body.querySelectorAll('.secondary h2 > a');

    await Promise.all([
      this.buildLoginMobileNav(mainNav, 'login-nav'),
      this.buildMainNav(mainNav, primaryLinks, 'primary'),
      this.buildMainNav(mainNav, secondaryLinks, 'secondary'),
    ]);

    return mainNav;
  };

  // eslint-disable-next-line class-methods-use-this
  createNoLoggedInItems = (cloneNode, mobileVersion) => {
    const elementToRemove = cloneNode.querySelector('ul')?.parentElement;
    if (elementToRemove) {
      elementToRemove.remove();
    }
    const logContainer = createElement('div', { class: 'menu login' });
    const logContainerInner = createElement('div', { class: 'login-container' });
    const accountContainer = createElement('div', { class: 'account-container' });
    const ul = createElement('ul');
    const logLi = createElement('li');
    const regLi = createElement('li');

    const logLink = createElement('a');
    logLink.innerHTML = this.loginAccount;
    logLink.href = '#';
    logLink.setAttribute('role', 'button');
    logLink.addEventListener('click', async () => {
      authStatus.login();
    });
    const regLink = createElement('a');
    regLink.innerHTML = this.createAccount;
    regLink.href = '#';
    regLink.setAttribute('role', 'button');
    regLink.addEventListener('click', async () => {
      authStatus.registration();
    });
    if (mobileVersion) {
      logLi.appendChild(logLink);
      ul.appendChild(logLi);
    }
    regLi.appendChild(regLink);
    ul.appendChild(regLi);
    accountContainer.appendChild(ul);

    logContainerInner.appendChild(accountContainer);
    logContainerInner.appendChild(this.orderLoginList(cloneNode));
    logContainer.appendChild(logContainerInner);

    return logContainer;
  };

  buildLoginDesktopNav = async () => {
    const loginUserBtn = createElement('button', {
      class: 'btn-user-menu-toggle',
      'aria-label': 'User account menu',
    });
    this.logDesktopGreeting();
    loginUserBtn.setAttribute('aria-expanded', false);
    loginUserBtn.setAttribute('aria-controls', 'login-nav-menu-0');
    loginUserBtn.addEventListener('focus', () => {
      window.addEventListener('keydown', this.toggleOnSpace);
    });
    loginUserBtn.addEventListener('blur', () => {
      window.removeEventListener('keydown', this.toggleOnSpace);
    });
    loginUserBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleMenu(this.userBtnDesktopContainer);
    });
    this.navLogoutBtn.innerHTML = this.logoutLabel;
    this.navLogoutBtn.addEventListener('click', async () => {
      authStatus.logout();
    });
    this.logInnerContentDesktop();
    this.logOutBtnToContDesktop();
    this.userBtnDesktopContainer.append(loginUserBtn);
    this.userBtnDesktopContainer.appendChild(this.innerContainerDesktop);

    return this.userBtnDesktopContainer;
  };

  // eslint-disable-next-line class-methods-use-this
  orderLoginList = (cloneNode) => {
    const linksContainer = createElement('div', { class: 'links-container' });
    const linksUl = createElement('ul');
    const listItems = Array.from(cloneNode.querySelectorAll('li'));

    const desiredOrder = [
      'Watchlists',
      'CME Customer Center',
      'CME Direct',
      'Subscription Center',
    ];

    function getIndex(text) {
      return desiredOrder.findIndex((item) => text.includes(item));
    }

    listItems.sort((a, b) => {
      const textA = a.textContent.trim();
      const textB = b.textContent.trim();
      return getIndex(textA) - getIndex(textB);
    });

    listItems.forEach((item) => linksUl.appendChild(item));
    linksContainer.appendChild(linksUl);

    return linksContainer;
  };

  buildLoginMobileNav = async (
    mainNavMobile,
    menuType,
  ) => {
    this.logMobileGreeting();
    this.navItemMobileAnchor.href = '#';
    this.navItemMobileAnchor.setAttribute('role', 'button');
    this.navItemMobileAnchor.classList.add('login-navigation-link');
    this.navItemMobileAnchor.setAttribute('aria-expanded', false);
    this.navItemMobileAnchor.setAttribute('aria-controls', 'login-nav-menu-0');
    this.navItemMobileAnchor.addEventListener('focus', () => {
      window.addEventListener('keydown', this.toggleOnSpace);
    });
    this.navItemMobileAnchor.addEventListener('blur', () => {
      window.removeEventListener('keydown', this.toggleOnSpace);
    });
    this.navItemMobileAnchor.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleMenu(this.navItemMobile);
    });
    this.navItemMobile.appendChild(this.navItemMobileAnchor);
    this.navItemMobile.classList.add(menuType);
    this.navLogoutBtnMobile.innerHTML = this.logoutLabel;
    this.navLogoutBtnMobile.addEventListener('click', async () => {
      authStatus.logout();
    });
    this.logInnerContentMobile();
    this.logOutBtnToContMobile();
    this.navItemMobile.appendChild(this.innerContainerMobile);
    mainNavMobile.appendChild(this.navItemMobile);
  };

  buildMainNav = async (mainNav, navLinks, menuType) => {
    const promises = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const [idx, navLink] of navLinks.entries()) {
      const navItem = createElement('li', { class: 'navigation-item' });
      const navItemMenuContainer = navLink.closest('div');
      const mainHomeContainer = navItemMenuContainer.nextElementSibling;
      const menu = mainHomeContainer.parentElement.nextElementSibling;
      navItemMenuContainer.querySelector('h2').remove();
      navItem.appendChild(navLink);
      navItem.classList.add(menuType);
      navLink.classList.add('navigation-link');
      if (menu.childElementCount > 0) {
        const id = `nav-menu-${idx}`;
        menu.id = id;
        navItem.classList.add('has-menu');
        navLink.setAttribute('role', 'button');
        navLink.setAttribute('aria-expanded', false);
        navLink.setAttribute('aria-controls', id);
        mainHomeContainer.classList.add('submenu-home-link');
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

  buildSubNav = (menu, subNav, subNavLinks, subMenuType, totalCol) => {
    const groupMap = new Map();
    subNavLinks.forEach((subNavLink, idx) => {
      const subNavItem = createElement('li', { class: 'submenu-item' });
      const subNavItemLink = createElement('a', { class: 'submenu-link' });
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
            groupMap.set(groupName, createElement('div'));
            subNav.appendChild(groupMap.get(groupName));
          }
          groupMap.get(groupName).classList.add('sub-section');
          groupMap.get(groupName).style.setProperty('--cols', totalCol);
          groupMap.get(groupName).appendChild(subNavItem);
        } else {
          subNavItem.classList.add('sub-section');
          subNavItem.style.setProperty('--cols', totalCol);
          subNav.appendChild(subNavItem);
        }
      }
    });
  };

  getPromoBox = async (menuPromo, desktopMenuContainer) => {
    const spinnerInNavbar = createElement('div', { class: 'lds-ring spinner-in-navbar' });
    spinnerInNavbar.innerHTML = `
      <div></div>
      <div></div>
      <div></div>
      <div></div>
    `;

    desktopMenuContainer.append(spinnerInNavbar);
    const promoBox = await this.decoratePromoBox(menuPromo);
    spinnerInNavbar.remove();
    desktopMenuContainer.append(promoBox);
  };

  // eslint-disable-next-line class-methods-use-this
  decoratePromoBox = async (menuPromo) => {
    const promoBox = createElement('div', { class: 'promo-box-column' });
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
    menu.className = 'submenu';
    const menuPromo = menu.querySelector('div > a[href*="/fragment"]');
    const subNav = createElement('ul', { class: 'submenu-list' });
    const subMenuLi = menu.querySelectorAll('p em');
    const columnsNotPromo = menu.querySelectorAll('div:not(:has(> a))').length;
    if (subMenuLi.length > 0) {
      this.buildSubNav(menu, subNav, subMenuLi, 'sub-nav', columnsNotPromo);
    }
    menu.innerHTML = '';
    const desktopMenuContainer = createElement('div', { class: 'submenu-container' });
    const desktopMenuColumn = createElement('div', { class: 'submenu-column' });
    menu.append(desktopMenuContainer);
    desktopMenuContainer.append(desktopMenuColumn);
    desktopMenuColumn.append(menuHomeLink);
    desktopMenuColumn.append(subNav);

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
      if (!desktopMenuContainer.querySelectorAll('.promo-box-column').length > 0) {
        this.getPromoBox(menuPromo, desktopMenuContainer);
      }
    });
    return menu;
  };

  decorateSubMenu = (subNavItem, subNavLink, subMenu) => {
    subMenu.className = 'submenu-content';
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

    const linksInNav = subMenu.querySelectorAll('li a');
    linksInNav.forEach((link) => {
      link.addEventListener('click', () => {
        this.closeNav(this.nav);
      });
    });

    return subMenu;
  };

  openNav = (nav, onMediaChange) => {
    nav.parentElement.classList.add(IS_OPEN);
    nav.classList.add(IS_OPEN);
    nav.classList.add(IS_OPEN);
    this.desktop.addEventListener('change', onMediaChange);
    this.navOverlay.classList.add(IS_OPEN);
  };

  closeNav = (nav) => {
    const allElOpen = nav.querySelectorAll(`.${IS_OPEN}`);
    if (nav.classList.contains(IS_OPEN)) {
      nav.parentElement.classList.remove(IS_OPEN);
      nav.classList.remove(IS_OPEN);
      this.navOverlay.classList.remove(IS_OPEN);
    }
    allElOpen.forEach((element) => this.closeMenu(element));
  };

  toggleMenu = (el) => {
    const desktop = window.matchMedia('(min-width: 993px)');
    if (desktop.matches) {
      const leftElements = document.querySelector('.navigation');
      const childLeftElements = Array.from(leftElements.children);
      const userMenu = document.querySelector('.user-menu');
      const allElements = [...childLeftElements, ...(userMenu ? [userMenu] : [])];
      allElements.forEach((sibling) => {
        if (sibling.classList.contains('is-open') && sibling !== el) {
          this.closeMenu(sibling);
        }
      });
    }
    if (el && el.classList.contains('is-open')) {
      this.closeMenu(el);
    } else if (!el.classList.contains('nav-overlay')) {
      this.openMenu(el);
    }
  };

  closeMenu = (el) => {
    el.classList.remove(IS_OPEN);
    this.navOverlay.classList.remove(IS_OPEN);
    this.navOverlay.style.backgroundColor = '';
    document.body.classList.remove('curtain-visible');
    document.removeEventListener('click', this.closeOnDocClick);
    window.removeEventListener('keydown', this.closeOnEscape);
    const menuToggle = document.querySelector('[aria-expanded="true"]');
    menuToggle.setAttribute('aria-expanded', false);
    menuToggle.parentElement.classList.remove(IS_OPEN);
  };

  openMenu = (el) => {
    el.classList.add(IS_OPEN);
    if (el.classList.contains('user-menu')) {
      this.navOverlay.style.backgroundColor = 'transparent';
    }
    this.navOverlay.classList.add(IS_OPEN);
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
      this.toggleMenu(document.querySelector('.is-open'));
    }
  };

  openSearchDrawer = () => {
    document.body.classList.add('curtain-visible');
    this.searchOverlay.classList.add(IS_OPEN);
    this.searchDrawer.classList.add(IS_OPEN);
    const searchComponent = renderSearch();
    this.searchDrawer.append(searchComponent);
  };

  closeSearchDrawer = () => {
    document.body.classList.remove('curtain-visible');
    this.searchOverlay.classList.remove(IS_OPEN);
    this.searchDrawer.classList.remove(IS_OPEN);
  };
}

async function fetchNav(url) {
  const resp = await fetch(`${url}.plain.html`);
  const html = await resp.text();
  return html;
}

export default async function init(blockEl) {
  const navMeta = getMetadata('nav');
  const url = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
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
