function convertReadTimeFormat(duration) {
  let durationMin = '';
  const [minStr, secStr] = duration.split(':');
  const seconds = parseInt(secStr, 10);
  let minutes = parseInt(minStr, 10);
  if (minutes === 0) {
    minutes = 1;
  } else if (seconds > 30) {
    minutes += 1;
  }
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    durationMin = `${hours}:${mins}`;
  } else {
    durationMin = `00:${minutes}`;
  }
  return durationMin;
}

function convertMediaTypeToSubtemplate(mediaType) {
  switch (mediaType) {
    case 'video-webinar':
      return ['video'];
    case 'podcast':
      return ['podcast'];
    default:
      return ['text'];
  }
}

function normalizeLegacyPath(path) {
  let newPath = path;
  if (newPath.startsWith('/content/cmegroup/en')) {
    newPath = newPath.slice('/content/cmegroup/en'.length);
  } else if (newPath.startsWith('/content/cmegroup')) {
    newPath = newPath.slice('/content/cmegroup'.length);
  }
  if (!newPath.endsWith('.html')) {
    newPath += '.html';
  }
  return newPath;
}

function mapLegacyArticleData(legacyData) {
  const {
    metadata: {
      thumbnailImage: image,
      primaryTopics,
    },
    title,
    description,
    path,
    readTime,
    date,
    mediaType,
  } = legacyData;
  const durationMin = convertReadTimeFormat(readTime);
  const subTemplates = convertMediaTypeToSubtemplate(mediaType);
  const newPath = normalizeLegacyPath(path);
  return {
    path: newPath,
    date,
    title,
    description,
    readTime: durationMin,
    metadata: {
      'sub-template': subTemplates,
      image,
      'primary-topic': primaryTopics,
    },
  };
}

function isLegacyContent(content) {
  return content.source === 'onprem';
}

const legacyArticleTemplates = [
  '/apps/cmegroup/templates/articleContentTemplate',
  '/conf/cmegroupaem/settings/wcm/templates/cme-group-case-study-article-template',
  '/conf/cmegroupaem/settings/wcm/templates/cme-group-faqs-article-template',
  '/conf/cmegroupaem/settings/wcm/templates/cme-group-media-mentions-article-template',
  '/conf/cmegroupaem/settings/wcm/templates/cme-group-newsletter-article-template',
  '/conf/cmegroupaem/settings/wcm/templates/cme-group-podcast-article-template',
  '/conf/cmegroupaem/settings/wcm/templates/cme-group-showcase-article-template',
  '/conf/cmegroupaem/settings/wcm/templates/cme-group-standard-article-template',
  '/conf/cmegroupaem/settings/wcm/templates/cme-group-video-article-template',
  '/conf/cmegroupaem/settings/wcm/templates/cme-group-brightcove-video-template',
];

const legacyEducationTemplates = [
  '/apps/cmegroup/templates/educationCourseTemplate',
  '/apps/cmegroup/templates/educationModuleTemplate',
  '/conf/cmegroupaem/settings/wcm/templates/cme-group-course-template',
  '/conf/cmegroupaem/settings/wcm/templates/cme-group-lesson-template',
  '/conf/cmegroupaem/settings/wcm/templates/cme-group-standalone-lesson-template',
];

export {
  legacyArticleTemplates,
  mapLegacyArticleData,
  isLegacyContent,
  legacyEducationTemplates,
  normalizeLegacyPath,
};
