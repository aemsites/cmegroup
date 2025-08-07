import {
  createCourseBaseTemplate, getCourseData, updateLessonStatus, getCurrentLesson,
} from '../../scripts/course/course.js';
import { addCourseCertificate } from '../../scripts/course/certificate.js';
import { createElement, i18n } from '../../scripts/utils.js';
import { authentication } from '../../scripts/modules/Authentication.js';
import { store } from '../../scripts/store/store.js';
import { courseDataChange } from '../../scripts/actions/course.js';
import { quizAnswered } from '../../scripts/actions/quiz.js';

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

function findNavigationLinks(currentPath, flatLessons) {
  const currentIndex = flatLessons.findIndex((lesson) => lesson.path === currentPath);
  const prevLesson = currentIndex > 0 ? flatLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < flatLessons.length - 1 ? flatLessons[currentIndex + 1] : null;

  return {
    prevHref: prevLesson ? prevLesson.path : null,
    nextHref: nextLesson ? nextLesson.path : null,
  };
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

  const lastChild = main.lastElementChild;
  lastChild.insertBefore(nav, lastChild.lastElementChild);

  // Apply hide parameters preservation to navigation links
  const { preserveHideParameters } = await import('../../scripts/utils.js');
  preserveHideParameters(nav);
}

function initLateralNav(courseData) {
  const currentPath = window.location.pathname;
  const flatLessons = flattenLessons(courseData);
  const { prevHref, nextHref } = findNavigationLinks(currentPath, flatLessons);
  addLateralNavigation(prevHref, nextHref);
}

export default async function lessonTemplate() {
  const { authenticationData } = authentication;
  authenticationData.loginPromise.then(async () => {
    const { isLoggedIn, loginInfo } = authenticationData;
    if (!isLoggedIn) {
      await import('../../scripts/course/auth-modal.js');
    }
    const courseData = await getCourseData();
    await createCourseBaseTemplate(courseData);
    await initLateralNav(courseData);
    const lesson = getCurrentLesson(courseData);
    if (!lesson?.started) {
      //  start current lesson
      await updateLessonStatus(false);
    }
    if (lesson?.completed) {
      store.dispatch(quizAnswered(true));
    }
    //  dispatch courseData event
    store.dispatch(courseDataChange(courseData));
    //  quiz completion event subscriber
    store.subscribe(({ quiz }) => quiz, async ({ isCorrect }) => {
      if (isCorrect && !lesson?.completed) {
        const updatedCourse = await updateLessonStatus(true);
        store.dispatch(courseDataChange(updatedCourse));
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
