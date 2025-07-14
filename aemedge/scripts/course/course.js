import ffetch from '../ffetch.js';
import {
  createElement,
  getEnvType,
  getCurrentLangInWords,
  i18n,
} from '../utils.js';
import { getMetadata } from '../aem.js';
import { getProgress, postLesson } from '../services/EducationTrackService.js';

const COURSES_BASE_PATH = '/education/courses/';
const LESSONS_BASE_PATH = '/education/lessons/';
const COURSES_INDEX_PATH = '/courses-index.json';
const TEMPLATES = ['course', 'chapter', 'lesson', 'lesson-standalone'];
const CACHE_KEY = 'course_data';
// TODO: we need to review this cache timing again.
const CACHE_EXPIRATION_PROD = 0; // 15 * 60 * 1000; // 15 minutes in milliseconds
const CACHE_EXPIRATION_STAGE = 0; // 30 * 1000; // 30 seconds in milliseconds

const isLessonStandalone = (template) => template.toLowerCase() === 'lesson-standalone';

const getCachedCourseData = (coursePath) => {
  const cachedData = localStorage.getItem(CACHE_KEY);
  const envType = getEnvType();
  if (cachedData) {
    const { path, data, timestamp } = JSON.parse(cachedData);
    // Use cached data if it's for the current course
    const cacheAge = Date.now() - timestamp;
    if (path === coursePath
      && cacheAge < (envType === 'prod' ? CACHE_EXPIRATION_PROD : CACHE_EXPIRATION_STAGE)) {
      return data;
    }
  }
  return null;
};

const addCourseDataToCache = (coursePath, courseData) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      path: coursePath,
      data: courseData,
      timestamp: Date.now(),
    }));
  } catch (cacheError) {
    // eslint-disable-next-line no-console
    console.warn('Failed to cache course data:', cacheError);
  }
};

/**
 * Get the course data for the current course
 * It is used for the course page and the lesson page
 * Returns the cached data if it exists
 * Otherwise, it fetches the data from the server and caches it
 * @returns {Object} The course data
 */
