import { getCourseData, createCourseBaseTemplate } from '../../scripts/course/course.js';
import { createElement, i18n, preserveHideParameters } from '../../scripts/utils.js';
import { courseDataChange } from '../../scripts/actions/course.js';
import { addCourseCertificate } from '../../scripts/course/certificate.js';

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
  //  static section
  const courseData = await getCourseData();
  await Promise.all([
    createCourseBaseTemplate(courseData),
    addBeginCourseButton(courseData),
  ]);

  // Apply hide parameters preservation after course content is loaded
  const main = document.querySelector('main');
  preserveHideParameters(main);

  //  dynamic section - user progress
  import('../../scripts/modules/Authentication.js').then(({ authentication }) => {
    const { authenticationData } = authentication;
    authenticationData.loginPromise.then(async () => {
      const { isLoggedIn, loginInfo } = authenticationData;
      const data = await getCourseData(loginInfo);
      if (data.completed) {
        addCourseCertificate({
          isLoggedIn,
          userName: loginInfo?.userName,
          moduleId: data?.moduleId,
          lessonTitle: data?.title,
          completedModule: data?.endDate,
        });
      }
      import('../../scripts/store/store.js').then(({ store }) => {
        //  dispatch courseData event
        store.dispatch(courseDataChange(data));
      });
    });
  });
}
