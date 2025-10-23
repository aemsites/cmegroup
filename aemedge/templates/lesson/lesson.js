import {
  createCourseBaseTemplate, getCourseData, updateLessonStatus, getCurrentLesson,
} from '../../scripts/course/course.js';
import { addCourseCertificate } from '../../scripts/course/certificate.js';
import {
  createElement, i18n, isFeatureToggled, addFragmentBlock,
} from '../../scripts/utils.js';
import { authentication } from '../../scripts/modules/Authentication.js';
import { store } from '../../scripts/store/store.js';
import { courseDataChange } from '../../scripts/actions/course.js';
import { quizAnswered } from '../../scripts/actions/quiz.js';
import { setTracking } from '../../scripts/utils/index.js';

const FRAGMENT_URL = '/fragments/courses-lessons/extend-your-learning';

const fireTrackingLessons = setTracking('custom', 'lesson_complete', 'Lessons and Courses');
const fireTrackingCourses = setTracking('custom', 'course_complete', 'Lessons and Courses');
if (window.ga) {
  window.ga();
}

/**
 * Flattens the course structure (lessons and chapters) into a single array
 * based on the modulesOrder specified in the courseData.
 * @param {Object} courseData - Course data with lessons, chapters, modulesOrder
 * @returns {Array} Array of lesson objects with their paths and chapter info
 */
function flattenLessons(courseData) {
  const lessons = courseData.lessons || [];
  const chapters = courseData.chapters || [];
  const modulesOrder = courseData.modulesOrder?.split(',').map((s) => s.trim()) || [];

  const flatLessons = [];

  const lessonMap = new Map(
    lessons.map((lesson) => [lesson.pathSuffix, lesson]),
  );

  const chapterMap = new Map(
    chapters.map((chapter) => [
      chapter.path.split('/').pop(),
      chapter.lessons?.map((lesson) => ({
        ...lesson,
        chapterPath: chapter.path,
      })) || [],
    ]),
  );

  modulesOrder.forEach((key) => {
    if (lessonMap.has(key)) {
      flatLessons.push({ ...lessonMap.get(key), chapterPath: null });
    } else if (chapterMap.has(key)) {
      flatLessons.push(...chapterMap.get(key));
    }
  });

  return flatLessons;
}

/**
 * Finds the previous and next lesson links for the current lesson.
 * @param {string} currentPath - The current page path
 * @param {Array} flatLessons - Flattened array of all lessons in order
 * @returns {Object} Object containing prevHref and nextHref for navigation
 */
function findNavigationLinks(currentPath, flatLessons) {
  const currentIndex = flatLessons.findIndex((lesson) => lesson.path === currentPath);
  const prevLesson = currentIndex > 0 ? flatLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < flatLessons.length - 1 ? flatLessons[currentIndex + 1] : null;

  return {
    prevHref: prevLesson ? prevLesson.path : null,
    nextHref: nextLesson ? nextLesson.path : null,
  };
}

/**
 * Creates and appends the lateral navigation component (Previous/Next buttons)
 * to the main content area.
 * @param {string|null} prevHref - URL for the previous lesson, or null if none
 * @param {string|null} nextHref - URL for the next lesson, or null if none
 * @returns {Promise<void>}
 */
async function addLateralNavigation(prevHref, nextHref) {
  const main = document.querySelector('main');
  if (!main) {
    // eslint-disable-next-line no-console
    console.warn('addLateralNavigation: main element not found');
    return;
  }

  const [previousLabel, nextLabel] = await Promise.all([
    i18n('Previous'),
    i18n('Next'),
  ]);
  const nav = createElement(
    'div',
    { class: 'lateral-navigation' },
    createElement(
      'div',
      { class: 'container' },
      createElement(
        'div',
        { class: 'lesson-nav-wrapper' },
        createElement(
          'div',
          { class: 'nav-btn nav-btn-prev' },
          prevHref
            ? createElement(
              'a',
              { href: prevHref },
              createElement('span', { class: 'icon' }),
              createElement('span', { class: 'label' }, previousLabel),
            )
            : null,
        ),
        nextHref
          ? createElement(
            'div',
            { class: 'nav-btn nav-btn-next' },
            createElement(
              'a',
              { href: nextHref },
              createElement('span', { class: 'label' }, nextLabel),
              createElement('span', { class: 'icon' }),
            ),
          )
          : null,
      ),
    ),
  );

  main.appendChild(nav);

  // Apply hide parameters preservation to navigation links
  const { preserveHideParameters } = await import('../../scripts/utils.js');
  preserveHideParameters(nav);
}

