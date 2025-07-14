import { createCourseBaseTemplate, getCourseData, updateLessonStatus } from '../../scripts/course/course.js';
import { authentication } from '../../scripts/modules/Authentication.js';
import { store } from '../../scripts/store/store.js';
import { courseDataChange } from '../../scripts/actions/course.js';
import { quizAnswered } from '../../scripts/actions/quiz.js';

export default function lessonStandaloneTemplate() {
  const { authenticationData } = authentication;
  authenticationData.loginPromise.then(async () => {
    if (!authenticationData.isLoggedIn) {
      await import('../../scripts/course/auth-modal.js');
    }
    const courseData = await getCourseData();
    await createCourseBaseTemplate(courseData);
    if (!courseData.started) {
      //  start lesson
      await updateLessonStatus(false);
    }
    if (courseData?.completed) {
      store.dispatch(quizAnswered(true));
    }
    //  quiz completion event subscriber
    store.subscribe(({ quiz }) => quiz, async ({ isCorrect }) => {
      if (isCorrect && !courseData.completed) {
        const updatedCourse = await updateLessonStatus(true);
        store.dispatch(courseDataChange(updatedCourse));
      }
    });
  });
}