export async function getCourseData() {
  try {
    const currentPath = window.location.pathname;
    const template = getMetadata('template');
    if (!TEMPLATES.includes(template.toLowerCase())) {
      throw new Error('Not a course page');
    }

    const courseData = {
      isLessonStandalone: isLessonStandalone(template),
      hasChapters: false, // Will be determined by data
      chapters: [],
      lessons: [],
    };

    let basePath = COURSES_BASE_PATH;
    if (isLessonStandalone(template) && currentPath.includes('lessons')) {
      basePath = LESSONS_BASE_PATH;
    }

    const relevantPath = currentPath.split(basePath)[1];
    const preBasePath = (currentPath.split(basePath)[0] === '' || currentPath.split(basePath)[0] === '/') ? '' : currentPath.split(basePath)[0];

    const course = (template !== 'lesson-standalone') ? relevantPath.split('/')[0] : relevantPath;
    if (template !== 'lesson-standalone' && !course) {
      throw new Error('No course found in the path');
    }

    // build the full course path or lesson path in case of standalone lesson
    const coursePath = ((template !== 'lesson-standalone') ? `${preBasePath}${COURSES_BASE_PATH}${course}` : `${preBasePath}${LESSONS_BASE_PATH}${course}`).replace(/\.html$/, '').replace(/^\/qa/, '');

    // Check if we have cached data for this course
    const cachedData = getCachedCourseData(coursePath);
    if (cachedData) {
      return cachedData;
    }

    // Get entries from query-index for course content
    const entries = await ffetch(COURSES_INDEX_PATH)
      .filter((entry) => TEMPLATES.includes(entry.template.toLowerCase())
        && (entry.path === coursePath
          || entry.path.startsWith(`${coursePath}/`)))
      .all();

    // If the page is a lesson standalone, return the first entry
    // ideally there should be only one entry in this case
    if (isLessonStandalone(template)) {
      const lessonProgress = await getProgress(entries[0]?.moduleId, 'lesson');
      Object.assign(courseData, entries[0], lessonProgress);
      addCourseDataToCache(coursePath, courseData);
      return courseData;
    }

    // Determine if it course has chapters
    courseData.hasChapters = entries.some((entry) => entry.template.toLowerCase() === 'chapter');

    // Sort entries so that course comes first, then chapters, then lessons
    // This ensures chapters are processed before their lessons
    entries.sort((a, b) => {
      const aType = a.template.toLowerCase();
      const bType = b.template.toLowerCase();

      if (aType === 'course') return -1;
      if (bType === 'course') return 1;

      if (aType === 'chapter' && bType === 'lesson') return -1;
      if (aType === 'lesson' && bType === 'chapter') return 1;

      return 0;
    });

    //  course progress for current user
    const courseProgress = await getProgress(entries[0]?.moduleId, 'course');
    const { lessons: lessonsProgress, ...currentCourseProgress } = courseProgress || {};

    entries.forEach((entry) => {
      if (entry.template.toLowerCase() === 'course' || entry.template.toLowerCase() === 'lesson-standalone') {
        Object.assign(courseData, entry, currentCourseProgress);
      } else if (entry.template.toLowerCase() === 'chapter') {
        courseData.chapters.push({
          ...entry,
          lessons: [],
        });
      } else if (entry.template.toLowerCase() === 'lesson') {
        const lessonProgress = lessonsProgress?.find(
          ({ moduleId }) => moduleId === entry.moduleId,
        );
        const chapter = courseData.chapters.find((ch) => entry.path.startsWith(`${ch.path}/`));
        if (chapter) {
          chapter.lessons.push({
            ...entry,
            // Split into multiple lines to reduce line length
            pathSuffix: entry.path.split(chapter.path)[1].substring(1),
            ...lessonProgress,
          });
        } else {
          // Handling case when lesson is not part of any chapter
          courseData.lessons.push({
            ...entry,
            pathSuffix: entry.path.split(coursePath)[1].substring(1),
            ...lessonProgress,
          });
        }
      }
    });
    // Sort chapters and lessons based on modulesOrder
    if (courseData.hasChapters) {
      courseData.chapters.forEach((chapter) => {
        const { modulesOrder } = chapter;
        if (modulesOrder && typeof modulesOrder === 'string') {
          const modulesOrderArray = modulesOrder.split(',').map((item) => item.trim());
          chapter.lessons.sort((a, b) => modulesOrderArray.indexOf(a.pathSuffix)
            - modulesOrderArray.indexOf(b.pathSuffix));
        }
      });
    }

    const { modulesOrder } = courseData;
    if (modulesOrder && typeof modulesOrder === 'string') {
      const modulesOrderArray = modulesOrder.split(',').map((item) => item.trim());
      courseData.lessons.sort((a, b) => modulesOrderArray.indexOf(a.pathSuffix)
          - modulesOrderArray.indexOf(b.pathSuffix));
    }

    addCourseDataToCache(coursePath, courseData);
    return courseData;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error loading course data: ', error);
    return null;
  }
}

export function getOrderedLessons(courseData) {
  const { modulesOrder } = courseData;

  if (modulesOrder && typeof modulesOrder === 'string') {
    const modulesOrderArray = modulesOrder.split(',').map((item) => item.trim());

    // Create array of items (chapters and lessons) to sort at root level
    const rootItems = [
      ...(courseData.chapters || []),
      ...(courseData.lessons || []),
    ];

    // Sort chapters and lessons at root level based on modulesOrder
    rootItems.sort((a, b) => modulesOrderArray.indexOf(a.pathSuffix || a.path)
      - modulesOrderArray.indexOf(b.pathSuffix || b.path));

    // Process the sorted items and collect lessons
    const allLessons = [];

    rootItems.forEach((item) => {
      if (item.template && item.template.toLowerCase() === 'chapter') {
        // Sort lessons within this chapter
        const { lessons, modulesOrder: chModulesOrder } = item;
        if (lessons && lessons.length > 0) {
          if (chModulesOrder && typeof chModulesOrder === 'string') {
            const chModulesOrderArray = chModulesOrder.split(',').map((chItem) => chItem.trim());
            lessons.sort((a, b) => chModulesOrderArray.indexOf(a.pathSuffix || a.path)
              - chModulesOrderArray.indexOf(b.pathSuffix || b.path));
          }
          // Add all lessons from this chapter to the result
          allLessons.push(...lessons);
        }
      } else {
        // This is a lesson at root level, add it directly
        allLessons.push(item);
      }
    });

    return allLessons;
  }

  // Fallback: if no modulesOrder, just return all lessons unsorted
  return [
    ...(courseData.chapters?.flatMap(({ lessons: chLessons }) => chLessons) || []),
    ...(courseData.lessons || []),
  ];
}

