import { createCourseBaseTemplate, getCourseData } from '../../scripts/course/course.js';
import { createElement, i18n } from '../../scripts/utils.js';

function flattenLessons(courseData) {
  const lessonsAtRoot = courseData.lessons || [];
  const chapters = courseData.chapters || [];
  const modulesOrder = courseData.modulesOrder.split(',').map((s) => s.trim()) || [];

  const flatLessons = [];

  modulesOrder.forEach((key) => {
    const lesson = lessonsAtRoot.find((l) => l.pathSuffix === key);
    if (lesson) {
      flatLessons.push({ ...lesson, chapterPath: null });
      return;
    }

    const chapter = chapters.find((c) => c.path.split('/').pop() === key);
    if (chapter && chapter.lessons) {
      chapter.lessons.forEach((l) => {
        flatLessons.push({
          ...l,
          chapterPath: chapter.path,
        });
      });
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

  const lastSection = main.querySelector('.section:last-child');
  if (lastSection && lastSection.parentNode) {
    lastSection.parentNode.insertBefore(nav, lastSection.nextSibling);
  }
}

export default async function lessonTemplate() {
  await createCourseBaseTemplate();

  const courseData = await getCourseData();
  const currentPath = window.location.pathname;
  const flatLessons = flattenLessons(courseData);

  const { prevHref, nextHref } = findNavigationLinks(currentPath, flatLessons);
  addLateralNavigation(prevHref, nextHref);
}
