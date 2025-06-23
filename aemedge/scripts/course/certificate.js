import {
  createElement,
  i18n,
} from '../utils.js';
import { loadScript, getMetadata } from '../aem.js';
import { createModal } from '../../blocks/modal/modal.js';

function handleShareClick({ shareButton }) {
  const platforms = getMetadata('share-links').split(',');
  const container = createElement('div', {
    class: 'share-buttons-container',
  });

  platforms.forEach((platform) => {
    const button = createElement(
      'button',
      {
        class: 'print-pdf',
        type: 'button',
        'data-sharer': platform === 'x' ? 'twitter' : platform,
        'data-url': window.location.href,
      },
      createElement('img', {
        src: `/aemedge/icons/${platform}-share.svg`,
        alt: `${platform.charAt(0).toUpperCase() + platform.slice(1)}`,
      }),
    );
    container.appendChild(button);
  });

  shareButton.replaceWith(container);

  loadScript('https://cdn.jsdelivr.net/npm/sharer.js@latest/sharer.min.js').then(() => {
    document.querySelectorAll('[data-sharer]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        window.Sharer.init();
      });
    });
  });
}

async function createCertificateModal({
  lessonTitle,
  userName,
  completedModule,
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
      class: 'print-pdf',
      type: 'button',
    },
    createElement('span', { class: 'icon icon-share pr-1' }),
    shareLabel,
  );

  shareButton.addEventListener('click', () => {
    handleShareClick({ shareButton });
  });

  const modalContent = [
    createElement(
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
              // createElement('img', {
              //   src: '/aemedge/icons/document-pdf.svg',
              //   alt: 'download',
              // }),
              downloadLabel,
            ),
            shareButton,
          ),
        ),
      ),
    ),
    createElement(
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
            createElement('p', { class: 'title' }, certificateTitleLabel),
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
              dayjs(completedModule).format('MMMM Do YYYY'),
            ),
          ),
          createElement(
            'div',
            { class: 'footer' },
            createElement('img', {
              class: 'logo',
              src: 'https://www.cmegroup.com//content/dam/cmegroup/images/cme-logo-new.png',
              alt: '',
            }),
          ),
        ),
        createElement('img', {
          class: 'certificate-image',
          src: 'https://www.cmegroup.com//content/dam/cmegroup/images/certificate-graphic.png',
          alt: '',
        }),
      ),
    ),
  ];

  const modal = await createModal(modalContent);
  modal.block.classList.add('certificate-modal');
  return modal;
}

async function openCertificateModal({
  userName,
  lessonTitle,
  completedModule,
}) {
  const scriptPromises = [
    loadScript('/aemedge/scripts/third-party/datepicker/datepicker.min.js'),
    loadScript('/aemedge/scripts/third-party/dayjs/dayjs.min.js'),
    loadScript('/aemedge/scripts/third-party/dayjs/utc.js'),
    loadScript('/aemedge/scripts/third-party/dayjs/timezone.js'),
    loadScript('/aemedge/scripts/third-party/dayjs/advancedFormat.js'),
  ];

  // Wait for all scripts to load
  await Promise.all(scriptPromises);

  const { block, showModal } = await createCertificateModal({
    lessonTitle,
    userName,
    completedModule,
  });

  const downloadBtn = block.querySelectorAll('.print-pdf')[0];
  downloadBtn.addEventListener('click', () => {
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js').then(() => {
      const elementToPrint = block.querySelector('.completion-certificate-container');

      const opt = {
        margin: 0,
        filename: 'certificate.pdf',
        image: { type: 'png', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
      };

      // eslint-disable-next-line no-undef
      html2pdf().set(opt).from(elementToPrint).save();
    });
  });

  showModal();
}

// eslint-disable-next-line import/prefer-default-export
export async function addCourseCertificate({
  isLoggedIn,
  userName,
  lessonTitle,
  completedModule,
  showModal,
}) {
  const [
    viewCertificateLabel,
  ] = await Promise.all([
    i18n('View Certificate'),
  ]);
  const main = document.querySelector('main');
  const courseHeading = main.querySelector('h1');

  const button = createElement(
    'button',
    { class: 'button secondary view-certificate', type: 'button' },
    viewCertificateLabel,
  );

  const openModal = () => {
    if (!isLoggedIn) {
      return;
    }
    openCertificateModal({
      userName,
      lessonTitle,
      completedModule,
    });
  };

  button.addEventListener('click', () => openModal());
  courseHeading.insertAdjacentElement('afterend', button);

  if (showModal) {
    openModal();
  }
}