/**
 * Initializes the lateral navigation for the lesson page.
 * Determines navigation links and adds navigation component and fragment.
 * @param {Object} courseData - The course data object
 * @returns {Promise<Object|null>} Navigation links or null if hidden
 */
async function initLateralNav(courseData) {
  if (isFeatureToggled('hideCourseNav', 'y', true) || window.location.pathname.includes('.hideCourseNav.')) {
    return null;
  }
  const currentPath = window.location.pathname.replace(/\.html$/, '');
  const flatLessons = flattenLessons(courseData);
  const { prevHref, nextHref } = findNavigationLinks(currentPath, flatLessons);
  await addLateralNavigation(prevHref, nextHref);
  await addFragmentBlock(FRAGMENT_URL);
  return { prevHref, nextHref };
}

/**
 * Creates a placeholder element for the course header to prevent CLS.
 * Reserves space for course header (46px) and premium label (14px).
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

  const defaultContentWrapper = firstSection.querySelector(
    '.default-content-wrapper',
  );

  if (defaultContentWrapper) {
    // Combined height: course-header (46px) + premium-label (14px)
    const headerWrapper = createElement('div', {
      class: 'course-header-wrapper-placeholder',
    });
    // Insert at the very beginning of default-content-wrapper
    defaultContentWrapper.prepend(headerWrapper);
  } else {
    // eslint-disable-next-line no-console
    console.warn('createCourseHeaderPlaceholder: wrapper not found');
  }
}

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

export default async function lessonTemplate() {
  const { authenticationData } = authentication;
  authenticationData.loginPromise.then(async () => {
    const { isLoggedIn, loginInfo } = authenticationData;
    if (!isLoggedIn && !isFeatureToggled('educationIframe')) {
      await import('../../scripts/course/auth-modal.js');
    }

    // Create placeholder for course header to prevent CLS
    createCourseNavPlaceholder();
    createCourseHeaderPlaceholder();

    const courseData = await getCourseData();
    const courseId = courseData.moduleId;
    await createCourseBaseTemplate(courseData);
    const navResult = await initLateralNav(courseData);
    const lesson = getCurrentLesson(courseData);
    if (!lesson?.started) {
      //  start current lesson
      await updateLessonStatus(false);
    }
    if (lesson?.quiz || lesson?.completed) {
      //  quiz prefill
      store.dispatch(quizAnswered(lesson?.quiz || { isCorrect: true }));
    }
    //  dispatch courseData event
    store.dispatch(courseDataChange({ ...courseData, nextLesson: navResult?.nextHref }));
    //  quiz completion event subscriber
    store.subscribe(({ quiz }) => quiz, async ({ quizStatus }) => {
      if (quizStatus?.isCorrect && !lesson?.completed) {
        const updatedCourse = await updateLessonStatus(
          true,
          quizStatus?.status ? quizStatus : null,
        );
        store.dispatch(courseDataChange(updatedCourse));
        fireTrackingLessons(
          `Lesson "${lesson.moduleTitle}" - completed`,
          'completed',
          {
            lessonID: lesson.moduleId,
            parentCourse: courseId,
            lessonTitle: lesson.moduleTitle,
          },
        );
        if (updatedCourse.completed) {
          fireTrackingCourses(
            `Course "${updatedCourse.moduleTitle}" - completed`,
            'completed',
            {
              courseID: courseId,
              courseTitle: updatedCourse.moduleTitle,
            },
          );
        }
      } else if (quizStatus && !quizStatus.isCorrect && quizStatus !== lesson?.quiz) {
        await updateLessonStatus(false, quizStatus?.status ? quizStatus : null);
      }
    });
    //  courseData change event
    store.subscribe(({ courseData: course }) => course, (course) => {
      if (course?.completed) {
        addCourseCertificate({
          isLoggedIn,
          userName: loginInfo?.userName,
          moduleId: course?.moduleId,
          lessonTitle: course?.title,
          completedModule: course?.endDate,
          // the modal is opened automatically when the user completes the lesson
          showModal: !lesson?.completed,
        });
      }
    });
  });
}
