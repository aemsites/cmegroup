import { getMetadata } from '../../scripts/aem.js';
import { isFeatureToggled } from '../../scripts/utils.js';

const isTabsRequired = (main) => main.querySelectorAll(':scope > .section.tabs').length > 0;
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
}
