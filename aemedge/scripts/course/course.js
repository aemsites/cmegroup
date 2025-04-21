import ffetch from '../ffetch.js';

export default async function getCourseData(mockdata) {
  try {
    const currentPath = window.location.pathname;
    const relevantPath = currentPath.split('/education/courses/')[1];
    // Temporary mock path to test
    // Path split for making line length shorter
    // const relevantPath = '/education/courses/direct-lesson-course/lesson-1'
    // const relevantPath = '/education/courses/understanding-micro-futures-contracts-at-cme-group/micro-e-mini-futures/hedging-with-the-micro-e-mini-futures'
    //   .split('/education/courses/')[1];
    const course = relevantPath.split('/')[0];

    // build the hierarchy
    const coursePath = `/education/courses/${course}`;
    const courseData = {
      hasChapters: false, // Will be determined by data
      chapters: [],
      lessons: [],
    };
    const TEMPLATES = ['course', 'chapter', 'lesson'];
    // Get entries from query-index for course content
    const entries = await ffetch(window.location.origin + '/courses-index.json')
    // const entries = mockdata
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
      const subModulesOrderArray = subModulesOrder.split(',').map((item) => item.trim());
      courseData.lessons.sort((a, b) => subModulesOrderArray.indexOf(a.pathSuffix)
        - subModulesOrderArray.indexOf(b.pathSuffix));
    }
    return courseData;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error loading course data: ', error);
    return null;
  }
}
