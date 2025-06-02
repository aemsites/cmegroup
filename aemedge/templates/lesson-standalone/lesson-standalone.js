import { createCourseBaseTemplate, getCourseData, updateLessonStatus } from '../../scripts/course/course.js';
import { authentication } from '../../scripts/modules/Authentication.js';
import { store } from '../../scripts/store/store.js';
import { courseDataChange } from '../../scripts/actions/course.js';

export default function lessonStandaloneTemplate() {
  const { authenticationData } = authentication;
  authenticationData.loginPromise.then(async () => {
    const courseData = await getCourseData();
    await createCourseBaseTemplate(courseData);
  });

  //  quiz completion event subscriber
  store.subscribe(({ quiz }) => quiz, async ({ isCorrect }) => {
    if (isCorrect) {
      const courseData = await updateLessonStatus(true);
      store.dispatch(courseDataChange(courseData));
    }
  });
}
