import {
  createCourseBaseTemplate,
  getCourseData,
  updateLessonStatus,
  getCurrentLesson,
} from '../../scripts/course/course.js';
import { addCourseCertificate } from '../../scripts/course/certificate.js';
import {
  createElement, i18n, isFeatureToggled, addFragmentBlock,
} from '../../scripts/utils.js';
import { courseDataChange } from '../../scripts/actions/course.js';
import { quizAnswered } from '../../scripts/actions/quiz.js';
import { setTracking } from '../../scripts/utils/index.js';

const FRAGMENT_URL = '/fragments/courses-lessons/extend-your-learning';

const fireTrackingLessons = setTracking('custom', 'lesson_complete', 'Lessons and Courses');
const fireTrackingCourses = setTracking('custom', 'course_complete', 'Lessons and Courses');
if (window.ga) {
  window.ga();
}

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

async function addLateralNavigation(prevHref, nextHref) {
  const main = document.querySelector('main');
  if (!main) return;

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

function getNavLinks(courseData) {
  const currentPath = window.location.pathname.replace(/\.html$/, '');
  const flatLessons = flattenLessons(courseData);
  const currentIndex = flatLessons.findIndex((lesson) => lesson.path === currentPath);
  const prevLesson = currentIndex > 0 ? flatLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < flatLessons.length - 1 ? flatLessons[currentIndex + 1] : null;

  return {
    prevHref: prevLesson ? prevLesson.path : null,
    nextHref: nextLesson ? nextLesson.path : null,
  };
}

async function initLateralNav(courseData) {
  if (isFeatureToggled('hideCourseNav', 'y', true) || window.location.pathname.includes('.hideCourseNav.')) {
    return null;
  }
  const { prevHref, nextHref } = getNavLinks(courseData);
  await addLateralNavigation(prevHref, nextHref);
  await addFragmentBlock(FRAGMENT_URL);
  return { prevHref, nextHref };
}

async function loadUserProgress(courseData, authenticationData) {
  const { isLoggedIn, loginInfo } = authenticationData;
  const { store } = await import('../../scripts/store/store.js');
  const { nextHref } = getNavLinks(courseData);
  //  dispatch courseData event
  store.dispatch(courseDataChange({ ...courseData, nextLesson: nextHref }));
  const lesson = getCurrentLesson(courseData);
  if (lesson?.quiz || lesson?.completed) {
    //  quiz prefill
    store.dispatch(quizAnswered(lesson?.quiz || { isCorrect: true }));
  }
  if (!lesson?.started) {
    //  start lesson
    await updateLessonStatus(false);
  }
  //  quiz subscriber
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
          parentCourse: courseData.moduleId,
          lessonTitle: lesson.moduleTitle,
        },
      );
      if (updatedCourse.completed) {
        fireTrackingCourses(
          `Course "${updatedCourse.moduleTitle}" - completed`,
          'completed',
          {
            courseID: courseData.moduleId,
            courseTitle: updatedCourse.moduleTitle,
          },
        );
      }
    } else if (quizStatus && !quizStatus.isCorrect && quizStatus !== lesson?.quiz) {
      await updateLessonStatus(false, quizStatus?.status ? quizStatus : null);
    }
  });
  //  courseData subscriber
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
}

export default async function lessonTemplate() {
  //  static section
  const courseData = await getCourseData();
  await createCourseBaseTemplate(courseData);

  //  dynamic section - user progress
  import('../../scripts/modules/Authentication.js').then(({ authentication }) => {
    const { authenticationData } = authentication;
    authenticationData.loginPromise.then(async () => {
      const { isLoggedIn, loginInfo } = authenticationData;
      const data = await getCourseData(loginInfo);
      initLateralNav(courseData);
      loadUserProgress(data, authenticationData);
      if (!isLoggedIn && !isFeatureToggled('educationIframe')) {
        import('../../scripts/course/auth-modal.js');
      }
    });
  });
}
