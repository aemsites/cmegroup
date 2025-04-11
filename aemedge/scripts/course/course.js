import ffetch from '../ffetch.js';

export async function getCourseData(mockdata) {
  try {
    const currentPath = window.location.pathname;
    // const relevantPath = currentPath.split('/education/courses/')[1];
    // Temporary mock path to test
    const relevantPath = '/education/courses/understanding-micro-futures-contracts-at-cme-group/micro-e-mini-futures/micro-e-mini-equity-index-futures-products-overview'.split('/education/courses/')[1];
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
    // const entries = await ffetch('/query-index.json')
    const entries = mockdata
      .filter(entry => {
        return TEMPLATES.includes(entry.template.toLowerCase()) && 
               entry.path.startsWith(coursePath);
      })
      // .all();

    // Determine if it course has chapters
    courseData.hasChapters = entries.some(entry => entry.template.toLowerCase() === 'chapter');

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
          const chapter = courseData.chapters.find(chapter => entry.path.startsWith(chapter.path));
          chapter?.lessons.push({
            title: entry.moduleTitle,
            path: entry.path,
            pathSuffix: entry.path.split(chapter.path)[1].substring(1),
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
      courseData.chapters.forEach(chapter => {
        const subModulesOrder = chapter.subModulesOrder;
        const subModulesOrderArray = subModulesOrder.split(',').map(item => item.trim());
        chapter.lessons.sort((a, b) => subModulesOrderArray.indexOf(a.pathSuffix) - subModulesOrderArray.indexOf(b.pathSuffix));
      });
    } else {
      const subModulesOrder = courseData.subModulesOrder;
      const subModulesOrderArray = subModulesOrder.split(',').map(item => item.trim());
      courseData.lessons.sort((a, b) => subModulesOrderArray.indexOf(a.pathSuffix) - subModulesOrderArray.indexOf(b.pathSuffix));
    }

    return courseData;
    
  } catch (error) {
    console.error('Error loading course data: ', error);
  }
}

