import {
  createCourseBaseTemplate,
  getCourseData,
  updateLessonStatus,
} from '../../scripts/course/course.js';
import { addCourseCertificate } from '../../scripts/course/certificate.js';
import { i18n, isFeatureToggled } from '../../scripts/utils.js';
import { courseDataChange } from '../../scripts/actions/course.js';
import { quizAnswered } from '../../scripts/actions/quiz.js';

if (window.ga) {
  window.ga();
}

async function loadUserProgress(courseData, authenticationData) {
  const { isLoggedIn, loginInfo } = authenticationData;
  const { store } = await import('../../scripts/store/store.js');
  //  dispatch courseData event
  store.dispatch(courseDataChange({ ...courseData }));
  //  quiz prefill
  if (courseData?.quiz || courseData?.completed) {
    store.dispatch(quizAnswered(courseData?.quiz || { isCorrect: true }));
  }
  const { setTracking } = await import('../../scripts/gtm.js').catch(() => ({
    // eslint-disable-next-line no-console
    setTracking: () => () => console.warn('GTM is unavailable'),
  }));
  const fireTrackingAssessment = setTracking('custom', 'assessment_complete', 'Assessments');
  //  quiz completion event subscriber
  store.subscribe(({ quiz }) => quiz, async ({ quizStatus }) => {
    if (quizStatus?.isCorrect && !courseData.completed) {
      const updatedCourse = await updateLessonStatus(
        true,
        quizStatus?.status ? quizStatus : null,
      );
      store.dispatch(courseDataChange(updatedCourse));
      fireTrackingAssessment(
        `Assessment "${courseData.title}" - completed`,
        'completed',
        {
          assessmentID: courseData.moduleId,
          parentCourse: '',
          assessmentTitle: courseData.title,
        },
      );
    } else if (quizStatus && !quizStatus.isCorrect && quizStatus !== courseData?.quiz) {
      //  quiz tracking
      await updateLessonStatus(false, quizStatus?.status ? quizStatus : null);
    }
  });
  //  courseData subscriber
  store.subscribe(({ courseData: course }) => course, async (course) => {
    if (course?.completed) {
      const certificateTitle = await i18n('Certificate of Assessment Completion');
      addCourseCertificate({
        isLoggedIn,
        userName: loginInfo?.userName,
        moduleId: course?.moduleId,
        lessonTitle: course?.title,
        completedModule: course?.endDate,
        // the modal is opened automatically when the user completes the assessment
        showModal: !courseData?.completed,
        certificateTitle,
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
      loadUserProgress(data, authenticationData);
      if (!isLoggedIn && !isFeatureToggled('educationIframe')) {
        import('../../scripts/course/auth-modal.js');
      }
    });
  });
}
