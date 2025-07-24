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
    title: data.title,
    description: data.description,
    completed: data.status === 'COMPLETED',
    progressPercentage: data.completionPercentage || 0,
    lessons: data.lessons?.map((lesson) => ({
      moduleId: lesson.educationElementId,
      title: lesson.title,
      completed: lesson.status === 'COMPLETED',
      started: !!lesson.startDate,
    })),
    completedLessons: data.lessons?.filter(({ status }) => status === 'COMPLETED').length,
    totalLessons: data.lessons?.length || 0,
    started: !!data.startDate,
    endDate: data.endDate,
    updated: data.updated,
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
  // mock to go through the LHS scores
  // delete before merge it to main
  const data = {
    courses: [
      {
        courseId: 99390060,
        trackId: 99390091,
        educationElementId: 'Course-share1',
        url: '/drafts/daiana/education/courses/course-share1',
        title: 'Introduction to - CME Group',
        description:
          'Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.',
        assetClass: 'cryptocurrencies',
        status: 'PROGRESS',
        completionPercentage: 50,
        completionOrder: null,
        updated: '2025-07-10T20:24:10.000Z',
        startDate: '2025-07-10T20:24:07.000Z',
        endDate: null,
        lessons: [
          {
            lessonId: 99390072,
            trackId: 99390192,
            educationElementId: 'Lesson1',
            url: '/drafts/daiana/education/courses/course-share1/lesson1',
            title: 'Introduction to - CME Group',
            status: 'COMPLETED',
            attempts: 1,
            updated: '2025-07-10T20:24:10.000Z',
            startDate: '2025-07-10T20:24:07.000Z',
            endDate: '2025-07-10T20:24:10.000Z',
          },
          {
            lessonId: 99390073,
            trackId: null,
            educationElementId: 'Lesson3',
            url: '/drafts/daiana/education/courses/course-share1/lesson3',
            title: 'Introduction to - CME Group',
            status: 'PENDING',
            attempts: 0,
            updated: null,
            startDate: null,
            endDate: null,
          },
        ],
      },
      {
        courseId: 99390059,
        trackId: 99390090,
        educationElementId: 'Course-share',
        url: '/drafts/daiana/education/courses/course-share',
        title: 'Introduction to',
        description:
          'Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.',
        assetClass: 'cryptocurrencies',
        status: 'COMPLETED',
        completionPercentage: 100,
        completionOrder: 5,
        updated: '2025-07-10T20:24:17.000Z',
        startDate: '2025-07-10T20:24:07.000Z',
        endDate: '2025-07-10T20:24:17.000Z',
        lessons: [
          {
            lessonId: 99390070,
            trackId: 99390194,
            educationElementId: 'Lesson2',
            url: '/drafts/daiana/education/courses/course-share/lesson2',
            title: 'Introduction to - CME Group',
            status: 'COMPLETED',
            attempts: 1,
            updated: '2025-07-10T20:24:17.000Z',
            startDate: '2025-07-10T20:24:14.000Z',
            endDate: '2025-07-10T20:24:17.000Z',
          },
          {
            lessonId: 99390071,
            trackId: 99390191,
            educationElementId: 'Lesson1',
            url: '/drafts/daiana/education/courses/course-share/lesson1',
            title: 'Introduction to - CME Group',
            status: 'COMPLETED',
            attempts: 1,
            updated: '2025-07-10T20:24:10.000Z',
            startDate: '2025-07-10T20:24:07.000Z',
            endDate: '2025-07-10T20:24:10.000Z',
          },
        ],
      },
      {
        courseId: 99390057,
        trackId: 99390073,
        educationElementId: 'G-CF-Course',
        url: '/drafts/daiana/education/courses/course-chapter',
        title: 'Introduction to - CME Group',
        description:
          'Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.',
        assetClass: 'cryptocurrencies',
        status: 'COMPLETED',
        completionPercentage: 100,
        completionOrder: 4,
        updated: '2025-06-30T17:06:28.000Z',
        startDate: '2025-06-17T19:49:09.000Z',
        endDate: '2025-06-30T17:06:28.000Z',
        lessons: [
          {
            lessonId: 99390061,
            trackId: 99390117,
            educationElementId: 'G-CF-A-01',
            url: '/drafts/daiana/education/courses/course-chapter/chapter1/lesson-chapter',
            title: 'Introduction to - CME Group',
            status: 'COMPLETED',
            attempts: 0,
            updated: '2025-06-17T19:50:54.000Z',
            startDate: '2025-06-17T19:50:54.000Z',
            endDate: '2025-06-17T19:50:54.000Z',
          },
          {
            lessonId: 99390062,
            trackId: 99390118,
            educationElementId: 'G-CF-A-02',
            url: '/drafts/daiana/education/courses/course-chapter/chapter1/lesson-chapter-copy',
            title: 'Introduction to - CME Group',
            status: 'COMPLETED',
            attempts: 0,
            updated: '2025-06-19T17:40:02.000Z',
            startDate: '2025-06-17T19:51:05.000Z',
            endDate: '2025-06-19T17:40:02.000Z',
          },
          {
            lessonId: 99390063,
            trackId: 99390115,
            educationElementId: 'G-CF-A-03',
            url: '/drafts/daiana/education/courses/course-chapter/chapter1-copy/lesson-chapter2-copy',
            title: 'Introduction to - CME Group',
            status: 'COMPLETED',
            attempts: 0,
            updated: '2025-06-17T19:50:30.000Z',
            startDate: '2025-06-17T19:50:30.000Z',
            endDate: '2025-06-17T19:50:30.000Z',
          },
          {
            lessonId: 99390064,
            trackId: 99390116,
            educationElementId: 'G-CF-A-04',
            url: '/drafts/daiana/education/courses/course-chapter/chapter1-copy/lesson-chapter-copy',
            title: 'Introduction to - CME Group',
            status: 'COMPLETED',
            attempts: 0,
            updated: '2025-06-17T19:50:39.000Z',
            startDate: '2025-06-17T19:50:39.000Z',
            endDate: '2025-06-17T19:50:39.000Z',
          },
          {
            lessonId: 99390065,
            trackId: 99390114,
            educationElementId: 'G-CF-A-05',
            url: '/drafts/daiana/education/courses/course-chapter/chapter1-copy/lesson-chapter2',
            title: 'Introduction to - CME Group',
            status: 'COMPLETED',
            attempts: 0,
            updated: '2025-06-17T19:50:06.000Z',
            startDate: '2025-06-17T19:50:06.000Z',
            endDate: '2025-06-17T19:50:06.000Z',
          },
          {
            lessonId: 99390066,
            trackId: 99390112,
            educationElementId: 'G-CF-A-06',
            url: '/drafts/daiana/education/courses/course-chapter/chapter1/lesson-chapter-1',
            title: 'Introduction to - CME Group',
            status: 'COMPLETED',
            attempts: 3,
            updated: '2025-06-30T17:06:28.000Z',
            startDate: '2025-06-17T19:49:09.000Z',
            endDate: '2025-06-30T17:06:28.000Z',
          },
          {
            lessonId: 99390067,
            trackId: 99390113,
            educationElementId: 'G-CF-A-07',
            url: '/drafts/daiana/education/courses/course-chapter/lesson-chapter',
            title: 'Introduction to - CME Group',
            status: 'COMPLETED',
            attempts: 0,
            updated: '2025-06-17T19:50:01.000Z',
            startDate: '2025-06-17T19:50:01.000Z',
            endDate: '2025-06-17T19:50:01.000Z',
          },
        ],
      },
    ],
    lessons: [
      {
        lessonId: 99390068,
        trackId: 99390186,
        educationElementId: 'lesson-standalon-id',
        url: '/drafts/daiana/education/lessons/standalone',
        title: 'lesson Standalone Title',
        description:
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis ...',
        status: 'PROGRESS',
        attempts: 2,
        updated: '2025-07-10T19:37:47.000Z',
        startDate: '2025-07-02T14:34:29.000Z',
        endDate: null,
      },
      {
        lessonId: 99390069,
        trackId: 99390193,
        educationElementId: 'Lesson2',
        url: '/drafts/daiana/education/lessons/lesson2',
        title: 'Introduction to - CME Group',
        description:
          'Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.',
        status: 'COMPLETED',
        attempts: 1,
        updated: '2025-07-10T20:24:17.000Z',
        startDate: '2025-07-10T20:24:14.000Z',
        endDate: '2025-07-10T20:24:17.000Z',
      },
    ],
  };

  const mappedCourses = data.courses?.map(mapModule) || [];
  const mappedLessons = data.lessons?.map(mapModule) || [];
  return {
    courses: mappedCourses,
    lessons: mappedLessons,
  };
  // const url = `${urlByEnvType()}/services/education-track/progress-for-user`;
  // try {
  //   const response = await apiGet(url);
  //   const data = getResponseData(response);
  //   const mappedCourses = data.courses?.map(mapModule) || [];
  //   const mappedLessons = data.lessons?.map(mapModule) || [];
  //   return {
  //     courses: mappedCourses,
  //     lessons: mappedLessons,
  //   };
  // } catch (e) {
  //   // eslint-disable-next-line no-console
  //   console.error('EducationService => getUserProgress error:', e);
  //   return [];
  // }
}
