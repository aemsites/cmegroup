import { getMetadata } from '../../scripts/aem.js';
import { authentication } from '../../scripts/modules/Authentication.js';
import { apiPost, getResponseData } from '../../scripts/utils/index.js';
import {
  createElement,
  i18n,
  getArticleRelatedMetadata,
  parseTime,
  getReadTimeLabel,
  getReadTimeIcon,
  setupDayjsLibs,
  getCdtDate,
  showTooltip,
} from '../../scripts/utils.js';
import { createModal } from '../../blocks/modal/modal.js';

async function saveArticle() {
  try {
    const serviceUrl = '/services/bookmarks/save';
    const response = await apiPost(serviceUrl);
    return getResponseData(response);
  } catch (e) {
    return null;
  }
}

async function removeArticle() {
  try {
    const serviceUrl = '/services/bookmarks/remove';
    const response = await apiPost(serviceUrl);
    return getResponseData(response);
  } catch (e) {
    return null;
  }
}

async function hasArticle() {
  try {
    const serviceUrl = '/services/bookmarks/hasArticle';
    const response = await apiPost(serviceUrl);
    return getResponseData(response);
  } catch (e) {
    return [];
  }
}

function showSaveIcon(saveIcons, enable) {
  saveIcons.forEach((saveIcon) => {
    if ((enable && saveIcon.classList.contains('icon-bookmark-outlined'))
      || (!enable && saveIcon.classList.contains('icon-bookmark-filled'))) {
      saveIcon.classList.add('show');
    } else {
      saveIcon.classList.remove('show');
    }
  });
}

let enableFunc;
let disableFunc;
function toggleSaveIcon(bookmark, saveIcons, enable) {
  if (enable) {
    enableFunc = () => {
      showSaveIcon(saveIcons, false);
    };
    disableFunc = () => {
      showSaveIcon(saveIcons, true);
    };
    bookmark.addEventListener('mouseenter', enableFunc);
    bookmark.addEventListener('mouseleave', disableFunc);
  } else {
    if (enableFunc) {
      bookmark.removeEventListener('mouseenter', enableFunc);
    }
    if (disableFunc) {
      bookmark.removeEventListener('mouseleave', disableFunc);
    }
  }
}

async function showBookmarkTooltip(parent) {
  const [
    savedToLabel,
    bookmarksLabel,
  ] = await Promise.all([
    i18n('Saved to'),
    i18n('Bookmarks'),
  ]);
  const checkIcon = createElement('img', {
    src: '/aemedge/icons/check.svg',
    alt: 'Saved',
    loading: 'eager',
  });
  const checkIconSpan = createElement('span', { class: 'icon check' }, checkIcon);
  const bookmarks = createElement('a', { href: '/my-profile.html#tab=bookmarks' }, bookmarksLabel);
  const tooltipContent = createElement('span', null, checkIconSpan, `${savedToLabel}`, bookmarks);
  showTooltip(parent, tooltipContent, 5000);
}

async function createAuthModal() {
  const [
    title,
    loginLabel,
    orLabel,
    accountLabel,
    bookmarkText,
  ] = await Promise.all([
    i18n('CME Group Login'),
    i18n('Login'),
    i18n('or'),
    i18n('create an account'),
    i18n('to bookmark content on cmegroup.com'),
  ]);
  const iconLock = createElement('img', {
    src: '/aemedge/icons/lock.svg',
    alt: 'Lock Icon',
    loading: 'eager',
  });
  const iconLockSpan = createElement('span', { class: 'icon icon-lock' }, iconLock);
  const modalTitle = createElement('h5', { class: 'modal-title' }, title);
  const modalHeader = createElement('div', { class: 'modal-header' }, iconLockSpan, modalTitle);
  const login = createElement('span', { class: 'login-handler' }, loginLabel);
  login.addEventListener('click', async () => {
    authentication.login();
  });
  const account = createElement('span', { class: 'registration-handler' }, accountLabel);
  account.addEventListener('click', async () => {
    authentication.registration();
  });
  const modalBody = createElement('div', { class: 'modal-body' }, login, ` ${orLabel} `, account, ` ${bookmarkText}`);
  const modal = await createModal([modalHeader, modalBody]);
  modal.block?.classList.add('article-auth-modal');
  return modal;
}

