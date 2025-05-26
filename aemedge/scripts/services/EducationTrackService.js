import {
  apiGetAbsolute,
  apiPostAbsolute,
  getResponseData,
  DataCacheUtil,
  isEmpty,
} from '../utils/index.js';
import { urlByEnvType } from '../utils.js';
import { store } from '../store/store.js';

const SYNC_CACHE_KEY = 'course_progress_data';

let loggedIn = false;
store.subscribe(({ authentication }) => authentication, ({ isLoggedIn }) => {
  loggedIn = isLoggedIn;
});

class SyncStorage {
  syncInProgress;

  constructor() {
    this.data = window.LocalStorageUtil?.get(SYNC_CACHE_KEY, true) || [];
    this.syncInProgress = null;
    this.loggedIn = false;
    this.init();
  }

  async init() {
    store.subscribe(({ authentication }) => authentication, ({ isLoggedIn }) => {
      if (isLoggedIn !== this.loggedIn) {
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
      window.LocalStorageUtil?.remove(SYNC_CACHE_KEY);
    }
  }

  set(moduleId, status) {
    const alreadyInData = this.data.find(
      ({ educationElementId }) => educationElementId === moduleId,
    );
    if (!alreadyInData) {
      this.data.push({ educationElementId: moduleId, status });
    }
    window.LocalStorageUtil?.set(SYNC_CACHE_KEY, this.data);
    return true;
  }

  get() {
    return this.data;
  }
}

//  courses/lessons user progress cache
const progressCache = new DataCacheUtil();
//  sync storage progress (not logged users)
const syncStorage = new SyncStorage();

const mapModule = (data) => (
  {
    moduleId: data.educationElementId,
    completed: data.status === 'COMPLETED',
    started: !!data.startDate,
    progressPercentage: data.completionPercentage,
    endDate: data.endDate,
    lessons: data.lessons?.map(({ educationElementId, status }) => ({
      moduleId: educationElementId,
      completed: status === 'COMPLETED',
    })),
    completedLessons: data.lessons?.filter(({ status }) => status === 'COMPLETED').length,
  }
);

/**
 * Calculate course/lesson progress through user local storage
 */
async function getStorageProgress(moduleId) {
  const url = `${urlByEnvType()}/services/education-track/public-progress`;
  try {
    const progress = syncStorage.get();
    const response = await apiPostAbsolute(url, {
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
 * Course progress for current user
 */
export async function getCourseProgress(courseId) {
  if (!loggedIn) {
    return getStorageProgress(courseId);
  }
  const url = `${urlByEnvType()}/services/education-track/progress-for-course/${courseId}`;
  try {
    const response = await apiGetAbsolute(url);
    const data = getResponseData(response);
    return mapModule(data);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('EducationService => getCourseProgress error:', e);
    return [];
  }
}

/**
 * Standalone progress for current user
 */
export async function getLessonProgress(lessonId) {
  if (!loggedIn) {
    return getStorageProgress(lessonId);
  }
  const url = `${urlByEnvType()}/services/education-track/progress-for-lesson/${lessonId}`;
  try {
    const response = await apiGetAbsolute(url);
    const data = getResponseData(response);
    return mapModule(data);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('EducationService => getLessonProgress error:', e);
    return [];
  }
}

/**
 * All the user progress
 */
async function getUserProgressApi() {
  if (!loggedIn) {
    return getStorageProgress();
  }
  const url = `${urlByEnvType()}/services/education-track/progress-for-user`;
  try {
    const response = await apiGetAbsolute(url);
    const data = getResponseData(response);
    return [
      ...data.courses.map((course) => mapModule(course)),
      ...data.lessons.map((lesson) => mapModule(lesson)),
    ];
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('EducationService => getProgressApi error:', e);
    return [];
  }
}

export async function getUserProgress() {
  return progressCache.getData(
    'userProgress',
    getUserProgressApi,
  );
}

/**
 * Posts bulk lessons status
 */
async function postProgress(
  progress,
) {
  try {
    const url = `${urlByEnvType()}/services/education-track/progress`;
    const response = await apiPostAbsolute(url, {
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
) {
  const progress = { educationElementId: lessonId, status: completed ? 'COMPLETED' : 'PROGRESS' };
  if (!loggedIn) {
    syncStorage.set(lessonId, progress.status);
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
