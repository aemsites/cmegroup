import { getCourseData, createCourseBaseTemplate } from '../../scripts/course/course.js';
import { createElement, i18n } from '../../scripts/utils.js';

async function addBeginCourseButton() {
  const main = document.querySelector('main');
  const beginCourseLabel = await i18n('Begin Course');
  const beginCourseButton = createElement('a', { class: 'button primary', href: '#' }, beginCourseLabel);
  const buttonContainer = createElement('div', { class: 'button-container begin-course-button' }, beginCourseButton);
  main.querySelector('.section:last-child > div')?.appendChild(buttonContainer);
  getCourseData()
    .then((courseData) => {
      if (courseData.hasChapters) {
        const firstChapter = courseData.chapters.length > 0 ? courseData.chapters[0] : null;
        const firstLesson = firstChapter?.lessons.length > 0 ? firstChapter.lessons[0] : null;
        if (firstLesson) {
          beginCourseButton.href = firstLesson.path;
        }
      } else {
        const firstLesson = courseData.lessons.length > 0 ? courseData.lessons[0] : null;
        if (firstLesson) {
          beginCourseButton.href = firstLesson.path;
        }
      }
    });
}

export default async function courseTemplate() {
  await createCourseBaseTemplate();
  await addBeginCourseButton();
}
