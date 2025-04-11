import { getMetadata, loadCSS } from '../../../scripts/aem.js';
import { getCourseData } from '../../../scripts/course/course.js';
import { createElement } from '../../../scripts/utils.js';
import mockQueryIndex from './mock-query-index.js';

function getTotalLessonsCount(courseData) {
  if (courseData.chapters) {
    return courseData.chapters.reduce((total, chapter) => total + chapter.lessons.length, 0);
  }
  return courseData.lessons ? courseData.lessons.length : 0;
}

function createIconSpan(iconName) {
  const img = createElement('img', { src: `/aemedge/icons/${iconName}.svg` });
  const span = createElement('span', { class: `icon icon-${iconName}` }, img);
  return span;
}

export default async function decorate(main) {
  const template = getMetadata('template');
  if (template.toLowerCase() !== 'course' && template.toLowerCase() !== 'lesson') {
    return;
  }
  const courseData = await getCourseData(mockQueryIndex.data);
  await loadCSS(`${window.hlx.codeBasePath}/blocks/dynamic/course-nav/course-nav.css`);
  const currentPath = window.location.pathname;

  // Create navigation structure
  const nav = document.createElement('nav');
  nav.className = 'course-nav';

  // Create header
  const header = document.createElement('div');
  header.className = 'course-nav-header';
  
  const titleWrapper = document.createElement('div');
  titleWrapper.className = 'course-nav-title-wrapper';
  
  const titleContent = document.createElement('div');
  titleContent.className = 'course-nav-title-content';
  
  const title = document.createElement('h2');
  title.className = 'course-nav-title';
  title.textContent = courseData.title;
  
  const viewLessons = document.createElement('span');
  viewLessons.className = 'course-nav-view-lessons';
  viewLessons.textContent = 'VIEW LESSONS';
  
  const lessonsCount = document.createElement('span');
  lessonsCount.className = 'course-nav-lessons-count';
  const totalLessons = getTotalLessonsCount(courseData);
  lessonsCount.textContent = `${totalLessons} LESSONS`;
  
  titleContent.appendChild(title);
  titleContent.appendChild(viewLessons);
  titleContent.appendChild(lessonsCount);
  titleWrapper.appendChild(titleContent);
  
  const controls = document.createElement('div');
  controls.className = 'course-nav-controls';
  
  const progress = document.createElement('div');
  progress.className = 'course-nav-progress';
  const progressText = document.createElement('span');
  progressText.className = 'course-nav-progress-text';
  progressText.textContent = '0%';
  progress.appendChild(progressText);
  
  const toggle = document.createElement('button');
  toggle.className = 'course-nav-toggle';
  toggle.setAttribute('aria-label', 'Toggle course navigation');
  const toggleIconPlus = createIconSpan('plus');
  const toggleIconMinus = createIconSpan('minus');
  toggleIconMinus.style.display = 'none';
  toggle.append(toggleIconPlus, toggleIconMinus);
  
  controls.appendChild(progress);
  controls.appendChild(toggle);
  
  header.appendChild(titleWrapper);
  header.appendChild(controls);
  
  // Create content
  const content = document.createElement('div');
  content.className = 'course-nav-content';

  // Add chapters
  if (courseData.chapters) {
    courseData.chapters.forEach((chapter) => {
      const chapterElement = createChapterElement(chapter);
      content.appendChild(chapterElement);
    });
  }

  nav.appendChild(header);
  nav.appendChild(content);
  main.prepend(nav);

  // Add click handler for main toggle
  header.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent document click from triggering
    nav.classList.toggle('expanded');
    toggleIconPlus.style.display = nav.classList.contains('expanded') ? 'none' : 'block';
    toggleIconMinus.style.display = nav.classList.contains('expanded') ? 'block' : 'none';
  });

  // Add click handler to content to prevent closing when clicking inside
  content.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent document click from triggering
  });

  // Add click handler to document to close nav when clicking outside
  document.addEventListener('click', (e) => {
    if (nav.classList.contains('expanded') && !nav.contains(e.target)) {
      nav.classList.remove('expanded');
      toggleIconPlus.style.display = 'block';
      toggleIconMinus.style.display = 'none';
    }
  });
}

