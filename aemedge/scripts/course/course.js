import {
  createElement,
  i18n,
  parseTime,
  getLanguageLabel,
} from '../utils.js';
import { getEnvType } from '../utils/index.js';
import {
  getMetadata,
  buildBlock,
  decorateBlock,
  loadBlock,
} from '../aem.js';
import { getIndexedContent } from '../indexing.js';
import {
  isLegacyContent,
  normalizeLegacyPath,
  legacyEducationTemplates,
} from '../legacyContentMapping.js';

const COURSES_BASE_PATH = '/education/courses/';
const LESSONS_BASE_PATH = '/education/lessons/';
const ASSESSMENTS_BASE_PATH = '/education/assessments/';
const TEMPLATES = ['course', 'chapter', 'lesson', 'lesson-standalone', 'assessment'];
const CACHE_KEY = 'course_data';
const CACHE_EXPIRATION_PROD = 15 * 60 * 1000; // 15 minutes in milliseconds
const CACHE_EXPIRATION_STAGE = 60 * 1000; // 60 seconds in milliseconds

const isStandalone = (template) => ['lesson-standalone', 'assessment'].includes(template?.toLowerCase());

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

const parseCurrentPath = () => {
  const path = window.location.pathname.replace(/\.html$/, '').replace(/^\/qa/, '');
  let basePath;
  if (path.startsWith(ASSESSMENTS_BASE_PATH)) {
    basePath = ASSESSMENTS_BASE_PATH;
  } else if (path.startsWith(LESSONS_BASE_PATH)) {
    basePath = LESSONS_BASE_PATH;
  } else {
    basePath = COURSES_BASE_PATH;
  }
  const relevantPath = path.split(basePath)[1];
  return { path, basePath, relevantPath };
};

/**
 * Get the course data for the current course
 * It is used for the course page and the lesson page
 * Returns the cached data if it exists
 * Otherwise, it fetches the data from the server and caches it
 * @returns {Object} The course data
 */
