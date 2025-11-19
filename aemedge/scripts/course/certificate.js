import {
  createElement,
  i18n,
  setupDayjsLibs,
  getCdtDate,
  loadScript,
  isFeatureToggled,
} from '../utils.js';
import {
  apiPost,
  getResponseData,
  urlByEnvType,
} from '../utils/index.js';
import { getMetadata } from '../aem.js';
import { createModal } from '../../blocks/modal/modal.js';

async function createCertificateModal({
  lessonTitle,
  userName,
  completedModule,
  certificateTitle,
}) {
  const [
    modalTitleLabel,
    certificateTitleLabel,
    presentedToLabel,
    downloadLabel,
    shareLabel,
  ] = await Promise.all([
    i18n('Course Completion Certificate'),
    i18n('Certificate of Course Completion'),
    i18n('Presented to'),
    i18n('Download'),
    i18n('Share'),
  ]);

  const shareButton = createElement(
    'button',
    {
      class: 'print-pdf sharer',
      type: 'button',
    },
    createElement('span', { class: 'icon icon-share pr-1' }),
    shareLabel,
  );

  const modalHeader = createElement(
    'div',
    { class: 'modal-header' },
    createElement(
      'h5',
      { class: 'modal-title' },
      createElement(
        'div',
        { class: 'modal-buttons' },
        modalTitleLabel,
        ' | ',
        createElement(
          'div',
          { class: 'buttons-container' },
          createElement(
            'button',
            { class: 'print-pdf', type: 'button' },
            createElement('span', { class: 'icon icon-document-pdf pr-1' }),
            downloadLabel,
          ),
          shareButton,
        ),
      ),
    ),
  );

  const modalBody = createElement(
    'div',
    { class: 'modal-body' },
    createElement(
      'div',
      { class: 'completion-certificate-container' },
      createElement(
        'div',
        { class: 'completion-data' },
        createElement(
          'div',
          { class: 'certificate-header' },
          createElement('p', { class: 'eyebrow' }, 'Cme Group Institute'),
          createElement('p', { class: 'divider' }),
          createElement('p', { class: 'title' }, certificateTitle || certificateTitleLabel),
        ),
        createElement(
          'div',
          { class: 'body' },
          createElement('p', { class: 'course-title' }, lessonTitle),
          createElement('p', { class: 'presented-to' }, presentedToLabel),
          createElement('p', { class: 'user-name' }, userName),
          createElement(
            'p',
            { class: 'date' },
            getCdtDate(completedModule).format('MMMM Do YYYY'),
          ),
        ),
        createElement(
          'div',
          { class: 'footer' },
          createElement('img', {
            class: 'logo',
            src: `${urlByEnvType()}/content/dam/cmegroup/images/cme-logo-new.png`,
            alt: '',
          }),
        ),
      ),
      createElement('img', {
        class: 'certificate-image',
        src: `${urlByEnvType()}/content/dam/cmegroup/images/certificate-graphic.png`,
        alt: '',
      }),
    ),
  );

  const modal = await createModal([modalHeader, modalBody]);
  modal.block.classList.add('certificate-modal');
  return modal;
}

async function getShareCertificateData(formData) {
  try {
    const url = `${urlByEnvType()}/services/course-certificate`;
    const response = await apiPost(url, formData);
    return getResponseData(response, 'objectId');
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('shareCertificateService => getShareCertificateData error:', e);
  }
  return '';
}

function dataURIToBlob(dataURI) {
  const splitDataURI = dataURI.split(',');
  const byteString = splitDataURI[0].indexOf('base64') >= 0
    ? atob(splitDataURI[1])
    : decodeURI(splitDataURI[1]);
  const mimeString = splitDataURI[0].split(':')[1].split(';')[0];
  const ia = new Uint8Array(byteString.length);

  for (let i = 0; i < byteString.length; i += 1) {
    ia[i] = byteString.charCodeAt(i);
  }

  return new Blob([ia], { type: mimeString });
}

