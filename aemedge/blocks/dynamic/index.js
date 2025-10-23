import { getMetadata } from '../../scripts/aem.js';
import { isFeatureToggled } from '../../scripts/utils.js';
import { getCourseData } from '../../scripts/course/course.js';

const isTabsRequired = (main) => main.querySelectorAll(':scope > .section.tabs').length > 0;
const isCourseNavRequired = async () => {
  if (isFeatureToggled('hideCourseNav', 'y', true) || window.location.pathname.includes('.hideCourseNav.')) return false;

  const courseData = await getCourseData();
  const template = courseData?.template;
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
  const courseNavRequired = await isCourseNavRequired();
  if (courseNavRequired) {
    import('./course-nav/course-nav.js').then(({ default: createCourseNav }) => createCourseNav(main));
  }

  if (isRelatedCoursesRequired()) {
    import('./related-courses/related-courses.js').then(({ default: createRelatedCourses }) => createRelatedCourses(main));
  }
}
