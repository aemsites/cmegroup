import { getCourseData, createCourseBaseTemplate } from '../../scripts/course/course.js';
import { createElement, i18n, preserveHideParameters } from '../../scripts/utils.js';
import { authentication } from '../../scripts/modules/Authentication.js';
import { store } from '../../scripts/store/store.js';
import { courseDataChange } from '../../scripts/actions/course.js';
import { addCourseCertificate } from '../../scripts/course/certificate.js';

/**
 * Creates a placeholder element for the course navigation to prevent CLS.
 * Reserves space for the course-nav component.
 * @returns {void}
 */
function createCourseNavPlaceholder() {
  const main = document.querySelector('main');
  if (!main) {
    // eslint-disable-next-line no-console
    console.warn('createCourseNavPlaceholder: main element not found');
    return;
  }

  if (!main.querySelector('.course-nav-placeholder')) {
    const courseNavPlaceholder = createElement('div', { class: 'course-nav course-nav-placeholder' });
    main.prepend(courseNavPlaceholder);
  }
}

/**
 * Creates a placeholder element for the course header to prevent CLS.
 * Reserves space for course header and premium label.
 * @returns {void}
 */
function createCourseHeaderPlaceholder() {
  const main = document.querySelector('main');
  if (!main) {
    // eslint-disable-next-line no-console
    console.warn('createCourseHeaderPlaceholder: main element not found');
    return;
  }

  const firstSection = main.querySelector('.section');
  if (!firstSection) {
    // eslint-disable-next-line no-console
    console.warn('createCourseHeaderPlaceholder: first section not found');
    return;
  }

  const defaultContentWrapper = firstSection.querySelector('.default-content-wrapper');
  if (defaultContentWrapper && !defaultContentWrapper.querySelector('.course-header-wrapper-placeholder')) {
    const headerWrapper = createElement('div', {
      class: 'course-header-wrapper-placeholder',
    });
    // Insert at the very beginning of default-content-wrapper
    defaultContentWrapper.prepend(headerWrapper);
  } else if (!defaultContentWrapper) {
    // eslint-disable-next-line no-console
    console.warn('createCourseHeaderPlaceholder: wrapper not found');
  }
}

async function addBeginCourseButton(courseData) {
  const main = document.querySelector('main');
  const beginCourseLabel = await i18n('Begin Course');
  const beginCourseButton = createElement('a', { class: 'button primary', href: '#' }, beginCourseLabel);
  const buttonContainer = createElement('div', { class: 'button-container begin-course-button' }, beginCourseButton);

  if (courseData.lessons.length > 0) {
    const firstLesson = courseData.lessons.length > 0 ? courseData.lessons[0] : null;
    if (firstLesson) {
      beginCourseButton.href = firstLesson.path;
    }
  } else if (courseData.hasChapters) {
    const firstChapter = courseData.chapters.length > 0 ? courseData.chapters[0] : null;
    const firstLesson = firstChapter?.lessons.length > 0 ? firstChapter.lessons[0] : null;
    if (firstLesson) {
      beginCourseButton.href = firstLesson.path;
    }
  }

  main.querySelector('.section')?.lastChild.after(buttonContainer);
}

export default async function courseTemplate() {
  // Create placeholders early to prevent CLS
  createCourseNavPlaceholder();
  createCourseHeaderPlaceholder();

  const { authenticationData } = authentication;
  authenticationData.loginPromise.then(async () => {
    const courseData = await getCourseData();
    await createCourseBaseTemplate(courseData);
    await addBeginCourseButton(courseData);
    if (courseData.completed) {
      const { isLoggedIn, loginInfo } = authenticationData;
      await addCourseCertificate({
        isLoggedIn,
        userName: loginInfo?.userName,
        moduleId: courseData?.moduleId,
        lessonTitle: courseData?.title,
        completedModule: courseData?.endDate,
      });
    }

    // Apply hide parameters preservation after course content is loaded
    const main = document.querySelector('main');
    preserveHideParameters(main);

    //  dispatch courseData event
    store.dispatch(courseDataChange(courseData));
  });
}