/**
 * Create the base template for a course page
 * It is common for different course templates: course & lesson
 * Add header using metadata values
 */
export async function createCourseBaseTemplate(courseData) {
  const main = document.querySelector('main');
  const courseHeading = main.querySelector('.section').firstChild;
  const header = createElement('div', { class: 'course-header' });

  // Get metadata values
  const readTime = getMetadata('read-time');
  const template = getMetadata('template');

  if (readTime) {
    const readTimeIcon = createElement('img', { src: '/aemedge/icons/timer.svg' });
    const readTimeIconSpan = createElement('span', { class: 'icon icon-timer' }, readTimeIcon);
    const readTimeValue = createElement('span', { class: 'value' }, readTime);
    const readTimeElement = createElement('div', { class: 'metadata read-time' }, readTimeIconSpan, readTimeValue);
    header.appendChild(readTimeElement);
  } else { // if no read time, add empty div
    const readTimeElement = createElement('div', { class: 'metadata read-time' });
    header.appendChild(readTimeElement);
  }

  const [courseLabel, lessonLabel, ofLabel, premiumLabel] = await Promise.all([
    i18n('Course'),
    i18n('Lesson'),
    i18n('of'),
    i18n('Premium'),
  ]);

  if (template.toLowerCase() === 'course') {
    const type = createElement('div', { class: 'metadata type' });
    const isPremium = getMetadata('ispremium');
    if (isPremium) {
      type.textContent = `${premiumLabel} ${courseLabel}`;
    } else {
      type.textContent = courseLabel;
    }
    header.appendChild(type);
  } else if (template.toLowerCase() === 'lesson' || template.toLowerCase() === 'lesson-standalone') {
    const type = createElement('div', { class: 'metadata type' });
    type.textContent = lessonLabel;
    const lessons = getOrderedLessons(courseData);
    const lessonIndex = lessons.findIndex(({ path }) => path === window.location.pathname);
    if (lessonIndex !== -1) {
      type.textContent += ` ${lessonIndex + 1} ${ofLabel} ${lessons.length}`;
    }
    header.appendChild(type);
  }

  const currentLanguage = getCurrentLangInWords();
  const language = createElement('div', { class: 'metadata language' }, currentLanguage);
  header.appendChild(language);

  courseHeading?.before(header);
}

export function getCurrentLesson(courseData) {
  const currentPath = window.location.pathname;
  const lessons = [
    ...(courseData.chapters?.flatMap(({ lessons: chLessons }) => chLessons) || []),
    ...courseData.lessons];
  return lessons.find(({ path }) => currentPath === path);
}

/**
 * Updates the current module status
 */
export async function updateLessonStatus(isCompleted) {
  const courseData = await getCourseData();
  const currentLesson = courseData.isLessonStandalone ? courseData : getCurrentLesson(courseData);
  if (!currentLesson || !currentLesson.moduleId) {
    // eslint-disable-next-line no-console
    console.error('Error getting lesson ID');
    return null;
  }
  const updatedCourse = await postLesson(courseData.moduleId, currentLesson.moduleId, isCompleted);
  if (updatedCourse && isCompleted) {
    const { lessons: lessonsProgress, ...courseProgress } = updatedCourse;
    Object.assign(courseData, courseProgress);
    if (!courseData.isLessonStandalone) {
      const lessons = [
        ...courseData.chapters?.flatMap(({ lessons: chLessons }) => chLessons) || [],
        ...courseData.lessons];
      lessonsProgress.forEach((lessonProgress) => {
        const lesson = lessons?.find(
          ({ moduleId }) => moduleId === lessonProgress.moduleId,
        );
        if (lesson) {
          Object.assign(lesson, lessonProgress);
        }
      });
    }
  } else {
    return courseData;
  }
  //  updates cache
  addCourseDataToCache(courseData.path, courseData);
  return courseData;
}
