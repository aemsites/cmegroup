import { createCourseBaseTemplate, getCourseData, updateLessonStatus } from '../../scripts/course/course.js';
import { courseDataChange } from '../../scripts/actions/course.js';
import { quizAnswered } from '../../scripts/actions/quiz.js';
import { isFeatureToggled, addFragmentBlock } from '../../scripts/utils.js';
import { setTracking } from '../../scripts/utils/index.js';

const FRAGMENT_URL = '/fragments/courses-lessons/extend-your-learning';
const fireTrackingLessonStandalone = setTracking('custom', 'lesson_complete', 'Lessons and Courses');

if (window.ga) {
  window.ga();
}

async function loadUserProgress(courseData) {
  const { store } = await import('../../scripts/store/store.js');
  if (courseData?.quiz || courseData?.completed) {
    //  quiz prefill
    store.dispatch(quizAnswered(courseData?.quiz || { isCorrect: true }));
  }
  if (!courseData.started) {
    //  start lesson
    await updateLessonStatus(false);
  }
  //  quiz completion event subscriber
  store.subscribe(({ quiz }) => quiz, async ({ quizStatus }) => {
    if (quizStatus?.isCorrect && !courseData.completed) {
      const updatedCourse = await updateLessonStatus(
        true,
        quizStatus?.status ? quizStatus : null,
      );
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
    } else if (quizStatus && !quizStatus.isCorrect && quizStatus !== courseData?.quiz) {
      await updateLessonStatus(false, quizStatus?.status ? quizStatus : null);
    }
  });
}

export default async function lessonStandaloneTemplate() {
  //  static section
  const courseData = await getCourseData();
  await Promise.all([
    createCourseBaseTemplate(courseData),
    addFragmentBlock(FRAGMENT_URL),
  ]);

  //  dynamic section - user progress
  import('../../scripts/modules/Authentication.js').then(({ authentication }) => {
    const { authenticationData } = authentication;
    authenticationData.loginPromise.then(async () => {
      const { isLoggedIn, loginInfo } = authenticationData;
      const data = await getCourseData(loginInfo);
      loadUserProgress(data);
      if (!isLoggedIn && !isFeatureToggled('educationIframe')) {
        import('../../scripts/course/auth-modal.js');
      }
    });
  });
}
