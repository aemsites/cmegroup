import ffetch from '../ffetch.js';
import { createElement, getEnvType } from '../utils.js';
import { getMetadata } from '../aem.js';

const COURSES_BASE_PATH = '/education/courses/';
const COURSES_INDEX_PATH = '/courses-index.json';
const TEMPLATES = ['course', 'chapter', 'lesson'];
const CACHE_KEY = 'course_data';
const CACHE_EXPIRATION = 60 * 60 * 1000; // 1 hour in milliseconds
const LANGUAGE_MAP = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italian',
  he: 'עברית',
  ko: '한국어',
  nl: 'Dutch',
  'cn-s': '中文(简体)',
  'cn-t': '中文(繁體)',
  pt: 'Português',
  ar: 'العربية',
};

const getCachedCourseData = (coursePath) => {
  const cachedData = localStorage.getItem(CACHE_KEY);
  const envType = getEnvType();
  if (cachedData && envType === 'prod') {
    const { path, data, timestamp } = JSON.parse(cachedData);
    // Use cached data if it's for the current course and not older than 1 hour
    const cacheAge = Date.now() - timestamp;
    if (path === coursePath && cacheAge < CACHE_EXPIRATION) {
      return data;
    }
  }
  return null;
};

export async function getCourseData() {
  try {
    const currentPath = window.location.pathname;
    const relevantPath = currentPath.split(COURSES_BASE_PATH)[1];
    if (!relevantPath) {
      throw new Error('Not a course page');
    }
    const course = relevantPath.split('/')[0];
    if (!course) {
      throw new Error('No course found in the path');
    }

    // build the full course path
    const coursePath = `${COURSES_BASE_PATH}${course}`;

    // Check if we have cached data for this course
    const cachedData = getCachedCourseData(coursePath);
    if (cachedData) {
      return cachedData;
    }

    const courseData = {
      hasChapters: false, // Will be determined by data
      chapters: [],
      lessons: [],
    };

    // Get entries from query-index for course content
    const entries = await ffetch(window.location.origin + COURSES_INDEX_PATH)
      .filter((entry) => TEMPLATES.includes(entry.template.toLowerCase())
        && entry.path.startsWith(coursePath))
      .all();

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

    entries.forEach((entry) => {
      if (entry.template.toLowerCase() === 'course') {
        courseData.title = entry.moduleTitle;
        courseData.path = entry.path;
        courseData.subModulesOrder = entry.subModulesOrder;
      } else if (entry.template.toLowerCase() === 'chapter') {
        courseData.chapters.push({
          title: entry.moduleTitle,
          path: entry.path,
          pathSuffix: entry.path.split(coursePath)[1].substring(1),
          subModulesOrder: entry.subModulesOrder,
          lessons: [],
        });
      } else if (entry.template.toLowerCase() === 'lesson') {
        if (courseData.hasChapters) {
          // Split into multiple lines to reduce line length
          const chapterObj = courseData.chapters.find((ch) => entry.path.startsWith(ch.path));
          chapterObj?.lessons.push({
            title: entry.moduleTitle,
            path: entry.path,
            // Split into multiple lines to reduce line length
            pathSuffix: entry.path.split(chapterObj.path)[1].substring(1),
          });
        } else {
          courseData.lessons.push({
            title: entry.moduleTitle,
            path: entry.path,
            pathSuffix: entry.path.split(coursePath)[1].substring(1),
          });
        }
      }
    });
    // Sort chapters and lessons based on subModulesOrder
    if (courseData.hasChapters) {
      courseData.chapters.forEach((chapter) => {
        const { subModulesOrder } = chapter;
        const subModulesOrderArray = subModulesOrder.split(',').map((item) => item.trim());
        chapter.lessons.sort((a, b) => subModulesOrderArray.indexOf(a.pathSuffix)
          - subModulesOrderArray.indexOf(b.pathSuffix));
      });
    } else {
      const { subModulesOrder } = courseData;
      if (subModulesOrder) {
        const subModulesOrderArray = subModulesOrder.split(',').map((item) => item.trim());
        courseData.lessons.sort((a, b) => subModulesOrderArray.indexOf(a.pathSuffix)
          - subModulesOrderArray.indexOf(b.pathSuffix));
      }
    }

    // Cache the course data with path and timestamp
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

    return courseData;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error loading course data: ', error);
    return null;
  }
}

const getCurrentLanguage = () => {
  const path = window.location.pathname;
  const language = path.split('/')[1];
  return LANGUAGE_MAP[language] || 'English';
};

export function createCourseBaseTemplate() {
  const main = document.querySelector('main');
  const courseHeading = main.querySelector('h1');
  const header = document.createElement('div');
  header.classList.add('course-header');

  // Get metadata values
  const readTime = getMetadata('read-time');
  const template = getMetadata('template');

  const readTimeIcon = createElement('img', { src: '/aemedge/icons/timer.svg' });
  const readTimeIconSpan = createElement('span', { class: 'icon icon-timer' }, readTimeIcon);
  const readTimeElement = createElement('div', { class: 'metadata read-time' }, `${readTime}`);
  if (readTime) {
    readTimeElement.prepend(readTimeIconSpan);
  }
  header.appendChild(readTimeElement);

  if (template.toLowerCase() === 'course') {
    const type = createElement('div', { class: 'metadata type' });
    type.textContent = 'Course';
    header.appendChild(type);
  } else if (template.toLowerCase() === 'lesson') {
    const type = createElement('div', { class: 'metadata type' });
    type.textContent = 'Lesson';
    header.appendChild(type);
  }

  const currentLanguage = getCurrentLanguage();
  const language = createElement('div', { class: 'metadata language' }, currentLanguage);
  header.appendChild(language);

  courseHeading.before(header);
}
