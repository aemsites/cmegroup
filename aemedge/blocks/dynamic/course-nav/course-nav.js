import { getMetadata, loadCSS } from '../../../scripts/aem.js';
import { createElement, i18n, isFeatureToggled } from '../../../scripts/utils.js';
import { store } from '../../../scripts/store/store.js';

function getTotalLessonsCount(courseData) {
  return courseData.hasChapters
    ? (courseData.chapters.reduce((total, chapter) => total + chapter.lessons.length, 0)
      + (courseData.lessons?.length || 0))
    : (courseData.lessons?.length || 0);
}

function createIconSpan(iconName, isHidden = false) {
  const img = createElement('img', { src: `/aemedge/icons/${iconName}.svg` });
  const span = createElement('span', { class: `icon icon-${iconName}` });
  span.style.display = isHidden ? 'none' : 'block';
  span.appendChild(img);
  return span;
}

function createToggleButton(label = 'Toggle navigation', isExpanded = false) {
  const toggle = createElement('button', { class: 'course-nav-toggle', 'aria-label': label });
  const plusIcon = createIconSpan('plus', isExpanded);
  const minusIcon = createIconSpan('minus', !isExpanded);
  toggle.append(plusIcon, minusIcon);
  return { toggle, plusIcon, minusIcon };
}

function createLessonElement(lesson, currentPath) {
  const li = createElement('li', { class: 'course-nav-lesson' });
  const lessonLink = createElement('a', { href: lesson.path, rel: 'noopener noreferrer' });
  const titleSpan = createElement('span', { class: 'title' });
  titleSpan.textContent = lesson.moduleTitle;
  const iconSpan = createElement('span', { class: lesson.completed ? 'icon-check' : 'icon-uncheck' });
  lessonLink.append(titleSpan, iconSpan);
  li.appendChild(lessonLink);
  if (lesson.path === currentPath) {
    li.classList.add('current');
  }
  return { li, isCurrent: lesson.path === currentPath };
}

function createLessonsList(lessons, currentPath, shouldShow = false) {
  const ul = createElement('ul', { class: `lessons-list${shouldShow ? ' show' : ''}` });
  let hasCurrentLesson = false;
  lessons.forEach((lesson) => {
    const { li, isCurrent } = createLessonElement(lesson, currentPath);
    ul.appendChild(li);
    hasCurrentLesson = hasCurrentLesson || isCurrent;
  });
  return { ul, hasCurrentLesson };
}

function createChapterElement(chapter, currentPath) {
  const chapterWrapper = createElement('div', { class: 'chapter-wrapper' });
  // Progress bar
  const progressBar = createElement('div', { class: 'progress-bar linear' });
  const progress = createElement('div', { class: 'progress', style: { width: '0%' } });
  progressBar.appendChild(progress);
  chapterWrapper.appendChild(progressBar);

  const chapterEl = createElement('div', { class: 'course-nav-chapter' });
  const chapterTitle = createElement('button', { class: 'collapsible-button chapter btn btn-secondary', type: 'button' });
  const titleDiv = createElement('div', { class: 'title' });
  titleDiv.textContent = chapter.moduleTitle;
  const [plusIcon, minusIcon] = ['plus', 'minus'].map((icon, i) => createIconSpan(icon, i === 1));
  chapterTitle.append(titleDiv, plusIcon, minusIcon);

  const { ul, hasCurrentLesson } = createLessonsList(chapter.lessons, currentPath);
  if (hasCurrentLesson) {
    chapterEl.classList.add('expanded');
    ul.classList.add('show');
    minusIcon.style.display = 'block';
    plusIcon.style.display = 'none';
  }
  chapterEl.append(chapterTitle, ul);
  chapterWrapper.appendChild(chapterEl);

  // Toggle handler
  chapterTitle.addEventListener('click', () => {
    ul.classList.toggle('show');
    chapterEl.classList.toggle('expanded');
    plusIcon.style.display = chapterEl.classList.contains('expanded') ? 'none' : 'block';
    minusIcon.style.display = chapterEl.classList.contains('expanded') ? 'block' : 'none';
  });

  return chapterWrapper;
}

function getPathIdentifier(path) {
  return path.split('/').pop();
}

