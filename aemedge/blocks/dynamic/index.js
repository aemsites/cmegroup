import { getMetadata } from '../../scripts/aem.js';

const isTabsRequired = (main) => main.querySelectorAll(':scope > .section.tabs').length > 0;
const isCourseNavRequired = () => {
  const template = getMetadata('template');
  if (!template) return false;
  return template.toLowerCase() === 'course' || template.toLowerCase() === 'lesson';
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

  import('./related-courses/related-courses.js').then(({ default: createRelatedCourses }) => createRelatedCourses(main));
}
