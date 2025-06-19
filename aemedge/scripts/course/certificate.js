import {
  createElement,
  i18n,
} from '../utils.js';
import { loadScript, getMetadata } from '../aem.js';

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

function createCertificateModal({
  modalTitleLabel,
  certificateTitleLabel,
  presentedToLabel,
  downloadLabel,
  shareLabel,
  lessonTitle,
  userName,
  completedModule,
}) {
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

  const modal = createElement(
    'div',
    {
      class: 'modal fade',
      role: 'dialog',
      tabindex: '-1',
      style: 'display: none;',
      'aria-modal': 'true',
    },
    createElement(
      'div',
      { class: 'modal-dialog universal-modal certificate-modal modal-dialog-centered', role: 'document' },
      createElement(
        'div',
        { class: 'modal-content' },
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
          createElement('button', { type: 'button', class: 'btn-close', 'aria-label': 'Close' }),
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
        createElement('div', { class: 'modal-footer' }),
      ),
    ),
  );

  return modal;
}

// eslint-disable-next-line import/prefer-default-export
export async function addCourseCertificate({
  isLoggedIn,
  userName,
  lessonTitle,
  completedModule,
}) {
  const [
    viewCertificateLabel,
    modalTitleLabel,
    certificateTitleLabel,
    presentedToLabel,
    downloadLabel,
    shareLabel,
  ] = await Promise.all([
    i18n('View Certificate'),
    i18n('Course Completion Certificate'),
    i18n('Certificate of Course Completion'),
    i18n('Presented to'),
    i18n('Download'),
    i18n('Share'),
  ]);

  // loadHtml2PdfScript();
  const main = document.querySelector('main');
  const courseHeading = main.querySelector('h1');

  const button = createElement(
    'button',
    { class: 'button secondary view-certificate', type: 'button' },
    viewCertificateLabel,
  );

  const scriptPromises = [
    loadScript('/aemedge/scripts/third-party/datepicker/datepicker.min.js'),
    loadScript('/aemedge/scripts/third-party/dayjs/dayjs.min.js'),
    loadScript('/aemedge/scripts/third-party/dayjs/utc.js'),
    loadScript('/aemedge/scripts/third-party/dayjs/timezone.js'),
    loadScript('/aemedge/scripts/third-party/dayjs/advancedFormat.js'),
  ];

  // Wait for all scripts to load
  await Promise.all(scriptPromises);

  const modal = createCertificateModal({
    modalTitleLabel,
    certificateTitleLabel,
    presentedToLabel,
    downloadLabel,
    shareLabel,
    lessonTitle,
    userName,
    completedModule,
  });

  document.body.appendChild(modal);

  const backdrop = createElement('div', {
    class: 'modal-backdrop fade',
    style: 'display: none;',
  });

  document.body.appendChild(backdrop);

  const downloadBtn = modal.querySelectorAll('.print-pdf')[0];
  downloadBtn.addEventListener('click', () => {
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js').then(() => {
      const elementToPrint = modal.querySelector('.completion-certificate-container');

      const opt = {
        margin: 0,
        filename: 'certificate.pdf',
        image: { type: 'png', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
      };

      html2pdf().set(opt).from(elementToPrint).save();
    });
  });

  const toggleModal = (show) => {
    if (!isLoggedIn) {
      return;
    }
    if (show) {
      modal.classList.add('show');
      backdrop.classList.add('show');
      modal.style.display = 'block';
      backdrop.style.display = 'block';
      document.body.classList.add('modal-open');
    } else {
      modal.classList.remove('show');
      backdrop.classList.remove('show');
      modal.style.display = 'none';
      backdrop.style.display = 'none';
      document.body.classList.remove('modal-open');
    }
  };

  const closeButton = modal.querySelector('.btn-close');
  button.addEventListener('click', () => toggleModal(true));
  closeButton.addEventListener('click', () => toggleModal(false));

  courseHeading.insertAdjacentElement('afterend', button);
}