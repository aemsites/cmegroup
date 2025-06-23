import { getCourseData, createCourseBaseTemplate } from '../../scripts/course/course.js';
import { createElement, i18n } from '../../scripts/utils.js';
import { authentication } from '../../scripts/modules/Authentication.js';
import { store } from '../../scripts/store/store.js';
import { courseDataChange } from '../../scripts/actions/course.js';

async function addBeginCourseButton(courseData) {
  const main = document.querySelector('main');
  const beginCourseLabel = await i18n('Begin Course');
  const beginCourseButton = createElement('a', { class: 'button primary', href: '#' }, beginCourseLabel);
  const buttonContainer = createElement('div', { class: 'button-container begin-course-button' }, beginCourseButton);
  main.querySelector('.section')?.lastChild.after(buttonContainer);

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
}

export default async function courseTemplate() {
  const { authenticationData } = authentication;
  authenticationData.loginPromise.then(async () => {
    const courseData = await getCourseData();
    await createCourseBaseTemplate(courseData);
    await addBeginCourseButton(courseData);
    //  dispatch courseData event
    store.dispatch(courseDataChange(courseData));
  });
}
