import {
  apiGet,
  apiPost,
  getResponseData,
  isEmpty,
  urlByEnvType,
} from '../utils/index.js';
import { authentication } from '../modules/Authentication.js';

const SYNC_CACHE_KEY = 'course_progress_data';

class SyncStorage {
  syncInProgress;

  constructor() {
    this.data = JSON.parse(localStorage.getItem(SYNC_CACHE_KEY));
    this.syncInProgress = null;
    this.loggedIn = false;
    this.init();
  }

  async init() {
    const { authenticationData } = authentication;
    authenticationData.loginPromise.then(async () => {
      if (authenticationData.isLoggedIn) {
        this.sync();
      }
    });
  }

  async sync() {
    if (!isEmpty(this.data)) {
      let resolvePromise = '';
      this.syncInProgress = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      const progress = this.get();
      // eslint-disable-next-line no-use-before-define
      await postProgress(progress);
      resolvePromise();
      this.data = [];
      localStorage.removeItem(SYNC_CACHE_KEY);
    }
  }

  set(progress) {
    if (!this.data) this.data = [];
    this.data.push(progress);
    localStorage.setItem(SYNC_CACHE_KEY, JSON.stringify(this.data));
    return true;
  }

  get() {
    return this.data;
  }
}

//  sync storage progress (non logged-in users)
const syncStorage = new SyncStorage();

const mapModule = (data) => (
  {
    moduleId: data.educationElementId,
    title: data.title,
    description: data.description,
    completed: data.status === 'COMPLETED',
    progressPercentage: data.completionPercentage || 0,
    lessons: data.lessons?.map((lesson) => ({
      moduleId: lesson.educationElementId,
      title: lesson.title,
      completed: lesson.status === 'COMPLETED',
      started: !!lesson.startDate || lesson.status === 'PROGRESS',
      url: lesson.url,
      quiz: { ...lesson.quiz, isCorrect: lesson.quiz?.status === 'COMPLETED' && lesson?.status === 'COMPLETED' },
    })),
    completedLessons: data.lessons?.filter(({ status }) => status === 'COMPLETED').length,
    totalLessons: data.lessons?.length || 0,
    started: !!data.startDate || data.status === 'PROGRESS',
    endDate: data.endDate,
    updated: data.updated,
    url: data.url,
  }
);

/**
 * Calculate course/lesson progress through user local storage
 */
async function getStorageProgress(moduleId) {
  const url = `${urlByEnvType()}/services/education-track/public-progress`;
  try {
    const progress = syncStorage.get();
    if (!progress) {
      return null;
    }
    const response = await apiPost(url, {
      progress,
    });
    const data = getResponseData(response);
    //  response contains the updated progress
    if (moduleId) {
      const module = [...data.courses, ...data.lessons].find(
        ({ educationElementId }) => educationElementId === moduleId,
      );
      return module ? mapModule(module) : null;
    }
    return null;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('EducationService => getStorageProgress error:', e);
    return null;
  }
}

/**
 * Course/standalone progress for current user
 */
export async function getProgress(moduleId, moduleType) {
  const { isLoggedIn } = authentication.authenticationData;
  if (!isLoggedIn) {
    return getStorageProgress(moduleId);
  }
  const url = `${urlByEnvType()}/services/education-track/${
    moduleType === 'lesson' ? 'progress-for-lesson' : 'progress-for-course'}/${moduleId}`;
  try {
    await syncStorage.syncInProgress;
    const response = await apiGet(url);
    const data = getResponseData(response);
    return mapModule(data);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('EducationService => getProgress error:', e);
    return [];
  }
}

/**
 * Posts bulk lessons status
 */
async function postProgress(
  progress,
) {
  try {
    const url = `${urlByEnvType()}/services/education-track/progress`;
    const response = await apiPost(url, {
      progress,
    });
    return getResponseData(response) || {};
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('EducationService => saveProgress error:', e);
    return null;
  }
}

/**
 * Posts a lesson status and returns the updated parent course progress
 */
export async function postLesson(
  courseId,
  lessonId,
  completed,
  quizStatus,
) {
  const progress = { educationElementId: lessonId, status: completed ? 'COMPLETED' : 'PROGRESS', quizStatus };
  const { isLoggedIn } = authentication.authenticationData;
  if (!isLoggedIn) {
    syncStorage.set(progress);
    return getStorageProgress(courseId || lessonId);
  }

  const data = await postProgress([progress]);
  //  response contains all the affected courses (recalculated) by the updated lesson
  if (data) {
    const module = [...data.courses, ...data.lessons].find(
      ({ educationElementId }) => educationElementId === (courseId || lessonId),
    );
    return module ? mapModule(module) : null;
  }
  return null;
}

/**
 * History progress for current user
 */
export async function getUserProgress() {
  const url = `${urlByEnvType()}/services/education-track/progress-for-user`;
  try {
    await syncStorage.syncInProgress;
    const response = await apiGet(url);
    const data = getResponseData(response);
    const mappedCourses = data.courses?.map(mapModule) || [];
    const mappedLessons = data.lessons?.map(mapModule) || [];
    return {
      courses: mappedCourses,
      lessons: mappedLessons,
    };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('EducationService => getUserProgress error:', e);
    return null;
  }
}

/**
 * Get a list of in progress and recommended courses for current user
 */
export async function getRecommendedCourses(maxItems) {
  const url = `${urlByEnvType()}/services/education-track/recommended-courses?maxItems=${maxItems || 10}`;
  try {
    await syncStorage.syncInProgress;
    const response = await apiGet(url);
    const data = getResponseData(response);
    return {
      ...data,
      progressItems: data.progressItems?.map(mapModule) || [],
    };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('EducationService => getRecommendedCourses error:', e);
    return [];
  }
}
