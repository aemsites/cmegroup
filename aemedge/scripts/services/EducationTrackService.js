import {
  apiGet,
  apiPost,
  getResponseData,
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
    this.data = JSON.parse(localStorage.getItem(SYNC_CACHE_KEY));
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
      localStorage.removeItem(SYNC_CACHE_KEY);
    }
  }

  set(moduleId, status) {
    if (!this.data) this.data = [];
    this.data.push({ educationElementId: moduleId, status });
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
    completed: data.status === 'COMPLETED',
    started: !!data.startDate,
    progressPercentage: data.completionPercentage || 0,
    endDate: data.endDate,
    lessons: data.lessons?.map(({ educationElementId, status, startDate }) => ({
      moduleId: educationElementId,
      completed: status === 'COMPLETED',
      started: !!startDate,
    })),
    completedLessons: data.lessons?.filter(({ status }) => status === 'COMPLETED').length,
    totalLessons: data.lessons?.length || 0,
  }
);

/**
 * Calculate course/lesson progress through user local storage
 */
async function getStorageProgress(moduleId) {
  const url = `${urlByEnvType()}/services/education-track/public-progress`;
  try {
    const progress = syncStorage.get();
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
  if (!loggedIn) {
    return getStorageProgress(moduleId);
  }
  const url = `${urlByEnvType()}/services/education-track/${
    moduleType === 'lesson' ? 'progress-for-lesson' : 'progress-for-course'}/${moduleId}`;
  try {
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

/**
 * History progress for current user
 */
export async function getUserProgress() {
  // if (!loggedIn) {
  //   return getStorageProgress(moduleId);
  // }
  const url = `${urlByEnvType()}/services/education-track/progress-for-user`;
  try {
    const response = await apiGet(url);
    const data = getResponseData(response);
    return data;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('EducationService => getUserProgress error:', e);
    return [];
  }
}
