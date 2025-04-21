import { getMetadata, loadCSS } from '../../../scripts/aem.js';
import getCourseData from '../../../scripts/course/course.js';
import { createElement } from '../../../scripts/utils.js';

function getTotalLessonsCount(courseData) {
  return courseData.hasChapters
    ? courseData.chapters.reduce((total, chapter) => total + chapter.lessons.length, 0)
    : courseData.lessons?.length || 0;
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
  titleSpan.textContent = lesson.title;
  const iconSpan = createElement('span', { class: 'icon-uncheck' });
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
  titleDiv.textContent = chapter.title;
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

export default async function decorate(main) {
  const template = getMetadata('template');
  if (template.toLowerCase() !== 'course' && template.toLowerCase() !== 'lesson') return;

  const courseData = await getCourseData();
  await loadCSS(`${window.hlx.codeBasePath}/blocks/dynamic/course-nav/course-nav.css`);
  const currentPath = window.location.pathname;
  const totalLessons = getTotalLessonsCount(courseData);

  // Create navigation structure
  const nav = createElement('nav', { class: 'course-nav' });
  // Create header
  const header = createElement('div', { class: 'course-nav-header' });
  const titleWrapper = createElement('div', { class: 'course-nav-title-wrapper' });
  const titleContent = createElement('div', { class: 'course-nav-title-content' });
  // Title section
  const title = createElement('h2', { class: 'course-nav-title' });
  title.textContent = courseData.title;
  const viewLessons = createElement('span', { class: 'course-nav-view-lessons' });
  viewLessons.textContent = 'VIEW LESSONS';
  const lessonsCount = createElement('span', { class: 'course-nav-lessons-count' });
  lessonsCount.textContent = `${totalLessons} LESSONS`;
  titleContent.append(title, viewLessons, lessonsCount);
  titleWrapper.appendChild(titleContent);
  // Controls section
  const controls = createElement('div', { class: 'course-nav-controls' });
  const progress = createElement('div', { class: 'course-nav-progress' });
  const progressText = createElement('span', { class: 'course-nav-progress-text' });
  progressText.textContent = '0%';
  progress.appendChild(progressText);
  const { toggle, plusIcon: toggleIconPlus, minusIcon: toggleIconMinus } = createToggleButton();
  controls.append(progress, toggle);
  header.append(titleWrapper, controls);
  // Create content
  const content = createElement('div', { class: 'course-nav-content' });

  // Add chapters or lessons
  if (courseData.hasChapters) {
    courseData.chapters.forEach((chapter) => {
      content.appendChild(createChapterElement(chapter, currentPath));
    });
  } else if (courseData.lessons?.length) {
    const { ul } = createLessonsList(courseData.lessons, currentPath, true);
    content.appendChild(ul);
  }

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