function renderOrderedContent(courseData, currentPath, content) {
  const { modulesOrder, lessons = [], chapters = [] } = courseData;

  if (!modulesOrder) {
    // Fallback to original behavior if no modulesOrder
    if (lessons.length) {
      const { ul } = createLessonsList(lessons, currentPath, true);
      content.appendChild(ul);
    }
    if (chapters.length) {
      chapters.forEach((chapter) => {
        content.appendChild(createChapterElement(chapter, currentPath));
      });
    }
    return;
  }

  // Parse modulesOrder and create ordered content
  const orderItems = modulesOrder.split(',').map((item) => item.trim());
  const lessonsMap = new Map();
  const chaptersMap = new Map();

  // Create maps for quick lookup
  lessons.forEach((lesson) => {
    const identifier = lesson.pathSuffix || getPathIdentifier(lesson.path);
    lessonsMap.set(identifier, lesson);
  });

  chapters.forEach((chapter) => {
    const identifier = getPathIdentifier(chapter.path);
    chaptersMap.set(identifier, chapter);
  });

  // Track which items have been rendered
  const renderedLessons = new Set();
  const renderedChapters = new Set();

  // Group consecutive lessons and render items in the specified order
  let consecutiveLessons = [];

  const flushLessons = () => {
    if (consecutiveLessons.length > 0) {
      const { ul } = createLessonsList(consecutiveLessons, currentPath, true);
      content.appendChild(ul);
      consecutiveLessons = [];
    }
  };

  orderItems.forEach((identifier) => {
    if (lessonsMap.has(identifier)) {
      const lesson = lessonsMap.get(identifier);
      consecutiveLessons.push(lesson);
      renderedLessons.add(identifier);
    } else if (chaptersMap.has(identifier)) {
      // Flush any accumulated lessons before rendering chapter
      flushLessons();
      const chapter = chaptersMap.get(identifier);
      content.appendChild(createChapterElement(chapter, currentPath));
      renderedChapters.add(identifier);
    }
  });

  // Flush any remaining consecutive lessons
  flushLessons();

  // Render any remaining lessons that weren't in modulesOrder
  const remainingLessons = lessons.filter((lesson) => {
    const identifier = lesson.pathSuffix || getPathIdentifier(lesson.path);
    return !renderedLessons.has(identifier);
  });

  if (remainingLessons.length) {
    const { ul } = createLessonsList(remainingLessons, currentPath, true);
    content.appendChild(ul);
  }

  // Render any remaining chapters that weren't in modulesOrder
  chapters.forEach((chapter) => {
    const identifier = getPathIdentifier(chapter.path);
    if (!renderedChapters.has(identifier)) {
      content.appendChild(createChapterElement(chapter, currentPath));
    }
  });
}

async function init(main, courseData) {
  await loadCSS(`${window.hlx.codeBasePath}/blocks/dynamic/course-nav/course-nav.css`);
  const currentPath = window.location.pathname;
  const totalLessons = getTotalLessonsCount(courseData);

  let nav = main.querySelector('.course-nav');
  nav?.remove();
  // Create navigation structure
  nav = createElement('nav', { class: 'course-nav' });
  // Create header
  const header = createElement('div', { class: 'course-nav-header' });
  const titleWrapper = createElement('div', { class: 'course-nav-title-wrapper' });
  const titleContent = createElement('div', { class: 'course-nav-title-content' });
  // Title section
  const title = createElement('h2', { class: 'course-nav-title' });
  title.textContent = courseData.title;
  const viewLessons = createElement('span', { class: 'course-nav-view-lessons' });
  const [viewLessonsLabel, lessonsCountLabel] = await Promise.all([
    i18n('View lessons'),
    i18n('Lessons'),
  ]);
  viewLessons.textContent = viewLessonsLabel;
  const lessonsCount = createElement('span', { class: 'course-nav-lessons-count' });
  lessonsCount.textContent = `${totalLessons} ${lessonsCountLabel}`;
  titleContent.append(title, viewLessons, lessonsCount);
  titleWrapper.appendChild(titleContent);
  // Controls section
  const controls = createElement('div', { class: 'course-nav-controls' });
  const progress = createElement('div', { class: `course-nav-progress ${courseData.completed ? 'completed' : ''}` });
  const progressText = createElement('span', { class: 'course-nav-progress-text' });
  progressText.textContent = `${courseData.progressPercentage || 0}%`;
  progress.appendChild(progressText);
  const { toggle, plusIcon: toggleIconPlus, minusIcon: toggleIconMinus } = createToggleButton();
  controls.append(progress, toggle);
  header.append(titleWrapper, controls);
  // Create content
  const content = createElement('div', { class: 'course-nav-content' });

  // Render content based on modulesOrder or fallback to original behavior
  renderOrderedContent(courseData, currentPath, content);

  nav.append(header, content);
  main.prepend(nav);

  header.addEventListener('click', (e) => {
    e.stopPropagation();
    nav.classList.toggle('expanded');
    toggleIconPlus.style.display = nav.classList.contains('expanded') ? 'none' : 'block';
    toggleIconMinus.style.display = nav.classList.contains('expanded') ? 'block' : 'none';
  });

  content.addEventListener('click', (e) => e.stopPropagation());

  document.addEventListener('click', (e) => {
    if (nav.classList.contains('expanded') && !nav.contains(e.target)) {
      nav.classList.remove('expanded');
      toggleIconPlus.style.display = 'block';
      toggleIconMinus.style.display = 'none';
    }
  });
}

export default async function createCourseNav(main) {
  // Disable if not an allowed template
  const template = getMetadata('template');
  if (!['course', 'lesson'].includes(template.toLowerCase())) return;

  // Disable if hideCourseNav query parameter is set
  if (isFeatureToggled('hideCourseNav')) return;

  //  courseData change event
  store.subscribe(({ courseData }) => courseData, (courseData) => {
    if (courseData) {
      init(main, courseData);
    }
  });
}