async function buildBookmark(bookmark, bookmarkIcons, saveText) {
  const [
    saveLabel,
    savedLabel,
  ] = await Promise.all([
    i18n('Save'),
    i18n('Saved'),
  ]);
  const { authenticationData } = authentication;
  authenticationData.loginPromise.then(async () => {
    const saveIcons = bookmark.querySelectorAll('.icon');
    let savedArticle = false;
    const isSavePending = localStorage.getItem('save-article-pending') === 'true';
    if (authenticationData.isLoggedIn && isSavePending) {
      const saveResponse = await saveArticle();
      if (saveResponse) {
        savedArticle = true;
        saveText.textContent = savedLabel;
        showBookmarkTooltip(bookmarkIcons);
        showSaveIcon(saveIcons, !savedArticle);
        toggleSaveIcon(bookmark, saveIcons, !savedArticle);
      }
      localStorage.removeItem('save-article-pending');
    }
    if (authenticationData.isLoggedIn) {
      if (!savedArticle) {
        const response = await hasArticle();
        if (response) {
          const [userHasArticle] = response;
          if (userHasArticle) {
            savedArticle = true;
            saveText.textContent = savedLabel;
            showSaveIcon(saveIcons, false);
          }
        }
      }
      bookmark.addEventListener('click', async (e) => {
        if (e.target.closest('.tooltip')) {
          return;
        }
        if (savedArticle) {
          const removeResponse = await removeArticle();
          if (removeResponse) {
            savedArticle = false;
            saveText.textContent = saveLabel;
          }
        } else {
          const saveResponse = await saveArticle();
          if (saveResponse) {
            savedArticle = true;
            saveText.textContent = savedLabel;
            showBookmarkTooltip(bookmarkIcons);
          }
        }
        showSaveIcon(saveIcons, !savedArticle);
        toggleSaveIcon(bookmark, saveIcons, !savedArticle);
      });
    } else {
      bookmark.addEventListener('click', async () => {
        localStorage.setItem('save-article-pending', 'true');
        const { showModal } = await createAuthModal();
        showModal();
      });
    }
    if (!savedArticle) {
      showSaveIcon(saveIcons, true);
      toggleSaveIcon(bookmark, saveIcons, true);
    }
  });
}

function renderAuthors(authorsData, container, byLabel) {
  container.innerHTML = '';
  const authorList = authorsData.map((author) => {
    if (author.path) {
      const link = document.createElement('a');
      link.href = author.path;
      link.textContent = author.title;
      return link.outerHTML;
    }
    return author.title;
  });

  // Format authors with proper conjunction using browser's Intl.ListFormat
  const locale = getMetadata('locale') || 'en';
  const authorsString = new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(authorList);

  container.innerHTML = `${byLabel} ${authorsString}`;
}

async function decorateArticleHero(main) {
  const subTemplates = getMetadata('sub-template')?.split(' ');
  const readTime = getMetadata('read-time');

  // Static section
  const heroSection = main.querySelector('.section:first-of-type');
  heroSection.classList.add('hero', ...subTemplates);
  const contentArea = createElement('span', { class: 'content-area' });
  const shadow = createElement('span', { class: 'shadow' });
  const fade = createElement('span', { class: 'fade' });
  const shadowWrapper = createElement('span', { class: 'shadow-wrapper' }, contentArea, shadow, fade);
  const picture = heroSection.querySelector('picture');
  picture.closest('div').classList.add('background-image');
  picture.closest('p').append(shadowWrapper);

  const readIconSpan = readTime ? getReadTimeIcon(subTemplates) : null;
  const articleTime = createElement('span', { class: 'article-time' }, readIconSpan);
  const featuredTag = createElement('span', { class: 'featured-tag' });
  const saveIconOutlined = createElement('img', {
    src: '/aemedge/icons/bookmark-outlined.svg',
    alt: 'Bookmark Icon',
    loading: 'eager',
  });
  const saveIconOutlinedSpan = createElement('span', { class: 'show icon icon-bookmark-outlined' }, saveIconOutlined);
  const saveIconFilled = createElement('img', {
    src: '/aemedge/icons/bookmark-filled.svg',
    alt: 'Bookmark Icon',
    loading: 'lazy',
  });
  const saveIconFilledSpan = createElement('span', { class: 'icon icon-bookmark-filled' }, saveIconFilled);
  const saveText = createElement('span', { class: 'save-text' });
  const bookmarkIcons = createElement('span', { class: 'bookmark-icon' }, saveIconOutlinedSpan, saveIconFilledSpan);
  const bookmark = createElement('a', null, bookmarkIcons, saveText);
  const bookmarkSpan = createElement('span', { class: 'bookmark' }, bookmark);
  const topInfo = createElement('div', { class: 'top-info' }, articleTime, featuredTag, bookmarkSpan);
  const h1 = heroSection.querySelector('h1');
  const authorsContainer = createElement('span', { class: 'authors' });
  const articleDate = createElement('span', { class: 'article-date' });
  const lastInfo = createElement('div', { class: 'article-data' }, authorsContainer, articleDate);
  const contentWrapper = createElement('div', { class: 'default-content-wrapper' }, topInfo, h1, lastInfo);
  heroSection.append(contentWrapper);

  // Dynamic Section
  const [
    {
      author, primaryTopic, date,
    },
    saveLabel,
    byLabel,
  ] = await Promise.all([
    getArticleRelatedMetadata(),
    i18n('Save'),
    i18n('By'),
  ]);
  const [
    parsedTime,
    readLabel,
  ] = await Promise.all([
    parseTime(readTime),
    getReadTimeLabel(subTemplates),
    setupDayjsLibs(),
  ]);
  const readTimeText = readTime ? createElement('span', null, `${parsedTime} ${readLabel}`) : null;
  articleTime.append(readTimeText);
  featuredTag.textContent = primaryTopic;
  saveText.textContent = saveLabel;
  renderAuthors(author, authorsContainer, byLabel);
  articleDate.textContent = getCdtDate(date).format('DD MMM YYYY');
  buildBookmark(bookmark, bookmarkIcons, saveText);
}

export default function articleTemplate() {
  (async () => {
    const main = document.querySelector('main');
    await decorateArticleHero(main);
  })();
}
