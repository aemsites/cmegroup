const removeCourseSpecificItem = (document) => {
  const fragments = document.querySelectorAll('.xf-content-height');
  if (fragments?.length) {
    fragments.forEach((fragment) => {
      if (fragment.querySelector('#related-courses')) {
        fragment.remove();
      }
    });
  }

  document.querySelector('.slick-slider')?.remove();
};

export {
  // eslint-disable-next-line import/prefer-default-export
  removeCourseSpecificItem,
};