function createNavHeader(courseData) {
  const header = document.createElement('div');
  header.className = 'course-nav-header';

  const titleWrapper = document.createElement('div');
  titleWrapper.className = 'course-nav-title-wrapper';
  
  const titleContent = document.createElement('div');
  titleContent.className = 'course-nav-title-content';
  
  // View Lessons text (shown in collapsed state)
  const viewLessons = document.createElement('span');
  viewLessons.className = 'course-nav-view-lessons';
  viewLessons.textContent = 'VIEW LESSONS';
  titleContent.appendChild(viewLessons);
  
  // Course title (shown in expanded state)
  const title = document.createElement('h2');
  title.className = 'course-nav-title';
  title.textContent = courseData.title;
  titleContent.appendChild(title);
  
  const lessonsCount = document.createElement('span');
  lessonsCount.className = 'course-nav-lessons-count';
  const totalLessons = getTotalLessonsCount(courseData);
  lessonsCount.textContent = `${totalLessons} LESSONS`;
  titleContent.appendChild(lessonsCount);
  
  titleWrapper.appendChild(titleContent);
  header.appendChild(titleWrapper);

  // Create controls wrapper for right-aligned items
  const controls = document.createElement('div');
  controls.className = 'course-nav-controls';
  
  const progress = createProgressCircle(0);
  controls.appendChild(progress);

  const toggle = document.createElement('button');
  toggle.className = 'course-nav-toggle';
  toggle.setAttribute('aria-label', 'Toggle course navigation');
  controls.appendChild(toggle);

  header.appendChild(controls);

  return header;
}

function createNavContent(courseData) {
  const content = document.createElement('div');
  content.className = 'course-nav-content';

  if (courseData.hasChapters) {
    courseData.chapters.forEach(chapter => {
      const chapterEl = createChapterElement(chapter);
      content.appendChild(chapterEl);
    });
  } else {
    const lessonsList = createLessonsList(courseData.lessons);
    content.appendChild(lessonsList);
  }

  return content;
}

function createChapterElement(chapter) {
  const chapterWrapper = document.createElement('div');
  chapterWrapper.className = 'chapter-wrapper';

  // Add progress bar before chapter
  const progressBar = document.createElement('div');
  progressBar.className = 'progress-bar linear';
  const progress = document.createElement('div');
  progress.className = 'progress';
  progress.style.width = '0%';  // Will be updated when tracking progress
  progressBar.appendChild(progress);
  chapterWrapper.appendChild(progressBar);

  const chapterEl = document.createElement('div');
  chapterEl.className = 'course-nav-chapter';
  
  const chapterTitle = document.createElement('button');
  chapterTitle.className = 'collapsible-button chapter btn btn-secondary';
  chapterTitle.setAttribute('type', 'button');
  
  const titleDiv = document.createElement('div');
  titleDiv.className = 'title';
  titleDiv.textContent = chapter.title;
  
  const plusIcon = createIconSpan('plus');
  const minusIcon = createIconSpan('minus');
  minusIcon.style.display = 'none';
  
  chapterTitle.appendChild(titleDiv);
  chapterTitle.append(plusIcon, minusIcon);

  // Create lessons list directly
  const ul = document.createElement('ul');
  ul.className = 'lessons-list'; // This will replace collapse class
  
  chapter.lessons.forEach((lesson) => {
    const li = document.createElement('li');
    li.className = 'course-nav-lesson';
    const lessonLink = document.createElement('a');
    lessonLink.href = lesson.path;
    lessonLink.setAttribute('rel', 'noopener noreferrer');
    
    const titleSpan = document.createElement('span');
    titleSpan.className = 'title';
    titleSpan.textContent = lesson.title;
    
    const iconSpan = document.createElement('span');
    iconSpan.className = 'icon-uncheck';
    
    lessonLink.appendChild(titleSpan);
    lessonLink.appendChild(iconSpan);
    li.appendChild(lessonLink);
    ul.appendChild(li);

    // Check if this is the current lesson
    if (lesson.path === window.location.pathname) {
      li.classList.add('current');
      chapterEl.classList.add('expanded');
      ul.classList.add('show');
      minusIcon.style.display = 'block';
      plusIcon.style.display = 'none';
    }
  });
  
  chapterEl.appendChild(chapterTitle);
  chapterEl.appendChild(ul);
  chapterWrapper.appendChild(chapterEl);

  // Add click handler for chapter toggle
  chapterTitle.addEventListener('click', () => {
    ul.classList.toggle('show');
    chapterEl.classList.toggle('expanded');
    plusIcon.style.display = chapterEl.classList.contains('expanded') ? 'none' : 'block';
    minusIcon.style.display = chapterEl.classList.contains('expanded') ? 'block' : 'none';
  });

  return chapterWrapper;
}

function createLessonsList(lessons) {
  const list = document.createElement('div');
  list.className = 'course-nav-lessons';

  lessons.forEach(lesson => {
    const link = document.createElement('a');
    link.className = 'course-nav-lesson';
    link.href = lesson.path;
    link.textContent = lesson.title;
    
    // Add active class if current path matches lesson path
    if (window.location.pathname === lesson.path) {
      link.classList.add('active');
    }
    
    list.appendChild(link);
  });

  return list;
}

function createProgressCircle(percentage) {
  const progress = document.createElement('div');
  progress.className = 'course-nav-progress';

  const text = document.createElement('span');
  text.className = 'course-nav-progress-text';
  text.textContent = `${percentage}%`;
  
  progress.appendChild(text);

  return progress;
}
