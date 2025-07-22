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

export {
  convertReadTimeFormat,
  convertMediaTypeToSubtemplate,
};
