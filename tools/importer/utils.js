const SECTION_SELECTORS = [
  '.blue1-background',
  '.blue2-background',
  '.blue3-background',
  '.blue4-background',
  '.blue5-background',
  '.blue6-background',
  '.gray1-background',
  '.gray2-background',
  '.gray3-background',
  '.gray4-background',
  '.gray5-background',
  '.gray6-background',
  '.white-background',
  '.leadspace-fade',
  '.parallax',
  '.gradient-white-blue',
  '.gradient-blue-white-fifteen',
  '.gradient-blue-white-thirty',
  '.gradient-blue-white-fifty',
  '.gradient-blue-white-eighty',
  '.crpy-4',
];

/**
 * This function fetches the template from the document.
 * @param {Document} document - The document to search.
 * @returns {string} - The template.
 */
const fetchTemplate = (document) => {
  if (document?.body?.classList?.length) {
    const template = document.head.querySelector('meta[name="template"]')?.getAttribute('content');
    return template || document.body.classList.toString();
  }
  return 'unknown';
};

export {
  fetchTemplate,
  SECTION_SELECTORS,
};
