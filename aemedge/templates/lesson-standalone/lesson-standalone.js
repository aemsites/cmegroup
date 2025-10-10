import { createCourseBaseTemplate, getCourseData, updateLessonStatus } from '../../scripts/course/course.js';
import { authentication } from '../../scripts/modules/Authentication.js';
import { store } from '../../scripts/store/store.js';
import { courseDataChange } from '../../scripts/actions/course.js';
import { quizAnswered } from '../../scripts/actions/quiz.js';
import { isFeatureToggled, addFragmentBlock } from '../../scripts/utils.js';
import { setTracking } from '../../scripts/utils/index.js';

const FRAGMENT_URL = '/fragments/courses-lessons/extend-your-learning';
const fireTrackingLessonStandalone = setTracking('custom', 'lesson_complete', 'Lessons and Courses');

if (window.ga) {
  window.ga();
}

export default function lessonStandaloneTemplate() {
  const { authenticationData } = authentication;
  authenticationData.loginPromise.then(async () => {
    if (!authenticationData.isLoggedIn && !isFeatureToggled('educationIframe')) {
      await import('../../scripts/course/auth-modal.js');
    }
    const courseData = await getCourseData();
    await createCourseBaseTemplate(courseData);
    await addFragmentBlock(FRAGMENT_URL);
    if (!courseData.started) {
      //  start lesson
      await updateLessonStatus(false);
    }
    if (courseData?.completed) {
      store.dispatch(quizAnswered({ isCorrect: true }));
    }
    //  quiz completion event subscriber
    store.subscribe(({ quiz }) => quiz, async ({ quizStatus }) => {
      if (quizStatus?.isCorrect && !courseData.completed) {
        const updatedCourse = await updateLessonStatus(true, quizStatus);
        store.dispatch(courseDataChange(updatedCourse));
        fireTrackingLessonStandalone(
          `Lesson standalone "${courseData.title}" - completed`,
          'completed',
          {
            lessonID: courseData.moduleId,
            parentCourse: '',
            lessonTitle: courseData.title,
          },
        );
      } else if (quizStatus) {
        await updateLessonStatus(false, quizStatus);
      }
    });
  });
}
