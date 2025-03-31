export class DataLayer {
  handleLoad() {
    this.init();
  }

  // eslint-disable-next-line class-methods-use-this
  init = () => {
    if (window.dataLayer) {
      let AEMPageTagsArray = [];
      const metaTag = document.querySelector(
        "meta[name='keywords']",
      );
      if (metaTag) {
        const contentMetaTag = metaTag.getAttribute('content');
        if (contentMetaTag) {
          AEMPageTagsArray = contentMetaTag.split(',');
        }
      }

      const data = {
        event: 'PageInformation',
        AEMPageTagsArray,
      };

      window.dataLayer.push(data);
    }
  };
}

export const dataLayer = new DataLayer();
