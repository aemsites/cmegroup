import { getMetadata } from '../../scripts/aem.js';
import { isFeatureToggled } from '../../scripts/utils.js';

const isTabsRequired = (main) => {
  // Exclude product templates (they have their own specialized tab system)
  const template = getMetadata('template');
  if (template && template.toLowerCase() === 'product') return false;
  return main.querySelectorAll(':scope > .section.tabs').length > 0;
};
const isCourseNavRequired = () => {
  if (isFeatureToggled('hideCourseNav', 'y', true) || window.location.pathname.includes('.hideCourseNav.')) return false;

  const template = getMetadata('template');
  if (!template) return false;
  return template.toLowerCase() === 'course' || template.toLowerCase() === 'lesson';
};

const isRelatedCoursesRequired = () => {
  if (isFeatureToggled('educationIframe')) return false;

  const template = getMetadata('template');
  if (!template) return false;
  return template.toLowerCase() === 'course';
};

const isProductTabsRequired = (main) => {
  const template = getMetadata('template');
  if (!template || template.toLowerCase() !== 'product') return false;
  const hasOverviewTab = main.querySelector('.section.tabs[data-tab-id="overview"]');
  return hasOverviewTab !== null;
};

/**
 * Create dynamic blocks from the main element
 * @param {HTMLElement} main - The main element
 */
export default async function dynamicBlocks(main) {
  if (isTabsRequired(main)) {
    import('./tabs/tabs.js').then(({ default: createTabs }) => createTabs(main));
  }
  if (isCourseNavRequired()) {
    import('./course-nav/course-nav.js').then(({ default: createCourseNav }) => createCourseNav(main));
  }

  if (isRelatedCoursesRequired()) {
    import('./related-courses/related-courses.js').then(({ default: createRelatedCourses }) => createRelatedCourses(main));
  }

  if (isProductTabsRequired(main)) {
    import('./product-tabs/product-tabs.js').then(({ default: createProductTabs }) => createProductTabs(main));
  }
}