export async function getCourseData(loginInfo) {
  try {
    const template = getMetadata('template');
    if (!TEMPLATES.includes(template.toLowerCase())) {
      throw new Error('Not a course page');
    }

    const { basePath, relevantPath } = parseCurrentPath();
    const course = relevantPath.split('/')[0];
    if (!course) {
      throw new Error('No course/lesson module found in the path');
    }

    // build the full course path or lesson path in case of standalone lesson
    const coursePath = `${basePath}${course}`;

    // Check if we have cached data for this course
    const cachedData = getCachedCourseData(coursePath);
    if (cachedData && !cachedData.updated && loginInfo) {
      //  courseData with user progress
      const data = await getCourseDataProgress(cachedData);
      addCourseDataToCache(data.path, data);
      return data;
    }
    if (cachedData) {
      return cachedData;
    }

    // Get entries from query-index for course content
    const indexFilter = {
      basePaths: [coursePath],
      templates: TEMPLATES,
      limit: 1000,
    };
    const indexedContent = await getIndexedContent(indexFilter);
    const entries = indexedContent.map((module) => ({
      path: module.path,
      title: module.title,
      moduleTitle: module.metadata['module-title'],
      template: module.template.toLowerCase(),
      moduleId: module.metadata['module-id'],
      modulesOrder: module.metadata['modules-order'],
    }));

    const courseData = {
      isStandalone: isStandalone(template),
      hasChapters: false, // Will be determined by data
      chapters: [],
      lessons: [],
    };

    // If the page is a standalone module, return the first entry
    // ideally there should be only one entry in this case
    if (isStandalone(template)) {
      Object.assign(courseData, entries[0]);
      const data = !loginInfo ? courseData : await getCourseDataProgress(courseData);
      addCourseDataToCache(coursePath, data);
      return data;
    }

    // Determine if it course has chapters
    courseData.hasChapters = entries.some((entry) => entry.template === 'chapter');

    // Sort entries so that course comes first, then chapters, then lessons
    // This ensures chapters are processed before their lessons
    entries.sort((a, b) => {
      const aType = a.template;
      const bType = b.template;

      if (aType === 'course') return -1;
      if (bType === 'course') return 1;

      if (aType === 'chapter' && bType === 'lesson') return -1;
      if (aType === 'lesson' && bType === 'chapter') return 1;

      return 0;
    });

    entries.forEach((entry) => {
      if (entry.template === 'course' || entries.length === 1) {
        Object.assign(courseData, entry);
      } else if (entry.template === 'chapter') {
        courseData.chapters.push({
          ...entry,
          lessons: [],
        });
      } else if (entry.template === 'lesson' || entry.template === 'lesson-standalone') {
        const chapter = courseData.chapters.find((ch) => entry.path.startsWith(`${ch.path}/`));
        if (chapter) {
          chapter.lessons.push({
            ...entry,
            // Split into multiple lines to reduce line length
            pathSuffix: entry.path.split(chapter.path)[1].substring(1),
          });
        } else {
          // Handling case when lesson is not part of any chapter
          courseData.lessons.push({
            ...entry,
            pathSuffix: entry.path.split(coursePath)[1].substring(1),
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

    const data = !loginInfo ? courseData : await getCourseDataProgress(courseData);
    addCourseDataToCache(coursePath, data);
    return data;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error loading course data: ', error);
    return null;
  }
}

export function flattenLessons(courseData) {
  const lessons = courseData.lessons || [];
  const chapters = courseData.chapters || [];
  const modulesOrder = courseData.modulesOrder?.split(',').map((s) => s.trim()) || [];

  const flatLessons = [];

  const lessonMap = new Map(
    lessons.map((lesson) => [lesson.pathSuffix, lesson]),
  );

  const chapterMap = new Map(
    chapters.map((chapter) => [
      chapter.path.split('/').pop(),
      chapter.lessons?.map((lesson) => ({
        ...lesson,
        chapterPath: chapter.path,
      })) || [],
    ]),
  );

  modulesOrder.forEach((key) => {
    if (lessonMap.has(key)) {
      flatLessons.push({ ...lessonMap.get(key), chapterPath: null });
    } else if (chapterMap.has(key)) {
      flatLessons.push(...chapterMap.get(key));
    }
  });

  return flatLessons;
}

async function getCourseDataProgress(courseData) {
  return import('../services/EducationTrackService.js').then(async ({ getProgress }) => {
    if (isStandalone(courseData.template)) {
      //  standalone progress
      const lessonProgress = await getProgress(courseData.moduleId, 'lesson');
      Object.assign(courseData, lessonProgress);
      return courseData;
    }
    //  course progress
    const courseProgress = await getProgress(courseData.moduleId, 'course');
    const { lessons: lessonsProgress, ...currentCourseProgress } = courseProgress || {};
    Object.assign(courseData, currentCourseProgress);
    const lessons = [
      ...(courseData.chapters?.flatMap(({ lessons: chLessons }) => chLessons) || []),
      ...courseData.lessons];
    lessons.forEach((lesson) => {
      const lessonProgress = lessonsProgress?.find(
        ({ moduleId }) => moduleId === lesson.moduleId,
      );
      Object.assign(lesson, lessonProgress);
    });
    return courseData;
  });
}

async function buildLanguageLinks() {
  const template = getMetadata('template');
  const id = getMetadata('module-id');
  const { relevantPath } = parseCurrentPath();
  const indexFilter = {
    templates: [template, ...legacyEducationTemplates],
    metadataOr: { 'module-id': id, moduleId: id, courseId: id },
    limit: 100,
  };
  const indexedContent = await getIndexedContent(indexFilter);
  const filteredContent = indexedContent.filter(
    ({ path }) => path.endsWith(relevantPath),
  );
  if (filteredContent.length <= 1) {
    return createElement('div');
  }
  const links = filteredContent.map((content) => {
    const isLegacy = isLegacyContent(content);
    const { path, language } = content;
    const link = createElement('a', { href: isLegacy ? normalizeLegacyPath(path) : path });
    link.innerText = getLanguageLabel(language);
    return createElement('li', null, link);
  });
  return createElement('ul', { class: 'language-selector-options' }, links);
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

  const [
    courseLabel,
    lessonLabel,
    assessmentLabel,
    ofLabel,
    premiumLabel,
    readTimeParsed,
  ] = await Promise.all([
    i18n('Course'),
    i18n('Lesson'),
    i18n('Assessment'),
    i18n('of'),
    i18n('Premium'),
    parseTime(readTime),
  ]);

  if (readTime) {
    const readTimeIcon = createElement('img', { src: '/aemedge/icons/timer.svg' });
    const readTimeIconSpan = createElement('span', { class: 'icon icon-timer' }, readTimeIcon);
    const readTimeValue = createElement('span', { class: 'value' }, readTimeParsed);
    const readTimeElement = createElement('div', { class: 'metadata read-time' }, readTimeIconSpan, readTimeValue);
    header.appendChild(readTimeElement);
  } else { // if no read time, add empty div
    const readTimeElement = createElement('div', { class: 'metadata read-time' });
    header.appendChild(readTimeElement);
  }

  const isPremium = getMetadata('ispremium');

  if (template.toLowerCase() === 'course') {
    const type = createElement('div', { class: 'metadata type' });
    if (isPremium) {
      type.textContent = `${premiumLabel} ${courseLabel}`;
    } else {
      type.textContent = courseLabel;
    }
    header.appendChild(type);
  } else if (template.toLowerCase() === 'assessment') {
    const type = createElement('div', { class: 'metadata type' });
    if (isPremium) {
      type.textContent = `${premiumLabel} ${assessmentLabel}`;
    } else {
      type.textContent = assessmentLabel;
    }
    header.appendChild(type);
  } else if (template.toLowerCase() === 'lesson' || template.toLowerCase() === 'lesson-standalone') {
    const type = createElement('div', { class: 'metadata type' });
    type.textContent = lessonLabel;
    const { path: currentPath } = parseCurrentPath();
    const modules = [{ lessons: courseData.lessons }, ...courseData.chapters];
    // eslint-disable-next-line no-restricted-syntax
    for (const module of modules) {
      const lessonIndex = module.lessons.findIndex(({ path }) => path === currentPath);
      if (lessonIndex !== -1) {
        type.textContent += ` ${lessonIndex + 1} ${ofLabel} ${module.lessons.length}`;
        break;
      }
    }
    header.appendChild(type);
    if (isPremium) {
      const lessonPremiumLabel = createElement('div', { class: 'premium-label' });
      lessonPremiumLabel.textContent = premiumLabel;
      courseHeading?.nextElementSibling?.querySelector('h1')?.before(lessonPremiumLabel);
    }
  }

  const languageSelector = buildBlock('language-selector', await buildLanguageLinks());
  const language = createElement('div', { class: 'metadata language' }, languageSelector);
  decorateBlock(languageSelector);
  await loadBlock(languageSelector);
  header.appendChild(language);

  courseHeading?.before(header);
}

export function getCurrentLesson(courseData) {
  const { path: currentPath } = parseCurrentPath();
  const lessons = [
    ...(courseData.chapters?.flatMap(({ lessons: chLessons }) => chLessons) || []),
    ...courseData.lessons];
  return lessons.find(({ path }) => currentPath === path);
}

export function buildCourseSurveyLink(courseData) {
  const link = document.querySelector('a.course-survey-link');
  if (!link) return;
  const surveyLink = link.getAttribute('href') || '/education/course-survey.html';
  link.setAttribute('href', `${surveyLink}#${courseData.moduleTitle}`);
}

/**
 * Updates the current lesson status
 */
export async function updateLessonStatus(isCompleted, quizStatus) {
  return import('../services/EducationTrackService.js').then(async ({ postLesson }) => {
    const courseData = await getCourseData();
    const lessonId = getMetadata('module-id');
    const updatedCourse = await postLesson(courseData.moduleId, lessonId, isCompleted, quizStatus);
    if (updatedCourse && isCompleted) {
      const { lessons: lessonsProgress, ...courseProgress } = updatedCourse;
      Object.assign(courseData, courseProgress);
      if (!courseData.isStandalone) {
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
  });
}