async function buildUrlForShare(certContainer, moduleId) {
  await import('../third-party/html-to-image/html-to-image.min.js');
  const { htmlToImage: { toPng, getFontEmbedCSS } } = window;

  const formData = new FormData();
  const fontEmbedCss = await getFontEmbedCSS(certContainer, {
    preferredFontFormat: 'woff2',
  });
  const dataUrl = await toPng(certContainer, {
    fontEmbedCss,
    skipFonts: true,
  });
  const file = dataURIToBlob(dataUrl);
  formData.append('file', file, 'image.png');
  formData.append('courseId', moduleId);
  const res = await getShareCertificateData(formData);
  return `${urlByEnvType()}/services/course-certificate/${res}`;
}

function createSpinner() {
  const spinner = createElement('div', { class: 'spinner-certificate' });
  spinner.innerHTML = `
    <div></div>
    <div></div>
    <div></div>
    <div></div>
  `;
  return spinner;
}

async function handleShareClick(block, moduleId) {
  const platforms = getMetadata('share-links').split(',');
  const container = createElement('div', {
    class: 'share-buttons-container',
  });

  const shareBtn = block.querySelector('.sharer');
  const spinner = createSpinner();
  shareBtn.replaceWith(spinner);

  const certContainer = block.querySelector('.completion-certificate-container');
  const shareUrl = await buildUrlForShare(certContainer, moduleId);

  platforms.forEach((platform) => {
    const button = createElement(
      'button',
      {
        class: 'print-pdf',
        type: 'button',
        'data-sharer': platform === 'x' ? 'twitter' : platform,
        'data-url': shareUrl,
      },
      createElement('img', {
        src: `/aemedge/icons/${platform}-share.svg`,
        alt: `${platform.charAt(0).toUpperCase() + platform.slice(1)}`,
      }),
    );
    container.appendChild(button);
  });

  spinner.replaceWith(container);

  loadScript('https://cdn.jsdelivr.net/npm/sharer.js@latest/sharer.min.js').then(() => {
    document.querySelectorAll('[data-sharer]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        window.Sharer.init();
      });
    });
  });
}

async function openCertificateModal({
  userName,
  moduleId,
  lessonTitle,
  completedModule,
  certificateTitle,
}) {
  const scriptPromises = [
    loadScript('/aemedge/scripts/third-party/datepicker/datepicker.min.js'),
    setupDayjsLibs(),
  ];

  // Wait for all scripts to load
  await Promise.all(scriptPromises);

  const { block, showModal } = await createCertificateModal({
    lessonTitle,
    userName,
    completedModule,
    certificateTitle,
  });

  const downloadBtn = block.querySelectorAll('.print-pdf')[0];
  downloadBtn.addEventListener('click', () => {
    window.print();
  });

  const shareBtn = block.querySelector('.sharer');
  shareBtn.addEventListener('click', () => {
    handleShareClick(block, moduleId);
  });

  showModal();
}

// eslint-disable-next-line import/prefer-default-export
export async function addCourseCertificate({
  isLoggedIn,
  userName,
  moduleId,
  lessonTitle,
  completedModule,
  showModal,
  container,
  isFromHistory = false,
  certificateTitle,
}) {
  // Disable if educationIframe query parameter is set
  if (isFeatureToggled('educationIframe')) return;

  const [
    viewCertificateLabel,
    downloadCertificateLabel,
  ] = await Promise.all([
    i18n('View Certificate'),
    i18n('Download Certificate'),
  ]);

  const button = createElement(
    'button',
    { class: `button secondary view-certificate ${isFromHistory && 'download-icon'}`, type: 'button' },
    isFromHistory ? downloadCertificateLabel : viewCertificateLabel,
  );

  const openModal = async () => {
    if (!isLoggedIn) {
      const { openAuthModal } = await import('./auth-modal.js');
      openAuthModal();
    } else {
      openCertificateModal({
        userName,
        moduleId,
        lessonTitle,
        completedModule,
        certificateTitle,
      });
    }
  };

  button.addEventListener('click', () => openModal());
  if (container) {
    container.appendChild(button);
  } else {
    const main = document.querySelector('main');
    const courseHeading = main.querySelector('h1');
    courseHeading.insertAdjacentElement('afterend', button);
  }

  if (showModal) {
    openModal();
  }
}
